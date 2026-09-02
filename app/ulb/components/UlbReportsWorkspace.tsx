'use client';

import {
    Fragment,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { useRouter } from 'next/navigation';

import {
    Activity,
    AlertTriangle,
    ArrowRight,
    Award,
    BarChart3,
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    CircleAlert,
    ClipboardCheck,
    Clock3,
    Copy,
    Eye,
    FileCheck2,
    Filter,
    Gauge,
    Image as ImageIcon,
    Layers3,
    MapPin,
    MessageCircle,
    RefreshCw,
    Search,
    ShieldCheck,
    Sparkles,
    Target,
    TimerReset,
    TrendingUp,
    Trophy,
    UserCheck,
    UserRoundX,
    UsersRound,
    X,
    XCircle,
} from 'lucide-react';

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import {
    Protected,
    RoleGuard,
} from '@components/Guards';

import PortalHomeLayout
    from '@components/PortalHomeLayout';

import {
    ModuleRecordsApi,
    ToiletApi,
    apiFetch,
} from '@lib/apiClient';
import { resolveMediaUrl, resolveMediaUrls } from '@lib/mediaUrl';

import {
    AttendanceApi,
    type AttendanceDashboardResponse,
} from '@lib/attendanceApi';

import {
    WardRankingApi,
    type WardRankingSummaryResponse,
} from '@lib/wardRankingApi';


/* =========================================================
   TYPES
========================================================= */

export type UlbView =
    | 'DASHBOARD'
    | 'APPROVED'
    | 'REJECTED'
    | 'ACTION_REQUIRED'
    | 'ACTION_TAKEN';


type ModuleKey =
    | 'TOILET'
    | 'SWEEPING'
    | 'LITTERBINS';


type DashboardRecord = any;


type AnswerRow = {
    question: string;
    answer: string;
    photos: string[];
    section?: string;
};


const PAGE_SIZE = 12;


/* =========================================================
   MODULES
========================================================= */

const MODULES: Array<{
    key: ModuleKey;
    label: string;
    shortLabel: string;
}> = [
        {
            key: 'TOILET',
            label: 'Cleanliness of Toilets',
            shortLabel: 'Toilets',
        },

        {
            key: 'SWEEPING',
            label: 'Sweeping',
            shortLabel: 'Sweeping',
        },

        {
            key: 'LITTERBINS',
            label: 'Litter Bins',
            shortLabel: 'Litter Bins',
        },
    ];


/* =========================================================
   PAGE CONFIG
========================================================= */

const VIEW_CONFIG: Record<
    Exclude<UlbView, 'DASHBOARD'>,
    {
        title: string;
        description: string;
        status: string;
        badgeClass: string;
    }
> = {
    APPROVED: {
        title:
            'QC Approved Reports',

        description:
            'Review QC-approved reports. If action is still required, send the report to the mapped Action Officer with a clear instruction.',

        status:
            'APPROVED',

        badgeClass:
            'border-emerald-200 bg-emerald-50 text-emerald-700',
    },

    REJECTED: {
        title:
            'QC Rejected Reports',

        description:
            'Review QC-rejected reports and escalate only the cases that require municipal action.',

        status:
            'REJECTED',

        badgeClass:
            'border-rose-200 bg-rose-50 text-rose-700',
    },

    ACTION_REQUIRED: {
        title:
            'Action Required',

        description:
            'Track reports already sent to Action Officers. The original ULB instruction remains visible while action is pending.',

        status:
            'ACTION_REQUIRED',

        badgeClass:
            'border-amber-200 bg-amber-50 text-amber-700',
    },

    ACTION_TAKEN: {
        title:
            'Action Taken History',

        description:
            'Review Action Taken reports with the original ULB instruction, Action Officer response and submitted evidence.',

        status:
            'ACTION_TAKEN',

        badgeClass:
            'border-blue-200 bg-blue-50 text-blue-700',
    },
};


/* =========================================================
   BASIC HELPERS
========================================================= */

function effectiveStatus(
    item: any
) {
    if (
        item?.workspaceStatus
    ) {
        return String(
            item.workspaceStatus
        ).toUpperCase();
    }


    const actionStatus =
        String(
            item?.actionStatus || ''
        ).toUpperCase();


    if (
        actionStatus ===
        'ACTION_REQUIRED' ||
        actionStatus ===
        'ACTION_TAKEN'
    ) {
        return actionStatus;
    }


    /*
     * Litter Bin daily report:
     *
     * status remains ACTION_REQUIRED after AO response,
     * while actionOfficerRespondedAt tells us that the
     * corrective action has been completed.
     */
    if (
        item?.actionOfficerRespondedAt &&
        String(
            item?.status || ''
        ).toUpperCase() ===
        'ACTION_REQUIRED'
    ) {
        return 'ACTION_TAKEN';
    }


    return String(
        item?.status || ''
    ).toUpperCase();
}


function recordDate(
    item: any
) {
    /*
     * qcReviewedAt/reviewedAt are fixed milestone dates from the QC
     * decision - they never move even after ULB/AO act later. updatedAt
     * (or a dedicated action timestamp, where the model has one) reflects
     * the most recent write, so it must be checked first or an
     * Action Required/Action Taken record keeps sorting/filtering under
     * its old QC review date instead of when that action actually happened.
     */
    return (
        item?.actionTakenAt ||
        item?.actionOfficerRespondedAt ||
        item?.updatedAt ||
        item?.reviewedAt ||
        item?.qcReviewedAt ||
        item?.createdAt ||
        item?.visitedAt ||
        null
    );
}


function recordTitle(
    item: any,
    moduleKey: ModuleKey
) {
    if (
        moduleKey === 'TOILET'
    ) {
        return (
            item?.toilet?.name ||
            item?.toiletName ||
            item?.name ||
            'Toilet Inspection'
        );
    }


    if (
        moduleKey === 'SWEEPING'
    ) {
        return (
            item?.beatName ||
            item?.beat?.beatName ||
            item?.areaName ||
            'Sweeping Report'
        );
    }


    return (
        item?.locationName ||
        item?.bin?.locationName ||
        item?.areaName ||
        item?.bin?.areaName ||
        'Litter Bin Report'
    );
}


function recordArea(
    item: any
) {
    return (
        item?.areaName ||
        item?.toilet?.address ||
        item?.address ||
        item?.locationName ||
        item?.bin?.areaName ||
        item?.bin?.locationName ||
        'Assigned location'
    );
}


function getRecordZone(
    item: any
): string {
    return String(
        item?.zoneName ||
        item?.bin?.zoneName ||
        item?.toilet?.zoneName ||
        item?.toilet?.ward?.parent?.name ||
        item?.zone?.name ||
        item?.bin?.zone?.name ||
        (typeof item?.zone === 'string' ? item?.zone : '') ||
        ''
    ).trim();
}


function getRecordWard(
    item: any
): string {
    return String(
        item?.wardName ||
        item?.bin?.wardName ||
        item?.toilet?.wardName ||
        item?.toilet?.ward?.name ||
        item?.ward?.name ||
        item?.bin?.ward?.name ||
        (typeof item?.ward === 'string' ? item?.ward : '') ||
        ''
    ).trim();
}


function moduleLabel(
    moduleKey: ModuleKey
) {
    return (
        MODULES.find(
            (module) =>
                module.key ===
                moduleKey
        )?.label ||
        moduleKey
    );
}


function moduleShortLabel(
    moduleKey: ModuleKey
) {
    return (
        MODULES.find(
            (module) =>
                module.key ===
                moduleKey
        )?.shortLabel ||
        moduleKey
    );
}


function statusBadge(
    status: string
) {
    if (
        status === 'APPROVED'
    ) {
        return (
            'border-emerald-200 ' +
            'bg-emerald-50 ' +
            'text-emerald-700'
        );
    }


    if (
        status === 'REJECTED'
    ) {
        return (
            'border-rose-200 ' +
            'bg-rose-50 ' +
            'text-rose-700'
        );
    }


    if (
        status ===
        'ACTION_REQUIRED'
    ) {
        return (
            'border-amber-200 ' +
            'bg-amber-50 ' +
            'text-amber-700'
        );
    }


    if (
        status ===
        'ACTION_TAKEN'
    ) {
        return (
            'border-blue-200 ' +
            'bg-blue-50 ' +
            'text-blue-700'
        );
    }


    return (
        'border-slate-200 ' +
        'bg-slate-50 ' +
        'text-slate-600'
    );
}


function formatDate(
    value: any
) {
    if (!value) {
        return '—';
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return '—';
    }


    return (
        date.toLocaleString()
    );
}


function submittedByName(
    item: any
) {
    return (
        item?.submittedBy?.name ||
        item?.submittedByName ||
        item?.createdBy?.name ||
        item?.createdBy ||
        item?.supervisor?.name ||
        item?.employee?.name ||
        '—'
    );
}


/* =========================================================
   WORKFLOW REMARKS

   IMPORTANT:
   These fields are different per module.
========================================================= */

function getQcRemark(
    item: any
) {
    /*
     * Do NOT use litter-bin visit qcRemark here.
     *
     * That field is used by the current Visit workflow
     * as the ULB Action Required instruction.
     */

    return (
        item?.qcComment ||
        item?.payload?.qcRemarks ||
        item?.qcRemarks ||
        null
    );
}


function getActionRequiredRemark(
    item: any,
    moduleKey: ModuleKey
) {
    /*
     * SWEEPING
     * Action Required = payload.ulbRemark
     */
    if (
        moduleKey ===
        'SWEEPING'
    ) {
        return (
            item?.payload
                ?.ulbRemark ||
            null
        );
    }


    /*
     * LITTER BIN VISIT
     * Action Required = qcRemark
     */
    if (
        moduleKey ===
        'LITTERBINS' &&
        item?.type ===
        'VISIT_REPORT'
    ) {
        return (
            item?.qcRemark ||
            null
        );
    }


    /*
     * TOILET
     * Action Required = ulbRemark
     *
     * LITTER BIN DAILY
     * Action Required = ulbRemark
     */
    return (
        item?.ulbRemark ||
        null
    );
}


function getActionTakenRemark(
    item: any,
    moduleKey: ModuleKey
) {
    /*
     * SWEEPING
     * Action Taken = payload.aoRemark
     */
    if (
        moduleKey ===
        'SWEEPING'
    ) {
        return (
            item?.payload
                ?.aoRemark ||
            null
        );
    }


    /*
     * LITTER BIN VISIT
     * Action Taken = actionRemark
     */
    if (
        moduleKey ===
        'LITTERBINS' &&
        item?.type ===
        'VISIT_REPORT'
    ) {
        return (
            item?.actionRemark ||
            null
        );
    }


    /*
     * LITTER BIN DAILY
     * Action Taken = actionOfficerRemark
     */
    if (
        moduleKey ===
        'LITTERBINS'
    ) {
        return (
            item?.actionOfficerRemark ||
            null
        );
    }


    /*
     * TOILET
     * Action Taken = actionNote
     */
    return (
        item?.actionNote ||
        null
    );
}


/* =========================================================
   IMAGE HELPERS
========================================================= */

function isRenderableImage(
    value: any
) {
    return Boolean(resolveMediaUrl(value));
}


function normalizeImages(
    values: any[]
) {
    return resolveMediaUrls(values);
}


/* =========================================================
   ANSWER HELPERS
========================================================= */

function displayAnswer(
    value: any
) {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return '—';
    }


    if (
        typeof value ===
        'boolean'
    ) {
        return (
            value
                ? 'Yes'
                : 'No'
        );
    }


    if (
        typeof value ===
        'string' ||
        typeof value ===
        'number'
    ) {
        return String(value);
    }


    try {
        const text =
            JSON.stringify(value);


        return (
            text.length > 500
                ? `${text.slice(
                    0,
                    497
                )}...`
                : text
        );
    } catch {
        return String(value);
    }
}


/*
 * Handles:
 *
 * Toilet:
 *   answers
 *
 * Litter Bin Visit:
 *   inspectionAnswers
 *
 * Litter Bin Daily:
 *   questionnaire
 *
 * Sweeping:
 *   payload.surveyAnswers
 *   payload.answers
 *   payload.responses
 *
 * Older Sweeping:
 *   payload.Q1, payload.Q2, ...
 */
function extractAnswers(
    item: any
): AnswerRow[] {
    let source =
        item?.answers ||
        item?.inspectionAnswers ||
        item?.questionnaire ||
        item?.payload
            ?.surveyAnswers ||
        item?.payload
            ?.answers ||
        item?.payload
            ?.responses ||
        null;


    /*
     * Older Sweeping format.
     */
    if (
        !source &&
        item?.payload &&
        typeof item.payload ===
        'object' &&
        !Array.isArray(
            item.payload
        )
    ) {
        const surveyEntries =
            Object.entries(
                item.payload
            ).filter(
                ([key]) =>
                    /^Q\d+$/i.test(
                        key
                    )
            );


        if (
            surveyEntries.length
        ) {
            source =
                Object.fromEntries(
                    surveyEntries
                );
        }
    }


    if (!source) {
        return [];
    }


    const toRow = (
        fallbackQuestion:
            string,
        raw: any
    ): AnswerRow => {

        if (
            raw &&
            typeof raw ===
            'object' &&
            !Array.isArray(raw)
        ) {
            const answer =
                raw.answer ??
                raw.value ??
                raw.response ??
                raw.selectedOption ??
                raw.selected ??
                raw.text ??
                raw.remarks;


            const question =
                raw.question ||
                raw.questionText ||
                raw.label ||
                raw.code ||
                fallbackQuestion;


            const photos =
                normalizeImages([
                    raw.photos,
                    raw.photoUrls,
                    raw.images,
                    raw.imageUrls,

                    raw.photo,
                    raw.photoUrl,

                    raw.image,
                    raw.imageUrl,
                ]);


            return {
                question:
                    String(
                        question
                    ),

                answer:
                    displayAnswer(
                        answer ?? raw
                    ),

                photos,

                section:
                    raw.section ||
                    raw.category ||
                    raw.group ||
                    undefined,
            };
        }


        return {
            question:
                fallbackQuestion,

            answer:
                displayAnswer(raw),

            photos: [],
        };
    };


    /*
     * Current normalized survey snapshot.
     */
    if (
        Array.isArray(source)
    ) {
        return source.map(
            (
                raw: any,
                index: number
            ) => {

                const fallback =
                    raw?.question ||
                    raw?.questionText ||
                    raw?.label ||
                    raw?.code ||
                    `Question ${index + 1
                    }`;


                return toRow(
                    String(fallback),
                    raw
                );
            }
        );
    }


    /*
     * Legacy object format.
     */
    if (
        typeof source ===
        'object'
    ) {
        return Object.entries(
            source
        ).map(
            ([key, value]) =>
                toRow(
                    key,
                    value
                )
        );
    }


    return [
        {
            question:
                'Response',

            answer:
                displayAnswer(
                    source
                ),

            photos: [],
        },
    ];
}


function collectTopLevelImages(
    item: any
) {
    return normalizeImages([
        item?.photos,
        item?.photoUrls,

        item?.images,
        item?.imageUrls,

        item?.photo,
        item?.photoUrl,

        item?.image,
        item?.imageUrl,

        item?.actionPhoto,
        item?.actionPhotoUrl,
        item?.actionPhotos,
        item?.actionPhotoUrls,

        item?.payload?.photos,
        item?.payload?.photoUrls,
        item?.payload?.aoPhoto,
        item?.payload?.aoPhotos,
    ]);
}


/* =========================================================
   SEARCH + DATE
========================================================= */

function reportSearchText(
    item: any,
    moduleKey: ModuleKey
) {
    return [
        recordTitle(
            item,
            moduleKey
        ),

        recordArea(item),

        getRecordZone(item),
        getRecordWard(item),

        submittedByName(
            item
        ),

        getQcRemark(
            item
        ),

        getActionRequiredRemark(
            item,
            moduleKey
        ),

        getActionTakenRemark(
            item,
            moduleKey
        ),

        effectiveStatus(
            item
        ),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}


function isWithinRange(
    item: any,
    fromDate: string,
    toDate: string
) {
    if (
        !fromDate &&
        !toDate
    ) {
        return true;
    }


    const value =
        recordDate(item);


    if (!value) {
        return false;
    }


    const time =
        new Date(
            value
        ).getTime();


    if (
        Number.isNaN(time)
    ) {
        return false;
    }


    if (fromDate) {
        const start =
            new Date(
                `${fromDate}T00:00:00`
            ).getTime();


        if (
            time < start
        ) {
            return false;
        }
    }


    if (toDate) {
        const end =
            new Date(
                `${toDate}T23:59:59.999`
            ).getTime();


        if (
            time > end
        ) {
            return false;
        }
    }


    return true;
}


/* =========================================================
   PERFORMANCE ANALYTICS HELPERS

   These build ranked "leaderboard" rows (zone, ward, module,
   employee, supervisor, QC reviewer, action officer) purely
   from the fields the records API actually returns. Where an
   identity isn't returned by the backend for a module (e.g.
   Action Officer names on Sweeping/Litter Bin), the identity
   function returns null and that record is simply excluded
   from that specific leaderboard rather than being faked.
========================================================= */

type LeaderboardRow = {
    key: string;
    label: string;
    total: number;
    approved: number;
    rejected: number;
    actionRequired: number;
    actionTaken: number;
};

function emptyLeaderboardRow(
    key: string
): LeaderboardRow {
    return {
        key,
        label: key,
        total: 0,
        approved: 0,
        rejected: 0,
        actionRequired: 0,
        actionTaken: 0,
    };
}

function bumpLeaderboardRow(
    row: LeaderboardRow,
    item: any
) {
    row.total += 1;

    const status = effectiveStatus(item);

    if (status === 'APPROVED') row.approved += 1;
    else if (status === 'REJECTED') row.rejected += 1;
    else if (status === 'ACTION_REQUIRED') row.actionRequired += 1;
    else if (status === 'ACTION_TAKEN') row.actionTaken += 1;
}

function approvalRateOf(
    row: LeaderboardRow
): number | null {
    const decided = row.approved + row.rejected;
    return decided > 0
        ? Math.round((row.approved / decided) * 100)
        : null;
}

function closureRateOf(
    row: LeaderboardRow
): number | null {
    const corrective = row.actionRequired + row.actionTaken;
    return corrective > 0
        ? Math.round((row.actionTaken / corrective) * 100)
        : null;
}

/*
 * Any report that isn't yet in one of the four tracked buckets
 * (approved / rejected / action required / action taken) is still
 * awaiting its first QC review. Deriving it as a remainder keeps
 * row.total === approved + rejected + actionRequired + actionTaken
 * + pending always true, without a second pass over the records.
 */
function pendingOf(
    row: LeaderboardRow
): number {
    return Math.max(
        0,
        row.total -
        row.approved -
        row.rejected -
        row.actionRequired -
        row.actionTaken
    );
}

function buildLeaderboard(
    records: any[],
    identityFn: (item: any) => string | null,
    limit = 8
): LeaderboardRow[] {
    const map = new Map<string, LeaderboardRow>();

    records.forEach((item) => {
        const identity = identityFn(item);
        if (!identity) return;

        const row = map.get(identity) || emptyLeaderboardRow(identity);
        bumpLeaderboardRow(row, item);
        map.set(identity, row);
    });

    return Array.from(map.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
}

function zoneIdentity(item: any) {
    return item?.zoneName || item?.bin?.zoneName || null;
}

function wardIdentity(item: any) {
    return item?.wardName || item?.bin?.wardName || null;
}

function supervisorIdentity(item: any) {
    return item?.supervisor?.name || null;
}

function qcReviewerIdentity(item: any) {
    /*
     * Currently only the Toilet inspection API joins the
     * QC reviewer's name (reviewedBy). Sweeping and Litter
     * Bin records do not expose a reviewer identity yet.
     */
    return item?.reviewedBy?.name || null;
}

function actionOfficerIdentity(
    item: any,
    moduleKey: ModuleKey
) {
    if (moduleKey === 'TOILET') {
        return item?.actionTakenBy?.name || null;
    }

    if (moduleKey === 'LITTERBINS') {
        if (item?.actionOfficer?.name) {
            return item.actionOfficer.name;
        }

        /*
         * Fallback for records assigned before the API started
         * joining the officer's name - still show a short id
         * badge instead of hiding the assignment entirely.
         */
        if (
            item?.actionOfficerId &&
            (
                item?.actionOfficerRespondedAt ||
                effectiveStatus(item) === 'ACTION_TAKEN'
            )
        ) {
            return `Officer #${String(item.actionOfficerId).slice(-6).toUpperCase()}`;
        }

        return null;
    }

    /*
     * Sweeping's own record has no actionOfficerId column - the
     * assignment lives in the ActionOfficerTask ledger, which the
     * records API now joins and returns as `actionOfficer`.
     */
    return item?.actionOfficer?.name || null;
}

function formatMinutes(
    mins: number | null | undefined
) {
    if (
        mins === null ||
        mins === undefined ||
        Number.isNaN(mins)
    ) {
        return '—';
    }

    const hours = Math.floor(mins / 60);
    const minutes = Math.round(mins % 60);

    return `${hours}h ${minutes}m`;
}

function formatDateOnly(
    value: any
) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value).slice(0, 10);
    }

    return date.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
    });
}

function scoreBandFor(
    value: number
) {
    if (value >= 85) {
        return {
            label: 'Strong Performance',
            text: 'text-emerald-700',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            ring: 'ring-emerald-100',
            dot: 'bg-emerald-500',
            dotLight: 'bg-emerald-300',
            bar: 'bg-emerald-500',
        };
    }

    if (value >= 70) {
        return {
            label: 'Needs Attention',
            text: 'text-amber-700',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            ring: 'ring-amber-100',
            dot: 'bg-amber-500',
            dotLight: 'bg-amber-300',
            bar: 'bg-amber-500',
        };
    }

    return {
        label: 'Critical',
        text: 'text-rose-700',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        ring: 'ring-rose-100',
        dot: 'bg-rose-500',
        dotLight: 'bg-rose-300',
        bar: 'bg-rose-500',
    };
}


function toLocalISODate(
    date: Date
) {
    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, '0');

    const day =
        String(date.getDate())
            .padStart(2, '0');

    return `${year}-${month}-${day}`;
}


/*
 * Default landing filter for the dashboard overview - "This
 * Month", same rolling 30-day window as the "This Month" preset
 * button in the date filter, so the page loads already showing
 * that preset applied and highlighted.
 */
function defaultDashboardDateRange() {
    const today = new Date();

    const start = new Date(today);
    start.setDate(start.getDate() - 30);

    return {
        from: toLocalISODate(start),
        to: toLocalISODate(today),
    };
}


function dashboardPeriodLabel(
    from: string,
    to: string
) {
    if (!from && !to) {
        return 'All time';
    }

    const format = (value: string) =>
        value
            ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            })
            : '—';

    if (from === to) {
        return format(from);
    }

    if (!from) {
        return `Up to ${format(to)}`;
    }

    if (!to) {
        return `From ${format(from)}`;
    }

    return `${format(from)} – ${format(to)}`;
}


const dashboardNumberFormatter =
    new Intl.NumberFormat('en-IN');


/*
 * Same averaging convention as the Attendance Analytics screen:
 * when the selected date range spans more than one day, KPI
 * cards show a per-day average instead of the raw range total.
 */
function formatAverageValue(
    value: number
) {
    if (!Number.isFinite(value) || value <= 0) {
        return '0';
    }

    if (value >= 100 || Number.isInteger(value)) {
        return dashboardNumberFormatter.format(
            Math.round(value)
        );
    }

    return value.toFixed(1);
}


function averageFormula(
    total: number,
    days: number
) {
    return `${dashboardNumberFormatter.format(total)} ÷ ${days} ${days === 1 ? 'day' : 'days'
        }`;
}


function buildReportsTrend(
    records: any[],
    days = 14
) {
    const buckets = new Map<
        string,
        {
            date: string;
            total: number;
            approved: number;
            rejected: number;
            actionRequired: number;
            actionTaken: number;
            TOILET: number;
            SWEEPING: number;
            LITTERBINS: number;
        }
    >();

    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);

        const key = day.toISOString().slice(0, 10);

        buckets.set(key, {
            date: key,
            total: 0,
            approved: 0,
            rejected: 0,
            actionRequired: 0,
            actionTaken: 0,
            TOILET: 0,
            SWEEPING: 0,
            LITTERBINS: 0,
        });
    }

    records.forEach((item) => {
        const raw = recordDate(item);
        if (!raw) return;

        const key = new Date(raw).toISOString().slice(0, 10);
        const bucket = buckets.get(key);
        if (!bucket) return;

        bucket.total += 1;

        const moduleKey = item.dashboardModule as ModuleKey;
        if (moduleKey === 'TOILET') bucket.TOILET += 1;
        else if (moduleKey === 'SWEEPING') bucket.SWEEPING += 1;
        else if (moduleKey === 'LITTERBINS') bucket.LITTERBINS += 1;

        const status = effectiveStatus(item);

        if (status === 'APPROVED') bucket.approved += 1;
        else if (status === 'REJECTED') bucket.rejected += 1;
        else if (status === 'ACTION_REQUIRED') bucket.actionRequired += 1;
        else if (status === 'ACTION_TAKEN') bucket.actionTaken += 1;
    });

    return Array.from(buckets.values()).map((bucket) => ({
        ...bucket,
        label: formatDateOnly(bucket.date),
    }));
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function UlbOperationsWorkspace({
    view,
}: {
    view: UlbView;
}) {

    const router =
        useRouter();


    /* ===========================
       DATA
    =========================== */

    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        records,
        setRecords,
    ] = useState<
        DashboardRecord[]
    >([]);


    const [
        error,
        setError,
    ] = useState('');


    /* ===========================
       FILTERS
    =========================== */

    const [
        moduleFilter,
        setModuleFilter,
    ] = useState<
        'ALL' | ModuleKey
    >('ALL');


    const [
        selectedZone,
        setSelectedZone,
    ] = useState<string>('ALL');


    const [
        selectedWard,
        setSelectedWard,
    ] = useState<string>('ALL');


    const [
        search,
        setSearch,
    ] = useState('');


    /* ===========================
       DASHBOARD DATE FILTER

       Defaults to "This Month" (rolling 30 days) rather than
       All Time, so the dashboard lands already scoped to
       recent activity.
    =========================== */

    const [
        dashFromDate,
        setDashFromDate,
    ] = useState(
        () => defaultDashboardDateRange().from
    );


    const [
        dashToDate,
        setDashToDate,
    ] = useState(
        () => defaultDashboardDateRange().to
    );


    const [
        appliedDashFromDate,
        setAppliedDashFromDate,
    ] = useState(
        () => defaultDashboardDateRange().from
    );


    const [
        appliedDashToDate,
        setAppliedDashToDate,
    ] = useState(
        () => defaultDashboardDateRange().to
    );


    const [
        page,
        setPage,
    ] = useState(1);


    /* ===========================
       DETAIL MODAL
    =========================== */

    const [
        detailItem,
        setDetailItem,
    ] = useState<
        DashboardRecord | null
    >(null);


    const [
        detailLoading,
        setDetailLoading,
    ] = useState(false);


    /* ===========================
       ACTION REQUIRED MODAL
    =========================== */

    const [
        actionTarget,
        setActionTarget,
    ] = useState<
        DashboardRecord | null
    >(null);


    const [
        actionRemark,
        setActionRemark,
    ] = useState('');


    const [
        actionSubmitting,
        setActionSubmitting,
    ] = useState(false);


    /* ===========================
       IMAGE PREVIEW
    =========================== */

    const [
        imagePreview,
        setImagePreview,
    ] = useState<
        string | null
    >(null);


    /* ===========================
       ATTENDANCE ANALYTICS
    =========================== */

    const [
        attendance,
        setAttendance,
    ] = useState<
        AttendanceDashboardResponse | null
    >(null);


    const [
        attendanceLoading,
        setAttendanceLoading,
    ] = useState(true);


    const [
        attendanceError,
        setAttendanceError,
    ] = useState('');


    /* ===========================
       WARD RANKING SUMMARY
    =========================== */

    const [
        wardSummary,
        setWardSummary,
    ] = useState<
        WardRankingSummaryResponse | null
    >(null);


    const [
        wardSummaryLoading,
        setWardSummaryLoading,
    ] = useState(true);


    const [
        wardSummaryError,
        setWardSummaryError,
    ] = useState('');


    /* =========================================================
       LOAD ALL THREE MODULES
    ========================================================= */

    async function loadRecords() {
        setLoading(true);
        setError('');


        try {
            const responses =
                await Promise.all(
                    MODULES.map(
                        async (
                            module
                        ) => {

                            const response =
                                await ModuleRecordsApi
                                    .getRecords(
                                        module.key,
                                        {
                                            page: 1,

                                            /*
                                             * Keep large enough for
                                             * Commissioner operational view.
                                             */
                                            limit: 500,

                                            tab:
                                                'HISTORY',
                                        }
                                    );


                            return (
                                response.data ||
                                []
                            ).map(
                                (
                                    record: any
                                ) => ({
                                    ...record,

                                    dashboardModule:
                                        module.key,

                                    dashboardModuleLabel:
                                        module.label,
                                })
                            );
                        }
                    )
                );


            setRecords(
                responses.flat()
            );

        } catch (
        err: any
        ) {

            console.error(
                'ULB workspace load failed',
                err
            );


            setError(
                err?.message ||
                'Unable to load ULB reports.'
            );

        } finally {
            setLoading(false);
        }
    }


    useEffect(() => {
        loadRecords();
    }, []);


    /* =========================================================
       LOAD ATTENDANCE ANALYTICS

       Only relevant on the dashboard overview, so it is not
       fetched for the status list pages.
    ========================================================= */

    async function loadAttendance(
        from?: string,
        to?: string
    ) {
        setAttendanceLoading(true);
        setAttendanceError('');

        try {
            const result =
                await AttendanceApi.dashboard({
                    pageSize: 1,
                    from: from || undefined,
                    to: to || undefined,

                    /*
                     * This workspace's Attendance Performance
                     * container is scoped to Health Workers only,
                     * matching the "Health Workers" tab on the
                     * full Attendance Analytics screen.
                     */
                    employeeGroup: 'HEALTH_WORKERS',
                });

            setAttendance(result);

        } catch (
        err: any
        ) {

            console.error(
                'ULB attendance load failed',
                err
            );

            setAttendanceError(
                err?.message ||
                'Unable to load attendance analytics.'
            );

        } finally {
            setAttendanceLoading(false);
        }
    }


    /* =========================================================
       LOAD WARD RANKING SUMMARY

       Same idea as attendance - only needed for the dashboard
       overview, and refreshed whenever the dashboard date
       filter is applied.
    ========================================================= */

    async function loadWardSummary(
        from?: string,
        to?: string
    ) {
        setWardSummaryLoading(true);
        setWardSummaryError('');

        try {
            const result =
                await WardRankingApi.summary({
                    from: from || undefined,
                    to: to || undefined,
                });

            setWardSummary(result);

        } catch (
        err: any
        ) {

            console.error(
                'ULB ward ranking summary load failed',
                err
            );

            setWardSummaryError(
                err?.message ||
                'Unable to load ward ranking summary.'
            );

        } finally {
            setWardSummaryLoading(false);
        }
    }


    useEffect(() => {
        if (view === 'DASHBOARD') {
            loadAttendance(
                appliedDashFromDate,
                appliedDashToDate
            );

            loadWardSummary(
                appliedDashFromDate,
                appliedDashToDate
            );
        }
    }, [
        view,
        appliedDashFromDate,
        appliedDashToDate,
    ]);


    /*
     * Reset pagination when
     * any filter changes.
     */
    useEffect(() => {
        setPage(1);
    }, [
        view,
        moduleFilter,
        selectedZone,
        selectedWard,
        search,
        appliedDashFromDate,
        appliedDashToDate,
    ]);


    /* =========================================================
       MODULE & GEO FILTERS
    ========================================================= */

    const moduleRecords =
        useMemo(
            () =>
                moduleFilter ===
                    'ALL'
                    ? records
                    : records.filter(
                        (
                            record
                        ) =>
                            record
                                .dashboardModule ===
                            moduleFilter
                    ),

            [
                records,
                moduleFilter,
            ]
        );


    const availableZones =
        useMemo(() => {
            const set = new Set<string>();
            records.forEach((record) => {
                const z = getRecordZone(record);
                if (z) set.add(z);
            });
            return Array.from(set).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
            );
        }, [records]);


    const availableWards =
        useMemo(() => {
            const set = new Set<string>();
            records.forEach((record) => {
                const z = getRecordZone(record);
                if (selectedZone !== 'ALL' && z !== selectedZone) {
                    return;
                }
                const w = getRecordWard(record);
                if (w) set.add(w);
            });
            return Array.from(set).sort((a, b) =>
                a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
            );
        }, [records, selectedZone]);


    /* =========================================================
       DASHBOARD FILTERED RECORDS

       Zone, Ward and Search are applied here (in addition to the
       Module filter already baked into moduleRecords) so that
       every dashboard section - stat cards, charts, trend and
       leaderboards - reflects the full filter bar, not just the
       Module dropdown.
    ========================================================= */

    const geoFilteredRecords =
        useMemo(() => {

            const query =
                search
                    .trim()
                    .toLowerCase();

            return moduleRecords
                .filter((item) =>
                    selectedZone === 'ALL'
                        ? true
                        : getRecordZone(item) === selectedZone
                )
                .filter((item) =>
                    selectedWard === 'ALL'
                        ? true
                        : getRecordWard(item) === selectedWard
                )
                .filter((item) =>
                    query
                        ? reportSearchText(
                            item,
                            item.dashboardModule
                        ).includes(query)
                        : true
                );
        }, [
            moduleRecords,
            selectedZone,
            selectedWard,
            search,
        ]);


    const dashboardRecords =
        useMemo(() => {
            if (
                !appliedDashFromDate &&
                !appliedDashToDate
            ) {
                return geoFilteredRecords;
            }


            return geoFilteredRecords.filter(
                (item) =>
                    isWithinRange(
                        item,
                        appliedDashFromDate,
                        appliedDashToDate
                    )
            );
        }, [
            geoFilteredRecords,
            appliedDashFromDate,
            appliedDashToDate,
        ]);


    /* =========================================================
       LATEST REPORT (ALERT FOR ULB OFFICER)
    ========================================================= */

    const latestReport =
        useMemo(() => {
            if (
                !records ||
                records.length === 0
            ) {
                return null;
            }


            const sorted = [
                ...records,
            ].sort(
                (a, b) =>
                    new Date(
                        recordDate(b) || 0
                    ).getTime() -
                    new Date(
                        recordDate(a) || 0
                    ).getTime()
            );


            return sorted[0] || null;
        }, [records]);


    /* =========================================================
       GLOBAL STATS
    ========================================================= */

    const stats =
        useMemo(() => {

            const approved =
                dashboardRecords.filter(
                    (
                        item
                    ) =>
                        effectiveStatus(
                            item
                        ) ===
                        'APPROVED'
                ).length;


            const rejected =
                dashboardRecords.filter(
                    (
                        item
                    ) =>
                        effectiveStatus(
                            item
                        ) ===
                        'REJECTED'
                ).length;


            const actionRequired =
                dashboardRecords.filter(
                    (
                        item
                    ) =>
                        effectiveStatus(
                            item
                        ) ===
                        'ACTION_REQUIRED'
                ).length;


            const actionTaken =
                dashboardRecords.filter(
                    (
                        item
                    ) =>
                        effectiveStatus(
                            item
                        ) ===
                        'ACTION_TAKEN'
                ).length;


            /*
             * Any record whose effective status is none of the
             * four known workflow states hasn't been reviewed by
             * QC yet (raw backend status such as SUBMITTED /
             * PENDING_QC) - this is the "QC Pending" count, same
             * concept as the Inspection & Performance screen.
             */
            const pending =
                dashboardRecords.length -
                (
                    approved +
                    rejected +
                    actionRequired +
                    actionTaken
                );


            return {
                approved,
                rejected,
                actionRequired,
                actionTaken,
                pending,

                total:
                    approved +
                    rejected +
                    actionRequired +
                    actionTaken,

                grandTotal:
                    dashboardRecords.length,
            };

        }, [
            dashboardRecords,
        ]);


    /* =========================================================
       PAGE STATUS
    ========================================================= */

    const targetStatus =
        view ===
            'DASHBOARD'
            ? null
            : VIEW_CONFIG[
                view
            ].status;


    /* =========================================================
       STATUS PAGE FILTERS
    ========================================================= */

    const filteredRecords =
        useMemo(() => {

            const query =
                search
                    .trim()
                    .toLowerCase();


            return moduleRecords

                .filter(
                    (
                        item
                    ) =>
                        targetStatus
                            ? effectiveStatus(
                                item
                            ) ===
                            targetStatus
                            : true
                )

                .filter(
                    (
                        item
                    ) =>
                        selectedZone === 'ALL'
                            ? true
                            : getRecordZone(item) === selectedZone
                )

                .filter(
                    (
                        item
                    ) =>
                        selectedWard === 'ALL'
                            ? true
                            : getRecordWard(item) === selectedWard
                )

                .filter(
                    (
                        item
                    ) =>
                        query
                            ? reportSearchText(
                                item,
                                item
                                    .dashboardModule
                            ).includes(
                                query
                            )
                            : true
                )

                .filter(
                    (
                        item
                    ) =>
                        isWithinRange(
                            item,
                            appliedDashFromDate,
                            appliedDashToDate
                        )
                )

                .sort(
                    (
                        a,
                        b
                    ) =>
                        new Date(
                            recordDate(
                                b
                            ) || 0
                        ).getTime() -

                        new Date(
                            recordDate(
                                a
                            ) || 0
                        ).getTime()
                );

        }, [
            moduleRecords,
            targetStatus,
            selectedZone,
            selectedWard,
            search,
            appliedDashFromDate,
            appliedDashToDate,
        ]);


    /* =========================================================
       PAGINATION
    ========================================================= */

    const totalPages =
        Math.max(
            1,

            Math.ceil(
                filteredRecords.length /
                PAGE_SIZE
            )
        );


    const pagedRecords =
        useMemo(
            () =>
                filteredRecords.slice(
                    (
                        page - 1
                    ) *
                    PAGE_SIZE,

                    page *
                    PAGE_SIZE
                ),

            [
                filteredRecords,
                page,
            ]
        );


    /* =========================================================
       DASHBOARD CHART DATA
    ========================================================= */

    const moduleChartData =
        useMemo(
            () =>
                MODULES.map(
                    (
                        module
                    ) => {

                        const rows =
                            dashboardRecords.filter(
                                (
                                    record
                                ) =>
                                    record
                                        .dashboardModule ===
                                    module.key
                            );


                        return {
                            name:
                                module
                                    .shortLabel,


                            Approved:
                                rows.filter(
                                    (
                                        record
                                    ) =>
                                        effectiveStatus(
                                            record
                                        ) ===
                                        'APPROVED'
                                ).length,


                            Rejected:
                                rows.filter(
                                    (
                                        record
                                    ) =>
                                        effectiveStatus(
                                            record
                                        ) ===
                                        'REJECTED'
                                ).length,


                            'Action Required':
                                rows.filter(
                                    (
                                        record
                                    ) =>
                                        effectiveStatus(
                                            record
                                        ) ===
                                        'ACTION_REQUIRED'
                                ).length,


                            'Action Taken':
                                rows.filter(
                                    (
                                        record
                                    ) =>
                                        effectiveStatus(
                                            record
                                        ) ===
                                        'ACTION_TAKEN'
                                ).length,
                        };
                    }
                ),

            [
                dashboardRecords,
            ]
        );


    const statusData = [
        {
            name:
                'Approved',

            value:
                stats.approved,

            color:
                '#0f766e',
        },

        {
            name:
                'Rejected',

            value:
                stats.rejected,

            color:
                '#dc2626',
        },

        {
            name:
                'Action Required',

            value:
                stats.actionRequired,

            color:
                '#b7791f',
        },

        {
            name:
                'Action Taken',

            value:
                stats.actionTaken,

            color:
                '#2563eb',
        },
    ];


    /* =========================================================
       CORRECTIVE METRICS
    ========================================================= */

    const correctiveTotal =
        stats.actionRequired +
        stats.actionTaken;


    const closureRate =
        correctiveTotal > 0
            ? Math.round(
                (
                    stats.actionTaken /
                    correctiveTotal
                ) *
                100
            )
            : 0;


    /* =========================================================
       OLDEST ACTION REQUIRED
    ========================================================= */

    const actionRequiredRecords =
        useMemo(
            () =>
                dashboardRecords

                    .filter(
                        (
                            item
                        ) =>
                            effectiveStatus(
                                item
                            ) ===
                            'ACTION_REQUIRED'
                    )

                    .sort(
                        (
                            a,
                            b
                        ) =>
                            new Date(
                                recordDate(
                                    a
                                ) || 0
                            ).getTime() -

                            new Date(
                                recordDate(
                                    b
                                ) || 0
                            ).getTime()
                    )

                    .slice(
                        0,
                        6
                    ),

            [
                dashboardRecords,
            ]
        );


    /* =========================================================
       RECENT ACTIVITY
    ========================================================= */

    const recentRecords =
        useMemo(
            () =>
                [
                    ...dashboardRecords,
                ]

                    .sort(
                        (
                            a,
                            b
                        ) =>
                            new Date(
                                recordDate(
                                    b
                                ) || 0
                            ).getTime() -

                            new Date(
                                recordDate(
                                    a
                                ) || 0
                            ).getTime()
                    )

                    .slice(
                        0,
                        8
                    ),

            [
                dashboardRecords,
            ]
        );


    /* =========================================================
       HIGHEST CORRECTIVE LOAD
    ========================================================= */

    const highestCorrectiveModule =
        useMemo(() => {

            const ranked =
                MODULES.map(
                    (
                        module
                    ) => ({
                        label:
                            module
                                .shortLabel,

                        count:
                            dashboardRecords.filter(
                                (
                                    record
                                ) =>
                                    record
                                        .dashboardModule ===
                                    module.key &&

                                    effectiveStatus(
                                        record
                                    ) ===
                                    'ACTION_REQUIRED'
                            ).length,
                    })
                ).sort(
                    (
                        a,
                        b
                    ) =>
                        b.count -
                        a.count
                );


            return (
                ranked[0] || {
                    label:
                        '—',

                    count:
                        0,
                }
            );

        }, [
            dashboardRecords,
        ]);


    /* =========================================================
       PERFORMANCE LEADERBOARDS
       (zone, ward, module, employee, supervisor, QC, AO)
    ========================================================= */

    const zoneLeaderboard =
        useMemo(
            () => buildLeaderboard(dashboardRecords, zoneIdentity, 8),
            [dashboardRecords]
        );


    const wardLeaderboard =
        useMemo(
            () => buildLeaderboard(dashboardRecords, wardIdentity, 10),
            [dashboardRecords]
        );


    const modulePerformanceRows =
        useMemo(
            () =>
                buildLeaderboard(
                    dashboardRecords,
                    (item) => moduleShortLabel(item.dashboardModule),
                    MODULES.length
                ),
            [dashboardRecords]
        );


    const supervisorLeaderboard =
        useMemo(
            () => buildLeaderboard(dashboardRecords, supervisorIdentity, 8),
            [dashboardRecords]
        );


    const qcLeaderboard =
        useMemo(
            () => buildLeaderboard(dashboardRecords, qcReviewerIdentity, 8),
            [dashboardRecords]
        );


    const actionOfficerLeaderboard =
        useMemo(
            () =>
                buildLeaderboard(
                    dashboardRecords,
                    (item) => actionOfficerIdentity(item, item.dashboardModule),
                    8
                ),
            [dashboardRecords]
        );


    const reportsTrend =
        useMemo(
            () => buildReportsTrend(geoFilteredRecords, 14),
            [geoFilteredRecords]
        );


    /* =========================================================
       DASHBOARD DATE RANGE (for "avg per day" stat cards)
    ========================================================= */

    const rangeDayCount =
        useMemo(() => {
            if (
                !appliedDashFromDate ||
                !appliedDashToDate
            ) {
                return 1;
            }

            const start =
                new Date(
                    `${appliedDashFromDate}T00:00:00`
                ).getTime();

            const end =
                new Date(
                    `${appliedDashToDate}T00:00:00`
                ).getTime();

            const days =
                Math.round(
                    (end - start) / 86400000
                ) + 1;

            return Math.max(1, days);
        }, [
            appliedDashFromDate,
            appliedDashToDate,
        ]);


    const isMultiDayRange =
        rangeDayCount > 1;


    /* =========================================================
       EXECUTIVE SUMMARY DERIVATIVES
       (QC approval rate, zone needing attention, oldest
       pending corrective case, management briefing narrative)
    ========================================================= */

    const approvalRate =
        useMemo(() => {
            const decided =
                stats.approved +
                stats.rejected;

            return decided > 0
                ? Math.round(
                    (stats.approved / decided) * 100
                )
                : null;
        }, [stats]);


    const overallBand =
        scoreBandFor(
            approvalRate ?? 0
        );


    const attentionZone =
        useMemo(() => {
            const rated = zoneLeaderboard
                .map((zone) => ({
                    ...zone,
                    rate: approvalRateOf(zone),
                }))
                .filter((zone) => zone.rate !== null) as Array<
                    LeaderboardRow & { rate: number }
                >;

            if (!rated.length) {
                return zoneLeaderboard[0] || null;
            }

            return [...rated].sort(
                (a, b) => a.rate - b.rate
            )[0];
        }, [zoneLeaderboard]);


    const oldestPendingDays =
        useMemo(() => {
            const oldest = actionRequiredRecords[0];
            if (!oldest) return null;

            const value = recordDate(oldest);
            if (!value) return null;

            const diffMs =
                Date.now() -
                new Date(value).getTime();

            return Math.max(
                0,
                Math.floor(diffMs / (1000 * 60 * 60 * 24))
            );
        }, [actionRequiredRecords]);


    const briefingSummary =
        useMemo(() => {
            if (!dashboardRecords.length) {
                return {
                    tone: 'amber' as const,
                    text:
                        'No reports have been recorded yet for this selection, so a performance summary is not available.',
                };
            }

            const sentences: string[] = [];

            if (approvalRate !== null) {
                sentences.push(
                    `Out of ${stats.approved + stats.rejected} QC-reviewed reports, ${approvalRate}% were QC Approved${approvalRate < 70 ? ', which is below the healthy threshold and needs review' : ''}.`
                );
            }

            if (correctiveTotal > 0) {
                sentences.push(
                    `${stats.actionTaken} of ${correctiveTotal} reports needing action have had Action Taken (${closureRate}% Action)${stats.actionRequired > 0 ? `, with ${stats.actionRequired} still Action Required` : ''}.`
                );
            }

            if (highestCorrectiveModule.count > 0) {
                sentences.push(
                    `${highestCorrectiveModule.label} has the most Action Required reports (${highestCorrectiveModule.count}).`
                );
            }

            if (oldestPendingDays !== null && oldestPendingDays > 0) {
                sentences.push(
                    `The oldest Action Required report has been open for ${oldestPendingDays} day${oldestPendingDays === 1 ? '' : 's'}.`
                );
            }

            if (!sentences.length) {
                sentences.push(
                    'All reviewed reports are QC Approved and no report is currently Action Required.'
                );
            }

            const tone: 'rose' | 'amber' | 'emerald' =
                (approvalRate !== null && approvalRate < 70) ||
                    (oldestPendingDays !== null && oldestPendingDays > 7)
                    ? 'rose'
                    : stats.actionRequired > 0
                        ? 'amber'
                        : 'emerald';

            return {
                tone,
                text: sentences.join(' '),
            };
        }, [
            dashboardRecords,
            approvalRate,
            correctiveTotal,
            stats,
            closureRate,
            highestCorrectiveModule,
            oldestPendingDays,
        ]);


    /* =========================================================
       COMMISSIONER SUMMARY (shareable text)

       Mirrors the Inspection & Performance / Attendance / Ward
       Ranking sections shown on the dashboard, so the shared
       text always matches what's on screen for the same filters.
    ========================================================= */

    function buildCommissionerSummaryText() {
        const lines: string[] = [];

        lines.push('MatrixTrack — Commissioner Summary');

        lines.push(
            `Period: ${dashboardPeriodLabel(
                appliedDashFromDate,
                appliedDashToDate
            )}${isMultiDayRange ? ` (${rangeDayCount} days)` : ''}`
        );

        const activeFilterParts: string[] = [];

        if (moduleFilter !== 'ALL') activeFilterParts.push(`Module: ${moduleLabel(moduleFilter)}`);
        if (selectedZone !== 'ALL') activeFilterParts.push(`Zone: ${selectedZone}`);
        if (selectedWard !== 'ALL') activeFilterParts.push(`Ward: ${selectedWard}`);
        if (search.trim()) activeFilterParts.push(`Search: "${search.trim()}"`);

        lines.push(
            `Filters: ${activeFilterParts.length ? activeFilterParts.join(' · ') : 'None (all reports)'}`
        );

        lines.push('');
        lines.push('INSPECTION & PERFORMANCE');
        lines.push(`Total Inspections: ${dashboardNumberFormatter.format(stats.grandTotal)}${isMultiDayRange ? ` (avg ${formatAverageValue(stats.grandTotal / rangeDayCount)}/day)` : ''}`);
        lines.push(`QC Approved: ${dashboardNumberFormatter.format(stats.approved)}${approvalRate !== null ? ` — ${approvalRate}% Approval %` : ''}`);
        lines.push(`QC Rejected: ${dashboardNumberFormatter.format(stats.rejected)}`);
        lines.push(`QC Pending: ${dashboardNumberFormatter.format(stats.pending)}`);
        lines.push(`Action Required: ${dashboardNumberFormatter.format(stats.actionRequired)}`);
        lines.push(`Action Taken: ${dashboardNumberFormatter.format(stats.actionTaken)}${correctiveTotal > 0 ? ` — ${closureRate}% Action` : ''}`);

        if (highestCorrectiveModule.count > 0) {
            lines.push(`Most Action Required reports: ${highestCorrectiveModule.label} (${highestCorrectiveModule.count})`);
        }

        if (attentionZone) {
            const zoneRate = approvalRateOf(attentionZone);
            lines.push(`Zone needing attention: ${attentionZone.label}${zoneRate !== null ? ` (${zoneRate}% Approval %)` : ''}`);
        }

        if (oldestPendingDays !== null && oldestPendingDays > 0) {
            lines.push(`Oldest Action Required report: ${oldestPendingDays} day${oldestPendingDays === 1 ? '' : 's'} old`);
        }

        lines.push('');
        lines.push('ATTENDANCE — HEALTH WORKERS');

        if (attendance?.hasData && attendance.summary) {
            const s = attendance.summary;

            lines.push(`Total Employees: ${dashboardNumberFormatter.format(s.uniqueEmployees)}`);
            lines.push(`Present: ${isMultiDayRange ? `avg ${formatAverageValue(s.present / rangeDayCount)}/day` : dashboardNumberFormatter.format(s.present)}`);
            lines.push(`Absent: ${isMultiDayRange ? `avg ${formatAverageValue(s.absent / rangeDayCount)}/day` : dashboardNumberFormatter.format(s.absent)}`);
            lines.push(`Attendance Rate: ${Number(s.attendanceRate).toFixed(1)}%`);
            lines.push(`Avg Work Duration: ${formatMinutes(s.avgWorkMinutes)}`);
        } else {
            lines.push('No attendance data available for this period.');
        }

        lines.push('');
        lines.push('WARD RANKING');

        if (wardSummary && wardSummary.totalWards > 0) {
            const ranked = wardSummary.green + wardSummary.amber + wardSummary.red;

            lines.push(`Total Wards: ${dashboardNumberFormatter.format(wardSummary.totalWards)} (${ranked} ranked)`);
            lines.push(`Top Ranked (85+): ${dashboardNumberFormatter.format(wardSummary.green)}`);
            lines.push(`Average (70–84.99): ${dashboardNumberFormatter.format(wardSummary.amber)}`);
            lines.push(`Below Average (<70): ${dashboardNumberFormatter.format(wardSummary.red)}`);
            lines.push(`City Average Score: ${Number(wardSummary.averageScore).toFixed(1)}`);
        } else {
            lines.push('No ward ranking data available for this period.');
        }

        lines.push('');
        lines.push(briefingSummary.text);

        lines.push('');
        lines.push(`Generated ${new Date().toLocaleString()} · MatrixTrack ULB Dashboard`);

        return lines.join('\n');
    }


    /* =========================================================
       VIEW DETAILS
    ========================================================= */

    async function openDetail(
        item:
            DashboardRecord
    ) {
        /*
         * Open immediately with list data.
         */
        setDetailItem(
            item
        );


        setDetailLoading(
            false
        );


        /*
         * Toilet has a dedicated detail API,
         * so hydrate the complete inspection
         * when possible.
         *
         * Sweeping and Litter Bin generic
         * HISTORY already return the stored
         * survey snapshot.
         */
        if (
            item
                .dashboardModule !==
            'TOILET'
        ) {
            return;
        }


        try {
            setDetailLoading(
                true
            );


            const response =
                await ToiletApi
                    .getInspectionDetails(
                        item.id
                    );


            if (
                response?.inspection
            ) {
                setDetailItem({
                    ...item,

                    ...response
                        .inspection,

                    dashboardModule:
                        item
                            .dashboardModule,

                    dashboardModuleLabel:
                        item
                            .dashboardModuleLabel,
                });
            }

        } catch (
        err
        ) {

            /*
             * Do not block the user.
             * Keep showing the existing list record.
             */
            console.warn(
                'Unable to hydrate toilet detail.',
                err
            );

        } finally {
            setDetailLoading(
                false
            );
        }
    }


    /* =========================================================
       OPEN ACTION REQUIRED
    ========================================================= */

    function beginActionRequired(
        item:
            DashboardRecord
    ) {
        setActionTarget(
            item
        );

        setActionRemark(
            ''
        );
    }


    /* =========================================================
       SUBMIT ACTION REQUIRED
    ========================================================= */

    async function submitActionRequired() {
        if (
            !actionTarget
        ) {
            return;
        }


        const remark =
            actionRemark.trim();


        if (!remark) {
            setError(
                'Please enter an Action Required instruction before submitting.'
            );

            return;
        }


        const moduleKey =
            actionTarget
                .dashboardModule as
            ModuleKey;


        setActionSubmitting(
            true
        );

        setError('');


        try {

            /* ========================
               TOILET
            ======================== */

            if (
                moduleKey ===
                'TOILET'
            ) {
                await ToiletApi
                    .reviewInspection(
                        actionTarget.id,

                        {
                            status:
                                'ACTION_REQUIRED',

                            comment:
                                remark,
                        }
                    );
            }


            /* ========================
               SWEEPING
            ======================== */

            else if (
                moduleKey ===
                'SWEEPING'
            ) {
                await ModuleRecordsApi
                    .updateRecordStatus(
                        'SWEEPING',

                        actionTarget.id,

                        'ACTION_REQUIRED',

                        remark
                    );
            }


            /* ========================
               LITTER BIN VISIT
            ======================== */

            else if (
                actionTarget.type ===
                'VISIT_REPORT'
            ) {
                await apiFetch(
                    `/modules/twinbin/visits/${actionTarget.id}/action-required`,

                    {
                        method:
                            'POST',

                        body:
                            JSON.stringify({
                                /*
                                 * Existing Visit workflow
                                 * stores ULB instruction
                                 * in qcRemark.
                                 */
                                qcRemark:
                                    remark,
                            }),
                    }
                );
            }


            /* ========================
               LITTER BIN DAILY
            ======================== */

            else {
                await apiFetch(
                    `/modules/twinbin/reports/${actionTarget.id}/action-required`,

                    {
                        method:
                            'POST',

                        body:
                            JSON.stringify({
                                /*
                                 * Daily Litter Bin report
                                 * uses dedicated ULB remark.
                                 */
                                ulbRemark:
                                    remark,
                            }),
                    }
                );
            }


            setActionTarget(
                null
            );

            setActionRemark(
                ''
            );

            setDetailItem(
                null
            );


            /*
             * Reload real backend state.
             */
            await loadRecords();

        } catch (
        err: any
        ) {

            console.error(
                'Unable to mark Action Required',
                err
            );


            setError(
                err?.message ||
                'Unable to send this report to the Action Officer.'
            );

        } finally {
            setActionSubmitting(
                false
            );
        }
    }


    const selectedModuleName =
        moduleFilter ===
            'ALL'
            ? 'All Modules'
            : moduleLabel(
                moduleFilter
            );


    /* =========================================================
       UI
    ========================================================= */

    return (
        <Protected>

            <RoleGuard
                roles={[
                    'ULB_OFFICER',
                ]}
            >

                <PortalHomeLayout>

                    <div className="space-y-4 pb-8">


                        {/* =================================================
                HEADER
            ================================================= */}

                        {
                            view === 'DASHBOARD' ? null : (
                                <StatusHeader
                                    view={view}
                                    loading={loading}
                                    loadRecords={loadRecords}
                                    router={router}
                                />
                            )
                        }


                        {/* =================================================
                ERROR
            ================================================= */}

                        {
                            error ? (

                                <div className="flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">

                                    <span>
                                        {error}
                                    </span>


                                    <button
                                        type="button"

                                        onClick={() =>
                                            setError(
                                                ''
                                            )
                                        }

                                        className="rounded-lg p-1 transition hover:bg-rose-100"
                                    >
                                        <X
                                            size={16}
                                        />
                                    </button>

                                </div>

                            ) : null
                        }


                        {/* =================================================
                            UNIFIED FILTER BAR (OUTSIDE HEADER)
                        ================================================= */}
                        {
                            !loading ? (
                                <UnifiedFilterBar
                                    moduleFilter={moduleFilter}
                                    setModuleFilter={setModuleFilter}
                                    selectedZone={selectedZone}
                                    setSelectedZone={setSelectedZone}
                                    availableZones={availableZones}
                                    selectedWard={selectedWard}
                                    setSelectedWard={setSelectedWard}
                                    availableWards={availableWards}
                                    search={search}
                                    setSearch={setSearch}
                                    fromDate={dashFromDate}
                                    setFromDate={setDashFromDate}
                                    toDate={dashToDate}
                                    setToDate={setDashToDate}
                                    appliedFromDate={appliedDashFromDate}
                                    appliedToDate={appliedDashToDate}
                                    onApplyDateFilter={(f?: string, t?: string) => {
                                        const fromVal = f !== undefined ? f : dashFromDate;
                                        const toVal = t !== undefined ? t : dashToDate;
                                        setAppliedDashFromDate(fromVal);
                                        setAppliedDashToDate(toVal);
                                    }}
                                    onClearFilters={() => {
                                        setModuleFilter('ALL');
                                        setSelectedZone('ALL');
                                        setSelectedWard('ALL');
                                        setSearch('');
                                        setDashFromDate('');
                                        setDashToDate('');
                                        setAppliedDashFromDate('');
                                        setAppliedDashToDate('');
                                    }}
                                />
                            ) : null
                        }


                        {/* =================================================
                FULL PAGE SPINNER LOADER
            ================================================= */}

                        {
                            loading ? (

                                <div className="flex items-center justify-center gap-3 py-20 text-sm font-bold text-slate-600">

                                    <RefreshCw
                                        size={20}
                                        className="animate-spin text-blue-600"
                                    />

                                    <span>Loading...</span>

                                </div>

                            ) : null
                        }


                        {/* =================================================
                DASHBOARD
            ================================================= */}

                        {
                            !loading ? (
                                view === 'DASHBOARD' ? (
                                    <>


                                        {/* =========================================
                        COMMISSIONER SUMMARY
                    ========================================= */}

                                        <CommissionerSummary
                                            periodLabel={dashboardPeriodLabel(appliedDashFromDate, appliedDashToDate)}
                                            rangeDayCount={rangeDayCount}
                                            isMultiDayRange={isMultiDayRange}

                                            moduleFilter={moduleFilter}
                                            selectedZone={selectedZone}
                                            selectedWard={selectedWard}
                                            search={search}

                                            stats={stats}
                                            approvalRate={approvalRate}
                                            closureRate={closureRate}
                                            correctiveTotal={correctiveTotal}
                                            attentionZone={attentionZone}
                                            oldestPendingDays={oldestPendingDays}
                                            briefingSummary={briefingSummary}
                                            highestCorrectiveModule={highestCorrectiveModule}

                                            attendance={attendance}
                                            attendanceLoading={attendanceLoading}
                                            attendanceError={attendanceError}

                                            wardSummary={wardSummary}
                                            wardSummaryLoading={wardSummaryLoading}
                                            wardSummaryError={wardSummaryError}

                                            onBuildSummaryText={buildCommissionerSummaryText}

                                            onOpenInspection={() =>
                                                router.push('/ulb/inspection-performance')
                                            }

                                            onOpenAttendance={() =>
                                                router.push(
                                                    `/ulb/attendance?group=HEALTH_WORKERS${appliedDashFromDate ? `&from=${appliedDashFromDate}` : ''
                                                    }${appliedDashToDate ? `&to=${appliedDashToDate}` : ''
                                                    }`
                                                )
                                            }

                                            onOpenWardRanking={() =>
                                                router.push('/ulb/ward-ranking')
                                            }
                                        />


                                        {/* =========================================
                        INSPECTION & PERFORMANCE

                        Wraps the QC workflow stat cards, the module
                        breakdown charts and the 14-day reports trend
                        into one titled section, so it reads as its
                        own domain alongside Attendance and Ward
                        Ranking below.
                    ========================================= */}

                                        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">

                                            <SectionHeading
                                                icon={ClipboardCheck}
                                                title="Inspection & Performance Overview"
                                                description="QC workflow position, module breakdown and reports trend across all sanitation modules."
                                                action={
                                                    <button
                                                        type="button"
                                                        onClick={() => router.push('/ulb/inspection-performance')}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                                                    >
                                                        Open Inspection & Performance
                                                        <ArrowRight size={14} />
                                                    </button>
                                                }
                                            />

                                            <div className="space-y-5 p-5">

                                        {/* =========================================
                        QC WORKFLOW STAT CARDS

                        Naming matches the Inspection & Performance
                        screen (Total Inspection / QC Pending / QC
                        Approved / QC Rejected / Action Required /
                        Action Taken) so the two screens read as one
                        vocabulary. When a multi-day date range is
                        applied, each card shows a per-day average
                        the same way Attendance Analytics does.
                    ========================================= */}

                                        <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">

                                            <ExecutiveKpi
                                                label="Total Inspection"

                                                value={
                                                    stats.grandTotal
                                                }

                                                // note={
                                                //     isMultiDayRange
                                                //         ? `Avg ${formatAverageValue(stats.grandTotal / rangeDayCount)}/day (${averageFormula(stats.grandTotal, rangeDayCount)})`
                                                //         : selectedModuleName
                                                // }

                                                icon={
                                                    Layers3
                                                }

                                                tone="navy"

                                                onClick={() =>
                                                    router.push(
                                                        '/ulb/inspection-performance'
                                                    )
                                                }
                                            />


                                            <ExecutiveKpi
                                                label="QC Pending"

                                                value={
                                                    stats.pending
                                                }

                                                // note={
                                                //     isMultiDayRange
                                                //         ? `Avg ${formatAverageValue(stats.pending / rangeDayCount)}/day (${averageFormula(stats.pending, rangeDayCount)})`
                                                //         : 'Awaiting QC review'
                                                // }

                                                icon={
                                                    Clock3
                                                }

                                                tone="gold"

                                                onClick={() =>
                                                    router.push(
                                                        '/ulb/inspection-performance?status=PENDING'
                                                    )
                                                }
                                            />


                                            <ExecutiveKpi
                                                label="QC Approved"

                                                value={
                                                    stats.approved
                                                }

                                                // note={
                                                //     isMultiDayRange
                                                //         ? `Avg ${formatAverageValue(stats.approved / rangeDayCount)}/day (${averageFormula(stats.approved, rangeDayCount)})`
                                                //         : 'Reviewed and accepted by QC'
                                                // }

                                                icon={
                                                    CheckCircle2
                                                }

                                                tone="teal"

                                                onClick={() =>
                                                    router.push(
                                                        '/ulb/inspection-performance?status=APPROVED'
                                                    )
                                                }
                                            />


                                            <ExecutiveKpi
                                                label="QC Rejected"

                                                value={
                                                    stats.rejected
                                                }

                                                // note={
                                                //     isMultiDayRange
                                                //         ? `Avg ${formatAverageValue(stats.rejected / rangeDayCount)}/day (${averageFormula(stats.rejected, rangeDayCount)})`
                                                //         : 'Rejected during QC review'
                                                // }

                                                icon={
                                                    XCircle
                                                }

                                                tone="rose"

                                                onClick={() =>
                                                    router.push(
                                                        '/ulb/inspection-performance?status=REJECTED'
                                                    )
                                                }
                                            />


                                            <ExecutiveKpi
                                                label="Action Required"

                                                value={
                                                    correctiveTotal
                                                }

                                                // note={
                                                //     isMultiDayRange
                                                //         ? `Avg ${formatAverageValue(correctiveTotal / rangeDayCount)}/day (${averageFormula(correctiveTotal, rangeDayCount)})`
                                                //         : 'Ever required corrective action'
                                                // }

                                                icon={
                                                    AlertTriangle
                                                }

                                                tone="orange"

                                                onClick={() =>
                                                    router.push(
                                                        '/ulb/inspection-performance?status=ACTION_REQUIRED'
                                                    )
                                                }
                                            />


                                            <ExecutiveKpi
                                                label="Pending Action"

                                                value={
                                                    stats
                                                        .actionRequired
                                                }

                                                // note={
                                                //     isMultiDayRange
                                                //         ? `Avg ${formatAverageValue(stats.actionRequired / rangeDayCount)}/day (${averageFormula(stats.actionRequired, rangeDayCount)})`
                                                //         : 'Awaiting corrective response'
                                                // }

                                                icon={
                                                    Clock3
                                                }

                                                tone="cyan"

                                                onClick={() =>
                                                    router.push(
                                                        '/ulb/inspection-performance?status=PENDING_ACTION'
                                                    )
                                                }
                                            />


                                            <ExecutiveKpi
                                                label="Action Taken"

                                                value={
                                                    stats
                                                        .actionTaken
                                                }

                                                // note={
                                                //     isMultiDayRange
                                                //         ? `Avg ${formatAverageValue(stats.actionTaken / rangeDayCount)}/day (${averageFormula(stats.actionTaken, rangeDayCount)})`
                                                //         : 'Corrective work completed'
                                                // }

                                                icon={
                                                    FileCheck2
                                                }

                                                tone="indigo"

                                                onClick={() =>
                                                    router.push(
                                                        '/ulb/inspection-performance?status=ACTION_TAKEN'
                                                    )
                                                }
                                            />

                                        </section>


                                        {/* =========================================
                        CHARTS
                    ========================================= */}

                                        <section className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">


                                            {/* MODULE CHART */}

                                            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">

                                                <div className="mb-5 flex flex-col gap-1">



                                                    <h2 className="text-lg font-black text-slate-900">
                                                        Module Workflow Position
                                                    </h2>


                                                    <p className="text-xs font-medium text-slate-500">
                                                        Compare QC decisions and Action Required / Action Taken progress across all three sanitation modules.
                                                    </p>

                                                </div>


                                                <div className="h-[330px]">

                                                    <ResponsiveContainer
                                                        width="100%"
                                                        height="100%"
                                                    >

                                                        <BarChart
                                                            data={
                                                                moduleChartData
                                                            }

                                                            barGap={3}
                                                        >

                                                            <CartesianGrid
                                                                vertical={false}

                                                                stroke="#eef2f7"

                                                                strokeDasharray="3 3"
                                                            />


                                                            <XAxis
                                                                dataKey="name"

                                                                axisLine={
                                                                    false
                                                                }

                                                                tickLine={
                                                                    false
                                                                }

                                                                fontSize={11}
                                                            />


                                                            <YAxis
                                                                axisLine={
                                                                    false
                                                                }

                                                                tickLine={
                                                                    false
                                                                }

                                                                fontSize={11}

                                                                allowDecimals={
                                                                    false
                                                                }
                                                            />


                                                            <Tooltip />


                                                            <Bar
                                                                dataKey="Approved"

                                                                fill="#0f766e"

                                                                radius={[
                                                                    5,
                                                                    5,
                                                                    0,
                                                                    0,
                                                                ]}
                                                            />


                                                            <Bar
                                                                dataKey="Rejected"

                                                                fill="#dc2626"

                                                                radius={[
                                                                    5,
                                                                    5,
                                                                    0,
                                                                    0,
                                                                ]}
                                                            />


                                                            <Bar
                                                                dataKey="Action Required"

                                                                fill="#b7791f"

                                                                radius={[
                                                                    5,
                                                                    5,
                                                                    0,
                                                                    0,
                                                                ]}
                                                            />


                                                            <Bar
                                                                dataKey="Action Taken"

                                                                fill="#2563eb"

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


                                                <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-[11px] font-bold text-slate-500">

                                                    <LegendDot
                                                        color="#0f766e"
                                                        label="QC approved"
                                                    />

                                                    <LegendDot
                                                        color="#dc2626"
                                                        label="QC rejected"
                                                    />

                                                    <LegendDot
                                                        color="#b7791f"
                                                        label="Action Required"
                                                    />

                                                    <LegendDot
                                                        color="#2563eb"
                                                        label="Action Taken"
                                                    />

                                                </div>

                                            </div>


                                            {/* STATUS PIE */}

                                            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">




                                                <h2 className="mt-1 text-lg font-black text-slate-900">
                                                    Workflow Distribution
                                                </h2>


                                                <div className="h-[240px]">

                                                    <ResponsiveContainer
                                                        width="100%"
                                                        height="100%"
                                                    >

                                                        <PieChart>

                                                            <Pie
                                                                data={
                                                                    statusData
                                                                }

                                                                dataKey="value"

                                                                nameKey="name"

                                                                innerRadius={
                                                                    58
                                                                }

                                                                outerRadius={
                                                                    88
                                                                }

                                                                paddingAngle={
                                                                    3
                                                                }
                                                            >

                                                                {
                                                                    statusData.map(
                                                                        (
                                                                            entry
                                                                        ) => (

                                                                            <Cell
                                                                                key={
                                                                                    entry.name
                                                                                }

                                                                                fill={
                                                                                    entry.color
                                                                                }
                                                                            />

                                                                        )
                                                                    )
                                                                }

                                                            </Pie>


                                                            <Tooltip />

                                                        </PieChart>

                                                    </ResponsiveContainer>

                                                </div>


                                                <div className="grid grid-cols-2 gap-2">

                                                    {
                                                        statusData.map(
                                                            (
                                                                item
                                                            ) => (

                                                                <div
                                                                    key={
                                                                        item.name
                                                                    }

                                                                    className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
                                                                >

                                                                    <div className="flex items-center gap-2">

                                                                        <span
                                                                            className="h-2.5 w-2.5 rounded-full"

                                                                            style={{
                                                                                backgroundColor:
                                                                                    item.color,
                                                                            }}
                                                                        />


                                                                        <span className="text-[10px] font-bold text-slate-500">
                                                                            {item.name}
                                                                        </span>

                                                                    </div>


                                                                    <div className="mt-1 text-lg font-black text-slate-900">
                                                                        {item.value}
                                                                    </div>

                                                                </div>

                                                            )
                                                        )
                                                    }

                                                </div>

                                            </div>

                                        </section>


                                        {/* =========================================
                        REPORTS VOLUME TREND
                    ========================================= */}

                                        <ReportsTrendChart
                                            data={reportsTrend}
                                        />

                                            </div>

                                        </section>


                                        {/* =========================================
                        ATTENDANCE
                    ========================================= */}

                                        <AttendanceOverview
                                            data={attendance}
                                            loading={attendanceLoading}
                                            error={attendanceError}
                                            isMultiDayRange={isMultiDayRange}
                                            rangeDayCount={rangeDayCount}
                                            onOpenAttendance={() =>
                                                router.push(
                                                    `/ulb/attendance?group=HEALTH_WORKERS${appliedDashFromDate ? `&from=${appliedDashFromDate}` : ''
                                                    }${appliedDashToDate ? `&to=${appliedDashToDate}` : ''
                                                    }`
                                                )
                                            }
                                        />


                                        {/* =========================================
                        WARD RANKING SNAPSHOT
                    ========================================= */}

                                        <WardPerformanceOverview
                                            summary={wardSummary}
                                            loading={wardSummaryLoading}
                                            error={wardSummaryError}
                                            onOpenWardRanking={(status) =>
                                                router.push(
                                                    status
                                                        ? `/ulb/ward-ranking?status=${status}`
                                                        : '/ulb/ward-ranking'
                                                )
                                            }
                                        />


                                        {/* =========================================
                        PERFORMANCE BREAKDOWN

                        Wraps the Zone/Ward leaderboards and the
                        Supervisor/QC Reviewer/Action Officer
                        leaderboards into one titled section, so all
                        five performance rankings read as one domain.
                    ========================================= */}

                                        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">

                                            <SectionHeading
                                                icon={Trophy}
                                                eyebrow="Performance leaderboards"
                                                title="Performance Breakdown"
                                                description="Zone, ward, supervisor, QC reviewer and Action Officer performance across all sanitation modules."
                                            />

                                            <div className="space-y-5 p-5">

                                                <div className="grid gap-5 xl:grid-cols-2">

                                                    <PerformanceLeaderboardCard
                                                        icon={Building2}
                                                        tone="blue"
                                                        title="Zone Performance"
                                                        description="Ranked by QC approval rate."
                                                        rows={zoneLeaderboard}
                                                        emptyMessage="No zone information is available on the current reports."
                                                    />

                                                    <PerformanceLeaderboardCard
                                                        icon={MapPin}
                                                        tone="cyan"
                                                        title="Ward Performance"
                                                        description="Ranked by QC approval rate."
                                                        rows={wardLeaderboard}
                                                        emptyMessage="No ward information is available on the current reports."
                                                        scroll
                                                    />

                                                </div>

                                                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                                                    <PeopleLeaderboardCard
                                                        icon={UsersRound}
                                                        tone="indigo"
                                                        title="Supervisor Performance"
                                                        rows={supervisorLeaderboard}
                                                        rateType="approval"
                                                        emptyMessage="No records are attributed to a named supervisor yet."
                                                    />

                                                    <PeopleLeaderboardCard
                                                        icon={ShieldCheck}
                                                        tone="teal"
                                                        title="QC Reviewer Performance"
                                                        rows={qcLeaderboard}
                                                        rateType="approval"
                                                        emptyMessage="No QC reviewer identity is available yet."
                                                        note="Currently available for Toilet inspections only — other modules don't expose reviewer identity via the API yet."
                                                    />

                                                    <PeopleLeaderboardCard
                                                        icon={Award}
                                                        tone="amber"
                                                        title="Action Officer Performance"
                                                        rows={actionOfficerLeaderboard}
                                                        rateType="closure"
                                                        emptyMessage="No Action Officer identity is available yet."
                                                        note="Named officers are shown for Toilets, Litter Bins and Sweeping. Litter Bin records assigned before this data was joined may still fall back to a short officer ID."
                                                    />

                                                </div>

                                            </div>

                                        </section>


                                        {/* =========================================
                        ACTION REQUIRED QUEUE
                    ========================================= */}

                                        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">

                                            <SectionHeading
                                                icon={
                                                    AlertTriangle
                                                }

                                                title="Oldest Action Pending Reports"

                                                description="Reports already sent to Action Officers and still awaiting a response."

                                                action={

                                                    <button
                                                        type="button"

                                                        onClick={() =>
                                                            router.push(
                                                                '/ulb/reports/action-required'
                                                            )
                                                        }

                                                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                                                    >

                                                        Open queue

                                                        <ArrowRight
                                                            size={14}
                                                        />

                                                    </button>

                                                }
                                            />


                                            <RecordsTable
                                                records={
                                                    actionRequiredRecords
                                                }

                                                loading={
                                                    loading
                                                }

                                                onView={
                                                    openDetail
                                                }

                                                onActionRequired={
                                                    beginActionRequired
                                                }

                                                emptyMessage="No reports are Action Required."
                                            />

                                        </section>



                                     

                                    </>
                                ) : (
                                    <>

                                        {/* =============================================
                        SUMMARY
                    ============================================= */}

                                        <section className="grid gap-4 md:grid-cols-3">

                                            <CompactSummary
                                                label="Visible Reports"

                                                value={
                                                    filteredRecords.length
                                                }

                                                note={
                                                    selectedModuleName
                                                }

                                                icon={
                                                    ClipboardCheck
                                                }
                                            />


                                            <CompactSummary
                                                label="All QC Processed"

                                                value={
                                                    stats.total
                                                }

                                                note="Within selected module scope"

                                                icon={
                                                    Layers3
                                                }
                                            />


                                            <CompactSummary
                                                label="Action Rate"

                                                value={`${closureRate}%`}

                                                note={`${stats.actionTaken} Action Taken reports`}

                                                icon={
                                                    TrendingUp
                                                }
                                            />

                                        </section>


                                        {/* =============================================
                        RECORD TABLE
                    ============================================= */}

                                        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">

                                            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">

                                                <div>

                                                    <div className="flex items-center gap-2">

                                                        <span
                                                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${VIEW_CONFIG[
                                                                view
                                                            ].badgeClass
                                                                }`}
                                                        >

                                                            {
                                                                VIEW_CONFIG[
                                                                    view
                                                                ].status
                                                                    .replace(
                                                                        /_/g,
                                                                        ' '
                                                                    )
                                                            }

                                                        </span>


                                                        <span className="text-xs font-bold text-slate-400">

                                                            {
                                                                filteredRecords.length
                                                            }

                                                            {' '}

                                                            report

                                                            {
                                                                filteredRecords.length ===
                                                                    1
                                                                    ? ''
                                                                    : 's'
                                                            }

                                                        </span>

                                                    </div>


                                                    <h2 className="mt-2 text-base font-black text-slate-900">

                                                        {
                                                            VIEW_CONFIG[
                                                                view
                                                            ].title
                                                        }

                                                    </h2>

                                                </div>


                                                <div className="text-xs font-semibold text-slate-400">

                                                    Page {page} of {totalPages}

                                                </div>

                                            </div>


                                            <RecordsTable
                                                records={
                                                    pagedRecords
                                                }

                                                loading={
                                                    loading
                                                }

                                                onView={
                                                    openDetail
                                                }

                                                onActionRequired={
                                                    beginActionRequired
                                                }

                                                emptyMessage={`No ${VIEW_CONFIG[
                                                    view
                                                ].status
                                                    .replace(
                                                        /_/g,
                                                        ' '
                                                    )
                                                    .toLowerCase()} reports found.`}
                                            />


                                            {/* PAGINATION */}

                                            {
                                                filteredRecords.length >
                                                    PAGE_SIZE
                                                    ? (

                                                        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">

                                                            <span className="text-xs font-semibold text-slate-400">

                                                                Showing{' '}

                                                                {
                                                                    (
                                                                        page - 1
                                                                    ) *
                                                                    PAGE_SIZE +
                                                                    1
                                                                }

                                                                {' – '}

                                                                {
                                                                    Math.min(
                                                                        page *
                                                                        PAGE_SIZE,

                                                                        filteredRecords.length
                                                                    )
                                                                }

                                                                {' of '}

                                                                {
                                                                    filteredRecords.length
                                                                }

                                                            </span>


                                                            <div className="flex gap-2">

                                                                <button
                                                                    type="button"

                                                                    disabled={
                                                                        page <=
                                                                        1
                                                                    }

                                                                    onClick={() =>
                                                                        setPage(
                                                                            (
                                                                                current
                                                                            ) =>
                                                                                Math.max(
                                                                                    1,
                                                                                    current -
                                                                                    1
                                                                                )
                                                                        )
                                                                    }

                                                                    className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                                >

                                                                    <ChevronLeft
                                                                        size={14}
                                                                    />

                                                                    Previous

                                                                </button>


                                                                <button
                                                                    type="button"

                                                                    disabled={
                                                                        page >=
                                                                        totalPages
                                                                    }

                                                                    onClick={() =>
                                                                        setPage(
                                                                            (
                                                                                current
                                                                            ) =>
                                                                                Math.min(
                                                                                    totalPages,
                                                                                    current +
                                                                                    1
                                                                                )
                                                                        )
                                                                    }

                                                                    className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                                >

                                                                    Next

                                                                    <ChevronRight
                                                                        size={14}
                                                                    />

                                                                </button>

                                                            </div>

                                                        </div>

                                                    )
                                                    : null
                                            }

                                        </section>

                                    </>
                                )
                            ) : null
                        }


                        {/* =================================================
                VIEW DETAILS
            ================================================= */}

                        <ReportDetailModal
                            item={
                                detailItem
                            }

                            loading={
                                detailLoading
                            }

                            onClose={() =>
                                setDetailItem(
                                    null
                                )
                            }

                            onActionRequired={
                                beginActionRequired
                            }

                            onImagePreview={
                                setImagePreview
                            }
                        />


                        {/* =================================================
                ACTION REQUIRED
            ================================================= */}

                        <ActionRequiredModal
                            item={
                                actionTarget
                            }

                            remark={
                                actionRemark
                            }

                            setRemark={
                                setActionRemark
                            }

                            submitting={
                                actionSubmitting
                            }

                            onClose={() => {

                                if (
                                    !actionSubmitting
                                ) {
                                    setActionTarget(
                                        null
                                    );

                                    setActionRemark(
                                        ''
                                    );
                                }

                            }}

                            onSubmit={
                                submitActionRequired
                            }
                        />


                        {/* =================================================
                IMAGE PREVIEW
            ================================================= */}

                        <ImagePreviewModal
                            uri={
                                imagePreview
                            }

                            onClose={() =>
                                setImagePreview(
                                    null
                                )
                            }
                        />

                    </div>

                </PortalHomeLayout>

            </RoleGuard>

        </Protected>
    );
}


/* =========================================================
   SCORE RING
========================================================= */

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

    const strokeWidth = 7;

    const radius =
        (size - strokeWidth) / 2;

    const circumference =
        2 * Math.PI * radius;

    const clamped =
        Math.max(0, Math.min(100, score));

    const offset =
        circumference * (1 - clamped / 100);

    const strokeColor =
        progressColor ||
        (clamped >= 85
            ? '#10b981'
            : clamped >= 70
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
                    transition: 'stroke-dashoffset 700ms ease',
                }}
            />
        </svg>
    );
}


/* =========================================================
   QUICK ANSWER CARD
========================================================= */

function QuickAnswerCard({
    icon,
    iconTone,
    label,
    title,
    value,
    valueTone,
    onClick,
}: {
    icon: any;
    iconTone: 'amber' | 'rose' | 'blue' | 'slate';
    label: string;
    title: string;
    value: string;
    valueTone: string;
    onClick?: () => void;
}) {

    const cardTones: Record<
        string,
        { bg: string; border: string; icon: string }
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
        cardTones[iconTone] || cardTones.slate;

    const Wrapper: any =
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

            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
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


/* =========================================================
   STATUS PAGE HEADER
========================================================= */

function StatusHeader({ view, loading, loadRecords, router }: any) {
    const config = VIEW_CONFIG[view as Exclude<UlbView, 'DASHBOARD'>];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push('/ulb/dashboard')}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 cursor-pointer"
                    title="Back to Dashboard"
                >
                    <ChevronLeft size={18} />
                </button>

                <h1 className="text-xl font-black tracking-tight text-slate-900">
                    {config.title}
                </h1>
            </div>

            <button
                type="button"
                onClick={loadRecords}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
            </button>
        </section>
    );
}


/* =========================================================
   KPI
========================================================= */

function ExecutiveKpi({
    label,
    value,
    note,
    icon: Icon,
    tone,
    onClick,
}: any) {

    const tones: Record<
        string,
        {
            icon: string;
            bg: string;
            border: string;
            accent: string;
        }
    > = {

        teal: {
            icon:
                'text-teal-700',

            bg:
                'bg-teal-50',

            border:
                'hover:border-teal-200',

            accent:
                'bg-teal-500',
        },


        rose: {
            icon:
                'text-rose-700',

            bg:
                'bg-rose-50',

            border:
                'hover:border-rose-200',

            accent:
                'bg-rose-500',
        },


        gold: {
            icon:
                'text-amber-700',

            bg:
                'bg-amber-50',

            border:
                'hover:border-amber-200',

            accent:
                'bg-amber-500',
        },


        blue: {
            icon:
                'text-blue-700',

            bg:
                'bg-blue-50',

            border:
                'hover:border-blue-200',

            accent:
                'bg-blue-500',
        },


        navy: {
            icon:
                'text-slate-800',

            bg:
                'bg-slate-100',

            border:
                'hover:border-slate-300',

            accent:
                'bg-slate-500',
        },


        orange: {
            icon:
                'text-orange-700',

            bg:
                'bg-orange-50',

            border:
                'hover:border-orange-200',

            accent:
                'bg-orange-500',
        },


        indigo: {
            icon:
                'text-indigo-700',

            bg:
                'bg-indigo-50',

            border:
                'hover:border-indigo-200',

            accent:
                'bg-indigo-500',
        },


        cyan: {
            icon:
                'text-cyan-700',

            bg:
                'bg-cyan-50',

            border:
                'hover:border-cyan-200',

            accent:
                'bg-cyan-500',
        },

    };


    const selected =
        tones[tone] ||
        tones.blue;


    return (
        <button
            type="button"

            onClick={
                onClick
            }

            disabled={
                !onClick
            }

            className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 ${selected.border} ${onClick
                ? 'hover:-translate-y-0.5 hover:shadow-md'
                : 'cursor-default'
                }`}
        >

            <div className={`absolute bottom-0 left-0 top-0 w-[3px] ${selected.accent}`} />

            <div className="flex items-center justify-between gap-2">

                <div className="flex min-w-0 items-center gap-3">

                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected.bg}`}
                    >

                        <Icon
                            size={19}

                            className={
                                selected.icon
                            }
                        />

                    </div>


                    <div className="truncate text-[26px] font-black leading-none tracking-tight text-slate-900 tabular-nums">
                        {value}
                    </div>

                </div>


                {
                    onClick ? (

                        <ChevronRight
                            size={15}

                            className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
                        />

                    ) : null
                }

            </div>


            <div className="mt-2.5 truncate text-[11px] font-black text-slate-700">
                {label}
            </div>


            {
                note ? (
                    <div className="mt-0.5 truncate text-[10px] font-semibold leading-tight text-slate-400">
                        {note}
                    </div>
                ) : null
            }

        </button>
    );
}


/* =========================================================
   COMPACT SUMMARY
========================================================= */

function CompactSummary({
    label,
    value,
    note,
    icon: Icon,
    onClick,
}: any) {

    const Wrapper: any =
        onClick ? 'button' : 'div';

    return (
        <Wrapper
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={`group flex w-full items-center gap-4 rounded-[20px] border border-slate-200 bg-white p-4 text-left shadow-sm transition ${onClick
                ? 'cursor-pointer hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md'
                : ''
                }`}
        >

            {
                Icon ? (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

                        <Icon
                            size={19}
                        />

                    </div>
                ) : null
            }


            <div className="min-w-0 flex-1">

                <div className="text-xl font-black text-slate-900">
                    {value}
                </div>


                <div className="text-xs font-black text-slate-700">
                    {label}
                </div>


                <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                    {note}
                </div>

            </div>


            {
                onClick ? (
                    <ChevronRight
                        size={15}
                        className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
                    />
                ) : null
            }

        </Wrapper>
    );
}


/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
    icon: Icon,
    title,
    description,
    action,
}: any) {

    return (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">

            <div>

                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">

                    <Icon
                        size={14}
                    />


                </div>


                <h2 className="mt-1 text-base font-black text-slate-900">
                    {title}
                </h2>


                <p className="mt-1 text-xs font-medium text-slate-500">
                    {description}
                </p>

            </div>


            {action}

        </div>
    );
}


/* =========================================================
   LEGEND
========================================================= */

function LegendDot({
    color,
    label,
}: {
    color: string;
    label: string;
}) {

    return (
        <span className="inline-flex items-center gap-2">

            <span
                className="h-2.5 w-2.5 rounded-full"

                style={{
                    backgroundColor:
                        color,
                }}
            />

            {label}

        </span>
    );
}


/* =========================================================
   RATE BAR
========================================================= */

function RateBar({
    value,
    tone = 'blue',
}: {
    value: number | null;
    tone?: 'blue' | 'emerald' | 'amber' | 'rose';
}) {

    if (value === null) {
        return (
            <span className="text-[10px] font-semibold text-slate-400">
                No decisions yet
            </span>
        );
    }

    const toneClass: Record<string, string> = {
        blue: 'bg-blue-600',
        emerald: 'bg-emerald-600',
        amber: 'bg-amber-500',
        rose: 'bg-rose-600',
    };

    return (
        <div className="flex items-center gap-2">

            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full rounded-full ${toneClass[tone]}`}
                    style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                />
            </div>

            <span className="text-xs font-black text-slate-700">
                {value}%
            </span>

        </div>
    );
}


/* =========================================================
   COMMISSIONER SUMMARY

   A single, shareable "at a glance" briefing combining
   Inspection & Performance, Health Worker Attendance and Ward
   Ranking for the currently applied filters - so a Commissioner
   gets the full picture, and a WhatsApp-ready export, without
   opening three separate screens.
========================================================= */

function CommissionerSummary({
    periodLabel,
    rangeDayCount,
    isMultiDayRange,

    moduleFilter,
    selectedZone,
    selectedWard,
    search,

    stats,
    approvalRate,
    closureRate,
    correctiveTotal,
    attentionZone,
    oldestPendingDays,
    briefingSummary,
    highestCorrectiveModule,

    attendance,
    attendanceLoading,
    attendanceError,

    wardSummary,
    wardSummaryLoading,
    wardSummaryError,

    onBuildSummaryText,
    onOpenInspection,
    onOpenAttendance,
    onOpenWardRanking,
}: any) {

    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');


    const handleCopy = async () => {
        const text = onBuildSummaryText();

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            setCopyState('copied');
        } catch {
            setCopyState('error');
        }

        setTimeout(() => setCopyState('idle'), 2500);
    };


    const handleWhatsApp = () => {
        const text = onBuildSummaryText();

        window.open(
            `https://wa.me/?text=${encodeURIComponent(text)}`,
            '_blank',
            'noopener,noreferrer'
        );
    };


    const activeFilters: Array<{ label: string; tone: string }> = [
        moduleFilter !== 'ALL' ? { label: `Module: ${moduleLabel(moduleFilter)}`, tone: 'blue' } : null,
        selectedZone !== 'ALL' ? { label: `Zone: ${selectedZone}`, tone: 'cyan' } : null,
        selectedWard !== 'ALL' ? { label: `Ward: ${selectedWard}`, tone: 'emerald' } : null,
        search.trim() ? { label: `Search: "${search.trim()}"`, tone: 'violet' } : null,
    ].filter(Boolean) as Array<{ label: string; tone: string }>;

    const toneChip: Record<string, string> = {
        blue: 'border-white/25 bg-white/10 text-blue-50',
        cyan: 'border-white/25 bg-white/10 text-cyan-50',
        emerald: 'border-white/25 bg-white/10 text-emerald-50',
        violet: 'border-white/25 bg-white/10 text-violet-50',
    };

    const attendanceSummary =
        attendance?.hasData && attendance.summary
            ? attendance.summary
            : null;

    const wardRanked =
        wardSummary
            ? wardSummary.green + wardSummary.amber + wardSummary.red
            : 0;

    const attentionZoneRate =
        attentionZone
            ? approvalRateOf(attentionZone)
            : null;

    const inspectionLegendData = useMemo(
        () =>
            [
                { key: 'approved', label: 'approved', value: stats.approved, color: '#10b981', dot: 'bg-emerald-500' },
                { key: 'rejected', label: 'rejected', value: stats.rejected, color: '#f43f5e', dot: 'bg-rose-500' },
                { key: 'pending', label: 'pending', value: stats.pending, color: '#f59e0b', dot: 'bg-amber-500' },
                { key: 'actionRequired', label: 'action req.', value: stats.actionRequired, color: '#f97316', dot: 'bg-orange-500' },
                { key: 'actionTaken', label: 'action taken', value: stats.actionTaken, color: '#3b82f6', dot: 'bg-blue-500' },
            ].map((d) => ({
                ...d,
                pct: stats.grandTotal > 0 ? ((d.value / stats.grandTotal) * 100).toFixed(1) : '0.0',
            })),
        [stats]
    );

    const inspectionPieData = useMemo(
        () => inspectionLegendData.filter((d) => d.value > 0),
        [inspectionLegendData]
    );

    const attendancePieData = useMemo(() => {
        if (!attendanceSummary) return [];
        const rate = Math.max(0, Math.min(100, Number(attendanceSummary.attendanceRate) || 0));
        return [
            { key: 'present', name: 'Present', value: rate, color: '#10b981' },
            { key: 'remainder', name: 'Remainder', value: 100 - rate, color: '#e2e8f0' },
        ];
    }, [attendanceSummary]);

    const wardBarData = useMemo(() => {
        if (!wardSummary) return [];
        return [
            { key: 'green', name: 'Top', value: wardSummary.green, color: '#10b981' },
            { key: 'amber', name: 'Avg', value: wardSummary.amber, color: '#f59e0b' },
            { key: 'red', name: 'Below', value: wardSummary.red, color: '#f43f5e' },
        ];
    }, [wardSummary]);


    return (
        <section
            className="relative overflow-hidden rounded-[28px] border border-slate-800 shadow-[0_20px_60px_rgba(2,6,23,0.4)]"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}
        >

            <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />

            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 75% 55%, rgba(255,255,255,0.65) 0 1px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
            <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-72 rounded-tl-[100%] border-l border-t border-white/20 opacity-50" />

            <div className="relative p-6 sm:p-7">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                    <div className="min-w-0">


                        <h2 className="mt-1.5 text-xl font-black tracking-tight text-white sm:text-2xl">
                            Exclusive Summary
                        </h2>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-bold">

                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-white shadow-sm backdrop-blur-sm">
                                <CalendarDays size={12} />
                                {periodLabel}
                                {isMultiDayRange ? ` · ${rangeDayCount} days` : ''}
                            </span>

                            {
                                activeFilters.map((f) => (
                                    <span
                                        key={f.label}
                                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${toneChip[f.tone]}`}
                                    >
                                        {f.label}
                                    </span>
                                ))
                            }

                        </div>

                    </div>

                    <div className="flex shrink-0 items-center gap-2">

                        <button
                            type="button"
                            onClick={handleCopy}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/10 px-3.5 py-2.5 text-xs font-black text-white shadow-sm backdrop-blur transition hover:bg-white/20"
                        >
                            {
                                copyState === 'copied' ? (
                                    <CheckCircle2 size={14} className="text-emerald-300" />
                                ) : (
                                    <Copy size={14} />
                                )
                            }
                            {
                                copyState === 'copied'
                                    ? 'Copied'
                                    : copyState === 'error'
                                        ? 'Try again'
                                        : 'Copy'
                            }
                        </button>

                        <button
                            type="button"
                            onClick={handleWhatsApp}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-900/30 transition hover:-translate-y-0.5"
                        >
                            <MessageCircle size={14} />
                            Share on WhatsApp
                        </button>

                    </div>

                </div>


                {/* ACTION-DRIVEN HEADLINE TILES */}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                    <button
                        type="button"
                        onClick={onOpenInspection}
                        className="group rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 to-blue-100/70 p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-blue-700">
                            <Clock3 size={13} />
                            QC Pending
                        </div>
                        <div className="mt-1.5 text-2xl font-black text-slate-900 tabular-nums">
                            {dashboardNumberFormatter.format(stats.pending)}
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold text-blue-700/60">
                            Awaiting first QC review
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenInspection}
                        className="group rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 to-orange-100/70 p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-orange-700">
                            <AlertTriangle size={13} />
                            Action Required
                        </div>
                        <div className="mt-1.5 text-2xl font-black text-slate-900 tabular-nums">
                            {dashboardNumberFormatter.format(stats.actionRequired)}
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold text-orange-700/60">
                            {correctiveTotal > 0 ? `${closureRate}% Action` : 'No Action Required reports yet'}
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenWardRanking}
                        className="group rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50 to-pink-100/70 p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-rose-700">
                            <Award size={13} />
                            Wards Below Average
                        </div>
                        <div className="mt-1.5 text-2xl font-black text-slate-900 tabular-nums">
                            {wardSummary ? dashboardNumberFormatter.format(wardSummary.red) : '—'}
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold text-rose-700/60">
                            {wardSummary ? `of ${dashboardNumberFormatter.format(wardSummary.totalWards)} total wards` : 'No ranking data yet'}
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenAttendance}
                        className="group rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-100/70 p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                            <UserCheck size={13} />
                            Health Worker Attendance
                        </div>
                        <div className="mt-1.5 text-2xl font-black text-slate-900 tabular-nums">
                            {attendanceSummary ? `${Number(attendanceSummary.attendanceRate).toFixed(1)}%` : '—'}
                        </div>
                        <div className="mt-0.5 text-[10px] font-semibold text-emerald-700/60">
                            {attendanceSummary ? `${dashboardNumberFormatter.format(attendanceSummary.uniqueEmployees)} employees tracked` : 'No attendance data yet'}
                        </div>
                    </button>

                </div>

            </div>


            {/* DETAILED BREAKDOWN */}

            <div className="relative grid gap-px overflow-hidden rounded-b-[28px] border-t border-white/25 bg-white/25 md:grid-cols-3">

                {/* INSPECTION & PERFORMANCE */}

                <button
                    type="button"
                    onClick={onOpenInspection}
                    className="group flex flex-col gap-2 bg-white p-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-blue-700">
                            <ClipboardCheck size={13} />
                            Inspection &amp; Performance
                        </div>
                        <ArrowRight size={14} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
                    </div>

                    {
                        isMultiDayRange ? (
                            <div className="text-[10px] font-semibold text-slate-400">
                                {dashboardNumberFormatter.format(stats.grandTotal)} total reports · avg {formatAverageValue(stats.grandTotal / rangeDayCount)}/day
                            </div>
                        ) : null
                    }

                    <div className="flex items-center gap-3">

                        <div className="relative h-[76px] w-[76px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={inspectionPieData}
                                        dataKey="value"
                                        nameKey="label"
                                        innerRadius={24}
                                        outerRadius={38}
                                        paddingAngle={2}
                                        stroke="none"
                                    >
                                        {
                                            inspectionPieData.map((entry) => (
                                                <Cell key={entry.key} fill={entry.color} />
                                            ))
                                        }
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-sm font-black text-slate-900 tabular-nums">{dashboardNumberFormatter.format(stats.grandTotal)}</span>
                                <span className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Reports</span>
                            </div>
                        </div>

                        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-600">
                            {
                                inspectionLegendData.map((row) => (
                                    <Fragment key={row.key}>
                                        <span className="flex items-center gap-1.5 truncate">
                                            <span className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`} />
                                            {dashboardNumberFormatter.format(row.value)} {row.label}
                                        </span>
                                        <span className="shrink-0 text-right text-slate-400">
                                            {row.pct}%
                                        </span>
                                    </Fragment>
                                ))
                            }
                        </div>

                    </div>

                    <div className="mt-0 flex items-center gap-2 border-t border-slate-100 pt-2">
                        <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">
                            {approvalRate !== null ? `${approvalRate}% approval` : 'No decisions yet'}
                        </span>
                        {
                            attentionZone ? (
                                <span className="truncate text-[10px] font-semibold text-slate-400">
                                    Needs attention: {attentionZone.label}{attentionZoneRate !== null ? ` (${attentionZoneRate}%)` : ''}
                                </span>
                            ) : null
                        }
                    </div>
                </button>


                {/* ATTENDANCE - HEALTH WORKERS */}

                <button
                    type="button"
                    onClick={onOpenAttendance}
                    className="group flex flex-col gap-2 bg-white p-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-md"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                            <UsersRound size={13} />
                            Attendance — Health Workers
                        </div>
                        <ArrowRight size={14} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500" />
                    </div>

                    {
                        attendanceLoading ? (
                            <div className="flex items-center gap-2 py-3 text-xs font-bold text-slate-400">
                                <RefreshCw size={14} className="animate-spin" />
                                Loading attendance...
                            </div>
                        ) : attendanceError ? (
                            <div className="text-xs font-bold text-amber-700">
                                Attendance unavailable: {attendanceError}
                            </div>
                        ) : !attendanceSummary ? (
                            <div className="py-3 text-xs font-semibold text-slate-400">
                                No attendance data uploaded yet.
                            </div>
                        ) : (
                            <>
                                <div className="text-lg font-black text-slate-900 tabular-nums">
                                    {Number(attendanceSummary.attendanceRate).toFixed(1)}%
                                    <span className="ml-1.5 text-[11px] font-bold text-slate-400">attendance rate</span>
                                </div>

                                <div className="flex items-center gap-3">

                                    <div className="relative h-[76px] w-[76px] shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={attendancePieData}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={24}
                                                    outerRadius={38}
                                                    startAngle={90}
                                                    endAngle={-270}
                                                    stroke="none"
                                                >
                                                    {
                                                        attendancePieData.map((entry) => (
                                                            <Cell key={entry.key} fill={entry.color} />
                                                        ))
                                                    }
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-sm font-black text-emerald-600 tabular-nums">{Number(attendanceSummary.attendanceRate).toFixed(0)}%</span>
                                            <span className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Attendance</span>
                                        </div>
                                    </div>

                                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 text-[11px] font-bold text-slate-600">
                                        <span className="flex items-center gap-2 truncate">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white"><UsersRound size={11} /></span>
                                            {dashboardNumberFormatter.format(attendanceSummary.uniqueEmployees)} employees
                                        </span>
                                        <span className="flex items-center gap-2 truncate">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><CheckCircle2 size={11} /></span>
                                            {isMultiDayRange ? `${formatAverageValue(attendanceSummary.present / rangeDayCount)}/day` : dashboardNumberFormatter.format(attendanceSummary.present)} present
                                        </span>
                                        <span className="flex items-center gap-2 truncate">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white"><UserRoundX size={11} /></span>
                                            {isMultiDayRange ? `${formatAverageValue(attendanceSummary.absent / rangeDayCount)}/day` : dashboardNumberFormatter.format(attendanceSummary.absent)} absent
                                        </span>
                                        <span className="flex items-center gap-2 truncate">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white"><Clock3 size={11} /></span>
                                            {formatMinutes(attendanceSummary.avgWorkMinutes)} avg shift
                                        </span>
                                    </div>

                                </div>

                                <div className="mt-0 border-t border-slate-100 pt-2 text-[10px] font-semibold text-slate-400">
                                    {isMultiDayRange ? `Daily averages across ${rangeDayCount} days` : 'Figures are exact for the selected date'}
                                </div>
                            </>
                        )
                    }
                </button>


                {/* WARD RANKING */}

                <button
                    type="button"
                    onClick={onOpenWardRanking}
                    className="group flex flex-col gap-2 bg-white p-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-amber-50 hover:shadow-md"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-700">
                            <Award size={13} />
                            Ward Ranking
                        </div>
                        <ArrowRight size={14} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-amber-500" />
                    </div>

                    {
                        wardSummaryLoading ? (
                            <div className="flex items-center gap-2 py-3 text-xs font-bold text-slate-400">
                                <RefreshCw size={14} className="animate-spin" />
                                Loading ward ranking...
                            </div>
                        ) : wardSummaryError ? (
                            <div className="text-xs font-bold text-amber-700">
                                Ward ranking unavailable: {wardSummaryError}
                            </div>
                        ) : !wardSummary || !wardSummary.totalWards ? (
                            <div className="py-3 text-xs font-semibold text-slate-400">
                                No ward ranking data available yet.
                            </div>
                        ) : (
                            <>
                                <div className="text-lg font-black text-slate-900 tabular-nums">
                                    {Number(wardSummary.averageScore).toFixed(1)}
                                    <span className="ml-1.5 text-[11px] font-bold text-slate-400">city average score</span>
                                </div>

                                <div className="flex items-center gap-3">

                                    <div className="h-[76px] flex-1">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={wardBarData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={9} interval={0} />
                                                <YAxis hide allowDecimals={false} />
                                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                    {
                                                        wardBarData.map((entry) => (
                                                            <Cell key={entry.key} fill={entry.color} />
                                                        ))
                                                    }
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="grid shrink-0 grid-cols-1 gap-1 text-[10px] font-bold text-slate-600">
                                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" /> {dashboardNumberFormatter.format(wardSummary.green)} top</span>
                                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" /> {dashboardNumberFormatter.format(wardSummary.amber)} avg</span>
                                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" /> {dashboardNumberFormatter.format(wardSummary.red)} below</span>
                                    </div>

                                </div>

                                <div className="mt-0 border-t border-slate-100 pt-2 text-[10px] font-semibold text-slate-400">
                                    {wardRanked} of {dashboardNumberFormatter.format(wardSummary.totalWards)} wards ranked this period
                                </div>
                            </>
                        )
                    }
                </button>

            </div>

        </section>
    );
}


/* =========================================================
   ATTENDANCE OVERVIEW
========================================================= */

function AttendanceOverview({
    data,
    loading,
    error,
    isMultiDayRange,
    rangeDayCount,
    onOpenAttendance,
}: {
    data: AttendanceDashboardResponse | null;
    loading: boolean;
    error: string;
    isMultiDayRange: boolean;
    rangeDayCount: number;
    onOpenAttendance: () => void;
}) {

    return (
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">

            <SectionHeading
                icon={UsersRound}
                title="Attendance Performance"
                description={
                    data?.range
                        ? `Reporting window ${formatDateOnly(data.range.from)} – ${formatDateOnly(data.range.to)}`
                        : 'CSV-imported attendance across zones and wards.'
                }
                action={
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-blue-700">
                        <UsersRound size={12} />
                        Health Workers
                    </span>
                }
            />

            <div className="p-5">

                {
                    loading ? (

                        <div className="flex items-center justify-center gap-3 py-14 text-sm font-bold text-slate-400">
                            <RefreshCw size={18} className="animate-spin" />
                            Loading attendance analytics...
                        </div>

                    ) : error ? (

                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                            Attendance analytics unavailable: {error}
                        </div>

                    ) : !data?.hasData || !data?.summary ? (

                        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-14 text-center">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <UsersRound size={18} />
                            </div>
                            <p className="text-xs font-bold text-slate-500">
                                No health worker attendance data yet
                            </p>
                            <p className="max-w-xs text-[11px] font-medium text-slate-400">
                                CSV-imported attendance for health workers will appear here once it has been uploaded for this city.
                            </p>
                        </div>

                    ) : (

                        <>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

                                <ExecutiveKpi
                                    label="Total Employees"
                                    value={data.summary.uniqueEmployees}
                                    note="Health workers tracked"
                                    icon={UsersRound}
                                    tone="navy"
                                    onClick={onOpenAttendance}
                                />

                                <ExecutiveKpi
                                    label="Present"
                                    value={
                                        isMultiDayRange
                                            ? formatAverageValue(data.summary.present / rangeDayCount)
                                            : data.summary.present
                                    }
                                    // note={
                                    //     isMultiDayRange
                                    //         ? `Avg/day · ${averageFormula(data.summary.present, rangeDayCount)}`
                                    //         : `${data.summary.checkedOut} checked out`
                                    // }
                                    icon={CheckCircle2}
                                    tone="teal"
                                    onClick={onOpenAttendance}
                                />

                                <ExecutiveKpi
                                    label="Absent"
                                    value={
                                        isMultiDayRange
                                            ? formatAverageValue(data.summary.absent / rangeDayCount)
                                            : data.summary.absent
                                    }
                                    // note={
                                    //     isMultiDayRange
                                    //         ? `Avg/day · ${averageFormula(data.summary.absent, rangeDayCount)}`
                                    //         : `${data.summary.openCheckIns} open check-ins`
                                    // }
                                    icon={UserRoundX}
                                    tone="rose"
                                    onClick={onOpenAttendance}
                                />

                                <ExecutiveKpi
                                    label="Attendance Rate"
                                    value={`${Number(data.summary.attendanceRate).toFixed(2)}%`}
                                    //note={`${data.summary.uniqueEmployees} employees tracked`}
                                    icon={UserCheck}
                                    tone="blue"
                                    onClick={onOpenAttendance}
                                />

                                <ExecutiveKpi
                                    label="Avg Work Duration"
                                    value={formatMinutes(data.summary.avgWorkMinutes)}
                                    note="Per completed shift"
                                    icon={TimerReset}
                                    tone="indigo"
                                    onClick={onOpenAttendance}
                                />

                            </div>

                            <div className="mt-5">

                                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">

                                    <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-transparent" />

                                    <div className="p-4">

                                        <div className="mb-3 flex items-center gap-2.5">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                                                <Activity size={14} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-black text-slate-800">
                                                    Daily Attendance Trend
                                                </div>
                                                <div className="text-[10px] font-semibold text-slate-400">
                                                    Health workers present per day
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-[220px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={data.dailyTrend}>
                                                    <defs>
                                                        <linearGradient id="ulbPresentGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                                                            <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid vertical={false} stroke="#eef2f7" strokeDasharray="3 3" />
                                                    <XAxis dataKey="date" tickFormatter={(v) => formatDateOnly(v)} axisLine={false} tickLine={false} fontSize={10} />
                                                    <YAxis axisLine={false} tickLine={false} fontSize={11} allowDecimals={false} />
                                                    <Tooltip labelFormatter={(v) => formatDateOnly(String(v))} />
                                                    <Area type="monotone" dataKey="present" name="Present" stroke="#0f766e" fill="url(#ulbPresentGradient)" strokeWidth={2} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>

                                    </div>

                                </div>

                            </div>

                            {
                                data.topEmployees.length ? (

                                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">

                                        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-300 to-transparent" />

                                        <div className="p-4">

                                            <div className="mb-3 flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                                    <Trophy size={14} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-slate-800">
                                                        Top Attendance Performers
                                                    </div>
                                                    <div className="text-[10px] font-semibold text-slate-400">
                                                        Highest attendance rate health workers in range
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full min-w-[640px] border-collapse">
                                                    <thead>
                                                        <tr className="text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                            <th className="py-2 pr-3">Employee</th>
                                                            <th className="py-2 pr-3">Designation</th>
                                                            <th className="py-2 pr-3">Zone / Ward</th>
                                                            <th className="py-2 pr-3">Attendance</th>
                                                            <th className="py-2">Avg Work</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {
                                                            data.topEmployees.slice(0, 8).map((emp) => (
                                                                <tr
                                                                    key={emp.attendanceId}
                                                                    className="border-t border-slate-100 transition-colors odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/50"
                                                                >
                                                                    <td className="py-2.5 pr-3">
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">
                                                                                {emp.employeeName?.slice(0, 1).toUpperCase() || '—'}
                                                                            </div>
                                                                            <span className="text-xs font-black text-slate-800">
                                                                                {emp.employeeName}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2.5 pr-3 text-xs font-semibold text-slate-500">{emp.designation || '—'}</td>
                                                                    <td className="py-2.5 pr-3 text-xs font-semibold text-slate-500">
                                                                        {[...(emp.zones || []), ...(emp.wards || [])].slice(0, 2).join(', ') || '—'}
                                                                    </td>
                                                                    <td className="py-2.5 pr-3"><RateBar value={emp.attendanceRate} tone="emerald" /></td>
                                                                    <td className="py-2.5 text-xs font-bold text-slate-600">{formatMinutes(emp.avgWorkMinutes)}</td>
                                                                </tr>
                                                            ))
                                                        }
                                                    </tbody>
                                                </table>
                                            </div>

                                        </div>

                                    </div>

                                ) : null
                            }

                        </>

                    )
                }

            </div>

        </section>
    );
}


/* =========================================================
   WARD RANKING SNAPSHOT

   Naming matches the Ward Ranking screen's own executive
   summary stat cards (Total Wards / Ranking Completed / Top
   Ranked Wards / Average Ranked Wards / Below Average Ranked
   Wards / Ranking Pending). Ward scores are a point-in-time
   band per ward, not a daily count, so per-day averaging
   (unlike the QC and attendance cards above) doesn't apply
   here.
========================================================= */

function WardPerformanceOverview({
    summary,
    loading,
    error,
    onOpenWardRanking,
}: {
    summary: WardRankingSummaryResponse | null;
    loading: boolean;
    error: string;
    onOpenWardRanking: (status?: string) => void;
}) {

    const ranked =
        summary
            ? summary.green + summary.amber + summary.red
            : 0;

    const noData =
        summary
            ? Math.max(0, summary.totalWards - ranked)
            : 0;

    return (
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">

            <SectionHeading
                icon={Award}
                title="Ward Ranking Snapshot"
                description={
                    summary?.period
                        ? `Ranking period ${formatDateOnly(summary.period.from)} – ${formatDateOnly(summary.period.to)}`
                        : 'City-wide ward scoring across sanitation modules and staff roles.'
                }

                action={
                    <button
                        type="button"
                        onClick={() => onOpenWardRanking()}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                    >
                        Open Ward Ranking
                        <ArrowRight size={14} />
                    </button>
                }
            />

            <div className="p-5">

                {
                    loading ? (

                        <div className="flex items-center justify-center gap-3 py-14 text-sm font-bold text-slate-400">
                            <RefreshCw size={18} className="animate-spin" />
                            Loading ward ranking summary...
                        </div>

                    ) : error ? (

                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                            Ward ranking summary unavailable: {error}
                        </div>

                    ) : !summary || !summary.totalWards ? (

                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-xs font-semibold text-slate-400">
                            No ward ranking data is available for this city yet.
                        </div>

                    ) : (

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

                            <ExecutiveKpi
                                label="Total Wards"
                                value={summary.totalWards}
                                note={`${ranked} ranked`}
                                icon={Building2}
                                tone="blue"
                                onClick={() => onOpenWardRanking('ALL')}
                            />

                            <ExecutiveKpi
                                label="Ranking Completed"
                                value={ranked}
                                note="Have data to rank"
                                icon={ClipboardCheck}
                                tone="indigo"
                                onClick={() => onOpenWardRanking('RANKED')}
                            />

                            <ExecutiveKpi
                                label="Top Ranked Wards"
                                value={summary.green}
                                note="85 and above"
                                icon={Trophy}
                                tone="teal"
                                onClick={() => onOpenWardRanking('GREEN')}
                            />

                            <ExecutiveKpi
                                label="Average Ranked Wards"
                                value={summary.amber}
                                note="70 to 84.99"
                                icon={Gauge}
                                tone="gold"
                                onClick={() => onOpenWardRanking('AMBER')}
                            />

                            <ExecutiveKpi
                                label="Below Average Ranked Wards"
                                value={summary.red}
                                note="Below 70"
                                icon={AlertTriangle}
                                tone="rose"
                                onClick={() => onOpenWardRanking('RED')}
                            />

                            <ExecutiveKpi
                                label="Ranking Pending"
                                value={noData}
                                note="Awaiting data"
                                icon={Clock3}
                                tone="navy"
                                onClick={() => onOpenWardRanking('NODATA')}
                            />

                        </div>

                    )
                }

            </div>

        </section>
    );
}


/* =========================================================
   REPORTS TREND CHART
========================================================= */

function ReportsTrendChart({
    data,
}: {
    data: ReturnType<typeof buildReportsTrend>;
}) {

    return (
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">


            <h3 className="mt-1 text-lg font-black text-slate-900">
                Reports Submitted — Last 14 Days
            </h3>

            <p className="mt-1 text-xs font-medium text-slate-500">
                Daily volume of QC-processed reports across all sanitation modules.
            </p>

            <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <defs>
                            <linearGradient id="ulbTotalReportsGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#eef2f7" strokeDasharray="3 3" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={11} />
                        <YAxis axisLine={false} tickLine={false} fontSize={11} allowDecimals={false} />
                        <Tooltip />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            height={28}
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
                        />
                        <Area type="monotone" dataKey="total" name="Total" stroke="#2563eb" fill="url(#ulbTotalReportsGradient)" strokeWidth={2.5} />
                        <Line type="monotone" dataKey="TOILET" name="Cleanliness of Toilets" stroke="#0f766e" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="SWEEPING" name="Sweeping" stroke="#7c3aed" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="LITTERBINS" name="Litter Bins" stroke="#d97706" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
}


/* =========================================================
   PERFORMANCE LEADERBOARD CARD
   (reused for Zone, Ward and Module breakdowns)

   Rows are ordered by QC approval rate, highest first, so the
   best-performing zones/wards/modules surface at the top of
   the card.
========================================================= */

const LEADERBOARD_TONES: Record<string, { bg: string; text: string; gradient: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', gradient: 'from-blue-500 via-indigo-400 to-transparent' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', gradient: 'from-cyan-500 via-sky-400 to-transparent' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', gradient: 'from-indigo-500 via-violet-400 to-transparent' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', gradient: 'from-teal-500 via-emerald-400 to-transparent' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', gradient: 'from-amber-500 via-orange-400 to-transparent' },
};

function PerformanceLeaderboardCard({
    icon: Icon,
    tone = 'blue',
    title,
    description,
    rows,
    emptyMessage,
    scroll,
}: {
    icon: any;
    tone?: string;
    title: string;
    description: string;
    rows: LeaderboardRow[];
    emptyMessage: string;
    scroll?: boolean;
}) {

    const sorted =
        useMemo(
            () =>
                [...rows].sort((a, b) => {
                    const rateA = approvalRateOf(a);
                    const rateB = approvalRateOf(b);

                    if (rateA === null && rateB === null) return b.total - a.total;
                    if (rateA === null) return 1;
                    if (rateB === null) return -1;

                    return rateB - rateA;
                }),
            [rows]
        );

    const toneColors = LEADERBOARD_TONES[tone] || LEADERBOARD_TONES.blue;

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className={`h-1 w-full bg-gradient-to-r ${toneColors.gradient}`} />

            <div className="p-5 sm:p-6">

            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneColors.bg} ${toneColors.text}`}>
                <Icon size={16} />
            </div>

            <h3 className="mt-3 text-lg font-black text-slate-900">
                {title}
            </h3>

            <p className="mt-1 text-xs font-medium text-slate-500">
                {description}
            </p>

            <p className="mt-1 text-[10px] font-medium leading-4 text-slate-400">
                Approval % = approved ÷ (approved + rejected), so pending/action rows don't skew it. Action % = action taken ÷ (action required + action taken).
            </p>

            {
                sorted.length === 0 ? (

                    <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-xs font-semibold text-slate-400">
                        {emptyMessage}
                    </div>

                ) : (

                    <div className={`mt-4 space-y-2.5 ${scroll ? 'max-h-[420px] overflow-y-auto pr-1' : ''}`}>
                        {
                            sorted.map((row, index) => {
                                const rate = approvalRateOf(row);
                                const closure = closureRateOf(row);
                                const hasRate = rate !== null;
                                const band = scoreBandFor(rate ?? 0);
                                const pending = pendingOf(row);

                                const breakdown = [
                                    `${row.approved} approved`,
                                    `${row.rejected} rejected`,
                                ];

                                if (row.actionRequired > 0) breakdown.push(`${row.actionRequired} action req.`);
                                if (row.actionTaken > 0) breakdown.push(`${row.actionTaken} action taken`);
                                if (pending > 0) breakdown.push(`${pending} pending`);

                                return (
                                    <div
                                        key={row.key}
                                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-3"
                                    >

                                        <div
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ring-1 ${hasRate
                                                ? `${band.bg} ${band.text} ${band.ring}`
                                                : 'bg-slate-100 text-slate-400 ring-slate-200'
                                                }`}
                                        >
                                            {index + 1}
                                        </div>

                                        <div className="min-w-0 flex-1">

                                            <div className="truncate text-[11px] font-black text-slate-800">
                                                {row.label}
                                            </div>

                                            <div className="mt-0.5 text-[9px] font-bold leading-4 text-slate-400">
                                                {row.total} report{row.total === 1 ? '' : 's'} · {breakdown.join(' · ')}
                                            </div>

                                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${hasRate ? band.bar : 'bg-slate-300'}`}
                                                    style={{
                                                        width: hasRate
                                                            ? `${Math.min(100, Math.max(0, rate as number))}%`
                                                            : '0%',
                                                    }}
                                                />
                                            </div>

                                        </div>

                                        <div className="flex shrink-0 flex-col items-end gap-1">

                                            <span
                                                className={`rounded-lg px-2 py-1 text-[10px] font-black ${hasRate
                                                    ? `${band.bg} ${band.text}`
                                                    : 'bg-slate-100 text-slate-500'
                                                    }`}
                                            >
                                                {hasRate ? `${rate}%` : 'N/A'}
                                            </span>

                                            {
                                                closure !== null ? (
                                                    <span className="text-[8px] font-bold text-slate-400">
                                                        {closure}% action
                                                    </span>
                                                ) : null
                                            }

                                        </div>

                                    </div>
                                );
                            })
                        }
                    </div>

                )
            }

            </div>

        </div>
    );
}


/* =========================================================
   PEOPLE PERFORMANCE LEADERBOARD
   (employee, supervisor, QC, action officer)
========================================================= */

function PeopleLeaderboardCard({
    icon: Icon,
    tone = 'blue',
    title,
    rows,
    rateType,
    emptyMessage,
    note,
}: {
    icon: any;
    tone?: string;
    title: string;
    rows: LeaderboardRow[];
    rateType: 'approval' | 'closure';
    emptyMessage: string;
    note?: string;
}) {

    const toneColors = LEADERBOARD_TONES[tone] || LEADERBOARD_TONES.blue;

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            <div className={`h-1 w-full bg-gradient-to-r ${toneColors.gradient}`} />

            <div className="p-5">

            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneColors.bg} ${toneColors.text}`}>
                <Icon size={15} />
            </div>

            <h3 className="mt-2.5 text-base font-black text-slate-900">
                {title}
            </h3>

            {
                note ? (
                    <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-400">
                        {note}
                    </p>
                ) : null
            }

            {
                rows.length === 0 ? (

                    <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs font-semibold text-slate-400">
                        {emptyMessage}
                    </div>

                ) : (

                    <div className="mt-4 space-y-2">
                        {
                            rows.map((row, index) => {
                                const rate =
                                    rateType === 'approval'
                                        ? approvalRateOf(row)
                                        : closureRateOf(row);

                                const hasRate = rate !== null;
                                const band = scoreBandFor(rate ?? 0);

                                return (
                                    <div key={row.key} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">

                                        <div
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ring-1 ${hasRate
                                                ? `${band.bg} ${band.text} ${band.ring}`
                                                : 'border border-slate-200 bg-white text-slate-500 ring-slate-100'
                                                }`}
                                        >
                                            {index + 1}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-xs font-black text-slate-800">{row.label}</div>
                                            <div className="text-[10px] font-semibold text-slate-400">
                                                {row.total} report{row.total === 1 ? '' : 's'}
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <div className={`text-xs font-black ${hasRate ? band.text : 'text-slate-400'}`}>
                                                {hasRate ? `${rate}%` : '—'}
                                            </div>
                                            <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                                                {rateType === 'approval' ? 'approval' : 'action'}
                                            </div>
                                        </div>

                                    </div>
                                );
                            })
                        }
                    </div>

                )
            }

            </div>

        </div>
    );
}


/* =========================================================
   RECORD TABLE
========================================================= */

function RecordsTable({
    records,
    loading,
    onView,
    onActionRequired,
    emptyMessage,
}: {
    records:
    DashboardRecord[];

    loading:
    boolean;

    onView:
    (
        item:
            DashboardRecord
    ) => void;

    onActionRequired:
    (
        item:
            DashboardRecord
    ) => void;

    emptyMessage:
    string;
}) {

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-3 px-6 py-14 text-sm font-bold text-slate-400">

                <RefreshCw
                    size={18}
                    className="animate-spin"
                />

                Loading reports...

            </div>
        );
    }


    if (
        !records.length
    ) {
        return (
            <div className="px-6 py-14 text-center text-sm font-semibold text-slate-400">
                {emptyMessage}
            </div>
        );
    }


    return (
        <div className="overflow-x-auto">

            <table className="w-full min-w-[1040px]">

                <thead>

                    <tr className="bg-slate-50/80 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">

                        <th className="px-5 py-3">
                            Report
                        </th>

                        <th className="px-4 py-3">
                            Module
                        </th>

                        <th className="px-4 py-3">
                            Zone / Ward
                        </th>

                        <th className="px-4 py-3">
                            Status
                        </th>

                        <th className="px-4 py-3">
                            Note
                        </th>

                        <th className="px-4 py-3">
                            Updated
                        </th>

                        <th className="px-5 py-3 text-right">
                            Action
                        </th>

                    </tr>

                </thead>


                <tbody>

                    {
                        records.map(
                            (
                                record
                            ) => {

                                const moduleKey =
                                    record
                                        .dashboardModule as
                                    ModuleKey;


                                const status =
                                    effectiveStatus(
                                        record
                                    );


                                const ulbInstruction =
                                    getActionRequiredRemark(
                                        record,
                                        moduleKey
                                    );


                                const aoResponse =
                                    getActionTakenRemark(
                                        record,
                                        moduleKey
                                    );


                                const canEscalate =
                                    status ===
                                    'APPROVED' ||
                                    status ===
                                    'REJECTED';


                                return (
                                    <tr
                                        key={`${moduleKey}-${record.type || 'RECORD'}-${record.id}`}

                                        className="border-t border-slate-100 align-top transition hover:bg-blue-50/20"
                                    >

                                        {/* REPORT */}

                                        <td className="px-5 py-4">

                                            <div className="max-w-[280px] font-black text-slate-800">

                                                {
                                                    recordTitle(
                                                        record,
                                                        moduleKey
                                                    )
                                                }

                                            </div>


                                            <div className="mt-1 max-w-[300px] truncate text-xs font-medium text-slate-400">

                                                {
                                                    recordArea(
                                                        record
                                                    )
                                                }

                                            </div>


                                            <div className="mt-1 text-[10px] font-semibold text-slate-400">

                                                Submitted by:{' '}

                                                {
                                                    submittedByName(
                                                        record
                                                    )
                                                }

                                            </div>

                                        </td>


                                        {/* MODULE */}

                                        <td className="px-4 py-4 text-xs font-bold text-slate-600">

                                            {
                                                moduleShortLabel(
                                                    moduleKey
                                                )
                                            }

                                        </td>


                                        {/* LOCATION */}

                                        <td className="px-4 py-4">

                                            <div className="text-xs font-bold text-slate-700">

                                                {
                                                    record
                                                        .zoneName ||

                                                    record
                                                        .bin
                                                        ?.zoneName ||

                                                    '—'
                                                }

                                            </div>


                                            <div className="mt-1 text-[11px] font-medium text-slate-400">

                                                {
                                                    record
                                                        .wardName ||

                                                    record
                                                        .bin
                                                        ?.wardName ||

                                                    '—'
                                                }

                                            </div>

                                        </td>


                                        {/* STATUS */}

                                        <td className="px-4 py-4">

                                            <span
                                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusBadge(
                                                    status
                                                )}`}
                                            >

                                                {
                                                    status.replace(
                                                        /_/g,
                                                        ' '
                                                    )
                                                }

                                            </span>

                                        </td>


                                        {/* WORKFLOW NOTE */}

                                        <td className="px-4 py-4">

                                            <div className="max-w-[250px] text-xs font-semibold leading-5 text-slate-600">

                                                {
                                                    status ===
                                                        'ACTION_TAKEN' &&
                                                        aoResponse

                                                        ? aoResponse

                                                        : ulbInstruction ||
                                                        getQcRemark(
                                                            record
                                                        ) ||
                                                        '—'
                                                }

                                            </div>

                                        </td>


                                        {/* DATE */}

                                        <td className="px-4 py-4 text-xs font-semibold text-slate-500">

                                            {
                                                formatDate(
                                                    recordDate(
                                                        record
                                                    )
                                                )
                                            }

                                        </td>


                                        {/* ACTIONS */}

                                        <td className="px-5 py-4">

                                            <div className="flex justify-end gap-2">

                                                <button
                                                    type="button"

                                                    onClick={() =>
                                                        onView(
                                                            record
                                                        )
                                                    }

                                                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                >

                                                    <Eye
                                                        size={14}
                                                    />

                                                    View

                                                </button>


                                                {
                                                    canEscalate
                                                        ? (

                                                            <button
                                                                type="button"

                                                                onClick={() =>
                                                                    onActionRequired(
                                                                        record
                                                                    )
                                                                }

                                                                className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-black text-white transition hover:bg-blue-800"
                                                            >

                                                                <AlertTriangle
                                                                    size={14}
                                                                />

                                                                Action Required

                                                            </button>

                                                        )
                                                        : null
                                                }

                                            </div>

                                        </td>

                                    </tr>
                                );
                            }
                        )
                    }

                </tbody>

            </table>

        </div>
    );
}


/* =========================================================
   REPORT DETAIL MODAL
========================================================= */

function ReportDetailModal({
    item,
    loading,
    onClose,
    onActionRequired,
    onImagePreview,
}: {
    item:
    DashboardRecord | null;

    loading:
    boolean;

    onClose:
    () => void;

    onActionRequired:
    (
        item:
            DashboardRecord
    ) => void;

    onImagePreview:
    (
        uri:
            string
    ) => void;
}) {

    if (!item) {
        return null;
    }


    const moduleKey =
        item
            .dashboardModule as
        ModuleKey;


    const status =
        effectiveStatus(
            item
        );


    /*
     * THIS IS WHAT MAKES
     * QUESTION + RESPONSE + IMAGE
     * VISIBLE.
     */
    const answers =
        extractAnswers(
            item
        );


    const extraImages =
        collectTopLevelImages(
            item
        );


    const instruction =
        getActionRequiredRemark(
            item,
            moduleKey
        );


    const actionTaken =
        getActionTakenRemark(
            item,
            moduleKey
        );


    const reviewRemark =
        getQcRemark(
            item
        );


    const canEscalate =
        status ===
        'APPROVED' ||
        status ===
        'REJECTED';


    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">

            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[26px] border border-white/40 bg-white shadow-2xl">


                {/* =============================================
            HEADER
        ============================================= */}

                <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">

                    <div>

                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">

                            {
                                moduleLabel(
                                    moduleKey
                                )
                            }

                        </div>


                        <h2 className="mt-1 text-xl font-black text-slate-900">

                            {
                                recordTitle(
                                    item,
                                    moduleKey
                                )
                            }

                        </h2>


                        <div className="mt-2 flex flex-wrap items-center gap-2">

                            <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusBadge(
                                    status
                                )}`}
                            >

                                {
                                    status.replace(
                                        /_/g,
                                        ' '
                                    )
                                }

                            </span>


                            <span className="text-xs font-semibold text-slate-400">

                                {
                                    formatDate(
                                        recordDate(
                                            item
                                        )
                                    )
                                }

                            </span>

                        </div>

                    </div>


                    <button
                        type="button"

                        onClick={
                            onClose
                        }

                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"
                    >

                        <X
                            size={18}
                        />

                    </button>

                </div>


                {/* =============================================
            BODY
        ============================================= */}

                <div className="overflow-y-auto p-5 sm:p-6">


                    {
                        loading
                            ? (

                                <div className="mb-5 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700">

                                    <RefreshCw
                                        size={15}

                                        className="animate-spin"
                                    />

                                    Loading complete inspection details...

                                </div>

                            )
                            : null
                    }


                    {/* =========================================
              BASIC DETAILS
          ========================================= */}

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                        <DetailMeta
                            label="Submitted By"

                            value={
                                submittedByName(
                                    item
                                )
                            }
                        />


                        <DetailMeta
                            label="Zone"

                            value={
                                item
                                    .zoneName ||

                                item
                                    .bin
                                    ?.zoneName ||

                                '—'
                            }
                        />


                        <DetailMeta
                            label="Ward"

                            value={
                                item
                                    .wardName ||

                                item
                                    .bin
                                    ?.wardName ||

                                '—'
                            }
                        />


                        <DetailMeta
                            label="Area / Location"

                            value={
                                recordArea(
                                    item
                                )
                            }
                        />

                    </div>


                    {/* =========================================
              QC REMARK
          ========================================= */}

                    {
                        reviewRemark
                            ? (

                                <RemarkPanel
                                    label="QC REMARK"

                                    value={
                                        reviewRemark
                                    }

                                    tone="slate"
                                />

                            )
                            : null
                    }


                    {/* =========================================
              ORIGINAL ULB INSTRUCTION
          ========================================= */}

                    {
                        instruction
                            ? (

                                <RemarkPanel
                                    label="ULB ACTION REQUIRED INSTRUCTION"

                                    value={
                                        instruction
                                    }

                                    tone="amber"
                                />

                            )
                            : null
                    }


                    {/* =========================================
              AO RESPONSE
          ========================================= */}

                    {
                        actionTaken
                            ? (

                                <RemarkPanel
                                    label="ACTION OFFICER RESPONSE"

                                    value={
                                        actionTaken
                                    }

                                    tone="blue"
                                />

                            )
                            : null
                    }


                    {/* =========================================
              QUESTIONS / ANSWERS / IMAGES
          ========================================= */}

                    {
                        answers.length
                            ? (

                                <section className="mt-6">

                                    <div className="mb-3 flex items-center gap-2">

                                        <ClipboardCheck
                                            size={17}

                                            className="text-blue-700"
                                        />


                                        <div>

                                            <h3 className="text-sm font-black text-slate-900">
                                                Inspection Questions & Submitted Responses
                                            </h3>


                                            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                                                Every available question, response and uploaded question evidence is shown below.
                                            </p>

                                        </div>

                                    </div>


                                    <div className="space-y-3">

                                        {
                                            answers.map(
                                                (
                                                    row,
                                                    index
                                                ) => (

                                                    <div
                                                        key={`${row.question}-${index}`}

                                                        className="rounded-2xl border border-slate-200 bg-white p-4"
                                                    >

                                                        <div className="flex items-start gap-3">


                                                            {/* QUESTION NUMBER */}

                                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-black text-blue-700">

                                                                {
                                                                    index +
                                                                    1
                                                                }

                                                            </div>


                                                            <div className="min-w-0 flex-1">


                                                                {/* SECTION */}

                                                                {
                                                                    row.section
                                                                        ? (

                                                                            <div className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">

                                                                                {
                                                                                    row.section
                                                                                }

                                                                            </div>

                                                                        )
                                                                        : null
                                                                }


                                                                {/* QUESTION */}

                                                                <div className="text-sm font-black leading-5 text-slate-800">

                                                                    {
                                                                        row.question
                                                                    }

                                                                </div>


                                                                {/* RESPONSE */}

                                                                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">

                                                                    <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                                                                        Response
                                                                    </div>


                                                                    <div className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-5 text-slate-700">

                                                                        {
                                                                            row.answer
                                                                        }

                                                                    </div>

                                                                </div>


                                                                {/* =============================
                                    QUESTION IMAGES
                                ============================= */}

                                                                {
                                                                    row
                                                                        .photos
                                                                        .length
                                                                        ? (

                                                                            <div className="mt-3">

                                                                                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">

                                                                                    <ImageIcon
                                                                                        size={13}
                                                                                    />

                                                                                    Uploaded Evidence

                                                                                </div>


                                                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">

                                                                                    {
                                                                                        row.photos.map(
                                                                                            (
                                                                                                photo,
                                                                                                photoIndex
                                                                                            ) => (

                                                                                                <button
                                                                                                    type="button"

                                                                                                    key={`${photoIndex}-${photo.slice(
                                                                                                        0,
                                                                                                        28
                                                                                                    )}`}

                                                                                                    onClick={() =>
                                                                                                        onImagePreview(
                                                                                                            photo
                                                                                                        )
                                                                                                    }

                                                                                                    className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-left"
                                                                                                >

                                                                                                    <img
                                                                                                        src={
                                                                                                            photo
                                                                                                        }

                                                                                                        alt={`Question ${index +
                                                                                                            1
                                                                                                            } evidence ${photoIndex +
                                                                                                            1
                                                                                                            }`}

                                                                                                        className="h-36 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                                                                                                    />

                                                                                                </button>

                                                                                            )
                                                                                        )
                                                                                    }

                                                                                </div>

                                                                            </div>

                                                                        )
                                                                        : (

                                                                            <div className="mt-3 text-[10px] font-semibold text-slate-400">
                                                                                No image was uploaded for this question.
                                                                            </div>

                                                                        )
                                                                }

                                                            </div>

                                                        </div>

                                                    </div>

                                                )
                                            )
                                        }

                                    </div>

                                </section>

                            )
                            : (

                                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-400">
                                    No question/response snapshot was returned for this report.
                                </div>

                            )
                    }


                    {/* =========================================
              TOP LEVEL EVIDENCE
          ========================================= */}

                    {
                        extraImages.length
                            ? (

                                <section className="mt-6">

                                    <h3 className="text-sm font-black text-slate-900">
                                        Additional Report Evidence
                                    </h3>


                                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">

                                        {
                                            extraImages.map(
                                                (
                                                    photo,
                                                    index
                                                ) => (

                                                    <button
                                                        type="button"

                                                        key={`${index}-${photo.slice(
                                                            0,
                                                            28
                                                        )}`}

                                                        onClick={() =>
                                                            onImagePreview(
                                                                photo
                                                            )
                                                        }

                                                        className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                                                    >

                                                        <img
                                                            src={
                                                                photo
                                                            }

                                                            alt={`Report evidence ${index +
                                                                1
                                                                }`}

                                                            className="h-36 w-full object-cover"
                                                        />

                                                    </button>

                                                )
                                            )
                                        }

                                    </div>

                                </section>

                            )
                            : null
                    }

                </div>


                {/* =============================================
            FOOTER
        ============================================= */}

                <div className="flex flex-col gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">

                    <button
                        type="button"

                        onClick={
                            onClose
                        }

                        className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                    >

                        Close

                    </button>


                    {
                        canEscalate
                            ? (

                                <button
                                    type="button"

                                    onClick={() => {
                                        onClose();

                                        onActionRequired(
                                            item
                                        );
                                    }}

                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-blue-800"
                                >

                                    <AlertTriangle
                                        size={15}
                                    />

                                    Mark Action Required

                                </button>

                            )
                            : null
                    }

                </div>

            </div>

        </div>
    );
}


/* =========================================================
   DETAIL META
========================================================= */

function DetailMeta({
    label,
    value,
}: {
    label:
    string;

    value:
    any;
}) {

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">

            <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                {label}
            </div>


            <div className="mt-1 text-xs font-bold leading-5 text-slate-700">

                {
                    value ||
                    '—'
                }

            </div>

        </div>
    );
}


/* =========================================================
   REMARK PANEL
========================================================= */

function RemarkPanel({
    label,
    value,
    tone,
}: {
    label:
    string;

    value:
    string;

    tone:
    | 'slate'
    | 'amber'
    | 'blue';
}) {

    const className =
        tone ===
            'amber'

            ? (
                'border-amber-200 ' +
                'bg-amber-50 ' +
                'text-amber-900'
            )

            : tone ===
                'blue'

                ? (
                    'border-blue-200 ' +
                    'bg-blue-50 ' +
                    'text-blue-900'
                )

                : (
                    'border-slate-200 ' +
                    'bg-slate-50 ' +
                    'text-slate-700'
                );


    return (
        <div
            className={`mt-4 rounded-2xl border p-4 ${className}`}
        >

            <div className="text-[9px] font-black uppercase tracking-[0.14em] opacity-70">
                {label}
            </div>


            <div className="mt-1 whitespace-pre-wrap text-sm font-bold leading-6">
                {value}
            </div>

        </div>
    );
}


/* =========================================================
   ACTION REQUIRED MODAL
========================================================= */

function ActionRequiredModal({
    item,
    remark,
    setRemark,
    submitting,
    onClose,
    onSubmit,
}: {
    item:
    DashboardRecord | null;

    remark:
    string;

    setRemark:
    (
        value:
            string
    ) => void;

    submitting:
    boolean;

    onClose:
    () => void;

    onSubmit:
    () => void;
}) {

    if (!item) {
        return null;
    }


    const moduleKey =
        item
            .dashboardModule as
        ModuleKey;


    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

            <div className="w-full max-w-lg rounded-[24px] border border-white/30 bg-white p-5 shadow-2xl sm:p-6">

                <div className="flex items-start justify-between gap-4">

                    <div>

                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
                            Action Required Instruction
                        </div>


                        <h3 className="mt-1 text-lg font-black text-slate-900">
                            Send to Action Officer
                        </h3>


                        <p className="mt-2 text-xs font-medium leading-5 text-slate-500">

                            {
                                recordTitle(
                                    item,
                                    moduleKey
                                )
                            }

                            {' • '}

                            {
                                moduleShortLabel(
                                    moduleKey
                                )
                            }

                        </p>

                    </div>


                    <button
                        type="button"

                        onClick={
                            onClose
                        }

                        disabled={
                            submitting
                        }

                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 disabled:opacity-50"
                    >

                        <X
                            size={17}
                        />

                    </button>

                </div>


                <label className="mt-5 block">

                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                        What needs to be corrected?
                    </span>


                    <textarea
                        value={
                            remark
                        }

                        onChange={(
                            event
                        ) =>
                            setRemark(
                                event
                                    .target
                                    .value
                            )
                        }

                        placeholder="Write a clear instruction for the Action Officer..."

                        rows={5}

                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                    />

                </label>


                <div className="mt-5 flex justify-end gap-2">

                    <button
                        type="button"

                        onClick={
                            onClose
                        }

                        disabled={
                            submitting
                        }

                        className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-600 disabled:opacity-50"
                    >

                        Cancel

                    </button>


                    <button
                        type="button"

                        onClick={
                            onSubmit
                        }

                        disabled={
                            submitting ||
                            !remark.trim()
                        }

                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                        {
                            submitting
                                ? (

                                    <RefreshCw
                                        size={15}
                                        className="animate-spin"
                                    />

                                )
                                : (

                                    <AlertTriangle
                                        size={15}
                                    />

                                )
                        }


                        {
                            submitting
                                ? 'Sending...'
                                : 'Send Action Required'
                        }

                    </button>

                </div>

            </div>

        </div>
    );
}


/* =========================================================
   FULL IMAGE PREVIEW
========================================================= */

function ImagePreviewModal({
    uri,
    onClose,
}: {
    uri:
    string | null;

    onClose:
    () => void;
}) {

    if (!uri) {
        return null;
    }


    return (
        <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/90 p-4"

            onClick={
                onClose
            }
        >

            <button
                type="button"

                onClick={
                    onClose
                }

                className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-md"
            >

                <X
                    size={20}
                />

            </button>


            <img
                src={
                    uri
                }

                alt="Evidence preview"

                className="max-h-[90vh] max-w-[94vw] rounded-2xl object-contain shadow-2xl"

                onClick={(
                    event
                ) =>
                    event
                        .stopPropagation()
                }
            />

        </div>
    );
}


/* =========================================================
   UNIFIED FILTER BAR (OUTSIDE HEADER)
========================================================= */

function UnifiedFilterBar({
    moduleFilter,
    setModuleFilter,
    selectedZone,
    setSelectedZone,
    availableZones,
    selectedWard,
    setSelectedWard,
    availableWards,
    search,
    setSearch,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    appliedFromDate,
    appliedToDate,
    onApplyDateFilter,
    onClearFilters,
}: any) {
    const [openDatePopover, setOpenDatePopover] = useState(false);
    const [customMode, setCustomMode] = useState<'SINGLE' | 'RANGE'>('RANGE');
    const [presetName, setPresetName] = useState<string>(
        /*
         * The dashboard now lands with "This Month" pre-applied
         * (see defaultDashboardDateRange), so if a range is
         * already applied on first mount, label it as such
         * instead of falling back to a raw date range.
         */
        () => (appliedFromDate || appliedToDate) ? 'This Month' : 'All Time'
    );

    const formatDateYYYYMMDD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleSelectPreset = (preset: 'TODAY' | 'YESTERDAY' | 'WEEKLY' | 'MONTHLY' | 'ALL') => {
        const now = new Date();
        if (preset === 'TODAY') {
            const todayStr = formatDateYYYYMMDD(now);
            setFromDate(todayStr);
            setToDate(todayStr);
            setPresetName('Today');
            if (onApplyDateFilter) onApplyDateFilter(todayStr, todayStr);
        } else if (preset === 'YESTERDAY') {
            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            const yStr = formatDateYYYYMMDD(y);
            setFromDate(yStr);
            setToDate(yStr);
            setPresetName('Yesterday');
            if (onApplyDateFilter) onApplyDateFilter(yStr, yStr);
        } else if (preset === 'WEEKLY') {
            const w = new Date(now);
            w.setDate(w.getDate() - 7);
            const wStr = formatDateYYYYMMDD(w);
            const todayStr = formatDateYYYYMMDD(now);
            setFromDate(wStr);
            setToDate(todayStr);
            setPresetName('This Week');
            if (onApplyDateFilter) onApplyDateFilter(wStr, todayStr);
        } else if (preset === 'MONTHLY') {
            const m = new Date(now);
            m.setDate(m.getDate() - 30);
            const mStr = formatDateYYYYMMDD(m);
            const todayStr = formatDateYYYYMMDD(now);
            setFromDate(mStr);
            setToDate(todayStr);
            setPresetName('This Month');
            if (onApplyDateFilter) onApplyDateFilter(mStr, todayStr);
        } else if (preset === 'ALL') {
            setFromDate('');
            setToDate('');
            setPresetName('All Time');
            if (onApplyDateFilter) onApplyDateFilter('', '');
        }
        setOpenDatePopover(false);
    };

    const getDateLabel = () => {
        if (!appliedFromDate && !appliedToDate) return 'Date Filter';
        if (presetName && presetName !== 'All Time') return presetName;
        if (appliedFromDate && appliedToDate && appliedFromDate === appliedToDate) return appliedFromDate;
        if (appliedFromDate || appliedToDate) return `${appliedFromDate || 'Start'} → ${appliedToDate || 'Today'}`;
        return 'Date Filter';
    };

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[1.1fr_1.1fr_1.1fr_1.4fr_auto_auto] items-center">

                {/* 1. MODULE FILTER */}
                <select
                    value={moduleFilter}
                    onChange={(e) => setModuleFilter(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 cursor-pointer shadow-2xs"
                >
                    <option value="ALL">All Modules</option>
                    {MODULES.map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                </select>

                {/* 2. ZONE FILTER */}
                <select
                    value={selectedZone}
                    onChange={(e) => {
                        setSelectedZone(e.target.value);
                        setSelectedWard('ALL');
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 cursor-pointer shadow-2xs"
                >
                    <option value="ALL">All Zones ({availableZones.length})</option>
                    {availableZones.map((z: string) => (
                        <option key={z} value={z}>{z}</option>
                    ))}
                </select>

                {/* 3. WARD FILTER */}
                <select
                    value={selectedWard}
                    onChange={(e) => setSelectedWard(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 cursor-pointer shadow-2xs"
                >
                    <option value="ALL">All Wards ({availableWards.length})</option>
                    {availableWards.map((w: string) => (
                        <option key={w} value={w}>{w}</option>
                    ))}
                </select>

                {/* 4. SEARCH INPUT */}
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search location, ward, employee..."
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400 shadow-2xs"
                    />
                </div>

                {/* 5. SLEEK CALENDAR PRESET POPOVER */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setOpenDatePopover(!openDatePopover)}
                        className={`flex h-10 items-center justify-between gap-2.5 rounded-xl border px-3 text-xs font-bold transition cursor-pointer shadow-2xs whitespace-nowrap ${appliedFromDate || appliedToDate
                            ? 'border-blue-300 bg-blue-50/80 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                    >
                        <span className="flex items-center gap-1.5">
                            <CalendarDays size={15} className={appliedFromDate || appliedToDate ? 'text-blue-600' : 'text-slate-500'} />
                            <span>{getDateLabel()}</span>
                        </span>
                        <ChevronDown size={14} className="text-slate-400" />
                    </button>

                    {openDatePopover && (
                        <div className="absolute right-0 sm:right-auto sm:left-0 top-12 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl transition-all">
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                                Quick Date Presets
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 mb-3">
                                <button
                                    type="button"
                                    onClick={() => handleSelectPreset('TODAY')}
                                    className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 cursor-pointer"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSelectPreset('YESTERDAY')}
                                    className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 cursor-pointer"
                                >
                                    Yesterday
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSelectPreset('WEEKLY')}
                                    className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 cursor-pointer"
                                >
                                    This Week
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSelectPreset('MONTHLY')}
                                    className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 cursor-pointer"
                                >
                                    This Month
                                </button>
                            </div>

                            <div className="border-t border-slate-100 pt-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                        Custom Date
                                    </span>
                                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-bold">
                                        <button
                                            type="button"
                                            onClick={() => setCustomMode('SINGLE')}
                                            className={`px-2 py-0.5 rounded-md transition cursor-pointer ${customMode === 'SINGLE' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            Single
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCustomMode('RANGE')}
                                            className={`px-2 py-0.5 rounded-md transition cursor-pointer ${customMode === 'RANGE' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            Range
                                        </button>
                                    </div>
                                </div>

                                {customMode === 'SINGLE' ? (
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Select Date</label>
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => {
                                                setFromDate(e.target.value);
                                                setToDate(e.target.value);
                                            }}
                                            className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-400"
                                        />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase">From</label>
                                            <input
                                                type="date"
                                                value={fromDate}
                                                onChange={(e) => setFromDate(e.target.value)}
                                                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase">To</label>
                                            <input
                                                type="date"
                                                value={toDate}
                                                onChange={(e) => setToDate(e.target.value)}
                                                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-400"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectPreset('ALL')}
                                        className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                                    >
                                        Reset Date
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPresetName('Custom');
                                            if (onApplyDateFilter) onApplyDateFilter(fromDate, toDate);
                                            setOpenDatePopover(false);
                                        }}
                                        className="inline-flex h-8 items-center gap-1 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-800 cursor-pointer shadow-2xs active:scale-95"
                                    >
                                        <Filter size={12} />
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 6. CLEAR ALL */}
                <button
                    type="button"
                    onClick={() => {
                        setPresetName('All Time');
                        onClearFilters();
                    }}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                >
                    <X size={14} />
                    Clear
                </button>

            </div>

            {/* ACTIVE FILTER BADGES */}
            {(moduleFilter !== 'ALL' || selectedZone !== 'ALL' || selectedWard !== 'ALL' || search || appliedFromDate || appliedToDate) && (
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs font-semibold text-slate-500">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-700">Active Filters:</span>
                        {moduleFilter !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                                Module: {moduleFilter}
                            </span>
                        )}
                        {selectedZone !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] font-bold text-cyan-700 border border-cyan-200">
                                Zone: {selectedZone}
                            </span>
                        )}
                        {selectedWard !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                Ward: {selectedWard}
                            </span>
                        )}
                        {search && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200">
                                Search: "{search}"
                            </span>
                        )}
                        {(appliedFromDate || appliedToDate) && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                                Date: {getDateLabel()} ({appliedFromDate || 'Start'} → {appliedToDate || 'Today'})
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setPresetName('All Time');
                            onClearFilters();
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                        Reset All
                    </button>
                </div>
            )}
        </section>
    );
}
