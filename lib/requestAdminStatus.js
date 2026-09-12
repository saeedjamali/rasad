import { RESULT_LABELS, STATUSES, STATUS_LABELS, STATUS_USER_LABELS } from "./constants";
import { isUserResultNote } from "./requestDisplay";
import { sendSms } from "./sms";

export function finalReviewSmsText(item) {
  return `سامانه رصد: وضعیت درخواست ${item.trackingCode} به «${STATUS_USER_LABELS.REVIEW_RESULT}» تغییر کرد.`;
}

export async function notifyIfFinalReview(item, fromStatus) {
  if (fromStatus === STATUSES.REVIEW_RESULT || item.status !== STATUSES.REVIEW_RESULT) {
    return { sent: false, attempted: false };
  }
  const sms = await sendSms(item.mobile, finalReviewSmsText(item));
  return { sent: Boolean(sms?.ok), attempted: true, message: sms?.message || "" };
}

function normalizeStatusText(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

export function requestImportStatusOptions() {
  const workflow = Object.values(STATUSES)
    .filter((status) => status !== STATUSES.REVIEW_RESULT)
    .map((status) => ({
      label: STATUS_LABELS[status],
      status,
      result: "",
      note: "وضعیت گردش کار",
    }));
  return [
    ...workflow,
    {
      label: RESULT_LABELS.approved,
      status: STATUSES.REVIEW_RESULT,
      result: "approved",
      note: "بررسی نهایی — همان پیامک بررسی موردی برای پرسنل ارسال می‌شود",
    },
    {
      label: RESULT_LABELS.rejected,
      status: STATUSES.REVIEW_RESULT,
      result: "rejected",
      note: "بررسی نهایی — همان پیامک بررسی موردی برای پرسنل ارسال می‌شود",
    },
  ];
}

export function parseRequestResultStatus(raw) {
  const text = normalizeStatusText(raw);
  if (!text) return { error: "وضعیت درخواست خالی است" };
  if (text === normalizeStatusText(STATUS_LABELS.REVIEW_RESULT)) {
    return { error: "به‌جای «بررسی نهایی» یکی از وضعیت‌های «تایید درخواست» یا «رد درخواست» را بنویسید" };
  }
  const options = requestImportStatusOptions();
  const byLabel = options.find((o) => normalizeStatusText(o.label) === text);
  if (byLabel) return { error: null, ...byLabel };
  const key = text.toUpperCase().replace(/\s+/g, "_");
  if (key === "APPROVED") return { error: null, ...options.find((o) => o.result === "approved") };
  if (key === "REJECTED") return { error: null, ...options.find((o) => o.result === "rejected") };
  const byKey = options.find((o) => o.status === key);
  if (byKey && !byKey.result) return { error: null, ...byKey };
  return { error: `وضعیت «${String(raw).trim()}» در فهرست مجاز نیست. از شیت «وضعیت‌های مجاز» کپی کنید.` };
}

export function applyAdminRequestStatus(item, { next, result, userId, comment }) {
  if (!Object.values(STATUSES).includes(next)) return { error: "وضعیت نامعتبر است" };
  if (next === STATUSES.INQUIRY_DISTRICT && !item.assignedDistrictCode) {
    return { error: "برای استعلام از منطقه، منطقه باید قبلاً روی درخواست ثبت شده باشد" };
  }
  if (next === STATUSES.REVIEW_RESULT) {
    const resolved = result === "rejected" ? "rejected" : result === "approved" ? "approved" : "";
    if (!resolved) return { error: "نتیجه بررسی را انتخاب کنید" };
    item.result = resolved;
    item.closedAt = new Date();
    const note = String(comment || "").trim();
    item.resultNote = isUserResultNote(note) ? note : "";
  } else {
    item.closedAt = null;
    item.resultNote = "";
    if (next !== STATUSES.INQUIRY_RESPONSE_WAITING_PROVINCE) item.result = "";
  }
  if (next === STATUSES.IN_REVIEW_PROVINCE && !item.openedAt) {
    if (userId) item.openedBy = userId;
    item.openedAt = new Date();
  }
  item.status = next;
  return { error: null };
}
