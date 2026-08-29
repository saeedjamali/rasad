import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/http";
import { ROLES } from "@/lib/constants";
import Region from "@/models/Region";
import { clearRegionCache } from "@/lib/regions";

export async function PUT(req, { params }) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  const body = await readJson(req);
  const item = await Region.findByIdAndUpdate(id, body, { new: true });
  if (!item) return fail("یافت نشد", 404);
  clearRegionCache();
  return json({ item });
}

export async function DELETE(_req, { params }) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const { id } = await params;
  await Region.findByIdAndDelete(id);
  clearRegionCache();
  return json({ ok: true });
}
