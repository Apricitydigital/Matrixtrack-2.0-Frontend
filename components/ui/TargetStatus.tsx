"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BrushCleaning,
  Clock3,
  FileCheck2,
  FileText,
  RefreshCw,
  Target,
  Toilet,
  Trash2,
} from "lucide-react";
import { apiFetch } from "@lib/apiClient";

type ModuleKey = "SWEEPING" | "TOILET" | "TWINBIN";

type SupervisorTargetRow = {
  supervisorId: string | null;
  supervisorName: string;
  module: ModuleKey;
  zoneId: string | null;
  zoneName: string;
  wardId: string | null;
  wardName: string;
  target: number;
  submitted: number;
  pending: number;
  completion: number;
};

type ModuleTargetSummary = {
  target: number;
  submitted: number;
  pending: number;
  completion: number;
};

type DailyTargetResponse = {
  date: string;
  overall: ModuleTargetSummary;
  modules: Record<ModuleKey, ModuleTargetSummary>;
  supervisors: SupervisorTargetRow[];
};

type Props = {
  date: string;
  cityId?: string;
  refreshKey?: number;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
};

const MODULES = [
  {
    key: "SWEEPING" as const,
    name: "Sweeping",
    Icon: BrushCleaning,
    color: "#15976e",
    soft: "#edf9f5",
    border: "#cfeee3",
  },
  {
    key: "TOILET" as const,
    name: "Cleanliness of Toilets",
    Icon: Toilet,
    color: "#3974df",
    soft: "#eff5ff",
    border: "#d2e2ff",
  },
  {
    key: "TWINBIN" as const,
    name: "Litter Bins",
    Icon: Trash2,
    color: "#d98112",
    soft: "#fff7e9",
    border: "#f4dfb8",
  },
];

const EMPTY_SUMMARY: ModuleTargetSummary = {
  target: 0,
  submitted: 0,
  pending: 0,
  completion: 0,
};

function Metric({
  label,
  value,
  Icon,
}: {
  label: string;
  value: number;
  Icon: React.ElementType;
}) {
  return (
    <div className="min-w-0 rounded-[10px] bg-slate-50 px-2 py-2 text-center">
      <div className="text-[17px] font-black leading-none text-[#17243c]">{value}</div>
      <div className="mt-1 flex items-center justify-center gap-1 text-[7px] font-extrabold uppercase tracking-[.035em] text-slate-400">
        <Icon size={9} /> {label}
      </div>
    </div>
  );
}

export default function TargetStatus({
  date,
  cityId,
  refreshKey = 0,
  refreshing = false,
  onRefresh,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [data, setData] = useState<DailyTargetResponse | null>(null);
  const [drillModule, setDrillModule] = useState<ModuleKey | "ALL" | null>(null);
  const [drillZone, setDrillZone] = useState("ALL");
  const [drillWard, setDrillWard] = useState("ALL");

  const loadLiveTargets = async (initial = false) => {
    if (initial) setLoading(true);
    else setLocalRefreshing(true);

    try {
      const params = new URLSearchParams({ date });
      if (cityId) params.set("cityId", cityId);

      const response = await apiFetch<DailyTargetResponse>(
        `/city/dashboard/daily-target-status?${params.toString()}`
      );

      setData(response);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Daily target status refresh failed", error);
      // Keep the last valid snapshot instead of replacing it with fake zeroes.
    } finally {
      setLoading(false);
      setLocalRefreshing(false);
    }
  };

  useEffect(() => {
    void loadLiveTargets(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, cityId, refreshKey]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void loadLiveTargets(false);
      }
    };

    const timer = window.setInterval(refreshIfVisible, 60_000);
    window.addEventListener("focus", refreshIfVisible);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshIfVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, cityId]);

  const moduleData = useMemo(
    () =>
      MODULES.map((module) => ({
        ...module,
        ...(data?.modules?.[module.key] || EMPTY_SUMMARY),
      })),
    [data]
  );

  const overall = data?.overall || EMPTY_SUMMARY;

  const drillRows = useMemo(() => {
    const rows = data?.supervisors || [];
    return rows
      .filter((row) => drillModule === "ALL" || !drillModule || row.module === drillModule)
      .sort(
        (a, b) =>
          a.supervisorName.localeCompare(b.supervisorName) ||
          a.zoneName.localeCompare(b.zoneName) ||
          a.wardName.localeCompare(b.wardName)
      );
  }, [data, drillModule]);

  const zoneOptions = useMemo(
    () =>
      Array.from(new Set(drillRows.map((row) => row.zoneName).filter(Boolean))).sort(),
    [drillRows]
  );

  const wardOptions = useMemo(
    () =>
      Array.from(
        new Set(
          drillRows
            .filter((row) => drillZone === "ALL" || row.zoneName === drillZone)
            .map((row) => row.wardName)
            .filter(Boolean)
        )
      ).sort(),
    [drillRows, drillZone]
  );

  const visibleDrillRows = useMemo(
    () =>
      drillRows.filter(
        (row) =>
          (drillZone === "ALL" || row.zoneName === drillZone) &&
          (drillWard === "ALL" || row.wardName === drillWard)
      ),
    [drillRows, drillZone, drillWard]
  );

  const drillTotals = useMemo(
    () => {
      const target = visibleDrillRows.reduce((sum, row) => sum + row.target, 0);
      const submitted = visibleDrillRows.reduce((sum, row) => sum + row.submitted, 0);
      const pending = Math.max(0, target - submitted);
      const completion = target ? Math.min(100, Math.round((submitted * 100) / target)) : 0;
      return { target, submitted, pending, completion };
    },
    [visibleDrillRows]
  );

  const openDrilldown = (module: ModuleKey | "ALL") => {
    setDrillModule(module);
    setDrillZone("ALL");
    setDrillWard("ALL");
  };

  const refresh = async () => {
    if (onRefresh) await onRefresh();
    await loadLiveTargets(false);
  };

  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const busy = loading || localRefreshing || refreshing;

  return (
    <>
      <section className="overflow-hidden rounded-[24px] border border-[#e4ebf5] bg-white shadow-[0_10px_30px_rgba(25,51,89,.055)]">
        <div className="flex min-h-[74px] items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-b from-white to-[#fbfdff] px-[22px] py-[18px] max-md:flex-col max-md:items-start">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl border border-[#d9e6ff] bg-[#eef4ff] text-[#2f6fed]">
              <Target size={18} />
            </div>
            <div>
              <h2 className="m-0 text-[16px] font-extrabold leading-tight tracking-[-.012em] text-[#1b2942]">
                DAILY TARGET STATUS
              </h2>
              <div className="mt-[3px] text-[11px] font-semibold text-[#8a98ac]">
                City-wide report targets across all zones and wards - {displayDate}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 max-md:w-full max-md:justify-between">
            <div className="inline-flex h-[34px] items-center gap-2 rounded-[10px] border border-[#dfe7f2] bg-[#fafcff] px-3 text-[10px] font-bold text-[#708098] max-sm:hidden">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,.08)]" />
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}`
                : "Live status"}
            </div>

            <button
              type="button"
              onClick={refresh}
              disabled={busy}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border border-[#e0e7f0] bg-[#fafcff] px-3 text-[11px] font-bold text-[#708098] transition hover:border-[#cdddf8] hover:bg-[#f5f8ff] hover:text-[#2f6fed] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-[10px] border-b border-slate-100 bg-[#fbfdff] px-[22px] py-[14px] max-md:grid-cols-2 max-sm:px-3.5">
          <button
            type="button"
            onClick={() => openDrilldown("ALL")}
            className="min-h-[62px] rounded-[14px] border border-[#dbe7fb] bg-white px-[13px] py-[11px] text-left transition hover:border-[#bcd2f8] hover:shadow-sm"
            title="View supervisor-wise daily targets"
          >
            <div className="text-[8px] font-black uppercase tracking-[.07em] text-[#8a98ac]">
              Overall Daily Target
            </div>
            <div className="mt-1 text-[20px] font-black leading-none text-[#17243c]">
              {loading && !data ? "-" : overall.target}
            </div>
            <div className="mt-1.5 text-[8px] font-extrabold text-[#2f6fed]">
              View supervisor breakdown →
            </div>
          </button>

          {[
            ["Submitted Reports", loading && !data ? "-" : overall.submitted],
            ["Pending Reports", loading && !data ? "-" : overall.pending],
            ["Target Completion", loading && !data ? "-" : `${overall.completion}%`],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="min-h-[62px] rounded-[14px] border border-[#e7edf5] bg-white px-[13px] py-[11px]"
            >
              <div className="text-[8px] font-black uppercase tracking-[.07em] text-[#8a98ac]">
                {label}
              </div>
              <div className="mt-1 text-[20px] font-black leading-none text-[#17243c]">
                {value}
              </div>
            </div>
          ))}
        </div>

        {loading && !data ? (
          <div className="px-5 py-8 text-center text-[11px] font-bold text-slate-400">
            Loading live daily targets...
          </div>
        ) : !data ? (
          <div className="px-5 py-8 text-center text-[11px] font-bold text-rose-400">
            Live target data could not be loaded. Use Refresh to try again.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[14px] px-[22px] py-[18px] pb-[22px] max-xl:grid-cols-1 max-sm:px-3.5">
            {moduleData.map((module) => (
              <article
                key={module.key}
                role="button"
                tabIndex={0}
                onClick={() => openDrilldown(module.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") openDrilldown(module.key);
                }}
                className="relative min-w-0 cursor-pointer overflow-hidden rounded-[18px] border transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(28,52,90,.08)]"
                style={{
                  borderColor: module.border,
                  background: `linear-gradient(145deg,#fff 0%,${module.soft} 160%)`,
                }}
                title={`View ${module.name} supervisor targets`}
              >
                <span
                  className="absolute inset-y-0 left-0 w-[3px]"
                  style={{ background: module.color }}
                />

                <div className="flex items-center justify-between gap-2 px-[15px] pb-3 pt-[15px] pl-[17px]">
                  <div className="flex min-w-0 items-center gap-[10px]">
                    <div
                      className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl border bg-white"
                      style={{ color: module.color, borderColor: module.border }}
                    >
                      <module.Icon size={19} strokeWidth={1.9} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-extrabold text-[#1c2b44]">
                        {module.name}
                      </div>
                      <div className="mt-[3px] text-[9px] font-semibold text-[#8b98aa]">
                        City-wide supervisor target
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <strong
                      className="block text-[18px] font-black leading-none"
                      style={{ color: module.color }}
                    >
                      {module.completion}%
                    </strong>
                    <span className="text-[8px] font-bold uppercase tracking-[.05em] text-slate-400">
                      report target
                    </span>
                  </div>
                </div>

                <div className="px-[15px] pb-[14px] pl-[17px]">
                  <div className="mb-[7px] flex justify-between gap-2 text-[9px] font-bold text-slate-500">
                    <span>
                      {module.submitted} of {module.target} reports submitted
                    </span>
                    <span>{module.pending} pending</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#e8edf4]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${module.completion}%`, background: module.color }}
                    />
                  </div>
                </div>

                <div className="grid gap-[10px] px-3 pb-[13px] pl-[14px]">
                  <div className="rounded-[14px] border border-slate-200/90 bg-white/80 p-[11px]">
                    <div className="mb-[9px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.055em] text-slate-500">
                        <FileText size={12} /> Report Status
                      </div>
                      <span className="text-[8px] font-extrabold text-[#2f6fed]">
                        View supervisors →
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Metric Icon={FileText} label="Target Reports" value={module.target} />
                      <Metric Icon={FileCheck2} label="Submitted" value={module.submitted} />
                      <Metric Icon={Clock3} label="Pending" value={module.pending} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {drillModule && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
          onClick={() => setDrillModule(null)}
        >
          <div
            className="flex max-h-[82vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-[#fbfdff] px-5 py-4">
              <div>
                <div className="text-[14px] font-black text-[#17243c]">
                  {drillModule === "ALL"
                    ? "Supervisor Daily Target Breakdown"
                    : `${MODULES.find((module) => module.key === drillModule)?.name || drillModule} - Supervisor Targets`}
                </div>
                <div className="mt-1 text-[10px] font-semibold text-slate-400">
                  Zone and ward-wise individual target, submitted and pending reports - {displayDate}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrillModule(null)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-[18px] font-medium text-slate-500 hover:bg-slate-50"
                aria-label="Close supervisor target breakdown"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 border-b border-slate-100 bg-white px-5 py-3 max-md:grid-cols-2">
              {[
                ["Target", drillTotals.target],
                ["Submitted", drillTotals.submitted],
                ["Pending", drillTotals.pending],
                ["Completion", `${drillTotals.completion}%`],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="text-[8px] font-black uppercase tracking-wide text-slate-400">{label}</div>
                  <div className="mt-1 text-[16px] font-black text-slate-800">{value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
              <select
                value={drillZone}
                onChange={(event) => {
                  setDrillZone(event.target.value);
                  setDrillWard("ALL");
                }}
                className="h-9 min-w-[170px] rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 outline-none"
              >
                <option value="ALL">All Zones</option>
                {zoneOptions.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>

              <select
                value={drillWard}
                onChange={(event) => setDrillWard(event.target.value)}
                className="h-9 min-w-[170px] rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 outline-none"
              >
                <option value="ALL">All Wards</option>
                {wardOptions.map((ward) => (
                  <option key={ward} value={ward}>
                    {ward}
                  </option>
                ))}
              </select>

              <div className="ml-auto self-center text-[9px] font-bold text-slate-400">
                {visibleDrillRows.length} supervisor scope row{visibleDrillRows.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200 text-[8px] font-black uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Supervisor</th>
                    {drillModule === "ALL" && <th className="px-4 py-3">Module</th>}
                    <th className="px-4 py-3">Zone</th>
                    <th className="px-4 py-3">Ward</th>
                    <th className="px-4 py-3 text-right">Target</th>
                    <th className="px-4 py-3 text-right">Submitted</th>
                    <th className="px-4 py-3 text-right">Pending</th>
                    <th className="px-4 py-3 text-right">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleDrillRows.map((row, index) => {
                    const moduleInfo = MODULES.find((module) => module.key === row.module);
                    const isUnassigned = !row.supervisorId;

                    return (
                      <tr
                        key={`${row.module}-${row.supervisorId || "UNASSIGNED"}-${row.zoneId || row.zoneName}-${row.wardId || row.wardName}-${index}`}
                        className="hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3">
                          <div className={`text-[11px] font-black ${isUnassigned ? "text-amber-700" : "text-slate-800"}`}>
                            {row.supervisorName}
                          </div>
                          {isUnassigned && (
                            <div className="mt-0.5 text-[8px] font-bold text-amber-500">
                              Needs supervisor assignment
                            </div>
                          )}
                        </td>
                        {drillModule === "ALL" && (
                          <td className="px-4 py-3">
                            <span
                              className="rounded-md px-2 py-1 text-[8px] font-black"
                              style={{ color: moduleInfo?.color, background: moduleInfo?.soft }}
                            >
                              {moduleInfo?.name || row.module}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-[10px] font-semibold text-slate-600">{row.zoneName}</td>
                        <td className="px-4 py-3 text-[10px] font-semibold text-slate-600">{row.wardName}</td>
                        <td className="px-4 py-3 text-right text-[11px] font-black text-slate-800">{row.target}</td>
                        <td className="px-4 py-3 text-right text-[11px] font-black text-emerald-600">{row.submitted}</td>
                        <td className="px-4 py-3 text-right text-[11px] font-black text-amber-600">{row.pending}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="rounded-lg bg-blue-50 px-2 py-1 text-[9px] font-black text-blue-700">
                            {row.completion}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {visibleDrillRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={drillModule === "ALL" ? 8 : 7}
                        className="px-5 py-12 text-center text-[11px] font-bold text-slate-400"
                      >
                        No supervisor targets found for the selected zone and ward.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
