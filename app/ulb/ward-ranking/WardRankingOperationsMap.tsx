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
  Layers3,
  Loader2,
  MapPinned,
  Maximize2,
  Minimize2,
  RefreshCw,
  Trash2,
  UsersRound,
} from 'lucide-react';

import { apiFetch } from '@lib/apiClient';
import type { WardRankingModule } from '@lib/wardRankingApi';
import type {
  OperationsMapData,
  WorkState,
} from '../../municipal/commissioner/home-2/types';

const OperationsMapCanvas = dynamic(
  () => import(
    '../../municipal/commissioner/home-2/OperationsMapCanvas'
  ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-100 text-sm font-semibold text-slate-500">
        <Loader2
          className="mr-2 animate-spin text-blue-600"
          size={18}
        />
        Loading ward operations map...
      </div>
    ),
  },
);

const STATUS_LEGEND: Array<{
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

type LayerKey = 'beats' | 'toilets' | 'bins';

export default function WardRankingOperationsMap({
  date,
  zoneId,
  wardId,
  module,
  rankingWardIds,
}: {
  date: string;
  zoneId?: string;
  wardId?: string;
  module?: WardRankingModule;
  rankingWardIds: string[];
}) {
  const [data, setData] =
    useState<OperationsMapData | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState('');
  const [isFullscreen, setIsFullscreen] =
    useState(false);
  const [visible, setVisible] = useState({
    beats: true,
    toilets: true,
    bins: true,
  });

  const mapSectionRef =
    useRef<HTMLElement>(null);

  useEffect(() => {
    setVisible({
      beats:
        !module ||
        module === 'SWEEPING',
      toilets:
        !module ||
        module === 'TOILET',
      bins:
        !module ||
        module === 'LITTERBINS',
    });
  }, [module]);

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

      const response =
        await apiFetch<OperationsMapData>(
          `/city/dashboard/operations-map?${query}`,
        );

      setData(response);
    } catch (requestError: any) {
      setError(
        requestError?.message ||
        'Unable to load ward operations map.',
      );
    } finally {
      setLoading(false);
    }
  }, [date, zoneId, wardId]);

  useEffect(() => {
    void loadMap();
  }, [loadMap]);

  const focusLevel = useMemo(
    () =>
      wardId
        ? 'WARD' as const
        : zoneId
          ? 'ZONE' as const
          : 'CITY' as const,
    [wardId, zoneId],
  );

  const visibleData = useMemo(() => {
    const allowedWardIds =
      new Set(rankingWardIds);

    return {
      beats:
        (data?.beats || []).filter(
          (item) =>
            allowedWardIds.has(item.wardId),
        ),
      toilets:
        (data?.toilets || []).filter(
          (item) =>
            Boolean(
              item.wardId &&
              allowedWardIds.has(item.wardId),
            ),
        ),
      bins:
        (data?.bins || []).filter(
          (item) =>
            Boolean(
              item.wardId &&
              allowedWardIds.has(item.wardId),
            ),
        ),
    };
  }, [data, rankingWardIds]);

  const toggleLayer = (key: LayerKey) => {
    setVisible((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await mapSectionRef.current
        ?.requestFullscreen();
    }
  };

  const layers = [
    {
      key: 'beats' as const,
      label: 'Sweeping beats',
      icon: MapPinned,
      count: visibleData.beats.length,
      activeClass:
        'bg-indigo-50 text-indigo-900 ring-indigo-100',
      iconClass: 'text-indigo-600',
    },
    {
      key: 'bins' as const,
      label: 'Litter bins',
      icon: Trash2,
      count: visibleData.bins.length,
      activeClass:
        'bg-violet-50 text-violet-900 ring-violet-100',
      iconClass: 'text-violet-600',
    },
    {
      key: 'toilets' as const,
      label: 'Toilets',
      icon: UsersRound,
      count: visibleData.toilets.length,
      activeClass:
        'bg-cyan-50 text-cyan-900 ring-cyan-100',
      iconClass: 'text-cyan-600',
    },
  ];

  return (
    <div className="p-4">
      {error && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          <span className="flex items-center gap-2">
            <AlertTriangle size={15} />
            {error}
          </span>

          <button
            type="button"
            onClick={() => void loadMap()}
            className="font-black"
          >
            Retry
          </button>
        </div>
      )}

      <section
        ref={mapSectionRef}
        className={`relative overflow-hidden border border-slate-200 bg-white shadow-[0_18px_50px_-26px_rgba(15,23,42,.45)] ${isFullscreen
          ? 'h-screen min-h-screen w-screen rounded-none'
          : 'h-[650px] min-h-[500px] rounded-2xl'
          }`}
      >
        <OperationsMapCanvas
          beats={visibleData.beats}
          toilets={visibleData.toilets}
          bins={visibleData.bins}
          visible={visible}
          focusLevel={focusLevel}
        />

        {loading && (
          <div className="absolute inset-0 z-[900] flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
            <div className="rounded-2xl border border-white bg-white/95 px-5 py-4 text-center shadow-xl">
              <Loader2
                className="mx-auto animate-spin text-blue-600"
                size={25}
              />
              <div className="mt-2 text-xs font-bold text-slate-600">
                Loading selected Ward data
              </div>
            </div>
          </div>
        )}

        <div className="absolute left-4 top-4 z-[800] w-[220px] rounded-2xl border border-white/80 bg-white/95 p-3 shadow-xl backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-slate-400">
            <Layers3 size={13} />
            Map layers
          </div>

          {layers.map((layer) => {
            const Icon = layer.icon;

            return (
              <button
                key={layer.key}
                type="button"
                onClick={() =>
                  toggleLayer(layer.key)
                }
                className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs ring-1 ring-inset transition ${visible[layer.key]
                  ? `${layer.activeClass} font-black`
                  : 'bg-white font-semibold text-slate-400 ring-slate-100'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <Icon
                    size={14}
                    className={layer.iconClass}
                  />
                  {layer.label}
                </span>
                <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[9px] font-black">
                  {layer.count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute right-4 top-4 z-[800] flex h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-3 text-xs font-black text-slate-800 shadow-xl backdrop-blur-xl transition hover:bg-slate-950 hover:text-white"
        >
          {isFullscreen ? (
            <Minimize2 size={15} />
          ) : (
            <Maximize2 size={15} />
          )}
          <span className="hidden sm:inline">
            {isFullscreen
              ? 'Exit Fullscreen'
              : 'Full Screen'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => void loadMap()}
          disabled={loading}
          className="absolute right-4 top-16 z-[800] flex h-9 items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-3 text-[10px] font-black text-slate-700 shadow-lg disabled:opacity-60"
        >
          <RefreshCw
            size={13}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh map
        </button>

        <div className="absolute bottom-4 right-4 z-[800] rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-xl">
          <div className="mb-2 text-[9px] font-black uppercase tracking-[.16em] text-slate-400">
            Work status
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {STATUS_LEGEND.map((item) => (
              <div
                key={item.state}
                className="flex items-center gap-2 whitespace-nowrap text-[10px] font-bold text-slate-600"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
