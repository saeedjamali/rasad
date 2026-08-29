"use client";

import { useEffect, useRef } from "react";

export default function ImageLightbox({ src, alt, onClose }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={alt || "بزرگ‌نمایی تصویر"}
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute top-4 start-4 rounded-full bg-white text-slate-800 w-10 h-10 text-2xl leading-none shadow"
        onClick={onClose}
        aria-label="بستن"
      >
        ×
      </button>
      <img
        src={src}
        alt={alt || ""}
        className="max-h-[92vh] max-w-[92vw] rounded-lg shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
