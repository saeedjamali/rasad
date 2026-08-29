import { formatDate } from "@/lib/dates";

export default function AnnouncementDates({ item }) {
  return (
    <p className="text-xs text-slate-500 mt-1">
      تاریخ ثبت: {formatDate(item.publishedAt || item.createdAt)}
      {" · "}
      تاریخ اعتبار: {item.expiresAt ? formatDate(item.expiresAt) : "بدون محدودیت"}
    </p>
  );
}
