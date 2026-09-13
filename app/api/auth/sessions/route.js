import { connectDB } from "@/lib/db";
import { fail, json, readJson, clientIp } from "@/lib/http";
import { addAudit } from "@/lib/logging";
import {
  attachClearSession,
  attachSessionCookie,
  refreshSessionPayload,
  requireUser,
} from "@/lib/auth";
import { createAuthSession, listUserSessions, revokeUserSessions } from "@/lib/sessions";
import AuthSession from "@/models/AuthSession";

async function bindLegacySession(req, user, session) {
  if (session.sid) {
    const rec = await AuthSession.findOne({ sid: session.sid, userId: user._id, revokedAt: null });
    if (rec) {
      const ip = clientIp(req);
      if (ip && rec.ip !== ip) rec.ip = ip;
      rec.lastSeenAt = new Date();
      await rec.save();
      return { sid: rec.sid, refresh: false };
    }
  }
  const rec = await createAuthSession(user, req);
  return { sid: rec.sid, refresh: true };
}

export async function GET(req) {
  const { user, session, error } = await requireUser();
  if (error) return error;
  await connectDB();
  const bound = await bindLegacySession(req, user, session);
  const list = await listUserSessions(user._id, bound.sid);
  const body = json({ list, currentSid: bound.sid });
  if (bound.refresh) {
    const payload = refreshSessionPayload({ ...session, sid: bound.sid }, user);
    return attachSessionCookie(body, payload, req);
  }
  return body;
}

export async function DELETE(req) {
  const { user, session, error } = await requireUser();
  if (error) return error;
  await connectDB();
  const body = await readJson(req);
  const closeAll = body.all !== false && body.others !== true;

  if (closeAll) {
    user.sessionEpoch = (user.sessionEpoch || 0) + 1;
    await user.save();
    await revokeUserSessions(user._id);
    await addAudit(session, "session_revoke_all", "User", user._id, { all: true }, clientIp(req));
    return attachClearSession(json({ ok: true, loggedOut: true, message: "همه جلسات بسته شد" }), req);
  }

  const bound = await bindLegacySession(req, user, session);
  user.sessionEpoch = (user.sessionEpoch || 0) + 1;
  await user.save();
  await revokeUserSessions(user._id, { exceptSid: bound.sid });
  await addAudit(session, "session_revoke_all", "User", user._id, { others: true }, clientIp(req));
  const payload = refreshSessionPayload({ ...session, sid: bound.sid }, user);
  const list = await listUserSessions(user._id, bound.sid);
  return attachSessionCookie(
    json({ ok: true, list, message: "بقیه جلسات بسته شد" }),
    payload,
    req
  );
}
