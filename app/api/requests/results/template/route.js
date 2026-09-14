import { requireUser } from "@/lib/auth";
import { workbookToBuffer } from "@/lib/excel";
import { ROLES } from "@/lib/constants";
import { requestImportStatusOptions } from "@/lib/requestAdminStatus";

export async function GET() {
  const { error } = await requireUser([ROLES.admin]);
  if (error) return error;
  const statuses = requestImportStatusOptions();
  const buf = workbookToBuffer([
    {
      name: "نتایج",
      aoa: [["کد پرسنلی", "وضعیت درخواست", "توضیحات", "مقصد نهایی منتقل شده"]],
      cols: [{ wch: 18 }, { wch: 48 }, { wch: 40 }, { wch: 28 }],
    },
    {
      name: "وضعیت‌های مجاز",
      rows: statuses.map((s) => ({
        "وضعیت درخواست": s.label,
        توضیح:
          s.result === "approved"
            ? `${s.note}. ستون مقصد نهایی منتقل‌شده فقط برای این وضعیت نمایش داده می‌شود.`
            : s.note,
      })),
      cols: [{ wch: 52 }, { wch: 64 }],
    },
  ]);
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=request-results-template.xlsx",
    },
  });
}
