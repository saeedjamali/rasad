import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/http";
import { ROLES } from "@/lib/constants";
import Category from "@/models/Category";
import { findPaged, parsePaging } from "@/lib/pagination";

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
  const item = await Category.create({
    title: body.title,
    description: body.description || "",
    transferType: body.transferType || "",
    showDistricts: !!body.showDistricts,
    parentId: body.parentId || null,
    selectionType: body.selectionType || "none",
    order: body.order || 0,
    isActive: body.isActive !== false,
  });
  return json({ item });
}
