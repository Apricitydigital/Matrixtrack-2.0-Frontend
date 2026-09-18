'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';
import WardExecutiveOverview
  from './WardExecutiveOverview';
import {
  Award,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  List,
  Map as MapIcon,
  MapPin,
  Minus,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  GeoApi,
} from '@lib/apiClient';

import {
  WardRankingApi,
  type WardPerformanceBand,
  type WardRankingModule,
  type WardRankingPeriodType,
  type WardRankingQuery,
  type WardRankingComponent,
  type WardRankingRow,
  type WardComponentScore,
} from '@lib/wardRankingApi';

import WardDrilldownDrawer from './WardDrilldownDrawer';
import WardRankingOperationsMap
  from './WardRankingOperationsMap';


type ModuleFilter =
  | 'ALL'
  | WardRankingModule;

type StatusFilter =
  | 'ALL'
  | 'RANKED'
  | 'NODATA'
  | WardPerformanceBand;

type GeoNode = {
  id: string;
  name?: string;
  code?: string;
  parentId?: string | null;
  zoneId?: string | null;

  parent?: {
    id?: string;
    name?: string;
  } | null;

  [key: string]: any;
};


const PAGE_SIZE = 12;

const COMPONENT_DRILLDOWN_KEYS:
  WardRankingComponent[] = [
    'WORKFORCE',
    'BEAT',
    'TOILET',
    'LITTERBIN',
    'SUPERVISOR',
    'QC',
    'ACTION_OFFICER',
  ];


const COMPONENT_FIELD_BY_KEY:
  Record<
    WardRankingComponent,
    keyof WardRankingRow['components']
  > = {
  WORKFORCE:
    'workforce',

  BEAT:
    'beat',

  TOILET:
    'toilet',

  LITTERBIN:
    'litterBin',

  SUPERVISOR:
    'supervisor',

  QC:
    'qc',

  ACTION_OFFICER:
    'actionOfficer',
};



const PERIOD_OPTIONS: Array<{
  key: WardRankingPeriodType;
  label: string;
}> = [
    {
      key: 'DAY',
      label: 'Day',
    },
    {
      key: 'WEEK',
      label: 'Week',
    },
    {
      key: 'MONTH',
      label: 'Month',
    },
    {
      key: 'CUSTOM',
      label: 'Date Range',
    },
    {
      key: 'ALL',
      label: 'All',
    },
  ];


const MODULE_OPTIONS: Array<{
  key: ModuleFilter;
  label: string;
}> = [
    {
      key: 'ALL',
      label: 'All Modules',
    },
    {
      key: 'TOILET',
      label: 'Toilet',
    },
    {
      key: 'LITTERBINS',
      label: 'Litter Bin',
    },
    {
      key: 'SWEEPING',
      label: 'Sweeping',
    },
  ];


const STATUS_OPTIONS: Array<{
  key: StatusFilter;
  label: string;
}> = [
    {
      key: 'ALL',
      label: 'All Status',
    },
    {
      key: 'GREEN',
      label: 'Green',
    },
    {
      key: 'AMBER',
      label: 'Amber',
    },
    {
      key: 'RED',
      label: 'Red',
    },
  ];


function toLocalISO(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}-${day}`;
}


function todayString() {
  return toLocalISO(
    new Date()
  );
}


function parseDateInput(
  value: string
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split('-')
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return new Date();
  }

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0
  );
}


function resolvePeriodRange(
  type: WardRankingPeriodType,
  anchorDate: string,
  customFrom: string,
  customTo: string,
  allDateBounds?: {
    from: string;
    to: string;
  } | null
) {
  const safeAnchor =
    anchorDate ||
    todayString();

  const anchor =
    parseDateInput(
      safeAnchor
    );

  if (
    type === 'DAY'
  ) {
    return {
      from: safeAnchor,
      to: safeAnchor,
    };
  }

  if (
    type === 'WEEK'
  ) {
    const start =
      new Date(anchor);

    start.setDate(
      start.getDate() - 6
    );

    return {
      from:
        toLocalISO(start),

      to:
        safeAnchor,
    };
  }

  if (
    type === 'MONTH'
  ) {
    const start =
      new Date(
        anchor.getFullYear(),
        anchor.getMonth(),
        1,
        12,
        0,
        0
      );

    return {
      from:
        toLocalISO(start),

      to:
        safeAnchor,
    };
  }

  if (
    type === 'ALL'
  ) {
    return {
      from:
        allDateBounds?.from ||
        safeAnchor,

      to:
        allDateBounds?.to ||
        safeAnchor,
    };
  }

  let from =
    customFrom ||
    safeAnchor;

  let to =
    customTo ||
    safeAnchor;

  if (
    from > to
  ) {
    const swap =
      from;

    from =
      to;

    to =
      swap;
  }

  return {
    from,
    to,
  };
}


function displayGeoName(
  node: GeoNode
) {
  return (
    node?.name ||
    node?.wardName ||
    node?.zoneName ||
    node?.code ||
    'Unnamed'
  );
}


function naturalCompare(
  first: string,
  second: string
) {
  return first.localeCompare(
    second,
    'en',
    {
      numeric: true,
      sensitivity: 'base',
    }
  );
}


function formatScore(
  value: number | null | undefined,
  digits = 1
) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(
      Number(value)
    )
  ) {
    return '—';
  }

  return Number(value)
    .toFixed(digits)
    .replace(
      /\.0$/,
      ''
    );
}


function formatDateLabel(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  const date =
    parseDateInput(
      value.slice(
        0,
        10
      )
    );

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}


function formatGeneratedAt(
  value?: string | null
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toLocaleString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}


function mergeRankingRows(
  response: any
): WardRankingRow[] {
  const candidates: WardRankingRow[] = [
    ...(
      Array.isArray(
        response?.rankings
      )
        ? response.rankings
        : []
    ),

    ...(
      Array.isArray(
        response?.noDataWards
      )
        ? response.noDataWards
        : []
    ),

    ...(
      Array.isArray(
        response?.unrankedWards
      )
        ? response.unrankedWards
        : []
    ),
  ];

  const byWard =
    new Map<
      string,
      WardRankingRow
    >();

  candidates.forEach(
    (item) => {
      if (
        item?.wardId
      ) {
        byWard.set(
          item.wardId,
          item
        );
      }
    }
  );

  return Array.from(
    byWard.values()
  );
}


function componentScoreLabel(
  value?: WardComponentScore
) {
  if (
    !value ||
    !value.applicable
  ) {
    return 'N/A';
  }

  return `${formatScore(
    value.score
  )}/${formatScore(
    value.maxScore
  )}`;
}


function BandBadge({
  band,
  rankable,
}: {
  band:
  | WardPerformanceBand
  | null
  | undefined;

  rankable: boolean;
}) {
  if (
    !rankable ||
    !band
  ) {
    return (
      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
        No Data
      </span>
    );
  }

  if (
    band === 'GREEN'
  ) {
    return (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
        Green
      </span>
    );
  }

  if (
    band === 'AMBER'
  ) {
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
        Amber
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-rose-700">
      Red
    </span>
  );
}


function TrendIndicator({
  item,
}: {
  item: WardRankingRow;
}) {
  const trend =
    item?.trend;

  if (
    !trend ||
    !item.rankable
  ) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
        <Minus size={13} />
        —
      </span>
    );
  }

  if (
    trend.direction ===
    'UP'
  ) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600">
        <TrendingUp size={14} />
        +{formatScore(
          Math.abs(
            trend.change
          )
        )}
      </span>
    );
  }

  if (
    trend.direction ===
    'DOWN'
  ) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-black text-rose-600">
        <TrendingDown size={14} />
        -{formatScore(
          Math.abs(
            trend.change
          )
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-black text-slate-500">
      <Minus size={13} />
      Stable
    </span>
  );
}


function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  helper: string;
  icon: any;

  tone:
  | 'blue'
  | 'green'
  | 'amber'
  | 'red';

  active: boolean;

  onClick: () => void;
}) {
  const toneClasses = {
    blue: {
      icon:
        'bg-blue-50 text-blue-600',
      value:
        'text-blue-700',
      active:
        'ring-blue-400',
    },

    green: {
      icon:
        'bg-emerald-50 text-emerald-600',
      value:
        'text-emerald-700',
      active:
        'ring-emerald-400',
    },

    amber: {
      icon:
        'bg-amber-50 text-amber-600',
      value:
        'text-amber-700',
      active:
        'ring-amber-400',
    },

    red: {
      icon:
        'bg-rose-50 text-rose-600',
      value:
        'text-rose-700',
      active:
        'ring-rose-400',
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${active
        ? `ring-2 ${toneClasses.active}`
        : ''
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
            {label}
          </div>

          <div className={`mt-2 text-3xl font-black ${toneClasses.value}`}>
            {value}
          </div>

          <div className="mt-1 text-[11px] font-semibold text-slate-400">
            {helper}
          </div>
        </div>

        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses.icon}`}>
          <Icon size={19} />
        </div>
      </div>
    </button>
  );
}



const CHART_COLORS = {
  blue: '#2563eb',
  indigo: '#4f46e5',
  emerald: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
  slate: '#94a3b8',
  cyan: '#0891b2',
  violet: '#7c3aed',
};


function ChartCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            {title}
          </h3>

          <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-400">
            {subtitle}
          </p>
        </div>

        {badge && (
          <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700">
            {badge}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}


function ChartEmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
      <div>
        <Award
          size={27}
          className="mx-auto text-slate-300"
        />

        <div className="mt-2 text-xs font-bold text-slate-500">
          {message}
        </div>
      </div>
    </div>
  );
}

const STATUS_FILTER_VALUES: StatusFilter[] = [
  'ALL',
  'RANKED',
  'NODATA',
  'GREEN',
  'AMBER',
  'RED',
];

const RANKING_CACHE_TTL_MS =
  5 * 60 * 1000;

type RankingCacheEntry = {
  expiresAt: number;
  rows: WardRankingRow[];
};

const rankingQueryCache =
  new Map<
    string,
    RankingCacheEntry
  >();

function rankingCacheKey(
  query: WardRankingQuery
) {
  return JSON.stringify({
    from:
      query.from ||
      '',
    to:
      query.to ||
      '',
    zoneId:
      query.zoneId ||
      '',
    wardId:
      query.wardId ||
      '',
    module:
      query.module ||
      '',
    allDates:
      Boolean(
        query.allDates
      ),
  });
}

export default function WardRankingWorkspace() {
  const searchParams = useSearchParams();

  const [
    periodType,
    setPeriodType,
  ] =
    useState<WardRankingPeriodType>(
      'DAY'
    );

  const [
    anchorDate,
    setAnchorDate,
  ] =
    useState(
      todayString()
    );

  const [
    customFrom,
    setCustomFrom,
  ] =
    useState(
      todayString()
    );

  const [
    customTo,
    setCustomTo,
  ] =
    useState(
      todayString()
    );

  const [
    customFromDraft,
    setCustomFromDraft,
  ] =
    useState(
      todayString()
    );

  const [
    customToDraft,
    setCustomToDraft,
  ] =
    useState(
      todayString()
    );

  const [
    allDateBounds,
    setAllDateBounds,
  ] =
    useState<{
      from: string;
      to: string;
    } | null>(
      null
    );

  const [
    selectedZoneId,
    setSelectedZoneId,
  ] =
    useState('');

  const [
    selectedWardId,
    setSelectedWardId,
  ] =
    useState('');

  const [
    trendZoneId,
    setTrendZoneId,
  ] =
    useState('');

  const [
    moduleFilter,
    setModuleFilter,
  ] =
    useState<ModuleFilter>(
      'ALL'
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      () => {
        const requested =
          searchParams
            .get('status')
            ?.toUpperCase();

        return requested &&
          STATUS_FILTER_VALUES.includes(
            requested as StatusFilter
          )
          ? (requested as StatusFilter)
          : 'ALL';
      }
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    zones,
    setZones,
  ] =
    useState<GeoNode[]>([]);

  const [
    wards,
    setWards,
  ] =
    useState<GeoNode[]>([]);

  const [
    rows,
    setRows,
  ] =
    useState<WardRankingRow[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    rankingView,
    setRankingView,
  ] =
    useState<'list' | 'map'>(
      'list'
    );


  const [
    drilldownWard,
    setDrilldownWard,
  ] =
    useState<WardRankingRow | null>(
      null
    );


  const [
    drilldownComponent,
    setDrilldownComponent,
  ] =
    useState<WardRankingComponent | null>(
      null
    );

  const requestSequenceRef =
    useRef(0);

  const initialLoadCompleteRef =
    useRef(false);


  const dateRange =
    useMemo(
      () =>
        resolvePeriodRange(
          periodType,
          anchorDate,
          customFrom,
          customTo,
          allDateBounds
        ),

      [
        periodType,
        anchorDate,
        customFrom,
        customTo,
        allDateBounds,
      ]
    );


  const visibleWards =
    useMemo(
      () => {
        const filtered =
          selectedZoneId
            ? wards.filter(
              (ward) => {
                const parentId =
                  ward.parentId ||
                  ward.zoneId ||
                  ward.parent?.id ||
                  null;

                return (
                  parentId ===
                  selectedZoneId
                );
              }
            )
            : wards;

        return filtered
          .slice()
          .sort(
            (
              first,
              second
            ) =>
              naturalCompare(
                displayGeoName(
                  first
                ),
                displayGeoName(
                  second
                )
              )
          );
      },

      [
        wards,
        selectedZoneId,
      ]
    );


  const rankingQuery =
    useMemo<WardRankingQuery>(
      () => ({
        from:
          dateRange.from,

        to:
          dateRange.to,

        zoneId:
          selectedZoneId ||
          undefined,

        wardId:
          selectedWardId ||
          undefined,

        module:
          moduleFilter ===
            'ALL'
            ? undefined
            : moduleFilter,

        allDates:
          periodType ===
            'ALL'
            ? true
            : undefined,
      }),

      [
        dateRange.from,
        dateRange.to,
        selectedZoneId,
        selectedWardId,
        moduleFilter,
        periodType,
      ]
    );


  const loadGeo =
    useCallback(
      async () => {
        try {
          const [
            zoneResponse,
            wardResponse,
          ] =
            await Promise.all([
              GeoApi.list(
                'ZONE'
              ),

              GeoApi.list(
                'WARD'
              ),
            ]);

          const zoneRows =
            Array.isArray(
              zoneResponse?.nodes
            )
              ? zoneResponse.nodes
              : [];

          const wardRows =
            Array.isArray(
              wardResponse?.nodes
            )
              ? wardResponse.nodes
              : [];

          setZones(
            zoneRows
              .slice()
              .sort(
                (
                  first,
                  second
                ) =>
                  naturalCompare(
                    displayGeoName(
                      first
                    ),
                    displayGeoName(
                      second
                    )
                  )
              )
          );

          setWards(
            wardRows
          );
        } catch (
        geoError
        ) {
          console.warn(
            '[WardRanking] Unable to load geo filters',
            geoError
          );
        }
      },
      []
    );


  const loadDateBounds =
    useCallback(
      async () => {
        try {
          const response =
            await WardRankingApi
              .dateBounds();

          setAllDateBounds({
            from:
              response.from,
            to:
              response.to,
          });
        } catch (
        boundsError
        ) {
          console.warn(
            '[WardRanking] Unable to load date bounds',
            boundsError
          );
        }
      },
      []
    );


  const loadRanking =
    useCallback(
      async (
        manualRefresh = false
      ) => {
        const requestId =
          ++requestSequenceRef.current;

        const cacheKey =
          rankingCacheKey(
            rankingQuery
          );

        const cached =
          manualRefresh
            ? undefined
            : rankingQueryCache.get(
              cacheKey
            );

        if (
          cached &&
          cached.expiresAt >
          Date.now()
        ) {
          setRows(
            cached.rows
          );

          setError('');
          setLoading(false);
          setRefreshing(false);

          initialLoadCompleteRef
            .current = true;

          return;
        }

        const isInitialLoad =
          !initialLoadCompleteRef
            .current;

        try {
          if (
            isInitialLoad
          ) {
            setLoading(
              true
            );
          } else {
            setRefreshing(
              true
            );
          }

          setError('');

          const rankingResponse =
            await WardRankingApi.list(
              rankingQuery
            );

          if (
            requestId !==
            requestSequenceRef.current
          ) {
            return;
          }

          const mergedRows =
            mergeRankingRows(
              rankingResponse
            );

          setRows(
            mergedRows
          );

          rankingQueryCache.set(
            cacheKey,
            {
              expiresAt:
                Date.now() +
                RANKING_CACHE_TTL_MS,

              rows:
                mergedRows,
            }
          );

          initialLoadCompleteRef
            .current = true;
        } catch (
        err: any
        ) {
          if (
            requestId !==
            requestSequenceRef.current
          ) {
            return;
          }

          setError(
            err?.message ||
            'Unable to load Ward Ranking.'
          );
        } finally {
          if (
            requestId ===
            requestSequenceRef.current
          ) {
            setLoading(
              false
            );

            setRefreshing(
              false
            );
          }
        }
      },

      [
        rankingQuery,
      ]
    );


  useEffect(
    () => {
      void loadGeo();
      void loadDateBounds();
    },
    [
      loadGeo,
      loadDateBounds,
    ]
  );


  const rankingReady =
    periodType !==
      'ALL' ||
    Boolean(
      allDateBounds
    );


  useEffect(
    () => {
      if (
        !rankingReady
      ) {
        return;
      }

      void loadRanking();
    },
    [
      loadRanking,
      rankingReady,
    ]
  );


  useEffect(
    () => {
      if (
        !selectedWardId
      ) {
        return;
      }

      const exists =
        visibleWards.some(
          (ward) =>
            ward.id ===
            selectedWardId
        );

      if (
        !exists
      ) {
        setSelectedWardId(
          ''
        );
      }
    },

    [
      selectedWardId,
      visibleWards,
    ]
  );


  useEffect(
    () => {
      setPage(1);
    },

    [
      search,
      statusFilter,
      selectedZoneId,
      selectedWardId,
      moduleFilter,
      periodType,
      anchorDate,
      customFrom,
      customTo,
    ]
  );


  const rankableRows =
    useMemo(
      () =>
        rows.filter(
          (item) =>
            item.rankable
        ),

      [
        rows,
      ]
    );


  const counts =
    useMemo(
      () => ({
        total:
          rows.length,

        rankable:
          rankableRows.length,

        noData:
          rows.length -
          rankableRows.length,

        green:
          rows.filter(
            (item) =>
              item.rankable &&
              item.performanceBand ===
              'GREEN'
          ).length,

        amber:
          rows.filter(
            (item) =>
              item.rankable &&
              item.performanceBand ===
              'AMBER'
          ).length,

        red:
          rows.filter(
            (item) =>
              item.rankable &&
              item.performanceBand ===
              'RED'
          ).length,
      }),

      [
        rows,
        rankableRows,
      ]
    );


  const filteredRows =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return rows
          .filter(
            (item) => {
              if (
                statusFilter ===
                'RANKED' &&
                !item.rankable
              ) {
                return false;
              }

              if (
                statusFilter ===
                'NODATA' &&
                item.rankable
              ) {
                return false;
              }

              if (
                statusFilter !==
                'ALL' &&
                statusFilter !==
                'RANKED' &&
                statusFilter !==
                'NODATA' &&
                item.performanceBand !==
                statusFilter
              ) {
                return false;
              }

              if (
                !query
              ) {
                return true;
              }

              const searchable =
                [
                  item.wardName,
                  item.zoneName,
                  item.cityRank,
                  item.zoneRank,
                  item.performanceBand,
                ]
                  .filter(
                    (
                      value
                    ) =>
                      value !==
                      null &&
                      value !==
                      undefined
                  )
                  .join(' ')
                  .toLowerCase();

              return searchable.includes(
                query
              );
            }
          )
          .sort(
            (
              first,
              second
            ) => {
              if (
                first.rankable !==
                second.rankable
              ) {
                return first.rankable
                  ? -1
                  : 1;
              }

              const firstRank =
                first.cityRank ??
                Number.MAX_SAFE_INTEGER;

              const secondRank =
                second.cityRank ??
                Number.MAX_SAFE_INTEGER;

              if (
                firstRank !==
                secondRank
              ) {
                return (
                  firstRank -
                  secondRank
                );
              }

              if (
                first.finalScore !==
                second.finalScore
              ) {
                return (
                  second.finalScore -
                  first.finalScore
                );
              }

              return naturalCompare(
                first.wardName ||
                '',
                second.wardName ||
                ''
              );
            }
          );
      },

      [
        rows,
        search,
        statusFilter,
      ]
    );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredRows.length /
        PAGE_SIZE
      )
    );


  const safePage =
    Math.min(
      page,
      totalPages
    );


  const pagedRows =
    useMemo(
      () => {
        const start =
          (
            safePage -
            1
          ) *
          PAGE_SIZE;

        return filteredRows.slice(
          start,
          start +
          PAGE_SIZE
        );
      },

      [
        filteredRows,
        safePage,
      ]
    );



  const trendComparisonData =
    useMemo(
      () =>
        rankableRows
          .filter(
            (item) =>
              !trendZoneId ||
              item.zoneId ===
              trendZoneId
          )
          .slice()
          .sort(
            (
              first,
              second
            ) => {
              const firstRank =
                first.cityRank ??
                Number.MAX_SAFE_INTEGER;

              const secondRank =
                second.cityRank ??
                Number.MAX_SAFE_INTEGER;

              return (
                firstRank -
                secondRank
              );
            }
          )
          .slice(
            0,
            8
          )
          .map(
            (
              item
            ) => ({
              ward:
                item.wardName ||
                'Ward',

              current:
                Number(
                  item.finalScore ||
                  0
                ),

              sevenDay:
                item.trend
                  ?.sevenDayAverage ??
                null,

              thirtyDay:
                item.trend
                  ?.thirtyDayAverage ??
                null,
            })
          ),
      [
        rankableRows,
        trendZoneId,
      ]
    );


  const hasHistoricalTrend =
    useMemo(
      () =>
        trendComparisonData.some(
          (
            item
          ) =>
            item.sevenDay !==
            null ||
            item.thirtyDay !==
            null
        ),
      [
        trendComparisonData,
      ]
    );


  const displayedFrom =
    filteredRows.length
      ? (
        safePage -
        1
      ) *
      PAGE_SIZE +
      1
      : 0;


  const displayedTo =
    Math.min(
      safePage *
      PAGE_SIZE,
      filteredRows.length
    );


  const openWardDrilldown = (
    item: WardRankingRow,
    component?: WardRankingComponent | null
  ) => {
    let targetComponent =
      component || null;

    if (
      !targetComponent
    ) {
      targetComponent =
        COMPONENT_DRILLDOWN_KEYS.find(
          (
            key
          ) => {
            const field =
              COMPONENT_FIELD_BY_KEY[
              key
              ];

            return Boolean(
              item.components?.[
                field
              ]?.applicable
            );
          }
        ) || null;
    }

    setDrilldownWard(
      item
    );

    setDrilldownComponent(
      targetComponent
    );
  };


  const closeWardDrilldown =
    () => {
      setDrilldownWard(
        null
      );

      setDrilldownComponent(
        null
      );
    };


  const handlePeriodChange = (
    nextPeriod:
      WardRankingPeriodType
  ) => {
    if (
      nextPeriod ===
      'CUSTOM'
    ) {
      const draftFrom =
        periodType ===
          'ALL'
          ? anchorDate
          : dateRange.from;

      const draftTo =
        periodType ===
          'ALL'
          ? anchorDate
          : dateRange.to;

      setCustomFrom(
        draftFrom
      );

      setCustomTo(
        draftTo
      );

      setCustomFromDraft(
        draftFrom
      );

      setCustomToDraft(
        draftTo
      );
    }

    setPeriodType(
      nextPeriod
    );
  };


  const applyCustomDateRange =
    () => {
      let from =
        customFromDraft ||
        anchorDate;

      let to =
        customToDraft ||
        anchorDate;

      if (
        from > to
      ) {
        const swap =
          from;

        from =
          to;

        to =
          swap;
      }

      setCustomFrom(
        from
      );

      setCustomTo(
        to
      );

      setCustomFromDraft(
        from
      );

      setCustomToDraft(
        to
      );
    };


  const resetFilters =
    () => {
      const today =
        todayString();

      setPeriodType(
        'DAY'
      );

      setAnchorDate(
        today
      );

      setCustomFrom(
        today
      );

      setCustomTo(
        today
      );

      setCustomFromDraft(
        today
      );

      setCustomToDraft(
        today
      );

      setSelectedZoneId(
        ''
      );

      setSelectedWardId(
        ''
      );

      setModuleFilter(
        'ALL'
      );

      setStatusFilter(
        'ALL'
      );

      setSearch('');
    };


  if (
    loading
  ) {
    return (
      <div className="flex min-h-[440px] items-center justify-center rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <div className="absolute inset-2 animate-ping rounded-xl bg-blue-100/60" />
            <Loader2
              size={28}
              className="relative animate-spin"
            />
          </div>

          <div className="mt-4 text-sm font-black text-slate-800">
            Loading Ward Ranking
          </div>

          <div className="mt-1 text-[11px] font-semibold text-slate-400">
            Preparing ward performance and exceptions...
          </div>
        </div>
      </div>
    );
  }


  if (
    error &&
    !rows.length
  ) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <div className="flex items-start gap-3">
          <XCircle
            size={20}
            className="mt-0.5 shrink-0 text-rose-600"
          />

          <div>
            <div className="text-sm font-black text-rose-700">
              Unable to load Ward Ranking
            </div>

            <div className="mt-1 text-xs font-semibold text-rose-600/80">
              {error}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadRanking(
              true
            );
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <RefreshCw
            size={14}
          />

          Try Again
        </button>
      </div>
    );
  }


  return (
    <div className="relative space-y-5 pb-8">

      {(refreshing || (periodType === 'ALL' && !allDateBounds)) && (
        <>
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-1 animate-pulse bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />

          <div className="fixed right-6 top-24 z-[70] flex items-center gap-3 rounded-2xl border border-blue-100 bg-white/95 px-4 py-3 shadow-xl shadow-blue-100/60 backdrop-blur">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
            <Loader2
              size={18}
              className="animate-spin"
            />
          </div>

          <div>
            <div className="text-[11px] font-black text-slate-900">
              Updating Ward Ranking
            </div>
            <div className="mt-0.5 text-[9px] font-bold text-slate-400">
              {periodType === 'ALL' && !allDateBounds
                ? 'Preparing available history range...'
                : 'Latest dashboard data is loading...'}
            </div>
          </div>
        </div>
        </>
      )}

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                <CalendarDays className="h-4 w-4" />
                Date
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PERIOD_OPTIONS.map((option) => {
                  const active = periodType === option.key;
                  return (
                    <button
                      type="button"
                      key={option.key}
                      onClick={() => handlePeriodChange(option.key)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${active
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                        }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {periodType !== 'CUSTOM' &&
                periodType !== 'ALL' && (
                <input
                  type="date"
                  value={anchorDate}
                  max={todayString()}
                  onChange={(event) => setAnchorDate(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none transition focus:border-blue-400"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {MODULE_OPTIONS.map((option) => {
                const active = moduleFilter === option.key;
                return (
                  <button
                    type="button"
                    key={option.key}
                    onClick={() => setModuleFilter(option.key)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${active
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                      }`}
                  >
                    {option.key === 'ALL' ? 'All' : option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              Status
            </div>

            {STATUS_OPTIONS.map((option) => {
              const active = statusFilter === option.key;
              const value =
                option.key === 'ALL'
                  ? counts.total
                  : option.key === 'GREEN'
                    ? counts.green
                    : option.key === 'AMBER'
                      ? counts.amber
                      : counts.red;

              return (
                <button
                  type="button"
                  key={option.key}
                  onClick={() => setStatusFilter(option.key)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${active
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                    }`}
                >
                  {option.label} ({value.toLocaleString()})
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              <MapPin className="h-4 w-4" />
              Location
            </div>

            <select
              value={selectedZoneId}
              onChange={(event) => setSelectedZoneId(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none transition focus:border-blue-400"
            >
              <option value="">All Zones</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {displayGeoName(zone)}
                </option>
              ))}
            </select>

            <select
              value={selectedWardId}
              onChange={(event) => setSelectedWardId(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none transition focus:border-blue-400"
            >
              <option value="">All Wards</option>
              {visibleWards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {displayGeoName(ward)}
                </option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-2">
              {refreshing && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">
                  <Loader2
                    size={12}
                    className="animate-spin"
                  />
                  Updating
                </span>
              )}

              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
              >
                Reset
              </button>
            </div>
          </div>

          {periodType === 'CUSTOM' && (
            <div className="flex flex-wrap items-end gap-3 border-t border-slate-200 pt-3">
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  From
                </span>
                <input
                  type="date"
                  value={customFromDraft}
                  max={customToDraft || todayString()}
                  onChange={(event) => setCustomFromDraft(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-blue-400"
                />
              </label>

              <span className="pb-2 text-xs font-semibold text-slate-400">
                to
              </span>

              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  To
                </span>
                <input
                  type="date"
                  value={customToDraft}
                  min={customFromDraft || undefined}
                  max={todayString()}
                  onChange={(event) => setCustomToDraft(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-blue-400"
                />
              </label>

              <button
                type="button"
                onClick={applyCustomDateRange}
                disabled={
                  customFromDraft === customFrom &&
                  customToDraft === customTo
                }
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                Apply
              </button>
            </div>
          )}

          {periodType === 'ALL' && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
              <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">
                All available Ward Ranking history
              </span>

              {allDateBounds && (
                <span className="text-[10px] font-bold text-slate-400">
                  {allDateBounds.from} to {allDateBounds.to}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ward or zone..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-400">
            <span>
              Showing {displayedFrom}–{displayedTo} of {filteredRows.length.toLocaleString()} wards
            </span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-600">Green: {counts.green}</span>
              <span className="text-amber-600">Amber: {counts.amber}</span>
              <span className="text-rose-600">Red: {counts.red}</span>
            </div>
          </div>
        </div>

      </section>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-rose-700">
            <XCircle
              size={15}
              className="shrink-0"
            />
            <span className="truncate">
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadRanking(
                true
              );
            }}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[10px] font-black text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
          >
            Retry
          </button>
        </div>
      )}


      {/* =====================================================
          WARD PERFORMANCE INTELLIGENCE
      ===================================================== */}

      <WardExecutiveOverview
        rows={rows}
        from={
          dateRange.from
        }
        to={
          dateRange.to
        }
        onOpenWard={
          openWardDrilldown
        }
        statusFilter={
          statusFilter
        }
        onFilterStatus={
          setStatusFilter
        }
      >

        <ChartCard
          title="Ward Performance Trend"
          subtitle="Current score vs 7-day and 30-day averages."
        // badge="Trend"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Current
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black text-violet-700">
                <span className="h-2 w-2 rounded-full bg-violet-600" />
                7-Day Avg
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-[9px] font-black text-cyan-700">
                <span className="h-2 w-2 rounded-full bg-cyan-600" />
                30-Day Avg
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />

              <select
                value={trendZoneId}
                onChange={(event) => setTrendZoneId(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 outline-none transition focus:border-blue-400"
              >
                <option value="">All Zones</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {displayGeoName(zone)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {trendComparisonData.length ? (
            <div>
              <div className="h-[310px]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={
                      trendComparisonData
                    }
                    margin={{
                      top: 8,
                      right: 8,
                      left: -12,
                      bottom: 30,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="ward"
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                      height={65}
                      tick={{
                        fill:
                          '#64748b',
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      domain={[
                        0,
                        100,
                      ]}
                      tick={{
                        fill:
                          '#94a3b8',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: 14,
                        border:
                          '1px solid #e2e8f0',
                        boxShadow:
                          '0 12px 34px rgba(15,23,42,.10)',
                        fontSize: 12,
                      }}
                    />

                    <Bar
                      dataKey="current"
                      name="Current"
                      fill={
                        CHART_COLORS.blue
                      }
                      radius={[
                        5,
                        5,
                        0,
                        0,
                      ]}
                    />

                    <Bar
                      dataKey="sevenDay"
                      name="7-Day Avg"
                      fill={
                        CHART_COLORS.violet
                      }
                      radius={[
                        5,
                        5,
                        0,
                        0,
                      ]}
                    />

                    <Bar
                      dataKey="thirtyDay"
                      name="30-Day Avg"
                      fill={
                        CHART_COLORS.cyan
                      }
                      radius={[
                        5,
                        5,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {!hasHistoricalTrend && (
                <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-700">
                  Historical averages will appear as data accumulates.
                </div>
              )}
            </div>
          ) : (
            <ChartEmptyState
              message="No ward trend data available."
            />
          )}
        </ChartCard>

      </WardExecutiveOverview>


      {/* =====================================================
          RANKING LIST
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Ward Ranking
            </h3>
            <p className="mt-1 max-w-3xl text-[10px] font-semibold text-slate-500">
              N/A means no applicable asset, attendance upload, target or task exists for that component and period; it is excluded from the score.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {([
                ['list', 'List', List],
                ['map', 'Map', MapIcon],
              ] as const).map(([
                key,
                label,
                Icon,
              ]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setRankingView(key)
                  }
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-[10px] font-black transition ${rankingView === key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-white hover:text-slate-800'
                    }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-bold text-slate-500">
              Showing{' '}
              {displayedFrom}
              {'–'}
              {displayedTo}
              {' of '}
              {filteredRows.length}
            </div>
          </div>
        </div>


        {rankingView === 'map' ? (
          <WardRankingOperationsMap
            date={dateRange.to}
            zoneId={
              selectedZoneId ||
              undefined
            }
            wardId={
              selectedWardId ||
              undefined
            }
            module={
              moduleFilter === 'ALL'
                ? undefined
                : moduleFilter
            }
            rankingWardIds={
              filteredRows.map(
                (item) => item.wardId
              )
            }
          />
        ) : (
          <>

            {/* DESKTOP TABLE */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[1540px] w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                    {[
                      'Rank',
                      'Ward',
                      'Zone',
                      'Final Score',
                      'Status',
                      'Workforce',
                      'Beat',
                      'Toilet',
                      'Litter Bin',
                      'Daroga',
                      'SI',
                      'IEC',
                      'Trend',
                    ].map(
                      (heading) => (
                        <th
                          key={
                            heading
                          }
                          className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-[0.06em] text-slate-400"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {pagedRows.map(
                    (item) => (
                      <tr
                        key={
                          item.wardId
                        }
                        className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3">
                          <div className="inline-flex min-w-9 items-center justify-center rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-black text-slate-700">
                            {item.rankable
                              ? item.cityRank ??
                              '—'
                              : '—'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="min-w-[150px]">
                            <button
                              type="button"
                              onClick={() => {
                                openWardDrilldown(
                                  item
                                );
                              }}
                              className="text-left text-xs font-black text-slate-800 transition hover:text-blue-700 hover:underline"
                            >
                              {item.wardName ||
                                'Unnamed Ward'}
                            </button>

                            {item.zoneRank !==
                              null &&
                              item.zoneRank !==
                              undefined && (
                                <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                                  Zone Rank #{item.zoneRank}
                                </div>
                              )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-slate-600">
                            <MapPin
                              size={12}
                              className="text-slate-400"
                            />

                            {item.zoneName ||
                              '—'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {item.rankable ? (
                            <div>
                              <div className="text-base font-black text-slate-900">
                                {formatScore(
                                  item.finalScore,
                                  2
                                )}
                              </div>

                              <div className="text-[9px] font-bold uppercase text-slate-400">
                                / 100
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs font-black text-slate-400">
                              N/A
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <BandBadge
                            band={
                              item.performanceBand
                            }
                            rankable={
                              item.rankable
                            }
                          />
                        </td>

                        {[
                          item.components
                            ?.workforce,
                          item.components
                            ?.beat,
                          item.components
                            ?.toilet,
                          item.components
                            ?.litterBin,
                          item.components
                            ?.supervisor,
                          item.components
                            ?.qc,
                          item.components
                            ?.actionOfficer,
                        ].map(
                          (
                            component,
                            index
                          ) => (
                            <td
                              key={
                                `${item.wardId}-${index}`
                              }
                              className="px-4 py-3"
                            >
                              <button
                                type="button"
                                title={
                                  component?.applicable
                                    ? 'Open component details'
                                    : 'Not applicable: no scoring denominator exists for this Ward and period'
                                }
                                disabled={
                                  !component?.applicable
                                }
                                onClick={() => {
                                  if (
                                    component?.applicable
                                  ) {
                                    openWardDrilldown(
                                      item,
                                      COMPONENT_DRILLDOWN_KEYS[
                                      index
                                      ]
                                    );
                                  }
                                }}
                                className={`whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-black transition ${component?.applicable
                                  ? 'cursor-pointer text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                                  : 'cursor-not-allowed text-slate-400'
                                  }`}
                              >
                                {componentScoreLabel(
                                  component
                                )}
                              </button>
                            </td>
                          )
                        )}

                        <td className="px-4 py-3">
                          <TrendIndicator
                            item={
                              item
                            }
                          />
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>


            {/* MOBILE / TABLET CARDS */}

            <div className="divide-y divide-slate-100 lg:hidden">
              {pagedRows.map(
                (item) => (
                  <div
                    key={
                      item.wardId
                    }
                    className="p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-black text-slate-700">
                            {item.rankable
                              ? item.cityRank ??
                              '—'
                              : '—'}
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                openWardDrilldown(
                                  item
                                );
                              }}
                              className="block max-w-full truncate text-left text-sm font-black text-slate-900 transition hover:text-blue-700"
                            >
                              {item.wardName ||
                                'Unnamed Ward'}
                            </button>

                            <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                              <MapPin
                                size={10}
                              />

                              {item.zoneName ||
                                'Zone unavailable'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <BandBadge
                        band={
                          item.performanceBand
                        }
                        rankable={
                          item.rankable
                        }
                      />
                    </div>


                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                          Score
                        </div>

                        <div className="mt-1 text-sm font-black text-slate-900">
                          {item.rankable
                            ? formatScore(
                              item.finalScore,
                              2
                            )
                            : 'N/A'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                          7D Avg
                        </div>

                        <div className="mt-1 text-sm font-black text-slate-900">
                          {item.rankable &&
                            item.trend
                              ?.sevenDayAverage !==
                            undefined
                            ? formatScore(
                              item.trend
                                .sevenDayAverage,
                              1
                            )
                            : '—'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                          Trend
                        </div>

                        <div className="mt-1">
                          <TrendIndicator
                            item={
                              item
                            }
                          />
                        </div>
                      </div>
                    </div>


                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                      {[
                        [
                          'Workforce',
                          item.components
                            ?.workforce,
                        ],
                        [
                          'Beat',
                          item.components
                            ?.beat,
                        ],
                        [
                          'Toilet',
                          item.components
                            ?.toilet,
                        ],
                        [
                          'Litter Bin',
                          item.components
                            ?.litterBin,
                        ],
                        [
                          'Daroga',
                          item.components
                            ?.supervisor,
                        ],
                        [
                          'SI',
                          item.components
                            ?.qc,
                        ],
                        [
                          'IEC',
                          item.components
                            ?.actionOfficer,
                        ],
                      ].map(
                        ([
                          label,
                          component,
                        ], index) => (
                          <button
                            type="button"
                            key={
                              String(label)
                            }
                            disabled={
                              !(
                                component as WardComponentScore
                              )?.applicable
                            }
                            onClick={() => {
                              if (
                                (
                                  component as WardComponentScore
                                )?.applicable
                              ) {
                                openWardDrilldown(
                                  item,
                                  COMPONENT_DRILLDOWN_KEYS[
                                  index
                                  ]
                                );
                              }
                            }}
                            className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 text-left transition enabled:hover:text-blue-700 disabled:cursor-not-allowed"
                          >
                            <span className="text-[10px] font-bold text-slate-400">
                              {String(
                                label
                              )}
                            </span>

                            <span className={`text-[10px] font-black ${(
                              component as WardComponentScore
                            )?.applicable
                              ? 'text-slate-700'
                              : 'text-slate-400'
                              }`}>
                              {componentScoreLabel(
                                component as WardComponentScore
                              )}
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )
              )}
            </div>


            {!pagedRows.length && (
              <div className="px-6 py-16 text-center">
                <Award
                  size={32}
                  className="mx-auto text-slate-300"
                />

                <div className="mt-3 text-sm font-black text-slate-600">
                  No wards match your filters.
                </div>
              </div>
            )}


            {filteredRows.length >
              PAGE_SIZE && (
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
                  <div className="text-[11px] font-bold text-slate-400">
                    Page{' '}
                    {safePage}
                    {' of '}
                    {totalPages}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={
                        safePage <=
                        1
                      }
                      onClick={() => {
                        setPage(
                          (
                            current
                          ) =>
                            Math.max(
                              1,
                              current -
                              1
                            )
                        );
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft
                        size={15}
                      />
                    </button>

                    <button
                      type="button"
                      disabled={
                        safePage >=
                        totalPages
                      }
                      onClick={() => {
                        setPage(
                          (
                            current
                          ) =>
                            Math.min(
                              totalPages,
                              current +
                              1
                            )
                        );
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight
                        size={15}
                      />
                    </button>
                  </div>
                </div>
              )}
          </>
        )}
      </section>

      <WardDrilldownDrawer
        open={
          Boolean(
            drilldownWard
          )
        }
        ward={
          drilldownWard
        }
        initialComponent={
          drilldownComponent
        }
        from={
          dateRange.from
        }
        to={
          dateRange.to
        }
        onClose={
          closeWardDrilldown
        }
      />
    </div >
  );
}
