import { toFaDigits } from "./dates";

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
