"use client";

import React, { useState } from "react";
import { AreaBeatApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import { RoleGuard } from "@components/Guards";
import { Eye, Edit2, Trash2, Loader2, FileText, UserPlus, MoreVertical, MapPin, Info } from "lucide-react";

interface BeatTableProps {
    beats: any[];
    onRefresh: () => void;
    onView: (beat: any) => void;
    onEdit: (beat: any) => void;
    onViewData: (beat: any) => void;
    onAssign: (beat: any) => void;
    onViewUser?: (beat: any, userId: string) => void;
    isQC?: boolean;
    isAO?: boolean;
    isReadOnly?: boolean;
}

export default function BeatTable({ beats, onRefresh, onView, onEdit, onViewData, onAssign, onViewUser, isQC = false, isAO = false, isReadOnly = false }: BeatTableProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [openActionId, setOpenActionId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this beat?")) return;

        setDeletingId(id);
        try {
            await AreaBeatApi.remove(id);
            onRefresh();
        } catch (err) {
            alert("Failed to delete beat");
        } finally {
            setDeletingId(null);
        }
    };

    React.useEffect(() => {
        const handleGlobalClick = () => {
            if (openActionId) setOpenActionId(null);
        };
        if (openActionId) {
            window.addEventListener("click", handleGlobalClick);
        }
        return () => window.removeEventListener("click", handleGlobalClick);
    }, [openActionId]);

    return (
        <div className="card" style={{ padding: "0", overflow: "hidden", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", backgroundColor: "white" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fcfdfe", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "10px" }}>
                        Registered Street Beats
                    </h3>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>Real-time directory of all geographic beats and operational status.</p>
                </div>
                {isReadOnly && (
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748b", backgroundColor: "#f1f5f9", padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>READ ONLY VIEW</span>
                )}
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead style={{ backgroundColor: "#fafbfc", borderBottom: "1px solid #f1f5f9" }}>
                        <tr>
                            <th style={{ padding: "16px 24px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", width: "40px" }}>#</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Created ON</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Location</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Beat Name</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Coverage</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Quality Controller</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Taskforce Members</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Status</th>
                            <th style={{ padding: "16px 24px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", textAlign: "right" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ backgroundColor: "white" }}>
                        {beats.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ padding: "60px 24px", textAlign: "center" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                                        <div style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "50%" }}>
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                        </div>
                                        <div style={{ color: "#64748b", fontWeight: 600 }}>No results found</div>
                                        <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Try adjusting your search or filters.</div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            beats.map((beat, index) => (
                                <tr
                                    key={beat.id}
                                    style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "all 0.2s" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fafbff"; e.currentTarget.style.transform = "scale(0.998)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.transform = "scale(1)"; }}
                                    onClick={() => onView(beat)}
                                >
                                    <td style={{ padding: "20px 24px", fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8" }}>
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: "20px 24px" }}>
                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>
                                                {new Date(beat.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                            <span style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "4px" }}>
                                                {new Date(beat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "20px 24px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span style={{ backgroundColor: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 800 }}>Z{beat.zoneName}</span>
                                            <span style={{ backgroundColor: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 800 }}>W{beat.wardName}</span>
                                            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>{beat.areaName}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "20px 24px", fontSize: "0.9375rem", fontWeight: 700, color: "#0f172a" }}>{beat.beatName}</td>
                                    <td style={{ padding: "20px 24px" }}>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                            {beat.assignedToName && (
                                                <span style={{
                                                    backgroundColor: "#e0f2fe", color: "#0369a1",
                                                    padding: "2px 8px", borderRadius: "6px",
                                                    fontSize: "0.65rem", fontWeight: 800,
                                                    display: "flex", alignItems: "center", gap: "4px"
                                                }}>
                                                    QC ACTIVE
                                                </span>
                                            )}
                                            {beat.segments?.some((s: any) => s.assignedToId) && (
                                                <span style={{
                                                    backgroundColor: "#f0fdf4", color: "#166534",
                                                    padding: "2px 8px", borderRadius: "6px",
                                                    fontSize: "0.65rem", fontWeight: 800,
                                                    display: "flex", alignItems: "center", gap: "4px"
                                                }}>
                                                    FIELD LIVE
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: "16px 24px", verticalAlign: "middle" }}>
                                        {beat.assignedToName ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                <div style={{
                                                    width: "36px", height: "36px", borderRadius: "10px",
                                                    background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
                                                    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontWeight: 700, fontSize: "12px", flexShrink: 0,
                                                    boxShadow: "0 4px 10px rgba(99, 102, 241, 0.2)"
                                                }}>
                                                    {beat.assignedToName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.875rem", lineHeight: 1 }}>{beat.assignedToName}</span>
                                                    <span style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "4px", fontWeight: 500 }}>Quality Controller</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "0.8rem" }}>Unassigned</span>
                                        )}
                                    </td>
                                    <td style={{ padding: "16px 24px", verticalAlign: "top" }}>
                                        {(() => {
                                            const primaryOwnerId = beat.assignedToId;
                                            let unassignedCount = 0;

                                            const emps = beat.segments?.reduce((acc: any[], s: any) => {
                                                if (!s.assignedToId || !s.assignedToName) { unassignedCount++; return acc; }
                                                if (s.assignedToId === primaryOwnerId) { unassignedCount++; return acc; }

                                                const existing = acc.find((item: any) => item.id === s.assignedToId);
                                                if (existing) { existing.count += 1; }
                                                else { acc.push({ id: s.assignedToId, name: s.assignedToName, count: 1 }); }
                                                return acc;
                                            }, []) || [];

                                            if (emps.length === 0 && unassignedCount === 0) return (
                                                <span style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "0.8rem" }}>No assignments</span>
                                            );

                                            return (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                    {emps.map((emp: any) => (
                                                        <div
                                                            key={emp.id}
                                                            onClick={() => onViewUser && onViewUser(beat, emp.id)}
                                                            style={{
                                                                display: "flex", alignItems: "center", gap: "10px",
                                                                cursor: "pointer", transition: "all 0.2s", borderRadius: "8px", padding: "4px 0"
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(4px)"}
                                                            onMouseLeave={(e) => e.currentTarget.style.transform = "translateX(0)"}
                                                        >
                                                            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700 }}>
                                                                {(emp.name || "U")[0].toUpperCase()}
                                                            </div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#4b5563" }}>{emp.name}</span>
                                                                <span style={{ fontSize: "0.7rem", backgroundColor: "#fdf2f8", color: "#db2777", padding: "1px 6px", borderRadius: "100px", fontWeight: 700 }}>{emp.count}b</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {unassignedCount > 0 && (
                                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                                                            <div style={{ width: "24px", height: "24px", borderRadius: "6px", border: "1px dashed #fbbf24", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                <span style={{ fontSize: "10px", fontWeight: 800 }}>?</span>
                                                            </div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                                <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#d97706", fontStyle: "italic" }}>Pending Deployment</span>
                                                                <span style={{ fontSize: "0.7rem", backgroundColor: "#fffbeb", color: "#d97706", padding: "1px 6px", borderRadius: "100px", fontWeight: 700 }}>{unassignedCount}b</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td style={{ padding: "20px 24px", verticalAlign: "middle" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "120px" }}>
                                            {(() => {
                                                const totalSegments = beat.totalSegments || beat.segments?.length || 0;
                                                const assignedSegments = beat.segments?.filter((s: any) => s.assignedToId).length || 0;
                                                const isFullyAssigned = totalSegments === assignedSegments && totalSegments > 0;
                                                const percentage = totalSegments > 0 ? (assignedSegments / totalSegments) * 100 : 0;

                                                return (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: isFullyAssigned ? "#10b981" : "#4b5563" }}>
                                                                {Math.round(percentage)}%
                                                            </span>
                                                            <span style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 600 }}>{assignedSegments}/{totalSegments}</span>
                                                        </div>
                                                        <div style={{ width: "100%", height: "6px", backgroundColor: "#f1f5f9", borderRadius: "100px", overflow: "hidden" }}>
                                                            <div style={{
                                                                width: `${percentage}%`,
                                                                height: "100%",
                                                                background: isFullyAssigned ? "linear-gradient(90deg, #10b981 0%, #34d399 100%)" : "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
                                                                borderRadius: "100px",
                                                                transition: "width 0.5s ease-out"
                                                            }} />
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td style={{ padding: "20px 24px", textAlign: "right", position: "relative" }}>
                                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setOpenActionId(openActionId === beat.id ? null : beat.id); }}
                                                style={{
                                                    width: "36px", height: "36px",
                                                    borderRadius: "10px",
                                                    border: "1px solid #e2e8f0",
                                                    backgroundColor: openActionId === beat.id ? "#f8fafc" : "white",
                                                    color: "#64748b",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    transition: "all 0.2s"
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#0f172a"; }}
                                                onMouseLeave={(e) => { if (openActionId !== beat.id) { e.currentTarget.style.backgroundColor = "white"; e.currentTarget.style.color = "#64748b"; } }}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>

                                        {openActionId === beat.id && (
                                            <div style={{
                                                position: "absolute",
                                                right: "40px",
                                                top: "0",
                                                width: "200px",
                                                backgroundColor: "white",
                                                borderRadius: "12px",
                                                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                                                border: "1px solid #f1f5f9",
                                                zIndex: 100,
                                                overflow: "hidden",
                                                display: "flex",
                                                flexDirection: "column",
                                                padding: "6px"
                                            }}>
                                                <button
                                                    onClick={() => { onView(beat); setOpenActionId(null); }}
                                                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", backgroundColor: "transparent", color: "#475569", cursor: "pointer", width: "100%", fontSize: "0.875rem", textAlign: "left" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                >
                                                    <Eye size={16} /> <span>View on Map</span>
                                                </button>
                                                <button
                                                    onClick={() => { onViewData(beat); setOpenActionId(null); }}
                                                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", backgroundColor: "transparent", color: "#475569", cursor: "pointer", width: "100%", fontSize: "0.875rem", textAlign: "left" }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                >
                                                    <FileText size={16} /> <span>View KML Data</span>
                                                </button>
                                                {!isAO && !isReadOnly && (
                                                    <button
                                                        onClick={() => { onAssign(beat); setOpenActionId(null); }}
                                                        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", backgroundColor: "transparent", color: "#2563eb", cursor: "pointer", width: "100%", fontSize: "0.875rem", textAlign: "left" }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#eff6ff"}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                    >
                                                        <UserPlus size={16} /> <span>Assign Beat</span>
                                                    </button>
                                                )}
                                                {!isQC && !isReadOnly && (
                                                    <>
                                                        <button
                                                            onClick={() => { onEdit(beat); setOpenActionId(null); }}
                                                            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", backgroundColor: "transparent", color: "#475569", cursor: "pointer", width: "100%", fontSize: "0.875rem", textAlign: "left" }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                        >
                                                            <Edit2 size={16} /> <span>Edit Beat</span>
                                                        </button>
                                                        <button
                                                            onClick={() => { handleDelete(beat.id); setOpenActionId(null); }}
                                                            disabled={deletingId === beat.id}
                                                            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", border: "none", backgroundColor: "transparent", color: "#dc2626", cursor: deletingId === beat.id ? "not-allowed" : "pointer", width: "100%", fontSize: "0.875rem", textAlign: "left" }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fef2f2"}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                        >
                                                            {deletingId === beat.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                            <span>Delete Beat</span>
                                                        </button>
                                                    </>
                                                )}
                                                {isReadOnly && (
                                                    <div style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, backgroundColor: "#f8fafc" }}>
                                                        ACTIONS DISABLED
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div >
    );
}
