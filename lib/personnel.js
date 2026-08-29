import Personnel from "@/models/Personnel";
import { escapeRegex, toEnglishDigits, validatePersonnelCode } from "./identity";
import { applyUserRegion, loadRegionMap } from "./regions";

export function districtCodeSearchValues(raw) {
  const s = toEnglishDigits(raw).trim();
  if (!s) return [];
  const values = new Set([s]);
  if (/^\d+$/.test(s)) {
    values.add(String(Number(s)));
    values.add(Number(s));
  }
  return [...values];
}

export async function personnelSearchFilter(q) {
  const qRaw = String(q || "").trim();
  if (!qRaw) return {};
  const qNorm = toEnglishDigits(qRaw).trim() || qRaw;
  const rx = new RegExp(escapeRegex(qNorm), "i");
  const prefix = new RegExp(`^${escapeRegex(qNorm)}`, "i");
  const codeValues = districtCodeSearchValues(qNorm);

  if (/^\d{2,8}$/.test(qNorm)) {
    return {
      $or: [
        { districtCode: { $in: codeValues } },
        { districtCode: prefix },
        { personnelCode: qNorm },
        { personnelCode: prefix },
      ],
    };
  }

  const or = [
    { personnelCode: rx },
    { firstName: rx },
    { lastName: rx },
  ];
  if (codeValues.length) or.push({ districtCode: { $in: codeValues } });

  const map = await loadRegionMap();
  const regionCodes = new Set();
  for (const r of map.values()) {
    const code = String(r.districtCode ?? "").trim();
    const name = String(r.districtName ?? "").trim();
    const nameEn = toEnglishDigits(name);
    if (
      code === qNorm ||
      code.includes(qNorm) ||
      name.includes(qRaw) ||
      name.includes(qNorm) ||
      nameEn.includes(qNorm)
    ) {
      for (const v of districtCodeSearchValues(code)) regionCodes.add(v);
    }
  }
  if (regionCodes.size) or.push({ districtCode: { $in: [...regionCodes] } });
  return { $or: or };
}

export async function upsertPersonnelProfile(data = {}) {
  const code = validatePersonnelCode(data.personnelCode);
  if (!code.ok) throw new Error(code.message);

  const region = {
    districtCode: data.districtCode || "",
    districtName: data.districtName || data.originDistrict || data.serviceDistrict || "",
  };
  await applyUserRegion(region);

  const payload = {
    personnelCode: code.value,
    firstName: String(data.firstName || "").trim(),
    lastName: String(data.lastName || "").trim(),
    districtCode: region.districtCode || "",
  };
  if (!payload.firstName) throw new Error("نام الزامی است");
  if (!payload.lastName) throw new Error("نام خانوادگی الزامی است");
  if (!payload.districtCode) throw new Error("منطقه الزامی است");

  const existing = await Personnel.findOne({ personnelCode: payload.personnelCode });
  if (existing) {
    existing.set(payload);
    await existing.save();
    return { item: existing, created: false };
  }
  const item = await Personnel.create(payload);
  return { item, created: true };
}
