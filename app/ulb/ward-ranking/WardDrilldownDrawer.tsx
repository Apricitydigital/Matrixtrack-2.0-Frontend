'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  User,
  X,
  XCircle,
} from 'lucide-react';

import {
  WardRankingApi,
  type WardOperationalStatus,
  type WardRankingComponent,
  type WardRankingComponentResponse,
  type WardRankingRow,
} from '@lib/wardRankingApi';


type Props = {
  open: boolean;

  ward:
    | WardRankingRow
    | null;

  initialComponent:
    | WardRankingComponent
    | null;

  from: string;
  to: string;

  onClose: () => void;
};


const COMPONENTS: Array<{
  key: WardRankingComponent;

  field:
    keyof WardRankingRow['components'];

  label: string;
}> = [
  {
    key: 'WORKFORCE',
    field: 'workforce',
    label: 'Workforce',
  },
  {
    key: 'BEAT',
    field: 'beat',
    label: 'Beat',
  },
  {
    key: 'TOILET',
    field: 'toilet',
    label: 'Toilet',
  },
  {
    key: 'LITTERBIN',
    field: 'litterBin',
    label: 'Litter Bin',
  },
  {
    key: 'SUPERVISOR',
    field: 'supervisor',
    label: 'Supervisor',
  },
  {
    key: 'QC',
    field: 'qc',
    label: 'QC',
  },
  {
    key: 'ACTION_OFFICER',
    field: 'actionOfficer',
    label: 'Action Officer',
  },
];


const STATUS_OPTIONS: Partial<
  Record<
    WardRankingComponent,
    WardOperationalStatus[]
  >
> = {
  BEAT: [
    'DUE',
    'CHECKED',
    'NOT_CHECKED',
    'PENDING_QC',
    'APPROVED',
    'REJECTED',
    'RESUBMITTED',
  ],

  TOILET: [
    'DUE',
    'CHECKED',
    'NOT_CHECKED',
    'COMPLIANT',
    'NON_COMPLIANT',
    'PENDING_QC',
    'APPROVED',
    'REJECTED',
    'RESUBMITTED',
    'ACTION_REQUIRED',
    'ACTION_TAKEN',
  ],

  LITTERBIN: [
    'DUE',
    'CHECKED',
    'NOT_CHECKED',
    'COMPLIANT',
    'NON_COMPLIANT',
    'PENDING_QC',
    'APPROVED',
    'REJECTED',
    'RESUBMITTED',
    'ACTION_REQUIRED',
    'ACTION_TAKEN',
  ],

  SUPERVISOR: [
    'DUE',
    'SUBMITTED',
    'PENDING_QC',
    'APPROVED',
    'REJECTED',
    'RESUBMITTED',
  ],

  QC: [
    'PENDING_QC',
    'APPROVED',
    'REJECTED',
    'RESUBMITTED',
  ],

  ACTION_OFFICER: [
    'ASSIGNED',
    'ACKNOWLEDGED',
    'IN_PROGRESS',
    'COMPLETED',
    'OVERDUE',
    'CLOSURE_REJECTED',
    'CLOSED',
    'REOPENED',
  ],
};


function humanize(
  value: string
) {
  return value
    .replace(
      /([a-z])([A-Z])/g,
      '$1 $2'
    )
    .replace(
      /_/g,
      ' '
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
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

  return date.toLocaleString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}


function scoreText(
  value: any
) {
  if (
    !value ||
    !value.applicable
  ) {
    return 'N/A';
  }

  return `${Number(
    value.score || 0
  ).toFixed(1)}/${Number(
    value.maxScore || 0
  ).toFixed(1)}`;
}


function statusClass(
  status: string
) {
  const normalized =
    status.toUpperCase();

  if (
    [
      'APPROVED',
      'CLOSED',
      'COMPLETED',
      'CHECKED',
      'COMPLIANT',
    ].includes(
      normalized
    )
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (
    [
      'REJECTED',
      'CLOSURE_REJECTED',
      'NON_COMPLIANT',
      'OVERDUE',
    ].includes(
      normalized
    )
  ) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (
    [
      'PENDING_QC',
      'DUE',
      'ACTION_REQUIRED',
      'REOPENED',
    ].includes(
      normalized
    )
  ) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-blue-200 bg-blue-50 text-blue-700';
}


function recordStatuses(
  item: any
) {
  const values = [
    ...(Array.isArray(
      item?.operationalStatuses
    )
      ? item.operationalStatuses
      : []),

    item?.status,
    item?.qcDecision,
    item?.decision,
    item?.closureDecision,
  ]
    .filter(Boolean)
    .map(String);

  return Array.from(
    new Set(values)
  );
}


function recordTitle(
  item: any
) {
  return (
    item?.toilet?.name ||
    item?.bin?.locationName ||
    item?.segment?.beat?.beatName ||
    item?.beat?.beatName ||
    item?.beatName ||
    item?.locationName ||
    item?.assetName ||
    item?.employee?.name ||
    item?.employeeName ||
    item?.name ||
    item?.sourceRecordId ||
    item?.id ||
    'Operational Record'
  );
}


function recordActor(
  item: any
) {
  return (
    item?.submittedBy?.name ||
    item?.supervisor?.name ||
    item?.employee?.name ||
    item?.reviewedByQc?.name ||
    item?.employeeName ||
    null
  );
}


function recordTimestamp(
  item: any
) {
  return (
    item?.completedAt ||
    item?.reviewedAt ||
    item?.qcReviewedAt ||
    item?.submittedAt ||
    item?.createdAt ||
    item?.attendanceDate ||
    item?.assignedAt ||
    null
  );
}


type FlatRecord = {
  section: string;
  item: any;
};


function flattenRecords(
  component:
    WardRankingComponent,
  data: any
): FlatRecord[] {
  if (!data) {
    return [];
  }

  if (
    component === 'BEAT'
  ) {
    return [
      ...(data.obligations || []).map(
        (item: any) => ({
          section:
            'Beat Obligation',
          item,
        })
      ),

      ...(data.reports || []).map(
        (item: any) => ({
          section:
            'Sweeping Report',
          item,
        })
      ),
    ];
  }


  if (
    component === 'TOILET'
  ) {
    return [
      ...(data.obligations || []).map(
        (item: any) => ({
          section:
            'Toilet Obligation',
          item,
        })
      ),

      ...(data.inspections || []).map(
        (item: any) => ({
          section:
            'Toilet Inspection',
          item,
        })
      ),
    ];
  }


  if (
    component === 'LITTERBIN'
  ) {
    return [
      ...(data.obligations || []).map(
        (item: any) => ({
          section:
            'Litter Bin Obligation',
          item,
        })
      ),

      ...(data.reports || []).map(
        (item: any) => ({
          section:
            'Litter Bin Report',
          item,
        })
      ),
    ];
  }


  if (
    component ===
    'ACTION_OFFICER'
  ) {
    return (
      data.tasks || []
    ).map(
      (item: any) => ({
        section:
          'Action Officer Task',
        item,
      })
    );
  }


  if (
    component ===
    'WORKFORCE'
  ) {
    return [
      ...(data.assignments || []).map(
        (item: any) => ({
          section:
            'Employee Assignment',
          item,
        })
      ),

      ...(data.attendance || []).map(
        (item: any) => ({
          section:
            'Attendance',
          item,
        })
      ),
    ];
  }


  if (
    component ===
    'SUPERVISOR'
  ) {
    return [
      ...(
        data.submittedReports
          ?.sweeping ||
        []
      ).map(
        (item: any) => ({
          section:
            'Sweeping Report',
          item,
        })
      ),

      ...(
        data.submittedReports
          ?.toilet ||
        []
      ).map(
        (item: any) => ({
          section:
            'Toilet Report',
          item,
        })
      ),

      ...(
        data.submittedReports
          ?.litterBin ||
        []
      ).map(
        (item: any) => ({
          section:
            'Litter Bin Report',
          item,
        })
      ),
    ];
  }


  if (
    component === 'QC'
  ) {
    return [
      ...(data.sweeping || []).map(
        (item: any) => ({
          section:
            'Sweeping QC',
          item,
        })
      ),

      ...(data.toilet || []).map(
        (item: any) => ({
          section:
            'Toilet QC',
          item,
        })
      ),

      ...(data.litterBin || []).map(
        (item: any) => ({
          section:
            'Litter Bin QC',
          item,
        })
      ),
    ];
  }


  return [];
}


function MetricGrid({
  metrics,
}: {
  metrics: Record<
    string,
    any
  >;
}) {
  const entries =
    Object.entries(
      metrics || {}
    ).filter(
      ([, value]) =>
        typeof value ===
          'number' ||
        typeof value ===
          'boolean' ||
        value === null
    );

  if (
    !entries.length
  ) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {entries.map(
        ([
          key,
          value,
        ]) => (
          <div
            key={key}
            className="rounded-xl border border-slate-100 bg-slate-50 p-3"
          >
            <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
              {humanize(
                key
              )}
            </div>

            <div className="mt-1 text-sm font-black text-slate-800">
              {typeof value ===
              'boolean'
                ? value
                  ? 'Yes'
                  : 'No'
                : value === null
                  ? 'N/A'
                  : key
                      .toLowerCase()
                      .includes(
                        'percent'
                      )
                    ? `${Number(
                        value
                      ).toFixed(
                        1
                      )}%`
                    : String(
                        value
                      )}
            </div>
          </div>
        )
      )}
    </div>
  );
}


function RecordCard({
  record,
}: {
  record: FlatRecord;
}) {
  const {
    item,
    section,
  } = record;

  const statuses =
    recordStatuses(item);

  const actor =
    recordActor(item);

  const time =
    recordTimestamp(item);

  const remarks = [
    item?.qcRemark,
    item?.qcComment,
    item?.ulbRemark,
    item?.closureRemark,
    item?.rejectionReason,
  ].filter(Boolean);

  const closureAttempts =
    Array.isArray(
      item?.closureAttempts
    )
      ? item.closureAttempts
      : [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-wider text-blue-600">
            {section}
          </div>

          <div className="mt-1 text-sm font-black text-slate-900">
            {recordTitle(
              item
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-400">
            {actor && (
              <span className="inline-flex items-center gap-1">
                <User
                  size={11}
                />

                {actor}
              </span>
            )}

            {time && (
              <span className="inline-flex items-center gap-1">
                <Clock3
                  size={11}
                />

                {formatDate(
                  time
                )}
              </span>
            )}
          </div>
        </div>

        {!!statuses.length && (
          <div className="flex flex-wrap gap-1.5">
            {statuses.map(
              (status) => (
                <span
                  key={status}
                  className={`rounded-full border px-2 py-1 text-[9px] font-black ${statusClass(
                    status
                  )}`}
                >
                  {humanize(
                    status
                  )}
                </span>
              )
            )}
          </div>
        )}
      </div>


      {!!remarks.length && (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
          {remarks.join(
            ' · '
          )}
        </div>
      )}


      {closureAttempts.length >
        0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
            Closure History
          </div>

          <div className="space-y-2">
            {closureAttempts.map(
              (
                attempt: any
              ) => (
                <div
                  key={
                    attempt.id
                  }
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-slate-700">
                      Attempt #{attempt.attemptNumber}
                    </span>

                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${statusClass(
                      String(
                        attempt.decision ||
                        'PENDING'
                      )
                    )}`}>
                      {humanize(
                        String(
                          attempt.decision ||
                          'PENDING'
                        )
                      )}
                    </span>
                  </div>

                  <div className="mt-2 text-[10px] font-semibold text-slate-500">
                    Submitted:{' '}
                    {formatDate(
                      attempt.submittedAt
                    )}
                  </div>

                  {attempt.reviewedAt && (
                    <div className="mt-1 text-[10px] font-semibold text-slate-500">
                      Reviewed:{' '}
                      {formatDate(
                        attempt.reviewedAt
                      )}
                    </div>
                  )}

                  {attempt.closureRemark && (
                    <div className="mt-2 text-[11px] font-semibold text-slate-600">
                      {attempt.closureRemark}
                    </div>
                  )}

                  {attempt.closureEvidence && (
                    <div className="mt-2 break-all rounded-lg bg-white px-2.5 py-2 text-[10px] font-semibold text-slate-500">
                      Evidence:{' '}
                      {typeof attempt.closureEvidence ===
                      'string'
                        ? attempt.closureEvidence
                        : JSON.stringify(
                            attempt.closureEvidence
                          )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default function WardDrilldownDrawer({
  open,
  ward,
  initialComponent,
  from,
  to,
  onClose,
}: Props) {
  const [
    selectedComponent,
    setSelectedComponent,
  ] =
    useState<
      WardRankingComponent |
      null
    >(
      initialComponent
    );

  const [
    status,
    setStatus,
  ] =
    useState<
      'ALL' |
      WardOperationalStatus
    >(
      'ALL'
    );

  const [
    payload,
    setPayload,
  ] =
    useState<
      WardRankingComponentResponse |
      null
    >(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');


  useEffect(
    () => {
      if (!open) {
        return;
      }

      setSelectedComponent(
        initialComponent
      );

      setStatus(
        'ALL'
      );

      setPayload(
        null
      );
    },

    [
      open,
      ward?.wardId,
      initialComponent,
    ]
  );


  useEffect(
    () => {
      if (!open) {
        return;
      }

      const oldOverflow =
        document.body.style
          .overflow;

      document.body.style
        .overflow =
        'hidden';

      const handleKeyDown =
        (
          event:
            KeyboardEvent
        ) => {
          if (
            event.key ===
            'Escape'
          ) {
            onClose();
          }
        };

      window.addEventListener(
        'keydown',
        handleKeyDown
      );

      return () => {
        document.body.style
          .overflow =
          oldOverflow;

        window.removeEventListener(
          'keydown',
          handleKeyDown
        );
      };
    },

    [
      open,
      onClose,
    ]
  );


  useEffect(
    () => {
      if (
        !open ||
        !ward ||
        !selectedComponent
      ) {
        return;
      }

      let cancelled =
        false;

      const load =
        async () => {
          try {
            setLoading(
              true
            );

            setError('');

            const response =
              await WardRankingApi.component(
                ward.wardId,
                selectedComponent,
                {
                  from,
                  to,

                  status:
                    status ===
                    'ALL'
                      ? undefined
                      : status,
                }
              );

            if (
              !cancelled
            ) {
              setPayload(
                response
              );
            }
          } catch (
            err: any
          ) {
            if (
              !cancelled
            ) {
              setError(
                err?.message ||
                  'Unable to load component records.'
              );
            }
          } finally {
            if (
              !cancelled
            ) {
              setLoading(
                false
              );
            }
          }
        };

      void load();

      return () => {
        cancelled =
          true;
      };
    },

    [
      open,
      ward,
      selectedComponent,
      status,
      from,
      to,
    ]
  );


  const selectedMeta =
    COMPONENTS.find(
      (item) =>
        item.key ===
        selectedComponent
    );


  const selectedScore =
    ward &&
    selectedMeta
      ? ward.components[
          selectedMeta.field
        ]
      : null;


  const records =
    useMemo(
      () =>
        selectedComponent
          ? flattenRecords(
              selectedComponent,
              payload?.data
            )
          : [],

      [
        selectedComponent,
        payload,
      ]
    );


  const qcHistory =
    Array.isArray(
      payload?.qcReviewHistory
    )
      ? payload!.qcReviewHistory
      : [];


  if (
    !open ||
    !ward
  ) {
    return null;
  }


  if (
    typeof document ===
    'undefined'
  ) {
    return null;
  }


  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-950/45 backdrop-blur-[1px]">
      <button
        type="button"
        aria-label="Close drilldown"
        onClick={
          onClose
        }
        className="absolute inset-0 cursor-default"
      />

      <aside className="relative z-10 flex h-full w-full max-w-[920px] flex-col bg-slate-50 shadow-2xl">

        <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Award
                  size={18}
                  className="text-blue-600"
                />

                <h2 className="text-base font-black text-slate-900">
                  {ward.wardName ||
                    'Ward Detail'}
                </h2>

                {ward.rankable ? (
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700">
                    City Rank #{ward.cityRank || '—'}
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">
                    No Data
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap gap-3 text-[10px] font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <MapPin
                    size={11}
                  />

                  {ward.zoneName ||
                    'Zone unavailable'}
                </span>

                <span>
                  {from} — {to}
                </span>

                {ward.rankable && (
                  <span>
                    Final Score:{' '}
                    <strong className="text-slate-700">
                      {Number(
                        ward.finalScore
                      ).toFixed(
                        2
                      )}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"
            >
              <X
                size={17}
              />
            </button>
          </div>
        </div>


        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
            {COMPONENTS.map(
              (
                component
              ) => {
                const score =
                  ward.components[
                    component.field
                  ];

                const active =
                  selectedComponent ===
                  component.key;

                return (
                  <button
                    key={
                      component.key
                    }
                    type="button"
                    disabled={
                      !score?.applicable
                    }
                    onClick={() => {
                      setSelectedComponent(
                        component.key
                      );

                      setStatus(
                        'ALL'
                      );
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                    } ${
                      !score?.applicable
                        ? 'cursor-not-allowed opacity-50'
                        : ''
                    }`}
                  >
                    <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                      {component.label}
                    </div>

                    <div className={`mt-1 text-sm font-black ${
                      active
                        ? 'text-blue-700'
                        : 'text-slate-800'
                    }`}>
                      {scoreText(
                        score
                      )}
                    </div>
                  </button>
                );
              }
            )}
          </div>


          {!selectedComponent && (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <ShieldCheck
                size={30}
                className="mx-auto text-blue-300"
              />

              <div className="mt-3 text-sm font-black text-slate-700">
                Select a score component
              </div>

              <div className="mt-1 text-xs font-semibold text-slate-400">
                Open Workforce, Beat, Toilet, Litter Bin, Supervisor, QC or Action Officer to see the underlying operational records.
              </div>
            </div>
          )}


          {selectedComponent && (
            <div className="mt-5 space-y-4">

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      {selectedMeta?.label}
                    </div>

                    <div className="mt-1 text-[11px] font-semibold text-slate-400">
                      Score{' '}
                      {scoreText(
                        selectedScore
                      )}

                      {selectedScore?.applicable && (
                        <>
                          {' · '}
                          {Number(
                            selectedScore.percentage ||
                            0
                          ).toFixed(
                            1
                          )}
                          %
                        </>
                      )}
                    </div>
                  </div>


                  {!!STATUS_OPTIONS[
                    selectedComponent
                  ]?.length && (
                    <select
                      value={
                        status
                      }
                      onChange={(
                        event
                      ) => {
                        setStatus(
                          event.target
                            .value as
                            | 'ALL'
                            | WardOperationalStatus
                        );
                      }}
                      className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="ALL">
                        All Operational Statuses
                      </option>

                      {STATUS_OPTIONS[
                        selectedComponent
                      ]!.map(
                        (
                          option
                        ) => (
                          <option
                            key={
                              option
                            }
                            value={
                              option
                            }
                          >
                            {humanize(
                              option
                            )}
                          </option>
                        )
                      )}
                    </select>
                  )}
                </div>


                {selectedScore?.metrics && (
                  <div className="mt-4">
                    <MetricGrid
                      metrics={
                        selectedScore.metrics
                      }
                    />
                  </div>
                )}
              </div>


              {loading && (
                <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Loader2
                      size={17}
                      className="animate-spin text-blue-600"
                    />

                    Loading operational records...
                  </div>
                </div>
              )}


              {!loading &&
                error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex items-start gap-2">
                    <XCircle
                      size={17}
                      className="mt-0.5 text-rose-600"
                    />

                    <div className="text-xs font-bold text-rose-700">
                      {error}
                    </div>
                  </div>
                </div>
              )}


              {!loading &&
                !error && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-slate-700">
                        Operational Records
                      </div>

                      <div className="text-[10px] font-semibold text-slate-400">
                        {records.length}{' '}
                        record
                        {records.length ===
                        1
                          ? ''
                          : 's'}
                      </div>
                    </div>
                  </div>


                  {records.length ? (
                    <div className="space-y-3">
                      {records.map(
                        (
                          record,
                          index
                        ) => (
                          <RecordCard
                            key={
                              record.item
                                ?.id ||
                              `${record.section}-${index}`
                            }
                            record={
                              record
                            }
                          />
                        )
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                      <FileText
                        size={28}
                        className="mx-auto text-slate-300"
                      />

                      <div className="mt-2 text-xs font-black text-slate-600">
                        No underlying records found
                      </div>

                      <div className="mt-1 text-[10px] font-semibold text-slate-400">
                        No records match this component, period and operational status.
                      </div>
                    </div>
                  )}


                  {!!qcHistory.length && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          size={16}
                          className="text-indigo-600"
                        />

                        <div>
                          <div className="text-xs font-black text-slate-800">
                            QC Review / Resubmission History
                          </div>

                          <div className="text-[10px] font-semibold text-slate-400">
                            Immutable QC review attempts
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {qcHistory.map(
                          (
                            event: any,
                            index: number
                          ) => (
                            <div
                              key={
                                event.id ||
                                index
                              }
                              className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-[10px] font-black text-slate-700">
                                  Attempt #{event.attemptNumber || index + 1}
                                </div>

                                {event.decision && (
                                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${statusClass(
                                    String(
                                      event.decision
                                    )
                                  )}`}>
                                    {humanize(
                                      String(
                                        event.decision
                                      )
                                    )}
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 text-[10px] font-semibold text-slate-400">
                                {event.sourceModule &&
                                  `${humanize(
                                    String(
                                      event.sourceModule
                                    )
                                  )} · `}

                                {formatDate(
                                  event.reviewedAt ||
                                  event.createdAt
                                )}
                              </div>

                              {(event.remark ||
                                event.comment ||
                                event.reason) && (
                                <div className="mt-2 text-[11px] font-semibold text-slate-600">
                                  {event.remark ||
                                    event.comment ||
                                    event.reason}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}