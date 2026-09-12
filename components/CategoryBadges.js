"use client";

import { requestCategoryTitles } from "@/lib/requestDisplay";

const MAIN_COLORS = [
  "bg-sky-100 text-sky-900 border-sky-200",
  "bg-violet-100 text-violet-900 border-violet-200",
  "bg-emerald-100 text-emerald-900 border-emerald-200",
  "bg-amber-100 text-amber-950 border-amber-200",
  "bg-rose-100 text-rose-900 border-rose-200",
  "bg-indigo-100 text-indigo-900 border-indigo-200",
  "bg-teal-100 text-teal-900 border-teal-200",
  "bg-orange-100 text-orange-950 border-orange-200",
];

function Chip({ text, className }) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-5 ${className}`}>
      {text}
    </span>
  );
}

export function CategoryBadges({ item, showSubs = false, compact = false }) {
  const titles = requestCategoryTitles(item);
  const subs = Array.isArray(item?.subcategoryTitles)
    ? item.subcategoryTitles.map((t) => String(t || "").trim()).filter(Boolean)
    : [];
  if (!titles.length && !(showSubs && subs.length)) return null;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {titles.length ? (
        <div>
          {compact ? null : <div className="text-xs text-slate-500 mb-1.5">دسته‌بندی</div>}
          <div className="flex flex-wrap gap-1.5">
            {titles.map((title, i) => (
              <Chip key={`${title}-${i}`} text={title} className={MAIN_COLORS[i % MAIN_COLORS.length]} />
            ))}
          </div>
        </div>
      ) : null}
      {showSubs && subs.length ? (
        <div>
          {compact ? null : <div className="text-xs text-slate-500 mb-1.5">زیر‌دسته</div>}
          <div className="flex flex-wrap gap-1.5">
            {subs.map((title, i) => (
              <Chip key={`${title}-${i}`} text={title} className="bg-slate-100 text-slate-700 border-slate-200" />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
