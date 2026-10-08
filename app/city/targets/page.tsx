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
  CalendarRange,
  CheckCircle2,
  Clock3,
  Filter,
  Gauge,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Target,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { apiFetch, ApiError } from "@lib/apiClient";

import {
  TargetsApi,
  type AssignmentRow,
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

    case "NALA":
      return "Nala";

    case "TASKFORCE":
      return "GVP";

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

type RowFilter = "ALL" | "NEEDS" | "SET";

type MatrixRow = AssignmentRow & {
  key: string;
  existing: EmployeeTargetPerformance | undefined;
};

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function TargetAssignmentPage() {
  /* =======================================================
     PAGE STATE
  ======================================================= */

  const [mounted, setMounted] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [tab, setTab] = useState<"SET" | "PERFORMANCE">("SET");

  /* =======================================================
     API DATA
  ======================================================= */

  const [supervisors, setSupervisors] = useState<TargetUser[]>([]);
  const [qcUsers, setQcUsers] = useState<TargetUser[]>([]);
  const [targets, setTargets] = useState<EmployeeTargetPerformance[]>([]);
  const [assignmentRows, setAssignmentRows] = useState<AssignmentRow[]>([]);
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([]);

  /* =======================================================
     PARAMETERS (drive the whole "Set Targets" tab)
  ======================================================= */

  const [periodType, setPeriodType] = useState<TargetPeriodType>("DAILY");
  const [startDate, setStartDate] = useState(localDateString());
  const [zoneId, setZoneId] = useState("ALL");
  const [wardId, setWardId] = useState("ALL");
  const [moduleKey, setModuleKey] = useState("ALL");
  const [search, setSearch] = useState("");
  const [rowFilter, setRowFilter] = useState<RowFilter>("ALL");

  /* =======================================================
     ROW DRAFTS
  ======================================================= */

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  /* "Allow repeat" per row. New targets default to OFF (rotation). */
  const [repeatDrafts, setRepeatDrafts] = useState<Record<string, boolean>>({});
  const [defaultRepeat, setDefaultRepeat] = useState(false);
  const [busyKeys, setBusyKeys] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [fillValue, setFillValue] = useState("");
  const [showNoAssets, setShowNoAssets] = useState(false);

  /* =======================================================
     PERFORMANCE TAB FILTERS
  ======================================================= */

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<TargetRole | "ALL">("ALL");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [periodFilter, setPeriodFilter] = useState<TargetPeriodType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  /* =======================================================
     ADD SI (QC) TARGET MODAL
  ======================================================= */

  const [siOpen, setSiOpen] = useState(false);
  const [siUserId, setSiUserId] = useState("");
  const [siModuleId, setSiModuleId] = useState("");
  const [siPeriod, setSiPeriod] = useState<TargetPeriodType>("DAILY");
  const [siDate, setSiDate] = useState(localDateString());
  const [siValue, setSiValue] = useState("");
  const [siSaving, setSiSaving] = useState(false);
  const [siError, setSiError] = useState("");

  /* =======================================================
     EDIT / HISTORY MODALS
  ======================================================= */

  const [editingTarget, setEditingTarget] = useState<EmployeeTargetPerformance | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<EmployeeTargetPerformance | null>(null);
  const [historyData, setHistoryData] = useState<TargetHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  /* =======================================================
     LOADING
  ======================================================= */

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);

    try {
      const [response, opsMap, assignments] = await Promise.all([
        TargetsApi.options(),
        apiFetch<any>("/city/dashboard/operations-map").catch(() => null),
        TargetsApi.assignments(),
      ]);

      setSupervisors(response.supervisors ?? []);
      setQcUsers(response.qcUsers ?? []);
      setAssignmentRows(assignments.rows ?? []);

      if (opsMap?.filters) {
        setZones(opsMap.filters.zones || []);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load target assignment options."));
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  const loadTargets = useCallback(async () => {
    setTargetsLoading(true);

    try {
      const response = await TargetsApi.performance();
      setTargets(response.targets ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load target performance."));
    } finally {
      setTargetsLoading(false);
    }
  }, []);

  const loadPage = useCallback(async () => {
    setError("");

    /* Sequential on purpose: keeps pressure low on the Prisma pool. */
    await loadOptions();
    await loadTargets();
  }, [loadOptions, loadTargets]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(""), 4500);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const modalOpen = Boolean(editingTarget || historyTarget || siOpen);

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !editSaving && !siSaving) {
        setEditingTarget(null);
        setHistoryTarget(null);
        setSiOpen(false);
        setModalError("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen, editSaving, siSaving]);

  /* =======================================================
     PERIOD
  ======================================================= */

  const period = useMemo(
    () => calculatePeriodPreview(periodType, startDate),
    [periodType, startDate],
  );

  const periodDays = period?.days ?? 1;

  /* =======================================================
     MATRIX: Daroga x ward x module for the chosen period
  ======================================================= */

  const rowKey = (row: AssignmentRow) => `${row.userId}|${row.moduleId}|${row.wardId}`;

  const existingByKey = useMemo(() => {
    const map = new Map<string, EmployeeTargetPerformance>();

    for (const target of targets) {
      if (
        target.role !== "SUPERVISOR" ||
        !target.wardId ||
        !target.isStanding ||
        target.periodType !== periodType
      ) {
        continue;
      }

      map.set(`${target.userId}|${target.moduleId}|${target.wardId}`, target);
    }

    return map;
  }, [targets, periodType]);

  const zoneOptions = useMemo(() => {
    const ids = new Set(
      assignmentRows.map((row) => row.zoneId).filter(Boolean) as string[],
    );

    return Array.from(ids)
      .map((id) => ({
        id,
        name: zones.find((zone) => zone.id === id)?.name ?? "Zone",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assignmentRows, zones]);

  const wardOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const row of assignmentRows) {
      if (zoneId === "ALL" || row.zoneId === zoneId) {
        map.set(row.wardId, row.wardName);
      }
    }

    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [assignmentRows, zoneId]);

  const moduleOptions = useMemo(
    () =>
      Array.from(new Set(assignmentRows.map((row) => row.moduleName))).sort(
        (a, b) => moduleLabel(a).localeCompare(moduleLabel(b)),
      ),
    [assignmentRows],
  );

  const matrixRows = useMemo<MatrixRow[]>(() => {
    const needle = search.trim().toLowerCase();

    return assignmentRows
      .filter((row) => {
        if (zoneId !== "ALL" && row.zoneId !== zoneId) return false;
        if (wardId !== "ALL" && row.wardId !== wardId) return false;
        if (moduleKey !== "ALL" && row.moduleName !== moduleKey) return false;

        if (
          needle &&
          ![row.userName, row.employeeId ?? "", row.wardName].some((value) =>
            value.toLowerCase().includes(needle),
          )
        ) {
          return false;
        }

        return true;
      })
      .map((row) => ({
        ...row,
        key: rowKey(row),
        existing: existingByKey.get(rowKey(row)),
      }))
      .filter((row) => {
        if (rowFilter === "NEEDS") return !row.existing;
        if (rowFilter === "SET") return Boolean(row.existing);
        return true;
      });
  }, [assignmentRows, zoneId, wardId, moduleKey, search, rowFilter, existingByKey]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, MatrixRow[]>();

    for (const row of matrixRows) {
      const list = groups.get(row.wardName) ?? [];
      list.push(row);
      groups.set(row.wardName, list);
    }

    return Array.from(groups, ([ward, rows]) => ({ ward, rows }));
  }, [matrixRows]);

  const darogasWithoutAssets = useMemo(() => {
    const withAssets = new Set(assignmentRows.map((row) => row.userId));

    return supervisors
      .filter((user) => !withAssets.has(user.userId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [supervisors, assignmentRows]);

  /* =======================================================
     DRAFT HELPERS
  ======================================================= */

  const maxFor = (row: AssignmentRow) => row.assigned * periodDays;

  const draftOf = (row: MatrixRow) =>
    drafts[row.key] ??
    (row.existing ? String(row.existing.targetValue) : "");

  const validateRow = (row: MatrixRow, raw: string) => {
    const value = Number(raw);
    const max = maxFor(row);

    if (!raw.trim()) {
      return { ok: false as const, error: "Enter a target." };
    }

    if (!Number.isInteger(value) || value <= 0) {
      return { ok: false as const, error: "Target must be a positive whole number." };
    }

    if (value > max) {
      return {
        ok: false as const,
        error: `Maximum allowed is ${max} (${row.assigned} ${moduleLabel(row.moduleName)} assigned${periodDays > 1 ? ` × ${periodDays} days` : ""}).`,
      };
    }

    return { ok: true as const, value };
  };

  const repeatOf = (row: MatrixRow) =>
    repeatDrafts[row.key] ??
    row.existing?.allowRepeat ??
    defaultRepeat;

  const isDirty = (row: MatrixRow) => {
    const raw = drafts[row.key];

    const repeatChanged =
      Boolean(row.existing) &&
      repeatOf(row) !== (row.existing?.allowRepeat ?? true);

    if (repeatChanged) return true;

    if (raw === undefined || raw.trim() === "") return false;

    return row.existing ? Number(raw) !== row.existing.targetValue : true;
  };

  const dirtyRows = useMemo(
    () => matrixRows.filter(isDirty),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matrixRows, drafts, repeatDrafts, defaultRepeat],
  );

  const setDraft = (key: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [key]: value }));

  const clearDrafts = (keys?: string[]) => {
    setRepeatDrafts((prev) => {
      if (!keys) return {};

      const next = { ...prev };
      keys.forEach((key) => delete next[key]);

      return next;
    });

    setDrafts((prev) => {
      if (!keys) return {};

      const next = { ...prev };
      keys.forEach((key) => delete next[key]);

      return next;
    });
  };

  /* =======================================================
     KPI SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    const set = matrixRows.filter((row) => row.existing);
    const target = set.reduce((total, row) => total + (row.existing?.targetValue ?? 0), 0);
    const achieved = set.reduce((total, row) => total + (row.existing?.achieved ?? 0), 0);

    return {
      darogas: new Set(matrixRows.map((row) => row.userId)).size,
      assets: matrixRows.reduce((total, row) => total + row.assigned, 0),
      rows: matrixRows.length,
      set: set.length,
      needs: matrixRows.length - set.length,
      target,
      achieved,
      progress: target > 0 ? Math.round((achieved / target) * 100) : 0,
    };
  }, [matrixRows]);

  /* =======================================================
     ACTIONS
  ======================================================= */

  const saveRow = async (row: MatrixRow) => {
    setError("");
    setSuccessMessage("");

    const raw = draftOf(row);
    const check = validateRow(row, raw);

    if (!check.ok) {
      setError(`${row.userName} / ${row.wardName} / ${moduleLabel(row.moduleName)}: ${check.error}`);
      return;
    }

    setBusyKeys((prev) => [...prev, row.key]);

    try {
      if (row.existing) {
        await TargetsApi.update(row.existing.id, {
          targetValue: check.value,
          allowRepeat: repeatOf(row),
        });
      } else {
        await TargetsApi.create({
          userId: row.userId,
          moduleId: row.moduleId,
          role: "SUPERVISOR",
          periodType,
          startDate,
          targetValue: check.value,
          wardId: row.wardId,
          allowRepeat: repeatOf(row),
        });
      }

      clearDrafts([row.key]);
      setSuccessMessage(
        `${row.userName}: ${moduleLabel(row.moduleName)} target ${row.existing ? "updated to" : "set to"} ${check.value}.`,
      );

      await loadTargets();
    } catch (err) {
      setError(
        `${row.userName} / ${row.wardName} / ${moduleLabel(row.moduleName)}: ${getErrorMessage(err, "Unable to save target.")}`,
      );
    } finally {
      setBusyKeys((prev) => prev.filter((key) => key !== row.key));
    }
  };

  const saveAll = async () => {
    setError("");
    setSuccessMessage("");

    const fresh: Array<{ userId: string; moduleId: string; wardId: string; targetValue: number; allowRepeat: boolean }> = [];
    const updates: Array<{ id: string; targetValue: number; allowRepeat: boolean }> = [];

    for (const row of dirtyRows) {
      const check = validateRow(row, draftOf(row));

      if (!check.ok) {
        setError(`${row.userName} / ${row.wardName} / ${moduleLabel(row.moduleName)}: ${check.error}`);
        return;
      }

      if (row.existing) {
        updates.push({ id: row.existing.id, targetValue: check.value, allowRepeat: repeatOf(row) });
      } else {
        fresh.push({
          userId: row.userId,
          moduleId: row.moduleId,
          wardId: row.wardId,
          targetValue: check.value,
          allowRepeat: repeatOf(row),
        });
      }
    }

    if (!fresh.length && !updates.length) {
      return;
    }

    setBulkSaving(true);

    try {
      let created = 0;

      if (fresh.length) {
        const result = await TargetsApi.createBulk({ periodType, startDate, items: fresh });
        created = result.created;
      }

      for (const update of updates) {
        await TargetsApi.update(update.id, {
          targetValue: update.targetValue,
          allowRepeat: update.allowRepeat,
        });
      }

      clearDrafts();
      setSuccessMessage(
        `${created} target${created === 1 ? "" : "s"} created, ${updates.length} updated.`,
      );

      await loadTargets();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save targets."));
      await loadTargets();
    } finally {
      setBulkSaving(false);
    }
  };

  const fillRows = (mode: "MAX" | "VALUE") => {
    setError("");

    const typed = Number(fillValue);

    if (mode === "VALUE" && (!Number.isInteger(typed) || typed <= 0)) {
      setError("Enter a positive whole number to apply.");
      return;
    }

    const next: Record<string, string> = {};

    for (const row of matrixRows) {
      if (row.existing) continue;

      const max = maxFor(row);
      next[row.key] = String(mode === "MAX" ? max : Math.min(typed, max));
    }

    if (!Object.keys(next).length) {
      setError("No rows need a target in this view.");
      return;
    }

    setDrafts((prev) => ({ ...prev, ...next }));
  };

  const refreshAll = async () => {
    setError("");
    setSuccessMessage("");

    await loadPage();
  };

  /* =======================================================
     PERFORMANCE TAB
  ======================================================= */

  const uniqueModules = useMemo(() => {
    const names = new Set<string>();

    targets.forEach((target) => names.add(target.module.name));
    supervisors.forEach((user) => user.modules.forEach((m) => names.add(m.name)));
    qcUsers.forEach((user) => user.modules.forEach((m) => names.add(m.name)));

    return Array.from(names).sort((a, b) => moduleLabel(a).localeCompare(moduleLabel(b)));
  }, [targets, supervisors, qcUsers]);

  const filteredTargets = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return targets.filter((target) => {
      if (
        needle &&
        ![
          target.user.name,
          target.user.email ?? "",
          target.ward?.name ?? "",
          target.module.name,
          moduleLabel(target.module.name),
          target.role,
          target.periodType,
        ].some((value) => String(value).toLowerCase().includes(needle))
      ) {
        return false;
      }

      if (roleFilter !== "ALL" && target.role !== roleFilter) return false;
      if (moduleFilter !== "ALL" && target.module.name !== moduleFilter) return false;
      if (periodFilter !== "ALL" && target.periodType !== periodFilter) return false;
      if (statusFilter === "MET" && !target.targetMet) return false;
      if (statusFilter === "IN_PROGRESS" && (target.targetMet || target.achieved <= 0)) return false;
      if (statusFilter === "NOT_STARTED" && target.achieved !== 0) return false;

      return true;
    });
  }, [targets, searchTerm, roleFilter, moduleFilter, periodFilter, statusFilter]);

  /* =======================================================
     SI (QC) TARGET
  ======================================================= */

  const siUser = qcUsers.find((user) => user.userId === siUserId);

  const openSi = () => {
    setSiError("");
    setSiUserId("");
    setSiModuleId("");
    setSiValue("");
    setSiOpen(true);
  };

  const handleSiSave = async () => {
    const value = Number(siValue);

    if (!siUserId || !siModuleId) {
      setSiError("Select an SI user and a module.");
      return;
    }

    if (!Number.isInteger(value) || value <= 0) {
      setSiError("Target must be a positive whole number.");
      return;
    }

    setSiError("");
    setSiSaving(true);

    try {
      await TargetsApi.create({
        userId: siUserId,
        moduleId: siModuleId,
        role: "QC",
        periodType: siPeriod,
        startDate: siDate,
        targetValue: value,
      });

      setSiOpen(false);
      setSuccessMessage("SI target assigned successfully.");

      await loadTargets();
    } catch (err) {
      setSiError(getErrorMessage(err, "Unable to assign SI target."));
    } finally {
      setSiSaving(false);
    }
  };

  /* =======================================================
     EDIT / HISTORY (Performance tab)
  ======================================================= */

  const openEdit = (target: EmployeeTargetPerformance) => {
    setModalError("");
    setEditingTarget(target);
    setEditValue(String(target.targetValue));
  };

  const closeEdit = () => {
    if (editSaving) {
      return;
    }

    setEditingTarget(null);
    setEditValue("");
    setModalError("");
  };

  const handleEditSave = async () => {
    if (!editingTarget) {
      return;
    }

    const numericValue = Number(editValue);

    if (!Number.isInteger(numericValue) || numericValue <= 0) {
      setModalError("Target must be a positive whole number.");
      return;
    }

    setModalError("");
    setEditSaving(true);

    try {
      const response = await TargetsApi.update(editingTarget.id, {
        targetValue: numericValue,
      });

      setSuccessMessage(
        response.changed
          ? `Target updated from ${editingTarget.targetValue} to ${numericValue}.`
          : `Target is already set to ${numericValue}.`,
      );

      setEditingTarget(null);
      setEditValue("");

      await loadTargets();
    } catch (err) {
      setModalError(getErrorMessage(err, "Unable to update target."));
    } finally {
      setEditSaving(false);
    }
  };

  const openHistory = async (target: EmployeeTargetPerformance) => {
    setHistoryTarget(target);
    setHistoryData(null);
    setModalError("");
    setHistoryLoading(true);

    try {
      setHistoryData(await TargetsApi.history(target.id));
    } catch (err) {
      setModalError(getErrorMessage(err, "Unable to load target history."));
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    setHistoryTarget(null);
    setHistoryData(null);
    setModalError("");
  };

  /* =======================================================
     RENDER
  ======================================================= */

  const refreshing = optionsLoading || targetsLoading;
  const loadingFirst = optionsLoading && assignmentRows.length === 0;

  const everyUnit =
    periodType === "DAILY" ? "day" : periodType === "WEEKLY" ? "week" : "month";

  const periodText = startDate
    ? `every ${everyUnit}`
    : "Select a valid date";

  return (
    <>
      <div className="w-full">
        <div className={`mx-auto max-w-[1600px] space-y-6 py-4 ${dirtyRows.length ? "pb-28" : ""}`}>

          {/* HEADER */}

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Inspection Targets
              </h1>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Set ward-wise targets for every Daroga. A target can never be more than the assets assigned to them.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openSi}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
              >
                <Plus size={14} />
                Add SI Target
              </button>

              <button
                type="button"
                onClick={() => void refreshAll()}
                disabled={refreshing}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {/* ALERTS */}

          {error && (
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />

                <div>
                  <div className="text-sm font-black text-rose-700">Could not complete this action</div>
                  <div className="mt-0.5 text-xs font-semibold text-rose-600">{error}</div>
                </div>
              </div>

              <button type="button" onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
                <X size={16} />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                <span className="text-sm font-black text-emerald-700">{successMessage}</span>
              </div>

              <button type="button" onClick={() => setSuccessMessage("")} className="text-emerald-500 hover:text-emerald-700">
                <X size={16} />
              </button>
            </div>
          )}

          {/* TABS */}

          <div className="flex gap-2 border-b border-slate-200">
            {([
              ["SET", "Set Targets"],
              ["PERFORMANCE", `All Targets & Performance (${targets.length})`],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`-mb-px border-b-2 px-4 py-3 text-sm font-black transition ${tab === id ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "SET" ? (
            <>
              {/* =============================================
                  PARAMETERS
              ============================================= */}

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <CalendarRange size={18} />
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Standing Target
                      </div>

                      <div className="text-base font-black text-slate-900">
                        {periodLabel(periodType)} target · {periodText}
                      </div>

                      <div className="text-xs font-semibold text-slate-500">
                        Stays the same until you change it. Maximum per row = assigned assets × {periodDays} {periodDays === 1 ? "day" : "days"}.
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                      {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setPeriodType(type);
                            clearDrafts();
                          }}
                          className={`h-9 rounded-lg px-4 text-xs font-black transition ${periodType === type ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          {periodLabel(type)}
                        </button>
                      ))}
                    </div>

                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                        New targets start from
                      </span>

                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 md:grid-cols-4 xl:grid-cols-5">
                  <select
                    value={zoneId}
                    onChange={(event) => {
                      setZoneId(event.target.value);
                      setWardId("ALL");
                    }}
                    className={filterClass}
                  >
                    <option value="ALL">All Zones</option>
                    {zoneOptions.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </select>

                  <select value={wardId} onChange={(event) => setWardId(event.target.value)} className={filterClass}>
                    <option value="ALL">All Wards</option>
                    {wardOptions.map((ward) => (
                      <option key={ward.id} value={ward.id}>
                        {ward.name}
                      </option>
                    ))}
                  </select>

                  <select value={moduleKey} onChange={(event) => setModuleKey(event.target.value)} className={filterClass}>
                    <option value="ALL">All Modules</option>
                    {moduleOptions.map((module) => (
                      <option key={module} value={module}>
                        {moduleLabel(module)}
                      </option>
                    ))}
                  </select>

                  <div className="relative col-span-2 md:col-span-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search Daroga or ward..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
                    />
                  </div>

                  {(zoneId !== "ALL" || wardId !== "ALL" || moduleKey !== "ALL" || search || rowFilter !== "ALL") && (
                    <button
                      type="button"
                      onClick={() => {
                        setZoneId("ALL");
                        setWardId("ALL");
                        setModuleKey("ALL");
                        setSearch("");
                        setRowFilter("ALL");
                      }}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-black text-blue-600 hover:text-blue-700"
                    >
                      <Filter size={13} />
                      Clear filters
                    </button>
                  )}
                </div>
              </section>

              {/* KPI */}

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <MetricCard label="Darogas" value={summary.darogas} helper="With assets in view" icon={Users} tone="blue" />
                <MetricCard label="Assets Assigned" value={summary.assets} helper="Daily maximum" icon={ShieldCheck} tone="violet" />
                <MetricCard label="Needs Target" value={summary.needs} helper={`of ${summary.rows} rows`} icon={AlertCircle} tone="amber" />
                <MetricCard label="Targets Set" value={summary.set} helper={`${summary.target} total target`} icon={Target} tone="emerald" />
                <MetricCard label="Progress" value={`${summary.progress}%`} helper={`${summary.achieved} achieved`} icon={Gauge} tone="cyan" />
              </div>

              {/* =============================================
                  ACTION TABLE
              ============================================= */}

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 xl:flex-row xl:items-center">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Daroga Targets</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Type a number in a row and press Set. Each Daroga gets their own target.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                      {([
                        ["ALL", "All"],
                        ["NEEDS", "Needs target"],
                        ["SET", "Target set"],
                      ] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setRowFilter(id)}
                          className={`h-8 rounded-lg px-3 text-[11px] font-black transition ${rowFilter === id ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5"
                      title="Off = an inspected asset stays locked until every assigned asset has been inspected once. On = the same assets can be inspected again the next day."
                    >
                      <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                        New rows: allow repeat
                      </span>

                      <RepeatSwitch on={defaultRepeat} onChange={setDefaultRepeat} />
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 pl-3">
                      <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                        Fill empty rows
                      </span>

                      <input
                        type="number"
                        min={1}
                        value={fillValue}
                        onChange={(event) => setFillValue(event.target.value)}
                        placeholder="e.g. 5"
                        className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-400"
                      />

                      <button
                        type="button"
                        onClick={() => fillRows("VALUE")}
                        className="h-8 rounded-lg bg-slate-100 px-3 text-[11px] font-black text-slate-700 hover:bg-slate-200"
                      >
                        Apply
                      </button>

                      <button
                        type="button"
                        onClick={() => fillRows("MAX")}
                        className="h-8 rounded-lg bg-blue-50 px-3 text-[11px] font-black text-blue-700 hover:bg-blue-100"
                      >
                        Use max
                      </button>
                    </div>
                  </div>
                </div>

                {loadingFirst || targetsLoading ? (
                  <div className="flex min-h-[260px] items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <Loader2 size={22} className="animate-spin" />
                      </div>
                      <div className="text-sm font-black text-slate-700">Loading Daroga assignments…</div>
                    </div>
                  </div>
                ) : assignmentRows.length === 0 ? (
                  <div className="flex min-h-[260px] flex-col items-center justify-center px-5 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <Users size={24} />
                    </div>

                    <h3 className="mt-4 text-base font-black text-slate-800">No Daroga has assets assigned</h3>

                    <p className="mt-1 max-w-md text-sm font-medium leading-6 text-slate-500">
                      Targets are based on assigned assets (toilets, litter bins, beats, Nala points, GVPs). Assign assets to a Daroga first, then set their target here.
                    </p>
                  </div>
                ) : matrixRows.length === 0 ? (
                  <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
                    <h3 className="text-base font-black text-slate-800">Nothing matches these filters</h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Change the zone, ward, module or status above.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px]">
                      <thead className="bg-slate-50/90">
                        <tr className="text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                          <th className="px-5 py-4">Daroga</th>
                          <th className="px-5 py-4">Module</th>
                          <th className="px-5 py-4 text-center">Assets</th>
                          <th className="px-5 py-4 text-center">Max</th>
                          <th className="px-5 py-4">Target</th>
                          <th className="px-5 py-4">Allow repeat</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4 text-right">Action</th>
                        </tr>
                      </thead>

                      {groupedRows.map((group) => (
                        <tbody key={group.ward} className="divide-y divide-slate-100">
                          <tr className="bg-slate-50/60">
                            <td colSpan={8} className="px-5 py-2.5 text-[11px] font-black uppercase tracking-wide text-slate-600">
                              {group.ward}
                              <span className="ml-2 font-semibold normal-case tracking-normal text-slate-400">
                                {group.rows.length} {group.rows.length === 1 ? "row" : "rows"} · {group.rows.filter((r) => !r.existing).length} need a target
                              </span>
                            </td>
                          </tr>

                          {group.rows.map((row) => {
                            const raw = draftOf(row);
                            const max = maxFor(row);
                            const typed = Number(raw);
                            const over = raw !== "" && Number.isFinite(typed) && typed > max;
                            const dirty = isDirty(row);
                            const busy = busyKeys.includes(row.key);
                            const state = row.existing ? getProgressState(row.existing) : null;

                            return (
                              <tr key={row.key} className={dirty ? "bg-blue-50/40" : "hover:bg-slate-50/70"}>
                                <td className="px-5 py-3.5">
                                  <div className="text-sm font-black text-slate-900">{row.userName}</div>
                                  {row.employeeId && (
                                    <div className="mt-0.5 text-[10px] font-semibold text-slate-400">{row.employeeId}</div>
                                  )}
                                </td>

                                <td className="px-5 py-3.5">
                                  <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-black text-slate-700">
                                    {moduleLabel(row.moduleName)}
                                  </span>
                                </td>

                                <td className="px-5 py-3.5 text-center text-base font-black text-slate-900">{row.assigned}</td>

                                <td className="px-5 py-3.5 text-center text-base font-black text-blue-600">{max}</td>

                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={1}
                                      max={max}
                                      step={1}
                                      value={raw}
                                      onChange={(event) => setDraft(row.key, event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" && dirty && !busy) {
                                          void saveRow(row);
                                        }
                                      }}
                                      placeholder={`1 – ${max}`}
                                      className={`h-10 w-28 rounded-xl border bg-white px-3 text-sm font-black text-slate-800 outline-none focus:ring-2 ${over ? "border-rose-400 focus:ring-rose-500/10" : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"}`}
                                    />

                                    {!row.existing && raw !== String(max) && (
                                      <button
                                        type="button"
                                        onClick={() => setDraft(row.key, String(max))}
                                        className="text-[10px] font-black text-blue-600 hover:text-blue-800"
                                      >
                                        max
                                      </button>
                                    )}
                                  </div>

                                  {over && (
                                    <div className="mt-1 text-[10px] font-black text-rose-600">Maximum is {max}</div>
                                  )}
                                </td>

                                <td className="px-5 py-3.5">
                                  <RepeatSwitch
                                    on={repeatOf(row)}
                                    onChange={(value) =>
                                      setRepeatDrafts((prev) => ({ ...prev, [row.key]: value }))
                                    }
                                  />
                                </td>

                                <td className="px-5 py-3.5">
                                  {row.existing && state ? (
                                    <div className="min-w-[150px]">
                                      <div className="mb-1.5 flex items-center justify-between gap-2">
                                        <span className="text-xs font-black text-slate-800">
                                          {row.existing.achieved}/{row.existing.targetValue}
                                        </span>

                                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${state.className}`}>
                                          {state.label}
                                        </span>
                                      </div>

                                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                          className={`h-full rounded-full ${progressBarClass(row.existing.progress)}`}
                                          style={{ width: `${Math.min(row.existing.progress, 100)}%` }}
                                        />
                                      </div>

                                      {row.existing.aboveAssignedAssets && (
                                        <div className="mt-1 text-[10px] font-black text-rose-600">
                                          Above assigned assets (max {row.existing.maxAllowed})
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                                      No target
                                    </span>
                                  )}
                                </td>

                                <td className="px-5 py-3.5">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void saveRow(row)}
                                      disabled={!dirty || busy || bulkSaving}
                                      className="inline-flex h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                                    >
                                      {busy ? (
                                        <Loader2 size={14} className="animate-spin" />
                                      ) : (
                                        <Save size={14} />
                                      )}
                                      {row.existing ? "Update" : "Set target"}
                                    </button>

                                    {row.existing && (
                                      <button
                                        type="button"
                                        onClick={() => void openHistory(row.existing!)}
                                        title="Change history"
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                                      >
                                        <History size={15} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      ))}
                    </table>
                  </div>
                )}
              </section>

              {/* DAROGAS WITHOUT ASSETS */}

              {!loadingFirst && darogasWithoutAssets.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <button
                    type="button"
                    onClick={() => setShowNoAssets((value) => !value)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <AlertCircle size={18} />
                      </div>

                      <div>
                        <div className="text-sm font-black text-slate-900">
                          {darogasWithoutAssets.length} Daroga{darogasWithoutAssets.length === 1 ? "" : "s"} cannot get a target yet
                        </div>

                        <div className="text-xs font-semibold text-slate-500">
                          No assets are assigned to them, so there is nothing to set a target on.
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-black text-blue-600">{showNoAssets ? "Hide" : "Show"}</span>
                  </button>

                  {showNoAssets && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {darogasWithoutAssets.map((user) => (
                        <span
                          key={user.userId}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600"
                        >
                          {user.name}
                          {user.employeeId ? ` • ${user.employeeId}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          ) : (
            <>
              {/* =============================================
                  PERFORMANCE
              ============================================= */}

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                  <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900">All Targets & Performance</h2>

                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                          {filteredTargets.length} {filteredTargets.length === 1 ? "Target" : "Targets"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Live achievement from inspections and SI review activity. Includes older per-user targets.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative min-w-[210px] flex-1 sm:flex-none">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          placeholder="Search user or ward..."
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 sm:w-[220px]"
                        />
                      </div>

                      <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as TargetRole | "ALL")} className={filterClass}>
                        <option value="ALL">All Roles</option>
                        <option value="SUPERVISOR">Daroga</option>
                        <option value="QC">SI</option>
                      </select>

                      <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className={filterClass}>
                        <option value="ALL">All Modules</option>
                        {uniqueModules.map((module) => (
                          <option key={module} value={module}>
                            {moduleLabel(module)}
                          </option>
                        ))}
                      </select>

                      <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as TargetPeriodType | "ALL")} className={filterClass}>
                        <option value="ALL">All Periods</option>
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>

                      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className={filterClass}>
                        <option value="ALL">All Status</option>
                        <option value="MET">Target Met</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="NOT_STARTED">Not Started</option>
                      </select>

                      {(searchTerm || roleFilter !== "ALL" || moduleFilter !== "ALL" || periodFilter !== "ALL" || statusFilter !== "ALL") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm("");
                            setRoleFilter("ALL");
                            setModuleFilter("ALL");
                            setPeriodFilter("ALL");
                            setStatusFilter("ALL");
                          }}
                          className="text-xs font-black text-blue-600 hover:text-blue-700"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {targetsLoading ? (
                  <div className="flex min-h-[260px] items-center justify-center">
                    <Loader2 size={22} className="animate-spin text-blue-600" />
                  </div>
                ) : filteredTargets.length === 0 ? (
                  <div className="flex min-h-[260px] flex-col items-center justify-center px-5 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <Users size={24} />
                    </div>

                    <h3 className="mt-4 text-base font-black text-slate-800">No targets found</h3>

                    <p className="mt-1 max-w-md text-sm font-medium leading-6 text-slate-500">
                      Set targets from the “Set Targets” tab, or change the filters.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[1220px]">
                        <thead className="bg-slate-50/90">
                          <tr className="text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                            <th className="px-5 py-4">User</th>
                            <th className="px-5 py-4">Module</th>
                            <th className="px-5 py-4">Period</th>
                            <th className="px-5 py-4">Date Range</th>
                            <th className="px-5 py-4 text-center">Target</th>
                            <th className="px-5 py-4 text-center">Achieved</th>
                            <th className="px-5 py-4 text-center">Remaining</th>
                            <th className="px-5 py-4">Progress</th>
                            <th className="px-5 py-4 text-right">Actions</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {filteredTargets.map((target) => (
                            <TargetRow
                              key={target.id}
                              target={target}
                              onEdit={() => openEdit(target)}
                              onHistory={() => void openHistory(target)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-3 p-4 md:hidden">
                      {filteredTargets.map((target) => (
                        <TargetMobileCard
                          key={target.id}
                          target={target}
                          onEdit={() => openEdit(target)}
                          onHistory={() => void openHistory(target)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {/* STICKY SAVE BAR */}

      {tab === "SET" && dirtyRows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
            <div className="text-sm font-black text-slate-800">
              {dirtyRows.length} unsaved {dirtyRows.length === 1 ? "target" : "targets"}
              <span className="ml-2 text-xs font-semibold text-slate-500">
                {periodLabel(periodType)} targets · {periodText}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => clearDrafts()}
                disabled={bulkSaving}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={() => void saveAll()}
                disabled={bulkSaving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {bulkSaving ? <Loader2 size={17} className="animate-spin" /> : <Target size={17} />}
                {bulkSaving ? "Saving..." : `Save ${dirtyRows.length} ${dirtyRows.length === 1 ? "target" : "targets"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SI TARGET MODAL */}

      {mounted &&
        siOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !siSaving) {
                setSiOpen(false);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="si-target-title"
              className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                  <h3 id="si-target-title" className="text-lg font-black text-slate-900">
                    Add SI Target
                  </h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    SI targets count review work and are not ward-wise.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSiOpen(false)}
                  disabled={siSaving}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="space-y-4 p-6">
                {siError && (
                  <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    {siError}
                  </div>
                )}

                <FormField label="SI User">
                  <select
                    value={siUserId}
                    onChange={(event) => {
                      setSiUserId(event.target.value);
                      setSiModuleId("");
                    }}
                    className={inputClass}
                  >
                    <option value="">Select SI user</option>
                    {[...qcUsers]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((user) => (
                        <option key={user.userId} value={user.userId}>
                          {user.name}
                          {user.employeeId ? ` • ${user.employeeId}` : ""}
                        </option>
                      ))}
                  </select>
                </FormField>

                <FormField label="Module">
                  <select
                    value={siModuleId}
                    disabled={!siUserId}
                    onChange={(event) => setSiModuleId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">{siUserId ? "Select module" : "Select user first"}</option>
                    {(siUser?.modules ?? []).map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.displayName || moduleLabel(module.name)}
                      </option>
                    ))}
                  </select>
                </FormField>

                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Period">
                    <select
                      value={siPeriod}
                      onChange={(event) => setSiPeriod(event.target.value as TargetPeriodType)}
                      className={inputClass}
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </FormField>

                  <FormField label="Start Date">
                    <input
                      type="date"
                      value={siDate}
                      onChange={(event) => setSiDate(event.target.value)}
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Target">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={siValue}
                      onChange={(event) => setSiValue(event.target.value)}
                      placeholder="e.g. 20"
                      className={inputClass}
                    />
                  </FormField>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSiOpen(false)}
                    disabled={siSaving}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSiSave()}
                    disabled={siSaving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60"
                  >
                    {siSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {siSaving ? "Saving..." : "Assign Target"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

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
                        ? "Daroga"
                        : "SI"
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
              ? "Daroga"
              : "SI"}
          </span>

          {target.ward && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600">
              {target.ward.name}
            </span>
          )}

          {target.ward && target.allowRepeat === false && (
            <span
              title="Inspected assets stay locked until every assigned asset is inspected"
              className="rounded-md bg-amber-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-700"
            >
              Rotation
            </span>
          )}

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
        {target.isStanding ? (
          <>
            <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700">
              Standing
            </span>

            {target.effectiveFrom && (
              <div className="mt-1 text-[10px] font-semibold text-slate-400">
                since {formatDate(target.effectiveFrom)}
              </div>
            )}
          </>
        ) : (
        <div className="text-xs font-black text-slate-700">
          {formatDate(
            target.startDate,
          )}
        </div>
        )}

        {!target.isStanding && target.startDate !==
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

          {target.aboveAssignedAssets && (
            <div className="mt-1.5 text-[10px] font-black text-rose-600">
              Above assigned assets (max {target.maxAllowed})
            </div>
          )}
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
            {target.ward ? ` • ${target.ward.name}` : ""}
          </div>

          {target.aboveAssignedAssets && (
            <div className="mt-1 text-[10px] font-black text-rose-600">
              Above assigned assets (max {target.maxAllowed})
            </div>
          )}
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
/* =========================================================
   ALLOW REPEAT SWITCH
========================================================= */

function RepeatSwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="inline-flex items-center gap-2"
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-blue-600" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
        />
      </span>

      <span className={`text-[11px] font-black ${on ? "text-blue-700" : "text-slate-500"}`}>
        {on ? "ON" : "OFF"}
      </span>
    </button>
  );
}
