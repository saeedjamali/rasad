"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/dates";
import { ROLE_LABELS } from "@/lib/constants";
import Pagination from "@/components/Pagination";
import { usePagedList } from "@/lib/usePagedList";

export default function LogsPage() {
  const [type, setType] = useState("audit");
  const { list, page, limit, total, pages, apply } = usePagedList();

  async function load(t = type, nextPage = page, nextLimit = limit) {
    const d = await api(`/api/logs?type=${t}&page=${nextPage}&limit=${nextLimit}`);
    if (!(d.list || []).length && (d.page || nextPage) > 1) {
      return load(t, (d.page || nextPage) - 1, nextLimit);
    }
    apply(d, nextPage, nextLimit);
  }
  useEffect(() => {
    load("audit", 1);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">لاگ‌ها</h1>
      <div className="flex gap-2">
        <button className={type === "audit" ? "btn-primary" : "btn-outline"} onClick={() => { setType("audit"); load("audit", 1); }}>لاگ سیستم</button>
        <button className={type === "request" ? "btn-primary" : "btn-outline"} onClick={() => { setType("request"); load("request", 1); }}>لاگ درخواست‌ها</button>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>زمان</th>
              <th>کاربر</th>
              <th>نقش</th>
              <th>عملیات</th>
              <th>جزئیات</th>
            </tr>
          </thead>
          <tbody>
            {list.map((l) => (
              <tr key={l._id}>
                <td>{formatDateTime(l.createdAt)}</td>
                <td>{l.actorPersonnelCode || l.actorName}</td>
                <td>{ROLE_LABELS[l.actorRole] || l.actorRole}</td>
                <td>{l.action}</td>
                <td className="max-w-md truncate">{l.comment || JSON.stringify(l.detail || l.extra || {})}</td>
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
        onPage={(p) => load(type, p, limit)}
        onLimit={(l) => load(type, 1, l)}
      />
    </div>
  );
}
