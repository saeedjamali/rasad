import { getSettings } from "./settings";

function parseSmsResponse(res, raw) {
  const text = String(raw || "").trim();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const status = String(data.status ?? data.Status ?? data.result ?? data.Result ?? "").toLowerCase();
    const okFlag = data.ok ?? data.success ?? data.Success;
    const code = data.code ?? data.Code ?? data.errorCode ?? data.ErrorCode;
    const message = String(data.message || data.msg || data.error || data.Error || "").trim();
    if (okFlag === false || ["error", "fail", "failed"].includes(status)) {
      return { ok: false, message: message || text || "ارسال پیامک ناموفق بود" };
    }
    if (typeof code === "number" && code < 0) {
      return { ok: false, message: message || text || "ارسال پیامک ناموفق بود" };
    }
    if (okFlag === true || ["ok", "success", "done"].includes(status)) {
      return { ok: true, message };
    }
  }

  if (!res.ok) {
    return { ok: false, message: text || `خطای سرویس پیامک (${res.status})` };
  }
  if (/خطا|نامعتبر|مجاز نیست|invalid|unauthorized|forbidden|error|fail/i.test(text)) {
    return { ok: false, message: text.slice(0, 240) };
  }
  return { ok: true, message: text };
}

export async function sendSms(mobiles, text) {
  const url = process.env.SMS_API_URL || "https://razavisms.ir/api/v2/sms/url";
  const key = String(process.env.SMS_API_KEY || "").trim();
  const list = Array.isArray(mobiles) ? mobiles.join(",") : mobiles;
  const settings = await getSettings();

  if (!settings.smsOnline) {
    console.log("[SMS DEV]", list, text);
    return { ok: true, dev: true };
  }

  if (!key || key.length < 20 || /^test/i.test(key) || key === "ENTER_API_KEY") {
    return {
      ok: false,
      dev: false,
      message: "کلید وب‌سرویس پیامک در فایل محیطی تنظیم نشده است.",
    };
  }

  const body = new URLSearchParams({
    apikey: key,
    mobiles: list,
    text,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: key,
        "User-Agent": "Eng.Jamali/7.43.0",
        Accept: "*/*",
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const raw = await res.text();
    const parsed = parseSmsResponse(res, raw);
    console.log("[SMS]", {
      status: res.status,
      ok: parsed.ok,
      raw: String(raw || "").slice(0, 400),
    });
    return { ok: parsed.ok, dev: false, raw, message: parsed.message };
  } catch (err) {
    console.error("[SMS] network error", err?.cause?.code || err.message);
    return {
      ok: false,
      dev: false,
      message:
        err?.cause?.code === "ENOTFOUND"
          ? "سرور به سامانه پیامک razavisms.ir دسترسی ندارد (قطع DNS یا اینترنت)."
          : "ارتباط با سرویس پیامک برقرار نشد.",
    };
  }
}

export function otpMessage(code) {
  return `سامانه رصد آموزش و پرورش خراسان رضوی\nکد ورود: ${code}\n`;
}
