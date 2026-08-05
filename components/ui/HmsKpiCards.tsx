'use client';
import { useEffect, useState } from 'react';
import { Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Globe, Layers, Target, Clock, Users, CheckCircle2 } from 'lucide-react';
import { CityApi, ApiError } from '@lib/apiClient';
import { SkeletonCard } from '@components/ui/Skeleton';
import type { CityRow } from '../../types/api';

export default function HmsKpiCards() {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CityApi.list().then(res => setCities(res.cities)).finally(() => setLoading(false));
  }, []);
  const totalCities = cities.length;
  const activeCities = cities.filter((c) => c.enabled).length;
  const managedCities = cities.filter((c) => (c.cityAdmins?.length ?? 0) > 0).length;
  const totalUlbs = new Set(cities.map((c) => c.ulbCode).filter(Boolean)).size;

  const unmanagedCities = totalCities - managedCities;
  const totalAdmins = cities.reduce(
    (sum, city) => sum + ((city.cityAdmins?.length ?? 0) || (city.cityAdmin ? 1 : 0)),
    0
  );
  const hierarchyReadyCities = cities.filter(
    (city) => city.state?.name && city.division?.name && city.district?.name
  ).length;
  const coverageRate = totalCities ? Math.round((activeCities / totalCities) * 100) : 0;
  const adminRate = totalCities ? Math.round((managedCities / totalCities) * 100) : 0;
  const hierarchyRate = totalCities ? Math.round((hierarchyReadyCities / totalCities) * 100) : 0;

  // â”€â”€ PLACEHOLDER SPARKLINES (BACKEND: GET /hms/stats/kpi-trends) â”€â”€
  const spark = {
    cities: [3, 4, 4, 5, 6, 6, 7, 7],
    active: [2, 3, 3, 4, 5, 5, 6, 7],
    admins: [1, 2, 3, 3, 4, 5, 5, 6],
    ulbs: [2, 3, 4, 4, 5, 6, 6, 7],
    dormant: [1, 1, 2, 2, 1, 1, 0, 0],
    unmanaged: [5, 4, 4, 3, 2, 2, 1, 1],
  };

  const kpiCards = [
    {
      label: "Total Cities",
      value: totalCities,
      delta: `${activeCities} currently live`,
      up: true,
      color: "#2563eb",
      data: spark.cities,
      icon: <Globe size={16} />,
      iconClass: "bg-blue-50 text-blue-600",
    },

    {
      label: "City Admins",
      value: totalAdmins,
      delta: `${managedCities} covered cities`,
      up: true,
      color: "#8b5cf6",
      data: spark.admins,
      icon: <Users size={16} />,
      iconClass: "bg-violet-50 text-violet-600",
    },

    {
      label: "Dormant Cities",
      value: totalCities - activeCities,
      delta: totalCities - activeCities > 0 ? "review required" : "all live",
      up: false,
      color: "#f59e0b",
      data: spark.dormant,
      icon: <Clock size={16} />,
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      label: "Needs Admin",
      value: unmanagedCities,
      delta: unmanagedCities > 0 ? "action required" : "all covered",
      up: false,
      color: "#ef4444",
      data: spark.unmanaged,
      icon: <AlertCircle size={16} />,
      iconClass: "bg-rose-50 text-rose-600",
    },
  ];

  const hierarchyIssues = cities.filter(
    (city) => !city.state?.name || !city.division?.name || !city.district?.name
  );

  return (
    <div className="space-y-6">
        {/* Ultra-compact status strip */}
        <div className="relative mx-4 mb-4 overflow-hidden rounded-[17px] border border-slate-200/85 bg-white/95 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.42)] sm:mx-5 lg:mx-6">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "System status",
                value: "Operational",
                helper: `${activeCities} live cities`,
                icon: <Activity size={17} />,
                iconClass:
                  "border-emerald-100 bg-emerald-50 text-emerald-600",
                dotClass: "bg-emerald-500",
              },
              {
                label: "Admin coverage",
                value: `${adminRate}%`,
                helper: `${managedCities} of ${totalCities || 0} covered`,
                icon: <Users size={17} />,
                iconClass:
                  "border-violet-100 bg-violet-50 text-violet-600",
                dotClass: "bg-violet-500",
              },
              {
                label: "Hierarchy readiness",
                value: `${hierarchyRate}%`,
                helper: `${hierarchyReadyCities} fully mapped`,
                icon: <Layers size={17} />,
                iconClass: "border-blue-100 bg-blue-50 text-blue-600",
                dotClass: "bg-blue-500",
              },
              {
                label: "Action queue",
                value: `${unmanagedCities + hierarchyIssues.length}`,
                helper: "Items requiring review",
                icon: <AlertCircle size={17} />,
                iconClass:
                  "border-amber-100 bg-amber-50 text-amber-600",
                dotClass: "bg-amber-500",
              },
            ].map((item, index) => (
              <div
                key={item.label}
                className={`
            relative flex min-h-[78px] items-center gap-3
            border-b border-slate-200/75 px-4 py-3
            ${index % 2 === 0 ? "sm:border-r" : ""}
            ${index < 2 ? "sm:border-b" : "sm:border-b-0"}
            xl:border-b-0
            ${index < 3 ? "xl:border-r" : "xl:border-r-0"}
          `}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border shadow-sm ${item.iconClass}`}
                >
                  {item.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.dotClass}`}
                    />

                    <span className="truncate text-[9px] font-extrabold uppercase tracking-[0.13em] text-slate-500">
                      {item.label}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[16px] font-black leading-none tracking-[-0.025em] text-slate-950">
                      {item.value}
                    </span>

                    <span className="truncate text-[11px] font-medium text-slate-500">
                      {item.helper}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* Compact premium KPI cards — circular status design */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mx-4 sm:mx-5 lg:mx-6">
        {loading && !cities.length ? (
          Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          kpiCards.map((kpi, index) => {
            const numericValue =
              typeof kpi.value === "number"
                ? kpi.value
                : Number.parseFloat(String(kpi.value)) || 0;

            const highestPoint = Math.max(...kpi.data, 1);

            const progress = Math.min(
              100,
              Math.max(
                numericValue === 0 ? 4 : 12,
                Math.round((numericValue / highestPoint) * 100)
              )
            );

            return (
              <article
                key={kpi.label}
                className="
            group relative flex min-h-[162px] flex-col overflow-hidden
            rounded-[18px] border border-slate-200/85 bg-white
            px-3.5 pb-3 pt-3.5 opacity-100
            shadow-[0_12px_30px_-24px_rgba(15,23,42,0.65)]
            transition-all duration-300
            hover:-translate-y-0.5 hover:border-blue-200
            hover:shadow-[0_18px_38px_-25px_rgba(37,99,235,0.35)]
          "
              >
                {/* Soft top-right gradient decoration */}
                <div
                  className="
              pointer-events-none absolute -right-9 -top-10
              h-24 w-28 rounded-full opacity-[0.12] blur-2xl
              transition-opacity duration-300
              group-hover:opacity-[0.2]
            "
                  style={{
                    backgroundColor: kpi.color,
                  }}
                />

                {/* Top row: icon and trend */}
                <div className="relative flex items-start justify-between gap-2">
                  <span
                    className={`
                flex h-8 w-8 shrink-0 items-center justify-center
                rounded-[10px] transition-transform duration-300
                group-hover:scale-105
                ${kpi.iconClass}
              `}
                  >
                    <span className="[&>svg]:h-[15px] [&>svg]:w-[15px]">
                      {kpi.icon}
                    </span>
                  </span>

                  <span
                    className="
                flex max-w-[110px] items-start gap-1 rounded-lg
                bg-white/75 px-2 py-1 text-right
                text-[9px] font-extrabold leading-[12px]
                shadow-[0_5px_15px_-12px_rgba(15,23,42,0.55)]
                backdrop-blur-sm
              "
                    style={{
                      color: kpi.up ? kpi.color : "#94a3b8",
                    }}
                  >
                    {kpi.up ? (
                      <ArrowUpRight
                        size={10}
                        strokeWidth={2.5}
                        className="mt-[1px] shrink-0"
                      />
                    ) : (
                      <ArrowDownRight
                        size={10}
                        strokeWidth={2.5}
                        className="mt-[1px] shrink-0"
                      />
                    )}

                    <span>{kpi.delta}</span>
                  </span>
                </div>

                {/* Value and compact circular indicator */}
                <div className="relative mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[25px] font-black leading-none tracking-[-0.04em] text-slate-950">
                      {kpi.value}
                    </div>

                    <div className="mt-1.5 truncate text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      {kpi.label}
                    </div>
                  </div>

                  {/* Circular progress */}
                  <div className="relative h-[48px] w-[48px] shrink-0">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(
                    ${kpi.color} ${progress}%,
                    #e9eef5 ${progress}% 100%
                  )`,
                      }}
                    />

                    <div className="absolute inset-[5px] flex items-center justify-center rounded-full bg-white shadow-inner">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          color: kpi.color,
                          backgroundColor: `${kpi.color}12`,
                        }}
                      >
                        <span className="[&>svg]:h-[12px] [&>svg]:w-[12px]">
                          {kpi.icon}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom status row */}
                <div
                  className="
              relative mt-auto flex min-h-[34px] items-center gap-2
              rounded-[11px] px-2.5 py-2
            "
                  style={{
                    backgroundColor: `${kpi.color}0D`,
                  }}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: kpi.color,
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-[9px] font-extrabold"
                      style={{
                        color: kpi.color,
                      }}
                    >
                      {kpi.delta}
                    </div>
                  </div>

                  <span className="text-[9px] font-bold text-slate-400">
                    {progress}%
                  </span>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

