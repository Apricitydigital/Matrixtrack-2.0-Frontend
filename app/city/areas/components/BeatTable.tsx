"use client";

import React, { useState } from "react";
import { AreaBeatApi } from "@lib/apiClient";
import { Eye, Edit2, Trash2, Loader2, FileText, UserPlus, MoreVertical, Users } from "lucide-react";

interface BeatTableProps {
    beats: any[];
    onRefresh: () => void;
    onView: (beat: any) => void;
    onEdit: (beat: any) => void;
    onViewData: (beat: any) => void;
    onAssign: (beat: any) => void;
    onAssignEmployees?: (beat: any) => void;
    onViewUser?: (beat: any, userId: string) => void;
    assignmentActionLabel?: string;
    isQC?: boolean;
    isAO?: boolean;
    isReadOnly?: boolean;
}

export default function BeatTable({ beats, onRefresh, onView, onEdit, onViewData, onAssign, onAssignEmployees, onViewUser, assignmentActionLabel = "Assign Supervisor", isQC = false, isAO = false, isReadOnly = false }: BeatTableProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [openActionId, setOpenActionId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this beat?")) return;
        setDeletingId(id);
        try {
            await AreaBeatApi.remove(id);
            onRefresh();
        } catch {
            alert("Failed to delete beat");
        } finally {
            setDeletingId(null);
        }
    };

    React.useEffect(() => {
        const handleGlobalClick = () => openActionId && setOpenActionId(null);
        if (openActionId) window.addEventListener("click", handleGlobalClick);
        return () => window.removeEventListener("click", handleGlobalClick);
    }, [openActionId]);

    return (
        <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", backgroundColor: "white" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fcfdfe", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>Registered Street Beats</h3>
                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#64748b" }}>Real-time directory of all geographic beats and operational status.</p>
                </div>
                {isReadOnly && <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748b", backgroundColor: "#f1f5f9", padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>READ ONLY VIEW</span>}
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead style={{ backgroundColor: "#fafbfc", borderBottom: "1px solid #f1f5f9" }}>
                        <tr>
                            <th style={headCell(40)}>#</th>
                            <th style={headCell()}>Created On</th>
                            <th style={headCell()}>Location</th>
                            <th style={headCell()}>Beat Name</th>
                            <th style={headCell()}>Coverage</th>
                            <th style={headCell()}>Supervisors</th>
                            <th style={headCell()}>Employees</th>
                            <th style={headCell()}>Status</th>
                            <th style={{ ...headCell(), textAlign: "right" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ backgroundColor: "white" }}>
                        {beats.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ padding: "60px 24px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>No results found</td>
                            </tr>
                        ) : beats.map((beat, index) => {
                            const supervisors = beat.supervisorsSummary || (beat.assignedToName ? [{ id: beat.assignedToId, name: beat.assignedToName, count: beat.totalSegments || beat.segments?.length || 0 }] : []);
                            const employees = new Map<string, { id: string; name: string; count: number }>();
                            let unassignedEmployees = 0;
                            (beat.segments || []).forEach((segment: any) => {
                                if (!segment.employeeAssignedToId || !segment.employeeAssignedToName) {
                                    unassignedEmployees += 1;
                                    return;
                                }
                                const existing = employees.get(segment.employeeAssignedToId);
                                if (existing) existing.count += 1;
                                else employees.set(segment.employeeAssignedToId, { id: segment.employeeAssignedToId, name: segment.employeeAssignedToName, count: 1 });
                            });
                            const employeeList = Array.from(employees.values());
                            const totalSegments = beat.totalSegments || beat.segments?.length || 0;
                            const assignedSegments = (beat.segments || []).filter((segment: any) => !!segment.employeeAssignedToId).length;
                            const percentage = totalSegments > 0 ? (assignedSegments / totalSegments) * 100 : 0;
                            const isFullyAssigned = totalSegments > 0 && assignedSegments === totalSegments;

                            return (
                                <tr key={beat.id} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "all 0.2s" }} onClick={() => onView(beat)}>
                                    <td style={bodyCell()}>{index + 1}</td>
                                    <td style={bodyCell()}>
                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{new Date(beat.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            <span style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 4 }}>{new Date(beat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td style={bodyCell()}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={tagStyle()}>{beat.zoneName}</span>
                                            <span style={tagStyle()}>{beat.wardName}</span>
                                            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>{beat.areaName}</span>
                                        </div>
                                    </td>
                                    <td style={{ ...bodyCell(), fontSize: "0.9375rem", fontWeight: 700, color: "#0f172a" }}>{beat.beatName}</td>
                                    <td style={bodyCell()}>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                            {supervisors.length > 0 && <span style={badgeStyle("#e0f2fe", "#0369a1")}>{supervisors.length > 1 ? `${supervisors.length} SUPERVISORS` : "SUPERVISOR ACTIVE"}</span>}
                                            {assignedSegments > 0 && <span style={badgeStyle("#f0fdf4", "#166534")}>FIELD LIVE</span>}
                                        </div>
                                    </td>
                                    <td style={{ ...bodyCell(), verticalAlign: "middle" }}>
                                        {supervisors.length === 0 ? (
                                            !isAO && !isReadOnly && onAssign ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onAssign(beat); }}
                                                    style={{ background: "none", border: "1px dashed #cbd5e1", padding: "6px 12px", borderRadius: "8px", color: "#64748b", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", transition: "all 0.15s ease" }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.backgroundColor = "#eff6ff"; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.backgroundColor = "transparent"; }}
                                                    title="Assign Supervisor"
                                                >
                                                    + Assign Supervisor
                                                </button>
                                            ) : (
                                                <span style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "0.8rem" }}>Unassigned</span>
                                            )
                                        ) : supervisors.length === 1 ? (
                                            <div
                                                onClick={(e) => { e.stopPropagation(); if (!isAO && !isReadOnly && onAssign) onAssign(beat); }}
                                                style={{ cursor: (!isAO && !isReadOnly && !!onAssign) ? "pointer" : "default", padding: "4px 8px", borderRadius: "8px", transition: "all 0.15s ease" }}
                                                onMouseEnter={(e) => { if (!isAO && !isReadOnly && !!onAssign) e.currentTarget.style.backgroundColor = "#eef2ff"; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                                title="Click to manage supervisor"
                                            >
                                                <PersonRow name={supervisors[0].name} subtitle={`Supervisor • ${supervisors[0].count}b`} gradient="linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" />
                                            </div>
                                        ) : (
                                            <div
                                                onClick={(e) => { e.stopPropagation(); if (!isAO && !isReadOnly && onAssign) onAssign(beat); }}
                                                style={{ cursor: (!isAO && !isReadOnly && !!onAssign) ? "pointer" : "default", padding: "4px 8px", borderRadius: "8px", transition: "all 0.15s ease", display: "flex", flexDirection: "column", gap: 8 }}
                                                onMouseEnter={(e) => { if (!isAO && !isReadOnly && !!onAssign) e.currentTarget.style.backgroundColor = "#eef2ff"; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                                title="Click to manage supervisors"
                                            >
                                                {supervisors.slice(0, 2).map((supervisor: any) => (
                                                    <PersonRow key={supervisor.id} name={supervisor.name} subtitle={`Supervisor • ${supervisor.count}b`} gradient="linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" />
                                                ))}
                                                {supervisors.length > 2 && <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700 }}>+{supervisors.length - 2} more</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ ...bodyCell(), verticalAlign: "top" }}>
                                        {employeeList.length === 0 && unassignedEmployees === 0 ? (
                                            !isReadOnly && (onAssignEmployees || onViewUser) ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onAssignEmployees) onAssignEmployees(beat);
                                                        else if (onViewUser) onViewUser(beat, "");
                                                    }}
                                                    style={{ background: "none", border: "1px dashed #cbd5e1", padding: "6px 12px", borderRadius: "8px", color: "#64748b", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", transition: "all 0.15s ease" }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#059669"; e.currentTarget.style.color = "#059669"; e.currentTarget.style.backgroundColor = "#ecfdf5"; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.backgroundColor = "transparent"; }}
                                                    title="Click to open Employee Deployment"
                                                >
                                                    + Deploy Employee
                                                </button>
                                            ) : (
                                                <span style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "0.8rem" }}>No employees assigned</span>
                                            )
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                {employeeList.map((employee) => (
                                                    <div
                                                        key={employee.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onAssignEmployees) onAssignEmployees(beat);
                                                            else if (onViewUser) onViewUser(beat, employee.id);
                                                        }}
                                                        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "4px 8px", borderRadius: "8px", transition: "all 0.15s ease" }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fdf2f8"; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                                        title={`Click to open Employee Deployment for ${employee.name}`}
                                                    >
                                                        <div style={{ width: 26, height: 26, borderRadius: 6, background: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                                                            {employee.name[0]?.toUpperCase() || "U"}
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b" }}>{employee.name}</span>
                                                            <span style={{ fontSize: "0.7rem", backgroundColor: "#fdf2f8", color: "#db2777", padding: "1px 6px", borderRadius: 100, fontWeight: 700, border: "1px solid #fbcfe8" }}>
                                                                {employee.count} {employee.count === 1 ? "segment" : "segments"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {unassignedEmployees > 0 && (
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onAssignEmployees) onAssignEmployees(beat);
                                                            else if (onViewUser) onViewUser(beat, "");
                                                        }}
                                                        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: "8px", transition: "all 0.15s ease" }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fffbeb"; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                                        title="Click to open Employee Deployment for pending segments"
                                                    >
                                                        <div style={{ width: 24, height: 24, borderRadius: 6, border: "1px dashed #fbbf24", color: "#d97706", backgroundColor: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                            <span style={{ fontSize: 10, fontWeight: 800 }}>?</span>
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                            <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#d97706", fontStyle: "italic" }}>Employees Pending</span>
                                                            <span style={{ fontSize: "0.7rem", backgroundColor: "#fffbeb", color: "#d97706", padding: "1px 6px", borderRadius: 100, fontWeight: 700, border: "1px solid #fef3c7" }}>
                                                                {unassignedEmployees} {unassignedEmployees === 1 ? "segment" : "segments"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td style={bodyCell()}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 120 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: isFullyAssigned ? "#10b981" : "#4b5563" }}>{Math.round(percentage)}%</span>
                                                <span style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 600 }}>{assignedSegments}/{totalSegments}</span>
                                            </div>
                                            <div style={{ width: "100%", height: 6, backgroundColor: "#f1f5f9", borderRadius: 100, overflow: "hidden" }}>
                                                <div style={{ width: `${percentage}%`, height: "100%", background: isFullyAssigned ? "linear-gradient(90deg, #10b981 0%, #34d399 100%)" : "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)", borderRadius: 100, transition: "width 0.5s ease-out" }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ ...bodyCell(), textAlign: "right", position: "relative" }}>
                                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                            <button onClick={(e) => { e.stopPropagation(); setOpenActionId(openActionId === beat.id ? null : beat.id); }} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e2e8f0", backgroundColor: openActionId === beat.id ? "#f8fafc" : "white", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>

                                        {openActionId === beat.id && (
                                            <div style={{ position: "absolute", right: 40, top: 0, width: 220, backgroundColor: "white", borderRadius: 12, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", border: "1px solid #f1f5f9", zIndex: 100, overflow: "hidden", display: "flex", flexDirection: "column", padding: 6 }}>
                                                <MenuBtn icon={<Eye size={16} />} label="View on Map" onClick={() => { onView(beat); setOpenActionId(null); }} />
                                                <MenuBtn icon={<FileText size={16} />} label="View KML Data" onClick={() => { onViewData(beat); setOpenActionId(null); }} />
                                                {!isAO && !isReadOnly && <MenuBtn icon={<UserPlus size={16} />} label={assignmentActionLabel} color="#2563eb" hover="#eff6ff" onClick={() => { onAssign(beat); setOpenActionId(null); }} />}
                                                {!isAO && !isReadOnly && onAssignEmployees && <MenuBtn icon={<Users size={16} />} label="Deploy Employees" color="#059669" hover="#ecfdf5" onClick={() => { onAssignEmployees(beat); setOpenActionId(null); }} />}
                                                {!isQC && !isReadOnly && <MenuBtn icon={<Edit2 size={16} />} label="Edit Beat" onClick={() => { onEdit(beat); setOpenActionId(null); }} />}
                                                {!isQC && !isReadOnly && <MenuBtn icon={deletingId === beat.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} label="Delete Beat" color="#dc2626" hover="#fef2f2" onClick={() => { handleDelete(beat.id); setOpenActionId(null); }} />}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function headCell(width?: number): React.CSSProperties {
    return { padding: "16px 24px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", ...(width ? { width } : {}) };
}

function bodyCell(): React.CSSProperties {
    return { padding: "20px 24px" };
}

function tagStyle(): React.CSSProperties {
    return { backgroundColor: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 800 };
}

function badgeStyle(bg: string, color: string): React.CSSProperties {
    return { backgroundColor: bg, color, padding: "2px 8px", borderRadius: "6px", fontSize: "0.65rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "4px" };
}

function PersonRow({ name, subtitle, gradient }: { name: string; subtitle: string; gradient: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: gradient, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                {name.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 600, color: "#111827", fontSize: "0.875rem", lineHeight: 1 }}>{name}</span>
                <span style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: 4, fontWeight: 500 }}>{subtitle}</span>
            </div>
        </div>
    );
}

function MenuBtn({ icon, label, onClick, color = "#475569", hover = "#f8fafc" }: { icon: React.ReactNode; label: string; onClick: () => void; color?: string; hover?: string }) {
    return (
        <button
            onClick={onClick}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", backgroundColor: "transparent", color, cursor: "pointer", width: "100%", fontSize: "0.875rem", textAlign: "left" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
            {icon} <span>{label}</span>
        </button>
    );
}

