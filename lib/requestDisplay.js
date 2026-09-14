import { STATUSES } from "./constants";
import { toFaDigits } from "./dates";

const RESULT_NOTE_PLACEHOLDERS = new Set([
  "تغییر وضعیت توسط مدیر سیستم",
  "تغییر وضعیت گروهی توسط مدیر سیستم",
]);

export function isUserResultNote(comment) {
  const text = String(comment || "").trim();
  return Boolean(text) && !RESULT_NOTE_PLACEHOLDERS.has(text);
}

export function requestResultDest(item) {
  if (item?.status !== STATUSES.REVIEW_RESULT || item?.result !== "approved") return "";
  return String(item?.resultDestLabel || item?.resultDestName || "").trim();
}

export function requestResultNote(item, logs) {
  const stored = String(item?.resultNote || "").trim();
  if (isUserResultNote(stored)) return stored;
  if (item?.status !== STATUSES.REVIEW_RESULT) return "";
  const found = [...(logs || [])].reverse().find(
    (l) =>
      isUserResultNote(l.comment) &&
      (l.toStatus === STATUSES.REVIEW_RESULT ||
        ["approve", "reject", "admin_set_status"].includes(l.action))
  );
  return found ? String(found.comment).trim() : "";
}

export function requestCategoryTitles(item) {
  if (!item) return [];
  if (Array.isArray(item.categoryTitles) && item.categoryTitles.length) {
    return item.categoryTitles.map((t) => String(t || "").trim()).filter(Boolean);
  }
  const joined = String(item.categoryTitle || "").trim();
  if (!joined) return [];
  return joined.split("، ").map((t) => t.trim()).filter(Boolean);
}

export function requestCategoryLabel(item) {
  return requestCategoryTitles(item).join("، ");
}

export function categoryIsOffered(c) {
  return Boolean(c) && c.isActive !== false && c.isVisible !== false;
}

export const MAX_MAIN_CATEGORIES_HARD_CAP = 20;

export function normalizeMaxMainCategories(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(MAX_MAIN_CATEGORIES_HARD_CAP, Math.floor(n));
}

export function mainCategoryCapMessage(max) {
  if (!max) return "";
  return `حداکثر ${toFaDigits(max)} دسته اصلی می‌توانید انتخاب کنید.`;
}

export function mainCategoryCapReachedMessage(max) {
  if (!max) return "";
  return `سقف انتخاب ${toFaDigits(max)} دسته است. برای انتخاب مورد جدید، یکی از موارد قبلی را بردارید.`;
}

export function requestCategoryIdsOf(item) {
  if (!item) return [];
  if (Array.isArray(item.categoryIds) && item.categoryIds.length) {
    return item.categoryIds.map((id) => String(id));
  }
  return item.categoryId ? [String(item.categoryId)] : [];
}
