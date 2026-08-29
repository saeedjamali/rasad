"use client";

import ZoomableImage from "@/components/ZoomableImage";
import { isImageFile } from "@/components/AttachmentPreview";

export function isPdfFile(file) {
  const type = String(file?.type || "");
  if (type === "application/pdf") return true;
  const n = `${file?.url || ""} ${file?.name || ""}`.toLowerCase();
  return /\.pdf(\?|$)/i.test(n);
}

export default function AnnouncementMedia({ url, name, title, className }) {
  if (!url) return null;
  const file = { url, name };
  if (isImageFile(file)) {
    return <ZoomableImage src={url} alt={name || title || ""} className={className} />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-sky-800 hover:bg-slate-100"
    >
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
      مشاهده فایل PDF{name ? ` (${name})` : ""}
    </a>
  );
}
