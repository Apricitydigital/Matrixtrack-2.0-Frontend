
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  AreaBeatApi,
  CityUserApi,
  RegistrationApi,
} from "@lib/apiClient";
import swachhApi from "../../modules/swachh-ranking/api/axios";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Flame,
  Layers3,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Toilet,
  Trash2,
  Trophy,
  Truck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ModuleKey = "SWEEPING" | "TOILET" | "TWINBIN" | "TASKFORCE";
type GeoLevel = "zone" | "ward" | "area";

type GeoNode = {
  id: string;
  name: string;
  parentId?: string;
  parent_id?: string;
  parent?: { id?: string };
};

type RequestStats = {
  userRegistrations: number;
  beatRequests: number;
  toiletRequests: number;
  litterBinRequests: number;
  gvpRequests: number;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  count: number;
  route: string;
  color: string;
  soft: string;
  border: string;
  icon: React.ReactNode;
};


type SnapshotDetailKey =
  | "zones"
  | "wards"
  | "beats"
  | "submitted"
  | "pending"
  | "accepted"
  | "rejected"
  | "actionRequired"
  | "resolved"
  | "supervisors";

type SnapshotDetailRow = {
  id: string;
  title: string;
  meta: string;
  secondary?: string;
  badge?: string;
  route: string;
};


type NoActivityAlert = {
  id: string;
  level: "ZONE" | "WARD" | "AREA";
  name: string;
  zone: string;
  ward?: string;
  area?: string;
  daysInactive: number;
  lastActivityDate?: string;
};

function buildNoActivityAlerts(
  records: any[],
  zones: any[],
  wards: any[],
  areas: any[],
  referenceDate: string,
  lookbackDays = 7
): NoActivityAlert[] {
  const nodeParentId = (node: any) =>
    String(node?.parentId ?? node?.parent_id ?? node?.parent?.id ?? "");
  const clean = (value: any) => String(value ?? "").trim();
  const nameKey = (value: any) => clean(value).toLowerCase().replace(/\s+/g, " ");
  const dateKey = (value: any) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const zoneById = new Map((zones || []).map((node: any) => [String(node.id), node]));
  const wardById = new Map((wards || []).map((node: any) => [String(node.id), node]));
  const areaById = new Map((areas || []).map((node: any) => [String(node.id), node]));
  const areaIdByName = new Map(
    (areas || []).filter((node: any) => node?.id && node?.name).map((node: any) => [nameKey(node.name), String(node.id)])
  );

  const latestZone = new Map<string, string>();
  const latestWard = new Map<string, string>();
  const latestArea = new Map<string, string>();
  const setLatest = (map: Map<string, string>, id: string, value: string) => {
    if (!id || !value) return;
    const current = map.get(id);
    if (!current || value > current) map.set(id, value);
  };

  (records || []).forEach((record: any) => {
    const activityDate = dateKey(
      record?.createdAt ?? record?.submittedAt ?? record?.inspectionDate ?? record?.reportDate ?? record?.date ?? record?.updatedAt
    );
    if (!activityDate) return;

    let areaId = clean(record?.areaId ?? record?.area_id ?? record?.area?.id ?? record?.location?.areaId);
    if (!areaId) {
      const areaName = record?.areaName ?? record?.area?.name ?? record?.location?.areaName;
      areaId = areaIdByName.get(nameKey(areaName)) || "";
    }

    let wardId = clean(record?.wardId ?? record?.ward_id ?? record?.ward?.id ?? record?.location?.wardId);
    if (!wardId && areaId) wardId = nodeParentId(areaById.get(areaId));

    let zoneId = clean(record?.zoneId ?? record?.zone_id ?? record?.zone?.id ?? record?.location?.zoneId);
    if (!zoneId && wardId) zoneId = nodeParentId(wardById.get(wardId));

    setLatest(latestArea, areaId, activityDate);
    setLatest(latestWard, wardId, activityDate);
    setLatest(latestZone, zoneId, activityDate);
  });

  const ref = new Date(`${referenceDate}T00:00:00`);
  const inactiveDays = (last?: string) => {
    if (!last) return lookbackDays;
    const then = new Date(`${last}T00:00:00`);
    return Math.max(0, Math.floor((ref.getTime() - then.getTime()) / 86400000));
  };

  const alerts: NoActivityAlert[] = [];
  const wardsByZone = new Map<string, any[]>();
  const areasByWard = new Map<string, any[]>();
  (wards || []).forEach((ward: any) => {
    const key = nodeParentId(ward);
    if (!wardsByZone.has(key)) wardsByZone.set(key, []);
    wardsByZone.get(key)!.push(ward);
  });
  (areas || []).forEach((area: any) => {
    const key = nodeParentId(area);
    if (!areasByWard.has(key)) areasByWard.set(key, []);
    areasByWard.get(key)!.push(area);
  });

  (zones || []).forEach((zone: any) => {
    const zoneId = String(zone.id);
    const zoneLast = latestZone.get(zoneId);
    const zoneDays = inactiveDays(zoneLast);
    if (zoneDays >= 1) {
      alerts.push({ id: `zone:${zoneId}`, level: "ZONE", name: zone.name || "Unnamed Zone", zone: zone.name || "Unnamed Zone", daysInactive: zoneDays, lastActivityDate: zoneLast });
      return;
    }

    (wardsByZone.get(zoneId) || []).forEach((ward: any) => {
      const wardId = String(ward.id);
      const wardLast = latestWard.get(wardId);
      const wardDays = inactiveDays(wardLast);
      if (wardDays >= 1) {
        alerts.push({ id: `ward:${wardId}`, level: "WARD", name: ward.name || "Unnamed Ward", zone: zone.name || "Unnamed Zone", ward: ward.name || "Unnamed Ward", daysInactive: wardDays, lastActivityDate: wardLast });
        return;
      }

      (areasByWard.get(wardId) || []).forEach((area: any) => {
        const areaId = String(area.id);
        const areaLast = latestArea.get(areaId);
        const areaDays = inactiveDays(areaLast);
        if (areaDays >= 1) {
          alerts.push({ id: `area:${areaId}`, level: "AREA", name: area.name || "Unnamed Area", zone: zone.name || "Unnamed Zone", ward: ward.name || "Unnamed Ward", area: area.name || "Unnamed Area", daysInactive: areaDays, lastActivityDate: areaLast });
        }
      });
    });
  });

  const levelPriority: Record<NoActivityAlert["level"], number> = { ZONE: 0, WARD: 1, AREA: 2 };
  return alerts.sort((a, b) => b.daysInactive - a.daysInactive || levelPriority[a.level] - levelPriority[b.level] || a.name.localeCompare(b.name));
}

function inactivityLabel(days: number) {
  return days >= 3 ? "3+ days" : `${days} day${days === 1 ? "" : "s"}`;
}

const MODULES: Record<
  ModuleKey,
  { name: string; short: string; color: string; soft: string }
> = {
  SWEEPING: {
    name: "Sweeping",
    short: "Sweeping",
    color: "#10b981",
    soft: "#ecfdf5",
  },
  TOILET: {
    name: "Cleanliness of Toilets",
    short: "Toilets",
    color: "#3b82f6",
    soft: "#eff6ff",
  },
  TWINBIN: {
    name: "Litter Bins",
    short: "Litter Bins",
    color: "#f59e0b",
    soft: "#fffbeb",
  },
  TASKFORCE: {
    name: "GVP",
    short: "GVP",
    color: "#8b5cf6",
    soft: "#f5f3ff",
  },
};

const KEYS = Object.keys(MODULES) as ModuleKey[];
const LIVE_REFRESH_MS = 60_000;
const HEAT_PAGE_SIZE = 5;
const SUPERVISOR_PAGE_SIZE = 5;

const norm = (value: any) => String(value ?? "").trim();
const up = (value: any) => norm(value).toUpperCase();

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const addDays = (value: string, amount: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return dayKey(date);
};

const monthPreset = (reference: string, offset: number) => {
  const base = new Date(`${reference}T00:00:00`);
  const start = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const end =
    offset === 0
      ? base
      : new Date(base.getFullYear(), base.getMonth() + offset + 1, 0);

  return {
    offset,
    from: dayKey(start),
    to: dayKey(end),
    label: start.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
  };
};

const parentId = (node: any) =>
  norm(node?.parentId ?? node?.parent_id ?? node?.parent?.id);

const approved = (status: any) =>
  ["APPROVED", "RESOLVED", "ACTION_TAKEN"].includes(up(status));

const rejected = (status: any) => up(status) === "REJECTED";
const actionRequired = (status: any) => up(status) === "ACTION_REQUIRED";

const pending = (status: any) =>
  ["PENDING", "SUBMITTED", "PENDING_QC", "UNDER_REVIEW", "QC_PENDING"].includes(up(status));

function recordDate(record: any) {
  const raw =
    record?.createdAt ??
    record?.submittedAt ??
    record?.inspectionDate ??
    record?.reportDate ??
    record?.date ??
    record?.updatedAt;

  if (!raw) return "";

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : dayKey(date);
}

function geoId(record: any, level: GeoLevel) {
  const cap = level[0].toUpperCase() + level.slice(1);

  return norm(
    record?.[`${level}Id`] ??
      record?.[`${level}_id`] ??
      record?.[level]?.id ??
      record?.[`assigned${cap}Id`] ??
      record?.location?.[`${level}Id`]
  );
}

function geoName(
  record: any,
  level: GeoLevel,
  map: Record<string, string>
) {
  const cap = level[0].toUpperCase() + level.slice(1);

  const direct = norm(
    record?.[`${level}Name`] ??
      record?.[level]?.name ??
      record?.[`assigned${cap}Name`] ??
      record?.location?.[`${level}Name`]
  );

  return direct || map[geoId(record, level)] || "";
}

function ownerName(record: any) {
  // Supervisor ranking must only use an actual supervisor identity.
  // Do not label an employee/submitter as a supervisor.
  return norm(
    record?.supervisorName ??
      record?.supervisor?.name ??
      record?.assignedSupervisor?.name
  );
}

export default function CityAdminDashboard({
  userCityName = "Indore",
}: {
  userCityName?: string;
}) {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
  const liveRefreshInFlightRef = useRef(false);
  const recordsRequestIdRef = useRef(0);
  const supervisorRecordsRequestIdRef = useRef(0);
  const moduleRecordsRequestIdRef = useRef(0);

  const today = useMemo(() => dayKey(new Date()), []);

  const [zone, setZone] = useState("ALL");
  const [ward, setWard] = useState("ALL");
  const [area, setArea] = useState("ALL");
  const [subModule, setSubModule] = useState<"ALL" | ModuleKey>("ALL");

  const [zones, setZones] = useState<GeoNode[]>([]);
  const [wards, setWards] = useState<GeoNode[]>([]);
  const [areas, setAreas] = useState<GeoNode[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [swachh, setSwachh] = useState<any>({});

  const [search, setSearch] = useState("");
  const [directoryRole, setDirectoryRole] = useState("ALL");
  const [directoryModule, setDirectoryModule] = useState("ALL");
  const [directoryStatus, setDirectoryStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [heatPage, setHeatPage] = useState(1);
  const [supervisorPage, setSupervisorPage] = useState(1);
  const [supervisorZone, setSupervisorZone] = useState("ALL");
  const [supervisorWard, setSupervisorWard] = useState("ALL");
  const [supervisorMonthOffset, setSupervisorMonthOffset] = useState(0);
  const [supervisorFromDate, setSupervisorFromDate] = useState(
    () => monthPreset(today, 0).from
  );
  const [supervisorToDate, setSupervisorToDate] = useState(
    () => monthPreset(today, 0).to
  );
  const [supervisorRecords, setSupervisorRecords] = useState<any[]>([]);
  const [supervisorPerformanceLoading, setSupervisorPerformanceLoading] = useState(false);
  const [moduleMonthOffset, setModuleMonthOffset] = useState(0);
  const [moduleZone, setModuleZone] = useState("ALL");
  const [moduleWard, setModuleWard] = useState("ALL");
  const [moduleRecords, setModuleRecords] = useState<any[]>([]);
  const [modulePerformanceLoading, setModulePerformanceLoading] = useState(false);

  const [requestStats, setRequestStats] = useState<RequestStats>({
    userRegistrations: 0,
    beatRequests: 0,
    toiletRequests: 0,
    litterBinRequests: 0,
    gvpRequests: 0,
  });
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationUpdatedAt, setNotificationUpdatedAt] = useState<Date | null>(null);
  const notificationBaselineReadyRef = useRef(false);
  const previousNotificationCountsRef = useRef<Record<string, number>>({});
  const newNotificationTimerRef = useRef<number | null>(null);
  const [newNotificationNotice, setNewNotificationNotice] = useState<{
    count: number;
    labels: string[];
  } | null>(null);
  const [snapshotDetail, setSnapshotDetail] =
    useState<SnapshotDetailKey | null>(null);

  useEffect(() => {
    if (!snapshotDetail) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [snapshotDetail]);

  // City Admin operational analytics are always based on today.
  // Inspection Trend is intentionally the only chart that uses a rolling 7-day window.
  const activeFromDate = today;
  const activeToDate = today;
  const trendFromDate = addDays(today, -6);
  const reportScopeLabel = useMemo(
    () =>
      new Date(`${today}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [today]
  );

  const monthPresets = useMemo(
    () => [0, -1, -2].map((offset) => monthPreset(today, offset)),
    [today]
  );

  const supervisorPeriodLabel = useMemo(() => {
    const format = (value: string) =>
      new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    const start = new Date(`${supervisorFromDate}T00:00:00`);
    const end = new Date(`${supervisorToDate}T00:00:00`);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

    return supervisorFromDate === supervisorToDate
      ? `${format(supervisorFromDate)} • 1 day`
      : `${format(supervisorFromDate)} - ${format(supervisorToDate)} • ${days} days`;
  }, [supervisorFromDate, supervisorToDate]);

  const geoMap = useMemo(() => {
    const map: Record<string, string> = {};

    [...zones, ...wards, ...areas].forEach((node) => {
      if (node?.id) map[node.id] = node.name;
    });

    return map;
  }, [zones, wards, areas]);

  const visibleWards = useMemo(() => {
    if (zone === "ALL") return wards;

    const related = wards.filter((item) => parentId(item) === zone);
    return related.length ? related : wards;
  }, [wards, zone]);

  const supervisorVisibleWards = useMemo(() => {
    if (supervisorZone === "ALL") return wards;

    const related = wards.filter((item) => parentId(item) === supervisorZone);
    return related.length ? related : wards;
  }, [wards, supervisorZone]);

  const moduleVisibleWards = useMemo(() => {
    if (moduleZone === "ALL") return wards;

    const related = wards.filter((item) => parentId(item) === moduleZone);
    return related.length ? related : wards;
  }, [wards, moduleZone]);

  const visibleAreas = useMemo(() => {
    if (ward !== "ALL") {
      const related = areas.filter((item) => parentId(item) === ward);
      return related.length ? related : areas;
    }

    if (zone !== "ALL") {
      const wardIds = new Set(visibleWards.map((item) => item.id));
      const related = areas.filter((item) => wardIds.has(parentId(item)));
      return related.length ? related : areas;
    }

    return areas;
  }, [areas, ward, zone, visibleWards]);

  async function loadNotificationData() {
    const [
      userRegistrationResponse,
      beatRequestResponse,
      toiletRequestResponse,
      litterBinRequestResponse,
      gvpRequestResponse,
    ] = await Promise.all([
      RegistrationApi.listRequests().catch(() => ({ requests: [] })),
      AreaBeatApi.listPendingRequests().catch(() => ({ pendingBeats: [] })),
      apiFetch<any>("/modules/toilet/pending").catch(() => ({ toilets: [] })),
      apiFetch<any>("/modules/twinbin/bin-requests/pending").catch(() => ({ data: [] })),
      apiFetch<any>("/modules/taskforce/feeder-points/pending").catch(() => ({
        feederPoints: [],
      })),
    ]);

    const userRegistrations = (userRegistrationResponse?.requests || []).filter(
      (item: any) => !item?.status || up(item.status) === "PENDING"
    ).length;

const beatPayload = beatRequestResponse as any;

const beatRequests = (
  beatPayload?.pendingBeats ||
  beatPayload?.beats ||
  beatPayload?.data ||
  []
).length;

    const toiletRequests = (
      toiletRequestResponse?.toilets ||
      toiletRequestResponse?.data ||
      []
    ).length;

    const litterBinRequests = (
      litterBinRequestResponse?.data ||
      litterBinRequestResponse?.bins ||
      litterBinRequestResponse?.requests ||
      []
    ).length;

    const gvpRequests = (
      gvpRequestResponse?.feederPoints ||
      gvpRequestResponse?.data ||
      []
    ).length;

    setRequestStats({
      userRegistrations,
      beatRequests,
      toiletRequests,
      litterBinRequests,
      gvpRequests,
    });

    setNotificationUpdatedAt(new Date());
  }

  async function loadBase() {
    const [userResponse, beatResponse, zoneResponse, wardResponse, areaResponse, swachhResponse] =
      await Promise.all([
        CityUserApi.list().catch(() => ({ users: [] })),
        AreaBeatApi.list().catch(() => ({ beats: [] })),
        apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=ZONE").catch(() => ({
          nodes: [],
        })),
        apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=WARD").catch(() => ({
          nodes: [],
        })),
        apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=AREA").catch(() => ({
          nodes: [],
        })),
        swachhApi.get("/admin/stats").catch(() => ({ data: {} })),
      ]);

    setUsers(userResponse?.users || []);
    setBeats(beatResponse?.beats || []);
    setZones(zoneResponse?.nodes || []);
    setWards(wardResponse?.nodes || []);
    setAreas(areaResponse?.nodes || []);
    setSwachh(swachhResponse?.data || {});
  }

  async function loadRecords() {
    const requestId = ++recordsRequestIdRef.current;

    // Fetch exactly the rolling 7-day window needed by Inspection Trend.
    // Today's cards use only today's rows from this same live snapshot.
    const startDate = new Date(`${trendFromDate}T00:00:00`).toISOString();
    const endDate = new Date(`${addDays(today, 1)}T00:00:00`).toISOString();
    const params = new URLSearchParams({ startDate, endDate });

    try {
      const response = await apiFetch<{ data: any[] }>(
        `/city/dashboard/inspection-records?${params.toString()}`
      );

      const freshRows = response?.data || [];

      // Ignore an older response if the user changed the date scope while it was loading.
      if (requestId === recordsRequestIdRef.current) {
        setRecords(freshRows);
      }
    } catch (error) {
      // Keep the last valid live snapshot instead of replacing it with false zeroes
      // during a temporary API/network failure.
      console.error("City analytics live refresh failed:", error);
    }
  }

  async function loadSupervisorPerformanceData(silent = false) {
    const requestId = ++supervisorRecordsRequestIdRef.current;

    if (!silent) setSupervisorPerformanceLoading(true);

    const startDate = new Date(`${supervisorFromDate}T00:00:00`).toISOString();
    const endDate = new Date(`${addDays(supervisorToDate, 1)}T00:00:00`).toISOString();
    const params = new URLSearchParams({ startDate, endDate });
    if (supervisorZone !== "ALL") params.set("zoneId", supervisorZone);
    if (supervisorWard !== "ALL") params.set("wardId", supervisorWard);

    try {
      const response = await apiFetch<{ data: any[] }>(
        `/city/dashboard/inspection-records?${params.toString()}`
      );

      if (requestId === supervisorRecordsRequestIdRef.current) {
        setSupervisorRecords(response?.data || []);
      }
    } catch (error) {
      console.error("Supervisor performance refresh failed:", error);
    } finally {
      if (requestId === supervisorRecordsRequestIdRef.current && !silent) {
        setSupervisorPerformanceLoading(false);
      }
    }
  }

  async function loadModulePerformanceData(silent = false) {
    const requestId = ++moduleRecordsRequestIdRef.current;
    if (!silent) setModulePerformanceLoading(true);

    const preset = monthPreset(today, moduleMonthOffset);
    const startDate = new Date(`${preset.from}T00:00:00`).toISOString();
    const endDate = new Date(`${addDays(preset.to, 1)}T00:00:00`).toISOString();
    const params = new URLSearchParams({ startDate, endDate });
    if (moduleZone !== "ALL") params.set("zoneId", moduleZone);
    if (moduleWard !== "ALL") params.set("wardId", moduleWard);

    try {
      const response = await apiFetch<{ data: any[] }>(
        `/city/dashboard/inspection-records?${params.toString()}`
      );
      if (requestId === moduleRecordsRequestIdRef.current) {
        setModuleRecords(response?.data || []);
      }
    } catch (error) {
      console.error("Module performance refresh failed:", error);
    } finally {
      if (requestId === moduleRecordsRequestIdRef.current && !silent) {
        setModulePerformanceLoading(false);
      }
    }
  }

  async function loadAll(initial = false, silent = false) {
    if (liveRefreshInFlightRef.current) return;

    liveRefreshInFlightRef.current = true;

    if (initial) setLoading(true);
    else if (!silent) setRefreshing(true);

    try {
      await Promise.all([loadBase(), loadRecords(), loadNotificationData(), loadModulePerformanceData(true)]);
    } finally {
      liveRefreshInFlightRef.current = false;
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refreshLiveDashboard = () => {
      if (document.visibilityState === "visible") {
        void loadAll(false, true);
        void loadSupervisorPerformanceData(true);
        void loadModulePerformanceData(true);
      }
    };

    const timer = window.setInterval(
      refreshLiveDashboard,
      LIVE_REFRESH_MS
    );

    const handleFocus = () => refreshLiveDashboard();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshLiveDashboard();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // Keep polling bound to the currently selected dashboard scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supervisorFromDate, supervisorToDate, supervisorZone, supervisorWard, moduleMonthOffset, moduleZone, moduleWard]);


  useEffect(() => {
    void loadSupervisorPerformanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supervisorFromDate, supervisorToDate]);

  useEffect(() => {
    void loadModulePerformanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleMonthOffset, moduleZone, moduleWard]);

  const scoped = useMemo(() => {
    if (area === "ALL") return records;

    return records.filter(
      (record) =>
        geoId(record, "area") === area ||
        geoName(record, "area", geoMap) === geoMap[area]
    );
  }, [records, area, geoMap]);

  const selected = useMemo(
    () => scoped.filter((record) => recordDate(record) === today),
    [scoped, today]
  );

  const status = useMemo(() => {
    const approvedCount = selected.filter((record) =>
      approved(record.status)
    ).length;

    const rejectedCount = selected.filter((record) =>
      rejected(record.status)
    ).length;

    const actionCount = selected.filter((record) =>
      actionRequired(record.status)
    ).length;

    const pendingCount = selected.filter((record) =>
      pending(record.status)
    ).length;

    return {
      total: selected.length,
      approved: approvedCount,
      rejected: rejectedCount,
      actionRequired: actionCount,
      pending: pendingCount,
      approval: selected.length
        ? Math.round((approvedCount * 100) / selected.length)
        : 0,
    };
  }, [selected]);


  const snapshotReportStats = useMemo(() => {
    const acceptedRows = selected.filter((record) => up(record.status) === "APPROVED");
    const resolvedRows = selected.filter((record) =>
      ["RESOLVED", "ACTION_TAKEN"].includes(up(record.status))
    );

    return {
      submitted: selected.length,
      pending: selected.filter((record) => pending(record.status)).length,
      accepted: acceptedRows.length,
      rejected: selected.filter((record) => rejected(record.status)).length,
      actionRequired: selected.filter((record) => actionRequired(record.status)).length,
      resolved: resolvedRows.length,
    };
  }, [selected]);

  const snapshotSupervisors = useMemo(
    () =>
      users.filter((user) => {
        const roles = [user?.role, ...(user?.roles || [])].map(up);
        const active =
          user?.enabled !== false &&
          !["INACTIVE", "DISABLED", "BLOCKED"].includes(up(user?.status));
        return active && roles.includes("SUPERVISOR");
      }),
    [users]
  );

  const moduleRouteForRecord = (record: any) => {
    const key = up(record?.__module);
    if (key === "SWEEPING") return "/modules/sweeping";
    if (key === "TOILET") return "/modules/toilet/inspection";
    if (key === "TWINBIN") return "/modules/litterbins/admin";
    if (key === "TASKFORCE") return "/modules/taskforce/admin";
    return "/city";
  };

  const pointNameForRecord = (record: any) =>
    norm(
      record?.pointName ??
        record?.locationName ??
        record?.toiletName ??
        record?.toilet?.name ??
        record?.binName ??
        record?.litterBinName ??
        record?.bin?.name ??
        record?.beatName ??
        record?.beat?.name ??
        record?.feederPointName ??
        record?.feederPoint?.name ??
        record?.gvpName ??
        record?.name
    ) || `${MODULES[record?.__module as ModuleKey]?.short || "Inspection"} report`;

  const submitterNameForRecord = (record: any) =>
    norm(
      record?.submittedByName ??
        record?.submittedBy?.name ??
        record?.createdBy?.name ??
        record?.employee?.name ??
        record?.user?.name ??
        record?.supervisor?.name
    ) || "Unknown submitter";

  const snapshotDetailData = useMemo(() => {
    if (!snapshotDetail) return null;

    const formatGeoMeta = (zoneName?: string, wardName?: string) =>
      [zoneName, wardName].filter(Boolean).join(" • ") || userCityName;

    const reportRows = (
      rows: any[],
      badgeLabel?: (record: any) => string
    ): SnapshotDetailRow[] =>
      rows.map((record, index) => {
        const moduleKey = record?.__module as ModuleKey;
        const moduleName = MODULES[moduleKey]?.short || "Inspection";
        const zoneName = geoName(record, "zone", geoMap) || "Zone not mapped";
        const wardName = geoName(record, "ward", geoMap) || "Ward not mapped";
        return {
          id: norm(record?.id) || `${moduleName}-${index}`,
          title: pointNameForRecord(record),
          meta: `${moduleName} • Submitted by ${submitterNameForRecord(record)}`,
          secondary: `${zoneName} • ${wardName}`,
          badge: badgeLabel ? badgeLabel(record) : up(record?.status).replace(/_/g, " "),
          route: moduleRouteForRecord(record),
        };
      });

    if (snapshotDetail === "zones") {
      const rows: SnapshotDetailRow[] = zones.map((zoneItem) => {
        const zoneWards = wards.filter((wardItem) => parentId(wardItem) === zoneItem.id);
        const zoneWardIds = new Set(zoneWards.map((wardItem) => wardItem.id));
        const zoneBeats = beats.filter((beat) => {
          const beatZoneId = norm(beat?.zoneId ?? beat?.zone?.id);
          const beatWardId = norm(beat?.wardId ?? beat?.ward?.id);
          return beatZoneId === zoneItem.id || zoneWardIds.has(beatWardId);
        });
        return {
          id: zoneItem.id,
          title: zoneItem.name,
          meta: `${zoneWards.length} ward${zoneWards.length === 1 ? "" : "s"} • ${zoneBeats.length} beat${zoneBeats.length === 1 ? "" : "s"}`,
          route: "/city/zones",
        };
      });
      return {
        title: "Total Zones",
        subtitle: "Registered city zones",
        count: zones.length,
        rows,
      };
    }

    if (snapshotDetail === "wards") {
      const rows: SnapshotDetailRow[] = wards.map((wardItem) => {
        const zoneItem = zones.find((zoneValue) => zoneValue.id === parentId(wardItem));
        const wardBeats = beats.filter(
          (beat) => norm(beat?.wardId ?? beat?.ward?.id) === wardItem.id
        );
        return {
          id: wardItem.id,
          title: wardItem.name,
          meta: formatGeoMeta(zoneItem?.name, wardItem.name),
          secondary: `${wardBeats.length} registered beat${wardBeats.length === 1 ? "" : "s"}`,
          route: "/city/wards",
        };
      });
      return {
        title: "Total Wards",
        subtitle: "Registered city wards",
        count: wards.length,
        rows,
      };
    }

    if (snapshotDetail === "beats") {
      const rows: SnapshotDetailRow[] = beats.map((beat, index) => {
        const wardId = norm(beat?.wardId ?? beat?.ward?.id);
        const wardItem = wards.find((wardValue) => wardValue.id === wardId);
        const zoneId =
          norm(beat?.zoneId ?? beat?.zone?.id) ||
          (wardItem ? parentId(wardItem) : "");
        const zoneItem = zones.find((zoneValue) => zoneValue.id === zoneId);
        const assigned =
          Boolean(
            beat?.assignedToId ||
              beat?.supervisorId ||
              beat?.employeeAssignedToId ||
              beat?.employeeId
          ) ||
          (beat?.segments || []).some(
            (segment: any) =>
              segment?.assignedToId ||
              segment?.employeeAssignedToId ||
              segment?.employee?.id
          );

        return {
          id: norm(beat?.id) || `beat-${index}`,
          title:
            norm(beat?.name ?? beat?.beatName ?? beat?.code) ||
            `Beat ${index + 1}`,
          meta: formatGeoMeta(zoneItem?.name, wardItem?.name),
          secondary: `${(beat?.segments || []).length} segment${(beat?.segments || []).length === 1 ? "" : "s"}`,
          badge: assigned ? "ASSIGNED" : "UNASSIGNED",
          route: "/city/beats",
        };
      });
      return {
        title: "Total Beats",
        subtitle: "Registered operational beats",
        count: beats.length,
        rows,
      };
    }

    if (snapshotDetail === "supervisors") {
      const rows: SnapshotDetailRow[] = snapshotSupervisors.map((user, index) => ({
        id: norm(user?.id) || norm(user?.email) || `supervisor-${index}`,
        title: norm(user?.name ?? user?.displayName) || "Unnamed Supervisor",
        meta: norm(user?.email ?? user?.phone) || "No contact information",
        secondary: getUserModuleLabels(user).length
          ? getUserModuleLabels(user).map(prettyModuleName).join(", ")
          : "No module assignment",
        badge: getUserStatus(user),
        route: "/portal-home/registered-users",
      }));
      return {
        title: "Total Supervisors",
        subtitle: "Active registered supervisors",
        count: snapshotSupervisors.length,
        rows,
      };
    }

    const reportConfig: Record<
      Exclude<SnapshotDetailKey, "zones" | "wards" | "beats" | "supervisors">,
      { title: string; subtitle: string; rows: any[]; badge?: (record: any) => string }
    > = {
      submitted: {
        title: "Submitted Reports",
        subtitle: `All module reports submitted today • ${reportScopeLabel}`,
        rows: selected,
      },
      pending: {
        title: "Pending Reports",
        subtitle: "Reports currently waiting for review",
        rows: selected.filter((record) => pending(record.status)),
      },
      accepted: {
        title: "Accepted Reports",
        subtitle: "Reports approved today",
        rows: selected.filter((record) => up(record.status) === "APPROVED"),
      },
      rejected: {
        title: "Rejected Reports",
        subtitle: "Reports rejected today",
        rows: selected.filter((record) => rejected(record.status)),
      },
      actionRequired: {
        title: "Action Required Reports",
        subtitle: "Reports that need field action",
        rows: selected.filter((record) => actionRequired(record.status)),
      },
      resolved: {
        title: "Resolved Reports",
        subtitle: "Reports resolved or action taken today",
        rows: selected.filter((record) =>
          ["RESOLVED", "ACTION_TAKEN"].includes(up(record.status))
        ),
      },
    };

    const config = reportConfig[snapshotDetail as keyof typeof reportConfig];
    return {
      title: config.title,
      subtitle: config.subtitle,
      count: config.rows.length,
      rows: reportRows(config.rows),
    };
  }, [
    snapshotDetail,
    zones,
    wards,
    beats,
    selected,
    snapshotSupervisors,
    geoMap,
    reportScopeLabel,
    userCityName,
  ]);

  const trend = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => addDays(today, index - 6)).map(
        (dateValue) => {
          const row: any = {
            date: new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
            }),
          };

          KEYS.forEach((key) => {
            row[key] = records.filter(
              (record) => record.__module === key && recordDate(record) === dateValue
            ).length;
          });

          return row;
        }
      ),
    [records, today]
  );

  const modulePerformance = useMemo(
    () =>
      KEYS.map((key) => {
        const rows = moduleRecords.filter((record) => record.__module === key);
        const approvedRows = rows.filter((record) =>
          approved(record.status)
        ).length;

        return {
          key,
          name: MODULES[key].short,
          total: rows.length,
          approval: rows.length
            ? Math.round((approvedRows * 100) / rows.length)
            : 0,
        };
      }),
    [moduleRecords]
  );

  const heatLevel: GeoLevel =
    zone === "ALL" ? "zone" : ward === "ALL" ? "ward" : "area";

  const heatLevelLabel =
    heatLevel === "zone" ? "Zone" : heatLevel === "ward" ? "Ward" : "Area";

  const heat = useMemo(() => {
    const map: Record<string, any> = {};
    const baseNodes =
      heatLevel === "zone" ? zones : heatLevel === "ward" ? visibleWards : visibleAreas;

    baseNodes.forEach((node) => {
      map[node.id] = {
        id: node.id,
        name: node.name,
        total: 0,
        exceptions: 0,
        modules: { SWEEPING: 0, TOILET: 0, TWINBIN: 0, TASKFORCE: 0 },
      };
    });

    selected.forEach((record) => {
      const id = geoId(record, heatLevel) || `UNMAPPED_${heatLevel}`;

      if (!map[id]) {
        map[id] = {
          id,
          name:
            geoName(record, heatLevel, geoMap) ||
            `Unmapped ${heatLevelLabel}`,
          total: 0,
          exceptions: 0,
          modules: {
            SWEEPING: 0,
            TOILET: 0,
            TWINBIN: 0,
            TASKFORCE: 0,
          },
        };
      }

      map[id].total += 1;
      map[id].modules[record.__module] += 1;

      if (rejected(record.status) || actionRequired(record.status)) {
        map[id].exceptions += 1;
      }
    });

    return Object.values(map).sort((a: any, b: any) => b.total - a.total);
  }, [selected, geoMap, heatLevel, heatLevelLabel, zones, visibleWards, visibleAreas]);

  const heatRows = useMemo(
    () =>
      heat.length
        ? heat
        : [
            {
              id: "NO_REGISTERED_SCOPE",
              name: `No registered ${heatLevelLabel.toLowerCase()}s`,
              total: 0,
              exceptions: 0,
              modules: { SWEEPING: 0, TOILET: 0, TWINBIN: 0, TASKFORCE: 0 },
            },
          ],
    [heat, heatLevelLabel]
  );

  const maxHeat = useMemo(
    () =>
      Math.max(
        1,
        ...heatRows.flatMap((row: any) =>
          KEYS.map((key) => row.modules[key])
        )
      ),
    [heatRows]
  );

  const supervisorScopedRecords = useMemo(() => {
    return supervisorRecords.filter((record) => {
      const matchesZone =
        supervisorZone === "ALL" ||
        geoId(record, "zone") === supervisorZone ||
        geoName(record, "zone", geoMap) === geoMap[supervisorZone];

      const matchesWard =
        supervisorWard === "ALL" ||
        geoId(record, "ward") === supervisorWard ||
        geoName(record, "ward", geoMap) === geoMap[supervisorWard];

      return matchesZone && matchesWard;
    });
  }, [supervisorRecords, supervisorZone, supervisorWard, geoMap]);

  const supervisorPerformance = useMemo(() => {
    const map: Record<string, any> = {};

    // With no geography filter, keep registered supervisors visible even when they
    // have zero reports. With a zone/ward filter, only supervisors with activity
    // in that selected scope are shown so users from other zones are not mislabelled.
    if (supervisorZone === "ALL" && supervisorWard === "ALL") {
      users.forEach((user) => {
        const roles = [user?.role, ...(user?.roles || [])].map(up);
        const active =
          user?.enabled !== false &&
          !["INACTIVE", "DISABLED", "BLOCKED"].includes(up(user?.status));
        const name = norm(user?.name ?? user?.displayName ?? user?.email);

        if (active && roles.includes("SUPERVISOR") && name) {
          map[name] = { name, total: 0, approved: 0, rejected: 0, action: 0 };
        }
      });
    }

    supervisorScopedRecords.forEach((record) => {
      const name = ownerName(record);
      if (!name) return;

      if (!map[name]) {
        map[name] = {
          name,
          total: 0,
          approved: 0,
          rejected: 0,
          action: 0,
        };
      }

      map[name].total += 1;

      if (approved(record.status)) map[name].approved += 1;
      if (rejected(record.status)) map[name].rejected += 1;
      if (actionRequired(record.status)) map[name].action += 1;
    });

    return Object.values(map)
      .map((item: any) => ({
        ...item,
        rate: item.total
          ? Math.round((item.approved * 100) / item.total)
          : 0,
      }))
      .sort(
        (a: any, b: any) =>
          b.rate - a.rate || b.total - a.total
      );
  }, [supervisorScopedRecords, users, supervisorZone, supervisorWard]);

  const heatPageCount = Math.max(1, Math.ceil(heatRows.length / HEAT_PAGE_SIZE));
  const supervisorPageCount = Math.max(
    1,
    Math.ceil(supervisorPerformance.length / SUPERVISOR_PAGE_SIZE)
  );

  const visibleHeatRows = heatRows.slice(
    (heatPage - 1) * HEAT_PAGE_SIZE,
    heatPage * HEAT_PAGE_SIZE
  );

  const visibleSupervisorPerformance = supervisorPerformance.slice(
    (supervisorPage - 1) * SUPERVISOR_PAGE_SIZE,
    supervisorPage * SUPERVISOR_PAGE_SIZE
  );

  useEffect(() => {
    setHeatPage(1);
  }, [activeFromDate, activeToDate]);

  useEffect(() => {
    setSupervisorPage(1);
  }, [supervisorFromDate, supervisorToDate, supervisorZone, supervisorWard]);

  useEffect(() => {
    if (heatPage > heatPageCount) setHeatPage(heatPageCount);
  }, [heatPage, heatPageCount]);

  useEffect(() => {
    if (supervisorPage > supervisorPageCount) setSupervisorPage(supervisorPageCount);
  }, [supervisorPage, supervisorPageCount]);

  const workforce = useMemo(() => {
    const operationalUsers = users.filter((user) => {
      const roles = [user?.role, ...(user?.roles || [])].map(up);
      const active =
        user?.enabled !== false &&
        !["INACTIVE", "DISABLED", "BLOCKED"].includes(up(user?.status));

      return (
        active &&
        (roles.includes("SUPERVISOR") || roles.includes("EMPLOYEE"))
      );
    });

    const assignedIds = new Set<string>();

    const addId = (value: any) => {
      const id = norm(value);
      if (id) assignedIds.add(id);
    };

    beats.forEach((beat) => {
      addId(beat?.assignedToId);
      addId(beat?.supervisorId);
      addId(beat?.employeeAssignedToId);
      addId(beat?.employeeId);

      (beat?.segments || []).forEach((segment: any) => {
        addId(segment?.assignedToId);
        addId(segment?.employeeAssignedToId);
        addId(segment?.employee?.id);
      });
    });

    records.forEach((record) => {
      addId(record?.supervisorId);
      addId(record?.supervisor?.id);
      addId(record?.employeeId);
      addId(record?.employee?.id);
      addId(record?.submittedById);
      addId(record?.submittedBy?.id);
      addId(record?.createdById);
      addId(record?.createdBy?.id);
      addId(record?.userId);
      addId(record?.user?.id);

      (record?.assignedEmployeeIds || []).forEach(addId);
      (record?.assignedEmployees || []).forEach((person: any) => addId(person?.id));
    });

    // Module access is permission, not a work assignment.
    // Assigned/unassigned is therefore calculated only from actual live work links.
    const hasAssignment = (user: any) => assignedIds.has(norm(user?.id));

    const buildRole = (role: "SUPERVISOR" | "EMPLOYEE") => {
      const roleUsers = operationalUsers.filter((user) =>
        [user?.role, ...(user?.roles || [])].map(up).includes(role)
      );

      const assigned = roleUsers.filter(hasAssignment).length;
      const total = roleUsers.length;
      const available = Math.max(0, total - assigned);
      const allocation = total ? Math.round((assigned * 100) / total) : 0;

      return {
        total,
        assigned,
        available,
        allocation,
      };
    };

    return {
      supervisors: buildRole("SUPERVISOR"),
      employees: buildRole("EMPLOYEE"),
    };
  }, [users, beats, records]);

  const noActivityAlerts = useMemo(
    () => buildNoActivityAlerts(records, zones, wards, areas, today),
    [records, zones, wards, areas, today]
  );

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [
      {
        id: "user-registration",
        title: "User Registration Requests",
        message: "New personnel are waiting for City Admin review.",
        count: requestStats.userRegistrations,
        route: "/portal-home/registration-requests",
        color: "#2563eb", soft: "#eff6ff", border: "#bfdbfe", icon: <UserPlus size={16} />,
      },
      {
        id: "beat-registration",
        title: "Beat Registration Requests",
        message: "New beat requests are waiting for approval.",
        count: requestStats.beatRequests,
        route: "/city/beat-requests",
        color: "#0891b2", soft: "#ecfeff", border: "#a5f3fc", icon: <MapPin size={16} />,
      },
      {
        id: "toilet-registration",
        title: "Toilet Registration Requests",
        message: "New toilet points are waiting for review.",
        count: requestStats.toiletRequests,
        route: "/modules/toilet",
        color: "#3b82f6", soft: "#eff6ff", border: "#bfdbfe", icon: <Toilet size={16} />,
      },
      {
        id: "litterbin-registration",
        title: "Litter Bin Requests",
        message: "New litter bin points are waiting for review.",
        count: requestStats.litterBinRequests,
        route: "/modules/litterbins/admin",
        color: "#d97706", soft: "#fffbeb", border: "#fde68a", icon: <Trash2 size={16} />,
      },
      {
        id: "gvp-registration",
        title: "GVP / Feeder Point Requests",
        message: "New GVP points are waiting for City Admin review.",
        count: requestStats.gvpRequests,
        route: "/modules/taskforce/admin",
        color: "#7c3aed", soft: "#f5f3ff", border: "#ddd6fe", icon: <Truck size={16} />,
      },
    ];

    const reviewRoutes: Record<ModuleKey, string> = {
      SWEEPING: "/modules/sweeping",
      TOILET: "/modules/toilet/inspection",
      TWINBIN: "/modules/litterbins/admin",
      TASKFORCE: "/modules/taskforce/admin",
    };

    KEYS.forEach((key) => {
      const moduleRows = selected.filter((record) => record.__module === key);
      const actionCount = moduleRows.filter((record) => actionRequired(record.status)).length;
      const rejectedCount = moduleRows.filter((record) => rejected(record.status)).length;

      if (actionCount > 0) {
        items.push({
          id: `${key.toLowerCase()}-action-required`,
          title: `${MODULES[key].short} - Action Required`,
          message: "Today's reports need field action or review.",
          count: actionCount,
          route: reviewRoutes[key],
          color: "#ea580c", soft: "#fff7ed", border: "#fed7aa", icon: <AlertTriangle size={16} />,
        });
      }

      if (rejectedCount > 0) {
        items.push({
          id: `${key.toLowerCase()}-rejected`,
          title: `${MODULES[key].short} - Rejected Reports`,
          message: "Today's rejected reports are available for review.",
          count: rejectedCount,
          route: reviewRoutes[key],
          color: "#e11d48", soft: "#fff1f2", border: "#fecdd3", icon: <XCircle size={16} />,
        });
      }
    });

    if (noActivityAlerts.length > 0) {
      items.push({
        id: "no-activity-locations",
        title: "No Report Activity",
        message: "Zone, ward or area locations have not received reports for 1 to 3+ days.",
        count: noActivityAlerts.length,
        route: "/city",
        color: "#b45309", soft: "#fffbeb", border: "#fde68a", icon: <AlertTriangle size={16} />,
      });
    }

    return items.filter((item) => item.count > 0);
  }, [requestStats, selected, noActivityAlerts]);



  const headerNotificationCount = useMemo(
    () => notifications.reduce((sum, item) => sum + item.count, 0),
    [notifications]
  );

  const openNotificationCenter = () => {
    setNotificationOpen(true);
    window.requestAnimationFrame(() => {
      document
        .getElementById("city-notification-center")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  useEffect(() => {
    const handleOpenNotifications = () => {
      setNotificationOpen(true);
      window.setTimeout(() => {
        document
          .getElementById("city-notification-center")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    };

    window.addEventListener(
      "matrixtrack:open-city-notifications",
      handleOpenNotifications
    );

    return () => {
      window.removeEventListener(
        "matrixtrack:open-city-notifications",
        handleOpenNotifications
      );
    };
  }, []);

  useEffect(() => {
    const currentCounts = Object.fromEntries(
      notifications.map((item) => [item.id, item.count])
    );

    if (!notificationBaselineReadyRef.current) {
      previousNotificationCountsRef.current = currentCounts;
      notificationBaselineReadyRef.current = true;
      return;
    }

    const increases = notifications
      .map((item) => ({
        label: item.title,
        delta: Math.max(
          0,
          item.count - (previousNotificationCountsRef.current[item.id] || 0)
        ),
      }))
      .filter((item) => item.delta > 0);

    previousNotificationCountsRef.current = currentCounts;

    if (!increases.length) return;

    const addedCount = increases.reduce((sum, item) => sum + item.delta, 0);
    setNewNotificationNotice({
      count: addedCount,
      labels: increases.slice(0, 2).map((item) => item.label),
    });

    if (newNotificationTimerRef.current) {
      window.clearTimeout(newNotificationTimerRef.current);
    }

    newNotificationTimerRef.current = window.setTimeout(() => {
      setNewNotificationNotice(null);
      newNotificationTimerRef.current = null;
    }, 6500);

    return () => {
      if (newNotificationTimerRef.current) {
        window.clearTimeout(newNotificationTimerRef.current);
        newNotificationTimerRef.current = null;
      }
    };
  }, [notifications]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("matrixtrack:city-notifications", {
        detail: { count: headerNotificationCount },
      })
    );
  }, [headerNotificationCount]);

  const directoryRoleOptions = useMemo(
    () =>
      Array.from(
        new Set(users.flatMap((user) => getUserRoleLabels(user)))
      ).sort(),
    [users]
  );

  const directoryModuleOptions = useMemo(
    () =>
      Array.from(
        new Set(users.flatMap((user) => getUserModuleLabels(user)))
      ).sort(),
    [users]
  );

  const directoryStatusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((user) => getUserStatus(user))
            .filter(Boolean)
        )
      ).sort(),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const roles = getUserRoleLabels(user);
      const modules = getUserModuleLabels(user);
      const statusLabel = getUserStatus(user);

      const matchesSearch =
        !query ||
        norm(user.name).toLowerCase().includes(query) ||
        norm(user.email).toLowerCase().includes(query) ||
        norm(user.phone).toLowerCase().includes(query) ||
        roles.some((role) => role.toLowerCase().includes(query)) ||
        modules.some((module) => module.toLowerCase().includes(query));

      const matchesRole =
        directoryRole === "ALL" || roles.includes(directoryRole);

      const matchesModule =
        directoryModule === "ALL" || modules.includes(directoryModule);

      const matchesStatus =
        directoryStatus === "ALL" || statusLabel === directoryStatus;

      return (
        matchesSearch &&
        matchesRole &&
        matchesModule &&
        matchesStatus
      );
    });
  }, [
    users,
    search,
    directoryRole,
    directoryModule,
    directoryStatus,
  ]);

  const visibleDirectoryUsers = filteredUsers.slice(0, 10);


  const insightTopGeo: any = heat[0];

  const insightRiskGeo: any = [...heat].sort(
    (a: any, b: any) => b.exceptions - a.exceptions
  )[0];

  const insightBestModule = [...modulePerformance]
    .filter((item) => item.total > 0)
    .sort((a, b) => b.approval - a.approval)[0];

  const insightTopSupervisor: any = supervisorPerformance[0];

  const donut = [
    {
      name: "Approved",
      value: status.approved,
      color: "#10b981",
    },
    {
      name: "Rejected",
      value: status.rejected,
      color: "#f43f5e",
    },
    {
      name: "Pending",
      value: status.pending,
      color: "#f59e0b",
    },
    {
      name: "Action Required",
      value: status.actionRequired,
      color: "#f97316",
    },
  ];

  async function downloadPdf() {
    if (!reportRef.current) return;

    setPdfBusy(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(reportRef.current, {
        scale: 1.25,
        useCORS: true,
        backgroundColor: "#f8fafc",
      });

      const image = canvas.toDataURL("image/jpeg", 0.9);

      const pdf = new jsPDF("p", "mm", "a4");
      const width = 190;
      const height = (canvas.height * width) / canvas.width;
      const pageHeight = 277;

      let remainingHeight = height;
      let position = 10;

      pdf.addImage(image, "JPEG", 10, position, width, height);
      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(image, "JPEG", 10, position, width, height);
        remainingHeight -= pageHeight;
      }

      pdf.save(`City_Admin_Dashboard_${today}.pdf`);
    } catch (error) {
      console.error("PDF download failed, opening print fallback:", error);
      window.print();
    } finally {
      setPdfBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Activity className="animate-spin text-blue-600" size={28} />
          <span className="text-xs font-bold text-slate-500">
            Loading city analytics...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={reportRef}
      className="space-y-5 pb-12 max-w-[1500px] mx-auto"
    >
      {newNotificationNotice && (
        <div className="fixed left-1/2 top-1/2 z-[100] w-[min(92vw,390px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-blue-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
          <div className="flex items-start gap-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Bell size={17} />
              <span className="absolute -right-2 -top-2 min-w-5 h-5 rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-black flex items-center justify-center">
                {newNotificationNotice.count > 99
                  ? "99+"
                  : newNotificationNotice.count}
              </span>
            </span>

            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-black text-slate-900">
                New notification received
              </div>
              <div className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">
                {newNotificationNotice.labels.join(" • ")}
                {newNotificationNotice.count > newNotificationNotice.labels.length
                  ? ` • +${
                      newNotificationNotice.count -
                      newNotificationNotice.labels.length
                    } more`
                  : ""}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewNotificationNotice(null);
                    openNotificationCenter();
                  }}
                  className="h-8 rounded-lg bg-blue-600 px-3 text-[9px] font-black text-white hover:bg-blue-700"
                >
                  View notifications
                </button>
                <button
                  type="button"
                  onClick={() => setNewNotificationNotice(null)}
                  className="h-8 rounded-lg border border-slate-200 px-3 text-[9px] font-black text-slate-500 hover:bg-slate-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CITY SNAPSHOT - compact home overview */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
              City Snapshot
            </h2>
            <p className="mt-0.5 text-[9px] font-semibold text-slate-400">
              Overall city totals and today&apos;s report status across all inspection modules
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3">
              <Filter size={12} className="text-blue-600" />
              <div className="leading-none">
                <div className="text-[7px] font-black uppercase tracking-wide text-blue-500">Report Scope</div>
                <div className="mt-1 text-[10px] font-black text-slate-700">Today • {reportScopeLabel}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadAll(false);
                void loadSupervisorPerformanceData(true);
                void loadModulePerformanceData(true);
              }}
              className="h-9 rounded-xl border border-slate-200 px-3 text-[10px] font-extrabold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 transition"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={downloadPdf}
              className="h-9 rounded-xl bg-blue-600 px-3 text-[10px] font-extrabold text-white flex items-center gap-1.5 hover:bg-blue-700 transition shadow-sm"
            >
              <Download size={12} />
              {pdfBusy ? "Preparing..." : "Download PDF"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { key: "zones" as SnapshotDetailKey, label: "Total Zones", value: zones.length, icon: <MapPin size={16} />, tone: "text-blue-600", bubble: "bg-blue-100/80", card: "bg-blue-50/55 border-blue-100" },
            { key: "wards" as SnapshotDetailKey, label: "Total Wards", value: wards.length, icon: <Layers3 size={16} />, tone: "text-violet-600", bubble: "bg-violet-100/80", card: "bg-violet-50/45 border-violet-100" },
            { key: "beats" as SnapshotDetailKey, label: "Total Beats", value: beats.length, icon: <Activity size={16} />, tone: "text-cyan-600", bubble: "bg-cyan-100/80", card: "bg-cyan-50/45 border-cyan-100" },
            { key: "submitted" as SnapshotDetailKey, label: "Submitted Reports", value: snapshotReportStats.submitted, icon: <Activity size={16} />, tone: "text-sky-700", bubble: "bg-sky-100/80", card: "bg-sky-50/50 border-sky-100" },
            { key: "pending" as SnapshotDetailKey, label: "Pending Reports", value: snapshotReportStats.pending, icon: <RefreshCw size={16} />, tone: "text-amber-600", bubble: "bg-amber-100/80", card: "bg-amber-50/45 border-amber-100" },
            { key: "accepted" as SnapshotDetailKey, label: "Accepted Reports", value: snapshotReportStats.accepted, icon: <CheckCircle2 size={16} />, tone: "text-emerald-600", bubble: "bg-emerald-100/80", card: "bg-emerald-50/45 border-emerald-100" },
            { key: "rejected" as SnapshotDetailKey, label: "Rejected Reports", value: snapshotReportStats.rejected, icon: <XCircle size={16} />, tone: "text-rose-600", bubble: "bg-rose-100/80", card: "bg-rose-50/45 border-rose-100" },
            { key: "actionRequired" as SnapshotDetailKey, label: "Action Required", value: snapshotReportStats.actionRequired, icon: <AlertTriangle size={16} />, tone: "text-orange-600", bubble: "bg-orange-100/80", card: "bg-orange-50/45 border-orange-100" },
            { key: "resolved" as SnapshotDetailKey, label: "Resolved Reports", value: snapshotReportStats.resolved, icon: <ShieldCheck size={16} />, tone: "text-teal-600", bubble: "bg-teal-100/80", card: "bg-teal-50/45 border-teal-100" },
            { key: "supervisors" as SnapshotDetailKey, label: "Total Supervisors", value: snapshotSupervisors.length, icon: <Users size={16} />, tone: "text-indigo-600", bubble: "bg-indigo-100/80", card: "bg-indigo-50/45 border-indigo-100" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSnapshotDetail(item.key)}
              className={`group min-h-[76px] rounded-xl border px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md ${item.card}`}
            >
              <div className="flex h-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.bubble} ${item.tone}`}>
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[9px] font-black uppercase tracking-[0.04em] text-slate-600">{item.label}</div>
                    <div className="mt-1 text-[10px] font-semibold text-slate-400">View details</div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-[20px] font-black leading-none text-slate-900">{item.value}</div>
                  <ArrowRight size={13} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {snapshotDetailData &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/15 p-2 sm:p-4"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setSnapshotDetail(null);
            }}
          >
            <div className="flex w-[min(94vw,760px)] max-h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
                <div className="min-w-0">
                  <div className="text-[8px] font-black uppercase tracking-[0.16em] text-blue-600">Dashboard Detail</div>
                  <h3 className="mt-1 truncate text-sm font-black text-slate-900 sm:text-base">{snapshotDetailData.title}</h3>
                  <p className="mt-1 text-[9px] font-semibold text-slate-400 sm:text-[10px]">{snapshotDetailData.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSnapshotDetail(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label="Close detail"
                >
                  ×
                </button>
              </div>

              <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5 sm:py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-xl border border-blue-100 bg-white px-3 text-base font-black text-blue-600 sm:h-10 sm:min-w-10 sm:text-lg">
                    {snapshotDetailData.count}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[10px] font-black text-slate-800 sm:text-[11px]">{snapshotDetailData.title}</div>
                    <div className="mt-0.5 text-[8px] font-semibold text-slate-400 sm:text-[9px]">
                      Live dashboard detail from the current city scope
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
                {snapshotDetailData.rows.length === 0 ? (
                  <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center sm:min-h-[150px]">
                    <div>
                      <div className="text-[11px] font-black text-slate-600">No records available</div>
                      <div className="mt-1 text-[9px] font-semibold text-slate-400">
                        There is no matching data in the current scope.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {snapshotDetailData.rows.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:gap-3 sm:py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] font-black text-slate-900">{row.title}</div>
                          <div className="mt-1 text-[9px] font-semibold text-slate-500">{row.meta}</div>
                          {row.secondary && (
                            <div className="mt-0.5 text-[8px] font-semibold text-slate-400">{row.secondary}</div>
                          )}
                        </div>

                        {row.badge && (
                          <span className="hidden shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-black uppercase text-slate-600 sm:inline-flex">
                            {row.badge}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSnapshotDetail(null);
                            router.push(row.route);
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition hover:bg-blue-100"
                          title="Open related screen"
                          aria-label={`Open ${row.title}`}
                        >
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5 sm:py-3">
                <span className="text-[8px] font-semibold text-slate-400 sm:text-[9px]">
                  {snapshotDetailData.rows.length} item{snapshotDetailData.rows.length === 1 ? "" : "s"} shown
                </span>
                <button
                  type="button"
                  onClick={() => setSnapshotDetail(null)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-black text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}


      {/* CITY NOTIFICATION CENTER */}
      <section
        id="city-notification-center"
        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden scroll-mt-24"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-white to-violet-50/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Bell size={18} />

              {headerNotificationCount > 0 && (
                <span className="absolute -right-2 -top-2 min-w-5 h-5 rounded-full bg-rose-500 px-1.5 text-[9px] font-black text-white flex items-center justify-center border-2 border-white">
                  {headerNotificationCount > 99 ? "99+" : headerNotificationCount}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black text-slate-900">
                  City Notification Center
                </h2>

                {headerNotificationCount > 0 ? (
                  <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[9px] font-black uppercase text-rose-600">
                    {headerNotificationCount} pending
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600">
                    Up to date
                  </span>
                )}
              </div>

              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                Registration requests and report alerts that currently need attention. Auto-refreshes every 60 seconds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notificationUpdatedAt && (
              <span className="hidden sm:inline text-[9px] font-bold text-slate-400">
                Updated{" "}
                {notificationUpdatedAt.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            )}

            <button
              type="button"
              onClick={() => loadNotificationData()}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 transition"
            >
              <RefreshCw size={12} />
              Check Now
            </button>

            <button
              type="button"
              onClick={() => setNotificationOpen((open) => !open)}
              className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition"
              aria-label={notificationOpen ? "Hide notifications" : "Show notifications"}
            >
              {notificationOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {notificationOpen && (
          <div className="p-4 lg:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  New & Pending Notifications
                </h3>
                <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                  Includes registration requests, report issues and locations with no recent report activity.
                </p>
              </div>

              <span className="text-[9px] font-black text-slate-400">
                {notifications.length} alert type{notifications.length === 1 ? "" : "s"}
              </span>
            </div>

            {notifications.length === 0 ? (
              <div className="min-h-[145px] rounded-2xl border border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-blue-50/60 px-6 py-6 flex items-center justify-center text-center">
                <div className="max-w-md">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 border border-emerald-100 shadow-sm">
                    <CheckCircle2 size={19} />
                  </span>
                  <div className="mt-3 text-[12px] font-black text-slate-800">
                    No notifications need attention
                  </div>
                  <div className="mt-1 text-[9px] font-semibold leading-4 text-slate-500">
                    Registration queues are clear, there are no report issues, and all monitored locations have recent activity.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => router.push(item.route)}
                      className="group w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                      style={{ background: item.soft, borderColor: item.border }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border"
                          style={{ color: item.color, borderColor: item.border }}
                        >
                          {item.icon}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-[11px] font-black text-slate-800" title={item.title}>
                              {item.title}
                            </div>
                            <span
                              className="min-w-7 h-6 rounded-lg px-2 flex items-center justify-center text-[10px] font-black text-white"
                              style={{ background: item.color }}
                            >
                              {item.count}
                            </span>
                          </div>

                          <div className="mt-1 text-[9px] leading-4 font-semibold text-slate-500">
                            {item.message}
                          </div>

                          <div
                            className="mt-2 inline-flex items-center gap-1 text-[9px] font-black uppercase"
                            style={{ color: item.color }}
                          >
                            Review
                            <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {noActivityAlerts.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40">
                    <div className="flex items-center justify-between gap-3 border-b border-amber-100 px-3 py-2">
                      <div>
                        <div className="text-[10px] font-black text-amber-900">No report activity by location</div>
                        <div className="text-[9px] font-semibold text-amber-700/70">Only the highest inactive level is shown to avoid repeating the same zone, ward and area.</div>
                      </div>
                      <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-amber-700 border border-amber-200">{noActivityAlerts.length}</span>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto divide-y divide-amber-100">
                      {noActivityAlerts.map((alert) => (
                        <button
                          key={alert.id}
                          type="button"
                          onClick={() => router.push("/city")}
                          className="w-full px-3 py-2.5 text-left hover:bg-amber-50 transition flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-[10px] font-black text-slate-800">{alert.name}</div>
                            <div className="mt-0.5 text-[9px] font-semibold text-slate-500">
                              {[alert.zone, alert.ward, alert.area].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(" • ")}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-[9px] font-black text-amber-700">No report for {inactivityLabel(alert.daysInactive)}</div>
                            <div className="mt-0.5 text-[8px] font-semibold text-slate-400">{alert.lastActivityDate ? `Last: ${new Date(`${alert.lastActivityDate}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : "No report in last 7 days"}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-[9px] font-semibold text-emerald-700">
                  <CheckCircle2 size={13} className="shrink-0" />
                  Notification types not shown above are currently clear.
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* WORKFORCE ALLOCATION - SEPARATE SECTION */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
              <Users size={16} />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Workforce Allocation
              </h3>
              <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                Current supervisor and employee work assignments
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/portal-home/registered-users")}
            className="text-[9px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View workforce
            <ArrowRight size={11} />
          </button>
        </div>

        <div className="p-4 lg:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <WorkforceRoleCard
              title="Supervisors"
              total={workforce.supervisors.total}
              assigned={workforce.supervisors.assigned}
              unassigned={workforce.supervisors.available}
              allocation={workforce.supervisors.allocation}
              color="#7c3aed"
              soft="#f5f3ff"
            />

            <WorkforceRoleCard
              title="Employees"
              total={workforce.employees.total}
              assigned={workforce.employees.assigned}
              unassigned={workforce.employees.available}
              allocation={workforce.employees.allocation}
              color="#2563eb"
              soft="#eff6ff"
            />
          </div>

          {(workforce.supervisors.available > 0 || workforce.employees.available > 0) && (
            <button
              type="button"
              onClick={() => router.push("/portal-home/registered-users")}
              className="mt-3 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left hover:bg-amber-100/70 transition"
            >
              <div className="flex items-center gap-2 text-[10px] font-black text-amber-800">
                <AlertTriangle size={13} />
                Unassigned workforce
              </div>
              <div className="text-[9px] font-semibold text-amber-600 mt-1 pl-5">
                {workforce.supervisors.available} supervisor(s) and{" "}
                {workforce.employees.available} employee(s) are currently unassigned from active work.
              </div>
            </button>
          )}
        </div>
      </section>

      {/* MAIN CHARTS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Inspection Trend gets the width of two chart containers */}
        <div className="lg:col-span-2">
          <Card
            title="Inspection Trend"
            sub={`Daily submitted reports by module • Last 7 days (${new Date(`${trendFromDate}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} - ${new Date(`${today}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })})`}
            height="h-[410px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ top: 10, right: 20, left: 28, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#eef2f7"
                />

                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                />

                <YAxis
                  width={52}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  label={{
                    value: "No. of Reports",
                    angle: -90,
                    position: "insideLeft",
                    offset: 5,
                    style: {
                      fill: "#64748b",
                      fontSize: 11,
                      fontWeight: 800,
                    },
                  }}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                    fontSize: "11px",
                  }}
                />

                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{
                    fontSize: "10px",
                    fontWeight: 700,
                    paddingTop: "8px",
                  }}
                />

                {KEYS.filter(
                  (key) => subModule === "ALL" || key === subModule
                ).map((key) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={MODULES[key].short}
                    stroke={MODULES[key].color}
                    fill={MODULES[key].soft}
                    strokeWidth={3}
                    dot={{
                      r: 3,
                      fill: MODULES[key].color,
                      strokeWidth: 0,
                    }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Status stays beside the enlarged trend */}
        <Card
          title="Status Distribution"
          sub={`${status.total} reports • Today (${reportScopeLabel})`}
          height="h-[390px]"
        >
          <div className="flex h-full items-center">
            <div className="relative h-full w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donut}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={76}
                    stroke="none"
                  >
                    {donut.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <b className="text-2xl">{status.total}</b>
                <span className="text-[9px] text-slate-400">TOTAL</span>
              </div>
            </div>

            <div className="w-1/2 space-y-3 pl-3">
              {donut.map((item) => (
                <div
                  key={item.name}
                  className="flex justify-between gap-3 text-[10px] font-bold"
                >
                  <span className="flex gap-2 items-center">
                    <i
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: item.color }}
                    />
                    {item.name}
                  </span>

                  <b>{item.value}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* Module Performance moved below so the large trend stays clean */}
      <section>
        <Card
          title="Module Performance"
          sub="Approval percentage by module for the selected month, zone and ward"
          height="h-[340px]"
        >
          <div className="flex h-full flex-col">
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-[7px] font-black uppercase tracking-wide text-slate-400">Month</span>
                <select
                  value={moduleMonthOffset}
                  onChange={(event) => setModuleMonthOffset(Number(event.target.value))}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[9px] font-bold text-slate-600 outline-none focus:border-blue-400"
                >
                  {monthPresets.map((preset) => (
                    <option key={preset.offset} value={preset.offset}>{preset.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-[7px] font-black uppercase tracking-wide text-slate-400">Zone</span>
                <select
                  value={moduleZone}
                  onChange={(event) => { setModuleZone(event.target.value); setModuleWard("ALL"); }}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[9px] font-bold text-slate-600 outline-none focus:border-blue-400"
                >
                  <option value="ALL">All Zones</option>
                  {zones.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-[7px] font-black uppercase tracking-wide text-slate-400">Ward</span>
                <select
                  value={moduleWard}
                  onChange={(event) => setModuleWard(event.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[9px] font-bold text-slate-600 outline-none focus:border-blue-400"
                >
                  <option value="ALL">All Wards</option>
                  {moduleVisibleWards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            </div>
            {modulePerformanceLoading && <div className="mb-1 text-right text-[8px] font-bold text-blue-500">Updating live data...</div>}
            {modulePerformance.every((item) => item.total === 0) && (
              <div className="mb-1 text-center text-[9px] font-bold text-slate-400">
                No reports for this month / zone / ward — each module is shown at 0%.
              </div>
            )}
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={modulePerformance}
                  margin={{ top: 24, right: 20, left: 24, bottom: 28 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#eef2f7"
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    label={{
                      value: "Sub Module",
                      position: "insideBottom",
                      offset: -14,
                      style: { fill: "#64748b", fontSize: 9, fontWeight: 800 },
                    }}
                  />

                  <YAxis
                    domain={[0, 100]}
                    width={52}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    label={{
                      value: "Approval Rate (%)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 2,
                      style: { fill: "#64748b", fontSize: 9, fontWeight: 800 },
                    }}
                  />

                  <Tooltip
                    formatter={(value: any, _name: any, entry: any) => [
                      `${value}% (${entry?.payload?.total || 0} reports)`,
                      "Approval Rate",
                    ]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                      fontSize: "11px",
                    }}
                  />

                  <Bar
                    dataKey="approval"
                    name="Approval Rate"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={70}
                    minPointSize={2}
                  >
                    {modulePerformance.map((item) => (
                      <Cell key={item.key} fill={MODULES[item.key].color} />
                    ))}
                    <LabelList
                      dataKey="approval"
                      position="top"
                      formatter={(value: any) => `${Number(value || 0)}%`}
                      style={{ fill: "#64748b", fontSize: 10, fontWeight: 800 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </section>

      

      {/* ADAPTIVE HEAT MAP + SUPERVISOR RANKING */}
      <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] items-stretch gap-5">
        <div className="h-[530px] rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <Head
            title={`${heatLevelLabel} Activity Heat Map`}
            sub={`Today's report count by ${heatLevelLabel.toLowerCase()} and module • ${reportScopeLabel}`}
            icon={<Layers3 size={17} />}
          />

          <div className="overflow-x-auto p-4 flex-1 flex flex-col">
              <div className="min-w-[560px] w-full">
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[8px] font-bold text-slate-500">
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded bg-emerald-500" />Sweeping</span>
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded bg-blue-500" />Toilets</span>
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded bg-amber-500" />Litter Bins</span>
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded bg-violet-500" />GVP</span>
                  <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded bg-rose-500" />Needs Attention</span>
                </div>

                <div className="space-y-2">
                <div className="grid grid-cols-[118px_repeat(4,minmax(64px,1fr))_96px] gap-1.5 text-[8px] font-black uppercase text-slate-400 mb-2">
                  <div>{heatLevelLabel}</div>
                  <div className="text-center">Sweeping</div>
                  <div className="text-center">Toilets</div>
                  <div className="text-center">Litter Bins</div>
                  <div className="text-center">GVP</div>
                  <div className="text-center">Needs Attention</div>
                </div>

                {visibleHeatRows.map((row: any) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[118px_repeat(4,minmax(64px,1fr))_96px] gap-1.5"
                  >
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                      <div className="font-black text-[11px] text-slate-800">
                        {row.name}
                      </div>

                      <div className="text-[9px] text-slate-400">
                        {row.total} total
                      </div>
                    </div>

                    {KEYS.map((key) => {
                      const value = row.modules[key];
                      const ratio = value / maxHeat;

                      return (
                        <div
                          key={key}
                          title={`${row.name}: ${value} ${MODULES[key].short} report${value === 1 ? "" : "s"}`}
                          className="rounded-xl border border-slate-100 flex items-center justify-center font-black text-sm transition"
                          style={{
                            background: value
                              ? ratio > 0.7
                                ? MODULES[key].color
                                : MODULES[key].soft
                              : "#f8fafc",
                            color:
                              value && ratio > 0.7
                                ? "#fff"
                                : value
                                  ? MODULES[key].color
                                  : "#94a3b8",
                          }}
                        >
                          {value}
                        </div>
                      );
                    })}

                    <div
                      title={`${row.name}: ${row.exceptions} report${row.exceptions === 1 ? "" : "s"} need attention`}
                      className={`rounded-xl flex items-center justify-center font-black text-xs border ${
                        row.exceptions
                          ? "bg-rose-50 text-rose-600 border-rose-200"
                          : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      }`}
                    >
                      {row.exceptions}
                    </div>
                  </div>
                ))}
                </div>
              </div>

              <div className="mt-auto pt-3">
                <div className="min-w-[560px] border-t border-slate-100 pt-2 text-[8px] font-semibold text-slate-400">
                  Showing {visibleHeatRows.length} of {heatRows.length} registered {heatLevelLabel.toLowerCase()}{heatRows.length === 1 ? "" : "s"}. Each number is the report count; red shows rejected or action-required reports.
                </div>
              </div>

              {heatPageCount > 1 && (
                <Pager
                  page={heatPage}
                  pages={heatPageCount}
                  onPrev={() => setHeatPage((page) => Math.max(1, page - 1))}
                  onNext={() => setHeatPage((page) => Math.min(heatPageCount, page + 1))}
                  label={`${heatLevelLabel}s`}
                />
              )}
          </div>
        </div>

        <div className="h-[530px] rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <Head
            title="Supervisor Performance"
            sub="Supervisor report results for the selected month, zone and ward"
            icon={<Trophy size={17} />}
          />

          <div className="border-b border-slate-100 bg-white px-4 py-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-[7px] font-black uppercase tracking-wide text-slate-400">Month</span>
                <select
                  value={supervisorMonthOffset}
                  onChange={(event) => {
                    const offset = Number(event.target.value);
                    const preset = monthPreset(today, offset);
                    setSupervisorMonthOffset(offset);
                    setSupervisorFromDate(preset.from);
                    setSupervisorToDate(preset.to);
                    setSupervisorPage(1);
                  }}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[9px] font-bold text-slate-600 outline-none focus:border-blue-400"
                >
                  {monthPresets.map((preset) => (
                    <option key={preset.offset} value={preset.offset}>{preset.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[7px] font-black uppercase tracking-wide text-slate-400">Zone</span>
                <select
                  value={supervisorZone}
                  onChange={(event) => {
                    setSupervisorZone(event.target.value);
                    setSupervisorWard("ALL");
                    setSupervisorPage(1);
                  }}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[9px] font-bold text-slate-600 outline-none focus:border-blue-400"
                >
                  <option value="ALL">All Zones</option>
                  {zones.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-[7px] font-black uppercase tracking-wide text-slate-400">Ward</span>
                <select
                  value={supervisorWard}
                  onChange={(event) => {
                    setSupervisorWard(event.target.value);
                    setSupervisorPage(1);
                  }}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[9px] font-bold text-slate-600 outline-none focus:border-blue-400"
                >
                  <option value="ALL">All Wards</option>
                  {supervisorVisibleWards.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-2 text-[8px] font-semibold text-slate-400">
              <span>Showing: {supervisorPeriodLabel}</span>
              {supervisorPerformanceLoading && <span className="text-blue-500">Updating live data...</span>}
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col min-h-0">
              <div className="grid grid-cols-[1fr_auto] gap-3 px-1 pb-2 text-[8px] font-black uppercase tracking-wider text-slate-400">
                <span>Supervisor</span>
                <span>Approval</span>
              </div>
              <div className="space-y-1.5 flex-1 min-h-0 overflow-hidden">
              {supervisorPerformance.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
                  <div className="text-[11px] font-black text-slate-600">No supervisors found</div>
                  <div className="mt-1 text-[9px] font-semibold text-slate-400">Reports 0 • Approved 0 • Rejected 0 • Action Required 0</div>
                </div>
              ) : (
              visibleSupervisorPerformance.map((item: any, index) => {
                const rank = (supervisorPage - 1) * SUPERVISOR_PAGE_SIZE + index;
                return (
                <div
                  key={`${item.name}-${index}`}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-black text-slate-800">
                        {rank < 3
                          ? ["🥇", "🥈", "🥉"][rank]
                          : `#${rank + 1}`}{" "}
                        {item.name}
                      </div>

                      <div className="text-[9px] text-slate-400 mt-1">
                        Reports {item.total} • Approved {item.approved} • Rejected {item.rejected} • Needs attention {item.action}
                      </div>
                    </div>

                    <span className="text-[10px] font-black bg-blue-50 text-blue-700 rounded-lg px-2 py-1 h-fit">
                      {item.rate}%
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-slate-200 mt-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              );
              })
            )}
              </div>

            <div className="shrink-0 pt-2">
            {supervisorPageCount > 1 ? (
              <Pager
                page={supervisorPage}
                pages={supervisorPageCount}
                onPrev={() => setSupervisorPage((page) => Math.max(1, page - 1))}
                onNext={() =>
                  setSupervisorPage((page) => Math.min(supervisorPageCount, page + 1))
                }
                label="Supervisors"
              />
            ) : (
              <div className="border-t border-slate-100 pt-2 text-[8px] font-semibold text-slate-400">
                Showing {supervisorPerformance.length} supervisor{supervisorPerformance.length === 1 ? "" : "s"}. Approval % = approved reports divided by total reports.
              </div>
            )}
            </div>
          </div>
        </div>
      </section>

      {/* EXTRA CITY INSIGHTS */}
      

      {/* PLATFORM USER DIRECTORY - 10 ROW PREVIEW */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 p-5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-600" />

                <h3 className="text-sm font-black text-slate-800">
                  Platform User Directory
                </h3>

                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700">
                  {filteredUsers.length}
                </span>
              </div>

              <p className="text-[10px] uppercase text-slate-400 font-bold mt-1">
                Cross-system access and role breakdown
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[210px] flex-1 xl:flex-none">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search personnel..."
                  className="h-9 w-full xl:w-60 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[10px] font-bold outline-none focus:border-blue-400"
                />
              </div>

              <select
                value={directoryRole}
                onChange={(event) => setDirectoryRole(event.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 outline-none"
              >
                <option value="ALL">All Roles</option>

                {directoryRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              <select
                value={directoryModule}
                onChange={(event) => setDirectoryModule(event.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 outline-none"
              >
                <option value="ALL">All Modules</option>

                {directoryModuleOptions.map((module) => (
                  <option key={module} value={module}>
                    {prettyModuleName(module)}
                  </option>
                ))}
              </select>

              <select
                value={directoryStatus}
                onChange={(event) => setDirectoryStatus(event.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 outline-none"
              >
                <option value="ALL">All Status</option>

                {directoryStatusOptions.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {statusValue}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => router.push("/portal-home/registered-users")}
                className="h-9 rounded-xl bg-blue-600 px-3.5 text-[10px] font-black text-white flex items-center gap-1.5 hover:bg-blue-700 transition shadow-sm"
              >
                View All Users
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] font-bold text-slate-400">
            <span>
              Showing {Math.min(10, filteredUsers.length)} of {filteredUsers.length} matching user
              {filteredUsers.length === 1 ? "" : "s"}
            </span>

            {(search ||
              directoryRole !== "ALL" ||
              directoryModule !== "ALL" ||
              directoryStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDirectoryRole("ALL");
                  setDirectoryModule("ALL");
                  setDirectoryStatus("ALL");
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear directory filters
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4">Personnel</th>
                <th className="p-4">System Roles</th>
                <th className="p-4">Active Modules</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleDirectoryUsers.map((user, index) => {
                const roles = getUserRoleLabels(user);
                const modules = getUserModuleLabels(user);
                const statusValue = getUserStatus(user);

                return (
                  <tr
                    key={user.id || user.email || index}
                    className="hover:bg-slate-50 transition"
                  >
                    <td className="p-4">
                      <div className="font-black text-[11px] text-slate-900">
                        {user.name || "Unnamed Personnel"}
                      </div>

                      <div className="mt-1 text-[9px] font-semibold text-slate-400">
                        {user.email || user.phone || "-"}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {roles.length ? (
                          roles.map((role) => (
                            <span
                              key={role}
                              className="rounded-md border border-violet-100 bg-violet-50 px-2 py-0.5 text-[8px] font-black text-violet-700"
                            >
                              {role.replace(/_/g, " ")}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-400">
                            No role assigned
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {modules.length ? (
                          modules.slice(0, 5).map((module) => (
                            <span
                              key={module}
                              className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[8px] font-black text-blue-700"
                            >
                              {prettyModuleName(module)}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-400">
                            No specific module
                          </span>
                        )}

                        {modules.length > 5 && (
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-black text-slate-500">
                            +{modules.length - 5}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <span
                        className={`rounded-md border px-2 py-1 text-[8px] font-black ${
                          statusValue === "ACTIVE"
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {statusValue}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {visibleDirectoryUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-14 text-center text-[10px] font-bold text-slate-400"
                  >
                    No personnel records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length > 10 && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-[9px] font-bold text-slate-400">
              Preview is limited to 10 users for a cleaner dashboard.
            </span>

            <button
              type="button"
              onClick={() => router.push("/portal-home/registered-users")}
              className="text-[9px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Open full directory
              <ArrowRight size={11} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function getUserRoleLabels(user: any): string[] {
  const raw = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    user?.role,
    user?.systemRole,
    user?.primaryRole,
  ];

  return Array.from(
    new Set(
      raw
        .map((item: any) =>
          norm(
            typeof item === "string"
              ? item
              : item?.key ?? item?.name ?? item?.role ?? item?.code
          )
        )
        .filter(Boolean)
        .map(up)
    )
  );
}

function getUserModuleLabels(user: any): string[] {
  const raw = [
    ...(Array.isArray(user?.modules) ? user.modules : []),
    ...(Array.isArray(user?.assignedModules) ? user.assignedModules : []),
    ...(Array.isArray(user?.workspaceModules) ? user.workspaceModules : []),
    ...(Array.isArray(user?.moduleAccess) ? user.moduleAccess : []),
    ...(Array.isArray(user?.access?.modules) ? user.access.modules : []),
  ];

  const values = raw
    .map((item: any) =>
      norm(
        typeof item === "string"
          ? item
          : item?.module?.key ??
              item?.module?.name ??
              item?.moduleKey ??
              item?.moduleName ??
              item?.key ??
              item?.name ??
              item?.code
      )
    )
    .filter(Boolean)
    .map(up);

  return Array.from(new Set(values));
}

function getUserStatus(user: any): string {
  if (user?.enabled === false) return "INACTIVE";

  const status = up(user?.status || user?.accountStatus || "ACTIVE");

  if (["DISABLED", "BLOCKED", "INACTIVE"].includes(status)) {
    return "INACTIVE";
  }

  return status || "ACTIVE";
}

function prettyModuleName(value: string): string {
  const key = up(value);

  const names: Record<string, string> = {
    TASKFORCE: "Inspection & Performance",
    INSPECTION_AND_PERFORMANCE: "Inspection & Performance",
    SWEEPING: "Sweeping",
    TOILET: "Cleanliness of Toilets",
    CLEANLINESS_OF_TOILET: "Cleanliness of Toilets",
    TWINBIN: "Litter Bins",
    LITTERBIN: "Litter Bins",
    LITTER_BINS: "Litter Bins",
    GVP: "GVP",
    WARD_RANKING: "Ward Ranking",
    SWACHH_RANKING: "Ward Ranking",
    WORKFORCE_ATTENDANCE: "Workforce Attendance",
    ATTENDANCE: "Workforce Attendance",
  };

  return (
    names[key] ||
    value
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function WorkforceRoleCard({
  title,
  total,
  assigned,
  unassigned,
  allocation,
  color,
  soft,
}: {
  title: string;
  total: number;
  assigned: number;
  unassigned: number;
  allocation: number;
  color: string;
  soft: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase text-slate-400">
            {title}
          </div>

          <div className="text-2xl font-black text-slate-900 mt-1">
            {total}
          </div>

          <div className="text-[8px] font-black uppercase text-slate-400 mt-0.5">
            Total {title}
          </div>
        </div>

        <div className="text-right">
          <div
            className="text-xl font-black"
            style={{ color }}
          >
            {allocation}%
          </div>

          <div className="text-[8px] font-black uppercase text-slate-400">
            Assigned
          </div>
        </div>
      </div>

      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-3">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${allocation}%`,
            background: color,
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div
          className="rounded-xl border border-slate-100 p-2.5"
          style={{ background: soft }}
        >
          <div
            className="text-base font-black"
            style={{ color }}
          >
            {assigned}
          </div>

          <div className="mt-0.5 text-[8px] font-black uppercase text-slate-400">
            Assigned
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50 p-2.5">
          <div className="text-base font-black text-amber-600">
            {unassigned}
          </div>

          <div className="mt-0.5 text-[8px] font-black uppercase text-slate-400">
            Unassigned
          </div>
        </div>
      </div>
    </div>
  );
}

function Pager({
  page,
  pages,
  onPrev,
  onNext,
  label,
}: {
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
  label: string;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-2">
      <span className="text-[9px] font-bold text-slate-400">
        {label} • Page {page} of {pages}
      </span>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={page === 1}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page === pages}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[9px] font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="block mb-1.5 text-[9px] font-black uppercase text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-[11px] font-bold outline-none focus:border-blue-400"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={13}
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
      />
    </div>
  );
}



function Card({
  title,
  sub,
  children,
  height = "h-[330px]",
  action,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  height?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`${height} rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-black uppercase text-slate-800">
            {title}
          </h3>

          <p className="text-[10px] text-slate-400 mt-1">
            {sub}
          </p>
        </div>

        {action}
      </div>

      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function Insight({
  icon,
  label,
  title,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex gap-3">
      <span className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        {icon}
      </span>

      <div className="min-w-0">
        <div className="text-[8px] font-black uppercase text-slate-400">
          {label}
        </div>

        <div className="text-sm font-black text-slate-900 mt-1 truncate">
          {title}
        </div>

        <div className="text-[11px] font-black text-blue-600 mt-1">
          {value}
        </div>
      </div>
    </div>
  );
}

function Head({
  title,
  sub,
  icon,
}: {
  title: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
      <span className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
        {icon}
      </span>

      <div>
        <h3 className="text-xs font-black uppercase text-slate-800">
          {title}
        </h3>

        <p className="text-[10px] text-slate-400 mt-0.5">
          {sub}
        </p>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="min-h-[150px] flex items-center justify-center text-[11px] font-bold text-slate-400">
      No data for selected filters.
    </div>
  );
}

function Small({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
      <div className="text-[8px] font-black uppercase text-slate-400">
        {label}
      </div>

      <div className="text-xl font-black mt-1">{value}</div>
    </div>
  );
}

function Read({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 flex gap-3">
      <span className="min-w-[70px] text-[9px] font-black uppercase text-blue-600">
        {label}
      </span>

      <span>{value}</span>
    </div>
  );
}