"use client";

import Link from "next/link";
import { RESULT_LABELS, STATUSES } from "@/lib/constants";
import { toFaDigits } from "@/lib/dates";
import {
  CollapsibleHBarList,
  DonutChart,
  formatPercent,
  HBarList,
  PeriodBarChart,
  STATUS_COLORS,
} from "@/components/ReportVisuals";

function bucketHomeTimeSeries(items) {
  return (items || []).map((item) => {
    const counts = item.counts || {};
    let closed = 0;
    let inFlow = 0;
    for (const [key, value] of Object.entries(counts)) {
      const n = value || 0;
      if (key === "REVIEW_RESULT" || key.startsWith("result:")) closed += n;
      else inFlow += n;
    }
    if (!Object.keys(counts).length) {
      inFlow = item.count || 0;
    }
    return {
      ...item,
      count: inFlow + closed,
      counts: { total: inFlow + closed, inFlow, closed },
    };
  });
}

const HOME_CHART_SERIES = [
  { key: "inFlow", label: "در جریان رسیدگی", color: "#0284c7" },
  { key: "closed", label: "بررسی نهایی", color: "#0f766e" },
];

export default function HomeReports({ reports }) {
  if (!reports) return null;
  const total = reports.total || 0;
  const inquiryTotal = reports.inquiryTotal ?? 0;
  const closed = (reports.approved || 0) + (reports.rejected || 0);
  const reviewCount =
    reports.byStatus?.find((s) => s.status === STATUSES.REVIEW_RESULT)?.count ||
    closed;
  const inFlow = Math.max(0, total - reviewCount);
  const byStatusItems = (reports.byStatus || [])
    .filter((s) => s.count > 0)
    .map((s) => ({
      key: s.status,
      label: s.label,
      count: s.count,
      color: STATUS_COLORS[s.status] || "#0f3d5f",
    }));
  const resultSlices = [
    {
      key: "approved",
      label: RESULT_LABELS.approved,
      count: reports.approved || 0,
      color: "#059669",
    },
    {
      key: "rejected",
      label: RESULT_LABELS.rejected,
      count: reports.rejected || 0,
      color: "#dc2626",
    },
  ].filter((s) => s.count > 0);
  const inquiryItems = (reports.byInquiryDistrict || []).map((s) => ({
    key: s.districtCode || s.label,
    label: s.label,
    count: s.count,
    color: "#4f46e5",
  }));
  const homeDaily = bucketHomeTimeSeries(reports.timeSeries?.daily);
  const homeMonthly = bucketHomeTimeSeries(reports.timeSeries?.monthly);

  return (
    <section className="card overflow-hidden border-s-4 border-s-[#0f3d5f]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-slate-50 px-5 py-4">
        <div>
          <h2 className="font-bold text-lg">گزارش وضعیت درخواست‌ها</h2>
          <p className="text-sm text-slate-500 mt-1">
            نمای کلی گردش کار، استعلام مناطق و نتیجه نهایی
          </p>
        </div>
        <Link href="/app/reports" className="btn-outline shrink-0">
          گزارش کامل
        </Link>
      </div>
      <div className="p-5 space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">کل درخواست‌ها</div>
            <div className="text-2xl font-bold mt-1">{toFaDigits(total)}</div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <div className="text-xs text-sky-800">در جریان رسیدگی</div>
            <div className="text-2xl font-bold mt-1 text-sky-900">
              {toFaDigits(inFlow)}
            </div>
            <div className="text-xs text-sky-700 mt-1">
              {total ? `${formatPercent(inFlow, total)} از کل` : null}
            </div>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="text-xs text-indigo-800">
              در انتظار استعلام منطقه
            </div>
            <div className="text-2xl font-bold mt-1 text-indigo-900">
              {toFaDigits(inquiryTotal)}
            </div>
            <div className="text-xs text-indigo-700 mt-1">
              {total ? `${formatPercent(inquiryTotal, total)} از کل` : null}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs text-slate-500">بررسی نهایی</div>
            <div className="text-2xl font-bold mt-1">
              {toFaDigits(reviewCount)}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 font-medium">
                تایید: {toFaDigits(reports.approved || 0)}
              </span>
              <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 font-medium">
                رد: {toFaDigits(reports.rejected || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <h3 className="font-medium mb-1">روند درخواست‌ها</h3>
          <p className="text-sm text-slate-500 mb-3">
            ارتفاع هر میله برابر کل درخواست‌های آن روز یا ماه است؛ بخش آبی در جریان رسیدگی و بخش سبزآبی بررسی نهایی است
          </p>
          <PeriodBarChart
            daily={homeDaily}
            monthly={homeMonthly}
            series={HOME_CHART_SERIES}
            headlineKey="total"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-medium mb-3">توزیع گردش کار</h3>
            <HBarList items={byStatusItems} total={total} />
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-medium mb-3">نتیجه نهایی</h3>
            {resultSlices.length ? (
              <DonutChart slices={resultSlices} total={closed || reviewCount} />
            ) : (
              <p className="text-sm text-slate-500">
                هنوز پرونده‌ای به نرسیده است.
              </p>
            )}
          </div>
        </div>

        {inquiryItems.length ? (
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-medium mb-3">استعلام از منطقه (به تفکیک)</h3>
            <CollapsibleHBarList items={inquiryItems} total={inquiryTotal} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
