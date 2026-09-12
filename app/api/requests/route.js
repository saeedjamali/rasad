import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson, trackingCode, clientIp } from "@/lib/http";
import { addAudit, addRequestLog, redactRequestSecrets } from "@/lib/logging";
import { REQUEST_SUBMIT_CLOSED_MESSAGE, ROLES, STATUSES } from "@/lib/constants";
import Request from "@/models/Request";
import Applicant from "@/models/Applicant";
import Region from "@/models/Region";
import { decorateRequests } from "@/lib/regions";
import { attachMissingResultNotes } from "@/lib/requestResultNote";
import { findPaged, parsePaging } from "@/lib/pagination";
import { getSettings } from "@/lib/settings";
import { applyApplicantNameSearch, requestListFilter } from "@/lib/requestList";
import { resolveRequestCategories } from "@/lib/requestCategories";

export async function GET(req) {
  const { user, role, error } = await requireUser();
  if (error) return error;
  await connectDB();
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") || "";
  const filter = await applyApplicantNameSearch(
    requestListFilter(role, user, q, sp.get("status") || ""),
    q,
    role
  );
  const result = await findPaged(Request, filter, { updatedAt: -1 }, parsePaging(sp));
  await attachMissingResultNotes(result.list);
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
    allowRequestSubmit: settings.allowRequestSubmit !== false,
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
  const settings = await getSettings();
  if (settings.allowRequestSubmit === false) return fail(REQUEST_SUBMIT_CLOSED_MESSAGE, 403);

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
    if (!settings.allowNewRequestAfterFinal) {
      return fail("فرایند بررسی نهایی شده و امکان ثبت درخواست جدید نیست");
    }
  }

  const body = await readJson(req);
  const title = String(body.title || "").trim();
  if (!title) return fail("عنوان درخواست را وارد کنید");
  if (title.length > 120) return fail("عنوان درخواست نباید بیشتر از ۱۲۰ نویسه باشد");
  const resolved = await resolveRequestCategories(body);
  if (resolved.error) return fail(resolved.error);

  let proposedDistrictName = "";
  if (resolved.needsDistrict) {
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
    categoryId: resolved.categoryId,
    categoryTitle: resolved.categoryTitle,
    categoryIds: resolved.categoryIds,
    categoryTitles: resolved.categoryTitles,
    subcategoryIds: resolved.subcategoryIds,
    subcategoryTitles: resolved.subcategoryTitles,
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
