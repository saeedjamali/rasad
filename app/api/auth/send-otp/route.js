import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { fail, json, readJson } from "@/lib/http";
import { normalizeMobile } from "@/lib/usersync";
import { otpMessage, sendSms } from "@/lib/sms";
import { resolveLoginUser } from "@/lib/loginGate";
import { systemBlockedFor } from "@/lib/settings";
import { MAINTENANCE_MESSAGE } from "@/lib/constants";
import Otp from "@/models/Otp";

export async function POST(req) {
  await connectDB();
  const body = await readJson(req);
  const mobile = normalizeMobile(body.mobile);
  if (!/^09\d{9}$/.test(mobile)) {
    return fail("شماره همراه معتبر نیست");
  }

  const gate = await resolveLoginUser(mobile);
  if (!gate.ok) {
    return json({ unknown: true, message: gate.message }, gate.status);
  }
  if (await systemBlockedFor(gate.user)) {
    return fail(MAINTENANCE_MESSAGE, 503);
  }

  const recent = await Otp.findOne({ mobile }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
    return fail("لطفاً کمی بعد دوباره تلاش کنید");
  }

  const code = String(Math.floor(10000 + Math.random() * 90000));
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  await Otp.deleteMany({ mobile });
  await Otp.create({
    mobile,
    codeHash,
    expiresAt: new Date(Date.now() + 2 * 60 * 1000),
  });

  const sms = await sendSms(mobile, otpMessage(code));
  if (!sms.dev && !sms.ok) {
    await Otp.deleteMany({ mobile });
    return fail(sms.message || "ارسال پیامک ناموفق بود. لطفاً کمی بعد دوباره تلاش کنید.");
  }
  return json({
    ok: true,
    expiresIn: 120,
    devCode: sms.dev ? code : undefined,
    smsOk: sms.ok,
  });
}
