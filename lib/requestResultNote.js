import Request from "@/models/Request";
import RequestLog from "@/models/RequestLog";
import { STATUSES } from "./constants";
import { isUserResultNote } from "./requestDisplay";

export async function attachMissingResultNotes(items) {
  const list = items || [];
  const need = list.filter(
    (r) => r.status === STATUSES.REVIEW_RESULT && !isUserResultNote(r.resultNote)
  );
  if (!need.length) return list;
  const logs = await RequestLog.find({
    requestId: { $in: need.map((r) => r._id) },
    visibleToUser: true,
    $or: [
      { action: { $in: ["approve", "reject", "admin_set_status"] } },
      { toStatus: STATUSES.REVIEW_RESULT },
    ],
  })
    .sort({ createdAt: -1 })
    .select("requestId comment")
    .lean();
  const latest = new Map();
  for (const log of logs) {
    const key = String(log.requestId);
    if (latest.has(key) || !isUserResultNote(log.comment)) continue;
    latest.set(key, String(log.comment).trim());
  }
  const writes = [];
  for (const item of need) {
    const note = latest.get(String(item._id));
    if (!note) continue;
    item.resultNote = note;
    writes.push({
      updateOne: { filter: { _id: item._id }, update: { $set: { resultNote: note } } },
    });
  }
  if (writes.length) await Request.bulkWrite(writes);
  return list;
}
