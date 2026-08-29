"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import Feedback from "@/components/Feedback";

export default function ExcelImport({ url, onDone, extraFields }) {
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  async function submit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    setMsgType("success");
    setMsg("در حال بارگذاری...");
    try {
      const d = await api(url, { method: "POST", body: fd });
      const lines = [`ایجاد: ${d.created || 0} | به‌روزرسانی: ${d.updated || 0}`];
      if (d.errors?.length) lines.push(...d.errors.slice(0, 8));
      setMsgType(d.errors?.length ? "error" : "success");
      setMsg(lines.join("\n"));
      onDone?.(d);
    } catch (err) {
      const extra = err.data?.errors?.slice?.(0, 8)?.join("\n");
      setMsgType("error");
      setMsg([err.message, extra].filter(Boolean).join("\n"));
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        فایل اکسل
        <input type="file" name="file" accept=".xlsx,.xls" className="input mt-1" required />
      </label>
      {extraFields}
      <button className="btn-primary">بارگذاری گروهی</button>
      <span className="w-full whitespace-pre-wrap">
        <Feedback message={msg} type={msgType} />
      </span>
    </form>
  );
}
