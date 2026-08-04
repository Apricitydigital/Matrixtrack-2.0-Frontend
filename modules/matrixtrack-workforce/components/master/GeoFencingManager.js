import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { MapPin, Plus, Trash2, Save, AlertCircle, CheckCircle2, Navigation } from "lucide-react";
import API_BASE_URL from "../../config";
import Swal from "sweetalert2";

const GeoFencingManager = ({ initialConfig }) => {
    const [cities, setCities] = useState([]);
    const [selectedCity, setSelectedCity] = useState(initialConfig?.cityId ? String(initialConfig.cityId) : "");
    const [zones, setZones] = useState([]);
    const [selectedZone, setSelectedZone] = useState(initialConfig?.zoneId ? String(initialConfig.zoneId) : "");
    const [wards, setWards] = useState([]);
    const [selectedWard, setSelectedWard] = useState(initialConfig?.wardId ? String(initialConfig.wardId) : "");

    const [geoFences, setGeoFences] = useState([
        { latitude: "", longitude: "", radius: "", unit: "meters" }
    ]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [summaries, setSummaries] = useState([]);

    const buildRequestConfig = useCallback(() => {
        const token = localStorage.getItem("token");
        return {
            headers: { Authorization: `Bearer ${token}` }
        };
    }, []);

    const fetchSummaries = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/geofencing/summary`, buildRequestConfig());
            setSummaries(response.data);
        } catch (err) {
            console.error("Error fetching summaries:", err);
        }
    }, [buildRequestConfig]);

    const fetchCities = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/cities`, buildRequestConfig());
            setCities(Array.isArray(response.data) ? response.data : response.data.cities || []);
        } catch (err) {
            console.error("Error fetching cities:", err);
        }
    }, [buildRequestConfig]);

    const fetchZones = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/zones`, buildRequestConfig());
            setZones(response.data);
        } catch (err) {
            console.error("Error fetching zones:", err);
        }
    }, [buildRequestConfig]);

    const fetchWards = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/wards`, buildRequestConfig());
            const flattenedWards = response.data.flatMap(city =>
                city.zones.flatMap(zone =>
                    zone.wards.map(ward => ({
                        ward_id: ward.wardId,
                        ward_name: ward.wardName,
                        zone_id: zone.zoneId,
                        city_id: city.cityId
                    }))
                )
            );
            setWards(flattenedWards);
        } catch (err) {
            console.error("Error fetching wards:", err);
        }
    }, [buildRequestConfig]);

    const fetchGeoFencing = useCallback(async (zoneId, wardId) => {
        if (!zoneId && !wardId) return;
        setLoading(true);
        setError("");
        try {
            let url = `${API_BASE_URL}/api/geofencing`;
            if (wardId) {
                url += `?wardId=${wardId}`;
            } else {
                url += `?zoneId=${zoneId}`;
            }

            const response = await axios.get(url, buildRequestConfig());
            if (response.data && response.data.length > 0) {
                setGeoFences(response.data.map(f => ({
                    latitude: f.latitude,
                    longitude: f.longitude,
                    radius: f.radius,
                    unit: f.unit
                })));
            } else {
                setGeoFences([{ latitude: "", longitude: "", radius: "", unit: "meters" }]);
            }
        } catch (err) {
            setGeoFences([{ latitude: "", longitude: "", radius: "", unit: "meters" }]);
        } finally {
            setLoading(false);
        }
    }, [buildRequestConfig]);

    useEffect(() => {
        fetchCities();
        fetchZones();
        fetchWards();
        fetchSummaries();
    }, [fetchCities, fetchZones, fetchWards, fetchSummaries]);

    useEffect(() => {
        if (selectedWard) {
            fetchGeoFencing(null, selectedWard);
        } else if (selectedZone) {
            fetchGeoFencing(selectedZone, null);
        } else {
            setGeoFences([{ latitude: "", longitude: "", radius: "", unit: "meters" }]);
        }
    }, [selectedZone, selectedWard, fetchGeoFencing]);

    const handleAddRow = () => {
        setGeoFences([...geoFences, { latitude: "", longitude: "", radius: "", unit: "meters" }]);
    };

    const handleRemoveRow = (index) => {
        const newFences = geoFences.filter((_, i) => i !== index);
        if (newFences.length === 0) {
            setGeoFences([{ latitude: "", longitude: "", radius: "", unit: "meters" }]);
        } else {
            setGeoFences(newFences);
        }
    };

    const handleInputChange = (index, field, value) => {
        const newFences = [...geoFences];
        newFences[index][field] = value;
        setGeoFences(newFences);
    };

    const handleSave = async () => {
        if (!selectedZone && !selectedWard) {
            setError("Please select at least a Zone or Kothi.");
            return;
        }

        // Validate
        for (const fence of geoFences) {
            if (!fence.latitude || !fence.longitude || !fence.radius) {
                setError("Please fill all fields for all geo-fences.");
                return;
            }
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            await axios.post(`${API_BASE_URL}/api/geofencing`, {
                zone_id: selectedZone || null,
                ward_id: selectedWard || null,
                fences: geoFences
            }, buildRequestConfig());

            setSuccess("Geo-fencing updated successfully!");
            fetchSummaries();
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Geo-fencing rules saved successfully!',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (err) {
            setError(err.response?.data?.error || "Failed to save geo-fencing rules.");
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.error || "Failed to save geo-fencing rules."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGroup = async (item) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Remove all geo-fences for ${item.ward_name || item.zone_name}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete!'
        });

        if (result.isConfirmed) {
            try {
                let url = `${API_BASE_URL}/api/geofencing/group?`;
                if (item.ward_id) url += `ward_id=${item.ward_id}`;
                else url += `zone_id=${item.zone_id}`;

                await axios.delete(url, buildRequestConfig());
                fetchSummaries();
                if ((item.ward_id && String(selectedWard) === String(item.ward_id)) || (!item.ward_id && String(selectedZone) === String(item.zone_id))) {
                    setGeoFences([{ latitude: "", longitude: "", radius: "", unit: "meters" }]);
                }
                Swal.fire('Deleted!', 'Geo-fencing rules removed.', 'success');
            } catch (err) {
                Swal.fire('Error', 'Failed to delete.', 'error');
            }
        }
    };

    const handleEditGroup = (item) => {
        // Find city and zone for this item
        if (item.ward_id) {
            const ward = wards.find(w => w.ward_id === item.ward_id);
            if (ward) {
                setSelectedCity(String(ward.city_id));
                setSelectedZone(String(ward.zone_id));
                setSelectedWard(String(ward.ward_id));
            }
        } else {
            const zone = zones.find(z => z.zone_id === item.zone_id);
            if (zone) {
                setSelectedCity(String(zone.city_id));
                setSelectedZone(String(zone.zone_id));
                setSelectedWard("");
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-10 text-slate-800 dark:text-slate-100">
            <div className="
bg-white
dark:bg-slate-900

p-6

rounded-xl

shadow-lg
dark:shadow-slate-950/30

border
border-gray-100
dark:border-slate-700
">
                <div className="flex items-center gap-3 mb-6">
                    <div className="
p-3

bg-blue-100
dark:bg-blue-900/20

rounded-lg

text-blue-600
dark:text-blue-400
">
                        <Navigation size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Geo-Fencing Configuration</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400">Define allowed punch-in zones for supervisors</p>
                    </div>
                </div>

                {/* Hierarchical Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 dark:text-slate-200 mb-2">Select City</label>
                        <select
                            value={selectedCity}
                            onChange={(e) => {
                                setSelectedCity(e.target.value);
                                setSelectedZone("");
                                setSelectedWard("");
                            }}
                            className="
w-full
p-3

border
border-gray-300
dark:border-slate-700

rounded-lg

bg-white
dark:bg-slate-800

text-slate-800
dark:text-white

focus:ring-2
focus:ring-blue-500

transition-all
outline-none
"
                        >
                            <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value="">-- Choose a City --</option>
                            {cities.map((city) => (
                                <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" key={city.city_id} value={city.city_id}>
                                    {city.city_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 dark:text-slate-200 mb-2">Select Zone</label>
                        <select
                            value={selectedZone}
                            onChange={(e) => {
                                setSelectedZone(e.target.value);
                                setSelectedWard("");
                            }}
                            disabled={!selectedCity}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none disabled:bg-gray-50
dark:disabled:bg-slate-800

disabled:text-gray-400 dark:text-slate-500
dark:disabled:text-slate-500"
                        >
                            <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value="">-- Choose a Zone --</option>
                            {zones
                                .filter(z => z.city_id === parseInt(selectedCity))
                                .map((zone) => (
                                    <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" key={zone.zone_id} value={zone.zone_id}>
                                        {zone.zone_name}
                                    </option>
                                ))}
                        </select>
                        {!selectedCity && <p className="text-[10px] text-gray-400 dark:text-slate-500 dark:text-slate-500 mt-1 pl-1 italic">Select a city first</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 dark:text-slate-200 mb-2">Select Kothi</label>
                        <select
                            value={selectedWard}
                            onChange={(e) => setSelectedWard(e.target.value)}
                            disabled={!selectedZone}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none disabled:bg-gray-50
dark:disabled:bg-slate-800

disabled:text-gray-400 dark:text-slate-500
dark:disabled:text-slate-500"
                        >
                            <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value="">-- All Kothis (Zone Default) --</option>
                            {wards
                                .filter(w => w.zone_id === parseInt(selectedZone))
                                .map((ward) => (
                                    <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" key={ward.ward_id} value={ward.ward_id}>
                                        {ward.ward_name}
                                    </option>
                                ))}
                        </select>
                        {!selectedZone && <p className="text-[10px] text-gray-400 dark:text-slate-500 dark:text-slate-500 mt-1 pl-1 italic">Select a zone first</p>}
                    </div>
                </div>

                {(selectedZone || selectedWard) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="
flex
justify-between
items-center

bg-gray-50
dark:bg-slate-800

p-4

rounded-xl
">
                            <div>
                                <span className="font-bold text-gray-700 dark:text-slate-200 dark:text-slate-200 block">Boundary Points</span>
                                <p className="text-xs text-gray-500 dark:text-slate-400 dark:text-slate-400">Add multiple points to create overlapping safety buffers</p>
                            </div>
                            <button
                                onClick={handleAddRow}
                                className="
flex
items-center
gap-2

bg-blue-50
dark:bg-blue-900/20

hover:bg-blue-100
dark:hover:bg-blue-900/40

text-blue-600
dark:text-blue-400

px-4
py-2

rounded-lg

text-sm
font-bold

transition-all

border
border-blue-200
dark:border-blue-800
"
                            >
                                <Plus size={18} /> Add Point
                            </button>
                        </div>

                        <div className="space-y-3">
                            {geoFences.map((fence, index) => (
                                <div key={index} className="
grid
grid-cols-1
md:grid-cols-12

gap-4

p-5

border
border-gray-200
dark:border-slate-700

rounded-xl

relative
group

bg-white
dark:bg-slate-900

shadow-sm
dark:shadow-slate-950/20

hover:shadow-md

hover:border-blue-300
dark:hover:border-blue-700

transition-all
">
                                    <div className="md:col-span-4">
                                        <label className="
w-full
p-3

bg-gray-50
dark:bg-slate-800

border
border-gray-200
dark:border-slate-700

rounded-lg

focus:bg-white
dark:focus:bg-slate-900

focus:border-blue-500

transition-all
outline-none

text-sm
font-medium

text-slate-800
dark:text-white
">Latitude</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="any"
                                                value={fence.latitude}
                                                onChange={(e) => handleInputChange(index, "latitude", e.target.value)}
                                                placeholder="e.g. 28.6139"
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all outline-none text-sm font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="
w-full
p-3

bg-gray-50
dark:bg-slate-800

border
border-gray-200
dark:border-slate-700

rounded-lg

focus:bg-white
dark:focus:bg-slate-900

focus:border-blue-500

transition-all
outline-none

text-sm
font-medium

text-slate-800
dark:text-white
">Longitude</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="any"
                                                value={fence.longitude}
                                                onChange={(e) => handleInputChange(index, "longitude", e.target.value)}
                                                placeholder="e.g. 77.2090"
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-blue-500 transition-all outline-none text-sm font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="
w-full
p-3

bg-gray-50
dark:bg-slate-800

border
border-gray-200
dark:border-slate-700

rounded-lg

focus:bg-white
dark:focus:bg-slate-900

focus:border-blue-500

transition-all
outline-none

text-sm
font-medium

text-slate-800
dark:text-white
">Radius Scope</label>
                                        <div className="
flex

bg-gray-50
dark:bg-slate-800

border
border-gray-200
dark:border-slate-700

rounded-lg

overflow-hidden

focus-within:ring-2
focus-within:ring-blue-500

transition-all
">
                                            <input
                                                type="number"
                                                value={fence.radius}
                                                onChange={(e) => handleInputChange(index, "radius", e.target.value)}
                                                placeholder="Val"
                                                className="w-full p-3 bg-transparent border-none outline-none text-sm font-medium"
                                            />
                                            <select
                                                value={fence.unit}
                                                onChange={(e) => handleInputChange(index, "unit", e.target.value)}
                                                className="
p-3

bg-gray-200
dark:bg-slate-700

border-none

text-xs
font-bold

text-slate-800
dark:text-white

outline-none
cursor-pointer

hover:bg-gray-300
dark:hover:bg-slate-600

transition-colors
"
                                            >
                                                <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value="meters">MTR</option>
                                                <option
  className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white" value="kilometers">KM</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="md:col-span-1 flex items-end justify-center">
                                        <button
                                            onClick={() => handleRemoveRow(index)}
                                            className="
text-gray-300
dark:text-slate-500

hover:text-red-500
dark:hover:text-red-400

p-2

transition-colors

rounded-full

hover:bg-red-50
dark:hover:bg-red-900/20
"
                                            title="Delete point"
                                        >
                                            <Trash2 size={22} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-8 flex flex-col gap-4">
                            {error && (
                                <div className="flex items-center gap-3 text-red-700 bg-red-50 p-4 rounded-xl border border-red-200 text-sm font-medium animate-bounce">
                                    <AlertCircle size={20} className="shrink-0" /> {error}
                                </div>
                            )}
                            {success && (
                                <div className="
flex
items-center
gap-3

text-green-700
dark:text-green-400

bg-green-50
dark:bg-green-950/20

p-4

rounded-xl

border
border-green-200
dark:border-green-900

text-sm
font-medium
">
                                    <CheckCircle2 size={20} className="shrink-0" /> {success}
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className={`flex items-center justify-center gap-3 w-full py-4 rounded-xl font-black text-lg uppercase tracking-widest transition-all ${loading ? "bg-gray-400 dark:bg-slate-700 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-xl shadow-blue-200 active:scale-[0.98]"
                                    }`}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Processing...
                                    </div>
                                ) : (
                                    <>
                                        <Save size={24} /> Set Geo-Fence Configuration
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {!selectedZone && !selectedWard && (
                    <div className="flex flex-col items-center justify-center p-20 text-gray-400 dark:text-slate-500 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                        <div className="relative mb-6">
                            <MapPin size={64} className="opacity-10" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Navigation size={32} className="text-blue-200 animate-pulse" />
                            </div>
                        </div>
                        <p className="font-bold text-gray-500 dark:text-slate-400 dark:text-slate-300 mb-1">Hierarchy Selection Required</p>
                        <p className="text-sm max-w-[280px] text-center text-gray-400 dark:text-slate-500">Please choose a City, Zone, and optionally a Kothi to manage geographic boundaries.</p>
                    </div>
                )}
            </div>

            {/* Defined Fences Table */}
            <div className="bg-white
dark:bg-slate-900

rounded-xl

shadow-lg
dark:shadow-slate-950/30

border
border-gray-100
dark:border-slate-700

overflow-hidden">
                <div className="text-lg font-bold text-gray-800 dark:text-white">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Defined Geo-Fences</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400">Overview of all active geographic boundaries</p>
                    </div>
                    <div className="
bg-blue-100
dark:bg-blue-900/20

text-blue-700
dark:text-blue-400

px-3
py-1

rounded-full

text-xs
font-bold
">
                        {summaries.length} Records
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white border-b border-gray-100">
                                <th className="p-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">City</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Zone</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Kothi</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest text-center">Latitude</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest text-center">Longitude</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest text-center">Radius</th>
                                <th className="p-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                            {summaries.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-10 text-center text-gray-400 dark:text-slate-500 italic">No geo-fencing rules defined yet.</td>
                                </tr>
                            ) : (
                                summaries.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-4 text-xs font-bold text-gray-700 dark:text-slate-200">{item.city_name}</td>
                                        <td className="p-4 text-xs text-gray-600 dark:text-slate-300 font-medium">{item.zone_name}</td>
                                        <td className="p-4">
                                            {item.ward_name ? (
                                                <span className="
bg-indigo-50
dark:bg-indigo-900/20

text-indigo-700
dark:text-indigo-400

px-2
py-1

rounded-md

text-[10px]
font-bold

border
border-indigo-100
dark:border-indigo-800
">
                                                    {item.ward_name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 dark:text-slate-500 text-[10px] italic">Zone Default</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center text-xs font-mono text-gray-500 dark:text-slate-400">{parseFloat(item.latitude).toFixed(6)}</td>
                                        <td className="p-4 text-center text-xs font-mono text-gray-500 dark:text-slate-400">{parseFloat(item.longitude).toFixed(6)}</td>
                                        <td className="p-4 text-center">
                                            <span className="
bg-blue-50
dark:bg-blue-900/20

text-blue-700
dark:text-blue-400

px-2
py-0.5

rounded

text-[10px]
font-bold

border
border-blue-100
dark:border-blue-800
">
                                                {item.radius} {item.unit === 'meters' ? 'M' : 'KM'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => handleEditGroup(item)}
                                                    className="
p-1.5

text-blue-500
dark:text-blue-400

hover:bg-blue-100
dark:hover:bg-blue-900/20

rounded-lg

transition-colors
"
                                                    title="Edit rules"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteGroup(item)}
                                                    className="
p-1.5

text-red-500
dark:text-red-400

hover:bg-red-100
dark:hover:bg-red-900/20

rounded-lg

transition-colors
"
                                                    title="Delete group"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
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
};

const Pencil = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
);

export default GeoFencingManager;
