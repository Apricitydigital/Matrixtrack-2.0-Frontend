'use client';

import React, { useEffect, useMemo } from 'react';
import { ChevronRight, Droplets, Factory, Gauge, PackageCheck, Recycle, Trash2, Truck, X, type LucideIcon } from 'lucide-react';
import ModalPortal from '@components/ui/ModalPortal';
import type {
  ProcessingMetricKey,
  ProcessingPlantDashboardData,
  ProcessingUnitTotals,
  ProcessingPlantFiltersState,
  ProcessingPlantPerformanceRow,
} from '../../types/processingPlant';
import { formatMetric, formatPercent } from '../../utils/processingPlantAnalytics';

type Props = {
  metric: ProcessingMetricKey | null;
  data: ProcessingPlantDashboardData;
  /** Totals of the unit family chosen on the dashboard (MT / KL / ML). */
  totals: ProcessingUnitTotals;
  filters: ProcessingPlantFiltersState;
  onClose: () => void;
  onSelectPlant: (row: ProcessingPlantPerformanceRow) => void;
};

type QuantityKey = 'received' | 'processed' | 'recovered' | 'reject' | 'loss';

const quantityOf = (row: ProcessingPlantPerformanceRow, key: QuantityKey) => (key === 'loss' ? row.processLoss : row[key]);

const META: Record<ProcessingMetricKey, { title: string; subtitle: string; icon: LucideIcon; bar: string }> = {
  received: { title: 'Waste Received', subtitle: 'Plants ranked by input received in the selected period', icon: Truck, bar: 'from-blue-500 to-cyan-400' },
  processed: { title: 'Waste Processed', subtitle: 'Plants ranked by waste processed (received minus reject)', icon: PackageCheck, bar: 'from-emerald-500 to-teal-400' },
  recovered: { title: 'Material Recovered', subtitle: 'Plants ranked by useful material / product recovered', icon: Recycle, bar: 'from-violet-500 to-indigo-400' },
  reject: { title: 'Reject / Residual', subtitle: 'Plants ranked by residual output generated', icon: Trash2, bar: 'from-rose-500 to-orange-400' },
  loss: { title: 'Process Loss / Moisture', subtitle: 'Loss and moisture reported by each plant (input minus output and reject)', icon: Droplets, bar: 'from-slate-500 to-slate-400' },
  efficiency: { title: 'Processing Efficiency', subtitle: 'Recovered ÷ received (the Excel Recovery %), per plant', icon: Gauge, bar: 'from-amber-500 to-yellow-400' },
  reporting: { title: 'Reporting Plants', subtitle: 'Which plants sent data, and for how many days', icon: Factory, bar: 'from-slate-700 to-slate-500' },
};

const STATUS_ORDER: Record<string, number> = { NOT_REPORTED: 0, PARTIAL: 1, REPORTED: 2 };

const STATUS_STYLE: Record<string, string> = {
  NOT_REPORTED: 'bg-rose-50 text-rose-600',
  PARTIAL: 'bg-amber-50 text-amber-600',
  REPORTED: 'bg-emerald-50 text-emerald-600',
};

function unitSuffix(row: ProcessingPlantPerformanceRow) {
  return ` ${row.unit || 'MT'}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function tierGradient(efficiency: number) {
  if (efficiency >= 85) return 'from-emerald-500 to-teal-400';
  if (efficiency >= 70) return 'from-amber-500 to-yellow-400';
  return 'from-rose-500 to-orange-400';
}

function PlantRow({
  row,
  primary,
  secondary,
  fill,
  gradient,
  onSelect,
  dim,
}: {
  row: ProcessingPlantPerformanceRow;
  primary: string;
  secondary?: string;
  fill: number;
  gradient: string;
  onSelect: (row: ProcessingPlantPerformanceRow) => void;
  dim?: boolean;
}) {
  return (
    <button onClick={() => onSelect(row)} className={`group flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-slate-50 ${dim ? 'opacity-60' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-xs font-black text-slate-800 group-hover:text-blue-600">{row.plantName}</div>
            {row.plantType && <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{row.plantType}</div>}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-black text-slate-900">{primary}</div>
            {secondary && <div className="text-[10px] font-bold text-slate-400">{secondary}</div>}
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`} style={{ width: `${Math.min(Math.max(fill, 0), 100)}%` }} />
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
    </button>
  );
}

function SectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{children}</div>
      {note && <p className="mt-1 text-[11px] font-medium text-slate-400">{note}</p>}
    </div>
  );
}

export default function MetricDrillDownDrawer({ metric, data, totals, filters, onClose, onSelectPlant }: Props) {
  useEffect(() => {
    if (!metric) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [metric, onClose]);

  const rows = data.plantPerformance;

  const summary = useMemo(() => {
    switch (metric) {
      case 'received': return formatMetric(totals.received, ` ${totals.unit}`);
      case 'processed': return formatMetric(totals.processed, ` ${totals.unit}`);
      case 'recovered': return formatMetric(totals.recovered, ` ${totals.unit}`);
      case 'reject': return formatMetric(totals.reject, ` ${totals.unit}`);
      case 'loss': return formatMetric(totals.processLoss, ` ${totals.unit}`);
      case 'efficiency': return totals.hasEfficiency ? formatPercent(totals.efficiency) : 'n/a';
      case 'reporting': return `${data.reportingPlants || 0}/${data.totalPlants || 0}`;
      default: return '';
    }
  }, [metric, data, totals]);

  if (!metric) return null;

  const meta = META[metric];
  const Icon = meta.icon;

  const renderQuantity = (key: QuantityKey) => {
    const unit = totals.unit;
    const total = { received: totals.received, processed: totals.processed, recovered: totals.recovered, reject: totals.reject, loss: totals.processLoss }[key];
    const byValue = (a: ProcessingPlantPerformanceRow, b: ProcessingPlantPerformanceRow) => quantityOf(b, key) - quantityOf(a, key);
    const inUnit = (row: ProcessingPlantPerformanceRow) => (row.unit || 'MT') === unit;
    const main = rows.filter(inUnit).sort(byValue);
    const others = rows.filter((row) => !inUnit(row)).sort(byValue);
    const othersMax = others.length ? Math.max(quantityOf(others[0], key), 0) : 0;
    const material = data.materialRecoveryByUnit[unit] ?? (unit === 'MT' ? data.materialRecovery : []);

    const secondaryFor = (row: ProcessingPlantPerformanceRow) => {
      if (key === 'received') return row.daysReported !== undefined ? `${row.daysReported} days reported` : undefined;
      if (key === 'processed') return row.received > 0 ? `${formatPercent((row.processed / row.received) * 100)} of received` : undefined;
      return row.received > 0 ? `${formatPercent((quantityOf(row, key) / row.received) * 100)} of received` : undefined;
    };

    return (
      <>
        <div className="space-y-1">
          <SectionTitle note="These plants add up to the total shown on the dashboard.">Plants measured in {unit}</SectionTitle>
          {main.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-bold text-slate-400">No plants.</div>
          ) : (
            main.map((row) => (
              <PlantRow
                key={row.plantId || row.plantName}
                row={row}
                primary={`${formatMetric(quantityOf(row, key), unitSuffix(row))}`}
                secondary={total > 0 ? `${formatPercent((quantityOf(row, key) / total) * 100)} of total · ${secondaryFor(row) ?? ''}`.replace(/ · $/, '') : secondaryFor(row)}
                fill={total > 0 ? (quantityOf(row, key) / Math.max(quantityOf(main[0], key), 0.0001)) * 100 : 0}
                gradient={meta.bar}
                onSelect={onSelectPlant}
                dim={quantityOf(row, key) === 0}
              />
            ))
          )}
        </div>

        {key === 'recovered' && material.length > 0 && (
          <div className="space-y-2">
            <SectionTitle note={`Recovered quantity added up across the ${unit} plants.`}>By material</SectionTitle>
            {material.map((item) => (
              <div key={item.name}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-slate-700">{item.name}</span>
                  <span className="text-xs font-bold text-slate-500">{formatMetric(item.quantity, ` ${unit}`)} · {(item.percentage ?? 0).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${Math.min(item.percentage ?? 0, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {others.length > 0 && (
          <div className="space-y-1">
            <SectionTitle note={`Measured in a different unit, so they are not part of the ${unit} total above.`}>Other plants · own unit</SectionTitle>
            {others.map((row) => (
              <PlantRow
                key={row.plantId || row.plantName}
                row={row}
                primary={formatMetric(quantityOf(row, key), unitSuffix(row))}
                secondary={secondaryFor(row)}
                fill={othersMax > 0 ? (quantityOf(row, key) / othersMax) * 100 : 0}
                gradient={meta.bar}
                onSelect={onSelectPlant}
                dim={quantityOf(row, key) === 0}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  const renderEfficiency = () => {
    const hasEfficiency = (row: ProcessingPlantPerformanceRow) => row.received > 0 && row.efficiencyAvailable !== false;
    const withData = rows.filter(hasEfficiency).sort((a, b) => b.efficiency - a.efficiency);
    const noData = rows.filter((row) => !hasEfficiency(row));

    return (
      <>
        <div className="space-y-1">
          <SectionTitle note="Recovered ÷ received. Green 85%+, amber 70–85%, red below 70%.">Plants with data</SectionTitle>
          {withData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-bold text-slate-400">No plant has received waste in this period.</div>
          ) : (
            withData.map((row) => (
              <PlantRow
                key={row.plantId || row.plantName}
                row={row}
                primary={formatPercent(row.efficiency)}
                secondary={`${formatMetric(row.recovered, unitSuffix(row))} recovered of ${formatMetric(row.received, unitSuffix(row))}`}
                fill={row.efficiency}
                gradient={tierGradient(row.efficiency)}
                onSelect={onSelectPlant}
              />
            ))
          )}
        </div>

        {noData.length > 0 && (
          <div className="space-y-1">
            <SectionTitle note="No received quantity, or the output is not measured in weight (e.g. electricity), so efficiency cannot be calculated.">No data ({noData.length})</SectionTitle>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {noData.map((row) => (
                <button key={row.plantId || row.plantName} onClick={() => onSelectPlant(row)} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-600">
                  {row.plantName}
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const renderReporting = () => {
    const sorted = [...rows].sort((a, b) => {
      const byStatus = (STATUS_ORDER[a.reportingStatus || ''] ?? 3) - (STATUS_ORDER[b.reportingStatus || ''] ?? 3);
      return byStatus || a.plantName.localeCompare(b.plantName);
    });
    const count = (status: string) => rows.filter((row) => row.reportingStatus === status).length;

    return (
      <>
        <div className="grid grid-cols-3 gap-2.5">
          {[['Reported', count('REPORTED'), 'text-emerald-600'], ['Partial', count('PARTIAL'), 'text-amber-600'], ['Not reported', count('NOT_REPORTED'), 'text-rose-600']].map(([label, value, tone]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
              <div className={`mt-0.5 text-xl font-black ${tone}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <SectionTitle note="Days with data out of the days in the selected period. Missing plants and days are listed first.">All plants</SectionTitle>
          {sorted.map((row) => {
            const status = row.reportingStatus || '';
            const pct = row.daysInRange ? ((row.daysReported || 0) / row.daysInRange) * 100 : 0;
            return (
              <button key={row.plantId || row.plantName} onClick={() => onSelectPlant(row)} className="group flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-black text-slate-800 group-hover:text-blue-600">{row.plantName}</div>
                      <div className="text-[10px] font-bold text-slate-400">Last data: {formatDate(row.lastSubmissionAt)}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${STATUS_STYLE[status] || 'bg-slate-100 text-slate-600'}`}>{status ? status.replace(/_/g, ' ') : '—'}</span>
                      {row.daysInRange ? <div className="mt-1 text-[10px] font-bold text-slate-400">{row.daysReported || 0}/{row.daysInRange} days</div> : null}
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${status === 'REPORTED' ? 'bg-emerald-500' : status === 'PARTIAL' ? 'bg-amber-400' : 'bg-rose-400'} transition-all duration-700`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
              </button>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40 backdrop-blur-sm" onClick={onClose}>
        <aside className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${meta.title} details`}>
          <div className="relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,#312e81_0%,#4f46e5_45%,#7c3aed_100%)] p-5 text-white">
            <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '17px 17px' }} />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur"><Icon size={20} /></div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-100/80">Drill-down</div>
                  <h2 className="mt-1 text-xl font-black leading-tight">{meta.title}</h2>
                  <div className="mt-0.5 text-xs font-bold text-white/60">{meta.subtitle}</div>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20"><X size={18} /></button>
            </div>

            <div className="relative mt-4 flex items-end justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div>
                <div className="text-[9px] font-black uppercase tracking-wider text-white/55">Total</div>
                <div className="text-2xl font-black">{summary}</div>
              </div>
              <div className="text-right text-[11px] font-bold text-white/60">{formatDate(filters.from)} – {formatDate(filters.to)}</div>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            {metric === 'efficiency' ? renderEfficiency() : metric === 'reporting' ? renderReporting() : renderQuantity(metric)}
          </div>
        </aside>
      </div>
    </ModalPortal>
  );
}
