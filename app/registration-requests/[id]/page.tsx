'use client';

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CityModulesApi, RegistrationApi, ApiError } from "@lib/apiClient";

type Request = {
    id: string;
    name: string;
    email: string;
    phone: string;
    aadhaar: string;
    status: string;
    createdAt: string;
    zoneId?: string;
    wardId?: string;
};

const ROLE_OPTIONS: Array<"EMPLOYEE" | "QC" | "ACTION_OFFICER"> = ["EMPLOYEE", "QC", "ACTION_OFFICER"];

export default function RegistrationRequestDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [request, setRequest] = useState<Request | null>(null);
    const [modules, setModules] = useState<{ id: string; key: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [processing, setProcessing] = useState(false);

    // Approval form state
    const [role, setRole] = useState<"EMPLOYEE" | "QC" | "ACTION_OFFICER" | "">("");
    const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError("");
            try {
                const [reqs, mods] = await Promise.all([RegistrationApi.listRequests(), CityModulesApi.list()]);
                const found = reqs.requests.find(r => r.id === params.id);
                if (found) {
                    setRequest(found as Request);
                } else {
                    setError("Request not found");
                }
                setModules(mods);
            } catch (err) {
                setError("Failed to load request details");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [params.id]);

    const toggleModule = (id: string) => {
        const next = new Set(selectedModuleIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedModuleIds(next);
    };

    const onApprove = async () => {
        if (!role || selectedModuleIds.size === 0 || !request) return;
        setProcessing(true);
        try {
            await RegistrationApi.approve(request.id, {
                role: role as any,
                moduleKeys: modules.filter((m) => selectedModuleIds.has(m.id)).map((m) => m.key.toUpperCase())
            });
            router.push("/registration-requests"); // Go back to list
        } catch (err: any) {
            alert("Failed to approve: " + (err.message || "Unknown error"));
        } finally {
            setProcessing(false);
        }
    };

    const onReject = async () => {
        if (!request) return;
        if (!confirm("Are you sure you want to reject this request?")) return;
        setProcessing(true);
        try {
            await RegistrationApi.reject(request.id);
            router.push("/registration-requests");
        } catch (err: any) {
            alert("Failed to reject: " + (err.message || "Unknown error"));
        } finally {
            setProcessing(false);
        }
    };

    const isValid = useMemo(() => role && selectedModuleIds.size > 0, [role, selectedModuleIds]);

    if (loading) return <div className="page muted">Loading...</div>;
    if (!request) return <div className="page alert error">{error || "Request not found"}</div>;

    return (
        <div className="page">
            <div className="flex items-center gap-2 mb-4">
                <button className="btn btn-sm btn-ghost" onClick={() => router.back()}>← Back</button>
                <h1>Request Details</h1>
            </div>

            <div className="card max-w-2xl">
                <div className="flex justify-between items-start">
                    <div>
                        <h2>{request.name}</h2>
                        <div className={`badge ${request.status === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>
                            {request.status}
                        </div>
                    </div>
                    <div className="text-right muted text-sm">
                        Requested {new Date(request.createdAt).toLocaleString()}
                    </div>
                </div>

                <div className="grid grid-2 gap-4 mt-6">
                    <div>
                        <label className="label">Email</label>
                        <div className="font-semibold">{request.email}</div>
                    </div>
                    <div>
                        <label className="label">Phone</label>
                        <div className="font-semibold">{request.phone}</div>
                    </div>
                    <div>
                        <label className="label">Aadhaar</label>
                        <div className="font-semibold">{request.aadhaar}</div>
                    </div>
                </div>

                {request.status === "PENDING" && (
                    <div className="mt-8 pt-8 border-t border-base-200">
                        <h3>Process Request</h3>

                        <div className="form-control mb-4">
                            <label className="label">Assign Role</label>
                            <select
                                className="select select-bordered"
                                value={role}
                                onChange={(e) => setRole(e.target.value as any)}
                            >
                                <option value="">Select Role...</option>
                                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>

                        <div className="form-control mb-6">
                            <label className="label">Assign Modules</label>
                            <div className="flex flex-wrap gap-2">
                                {modules.map(m => (
                                    <label key={m.id} className={`btn btn-sm ${selectedModuleIds.has(m.id) ? 'btn-primary' : 'btn-outline'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={selectedModuleIds.has(m.id)}
                                            onChange={() => toggleModule(m.id)}
                                        />
                                        {m.name}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                className="btn btn-primary flex-1"
                                disabled={!isValid || processing}
                                onClick={onApprove}
                            >
                                {processing ? "Processing..." : "Approve & Create User"}
                            </button>
                            <button
                                className="btn btn-error btn-outline"
                                disabled={processing}
                                onClick={onReject}
                            >
                                Reject Request
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
