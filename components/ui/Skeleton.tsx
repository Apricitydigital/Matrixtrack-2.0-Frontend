import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded-lg bg-[length:400%_100%] bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 ${className}`}
    />
  );
}

export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-t border-slate-50">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <Skeleton className="h-4 w-full max-w-[140px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <Skeleton className="h-11 w-11 rounded-xl" />
      <Skeleton className="mt-4 h-6 w-16" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}