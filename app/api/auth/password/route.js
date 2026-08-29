import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { fail, json, readJson, clientIp } from "@/lib/http";
import { normalizeMobile } from "@/lib/usersync";
import { requireUser, attachSessionCookie, publicUser, toSessionPayload } from "@/lib/auth";
import { addAudit } from "@/lib/logging";
import { resolveLoginUser } from "@/lib/loginGate";
import { getSettings, systemBlockedFor } from "@/lib/settings";
import { MAINTENANCE_MESSAGE } from "@/lib/constants";

export async function GET() {
  await connectDB();
  const settings = await getSettings();
  return json({ enabled: Boolean(settings.allowPasswordLogin) });
}

export async function POST(req) {
  await connectDB();
  const settings = await getSettings();
  if (!settings.allowPasswordLogin) {
    return fail("ورود با رمز عبور از تنظیمات سامانه غیرفعال است. از ورود با پیامک استفاده کنید.", 403);
  }
  const body = await readJson(req);
  const mobile = normalizeMobile(body.mobile);
  const password = String(body.password || "");
  if (!/^09\d{9}$/.test(mobile)) return fail("شماره همراه معتبر نیست");
  if (!password) return fail("رمز عبور را وارد کنید");

  const gate = await resolveLoginUser(mobile);
  if (!gate.ok) return fail(gate.message, gate.status);
  if (await systemBlockedFor(gate.user)) return fail(MAINTENANCE_MESSAGE, 503);
  const user = gate.user;
  if (!user.passwordHash) {
    return fail("برای این کاربر رمز عبور تعریف نشده است. از ورود با پیامک استفاده کنید.");
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return fail("شماره همراه یا رمز عبور نادرست است");

  const payload = toSessionPayload(user);
  await addAudit(payload, "login_password", "User", user._id, {}, clientIp(req));
  return attachSessionCookie(
    json({
      user: publicUser(user, payload),
      needRole: user.roles.length > 1,
    }),
    payload,
    req
  );
}

export async function PUT(req) {
  const { user, session, error } = await requireUser();
  if (error) return error;
  await connectDB();
  const settings = await getSettings();
  if (!settings.allowPasswordLogin) {
    return fail("ورود با رمز عبور از تنظیمات سامانه غیرفعال است", 403);
  }
  const body = await readJson(req);
  const password = String(body.password || "");
  const confirm = String(body.confirm ?? body.passwordConfirm ?? "");
  if (password.length < 6) return fail("رمز عبور باید حداقل ۶ نویسه باشد");
  if (confirm && password !== confirm) return fail("تکرار رمز عبور مطابقت ندارد");
  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  await addAudit(session, "password_set", "User", user._id, {}, clientIp(req));
  return json({ ok: true, message: "رمز عبور ذخیره شد" });
}
