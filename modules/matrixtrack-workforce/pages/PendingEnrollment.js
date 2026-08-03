import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    Users,
    Search,
    RefreshCw,
    UserX,
    UserCheck,
    ShieldAlert,
    MapPin,
    Phone,
    Filter,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    Building2,
    Camera,
    Eye,
    X,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import Swal from "sweetalert2";
import Loader from "../components/Loader";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const PendingEnrollment = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isManualReloading, setIsManualReloading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Filters
    const [selectedCity, setSelectedCity] = useState("all");
    const [selectedZone, setSelectedZone] = useState("all");
    const [selectedWard, setSelectedWard] = useState("all");
    const [selectedKothi, setSelectedKothi] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("pending"); // default to pending

    // UI States
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [viewImageUrl, setViewImageUrl] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);

    // Camera States
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [cameraStream, setCameraStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    const fetchEnrollmentData = async (isManual = false) => {
        if (isManual) setIsManualReloading(true);
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/employees/pending-enrollment`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });
            setData(response.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching enrollment data:", err);
            setError("Failed to fetch data. Please check your connection.");
        } finally {
            setLoading(false);
            setIsManualReloading(false);
        }
    };

    useEffect(() => {
        fetchEnrollmentData();
    }, []);

    // Filter Options
    const filterOptions = useMemo(() => {
        const cities = new Set();
        const zones = new Set();
        const wards = new Set();
        const kothis = new Set();

        data.forEach(item => {
            if (item.city_name) cities.add(item.city_name);

            const matchesCity = selectedCity === "all" || item.city_name === selectedCity;
            const matchesZone = selectedZone === "all" || item.zone_name === selectedZone;
            const matchesWard = selectedWard === "all" || item.ward_name === selectedWard;

            if (matchesCity && item.zone_name) zones.add(item.zone_name);
            if (matchesCity && matchesZone && item.ward_name) wards.add(item.ward_name);
            if (matchesCity && matchesZone && matchesWard && item.kothi_name) kothis.add(item.kothi_name);
        });

        return {
            cities: Array.from(cities).sort(),
            zones: Array.from(zones).sort(),
            wards: Array.from(wards).sort(),
            kothis: Array.from(kothis).sort()
        };
    }, [data, selectedCity, selectedZone, selectedWard]);

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchesSearch =
                item.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.emp_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.supervisor_name?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCity = selectedCity === "all" || item.city_name === selectedCity;
            const matchesZone = selectedZone === "all" || item.zone_name === selectedZone;
            const matchesWard = selectedWard === "all" || item.ward_name === selectedWard;
            const matchesKothi = selectedKothi === "all" || item.kothi_name === selectedKothi;

            const matchesStatus =
                selectedStatus === "all" ? true :
                    selectedStatus === "pending" ? !item.face_registered :
                        selectedStatus === "registered" ? item.face_registered : true;

            return matchesSearch && matchesCity && matchesZone && matchesWard && matchesKothi && matchesStatus;
        });
    }, [data, searchTerm, selectedCity, selectedZone, selectedWard, selectedKothi, selectedStatus]);

    const handleCityChange = (val) => {
        setSelectedCity(val);
        setSelectedZone("all");
        setSelectedWard("all");
        setSelectedKothi("all");
    };

    const handleZoneChange = (val) => {
        setSelectedZone(val);
        setSelectedWard("all");
        setSelectedKothi("all");
    };

    const handleWardChange = (val) => {
        setSelectedWard(val);
        setSelectedKothi("all");
    };

    // Camera Logic
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: 1280, height: 720 }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraStream(stream);
        } catch (err) {
            console.error("Camera access denied:", err);
            Swal.fire("Error", "Camera access denied. Please check your browser permissions.", "error");
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
            setCapturedImage(dataUrl);
            stopCamera();
        }
    };

    const openEnrollment = (emp) => {
        setCurrentEmployee(emp);
        setIsCameraModalOpen(true);
        setCapturedImage(null);
        setTimeout(startCamera, 100);
    };

    const closeEnrollment = () => {
        stopCamera();
        setIsCameraModalOpen(false);
        setCurrentEmployee(null);
        setCapturedImage(null);
    };

    const uploadEnrollment = async () => {
        if (!capturedImage || !currentEmployee) return;

        setIsUploading(true);
        try {
            // Convert dataUrl to Blob
            const response = await fetch(capturedImage);
            const blob = await response.blob();
            const file = new File([blob], `enrollment_${currentEmployee.emp_id}.jpg`, { type: "image/jpeg" });

            const formData = new FormData();
            formData.append("image", file);
            formData.append("emp_id", currentEmployee.emp_id);

            const uploadUrl = `${API_BASE_URL}/app/attendance/employee/faceRoutes/store-face`;
            await axios.post(uploadUrl, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            Swal.fire("Success", "Face enrolled successfully!", "success");
            fetchEnrollmentData();
            closeEnrollment();
        } catch (err) {
            console.error("Enrollment failed:", err);
            const errorMsg = err.response?.data?.error || "Failed to enroll face. Please try again with a clearer photo.";
            Swal.fire("Enrollment Failed", errorMsg, "error");
        } finally {
            setIsUploading(false);
        }
    };

    // View Photo Logic
    const viewFace = async (emp) => {
        setCurrentEmployee(emp);
        setIsViewModalOpen(true);
        setViewLoading(true);
        setViewImageUrl(null);

        try {
            const proxyUrl = `${API_BASE_URL}/app/attendance/employee/faceRoutes/image/${emp.emp_id}`;
            const response = await axios.get(proxyUrl, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                responseType: "blob"
            });
            const imgUrl = URL.createObjectURL(response.data);
            setViewImageUrl(imgUrl);
        } catch (err) {
            console.error("View face failed:", err);
            Swal.fire("Error", "Could not load face image.", "error");
            setIsViewModalOpen(false);
        } finally {
            setViewLoading(false);
        }
    };

    const closeViewModal = () => {
        if (viewImageUrl && viewImageUrl.startsWith("blob:")) {
            URL.revokeObjectURL(viewImageUrl);
        }
        setIsViewModalOpen(false);
        setViewImageUrl(null);
    };

    // Pagination
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, currentPage, pageSize]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCity, selectedZone, selectedWard, selectedKothi, selectedStatus, pageSize]);

    if (loading && data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Synchronizing enrollment data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            {isManualReloading && <Loader />}
            {/* Header Section */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 opacity-50" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Biometric Registration</h1>
                        </div>
                        <p className="text-slate-500 max-w-xl">
                            Register new faces using your device camera or verify existing enrollments.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-1 flex">
                            <button
                                onClick={() => setSelectedStatus("pending")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${selectedStatus === "pending" ? "bg-amber-100 text-amber-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                Pending ({data.filter(d => !d.face_registered).length})
                            </button>
                            <button
                                onClick={() => setSelectedStatus("registered")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${selectedStatus === "registered" ? "bg-emerald-100 text-emerald-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                Verified ({data.filter(d => d.face_registered).length})
                            </button>
                            <button
                                onClick={() => setSelectedStatus("all")}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${selectedStatus === "all" ? "bg-indigo-100 text-indigo-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                            >
                                All ({data.length})
                            </button>
                        </div>
                        <button
                            onClick={() => fetchEnrollmentData(true)}
                            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 active:scale-95"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span className="font-semibold text-sm">Refresh System</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">City Scope</label>
                        <select
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700 text-sm font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
                            value={selectedCity}
                            onChange={(e) => handleCityChange(e.target.value)}
                        >
                            <option value="all">Global (All Cities)</option>
                            {filterOptions.cities.map(city => (<option key={city} value={city}>{city}</option>))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Zone</label>
                        <select
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700 text-sm font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
                            value={selectedZone}
                            onChange={(e) => handleZoneChange(e.target.value)}
                        >
                            <option value="all">All Zones</option>
                            {filterOptions.zones.map(zone => (<option key={zone} value={zone}>{zone}</option>))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Ward</label>
                        <select
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700 text-sm font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
                            value={selectedWard}
                            onChange={(e) => handleWardChange(e.target.value)}
                        >
                            <option value="all">All Wards</option>
                            {filterOptions.wards.map(ward => (<option key={ward} value={ward}>{ward}</option>))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Search Identifier</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Name or Emp Code..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700 text-sm font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-end">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl w-full px-4 py-[11px] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldAlert size={16} className="text-indigo-400" />
                                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Target</span>
                            </div>
                            <span className="text-lg font-black text-indigo-700 leading-none">{filteredData.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabular Data View */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Architecture</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supervisor</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedData.length > 0 ? (
                                paginatedData.map((emp) => (
                                    <tr key={emp.emp_id} className="hover:bg-indigo-50/30 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-900 font-bold group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{emp.employee_name}</span>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-slate-400 text-[10px] font-bold">#{emp.emp_code}</span>
                                                    {emp.employee_phone && (
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            <Phone size={10} />
                                                            <span className="text-[10px] font-bold">{emp.employee_phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold">
                                            <div className="flex flex-col gap-1 text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    <Building2 size={12} className="text-slate-300" />
                                                    {emp.city_name}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={12} className="text-slate-300" />
                                                    {emp.zone_name} • {emp.ward_name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-700 font-bold text-sm">{emp.supervisor_name}</span>
                                                <span className="text-slate-400 text-[10px] font-black tracking-widest">{emp.supervisor_code}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {emp.face_registered ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 shadow-sm">
                                                    <CheckCircle2 size={10} />
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-100 shadow-sm">
                                                    <UserX size={10} />
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {emp.face_registered ? (
                                                    <button
                                                        onClick={() => viewFace(emp)}
                                                        className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm group/btn"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => openEnrollment(emp)}
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                                                    >
                                                        <Camera size={16} />
                                                        <span className="text-xs font-bold uppercase">Enroll Face</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="py-24">
                                        <div className="flex flex-col items-center justify-center text-center opacity-40">
                                            <Users size={64} className="text-slate-200 mb-4" />
                                            <h3 className="text-xl font-bold text-slate-400">No records found</h3>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredData.length > 0 && (
                    <div className="bg-slate-50/50 border-t border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rows:</span>
                                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="bg-white border rounded-lg px-2 py-1 text-sm font-bold text-slate-700">
                                    {PAGE_SIZE_OPTIONS.map(size => (<option key={size} value={size}>{size}</option>))}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 disabled:opacity-30 bg-white border rounded-xl shadow-sm"><ChevronLeft size={20} /></button>
                            <span className="px-4 text-xs font-black text-slate-500">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="p-2 disabled:opacity-30 bg-white border rounded-xl shadow-sm"><ChevronRight size={20} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* View Modal */}
            {isViewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden relative shadow-2xl">
                        <div className="p-8 pb-0 flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{currentEmployee?.employee_name}</h3>
                                <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest mt-1">Verified Identity Profile</p>
                            </div>
                            <button onClick={closeViewModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
                        </div>
                        <div className="p-8">
                            <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border-4 border-slate-50 flex items-center justify-center relative">
                                {viewLoading ? (
                                    <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin" />
                                ) : viewImageUrl ? (
                                    <img src={viewImageUrl} alt="Verified Face" className="w-full h-full object-cover" />
                                ) : (
                                    <AlertCircle className="w-12 h-12 text-slate-300" />
                                )}
                                <div className="absolute top-4 right-4 bg-emerald-500 text-white p-2 rounded-xl shadow-lg">
                                    <CheckCircle2 size={24} />
                                </div>
                            </div>
                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee Code</p>
                                    <p className="font-bold text-slate-800 text-lg mt-1">{currentEmployee?.emp_code}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Status</p>
                                    <p className="font-bold text-emerald-600 text-lg mt-1">100% Valid</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Enrollment Modal */}
            {isCameraModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-[40px] w-full max-w-4xl overflow-hidden shadow-2xl relative">
                        <div className="flex flex-col lg:flex-row h-full">
                            {/* Camera Area */}
                            <div className="lg:w-3/5 bg-black relative flex items-center justify-center min-h-[400px]">
                                {capturedImage ? (
                                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale-0" />
                                        <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none" />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-2 border-white/50 border-dashed rounded-[60px]" />
                                    </>
                                )}

                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6">
                                    {!capturedImage ? (
                                        <button
                                            onClick={capturePhoto}
                                            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform border-8 border-white/20"
                                        >
                                            <div className="w-14 h-14 bg-red-600 rounded-full ring-2 ring-red-600 ring-offset-4 ring-offset-white" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { setCapturedImage(null); setTimeout(startCamera, 50); }}
                                            className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-bold flex items-center gap-2 shadow-xl hover:bg-slate-100 transition-colors"
                                        >
                                            <RefreshCw size={18} />
                                            Retake
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Info Area */}
                            <div className="lg:w-2/5 p-10 flex flex-col justify-between bg-white">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
                                            <Camera size={24} />
                                        </div>
                                        <button onClick={closeEnrollment} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Biometric<br />Enrollment</h3>
                                        <p className="text-slate-500 font-medium mt-2">Initialize identity profile for the selected employee.</p>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrollment Target</p>
                                            <p className="text-xl font-black text-slate-800 mt-1">{currentEmployee?.employee_name}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs font-bold text-slate-400">ID: {currentEmployee?.emp_code}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                <span className="text-xs font-bold text-slate-400">{currentEmployee?.ward_name}</span>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 mt-4 flex gap-3">
                                            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                                            <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                                                Ensure person is looking directly at camera. Avoid hats, glasses or shadows for best results.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-10 flex gap-4">
                                    <button
                                        onClick={closeEnrollment}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[20px] font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={!capturedImage || isUploading}
                                        onClick={uploadEnrollment}
                                        className="flex-[2] py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 disabled:opacity-50 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        {isUploading ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 size={16} />
                                        )}
                                        {isUploading ? "Uploading..." : "Save Identity"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Hidden canvas for capturing */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}
        </div>
    );
};

export default PendingEnrollment;
