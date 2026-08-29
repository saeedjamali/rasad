"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import {
  APPLICANT_EXTRA_GROUPS,
  APPLICANT_FIELDS,
  PERSONNEL_MAIN_FIELDS,
  trackerLabel,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import { applicantRegionValue } from "@/components/RegionSelect";
import { AttachmentPreview } from "@/components/AttachmentPreview";
import StatusBadge from "@/components/StatusBadge";
import Timeline from "@/components/Timeline";
import Feedback from "@/components/Feedback";

const fieldLabel = Object.fromEntries(APPLICANT_FIELDS);
const mainSet = new Set(PERSONNEL_MAIN_FIELDS);

function Field({ fieldKey, applicant }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{fieldLabel[fieldKey] || fieldKey}</div>
      <div className="mt-0.5 text-sm">{applicantRegionValue(applicant, fieldKey) || "—"}</div>
    </div>
  );
}

export default function ReportLookup() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [data, setData] = useState(null);
  const [showExtra, setShowExtra] = useState(false);

  async function search(e) {
    e.preventDefault();
    setMsg("");
    setData(null);
    setShowExtra(false);
    const query = q.trim();
    if (!query) {
      setMsg("کد پرسنلی یا شماره همراه را وارد کنید");
      return;
    }
    setBusy(true);
    try {
      const d = await api(`/api/reports/lookup?q=${encodeURIComponent(query)}`);
      setData(d);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  const applicant = data?.applicant;
  const requests = data?.requests || [];

  return (
    <section className="card overflow-hidden border-s-4 border-s-[#c9a227]">
      <div className="border-b bg-slate-50 px-5 py-4">
        <h2 className="font-bold text-lg">جستجوی پرونده پرسنل</h2>
        <p className="text-sm text-slate-500 mt-1">
          با کد پرسنلی یا شماره همراه، اطلاعات متقاضی، درخواست‌ها و کل گردش کار را ببینید.
        </p>
      </div>
      <div className="p-5 space-y-5">
        <form onSubmit={search} className="flex flex-wrap gap-2">
          <input
            className="input max-w-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="کد پرسنلی یا شماره همراه"
            dir="ltr"
          />
          <button className="btn-primary" disabled={busy}>
            {busy ? "در حال جستجو..." : "جستجو"}
          </button>
        </form>
        <Feedback message={msg} type="error" />

        {applicant ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-bold">اطلاعات متقاضی</h3>
              <span className="text-xs text-slate-500">
                {applicant.firstName || ""} {applicant.lastName || ""}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {PERSONNEL_MAIN_FIELDS.map((k) => (
                <Field key={k} fieldKey={k} applicant={applicant} />
              ))}
            </div>
            <button type="button" className="btn-outline" onClick={() => setShowExtra((v) => !v)}>
              {showExtra ? "بستن اطلاعات کامل" : "مشاهده اطلاعات کامل متقاضی"}
            </button>
            {showExtra
              ? APPLICANT_EXTRA_GROUPS.map((group) => {
                  const keys = group.keys.filter((k) => !mainSet.has(k));
                  if (!keys.length) return null;
                  return (
                    <div key={group.title}>
                      <h4 className="text-sm font-medium text-slate-600 mb-2">{group.title}</h4>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {keys.map((k) => (
                          <Field key={k} fieldKey={k} applicant={applicant} />
                        ))}
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
        ) : null}

        {data && !requests.length ? (
          <p className="text-sm text-slate-500">برای این فرد درخواستی ثبت نشده است.</p>
        ) : null}

        {requests.map(({ item, logs, tracker }) => (
          <article key={item._id} className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 bg-slate-50 px-4 py-3">
              <div className="space-y-1">
                <div className="font-medium">{item.title || `درخواست ${item.trackingCode}`}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>کد پیگیری: {item.trackingCode}</span>
                  <span>{formatDateTime(item.updatedAt)}</span>
                  <span>پیگیری‌کننده: {tracker || trackerLabel(item)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={item.status} result={item.result} />
                <Link className="btn-outline" href={`/app/requests/${item._id}`}>
                  مشاهده درخواست
                </Link>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {item.categoryTitle ? <p className="text-sm">دسته‌بندی: {item.categoryTitle}</p> : null}
              {item.subcategoryTitles?.length ? (
                <p className="text-sm">زیر‌دسته: {item.subcategoryTitles.join("، ")}</p>
              ) : null}
              {item.proposedRegionLabel || item.proposedDistrictCode ? (
                <p className="text-sm">
                  مقصد پیشنهادی: {item.proposedRegionLabel || item.proposedDistrictName || item.proposedDistrictCode}
                </p>
              ) : null}
              {item.assignedRegionLabel || item.assignedDistrictCode ? (
                <p className="text-sm">
                  منطقه استعلام / ارجاع: {item.assignedRegionLabel || item.assignedDistrictName || item.assignedDistrictCode}
                </p>
              ) : null}
              {item.description ? (
                <p className="text-sm whitespace-pre-wrap text-slate-700">{item.description}</p>
              ) : null}
              {item.attachments?.length ? <AttachmentPreview files={item.attachments} compact /> : null}
              <div>
                <h4 className="font-medium text-sm mb-2">گردش کار</h4>
                <Timeline
                  logs={logs}
                  showExactDecision
                  assignedRegionLabel={item.assignedRegionLabel || item.assignedDistrictName || ""}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
