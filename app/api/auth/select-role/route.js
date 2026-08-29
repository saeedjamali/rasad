import { connectDB } from "@/lib/db";
import { fail, json, readJson } from "@/lib/http";
import { toSessionPayload, attachSessionCookie, publicUser, requireUser } from "@/lib/auth";

export async function POST(req) {
  await connectDB();
  const { user, session, error } = await requireUser();
  if (error) return error;
  const { role } = await readJson(req);
  if (!user.roles.includes(role)) return fail("نقش انتخابی معتبر نیست");
  const payload = toSessionPayload(user, role);
  return attachSessionCookie(json({ user: publicUser(user, payload) }), payload, req);
}
