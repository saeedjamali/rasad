import path from "path";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export function safeUploadName(name) {
  const base = path.basename(String(name || "")).replace(/[/\\]/g, "");
  if (!base || base === "." || base === "..") return "";
  return base;
}

export function uploadFilePath(name) {
  const safe = safeUploadName(name);
  if (!safe) return "";
  return path.join(UPLOAD_DIR, safe);
}

export function uploadContentType(name) {
  return TYPES[path.extname(String(name || "")).toLowerCase()] || "application/octet-stream";
}
