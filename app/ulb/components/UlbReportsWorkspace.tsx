'use client';

import {
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
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ClipboardCheck,
    Clock3,
    Eye,
    FileCheck2,
    Filter,
    Image as ImageIcon,
    Layers3,
    MapPin,
    RefreshCw,
    Search,
    ShieldCheck,
    Sparkles,
    TimerReset,
    TrendingUp,
    Trophy,
    UserCheck,
    UserRoundX,
    UsersRound,
    Wrench,
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

import {
    AttendanceApi,
    type AttendanceDashboardResponse,
} from '@lib/attendanceApi';


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
            'Review QC-approved reports. If corrective work is still required, send the report to the mapped Action Officer with a clear instruction.',

        status:
            'APPROVED',

        badgeClass:
            'border-emerald-200 bg-emerald-50 text-emerald-700',
    },

    REJECTED: {
        title:
            'QC Rejected Reports',

        description:
            'Review QC-rejected reports and escalate only the cases that require municipal corrective action.',

        status:
            'REJECTED',

        badgeClass:
            'border-rose-200 bg-rose-50 text-rose-700',
    },

    ACTION_REQUIRED: {
        title:
            'Corrective Actions Pending',

        description:
            'Track reports already sent to Action Officers. The original ULB instruction remains visible while corrective work is pending.',

        status:
            'ACTION_REQUIRED',

        badgeClass:
            'border-amber-200 bg-amber-50 text-amber-700',
    },

    ACTION_TAKEN: {
        title:
            'Action Taken History',

        description:
            'Review completed corrective-action cases with the original ULB instruction, Action Officer response and submitted evidence.',

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
    return (
        item?.actionTakenAt ||
        item?.actionOfficerRespondedAt ||
        item?.reviewedAt ||
        item?.qcReviewedAt ||
        item?.updatedAt ||
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
    const uri =
        String(
            value || ''
        );


    return (
        uri.startsWith(
            'http://'
        ) ||
        uri.startsWith(
            'https://'
        ) ||
        uri.startsWith(
            'data:image/'
        ) ||
        uri.startsWith(
            'file://'
        ) ||
        uri.startsWith(
            '/uploads/'
        ) ||
        uri.startsWith(
            '/media/'
        )
    );
}


function normalizeImages(
    values: any[]
) {
    return Array.from(
        new Set(
            values
                .flatMap(
                    (value) =>
                        Array.isArray(
                            value
                        )
                            ? value
                            : [value]
                )
                .filter(Boolean)
                .map(String)
                .filter(
                    isRenderableImage
                )
        )
    );
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

        item?.payload?.photos,
        item?.payload?.photoUrls,
        item?.payload?.aoPhoto,
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

function employeeIdentity(item: any) {
    return item?.employee?.name || null;
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
        /*
         * Litter Bin records only carry actionOfficerId
         * (no joined name from the API today), so the
         * officer is identified by a short id badge
         * rather than a fabricated name.
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
     * Sweeping records carry no relational Action Officer
     * identity at all (only a free-text remark).
     */
    return null;
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
        });
    }

    records.forEach((item) => {
        const raw = recordDate(item);
        if (!raw) return;

        const key = new Date(raw).toISOString().slice(0, 10);
        const bucket = buckets.get(key);
        if (!bucket) return;

        bucket.total += 1;

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


    const [
        fromDate,
        setFromDate,
    ] = useState('');


    const [
        toDate,
        setToDate,
    ] = useState('');


    /* ===========================
       DASHBOARD DATE FILTER
    =========================== */

    const [
        dashFromDate,
        setDashFromDate,
    ] = useState('');


    const [
        dashToDate,
        setDashToDate,
    ] = useState('');


    const [
        appliedDashFromDate,
        setAppliedDashFromDate,
    ] = useState('');


    const [
        appliedDashToDate,
        setAppliedDashToDate,
    ] = useState('');


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

    async function loadAttendance() {
        setAttendanceLoading(true);
        setAttendanceError('');

        try {
            const result =
                await AttendanceApi.dashboard({
                    pageSize: 1,
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


    useEffect(() => {
        if (view === 'DASHBOARD') {
            loadAttendance();
        }
    }, [view]);


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
        fromDate,
        toDate,
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
       DASHBOARD FILTERED RECORDS (WITH DATE FILTER)
    ========================================================= */

    const dashboardRecords =
        useMemo(() => {
            if (
                !appliedDashFromDate &&
                !appliedDashToDate
            ) {
                return moduleRecords;
            }


            return moduleRecords.filter(
                (item) =>
                    isWithinRange(
                        item,
                        appliedDashFromDate,
                        appliedDashToDate
                    )
            );
        }, [
            moduleRecords,
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


            return {
                approved,
                rejected,
                actionRequired,
                actionTaken,

                total:
                    approved +
                    rejected +
                    actionRequired +
                    actionTaken,
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
                            fromDate,
                            toDate
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
            fromDate,
            toDate,
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
            () => buildLeaderboard(moduleRecords, zoneIdentity, 8),
            [moduleRecords]
        );


    const wardLeaderboard =
        useMemo(
            () => buildLeaderboard(moduleRecords, wardIdentity, 10),
            [moduleRecords]
        );


    const modulePerformanceRows =
        useMemo(
            () =>
                buildLeaderboard(
                    moduleRecords,
                    (item) => moduleShortLabel(item.dashboardModule),
                    MODULES.length
                ),
            [moduleRecords]
        );


    const employeeLeaderboard =
        useMemo(
            () => buildLeaderboard(moduleRecords, employeeIdentity, 8),
            [moduleRecords]
        );


    const supervisorLeaderboard =
        useMemo(
            () => buildLeaderboard(moduleRecords, supervisorIdentity, 8),
            [moduleRecords]
        );


    const qcLeaderboard =
        useMemo(
            () => buildLeaderboard(moduleRecords, qcReviewerIdentity, 8),
            [moduleRecords]
        );


    const actionOfficerLeaderboard =
        useMemo(
            () =>
                buildLeaderboard(
                    moduleRecords,
                    (item) => actionOfficerIdentity(item, item.dashboardModule),
                    8
                ),
            [moduleRecords]
        );


    const reportsTrend =
        useMemo(
            () => buildReportsTrend(moduleRecords, 14),
            [moduleRecords]
        );


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
                'Please enter a corrective-action instruction before submitting.'
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
                            view === 'DASHBOARD' ? (
                                <DashboardHeader
                                    loading={loading}
                                    loadRecords={loadRecords}
                                />
                            ) : (
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
                LATEST REPORT ALERT FOR ULB OFFICER
            ================================================= */}

                        {
                            latestReport && !loading ? (

                                <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-slate-800 shadow-xs sm:flex-row sm:items-center sm:justify-between">

                                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">

                                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-900 border border-amber-500/30">
                                            <span className="relative flex h-2 w-2 mr-0.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600" />
                                            </span>
                                            Latest Alert
                                        </span>

                                        <span className="font-black text-slate-900">
                                            {recordTitle(latestReport, latestReport.dashboardModule)}
                                        </span>

                                        <span className="text-slate-400">•</span>

                                        <span className="text-slate-600">
                                            {moduleShortLabel(latestReport.dashboardModule)} ({recordArea(latestReport)})
                                        </span>

                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${statusBadge(effectiveStatus(latestReport))}`}>
                                            {effectiveStatus(latestReport).replace(/_/g, ' ')}
                                        </span>

                                    </div>


                                    <div className="flex items-center gap-3 shrink-0">

                                        <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                                            Updated: {formatDate(recordDate(latestReport))}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => openDetail(latestReport)}
                                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 cursor-pointer active:scale-95"
                                        >
                                            <Eye size={13} />
                                            View Details
                                        </button>

                                    </div>

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
                        KPI
                    ========================================= */}

                                        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

                                            <ExecutiveKpi
                                                label="QC Approved"

                                                value={
                                                    stats.approved
                                                }

                                                note="Reviewed and accepted by QC"

                                                icon={
                                                    CheckCircle2
                                                }

                                                tone="teal"

                                                onClick={() =>
                                                    router.push(
                                                        '/ulb/approved'
                                                    )
                                                }
                                            />


                                            <ExecutiveKpi
                                                label="QC Rejected"

                                                value={
                                                    stats.rejected
                                                }

                                                note="Rejected during QC review"

                                                icon={
                                                    XCircle
                                                }

                                                tone="rose"

                                                onClick={() =>
                                                    router.push(
                                                        '/ulb/rejected'
                                                    )
                                                }
                                            />


                                            <ExecutiveKpi
                                                label="Action Required"

                                                value={
                                                    stats
                                                        .actionRequired
                                                }

                                                note="Awaiting corrective response"

                                                icon={
                                                    AlertTriangle
                                                }

                                                tone="gold"

                                                onClick={() =>
                                                    router.push(
                                                        '/ulb/action-required'
                                                    )
                                                }
                                            />


                                            <ExecutiveKpi
                                                label="Action Taken"

                                                value={
                                                    stats
                                                        .actionTaken
                                                }

                                                note="Corrective work completed"

                                                icon={
                                                    FileCheck2
                                                }

                                                tone="blue"

                                                onClick={() =>
                                                    router.push(
                                                        '/ulb/action-taken'
                                                    )
                                                }
                                            />


                                            <ExecutiveKpi
                                                label="QC Processed"

                                                value={
                                                    stats.total
                                                }

                                                note={
                                                    selectedModuleName
                                                }

                                                icon={
                                                    Layers3
                                                }

                                                tone="navy"
                                            />

                                        </section>


                                        {/* =========================================
                        INSIGHTS
                    ========================================= */}

                                        <section className="grid gap-4 md:grid-cols-3">

                                            <InsightCard
                                                icon={
                                                    TrendingUp
                                                }

                                                eyebrow="Corrective closure"

                                                value={`${closureRate}%`}

                                                note={`${stats.actionTaken} completed of ${correctiveTotal} corrective cases`}
                                            >

                                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">

                                                    <div
                                                        className="h-full rounded-full bg-blue-600 transition-all"

                                                        style={{
                                                            width:
                                                                `${closureRate}%`,
                                                        }}
                                                    />

                                                </div>

                                            </InsightCard>


                                            <InsightCard
                                                icon={
                                                    AlertTriangle
                                                }

                                                eyebrow="Highest open load"

                                                value={
                                                    highestCorrectiveModule
                                                        .label
                                                }

                                                note={`${highestCorrectiveModule.count} pending corrective ${highestCorrectiveModule.count ===
                                                        1
                                                        ? 'case'
                                                        : 'cases'
                                                    }`}
                                            />


                                            <InsightCard
                                                icon={
                                                    Clock3
                                                }

                                                eyebrow="Latest workflow update"

                                                value={
                                                    recentRecords[0]
                                                        ? moduleShortLabel(
                                                            recentRecords[0]
                                                                .dashboardModule
                                                        )
                                                        : '—'
                                                }

                                                note={
                                                    recentRecords[0]
                                                        ? `${effectiveStatus(
                                                            recentRecords[0]
                                                        ).replace(
                                                            /_/g,
                                                            ' '
                                                        )} • ${formatDate(
                                                            recordDate(
                                                                recentRecords[0]
                                                            )
                                                        )}`
                                                        : 'No workflow update available'
                                                }
                                            />

                                        </section>


                                        {/* =========================================
                        ATTENDANCE
                    ========================================= */}

                                        <AttendanceOverview
                                            data={attendance}
                                            loading={attendanceLoading}
                                            error={attendanceError}
                                        />


                                        {/* =========================================
                        CHARTS
                    ========================================= */}

                                        <section className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">


                                            {/* MODULE CHART */}

                                            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">

                                                <div className="mb-5 flex flex-col gap-1">

                                                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">

                                                        <Activity
                                                            size={15}
                                                        />

                                                        Service control summary

                                                    </div>


                                                    <h2 className="text-lg font-black text-slate-900">
                                                        Module Workflow Position
                                                    </h2>


                                                    <p className="text-xs font-medium text-slate-500">
                                                        Compare QC decisions and corrective-action progress across all three sanitation modules.
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
                                                        label="Corrective action pending"
                                                    />

                                                    <LegendDot
                                                        color="#2563eb"
                                                        label="Corrective action completed"
                                                    />

                                                </div>

                                            </div>


                                            {/* STATUS PIE */}

                                            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">

                                                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">

                                                    <ShieldCheck
                                                        size={15}
                                                    />

                                                    Portfolio status

                                                </div>


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


                                        {/* =========================================
                        ZONE / WARD PERFORMANCE
                    ========================================= */}

                                        <section className="grid gap-5 xl:grid-cols-2">

                                            <GeoPerformanceTable
                                                icon={Building2}
                                                eyebrow="Zone-wise performance"
                                                title="QC & Corrective Performance by Zone"
                                                description="Approval and corrective-closure rates for every zone with submitted reports."
                                                rows={zoneLeaderboard}
                                                emptyMessage="No zone information is available on the current reports."
                                            />

                                            <GeoPerformanceTable
                                                icon={MapPin}
                                                eyebrow="Ward-wise performance"
                                                title="QC & Corrective Performance by Ward"
                                                description="Top wards ranked by submitted-report volume."
                                                rows={wardLeaderboard}
                                                emptyMessage="No ward information is available on the current reports."
                                                scroll
                                            />

                                        </section>


                                        {/* =========================================
                        MODULE DEEP DIVE
                    ========================================= */}

                                        <GeoPerformanceTable
                                            icon={Layers3}
                                            eyebrow="Module-wise performance"
                                            title="Sanitation Module Deep Dive"
                                            description="Toilets, Sweeping and Litter Bins compared on approval rate and corrective-closure rate."
                                            rows={modulePerformanceRows}
                                            emptyMessage="No module data available."
                                        />


                                        {/* =========================================
                        PEOPLE PERFORMANCE
                    ========================================= */}

                                        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

                                            <PeopleLeaderboardCard
                                                icon={Wrench}
                                                eyebrow="Field employees"
                                                title="Employee Performance"
                                                rows={employeeLeaderboard}
                                                rateType="approval"
                                                emptyMessage="No records are attributed to a named employee yet."
                                            />

                                            <PeopleLeaderboardCard
                                                icon={UsersRound}
                                                eyebrow="Field supervisors"
                                                title="Supervisor Performance"
                                                rows={supervisorLeaderboard}
                                                rateType="approval"
                                                emptyMessage="No records are attributed to a named supervisor yet."
                                            />

                                            <PeopleLeaderboardCard
                                                icon={ShieldCheck}
                                                eyebrow="Quality control"
                                                title="QC Reviewer Performance"
                                                rows={qcLeaderboard}
                                                rateType="approval"
                                                emptyMessage="No QC reviewer identity is available yet."
                                                note="Currently available for Toilet inspections only — other modules don't expose reviewer identity via the API yet."
                                            />

                                            <PeopleLeaderboardCard
                                                icon={Award}
                                                eyebrow="Corrective closure"
                                                title="Action Officer Performance"
                                                rows={actionOfficerLeaderboard}
                                                rateType="closure"
                                                emptyMessage="No Action Officer identity is available yet."
                                                note="Named officers are shown for Toilets; Litter Bin closures show an officer ID (name not returned by the API). Sweeping doesn't expose officer identity yet."
                                            />

                                        </section>


                                        {/* =========================================
                        CORRECTIVE QUEUE
                    ========================================= */}

                                        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">

                                            <SectionHeading
                                                icon={
                                                    AlertTriangle
                                                }

                                                eyebrow="Corrective action queue"

                                                title="Oldest Pending Corrective Cases"

                                                description="Reports already sent to Action Officers and still awaiting a response."

                                                action={

                                                    <button
                                                        type="button"

                                                        onClick={() =>
                                                            router.push(
                                                                '/ulb/action-required'
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

                                                emptyMessage="No corrective actions are pending."
                                            />

                                        </section>


                                        {/* =========================================
                        RECENT WORKFLOW
                    ========================================= */}

                                        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">

                                            <SectionHeading
                                                icon={
                                                    ClipboardCheck
                                                }

                                                eyebrow="Latest activity"

                                                title="Recent QC & Corrective Workflow"

                                                description="Latest report movement across all assigned sanitation modules."
                                            />


                                            <RecordsTable
                                                records={
                                                    recentRecords
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

                                                emptyMessage="No processed reports found."
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
                                                label="Corrective Closure"

                                                value={`${closureRate}%`}

                                                note={`${stats.actionTaken} completed corrective cases`}

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
   DASHBOARD HEADER
========================================================= */

function DashboardHeader({ loading, loadRecords }: any) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
            <h1 className="text-xl font-black tracking-tight text-slate-900">
                ULB Operations Dashboard
            </h1>

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
        }
    > = {

        teal: {
            icon:
                'text-teal-700',

            bg:
                'bg-teal-50',

            border:
                'hover:border-teal-200',
        },


        rose: {
            icon:
                'text-rose-700',

            bg:
                'bg-rose-50',

            border:
                'hover:border-rose-200',
        },


        gold: {
            icon:
                'text-amber-700',

            bg:
                'bg-amber-50',

            border:
                'hover:border-amber-200',
        },


        blue: {
            icon:
                'text-blue-700',

            bg:
                'bg-blue-50',

            border:
                'hover:border-blue-200',
        },


        navy: {
            icon:
                'text-slate-800',

            bg:
                'bg-slate-100',

            border:
                'hover:border-slate-300',
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

            className={`group w-full rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-sm transition duration-200 ${selected.border} ${onClick
                    ? 'hover:-translate-y-0.5 hover:shadow-md'
                    : 'cursor-default'
                }`}
        >

            <div className="flex items-start justify-between">

                <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected.bg}`}
                >

                    <Icon
                        size={19}

                        className={
                            selected.icon
                        }
                    />

                </div>


                {
                    onClick ? (

                        <ChevronRight
                            size={16}

                            className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
                        />

                    ) : null
                }

            </div>


            <div className="mt-4 text-2xl font-black tracking-tight text-slate-900">
                {value}
            </div>


            <div className="mt-1 text-xs font-black text-slate-700">
                {label}
            </div>


            <div className="mt-1 text-[10px] font-semibold leading-4 text-slate-400">
                {note}
            </div>

        </button>
    );
}


/* =========================================================
   INSIGHT
========================================================= */

function InsightCard({
    icon: Icon,
    eyebrow,
    value,
    note,
    children,
}: any) {

    return (
        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

                <Icon
                    size={17}
                />

            </div>


            <div className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                {eyebrow}
            </div>


            <div className="mt-1 text-xl font-black text-slate-900">
                {value}
            </div>


            <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                {note}
            </div>


            {children}

        </div>
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
}: any) {

    return (
        <div className="flex items-center gap-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

                <Icon
                    size={19}
                />

            </div>


            <div>

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

        </div>
    );
}


/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
    icon: Icon,
    eyebrow,
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

                    {eyebrow}

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
   ATTENDANCE OVERVIEW
========================================================= */

function AttendanceOverview({
    data,
    loading,
    error,
}: {
    data: AttendanceDashboardResponse | null;
    loading: boolean;
    error: string;
}) {

    return (
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">

            <SectionHeading
                icon={UsersRound}
                eyebrow="Workforce attendance"
                title="Attendance Performance"
                description={
                    data?.range
                        ? `Reporting window ${formatDateOnly(data.range.from)} – ${formatDateOnly(data.range.to)}`
                        : 'CSV-imported attendance across zones and wards.'
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

                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-xs font-semibold text-slate-400">
                            No attendance data has been uploaded for this city yet.
                        </div>

                    ) : (

                        <>

                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                                <CompactSummary
                                    label="Attendance Rate"
                                    value={`${Number(data.summary.attendanceRate).toFixed(2)}%`}
                                    note={`${data.summary.uniqueEmployees} employees tracked`}
                                    icon={UserCheck}
                                />

                                <CompactSummary
                                    label="Present"
                                    value={data.summary.present}
                                    note={`${data.summary.checkedOut} checked out`}
                                    icon={CheckCircle2}
                                />

                                <CompactSummary
                                    label="Absent"
                                    value={data.summary.absent}
                                    note={`${data.summary.openCheckIns} open check-ins`}
                                    icon={UserRoundX}
                                />

                                <CompactSummary
                                    label="Avg Work Duration"
                                    value={formatMinutes(data.summary.avgWorkMinutes)}
                                    note="Per completed shift"
                                    icon={TimerReset}
                                />

                            </div>

                            <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">

                                <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">

                                    <div className="mb-3 text-xs font-black text-slate-700">
                                        Daily Attendance Trend
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

                                <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">

                                    <div className="mb-3 text-xs font-black text-slate-700">
                                        Attendance by Designation
                                    </div>

                                    <div className="h-[220px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data.designationBreakdown.slice(0, 6)}>
                                                <CartesianGrid vertical={false} stroke="#eef2f7" strokeDasharray="3 3" />
                                                <XAxis dataKey="designation" axisLine={false} tickLine={false} fontSize={9} interval={0} angle={-15} textAnchor="end" height={50} />
                                                <YAxis axisLine={false} tickLine={false} fontSize={11} allowDecimals={false} />
                                                <Tooltip />
                                                <Bar dataKey="present" fill="#2563eb" radius={[5, 5, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                </div>

                            </div>

                            {
                                data.topEmployees.length ? (

                                    <div className="mt-5 rounded-2xl border border-slate-100 p-4">

                                        <div className="mb-3 flex items-center gap-2 text-xs font-black text-slate-700">
                                            <Trophy size={14} className="text-amber-500" />
                                            Top Attendance Performers
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[640px]">
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
                                                            <tr key={emp.attendanceId} className="border-t border-slate-100">
                                                                <td className="py-2.5 pr-3 text-xs font-black text-slate-800">{emp.employeeName}</td>
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
   REPORTS TREND CHART
========================================================= */

function ReportsTrendChart({
    data,
}: {
    data: ReturnType<typeof buildReportsTrend>;
}) {

    return (
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                <TrendingUp size={15} />
                Inspection activity
            </div>

            <h3 className="mt-1 text-lg font-black text-slate-900">
                Reports Submitted — Last 14 Days
            </h3>

            <p className="mt-1 text-xs font-medium text-slate-500">
                Daily volume of QC-processed reports across all sanitation modules.
            </p>

            <div className="mt-4 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="ulbTotalReportsGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#eef2f7" strokeDasharray="3 3" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={11} />
                        <YAxis axisLine={false} tickLine={false} fontSize={11} allowDecimals={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="total" name="Reports" stroke="#2563eb" fill="url(#ulbTotalReportsGradient)" strokeWidth={2.5} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
}


/* =========================================================
   GEO / MODULE PERFORMANCE TABLE
   (reused for Zone, Ward and Module breakdowns)
========================================================= */

function GeoPerformanceTable({
    icon: Icon,
    eyebrow,
    title,
    description,
    rows,
    emptyMessage,
    scroll,
}: {
    icon: any;
    eyebrow: string;
    title: string;
    description: string;
    rows: LeaderboardRow[];
    emptyMessage: string;
    scroll?: boolean;
}) {

    return (
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                <Icon size={15} />
                {eyebrow}
            </div>

            <h3 className="mt-1 text-lg font-black text-slate-900">
                {title}
            </h3>

            <p className="mt-1 text-xs font-medium text-slate-500">
                {description}
            </p>

            {
                rows.length === 0 ? (

                    <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-xs font-semibold text-slate-400">
                        {emptyMessage}
                    </div>

                ) : (

                    <div className={`mt-4 overflow-x-auto ${scroll ? 'max-h-[360px] overflow-y-auto' : ''}`}>
                        <table className="w-full min-w-[560px]">
                            <thead>
                                <tr className="text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <th className="py-2 pr-3">Name</th>
                                    <th className="py-2 pr-3">Total</th>
                                    <th className="py-2 pr-3">Approved</th>
                                    <th className="py-2 pr-3">Rejected</th>
                                    <th className="py-2 pr-3">Action Req.</th>
                                    <th className="py-2 pr-3">Approval</th>
                                    <th className="py-2">Closure</th>
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    rows.map((row) => (
                                        <tr key={row.key} className="border-t border-slate-100">
                                            <td className="py-2.5 pr-3 max-w-[180px] truncate text-xs font-black text-slate-800">{row.label}</td>
                                            <td className="py-2.5 pr-3 text-xs font-bold text-slate-600">{row.total}</td>
                                            <td className="py-2.5 pr-3 text-xs font-bold text-emerald-700">{row.approved}</td>
                                            <td className="py-2.5 pr-3 text-xs font-bold text-rose-700">{row.rejected}</td>
                                            <td className="py-2.5 pr-3 text-xs font-bold text-amber-700">{row.actionRequired}</td>
                                            <td className="py-2.5 pr-3"><RateBar value={approvalRateOf(row)} tone="emerald" /></td>
                                            <td className="py-2.5"><RateBar value={closureRateOf(row)} tone="blue" /></td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>

                )
            }

        </div>
    );
}


/* =========================================================
   PEOPLE PERFORMANCE LEADERBOARD
   (employee, supervisor, QC, action officer)
========================================================= */

function PeopleLeaderboardCard({
    icon: Icon,
    eyebrow,
    title,
    rows,
    rateType,
    emptyMessage,
    note,
}: {
    icon: any;
    eyebrow: string;
    title: string;
    rows: LeaderboardRow[];
    rateType: 'approval' | 'closure';
    emptyMessage: string;
    note?: string;
}) {

    return (
        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                <Icon size={15} />
                {eyebrow}
            </div>

            <h3 className="mt-1 text-base font-black text-slate-900">
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
                            rows.map((row, index) => (
                                <div key={row.key} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">

                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[10px] font-black text-slate-500">
                                        {index + 1}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-xs font-black text-slate-800">{row.label}</div>
                                        <div className="text-[10px] font-semibold text-slate-400">
                                            {row.total} report{row.total === 1 ? '' : 's'}
                                        </div>
                                    </div>

                                    <RateBar
                                        value={rateType === 'approval' ? approvalRateOf(row) : closureRateOf(row)}
                                        tone={rateType === 'approval' ? 'emerald' : 'blue'}
                                    />

                                </div>
                            ))
                        }
                    </div>

                )
            }

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
                            Workflow Note
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
                            Corrective Instruction
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
    const [presetName, setPresetName] = useState<string>('All Time');

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
                        className={`flex h-10 items-center justify-between gap-2.5 rounded-xl border px-3 text-xs font-bold transition cursor-pointer shadow-2xs whitespace-nowrap ${
                            appliedFromDate || appliedToDate
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
                                            className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                                                customMode === 'SINGLE' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            Single
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCustomMode('RANGE')}
                                            className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                                                customMode === 'RANGE' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
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