import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { fail, json, readJson, clientIp } from "@/lib/http";
import { normalizeMobile } from "@/lib/usersync";
import { setSessionCookie, publicUser, toSessionPayload } from "@/lib/auth";
import { addAudit } from "@/lib/logging";
import { resolveLoginUser } from "@/lib/loginGate";
import { systemBlockedFor } from "@/lib/settings";
import { MAINTENANCE_MESSAGE } from "@/lib/constants";
import Otp from "@/models/Otp";

export async function POST(req) {
  await connectDB();
  const body = await readJson(req);
  const mobile = normalizeMobile(body.mobile);
  const code = String(body.code || "").trim();

  const otp = await Otp.findOne({ mobile }).sort({ createdAt: -1 });
  if (!otp || otp.expiresAt < new Date()) {
    return fail("کد منقضی شده است. دوباره ارسال کنید");
  }
  if (otp.attempts >= 5) {
    return fail("تعداد تلاش بیش از حد مجاز است");
  }

  const hash = crypto.createHash("sha256").update(code).digest("hex");
  if (hash !== otp.codeHash) {
    otp.attempts += 1;
    await otp.save();
    return fail("کد وارد شده صحیح نیست");
  }

  const gate = await resolveLoginUser(mobile);
  if (!gate.ok) return fail(gate.message, gate.status);
  const user = gate.user;
  if (await systemBlockedFor(user)) return fail(MAINTENANCE_MESSAGE, 503);

  await Otp.deleteMany({ mobile });

  const payload = toSessionPayload(user);
  await setSessionCookie(payload);
  await addAudit(payload, "login_otp", "User", user._id, {}, clientIp(req));

  return json({
    user: publicUser(user, payload),
    needRole: user.roles.length > 1,
  });
}
