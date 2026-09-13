import { connectDB } from "@/lib/db";
import { fail, json, readJson } from "@/lib/http";
import { attachSessionCookie, publicUser, refreshSessionPayload, requireUser } from "@/lib/auth";
import { systemBlockedFor } from "@/lib/settings";
import { MAINTENANCE_MESSAGE, ROLES } from "@/lib/constants";

export async function POST(req) {
  await connectDB();
  const { user, session, error } = await requireUser(undefined, { skipMaintenance: true });
  if (error) return error;
  const { role } = await readJson(req);
  if (!user.roles.includes(role)) return fail("نقش انتخابی معتبر نیست");
  if (role !== ROLES.admin && (await systemBlockedFor(user, role))) {
    return fail(MAINTENANCE_MESSAGE, 503);
  }
  const payload = refreshSessionPayload(session, user, role);
  return attachSessionCookie(json({ user: publicUser(user, payload) }), payload, req);
}
