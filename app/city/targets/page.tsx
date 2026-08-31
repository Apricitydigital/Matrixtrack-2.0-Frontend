"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Filter,
  Gauge,
  History,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ApiError } from "@lib/apiClient";

import {
  TargetsApi,
  type EmployeeTargetPerformance,
  type TargetHistoryResponse,
  type TargetPeriodType,
  type TargetRole,
  type TargetUser,
} from "@lib/targetsApi";

/* =========================================================
   TYPES
========================================================= */

type StatusFilter =
  | "ALL"
  | "MET"
  | "IN_PROGRESS"
  | "NOT_STARTED";

type MetricTone =
  | "blue"
  | "violet"
  | "emerald"
  | "amber"
  | "cyan";

/* =========================================================
   HELPERS
========================================================= */

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

function localDateString() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      now.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateOnly(
  value: string,
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  if (
    date.getUTCFullYear() !==
    year ||
    date.getUTCMonth() !==
    month - 1 ||
    date.getUTCDate() !==
    day
  ) {
    return null;
  }

  return date;
}

function formatDate(
  value: string | Date,
) {
  const date =
    typeof value === "string"
      ? new Date(value)
      : value;

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(date);
}

function formatDateTime(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    },
  ).format(date);
}

function moduleLabel(
  moduleName: string,
) {
  switch (
  moduleName.toUpperCase()
  ) {
    case "LITTERBINS":
      return "Litter Bins";

    case "SWEEPING":
      return "Sweeping";

    case "TOILET":
      return "Toilet";

    default:
      return moduleName;
  }
}

function periodLabel(
  periodType:
    TargetPeriodType,
) {
  switch (periodType) {
    case "DAILY":
      return "Daily";

    case "WEEKLY":
      return "Weekly";

    case "MONTHLY":
      return "Monthly";

    default:
      return periodType;
  }
}

function calculatePeriodPreview(
  periodType:
    TargetPeriodType,
  selectedDate: string,
) {
  const date =
    parseDateOnly(
      selectedDate,
    );

  if (!date) {
    return null;
  }

  let start =
    new Date(
      date.getTime(),
    );

  let end =
    new Date(
      date.getTime(),
    );

  if (
    periodType ===
    "WEEKLY"
  ) {
    end =
      new Date(
        start.getTime() +
        6 *
        24 *
        60 *
        60 *
        1000,
      );
  }

  if (
    periodType ===
    "MONTHLY"
  ) {
    start =
      new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          1,
        ),
      );

    end =
      new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth() +
          1,
          0,
        ),
      );
  }

  const days =
    Math.round(
      (
        end.getTime() -
        start.getTime()
      ) /
      86_400_000,
    ) + 1;

  return {
    start,
    end,
    days,
  };
}

function progressBarClass(
  progress: number,
) {
  if (progress >= 100) {
    return "bg-emerald-500";
  }

  if (progress >= 60) {
    return "bg-blue-500";
  }

  if (progress > 0) {
    return "bg-amber-500";
  }

  return "bg-slate-300";
}

function getProgressState(
  target:
    EmployeeTargetPerformance,
) {
  if (target.targetMet) {
    return {
      label: "Target Met",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }

  if (target.achieved > 0) {
    return {
      label: "In Progress",
      className:
        "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  return {
    label: "Not Started",
    className:
      "bg-slate-50 text-slate-600 border-slate-200",
  };
}

function shortId(
  value: string,
) {
  if (!value) {
    return "—";
  }

  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(
    0,
    8,
  )}…${value.slice(-4)}`;
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function TargetAssignmentPage() {
  /* =======================================================
     PAGE STATE
  ======================================================= */

  const [
    mounted,
    setMounted,
  ] =
    useState(false);

  const [
    optionsLoading,
    setOptionsLoading,
  ] =
    useState(true);

  const [
    targetsLoading,
    setTargetsLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  /* =======================================================
     API DATA
  ======================================================= */

  const [
    supervisors,
    setSupervisors,
  ] =
    useState<TargetUser[]>(
      [],
    );

  const [
    qcUsers,
    setQcUsers,
  ] =
    useState<TargetUser[]>(
      [],
    );

  const [
    targets,
    setTargets,
  ] =
    useState<
      EmployeeTargetPerformance[]
    >([]);

  /* =======================================================
     CREATE TARGET FORM
  ======================================================= */

  const [
    role,
    setRole,
  ] =
    useState<TargetRole>(
      "SUPERVISOR",
    );

  const [
    userId,
    setUserId,
  ] =
    useState("");

  const [
    moduleId,
    setModuleId,
  ] =
    useState("");

  const [
    periodType,
    setPeriodType,
  ] =
    useState<TargetPeriodType>(
      "DAILY",
    );

  const [
    startDate,
    setStartDate,
  ] =
    useState(
      localDateString(),
    );

  const [
    targetValue,
    setTargetValue,
  ] =
    useState("");

  /* =======================================================
     FILTERS
  ======================================================= */

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");

  const [
    roleFilter,
    setRoleFilter,
  ] =
    useState<
      TargetRole | "ALL"
    >("ALL");

  const [
    moduleFilter,
    setModuleFilter,
  ] =
    useState("ALL");

  const [
    periodFilter,
    setPeriodFilter,
  ] =
    useState<
      | TargetPeriodType
      | "ALL"
    >("ALL");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "ALL",
    );

  /* =======================================================
     EDIT MODAL
  ======================================================= */

  const [
    editingTarget,
    setEditingTarget,
  ] =
    useState<
      EmployeeTargetPerformance | null
    >(null);

  const [
    editValue,
    setEditValue,
  ] =
    useState("");

  const [
    editSaving,
    setEditSaving,
  ] =
    useState(false);

  /* =======================================================
     HISTORY MODAL
  ======================================================= */

  const [
    historyTarget,
    setHistoryTarget,
  ] =
    useState<
      EmployeeTargetPerformance | null
    >(null);

  const [
    historyData,
    setHistoryData,
  ] =
    useState<
      TargetHistoryResponse | null
    >(null);

  const [
    historyLoading,
    setHistoryLoading,
  ] =
    useState(false);

  const [
    modalError,
    setModalError,
  ] =
    useState("");

  /* =======================================================
     MOUNT
  ======================================================= */

  useEffect(() => {
    setMounted(true);
  }, []);

  /* =======================================================
     AVAILABLE USERS / MODULES
  ======================================================= */

  const availableUsers =
    useMemo(() => {
      const users =
        role === "SUPERVISOR"
          ? supervisors
          : qcUsers;

      return [...users].sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
          ),
      );
    }, [
      role,
      supervisors,
      qcUsers,
    ]);

  const selectedUser =
    useMemo(
      () =>
        availableUsers.find(
          (user) =>
            user.userId ===
            userId,
        ),
      [
        availableUsers,
        userId,
      ],
    );

  const availableModules =
    useMemo(() => {
      return [
        ...(
          selectedUser?.modules ??
          []
        ),
      ].sort(
        (a, b) =>
          moduleLabel(
            a.name,
          ).localeCompare(
            moduleLabel(
              b.name,
            ),
          ),
      );
    }, [selectedUser]);

  /* =======================================================
     PERIOD PREVIEW
  ======================================================= */

  const periodPreview =
    useMemo(
      () =>
        calculatePeriodPreview(
          periodType,
          startDate,
        ),
      [
        periodType,
        startDate,
      ],
    );

  /* =======================================================
     LOAD OPTIONS
  ======================================================= */

  const loadOptions =
    useCallback(
      async () => {
        setOptionsLoading(
          true,
        );

        try {
          const response =
            await TargetsApi.options();

          setSupervisors(
            response.supervisors ??
            [],
          );

          setQcUsers(
            response.qcUsers ??
            [],
          );
        } catch (err) {
          setError(
            getErrorMessage(
              err,
              "Unable to load target assignment options.",
            ),
          );
        } finally {
          setOptionsLoading(
            false,
          );
        }
      },
      [],
    );

  /* =======================================================
     LOAD TARGETS
  ======================================================= */

  const loadTargets =
    useCallback(
      async () => {
        setTargetsLoading(
          true,
        );

        try {
          const response =
            await TargetsApi.performance();

          setTargets(
            response.targets ??
            [],
          );
        } catch (err) {
          setError(
            getErrorMessage(
              err,
              "Unable to load target performance.",
            ),
          );
        } finally {
          setTargetsLoading(
            false,
          );
        }
      },
      [],
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  const loadPage =
    useCallback(
      async () => {
        setError("");

        /*
         * Intentionally sequential.
         * This avoids unnecessary pressure
         * on the existing Prisma pool.
         */
        await loadOptions();
        await loadTargets();
      },
      [
        loadOptions,
        loadTargets,
      ],
    );

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  /* =======================================================
     RESET DEPENDENT FIELDS
  ======================================================= */

  useEffect(() => {
    setUserId("");
    setModuleId("");
  }, [role]);

  useEffect(() => {
    setModuleId("");
  }, [userId]);

  /* =======================================================
     SUCCESS AUTO HIDE
  ======================================================= */

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          setSuccessMessage("");
        },
        4500,
      );

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [successMessage]);

  /* =======================================================
     MODAL KEYBOARD / SCROLL
  ======================================================= */

  const modalOpen =
    Boolean(
      editingTarget ||
      historyTarget,
    );

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event:
        KeyboardEvent,
    ) => {
      if (
        event.key ===
        "Escape" &&
        !editSaving
      ) {
        setEditingTarget(
          null,
        );

        setHistoryTarget(
          null,
        );

        setModalError("");
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    modalOpen,
    editSaving,
  ]);

  /* =======================================================
     MODULE FILTER OPTIONS
  ======================================================= */

  const uniqueModules =
    useMemo(() => {
      const names =
        new Set<string>();

      targets.forEach(
        (target) => {
          names.add(
            target.module.name,
          );
        },
      );

      supervisors.forEach(
        (user) => {
          user.modules.forEach(
            (module) => {
              names.add(
                module.name,
              );
            },
          );
        },
      );

      qcUsers.forEach(
        (user) => {
          user.modules.forEach(
            (module) => {
              names.add(
                module.name,
              );
            },
          );
        },
      );

      return Array.from(
        names,
      ).sort((a, b) =>
        moduleLabel(
          a,
        ).localeCompare(
          moduleLabel(
            b,
          ),
        ),
      );
    }, [
      targets,
      supervisors,
      qcUsers,
    ]);

  /* =======================================================
     FILTERED TARGETS
  ======================================================= */

  const filteredTargets =
    useMemo(() => {
      const search =
        searchTerm
          .trim()
          .toLowerCase();

      return targets.filter(
        (target) => {
          if (
            search &&
            ![
              target.user.name,
              target.user.email ??
              "",
              target.module.name,
              moduleLabel(
                target.module.name,
              ),
              target.role,
              target.periodType,
            ].some((value) =>
              String(value)
                .toLowerCase()
                .includes(
                  search,
                ),
            )
          ) {
            return false;
          }

          if (
            roleFilter !==
            "ALL" &&
            target.role !==
            roleFilter
          ) {
            return false;
          }

          if (
            moduleFilter !==
            "ALL" &&
            target.module.name !==
            moduleFilter
          ) {
            return false;
          }

          if (
            periodFilter !==
            "ALL" &&
            target.periodType !==
            periodFilter
          ) {
            return false;
          }

          if (
            statusFilter ===
            "MET" &&
            !target.targetMet
          ) {
            return false;
          }

          if (
            statusFilter ===
            "IN_PROGRESS" &&
            (
              target.targetMet ||
              target.achieved <=
              0
            )
          ) {
            return false;
          }

          if (
            statusFilter ===
            "NOT_STARTED" &&
            target.achieved !== 0
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      targets,
      searchTerm,
      roleFilter,
      moduleFilter,
      periodFilter,
      statusFilter,
    ]);

  /* =======================================================
     KPI SUMMARY
  ======================================================= */

  const summary =
    useMemo(() => {
      const totalTarget =
        filteredTargets.reduce(
          (
            total,
            target,
          ) =>
            total +
            target.targetValue,
          0,
        );

      const achieved =
        filteredTargets.reduce(
          (
            total,
            target,
          ) =>
            total +
            target.achieved,
          0,
        );

      const completed =
        filteredTargets.filter(
          (target) =>
            target.targetMet,
        ).length;

      const progress =
        totalTarget > 0
          ? Math.round(
            (
              achieved /
              totalTarget
            ) *
            10000,
          ) / 100
          : 0;

      return {
        assigned:
          filteredTargets.length,

        totalTarget,

        achieved,

        completed,

        progress,
      };
    }, [
      filteredTargets,
    ]);

  /* =======================================================
     CREATE TARGET
  ======================================================= */

  const handleCreate =
    async (
      event:
        React.FormEvent,
    ) => {
      event.preventDefault();

      setError("");
      setSuccessMessage("");

      const numericTarget =
        Number(targetValue);

      if (!userId) {
        setError(
          "Please select a user.",
        );

        return;
      }

      if (!moduleId) {
        setError(
          "Please select an assigned module.",
        );

        return;
      }

      if (!startDate) {
        setError(
          "Please select a start date.",
        );

        return;
      }

      if (
        !Number.isInteger(
          numericTarget,
        ) ||
        numericTarget <= 0
      ) {
        setError(
          "Target must be a positive whole number.",
        );

        return;
      }

      setSaving(true);

      try {
        await TargetsApi.create({
          userId,
          moduleId,
          role,
          periodType,
          startDate,
          targetValue:
            numericTarget,
        });

        setSuccessMessage(
          "Target assigned successfully.",
        );

        setUserId("");
        setModuleId("");
        setTargetValue("");

        await loadTargets();
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Unable to assign target.",
          ),
        );
      } finally {
        setSaving(false);
      }
    };

  /* =======================================================
     REFRESH
  ======================================================= */

  const refreshAll =
    async () => {
      setError("");
      setSuccessMessage("");

      await loadPage();
    };

  /* =======================================================
     EDIT TARGET
  ======================================================= */

  const openEdit =
    (
      target:
        EmployeeTargetPerformance,
    ) => {
      setModalError("");

      setEditingTarget(
        target,
      );

      setEditValue(
        String(
          target.targetValue,
        ),
      );
    };

  const closeEdit =
    () => {
      if (editSaving) {
        return;
      }

      setEditingTarget(
        null,
      );

      setEditValue("");
      setModalError("");
    };

  const handleEditSave =
    async () => {
      if (!editingTarget) {
        return;
      }

      const numericValue =
        Number(editValue);

      if (
        !Number.isInteger(
          numericValue,
        ) ||
        numericValue <= 0
      ) {
        setModalError(
          "Target must be a positive whole number.",
        );

        return;
      }

      setModalError("");
      setEditSaving(true);

      try {
        const response =
          await TargetsApi.update(
            editingTarget.id,
            {
              targetValue:
                numericValue,
            },
          );

        if (
          response.changed
        ) {
          setSuccessMessage(
            `Target updated from ${editingTarget.targetValue} to ${numericValue}.`,
          );
        } else {
          setSuccessMessage(
            `Target is already set to ${numericValue}.`,
          );
        }

        setEditingTarget(
          null,
        );

        setEditValue("");

        await loadTargets();
      } catch (err) {
        setModalError(
          getErrorMessage(
            err,
            "Unable to update target.",
          ),
        );
      } finally {
        setEditSaving(false);
      }
    };

  /* =======================================================
     HISTORY
  ======================================================= */

  const openHistory =
    async (
      target:
        EmployeeTargetPerformance,
    ) => {
      setHistoryTarget(
        target,
      );

      setHistoryData(
        null,
      );

      setModalError("");
      setHistoryLoading(
        true,
      );

      try {
        const response =
          await TargetsApi.history(
            target.id,
          );

        setHistoryData(
          response,
        );
      } catch (err) {
        setModalError(
          getErrorMessage(
            err,
            "Unable to load target history.",
          ),
        );
      } finally {
        setHistoryLoading(
          false,
        );
      }
    };

  const closeHistory =
    () => {
      setHistoryTarget(
        null,
      );

      setHistoryData(
        null,
      );

      setModalError("");
    };

  /* =======================================================
     RENDER
  ======================================================= */

  const refreshing =
    optionsLoading ||
    targetsLoading;

  return (
    <>
      <div className="w-full">
        <div className="mx-auto max-w-[1600px] space-y-6 py-4">

          {/* =================================================
              ALERTS
          ================================================= */}

          {error && (
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0 text-rose-600"
                />

                <div>
                  <div className="text-sm font-black text-rose-700">
                    Unable to complete request
                  </div>

                  <div className="mt-0.5 text-xs font-semibold text-rose-600">
                    {error}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                className="text-rose-500 hover:text-rose-700"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2
                  size={18}
                  className="shrink-0 text-emerald-600"
                />

                <span className="text-sm font-black text-emerald-700">
                  {successMessage}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSuccessMessage(
                    "",
                  )
                }
                className="text-emerald-500 hover:text-emerald-700"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* =================================================
              KPI CARDS
          ================================================= */}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">

            <MetricCard
              label="Assigned Targets"
              value={
                summary.assigned
              }
              helper="Active assignments"
              icon={Target}
              tone="blue"
            />

            <MetricCard
              label="Total Target"
              value={
                summary.totalTarget
              }
              helper="Combined workload"
              icon={CalendarDays}
              tone="violet"
            />

            <MetricCard
              label="Achieved"
              value={
                summary.achieved
              }
              helper="Completed work"
              icon={TrendingUp}
              tone="cyan"
            />

            <MetricCard
              label="Targets Met"
              value={
                summary.completed
              }
              helper="Completed targets"
              icon={UserCheck}
              tone="emerald"
            />

            <MetricCard
              label="Overall Progress"
              value={`${summary.progress}%`}
              helper="Across filtered targets"
              icon={Gauge}
              tone="amber"
            />

          </div>

          {/* =================================================
              ASSIGN TARGET
          ================================================= */}

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Sparkles size={18} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Assign New Target
                  </h2>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Set operational expectations for an individual Supervisor or QC user.
                  </p>
                </div>

              </div>
            </div>

            <form
              onSubmit={
                handleCreate
              }
              className="p-5 sm:p-6"
            >

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">

                {/* ROLE */}

                <FormField
                  label="Role"
                >
                  <select
                    value={role}
                    onChange={(
                      event,
                    ) =>
                      setRole(
                        event.target
                          .value as TargetRole,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="SUPERVISOR">
                      Supervisor
                    </option>

                    <option value="QC">
                      QC
                    </option>
                  </select>
                </FormField>

                {/* USER */}

                <FormField
                  label="User"
                >
                  <select
                    value={userId}
                    disabled={
                      optionsLoading
                    }
                    onChange={(
                      event,
                    ) =>
                      setUserId(
                        event.target
                          .value,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">
                      {optionsLoading
                        ? "Loading users..."
                        : "Select user"}
                    </option>

                    {availableUsers.map(
                      (user) => (
                        <option
                          key={
                            user.userId
                          }
                          value={
                            user.userId
                          }
                        >
                          {user.name}
                          {user.employeeId
                            ? ` • ${user.employeeId}`
                            : ""}
                        </option>
                      ),
                    )}
                  </select>
                </FormField>

                {/* MODULE */}

                <FormField
                  label="Module"
                >
                  <select
                    value={
                      moduleId
                    }
                    disabled={
                      !userId
                    }
                    onChange={(
                      event,
                    ) =>
                      setModuleId(
                        event.target
                          .value,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">
                      {!userId
                        ? "Select user first"
                        : "Select module"}
                    </option>

                    {availableModules.map(
                      (module) => (
                        <option
                          key={
                            module.id
                          }
                          value={
                            module.id
                          }
                        >
                          {module.displayName ||
                            moduleLabel(
                              module.name,
                            )}
                        </option>
                      ),
                    )}
                  </select>
                </FormField>

                {/* PERIOD */}

                <FormField
                  label="Period"
                >
                  <select
                    value={
                      periodType
                    }
                    onChange={(
                      event,
                    ) =>
                      setPeriodType(
                        event.target
                          .value as TargetPeriodType,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="DAILY">
                      Daily
                    </option>

                    <option value="WEEKLY">
                      Weekly
                    </option>

                    <option value="MONTHLY">
                      Monthly
                    </option>
                  </select>
                </FormField>

                {/* DATE */}

                <FormField
                  label="Start Date"
                >
                  <input
                    type="date"
                    value={
                      startDate
                    }
                    onChange={(
                      event,
                    ) =>
                      setStartDate(
                        event.target
                          .value,
                      )
                    }
                    className={inputClass}
                  />
                </FormField>

                {/* TARGET */}

                <FormField
                  label="Target"
                >
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={
                      targetValue
                    }
                    onChange={(
                      event,
                    ) =>
                      setTargetValue(
                        event.target
                          .value,
                      )
                    }
                    placeholder="e.g. 10"
                    className={inputClass}
                  />
                </FormField>

              </div>

              {/* PERIOD PREVIEW + ACTION */}

              <div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 lg:flex-row lg:items-center">

                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
                    <CalendarRange
                      size={17}
                    />
                  </div>

                  <div>
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Target Period
                    </div>

                    {periodPreview ? (
                      <>
                        <div className="mt-1 text-sm font-black text-slate-900">
                          {formatDate(
                            periodPreview.start,
                          )}
                          {periodPreview.start.getTime() !==
                            periodPreview.end.getTime() && (
                              <>
                                {" "}
                                <span className="font-semibold text-slate-400">
                                  to
                                </span>{" "}
                                {formatDate(
                                  periodPreview.end,
                                )}
                              </>
                            )}
                        </div>

                        <div className="mt-0.5 text-xs font-semibold text-slate-500">
                          {periodPreview.days}{" "}
                          {periodPreview.days ===
                            1
                            ? "calendar day"
                            : "calendar days"}{" "}

                        </div>
                      </>
                    ) : (
                      <div className="mt-1 text-sm font-semibold text-slate-500">
                        Select a valid date.
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    optionsLoading
                  }
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {saving ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <Target
                      size={17}
                    />
                  )}

                  {saving
                    ? "Assigning..."
                    : "Assign Target"}
                </button>

              </div>
            </form>
          </section>

          {/* =================================================
              TARGET PERFORMANCE
          ================================================= */}

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

            {/* PERFORMANCE HEADER */}

            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">

              <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">
                      Target Performance
                    </h2>

                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                      {filteredTargets.length}{" "}
                      {filteredTargets.length ===
                        1
                        ? "Target"
                        : "Targets"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Live achievement calculated from operational submissions and QC review activity.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">

                  {/* SEARCH */}

                  <div className="relative min-w-[210px] flex-1 sm:flex-none">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={
                        searchTerm
                      }
                      onChange={(
                        event,
                      ) =>
                        setSearchTerm(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Search user..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 sm:w-[220px]"
                    />
                  </div>

                  {/* ROLE */}

                  <select
                    value={
                      roleFilter
                    }
                    onChange={(
                      event,
                    ) =>
                      setRoleFilter(
                        event.target
                          .value as
                        | TargetRole
                        | "ALL",
                      )
                    }
                    className={filterClass}
                  >
                    <option value="ALL">
                      All Roles
                    </option>

                    <option value="SUPERVISOR">
                      Supervisor
                    </option>

                    <option value="QC">
                      QC
                    </option>
                  </select>

                  {/* MODULE */}

                  <select
                    value={
                      moduleFilter
                    }
                    onChange={(
                      event,
                    ) =>
                      setModuleFilter(
                        event.target
                          .value,
                      )
                    }
                    className={filterClass}
                  >
                    <option value="ALL">
                      All Modules
                    </option>

                    {uniqueModules.map(
                      (module) => (
                        <option
                          key={
                            module
                          }
                          value={
                            module
                          }
                        >
                          {moduleLabel(
                            module,
                          )}
                        </option>
                      ),
                    )}
                  </select>

                  {/* PERIOD */}

                  <select
                    value={
                      periodFilter
                    }
                    onChange={(
                      event,
                    ) =>
                      setPeriodFilter(
                        event.target
                          .value as
                        | TargetPeriodType
                        | "ALL",
                      )
                    }
                    className={filterClass}
                  >
                    <option value="ALL">
                      All Periods
                    </option>

                    <option value="DAILY">
                      Daily
                    </option>

                    <option value="WEEKLY">
                      Weekly
                    </option>

                    <option value="MONTHLY">
                      Monthly
                    </option>
                  </select>

                  {/* STATUS */}

                  <select
                    value={
                      statusFilter
                    }
                    onChange={(
                      event,
                    ) =>
                      setStatusFilter(
                        event.target
                          .value as StatusFilter,
                      )
                    }
                    className={filterClass}
                  >
                    <option value="ALL">
                      All Status
                    </option>

                    <option value="MET">
                      Target Met
                    </option>

                    <option value="IN_PROGRESS">
                      In Progress
                    </option>

                    <option value="NOT_STARTED">
                      Not Started
                    </option>
                  </select>

                  {/* REFRESH */}

                  <button
                    type="button"
                    onClick={
                      refreshAll
                    }
                    disabled={
                      refreshing
                    }
                    title="Refresh target data"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={14}
                      className={
                        refreshing
                          ? "animate-spin"
                          : ""
                      }
                    />

                    Refresh
                  </button>

                </div>
              </div>

              {/* FILTER INDICATOR */}

              {(searchTerm ||
                roleFilter !==
                "ALL" ||
                moduleFilter !==
                "ALL" ||
                periodFilter !==
                "ALL" ||
                statusFilter !==
                "ALL") && (
                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Filter
                      size={13}
                    />

                    Showing filtered results.

                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setRoleFilter(
                          "ALL",
                        );
                        setModuleFilter(
                          "ALL",
                        );
                        setPeriodFilter(
                          "ALL",
                        );
                        setStatusFilter(
                          "ALL",
                        );
                      }}
                      className="font-black text-blue-600 hover:text-blue-700"
                    >
                      Clear filters
                    </button>
                  </div>
                )}

            </div>

            {/* LOADING */}

            {targetsLoading ? (
              <div className="flex min-h-[310px] items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center">

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Loader2
                      size={22}
                      className="animate-spin"
                    />
                  </div>

                  <div>
                    <div className="text-sm font-black text-slate-700">
                      Loading target performance
                    </div>

                    <div className="mt-1 text-xs font-semibold text-slate-400">
                      Calculating operational achievement...
                    </div>
                  </div>

                </div>
              </div>
            ) : filteredTargets.length ===
              0 ? (
              /* EMPTY */

              <div className="flex min-h-[310px] flex-col items-center justify-center px-5 text-center">

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <Users
                    size={24}
                  />
                </div>

                <h3 className="mt-4 text-base font-black text-slate-800">
                  No targets found
                </h3>

                <p className="mt-1 max-w-md text-sm font-medium leading-6 text-slate-500">
                  Assign a new target or change the current search and filter selections.
                </p>

              </div>
            ) : (
              <>
                {/* DESKTOP TABLE */}

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1220px]">

                    <thead className="bg-slate-50/90">
                      <tr className="text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">

                        <th className="px-5 py-4">
                          User
                        </th>

                        <th className="px-5 py-4">
                          Module
                        </th>

                        <th className="px-5 py-4">
                          Period
                        </th>

                        <th className="px-5 py-4">
                          Date Range
                        </th>

                        <th className="px-5 py-4 text-center">
                          Target
                        </th>

                        <th className="px-5 py-4 text-center">
                          Achieved
                        </th>

                        <th className="px-5 py-4 text-center">
                          Remaining
                        </th>

                        <th className="px-5 py-4">
                          Progress
                        </th>

                        <th className="px-5 py-4 text-right">
                          Actions
                        </th>

                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {filteredTargets.map(
                        (target) => (
                          <TargetRow
                            key={
                              target.id
                            }
                            target={
                              target
                            }
                            onEdit={() =>
                              openEdit(
                                target,
                              )
                            }
                            onHistory={() =>
                              void openHistory(
                                target,
                              )
                            }
                          />
                        ),
                      )}

                    </tbody>
                  </table>
                </div>

                {/* MOBILE CARDS */}

                <div className="space-y-3 p-4 md:hidden">

                  {filteredTargets.map(
                    (target) => (
                      <TargetMobileCard
                        key={
                          target.id
                        }
                        target={
                          target
                        }
                        onEdit={() =>
                          openEdit(
                            target,
                          )
                        }
                        onHistory={() =>
                          void openHistory(
                            target,
                          )
                        }
                      />
                    ),
                  )}

                </div>
              </>
            )}

          </section>

        </div>
      </div>

      {/* =====================================================
          EDIT TARGET MODAL
      ===================================================== */}

      {mounted &&
        editingTarget &&
        createPortal(
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            onMouseDown={(
              event,
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeEdit();
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-target-title"
              className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl"
            >

              {/* MODAL HEADER */}

              <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 px-6 py-6 text-white">

                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />

                <div className="relative flex items-start justify-between gap-4">

                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                      <Pencil
                        size={19}
                      />
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
                        Target Management
                      </div>

                      <h3
                        id="edit-target-title"
                        className="mt-1 text-xl font-black"
                      >
                        Edit Target
                      </h3>

                      <p className="mt-1 text-xs font-medium text-slate-300">
                        Update the target value without changing its assignment.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeEdit
                    }
                    disabled={
                      editSaving
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
                  >
                    <X size={17} />
                  </button>

                </div>
              </div>

              {/* MODAL BODY */}

              <div className="p-6">

                {modalError && (
                  <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                    <AlertCircle
                      size={16}
                      className="mt-0.5 shrink-0"
                    />

                    {modalError}
                  </div>
                )}

                {/* CONTEXT */}

                <div className="grid grid-cols-2 gap-3">

                  <ModalInfo
                    label="User"
                    value={
                      editingTarget.user
                        .name
                    }
                  />

                  <ModalInfo
                    label="Role"
                    value={
                      editingTarget.role ===
                        "SUPERVISOR"
                        ? "Supervisor"
                        : "QC"
                    }
                  />

                  <ModalInfo
                    label="Module"
                    value={moduleLabel(
                      editingTarget.module
                        .name,
                    )}
                  />

                  <ModalInfo
                    label="Period"
                    value={periodLabel(
                      editingTarget.periodType,
                    )}
                  />

                </div>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Target Period
                  </div>

                  <div className="mt-1 text-sm font-black text-slate-800">
                    {formatDate(
                      editingTarget.startDate,
                    )}

                    {editingTarget.startDate !==
                      editingTarget.endDate && (
                        <>
                          {" "}
                          <span className="font-semibold text-slate-400">
                            to
                          </span>{" "}
                          {formatDate(
                            editingTarget.endDate,
                          )}
                        </>
                      )}
                  </div>
                </div>

                {/* CURRENT / NEW */}

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Current Target
                    </div>

                    <div className="mt-2 text-3xl font-black text-slate-900">
                      {
                        editingTarget.targetValue
                      }
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                    <label className="text-[10px] font-black uppercase tracking-wide text-blue-700">
                      New Target
                    </label>

                    <input
                      autoFocus
                      type="number"
                      min={1}
                      step={1}
                      value={
                        editValue
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditValue(
                          event.target
                            .value,
                        )
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-blue-200 bg-white px-3 text-lg font-black text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                  </div>

                </div>

                <div className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-xs font-semibold leading-5 text-amber-800">
                  <ShieldCheck
                    size={16}
                    className="shrink-0"
                  />

                  User, module, role and period remain unchanged. This update will be recorded in Target History.
                </div>

                {/* ACTIONS */}

                <div className="mt-6 flex justify-end gap-3">

                  <button
                    type="button"
                    onClick={
                      closeEdit
                    }
                    disabled={
                      editSaving
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleEditSave()
                    }
                    disabled={
                      editSaving
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {editSaving ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Save
                        size={16}
                      />
                    )}

                    {editSaving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>

                </div>

              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* =====================================================
          HISTORY MODAL
      ===================================================== */}

      {mounted &&
        historyTarget &&
        createPortal(
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            onMouseDown={(
              event,
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeHistory();
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="history-title"
              className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl"
            >

              {/* HISTORY HEADER */}

              <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-6 text-white">

                <div className="absolute right-8 top-0 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl" />

                <div className="relative flex items-start justify-between gap-4">

                  <div className="flex items-start gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                      <History
                        size={19}
                      />
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
                        Audit Trail
                      </div>

                      <h3
                        id="history-title"
                        className="mt-1 text-xl font-black"
                      >
                        Target History
                      </h3>

                      <p className="mt-1 text-xs font-medium text-slate-300">
                        Every target-value change is preserved here.
                      </p>
                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={
                      closeHistory
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
                  >
                    <X size={17} />
                  </button>

                </div>
              </div>

              {/* HISTORY CONTEXT */}

              <div className="grid grid-cols-2 gap-3 border-b border-slate-100 bg-slate-50/80 p-5 sm:grid-cols-4">

                <ModalInfo
                  label="User"
                  value={
                    historyTarget.user
                      .name
                  }
                />

                <ModalInfo
                  label="Module"
                  value={moduleLabel(
                    historyTarget.module
                      .name,
                  )}
                />

                <ModalInfo
                  label="Period"
                  value={periodLabel(
                    historyTarget.periodType,
                  )}
                />

                <ModalInfo
                  label="Current Target"
                  value={String(
                    historyTarget.targetValue,
                  )}
                  emphasized
                />

              </div>

              {/* HISTORY BODY */}

              <div className="overflow-y-auto p-5 sm:p-6">

                {historyLoading ? (
                  <div className="flex min-h-[250px] flex-col items-center justify-center gap-3">

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                      <Loader2
                        size={21}
                        className="animate-spin"
                      />
                    </div>

                    <span className="text-sm font-black text-slate-600">
                      Loading change history...
                    </span>

                  </div>
                ) : modalError ? (
                  <div className="flex min-h-[220px] items-center justify-center">
                    <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">

                      <AlertCircle
                        size={24}
                        className="mx-auto text-rose-600"
                      />

                      <div className="mt-3 text-sm font-black text-rose-700">
                        Unable to load history
                      </div>

                      <div className="mt-1 text-xs font-semibold leading-5 text-rose-600">
                        {modalError}
                      </div>

                    </div>
                  </div>
                ) : historyData &&
                  historyData.history
                    .length > 0 ? (
                  <div className="space-y-3">

                    {historyData.history.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
                        >

                          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                            <div className="flex items-center gap-4">

                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-600">
                                {historyData.history
                                  .length -
                                  index}
                              </div>

                              <div>
                                <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                  Target changed
                                </div>

                                <div className="mt-1 flex items-center gap-3">

                                  <span className="text-xl font-black text-slate-500">
                                    {
                                      item.oldTargetValue
                                    }
                                  </span>

                                  <ArrowRight
                                    size={16}
                                    className="text-blue-500"
                                  />

                                  <span className="text-xl font-black text-blue-600">
                                    {
                                      item.newTargetValue
                                    }
                                  </span>

                                </div>
                              </div>

                            </div>

                            <div className="sm:text-right">

                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 sm:justify-end">
                                <Clock3
                                  size={13}
                                  className="text-slate-400"
                                />

                                {formatDateTime(
                                  item.changedAt,
                                )}
                              </div>

                              <div className="mt-1 text-[10px] font-semibold text-slate-400">
                                Changed by{" "}
                                <span
                                  title={
                                    item.changedById
                                  }
                                  className="font-black text-slate-500"
                                >
                                  {shortId(
                                    item.changedById,
                                  )}
                                </span>
                              </div>

                            </div>

                          </div>

                        </div>
                      ),
                    )}

                  </div>
                ) : (
                  <div className="flex min-h-[250px] flex-col items-center justify-center text-center">

                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <History
                        size={23}
                      />
                    </div>

                    <h4 className="mt-4 text-base font-black text-slate-800">
                      No changes yet
                    </h4>

                    <p className="mt-1 max-w-sm text-sm font-medium leading-6 text-slate-500">
                      This target still has its original value. Future edits will appear here automatically.
                    </p>

                  </div>
                )}

              </div>

            </div>
          </div>,
          document.body,
        )}

    </>
  );
}

/* =========================================================
   COMMON CLASSES
========================================================= */

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const filterClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10";

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  children,
}: {
  label: string;
  children:
  React.ReactNode;
}) {
  return (
    <label className="space-y-2">

      <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>

      {children}

    </label>
  );
}

/* =========================================================
   KPI CARD
========================================================= */

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value:
  string | number;
  helper: string;
  icon: LucideIcon;
  tone: MetricTone;
}) {
  const tones: Record<
    MetricTone,
    {
      icon: string;
      glow: string;
    }
  > = {
    blue: {
      icon:
        "bg-blue-50 text-blue-600",
      glow:
        "group-hover:border-blue-200",
    },

    violet: {
      icon:
        "bg-violet-50 text-violet-600",
      glow:
        "group-hover:border-violet-200",
    },

    emerald: {
      icon:
        "bg-emerald-50 text-emerald-600",
      glow:
        "group-hover:border-emerald-200",
    },

    amber: {
      icon:
        "bg-amber-50 text-amber-600",
      glow:
        "group-hover:border-amber-200",
    },

    cyan: {
      icon:
        "bg-cyan-50 text-cyan-600",
      glow:
        "group-hover:border-cyan-200",
    },
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${tones[tone].glow}`}
    >
      <div className="flex items-start justify-between">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone].icon}`}
        >
          <Icon size={17} />
        </div>

      </div>

      <div className="mt-4 text-2xl font-black tracking-tight text-slate-950">
        {value}
      </div>

      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">
        {label}
      </div>

      <div className="mt-1 text-[10px] font-semibold text-slate-400">
        {helper}
      </div>
    </div>
  );
}

/* =========================================================
   DESKTOP TARGET ROW
========================================================= */

function TargetRow({
  target,
  onEdit,
  onHistory,
}: {
  target:
  EmployeeTargetPerformance;
  onEdit: () => void;
  onHistory: () => void;
}) {
  const state =
    getProgressState(
      target,
    );

  return (
    <tr className="group transition hover:bg-slate-50/80">

      {/* USER */}

      <td className="px-5 py-4">
        <div className="font-black text-slate-900">
          {target.user.name}
        </div>

        <div className="mt-1.5 flex items-center gap-2">

          <span
            className={`rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-wide ${target.role ===
              "SUPERVISOR"
              ? "bg-blue-50 text-blue-700"
              : "bg-violet-50 text-violet-700"
              }`}
          >
            {target.role ===
              "SUPERVISOR"
              ? "Supervisor"
              : "QC"}
          </span>

        </div>
      </td>

      {/* MODULE */}

      <td className="px-5 py-4">
        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-black text-slate-700">
          {target.module
            .displayName ||
            moduleLabel(
              target.module.name,
            )}
        </span>
      </td>

      {/* PERIOD */}

      <td className="px-5 py-4">
        <span className="text-xs font-black text-slate-700">
          {periodLabel(
            target.periodType,
          )}
        </span>
      </td>

      {/* DATE */}

      <td className="px-5 py-4">
        <div className="text-xs font-black text-slate-700">
          {formatDate(
            target.startDate,
          )}
        </div>

        {target.startDate !==
          target.endDate && (
            <div className="mt-1 text-[10px] font-semibold text-slate-400">
              to{" "}
              {formatDate(
                target.endDate,
              )}
            </div>
          )}
      </td>

      {/* TARGET */}

      <td className="px-5 py-4 text-center text-lg font-black text-slate-900">
        {target.targetValue}
      </td>

      {/* ACHIEVED */}

      <td className="px-5 py-4 text-center text-lg font-black text-blue-600">
        {target.achieved}
      </td>

      {/* REMAINING */}

      <td className="px-5 py-4 text-center text-lg font-black text-slate-700">
        {target.remaining}
      </td>

      {/* PROGRESS */}

      <td className="px-5 py-4">
        <div className="min-w-[180px]">

          <div className="mb-2 flex items-center justify-between gap-3">

            <span className="text-sm font-black text-slate-900">
              {target.progress}%
            </span>

            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${state.className}`}
            >
              {state.label}
            </span>

          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">

            <div
              className={`h-full rounded-full transition-all duration-500 ${progressBarClass(
                target.progress,
              )}`}
              style={{
                width: `${Math.min(
                  target.progress,
                  100,
                )}%`,
              }}
            />

          </div>
        </div>
      </td>

      {/* ACTIONS */}

      <td className="px-5 py-4">

        <div className="flex justify-end gap-2">

          <button
            type="button"
            onClick={
              onEdit
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-[11px] font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
          >
            <Pencil size={13} />
            Edit
          </button>

          <button
            type="button"
            onClick={
              onHistory
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700 transition hover:bg-slate-50"
          >
            <History size={13} />
            History
          </button>

        </div>
      </td>

    </tr>
  );
}

/* =========================================================
   MOBILE TARGET CARD
========================================================= */

function TargetMobileCard({
  target,
  onEdit,
  onHistory,
}: {
  target:
  EmployeeTargetPerformance;
  onEdit: () => void;
  onHistory: () => void;
}) {
  const state =
    getProgressState(
      target,
    );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex items-start justify-between gap-3">

        <div>
          <div className="font-black text-slate-900">
            {target.user.name}
          </div>

          <div className="mt-1 text-xs font-bold text-slate-500">
            {moduleLabel(
              target.module.name,
            )}{" "}
            •{" "}
            {periodLabel(
              target.periodType,
            )}
          </div>
        </div>

        <span
          className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${state.className}`}
        >
          {state.label}
        </span>

      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">

        <SmallMetric
          label="Target"
          value={
            target.targetValue
          }
        />

        <SmallMetric
          label="Achieved"
          value={
            target.achieved
          }
          highlight
        />

        <SmallMetric
          label="Remaining"
          value={
            target.remaining
          }
        />

      </div>

      <div className="mt-4">

        <div className="mb-2 flex items-center justify-between">

          <span className="text-xs font-black text-slate-600">
            Progress
          </span>

          <span className="text-sm font-black text-slate-900">
            {target.progress}%
          </span>

        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100">

          <div
            className={`h-full rounded-full ${progressBarClass(
              target.progress,
            )}`}
            style={{
              width: `${Math.min(
                target.progress,
                100,
              )}%`,
            }}
          />

        </div>

      </div>

      <div className="mt-4 text-[10px] font-semibold text-slate-400">
        {formatDate(
          target.startDate,
        )}

        {target.startDate !==
          target.endDate &&
          ` to ${formatDate(
            target.endDate,
          )}`}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">

        <button
          type="button"
          onClick={
            onEdit
          }
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-50 text-xs font-black text-blue-700"
        >
          <Pencil size={14} />
          Edit Target
        </button>

        <button
          type="button"
          onClick={
            onHistory
          }
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-black text-slate-700"
        >
          <History size={14} />
          History
        </button>

      </div>

    </div>
  );
}

/* =========================================================
   SMALL METRIC
========================================================= */

function SmallMetric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">

      <div
        className={`text-lg font-black ${highlight
          ? "text-blue-600"
          : "text-slate-900"
          }`}
      >
        {value}
      </div>

      <div className="mt-0.5 text-[9px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </div>

    </div>
  );
}

/* =========================================================
   MODAL INFO
========================================================= */

function ModalInfo({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">

      <div className="text-[9px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div
        className={`mt-1 truncate font-black ${emphasized
          ? "text-lg text-blue-600"
          : "text-sm text-slate-800"
          }`}
        title={value}
      >
        {value}
      </div>

    </div>
  );
}