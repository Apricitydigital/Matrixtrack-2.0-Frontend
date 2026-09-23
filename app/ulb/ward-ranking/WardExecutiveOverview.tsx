'use client';

import {
    useMemo,
    useState,
} from 'react';

import type { ReactNode } from 'react';

import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    BarChart3,
    CheckCircle2,
    ChevronRight,
    CircleAlert,
    ClipboardCheck,
    Droplets,
    Gauge,
    Minus,
    Route,
    ShieldCheck,
    Target,
    Trash2,
    UserCheck,
    Users,
} from 'lucide-react';

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

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
    shortLabel: string;
    group: 'MODULE' | 'ROLE';
};


const EXECUTIVE_COMPONENTS: ExecutiveComponentConfig[] = [
    {
        field: 'beat',
        key: 'BEAT',
        label: 'Beat Compliance',
        shortLabel: 'Beat',
        group: 'MODULE',
    },
    {
        field: 'toilet',
        key: 'TOILET',
        label: 'Toilet',
        shortLabel: 'Toilet',
        group: 'MODULE',
    },
    {
        field: 'litterBin',
        key: 'LITTERBIN',
        label: 'Litter Bin',
        shortLabel: 'Litter Bin',
        group: 'MODULE',
    },
    {
        field: 'workforce',
        key: 'WORKFORCE',
        label: 'Workforce',
        shortLabel: 'Workforce',
        group: 'ROLE',
    },
    {
        field: 'supervisor',
        key: 'SUPERVISOR',
        label: 'Daroga',
        shortLabel: 'Daroga',
        group: 'ROLE',
    },
    {
        field: 'qc',
        key: 'QC',
        label: 'Sanitary Inspector',
        shortLabel: 'SI',
        group: 'ROLE',
    },
    {
        field: 'actionOfficer',
        key: 'ACTION_OFFICER',
        label: 'IEC Member',
        shortLabel: 'IEC',
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


const SEVERITY_ORDER: Record<string, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
};


function safeNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}


function scoreBand(score: number) {
    if (score >= 85) {
        return {
            label: 'Good Performance',
            short: 'GREEN',
            text: 'text-emerald-700',
            softText: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            bar: 'bg-emerald-500',
            hex: '#10b981',
        };
    }

    if (score >= 70) {
        return {
            label: 'Attention Required',
            short: 'AMBER',
            text: 'text-amber-700',
            softText: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            bar: 'bg-amber-500',
            hex: '#f59e0b',
        };
    }

    return {
        label: 'Immediate Action Required',
        short: 'RED',
        text: 'text-rose-700',
        softText: 'text-rose-600',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        bar: 'bg-rose-500',
        hex: '#f43f5e',
    };
}


function periodLabel(from: string, to: string) {
    if (!from && !to) {
        return 'Current selection';
    }

    const format = (value: string) => {
        if (!value) {
            return '—';
        }

        const parts = value.slice(0, 10).split('-');

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


function TrendBadge({ trend }: { trend: any }) {
    if (!trend) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">
                <Minus size={10} />
                No trend
            </span>
        );
    }

    const direction = String(trend.direction || '').toUpperCase();
    const change = safeNumber(trend.change);

    if (direction === 'UP') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700 ring-1 ring-emerald-100">
                <ArrowUpRight size={10} />
                +{Math.abs(change).toFixed(2)}
            </span>
        );
    }

    if (direction === 'DOWN') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[9px] font-black text-rose-700 ring-1 ring-rose-100">
                <ArrowDownRight size={10} />
                -{Math.abs(change).toFixed(2)}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-600">
            <Minus size={10} />
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

                <h3 className="text-[16px] font-black tracking-[-0.02em] text-slate-950">
                    {title}
                </h3>

                {subtitle && (
                    <p className="mt-1 max-w-3xl text-[10px] font-semibold leading-5 text-slate-400">
                        {subtitle}
                    </p>
                )}
            </div>

            {badge && (
                <span className="w-fit shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-blue-700 ring-1 ring-blue-100">
                    {badge}
                </span>
            )}
        </div>
    );
}


function ScoreRing({
    score,
    size = 108,
    trackColor,
    progressColor,
}: {
    score: number;
    size?: number;
    trackColor?: string;
    progressColor?: string;
}) {
    const band = scoreBand(score);
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, score));
    const offset = circumference * (1 - clamped / 100);
    const strokeColor = progressColor || band.hex;

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
                style={{ transition: 'stroke-dashoffset 700ms ease' }}
            />
        </svg>
    );
}


function percentageLabel(score: any) {
    if (!score || score.applicable === false) {
        return null;
    }

    if (score.percentage === null || score.percentage === undefined) {
        return null;
    }

    return safeNumber(score.percentage);
}


function extractExceptionImpact(exception: any) {
    const directCandidates = [
        exception?.count,
        exception?.missedCount,
        exception?.missed,
        exception?.value,
        exception?.total,
    ];

    for (const candidate of directCandidates) {
        const parsed = Number(candidate);
        if (Number.isFinite(parsed) && parsed >= 0) {
            return parsed;
        }
    }

    const text = String(exception?.description || '');
    const match = text.match(/(\d[\d,]*)/);

    if (!match) {
        return 1;
    }

    return safeNumber(match[1].replace(/,/g, '')) || 1;
}


function exceptionAreaName(moduleValue: unknown) {
    const moduleName = String(moduleValue || 'OTHER').toUpperCase();

    if (moduleName === 'BEAT') return 'Beat';
    if (moduleName === 'TOILET') return 'Toilet';
    if (moduleName === 'LITTERBIN' || moduleName === 'LITTER_BIN') return 'Litter Bin';
    if (moduleName === 'WORKFORCE') return 'Workforce';
    if (moduleName === 'SUPERVISOR') return 'Daroga';
    if (moduleName === 'QC') return 'Sanitary Inspector';
    if (moduleName === 'ACTION_OFFICER') return 'IEC Member';

    return moduleName.replace(/_/g, ' ');
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
    const [leaderboardMode, setLeaderboardMode] = useState<'TOP' | 'ATTENTION'>('ATTENTION');

    const analytics = useMemo(() => {
        const rankable = rows.filter(
            (row) =>
                row.rankable !== false &&
                row.finalScore !== null &&
                row.finalScore !== undefined,
        );

        const ranked = [...rankable].sort(
            (a, b) => safeNumber(b.finalScore) - safeNumber(a.finalScore),
        );

        const cityAverage = ranked.length
            ? ranked.reduce(
                (total, row) => total + safeNumber(row.finalScore),
                0,
            ) / ranked.length
            : 0;

        const green = ranked.filter(
            (row) => String(row.performanceBand || '').toUpperCase() === 'GREEN',
        ).length;

        const amber = ranked.filter(
            (row) => String(row.performanceBand || '').toUpperCase() === 'AMBER',
        ).length;

        const red = ranked.filter(
            (row) => String(row.performanceBand || '').toUpperCase() === 'RED',
        ).length;

        const noData = Math.max(0, rows.length - ranked.length);

        const bestWard = ranked[0] || null;
        const priorityWard = ranked.length ? ranked[ranked.length - 1] : null;

        const zoneMap = new Map<
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

        ranked.forEach((row) => {
            const key = row.zoneId || row.zoneName || 'UNASSIGNED';
            const name = row.zoneName || 'Unassigned Zone';
            const existing = zoneMap.get(key) || {
                id: key,
                name,
                scores: [],
                green: 0,
                amber: 0,
                red: 0,
                wards: 0,
            };

            existing.scores.push(safeNumber(row.finalScore));
            existing.wards += 1;

            const band = String(row.performanceBand || '').toUpperCase();
            if (band === 'GREEN') existing.green += 1;
            if (band === 'AMBER') existing.amber += 1;
            if (band === 'RED') existing.red += 1;

            zoneMap.set(key, existing);
        });

        const zones = Array.from(zoneMap.values())
            .map((zone) => ({
                ...zone,
                average: zone.scores.length
                    ? zone.scores.reduce((total, score) => total + score, 0) /
                    zone.scores.length
                    : 0,
            }))
            .sort((a, b) => b.average - a.average);

        const components = EXECUTIVE_COMPONENTS.map((component) => {
            const applicable = ranked
                .map((row) => row.components?.[component.field] as any)
                .filter(
                    (score) =>
                        score &&
                        score.applicable !== false &&
                        score.percentage !== null &&
                        score.percentage !== undefined,
                );

            const average = applicable.length
                ? applicable.reduce(
                    (total, score) => total + safeNumber(score.percentage),
                    0,
                ) / applicable.length
                : null;

            return {
                ...component,
                average,
                applicableCount: applicable.length,
            };
        });

        const scoredComponents = components.filter(
            (item) => item.average !== null,
        );

        const sortedComponents = [...scoredComponents].sort(
            (a, b) => safeNumber(a.average) - safeNumber(b.average),
        );

        const weakestComponent = sortedComponents[0] || null;
        const strongestComponent = sortedComponents.length
            ? sortedComponents[sortedComponents.length - 1]
            : null;

        const exceptions = rows
            .flatMap((ward) =>
                (((ward as any).topExceptions || []) as any[]).map(
                    (exception: any) => ({
                        ...exception,
                        ward,
                    }),
                ),
            )
            .sort(
                (a, b) =>
                    (SEVERITY_ORDER[String(a.severity || '').toUpperCase()] ?? 99) -
                    (SEVERITY_ORDER[String(b.severity || '').toUpperCase()] ?? 99),
            );

        const highExceptions = exceptions.filter(
            (item) => String(item.severity || '').toUpperCase() === 'HIGH',
        ).length;

        const mediumExceptions = exceptions.filter(
            (item) => String(item.severity || '').toUpperCase() === 'MEDIUM',
        ).length;

        const lowExceptions = exceptions.filter(
            (item) => String(item.severity || '').toUpperCase() === 'LOW',
        ).length;

        const exceptionAreaMap = new Map<string, number>();

        exceptions.forEach((exception) => {
            const area = exceptionAreaName(exception.module);
            exceptionAreaMap.set(
                area,
                (exceptionAreaMap.get(area) || 0) + extractExceptionImpact(exception),
            );
        });

        const exceptionAreas = Array.from(exceptionAreaMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const declining = ranked
            .filter(
                (row) =>
                    String((row as any)?.trend?.direction || '').toUpperCase() ===
                    'DOWN',
            )
            .sort(
                (a, b) =>
                    safeNumber((a as any)?.trend?.change) -
                    safeNumber((b as any)?.trend?.change),
            );

        const improving = ranked
            .filter(
                (row) =>
                    String((row as any)?.trend?.direction || '').toUpperCase() ===
                    'UP',
            )
            .sort(
                (a, b) =>
                    safeNumber((b as any)?.trend?.change) -
                    safeNumber((a as any)?.trend?.change),
            );

        const attention = ranked
            .filter((row) => {
                const band = String(row.performanceBand || '').toUpperCase();
                return band === 'RED' || band === 'AMBER';
            })
            .sort((a, b) => safeNumber(a.finalScore) - safeNumber(b.finalScore));

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
            bestZone: zones[0] || null,
            worstZone: zones.length ? zones[zones.length - 1] : null,
            components,
            weakestComponent,
            strongestComponent,
            exceptions,
            highExceptions,
            mediumExceptions,
            lowExceptions,
            exceptionAreas,
            improving,
            declining,
            attention,
        };
    }, [rows]);

    const coveragePercent = rows.length
        ? (analytics.ranked.length / rows.length) * 100
        : 0;

    const cityBand = analytics.ranked.length
        ? scoreBand(analytics.cityAverage)
        : null;

    const immediateActionWards =
        analytics.ranked
            .filter(
                (row) =>
                    String(
                        row.performanceBand || '',
                    ).toUpperCase() === 'RED',
            )
            .sort(
                (a, b) =>
                    safeNumber(a.finalScore) -
                    safeNumber(b.finalScore),
            );

    const leaderboard =
        leaderboardMode === 'TOP'
            ? analytics.ranked.slice(0, 5)
            : immediateActionWards;

    /*
     * Commissioner exception drill-down.
     *
     * HIGH is selected by default because the executive KPI
     * represents unresolved critical/high-severity issues.
     */
    const [
        exceptionSeverityFilter,
        setExceptionSeverityFilter,
    ] = useState<
        'HIGH' |
        'MEDIUM' |
        'LOW' |
        'ALL'
    >('HIGH');

    const [
        exceptionAreaFilter,
        setExceptionAreaFilter,
    ] = useState<string>('ALL');

    /*
     * First apply severity.
     *
     * Area filtering is applied afterwards so the area chart
     * can still show the distribution for the selected severity.
     */
    const severityFilteredExceptions =
        analytics.exceptions.filter(
            (exception: any) => {
                if (
                    exceptionSeverityFilter ===
                    'ALL'
                ) {
                    return true;
                }

                return String(
                    exception.severity ||
                    'LOW'
                ).toUpperCase() ===
                    exceptionSeverityFilter;
            },
        );

    const exceptionAreaOptions =
        Array.from(
            new Set(
                analytics.exceptions.map(
                    (exception: any) =>
                        exceptionAreaName(
                            exception.module,
                        ),
                ),
            ),
        ).sort();

    /*
     * Commissioner-friendly area distribution.
     * Count issues, do not display internal weighted impact.
     */
    const exceptionCountByArea =
        Array.from(
            severityFilteredExceptions.reduce(
                (
                    map: Map<string, number>,
                    exception: any,
                ) => {
                    const area =
                        exceptionAreaName(
                            exception.module,
                        );

                    map.set(
                        area,
                        (
                            map.get(area) ||
                            0
                        ) + 1,
                    );

                    return map;
                },
                new Map<string, number>(),
            ),
        )
            .map(
                ([name, value]) => ({
                    name,
                    value,
                }),
            )
            .sort(
                (a, b) =>
                    b.value -
                    a.value,
            );

    const filteredExceptions =
        severityFilteredExceptions.filter(
            (exception: any) => {
                if (
                    exceptionAreaFilter ===
                    'ALL'
                ) {
                    return true;
                }

                return (
                    exceptionAreaName(
                        exception.module,
                    ) ===
                    exceptionAreaFilter
                );
            },
        );

    const selectedSeverityLabel =
        exceptionSeverityFilter === 'HIGH'
            ? 'High Priority'
            : exceptionSeverityFilter === 'MEDIUM'
                ? 'Medium Priority'
                : exceptionSeverityFilter === 'LOW'
                    ? 'Low Priority'
                    : 'All';

    const selectedAreaLabel =
        exceptionAreaFilter === 'ALL'
            ? 'All Areas'
            : exceptionAreaFilter;

    const fieldComponents = analytics.components.filter(
        (component) => component.group === 'MODULE',
    );

    const roleComponents = analytics.components.filter(
        (component) => component.group === 'ROLE',
    );

    const componentChartData = analytics.components
        .filter(
            (component) =>
                component.average !== null &&
                component.applicableCount > 0,
        )
        .sort(
            (a, b) => safeNumber(b.average) - safeNumber(a.average),
        )
        .map((component) => ({
            name: component.shortLabel,
            fullName: component.label,
            average: safeNumber(component.average),
        }));

    const topExceptionArea = analytics.exceptionAreas[0] || null;

    return (
        <div className="space-y-5">
            {/* =====================================================
                1. EXECUTIVE SNAPSHOT
            ===================================================== */}
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ExecutiveKpi
                    label="Ranking Coverage"
                    value={`${analytics.ranked.length} / ${rows.length}`}
                    sub={`${coveragePercent.toFixed(1)}% ranked · ${analytics.noData} pending`}
                    tone="blue"
                    icon={<BarChart3 size={17} />}
                    decorativeIcon={<BarChart3 size={64} />}
                    progress={coveragePercent}
                    active={statusFilter === 'ALL' || !statusFilter}
                    onClick={
                        onFilterStatus
                            ? () => onFilterStatus('ALL')
                            : undefined
                    }
                />

                <ExecutiveKpi
                    label="Average Ranked Ward Score"
                    value={
                        analytics.ranked.length
                            ? analytics.cityAverage.toFixed(2)
                            : '—'
                    }
                    sub={
                        analytics.ranked.length
                            ? `${cityBand?.label || '—'} · based on ${analytics.ranked.length} ranked`
                            : 'No ranked wards yet'
                    }
                    tone={
                        !cityBand
                            ? 'slate'
                            : cityBand.short === 'GREEN'
                                ? 'emerald'
                                : cityBand.short === 'AMBER'
                                    ? 'amber'
                                    : 'rose'
                    }
                    icon={<Gauge size={17} />}
                    decorativeIcon={<Gauge size={64} />}
                    active={statusFilter === 'RANKED'}
                    onClick={
                        onFilterStatus
                            ? () => onFilterStatus('RANKED')
                            : undefined
                    }
                />

                <ExecutiveKpi
                    label="Immediate Action Wards"
                    value={analytics.red}
                    sub={`${analytics.amber} attention required · ${analytics.green} good`}
                    tone="rose"
                    icon={<CircleAlert size={17} />}
                    decorativeIcon={<Target size={64} />}
                    active={statusFilter === 'RED'}
                    onClick={() => {
                        onFilterStatus?.('RED');
                        document
                            .getElementById('ward-attention')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                />

                <ExecutiveKpi
                    label="Unresolved Critical Issues"
                    value={analytics.highExceptions}
                    sub={`${analytics.highExceptions} high-severity of ${analytics.exceptions.length} total exceptions`}
                    tone={
                        analytics.highExceptions > 0
                            ? 'rose'
                            : analytics.exceptions.length > 0
                                ? 'amber'
                                : 'emerald'
                    }
                    icon={<AlertTriangle size={17} />}
                    decorativeIcon={<AlertTriangle size={64} />}

                    onClick={() => {
                        setExceptionSeverityFilter(
                            'HIGH'
                        );

                        setExceptionAreaFilter(
                            'ALL'
                        );
                        document
                            .getElementById(
                                'ward-issues'
                            )
                            ?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                            });
                    }}
                />
            </section>


            {/* =====================================================
                2. EXECUTIVE PERFORMANCE COMMAND CENTRE
            ===================================================== */}
            <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>

                        <h2 className="mt-1 text-[18px] font-black tracking-[-0.03em] text-slate-950">
                            City Ward Performance
                        </h2>
                    </div>

                    <span className="w-fit rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[9px] font-black text-blue-700">
                        {periodLabel(from, to)}
                    </span>
                </div>

                <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[0.88fr_1.12fr_1fr]">
                    {/* SCORE */}
                    <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-slate-950 via-[#14204b] to-[#243b84] p-5 text-white shadow-lg shadow-blue-950/10">
                        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-400/20 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-violet-400/15 blur-3xl" />

                        <div className="relative">
                            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-200">
                                Average Ranked Ward Score
                            </div>

                            <div className="mt-5 flex items-center gap-5">
                                <div className="relative flex h-[108px] w-[108px] shrink-0 items-center justify-center">
                                    <ScoreRing
                                        score={analytics.ranked.length ? analytics.cityAverage : 0}
                                        size={108}
                                        trackColor="rgba(255,255,255,0.16)"
                                        progressColor={
                                            analytics.ranked.length
                                                ? '#ffffff'
                                                : 'rgba(255,255,255,0.35)'
                                        }
                                    />

                                    <div className="absolute text-center leading-none">
                                        <div className="text-[28px] font-black tracking-[-0.06em]">
                                            {analytics.ranked.length
                                                ? analytics.cityAverage.toFixed(1)
                                                : '—'}
                                        </div>
                                        <div className="mt-1 text-[8px] font-black uppercase tracking-wider text-blue-200">
                                            out of 100
                                        </div>
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="text-[20px] font-black tracking-[-0.03em]">
                                        {analytics.ranked.length
                                            ? cityBand?.label
                                            : 'Pending'}
                                    </div>
                                    <div className="mt-1 text-[10px] font-semibold text-blue-100/75">
                                        Based on {analytics.ranked.length} of {rows.length} wards
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/10">
                                <div className="flex items-center justify-between text-[10px] font-black">
                                    <span className="text-blue-100">Ranking coverage</span>
                                    <span>{coveragePercent.toFixed(1)}%</span>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                                    <div
                                        className="h-full rounded-full bg-white transition-all duration-700"
                                        style={{ width: `${Math.max(0, Math.min(100, coveragePercent))}%` }}
                                    />
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-blue-100/70">
                                    <span>{analytics.ranked.length} ranked</span>
                                    <span>{analytics.noData} pending</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DISTRIBUTION */}
                    <div className="rounded-[20px] border border-slate-100 bg-slate-50/55 p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                                    Performance Distribution
                                </div>
                                <div className="mt-1 text-[14px] font-black text-slate-900">
                                    Ward Status Mix
                                </div>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-slate-500 shadow-sm ring-1 ring-slate-100">
                                {rows.length} wards
                            </span>
                        </div>

                        <div className="mt-6 overflow-hidden rounded-full bg-slate-200">
                            <div className="flex h-3 w-full">
                                {rows.length > 0 && analytics.green > 0 && (
                                    <div
                                        className="h-full bg-emerald-500"
                                        style={{ width: `${(analytics.green / rows.length) * 100}%` }}
                                    />
                                )}
                                {rows.length > 0 && analytics.amber > 0 && (
                                    <div
                                        className="h-full bg-amber-500"
                                        style={{ width: `${(analytics.amber / rows.length) * 100}%` }}
                                    />
                                )}
                                {rows.length > 0 && analytics.red > 0 && (
                                    <div
                                        className="h-full bg-rose-500"
                                        style={{ width: `${(analytics.red / rows.length) * 100}%` }}
                                    />
                                )}
                                {rows.length > 0 && analytics.noData > 0 && (
                                    <div
                                        className="h-full bg-slate-300"
                                        style={{ width: `${(analytics.noData / rows.length) * 100}%` }}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-2.5">
                            <DistributionStat
                                label="Strong"
                                value={analytics.green}
                                tone="emerald"
                                note="85 and above"
                            />
                            <DistributionStat
                                label="Watch"
                                value={analytics.amber}
                                tone="amber"
                                note="70–84.99"
                            />
                            <DistributionStat
                                label="Critical"
                                value={analytics.red}
                                tone="rose"
                                note="Below 70"
                            />
                            <DistributionStat
                                label="Pending"
                                value={analytics.noData}
                                tone="slate"
                                note="Not ranked"
                            />
                        </div>
                    </div>

                    {/* PRIORITY FOCUS */}
                    <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">
                                    Priority Focus
                                </div>
                                <div className="mt-1 text-[14px] font-black text-slate-900">
                                    Current Signals
                                </div>
                            </div>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Target size={17} />
                            </div>
                        </div>

                        <div className="mt-4 divide-y divide-slate-100">
                            <FocusRow
                                label="Attention Ward"
                                value={analytics.priorityWard?.wardName || '—'}
                                metric={
                                    analytics.priorityWard
                                        ? safeNumber(analytics.priorityWard.finalScore).toFixed(2)
                                        : '—'
                                }
                                tone="rose"
                                onClick={
                                    analytics.priorityWard
                                        ? () => onOpenWard(analytics.priorityWard!)
                                        : undefined
                                }
                            />
                            <FocusRow
                                label={
                                    analytics.zones.length > 1
                                        ? 'Lowest Performing Zone'
                                        : 'Currently Ranked Zone'
                                }
                                value={analytics.worstZone?.name || '—'}
                                metric={
                                    analytics.worstZone
                                        ? analytics.worstZone.average.toFixed(2)
                                        : '—'
                                }
                                tone="blue"
                            />
                            <FocusRow
                                label="Weakest Area"
                                value={analytics.weakestComponent?.label || '—'}
                                metric={
                                    analytics.weakestComponent?.average !== null &&
                                        analytics.weakestComponent?.average !== undefined
                                        ? `${safeNumber(analytics.weakestComponent.average).toFixed(1)}%`
                                        : '—'
                                }
                                tone="amber"
                            />
                            <FocusRow
                                label="Highest Exception Impact"
                                value={topExceptionArea?.name || '—'}
                                metric={topExceptionArea ? String(topExceptionArea.value) : '—'}
                                tone="slate"
                            />
                        </div>
                    </div>
                </div>
            </section>


            {/* =====================================================
                3. IMMEDIATE ACTION / TOP RANKED
            ===================================================== */}
            <section
                id="ward-attention"
                className="scroll-mt-24 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <SectionHeading
                        eyebrow="Action View"
                        title={leaderboardMode === 'ATTENTION' ? 'Immediate Action Required' : 'Top Ranked Wards'}
                        subtitle={
                            leaderboardMode === 'ATTENTION'
                                ? 'All ranked wards below 70, lowest score first.'
                                : 'Highest-scoring ranked wards in the current selection.'
                        }
                    />

                    <div className="flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1">
                        <button
                            type="button"
                            onClick={() => setLeaderboardMode('ATTENTION')}
                            className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition ${leaderboardMode === 'ATTENTION'
                                ? 'bg-white text-rose-700 shadow-sm ring-1 ring-rose-100'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Immediate Action
                        </button>
                        <button
                            type="button"
                            onClick={() => setLeaderboardMode('TOP')}
                            className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition ${leaderboardMode === 'TOP'
                                ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100'
                                : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            Top Ranked
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 xl:grid-cols-2">
                    {leaderboard.length ? (
                        leaderboard.map((ward, index) => (
                            <WardFocusCard
                                key={ward.wardId}
                                ward={ward}
                                index={index}
                                mode={leaderboardMode}
                                onOpenWard={onOpenWard}
                            />
                        ))
                    ) : (
                        <div className="col-span-full flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 text-[11px] font-bold text-slate-400">
                            No ranked wards available for the current selection.
                        </div>
                    )}
                </div>
            </section>


            {/* =====================================================
                4. OPERATIONAL PERFORMANCE
            ===================================================== */}
            <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionHeading
                    eyebrow="Performance Analysis"
                    title="Operational Performance"
                    subtitle="Field operations and workforce supervision, shown only where the component is applicable."
                />

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <ComponentGroup
                            title="Field Operations"
                            subtitle="Ground-level inspection performance"
                            components={fieldComponents}
                        />

                        <div className="mt-5 border-t border-slate-100 pt-5">
                            <ComponentGroup
                                title="Workforce & Supervision"
                                subtitle="Workforce coverage and accountable roles"
                                components={roleComponents}
                            />
                        </div>
                    </div>

                    <div className="rounded-[20px] border border-slate-100 bg-slate-50/55 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                                    Component Comparison
                                </div>
                                <div className="mt-1 text-[13px] font-black text-slate-900">
                                    Average Applicable Performance
                                </div>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-slate-500 ring-1 ring-slate-100">
                                {componentChartData.length} active
                            </span>
                        </div>

                        {componentChartData.length ? (
                            <div className="mt-3 h-[330px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={componentChartData}
                                        layout="vertical"
                                        margin={{ top: 4, right: 26, left: 22, bottom: 4 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                        <XAxis
                                            type="number"
                                            domain={[0, 100]}
                                            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={76}
                                            tick={{ fontSize: 10, fontWeight: 800, fill: '#334155' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                                            contentStyle={{
                                                backgroundColor: '#0f172a',
                                                borderRadius: '12px',
                                                border: 'none',
                                                color: '#fff',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                            }}
                                            formatter={(value: any) => [
                                                `${safeNumber(value).toFixed(1)}%`,
                                                'Performance',
                                            ]}
                                        />
                                        <Bar dataKey="average" radius={[0, 8, 8, 0]} barSize={18}>
                                            {componentChartData.map((entry, index) => (
                                                <Cell
                                                    key={`${entry.name}-${index}`}
                                                    fill={scoreBand(entry.average).hex}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-[330px] items-center justify-center text-[11px] font-bold text-slate-400">
                                No applicable component data available.
                            </div>
                        )}
                    </div>
                </div>
            </section>


            {/* =====================================================
                5. ZONE + ISSUE INTELLIGENCE
            ===================================================== */}
            <section id="critical-issues-section" className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <SectionHeading
                        eyebrow="Location View"
                        title="Zone Performance"
                        subtitle={
                            analytics.zones.length > 1
                                ? 'Average ranked ward score by zone.'
                                : 'Current zone represented by ranked ward data.'
                        }
                        badge={`${analytics.zones.length} zone${analytics.zones.length === 1 ? '' : 's'}`}
                    />

                    <div className="mt-5 space-y-3.5">
                        {analytics.zones.length ? (
                            analytics.zones.map((zone, index) => {
                                const band = scoreBand(zone.average);

                                return (
                                    <div
                                        key={zone.id}
                                        className="rounded-2xl border border-slate-100 bg-slate-50/45 p-3.5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[10px] font-black text-slate-500 shadow-sm ring-1 ring-slate-100">
                                                {index + 1}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="truncate text-[11px] font-black text-slate-900">
                                                        {zone.name}
                                                    </span>
                                                    <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${band.bg} ${band.text}`}>
                                                        {zone.average.toFixed(2)}
                                                    </span>
                                                </div>

                                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                                                    <div
                                                        className={`h-full rounded-full ${band.bar}`}
                                                        style={{ width: `${Math.max(0, Math.min(100, zone.average))}%` }}
                                                    />
                                                </div>

                                                <div className="mt-2 flex items-center gap-2 text-[9px] font-bold text-slate-400">
                                                    <span>{zone.wards} ranked</span>
                                                    <span>·</span>
                                                    <span>{zone.red} critical</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 text-[11px] font-bold text-slate-400">
                                No ranked zone data available.
                            </div>
                        )}
                    </div>
                </div>

                <div
                    id="ward-issues"
                    className="scroll-mt-24 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                    <SectionHeading
                        eyebrow="Exception Intelligence"
                        title="Critical Issues Requiring Intervention"
                        subtitle="Highest-impact exceptions across the current ward selection."
                        badge={`${analytics.exceptions.length} TOTAL EXCEPTIONS`}
                    />

                    <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                        <div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExceptionSeverityFilter(
                                            'HIGH'
                                        )
                                    }
                                    className={`rounded-2xl transition ${
                                        exceptionSeverityFilter ===
                                        'HIGH'
                                            ? 'ring-2 ring-rose-200'
                                            : ''
                                    }`}
                                >
                                    <SeverityStat
                                        label="High"
                                        value={
                                            analytics.highExceptions
                                        }
                                        tone="rose"
                                    />
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setExceptionSeverityFilter(
                                            'MEDIUM'
                                        )
                                    }
                                    className={`rounded-2xl transition ${
                                        exceptionSeverityFilter ===
                                        'MEDIUM'
                                            ? 'ring-2 ring-amber-200'
                                            : ''
                                    }`}
                                >
                                    <SeverityStat
                                        label="Medium"
                                        value={
                                            analytics.mediumExceptions
                                        }
                                        tone="amber"
                                    />
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setExceptionSeverityFilter(
                                            'LOW'
                                        )
                                    }
                                    className={`rounded-2xl transition ${
                                        exceptionSeverityFilter ===
                                        'LOW'
                                            ? 'ring-2 ring-blue-200'
                                            : ''
                                    }`}
                                >
                                    <SeverityStat
                                        label="Low"
                                        value={
                                            analytics.lowExceptions
                                        }
                                        tone="blue"
                                    />
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setExceptionSeverityFilter(
                                            'ALL'
                                        )
                                    }
                                    className={`rounded-2xl transition ${
                                        exceptionSeverityFilter ===
                                        'ALL'
                                            ? 'ring-2 ring-slate-300'
                                            : ''
                                    }`}
                                >
                                    <div className="flex h-full min-h-[84px] flex-col items-center justify-center rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
                                        <div className="text-[22px] font-black text-slate-800">
                                            {
                                                analytics
                                                    .exceptions
                                                    .length
                                            }
                                        </div>

                                        <div className="mt-1 text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">
                                            All
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-slate-500">
                                <span className="font-black text-slate-900">
                                    {
                                        filteredExceptions.length
                                    } issues
                                </span>

                                <span>•</span>

                                <span>
                                    {
                                        selectedSeverityLabel
                                    }
                                </span>

                                <span>•</span>

                                <span>
                                    {
                                        selectedAreaLabel
                                    }
                                </span>

                                <span className="text-slate-300">
                                    / {
                                        analytics.exceptions.length
                                    } total
                                </span>
                            </div>

                            <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5">
                                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                                    Issues by Area
                                </div>

                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExceptionAreaFilter(
                                                'ALL'
                                            )
                                        }
                                        className={`rounded-lg border px-2.5 py-1.5 text-[8px] font-black transition ${
                                            exceptionAreaFilter ===
                                            'ALL'
                                                ? 'border-slate-300 bg-slate-800 text-white'
                                                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        All Areas
                                    </button>

                                    {
                                        exceptionAreaOptions.map(
                                            (area) => (
                                                <button
                                                    key={
                                                        area
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        setExceptionAreaFilter(
                                                            area
                                                        )
                                                    }
                                                    className={`rounded-lg border px-2.5 py-1.5 text-[8px] font-black transition ${
                                                        exceptionAreaFilter ===
                                                        area
                                                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                                                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {
                                                        area
                                                    }
                                                </button>
                                            ),
                                        )
                                    }
                                </div>



                                {exceptionCountByArea.length ? (
                                    <div className="mt-3 h-[180px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={exceptionCountByArea.slice(0, 5)}
                                                layout="vertical"
                                                margin={{ top: 4, right: 18, left: 20, bottom: 4 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                                <XAxis
                                                    type="number"
                                                    tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    type="category"
                                                    dataKey="name"
                                                    width={68}
                                                    tick={{ fontSize: 9, fontWeight: 800, fill: '#334155' }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                                                    contentStyle={{
                                                        backgroundColor: '#0f172a',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        color: '#fff',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                    }}
                                                    formatter={(value: any) => [
                                                        safeNumber(value),
                                                        'Impact',
                                                    ]}
                                                />
                                                <Bar dataKey="value" name="Issues"
                                                    fill="#f43f5e"
                                                    radius={[0, 8, 8, 0]}
                                                    barSize={17}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="flex h-[235px] items-center justify-center text-[10px] font-bold text-slate-400">
                                        No issues available for the selected severity.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                            {filteredExceptions.map((exception: any, index) => (
                                <ExceptionCard
                                    key={`${exception.ward?.wardId}-${exception.title}-${index}`}
                                    exception={exception}
                                    onOpenWard={onOpenWard}
                                />
                            ))}

                            {!filteredExceptions.length && (
                                <div className="flex min-h-[330px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 text-center">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div className="mt-3 text-[11px] font-black text-slate-700">
                                        No issues match the selected severity and area
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>


            {/* =====================================================
                6. PERFORMANCE MOVEMENT
            ===================================================== */}
            <section className="grid gap-5 xl:grid-cols-2">
                <MovementPanel
                    title="Improving"
                    tone="emerald"
                    icon={<ArrowUpRight size={16} />}
                    wards={analytics.improving.slice(0, 4)}
                    onOpenWard={onOpenWard}
                />

                <MovementPanel
                    title="Declining"
                    tone="rose"
                    icon={<ArrowDownRight size={16} />}
                    wards={analytics.declining.slice(0, 4)}
                    onOpenWard={onOpenWard}
                />
            </section>


            {/* Existing parent-supplied historical trend chart remains available. */}
            {children && (
                <section className="rounded-[24px] border border-slate-200 bg-white p-1 shadow-sm">
                    {children}
                </section>
            )}
        </div>
    );
}


function ExecutiveKpi({
    label,
    value,
    sub,
    tone,
    icon,
    decorativeIcon,
    progress,
    active,
    onClick,
}: {
    label: string;
    value: number | string;
    sub: string;
    tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
    icon: ReactNode;
    decorativeIcon: ReactNode;
    progress?: number;
    active?: boolean;
    onClick?: () => void;
}) {
    const tones = {
        blue: {
            value: 'text-blue-700',
            icon: 'bg-blue-50 text-blue-600',
            accent: 'bg-blue-500',
            glow: 'bg-blue-100',
            ring: 'border-blue-300 ring-blue-100',
            progress: 'bg-blue-500',
        },
        emerald: {
            value: 'text-emerald-700',
            icon: 'bg-emerald-50 text-emerald-600',
            accent: 'bg-emerald-500',
            glow: 'bg-emerald-100',
            ring: 'border-emerald-300 ring-emerald-100',
            progress: 'bg-emerald-500',
        },
        amber: {
            value: 'text-amber-700',
            icon: 'bg-amber-50 text-amber-600',
            accent: 'bg-amber-500',
            glow: 'bg-amber-100',
            ring: 'border-amber-300 ring-amber-100',
            progress: 'bg-amber-500',
        },
        rose: {
            value: 'text-rose-700',
            icon: 'bg-rose-50 text-rose-600',
            accent: 'bg-rose-500',
            glow: 'bg-rose-100',
            ring: 'border-rose-300 ring-rose-100',
            progress: 'bg-rose-500',
        },
        slate: {
            value: 'text-slate-700',
            icon: 'bg-slate-100 text-slate-600',
            accent: 'bg-slate-400',
            glow: 'bg-slate-100',
            ring: 'border-slate-300 ring-slate-100',
            progress: 'bg-slate-400',
        },
    };

    const config = tones[tone];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className={`group relative min-h-[116px] overflow-hidden rounded-[20px] border bg-white p-4 text-left shadow-sm transition-all duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg' : 'cursor-default'} ${active ? `${config.ring} ring-2` : 'border-slate-200'}`}
        >
            <div className={`absolute inset-y-0 left-0 w-[3px] ${config.accent}`} />
            <div className={`pointer-events-none absolute -bottom-6 -right-6 flex h-24 w-24 items-center justify-center rounded-full ${config.glow} opacity-35 blur-[1px] transition-transform duration-300 group-hover:scale-110`}>
                <div className="opacity-55">{decorativeIcon}</div>
            </div>

            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
                        {label}
                    </div>
                    <div className={`mt-2 text-[25px] font-black tracking-[-0.05em] ${config.value}`}>
                        {value}
                    </div>
                    <div className="mt-1 text-[9px] font-bold text-slate-400">
                        {sub}
                    </div>
                </div>

                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config.icon}`}>
                    {icon}
                </div>
            </div>

            {progress !== undefined && (
                <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className={`h-full rounded-full ${config.progress} transition-all duration-700`}
                        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                    />
                </div>
            )}
        </button>
    );
}


function DistributionStat({
    label,
    value,
    tone,
    note,
}: {
    label: string;
    value: number;
    tone: 'emerald' | 'amber' | 'rose' | 'slate';
    note: string;
}) {
    const tones = {
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        amber: 'bg-amber-50 text-amber-700 ring-amber-100',
        rose: 'bg-rose-50 text-rose-700 ring-rose-100',
        slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    };

    return (
        <div className={`rounded-2xl p-3 ring-1 ${tones[tone]}`}>
            <div className="flex items-end justify-between gap-2">
                <span className="text-[10px] font-black">{label}</span>
                <span className="text-[20px] font-black tracking-[-0.04em]">{value}</span>
            </div>
            <div className="mt-1 text-[8px] font-bold opacity-65">{note}</div>
        </div>
    );
}


function FocusRow({
    label,
    value,
    metric,
    tone,
    onClick,
}: {
    label: string;
    value: string;
    metric: string;
    tone: 'rose' | 'amber' | 'blue' | 'slate';
    onClick?: () => void;
}) {
    const tones = {
        rose: 'text-rose-600',
        amber: 'text-amber-600',
        blue: 'text-blue-600',
        slate: 'text-slate-600',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className={`flex w-full items-center gap-3 py-3 text-left ${onClick ? 'group cursor-pointer' : 'cursor-default'}`}
        >
            <div className="min-w-0 flex-1">
                <div className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400">
                    {label}
                </div>
                <div className="mt-0.5 truncate text-[11px] font-black text-slate-900">
                    {value}
                </div>
            </div>

            <div className={`shrink-0 text-[11px] font-black ${tones[tone]}`}>
                {metric}
            </div>

            {onClick && (
                <ChevronRight
                    size={14}
                    className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                />
            )}
        </button>
    );
}


function WardFocusCard({
    ward,
    index,
    mode,
    onOpenWard,
}: {
    ward: WardRankingRow;
    index: number;
    mode: 'TOP' | 'ATTENTION';
    onOpenWard: (
        ward: WardRankingRow,
        component?: WardRankingComponent | null,
    ) => void;
}) {
    const score = safeNumber(ward.finalScore);
    const band = scoreBand(score);

    return (
        <button
            type="button"
            onClick={() => onOpenWard(ward)}
            className="group relative overflow-hidden rounded-[20px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50/80 p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
        >
            <div className={`absolute left-0 top-0 h-full w-[3px] ${band.bar}`} />

            <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[12px] font-black ${mode === 'TOP' ? 'bg-blue-50 text-blue-700' : band.bg + ' ' + band.text}`}>
                    {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[14px] font-black text-slate-950">
                                    {ward.wardName || 'Unnamed Ward'}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400">
                                    {ward.zoneName || 'Zone —'}
                                </span>
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wide ${band.bg} ${band.text}`}>
                                    {band.label}
                                </span>
                                <TrendBadge trend={(ward as any).trend} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="text-right">
                                <div className="text-[19px] font-black tracking-[-0.04em] text-slate-950">
                                    {score.toFixed(2)}
                                    <span className="ml-1 text-[9px] font-bold text-slate-400">/100</span>
                                </div>
                            </div>
                            <ChevronRight
                                size={16}
                                className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                            />
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
                        {EXECUTIVE_COMPONENTS.map((component) => {
                            const componentScore = ward.components?.[component.field] as any;
                            const value = percentageLabel(componentScore);
                            const componentBand = value !== null ? scoreBand(value) : null;

                            return (
                                <div
                                    key={component.key}
                                    className="rounded-xl border border-slate-100 bg-white px-2.5 py-2 shadow-sm"
                                >
                                    <div className="truncate text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">
                                        {component.shortLabel}
                                    </div>
                                    <div className={`mt-1 text-[10px] font-black ${componentBand ? componentBand.text : 'text-slate-400'}`}>
                                        {value !== null ? `${value.toFixed(1)}%` : 'N/A'}
                                    </div>
                                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={`h-full rounded-full ${componentBand ? componentBand.bar : 'bg-slate-200'}`}
                                            style={{ width: value !== null ? `${Math.max(0, Math.min(100, value))}%` : '0%' }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </button>
    );
}


function ComponentGroup({
    title,
    subtitle,
    components,
}: {
    title: string;
    subtitle: string;
    components: Array<{
        key: WardRankingComponent;
        label: string;
        shortLabel: string;
        average: number | null;
        applicableCount: number;
    }>;
}) {
    return (
        <div>
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-blue-700">
                    {title}
                </span>
                <span className="text-[9px] font-bold text-slate-400">{subtitle}</span>
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {components.map((component) => (
                    <ComponentMetricCard
                        key={component.key}
                        component={component}
                    />
                ))}
            </div>
        </div>
    );
}


function ComponentMetricCard({
    component,
}: {
    component: {
        key: WardRankingComponent;
        label: string;
        average: number | null;
        applicableCount: number;
    };
}) {
    const hasData = component.average !== null;
    const value = hasData ? safeNumber(component.average) : 0;
    const band = hasData ? scoreBand(value) : null;
    const Icon = COMPONENT_ICONS[component.key];

    return (
        <div className="group relative overflow-hidden rounded-[18px] border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="pointer-events-none absolute -bottom-5 -right-5 opacity-[0.05]">
                <Icon size={72} />
            </div>

            <div className="relative">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${band ? `${band.bg} ${band.text}` : 'bg-slate-100 text-slate-400'}`}>
                            <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="truncate text-[10px] font-black text-slate-900">
                                {component.label}
                            </div>
                            <div className="mt-0.5 text-[8px] font-bold text-slate-400">
                                {component.applicableCount} applicable ward{component.applicableCount === 1 ? '' : 's'}
                            </div>
                        </div>
                    </div>

                    <div className={`text-[15px] font-black tracking-[-0.03em] ${band ? band.text : 'text-slate-400'}`}>
                        {hasData ? `${value.toFixed(1)}%` : 'N/A'}
                    </div>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className={`h-full rounded-full ${band ? band.bar : 'bg-slate-200'} transition-all duration-700`}
                        style={{ width: hasData ? `${Math.max(0, Math.min(100, value))}%` : '0%' }}
                    />
                </div>

                <div className="mt-2 flex items-center justify-between">
                    <span className={`text-[8px] font-black uppercase tracking-[0.08em] ${band ? band.text : 'text-slate-400'}`}>
                        {band ? band.label : 'Not Applicable'}
                    </span>
                    {!hasData && (
                        <span className="text-[8px] font-bold text-slate-400">Excluded from score</span>
                    )}
                </div>
            </div>
        </div>
    );
}


function SeverityStat({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'rose' | 'amber' | 'blue';
}) {
    const tones = {
        rose: 'bg-rose-50 text-rose-700 ring-rose-100',
        amber: 'bg-amber-50 text-amber-700 ring-amber-100',
        blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    };

    return (
        <div className={`rounded-2xl p-3 text-center ring-1 ${tones[tone]}`}>
            <div className="text-[20px] font-black tracking-[-0.04em]">{value}</div>
            <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.1em]">{label}</div>
        </div>
    );
}


function ExceptionCard({
    exception,
    onOpenWard,
}: {
    exception: any;
    onOpenWard: (
        ward: WardRankingRow,
        component?: WardRankingComponent | null,
    ) => void;
}) {
    const severity = String(exception.severity || 'LOW').toUpperCase();
    const impact = extractExceptionImpact(exception);
    const area = exceptionAreaName(exception.module);

    const severityClass = severity === 'HIGH'
        ? 'bg-rose-50 text-rose-700 ring-rose-100'
        : severity === 'MEDIUM'
            ? 'bg-amber-50 text-amber-700 ring-amber-100'
            : 'bg-blue-50 text-blue-700 ring-blue-100';

    const iconClass = severity === 'HIGH'
        ? 'bg-rose-50 text-rose-600'
        : severity === 'MEDIUM'
            ? 'bg-amber-50 text-amber-600'
            : 'bg-blue-50 text-blue-600';

    return (
        <button
            type="button"
            onClick={() =>
                onOpenWard(
                    exception.ward,
                    exception.module as WardRankingComponent,
                )
            }
            className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/30"
        >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                <AlertTriangle size={15} />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[10px] font-black text-slate-900">
                        {exception.title || area}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-wide ring-1 ${severityClass}`}>
                        {severity}
                    </span>
                </div>
                <div className="mt-1 text-[8px] font-black uppercase tracking-[0.08em] text-blue-600">
                    {exception.ward?.wardName || 'Ward'} · {area}
                </div>
            </div>

            <div className="shrink-0 text-right">
                <div className="text-[15px] font-black tracking-[-0.03em] text-slate-950">
                    {impact}
                </div>
                <div className="text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">
                    Impact
                </div>
            </div>

            <ChevronRight
                size={15}
                className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
            />
        </button>
    );
}


function MovementPanel({
    title,
    tone,
    icon,
    wards,
    onOpenWard,
}: {
    title: string;
    tone: 'emerald' | 'rose';
    icon: ReactNode;
    wards: WardRankingRow[];
    onOpenWard: (
        ward: WardRankingRow,
        component?: WardRankingComponent | null,
    ) => void;
}) {
    const tones = tone === 'emerald'
        ? {
            wrap: 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40',
            icon: 'bg-emerald-50 text-emerald-600',
            badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        }
        : {
            wrap: 'border-rose-100 bg-gradient-to-br from-white to-rose-50/40',
            icon: 'bg-rose-50 text-rose-600',
            badge: 'bg-rose-50 text-rose-700 ring-rose-100',
        };

    return (
        <div className={`rounded-[24px] border p-5 shadow-sm sm:p-6 ${tones.wrap}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones.icon}`}>
                        {icon}
                    </div>
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Performance Movement
                        </div>
                        <div className="mt-0.5 text-[14px] font-black text-slate-900">
                            {title}
                        </div>
                    </div>
                </div>

                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ring-1 ${tones.badge}`}>
                    {wards.length}
                </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {wards.length ? (
                    wards.map((ward) => (
                        <button
                            key={ward.wardId}
                            type="button"
                            onClick={() => onOpenWard(ward)}
                            className="group flex items-center justify-between gap-3 rounded-xl border border-white bg-white/80 px-3 py-2.5 text-left shadow-sm transition hover:border-blue-100 hover:shadow-md"
                        >
                            <div className="min-w-0">
                                <div className="truncate text-[10px] font-black text-slate-900">
                                    {ward.wardName || 'Ward'}
                                </div>
                                <div className="mt-0.5 text-[8px] font-bold text-slate-400">
                                    {ward.zoneName || 'Zone —'}
                                </div>
                            </div>
                            <TrendBadge trend={(ward as any).trend} />
                        </button>
                    ))
                ) : (
                    <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-center text-[10px] font-bold text-slate-400">
                        No {title.toLowerCase()} wards in the current selection.
                    </div>
                )}
            </div>
        </div>
    );
}
