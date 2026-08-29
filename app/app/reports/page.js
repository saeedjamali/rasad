"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import Pagination, { useClientPaging } from "@/components/Pagination";
import { RESULT_LABELS } from "@/lib/constants";

function ReportTable({ title, columns, rows, rowKey, cells }) {
  const paging = useClientPaging(rows || []);
  return (
    <section>
      <h2 className="font-bold mb-2">{title}</h2>
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
            {paging.slice.map((row, i) => (
              <tr key={rowKey(row, i)}>
                {cells(row).map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
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
    </section>
  );
}

function ApplicantCategoryFinalTable({ data }) {
  const statuses = data?.statuses || [];
  const paging = useClientPaging(data?.rows || []);
  return (
    <section>
      <h2 className="font-bold mb-2">متقاضیان بر اساس عنوان دسته‌بندی و وضعیت نهایی</h2>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>عنوان دسته‌بندی</th>
              {statuses.map((s) => (
                <th key={s}>{s}</th>
              ))}
              <th>جمع</th>
            </tr>
          </thead>
          <tbody>
            {paging.slice.map((row) => (
              <tr key={row.categoryTitle}>
                <td>{row.categoryTitle}</td>
                {statuses.map((s) => (
                  <td key={s}>{row.counts?.[s] || 0}</td>
                ))}
                <td className="font-medium">{row.total}</td>
              </tr>
            ))}
            {data?.rows?.length ? (
              <tr className="bg-slate-50 font-medium">
                <td>جمع</td>
                {statuses.map((s) => (
                  <td key={s}>{data.statusTotals?.[s] || 0}</td>
                ))}
                <td>{data.total}</td>
              </tr>
            ) : (
              <tr>
                <td colSpan={Math.max(2, statuses.length + 2)}>موردی یافت نشد</td>
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
    </section>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api("/api/reports").then(setData);
  }, []);
  if (!data) return <p>در حال بارگذاری...</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">گزارش وضعیت درخواست‌ها</h1>
      <div className="card p-4">کل درخواست‌ها: {data.total}</div>
      <ReportTable
        title="بر اساس گردش کار / وضعیت"
        columns={["وضعیت", "تعداد"]}
        rows={data.byStatus}
        rowKey={(s) => s.status}
        cells={(s) => [s.label, s.count]}
      />
      <ReportTable
        title="بر اساس دسته‌بندی"
        columns={["دسته", "تعداد"]}
        rows={data.byCategory}
        rowKey={(s) => s._id || "empty"}
        cells={(s) => [s._id || "—", s.count]}
      />
      <ReportTable
        title="نتیجه نهایی (تایید / رد)"
        columns={["نتیجه", "تعداد"]}
        rows={data.byResult}
        rowKey={(s) => s._id || "empty"}
        cells={(s) => [RESULT_LABELS[s._id] || s._id || "—", s.count]}
      />
      <h1 className="text-2xl font-bold pt-2">گزارش متقاضیان</h1>
      <div className="card p-4">کل متقاضیان: {data.applicantTotal ?? 0}</div>
      <ApplicantCategoryFinalTable data={data.byApplicantCategoryFinal} />
    </div>
  );
}
