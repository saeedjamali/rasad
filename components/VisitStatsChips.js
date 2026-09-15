"use client";

import { toFaDigits } from "@/lib/dates";

export default function VisitStatsChips({ opsToday, opsTotal, activeUsers = 0 }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
      {opsToday != null ? (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
          عملیات امروز <b className="font-semibold text-slate-800">{toFaDigits(opsToday)}</b>
        </span>
      ) : null}
      {opsTotal != null ? (
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
          کل عملیات <b className="font-semibold text-slate-800">{toFaDigits(opsTotal)}</b>
        </span>
      ) : null}
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
        کاربران فعال <b className="font-semibold">{toFaDigits(activeUsers)}</b>
      </span>
    </div>
  );
}
