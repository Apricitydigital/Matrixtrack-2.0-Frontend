import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { AlertCircle, MapPin, Pencil, Trash2 } from "lucide-react";
import API_BASE_URL, { ALLOWED_CITIES_ENDPOINT } from "../config";
import Swal from "sweetalert2";

const apiUrl = `${API_BASE_URL}/api/wards`;

function CreateWard() {
  const [wards, setWards] = useState([]);
  const [filteredWards, setFilteredWards] = useState([]); // For filtered wards
  const [wardName, setWardName] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = useState([]);
  const [selectedZone, setSelectedZone] = useState("");
  const [zones, setZones] = useState([]);
  const [sectors, setSectors] = useState([]); // List of Wards (Sectors)
  const [selectedSector, setSelectedSector] = useState("");
  const [editingWard, setEditingWard] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [cityScopeAll, setCityScopeAll] = useState(false);
  const singleCityMode = !cityScopeAll && cities.length === 1;

  // Resizable columns state
  const [columnWidths, setColumnWidths] = useState({
    sno: 60,
    city: 120,
    zone: 120,
    ward: 180,
    kothi: 300,
    actions: 150,
  });

  const [activeResizer, setActiveResizer] = useState(null);

  const handleMouseDown = (e, col) => {
    e.preventDefault();
    setActiveResizer({
      col,
      startX: e.clientX,
      startWidth: columnWidths[col],
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!activeResizer) return;

      const deltaX = e.clientX - activeResizer.startX;
      const newWidth = Math.max(50, activeResizer.startWidth + deltaX);

      setColumnWidths((prev) => ({
        ...prev,
        [activeResizer.col]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setActiveResizer(null);
    };

    if (activeResizer) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeResizer]);

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

  const fetchCities = useCallback(async () => {
    try {
      const response = await axios.get(
        ALLOWED_CITIES_ENDPOINT,
        buildRequestConfig()
      );
      const payload = response.data || {};
      const cityList = Array.isArray(payload.cities)
        ? payload.cities
        : Array.isArray(payload)
          ? payload
          : [];
      setCityScopeAll(Boolean(payload.all));
      setCities(cityList);
      if (!payload.all && cityList.length === 1) {
        setSelectedCity(String(cityList[0].city_id));
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
      setErrorMessage(
        error?.response?.status === 401
          ? "Session expired. Please log in again."
          : "Failed to load cities."
      );
    }
  }, [buildRequestConfig]);

  const fetchZones = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/zones`,
        buildRequestConfig()
      );
      setZones(response.data);
    } catch (error) {
      console.error("Error fetching zones:", error);
      setErrorMessage(
        error?.response?.status === 401
          ? "Session expired. Please log in again."
          : "Failed to load zones."
      );
    }
  }, [buildRequestConfig]);

  const fetchSectors = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/sectors`,
        buildRequestConfig()
      );
      // Flatten the sector data
      const sectorList = response.data.flatMap((city) =>
        city.zones.flatMap((zone) =>
          zone.sectors.map((sector) => ({
            sector_id: sector.sectorId,
            sector_name: sector.sectorName,
            zone_id: zone.zoneId,
            city_id: city.cityId,
          }))
        )
      );
      setSectors(sectorList);
    } catch (error) {
      console.error("Error fetching sectors:", error);
    }
  }, [buildRequestConfig]);

  const fetchWards = useCallback(async () => {
    try {
      const response = await axios.get(apiUrl, buildRequestConfig());
      const formattedWards = formatWards(response.data);
      setWards(formattedWards);
      setFilteredWards(formattedWards); // Initialize filteredWards with all wards
    } catch (error) {
      console.error("Error fetching wards:", error);
      setErrorMessage(
        error?.response?.status === 401
          ? "Session expired. Please log in again."
          : "Failed to load wards."
      );
    }
  }, [buildRequestConfig]);

  useEffect(() => {
    fetchZones();
    fetchSectors();
    fetchWards();
    fetchCities();
  }, [fetchCities, fetchWards, fetchZones, fetchSectors]);

  useEffect(() => {
    if (singleCityMode) {
      setSelectedCity(String(cities[0].city_id));
    }
  }, [singleCityMode, cities]);

  const formatWards = (data) => {
    // First, let's build a map of sector names for quick lookup
    const sectorMap = {};
    sectors.forEach(s => {
      sectorMap[s.sector_id] = s.sector_name;
    });

    return data.flatMap((city) =>
      city.zones.flatMap((zone) =>
        zone.wards.map((ward) => ({
          ward_id: ward.wardId,
          ward_name: ward.wardName,
          sector_id: ward.sectorId,
          sector_name: sectorMap[ward.sectorId] || "No Ward",
          zone_id: zone.zoneId,
          zone_name: zone.zone,
          city_id: city.cityId,
          city_name: city.city,
        }))
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      if (editingWard) {
        await axios.put(
          `${apiUrl}/${editingWard.ward_id}`,
          {
            zone_id: selectedZone,
            ward_name: wardName,
            sector_id: selectedSector || null,
          },
          buildRequestConfig()
        );
        setWards((prevWards) =>
          prevWards.map((ward) =>
            ward.ward_id === editingWard.ward_id
              ? { ...ward, ward_name: wardName, zone_id: selectedZone, sector_id: selectedSector }
              : ward
          )
        );
      } else {
        const response = await axios.post(
          apiUrl,
          {
            zone_id: selectedZone,
            ward_name: wardName,
            sector_id: selectedSector || null,
          },
          buildRequestConfig()
        );
        setWards([...wards, response.data]);
      }
      resetForm();
      fetchWards();
    } catch (error) {
      if (error.response) {
        const errCode = error.response.data.code;
        setErrorMessage(
          errCode === "23505"
            ? "Kothi already exists in this zone."
            : "Error saving kothi. Please try again."
        );
      } else {
        setErrorMessage("Network error. Please check your connection.");
      }
      console.error("Error saving ward:", error);
    }
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
      await axios.delete(`${apiUrl}/${id}`, buildRequestConfig());
      setWards(wards.filter((ward) => ward.ward_id !== id));
      setFilteredWards(filteredWards.filter((ward) => ward.ward_id !== id));
      Swal.fire("Deleted!", "The Kothi has been removed.", "success");
    } catch (error) {
      console.error("Error deleting ward:", error);
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const handleEdit = (ward) => {
    setEditingWard(ward);
    setWardName(ward.ward_name);
    setSelectedZone(ward.zone_id);
    setSelectedSector(ward.sector_id || "");

    const zone = zones.find((z) => z.zone_id === ward.zone_id);
    if (zone) {
      setSelectedCity(zone.city_id.toString());
    }
  };

  const resetForm = () => {
    setWardName("");
    setSelectedZone("");
    setSelectedSector("");
    setEditingWard(null);
  };
  const handleResetAll = () => {
    resetForm(); // Reset form data
    handleResetFilters(); // Reset filters
  };

  // Filter wards based on selected city and zone
  useEffect(() => {
    // Create a map of sector names for quick lookup
    const sectorMap = {};
    sectors.forEach(s => {
      sectorMap[s.sector_id] = s.sector_name;
    });

    let filtered = wards.map(w => ({
      ...w,
      sector_name: sectorMap[w.sector_id] || "No Ward"
    }));

    if (selectedCity) {
      filtered = filtered.filter(
        (ward) => ward.city_id === parseInt(selectedCity)
      );
    }

    if (selectedZone) {
      filtered = filtered.filter(
        (ward) => ward.zone_id === parseInt(selectedZone)
      );
    }

    if (selectedSector) {
      filtered = filtered.filter(
        (ward) => ward.sector_id === parseInt(selectedSector)
      );
    }

    // Sort Kothis naturally by name
    const sorted = [...filtered].sort((a,b) => 
      (a.ward_name||"").localeCompare(b.ward_name||"", undefined, {numeric: true, sensitivity: 'base'})
    );

    setFilteredWards(sorted);
  }, [selectedCity, selectedZone, selectedSector, wards, sectors]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedCity("");
    setSelectedZone("");
    setSelectedSector("");
    setFilteredWards(wards); // Show all wards
  };

  return (
<div className="text-slate-800 dark:text-slate-100">      <div className="flex items-center gap-2 text-xl font-bold mb-4 text-slate-800 dark:text-white">
        <MapPin size={20} /> Manage Kothi
      </div>

      {errorMessage && (
        <div className="
text-red-600
dark:text-red-400

mb-3

bg-red-50
dark:bg-red-950/20

border
border-red-100
dark:border-red-900

p-3
rounded-lg

flex
items-center
gap-2
">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="
mb-4

flex
flex-col
gap-3

bg-slate-50
dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

p-5

rounded-xl

shadow-sm
dark:shadow-slate-950/30
">
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="
p-2

border
border-slate-300
dark:border-slate-700

rounded
w-full

bg-white
dark:bg-slate-800

text-slate-800
dark:text-white

focus:outline-none
focus:ring-2
focus:ring-blue-500/20
"
          required
          disabled={singleCityMode}
        >
          <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value="" disabled>
            Select City
          </option>
          {cities.map((city) => (
            <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" key={city.city_id} value={city.city_id}>
              {city.city_name}
            </option>
          ))}
        </select>

        <select
          value={selectedZone}
          onChange={(e) => setSelectedZone(e.target.value)}
          className="
p-2

border
border-slate-300
dark:border-slate-700

rounded
w-full

bg-white
dark:bg-slate-800

text-slate-800
dark:text-white

focus:outline-none
focus:ring-2
focus:ring-blue-500/20
"
          required
          disabled={!selectedCity} // Disable if no city is selected
        >
          <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value="" disabled>
            Select Zone
          </option>
          {zones
            .filter((zone) => zone.city_id === parseInt(selectedCity)) // Filter zones for selected city
            .map((zone) => (
              <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" key={zone.zone_id} value={zone.zone_id}>
                {zone.zone_name}
              </option>
            ))}
        </select>

        <select
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
          className="
p-2

border
border-slate-300
dark:border-slate-700

rounded
w-full

bg-white
dark:bg-slate-800

text-slate-800
dark:text-white

focus:outline-none
focus:ring-2
focus:ring-blue-500/20
"
          disabled={!selectedZone} // Disable if no zone is selected
        >
          <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value="">
            {selectedZone ? "All Wards" : "Select Zone First"}
          </option>
          {sectors
            .filter((s) => s.zone_id === parseInt(selectedZone)) // Filter wards for selected zone
            .map((s) => (
              <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" key={s.sector_id} value={s.sector_id}>
                {s.sector_name}
              </option>
            ))}
        </select>

        <input
          type="text"
          value={wardName}
          onChange={(e) => setWardName(e.target.value)}
          placeholder="Enter Kothi Name"
          className="
p-2

border
border-slate-300
dark:border-slate-700

rounded
w-full

bg-white
dark:bg-slate-800

text-slate-800
dark:text-white

focus:outline-none
focus:ring-2
focus:ring-blue-500/20
"
          required
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className={`px-4 py-2 rounded ${selectedCity && selectedZone && wardName
                ? "bg-blue-500 text-white"
                : ":bg-gray-400 dark:bg-slate-700 text-gray-700 dark:text-slate-400 cursor-not-allowed"
              }`}
            disabled={!selectedCity || !selectedZone || !wardName} // Disable if any field is empty
          >
            {editingWard ? "Update Kothi" : "Add Kothi"}
          </button>

          {/* Reset Filters Button */}
          {/* <button
            onClick={handleResetFilters}
            disabled={!selectedCity && !selectedZone} // Disable if no filters are applied
            className={`px-4 py-2 rounded ${
              selectedCity || selectedZone
                ? "bg-red-500 text-white"
                : "bg-gray-400 text-gray-700 cursor-not-allowed"
            }`}
          >
            Reset Filters
          </button>
          {editingWard && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Reset Form Data
            </button>
          )} */}
          <button
            onClick={handleResetAll}
            disabled={!selectedCity && !selectedZone && !editingWard} // Disable if no filters or editing
            className={`px-4 py-2 rounded ${selectedCity || selectedZone || editingWard
                ? ":bg-red-500 dark:bg-red-600 text-white"
                : ":bg-gray-400 dark:bg-slate-700 text-gray-700 dark:text-slate-400 cursor-not-allowed"
              }`}
          >
            Reset
          </button>
        </div>
      </form>

      <table
  className="
w-full

bg-white
dark:bg-slate-900

shadow-md
dark:shadow-slate-950/30

rounded-lg

border
border-slate-200
dark:border-slate-700
" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="bg-gray-200 dark:bg-slate-800">
            <th className="p-3 text-center border-r border-gray-300 relative select-none" style={{ width: columnWidths.sno }}>
              S.No
              <div
                onMouseDown={(e) => handleMouseDown(e, "sno")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
            <th className="p-3 text-center border-r border-gray-300 relative select-none" style={{ width: columnWidths.city }}>
              City
              <div
                onMouseDown={(e) => handleMouseDown(e, "city")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
            <th className="p-3 text-center border-r border-gray-300 relative select-none" style={{ width: columnWidths.zone }}>
              Zone
              <div
                onMouseDown={(e) => handleMouseDown(e, "zone")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
            <th className="p-3 text-center border-r border-gray-300 relative select-none" style={{ width: columnWidths.ward }}>
              Ward
              <div
                onMouseDown={(e) => handleMouseDown(e, "ward")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
            <th className="p-3 text-center border-r border-gray-300 relative select-none" style={{ width: columnWidths.kothi }}>
              Kothi
              <div
                onMouseDown={(e) => handleMouseDown(e, "kothi")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
            <th className="p-3 text-center relative select-none" style={{ width: columnWidths.actions }}>
              Actions
              <div
                onMouseDown={(e) => handleMouseDown(e, "actions")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredWards.map((ward, index) => (
            <tr key={ward.ward_id} className="
border-b
border-gray-200
dark:border-slate-700

text-center

hover:bg-gray-50
dark:hover:bg-slate-800

transition-colors

text-slate-800
dark:text-slate-100
">
              <td className="
p-3

border-r
border-gray-200
dark:border-slate-700

truncate
overflow-hidden
whitespace-nowrap
" title={index + 1}>{index + 1}</td>
              <td className="p-3 border-r border-gray-200 truncate overflow-hidden whitespace-nowrap text-xs" title={ward.city_name || "N/A"}>{ward.city_name || "N/A"}</td>
              <td className="p-3 border-r border-gray-200 truncate overflow-hidden whitespace-nowrap text-xs" title={ward.zone_name || "Unknown Zone"}>{ward.zone_name || "Unknown Zone"}</td>
              <td className="p-3 border-r border-gray-200 truncate overflow-hidden whitespace-nowrap text-xs" title={ward.sector_name || "No Ward"}>{ward.sector_name || "No Ward"}</td>
              <td className="p-3 border-r border-gray-200 truncate overflow-hidden whitespace-nowrap text-xs font-semibold" title={ward.ward_name}>{ward.ward_name}</td>
              <td className="p-3">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => handleEdit(ward)}
                    className="
bg-yellow-500
dark:bg-yellow-600

hover:bg-yellow-600
dark:hover:bg-yellow-700

text-white

px-2
py-1

rounded

transition-colors

text-[10px]

flex
items-center
gap-1
"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ward.ward_id)}
                    className="
bg-red-500
dark:bg-red-600

hover:bg-red-600
dark:hover:bg-red-700

text-white

px-2
py-1

rounded

transition-colors

text-[10px]

flex
items-center
gap-1
"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CreateWard;
