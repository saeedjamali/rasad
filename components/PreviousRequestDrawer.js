"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import Timeline from "@/components/Timeline";
import StatusBadge from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/dates";

export default function PreviousRequestDrawer({ item }) {
  const [logs, setLogs] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onToggle(e) {
    if (!e.currentTarget.open || logs || busy) return;
    setBusy(true);
    try {
      const d = await api(`/api/requests/${item._id}`);
      setLogs(d.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="card overflow-hidden" onToggle={onToggle}>
      <summary className="cursor-pointer list-none p-4 flex flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        <div className="space-y-1">
          <div className="font-medium text-sm">{item.title || `درخواست ${item.trackingCode}`}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>کد پیگیری: {item.trackingCode}</span>
            <span>{formatDateTime(item.updatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} result={item.result} forUser />
          <span className="text-xs text-slate-500">مشاهده گردش کار</span>
        </div>
      </summary>
      <div className="border-t px-4 py-3">
        {busy && logs === null ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : null}
        {logs ? <Timeline logs={logs} forUser /> : null}
      </div>
    </details>
  );
}
