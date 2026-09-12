import Category from "@/models/Category";
import { getSettings } from "@/lib/settings";
export { requestCategoryIdsOf, requestCategoryLabel } from "@/lib/requestDisplay";

function idsFromBody(body) {
  const raw =
    Array.isArray(body?.categoryIds) && body.categoryIds.length
      ? body.categoryIds
      : body?.categoryId
        ? [body.categoryId]
        : [];
  return [...new Set(raw.map((id) => String(id || "").trim()).filter(Boolean))];
}

export async function resolveRequestCategories(body) {
  const settings = await getSettings();
  const allowMulti = Boolean(settings.allowMultiMainCategory);
  let ids = idsFromBody(body);
  if (!ids.length) return { error: "دسته‌بندی را انتخاب کنید" };
  if (!allowMulti) ids = ids.slice(0, 1);

  const cats = await Category.find({
    _id: { $in: ids },
    isActive: true,
    $or: [{ parentId: null }, { parentId: { $exists: false } }],
  });
  if (cats.length !== ids.length) return { error: "دسته‌بندی معتبر نیست" };

  const byId = Object.fromEntries(cats.map((c) => [String(c._id), c]));
  const ordered = ids.map((id) => byId[id]).filter(Boolean);
  const parentIds = ordered.map((c) => c._id);
  const allChildren = await Category.find({ parentId: { $in: parentIds }, isActive: true });
  const kidsByParent = new Map();
  for (const child of allChildren) {
    const key = String(child.parentId);
    if (!kidsByParent.has(key)) kidsByParent.set(key, []);
    kidsByParent.get(key).push(child);
  }

  const allowedChildIds = new Set(allChildren.map((c) => String(c._id)));
  let subIds = (body.subcategoryIds || []).map((id) => String(id)).filter((id) => allowedChildIds.has(id));

  for (const cat of ordered) {
    const kids = kidsByParent.get(String(cat._id)) || [];
    let selected = subIds.filter((id) => kids.some((k) => String(k._id) === id));
    if (cat.selectionType === "single") selected = selected.slice(0, 1);
    if (kids.length && cat.selectionType !== "none" && !selected.length) {
      return { error: `انتخاب زیر‌دسته برای «${cat.title}» الزامی است` };
    }
    if (cat.selectionType === "single") {
      const keep = new Set(selected);
      subIds = subIds.filter((id) => !kids.some((k) => String(k._id) === id) || keep.has(id));
    }
  }

  const subs = allChildren.filter((c) => subIds.includes(String(c._id)));
  const titles = ordered.map((c) => c.title);
  return {
    error: null,
    categoryId: ordered[0]._id,
    categoryTitle: titles.join("، "),
    categoryIds: ordered.map((c) => c._id),
    categoryTitles: titles,
    subcategoryIds: subs.map((s) => s._id),
    subcategoryTitles: subs.map((s) => s.title),
    needsDistrict: ordered.some((c) => c.showDistricts),
  };
}

export function applyResolvedCategories(item, resolved) {
  item.categoryId = resolved.categoryId;
  item.categoryTitle = resolved.categoryTitle;
  item.categoryIds = resolved.categoryIds;
  item.categoryTitles = resolved.categoryTitles;
  item.subcategoryIds = resolved.subcategoryIds;
  item.subcategoryTitles = resolved.subcategoryTitles;
}
