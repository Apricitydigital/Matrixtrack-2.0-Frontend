import React, { useEffect, useState } from 'react';
import { LoaderCircle, RotateCcw } from 'lucide-react';
import { matrixStore } from '../../services/store';
import { todayIST } from '../../services/api';
import { datePreset } from '../../services/presentation';
import { DATASET_LABELS, pageDatasets } from '../../services/workspace';

export function DataLoadingBar({ pageId }: { pageId: string }) {
  const range = matrixStore.getDateRange();
  const [from, setFrom] = useState(range.from), [to, setTo] = useState(range.to);
  const [error, setError] = useState('');
  useEffect(() => { setFrom(range.from); setTo(range.to); }, [range.from, range.to]);
  const collections = pageDatasets(pageId,matrixStore.currentUser?.role);
  if(matrixStore.currentUser?.role==='CITY_ADMIN'&&pageId.startsWith('mod_')&&matrixStore.getCollection('reports').status!=='idle')collections.push('reports');
  const dated = /ward_ranking/.test(pageId) || ['comm_plant','prod_plant','comm_user_perf','comm_iec_oversight'].includes(pageId) || collections.some(key => ['reports', 'attendance', 'iecIssues', 'auditLogs'].includes(key));
  const displayCollections = matrixStore.currentUser?.role === 'COMMISSIONER' ? collections.filter(key => !['users','geography'].includes(key) || matrixStore.getCollection(key).status === 'error') : collections;
  const partial = collections.some(key => matrixStore.getCollection(key).hasMore);
  return <section className="workspace-data-bar mb-5 rounded-xl border border-slate-200 bg-white p-4 space-y-3" aria-label="Data loading and date range">
    {dated && <div className="flex flex-wrap gap-1.5">{[['today','Today'],['yesterday','Yesterday'],['last_7_days','Last 7 days'],['last_30_days','Last 30 days'],['this_month','This month']].map(([key,label]) => {const preset = datePreset(key,todayIST());return <button key={key} type="button" aria-pressed={range.from === preset.from && range.to === preset.to} className="workspace-period" onClick={() => { setFrom(preset.from);setTo(preset.to);setError('');void matrixStore.setDateRange(preset.from,preset.to).catch(error => setError(error.message)); }}>{label}</button>;})}</div>}
    {dated && <form className="flex flex-wrap items-end gap-3" onSubmit={async e => {
      e.preventDefault(); setError('');
      try { await matrixStore.setDateRange(from, to); } catch (error) { setError(error instanceof Error ? error.message : 'Unable to apply dates.'); }
    }}><label className="text-xs text-slate-600">From<input type="date" required max={to || todayIST()} value={from} onChange={e => setFrom(e.target.value)} className="block mt-1 rounded-md border border-slate-200 px-2 py-1.5 text-slate-900" /></label><label className="text-xs text-slate-600">To<input type="date" required min={from} max={todayIST()} value={to} onChange={e => setTo(e.target.value)} className="block mt-1 rounded-md border border-slate-200 px-2 py-1.5 text-slate-900" /></label><button disabled={matrixStore.loading} className="rounded-md bg-indigo-600 text-white px-3 py-2 text-xs disabled:opacity-50">Apply dates</button><p className="text-xs text-slate-500 pb-1">Showing loaded records for {range.from === range.to ? range.from : `${range.from} – ${range.to}`}.</p></form>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {displayCollections.length > 0 && <div className="flex flex-wrap gap-2" aria-live="polite">{displayCollections.map(key => {
      const state = matrixStore.getCollection(key), pending = state.status === 'idle' || state.status === 'loading';
      return <div key={key} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${state.status === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
        {pending && <LoaderCircle size={12} className="animate-spin" />}<span>{DATASET_LABELS[key]}: {pending ? 'loading…' : state.status === 'error' ? 'unavailable' : `${state.loaded.toLocaleString()}${state.total > state.loaded ? ` of ${state.total.toLocaleString()}` : ''}`}</span>
        {state.status === 'error' && <button type="button" onClick={() => { void matrixStore.retryCollection(key); }} className="inline-flex items-center gap-1 font-semibold underline"><RotateCcw size={11} />Retry</button>}
        {!pending && state.hasMore && state.status !== 'error' && <button type="button" onClick={() => { void matrixStore.loadMore(key); }} className="font-semibold text-indigo-700 underline">Load more</button>}
      </div>;
    })}</div>}
    {partial && <p className="text-xs text-amber-800">More records are available. Totals, filters and CSV exports on this page currently use the loaded records. Select “Load more” for the next page.</p>}
    {matrixStore.currentUser?.role === 'HMS_SUPER_ADMIN' && matrixStore.selectedCityId === 'all' && <p className="text-xs text-slate-500">Choose a city to load its operational data.</p>}
  </section>;
}

export function PageLoadingSkeleton() {
  return <div role="status" aria-label="Loading section data" className="space-y-5"><div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={17} />Preparing your view…</div><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{[0,1,2,3].map(i => <div key={i} className="rounded-xl border border-slate-200 bg-white p-5"><div className="h-3 bg-slate-100 rounded w-2/3" /><div className="h-7 bg-slate-100 rounded w-1/3 mt-4" /><div className="h-3 bg-slate-100 rounded mt-4" /></div>)}</div><div className="h-64 bg-white border border-slate-200 rounded-xl" /></div>;
}
