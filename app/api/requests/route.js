import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson, trackingCode, clientIp } from "@/lib/http";
import { addAudit, addRequestLog, redactRequestSecrets } from "@/lib/logging";
import { ROLES, STATUSES } from "@/lib/constants";
import Request from "@/models/Request";
import Category from "@/models/Category";
import Applicant from "@/models/Applicant";
import Region from "@/models/Region";
import { decorateRequests } from "@/lib/regions";
import { findPaged, parsePaging } from "@/lib/pagination";
import { getSettings } from "@/lib/settings";

function listFilter(role, user, q, status) {
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    filter.$or = [
      { trackingCode: new RegExp(q, "i") },
      { personnelCode: new RegExp(q, "i") },
      { mobile: new RegExp(q, "i") },
      { categoryTitle: new RegExp(q, "i") },
      { title: new RegExp(q, "i") },
    ];
  }
  if (role === ROLES.personnel) {
    filter.personnelCode = user.personnelCode;
  } else if (role === ROLES.district_transfer) {
    filter.assignedDistrictCode = user.districtCode;
    filter.status = status || STATUSES.INQUIRY_DISTRICT;
  } else if (role === ROLES.province_planning) {
    filter.status = status || STATUSES.INQUIRY_PLANNING;
  }
  return filter;
}

export async function GET(req) {
  const { user, role, error } = await requireUser();
  if (error) return error;
  await connectDB();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") || "";
  const filter = listFilter(role, user, q, sp.get("status") || "");
  if (q && role !== ROLES.personnel) {
    const nameHits = await Applicant.find({
      $or: [{ firstName: new RegExp(q, "i") }, { lastName: new RegExp(q, "i") }],
    })
      .select("personnelCode")
      .lean();
    const codes = nameHits.map((a) => a.personnelCode).filter(Boolean);
    if (codes.length) {
      filter.$or = [...(filter.$or || []), { personnelCode: { $in: codes } }];
    }
  }
  const result = await findPaged(Request, filter, { updatedAt: -1 }, parsePaging(sp));
  const decorated = await decorateRequests(result.list);
  const codes = [...new Set(decorated.map((r) => r.personnelCode).filter(Boolean))];
  const applicants = codes.length
    ? await Applicant.find({ personnelCode: { $in: codes } })
        .select("personnelCode firstName lastName")
        .lean()
    : [];
  const byCode = Object.fromEntries(applicants.map((a) => [a.personnelCode, a]));
  const settings = await getSettings();
  return json({
    ...result,
    allowNewRequestAfterFinal: settings.allowNewRequestAfterFinal,
    list: decorated.map((r) => ({
      ...redactRequestSecrets(r, role),
      firstName: byCode[r.personnelCode]?.firstName || "",
      lastName: byCode[r.personnelCode]?.lastName || "",
    })),
  });
}

export async function POST(req) {
  const { user, session, role, error } = await requireUser([ROLES.personnel]);
  if (error) return error;
  await connectDB();

  const open = await Request.findOne({
    personnelCode: user.personnelCode,
    status: { $ne: STATUSES.REVIEW_RESULT },
  });
  if (open) return fail("شما یک درخواست در جریان دارید");

  const closed = await Request.findOne({
    personnelCode: user.personnelCode,
    status: STATUSES.REVIEW_RESULT,
  });
  if (closed) {
    const settings = await getSettings();
    if (!settings.allowNewRequestAfterFinal) {
      return fail("فرایند بررسی نهایی شده و امکان ثبت درخواست جدید نیست");
    }
  }

  const body = await readJson(req);
  const title = String(body.title || "").trim();
  if (!title) return fail("عنوان درخواست را وارد کنید");
  if (title.length > 120) return fail("عنوان درخواست نباید بیشتر از ۱۲۰ نویسه باشد");
  const cat = await Category.findById(body.categoryId);
  if (!cat || !cat.isActive || cat.parentId) return fail("دسته‌بندی معتبر نیست");

  const children = await Category.find({ parentId: cat._id, isActive: true });
  let subcategoryIds = body.subcategoryIds || [];
  if (cat.selectionType === "single") {
    subcategoryIds = subcategoryIds.slice(0, 1);
  }
  if (children.length && cat.selectionType !== "none" && !subcategoryIds.length) {
    return fail("انتخاب زیر‌دسته الزامی است");
  }
  const subs = await Category.find({ _id: { $in: subcategoryIds } });

  let proposedDistrictName = "";
  if (cat.showDistricts) {
    if (!body.proposedDistrictCode) return fail("انتخاب منطقه مقصد الزامی است");
    const region = await Region.findOne({ districtCode: body.proposedDistrictCode });
    if (!region) return fail("منطقه نامعتبر است");
    proposedDistrictName = region.districtName;
  }

  const applicant = await Applicant.findOne({ personnelCode: user.personnelCode });
  const item = await Request.create({
    trackingCode: trackingCode(),
    personnelCode: user.personnelCode,
    mobile: user.mobile,
    applicantId: applicant?._id,
    userId: user._id,
    categoryId: cat._id,
    categoryTitle: cat.title,
    subcategoryIds,
    subcategoryTitles: subs.map((s) => s.title),
    proposedDistrictCode: body.proposedDistrictCode || "",
    proposedDistrictName,
    title,
    description: body.description || "",
    attachments: (body.attachments || []).slice(0, 4),
    status: STATUSES.WAITING_PROVINCE_REVIEW,
  });

  await addRequestLog({
    request: item,
    action: "create",
    fromStatus: "",
    toStatus: item.status,
    user,
    role,
    comment: body.description || "",
    attachments: item.attachments,
    visibleToUser: true,
  });
  await addAudit(session, "request_create", "Request", item._id, {}, clientIp(req));
  return json({ item });
}
