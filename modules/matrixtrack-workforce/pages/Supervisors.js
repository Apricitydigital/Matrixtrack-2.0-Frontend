import React, { useState, useEffect, useMemo, useCallback , useRef} from "react";
import axios from "axios";
import { API_BASE_URL, ALLOWED_CITIES_ENDPOINT } from "../config";
import Swal from "sweetalert2";
import { useSearch } from "../SearchContext";
import { matchesSearchTerm } from "../utils/search";
import { useAuth } from "../AuthContext";
import { Filter, Search, RefreshCw, MapPin, Users, User, Shield, Building2, ChevronDown, ChevronUp, Check, FileText, X, Camera, Image as ImageIcon, Key, Info, ChevronLeft, ChevronRight } from "lucide-react";
import Loader from "../components/Loader";

const ExpandableListCell = ({ value, label, textClass = "text-slate-600", emptyText = "N/A", emptyClass = "text-slate-300" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  if (!value) return <span className={emptyClass}>{emptyText}</span>;

  // Split values by comma and trim
  const items = value.split(",").map(item => item.trim()).filter(Boolean);
  if (items.length === 0) return <span className={emptyClass}>{emptyText}</span>;

  // If only 1 item, just render it simply
  if (items.length === 1) {
    return <span className={textClass}>{items[0]}</span>;
  }

  // If multiple items, show the first item and a badge "+ X more"
  const firstItem = items[0];
  const moreCount = items.length - 1;

  const filteredItems = items.filter(item => 
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative inline-flex items-center gap-1.5 flex-wrap">
      <span className={textClass}>{firstItem}</span>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 hover:bg-indigo-100 transition-colors uppercase cursor-pointer whitespace-nowrap"
      >
        +{moreCount} more
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                Assigned {label} ({items.length})
              </h3>
              <button
                type="button"
                onClick={() => { setIsOpen(false); setSearchQuery(""); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Input if there are many items */}
            {items.length > 5 && (
              <div className="px-6 pt-4">
                <input
                  type="text"
                  placeholder={`Search ${label}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {/* Modal Content */}
            <div className="p-6 max-h-[300px] overflow-y-auto space-y-2">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 text-sm font-semibold bg-slate-50 dark:bg-slate-800/50 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800"
                  >
                    {item}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No matching {label.toLowerCase()} found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const apiUrl = API_BASE_URL;
const buildRequestConfig = (extraHeaders = {}) => {
  if (typeof window === "undefined") {
    return { withCredentials: true, headers: { ...extraHeaders } };
  }
  const token = window.localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return { withCredentials: true, headers: { ...headers, ...extraHeaders } };
};

const dataURLtoFile = (dataurl, filename) => {
  let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

const compressImage = (file, quality = 0.7, maxWidth = 1200, maxHeight = 1200) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return resolve(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          const ext = file.name.split('.').pop().toLowerCase();
          const newName = ['png', 'webp', 'jpg', 'jpeg'].includes(ext) ? file.name.replace(/\.[^/.]+$/, ".jpg") : `${file.name}.jpg`;
          resolve(new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

function Supervisors() {
  const { user, logPageView } = useAuth();
  const isSupervisor = user?.role === "supervisor";

  useEffect(() => {
    if (logPageView) logPageView("Supervisors Management", "/supervisors");
  }, [logPageView]);
  const [supervisors, setSupervisors] = useState([]);
  const aadharFileRef = useRef(null);
  const [formData, setFormData] = useState({
    user_id: "",
    name: "",
    emp_code: "",
    email: "",
    phone: "",
    role: "supervisor",
    password: "",
    confirmPassword: "",
    aadhar_number: "",
    aadhar_file: null,
    reg_city_id: "",
    reg_zone_id: "",
    reg_sector_id: "",
    reg_ward_id: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [isEditing, setIsEditing] = useState(null);
  
  // Registration Flow states
  const [regStep, setRegStep] = useState(1); // 1: Identity, 2: Location, 3: Photo, 4: Password
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);


  const [changePassword, setChangePassword] = useState(false);
  const { normalizedQuery } = useSearch();

  const [activeTab, setActiveTab] = useState("management"); // "management" | "distribution"
  const [showSupSummary, setShowSupSummary] = useState(true);
  const [expandedDept, setExpandedDept] = useState(null);

  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("");
  const [wfFilterCity, setWfFilterCity] = useState("");
  const [wfFilterZone, setWfFilterZone] = useState("");
  const [wfFilterWard, setWfFilterWard] = useState("");
  const [wfFilterKothi, setWfFilterKothi] = useState("");
  const [selectedCityFilter, setSelectedCityFilter] = useState("");

  const [cityScopeAll, setCityScopeAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supervisorCityCount, setSupervisorCityCount] = useState(0);
  const [isManualReloading, setIsManualReloading] = useState(false);

  // City-wise supervisor details for Existing Workforce tab
  const [cityWiseSupervisors, setCityWiseSupervisors] = useState([]);
  const [cityWiseLoading, setCityWiseLoading] = useState(false);
  const [cityWiseSearch, setCityWiseSearch] = useState("");
  const [expandedCity, setExpandedCity] = useState(null);

  const uniqueRoles = useMemo(() => [...new Set(supervisors.map(s => s.role).filter(Boolean))], [supervisors]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // States for distribution logic
  const [cities, setCities] = useState([]);
  const [zones, setZones] = useState([]);
  const [wards, setWards] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState("ALL");

  // Per-city zone/ward/kothi filters
  const [cityFilters, setCityFilters] = useState({});
  // shape: { [cityName]: { zone: "", ward: "", kothi: "" } }

  const getCityFilter = (cityName) =>
    cityFilters[cityName] || { zone: "", ward: "", kothi: "" };

  const setCityFilter = (cityName, key, value) => {
    setCityFilters(prev => ({
      ...prev,
      [cityName]: {
        ...(prev[cityName] || { zone: "", ward: "", kothi: "" }),
        [key]: value,
        // reset downstream filters
        ...(key === "zone" ? { ward: "", kothi: "" } : {}),
        ...(key === "ward" ? { kothi: "" } : {}),
      },
    }));
  };

  const flattenWardResponse = (payload) => {
    if (!Array.isArray(payload)) return [];
    return payload.flatMap((city) => {
      const zonesForCity = city.zones || [];
      return zonesForCity.flatMap((zone) => {
        const wardsForZone = zone.wards || [];
        return wardsForZone.map((ward) => ({
          ward_id: ward.wardId,
          ward_name: ward.wardName,
          sector_id: ward.sectorId || null,
          zone_id: zone.zoneId,
          zone_name: zone.zone,
          city_id: city.cityId,
          city_name: city.city,
        }));
      });
    });
  };

  const resolveSupervisorCity = useCallback((sup) => {
    const rawCity = sup.city_name || sup.cityName || sup.city;
    if (rawCity && typeof rawCity === "string" && rawCity.toUpperCase() !== "N/A" && rawCity.trim() !== "" && rawCity !== "null") {
      return rawCity;
    }
    const assign = assignments.find(a => String(a.supervisor_id) === String(sup.user_id));
    if (assign) {
      const ward = wards.find(w => String(w.ward_id) === String(assign.ward_id));
      if (ward && (ward.city_name || ward.city)) return ward.city_name || ward.city;
    }
    return "N/A";
  }, [assignments, wards]);

  const uniqueCities = useMemo(() => {
    const cityList = supervisors.map(s => resolveSupervisorCity(s)).filter(c => c && c !== "N/A");
    return [...new Set(cityList)];
  }, [supervisors, resolveSupervisorCity]);

  const fetchAllData = useCallback(async (isManual = false) => {
    if (isManual) setIsManualReloading(true);
    setLoading(true);
    try {
      await Promise.all([
        fetchSupervisor(),
        fetchDistributionData(),
      ]);
    } finally {
      setLoading(false);
      setIsManualReloading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    const storedCity = localStorage.getItem("dashboardSelectedCity");
    if (storedCity) {
      setSelectedCityId(storedCity);
      fetchSupervisorCityCount(storedCity);
    } else {
      fetchSupervisorCityCount("ALL");
    }
  }, []);

  useEffect(() => {
    if (selectedCityId) {
      fetchSupervisorCityCount(selectedCityId);
    }
  }, [selectedCityId]);

  // Fetch city-wise supervisors when distribution tab is activated
  useEffect(() => {
    if (activeTab === "distribution") {
      fetchCityWiseSupervisors();
      fetchSupervisorCityCount(selectedCityId);
    }
  }, [activeTab, selectedCityId]);

  const fetchCityWiseSupervisors = async () => {
    setCityWiseLoading(true);
    try {
      const config = buildRequestConfig();
      const response = await axios.get(
        `${apiUrl}/supervisor/city-wise-supervisors`,
        config  // no params — backend uses cityScope middleware
      );
      setCityWiseSupervisors(
        Array.isArray(response.data)
          ? response.data
          : response.data.rows || []
      );
    } catch (error) {
      console.error("Error fetching city-wise supervisor details", error);
    } finally {
      setCityWiseLoading(false);
    }
  };

  const fetchDistributionData = async () => {
    try {
      const config = buildRequestConfig();
      const results = await Promise.allSettled([
        axios.get(ALLOWED_CITIES_ENDPOINT, config),
        axios.get(`${apiUrl}/zones`, config),
        axios.get(`${apiUrl}/wards`, config),
        axios.get(`${apiUrl}/sectors`, config),
        axios.get(`${apiUrl}/employees`, config),
        axios.get(`${apiUrl}/assignedWardRoutes`, config),
      ]);

      const [citiesRes, zonesRes, wardsRes, sectorsRes, employeesRes, assignmentsRes] = results;

      if (citiesRes.status === "fulfilled") {
        const cityPayload = citiesRes.value.data || {};
        if (cityPayload.all) setCityScopeAll(true);
        const cityList = Array.isArray(cityPayload.cities) ? cityPayload.cities : Array.isArray(cityPayload) ? cityPayload : [];
        setCities(cityList);
      }

      if (zonesRes.status === "fulfilled") setZones(zonesRes.value.data || []);
      if (wardsRes.status === "fulfilled") setWards(flattenWardResponse(wardsRes.value.data));
      
      if (sectorsRes.status === "fulfilled") {
        const flatSectors = (sectorsRes.value.data || []).flatMap((city) =>
          (city.zones || []).flatMap((zone) =>
            (zone.sectors || []).map((s) => ({
              sector_id: s.sectorId,
              sector_name: s.sectorName,
              zone_id: zone.zoneId,
              city_id: city.cityId,
            }))
          )
        );
        setSectors(flatSectors);
      }

      if (employeesRes.status === "fulfilled") setEmployees(employeesRes.value.data || []);
      
      if (assignmentsRes.status === "fulfilled") {
        setAssignments((assignmentsRes.value.data || []).map((a) => ({
          supervisor_id: String(a.user_id),
          ward_id: String(a.ward_id),
        })));
      }

    } catch (error) {
      console.error("Error fetching distribution data", error);
    }
  };

  const deptSupervisorSummary = useMemo(() => {
    if (!supervisors.length || !employees.length) return { rows: [], totalUnique: 0, multiDeptSups: [], unassignedSups: [], linkedSupIds: new Set() };

    let scopedSupervisors = supervisors;
    let scopedEmployees = employees;
    let scopedAssignments = assignments;

    if (selectedCityFilter) {
      scopedSupervisors = supervisors.filter(s => resolveSupervisorCity(s) === selectedCityFilter);
      scopedEmployees = employees.filter(e => (e.city || "").toLowerCase() === selectedCityFilter.toLowerCase());

      const cityWards = wards.filter(w => (w.city_name || w.city || "").toLowerCase() === selectedCityFilter.toLowerCase()).map(w => String(w.ward_id));
      scopedAssignments = assignments.filter(a => cityWards.includes(String(a.ward_id)));
    }

    const wardNameToSupIds = new Map();
    scopedAssignments.forEach(a => {
      const ward = wards.find(w => String(w.ward_id) === String(a.ward_id));
      if (!ward) return;
      const key = ward.ward_name.toLowerCase();
      if (!wardNameToSupIds.has(key)) wardNameToSupIds.set(key, new Set());
      wardNameToSupIds.get(key).add(String(a.supervisor_id));
    });

    const deptMap = new Map();
    scopedEmployees.forEach(e => {
      const deptName = (e.department || "").trim();
      if (!deptName) return;
      const wardName = (e.ward || "").toLowerCase();
      if (!wardName) return;
      const supIds = wardNameToSupIds.get(wardName);
      if (!supIds) return;
      if (!deptMap.has(deptName)) deptMap.set(deptName, new Set());
      supIds.forEach(id => deptMap.get(deptName).add(id));
    });

    const supIdToWards = new Map();
    scopedAssignments.forEach(a => {
      const ward = wards.find(w => String(w.ward_id) === String(a.ward_id));
      if (!ward) return;
      const supId = String(a.supervisor_id);
      if (!supIdToWards.has(supId)) supIdToWards.set(supId, []);
      supIdToWards.get(supId).push(ward.ward_name);
    });

    const rows = Array.from(deptMap.entries())
      .map(([deptName, supIdSet]) => ({
        deptName,
        supervisorCount: supIdSet.size,
        supervisorIds: [...supIdSet],
        supervisorDetails: [...supIdSet]
          .map(id => {
            const sup = scopedSupervisors.find(s => String(s.user_id) === id);
            return {
              id,
              name: sup?.name || `Supervisor #${id}`,
              emp_code: sup?.emp_code || "",
              wards: [...new Set(supIdToWards.get(id) || [])],
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.deptName.localeCompare(b.deptName));

    const allSupIds = new Map();
    rows.forEach(row => {
      row.supervisorIds.forEach(id => {
        if (!allSupIds.has(id)) allSupIds.set(id, []);
        allSupIds.get(id).push(row.deptName);
      });
    });

    const multiDeptSups = [...allSupIds.entries()]
      .filter(([, depts]) => depts.length > 1)
      .map(([id, depts]) => {
        const sup = scopedSupervisors.find(s => String(s.user_id) === id);
        return { id, name: sup?.name || `Supervisor #${id}`, depts };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const linkedSupIds = new Set(allSupIds.keys());
    const unassignedSups = scopedSupervisors.filter(s => !linkedSupIds.has(String(s.user_id)));

    return { rows, totalUnique: allSupIds.size, multiDeptSups, unassignedSups, linkedSupIds };
  }, [supervisors, employees, assignments, wards, selectedCityFilter, resolveSupervisorCity]);

  const fetchSupervisor = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/supervisor`,
        buildRequestConfig()  // no params — backend scopes automatically
      );
      setSupervisors(response.data);
    } catch (error) {
      console.error("Error fetching user's data", error);
      alert("Failed to fetch supervisors. Please try again.");
    }
  };

  const fetchSupervisorCityCount = async (cityId = null) => {
    try {
      const response = await axios.get(
        `${apiUrl}/supervisor/city-wise-count`,
        {
          ...buildRequestConfig(),
          params: cityId && cityId !== "ALL"
            ? { cityId }
            : {}
        }
      );

      const allCitiesRow = response.data.find(
        (item) => item.city_name === "All Cities"
      );

      if (allCitiesRow) {
        // ROLLUP grand total — globally deduped COUNT(DISTINCT), always correct
        setSupervisorCityCount(Number(allCitiesRow.supervisor_count));
      } else if (response.data.length > 0) {
        // Specific city selected — single row, use it directly (no summing)
        setSupervisorCityCount(Number(response.data[0].supervisor_count || 0));
      } else {
        setSupervisorCityCount(0);
      }
    } catch (error) {
      console.error("Error fetching supervisor city count", error);
    }
  };

  const uniqueSupervisorCount = useMemo(() =>
    new Set(cityWiseSupervisors.map(r => String(r.user_id))).size,
    [cityWiseSupervisors]
  );

  const filteredSupervisors = useMemo(() => {
    let result = supervisors;
    if (normalizedQuery) {
      result = result.filter((sup) =>
        matchesSearchTerm(
          {
            name: sup.name,
            empCode: sup.emp_code,
            email: sup.email,
            phone: sup.phone,
            role: sup.role,
          },
          normalizedQuery
        )
      );
    }

    if (selectedRoleFilter) result = result.filter(s => s.role === selectedRoleFilter);
    
    // Workforce Location Filters
    if (wfFilterCity) result = result.filter(s => resolveSupervisorCity(s) === wfFilterCity);
    if (wfFilterZone) result = result.filter(s => s.zone_name === wfFilterZone);
    if (wfFilterWard) result = result.filter(s => s.ward_group === wfFilterWard);
    if (wfFilterKothi) result = result.filter(s => s.kothi_name === wfFilterKothi);

    if (localSearchQuery) {
      const lowerQuery = localSearchQuery.toLowerCase();
      result = result.filter((sup) => {
        const values = [
          sup.name,
          sup.emp_code,
          sup.email,
          sup.phone,
          sup.role,
          resolveSupervisorCity(sup),
          sup.zone_name,
          sup.ward_group,
          sup.kothi_name
        ];
        return values.some((val) => String(val || "").toLowerCase().includes(lowerQuery));
      });
    }
    return result.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: 'base' }));
  }, [supervisors, normalizedQuery, localSearchQuery, selectedRoleFilter, selectedCityFilter, resolveSupervisorCity, wfFilterCity, wfFilterZone, wfFilterWard, wfFilterKothi]);

  const mappedSupervisorIds = useMemo(() =>
    new Set(cityWiseSupervisors.map(r => String(r.user_id))),
    [cityWiseSupervisors]
  );

  // Workforce filter options generated from supervisors data
  const workforceOptions = useMemo(() => {
    const zones = new Set();
    const wardsSet = new Set();
    const kothis = new Set();

    supervisors.forEach(s => {
      const city = resolveSupervisorCity(s);
      if (!wfFilterCity || city === wfFilterCity) {
        if (s.zone_name) zones.add(s.zone_name);
        if (!wfFilterZone || s.zone_name === wfFilterZone) {
          if (s.ward_group) wardsSet.add(s.ward_group);
          if (!wfFilterWard || s.ward_group === wfFilterWard) {
            if (s.kothi_name) kothis.add(s.kothi_name);
          }
        }
      }
    });

    return {
      zones: [...zones].sort(),
      wards: [...wardsSet].sort(),
      kothis: [...kothis].sort(),
    };
  }, [supervisors, wfFilterCity, wfFilterZone, wfFilterWard, resolveSupervisorCity]);

  const distributionTabSupervisors = useMemo(() => {
    // Show ALL supervisors in the workforce tab, including those not yet assigned to any city
    return filteredSupervisors;
  }, [filteredSupervisors]);

  const visibleSupervisors = useMemo(() => {
    if (!isSupervisor) return filteredSupervisors;
    const linkedIds = deptSupervisorSummary.linkedSupIds;
    if (!linkedIds) return [];
    return filteredSupervisors.filter(s => linkedIds.has(String(s.user_id)));
  }, [filteredSupervisors, isSupervisor, deptSupervisorSummary.linkedSupIds]);

  // City-wise supervisors grouped by city for the distribution table
  const groupedCityWise = useMemo(() => {
    const filtered = cityWiseSupervisors.filter(row => {
      if (!cityWiseSearch) return true;
      const q = cityWiseSearch.toLowerCase();
      return (
        (row.supervisor_name || "").toLowerCase().includes(q) ||
        (row.city_name || "").toLowerCase().includes(q) ||
        (row.zones || "").toLowerCase().includes(q) ||
        (row.kothis || "").toLowerCase().includes(q) ||
        (row.email || "").toLowerCase().includes(q) ||
        (row.phone || "").toLowerCase().includes(q)
      );
    });

    const map = new Map();
    filtered.forEach(row => {
      const city = row.city_name || "Unknown City";
      if (!map.has(city)) map.set(city, []);
      map.get(city).push(row);
    });

    // Apply per-city zone/ward/kothi filters
    const result = new Map();
    for (const [cityName, rows] of map.entries()) {
      const f = getCityFilter(cityName);
      const filteredRows = rows.filter(row => {
        const rowZones = (row.zones || "").split(",").map(z => z.trim()).filter(Boolean);
        const rowKothis = (row.kothis || "").split(",").map(k => k.trim()).filter(Boolean);
        if (f.zone && !rowZones.some(z => z.toLowerCase() === f.zone.toLowerCase())) return false;
        if (f.kothi && !rowKothis.some(k => k.toLowerCase() === f.kothi.toLowerCase())) return false;
        return true;
      });
      result.set(cityName, filteredRows);
    }

    return Array.from(result.entries())
      .sort(([a], [b]) => a.localeCompare(b));
  }, [cityWiseSupervisors, cityWiseSearch, cityFilters]);

  // Build unique zones/kothis per city from the raw (unfiltered) data
  const cityFilterOptions = useMemo(() => {
    const map = {};
    cityWiseSupervisors.forEach(row => {
      const city = row.city_name || "Unknown City";
      if (!map[city]) map[city] = { zones: new Set(), kothis: new Set() };
      (row.zones || "").split(",").map(z => z.trim()).filter(Boolean).forEach(z => map[city].zones.add(z));
      (row.kothis || "").split(",").map(k => k.trim()).filter(Boolean).forEach(k => map[city].kothis.add(k));
    });
    // Convert sets to sorted arrays
    const result = {};
    for (const city in map) {
      result[city] = {
        zones: [...map[city].zones].sort(),
        kothis: [...map[city].kothis].sort(),
      };
    }
    return result;
  }, [cityWiseSupervisors]);

  // When a zone filter is active, scope the kothi options to that zone only
  const getFilteredKothiOptions = (cityName) => {
    const f = getCityFilter(cityName);
    if (!f.zone) return cityFilterOptions[cityName]?.kothis || [];
    // only show kothis belonging to supervisors in the selected zone
    return [...new Set(
      cityWiseSupervisors
        .filter(row =>
          (row.city_name || "") === cityName &&
          (row.zones || "").split(",").map(z => z.trim()).includes(f.zone)
        )
        .flatMap(row => (row.kothis || "").split(",").map(k => k.trim()).filter(Boolean))
    )].sort();
  };

  const totalCityWiseSupervisors = supervisorCityCount;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // eslint-disable-next-line no-unused-vars
  const currentItems = visibleSupervisors.slice(indexOfFirstItem, indexOfLastItem);
  // eslint-disable-next-line no-unused-vars
  const totalPages = Math.ceil(visibleSupervisors.length / itemsPerPage);
  const distCurrentItems = distributionTabSupervisors.slice(indexOfFirstItem, indexOfLastItem);
  const distTotalPages = Math.ceil(distributionTabSupervisors.length / itemsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedQuery, localSearchQuery]);

  const handleResetFilters = () => {
    setLocalSearchQuery("");
    setSelectedRoleFilter("");
    setSelectedCityFilter(cityScopeAll ? "" : (cities.length === 1 ? cities[0].city_name : ""));
  };

  const handleInputChange = async (e) => {
    const { name, value, files } = e.target;
    if (name === "aadhar_file") {
      const file = files[0];
      if (file) {
        try {
          const processedFile = await compressImage(file, 0.7);
          setFormData((prev) => ({ ...prev, [name]: processedFile }));
        } catch (err) {
          console.warn("Compression failed, using original", err);
          setFormData((prev) => ({ ...prev, [name]: file }));
        }
      } else {
        setFormData((prev) => ({ ...prev, [name]: null }));
      }
    } else {
      if (name === "reg_city_id") setFormData(prev => ({ ...prev, reg_zone_id: "", reg_sector_id: "", reg_ward_id: "" }));
      if (name === "reg_zone_id") setFormData(prev => ({ ...prev, reg_sector_id: "", reg_ward_id: "" }));
      if (name === "reg_sector_id") setFormData(prev => ({ ...prev, reg_ward_id: "" }));

      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };
 
  // Camera Functions
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      Swal.fire("Error", "Could not access camera. Please check permissions.", "error");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    console.log("[Camera] Capture requested...");
    if (videoRef.current && canvasRef.current) {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Ensure video is playing and has dimensions
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.warn("[Camera] Video dimensions are 0. Waiting for metadata...");
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get data URL
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        console.log("[Camera] Photo captured successfully. Data URL length:", dataUrl.length);
        
        setCapturedPhoto(dataUrl);
        stopCamera();
        
        // Visual feedback
        Swal.fire({
          icon: 'success',
          title: 'Photo Captured',
          timer: 800,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      } catch (err) {
        console.error("[Camera] Capture failed:", err);
        Swal.fire("Error", "Failed to capture photo. Please try again.", "error");
      }
    } else {
      console.error("[Camera] Video or Canvas ref is missing!");
    }
  };

  const goToNextStep = async () => {
    const errors = validateCurrentStep();
    
    if (Object.keys(errors).length > 0) {
      // Check if ALL mandatory fields for this step are missing
      let allMissing = false;
      if (regStep === 1) {
        const step1Fields = ['name', 'emp_code', 'email', 'phone'];
        allMissing = step1Fields.every(f => !formData[f] || (typeof formData[f] === 'string' && !formData[f].trim()));
      } else if (regStep === 2) {
        allMissing = !formData.reg_city_id && !formData.reg_zone_id && !formData.reg_sector_id && !formData.reg_ward_id;
      } else if (regStep === 3) {
        allMissing = !capturedPhoto;
      } else if (regStep === 4) {
        allMissing = !formData.password || !formData.confirmPassword;
      }

      if (allMissing) {
        Swal.fire({
          icon: 'warning',
          title: 'Empty Form',
          text: 'Please fill in all the required details before proceeding.',
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
        // Still set errors but maybe the user wants them hidden if all missing?
        // Let's hide them if all missing so it's not "red red" everywhere as requested.
        setFormErrors({}); 
        return;
      }

      setFormErrors(errors);
      return;
    }

    // Early duplicate check for Step 1
    if (regStep === 1) {
      try {
        const config = buildRequestConfig({ "Content-Type": "application/json" });
        const checkRes = await axios.post(`${apiUrl}/auth/check-duplicate`, {
          email: formData.email.trim().toLowerCase(),
          emp_code: formData.emp_code.trim(),
          phone: formData.phone.trim(),
          aadhar_number: formData.aadhar_number?.trim() || undefined,
        }, config);

        const { emailExists, empCodeExists, phoneExists, aadharExists } = checkRes.data;
        const dupErrors = {};
        if (emailExists) dupErrors.email = "Email already registered";
        if (empCodeExists) dupErrors.emp_code = "Employee code already in use";
        if (phoneExists) dupErrors.phone = "Phone number already registered";
        if (aadharExists) dupErrors.aadhar_number = "Aadhaar number already in use";

        if (Object.keys(dupErrors).length > 0) {
          setFormErrors(dupErrors);
          return;
        }
      } catch (err) {
        console.error("Duplicate check failed", err);
        setFormErrors({ general: "Connection error. Unable to verify credentials. Please try again." });
        return;
      }
    }

    setFormErrors({});
    setRegStep(prev => prev + 1);
  };



  const goToPrevStep = () => {
    setRegStep(prev => prev - 1);
  };

  const validateCurrentStep = () => {
    const errors = {};
    if (regStep === 1) { // Identity
      if (!formData.name.trim()) errors.name = "Full name is required";
      if (!formData.emp_code.trim()) errors.emp_code = "Employee code is required";
      if (!formData.phone.trim()) errors.phone = "Phone number is required";
      else if (!/^\d{10}$/.test(formData.phone.trim())) errors.phone = "Phone must be 10 digits";
      if (formData.aadhar_number && !/^\d{12}$/.test(formData.aadhar_number.trim())) errors.aadhar_number = "Aadhar must be 12 digits";
    } else if (regStep === 2) { // Location
      if (!formData.reg_city_id) errors.reg_city_id = "City is required";
      if (!formData.reg_zone_id) errors.reg_zone_id = "Zone is required";
      if (!formData.reg_sector_id) errors.reg_sector_id = "Ward is required";
      if (!formData.reg_ward_id) errors.reg_ward_id = "Kothi is required";
    } else if (regStep === 3 && !isEditing) { // Photo (New Only)
      if (!capturedPhoto) {
        errors.photo = "Photo is mandatory";
      }
    }
    
    // Password validation (Step 4 for New OR if changePassword is true for Edit)
    if (regStep === 4 || (isEditing && changePassword)) {
      if (!formData.password) errors.password = "Password is required";
      else if (formData.password.length < 6) errors.password = "Min 6 characters";
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords mismatch";
    }




    return errors;
  };

  // Reset OTP state
  // eslint-disable-next-line no-unused-vars
  const resetOtpState = () => {
    setOtpSent(false);
    setOtpVerified(false);
    setOtpValue("");
    setOtpError("");
    setOtpSuccess("");
    setOtpCooldown(0);
  };

  const handleUpdatePassword = async (sup) => {
    const { value: formValues } = await Swal.fire({
      title: `Update password for ${sup.name}`,
      html: `
        <input id="swal-new-password" class="swal2-input" type="password" placeholder="New password" />
        <input id="swal-confirm-password" class="swal2-input" type="password" placeholder="Confirm password" />
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Update",
      preConfirm: () => {
        const password = document.getElementById("swal-new-password")?.value?.trim();
        const confirmPassword = document.getElementById("swal-confirm-password")?.value?.trim();
        if (!password) { Swal.showValidationMessage("Password is required."); return false; }
        if (password.length < 6) { Swal.showValidationMessage("Password should be at least 6 characters long."); return false; }
        if (password !== confirmPassword) { Swal.showValidationMessage("Passwords do not match."); return false; }
        return { password };
      },
    });

    if (!formValues) return;

    try {
      const requestConfig = buildRequestConfig({ "Content-Type": "application/json" });
      await axios.put(`${apiUrl}/auth/update`, {
        passChange: true,
        user_id: sup.user_id,
        name: sup.name,
        emp_code: sup.emp_code,
        email: sup.email,
        phone: sup.phone,
        role: sup.role,
        password: formValues.password,
      }, requestConfig);

      fetchSupervisor();
      Swal.fire({
        icon: "success",
        title: "Password updated",
        html: `<p>Password for <strong>${sup.name}</strong> updated successfully.</p><p><strong>New password:</strong> ${formValues.password}</p>`,
      });
    } catch (error) {
      console.error("Error updating supervisor password", error);
      Swal.fire({ icon: "error", title: "Unable to update password", text: error?.response?.data?.error || "Something went wrong." });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Full name is required";
    if (!formData.emp_code.trim()) errors.emp_code = "Employee code is required";
    else if (/\s/.test(formData.emp_code)) errors.emp_code = "Employee code must not contain spaces";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) errors.email = "Enter a valid email address (e.g. name@domain.com)";
    if (!formData.phone.trim()) errors.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(formData.phone.trim())) errors.phone = "Phone must be exactly 10 digits (no country code)";
    if (formData.aadhar_number && !/^\d{12}$/.test(formData.aadhar_number.trim())) errors.aadhar_number = "Aadhar must be exactly 12 digits";
    if (!isEditing) {
      if (!formData.password) errors.password = "Password is required";
      else if (formData.password.length < 6) errors.password = "Password must be at least 6 characters";
      if (!formData.confirmPassword) errors.confirmPassword = "Please confirm the password";
      else if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords do not match";
    } else if (changePassword) {
      if (!formData.password) errors.password = "New password is required";
      else if (formData.password.length < 6) errors.password = "Password must be at least 6 characters";
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords do not match";
    }
    return errors;
  };

  const dataURLtoFile = (dataurl, filename) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If not on the last step, go to next step
    if (regStep < 5 && !isEditing) {
      await goToNextStep();
      return;
    }

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      const requestConfig = buildRequestConfig({ "Content-Type": "application/json" });
      if (isEditing && !changePassword) {
        await axios.put(`${apiUrl}/auth/update`, { passChange: false, user_id: formData.user_id, name: formData.name, emp_code: formData.emp_code, email: formData.email, phone: formData.phone, role: formData.role }, requestConfig);
        
        // Handle photo upload during edit if captured
        if (capturedPhoto) {
          try {
            const photoFile = dataURLtoFile(capturedPhoto, `supervisor_${formData.user_id}.jpg`);
            const fd = new FormData();
            fd.append("photo", photoFile);
            const uploadConfig = buildRequestConfig();
            await axios.post(`${apiUrl}/supervisor-photo/${formData.user_id}/upload`, fd, uploadConfig);
          } catch (pErr) {
            console.error("Edit photo upload failed", pErr);
          }
        }

        fetchSupervisor();
        resetLabel();
        Swal.fire({ icon: "success", title: "Success", text: "Supervisor updated successfully.", timer: 2000, showConfirmButton: false });
      } else if (isEditing && changePassword) {
        await axios.put(`${apiUrl}/auth/update`, { passChange: true, user_id: formData.user_id, name: formData.name, emp_code: formData.emp_code, email: formData.email, phone: formData.phone, role: formData.role, password: formData.password }, requestConfig);
        
        // Handle photo upload during edit if captured
        if (capturedPhoto) {
          try {
            const photoFile = dataURLtoFile(capturedPhoto, `supervisor_${formData.user_id}.jpg`);
            const fd = new FormData();
            fd.append("photo", photoFile);
            const uploadConfig = buildRequestConfig();
            await axios.post(`${apiUrl}/supervisor-photo/${formData.user_id}/upload`, fd, uploadConfig);
          } catch (pErr) {
            console.error("Edit photo upload failed", pErr);
          }
        }

        fetchSupervisor();
        resetLabel();
        Swal.fire({ icon: "success", title: "Password Updated", html: `<p>Supervisor updated.</p><p><strong>New password:</strong> ${formData.password}</p>`, showConfirmButton: true });
      } else {
        // New registration
        Swal.fire({
          title: 'Creating Account...',
          text: 'Please wait while we set up the supervisor profile.',
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });

        const payload = {
          name: formData.name.trim(),
          emp_code: formData.emp_code.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          role: formData.role,
          password: formData.password,
          aadhar_number: formData.aadhar_number.trim() || undefined,
          ward_id: formData.reg_ward_id || undefined,
        };
        const regRes = await axios.post(`${apiUrl}/auth/register`, payload, requestConfig);
        const newUserId = regRes.data?.user?.user_id;

        if (newUserId) {
          // 1. Upload Aadhaar doc if selected
          if (formData.aadhar_file) {
            Swal.update({ title: 'Uploading Aadhaar...', text: 'Almost there...' });
            try {
              const fd = new FormData();
              fd.append("aadhar_doc", formData.aadhar_file);
              const uploadConfig = buildRequestConfig({ "Content-Type": "multipart/form-data" });
              await axios.post(`${apiUrl}/supervisor-aadhar/${newUserId}/upload`, fd, uploadConfig);
            } catch (uploadErr) {
              console.warn("Aadhaar upload failed:", uploadErr?.response?.data?.error);
            }
          }

          // 2. Upload Profile Photo if captured or uploaded
          if (capturedPhoto) {
            Swal.update({ title: 'Saving Profile Photo...', text: 'Finalizing registration...' });
            try {
              const photoFile = dataURLtoFile(capturedPhoto, `supervisor_${newUserId}.jpg`);
              const fd = new FormData();
              fd.append("photo", photoFile);
              const uploadConfig = buildRequestConfig({ "Content-Type": "multipart/form-data" });
              await axios.post(`${apiUrl}/supervisor-photo/${newUserId}/upload`, fd, uploadConfig);
            } catch (photoErr) {
              console.warn("Photo upload failed:", photoErr?.response?.data?.error);
            }
          }
        }

        fetchSupervisor();
        resetLabel();
        Swal.fire({ 
          icon: "success", 
          title: "Registration Complete", 
          text: "Supervisor account and media saved successfully.",
          confirmButtonColor: '#4f46e5'
        });
      }
    } catch (error) {
      console.error("Error saving supervisor", error);
      Swal.fire({ icon: "error", title: "Failed", text: error?.response?.data?.error || "Unable to save supervisor." });
    }
  };



  const handleEdit = (sup) => {
    setFormData({ user_id: sup.user_id || "", name: sup.name || "", emp_code: sup.emp_code || "", email: sup.email || "", phone: sup.phone || "", role: sup.role || "supervisor", password: "", confirmPassword: "", aadhar_number: "", aadhar_file: null, reg_city_id: "", reg_zone_id: "", reg_ward_id: "" });
    setFormErrors({});
    setIsEditing(true);
    setChangePassword(false);
    setActiveTab("management");
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({ title: "Are you sure?", text: "You won't be able to undo this action!", icon: "warning", showCancelButton: true, confirmButtonText: "Yes, delete it!", cancelButtonText: "Cancel" });
    if (!result.isConfirmed) return;
    try {
      await axios.delete(`${apiUrl}/supervisor/${id}`, buildRequestConfig());
      setSupervisors(supervisors.filter((sup) => sup.user_id !== id));
      fetchSupervisor();
      Swal.fire("Deleted!", "The Supervisor has been removed.", "success");
    } catch (error) {
      console.error("Error deleting supervisor", error);
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const resetLabel = () => {
    setFormData({ user_id: "", name: "", emp_code: "", email: "", phone: "", role: "supervisor", password: "", confirmPassword: "", aadhar_number: "", aadhar_file: null, reg_city_id: "", reg_zone_id: "", reg_sector_id: "", reg_ward_id: "" });
    setFormErrors({});
    if (aadharFileRef.current) aadharFileRef.current.value = "";
    setRegStep(1);
    setCapturedPhoto(null);
    stopCamera();
    setIsEditing(false);
    setChangePassword(false);
  };


  const togglePasswordChange = () => {
    setChangePassword((prev) => !prev);
    setFormData((prev) => ({ ...prev, password: "", confirmPassword: "" }));
  };

  return (
    <div className="p-5 text-slate-800 dark:text-slate-100 dark:text-slate-100">
      {isManualReloading && <Loader />}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="
flex
items-center
gap-2

text-2xl
font-bold

text-slate-800 dark:text-slate-100
dark:text-white
">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          Supervisor Management
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAllData(true)}
            disabled={loading}
            className="
flex
items-center
gap-2

bg-white
dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

hover:border-indigo-300
dark:hover:border-indigo-600

hover:text-indigo-600

text-slate-600 dark:text-slate-500 dark:text-slate-400
dark:text-slate-300

px-4
py-2

rounded-xl

text-xs
font-black

transition-all

shadow-sm
dark:shadow-none

active:scale-95

uppercase
tracking-widest
"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Reload Data"}
          </button>

          <div className="
flex
p-1

bg-slate-100/80
dark:bg-slate-800

rounded-xl

border
border-slate-200
dark:border-slate-700

shadow-inner
dark:shadow-none
">
            <button
              onClick={() => setActiveTab("management")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === "management" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"}`}
            >
              {isSupervisor ? "Supervisors" : "Register New"}
            </button>
            <button
              onClick={() => setActiveTab("distribution")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center gap-2 ${activeTab === "distribution" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"}`}
            >
              Existing Workforce
            </button>
          </div>
        </div>
      </div>

      {activeTab === "management" ? (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          {!isSupervisor ? (
            <div className="
bg-white
dark:bg-slate-900

rounded-2xl

shadow-xl
dark:shadow-slate-950/30

border
border-slate-200
dark:border-slate-700

overflow-hidden

mb-6
">
              <div className="
bg-slate-50
dark:bg-slate-800

border-b
border-slate-200
dark:border-slate-700

px-6
py-4
">
                <h2 className="
text-xl
font-bold

text-slate-800 dark:text-slate-100
dark:text-white

flex
items-center
gap-2
">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                  {isEditing ? "Modify Supervisor Profile" : "Register New Supervisor"}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                {isEditing && (
                  <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">User ID (System ID)</label>
                    <input type="text" name="id" value={formData.user_id} disabled className="border-0 bg-transparent p-0 w-full text-slate-800 dark:text-slate-100 font-bold focus:ring-0" />
                  </div>
                )}

                {/* Stepper Header (Only for registration) */}
                {!isEditing && (
                  <div className="mb-8 max-w-5xl mx-auto px-4">
                    <div className="flex items-center justify-between relative">
                      {/* Progress Line */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 z-0">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-500 ease-out" 
                          style={{ width: `${((regStep - 1) / 3) * 100}%` }}
                        />
                      </div>
                      
                      {[
                        { step: 1, label: "Identity", icon: User },
                        { step: 2, label: "Location", icon: MapPin },
                        { step: 3, label: "Face Capture", icon: Camera },
                        { step: 4, label: "Credentials", icon: Key }
                      ].map((s) => {
                        const StepIcon = s.icon;
                        const isActive = regStep >= s.step;
                        const isCurrent = regStep === s.step;
                        
                        return (
                          <div key={s.step} className="flex flex-col items-center z-10">
                            <div 
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 font-bold border-2 ${
                                isCurrent 
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg ring-4 ring-indigo-100 dark:ring-indigo-900/30 scale-110" 
                                  : isActive 
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md" 
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {isActive && regStep > s.step ? <Check size={18} /> : <StepIcon size={18} />}
                            </div>
                            <span 
                              className={`text-[11px] font-bold mt-2 uppercase tracking-wider transition-colors duration-300 ${
                                isCurrent 
                                  ? "text-indigo-600 dark:text-indigo-400 font-extrabold" 
                                  : isActive 
                                    ? "text-slate-700 dark:text-slate-300" 
                                    : "text-slate-400 dark:text-slate-500"
                              }`}
                            >
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="max-w-5xl mx-auto">
                  {/* Step 1: Identity */}
                  {(regStep === 1 || isEditing) && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <User size={20} className="text-indigo-600" />
                          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Supervisor Identity</h3>
                        </div>

                        {formErrors.general && (
                          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                            <p className="text-sm font-bold text-red-600">{formErrors.general}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Full Name" className={`w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:text-white transition-all ${formErrors.name ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`} />
                            {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Employee Code <span className="text-red-500">*</span></label>
                            <input type="text" name="emp_code" value={formData.emp_code} onChange={handleInputChange} placeholder="MT-XXXX" className={`w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:text-white transition-all ${formErrors.emp_code ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`} />
                            {formErrors.emp_code && <p className="text-red-500 text-xs mt-1">{formErrors.emp_code}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="email@example.com" className={`w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:text-white transition-all ${formErrors.email ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`} />
                            {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Mobile Number <span className="text-red-500">*</span></label>
                            <div className="flex">
                              <div className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-300 dark:border-slate-700 rounded-l-lg text-slate-500 dark:text-slate-400 text-sm font-bold">+91</div>
                              <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="10-digit #" maxLength={10} className={`w-full p-2.5 border rounded-r-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:text-white transition-all ${formErrors.phone ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`} />
                            </div>
                            {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">System Role <span className="text-red-500">*</span></label>
                            <select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:text-white">
                              <option value="supervisor">SUPERVISOR</option>
                              <option value="admin">ADMIN</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Aadhaar Number</label>
                            <input type="text" name="aadhar_number" value={formData.aadhar_number} onChange={handleInputChange} placeholder="12-digit Number" maxLength={12} className={`w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:text-white transition-all ${formErrors.aadhar_number ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`} />
                            {formErrors.aadhar_number && <p className="text-red-500 text-xs mt-1">{formErrors.aadhar_number}</p>}
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Upload Aadhaar Document</label>
                            <div className={`p-4 border-2 border-dashed rounded-lg text-center relative ${formErrors.aadhar_file ? "border-red-300 bg-red-50" : "border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                              <FileText size={24} className="mx-auto text-slate-400 mb-2" />
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Click or drag to upload (JPG, PNG, PDF)</p>
                              <input ref={aadharFileRef} type="file" name="aadhar_file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleInputChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              {formData.aadhar_file && (
                                <p className="mt-2 text-[10px] bg-green-600 text-white py-1 px-2 rounded inline-block">{formData.aadhar_file.name}</p>
                              )}
                            </div>
                            {formErrors.aadhar_file && <p className="text-red-500 text-xs mt-1">{formErrors.aadhar_file}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Location Assignment */}
                  {regStep === 2 && !isEditing && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <MapPin size={20} className="text-amber-600" />
                          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Location Assignment</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">City <span className="text-red-500">*</span></label>
                            <select name="reg_city_id" value={formData.reg_city_id} onChange={handleInputChange} className={`w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:text-white ${formErrors.reg_city_id ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}>
                              <option value="">Select City</option>
                              {cities.map(c => (<option key={c.city_id} value={c.city_id}>{c.city_name || c.city}</option>))}
                            </select>
                            {formErrors.reg_city_id && <p className="text-red-500 text-xs mt-1">{formErrors.reg_city_id}</p>}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Zone <span className="text-red-500">*</span></label>
                            <select name="reg_zone_id" value={formData.reg_zone_id} onChange={handleInputChange} disabled={!formData.reg_city_id} className={`w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/50 ${formErrors.reg_zone_id ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}>
                              <option value="">Select Zone</option>
                              {zones.filter(z => String(z.city_id) === String(formData.reg_city_id)).map(z => (<option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>))}
                            </select>
                            {formErrors.reg_zone_id && <p className="text-red-500 text-xs mt-1">{formErrors.reg_zone_id}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Ward <span className="text-red-500">*</span></label>
                            <select name="reg_sector_id" value={formData.reg_sector_id} onChange={handleInputChange} disabled={!formData.reg_zone_id} className={`w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/50 ${formErrors.reg_sector_id ? "border-red-500" : "border-slate-300"}`}>
                              <option value="">Select Ward</option>
                              {sectors.filter(s => String(s.zone_id) === String(formData.reg_zone_id)).map(s => (<option key={s.sector_id} value={s.sector_id}>{s.sector_name}</option>))}
                            </select>
                            {formErrors.reg_sector_id && <p className="text-red-500 text-xs mt-1">{formErrors.reg_sector_id}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Kothi <span className="text-red-500">*</span></label>
                            <select name="reg_ward_id" value={formData.reg_ward_id} onChange={handleInputChange} disabled={!formData.reg_sector_id} className={`w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-800/50 ${formErrors.reg_ward_id ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`}>
                              <option value="">Select Kothi</option>
                              {wards.filter(w => String(w.sector_id) === String(formData.reg_sector_id)).map(w => (<option key={w.ward_id} value={w.ward_id}>{w.ward_name}</option>))}
                            </select>
                            {formErrors.reg_ward_id && <p className="text-red-500 text-xs mt-1">{formErrors.reg_ward_id}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Photo */}
                  {regStep === 3 && !isEditing && (
                    <div className="animate-in fade-in zoom-in duration-500">
                      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-lg text-center">
                        <Camera size={48} className="mx-auto text-indigo-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Capture Photo <span className="text-red-500">*</span></h3>
                        <p className="text-sm text-slate-500 mb-8">Take a clear face photo or upload one (Mandatory)</p>

                        {capturedPhoto ? (
                          <div className="relative inline-block">
                            <img src={capturedPhoto} alt="Captured" className="w-64 h-64 object-cover rounded-xl border-4 border-slate-100 shadow-md" />
                            <button type="button" onClick={() => setCapturedPhoto(null)} className="absolute -top-3 -right-3 bg-red-600 text-white p-2 rounded-full shadow-lg">
                              <X size={16} />
                            </button>
                          </div>
                        ) : showCamera ? (
                          <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-square max-w-sm mx-auto border-4 border-slate-100">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" />
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex justify-center gap-4">
                              <button type="button" onClick={stopCamera} className="bg-white/20 p-2 rounded-lg text-white"><X size={20} /></button>
                              <button type="button" onClick={capturePhoto} className="bg-white p-3 rounded-full text-indigo-600 shadow-xl"><Camera size={24} /></button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <button type="button" onClick={startCamera} className="p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center gap-2">
                              <Camera size={32} className="text-indigo-600" />
                              <span className="text-sm font-bold">Use Camera</span>
                            </button>
                            <label className="p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-all flex flex-col items-center gap-2 cursor-pointer">
                              <ImageIcon size={32} className="text-amber-600" />
                              <span className="text-sm font-bold">Upload Photo</span>
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  try {
                                    const processedFile = await compressImage(file, 0.8);
                                    const reader = new FileReader();
                                    reader.onloadend = () => setCapturedPhoto(reader.result);
                                    reader.readAsDataURL(processedFile);
                                  } catch (err) {
                                    console.warn("Compression failed", err);
                                    const reader = new FileReader();
                                    reader.onloadend = () => setCapturedPhoto(reader.result);
                                    reader.readAsDataURL(file);
                                  }
                                }
                              }} />
                            </label>
                          </div>
                        )}
                        {formErrors.photo && <p className="text-red-500 text-xs font-bold mt-4">{formErrors.photo}</p>}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Password */}
                  {(regStep === 4 || (isEditing && changePassword)) && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-3">
                          <Key size={20} className="text-indigo-600" />
                          <h3 className="text-lg font-bold text-slate-800">Security Credentials</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Login Password <span className="text-red-500">*</span></label>
                            <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Min 6 characters" className={`w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${formErrors.password ? "border-red-500" : "border-slate-300"}`} />
                            {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder="Repeat password" className={`w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${formErrors.confirmPassword ? "border-red-500" : "border-slate-300"}`} />
                            {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                  {/* Photo Section for Edit Mode */}
                  {isEditing && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8 max-w-5xl mx-auto">
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-2 text-left">
                          <Camera size={18} className="text-indigo-600" />
                          <h3 className="text-md font-bold text-slate-800">Update Profile Photo</h3>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                          {capturedPhoto ? (
                            <div className="relative inline-block">
                              <img src={capturedPhoto} alt="Captured" className="w-40 h-40 object-cover rounded-xl border-4 border-slate-100 shadow-md" />
                              <button type="button" onClick={() => setCapturedPhoto(null)} className="absolute -top-3 -right-3 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                          ) : showCamera ? (
                            <div className="relative bg-slate-900 rounded-xl overflow-hidden w-64 h-64 border-4 border-slate-100 shadow-inner">
                              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" />
                              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex justify-center gap-4">
                                <button type="button" onClick={stopCamera} className="bg-white/20 p-2 rounded-lg text-white hover:bg-white/30"><X size={18} /></button>
                                <button type="button" onClick={capturePhoto} className="bg-white p-2.5 rounded-full text-indigo-600 shadow-xl hover:scale-110 transition-transform"><Camera size={20} /></button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-4">
                              <button type="button" onClick={startCamera} className="px-5 py-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex flex-col items-center gap-2 min-w-[140px]">
                                <Camera size={24} className="text-indigo-600" />
                                <span className="text-xs font-bold text-slate-600">Use Camera</span>
                              </button>
                              <label className="px-5 py-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-all flex flex-col items-center gap-2 cursor-pointer min-w-[140px]">
                                <ImageIcon size={24} className="text-amber-600" />
                                <span className="text-xs font-bold text-slate-600">Upload Photo</span>
                                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    try {
                                      const processedFile = await compressImage(file, 0.8);
                                      const reader = new FileReader();
                                      reader.onloadend = () => setCapturedPhoto(reader.result);
                                      reader.readAsDataURL(processedFile);
                                    } catch (err) {
                                      console.warn("Compression failed", err);
                                      const reader = new FileReader();
                                      reader.onloadend = () => setCapturedPhoto(reader.result);
                                      reader.readAsDataURL(file);
                                    }
                                  }
                                }} />
                              </label>
                            </div>
                          )}
                          <div className="text-left max-w-xs">
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">Only capture or upload if you want to replace the current profile photo with a new one. All standard formats (JPG, PNG, WebP) are supported.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-center gap-4 mt-4 pt-6 border-t border-slate-100 max-w-5xl mx-auto w-full">
                    {!isEditing && regStep > 1 && (
                      <button type="button" onClick={goToPrevStep} className="bg-slate-100 text-slate-600 px-8 py-2.5 rounded-lg font-bold hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200">
                        <ChevronLeft size={18} /> Back
                      </button>
                    )}
                    
                    <button type="submit" className="min-w-[200px] bg-indigo-600 text-white px-8 py-2.5 rounded-lg shadow-lg font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 transform hover:translate-y-[-1px] active:translate-y-[0px]">
                      {isEditing ? "Save Changes" : regStep === 4 ? "Complete Registration" : "Next Step"}
                      {regStep < 4 && !isEditing && <ChevronRight size={18} />}
                    </button>

                    {isEditing && (
                      <div className="flex gap-2">
                        <button type="button" onClick={togglePasswordChange} className="bg-amber-500 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-amber-600 transition-all flex items-center gap-2 shadow-md">
                          <Key size={18} />
                          {changePassword ? "Keep Old" : "Reset Pass"}
                        </button>
                        <button type="button" onClick={resetLabel} className="bg-slate-500 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-slate-600 transition-all shadow-md">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
              </form>



            </div>
          ) : (
            <div className="flex flex-col gap-6 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white
dark:bg-slate-900

p-4

rounded-xl

border
border-slate-200
dark:border-slate-700

shadow-sm
dark:shadow-slate-950/20">
                <div className="relative w-full md:w-1/3">
                  <input
                    type="text"
                    placeholder="Search name, emp code, email or phone..."
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    className="
w-full

px-4
py-2
pl-10

border
border-slate-300
dark:border-slate-700

rounded-lg

bg-white
dark:bg-slate-800

text-slate-800 dark:text-slate-100
dark:text-white

placeholder-slate-400
dark:placeholder-slate-500

focus:outline-none
focus:ring-2
focus:ring-indigo-500
focus:border-indigo-500

transition-all

text-sm
"
                  />
                  <svg className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 bg-slate-100 px-3 py-1.5 rounded-md shadow-sm border border-slate-200 flex items-center gap-2">
                  Total Supervisors: {supervisorCityCount}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white
dark:bg-slate-900

p-4

rounded-xl

border
border-slate-200
dark:border-slate-700

shadow-sm
dark:shadow-slate-950/20">
                <div className="w-full md:w-1/4">
<select
  className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-md

px-3
py-2

text-sm

focus:ring-2
focus:ring-indigo-500
focus:outline-none

bg-white
dark:bg-slate-800

text-slate-700
dark:text-white

h-full
"
  value={selectedRoleFilter}
  onChange={e => setSelectedRoleFilter(e.target.value)}
>                    <option value="">All Roles</option>
                    {uniqueRoles.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                  </select>
                </div>
                <button onClick={handleResetFilters} className="flex items-center justify-center gap-2 bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-600 dark:text-slate-500 dark:text-slate-400 px-4 py-2 rounded-md text-sm font-semibold transition-all shadow-sm active:scale-95 whitespace-nowrap h-[38px] md:h-auto" title="Reset Filters">
                  <Filter size={16} />
                  Reset Filters
                </button>
              </div>

              <div className="
bg-white
dark:bg-slate-900

rounded-xl

shadow-lg
dark:shadow-slate-950/30

border
border-slate-200
dark:border-slate-700

overflow-hidden
">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="
bg-slate-50/50
dark:bg-slate-800

border-b
border-slate-200
dark:border-slate-700
">
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12">S.No</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supervisor Identity</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distCurrentItems.length > 0 ? (
                        distCurrentItems.map((sup, idx) => (
                          <tr key={sup.user_id} className="
border-b
border-slate-100
dark:border-slate-700

transition-all
duration-200

hover:bg-slate-50 dark:hover:bg-slate-800/50
dark:hover:bg-slate-800/60
">
                            <td className="px-4 py-3 text-sm font-bold text-slate-500 dark:text-slate-400">{indexOfFirstItem + idx + 1}</td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900 dark:text-white">{sup.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5">ID: {sup.emp_code || "N/A"}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-semibold ${sup.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700 dark:text-slate-300'}`}>
                                {sup.role === 'admin' ? 'ADMIN' : 'SUPERVISOR'}
                              </span>
                            </td>
                            <td className="px-4 py-3"><div className="text-sm font-medium text-slate-800 dark:text-slate-100">{sup.email || "N/A"}</div></td>
                            <td className="px-4 py-3"><div className="text-sm text-slate-600 dark:text-slate-500 dark:text-slate-400 whitespace-nowrap">{sup.phone || "No contact"}</div></td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="5" className="p-3 text-center text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 font-bold italic">No supervisors matched your search.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="
p-4

bg-slate-50
dark:bg-slate-800

border-t
border-slate-100
dark:border-slate-700

flex
flex-wrap
items-center
justify-between
gap-4
">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Show</span>
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-sm

border
border-slate-200
dark:border-slate-700

rounded-md

px-2
py-1

focus:outline-none
focus:ring-2
focus:ring-indigo-500

bg-white
dark:bg-slate-900

font-bold

text-slate-700
dark:text-white

shadow-sm
dark:shadow-none">
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">entries</span>
                  </div>
                  {distTotalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className={`p-2 rounded-lg border transition-all ${currentPage === 1 ? "bg-white text-slate-200 border-slate-100 cursor-not-allowed" : "bg-white text-slate-600 dark:text-slate-500 dark:text-slate-400 border-slate-300 hover:border-indigo-500 hover:text-indigo-600 shadow-sm active:scale-95"}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                      </button>
                      <div className="bg-slate-800 text-white font-black text-xs px-4 py-2 rounded-lg min-w-[100px] text-center shadow-lg">PAGE {currentPage} / {distTotalPages}</div>
                      <button type="button" onClick={() => paginate(currentPage + 1)} disabled={currentPage >= distTotalPages} className={`p-2 rounded-lg border transition-all ${currentPage >= distTotalPages ? "bg-white text-slate-200 border-slate-100 cursor-not-allowed" : "bg-white text-slate-600 dark:text-slate-500 dark:text-slate-400 border-slate-300 hover:border-indigo-500 hover:text-indigo-600 shadow-sm active:scale-95"}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ───────────────────────────────────────────────
           EXISTING WORKFORCE TAB
        ─────────────────────────────────────────────── */
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
          {/* ── Admin-only: legacy supervisor list + Workforce Distribution summary ── */}
          {/* ── Admin-only: legacy supervisor list + Workforce Distribution summary ── */}
          {!isSupervisor && (
            <>
              {/* Row 1: Search + Total Count */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-950/20">
                <div className="relative w-full md:w-1/3">
                  <input
                    type="text"
                    placeholder="Search name, emp code, email or phone..."
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                  />
                  <svg className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-slate-600 dark:text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  Total Supervisors: {distributionTabSupervisors.length}
                </div>
              </div>

              {/* Row 2: Location Filters */}
              <div className="flex flex-col bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">City</label>
                    <select value={wfFilterCity} onChange={(e) => { setWfFilterCity(e.target.value); setWfFilterZone(""); setWfFilterWard(""); setWfFilterKothi(""); }} className="w-full bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer">
                      <option value="">All Cities</option>
                      <option value="Indore">Indore</option>
                      <option value="Pune">Pune</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Zone</label>
                    <select value={wfFilterZone} onChange={(e) => { setWfFilterZone(e.target.value); setWfFilterWard(""); setWfFilterKothi(""); }} className="w-full bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer">
                      <option value="">All Zones</option>
                      {workforceOptions.zones.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ward</label>
                    <select value={wfFilterWard} onChange={(e) => { setWfFilterWard(e.target.value); setWfFilterKothi(""); }} className="w-full bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer">
                      <option value="">All Wards</option>
                      {workforceOptions.wards.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kothi</label>
                    <select value={wfFilterKothi} onChange={(e) => setWfFilterKothi(e.target.value)} className="w-full bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer">
                      <option value="">All Kothis</option>
                      {workforceOptions.kothis.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</label>
                    <select value={selectedRoleFilter} onChange={(e) => setSelectedRoleFilter(e.target.value)} className="w-full bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer">
                      <option value="">All Roles</option>
                      {uniqueRoles.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button onClick={handleResetFilters} className="flex items-center gap-2 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                    <Filter size={14} />
                    Reset All Filters
                  </button>
                </div>
              </div>

              <div className="
bg-white
dark:bg-slate-900

rounded-xl

shadow-lg
dark:shadow-slate-950/30

border
border-slate-200
dark:border-slate-700

overflow-hidden
">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="
bg-slate-50/50
dark:bg-slate-800

border-b
border-slate-200
dark:border-slate-700
">
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-12">S.No</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supervisor Identity</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone No</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">City</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Zone</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ward Group</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kothi</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact Info</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Face Verification</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distCurrentItems.length > 0 ? (
                        distCurrentItems.map((sup, idx) => (
                          <tr key={sup.user_id} className="
border-b
border-slate-100
dark:border-slate-700

transition-all
duration-200

hover:bg-slate-50 dark:hover:bg-slate-800/50
dark:hover:bg-slate-800/60
">
                            <td className="px-4 py-3 text-sm font-bold text-slate-500 dark:text-slate-400">{indexOfFirstItem + idx + 1}</td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900 dark:text-white">{sup.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5">ID: {sup.emp_code || "N/A"}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-semibold ${sup.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700 dark:text-slate-300'}`}>
                                {sup.role === 'admin' ? 'ADMIN' : 'SUPERVISOR'}
                              </span>
                            </td>
                            <td className="px-4 py-3"><div className="text-sm font-medium text-slate-800 dark:text-slate-100">{sup.email || "N/A"}</div></td>
                            <td className="px-4 py-3"><div className="text-sm text-slate-600 dark:text-slate-500 dark:text-slate-400 whitespace-nowrap">{sup.phone || "No contact"}</div></td>
                             <td className="px-4 py-4 text-sm font-medium">
                               <ExpandableListCell value={sup.city_name} label="Cities" textClass="text-slate-800 font-bold" emptyText="Unassigned" emptyClass="text-rose-500 italic" />
                             </td>
                             <td className="px-4 py-4 text-sm font-medium">
                               <ExpandableListCell value={sup.zone_name} label="Zones" textClass="text-slate-600 font-medium" />
                             </td>
                             <td className="px-4 py-4 text-sm font-medium">
                               <ExpandableListCell value={sup.ward_group} label="Ward Groups" textClass="text-slate-600 font-medium" />
                             </td>
                             <td className="px-4 py-4 text-sm font-medium">
                               <ExpandableListCell value={sup.kothi_name} label="Kothis" textClass="text-indigo-600 font-black" />
                             </td>
                             <td className="px-4 py-4">
                               <div className="flex flex-col gap-0.5 text-sm">
                                 <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                                   <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                   {sup.phone || "N/A"}
                                 </div>
                                 <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                                   <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                   {sup.email || "N/A"}
                                 </div>
                               </div>
                             </td>
                             <td className="px-4 py-4">
                               <div className="flex flex-col gap-1.5">
                                 <button 
                                   onClick={() => window.open(`${apiUrl}/supervisor-photo/${sup.user_id}/view`, "_blank")} 
                                   className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 hover:bg-indigo-100 transition-all text-[10px] font-black uppercase tracking-tighter w-fit"
                                 >
                                   <ImageIcon size={10} /> Supervisor Face
                                 </button>
                                 <button 
                                   onClick={() => window.open(`${apiUrl}/supervisor-aadhar/${sup.user_id}/view`, "_blank")} 
                                   className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-100 hover:bg-amber-100 transition-all text-[10px] font-black uppercase tracking-tighter w-fit"
                                 >
                                   <FileText size={10} /> Aadhar Doc
                                 </button>
                               </div>
                             </td>
                             <td className="px-4 py-4 relative">
                               <div className="relative">
                                 <button 
                                   onClick={() => setOpenActionMenuId(openActionMenuId === sup.user_id ? null : sup.user_id)}
                                   className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${openActionMenuId === sup.user_id ? "bg-indigo-600 text-white shadow-md" : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600"}`}
                                 >
                                   Actions <ChevronDown size={12} className={`transition-transform duration-200 ${openActionMenuId === sup.user_id ? "rotate-180" : ""}`} />
                                 </button>

                                 {openActionMenuId === sup.user_id && (
                                   <>
                                     <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenuId(null)}></div>
                                     <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 z-20 py-2 animate-in fade-in zoom-in duration-200 origin-top-right">
                                       <button onClick={() => { handleEdit(sup); setOpenActionMenuId(null); }} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors">
                                         <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Search size={14} /></div> Edit Profile
                                       </button>
                                       <button onClick={() => { handleUpdatePassword(sup); setOpenActionMenuId(null); }} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors">
                                         <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Key size={14} /></div> Update Password
                                       </button>
                                       <div className="my-1 border-t border-slate-50"></div>
                                       <button onClick={() => { handleDelete(sup.user_id); setOpenActionMenuId(null); }} className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                                         <div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><X size={14} /></div> Delete User
                                       </button>
                                     </div>
                                   </>
                                 )}
                               </div>
                             </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="6" className="p-3 text-center text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 font-bold italic">No supervisors matched your search.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="
p-4

bg-slate-50
dark:bg-slate-800

border-t
border-slate-100
dark:border-slate-700

flex
flex-wrap
items-center
justify-between
gap-4
">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Show</span>
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-sm

border
border-slate-200
dark:border-slate-700

rounded-md

px-2
py-1

focus:outline-none
focus:ring-2
focus:ring-indigo-500

bg-white
dark:bg-slate-900

font-bold

text-slate-700
dark:text-white

shadow-sm
dark:shadow-none">
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">entries</span>
                  </div>
                  {distTotalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className={`p-2 rounded-lg border transition-all ${currentPage === 1 ? "bg-white text-slate-200 border-slate-100 cursor-not-allowed" : "bg-white text-slate-600 dark:text-slate-500 dark:text-slate-400 border-slate-300 hover:border-indigo-500 hover:text-indigo-600 shadow-sm active:scale-95"}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                      </button>
                      <div className="bg-slate-800 text-white font-black text-xs px-4 py-2 rounded-lg min-w-[100px] text-center shadow-lg">PAGE {currentPage} / {distTotalPages}</div>
                      <button type="button" onClick={() => paginate(currentPage + 1)} disabled={currentPage >= distTotalPages} className={`p-2 rounded-lg border transition-all ${currentPage >= distTotalPages ? "bg-white text-slate-200 border-slate-100 cursor-not-allowed" : "bg-white text-slate-600 dark:text-slate-500 dark:text-slate-400 border-slate-300 hover:border-indigo-500 hover:text-indigo-600 shadow-sm active:scale-95"}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── City-Wise Supervisor Details Table ── */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header */}
            {/* <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin size={18} />
                  City-wise Supervisor List
                </h3>
                <p className="text-indigo-200 text-xs mt-0.5">
                  {selectedCityId && selectedCityId !== "ALL"
                    ? "Filtered by your city scope"
                    : "All assigned cities"}{" "}
                  · {new Set(cityWiseSupervisors.map(r => String(r.user_id))).size} supervisor{cityWiseSupervisors.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search supervisors, zones, kothis..."
                    value={cityWiseSearch}
                    onChange={(e) => setCityWiseSearch(e.target.value)}
                    className="w-64 px-4 py-2 pl-9 bg-white/10 border border-white/20 rounded-lg text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-white/40 text-sm"
                  />
                  <svg className="w-4 h-4 text-indigo-300 absolute left-2.5 top-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={fetchCityWiseSupervisors}
                  disabled={cityWiseLoading}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                >
                  <RefreshCw size={13} className={cityWiseLoading ? "animate-spin" : ""} />
                  {cityWiseLoading ? "Loading..." : "Refresh"}
                </button>
              </div>
            </div> */}
            <div
  className="
bg-gradient-to-r
from-indigo-600
to-indigo-700

dark:from-slate-900
dark:to-indigo-950

px-6
py-4

flex
flex-col
md:flex-row
md:items-center
justify-between

gap-3

border-b
border-indigo-500/30
dark:border-slate-700
"
>
  <div>
    <h3 className="text-lg font-bold text-white flex items-center gap-2">
      <MapPin size={18} />
      City-wise Supervisor List
    </h3>

    <p className="text-indigo-200 dark:text-slate-400 text-xs mt-0.5">
      {selectedCityId && selectedCityId !== "ALL"
        ? "Filtered by your city scope"
        : "All assigned cities"}{" "}
      · {new Set(cityWiseSupervisors.map(r => String(r.user_id))).size} supervisor
      {cityWiseSupervisors.length !== 1 ? "s" : ""}
    </p>
  </div>

  <div className="flex items-center gap-3">
    <div className="relative">
      <input
        type="text"
        placeholder="Search supervisors, zones, kothis..."
        value={cityWiseSearch}
        onChange={(e) => setCityWiseSearch(e.target.value)}
        className="
w-64

px-4
py-2
pl-9

bg-white/10
dark:bg-slate-800/80

border
border-white/20
dark:border-slate-700

rounded-lg

text-white
dark:text-slate-100

placeholder-indigo-300
dark:placeholder-slate-500

focus:outline-none
focus:ring-2
focus:ring-white/40
dark:focus:ring-indigo-500/40

text-sm
"
      />

      <svg
        className="w-4 h-4 text-indigo-300 dark:text-slate-500 absolute left-2.5 top-2.5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>

    <button
      onClick={fetchCityWiseSupervisors}
      disabled={cityWiseLoading}
      className="
flex
items-center
gap-2

bg-white/10
dark:bg-slate-800/80

hover:bg-white/20
dark:hover:bg-slate-700

border
border-white/20
dark:border-slate-700

text-white
dark:text-slate-100

px-3
py-2

rounded-lg

text-xs
font-bold

transition-all

active:scale-95
"
    >
      <RefreshCw
        size={13}
        className={cityWiseLoading ? "animate-spin" : ""}
      />

      {cityWiseLoading ? "Loading..." : "Refresh"}
    </button>
  </div>
</div>

            {/* Body */}
            {cityWiseLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
                <RefreshCw size={24} className="animate-spin mr-3" />
                <span className="text-sm font-semibold">Loading city-wise data...</span>
              </div>
            ) : groupedCityWise.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
                <MapPin size={36} className="mb-3 text-slate-300" />
                <p className="text-sm font-semibold">No supervisor assignments found.</p>
                <p className="text-xs mt-1">Try adjusting your search or city filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {groupedCityWise.map(([cityName, rows]) => {
                  const isOpen = expandedCity === cityName;
                  const f = getCityFilter(cityName);
                  const opts = cityFilterOptions[cityName] || { zones: [], kothis: [] };
                  const kothiOpts = getFilteredKothiOptions(cityName);
                  const totalEmp = rows.reduce((sum, r) => sum + Number(r.total_employee_count || 0), 0);
                  const unfilteredCount = cityWiseSupervisors.filter(r => r.city_name === cityName).length;
                  const isFiltered = f.zone || f.kothi;

                  return (
                    <div key={cityName}>
                      {/* City accordion header */}
                      <button
                        type="button"
                        onClick={() => setExpandedCity(isOpen ? null : cityName)}
className={`
w-full

flex
items-center
justify-between

px-6
py-4

text-left

transition-all
duration-200

border-b
border-slate-100
dark:border-slate-700

${
  isOpen
    ? `
      bg-indigo-50
      dark:bg-indigo-950/20

      text-indigo-700
      dark:text-indigo-300
    `
    : `
      bg-white
      dark:bg-slate-900

      text-slate-700
      dark:text-slate-200

      hover:bg-slate-50
      dark:hover:bg-slate-800
    `
}
`}                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isOpen ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:text-slate-500 dark:text-slate-400"}`}>
                            <MapPin size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{cityName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 mt-0.5">
                              {isFiltered
                                ? `${rows.length} of ${unfilteredCount} supervisor${unfilteredCount !== 1 ? "s" : ""} (filtered)`
                                : `${rows.length} supervisor${rows.length !== 1 ? "s" : ""}`
                              }
                              &nbsp;·&nbsp;
                              {totalEmp} employee{totalEmp !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isFiltered && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
                              <Filter size={10} />
                              Filtered
                            </span>
                          )}
                          <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">
                            <Users size={11} />
                            {rows.length}
                            {isFiltered && <span className="text-indigo-400">/{unfilteredCount}</span>}
                          </span>
                          {isOpen
                            ? <ChevronUp size={16} className="text-indigo-600" />
                            : <ChevronDown size={16} className="text-slate-500 dark:text-slate-400" />
                          }
                        </div>
                      </button>

                      {/* Expanded section */}
                      {isOpen && (
                        <div className="border-t border-indigo-100 bg-indigo-50 dark:bg-indigo-950/20/30">

                          {/* ── Per-city filters bar ── */}
                          <div className="
px-6
py-3

bg-slate-50
dark:bg-slate-800

border-b
border-slate-200
dark:border-slate-700

flex
flex-wrap
items-center
gap-3
">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Filter size={12} />
                              Filter:
                            </span>

                            {/* Zone filter */}
                            <select
                              value={f.zone}
                              onChange={e => setCityFilter(cityName, "zone", e.target.value)}
                              className="text-xs

border
border-slate-300
dark:border-slate-700

rounded-md

px-2.5
py-1.5

bg-white
dark:bg-slate-900

focus:outline-none
focus:ring-2
focus:ring-indigo-400

text-slate-700
dark:text-white

font-medium

min-w-[130px]"
                            >
                              <option value="">All Zones</option>
                              {opts.zones.map(z => (
                                <option key={z} value={z}>{z}</option>
                              ))}
                            </select>

                            {/* Kothi / Ward filter */}
                            <select
                              value={f.kothi}
                              onChange={e => setCityFilter(cityName, "kothi", e.target.value)}
                              className="text-xs

border
border-slate-300
dark:border-slate-700

rounded-md

px-2.5
py-1.5

bg-white
dark:bg-slate-900

focus:outline-none
focus:ring-2
focus:ring-indigo-400

text-slate-700
dark:text-white

font-medium

min-w-[130px]"
                            >
                              <option value="">All Kothis / Wards</option>
                              {kothiOpts.map(k => (
                                <option key={k} value={k}>{k}</option>
                              ))}
                            </select>

                            {/* Reset this city's filters */}
                            {isFiltered && (
                              <button
                                type="button"
                                onClick={() => setCityFilters(prev => ({ ...prev, [cityName]: { zone: "", ward: "", kothi: "" } }))}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-indigo-50 dark:bg-indigo-950/20 transition-colors"
                              >
                                <RefreshCw size={11} />
                                Reset
                              </button>
                            )}

                            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 font-medium">
                              Showing {rows.length} of {unfilteredCount} supervisors
                            </span>
                          </div>

                          {/* Table */}
                          {rows.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-500 dark:text-slate-400">
                              <Users size={28} className="mb-2 text-slate-300" />
                              <p className="text-sm font-semibold">No supervisors match the selected filters.</p>
                              <button
                                type="button"
                                onClick={() => setCityFilters(prev => ({ ...prev, [cityName]: { zone: "", ward: "", kothi: "" } }))}
                                className="mt-2 text-xs text-indigo-600 hover:underline font-bold"
                              >
                                Clear filters
                              </button>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="
bg-slate-100/70
dark:bg-slate-800

border-b
border-slate-200
dark:border-slate-700
">
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10">#</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supervisor</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Zones</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kothis / Wards</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employees</th>
                                  </tr>
                                </thead>
                                <tbody
  className="
divide-y
divide-slate-100
dark:divide-slate-700

bg-white
dark:bg-slate-900
"
>
                                  {rows.map((row, idx) => (
                                    <tr
  key={row.user_id}
  className="
bg-white
dark:bg-slate-900

hover:bg-slate-50
dark:hover:bg-slate-800

transition-all
duration-200
"
>
                                      <td className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400">{idx + 1}</td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-8 h-8 rounded-full text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                            {(row.supervisor_name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                          </div>
                                          <p className="font-bold text-slate-900 dark:text-white text-sm">{row.supervisor_name || "—"}</p>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <p className="text-slate-700 dark:text-slate-300 text-xs">{row.email || "—"}</p>
                                        <p className="text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 text-xs mt-0.5">{row.phone || "—"}</p>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                                          {(row.zones || "").split(",").map(z => z.trim()).filter(Boolean).map((z, i) => (
                                            <span
                                              key={i}
                                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${f.zone && f.zone === z
                                                ? "text-indigo-700 dark:text-indigo-300 border-indigo-300"
                                                : "bg-blue-50 text-blue-700 border-blue-100"
                                                }`}
                                            >
                                              {z}
                                            </span>
                                          ))}
                                          {!row.zones && <span className="text-slate-500 dark:text-slate-400 text-xs italic">No zones</span>}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                                          {(row.kothis || "").split(",").map(k => k.trim()).filter(Boolean).map((k, i) => (
                                            <span
                                              key={i}
                                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${f.kothi && f.kothi === k
                                                ? "text-indigo-700 dark:text-indigo-300 border-indigo-300"
                                                : "bg-emerald-50 dark:bg-emerald-900/20"
                                                }`}
                                            >
                                              {k}
                                            </span>
                                          ))}
                                          {!row.kothis && <span className="text-slate-500 dark:text-slate-400 text-xs italic">No wards</span>}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white font-black text-sm shadow-sm">
                                          {row.total_employee_count || 0}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                {/* City subtotal */}
                                <tfoot>
                                  <tr className="bg-slate-50 border-t border-slate-200">
                                    <td colSpan={5} className="px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                      {cityName} {isFiltered ? "(filtered)" : ""} Total
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                      <span className="inline-flex items-center justify-center px-3 py-1 bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-full text-xs">
                                        {totalEmp}
                                      </span>
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Grand total footer */}
            {!cityWiseLoading && groupedCityWise.length > 0 && (
              <div
  className="
px-6
py-3

bg-indigo-600
dark:bg-slate-900

flex
items-center
justify-between

border-t
border-indigo-500/30
dark:border-slate-700
"
>
                <span className="
text-indigo-200
dark:text-slate-400

text-xs
font-semibold

flex
items-center
gap-1
">Grand Total — All Cities</span>
                <div className="flex items-center gap-4">
                  <span className="
text-indigo-200
dark:text-slate-400

text-xs
font-semibold

flex
items-center
gap-1
">
                    <Users size={13} />
                    {new Set(cityWiseSupervisors.map(r => String(r.user_id))).size} Supervisors
                  </span>
                  <span className="
text-indigo-200
dark:text-slate-400

text-xs
font-semibold

flex
items-center
gap-1
">
                    <Building2 size={13} />
                    {cityWiseSupervisors.reduce((s, r) => s + Number(r.total_employee_count || 0), 0)} Employees
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Supervisors;
