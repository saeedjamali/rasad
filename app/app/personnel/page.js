"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import ExcelImport from "@/components/ExcelImport";
import RegionSelect from "@/components/RegionSelect";
import Pagination from "@/components/Pagination";
import { usePagedList } from "@/lib/usePagedList";
import { validatePersonnelCode } from "@/lib/identity";

const empty = {
  personnelCode: "",
  firstName: "",
  lastName: "",
  districtCode: "",
};

export default function PersonnelPage() {
  const { list, page, limit, total, pages, apply } = usePagedList();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(nextPage = page, nextLimit = limit) {
    const d = await api(
      `/api/personnel?q=${encodeURIComponent(q)}&page=${nextPage}&limit=${nextLimit}`
    );
    if (!(d.list || []).length && (d.page || nextPage) > 1) {
      return load((d.page || nextPage) - 1, nextLimit);
    }
    apply(d, nextPage, nextLimit);
  }

  useEffect(() => {
    load(1).catch((e) => {
      setMsg(e.message);
      setMsgType("error");
    });
  }, []);

  function reset() {
    setForm(empty);
    setEditing(null);
  }

  async function save(e) {
    e.preventDefault();
    const code = validatePersonnelCode(form.personnelCode);
    if (!code.ok) {
      setMsg(code.message);
      setMsgType("error");
      return;
    }
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setMsg("نام و نام خانوادگی الزامی است");
      setMsgType("error");
      return;
    }
    if (!form.districtCode) {
      setMsg("منطقه را انتخاب کنید");
      setMsgType("error");
      return;
    }
    setSaving(true);
    try {
      const result = editing
        ? await api(`/api/personnel/${editing}`, { method: "PUT", body: form })
        : await api("/api/personnel", { method: "POST", body: form });
      reset();
      setMsg(result.message || "ذخیره شد");
      setMsgType("success");
      load();
    } catch (err) {
      setMsg(err.message);
      setMsgType("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">اطلاعات پرسنل</h1>
      <div className="card p-4 space-y-3">
        <a className="btn-outline inline-flex" href="/api/personnel/export">
          دریافت اکسل
        </a>
        <ExcelImport url="/api/personnel/import" onDone={() => load(1)} />
        <p className="text-xs text-slate-500">
          ستون‌های اکسل: کد پرسنلی، نام، نام خانوادگی، کد منطقه، نام منطقه
        </p>
      </div>

      <form onSubmit={save} className="card p-5 space-y-4">
        <h2 className="font-bold">{editing ? "ویرایش پرسنل" : "افزودن پرسنل"}</h2>
        {msg ? (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              msgType === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-amber-50 text-amber-900 border border-amber-200"
            }`}
          >
            {msg}
          </div>
        ) : null}
        <div className="grid md:grid-cols-4 gap-3">
          <label className="text-sm">
            کد پرسنلی
            <input
              className="input mt-1"
              value={form.personnelCode}
              onChange={(e) => setForm({ ...form, personnelCode: e.target.value })}
              required
            />
          </label>
          <label className="text-sm">
            نام
            <input
              className="input mt-1"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </label>
          <label className="text-sm">
            نام خانوادگی
            <input
              className="input mt-1"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </label>
          <label className="text-sm">
            منطقه (محل خدمت / مبدا)
            <div className="mt-1">
              <RegionSelect
                value={form.districtCode}
                required
                onChange={(code) => setForm({ ...form, districtCode: code })}
              />
            </div>
          </label>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={saving}>
            {saving ? "در حال ذخیره..." : editing ? "ذخیره ویرایش" : "افزودن"}
          </button>
          {editing ? (
            <button type="button" className="btn-outline" onClick={reset}>
              انصراف
            </button>
          ) : null}
        </div>
      </form>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(1);
        }}
      >
        <input
          className="input max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="کد پرسنلی، نام، کد یا نام منطقه"
        />
        <button type="submit" className="btn-primary">
          جستجو
        </button>
      </form>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>کد پرسنلی</th>
              <th>نام</th>
              <th>نام خانوادگی</th>
              <th>منطقه</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p._id}>
                <td>{p.personnelCode}</td>
                <td>{p.firstName || "—"}</td>
                <td>{p.lastName || "—"}</td>
                <td>{p.districtLabel || p.districtName || p.districtCode || "—"}</td>
                <td className="flex gap-2">
                  <button
                    className="btn-outline"
                    onClick={() => {
                      setEditing(p._id);
                      setForm({
                        personnelCode: p.personnelCode || "",
                        firstName: p.firstName || "",
                        lastName: p.lastName || "",
                        districtCode: p.districtCode || "",
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    ویرایش
                  </button>
                  <button
                    className="btn-danger"
                    onClick={async () => {
                      if (!confirm("حذف شود؟")) return;
                      try {
                        await api(`/api/personnel/${p._id}`, { method: "DELETE" });
                        setMsg("حذف شد");
                        setMsgType("success");
                        load();
                      } catch (err) {
                        setMsg(err.message);
                        setMsgType("error");
                      }
                    }}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pages={pages}
        total={total}
        limit={limit}
        onPage={(p) => load(p, limit)}
        onLimit={(l) => load(1, l)}
      />
    </div>
  );
}
