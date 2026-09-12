import { REVIEW_RESULT_USER_MESSAGE, STATUSES } from "@/lib/constants";
import { requestResultNote } from "@/lib/requestDisplay";

export default function FinalResultNote({ item, logs, showProcessMessage = true }) {
  if (!item || item.status !== STATUSES.REVIEW_RESULT) return null;
  const note = requestResultNote(item, logs);
  return (
    <div className="space-y-2">
      {showProcessMessage ? <p className="text-sm">{REVIEW_RESULT_USER_MESSAGE}</p> : null}
      {note ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-950 whitespace-pre-wrap">
          <div className="text-xs font-bold text-sky-900 mb-1">توضیحات بررسی نهایی</div>
          {note}
        </div>
      ) : null}
    </div>
  );
}
