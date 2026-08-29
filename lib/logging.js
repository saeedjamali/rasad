import RequestLog from "@/models/RequestLog";
import AuditLog from "@/models/AuditLog";
import User from "@/models/User";
import { ACTION_LABELS, ENTITY_LABELS, ROLE_LABELS, STATUS_LABELS } from "./constants";
import { escapeRegex, toEnglishDigits } from "./identity";

function labelHits(map, q, rx) {
  return Object.entries(map)
    .filter(([k, v]) => k.includes(q) || String(v).includes(q) || rx.test(k) || rx.test(String(v)))
    .map(([k]) => k);
}

export function logSearchFilter(q, type) {
  const text = toEnglishDigits(q).trim();
  if (!text) return {};
  const rx = new RegExp(escapeRegex(text), "i");
  const actionHits = labelHits(ACTION_LABELS, text, rx);
  const roleHits = labelHits(ROLE_LABELS, text, rx);
  const statusHits = labelHits(STATUS_LABELS, text, rx);
  const or = [
    { actorPersonnelCode: rx },
    { actorMobile: rx },
    { actorRole: rx },
    { action: rx },
    ...(actionHits.length ? [{ action: { $in: actionHits } }] : []),
    ...(roleHits.length ? [{ actorRole: { $in: roleHits } }] : []),
  ];
  if (type === "request") {
    or.push({ actorName: rx }, { comment: rx }, { fromStatus: rx }, { toStatus: rx });
    if (statusHits.length) {
      or.push({ fromStatus: { $in: statusHits } }, { toStatus: { $in: statusHits } });
    }
  } else {
    const entityHits = labelHits(ENTITY_LABELS, text, rx);
    or.push({ entity: rx }, { entityId: rx }, { ip: rx });
    if (entityHits.length) or.push({ entity: { $in: entityHits } });
  }
  return { $or: or };
}

export async function fillActorMobiles(list) {
  if (!list?.length) return list;
  const need = list.filter((l) => !l.actorMobile && (l.actorUserId || l.actorPersonnelCode));
  if (!need.length) return list;
  const ids = [...new Set(need.map((l) => (l.actorUserId ? String(l.actorUserId) : "")).filter(Boolean))];
  const codes = [...new Set(need.map((l) => l.actorPersonnelCode).filter(Boolean))];
  const clauses = [];
  if (ids.length) clauses.push({ _id: { $in: ids } });
  if (codes.length) clauses.push({ personnelCode: { $in: codes } });
  if (!clauses.length) return list;
  const users = await User.find(clauses.length === 1 ? clauses[0] : { $or: clauses })
    .select("_id personnelCode mobile")
    .lean();
  const byId = Object.fromEntries(users.map((u) => [String(u._id), u.mobile]));
  const byCode = Object.fromEntries(users.map((u) => [u.personnelCode, u.mobile]));
  return list.map((l) => {
    if (l.actorMobile) return l;
    return {
      ...l,
      actorMobile: (l.actorUserId && byId[String(l.actorUserId)]) || byCode[l.actorPersonnelCode] || "",
    };
  });
}

export async function addRequestLog({
  request,
  action,
  fromStatus,
  toStatus,
  user,
  role,
  comment = "",
  attachments = [],
  visibleToUser = false,
  visibleToProvinceOnly = false,
  visibleToDistrictOnly = false,
  extra = {},
}) {
  return RequestLog.create({
    requestId: request._id,
    action,
    fromStatus,
    toStatus,
    actorUserId: user?._id,
    actorRole: role,
    actorPersonnelCode: user?.personnelCode,
    actorMobile: user?.mobile,
    actorName: user?.fullName || user?.personnelCode,
    comment,
    attachments,
    visibleToUser,
    visibleToProvinceOnly,
    visibleToDistrictOnly,
    extra,
  });
}

export async function addAudit(session, action, entity, entityId, detail = {}, ip) {
  return AuditLog.create({
    actorUserId: session?.userId,
    actorPersonnelCode: session?.personnelCode,
    actorMobile: session?.mobile || "",
    actorRole: session?.activeRole,
    action,
    entity,
    entityId: entityId ? String(entityId) : "",
    detail,
    ip,
  });
}

export function logVisibleFor(log, session) {
  const role = session?.activeRole;
  if (log.visibleToDistrictOnly) {
    return role === "district_transfer" || role === "admin";
  }
  if (role === "admin" || role === "province_transfer") return true;
  if (log.visibleToProvinceOnly) {
    return ["province_transfer", "admin"].includes(role);
  }
  if (role === "personnel") return log.visibleToUser;
  return true;
}

export function redactRequestSecrets(item, role) {
  if (!item) return item;
  if (role === "district_transfer" || role === "admin") return item;
  const next = { ...item };
  delete next.districtInquiryNote;
  return next;
}
