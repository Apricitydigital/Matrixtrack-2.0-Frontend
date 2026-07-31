import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GaugeCircle, MapPin, Loader2, RefreshCw, Download } from "lucide-react";
import DashboardStats from "../components/DashboardStats";
import AttendanceChart from "../components/AttendanceChart";
import QuickActions from "../components/QuickActions";
import CityAttendanceLineChart from "../components/CityAttendanceLineChart";
import ArrivalTrendChart from "../components/ArrivalTrendChart";
import ShiftWiseAttendanceChart from "../components/ShiftWiseAttendanceChart";
import ReportDashboard from "../components/ReportDashboard";
import EmployeeStatusModal from "../components/EmployeeStatusModal";
import TopSupervisors from "../components/TopSupervisors";
import KothiRoleChart from "../components/KothiRoleChart";
import AttendanceTrendChart from '../components/AttendanceTrendChart';
import LiveInsightsCard from "../components/LiveInsightsCard";
import { useAuth } from "../AuthContext";
import Afternoon from '../assets/Afternoon.jpg';
import Morning from '../assets/Morning.jpg';
import Evening from '../assets/Evening.jpg';
import Night from '../assets/Night.jpg';

import { ALLOWED_CITIES_ENDPOINT, buildApiUrl } from "../config";
import {
  Sunrise,
  Sun,
  Sunset,
  MoonStar
} from "lucide-react";
import Loader from "../components/Loader";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
const SUMMARY_ENDPOINT = buildApiUrl("/app/supervisor/wards/summary");
const WARDS_ENDPOINT = buildApiUrl("/app/supervisor/wards");
const SUPERVISORS_ENDPOINT = buildApiUrl("/supervisor");
const CITY_SUMMARY_ENDPOINT = buildApiUrl("/app/supervisor/wards/city-summary");
const KOTHI_LIST_ENDPOINT = buildApiUrl("/app/supervisor/wards/kothi-list");
const ASSIGNED_WARDS_ENDPOINT = buildApiUrl("/assignedWardRoutes");

const mapSummaryPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return {
      totalEmployees: 0,
      totalFaceRegistered: 0,
      totalSupervisors: 0,
      marked: 0,
      inProgress: 0,
      midShiftPunchIn: 0,
      onLeave: 0,
      notMarked: 0,
      attendanceRate: 0,
      change: {},


    };
  }

  const totalEmployees = Number(
    payload.totalEmployees ??
    payload.total_employees ??
    payload.total ??
    payload.totalEmployeesCount
  );
  const present = Number(payload.present ?? payload.marked ?? payload.completed ?? 0);
  const fullyMarked = Number(payload.fullyMarked ?? payload.fully_marked ?? payload.marked ?? 0);
  const onLeave = Number(payload.onLeave ?? payload.on_leave ?? 0);
  const inProgress = Number(payload.inProgress ?? payload.in_progress ?? payload.pending ?? 0);
  let notMarked = Number(
    payload.notMarked ?? payload.not_marked ?? payload.absent ?? payload.pendingCount ?? 0
  );

  let attendanceRate = Number(
    payload.attendanceRate ?? payload.attendance_rate ?? payload.rate
  );

  const safeTotal = Number.isFinite(totalEmployees) ? totalEmployees : 0;
  const safePresent = Number.isFinite(present) ? present : 0;
  const safeFullyMarked = Number.isFinite(fullyMarked) ? fullyMarked : safePresent;
  const safeInProgress = Number.isFinite(inProgress) ? inProgress : 0;
  const safeOnLeave = Number.isFinite(onLeave) ? onLeave : 0;

  if (!Number.isFinite(notMarked)) {
    notMarked = 0;
  }
  // Recompute notMarked to ensure leave is excluded
  const safeNotMarked = safeTotal > 0
    ? Math.max(safeTotal - safePresent - safeOnLeave, 0)
    : Math.max(notMarked, 0);

  if (!Number.isFinite(attendanceRate)) {
    attendanceRate =
      safeTotal > 0
        ? Number(
          (((safePresent + safeOnLeave) / safeTotal) * 100).toFixed(1)
        )
        : 0;
  }

  return {
    totalEmployees: safeTotal,
    totalFaceRegistered: Number(
      payload.totalFaceRegistered ??
      payload.total_face_registered ??
      payload.faceRegisteredEmployees ??
      0
    ) || 0,
    totalSupervisors: Number(
      payload.totalSupervisors ??
      payload.total_supervisors ??
      payload.supervisorCount ??
      0
    ) || 0,
    marked: Math.max(safePresent - safeInProgress, 0),
    inProgress: safeInProgress,
    midShiftPunchIn: Number(
      payload.midShiftPunchIn ??
      payload.mid_shift_punch_in ??
      payload.mid_shift_punch_in_count ??
      payload.mid_shift_count ??
      0
    ) || 0,
    onLeave: safeOnLeave,
    notMarked: safeNotMarked,
    attendanceRate: Number.isFinite(attendanceRate) ? attendanceRate : 0,
    change: payload.change || {},

  };
};

const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn("Failed to parse JSON response:", error);
    return {};
  }
};

const normalizeEmployeeName = (employee) => {
  const primary =
    employee?.name ??
    employee?.employee_name ??
    employee?.employeeName ??
    employee?.emp_name ??
    employee?.emp_full_name ??
    "";
  if (typeof primary === "string" && primary.trim()) {
    return primary.trim();
  }

  const first = employee?.first_name ?? employee?.firstName ?? "";
  const last = employee?.last_name ?? employee?.lastName ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined) {
    return combined;
  }

  return "";
};

const normalizeStatusKey = (value) => {
  const status = (value || "").toString().toLowerCase();
  if (status.includes("progress")) {
    return "inProgress";
  }
  if (status === "leave" || status.includes("medical") || status.includes("casual")) {
    return "onLeave";
  }
  if (status === "marked" || status.includes("complete")) {
    return "marked";
  }
  return "notMarked";
};

const hasFaceRegistration = (employee) => {
  if (!employee || typeof employee !== "object") return false;

  if (
    employee.face_verified === true ||
    employee.face_enrolled === true ||
    employee.face_registered === true ||
    employee.faceRegistered === true ||
    employee.face_enrolled_flag === true
  ) {
    return true;
  }

  if (
    employee.face_embedding ||
    employee.face_id ||
    employee.faceId ||
    employee.face_image_url ||
    employee.faceImageUrl ||
    employee.faceEnrollmentUrl
  ) {
    return true;
  }

  const gallery =
    employee.face_gallery ||
    employee.faceGallery ||
    employee.faceImages ||
    employee.face_images;

  return Array.isArray(gallery) && gallery.length > 0;
};

const buildFaceScopedDashboardData = (wards) => {
  const sourceWards = Array.isArray(wards) ? wards : [];
  const faceWards = [];
  const seenEmployees = new Set();
  const seenFaceEmployees = new Set();
  const cityStats = new Map();

  let totalEmployees = 0;
  let totalFaceRegistered = 0;
  let marked = 0;
  let inProgress = 0;
  let midShiftPunchIn = 0;
  let onLeave = 0;
  let notMarked = 0;

  sourceWards.forEach((ward, wardIndex) => {
    const employees = Array.isArray(ward?.employees) ? ward.employees : [];
    const faceEmployees = [];

    employees.forEach((employee, employeeIndex) => {
      const rawId =
        employee?.emp_id ??
        employee?.employee_id ??
        employee?.id ??
        employee?.emp_code ??
        employee?.employee_code ??
        `${ward?.ward_id ?? wardIndex}-${employeeIndex}`;
      const employeeKey = String(rawId);

      if (!seenEmployees.has(employeeKey)) {
        seenEmployees.add(employeeKey);
        totalEmployees += 1;
      }

      if (!hasFaceRegistration(employee)) {
        return;
      }

      if (seenFaceEmployees.has(employeeKey)) {
        return;
      }
      seenFaceEmployees.add(employeeKey);
      totalFaceRegistered += 1;
      faceEmployees.push(employee);

      const statusKey = normalizeStatusKey(
        employee?.attendance_status ?? employee?.status ?? employee?.attendanceStatus
      );

      if (statusKey === "marked") marked += 1;
      else if (statusKey === "inProgress") inProgress += 1;
      else if (statusKey === "onLeave") onLeave += 1;
      else notMarked += 1;

      const hasMidShift =
        Boolean(employee?.has_mid_shift_punch_in) ||
        Boolean(employee?.hasMidShiftPunchIn) ||
        Boolean(employee?.mid_shift_punch_in_time) ||
        Boolean(employee?.midShiftPunchInTime) ||
        Boolean(employee?.mid_shift_punch_in_display) ||
        Boolean(employee?.midShiftPunchInDisplay);
      if (hasMidShift) {
        midShiftPunchIn += 1;
      }

      const cityId = ward?.city_id ?? ward?.cityId ?? null;
      const cityName = ward?.city_name ?? ward?.cityName ?? ward?.city ?? "Unassigned";
      const cityKey = cityId !== null && cityId !== undefined ? `id:${cityId}` : `name:${cityName}`;

      if (!cityStats.has(cityKey)) {
        cityStats.set(cityKey, {
          city_id: cityId,
          city_name: cityName,
          totalEmployees: 0,
          present: 0,
          marked: 0,
          inProgress: 0,
          onLeave: 0,
          notMarked: 0,
        });
      }

      const bucket = cityStats.get(cityKey);
      bucket.totalEmployees += 1;
      if (statusKey === "marked") {
        bucket.marked += 1;
        bucket.present += 1;
      } else if (statusKey === "inProgress") {
        bucket.inProgress += 1;
        bucket.present += 1;
      } else if (statusKey === "onLeave") {
        bucket.onLeave += 1;
      } else {
        bucket.notMarked += 1;
      }
    });

    if (faceEmployees.length > 0) {
      faceWards.push({ ...ward, employees: faceEmployees });
    }
  });

  const attendanceRate =
    totalFaceRegistered > 0
      ? Number((((marked + inProgress + onLeave) / totalFaceRegistered) * 100).toFixed(1))
      : 0;

  return {
    faceWards,
    faceCitySummary: Array.from(cityStats.values()),
    faceSummary: {
      totalEmployees: totalFaceRegistered,
      totalFaceRegistered,
      marked,
      inProgress,
      midShiftPunchIn,
      onLeave,
      notMarked,
      attendanceRate,
    },
    totalEmployees,
    totalFaceRegistered,
  };
};

const buildEmployeesByStatus = (wards) => {
  const buckets = { marked: [], inProgress: [], onLeave: [], notMarked: [], present: [], faceRegistered: [], midShiftPunchIn: [] };
  const wardList = Array.isArray(wards) ? wards : [];
  const seen = new Set();

  wardList.forEach((ward, wardIndex) => {
    const employees = Array.isArray(ward.employees) ? ward.employees : [];
    if (wardIndex === 0) console.log(`[DEBUG] Dashboard: first ward has ${employees.length} employees. total wards: ${wardList.length}`);
    employees.forEach((employee, index) => {
      const rawId =
        employee?.emp_id ??
        employee?.employee_id ??
        employee?.id ??
        employee?.emp_code ??
        employee?.employee_code ??
        employee?.empId;
      const name = normalizeEmployeeName(employee);
      const key = rawId
        ? String(rawId)
        : `${ward?.ward_id ?? wardIndex}-emp-${index}-${name || "unknown"}`;

      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      const statusKey = normalizeStatusKey(
        employee?.attendance_status ??
        employee?.status ??
        employee?.attendanceStatus
      );
      const normalizedStatus = buckets[statusKey] ? statusKey : "notMarked";

      const displayName =
        name ||
        employee?.emp_code ||
        employee?.employee_code ||
        "Employee";
      const wardLabel =
        ward?.ward_name ??
        ward?.name ??
        (ward?.ward_id ? `Ward ${ward.ward_id}` : "");
      const cityLabel = ward?.city_name ?? ward?.cityName ?? ward?.city ?? "";

      const record = {
        id: key,
        displayName,
        empCode: employee?.emp_code ?? employee?.employee_code ?? "",
        ward: wardLabel,
        city: cityLabel,
      };

      buckets[normalizedStatus].push(record);
      if (hasFaceRegistration(employee)) {
        buckets.faceRegistered.push(record);
      }

      // Combine Punched and In Progress for the "Present" bucket
      if (normalizedStatus === "marked" || normalizedStatus === "inProgress") {
        buckets.present.push(record);
      }

      const hasMidShiftPunchIn =
        Boolean(employee?.has_mid_shift_punch_in) ||
        Boolean(employee?.hasMidShiftPunchIn) ||
        Boolean(employee?.mid_shift_punch_in_time) ||
        Boolean(employee?.midShiftPunchInTime) ||
        Boolean(employee?.mid_shift_punch_in_display) ||
        Boolean(employee?.midShiftPunchInDisplay);
      if (hasMidShiftPunchIn) {
        buckets.midShiftPunchIn.push(record);
      }
    });
  });

  const sorter = (a, b) =>
    (a.displayName || "")
      .toLowerCase()
      .localeCompare((b.displayName || "").toLowerCase());

  Object.values(buckets).forEach((list) => list.sort(sorter));

  return buckets;
};

const resolveSupervisorCityInDashboard = (sup, assignments, wards) => {
  const rawCity = sup.city_name || sup.cityName || sup.city;
  if (rawCity && typeof rawCity === "string" && rawCity.toUpperCase() !== "N/A" && rawCity.trim() !== "" && rawCity !== "null") {
    return rawCity;
  }
  const supId = String(sup.user_id);
  const assign = assignments.find(a => String(a.supervisor_id) === supId);
  if (assign) {
    const ward = wards.find(w => String(w.ward_id) === String(assign.ward_id));
    if (ward && (ward.city_name || ward.city)) return ward.city_name || ward.city;
  }
  return "N/A";
};

function Dashboard() {
  const { user, logPageView } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    logPageView("Dashboard", "/dashboard");
  }, [logPageView]);

  const [summary, setSummary] = useState(null);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [supervisorLoading, setSupervisorLoading] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [cities, setCities] = useState([]);
  const [kothiOptions, setKothiOptions] = useState([]);
  const [selectedKothiIds, setSelectedKothiIds] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(null);
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [cityScopeAll, setCityScopeAll] = useState(false);
  const [citySummary, setCitySummary] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [liveInsights, setLiveInsights] = useState({});

  const handleInsightsChange = useCallback((data) => {
    setLiveInsights((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(data)) {
        return prev;
      }
      return data;
    });
  }, []);
  const getTodayInIST = () => {
    const d = new Date();
    const options = {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    };
    const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(d);
    const day = parts.find((p) => p.type === "day").value;
    const month = parts.find((p) => p.type === "month").value;
    const year = parts.find((p) => p.type === "year").value;
    return `${year}-${month}-${day}`;
  };

  const { todayIst, monthStartIst } = useMemo(() => {
    const today = getTodayInIST();
    const parts = today.split("-");
    const start = `${parts[0]}-${parts[1]}-01`;
    return { todayIst: today, monthStartIst: start };
  }, []);

  const [startDate, setStartDate] = useState(todayIst);
  const [endDate, setEndDate] = useState(todayIst);
  const [showReport, setShowReport] = useState(false);
  const [reportVersion, setReportVersion] = useState(0);
  const [statusModalKey, setStatusModalKey] = useState(null);
  const [showDateInstruction, setShowDateInstruction] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowDateInstruction(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  const isAdmin = user?.role === "admin";
  const dateRangeLabel = useMemo(() => {
    if (startDate) {
      return `Date: ${startDate}`;
    }
    return "No date selected";
  }, [startDate]);

  const handleDateChange = (event) => {
    const value = event.target.value;
    setStartDate(value);
    setEndDate(value);
  };

  const handleGenerateReport = () => {
    setShowReport(true);
  };

  const handleCloseReport = () => {
    setShowReport(false);
  };

  const handleAddEmployee = () => {
    console.info("Add employee quick action triggered");
  };

  const handleManageAttendance = () => {
    console.info("Manage attendance quick action triggered");
  };

  const employeesByStatus = useMemo(
    () => {
      const buckets = buildEmployeesByStatus(wards);

      // Filter supervisors by city if selected
      let filteredSups = supervisors;
      if (!isAdmin) {

        const wardIds = new Set(
          wards.map((w) => String(w.ward_id))
        );

        const supervisorIds = new Set(
          assignments
            .filter((a) => wardIds.has(String(a.ward_id)))
            .map((a) => String(a.supervisor_id))
        );

        filteredSups = supervisors.filter((s) =>
          supervisorIds.has(String(s.user_id))
        );
      }
      if (selectedCityId && selectedCityId !== "ALL") {
        const currentCityStr = String(selectedCityId);
        const cityObj = cities.find(c => String(c.city_id) === currentCityStr);
        const cityName = cityObj ? cityObj.city_name : null;

        filteredSups = supervisors.filter(s => {
          if (cityName && resolveSupervisorCityInDashboard(s, assignments, wards).toLowerCase() === cityName.toLowerCase()) return true;
          if (String(s.city_id) === currentCityStr) return true;
          return false;
        });
      }

      buckets.supervisors = filteredSups.map(s => {
        const cityName = resolveSupervisorCityInDashboard(s, assignments, wards);
        return {
          id: `sup-${s.user_id}`,
          displayName: s.name,
          empCode: s.emp_code,
          ward: assignments.filter(a => String(a.supervisor_id) === String(s.user_id))
            .map(a => {
              const w = wards.find(wd => String(wd.ward_id) === String(a.ward_id));
              return w ? w.ward_name : null;
            }).filter(Boolean).join(", "),
          city: cityName !== "N/A" ? cityName : ""
        };
      }).sort((a, b) => a.displayName.localeCompare(b.displayName));
      console.log(
        "Supervisor List Employees:",
        buckets.supervisors.length,
        buckets.supervisors.map(s => ({
          id: s.id,
          name: s.displayName
        }))
      );
      return buckets;
    },
    [wards, supervisors, assignments, selectedCityId, cities]
  );
  const bestZone = useMemo(() => {
    const zoneMap = {};

    wards.forEach((ward) => {
      const zone = ward.zone || "Unknown Zone";

      if (!zoneMap[zone]) {
        zoneMap[zone] = {
          zone,
          present: 0,
          total: 0,
        };
      }

      (ward.employees || []).forEach((emp) => {
        const status = (emp.attendance_status || "").toLowerCase();

        if (
          status === "marked" ||
          status.includes("progress")
        ) {
          zoneMap[zone].present++;
        }

        zoneMap[zone].total++;
      });
    });

    return Object.values(zoneMap)
      .map((z) => ({
        ...z,
        percentage:
          z.total > 0
            ? ((z.present / z.total) * 100).toFixed(1)
            : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)[0];
  }, [wards]);

  const lowPerformanceZones = useMemo(() => {
    const zoneMap = {};

    wards.forEach((ward) => {
      const zone = ward.zone || "Unknown Zone";

      if (!zoneMap[zone]) {
        zoneMap[zone] = {
          present: 0,
          total: 0,
        };
      }

      (ward.employees || []).forEach((emp) => {
        const status = (emp.attendance_status || "").toLowerCase();

        if (
          status === "marked" ||
          status.includes("progress")
        ) {
          zoneMap[zone].present++;
        }

        zoneMap[zone].total++;
      });
    });

    return Object.values(zoneMap).filter((z) => {
      const p =
        z.total > 0
          ? (z.present / z.total) * 100
          : 0;

      return p < 50;
    }).length;
  }, [wards]);
  const bestWardData = useMemo(() => {
    const wardMap = {};

    wards.forEach((ward) => {
      const name =
        ward.ward_name || "Unknown Ward";

      if (!wardMap[name]) {
        wardMap[name] = {
          ward: name,
          present: 0,
          total: 0,
        };
      }

      (ward.employees || []).forEach((emp) => {
        const status = (emp.attendance_status || "").toLowerCase();

        if (
          status === "marked" ||
          status.includes("progress")
        ) {
          wardMap[name].present++;
        }

        wardMap[name].total++;
      });
    });

    return Object.values(wardMap)
      .map((w) => ({
        ...w,
        percentage:
          w.total > 0
            ? ((w.present / w.total) * 100).toFixed(1)
            : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)[0];
  }, [wards]);

  const attendanceChange = 0;

  const faceScopedData = useMemo(
    () => buildFaceScopedDashboardData(wards),
    [wards]
  );

  const handleStatusCardClick = (statusKey) => {
    if (statusKey === "scrollToReports") {
      const el = document.getElementById("reports-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    if (statusKey === "total") {
      navigate("/employees");
      return;
    }
    if (statusKey && employeesByStatus[statusKey]) {
      setStatusModalKey(statusKey);
    }
  };

  const handleCloseEmployeeModal = () => {
    setStatusModalKey(null);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchCities = async () => {
      setCityLoading(true);
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(ALLOWED_CITIES_ENDPOINT, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const payload = await parseJsonResponse(response);

        if (!response.ok) {
          throw new Error(
            payload?.error || payload?.message || "Unable to load cities."
          );
        }

        const cityList = Array.isArray(payload?.cities) ? payload.cities : [];
        const scopeAll = Boolean(payload?.all);

        if (!cancelled) {
          setCities(cityList);
          setCityScopeAll(scopeAll);

          if (scopeAll) {
            setSelectedCityId((previous) =>
              previous === null || previous === undefined ? "ALL" : previous
            );
            return;
          }

          if (cityList.length === 1) {
            setSelectedCityId(cityList[0].city_id);
            return;
          }

          if (cityList.length > 1) {
            setSelectedCityId((previous) => {
              const numeric = Number(previous);
              if (
                Number.isFinite(numeric) &&
                cityList.some((city) => city.city_id === numeric)
              ) {
                return numeric;
              }
              return cityList[0].city_id;
            });
            return;
          }

          setSelectedCityId(null);
        }
      } catch (cityError) {
        console.error("Failed to fetch cities:", cityError);
        if (!cancelled) {
          setError((prev) =>
            prev
              ? prev
              : cityError.message || "Failed to load cities for filter."
          );
          setCities([]);
          setCityScopeAll(false);
          setSelectedCityId(null);
        }
      } finally {
        if (!cancelled) {
          setCityLoading(false);
        }
      }
    };

    fetchCities();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSummary(null);
      setWards([]);
      setSelectedSupervisorId(null);
      setSelectedCityId(null);
      return;
    }

    if (isAdmin) {
      setSelectedSupervisorId((previous) =>
        previous === null || previous === undefined ? "ALL" : previous
      );
      return;
    }

    setSelectedSupervisorId(user.user_id);
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const fetchSupervisors = async () => {
      setSupervisorLoading(true);
      try {
        const token = localStorage.getItem("token");
        const queryParam =
          selectedCityId && selectedCityId !== "ALL"
            ? `?cityId=${selectedCityId}`
            : "";

        const [supResponse, assignResponse] = await Promise.all([
          fetch(`${SUPERVISORS_ENDPOINT}${queryParam}`, {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }),
          fetch(ASSIGNED_WARDS_ENDPOINT, {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })
        ]);

        const payload = await parseJsonResponse(supResponse);
        const assignPayload = await parseJsonResponse(assignResponse);

        if (!supResponse.ok) {
          throw new Error(
            payload?.error || payload?.message || "Unable to load supervisors."
          );
        }

        const supervisorList = Array.isArray(payload) ? payload : [];
        const assignmentList = Array.isArray(assignPayload) ? assignPayload.map(a => ({
          supervisor_id: String(a.user_id),
          ward_id: String(a.ward_id),
          city_id: String(a.city_id)
        })) : [];

        if (!cancelled) {
          setSupervisors(supervisorList);
          setAssignments(assignmentList);
          if (isAdmin) {
            setSelectedSupervisorId((previous) => {
              if (previous === "ALL") {
                return "ALL";
              }

              if (
                typeof previous === "number" &&
                supervisorList.some((item) => item.user_id === previous)
              ) {
                return previous;
              }

              return "ALL";
            });
          }
        }
      } catch (fetchError) {
        console.error("Failed to fetch supervisors:", fetchError);
        if (!cancelled) {
          setError((prev) =>
            prev
              ? prev
              : fetchError.message || "Failed to fetch supervisors."
          );
          setSupervisors([]);
          if (isAdmin) {
            setSelectedSupervisorId("ALL");
          }
        }
      } finally {
        if (!cancelled) {
          setSupervisorLoading(false);
        }
      }
    };

    fetchSupervisors();

    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, selectedCityId]);

  useEffect(() => {
    if (isAdmin && (selectedCityId === "ALL" || selectedCityId === null)) {
      setSelectedSupervisorId("ALL");
    }
  }, [selectedCityId, isAdmin]);

  useEffect(() => {
    setError(null);
  }, [selectedCityId, selectedSupervisorId, startDate, endDate]);

  useEffect(() => {
    setReportVersion((version) => version + 1);
  }, [summary, wards, citySummary, selectedKothiIds]);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      let normalizedUserId = null;
      if (
        selectedSupervisorId !== null &&
        selectedSupervisorId !== undefined &&
        selectedSupervisorId !== "ALL"
      ) {
        normalizedUserId =
          typeof selectedSupervisorId === "number"
            ? selectedSupervisorId
            : Number(selectedSupervisorId);
        if (!Number.isFinite(normalizedUserId)) {
          normalizedUserId = null;
        }
      }

      let normalizedCityId = null;
      if (
        selectedCityId !== null &&
        selectedCityId !== undefined &&
        selectedCityId !== "ALL"
      ) {
        normalizedCityId =
          typeof selectedCityId === "number"
            ? selectedCityId
            : Number(selectedCityId);
        if (!Number.isFinite(normalizedCityId)) {
          normalizedCityId = null;
        }
      }

      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const body = JSON.stringify({
        user_id: normalizedUserId,
        city_id: normalizedCityId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        kothiIds:
          Array.isArray(selectedKothiIds) && selectedKothiIds.length > 0
            ? selectedKothiIds.map(Number).filter(Number.isFinite)
            : undefined,
      });

      try {
        const [summaryResponse, wardsResponse, kothiListResponse] = await Promise.all([
          fetch(SUMMARY_ENDPOINT, { method: "POST", headers, body }),
          fetch(WARDS_ENDPOINT, { method: "POST", headers, body }),
          fetch(
            `${KOTHI_LIST_ENDPOINT}?city_id=${normalizedCityId !== null && normalizedCityId !== undefined
              ? normalizedCityId
              : ""
            }`,
            { headers }
          ),
        ]);

        const summaryPayload = await parseJsonResponse(summaryResponse);
        const wardsPayload = await parseJsonResponse(wardsResponse);
        const kothiListPayload = await parseJsonResponse(kothiListResponse);

        if (!summaryResponse.ok || summaryPayload?.success === false) {
          throw new Error(
            summaryPayload?.error ||
            summaryPayload?.message ||
            "Unable to load summary."
          );
        }

        if (!wardsResponse.ok || wardsPayload?.success === false) {
          throw new Error(
            wardsPayload?.error ||
            wardsPayload?.message ||
            "Unable to load ward data."
          );
        }

        const summaryData = mapSummaryPayload(
          summaryPayload?.data ?? summaryPayload
        );
        const wardCollection = Array.isArray(wardsPayload?.data)
          ? wardsPayload.data
          : Array.isArray(wardsPayload)
            ? wardsPayload
            : [];

        if (!cancelled) {
          setSummary(summaryData);

          setWards(wardCollection);
          // Prefer backend kothi list; fallback to wardCollection if empty
          let kothiList = Array.isArray(kothiListPayload?.data)
            ? kothiListPayload.data
            : Array.isArray(kothiListPayload)
              ? kothiListPayload
              : [];
          if (!kothiList.length) {
            const uniqueKothis = [];
            const seen = new Set();
            wardCollection.forEach((w) => {
              const id = w?.ward_id ?? w?.wardId;
              const name = w?.ward_name ?? w?.wardName ?? `Ward ${id}`;
              if (id && !seen.has(id)) {
                seen.add(id);
                uniqueKothis.push({ id, name });
              }
            });
            kothiList = uniqueKothis;
          }
          kothiList.sort((a, b) =>
            (a.name || a.ward_name || "").toLowerCase().localeCompare(
              (b.name || b.ward_name || "").toLowerCase()
            )
          );
          setKothiOptions(
            kothiList.map((k) => ({
              id: k.id ?? k.ward_id ?? k.wardId,
              name: k.name ?? k.ward_name ?? k.wardName ?? `Ward ${k.id ?? k.ward_id}`,
            }))
          );
        }

        try {
          const citySummaryResponse = await fetch(CITY_SUMMARY_ENDPOINT, {
            method: "POST",
            headers,
            body,
          });
          const citySummaryPayload = await parseJsonResponse(
            citySummaryResponse
          );

          if (!cancelled) {
            if (
              citySummaryResponse.ok &&
              citySummaryPayload &&
              citySummaryPayload.success !== false
            ) {
              const normalizedCitySummary = Array.isArray(
                citySummaryPayload?.data
              )
                ? citySummaryPayload.data
                : Array.isArray(citySummaryPayload)
                  ? citySummaryPayload
                  : [];
              setCitySummary(normalizedCitySummary);
            } else {
              console.warn(
                "City summary unavailable:",
                citySummaryPayload?.error || citySummaryPayload
              );
              setCitySummary([]);
            }
          }
        } catch (citySummaryError) {
          console.warn("Failed to load city summary:", citySummaryError);
          if (!cancelled) {
            setCitySummary([]);
          }
        }

        if (!cancelled) {
          setLastUpdated(new Date());
        }
      } catch (requestError) {
        console.error("Failed to load dashboard data:", requestError);
        if (!cancelled) {
          setError(requestError.message || "Failed to load dashboard data.");
          setSummary(null);
          setWards([]);
          setCitySummary([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [selectedSupervisorId, selectedCityId, startDate, endDate, refreshCounter]);

  const handleRefresh = () => {
    setError(null);
    setIsRefreshing(true);
    setRefreshCounter((value) => value + 1);
  };
  const handleDownloadPDF = async () => {
    try {

      const element = document.body;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);

      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = 210;
      const pdfHeight = 297;

      const imgWidth = pdfWidth;

      const imgHeight =
        (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;

      let position = 0;

      // FIRST PAGE
      pdf.addImage(
        imgData,
        "JPEG",
        0,
        position,
        imgWidth,
        imgHeight
      );

      heightLeft -= pdfHeight;

      // MULTIPLE PAGES
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;

        pdf.addPage();

        pdf.addImage(
          imgData,
          "JPEG",
          0,
          position,
          imgWidth,
          imgHeight
        );

        heightLeft -= pdfHeight;
      }

      pdf.save("Dashboard_Report.pdf");

    } catch (error) {
      console.error("PDF Download Error:", error);
    }
  };
  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return {
        greeting: "Good Morning",
        icon: <Sunrise size={34} className="text-orange-500" />,
        subtitle: "Here's what's happening with your workforce today.",
        banner: Morning,

      };
    }

    if (hour >= 12 && hour < 17) {
      return {
        greeting: "Good Afternoon",
        icon: <Sun size={34} className="text-yellow-500" />,
        subtitle: "Here's What Happening with Your Workforce today.",
        banner: Afternoon,

      };
    }

    if (hour >= 17 && hour < 21) {
      return {
        greeting: "Good Evening",
        icon: <Sunset size={34} className="text-pink-500" />,
        subtitle: "Review today's workforce performance and pending actions.",
        banner: Evening,
      };
    }

    return {
      greeting: "Good Night",
      icon: <MoonStar size={34} className="text-indigo-400" />,
      subtitle: "Today's operations are almost complete.",
      banner: Night,
    };
  };

  const { greeting, subtitle, icon, banner } = getGreeting();
  const userName =
    user?.name ||
    user?.full_name ||
    "Admin";
  const headline = isAdmin ? "Admin Attendance Analytics Dashboard Dashboard" : "Attendance Analytics Dashboard";
  const selectedCity = useMemo(() => {
    if (selectedCityId === "ALL" || selectedCityId === null) {
      return null;
    }

    const numericCityId =
      typeof selectedCityId === "number"
        ? selectedCityId
        : Number(selectedCityId);

    if (!Number.isFinite(numericCityId)) {
      return null;
    }

    return cities.find((item) => item.city_id === numericCityId) || null;
  }, [selectedCityId, cities]);
  const selectedSupervisor = useMemo(() => {
    if (!isAdmin && user) {
      return user;
    }

    if (selectedSupervisorId === "ALL" || selectedSupervisorId === null) {
      return null;
    }

    const numericId =
      typeof selectedSupervisorId === "number"
        ? selectedSupervisorId
        : Number(selectedSupervisorId);

    if (!Number.isFinite(numericId)) {
      return null;
    }

    return supervisors.find((item) => item.user_id === numericId) || null;
  }, [selectedSupervisorId, supervisors, user, isAdmin]);

  const cityCount = cities.length;
  const singleCityMode = !cityScopeAll && cityCount === 1;
  const showCityFilter = cityScopeAll || cityCount > 0;

  const filteredSupervisorCount = useMemo(() => {

    // Supervisor Login
    if (!isAdmin) {
      return employeesByStatus?.supervisors?.length || 0;
    }
    // Admin Login
    if (!selectedCityId || selectedCityId === "ALL") {
      return supervisors.length;
    }

    const currentCityIdStr = String(selectedCityId);

    const supervisorsInCity = supervisors.filter((s) => {
      const supId = String(s.user_id);

      const hasAssignmentInCity = assignments.some(
        (a) =>
          a.supervisor_id === supId &&
          a.city_id === currentCityIdStr
      );

      if (hasAssignmentInCity) return true;

      return String(s.city_id) === currentCityIdStr;
    });

    return supervisorsInCity.length;

  }, [supervisors, assignments, selectedCityId, isAdmin, wards]);
  console.log("Supervisor Card Count =", filteredSupervisorCount);
  console.log(
    "Supervisor List Count =",
    employeesByStatus?.supervisors?.length
  );
  const displaySummary = useMemo(() => {
    const base = summary || {};
    return {
      ...base,
      // marked: faceScopedData.faceSummary.marked,
      // inProgress: faceScopedData.faceSummary.inProgress,
      // midShiftPunchIn: faceScopedData.faceSummary.midShiftPunchIn,
      // onLeave: faceScopedData.faceSummary.onLeave,
      // notMarked: faceScopedData.faceSummary.notMarked,
      // attendanceRate: faceScopedData.faceSummary.attendanceRate,
      totalFaceRegistered: faceScopedData.totalFaceRegistered,
      totalSupervisors: Number.isFinite(filteredSupervisorCount) ? filteredSupervisorCount : 0,
    };
  }, [summary, faceScopedData, filteredSupervisorCount]);
  const headerAttendancePercent = Number.isFinite(displaySummary?.attendanceRate)
    ? displaySummary.attendanceRate
    : 0;

  let supervisorLabel = "";

  if (selectedSupervisorId === "ALL" && isAdmin) {
    supervisorLabel = selectedCity
      ? `Viewing all supervisors in ${selectedCity.city_name}.`
      : "Viewing all supervisors across all cities.";
  } else if (selectedSupervisor) {
    const baseLabel = `${selectedSupervisor.name ?? "Supervisor"}${selectedSupervisor.emp_code ? ` • ${selectedSupervisor.emp_code}` : ""
      }`;
    supervisorLabel = selectedCity
      ? `${baseLabel} • ${selectedCity.city_name}`
      : baseLabel;
  } else if (isAdmin) {
    supervisorLabel = selectedCity
      ? `Select a supervisor in ${selectedCity.city_name} to view their data.`
      : "Select a supervisor to view their data.";
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-3 mx-auto space-y-6">
      {isRefreshing && <Loader />}
      <div
        className="relative overflow-hidden rounded-2xl h-36 flex items-center px-10 shadow-md"
        style={{
          backgroundImage: `url(${banner})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Optional overlay */}
        <div className="absolute inset-0 bg-white/15 backdrop-blur-[1px]" />

        <div className="relative z-10 flex items-center gap-4">
          {icon}

          <div>
            <h1
              className="text-4xl font-black italic bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent"
              style={{
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {greeting}, {userName}! 👋
            </h1>

            <p className="text-slate-700 font-medium">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
      <div className="
bg-white
dark:bg-slate-900

rounded-2xl

shadow-sm
dark:shadow-slate-950/30

border
border-slate-200
dark:border-slate-700

p-5
mb-6

flex
flex-col

relative
overflow-visible
">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-2xl"></div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mt-1">
          <div>
            <div className="
flex
items-center
gap-2

text-2xl
font-black

text-slate-800
dark:text-white

tracking-tight
">
              <GaugeCircle size={24} className="text-blue-600" />
              <span>{headline}</span>
            </div>
            {supervisorLabel && (
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{supervisorLabel}</p>
            )}
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
              Total Attendance: {headerAttendancePercent.toFixed(1)}%
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-3">
              {!isAdmin && cities.length > 0 && (
                singleCityMode || cities.length === 1 ? (
                  <span className="
inline-flex
items-center
gap-1.5

px-2.5
py-0.5

rounded-md

text-xs
font-semibold

bg-blue-50
dark:bg-blue-900/30

text-blue-700
dark:text-blue-300

border
border-blue-100
dark:border-blue-800

shadow-sm
">
                    <MapPin size={12} />
                    {cities[0]?.city_name}
                  </span>
                ) : (
                  <div className="
flex
items-center

bg-slate-50
dark:bg-slate-800

rounded-md

border
border-slate-200
dark:border-slate-700

overflow-hidden
shadow-sm
">
                    <span className="
pl-2
pr-1
py-1

text-[10px]
font-bold

text-slate-500
dark:text-slate-400

tracking-wider
uppercase
"><MapPin size={10} className="inline mr-1 mb-0.5" />City</span>
                    <select
                      className="
text-xs
font-semibold

border-none
bg-transparent

py-1
pr-6

focus:ring-0

text-slate-700
dark:text-white

dark:bg-slate-800

cursor-pointer
"
                      value={selectedCityId === null || selectedCityId === undefined ? (cityScopeAll ? "ALL" : "") : String(selectedCityId)}
                      onChange={(event) => {
                        const { value } = event.target;
                        if (!value || value === "ALL") setSelectedCityId(cityScopeAll ? "ALL" : null);
                        else {
                          const parsed = Number(value);
                          setSelectedCityId(Number.isFinite(parsed) ? parsed : cityScopeAll ? "ALL" : null);
                        }
                      }}
                      disabled={cityLoading}
                    >
                      {cityScopeAll && <option
                        value="ALL"
                        className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      >
                        All Cities
                      </option>}
                      {cityLoading && <option
                        value=""
                        className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      >
                        Loading...
                      </option>}
                      {!cityLoading && cities.map((city) => (
                        <option
                          key={city.city_id}
                          value={city.city_id}
                          className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                        >
                          {city.city_name}
                        </option>))}
                    </select>
                  </div>
                )
              )}
              {lastUpdated && (
                <div className="
flex
items-center
gap-1.5

text-xs
font-semibold

text-slate-400
dark:text-slate-500

bg-slate-50
dark:bg-slate-800

px-2
py-1

rounded-md

border
border-slate-100
dark:border-slate-700
">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  Updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative group w-full sm:w-auto">
              {showDateInstruction && (
                <div className="
absolute
-top-10
left-1/2
-translate-x-1/2

whitespace-nowrap

bg-white
dark:bg-slate-900

text-blue-600
dark:text-blue-300

text-[10px]
font-bold

px-2.5
py-1.5

rounded-lg

shadow-xl

animate-bounce
pointer-events-none
z-10

border
border-blue-100
dark:border-slate-700
">
                  ➕ APPLY DATE FOR OVERALL DATA
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-blue-100"></div>
                </div>
              )}
              <div className="
flex
items-center

bg-slate-50
dark:bg-slate-800

border
border-indigo-200
dark:border-slate-700

ring-2
ring-indigo-500/10

rounded-lg
p-1

shadow-sm

w-full
sm:w-auto

hover:border-indigo-400
dark:hover:border-slate-600

transition-colors
">
                <input
                  id="date-selector"
                  type="date"
                  className="
w-full
sm:w-[150px]

bg-transparent

text-sm
font-bold

text-slate-700
dark:text-white

px-3
py-1.5

focus:outline-none
cursor-pointer
"                  value={startDate}
                  onChange={handleDateChange}
                  title="Select Analysis Date"
                />
              </div>
            </div>
            <button
              onClick={handleDownloadPDF}
              className="
w-full
sm:w-auto

flex
items-center
justify-center
gap-2

px-5
py-2.5

bg-indigo-600
hover:bg-indigo-700

text-white
text-sm
font-semibold

rounded-lg

shadow

transition-all
active:scale-95
"
            >
              <Download size={16} />
              Download PDF
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-lg shadow hover:bg-slate-700 hover:shadow-md transition-all active:scale-95 ${isRefreshing ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              {isRefreshing && <Loader2 size={16} className="animate-spin" />}
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {showCityFilter && isAdmin && (
          <div className="
mt-5
pt-4

border-t
border-slate-100
dark:border-slate-700

grid
gap-4
md:grid-cols-2
">
            <div className="flex-1">
              <label htmlFor="city-filter" className="
block

text-xs
font-semibold

text-slate-500
dark:text-slate-400

mb-1.5

uppercase
tracking-wider
">
                Admin City Scope
              </label>
              <select
                id="city-filter"
                className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-lg

px-3
py-2

text-sm
font-medium

text-slate-800
dark:text-white

bg-slate-50
dark:bg-slate-800

hover:bg-white
dark:hover:bg-slate-700

focus:outline-none
focus:ring-2
focus:ring-blue-500/20
focus:border-blue-500

transition-all
cursor-pointer
shadow-sm
"                value={
                  selectedCityId === null || selectedCityId === undefined
                    ? cityScopeAll ? "ALL" : ""
                    : String(selectedCityId)
                }
                onChange={(event) => {
                  const { value } = event.target;
                  if (!value || value === "ALL") {
                    setSelectedCityId(cityScopeAll ? "ALL" : null);
                  } else {
                    const parsed = Number(value);
                    setSelectedCityId(Number.isFinite(parsed) ? parsed : cityScopeAll ? "ALL" : null);
                  }
                }}
                disabled={cityLoading || singleCityMode}
              >
                {cityScopeAll && <option value="ALL">All Cities</option>}
                {cityLoading && <option value="">Loading cities...</option>}
                {!cityLoading && cities.map((city) => (
                  <option
                    key={city.city_id}
                    value={city.city_id}
                    className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  >
                    {city.city_name}
                  </option>))}
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="supervisor-filter" className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Admin Supervisor View
              </label>
              <select
                id="supervisor-filter"
                className="w-full

border
border-slate-300
dark:border-slate-700

rounded-lg

px-3
py-2

text-sm
font-medium

text-slate-800
dark:text-white

bg-slate-50
dark:bg-slate-800

hover:bg-white
dark:hover:bg-slate-700

focus:outline-none
focus:ring-2
focus:ring-blue-500/20
focus:border-blue-500

transition-all
cursor-pointer
shadow-sm
"
                value={
                  selectedSupervisorId === null || selectedSupervisorId === undefined
                    ? "" : String(selectedSupervisorId)
                }
                onChange={(event) => {
                  const { value } = event.target;
                  if (!value) {
                    setSelectedSupervisorId(null);
                  } else if (value === "ALL") {
                    setSelectedSupervisorId("ALL");
                  } else {
                    const parsed = Number(value);
                    setSelectedSupervisorId(Number.isFinite(parsed) ? parsed : null);
                  }
                }}
                disabled={supervisorLoading}
              >
                <option value="ALL">All Supervisors</option>
                {supervisorLoading && <option value="">Loading supervisors...</option>}
                {!supervisorLoading && supervisors.length === 0 && <option value="">No supervisors found.</option>}
                {!supervisorLoading && supervisors.map((supervisor) => (
                  <option key={supervisor.user_id} value={supervisor.user_id}>
                    {supervisor.name} {supervisor.emp_code ? `(${supervisor.emp_code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <DashboardStats
        summary={displaySummary}

        loading={loading}
        showSupervisorStat={isAdmin}
        supervisorCount={filteredSupervisorCount}
        supervisorLoading={supervisorLoading}
        onStatusClick={handleStatusCardClick}
        supervisorMode={!isAdmin}
      />
      {/* {isAdmin && (
        <AttendanceChart
          summary={summary}
          wards={wards}
          loading={loading}
        />
      )} */}

      {/* <CityAttendanceLineChart
        citySummary={faceScopedData.faceCitySummary}
        loading={loading}
        dashboardPayload={{
          user_id: selectedSupervisorId !== "ALL" ? selectedSupervisorId : null,
          startDate,
          endDate,
        }}
      />

      {!isAdmin && (wards || []).length > 0 && (
        <div className="mb-2">
          <KothiRoleChart wards={wards} />
        </div>
      )} */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <div className="xl:col-span-2">
          <AttendanceTrendChart
            dashboardPayload={{
              user_id:
                selectedSupervisorId !== "ALL"
                  ? selectedSupervisorId
                  : null,
              city_id:
                selectedCityId === "ALL"
                  ? null
                  : selectedCityId,
              startDate,
              endDate,
            }}
          />
        </div>

        <div className="xl:col-span-1">
          <LiveInsightsCard
            summary={summary}
            attendanceChange={attendanceChange}
            {...liveInsights}
            leaveInsight={liveInsights.leaveInsight}
            midPunchInsight={liveInsights.midPunchInsight}
          />
        </div>

      </div>
      {/* <CityAttendanceLineChart
        citySummary={citySummary}
        loading={loading}
        summary={summary}
        dashboardPayload={{
          user_id:
            selectedSupervisorId !== "ALL"
              ? selectedSupervisorId
              : null,
          startDate,
          endDate,
        }}
      /> */}
      <div className="grid grid-cols-1 xl:grid-cols-1gap-4 items-start">


        {/* {!isAdmin && (wards || []).length > 0 && (
          <div>
            <KothiRoleChart wards={wards} />
          </div>
        )} */}
      </div>
      <div id="reports-section">
        <ReportDashboard
          citySummary={faceScopedData.faceCitySummary}
          wards={wards}
          summary={summary}
          dateRangeLabel={dateRangeLabel}
          selectedCity={selectedCity}
          selectedSupervisor={selectedSupervisor}
          isAdmin={isAdmin}
          isInline={true}
          startDate={startDate}
          endDate={endDate}
          selectedCityId={selectedCityId}
          refreshKey={refreshCounter}
          onInsightsChange={handleInsightsChange}


        />
      </div>

      {statusModalKey && (
        <EmployeeStatusModal
          statusKey={statusModalKey}
          employees={employeesByStatus[statusModalKey] || []}
          onClose={handleCloseEmployeeModal}
        />
      )}



    </div>
  );
}

export default Dashboard;
