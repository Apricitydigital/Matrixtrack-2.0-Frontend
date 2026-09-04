'use client';

import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  UsersRound,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  Layers3,
  Loader2,
  MapPin,
  MapPinned,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

import { apiFetch } from '@lib/apiClient';
import type {
  OperationsMapData,
  WorkState,
} from './types';

const OperationsMapCanvas = dynamic(
  () => import('./OperationsMapCanvas'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500">
        <Loader2
          className="mr-2 animate-spin text-blue-600"
          size={18}
        />
        Loading city operations map...
      </div>
    ),
  },
);

const today = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
};

const stateLegend: Array<{
  state: WorkState;
  label: string;
  color: string;
}> = [
    {
      state: 'NOT_STARTED',
      label: 'Not started',
      color: '#94a3b8',
    },
    {
      state: 'SUBMITTED',
      label: 'Submitted',
      color: '#2563eb',
    },
    {
      state: 'APPROVED',
      label: 'QC approved',
      color: '#10b981',
    },
    {
      state: 'ATTENTION',
      label: 'Needs attention',
      color: '#f59e0b',
    },
  ];

export default function CommissionerHome2Page() {
  const [data, setData] =
    useState<OperationsMapData | null>(null);

  const [date, setDate] = useState(today());
  const [zoneId, setZoneId] = useState('');
  const [wardId, setWardId] = useState('');
  const [supervisorId, setSupervisorId] =
    useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [visible, setVisible] = useState({
    beats: true,
    toilets: true,
    bins: true,
  });

  const [isFullscreen, setIsFullscreen] =
    useState(false);

  const mapSectionRef =
    useRef<HTMLElement>(null);

  useEffect(() => {
    const syncFullscreen = () =>
      setIsFullscreen(
        document.fullscreenElement ===
        mapSectionRef.current,
      );

    document.addEventListener(
      'fullscreenchange',
      syncFullscreen,
    );

    return () =>
      document.removeEventListener(
        'fullscreenchange',
        syncFullscreen,
      );
  }, []);

  const loadMap = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams({
        date,
      });

      if (zoneId) {
        query.set('zoneId', zoneId);
      }

      if (wardId) {
        query.set('wardId', wardId);
      }

      if (supervisorId) {
        query.set(
          'supervisorId',
          supervisorId,
        );
      }

      const response =
        await apiFetch<OperationsMapData>(
          `/city/dashboard/operations-map?${query}`,
        );

      setData(response);
    } catch (requestError: any) {
      setError(
        requestError?.message ||
        'Unable to load city operations map.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    date,
    zoneId,
    wardId,
    supervisorId,
  ]);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  const wards = useMemo(
    () =>
      data?.filters.wards.filter(
        (ward) =>
          !zoneId ||
          ward.zoneId === zoneId,
      ) || [],
    [data, zoneId],
  );

  const summary = data?.summary.overall;

  const completion = summary?.total
    ? Math.round(
      (summary.approved /
        summary.total) *
      100,
    )
    : 0;

  const reported =
    (summary?.submitted || 0) +
    (summary?.approved || 0);

  const toggleLayer = (
    key: keyof typeof visible,
  ) => {
    setVisible((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await mapSectionRef.current?.requestFullscreen();
    }
  };

  const [stateFilter, setStateFilter] = useState<'ALL' | 'NOT_STARTED' | 'SUBMITTED' | 'APPROVED'>('ALL');

  const filteredBeats = useMemo(() => {
    if (!data?.beats) return [];
    if (stateFilter === 'ALL') return data.beats;
    return data.beats.filter((b) => b.state === stateFilter);
  }, [data, stateFilter]);

  const filteredToilets = useMemo(() => {
    if (!data?.toilets) return [];
    if (stateFilter === 'ALL') return data.toilets;
    return data.toilets.filter((t) => t.state === stateFilter);
  }, [data, stateFilter]);

  const filteredBins = useMemo(() => {
    if (!data?.bins) return [];
    if (stateFilter === 'ALL') return data.bins;
    return data.bins.filter((b) => b.state === stateFilter);
  }, [data, stateFilter]);

  const kpis = [
    {
      id: 'ALL',
      label: 'Total Mapped',
      value: summary?.total || 0,
      helper: 'Click to view all assets',
      icon: MapPinned,
      accent: 'from-blue-600 to-indigo-600',
    },
    {
      id: 'NOT_STARTED',
      label: 'Awaiting Work',
      value: summary?.notStarted || 0,
      helper: 'Click to filter pending assets',
      icon: Clock3,
      accent: 'from-amber-500 to-orange-600',
    },
    {
      id: 'SUBMITTED',
      label: 'Reports Submitted',
      value: summary?.submitted || 0,
      helper: 'Click to zoom to submitted assets',
      icon: RefreshCw,
      accent: 'from-sky-500 to-blue-600',
    },
    {
      id: 'APPROVED',
      label: 'QC Approved',
      value: summary?.approved || 0,
      helper: `${completion}% approved coverage`,
      icon: CheckCircle2,
      accent: 'from-emerald-500 to-teal-600',
    },
  ];

  const mapFocusLevel:
    | 'CITY'
    | 'ZONE'
    | 'WARD'
    | 'SUPERVISOR' =
    wardId
      ? 'WARD'
      : supervisorId
        ? 'SUPERVISOR'
        : zoneId
          ? 'ZONE'
          : 'CITY';

  return (
    <main className="min-h-full bg-[#f7f8fb] pb-10">
      <div className="mx-auto max-w-[1800px] space-y-5">

        {/* EXECUTIVE HERO */}
        <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-6 text-white shadow-[0_24px_70px_-32px_rgba(15,23,42,0.9)] sm:px-8 lg:px-9">

          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />

          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-80 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">

            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                <ShieldCheck size={14} />

                Commissioner Command Center

                <span className="h-1 w-1 rounded-full bg-blue-300/60" />

                Live Operations Map
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-[34px]">
                {data?.city.name || 'City'} Operations Map
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                Real-time geographic view of sweeping beats,
                litter bins, toilets and inspection
                activity across the city.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">

                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-200">
                  <MapPin
                    size={12}
                    className="text-blue-300"
                  />

                  {data?.city.name || 'City'}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />

                  LIVE DATA
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                  <CalendarDays size={12} />

                  {new Date(
                    `${date}T00:00:00`,
                  ).toLocaleDateString(
                    'en-IN',
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    },
                  )}
                </span>
              </div>
            </div>

            {/* HERO SUMMARY */}
            <div className="grid min-w-[280px] grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur-xl">

              <div className="rounded-xl bg-white/[0.05] px-4 py-3">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                  QC Completion
                </div>

                <div className="mt-1 text-2xl font-black">
                  {completion}%
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.05] px-4 py-3">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Reported
                </div>

                <div className="mt-1 text-2xl font-black">
                  {reported}

                  <span className="ml-1 text-xs font-semibold text-slate-400">
                    / {summary?.total || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KPI CARDS */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            const isActive = stateFilter === kpi.id;

            return (
              <button
                type="button"
                key={kpi.label}
                onClick={() => setStateFilter(kpi.id as any)}
                className={`group relative text-left overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
                  isActive
                    ? 'border-blue-600 ring-2 ring-blue-500/20'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${kpi.accent}`}
                />

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      {kpi.label}
                    </div>

                    <div className="mt-2 text-[28px] font-black tracking-tight text-slate-950">
                      {loading ? (
                        <span className="inline-block h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
                      ) : (
                        kpi.value
                      )}
                    </div>
                  </div>

                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.accent} text-white shadow-sm`}
                  >
                    <Icon size={18} />
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] font-semibold leading-4 text-slate-500">
                  <span>{kpi.helper}</span>
                  {isActive && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      Active
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </section>

        {/* FILTER PANEL */}
        <section className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm">

          <div className="mb-3 flex items-center justify-between gap-3">

            <div>
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <Filter
                  size={17}
                  className="text-blue-600"
                />

                Operational Filters
              </div>

              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Refine the live map by administrative
                area, supervisor and operational date.
              </p>
            </div>

            {(zoneId ||
              wardId ||
              supervisorId) && (
                <button
                  type="button"
                  onClick={() => {
                    setZoneId('');
                    setWardId('');
                    setSupervisorId('');
                  }}
                  className="text-[11px] font-black text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              )}
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">

            <FilterSelect
              value={zoneId}
              onChange={(value) => {
                setZoneId(value);
                setWardId('');
              }}
            >
              <option value="">
                All zones
              </option>

              {data?.filters.zones.map(
                (zone) => (
                  <option
                    key={zone.id}
                    value={zone.id}
                  >
                    {zone.name}
                  </option>
                ),
              )}
            </FilterSelect>

            <FilterSelect
              value={wardId}
              onChange={setWardId}
            >
              <option value="">
                All wards
              </option>

              {wards.map((ward) => (
                <option
                  key={ward.id}
                  value={ward.id}
                >
                  {ward.name}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={supervisorId}
              onChange={setSupervisorId}
            >
              <option value="">
                All supervisors
              </option>

              {data?.filters.supervisors.map(
                (supervisor) => (
                  <option
                    key={supervisor.id}
                    value={supervisor.id}
                  >
                    {supervisor.name}
                  </option>
                ),
              )}
            </FilterSelect>

            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />

            <button
              type="button"
              onClick={loadMap}
              disabled={loading}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={
                  loading
                    ? 'animate-spin'
                    : ''
                }
              />

              Refresh
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            <span className="flex items-center gap-2">
              <AlertTriangle size={17} />

              {error}
            </span>

            <button
              type="button"
              onClick={loadMap}
              className="font-black text-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* MAP */}
        <section
          ref={mapSectionRef}
          className={`relative overflow-hidden border border-slate-200 bg-white shadow-[0_20px_60px_-28px_rgba(15,23,42,.40)] ${isFullscreen
            ? 'h-screen min-h-screen w-screen rounded-none'
            : 'h-[680px] min-h-[540px] rounded-[26px]'
            }`}
        >
          <OperationsMapCanvas
            beats={filteredBeats}
            toilets={filteredToilets}
            bins={filteredBins}
            visible={visible}
            focusLevel={mapFocusLevel}
          />

          {loading && data && (
            <div className="absolute inset-0 z-[900] flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
              <div className="rounded-2xl border border-white bg-white/95 px-5 py-4 shadow-xl">
                <Loader2
                  className="mx-auto animate-spin text-blue-600"
                  size={25}
                />

                <div className="mt-2 text-xs font-bold text-slate-600">
                  Updating operational map
                </div>
              </div>
            </div>
          )}

          {/* LAYERS */}
          <div className="absolute left-4 top-4 z-[800] w-[230px] rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_15px_40px_rgba(15,23,42,.16)] backdrop-blur-xl">

            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">
              <Layers3 size={14} />

              Map Layers
            </div>

            {[
              {
                key: 'beats' as const,
                label: 'Sweeping beats',
                icon: MapPinned,
                count: data?.beats.length || 0,

                activeClass:
                  'bg-indigo-50 text-indigo-900 ring-1 ring-inset ring-indigo-100',

                iconClass:
                  'text-indigo-600',

                countClass:
                  'bg-indigo-100 text-indigo-700',
              },

              {
                key: 'bins' as const,
                label: 'Litter bins',
                icon: Trash2,
                count: data?.bins.length || 0,

                activeClass:
                  'bg-violet-50 text-violet-900 ring-1 ring-inset ring-violet-100',

                iconClass:
                  'text-violet-600',

                countClass:
                  'bg-violet-100 text-violet-700',
              },

              {
                key: 'toilets' as const,
                label: 'Toilets',
                icon: UsersRound,
                count: data?.toilets.length || 0,

                activeClass:
                  'bg-cyan-50 text-cyan-900 ring-1 ring-inset ring-cyan-100',

                iconClass:
                  'text-cyan-600',

                countClass:
                  'bg-cyan-100 text-cyan-700',
              },
            ].map((layer) => {
              const Icon = layer.icon;

              return (
                <button
                  key={layer.key}
                  type="button"
                  onClick={() =>
                    toggleLayer(layer.key)
                  }
                  className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs transition ${visible[layer.key]
                    ? `${layer.activeClass} font-black`
                    : 'bg-white font-semibold text-slate-400 hover:bg-slate-50'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon
                      size={15}
                      className={layer.iconClass}
                    />

                    {layer.label}
                  </span>

                  <span
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${visible[layer.key]
                      ? layer.countClass
                      : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    {layer.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* FULLSCREEN */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute right-4 top-4 z-[800] flex h-11 items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-4 text-xs font-black text-slate-800 shadow-xl backdrop-blur-xl transition hover:bg-slate-950 hover:text-white"
          >
            {isFullscreen ? (
              <Minimize2 size={16} />
            ) : (
              <Maximize2 size={16} />
            )}

            <span className="hidden sm:inline">
              {isFullscreen
                ? 'Exit Fullscreen'
                : 'Full Screen'}
            </span>
          </button>

          {/* LEGEND */}
          <div className="absolute bottom-5 right-4 z-[800] rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-xl">

            <div className="mb-2 text-[9px] font-black uppercase tracking-[.16em] text-slate-400">
              Work Status
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {stateLegend.map((item) => (
                <div
                  key={item.state}
                  className="flex items-center gap-2 whitespace-nowrap text-[11px] font-bold text-slate-600"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow"
                    style={{
                      backgroundColor:
                        item.color,
                    }}
                  />

                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {!loading &&
            !error &&
            !summary?.total && (
              <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[700] flex justify-center">
                <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-xs font-bold text-slate-500 shadow-lg backdrop-blur">
                  No mapped operational assets found for
                  the selected filters.
                </div>
              </div>
            )}
        </section>
      </div>
    </main>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
      >
        {children}
      </select>

      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-3.5 text-slate-400"
      />
    </label>
  );
}