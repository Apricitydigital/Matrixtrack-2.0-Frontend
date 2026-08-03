import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Download, Calendar, Search, UserCheck, Filter, X, ChevronDown, Loader2 } from "lucide-react";
import { API_BASE_URL, ALLOWED_CITIES_ENDPOINT } from "../config";
import Loader from "../components/Loader";
import { useAuth } from "../AuthContext";

const apiUrl = API_BASE_URL; // API_BASE_URL already includes '/api' from config.js

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

const normalizeId = (value) => (value === undefined || value === null ? null : value);

const matchesId = (row, keys, selected) => {
  if (!selected || selected === "all") return true;
  const selectedStr = String(selected);
  return keys.some((key) => row[key] !== undefined && String(row[key]) === selectedStr);
};

const matchesCity = (row, selectedCityId, cities) => {
  if (!selectedCityId || selectedCityId === "all") return true;
  if (matchesId(row, ["city_id", "cityId"], selectedCityId)) {
    return true;
  }
  const selectedCity = cities.find((c) => String(c.city_id) === String(selectedCityId));
  const selectedName = selectedCity?.city_name?.toLowerCase?.();
  const rowName = (row.city_name || row.city || "").toString().toLowerCase();
  if (selectedName && rowName && rowName === selectedName) {
    return true;
  }
  return false;
};

const SupervisorAttendanceAudit = () => {
  const { logPageView } = useAuth();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (logPageView) logPageView("Supervisor Attendance Audit", "/supervisor-audit");
  }, [logPageView]);
  const [isManualReloading, setIsManualReloading] = useState(false);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState(getTodayInIST());
  const [endDate, setEndDate] = useState(getTodayInIST());
  const [searchTerm, setSearchTerm] = useState("");

  // Filter options
  const [cities, setCities] = useState([]);
  const [allZones, setAllZones] = useState([]);
  const [allSectors, setAllSectors] = useState([]);
  const [allWards, setAllWards] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // ✅ STEP 1: State for mapped supervisor IDs (city-assigned only)
  const [mappedSupervisorIds, setMappedSupervisorIds] = useState(new Set());

  // Selected filters
  const [selectedCityId, setSelectedCityId] = useState("all");
  const [selectedZoneId, setSelectedZoneId] = useState("all");
  const [selectedSectorId, setSelectedSectorId] = useState("all");
  const [selectedWardId, setSelectedWardId] = useState("all");

  // Load filter metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const config = buildRequestConfig();

        // ✅ STEP 2: city-wise-supervisors added to Promise.all
        const [citiesRes, zonesRes, sectorsRes, wardsRes, supervisorsRes, assignmentsRes, cityWiseRes] = await Promise.all([
          axios.get(ALLOWED_CITIES_ENDPOINT, config),
          axios.get(`${apiUrl}/zones`, config),
          axios.get(`${apiUrl}/sectors`, config),
          axios.get(`${apiUrl}/wards`, config),
          axios.get(`${apiUrl}/supervisor`, config),
          axios.get(`${apiUrl}/assignedWardRoutes`, config),
          axios.get(`${apiUrl}/supervisor/city-wise-supervisors`, config), // ✅ new
        ]);

        const cityData = citiesRes.data || {};
        const normalizedCities = (Array.isArray(cityData.cities) ? cityData.cities : (Array.isArray(cityData) ? cityData : []))
          .map((c) => ({
            city_id: normalizeId(c.city_id ?? c.cityId ?? c.id),
            city_name: c.city_name ?? c.cityName ?? c.name ?? "City",
          }))
          .filter((c) => c.city_id !== null);
        setCities(normalizedCities);

        const normalizedZones = (zonesRes.data || []).map((z) => ({
          zone_id: normalizeId(z.zone_id ?? z.zoneId ?? z.id),
          zone_name: z.zone_name ?? z.zoneName ?? z.name ?? "Zone",
          city_id: normalizeId(z.city_id ?? z.cityId ?? z.city),
        })).filter((z) => z.zone_id !== null);
        setAllZones(normalizedZones);

        const flatSectors = (sectorsRes.data || []).flatMap((city) =>
          city.zones.flatMap((zone) =>
            zone.sectors.map((s) => ({
              sector_id: normalizeId(s.sector_id ?? s.sectorId ?? s.id),
              sector_name: s.sector_name ?? s.sectorName ?? s.name ?? "Ward",
              zone_id: normalizeId(zone.zone_id ?? zone.zoneId ?? zone.id),
              city_id: normalizeId(city.city_id ?? city.cityId ?? city.id),
            }))
          )
        );
        setAllSectors(flatSectors);

        const flatWards = (wardsRes.data || []).flatMap(city =>
          city.zones.flatMap(zone =>
            zone.wards.map(ward => ({
              ward_id: normalizeId(ward.ward_id ?? ward.wardId ?? ward.id),
              ward_name: ward.ward_name ?? ward.wardName ?? ward.name ?? "Kothi",
              sector_id: normalizeId(ward.sector_id ?? ward.sectorId ?? ward.sector),
              zone_id: normalizeId(zone.zone_id ?? zone.zoneId ?? zone.id),
              city_id: normalizeId(city.city_id ?? city.cityId ?? city.id)
            }))
          )
        );
        setAllWards(flatWards);

        setSupervisors(Array.isArray(supervisorsRes.data) ? supervisorsRes.data : []);

        const normalizedAssignments = (assignmentsRes.data || []).map((a) => ({
          supervisor_id: normalizeId(a.supervisor_id ?? a.user_id ?? a.id),
          ward_id: normalizeId(a.ward_id ?? a.wardId),
          zone_id: normalizeId(a.zone_id ?? a.zoneId),
          city_id: normalizeId(a.city_id ?? a.cityId),
        })).filter((a) => a.supervisor_id !== null);
        setAssignments(normalizedAssignments);

        // ✅ STEP 3: Extract user_ids from city-wise response and store in state
        // This must be INSIDE loadMetadata so cityWiseRes is in scope
        const cityWiseRows = Array.isArray(cityWiseRes.data)
          ? cityWiseRes.data
          : cityWiseRes.data?.rows || [];
        setMappedSupervisorIds(new Set(cityWiseRows.map(r => String(r.user_id))));

      } catch (err) {
        console.error("Error loading filter metadata:", err);
      }
    };
    loadMetadata();
  }, []);

  // Cascading logic
  const filteredZones = useMemo(() => {
    if (selectedCityId === "all") return [];
    return allZones.filter(z => String(z.city_id) === String(selectedCityId));
  }, [allZones, selectedCityId]);

  const filteredSectors = useMemo(() => {
    if (selectedZoneId === "all") return [];
    return allSectors.filter(s => String(s.zone_id) === String(selectedZoneId));
  }, [allSectors, selectedZoneId]);

  const filteredWards = useMemo(() => {
    if (selectedSectorId === "all") return [];
    return allWards.filter(w => String(w.sector_id) === String(selectedSectorId));
  }, [allWards, selectedSectorId]);

  // Reset dependent filters
  useEffect(() => { setSelectedZoneId("all"); }, [selectedCityId]);
  useEffect(() => { setSelectedSectorId("all"); }, [selectedZoneId]);
  useEffect(() => { setSelectedWardId("all"); }, [selectedSectorId]);

  const fetchData = async (isManual = false) => {
    if (isManual) setIsManualReloading(true);
    setIsLoading(true);
    setError("");
    try {
      const params = { startDate, endDate };
      const response = await axios.get(`${apiUrl}/supervisor-audit`, {
        ...buildRequestConfig(),
        params,
      });
      setData(response.data || []);
    } catch (err) {
      console.error("Error fetching supervisor audit:", err);
      setError(err?.response?.data?.error || "Failed to load audit data.");
    } finally {
      setIsLoading(false);
      setIsManualReloading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedCityId, selectedZoneId, selectedSectorId, selectedWardId]);

  // Merge audit data with supervisor roster
  const filteredData = useMemo(() => {
    const auditBySup = new Map();
    data.forEach((row) => {
      const supId =
        row?.supervisor_id ?? row?.supervisorId ?? row?.user_id ?? row?.userId ?? row?.id ?? null;
      const phone = (row?.supervisor_phone ?? row?.phone ?? row?.mobile ?? "").toString();
      const key = supId !== null ? `id-${supId}` : phone ? `phone-${phone}` : null;
      if (key) {
        if (auditBySup.has(key)) {
          const existing = auditBySup.get(key);
          existing.total_punch_in = (parseInt(existing.total_punch_in) || 0) + (parseInt(row.total_punch_in) || 0);
          existing.total_punch_out = (parseInt(existing.total_punch_out) || 0) + (parseInt(row.total_punch_out) || 0);
        } else {
          auditBySup.set(key, { ...row });
        }
      }
    });

    const wardById = new Map(allWards.map((w) => [String(w.ward_id), w]));
    const zoneById = new Map(allZones.map((z) => [String(z.zone_id), z]));
    const cityById = new Map(cities.map((c) => [String(c.city_id), c]));

    const supervisorIdsInScope = new Set(
      assignments
        .filter((a) => matchesId(a, ["city_id"], selectedCityId))
        .filter((a) => matchesId(a, ["zone_id"], selectedZoneId))
.filter((a) => {
  if (selectedWardId !== "all") {
    return matchesId(a, ["ward_id"], selectedWardId);
  }

  if (selectedSectorId !== "all") {
    const ward = allWards.find(
      (w) => String(w.ward_id) === String(a.ward_id)
    );

    return (
      ward &&
      String(ward.sector_id) === String(selectedSectorId)
    );
  }

  return true;
})        .map((a) => String(a.supervisor_id))
    );

    // ✅ STEP 4: Filter supervisors — only city-mapped ones
    const supList = supervisors.filter((s) => {
      // Exclude any supervisor not mapped to a city
      if (!mappedSupervisorIds.has(String(s.user_id))) return false;

      // If no location filters active, show all mapped supervisors
      if (selectedCityId === "all" && selectedZoneId === "all" && selectedSectorId === "all" && selectedWardId === "all") {
        return true;
      }
      return supervisorIdsInScope.has(String(s.user_id));
    });

    const rows = supList.map((sup) => {
      const assign = assignments.find((a) => String(a.supervisor_id) === String(sup.user_id));
      const ward = assign?.ward_id ? wardById.get(String(assign.ward_id)) : null;
      const zone = assign?.zone_id ? zoneById.get(String(assign.zone_id)) : (ward ? zoneById.get(String(ward.zone_id)) : null);
      const city = assign?.city_id ? cityById.get(String(assign.city_id)) : (ward ? cityById.get(String(ward.city_id)) : null);

      const auditKeyId = `id-${sup.user_id}`;
      const auditKeyPhone = sup.phone ? `phone-${sup.phone}` : null;
      const auditRow = auditBySup.get(auditKeyId) || (auditKeyPhone ? auditBySup.get(auditKeyPhone) : null) || {};

      return {
        supervisor_id: sup.user_id,
        supervisor_name: sup.name || sup.fullName || sup.full_name || "Supervisor",
        supervisor_phone: sup.phone || sup.mobile || "-",
        city_name: auditRow.city_name || auditRow.city || city?.city_name || city?.name || "",
        zone_name: auditRow.zone_name || zone?.zone_name || zone?.name || "",
        ward_name: auditRow.ward_name || ward?.ward_name || "",
        kothi_name: auditRow.kothi_name || auditRow.ward_name || ward?.ward_name || "",
        total_punch_in: auditRow.total_punch_in ?? auditRow.punch_in ?? 0,
        total_punch_out: auditRow.total_punch_out ?? auditRow.punch_out ?? 0,
      };
    });

    let result = rows;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((row) =>
        ["city_name", "zone_name", "ward_name", "kothi_name", "supervisor_name", "supervisor_phone"].some(
          (key) => String(row[key] || "").toLowerCase().includes(lower)
        )
      );
    }

    return result;

    // ✅ STEP 5: mappedSupervisorIds added to dependency array
  }, [data, supervisors, assignments, allWards, allZones, cities, selectedCityId, selectedZoneId, selectedSectorId, selectedWardId, searchTerm, mappedSupervisorIds]);

  const handleDownloadCsv = () => {
    if (!filteredData.length) return;
    const headers = [
      "S.No.", "City", "Zone", "Ward", "Kothi",
      "Supervisor Name", "Mobile No", "Total Punch In", "Total Punch Out",
    ];
    const rows = filteredData.map((row, idx) => [
      idx + 1,
      row.city_name || "-",
      row.zone_name || "-",
      row.ward_name || "-",
      row.kothi_name || "-",
      row.supervisor_name || "-",
      row.supervisor_phone || "-",
      row.total_punch_in || 0,
      row.total_punch_out || 0,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `supervisor_audit_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-slate-800 dark:text-slate-100">
      {isManualReloading && <Loader />}
      {/* Header section */}
      <div className="bg-white
dark:bg-slate-900

rounded-2xl

shadow-sm
dark:shadow-none

border
border-slate-200
dark:border-slate-700

p-6
 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
            <UserCheck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Supervisor Attendance Audit</h1>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-black bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                {filteredData.length} Total
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm">Review attendance-taking activity of supervisors</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={isLoading}
            className={`px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium ${isLoading ? 'opacity-80 cursor-not-allowed' : ''}`}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button
            onClick={handleDownloadCsv}
            disabled={!filteredData.length}
            className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition flex items-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            <Download size={18} />
            CSV Export
          </button>
        </div>
      </div>

      {/* Primary Filters (Location Dropdowns) */}
      <div className="
bg-white
dark:bg-slate-900

rounded-2xl

shadow-sm
dark:shadow-none

border
border-slate-200
dark:border-slate-700

p-5
">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* City Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">City</label>
            <div className="relative">
              <select
                className="w-full pl-3 pr-10 py-2.5 dark:bg-slate-800 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm font-medium"
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value)}
              >
                <option
  value="all"
  className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
>
  All Cities
</option>
                {cities.map(c => <option key={c.city_id} value={c.city_id}>{c.city_name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Zone Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Zone</label>
            <div className="relative">
              <select
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm font-medium disabled:opacity-50"
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                disabled={selectedCityId === "all"}
              >
                <option value="all">All Zones</option>
                {filteredZones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Ward (Sector) Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Ward</label>
            <div className="relative">
              <select
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm font-medium disabled:opacity-50"
                value={selectedSectorId}
                onChange={(e) => setSelectedSectorId(e.target.value)}
                disabled={selectedZoneId === "all"}
              >
                <option value="all">All Wards</option>
                {filteredSectors.map(s => <option key={s.sector_id} value={s.sector_id}>{s.sector_name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Kothi (Ward) Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">Kothi</label>
            <div className="relative">
              <select
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm font-medium disabled:opacity-50"
                value={selectedWardId}
                onChange={(e) => setSelectedWardId(e.target.value)}
                disabled={selectedSectorId === "all"}
              >
                <option value="all">All Kothis</option>
                {filteredWards.map(w => <option key={w.ward_id} value={w.ward_id}>{w.ward_name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        {/* Secondary Controls (Search, Dates & Reset) */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 mt-2">
          <div className="flex-1 min-w-[280px] relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by supervisor name or mobile..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtered count pill — sits between search and date pickers */}
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-4 py-2 rounded-xl whitespace-nowrap">
            <UserCheck size={15} className="text-indigo-500" />
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Showing:
            </span>
            <span className="text-sm font-black text-indigo-800">{filteredData.length}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl">
              <Calendar size={16} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">From</span>
              <input
                type="date"
                className="bg-transparent text-sm font-medium outline-none text-slate-700"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl">
              <Calendar size={16} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">To</span>
              <input
                type="date"
                className="bg-transparent text-sm font-medium outline-none text-slate-700"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                setSelectedCityId("all");
                setSelectedZoneId("all");
                setSelectedSectorId("all");
                setSelectedWardId("all");
                setStartDate(getTodayInIST());
                setEndDate(getTodayInIST());
                setSearchTerm("");
              }}
              className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition text-sm font-bold flex items-center gap-2 border border-slate-200"
            >
              <Filter size={14} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium animate-pulse">Fetching audit records...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-full mb-4">
              <X size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Error loading data</h3>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">{error}</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-20 text-center">
            <div className="inline-flex p-4 bg-slate-50 text-slate-400 dark:text-slate-500 rounded-full mb-4">
              <UserCheck size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No records found</h3>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-500">No supervisor activity recorded for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table
  className="
w-full
min-w-[1000px]

border-collapse

overflow-hidden

rounded-2xl

bg-white
dark:bg-slate-900
"
>
  <thead>
    <tr
      className="
bg-slate-50/80
dark:bg-slate-800/80

border-b
border-slate-200
dark:border-slate-700
"
    >
      <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center w-12">
        S.No.
      </th>

      <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        City
      </th>

      <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Zone
      </th>

      <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider max-w-[200px]">
        Ward
      </th>

      <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider max-w-[200px]">
        Kothi
      </th>

      <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Supervisor Name
      </th>

      <th className="px-4 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
        Mobile No
      </th>

      <th className="px-4 py-3 text-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
        Punch Activity
      </th>
    </tr>
  </thead>

  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
    {filteredData.map((row, idx) => (
      <tr
        key={idx}
        className={`
transition-all
duration-200

hover:bg-slate-50/70
dark:hover:bg-slate-800/70

${
  idx % 2 === 0
    ? "bg-white dark:bg-slate-900"
    : "bg-slate-50/40 dark:bg-slate-800/30"
}
`}
      >
        {/* S.NO */}
        <td className="px-4 py-4 text-sm font-semibold text-slate-400 dark:text-slate-500 text-center">
          {idx + 1}
        </td>

        {/* CITY */}
        <td className="px-4 py-4">
          <div className="font-bold text-slate-800 dark:text-white text-sm">
            {row.city_name || "N/A"}
          </div>
        </td>

        {/* ZONE */}
        <td className="px-4 py-4">
          <span
            className="
inline-flex
items-center

px-2.5
py-1

rounded-lg

bg-indigo-50
dark:bg-indigo-500/15

border
border-indigo-100
dark:border-indigo-500/20

text-indigo-700
dark:text-indigo-400

text-xs
font-bold
"
          >
            {row.zone_name || "N/A"}
          </span>
        </td>

        {/* WARD */}
        <td className="px-4 py-4 max-w-[200px]">
          <div className="text-sm text-slate-700 dark:text-slate-300 break-words leading-relaxed">
            {row.ward_name || "N/A"}
          </div>
        </td>

        {/* KOTHI */}
        <td className="px-4 py-4 max-w-[200px]">
          <div
            className="
inline-flex

px-2.5
py-1

rounded-lg

bg-slate-100
dark:bg-slate-700/50

text-slate-600
dark:text-slate-300

text-xs
font-semibold

break-words
"
          >
            {row.kothi_name || "N/A"}
          </div>
        </td>

        {/* SUPERVISOR */}
        <td className="px-4 py-4 max-w-[160px]">
          <div className="text-sm font-bold text-slate-900 dark:text-white break-words">
            {row.supervisor_name || "N/A"}
          </div>
        </td>

        {/* MOBILE */}
        <td className="px-4 py-4 whitespace-nowrap">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {row.supervisor_phone || "No Mobile"}
          </span>
        </td>

        {/* PUNCH ACTIVITY */}
        <td className="px-4 py-4">
          <div className="flex items-center justify-center gap-2">
            {/* IN */}
            <div
              className="
min-w-[72px]

rounded-xl

px-3
py-2

bg-emerald-50
dark:bg-emerald-500/15

border
border-emerald-100
dark:border-emerald-500/20

text-center
"
            >
              <div className="text-emerald-700 dark:text-emerald-400 font-black text-lg leading-none">
                {row.total_punch_in || 0}
              </div>

              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                Punch In
              </div>
            </div>

            {/* OUT */}
            <div
              className="
min-w-[72px]

rounded-xl

px-3
py-2

bg-amber-50
dark:bg-amber-500/15

border
border-amber-100
dark:border-amber-500/20

text-center
"
            >
              <div className="text-amber-700 dark:text-amber-400 font-black text-lg leading-none">
                {row.total_punch_out || 0}
              </div>

              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-600/70 dark:text-amber-400/70 mt-1">
                Punch Out
              </div>
            </div>
          </div>
        </td>
      </tr>
    ))}
  </tbody>
</table>
          </div>
        )}
<div
  className="
bg-slate-900

px-6
py-4

border-t
border-slate-700

flex
items-center
justify-between
"
>          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
            Showing {filteredData.length} records
          </p>
          <div className="text-xs text-slate-400 dark:text-slate-500 italic">
            This report summarizes the activity of supervisors in their assigned locations
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorAttendanceAudit;