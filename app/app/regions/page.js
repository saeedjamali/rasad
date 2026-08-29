"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import ExcelImport from "@/components/ExcelImport";
import { clearRegionsClientCache } from "@/components/RegionSelect";
import Pagination from "@/components/Pagination";
import { usePagedList } from "@/lib/usePagedList";
import Feedback, { ActionRow } from "@/components/Feedback";

export default function RegionsPage() {
  const { list, page, limit, total, pages, apply } = usePagedList();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ provinceCode: "17", districtCode: "", districtName: "" });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [rowMsg, setRowMsg] = useState(null);

  async function load(nextPage = page, nextLimit = limit) {
    const d = await api(
      `/api/regions?q=${encodeURIComponent(q)}&page=${nextPage}&limit=${nextLimit}`
    );
    if (!(d.list || []).length && (d.page || nextPage) > 1) {
      return load((d.page || nextPage) - 1, nextLimit);
    }
    apply(d, nextPage, nextLimit);
  }
  useEffect(() => {
    load(1).catch(() => {});
  }, []);

  async function refresh(resetPage = false) {
    clearRegionsClientCache();
    await load(resetPage ? 1 : page);
  }

  async function save(e) {
    e.preventDefault();
    setMsg("");
    try {
      if (editing) await api(`/api/regions/${editing}`, { method: "PUT", body: form });
      else await api("/api/regions", { method: "POST", body: form });
      setForm({ provinceCode: "17", districtCode: "", districtName: "" });
      setEditing(null);
      await refresh();
      setMsgType("success");
      setMsg(editing ? "منطقه ویرایش شد" : "منطقه افزوده شد");
    } catch (err) {
      setMsgType("error");
      setMsg(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">مناطق</h1>
      <div className="card p-4 space-y-2">
        <ExcelImport url="/api/regions/import" onDone={() => refresh(true)} />
        <p className="text-xs text-slate-500">
          ستون‌ها: کد استان، کد منطقه، نام منطقه — فایل xlsx. اگر کد استان خالی باشد مقدار ۱۷ در نظر گرفته می‌شود.
        </p>
        <a className="btn-outline inline-flex text-sm" href="/api/regions/template">
          دریافت نمونه اکسل
        </a>
      </div>
      <form onSubmit={save} className="flex flex-wrap gap-2">
        <input className="input max-w-32" placeholder="کد استان" value={form.provinceCode} onChange={(e) => setForm({ ...form, provinceCode: e.target.value })} />
        <input className="input max-w-40" placeholder="کد منطقه" value={form.districtCode} onChange={(e) => setForm({ ...form, districtCode: e.target.value })} />
        <input className="input max-w-xs" placeholder="نام منطقه" value={form.districtName} onChange={(e) => setForm({ ...form, districtName: e.target.value })} />
        <ActionRow message={msg} type={msgType}>
          <button className="btn-primary">{editing ? "ویرایش" : "افزودن"}</button>
        </ActionRow>
      </form>
      <div className="flex gap-2">
        <input className="input max-w-xs" placeholder="جستجو کد یا نام" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" onClick={() => load(1)}>جستجو</button>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>کد استان</th>
              <th>کد منطقه</th>
              <th>نام منطقه</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r._id}>
                <td>{r.provinceCode}</td>
                <td>{r.districtCode}</td>
                <td>{r.districtName}</td>
                <td className="flex gap-2">
                <td className="space-y-2">
                  <div className="flex gap-2">
                  <button className="btn-outline" onClick={() => { setEditing(r._id); setForm(r); }}>ویرایش</button>
                  <button className="btn-danger" onClick={async () => {
                    try {
                      await api(`/api/regions/${r._id}`, { method: "DELETE" });
                      await refresh();
                      setMsgType("success");
                      setMsg("منطقه حذف شد");
                    } catch (err) {
                      setRowMsg({ id: r._id, text: err.message, type: "error" });
                    }
                  }}>حذف</button>
                  </div>
                  {rowMsg?.id === r._id ? <Feedback message={rowMsg.text} type={rowMsg.type} /> : null}
                </td>
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
