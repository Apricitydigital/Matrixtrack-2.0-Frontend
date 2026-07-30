import React from "react";

type Tone = "primary" | "success" | "warning" | "danger" | "neutral";

const toneClasses: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary-strong border-primary/20",
  success: "bg-success-bg text-success border-success/20",
  warning: "bg-warning-bg text-warning border-warning/20",
  danger: "bg-danger-bg text-danger border-danger/20",
  neutral: "bg-slate-100 text-slate-500 border-slate-200",
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  icon,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${toneClasses[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon}
      {children}
    </span>
  );
}