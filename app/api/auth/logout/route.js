import { connectDB } from "@/lib/db";
import { attachClearSession, getSession } from "@/lib/auth";
import { json } from "@/lib/http";
import { revokeSessionBySid } from "@/lib/sessions";

export async function POST(req) {
  await connectDB();
  const session = await getSession();
  if (session?.sid && session?.userId) {
    await revokeSessionBySid(session.userId, session.sid).catch(() => {});
  }
  return attachClearSession(json({ ok: true }), req);
}
