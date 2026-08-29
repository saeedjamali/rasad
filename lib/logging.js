import RequestLog from "@/models/RequestLog";
import AuditLog from "@/models/AuditLog";

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
