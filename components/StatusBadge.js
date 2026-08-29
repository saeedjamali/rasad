"use client";

import { STATUS_LABELS, STATUS_USER_LABELS } from "@/lib/constants";

const colors = {
  WAITING_PROVINCE_REVIEW: "bg-amber-100 text-amber-800",
  IN_REVIEW_PROVINCE: "bg-sky-100 text-sky-800",
  INQUIRY_DISTRICT: "bg-indigo-100 text-indigo-800",
  INQUIRY_PLANNING: "bg-violet-100 text-violet-800",
  INQUIRY_RESPONSE_WAITING_PROVINCE: "bg-cyan-100 text-cyan-800",
  REVIEW_RESULT: "bg-slate-200 text-slate-800",
  RETURNED_TO_USER: "bg-orange-100 text-orange-800",
};

export default function StatusBadge({ status, result, forUser }) {
  const map = forUser ? STATUS_USER_LABELS : STATUS_LABELS;
  const label = map[status] || status;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs ${colors[status] || "bg-slate-100"}`}>
      {label}
    </span>
  );
}
