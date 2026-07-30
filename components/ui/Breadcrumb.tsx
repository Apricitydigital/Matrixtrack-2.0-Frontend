import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumb({
  items,
  className = "",
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav className={`flex items-center gap-1.5 text-sm ${className}`}>
      <Link href="/" className="flex items-center text-slate-400 hover:text-slate-600">
        <Home size={14} />
      </Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={14} className="text-slate-300" />
          {item.href ? (
            <Link href={item.href} className="font-medium text-slate-500 hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-slate-800">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}