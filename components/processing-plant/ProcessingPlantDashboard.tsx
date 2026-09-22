'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Clock3, Factory, Loader2, RefreshCw } from 'lucide-react';
import ProcessingPlantFilters from './ProcessingPlantFilters';
import ProcessingPlantKpiCards from './ProcessingPlantKpiCards';
import WasteProcessingFlow from './WasteProcessingFlow';
import ProcessingTrendChart from './ProcessingTrendChart';
import PlantPerformanceChart from './PlantPerformanceChart';
import ProcessingAttentionPanel from './ProcessingAttentionPanel';
import PlantPerformanceTable from './PlantPerformanceTable';
import PlantDetailDrawer from './PlantDetailDrawer';
import { getProcessingPlantDashboard, getProcessingPlants } from '../../services/processingPlantService';
import type { ProcessingPlant, ProcessingPlantDashboardData, ProcessingPlantFiltersState, ProcessingPlantPerformanceRow } from '../../types/processingPlant';
import { formatMetric, lastNDaysRange, normalizeDashboardPayload } from '../../utils/processingPlantAnalytics';

export default function ProcessingPlantDashboard() {
  const [filters, setFilters] = useState<ProcessingPlantFiltersState>({ ...lastNDaysRange(30), plantType: '', plantId: '' });
  const [plants, setPlants] = useState<ProcessingPlant[]>([]);
  const [data, setData] = useState<ProcessingPlantDashboardData>(() => normalizeDashboardPayload({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<ProcessingPlantPerformanceRow | null>(null);
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

  useEffect(() => { loadPlants(); }, []);
  useEffect(() => { loadDashboard(); }, [filters.from, filters.to, filters.plantType, filters.plantId]);

  const recoveryTotal = useMemo(() => data.materialRecovery.reduce((sum, item) => sum + item.quantity, 0), [data.materialRecovery]);
  const materialRows = useMemo(() => [...data.materialRecovery].sort((a, b) => b.quantity - a.quantity).slice(0, 7), [data.materialRecovery]);

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50/50 to-emerald-50/50 p-5 shadow-sm sm:p-6">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-200/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600"><Factory size={14} /> City-level Processing Intelligence</div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Plant & Processing Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">Monitor city-wide waste inflow, processing, recovery, residuals, plant performance, reporting health and operational exceptions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-500 shadow-sm backdrop-blur"><Clock3 size={13} className="mr-1.5 inline" />{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for data'}</div>
            <button onClick={loadDashboard} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh</button>
          </div>
        </div>
      </section>

      <ProcessingPlantFilters filters={filters} plants={plants} onChange={setFilters} />

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><div className="text-sm font-black">Dashboard API could not be loaded</div><div className="mt-1 whitespace-pre-wrap break-words text-xs font-medium">{error}</div></div></div>
      )}

      {loading && !error ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="text-center"><Loader2 size={30} className="mx-auto animate-spin text-blue-600" /><div className="mt-3 text-sm font-black text-slate-700">Loading processing analytics...</div><div className="mt-1 text-xs font-medium text-slate-400">Applying city and dashboard filters</div></div></div>
      ) : (
        <>
          <ProcessingPlantKpiCards data={data} />

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[1.65fr_0.85fr]">
            <WasteProcessingFlow data={data} />
            <ProcessingAttentionPanel data={data} />
          </div>

          <ProcessingTrendChart trend={data.trend} />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PlantPerformanceChart rows={data.plantPerformance} onSelect={setSelectedPlant} />

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Recovery Analytics</div><h2 className="mt-1 text-lg font-black text-slate-900">Material Recovery Mix</h2><p className="text-xs text-slate-500">Recovered material composition from available data.</p></div><div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right"><div className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Recovered</div><div className="text-sm font-black text-emerald-800">{formatMetric(data.totalRecovered)}</div></div></div>
              <div className="mt-5 space-y-3">
                {materialRows.length === 0 ? <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">No material recovery breakdown available.</div> : materialRows.map((item) => {
                  const share = item.percentage || (recoveryTotal > 0 ? (item.quantity / recoveryTotal) * 100 : 0);
                  return <div key={item.name}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-xs font-black text-slate-700">{item.name}</span><span className="text-xs font-bold text-slate-500">{formatMetric(item.quantity)} · {share.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(Math.max(share, 0), 100)}%` }} /></div></div>;
                })}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Reporting Health</div><h2 className="mt-1 text-lg font-black text-slate-900">Submission Status</h2></div><Activity size={18} className="text-slate-400" /></div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[['RECEIVED', data.receivedEntries || 0], ['PROCESSED', data.processedEntries || 0], ['FAILED', data.failedEntries || 0], ['REPORTING PLANTS', data.reportingPlants || data.activePlants || 0]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-2xl font-black text-slate-900">{value}</div></div>)}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Coverage</div><h2 className="mt-1 text-lg font-black">Reporting Coverage</h2><div className="mt-6 text-4xl font-black">{data.totalPlants > 0 ? `${(((data.reportingPlants || data.activePlants || 0) / data.totalPlants) * 100).toFixed(0)}%` : '—'}</div><div className="mt-2 text-xs font-medium text-slate-400">{data.reportingPlants || data.activePlants || 0} of {data.totalPlants || 0} configured plants reporting in the selected period.</div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-blue-400" style={{ width: `${data.totalPlants > 0 ? Math.min(((data.reportingPlants || data.activePlants || 0) / data.totalPlants) * 100, 100) : 0}%` }} /></div></section>
          </div>

          <PlantPerformanceTable rows={data.plantPerformance} onSelect={setSelectedPlant} />
        </>
      )}

      <PlantDetailDrawer row={selectedPlant} filters={filters} onClose={() => setSelectedPlant(null)} />
    </div>
  );
}
