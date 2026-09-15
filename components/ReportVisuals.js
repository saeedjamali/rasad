"use client";

import { useState } from "react";
import { toFaDigits } from "@/lib/dates";

export function percentOf(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export function formatPercent(count, total) {
  const p = percentOf(count, total);
  const text = Number.isInteger(p) ? String(p) : p.toFixed(1);
  return `${toFaDigits(text)}٪`;
}

export const STATUS_COLORS = {
  WAITING_PROVINCE_REVIEW: "#d97706",
  IN_REVIEW_PROVINCE: "#0284c7",
  INQUIRY_DISTRICT: "#4f46e5",
  INQUIRY_PLANNING: "#7c3aed",
  INQUIRY_RESPONSE_WAITING_PROVINCE: "#0891b2",
  REVIEW_RESULT: "#475569",
  RETURNED_TO_USER: "#ea580c",
};

export function ReportSection({ title, description, accent, children }) {
  return (
    <section className={`card overflow-hidden border-s-4 ${accent || "border-s-slate-300"}`}>
      <div className="border-b bg-slate-50 px-5 py-4">
        <h2 className="font-bold text-lg">{title}</h2>
        {description ? <p className="text-sm text-slate-500 mt-1">{description}</p> : null}
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </section>
  );
}

export function HBarList({ items, total, maxItems, sharedMax }) {
  const source = items || [];
  const visible =
    maxItems && source.length > maxItems
      ? [
          ...source.slice(0, maxItems),
          {
            key: "__other",
            label: "سایر",
            count: source.slice(maxItems).reduce((n, x) => n + (x.count || 0), 0),
            color: "#94a3b8",
          },
        ]
      : source;
  const max = sharedMax || Math.max(...visible.map((x) => x.count || 0), 1);
  if (!visible.length) {
    return <p className="text-sm text-slate-500">موردی برای نمایش وجود ندارد.</p>;
  }
  return (
    <div className="space-y-3">
      {visible.map((item) => {
        const width = ((item.count || 0) / max) * 100;
        return (
          <div key={item.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
              <span className="truncate">{item.label}</span>
              <span className="shrink-0 text-slate-600">
                {toFaDigits(item.count || 0)}
                <span className="text-slate-400"> ({formatPercent(item.count || 0, total)})</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${width}%`, background: item.color || "#0f3d5f" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Shows the first districts, then a drawer for the rest. */
export function CollapsibleHBarList({ items, total, previewCount = 3, expandedExtra }) {
  const [open, setOpen] = useState(false);
  const source = items || [];
  const preview = source.slice(0, previewCount);
  const rest = source.slice(previewCount);
  const restCount = rest.length;
  const barMax = Math.max(...source.map((x) => x.count || 0), 1);

  if (!source.length) {
    return <p className="text-sm text-slate-500">موردی برای نمایش وجود ندارد.</p>;
  }

  return (
    <div className="space-y-3">
      <HBarList items={preview} total={total} sharedMax={barMax} />
      {restCount ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100"
            aria-expanded={open}
          >
            <span>
              {open
                ? "پنهان کردن بقیه مناطق"
                : `مشاهده بقیه مناطق (${toFaDigits(restCount)} منطقه)`}
            </span>
            <svg
              className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {open ? (
            <div className="space-y-5 border-t border-slate-200 bg-white p-4">
              <HBarList items={rest} total={total} sharedMax={barMax} />
              {expandedExtra || null}
            </div>
          ) : null}
        </div>
      ) : (
        expandedExtra || null
      )}
    </div>
  );
}

export function DonutChart({ slices, total }) {
  const size = 140;
  const r = 48;
  const c = 2 * Math.PI * r;
  const sum = total || slices.reduce((n, s) => n + (s.count || 0), 0) || 1;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 140 140" className="-rotate-90" dir="ltr" aria-hidden>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="18" />
        {slices.map((s) => {
          const frac = (s.count || 0) / sum;
          const dash = frac * c;
          const offset = -acc * c;
          acc += frac;
          return (
            <circle
              key={s.key}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <ul className="space-y-2 text-sm">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span>{s.label}</span>
            <span className="text-slate-600">
              {toFaDigits(s.count || 0)} ({formatPercent(s.count || 0, sum)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function seriesValue(item, seriesKey) {
  if (item?.counts && seriesKey in item.counts) return item.counts[seriesKey] || 0;
  if (seriesKey === "count") return item?.count || 0;
  return item?.[seriesKey] || 0;
}

export function usedChartSeries(series, ...groups) {
  const items = groups.flat().filter(Boolean);
  return (series || []).filter((s) => items.some((item) => seriesValue(item, s.key) > 0));
}

function itemHeadline(item, seriesList, headlineKey) {
  if (headlineKey) return seriesValue(item, headlineKey);
  return seriesList.reduce((n, s) => n + seriesValue(item, s.key), 0);
}

/** Vertical daily/monthly bars. Time flows left-to-right; series stack in one bar. */
export function PeriodBarChart({
  daily = [],
  monthly = [],
  series,
  height = 180,
  defaultPeriod = "daily",
  headlineKey,
}) {
  const [period, setPeriod] = useState(defaultPeriod);
  const items = period === "monthly" ? monthly : daily;
  const seriesList = series?.length ? series : [{ key: "count", label: "تعداد", color: "#0f3d5f" }];
  const max = Math.max(
    ...items.map((item) => seriesList.reduce((n, s) => n + seriesValue(item, s.key), 0)),
    1
  );
  const empty = !items.some((item) => seriesList.some((s) => seriesValue(item, s.key) > 0));
  const barMin = period === "daily" ? 22 : 44;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          <button
            type="button"
            className={period === "daily" ? "btn-primary" : "btn-outline"}
            onClick={() => setPeriod("daily")}
          >
            روزانه (۳۰ روز)
          </button>
          <button
            type="button"
            className={period === "monthly" ? "btn-primary" : "btn-outline"}
            onClick={() => setPeriod("monthly")}
          >
            ماهانه (۱۲ ماه)
          </button>
        </div>
        {seriesList.length > 1 ? (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
            {seriesList.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {empty ? (
        <p className="text-sm text-slate-500">در این بازه موردی ثبت نشده است.</p>
      ) : (
        <div className="overflow-x-auto">
          <div
            className="flex items-end gap-1"
            style={{ minWidth: items.length * barMin, height: height + 40 }}
            dir="ltr"
          >
            {items.map((item) => {
              const stackedTotal = seriesList.reduce((n, s) => n + seriesValue(item, s.key), 0);
              const headline = itemHeadline(item, seriesList, headlineKey);
              const colH = stackedTotal ? (stackedTotal / max) * height : 0;
              return (
                <div key={item.key} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full">
                  <div className="text-[10px] text-slate-500 mb-1 tabular-nums h-4" dir="rtl">
                    {headline ? toFaDigits(headline) : ""}
                  </div>
                  <div
                    className="w-full max-w-9 rounded-t-md bg-slate-100 overflow-hidden"
                    style={{ height }}
                    title={`${item.label}: ${toFaDigits(stackedTotal)}`}
                  >
                    <div className="flex h-full w-full flex-col justify-end">
                      <div className="flex w-full flex-col-reverse" style={{ height: colH }}>
                        {seriesList.map((s) => {
                          const v = seriesValue(item, s.key);
                          if (!v || !stackedTotal) return null;
                          return (
                            <div
                              key={s.key}
                              className="w-full min-h-px"
                              style={{ height: `${(v / stackedTotal) * 100}%`, background: s.color }}
                              title={`${item.label} — ${s.label}: ${toFaDigits(v)}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div
                    className="mt-1.5 w-full truncate text-center text-[10px] leading-tight text-slate-500"
                    dir="rtl"
                    title={item.label}
                  >
                    {item.shortLabel || item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
