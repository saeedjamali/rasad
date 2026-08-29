"use client";

import { formatDateTime } from "@/lib/dates";
import { ACTION_LABELS, RESULT_LABELS, ROLE_LABELS, STATUSES, statusLabel } from "@/lib/constants";
import { AttachmentPreview } from "@/components/AttachmentPreview";

function logDecision(log) {
  if (log.action === "approve") return "approved";
  if (log.action === "reject") return "rejected";
  const extra = log.extra || {};
  if (extra.result === "approved" || extra.result === "rejected") return extra.result;
  if (extra.opinion === "approve" || extra.opinion === "approved") return "approved";
  if (extra.opinion === "reject" || extra.opinion === "rejected") return "rejected";
  if (extra.opinion === "agree") return "agree";
  if (extra.opinion === "disagree") return "disagree";
  return "";
}

function actionLabel(log, forUser, showExactDecision) {
  if (forUser && (log.action === "approve" || log.action === "reject")) return "بررسی نهایی";
  if (showExactDecision) {
    const decision = logDecision(log);
    if (
      decision &&
      RESULT_LABELS[decision] &&
      ["approve", "reject", "district_send", "planning_opinion", "admin_set_status"].includes(log.action)
    ) {
      return RESULT_LABELS[decision];
    }
  }
  return ACTION_LABELS[log.action] || log.action;
}

function logStatusText(log, forUser, showExactDecision) {
  if (!log.toStatus && !log.fromStatus && !(showExactDecision && logDecision(log))) return "";
  if (forUser || !showExactDecision) {
    const to = log.toStatus ? statusLabel(log.toStatus, "", forUser) : "";
    if (log.fromStatus && log.toStatus && log.fromStatus !== log.toStatus) {
      return `از «${statusLabel(log.fromStatus, "", forUser)}» به «${to}»`;
    }
    return to;
  }
  const decision = logDecision(log);
  const decisionLabel = decision ? RESULT_LABELS[decision] : "";
  const to = log.toStatus ? statusLabel(log.toStatus, decision, false) : "";
  if (log.fromStatus && log.toStatus && log.fromStatus !== log.toStatus) {
    const from = statusLabel(log.fromStatus, "", false);
    const showDecisionAsTo =
      decisionLabel &&
      (log.toStatus === STATUSES.REVIEW_RESULT ||
        log.action === "district_send" ||
        log.action === "planning_opinion");
    return `از «${from}» به «${showDecisionAsTo ? decisionLabel : to}»`;
  }
  return decisionLabel || to;
}

function decisionTone(decision, showExactDecision) {
  if (!showExactDecision || !decision) {
    return {
      action: "text-slate-700",
      status: "text-slate-600",
      word: "",
      dot: "bg-[#c9a227]",
      card: "",
    };
  }
  if (decision === "approved" || decision === "agree") {
    return {
      action: "rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 font-semibold",
      status: "text-emerald-800",
      word: "text-emerald-800 font-semibold",
      dot: "bg-emerald-600",
      card: "border-emerald-300 !bg-emerald-50",
    };
  }
  if (decision === "rejected" || decision === "disagree") {
    return {
      action: "rounded-full bg-red-100 text-red-800 px-2 py-0.5 font-semibold",
      status: "text-red-800",
      word: "text-red-800 font-semibold",
      dot: "bg-red-600",
      card: "border-red-300 !bg-red-50",
    };
  }
  return {
    action: "text-slate-700",
    status: "text-slate-600",
    word: "",
    dot: "bg-[#c9a227]",
    card: "",
  };
}

function StatusLine({ text, decision, tone }) {
  if (!text) return null;
  const label = decision ? RESULT_LABELS[decision] : "";
  if (label && text.includes(label) && tone.word) {
    const parts = text.split(label);
    return (
      <p className={`mt-1 text-xs ${tone.status}`}>
        وضعیت:{" "}
        {parts.map((part, i) => (
          <span key={`${part}-${i}`}>
            {part}
            {i < parts.length - 1 ? <span className={tone.word}>{label}</span> : null}
          </span>
        ))}
      </p>
    );
  }
  return <p className={`mt-1 text-xs ${tone.status}`}>وضعیت: {text}</p>;
}

export default function Timeline({ logs, forUser, showExactDecision = false }) {
  if (!logs?.length) return <p className="text-sm text-slate-500">گردش کاری ثبت نشده است.</p>;
  return (
    <ol className="relative border-s border-slate-200 ms-3 space-y-4">
      {logs.map((l) => {
        const statusText = logStatusText(l, forUser, showExactDecision);
        const decision = showExactDecision ? logDecision(l) : "";
        const tone = decisionTone(decision, showExactDecision);
        return (
          <li key={l._id} className="ms-4">
            <span className={`absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full ${tone.dot}`} />
            <div className={`card p-3 ${tone.card}`}>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{formatDateTime(l.createdAt)}</span>
                <span>{l.actorName || l.actorPersonnelCode}</span>
                <span>{ROLE_LABELS[l.actorRole] || l.actorRole}</span>
                <span className={tone.action}>{actionLabel(l, forUser, showExactDecision)}</span>
              </div>
              <StatusLine text={statusText} decision={decision} tone={tone} />
              {l.comment ? <p className="mt-2 text-sm whitespace-pre-wrap">{l.comment}</p> : null}
              {l.attachments?.length ? <AttachmentPreview files={l.attachments} compact /> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
