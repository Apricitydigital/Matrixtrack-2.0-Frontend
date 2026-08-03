import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type StatCardTone = "primary" | "success" | "warning" | "danger";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    direction: "up" | "down";
  };
  tone?: StatCardTone;
  delay?: number;
};

const toneConfig: Record<
  StatCardTone,
  {
    accent: string;
    accentSoft: string;
    iconClass: string;
    glowClass: string;
    lineClass: string;
    trendUpClass: string;
    trendDownClass: string;
  }
> = {
  primary: {
    accent: "#2563eb",
    accentSoft: "rgba(37, 99, 235, 0.1)",
    iconClass: "bg-blue-50 text-blue-600",
    glowClass: "bg-blue-500",
    lineClass: "from-blue-600 via-indigo-500 to-cyan-400",
    trendUpClass: "bg-blue-50 text-blue-700",
    trendDownClass: "bg-slate-100 text-slate-500",
  },

  success: {
    accent: "#10b981",
    accentSoft: "rgba(16, 185, 129, 0.1)",
    iconClass: "bg-emerald-50 text-emerald-600",
    glowClass: "bg-emerald-500",
    lineClass: "from-emerald-600 via-emerald-500 to-teal-400",
    trendUpClass: "bg-emerald-50 text-emerald-700",
    trendDownClass: "bg-slate-100 text-slate-500",
  },

  warning: {
    accent: "#f59e0b",
    accentSoft: "rgba(245, 158, 11, 0.1)",
    iconClass: "bg-amber-50 text-amber-600",
    glowClass: "bg-amber-500",
    lineClass: "from-amber-500 via-orange-400 to-yellow-400",
    trendUpClass: "bg-amber-50 text-amber-700",
    trendDownClass: "bg-slate-100 text-slate-500",
  },

  danger: {
    accent: "#ef4444",
    accentSoft: "rgba(239, 68, 68, 0.1)",
    iconClass: "bg-rose-50 text-rose-600",
    glowClass: "bg-rose-500",
    lineClass: "from-rose-600 via-red-500 to-orange-400",
    trendUpClass: "bg-rose-50 text-rose-700",
    trendDownClass: "bg-rose-50 text-rose-700",
  },
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  tone = "primary",
  delay = 0,
}: StatCardProps) {
  const config = toneConfig[tone];

  const trendClass =
    trend?.direction === "up"
      ? config.trendUpClass
      : config.trendDownClass;

  return (
    <article
      style={{
        animationDelay: `${delay}ms`,
        "--stat-accent": config.accent,
        "--stat-accent-soft": config.accentSoft,
      } as React.CSSProperties}
      className="
        group relative flex min-h-[220px] flex-col overflow-hidden
        rounded-[24px] border border-slate-200/80 bg-white
        px-5 pb-4 pt-5 opacity-0
        shadow-[0_18px_42px_-30px_rgba(15,23,42,0.65)]
        transition-all duration-300
        [animation-fill-mode:forwards] animate-slide-up
        hover:-translate-y-1 hover:border-blue-200/80
        hover:shadow-[0_26px_55px_-30px_rgba(37,99,235,0.42)]
      "
    >
      {/* Colored top border */}
      <div
        className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${config.lineClass}`}
      />

      {/* Decorative background glow */}
      <div
        className={`
          pointer-events-none absolute -right-14 -top-16
          h-40 w-40 rounded-full opacity-[0.07] blur-3xl
          transition-opacity duration-300 group-hover:opacity-[0.14]
          ${config.glowClass}
        `}
      />

      {/* Icon and trend */}
      <div className="relative flex items-start justify-between gap-4">
        <div
          className={`
            flex h-12 w-12 shrink-0 items-center justify-center
            rounded-[16px] shadow-sm
            transition-all duration-300
            group-hover:scale-105 group-hover:shadow-md
            ${config.iconClass}
          `}
        >
          <span className="[&>svg]:h-[20px] [&>svg]:w-[20px]">
            {icon}
          </span>
        </div>

        {trend && (
          <div
            className={`
              flex max-w-[125px] items-start gap-1
              rounded-full px-2.5 py-1
              text-right text-[10px] font-extrabold leading-4
              ${trendClass}
            `}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight
                size={12}
                strokeWidth={2.5}
                className="mt-0.5 shrink-0"
              />
            ) : (
              <ArrowDownRight
                size={12}
                strokeWidth={2.5}
                className="mt-0.5 shrink-0"
              />
            )}

            <span>{trend.value}</span>
          </div>
        )}
      </div>

      {/* Value and label */}
      <div className="relative mt-7">
        <div className="text-[32px] font-black leading-none tracking-[-0.04em] text-slate-950">
          {value}
        </div>

        <div className="mt-2 truncate text-[11px] font-extrabold uppercase tracking-[0.13em] text-slate-400">
          {label}
        </div>
      </div>

      {/* Decorative chart-style footer */}
      <div className="relative mt-auto pt-7">
        <div
          className="absolute inset-x-0 bottom-0 h-12 rounded-xl opacity-[0.65]"
          style={{
            background:
              "linear-gradient(to top, var(--stat-accent-soft), transparent)",
          }}
        />

        <div className="relative flex h-11 items-end gap-1.5 overflow-hidden">
          {[22, 30, 27, 39, 46, 43, 57, 63].map((height, index) => (
            <span
              key={index}
              className="flex-1 rounded-t-full opacity-[0.16] transition-all duration-300 group-hover:opacity-[0.25]"
              style={{
                height: `${height}%`,
                backgroundColor: "var(--stat-accent)",
                transitionDelay: `${index * 25}ms`,
              }}
            />
          ))}

          <div
            className="absolute inset-x-0 bottom-0 h-[2px] rounded-full opacity-80"
            style={{
              background:
                "linear-gradient(to right, transparent, var(--stat-accent), transparent)",
            }}
          />
        </div>
      </div>
    </article>
  );
}