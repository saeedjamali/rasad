"use client";

import { toFaDigits } from "@/lib/dates";

export default function VisitStatsChips({ visits = 0, visitsTotal = 0, activeUsers = 0 }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
        بازدیدها <b className="font-semibold text-slate-800">{toFaDigits(visits)}</b>
      </span>
      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
        بازدید کل <b className="font-semibold text-slate-800">{toFaDigits(visitsTotal)}</b>
      </span>
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
        کاربران فعال <b className="font-semibold">{toFaDigits(activeUsers)}</b>
      </span>
    </div>
  );
}
