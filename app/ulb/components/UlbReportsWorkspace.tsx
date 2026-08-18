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
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Clock3,
    Eye,
    FileCheck2,
    Filter,
    Image as ImageIcon,
    Layers3,
    RefreshCw,
    Search,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    X,
    XCircle,
} from 'lucide-react';

import {
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

        item?.zoneName,
        item?.wardName,

        item?.bin?.zoneName,
        item?.bin?.wardName,

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


    /*
     * Reset pagination when
     * any filter changes.
     */
    useEffect(() => {
        setPage(1);
    }, [
        view,
        moduleFilter,
        search,
        fromDate,
        toDate,
    ]);


    /* =========================================================
       MODULE FILTER
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


    /* =========================================================
       GLOBAL STATS
    ========================================================= */

    const stats =
        useMemo(() => {

            const approved =
                moduleRecords.filter(
                    (
                        item
                    ) =>
                        effectiveStatus(
                            item
                        ) ===
                        'APPROVED'
                ).length;


            const rejected =
                moduleRecords.filter(
                    (
                        item
                    ) =>
                        effectiveStatus(
                            item
                        ) ===
                        'REJECTED'
                ).length;


            const actionRequired =
                moduleRecords.filter(
                    (
                        item
                    ) =>
                        effectiveStatus(
                            item
                        ) ===
                        'ACTION_REQUIRED'
                ).length;


            const actionTaken =
                moduleRecords.filter(
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
            moduleRecords,
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
                            moduleRecords.filter(
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
                moduleRecords,
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
                moduleRecords

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
                moduleRecords,
            ]
        );


    /* =========================================================
       RECENT ACTIVITY
    ========================================================= */

    const recentRecords =
        useMemo(
            () =>
                [
                    ...moduleRecords,
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
                moduleRecords,
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
                            moduleRecords.filter(
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
            moduleRecords,
        ]);


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

                    <div className="space-y-6 pb-8">


                        {/* =================================================
                HEADER
            ================================================= */}

                        {
                            view ===
                                'DASHBOARD'
                                ? (

                                    <DashboardHeader
                                        moduleFilter={
                                            moduleFilter
                                        }

                                        setModuleFilter={
                                            setModuleFilter
                                        }

                                        loading={
                                            loading
                                        }

                                        loadRecords={
                                            loadRecords
                                        }
                                    />

                                )
                                : (

                                    <StatusHeader
                                        view={
                                            view
                                        }

                                        moduleFilter={
                                            moduleFilter
                                        }

                                        setModuleFilter={
                                            setModuleFilter
                                        }

                                        loading={
                                            loading
                                        }

                                        loadRecords={
                                            loadRecords
                                        }

                                        router={
                                            router
                                        }
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
                DASHBOARD
            ================================================= */}

                        {
                            view ===
                                'DASHBOARD'
                                ? (
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
                                )

                                : (

                                    /* =================================================
                                       STATUS PAGES
                                    ================================================= */

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
                        SEARCH + DATE
                    ============================================= */}

                                        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">

                                            <div className="grid gap-3 xl:grid-cols-[1.3fr_0.8fr_0.8fr_auto]">


                                                {/* SEARCH */}

                                                <div className="relative">

                                                    <Search
                                                        size={17}

                                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                                    />


                                                    <input
                                                        value={
                                                            search
                                                        }

                                                        onChange={(
                                                            event
                                                        ) =>
                                                            setSearch(
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }

                                                        placeholder="Search report, location, ward, employee or remark..."

                                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400"
                                                    />

                                                </div>


                                                {/* FROM */}

                                                <label className="relative flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">

                                                    <CalendarDays
                                                        size={16}

                                                        className="text-slate-400"
                                                    />


                                                    <input
                                                        type="date"

                                                        value={
                                                            fromDate
                                                        }

                                                        onChange={(
                                                            event
                                                        ) =>
                                                            setFromDate(
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }

                                                        className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none"
                                                    />

                                                </label>


                                                {/* TO */}

                                                <label className="relative flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">

                                                    <CalendarDays
                                                        size={16}

                                                        className="text-slate-400"
                                                    />


                                                    <input
                                                        type="date"

                                                        value={
                                                            toDate
                                                        }

                                                        onChange={(
                                                            event
                                                        ) =>
                                                            setToDate(
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }

                                                        className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none"
                                                    />

                                                </label>


                                                {/* CLEAR */}

                                                <button
                                                    type="button"

                                                    onClick={() => {
                                                        setSearch('');
                                                        setFromDate('');
                                                        setToDate('');
                                                    }}

                                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                                                >

                                                    <Filter
                                                        size={15}
                                                    />

                                                    Clear

                                                </button>

                                            </div>

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

function DashboardHeader({
    moduleFilter,
    setModuleFilter,
    loading,
    loadRecords,
}: any) {

    return (
        <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.15)]">

            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="absolute bottom-[-90px] left-[28%] h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />


            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

                <div>

                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">

                        <Sparkles
                            size={13}
                        />

                        Commissioner Operations View

                    </div>


                    <h1 className="max-w-3xl text-2xl font-black tracking-tight sm:text-3xl">
                        Municipal Sanitation Command Center
                    </h1>


                    <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                        Monitor QC decisions, assign corrective action, track Action Officer closure and inspect the complete submitted evidence across Toilets, Sweeping and Litter Bins.
                    </p>

                </div>


                <div className="flex flex-wrap gap-2">

                    <select
                        value={
                            moduleFilter
                        }

                        onChange={(
                            event
                        ) =>
                            setModuleFilter(
                                event
                                    .target
                                    .value
                            )
                        }

                        className="h-11 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white outline-none backdrop-blur-md"
                    >

                        <option
                            value="ALL"
                            className="text-slate-900"
                        >
                            All Modules
                        </option>


                        {
                            MODULES.map(
                                (
                                    module
                                ) => (

                                    <option
                                        key={
                                            module.key
                                        }

                                        value={
                                            module.key
                                        }

                                        className="text-slate-900"
                                    >
                                        {module.label}
                                    </option>

                                )
                            )
                        }

                    </select>


                    <button
                        type="button"

                        onClick={
                            loadRecords
                        }

                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15"
                    >

                        <RefreshCw
                            size={16}

                            className={
                                loading
                                    ? 'animate-spin'
                                    : ''
                            }
                        />

                        Refresh

                    </button>

                </div>

            </div>

        </section>
    );
}


/* =========================================================
   STATUS PAGE HEADER
========================================================= */

function StatusHeader({
    view,
    moduleFilter,
    setModuleFilter,
    loading,
    loadRecords,
    router,
}: any) {

    const config =
        VIEW_CONFIG[
        view as Exclude<
            UlbView,
            'DASHBOARD'
        >
        ];


    return (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                <div className="flex items-start gap-4">

                    <button
                        type="button"

                        onClick={() =>
                            router.push(
                                '/ulb/dashboard'
                            )
                        }

                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
                    >

                        <ChevronLeft
                            size={18}
                        />

                    </button>


                    <div>

                        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                            Commissioner Operations View
                        </div>


                        <h1 className="text-2xl font-black tracking-tight text-slate-900">
                            {config.title}
                        </h1>


                        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                            {config.description}
                        </p>

                    </div>

                </div>


                <div className="flex flex-wrap gap-2">

                    <select
                        value={
                            moduleFilter
                        }

                        onChange={(
                            event
                        ) =>
                            setModuleFilter(
                                event
                                    .target
                                    .value
                            )
                        }

                        className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400"
                    >

                        <option value="ALL">
                            All Modules
                        </option>


                        {
                            MODULES.map(
                                (
                                    module
                                ) => (

                                    <option
                                        key={
                                            module.key
                                        }

                                        value={
                                            module.key
                                        }
                                    >
                                        {module.label}
                                    </option>

                                )
                            )
                        }

                    </select>


                    <button
                        type="button"

                        onClick={
                            loadRecords
                        }

                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                    >

                        <RefreshCw
                            size={16}

                            className={
                                loading
                                    ? 'animate-spin'
                                    : ''
                            }
                        />

                        Refresh

                    </button>

                </div>

            </div>

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