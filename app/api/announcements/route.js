import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { json, readJson, fail } from "@/lib/http";
import { ROLES } from "@/lib/constants";
import Announcement from "@/models/Announcement";
import { announcementVisibleFilter, datesFromAnnouncementBody, ANNOUNCEMENT_SORT, nextAnnouncementOrder, parseAnnouncementOrder, ensureAnnouncementOrders } from "@/lib/announcements";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  await connectDB();
  const role = session.activeRole;
  const list = await Announcement.find({
    ...announcementVisibleFilter(),
    $or: [
      { roles: { $exists: false } },
      { roles: { $size: 0 } },
      { roles: role },
    ],
  })
    .sort(ANNOUNCEMENT_SORT)
    .lean();
  return json({ list });
}

export async function POST(req) {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const body = await readJson(req);
  if (!body.title || !body.body) return fail("عنوان و متن الزامی است");
  const dates = datesFromAnnouncementBody(body, { defaultPublish: true });
  if (dates.error) return fail(dates.error);
  await ensureAnnouncementOrders();
  const roles = Array.isArray(body.roles) ? body.roles.filter(Boolean) : [];
  const order = parseAnnouncementOrder(body.order) ?? (await nextAnnouncementOrder());
  const item = await Announcement.create({
    title: body.title,
    body: body.body,
    isActive: body.isActive !== false,
    isPublic: Boolean(body.isPublic),
    imageUrl: String(body.imageUrl || "").trim(),
    imageName: String(body.imageName || "").trim(),
    publishedAt: dates.publishedAt,
    expiresAt: dates.expiresAt ?? null,
    order,
    roles,
  });
  return json({ item });
}
