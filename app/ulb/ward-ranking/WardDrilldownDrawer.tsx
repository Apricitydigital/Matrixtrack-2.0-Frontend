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
  Eye,
} from 'lucide-react';
import {
  ModuleRecordsApi,
  ToiletApi,
} from '@lib/apiClient';

import {
  DetailModal,
} from '../inspection-performance/InspectionPerformanceWorkspace';
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
    'CHECKED',
    'NOT_CHECKED',
    'IN_PROGRESS',
    'PENDING_QC',
    'APPROVED',
    'REJECTED',
  ],

  TOILET: [
    'CHECKED',
    'NOT_CHECKED',
    'PENDING_QC',
    'APPROVED',
    'REJECTED',
  ],

  LITTERBIN: [
    'CHECKED',
    'NOT_CHECKED',
    'PENDING_QC',
    'APPROVED',
    'REJECTED',
  ],

  SUPERVISOR: [
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
  ],

  ACTION_OFFICER: [
    'ASSIGNED',
    'COMPLETED',
  ],
};

const AO_PENDING_STATUSES =
  new Set([
    'ASSIGNED',
    'ACKNOWLEDGED',
    'IN_PROGRESS',
    'OVERDUE',
    'CLOSURE_REJECTED',
    'REOPENED',
  ]);


const AO_ACTION_TAKEN_STATUSES =
  new Set([
    'COMPLETED',
    'CLOSED',
  ]);

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


function operationalStatusLabel(
  component: WardRankingComponent,
  status: WardOperationalStatus
) {
  if (
    component ===
    'ACTION_OFFICER'
  ) {
    if (
      status === 'ASSIGNED'
    ) {
      return 'Pending';
    }

    if (
      status === 'COMPLETED'
    ) {
      return 'Action Taken';
    }
  }
  if (
    component === 'BEAT' ||
    component === 'TOILET' ||
    component === 'LITTERBIN'
  ) {
    const labels: Partial<
      Record<WardOperationalStatus, string>
    > = {
      CHECKED: 'Submitted',
      NOT_CHECKED: 'Not Submitted',
      IN_PROGRESS: 'In Progress',
      PENDING_QC: 'QC Pending',
      APPROVED: 'QC Approved',
      REJECTED: 'QC Rejected',
    };

    return labels[status] || humanize(status);
  }

  return humanize(status);
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
      'ASSIGNED',
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

function displayedRecordStatuses(
  record: FlatRecord
) {
  const raw =
    recordStatuses(
      record.item
    ).map(
      (status) =>
        String(status)
          .toUpperCase()
    );


  /*
   * ==========================================
   * ACTION OFFICER
   * ==========================================
   *
   * Ward Ranking exposes only:
   *
   * Pending
   * Action Taken
   *
   * Detailed task states remain available
   * internally.
   */
  if (
    record.section ===
    'Action Officer Task'
  ) {
    const taskStatus =
      String(
        record.item?.status ||
        ''
      )
        .trim()
        .toUpperCase();


    if (
      AO_ACTION_TAKEN_STATUSES
        .has(
          taskStatus
        )
    ) {
      return [
        'COMPLETED',
      ];
    }


    return [
      'ASSIGNED',
    ];
  }


  /*
   * ==========================================
   * QC
   * ==========================================
   *
   * QC page should show one QC business state,
   * not "Submitted + QC Rejected".
   */
  if (
    record.section ===
    'Sweeping QC' ||
    record.section ===
    'Toilet QC' ||
    record.section ===
    'Litter Bin QC'
  ) {

    if (
      raw.includes(
        'APPROVED'
      )
    ) {
      return [
        'APPROVED',
      ];
    }


    if (
      raw.includes(
        'REJECTED'
      )
    ) {
      return [
        'REJECTED',
      ];
    }


    return [
      'PENDING_QC',
    ];
  }


  /*
   * ==========================================
   * TOILET
   * ==========================================
   */
  if (
    record.section ===
    'Toilet Obligation'
  ) {
    return [
      'NOT_CHECKED',
    ];
  }


  if (
    record.section ===
    'Toilet Inspection'
  ) {
    const statuses:
      string[] = [
        'SUBMITTED',
      ];


    if (
      raw.includes(
        'PENDING_QC'
      )
    ) {
      statuses.push(
        'PENDING_QC'
      );

      return statuses;
    }


    if (
      raw.includes(
        'APPROVED'
      )
    ) {
      statuses.push(
        'APPROVED'
      );

      return statuses;
    }


    if (
      raw.includes(
        'REJECTED'
      )
    ) {
      statuses.push(
        'REJECTED'
      );

      return statuses;
    }


    return statuses;
  }


  /*
   * ==========================================
   * LITTER BIN
   * ==========================================
   */
  if (
    record.section ===
    'Litter Bin Obligation'
  ) {
    return [
      'NOT_CHECKED',
    ];
  }


  if (
    record.section ===
    'Litter Bin Report'
  ) {
    const statuses:
      string[] = [
        'SUBMITTED',
      ];


    if (
      raw.includes(
        'PENDING_QC'
      )
    ) {
      statuses.push(
        'PENDING_QC'
      );

      return statuses;
    }


    if (
      raw.includes(
        'APPROVED'
      )
    ) {
      statuses.push(
        'APPROVED'
      );

      return statuses;
    }


    if (
      raw.includes(
        'REJECTED'
      )
    ) {
      statuses.push(
        'REJECTED'
      );

      return statuses;
    }


    return statuses;
  }


  return raw;
}


function displayedRecordStatusLabel(
  record: FlatRecord,
  status: string
) {
  if (
    record.section ===
    'Action Officer Task'
  ) {
    return (
      status.toUpperCase() ===
        'COMPLETED'
        ? 'Action Taken'
        : 'Pending'
    );
  }
  if (
    record.section === 'Toilet Obligation' ||
    record.section === 'Toilet Inspection' ||
    record.section === 'Toilet Report' ||
    record.section === 'Sweeping Report' ||
    record.section === 'Sweeping QC' ||
    record.section === 'Toilet QC' ||
    record.section === 'Litter Bin QC' ||
    record.section === 'Litter Bin Obligation' ||
    record.section === 'Litter Bin Report'
  ) {
    switch (
    status.toUpperCase()
    ) {
      case 'NOT_CHECKED':
        return 'Not Submitted';

      case 'SUBMITTED':
        return 'Submitted';

      case 'PENDING_QC':
        return 'QC Pending';

      case 'APPROVED':
        return 'QC Approved';

      case 'REJECTED':
        return 'QC Rejected';
    }
  }


  return humanize(
    status
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
function recordSupervisorId(
  item: any
) {
  return (
    item?.supervisorId ||
    item?.submittedById ||
    item?.createdBy ||
    item?.supervisor?.id ||
    item?.submittedBy?.id ||
    item?.createdByUser?.id ||
    null
  );
}


function supervisorRowKey(
  row: any
) {
  if (row?.supervisorId) {
    return `SUPERVISOR:${row.supervisorId}`;
  }

  return `FALLBACK:${String(
    row?.supervisorName ||
    'UNASSIGNED'
  )}`;
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
type ReportModule =
  | 'TOILET'
  | 'LITTERBINS'
  | 'SWEEPING';


function reportModuleForRecord(
  record: FlatRecord
): ReportModule | null {

  /*
   * Action Officer tasks point to the
   * original operational report through
   * moduleKey + sourceRecordId.
   */
  if (
    record?.section ===
    'Action Officer Task'
  ) {
    const moduleKey =
      String(
        record?.item?.moduleKey ||
        ''
      )
        .trim()
        .toUpperCase();


    if (
      moduleKey === 'TOILET'
    ) {
      return 'TOILET';
    }


    if (
      moduleKey === 'LITTERBINS' ||
      moduleKey === 'LITTERBIN'
    ) {
      return 'LITTERBINS';
    }


    if (
      moduleKey === 'SWEEPING'
    ) {
      return 'SWEEPING';
    }


    return null;
  }


  const section =
    String(
      record?.section || ''
    ).toUpperCase();


  if (
    section.includes(
      'TOILET'
    )
  ) {
    return 'TOILET';
  }


  if (
    section.includes(
      'LITTER BIN'
    )
  ) {
    return 'LITTERBINS';
  }


  if (
    section.includes(
      'SWEEPING'
    )
  ) {
    return 'SWEEPING';
  }


  return null;
}


function reportModuleLabel(
  moduleKey: ReportModule
) {
  if (
    moduleKey === 'TOILET'
  ) {
    return 'Cleanliness of Toilets';
  }

  if (
    moduleKey === 'LITTERBINS'
  ) {
    return 'Litter Bins';
  }

  return 'Sweeping';
}

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
    const obligations =
      Array.isArray(
        data.obligations
      )
        ? data.obligations
        : [];

    const inspections =
      Array.isArray(
        data.inspections
      )
        ? data.inspections
        : [];


    /*
     * Toilet IDs that already have a submitted
     * inspection for this operational period.
     */
    const inspectedToiletIds =
      new Set(
        inspections
          .map(
            (item: any) =>
              item?.toiletId ||
              item?.toilet?.id ||
              item?.assetId ||
              null
          )
          .filter(Boolean)
          .map(String)
      );


    /*
     * Keep an obligation card only when that
     * toilet has NOT been inspected.
     */
    const pendingObligations =
      obligations.filter(
        (item: any) => {
          const toiletId =
            item?.toiletId ||
            item?.toilet?.id ||
            item?.assetId ||
            item?.id ||
            null;

          if (!toiletId) {
            return true;
          }

          return !inspectedToiletIds.has(
            String(
              toiletId
            )
          );
        }
      );


    return [
      ...pendingObligations.map(
        (item: any) => ({
          section:
            'Toilet Obligation',

          item,
        })
      ),

      ...inspections.map(
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
    const obligations =
      Array.isArray(data.obligations)
        ? data.obligations
        : [];

    const reports =
      Array.isArray(data.reports)
        ? data.reports
        : [];


    const submittedBinIds =
      new Set(
        reports
          .map(
            (item: any) =>
              item?.binId ||
              item?.bin?.id ||
              item?.assetId ||
              null
          )
          .filter(Boolean)
          .map(String)
      );


    const pendingObligations =
      obligations.filter(
        (item: any) => {
          const binId =
            item?.binId ||
            item?.bin?.id ||
            item?.assetId ||
            item?.id ||
            null;

          if (!binId) {
            return true;
          }

          return !submittedBinIds.has(
            String(binId)
          );
        }
      );


    return [
      ...pendingObligations.map(
        (item: any) => ({
          section:
            'Litter Bin Obligation',
          item,
        })
      ),

      ...reports.map(
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
  onOpen,
}: {
  record: FlatRecord;

  onOpen?: (
    record: FlatRecord
  ) => void;
}) {
  const {
    item,
    section,
  } = record;

  const statuses =
    displayedRecordStatuses(
      record
    );

  const actor =
    recordActor(item);

  const time =
    recordTimestamp(item);
  const reportModule =
    reportModuleForRecord(
      record
    );

  const sourceRecordId =
    section ===
      'Action Officer Task'
      ? item?.sourceRecordId
      : item?.id;


  const canOpen =
    Boolean(
      reportModule &&
      sourceRecordId &&
      onOpen
    );
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

  const compactInspectionRecord =
    section === 'Toilet Obligation' ||
    section === 'Toilet Inspection' ||
    section === 'Litter Bin Obligation' ||
    section === 'Litter Bin Report';

  return (
    <div
      className={`border border-slate-200 bg-white shadow-sm ${compactInspectionRecord
        ? 'rounded-xl px-3 py-2.5'
        : 'rounded-2xl p-4'
        }`}
    >
      <div
        className={`flex gap-3 ${compactInspectionRecord
          ? 'items-center justify-between'
          : 'flex-col sm:flex-row sm:items-start sm:justify-between'
          }`}
      >
        <div className="min-w-0">
          <div
            className={`font-black uppercase tracking-wider text-blue-600 ${compactInspectionRecord
              ? 'text-[7px]'
              : 'text-[9px]'
              }`}
          >
            {section}
          </div>

          <div
            className={`font-black text-slate-900 ${compactInspectionRecord
              ? 'mt-0.5 text-xs'
              : 'mt-1 text-sm'
              }`}
          >
            {recordTitle(
              item
            )}
          </div>

          {(actor || time) && (
            <div
              className={`flex flex-wrap gap-x-4 gap-y-1 font-semibold text-slate-400 ${compactInspectionRecord
                ? 'mt-1 text-[8px]'
                : 'mt-2 text-[10px]'
                }`}
            >

              {actor && (
                <span className="inline-flex items-center gap-1">
                  <User size={11} />
                  {actor}
                </span>
              )}

              {time && (
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={11} />
                  {formatDate(time)}
                </span>
              )}

            </div>
          )}
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
                  {displayedRecordStatusLabel(
                    record,
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
      {canOpen && (
        <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() =>
              onOpen?.(
                record
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-[10px] font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
          >
            <Eye
              size={13}
            />

            Open Report

            <span>
              →
            </span>
          </button>
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
    selectedSupervisorId,
    setSelectedSupervisorId,
  ] =
    useState<
      string |
      null
    >(
      null
    );
  const [
    error,
    setError,
  ] =
    useState('');
  const [
    selectedReport,
    setSelectedReport,
  ] =
    useState<any | null>(
      null
    );

  const [
    detailView,
    setDetailView,
  ] = useState<
    'OVERVIEW' | 'GUIDE'
  >('OVERVIEW');
  const [
    reportDetailLoading,
    setReportDetailLoading,
  ] =
    useState(false);


  const [
    reportImagePreview,
    setReportImagePreview,
  ] =
    useState<
      string |
      null
    >(
      null
    );

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
      setDetailView(
        'OVERVIEW'
      );

      setSelectedSupervisorId(
        null
      );
      setSelectedReport(
        null
      );

      setReportImagePreview(
        null
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
                    status === 'ALL' ||
                      selectedComponent === 'BEAT' ||
                      selectedComponent === 'ACTION_OFFICER'
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

  const supervisorBreakdown =
    useMemo(
      () => {
        if (
          selectedComponent !==
          'SUPERVISOR'
        ) {
          return [];
        }

        const rows =
          payload?.data
            ?.supervisorBreakdown;

        return Array.isArray(
          rows
        )
          ? rows
          : [];
      },

      [
        selectedComponent,
        payload,
      ]
    );

  const beatBreakdown =
    useMemo(
      () => {
        if (
          selectedComponent !==
          'BEAT'
        ) {
          return [];
        }

        const rows =
          payload?.data
            ?.beatBreakdown;

        return Array.isArray(
          rows
        )
          ? rows
          : [];
      },

      [
        selectedComponent,
        payload,
      ]
    );
  const filteredBeatBreakdown =
    useMemo(
      () => {
        if (
          selectedComponent !== 'BEAT' ||
          status === 'ALL'
        ) {
          return beatBreakdown;
        }


        return beatBreakdown.filter(
          (row: any) => {
            const progressStatus =
              String(
                row.progressStatus || ''
              )
                .trim()
                .toUpperCase();


            switch (status) {

              case 'CHECKED':
                return Number(
                  row.submittedReports || 0
                ) > 0;


              case 'NOT_CHECKED':
                return (
                  Number(
                    row.submittedReports || 0
                  ) === 0 &&
                  progressStatus !==
                  'IN_PROGRESS'
                );


              case 'IN_PROGRESS':
                return (
                  progressStatus ===
                  'IN_PROGRESS'
                );


              case 'PENDING_QC':
                return Number(
                  row.qcPending || 0
                ) > 0;


              case 'APPROVED':
                return Number(
                  row.qcApproved || 0
                ) > 0;


              case 'REJECTED':
                return Number(
                  row.qcRejected || 0
                ) > 0;


              default:
                return true;
            }
          }
        );
      },

      [
        beatBreakdown,
        selectedComponent,
        status,
      ]
    );
  const selectedSupervisor =
    useMemo(
      () => {
        if (
          !selectedSupervisorId
        ) {
          return null;
        }

        return (
          supervisorBreakdown.find(
            (row: any) =>
              row.supervisorId ===
              selectedSupervisorId
          ) ||
          null
        );
      },

      [
        supervisorBreakdown,
        selectedSupervisorId,
      ]
    );


  const visibleRecords =
    useMemo(
      () => {

        /*
         * Supervisor report filtering.
         */
        if (
          selectedComponent ===
          'SUPERVISOR' &&
          selectedSupervisorId
        ) {
          return records.filter(
            (record) =>
              recordSupervisorId(
                record.item
              ) ===
              selectedSupervisorId
          );
        }


        /*
         * Action Officer grouped filters.
         */
        if (
          selectedComponent ===
          'ACTION_OFFICER' &&
          status !== 'ALL'
        ) {
          return records.filter(
            (record) => {

              const taskStatus =
                String(
                  record.item?.status ||
                  ''
                )
                  .trim()
                  .toUpperCase();


              /*
               * UI Pending
               */
              if (
                status ===
                'ASSIGNED'
              ) {
                return (
                  AO_PENDING_STATUSES
                    .has(
                      taskStatus
                    )
                );
              }


              /*
               * UI Action Taken
               */
              if (
                status ===
                'COMPLETED'
              ) {
                return (
                  AO_ACTION_TAKEN_STATUSES
                    .has(
                      taskStatus
                    )
                );
              }


              return true;
            }
          );
        }


        return records;
      },

      [
        records,
        selectedComponent,
        selectedSupervisorId,
        status,
      ]
    );
  const showOperationalRecords =
    selectedComponent !== 'BEAT' &&
    selectedComponent !== 'WORKFORCE' &&
    (
      selectedComponent !== 'SUPERVISOR' ||
      Boolean(
        selectedSupervisorId
      )
    );


  const isInspectionComponent =
    selectedComponent === 'TOILET' ||
    selectedComponent === 'LITTERBIN';


  const inspectionModuleLabel =
    selectedComponent === 'LITTERBIN'
      ? 'Litter Bin'
      : 'Toilet';


  const inspectionMetrics: any =
    selectedScore?.metrics || {};


  const totalInspections =
    selectedComponent === 'LITTERBIN'
      ? Number(
        inspectionMetrics.binsDue || 0
      )
      : Number(
        inspectionMetrics.toiletsDue || 0
      );


  const submittedInspections =
    selectedComponent === 'LITTERBIN'
      ? Number(
        inspectionMetrics.binsChecked || 0
      )
      : Number(
        inspectionMetrics.toiletsChecked || 0
      );





  const evidenceMatchedChecks =
    Number(
      inspectionMetrics
        .evidenceMatchedChecks || 0
    );


  const evidenceEvaluatedChecks =
    Number(
      inspectionMetrics
        .evidenceEvaluatedChecks || 0
    );


  const evidenceQualityPercent =
    Number(
      inspectionMetrics
        .evidenceQualityPercent || 0
    );
  const beatMetrics: any =
    selectedComponent === 'BEAT'
      ? selectedScore?.metrics || {}
      : {};


  const totalBeats =
    Number(
      beatMetrics.totalBeats || 0
    );


  const beatReportsDue =
    Number(
      beatMetrics.beatsDue || 0
    );


  const beatReportsSubmitted =
    Number(
      beatMetrics.beatsChecked || 0
    );


  const beatReportsNotSubmitted =
    Number(
      beatMetrics.beatsNotChecked || 0
    );


  /*
 * Beat progress is intentionally derived from the
 * drill-down rows.
 *
 * Reason:
 * - Ward score metrics focus on submitted/scorable work.
 * - beatBreakdown also contains partial DRAFT progress.
 *
 * A DRAFT Beat must be visible as "In Progress",
 * but must NOT increase Submitted or the Beat score.
 */
  const beatProgressSummary =
    useMemo(
      () => {
        const rows =
          Array.isArray(
            beatBreakdown
          )
            ? beatBreakdown
            : [];


        const totalPoints =
          rows.reduce(
            (
              total: number,
              row: any
            ) =>
              total +
              Math.max(
                0,
                Number(
                  row.expectedPoints || 0
                )
              ),
            0
          );


        const capturedPoints =
          rows.reduce(
            (
              total: number,
              row: any
            ) =>
              total +
              Math.max(
                0,
                Number(
                  row.pointsCaptured || 0
                )
              ),
            0
          );


        const inProgress =
          rows.filter(
            (row: any) =>
              String(
                row.progressStatus || ''
              )
                .trim()
                .toUpperCase() ===
              'IN_PROGRESS'
          ).length;


        return {
          totalPoints,
          capturedPoints,
          inProgress,
        };
      },
      [
        beatBreakdown,
      ]
    );


  const beatsInProgress =
    beatProgressSummary
      .inProgress;


  const totalBeatPoints =
    beatProgressSummary
      .totalPoints;


  const beatPointsCaptured =
    beatProgressSummary
      .capturedPoints;





  const beatPointProgressPercent =
    totalBeatPoints > 0
      ? Math.min(
        100,
        (
          beatPointsCaptured /
          totalBeatPoints
        ) * 100
      )
      : 0;
  /*
* =====================================================
* WORKFORCE OVERVIEW
* =====================================================
*/

  const workforceData: any =
    selectedComponent ===
      'WORKFORCE'
      ? payload?.data || {}
      : {};


  const workforceMetrics: any =
    selectedComponent ===
      'WORKFORCE'
      ? selectedScore?.metrics || {}
      : {};


  const workforceComponents: any =
    selectedComponent ===
      'WORKFORCE'
      ? selectedScore?.components || {}
      : {};


  const workforceEmployees =
    Array.isArray(
      workforceData.employees
    )
      ? workforceData.employees
      : [];


  const workforceSupervisors =
    Array.isArray(
      workforceData.supervisors
    )
      ? workforceData.supervisors
      : [];


  const workforceAssignments =
    Array.isArray(
      workforceData.assignments
    )
      ? workforceData.assignments
      : [];


  const workforceBeats =
    Array.isArray(
      workforceData.beats
    )
      ? workforceData.beats
      : [];


  const workforceToilets =
    Array.isArray(
      workforceData.toilets
    )
      ? workforceData.toilets
      : [];


  const workforceBins =
    Array.isArray(
      workforceData.bins
    )
      ? workforceData.bins
      : [];


  const workforceAttendance =
    Array.isArray(
      workforceData.attendance
    )
      ? workforceData.attendance
      : [];


  const workforceAttendanceByUser =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            any[]
          >();


        if (
          selectedComponent !==
          'WORKFORCE'
        ) {
          return map;
        }


        const rows =
          Array.isArray(
            (payload?.data as any)
              ?.attendance
          )
            ? (payload?.data as any)
              .attendance
            : [];


        for (
          const row
          of rows
        ) {
          const userId =
            String(
              row?.matchedUserId ||
              ''
            );


          if (!userId) {
            continue;
          }


          const existing =
            map.get(
              userId
            ) || [];


          existing.push(
            row
          );


          map.set(
            userId,
            existing
          );
        }


        return map;
      },

      [
        selectedComponent,
        payload,
      ]
    );


  const workforceAbsent =
    Math.max(
      Number(
        workforceMetrics
          .manpowerScheduled || 0
      ) -
      Number(
        workforceMetrics
          .present || 0
      ),
      0
    );


  const workforceSupervisorsAbsent =
    Math.max(
      Number(
        workforceMetrics
          .supervisorsScheduled ||
        0
      ) -
      Number(
        workforceMetrics
          .supervisorsAvailable ||
        0
      ),
      0
    );


  const workforceMannedBeats =
    Math.max(
      Number(
        workforceMetrics
          .beatDeploymentOpportunities ||
        0
      ) -
      Number(
        workforceMetrics
          .unmannedBeats || 0
      ),
      0
    );


  const workforceAssignmentTags =
    (
      userId: string
    ) => {
      const tags =
        new Set<string>();


      if (
        workforceAssignments.some(
          (row: any) =>
            String(
              row.employeeId
            ) ===
            String(
              userId
            )
        )
      ) {
        tags.add(
          'Ward Assignment'
        );
      }


      if (
        workforceBeats.some(
          (beat: any) =>
            (
              beat.segments ||
              []
            ).some(
              (segment: any) =>
                String(
                  segment
                    .employeeAssignedToId
                ) ===
                String(
                  userId
                )
            )
        )
      ) {
        tags.add(
          'Sweeping'
        );
      }


      if (
        workforceToilets.some(
          (toilet: any) =>
            (
              toilet
                .assignedEmployeeIds ||
              []
            )
              .map(String)
              .includes(
                String(
                  userId
                )
              )
        )
      ) {
        tags.add(
          'Toilet'
        );
      }


      if (
        workforceBins.some(
          (bin: any) =>
            (
              bin
                .assignedEmployeeIds ||
              []
            )
              .map(String)
              .includes(
                String(
                  userId
                )
              )
        )
      ) {
        tags.add(
          'Litter Bin'
        );
      }


      return Array.from(
        tags
      );
    };
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

  async function openOperationalReport(
    record: FlatRecord
  ) {
    const moduleKey =
      reportModuleForRecord(
        record
      );

    const sourceRecordId =
      record.section ===
        'Action Officer Task'
        ? record.item?.sourceRecordId
        : record.item?.id;


    if (
      !moduleKey ||
      !sourceRecordId
    ) {
      return;
    }


    /*
     * Start immediately with the compact Ward Ranking
     * record so the modal opens without waiting.
     */
    const baseReport = {
      ...record.item,

      /*
       * DetailModal must operate on the
       * original report, not the AO task id.
       */
      id:
        sourceRecordId,

      actionOfficerTaskId:
        record.section ===
          'Action Officer Task'
          ? record.item?.id
          : null,

      dashboardModule:
        moduleKey,

      dashboardModuleLabel:
        reportModuleLabel(
          moduleKey
        ),
    };


    setSelectedReport(
      baseReport
    );

    setReportDetailLoading(
      true
    );


    try {

      /*
       * Toilet already has a dedicated detail API.
       * This is the same hydration approach used by
       * Inspection & Performance.
       */
      if (
        moduleKey ===
        'TOILET'
      ) {
        const response =
          await ToiletApi
            .getInspectionDetails(
              sourceRecordId
            );


        if (
          response?.inspection
        ) {
          setSelectedReport({
            ...baseReport,

            ...response.inspection,

            dashboardModule:
              moduleKey,

            dashboardModuleLabel:
              reportModuleLabel(
                moduleKey
              ),
          });
        }

        return;
      }


      /*
       * Sweeping and Litter Bin use their existing
       * HISTORY records.
       *
       * This avoids creating another backend report
       * detail API just for Ward Ranking.
       */
      const response =
        await ModuleRecordsApi
          .getRecords(
            moduleKey,
            {
              page: 1,
              limit: 500,

              /*
               * Sweeping Ward Ranking can open a report
               * while it is still Pending QC.
               *
               * HISTORY for ULB contains mainly
               * QC-processed reports, so use ALL here
               * to hydrate the exact Sweeping record.
               */
              tab:
                moduleKey === 'SWEEPING'
                  ? 'ALL'
                  : 'HISTORY',
            }
          );


      const fullRecord =
        (
          response?.data ||
          []
        ).find(
          (item: any) =>
            String(
              item?.id
            ) ===
            String(
              sourceRecordId
            )
        );


      if (
        fullRecord
      ) {
        setSelectedReport({
          ...baseReport,

          ...fullRecord,

          dashboardModule:
            moduleKey,

          dashboardModuleLabel:
            reportModuleLabel(
              moduleKey
            ),
        });
      }

    } catch (
    err
    ) {
      /*
       * Keep the compact record visible even if
       * hydration fails.
       */
      console.warn(
        'Unable to hydrate Ward Ranking report detail',
        err
      );
    } finally {
      setReportDetailLoading(
        false
      );
    }
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

                      setSelectedSupervisorId(
                        null
                      );

                      setDetailView(
                        'OVERVIEW'
                      );
                    }}
                    className={`rounded-xl border p-3 text-left transition ${active
                      ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                      : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                      } ${!score?.applicable
                        ? 'cursor-not-allowed opacity-50'
                        : ''
                      }`}
                  >
                    <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                      {component.label}
                    </div>

                    <div className={`mt-1 text-sm font-black ${active
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
                  {(
                    selectedComponent === 'BEAT' ||
                    selectedComponent === 'TOILET' ||
                    selectedComponent === 'LITTERBIN' ||
                    selectedComponent === 'SUPERVISOR' ||
                    selectedComponent === 'QC' ||
                    selectedComponent ===
                    'ACTION_OFFICER'
                  ) && (
                      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">

                        <button
                          type="button"
                          onClick={() =>
                            setDetailView(
                              'OVERVIEW'
                            )
                          }
                          className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition ${detailView === 'OVERVIEW'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                          Overview
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDetailView(
                              'GUIDE'
                            )
                          }
                          className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition ${detailView === 'GUIDE'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                          Scoring Guide
                        </button>

                      </div>
                    )}
                  {detailView === 'OVERVIEW' &&
                    selectedComponent !== 'SUPERVISOR' &&
                    !!STATUS_OPTIONS[
                      selectedComponent
                    ]?.length && (
                      <select
                        value={status}
                        onChange={(event) => {
                          setStatus(
                            event.target.value as
                            | 'ALL'
                            | WardOperationalStatus
                          );
                        }}
                        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="ALL">
                          {selectedComponent ===
                            'ACTION_OFFICER'
                            ? 'All Actions'

                            : selectedComponent === 'BEAT' ||
                              selectedComponent === 'TOILET' ||
                              selectedComponent === 'LITTERBIN' ||
                              selectedComponent === 'QC'
                              ? 'All Reports'

                              : 'All Operational Statuses'}
                        </option>

                        {STATUS_OPTIONS[
                          selectedComponent
                        ]!.map((option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {operationalStatusLabel(
                              selectedComponent,
                              option
                            )}
                          </option>
                        ))}
                      </select>
                    )}


                </div>


                {selectedScore?.metrics &&
                  detailView === 'OVERVIEW' && (

                    <div className="mt-4">

                      {selectedComponent === 'WORKFORCE' ? (

                        <div className="space-y-3">

                          {/* ===================================== */}
                          {/* EMPLOYEE ATTENDANCE */}
                          {/* ===================================== */}

                          <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">

                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                                Assigned Employees
                              </div>

                              <div className="mt-0.5 text-lg font-black text-slate-900">
                                {workforceEmployees.length}
                              </div>

                              <div className="text-[7px] font-semibold text-slate-400">
                                Unique employees
                              </div>
                            </div>


                            <div className="rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-blue-500">
                                Attendance Expected
                              </div>

                              <div className="mt-0.5 text-lg font-black text-blue-700">
                                {Number(
                                  workforceMetrics
                                    .manpowerScheduled || 0
                                )}
                              </div>

                              <div className="text-[7px] font-semibold text-slate-400">
                                Employee-day opportunities
                              </div>
                            </div>


                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-600">
                                Present
                              </div>

                              <div className="mt-0.5 text-lg font-black text-emerald-700">
                                {Number(
                                  workforceMetrics
                                    .present || 0
                                )}
                              </div>
                            </div>


                            <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-rose-600">
                                Absent
                              </div>

                              <div className="mt-0.5 text-lg font-black text-rose-700">
                                {workforceAbsent}
                              </div>
                            </div>


                            <div className="rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-violet-600">
                                Deployment
                              </div>

                              <div className="mt-0.5 text-lg font-black text-violet-700">
                                {Number(
                                  workforceMetrics
                                    .deploymentCompliancePercent ||
                                  0
                                ).toFixed(1)}
                                %
                              </div>

                              <div className="text-[7px] font-semibold text-slate-400">
                                Assigned & present
                              </div>
                            </div>

                          </div>


                          {/* ===================================== */}
                          {/* SUPERVISOR + BEAT MANPOWER */}
                          {/* ===================================== */}

                          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">

                            {/* SUPERVISORS */}
                            <div className="rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-3">

                              <div className="flex items-start justify-between gap-3">

                                <div>
                                  <div className="text-[8px] font-black uppercase tracking-[0.1em] text-blue-600">
                                    Supervisor Availability
                                  </div>

                                  <div className="mt-1 text-xl font-black text-slate-900">
                                    {Number(
                                      workforceMetrics
                                        .supervisorAvailabilityPercent ||
                                      0
                                    ).toFixed(1)}
                                    %
                                  </div>
                                </div>


                                <div className="text-right">
                                  <div className="text-sm font-black text-slate-700">
                                    {Number(
                                      workforceMetrics
                                        .supervisorsAvailable ||
                                      0
                                    )}
                                    {' / '}
                                    {Number(
                                      workforceMetrics
                                        .supervisorsScheduled ||
                                      0
                                    )}
                                  </div>

                                  <div className="text-[7px] font-black uppercase text-slate-400">
                                    Present / Expected
                                  </div>
                                </div>

                              </div>


                              <div className="mt-3 grid grid-cols-3 gap-2">

                                <div className="rounded-lg bg-white px-2 py-2 text-center ring-1 ring-blue-100">
                                  <div className="text-[7px] font-black uppercase text-slate-400">
                                    Assigned
                                  </div>

                                  <div className="mt-0.5 text-sm font-black text-slate-800">
                                    {workforceSupervisors.length}
                                  </div>
                                </div>


                                <div className="rounded-lg bg-emerald-50 px-2 py-2 text-center">
                                  <div className="text-[7px] font-black uppercase text-emerald-600">
                                    Present
                                  </div>

                                  <div className="mt-0.5 text-sm font-black text-emerald-700">
                                    {Number(
                                      workforceMetrics
                                        .supervisorsAvailable ||
                                      0
                                    )}
                                  </div>
                                </div>


                                <div className="rounded-lg bg-rose-50 px-2 py-2 text-center">
                                  <div className="text-[7px] font-black uppercase text-rose-600">
                                    Absent
                                  </div>

                                  <div className="mt-0.5 text-sm font-black text-rose-700">
                                    {workforceSupervisorsAbsent}
                                  </div>
                                </div>

                              </div>

                            </div>


                            {/* BEATS */}
                            <div className="rounded-xl border border-cyan-100 bg-cyan-50/30 px-3 py-3">

                              <div className="flex items-start justify-between gap-3">

                                <div>
                                  <div className="text-[8px] font-black uppercase tracking-[0.1em] text-cyan-600">
                                    Beat Manpower Coverage
                                  </div>

                                  <div className="mt-1 text-xl font-black text-slate-900">
                                    {Number(
                                      workforceMetrics
                                        .mannedBeatPercent ||
                                      0
                                    ).toFixed(1)}
                                    %
                                  </div>
                                </div>


                                <div className="text-right">
                                  <div className="text-sm font-black text-slate-700">
                                    {workforceMannedBeats}
                                    {' / '}
                                    {Number(
                                      workforceMetrics
                                        .beatDeploymentOpportunities ||
                                      0
                                    )}
                                  </div>

                                  <div className="text-[7px] font-black uppercase text-slate-400">
                                    Manned / Expected
                                  </div>
                                </div>

                              </div>


                              <div className="mt-3 grid grid-cols-3 gap-2">

                                <div className="rounded-lg bg-white px-2 py-2 text-center ring-1 ring-cyan-100">
                                  <div className="text-[7px] font-black uppercase text-slate-400">
                                    Beats
                                  </div>

                                  <div className="mt-0.5 text-sm font-black text-slate-800">
                                    {workforceBeats.length}
                                  </div>
                                </div>


                                <div className="rounded-lg bg-emerald-50 px-2 py-2 text-center">
                                  <div className="text-[7px] font-black uppercase text-emerald-600">
                                    Manned
                                  </div>

                                  <div className="mt-0.5 text-sm font-black text-emerald-700">
                                    {workforceMannedBeats}
                                  </div>
                                </div>


                                <div className="rounded-lg bg-rose-50 px-2 py-2 text-center">
                                  <div className="text-[7px] font-black uppercase text-rose-600">
                                    Unmanned
                                  </div>

                                  <div className="mt-0.5 text-sm font-black text-rose-700">
                                    {Number(
                                      workforceMetrics
                                        .unmannedBeats || 0
                                    )}
                                  </div>
                                </div>

                              </div>

                            </div>

                          </div>

                        </div>

                      ) : selectedComponent === 'BEAT' ? (

                        <div className="space-y-3">

                          {/* ===================================== */}
                          {/* COMMON OPERATIONAL KPIs */}
                          {/* ===================================== */}

                          <div className="grid grid-cols-2 gap-2 xl:grid-cols-6">

                            {/* BEATS / EXPECTED */}
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                                Beats / Expected
                              </div>

                              <div className="mt-0.5 flex items-end gap-2">

                                <span className="text-lg font-black text-slate-900">
                                  {totalBeats}
                                </span>

                                <span className="pb-0.5 text-[8px] font-bold text-slate-400">
                                  Beats
                                </span>

                              </div>

                              <div className="mt-0.5 text-[8px] font-bold text-slate-400">
                                {beatReportsDue} expected reports
                              </div>

                            </div>


                            {/* SUBMITTED */}
                            <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-blue-500">
                                Submitted
                              </div>

                              <div className="mt-0.5 text-lg font-black text-blue-700">
                                {beatReportsSubmitted}
                              </div>

                            </div>


                            {/* NOT SUBMITTED */}
                            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-amber-600">
                                Not Submitted
                              </div>

                              <div className="mt-0.5 text-lg font-black text-amber-700">
                                {beatReportsNotSubmitted}
                              </div>

                            </div>


                            {/* QC PENDING */}
                            <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-amber-600">
                                QC Pending
                              </div>

                              <div className="mt-0.5 text-lg font-black text-amber-700">
                                {Number(
                                  beatMetrics.pendingQc || 0
                                )}
                              </div>

                            </div>


                            {/* QC APPROVED */}
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-600">
                                QC Approved
                              </div>

                              <div className="mt-0.5 text-lg font-black text-emerald-700">
                                {Number(
                                  beatMetrics.qcApproved || 0
                                )}
                              </div>

                            </div>


                            {/* QC REJECTED */}
                            <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-rose-600">
                                QC Rejected
                              </div>

                              <div className="mt-0.5 text-lg font-black text-rose-700">
                                {Number(
                                  beatMetrics.qcRejected || 0
                                )}
                              </div>

                            </div>

                          </div>


                          {/* ===================================== */}
                          {/* BEAT-SPECIFIC EVIDENCE */}
                          {/* ===================================== */}

                          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">

                            {/* TOTAL POINTS */}
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                                Total Points
                              </div>

                              <div className="mt-0.5 text-lg font-black text-slate-900">
                                {totalBeatPoints}
                              </div>

                            </div>


                            {/* EVIDENCE CAPTURED */}
                            <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-cyan-600">
                                Evidence Captured
                              </div>

                              <div className="mt-0.5 flex items-end gap-1.5">

                                <span className="text-lg font-black text-cyan-700">
                                  {beatPointsCaptured}
                                </span>

                                <span className="pb-0.5 text-[8px] font-black text-slate-400">
                                  / {totalBeatPoints}
                                </span>

                              </div>

                              <div className="text-[7px] font-semibold text-slate-400">
                                One image per point
                              </div>

                            </div>


                            {/* IN PROGRESS */}
                            <div className="rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-violet-600">
                                Beats In Progress
                              </div>

                              <div className="mt-0.5 text-lg font-black text-violet-700">
                                {beatsInProgress}
                              </div>

                            </div>


                            {/* INSPECTION COVERAGE */}
                            <div className="rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-blue-500">
                                Inspection Coverage
                              </div>

                              <div className="mt-0.5 flex items-end justify-between gap-2">

                                <span className="text-lg font-black text-blue-700">
                                  {Number(
                                    beatMetrics.coveragePercent || 0
                                  ).toFixed(1)}
                                  %
                                </span>

                                <span className="pb-0.5 text-[8px] font-black text-slate-400">
                                  {beatReportsSubmitted}/{beatReportsDue}
                                </span>

                              </div>

                            </div>

                          </div>


                          {/* POINT EVIDENCE PROGRESS */}
                          <div className="flex items-center justify-between rounded-xl border border-cyan-100 bg-cyan-50/30 px-3 py-2">

                            <div>

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-cyan-600">
                                Point Evidence Progress
                              </div>

                              <div className="mt-0.5 text-lg font-black text-slate-900">
                                {beatPointProgressPercent.toFixed(1)}
                                %
                              </div>

                            </div>


                            <div className="text-right">

                              <div className="text-xs font-black text-slate-700">
                                {beatPointsCaptured}
                                {' / '}
                                {totalBeatPoints}
                              </div>

                              <div className="text-[7px] font-black uppercase text-slate-400">
                                Points with evidence
                              </div>

                            </div>

                          </div>

                        </div>

                      ) : selectedComponent === 'SUPERVISOR' ? (

                        <div className="space-y-3">

                          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">

                            {/* TOTAL */}
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                                Total Reports
                              </div>

                              <div className="mt-0.5 text-lg font-black text-slate-900">
                                {Number(
                                  selectedScore.metrics.reportsDue || 0
                                )}
                              </div>
                            </div>


                            {/* SUBMITTED */}
                            <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-blue-500">
                                Submitted
                              </div>

                              <div className="mt-0.5 text-lg font-black text-blue-700">
                                {Number(
                                  selectedScore.metrics.reportsSubmitted || 0
                                )}
                              </div>
                            </div>


                            {/* PENDING */}
                            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-amber-600">
                                Pending
                              </div>

                              <div className="mt-0.5 text-lg font-black text-amber-700">
                                {Math.max(
                                  Number(
                                    selectedScore.metrics.reportsDue || 0
                                  ) -
                                  Number(
                                    selectedScore.metrics.reportsSubmitted || 0
                                  ),
                                  0
                                )}
                              </div>
                            </div>


                            {/* COVERAGE */}
                            <div className="rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-violet-600">
                                Submission Coverage
                              </div>

                              <div className="mt-0.5 flex items-end justify-between gap-2">

                                <div className="text-lg font-black text-violet-700">
                                  {Number(
                                    selectedScore.metrics
                                      .submissionCoveragePercent || 0
                                  ).toFixed(1)}
                                  %
                                </div>

                                <div className="pb-0.5 text-[8px] font-black text-slate-400">
                                  {Number(
                                    selectedScore.metrics.reportsSubmitted || 0
                                  )}
                                  /
                                  {Number(
                                    selectedScore.metrics.reportsDue || 0
                                  )}
                                </div>

                              </div>
                            </div>

                          </div>

                        </div>

                      ) : selectedComponent === 'TOILET' ? (

                        <div className="space-y-3">

                          {/* COMMON OPERATIONAL KPIs */}
                          <div className="grid grid-cols-2 gap-2 xl:grid-cols-6">

                            {/* ASSET / EXPECTED */}
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                                Toilets / Expected
                              </div>

                              <div className="mt-0.5 flex items-end gap-2">

                                <span className="text-lg font-black text-slate-900">
                                  {Number(
                                    selectedScore.metrics.totalToilets || 0
                                  )}
                                </span>

                                <span className="pb-0.5 text-[8px] font-bold text-slate-400">
                                  Toilets
                                </span>

                              </div>

                              <div className="mt-0.5 text-[8px] font-bold text-slate-400">
                                {Number(
                                  selectedScore.metrics.toiletsDue || 0
                                )}{' '}
                                expected inspections
                              </div>

                            </div>


                            {/* SUBMITTED */}
                            <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-blue-500">
                                Submitted
                              </div>

                              <div className="mt-0.5 text-lg font-black text-blue-700">
                                {Number(
                                  selectedScore.metrics.toiletsChecked || 0
                                )}
                              </div>
                            </div>


                            {/* NOT SUBMITTED */}
                            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-amber-600">
                                Not Submitted
                              </div>

                              <div className="mt-0.5 text-lg font-black text-amber-700">
                                {Number(
                                  selectedScore.metrics.toiletsNotChecked || 0
                                )}
                              </div>
                            </div>


                            {/* QC PENDING */}
                            <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-amber-600">
                                QC Pending
                              </div>

                              <div className="mt-0.5 text-lg font-black text-amber-700">
                                {Number(
                                  selectedScore.metrics.pendingQc || 0
                                )}
                              </div>
                            </div>


                            {/* APPROVED */}
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-600">
                                QC Approved
                              </div>

                              <div className="mt-0.5 text-lg font-black text-emerald-700">
                                {Number(
                                  selectedScore.metrics.qcApproved || 0
                                )}
                              </div>
                            </div>


                            {/* REJECTED */}
                            <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2">
                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-rose-600">
                                QC Rejected
                              </div>

                              <div className="mt-0.5 text-lg font-black text-rose-700">
                                {Number(
                                  selectedScore.metrics.qcRejected || 0
                                )}
                              </div>
                            </div>

                          </div>


                          {/* COVERAGE */}
                          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-2">

                            <div className="flex items-center gap-3">

                              <div className="text-[8px] font-black uppercase tracking-[0.1em] text-blue-500">
                                Inspection Coverage
                              </div>

                              <div className="text-lg font-black text-slate-900">
                                {Number(
                                  selectedScore.metrics
                                    .inspectionCoveragePercent || 0
                                ).toFixed(1)}
                                %
                              </div>

                            </div>


                            <div className="text-right">

                              <div className="text-xs font-black text-slate-700">
                                {Number(
                                  selectedScore.metrics.toiletsChecked || 0
                                )}
                                {' / '}
                                {Number(
                                  selectedScore.metrics.toiletsDue || 0
                                )}
                              </div>

                              <div className="text-[7px] font-black uppercase text-slate-400">
                                Submitted
                              </div>

                            </div>

                          </div>

                        </div>

                      ) : selectedComponent === 'LITTERBIN' ? (

                        <div className="space-y-3">

                          {/* COMMON OPERATIONAL KPIs */}
                          <div className="grid grid-cols-2 gap-2 xl:grid-cols-6">

                            {/* BINS / EXPECTED */}
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                                Bins / Expected
                              </div>

                              <div className="mt-0.5 flex items-end gap-2">

                                <span className="text-lg font-black text-slate-900">
                                  {Number(
                                    selectedScore.metrics.totalBins || 0
                                  )}
                                </span>

                                <span className="pb-0.5 text-[8px] font-bold text-slate-400">
                                  Bins
                                </span>

                              </div>

                              <div className="mt-0.5 text-[8px] font-bold text-slate-400">
                                {Number(
                                  selectedScore.metrics.binsDue || 0
                                )}{' '}
                                expected inspections
                              </div>

                            </div>


                            {/* SUBMITTED */}
                            <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-blue-500">
                                Submitted
                              </div>

                              <div className="mt-0.5 text-lg font-black text-blue-700">
                                {Number(
                                  selectedScore.metrics.binsChecked || 0
                                )}
                              </div>

                            </div>


                            {/* NOT SUBMITTED */}
                            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-amber-600">
                                Not Submitted
                              </div>

                              <div className="mt-0.5 text-lg font-black text-amber-700">
                                {Number(
                                  selectedScore.metrics.binsNotChecked || 0
                                )}
                              </div>

                            </div>


                            {/* QC PENDING */}
                            <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-amber-600">
                                QC Pending
                              </div>

                              <div className="mt-0.5 text-lg font-black text-amber-700">
                                {Number(
                                  selectedScore.metrics.pendingQc || 0
                                )}
                              </div>

                            </div>


                            {/* QC APPROVED */}
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-600">
                                QC Approved
                              </div>

                              <div className="mt-0.5 text-lg font-black text-emerald-700">
                                {Number(
                                  selectedScore.metrics.qcApproved || 0
                                )}
                              </div>

                            </div>


                            {/* QC REJECTED */}
                            <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-rose-600">
                                QC Rejected
                              </div>

                              <div className="mt-0.5 text-lg font-black text-rose-700">
                                {Number(
                                  selectedScore.metrics.qcRejected || 0
                                )}
                              </div>

                            </div>

                          </div>


                          {/* INSPECTION COVERAGE */}
                          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-2">

                            <div className="flex items-center gap-3">

                              <span className="text-[8px] font-black uppercase tracking-[0.1em] text-blue-500">
                                Inspection Coverage
                              </span>

                              <span className="text-lg font-black text-slate-900">
                                {Number(
                                  selectedScore.metrics
                                    .inspectionCoveragePercent || 0
                                ).toFixed(1)}
                                %
                              </span>

                            </div>


                            <div className="text-right">

                              <div className="text-xs font-black text-slate-700">
                                {Number(
                                  selectedScore.metrics.binsChecked || 0
                                )}
                                {' / '}
                                {Number(
                                  selectedScore.metrics.binsDue || 0
                                )}
                              </div>

                              <div className="text-[7px] font-black uppercase text-slate-400">
                                Submitted
                              </div>

                            </div>

                          </div>

                        </div>
                      ) : selectedComponent === 'QC' ? (

                        <div className="space-y-3">

                          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">

                            {/* TOTAL REPORTS */}
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">
                                Total Reports
                              </div>

                              <div className="mt-0.5 text-lg font-black text-slate-900">
                                {Number(
                                  selectedScore.metrics.totalReports || 0
                                )}
                              </div>

                            </div>


                            {/* PENDING */}
                            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-amber-600">
                                QC Pending
                              </div>

                              <div className="mt-0.5 text-lg font-black text-amber-700">
                                {Number(
                                  selectedScore.metrics.pendingQc || 0
                                )}
                              </div>

                            </div>


                            {/* APPROVED */}
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-600">
                                QC Approved
                              </div>

                              <div className="mt-0.5 text-lg font-black text-emerald-700">
                                {Number(
                                  selectedScore.metrics.approved || 0
                                )}
                              </div>

                            </div>


                            {/* REJECTED */}
                            <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-rose-600">
                                QC Rejected
                              </div>

                              <div className="mt-0.5 text-lg font-black text-rose-700">
                                {Number(
                                  selectedScore.metrics.rejected || 0
                                )}
                              </div>

                            </div>

                          </div>


                          {/* REVIEW COVERAGE */}
                          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-2">

                            <div>

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-blue-500">
                                Review Coverage
                              </div>

                              <div className="mt-0.5 text-lg font-black text-blue-700">
                                {Number(
                                  selectedScore.metrics.reviewCoveragePercent || 0
                                ).toFixed(1)}
                                %
                              </div>

                            </div>


                            <div className="text-right">

                              <div className="text-xs font-black text-slate-700">
                                {Number(
                                  selectedScore.metrics.reviewed || 0
                                )}
                                {' / '}
                                {Number(
                                  selectedScore.metrics.totalReports || 0
                                )}
                              </div>

                              <div className="text-[7px] font-black uppercase text-slate-400">
                                Reviewed
                              </div>

                            </div>

                          </div>

                        </div>
                      ) : selectedComponent ===
                        'ACTION_OFFICER' ? (

                        <div className="space-y-3">

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

                            {/* ACTION REQUIRED */}
                            <div className="rounded-xl border border-orange-100 bg-orange-50/40 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-orange-600">
                                Action Required
                              </div>

                              <div className="mt-0.5 text-lg font-black text-orange-700">
                                {Number(
                                  selectedScore.metrics
                                    .tasksAssigned || 0
                                )}
                              </div>

                            </div>


                            {/* PENDING */}
                            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-amber-600">
                                Pending
                              </div>

                              <div className="mt-0.5 text-lg font-black text-amber-700">
                                {Math.max(
                                  Number(
                                    selectedScore.metrics
                                      .tasksAssigned || 0
                                  ) -
                                  Number(
                                    selectedScore.metrics
                                      .tasksCompleted || 0
                                  ),
                                  0
                                )}
                              </div>

                            </div>


                            {/* ACTION TAKEN */}
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-emerald-600">
                                Action Taken
                              </div>

                              <div className="mt-0.5 text-lg font-black text-emerald-700">
                                {Number(
                                  selectedScore.metrics
                                    .tasksCompleted || 0
                                )}
                              </div>

                            </div>

                          </div>


                          {/* COMPLETION */}
                          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/30 px-3 py-2">

                            <div>

                              <div className="text-[7px] font-black uppercase tracking-[0.1em] text-blue-500">
                                Action Completion
                              </div>

                              <div className="mt-0.5 text-lg font-black text-blue-700">
                                {Number(
                                  selectedScore.metrics
                                    .tasksAssigned || 0
                                ) > 0
                                  ? (
                                    Number(
                                      selectedScore.metrics
                                        .tasksCompleted || 0
                                    ) /
                                    Number(
                                      selectedScore.metrics
                                        .tasksAssigned || 0
                                    ) *
                                    100
                                  ).toFixed(1)
                                  : '0.0'}
                                %
                              </div>

                            </div>


                            <div className="text-right">

                              <div className="text-xs font-black text-slate-700">
                                {Number(
                                  selectedScore.metrics
                                    .tasksCompleted || 0
                                )}
                                {' / '}
                                {Number(
                                  selectedScore.metrics
                                    .tasksAssigned || 0
                                )}
                              </div>

                              <div className="text-[7px] font-black uppercase text-slate-400">
                                Action Taken
                              </div>

                            </div>

                          </div>

                        </div>
                      ) : (
                        <MetricGrid
                          metrics={
                            selectedScore.metrics
                          }
                        />

                      )}

                    </div>
                  )}


              </div>
              {selectedComponent === 'WORKFORCE' &&
                detailView === 'OVERVIEW' &&
                !loading &&
                !error && (

                  <div className="space-y-4">

                    {/* ===================================== */}
                    {/* EMPLOYEE DEPLOYMENT */}
                    {/* ===================================== */}

                    <div>

                      <div>
                        <div className="text-xs font-black text-slate-800">
                          Employee Deployment
                        </div>

                        <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          Employees mapped to this Ward through operational assignments
                        </div>
                      </div>


                      {workforceEmployees.length ? (

                        <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                          <div className="hidden grid-cols-[1.25fr_0.9fr_1.35fr_0.9fr_0.8fr_0.8fr] gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 md:grid">

                            <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                              Employee
                            </div>

                            <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                              Employee ID
                            </div>

                            <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                              Assignment
                            </div>

                            <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                              Attendance
                            </div>

                            <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                              In
                            </div>

                            <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                              Out
                            </div>

                          </div>


                          <div className="divide-y divide-slate-100">

                            {workforceEmployees.map(
                              (employee: any) => {

                                const attendanceRows =
                                  workforceAttendanceByUser.get(
                                    String(
                                      employee.id
                                    )
                                  ) || [];


                                const latestAttendance =
                                  attendanceRows[0] ||
                                  null;


                                const assignmentTags =
                                  workforceAssignmentTags(
                                    employee.id
                                  );


                                return (

                                  <div
                                    key={
                                      employee.id
                                    }
                                    className="grid grid-cols-1 gap-2 px-3 py-3 md:grid-cols-[1.25fr_0.9fr_1.35fr_0.9fr_0.8fr_0.8fr] md:items-center md:gap-3"
                                  >

                                    {/* EMPLOYEE */}
                                    <div>
                                      <div className="text-xs font-black text-slate-900">
                                        {employee.name ||
                                          'Unnamed Employee'}
                                      </div>

                                      {employee.phone && (
                                        <div className="mt-0.5 text-[8px] font-semibold text-slate-400">
                                          {employee.phone}
                                        </div>
                                      )}
                                    </div>


                                    {/* ID */}
                                    <div>
                                      <div className="text-[8px] font-bold uppercase text-slate-400 md:hidden">
                                        Employee ID
                                      </div>

                                      <div className="text-[10px] font-black text-slate-700">
                                        {employee.employeeId ||
                                          '—'}
                                      </div>
                                    </div>


                                    {/* ASSIGNMENTS */}
                                    <div>
                                      <div className="text-[8px] font-bold uppercase text-slate-400 md:hidden">
                                        Assignment
                                      </div>

                                      <div className="flex flex-wrap gap-1">

                                        {assignmentTags.length ? (
                                          assignmentTags.map(
                                            (
                                              tag
                                            ) => (
                                              <span
                                                key={
                                                  tag
                                                }
                                                className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[8px] font-black text-blue-700"
                                              >
                                                {tag}
                                              </span>
                                            )
                                          )
                                        ) : (
                                          <span className="text-[9px] font-bold text-slate-300">
                                            —
                                          </span>
                                        )}

                                      </div>
                                    </div>


                                    {/* ATTENDANCE */}
                                    <div>
                                      <div className="text-[8px] font-bold uppercase text-slate-400 md:hidden">
                                        Attendance
                                      </div>

                                      {latestAttendance ? (

                                        <span
                                          className={`inline-flex rounded-full border px-2 py-1 text-[8px] font-black ${statusClass(
                                            String(
                                              latestAttendance.status ||
                                              ''
                                            )
                                          )}`}
                                        >
                                          {humanize(
                                            String(
                                              latestAttendance.status ||
                                              'Unknown'
                                            )
                                          )}
                                        </span>

                                      ) : (

                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-black text-slate-400">
                                          No Record
                                        </span>

                                      )}
                                    </div>


                                    {/* IN */}
                                    <div>
                                      <div className="text-[8px] font-bold uppercase text-slate-400 md:hidden">
                                        In
                                      </div>

                                      <div className="text-[9px] font-bold text-slate-600">
                                        {latestAttendance
                                          ?.inTime ||
                                          '—'}
                                      </div>
                                    </div>


                                    {/* OUT */}
                                    <div>
                                      <div className="text-[8px] font-bold uppercase text-slate-400 md:hidden">
                                        Out
                                      </div>

                                      <div className="text-[9px] font-bold text-slate-600">
                                        {latestAttendance
                                          ?.outTime ||
                                          '—'}
                                      </div>
                                    </div>

                                  </div>
                                );
                              }
                            )}

                          </div>

                        </div>

                      ) : (

                        <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center">

                          <User
                            size={24}
                            className="mx-auto text-slate-300"
                          />

                          <div className="mt-2 text-xs font-black text-slate-600">
                            No employees assigned
                          </div>

                          <div className="mt-1 text-[10px] font-semibold text-slate-400">
                            No operational employee assignment was found for this Ward.
                          </div>

                        </div>

                      )}

                    </div>


                    {/* ===================================== */}
                    {/* SUPERVISOR AVAILABILITY */}
                    {/* ===================================== */}

                    <div>

                      <div className="text-xs font-black text-slate-800">
                        Supervisor Availability
                      </div>

                      <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                        Supervisors mapped to operational responsibilities in this Ward
                      </div>


                      {workforceSupervisors.length ? (

                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">

                          {workforceSupervisors.map(
                            (
                              supervisor: any
                            ) => {

                              const attendanceRows =
                                workforceAttendanceByUser.get(
                                  String(
                                    supervisor.id
                                  )
                                ) || [];


                              const latest =
                                attendanceRows[0] ||
                                null;


                              return (

                                <div
                                  key={
                                    supervisor.id
                                  }
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                                >

                                  <div className="flex items-start justify-between gap-3">

                                    <div className="flex min-w-0 items-center gap-2.5">

                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">
                                        {String(
                                          supervisor.name ||
                                          'S'
                                        )
                                          .split(
                                            ' '
                                          )
                                          .filter(
                                            Boolean
                                          )
                                          .slice(
                                            0,
                                            2
                                          )
                                          .map(
                                            (
                                              part: string
                                            ) =>
                                              part[0]
                                          )
                                          .join(
                                            ''
                                          )
                                          .toUpperCase()}
                                      </div>


                                      <div className="min-w-0">
                                        <div className="truncate text-xs font-black text-slate-900">
                                          {supervisor.name ||
                                            'Unnamed Supervisor'}
                                        </div>

                                        <div className="mt-0.5 text-[8px] font-bold text-slate-400">
                                          {supervisor.employeeId ||
                                            'Employee ID unavailable'}
                                        </div>
                                      </div>

                                    </div>


                                    {latest ? (

                                      <span
                                        className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-black ${statusClass(
                                          String(
                                            latest.status ||
                                            ''
                                          )
                                        )}`}
                                      >
                                        {humanize(
                                          String(
                                            latest.status ||
                                            'Unknown'
                                          )
                                        )}
                                      </span>

                                    ) : (

                                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-black text-slate-400">
                                        No Record
                                      </span>

                                    )}

                                  </div>

                                </div>
                              );
                            }
                          )}

                        </div>

                      ) : (

                        <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-6 text-center text-[10px] font-bold text-slate-400">
                          No supervisors mapped to this Ward.
                        </div>

                      )}

                    </div>

                  </div>
                )}
              {selectedComponent === 'WORKFORCE' &&
                selectedScore?.metrics &&
                detailView === 'GUIDE' && (

                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    {/* HEADER */}
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-blue-50/50 px-4 py-3">

                      <div>

                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
                          Workforce Scoring Logic
                        </div>

                        <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          Workforce performance is based on employee deployment, supervisor availability and Beat manpower coverage.
                        </div>

                      </div>


                      <div className="rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-right">

                        <div className="text-[8px] font-black uppercase text-slate-400">
                          Final Score
                        </div>

                        <div className="text-sm font-black text-blue-700">
                          / 20
                        </div>

                      </div>

                    </div>


                    {/* ===================================== */}
                    {/* EMPLOYEE DEPLOYMENT */}
                    {/* ===================================== */}

                    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                      <div>

                        <div className="flex flex-wrap items-center gap-3">

                          <div className="text-xs font-black text-slate-800">
                            Employee Deployment
                          </div>

                          <div className="text-[9px] font-semibold text-slate-400">
                            Assigned & Present ÷ Attendance Expected
                          </div>

                        </div>


                        <div className="mt-2 flex flex-wrap items-center gap-2">

                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                            {Number(
                              workforceMetrics
                                .correctlyDeployed ||
                              0
                            )}
                            {' of '}
                            {Number(
                              workforceMetrics
                                .manpowerScheduled ||
                              0
                            )}
                          </span>


                          <span className="text-xs font-black text-blue-700">
                            {Number(
                              workforceMetrics
                                .deploymentCompliancePercent ||
                              0
                            ).toFixed(1)}
                            %
                          </span>

                        </div>

                      </div>


                      <div className="flex items-center text-right">

                        <div>
                          <div className="text-base font-black text-blue-700">
                            {scoreText(
                              workforceComponents
                                .deployment
                            )}
                          </div>

                          <div className="text-[8px] font-bold text-slate-400">
                            Factor weight
                          </div>
                        </div>

                      </div>

                    </div>


                    {/* ===================================== */}
                    {/* SUPERVISOR AVAILABILITY */}
                    {/* ===================================== */}

                    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                      <div>

                        <div className="flex flex-wrap items-center gap-3">

                          <div className="text-xs font-black text-slate-800">
                            Supervisor Availability
                          </div>

                          <div className="text-[9px] font-semibold text-slate-400">
                            Present Supervisors ÷ Expected Supervisors
                          </div>

                        </div>


                        {Number(
                          workforceMetrics
                            .supervisorsScheduled ||
                          0
                        ) > 0 ? (

                          <div className="mt-2 flex flex-wrap items-center gap-2">

                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                              {Number(
                                workforceMetrics
                                  .supervisorsAvailable ||
                                0
                              )}
                              {' of '}
                              {Number(
                                workforceMetrics
                                  .supervisorsScheduled ||
                                0
                              )}
                            </span>

                            <span className="text-xs font-black text-emerald-700">
                              {Number(
                                workforceMetrics
                                  .supervisorAvailabilityPercent ||
                                0
                              ).toFixed(1)}
                              %
                            </span>

                          </div>

                        ) : (

                          <div className="mt-2 text-[10px] font-bold text-slate-400">
                            No Supervisor obligation — this factor is N/A
                          </div>

                        )}

                      </div>


                      <div className="flex items-center text-right">

                        <div>
                          <div className="text-base font-black text-emerald-700">
                            {scoreText(
                              workforceComponents
                                .supervisorAvailability
                            )}
                          </div>

                          <div className="text-[8px] font-bold text-slate-400">
                            Factor weight
                          </div>
                        </div>

                      </div>

                    </div>


                    {/* ===================================== */}
                    {/* BEAT MANPOWER */}
                    {/* ===================================== */}

                    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                      <div>

                        <div className="flex flex-wrap items-center gap-3">

                          <div className="text-xs font-black text-slate-800">
                            Beat Manpower Coverage
                          </div>

                          <div className="text-[9px] font-semibold text-slate-400">
                            Manned Beat opportunities ÷ Total Beat opportunities
                          </div>

                        </div>


                        {Number(
                          workforceMetrics
                            .beatDeploymentOpportunities ||
                          0
                        ) > 0 ? (

                          <div className="mt-2 flex flex-wrap items-center gap-2">

                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                              {workforceMannedBeats}
                              {' of '}
                              {Number(
                                workforceMetrics
                                  .beatDeploymentOpportunities ||
                                0
                              )}
                              {' manned'}
                            </span>

                            <span className="text-xs font-black text-cyan-700">
                              {Number(
                                workforceMetrics
                                  .mannedBeatPercent ||
                                0
                              ).toFixed(1)}
                              %
                            </span>

                          </div>

                        ) : (

                          <div className="mt-2 text-[10px] font-bold text-slate-400">
                            No Beat manpower obligation — this factor is N/A
                          </div>

                        )}

                      </div>


                      <div className="flex items-center text-right">

                        <div>
                          <div className="text-base font-black text-cyan-700">
                            {scoreText(
                              workforceComponents
                                .unmannedBeatControl
                            )}
                          </div>

                          <div className="text-[8px] font-bold text-slate-400">
                            Factor weight
                          </div>
                        </div>

                      </div>

                    </div>


                    {/* ===================================== */}
                    {/* TOTAL */}
                    {/* ===================================== */}

                    <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-blue-50/80 to-white px-4 py-3">

                      <div>

                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">
                          Total Workforce Score
                        </div>

                        <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                          Applicable Workforce factors are normalized to the full Workforce score.
                        </div>

                      </div>


                      <div className="text-xl font-black text-blue-700">
                        {Number(
                          selectedScore.score ||
                          0
                        ).toFixed(1)}
                        {' / '}
                        {Number(
                          selectedScore.maxScore ||
                          20
                        ).toFixed(1)}
                      </div>

                    </div>


                    <div className="border-t border-blue-100 bg-blue-50/40 px-4 py-2">

                      <div className="text-[8px] font-semibold leading-4 text-blue-700">
                        Only currently applicable Workforce factors participate in scoring. Missing attendance upload days are not treated as employee absence.
                      </div>

                    </div>

                  </div>
                )}
              {selectedComponent === 'BEAT' &&
                selectedScore?.metrics &&
                detailView === 'GUIDE' && (() => {

                  const metrics: any =
                    selectedScore.metrics;

                  const components: any =
                    selectedScore.components || {};

                  const qcReviewed =
                    Number(
                      metrics.qcReviewed || 0
                    );

                  const qcApproved =
                    Number(
                      metrics.qcApproved || 0
                    );



                  return (

                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                      {/* HEADER */}
                      <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-blue-50/50 px-4 py-3">

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
                            Beat Scoring Logic
                          </div>

                          <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                            Inspection Coverage + QC Approval + Complete Beat Coverage
                          </div>
                        </div>


                        <div className="rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-right">

                          <div className="text-[8px] font-black uppercase text-slate-400">
                            Maximum
                          </div>

                          <div className="text-sm font-black text-blue-700">
                            {Number(
                              selectedScore.maxScore || 25
                            ).toFixed(1)}
                            {' '}marks
                          </div>

                        </div>

                      </div>


                      {/* ===================================== */}
                      {/* INSPECTION COVERAGE */}
                      {/* ===================================== */}

                      <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                        <div>

                          <div className="flex flex-wrap items-center gap-3">

                            <div className="text-xs font-black text-slate-800">
                              Inspection Coverage
                            </div>

                            <div className="text-[9px] font-semibold text-slate-400">
                              Submitted Beat reports ÷ Reports due
                            </div>

                          </div>


                          <div className="mt-2 flex flex-wrap items-center gap-2">

                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                              {Number(
                                metrics.beatsChecked || 0
                              )}
                              {' of '}
                              {Number(
                                metrics.beatsDue || 0
                              )}
                              {' submitted'}
                            </span>

                            <span className="text-xs font-black text-blue-700">
                              {Number(
                                metrics.coveragePercent || 0
                              ).toFixed(1)}
                              %
                            </span>

                          </div>

                        </div>


                        <div className="flex items-center text-right">

                          <div>
                            <div className="text-base font-black text-blue-700">
                              {scoreText(
                                components.inspectionCoverage
                              )}
                            </div>

                            <div className="text-[8px] font-bold text-slate-400">
                              Maximum 10 marks
                            </div>
                          </div>

                        </div>

                      </div>


                      {/* ===================================== */}
                      {/* QC APPROVAL */}
                      {/* ===================================== */}

                      <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                        <div>

                          <div className="flex flex-wrap items-center gap-3">

                            <div className="text-xs font-black text-slate-800">
                              QC Approval
                            </div>

                            <div className="text-[9px] font-semibold text-slate-400">
                              QC Approved ÷ QC Reviewed
                            </div>

                          </div>


                          {qcReviewed > 0 ? (

                            <div className="mt-2 flex flex-wrap items-center gap-2">

                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                                {qcApproved}
                                {' of '}
                                {qcReviewed}
                                {' approved'}
                              </span>

                              <span className="text-xs font-black text-emerald-700">
                                {Number(
                                  metrics.approvalPercent || 0
                                ).toFixed(1)}
                                %
                              </span>

                            </div>

                          ) : (

                            <div className="mt-2 text-[10px] font-bold text-slate-400">
                              No Beat report has been reviewed by QC — this factor is N/A
                            </div>

                          )}

                        </div>


                        <div className="flex items-center text-right">

                          <div>
                            <div className="text-base font-black text-emerald-700">
                              {scoreText(
                                components.qcApproval
                              )}
                            </div>

                            <div className="text-[8px] font-bold text-slate-400">
                              Maximum 10 marks
                            </div>
                          </div>

                        </div>

                      </div>


                      {/* ===================================== */}
                      {/* COMPLETE BEAT COVERAGE */}
                      {/* ===================================== */}

                      <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                        <div>

                          <div className="flex flex-wrap items-center gap-3">

                            <div className="text-xs font-black text-slate-800">
                              Complete Beat Coverage
                            </div>

                            <div className="text-[9px] font-semibold text-slate-400">
                              Reports with all Beat points completed ÷ Reports due
                            </div>

                          </div>


                          <div className="mt-2 flex flex-wrap items-center gap-2">

                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                              {Number(
                                metrics.completeBeatCoverage || 0
                              )}
                              {' of '}
                              {Number(
                                metrics.beatsDue || 0
                              )}
                              {' complete'}
                            </span>

                            <span className="text-xs font-black text-cyan-700">
                              {Number(
                                metrics.completeCoveragePercent || 0
                              ).toFixed(1)}
                              %
                            </span>

                          </div>


                          <div className="mt-1.5 text-[9px] font-semibold text-slate-400">
                            A Beat counts as complete only when all configured points for that Beat are captured.
                          </div>

                        </div>


                        <div className="flex items-center text-right">

                          <div>
                            <div className="text-base font-black text-cyan-700">
                              {scoreText(
                                components.completeBeatCoverage
                              )}
                            </div>

                            <div className="text-[8px] font-bold text-slate-400">
                              Maximum 5 marks
                            </div>
                          </div>

                        </div>

                      </div>



                      {/* ===================================== */}
                      {/* TOTAL */}
                      {/* ===================================== */}

                      <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-blue-50/80 to-white px-4 py-3">

                        <div>

                          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">
                            Total Beat Score
                          </div>

                          <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                            Only applicable scoring factors participate in the final Beat score
                          </div>

                        </div>


                        <div className="text-xl font-black text-blue-700">
                          {Number(
                            selectedScore.score || 0
                          ).toFixed(1)}
                          {' / '}
                          {Number(
                            selectedScore.maxScore || 25
                          ).toFixed(1)}
                        </div>

                      </div>


                      {/* N/A NOTE */}
                      <div className="border-t border-blue-100 bg-blue-50/40 px-4 py-2">

                        <div className="text-[8px] font-semibold leading-4 text-blue-700">
                          N/A factors neither reward nor penalize the Ward. The Beat score is normalized across the scoring factors that are currently applicable.
                        </div>

                      </div>

                    </div>
                  );
                })()}
              {isInspectionComponent &&
                selectedScore &&
                detailView === 'GUIDE' && (

                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    {/* HEADER */}
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-blue-50/50 px-4 py-3">

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
                          {inspectionModuleLabel} Scoring Logic
                        </div>

                        <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          Coverage + QC Compliance + AI Evidence Quality
                        </div>
                      </div>


                      <div className="rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-right">
                        <div className="text-[8px] font-black uppercase text-slate-400">
                          Maximum
                        </div>

                        <div className="text-sm font-black text-blue-700">
                          {Number(
                            selectedScore.maxScore || 0
                          ).toFixed(1)}
                          {' '}marks
                        </div>
                      </div>

                    </div>


                    {/* ========================================= */}
                    {/* INSPECTION COVERAGE */}
                    {/* ========================================= */}

                    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">

                          <div className="text-xs font-black text-slate-800">
                            Inspection Coverage
                          </div>

                          <div className="text-[9px] font-semibold text-slate-400">
                            Submitted ÷ Expected
                          </div>

                        </div>


                        <div className="mt-2 flex flex-wrap items-center gap-2">

                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                            {submittedInspections} of {totalInspections} submitted
                          </span>

                          <span className="text-xs font-black text-blue-700">
                            {Number(
                              inspectionMetrics
                                .inspectionCoveragePercent || 0
                            ).toFixed(1)}
                            %
                          </span>

                        </div>

                      </div>


                      <div className="flex min-w-[78px] items-center justify-end">

                        <div className="text-right">

                          <div className="text-base font-black text-blue-700">
                            {scoreText(
                              selectedScore.components
                                ?.inspectionCoverage
                            )}
                          </div>

                          <div className="text-[8px] font-bold text-slate-400">
                            Coverage score
                          </div>

                        </div>

                      </div>

                    </div>


                    {/* ========================================= */}
                    {/* QC COMPLIANCE */}
                    {/* ========================================= */}

                    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">

                          <div className="text-xs font-black text-slate-800">
                            QC Compliance
                          </div>

                          <div className="text-[9px] font-semibold text-slate-400">
                            Approved ÷ QC Reviewed
                          </div>

                        </div>


                        <div className="mt-2 flex flex-wrap items-center gap-2">

                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                            {Number(
                              inspectionMetrics.qcApproved || 0
                            )}
                            {' of '}
                            {Number(
                              inspectionMetrics.qcApproved || 0
                            ) +
                              Number(
                                inspectionMetrics.qcRejected || 0
                              )}
                            {' approved'}
                          </span>


                          {Number(
                            inspectionMetrics.qcApproved || 0
                          ) +
                            Number(
                              inspectionMetrics.qcRejected || 0
                            ) >
                            0 ? (

                            <span className="text-xs font-black text-emerald-700">
                              {Number(
                                inspectionMetrics
                                  .compliancePercent || 0
                              ).toFixed(1)}
                              %
                            </span>

                          ) : (

                            <span className="text-[10px] font-black text-slate-400">
                              Pending QC
                            </span>

                          )}

                        </div>

                      </div>


                      <div className="flex min-w-[78px] items-center justify-end">

                        <div className="text-right">

                          <div className="text-base font-black text-emerald-700">
                            {scoreText(
                              selectedScore.components
                                ?.compliance
                            )}
                          </div>

                          <div className="text-[8px] font-bold text-slate-400">
                            QC score
                          </div>

                        </div>

                      </div>

                    </div>


                    {/* ========================================= */}
                    {/* AI EVIDENCE QUALITY */}
                    {/* ========================================= */}

                    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">

                          <div className="text-xs font-black text-slate-800">
                            AI Evidence Quality
                          </div>

                          <div className="text-[9px] font-semibold text-slate-400">
                            Photo evidence verification
                          </div>

                        </div>


                        {evidenceEvaluatedChecks > 0 ? (

                          <>
                            <div className="mt-2 flex flex-wrap gap-2">

                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-600">
                                Evaluated{' '}
                                <strong className="text-slate-900">
                                  {evidenceEvaluatedChecks}
                                </strong>
                              </span>

                              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                                Passed{' '}
                                <strong>
                                  {evidenceMatchedChecks}
                                </strong>
                              </span>

                              <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-[9px] font-bold text-rose-700">
                                Failed{' '}
                                <strong>
                                  {Math.max(
                                    evidenceEvaluatedChecks -
                                    evidenceMatchedChecks,
                                    0
                                  )}
                                </strong>
                              </span>

                              <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-[9px] font-black text-violet-700">
                                Quality{' '}
                                {evidenceQualityPercent.toFixed(1)}
                                %
                              </span>

                            </div>


                            <div className="mt-1.5 text-[9px] font-semibold text-slate-400">
                              Evidence that contradicts the response or cannot be verified is counted as failed.
                            </div>
                          </>

                        ) : (

                          <div className="mt-2 text-[10px] font-bold text-slate-400">
                            Auto-QC evidence evaluation unavailable
                          </div>

                        )}

                      </div>


                      <div className="flex min-w-[78px] items-center justify-end">

                        <div className="text-right">

                          <div className="text-base font-black text-violet-700">
                            {scoreText(
                              selectedScore.components
                                ?.quality
                            )}
                          </div>

                          <div className="text-[8px] font-bold text-slate-400">
                            Quality score
                          </div>

                        </div>

                      </div>

                    </div>


                    {/* ========================================= */}
                    {/* TOTAL */}
                    {/* ========================================= */}

                    <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-blue-50/80 to-white px-4 py-3">

                      <div>

                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">
                          Total {inspectionModuleLabel} Score
                        </div>

                        <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                          Combined applicable scoring components
                        </div>

                      </div>


                      <div className="text-xl font-black text-blue-700">
                        {Number(
                          selectedScore.score || 0
                        ).toFixed(1)}
                        {' / '}
                        {Number(
                          selectedScore.maxScore || 0
                        ).toFixed(1)}
                      </div>

                    </div>

                  </div>
                )}
              {selectedComponent === 'QC' &&
                detailView === 'OVERVIEW' &&
                !loading &&
                !error && (() => {

                  const modules = [
                    {
                      label: 'Sweeping',
                      rows: Array.isArray(
                        payload?.data?.sweeping
                      )
                        ? payload!.data.sweeping
                        : [],
                    },

                    {
                      label: 'Toilet',
                      rows: Array.isArray(
                        payload?.data?.toilet
                      )
                        ? payload!.data.toilet
                        : [],
                    },

                    {
                      label: 'Litter Bin',
                      rows: Array.isArray(
                        payload?.data?.litterBin
                      )
                        ? payload!.data.litterBin
                        : [],
                    },
                  ];


                  return (
                    <div className="space-y-2">

                      <div>
                        <div className="text-xs font-black text-slate-800">
                          QC Breakdown
                        </div>

                        <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          Review status by inspection module
                        </div>
                      </div>


                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">

                        {modules.map(
                          (module) => {

                            const approved =
                              module.rows.filter(
                                (row: any) =>
                                  String(
                                    row.qcDecision || ''
                                  ).toUpperCase() ===
                                  'APPROVED'
                              ).length;


                            const rejected =
                              module.rows.filter(
                                (row: any) =>
                                  String(
                                    row.qcDecision || ''
                                  ).toUpperCase() ===
                                  'REJECTED'
                              ).length;


                            const pending =
                              Math.max(
                                0,
                                module.rows.length -
                                approved -
                                rejected
                              );


                            return (
                              <div
                                key={module.label}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                              >

                                <div className="flex items-center justify-between gap-2">

                                  <div className="text-xs font-black text-slate-800">
                                    {module.label}
                                  </div>

                                  <div className="text-[9px] font-black text-slate-500">
                                    {module.rows.length}{' '}
                                    reports
                                  </div>

                                </div>


                                <div className="mt-2 grid grid-cols-3 gap-1.5">

                                  <div className="rounded-lg bg-amber-50 px-2 py-1.5 text-center">
                                    <div className="text-[7px] font-black uppercase text-amber-600">
                                      Pending
                                    </div>

                                    <div className="text-sm font-black text-amber-700">
                                      {pending}
                                    </div>
                                  </div>


                                  <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-center">
                                    <div className="text-[7px] font-black uppercase text-emerald-600">
                                      Approved
                                    </div>

                                    <div className="text-sm font-black text-emerald-700">
                                      {approved}
                                    </div>
                                  </div>


                                  <div className="rounded-lg bg-rose-50 px-2 py-1.5 text-center">
                                    <div className="text-[7px] font-black uppercase text-rose-600">
                                      Rejected
                                    </div>

                                    <div className="text-sm font-black text-rose-700">
                                      {rejected}
                                    </div>
                                  </div>

                                </div>

                              </div>
                            );
                          }
                        )}

                      </div>

                    </div>
                  );
                })()}
              {selectedComponent ===
                'ACTION_OFFICER' &&
                detailView ===
                'OVERVIEW' &&
                !loading &&
                !error && (() => {

                  const tasks =
                    Array.isArray(
                      payload?.data?.tasks
                    )
                      ? payload!.data.tasks
                      : [];


                  const modules = [
                    {
                      label:
                        'Sweeping',

                      keys: [
                        'SWEEPING',
                      ],
                    },

                    {
                      label:
                        'Toilet',

                      keys: [
                        'TOILET',
                      ],
                    },

                    {
                      label:
                        'Litter Bin',

                      keys: [
                        'LITTERBINS',
                        'LITTERBIN',
                      ],
                    },
                  ];


                  return (

                    <div className="space-y-2">

                      <div>

                        <div className="text-xs font-black text-slate-800">
                          Action Officer Breakdown
                        </div>

                        <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          Action Required status by inspection module
                        </div>

                      </div>


                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">

                        {modules.map(
                          (module) => {

                            const rows =
                              tasks.filter(
                                (task: any) =>
                                  module.keys.includes(
                                    String(
                                      task.moduleKey ||
                                      ''
                                    )
                                      .trim()
                                      .toUpperCase()
                                  )
                              );


                            const actionTaken =
                              rows.filter(
                                (task: any) =>
                                  AO_ACTION_TAKEN_STATUSES
                                    .has(
                                      String(
                                        task.status ||
                                        ''
                                      )
                                        .trim()
                                        .toUpperCase()
                                    )
                              ).length;


                            const pending =
                              Math.max(
                                0,

                                rows.length -
                                actionTaken
                              );


                            return (
                              <div
                                key={
                                  module.label
                                }
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                              >

                                <div className="flex items-center justify-between gap-2">

                                  <div className="text-xs font-black text-slate-800">
                                    {module.label}
                                  </div>

                                  <div className="text-[9px] font-black text-slate-500">
                                    {rows.length}{' '}
                                    action
                                    {rows.length === 1
                                      ? ''
                                      : 's'}
                                  </div>

                                </div>


                                <div className="mt-2 grid grid-cols-2 gap-1.5">

                                  <div className="rounded-lg bg-amber-50 px-2 py-1.5 text-center">

                                    <div className="text-[7px] font-black uppercase text-amber-600">
                                      Pending
                                    </div>

                                    <div className="text-sm font-black text-amber-700">
                                      {pending}
                                    </div>

                                  </div>


                                  <div className="rounded-lg bg-emerald-50 px-2 py-1.5 text-center">

                                    <div className="text-[7px] font-black uppercase text-emerald-600">
                                      Action Taken
                                    </div>

                                    <div className="text-sm font-black text-emerald-700">
                                      {actionTaken}
                                    </div>

                                  </div>

                                </div>

                              </div>
                            );
                          }
                        )}

                      </div>

                    </div>
                  );
                })()}
              {selectedComponent === 'BEAT' &&
                detailView === 'OVERVIEW' &&
                !loading &&
                !error && (

                  <div className="space-y-2">

                    {/* HEADER */}
                    <div>

                      <div className="text-xs font-black text-slate-800">
                        Beat-wise Evidence Progress
                      </div>

                      <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                        Point evidence completion for every Beat in this ward
                      </div>

                    </div>


                    {filteredBeatBreakdown.length ? (

                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                        {/* TABLE HEADER */}
                        <div className="hidden grid-cols-[1.4fr_0.8fr_1fr_0.9fr_1.1fr_auto] gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 md:grid">

                          <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                            Beat
                          </div>

                          <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                            Reports
                          </div>

                          <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                            Point Evidence
                          </div>

                          <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                            Status
                          </div>

                          <div className="text-[7px] font-black uppercase tracking-wide text-slate-400">
                            QC
                          </div>

                          <div className="text-right text-[7px] font-black uppercase tracking-wide text-slate-400">
                            Action
                          </div>

                        </div>


                        <div className="divide-y divide-slate-100">

                          {filteredBeatBreakdown.map(
                            (
                              row: any
                            ) => {

                              const progressStatus =
                                String(
                                  row.progressStatus ||
                                  'NOT_STARTED'
                                ).toUpperCase();


                              const progressLabel =
                                progressStatus ===
                                  'IN_PROGRESS'
                                  ? 'In Progress'
                                  : progressStatus ===
                                    'SUBMITTED'
                                    ? 'Submitted'
                                    : progressStatus ===
                                      'COMPLETE'
                                      ? 'Complete'
                                      : progressStatus ===
                                        'PARTIAL'
                                        ? 'Partial'
                                        : 'Not Started';


                              const progressClass =
                                progressStatus ===
                                  'SUBMITTED' ||
                                  progressStatus ===
                                  'COMPLETE'
                                  ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                                  : progressStatus ===
                                    'IN_PROGRESS' ||
                                    progressStatus ===
                                    'PARTIAL'
                                    ? 'border-violet-100 bg-violet-50 text-violet-700'
                                    : 'border-slate-200 bg-slate-50 text-slate-500';


                              const reportRecord =
                                row.latestSubmittedReportId
                                  ? records.find(
                                    (
                                      record
                                    ) =>
                                      record.section ===
                                      'Sweeping Report' &&
                                      String(
                                        record.item
                                          ?.id
                                      ) ===
                                      String(
                                        row.latestSubmittedReportId
                                      )
                                  )
                                  : null;


                              return (
                                <div
                                  key={
                                    row.beatId
                                  }
                                  className="grid grid-cols-1 gap-2 px-3 py-2.5 md:grid-cols-[1.4fr_0.8fr_1fr_0.9fr_1.1fr_auto] md:items-center md:gap-3"
                                >

                                  {/* BEAT */}
                                  <div className="min-w-0">

                                    <div className="truncate text-xs font-black text-slate-900">
                                      {row.beatName ||
                                        'Unnamed Beat'}
                                    </div>

                                    {row.beatCode && (
                                      <div className="mt-0.5 text-[8px] font-bold text-slate-400">
                                        {row.beatCode}
                                      </div>
                                    )}

                                  </div>


                                  {/* REPORTS */}
                                  <div>

                                    <div className="text-[8px] font-bold uppercase text-slate-400 md:hidden">
                                      Reports
                                    </div>

                                    <div className="text-[10px] font-black text-slate-700">
                                      {Number(
                                        row.submittedReports ||
                                        0
                                      )}
                                      {' / '}
                                      {Number(
                                        row.dueReports ||
                                        0
                                      )}
                                    </div>

                                    {Number(
                                      row.inProgressReports ||
                                      0
                                    ) > 0 && (
                                        <div className="text-[7px] font-black text-violet-600">
                                          {row.inProgressReports}{' '}
                                          in progress
                                        </div>
                                      )}

                                  </div>


                                  {/* POINT EVIDENCE */}
                                  <div>

                                    <div className="text-[8px] font-bold uppercase text-slate-400 md:hidden">
                                      Point Evidence
                                    </div>

                                    <div className="text-[10px] font-black text-slate-700">
                                      {Number(
                                        row.pointsCaptured || 0
                                      )}
                                      {' / '}
                                      {Number(
                                        row.expectedPoints || 0
                                      )}
                                    </div>

                                    <div className="mt-0.5 text-[7px] font-semibold text-slate-400">
                                      {Number(
                                        row.progressPercent || 0
                                      ).toFixed(1)}
                                      % · 1 image per point
                                    </div>

                                  </div>


                                  {/* STATUS */}
                                  <div>

                                    <div className="text-[8px] font-bold uppercase text-slate-400 md:hidden">
                                      Status
                                    </div>

                                    <span
                                      className={`inline-flex rounded-full border px-2 py-1 text-[8px] font-black ${progressClass}`}
                                    >
                                      {progressLabel}
                                    </span>

                                  </div>


                                  {/* QC */}
                                  <div>

                                    <div className="text-[8px] font-bold uppercase text-slate-400 md:hidden">
                                      QC
                                    </div>

                                    {Number(
                                      row.qcRejected || 0
                                    ) > 0 ? (

                                      <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[8px] font-black text-rose-700">
                                        QC Rejected
                                      </span>

                                    ) : Number(
                                      row.qcApproved || 0
                                    ) > 0 ? (

                                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[8px] font-black text-emerald-700">
                                        QC Approved
                                      </span>

                                    ) : Number(
                                      row.qcPending || 0
                                    ) > 0 ? (

                                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[8px] font-black text-amber-700">
                                        QC Pending
                                      </span>

                                    ) : (

                                      <span className="text-[9px] font-bold text-slate-300">
                                        —
                                      </span>

                                    )}

                                  </div>


                                  {/* OPEN */}
                                  <div>

                                    {reportRecord && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openOperationalReport(
                                            reportRecord
                                          )
                                        }
                                        className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[8px] font-black text-blue-700 transition hover:bg-blue-100"
                                      >
                                        <Eye
                                          size={10}
                                        />

                                        Open
                                      </button>
                                    )}

                                  </div>

                                </div>
                              );
                            }
                          )}

                        </div>

                      </div>

                    ) : (

                      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-6 text-center">

                        <FileText
                          size={22}
                          className="mx-auto text-slate-300"
                        />

                        <div className="mt-2 text-xs font-black text-slate-600">
                          No Beat progress found
                        </div>

                      </div>

                    )}

                  </div>
                )}
              {selectedComponent === 'QC' &&
                selectedScore?.metrics &&
                detailView === 'GUIDE' && (

                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    {/* HEADER */}
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-blue-50/50 px-4 py-3">

                      <div>

                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
                          QC Scoring Logic
                        </div>

                        <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          QC performance is based on completion of required report reviews.
                        </div>

                      </div>


                      <div className="rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-right">

                        <div className="text-[8px] font-black uppercase text-slate-400">
                          Maximum
                        </div>

                        <div className="text-sm font-black text-blue-700">
                          10.0 marks
                        </div>

                      </div>

                    </div>


                    {/* REVIEW COVERAGE */}
                    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                      <div>

                        <div className="flex flex-wrap items-center gap-3">

                          <div className="text-xs font-black text-slate-800">
                            Review Coverage
                          </div>

                          <div className="text-[9px] font-semibold text-slate-400">
                            Reviewed reports ÷ Total reports requiring QC
                          </div>

                        </div>


                        <div className="mt-2 flex flex-wrap items-center gap-2">

                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                            {Number(
                              selectedScore.metrics.reviewed || 0
                            )}
                            {' of '}
                            {Number(
                              selectedScore.metrics.totalReports || 0
                            )}
                            {' reviewed'}
                          </span>


                          <span className="text-xs font-black text-blue-700">
                            {Number(
                              selectedScore.metrics.reviewCoveragePercent || 0
                            ).toFixed(1)}
                            %
                          </span>

                        </div>


                        <div className="mt-2 text-[9px] font-semibold text-slate-400">
                          Both Approved and Rejected are completed QC decisions. Pending reports reduce review coverage.
                        </div>

                      </div>


                      <div className="flex items-center text-right">

                        <div>

                          <div className="text-base font-black text-blue-700">
                            {scoreText(
                              selectedScore.components
                                ?.reviewCoverage
                            )}
                          </div>

                          <div className="text-[8px] font-bold text-slate-400">
                            Maximum 10 marks
                          </div>

                        </div>

                      </div>

                    </div>


                    {/* EXPLANATION */}
                    <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">

                      <div className="px-3 py-2.5 text-center">
                        <div className="text-[7px] font-black uppercase text-emerald-600">
                          Approved
                        </div>
                        <div className="mt-0.5 text-[9px] font-bold text-slate-500">
                          Counts as reviewed
                        </div>
                      </div>


                      <div className="px-3 py-2.5 text-center">
                        <div className="text-[7px] font-black uppercase text-rose-600">
                          Rejected
                        </div>
                        <div className="mt-0.5 text-[9px] font-bold text-slate-500">
                          Counts as reviewed
                        </div>
                      </div>


                      <div className="px-3 py-2.5 text-center">
                        <div className="text-[7px] font-black uppercase text-amber-600">
                          Pending
                        </div>
                        <div className="mt-0.5 text-[9px] font-bold text-slate-500">
                          Awaiting QC
                        </div>
                      </div>

                    </div>


                    {/* TOTAL */}
                    <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-blue-50/80 to-white px-4 py-3">

                      <div>

                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">
                          Total QC Score
                        </div>

                        <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                          Based only on QC review completion
                        </div>

                      </div>


                      <div className="text-xl font-black text-blue-700">
                        {Number(
                          selectedScore.score || 0
                        ).toFixed(1)}
                        {' / '}
                        {Number(
                          selectedScore.maxScore || 10
                        ).toFixed(1)}
                      </div>

                    </div>

                  </div>
                )}
              {selectedComponent ===
                'ACTION_OFFICER' &&
                selectedScore?.metrics &&
                detailView === 'GUIDE' && (

                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    {/* HEADER */}
                    <div className="border-b border-slate-100 bg-blue-50/50 px-4 py-3">

                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
                        Action Officer Workflow Guide
                      </div>

                      <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                        Current Action Officer workflow from Action Required to Action Taken.
                      </div>

                    </div>


                    {/* ACTION REQUIRED */}
                    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                      <div>

                        <div className="text-xs font-black text-slate-800">
                          Action Required
                        </div>

                        <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                          Reports assigned to the Action Officer for corrective action.
                        </div>

                      </div>


                      <div className="flex items-center text-lg font-black text-orange-700">
                        {Number(
                          selectedScore.metrics
                            .tasksAssigned || 0
                        )}
                      </div>

                    </div>


                    {/* PENDING */}
                    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                      <div>

                        <div className="text-xs font-black text-amber-700">
                          Pending
                        </div>

                        <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                          Corrective action has not yet been completed.
                        </div>

                      </div>


                      <div className="flex items-center text-lg font-black text-amber-700">
                        {Math.max(
                          Number(
                            selectedScore.metrics
                              .tasksAssigned || 0
                          ) -
                          Number(
                            selectedScore.metrics
                              .tasksCompleted || 0
                          ),
                          0
                        )}
                      </div>

                    </div>


                    {/* ACTION TAKEN */}
                    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                      <div>

                        <div className="text-xs font-black text-emerald-700">
                          Action Taken
                        </div>

                        <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                          Corrective action completed and submitted by the Action Officer.
                        </div>

                      </div>


                      <div className="flex items-center text-lg font-black text-emerald-700">
                        {Number(
                          selectedScore.metrics
                            .tasksCompleted || 0
                        )}
                      </div>

                    </div>


                    {/* COMPLETION */}
                    <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-blue-50/80 to-white px-4 py-3">

                      <div>

                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">
                          Action Completion
                        </div>

                        <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                          Action Taken ÷ Action Required
                        </div>

                      </div>


                      <div className="text-xl font-black text-blue-700">

                        {Number(
                          selectedScore.metrics
                            .tasksAssigned || 0
                        ) > 0
                          ? (
                            Number(
                              selectedScore.metrics
                                .tasksCompleted || 0
                            ) /
                            Number(
                              selectedScore.metrics
                                .tasksAssigned || 0
                            ) *
                            100
                          ).toFixed(1)
                          : '0.0'}

                        %

                      </div>

                    </div>

                  </div>
                )}
              {selectedComponent === 'SUPERVISOR' &&
                selectedScore?.metrics &&
                detailView === 'GUIDE' && (

                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                    {/* HEADER */}
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-blue-50/50 px-4 py-3">

                      <div>

                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
                          Supervisor Scoring Logic
                        </div>

                        <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          Supervisor performance is based on completion of assigned reporting responsibilities.
                        </div>

                      </div>


                      <div className="rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-right">

                        <div className="text-[8px] font-black uppercase text-slate-400">
                          Maximum
                        </div>

                        <div className="text-sm font-black text-blue-700">
                          {Number(
                            selectedScore.maxScore || 10
                          ).toFixed(1)}
                          {' '}marks
                        </div>

                      </div>

                    </div>


                    {/* COVERAGE */}
                    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 px-4 py-3">

                      <div>

                        <div className="flex flex-wrap items-center gap-3">

                          <div className="text-xs font-black text-slate-800">
                            Submission Coverage
                          </div>

                          <div className="text-[9px] font-semibold text-slate-400">
                            Submitted reports ÷ Reports due
                          </div>

                        </div>


                        <div className="mt-2 flex flex-wrap items-center gap-2">

                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                            {Number(
                              selectedScore.metrics.reportsSubmitted || 0
                            )}
                            {' of '}
                            {Number(
                              selectedScore.metrics.reportsDue || 0
                            )}
                            {' submitted'}
                          </span>

                          <span className="text-xs font-black text-blue-700">
                            {Number(
                              selectedScore.metrics
                                .submissionCoveragePercent || 0
                            ).toFixed(1)}
                            %
                          </span>

                        </div>


                        <div className="mt-1.5 text-[9px] font-semibold text-slate-400">
                          Missing assigned reports reduce the Supervisor score.
                          Reports can only be submitted for the active operational day.
                        </div>

                      </div>


                      <div className="flex items-center">

                        <div className="text-right">

                          <div className="text-base font-black text-blue-700">
                            {Number(
                              selectedScore.score || 0
                            ).toFixed(1)}
                            {' / '}
                            {Number(
                              selectedScore.maxScore || 10
                            ).toFixed(1)}
                          </div>

                          <div className="text-[8px] font-bold text-slate-400">
                            Supervisor score
                          </div>

                        </div>

                      </div>

                    </div>


                    {/* TOTAL */}
                    <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-blue-50/80 to-white px-4 py-3">

                      <div>

                        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">
                          Total Supervisor Score
                        </div>

                        <div className="mt-0.5 text-[9px] font-semibold text-slate-400">
                          Based on reporting completion for the selected period
                        </div>

                      </div>


                      <div className="text-xl font-black text-blue-700">
                        {Number(
                          selectedScore.score || 0
                        ).toFixed(1)}
                        {' / '}
                        {Number(
                          selectedScore.maxScore || 10
                        ).toFixed(1)}
                      </div>

                    </div>

                  </div>

                )}

              {selectedComponent === 'SUPERVISOR' &&
                detailView === 'OVERVIEW' &&
                !loading &&
                !error && (
                  <div className="space-y-3">

                    {/* SECTION HEADER */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="text-xs font-black text-slate-800">
                          Supervisor Breakdown
                        </div>

                        <div className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          Individual reporting responsibility for this ward
                        </div>
                      </div>

                      {selectedSupervisorId && (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSupervisorId(
                              null
                            )
                          }
                          className="text-[10px] font-black text-blue-600 transition hover:text-blue-700"
                        >
                          Show All Supervisors
                        </button>
                      )}
                    </div>


                    {/* SUPERVISOR CARDS */}
                    {supervisorBreakdown.length ? (
                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">

                        {supervisorBreakdown.map(
                          (row: any) => {
                            const active =
                              !!row.supervisorId &&
                              selectedSupervisorId ===
                              row.supervisorId;

                            const hasRealSupervisor =
                              Boolean(
                                row.supervisorId
                              );

                            return (
                              <div
                                key={
                                  supervisorRowKey(
                                    row
                                  )
                                }
                                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${active
                                  ? 'border-blue-300 ring-2 ring-blue-100'
                                  : 'border-slate-200'
                                  }`}
                              >

                                {/* IDENTITY */}
                                <div className="border-b border-slate-100 px-4 py-4">
                                  <div className="flex items-start justify-between gap-3">

                                    <div className="flex min-w-0 items-center gap-3">

                                      {/* AVATAR */}
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">
                                        {String(
                                          row.supervisorName ||
                                          'S'
                                        )
                                          .split(' ')
                                          .filter(Boolean)
                                          .slice(0, 2)
                                          .map(
                                            (
                                              part: string
                                            ) =>
                                              part[0]
                                          )
                                          .join('')
                                          .toUpperCase()}
                                      </div>


                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-black text-slate-900">
                                          {row.supervisorName ||
                                            'Unnamed Supervisor'}
                                        </div>

                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold text-slate-400">

                                          {row.employeeId && (
                                            <span>
                                              Employee ID:{' '}
                                              <strong className="text-slate-600">
                                                {row.employeeId}
                                              </strong>
                                            </span>
                                          )}

                                          {!hasRealSupervisor && (
                                            <span className="text-amber-600">
                                              Assignment needs review
                                            </span>
                                          )}

                                        </div>
                                      </div>

                                    </div>


                                    <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black text-slate-600">
                                      {Number(
                                        row.submissionCoverage ||
                                        0
                                      ).toFixed(1)}
                                      %
                                    </div>

                                  </div>
                                </div>


                                {/* SUPERVISOR COUNTS */}
                                <div className="grid grid-cols-3 divide-x divide-slate-100">

                                  <div className="px-3 py-2.5 text-center">
                                    <div className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                                      Total
                                    </div>

                                    <div className="mt-0.5 text-lg font-black text-slate-900">
                                      {Number(
                                        row.totalReports || 0
                                      )}
                                    </div>
                                  </div>


                                  <div className="px-3 py-2.5 text-center">
                                    <div className="text-[8px] font-black uppercase tracking-wide text-blue-500">
                                      Submitted
                                    </div>

                                    <div className="mt-0.5 text-lg font-black text-blue-700">
                                      {Number(
                                        row.submittedReports || 0
                                      )}
                                    </div>
                                  </div>


                                  <div className="px-3 py-2.5 text-center">
                                    <div className="text-[8px] font-black uppercase tracking-wide text-amber-600">
                                      Pending
                                    </div>

                                    <div className="mt-0.5 text-lg font-black text-amber-700">
                                      {Number(
                                        row.pendingReports || 0
                                      )}
                                    </div>
                                  </div>

                                </div>


                                {/* MODULE BREAKDOWN */}
                                <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">

                                  <div className="flex flex-wrap gap-2">

                                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-slate-600">
                                      Sweeping{' '}
                                      <strong className="text-slate-900">
                                        {Number(
                                          row.modules
                                            ?.sweeping
                                            ?.submittedReports ||
                                          0
                                        )}
                                        /
                                        {Number(
                                          row.modules
                                            ?.sweeping
                                            ?.totalReports ||
                                          0
                                        )}
                                      </strong>
                                    </span>


                                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-slate-600">
                                      Toilet{' '}
                                      <strong className="text-slate-900">
                                        {Number(
                                          row.modules
                                            ?.toilet
                                            ?.submittedReports ||
                                          0
                                        )}
                                        /
                                        {Number(
                                          row.modules
                                            ?.toilet
                                            ?.totalReports ||
                                          0
                                        )}
                                      </strong>
                                    </span>


                                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-bold text-slate-600">
                                      Litter Bin{' '}
                                      <strong className="text-slate-900">
                                        {Number(
                                          row.modules
                                            ?.litterBin
                                            ?.submittedReports ||
                                          0
                                        )}
                                        /
                                        {Number(
                                          row.modules
                                            ?.litterBin
                                            ?.totalReports ||
                                          0
                                        )}
                                      </strong>
                                    </span>

                                  </div>


                                  {hasRealSupervisor && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSupervisorId(
                                          row.supervisorId
                                        );

                                        setStatus(
                                          'ALL'
                                        );
                                      }}
                                      className="mt-3 inline-flex items-center gap-1 text-[10px] font-black text-blue-600 transition hover:text-blue-700"
                                    >
                                      View Reports
                                      <span>
                                        →
                                      </span>
                                    </button>
                                  )}

                                </div>

                              </div>
                            );
                          }
                        )}

                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
                        <User
                          size={25}
                          className="mx-auto text-slate-300"
                        />

                        <div className="mt-2 text-xs font-black text-slate-600">
                          No Supervisor assignments found
                        </div>

                        <div className="mt-1 text-[10px] font-semibold text-slate-400">
                          No Supervisor could be mapped to the reporting obligations in this ward.
                        </div>
                      </div>
                    )}

                  </div>
                )}
              {detailView === 'OVERVIEW' &&
                loading && (
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


              {detailView === 'OVERVIEW' &&
                !loading &&
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


              {detailView === 'OVERVIEW' &&
                showOperationalRecords &&
                !loading &&
                !error && (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-black text-slate-700">
                          {selectedComponent === 'SUPERVISOR' &&
                            selectedSupervisor
                            ? `${selectedSupervisor.supervisorName} — Reports`
                            : 'Operational Records'}
                        </div>

                        <div className="text-[10px] font-semibold text-slate-400">
                          {visibleRecords.length}{' '}
                          record
                          {visibleRecords.length === 1
                            ? ''
                            : 's'}
                        </div>
                      </div>
                    </div>


                    {visibleRecords.length ? (
                      <div className="space-y-3">
                        {visibleRecords.map(
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
                              onOpen={
                                openOperationalReport
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



                  </>
                )}
            </div>
          )}
        </div>
      </aside >
      {selectedReport && (
        <DetailModal
          report={
            selectedReport
          }
          loading={
            reportDetailLoading
          }
          stacked

          onClose={() => {
            setSelectedReport(
              null
            );

            setReportImagePreview(
              null
            );
          }}
          onImagePreview={
            setReportImagePreview
          }
        />
      )}


      {
        reportImagePreview && (
          <div
            className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/90 p-4"
            onClick={() =>
              setReportImagePreview(
                null
              )
            }
          >
            <button
              type="button"
              onClick={() =>
                setReportImagePreview(
                  null
                )
              }
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
            >
              <X
                size={20}
              />
            </button>

            <img
              src={
                reportImagePreview
              }
              alt="Inspection evidence"
              className="max-h-full max-w-full rounded-xl object-contain"
              onClick={(
                event
              ) =>
                event
                  .stopPropagation()
              }
            />
          </div>
        )
      }
    </div >,
    document.body
  );
}