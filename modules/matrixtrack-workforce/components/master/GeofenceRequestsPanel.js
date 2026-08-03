import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { MapPin, Clock, CheckCircle2, XCircle, User, RefreshCw, Map, Trash } from "lucide-react";
import Swal from "sweetalert2";
import API_BASE_URL from "../../config";

const GeofenceRequestsPanel = ({ onApproved }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("pending");

    const buildConfig = () => {
        const token = localStorage.getItem("token");
        return { headers: { Authorization: `Bearer ${token}` } };
    };

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/geofencing/requests`, buildConfig());
            setRequests(res.data);
        } catch (err) {
            console.error("Error fetching geofence requests:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleReview = async (id, status, supervisorName) => {
        const action = status === "approved" ? "Approve" : "Reject";
        const result = await Swal.fire({
            title: `${action} Request?`,
            text: `Are you sure you want to ${action.toLowerCase()} the geo-fence request from ${supervisorName}?`,
            icon: status === "approved" ? "question" : "warning",
            showCancelButton: true,
            confirmButtonColor: status === "approved" ? "#22c55e" : "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: `Yes, ${action}!`,
        });

        if (!result.isConfirmed) return;

        try {
            await axios.patch(`${API_BASE_URL}/api/geofencing/requests/${id}`, { status }, buildConfig());
            fetchRequests();

            // Notify parent to switch tabs and select this ward
            if (status === "approved" && onApproved) {
                const req = requests.find(r => r.id === id);
                if (req) {
                    onApproved({
                        cityId: req.city_id,
                        zoneId: req.zone_id,
                        wardId: req.ward_id
                    });
                }
            }

            Swal.fire({
                icon: status === "approved" ? "success" : "info",
                title: `Request ${status === "approved" ? "Approved" : "Rejected"}`,
                text: status === "approved"
                    ? "The geofence has been auto-created! You can now see and manage it in the 'GeoFencing Locked' tab."
                    : "The request has been rejected.",
                timer: 3500,
                showConfirmButton: true,
                confirmButtonText: "Got it!"
            });
        } catch (err) {
            Swal.fire("Error", "Failed to update request. Please try again.", "error");
        }
    };

    const handleDelete = async (id, supervisorName) => {
        const result = await Swal.fire({
            title: "Delete this approved request?",
            text: `${supervisorName} will be able to re-apply after deletion.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, delete it",
        });

        if (!result.isConfirmed) return;

        try {
            await axios.delete(`${API_BASE_URL}/api/geofencing/requests/${id}`, buildConfig());
            fetchRequests();
            Swal.fire("Deleted", "The request was removed permanently.", "success");
        } catch (err) {
            Swal.fire("Error", "Failed to delete request. Please try again.", "error");
        }
    };

    const filtered = requests.filter(r => filter === "all" ? true : r.status === filter);
    const pendingCount = requests.filter(r => r.status === "pending").length;
    const approvedCount = requests.filter(r => r.status === "approved").length;

    const statusBadge = (status) => {
        const map = {
            pending: "bg-amber-50 text-amber-700 border border-amber-200",
            approved: "bg-green-50 text-green-700 border border-green-200",
            rejected: "bg-red-50 text-red-700 border border-red-200",
        };
        return map[status] || "bg-gray-50 text-gray-600";
    };

    return (
        <div className="space-y-6 text-slate-800 dark:text-slate-100">
            {/* Header */}
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
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="
p-3

bg-orange-100
dark:bg-orange-900/20

rounded-lg

text-orange-600
dark:text-orange-400
">
                            <Map size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Geofence Requests</h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Supervisors requesting geo-fence configuration</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {pendingCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                {pendingCount} Pending
                            </span>
                        )}
                        {approvedCount > 0 && (
                            <span className="
bg-emerald-500/20
dark:bg-emerald-900/20

text-emerald-700
dark:text-emerald-400

border
border-emerald-200
dark:border-emerald-800

text-[11px]
font-bold

px-2.5
py-1

rounded-full
">
                                {approvedCount} Approved
                            </span>
                        )}
                        <span className="text-[10px] text-gray-400 dark:text-slate-500">Total: {requests.length}</span>
                        <button
                            onClick={fetchRequests}
                            className="
p-2

text-gray-500
dark:text-slate-400

hover:bg-gray-100
dark:hover:bg-slate-800

rounded-lg

transition-colors
"
                            title="Refresh"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="
flex
gap-2

border-b
border-gray-100
dark:border-slate-700

pb-4
">
                    {[
                        { key: "pending", label: "Pending" },
                        { key: "approved", label: "Approved" },
                        { key: "rejected", label: "Rejected" },
                        { key: "all", label: "All" },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${filter === f.key
                                ? "bg-blue-600 text-white shadow"
                                : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                                }`}
                        >
                            {f.label}
                            {f.key === "pending" && pendingCount > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                    {pendingCount}
                                </span>
                            )}
                            {f.key === "approved" && approvedCount > 0 && (
                                <span className="ml-2 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                    {approvedCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Requests List */}
            {loading ? (
                <div className="
flex
items-center
justify-center

p-16

bg-white
dark:bg-slate-900

rounded-xl

shadow
dark:shadow-slate-950/30

border
border-gray-100
dark:border-slate-700
">
                    <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-500 dark:text-slate-400 font-medium">Loading requests...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="
flex
flex-col
items-center
justify-center

p-16

bg-white
dark:bg-slate-900

rounded-xl

shadow
dark:shadow-slate-950/30

border
border-gray-100
dark:border-slate-700

text-gray-400
dark:text-slate-500
">
                    <MapPin size={48} className="opacity-20 mb-4" />
                    <p className="font-bold text-gray-500">No {filter !== "all" ? filter : ""} requests</p>
                    <p className="text-sm mt-1">When supervisors request geo-fence setup, they'll appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(req => (
                        <div key={req.id} className="
bg-white
dark:bg-slate-900

rounded-xl

shadow
dark:shadow-slate-950/30

border
border-gray-100
dark:border-slate-700

overflow-hidden

hover:shadow-md

transition-shadow
">
                            <div className="flex gap-5 p-5">
                                {/* Photo */}
                                <div className="shrink-0">
                                    {req.photo_url ? (
                                        <img
                                            src={`${API_BASE_URL}${req.photo_url}`}
                                            alt={req.supervisor_name}
                                            className="
w-20
h-20

rounded-xl
object-cover

border-2
border-gray-100
dark:border-slate-700

shadow-sm
"
                                        />
                                    ) : (
                                        <div className="
w-20
h-20

rounded-xl

bg-gradient-to-br
from-blue-100
to-indigo-100

dark:from-slate-800
dark:to-slate-700

flex
items-center
justify-center

border-2
border-gray-100
dark:border-slate-700
">
                                            <User size={32} className="text-indigo-400" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-white text-lg">{req.supervisor_name}</h3>
                                            {req.emp_name && (
                                                <p className="text-sm text-gray-500 dark:text-slate-400">Employee: {req.emp_name} ({req.emp_code})</p>
                                            )}
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${statusBadge(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </div>

                                    <div className="mt-2.5 flex items-center flex-wrap gap-2 text-sm">
                                        {req.city_name && (
                                            <div className="
flex
items-center
gap-1.5

bg-gray-50
dark:bg-slate-800

px-2.5
py-1

rounded-md

border
border-gray-100
dark:border-slate-700
">
                                                <span className="text-gray-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">City</span>
                                                <span className="text-gray-700 dark:text-slate-200 font-semibold text-xs">{req.city_name}</span>
                                            </div>
                                        )}
                                        {req.zone_name && (
                                            <div className="
flex
items-center
gap-1.5

bg-gray-50
dark:bg-slate-800

px-2.5
py-1

rounded-md

border
border-gray-100
dark:border-slate-700
">
                                                <span className="text-gray-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">Zone</span>
                                                <span className="text-gray-700 dark:text-slate-200 font-semibold text-xs">{req.zone_name}</span>
                                            </div>
                                        )}
                                        {req.ward_name && (
                                            <div className="
flex
items-center
gap-1.5

bg-gray-50
dark:bg-slate-800

px-2.5
py-1

rounded-md

border
border-gray-100
dark:border-slate-700
">
                                                <span className="text-gray-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider">Kothi</span>
                                                <span className="text-gray-700 dark:text-slate-200 font-semibold text-xs">{req.ward_name}</span>
                                            </div>
                                        )}
                                    </div>

                                    {req.message && (
                                        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400 italic">"{req.message}"</p>
                                    )}

                                    <div className="mt-2 flex items-center gap-1.5 text-gray-400 dark:text-slate-500 text-xs">
                                        <Clock size={12} />
                                        {new Date(req.created_at).toLocaleString("en-IN")}
                                    </div>

                                    <div className="
mt-3

grid
grid-cols-1
sm:grid-cols-2

gap-y-2
gap-x-4

border-t
border-gray-50
dark:border-slate-700

pt-3
">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded text-green-600 dark:text-green-400">
                                                <User size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-wider">Mobile</p>
                                                <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">{req.phone_number || "N/A"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400">
                                                <MapPin size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-wider">Coordinates</p>
                                                <p className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                                                    {req.latitude && req.longitude ? `${req.latitude}, ${req.longitude}` : "Location not captured"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex border-t border-gray-50 dark:border-slate-700">
                                {req.status === "pending" ? (
                                    <>
                                        <button
                                            onClick={() => handleReview(req.id, "rejected", req.supervisor_name)}
                                            className="
flex-1
flex
items-center
justify-center
gap-2

py-3

text-sm
font-semibold

text-red-500
dark:text-red-400

hover:bg-red-50
dark:hover:bg-red-900/20

transition-colors

border-r
border-gray-100
dark:border-slate-700
"
                                        >
                                            <XCircle size={16} /> Reject
                                        </button>
                                        <button
                                            onClick={() => handleReview(req.id, "approved", req.supervisor_name)}
                                            className="
flex-1
flex
items-center
justify-center
gap-2

py-3

text-sm
font-semibold

text-green-600
dark:text-green-400

hover:bg-green-50
dark:hover:bg-green-900/20

transition-colors
"
                                        >
                                            <CheckCircle2 size={16} /> Approve & Configure
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleDelete(req.id, req.supervisor_name)}
                                        className="
flex-1
flex
items-center
justify-center
gap-2

py-3

text-sm
font-semibold

text-rose-600
dark:text-rose-400

hover:bg-rose-50
dark:hover:bg-rose-900/20

transition-colors
"
                                        title="Delete request permanently so user can re-apply"
                                    >
                                        <Trash size={16} /> Delete Permanently
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GeofenceRequestsPanel;
