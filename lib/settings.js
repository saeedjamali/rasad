import Setting from "@/models/Setting";
import { ROLES } from "./constants";

let cache = { at: 0, value: null };

export const DEFAULT_SERVICES = [
  {
    id: "transfer",
    title: "سرویس رسیدگی به درخواست‌های انتقال",
    description:
      "این سرویس با هدف رسیدگی به درخواست کاربران شرکت‌کننده در فرآیند نقل و انتقال و پیگیری گردش کار کارشناسی در سطح استان و منطقه.",
    enabled: true,
    visible: true,
  },
];

export function normalizeServices(list) {
  const source = Array.isArray(list) ? list : DEFAULT_SERVICES;
  return source.slice(0, 20).map((s, i) => ({
    id: String(s?.id || `s${i + 1}`).slice(0, 40),
    title: String(s?.title || "").trim().slice(0, 200),
    description: String(s?.description || "").trim().slice(0, 2000),
    enabled: s?.enabled !== false,
    visible: s?.visible !== false,
  })).filter((s) => s.title);
}

function asSettings(doc) {
  const data = doc && typeof doc === "object" ? doc : {};
  return {
    allowNewRequestAfterFinal: Boolean(data.allowNewRequestAfterFinal),
    allowDistrictAddApplicant: Boolean(data.allowDistrictAddApplicant),
    allowPasswordLogin: Boolean(data.allowPasswordLogin),
    smsOnline: data.smsOnline != null ? Boolean(data.smsOnline) : process.env.SMS_DEV !== "true",
    systemEnabled: data.systemEnabled !== false,
    services: Array.isArray(data.services) ? normalizeServices(data.services) : normalizeServices(DEFAULT_SERVICES),
  };
}

export function clearSettingsCache() {
  cache = { at: 0, value: null };
}

export async function getSettings() {
  if (cache.value && Date.now() - cache.at < 5000) return cache.value;
  const doc = await Setting.findOne({ key: "app" }).lean();
  const value = asSettings(doc);
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSettings(patch = {}) {
  const current = await getSettings();
  const next = { ...current };
  if (patch.allowNewRequestAfterFinal != null) {
    next.allowNewRequestAfterFinal = Boolean(patch.allowNewRequestAfterFinal);
  }
  if (patch.allowDistrictAddApplicant != null) {
    next.allowDistrictAddApplicant = Boolean(patch.allowDistrictAddApplicant);
  }
  if (patch.allowPasswordLogin != null) {
    next.allowPasswordLogin = Boolean(patch.allowPasswordLogin);
  }
  if (patch.smsOnline != null) {
    next.smsOnline = Boolean(patch.smsOnline);
  }
  if (patch.systemEnabled != null) {
    next.systemEnabled = Boolean(patch.systemEnabled);
  }
  if (patch.services != null) {
    next.services = normalizeServices(patch.services);
  }
  const item = await Setting.findOneAndUpdate({ key: "app" }, { $set: next }, { new: true, upsert: true, setDefaultsOnInsert: true });
  const value = asSettings(item);
  cache = { at: Date.now(), value };
  return value;
}

export function userIsAdmin(user) {
  return (user?.roles || []).includes(ROLES.admin);
}

export async function systemBlockedFor(user) {
  const settings = await getSettings();
  return !settings.systemEnabled && !userIsAdmin(user);
}

export async function publicStatus() {
  const settings = await getSettings();
  return {
    systemEnabled: settings.systemEnabled,
    allowPasswordLogin: settings.allowPasswordLogin,
    services: (settings.services || []).filter((s) => s.visible !== false),
  };
}
