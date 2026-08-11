import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { AlertCircle, MapPin, Pencil, Trash2 } from "lucide-react";
import API_BASE_URL, { ALLOWED_CITIES_ENDPOINT } from "../config";
import Swal from "sweetalert2";

const apiUrl = `${API_BASE_URL}/api/cities`;

const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

function CreateCity() {
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [state, setState] = useState("");
  const [cityName, setCityName] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [editingCity, setEditingCity] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [cityScopeAll, setCityScopeAll] = useState(false);
  const singleCityMode = !cityScopeAll && cities.length === 1;
  const canCreateCity = cityScopeAll;

  // Resizable columns state
  const [columnWidths, setColumnWidths] = useState({
    sno: 60,
    city: 250,
    state: 250,
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

  const applyCityFilter = useCallback(
    (filterValue, dataSource) => {
      const source = Array.isArray(dataSource) ? dataSource : cities;
      if (!source.length) {
        setFilteredCities([]);
        return;
      }

      if (filterValue === "all") {
        setFilteredCities(source);
        return;
      }

      const filtered = source.filter(
        (city) => city.city_id?.toString() === filterValue
      );
      setFilteredCities(filtered);
    },
    [cities]
  );

  const fetchCities = useCallback(async () => {
    try {
      const response = await axios.get(ALLOWED_CITIES_ENDPOINT, buildRequestConfig());
      const payload = response.data || {};
      const cityList = Array.isArray(payload.cities)
        ? payload.cities
        : Array.isArray(payload)
          ? payload
          : [];
      const scopedAll = Boolean(payload.all);
      const nextFilter =
        !scopedAll && cityList.length === 1
          ? String(cityList[0].city_id)
          : cityFilter;
      setCityScopeAll(scopedAll);
      setCities(cityList);
      setCityFilter(nextFilter);
      applyCityFilter(nextFilter, cityList);
      return cityList;
    } catch (error) {
      console.error("Error fetching cities:", error);
      if (error?.response?.status === 401) {
        setErrorMessage("Your session expired. Please log in again.");
      }
      return [];
    }
  }, [applyCityFilter, buildRequestConfig, cityFilter]);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  useEffect(() => {
    if (singleCityMode && cities[0]) {
      const scopedCityId = String(cities[0].city_id);
      setCityFilter(scopedCityId);
      applyCityFilter(scopedCityId, cities);
    }
  }, [singleCityMode, cities, applyCityFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear previous errors
    if (!canCreateCity && !editingCity) {
      setErrorMessage("You can manage only your assigned city.");
      return;
    }
    try {
      if (editingCity) {
        // Update existing city
        await axios.put(
          `${apiUrl}/${editingCity.city_id}`,
          {
            city_name: cityName,
            state,
          },
          buildRequestConfig()
        );
      } else {
        // Add new city
        await axios.post(
          apiUrl,
          {
            city_name: cityName,
            state,
          },
          buildRequestConfig()
        );
      }
      resetForm();
      const refreshed = await fetchCities(); // Refresh city list
      applyCityFilter(cityFilter, refreshed);
    } catch (error) {
      if (error.response) {
        const errCode = error.response.data.code;
        if (errCode === "23505") {
          setErrorMessage("This city already exists in the database.");
        } else {
          setErrorMessage("Error saving city. Please try again.");
        }
      } else {
        setErrorMessage("Network error. Please check your connection.");
      }
      console.error("Error saving city:", error);
    }
  };

  const editCity = (city) => {
    setEditingCity(city);
    setCityName(city.city_name);
    setState(city.state);
  };

  const deleteCity = async (id) => {
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
      const refreshed = await fetchCities();
      applyCityFilter(cityFilter, refreshed);
      Swal.fire("Deleted!", "The city has been removed.", "success");
    } catch (error) {
      console.error("Error deleting city:", error);
      Swal.fire("Error!", "Something went wrong.", "error");
    }
  };

  const resetForm = () => {
    setCityName("");
    setState("");
    setEditingCity(null);
  };

  const handleCityFilterChange = (event) => {
    const nextValue = event.target.value;
    setCityFilter(nextValue);
    applyCityFilter(nextValue);
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-xl font-bold mb-4 text-slate-800 dark:text-white">
        <MapPin size={20} /> Manage Cities
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3">
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="
p-2

border
border-slate-300
dark:border-slate-700

rounded

w-full

bg-white
dark:bg-slate-900

text-slate-700
dark:text-slate-200
"
          required
        >
          <option value="" disabled>
            Select State
          </option>
          {indianStates.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={cityName}
          onChange={(e) => setCityName(e.target.value)}
          placeholder="Enter City Name"
          className="
p-2

border
border-slate-300
dark:border-slate-700

rounded

w-full

bg-white
dark:bg-slate-900

text-slate-700
dark:text-slate-200
"
          required
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className={`px-4 py-2 rounded ${
              state && cityName
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed"
            }`}
            disabled={!state || !cityName} // Corrected check
          >
            {editingCity ? "Update City" : "Add City"}
          </button>

          {/* Reset Button */}
          {editingCity && (
            <button
              type="button"
              onClick={resetForm}
className="
bg-slate-500
dark:bg-slate-700

hover:bg-slate-600
dark:hover:bg-slate-600

text-white

px-4
py-2

rounded

transition-colors
"            >
              Reset
            </button>
          )}
        </div>
      </form>

      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
          View city details
        </label>
        <select
          value={cityFilter}
          onChange={handleCityFilterChange}
          className="
p-2

border
border-slate-300
dark:border-slate-700

rounded

w-full

bg-white
dark:bg-slate-900

text-slate-700
dark:text-slate-200
"
        >
          {cityScopeAll && <option value="all">All Cities</option>}
          {cities.map((city) => (
            <option key={city.city_id} value={city.city_id}>
              {city.city_name}
            </option>
          ))}
        </select>
      </div>
      {!canCreateCity && !editingCity && (
        <div className="mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          City creation is restricted to the assigned xcity. Visible city records remain editable.
        </div>
      )}

      {/* City Table */}
      <table
  className="
w-full

bg-white
dark:bg-slate-900

rounded-2xl

overflow-hidden

shadow-md
dark:shadow-none

border
border-slate-200
dark:border-slate-700
"
  style={{ tableLayout: "fixed" }}
>
        <thead>
          <tr
  className="
bg-slate-100
dark:bg-slate-800

border-b
border-slate-200
dark:border-slate-700
"
>
            <th className="
p-3

text-center

border-r
border-slate-300
dark:border-slate-700

relative

select-none

text-slate-700
dark:text-slate-300

text-xs
font-black
uppercase
tracking-wider
" style={{ width: columnWidths.sno }}>
              S.No
              <div
                onMouseDown={(e) => handleMouseDown(e, "sno")}
                className="
absolute
top-0
right-0

h-full
w-1.5

cursor-col-resize

bg-slate-300
dark:bg-slate-700

hover:bg-blue-500

hover:w-2

transition-all

z-10
"
                title="Drag to resize"
              />
            </th>
            <th className="
p-3

text-center

border-r
border-slate-300
dark:border-slate-700

relative

select-none

text-slate-700
dark:text-slate-300

text-xs
font-black
uppercase
tracking-wider
" style={{ width: columnWidths.city }}>
              City
              <div
                onMouseDown={(e) => handleMouseDown(e, "city")}
                className="
absolute
top-0
right-0

h-full
w-1.5

cursor-col-resize

bg-slate-300
dark:bg-slate-700

hover:bg-blue-500

hover:w-2

transition-all

z-10
"
                title="Drag to resize"
              />
            </th>
            <th className="
p-3

text-center

border-r
border-slate-300
dark:border-slate-700

relative

select-none

text-slate-700
dark:text-slate-300

text-xs
font-black
uppercase
tracking-wider
" style={{ width: columnWidths.state }}>
              State
              <div
                onMouseDown={(e) => handleMouseDown(e, "state")}
                className="
absolute
top-0
right-0

h-full
w-1.5

cursor-col-resize

bg-slate-300
dark:bg-slate-700

hover:bg-blue-500

hover:w-2

transition-all

z-10
"
                title="Drag to resize"
              />
            </th>
            <th className="p-3 text-center relative select-none" style={{ width: columnWidths.actions }}>
              Actions
              <div
                onMouseDown={(e) => handleMouseDown(e, "actions")}
                className="
absolute
top-0
right-0

h-full
w-1.5

cursor-col-resize

bg-slate-300
dark:bg-slate-700

hover:bg-blue-500

hover:w-2

transition-all

z-10
"
                title="Drag to resize"
              />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {Array.isArray(filteredCities) && filteredCities.length > 0 ? (
            filteredCities.map((city, index) => (
              <tr
  key={city.city_id}
  className={`
text-center

transition-all
duration-200

hover:bg-slate-50
dark:hover:bg-slate-800/70

${
  index % 2 === 0
    ? "bg-white dark:bg-slate-900"
    : "bg-slate-50/40 dark:bg-slate-800/40"
}
`}
>
                <td className="
p-3

border-r
border-slate-200
dark:border-slate-700

truncate
overflow-hidden
whitespace-nowrap

text-slate-700
dark:text-slate-300
" title={index + 1}>{index + 1}</td>
                <td className="
p-3

border-r
border-slate-200
dark:border-slate-700

truncate
overflow-hidden
whitespace-nowrap

text-slate-700
dark:text-slate-300
" title={city.city_name}>{city.city_name}</td>
                <td className="
p-3

border-r
border-slate-200
dark:border-slate-700

truncate
overflow-hidden
whitespace-nowrap

text-slate-700
dark:text-slate-300
" title={city.state}>{city.state}</td>
                <td className="p-3">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => editCity(city)}
                      className="
bg-amber-500
hover:bg-amber-600

dark:bg-amber-500/20
dark:hover:bg-amber-500/30

text-white
dark:text-amber-400

px-2
py-1

rounded-lg

transition-all

text-[10px]

flex
items-center
gap-1

border
border-transparent
dark:border-amber-500/20
"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => deleteCity(city.city_id)}
                      className="
bg-red-500
hover:bg-red-600

dark:bg-red-500/20
dark:hover:bg-red-500/30

text-white
dark:text-red-400

px-2
py-1

rounded-lg

transition-all

text-[10px]

flex
items-center
gap-1

border
border-transparent
dark:border-red-500/20
"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="text-center py-6 text-slate-400 dark:text-slate-500 italic">
                No cities available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default CreateCity;
