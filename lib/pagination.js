export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function parsePaging(searchParams) {
  const all = searchParams.get("all") === "1";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const raw = Number.parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10);
  const limit = Math.min(100, Math.max(5, Number.isFinite(raw) ? raw : DEFAULT_PAGE_SIZE));
  return { all, page, limit, skip: (page - 1) * limit };
}

export async function findPaged(model, filter, sort, paging) {
  if (paging.all) {
    const list = await model.find(filter).sort(sort).lean();
    return {
      list,
      total: list.length,
      page: 1,
      limit: list.length || DEFAULT_PAGE_SIZE,
      pages: 1,
    };
  }
  const total = await model.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / paging.limit) || 1);
  const page = Math.min(Math.max(1, paging.page), pages);
  const list = await model
    .find(filter)
    .sort(sort)
    .skip((page - 1) * paging.limit)
    .limit(paging.limit)
    .lean();
  return { list, total, page, limit: paging.limit, pages };
}
