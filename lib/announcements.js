import { parseInputDate } from "@/lib/dates";
import Announcement from "@/models/Announcement";

export const ANNOUNCEMENT_SORT = { order: 1, publishedAt: -1, createdAt: -1 };

export async function ensureAnnouncementOrders() {
  const unset = await Announcement.find({ $or: [{ order: { $exists: false } }, { order: null }, { order: { $lte: 0 } }] })
    .sort({ createdAt: 1 })
    .select("_id")
    .lean();
  if (!unset.length) return;
  const last = await Announcement.findOne({ order: { $gt: 0 } }).sort({ order: -1 }).select("order").lean();
  let n = last?.order || 0;
  for (const item of unset) {
    n += 1;
    await Announcement.updateOne({ _id: item._id }, { $set: { order: n } });
  }
}

export async function nextAnnouncementOrder() {
  await ensureAnnouncementOrders();
  const last = await Announcement.findOne().sort({ order: -1 }).select("order").lean();
  return Math.max(0, Number(last?.order) || 0) + 1;
}

export function parseAnnouncementOrder(value) {
  if (value == null || String(value).trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.round(n);
}

export function announcementVisibleFilter(now = new Date()) {
  return {
    isActive: true,
    $and: [
      {
        $or: [{ publishedAt: { $exists: false } }, { publishedAt: null }, { publishedAt: { $lte: now } }],
      },
      {
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
      },
    ],
  };
}

export function datesFromAnnouncementBody(body, { defaultPublish = false } = {}) {
  let publishedAt;
  if (body.publishedAt != null && String(body.publishedAt).trim()) {
    publishedAt = parseInputDate(body.publishedAt);
    if (!publishedAt) return { error: "تاریخ ثبت نامعتبر است" };
  } else if (defaultPublish) {
    publishedAt = new Date();
  }

  let expiresAt;
  if (body.expiresAt === "" || body.expiresAt === null) {
    expiresAt = null;
  } else if (body.expiresAt != null) {
    expiresAt = parseInputDate(body.expiresAt, true);
    if (!expiresAt) return { error: "تاریخ اعتبار نامعتبر است" };
  }

  if (publishedAt && expiresAt && expiresAt < publishedAt) {
    return { error: "تاریخ اعتبار نمی‌تواند قبل از تاریخ ثبت باشد" };
  }
  return { publishedAt, expiresAt };
}
