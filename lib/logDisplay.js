import {
  ACTION_LABELS,
  APPLICANT_FIELDS,
  ENTITY_LABELS,
  RESULT_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  statusLabel,
} from "./constants";

const SKIP_DETAIL_KEYS = new Set([
  "_id",
  "__v",
  "id",
  "key",
  "password",
  "passwordHash",
  "confirm",
  "passwordConfirm",
  "createdAt",
  "updatedAt",
]);

const FIELD_LABELS = {
  mobile: "شماره همراه",
  personnelCode: "کد پرسنلی",
  fullName: "نام",
  firstName: "نام",
  lastName: "نام خانوادگی",
  created: "ایجاد شده",
  updated: "به‌روزرسانی شده",
  errors: "خطا",
  from: "از وضعیت",
  to: "به وضعیت",
  fromStatus: "از وضعیت",
  toStatus: "به وضعیت",
  ip: "آی‌پی",
  entity: "موجودیت",
  entityId: "شناسه",
  districtCode: "کد منطقه",
  provinceCode: "کد استان",
  opinion: "نظر",
  result: "نتیجه",
  roles: "نقش‌ها",
  isActive: "فعال",
  isLocked: "قفل",
  allowPasswordLogin: "ورود با رمز عبور",
  allowDistrictAddApplicant: "ثبت متقاضی توسط منطقه",
  allowNewRequestAfterFinal: "ثبت درخواست پس از بررسی نهایی",
  smsOnline: "پیامک آنلاین",
  systemEnabled: "سامانه فعال",
  services: "سرویس‌ها",
  title: "عنوان",
  description: "توضیح",
  enabled: "فعال",
  visible: "نمایش در صفحه ورود",
  ...Object.fromEntries(APPLICANT_FIELDS),
};

export function logActionLabel(action) {
  if (!action) return "—";
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (String(action).startsWith("request_")) {
    const inner = action.slice("request_".length);
    if (ACTION_LABELS[inner]) return ACTION_LABELS[inner];
  }
  return action;
}

function fieldLabel(key) {
  return FIELD_LABELS[key] || key;
}

function formatScalar(key, value) {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  const text = String(value);
  if (key === "from" || key === "to" || key === "fromStatus" || key === "toStatus") {
    return statusLabel(text, "") || text;
  }
  if (key === "result" || key === "opinion") return RESULT_LABELS[text] || text;
  if (key === "entity") return ENTITY_LABELS[text] || text;
  if (ROLE_LABELS[text]) return ROLE_LABELS[text];
  if (STATUS_LABELS[text]) return STATUS_LABELS[text];
  if (ACTION_LABELS[text]) return ACTION_LABELS[text];
  return text;
}

function formatValue(key, value) {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) {
    if (key === "roles") return value.map((r) => ROLE_LABELS[r] || r).join("، ");
    if (key === "services") {
      return value
        .map((s) => {
          if (!s || typeof s !== "object") return String(s);
          const on = s.enabled !== false ? "فعال" : "غیرفعال";
          return s.title ? `${s.title} (${on})` : on;
        })
        .filter(Boolean)
        .join("، ");
    }
    return value.map((item) => formatValue("", item)).filter(Boolean).join("، ");
  }
  if (typeof value === "object") {
    const nested = formatObjectLines(value);
    return nested.length ? nested.join("؛ ") : "";
  }
  return formatScalar(key, value);
}

function formatObjectLines(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    if (SKIP_DETAIL_KEYS.has(key)) continue;
    const formatted = formatValue(key, value);
    if (!formatted) continue;
    lines.push(`${fieldLabel(key)}: ${formatted}`);
  }
  return lines;
}

export function formatLogDetails(log) {
  const parts = [];
  const actionFa = logActionLabel(log.action);
  if (log.comment && log.comment !== actionFa && log.comment !== log.action) {
    parts.push(log.comment);
  }
  if (log.fromStatus || log.toStatus) {
    const from = log.fromStatus ? statusLabel(log.fromStatus, log.result) : "";
    const to = log.toStatus ? statusLabel(log.toStatus, log.result) : "";
    if (from && to && from !== to) parts.push(`تغییر وضعیت از «${from}» به «${to}»`);
    else if (to) parts.push(`وضعیت: ${to}`);
  }
  if (log.entity) {
    const entity = ENTITY_LABELS[log.entity] || log.entity;
    parts.push(log.entityId ? `${entity} (${log.entityId})` : entity);
  }
  if (log.ip) parts.push(`${fieldLabel("ip")}: ${log.ip}`);
  parts.push(...formatObjectLines(log.detail));
  parts.push(...formatObjectLines(log.extra));
  const unique = [...new Set(parts.filter(Boolean))];
  return unique.join(" · ") || "—";
}
