import crypto from "crypto";
import mongoose from "mongoose";
import AuthSession from "@/models/AuthSession";
import { clientIp, publicIpLabel } from "./http";

const TOUCH_MS = 2 * 60 * 1000;
const MAX_SESSIONS = 20;

export function deviceLabel(userAgent) {
  const s = String(userAgent || "");
  if (!s) return "دستگاه نامشخص";
  if (/Edg\//.test(s)) return "Microsoft Edge";
  if (/OPR\/|Opera/.test(s)) return "Opera";
  if (/Chrome\//.test(s) && !/Edg\/|OPR\//.test(s)) return "Google Chrome";
  if (/Firefox\//.test(s)) return "Firefox";
  if (/Safari\//.test(s) && !/Chrome\//.test(s)) return "Safari";
  return s.slice(0, 48);
}

export async function createAuthSession(user, req) {
  const sid = crypto.randomUUID();
  const rec = await AuthSession.create({
    sid,
    userId: user._id,
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent") || "",
    lastSeenAt: new Date(),
  });
  const extras = await AuthSession.find({
    userId: user._id,
    revokedAt: null,
  })
    .sort({ lastSeenAt: -1 })
    .skip(MAX_SESSIONS)
    .select("_id")
    .lean();
  if (extras.length) {
    await AuthSession.updateMany(
      { _id: { $in: extras.map((x) => x._id) } },
      { $set: { revokedAt: new Date() } }
    );
  }
  return rec;
}

export async function assertAuthSession(session, user) {
  const epoch = user.sessionEpoch || 0;
  if ((session.epoch ?? 0) !== epoch) return false;
  if (!session.sid) return true;
  const rec = await AuthSession.findOne({ sid: session.sid, userId: user._id });
  if (!rec || rec.revokedAt) return false;
  if (Date.now() - new Date(rec.lastSeenAt).getTime() > TOUCH_MS) {
    rec.lastSeenAt = new Date();
    rec.ip = rec.ip || "";
    await rec.save();
  }
  return true;
}

export async function listUserSessions(userId, currentSid) {
  const list = await AuthSession.find({ userId, revokedAt: null }).sort({ lastSeenAt: -1 }).lean();
  return list.map((s) => ({
    sid: s.sid,
    ip: publicIpLabel(s.ip),
    device: deviceLabel(s.userAgent),
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt,
    current: Boolean(currentSid) && s.sid === currentSid,
  }));
}

export async function revokeUserSessions(userId, { exceptSid } = {}) {
  const filter = { userId, revokedAt: null };
  if (exceptSid) filter.sid = { $ne: exceptSid };
  await AuthSession.updateMany(filter, { $set: { revokedAt: new Date() } });
}

export async function revokeSessionBySid(userId, sid) {
  const rec = await AuthSession.findOne({ sid, userId, revokedAt: null });
  if (!rec) return false;
  rec.revokedAt = new Date();
  await rec.save();
  return true;
}

export async function mapLatestActiveSessions(userIds) {
  const unique = [
    ...new Set(
      (userIds || [])
        .map((id) => String(id || ""))
        .filter((id) => id && mongoose.isValidObjectId(id))
    ),
  ];
  if (!unique.length) return {};
  const rows = await AuthSession.aggregate([
    {
      $match: {
        userId: { $in: unique.map((id) => new mongoose.Types.ObjectId(id)) },
        revokedAt: null,
      },
    },
    { $sort: { lastSeenAt: -1 } },
    {
      $group: {
        _id: "$userId",
        lastSeenAt: { $first: "$lastSeenAt" },
        createdAt: { $first: "$createdAt" },
        ip: { $first: "$ip" },
        userAgent: { $first: "$userAgent" },
      },
    },
  ]);
  return Object.fromEntries(
    rows.map((r) => [
      String(r._id),
      {
        lastSeenAt: r.lastSeenAt,
        createdAt: r.createdAt,
        ip: publicIpLabel(r.ip),
        device: deviceLabel(r.userAgent),
      },
    ])
  );
}
