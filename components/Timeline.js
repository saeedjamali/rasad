"use client";

import { formatDateTime } from "@/lib/dates";
import { ACTION_LABELS, ROLE_LABELS, statusLabel } from "@/lib/constants";
import { AttachmentPreview } from "@/components/AttachmentPreview";

function actionLabel(action, forUser) {
  if (forUser && (action === "approve" || action === "reject")) return "بررسی نهایی";
  return ACTION_LABELS[action] || action;
}

function logStatusText(log, forUser) {
  if (!log.toStatus && !log.fromStatus) return "";
  const to = log.toStatus ? statusLabel(log.toStatus, "", forUser) : "";
  if (log.fromStatus && log.toStatus && log.fromStatus !== log.toStatus) {
    return `از «${statusLabel(log.fromStatus, "", forUser)}» به «${to}»`;
  }
  return to;
}

export default function Timeline({ logs, forUser }) {
  if (!logs?.length) return <p className="text-sm text-slate-500">گردش کاری ثبت نشده است.</p>;
  return (
    <ol className="relative border-s border-slate-200 ms-3 space-y-4">
      {logs.map((l) => {
        const statusText = logStatusText(l, forUser);
        return (
          <li key={l._id} className="ms-4">
            <span className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full bg-[#c9a227]" />
            <div className="card p-3">
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{formatDateTime(l.createdAt)}</span>
                <span>{l.actorName || l.actorPersonnelCode}</span>
                <span>{ROLE_LABELS[l.actorRole] || l.actorRole}</span>
                <span className="text-slate-700">{actionLabel(l.action, forUser)}</span>
              </div>
              {statusText ? <p className="mt-1 text-xs text-slate-600">وضعیت: {statusText}</p> : null}
              {l.comment ? <p className="mt-2 text-sm whitespace-pre-wrap">{l.comment}</p> : null}
              {l.attachments?.length ? <AttachmentPreview files={l.attachments} compact /> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
