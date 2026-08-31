'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Building2, CalendarDays, CheckCircle2, Filter, Layers3, Loader2, MapPinned, Maximize2, Minimize2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { apiFetch } from '@lib/apiClient';
import type { OperationsMapData, WorkState } from './types';

const OperationsMapCanvas = dynamic(() => import('./OperationsMapCanvas'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500"><Loader2 className="mr-2 animate-spin" size={18} /> Loading city map…</div>,
});

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const stateLegend: Array<{ state: WorkState; label: string; color: string }> = [
  { state: 'NOT_STARTED', label: 'No work reported', color: '#94a3b8' },
  { state: 'SUBMITTED', label: 'Report submitted', color: '#86efac' },
  { state: 'APPROVED', label: 'QC approved', color: '#15803d' },
  { state: 'ATTENTION', label: 'Needs attention', color: '#f97316' },
];

export default function CommissionerHome2Page() {
  const [data, setData] = useState<OperationsMapData | null>(null);
  const [date, setDate] = useState(today());
  const [zoneId, setZoneId] = useState('');
  const [wardId, setWardId] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState({ beats: true, toilets: true, bins: true });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === mapSectionRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const loadMap = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ date });
      if (zoneId) query.set('zoneId', zoneId);
      if (wardId) query.set('wardId', wardId);
      if (supervisorId) query.set('supervisorId', supervisorId);
      setData(await apiFetch<OperationsMapData>(`/city/dashboard/operations-map?${query}`));
    } catch (requestError: any) {
      setError(requestError?.message || 'Unable to load city operations map.');
    } finally {
      setLoading(false);
    }
  }, [date, zoneId, wardId, supervisorId]);

  useEffect(() => { loadMap(); }, [loadMap]);

  const wards = useMemo(() => data?.filters.wards.filter((ward) => !zoneId || ward.zoneId === zoneId) || [], [data, zoneId]);
  const summary = data?.summary.overall;
  const completion = summary?.total ? Math.round((summary.approved / summary.total) * 100) : 0;

  const toggleLayer = (key: keyof typeof visible) => setVisible((current) => ({ ...current, [key]: !current[key] }));
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await mapSectionRef.current?.requestFullscreen();
  };

  return (
    <main className="h-full overflow-y-auto bg-[#f4f7f6] p-4 lg:p-6">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <section className="overflow-hidden rounded-[26px] bg-gradient-to-r from-[#082f2b] via-[#0b4b42] to-[#12634f] px-5 py-5 text-white shadow-[0_18px_45px_rgba(8,47,43,.18)] lg:px-7">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.22em] text-emerald-200"><ShieldCheck size={15} /> Commissioner command view</div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight lg:text-3xl">{data?.city.name || 'City'} Operations Map</h1>
              <p className="mt-1 text-sm text-emerald-100/80">One live view for sweeping beats, litter bins and public toilets.</p>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur">
              <div><div className="text-[10px] uppercase tracking-widest text-emerald-100/70">QC completion</div><div className="mt-1 text-2xl font-semibold">{completion}%</div></div>
              <div className="h-10 w-px bg-white/15" />
              <div><div className="text-[10px] uppercase tracking-widest text-emerald-100/70">Approved assets</div><div className="mt-1 text-2xl font-semibold">{summary?.approved || 0}<span className="text-sm font-normal text-emerald-100/60"> / {summary?.total || 0}</span></div></div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total mapped', value: summary?.total || 0, icon: MapPinned, tone: 'bg-slate-900 text-white' },
            { label: 'Awaiting work', value: summary?.notStarted || 0, icon: CalendarDays, tone: 'bg-white text-slate-800' },
            { label: 'Reports submitted', value: summary?.submitted || 0, icon: RefreshCw, tone: 'bg-emerald-50 text-emerald-950' },
            { label: 'QC approved', value: summary?.approved || 0, icon: CheckCircle2, tone: 'bg-[#daf2e2] text-emerald-950' },
          ].map((card) => <div key={card.label} className={`flex items-center justify-between rounded-2xl border border-black/[.04] px-5 py-4 shadow-sm ${card.tone}`}><div><div className="text-[11px] font-semibold uppercase tracking-[.14em] opacity-60">{card.label}</div><div className="mt-1 text-2xl font-bold">{card.value}</div></div><card.icon size={23} className="opacity-70" /></div>)}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <label className="relative"><Filter size={15} className="absolute left-3 top-3 text-slate-400" /><select value={zoneId} onChange={(event) => { setZoneId(event.target.value); setWardId(''); }} className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"><option value="">All zones</option>{data?.filters.zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
            <select value={wardId} onChange={(event) => setWardId(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500"><option value="">All wards</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}</select>
            <select value={supervisorId} onChange={(event) => setSupervisorId(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500"><option value="">All supervisors</option>{data?.filters.supervisors.map((supervisor) => <option key={supervisor.id} value={supervisor.id}>{supervisor.name}</option>)}</select>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-500" />
            <button onClick={loadMap} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</button>
          </div>
        </section>

        {error && <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800"><AlertTriangle size={17} />{error}</div>}

        <section ref={mapSectionRef} className={`relative overflow-hidden border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,.10)] ${isFullscreen ? 'h-screen min-h-screen w-screen rounded-none' : 'h-[650px] min-h-[520px] rounded-[24px]'}`}>
          <OperationsMapCanvas beats={data?.beats || []} toilets={data?.toilets || []} bins={data?.bins || []} visible={visible} />
          {loading && data && <div className="absolute inset-0 z-[900] flex items-center justify-center bg-white/50 backdrop-blur-[2px]"><Loader2 className="animate-spin text-emerald-700" size={28} /></div>}

          <div className="absolute left-4 top-4 z-[800] w-[230px] rounded-2xl border border-white/70 bg-white/95 p-3 shadow-xl backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-slate-500"><Layers3 size={14} /> Map layers</div>
            {[{ key: 'beats' as const, label: 'Sweeping beats', icon: MapPinned, count: data?.beats.length || 0 }, { key: 'bins' as const, label: 'Litter bins', icon: Trash2, count: data?.bins.length || 0 }, { key: 'toilets' as const, label: 'Public toilets', icon: Building2, count: data?.toilets.length || 0 }].map((layer) => <button key={layer.key} onClick={() => toggleLayer(layer.key)} className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm ${visible[layer.key] ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-slate-400 hover:bg-slate-50'}`}><span className="flex items-center gap-2"><layer.icon size={15} />{layer.label}</span><span className="text-xs">{layer.count}</span></button>)}
          </div>

          <button type="button" onClick={toggleFullscreen} className="absolute right-4 top-4 z-[800] flex h-11 items-center gap-2 rounded-xl border border-white/70 bg-white/95 px-4 text-sm font-semibold text-slate-800 shadow-xl backdrop-blur transition hover:bg-white" title={isFullscreen ? 'Exit full screen' : 'Open full screen'}>
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
          </button>

          <div className="absolute bottom-5 left-4 z-[800] rounded-2xl border border-white/70 bg-white/95 p-3 shadow-xl backdrop-blur">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Daily work status</div>
            <div className="grid gap-2 sm:grid-cols-2">{stateLegend.map((item) => <div key={item.state} className="flex items-center gap-2 whitespace-nowrap text-xs text-slate-700"><span className="h-3 w-3 rounded-full ring-2 ring-white shadow" style={{ backgroundColor: item.color }} />{item.label}</div>)}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
