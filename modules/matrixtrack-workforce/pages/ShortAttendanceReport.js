import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Download, FileDown, FileText, Filter, RefreshCw, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";
import Loader from "../components/Loader";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import API_BASE_URL, { ALLOWED_CITIES_ENDPOINT } from "../config";
import { useAuth } from "../AuthContext";

const apiUrl = `${API_BASE_URL}/api`;
const TABLE_HEADERS = [
  "City Name",
  "Zone Name",
  "Ward Name",
  "Kothi Name",
  "Supervisor Names",
  "Registered",
  "Punched In",
  "Not Punched",
  "On Leave",
  "Attendance %",
];

const getTodayInIST = () => {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
};

const buildRequestConfig = () => {
  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return { withCredentials: true, headers };
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return value;
};

const sanitizeForCsv = (value) => {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
  return stringValue;
};

const extractZoneNumber = (zoneName = "") => {
  const match = zoneName.match(/zone\s*[-:]?\s*(\d+)/i);
  if (match && match[1]) return match[1].trim();
  return zoneName.trim() || "N/A";
};

const formatDateForMessage = (date) => {
  if (!date) return "";
  const safeDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(safeDate.getTime())) return date;
  return safeDate.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  });
};

const SHORT_DEPT_LABELS = [
  { label: "PMC", regex: /pmc/i },
  { label: "Outsource", regex: /outsource/i },
  { label: "Ramp", regex: /ramp/i },
  { label: "HMS", regex: /hms/i },
  { label: "Swach", regex: /swach/i },
];

const compressDepartments = (departments = []) => {
  const hits = [];
  departments.forEach((dept) => {
    SHORT_DEPT_LABELS.forEach(({ label, regex }) => {
      if (regex.test(dept) && !hits.includes(label)) hits.push(label);
    });
  });
  if (!hits.length && departments.length) hits.push("Other");
  return hits.length ? hits.join(", ") : "N/A";
};

const allocateCountsToMap = (targetMap, departments, present, absent) => {
  const targetDepartments = departments.length ? departments : ["Unassigned"];
  const count = targetDepartments.length;
  const basePresent = Math.floor(present / count);
  const presentRemainder = present - basePresent * count;
  const baseAbsent = Math.floor(absent / count);
  const absentRemainder = absent - baseAbsent * count;
  targetDepartments.forEach((dept, index) => {
    if (!targetMap.has(dept)) targetMap.set(dept, { present: 0, absent: 0 });
    const entry = targetMap.get(dept);
    entry.present += basePresent + (index < presentRemainder ? 1 : 0);
    entry.absent += baseAbsent + (index < absentRemainder ? 1 : 0);
  });
};

const chunkArray = (arr, size = 30) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

// ─── Same auto-punch-out detection as AttendanceReports ───────────────────────
const isAutoPunchOutRecord = (record) => {
  if (!record) return false;
  const isTruthyFlag = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    return ["true", "1", "yes", "y"].includes(String(value ?? "").trim().toLowerCase());
  };
  if (isTruthyFlag(record.is_auto_punch_out) || isTruthyFlag(record.auto_punched_out)) return true;
  return String(record.out_address || "").toLowerCase().includes("auto punch-out");
};

const ShortAttendanceReport = () => {
  const { logPageView, logAction } = useAuth();
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [wards, setWards] = useState([]);
  const [employees, setEmployees] = useState([]); // ← NEW: same employee list as AttendanceReports
  const [attendanceRecords, setAttendanceRecords] = useState([]); // ← NEW: raw attendance records
  const [selectedCityId, setSelectedCityId] = useState("all");
  const [selectedZoneId, setSelectedZoneId] = useState("all");
  const [selectedWardId, setSelectedWardId] = useState("all");
  const [selectedKothiIds, setSelectedKothiIds] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayInIST());
  const [reportRows, setReportRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isManualReloading, setIsManualReloading] = useState(false);
  const [error, setError] = useState("");
  const [filtersReady, setFiltersReady] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [whatsAppContainers, setWhatsAppContainers] = useState([]);
  const [whatsAppCumulativeContainers, setWhatsAppCumulativeContainers] = useState([]);
  const [whatsAppZoneContainers, setWhatsAppZoneContainers] = useState([]);
  const [whatsAppError, setWhatsAppError] = useState("");
  const [isWhatsAppLoading, setIsWhatsAppLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [cityScopeAll, setCityScopeAll] = useState(false);
  const [schedulePhone, setSchedulePhone] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleStatus, setScheduleStatus] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [isKothiDropdownOpen, setIsKothiDropdownOpen] = useState(false);
  const [kothiSearch, setKothiSearch] = useState("");
  const scheduleTimerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isKothiDropdownOpen && !event.target.closest(".kothi-dropdown-container")) {
        setIsKothiDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isKothiDropdownOpen]);

  // ─── Load filters + employees (same as AttendanceReports) ─────────────────
  useEffect(() => {
    const loadFilters = async (isManual = false) => {
      if (isManual) setIsManualReloading(true);
      try {
        const config = buildRequestConfig();
        const [citiesRes, zonesRes, sectorsRes, wardsRes, employeesRes] = await Promise.all([
          axios.get(ALLOWED_CITIES_ENDPOINT, config),
          axios.get(`${apiUrl}/zones`, config),
          axios.get(`${apiUrl}/sectors`, config),
          axios.get(`${apiUrl}/wards`, config),
          axios.get(`${apiUrl}/employees`, config), // ← NEW
        ]);

        const cityPayload = citiesRes.data || {};
        const cityList = Array.isArray(cityPayload.cities)
          ? cityPayload.cities
          : Array.isArray(cityPayload) ? cityPayload : [];
        const scopeAll = Boolean(cityPayload.all);
        setCityScopeAll(scopeAll);
        setCities(cityList);
        setZones(zonesRes.data || []);
        setEmployees(employeesRes.data || []); // ← NEW

        const flatSectors = (sectorsRes.data || []).flatMap((city) =>
          city.zones.flatMap((zone) =>
            zone.sectors.map((s) => ({
              sector_id: s.sectorId,
              sector_name: s.sectorName,
              zone_id: zone.zoneId,
              city_id: city.cityId,
            }))
          )
        );
        setSectors(flatSectors);

        const flatWards = (wardsRes.data || []).flatMap(city =>
          city.zones.flatMap(zone =>
            zone.wards.map(ward => ({
              ward_id: ward.wardId,
              ward_name: ward.wardName,
              sector_id: ward.sectorId || null,
              zone_id: zone.zoneId,
              city_id: city.cityId
            }))
          )
        );
        setWards(flatWards);
      } catch (err) {
        console.error("Error fetching filter metadata:", err);
        setError("Unable to load city, zone and ward options.");
      } finally {
        setFiltersReady(true);
        setIsManualReloading(false);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    logPageView("Short Attendance Report", "/short-attendance");
  }, [logPageView]);

  // ─── Fetch raw attendance records (same endpoint as AttendanceReports) ─────
  const fetchAttendanceRecords = useCallback(async () => {
    if (!selectedDate) return;
    try {
      const response = await axios.post(
        `${apiUrl}/attendance`,
        {},
        { ...buildRequestConfig(), params: { date: selectedDate } }
      );
      const normalized = Array.isArray(response.data)
        ? response.data.map((row) => ({ ...row, is_auto_punch_out: isAutoPunchOutRecord(row) }))
        : [];
      setAttendanceRecords(normalized);
    } catch (err) {
      console.error("Error fetching attendance records for stats:", err);
      setAttendanceRecords([]);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  useEffect(() => {
    const exists = cities.some((city) => String(city.city_id) === String(selectedCityId));
    if (!cities.length) { setSelectedCityId("all"); return; }
    if (exists || (selectedCityId === "all" && cityScopeAll)) return;
    if (cityScopeAll) setSelectedCityId("all");
    else if (cities.length > 0) setSelectedCityId(String(cities[0].city_id));
  }, [cities, selectedCityId, cityScopeAll]);

  useEffect(() => { setSelectedWardId("all"); }, [selectedZoneId]);

  const filteredSectors = useMemo(() => {
    if (!selectedZoneId || selectedZoneId === "all") {
      if (!selectedCityId || selectedCityId === "all") return sectors;
      return sectors.filter(s => String(s.city_id) === String(selectedCityId));
    }
    return sectors.filter(
      (s) => String(s.city_id) === String(selectedCityId) && String(s.zone_id) === String(selectedZoneId)
    );
  }, [sectors, selectedCityId, selectedZoneId]);
  useEffect(() => {
    if (!filteredSectors.length) {
      setSelectedWardId("all");
      return;
    }

    // Only one ward assigned -> select automatically
    if (filteredSectors.length === 1) {
      setSelectedWardId(String(filteredSectors[0].sector_id));
      return;
    }

    if (
      !filteredSectors.some(
        (s) => String(s.sector_id) === String(selectedWardId)
      )
    ) {
      setSelectedWardId("all");
    }
  }, [filteredSectors]);
  const filteredWards = useMemo(() => {
    return wards.filter((w) => {
      const matchesCity = !selectedCityId || selectedCityId === "all" || String(w.city_id) === String(selectedCityId);
      const matchesZone = !selectedZoneId || selectedZoneId === "all" || String(w.zone_id) === String(selectedZoneId);
      const matchesSector = !selectedWardId || selectedWardId === "all" || String(w.sector_id) === String(selectedWardId);
      return matchesCity && matchesZone && matchesSector;
    });
  }, [wards, selectedCityId, selectedZoneId, selectedWardId]);

  // ─── Stats computed exactly like AttendanceReports.registeredStats ─────────
  const reportSummaryStats = useMemo(() => {
    // 1. Scope employees by current filters
    let registered = employees;

    if (selectedCityId && selectedCityId !== "all") {
      const selectedCity = cities.find((c) => String(c.city_id) === String(selectedCityId));
      if (selectedCity) {
        registered = registered.filter(
          (e) => String(e.city || "").toLowerCase() === selectedCity.city_name.toLowerCase()
        );
      }
    }

    if (selectedZoneId && selectedZoneId !== "all") {
      const selectedZone = zones.find((z) => String(z.zone_id) === String(selectedZoneId));
      if (selectedZone) {
        registered = registered.filter(
          (e) => String(e.zone || "").toLowerCase() === selectedZone.zone_name.toLowerCase()
        );
      }
    }

    if (selectedWardId && selectedWardId !== "all") {
      const kothisInWard = wards
        .filter((w) => String(w.sector_id) === String(selectedWardId))
        .map((w) => w.ward_name.toLowerCase());
      if (kothisInWard.length > 0) {
        registered = registered.filter((e) =>
          kothisInWard.includes(String(e.ward || "").toLowerCase())
        );
      }
    }

    if (selectedKothiIds.length > 0) {
      const selectedKothiNames = wards
        .filter((w) => selectedKothiIds.includes(String(w.ward_id)))
        .map((w) => w.ward_name.toLowerCase());
      if (selectedKothiNames.length > 0) {
        registered = registered.filter((e) =>
          selectedKothiNames.includes(String(e.ward || "").toLowerCase())
        );
      }
    }

    const totalRegistered = registered.length;
    const registeredEmpIds = new Set(registered.map((e) => String(e.emp_id)));

    // 2. Scope attendance records to registered employees only
    const scopedRecords = attendanceRecords.filter((r) =>
      registeredEmpIds.has(String(r.emp_id ?? r.employee_id))
    );

    // 3. Build presence sets
    const presentIds = new Set(
      scopedRecords
        .filter((r) => r.punch_in || r.punch_in_time)
        .map((r) => String(r.emp_id ?? r.employee_id))
    );

    const completedRows = scopedRecords.filter(
      (r) => (r.punch_in || r.punch_in_time) && (r.punch_out || r.punch_out_time)
    );

    const punchOutModeByEmployee = new Map();
    completedRows.forEach((r) => {
      const id = String(r.emp_id ?? r.employee_id);
      if (!id) return;
      if (!punchOutModeByEmployee.has(id)) {
        punchOutModeByEmployee.set(id, isAutoPunchOutRecord(r) ? "auto" : "manual");
        return;
      }
      if (isAutoPunchOutRecord(r)) punchOutModeByEmployee.set(id, "auto");
    });

    const autoPunchedOutIds = new Set(
      Array.from(punchOutModeByEmployee.entries())
        .filter(([, mode]) => mode === "auto")
        .map(([id]) => id)
    );

    const manualPunchedOutIds = new Set(
      Array.from(punchOutModeByEmployee.entries())
        .filter(([, mode]) => mode === "manual")
        .map(([id]) => id)
    );

    const completedIds = new Set(
      completedRows.map((r) => String(r.emp_id ?? r.employee_id))
    );

    const midShiftIds = new Set(
      scopedRecords
        .filter((r) =>
          Boolean(
            r.mid_shift_punch_in ||
            r.mid_shift_punch_in_time ||
            r.mid_shift_punch_in_display ||
            r.mid_shift_punched_in_by ||
            r.mid_shift_punch_in_image ||
            r.latitude_mid_in ||
            r.mid_in_address
          )
        )
        .map((r) => String(r.emp_id ?? r.employee_id))
    );

    // ✅ onLeaveIds defined FIRST, then used below
    const onLeaveIds = new Set(
      scopedRecords
        .filter(r => r.leave_type && !(r.punch_in || r.punch_in_time))
        .map(r => String(r.emp_id ?? r.employee_id))
    );

    // 4. Compute final stats — all after their dependencies are declared
    const totalPresent = registered.filter((e) => presentIds.has(String(e.emp_id))).length;
    const totalAbsent = registered.filter(
      (e) => !presentIds.has(String(e.emp_id)) && !onLeaveIds.has(String(e.emp_id))
    ).length;
    const totalOnLeave = registered.filter((e) => onLeaveIds.has(String(e.emp_id))).length; // ✅ only once, after onLeaveIds
    const totalManualPunchOut = registered.filter((e) => manualPunchedOutIds.has(String(e.emp_id))).length;
    const totalAutoPunchOut = registered.filter((e) => autoPunchedOutIds.has(String(e.emp_id))).length;
    const totalCompletedPunchOut = registered.filter((e) => completedIds.has(String(e.emp_id))).length;
    const totalMidShiftPunchIn = registered.filter((e) => midShiftIds.has(String(e.emp_id))).length;

    return {
      totalRegistered,
      totalPresent,
      totalAbsent,
      totalOnLeave,
      totalMidShiftPunchIn,
      totalCompletedPunchOut,
      totalManualPunchOut,
      totalAutoPunchOut,
    };
  }, [
    employees,
    attendanceRecords,
    cities,
    zones,
    wards,
    selectedCityId,
    selectedZoneId,
    selectedWardId,
    selectedKothiIds,
  ]);

  useEffect(() => { setSelectedWardId("all"); }, [selectedZoneId]);

  useEffect(() => {
    const availableIds = filteredWards.map((w) => String(w.ward_id));
    if (!availableIds.length) { setSelectedKothiIds([]); return; }
    setSelectedKothiIds((prev) => {
      if (!prev.length) return availableIds;
      const valid = prev.filter((id) => availableIds.includes(String(id)));
      return valid.length ? valid : availableIds;
    });
  }, [filteredWards]);

  const handleKothiToggle = (kothiId) => {
    setSelectedKothiIds((prev) =>
      prev.includes(kothiId) ? prev.filter((id) => id !== kothiId) : [...prev, kothiId]
    );
  };

  const filteredZones = useMemo(() => {
    if (!selectedCityId || selectedCityId === "all") return zones;
    return zones.filter((zone) => String(zone.city_id) === String(selectedCityId));
  }, [zones, selectedCityId]);

  useEffect(() => {
    if (!filteredZones.length) {
      setSelectedZoneId("all");
      return;
    }

    // Only one zone assigned -> select automatically
    if (filteredZones.length === 1) {
      setSelectedZoneId(String(filteredZones[0].zone_id));
      return;
    }

    const alreadySelected = filteredZones.some(
      (zone) => String(zone.zone_id) === String(selectedZoneId)
    );

    if (!alreadySelected) {
      setSelectedZoneId("all");
    }
  }, [filteredZones]);

  const selectedCityName = useMemo(() => {
    if (!selectedCityId || selectedCityId === "all") return "";
    return cities.find((city) => String(city.city_id) === String(selectedCityId))?.city_name || "";
  }, [cities, selectedCityId]);

  const singleCityMode = !cityScopeAll && cities.length === 1;

  const selectedZoneName = useMemo(() => {
    if (!selectedZoneId || selectedZoneId === "all") return "";
    return zones.find((zone) => String(zone.zone_id) === String(selectedZoneId))?.zone_name || "";
  }, [zones, selectedZoneId]);

  const fetchReport = useCallback(async (isManual = false) => {
    if (isManual) setIsManualReloading(true);
    setIsLoading(true);
    setError("");
    try {
      let fetchTasks = [];
      let targetCities = cities;
      if (selectedCityId !== "all") {
        targetCities = cities.filter(c => String(c.city_id) === String(selectedCityId));
      }

      targetCities.forEach((city) => {
        if (!city.city_name) return;

        const isAllZones = selectedZoneId === "all";
        if (isAllZones) {
          const baseParams = {
            cityName: city.city_name,
            zoneName: "all",
            date: selectedDate,
          };

          if (selectedCityId && selectedCityId !== "all") {
            baseParams.cityId = selectedCityId;
            baseParams.city_id = selectedCityId;
          }
          if (selectedWardId && selectedWardId !== "all") {
            baseParams.sectorId = selectedWardId;
            baseParams.sector_id = selectedWardId;
          }

          const totalAvailableKothiIds = filteredWards.map(w => String(w.ward_id));
          const allKothisSelected = totalAvailableKothiIds.length > 0 &&
            totalAvailableKothiIds.every(id => selectedKothiIds.map(String).includes(id));

          if (!allKothisSelected && selectedKothiIds.length > 0) {
            const chunks = chunkArray(selectedKothiIds, 40);
            chunks.forEach((chunk) => {
              const joined = chunk.join(",");
              fetchTasks.push({ ...baseParams, kothiId: joined, kothi_id: joined, kothiIds: joined, ward_id: joined });
            });
          } else {
            fetchTasks.push(baseParams);
          }
        } else {
          let targetZones = zones.filter(z => String(z.city_id) === String(city.city_id));
          targetZones = targetZones.filter(z => String(z.zone_id) === String(selectedZoneId));

          targetZones.forEach((zone) => {
            if (!zone.zone_name) return;
            const baseParams = {
              cityName: city.city_name,
              zoneName: zone.zone_name,
              date: selectedDate,
            };

            if (selectedCityId && selectedCityId !== "all") {
              baseParams.cityId = selectedCityId;
              baseParams.city_id = selectedCityId;
            }
            if (selectedZoneId && selectedZoneId !== "all") {
              baseParams.zoneId = selectedZoneId;
              baseParams.zone_id = selectedZoneId;
            }
            if (selectedWardId && selectedWardId !== "all") {
              baseParams.sectorId = selectedWardId;
              baseParams.sector_id = selectedWardId;
            }

            const zoneKothis = wards
              .filter((w) => {
                const zoneMatch = String(w.zone_id) === String(zone.zone_id);
                const sectorMatch =
                  !selectedWardId || selectedWardId === "all" ||
                  String(w.sector_id) === String(selectedWardId);
                return zoneMatch && sectorMatch;
              })
              .map((w) => String(w.ward_id));

            const allKothisSelected =
              zoneKothis.length > 0 && zoneKothis.every(id => selectedKothiIds.map(String).includes(id));

            const kothiList =
              selectedKothiIds.length > 0 && !allKothisSelected
                ? selectedKothiIds.filter((id) => zoneKothis.includes(String(id))).map(String)
                : [];

            if (kothiList.length === 0) {
              fetchTasks.push(baseParams);
            } else {
              const chunks = chunkArray(kothiList, 40);
              chunks.forEach((chunk) => {
                const joined = chunk.join(",");
                fetchTasks.push({ ...baseParams, kothiId: joined, kothi_id: joined, kothiIds: joined, ward_id: joined });
              });
            }
          });
        }
      });

      if (fetchTasks.length === 0) { setReportRows([]); return; }

      let allData = [];
      let anySuccess = false;
      let lastError = null;

      const CHUNK_SIZE = 5;
      for (let i = 0; i < fetchTasks.length; i += CHUNK_SIZE) {
        const chunk = fetchTasks.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(params =>
          axios.get(`${apiUrl}/attendance/short-report`, { ...buildRequestConfig(), params })
        );
        const results = await Promise.allSettled(promises);
        results.forEach(result => {
          if (result.status === "fulfilled") {
            anySuccess = true;
            if (Array.isArray(result.value.data)) allData = allData.concat(result.value.data);
          } else {
            lastError = result.reason;
          }
        });
      }

      if (!anySuccess && lastError) throw lastError;

      const uniqueMap = new Map();
      allData.forEach((row) => {
        const key = [row.city_name, row.zone_name, row.ward_name, row.kothi_name].join("_");
        uniqueMap.set(key, row);
      });
      let finalRows = Array.from(uniqueMap.values());

      if (selectedWardId !== "all") {
        const selectedWardName =
          filteredSectors.find(
            s => String(s.sector_id) === String(selectedWardId)
          )?.sector_name;

        if (selectedWardName) {
          finalRows = finalRows.filter(
            row =>
              String(row.ward_name || "").trim().toLowerCase() ===
              selectedWardName.trim().toLowerCase()
          );
        }
      }

      setReportRows(finalRows);
      // setReportRows(Array.from(uniqueMap.values()));
    } catch (err) {
      console.error("Error fetching short report:", err);
      setError(err?.response?.data?.error || "Unable to load the short attendance report.");
    } finally {
      setIsLoading(false);
      setIsManualReloading(false);
    }
  }, [cities, selectedCityId, zones, selectedZoneId, selectedDate, selectedWardId, selectedKothiIds, filteredWards]);

  useEffect(() => {
    if (!filtersReady) return;
    if (!selectedCityName && selectedCityId !== "all") { setReportRows([]); return; }
    if (!selectedDate) { setReportRows([]); return; }
    fetchReport();
  }, [filtersReady, selectedCityName, selectedZoneName, selectedDate, selectedWardId, selectedKothiIds, fetchReport]);

  const handleResetFilters = () => {
    setSelectedCityId(cityScopeAll ? "all" : (cities.length > 0 ? String(cities[0].city_id) : "all"));
    setSelectedZoneId("all");
    setSelectedWardId("all");
    setSelectedKothiIds(filteredWards.map((w) => String(w.ward_id)));
    setSelectedDate(getTodayInIST());
  };

  const handleDownloadExcel = async () => {
    if (!reportRows.length) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Short Attendance Report");

    worksheet.columns = TABLE_HEADERS.map((header) => ({
      header: header,
      key: header.toLowerCase().replace(/\s+/g, "_"),
      width: 15,
    }));

    [...reportRows]
      .sort((a, b) => {
        const aReg = Number(a.total_registered_employees) || 0;
        const aPres = Number(a.total_present_employees) || 0;
        const aPct = aReg > 0 ? (aPres / aReg) * 100 : 0;

        const bReg = Number(b.total_registered_employees) || 0;
        const bPres = Number(b.total_present_employees) || 0;
        const bPct = bReg > 0 ? (bPres / bReg) * 100 : 0;

        return bPct - aPct;
      }).forEach((row) => {
        const registered = Number(row.total_registered_employees) || 0;
        const present = Number(row.total_present_employees) || 0;
        const leave = Number(row.total_leave_employees) || 0;

        const attendancePercent =
          registered > 0
            ? ((present + leave) / registered)
            : 0;
        const notPunched = Math.max(
          registered - present - leave,
          0
        );

        worksheet.addRow({
          "city_name": formatValue(row.city_name),
          "zone_name": formatValue(row.zone_name),
          "ward_name": formatValue(row.ward_name),
          "kothi_name": formatValue(row.kothi_name),
          "supervisor_names": formatValue(row.supervisor_names),
          "registered": registered,
          "punched_in": present,
          "on_leave": leave,
          "not_punched": notPunched,
          "attendance_%": attendancePercent,
        });
      });

    const {
      totalRegistered,
      totalPresent,
      totalAbsent,
      totalOnLeave,
    } = reportSummaryStats;

    const totalPercent =
      totalRegistered > 0
        ? ((totalPresent + totalOnLeave) / totalRegistered)
        : 0;

    worksheet.addRow([]);
    const summaryRow = worksheet.addRow({
      "city_name": "TOTAL",
      "registered": totalRegistered,
      "punched_in": totalPresent,
      "not_punched": totalAbsent,
      "on_leave": totalOnLeave,

      "attendance_%": totalPercent,
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    headerRow.alignment = { vertical: "middle", horizontal: "left" };

    summaryRow.font = { bold: true };
    summaryRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F7FF" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "double", color: { argb: "FF6366F1" } },
      };
    });

    worksheet.getColumn("attendance_%").numFmt = "0%";
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value ? cell.value.toString() : "";
        maxLen = Math.max(maxLen, val.length);
      });
      column.width = Math.min(maxLen + 5, 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const fileName = `short-attendance-report_${selectedCityName || "city"}_${selectedZoneName || "zone"}_${selectedDate}.xlsx`.replace(/\s+/g, "-");
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
    logAction("Downloaded Short Attendance Excel Report", "Downloaded Short Attendance Excel Report");
  };

  const handleDownloadPdf = () => {
    if (!reportRows.length) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Short Attendance Report", 14, 20);
    doc.setFontSize(11);
    doc.text(`City: ${selectedCityName}`, 14, 28);
    doc.text(`Zone: ${selectedZoneName}`, 14, 34);
    doc.text(`Date: ${selectedDate}`, 14, 40);

    autoTable(doc, {
      startY: 48,
      head: [TABLE_HEADERS],
      body: [...reportRows]
        .sort((a, b) => {
          const aReg =
            Number(a.total_registered_employees) || 0;

          const aPres =
            Number(a.total_present_employees) || 0;

          const aPct =
            aReg > 0
              ? (aPres / aReg) * 100
              : 0;

          const bReg =
            Number(b.total_registered_employees) || 0;

          const bPres =
            Number(b.total_present_employees) || 0;

          const bPct =
            bReg > 0
              ? (bPres / bReg) * 100
              : 0;

          return bPct - aPct;
        })
        // .map((row) => [

        //   formatValue(row.city_name),
        //   formatValue(row.zone_name),
        //   formatValue(row.ward_name),
        //   formatValue(row.kothi_name),
        //   formatValue(row.supervisor_names),
        //   formatValue(row.total_registered_employees),
        //   formatValue(row.total_present_employees),
        //   formatValue(Math.max((Number(row.total_registered_employees) || 0) - (Number(row.total_present_employees) || 0), 0)),
        //   formatValue(
        //     row.total_registered_employees > 0
        //       ? `${Math.round(
        //         (
        //           (
        //             (Number(row.total_present_employees) || 0) +
        //             (Number(row.total_leave_employees) || 0)
        //           ) /
        //           (Number(row.total_registered_employees) || 1)
        //         ) * 100
        //       )}%`
        //       : "0%"
        //   ),
        // ]),
        .map((row) => {
          const registered = Number(row.total_registered_employees) || 0;
          const present = Number(row.total_present_employees) || 0;
          const leave = Number(row.total_leave_employees) || 0;
          const notPunched = Math.max(registered - present - leave, 0);

          return [
            formatValue(row.city_name),
            formatValue(row.zone_name),
            formatValue(row.ward_name),
            formatValue(row.kothi_name),
            formatValue(row.supervisor_names),
            registered,
            present,
            notPunched,
            leave,

            registered > 0
              ? `${Math.round(((present + leave) / registered) * 100)}%`
              : "0%",
          ];
        }),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], halign: "left" },
    });

    const fileName = `short-attendance-report_${selectedCityName || "city"}_${selectedZoneName || "zone"}_${selectedDate}.pdf`.replace(/\s+/g, "-");
    doc.save(fileName);
    logAction("Downloaded Short Attendance PDF Report", "Downloaded Short Attendance PDF Report");
  };

  const handleGenerateWhatsAppReport = async () => {
    if (!selectedCityName || !selectedDate) {
      setWhatsAppError("Please select a city and date to generate the report.");
      return;
    }

    const cityZones = zones.filter((zone) => String(zone.city_id) === String(selectedCityId));
    if (!cityZones.length) { setWhatsAppError("No zones found for the selected city."); return; }

    setIsWhatsAppLoading(true);
    setWhatsAppError("");
    setWhatsAppMessage("");
    setWhatsAppContainers([]);
    setWhatsAppCumulativeContainers([]);
    setWhatsAppZoneContainers([]);
    setCopyStatus("");

    try {
      const response = await axios.get(`${apiUrl}/attendance/short-report`, {
        ...buildRequestConfig(),
        params: { cityName: selectedCityName, zoneName: "all", date: selectedDate },
      });

      const allRows = Array.isArray(response.data) ? response.data : [];

      const rowsByZone = new Map();
      cityZones.forEach((zone) => {
        rowsByZone.set(zone.zone_name, []);
      });
      allRows.forEach((row) => {
        const list = rowsByZone.get(row.zone_name) || [];
        list.push(row);
        rowsByZone.set(row.zone_name, list);
      });

      const zoneSummaries = cityZones.map((zone) => {
        const rows = rowsByZone.get(zone.zone_name) || [];
        const departmentCounts = new Map();
        const departmentSet = new Set();
        rows.forEach((row) => {
          const departmentsField = row.departments || row.department;
          const departments = String(departmentsField || "").split(",").map((d) => d.trim()).filter(Boolean);
          const totalPresent = Number(row.total_present_employees) || 0;
          const totalRegistered = Number(row.total_registered_employees) || 0;
          const absent = Math.max(totalRegistered - totalPresent, 0);
          departments.forEach((dept) => departmentSet.add(dept));
          allocateCountsToMap(departmentCounts, departments, totalPresent, absent);
        });
        const totalPresent = rows.reduce((sum, row) => sum + (Number(row.total_present_employees) || 0), 0);
        const totalRegistered = rows.reduce((sum, row) => sum + (Number(row.total_registered_employees) || 0), 0);
        const absent = Math.max(totalRegistered - totalPresent, 0);
        return {
          zoneName: zone.zone_name,
          present: totalPresent,
          absent,
          departmentCounts,
          departments: Array.from(departmentSet),
        };
      });

      const sortedZoneSummaries = zoneSummaries.sort((a, b) => a.zoneName.localeCompare(b.zoneName));
      const totalPresentAcrossZones = sortedZoneSummaries.reduce((sum, zone) => sum + zone.present, 0);
      const totalRegisteredAcrossZones = sortedZoneSummaries.reduce((sum, zone) => sum + zone.present + zone.absent, 0);
      const totalAbsent = reportSummaryStats.totalAbsent;

      const departmentCounts = new Map();
      allRows.forEach((row) => {
        const departmentsField = row.departments || row.department;
        const departments = String(departmentsField || "").split(",").map((d) => d.trim()).filter(Boolean);
        const totalPresent = Number(row.total_present_employees) || 0;
        const totalRegistered = Number(row.total_registered_employees) || 0;
        const absent = Math.max(totalRegistered - totalPresent, 0);
        allocateCountsToMap(departmentCounts, departments, totalPresent, absent);
      });

      const departmentSummaryLines = Array.from(departmentCounts.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dept, counts]) => `• ${dept}: Present ${counts.present}, Absent ${counts.absent}`);

      const divider = "-".repeat(48);
      const grouped = new Map();
      sortedZoneSummaries.forEach((zone) => {
        const zoneNumber = extractZoneNumber(zone.zoneName);
        if (!grouped.has(zoneNumber)) {
          grouped.set(zoneNumber, { zoneNumber, subZones: [], present: 0, absent: 0, departmentCounts: new Map(), departments: new Set() });
        }
        const entry = grouped.get(zoneNumber);
        entry.subZones.push(zone.zoneName);
        entry.present += zone.present;
        entry.absent += zone.absent;
        zone.departments?.forEach((dept) => entry.departments.add(dept));
        zone.departmentCounts?.forEach((counts, dept) => {
          if (!entry.departmentCounts.has(dept)) entry.departmentCounts.set(dept, { present: 0, absent: 0 });
          const target = entry.departmentCounts.get(dept);
          target.present += counts.present || 0;
          target.absent += counts.absent || 0;
        });
      });

      const groupedZones = Array.from(grouped.values()).sort((a, b) => {
        const aNum = parseInt(a.zoneNumber, 10);
        const bNum = parseInt(b.zoneNumber, 10);
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
        return String(a.zoneNumber).localeCompare(String(b.zoneNumber));
      });

      const headerBlock = [
        "📋 *Matrix Track - Daily Report*",
        `🏙️ City: *${selectedCityName}*`,
        `📅 Date: *${formatDateForMessage(selectedDate)}*`,
      ];

      const allZoneBlock = [
        "*All Zone Summary*",
        `Registered: ${totalRegisteredAcrossZones}`,
        `Present: ${totalPresentAcrossZones}`,
        `Absent: ${totalAbsent}`,
      ];

      const departmentBlock = [
        "*Department-wise Summary*",
        ...(departmentSummaryLines.length ? departmentSummaryLines : ["No department data available."]),
      ];

      const zoneBlocks = groupedZones.map((zone) => {
        const registerCount = zone.present + zone.absent;
        const attendanceRate = registerCount ? Math.round((zone.present / registerCount) * 100) : 0;
        const departments = compressDepartments([...Array.from(zone.departments)]);
        const departmentBreakdown = Array.from(zone.departmentCounts?.entries?.() || [])
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([dept, counts]) => `• ${dept}: Present ${counts.present || 0}, Absent ${counts.absent || 0}`);
        return [
          `🗂️ Zone - ${zone.zoneNumber} (Combined Sub-Zones)`,
          ...zone.subZones.map((name) => `- 📍 ${name}`),
          `🏷️ Deptartments: ${departments}`,
          `Total Present: ${zone.present}`,
          `Total Absent: ${zone.absent}`,
          "*Department-wise Attendance*",
          ...(departmentBreakdown.length ? departmentBreakdown : ["No department data available."]),
          "────────────────────────────",
          `Overall Attendance: ${attendanceRate}%`,
          "────────────────────────────",
        ];
      });

      const insightsBlock = [
        "*Insights*",
        (() => {
          const bestZone = groupedZones.reduce(
            (best, zone) => {
              const total = zone.present + zone.absent;
              const rate = total ? zone.present / total : 0;
              return rate > best.rate ? { name: zone.zoneNumber, rate } : best;
            },
            { name: "N/A", rate: -1 }
          );
          const ratePct = bestZone.rate < 0 ? "N/A" : `${Math.round(bestZone.rate * 100)}%`;
          return `• Best attendance: Zone ${bestZone.name} (${ratePct})`;
        })(),
      ];

      const containers = [
        [...headerBlock, divider, ...allZoneBlock],
        [divider, ...departmentBlock],
        ...zoneBlocks.map((block) => [divider, ...block]),
        [divider, ...insightsBlock],
      ];

      const containerBlocks = containers.map((block) => block.join("\n"));
      const cumulativeBlocks = containerBlocks.map((_, index) =>
        containerBlocks.slice(0, index + 1).join("\n\n")
      );
      const zoneContainerMeta = groupedZones.map((zone, index) => ({
        containerIndex: 2 + index,
        zoneNumber: zone.zoneNumber,
        zoneNames: zone.subZones || [],
      }));

      setWhatsAppContainers(containerBlocks);
      setWhatsAppCumulativeContainers(cumulativeBlocks);
      setWhatsAppZoneContainers(zoneContainerMeta);
      setWhatsAppMessage(cumulativeBlocks[cumulativeBlocks.length - 1] || "");
    } catch (err) {
      console.error("Error generating WhatsApp report:", err);
      setWhatsAppError(err?.response?.data?.error || "Unable to generate WhatsApp report. Please try again.");
    } finally {
      setIsWhatsAppLoading(false);
    }
  };

  const handleCopyReport = async () => {
    if (!whatsAppMessage) return;
    try {
      await navigator.clipboard.writeText(whatsAppMessage);
      setCopyStatus("Report copied to clipboard.");
      setTimeout(() => setCopyStatus(""), 3000);
    } catch (err) {
      setCopyStatus("Unable to copy. Please copy manually.");
    }
  };

  const handleShareWhatsApp = () => {
    if (!whatsAppMessage) return;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsAppMessage)}`, "_blank");
  };

  const handleCopyBlock = async (index) => {
    const text = whatsAppCumulativeContainers[index] || whatsAppMessage;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Block copied to clipboard.");
      setTimeout(() => setCopyStatus(""), 3000);
    } catch (err) {
      setCopyStatus("Unable to copy. Please copy manually.");
    }
  };

  const handleShareBlock = (index, phoneNumber) => {
    const text = whatsAppCumulativeContainers[index] || whatsAppMessage;
    if (!text) return;
    const shareText = encodeURIComponent(text);
    const phoneParam = phoneNumber ? `&phone=${phoneNumber}` : "";
    window.open(`https://api.whatsapp.com/send?text=${shareText}${phoneParam}`, "_blank");
  };

  const normalizePhone = (phone) => phone.replace(/[^\d]/g, "");

  const handleScheduleWhatsApp = () => {
    setScheduleStatus("");
    setScheduleError("");
    if (scheduleTimerRef.current) { clearTimeout(scheduleTimerRef.current); scheduleTimerRef.current = null; }

    if (!whatsAppCumulativeContainers.length) { setScheduleError("Generate the WhatsApp report first."); return; }
    const normalizedPhone = normalizePhone(schedulePhone);
    if (!normalizedPhone) { setScheduleError("Enter a valid recipient number."); return; }
    if (!scheduleTime) { setScheduleError("Select a time to schedule sending."); return; }

    const targetZoneNumber = extractZoneNumber(selectedZoneName);
    const zoneMeta = whatsAppZoneContainers.find((meta) => String(meta.zoneNumber) === String(targetZoneNumber));
    const targetIndex = zoneMeta ? zoneMeta.containerIndex : whatsAppCumulativeContainers.length - 1;

    const now = new Date();
    const [hourStr, minuteStr] = scheduleTime.split(":");
    const scheduled = new Date(now);
    scheduled.setHours(Number(hourStr), Number(minuteStr), 0, 0);
    if (scheduled <= now) { setScheduleError("Scheduled time must be in the future."); return; }

    const delay = scheduled.getTime() - now.getTime();
    scheduleTimerRef.current = setTimeout(() => {
      handleShareBlock(targetIndex, normalizedPhone);
      setScheduleStatus(`Sent to ${normalizedPhone} at ${scheduleTime}.`);
      scheduleTimerRef.current = null;
    }, delay);

    setScheduleStatus(`Scheduled for ${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} to ${normalizedPhone}.`);
  };

  return (
    <div className="p-5 text-slate-800 dark:text-slate-100 dark:text-slate-100 dark:text-slate-100">
      {isManualReloading && <Loader />}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-2xl font-black text-slate-800 dark:text-slate-100 dark:text-slate-100 mb-1">
            <FileText size={22} className="text-indigo-600" /> Short Attendance Report
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Quick snapshot of ward-level attendance with supervisor coverage and current-day presence.
          </p>
        </div>
        <button
          onClick={() => { fetchReport(true); fetchAttendanceRecords(); }}
          disabled={isLoading}
          className="flex items-center gap-2 bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 uppercase tracking-widest"
          title="Refresh Data"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          {isLoading ? "Refreshing..." : "Reload Data"}
        </button>
      </div>

      {/* ── Stats Cards — now computed from same source as AttendanceReports ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
        {/* Total Registered */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl p-4 transition-all shadow-md shadow-blue-100/50 hover:shadow-xl hover:shadow-blue-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-blue-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-blue-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-blue-600/70 uppercase tracking-widest mb-1">Total Employees</p>
            <h3 className="text-3xl font-black text-blue-800 tracking-tight leading-none mb-1">{reportSummaryStats.totalRegistered}</h3>
          </div>
          <div className="relative z-10 border-t border-blue-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest opacity-80">Registered Employees</p>
          </div>
        </div>

        {/* Total Present */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-4 transition-all shadow-md shadow-emerald-100/50 hover:shadow-xl hover:shadow-emerald-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-emerald-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-emerald-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Total Present</p>
            <h3 className="text-3xl font-black text-emerald-800 tracking-tight leading-none mb-1">{reportSummaryStats.totalPresent}</h3>
          </div>
          <div className="relative z-10 border-t border-emerald-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest opacity-80">Punched In</p>
          </div>
        </div>

        {/* Mid Shift Punch In */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-yellow-50 to-white border border-yellow-200 rounded-2xl p-4 transition-all shadow-md shadow-yellow-100/50 hover:shadow-xl hover:shadow-yellow-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-yellow-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-yellow-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-yellow-600/70 uppercase tracking-widest mb-1">Mid Shift Records</p>
            <h3 className="text-3xl font-black text-yellow-800 tracking-tight leading-none mb-1">{reportSummaryStats.totalMidShiftPunchIn}</h3>
          </div>
          <div className="relative z-10 border-t border-yellow-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-yellow-500 font-black uppercase tracking-widest opacity-80">Mid Shift Punch In</p>
          </div>
        </div>

        {/* On Leave */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-2xl p-4 transition-all shadow-md shadow-indigo-100/50 hover:shadow-xl hover:shadow-indigo-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-indigo-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-indigo-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-indigo-600/70 uppercase tracking-widest mb-1">On Leave</p>
            <h3 className="text-3xl font-black text-indigo-800 tracking-tight leading-none mb-1">{reportSummaryStats.totalOnLeave}</h3>
          </div>
          <div className="relative z-10 border-t border-indigo-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest opacity-80">Leave Records</p>
          </div>
        </div>

        {/* Absent */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-rose-50 to-white border border-rose-200 rounded-2xl p-4 transition-all shadow-md shadow-rose-100/50 hover:shadow-xl hover:shadow-rose-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-rose-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-rose-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-rose-600/70 uppercase tracking-widest mb-1">Absent</p>
            <h3 className="text-3xl font-black text-rose-800 tracking-tight leading-none mb-1">{reportSummaryStats.totalAbsent}</h3>
          </div>
          <div className="relative z-10 border-t border-rose-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest opacity-80">Not Punched In</p>
          </div>

        </div>

        {/* Total Punch-Out (Manual + Auto combined) */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-sky-50 to-white border border-sky-200 rounded-2xl p-4 transition-all shadow-md shadow-sky-100/50 hover:shadow-xl hover:shadow-sky-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-sky-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-sky-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-sky-600/70 uppercase tracking-widest mb-1">Total Punch-Out</p>
            <h3 className="text-3xl font-black text-sky-800 tracking-tight leading-none mb-1">
              {reportSummaryStats.totalManualPunchOut + reportSummaryStats.totalAutoPunchOut}
            </h3>
          </div>
          <div className="relative z-10 border-t border-sky-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-sky-500 font-black uppercase tracking-widest opacity-80">Manual + System</p>
          </div>
        </div>

        {/* Manual Punch-Out */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-4 transition-all shadow-md shadow-amber-100/50 hover:shadow-xl hover:shadow-amber-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-amber-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-amber-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest mb-1">Punch-Out Manual</p>
            <h3 className="text-3xl font-black text-amber-800 tracking-tight leading-none mb-1">{reportSummaryStats.totalManualPunchOut}</h3>
          </div>
          <div className="relative z-10 border-t border-amber-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest opacity-80">By User Action</p>
          </div>
        </div>

        {/* Auto Punch-Out */}
        <div className="relative group overflow-hidden bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-2xl p-4 transition-all shadow-md shadow-orange-100/50 hover:shadow-xl hover:shadow-orange-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-orange-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-orange-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-orange-600/70 uppercase tracking-widest mb-1">Punch-Out System</p>
            <h3 className="text-3xl font-black text-orange-800 tracking-tight leading-none mb-1">{reportSummaryStats.totalAutoPunchOut}</h3>
          </div>
          <div className="relative z-10 border-t border-orange-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-orange-500 font-black uppercase tracking-widest opacity-80">Auto (9h limit)</p>
          </div>
        </div>
      </div>

      <div
        className="
bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800
dark:bg-slate-900

shadow
dark:shadow-none

rounded-lg
p-4
mb-6

border
border-slate-200
dark:border-slate-700
"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="flex flex-col">
            <label className="font-medium mb-1">City</label>
            <select
              className="
border
border-slate-300
dark:border-slate-600

rounded
p-2

bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800
dark:bg-slate-800

text-slate-800 dark:text-slate-100 dark:text-slate-100
dark:text-slate-100

focus:ring-2
focus:ring-blue-500
outline-none
"
              value={selectedCityId}
              onChange={(event) => setSelectedCityId(event.target.value)}
              disabled={!cities.length || singleCityMode}
            >
              {!cities.length && <option value="all">Loading cities...</option>}
              {cityScopeAll && <option value="all">All Cities</option>}
              {cities.map((city) => (
                <option key={city.city_id} value={city.city_id}>{city.city_name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="font-medium mb-1">Zone</label>
            <select
              className="
border
border-slate-300
dark:border-slate-600

rounded
p-2

bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800
dark:bg-slate-800

text-slate-800 dark:text-slate-100 dark:text-slate-100
dark:text-slate-100

focus:ring-2
focus:ring-blue-500
outline-none
"
              value={selectedZoneId}
              onChange={(event) => setSelectedZoneId(event.target.value)}
              disabled={!filteredZones.length || filteredZones.length === 1}
            >
              {!filteredZones.length && <option value="all">No zones available</option>}
              {filteredZones.length > 0 && <option value="all">All Zones</option>}
              {filteredZones.map((zone) => (
                <option key={zone.zone_id} value={zone.zone_id}>{zone.zone_name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="font-medium mb-1">Ward</label>
            <select
              className="
border
border-slate-300
dark:border-slate-600

rounded
p-2

bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800
dark:bg-slate-800

text-slate-800 dark:text-slate-100 dark:text-slate-100
dark:text-slate-100

focus:ring-2
focus:ring-blue-500
outline-none
"
              value={selectedWardId}
              onChange={(event) => setSelectedWardId(event.target.value)}
              disabled={!selectedZoneId || filteredSectors.length === 1}
            >
              <option value="all">All Wards</option>
              {filteredSectors.map((s) => (
                <option key={s.sector_id} value={s.sector_id}>{s.sector_name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col relative kothi-dropdown-container">
            <label className="font-medium flex items-center justify-between mb-1.5 text-slate-700 dark:text-slate-200">
              Kothis Filter
              <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{filteredWards.length} total</span>
            </label>

            <div
              className={`relative border rounded bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800 cursor-pointer transition-all hover:border-blue-400 ${isKothiDropdownOpen ? "ring-2 ring-blue-500/10 border-blue-500 shadow-sm" : "border-gray-200 dark:border-slate-600 shadow-sm"}`}
              onClick={() => setIsKothiDropdownOpen(!isKothiDropdownOpen)}
            >
              <div className="flex items-center justify-between p-2">
                <span className={`text-sm font-medium truncate ${selectedKothiIds.length === 0 ? "text-slate-400 dark:text-slate-500 font-normal" : "text-slate-800 dark:text-slate-100 dark:text-slate-100"}`}>
                  {selectedKothiIds.length === 0
                    ? "Select Kothis / All included"
                    : selectedKothiIds.length === filteredWards.length
                      ? "All Kothis Selected"
                      : `${selectedKothiIds.length} Kothi${selectedKothiIds.length === 1 ? "" : "s"} Selected`}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${isKothiDropdownOpen ? "rotate-180 text-blue-500" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>

            {isKothiDropdownOpen && (
              <div className="absolute top-[100%] left-0 right-0 z-[100] mt-1.5 bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 rounded shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-2 border-b border-slate-100 bg-slate-50 space-y-2">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800 border border-slate-300 rounded px-2 py-1 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    <input
                      type="text"
                      placeholder="Search Kothis..."
                      value={kothiSearch}
                      onChange={(e) => setKothiSearch(e.target.value)}
                      className="w-full bg-transparent text-xs focus:outline-none py-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex gap-4 px-1">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedKothiIds(filteredWards.map(w => String(w.ward_id))); }} className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors">Select All</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedKothiIds([]); }} className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-200 transition-colors">Clear All</button>
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto p-1 bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800 scrollbar-thin scrollbar-thumb-slate-200">
                  {!filteredWards.length ? (
                    <div className="text-center text-slate-400 dark:text-slate-500 text-[11px] italic py-6">No Kothis available in this area</div>
                  ) : (
                    filteredWards
                      .filter(w => !kothiSearch || w.ward_name.toLowerCase().includes(kothiSearch.toLowerCase()))
                      .map((ward) => (
                        <div
                          key={ward.ward_id}
                          onClick={(e) => { e.stopPropagation(); handleKothiToggle(String(ward.ward_id)); }}
                          className={`flex items-center gap-2.5 p-1.5 rounded cursor-pointer transition-all border group mb-0.5 ${selectedKothiIds.includes(String(ward.ward_id)) ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800 border-transparent hover:bg-slate-50 hover:border-slate-200"}`}
                        >
                          <input type="checkbox" checked={selectedKothiIds.includes(String(ward.ward_id))} onChange={() => { }} className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                          <span className="text-[11px] font-medium truncate group-hover:text-amber-600" title={ward.ward_name}>{ward.ward_name}</span>
                        </div>
                      ))
                  )}
                </div>
                <div className="p-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>{selectedKothiIds.length} selected</span>
                  <button type="button" onClick={() => setIsKothiDropdownOpen(false)} className="text-blue-600 font-bold hover:underline">Apply</button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <label className="font-medium mb-1">Date</label>
            <input
              type="date"
              className="
border
border-slate-300
dark:border-slate-600

rounded
p-2

bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800
dark:bg-slate-800

text-slate-800 dark:text-slate-100 dark:text-slate-100
dark:text-slate-100

focus:ring-2
focus:ring-blue-500
outline-none
"
              value={selectedDate}
              max={getTodayInIST()}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>

          <div className="flex flex-col justify-end items-start md:col-span-3">
            <button
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-2 bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800 border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-600 dark:text-slate-200 px-4 py-2 rounded-md text-sm font-semibold transition-all shadow-sm active:scale-95 h-[42px]"
              title="Reset Filters"
            >
              <Filter size={16} />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div
        className="
bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800
dark:bg-slate-900

shadow
dark:shadow-none

rounded-lg
p-4

border
border-slate-200
dark:border-slate-700
"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Report Snapshot</h2>
            <p className="text-gray-600 text-sm">Sorted by ward name for quick scanning.</p>
          </div>
          <div className="flex gap-3">
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
              onClick={handleDownloadExcel}
              disabled={!reportRows.length}
            >
              <FileSpreadsheet size={16} />
              Download Excel
            </button>
            <button
              className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={handleDownloadPdf}
              disabled={!reportRows.length}
            >
              <span className="inline-flex items-center gap-2"><FileDown size={18} /> Download PDF</span>
            </button>
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={handleGenerateWhatsAppReport}
              disabled={isWhatsAppLoading || !selectedCityId || !selectedDate}
            >
              {isWhatsAppLoading ? "Generating..." : "Short WhatsApp Report"}
            </button>
          </div>
        </div>

        {error && <div className="text-red-600 mb-4" role="alert">{error}</div>}
        {whatsAppError && <div className="text-red-600 mb-4" role="alert">{whatsAppError}</div>}

        {whatsAppMessage && (
          <div
            className="
border
border-green-200
dark:border-green-800

bg-green-50
dark:bg-green-950/20

rounded-lg
p-4
mb-4
"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex-1 flex flex-col gap-3">
                {whatsAppContainers.length
                  ? whatsAppContainers.map((block, index) => (
                    <div key={`wa-block-${index}`} className="border border-green-200 bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800 rounded p-3 flex flex-col gap-3">
                      <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-slate-100">{block}</pre>
                      {index > 0 && (
                        <div className="flex flex-wrap gap-2">
                          <button className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded" onClick={() => handleCopyBlock(index)}>Copy</button>
                          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded" onClick={() => handleShareBlock(index)}>Share on WhatsApp</button>
                        </div>
                      )}
                    </div>
                  ))
                  : (
                    <div className="border border-green-200 bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800 rounded p-3">
                      <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 dark:text-slate-100">{whatsAppMessage}</pre>
                    </div>
                  )}
              </div>
              <div className="flex flex-col gap-2 md:w-48">
                <button className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded" onClick={handleCopyReport}>Copy Report</button>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded" onClick={handleShareWhatsApp}>Share on WhatsApp</button>
                <div className="border border-green-200 bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800 rounded p-3 mt-2 flex flex-col gap-2">
                  <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">Auto-send</div>
                  <input type="tel" placeholder="Recipient number" className="border rounded px-2 py-1 text-sm" value={schedulePhone} onChange={(e) => setSchedulePhone(e.target.value)} />
                  <input type="time" className="border rounded px-2 py-1 text-sm" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                  <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm" onClick={handleScheduleWhatsApp}>Schedule Send</button>
                  {scheduleStatus && <span className="text-xs text-green-700">{scheduleStatus}</span>}
                  {scheduleError && <span className="text-xs text-red-700">{scheduleError}</span>}
                </div>
                {copyStatus && <span className="text-xs text-gray-700">{copyStatus}</span>}
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full
border
border-gray-200
dark:border-slate-700

rounded-lg
text-sm

bg-white dark:bg-slate-800 dark:bg-slate-800
dark:bg-slate-900">
            <thead className="bg-gray-100 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-center w-16">Sr No</th>

                <th className="
text-left
p-3
border-b

border-slate-200
dark:border-slate-700

text-slate-700 dark:text-slate-200
dark:text-slate-200
">Ward / Kothi</th>
                <th className="
text-left
p-3
border-b

border-slate-200
dark:border-slate-700

text-slate-700 dark:text-slate-200
dark:text-slate-200
">Supervisor</th>
                <th className="text-center p-3 border-b">Registered</th>
                <th className="text-center p-3 border-b">Punched In</th>
                <th className="text-center p-3 border-b">On Leave</th>
                <th className="text-center p-3 border-b">Not Punched</th>
                <th className="p-3 border-b">Attendance %</th>

              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-900">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center p-14">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }}></div>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }}></div>
                        <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-slate-700 dark:text-slate-200 font-medium text-base">Kindly wait, your data is loading...</span>
                        <span className="text-slate-400 dark:text-slate-500 text-sm">Hold on, this might take a moment if the data is large.</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : reportRows.length ? (() => {
                const wardMap = new Map();
                reportRows.forEach((row) => {
                  const wardKey = row.ward_name || "(No Ward)";
                  if (!wardMap.has(wardKey)) wardMap.set(wardKey, []);
                  wardMap.get(wardKey).push(row);
                });

                const zoneTotalReg = reportRows.reduce((s, r) => s + (Number(r.total_registered_employees) || 0), 0);
                const zoneTotalPres = reportRows.reduce((s, r) => s + (Number(r.total_present_employees) || 0), 0);
                const zoneTotalLeave = reportRows.reduce(
                  (s, r) => s + (Number(r.total_leave_employees) || 0),
                  0
                );

                const zoneTotalAbs = Math.max(
                  zoneTotalReg - zoneTotalPres - zoneTotalLeave,
                  0
                ); const zonePct =
                  zoneTotalReg > 0
                    ? Math.round(((zoneTotalPres + zoneTotalLeave) / zoneTotalReg) * 100)
                    : 0;

                const pctBar = (pct) => {
                  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-500";
                  return (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[48px]">
                        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{pct}%</span>
                    </div>
                  );
                };

                const greenBadge = (n) => (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {n}
                  </span>
                );

                const redBadge = (n) => n > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    {n}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">0</span>
                );

                const rows = [];
                wardMap.forEach((kothis, wardName) => {
                  const wardReg = kothis.reduce((s, r) => s + (Number(r.total_registered_employees) || 0), 0);
                  const wardPres = kothis.reduce((s, r) => s + (Number(r.total_present_employees) || 0), 0);
                  const wardLeave = kothis.reduce(
                    (s, r) => s + (Number(r.total_leave_employees) || 0),
                    0
                  );

                  const wardAbs = Math.max(
                    wardReg - wardPres - wardLeave,
                    0
                  ); const wardPct =
                    wardReg > 0
                      ? Math.round(((wardPres + wardLeave) / wardReg) * 100)
                      : 0;

                  rows.push(
                    <tr key={`ward-${wardName}`} className="bg-blue-50 border-t-2 border-blue-200">
                      <td></td>
                      <td className="p-3 font-bold text-blue-800 text-sm" colSpan={2}>📁 {wardName}</td>
                      <td className="p-3 text-center font-bold text-blue-800">{wardReg}</td>
                      <td className="p-3 text-center">{greenBadge(wardPres)}</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                          {wardLeave}
                        </span>
                      </td>
                      <td className="p-3 text-center">{redBadge(wardAbs)}</td>
                      <td className="p-3">{pctBar(wardPct)}</td>

                    </tr>
                  );

                  kothis.forEach((row, index) => {
                    const reg = Number(row.total_registered_employees) || 0;
                    const pres = Number(row.total_present_employees) || 0;
                    const leave = Number(row.total_leave_employees) || 0;

                    const abs = Math.max(
                      reg - pres - leave,
                      0
                    ); const pct =
                      reg > 0
                        ? Math.round(((pres + leave) / reg) * 100)
                        : 0;
                    rows.push(
                      <tr key={`${row.ward_name}-${row.kothi_name}`} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-center font-medium text-slate-600">
                          {index + 1}
                        </td>
                        <td className="p-3 pl-8 text-gray-500"><span className="text-gray-400 mr-1">└</span> {row.kothi_name}</td>
                        <td className="p-3 text-gray-500 text-xs">{row.supervisor_names || "-"}</td>
                        <td className="p-3 text-center font-medium text-gray-700">{reg}</td>
                        <td className="p-3 text-center">{greenBadge(pres)}</td>

                        <td className="p-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                            {leave}
                          </span>
                        </td>

                        <td className="p-3 text-center">{redBadge(abs)}</td>

                        <td className="p-3">{pctBar(pct)}</td>

                      </tr>
                    );
                  });
                });

                rows.push(
                  <tr key="zone-total" className="bg-slate-700 text-white border-t-2 border-slate-500">
                    <td></td>
                    <td className="p-3 font-bold text-sm" colSpan={2}>Zone Total</td>
                    <td className="p-3 text-center font-bold">{zoneTotalReg}</td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-200 text-green-900 border border-green-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        {zoneTotalPres}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-200 text-indigo-900 border border-indigo-400">
                        {zoneTotalLeave}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {zoneTotalAbs > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-200 text-red-900 border border-red-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          {zoneTotalAbs}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700">0</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-500 rounded-full h-2 min-w-[48px]">
                          <div className={`${zonePct >= 80 ? "bg-green-400" : zonePct >= 50 ? "bg-yellow-300" : "bg-red-400"} h-2 rounded-full transition-all`} style={{ width: `${zonePct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-white w-8 text-right">{zonePct}%</span>
                      </div>
                    </td>
                  </tr>
                );

                return rows;
              })() : (
                <tr>
                  <td colSpan={6} className="text-center p-6 text-gray-500">No data available for the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShortAttendanceReport;
