import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL, { ALLOWED_CITIES_ENDPOINT } from "../config";
import Swal from "sweetalert2";
import { useSearch } from "../SearchContext";
import { Eye, Pencil, PlusCircle, Trash2, UsersRound, Filter, RefreshCw, UploadCloud, Download, X, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import Loader from "../components/Loader";
import { useAuth } from "../AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const apiUrl = `${API_BASE_URL}/api/employees`;
const buildRequestConfig = () => {
  if (typeof window === "undefined") {
    return { withCredentials: true };
  }
  const token = window.localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return { withCredentials: true, headers };
};
const normalizeId = (value) =>
  value === undefined || value === null ? "" : String(value);
const matchesId = (a, b) => normalizeId(a) === normalizeId(b);
const getCityId = (city) =>
  normalizeId(city?.city_id ?? city?.cityId ?? city?.id);
const getCityName = (city) =>
  city?.city_name ?? city?.cityName ?? city?.name ?? "";
const getZoneId = (zone) =>
  normalizeId(zone?.zone_id ?? zone?.zoneId ?? zone?.id);
const getZoneName = (zone) =>
  zone?.zone_name ?? zone?.zoneName ?? zone?.name ?? "";
const getZoneCityId = (zone) =>
  normalizeId(zone?.city_id ?? zone?.cityId ?? zone?.city?.city_id);
const getWardId = (ward) =>
  normalizeId(ward?.ward_id ?? ward?.wardId ?? ward?.id);
const getWardName = (ward) =>
  ward?.ward_name ?? ward?.wardName ?? ward?.name ?? "";
const getWardZoneId = (ward) =>
  normalizeId(ward?.zone_id ?? ward?.zoneId ?? ward?.zone?.zone_id);
const getDepartmentId = (department) =>
  normalizeId(
    department?.department_id ?? department?.departmentId ?? department?.id
  );
const getDepartmentName = (department) =>
  department?.department_name ??
  department?.departmentName ??
  department?.name ??
  "";
const getDesignationId = (designation) =>
  normalizeId(
    designation?.designation_id ??
    designation?.designationId ??
    designation?.id
  );
const getDesignationName = (designation) =>
  designation?.designation_name ??
  designation?.designationName ??
  designation?.name ??
  "";
const getDesignationDepartmentId = (designation) =>
  normalizeId(
    designation?.department_id ??
    designation?.departmentId ??
    designation?.department?.department_id
  );

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [supervisorMap, setSupervisorMap] = useState({});
  const [wards, setWards] = useState([]);
  const [sectors, setSectors] = useState([]); // Ward/Sector data from /api/sectors
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [cityScopeAll, setCityScopeAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isManualReloading, setIsManualReloading] = useState(false);
  const [isEditing, setIsEditing] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [editingAssignments, setEditingAssignments] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    emp_id: "",
    name: "",
    emp_code: "",
    aadhar_no: "",
    phone: "",
    ward_id: "",
    kothi_id: "",
    designation_id: "",
    city: "",
    zone: "",
    ward: "",
    department: "",
    designation: "",
  });
  const [aadharCardFile, setAadharCardFile] = useState(null);
  const [facePreview, setFacePreview] = useState({
    visible: false,
    loading: false,
    error: "",
    face: null,
    employee: null,
  });
  const [aadharPreview, setAadharPreview] = useState({
    visible: false,
    loading: false,
    url: "",
    name: "",
    type: ""
  });
  const [activeTab, setActiveTab] = useState("existing");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [selectedCityFilter, setSelectedCityFilter] = useState("");
  const [selectedZoneFilter, setSelectedZoneFilter] = useState("");
  const [selectedWardFilter, setSelectedWardFilter] = useState("");
  const [selectedKothiFilter, setSelectedKothiFilter] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("");
  const [selectedDesigFilter, setSelectedDesigFilter] = useState("");
  const { user, logPageView } = useAuth();
  const isSupervisor = user?.role === "supervisor";

  useEffect(() => {
    if (logPageView) {
      logPageView("Employee Master", "/employees");
    }
  }, [logPageView]);

  const { normalizedQuery, registerData } = useSearch();

  const uniqueCities = useMemo(() => {
    return [...new Set(employees.map(e => e.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [employees]);

  const uniqueZones = useMemo(() => {
    let filtered = employees;
    if (selectedCityFilter) filtered = filtered.filter(e => e.city === selectedCityFilter);
    return [...new Set(filtered.map(e => e.zone).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [employees, selectedCityFilter]);

  // Build a lookup map: kothi wardName (lowercase) → sector/ward name
  const kothiToSectorMap = useMemo(() => {
    const map = {};
    sectors.forEach(sector => {
      (sector.kothis || []).forEach(kothi => {
        if (kothi.wardName) {
          map[kothi.wardName.toLowerCase()] = sector.sector_name;
        }
      });
    });
    return map;
  }, [sectors]);

  // Ward filter shows Sector/Ward names (derived by looking up each employee's kothi in kothiToSectorMap)
  const uniqueWards = useMemo(() => {
    let filtered = employees;
    if (selectedCityFilter) filtered = filtered.filter(e => e.city === selectedCityFilter);
    if (selectedZoneFilter) filtered = filtered.filter(e => e.zone === selectedZoneFilter);
    const wardSet = new Set();
    filtered.forEach(e => {
      if (e.ward) {
        const sectorName = kothiToSectorMap[(e.ward || '').toLowerCase()];
        if (sectorName) wardSet.add(sectorName);
      }
    });
    return [...wardSet].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [employees, selectedCityFilter, selectedZoneFilter, kothiToSectorMap]);

  // Kothi filter shows Kothi names (emp.ward from API), filtered by selected Ward/Sector
  const uniqueKothis = useMemo(() => {
    let filtered = employees;
    if (selectedCityFilter) filtered = filtered.filter(e => e.city === selectedCityFilter);
    if (selectedZoneFilter) filtered = filtered.filter(e => e.zone === selectedZoneFilter);
    if (selectedWardFilter) {
      const sector = sectors.find(s => s.sector_name === selectedWardFilter);
      const sectorKothiNames = new Set((sector?.kothis || []).map(k => (k.wardName || '').toLowerCase()));
      filtered = filtered.filter(e => sectorKothiNames.has((e.ward || '').toLowerCase()));
    }
    return [...new Set(filtered.map(e => e.ward).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [employees, selectedCityFilter, selectedZoneFilter, selectedWardFilter, sectors]);

  const uniqueDepts = useMemo(() => {
    let filtered = employees;
    if (selectedCityFilter) filtered = filtered.filter(e => e.city === selectedCityFilter);
    return [...new Set(filtered.map(e => e.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [employees, selectedCityFilter]);

  const uniqueDesigs = useMemo(() => {
    let filtered = employees;
    if (selectedCityFilter) filtered = filtered.filter(e => e.city === selectedCityFilter);
    if (selectedDeptFilter) filtered = filtered.filter(e => e.department === selectedDeptFilter);
    return [...new Set(filtered.map(e => e.designation).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [employees, selectedCityFilter, selectedDeptFilter]);

  const fetchAllData = useCallback(async (isManual = false) => {
    if (isManual) setIsManualReloading(true);
    setLoading(true);
    try {
      await Promise.all([
        fetchEmployees(),
        fetchDropdownData()
      ]);
    } finally {
      setLoading(false);
      setIsManualReloading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(apiUrl, buildRequestConfig());
      setEmployees(response.data);
      registerData("employees", response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const filteredEmployees = useMemo(() => {
    let result = employees;

    if (normalizedQuery) {
      result = result.filter((emp) => {
        // Build supervisor names string for this employee
        const wardNames = Array.from(emp.wards || (emp.ward ? [emp.ward] : []));
        const supervisorNames = wardNames.flatMap(w => supervisorMap[String(w).trim().toLowerCase()] || []).join(" ");
        const values = [
          emp.name,
          emp.emp_code,
          emp.phone,
          emp.city,
          emp.zone,
          emp.ward,
          emp.department,
          emp.designation,
          supervisorNames,
        ];
        return values.some((value) =>
          String(value ?? "").toLowerCase().includes(normalizedQuery)
        );
      });
    }

    if (selectedCityFilter) {
      result = result.filter(emp => emp.city === selectedCityFilter);
    }
    if (selectedZoneFilter) {
      result = result.filter(emp => emp.zone === selectedZoneFilter);
    }
    if (selectedWardFilter) {
      // Ward filter is a Sector name — match employees whose kothi (emp.ward) belongs to that sector
      const sector = sectors.find(s => s.sector_name === selectedWardFilter);
      const sectorKothiNames = new Set((sector?.kothis || []).map(k => (k.wardName || '').toLowerCase()));
      result = result.filter(emp => sectorKothiNames.has((emp.ward || '').toLowerCase()));
    }
    if (selectedKothiFilter) {
      // Kothi filter matches emp.ward (which is the kothi name in the API)
      result = result.filter(emp => emp.ward === selectedKothiFilter);
    }
    if (selectedDeptFilter) {
      result = result.filter(emp => emp.department === selectedDeptFilter);
    }
    if (selectedDesigFilter) {
      result = result.filter(emp => emp.designation === selectedDesigFilter);
    }

    if (localSearchQuery) {
      const lowerQuery = localSearchQuery.toLowerCase();
      result = result.filter((emp) => {
        // Build supervisor names string for this employee
        const wardNames = Array.from(emp.wards || (emp.ward ? [emp.ward] : []));
        const supervisorNames = wardNames.flatMap(w => supervisorMap[String(w).trim().toLowerCase()] || []).join(" ");
        const values = [
          emp.name,
          emp.emp_code,
          emp.phone,
          emp.city,
          emp.zone,
          emp.ward,
          emp.department,
          emp.designation,
          supervisorNames,
        ];
        return values.some((value) =>
          String(value ?? "").toLowerCase().includes(lowerQuery)
        );
      });
    }

    return result;
  }, [employees, normalizedQuery, localSearchQuery, selectedCityFilter, selectedZoneFilter, selectedWardFilter, selectedKothiFilter, selectedDeptFilter, selectedDesigFilter, sectors]);

  const handleResetFilters = () => {
    setLocalSearchQuery("");
    setSelectedCityFilter(cityScopeAll ? "" : (cities.length === 1 ? cities[0]?.city_name || "" : ""));
    setSelectedZoneFilter("");
    setSelectedWardFilter("");
    setSelectedKothiFilter("");
    setSelectedDeptFilter("");
    setSelectedDesigFilter("");
  };
  const exportToExcel = () => {
    const data = filteredEmployees.map((emp, index) => ({
      "Sr No": index + 1,
      "Emp Code": emp.emp_code,
      Name: emp.name,
      "Aadhar No": emp.aadhar_no,
      Phone: emp.phone,
      City: emp.city,
      Zone: emp.zone,
      Ward: emp.ward,
      Department: emp.department,
      Designation: emp.designation,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Employees"
    );

    XLSX.writeFile(
      workbook,
      "Employee_Master.xlsx"
    );
  };
  const exportToPDF = () => {
    const doc = new jsPDF("landscape");

    const tableData = filteredEmployees.map((emp, index) => [
      index + 1,
      emp.emp_code || "",
      emp.name || "",
      emp.phone || "",
      emp.city || "",
      emp.zone || "",
      emp.ward || "",
      emp.department || "",
      emp.designation || "",
    ]);

    autoTable(doc, {
      head: [[
        "Sr No",
        "Emp Code",
        "Name",
        "Phone",
        "City",
        "Zone",
        "Kothi",
        "Department",
        "Designation"
      ]],
      body: tableData,
      styles: {
        fontSize: 8,
      },
    });

    doc.save("Employee_Master.pdf");
  };
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");

    const tableRows = filteredEmployees
      .map(
        (emp, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${emp.emp_code || ""}</td>
        <td>${emp.name || ""}</td>
        <td>${emp.phone || ""}</td>
        <td>${emp.city || ""}</td>
        <td>${emp.zone || ""}</td>
        <td>${emp.ward || ""}</td>
        <td>${emp.department || ""}</td>
        <td>${emp.designation || ""}</td>
      </tr>
    `
      )
      .join("");

    printWindow.document.write(`
    <html>
      <head>
        <title>Employee Master</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }

          h2 {
            text-align: center;
            margin-bottom: 20px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }

          th {
            background: #f0f0f0;
          }
        </style>
      </head>
      <body>
        <h2>Employee Master Report</h2>

        <table>
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Emp Code</th>
              <th>Name</th>
              <th>Phone</th>
              <th>City</th>
              <th>Zone</th>
              <th>Kothi</th>
              <th>Department</th>
              <th>Designation</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const groupedEmployees = useMemo(() => {
    const map = new Map();
    filteredEmployees.forEach((emp) => {
      // Use emp_code as primary identifier if available, otherwise fall back to emp_id 
      // to ensure unique database records are not merged if they lack a code.
      const code = emp.emp_code ? String(emp.emp_code).trim().toUpperCase() : `_ID_${emp.emp_id || Math.random()}`;

      if (!map.has(code)) {
        map.set(code, {
          ...emp,
          wards: emp.ward ? new Set([emp.ward]) : new Set(),
          kothis: emp.kothi ? new Set([emp.kothi]) : new Set(),
          departments: emp.department ? new Set([emp.department]) : new Set(),
          zones: emp.zone ? new Set([emp.zone]) : new Set(),
          cities: emp.city ? new Set([emp.city]) : new Set(),
          originalIds: [emp.emp_id]
        });
      } else {
        const existing = map.get(code);
        if (emp.ward) existing.wards.add(emp.ward);
        if (emp.kothi) existing.kothis.add(emp.kothi);
        if (emp.department) existing.departments.add(emp.department);
        if (emp.zone) existing.zones.add(emp.zone);
        if (emp.city) existing.cities.add(emp.city);
        existing.originalIds.push(emp.emp_id);
      }
    });

    return Array.from(map.values()).map(emp => ({
      ...emp,
      ward_display: Array.from(emp.wards).join(', ') || emp.ward || "Unknown",
      kothi_display: Array.from(emp.wards).join(', ') || emp.ward || "—",
      department_display: Array.from(emp.departments).join(', ') || emp.department || "Unknown",
      zone_display: Array.from(emp.zones).join(', ') || emp.zone || "Unknown",
      city_display: Array.from(emp.cities).join(', ') || emp.city || "Unknown",
    })).sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: 'base' }));
  }, [filteredEmployees]);

  const totalEmployees = groupedEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / pageSize)) || 1;
  const { paginatedEmployees, startIndex } = useMemo(() => {
    const start = Math.max(0, (currentPage - 1) * pageSize);
    const end = start + pageSize;
    return {
      paginatedEmployees: groupedEmployees.slice(start, end),
      startIndex: start,
    };
  }, [groupedEmployees, currentPage, pageSize]);
  const showingFrom = totalEmployees ? startIndex + 1 : 0;
  const showingTo = totalEmployees
    ? Math.min(startIndex + pageSize, totalEmployees)
    : 0;

  const singleCityMode = !cityScopeAll && cities.length === 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedQuery]);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!cityScopeAll && cities.length === 1) {
      const onlyCityId = getCityId(cities[0]);
      setNewEmployee((prev) => ({
        ...prev,
        city: onlyCityId,
      }));

      const cityName = getCityName(cities[0]);
      if (cityName) {
        setSelectedCityFilter(cityName);
      }
    }
  }, [cityScopeAll, cities]);

  const fetchDropdownData = async () => {
    try {
      const [citiesRes, zonesRes, wardsRes, sectorsRes, departmentsRes, designationsRes] =
        await Promise.all([
          axios.get(ALLOWED_CITIES_ENDPOINT, buildRequestConfig()),
          axios.get(`${API_BASE_URL}/api/zones`, buildRequestConfig()),
          axios.get(`${API_BASE_URL}/api/wards`, buildRequestConfig()),
          axios.get(`${API_BASE_URL}/api/sectors`, buildRequestConfig()),
          axios.get(`${API_BASE_URL}/api/departments`, buildRequestConfig()),
          axios.get(`${API_BASE_URL}/api/designations`, buildRequestConfig()),
        ]);

      const cityPayload = citiesRes.data || {};
      const cityList = Array.isArray(cityPayload.cities)
        ? cityPayload.cities
        : Array.isArray(cityPayload)
          ? cityPayload
          : [];
      const scopeAll = Boolean(cityPayload.all);

      setCities(cityList);
      setCityScopeAll(scopeAll);
      setZones(Array.isArray(zonesRes.data) ? zonesRes.data : []);

      // Format wards data to match the new nested structure
      const formattedWards = (Array.isArray(wardsRes.data) ? wardsRes.data : [])
        .flatMap((city) =>
          (city?.zones || []).flatMap((zone) =>
            (zone?.wards || []).map((ward) => ({
              ward_id: normalizeId(ward?.wardId ?? ward?.ward_id),
              ward_name: ward?.wardName ?? ward?.ward_name ?? "",
              zone_id: normalizeId(zone?.zoneId ?? zone?.zone_id),
              city_id: normalizeId(city?.cityId ?? city?.city_id),
              sector_id: normalizeId(ward?.sectorId ?? ward?.sector_id),
            }))
          )
        );
      setWards(formattedWards);

      // Format sectors (Ward/Sector boundaries) from /api/sectors
      const formattedSectors = (Array.isArray(sectorsRes.data) ? sectorsRes.data : [])
        .flatMap((city) =>
          (city?.zones || []).flatMap((zone) =>
            (zone?.sectors || []).map((sector) => ({
              sector_id: normalizeId(sector?.sectorId ?? sector?.sector_id),
              sector_name: sector?.sectorName ?? sector?.sector_name ?? "",
              zone_id: normalizeId(zone?.zoneId ?? zone?.zone_id),
              city_id: normalizeId(city?.cityId ?? city?.city_id),
              kothis: Array.isArray(sector?.kothis) ? sector.kothis : [],
            }))
          )
        );
      setSectors(formattedSectors);

      setDepartments(
        Array.isArray(departmentsRes.data) ? departmentsRes.data : []
      );
      setDesignations(
        Array.isArray(designationsRes.data) ? designationsRes.data : []
      );

      // Fetch supervisor assignments to map them to wards
      try {
        const assignmentsRes = await axios.get(
          `${API_BASE_URL}/api/assignedWardRoutes`,
          buildRequestConfig()
        );
        const assignments = Array.isArray(assignmentsRes.data) ? assignmentsRes.data : [];
        const map = {};
        assignments.forEach((asg) => {
          if (asg.ward_name && asg.name) {
            const wName = String(asg.ward_name).trim().toLowerCase();
            if (!map[wName]) map[wName] = [];
            if (!map[wName].includes(asg.name)) {
              map[wName].push(asg.name);
            }
          }
        });
        setSupervisorMap(map);
      } catch (err) {
        console.error("Error fetching supervisor assignments:", err);
      }

      if (!scopeAll && cityList.length === 1) {
        const onlyCityId = getCityId(cityList[0]);
        setNewEmployee((prev) => ({
          ...prev,
          city: onlyCityId,
        }));
      }
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
    }
  };

  const resetLabel = () => {
    setNewEmployee({
      emp_id: "",
      name: "",
      emp_code: "",
      aadhar_no: "",
      phone: "",
      ward_id: "",
      kothi_id: "",
      designation_id: "",
      city: "",
      zone: "",
      ward: "",
      department: "",
      designation: "",
    });
    setAadharCardFile(null);
    setEditingAssignments([]);
    setIsEditing(null);
  };

  const addOrUpdateEmployee = async () => {
    // Check all fields are present
    if (
      !newEmployee.name?.trim() ||
      !newEmployee.emp_code?.trim() ||
      // !newEmployee.aadhar_no?.trim() ||
      !newEmployee.phone?.trim() ||
      !newEmployee.city ||
      !newEmployee.zone ||
      !newEmployee.ward_id ||
      !newEmployee.kothi_id ||
      !newEmployee.department ||
      !newEmployee.designation_id
    ) {
      Swal.fire("Required", "All fields are compulsory to fill", "warning");
      return;
    }

    // Aadhar No: must be exactly 12 digits
    // if (!/^\d{12}$/.test(newEmployee.aadhar_no.trim())) {
    //   Swal.fire("Invalid Aadhar", "Aadhar number must be exactly 12 digits.", "warning");
    //   return;
    // }

    // // Check for unique Aadhar
    // const duplicateAadhar = employees.find(e => 
    //   e.aadhar_no && e.aadhar_no === newEmployee.aadhar_no.trim() && 
    //   String(e.emp_code).trim().toUpperCase() !== String(newEmployee.emp_code).trim().toUpperCase()
    // );
    // if (duplicateAadhar) {
    //   Swal.fire("Duplicate Aadhar", `This Aadhar number is already registered to employee: ${duplicateAadhar.name} (${duplicateAadhar.emp_code}).`, "warning");
    //   return;
    // }

    // Phone: must be exactly 10 digits
    const rawPhone = newEmployee.phone.replace(/\D/g, "");
    if (rawPhone.length !== 10) {
      Swal.fire("Invalid Phone", "Mobile number must be exactly 10 digits.", "warning");
      return;
    }

    const payload = {
      ...newEmployee,
      ward_id: newEmployee.kothi_id || newEmployee.ward_id || null,
      designation_id: newEmployee.designation_id || null,
      updateAllWithCode: Boolean(isEditing),
    };

    try {
      let savedEmpId = null;
      if (isEditing) {
        // Find existing record for this specific ID if possible
        const existingId = newEmployee.emp_id || isEditing;
        const res = await axios.put(
          `${apiUrl}/${existingId}`,
          payload,
          buildRequestConfig()
        );
        savedEmpId = res.data?.emp_id || existingId;
        Swal.fire("Updated", "Employee assignment updated successfully.", "success");
      } else {
        const res = await axios.post(apiUrl, payload, buildRequestConfig());
        savedEmpId = res.data?.emp_id;
        Swal.fire("Saved", "New employee assignment created.", "success");
      }

      if (aadharCardFile && savedEmpId) {
        try {
          const formData = new FormData();
          formData.append("document", aadharCardFile);

          await axios.post(
            `${apiUrl}/${savedEmpId}/aadhar`,
            formData,
            {
              ...buildRequestConfig(),
              headers: {
                ...buildRequestConfig().headers,
                "Content-Type": "multipart/form-data"
              }
            }
          );
        } catch (uploadError) {
          console.error("Error uploading Aadhar:", uploadError);
          const errorMsg = uploadError.response?.data?.error || "Failed to upload document.";
          Swal.fire("Warning", `Employee saved, but Aadhar upload failed: ${errorMsg}`, "warning");
        }
      }

      fetchEmployees();
      resetLabel();
    } catch (error) {
      console.error("Error saving employee:", error);
      const msg = error.response?.data?.error || error.response?.data?.message || "Something went wrong.";
      Swal.fire("Error", msg, "error");
    }
  };

  const deleteEmployee = async (emp_id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to undo this action!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${apiUrl}/${emp_id}`, buildRequestConfig());
      fetchEmployees();
      Swal.fire("Deleted!", "The Employee has been removed.", "success");
    } catch (error) {
      console.error("Error deleting employee:", error);
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const editEmployee = (emp) => {
    // Find all records from the full employees list that share this employee's code
    const relatedRecords = employees.filter(e =>
      e.emp_code && emp.emp_code &&
      String(e.emp_code).trim().toUpperCase() === String(emp.emp_code).trim().toUpperCase()
    ).map(record => {
      // Find the specific kothi mapping for this record
      const kothiObj = wards.find((w) => getWardName(w) === record.ward);
      return {
        ...record,
        city_id: getCityId(cities.find((c) => getCityName(c) === record.city)) || "",
        zone_id: getZoneId(zones.find((z) => getZoneName(z) === record.zone)) || "",
        sector_id: kothiObj?.sector_id || "",
        kothi_id: kothiObj?.ward_id || "",
      };
    });

    setEditingAssignments(relatedRecords);

    // Populate the form with the first record's common data
    const base = relatedRecords[0] || emp;
    const kothiObj = wards.find((w) => getWardName(w) === (base.ward || "").split(",")[0].trim());

    setNewEmployee({
      ...base,
      city: getCityId(cities.find((c) => getCityName(c) === base.city)) || "",
      zone: getZoneId(zones.find((z) => getZoneName(z) === base.zone)) || "",
      ward_id: kothiObj?.sector_id || "",
      kothi_id: kothiObj?.ward_id || "",
      department:
        getDepartmentId(
          departments.find((de) => getDepartmentName(de) === base.department)
        ) || "",
      designation_id:
        getDesignationId(
          designations.find(
            (d) => getDesignationName(d) === base.designation
          )
        ) || "",
    });
    setIsEditing(base.emp_id);
    setActiveTab("register");
  };

  const handleViewFace = async (emp) => {
    setFacePreview({
      visible: true,
      loading: true,
      error: "",
      face: null,
      employee: emp,
    });

    try {
      const proxyUrl = `${API_BASE_URL}/api/app/attendance/employee/faceRoutes/image/${emp.emp_id}`;
      const response = await axios.get(proxyUrl, {
        ...buildRequestConfig(),
        responseType: "blob",
      });

      const imageUrl = URL.createObjectURL(response.data);

      setFacePreview({
        visible: true,
        loading: false,
        error: "",
        face: { imageUrl },
        employee: emp,
      });
    } catch (error) {
      const status = error?.response?.status;
      const message =
        status === 404
          ? "Face not registered for this employee."
          : "Unable to fetch face details.";
      setFacePreview({
        visible: true,
        loading: false,
        error: message,
        face: null,
        employee: emp,
      });
    }
  };

  const handleViewAadhar = async (emp) => {
    if (emp.aadhar_url || emp.aadhar) {
      const viewUrl = `${API_BASE_URL}/api/employees/${emp.emp_id}/aadhar/view`;
      setAadharPreview({
        visible: true,
        loading: true,
        url: "",
        name: emp.name || emp.emp_id,
        type: ""
      });

      try {
        const response = await axios.get(viewUrl, {
          ...buildRequestConfig(),
          responseType: "blob",
        });

        const blob = response.data;
        const objectUrl = URL.createObjectURL(blob);

        setAadharPreview({
          visible: true,
          loading: false,
          url: objectUrl,
          name: emp.name || emp.emp_id,
          type: blob.type
        });
      } catch (err) {
        console.error("Error loading aadhar:", err);
        setAadharPreview({ visible: false, loading: false, url: "", name: "", type: "" });
        Swal.fire("Error", "Could not load Aadhar document. Please try again.", "error");
      }
    } else {
      Swal.fire({
        title: "Aadhar Document",
        text: "Document not available.",
        icon: "info"
      });
    }
  };

  const closeAadharPreview = () => {
    if (aadharPreview.url?.startsWith("blob:")) {
      URL.revokeObjectURL(aadharPreview.url);
    }
    setAadharPreview({ visible: false, loading: false, url: "", name: "", type: "" });
  };

  const closeFacePreview = () => {
    if (facePreview.face?.imageUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(facePreview.face.imageUrl);
    }
    setFacePreview({
      visible: false,
      loading: false,
      error: "",
      face: null,
      employee: null,
    });
  };

  const handlePageSizeChange = (event) => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  };

  const goToPage = (page) => {
    setCurrentPage((prev) => {
      if (page === prev) return prev;
      const nextPage = Math.max(1, Math.min(page, totalPages));
      return nextPage;
    });
  };

  return (
    <div className="p-5 text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 min-h-screen">
      {isManualReloading && <Loader />}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
          <UsersRound size={22} /> Employee Master
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAllData(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 uppercase tracking-widest"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Reload Data"}
          </button>
          {!isSupervisor && (
            <div className="
flex p-1

bg-slate-100/80
dark:bg-slate-900

rounded-xl

border border-slate-200 dark:border-slate-700

shadow-inner
">
              <button
                onClick={() => setActiveTab("register")}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === "register" ? "bg-white dark:bg-slate-800 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
              >
                Register New
              </button>
              <button
                onClick={() => setActiveTab("existing")}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === "existing" ? "bg-white dark:bg-slate-800 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
              >
                Existing Workforce
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === "register" && (
        <div
          className="
border border-slate-200 dark:border-slate-700

p-4
mb-4

bg-gray-100 dark:bg-slate-900

shadow-md dark:shadow-none

rounded
"
        >
          {/* Two fields per row */}
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newEmployee.name}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, name: e.target.value })
                }
                className="
border border-slate-300 dark:border-slate-600 dark:border-slate-600

p-2
w-full
rounded

bg-white dark:bg-slate-800 dark:bg-slate-800

text-slate-800 dark:text-slate-100

outline-none
focus:ring-2
focus:ring-indigo-500
"
              />
            </div>

            <div>
              <label className="block">Emp Code <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newEmployee.emp_code}
                onChange={(e) =>
                  setNewEmployee({ ...newEmployee, emp_code: e.target.value })
                }
                className="
border border-slate-300 dark:border-slate-600 dark:border-slate-600

p-2
w-full
rounded

bg-white dark:bg-slate-800 dark:bg-slate-800

text-slate-800 dark:text-slate-100

outline-none
focus:ring-2
focus:ring-indigo-500
"
              />
            </div>

            <div>
              <label className="block">Aadhar No <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newEmployee.aadhar_no}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                  setNewEmployee({ ...newEmployee, aadhar_no: val });
                }}
                className="
border border-slate-300 dark:border-slate-600 dark:border-slate-600

p-2
w-full
rounded

bg-white dark:bg-slate-800 dark:bg-slate-800

text-slate-800 dark:text-slate-100

outline-none
focus:ring-2
focus:ring-indigo-500
"
                maxLength={12}
                placeholder="12-digit Aadhar number"
              />
            </div>

            <div>
              <label className="block">Aadhar Card Upload <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="file"
                  className="
border border-slate-300 dark:border-slate-600 dark:border-slate-600

p-1.5
w-full
rounded
text-sm

bg-white dark:bg-slate-800 dark:bg-slate-800

text-slate-600 dark:text-slate-300 dark:text-slate-200

file:border-0
file:bg-transparent
file:text-sm
file:font-medium
file:text-indigo-600
dark:file:text-indigo-400

hover:file:text-indigo-700

cursor-pointer
"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setAadharCardFile(e.target.files[0] || null)}
                />
                <UploadCloud className="absolute right-3 top-2 text-slate-400 pointer-events-none" size={18} />
              </div>
              {aadharCardFile && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">✓ {aadharCardFile.name}</p>
              )}
            </div>

            <div>
              <label className="block">Phone <span className="text-red-500">*</span></label>
              <div className="flex">
                <span className="
inline-flex items-center
px-3
rounded-l

border border-r-0
border-gray-300 dark:border-slate-600

bg-gray-50 dark:bg-slate-800 dark:bg-slate-800

text-gray-500 dark:text-slate-300

sm:text-sm
">
                  +91
                </span>
                <input
                  type="text"
                  value={newEmployee.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setNewEmployee({ ...newEmployee, phone: val });
                  }}
                  className="border p-2 w-full rounded-r"
                  maxLength={10}
                  placeholder="10-digit number"
                />
              </div>
            </div>

            <div>
              <label className="block">City <span className="text-red-500">*</span></label>
              <select
                value={newEmployee.city}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    city: e.target.value,
                    zone: "",
                    ward_id: "",
                  })
                }
                className="
p-2

border border-slate-300 dark:border-slate-600 dark:border-slate-600

rounded
w-full

bg-white dark:bg-slate-800 dark:bg-slate-800

text-slate-800 dark:text-slate-100

outline-none
focus:ring-2
focus:ring-indigo-500
"
                disabled={singleCityMode}
              >
                <option value="" disabled>
                  Select City
                </option>
                {cities.map((city) => {
                  const cityId = getCityId(city);
                  if (!cityId) return null;
                  return (
                    <option key={cityId} value={cityId}>
                      {getCityName(city) || `City ${cityId}`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block">Zone <span className="text-red-500">*</span></label>
              <select
                value={newEmployee.zone}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    zone: e.target.value,
                    ward_id: "",
                    kothi_id: "",
                  })
                }
                className="
p-2

border border-slate-300 dark:border-slate-600 dark:border-slate-600

rounded
w-full

bg-white dark:bg-slate-800 dark:bg-slate-800

text-slate-800 dark:text-slate-100

outline-none
focus:ring-2
focus:ring-indigo-500
"
                disabled={!newEmployee.city}
              >
                <option value="" disabled>
                  Select Zone
                </option>
                {zones
                  .filter((zone) => matchesId(getZoneCityId(zone), newEmployee.city))
                  .map((zone) => {
                    const zoneId = getZoneId(zone);
                    if (!zoneId) return null;
                    return (
                      <option key={zoneId} value={zoneId}>
                        {getZoneName(zone) || `Zone ${zoneId}`}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div>
              <label className="block">Ward <span className="text-red-500">*</span></label>
              <select
                value={newEmployee.ward_id}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    ward_id: e.target.value,
                    kothi_id: "",
                  })
                }
                className="
p-2

border border-slate-300 dark:border-slate-600 dark:border-slate-600

rounded
w-full

bg-white dark:bg-slate-800 dark:bg-slate-800

text-slate-800 dark:text-slate-100

outline-none
focus:ring-2
focus:ring-indigo-500
"
                disabled={!newEmployee.zone}
              >
                <option value="" disabled>
                  Select Ward
                </option>
                {sectors
                  .filter((s) => matchesId(s.zone_id, newEmployee.zone))
                  .map((s) => {
                    if (!s.sector_id) return null;
                    return (
                      <option key={s.sector_id} value={s.sector_id}>
                        {s.sector_name || `Ward ${s.sector_id}`}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div>
              <label className="block">Kothi <span className="text-red-500">*</span></label>
              <select
                value={newEmployee.kothi_id}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    kothi_id: e.target.value,
                  })
                }
                className="
p-2

border border-slate-300 dark:border-slate-600 dark:border-slate-600

rounded
w-full

bg-white dark:bg-slate-800 dark:bg-slate-800

text-slate-800 dark:text-slate-100

outline-none
focus:ring-2
focus:ring-indigo-500
"
                disabled={!newEmployee.ward_id}
              >
                <option value="" disabled>
                  Select Kothi
                </option>
                {(() => {
                  const selectedSector = sectors.find((s) =>
                    matchesId(s.sector_id, newEmployee.ward_id)
                  );
                  return (selectedSector?.kothis || []).map((kothi) => {
                    const kid = normalizeId(kothi.wardId || kothi.ward_id);
                    return (
                      <option key={kid} value={kid}>
                        {kothi.wardName || kothi.ward_name}
                      </option>
                    );
                  });
                })()}
              </select>
            </div>

            <div>
              <label className="block">Department <span className="text-red-500">*</span></label>
              <select
                value={newEmployee.department}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    department: e.target.value,
                    designation_id: "",
                  })
                }
                className="
p-2

border border-slate-300 dark:border-slate-600 dark:border-slate-600

rounded
w-full

bg-white dark:bg-slate-800 dark:bg-slate-800

text-slate-800 dark:text-slate-100

outline-none
focus:ring-2
focus:ring-indigo-500
"
              >
                <option value="" disabled>
                  Select Department
                </option>
                {departments.map((department) => {
                  const departmentId = getDepartmentId(department);
                  if (!departmentId) return null;
                  return (
                    <option key={departmentId} value={departmentId}>
                      {getDepartmentName(department) || `Department ${departmentId}`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block">Designation <span className="text-red-500">*</span></label>
              <select
                value={newEmployee.designation_id}
                onChange={(e) =>
                  setNewEmployee({
                    ...newEmployee,
                    designation_id: e.target.value,
                  })
                }
                className="
p-2

border border-slate-300 dark:border-slate-600 dark:border-slate-600

rounded
w-full

bg-white dark:bg-slate-800 dark:bg-slate-800

text-slate-800 dark:text-slate-100

outline-none
focus:ring-2
focus:ring-indigo-500
"
                disabled={!newEmployee.department}
              >
                <option value="" disabled>
                  Select Designation
                </option>
                {designations
                  .filter((designation) =>
                    matchesId(
                      getDesignationDepartmentId(designation),
                      newEmployee.department
                    )
                  )
                  .map((designation) => {
                    const designationId = getDesignationId(designation);
                    if (!designationId) return null;
                    return (
                      <option key={designationId} value={designationId}>
                        {getDesignationName(designation) || `Designation ${designationId}`}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          <button
            onClick={addOrUpdateEmployee}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow font-bold hover:bg-blue-700 transition-colors mt-4 mr-4"
          >
            {isEditing ? (
              "Update Employee"
            ) : (
              <span className="inline-flex items-center gap-2">
                <PlusCircle size={18} /> Add Employee
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={resetLabel}
            className="bg-slate-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-600 transition-colors"
          >
            {isEditing ? "Cancel Edit" : "Reset"}
          </button>

          {isEditing && editingAssignments.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                <UsersRound size={20} className="text-indigo-600" />
                Current Assignments (Work Locations)
              </h3>
              <p className="text-xs text-slate-500 mb-4 italic">
                This employee has multiple assignments. Select one to modify its location or add a new one.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {editingAssignments.map((assignment, index) => (
                  <div
                    key={assignment.emp_id}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 ${newEmployee.emp_id === assignment.emp_id
                      ? "border-indigo-500 bg-indigo-50/30 shadow-sm"
                      : "border-slate-100 bg-white dark:bg-slate-800 hover:border-slate-300 dark:border-slate-600"
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-bold text-slate-700">
                        Assignment #{index + 1} <span className="text-[10px] font-normal text-slate-400">(ID: {assignment.emp_id})</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setNewEmployee({
                              ...newEmployee,
                              emp_id: assignment.emp_id,
                              city: assignment.city_id,
                              zone: assignment.zone_id,
                              ward_id: assignment.sector_id,
                              kothi_id: assignment.kothi_id
                            });
                          }}
                          className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${newEmployee.emp_id === assignment.emp_id
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                            }`}
                        >
                          {newEmployee.emp_id === assignment.emp_id ? "Active" : "Edit This"}
                        </button>
                        <button
                          onClick={() => deleteEmployee(assignment.emp_id)}
                          className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded hover:bg-rose-100 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-1">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">{assignment.city}</span>
                      <span className="px-1 text-slate-300">/</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">{assignment.zone}</span>
                      <span className="px-1 text-slate-300">/</span>
                      <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">{assignment.ward}</span>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => {
                    setNewEmployee({
                      ...newEmployee,
                      emp_id: "",
                      city: "",
                      zone: "",
                      ward_id: "",
                      kothi_id: ""
                    });
                    setIsEditing(null); // Temporarily switch off editing mode to "Register" a new one with same code
                    setTimeout(() => setIsEditing(true), 10); // But stay in this tab/context
                  }}
                  className="p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 flex flex-col items-center justify-center gap-1 group"
                >
                  <PlusCircle size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold uppercase tracking-wider">Add New Kothi Assignment</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {activeTab === "existing" && (
        <>
          <div className="flex flex-col gap-3 mb-4 mt-2">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-1/3">
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="
w-full
px-4
py-2
pl-10

border border-slate-300 dark:border-slate-600 dark:border-slate-600

rounded-lg

bg-white dark:bg-slate-800 dark:bg-slate-800

text-slate-800 dark:text-slate-100

focus:outline-none
focus:ring-2
focus:ring-indigo-500
focus:border-indigo-500

transition-all
text-sm
"
                />
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3 top-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-gray-800  bg-slate-100 px-3 py-1.5 rounded-md shadow-sm border border-slate-200 flex items-center gap-2">
                <UsersRound size={16} /> Total Employee: {totalEmployees}
              </div>
            </div>

            <div className={`grid gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 ${isSupervisor ? "grid-cols-2 md:grid-cols-6" : "grid-cols-2 md:grid-cols-7"}`}>
              {/* City filter — hidden for supervisor */}
              {!isSupervisor && (
                <select
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-800"
                  value={selectedCityFilter}
                  onChange={e => {
                    setSelectedCityFilter(e.target.value);
                    setSelectedZoneFilter("");
                    setSelectedWardFilter("");
                    setSelectedKothiFilter("");
                    setSelectedDeptFilter("");
                    setSelectedDesigFilter("");
                  }}
                  disabled={!cityScopeAll && cities.length === 1}
                >
                  <option value="">All Cities</option>
                  {cities.map(c => <option key={c.city_id || c.cityId} value={c.city_name || c.city}>{c.city_name || c.city}</option>)}
                </select>
              )}
              <select
                className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-800"
                value={selectedZoneFilter}
                onChange={e => {
                  setSelectedZoneFilter(e.target.value);
                  setSelectedWardFilter("");
                  setSelectedKothiFilter("");
                }}
              >
                <option value="">All Zones</option>
                {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
              <select
                className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-800"
                value={selectedWardFilter}
                onChange={e => {
                  setSelectedWardFilter(e.target.value);
                  setSelectedKothiFilter("");
                }}
              >
                <option value="">All Wards</option>
                {uniqueWards.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              {/* Kothi filter — visible for both admin and supervisor */}
              <select
                className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-800"
                value={selectedKothiFilter}
                onChange={e => setSelectedKothiFilter(e.target.value)}
              >
                <option value="">All Kothi</option>
                {uniqueKothis.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <select
                className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-800"
                value={selectedDeptFilter}
                onChange={e => {
                  setSelectedDeptFilter(e.target.value);
                  setSelectedDesigFilter("");
                }}
              >
                <option value="">All Departments</option>
                {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select
                className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-800"
                value={selectedDesigFilter}
                onChange={e => setSelectedDesigFilter(e.target.value)}
              >
                <option value="">All Designations</option>
                {uniqueDesigs.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button
                onClick={async () => {
                  setIsManualReloading(true);
                  try {
                    await fetchEmployees();
                  } finally {
                    setIsManualReloading(false);
                  }
                }}
                className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-bold transition-all shadow-md shadow-indigo-100 active:scale-95 h-full hover:bg-indigo-700 uppercase tracking-widest"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Show Results
              </button>
              <button
                onClick={handleResetFilters}
                className="flex items-center justify-center gap-2

bg-white dark:bg-slate-800

border border-slate-300 dark:border-slate-600

hover:border-indigo-400
dark:hover:border-indigo-500

hover:text-indigo-600
dark:hover:text-indigo-400

text-slate-600 dark:text-slate-300 dark:text-slate-200

px-4 py-2
rounded-md
text-sm
font-semibold
transition-all
shadow-sm dark:shadow-none
active:scale-95
h-full"
                title="Reset Filters"
              >
                <Filter size={16} />
                Reset
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-green-700"
              >
                <Download size={16} />
                Excel
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-red-700"
              >
                <Download size={16} />
                PDF
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-blue-700"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>
          {/* Employee Table */}
          <div className="responsive-table-wrapper overflow-x-auto rounded-lg">
          <table
            className="
w-full

bg-white dark:bg-slate-900

shadow-md dark:shadow-none

rounded-lg

border border-slate-200 dark:border-slate-700
"
          >            <thead>
              <tr className="bg-gray-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm">      <th className="p-3 text-left">Sr No</th>          <th className="p-3 text-left">Emp Code</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Aadhar No</th>
                <th className="p-3 text-left text-indigo-700">Supervisor</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">City</th>
                <th className="p-3 text-left">Zone</th>
                <th className="p-3 text-left">Ward</th>
                <th className="p-3 text-left">Kothi</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Designation</th>
                <th className="p-3 text-center">Document (Aadhar)</th>
                <th className="p-3 text-center">Face</th>
                {!isSupervisor && <th className="p-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedEmployees.map((emp, index) => (
                <tr key={emp.emp_id} className="
border-b
border-slate-200 dark:border-slate-700

hover:bg-slate-50 dark:hover:bg-slate-800/50

transition-colors
text-sm

text-slate-700 dark:text-slate-200
">
                  <td className="p-3 font-semibold">
                    {startIndex + index + 1}
                  </td>
                  <td className="p-3 font-medium text-slate-900 dark:text-slate-100">{emp.emp_code}</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{emp.name}</td>
                  <td className="p-3 font-mono text-slate-600 dark:text-slate-300 text-xs">{emp.aadhar_no || "—"}</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                    {(() => {
                      const wardNames = Array.from(emp.wards || []);
                      const supervisors = new Set();
                      wardNames.forEach(w => {
                        const sList = supervisorMap[String(w).trim().toLowerCase()];
                        if (sList) sList.forEach(s => supervisors.add(s));
                      });
                      return supervisors.size > 0
                        ? Array.from(supervisors).join(", ")
                        : <span className="text-slate-400 italic text-xs">Unassigned</span>;
                    })()}
                  </td>
                  <td className="p-3">{emp.phone}</td>
                  <td className="p-3">{emp.city_display || emp.city || "Unknown"}</td>
                  <td className="p-3">{emp.zone_display || emp.zone || "Unknown"}</td>
                  <td className="p-3">{kothiToSectorMap[(emp.ward || '').toLowerCase()] || emp.ward_display || "—"}</td>
                  <td className="p-3">{emp.ward_display || emp.ward || "—"}</td>
                  <td className="p-3">{emp.department_display || emp.department || "Unknown"}</td>
                  <td className="p-3">{emp.designation || "Unknown"}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center">
                      {emp.aadhar_url || emp.aadhar ? (
                        <button
                          onClick={() => handleViewAadhar(emp)}
                          className="flex items-center justify-center gap-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-semibold w-24"
                          title="View Aadhar"
                        >
                          <Eye size={15} strokeWidth={2.5} /> <span>View</span>
                        </button>
                      ) : isSupervisor ? (
                        <span className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-1 text-xs font-bold border bg-slate-50 text-slate-500 border-slate-200 w-24">
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => editEmployee(emp)}
                          className="flex items-center justify-center gap-1.5 bg-violet-50 text-violet-600 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-semibold w-24"
                          title="Upload Aadhar"
                        >
                          <UploadCloud size={15} strokeWidth={2.5} /> <span>Upload</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold border ${emp.face_registered || emp.faceRegistered || emp.face_embedding
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}
                      >
                        {emp.face_registered || emp.faceRegistered || emp.face_embedding
                          ? "Registered"
                          : "Pending"}
                      </span>
                      <button
                        onClick={() => handleViewFace(emp)}
                        disabled={
                          !(emp.face_registered || emp.faceRegistered || emp.face_embedding)
                        }
                        className="flex items-center justify-center gap-1.5 bg-sky-50 text-sky-600 hover:not(:disabled):bg-sky-500 hover:not(:disabled):text-white px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium border border-sky-200 hover:not(:disabled):border-sky-500 shadow-[0_1px_2px_rgba(0,0,0,0.05)] disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:shadow-none disabled:cursor-not-allowed"
                        title="View Face"
                      >
                        <Eye size={15} strokeWidth={2.5} /> <span className="hidden xl:inline">View</span>
                      </button>
                    </div>
                  </td>
                  {!isSupervisor && (
                    <td className="p-3">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <button
                          onClick={() => editEmployee(emp)}
                          className="flex items-center justify-center gap-1.5 w-full bg-amber-500 text-white hover:bg-amber-600 px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-semibold shadow-sm"
                          title="Edit Employee"
                        >
                          <Pencil size={15} strokeWidth={2.5} /> <span className="hidden xl:inline">Edit</span>
                        </button>
                        <button
                          onClick={() => deleteEmployee(emp.emp_id)}
                          className="flex items-center justify-center gap-1.5 w-full bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white px-3 py-1.5 rounded-lg transition-all duration-200 text-sm font-medium border border-rose-200 hover:border-rose-500 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                          title="Delete Employee"
                        >
                          <Trash2 size={15} strokeWidth={2.5} /> <span className="hidden xl:inline">Delete</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="
px-3 py-1

border border-slate-300 dark:border-slate-600

rounded

bg-white dark:bg-slate-800

text-slate-700 dark:text-slate-200

disabled:opacity-50
"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-600">
              Showing {showingFrom}-{showingTo} of {totalEmployees} employees
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {Math.min(currentPage, totalPages)} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || totalEmployees === 0}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {facePreview.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="
w-full
max-w-lg

rounded-lg

bg-white dark:bg-slate-900

shadow-xl

border border-slate-200 dark:border-slate-700
">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-sm text-gray-500">Face preview</div>
                <div className="text-lg font-semibold">
                  {facePreview.employee?.name || "Employee"}
                </div>
              </div>
              <button
                type="button"
                onClick={closeFacePreview}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {facePreview.loading ? (
                <div className="py-10 text-center text-gray-600">
                  Loading face...
                </div>
              ) : facePreview.error ? (
                <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {facePreview.error}
                </div>
              ) : facePreview.face?.imageUrl ? (
                <div className="flex flex-col gap-3">
                  <img
                    src={facePreview.face.imageUrl}
                    alt={`${facePreview.employee?.name || "Employee"} face`}
                    className="max-h-96 w-full rounded object-contain bg-gray-100"
                  />
                  <div className="text-sm text-gray-600">
                    {facePreview.employee?.emp_code && (
                      <div>
                        Emp Code:{" "}
                        <span className="font-semibold">
                          {facePreview.employee.emp_code}
                        </span>
                      </div>
                    )}
                    {Number.isFinite(
                      Number(facePreview.face.confidence)
                    ) && (
                        <div>
                          Confidence:{" "}
                          <span className="font-semibold">
                            {Number(facePreview.face.confidence).toFixed(1)}%
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-gray-600">
                  No face image available.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              {facePreview.face?.imageUrl && (
                <a
                  href={facePreview.face.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-blue-500 px-4 py-2 text-blue-600"
                >
                  Open Image
                </a>
              )}
              <button
                type="button"
                onClick={closeFacePreview}
                className="rounded bg-gray-800 px-4 py-2 text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Aadhar Preview Modal */}
      {aadharPreview.visible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="
bg-white dark:bg-slate-900

rounded-2xl
shadow-2xl

w-full
max-w-4xl
max-h-[90vh]

flex flex-col
overflow-hidden

border border-slate-200 dark:border-slate-700
">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 dark:bg-slate-800">
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                Aadhar Document - {aadharPreview.name}
              </h3>
              <div className="flex items-center gap-3">
                <a
                  href={`${aadharPreview.url}?download=1`}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all text-sm font-semibold shadow-sm"
                  title="Download Document"
                >
                  <Download size={18} />
                  Download
                </a>
                <button
                  onClick={closeAadharPreview}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-gray-100 overflow-auto flex items-center justify-center p-4 min-h-[60vh]">
              {aadharPreview.loading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-600 font-medium">Loading document...</p>
                </div>
              ) : aadharPreview.type?.startsWith("image/") ? (
                <img
                  src={aadharPreview.url}
                  alt="Aadhar Preview"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg bg-white dark:bg-slate-800"
                />
              ) : (
                <iframe
                  src={aadharPreview.url}
                  className="w-full h-full min-h-[60vh] rounded-lg border shadow-inner bg-white dark:bg-slate-800"
                  title="Aadhar Viewer"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Employees;
