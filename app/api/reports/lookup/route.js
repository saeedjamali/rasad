import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { trackerLabel } from "@/lib/constants";
import { validateMobile, validatePersonnelCode } from "@/lib/identity";
import { canReportLookup, getSettings } from "@/lib/settings";
import Applicant from "@/models/Applicant";
import Request from "@/models/Request";
import RequestLog from "@/models/RequestLog";
import {
  decorateApplicant,
  decorateRequestItem,
  decorateRequestLogs,
  loadRegionMap,
} from "@/lib/regions";

export async function GET(req) {
  const { role, error } = await requireUser();
  if (error) return error;
  await connectDB();
  const settings = await getSettings();
  if (!canReportLookup(role, settings)) {
    return fail("جستجوی پرونده برای نقش شما فعال نیست", 403);
  }

  const q = String(new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return fail("کد پرسنلی یا شماره همراه را وارد کنید");

  const asMobile = validateMobile(q);
  const asCode = asMobile.ok ? { ok: false } : validatePersonnelCode(q);
  if (!asMobile.ok && !asCode.ok) {
    return fail("کد پرسنلی یا شماره همراه معتبر وارد کنید");
  }

  let applicant = null;
  const requestOr = [];
  if (asMobile.ok) {
    applicant = await Applicant.findOne({ mobile: asMobile.value }).lean();
    requestOr.push({ mobile: asMobile.value });
  }
  if (!applicant && asCode.ok) {
    applicant = await Applicant.findOne({ personnelCode: asCode.value }).lean();
  }
  if (asCode.ok) requestOr.push({ personnelCode: asCode.value });
  if (applicant?.personnelCode) {
    requestOr.push({ personnelCode: applicant.personnelCode });
    if (applicant.mobile) requestOr.push({ mobile: applicant.mobile });
  }

  const uniqueOr = [];
  const seen = new Set();
  for (const part of requestOr) {
    const key = JSON.stringify(part);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueOr.push(part);
  }

  const requests = uniqueOr.length
    ? await Request.find({ $or: uniqueOr }).sort({ createdAt: -1 }).lean()
    : [];

  if (!applicant && !requests.length) {
    return fail("متقاضی یا درخواستی با این مشخصات یافت نشد", 404);
  }

  if (!applicant && requests[0]) {
    applicant = await Applicant.findOne({ personnelCode: requests[0].personnelCode }).lean();
  }

  const map = await loadRegionMap();
  const ids = requests.map((r) => r._id);
  const allLogs = ids.length
    ? await RequestLog.find({ requestId: { $in: ids } }).sort({ createdAt: 1 }).lean()
    : [];
  const logsByRequest = new Map();
  for (const log of allLogs) {
    const key = String(log.requestId);
    if (!logsByRequest.has(key)) logsByRequest.set(key, []);
    logsByRequest.get(key).push(log);
  }

  return json({
    applicant: applicant ? decorateApplicant(applicant, map) : null,
    requests: requests.map((item) => {
      const decorated = decorateRequestItem(item, map);
      return {
        item: decorated,
        tracker: trackerLabel(decorated),
        logs: decorateRequestLogs(logsByRequest.get(String(item._id)) || [], map),
      };
    }),
  });
}
