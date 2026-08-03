"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Check, Loader2, Search, AlertCircle, Layers } from "lucide-react";
import { AreaBeatApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

interface AssignBeatModalProps {
    beat: any;
    initialSelectedSegmentIds?: string[];
    onClose: () => void;
    onSuccess: () => void;
    mode?: "SUPERVISOR" | "EMPLOYEE";
}

export default function AssignBeatModal({ beat, initialSelectedSegmentIds = [], onClose, onSuccess, mode }: AssignBeatModalProps) {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
    const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>(initialSelectedSegmentIds);
    const [isWholeBeat, setIsWholeBeat] = useState(initialSelectedSegmentIds.length === 0);

    const isCityAdmin = currentUser?.roles?.includes("CITY_ADMIN") || currentUser?.roles?.includes("HMS_SUPER_ADMIN");
    const targetRole: "SUPERVISOR" | "EMPLOYEE" = mode || (isCityAdmin ? "SUPERVISOR" : "EMPLOYEE");
    const segments = beat.segments || [];
    const allowSegmentSelection = segments.length > 0;

    useEffect(() => {
        fetchUsers();
    }, [beat.id, targetRole]);

    const fetchUsers = async () => {
        setFetching(true);
        setError(null);
        try {
            const data = await AreaBeatApi.listPotentialAssignees(beat.id, targetRole);
            setUsers(data);
        } catch (err: any) {
            console.error("Failed to fetch users", err);
            setError(err.message || "Failed to fetch potential assignees");
        } finally {
            setFetching(false);
        }
    };

    const handleAssign = async (userId: string | null) => {
        setLoading(true);
        setAssigningUserId(userId);
        setError(null);
        try {
            if (isWholeBeat) {
                await AreaBeatApi.assign(beat.id, userId as any, null, undefined, targetRole);
            } else {
                await AreaBeatApi.assign(beat.id, userId as any, null, selectedSegmentIds, targetRole);
            }
            onSuccess();
            setTimeout(() => {
                setAssigningUserId(null);
                if (userId !== null) onClose();
            }, 500);
        } catch (err: any) {
            setError(err.message || "Assignment failed");
            setAssigningUserId(null);
        } finally {
            setLoading(false);
        }
    };

    const toggleSegment = (id: string) => {
        setIsWholeBeat(false);
        setSelectedSegmentIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const filteredUsers = useMemo(() => {
        const q = search.toLowerCase();
        return users.filter((u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.phone || "").toLowerCase().includes(q)
        );
    }, [search, users]);

    const modalTitle = targetRole === "SUPERVISOR" ? "Assign Supervisor" : "Deploy Employees";
    const wholeBeatLabel = targetRole === "SUPERVISOR" ? "Assign Entire Beat" : "Deploy Full Beat";
    const wholeBeatHelp = targetRole === "SUPERVISOR"
        ? "Assign the complete beat to one supervisor, or switch below to split sub-beats across multiple supervisors."
        : "Assign all visible sub-beats to one employee in one shot.";

    return (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1001, display: "flex", justifyContent: "center", alignItems: "center", backdropFilter: "blur(4px)" }}>
            <div style={{ width: "90%", maxWidth: "560px", backgroundColor: "white", borderRadius: "20px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
                <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{modalTitle}</h3>
                        <div style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                            <Layers size={14} /> {beat.beatName}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ border: "2px solid #f1f5f9", borderRadius: "10px", padding: "8px", backgroundColor: "white", cursor: "pointer", color: "#64748b" }}><X size={20} /></button>
                </div>

                <div style={{ padding: "0 24px", flex: 1, overflowY: "auto" }}>
                    {error && (
                        <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "12px", color: "#dc2626", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px" }}>
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    <div style={{ marginTop: "24px" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                            Step 1: Select scope
                        </div>

                        <div style={{ display: "grid", gap: "12px" }}>
                            <button
                                onClick={() => { setIsWholeBeat(true); setSelectedSegmentIds([]); }}
                                style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderRadius: "14px", border: isWholeBeat ? "2px solid #2563eb" : "1px solid #e2e8f0", backgroundColor: isWholeBeat ? "#eff6ff" : "white", cursor: "pointer", textAlign: "left" }}
                            >
                                <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: isWholeBeat ? "6px solid #2563eb" : "2px solid #cbd5e1", backgroundColor: "white" }} />
                                <div>
                                    <div style={{ fontWeight: 700, color: isWholeBeat ? "#1e3a8a" : "#334155" }}>{wholeBeatLabel}</div>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{wholeBeatHelp}</div>
                                </div>
                            </button>

                            {allowSegmentSelection && segments.length > 0 && (
                                <div style={{ padding: "16px", borderRadius: "14px", border: !isWholeBeat ? "2px solid #2563eb" : "1px solid #e2e8f0", backgroundColor: !isWholeBeat ? "#f8fafc" : "white" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: !isWholeBeat ? "12px" : 0 }}>
                                        <div
                                            onClick={() => { setIsWholeBeat(false); if (selectedSegmentIds.length === 0 && segments.length > 0) setSelectedSegmentIds([segments[0].id]); }}
                                            style={{ width: "24px", height: "24px", borderRadius: "50%", border: !isWholeBeat ? "6px solid #2563eb" : "2px solid #cbd5e1", backgroundColor: "white", cursor: "pointer" }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 700, color: !isWholeBeat ? "#1e3a8a" : "#334155" }}>Select Specific Sub-Beats ({selectedSegmentIds.length})</div>
                                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{targetRole === "SUPERVISOR" ? "Split one large beat across multiple supervisors." : "Deploy one or many selected paths to employees."}</div>
                                        </div>
                                    </div>

                                    {!isWholeBeat && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginLeft: "40px" }}>
                                            <div>
                                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>Available Sub-Beats</div>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                                    {segments.map((seg: any, i: number) => {
                                                        const isSelected = selectedSegmentIds.includes(seg.id);
                                                        const alreadyAssigned = targetRole === "SUPERVISOR" ? !!(seg.supervisorAssignedToId || beat.assignedToId) : !!seg.employeeAssignedToId;
                                                        return (
                                                            <button
                                                                key={seg.id}
                                                                onClick={() => toggleSegment(seg.id)}
                                                                style={{ padding: "6px 12px", borderRadius: "8px", border: isSelected ? "1px solid #2563eb" : "1px solid #e2e8f0", backgroundColor: isSelected ? "#2563eb" : alreadyAssigned ? "#ecfdf5" : "white", color: isSelected ? "white" : (alreadyAssigned ? "#059669" : "#64748b"), fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                                            >
                                                                {i + 1}
                                                                {alreadyAssigned && !isSelected && <Check size={10} />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: "32px", paddingBottom: "32px" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                            Step 2: Assign to {targetRole === "SUPERVISOR" ? "Supervisor" : "Employee"}
                        </div>

                        <div style={{ position: "relative", marginBottom: "16px" }}>
                            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                            <input
                                type="text"
                                placeholder={targetRole === "SUPERVISOR" ? "Search supervisor..." : "Search employee..."}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ width: "100%", padding: "12px 12px 12px 42px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "0.875rem" }}
                            />
                        </div>

                        <div style={{ display: "grid", gap: "8px" }}>
                            {fetching ? (
                                <div style={{ padding: "40px", textAlign: "center" }}><Loader2 className="animate-spin" style={{ margin: "0 auto", color: "#2563eb" }} /></div>
                            ) : filteredUsers.map((user: any) => (
                                <div key={user.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px 16px", backgroundColor: user.matchesContext ? "#f8fafc" : "white" }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{user.name}</div>
                                        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>{user.email}</div>
                                        <div style={{ fontSize: "0.75rem", color: user.matchesContext ? "#059669" : "#94a3b8", marginTop: "4px", fontWeight: 600 }}>
                                            {user.matchesContext ? "Matches this zone/ward" : "Outside current zone/ward scope"}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAssign(user.id)}
                                        disabled={loading}
                                        style={{ minWidth: "92px", padding: "10px 14px", borderRadius: "10px", border: "none", backgroundColor: "#2563eb", color: "white", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading && assigningUserId !== user.id ? 0.5 : 1 }}
                                    >
                                        {loading && assigningUserId === user.id ? <Loader2 size={16} className="animate-spin" style={{ margin: "0 auto" }} /> : "Assign"}
                                    </button>
                                </div>
                            ))}

                            {!fetching && filteredUsers.length === 0 && (
                                <div style={{ padding: "24px", borderRadius: "14px", border: "1px dashed #cbd5e1", textAlign: "center", color: "#64748b" }}>
                                    No {targetRole === "SUPERVISOR" ? "supervisor" : "employee"} found for this scope.
                                </div>
                            )}

                            <button
                                onClick={() => handleAssign(null)}
                                disabled={loading}
                                style={{ marginTop: "8px", width: "100%", padding: "12px 14px", borderRadius: "12px", border: "1px dashed #ef4444", backgroundColor: "white", color: "#ef4444", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
                            >
                                Unassign / Clear Current Selection
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
