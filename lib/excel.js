import * as XLSX from "xlsx";
import { APPLICANT_FIELDS, ROLE_FROM_FA, ROLE_LABELS } from "./constants";

export function workbookFromBuffer(buf, opts = {}) {
  const type = Buffer.isBuffer(buf) ? "buffer" : "array";
  return XLSX.read(buf, { type, cellDates: false, ...opts });
}

export function sheetToJson(wb, sheetIndex = 0) {
  const name = wb.SheetNames[sheetIndex];
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "", raw: true });
}

export function jsonToBuffer(rows, sheetName = "data") {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function mapApplicantRow(row) {
  const out = {};
  for (const [key, fa] of APPLICANT_FIELDS) {
    const found = Object.keys(row).find(
      (k) => String(k).trim() === fa || String(k).trim() === key
    );
    if (found != null) out[key] = normalizeCell(row[found]);
  }
  const g = (...names) => {
    const k = Object.keys(row).find((x) => names.includes(String(x).trim()));
    return k != null ? normalizeCell(row[k]) : "";
  };
  if (!out.firstName) out.firstName = g("نام", "نام کوچک", "firstName", "firstname");
  if (!out.lastName) {
    out.lastName = g("نام خانوادگی", "نام‌خانوادگی", "فامیل", "lastName", "lastname");
  }
  if (!out.firstName && !out.lastName) {
    const full = g("نام و نام خانوادگی", "نام کامل", "fullName");
    if (full) {
      const parts = full.trim().split(/\s+/);
      out.firstName = parts[0] || "";
      out.lastName = parts.slice(1).join(" ");
    }
  }
  return out;
}

export function applicantsToRows(list) {
  return list.map((doc) => {
    const row = {};
    for (const [key, fa] of APPLICANT_FIELDS) {
      row[fa] = doc[key] ?? "";
    }
    return row;
  });
}

export function mapUserRow(row) {
  const g = (...names) => {
    const k = Object.keys(row).find((x) => names.includes(String(x).trim()));
    return k != null ? normalizeCell(row[k]) : "";
  };
  const rolesRaw = g("نقش‌ها", "نقشها", "نقش", "roles");
  const roles = String(rolesRaw)
    .split(/[,،|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ROLE_FROM_FA[s] || s);
  return {
    mobile: g("شماره همراه", "موبایل", "mobile"),
    personnelCode: g("کد پرسنلی", "personnelCode"),
    fullName: g("نام", "نام کامل", "fullName"),
    roles: roles.length ? roles : ["personnel"],
    districtCode: g("کد منطقه", "districtCode"),
    districtName: g("نام منطقه", "districtName"),
    provinceCode: g("کد استان", "provinceCode") || "17",
    password: g("رمز", "password"),
    isActive: !["غیرفعال", "0", "false", "no"].includes(g("فعال", "isActive").toLowerCase()),
    isLocked: ["قفل", "قفل شده", "1", "true", "yes"].includes(g("قفل", "isLocked").toLowerCase()),
  };
}

export function usersToRows(list) {
  return list.map((u) => ({
    "شماره همراه": u.mobile,
    "کد پرسنلی": u.personnelCode,
    نام: u.fullName || "",
    "نقش‌ها": (u.roles || []).map((r) => ROLE_LABELS[r] || r).join("، "),
    "کد منطقه": u.districtCode || "",
    "نام منطقه": u.districtName || "",
    "کد استان": u.provinceCode || "",
    فعال: u.isActive === false ? "غیرفعال" : "فعال",
    قفل: u.isLocked ? "قفل شده" : "",
  }));
}

export function mapRegionRow(row) {
  const entries = Object.entries(row).map(([k, v]) => [normalizeHeader(k), normalizeCodeOrText(v), k]);
  const pick = (...needles) => {
    const hit = entries.find(([n]) => needles.some((x) => n === x || n.includes(x)));
    return hit ? hit[1] : "";
  };
  let provinceCode = pick("کداستان", "provincecode", "ostancode");
  if (!provinceCode) {
    const byOstan = entries.find(([n]) => n.includes("استان") && n.includes("کد"));
    provinceCode = byOstan ? byOstan[1] : "";
  }
  let districtCode = pick("کدمنطقه", "کدناحیه", "districtcode", "regioncode");
  if (!districtCode) {
    const byDistrict = entries.find(
      ([n]) => (n.includes("منطقه") || n.includes("ناحیه")) && n.includes("کد") && !n.includes("استان")
    );
    districtCode = byDistrict ? byDistrict[1] : "";
  }
  let districtName = pick("ناممنطقه", "نامناحیه", "districtname", "regionname");
  if (!districtName) {
    const byName = entries.find(
      ([n]) => n.includes("نام") && (n.includes("منطقه") || n.includes("ناحیه") || n.length < 8)
    );
    districtName = byName ? byName[1] : pick("نام");
  }
  return {
    provinceCode: provinceCode || "17",
    districtCode,
    districtName,
  };
}

function normalizeHeader(s) {
  return String(s ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\s_\-–—]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeCodeOrText(v) {
  if (v instanceof Date) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.round(v));
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (/^\d+(\.0+)?$/.test(s)) return String(Math.round(Number(s)));
  return s;
}

export function mapPersonnelRow(row) {
  const g = (...names) => {
    const k = Object.keys(row).find((x) => names.includes(String(x).trim()));
    return k != null ? normalizeCell(row[k]) : "";
  };
  const full = g("نام و نام خانوادگی", "نام کامل", "fullName");
  let firstName = g("نام", "نام کوچک", "firstName", "firstname");
  let lastName = g("نام خانوادگی", "نام‌خانوادگی", "فامیل", "lastName", "lastname");
  if (!firstName && !lastName && full) {
    const parts = full.trim().split(/\s+/);
    firstName = parts[0] || "";
    lastName = parts.slice(1).join(" ");
  }
  return {
    personnelCode: g("کد پرسنلی", "personnelCode"),
    firstName,
    lastName,
    districtCode: g("کد منطقه", "districtCode"),
    districtName: g("نام منطقه", "منطقه", "districtName", "منطقه محل خدمت", "مبدا"),
  };
}

export function personnelToRows(list) {
  return list.map((p) => ({
    "کد پرسنلی": p.personnelCode || "",
    نام: p.firstName || "",
    "نام خانوادگی": p.lastName || "",
    "کد منطقه": p.districtCode || "",
    "نام منطقه": p.districtName || "",
  }));
}

function normalizeCell(v) {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") return String(v);
  return String(v ?? "").trim();
}
