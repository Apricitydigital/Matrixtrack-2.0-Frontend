'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import ProcessingPlantFilters from './ProcessingPlantFilters';
import ProcessingPlantKpiCards from './ProcessingPlantKpiCards';
import WasteProcessingFlow from './WasteProcessingFlow';
import ProcessingTrendChart from './ProcessingTrendChart';
import PlantPerformanceChart from './PlantPerformanceChart';
import PlantPerformanceTable from './PlantPerformanceTable';
import PlantDetailDrawer from './PlantDetailDrawer';
import MetricDrillDownDrawer from './MetricDrillDownDrawer';
import MonthlyReportingPanel from './MonthlyReportingPanel';
import ProcessingPlantExcelUpload from './ProcessingPlantExcelUpload';
import { getProcessingPlantDashboard, getProcessingPlants } from '../../services/processingPlantService';
import type { ProcessingMetricKey, ProcessingPlant, ProcessingPlantDashboardData, ProcessingPlantFiltersState, ProcessingPlantPerformanceRow, ProcessingUnitTotals } from '../../types/processingPlant';
import { computeUnitTotals, formatMetric, lastNDaysRange, normalizeDashboardPayload } from '../../utils/processingPlantAnalytics';

const EMPTY_TOTALS: ProcessingUnitTotals = { unit: 'MT', received: 0, processed: 0, recovered: 0, reject: 0, processLoss: 0, efficiency: 0, hasEfficiency: false, plants: 0 };

export default function ProcessingPlantDashboard() {
  const [filters, setFilters] = useState<ProcessingPlantFiltersState>({ ...lastNDaysRange(30), plantType: '', plantId: '' });
  const [plants, setPlants] = useState<ProcessingPlant[]>([]);
  const [data, setData] = useState<ProcessingPlantDashboardData>(() => normalizeDashboardPayload({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<ProcessingPlantPerformanceRow | null>(null);
  const [metric, setMetric] = useState<ProcessingMetricKey | null>(null);
  const [chosenUnit, setChosenUnit] = useState('MT');

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

  // Quantities in different units (MT solid waste, KL / ML liquid plants) cannot be added, so the whole dashboard
  // shows one unit family at a time. A single plant picks its own unit automatically; with several, a toggle appears.
  const unitTotals = useMemo(() => computeUnitTotals(data.plantPerformance), [data.plantPerformance]);
  const totals = unitTotals.find((item) => item.unit === chosenUnit) ?? unitTotals[0] ?? EMPTY_TOTALS;
  const unit = totals.unit;
  const unitSuffix = ` ${unit}`;

  const trendPoints = useMemo(
    () => data.trend.map((point) => {
      const quantities = point.units?.[unit] ?? (point.units ? undefined : unit === 'MT' ? point : undefined);
      return {
        ...point,
        received: quantities?.received ?? 0,
        processed: quantities?.processed ?? 0,
        recovered: quantities?.recovered ?? 0,
        reject: quantities?.reject ?? 0,
      };
    }),
    [data.trend, unit],
  );

  const materialSource = data.materialRecoveryByUnit[unit] ?? (unit === 'MT' ? data.materialRecovery : []);
  const recoveryTotal = useMemo(() => materialSource.reduce((sum, item) => sum + item.quantity, 0), [materialSource]);
  const materialRows = useMemo(() => [...materialSource].sort((a, b) => b.quantity - a.quantity).slice(0, 7), [materialSource]);

  const reportingRows = data.plantPerformance.filter((row) => (row.daysReported ?? 0) > 0);
  const monthlyRows = reportingRows.filter((row) => row.reportingGranularity === 'MONTHLY');
  const showMonthlyPanel = monthlyRows.length > 0 && monthlyRows.length === reportingRows.length;

  const unitToggle = unitTotals.length > 1 ? (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Show quantities in unit" title="Show quantities in">
      {unitTotals.map((item) => (
        <button
          key={item.unit}
          onClick={() => setChosenUnit(item.unit)}
          aria-pressed={item.unit === unit}
          className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${item.unit === unit ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}
        >
          {item.unit}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="space-y-5 pb-8">
      <ProcessingPlantFilters filters={filters} plants={plants} onChange={setFilters} actions={<>{unitToggle}<ProcessingPlantExcelUpload onUploaded={handleUploaded} /></>} />

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
              <div className="mt-1 text-xs font-medium text-slate-400">Applying dashboard filters</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {showMonthlyPanel && <MonthlyReportingPanel rows={monthlyRows} />}

          <ProcessingPlantKpiCards data={data} totals={totals} onSelect={setMetric} />

          <WasteProcessingFlow data={data} totals={totals} />

          <ProcessingTrendChart trend={trendPoints} unit={unit} />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <PlantPerformanceChart rows={data.plantPerformance} onSelect={setSelectedPlant} />

            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Recovery Analytics</div>
                  <h2 className="mt-1 text-lg font-black text-slate-900">Material Recovery Mix</h2>
                  <p className="text-xs font-medium text-slate-500">Recovered material composition from available data.</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right"><div className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Recovered</div><div className="text-sm font-black text-emerald-800">{formatMetric(totals.recovered, unitSuffix)}</div></div>
              </div>
              <div className="mt-5 space-y-3">
                {materialRows.length === 0 ? <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">No material recovery breakdown available.</div> : materialRows.map((item) => {
                  const share = item.percentage || (recoveryTotal > 0 ? (item.quantity / recoveryTotal) * 100 : 0);
                  return <div key={item.name}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-xs font-black text-slate-700">{item.name}</span><span className="text-xs font-bold text-slate-500">{formatMetric(item.quantity, unitSuffix)} · {share.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700" style={{ width: `${Math.min(Math.max(share, 0), 100)}%` }} /></div></div>;
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
        totals={totals}
        filters={filters}
        onClose={() => setMetric(null)}
        onSelectPlant={(row) => {
          setMetric(null);
          setSelectedPlant(row);
        }}
      />

      <PlantDetailDrawer row={selectedPlant} onClose={() => setSelectedPlant(null)} />
    </div>
  );
}
