import { toJalaali } from "jalaali-js";
import { toFaDigits } from "./dates";

const TZ = "Asia/Tehran";

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export function tehranYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function startOfTehranDay(date = new Date()) {
  return new Date(`${tehranYmd(date)}T00:00:00+03:30`);
}

function shiftYmd(ymd, days) {
  const d = new Date(`${ymd}T12:00:00+03:30`);
  d.setTime(d.getTime() + days * 86400000);
  return tehranYmd(d);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function jalaliFromYmd(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return toJalaali(y, m, d);
}

export function jalaliDayLabel(ymd) {
  const j = jalaliFromYmd(ymd);
  return toFaDigits(`${j.jy}/${pad(j.jm)}/${pad(j.jd)}`);
}

export function jalaliDayShort(ymd) {
  const j = jalaliFromYmd(ymd);
  return toFaDigits(pad(j.jd));
}

export function jalaliMonthKeyFromYmd(ymd) {
  const j = jalaliFromYmd(ymd);
  return `${j.jy}-${pad(j.jm)}`;
}

export function jalaliMonthLabel(monthKey) {
  const [jy, jm] = String(monthKey).split("-").map(Number);
  return `${JALALI_MONTHS[(jm || 1) - 1]} ${toFaDigits(jy)}`;
}

function prevJalaliMonth(jy, jm) {
  if (jm <= 1) return { jy: jy - 1, jm: 12 };
  return { jy, jm: jm - 1 };
}

export function lastTehranDays(count) {
  const keys = [];
  let ymd = tehranYmd();
  for (let i = 0; i < count; i += 1) {
    keys.unshift(ymd);
    ymd = shiftYmd(ymd, -1);
  }
  return keys;
}

export function lastJalaliMonths(count) {
  const now = jalaliFromYmd(tehranYmd());
  let { jy, jm } = now;
  const keys = [];
  for (let i = 0; i < count; i += 1) {
    keys.unshift(`${jy}-${pad(jm)}`);
    const prev = prevJalaliMonth(jy, jm);
    jy = prev.jy;
    jm = prev.jm;
  }
  return keys;
}

function dateGroupStage(field = "createdAt") {
  return {
    $dateToString: { format: "%Y-%m-%d", date: `$${field}`, timezone: TZ },
  };
}

export function lookbackSince(days = 400) {
  const since = startOfTehranDay();
  since.setTime(since.getTime() - Math.max(0, days - 1) * 86400000);
  return since;
}

function matchWithRange(filter, field, since) {
  const range = { [field]: { $gte: since } };
  return Object.keys(filter || {}).length ? { $and: [filter, range] } : range;
}

export async function aggregateDailyCounts(Model, filter, field = "createdAt", since) {
  return Model.aggregate([
    { $match: matchWithRange(filter, field, since) },
    { $group: { _id: dateGroupStage(field), count: { $sum: 1 } } },
  ]);
}

export async function aggregateDailyByKey(Model, filter, keyExpr, field = "createdAt", since) {
  return Model.aggregate([
    { $match: matchWithRange(filter, field, since) },
    { $group: { _id: { day: dateGroupStage(field), key: keyExpr }, count: { $sum: 1 } } },
  ]);
}

function groupedMapFromRows(rows) {
  const map = new Map();
  for (const r of rows || []) {
    const day = typeof r._id === "object" ? r._id.day : r._id;
    const g = typeof r._id === "object" ? String(r._id.key ?? "") : "";
    if (!day) continue;
    if (!map.has(day)) map.set(day, {});
    map.get(day)[g] = (map.get(day)[g] || 0) + (r.count || 0);
  }
  return map;
}

function itemFromCounts(key, label, shortLabel, counts, groupKeys) {
  const picked = {};
  let total = 0;
  const keys = groupKeys.length ? groupKeys : Object.keys(counts || {});
  for (const g of keys) {
    picked[g] = counts?.[g] || 0;
    total += picked[g];
  }
  return { key, label, shortLabel, count: total, counts: picked };
}

export function fillDailyGrouped(rows, days = 30, groupKeys = []) {
  const map = groupedMapFromRows(rows);
  return lastTehranDays(days).map((key) =>
    itemFromCounts(key, jalaliDayLabel(key), jalaliDayShort(key), map.get(key) || {}, groupKeys)
  );
}

export function fillMonthlyGrouped(rows, months = 12, groupKeys = []) {
  const monthMap = new Map();
  for (const [day, counts] of groupedMapFromRows(rows)) {
    const mk = jalaliMonthKeyFromYmd(day);
    const cur = monthMap.get(mk) || {};
    for (const [g, n] of Object.entries(counts)) cur[g] = (cur[g] || 0) + n;
    monthMap.set(mk, cur);
  }
  return lastJalaliMonths(months).map((key) => {
    const jm = Number(String(key).split("-")[1]) || 1;
    return itemFromCounts(key, jalaliMonthLabel(key), JALALI_MONTHS[jm - 1], monthMap.get(key) || {}, groupKeys);
  });
}

export async function timeSeriesGrouped(Model, filter, keyExpr, opts = {}) {
  const days = opts.days ?? 30;
  const months = opts.months ?? 12;
  const field = opts.field ?? "createdAt";
  const groupKeys = opts.groupKeys ?? [];
  const since = lookbackSince(Math.max(400, days, months * 31));
  const rows = await aggregateDailyByKey(Model, filter, keyExpr, field, since);
  return {
    daily: fillDailyGrouped(rows, days, groupKeys),
    monthly: fillMonthlyGrouped(rows, months, groupKeys),
  };
}

export function fillDailySeries(rows, days = 30, extraKeys = []) {
  const map = new Map((rows || []).map((r) => [String(r._id), r]));
  return lastTehranDays(days).map((key) => {
    const row = map.get(key) || {};
    const item = { key, label: jalaliDayLabel(key), shortLabel: jalaliDayShort(key), count: row.count || 0 };
    for (const k of extraKeys) item[k] = row[k] || 0;
    return item;
  });
}

export function fillMonthlySeries(dayRows, months = 12, extraKeys = []) {
  const totals = new Map();
  for (const r of dayRows || []) {
    const monthKey = jalaliMonthKeyFromYmd(r._id);
    const cur = totals.get(monthKey) || { count: 0 };
    cur.count += r.count || 0;
    for (const k of extraKeys) cur[k] = (cur[k] || 0) + (r[k] || 0);
    totals.set(monthKey, cur);
  }
  return lastJalaliMonths(months).map((key) => {
    const row = totals.get(key) || { count: 0 };
    const jm = Number(String(key).split("-")[1]) || 1;
    const item = {
      key,
      label: jalaliMonthLabel(key),
      shortLabel: JALALI_MONTHS[jm - 1],
      count: row.count || 0,
    };
    for (const k of extraKeys) item[k] = row[k] || 0;
    return item;
  });
}

export async function timeSeriesForModel(Model, filter, { days = 30, months = 12, field = "createdAt" } = {}) {
  const rows = await aggregateDailyCounts(Model, filter, field, lookbackSince(Math.max(400, days, months * 31)));
  return {
    daily: fillDailySeries(rows, days),
    monthly: fillMonthlySeries(rows, months),
  };
}
