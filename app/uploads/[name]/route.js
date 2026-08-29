import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { safeUploadName, uploadContentType, uploadFilePath } from "@/lib/uploads";

export async function GET(_req, { params }) {
  const { name } = await params;
  const safe = safeUploadName(name);
  if (!safe || safe !== name) return fail("نام فایل نامعتبر است", 400);
  const isPublicFile = safe.startsWith("pub-");
  if (!isPublicFile) {
    const { error } = await requireUser();
    if (error) return error;
  }
  try {
    const buf = await readFile(uploadFilePath(safe));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": uploadContentType(safe),
        "Content-Length": String(buf.length),
        "Cache-Control": isPublicFile ? "public, max-age=86400" : "private, max-age=3600",
        "Content-Disposition": `inline; filename="${encodeURIComponent(safe)}"`,
      },
    });
  } catch {
    return fail("فایل یافت نشد", 404);
  }
}
