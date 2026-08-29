import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, readJson } from "@/lib/http";
import { ROLES } from "@/lib/constants";
import Announcement from "@/models/Announcement";
import { datesFromAnnouncementBody, ANNOUNCEMENT_SORT, parseAnnouncementOrder, ensureAnnouncementOrders } from "@/lib/announcements";
import { findPaged, parsePaging } from "@/lib/pagination";

export async function GET(req) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  await ensureAnnouncementOrders();
  const paging = parsePaging(new URL(req.url).searchParams);
  return json(await findPaged(Announcement, {}, ANNOUNCEMENT_SORT, paging));
}

export async function PUT(req) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const body = await readJson(req);
  if (Array.isArray(body.reorder)) {
    const ids = body.reorder.map((id) => String(id || "").trim()).filter(Boolean);
    if (!ids.length) return fail("فهرست ترتیب نامعتبر است");
    await Promise.all(ids.map((id, i) => Announcement.updateOne({ _id: id }, { $set: { order: i + 1 } })));
    return json({ ok: true });
  }
  if (!body.id) return fail("شناسه الزامی است");
  if (body.title != null && !String(body.title).trim()) return fail("عنوان الزامی است");
  if (body.body != null && !String(body.body).trim()) return fail("متن الزامی است");
  const patch = {};
  if (body.title != null) patch.title = body.title;
  if (body.body != null) patch.body = body.body;
  if (body.isActive != null) patch.isActive = Boolean(body.isActive);
  if (body.isPublic != null) patch.isPublic = Boolean(body.isPublic);
  if (body.imageUrl != null) patch.imageUrl = String(body.imageUrl || "").trim();
  if (body.imageName != null) patch.imageName = String(body.imageName || "").trim();
  if (body.publishedAt != null || body.expiresAt != null) {
    const dates = datesFromAnnouncementBody(body);
    if (dates.error) return fail(dates.error);
    if (dates.publishedAt != null) patch.publishedAt = dates.publishedAt;
    if (body.expiresAt != null) patch.expiresAt = dates.expiresAt;
  }
  if (body.roles != null) patch.roles = Array.isArray(body.roles) ? body.roles.filter(Boolean) : [];
  if (body.order != null && String(body.order).trim() !== "") {
    const order = parseAnnouncementOrder(body.order);
    if (order == null) return fail("اولویت نمایش نامعتبر است");
    patch.order = order;
  }
  const item = await Announcement.findByIdAndUpdate(body.id, patch, { new: true });
  return json({ item });
}

export async function DELETE(req) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const id = new URL(req.url).searchParams.get("id");
  await Announcement.findByIdAndDelete(id);
  return json({ ok: true });
}
