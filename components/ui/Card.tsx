import React from "react";

export function Card({
  title,
  subtitle,
  children,
  actions,
  padded = true,
  hover = false,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
  hover?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-100 bg-white shadow-card transition-all duration-200 ${
        hover ? "hover:-translate-y-0.5 hover:shadow-card-hover" : ""
      } ${padded ? "p-6" : ""} ${className}`}
    >
      {(title || actions) && (
        <div className={`flex items-start justify-between gap-4 ${padded ? "mb-5" : "p-6 pb-0"}`}>
          <div>
            {title && <h3 className="text-base font-bold text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}