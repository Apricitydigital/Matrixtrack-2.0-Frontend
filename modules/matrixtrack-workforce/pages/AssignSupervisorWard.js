import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import API_BASE_URL from "../config";
import Swal from "sweetalert2";
import { useSearch } from "../SearchContext";
import { useAuth } from "../AuthContext";
import { matchesSearchTerm } from "../utils/search";
import { MapPin, Filter, RefreshCw } from "lucide-react";
import Loader from "../components/Loader";
import SearchableSelect from "../components/SearchableSelect";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Download } from "lucide-react";
const apiUrl = `${API_BASE_URL}/api`;

const normalizeWardHierarchy = (payload) => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((city) => {
      const cityId = city.cityId ?? city.city_id;
      const cityName = city.city ?? city.city_name ?? "Unknown City";
      const zones = Array.isArray(city.zones) ? city.zones : [];

      return {
        cityId,
        cityName,
        zones: zones
          .map((zone) => {
            const zoneId = zone.zoneId ?? zone.zone_id;
            const zoneName = zone.zone ?? zone.zone_name ?? "Unknown Zone";
            const wardList = Array.isArray(zone.wards) ? zone.wards : [];

            return {
              zoneId,
              zoneName,
              wards: wardList
                .map((ward) => ({
                  wardId: ward.wardId ?? ward.ward_id,
                  wardName: ward.wardName ?? ward.ward_name ?? "Unknown Ward",
                }))
                .filter((ward) => ward.wardId !== undefined && ward.wardId !== null),
            };
          })
          .filter((zone) => zone.zoneId !== undefined && zone.zoneId !== null),
      };
    })
    .filter((city) => city.cityId !== undefined && city.cityId !== null);
};

const toStringId = (value) =>
  value === null || value === undefined ? "" : String(value);

function AssignSupervisorWard() {
  const { logPageView } = useAuth();
  const [supervisors, setSupervisors] = useState([]);

  useEffect(() => {
    if (logPageView) logPageView("Assign Supervisor Ward", "/assignSupervisorWard");
  }, [logPageView]);

  const [wards, setWards] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [formData, setFormData] = useState({
    assigned_id: "",
    user_id: "",
    cityId: "",
    zoneId: "",
    sectorId: "",
    wardId: "", // this represents Kothi ID for backend
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isManualReloading, setIsManualReloading] = useState(false);
  const [error, setError] = useState("");
  const { normalizedQuery } = useSearch();
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [selectedCityFilter, setSelectedCityFilter] = useState("");
  const [selectedZoneFilter, setSelectedZoneFilter] = useState("");
  const [selectedWardFilter, setSelectedWardFilter] = useState("");
  const [selectedKothiFilter, setSelectedKothiFilter] = useState("");

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

  const uniqueCities = useMemo(() => [...new Set(assignments.map(a => a.city_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })), [assignments]);

  const uniqueZones = useMemo(() => {
    let filtered = assignments;
    if (selectedCityFilter) filtered = filtered.filter(a => a.city_name === selectedCityFilter);
    return [...new Set(filtered.map(a => a.zone_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [assignments, selectedCityFilter]);

  const uniqueWards = useMemo(() => {
    let filtered = assignments;
    if (selectedCityFilter) filtered = filtered.filter(a => a.city_name === selectedCityFilter);
    if (selectedZoneFilter) filtered = filtered.filter(a => a.zone_name === selectedZoneFilter);

    const wardSet = new Set();
    filtered.forEach(a => {
      if (a.ward_name) {
        const sectorName = kothiToSectorMap[(a.ward_name || '').toLowerCase()];
        if (sectorName) wardSet.add(sectorName);
      }
    });
    return [...wardSet].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [assignments, selectedCityFilter, selectedZoneFilter, kothiToSectorMap]);

  const uniqueKothis = useMemo(() => {
    let filtered = assignments;
    if (selectedCityFilter) filtered = filtered.filter(a => a.city_name === selectedCityFilter);
    if (selectedZoneFilter) filtered = filtered.filter(a => a.zone_name === selectedZoneFilter);
    if (selectedWardFilter) {
      const sector = sectors.find(s => s.sector_name === selectedWardFilter);
      const sectorKothiNames = new Set((sector?.kothis || []).map(k => (k.wardName || '').toLowerCase()));
      filtered = filtered.filter(a => sectorKothiNames.has((a.ward_name || '').toLowerCase()));
    }
    return [...new Set(filtered.map(a => a.ward_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [assignments, selectedCityFilter, selectedZoneFilter, selectedWardFilter, sectors]);

  // Default select city if only one exists and we probably don't have "all" scope
  useEffect(() => {
    if (wards.length === 1 && !selectedCityFilter) {
      setSelectedCityFilter(wards[0].cityName);
    } else if (uniqueCities.length === 1 && !selectedCityFilter) {
      setSelectedCityFilter(uniqueCities[0]);
    }
  }, [wards, uniqueCities, selectedCityFilter]);

  const buildRequestConfig = useCallback(() => {
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
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/assignedWardRoutes`,
        buildRequestConfig()
      );
      setAssignments(response.data || []);
    } catch (error) {
      console.error("Error fetching Assigned Ward data", error);
      setError(
        error?.response?.status === 401
          ? "Session expired. Please log in again."
          : "Failed to fetch assignments. Please try again."
      );
    }
  }, [buildRequestConfig]);

  const fetchSupervisors = useCallback(async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/supervisor`,
        buildRequestConfig()
      );
      setSupervisors(response.data || []);
    } catch (error) {
      console.error("Error fetching supervisor data", error);
    }
  }, [buildRequestConfig]);

  const fetchSectors = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/sectors`, buildRequestConfig());
      const formattedSectors = (Array.isArray(response.data) ? response.data : [])
        .flatMap((city) =>
          (city?.zones || []).flatMap((zone) =>
            (zone?.sectors || []).map((sector) => ({
              sector_id: toStringId(sector?.sectorId ?? sector?.sector_id),
              sector_name: sector?.sectorName ?? sector?.sector_name ?? "",
              zone_id: toStringId(zone?.zoneId ?? zone?.zone_id),
              city_id: toStringId(city?.cityId ?? city?.city_id),
              kothis: Array.isArray(sector?.kothis) ? sector.kothis : [],
            }))
          )
        );
      setSectors(formattedSectors);
    } catch (error) {
      console.error("Error fetching sectors data", error);
    }
  }, [buildRequestConfig]);

  const fetchWards = useCallback(async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/wards`,
        buildRequestConfig()
      );
      setWards(normalizeWardHierarchy(response.data));
    } catch (error) {
      console.error("Error fetching ward data", error);
      setError(
        error?.response?.status === 401
          ? "Session expired. Please log in again."
          : "Failed to fetch wards. Please try again."
      );
    }
  }, [buildRequestConfig]);

  const fetchAllData = useCallback(async (isManual = false) => {
    if (isManual) setIsManualReloading(true);
    setLoading(true);
    try {
      await Promise.all([
        fetchSupervisors(),
        fetchSectors(),
        fetchWards(),
        fetchAssignments()
      ]);
    } finally {
      setLoading(false);
      setIsManualReloading(false);
    }
  }, [fetchSupervisors, fetchSectors, fetchWards, fetchAssignments]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        user_id: formData.user_id,
        ward_id: formData.wardId,
      };
      const requestConfig = buildRequestConfig();
      const jsonRequestConfig = {
        ...requestConfig,
        headers: {
          "Content-Type": "application/json",
          ...(requestConfig.headers || {}),
        },
      };

      if (isEditing) {
        await axios.put(
          `${apiUrl}/assignedWardRoutes/${formData.assigned_id}`,
          payload,
          jsonRequestConfig
        );
      } else {
        await axios.post(
          `${apiUrl}/assignedWardRoutes`,
          payload,
          jsonRequestConfig
        );
      }
      fetchAssignments(); // Refresh list
      resetForm(); // Reset form
    } catch (error) {
      console.error("Error updating supervisor", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (assign) => {
    // Find the sector ID for the assigned Kothi to pre-fill the Ward dropdown
    let matchedSectorId = "";
    if (assign.ward_id) {
      const assignedSector = sectors.find(s =>
        (s.kothis || []).some(k => toStringId(k.wardId) === toStringId(assign.ward_id))
      );
      if (assignedSector) matchedSectorId = assignedSector.sector_id;
    }

    setFormData({
      assigned_id: assign.assigned_id,
      user_id: toStringId(assign.user_id),
      cityId: toStringId(assign.city_id ?? assign.cityId),
      zoneId: toStringId(assign.zone_id ?? assign.zoneId),
      sectorId: matchedSectorId,
      wardId: toStringId(assign.ward_id ?? assign.wardId),
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
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
      await axios.delete(
        `${apiUrl}/assignedWardRoutes/${id}`,
        buildRequestConfig()
      );
      setAssignments((prev) =>
        prev.filter((assign) => assign.assigned_id !== id)
      );
      Swal.fire("Deleted!", "The Assignment has been removed.", "success");
    } catch (error) {
      console.error("Error deleting assignment", error);
      setError("Failed to delete assignment. Please try again.");
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      assigned_id: "",
      user_id: "",
      cityId: "",
      zoneId: "",
      sectorId: "",
      wardId: "",
    });
    setIsEditing(false);
  };

  const selectedCity = useMemo(
    () =>
      wards.find(
        (city) => String(city.cityId) === String(formData.cityId)
      ),
    [wards, formData.cityId]
  );

  const selectedZone = useMemo(
    () =>
      selectedCity?.zones.find(
        (zone) => String(zone.zoneId) === String(formData.zoneId)
      ),
    [selectedCity, formData.zoneId]
  );

  const filteredAssignments = useMemo(() => {
    let result = assignments;
    if (normalizedQuery) {
      result = result.filter((assign) =>
        matchesSearchTerm(
          {
            name: assign.name,
            empCode: assign.emp_code,
            city: assign.city_name,
            zone: assign.zone_name,
            ward: assign.ward_name,
          },
          normalizedQuery
        )
      );
    }

    if (selectedCityFilter) {
      result = result.filter(a => a.city_name === selectedCityFilter);
    }
    if (selectedZoneFilter) {
      result = result.filter(a => a.zone_name === selectedZoneFilter);
    }
    if (selectedWardFilter) {
      const sector = sectors.find(s => s.sector_name === selectedWardFilter);
      const sectorKothiNames = new Set((sector?.kothis || []).map(k => (k.wardName || '').toLowerCase()));
      result = result.filter(a => sectorKothiNames.has((a.ward_name || '').toLowerCase()));
    }
    if (selectedKothiFilter) {
      result = result.filter(a => a.ward_name === selectedKothiFilter);
    }
    if (localSearchQuery) {
      const lowerQuery = localSearchQuery.toLowerCase();
      result = result.filter((assign) => {
        const sectorName = kothiToSectorMap[(assign.ward_name || '').toLowerCase()];
        const values = [
          assign.name,
          assign.emp_code,
          assign.city_name,
          assign.zone_name,
          sectorName,
          assign.ward_name,
        ];
        return values.some((val) => String(val || "").toLowerCase().includes(lowerQuery));
      });
    }

    return result.sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: 'base' }));
  }, [assignments, normalizedQuery, localSearchQuery, selectedCityFilter, selectedZoneFilter, selectedWardFilter, selectedKothiFilter, sectors, kothiToSectorMap]);

  // Reset pagination when search query or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedQuery, localSearchQuery, selectedCityFilter, selectedZoneFilter, selectedWardFilter, selectedKothiFilter]);

  const handleResetFilters = () => {
    setLocalSearchQuery("");
    setSelectedCityFilter(wards.length === 1 ? wards[0].cityName : "");
    setSelectedZoneFilter("");
    setSelectedWardFilter("");
    setSelectedKothiFilter("");
  };
  const handleDownloadExcel = () => {
  const excelData = filteredAssignments.map((assigned, index) => ({
    Sr_No: index + 1,
    EmpCode: assigned.emp_code || "",
    Name: assigned.name || "",
 Contact_No:
  supervisors.find(
    (sup) => String(sup.user_id) === String(assigned.user_id)
  )?.phone || "",
    City: assigned.city_name || "",
    Zone: assigned.zone_name || "",
    Ward:
      kothiToSectorMap[
      (assigned.ward_name || "").toLowerCase()
      ] || "",
    Kothi: assigned.ward_name || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Supervisor Assignments"
  );

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const data = new Blob([excelBuffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });

  saveAs(data, "Supervisor_Assignments.xlsx");
};

  return (
    <div className="p-5">
      {isManualReloading && <Loader />}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <MapPin size={22} /> Assign Supervisor to Kothis
        </div>
        <button
          onClick={() => fetchAllData(true)}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 uppercase tracking-widest"
          title="Refresh Data"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing..." : "Reload Data"}
        </button>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <form
        onSubmit={handleSubmit}
        className="
bg-white
dark:bg-slate-900

p-6

shadow-sm
dark:shadow-none

border
border-gray-100
dark:border-slate-700

rounded-xl

mb-6
"      >
        {isEditing && (
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-slate-200">Assigned ID (Auto-generated)</label>
            <input
              type="text"
              value={formData.assigned_id}
              disabled
              className="
border
border-gray-300
dark:border-slate-700

p-2
w-full

rounded-lg

bg-gray-50
dark:bg-slate-800

text-gray-500
dark:text-slate-400
"            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Select Supervisor
            </label>

            <SearchableSelect
              options={supervisors.map((sup) => ({
                label: sup.name,
                value: toStringId(sup.user_id),
              }))}

              value={formData.user_id}

              onChange={(e) => {
                setFormData({
                  ...formData,
                  user_id: e.target.value,
                });
              }}

              placeholder="-- Select Supervisor --"

              required

              className="
[&_button]:w-full

[&_button]:p-2.5

[&_button]:border
[&_button]:border-gray-300
dark:[&_button]:border-slate-700

[&_button]:rounded-lg

[&_button]:bg-white
dark:[&_button]:bg-slate-800

[&_button]:text-gray-700
dark:[&_button]:text-slate-200

[&_button]:focus:ring-2
[&_button]:focus:ring-blue-500

[&_button]:focus:border-blue-500

[&_button]:transition-all

[&_button]:outline-none

[&_button]:shadow-none
dark:[&_button]:shadow-none

[&_button]:disabled:bg-gray-50
dark:[&_button]:disabled:bg-slate-900

[&_button]:disabled:text-gray-400
dark:[&_button]:disabled:text-slate-500

[&_input]:bg-white
dark:[&_input]:bg-slate-800

[&_input]:border
[&_input]:border-gray-300
dark:[&_input]:border-slate-700

[&_input]:text-gray-700
dark:[&_input]:text-slate-200

[&_input]:placeholder:text-gray-400
dark:[&_input]:placeholder:text-slate-500

[&_input]:focus:ring-2
[&_input]:focus:ring-blue-500

[&_input]:focus:border-blue-500

[&_input]:outline-none

[&_.absolute]:bg-white
dark:[&_.absolute]:bg-slate-900

[&_.absolute]:border
[&_.absolute]:border-gray-200
dark:[&_.absolute]:border-slate-700

[&_.absolute]:rounded-lg
"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">Select City</label>
            <select
              name="cityId"
              value={formData.cityId}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  cityId: e.target.value,
                  zoneId: "",
                  wardId: "",
                });
              }}
              className="
w-full

p-2.5

border
border-gray-300
dark:border-slate-700

rounded-lg

focus:ring-2
focus:ring-blue-500
focus:border-blue-500

transition-all
outline-none

bg-white
dark:bg-slate-800

text-gray-700
dark:text-slate-200

disabled:bg-gray-50
dark:disabled:bg-slate-900

disabled:text-gray-400
dark:disabled:text-slate-500
"
              required
              disabled={!formData.user_id}
            >
              <option
                value=""
                className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200"
              >
                -- Select City --
              </option>
              {wards.map((city) => {
                const optionValue = toStringId(city.cityId);
                return (
                  <option
                    key={optionValue || city.cityName}
                    value={optionValue}
                    className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200"
                  >
                    {city.cityName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* ZONE */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Select Zone
            </label>

            <SearchableSelect
              options={(selectedCity?.zones || []).map((zone) => ({
                label: zone.zoneName,
                value: toStringId(zone.zoneId),
              }))}

              value={formData.zoneId}

              onChange={(e) => {
                setFormData({
                  ...formData,
                  zoneId: e.target.value,
                  sectorId: "",
                  wardId: "",
                });
              }}

              placeholder="-- Select Zone --"

              required

              disabled={!formData.cityId}

              className="
[&_button]:w-full

[&_button]:p-2.5

[&_button]:border
[&_button]:border-gray-300
dark:[&_button]:border-slate-700

[&_button]:rounded-lg

[&_button]:bg-white
dark:[&_button]:bg-slate-800

[&_button]:text-gray-700
dark:[&_button]:text-slate-200

[&_button]:focus:ring-2
[&_button]:focus:ring-blue-500

[&_button]:focus:border-blue-500

[&_button]:transition-all

[&_button]:outline-none

[&_button]:shadow-none
dark:[&_button]:shadow-none

[&_button]:disabled:bg-gray-50
dark:[&_button]:disabled:bg-slate-900

[&_button]:disabled:text-gray-400
dark:[&_button]:disabled:text-slate-500

[&_input]:bg-white
dark:[&_input]:bg-slate-800

[&_input]:border
[&_input]:border-gray-300
dark:[&_input]:border-slate-700

[&_input]:text-gray-700
dark:[&_input]:text-slate-200

[&_input]:placeholder:text-gray-400
dark:[&_input]:placeholder:text-slate-500

[&_input]:focus:ring-2
[&_input]:focus:ring-blue-500

[&_input]:focus:border-blue-500

[&_input]:outline-none

[&_.absolute]:bg-white
dark:[&_.absolute]:bg-slate-900

[&_.absolute]:border
[&_.absolute]:border-gray-200
dark:[&_.absolute]:border-slate-700

[&_.absolute]:rounded-lg
"
            />
          </div>

          {/* WARD */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Select Ward
            </label>

            <SearchableSelect
              options={sectors
                .filter(
                  (s) =>
                    String(s.zone_id) === String(formData.zoneId)
                )
                .sort((a, b) =>
                  a.sector_name.localeCompare(
                    b.sector_name,
                    undefined,
                    {
                      numeric: true,
                      sensitivity: "base",
                    }
                  )
                )
                .map((s) => ({
                  label: s.sector_name,
                  value: s.sector_id,
                }))}

              value={formData.sectorId}

              onChange={(e) => {
                setFormData({
                  ...formData,
                  sectorId: e.target.value,
                  wardId: "",
                });
              }}

              placeholder="-- Select Ward --"

              required

              disabled={!formData.zoneId}

              className="
[&_button]:w-full

[&_button]:p-2.5

[&_button]:border
[&_button]:border-gray-300
dark:[&_button]:border-slate-700

[&_button]:rounded-lg

[&_button]:bg-white
dark:[&_button]:bg-slate-800

[&_button]:text-gray-700
dark:[&_button]:text-slate-200

[&_button]:focus:ring-2
[&_button]:focus:ring-blue-500

[&_button]:focus:border-blue-500

[&_button]:transition-all

[&_button]:outline-none

[&_button]:shadow-none
dark:[&_button]:shadow-none

[&_button]:disabled:bg-gray-50
dark:[&_button]:disabled:bg-slate-900

[&_button]:disabled:text-gray-400
dark:[&_button]:disabled:text-slate-500

[&_input]:bg-white
dark:[&_input]:bg-slate-800

[&_input]:border
[&_input]:border-gray-300
dark:[&_input]:border-slate-700

[&_input]:text-gray-700
dark:[&_input]:text-slate-200

[&_input]:placeholder:text-gray-400
dark:[&_input]:placeholder:text-slate-500

[&_input]:focus:ring-2
[&_input]:focus:ring-blue-500

[&_input]:focus:border-blue-500

[&_input]:outline-none

[&_.absolute]:bg-white
dark:[&_.absolute]:bg-slate-900

[&_.absolute]:border
[&_.absolute]:border-gray-200
dark:[&_.absolute]:border-slate-700

[&_.absolute]:rounded-lg
"
            />
          </div>

          {/* KOTHI */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Select Kothi
            </label>

            <SearchableSelect
              options={(sectors.find(
                (s) =>
                  String(s.sector_id) ===
                  String(formData.sectorId)
              )?.kothis || [])
                .sort((a, b) =>
                  a.wardName.localeCompare(
                    b.wardName,
                    undefined,
                    {
                      numeric: true,
                      sensitivity: "base",
                    }
                  )
                )
                .map((k) => ({
                  label: k.wardName,
                  value: k.wardId,
                }))}

              value={formData.wardId}

              onChange={(e) => {
                setFormData({
                  ...formData,
                  wardId: e.target.value,
                });
              }}

              placeholder="-- Select Kothi --"

              required

              disabled={!formData.sectorId}

              className="
[&_button]:w-full

[&_button]:p-2.5

[&_button]:border
[&_button]:border-gray-300
dark:[&_button]:border-slate-700

[&_button]:rounded-lg

[&_button]:bg-white
dark:[&_button]:bg-slate-800

[&_button]:text-gray-700
dark:[&_button]:text-slate-200

[&_button]:focus:ring-2
[&_button]:focus:ring-blue-500

[&_button]:focus:border-blue-500

[&_button]:transition-all

[&_button]:outline-none

[&_button]:shadow-none
dark:[&_button]:shadow-none

[&_button]:disabled:bg-gray-50
dark:[&_button]:disabled:bg-slate-900

[&_button]:disabled:text-gray-400
dark:[&_button]:disabled:text-slate-500

[&_input]:bg-white
dark:[&_input]:bg-slate-800

[&_input]:border
[&_input]:border-gray-300
dark:[&_input]:border-slate-700

[&_input]:text-gray-700
dark:[&_input]:text-slate-200

[&_input]:placeholder:text-gray-400
dark:[&_input]:placeholder:text-slate-500

[&_input]:focus:ring-2
[&_input]:focus:ring-blue-500

[&_input]:focus:border-blue-500

[&_input]:outline-none

[&_.absolute]:bg-white
dark:[&_.absolute]:bg-slate-900

[&_.absolute]:border
[&_.absolute]:border-gray-200
dark:[&_.absolute]:border-slate-700

[&_.absolute]:rounded-lg
"
            />
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="
w-full
md:w-fit

min-w-[140px]

bg-blue-600
hover:bg-blue-700

dark:bg-blue-500
dark:hover:bg-blue-600

text-white

px-8
py-2.5

rounded-lg

shadow-sm
dark:shadow-none

font-medium

transition-colors

h-[45px]

whitespace-nowrap
"
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : isEditing
                  ? "Update"
                  : "Add Assignment"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="
w-fit

bg-gray-100
hover:bg-gray-200

dark:bg-slate-800
dark:hover:bg-slate-700

text-gray-600
dark:text-slate-200

px-8
py-2.5

rounded-lg

font-medium

transition-colors

h-[45px]
"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="flex flex-col gap-3 mb-4 mt-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              placeholder="Search assignments..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              className="
w-full

px-4
py-3
pl-11

border
border-slate-300
dark:border-slate-700

rounded-xl

bg-white
dark:bg-[#020817]

text-sm

text-slate-700
dark:text-slate-200

placeholder:text-slate-400
dark:placeholder:text-slate-500

shadow-sm
dark:shadow-none

focus:outline-none
focus:ring-2
focus:ring-blue-500/40

focus:border-blue-500

transition-all
"
            />

            <svg
              className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2"
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
       
          <div className="flex items-center gap-3">
  <div className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-md shadow-sm border border-gray-200">
    Total Count: {filteredAssignments.length}
  </div>


</div>
        </div>

        <div
          className="
grid
grid-cols-1
md:grid-cols-6

gap-3

bg-slate-50
dark:bg-slate-900

p-4

rounded-2xl

border
border-slate-200
dark:border-slate-700

shadow-sm
dark:shadow-none
"
        >          {/* CITY */}
          <select
            className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-xl

px-3
py-2.5

text-sm

bg-white
dark:bg-[#020817]

text-slate-700
dark:text-slate-200

focus:ring-2
focus:ring-blue-500/40

focus:border-blue-500
focus:outline-none

transition-all

shadow-sm
dark:shadow-none

disabled:bg-slate-100
dark:disabled:bg-slate-800

disabled:text-slate-400
dark:disabled:text-slate-500
"
            value={selectedCityFilter}
            onChange={(e) => {
              setSelectedCityFilter(e.target.value);
              setSelectedZoneFilter("");
              setSelectedWardFilter("");
            }}
            disabled={wards.length === 1}
          >
            <option
              value=""
              className="bg-white dark:bg-[#020817] text-slate-700 dark:text-slate-200"
            >
              All Cities
            </option>

            {uniqueCities.map((c) => (
              <option
                key={c}
                value={c}
                className="bg-white dark:bg-[#020817] text-slate-700 dark:text-slate-200"
              >
                {c}
              </option>
            ))}
          </select>

          {/* ZONE */}
          <select
            className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-xl

px-3
py-2.5

text-sm

bg-white
dark:bg-[#020817]

text-slate-700
dark:text-slate-200

focus:ring-2
focus:ring-blue-500/40

focus:border-blue-500
focus:outline-none

transition-all

shadow-sm
dark:shadow-none
"
            value={selectedZoneFilter}
            onChange={(e) => {
              setSelectedZoneFilter(e.target.value);
              setSelectedWardFilter("");
            }}
          >
            <option
              value=""
              className="bg-white dark:bg-[#020817] text-slate-700 dark:text-slate-200"
            >
              All Zones
            </option>

            {uniqueZones.map((z) => (
              <option
                key={z}
                value={z}
                className="bg-white dark:bg-[#020817] text-slate-700 dark:text-slate-200"
              >
                {z}
              </option>
            ))}
          </select>

          {/* WARD */}
          <select
            className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-xl

px-3
py-2.5

text-sm

bg-white
dark:bg-[#020817]

text-slate-700
dark:text-slate-200

focus:ring-2
focus:ring-blue-500/40

focus:border-blue-500
focus:outline-none

transition-all

shadow-sm
dark:shadow-none
"
            value={selectedWardFilter}
            onChange={(e) => {
              setSelectedWardFilter(e.target.value);
              setSelectedKothiFilter("");
            }}
          >
            <option
              value=""
              className="bg-white dark:bg-[#020817] text-slate-700 dark:text-slate-200"
            >
              All Wards
            </option>

            {uniqueWards.map((w) => (
              <option
                key={w}
                value={w}
                className="bg-white dark:bg-[#020817] text-slate-700 dark:text-slate-200"
              >
                {w}
              </option>
            ))}
          </select>

          {/* KOTHI */}
          <select
            className="
w-full

border
border-slate-300
dark:border-slate-700

rounded-xl

px-3
py-2.5

text-sm

bg-white
dark:bg-[#020817]

text-slate-700
dark:text-slate-200

focus:ring-2
focus:ring-blue-500/40

focus:border-blue-500
focus:outline-none

transition-all

shadow-sm
dark:shadow-none
"
            value={selectedKothiFilter}
            onChange={(e) => setSelectedKothiFilter(e.target.value)}
          >
            <option
              value=""
              className="bg-white dark:bg-[#020817] text-slate-700 dark:text-slate-200"
            >
              All Kothis
            </option>

            {uniqueKothis.map((k) => (
              <option
                key={k}
                value={k}
                className="bg-white dark:bg-[#020817] text-slate-700 dark:text-slate-200"
              >
                {k}
              </option>
            ))}
          </select>
          <button
            onClick={handleResetFilters}
            className="flex items-center justify-center gap-2 bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-600 px-4 py-2 rounded-md text-sm font-semibold transition-all shadow-sm active:scale-95 h-full"
            title="Reset Filters"
          >
            <Filter size={16} />
            Reset
          </button>
            <button
    onClick={handleDownloadExcel}
    className="
flex items-center gap-2
bg-green-600 hover:bg-green-700
text-white
px-4 py-2
rounded-lg
text-sm font-semibold
transition-all
shadow-sm
"
  >
    <Download size={16} />
    Download Excel
  </button>
        </div>
      </div>

      <table
        className="
w-full

overflow-hidden

rounded-2xl

bg-white
dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

shadow-md
dark:shadow-none
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

uppercase
tracking-wider

text-xs
font-black

text-slate-500
dark:text-slate-400
"
          >
            <th className="px-4 py-3">EmpCode</th>

            <th className="px-4 py-3">Name</th>
<th className="px-4 py-3 whitespace-nowrap">
  Contact No
</th>
            <th className="px-4 py-3 whitespace-nowrap">City</th>

            <th className="px-4 py-3 whitespace-nowrap">Zone</th>

            <th className="px-4 py-3">Ward</th>

            <th className="px-4 py-3">Kothi</th>

            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {filteredAssignments.length > 0 ? (
            filteredAssignments
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage
              )
              .map((assigned, idx) => (
                <tr
                  key={assigned.assigned_id}
                  className={`
transition-all
duration-200

hover:bg-slate-50/70
dark:hover:bg-slate-800/70

${idx % 2 === 0
                      ? "bg-white dark:bg-slate-900"
                      : "bg-slate-50/40 dark:bg-slate-800/30"
                    }
`}
                >
                  {/* EMP CODE */}
                  <td className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {assigned.emp_code}
                  </td>

                  {/* NAME */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {assigned.name}
                    </div>
                  </td>{/* CONTACT */}
<td className="px-4 py-3 whitespace-nowrap">
  <span className="text-sm text-slate-600 dark:text-slate-300">
  {
  supervisors.find(
    (sup) => String(sup.user_id) === String(assigned.user_id)
  )?.phone || "—"
}
  </span>
</td>

                  {/* CITY */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {assigned.city_name}
                    </span>
                  </td>

                  {/* ZONE */}
                  <td className="px-4 py-3 whitespace-nowrap">
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
                      {assigned.zone_name}
                    </span>
                  </td>

                  {/* WARD */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="text-sm text-slate-700 dark:text-slate-300 break-words leading-relaxed">
                      {kothiToSectorMap[
                        (assigned.ward_name || "").toLowerCase()
                      ] || "—"}
                    </div>
                  </td>

                  {/* KOTHI */}
                  <td className="px-4 py-3 max-w-[250px]">
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
                      {assigned.ward_name}
                    </div>
                  </td>

                  {/* ACTIONS */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(assigned)}
                        className="
bg-amber-500
hover:bg-amber-600

dark:bg-amber-500/20
dark:hover:bg-amber-500/30

text-white
dark:text-amber-400

px-3
py-1.5

rounded-lg

text-sm
font-semibold

border
border-transparent
dark:border-amber-500/20

transition-all
"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(assigned.assigned_id)
                        }
                        className="
bg-red-500
hover:bg-red-600

dark:bg-red-500/20
dark:hover:bg-red-500/30

text-white
dark:text-red-400

px-3
py-1.5

rounded-lg

text-sm
font-semibold

border
border-transparent
dark:border-red-500/20

transition-all
"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
          ) : (
            <tr>
              <td
                colSpan="8"
                className="
p-8

text-center

text-slate-500
dark:text-slate-400
"
              >
                No assignments match the current search.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {Math.ceil(filteredAssignments.length / itemsPerPage) > 0 && (
        <div
          className="
flex
flex-col
md:flex-row

items-center
justify-between

px-6
py-4

bg-slate-50
dark:bg-slate-900

border-t
border-slate-200
dark:border-slate-700

mt-4

rounded-2xl

gap-4

shadow-sm
dark:shadow-none
"
        >
          {/* RECORD INFO */}
          <div
            className="
text-xs
font-black

text-slate-500
dark:text-slate-400

uppercase
tracking-widest

bg-white
dark:bg-slate-800

border
border-slate-200
dark:border-slate-700

px-3
py-1.5

rounded-xl

shadow-inner
dark:shadow-none

whitespace-nowrap
"
          >
            {(currentPage - 1) * itemsPerPage + 1} -{" "}
            {Math.min(
              currentPage * itemsPerPage,
              filteredAssignments.length
            )}

            <span className="mx-1 text-slate-300 dark:text-slate-600">
              /
            </span>

            {filteredAssignments.length} Records
          </div>

          {/* PAGINATION */}
          <div className="flex items-center justify-center gap-1.5">
            {/* PREV */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
              className={`

p-2

rounded-xl

border

transition-all

${currentPage === 1
                  ? `
bg-slate-100
dark:bg-slate-800

text-slate-300
dark:text-slate-600

border-slate-200
dark:border-slate-700

cursor-not-allowed
`
                  : `
bg-white
dark:bg-slate-800

text-slate-600
dark:text-slate-300

border-slate-200
dark:border-slate-700

hover:border-indigo-300
dark:hover:border-indigo-500/30

hover:text-indigo-600
dark:hover:text-indigo-400

shadow-sm
dark:shadow-none

active:scale-90
`
                }
`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            {/* PAGE INFO */}
            <div
              className="
bg-white
dark:bg-slate-800

border
border-slate-200
dark:border-slate-700

rounded-xl

px-4
py-1.5

text-sm
font-black

text-slate-600
dark:text-slate-300

shadow-sm
dark:shadow-none

min-w-[110px]

text-center

uppercase
tracking-tighter
"
            >
              Page {currentPage}

              <span className="mx-1 text-slate-300 dark:text-slate-600">
                OF
              </span>

              {Math.ceil(filteredAssignments.length / itemsPerPage)}
            </div>

            {/* NEXT */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={
                currentPage >=
                Math.ceil(filteredAssignments.length / itemsPerPage)
              }
              className={`

p-2

rounded-xl

border

transition-all

${currentPage >=
                  Math.ceil(filteredAssignments.length / itemsPerPage)
                  ? `
bg-slate-100
dark:bg-slate-800

text-slate-300
dark:text-slate-600

border-slate-200
dark:border-slate-700

cursor-not-allowed
`
                  : `
bg-white
dark:bg-slate-800

text-slate-600
dark:text-slate-300

border-slate-200
dark:border-slate-700

hover:border-indigo-300
dark:hover:border-indigo-500/30

hover:text-indigo-600
dark:hover:text-indigo-400

shadow-sm
dark:shadow-none

active:scale-90
`
                }
`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AssignSupervisorWard;
