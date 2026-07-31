import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CalendarRange, RefreshCw, Filter, FileDown } from "lucide-react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import API_BASE_URL, { ALLOWED_CITIES_ENDPOINT } from "../config";
import { useAuth } from "../AuthContext";
import { useSearch } from "../SearchContext";
import Loader from "../components/Loader";

const DEFAULT_GROUP_BY = "detail";
const ATTENDANCE_PAGE_SIZES = [10, 25, 50, 100];
const FACE_PAGE_SIZES = [10, 25, 50];

const apiUrl = `${API_BASE_URL}/api`;

function AttendanceReports() {
  const { user, logPageView, logAction } = useAuth();
  const isTruthyFlag = useCallback((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    const normalized = String(value ?? "").trim().toLowerCase();
    return ["true", "1", "yes", "y"].includes(normalized);
  }, []);

  const isAutoPunchOutRecord = useCallback((record) => {
    if (!record) return false;
    if (isTruthyFlag(record.is_auto_punch_out) || isTruthyFlag(record.auto_punched_out)) {
      return true;
    }
    const outAddress = String(record.out_address || "").toLowerCase();
    return outAddress.includes("auto punch-out");
  }, [isTruthyFlag]);

  const isShiftCompleted = useCallback((record) => {
    if (!record || !record.punch_in || !record.punch_out) return false;
    if (isAutoPunchOutRecord(record)) return false;

    try {
      const parseTime = (timeStr) => {
        const parts = timeStr.split(":").map(Number);
        return {
          h: parts[0] || 0,
          m: parts[1] || 0,
          s: parts[2] || 0
        };
      };

      const inT = parseTime(record.punch_in);
      const outT = parseTime(record.punch_out);

      const inDate = new Date(2000, 0, 1, inT.h, inT.m, inT.s);
      let outDate = new Date(2000, 0, 1, outT.h, outT.m, outT.s);

      if (outDate < inDate) {
        outDate.setDate(outDate.getDate() + 1);
      }

      const durationHours = (outDate - inDate) / (1000 * 60 * 60);
      return durationHours >= 8;
    } catch (e) {
      return false;
    }
  }, [isAutoPunchOutRecord]);

  const calculateDuration = useCallback((punchIn, punchOut) => {
    if (!punchIn || !punchOut) return "-";
    try {
      const parseTime = (timeStr) => {
        const parts = timeStr.split(":").map(Number);
        return {
          h: parts[0] || 0,
          m: parts[1] || 0,
          s: parts[2] || 0
        };
      };

      const inT = parseTime(punchIn);
      const outT = parseTime(punchOut);

      const inDate = new Date(2000, 0, 1, inT.h, inT.m, inT.s);
      let outDate = new Date(2000, 0, 1, outT.h, outT.m, outT.s);

      if (outDate < inDate) {
        outDate.setDate(outDate.getDate() + 1);
      }

      const diffMs = outDate - inDate;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } catch (e) {
      return "-";
    }
  }, []);

  const [columnWidths, setColumnWidths] = useState({
    srNo: 60,
    date: 110,
    zone: 90,
    ward: 240,
    kothi: 240,
    empName: 280,
    empCode: 100,
    contact: 140,
    inTime: 100,
    inImage: 90,
    punchedInBy: 180,
    inAddress: 280,
    inLatLong: 100,
    midTime: 110,
    midImage: 90,
    midBy: 180,
    midAddress: 280,
    midLatLong: 100,
    outTime: 100,
    outImage: 90,
    punchedOutBy: 180,
    outAddress: 280,
    outLatLong: 100,
  });

  const [columnWidthsFace, setColumnWidthsFace] = useState({
    hash: 60,
    name: 200,
    empCode: 120,
    contact: 140,
    city: 140,
    zone: 140,
    ward: 180,
    supervisor: 180,
    status: 160,
  });

  const handleMouseDown = (e, column, isFaceTable = false) => {
    const startX = e.pageX;
    const startWidth = isFaceTable ? columnWidthsFace[column] : columnWidths[column];

    const handleMouseMove = (moveEvent) => {
      const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
      if (isFaceTable) {
        setColumnWidthsFace((prev) => ({
          ...prev,
          [column]: newWidth,
        }));
      } else {
        setColumnWidths((prev) => ({
          ...prev,
          [column]: newWidth,
        }));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayInIST());
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isManualReloading, setIsManualReloading] = useState(false);
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [wards, setWards] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [assignments, setAssignments] = useState([]); // supervisor ↔ ward mappings
  const [employees, setEmployees] = useState([]);
  const [cityScopeAll, setCityScopeAll] = useState(false);
  const [reportType, setReportType] = useState("detailed");
  const [downloadFilters, setDownloadFilters] = useState({
    dateMode: "single",
    singleDate: getTodayInIST(),
    startDate: getTodayInIST(),
    endDate: getTodayInIST(),
    cityId: "all",
    zoneId: "all",
    sectorId: "all",
    wardId: "all",
    selectedKothiIds: [], // New state for multi-select
    supervisorId: "all",
    employeeId: "all",
    empCode: "",
    hasPunchIn: "any",
    hasPunchOut: "any",
    autoPunchOut: "any",
    reportLayout: DEFAULT_GROUP_BY,
    absenteesOnly: "false",
    shift: "all",
    departmentIds: [],
    designationIds: [],
  });

  const reportStart = new Date(downloadFilters.startDate);
  const reportEnd = new Date(downloadFilters.endDate);

  const totalDays =
    downloadFilters.dateMode === "range"
      ? Math.floor((reportEnd - reportStart) / (1000 * 60 * 60 * 24)) + 1
      : 1;

  const dayColumns = Array.from({ length: totalDays }, (_, index) => {
    const d = new Date(reportStart);
    d.setDate(reportStart.getDate() + index);

    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    };
  });
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [isDesDropdownOpen, setIsDesDropdownOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");
  const [desSearch, setDesSearch] = useState("");
  const [recordFilter, setRecordFilter] = useState("all");
  const [punchFilter, setPunchFilter] = useState("all"); // "all" | "faceRegistered" | "punchIn" | "midShiftPunchIn" | "onLeave" | "absent" | "autoPunchOut" | "manualPunchOut"
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const { normalizedQuery } = useSearch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(ATTENDANCE_PAGE_SIZES[1]);
  const [showFaceUnregistered, setShowFaceUnregistered] = useState(false);
  const [facePage, setFacePage] = useState(1);
  const [facePageSize, setFacePageSize] = useState(FACE_PAGE_SIZES[0]);
  const [isKothiDropdownOpen, setIsKothiDropdownOpen] = useState(false);
  const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [kothiSearch, setKothiSearch] = useState("");
  const [supervisorSearch, setSupervisorSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const kothiToSectorMap = useMemo(() => {
    const map = {};
    wards.forEach((w) => {
      const sector = sectors.find((s) => String(s.sector_id) === String(w.sector_id));
      if (sector) {
        map[(w.ward_name || "").toLowerCase()] = sector.sector_name;
      }
    });
    return map;
  }, [wards, sectors]);

  const isShiftMatched = useCallback((punchInTime, requestedShift) => {
    if (!requestedShift || requestedShift === "all") return true;
    if (!punchInTime) return false;

    // punchInTime is usually "HH:MM:SS"
    const [hours] = punchInTime.split(":").map(Number);

    if (requestedShift === "morning") {
      return hours >= 6 && hours < 13;
    } else if (requestedShift === "afternoon") {
      return hours >= 14 && hours < 22;
    } else if (requestedShift === "night") {
      return hours >= 22 || hours < 6;
    }
    return true;
  }, []);

  const buildRequestConfig = () => {
    const token = localStorage.getItem("token");
    const headers = token
      ? {
        Authorization: `Bearer ${token}`,
      }
      : {};

    return {
      withCredentials: true,
      headers,
    };
  };

  const flattenWardResponse = (payload) => {
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload.flatMap((city) => {
      const zonesForCity = Array.isArray(city.zones) ? city.zones : [];
      return zonesForCity.flatMap((zone) => {
        const wardsForZone = Array.isArray(zone.wards) ? zone.wards : [];
        return wardsForZone.map((ward) => ({
          ward_id: ward.wardId || ward.ward_id,
          ward_name: ward.wardName || ward.ward_name,
          sector_id: ward.sectorId || ward.sector_id || null,
          zone_id: zone.zoneId || zone.zone_id,
          zone_name: zone.zone || zone.zone_name,

          city_id: city.cityId,
          city_name: city.city,
        }));
      });
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isKothiDropdownOpen && !event.target.closest(".kothi-dropdown-container")) {
        setIsKothiDropdownOpen(false);
      }
      if (isDeptDropdownOpen && !event.target.closest(".dept-dropdown-container")) {
        setIsDeptDropdownOpen(false);
      }
      if (isDesDropdownOpen && !event.target.closest(".des-dropdown-container")) {
        setIsDesDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isKothiDropdownOpen]);

  const fetchRecords = useCallback(async (isManual = false) => {
    if (isManual) setIsManualReloading(true);
    setIsLoading(true);
    try {
      const isRange = downloadFilters.dateMode === "range";
      const params = isRange
        ? { startDate: downloadFilters.startDate, endDate: downloadFilters.endDate }
        : { date: selectedDate };

      const response = await axios.post(
        `${apiUrl}/attendance`,
        {},
        {
          ...buildRequestConfig(),
          params
        }
      );
      const normalizedRecords = Array.isArray(response.data)
        ? response.data.map((row) => ({
          ...row,
          mid_shift_punch_in:
            row.mid_shift_punch_in ||
            row.mid_shift_punch_in_time ||
            null,
          is_auto_punch_out: isAutoPunchOutRecord(row),
        }))
        : [];
      setRecords(normalizedRecords);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setIsLoading(false);
      setIsManualReloading(false);
    }
  }, [selectedDate, downloadFilters.dateMode, downloadFilters.startDate, downloadFilters.endDate, isAutoPunchOutRecord]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    logPageView("Attendance Reports", "/attendance");
  }, [logPageView]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [citiesRes, zonesRes, wardsRes, sectorsRes, supervisorsRes, employeesRes, assignmentsRes, departmentsRes, designationsRes] =
          await Promise.all([
            axios.get(ALLOWED_CITIES_ENDPOINT, buildRequestConfig()),
            axios.get(`${apiUrl}/zones`, buildRequestConfig()),
            axios.get(`${apiUrl}/wards`, buildRequestConfig()),
            axios.get(`${apiUrl}/sectors`, buildRequestConfig()),
            axios.get(`${apiUrl}/supervisor`, buildRequestConfig()),
            axios.get(`${apiUrl}/employees`, buildRequestConfig()),
            axios.get(`${apiUrl}/assignedWardRoutes`, buildRequestConfig()),
            axios.get(`${apiUrl}/departments`, buildRequestConfig()),
            axios.get(`${apiUrl}/designations`, buildRequestConfig()),
          ]);

        const cityPayload = citiesRes.data || {};
        const cityList = Array.isArray(cityPayload.cities)
          ? cityPayload.cities
          : Array.isArray(cityPayload)
            ? cityPayload
            : [];
        const scopeAll = Boolean(cityPayload.all);

        setCityScopeAll(scopeAll);
        setCities(cityList);
        setZones(zonesRes.data || []);
        setWards(flattenWardResponse(wardsRes.data));

        // Flatten sectors and capture their assigned kothis (wards) for correct filtering
        const flatSectors = (sectorsRes.data || []).flatMap((city) =>
          city.zones.flatMap((zone) =>
            zone.sectors.map((s) => ({
              sector_id: s.sectorId,
              sector_name: s.sectorName,
              zone_id: zone.zoneId,
              city_id: city.cityId,
              kothiIds: Array.isArray(s.kothis) ? s.kothis.map(k => String(k.wardId)) : [],
            }))
          )
        );
        setSectors(flatSectors);

        setSupervisors(supervisorsRes.data || []);
        setEmployees(employeesRes.data || []);
        setDepartments(departmentsRes.data || []);
        setDesignations(designationsRes.data || []);
        console.log("Departments API", departmentsRes.data);
        console.log("Designations API", designationsRes.data);
        setAssignments((assignmentsRes.data || []).map((a) => ({
          supervisor_id: String(a.user_id),
          ward_id: String(a.ward_id),
          zone_id: String(a.zone_id),
          city_id: String(a.city_id),
        })));

        setDownloadFilters((prev) => {
          const nextFilters = { ...prev };
          if (scopeAll) {
            nextFilters.cityId = "all";
          } else if (cityList.length === 1) {
            nextFilters.cityId = String(cityList[0].city_id);
          } else if (cityList.length > 1) {
            nextFilters.cityId = String(cityList[0].city_id);
          }
          return nextFilters;
        });
      } catch (error) {
        console.error("Error loading filter options:", error);
      }
    };

    fetchFilterOptions();
  }, []);


  // Removed redundant supervisor city-change Effect to prevent overwriting global supervisors list.
  // The filteredSupervisors useMemo already handles city-level filtering for the dropdown.



  // Supervisors whose assigned wards contain at least one employee from the selected department
  const supervisorsByDepartment = useMemo(() => {
    const departmentIds = downloadFilters.departmentIds || [];
    const designationIds = downloadFilters.designationIds || [];
    if (departmentIds.length === 0 && designationIds.length === 0) return [];

    const selectedDeptNames = departments
      .filter(d => departmentIds.includes(String(d.department_id)))
      .map(d => d.department_name.toLowerCase());

    const selectedDesNames = designations
      .filter(d => designationIds.includes(String(d.designation_id)))
      .map(d => d.designation_name.toLowerCase());

    // Find all wards that have at least one employee matching dept/designation
    const relevantWardNames = new Set(
      employees
        .filter(e => {
          const deptMatch = selectedDeptNames.length === 0 ||
            selectedDeptNames.includes(String(e.department || "").toLowerCase());
          const desMatch = selectedDesNames.length === 0 ||
            selectedDesNames.includes(String(e.designation || "").toLowerCase());
          return deptMatch && desMatch;
        })
        .map(e => String(e.ward || "").toLowerCase())
        .filter(Boolean)
    );

    // Map ward names → ward_ids
    const relevantWardIds = new Set(
      wards
        .filter(w => relevantWardNames.has(w.ward_name.toLowerCase()))
        .map(w => String(w.ward_id))
    );

    // Find assignments for those ward_ids
    const relevantSupIds = new Set(
      assignments
        .filter(a => relevantWardIds.has(String(a.ward_id)))
        .map(a => String(a.supervisor_id))
    );

    // Build result: supervisor info + their relevant ward names
    return supervisors
      .filter(s => relevantSupIds.has(String(s.user_id)))
      .map(s => {
        const supWardIds = assignments
          .filter(a => String(a.supervisor_id) === String(s.user_id) && relevantWardIds.has(String(a.ward_id)))
          .map(a => String(a.ward_id));
        const supWardNames = wards
          .filter(w => supWardIds.includes(String(w.ward_id)))
          .map(w => w.ward_name);
        return { ...s, relevantWards: supWardNames };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [supervisors, employees, assignments, wards, departments, designations, downloadFilters.departmentId, downloadFilters.designationId]);

  const filteredSupervisors = useMemo(() => {
    const { cityId, zoneId, sectorId, selectedKothiIds, departmentIds, designationIds } = downloadFilters;

    const hasAreaFilter =
      (cityId && cityId !== "all") ||
      (zoneId && zoneId !== "all") ||
      (sectorId && sectorId !== "all") ||
      (selectedKothiIds && selectedKothiIds.length > 0);

    const hasDeptFilter = (departmentIds && departmentIds.length > 0) ||
      (designationIds && designationIds.length > 0);

    // Start with all supervisors
    let base = supervisors;

    // Filter by department if active
    if (hasDeptFilter) {
      const deptSupIds = new Set(supervisorsByDepartment.map(s => String(s.user_id)));
      base = base.filter(s => deptSupIds.has(String(s.user_id)));
    }

    // Filter by city if selected
    if (cityId && cityId !== "all") {
      const cityWards = wards.filter(w => String(w.city_id) === String(cityId)).map(w => String(w.ward_id));
      const citySupIds = new Set(assignments.filter(a => cityWards.includes(String(a.ward_id))).map(a => String(a.supervisor_id)));
      base = base.filter(s => citySupIds.has(String(s.user_id)));
    }

    if (!hasAreaFilter) return base;

    // Further narrow by ward-area filters
    let allowedWardIds = assignments;
    if (zoneId && zoneId !== "all") {
      allowedWardIds = allowedWardIds.filter((a) => String(a.zone_id) === String(zoneId));
    }
    if (sectorId && sectorId !== "all") {
      const wardIdsInSector = wards
        .filter((w) => String(w.sector_id) === String(sectorId))
        .map((w) => String(w.ward_id));
      allowedWardIds = allowedWardIds.filter((a) => wardIdsInSector.includes(String(a.ward_id)));
    }
    if (selectedKothiIds && selectedKothiIds.length > 0) {
      allowedWardIds = allowedWardIds.filter((a) =>
        selectedKothiIds.includes(String(a.ward_id))
      );
    }

    const allowedSupervisorIds = new Set(allowedWardIds.map((a) => String(a.supervisor_id)));
    return base.filter((s) => allowedSupervisorIds.has(String(s.user_id)));
  }, [supervisors, supervisorsByDepartment, assignments, wards, downloadFilters]);

  // Supervisor Distribution summary migrated to Supervisors.js

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".kothi-dropdown-container")) setIsKothiDropdownOpen(false);
      if (!event.target.closest(".dept-dropdown-container")) setIsDeptDropdownOpen(false);
      if (!event.target.closest(".des-dropdown-container")) setIsDesDropdownOpen(false);
      if (!event.target.closest(".supervisor-dropdown-container")) setIsSupervisorDropdownOpen(false);
      if (!event.target.closest(".employee-dropdown-container")) setIsEmployeeDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setDownloadFilters((prev) => ({
      ...prev,
      singleDate: selectedDate,
    }));
  }, [selectedDate]);

  const filteredZones = useMemo(() => {
    if (downloadFilters.cityId === "all") {
      return zones;
    }
    return zones.filter(
      (zone) => String(zone.city_id) === String(downloadFilters.cityId)
    );
  }, [zones, downloadFilters.cityId]);

  const filteredSectors = useMemo(() => {
    return sectors.filter((s) => {
      const matchesCity =
        downloadFilters.cityId === "all" ||
        String(s.city_id) === String(downloadFilters.cityId);
      const matchesZone =
        downloadFilters.zoneId === "all" ||
        String(s.zone_id) === String(downloadFilters.zoneId);
      return matchesCity && matchesZone;
    });
  }, [sectors, downloadFilters.cityId, downloadFilters.zoneId]);

  const areaScopedEmployees = useMemo(() => {
    let result = employees;
    const { cityId, zoneId, sectorId, selectedKothiIds } = downloadFilters;

    if (cityId && cityId !== "all") {
      const selectedCity = cities.find(c => String(c.city_id) === String(cityId));
      if (selectedCity) {
        const isPune = selectedCity.city_name?.toLowerCase() === "pune";
        result = result.filter(e => {
          const matchesCity = String(e.city || "").toLowerCase() === selectedCity.city_name.toLowerCase();
          if (!matchesCity) return false;
          // Pune-specific: hide Housekeeping
          if (isPune && String(e.department || "").trim().toLowerCase() === "housekeeping") return false;
          return true;
        });
      }
    }

    if (zoneId && zoneId !== "all") {
      const selectedZone = zones.find(z => String(z.zone_id) === String(zoneId));
      if (selectedZone) {
        result = result.filter(e => String(e.zone || "").toLowerCase() === selectedZone.zone_name.toLowerCase());
      }
    }

    if (sectorId && sectorId !== "all") {
      const kothiNames = wards
        .filter((w) => String(w.sector_id) === String(sectorId))
        .map((w) => w.ward_name.toLowerCase());
      if (kothiNames.length) {
        result = result.filter(e => kothiNames.includes(String(e.ward || "").toLowerCase()));
      }
    }

    if (selectedKothiIds && selectedKothiIds.length > 0) {
      const selectedKothiNames = wards
        .filter((w) => selectedKothiIds.includes(String(w.ward_id)))
        .map((w) => w.ward_name.toLowerCase());
      result = result.filter(e => selectedKothiNames.includes(String(e.ward || "").toLowerCase()));
    }
    return result;
  }, [employees, downloadFilters.cityId, downloadFilters.zoneId, downloadFilters.sectorId, downloadFilters.selectedKothiIds, cities, zones, wards]);

  const deptEmployeeCount = useMemo(() => {
    const { departmentIds } = downloadFilters;
    if (!departmentIds || departmentIds.length === 0) return areaScopedEmployees.length;

    const selectedDeptNames = departments
      .filter(d => departmentIds.includes(String(d.department_id)))
      .map(d => (d.department_name || "").trim().toLowerCase());

    return areaScopedEmployees.filter(e =>
      selectedDeptNames.includes(String(e.department || "").trim().toLowerCase())
    ).length;
  }, [areaScopedEmployees, downloadFilters.departmentIds, departments]);

  const desEmployeeCount = useMemo(() => {
    const { designationIds } = downloadFilters;
    if (!designationIds || designationIds.length === 0) return areaScopedEmployees.length;

    const selectedDesNames = designations
      .filter(d => designationIds.includes(String(d.designation_id)))
      .map(d => (d.designation_name || "").trim().toLowerCase());

    return areaScopedEmployees.filter(e =>
      selectedDesNames.includes(String(e.designation || "").trim().toLowerCase())
    ).length;
  }, [areaScopedEmployees, downloadFilters.designationIds, designations]);


  // const filteredDepartments = useMemo(() => {
  //   // If no specific city is selected, we could show all or match what's in the data.
  //   // Given the UX requirement, we filter based on areaScopedEmployees.
  //   const selectedCity = cities.find(c => String(c.city_id) === String(downloadFilters.cityId));
  //   const isPune = selectedCity && selectedCity.city_name?.toLowerCase() === "pune";

  //   if (downloadFilters.cityId === "all") {
  //     return departments;
  //   }

  //   const activeDeptNames = new Set(
  //     areaScopedEmployees.map(e => String(e.department || e.department_name || "").trim().toLowerCase())
  //   );

  //   return departments.filter(d => {
  //     const deptName = String(d.department_name || "").trim().toLowerCase();
  //     // Pune-specific: hide Housekeeping option
  //     if (isPune && deptName === "housekeeping") return false;
  //     return activeDeptNames.has(deptName);
  //   }).sort((a, b) => (a.department_name || "").localeCompare(b.department_name || ""));
  // }, [departments, areaScopedEmployees, downloadFilters.cityId, cities]);
  const filteredDepartments = useMemo(() => {
    const selectedCity = cities.find(
      c => String(c.city_id) === String(downloadFilters.cityId)
    );
    const isPune =
      selectedCity &&
      selectedCity.city_name?.toLowerCase() === "pune";

    let result = [...departments];

    if (isPune) {
      result = result.filter(
        d =>
          String(d.department_name).toLowerCase() !== "housekeeping"
      );
    }

    return result.sort((a, b) =>
      (a.department_name || "").localeCompare(
        b.department_name || ""
      )
    );
  }, [departments, downloadFilters.cityId, cities]);
  const filteredDesignations = useMemo(() => {
    let result = [...designations];

    if (
      downloadFilters.departmentIds &&
      downloadFilters.departmentIds.length > 0
    ) {
      result = result.filter(d =>
        downloadFilters.departmentIds.includes(
          String(d.department_id)
        )
      );
    }

    return result.sort((a, b) =>
      (a.designation_name || "").localeCompare(
        b.designation_name || ""
      )
    );
  }, [designations, downloadFilters.departmentIds]);
  const filteredEmployeesList = useMemo(() => {
    let result = employees;
    const { cityId, zoneId, sectorId, departmentIds, designationIds, selectedKothiIds } = downloadFilters;

    if (cityId && cityId !== "all") {
      const selectedCity = cities.find(c => String(c.city_id) === String(cityId));
      if (selectedCity) {
        const isPune = selectedCity.city_name?.toLowerCase() === "pune";
        result = result.filter(e => {
          const matchesCity = String(e.city || "").toLowerCase() === selectedCity.city_name.toLowerCase();
          if (!matchesCity) return false;
          // Pune-specific: hide Housekeeping
          if (isPune && String(e.department || "").trim().toLowerCase() === "housekeeping") return false;
          return true;
        });
      }
    }

    if (zoneId && zoneId !== "all") {
      const selectedZone = zones.find(z => String(z.zone_id) === String(zoneId));
      if (selectedZone) {
        result = result.filter(e => String(e.zone || "").toLowerCase() === selectedZone.zone_name.toLowerCase());
      }
    }

    if (sectorId && sectorId !== "all") {
      const kothiNames = wards
        .filter((w) => String(w.sector_id) === String(sectorId))
        .map((w) => w.ward_name.toLowerCase());
      if (kothiNames.length) {
        result = result.filter(e => kothiNames.includes(String(e.ward || "").toLowerCase()));
      }
    }

    if (selectedKothiIds && selectedKothiIds.length > 0) {
      const selectedKothiNames = wards
        .filter((w) => selectedKothiIds.includes(String(w.ward_id)))
        .map((w) => w.ward_name.toLowerCase());
      result = result.filter(e => selectedKothiNames.includes(String(e.ward || "").toLowerCase()));
    }

    if (departmentIds && departmentIds.length > 0) {
      const selectedDeptNames = departments
        .filter(d => departmentIds.includes(String(d.department_id)))
        .map(d => d.department_name.toLowerCase());
      result = result.filter(e => selectedDeptNames.includes(String(e.department || "").toLowerCase()));
    }

    if (designationIds && designationIds.length > 0) {
      const selectedDesNames = designations
        .filter(d => designationIds.includes(String(d.designation_id)))
        .map(d => d.designation_name.toLowerCase());
      result = result.filter(e => selectedDesNames.includes(String(e.designation || "").toLowerCase()));
    }

    return [...result].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [employees, downloadFilters, cities, zones, wards, departments, designations]);


  const filteredWards = useMemo(() => {
    // If a specific sector is selected, we prioritize kothis assigned to it in the sectors state
    if (downloadFilters.sectorId && downloadFilters.sectorId !== "all") {
      const selectedSector = sectors.find(s => String(s.sector_id) === String(downloadFilters.sectorId));
      if (selectedSector && Array.isArray(selectedSector.kothiIds)) {
        return wards.filter(w => selectedSector.kothiIds.includes(String(w.ward_id)));
      }
    }

    // Default filtering for "all" sectors or fallback
    return wards.filter((ward) => {
      const matchesCity =
        !downloadFilters.cityId || downloadFilters.cityId === "all" ||
        String(ward.city_id) === String(downloadFilters.cityId);
      const matchesZone =
        !downloadFilters.zoneId || downloadFilters.zoneId === "all" ||
        String(ward.zone_id) === String(downloadFilters.zoneId);

      return matchesCity && matchesZone;
    });
  }, [wards, downloadFilters.cityId, downloadFilters.zoneId, downloadFilters.sectorId, sectors]);



  const handleKothiToggle = (kothiId) => {
    setDownloadFilters(prev => {
      const current = Array.isArray(prev.selectedKothiIds) ? prev.selectedKothiIds : [];
      const sId = String(kothiId);
      const next = current.includes(sId)
        ? current.filter(id => id !== sId)
        : [...current, sId];
      return { ...prev, selectedKothiIds: next };
    });
  };

  const handleCityChange = (value) => {
    let finalValue = value;
    if (!cityScopeAll && value === "all") {
      const firstCity = cities[0];
      finalValue = firstCity ? String(firstCity.city_id) : "all";
    }

    setDownloadFilters((prev) => ({
      ...prev,
      cityId: finalValue,
      zoneId: "all",
      sectorId: "all",
      selectedKothiIds: [],
      wardId: "all",
      departmentId: "all",
      designationId: "all",
      employeeId: "all",
    }));
    setKothiSearch("");
  };

  const handleZoneChange = (value) => {
    let cityIdToSet = downloadFilters.cityId;
    if (value !== "all") {
      const zone = zones.find(z => String(z.zone_id) === String(value));
      if (zone) cityIdToSet = String(zone.city_id);
    }

    setDownloadFilters((prev) => ({
      ...prev,
      cityId: cityIdToSet,
      zoneId: value,
      sectorId: "all",
      selectedKothiIds: [],
      wardId: "all",
      employeeId: "all",
    }));
    setKothiSearch("");
  };

  const handleSectorChange = (value) => {
    let cityIdToSet = downloadFilters.cityId;
    let zoneIdToSet = downloadFilters.zoneId;

    if (value !== "all") {
      const sector = sectors.find(s => String(s.sector_id) === String(value));
      if (sector) {
        cityIdToSet = String(sector.city_id);
        zoneIdToSet = String(sector.zone_id);
      }
    }

    setDownloadFilters((prev) => ({
      ...prev,
      cityId: cityIdToSet,
      zoneId: zoneIdToSet,
      sectorId: value,
      selectedKothiIds: [],
      wardId: "all",
      employeeId: "all",
    }));
    setKothiSearch("");
  };

  const singleCityMode = !cityScopeAll && cities.length === 1;

  const attendanceEmpIds = useMemo(() => {
    const identifiers = new Set();
    records.forEach((record) => {
      const id = record.emp_id ?? record.employee_id;
      if (id !== undefined && id !== null) {
        identifiers.add(String(id));
      }
    });
    return identifiers;
  }, [records]);

  const notMarkedEntries = useMemo(() => {
    if (!employees.length) {
      return [];
    }

    return employees
      .filter((employee) => !attendanceEmpIds.has(String(employee.emp_id)))
      .map((employee) => ({
        emp_id: employee.emp_id,
        name: employee.name,
        emp_code: employee.emp_code,
        contact_no: employee.phone,
        ward: employee.ward ?? employee.ward_name ?? "-",
        zone: employee.zone ?? employee.zone_name ?? "-",
        city: employee.city ?? employee.city_name ?? "-",
        department: employee.department ?? "-",
        designation: employee.designation ?? "-",
        isPlaceholder: true,
      }));
  }, [employees, attendanceEmpIds]);

  const faceRegisteredEmployeeIds = useMemo(() => {
    const ids = new Set();
    (employees || []).forEach((emp) => {
      const isRegistered = Boolean(emp.face_registered || emp.faceRegistered || emp.face_embedding);
      const id = emp.emp_id ?? emp.employee_id;
      if (isRegistered && id !== undefined && id !== null) {
        ids.add(String(id));
      }
    });
    return ids;
  }, [employees]);

  // ── Registered employee stats (respects area filters) ──────────────────────
  const registeredStats = useMemo(() => {
    let registered = employees;

    // Filter by city
    if (downloadFilters.cityId && downloadFilters.cityId !== "all") {
      const selectedCity = cities.find(
        (c) => String(c.city_id) === String(downloadFilters.cityId)
      );
      if (selectedCity) {
        registered = registered.filter(
          (e) =>
            String(e.city || "").toLowerCase() ===
            selectedCity.city_name.toLowerCase()
        );
      }
    }

    // Filter by zone
    if (downloadFilters.zoneId && downloadFilters.zoneId !== "all") {
      const selectedZone = zones.find(
        (z) => String(z.zone_id) === String(downloadFilters.zoneId)
      );
      if (selectedZone) {
        registered = registered.filter(
          (e) =>
            String(e.zone || "").toLowerCase() ===
            selectedZone.zone_name.toLowerCase()
        );
      }
    }

    // Filter by Ward (sector)
    if (downloadFilters.sectorId && downloadFilters.sectorId !== "all") {
      const kothisInWard = wards
        .filter((w) => String(w.sector_id) === String(downloadFilters.sectorId))
        .map((w) => w.ward_name.toLowerCase());
      if (kothisInWard.length > 0) {
        registered = registered.filter((e) =>
          kothisInWard.includes(String(e.ward || "").toLowerCase())
        );
      }
    }

    // Filter by Kothi (multi-select)
    const sKothiIds = downloadFilters.selectedKothiIds || [];
    if (sKothiIds.length > 0) {
      const selectedKothiNames = wards
        .filter((w) => sKothiIds.includes(String(w.ward_id)))
        .map((w) => w.ward_name.toLowerCase());
      if (selectedKothiNames.length > 0) {
        registered = registered.filter((e) =>
          selectedKothiNames.includes(String(e.ward || "").toLowerCase())
        );
      }
    }

    const totalRegistered = registered.length;

    const getPunchStartTime = (r) =>
      r.punch_in ||
      r.punch_in_time ||
      r.mid_shift_punch_in ||
      r.mid_shift_punch_in_time;
    const hasPunchStart = (r) =>
      Boolean(
        r.punch_in ||
        r.punch_in_time ||
        r.mid_shift_punch_in ||
        r.mid_shift_punch_in_time
      );

    // Shift-aware Punch In set (Active: started but not Out)
    const activeInIds = new Set(
      records
        .filter(r => isShiftMatched(getPunchStartTime(r), downloadFilters.shift))
        .filter(r => hasPunchStart(r) && !(r.punch_out || r.punch_out_time))
        .map((r) => String(r.emp_id ?? r.employee_id))
    );

    // Shift-aware Completed set (must have both in + out)
    const completedIds = new Set(
      records
        .filter(r => isShiftMatched(getPunchStartTime(r), downloadFilters.shift))
        .filter(r => hasPunchStart(r) && (r.punch_out || r.punch_out_time))
        .map((r) => String(r.emp_id ?? r.employee_id))
    );

    const completedRows = records
      .filter(r => isShiftMatched(getPunchStartTime(r), downloadFilters.shift))
      .filter(r => hasPunchStart(r) && (r.punch_out || r.punch_out_time));

    // Employee is treated as auto if any completed record for that employee is auto.
    const punchOutModeByEmployee = new Map();
    completedRows.forEach((r) => {
      const id = String(r.emp_id ?? r.employee_id);
      if (!id) return;
      if (!punchOutModeByEmployee.has(id)) {
        punchOutModeByEmployee.set(id, isAutoPunchOutRecord(r) ? "auto" : "manual");
        return;
      }
      if (isAutoPunchOutRecord(r)) {
        punchOutModeByEmployee.set(id, "auto");
      }
    });

    const autoPunchedOutIds = new Set(
      Array.from(punchOutModeByEmployee.entries())
        .filter(([, mode]) => mode === "auto")
        .map(([id]) => id)
    );

    // Match Dashboard logic: present means punch-in exists (in-progress or completed).
    const presentIds = new Set(
      records
        .filter(r => isShiftMatched(getPunchStartTime(r), downloadFilters.shift))
        .filter(r => hasPunchStart(r))
        .map((r) => String(r.emp_id ?? r.employee_id))
    );

    const midShiftIds = new Set(
      records
        .filter((r) => isShiftMatched(getPunchStartTime(r), downloadFilters.shift))
        .filter((r) => Boolean(r.mid_shift_punch_in || r.mid_shift_punch_in_time))
        .map((r) => String(r.emp_id ?? r.employee_id))
    );

    const manualPunchedOutIds = new Set(
      Array.from(punchOutModeByEmployee.entries())
        .filter(([, mode]) => mode === "manual")
        .map(([id]) => id)
    );

    // On Leave set
    const onLeaveIds = new Set(
      records
        .filter(r => r.leave_type && !(r.punch_in || r.punch_in_time))
        .map(r => String(r.emp_id ?? r.employee_id))
    );
    const isRange = downloadFilters.dateMode === "range";

    // Build a Set of registered emp_ids for scoping records
    const registeredEmpIds = new Set(registered.map((e) => String(e.emp_id)));

    // Scope all records to only registered (area-filtered) employees
    const scopedRecords = records.filter((r) =>
      registeredEmpIds.has(String(r.emp_id ?? r.employee_id))
    );

    // Shift-filtered scoped records
    const shiftScopedRecords = scopedRecords.filter((r) =>
      isShiftMatched(getPunchStartTime(r), downloadFilters.shift)
    );

    // All completed rows (both punch in + out) within shift scope
    const scopedCompletedRows = shiftScopedRecords.filter(
      (r) => hasPunchStart(r) && (r.punch_out || r.punch_out_time)
    );

    // ── SINGLE DATE: unique employee counts (original behaviour) ─────────────
    // ── DATE RANGE:  total row/occurrence counts ──────────────────────────────

    const totalPunchIn = isRange
      ? shiftScopedRecords.filter((r) => hasPunchStart(r)).length
      : registered.filter((e) => activeInIds.has(String(e.emp_id))).length;

    const totalPresent = isRange
      ? shiftScopedRecords.filter((r) => hasPunchStart(r)).length
      : registered.filter((e) => presentIds.has(String(e.emp_id))).length;

    const totalMidShiftPunchIn = isRange
      ? shiftScopedRecords.filter((r) => r.mid_shift_punch_in || r.mid_shift_punch_in_time).length
      : registered.filter((e) => midShiftIds.has(String(e.emp_id))).length;

    const totalPunchedOut = isRange
      ? scopedCompletedRows.length
      : registered.filter((e) => completedIds.has(String(e.emp_id))).length;

    const totalAutoPunchedOut = isRange
      ? scopedCompletedRows.filter((r) => isAutoPunchOutRecord(r)).length
      : registered.filter((e) => autoPunchedOutIds.has(String(e.emp_id))).length;

    const totalManualPunchedOut = isRange
      ? scopedCompletedRows.filter((r) => !isAutoPunchOutRecord(r)).length
      : registered.filter((e) => manualPunchedOutIds.has(String(e.emp_id))).length;

    const totalOnLeave = isRange
      ? scopedRecords.filter((r) => r.leave_type).length
      : registered.filter((e) => onLeaveIds.has(String(e.emp_id))).length;

    // Absent stays as unique employees who never appeared in the date range
    const totalAbsent = registered.filter(
      (e) =>
        !presentIds.has(String(e.emp_id)) &&
        !onLeaveIds.has(String(e.emp_id))
    ).length;

    return {
      totalRegistered,
      totalPunchIn,
      totalPresent,
      totalMidShiftPunchIn,
      totalPunchedOut,
      totalPunchOutCombined: totalManualPunchedOut + totalAutoPunchedOut,
      totalAutoPunchedOut,
      totalManualPunchedOut,
      totalOnLeave,
      totalAbsent,
      isRange,
    };
  }, [
    employees,
    records,
    cities,
    zones,
    wards,
    downloadFilters.cityId,
    downloadFilters.zoneId,
    downloadFilters.sectorId,
    downloadFilters.selectedKothiIds,
    downloadFilters.departmentIds,
    downloadFilters.designationIds,
    downloadFilters.shift,
    isShiftMatched,
    isAutoPunchOutRecord,
    downloadFilters.dateMode,
  ]);

  // Helper to check if an employee falls inside the currently selected area filters
  const matchesAreaFilters = useCallback((emp) => {
    if (downloadFilters.cityId && downloadFilters.cityId !== "all") {
      const selectedCity = cities.find(
        (c) => String(c.city_id) === String(downloadFilters.cityId)
      );
      if (selectedCity) {
        const cityName = (emp.city || emp.city_name || "").toLowerCase();
        if (cityName !== selectedCity.city_name.toLowerCase()) return false;
      }
    }

    if (downloadFilters.departmentIds && downloadFilters.departmentIds.length > 0) {
      const selectedDeptNames = departments
        .filter(d => downloadFilters.departmentIds.includes(String(d.department_id)))
        .map(d => d.department_name.toLowerCase());
      const deptName = (emp.department || emp.department_name || "").toLowerCase();
      if (!selectedDeptNames.includes(deptName)) return false;
    }

    if (downloadFilters.designationIds && downloadFilters.designationIds.length > 0) {
      const selectedDesNames = designations
        .filter(d => downloadFilters.designationIds.includes(String(d.designation_id)))
        .map(d => d.designation_name.toLowerCase());
      const desName = (emp.designation || emp.designation_name || "").toLowerCase();
      if (!selectedDesNames.includes(desName)) return false;
    }

    if (downloadFilters.zoneId && downloadFilters.zoneId !== "all") {
      const selectedZone = zones.find(
        (z) => String(z.zone_id) === String(downloadFilters.zoneId)
      );
      if (selectedZone) {
        const zoneName = (emp.zone || emp.zone_name || "").toLowerCase();
        if (zoneName !== selectedZone.zone_name.toLowerCase()) return false;
      }
    }

    if (downloadFilters.sectorId && downloadFilters.sectorId !== "all") {
      const kothiNames = wards
        .filter((w) => String(w.sector_id) === String(downloadFilters.sectorId))
        .map((w) => w.ward_name.toLowerCase());
      if (kothiNames.length) {
        const wardName = (emp.ward || emp.ward_name || "").toLowerCase();
        if (!kothiNames.includes(wardName)) return false;
      }
    }

    const selectedKothiIds = downloadFilters.selectedKothiIds || [];
    if (selectedKothiIds.length > 0) {
      const selectedKothiNames = wards
        .filter((w) => selectedKothiIds.includes(String(w.ward_id)))
        .map((w) => w.ward_name.toLowerCase());
      const wardName = (emp.ward || emp.ward_name || "").toLowerCase();
      if (!selectedKothiNames.includes(wardName)) return false;
    }

    return true;
  }, [downloadFilters.cityId, downloadFilters.zoneId, downloadFilters.sectorId, downloadFilters.selectedKothiIds, downloadFilters.departmentIds, downloadFilters.designationIds, cities, zones, wards, departments, designations]);

  // Employees whose face is not registered (respects area filters)
  const faceUnregisteredEmployees = useMemo(() => {
    return (employees || [])
      .filter(
        (emp) =>
          !(emp.face_registered || emp.faceRegistered || emp.face_embedding)
      )
      .filter(matchesAreaFilters);
  }, [employees, matchesAreaFilters]);

  const supervisorById = useMemo(() => {
    const map = new Map();
    supervisors.forEach((s) => map.set(String(s.user_id), s));
    return map;
  }, [supervisors]);

  const wardNameToId = useMemo(() => {
    const map = new Map();
    wards.forEach((w) => {
      if (w.ward_name) {
        map.set(String(w.ward_name).toLowerCase(), String(w.ward_id));
      }
    });
    return map;
  }, [wards]);

  const supervisorByWard = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => {
      if (a.ward_id !== undefined && a.supervisor_id !== undefined) {
        map.set(String(a.ward_id), String(a.supervisor_id));
      }
    });
    return map;
  }, [assignments]);

  // Map ward name (lowercase) to supervisor_id, for cases where employees lack ward_id
  const supervisorByWardName = useMemo(() => {
    const map = new Map();
    assignments.forEach((a) => {
      const wardId = String(a.ward_id);
      const supId = String(a.supervisor_id);
      const ward = wards.find((w) => String(w.ward_id) === wardId);
      if (ward?.ward_name) {
        const key = ward.ward_name.toLowerCase();
        // Only set if not already mapped to avoid overwriting in multi-assign scenarios
        if (!map.has(key)) {
          map.set(key, supId);
        }
      }
    });
    return map;
  }, [assignments, wards]);

  const faceTotal = faceUnregisteredEmployees.length;
  const faceTotalPages = Math.max(1, Math.ceil(faceTotal / facePageSize));
  const facePaginatedEmployees = useMemo(() => {
    const start = Math.max(0, (facePage - 1) * facePageSize);
    return faceUnregisteredEmployees.slice(start, start + facePageSize);
  }, [faceUnregisteredEmployees, facePage, facePageSize]);

  const getSupervisorNameForEmployee = (emp) => {
    const wardId = emp.ward_id ?? emp.wardId;
    const wardName = (emp.ward || emp.ward_name || "").toLowerCase();

    const trySupervisor = (supId) => {
      if (!supId) return null;
      const sup = supervisorById.get(String(supId));
      return sup?.name || null;
    };

    // 1) Direct ward_id mapping
    if (wardId !== undefined && wardId !== null) {
      const name = trySupervisor(supervisorByWard.get(String(wardId)));
      if (name) return name;
    }

    // 2) Map ward name to ward id, then to supervisor
    if (wardName) {
      const mappedWardId = wardNameToId.get(wardName);
      const name = trySupervisor(supervisorByWard.get(String(mappedWardId)));
      if (name) return name;
    }

    // 3) Direct ward name -> supervisor mapping (fallback when no ward_id present)
    if (wardName) {
      const name = trySupervisor(supervisorByWardName.get(wardName));
      if (name) return name;
    }

    return "-";
  };


  const formatLeaveTypeLabel = (leaveType) => {
    const raw = String(leaveType || "").trim();
    if (!raw) return "";
    const code = raw.toUpperCase();
    const map = {
      ABSENT: "Absent",
      LOP: "LOP",
      EL: "EL",
      SLML: "SL/ML",
      CL: "CL",
      COMP_OFF: "Comp Off",
      OUT_DUTY: "Out Duty",
      WEEKLY_OFF: "Weekly Off",
      NIGHT_SHIFT: "Night Shift",
      AFTERNOON_SHIFT: "Afternoon Shift",
    };
    return map[code] || raw;
  };

  const deriveStatus = (record) => {
    if (record?.leave_type) return "Leave";
    const hasIn = Boolean(record?.punch_in);
    const hasOut = Boolean(record?.punch_out);
    if (record?.isPlaceholder) return "Not Marked";
    if (hasIn && hasOut) return "Marked";
    if (hasIn && !hasOut) return "In Progress";
    if (hasIn || hasOut) return "Marked"; // fallback if at least one exists
    return "Not Marked"; // Default to Not Marked if no activity
  };

  const deriveStatusLabel = (record) => {
    if (record?.leave_type) {
      const leaveTypeLabel = formatLeaveTypeLabel(record.leave_type);
      return leaveTypeLabel ? `Leave (${leaveTypeLabel})` : "Leave";
    }
    return deriveStatus(record);
  };

  const displayRecords = useMemo(() => {
    switch (recordFilter) {
      case "marked":
        return records.filter((r) => deriveStatus(r) !== "Not Marked");
      case "unmarked":
        return notMarkedEntries;
      case "leave":
        return records.filter((r) => deriveStatus(r) === "Leave");
      default:
        // When in Date Range mode, we exclude "Not Marked" (placeholder) records 
        // to avoid cluttering the multi-day report with unlogged entries.
        if (downloadFilters.dateMode === "range") {
          return records;
        }
        return [...records, ...notMarkedEntries];
    }
  }, [records, notMarkedEntries, recordFilter]);

  const filteredRecords = useMemo(() => {
    let result = displayRecords;

    // Apply City filter to the table
    if (downloadFilters.cityId && downloadFilters.cityId !== "all") {
      const selectedCity = cities.find(
        (c) => String(c.city_id) === String(downloadFilters.cityId)
      );
      if (selectedCity) {
        result = result.filter(
          (rec) =>
            String(rec.city || "").trim().toLowerCase() ===
            selectedCity.city_name.trim().toLowerCase()
        );
      }
    }

    // Apply zone filter to the table
    if (downloadFilters.zoneId && downloadFilters.zoneId !== "all") {
      const selectedZone = zones.find(
        (z) => String(z.zone_id) === String(downloadFilters.zoneId)
      );
      if (selectedZone) {
        result = result.filter(
          (rec) =>
            String(rec.zone || "").trim().toLowerCase() ===
            selectedZone.zone_name.trim().toLowerCase()
        );
      }
    }

    // Apply Ward (sector) filter — find all Kothis in the selected Ward,
    // then show all employees across those Kothis
    if (downloadFilters.sectorId && downloadFilters.sectorId !== "all") {
      const kothisInWard = wards
        .filter((w) => String(w.sector_id) === String(downloadFilters.sectorId))
        .map((w) => w.ward_name.toLowerCase());
      if (kothisInWard.length > 0) {
        result = result.filter((rec) =>
          kothisInWard.includes(String(rec.ward || "").toLowerCase())
        );
      }
    }

    // Apply Kothi filter to the table (multi-select)
    const sKothiIds = downloadFilters.selectedKothiIds || [];
    if (sKothiIds.length > 0) {
      const selectedKothiNames = wards
        .filter((w) => sKothiIds.includes(String(w.ward_id)))
        .map((w) => w.ward_name.toLowerCase());
      if (selectedKothiNames.length > 0) {
        result = result.filter((rec) =>
          selectedKothiNames.includes(String(rec.ward || "").toLowerCase())
        );
      }
    }
    // Apply Shift filter
    if (downloadFilters.shift && downloadFilters.shift !== "all") {
      result = result.filter((rec) => {
        if (rec.isPlaceholder) return false;
        return isShiftMatched(rec.punch_in || rec.punch_in_time, downloadFilters.shift);
      });
    }

    if (downloadFilters.departmentIds && downloadFilters.departmentIds.length > 0) {
      const selectedDeptNames = departments
        .filter(d => downloadFilters.departmentIds.includes(String(d.department_id)))
        .map(d => d.department_name.trim().toLowerCase());
      result = result.filter(rec => selectedDeptNames.includes(String(rec.department || "").trim().toLowerCase()));
    }

    // Apply Designation filter
    if (downloadFilters.designationIds && downloadFilters.designationIds.length > 0) {
      const selectedDesNames = designations
        .filter(d => downloadFilters.designationIds.includes(String(d.designation_id)))
        .map(d => d.designation_name.trim().toLowerCase());
      result = result.filter(rec => selectedDesNames.includes(String(rec.designation || "").trim().toLowerCase()));
    }

    // Apply Status Scope filter
    const hasPunchIn = (rec) => Boolean(rec.punch_in || rec.punch_in_time);
    const hasMidShiftPunchIn = (rec) =>
      Boolean(
        rec.mid_shift_punch_in ||
        rec.mid_shift_punch_in_time ||
        rec.mid_shift_punch_in_display ||
        rec.mid_shift_punched_in_by ||
        rec.mid_shift_punch_in_image ||
        rec.latitude_mid_in ||
        rec.mid_in_address
      );
    const hasPunchOut = (rec) => Boolean(rec.punch_out || rec.punch_out_time);
    const getRecordEmployeeId = (rec) => String(rec.emp_id ?? rec.employee_id ?? "");

    if (punchFilter === "faceRegistered") {
      result = result.filter((rec) => faceRegisteredEmployeeIds.has(getRecordEmployeeId(rec)));
    } else if (punchFilter === "onLeave") {
      result = result.filter((rec) => Boolean(rec.leave_type));
    } else if (punchFilter === "absent") {
      result = result.filter((rec) => Boolean(rec.isPlaceholder));
    }

    if (punchFilter === "punchIn") {
      // Includes both active punch-in and punch-out-completed users.
      result = result.filter((rec) => !rec.isPlaceholder && hasPunchIn(rec));
    } else if (punchFilter === "midShiftPunchIn") {
      result = result.filter((rec) => !rec.isPlaceholder && hasMidShiftPunchIn(rec));
    } else if (punchFilter === "autoPunchOut") {
      result = result.filter(
        (rec) =>
          !rec.isPlaceholder &&
          hasPunchOut(rec) &&
          isAutoPunchOutRecord(rec)
      );
    } else if (punchFilter === "manualPunchOut") {
      result = result.filter(
        (rec) =>
          !rec.isPlaceholder &&
          hasPunchOut(rec) &&
          !isAutoPunchOutRecord(rec)
      );
    }

    // Apply text search
    if (!normalizedQuery) return result;
    const query = normalizedQuery;
    return result.filter((record) => {
      const candidates = [
        record.name,
        record.emp_code,
        record.city,
        record.zone,
        record.ward,
        record.contact_no,
        record.punch_in,
        record.punch_out,
        record.punched_in_by,
        record.punched_out_by,
        record.in_address,
        record.out_address,
        record.duration,
        record.sr_no,
        record.emp_id,
        record.employee_id,
        record.isPlaceholder ? "Not Marked" : "Marked",
      ];
      return candidates.some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );
    });
  }, [displayRecords, normalizedQuery, downloadFilters.cityId, downloadFilters.zoneId, downloadFilters.sectorId, downloadFilters.selectedKothiIds, downloadFilters.shift, downloadFilters.departmentIds, downloadFilters.designationIds, punchFilter, isShiftMatched, cities, zones, wards, departments, designations, faceRegisteredEmployeeIds, isAutoPunchOutRecord]);
  const simpleRecords = useMemo(() => {

    const map = {};

    // First add ALL registered employees
    filteredEmployeesList.forEach((emp) => {
      map[String(emp.emp_id)] = {
        emp_id: emp.emp_id,
        emp_code: emp.emp_code,

        employee_name: emp.name,

        kothi_name:
          emp.ward_name ||
          emp.ward,

        zone_name:
          emp.zone_name ||
          emp.zone,

        employee_type:
          emp.department ||
          emp.department_name ||
          "-",

        designation_name:
          emp.designation_name ||
          emp.designation ||
          "-",

        days: {},
        summary: {},
      };
    });

    // Then update attendance
    filteredRecords.forEach((record) => {
      const empId = String(record.emp_id || record.employee_id);

      if (!map[empId]) {
        map[empId] = {
          emp_id: empId,
          emp_code: record.emp_code,

          employee_name:
            record.employee_name ||
            record.name,

          kothi_name:
            record.kothi_name ||
            record.ward_name ||
            record.ward,

          zone_name:
            record.zone_name ||
            record.zone,

          employee_type:
            record.department ||
            record.department_name ||
            "-",

          designation_name:
            record.designation_name ||
            record.designation ||
            "-",

          days: {},
          summary: {},
        };
      }
      // if (!map[empId]) {
      //   map[empId] = {
      //     emp_id: empId,
      //     emp_code: record.emp_code,

      //     employee_name:
      //       record.employee_name ||
      //       record.name,

      //     kothi_name:
      //       record.kothi_name ||
      //       record.ward_name ||
      //       record.ward,

      //     zone_name:
      //       record.zone_name ||
      //       record.zone,

      //     designation_name:
      //       record.designation_name ||
      //       record.designation,

      //     days: {},
      //     summary: {},
      //   };
      // }

      const attendanceDate =
        record.date ||
        record.attendance_date ||
        record.attendanceDate;

      if (!attendanceDate) return;

      let key;

      if (/^\d{4}-\d{2}-\d{2}$/.test(attendanceDate)) {
        // already YYYY-MM-DD
        key = attendanceDate;
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(attendanceDate)) {
        // DD-MM-YYYY -> YYYY-MM-DD
        const [d, m, y] = attendanceDate.split("-");
        key = `${y}-${m}-${d}`;
      } else {
        console.log("Invalid attendance date:", attendanceDate);
        return;
      }
      let status = "A";

      if (
        record.punch_in ||
        record.punch_in_time ||
        record.punch_in_datetime
      ) {
        status = "P";
      } else if (record.leave_type) {
        status = String(record.leave_type).toUpperCase();
      }

      map[empId].days[key] = status;

      // Present
      if (status === "P") {
        map[empId].summary.P = (map[empId].summary.P || 0) + 1;
      }

      // Absent
      else if (status === "A" || status === "ABSENT") {
        map[empId].summary.A = (map[empId].summary.A || 0) + 1;
      }

      // Weekly Off
      else if (status === "WEEKLY_OFF" || status === "WO") {
        map[empId].summary.WO = (map[empId].summary.WO || 0) + 1;
      }

      // Medical Leave
      else if (status === "SLML" || status === "ML") {
        map[empId].summary.ML = (map[empId].summary.ML || 0) + 1;
      }

      // Casual Leave
      else if (status === "CL") {
        map[empId].summary.CL = (map[empId].summary.CL || 0) + 1;
      }

      // Earn Leave
      else if (status === "EL") {
        map[empId].summary.EL = (map[empId].summary.EL || 0) + 1;
      }

      // Any other leave
      else {
        map[empId].summary[status] =
          (map[empId].summary[status] || 0) + 1;
      }
    });

    return Object.values(map);
  }, [filteredRecords, employees]);
  const leaveTypes = [
    ...new Set(
      simpleRecords.flatMap((emp) => Object.keys(emp.summary))
        .filter((k) => !["P", "A", "TOTAL"].includes(k))
    ),
  ].sort();

  const summaryColumns = [
    "P",
    "A",
    ...leaveTypes,
    "TOTAL",
  ];

  const totalRecords = filteredRecords.length;
  const uniqueEmployeeCount = new Set(
    filteredRecords.map(
      (r) => String(r.emp_id || r.employee_id || "")
    )
  ).size;
  const duplicateCount =
    filteredRecords.length - uniqueEmployeeCount;

  console.log("duplicateCount", duplicateCount);
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const { paginatedRecords, startIndex } = useMemo(() => {
    const start = Math.max(0, (currentPage - 1) * pageSize);
    return {
      paginatedRecords: filteredRecords.slice(start, start + pageSize),
      startIndex: start,
    };
  }, [filteredRecords, currentPage, pageSize]);
  const showingFrom = totalRecords ? startIndex + 1 : 0;
  const showingTo = totalRecords
    ? Math.min(startIndex + pageSize, totalRecords)
    : 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedQuery, recordFilter, selectedDate, downloadFilters.zoneId, downloadFilters.sectorId, downloadFilters.wardId]);

  useEffect(() => {
    setFacePage(1);
  }, [downloadFilters.cityId, downloadFilters.zoneId, downloadFilters.sectorId, downloadFilters.selectedKothiIds, showFaceUnregistered, facePageSize]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!cityScopeAll && cities.length === 1) {
      setDownloadFilters((prev) => ({
        ...prev,
        cityId: String(cities[0].city_id),
      }));
    }
  }, [cityScopeAll, cities]);



  const buildRowKey = (record, index) =>
    record.isPlaceholder
      ? `absent-${record.emp_id}-${index}`
      : `attendance-${record.attendance_id ?? record.sr_no ?? index}`;

  const handleResetFilters = () => {
    setDownloadFilters(prev => ({
      ...prev,
      cityId: cityScopeAll ? "all" : (cities[0]?.city_id || "all"),
      zoneId: "all",
      sectorId: "all",
      selectedKothiIds: [],
      departmentIds: [],
      designationIds: [],
      supervisorId: "all",
      employeeId: "all",
      shift: "all",
    }));
    setRecordFilter("all");
    setPunchFilter("all");
    setShowFaceUnregistered(false);
  };

  const updateDownloadFilter = (field, value) => {
    setDownloadFilters((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };
      if (field === "reportLayout" && value !== "supervisor_summary") {
        next.absenteesOnly = "false";
      }
      return next;
    });
  };

  const handleDepartmentToggle = (deptId) => {
    setDownloadFilters(prev => {
      const current = Array.isArray(prev.departmentIds) ? prev.departmentIds : [];
      const dId = String(deptId);
      const next = current.includes(dId)
        ? current.filter(id => id !== dId)
        : [...current, dId];
      return {
        ...prev,
        departmentIds: next,
        employeeId: "all"
      };
    });
  };

  const handleDesignationToggle = (desId) => {
    setDownloadFilters(prev => {
      const current = Array.isArray(prev.designationIds) ? prev.designationIds : [];
      const dId = String(desId);
      const next = current.includes(dId)
        ? current.filter(id => id !== dId)
        : [...current, dId];
      return {
        ...prev,
        designationIds: next,
        employeeId: "all"
      };
    });
  };



  const handleDownloadReport = async (event) => {
    event.preventDefault();

    // if (reportType === "simple") {
    //   return handleDownloadSimpleReport(event);
    // }
    setDownloadError("");
    setDownloadMessage("");

    const {
      dateMode,
      singleDate,
      startDate,
      endDate,
      cityId,
      zoneId,
      supervisorId,
      employeeId,
      empCode,
      hasPunchIn,
      hasPunchOut,
      autoPunchOut,
      reportLayout,
      absenteesOnly,
      shift,
    } = downloadFilters;

    const params = new URLSearchParams();
    const layout =
      reportType === "simple"
        ? "simple"
        : (reportLayout || DEFAULT_GROUP_BY);

    params.set("group_by", layout);
    if (layout === "supervisor_summary" && absenteesOnly === "true") {
      params.set("absentees_only", "true");
    }
    if (shift && shift !== "all") {
      params.set("shift", shift);
    }

    if (dateMode === "single" && singleDate) {
      params.set("date", singleDate);
      params.set("singleDate", singleDate);
    } else {
      if (startDate) {
        params.set("startDate", startDate);
        params.set("start_date", startDate);
      }
      if (endDate) {
        params.set("endDate", endDate);
        params.set("end_date", endDate);
      }
    }

    const appendIfValue = (key, value, allowed = (val) => !!val) => {
      if (allowed(value)) {
        params.set(key, value);
      }
    };
    // Area filters — send in multiple naming conventions to match backend expectations
    appendIfValue("city_id", cityId, (val) => val && val !== "all");
    appendIfValue("cityId", cityId, (val) => val && val !== "all");

    const deptIds = downloadFilters.departmentIds || [];
    if (deptIds.length > 0) {
      const joined = deptIds.join(",");
      params.set("department_id", joined);
      params.set("departmentId", joined);
    }

    const desIds = downloadFilters.designationIds || [];
    if (desIds.length > 0) {
      const joined = desIds.join(",");
      params.set("designation_id", joined);
      params.set("designationId", joined);
    }

    appendIfValue("zone_id", zoneId, (val) => val && val !== "all");
    appendIfValue("zoneId", zoneId, (val) => val && val !== "all");

    appendIfValue("sector_id", downloadFilters.sectorId, (val) => val && val !== "all");
    appendIfValue("sectorId", downloadFilters.sectorId, (val) => val && val !== "all");

    appendIfValue("ward_id", downloadFilters.wardId, (val) => val && val !== "all");
    appendIfValue("wardId", downloadFilters.wardId, (val) => val && val !== "all");

    const kIds = downloadFilters.selectedKothiIds || [];
    if (kIds.length > 0) {
      const joined = kIds.join(",");
      params.set("kothiId", joined);
      params.set("kothi_id", joined);
      params.set("kothiIds", joined);
      params.set("ward_id", joined); // some backends treat kothi as ward
    }
    appendIfValue(
      "supervisor_id",
      supervisorId,
      (val) => val && val !== "all"
    );
    appendIfValue(
      "employee_id",
      employeeId,
      (val) => val && val !== "all"
    );
    appendIfValue("employeeId", employeeId, (val) => val && val !== "all");
    appendIfValue("emp_code", empCode?.trim());

    if (hasPunchIn !== "any") {
      const val = hasPunchIn === "with" ? "true" : "false";
      params.set("has_punch_in", val);
      params.set("hasPunchIn", val);
    }
    if (hasPunchOut !== "any") {
      const val = hasPunchOut === "with" ? "true" : "false";
      params.set("has_punch_out", val);
      params.set("hasPunchOut", val);
    }
    if (autoPunchOut !== "any") {
      const val = autoPunchOut === "auto" ? "true" : "false";
      params.set("is_auto_punch_out", val);
      params.set("has_auto_punch_out", val);
      params.set("auto_punch_out", val);
    }

    // Attach table search / record filter so backend can limit export similar to on-screen view
    if (normalizedQuery) {
      params.set("search", normalizedQuery);
    }
    if (recordFilter === "marked") {
      params.set("only_marked", "true");
      params.set("has_punch_in", "true");
    } else if (recordFilter === "unmarked") {
      params.set("only_unmarked", "true");
      params.set("has_punch_in", "false");
      params.set("absentees_only", "true");
    }

    const payload = Object.fromEntries(params.entries());
    const queryString = params.toString();
    const downloadEndpoints = [
      `${apiUrl}/attendance/download`,
      `${apiUrl}/admin/export/attendance`,
    ];

    try {
      setIsDownloading(true);
      setDownloadError(null);
      setDownloadMessage("");
      let response = null;
      let lastError = null;

      for (const endpoint of downloadEndpoints) {
        const requestConfig = {
          ...buildRequestConfig(),
          responseType: "blob",
        };

        try {
          response = await axios.post(endpoint, payload, requestConfig);
          break;
        } catch (error) {
          lastError = error;
          const status = error?.response?.status;
          const isFirstEndpoint = endpoint === downloadEndpoints[0];

          if (status === 404 || status === 405) {
            try {
              response = await axios.get(`${endpoint}?${queryString}`, requestConfig);
              break;
            } catch (getError) {
              lastError = getError;
              const getStatus = getError?.response?.status;
              if (getStatus === 404 || getStatus === 405) {
                continue;
              }
              throw getError;
            }
          }

          if (isFirstEndpoint) {
            continue;
          }
          throw error;
        }
      }

      if (!response) {
        throw lastError || new Error("Unable to download attendance report");
      }

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([JSON.stringify(response.data, null, 2)], {
            type: "application/json",
          });

      const slugify = (value, fallback) => {
        const str = (value || "").toString().trim();
        if (!str) return fallback;
        return str
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "_")
          .replace(/_+/g, "_")
          .toLowerCase();
      };

      const cityLabel =
        downloadFilters.cityId === "all"
          ? "AllCities"
          : slugify(
            cities.find((c) => String(c.city_id) === String(downloadFilters.cityId))?.city_name,
            "city"
          );
      const deptLabel =
        downloadFilters.departmentIds?.length === 0
          ? "AllDepartments"
          : "FilteredDepartments";

      const dateLabel =
        downloadFilters.dateMode === "single"
          ? (downloadFilters.singleDate || new Date().toISOString().split("T")[0])
          : `${downloadFilters.startDate || "start"}_to_${downloadFilters.endDate || "end"}`;

      const layout = downloadFilters.reportLayout;
      const fileName = `${cityLabel}_${deptLabel}_${dateLabel}_${layout}.xlsx`;

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setDownloadMessage("Report download started.");
      logAction("Downloaded Attendance Excel Report", "Downloaded Attendance Excel Report");
    } catch (error) {
      console.error("Error downloading attendance report:", error);
      let errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to download the report.";

      if (!errorMessage && error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          try {
            const parsed = JSON.parse(text);
            errorMessage = parsed.error || parsed.message || text;
          } catch (_parseErr) {
            errorMessage = text;
          }
        } catch (_blobErr) { }
      }
      setDownloadError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };
  const getBase64ImageFromURL = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };
  const preloadImages = async () => {
    const imageMap = {};

    for (const record of filteredRecords) {
      if (!record.attendance_id) continue;

      try {
        const inImage = await fetchImage(record.attendance_id, "in");
        if (inImage) {
          imageMap[`${record.attendance_id}_in`] =
            await getBase64ImageFromURL(inImage);
        }

        const midImage = await fetchImage(record.attendance_id, "mid");
        if (midImage) {
          imageMap[`${record.attendance_id}_mid`] =
            await getBase64ImageFromURL(midImage);
        }

        const outImage = await fetchImage(record.attendance_id, "out");
        if (outImage) {
          imageMap[`${record.attendance_id}_out`] =
            await getBase64ImageFromURL(outImage);
        }
      } catch (e) {
        console.log(e);
      }
    }

    return imageMap;
  };
  const downloadSimpleAttendancePDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
      });

      const cityObj = cities.find(
        (c) => String(c.city_id) === String(downloadFilters.cityId)
      );

      const cityName =
        downloadFilters.cityId === "all"
          ? "All Cities"
          : cityObj?.city_name || "";

      doc.setFontSize(18);
      doc.text(
        `Simple Attendance Report${cityName ? " - " + cityName : ""}`,
        14,
        15
      );

      doc.setFontSize(10);
      doc.text(
        `Generated By : ${user?.name || "Admin"}`,
        14,
        22
      );

      doc.text(
        `Generated On : ${new Date().toLocaleString()}`,
        14,
        28
      );

      const reportDate =
        downloadFilters.dateMode === "range"
          ? `${downloadFilters.startDate} to ${downloadFilters.endDate}`
          : downloadFilters.singleDate;

      doc.text(`Report : ${reportDate}`, 14, 34);

      doc.text(
        `Total Employees : ${registeredStats.totalRegistered}`,
        14,
        40
      );

      const head = [[
        "Sr",
        "Emp Code",
        "Employee Name",
        "Kothi",
        "Zone",
        "Designation",
        ...dayColumns.map((d) => String(d.day)),
        "P",
        "A",
        ...leaveTypes,
        "TOTAL",
      ]];

      const pdfRecords =
        downloadFilters.employeeId !== "all"
          ? simpleRecords.filter(
            (emp) =>
              String(emp.emp_id) === String(downloadFilters.employeeId)
          )
          : simpleRecords;

      const body = pdfRecords.map((emp, index) => {
        const row = [
          index + 1,
          emp.emp_code || "-",
          emp.employee_name || "-",
          emp.kothi_name || "-",
          emp.zone_name || "-",
          emp.designation_name || "-",
        ];

        dayColumns.forEach((day) => {
          row.push(emp.days[day.key] || "-");
        });

        row.push(emp.summary.P || 0);
        row.push(emp.summary.A || 0);

        leaveTypes.forEach((leave) => {
          row.push(emp.summary[leave] || 0);
        });

        const totalDays =
          downloadFilters.dateMode === "range"
            ? Math.floor(
              (new Date(downloadFilters.endDate) -
                new Date(downloadFilters.startDate)) /
              (1000 * 60 * 60 * 24)
            ) + 1
            : 1;

        row.push(totalDays);

        return row;
      });

      autoTable(doc, {
        head,
        body,
        startY: 46,
        theme: "grid",
        styles: {
          fontSize: 6,
          cellPadding: 1.5,
          halign: "center",
          valign: "middle",
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 20 },
          2: { cellWidth: 45 },
          3: { cellWidth: 35 },
          4: { cellWidth: 30 },
          5: { cellWidth: 32 },
        },
        margin: { left: 8, right: 8 },
      });

      doc.save(
        `Simple_Attendance_Report_${downloadFilters.dateMode === "range"
          ? `${downloadFilters.startDate}_to_${downloadFilters.endDate}`
          : downloadFilters.singleDate
        }.pdf`
      );
    } catch (err) {
      console.error(err);
      setDownloadError("Unable to generate Simple Attendance PDF.");
    }
  };
  const handleDownloadPDF = async () => {
    if (reportType === "simple") {
      return downloadSimpleAttendancePDF();
    }

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a2", // ya "a3"
      });
      // const imageMap = await preloadImages();
      // City Name
      const cityObj = cities.find(c => String(c.city_id) === String(downloadFilters.cityId));
      const cityDisplayName = downloadFilters.cityId === "all" ? "All Cities" : (cityObj?.city_name || "");

      // Header Section
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // slate-800
      const fullTitle = cityDisplayName ? `Attendance Report - ${cityDisplayName}` : "Attendance Report";
      doc.text(fullTitle, 14, 15);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      const now = new Date().toLocaleString();
      doc.text(`Generated on: ${now}`, 14, 22);
      doc.text(`Generated by: ${user?.name || "Admin"}`, 14, 27);

      // Date Info
      const reportDateText = downloadFilters.dateMode === "range"
        ? `Report Period: ${downloadFilters.startDate} to ${downloadFilters.endDate}`
        : `Report Date: ${downloadFilters.singleDate}`;
      doc.text(reportDateText, 14, 32);

      // Stats Summary
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text("Summary Stats:", 14, 42);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const statsX = 14;
      const statsY = 48;
      doc.text(`Total Employees: ${registeredStats.totalRegistered}`, statsX, statsY);
      doc.text(`Present: ${registeredStats.totalPresent}`, statsX + 50, statsY);
      doc.text(`Absent: ${registeredStats.totalAbsent}`, statsX + 100, statsY);
      doc.text(`On Leave: ${registeredStats.totalOnLeave}`, statsX + 150, statsY);

      const tableColumn = [
        "Sr.",
        "Date",
        "Zone",
        "Kothi",
        "Employee Name",
        "Emp Code",

        "In Time",
        "In Image",
        "In By",
        "In Address",
        "In Lat/Long",

        "Mid Shift In",
        "Mid Image",
        "Mid Shift By",
        "Mid Address",
        "Mid Lat/Long",

        "Out Time",
        "Out Image",
        "Out By",
        "Out Address",
        "Out Lat/Long",

        "Working Hours",
        "Status"
      ];

      const tableRows = filteredRecords.map((record, index) => [
        index + 1,
        record.date || "-",
        record.zone || "-",
        record.ward || "-",
        record.name || "-",
        record.emp_code || "-",

        // IN
        record.punch_in || "-",
        `${API_BASE_URL}/api/app/attendance/employee/image?attendance_id=${record.attendance_id}&punch_type=in`,
        record.punched_in_by || record.punch_in_by || "-",
        record.in_address || "-",
        (record.latitude_in && record.longitude_in)
          ? `${Number(record.latitude_in).toFixed(6)}, ${Number(record.longitude_in).toFixed(6)}`
          : "-",

        // MID
        record.mid_shift_punch_in || record.mid_shift_punch_in_time || "-",
        `${API_BASE_URL}/api/app/attendance/employee/image?attendance_id=${record.attendance_id}&punch_type=mid`,
        record.mid_shift_punched_in_by || "-",
        record.mid_address || "-",
        (record.latitude_mid_in && record.longitude_mid_in)
          ? `${Number(record.latitude_mid_in).toFixed(6)}, ${Number(record.longitude_mid_in).toFixed(6)}`
          : "-",

        // OUT
        record.punch_out || "-",
        `${API_BASE_URL}/api/app/attendance/employee/image?attendance_id=${record.attendance_id}&punch_type=out`,
        record.is_auto_punch_out
          ? "System (Auto)"
          : (record.punched_out_by || record.punch_out_by || "-"),
        record.out_address || "-",
        (record.latitude_out && record.longitude_out)
          ? `${Number(record.latitude_out).toFixed(6)}, ${Number(record.longitude_out).toFixed(6)}`
          : "-",

        // LAST TWO
        calculateDuration(record.punch_in, record.punch_out),
        deriveStatusLabel(record)
      ]);
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 55,
        theme: "striped",

        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontSize: 8,
          fontStyle: "bold",
          halign: "center"
        },

        bodyStyles: {
          fontSize: 7,
          minCellHeight: 12,
          valign: "middle",
          halign: "center"
        },

        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },

        columnStyles: {
          7: { cellWidth: 14 },   // In Image
          12: { cellWidth: 14 },  // Mid Image
          17: { cellWidth: 14 },  // Out Image
        }
        ,
        // YAHAN ADD KARNA HAI
        didParseCell: function (data) {

          if (
            data.section === "body" &&
            [7, 12, 17].includes(data.column.index)
          ) {
            data.cell.text = [""];
          }
        },
        didDrawCell: function (data) {

          if (
            data.section === "body" &&
            [7, 12, 17].includes(data.column.index)
          ) {

            const imageUrl = data.cell.raw;

            if (
              imageUrl &&
              imageUrl !== "-"
            ) {

              doc.setTextColor(0, 0, 255);

              doc.textWithLink(
                "View Image",
                data.cell.x + 2,
                data.cell.y + 5,
                { url: imageUrl }
              );
            }
          }
        }
        ,
        didDrawPage: (data) => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);

          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height
            ? pageSize.height
            : pageSize.getHeight();

          const pageWidth = pageSize.width
            ? pageSize.width
            : pageSize.getWidth();

          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" }
          );
        }
      });

      const stamp = new Date().toISOString().split("T")[0];
      doc.save(`MatrixTrack_Attendance_${stamp}.pdf`);
      logAction("Downloaded Attendance PDF Report", "Downloaded Attendance PDF Report");
    } catch (error) {
      console.error("PDF Generation Error:", error);
      setDownloadError("Failed to generate PDF. Please try again.");
    }
  };

  // Function to fetch image data
  const fetchImage = async (attendanceId, punchType) => {
    try {
      const response = await axios.get(
        `${apiUrl}/app/attendance/employee/image?attendance_id=${attendanceId}&punch_type=${punchType}`,
        {
          ...buildRequestConfig(),
          responseType: "blob", // Fetch image as a Blob
        }
      );

      // Convert Blob to a URL
      const imageUrl = URL.createObjectURL(response.data);
      return imageUrl;
    } catch (error) {
      console.error("Error fetching image:", error);
      return null;
    }
  };

  // Function to handle image click
  const handleImageClick = async (attendanceId, punchType) => {
    setIsLoading(true);
    const imageUrl = await fetchImage(attendanceId, punchType);
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setIsModalOpen(true);
    }
    setIsLoading(false);
  };

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null); // Clear the image URL
  };

  // function for time zone
  function getTodayInIST() {
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
    return `${year}-${month}-${day}`; // Ensures YYYY-MM-DD format
  }

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  };

  const goToPage = (page) => {
    setCurrentPage((prev) => {
      const nextPage = Math.max(1, Math.min(page, totalPages));
      return nextPage === prev ? prev : nextPage;
    });
  };

  const goToFacePage = (page) => {
    setFacePage((prev) => {
      const next = Math.max(1, Math.min(page, faceTotalPages));
      return next === prev ? prev : next;
    });
  };

  const handleFacePageSizeChange = (event) => {
    setFacePageSize(Number(event.target.value));
    setFacePage(1);
  };

  const downloadFaceList = () => {
    if (!faceUnregisteredEmployees.length) return;

    const headers = [
      "Name",
      "Emp Code",
      "Contact",
      "City",
      "Zone",
      "Ward",
      "Supervisor",
    ];

    const rows = faceUnregisteredEmployees.map((emp) => [
      emp.name ?? "",
      emp.emp_code ?? "",
      emp.phone ?? emp.contact_no ?? "",
      emp.city ?? emp.city_name ?? "",
      emp.zone ?? emp.zone_name ?? "",
      emp.ward ?? emp.ward_name ?? "",
      getSupervisorNameForEmployee(emp),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const stamp = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `face-not-registered-${stamp}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {isManualReloading && <Loader />}
      <div className="flex items-center justify-between mb-4 text-slate-800 dark:text-slate-100 dark:text-slate-100">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <CalendarRange size={22} /> Attendance Reports
        </div>
        <button
          onClick={() => fetchRecords(true)}
          disabled={isLoading}
          className="flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 uppercase tracking-widest"
          title="Refresh Data"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          {isLoading ? "Refreshing..." : "Reload Data"}
        </button>
      </div>



      {/* ── Registered Employee Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4 mb-6">
        <div className="relative group overflow-hidden bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl p-4 transition-all shadow-md shadow-blue-100/50 hover:shadow-xl hover:shadow-blue-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-blue-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-blue-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-blue-600/70 uppercase tracking-widest mb-1">Total Employees</p>
            <h3 className="text-3xl font-black text-blue-800 tracking-tight leading-none mb-1">{registeredStats.totalRegistered}</h3>
          </div>
          <div className="relative z-10 border-t border-b border-slate-200 dark:border-slate-700lue-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">Registered Employees</p>
          </div>
        </div>

        <div className="relative group overflow-hidden bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-4 transition-all shadow-md shadow-emerald-100/50 hover:shadow-xl hover:shadow-emerald-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-emerald-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-emerald-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Total Present</p>
            <h3 className="text-3xl font-black text-emerald-800 tracking-tight leading-none mb-1">{registeredStats.totalPresent}</h3>
          </div>
          <div className="relative z-10 border-t border-emerald-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">
              {registeredStats.isRange ? "Total punch-in days" : "Punched In"}
            </p>
          </div>
        </div>

        <div className="relative group overflow-hidden bg-gradient-to-br from-yellow-50 to-white border border-yellow-200 rounded-2xl p-4 transition-all shadow-md shadow-yellow-100/50 hover:shadow-xl hover:shadow-yellow-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-yellow-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-yellow-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-yellow-600/70 uppercase tracking-widest mb-1">Mid Shift Punch-In</p>
            <h3 className="text-3xl font-black text-yellow-800 tracking-tight leading-none mb-1">{registeredStats.totalMidShiftPunchIn || 0}</h3>
          </div>
          <div className="relative z-10 border-t border-yellow-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-yellow-500 font-black uppercase tracking-widest opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">Mid Shift Records</p>
          </div>
        </div>

        <div className="relative group overflow-hidden bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-2xl p-4 transition-all shadow-md shadow-indigo-100/50 hover:shadow-xl hover:shadow-indigo-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-indigo-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-indigo-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-indigo-600/70 uppercase tracking-widest mb-1">On Leave</p>
            <h3 className="text-3xl font-black text-indigo-800 tracking-tight leading-none mb-1">{registeredStats.totalOnLeave}</h3>
          </div>
          <div className="relative z-10 border-t border-indigo-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">Leave Records</p>
          </div>
        </div>

        <div className="relative group overflow-hidden bg-gradient-to-br from-rose-50 to-white border border-rose-200 rounded-2xl p-4 transition-all shadow-md shadow-rose-100/50 hover:shadow-xl hover:shadow-rose-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-rose-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-rose-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-rose-600/70 uppercase tracking-widest mb-1">Absent</p>
            <h3 className="text-3xl font-black text-rose-800 tracking-tight leading-none mb-1">{registeredStats.totalAbsent}</h3>
          </div>
          <div className="relative z-10 border-t border-rose-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">Not Punched In</p>
          </div>
        </div>

        <div className="relative group overflow-hidden bg-gradient-to-br from-sky-50 to-white border border-sky-200 rounded-2xl p-4 transition-all shadow-md shadow-sky-100/50 hover:shadow-xl hover:shadow-sky-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-sky-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-sky-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-sky-600/70 uppercase tracking-widest mb-1">Total Punch-Out</p>
            <h3 className="text-3xl font-black text-sky-800 tracking-tight leading-none mb-1">{registeredStats.totalPunchOutCombined}</h3>
          </div>
          <div className="relative z-10 border-t border-sky-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-sky-500 font-black uppercase tracking-widest opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">Manual + System</p>
          </div>
        </div>

        <div className="relative group overflow-hidden bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-4 transition-all shadow-md shadow-amber-100/50 hover:shadow-xl hover:shadow-amber-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-amber-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-amber-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest mb-1">Punch-Out Manual</p>
            <h3 className="text-3xl font-black text-amber-800 tracking-tight leading-none mb-1">{registeredStats.totalManualPunchedOut}</h3>
          </div>
          <div className="relative z-10 border-t border-amber-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">By User Action</p>
          </div>
        </div>

        <div className="relative group overflow-hidden bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-2xl p-4 transition-all shadow-md shadow-orange-100/50 hover:shadow-xl hover:shadow-orange-200/50 hover:-translate-y-1 flex flex-col justify-between min-h-[115px]">
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-orange-100/60 group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute top-3 right-3 text-orange-600 opacity-90 group-hover:opacity-100 group-hover:rotate-12 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M15 2v2" /><path d="M15 20v2" /><path x1="2" y1="15" x2="4" y2="15" /><path x1="20" y1="15" x2="22" y2="15" /><path d="M9 2v2" /><path d="M9 20v2" /><path x1="2" y1="9" x2="4" y2="9" /><path x1="20" y1="9" x2="22" y2="9" /></svg>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-orange-600/70 uppercase tracking-widest mb-1">Punch-Out System</p>
            <h3 className="text-3xl font-black text-orange-800 tracking-tight leading-none mb-1">{registeredStats.totalAutoPunchedOut}</h3>
          </div>
          <div className="relative z-10 border-t border-orange-100/50 pt-2.5 mt-2">
            <p className="text-[9px] text-orange-500 font-black uppercase tracking-widest opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">Auto (9h limit)</p>
          </div>
        </div>
      </div>
      {/* Supervisor Distribution Summary Migrated to Supervisors Screen */}

      <section className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-6 rounded-[2rem] shadow-lg shadow-slate-200/60 border border-slate-200 dark:border-slate-700 overflow-visible mb-8 transition-all">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Download Attendance Report
          </h2>
        </div>

        <form onSubmit={handleDownloadReport} className="mt-4 space-y-4">
          <div
            className="
bg-slate-50/50
dark:bg-slate-900/60

p-6

rounded-2xl

border
border-slate-200
dark:border-slate-700

space-y-4
"
          >            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
              <div className="flex bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 rounded-lg p-1 shadow-sm w-fit self-start">
                <button
                  type="button"
                  onClick={() => updateDownloadFilter("dateMode", "single")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${downloadFilters.dateMode === "single"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50"
                    }`}
                >
                  SINGLE DATE
                </button>
                <button
                  type="button"
                  onClick={() => updateDownloadFilter("dateMode", "range")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${downloadFilters.dateMode === "range"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50"
                    }`}
                >
                  DATE RANGE
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 grow">
                {downloadFilters.dateMode === "single" && (
                  <div className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-300">
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm">
                      <span
                        className="
text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest
"
                      >
                        Report Date:
                      </span>                      <input
                        type="date"
                        value={downloadFilters.singleDate}
                        max={getTodayInIST()}
                        onChange={(e) => {
                          updateDownloadFilter("singleDate", e.target.value);
                          setSelectedDate(e.target.value);
                        }}
                        className="border-none bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 p-0 cursor-pointer"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600 text-slate-500 dark:text-slate-400 px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50"
                      title="Reset Filters"
                    >
                      <Filter size={12} />
                      Reset
                    </button>
                  </div>
                )}
                {downloadFilters.dateMode === "range" && (
                  <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-top-2 duration-300 items-center">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm min-w-[190px]">
                      <span className="text-[10px] font-black text-black uppercase tracking-widest whitespace-nowrap">Start:</span>
                      <input
                        type="date"
                        value={downloadFilters.startDate}
                        onChange={(e) => updateDownloadFilter("startDate", e.target.value)}
                        className="border-none bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 p-0 cursor-pointer w-full min-w-0"
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm min-w-[190px]">
                      <span className="text-[10px] font-black text-black uppercase tracking-widest whitespace-nowrap">End:</span>
                      <input
                        type="date"
                        value={downloadFilters.endDate}
                        onChange={(e) => updateDownloadFilter("endDate", e.target.value)}
                        className="border-none bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 p-0 cursor-pointer w-full min-w-0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600 text-slate-500 dark:text-slate-400 px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50"
                      title="Reset Filters"
                    >
                      <Filter size={12} />
                      Reset
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 sm:ml-auto self-end sm:self-center">
                  {downloadFilters.dateMode === "range" && (
                    <div className="min-w-[260px]">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-1">
                        Report Type
                      </label>

                      <select
                        value={reportType}
                        onChange={(e) => {
                          setReportType(e.target.value);

                          if (e.target.value === "detailed") {
                            fetchRecords();
                          }
                        }}
                        className="w-full h-11 rounded-lg border border-gray-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="detailed">
                          Detailed Attendance Report
                        </option>

                        <option value="simple">
                          Simple Attendance Report
                        </option>
                      </select>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={fetchRecords}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest"
                  >
                    Show
                  </button>
                  <button
                    type="submit"
                    className={`flex items-center gap-2 ${isDownloading ? "bg-slate-400" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"} text-white px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg transition-all hover:-translate-y-0.5`}
                    disabled={isDownloading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    className={`flex items-center gap-2 ${isDownloading ? "bg-slate-400" : "bg-rose-600 hover:bg-rose-700"} text-white px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg transition-all hover:-translate-y-0.5`}
                    disabled={isDownloading}
                  >
                    <FileDown size={14} />
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1.5">
              <label
                className="
text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest

flex
items-center
justify-between
"
              >
                <span>City</span>

                <span
                  className="
text-[10px]
font-bold

bg-green-50
dark:bg-green-900/20

text-green-600
dark:text-green-400

border
border-green-100
dark:border-green-800

rounded

px-1.5
py-0.5

ml-2
"
                >
                  {cities.length}
                </span>
              </label>

              <select
                value={downloadFilters.cityId}
                onChange={(e) => handleCityChange(e.target.value)}
                className="
w-full

border
border-slate-200
dark:border-slate-700

rounded-lg

px-3
py-2

text-sm
font-medium

focus:ring-2
focus:ring-indigo-500
focus:outline-none

bg-white
dark:bg-slate-800

text-slate-700
dark:text-slate-200

disabled:bg-slate-100
dark:disabled:bg-slate-900

disabled:text-slate-400
dark:disabled:text-slate-500
"
                disabled={singleCityMode}
              >
                {cityScopeAll && (
                  <option
                    value="all"
                    className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    All Cities
                  </option>
                )}

                {cities.map((city) => (
                  <option
                    key={city.city_id}
                    value={city.city_id}
                    className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    {city.city_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest

flex
items-center
justify-between">
                <span>Zone</span>
                <span className="
text-[10px]
font-bold
 bg-green-50
dark:bg-green-900/20
 text-green-600
dark:text-green-400
 border
border-green-100
dark:border-green-800
 rounded
 px-1.5
py-0.5
 ml-2
">
                  {filteredZones.length}
                </span>
              </label>
              <select
                value={downloadFilters.zoneId}
                onChange={(e) => handleZoneChange(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-900 dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200"
                disabled={!filteredZones.length}
              >
                <option value="all">All Zones</option>
                {filteredZones.map((zone) => (
                  <option key={zone.zone_id} value={zone.zone_id}>
                    {zone.zone_name} {zone.city_name ? `(${zone.city_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest

flex
items-center
justify-between">
                <span>Ward</span>
                <span className="
text-[10px]
font-bold
 bg-green-50
dark:bg-green-900/20
 text-green-600
dark:text-green-400
 border
border-green-100
dark:border-green-800
 rounded
 px-1.5
py-0.5
 ml-2
">
                  {filteredSectors.length}
                </span>
              </label>
              <select
                value={downloadFilters.sectorId}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-900 dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200"
                disabled={!filteredSectors.length}
              >
                <option value="all">All Wards</option>
                {filteredSectors.map((s) => (
                  <option key={s.sector_id} value={s.sector_id}>
                    {s.sector_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col relative gap-1.5 kothi-dropdown-container">
              <label className="text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest

flex
items-center
justify-between">
                <span>Kothi</span>
                <span className="
text-[10px]
font-bold
 bg-green-50
dark:bg-green-900/20
 text-green-600
dark:text-green-400
 border
border-green-100
dark:border-green-800
 rounded
 px-1.5
py-0.5
 ml-2
">
                  {filteredWards.length}
                </span>
              </label>

              <div
                className={`relative border rounded transition-all bg-white dark:bg-slate-900 dark:bg-slate-900 cursor-pointer hover:border-slate-400 ${isKothiDropdownOpen ? "ring-1 ring-blue-500 border-b border-slate-200 dark:border-slate-700lue-500" : "border-slate-300"}`}
                onClick={() => setIsKothiDropdownOpen(!isKothiDropdownOpen)}
              >
                <div className="flex items-center justify-between p-2">
                  <span className={`text-sm truncate ${downloadFilters.selectedKothiIds?.length === 0 ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                    {downloadFilters.selectedKothiIds?.length === 0
                      ? "All Kothis"
                      : `${downloadFilters.selectedKothiIds?.length} Selected`
                    }
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>

              {isKothiDropdownOpen && (
                <div className="absolute top-[100%] left-0 right-0 z-[100] mt-1.5 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-2.5 border-b border-slate-200 dark:border-slate-700 border-slate-100 bg-slate-50 space-y-2">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 rounded-md px-2.5 py-1.5 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                      <input
                        type="text"
                        placeholder="Search Kothis..."
                        value={kothiSearch}
                        onChange={(e) => setKothiSearch(e.target.value)}
                        className="w-full bg-transparent text-sm focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateDownloadFilter("selectedKothiIds", filteredWards.map(w => String(w.ward_id))); }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateDownloadFilter("selectedKothiIds", []); }}
                        className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-1.5 flex flex-col gap-0.5 bg-white dark:bg-slate-900 dark:bg-slate-900 scrollbar-thin scrollbar-thumb-slate-200">
                    {!filteredWards.length ? (
                      <div className="text-center text-slate-400 text-xs italic py-6">No Kothis available in this area</div>
                    ) : (
                      filteredWards
                        .filter(w => !kothiSearch || w.ward_name.toLowerCase().includes(kothiSearch.toLowerCase()))
                        .map((ward) => (
                          <div
                            key={ward.ward_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleKothiToggle(String(ward.ward_id));
                            }}
                            className={`flex items-center justify-between w-full pr-3 pl-2 py-2 rounded-lg cursor-pointer transition-all border group ${downloadFilters.selectedKothiIds?.includes(String(ward.ward_id))
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                              : "bg-white dark:bg-slate-900 dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50 hover:border-slate-200 dark:border-slate-700"
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={downloadFilters.selectedKothiIds?.includes(String(ward.ward_id))}
                                readOnly
                                className="flex-shrink-0 w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-transform group-active:scale-90"
                              />
                              <span className="text-xs font-bold leading-tight truncate group-hover:text-indigo-900" title={ward.ward_name}>
                                {ward.ward_name}
                              </span>
                            </div>
                            {downloadFilters.selectedKothiIds?.includes(String(ward.ward_id)) && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0 text-indigo-500 animate-in zoom-in-50 duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                  <div className="p-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>{downloadFilters.selectedKothiIds?.length} selected</span>
                    <button type="button" onClick={() => setIsKothiDropdownOpen(false)} className="text-blue-600 font-bold hover:underline">Apply</button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col relative gap-1.5 dept-dropdown-container">
              <label className="text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest

flex
items-center
justify-between">
                <span>Department</span>
                <span className="
text-[10px]
font-bold
 bg-green-50
dark:bg-green-900/20
 text-green-600
dark:text-green-400
 border
border-green-100
dark:border-green-800
 rounded
 px-1.5
py-0.5
 ml-2
">
                  {filteredDepartments.length}
                </span>
              </label>

              <div
                className={`relative border rounded transition-all bg-white dark:bg-slate-900 dark:bg-slate-900 cursor-pointer hover:border-slate-400 ${isDeptDropdownOpen ? "ring-1 ring-blue-500 border-b border-slate-200 dark:border-slate-700lue-500" : "border-slate-300"}`}
                onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
              >
                <div className="flex items-center justify-between p-2">
                  <span className={`text-sm truncate ${downloadFilters.departmentIds?.length === 0 ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                    {downloadFilters.departmentIds?.length === 0
                      ? "All Departments"
                      : `${downloadFilters.departmentIds?.length} Selected`
                    }
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>

              {isDeptDropdownOpen && (
                <div className="absolute top-[100%] left-0 right-0 z-[100] mt-1.5 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-2.5 border-b border-slate-200 dark:border-slate-700 border-slate-100 bg-slate-50 space-y-2">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 rounded-md px-2.5 py-1.5 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                      <input
                        type="text"
                        placeholder="Search Dept..."
                        value={deptSearch}
                        onChange={(e) => setDeptSearch(e.target.value)}
                        className="w-full bg-transparent text-sm focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateDownloadFilter("departmentIds", filteredDepartments.map(d => String(d.department_id))); }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateDownloadFilter("departmentIds", []); }}
                        className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-1.5 flex flex-col gap-0.5 bg-white dark:bg-slate-900 dark:bg-slate-900 scrollbar-thin scrollbar-thumb-slate-200">
                    {filteredDepartments
                      .filter(d => !deptSearch || (d.department_name || "").toLowerCase().includes(deptSearch.toLowerCase()))
                      .map((dept) => (
                        <div
                          key={dept.department_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDepartmentToggle(String(dept.department_id));
                          }}
                          className={`flex items-center justify-between w-full pr-3 pl-2 py-2 rounded-lg cursor-pointer transition-all border group ${downloadFilters.departmentIds?.includes(String(dept.department_id))
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                            : "bg-white dark:bg-slate-900 dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50 hover:border-slate-200 dark:border-slate-700"
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={downloadFilters.departmentIds?.includes(String(dept.department_id))}
                              readOnly
                              className="flex-shrink-0 w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="text-xs font-bold truncate group-hover:text-indigo-900">
                              {dept.department_name}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col relative gap-1.5 des-dropdown-container">
              <label className="text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest

flex
items-center
justify-between">
                <span>Designation</span>
                <span className="
text-[10px]
font-bold
 bg-green-50
dark:bg-green-900/20
 text-green-600
dark:text-green-400
 border
border-green-100
dark:border-green-800
 rounded
 px-1.5
py-0.5
 ml-2
">
                  {filteredDesignations.length}
                </span>
              </label>

              <div
                className={`relative border rounded transition-all bg-white dark:bg-slate-900 dark:bg-slate-900 cursor-pointer hover:border-slate-400 ${isDesDropdownOpen ? "ring-1 ring-blue-500 border-b border-slate-200 dark:border-slate-700lue-500" : "border-slate-300"}`}
                onClick={() => setIsDesDropdownOpen(!isDesDropdownOpen)}
              >
                <div className="flex items-center justify-between p-2">
                  <span className={`text-sm truncate ${downloadFilters.designationIds?.length === 0 ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                    {downloadFilters.designationIds?.length === 0
                      ? "All Designations"
                      : `${downloadFilters.designationIds?.length} Selected`
                    }
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>

              {isDesDropdownOpen && (
                <div className="absolute top-[100%] left-0 right-0 z-[100] mt-1.5 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-2.5 border-b border-slate-200 dark:border-slate-700 border-slate-100 bg-slate-50 space-y-2">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 rounded-md px-2.5 py-1.5 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                      <input
                        type="text"
                        placeholder="Search Des..."
                        value={desSearch}
                        onChange={(e) => setDesSearch(e.target.value)}
                        className="w-full bg-transparent text-sm focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateDownloadFilter("designationIds", filteredDesignations.map(d => String(d.designation_id))); }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateDownloadFilter("designationIds", []); }}
                        className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-1.5 flex flex-col gap-0.5 bg-white dark:bg-slate-900 dark:bg-slate-900 scrollbar-thin scrollbar-thumb-slate-200">
                    {filteredDesignations
                      .filter(d => !desSearch || (d.designation_name || "").toLowerCase().includes(desSearch.toLowerCase()))
                      .map((des) => (
                        <div
                          key={des.designation_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDesignationToggle(String(des.designation_id));
                          }}
                          className={`flex items-center justify-between w-full pr-3 pl-2 py-2 rounded-lg cursor-pointer transition-all border group ${downloadFilters.designationIds?.includes(String(des.designation_id))
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                            : "bg-white dark:bg-slate-900 dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50 hover:border-slate-200 dark:border-slate-700"
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={downloadFilters.designationIds?.includes(String(des.designation_id))}
                              readOnly
                              className="flex-shrink-0 w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="text-xs font-bold truncate group-hover:text-indigo-900">
                              {des.designation_name}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col relative gap-1.5 supervisor-dropdown-container">
              <label className="text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest

flex
items-center
justify-between">
                <span>Supervisor</span>
                <span className="
text-[10px]
font-bold
 bg-green-50
dark:bg-green-900/20
 text-green-600
dark:text-green-400
 border
border-green-100
dark:border-green-800
 rounded
 px-1.5
py-0.5
 ml-2
">
                  {filteredSupervisors.length}
                </span>
              </label>

              <div
                className={`relative border rounded transition-all bg-white dark:bg-slate-900 dark:bg-slate-900 cursor-pointer hover:border-slate-400 ${isSupervisorDropdownOpen ? "ring-1 ring-blue-500 border-b border-slate-200 dark:border-slate-700lue-500" : "border-slate-300"}`}
                onClick={() => setIsSupervisorDropdownOpen(!isSupervisorDropdownOpen)}
              >
                <div className="flex items-center justify-between p-2">
                  <span className={`text-sm truncate ${downloadFilters.supervisorId === "all" ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                    {downloadFilters.supervisorId === "all"
                      ? "All Supervisors"
                      : filteredSupervisors.find(s => String(s.user_id) === String(downloadFilters.supervisorId))?.name || "All Supervisors"
                    }
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>

              {isSupervisorDropdownOpen && (
                <div className="absolute top-[100%] left-0 right-0 z-[100] mt-1.5 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-2.5 border-b border-slate-200 dark:border-slate-700 border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 rounded-md px-2.5 py-1.5 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                      <input
                        type="text"
                        placeholder="Search Supervisor..."
                        value={supervisorSearch}
                        onChange={(e) => setSupervisorSearch(e.target.value)}
                        className="w-full bg-transparent text-sm focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-1.5 flex flex-col gap-0.5 bg-white dark:bg-slate-900 dark:bg-slate-900 scrollbar-thin scrollbar-thumb-slate-200">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        updateDownloadFilter("supervisorId", "all");
                        setIsSupervisorDropdownOpen(false);
                      }}
                      className={`px-3 py-2 rounded-lg cursor-pointer transition-all border ${downloadFilters.supervisorId === "all"
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm font-bold"
                        : "bg-white dark:bg-slate-900 dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50 hover:border-slate-200 dark:border-slate-700 text-slate-600 font-medium"
                        }`}
                    >
                      All Supervisors
                    </div>
                    {filteredSupervisors
                      .filter(s => !supervisorSearch || (s.name || "").toLowerCase().includes(supervisorSearch.toLowerCase()))
                      .map((sup) => (
                        <div
                          key={sup.user_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateDownloadFilter("supervisorId", String(sup.user_id));
                            setIsSupervisorDropdownOpen(false);
                          }}
                          className={`px-3 py-2 rounded-lg cursor-pointer transition-all border ${String(downloadFilters.supervisorId) === String(sup.user_id)
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm font-bold"
                            : "bg-white dark:bg-slate-900 dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50 hover:border-slate-200 dark:border-slate-700 text-slate-600 font-medium"
                            }`}
                        >
                          {sup.name}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col relative gap-1.5 employee-dropdown-container">
              <label className="text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest

flex
items-center
justify-between">
                <span>Employee</span>
                <span className="
text-[10px]
font-bold
 bg-green-50
dark:bg-green-900/20
 text-green-600
dark:text-green-400
 border
border-green-100
dark:border-green-800
 rounded
 px-1.5
py-0.5
 ml-2
">
                  {filteredEmployeesList.length}
                </span>
              </label>

              <div
                className={`relative border rounded transition-all bg-white dark:bg-slate-900 dark:bg-slate-900 cursor-pointer hover:border-slate-400 ${isEmployeeDropdownOpen ? "ring-1 ring-blue-500 border-b border-slate-200 dark:border-slate-700lue-500" : "border-slate-300"}`}
                onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
              >
                <div className="flex items-center justify-between p-2">
                  <span className={`text-sm truncate ${downloadFilters.employeeId === "all" ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                    {downloadFilters.employeeId === "all"
                      ? "All Employees"
                      : filteredEmployeesList.find(e => String(e.emp_id) === String(downloadFilters.employeeId))?.name || "All Employees"
                    }
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>

              {isEmployeeDropdownOpen && (
                <div className="absolute top-[100%] left-0 right-0 z-[100] mt-1.5 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-2.5 border-b border-slate-200 dark:border-slate-700 border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-300 rounded-md px-2.5 py-1.5 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                      <input
                        type="text"
                        placeholder="Search Employee..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="w-full bg-transparent text-sm focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-1.5 flex flex-col gap-0.5 bg-white dark:bg-slate-900 dark:bg-slate-900 scrollbar-thin scrollbar-thumb-slate-200">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        updateDownloadFilter("employeeId", "all");
                        setIsEmployeeDropdownOpen(false);
                      }}
                      className={`px-3 py-2 rounded-lg cursor-pointer transition-all border ${downloadFilters.employeeId === "all"
                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm font-bold"
                        : "bg-white dark:bg-slate-900 dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50 hover:border-slate-200 dark:border-slate-700 text-slate-600 font-medium"
                        }`}
                    >
                      All Employees
                    </div>
                    {filteredEmployeesList
                      .filter(emp => !employeeSearch || (emp.name || "").toLowerCase().includes(employeeSearch.toLowerCase()) || (emp.emp_code || "").toLowerCase().includes(employeeSearch.toLowerCase()))
                      .map((emp) => (
                        <div
                          key={emp.emp_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateDownloadFilter("employeeId", String(emp.emp_id));
                            setIsEmployeeDropdownOpen(false);
                          }}
                          className={`px-3 py-2 rounded-lg cursor-pointer transition-all border ${String(downloadFilters.employeeId) === String(emp.emp_id)
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm font-bold"
                            : "bg-white dark:bg-slate-900 dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50 hover:border-slate-200 dark:border-slate-700 text-slate-600 font-medium"
                            }`}
                        >
                          {emp.name} {emp.emp_code ? `(${emp.emp_code})` : ""}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest

flex
items-center
justify-between">Shift</label>
              <select
                value={downloadFilters.shift}
                onChange={(e) => updateDownloadFilter("shift", e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-900 dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Shifts</option>
                <option value="morning">Morning (6AM - 1PM)</option>
                <option value="afternoon">Afternoon (2PM - 10PM)</option>
                <option value="night">Night (10PM - 6AM)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest

flex
items-center
justify-between">Auto Punch-Out</label>
              <select
                value={downloadFilters.autoPunchOut}
                onChange={(e) => updateDownloadFilter("autoPunchOut", e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-900 dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200"
              >
                <option value="any">All Punch-Out Types</option>
                <option value="auto">Auto Punch-Out Only</option>
                <option value="manual">Manual Punch-Out Only</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest

flex
items-center
justify-between">Attendance Filter</label>
              <select
                value={recordFilter}
                onChange={(e) => setRecordFilter(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-900 dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200"
              >
                <option value="all">All Employees</option>
                <option value="marked">Punched Only</option>
                <option value="unmarked">Not Punched Only</option>
                <option value="leave">On Leave Only</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px]
font-black

text-black
dark:text-slate-200

uppercase
tracking-widest

flex
items-center
justify-between">Face Registration</label>
              <button
                type="button"
                onClick={() => setShowFaceUnregistered((prev) => !prev)}
                className={`w-full border border-slate-300 dark:border-slate-600

rounded-lg
px-3 py-2

bg-white dark:bg-slate-900 dark:bg-slate-800

text-slate-800 dark:text-slate-100 dark:text-slate-100

outline-none
focus:ring-2
focus:ring-indigo-500 text-[10px] font-black transition-all shadow-sm active:scale-95 h-[38px] uppercase tracking-widest ${showFaceUnregistered
                    ? "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
                    : "bg-white dark:bg-slate-900 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
              >
                {showFaceUnregistered ? "Hide unregistered" : "Show face not registered"}
              </button>
            </div>
          </div>

          {downloadFilters.reportLayout === "supervisor_summary" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="absenteesOnly"
                checked={downloadFilters.absenteesOnly === "true"}
                onChange={(e) =>
                  updateDownloadFilter("absenteesOnly", e.target.checked ? "true" : "false")
                }
              />
              <label htmlFor="absenteesOnly" className="font-medium">
                Only show supervisors with absentees
              </label>
            </div>
          )}

          {downloadError && (
            <div className="text-red-600 dark:text-red-400 text-xs font-bold mt-2">{downloadError}</div>
          )}
          {downloadMessage && (
            <div className="text-green-600 dark:text-green-400 text-xs font-bold mt-2">{downloadMessage}</div>
          )}
        </form>
      </section>

      {showFaceUnregistered && (
        <section className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-200 dark:border-slate-700 overflow-hidden mb-8">
          <div
            className="
bg-slate-50/50
dark:bg-slate-900/60

p-4

border-b
border-slate-200
dark:border-slate-700

flex
flex-col
sm:flex-row
sm:items-center
sm:justify-between

gap-3
"
          >
            <div>
              <h2
                className="
text-sm
font-bold

text-slate-800
dark:text-slate-100

uppercase
tracking-wider
"
              >
                Face Not Registered
              </h2>

              <p
                className="
text-[10px]

text-slate-400
dark:text-slate-500

font-medium

mt-0.5
"
              >
                Scoped to current City / Zone / Ward / Kothi filters
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="
text-[10px]
font-black

bg-indigo-50
dark:bg-indigo-900/20

text-indigo-600
dark:text-indigo-400

border
border-indigo-100
dark:border-indigo-800

rounded

px-2
py-1

uppercase
tracking-widest
"
              >
                {faceUnregisteredEmployees.length} RECORDS
              </div>

              <button
                type="button"
                onClick={downloadFaceList}
                disabled={!faceUnregisteredEmployees.length}
                className={`
text-[10px]
font-black

px-3
py-1.5

rounded-lg

border

transition-all

uppercase
tracking-widest

active:scale-95

${faceUnregisteredEmployees.length
                    ? `
      bg-indigo-600
      dark:bg-indigo-500

      text-white

      border-indigo-600
      dark:border-indigo-500

      hover:bg-indigo-700
      dark:hover:bg-indigo-600

      shadow-sm
      shadow-indigo-100

      dark:shadow-none
    `
                    : `
      bg-slate-100
      dark:bg-slate-800

      text-slate-400
      dark:text-slate-500

      border-slate-200
      dark:border-slate-700

      cursor-not-allowed
    `
                  }
`}
              >
                DOWNLOAD CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-hidden scrollbar-thin">
            <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr
                  className="bg-slate-50/50
dark:bg-slate-800/80
 border-b
border-slate-200
dark:border-slate-700

"
                >                  {[
                  { key: "hash", label: "#" },
                  { key: "name", label: "Name" },
                  { key: "empCode", label: "Emp Code" },
                  { key: "contact", label: "Contact" },
                  { key: "city", label: "City" },
                  { key: "zone", label: "Zone" },
                  { key: "ward", label: "Ward / Kothi" },
                  { key: "supervisor", label: "Supervisor" },
                  { key: "status", label: "Status" },
                ].map((col) => (
                  <th key={col.key} className="px-3 py-2.5 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-r border-slate-100 last:border-r-0 relative" style={{ width: columnWidthsFace[col.key] }}>
                    <div className="truncate pr-2" title={col.label}>{col.label}</div>
                  </th>
                ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facePaginatedEmployees.length ? (
                  facePaginatedEmployees.map((emp, idx) => (
                    <tr key={`face-missing-${emp.emp_id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50/30 transition-colors">
                      <td className="px-3 py-2 border-r border-slate-50 text-center text-slate-400 font-medium">
                        {(facePage - 1) * facePageSize + idx + 1}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-50 font-bold text-slate-800 dark:text-slate-100" title={emp.name || "-"}>
                        {emp.name || "-"}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-50 text-slate-500 dark:text-slate-400 font-bold" title={emp.emp_code || "-"}>
                        {emp.emp_code || "-"}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-50 text-slate-600 font-medium" title={emp.phone || emp.contact_no || "-"}>
                        {emp.phone || emp.contact_no || "-"}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-50 text-slate-600" title={emp.city || emp.city_name || "-"}>
                        {emp.city || emp.city_name || "-"}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-50 text-indigo-600 font-bold uppercase tracking-tight" title={emp.zone || emp.zone_name || "-"}>
                        {emp.zone || emp.zone_name || "-"}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight" title={emp.ward || emp.ward_name || "-"}>
                        {emp.ward || emp.ward_name || "-"}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-50 text-slate-700 dark:text-slate-200 font-medium" title={getSupervisorNameForEmployee(emp)}>
                        {getSupervisorNameForEmployee(emp)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-bold uppercase border border-rose-100">
                          Unregistered
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="px-4 py-10 text-center text-slate-300 italic text-sm">
                      No employees found for the selected area filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            className="
flex
flex-col
gap-3

md:flex-row
md:items-center
md:justify-between

mt-4

bg-amber-50
dark:bg-amber-900/10

border
border-gray-200
dark:border-gray-800

rounded

p-3
"
          >            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Show:</span>
              <select
                value={facePageSize}
                onChange={handleFacePageSizeChange}
                className="border rounded p-1 text-sm bg-white dark:bg-slate-900 dark:bg-slate-900"
              >
                {FACE_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-400">
                {(faceTotal && (facePage - 1) * facePageSize + 1) || 0}-
                {Math.min(facePage * facePageSize, faceTotal)} / {faceTotal}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => goToFacePage(facePage - 1)}
                disabled={facePage === 1}
                className="p-2 border rounded-md hover:bg-white dark:bg-slate-900 dark:bg-slate-900 disabled:opacity-40 transition"
                title="Previous Page"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <span className="text-sm font-medium text-gray-400 min-w-[80px] text-center">
                Page {Math.min(facePage, faceTotalPages)} / {faceTotalPages}
              </span>
              <button
                type="button"
                onClick={() => goToFacePage(facePage + 1)}
                disabled={facePage >= faceTotalPages || faceTotal === 0}
                className="p-2 border rounded-md hover:bg-white dark:bg-slate-900 dark:bg-slate-900 disabled:opacity-40 transition"
                title="Next Page"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Record Controls */}

      {downloadFilters.dateMode !== "range" || reportType === "detailed" ? (
        <>
          {/* Record Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2 whitespace-nowrap">Status Scope:</span>
              {[
                { value: "all", label: "ALL EMPLOYEES" },
                { value: "faceRegistered", label: "FACE REGISTERED EMPLOYEES" },
                { value: "punchIn", label: "PRESENT" },
                { value: "midShiftPunchIn", label: "MID SHIFT PUNCH IN" },
                { value: "onLeave", label: "ON LEAVE" },
                { value: "absent", label: "ABSENT" },
                { value: "autoPunchOut", label: "AUTO PUNCH OUT" },
                { value: "manualPunchOut", label: "MANUAL PUNCH OUT" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setPunchFilter(value); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all border uppercase tracking-widest whitespace-nowrap ${punchFilter === value
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                    : "bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-200 hover:text-indigo-600"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="text-xs font-black text-slate-400 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl shadow-sm uppercase tracking-widest">
              FOUND {uniqueEmployeeCount} RECORDS
            </div>
          </div>

          {/* Attendance Table Container */}

          <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-200 dark:border-slate-700 overflow-hidden transition-all">
            <div className="overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 dark:border-slate-700 border-slate-200 dark:border-slate-700">
                    {[
                      { key: "srNo", label: "Sr No." },
                      { key: "date", label: "Date" },
                      { key: "zone", label: "Zone" },
                      { key: "ward", label: "Ward" },
                      { key: "kothi", label: "Kothi" },
                      { key: "empName", label: "Employee Name" },
                      { key: "status", label: "Status / Leave Type" },
                      { key: "empCode", label: "Emp Code" },
                      { key: "contact", label: "Contact No." },
                      { key: "inTime", label: "Punch In Time" },
                      { key: "inImage", label: "In Image" },
                      { key: "punchedInBy", label: "Punched In By" },
                      { key: "inAddress", label: "In Address" },
                      { key: "inLatLong", label: "In Lat / Long" },
                      { key: "midTime", label: "Mid Shift In Time" },
                      { key: "midImage", label: "Mid Shift Image" },
                      { key: "midBy", label: "Mid Shift Punched By" },
                      { key: "midAddress", label: "Mid Shift Address" },
                      { key: "midLatLong", label: "Mid Shift Lat / Long" },
                      { key: "outTime", label: "Punch Out Time" },
                      { key: "outImage", label: "Out Image" },
                      { key: "punchedOutBy", label: "Punched Out By" },
                      { key: "outAddress", label: "Out Address" },
                      { key: "outLatLong", label: "Out Lat / Long" },
                    ].map((col, idx) => (
                      <th
                        key={col.key}
                        style={{ width: columnWidths[col.key] }}
                        className={`px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider relative select-none border-r border-slate-100 last:border-r-0`}
                      >
                        <div className="truncate pr-2" title={col.label}>{col.label}</div>
                        <div
                          onMouseDown={(e) => handleMouseDown(e, col.key)}
                          className="absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-indigo-300 transition-all z-10"
                          title="Drag to resize"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((record, index) => (
                      <tr
                        key={buildRowKey(record, startIndex + index)}
                        className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-700/50/50 transition-all duration-150"
                      >
                        <td className="px-4 py-2.5 text-slate-400 font-medium text-xs border-r border-slate-100 truncate overflow-hidden whitespace-nowrap text-center" title={startIndex + index + 1}>
                          {startIndex + index + 1}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-600 text-sm border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={record.date || "-"}>
                          {record.date || "-"}
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap text-center">
                          <span className="text-sm font-bold text-indigo-600 uppercase tracking-tight" title={record.zone || "-"}>
                            {record.zone || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100" title={kothiToSectorMap[(record.ward || "").toLowerCase()] || "-"}>
                            {kothiToSectorMap[(record.ward || "").toLowerCase()] || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap">
                          <span className="text-sm font-bold text-slate-600" title={record.ward || "-"}>
                            {record.ward || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={record.name}>
                          <div className="font-black text-slate-900 dark:text-slate-100 text-sm">
                            {record.name}
                          </div>
                          {record?.leave_type ? (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold uppercase tracking-wide">
                                {deriveStatusLabel(record)}
                              </span>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={deriveStatusLabel(record)}>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${record?.leave_type
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : deriveStatus(record) === "Marked"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : deriveStatus(record) === "In Progress"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>
                            {deriveStatusLabel(record)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={record.emp_code}>
                          <div className="text-slate-800 dark:text-slate-100 font-bold text-sm">
                            {record.emp_code}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={record.contact_no || "-"}>
                          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                            {record.contact_no || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-black text-emerald-600 text-sm tracking-tighter text-center border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={record.isPlaceholder ? "-" : record.punch_in || "-"}>
                          {record.isPlaceholder ? "-" : record.punch_in || "-"}
                        </td>
                        <td className="px-4 py-2.5 text-center border-r border-slate-100 truncate overflow-hidden whitespace-nowrap">
                          {record.isPlaceholder ? (
                            "-"
                          ) : record.punch_in_image ? (
                            <div className="relative inline-block group/img">
                              <img
                                src={`${apiUrl}/app/attendance/employee/image?attendance_id=${record.attendance_id}&punch_type=IN`}
                                alt="Punch In"
                                className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:underline transition-all duration-300 ring-1 ring-slate-200 shadow-sm"
                                onClick={() => {
                                  setSelectedImage(`${apiUrl}/app/attendance/employee/image?attendance_id=${record.attendance_id}&punch_type=IN`);
                                  setIsModalOpen(true);
                                }}
                              />
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={record.isPlaceholder ? "-" : (record.punched_in_by || record.punch_in_by || "-")}>
                          <div className="text-slate-900 dark:text-slate-100 font-bold text-sm">
                            {record.isPlaceholder ? "-" : (record.punched_in_by || record.punch_in_by || "-")}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={record.isPlaceholder ? "-" : record.punch_in_address || record.in_address || "-"}>
                          <div className="text-slate-800 dark:text-slate-100 font-bold text-sm leading-relaxed">{record.isPlaceholder ? "-" : record.punch_in_address || record.in_address || "-"}</div>
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden" title={record.isPlaceholder ? "-" : (record.punch_in_latitude || record.latitude_in) ? `View on Google Maps: ${record.punch_in_latitude || record.latitude_in}, ${record.punch_in_longitude || record.longitude_in}` : "-"}>
                          {record.isPlaceholder ? "-" : (record.punch_in_latitude || record.latitude_in) ? (
                            <div
                              onClick={() => window.open(`https://www.google.com/maps?q=${record.punch_in_latitude || record.latitude_in},${record.punch_in_longitude || record.longitude_in}`, '_blank')}
                              className="text-emerald-600 font-bold text-[11px] font-mono leading-tight cursor-pointer hover:text-emerald-700 hover:underline hover:scale-105 transition-all"
                            >
                              <div className="truncate">{record.punch_in_latitude || record.latitude_in}</div>
                              <div className="truncate opacity-80">{record.punch_in_longitude || record.longitude_in}</div>
                            </div>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-2.5 font-black text-amber-600 text-sm tracking-tighter text-center border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={record.isPlaceholder ? "-" : (record.mid_shift_punch_in || record.mid_shift_punch_in_time || "-")}>
                          {record.isPlaceholder ? "-" : (record.mid_shift_punch_in || record.mid_shift_punch_in_time || "-")}
                        </td>
                        <td className="px-4 py-2.5 text-center border-r border-slate-100 truncate overflow-hidden whitespace-nowrap">
                          {record.isPlaceholder ? (
                            "-"
                          ) : record.mid_shift_punch_in_image ? (
                            <div className="relative inline-block group/img">
                              <img
                                src={`${apiUrl}/app/attendance/employee/image?attendance_id=${record.attendance_id}&punch_type=MID_IN`}
                                alt="Mid Shift Punch In"
                                className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:underline transition-all duration-300 ring-1 ring-slate-200 shadow-sm"
                                onClick={() => {
                                  setSelectedImage(`${apiUrl}/app/attendance/employee/image?attendance_id=${record.attendance_id}&punch_type=MID_IN`);
                                  setIsModalOpen(true);
                                }}
                              />
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={record.isPlaceholder ? "-" : (record.mid_shift_punched_in_by || "-")}>
                          <div className="text-slate-900 font-bold text-sm">
                            {record.isPlaceholder ? "-" : (record.mid_shift_punched_in_by || "-")}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={record.isPlaceholder ? "-" : (record.mid_in_address || "-")}>
                          <div className="text-slate-800 font-bold text-sm leading-relaxed">{record.isPlaceholder ? "-" : (record.mid_in_address || "-")}</div>
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden" title={record.isPlaceholder ? "-" : (record.latitude_mid_in) ? `View on Google Maps: ${record.latitude_mid_in}, ${record.longitude_mid_in}` : "-"}>
                          {record.isPlaceholder ? "-" : (record.latitude_mid_in) ? (
                            <div
                              onClick={() => window.open(`https://www.google.com/maps?q=${record.latitude_mid_in},${record.longitude_mid_in}`, '_blank')}
                              className="text-emerald-600 font-bold text-[11px] font-mono leading-tight cursor-pointer hover:text-emerald-700 hover:underline hover:scale-105 transition-all"
                            >
                              <div className="truncate">{record.latitude_mid_in}</div>
                              <div className="truncate opacity-80">{record.longitude_mid_in}</div>
                            </div>
                          ) : "-"}
                        </td>
                        <td className={`px-4 py-2.5 font-black ${record.punch_out && !record.is_auto_punch_out && isShiftCompleted(record) ? "text-emerald-600" : "text-rose-600"} text-sm tracking-tighter text-center border-r border-slate-100 overflow-hidden whitespace-nowrap`} title={record.isPlaceholder ? "-" : record.punch_out ? `${record.punch_out}${record.is_auto_punch_out ? " (Auto Punch-Out)" : ""}` : "-"}>
                          {record.isPlaceholder ? "-" : record.punch_out ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span>{record.punch_out}</span>
                              {record.is_auto_punch_out && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[9px] font-black uppercase tracking-widest leading-none border border-orange-200">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                  Auto
                                </span>
                              )}
                            </div>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-center border-r border-slate-100 truncate overflow-hidden whitespace-nowrap">
                          {record.isPlaceholder ? (
                            "-"
                          ) : record.punch_out_image ? (
                            <div className="relative inline-block group/img">
                              <img
                                src={`${apiUrl}/app/attendance/employee/image?attendance_id=${record.attendance_id}&punch_type=OUT`}
                                alt="Punch Out"
                                className="w-10 h-10 rounded-lg object-cover cursor-pointer hover:underline transition-all duration-300 ring-1 ring-slate-200 shadow-sm"
                                onClick={() => {
                                  setSelectedImage(`${apiUrl}/app/attendance/employee/image?attendance_id=${record.attendance_id}&punch_type=OUT`);
                                  setIsModalOpen(true);
                                }}
                              />
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-5 py-4 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={record.isPlaceholder ? "-" : record.is_auto_punch_out ? "System (Auto Punch-Out)" : (record.punched_out_by || record.punch_out_by || "-")}>
                          <div className="text-slate-600 font-bold text-sm truncate">
                            {record.isPlaceholder ? "-" : record.is_auto_punch_out ? (
                              <span className="text-orange-500 font-black">System (Auto)</span>
                            ) : (record.punched_out_by || record.punch_out_by || "-")}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap" title={record.isPlaceholder ? "-" : record.punch_out_address || record.out_address || "-"}>
                          <div className="text-slate-800 dark:text-slate-100 font-bold text-sm leading-relaxed">{record.isPlaceholder ? "-" : record.punch_out_address || record.out_address || "-"}</div>
                        </td>
                        <td className="px-4 py-2.5 truncate overflow-hidden" title={record.isPlaceholder ? "-" : (record.punch_out_latitude || record.latitude_out) ? `View on Google Maps: ${record.punch_out_latitude || record.latitude_out}, ${record.punch_out_longitude || record.longitude_out}` : "-"}>
                          {record.isPlaceholder ? "-" : (record.punch_out_latitude || record.latitude_out) ? (
                            <div
                              onClick={() => window.open(`https://www.google.com/maps?q=${record.punch_out_latitude || record.latitude_out},${record.punch_out_longitude || record.longitude_out}`, '_blank')}
                              className="text-emerald-600 font-bold text-[11px] font-mono leading-tight cursor-pointer hover:text-emerald-700 hover:underline hover:scale-105 transition-all"
                            >
                              <div className="truncate">{record.punch_out_latitude || record.latitude_out}</div>
                              <div className="truncate opacity-80">{record.punch_out_longitude || record.longitude_out}</div>
                            </div>
                          ) : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="24" className="px-10 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 dark:text-slate-100 bg-slate-50 rounded-full border border-slate-100">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                          </div>
                          <div className="text-slate-400 font-semibold text-lg">No records matched your filters.</div>
                          <div className="text-slate-300 text-sm italic">Try adjusting the date or location filters above.</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div
              className="
px-6
py-4

bg-slate-50
dark:bg-slate-800/80

border-t
border-slate-100
dark:border-slate-700

flex
flex-col

md:flex-row
md:items-center
md:justify-between

gap-4
"
            >          <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
                  <select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    className="bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                  >
                    {ATTENDANCE_PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-100 px-3 py-1.5 rounded-lg shadow-inner whitespace-nowrap">
                  {showingFrom} - {showingTo} <span className="mx-1 text-slate-300">/</span> {uniqueEmployeeCount} Records
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-xl border transition-all ${currentPage === 1 ? "bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-200 border-slate-100 cursor-not-allowed" : "bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700 hover:border-indigo-200 hover:text-indigo-600 shadow-sm active:scale-90"}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>

                <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-1.5 text-sm font-black text-slate-600 shadow-sm min-w-[100px] text-center uppercase tracking-tighter">
                  Page {Math.min(currentPage, totalPages)} <span className="mx-1 text-slate-300">OF</span> {totalPages}
                </div>

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || totalRecords === 0}
                  className={`p-2 rounded-xl border transition-all ${currentPage >= totalPages || totalRecords === 0 ? "bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-200 border-slate-100 cursor-not-allowed" : "bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700 hover:border-indigo-200 hover:text-indigo-600 shadow-sm active:scale-90"}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 mt-6 overflow-auto">

          <div className="px-6 py-4 border-b bg-slate-50">
            <h2 className="text-xl font-bold text-slate-700">
              Simple Attendance Report
            </h2>
          </div>

          <table className="min-w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-indigo-600 text-white">
                <th className="border px-3 py-2">Sr No.</th>
                <th className="border px-3 py-2">Employee Name</th>
                <th className="border px-3 py-2">Kothi</th>
                <th className="border px-3 py-2">Zone</th>
                <th className="border px-3 py-2">Employee Type</th>

                {dayColumns.map((d) => (
                  <th
                    key={d.key}
                    className="border px-2 py-2 text-center min-w-[40px]"
                  >
                    {d.day}
                  </th>
                ))}

                <th className="border px-2 py-2">P</th>
                <th className="border px-2 py-2">A</th>
                {leaveTypes.map((leave) => (
                  <th
                    key={leave}
                    className="border px-2 py-2 text-center"
                  >
                    {leave}
                  </th>
                ))}
                <th className="border px-2 py-2">TOTAL</th>
              </tr>
            </thead>

            <tbody>
              {(simpleRecords || []).length > 0 ? (
                simpleRecords.map((emp, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                  >
                    <td className="border px-2 py-2 text-center">
                      {index + 1}
                    </td>

                    <td className="border px-2 py-2 font-semibold whitespace-nowrap">
                      {emp.employee_name}
                    </td>

                    <td className="border px-2 py-2 whitespace-nowrap">
                      {emp.kothi_name}
                    </td>

                    <td className="border px-2 py-2 whitespace-nowrap">
                      {emp.zone_name}
                    </td>

                    <td className="border px-2 py-2 whitespace-nowrap">
                      {emp.employee_type || emp.designation_name || "-"}
                    </td>

                    {dayColumns.map((d) => (
                      <td
                        key={d.key}
                        className="border px-2 py-2 text-center font-bold"
                      >
                        {emp.days?.[d.key] || "-"}
                      </td>
                    ))}

                    <td className="border px-2 py-2 text-center">
                      {emp.summary?.P || 0}
                    </td>

                    <td className="border px-2 py-2 text-center">
                      {emp.summary?.A || 0}
                    </td>

                    {leaveTypes.map((leave) => (
                      <td
                        key={leave}
                        className="border px-2 py-2 text-center"
                      >
                        {emp.summary?.[leave] || 0}
                      </td>
                    ))}

                    <td className="border px-2 py-2 text-center font-bold">
                      {dayColumns.length}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={43}
                    className="text-center py-10 text-slate-500"
                  >
                    No Records Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

        </div>
      )}
      {/* Modal for Image Display */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Image Preview</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <div className="flex justify-center">
              {isLoading ? (
                <p className="text-gray-500">Loading image...</p>
              ) : selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="max-w-full max-h-96"
                />
              ) : (
                <p className="text-gray-500">No image available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceReports;
