import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/http";
import { ROLES } from "@/lib/constants";
import Category from "@/models/Category";

const CATEGORY_FIELDS = [
  "title",
  "description",
  "transferType",
  "showDistricts",
  "parentId",
  "selectionType",
  "order",
  "isActive",
  "isVisible",
];

export async function PUT(req, { params }) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const body = await readJson(req);
  const patch = {};
  for (const key of CATEGORY_FIELDS) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (patch.parentId === "") patch.parentId = null;
  if (!Object.keys(patch).length) return fail("داده‌ای برای به‌روزرسانی ارسال نشده");
  const item = await Category.findByIdAndUpdate(id, patch, { new: true });
  if (!item) return fail("یافت نشد", 404);
  return json({ item });
}

export async function DELETE(_req, { params }) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  await Category.deleteMany({ $or: [{ _id: id }, { parentId: id }] });
  return json({ ok: true });
}
