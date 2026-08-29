"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import StatusBadge from "@/components/StatusBadge";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import Pagination from "@/components/Pagination";
import { usePagedList } from "@/lib/usePagedList";

export default function RequestsPage() {
  const { list, page, limit, total, pages, apply } = usePagedList();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  async function load(nextPage = page, nextLimit = limit) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    sp.set("page", String(nextPage));
    sp.set("limit", String(nextLimit));
    const d = await api(`/api/requests?${sp}`);
    if (!(d.list || []).length && (d.page || nextPage) > 1) {
      return load((d.page || nextPage) - 1, nextLimit);
    }
    apply(d, nextPage, nextLimit);
  }

  useEffect(() => {
    load(1).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">لیست درخواست‌ها</h1>
      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="جستجو کد پیگیری / عنوان / پرسنلی / نام" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) =>
            ["APPROVED", "REJECTED"].includes(k) ? null : (
              <option key={k} value={k}>
                {v}
              </option>
            )
          )}
        </select>
        <button className="btn-primary" onClick={() => load(1)}>
          جستجو
        </button>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>کد پیگیری</th>
              <th>عنوان درخواست</th>
              <th>کد پرسنلی</th>
              <th>نام</th>
              <th>نام خانوادگی</th>
              <th>دسته‌بندی</th>
              <th>منطقه</th>
              <th>وضعیت</th>
              <th>به‌روزرسانی</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r._id}>
                <td>{r.trackingCode}</td>
                <td>{r.title || "—"}</td>
                <td>{r.personnelCode}</td>
                <td>{r.firstName || "—"}</td>
                <td>{r.lastName || "—"}</td>
                <td>{r.categoryTitle}</td>
                <td>{r.assignedRegionLabel || r.proposedRegionLabel || "—"}</td>
                <td>
                  <StatusBadge status={r.status} result={r.result} />
                </td>
                <td>{formatDateTime(r.updatedAt)}</td>
                <td>
                  <Link className="btn-outline" href={`/app/requests/${r._id}`}>
                    ورود / مشاهده
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pages={pages}
        total={total}
        limit={limit}
        onPage={(p) => load(p, limit)}
        onLimit={(l) => load(1, l)}
      />
    </div>
  );
}
