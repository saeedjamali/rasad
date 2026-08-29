import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/http";
import { addRequestLog, logVisibleFor, redactRequestSecrets } from "@/lib/logging";
import { ROLES, STATUSES, trackerLabel } from "@/lib/constants";
import Request from "@/models/Request";
import RequestLog from "@/models/RequestLog";
import Applicant from "@/models/Applicant";
import Category from "@/models/Category";
import Region from "@/models/Region";
import { decorateApplicant, decorateRequest, loadRegionMap } from "@/lib/regions";

export async function GET(_req, { params }) {
  const { user, session, role, error } = await requireUser();
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const item = await Request.findById(id).lean();
  if (!item) return fail("یافت نشد", 404);
  if (role === ROLES.personnel && item.personnelCode !== user.personnelCode) {
    return fail("دسترسی مجاز نیست", 403);
  }
  if (role === ROLES.district_transfer && item.assignedDistrictCode !== user.districtCode) {
    return fail("دسترسی مجاز نیست", 403);
  }
  const applicant = item.applicantId
    ? await Applicant.findById(item.applicantId).lean()
    : await Applicant.findOne({ personnelCode: item.personnelCode }).lean();
  const logs = await RequestLog.find({ requestId: item._id }).sort({ createdAt: 1 }).lean();
  const visibleLogs = logs.filter((l) => logVisibleFor(l, session));
  const map = await loadRegionMap();
  const decoratedItem = await decorateRequest(item);
  return json({
    item: redactRequestSecrets(decoratedItem, role),
    applicant: decorateApplicant(applicant, map),
    logs: visibleLogs,
    tracker: trackerLabel(decoratedItem),
  });
}

export async function PUT(req, { params }) {
  const { user, role, error } = await requireUser([ROLES.personnel]);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const item = await Request.findById(id);
  if (!item) return fail("یافت نشد", 404);
  if (item.personnelCode !== user.personnelCode) return fail("دسترسی مجاز نیست", 403);
  if (item.status !== STATUSES.WAITING_PROVINCE_REVIEW) {
    return fail("در این وضعیت امکان ویرایش وجود ندارد");
  }
  const body = await readJson(req);
  if (body.title != null) {
    const title = String(body.title || "").trim();
    if (!title) return fail("عنوان درخواست را وارد کنید");
    if (title.length > 120) return fail("عنوان درخواست نباید بیشتر از ۱۲۰ نویسه باشد");
    item.title = title;
  }
  if (body.categoryId) {
    const cat = await Category.findById(body.categoryId);
    if (!cat) return fail("دسته‌بندی نامعتبر");
    item.categoryId = cat._id;
    item.categoryTitle = cat.title;
    const subs = await Category.find({ _id: { $in: body.subcategoryIds || [] } });
    item.subcategoryIds = subs.map((s) => s._id);
    item.subcategoryTitles = subs.map((s) => s.title);
    if (cat.showDistricts && body.proposedDistrictCode) {
      const region = await Region.findOne({ districtCode: body.proposedDistrictCode });
      if (!region) return fail("منطقه نامعتبر است");
      item.proposedDistrictCode = region.districtCode;
      item.proposedDistrictName = region.districtName;
    }
  }
  if (body.description != null) item.description = body.description;
  if (body.attachments) item.attachments = body.attachments.slice(0, 4);
  await item.save();
  await addRequestLog({
    request: item,
    action: "edit",
    fromStatus: item.status,
    toStatus: item.status,
    user,
    role,
    comment: "ویرایش درخواست توسط کاربر",
    attachments: body.attachments || [],
    visibleToUser: true,
  });
  return json({ item });
}
