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

export function requestCategoryIdsOf(item) {
  if (!item) return [];
  if (Array.isArray(item.categoryIds) && item.categoryIds.length) {
    return item.categoryIds.map((id) => String(id));
  }
  return item.categoryId ? [String(item.categoryId)] : [];
}
