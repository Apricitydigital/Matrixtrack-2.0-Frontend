'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Factory, Loader2, RefreshCw } from 'lucide-react';
import ProcessingPlantFilters from './ProcessingPlantFilters';
import ProcessingPlantKpiCards from './ProcessingPlantKpiCards';
import WasteProcessingFlow from './WasteProcessingFlow';
import ProcessingTrendChart from './ProcessingTrendChart';
import PlantPerformanceChart from './PlantPerformanceChart';
import PlantPerformanceTable from './PlantPerformanceTable';
import PlantDetailDrawer from './PlantDetailDrawer';
import MetricDrillDownDrawer from './MetricDrillDownDrawer';
import ProcessingPlantExcelUpload from './ProcessingPlantExcelUpload';
import { getProcessingPlantDashboard, getProcessingPlants } from '../../services/processingPlantService';
import type { ProcessingMetricKey, ProcessingPlant, ProcessingPlantDashboardData, ProcessingPlantFiltersState, ProcessingPlantPerformanceRow } from '../../types/processingPlant';
import { formatMetric, lastNDaysRange, normalizeDashboardPayload } from '../../utils/processingPlantAnalytics';

function timeAgo(date: Date | null) {
  if (!date) return 'Waiting for data';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 10) return 'Updated just now';
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  return `Updated ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function ProcessingPlantDashboard() {
  const [filters, setFilters] = useState<ProcessingPlantFiltersState>({ ...lastNDaysRange(30), plantType: '', plantId: '' });
  const [plants, setPlants] = useState<ProcessingPlant[]>([]);
  const [data, setData] = useState<ProcessingPlantDashboardData>(() => normalizeDashboardPayload({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<ProcessingPlantPerformanceRow | null>(null);
  const [metric, setMetric] = useState<ProcessingMetricKey | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadPlants = async () => {
    try {
      const rows = await getProcessingPlants();
      setPlants(rows);
    } catch {
      setPlants([]);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getProcessingPlantDashboard(filters);
      setData(normalizeDashboardPayload(result));
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load processing plant dashboard');
    } finally {
      setLoading(false);
    }
  };

  // After an Excel upload, show the uploaded period for all plants so the new data (and anything missing) is visible at once.
  const handleUploaded = (uploaded: { from: string; to: string } | null) => {
    let range = uploaded;
    // the dashboard API accepts at most 366 days - keep the most recent part
    if (range) {
      const spanDays = (Date.parse(range.to) - Date.parse(range.from)) / 86400000;
      if (spanDays > 365) {
        const start = new Date(Date.parse(range.to) - 365 * 86400000);
        range = { from: start.toISOString().slice(0, 10), to: range.to };
      }
    }
    if (!range || (range.from === filters.from && range.to === filters.to && !filters.plantType && !filters.plantId)) {
      loadDashboard();
    } else {
      setFilters({ from: range.from, to: range.to, plantType: '', plantId: '' });
    }
    loadPlants();
  };

  useEffect(() => { loadPlants(); }, []);
  useEffect(() => { loadDashboard(); }, [filters.from, filters.to, filters.plantType, filters.plantId]);

  const recoveryTotal = useMemo(() => data.materialRecovery.reduce((sum, item) => sum + item.quantity, 0), [data.materialRecovery]);
  const materialRows = useMemo(() => [...data.materialRecovery].sort((a, b) => b.quantity - a.quantity).slice(0, 7), [data.materialRecovery]);

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-indigo-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8faff_48%,#f5f3ff_100%)] p-5 shadow-[0_18px_46px_-30px_rgba(79,70,229,.45)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-200/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-violet-200/25 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-indigo-700">
              <Factory size={11} /> City-level Processing Intelligence
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Plant & Processing Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">Monitor city-wide waste inflow, processing, recovery, residuals, plant performance, reporting health and operational exceptions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2 text-xs font-bold text-slate-500 shadow-sm backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <Clock3 size={13} />{timeAgo(lastUpdated)}
            </div>
            <ProcessingPlantExcelUpload onUploaded={handleUploaded} />
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-[linear-gradient(145deg,#312e81_0%,#4f46e5_45%,#7c3aed_100%)] px-4 py-2.5 text-xs font-black text-white shadow-[0_14px_28px_-14px_rgba(79,70,229,.75)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-14px_rgba(79,70,229,.8)] disabled:opacity-60"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </section>

      <ProcessingPlantFilters filters={filters} plants={plants} onChange={setFilters} />

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><div className="text-sm font-black">Dashboard API could not be loaded</div><div className="mt-1 whitespace-pre-wrap break-words text-xs font-medium">{error}</div></div></div>
      )}

      {loading && !error ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[118px] animate-pulse rounded-[22px] border border-slate-200 bg-slate-100" />
            ))}
          </div>
          <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="text-center">
              <Loader2 size={30} className="mx-auto animate-spin text-blue-600" />
              <div className="mt-3 text-sm font-black text-slate-700">Loading processing analytics...</div>
              <div className="mt-1 text-xs font-medium text-slate-400">Applying city and dashboard filters</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ProcessingPlantKpiCards data={data} onSelect={setMetric} />

          <WasteProcessingFlow data={data} onSelect={setMetric} />

          <ProcessingTrendChart trend={data.trend} />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PlantPerformanceChart rows={data.plantPerformance} onSelect={setSelectedPlant} />

            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Recovery Analytics</div>
                  <h2 className="mt-1 text-lg font-black text-slate-900">Material Recovery Mix</h2>
                  <p className="text-xs font-medium text-slate-500">Recovered material composition from available data.</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right"><div className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Recovered</div><div className="text-sm font-black text-emerald-800">{formatMetric(data.totalRecovered)}</div></div>
              </div>
              <div className="mt-5 space-y-3">
                {materialRows.length === 0 ? <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">No material recovery breakdown available.</div> : materialRows.map((item) => {
                  const share = item.percentage || (recoveryTotal > 0 ? (item.quantity / recoveryTotal) * 100 : 0);
                  return <div key={item.name}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-xs font-black text-slate-700">{item.name}</span><span className="text-xs font-bold text-slate-500">{formatMetric(item.quantity)} · {share.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700" style={{ width: `${Math.min(Math.max(share, 0), 100)}%` }} /></div></div>;
                })}
              </div>
            </section>
          </div>

          <PlantPerformanceTable rows={data.plantPerformance} onSelect={setSelectedPlant} />
        </>
      )}

      <MetricDrillDownDrawer
        metric={metric}
        data={data}
        filters={filters}
        onClose={() => setMetric(null)}
        onSelectPlant={(row) => {
          setMetric(null);
          setSelectedPlant(row);
        }}
      />

      <PlantDetailDrawer row={selectedPlant} filters={filters} onClose={() => setSelectedPlant(null)} />
    </div>
  );
}
