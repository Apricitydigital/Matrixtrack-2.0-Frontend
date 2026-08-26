'use client';

import {
    useMemo,
    useState,
} from 'react';

import type { ReactNode } from 'react';

import {
    AlertTriangle,
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    Award,
    BarChart3,
    Building2,
    Calendar,
    CheckCircle2,
    ChevronRight,
    CircleAlert,
    ClipboardCheck,
    Droplets,
    Gauge,
    HelpCircle,
    ListChecks,
    Minus,
    Route,
    ShieldCheck,
    Target,
    Trash2,
    TrendingDown,
    TrendingUp,
    Trophy,
    UserCheck,
    Users,
} from 'lucide-react';

import type {
    WardPerformanceBand,
    WardRankingComponent,
    WardRankingRow,
} from '@lib/wardRankingApi';


export type WardStatCardFilter =
    | 'ALL'
    | 'RANKED'
    | 'NODATA'
    | WardPerformanceBand;


type Props = {
    rows: WardRankingRow[];

    from: string;
    to: string;

    onOpenWard: (
        ward: WardRankingRow,
        component?: WardRankingComponent | null,
    ) => void;

    statusFilter?: WardStatCardFilter;

    onFilterStatus?: (
        status: WardStatCardFilter,
    ) => void;

    children?: ReactNode;
};


type ExecutiveComponentConfig = {
    field: keyof WardRankingRow['components'];
    key: WardRankingComponent;
    label: string;
    group: 'MODULE' | 'ROLE';
};


/*
 * WORKFORCE IS INTENTIONALLY NOT INCLUDED HERE.
 *
 * Workforce remains on hold at the UI level.
 * We are NOT touching backend Ward Ranking scoring.
 */
const EXECUTIVE_COMPONENTS: ExecutiveComponentConfig[] = [
    {
        field: 'beat',
        key: 'BEAT',
        label: 'Beat Compliance',
        group: 'MODULE',
    },
    {
        field: 'toilet',
        key: 'TOILET',
        label: 'Toilet',
        group: 'MODULE',
    },
    {
        field: 'litterBin',
        key: 'LITTERBIN',
        label: 'Litter Bin',
        group: 'MODULE',
    },
    {
        field: 'workforce',
        key: 'WORKFORCE',
        label: 'Workforce',
        group: 'ROLE',
    },
    {
        field: 'supervisor',
        key: 'SUPERVISOR',
        label: 'Supervisor',
        group: 'ROLE',
    },
    {
        field: 'qc',
        key: 'QC',
        label: 'Quality Control',
        group: 'ROLE',
    },
    {
        field: 'actionOfficer',
        key: 'ACTION_OFFICER',
        label: 'Action Officer',
        group: 'ROLE',
    },
];


const COMPONENT_ICONS: Record<
    WardRankingComponent,
    typeof ShieldCheck
> = {
    BEAT: Route,
    TOILET: Droplets,
    LITTERBIN: Trash2,
    WORKFORCE: Users,
    SUPERVISOR: UserCheck,
    QC: ClipboardCheck,
    ACTION_OFFICER: ShieldCheck,
};


const SEVERITY_ORDER: Record<
    string,
    number
> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
};


function safeNumber(
    value: unknown,
) {
    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}


function scoreBand(
    score: number,
) {
    if (score >= 85) {
        return {
            label: 'Good Performance',
            short: 'GREEN',
            text: 'text-emerald-700',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            dot: 'bg-emerald-500',
            bar: 'bg-emerald-500',
        };
    }

    if (score >= 70) {
        return {
            label: 'Attention Required',
            short: 'AMBER',
            text: 'text-amber-700',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            dot: 'bg-amber-500',
            bar: 'bg-amber-500',
        };
    }

    return {
        label: 'Immediate required action',
        short: 'RED',
        text: 'text-rose-700',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        bar: 'bg-rose-500',
    };
}


function periodLabel(
    from: string,
    to: string,
) {
    if (!from && !to) {
        return 'Current selection';
    }

    const format =
        (value: string) => {
            if (!value) {
                return '—';
            }

            const parts =
                value
                    .slice(0, 10)
                    .split('-');

            if (parts.length !== 3) {
                return value;
            }

            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        };

    if (from === to) {
        return format(from);
    }

    return `${format(from)} – ${format(to)}`;
}


function TrendBadge({
    trend,
}: {
    trend: any;
}) {
    if (!trend) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
                <Minus size={11} />
                No trend
            </span>
        );
    }

    const direction =
        String(
            trend.direction || '',
        ).toUpperCase();

    const change =
        safeNumber(
            trend.change,
        );

    if (direction === 'UP') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100">
                <ArrowUpRight size={11} />
                +{Math.abs(change).toFixed(2)}
            </span>
        );
    }

    if (direction === 'DOWN') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700 ring-1 ring-rose-100">
                <ArrowDownRight size={11} />
                -{Math.abs(change).toFixed(2)}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
            <Minus size={11} />
            Stable
        </span>
    );
}


function ComponentHealthRow({
    component,
}: {
    component: {
        key: WardRankingComponent;
        label: string;
        average: number | null;
        applicableCount: number;
    };
}) {
    const hasData =
        component.average !== null;

    const value =
        hasData
            ? safeNumber(
                component.average,
            )
            : 0;

    const band =
        scoreBand(value);

    const Icon =
        COMPONENT_ICONS[
        component.key
        ];

    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-3">

            <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${hasData
                    ? `${band.bg} ${band.text}`
                    : 'bg-slate-100 text-slate-400'
                    }`}
            >
                <Icon size={16} />
            </div>


            <div className="min-w-0 flex-1">

                <div className="truncate text-[11px] font-black text-slate-800">
                    {
                        component.label
                    }
                </div>

                <div className="mt-0.5 text-[9px] font-bold text-slate-400">
                    {
                        component.applicableCount
                    }{' '}
                    applicable wards
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">

                    <div
                        className={`h-full rounded-full transition-all duration-700 ${hasData
                            ? band.bar
                            : 'bg-slate-300'
                            }`}
                        style={{
                            width: hasData
                                ? `${Math.min(
                                    100,
                                    Math.max(
                                        0,
                                        value,
                                    ),
                                )}%`
                                : '0%',
                        }}
                    />

                </div>

            </div>


            <span
                className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black ${hasData
                    ? `${band.bg} ${band.text}`
                    : 'bg-slate-100 text-slate-500'
                    }`}
            >
                {hasData
                    ? `${value.toFixed(1)}%`
                    : 'N/A'}
            </span>

        </div>
    );
}


function SectionHeading({
    eyebrow,
    title,
    subtitle,
    badge,
}: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    badge?: string;
}) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
                {eyebrow && (
                    <div className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">
                        {eyebrow}
                    </div>
                )}

                <h3 className="text-[15px] font-black tracking-tight text-slate-950">
                    {title}
                </h3>

                {subtitle && (
                    <p className="mt-1 max-w-2xl text-[11px] font-semibold leading-5 text-slate-400">
                        {subtitle}
                    </p>
                )}
            </div>

            {badge && (
                <span className="w-fit shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-blue-700 ring-1 ring-blue-100">
                    {badge}
                </span>
            )}
        </div>
    );
}

export default function WardExecutiveOverview({
    rows,
    from,
    to,
    onOpenWard,
    statusFilter,
    onFilterStatus,
    children,
}: Props) {
    const [
        leaderboardMode,
        setLeaderboardMode,
    ] = useState<
        'TOP' | 'ATTENTION'
    >('ATTENTION');


    const analytics =
        useMemo(() => {
            const rankable =
                rows.filter(
                    (row) =>
                        row.rankable !== false &&
                        row.finalScore !== null &&
                        row.finalScore !== undefined,
                );

            const ranked =
                [...rankable]
                    .sort(
                        (a, b) =>
                            safeNumber(
                                b.finalScore,
                            ) -
                            safeNumber(
                                a.finalScore,
                            ),
                    );

            const cityAverage =
                ranked.length
                    ? ranked.reduce(
                        (
                            total,
                            row,
                        ) =>
                            total +
                            safeNumber(
                                row.finalScore,
                            ),
                        0,
                    ) /
                    ranked.length
                    : 0;

            const green =
                ranked.filter(
                    (row) =>
                        String(
                            row.performanceBand,
                        ).toUpperCase() ===
                        'GREEN',
                ).length;

            const amber =
                ranked.filter(
                    (row) =>
                        String(
                            row.performanceBand,
                        ).toUpperCase() ===
                        'AMBER',
                ).length;

            const red =
                ranked.filter(
                    (row) =>
                        String(
                            row.performanceBand,
                        ).toUpperCase() ===
                        'RED',
                ).length;

            const noData =
                Math.max(
                    0,
                    rows.length -
                    ranked.length,
                );

            const bestWard =
                ranked[0] || null;

            const priorityWard =
                ranked.length
                    ? ranked[
                    ranked.length - 1
                    ]
                    : null;


            /*
             * -----------------------------
             * ZONE ACCOUNTABILITY
             * -----------------------------
             */

            const zoneMap =
                new Map<
                    string,
                    {
                        id: string;
                        name: string;
                        scores: number[];
                        green: number;
                        amber: number;
                        red: number;
                        wards: number;
                    }
                >();

            ranked.forEach(
                (row) => {
                    const key =
                        row.zoneId ||
                        row.zoneName ||
                        'UNASSIGNED';

                    const name =
                        row.zoneName ||
                        'Unassigned Zone';

                    const existing =
                        zoneMap.get(key) || {
                            id: key,
                            name,
                            scores: [],
                            green: 0,
                            amber: 0,
                            red: 0,
                            wards: 0,
                        };

                    existing.scores.push(
                        safeNumber(
                            row.finalScore,
                        ),
                    );

                    existing.wards += 1;

                    const band =
                        String(
                            row.performanceBand ||
                            '',
                        ).toUpperCase();

                    if (band === 'GREEN') {
                        existing.green += 1;
                    }

                    if (band === 'AMBER') {
                        existing.amber += 1;
                    }

                    if (band === 'RED') {
                        existing.red += 1;
                    }

                    zoneMap.set(
                        key,
                        existing,
                    );
                },
            );

            const zones =
                Array.from(
                    zoneMap.values(),
                )
                    .map((zone) => ({
                        ...zone,

                        average:
                            zone.scores.length
                                ? zone.scores.reduce(
                                    (
                                        total,
                                        score,
                                    ) =>
                                        total +
                                        score,
                                    0,
                                ) /
                                zone.scores.length
                                : 0,
                    }))
                    .sort(
                        (a, b) =>
                            a.average -
                            b.average,
                    );


            /*
             * -----------------------------
             * COMPONENT HEALTH
             * -----------------------------
             */

            const components =
                EXECUTIVE_COMPONENTS.map(
                    (component) => {
                        const applicable =
                            ranked
                                .map(
                                    (row) =>
                                        row.components[
                                        component.field
                                        ] as any,
                                )
                                .filter(
                                    (score) =>
                                        score &&
                                        score.applicable !== false,
                                );

                        const average =
                            applicable.length
                                ? applicable.reduce(
                                    (
                                        total,
                                        score,
                                    ) =>
                                        total +
                                        safeNumber(
                                            score.percentage,
                                        ),
                                    0,
                                ) /
                                applicable.length
                                : null;

                        return {
                            ...component,
                            average,
                            applicableCount:
                                applicable.length,
                        };
                    },
                );


            const scoredComponents =
                components.filter(
                    (item) =>
                        item.average !== null,
                );


            const sortedComponents =
                [...scoredComponents].sort(
                    (a, b) =>
                        safeNumber(
                            a.average,
                        ) -
                        safeNumber(
                            b.average,
                        ),
                );

            const weakestComponent =
                sortedComponents[0] ||
                null;

            const strongestComponent =
                sortedComponents.length
                    ? sortedComponents[
                    sortedComponents.length -
                    1
                    ]
                    : null;


            /*
             * -----------------------------
             * EXCEPTIONS / ESCALATIONS
             * -----------------------------
             */

            const exceptions =
                rows
                    .flatMap(
                        (ward) =>
                            (
                                (ward as any)
                                    .topExceptions ||
                                []
                            ).map(
                                (
                                    exception: any,
                                ) => ({
                                    ...exception,
                                    ward,
                                }),
                            ),
                    )
                    .sort(
                        (a, b) =>
                            (
                                SEVERITY_ORDER[
                                String(
                                    a.severity,
                                ).toUpperCase()
                                ] ?? 99
                            ) -
                            (
                                SEVERITY_ORDER[
                                String(
                                    b.severity,
                                ).toUpperCase()
                                ] ?? 99
                            ),
                    );

            const highExceptions =
                exceptions.filter(
                    (item) =>
                        String(
                            item.severity,
                        ).toUpperCase() ===
                        'HIGH',
                ).length;


            /*
             * -----------------------------
             * MOMENTUM
             * -----------------------------
             */

            const declining =
                ranked
                    .filter(
                        (row) =>
                            String(
                                (row as any)
                                    ?.trend
                                    ?.direction,
                            ).toUpperCase() ===
                            'DOWN',
                    )
                    .sort(
                        (a, b) =>
                            safeNumber(
                                (a as any)
                                    ?.trend
                                    ?.change,
                            ) -
                            safeNumber(
                                (b as any)
                                    ?.trend
                                    ?.change,
                            ),
                    );

            const improving =
                ranked
                    .filter(
                        (row) =>
                            String(
                                (row as any)
                                    ?.trend
                                    ?.direction,
                            ).toUpperCase() ===
                            'UP',
                    )
                    .sort(
                        (a, b) =>
                            safeNumber(
                                (b as any)
                                    ?.trend
                                    ?.change,
                            ) -
                            safeNumber(
                                (a as any)
                                    ?.trend
                                    ?.change,
                            ),
                    );


            return {
                ranked,
                cityAverage,

                green,
                amber,
                red,
                noData,

                bestWard,
                priorityWard,

                zones,
                worstZone:
                    zones[0] || null,
                bestZone:
                    zones.length
                        ? zones[
                        zones.length - 1
                        ]
                        : null,

                components,
                weakestComponent,
                strongestComponent,

                exceptions,
                highExceptions,

                declining,
                improving,
            };
        }, [rows]);


    const cityBand =
        scoreBand(
            analytics.cityAverage,
        );


    const leaderboard =
        leaderboardMode ===
            'TOP'
            ? analytics.ranked.slice(
                0,
                5,
            )
            : [...analytics.ranked]
                .reverse()
                .slice(0, 5);


    const briefingSummary =
        useMemo(() => {
            if (!analytics.ranked.length) {
                return {
                    tone: 'amber' as const,
                    text:
                        'None of the wards have enough data yet to be ranked, so a performance summary is not available for this period.',
                };
            }

            const sentences: string[] = [];

            if (
                analytics.red > 0 &&
                analytics.priorityWard
            ) {
                sentences.push(
                    `${analytics.red} of ${analytics.ranked.length} ranked ward${analytics.ranked.length === 1 ? '' : 's'} ${analytics.red === 1 ? 'is' : 'are'} scoring below 70 and need urgent attention, most of all ${analytics.priorityWard.wardName || 'the lowest-ranked ward'}, which is at just ${safeNumber(analytics.priorityWard.finalScore).toFixed(2)} out of 100.`,
                );
            } else {
                sentences.push(
                    'No ward is currently in the red zone, so overall performance across the city is stable for this period.',
                );
            }

            if (
                analytics.weakestComponent
            ) {
                sentences.push(
                    `The biggest gap across all wards is in ${analytics.weakestComponent.label}, which is averaging only ${safeNumber(analytics.weakestComponent.average).toFixed(1)}% performance.`,
                );
            }

            if (
                analytics.declining.length >
                0
            ) {
                sentences.push(
                    `${analytics.declining.length} ward${analytics.declining.length === 1 ? ' is' : 's are'} getting worse compared to the last period and should be watched closely.`,
                );
            }

            if (
                analytics.highExceptions >
                0
            ) {
                sentences.push(
                    `There ${analytics.highExceptions === 1 ? 'is' : 'are'} also ${analytics.highExceptions} high-priority issue${analytics.highExceptions === 1 ? '' : 's'} that management should look into.`,
                );
            }

            const tone: 'rose' | 'amber' | 'emerald' =
                analytics.red > 0 ||
                    analytics.highExceptions > 0
                    ? 'rose'
                    : analytics.declining.length > 0
                        ? 'amber'
                        : 'emerald';

            return {
                tone,
                text: sentences.join(' '),
            };
        }, [analytics]);


    const briefingTone = {
        rose:
            'border-rose-200 bg-rose-50/80 text-rose-800',
        amber:
            'border-amber-200 bg-amber-50/80 text-amber-800',
        emerald:
            'border-emerald-200 bg-emerald-50/80 text-emerald-800',
    };


    return (
        <div className="space-y-5">

            {/* =====================================================
          STAT CARDS
      ===================================================== */}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">

                <ExecutiveKpi
                    label="Total Wards"
                    value={rows.length}
                    sub={`${analytics.ranked.length} ranked`}
                    tone="blue"
                    active={statusFilter === 'ALL' || !statusFilter}
                    onClick={
                        onFilterStatus
                            ? () => onFilterStatus('ALL')
                            : undefined
                    }
                />

                <ExecutiveKpi
                    label="Ranking Completed"
                    value={
                        analytics
                            .ranked
                            .length
                    }
                    sub="Have data to rank"
                    tone="indigo"
                    active={statusFilter === 'RANKED'}
                    onClick={
                        onFilterStatus
                            ? () => onFilterStatus('RANKED')
                            : undefined
                    }
                />

                <ExecutiveKpi
                    label="Top Ranked Wards"
                    value={
                        analytics.green
                    }
                    sub="85 and above"
                    tone="emerald"
                    active={statusFilter === 'GREEN'}
                    onClick={
                        onFilterStatus
                            ? () => onFilterStatus('GREEN')
                            : undefined
                    }
                />

                <ExecutiveKpi
                    label="Average Ranked Wards"
                    value={
                        analytics.amber
                    }
                    sub="70 to 84.99"
                    tone="amber"
                    active={statusFilter === 'AMBER'}
                    onClick={
                        onFilterStatus
                            ? () => onFilterStatus('AMBER')
                            : undefined
                    }
                />

                <ExecutiveKpi
                    label="Below Average Ranked Wards"
                    value={
                        analytics.red
                    }
                    sub="Below 70"
                    tone="rose"
                    active={statusFilter === 'RED'}
                    onClick={
                        onFilterStatus
                            ? () => onFilterStatus('RED')
                            : undefined
                    }
                />

                <ExecutiveKpi
                    label="Ranking Pending"
                    value={
                        analytics.noData
                    }
                    sub="Awaiting data"
                    tone="slate"
                    active={statusFilter === 'NODATA'}
                    onClick={
                        onFilterStatus
                            ? () => onFilterStatus('NODATA')
                            : undefined
                    }
                />

            </section>


            {/* =====================================================
    WARD PERFORMANCE EXECUTIVE SUMMARY
===================================================== */}

            <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">

                {/* TOP SUMMARY */}
                <div className="relative flex flex-col gap-4 overflow-hidden bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/60 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">

                    <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-200/30 blur-3xl" />

                    {/* LEFT */}
                    <div className="relative flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">

                        <div className="flex shrink-0 items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
                                <BarChart3 size={18} />
                            </div>

                            <div>
                                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">
                                    Executive Summary of
                                </div>

                                <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950 sm:text-xl">
                                    Ward Performance
                                </h2>
                            </div>

                        </div>


                        <div className="flex flex-wrap items-center gap-2">

                            <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-2.5 py-1.5 shadow-sm">
                                <Calendar size={12} className="shrink-0 text-slate-400" />

                                <div>
                                    <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                                        Date
                                    </div>

                                    <div className="text-[10px] font-black text-slate-700">
                                        {periodLabel(
                                            from,
                                            to,
                                        )}
                                    </div>
                                </div>
                            </div>


                            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-2.5 py-1.5 shadow-sm">
                                <ListChecks size={12} className="shrink-0 text-emerald-500" />

                                <div>
                                    <div className="text-[7px] font-black uppercase tracking-wide text-emerald-500">
                                        Ranked
                                    </div>

                                    <div className="text-[10px] font-black text-emerald-700">
                                        {analytics.ranked.length}
                                    </div>
                                </div>
                            </div>


                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 shadow-sm">
                                <HelpCircle size={12} className="shrink-0 text-slate-400" />

                                <div>
                                    <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                                        No Data
                                    </div>

                                    <div className="text-[10px] font-black text-slate-700">
                                        {analytics.noData}
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>


                    {/* CITY SCORE */}
                    <div className="relative flex shrink-0 items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-3.5 text-white shadow-sm shadow-blue-200 lg:min-w-[460px]">

                        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

                        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">

                            <ScoreRing
                                score={analytics.cityAverage}
                                size={64}
                                trackColor="rgba(255,255,255,0.25)"
                                progressColor="#ffffff"
                            />

                            <div className="absolute flex flex-col items-center leading-none">
                                <span className="text-sm font-black tracking-[-0.03em] text-white">
                                    {analytics.cityAverage.toFixed(1)}
                                </span>
                            </div>

                        </div>


                        <div className="relative min-w-0 flex-1">

                            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-100">
                                City Performance Score
                            </div>

                            <div className="mt-1 flex items-center gap-1.5">
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${cityBand.short === 'GREEN'
                                        ? 'bg-emerald-300'
                                        : cityBand.short === 'AMBER'
                                            ? 'bg-amber-300'
                                            : 'bg-rose-300'
                                        }`}
                                />

                                <span className="text-[11px] font-black text-white">
                                    {cityBand.label}
                                </span>
                            </div>

                            <p className="mt-1 truncate text-[9px] font-semibold text-blue-100/80">
                                {analytics.ranked.length} ranked ward{analytics.ranked.length === 1 ? '' : 's'} this period
                            </p>

                        </div>


                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                            <Gauge size={14} />
                        </div>

                    </div>

                </div>


                {/* QUICK MANAGEMENT ANSWERS + BRIEFING */}
                <div className="border-t border-slate-100 bg-slate-50/50 p-4">

                    <div className="grid gap-2.5 sm:grid-cols-3">

                        <QuickAnswerCard
                            icon={<Trophy size={15} />}
                            iconTone="amber"
                            label="Best Performing Ward"
                            title={
                                analytics.bestWard?.wardName ||
                                'No ranked ward'
                            }
                            value={
                                analytics.bestWard
                                    ? `${safeNumber(
                                        analytics.bestWard.finalScore,
                                    ).toFixed(2)} / 100`
                                    : '—'
                            }
                            valueTone="text-emerald-600"
                            onClick={
                                analytics.bestWard
                                    ? () =>
                                        onOpenWard(
                                            analytics.bestWard!,
                                        )
                                    : undefined
                            }
                        />

                        <QuickAnswerCard
                            icon={<Target size={15} />}
                            iconTone="rose"
                            label="Worst Performing Ward"
                            title={
                                analytics.priorityWard?.wardName ||
                                'No ranked ward'
                            }
                            value={
                                analytics.priorityWard
                                    ? `${safeNumber(
                                        analytics.priorityWard.finalScore,
                                    ).toFixed(2)} / 100`
                                    : '—'
                            }
                            valueTone="text-rose-600"
                            onClick={
                                analytics.priorityWard
                                    ? () =>
                                        onOpenWard(
                                            analytics.priorityWard!,
                                        )
                                    : undefined
                            }
                        />

                        <QuickAnswerCard
                            icon={<Building2 size={15} />}
                            iconTone="blue"
                            label="Lowest Performing Zone"
                            title={
                                analytics.worstZone?.name ||
                                'No zone data'
                            }
                            value={
                                analytics.worstZone
                                    ? `${analytics.worstZone.average.toFixed(
                                        2,
                                    )} avg. score`
                                    : '—'
                            }
                            valueTone="text-blue-600"
                        />

                    </div>


                    {/* MANAGEMENT BRIEFING */}
                    <div
                        className={`mt-3 flex items-start gap-3 rounded-2xl border p-4 ${briefingTone[
                            briefingSummary.tone
                        ]}`}
                    >

                        <div className="mt-0.5 shrink-0">
                            {briefingSummary.tone ===
                                'rose' ? (
                                <CircleAlert size={18} />
                            ) : briefingSummary.tone ===
                                'amber' ? (
                                <AlertTriangle size={18} />
                            ) : (
                                <CheckCircle2 size={18} />
                            )}
                        </div>

                        <div>
                            <div className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">
                                Management Briefing
                            </div>

                            <p className="mt-1 text-[13px] font-semibold leading-6">
                                {briefingSummary.text}
                            </p>
                        </div>

                    </div>

                </div>

            </section>


            {children}


            {/* =====================================================
          WARD MOMENTUM
      ===================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                <SectionHeading
                    title="Ward Momentum"
                    subtitle="Where performance is improving or declining."
                />


                <div className="mt-5 grid gap-4 lg:grid-cols-2">

                    {/* DECLINING */}

                    <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-4">

                        <div className="flex items-center justify-between">

                            <div className="flex items-center gap-2">
                                <TrendingDown
                                    size={16}
                                    className="text-rose-600"
                                />

                                <span className="text-[11px] font-black text-slate-900">
                                    Declining
                                </span>
                            </div>

                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black text-rose-700">
                                {
                                    analytics
                                        .declining
                                        .length
                                }
                            </span>

                        </div>


                        <div className="mt-3 space-y-2">

                            {analytics.declining
                                .slice(
                                    0,
                                    4,
                                )
                                .map(
                                    (ward) => (
                                        <button
                                            key={
                                                ward.wardId
                                            }
                                            type="button"
                                            onClick={() =>
                                                onOpenWard(
                                                    ward,
                                                )
                                            }
                                            className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-left ring-1 ring-rose-100 transition hover:ring-rose-200"
                                        >

                                            <div>
                                                <div className="text-[10px] font-black text-slate-800">
                                                    {ward.wardName ||
                                                        'Ward'}
                                                </div>

                                                <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                                                    {ward.zoneName ||
                                                        'Zone —'}
                                                </div>
                                            </div>

                                            <TrendBadge
                                                trend={
                                                    (
                                                        ward as any
                                                    ).trend
                                                }
                                            />

                                        </button>
                                    ),
                                )}


                            {!analytics
                                .declining
                                .length && (
                                    <div className="rounded-xl bg-white px-3 py-7 text-center text-[10px] font-bold text-slate-400 ring-1 ring-rose-100">
                                        No declining wards.
                                    </div>
                                )}

                        </div>

                    </div>


                    {/* IMPROVING */}

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">

                        <div className="flex items-center justify-between">

                            <div className="flex items-center gap-2">
                                <TrendingUp
                                    size={16}
                                    className="text-emerald-600"
                                />

                                <span className="text-[11px] font-black text-slate-900">
                                    Improving
                                </span>
                            </div>

                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700">
                                {
                                    analytics
                                        .improving
                                        .length
                                }
                            </span>

                        </div>


                        <div className="mt-3 space-y-2">

                            {analytics.improving
                                .slice(
                                    0,
                                    4,
                                )
                                .map(
                                    (ward) => (
                                        <button
                                            key={
                                                ward.wardId
                                            }
                                            type="button"
                                            onClick={() =>
                                                onOpenWard(
                                                    ward,
                                                )
                                            }
                                            className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 text-left ring-1 ring-emerald-100 transition hover:ring-emerald-200"
                                        >

                                            <div>
                                                <div className="text-[10px] font-black text-slate-800">
                                                    {ward.wardName ||
                                                        'Ward'}
                                                </div>

                                                <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                                                    {ward.zoneName ||
                                                        'Zone —'}
                                                </div>
                                            </div>

                                            <TrendBadge
                                                trend={
                                                    (
                                                        ward as any
                                                    ).trend
                                                }
                                            />

                                        </button>
                                    ),
                                )}


                            {!analytics
                                .improving
                                .length && (
                                    <div className="rounded-xl bg-white px-3 py-7 text-center text-[10px] font-bold text-slate-400 ring-1 ring-emerald-100">
                                        No improving wards.
                                    </div>
                                )}

                        </div>

                    </div>

                </div>

            </section>


            {/* =====================================================
          WARD ACTION BOARD + ZONE ACCOUNTABILITY
      ===================================================== */}

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">

                {/* WARD BOARD */}

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                        <SectionHeading
                            title="Ward Action Board"
                            subtitle={
                                leaderboardMode === 'ATTENTION'
                                    ? 'Ordered by urgency — #1 needs attention first.'
                                    : 'Ordered by score — #1 is the best performer.'
                            }
                        />


                        <div className="flex flex-wrap gap-1.5">

                            <button
                                type="button"
                                onClick={() =>
                                    setLeaderboardMode(
                                        'ATTENTION',
                                    )
                                }
                                className={`rounded-lg border px-3 py-1.5 text-[10px] font-black transition ${leaderboardMode ===
                                    'ATTENTION'
                                    ? 'border-rose-600 bg-rose-50 text-rose-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:text-rose-700'
                                    }`}
                            >
                                Needs Attention
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setLeaderboardMode(
                                        'TOP',
                                    )
                                }
                                className={`rounded-lg border px-3 py-1.5 text-[10px] font-black transition ${leaderboardMode ===
                                    'TOP'
                                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                                    }`}
                            >
                                Top Performers
                            </button>

                        </div>

                    </div>


                    <div className="mt-5 space-y-2">

                        {leaderboard.length ? (
                            leaderboard.map(
                                (
                                    ward,
                                    index,
                                ) => {
                                    const score =
                                        safeNumber(
                                            ward.finalScore,
                                        );

                                    const band =
                                        scoreBand(
                                            score,
                                        );

                                    return (
                                        <button
                                            type="button"
                                            key={
                                                ward.wardId
                                            }
                                            onClick={() =>
                                                onOpenWard(
                                                    ward,
                                                )
                                            }
                                            className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                                        >

                                            <div
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-sm ring-1 ${leaderboardMode === 'ATTENTION'
                                                    ? 'bg-rose-50 text-rose-700 ring-rose-100'
                                                    : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                                                    }`}
                                            >
                                                {index + 1}
                                            </div>


                                            <div className="min-w-0 flex-1">

                                                <span className="block truncate text-xs font-black text-slate-900">
                                                    {ward.wardName ||
                                                        'Unnamed Ward'}
                                                </span>

                                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">

                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[9px] font-black ${band.bg} ${band.text}`}
                                                    >
                                                        {band.label}
                                                    </span>

                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {ward.zoneName ||
                                                            'Zone —'}
                                                    </span>

                                                </div>

                                            </div>


                                            <div className="shrink-0 text-right">

                                                <div className="text-sm font-black text-slate-950">
                                                    {score.toFixed(
                                                        2,
                                                    )}
                                                    <span className="ml-0.5 text-[10px] font-bold text-slate-400">
                                                        /100
                                                    </span>
                                                </div>

                                                <div className="mt-1">
                                                    <TrendBadge
                                                        trend={
                                                            (
                                                                ward as any
                                                            )
                                                                .trend
                                                        }
                                                    />
                                                </div>

                                            </div>


                                            <ChevronRight
                                                size={16}
                                                className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                                            />

                                        </button>
                                    );
                                },
                            )
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center text-xs font-bold text-slate-400">
                                No ranked wards available
                                for this selection.
                            </div>
                        )}

                    </div>

                </div>


                {/* ZONES */}

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                    <SectionHeading
                        title="Zone Performance"
                        subtitle="Ordered lowest to highest average score."
                        badge={`${analytics.zones.length} Zones`}
                    />


                    <div className="mt-6 space-y-4">

                        {analytics.zones.map(
                            (
                                zone,
                                index,
                            ) => {
                                const band =
                                    scoreBand(
                                        zone.average,
                                    );

                                return (
                                    <div
                                        key={
                                            zone.id
                                        }
                                    >

                                        <div className="mb-2 flex items-center justify-between gap-3">

                                            <div className="min-w-0">

                                                <div className="flex items-center gap-2">

                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[9px] font-black text-slate-500">
                                                        {index +
                                                            1}
                                                    </span>

                                                    <span className="truncate text-[11px] font-black text-slate-800">
                                                        {
                                                            zone.name
                                                        }
                                                    </span>

                                                </div>

                                                <div className="ml-8 mt-1 text-[9px] font-bold text-slate-400">
                                                    {zone.wards}{' '}
                                                    ranked wards ·{' '}
                                                    {zone.red}{' '}
                                                    red
                                                </div>

                                            </div>


                                            <div className={`rounded-lg px-2 py-1 text-[10px] font-black ${band.bg} ${band.text}`}>
                                                {zone.average.toFixed(
                                                    2,
                                                )}
                                            </div>

                                        </div>


                                        <div className="ml-8 h-2 overflow-hidden rounded-full bg-slate-100">

                                            <div
                                                className={`h-full rounded-full ${band.bar}`}
                                                style={{
                                                    width: `${Math.max(
                                                        0,
                                                        Math.min(
                                                            100,
                                                            zone.average,
                                                        ),
                                                    )}%`,
                                                }}
                                            />

                                        </div>

                                    </div>
                                );
                            },
                        )}


                        {!analytics.zones.length && (
                            <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center text-xs font-bold text-slate-400">
                                No zone performance data
                                available.
                            </div>
                        )}

                    </div>

                </div>

            </section>


            {/* =====================================================
          COMPONENT HEALTH + EXCEPTIONS
      ===================================================== */}

            <section className="grid gap-5 xl:grid-cols-2">

                {/* COMPONENT HEALTH */}

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                    <SectionHeading
                        title="Component Health"
                        subtitle="Average applicable performance, grouped by modules and staff roles."
                    />


                    <div className="mt-6">

                        <div className="mb-3 flex items-center gap-2">
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-blue-700">
                                Modules
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                                Field operations tracked on the ground
                            </span>
                        </div>

                        <div className="space-y-2.5">
                            {analytics.components
                                .filter(
                                    (component) =>
                                        component.group === 'MODULE',
                                )
                                .map((component) => (
                                    <ComponentHealthRow
                                        key={component.key}
                                        component={component}
                                    />
                                ))}
                        </div>

                    </div>


                    <div className="mt-6 border-t border-slate-100 pt-5">

                        <div className="mb-3 flex items-center gap-2">
                            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-violet-700">
                                Roles
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                                Staff accountability and supervision
                            </span>
                        </div>

                        <div className="space-y-2.5">
                            {analytics.components
                                .filter(
                                    (component) =>
                                        component.group === 'ROLE',
                                )
                                .map((component) => (
                                    <ComponentHealthRow
                                        key={component.key}
                                        component={component}
                                    />
                                ))}
                        </div>

                    </div>


                    {/* {analytics.weakestComponent && (
                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5">

                            <div className="flex items-start gap-2.5">

                                <AlertTriangle
                                    size={16}
                                    className="mt-0.5 shrink-0 text-amber-600"
                                />

                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-800">
                                        Primary operational weakness
                                    </div>

                                    <p className="mt-1 text-[11px] font-semibold leading-5 text-amber-700">
                                        {
                                            analytics
                                                .weakestComponent
                                                .label
                                        }{' '}
                                        is currently the lowest
                                        performing applicable
                                        component at{' '}
                                        {safeNumber(
                                            analytics
                                                .weakestComponent
                                                .average,
                                        ).toFixed(
                                            1,
                                        )}
                                        %.
                                    </p>
                                </div>

                            </div>

                        </div>
                    )} */}

                </div>


                {/* INTERVENTION QUEUE */}

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                    <SectionHeading
                        title="Priority Intervention Queue"
                        subtitle="Highest-severity exceptions needing attention."
                        badge={`${analytics.exceptions.length} Exceptions`}
                    />


                    <div className="mt-5 space-y-2">

                        {analytics.exceptions
                            .slice(
                                0,
                                6,
                            )
                            .map(
                                (
                                    exception: any,
                                    index,
                                ) => {
                                    const severity =
                                        String(
                                            exception.severity ||
                                            'LOW',
                                        ).toUpperCase();

                                    const severityClass =
                                        severity ===
                                            'HIGH'
                                            ? 'bg-rose-50 text-rose-700 ring-rose-100'
                                            : severity ===
                                                'MEDIUM'
                                                ? 'bg-amber-50 text-amber-700 ring-amber-100'
                                                : 'bg-blue-50 text-blue-700 ring-blue-100';

                                    return (
                                        <button
                                            type="button"
                                            key={`${exception.ward?.wardId}-${exception.title}-${index}`}
                                            onClick={() =>
                                                onOpenWard(
                                                    exception.ward,
                                                    exception.module as WardRankingComponent,
                                                )
                                            }
                                            className="group flex w-full items-start gap-3 rounded-2xl border border-slate-100 p-3.5 text-left transition hover:border-blue-200 hover:bg-blue-50/30"
                                        >

                                            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${severity ===
                                                'HIGH'
                                                ? 'bg-rose-50 text-rose-600'
                                                : severity ===
                                                    'MEDIUM'
                                                    ? 'bg-amber-50 text-amber-600'
                                                    : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                <AlertTriangle size={15} />
                                            </div>


                                            <div className="min-w-0 flex-1">

                                                <div className="flex flex-wrap items-center gap-2">

                                                    <span className="text-[11px] font-black text-slate-900">
                                                        {exception.title ||
                                                            'Operational exception'}
                                                    </span>

                                                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-black ring-1 ${severityClass}`}>
                                                        {
                                                            severity
                                                        }
                                                    </span>

                                                </div>

                                                <div className="mt-1 text-[9px] font-black uppercase tracking-[0.08em] text-blue-600">
                                                    {exception
                                                        .ward
                                                        ?.wardName ||
                                                        'Ward'}{' '}
                                                    ·{' '}
                                                    {String(
                                                        exception.module || '',
                                                    ).replace(
                                                        /_/g,
                                                        ' ',
                                                    )}
                                                </div>

                                                <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-slate-500">
                                                    {exception.description ||
                                                        'Open the ward to review supporting records.'}
                                                </p>

                                            </div>


                                            <ChevronRight
                                                size={15}
                                                className="mt-2 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                                            />

                                        </button>
                                    );
                                },
                            )}


                        {!analytics
                            .exceptions
                            .length && (
                                <div className="flex min-h-[230px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-5 text-center">

                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                        <CheckCircle2 size={20} />
                                    </div>

                                    <div className="mt-3 text-xs font-black text-slate-700">
                                        No priority exceptions
                                    </div>

                                    <div className="mt-1 max-w-xs text-[10px] font-semibold leading-5 text-slate-400">
                                        No Ward Ranking exceptions
                                        were generated for the
                                        current selection.
                                    </div>

                                </div>
                            )}

                    </div>

                </div>

            </section>

        </div>
    );
}


function ExecutiveKpi({
    label,
    value,
    sub,
    tone,
    active,
    onClick,
}: {
    label: string;
    value: number | string;
    sub: string;
    tone:
    | 'blue'
    | 'indigo'
    | 'emerald'
    | 'amber'
    | 'rose'
    | 'slate';
    active?: boolean;
    onClick?: () => void;
}) {
    const tones = {
        blue: {
            text: 'text-blue-700',
            icon: 'bg-blue-50 text-blue-600',
            accent: 'bg-blue-500',
            ring: 'border-blue-300 ring-blue-200',
        },

        indigo: {
            text: 'text-indigo-700',
            icon: 'bg-indigo-50 text-indigo-600',
            accent: 'bg-indigo-500',
            ring: 'border-indigo-300 ring-indigo-200',
        },

        emerald: {
            text: 'text-emerald-700',
            icon: 'bg-emerald-50 text-emerald-600',
            accent: 'bg-emerald-500',
            ring: 'border-emerald-300 ring-emerald-200',
        },

        amber: {
            text: 'text-amber-700',
            icon: 'bg-amber-50 text-amber-600',
            accent: 'bg-amber-500',
            ring: 'border-amber-300 ring-amber-200',
        },

        rose: {
            text: 'text-rose-700',
            icon: 'bg-rose-50 text-rose-600',
            accent: 'bg-rose-500',
            ring: 'border-rose-300 ring-rose-200',
        },

        slate: {
            text: 'text-slate-700',
            icon: 'bg-slate-100 text-slate-600',
            accent: 'bg-slate-400',
            ring: 'border-slate-300 ring-slate-200',
        },
    };

    const config =
        tones[tone];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className={`relative w-full overflow-hidden rounded-2xl border bg-white px-4 py-4 text-left shadow-sm transition ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default'} ${active ? `${config.ring} ring-2 ring-offset-1` : 'border-slate-200'}`}
        >

            <div className={`absolute bottom-0 left-0 top-0 w-[3px] ${config.accent}`} />

            <div className="flex items-start justify-between gap-3">

                <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                        {label}
                    </div>

                    <div className={`mt-2 text-2xl font-black tracking-[-0.04em] ${config.text}`}>
                        {value}
                    </div>

                    <div className="mt-1 text-[9px] font-bold text-slate-400">
                        {sub}
                    </div>
                </div>


                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${config.icon}`}>
                    {tone ===
                        'emerald' ? (
                        <CheckCircle2 size={15} />
                    ) : tone ===
                        'amber' ? (
                        <AlertTriangle size={15} />
                    ) : tone ===
                        'rose' ? (
                        <CircleAlert size={15} />
                    ) : tone ===
                        'slate' ? (
                        <Minus size={15} />
                    ) : tone ===
                        'indigo' ? (
                        <Award size={15} />
                    ) : (
                        <BarChart3 size={15} />
                    )}
                </div>

            </div>

        </button>
    );
}


function ScoreRing({
    score,
    size = 92,
    trackColor,
    progressColor,
}: {
    score: number;
    size?: number;
    trackColor?: string;
    progressColor?: string;
}) {
    const band =
        scoreBand(score);

    const strokeWidth = 7;

    const radius =
        (size - strokeWidth) / 2;

    const circumference =
        2 * Math.PI * radius;

    const clamped =
        Math.max(
            0,
            Math.min(
                100,
                score,
            ),
        );

    const offset =
        circumference *
        (1 - clamped / 100);

    const strokeColor =
        progressColor ||
        (band.short === 'GREEN'
            ? '#10b981'
            : band.short === 'AMBER'
                ? '#f59e0b'
                : '#f43f5e');

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
        >
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={trackColor || '#eef2f7'}
                strokeWidth={strokeWidth}
            />

            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{
                    transition:
                        'stroke-dashoffset 700ms ease',
                }}
            />
        </svg>
    );
}


function QuickAnswerCard({
    icon,
    iconTone,
    label,
    title,
    value,
    valueTone,
    onClick,
}: {
    icon: ReactNode;
    iconTone: 'amber' | 'rose' | 'blue' | 'slate';
    label: string;
    title: string;
    value: string;
    valueTone: string;
    onClick?: () => void;
}) {
    const cardTones: Record<
        typeof iconTone,
        {
            bg: string;
            border: string;
            icon: string;
        }
    > = {
        amber: {
            bg: 'bg-amber-50/60',
            border: 'border-amber-100',
            icon: 'bg-amber-100 text-amber-600',
        },
        rose: {
            bg: 'bg-rose-50/60',
            border: 'border-rose-100',
            icon: 'bg-rose-100 text-rose-600',
        },
        blue: {
            bg: 'bg-blue-50/60',
            border: 'border-blue-100',
            icon: 'bg-blue-100 text-blue-600',
        },
        slate: {
            bg: 'bg-slate-100/60',
            border: 'border-slate-200',
            icon: 'bg-slate-200 text-slate-600',
        },
    };

    const tone =
        cardTones[iconTone];

    const Wrapper =
        onClick ? 'button' : 'div';

    return (
        <Wrapper
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={`group flex items-center gap-3 rounded-xl border ${tone.border} ${tone.bg} px-3.5 py-3 text-left shadow-sm transition ${onClick
                ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
                : ''
                }`}
        >

            <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}
            >
                {icon}
            </div>

            <div className="min-w-0 flex-1">

                <div className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
                    {label}
                </div>

                <div className="truncate text-[13px] font-black text-slate-900">
                    {title}
                </div>

            </div>

            <div className="shrink-0 text-right">

                <div className={`text-[10px] font-black ${valueTone}`}>
                    {value}
                </div>

                {onClick && (
                    <ChevronRight
                        size={13}
                        className="ml-auto mt-0.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                    />
                )}

            </div>

        </Wrapper>
    );
}