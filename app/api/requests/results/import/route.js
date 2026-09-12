import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, json, clientIp } from "@/lib/http";
import { addAudit, addRequestLog } from "@/lib/logging";
import { mapRequestResultRow, sheetToJsonByName, workbookFromBuffer } from "@/lib/excel";
import { ROLES, STATUSES } from "@/lib/constants";
import { validatePersonnelCode } from "@/lib/identity";
import { districtLogFields } from "@/lib/regions";
import {
  applyAdminRequestStatus,
  notifyIfFinalReview,
  parseRequestResultStatus,
} from "@/lib/requestAdminStatus";
import Request from "@/models/Request";

const MAX_ROWS = 1000;

async function findTargetRequest(personnelCode) {
  const items = await Request.find({ personnelCode }).sort({ updatedAt: -1 });
  if (!items.length) return null;
  return items.find((r) => r.status !== STATUSES.REVIEW_RESULT) || items[0];
}

export async function POST(req) {
  const { user, session, role, error } = await requireUser([ROLES.admin]);
  if (error) return error;
  await connectDB();
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return fail("فایل اکسل ارسال نشده");
  let rows = [];
  try {
    rows = sheetToJsonByName(workbookFromBuffer(Buffer.from(await file.arrayBuffer())), ["نتایج"]);
  } catch {
    return fail("فایل اکسل معتبر نیست");
  }
  if (rows.length > MAX_ROWS) {
    return fail(`حداکثر ${MAX_ROWS} ردیف در هر بارگذاری مجاز است`);
  }

  let updated = 0;
  let skipped = 0;
  let smsSent = 0;
  let smsFailed = 0;
  const errors = [];
  const warnings = [];
  const seen = new Map();

  for (let i = 0; i < rows.length; i++) {
    const rowNo = i + 2;
    const data = mapRequestResultRow(rows[i]);
    if (!data.personnelCode && !data.statusText && !data.comment) {
      skipped += 1;
      continue;
    }
    const idCheck = validatePersonnelCode(data.personnelCode);
    if (!idCheck.ok) {
      errors.push(`ردیف ${rowNo}: ${idCheck.message}`);
      continue;
    }
    const parsed = parseRequestResultStatus(data.statusText);
    if (parsed.error) {
      errors.push(`ردیف ${rowNo}: ${parsed.error}`);
      continue;
    }
    const comment = String(data.comment || "").trim();
    if (parsed.status === STATUSES.REVIEW_RESULT && !comment) {
      errors.push(`ردیف ${rowNo}: برای تایید یا رد درخواست، ستون توضیحات الزامی است`);
      continue;
    }
    if (seen.has(idCheck.value)) {
      warnings.push(`ردیف ${rowNo}: کد پرسنلی تکراری است؛ آخرین ردیف برای ${idCheck.value} اعمال شد`);
    }
    seen.set(idCheck.value, { rowNo, parsed, comment });
  }

  for (const [personnelCode, row] of seen) {
    try {
      const item = await findTargetRequest(personnelCode);
      if (!item) {
        errors.push(`ردیف ${row.rowNo}: درخواستی با کد پرسنلی ${personnelCode} یافت نشد`);
        continue;
      }
      const from = item.status;
      const applied = applyAdminRequestStatus(item, {
        next: row.parsed.status,
        result: row.parsed.result,
        userId: user._id,
        comment: row.comment,
      });
      if (applied.error) {
        errors.push(`ردیف ${row.rowNo}: ${applied.error}`);
        continue;
      }
      await item.save();
      await addRequestLog({
        request: item,
        action: "admin_set_status",
        fromStatus: from,
        toStatus: item.status,
        user,
        role,
        comment: row.comment || "تغییر وضعیت گروهی توسط مدیر سیستم",
        visibleToUser: true,
        extra: {
          result: item.result,
          bulk: true,
          ...(item.assignedDistrictCode
            ? districtLogFields({
                districtCode: item.assignedDistrictCode,
                districtName: item.assignedDistrictName,
              })
            : {}),
        },
      });
      updated += 1;
      const sms = await notifyIfFinalReview(item, from);
      if (sms.attempted && sms.sent) smsSent += 1;
      if (sms.attempted && !sms.sent) {
        smsFailed += 1;
        errors.push(`ردیف ${row.rowNo}: وضعیت ذخیره شد ولی پیامک بررسی نهایی ارسال نشد${sms.message ? ` (${sms.message})` : ""}`);
      }
    } catch (e) {
      errors.push(`ردیف ${row.rowNo}: ${e.message}`);
    }
  }

  await addAudit(
    session,
    "request_results_import",
    "Request",
    "",
    { updated, skipped, smsSent, smsFailed, errors: errors.length },
    clientIp(req)
  );
  return json({ created: 0, updated, skipped, smsSent, smsFailed, errors, warnings });
}
