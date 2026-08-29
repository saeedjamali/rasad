"use client";

import { useEffect, useRef } from "react";

export default function Modal({ open, title, onClose, children, wide }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/40 flex items-start justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className={`card w-full ${wide ? "max-w-5xl" : "max-w-lg"} my-6 shadow-xl max-h-[min(90vh,56rem)] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b px-5 py-3 shrink-0">
          <h2 id="modal-title" className="font-bold text-lg">
            {title}
          </h2>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-lg leading-none hover:bg-slate-50"
            onClick={onClose}
            aria-label="بستن"
          >
            ×
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
