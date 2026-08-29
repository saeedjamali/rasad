"use client";

export default function Feedback({ message, type = "error" }) {
  if (!message) return null;
  const ok = type === "success";
  return (
    <p
      className={`text-sm leading-6 ${ok ? "text-emerald-700" : "text-red-600"}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  );
}

export function ActionRow({ children, message, type }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <Feedback message={message} type={type} />
    </div>
  );
}
