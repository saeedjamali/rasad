import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/http";
import { ROLES } from "@/lib/constants";
import Category from "@/models/Category";
import { findPaged, parsePaging } from "@/lib/pagination";

function parentKey(parentId) {
  return parentId ? String(parentId) : "";
}

function siblingFilter(parentId) {
  return parentId
    ? { parentId }
    : { $or: [{ parentId: null }, { parentId: { $exists: false } }] };
}

async function nextCategoryOrder(parentId) {
  const last = await Category.findOne(siblingFilter(parentId)).sort({ order: -1 }).select("order").lean();
  return Math.max(0, Number(last?.order) || 0) + 1;
}

export async function GET(req) {
  const { error } = await requireUser();
  if (error) return error;
  await connectDB();
  const sp = new URL(req.url).searchParams;
  const paging = parsePaging(sp);
  if (paging.all || !sp.has("page")) {
    const list = await Category.find().sort({ order: 1, createdAt: 1 }).lean();
    return json({ list, total: list.length, page: 1, limit: list.length || 20, pages: 1 });
  }
  const parentFilter = { $or: [{ parentId: null }, { parentId: { $exists: false } }] };
  const result = await findPaged(Category, parentFilter, { order: 1, createdAt: 1 }, paging);
  const ids = result.list.map((p) => p._id);
  const children = ids.length
    ? await Category.find({ parentId: { $in: ids } }).sort({ order: 1, createdAt: 1 }).lean()
    : [];
  return json({ ...result, list: [...result.list, ...children] });
}

export async function POST(req) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const body = await readJson(req);
  if (!body.title) return fail("عنوان الزامی است");
  const parentId = body.parentId || null;
  let order = Number(body.order);
  if (!Number.isFinite(order) || order <= 0) order = await nextCategoryOrder(parentId);
  const item = await Category.create({
    title: body.title,
    description: body.description || "",
    transferType: body.transferType || "",
    showDistricts: !!body.showDistricts,
    parentId,
    selectionType: body.selectionType || "none",
    order,
    isActive: body.isActive !== false,
  });
  return json({ item });
}

export async function PUT(req) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const body = await readJson(req);
  if (!Array.isArray(body.reorder)) return fail("فهرست ترتیب نامعتبر است");
  const ids = [...new Set(body.reorder.map((id) => String(id || "").trim()).filter(Boolean))];
  if (!ids.length) return fail("فهرست ترتیب نامعتبر است");
  const items = await Category.find({ _id: { $in: ids } }).select("_id parentId").lean();
  if (items.length !== ids.length) return fail("برخی دسته‌ها یافت نشد");
  const first = items.find((x) => String(x._id) === ids[0]);
  const group = parentKey(first?.parentId);
  if (!items.every((x) => parentKey(x.parentId) === group)) {
    return fail("فقط دسته‌های هم‌سطح را می‌توان جابه‌جا کرد");
  }
  const siblings = await Category.find(siblingFilter(first?.parentId || null)).select("_id").lean();
  if (siblings.length !== ids.length) return fail("فهرست ترتیب ناقص است");
  await Promise.all(ids.map((id, i) => Category.updateOne({ _id: id }, { $set: { order: i + 1 } })));
  return json({ ok: true });
}
