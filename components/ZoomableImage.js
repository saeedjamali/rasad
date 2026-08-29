"use client";

import { useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";

export default function ZoomableImage({ src, alt, className }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;
  return (
    <>
      <button
        type="button"
        className="mt-3 block w-full cursor-zoom-in text-right"
        onClick={() => setOpen(true)}
        title="برای بزرگ‌نمایی کلیک کنید"
      >
        <img src={src} alt={alt || ""} className={className} />
      </button>
      {open ? <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
