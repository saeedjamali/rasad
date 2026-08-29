import { ROLE_LABELS } from "@/lib/constants";

export async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
    ...options,
    body:
      options.body && !(options.body instanceof FormData) && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : options.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "خطا در ارتباط با سرور");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function roleName(role) {
  return ROLE_LABELS[role] || role;
}
