'use client';

import {
    useMemo,
    useState,
} from 'react';

import {
    AlertTriangle,
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    Award,
    BarChart3,
    Building2,
    CheckCircle2,
    ChevronRight,
    CircleAlert,
    Gauge,
    Minus,
    ShieldCheck,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    Trophy,
} from 'lucide-react';

import type {
    WardRankingComponent,
    WardRankingRow,
} from '@lib/wardRankingApi';


type Props = {
    rows: WardRankingRow[];

    from: string;
    to: string;

    onOpenWard: (
        ward: WardRankingRow,
        component?: WardRankingComponent | null,
    ) => void;
};


type ExecutiveComponentConfig = {
    field: keyof WardRankingRow['components'];
    key: WardRankingComponent;
    label: string;
};


/*
 * WORKFORCE IS INTENTIONALLY NOT INCLUDED HERE.
 *
 * Workforce remains on hold at the UI level.
 * We are NOT touching backend Ward Ranking scoring.
 */
const EXECUTIVE_COMPONENTS: ExecutiveComponentConfig[] = [
    {
        field: 'workforce',
        key: 'WORKFORCE',
        label: 'Workforce',
    },
    {
        field: 'beat',
        key: 'BEAT',
        label: 'Beat Compliance',
    },
    {
        field: 'toilet',
        key: 'TOILET',
        label: 'Toilet',
    },
    {
        field: 'litterBin',
        key: 'LITTERBIN',
        label: 'Litter Bin',
    },
    {
        field: 'supervisor',
        key: 'SUPERVISOR',
        label: 'Supervisor',
    },
    {
        field: 'qc',
        key: 'QC',
        label: 'Quality Control',
    },
    {
        field: 'actionOfficer',
        key: 'ACTION_OFFICER',
        label: 'Action Officer',
    },
];


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
        label: 'Immediate Intervention',
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


    const briefing =
        useMemo(() => {
            const points: Array<{
                title: string;
                text: string;
                tone:
                | 'rose'
                | 'amber'
                | 'blue'
                | 'emerald';
            }> = [];

            if (!analytics.ranked.length) {
                return [
                    {
                        title:
                            'Ranking unavailable',
                        text:
                            'No ward currently has enough applicable operational data to generate a rank.',
                        tone:
                            'amber' as const,
                    },
                ];
            }

            if (analytics.red > 0) {
                points.push({
                    title:
                        'Immediate intervention',
                    text:
                        `${analytics.red} ward${analytics.red === 1 ? '' : 's'} currently fall below the 70-point intervention threshold.`,
                    tone: 'rose',
                });
            } else {
                points.push({
                    title:
                        'No red wards',
                    text:
                        'No ranked ward currently falls in the immediate-intervention band.',
                    tone:
                        'emerald',
                });
            }

            if (
                analytics.priorityWard
            ) {
                points.push({
                    title:
                        'Priority ward',
                    text:
                        `${analytics.priorityWard.wardName || 'Ward'} is the lowest-performing ranked ward at ${safeNumber(analytics.priorityWard.finalScore).toFixed(2)} / 100.`,
                    tone:
                        'amber',
                });
            }

            if (
                analytics.weakestComponent
            ) {
                points.push({
                    title:
                        'Weakest operational area',
                    text:
                        `${analytics.weakestComponent.label} is currently the weakest applicable component at ${safeNumber(analytics.weakestComponent.average).toFixed(1)}% average performance.`,
                    tone:
                        'blue',
                });
            }

            if (
                analytics.declining.length
            ) {
                points.push({
                    title:
                        'Performance deterioration',
                    text:
                        `${analytics.declining.length} ward${analytics.declining.length === 1 ? ' is' : 's are'} currently trending downward.`,
                    tone:
                        'rose',
                });
            }

            if (
                analytics.highExceptions >
                0
            ) {
                points.push({
                    title:
                        'High-priority exceptions',
                    text:
                        `${analytics.highExceptions} high-severity operational exception${analytics.highExceptions === 1 ? '' : 's'} require management attention.`,
                    tone:
                        'amber',
                });
            }

            return points.slice(
                0,
                4,
            );
        }, [analytics]);


    const briefingTone = {
        rose:
            'border-rose-200 bg-rose-50/80 text-rose-800',
        amber:
            'border-amber-200 bg-amber-50/80 text-amber-800',
        blue:
            'border-blue-200 bg-blue-50/80 text-blue-800',
        emerald:
            'border-emerald-200 bg-emerald-50/80 text-emerald-800',
    };


    return (
        <div className="space-y-5">

            {/* =====================================================
    WARD PERFORMANCE EXECUTIVE SUMMARY
===================================================== */}

            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">

                {/* TOP SUMMARY */}
                <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-6">

                    {/* LEFT */}
                    <div className="min-w-0">




                        <h2 className="mt-4 text-xl font-black tracking-[-0.03em] text-slate-950 sm:text-2xl">
                            Ward Performance
                        </h2>




                        <div className="mt-4 flex flex-wrap items-center gap-2.5">

                            <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                                <div className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                                    Period
                                </div>

                                <div className="mt-0.5 text-[10px] font-black text-slate-700">
                                    {periodLabel(
                                        from,
                                        to,
                                    )}
                                </div>
                            </div>


                            <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                                <div className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                                    Ranked
                                </div>

                                <div className="mt-0.5 text-[10px] font-black text-slate-700">
                                    {analytics.ranked.length}
                                </div>
                            </div>


                            <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                                <div className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                                    No Data
                                </div>

                                <div className="mt-0.5 text-[10px] font-black text-slate-700">
                                    {analytics.noData}
                                </div>
                            </div>

                        </div>

                    </div>


                    {/* CITY SCORE */}
                    <div className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#0f172a_0%,#172554_55%,#312e81_100%)] p-5 shadow-[0_14px_30px_rgba(15,23,42,0.14)]">

                        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl" />

                        <div className="relative">

                            <div className="flex items-start justify-between gap-4">

                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                                        City Performance Score
                                    </div>

                                    <div className="mt-2 flex items-end gap-1.5">
                                        <span className="text-4xl font-black tracking-[-0.05em] text-white">
                                            {analytics.cityAverage.toFixed(
                                                2,
                                            )}
                                        </span>

                                        <span className="pb-1 text-xs font-black text-slate-500">
                                            /100
                                        </span>
                                    </div>
                                </div>


                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-blue-300 ring-1 ring-white/10">
                                    <Gauge size={19} />
                                </div>

                            </div>


                            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">

                                <div
                                    className={`h-full rounded-full ${analytics.cityAverage >= 85
                                        ? 'bg-emerald-400'
                                        : analytics.cityAverage >= 70
                                            ? 'bg-amber-400'
                                            : 'bg-rose-400'
                                        }`}
                                    style={{
                                        width: `${Math.max(
                                            0,
                                            Math.min(
                                                100,
                                                analytics.cityAverage,
                                            ),
                                        )}%`,
                                    }}
                                />

                            </div>


                            <div className="mt-3 flex items-center justify-between gap-2">

                                <span
                                    className={`inline-flex items-center gap-1.5 text-[9px] font-black ${analytics.cityAverage >= 85
                                        ? 'text-emerald-300'
                                        : analytics.cityAverage >= 70
                                            ? 'text-amber-300'
                                            : 'text-rose-300'
                                        }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${analytics.cityAverage >= 85
                                            ? 'bg-emerald-400'
                                            : analytics.cityAverage >= 70
                                                ? 'bg-amber-400'
                                                : 'bg-rose-400'
                                            }`}
                                    />

                                    {cityBand.label}
                                </span>

                                <span className="text-[8px] font-bold text-slate-500">
                                    Current Selection
                                </span>

                            </div>

                        </div>

                    </div>

                </div>


                {/* QUICK MANAGEMENT ANSWERS */}
                <div className="grid border-t border-slate-100 bg-slate-50/60 sm:grid-cols-2 xl:grid-cols-4">

                    {/* BEST WARD */}
                    <button
                        type="button"
                        disabled={!analytics.bestWard}
                        onClick={() =>
                            analytics.bestWard &&
                            onOpenWard(
                                analytics.bestWard,
                            )
                        }
                        className="group border-b border-slate-100 p-4 text-left transition hover:bg-white sm:border-r xl:border-b-0"
                    >
                        <div className="flex items-start justify-between gap-3">

                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                <Trophy size={15} />
                            </div>

                            <ChevronRight
                                size={14}
                                className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                            />

                        </div>

                        <div className="mt-3 text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Best Performing Ward
                        </div>

                        <div className="mt-1 text-sm font-black text-slate-900">
                            {analytics.bestWard?.wardName ||
                                'No ranked ward'}
                        </div>

                        <div className="mt-1 text-[10px] font-black text-emerald-600">
                            {analytics.bestWard
                                ? `${safeNumber(
                                    analytics.bestWard.finalScore,
                                ).toFixed(2)} / 100`
                                : '—'}
                        </div>

                    </button>


                    {/* PRIORITY WARD */}
                    <button
                        type="button"
                        disabled={!analytics.priorityWard}
                        onClick={() =>
                            analytics.priorityWard &&
                            onOpenWard(
                                analytics.priorityWard,
                            )
                        }
                        className="group border-b border-slate-100 p-4 text-left transition hover:bg-white xl:border-b-0 xl:border-r"
                    >
                        <div className="flex items-start justify-between gap-3">

                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                                <Target size={15} />
                            </div>

                            <ChevronRight
                                size={14}
                                className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                            />

                        </div>

                        <div className="mt-3 text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Priority Intervention
                        </div>

                        <div className="mt-1 text-sm font-black text-slate-900">
                            {analytics.priorityWard?.wardName ||
                                'No ranked ward'}
                        </div>

                        <div className="mt-1 text-[10px] font-black text-rose-600">
                            {analytics.priorityWard
                                ? `${safeNumber(
                                    analytics.priorityWard.finalScore,
                                ).toFixed(2)} / 100`
                                : '—'}
                        </div>

                    </button>


                    {/* ZONE */}
                    <div className="border-b border-slate-100 p-4 sm:border-r xl:border-b-0">

                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Building2 size={15} />
                        </div>

                        <div className="mt-3 text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Lowest Performing Zone
                        </div>

                        <div className="mt-1 text-sm font-black text-slate-900">
                            {analytics.worstZone?.name ||
                                'No zone data'}
                        </div>

                        <div className="mt-1 text-[10px] font-black text-blue-600">
                            {analytics.worstZone
                                ? `${analytics.worstZone.average.toFixed(
                                    2,
                                )} avg. score`
                                : '—'}
                        </div>

                    </div>


                    {/* DECLINING */}
                    <div className="p-4">

                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                            <TrendingDown size={15} />
                        </div>

                        <div className="mt-3 text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Declining Wards
                        </div>

                        <div className="mt-1 text-sm font-black text-slate-900">
                            {analytics.declining.length}
                        </div>

                        <div className="mt-1 text-[10px] font-bold text-slate-400">
                            Require trend review
                        </div>

                    </div>

                </div>

            </section>


            {/* =====================================================
          RAG KPI STRIP
      ===================================================== */}

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">

                <ExecutiveKpi
                    label="Total Wards"
                    value={rows.length}
                    sub={`${analytics.ranked.length} ranked`}
                    tone="blue"
                />

                <ExecutiveKpi
                    label="Ranked"
                    value={
                        analytics
                            .ranked
                            .length
                    }
                    sub="Applicable data"
                    tone="indigo"
                />

                <ExecutiveKpi
                    label="Green"
                    value={
                        analytics.green
                    }
                    sub="85 and above"
                    tone="emerald"
                />

                <ExecutiveKpi
                    label="Amber"
                    value={
                        analytics.amber
                    }
                    sub="70 to 84.99"
                    tone="amber"
                />

                <ExecutiveKpi
                    label="Red"
                    value={
                        analytics.red
                    }
                    sub="Below 70"
                    tone="rose"
                />

                <ExecutiveKpi
                    label="No Data"
                    value={
                        analytics.noData
                    }
                    sub="Not rankable"
                    tone="slate"
                />

            </section>


            {/* =====================================================
          COMMISSIONER BRIEFING
      ===================================================== */}

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,23,42,0.04)] sm:p-6">

                <SectionHeading
                    eyebrow="Operational Intelligence"
                    title="Management Briefing"
                    subtitle="The most important conclusions from the current Ward Ranking selection."
                    badge="Decision Summary"
                />


                <div className="mt-5 grid gap-3 lg:grid-cols-2">

                    {briefing.map(
                        (
                            point,
                            index,
                        ) => (
                            <div
                                key={`${point.title}-${index}`}
                                className={`rounded-2xl border p-4 ${briefingTone[
                                    point.tone
                                ]
                                    }`}
                            >
                                <div className="flex items-start gap-3">

                                    <div className="mt-0.5">
                                        {point.tone ===
                                            'rose' ? (
                                            <CircleAlert size={17} />
                                        ) : point.tone ===
                                            'amber' ? (
                                            <AlertTriangle size={17} />
                                        ) : point.tone ===
                                            'emerald' ? (
                                            <CheckCircle2 size={17} />
                                        ) : (
                                            <Sparkles size={17} />
                                        )}
                                    </div>

                                    <div>
                                        <div className="text-xs font-black">
                                            {
                                                point.title
                                            }
                                        </div>

                                        <p className="mt-1 text-[11px] font-semibold leading-5 opacity-80">
                                            {
                                                point.text
                                            }
                                        </p>
                                    </div>

                                </div>
                            </div>
                        ),
                    )}

                </div>

            </section>


            {/* =====================================================
          WARD ACTION BOARD + ZONE ACCOUNTABILITY
      ===================================================== */}

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">

                {/* WARD BOARD */}

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,23,42,0.04)] sm:p-6">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                        <SectionHeading
                            eyebrow="Ward Accountability"
                            title="Ward Action Board"
                            subtitle="Switch between strongest wards and wards requiring management attention."
                        />


                        <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1">

                            <button
                                type="button"
                                onClick={() =>
                                    setLeaderboardMode(
                                        'ATTENTION',
                                    )
                                }
                                className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition ${leaderboardMode ===
                                    'ATTENTION'
                                    ? 'bg-white text-rose-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
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
                                className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition ${leaderboardMode ===
                                    'TOP'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
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

                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
                                                {ward.cityRank ??
                                                    index +
                                                    1}
                                            </div>


                                            <div className="min-w-0 flex-1">

                                                <div className="flex flex-wrap items-center gap-2">

                                                    <span className="truncate text-xs font-black text-slate-900">
                                                        {ward.wardName ||
                                                            'Unnamed Ward'}
                                                    </span>

                                                    <span className={`h-1.5 w-1.5 rounded-full ${band.dot}`} />

                                                </div>

                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">

                                                    <span>
                                                        {ward.zoneName ||
                                                            'Zone —'}
                                                    </span>

                                                    <span>
                                                        •
                                                    </span>

                                                    <span>
                                                        Zone Rank #
                                                        {ward.zoneRank ??
                                                            '—'}
                                                    </span>

                                                </div>

                                            </div>


                                            <div className="shrink-0 text-right">

                                                <div className="text-sm font-black text-slate-950">
                                                    {score.toFixed(
                                                        2,
                                                    )}
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

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,23,42,0.04)] sm:p-6">

                    <SectionHeading
                        eyebrow="Geographic Accountability"
                        title="Zone Performance"
                        subtitle="Zones are ordered from lowest to highest average Ward Performance Score."
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

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,23,42,0.04)] sm:p-6">

                    <SectionHeading
                        eyebrow="Operational Diagnosis"
                        title="Component Health"
                        subtitle="Average applicable performance across all Ward Ranking components."
                        badge="7 Components"
                    />


                    <div className="mt-6 space-y-4">

                        {analytics.components.map(
                            (
                                component,
                            ) => {
                                const hasData =
                                    component.average !== null;

                                const value =
                                    hasData
                                        ? safeNumber(
                                            component.average,
                                        )
                                        : 0;

                                const band =
                                    scoreBand(
                                        value,
                                    );

                                return (
                                    <div
                                        key={
                                            component.key
                                        }
                                    >

                                        <div className="mb-2 flex items-center justify-between gap-3">

                                            <div>

                                                <div className="text-[11px] font-black text-slate-800">
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

                                            </div>


                                            <span
                                                className={`rounded-lg px-2 py-1 text-[10px] font-black ${hasData
                                                    ? `${band.bg} ${band.text}`
                                                    : 'bg-slate-100 text-slate-500'
                                                    }`}
                                            >
                                                {hasData
                                                    ? `${value.toFixed(1)}%`
                                                    : 'N/A'}
                                            </span>

                                        </div>


                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">

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
                                );
                            },
                        )}

                    </div>


                    {analytics.weakestComponent && (
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
                    )}

                </div>


                {/* INTERVENTION QUEUE */}

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,23,42,0.04)] sm:p-6">

                    <SectionHeading
                        eyebrow="Management Escalation"
                        title="Priority Intervention Queue"
                        subtitle="Highest-severity operational exceptions requiring management attention."
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


            {/* =====================================================
          WARD MOMENTUM
      ===================================================== */}

            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_25px_rgba(15,23,42,0.04)] sm:p-6">

                <SectionHeading
                    eyebrow="Early Warning"
                    title="Ward Momentum"
                    subtitle="Quickly identify where performance is improving and where deterioration requires follow-up."
                    badge="Trend Watch"
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

        </div>
    );
}


function ExecutiveKpi({
    label,
    value,
    sub,
    tone,
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
}) {
    const tones = {
        blue: {
            text: 'text-blue-700',
            icon: 'bg-blue-50 text-blue-600',
            accent: 'bg-blue-500',
        },

        indigo: {
            text: 'text-indigo-700',
            icon: 'bg-indigo-50 text-indigo-600',
            accent: 'bg-indigo-500',
        },

        emerald: {
            text: 'text-emerald-700',
            icon: 'bg-emerald-50 text-emerald-600',
            accent: 'bg-emerald-500',
        },

        amber: {
            text: 'text-amber-700',
            icon: 'bg-amber-50 text-amber-600',
            accent: 'bg-amber-500',
        },

        rose: {
            text: 'text-rose-700',
            icon: 'bg-rose-50 text-rose-600',
            accent: 'bg-rose-500',
        },

        slate: {
            text: 'text-slate-700',
            icon: 'bg-slate-100 text-slate-600',
            accent: 'bg-slate-400',
        },
    };

    const config =
        tones[tone];

    return (
        <div className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.035)]">

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

        </div>
    );
}