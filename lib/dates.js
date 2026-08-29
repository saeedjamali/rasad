import { toJalaali } from "jalaali-js";

export function toFaDigits(str) {
  return String(str ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return toFaDigits(`${date} ${time}`);
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const pad = (n) => String(n).padStart(2, "0");
  return toFaDigits(`${j.jy}/${pad(j.jm)}/${pad(j.jd)}`);
}

export function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseInputDate(value, endOfDay = false) {
  const s = String(value || "").trim();
  if (!s) return null;
  const d = new Date(`${s}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function todayInputDate() {
  return toInputDate(new Date());
}
