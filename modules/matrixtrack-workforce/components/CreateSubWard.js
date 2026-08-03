import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { AlertCircle, MapPin, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import API_BASE_URL, { ALLOWED_CITIES_ENDPOINT } from "../config";
import Swal from "sweetalert2";

const apiUrl = `${API_BASE_URL}/api/sectors`;

function CreateSubWard() {
    const [sectors, setSectors] = useState([]);
    const [filteredSectors, setFilteredSectors] = useState([]);
    const [sectorName, setSectorName] = useState("");
    const [selectedCity, setSelectedCity] = useState("");
    const [cities, setCities] = useState([]);
    const [selectedZoneIds, setSelectedZoneIds] = useState([]);
    const [zones, setZones] = useState([]);
    const [wards, setWards] = useState([]); // List of Kothis available for assignment
    const [selectedWardIds, setSelectedWardIds] = useState([]);
    const [editingSector, setEditingSector] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [cityScopeAll, setCityScopeAll] = useState(false);
    const singleCityMode = !cityScopeAll && cities.length === 1;

    // Resizable columns state
    const [columnWidths, setColumnWidths] = useState({
        sno: 60,
        details: 200,
        zone: 150,
        kothis: 300,
        actions: 120,
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
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        return { withCredentials: true, headers };
    }, []);

    const fetchCities = useCallback(async () => {
        try {
            const response = await axios.get(ALLOWED_CITIES_ENDPOINT, buildRequestConfig());
            const payload = response.data || {};
            const cityList = Array.isArray(payload.cities) ? payload.cities : (Array.isArray(payload) ? payload : []);
            setCityScopeAll(Boolean(payload.all));
            setCities(cityList);
            if (!payload.all && cityList.length === 1) {
                setSelectedCity(String(cityList[0].city_id));
            }
        } catch (error) {
            console.error("Error fetching cities:", error);
        }
    }, [buildRequestConfig]);

    const fetchZones = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/zones`, buildRequestConfig());
            setZones(response.data);
        } catch (error) {
            console.error("Error fetching zones:", error);
        }
    }, [buildRequestConfig]);

    const fetchKothis = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/wards`, buildRequestConfig());
            const formatted = response.data.flatMap(city =>
                city.zones.flatMap(zone =>
                    zone.wards.map(ward => ({
                        ward_id: ward.wardId,
                        ward_name: ward.wardName,
                        zone_id: zone.zoneId,
                        zone_name: zone.zone,
                        city_id: city.cityId
                    }))
                )
            );
            setWards(formatted);
        } catch (error) {
            console.error("Error fetching kothis (wards):", error);
        }
    }, [buildRequestConfig]);

    const fetchSectors = useCallback(async () => {
        try {
            const response = await axios.get(apiUrl, buildRequestConfig());
            const formatted = response.data.flatMap(city =>
                city.zones.flatMap(zone =>
                    zone.sectors.map(sector => ({
                        sector_id: sector.sectorId,
                        sector_name: sector.sectorName,
                        kothis: sector.kothis,
                        zone_id: zone.zoneId,
                        zone_name: zone.zone,
                        city_id: city.cityId,
                        city_name: city.city
                    }))
                )
            );
            setSectors(formatted);
            setFilteredSectors(formatted);
        } catch (error) {
            console.error("Error fetching sectors (wards):", error);
            setErrorMessage("Failed to load wards.");
        }
    }, [buildRequestConfig]);

    useEffect(() => {
        fetchCities();
        fetchZones();
        fetchKothis();
        fetchSectors();
    }, [fetchCities, fetchZones, fetchKothis, fetchSectors]);

    const handleZoneToggle = (zoneId) => {
        setSelectedZoneIds(prev =>
            prev.includes(zoneId) ? prev.filter(id => id !== zoneId) : [...prev, zoneId]
        );
    };

    const handleWardToggle = (wardId) => {
        setSelectedWardIds(prev =>
            prev.includes(wardId) ? prev.filter(id => id !== wardId) : [...prev, wardId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("");

        if (!selectedCity || selectedZoneIds.length === 0 || !sectorName) {
            setErrorMessage("Please fill all required fields (City, at least one Zone, and Ward Name).");
            return;
        }

        try {
            const payload = {
                sector_name: sectorName,
                zone_id: selectedZoneIds[0], // Use first selected zone as primary
                ward_ids: selectedWardIds
            };

            if (editingSector) {
                await axios.put(`${apiUrl}/${editingSector.sector_id}`, payload, buildRequestConfig());
            } else {
                await axios.post(apiUrl, payload, buildRequestConfig());
            }
            resetForm();
            fetchSectors();
            Swal.fire("Success!", `Ward ${editingSector ? "updated" : "added"} successfully.`, "success");
        } catch (error) {
            console.error("Error saving sector:", error);
            setErrorMessage("Error saving ward. Please try again.");
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to undo this action!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
        });

        if (!result.isConfirmed) return;

        try {
            await axios.delete(`${apiUrl}/${id}`, buildRequestConfig());
            fetchSectors();
            Swal.fire("Deleted!", "The Ward has been removed.", "success");
        } catch (error) {
            Swal.fire("Error!", "Something went wrong.", "error");
        }
    };

    const handleEdit = (sector) => {
        setEditingSector(sector);
        setSectorName(sector.sector_name);
        setSelectedCity(sector.city_id.toString());
        setSelectedZoneIds([sector.zone_id.toString()]);
        setSelectedWardIds(sector.kothis.map(k => k.wardId));
    };

    const resetForm = () => {
        setSectorName("");
        setSelectedWardIds([]);
        setSelectedZoneIds([]);
        setEditingSector(null);
    };

    useEffect(() => {
    let filtered = sectors;
    if (selectedCity) filtered = filtered.filter(s => s.city_id === parseInt(selectedCity));
    if (selectedZoneIds.length > 0) filtered = filtered.filter(s => selectedZoneIds.includes(s.zone_id.toString()));
    
    // Naturally sort the wards/sectors by name 
    filtered.sort((a, b) => a.sector_name.localeCompare(b.sector_name, undefined, { numeric: true, sensitivity: 'base' }));
    
    setFilteredSectors(filtered);
  }, [selectedCity, selectedZoneIds, sectors]);

    const availableKothis = wards
        .filter(w =>
            w.city_id === parseInt(selectedCity) &&
            (selectedZoneIds.length === 0 || selectedZoneIds.includes(w.zone_id.toString()))
        )
        .sort((a, b) => a.ward_name.localeCompare(b.ward_name, undefined, { numeric: true, sensitivity: 'base' }));

    const availableZonesInCity = zones
        .filter(z => z.city_id === parseInt(selectedCity))
        .sort((a, b) => (a.zone_name || "").localeCompare(b.zone_name || "", undefined, { numeric: true, sensitivity: 'base' }));

    // Group available kothis by zone for easier navigation
    const groupedKothis = availableKothis.reduce((acc, k) => {
        const zName = k.zone_name || "Unknown Zone";
        if (!acc[zName]) acc[zName] = [];
        acc[zName].push(k);
        return acc;
    }, {});

    return (
        <div className="max-w-4xl mx-auto text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-2 text-xl font-bold mb-4 text-slate-800 dark:text-white">
                <MapPin size={20} className="text-blue-600" /> Manage Wards
            </div>

            {errorMessage && (
                <div className="
text-red-600
dark:text-red-400

mb-3

bg-red-50
dark:bg-red-950/30

border
border-red-100
dark:border-red-900

p-2
rounded

flex
items-center
gap-2
">
                    <AlertCircle size={16} /> {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="
bg-slate-50
dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

p-6
mb-8

rounded-xl

shadow-sm
dark:shadow-slate-950/30

space-y-4
">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-slate-200">Select City</label>
                        <select value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); setSelectedZoneIds([]); setSelectedWardIds([]); }} className="
p-2.5

border
border-slate-300
dark:border-slate-700

rounded-lg
w-full

bg-white
dark:bg-slate-800

text-slate-800
dark:text-white

transition

focus:ring-2
focus:ring-blue-500
outline-none
" required disabled={singleCityMode}>
                            <option value="">Choose a City</option>
                            {cities.map(c => <option
  key={c.city_id}
  value={c.city_id}
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
>{c.city_name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1 col-span-full">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                            Select Zones
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setSelectedZoneIds(availableZonesInCity.map(z => z.zone_id.toString()))} className="text-[10px] text-blue-600 hover:underline">Select All</button>
                                <button type="button" onClick={() => setSelectedZoneIds([])} className="text-[10px] text-slate-500 hover:underline">Clear All</button>
                            </div>
                        </label>
                        <div className="
border
border-slate-200
dark:border-slate-700

bg-white
dark:bg-slate-800

rounded-lg

p-3

max-h-40
overflow-y-auto

grid
grid-cols-1
sm:grid-cols-2
lg:grid-cols-3

gap-2
">
                            {!selectedCity ? (
                                <div className="col-span-full py-4 text-center text-slate-400 dark:text-slate-500 dark:text-slate-500 italic text-sm">Please select a city to see zones</div>
                            ) : availableZonesInCity.length === 0 ? (
                                <div className="col-span-full py-4 text-center text-slate-400 dark:text-slate-500 dark:text-slate-500 italic text-sm">No zones found</div>
                            ) : (
                                availableZonesInCity.map(z => (
                                    <div
                                        key={z.zone_id}
                                        onClick={() => handleZoneToggle(z.zone_id.toString())}
                                        className={`flex items-center gap-2 p-1.5 rounded-md border cursor-pointer transition ${selectedZoneIds.includes(z.zone_id.toString())
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-100 dark:border-slate-700"
                                            }`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${selectedZoneIds.includes(z.zone_id.toString()) ? "bg-emerald-600 border-emerald-600" : "bg-white dark:bg-slate-900"}`}>
                                            {selectedZoneIds.includes(z.zone_id.toString()) && <CheckCircle2 size={10} className="text-white" />}
                                        </div>
                                        <span className="text-xs font-medium truncate">{z.zone_name}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-slate-200">Ward Name</label>
                    <input type="text" value={sectorName} onChange={(e) => setSectorName(e.target.value)} placeholder="Enter Ward Name (e.g., Ward 01)" className="
p-2.5

border
border-slate-300
dark:border-slate-700

rounded-lg
w-full

bg-white
dark:bg-slate-800

text-slate-800
dark:text-white

placeholder:text-slate-400
dark:placeholder:text-slate-500

transition

focus:ring-2
focus:ring-blue-500

outline-none
" required />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                        Assign Kothis to this Ward
                        <span className="text-xs font-normal text-slate-500">{selectedWardIds.length} Selected</span>
                    </label>

                    <div className="
border
border-slate-200
dark:border-slate-700

bg-white
dark:bg-slate-800

rounded-lg

p-4

max-h-64
overflow-y-auto

space-y-4
">
                        {!selectedCity ? (
                            <div className="py-4 text-center text-slate-400 dark:text-slate-500 dark:text-slate-500 italic text-sm">Please select a city to see available Kothis</div>
                        ) : availableKothis.length === 0 ? (
                            <div className="py-4 text-center text-slate-400 dark:text-slate-500 dark:text-slate-500 italic text-sm">No Kothis found in this city</div>
                        ) : (
                            Object.keys(groupedKothis).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map((zoneName) => {
                                const kothis = groupedKothis[zoneName];
                                return (
                                <div key={zoneName} className="space-y-2">
                                    <h5 className="
text-xs
font-bold

text-slate-500
dark:text-slate-400

uppercase
tracking-wider

border-b
border-slate-200
dark:border-slate-700

pb-1
">{zoneName}</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {kothis.map(ward => (
                                            <div
                                                key={ward.ward_id}
                                                onClick={() => handleWardToggle(ward.ward_id)}
                                                className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition ${selectedWardIds.includes(ward.ward_id)
                                                    ? "bg-blue-50 border-blue-200 text-blue-700"
                                                    : "hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-100 dark:border-slate-700"
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${selectedWardIds.includes(ward.ward_id) ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-slate-900"
                                                    }`}>
                                                    {selectedWardIds.includes(ward.ward_id) && <CheckCircle2 size={12} className="text-white" />}
                                                </div>
                                                <span className="text-sm font-medium">{ward.ward_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <button type="submit" className={`px-6 py-2.5 rounded-lg font-semibold shadow-sm transition ${selectedZoneIds.length > 0 && sectorName ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-300 text-slate-500 cursor-not-allowed"}`} disabled={selectedZoneIds.length === 0 || !sectorName}>
                        {editingSector ? "Update Ward" : "Create Ward"}
                    </button>
                    <button type="button" onClick={() => { resetForm(); setSelectedCity(""); }} className="
bg-white
dark:bg-slate-800

border
border-slate-200
dark:border-slate-700

text-slate-600
dark:text-slate-300

px-6
py-2.5

rounded-lg

hover:bg-slate-50
dark:hover:bg-slate-700

transition
">Reset</button>
                </div>
            </form>

            <div className="space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    Existing Wards
                    <span className="
bg-slate-200
dark:bg-slate-700

text-slate-600
dark:text-slate-300

text-xs

px-2
py-0.5

rounded-full
">{filteredSectors.length}</span>
                </h4>

                <div className="
bg-white
dark:bg-slate-900

shadow-sm
dark:shadow-slate-950/30

border
border-slate-200
dark:border-slate-700

rounded-xl
overflow-hidden
">
                    <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <th className="p-4 text-sm font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 relative select-none" style={{ width: columnWidths.sno }}>
                                    S.No
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, "sno")}
                                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-slate-300 hover:bg-blue-500 hover:w-2 transition-all z-10"
                                        title="Drag to resize"
                                    />
                                </th>
                                <th className="p-4 text-sm font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 relative select-none" style={{ width: columnWidths.details }}>
                                    Ward Details
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, "details")}
                                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-slate-300 hover:bg-blue-500 hover:w-2 transition-all z-10"
                                        title="Drag to resize"
                                    />
                                </th>
                                <th className="p-4 text-sm font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 relative select-none" style={{ width: columnWidths.zone }}>
                                    Zone
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, "zone")}
                                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-slate-300 hover:bg-blue-500 hover:w-2 transition-all z-10"
                                        title="Drag to resize"
                                    />
                                </th>
                                <th className="p-4 text-sm font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 relative select-none" style={{ width: columnWidths.kothis }}>
                                    Assigned Kothis
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, "kothis")}
                                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-slate-300 hover:bg-blue-500 hover:w-2 transition-all z-10"
                                        title="Drag to resize"
                                    />
                                </th>
                                <th className="p-4 text-sm font-bold text-slate-700 dark:text-slate-200 text-right relative select-none" style={{ width: columnWidths.actions }}>
                                    Actions
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, "actions")}
                                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize bg-slate-300 hover:bg-blue-500 hover:w-2 transition-all z-10"
                                        title="Drag to resize"
                                    />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSectors.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-400 dark:text-slate-500 dark:text-slate-500 italic">No wards found matching your selection.</td>
                                </tr>
                            ) : (
                                filteredSectors.map((s, index) => (
                                    <tr key={s.sector_id} className="
border-b
border-slate-100
dark:border-slate-700

hover:bg-slate-50
dark:hover:bg-slate-800

transition
">
                                        <td className="p-4 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap text-sm font-medium text-slate-500" title={index + 1}>{index + 1}</td>
                                        <td className="p-4 border-r border-slate-100 truncate overflow-hidden whitespace-nowrap">
                                            <div className="font-bold text-slate-800 dark:text-white text-sm" title={s.sector_name}>{s.sector_name}</div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400" title={s.city_name}>{s.city_name}</div>
                                        </td>
                                        <td className="p-4 border-r border-slate-100 text-sm text-slate-600 truncate overflow-hidden whitespace-nowrap" title={s.zone_name}>{s.zone_name}</td>
                                        <td className="p-4 border-r border-slate-100">
                                            <div className="flex flex-wrap gap-1">
                                                {s.kothis.length > 0 ? (
                                                    s.kothis.map(k => (
                                                        <span key={k.wardId} className="
bg-blue-50
dark:bg-blue-900/20

text-blue-600
dark:text-blue-300

text-[9px]

px-1
py-0.5

rounded

border
border-blue-100
dark:border-blue-800

uppercase
whitespace-nowrap
">
                                                            {k.wardName}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 italic">None</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <button onClick={() => handleEdit(s)} className="
text-amber-600
dark:text-amber-400

hover:bg-amber-50
dark:hover:bg-amber-900/20

p-1.5
rounded

transition
mr-0.5
" title="Edit"><Pencil size={16} /></button>
                                            <button onClick={() => handleDelete(s.sector_id)} className="
text-red-600
dark:text-red-400

hover:bg-red-50
dark:hover:bg-red-900/20

p-1.5
rounded

transition
" title="Delete"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default CreateSubWard;
