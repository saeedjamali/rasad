"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";

let cached = null;
let pending = null;

export function clearRegionsClientCache() {
  cached = null;
  pending = null;
}

export function useRegions() {
  const [list, setList] = useState(cached || []);
  useEffect(() => {
    if (cached) {
      setList(cached);
      return;
    }
    if (!pending) pending = api("/api/regions?all=1").then((d) => d.list || []);
    pending.then((rows) => {
      cached = rows;
      setList(rows);
    });
  }, []);
  return list;
}

export function regionLabel(r) {
  if (!r) return "";
  return `${r.districtCode} — ${r.districtName}`;
}

export function displayRegion(list, code, fallbackName = "") {
  const r = list.find((x) => String(x.districtCode) === String(code || ""));
  if (r) return regionLabel(r);
  if (code && fallbackName) return `${code} — ${fallbackName}`;
  return fallbackName || code || "—";
}

export function applicantRegionValue(a, k) {
  if (!a) return "—";
  if (k === "originDistrict" || k === "districtCode") {
    return a.originRegionLabel || a.originDistrict || a.districtCode || "—";
  }
  if (k === "destDistrict" || k === "destCode") {
    return a.destRegionLabel || a.destDistrict || a.destCode || "—";
  }
  if (k === "serviceDistrict") {
    return a.serviceRegionLabel || a.serviceDistrict || "—";
  }
  return a[k] || "—";
}

export default function RegionSelect({ value, onChange, required, disabled }) {
  const regions = useRegions();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return regions;
    return regions.filter(
      (x) => x.districtCode.includes(s) || x.districtName.includes(s)
    );
  }, [q, regions]);

  const selectedInFilter = filtered.some((r) => String(r.districtCode) === String(value || ""));
  const selected = regions.find((r) => String(r.districtCode) === String(value || ""));

  function pickFromSearch() {
    const s = q.trim();
    if (!s) return false;
    const exactCode = regions.find((x) => String(x.districtCode) === s);
    const exactName = regions.find((x) => x.districtName === s);
    const codePrefix = filtered.filter((x) => String(x.districtCode).startsWith(s));
    const namePrefix = filtered.filter((x) => x.districtName.startsWith(s));
    const picked =
      exactCode ||
      exactName ||
      (filtered.length === 1 ? filtered[0] : null) ||
      (codePrefix.length === 1 ? codePrefix[0] : null) ||
      (namePrefix.length === 1 ? namePrefix[0] : null) ||
      filtered[0];
    if (!picked) return false;
    onChange(picked.districtCode, picked);
    setQ("");
    return true;
  }

  return (
    <div className="space-y-1">
      <input
        className="input"
        placeholder="جستجو کد یا نام منطقه و Enter"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          pickFromSearch();
        }}
        disabled={disabled}
      />
      <select
        className="input"
        value={value || ""}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value, regions.find((r) => r.districtCode === e.target.value))}
      >
        <option value="">انتخاب از جدول مناطق</option>
        {!selectedInFilter && selected ? (
          <option value={selected.districtCode}>{regionLabel(selected)}</option>
        ) : null}
        {filtered.map((r) => (
          <option key={r._id || r.districtCode} value={r.districtCode}>
            {regionLabel(r)}
          </option>
        ))}
      </select>
    </div>
  );
}
