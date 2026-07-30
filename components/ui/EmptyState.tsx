import React from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center animate-fade-in">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm">
        {icon || <Inbox size={24} />}
      </div>
      <div className="text-sm font-bold text-slate-700">{title}</div>
      {description && <div className="mt-1.5 max-w-xs text-xs text-slate-400">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}