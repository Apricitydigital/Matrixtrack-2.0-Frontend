import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { AlertCircle, MapPinned, Pencil, Trash2 } from "lucide-react";
import API_BASE_URL, { ALLOWED_CITIES_ENDPOINT } from "../config";
import Swal from "sweetalert2";

const apiUrl = `${API_BASE_URL}/api/zones`;

function CreateZone() {
  const [zones, setZones] = useState([]);
  const [filteredZones, setFilteredZones] = useState([]); // For filtered zones
  const [zoneName, setZoneName] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cities, setCities] = useState([]);
  const [editingZone, setEditingZone] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [cityScopeAll, setCityScopeAll] = useState(false);
  const singleCityMode = !cityScopeAll && cities.length === 1;

  // Resizable columns state
  const [columnWidths, setColumnWidths] = useState({
    sno: 60,
    city: 250,
    zone: 250,
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
      if (cityList.length) {
        setCities(cityList);
        if (!payload.all && cityList.length === 1) {
          setSelectedCity(String(cityList[0].city_id));
        }
      } else {
        setErrorMessage("No cities found. Please add a city first.");
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
      if (error?.response?.status === 401) {
        setErrorMessage("Session expired. Please log in again.");
      } else {
        setErrorMessage("Failed to fetch cities. Please try again later.");
      }
    }
  }, [buildRequestConfig]);

  const fetchZones = useCallback(async () => {
    try {
      const response = await axios.get(apiUrl, buildRequestConfig());
      if (response.data) {
        setZones(response.data);
        setFilteredZones(response.data); // Initialize filteredZones with all zones
      } else {
        setErrorMessage("No zones found.");
      }
    } catch (error) {
      console.error("Error fetching zones:", error);
      setErrorMessage("Failed to fetch zones. Please try again later.");
    }
  }, [buildRequestConfig]);

  useEffect(() => {
    fetchCities();
    fetchZones();
  }, [fetchCities, fetchZones]);

  useEffect(() => {
    if (singleCityMode && cities[0]) {
      setSelectedCity(String(cities[0].city_id));
    }
  }, [singleCityMode, cities]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear previous errors

    if (!selectedCity || !zoneName) {
      setErrorMessage("Please select a city and enter a zone name.");
      return;
    }

    try {
      if (editingZone) {
        // Update existing zone
        const response = await axios.put(
          `${apiUrl}/${editingZone.zone_id}`,
          {
            city_id: selectedCity,
            zone_name: zoneName,
          },
          buildRequestConfig()
        );
        if (response.data) {
          setZones((prevZones) =>
            prevZones.map((zone) =>
              zone.zone_id === editingZone.zone_id
                ? { ...zone, zone_name: zoneName, city_id: selectedCity }
                : zone
            )
          );
          setErrorMessage(""); // Clear errors on success
        } else {
          setErrorMessage("Failed to update zone. Please try again.");
        }
      } else {
        // Add new zone
        const response = await axios.post(
          apiUrl,
          {
            city_id: selectedCity,
            zone_name: zoneName,
          },
          buildRequestConfig()
        );
        if (response.data) {
          setZones([...zones, response.data]);
          setErrorMessage(""); // Clear errors on success
        } else {
          setErrorMessage("Failed to add zone. Please try again.");
        }
      }

      // Reset form
      resetForm();
      fetchZones(); // Refresh zone list
    } catch (error) {
      console.error("Error saving zone:", error);
      if (error.response) {
        const errCode = error.response.data.code;
        if (errCode === "23505") {
          setErrorMessage("Zone already exists for this city.");
        } else {
          setErrorMessage("Error saving zone. Please try again.");
        }
      } else {
        setErrorMessage("Network error. Please check your connection.");
      }
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
      const response = await axios.delete(
        `${apiUrl}/${id}`,
        buildRequestConfig()
      );
      if (response.data) {
        setZones(zones.filter((zone) => zone.zone_id !== id));
        setFilteredZones(filteredZones.filter((zone) => zone.zone_id !== id));
        setErrorMessage(""); // Clear errors on success
        Swal.fire("Deleted!", "The Zone has been removed.", "success");
      } else {
        setErrorMessage("Failed to delete zone. Please try again.");
        Swal.fire("Error!", "Something went wrong.", "error");
      }
    } catch (error) {
      console.error("Error deleting zone:", error);
      setErrorMessage("Failed to delete zone. Please try again.");
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    setZoneName(zone.zone_name);
    setSelectedCity(zone.city_id); // Ensure city selection updates correctly
  };

  const resetForm = () => {
    setZoneName("");

    if (singleCityMode && cities[0]) {
      setSelectedCity(String(cities[0].city_id));
    } else {
      setSelectedCity("");
    }

    setEditingZone(null);
  };

  useEffect(() => {
    let filtered = zones;
    if (selectedCity) {
      filtered = zones.filter((zone) => zone.city_id === parseInt(selectedCity));
    }

    // Apply natural sorting so "Zone 2" comes before "Zone 10"
    const sorted = [...filtered].sort((a, b) =>
      a.zone_name.localeCompare(b.zone_name, undefined, { numeric: true, sensitivity: 'base' })
    );

    setFilteredZones(sorted);
  }, [selectedCity, zones]);

  // Reset filters and form
  const handleResetAll = () => {
    resetForm(); // Reset form data
    setSelectedCity(""); // Reset city filter
    setFilteredZones(zones); // Show all zones
  };

  return (
    <div>
      <div className="
flex
items-center
gap-2

text-xl
font-bold

mb-4

text-slate-800
dark:text-white
">        <MapPinned size={20} /> Manage Zones
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="
text-red-600
dark:text-red-400

mb-3

flex
items-center
gap-2
">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3">
        {/* City Selection Dropdown */}
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
            value=""
            disabled
            className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
          >
            Select City
          </option>
          {cities.map((city) => (
            <option
              key={city.city_id}
              value={city.city_id}
              className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
            >
              {city.city_name}
            </option>
          ))}
        </select>

        {/* Zone Name Input */}
        <input
          type="text"
          value={zoneName}
          onChange={(e) => setZoneName(e.target.value)}
          placeholder="Enter Zone Name"
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
            className={`px-4 py-2 rounded ${selectedCity && zoneName
              ? "bg-blue-500 text-white"
              : "bg-gray-400 text-gray-700 cursor-not-allowed"
              }`}
            disabled={!selectedCity || !zoneName} // Disable if any field is empty
          >
            {editingZone ? "Update Zone" : "Add Zone"}
          </button>
          {(editingZone || selectedCity) && (
            <button
              type="button"
              onClick={handleResetAll}
              className="
bg-gray-500
dark:bg-slate-700

hover:bg-gray-600
dark:hover:bg-slate-600

text-white

px-4
py-2

rounded

transition-colors
"
            >
              Reset All
            </button>
          )}
        </div>
      </form>

      {/* Zone Table */}
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
            <th className="
p-3
text-center

border-r
border-gray-300
dark:border-slate-700

relative
select-none

text-slate-800
dark:text-slate-100
" style={{ width: columnWidths.sno }}>
              S.No
              <div
                onMouseDown={(e) => handleMouseDown(e, "sno")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 dark:bg-slate-700 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
            <th className="
p-3
text-center

border-r
border-gray-300
dark:border-slate-700

relative
select-none

text-slate-800
dark:text-slate-100
" style={{ width: columnWidths.city }}>
              City
              <div
                onMouseDown={(e) => handleMouseDown(e, "city")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 dark:bg-slate-700 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
            <th className="
p-3
text-center

border-r
border-gray-300
dark:border-slate-700

relative
select-none

text-slate-800
dark:text-slate-100
" style={{ width: columnWidths.zone }}>
              Zone
              <div
                onMouseDown={(e) => handleMouseDown(e, "zone")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 dark:bg-slate-700 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
            <th className="p-3 text-center relative select-none" style={{ width: columnWidths.actions }}>
              Actions
              <div
                onMouseDown={(e) => handleMouseDown(e, "actions")}
                className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-gray-300 dark:bg-slate-700 hover:bg-blue-500 hover:w-2 transition-all z-10"
                title="Drag to resize"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredZones.map((zone, index) => (
            <tr
              key={zone.zone_id}
              className="
border-b
border-gray-200
dark:border-slate-700

text-center

hover:bg-gray-50
dark:hover:bg-slate-800

transition-colors

text-slate-800
dark:text-slate-100
"
            >
              <td className="
p-3

border-r
border-gray-200
dark:border-slate-700

truncate
overflow-hidden
whitespace-nowrap
" title={index + 1}>{index + 1}</td>
              <td className="
p-3

border-r
border-gray-200
dark:border-slate-700

truncate
overflow-hidden
whitespace-nowrap
" title={zone.city_name}>{zone.city_name}</td>
              <td className="p-3 border-r border-gray-200 dark:border-slate-700 truncate overflow-hidden whitespace-nowrap font-semibold" title={zone.zone_name}>{zone.zone_name}</td>
              <td className="p-3">
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(zone)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded transition-colors text-[10px] flex items-center gap-1"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(zone.zone_id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors text-[10px] flex items-center gap-1"
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

export default CreateZone;
