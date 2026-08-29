export function toEnglishDigits(value) {
  return String(value || "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeMobile(mobile) {
  let m = toEnglishDigits(mobile).replace(/\D/g, "");
  if (m.startsWith("98") && m.length === 12) m = "0" + m.slice(2);
  if (m.startsWith("9") && m.length === 10) m = "0" + m;
  return m;
}

export function normalizePersonnelCode(code) {
  return toEnglishDigits(code).replace(/\s+/g, "").trim();
}

export function validatePersonnelCode(code) {
  const value = normalizePersonnelCode(code);
  if (!value) {
    return { ok: false, message: "کد پرسنلی را وارد کنید" };
  }
  if (!/^[0-9A-Za-z]{4,20}$/.test(value)) {
    return {
      ok: false,
      message: "کد پرسنلی باید بین ۴ تا ۲۰ نویسه و فقط عدد یا حروف انگلیسی باشد",
    };
  }
  return { ok: true, value };
}

export function validateMobile(mobile) {
  const value = normalizeMobile(mobile);
  if (!value) {
    return { ok: false, message: "شماره همراه را وارد کنید" };
  }
  if (!/^09\d{9}$/.test(value)) {
    return {
      ok: false,
      message: "شماره همراه باید ۱۱ رقم باشد و با ۰۹ شروع شود",
    };
  }
  return { ok: true, value };
}

export function duplicateIdentityMessage(err) {
  if (err?.code !== 11000) return "";
  const key = Object.keys(err.keyPattern || err.keyValue || {})[0] || "";
  if (key === "personnelCode") return "این کد پرسنلی قبلاً ثبت شده است";
  if (key === "mobile") return "این شماره همراه قبلاً ثبت شده است";
  return "کد پرسنلی یا شماره همراه تکراری است";
}
