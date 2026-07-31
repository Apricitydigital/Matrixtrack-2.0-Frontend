import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarRange, Check, Clock3, Download, ExternalLink, RefreshCw, Search, SlidersHorizontal, UserCheck, UserX, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import AccessDeniedState from "../components/selfPunch/AccessDeniedState";
import { parseApiError } from "../lib/apiClient";
import { professionalAttendanceApi } from "../services/supervisorSelfPunchApi";
import attendanceBannerBg from "../assets/attendance-banner-bg.png";

const getTodayInIST = () => {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
};

const formatClock = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatLocation = (lat, lng) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "-";
  }
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};

const hasValidCoordinates = (lat, lng) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  return !(Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001);
};

const formatHoursWorked = (value, fallback = "-") => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  const totalMinutes = Math.round(numeric * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0 && minutes === 0) return "0m";
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
};

const csvEscape = (value) => {
  const safe = String(value ?? "");
  if (safe.includes(",") || safe.includes("\n") || safe.includes('"')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
};

const downloadCsv = (filename, rows) => {
  const csvText = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

const toYMD = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const isTruthyFlag = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "y"].includes(normalized);
};

const isAutoPunchOutRecord = (record) => {
  if (!record) return false;
  if (isTruthyFlag(record.is_auto_punch_out) || isTruthyFlag(record.auto_punched_out)) {
    return true;
  }
  const outAddress = String(record.out_address || "").toLowerCase();
  const punchOutBy = String(record.punch_out_by || record.punchout_by || "").toLowerCase();
  const punchOutMode = String(record.punch_out_mode || record.punch_out_type || "").toLowerCase();
  return (
    outAddress.includes("auto punch-out") ||
    outAddress.includes("auto punch out") ||
    punchOutBy.includes("auto") ||
    punchOutMode.includes("auto")
  );
};

const isLeaveRecord = (record) => {
  if (!record) return false;
  if (record.leave_status) return true;
  if (record.leave_type || record.leaveType) return true;
  const status = String(record.attendance_status || record.status || "").toLowerCase();
  return status.includes("leave");
};

const getPunchOutType = (record) => {
  if (!record?.punch_out) return "-";
  return isAutoPunchOutRecord(record) ? "System" : "Manual";
};

const getInitials = (name) => {
  const clean = String(name || "").trim();
  if (!clean) return "NA";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const getPunchLocationName = (entry, type) => {
  const isIn = type === "in";
  const primary = isIn
    ? (entry.punch_in_location_name || entry.punch_in_address || entry.in_address || entry.in_location_name)
    : (entry.punch_out_location_name || entry.punch_out_address || entry.out_address || entry.out_location_name);
  if (primary) return String(primary);

  if (!isIn && entry.punch_out && getPunchOutType(entry) === "System") {
    return "System (Auto Punch-Out)";
  }
  return "-";
};

const getCoordsText = (lat, lng) => {
  if (!hasValidCoordinates(lat, lng)) return "-";
  return formatLocation(lat, lng);
};

const renderPhotoThumb = ({ url, alt }) => {
  if (!url) {
    return (
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
        -
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="relative inline-flex h-11 w-11 overflow-hidden rounded-lg border border-slate-200 shadow-sm"
      title="Open photo"
    >
      <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      <span className="absolute bottom-0.5 right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
        <Check className="h-3 w-3" />
      </span>
    </a>
  );
};

const CARD_SPARKLINES = {
  registered: { path: "M2,26 L18,24 L34,25 L50,21 L66,22 L82,12 L98,16 L114,8", stroke: "#3B82F6", fill: "rgba(59,130,246,0.14)", progress: "from-blue-500 to-indigo-500" },
  present: { path: "M2,28 L18,27 L34,29 L50,20 L66,18 L82,10 L98,12 L114,6", stroke: "#10B981", fill: "rgba(16,185,129,0.14)", progress: "from-emerald-500 to-teal-500" },
  absent: { path: "M2,28 L18,26 L34,23 L50,21 L66,24 L82,15 L98,18 L114,7", stroke: "#F43F5E", fill: "rgba(244,63,94,0.14)", progress: "from-rose-500 to-pink-500" },
  leave: { path: "M2,28 L18,27 L34,26 L50,24 L66,22 L82,21 L98,14 L114,10", stroke: "#F59E0B", fill: "rgba(245,158,11,0.14)", progress: "from-amber-500 to-orange-500" },
  rate: { path: "M2,28 L18,27 L34,26 L50,25 L66,21 L82,16 L98,18 L114,9", stroke: "#8B5CF6", fill: "rgba(139,92,246,0.14)", progress: "from-violet-500 to-indigo-500" },
  "system-punchout": { path: "M2,27 L18,26 L34,24 L50,22 L66,26 L82,14 L98,18 L114,8", stroke: "#F97316", fill: "rgba(249,115,22,0.14)", progress: "from-orange-500 to-amber-500" },
  active: { path: "M2,28 L18,24 L34,23 L50,22 L66,18 L82,16 L98,10 L114,8", stroke: "#10B981", fill: "rgba(16,185,129,0.14)", progress: "from-emerald-500 to-teal-500" },
  "completed-days": { path: "M2,27 L18,26 L34,22 L50,19 L66,14 L82,11 L98,8 L114,6", stroke: "#6366F1", fill: "rgba(99,102,241,0.14)", progress: "from-indigo-500 to-blue-500" },
  hours: { path: "M2,28 L18,25 L34,20 L50,17 L66,18 L82,13 L98,9 L114,7", stroke: "#8B5CF6", fill: "rgba(139,92,246,0.14)", progress: "from-violet-500 to-fuchsia-500" },
};

export default function SupervisorProfessionalAttendancePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProfessionalId = searchParams.get("professionalId") || "";
  const professionalNameFromQuery = searchParams.get("name") || "";

  const [zoneId, setZoneId] = useState("");
  const [wardId, setWardId] = useState("");
  const [cityId, setCityId] = useState("");
  const [kothiId, setKothiId] = useState("");
  const [professionalId] = useState(initialProfessionalId);
  const [viewMode, setViewMode] = useState("day");
  const [date, setDate] = useState(() => getTodayInIST());
  const [startDate, setStartDate] = useState(() => getTodayInIST());
  const [endDate, setEndDate] = useState(() => getTodayInIST());
  const [searchTerm, setSearchTerm] = useState("");
  const [punchOutScope, setPunchOutScope] = useState("all");
  const [page, setPage] = useState(1);

  const isDateRange = viewMode === "range";
  const hasValidRange = Boolean(startDate && endDate && startDate <= endDate);

  const hierarchyQuery = useQuery({
    queryKey: ["professional-sector-hierarchy"],
    queryFn: professionalAttendanceApi.getSectorHierarchy,
  });

  const attendanceQuery = useQuery({
    queryKey: ["professional-attendance", { cityId, zoneId, wardId, kothiId, date, page, professionalId }],
    queryFn: () =>
      professionalAttendanceApi.getAttendanceList({
        cityId,
        zoneId,
        wardId,
        kothiId,
        professionalId,
        date,
        month: "",
        page,
        limit: 20,
      }),
    placeholderData: (previousData) => previousData,
    enabled: !isDateRange && Boolean(date),
    refetchInterval: 60 * 1000,
  });

  const rangeSummaryQuery = useQuery({
    queryKey: ["professional-attendance-range-summary", { cityId, zoneId, wardId, kothiId, startDate, endDate, page, professionalId }],
    queryFn: () =>
      professionalAttendanceApi.getDateRangeSummary({
        cityId,
        zoneId,
        wardId,
        kothiId,
        professionalId,
        startDate,
        endDate,
        page,
        limit: 20,
      }),
    placeholderData: (previousData) => previousData,
    enabled: isDateRange && hasValidRange,
    refetchInterval: 60 * 1000,
  });

  const summaryQuery = useQuery({
    queryKey: ["professional-attendance-summary", { cityId, zoneId, wardId, kothiId, date, startDate, endDate, isDateRange, professionalId }],
    queryFn: () =>
      professionalAttendanceApi.getSummary({
        cityId,
        zoneId,
        wardId,
        kothiId,
        professionalId,
        date: isDateRange ? "" : date,
        month: "",
        startDate: isDateRange ? startDate : "",
        endDate: isDateRange ? endDate : "",
      }),
    enabled: isDateRange ? hasValidRange : Boolean(date),
    refetchInterval: 60 * 1000,
  });

  const rows = useMemo(() => (
    isDateRange
      ? (rangeSummaryQuery.data?.data || [])
      : (attendanceQuery.data?.data || [])
  ), [isDateRange, rangeSummaryQuery.data, attendanceQuery.data]);

  const pagination = isDateRange
    ? (rangeSummaryQuery.data?.pagination || { page: 1, pages: 1, total: 0 })
    : (attendanceQuery.data?.pagination || { page: 1, pages: 1, total: 0 });
  const currentPage = Number(pagination.page || page) || 1;
  const rowsPerPage = Number(pagination.limit || 20) || 20;
  const serialStart = (currentPage - 1) * rowsPerPage + 1;

  const zoneOptions = useMemo(() => {
    const source = Array.isArray(hierarchyQuery.data) ? hierarchyQuery.data : [];
    const collected = source.flatMap((city) => {
      const cityIdentifier = String(city.cityId || city.city_id || "");
      if (cityId && cityIdentifier !== String(cityId)) {
        return [];
      }
      const zones = Array.isArray(city?.zones) ? city.zones : [];
      return zones.map((zone) => ({
        id: String(zone.zoneId || zone.zone_id),
        name: zone.zone || zone.zone_name,
      }));
    });
    const unique = new Map();
    collected.forEach((item) => {
      const key = `${item.id}-${item.name}`;
      if (!unique.has(key)) unique.set(key, item);
    });
    return Array.from(unique.values());
  }, [hierarchyQuery.data, cityId]);

  const cityOptions = useMemo(() => {
    const source = Array.isArray(hierarchyQuery.data) ? hierarchyQuery.data : [];
    const unique = new Map();
    source.forEach((city) => {
      const id = String(city.cityId || city.city_id || "");
      const name = city.city || city.city_name;
      if (!id || !name) return;
      if (!unique.has(id)) {
        unique.set(id, { id, name });
      }
    });
    return Array.from(unique.values());
  }, [hierarchyQuery.data]);

  const wardOptions = useMemo(() => {
    const source = Array.isArray(hierarchyQuery.data) ? hierarchyQuery.data : [];
    const flattened = source.flatMap((city) => {
      const cityIdentifier = String(city.cityId || city.city_id || "");
      if (cityId && cityIdentifier !== String(cityId)) return [];
      const zones = Array.isArray(city?.zones) ? city.zones : [];
      return zones.flatMap((zone) => {
        const zoneIdentifier = String(zone.zoneId || zone.zone_id || "");
        if (zoneId && zoneIdentifier !== String(zoneId)) return [];
        const sectors = Array.isArray(zone?.sectors) ? zone.sectors : [];
        return sectors.map((sector) => ({
          id: String(sector.sectorId || sector.sector_id),
          name: sector.sectorName || sector.sector_name,
          zoneId: String(zone.zoneId || zone.zone_id),
          cityId: String(city.cityId || city.city_id),
          kothis: Array.isArray(sector.kothis) ? sector.kothis : [],
        }));
      });
    });

    const unique = new Map();
    flattened.forEach((item) => {
      const key = `${item.id}-${item.zoneId}`;
      if (!unique.has(key)) unique.set(key, item);
    });
    return Array.from(unique.values());
  }, [hierarchyQuery.data, zoneId, cityId]);

  const kothiOptions = useMemo(() => {
    const uniqueMap = new Map();
    const sourceKothis = wardId
      ? (wardOptions.find((item) => item.id === String(wardId))?.kothis || [])
      : wardOptions.flatMap((item) => item.kothis || []);
    sourceKothis.forEach((kothi) => {
      const id = String(kothi.wardId || kothi.ward_id);
      const name = kothi.wardName || kothi.ward_name;
      if (!id || !name) return;
      if (!uniqueMap.has(id)) uniqueMap.set(id, { id, name });
    });
    return Array.from(uniqueMap.values());
  }, [wardOptions, wardId]);

  const activeError = isDateRange ? rangeSummaryQuery.error : attendanceQuery.error;
  const activeLoading = isDateRange ? rangeSummaryQuery.isLoading : attendanceQuery.isLoading;
  const activeFetching = isDateRange ? rangeSummaryQuery.isFetching : attendanceQuery.isFetching;

  const isForbidden =
    attendanceQuery.error?.response?.status === 403 ||
    rangeSummaryQuery.error?.response?.status === 403 ||
    summaryQuery.error?.response?.status === 403;

  const searchableRows = useMemo(() => rows, [rows]);

  const visibleRows = useMemo(() => {
    const query = String(searchTerm || "").trim().toLowerCase();
    let filtered = searchableRows;
    if (query) {
      filtered = filtered.filter((entry) => {
        const haystack = [
          entry.full_name,
          entry.emp_code,
          entry.mobile,
          entry.email,
          entry.ward_name,
          entry.kothi_name,
          entry.zone_name,
          entry.city_name,
        ]
          .map((item) => String(item || "").toLowerCase())
          .join(" ");
        return haystack.includes(query);
      });
    }

    if (!isDateRange && punchOutScope !== "all") {
      filtered = filtered.filter((entry) =>
        punchOutScope === "system"
          ? getPunchOutType(entry) === "System"
          : getPunchOutType(entry) === "Manual"
      );
    }

    return filtered;
  }, [searchTerm, searchableRows, isDateRange, punchOutScope]);

  const summaryCards = useMemo(() => {
    const totalProfessionals = Number(summaryQuery.data?.data?.total_professionals) || Number(pagination.total) || 0;
    if (isDateRange) {
      const totalCompletedDays = searchableRows.reduce((acc, entry) => acc + (Number(entry.completed_days) || 0), 0);
      const totalHours = searchableRows.reduce((acc, entry) => acc + (Number(entry.total_hours_worked) || 0), 0);
      return [
        {
          key: "registered",
          label: "Registered Professionals",
          value: totalProfessionals,
          icon: <Users className="h-5 w-5 text-blue-600" />,
          tone: "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50",
        },
        {
          key: "active",
          label: "Active in Range",
          value: searchableRows.length,
          icon: <UserCheck className="h-5 w-5 text-emerald-600" />,
          tone: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50",
        },
        {
          key: "completed-days",
          label: "Completed Days",
          value: totalCompletedDays,
          icon: <Clock3 className="h-5 w-5 text-indigo-600" />,
          tone: "border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50",
        },
        {
          key: "hours",
          label: "Total Hours",
          value: formatHoursWorked(totalHours, "0m"),
          icon: <Clock3 className="h-5 w-5 text-violet-600" />,
          tone: "border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50",
        },
      ];
    }

    const present = searchableRows.filter((entry) => Boolean(entry.punch_in)).length;
    const leave = searchableRows.filter((entry) => isLeaveRecord(entry) && !entry.punch_in).length;
    const punchedOut = searchableRows.filter((entry) => Boolean(entry.punch_out)).length;
    const punchedOutSystem = searchableRows.filter((entry) => getPunchOutType(entry) === "System").length;
    const inProgress = Math.max(present - punchedOut, 0);
    const absent = Math.max(totalProfessionals - present - leave, 0);
    const avgAttendanceRate = Number(summaryQuery.data?.data?.avg_attendance_rate || 0);
    const denominator = Math.max(totalProfessionals, 1);

    return [
      {
        key: "registered",
        label: "Registered Professionals",
        value: totalProfessionals,
        icon: <Users className="h-5 w-5 text-blue-600" />,
        tone: "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50",
      },
      {
        key: "present",
        label: "Present",
        value: present,
        icon: <UserCheck className="h-5 w-5 text-emerald-600" />,
        tone: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50",
        percentage: `${Math.round((present / denominator) * 100)}%`,
      },
      {
        key: "absent",
        label: "Absent",
        value: absent,
        icon: <UserX className="h-5 w-5 text-rose-600" />,
        tone: "border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50",
        percentage: `${Math.round((absent / denominator) * 100)}%`,
      },
      {
        key: "leave",
        label: "On Leave",
        value: leave,
        icon: <Clock3 className="h-5 w-5 text-amber-600" />,
        tone: "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50",
        percentage: `${Math.round((leave / denominator) * 100)}%`,
      },
      {
        key: "rate",
        label: "Avg Attendance %",
        value: `${avgAttendanceRate}%`,
        icon: <Clock3 className="h-5 w-5 text-indigo-600" />,
        tone: "border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50",
        subtext: `${inProgress} in progress`,
      },
      {
        key: "system-punchout",
        label: "Punch-Out System",
        value: punchedOutSystem,
        icon: <Clock3 className="h-5 w-5 text-orange-600" />,
        tone: "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50",
        subtext: `${punchedOut} total punched out`,
        percentage: `${Math.round((punchedOutSystem / denominator) * 100)}%`,
      },
    ];
  }, [isDateRange, pagination.total, summaryQuery.data, searchableRows]);

  const handleExport = () => {
    const csvRows = isDateRange
      ? [
          ["Sr No", "Employee Name", "Emp Code", "Mobile", "Ward", "Zone", "City",
           "Total Days (Range)", "Week Off Days", "Working Days",
           "Attendance Days", "Approved Leave Days", "Effective Present",
           "Absent Days", "Payable Days", "Hours Worked"],
          ...visibleRows.map((entry, index) => [
            index + 1,
            entry.full_name,
            entry.emp_code || "",
            entry.mobile || "",
            entry.ward_name,
            entry.zone_name || "",
            entry.city_name || "",
            entry.total_range_days ?? "",
            entry.week_off_days_count ?? 0,
            entry.working_days ?? "",
            entry.attendance_count,
            entry.leave_days || 0,
            entry.effective_present ?? (entry.attendance_count + (entry.leave_days || 0)),
            entry.absent_days ?? 0,
            entry.payable_days ?? entry.effective_present ?? 0,
            entry.total_hours_worked,
          ]),
        ]
      : [
          ["Sr No", "Employee Name", "Emp Code", "Email", "Mobile", "Ward", "Kothi", "Zone", "City", "Punch In", "Punch Out", "Punch-Out Type", "Leave Type", "Leave Status", "Reviewed By", "In Location", "Out Location", "Hours Worked"],
          ...visibleRows.map((entry, index) => [
            index + 1,
            entry.full_name,
            entry.emp_code || "",
            entry.email || "",
            entry.mobile || "",
            entry.ward_name,
            entry.kothi_name || "",
            entry.zone_name || "",
            entry.city_name || "",
            formatClock(entry.punch_in),
            formatClock(entry.punch_out),
            getPunchOutType(entry),
            entry.leave_type || "",
            entry.leave_status || "",
            entry.leave_reviewed_by_name || "",
            formatLocation(entry.punch_in_latitude, entry.punch_in_longitude),
            formatLocation(entry.punch_out_latitude, entry.punch_out_longitude),
            entry.hours_worked || "",
          ]),
        ];

    downloadCsv(`professional-attendance-${Date.now()}.csv`, csvRows);
  };

  const openRangeDetails = (entry) => {
    const params = new URLSearchParams({
      professionalId: String(entry.professional_id || ""),
      startDate: toYMD(startDate),
      endDate: toYMD(endDate),
      name: entry.full_name || "",
    });
    navigate(`/supervisor/professional-attendance/date-range-details?${params.toString()}`);
  };

  return (
    <div className="space-y-5">
      <div
        className="relative flex min-h-[150px] items-center overflow-hidden rounded-2xl border border-indigo-100 p-4 shadow-sm md:min-h-[170px] md:p-6"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(236,245,255,0.88) 0%, rgba(230,240,255,0.74) 34%, rgba(228,233,255,0.38) 56%, rgba(226,229,255,0.12) 100%), url(${attendanceBannerBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center right",
        }}
      >
        <div className="relative flex items-center justify-between gap-4">
          <div className="max-w-3xl pr-2 md:max-w-[60%]">
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-white/80 text-blue-600 shadow-sm">
              <CalendarRange className="h-5 w-5" />
            </span>
            <p className="mb-2 inline-flex items-center rounded-lg border border-white/70 bg-white/80 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
              Professional Attendance
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">Professional Attendance</h1>
            <p className="mt-1 text-sm font-medium text-slate-700 md:text-base">Daily and range-wise attendance report for professional workforce.</p>
            {professionalId ? (
              <p className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Filtered professional: {professionalNameFromQuery || professionalId}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {isForbidden ? (
        <AccessDeniedState />
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Professional Attendance Filters</h2>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode("day");
                  setPage(1);
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${viewMode === "day" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                Single Date
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("range");
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-semibold ${viewMode === "range" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                <CalendarRange className="h-4 w-4" />
                Date Range
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-8">
              <label className="text-sm font-medium text-slate-700">
                City
                <select
                  value={cityId}
                  onChange={(event) => {
                    setCityId(event.target.value);
                    setZoneId("");
                    setWardId("");
                    setKothiId("");
                    setPage(1);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
                >
                  <option value="">All Cities</option>
                  {cityOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Zone
                <select
                  value={zoneId}
                  onChange={(event) => {
                    setZoneId(event.target.value);
                    setWardId("");
                    setKothiId("");
                    setPage(1);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
                >
                  <option value="">All Zones</option>
                  {zoneOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Ward (Sector)
                <select
                  value={wardId}
                  onChange={(event) => {
                    setWardId(event.target.value);
                    setKothiId("");
                    setPage(1);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
                >
                <option value="">All Sectors</option>
                  {wardOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Kothi
                <select
                  value={kothiId}
                  onChange={(event) => {
                    setKothiId(event.target.value);
                    setPage(1);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
                >
                  <option value="">All Kothis</option>
                  {kothiOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>

              {isDateRange ? (
                <>
                  <label className="text-sm font-medium text-slate-700">
                    From
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => {
                        setStartDate(event.target.value);
                        setPage(1);
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    To
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => {
                        setEndDate(event.target.value);
                        setPage(1);
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
                    />
                  </label>
                </>
              ) : (
                <label className="text-sm font-medium text-slate-700">
                  Date
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => {
                      setDate(event.target.value);
                      setPage(1);
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
                  />
                </label>
              )}

              <div className="flex items-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isDateRange) {
                      rangeSummaryQuery.refetch();
                    } else {
                      attendanceQuery.refetch();
                    }
                    summaryQuery.refetch();
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className={`h-4 w-4 ${activeFetching ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCityId("");
                    setZoneId("");
                    setWardId("");
                    setKothiId("");
                    setDate(getTodayInIST());
                    setStartDate(getTodayInIST());
                    setEndDate(getTodayInIST());
                    setSearchTerm("");
                    setPunchOutScope("all");
                    setPage(1);
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {isDateRange && !hasValidRange ? (
              <p className="mt-3 text-sm text-rose-600">Date range invalid. "From" date must be less than or equal to "To" date.</p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">Professional Attendance View</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-6">
              {summaryCards.map((card) => (
                <div key={card.key} className={`rounded-2xl border p-4 shadow-sm ${card.tone} relative overflow-hidden`}>
                  {(() => {
                    const spark = CARD_SPARKLINES[card.key] || CARD_SPARKLINES.registered;
                    return (
                      <svg className="pointer-events-none absolute bottom-0 right-0 h-12 w-[128px] opacity-90" viewBox="0 0 116 36" fill="none">
                        <path d={`${spark.path} L114,36 L2,36 Z`} fill={spark.fill} />
                        <path
                          d={spark.path}
                          stroke={spark.stroke}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    );
                  })()}
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-600">{card.label}</p>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm">
                      {card.icon}
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-4xl font-black tracking-tight text-slate-900">{card.value}</p>
                    {card.percentage ? <p className="text-sm font-black text-slate-600">{card.percentage}</p> : null}
                  </div>
                  {card.subtext ? <p className="mt-1 text-xs font-medium text-slate-600">{card.subtext}</p> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {activeLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">Loading attendance...</p>
            ) : activeError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
                {parseApiError(activeError, "Failed to load attendance.")}
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <label className="relative w-full max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by name, email, mobile, ward, zone, city..."
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <p className="text-sm font-semibold text-slate-600">
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      Showing {visibleRows.length} of {searchableRows.length}
                    </span>
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                    title="Table options"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    View
                  </button>
                </div>
                {!isDateRange ? (
                  <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-3 py-2 shadow-sm">
                    <span className="pr-1 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Status Scope:</span>
                    <button
                      type="button"
                      onClick={() => setPunchOutScope("all")}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                        punchOutScope === "all"
                          ? "border-indigo-500 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"
                          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      All Records
                    </button>
                    <button
                      type="button"
                      onClick={() => setPunchOutScope("system")}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                        punchOutScope === "system"
                          ? "border-orange-400 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      Auto Punch Out
                    </button>
                    <button
                      type="button"
                      onClick={() => setPunchOutScope("manual")}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                        punchOutScope === "manual"
                          ? "border-emerald-400 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      Manual Punch Out
                    </button>
                  </div>
                ) : null}
                <div className="max-h-[62vh] overflow-auto rounded-2xl border border-slate-200">
                {isDateRange ? (
                    <table className="min-w-[1500px] divide-y divide-slate-200 text-[14px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-100 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">
                          <th className="px-4 py-2.5 whitespace-nowrap">Sr No</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Employee Name</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Emp Code</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Mobile</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Ward</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Zone</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">City</th>
                          <th className="px-3 py-2.5 whitespace-nowrap bg-slate-200" title="Total calendar days in selected range">Total Days</th>
                          <th className="px-3 py-2.5 whitespace-nowrap bg-slate-200" title="Days falling on employee's configured week-off">Week Off</th>
                          <th className="px-3 py-2.5 whitespace-nowrap bg-slate-200" title="Total Days ΓêÆ Week Off">Working Days</th>
                          <th className="px-3 py-2.5 whitespace-nowrap bg-blue-100 text-blue-800" title="Days with punch-in (half day = 1 day)">Attendance Days</th>
                          <th className="px-3 py-2.5 whitespace-nowrap bg-blue-100 text-blue-800" title="Approved leave days">Leave Days</th>
                          <th className="px-3 py-2.5 whitespace-nowrap bg-indigo-100 text-indigo-800 font-black" title="Attendance + Leave">Effective Present</th>
                          <th className="px-3 py-2.5 whitespace-nowrap bg-rose-100 text-rose-800" title="Working Days ΓêÆ Effective Present">Absent</th>
                          <th className="px-3 py-2.5 whitespace-nowrap bg-emerald-100 text-emerald-800 font-black" title="Days HR uses for salary calculation">Payable Days Γ£ô</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Hours Worked</th>
                          <th className="px-3 py-2.5 whitespace-nowrap">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleRows.length === 0 ? (
                          <tr>
                            <td colSpan={17} className="px-4 py-10 text-center text-slate-500">No attendance records found.</td>
                          </tr>
                        ) : (
                          visibleRows.map((entry, index) => (
                            <tr key={entry.professional_id} className="odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/60">
                              <td className="px-4 py-3 align-middle font-semibold text-slate-700">{serialStart + index}</td>
                              <td className="max-w-[200px] truncate px-4 py-3 align-middle font-semibold text-slate-900" title={entry.full_name || "-"}>{entry.full_name}</td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle font-mono text-xs text-slate-700">{entry.emp_code || "-"}</td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle text-slate-700">{entry.mobile || "-"}</td>
                              <td className="max-w-[160px] truncate px-3 py-3 align-middle text-slate-700" title={entry.ward_name || "-"}>{entry.ward_name || "-"}</td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle text-slate-700">{entry.zone_name || "-"}</td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle text-slate-700">{entry.city_name || "-"}</td>
                              {/* Salary section */}
                              <td className="whitespace-nowrap px-3 py-3 align-middle bg-slate-50 text-center font-semibold text-slate-700">{entry.total_range_days ?? "-"}</td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle bg-slate-50 text-center text-slate-500">{entry.week_off_days_count ?? 0}</td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle bg-slate-50 text-center font-semibold text-slate-800">{entry.working_days ?? "-"}</td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle bg-blue-50 text-center font-semibold text-blue-800">{entry.attendance_count}</td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle bg-blue-50 text-center font-semibold text-blue-700">{entry.leave_days || 0}</td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle bg-indigo-50 text-center font-black text-indigo-800">{entry.effective_present ?? (entry.attendance_count + (entry.leave_days || 0))}</td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle bg-rose-50 text-center font-semibold text-rose-700">{entry.absent_days ?? 0}</td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle bg-emerald-50 text-center font-black text-emerald-800 text-base">{entry.payable_days ?? entry.effective_present ?? 0}</td>
                              <td className="whitespace-nowrap px-3 py-3 align-middle text-slate-600">{formatHoursWorked(entry.total_hours_worked)}</td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle text-slate-700">
                                <button
                                  type="button"
                                  onClick={() => openRangeDetails(entry)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                  Open
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="min-w-[2150px] divide-y divide-slate-200 text-[13px]">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-100 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">
                          <th className="px-4 py-2.5 whitespace-nowrap">Sr No</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Employee Name</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Emp Code</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Email</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Mobile</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Ward</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Kothi</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Zone</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">City</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Punch In</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Punch Out</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Leave Status</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Leave Approved By</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">In Photo</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">In Location</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">In Lat/Long</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Out Photo</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Out Location</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Out Lat/Long</th>
                          <th className="px-4 py-2.5 whitespace-nowrap">Hours Worked</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleRows.length === 0 ? (
                          <tr>
                            <td colSpan={19} className="px-4 py-10 text-center text-slate-500">No attendance records found.</td>
                          </tr>
                        ) : (
                          visibleRows.map((entry, index) => (
                            <tr key={entry.attendance_id || entry.professional_id} className="odd:bg-white even:bg-slate-50/40 hover:bg-blue-50/60">
                              <td className="px-4 py-3 align-middle font-semibold text-slate-700">{serialStart + index}</td>
                              <td className="min-w-[220px] px-4 py-3 align-middle">
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[11px] font-black text-white">
                                    {getInitials(entry.full_name)}
                                  </span>
                                  <p className="max-w-[170px] truncate font-semibold text-slate-900" title={entry.full_name || "-"}>
                                    {entry.full_name}
                                  </p>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle font-mono text-slate-700">{entry.emp_code || "-"}</td>
                              <td className="min-w-[220px] px-4 py-3 align-middle text-slate-700">{entry.email || "-"}</td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle text-slate-700">{entry.mobile || "-"}</td>
                              <td className="max-w-[200px] truncate px-4 py-3 align-middle text-slate-700" title={entry.ward_name || "-"}>{entry.ward_name || "-"}</td>
                              <td className="max-w-[160px] truncate px-4 py-3 align-middle text-slate-700" title={entry.kothi_name || "-"}>{entry.kothi_name || "-"}</td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle text-slate-700">{entry.zone_name || "-"}</td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle text-slate-700">{entry.city_name || "-"}</td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle text-slate-700">{formatClock(entry.punch_in)}</td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle text-slate-700">
                                <div className="flex flex-col gap-0.5">
                                  <span>{formatClock(entry.punch_out)}</span>
                                  {entry.punch_out && getPunchOutType(entry) === "System" ? (
                                    <span className="text-[11px] font-bold text-orange-600">by System</span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle capitalize text-slate-700">{entry.leave_status || "-"}</td>
                              <td className="max-w-[180px] truncate px-4 py-3 align-middle text-slate-700" title={entry.leave_reviewed_by_name || "-"}>
                                {entry.leave_reviewed_by_name || "-"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle text-slate-700">
                                {renderPhotoThumb(
                                  {
                                    url: entry.punch_in_photo_url,
                                    alt: `${entry.full_name || "Professional"} punch in`,
                                  }
                                )}
                              </td>
                              <td className="max-w-[220px] truncate px-4 py-3 align-middle text-slate-700" title={getPunchLocationName(entry, "in")}>
                                {getPunchLocationName(entry, "in")}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle text-slate-700">
                                {getCoordsText(entry.punch_in_latitude, entry.punch_in_longitude)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle text-slate-700">
                                {renderPhotoThumb(
                                  {
                                    url: entry.punch_out_photo_url,
                                    alt: `${entry.full_name || "Professional"} punch out`,
                                  }
                                )}
                              </td>
                              <td className="max-w-[220px] truncate px-4 py-3 align-middle text-slate-700" title={getPunchLocationName(entry, "out")}>
                                {getPunchLocationName(entry, "out")}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle text-slate-700">
                                {getCoordsText(entry.punch_out_latitude, entry.punch_out_longitude)}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 align-middle text-slate-700">{formatHoursWorked(entry.hours_worked)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-slate-700">
                  <p>
                    Total: {pagination.total || 0} | Showing: {visibleRows.length} | Page {currentPage} of {pagination.pages || 1}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      disabled={page <= 1}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <span className="font-medium">Page {currentPage} / {pagination.pages || 1}</span>
                    <button
                      type="button"
                      onClick={() => setPage((value) => Math.min(pagination.pages || value, value + 1))}
                      disabled={page >= (pagination.pages || 1)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}