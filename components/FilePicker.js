"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { AttachmentPreview } from "@/components/AttachmentPreview";
import Feedback from "@/components/Feedback";

export default function FilePicker({ files, setFiles, max = 4, accept = "image/*,application/pdf", publicUpload = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  async function onChange(e) {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    if (files.length + list.length > max) {
      setMsgType("error");
      setMsg(`حداکثر ${max} فایل مجاز است`);
      e.target.value = "";
      return;
    }
    const fd = new FormData();
    list.forEach((f) => fd.append("files", f));
    if (publicUpload) fd.append("public", "1");
    setBusy(true);
    setMsg("");
    try {
      const d = await api("/api/upload", { method: "POST", body: fd });
      setFiles([...files, ...d.files]);
      setMsgType("success");
      setMsg(`${d.files?.length || list.length} فایل بارگذاری شد`);
    } catch (err) {
      setMsgType("error");
      setMsg(err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={max > 1}
        className="sr-only"
        onChange={onChange}
        disabled={busy}
      />
      <button
        type="button"
        className="btn-gold px-6 py-3 text-base font-bold shadow-md"
        disabled={busy || files.length >= max}
        onClick={() => inputRef.current?.click()}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 16V4m0 0 4 4m-4-4L8 8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
        </svg>
        {busy ? "در حال بارگذاری..." : "بارگذاری فایل"}
      </button>
      <Feedback message={msg} type={msgType} />
      <p className="text-xs text-slate-500 mt-2">
        حداکثر {max} فایل {accept.includes("pdf") ? "تصویری یا PDF" : "تصویری"}، هر کدام تا ۵ مگابایت
      </p>
      <AttachmentPreview files={files} onRemove={(i) => setFiles(files.filter((_, j) => j !== i))} />
    </div>
  );
}
