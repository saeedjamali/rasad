"use client";

import { useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";

export function isImageFile(file) {
  const type = String(file?.type || "");
  if (type.startsWith("image/")) return true;
  const n = `${file?.url || ""} ${file?.name || ""}`.toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(n);
}

export function AttachmentPreview({ files, onRemove, compact }) {
  const [preview, setPreview] = useState(null);
  if (!files?.length) return null;
  return (
    <>
      <div className={`mt-3 grid gap-3 ${compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 md:grid-cols-4"}`}>
        {files.map((f, i) => {
          const image = isImageFile(f);
          return (
            <div key={`${f.url || f.name}-${i}`} className="card overflow-hidden">
              {image ? (
                <button type="button" className="block w-full cursor-zoom-in" onClick={() => setPreview(f)} title="برای بزرگ‌نمایی کلیک کنید">
                  <img src={f.url} alt={f.name || "پیوست"} className="h-28 w-full object-cover" />
                </button>
              ) : (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-28 items-center justify-center bg-slate-100 text-xs text-slate-600 px-2 text-center"
                >
                  PDF / فایل
                </a>
              )}
              <div className="flex items-start justify-between gap-1 p-2">
                {image ? (
                  <button
                    type="button"
                    className="text-xs text-sky-800 underline truncate text-right"
                    title={f.name || "بزرگ‌نمایی تصویر"}
                    onClick={() => setPreview(f)}
                  >
                    {f.name || "پیوست"}
                  </button>
                ) : (
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-xs text-sky-800 underline truncate" title={f.name}>
                    {f.name || "پیوست"}
                  </a>
                )}
                {onRemove ? (
                  <button type="button" className="text-xs text-red-600 shrink-0" onClick={() => onRemove(i)}>
                    حذف
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {preview ? (
        <ImageLightbox src={preview.url} alt={preview.name} onClose={() => setPreview(null)} />
      ) : null}
    </>
  );
}
