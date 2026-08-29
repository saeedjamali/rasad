"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import {
  APPLICANT_EXTRA_GROUPS,
  APPLICANT_FIELDS,
  PERSONNEL_MAIN_FIELDS,
  PERSONNEL_VISIBLE_FIELDS,
  REVIEW_RESULT_USER_MESSAGE,
  ROLE_LABELS,
  STATUSES,
} from "@/lib/constants";
import AnnouncementDates from "@/components/AnnouncementDates";
import ZoomableImage from "@/components/ZoomableImage";
import StatusBadge from "@/components/StatusBadge";
import { applicantRegionValue } from "@/components/RegionSelect";

const fieldLabel = Object.fromEntries(APPLICANT_FIELDS);
const mainFieldSet = new Set(PERSONNEL_MAIN_FIELDS);
const detailGroups = APPLICANT_EXTRA_GROUPS.map((group) => ({
  ...group,
  keys: group.keys.filter((k) => PERSONNEL_VISIBLE_FIELDS.includes(k) && !mainFieldSet.has(k)),
})).filter((group) => group.keys.length);

function FieldCard({ fieldKey, applicant }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-500">{fieldLabel[fieldKey]}</div>
      <div className="mt-1">{applicantRegionValue(applicant, fieldKey) || "—"}</div>
    </div>
  );
}

export default function AppHome() {
  const [me, setMe] = useState(null);
  const [applicant, setApplicant] = useState(null);
  const [news, setNews] = useState([]);
  const [request, setRequest] = useState(null);
  const [allowNewRequestAfterFinal, setAllowNewRequestAfterFinal] = useState(false);
  const [reports, setReports] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    api("/api/auth/me").then((d) => {
      setMe(d.user);
      if (d.user?.roles?.includes("personnel") || d.user?.activeRole === "personnel") {
        api("/api/applicants/me").then((a) => setApplicant(a.item));
        api("/api/requests").then((r) => {
          const items = r.list || [];
          setRequest(items.find((x) => x.status !== STATUSES.REVIEW_RESULT) || items[0] || null);
          setAllowNewRequestAfterFinal(Boolean(r.allowNewRequestAfterFinal));
        });
      }
      if (["hr_manager", "director_general", "admin", "province_transfer"].includes(d.user?.activeRole)) {
        api("/api/reports").then(setReports).catch(() => {});
      }
    });
    api("/api/announcements").then((d) => setNews(d.list || []));
  }, []);

  const role = me?.activeRole;
  const isPersonnel = role === "personnel";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">صفحه اصلی</h1>
        <p className="text-slate-500 text-sm">سامانه رصد و پایش درخواست‌های انتقال</p>
      </div>

      {reports && (
        <section className="grid md:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className="text-xs text-slate-500">کل درخواست‌ها</div>
            <div className="text-2xl font-bold">{reports.total}</div>
          </div>
          {reports.byStatus?.slice(0, 3).map((s) => (
            <div key={s.status} className="card p-4">
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="text-2xl font-bold">{s.count}</div>
            </div>
          ))}
        </section>
      )}

      {news.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold">اطلاعیه‌ها</h2>
          {news.map((n) => (
            <div key={n._id} className="card p-4 border-r-4 border-r-[#c9a227]">
              <div className="font-medium">{n.title}</div>
              <AnnouncementDates item={n} />
              <p className="text-xs text-slate-500 mt-0.5">
                مخاطب: {!n.roles?.length ? "همه نقش‌ها" : n.roles.map((r) => ROLE_LABELS[r] || r).join("، ")}
              </p>
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{n.body}</p>
              {n.imageUrl ? (
                <ZoomableImage
                  src={n.imageUrl}
                  alt={n.imageName || n.title || ""}
                  className="max-h-56 w-full rounded-lg object-contain bg-slate-50"
                />
              ) : null}
            </div>
          ))}
        </section>
      )}

      {isPersonnel && (
        <section className="space-y-4">
          <h2 className="font-bold">اطلاعات متقاضی</h2>
          {!applicant ? (
            <div className="card p-4 text-sm">رکورد متقاضی برای این کد پرسنلی یافت نشد.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                {PERSONNEL_MAIN_FIELDS.map((k) => (
                  <FieldCard key={k} fieldKey={k} applicant={applicant} />
                ))}
              </div>
              <div>
                <button type="button" className="btn-outline" onClick={() => setShowDetails((v) => !v)}>
                  {showDetails ? "بستن جزئیات" : "مشاهده جزئیات"}
                </button>
                {showDetails ? (
                  <div className="mt-4 space-y-5">
                    {detailGroups.map((group) => (
                      <div key={group.title}>
                        <h3 className="text-sm font-medium text-slate-600 mb-2">{group.title}</h3>
                        <div className="grid md:grid-cols-3 gap-3">
                          {group.keys.map((k) => (
                            <FieldCard key={k} fieldKey={k} applicant={applicant} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">
                    جنسیت، وضعیت تاهل، نوع استخدام و بقیه فیلدها در جزئیات هستند.
                  </p>
                )}
              </div>
            </div>
          )}

          {request ? (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{request.title || `گردش کار درخواست ${request.trackingCode}`}</div>
                  {request.title ? (
                    <div className="text-xs text-slate-500">کد پیگیری: {request.trackingCode}</div>
                  ) : null}
                  <StatusBadge status={request.status} result={request.result} forUser />
                </div>
                <Link href={`/app/request`} className="btn-primary">
                  مشاهده / پیگیری
                </Link>
              </div>
              {request.status === STATUSES.REVIEW_RESULT && (
                <p className="text-sm text-slate-600">{REVIEW_RESULT_USER_MESSAGE}</p>
              )}
              {request.status === STATUSES.REVIEW_RESULT && allowNewRequestAfterFinal ? (
                <div className="flex justify-end">
                  <Link href="/app/request" className="btn-gold inline-flex">
                    ثبت درخواست جدید
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex justify-end pt-2">
              <Link href="/app/request" className="btn-gold inline-flex">
                ثبت درخواست
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
