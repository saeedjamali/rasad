import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth";
import { fail, json } from "@/lib/http";
import { UPLOAD_DIR } from "@/lib/uploads";
import { ROLES } from "@/lib/constants";

const MAX = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export async function POST(req) {
  const { user, error } = await requireUser();
  if (error) return error;

  const form = await req.formData();
  const files = form.getAll("files");
  if (!files.length) return fail("فایلی ارسال نشده است");
  if (files.length > 4) return fail("حداکثر ۴ فایل مجاز است");
  const makePublic = form.get("public") === "1" && (user.roles || []).includes(ROLES.admin);

  const dir = UPLOAD_DIR;
  await mkdir(dir, { recursive: true });

  const saved = [];
  for (const file of files) {
    if (typeof file === "string") continue;
    if (file.size > MAX) return fail(`حجم فایل ${file.name} بیش از ۵ مگابایت است`);
    if (file.type && !ALLOWED.includes(file.type)) {
      return fail("فقط تصویر یا PDF مجاز است");
    }
    const ext = path.extname(file.name || "") || ".bin";
    const name = `${makePublic ? "pub-" : ""}${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, name), buf);
    saved.push({ url: `/uploads/${name}`, name: file.name, size: file.size });
  }
  return json({ files: saved });
}
