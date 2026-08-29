"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { ROLE_LABELS, ROLES } from "@/lib/constants";
import Feedback, { ActionRow } from "@/components/Feedback";
import ExcelImport from "@/components/ExcelImport";
import RegionSelect from "@/components/RegionSelect";
import Pagination from "@/components/Pagination";
import { usePagedList } from "@/lib/usePagedList";

const empty = {
  mobile: "",
  personnelCode: "",
  fullName: "",
  roles: [ROLES.personnel],
  districtCode: "",
  provinceCode: "17",
  password: "",
  isActive: true,
  isLocked: false,
};

export default function UsersPage() {
  const { list, page, limit, total, pages, apply } = usePagedList();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [rowMsg, setRowMsg] = useState(null);

  async function load(nextPage = page, nextLimit = limit, filters = {}) {
    const query = filters.q !== undefined ? filters.q : q;
    const roleFilter = filters.role !== undefined ? filters.role : role;
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (roleFilter) sp.set("role", roleFilter);
    sp.set("page", String(nextPage));
    sp.set("limit", String(nextLimit));
    const d = await api(`/api/users?${sp}`);
    if (!(d.list || []).length && (d.page || nextPage) > 1) {
      return load((d.page || nextPage) - 1, nextLimit, { q: query, role: roleFilter });
    }
    apply(d, nextPage, nextLimit);
  }
  useEffect(() => {
    load(1).catch((e) => setMsg(e.message));
  }, []);

  function toggleRole(r) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r],
    }));
  }

  async function save(e) {
    e.preventDefault();
    try {
      if (editing) await api(`/api/users/${editing}`, { method: "PUT", body: form });
      else await api("/api/users", { method: "POST", body: form });
      setForm(empty);
      setEditing(null);
      load();
      setMsgType("success");
      setMsg("ذخیره شد");
    } catch (err) {
      setMsgType("error");
      setMsg(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">مدیریت کاربران</h1>
      <div className="card p-4 space-y-3">
        <a className="btn-outline inline-flex" href="/api/users/export">
          دریافت اکسل کاربران
        </a>
        <ExcelImport url="/api/users/import" onDone={() => load(1)} />
        <p className="text-xs text-slate-500">
          ستون‌های اکسل: شماره همراه، کد پرسنلی، نام، نقش‌ها (با ویرگول)، کد منطقه، نام منطقه، کد استان، رمز، فعال، قفل
        </p>
      </div>
      <form onSubmit={save} className="card p-4 grid md:grid-cols-3 gap-3">
        <input className="input" placeholder="شماره همراه" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
        <input className="input" placeholder="کد پرسنلی" value={form.personnelCode} onChange={(e) => setForm({ ...form, personnelCode: e.target.value })} required />
        <input className="input" placeholder="نام" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <label className="text-sm md:col-span-1">
          منطقه
          <div className="mt-1">
            <RegionSelect
              value={form.districtCode}
              onChange={(code, region) =>
                setForm({
                  ...form,
                  districtCode: code,
                  provinceCode: region?.provinceCode || form.provinceCode,
                })
              }
            />
          </div>
        </label>
        <input className="input" placeholder="کد استان" value={form.provinceCode} onChange={(e) => setForm({ ...form, provinceCode: e.target.value })} />
        <input className="input" placeholder="رمز عبور (اختیاری)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="md:col-span-3 flex flex-wrap gap-3 text-sm">
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <label key={k} className="flex gap-1 items-center">
              <input type="checkbox" checked={form.roles.includes(k)} onChange={() => toggleRole(k)} />
              {v}
            </label>
          ))}
        </div>
        <div className="md:col-span-3 flex flex-wrap gap-4 text-sm">
          <label className="flex gap-1 items-center">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            فعال
          </label>
          <label className="flex gap-1 items-center">
            <input
              type="checkbox"
              checked={form.isLocked}
              onChange={(e) => setForm({ ...form, isLocked: e.target.checked })}
            />
            قفل شده
          </label>
        </div>
        <ActionRow message={msg} type={msgType}>
          <button className="btn-primary">{editing ? "ویرایش" : "کاربر جدید"}</button>
          {editing && (
            <button type="button" className="btn-outline" onClick={() => { setEditing(null); setForm(empty); }}>
              انصراف
            </button>
          )}
        </ActionRow>
      </form>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-sm">
          جستجو
          <input
            className="input mt-1 min-w-56"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load(1);
            }}
            placeholder="موبایل، کد پرسنلی، نام، منطقه، نقش"
          />
        </label>
        <label className="text-sm">
          نقش
          <select
            className="input mt-1 min-w-52"
            value={role}
            onChange={(e) => {
              const value = e.target.value;
              setRole(value);
              load(1, limit, { role: value });
            }}
          >
            <option value="">همه نقش‌ها</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary" onClick={() => load(1)}>
          جستجو
        </button>
        {(q || role) && (
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setQ("");
              setRole("");
              load(1, limit, { q: "", role: "" });
            }}
          >
            پاک کردن فیلتر
          </button>
        )}
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>موبایل</th>
              <th>کد پرسنلی</th>
              <th>نام</th>
              <th>نقش‌ها</th>
              <th>منطقه</th>
              <th>وضعیت</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u._id} className={!u.isActive || u.isLocked ? "bg-slate-50 text-slate-500" : ""}>
                <td>{u.mobile}</td>
                <td>{u.personnelCode}</td>
                <td>{u.fullName}</td>
                <td>{(u.roles || []).map((r) => ROLE_LABELS[r]).join("، ")}</td>
                <td>{u.districtLabel || u.districtCode || "—"}</td>
                <td>
                  {!u.isActive ? (
                    <span className="text-xs text-red-700">غیرفعال</span>
                  ) : u.isLocked ? (
                    <span className="text-xs text-amber-700">قفل شده</span>
                  ) : (
                    <span className="text-xs text-emerald-700">فعال</span>
                  )}
                </td>
                <td className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                  <button className="btn-outline" onClick={() => { setEditing(u._id); setForm({ ...empty, ...u, password: "", isActive: u.isActive !== false, isLocked: !!u.isLocked }); }}>ویرایش</button>
                  <button
                    className="btn-outline"
                    onClick={async () => {
                      try {
                        await api(`/api/users/${u._id}`, { method: "PUT", body: { isLocked: !u.isLocked } });
                        await load();
                        setRowMsg({ id: u._id, text: u.isLocked ? "قفل باز شد" : "حساب قفل شد", type: "success" });
                      } catch (err) {
                        setRowMsg({ id: u._id, text: err.message, type: "error" });
                      }
                    }}
                  >
                    {u.isLocked ? "باز کردن قفل" : "قفل کردن"}
                  </button>
                  <button
                    className="btn-outline"
                    onClick={async () => {
                      try {
                        await api(`/api/users/${u._id}`, { method: "PUT", body: { isActive: !u.isActive } });
                        await load();
                        setRowMsg({ id: u._id, text: u.isActive === false ? "حساب فعال شد" : "حساب غیرفعال شد", type: "success" });
                      } catch (err) {
                        setRowMsg({ id: u._id, text: err.message, type: "error" });
                      }
                    }}
                  >
                    {u.isActive === false ? "فعال کردن" : "غیرفعال کردن"}
                  </button>
                  <button className="btn-danger" onClick={async () => {
                    if (!confirm("حذف؟")) return;
                    try {
                      await api(`/api/users/${u._id}`, { method: "DELETE" });
                      await load();
                      setMsgType("success");
                      setMsg("کاربر حذف شد");
                    } catch (err) {
                      setRowMsg({ id: u._id, text: err.message, type: "error" });
                    }
                  }}>حذف</button>
                  </div>
                  {rowMsg?.id === u._id ? <Feedback message={rowMsg.text} type={rowMsg.type} /> : null}
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
