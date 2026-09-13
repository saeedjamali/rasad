import { connectDB } from "@/lib/db";
import { fail, json, clientIp } from "@/lib/http";
import { addAudit } from "@/lib/logging";
import { attachClearSession, requireUser } from "@/lib/auth";
import { revokeSessionBySid } from "@/lib/sessions";

export async function DELETE(req, { params }) {
  const { user, session, error } = await requireUser();
  if (error) return error;
  await connectDB();
  const { sid } = await params;
  const ok = await revokeSessionBySid(user._id, sid);
  if (!ok) return fail("این نشست یافت نشد یا قبلاً بسته شده است", 404);
  await addAudit(session, "session_revoke", "User", user._id, { sid }, clientIp(req));
  if (session.sid && sid === session.sid) {
    return attachClearSession(json({ ok: true, loggedOut: true, message: "این نشست بسته شد" }), req);
  }
  return json({ ok: true, message: "نشست بسته شد" });
}
