"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/dates";
import { ROLE_LABELS } from "@/lib/constants";
import { formatLogDetails, logActionLabel } from "@/lib/logDisplay";
import Pagination from "@/components/Pagination";
import { usePagedList } from "@/lib/usePagedList";

export default function LogsPage() {
  const [type, setType] = useState("audit");
  const [q, setQ] = useState("");
  const [stats, setStats] = useState(null);
  const { list, page, limit, total, pages, apply } = usePagedList();

  async function load(t = type, nextPage = page, nextLimit = limit, query = q) {
    const sp = new URLSearchParams();
    sp.set("type", t);
    if (query) sp.set("q", query);
    sp.set("page", String(nextPage));
    sp.set("limit", String(nextLimit));
    const d = await api(`/api/logs?${sp}`);
    if (!(d.list || []).length && (d.page || nextPage) > 1) {
      return load(t, (d.page || nextPage) - 1, nextLimit, query);
    }
    apply(d, nextPage, nextLimit);
    setStats(d.stats || null);
  }

  function filterByAction(action) {
    setQ(action);
    load(type, 1, limit, action);
  }
  useEffect(() => {
    load("audit", 1);
  }, []);

  function switchType(next) {
    setType(next);
    load(next, 1);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">لاگ‌ها</h1>
      <div className="flex gap-2">
        <button className={type === "audit" ? "btn-primary" : "btn-outline"} onClick={() => switchType("audit")}>
          لاگ سیستم
        </button>
        <button className={type === "request" ? "btn-primary" : "btn-outline"} onClick={() => switchType("request")}>
          لاگ درخواست‌ها
        </button>
      </div>
      <form
        className="flex flex-wrap gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          load(type, 1);
        }}
      >
        <label className="text-sm">
          جستجو
          <input
            className="input mt-1 min-w-56 md:min-w-80"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              type === "request"
                ? "کد پرسنلی، نام، موبایل، عملیات، توضیح، کد پیگیری"
                : "کد پرسنلی، موبایل، نقش، عملیات، موجودیت، آی‌پی"
            }
          />
        </label>
        <button className="btn-primary" type="submit">
          جستجو
        </button>
        {q ? (
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setQ("");
              load(type, 1, limit, "");
            }}
          >
            پاک کردن فیلتر
          </button>
        ) : null}
      </form>
      {stats ? (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="card p-4">
              <div className="text-xs text-slate-500">کل عملیات</div>
              <div className="text-2xl font-bold mt-1">{total}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">عملیات امروز</div>
              <div className="text-2xl font-bold mt-1">{stats.today}</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">کاربران یکتا</div>
              <div className="text-2xl font-bold mt-1">{stats.users}</div>
            </div>
          </div>
          <div className="card p-4">
            <h2 className="font-bold mb-3">آمار عملیات</h2>
            {stats.byAction?.length ? (
              <div className="space-y-3 max-h-80 overflow-auto">
                {stats.byAction.map((row) => {
                  const pct = total ? Math.round((row.count / total) * 100) : 0;
                  const label = logActionLabel(row.action);
                  return (
                    <button
                      key={row.action || "empty"}
                      type="button"
                      className="w-full text-start"
                      onClick={() => filterByAction(row.action)}
                    >
                      <div className="flex justify-between gap-3 text-sm mb-1">
                        <span>
                          {label}
                          {label !== row.action ? (
                            <span className="text-slate-400 text-xs ms-2" dir="ltr">
                              {row.action}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-slate-600">
                          {row.count}
                          <span className="text-slate-400"> ({pct}٪)</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-[#0f3d5f]"
                          style={{ width: `${Math.max(pct, row.count ? 2 : 0)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">عملیاتی برای نمایش آمار نیست.</p>
            )}
            <p className="text-xs text-slate-400 mt-3">برای دیدن جزئیات هر عملیات، روی آن کلیک کنید.</p>
          </div>
        </div>
      ) : null}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>زمان</th>
              <th>کاربر</th>
              <th>شماره همراه</th>
              <th>نقش</th>
              <th>عملیات</th>
              <th>جزئیات</th>
            </tr>
          </thead>
          <tbody>
            {list.length ? (
              list.map((l) => {
                const actionFa = logActionLabel(l.action);
                return (
                <tr key={l._id}>
                  <td>{formatDateTime(l.createdAt)}</td>
                  <td>{l.actorPersonnelCode || l.actorName}</td>
                  <td dir="ltr">{l.actorMobile || "—"}</td>
                  <td>{ROLE_LABELS[l.actorRole] || l.actorRole}</td>
                  <td>
                    <div>{actionFa}</div>
                    {actionFa !== l.action ? (
                      <div className="text-xs text-slate-400 mt-0.5" dir="ltr">
                        {l.action}
                      </div>
                    ) : null}
                  </td>
                  <td className="max-w-lg">
                    <div className="whitespace-pre-wrap leading-6">{formatLogDetails(l)}</div>
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center text-slate-500 py-8">
                  موردی یافت نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pages={pages}
        total={total}
        limit={limit}
        onPage={(p) => load(type, p, limit)}
        onLimit={(l) => load(type, 1, l)}
      />
    </div>
  );
}
