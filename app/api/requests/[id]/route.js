import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/http";
import { addRequestLog, logVisibleFor, redactRequestSecrets } from "@/lib/logging";
import { ROLES, STATUSES, trackerLabel } from "@/lib/constants";
import Request from "@/models/Request";
import RequestLog from "@/models/RequestLog";
import Applicant from "@/models/Applicant";
import Region from "@/models/Region";
import { applyResolvedCategories, requestCategoryIdsOf, resolveRequestCategories } from "@/lib/requestCategories";
import { decorateApplicant, decorateRequest, decorateRequestLogs, loadRegionMap } from "@/lib/regions";
import { attachMissingResultNotes } from "@/lib/requestResultNote";

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
  await attachMissingResultNotes([item]);
  const map = await loadRegionMap();
  const decoratedItem = await decorateRequest(item);
  return json({
    item: redactRequestSecrets(decoratedItem, role),
    applicant: decorateApplicant(applicant, map),
    logs: decorateRequestLogs(visibleLogs, map),
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
  if (body.categoryId || (Array.isArray(body.categoryIds) && body.categoryIds.length)) {
    const resolved = await resolveRequestCategories(body, {
      previousIds: requestCategoryIdsOf(item),
      previousSubIds: item.subcategoryIds || [],
    });
    if (resolved.error) return fail(resolved.error);
    applyResolvedCategories(item, resolved);
    if (resolved.needsDistrict) {
      if (!body.proposedDistrictCode) return fail("انتخاب منطقه مقصد الزامی است");
      const region = await Region.findOne({ districtCode: body.proposedDistrictCode });
      if (!region) return fail("منطقه نامعتبر است");
      item.proposedDistrictCode = region.districtCode;
      item.proposedDistrictName = region.districtName;
    } else {
      item.proposedDistrictCode = "";
      item.proposedDistrictName = "";
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
