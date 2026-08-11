"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BrushCleaning,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  RefreshCw,
  Target,
  Toilet,
  Trash2,
} from "lucide-react";
import { ModuleRecordsApi } from "@lib/apiClient";

type ModuleKey = "SWEEPING" | "TOILET" | "TWINBIN";
type DailyRecord = { status?: string; [key: string]: any };
type Props = {
  date: string;
  cityId?: string;
  targets: { sweeping: number; toilet: number; litterbin: number };
  refreshKey?: number;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
};

const MODULES = [
  { key: "SWEEPING" as const, api: "sweeping", name: "Sweeping", Icon: BrushCleaning, color: "#15976e", soft: "#edf9f5", border: "#cfeee3" },
  { key: "TOILET" as const, api: "toilet", name: "Cleanliness of Toilets", Icon: Toilet, color: "#3974df", soft: "#eff5ff", border: "#d2e2ff" },
  { key: "TWINBIN" as const, api: "twinbin", name: "Litter Bins", Icon: Trash2, color: "#d98112", soft: "#fff7e9", border: "#f4dfb8" },
];

const COMPLETE = new Set(["APPROVED", "REJECTED", "ACTION_REQUIRED", "ACTION_TAKEN", "RESOLVED"]);
const pct = (value: number, target: number) => target > 0 ? Math.min(100, Math.max(0, Math.round((value / target) * 100))) : 0;
const normalized = (value: unknown) => String(value || "").trim().toUpperCase();

async function getDailyRecords(moduleKey: string, date: string, cityId?: string) {
  const first = await ModuleRecordsApi.getRecords(moduleKey, { page: 1, limit: 200, fromDate: date, toDate: date, cityId });
  const rows: DailyRecord[] = [...(first.data || [])];
  const pages = Math.min(first.meta?.totalPages || 1, 25);
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        ModuleRecordsApi.getRecords(moduleKey, { page: i + 2, limit: 200, fromDate: date, toDate: date, cityId })
          .catch(() => ({ data: [] } as any))
      )
    );
    rest.forEach((res) => rows.push(...(res.data || [])));
  }
  return rows;
}

function Metric({ label, value, Icon }: { label: string; value: number; Icon: React.ElementType }) {
  return (
    <div className="min-w-0 rounded-[10px] bg-slate-50 px-2 py-2 text-center">
      <div className="text-[17px] font-black leading-none text-[#17243c]">{value}</div>
      <div className="mt-1 flex items-center justify-center gap-1 text-[7px] font-extrabold uppercase tracking-[.035em] text-slate-400">
        <Icon size={9} /> {label}
      </div>
    </div>
  );
}

export default function TargetStatus({ date, cityId, targets, refreshKey = 0, refreshing = false, onRefresh }: Props) {
  const [loading, setLoading] = useState(true);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [records, setRecords] = useState<Record<ModuleKey, DailyRecord[]>>({ SWEEPING: [], TOILET: [], TWINBIN: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await Promise.all(MODULES.map(async (m) => {
        try { return [m.key, await getDailyRecords(m.api, date, cityId)] as const; }
        catch { return [m.key, [] as DailyRecord[]] as const; }
      }));
      if (!cancelled) {
        setRecords(Object.fromEntries(result) as Record<ModuleKey, DailyRecord[]>);
        setLastUpdated(new Date());
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [date, cityId, refreshKey, localRefresh]);

  const data = useMemo(() => {
    const targetMap: Record<ModuleKey, number> = {
      SWEEPING: Math.max(0, Number(targets.sweeping) || 0),
      TOILET: Math.max(0, Number(targets.toilet) || 0),
      TWINBIN: Math.max(0, Number(targets.litterbin) || 0),
    };
    return MODULES.map((m) => {
      const rows = records[m.key] || [];
      const target = targetMap[m.key];
      const submitted = rows.length;
      const completed = rows.filter((r) => COMPLETE.has(normalized(r.status))).length;
      return {
        ...m, target, submitted, completed,
        pendingInspection: Math.max(0, target - completed),
        pendingReports: Math.max(0, target - submitted),
      };
    });
  }, [records, targets]);

  const overall = useMemo(() => {
    const target = data.reduce((s, m) => s + m.target, 0);
    const completed = data.reduce((s, m) => s + m.completed, 0);
    const submitted = data.reduce((s, m) => s + m.submitted, 0);
    return { target, completed, submitted, completion: pct(completed, target) };
  }, [data]);

  const refresh = async () => {
    if (onRefresh) await onRefresh();
    setLocalRefresh((v) => v + 1);
  };

  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#e4ebf5] bg-white shadow-[0_10px_30px_rgba(25,51,89,.055)]">
      <div className="flex min-h-[74px] items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-b from-white to-[#fbfdff] px-[22px] py-[18px] max-md:flex-col max-md:items-start">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl border border-[#d9e6ff] bg-[#eef4ff] text-[#2f6fed]"><Target size={18} /></div>
          <div>
            <h2 className="m-0 text-[16px] font-extrabold leading-tight tracking-[-.012em] text-[#1b2942]">DAILY TARGET STATUS</h2>
            <div className="mt-[3px] text-[11px] font-semibold text-[#8a98ac]">Inspection and report progress by module - {displayDate}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 max-md:w-full max-md:justify-between">
          <div className="inline-flex h-[34px] items-center gap-2 rounded-[10px] border border-[#dfe7f2] bg-[#fafcff] px-3 text-[10px] font-bold text-[#708098] max-sm:hidden">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,.08)]" />
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}` : "Live status"}
          </div>
          <button type="button" onClick={refresh} disabled={loading || refreshing} className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border border-[#e0e7f0] bg-[#fafcff] px-3 text-[11px] font-bold text-[#708098] transition hover:border-[#cdddf8] hover:bg-[#f5f8ff] hover:text-[#2f6fed] disabled:cursor-not-allowed disabled:opacity-60">
            <RefreshCw size={12} className={loading || refreshing ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[10px] border-b border-slate-100 bg-[#fbfdff] px-[22px] py-[14px] max-md:grid-cols-2 max-sm:px-3.5">
        {[
          ["Overall Daily Target", overall.target],
          ["Completed Inspections", loading ? "-" : overall.completed],
          ["Submitted Reports", loading ? "-" : overall.submitted],
          ["Target Completion", loading ? "-" : `${overall.completion}%`],
        ].map(([label, value]) => (
          <div key={String(label)} className="min-h-[62px] rounded-[14px] border border-[#e7edf5] bg-white px-[13px] py-[11px]">
            <div className="text-[8px] font-black uppercase tracking-[.07em] text-[#8a98ac]">{label}</div>
            <div className="mt-1 text-[20px] font-black leading-none text-[#17243c]">{value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="px-5 py-8 text-center text-[11px] font-bold text-slate-400">Loading daily target status...</div>
      ) : (
        <div className="grid grid-cols-3 gap-[14px] px-[22px] py-[18px] pb-[22px] max-xl:grid-cols-1 max-sm:px-3.5">
          {data.map((m) => {
            const reportPct = pct(m.submitted, m.target);
            const inspectionPct = pct(m.completed, m.target);
            return (
              <article key={m.key} className="relative min-w-0 overflow-hidden rounded-[18px] border transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(28,52,90,.08)]" style={{ borderColor: m.border, background: `linear-gradient(145deg,#fff 0%,${m.soft} 160%)` }}>
                <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: m.color }} />
                <div className="flex items-center justify-between gap-2 px-[15px] pb-3 pt-[15px] pl-[17px]">
                  <div className="flex min-w-0 items-center gap-[10px]">
                    <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl border bg-white" style={{ color: m.color, borderColor: m.border }}><m.Icon size={19} strokeWidth={1.9} /></div>
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-extrabold text-[#1c2b44]">{m.name}</div>
                      <div className="mt-[3px] text-[9px] font-semibold text-[#8b98aa]">Daily operational target</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right"><strong className="block text-[18px] font-black leading-none" style={{ color: m.color }}>{reportPct}%</strong><span className="text-[8px] font-bold uppercase tracking-[.05em] text-slate-400">report target</span></div>
                </div>

                <div className="px-[15px] pb-[14px] pl-[17px]">
                  <div className="mb-[7px] flex justify-between gap-2 text-[9px] font-bold text-slate-500"><span>{m.submitted} of {m.target} reports submitted</span><span>{m.pendingReports} pending</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#e8edf4]"><div className="h-full rounded-full transition-all" style={{ width: `${reportPct}%`, background: m.color }} /></div>
                </div>

                <div className="grid gap-[10px] px-3 pb-[13px] pl-[14px]">
                  <div className="rounded-[14px] border border-slate-200/90 bg-white/80 p-[11px]">
                    <div className="mb-[9px] flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.055em] text-slate-500"><CheckCircle2 size={12} /> Inspection Status</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Metric Icon={Target} label="Daily Target" value={m.target} />
                      <Metric Icon={CheckCircle2} label="Completed" value={m.completed} />
                      <Metric Icon={Clock3} label="Pending" value={m.pendingInspection} />
                    </div>
                    <div className="mt-[9px] h-1.5 overflow-hidden rounded-full bg-[#e8edf4]"><div className="h-full rounded-full" style={{ width: `${inspectionPct}%`, background: m.color }} /></div>
                  </div>

                  <div className="rounded-[14px] border border-slate-200/90 bg-white/80 p-[11px]">
                    <div className="mb-[9px] flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.055em] text-slate-500"><FileText size={12} /> Report Status</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Metric Icon={FileText} label="Target Reports" value={m.target} />
                      <Metric Icon={FileCheck2} label="Submitted" value={m.submitted} />
                      <Metric Icon={Clock3} label="Pending" value={m.pendingReports} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}