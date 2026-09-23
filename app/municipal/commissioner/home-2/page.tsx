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
  UsersRound,
} from 'lucide-react';

import { apiFetch } from '@lib/apiClient';

import type {
  MapActor,
  OperationalRole,
  OperationsMapData,
  OperationsSummary,
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

type ModuleFilter =
  | 'ALL'
  | 'SWEEPING'
  | 'LITTERBIN'
  | 'TOILET';

type StatusFilter =
  | 'ALL'
  | WorkState;

const today = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
};

const STATUS_META: Array<{
  id: WorkState;
  label: string;
  color: string;
}> = [
  {
    id: 'NOT_REPORTED',
    label: 'Not Reported',
    color: '#64748b',
  },
  {
    id: 'PENDING',
    label: 'Pending',
    color: '#f59e0b',
  },
  {
    id: 'APPROVED',
    label: 'Approved',
    color: '#16a34a',
  },
  {
    id: 'REJECTED',
    label: 'Rejected',
    color: '#e11d48',
  },
  {
    id: 'ACTION_REQUIRED',
    label: 'Action Required',
    color: '#f97316',
  },
  {
    id: 'ACTION_TAKEN',
    label: 'Action Taken',
    color: '#2563eb',
  },
];

const emptySummary = (): OperationsSummary => ({
  total: 0,
  notReported: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  actionRequired: 0,
  actionTaken: 0,
});

function countStates(
  states: WorkState[],
): OperationsSummary {
  const summary = emptySummary();

  summary.total = states.length;

  states.forEach((state) => {
    if (state === 'NOT_REPORTED') {
      summary.notReported += 1;
    } else if (state === 'PENDING') {
      summary.pending += 1;
    } else if (state === 'APPROVED') {
      summary.approved += 1;
    } else if (state === 'REJECTED') {
      summary.rejected += 1;
    } else if (
      state === 'ACTION_REQUIRED'
    ) {
      summary.actionRequired += 1;
    } else if (
      state === 'ACTION_TAKEN'
    ) {
      summary.actionTaken += 1;
    }
  });

  return summary;
}

function matchesActorFilter(
  actors: MapActor[] | undefined,
  role: OperationalRole | '',
  userId: string,
) {
  const list = actors || [];

  if (role && userId) {
    return list.some(
      (actor) =>
        actor.role === role &&
        actor.id === userId,
    );
  }

  if (role) {
    return list.some(
      (actor) => actor.role === role,
    );
  }

  if (userId) {
    return list.some(
      (actor) => actor.id === userId,
    );
  }

  return true;
}

export default function CommissionerHome2Page() {
  const [data, setData] =
    useState<OperationsMapData | null>(
      null,
    );

  const [date, setDate] =
    useState(today());

  const [zoneId, setZoneId] =
    useState('');

  const [wardId, setWardId] =
    useState('');

  const [
    moduleFilter,
    setModuleFilter,
  ] =
    useState<ModuleFilter>('ALL');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>('ALL');

  const [
    roleFilter,
    setRoleFilter,
  ] =
    useState<
      OperationalRole | ''
    >('');

  const [userId, setUserId] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [visible, setVisible] =
    useState({
      beats: true,
      toilets: true,
      bins: true,
    });

  const [
    isFullscreen,
    setIsFullscreen,
  ] = useState(false);

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

  const loadMap =
    useCallback(async () => {
      setLoading(true);
      setError('');

      try {
        const query =
          new URLSearchParams({
            date,
          });

        if (zoneId) {
          query.set(
            'zoneId',
            zoneId,
          );
        }

        if (wardId) {
          query.set(
            'wardId',
            wardId,
          );
        }

        const response =
          await apiFetch<OperationsMapData>(
            `/city/dashboard/operations-map?${query}`,
          );



        setData(response);
      } catch (
        requestError: any
      ) {
        setError(
          requestError?.message ||
            'Unable to load city operations map.',
        );
      } finally {
        setLoading(false);
      }
    }, [date, zoneId, wardId]);

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

  const availableUsers =
    useMemo(() => {
      const unique = new Map<
        string,
        NonNullable<
          OperationsMapData['filters']['users']
        >[number]
      >();

      (
        data?.filters.users || []
      ).forEach((user) => {
        if (
          roleFilter &&
          user.role !== roleFilter
        ) {
          return;
        }

        if (!unique.has(user.id)) {
          unique.set(
            user.id,
            user,
          );
        }
      });

      return Array.from(
        unique.values(),
      ).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }, [data, roleFilter]);

  useEffect(() => {
    if (
      userId &&
      !availableUsers.some(
        (user) =>
          user.id === userId,
      )
    ) {
      setUserId('');
    }
  }, [
    availableUsers,
    userId,
  ]);

  const scopedBeats = useMemo(
    () =>
      moduleFilter ===
        'TOILET' ||
      moduleFilter ===
        'LITTERBIN'
        ? []
        : (
            data?.beats || []
          ).filter((item) =>
            matchesActorFilter(
              item.actors,
              roleFilter,
              userId,
            ),
          ),
    [
      data,
      moduleFilter,
      roleFilter,
      userId,
    ],
  );

  const scopedToilets =
    useMemo(
      () =>
        moduleFilter ===
          'SWEEPING' ||
        moduleFilter ===
          'LITTERBIN'
          ? []
          : (
              data?.toilets ||
              []
            ).filter((item) =>
              matchesActorFilter(
                item.actors,
                roleFilter,
                userId,
              ),
            ),
      [
        data,
        moduleFilter,
        roleFilter,
        userId,
      ],
    );

  const scopedBins = useMemo(
    () =>
      moduleFilter ===
        'SWEEPING' ||
      moduleFilter === 'TOILET'
        ? []
        : (
            data?.bins || []
          ).filter((item) =>
            matchesActorFilter(
              item.actors,
              roleFilter,
              userId,
            ),
          ),
    [
      data,
      moduleFilter,
      roleFilter,
      userId,
    ],
  );

  const scopeSummary =
    useMemo(
      () =>
        countStates([
          ...scopedBeats.map(
            (item) =>
              item.state,
          ),
          ...scopedToilets.map(
            (item) =>
              item.state,
          ),
          ...scopedBins.map(
            (item) =>
              item.state,
          ),
        ]),
      [
        scopedBeats,
        scopedToilets,
        scopedBins,
      ],
    );

  const filterByStatus = <
    T extends {
      state: WorkState;
    },
  >(
    items: T[],
  ) =>
    statusFilter === 'ALL'
      ? items
      : items.filter(
          (item) =>
            item.state ===
            statusFilter,
        );

  const filteredBeats =
    useMemo(
      () =>
        filterByStatus(
          scopedBeats,
        ),
      [
        scopedBeats,
        statusFilter,
      ],
    );

  const filteredToilets =
    useMemo(
      () =>
        filterByStatus(
          scopedToilets,
        ),
      [
        scopedToilets,
        statusFilter,
      ],
    );

  const filteredBins =
    useMemo(
      () =>
        filterByStatus(
          scopedBins,
        ),
      [
        scopedBins,
        statusFilter,
      ],
    );

  const displayedTotal =
    filteredBeats.length +
    filteredToilets.length +
    filteredBins.length;

  const reported =
    scopeSummary.total -
    scopeSummary.notReported;

  const toggleLayer = (
    key: keyof typeof visible,
  ) => {
    setVisible((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const toggleFullscreen =
    async () => {
      if (
        document.fullscreenElement
      ) {
        await document.exitFullscreen();
      } else {
        await mapSectionRef.current?.requestFullscreen();
      }
    };

  const clearFilters = () => {
    setZoneId('');
    setWardId('');
    setModuleFilter('ALL');
    setStatusFilter('ALL');
    setRoleFilter('');
    setUserId('');
  };

  const hasFilters =
    Boolean(zoneId) ||
    Boolean(wardId) ||
    moduleFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    Boolean(roleFilter) ||
    Boolean(userId);

  const kpis = [
    {
      id: 'ALL' as StatusFilter,
      label: 'Total Mapped',
      value: scopeSummary.total,
      helper: 'Current operational scope',
      icon: MapPinned,
      accent:
        'from-slate-700 to-slate-950',
      active:
        'border-slate-700 bg-slate-50 ring-slate-500/20',
    },
    {
      id: 'NOT_REPORTED' as StatusFilter,
      label: 'Not Reported',
      value:
        scopeSummary.notReported,
      helper:
        'No report for selected date',
      icon: Clock3,
      accent:
        'from-slate-400 to-slate-600',
      active:
        'border-slate-500 bg-slate-50 ring-slate-500/20',
    },
    {
      id: 'PENDING' as StatusFilter,
      label: 'Pending',
      value:
        scopeSummary.pending,
      helper:
        'Awaiting workflow review',
      icon: RefreshCw,
      accent:
        'from-amber-400 to-amber-600',
      active:
        'border-amber-500 bg-amber-50 ring-amber-500/20',
    },
    {
      id: 'APPROVED' as StatusFilter,
      label: 'Approved',
      value:
        scopeSummary.approved,
      helper:
        'Approved inspections',
      icon: CheckCircle2,
      accent:
        'from-emerald-500 to-green-700',
      active:
        'border-emerald-500 bg-emerald-50 ring-emerald-500/20',
    },
    {
      id: 'REJECTED' as StatusFilter,
      label: 'Rejected',
      value:
        scopeSummary.rejected,
      helper:
        'Rejected inspections',
      icon: AlertTriangle,
      accent:
        'from-rose-500 to-red-700',
      active:
        'border-rose-500 bg-rose-50 ring-rose-500/20',
    },
    {
      id: 'ACTION_REQUIRED' as StatusFilter,
      label: 'Action Required',
      value:
        scopeSummary.actionRequired,
      helper:
        'Needs operational action',
      icon: AlertTriangle,
      accent:
        'from-orange-400 to-orange-600',
      active:
        'border-orange-500 bg-orange-50 ring-orange-500/20',
    },
    {
      id: 'ACTION_TAKEN' as StatusFilter,
      label: 'Action Taken',
      value:
        scopeSummary.actionTaken,
      helper:
        'Corrective action completed',
      icon: ShieldCheck,
      accent:
        'from-blue-500 to-indigo-700',
      active:
        'border-blue-500 bg-blue-50 ring-blue-500/20',
    },
  ];

  const mapFocusLevel:
    | 'CITY'
    | 'ZONE'
    | 'WARD'
    | 'USER' = userId
    ? 'USER'
    : wardId
      ? 'WARD'
      : zoneId
        ? 'ZONE'
        : 'CITY';

  const activeStatusLabel =
    statusFilter === 'ALL'
      ? 'All Statuses'
      : STATUS_META.find(
          (item) =>
            item.id ===
            statusFilter,
        )?.label ||
        'All Statuses';

  return (
    <main className="min-h-full bg-[#f6f8fc] pb-10">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-6 text-white shadow-[0_24px_70px_-32px_rgba(15,23,42,0.9)] sm:px-8 lg:px-9">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />

          <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-80 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">
                <ShieldCheck
                  size={14}
                />

                Commissioner Command Center

                <span className="h-1 w-1 rounded-full bg-blue-300/60" />

                Live Operations Map
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-[34px]">
                {data?.city.name ||
                  'City'}{' '}
                Operations Map
              </h1>

              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-300">
                Track operational
                assets by status,
                module, role and user
                across Sweeping,
                Litter Bin and Toilet
                inspections.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-200">
                  <MapPin
                    size={12}
                    className="text-blue-300"
                  />

                  {data?.city.name ||
                    'City'}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />

                  LIVE DATA
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                  <CalendarDays
                    size={12}
                  />

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

            <div className="grid min-w-[310px] grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur-xl">
              <div className="rounded-xl bg-white/[0.05] px-4 py-3">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Reported
                </div>

                <div className="mt-1 text-2xl font-black">
                  {reported}

                  <span className="ml-1 text-xs font-semibold text-slate-400">
                    /{' '}
                    {
                      scopeSummary.total
                    }
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-orange-400/10 px-4 py-3">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-orange-300">
                  Action Required
                </div>

                <div className="mt-1 text-2xl font-black text-orange-200">
                  {
                    scopeSummary.actionRequired
                  }
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {kpis.map((kpi) => {
            const Icon =
              kpi.icon;

            const isActive =
              statusFilter ===
              kpi.id;

            return (
              <button
                type="button"
                key={kpi.id}
                onClick={() =>
                  setStatusFilter(
                    kpi.id,
                  )
                }
                className={`group relative min-w-0 overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  isActive
                    ? `${kpi.active} ring-2`
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                }`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${kpi.accent}`}
                />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                      {kpi.label}
                    </div>

                    <div className="mt-2 text-[25px] font-black tracking-tight text-slate-950">
                      {loading ? (
                        <span className="inline-block h-7 w-12 animate-pulse rounded-lg bg-slate-100" />
                      ) : (
                        kpi.value
                      )}
                    </div>
                  </div>

                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.accent} text-white shadow-sm`}
                  >
                    <Icon
                      size={16}
                    />
                  </div>
                </div>

                <div className="mt-2 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-500">
                  {kpi.helper}
                </div>
              </button>
            );
          })}
        </section>

        <section className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                <Filter
                  size={17}
                  className="text-blue-600"
                />

                Operational Filters
              </div>

              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                Filter by geography,
                module, workflow status,
                role and individual user.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                Showing{' '}
                {displayedTotal} /{' '}
                {scopeSummary.total}
              </div>

              {hasFilters && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="text-[11px] font-black text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            <FilterField label="Zone">
              <FilterSelect
                value={zoneId}
                onChange={(
                  value,
                ) => {
                  setZoneId(
                    value,
                  );

                  setWardId('');
                }}
              >
                <option value="">
                  All zones
                </option>

                {data?.filters.zones.map(
                  (zone) => (
                    <option
                      key={
                        zone.id
                      }
                      value={
                        zone.id
                      }
                    >
                      {
                        zone.name
                      }
                    </option>
                  ),
                )}
              </FilterSelect>
            </FilterField>

            <FilterField label="Ward">
              <FilterSelect
                value={wardId}
                onChange={
                  setWardId
                }
              >
                <option value="">
                  All wards
                </option>

                {wards.map(
                  (ward) => (
                    <option
                      key={
                        ward.id
                      }
                      value={
                        ward.id
                      }
                    >
                      {
                        ward.name
                      }
                    </option>
                  ),
                )}
              </FilterSelect>
            </FilterField>

            <FilterField label="Module">
              <FilterSelect
                value={
                  moduleFilter
                }
                onChange={(
                  value,
                ) =>
                  setModuleFilter(
                    value as ModuleFilter,
                  )
                }
              >
                <option value="ALL">
                  All modules
                </option>

                <option value="SWEEPING">
                  Sweeping
                </option>

                <option value="LITTERBIN">
                  Litter Bin
                </option>

                <option value="TOILET">
                  Toilet
                </option>
              </FilterSelect>
            </FilterField>

            <FilterField label="Status">
              <FilterSelect
                value={
                  statusFilter
                }
                onChange={(
                  value,
                ) =>
                  setStatusFilter(
                    value as StatusFilter,
                  )
                }
              >
                <option value="ALL">
                  All statuses
                </option>

                {STATUS_META.map(
                  (status) => (
                    <option
                      key={
                        status.id
                      }
                      value={
                        status.id
                      }
                    >
                      {
                        status.label
                      }
                    </option>
                  ),
                )}
              </FilterSelect>
            </FilterField>

            <FilterField label="Role">
              <FilterSelect
                value={
                  roleFilter
                }
                onChange={(
                  value,
                ) => {
                  setRoleFilter(
                    value as
                      | OperationalRole
                      | '',
                  );

                  setUserId('');
                }}
              >
                <option value="">
                  All roles
                </option>

                {data?.filters.roles.map(
                  (role) => (
                    <option
                      key={
                        role.value
                      }
                      value={
                        role.value
                      }
                    >
                      {
                        role.label
                      }
                    </option>
                  ),
                )}
              </FilterSelect>
            </FilterField>

            <FilterField label="User">
              <FilterSelect
                value={userId}
                onChange={
                  setUserId
                }
              >
                <option value="">
                  All users
                </option>

                {availableUsers.map(
                  (user) => (
                    <option
                      key={
                        user.id
                      }
                      value={
                        user.id
                      }
                    >
                      {
                        user.name
                      }
                      {!roleFilter
                        ? ` · ${user.roleLabel}`
                        : ''}
                    </option>
                  ),
                )}
              </FilterSelect>
            </FilterField>

            <FilterField label="Date">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(
                    event,
                  ) =>
                    setDate(
                      event.target
                        .value,
                    )
                  }
                  className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />

                <button
                  type="button"
                  onClick={
                    loadMap
                  }
                  disabled={
                    loading
                  }
                  title="Refresh map"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={15}
                    className={
                      loading
                        ? 'animate-spin'
                        : ''
                    }
                  />
                </button>
              </div>
            </FilterField>
          </div>
        </section>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            <span className="flex items-center gap-2">
              <AlertTriangle
                size={17}
              />

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

        <section
          ref={mapSectionRef}
          className={`relative overflow-hidden border border-slate-200 bg-white shadow-[0_20px_60px_-28px_rgba(15,23,42,.40)] ${
            isFullscreen
              ? 'h-screen min-h-screen w-screen rounded-none'
              : 'h-[700px] min-h-[560px] rounded-[26px]'
          }`}
        >
          <OperationsMapCanvas
            beats={filteredBeats}
            toilets={
              filteredToilets
            }
            bins={filteredBins}
            visible={visible}
            focusLevel={
              mapFocusLevel
            }
          />

          {loading && data && (
            <div className="absolute inset-0 z-[900] flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
              <div className="rounded-2xl border border-white bg-white/95 px-5 py-4 shadow-xl">
                <Loader2
                  className="mx-auto animate-spin text-blue-600"
                  size={25}
                />

                <div className="mt-2 text-xs font-bold text-slate-600">
                  Updating operational
                  map
                </div>
              </div>
            </div>
          )}

          <div className="absolute left-4 top-4 z-[800] w-[235px] rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_15px_40px_rgba(15,23,42,.16)] backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">
              <Layers3
                size={14}
              />

              Map Layers
            </div>

            {[
              {
                key: 'beats' as const,
                label:
                  'Sweeping',
                icon: MapPinned,
                count:
                  filteredBeats.length,
                activeClass:
                  'bg-indigo-50 text-indigo-900 ring-1 ring-inset ring-indigo-100',
                iconClass:
                  'text-indigo-600',
                countClass:
                  'bg-indigo-100 text-indigo-700',
              },
              {
                key: 'bins' as const,
                label:
                  'Litter Bin',
                icon: Trash2,
                count:
                  filteredBins.length,
                activeClass:
                  'bg-violet-50 text-violet-900 ring-1 ring-inset ring-violet-100',
                iconClass:
                  'text-violet-600',
                countClass:
                  'bg-violet-100 text-violet-700',
              },
              {
                key: 'toilets' as const,
                label: 'Toilet',
                icon: UsersRound,
                count:
                  filteredToilets.length,
                activeClass:
                  'bg-cyan-50 text-cyan-900 ring-1 ring-inset ring-cyan-100',
                iconClass:
                  'text-cyan-600',
                countClass:
                  'bg-cyan-100 text-cyan-700',
              },
            ].map((layer) => {
              const Icon =
                layer.icon;

              return (
                <button
                  key={
                    layer.key
                  }
                  type="button"
                  onClick={() =>
                    toggleLayer(
                      layer.key,
                    )
                  }
                  className={`mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs transition ${
                    visible[
                      layer.key
                    ]
                      ? `${layer.activeClass} font-black`
                      : 'bg-white font-semibold text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon
                      size={15}
                      className={
                        layer.iconClass
                      }
                    />

                    {
                      layer.label
                    }
                  </span>

                  <span
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${
                      visible[
                        layer.key
                      ]
                        ? layer.countClass
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {
                      layer.count
                    }
                  </span>
                </button>
              );
            })}
          </div>

          <div className="absolute left-1/2 top-4 z-[800] hidden -translate-x-1/2 rounded-full border border-white/80 bg-white/95 px-4 py-2 text-[11px] font-black text-slate-700 shadow-lg backdrop-blur-xl md:block">
            {activeStatusLabel}{' '}
            · {displayedTotal}{' '}
            assets
          </div>

          <button
            type="button"
            onClick={
              toggleFullscreen
            }
            className="absolute right-4 top-4 z-[800] flex h-11 items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-4 text-xs font-black text-slate-800 shadow-xl backdrop-blur-xl transition hover:bg-slate-950 hover:text-white"
          >
            {isFullscreen ? (
              <Minimize2
                size={16}
              />
            ) : (
              <Maximize2
                size={16}
              />
            )}

            <span className="hidden sm:inline">
              {isFullscreen
                ? 'Exit Fullscreen'
                : 'Full Screen'}
            </span>
          </button>

          <div className="absolute bottom-5 right-4 z-[800] max-w-[520px] rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-xl">
            <div className="mb-2 text-[9px] font-black uppercase tracking-[.16em] text-slate-400">
              Work Status
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_META.map(
                (item) => {
                  const active =
                    statusFilter ===
                    item.id;

                  return (
                    <button
                      type="button"
                      key={
                        item.id
                      }
                      onClick={() =>
                        setStatusFilter(
                          active
                            ? 'ALL'
                            : item.id,
                        )
                      }
                      className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition ${
                        active
                          ? 'border-slate-900 bg-slate-900 text-white shadow'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow"
                        style={{
                          backgroundColor:
                            item.color,
                        }}
                      />

                      {
                        item.label
                      }
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {!loading &&
            !error &&
            displayedTotal === 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[700] flex justify-center">
                <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-2 text-xs font-bold text-slate-500 shadow-lg backdrop-blur">
                  No mapped operational
                  assets found for the
                  selected filters.
                </div>
              </div>
            )}
        </section>
      </div>
    </main>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>

      {children}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (
    value: string,
  ) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative block">
      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
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
