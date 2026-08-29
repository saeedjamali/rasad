import Region from "@/models/Region";

let cache = { at: 0, map: null, list: null };

export function clearRegionCache() {
  cache = { at: 0, map: null, list: null };
}

export function regionLabel(region) {
  if (!region) return "";
  return `${region.districtCode} — ${region.districtName}`;
}

export async function loadRegionMap() {
  const now = Date.now();
  if (cache.map && now - cache.at < 30_000) return cache.map;
  const list = await Region.find().lean();
  cache = {
    at: now,
    list,
    map: new Map(list.map((r) => [String(r.districtCode), r])),
  };
  return cache.map;
}

export function findRegion(map, code) {
  if (code == null || code === "") return null;
  return map.get(String(code).trim()) || null;
}

export function findRegionByName(map, name) {
  if (!name) return null;
  const n = String(name).trim();
  for (const r of map.values()) {
    if (r.districtName === n || r.districtCode === n) return r;
  }
  return null;
}

export async function applyRegionNames(data) {
  const map = await loadRegionMap();
  const origin =
    findRegion(map, data.districtCode) || findRegionByName(map, data.originDistrict);
  if (origin) {
    data.districtCode = origin.districtCode;
    data.originDistrict = origin.districtName;
  }
  const dest = findRegion(map, data.destCode) || findRegionByName(map, data.destDistrict);
  if (dest) {
    data.destCode = dest.districtCode;
    data.destDistrict = dest.districtName;
  }
  const service =
    findRegion(map, data.serviceDistrict) || findRegionByName(map, data.serviceDistrict);
  if (service) data.serviceDistrict = service.districtName;
  return data;
}

export async function applyUserRegion(data) {
  const map = await loadRegionMap();
  const r =
    findRegion(map, data.districtCode) ||
    findRegionByName(map, data.districtName) ||
    findRegionByName(map, data.districtCode);
  if (r) {
    data.districtCode = r.districtCode;
    data.provinceCode = data.provinceCode || r.provinceCode || "17";
  }
  return data;
}

export function decorateApplicant(doc, map) {
  if (!doc) return doc;
  const a = { ...doc };
  const origin = findRegion(map, a.districtCode) || findRegionByName(map, a.originDistrict);
  const dest = findRegion(map, a.destCode) || findRegionByName(map, a.destDistrict);
  const service =
    findRegion(map, a.serviceDistrict) || findRegionByName(map, a.serviceDistrict);
  if (origin) {
    a.districtCode = origin.districtCode;
    a.originDistrict = origin.districtName;
    a.originRegionLabel = regionLabel(origin);
  } else if (a.districtCode || a.originDistrict) {
    a.originRegionLabel = [a.districtCode, a.originDistrict].filter(Boolean).join(" — ");
  }
  if (dest) {
    a.destCode = dest.districtCode;
    a.destDistrict = dest.districtName;
    a.destRegionLabel = regionLabel(dest);
  } else if (a.destCode || a.destDistrict) {
    a.destRegionLabel = [a.destCode, a.destDistrict].filter(Boolean).join(" — ");
  }
  if (service) {
    a.serviceDistrict = service.districtName;
    a.serviceRegionLabel = regionLabel(service);
  } else if (a.serviceDistrict) {
    a.serviceRegionLabel = a.serviceDistrict;
  }
  return a;
}

export async function decorateApplicants(list) {
  const map = await loadRegionMap();
  return (list || []).map((a) => decorateApplicant(a, map));
}

export function districtLogFields(region) {
  if (!region?.districtCode) return {};
  return {
    districtCode: region.districtCode,
    districtName: region.districtName || "",
    districtLabel: regionLabel(region),
  };
}

export function decorateRequestLogs(logs, map) {
  return (logs || []).map((log) => {
    const extra = { ...(log.extra || {}) };
    if (!extra.districtCode && !extra.districtName) return { ...log, extra };
    if (!extra.districtLabel) {
      const r = findRegion(map, extra.districtCode) || findRegionByName(map, extra.districtName);
      extra.districtLabel = r
        ? regionLabel(r)
        : [extra.districtCode, extra.districtName].filter(Boolean).join(" — ");
      if (r && !extra.districtName) extra.districtName = r.districtName;
    }
    return { ...log, extra };
  });
}

export function decorateRequestItem(item, map) {
  if (!item) return item;
  const proposed = findRegion(map, item.proposedDistrictCode);
  const assigned = findRegion(map, item.assignedDistrictCode);
  return {
    ...item,
    proposedDistrictName: proposed?.districtName || item.proposedDistrictName || "",
    assignedDistrictName: assigned?.districtName || item.assignedDistrictName || "",
    proposedRegionLabel: proposed
      ? regionLabel(proposed)
      : [item.proposedDistrictCode, item.proposedDistrictName].filter(Boolean).join(" — "),
    assignedRegionLabel: assigned
      ? regionLabel(assigned)
      : [item.assignedDistrictCode, item.assignedDistrictName].filter(Boolean).join(" — "),
  };
}

export async function decorateRequest(item) {
  if (!item) return item;
  const map = await loadRegionMap();
  return decorateRequestItem(item, map);
}

export async function decorateRequests(list) {
  const map = await loadRegionMap();
  return (list || []).map((item) => decorateRequestItem(item, map));
}

export async function decorateUsers(list) {
  const map = await loadRegionMap();
  return (list || []).map((u) => decoratePersonnelItem(u, map));
}

export function decoratePersonnelItem(doc, map) {
  if (!doc) return doc;
  const r = findRegion(map, doc.districtCode) || findRegionByName(map, doc.districtCode);
  return {
    ...doc,
    districtName: r?.districtName || "",
    districtLabel: r ? regionLabel(r) : doc.districtCode || "",
  };
}

export async function decoratePersonnel(list) {
  const map = await loadRegionMap();
  return (list || []).map((p) => decoratePersonnelItem(p, map));
}
