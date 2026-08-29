"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import Pagination, { useClientPaging } from "@/components/Pagination";
import { CollapsibleHBarList, DonutChart, formatPercent, HBarList, ReportSection, STATUS_COLORS } from "@/components/ReportVisuals";
import ReportLookup from "@/components/ReportLookup";
import { REPORT_STATS_ROLES, RESULT_LABELS } from "@/lib/constants";
import { toFaDigits } from "@/lib/dates";

function ReportTable({ columns, rows, rowKey, cells, empty = "موردی یافت نشد" }) {
  const paging = useClientPaging(rows || []);
  return (
    <div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(paging.slice || []).length ? (
              paging.slice.map((row, i) => (
                <tr key={rowKey(row, i)}>
                  {cells(row).map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>{empty}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={paging.page}
        pages={paging.pages}
        total={paging.total}
        limit={paging.limit}
        onPage={paging.onPage}
        onLimit={paging.onLimit}
      />
    </div>
  );
}

function ApplicantCategoryFinalTable({ data }) {
  const statuses = data?.statuses || [];
  const paging = useClientPaging(data?.rows || []);
  const total = data?.total || 0;
  return (
    <div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>عنوان دسته‌بندی</th>
              {statuses.map((s) => (
                <th key={s}>{s}</th>
              ))}
              <th>جمع</th>
              <th>درصد</th>
            </tr>
          </thead>
          <tbody>
            {paging.slice.map((row) => (
              <tr key={row.categoryTitle}>
                <td>{row.categoryTitle}</td>
                {statuses.map((s) => (
                  <td key={s}>{toFaDigits(row.counts?.[s] || 0)}</td>
                ))}
                <td className="font-medium">{toFaDigits(row.total)}</td>
                <td>{formatPercent(row.total, total)}</td>
              </tr>
            ))}
            {data?.rows?.length ? (
              <tr className="bg-slate-50 font-medium">
                <td>جمع</td>
                {statuses.map((s) => (
                  <td key={s}>{toFaDigits(data.statusTotals?.[s] || 0)}</td>
                ))}
                <td>{toFaDigits(data.total)}</td>
                <td>{formatPercent(data.total, total)}</td>
              </tr>
            ) : (
              <tr>
                <td colSpan={Math.max(3, statuses.length + 3)}>موردی یافت نشد</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={paging.page}
        pages={paging.pages}
        total={paging.total}
        limit={paging.limit}
        onPage={paging.onPage}
        onLimit={paging.onLimit}
      />
    </div>
  );
}

function StatCard({ label, value, hint, children }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{toFaDigits(value ?? 0)}</div>
      {hint ? <div className="text-xs text-slate-500 mt-1">{hint}</div> : null}
      {children}
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [canLookup, setCanLookup] = useState(false);
  const [canStats, setCanStats] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([api("/api/auth/me"), api("/api/settings")])
      .then(([me, s]) => {
        const role = me.user?.activeRole;
        const lookup = Boolean(s.settings?.allowReportLookup?.[role]);
        const statsOk = REPORT_STATS_ROLES.includes(role);
        setCanLookup(lookup);
        setCanStats(statsOk);
        if (statsOk) return api("/api/reports").then(setData);
        setData(null);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <p>در حال بارگذاری...</p>;
  if (!canStats && !canLookup) {
    return <p className="text-sm text-slate-600">دسترسی به گزارش‌ها برای نقش فعلی شما فعال نیست.</p>;
  }
  if (canStats && !data) return <p>در حال بارگذاری...</p>;

  const total = data?.total || 0;
  const inquiryTotal = data?.inquiryTotal ?? 0;
  const closed = (data?.approved || 0) + (data?.rejected || 0);
  const byStatusItems = (data?.byStatus || [])
    .filter((s) => s.count > 0)
    .map((s) => ({
      key: s.status,
      label: s.label,
      count: s.count,
      color: STATUS_COLORS[s.status] || "#0f3d5f",
    }));
  const resultSlices = [
    { key: "approved", label: RESULT_LABELS.approved, count: data?.approved || 0, color: "#059669" },
    { key: "rejected", label: RESULT_LABELS.rejected, count: data?.rejected || 0, color: "#dc2626" },
  ].filter((s) => s.count > 0);
  const categoryItems = (data?.byCategory || []).map((s) => ({
    key: s._id || "empty",
    label: s._id || "بدون دسته",
    count: s.count,
  }));
  const inquiryItems = (data?.byInquiryDistrict || []).map((s) => ({
    key: s.districtCode || s.label,
    label: s.label,
    count: s.count,
    color: "#4f46e5",
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">گزارش وضعیت درخواست‌ها</h1>
        <p className="text-sm text-slate-500 mt-1">نمای کلی گردش کار، استعلام مناطق و نتیجه نهایی</p>
      </div>

      {canLookup ? <ReportLookup /> : null}

      {canStats && data ? (
        <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="کل درخواست‌ها" value={total} />
        <StatCard
          label="در انتظار استعلام منطقه"
          value={inquiryTotal}
          hint={total ? `${formatPercent(inquiryTotal, total)} از کل درخواست‌ها` : null}
        />
        <StatCard
          label="بررسی نهایی"
          value={closed}
          hint={total ? `${formatPercent(closed, total)} از کل درخواست‌ها` : null}
        >
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 font-medium">
              تایید: {toFaDigits(data.approved || 0)}
            </span>
            <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 font-medium">
              رد: {toFaDigits(data.rejected || 0)}
            </span>
          </div>
        </StatCard>
        <StatCard
          label="متقاضیان"
          value={data.applicantTotal ?? 0}
        />
      </div>

      <ReportSection
        title="گردش کار / وضعیت"
        description="توزیع درخواست‌ها در هر مرحله از فرایند رسیدگی"
        accent="border-s-[#0f3d5f]"
      >
        <HBarList items={byStatusItems} total={total} />
        <ReportTable
          columns={["وضعیت", "تعداد", "درصد"]}
          rows={data.byStatus}
          rowKey={(s) => s.status}
          cells={(s) => [s.label, toFaDigits(s.count), formatPercent(s.count, total)]}
        />
      </ReportSection>

      <ReportSection
        title="استعلام از منطقه"
        description="پرونده‌هایی که همین حالا در انتظار پاسخ کارشناس انتقالات منطقه هستند؛ به تفکیک منطقه استعلام‌شده"
        accent="border-s-indigo-600"
      >
        <p className="text-sm text-slate-600">
          جمع در انتظار استعلام: <b>{toFaDigits(inquiryTotal)}</b>
          {total ? <span className="text-slate-500"> ({formatPercent(inquiryTotal, total)} از کل)</span> : null}
        </p>
        {inquiryItems.length ? (
          <CollapsibleHBarList items={inquiryItems} total={inquiryTotal} />
        ) : null}
        <ReportTable
          columns={["منطقه", "تعداد پرونده", "درصد از استعلام‌ها"]}
          rows={data.byInquiryDistrict}
          rowKey={(s) => s.districtCode || s.label}
          cells={(s) => [s.label, toFaDigits(s.count), formatPercent(s.count, inquiryTotal)]}
          empty="الان هیچ پرونده‌ای در انتظار استعلام منطقه نیست"
        />
      </ReportSection>

      <ReportSection
        title="نتیجه نهایی (تایید / رد)"
        description="فقط درخواست‌هایی که به مرحله بررسی نهایی رسیده‌اند"
        accent="border-s-emerald-600"
      >
        {resultSlices.length ? (
          <DonutChart slices={resultSlices} total={closed} />
        ) : (
          <p className="text-sm text-slate-500">هنوز پرونده‌ای به بررسی نهایی نرسیده است.</p>
        )}
        <ReportTable
          columns={["نتیجه", "تعداد", "درصد"]}
          rows={data.byResult}
          rowKey={(s) => s._id || "empty"}
          cells={(s) => [
            RESULT_LABELS[s._id] || s._id || "—",
            toFaDigits(s.count),
            formatPercent(s.count, closed),
          ]}
        />
      </ReportSection>

      <ReportSection
        title="دسته‌بندی درخواست‌ها"
        description="سهم هر دسته از کل درخواست‌های ثبت‌شده"
        accent="border-s-[#c9a227]"
      >
        <HBarList items={categoryItems} total={total} maxItems={8} />
        <ReportTable
          columns={["دسته", "تعداد", "درصد"]}
          rows={data.byCategory}
          rowKey={(s) => s._id || "empty"}
          cells={(s) => [s._id || "—", toFaDigits(s.count), formatPercent(s.count, total)]}
        />
      </ReportSection>

      <div>
        <h1 className="text-2xl font-bold">گزارش متقاضیان</h1>
        <p className="text-sm text-slate-500 mt-1">ترکیب دسته‌بندی و وضعیت نهایی در فهرست متقاضیان</p>
      </div>
      <ReportSection
        title="متقاضیان بر اساس عنوان دسته‌بندی و وضعیت نهایی"
        description={`کل متقاضیان: ${toFaDigits(data.applicantTotal ?? 0)}`}
        accent="border-s-slate-500"
      >
        <ApplicantCategoryFinalTable data={data.byApplicantCategoryFinal} />
      </ReportSection>
        </>
      ) : null}
    </div>
  );
}
