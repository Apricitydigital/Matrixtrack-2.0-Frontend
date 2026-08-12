"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  BrushCleaning,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Target,
  Toilet,
  Trash2,
  Truck,
} from "lucide-react";

import {
  CityApi,
  CityModulesApi,
  ModuleRecordsApi,
} from "@lib/apiClient";

/* =========================================================
   TYPES
========================================================= */

type ModuleId =
  | "SWEEPING"
  | "TOILET"
  | "TWINBIN"
  | "TASKFORCE";

type ModuleTargetMap =
  Partial<
    Record<
      ModuleId,
      number | null
    >
  >;

type DailyRecord = {
  id?: string;
  status?: string;
  createdAt?: string;

  __moduleId?: ModuleId;
  __cityName?: string;

  [key: string]: any;
};

type ModulePerformance = {
  id: ModuleId;

  name: string;

  target:
    number | null;

  submitted: number;

  completed: number;

  pending: number;

  remaining:
    number | null;

  approved: number;

  rejected: number;

  actionRequired: number;

  targetProgress:
    number | null;

  completionRate: number;
};

/* =========================================================
   TARGETS

   IMPORTANT:
   Abhi fake targets nahi dal rahe.

   Baad me sirf values change karna:
   SWEEPING: 50
   TOILET: 30
   etc.
========================================================= */

const DEFAULT_DAILY_TARGETS: ModuleTargetMap = {
  SWEEPING: null,
  TOILET: null,
  TWINBIN: null,
  TASKFORCE: null,
};

/* =========================================================
   MODULE DEFINITIONS
========================================================= */

const MODULES = [
  {
    id: "SWEEPING" as ModuleId,

    name:
      "Sweeping",

    candidates: [
      "SWEEPING",
    ],

    icon:
      BrushCleaning,

    color:
      "#15976e",

    soft:
      "#edf9f5",

    border:
      "#cfeee3",
  },

  {
    id: "TOILET" as ModuleId,

    name:
      "Cleanliness of Toilets",

    candidates: [
      "TOILET",
    ],

    icon:
      Toilet,

    color:
      "#3974df",

    soft:
      "#eff5ff",

    border:
      "#d2e2ff",
  },

  {
    id: "TWINBIN" as ModuleId,

    name:
      "Litterbins",

    candidates: [
      "TWINBIN",
      "LITTERBINS",
    ],

    icon:
      Trash2,

    color:
      "#d98112",

    soft:
      "#fff7e9",

    border:
      "#f4dfb8",
  },

  {
    id: "TASKFORCE" as ModuleId,

    name:
      "CTU / GVP Transformation",

    candidates: [
      "TASKFORCE",
    ],

    icon:
      Truck,

    color:
      "#7657e8",

    soft:
      "#f4f1ff",

    border:
      "#ded5ff",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function normalize(
  value: unknown
) {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
}

function getDateKey(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function resolveModule(
  value: unknown
) {
  const text =
    normalize(value);

  if (
    text.includes(
      "SWEEP"
    )
  ) {
    return MODULES[0];
  }

  if (
    text.includes(
      "TOILET"
    )
  ) {
    return MODULES[1];
  }

  if (
    text.includes(
      "TWIN"
    ) ||
    text.includes(
      "LITTER"
    )
  ) {
    return MODULES[2];
  }

  if (
    text.includes(
      "TASKFORCE"
    ) ||
    text.includes(
      "GVP"
    ) ||
    text.includes(
      "CTU"
    )
  ) {
    return MODULES[3];
  }

  return null;
}

/* =========================================================
   STATUS LOGIC
========================================================= */

/*
  Inspection complete means report has reached
  a decision / action stage.

  Pending means anything else still moving
  through the workflow.
*/

function isCompletedStatus(
  status: unknown
) {
  return [
    "APPROVED",
    "REJECTED",
    "ACTION_REQUIRED",
    "ACTION_TAKEN",
    "RESOLVED",
  ].includes(
    normalize(status)
  );
}

function isApprovedStatus(
  status: unknown
) {
  return (
    normalize(status) ===
    "APPROVED"
  );
}

function isRejectedStatus(
  status: unknown
) {
  return (
    normalize(status) ===
    "REJECTED"
  );
}

function isActionRequiredStatus(
  status: unknown
) {
  return (
    normalize(status) ===
    "ACTION_REQUIRED"
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function DailyTargetPerformance({
  cityName,
  isSuperAdmin = false,
  filterCity = "ALL",
  date,
  refreshKey = 0,
  targets = DEFAULT_DAILY_TARGETS,
}: {
  cityName?:
    string | null;

  isSuperAdmin?:
    boolean;

  filterCity?:
    string;

  date?:
    string;

  refreshKey?:
    number;

  targets?:
    ModuleTargetMap;
}) {
  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    records,
    setRecords,
  ] =
    useState<
      DailyRecord[]
    >([]);

  const [
    enabledModules,
    setEnabledModules,
  ] =
    useState<
      ModuleId[]
    >([]);

  const [
    lastUpdated,
    setLastUpdated,
  ] =
    useState<Date | null>(
      null
    );

  /* =======================================================
     SELECTED DAY
  ======================================================= */

  const selectedDate =
    useMemo(
      () =>
        date ||
        getDateKey(
          new Date()
        ),
      [date]
    );

  /* =======================================================
     FETCH ONE MODULE
  ======================================================= */

  useEffect(() => {
    let cancelled =
      false;

    let running =
      false;

    const fetchModuleRecords =
      async ({
        moduleId,
        candidates,
        cityId,
        cityLabel,
      }: {
        moduleId:
          ModuleId;

        candidates:
          string[];

        cityId?:
          string;

        cityLabel?:
          string;
      }) => {
        const unique =
          Array.from(
            new Set(
              candidates
                .filter(
                  Boolean
                )
                .map(
                  normalize
                )
            )
          );

        for (
          const moduleKey
          of unique
        ) {
          try {
            const all:
              DailyRecord[] =
              [];

            let page =
              1;

            let totalPages =
              1;

            do {
              const response =
                await ModuleRecordsApi
                  .getRecords(
                    moduleKey,
                    {
                      page,

                      limit:
                        200,

                      fromDate:
                        selectedDate,

                      toDate:
                        selectedDate,

                      ...(cityId
                        ? {
                            cityId,
                          }
                        : {}),
                    }
                  );

              const pageData =
                (
                  response?.data ||
                  []
                ).map(
                  (
                    record:
                      DailyRecord
                  ) => ({
                    ...record,

                    __moduleId:
                      moduleId,

                    __cityName:
                      cityLabel,
                  })
                );

              all.push(
                ...pageData
              );

              totalPages =
                Number(
                  response
                    ?.meta
                    ?.totalPages ||
                    1
                );

              page +=
                1;

            } while (
              page <=
                totalPages &&
              page <= 50
            );

            return {
              ok: true,

              records:
                all,
            };

          } catch {
            /*
              Try next known
              module alias.
            */
          }
        }

        return {
          ok: false,

          records:
            [] as DailyRecord[],
        };
      };

    /* =====================================================
       LOAD DATA
    ===================================================== */

    const load =
      async () => {
        if (
          running
        ) {
          return;
        }

        running =
          true;

        try {
          if (
            !cancelled
          ) {
            setLoading(
              true
            );
          }

          /* ===============================================
             HMS SUPER ADMIN
          =============================================== */

          if (
            isSuperAdmin
          ) {
            const cityResponse =
              await CityApi
                .list()
                .catch(
                  () => ({
                    cities:
                      [],
                  })
                );

            const cities =
              (
                cityResponse
                  ?.cities ||
                []
              ).filter(
                (
                  city:
                    any
                ) =>
                  city.enabled &&
                  (
                    filterCity ===
                      "ALL" ||
                    String(
                      city.id
                    ) ===
                      String(
                        filterCity
                      )
                  )
              );

            const jobs:
              Promise<{
                ok:
                  boolean;

                records:
                  DailyRecord[];
              }>[] =
              [];

            const active =
              new Set<
                ModuleId
              >();

            cities.forEach(
              (
                city:
                  any
              ) => {
                (
                  city.modules ||
                  []
                )
                  .filter(
                    (
                      module:
                        any
                    ) =>
                      module.enabled
                  )
                  .forEach(
                    (
                      module:
                        any
                    ) => {
                      const resolved =
                        resolveModule(
                          module.name
                        );

                      if (
                        !resolved
                      ) {
                        return;
                      }

                      active.add(
                        resolved.id
                      );

                      jobs.push(
                        fetchModuleRecords(
                          {
                            moduleId:
                              resolved.id,

                            candidates:
                              resolved.candidates,

                            cityId:
                              city.id,

                            cityLabel:
                              city.name,
                          }
                        )
                      );
                    }
                  );
              }
            );

            const results =
              await Promise.all(
                jobs
              );

            if (
              !cancelled
            ) {
              setRecords(
                results
                  .filter(
                    (
                      item
                    ) =>
                      item.ok
                  )
                  .flatMap(
                    (
                      item
                    ) =>
                      item.records
                  )
              );

              setEnabledModules(
                Array.from(
                  active
                )
              );

              setLastUpdated(
                new Date()
              );
            }
          }

          /* ===============================================
             CITY ADMIN
          =============================================== */

          else {
            const moduleResponse =
              await CityModulesApi
                .list()
                .catch(
                  () => []
                );

            const modules =
              (
                Array.isArray(
                  moduleResponse
                )
                  ? moduleResponse
                  : []
              )
                .filter(
                  (
                    module:
                      any
                  ) =>
                    module.enabled
                )
                .map(
                  (
                    module:
                      any
                  ) => {
                    const resolved =
                      resolveModule(
                        module.key ||
                          module.name
                      );

                    if (
                      !resolved
                    ) {
                      return null;
                    }

                    return {
                      ...resolved,

                      candidates:
                        Array.from(
                          new Set(
                            [
                              normalize(
                                module.key
                              ),

                              ...resolved.candidates,
                            ].filter(
                              Boolean
                            )
                          )
                        ),
                    };
                  }
                )
                .filter(
                  Boolean
                ) as typeof MODULES;

            const unique =
              Array.from(
                new Map(
                  modules.map(
                    (
                      module
                    ) => [
                      module.id,
                      module,
                    ]
                  )
                ).values()
              );

            const results =
              await Promise.all(
                unique.map(
                  (
                    module
                  ) =>
                    fetchModuleRecords(
                      {
                        moduleId:
                          module.id,

                        candidates:
                          module.candidates,

                        cityLabel:
                          cityName ||
                          undefined,
                      }
                    )
                )
              );

            if (
              !cancelled
            ) {
              setRecords(
                results
                  .filter(
                    (
                      item
                    ) =>
                      item.ok
                  )
                  .flatMap(
                    (
                      item
                    ) =>
                      item.records
                  )
              );

              setEnabledModules(
                unique.map(
                  (
                    module
                  ) =>
                    module.id
                )
              );

              setLastUpdated(
                new Date()
              );
            }
          }

        } catch (
          error
        ) {
          console.error(
            "[DailyTargetPerformance]",
            error
          );

          if (
            !cancelled
          ) {
            setRecords(
              []
            );

            setEnabledModules(
              []
            );
          }

        } finally {
          running =
            false;

          if (
            !cancelled
          ) {
            setLoading(
              false
            );
          }
        }
      };

    /* Initial fetch */

    load();

    /* Near real-time REST refresh */

    const timer =
      window.setInterval(
        load,
        60_000
      );

    return () => {
      cancelled =
        true;

      window.clearInterval(
        timer
      );
    };

  }, [
    isSuperAdmin,
    filterCity,
    selectedDate,
    cityName,
    refreshKey,
  ]);

  /* =======================================================
     MODULE PERFORMANCE
  ======================================================= */

  const modulePerformance =
    useMemo<
      ModulePerformance[]
    >(() => {
      return MODULES
        .filter(
          (
            module
          ) =>
            enabledModules.includes(
              module.id
            )
        )
        .map(
          (
            module
          ) => {
            const moduleRecords =
              records.filter(
                (
                  record
                ) =>
                  record.__moduleId ===
                  module.id
              );

            const submitted =
              moduleRecords.length;

            const completed =
              moduleRecords.filter(
                (
                  record
                ) =>
                  isCompletedStatus(
                    record.status
                  )
              ).length;

            const pending =
              Math.max(
                0,
                submitted -
                  completed
              );

            const approved =
              moduleRecords.filter(
                (
                  record
                ) =>
                  isApprovedStatus(
                    record.status
                  )
              ).length;

            const rejected =
              moduleRecords.filter(
                (
                  record
                ) =>
                  isRejectedStatus(
                    record.status
                  )
              ).length;

            const actionRequired =
              moduleRecords.filter(
                (
                  record
                ) =>
                  isActionRequiredStatus(
                    record.status
                  )
              ).length;

            const target =
              targets[
                module.id
              ] ??
              null;

            const remaining =
              target !==
                null
                ? Math.max(
                    0,
                    target -
                      submitted
                  )
                : null;

            const targetProgress =
              target !==
                null &&
              target > 0
                ? Math.round(
                    Math.min(
                      100,
                      (
                        submitted /
                        target
                      ) *
                        100
                    )
                  )
                : null;

            const completionRate =
              submitted > 0
                ? Math.round(
                    (
                      completed /
                      submitted
                    ) *
                      100
                  )
                : 0;

            return {
              id:
                module.id,

              name:
                module.name,

              target,

              submitted,

              completed,

              pending,

              remaining,

              approved,

              rejected,

              actionRequired,

              targetProgress,

              completionRate,
            };
          }
        );
    }, [
      records,
      enabledModules,
      targets,
    ]);

  /* =======================================================
     OVERALL SUMMARY
  ======================================================= */

  const summary =
    useMemo(() => {
      const totalSubmitted =
        modulePerformance.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.submitted,
          0
        );

      const totalCompleted =
        modulePerformance.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.completed,
          0
        );

      const totalPending =
        modulePerformance.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.pending,
          0
        );

      const approved =
        modulePerformance.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.approved,
          0
        );

      const rejected =
        modulePerformance.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.rejected,
          0
        );

      const actionRequired =
        modulePerformance.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.actionRequired,
          0
        );

      const moduleCount =
        modulePerformance.length;

      const avgReports =
        moduleCount > 0
          ? Math.round(
              totalSubmitted /
                moduleCount
            )
          : 0;

      const avgCompletion =
        moduleCount > 0
          ? Math.round(
              modulePerformance.reduce(
                (
                  sum,
                  item
                ) =>
                  sum +
                  item.completionRate,
                0
              ) /
                moduleCount
            )
          : 0;

      const configuredTargets =
        modulePerformance.filter(
          (
            item
          ) =>
            item.target !==
              null &&
            (
              item.target ||
              0
            ) > 0
        );

      const avgTargetAchievement =
        configuredTargets.length >
        0
          ? Math.round(
              configuredTargets.reduce(
                (
                  sum,
                  item
                ) =>
                  sum +
                  (
                    item.targetProgress ||
                    0
                  ),
                0
              ) /
                configuredTargets.length
            )
          : null;

      return {
        totalSubmitted,

        totalCompleted,

        totalPending,

        approved,

        rejected,

        actionRequired,

        avgReports,

        avgCompletion,

        avgTargetAchievement,

        configuredTargets:
          configuredTargets.length,
      };

    }, [
      modulePerformance,
    ]);

  /* =======================================================
     UI
  ======================================================= */

  return (
    <section className="dtp-shell">

      <style>{`

        .dtp-shell {
          width: 100%;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .dtp-main {
          overflow: hidden;

          border:
            1px solid #e4ebf5;

          border-radius:
            24px;

          background:
            #ffffff;

          box-shadow:
            0 10px 30px
            rgba(
              25,
              51,
              89,
              .055
            );
        }

        .dtp-head {
          padding:
            20px 22px;

          display: flex;

          align-items:
            flex-start;

          justify-content:
            space-between;

          gap: 16px;

          border-bottom:
            1px solid #f1f5f9;
        }

        .dtp-head-left {
          display: flex;

          align-items:
            flex-start;

          gap: 11px;
        }

        .dtp-head-line {
          width: 4px;

          height: 31px;

          border-radius:
            999px;

          background:
            #2f6fed;
        }

        .dtp-title {
          margin: 0;

          color:
            #1b2942;

          font-size:
            14px;

          line-height:
            1.2;

          font-weight:
            900;

          letter-spacing:
            .065em;

          text-transform:
            uppercase;
        }

        .dtp-subtitle {
          margin-top:
            4px;

          color:
            #8795a9;

          font-size:
            10px;

          line-height:
            1.45;

          font-weight:
            650;
        }

        .dtp-live {
          height:
            31px;

          padding:
            0 10px;

          border:
            1px solid #bbf7d0;

          border-radius:
            999px;

          background:
            #f0fdf4;

          color:
            #15803d;

          display:
            inline-flex;

          align-items:
            center;

          gap: 6px;

          font-size:
            9px;

          font-weight:
            850;

          white-space:
            nowrap;
        }

        .dtp-live-dot {
          width:
            6px;

          height:
            6px;

          border-radius:
            50%;

          background:
            #22c55e;

          box-shadow:
            0 0 0 4px
            rgba(
              34,
              197,
              94,
              .09
            );
        }

        /* =========================
           OVERALL SUMMARY
        ========================= */

        .dtp-summary {
          padding:
            18px 20px;

          display: grid;

          grid-template-columns:
            repeat(
              6,
              minmax(
                0,
                1fr
              )
            );

          gap: 10px;

          background:
            linear-gradient(
              180deg,
              #fbfdff,
              #ffffff
            );
        }

        .dtp-summary-card {
          min-height:
            84px;

          padding:
            12px;

          border:
            1px solid #e7edf5;

          border-radius:
            15px;

          background:
            #ffffff;
        }

        .dtp-summary-label {
          color:
            #8290a5;

          font-size:
            8px;

          font-weight:
            850;

          letter-spacing:
            .055em;

          text-transform:
            uppercase;
        }

        .dtp-summary-value {
          margin-top:
            7px;

          color:
            #17243c;

          font-size:
            23px;

          line-height:
            1;

          font-weight:
            900;
        }

        .dtp-summary-help {
          margin-top:
            5px;

          color:
            #98a4b5;

          font-size:
            8px;

          font-weight:
            650;
        }

        /* =========================
           MODULE CARDS
        ========================= */

        .dtp-module-grid {
          padding:
            4px 20px 20px;

          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );

          gap: 14px;
        }

        .dtp-module-card {
          overflow:
            hidden;

          border:
            1px solid
            var(
              --dtp-border
            );

          border-radius:
            19px;

          background:
            linear-gradient(
              145deg,
              #ffffff 0%,
              var(
                --dtp-soft
              ) 180%
            );
        }

        .dtp-module-top {
          padding:
            15px;

          display: flex;

          justify-content:
            space-between;

          align-items:
            flex-start;

          gap: 12px;

          border-bottom:
            1px solid
            rgba(
              226,
              232,
              240,
              .72
            );
        }

        .dtp-module-title-row {
          display: flex;

          align-items:
            center;

          gap: 10px;
        }

        .dtp-module-icon {
          width:
            39px;

          height:
            39px;

          border-radius:
            12px;

          display: grid;

          place-items:
            center;

          color:
            var(
              --dtp-color
            );

          background:
            #ffffff;

          border:
            1px solid
            var(
              --dtp-border
            );
        }

        .dtp-module-name {
          color:
            #1c2b44;

          font-size:
            12px;

          font-weight:
            850;
        }

        .dtp-module-date {
          margin-top:
            3px;

          color:
            #8b98aa;

          font-size:
            9px;

          font-weight:
            650;
        }

        .dtp-target-pill {
          padding:
            6px 9px;

          border-radius:
            9px;

          background:
            #ffffff;

          color:
            #64748b;

          border:
            1px solid #e2e8f0;

          font-size:
            9px;

          font-weight:
            800;

          white-space:
            nowrap;
        }

        /* =========================
           TARGET
        ========================= */

        .dtp-progress {
          padding:
            14px 15px 4px;
        }

        .dtp-progress-head {
          display: flex;

          justify-content:
            space-between;

          gap: 10px;

          color:
            #64748b;

          font-size:
            9px;

          font-weight:
            750;
        }

        .dtp-track {
          height:
            8px;

          margin-top:
            8px;

          border-radius:
            999px;

          overflow:
            hidden;

          background:
            #e8edf4;
        }

        .dtp-target-missing {
          height:
            100%;

          background:
            repeating-linear-gradient(
              45deg,
              #e2e8f0,
              #e2e8f0 5px,
              #f8fafc 5px,
              #f8fafc 10px
            );
        }

        .dtp-progress-fill {
          height:
            100%;

          border-radius:
            999px;

          background:
            var(
              --dtp-color
            );

          transition:
            width .6s ease;
        }

        /* =========================
           MAIN NUMBERS
        ========================= */

        .dtp-main-stats {
          padding:
            12px 15px;

          display: grid;

          grid-template-columns:
            repeat(
              5,
              1fr
            );

          gap: 7px;
        }

        .dtp-stat {
          min-width:
            0;

          padding:
            9px 7px;

          border:
            1px solid
            rgba(
              226,
              232,
              240,
              .85
            );

          border-radius:
            11px;

          background:
            rgba(
              255,
              255,
              255,
              .8
            );

          text-align:
            center;
        }

        .dtp-stat-number {
          color:
            #1e293b;

          font-size:
            17px;

          line-height:
            1;

          font-weight:
            900;
        }

        .dtp-stat-label {
          margin-top:
            5px;

          color:
            #8b98aa;

          font-size:
            7px;

          line-height:
            1.25;

          font-weight:
            800;

          text-transform:
            uppercase;
        }

        /* =========================
           INSPECTION COMPLETION
        ========================= */

        .dtp-completion {
          padding:
            0 15px 13px;
        }

        .dtp-completion-head {
          display: flex;

          justify-content:
            space-between;

          margin-bottom:
            6px;

          color:
            #64748b;

          font-size:
            9px;

          font-weight:
            750;
        }

        .dtp-completion-track {
          height:
            5px;

          overflow:
            hidden;

          border-radius:
            999px;

          background:
            #e8edf4;
        }

        .dtp-completion-fill {
          height:
            100%;

          border-radius:
            999px;

          background:
            #16a34a;
        }

        /* =========================
           STATUS FOOTER
        ========================= */

        .dtp-status-row {
          padding:
            11px 15px;

          border-top:
            1px solid
            rgba(
              226,
              232,
              240,
              .75
            );

          display: grid;

          grid-template-columns:
            repeat(
              3,
              1fr
            );

          gap: 7px;
        }

        .dtp-status {
          min-height:
            31px;

          padding:
            0 8px;

          border-radius:
            9px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          gap: 5px;

          font-size:
            8px;

          font-weight:
            800;
        }

        .dtp-status.approved {
          color:
            #15803d;

          background:
            #f0fdf4;

          border:
            1px solid #bbf7d0;
        }

        .dtp-status.rejected {
          color:
            #dc2626;

          background:
            #fef2f2;

          border:
            1px solid #fecaca;
        }

        .dtp-status.action {
          color:
            #c2410c;

          background:
            #fff7ed;

          border:
            1px solid #fed7aa;
        }

        /* =========================
           AVERAGE
        ========================= */

        .dtp-average {
          margin:
            0 20px 20px;

          padding:
            16px;

          border:
            1px solid #dbe7ff;

          border-radius:
            18px;

          background:
            linear-gradient(
              120deg,
              #f8fbff,
              #f3f7ff
            );

          display: grid;

          grid-template-columns:
            1.4fr
            repeat(
              3,
              1fr
            );

          align-items:
            center;

          gap: 12px;
        }

        .dtp-average-title {
          color:
            #1e3a8a;

          font-size:
            11px;

          font-weight:
            900;
        }

        .dtp-average-sub {
          margin-top:
            3px;

          color:
            #718096;

          font-size:
            9px;

          font-weight:
            650;
        }

        .dtp-average-item {
          text-align:
            center;
        }

        .dtp-average-value {
          color:
            #17243c;

          font-size:
            20px;

          font-weight:
            900;
        }

        .dtp-average-label {
          margin-top:
            3px;

          color:
            #8290a5;

          font-size:
            8px;

          font-weight:
            800;

          text-transform:
            uppercase;
        }

        .dtp-loading {
          min-height:
            260px;

          display:
            grid;

          place-items:
            center;

          color:
            #8b98aa;

          font-size:
            11px;

          font-weight:
            700;
        }

        /* =========================
           RESPONSIVE
        ========================= */

        @media (
          max-width:
            1150px
        ) {
          .dtp-summary {
            grid-template-columns:
              repeat(
                3,
                1fr
              );
          }

          .dtp-main-stats {
            grid-template-columns:
              repeat(
                3,
                1fr
              );
          }
        }

        @media (
          max-width:
            850px
        ) {
          .dtp-module-grid {
            grid-template-columns:
              1fr;
          }

          .dtp-average {
            grid-template-columns:
              1fr
              1fr
              1fr;
          }

          .dtp-average > div:first-child {
            grid-column:
              1 / -1;
          }
        }

        @media (
          max-width:
            600px
        ) {
          .dtp-head {
            padding:
              16px;

            flex-direction:
              column;
          }

          .dtp-summary {
            padding:
              14px;

            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .dtp-module-grid {
            padding:
              0 14px 14px;
          }

          .dtp-main-stats {
            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .dtp-average {
            margin:
              0 14px 14px;

            grid-template-columns:
              1fr;
          }
        }

      `}</style>


      <div className="dtp-main">

        {/* =========================
            HEADER
        ========================= */}

        <div className="dtp-head">

          <div className="dtp-head-left">

            <span className="dtp-head-line" />

            <div>

              <h2 className="dtp-title">
                Daily Target Performance
              </h2>

              <div className="dtp-subtitle">
                Module-wise target,
                submission and
                inspection status
                {" · "}
                {selectedDate}
              </div>

            </div>

          </div>


          <div className="dtp-live">

            <span className="dtp-live-dot" />

            AUTO 60s

            {lastUpdated && (
              <>
                {" · "}

                {lastUpdated
                  .toLocaleTimeString(
                    "en-IN",
                    {
                      hour:
                        "2-digit",

                      minute:
                        "2-digit",

                      hour12:
                        true,
                    }
                  )}
              </>
            )}

          </div>

        </div>


        {/* =========================
            LOADING
        ========================= */}

        {loading ? (

          <div className="dtp-loading">

            <div
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                gap:
                  8,
              }}
            >
              <RefreshCw
                size={15}
                className="animate-spin"
              />

              Loading daily
              performance...
            </div>

          </div>

        ) : (

          <>

            {/* =====================
                SUMMARY
            ===================== */}

            <div className="dtp-summary">

              <SummaryCard
                label="Reports Submitted"
                value={
                  summary.totalSubmitted
                }
                help="Today's reports"
              />

              <SummaryCard
                label="Inspection Complete"
                value={
                  summary.totalCompleted
                }
                help="Decision completed"
              />

              <SummaryCard
                label="Pending Inspection"
                value={
                  summary.totalPending
                }
                help="Still in workflow"
              />

              <SummaryCard
                label="Approved"
                value={
                  summary.approved
                }
                help="QC approved"
                color="#16a34a"
              />

              <SummaryCard
                label="Rejected"
                value={
                  summary.rejected
                }
                help="Rejected reports"
                color="#ef4444"
              />

              <SummaryCard
                label="Action Required"
                value={
                  summary.actionRequired
                }
                help="Needs field action"
                color="#f97316"
              />

            </div>


            {/* =====================
                MODULES
            ===================== */}

            <div className="dtp-module-grid">

              {modulePerformance.map(
                (
                  module
                ) => {
                  const visual =
                    MODULES.find(
                      (
                        item
                      ) =>
                        item.id ===
                        module.id
                    )!;

                  const Icon =
                    visual.icon;

                  return (

                    <article
                      key={
                        module.id
                      }
                      className="dtp-module-card"
                      style={{
                        "--dtp-color":
                          visual.color,

                        "--dtp-soft":
                          visual.soft,

                        "--dtp-border":
                          visual.border,
                      } as React.CSSProperties}
                    >

                      {/* TOP */}

                      <div className="dtp-module-top">

                        <div className="dtp-module-title-row">

                          <div className="dtp-module-icon">
                            <Icon
                              size={
                                19
                              }
                            />
                          </div>

                          <div>

                            <div className="dtp-module-name">
                              {
                                module.name
                              }
                            </div>

                            <div className="dtp-module-date">
                              Daily performance
                            </div>

                          </div>

                        </div>


                        <div className="dtp-target-pill">

                          <Target
                            size={
                              11
                            }
                            style={{
                              display:
                                "inline",

                              marginRight:
                                4,
                            }}
                          />

                          Target{" "}
                          {module.target ??
                            "—"}

                        </div>

                      </div>


                      {/* TARGET PROGRESS */}

                      <div className="dtp-progress">

                        <div className="dtp-progress-head">

                          <span>
                            Target Progress
                          </span>

                          <strong
                            style={{
                              color:
                                module.targetProgress !==
                                null
                                  ? visual.color
                                  : "#94a3b8",
                            }}
                          >
                            {module.targetProgress !==
                            null
                              ? `${module.targetProgress}%`
                              : "Target not configured"}
                          </strong>

                        </div>


                        <div className="dtp-track">

                          {module.targetProgress ===
                          null ? (

                            <div className="dtp-target-missing" />

                          ) : (

                            <div
                              className="dtp-progress-fill"
                              style={{
                                width:
                                  `${module.targetProgress}%`,
                              }}
                            />

                          )}

                        </div>

                      </div>


                      {/* COUNTS */}

                      <div className="dtp-main-stats">

                        <MiniStat
                          label="Target"
                          value={
                            module.target ??
                            "—"
                          }
                        />

                        <MiniStat
                          label="Submitted"
                          value={
                            module.submitted
                          }
                        />

                        <MiniStat
                          label="Remaining"
                          value={
                            module.remaining ??
                            "—"
                          }
                        />

                        <MiniStat
                          label="Complete"
                          value={
                            module.completed
                          }
                        />

                        <MiniStat
                          label="Pending"
                          value={
                            module.pending
                          }
                        />

                      </div>


                      {/* INSPECTION COMPLETION */}

                      <div className="dtp-completion">

                        <div className="dtp-completion-head">

                          <span>
                            Inspection Completion
                          </span>

                          <strong
                            style={{
                              color:
                                "#16a34a",
                            }}
                          >
                            {
                              module.completionRate
                            }
                            %
                          </strong>

                        </div>

                        <div className="dtp-completion-track">

                          <div
                            className="dtp-completion-fill"
                            style={{
                              width:
                                `${module.completionRate}%`,
                            }}
                          />

                        </div>

                      </div>


                      {/* STATUS */}

                      <div className="dtp-status-row">

                        <div className="dtp-status approved">

                          <CheckCircle2
                            size={
                              12
                            }
                          />

                          Approved{" "}
                          {
                            module.approved
                          }

                        </div>


                        <div className="dtp-status rejected">

                          <FileText
                            size={
                              12
                            }
                          />

                          Rejected{" "}
                          {
                            module.rejected
                          }

                        </div>


                        <div className="dtp-status action">

                          <AlertTriangle
                            size={
                              12
                            }
                          />

                          Action{" "}
                          {
                            module.actionRequired
                          }

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>


            {/* =====================
                OVERALL AVERAGE
            ===================== */}

            <div className="dtp-average">

              <div>

                <div className="dtp-average-title">
                  Overall Average Performance
                </div>

                <div className="dtp-average-sub">
                  Average across currently
                  enabled inspection modules
                </div>

              </div>


              <div className="dtp-average-item">

                <div className="dtp-average-value">
                  {
                    summary.avgReports
                  }
                </div>

                <div className="dtp-average-label">
                  Avg Reports / Module
                </div>

              </div>


              <div className="dtp-average-item">

                <div className="dtp-average-value">
                  {
                    summary.avgCompletion
                  }
                  %
                </div>

                <div className="dtp-average-label">
                  Avg Inspection Completion
                </div>

              </div>


              <div className="dtp-average-item">

                <div className="dtp-average-value">
                  {summary.avgTargetAchievement !==
                  null
                    ? `${summary.avgTargetAchievement}%`
                    : "—"}
                </div>

                <div className="dtp-average-label">
                  Avg Target Achievement
                </div>

              </div>

            </div>

          </>

        )}

      </div>

    </section>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function SummaryCard({
  label,
  value,
  help,
  color,
}: {
  label:
    string;

  value:
    number | string;

  help:
    string;

  color?:
    string;
}) {
  return (
    <div className="dtp-summary-card">

      <div className="dtp-summary-label">
        {label}
      </div>

      <div
        className="dtp-summary-value"
        style={{
          color:
            color ||
            "#17243c",
        }}
      >
        {value}
      </div>

      <div className="dtp-summary-help">
        {help}
      </div>

    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label:
    string;

  value:
    number | string;
}) {
  return (
    <div className="dtp-stat">

      <div className="dtp-stat-number">
        {value}
      </div>

      <div className="dtp-stat-label">
        {label}
      </div>

    </div>
  );
}