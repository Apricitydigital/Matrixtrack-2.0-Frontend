"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, Check, Loader2, Search, AlertCircle, Layers, MousePointer2 } from "lucide-react";
import { AreaBeatApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

interface AssignBeatModalProps {
    beat: any;
    initialSelectedSegmentIds?: string[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function AssignBeatModal({ beat, initialSelectedSegmentIds = [], onClose, onSuccess }: AssignBeatModalProps) {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [search, setSearch] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

    // Multi-select state
    const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>(initialSelectedSegmentIds);
    const [isWholeBeat, setIsWholeBeat] = useState(initialSelectedSegmentIds.length === 0);

    const isCityAdmin = currentUser?.roles?.includes("CITY_ADMIN") || currentUser?.roles?.includes("HMS_SUPER_ADMIN");
    // City Admin assigns to QC, QC assigns to Employee
    const targetRole = isCityAdmin ? "QC" : "EMPLOYEE";

    useEffect(() => {
        fetchUsers();
    }, [beat.id, targetRole]);

    const fetchUsers = async () => {
        setFetching(true);
        setError("");
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
        try {
            if (isWholeBeat) {
                await AreaBeatApi.assign(beat.id, userId as any);
                beat.assignedToId = userId;
            } else {
                await AreaBeatApi.assign(beat.id, userId as any, null, selectedSegmentIds);
                // Update local status for segments
                beat.segments?.forEach((s: any) => {
                    if (selectedSegmentIds.includes(s.id)) {
                        s.assignedToId = userId;
                    }
                });
            }

            onSuccess();
            setTimeout(() => {
                setAssigningUserId(null);
                if (userId !== null) onClose(); // Auto close on successful assignment (optional)
            }, 1000);
        } catch (err: any) {
            setError(err.message);
            setAssigningUserId(null);
        } finally {
            setLoading(false);
        }
    };

    const toggleSegment = (id: string) => {
        setIsWholeBeat(false);
        setSelectedSegmentIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const segments = beat.segments || [];

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1001,
            display: "flex", justifyContent: "center", alignItems: "center",
            backdropFilter: "blur(4px)"
        }}>
            <div style={{
                width: "90%", maxWidth: "550px",
                backgroundColor: "white", borderRadius: "20px", overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
                display: "flex", flexDirection: "column", maxHeight: "90vh"
            }}>
                {/* Header */}
                <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>Manage Assignments</h3>
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

                    {/* Step 1: Selection Mode */}
                    <div style={{ marginTop: "24px" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                            STEP 1: SELECT TARGET (WHOLE BEAT OR SPECIFIC BEAT)
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                            {/* Option: Whole Beat */}
                            <button
                                onClick={() => { setIsWholeBeat(true); setSelectedSegmentIds([]); }}
                                style={{
                                    display: "flex", alignItems: "center", gap: "16px", padding: "16px",
                                    borderRadius: "14px", border: isWholeBeat ? "2px solid #2563eb" : "1px solid #e2e8f0",
                                    backgroundColor: isWholeBeat ? "#eff6ff" : "white",
                                    cursor: "pointer", textAlign: "left", transition: "all 0.2s"
                                }}
                            >
                                <div style={{
                                    width: "24px", height: "24px", borderRadius: "50%",
                                    border: isWholeBeat ? "6px solid #2563eb" : "2px solid #cbd5e1",
                                    backgroundColor: "white"
                                }} />
                                <div>
                                    <div style={{ fontWeight: 700, color: isWholeBeat ? "#1e3a8a" : "#334155" }}>Assign Entire Beat</div>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Suitable for QC assignment by City Admin.</div>
                                </div>
                            </button>

                            {/* Option: Specific Segments */}
                            {segments.length > 0 && (
                                <div style={{
                                    padding: "16px", borderRadius: "14px",
                                    border: !isWholeBeat ? "2px solid #2563eb" : "1px solid #e2e8f0",
                                    backgroundColor: !isWholeBeat ? "#f8fafc" : "white",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
                                        <div
                                            onClick={() => { setIsWholeBeat(false); if (selectedSegmentIds.length === 0 && segments.length > 0) setSelectedSegmentIds([segments[0].id]); }}
                                            style={{
                                                width: "24px", height: "24px", borderRadius: "50%",
                                                border: !isWholeBeat ? "6px solid #2563eb" : "2px solid #cbd5e1",
                                                backgroundColor: "white", cursor: "pointer"
                                            }}
                                        />
                                        <div style={{ fontWeight: 700, color: !isWholeBeat ? "#1e3a8a" : "#334155" }}>Select Specific Beats ({selectedSegmentIds.length})</div>
                                    </div>

                                    {!isWholeBeat && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginLeft: "40px" }}>
                                            {/* Unassigned LineStrings */}
                                            {segments.some((s: any) => !s.assignedToId) && (
                                                <div>
                                                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>Unassigned</div>
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                                        {segments.map((seg: any, i: number) => {
                                                            if (seg.assignedToId) return null;
                                                            const isSelected = selectedSegmentIds.includes(seg.id);
                                                            return (
                                                                <button
                                                                    key={seg.id}
                                                                    onClick={() => toggleSegment(seg.id)}
                                                                    style={{
                                                                        padding: "6px 12px", borderRadius: "8px",
                                                                        border: isSelected ? "1px solid #2563eb" : "1px solid #e2e8f0",
                                                                        backgroundColor: isSelected ? "#2563eb" : "white",
                                                                        color: isSelected ? "white" : "#64748b",
                                                                        fontSize: "0.75rem", fontWeight: 700, cursor: "pointer"
                                                                    }}
                                                                >
                                                                    {i + 1}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Already Assigned LineStrings */}
                                            {segments.some((s: any) => s.assignedToId) && (
                                                <div>
                                                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>Already Assigned</div>
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                                        {segments.map((seg: any, i: number) => {
                                                            if (!seg.assignedToId) return null;
                                                            const isSelected = selectedSegmentIds.includes(seg.id);
                                                            return (
                                                                <button
                                                                    key={seg.id}
                                                                    onClick={() => toggleSegment(seg.id)}
                                                                    style={{
                                                                        padding: "6px 12px", borderRadius: "8px",
                                                                        border: isSelected ? "1px solid #2563eb" : "1px solid #e2e8f0",
                                                                        backgroundColor: isSelected ? "#2563eb" : "#ecfdf5",
                                                                        color: isSelected ? "white" : "#059669",
                                                                        fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                                                                        display: "flex", alignItems: "center", gap: "4px"
                                                                    }}
                                                                >
                                                                    {i + 1}
                                                                    {!isSelected && <Check size={10} />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 2: User List */}
                    <div style={{ marginTop: "32px", paddingBottom: "32px" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                            Step 2: Assign to {targetRole} Member
                        </div>

                        <div style={{ position: "relative", marginBottom: "16px" }}>
                            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                            <input
                                type="text"
                                placeholder={`Search for ${targetRole}...`}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ width: "100%", padding: "12px 12px 12px 42px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "0.875rem" }}
                            />
                        </div>

                        <div style={{ display: "grid", gap: "8px" }}>
                            {fetching ? (
                                <div style={{ padding: "40px", textAlign: "center" }}><Loader2 className="animate-spin" style={{ margin: "0 auto", color: "#2563eb" }} /></div>
                            ) : filteredUsers.map((user: any) => (
                                <div key={user.id} style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: "16px", borderRadius: "16px", border: "1px solid #f1f5f9", backgroundColor: "#f8fafc"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div style={{ width: "40px", height: "40px", borderRadius: "12px", backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, border: "1px solid #e2e8f0" }}>{user.name[0]}</div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{user.name}</div>
                                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{user.email}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAssign(user.id)}
                                        disabled={loading || (!isWholeBeat && selectedSegmentIds.length === 0)}
                                        style={{
                                            padding: "8px 16px", borderRadius: "10px", backgroundColor: "#2563eb", color: "white",
                                            fontWeight: 700, fontSize: "0.75rem", border: "none", cursor: "pointer",
                                            opacity: (loading || (!isWholeBeat && selectedSegmentIds.length === 0)) ? 0.5 : 1
                                        }}
                                    >
                                        {assigningUserId === user.id ? <Check size={16} /> : "Assign"}
                                    </button>
                                </div>
                            ))}

                            <div style={{ marginTop: "12px" }}>
                                <button
                                    onClick={() => handleAssign(null)}
                                    style={{ width: "100%", padding: "12px", border: "1px dashed #ef4444", color: "#ef4444", borderRadius: "12px", background: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 700 }}
                                >
                                    Unassign / Clear Current Selections
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
