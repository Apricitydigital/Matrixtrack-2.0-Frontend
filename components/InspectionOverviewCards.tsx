'use client';

import { CheckCircle2, Clock3, Layers3, Target } from 'lucide-react';
import type { inspectionOverview } from '@lib/inspectionOverview';

/** Shared summary for ULB and Commissioner inspection workspaces. */
export default function InspectionOverviewCards({ overview, days, loading, onPending }: {
  overview: ReturnType<typeof inspectionOverview>;
  days: number | null;
  loading: boolean;
  onPending: () => void;
}) {
  const names: Record<string, string> = { TOILET: 'Toilet', LITTERBINS: 'Litter Bin', SWEEPING: 'Sweeping', NALA: 'Nala', TASKFORCE: 'GVP' };
  const completionFormula = Object.entries(overview.completedByModule ?? {}).filter(([, value]) => (value ?? 0) > 0).map(([module, value]) => `${names[module]} ${value!.toLocaleString()}`).join(' + ');
  return <div className="grid grid-cols-2 gap-3 px-4 pt-4 xl:grid-cols-4" aria-label="Inspection overview" aria-busy={loading}>
    {[
      { label: 'Total', value: overview.total, hint: 'Registered inspection assets', icon: Layers3, color: 'text-slate-700', bg: 'bg-slate-100' },
      { label: 'Targeted', value: overview.target, hint: days === null ? 'Choose a date range' : `${days} days; full inventory by default`, icon: Target, color: 'text-violet-600', bg: 'bg-violet-50' },
      { label: 'Completed Inspection', value: overview.credit, hint: completionFormula || 'Inspections credited to the target', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Pending Inspection', value: overview.pending, hint: 'Targeted minus completed', icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-50' },
    ].map(card => {
      const Icon = card.icon;
      const isPending = card.label === 'Pending Inspection';
      const Card = isPending ? 'button' : 'div';
      return <Card key={card.label} {...(isPending ? { type: 'button' as const, onClick: onPending, disabled: card.value == null, 'aria-label': 'View pending inspections' } : {})} className={`rounded-2xl border border-slate-200 bg-white p-4 text-left ${isPending ? 'transition hover:border-amber-400 hover:shadow-sm disabled:cursor-not-allowed' : ''}`}>
        <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.bg}`}><Icon className={`h-5 w-5 ${card.color}`} /></div>
        <div className={`text-2xl font-black leading-none ${card.color}`}>{card.value == null ? '\u2014' : card.value.toLocaleString()}</div>
        <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">{card.label}</div>
        <p className="mt-1 text-[11px] text-slate-400">{card.hint}</p>
      </Card>;
    })}
  </div>;
}
