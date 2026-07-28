'use client';

import React, { useState, useEffect, useCallback } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { AreaBeatApi, ModuleRecordsApi } from "@lib/apiClient";
import BeatTable from "../../city/areas/components/BeatTable";
import EditBeatModal from "../../city/areas/components/EditBeatModal";
import KMLDataViewer from "../../city/areas/components/KMLDataViewer";
import AssignBeatModal from "../../city/areas/components/AssignBeatModal";
import dynamic from "next/dynamic";
import { useAuth } from "@hooks/useAuth";
import AssessmentReviewModal from "./components/AssessmentReviewModal";
const BeatMapView = dynamic(() => import("../../city/areas/components/BeatMapView"), { ssr: false });
const GlobalBeatMapView = dynamic(() => import("../../city/areas/components/GlobalBeatMapView"), { ssr: false });

export default function SweepingModulePage() {
    const { user } = useAuth();
    const [beats, setBeats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingBeat, setViewingBeat] = useState<any | null>(null);
    const [editingBeat, setEditingBeat] = useState<any | null>(null);
    const [inspectingBeat, setInspectingBeat] = useState<any | null>(null);
    const [assigningBeat, setAssigningBeat] = useState<any | null>(null);
    const [filteredUserId, setFilteredUserId] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<"table" | "map">("table");
    const [activeTab, setActiveTab] = useState<"beats" | "assessments">("beats");
    const [assessments, setAssessments] = useState<any[]>([]);
    const [assessmentsLoading, setAssessmentsLoading] = useState(false);
    const [stats, setStats] = useState<{ pending: number; approved: number; total: number; actionRequired: number; actionTaken: number }>({ pending: 0, approved: 0, total: 0, actionRequired: 0, actionTaken: 0 });
    const [assessmentTab, setAssessmentTab] = useState('PENDING_QC');

    const isQC = user?.roles?.includes("QC");
    const isAO = user?.roles?.includes("ACTION_OFFICER");
    const isReadOnly = user?.roles?.includes("COMMISSIONER");

    const loadBeats = useCallback(async () => {
        try {
            setLoading(true);
            const res = (isQC || isAO)
                ? await AreaBeatApi.listMyBeats()
                : await AreaBeatApi.list();

            setBeats(res.beats || []);
        } catch (err) {
            console.error("Failed to load beats", err);
        } finally {
            setLoading(false);
        }
    }, [isQC, isAO]);

    const loadAssessments = useCallback(async (tab = 'PENDING_QC') => {
        try {
            setAssessmentsLoading(true);
            setAssessmentTab(tab);
            const res = await ModuleRecordsApi.getRecords("SWEEPING", { tab, limit: 100 });
            setAssessments(res.data || []);
            if (res.stats) setStats(res.stats);
        } catch (err) {
            console.error("Failed to load assessments", err);
        } finally {
            setAssessmentsLoading(false);
        }
    }, []);

    const handleViewUser = (beat: any, userId: string) => {
        setFilteredUserId(userId);
        setViewingBeat(beat);
    };

    useEffect(() => {
        loadBeats();
        if (isQC || isAO) loadAssessments(isAO ? 'ACTION_REQUIRED' : 'PENDING_QC');
    }, [loadBeats, loadAssessments, isQC, isAO]);

    const refreshAll = () => {
        loadBeats();
        loadAssessments(assessmentTab || (isAO ? 'ACTION_REQUIRED' : 'PENDING_QC'));
    };

    return (
        <Protected>
            <ModuleGuard module="SWEEPING" roles={["QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER"]}>
                <div className="page" style={{ padding: "24px" }}>
                    <div style={{ marginBottom: "32px", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                            <p className="eyebrow" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                                Module · Sweeping & Sanitation
                            </p>
                            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
                                {(isQC || isAO) ? "My Assigned Beats" : "Beat Management"}
                                <span style={{
                                    backgroundColor: "#eff6ff", color: "#2563eb",
                                    padding: "4px 12px", borderRadius: "20px",
                                    fontSize: "12px", fontWeight: 700, border: "1px solid #dbeafe"
                                }}>
                                    {beats.length} Total
                                </span>
                            </h1>
                            <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
                                {(isQC || isAO) && "View and monitor beats assigned specifically to you for quality control."}
                            </p>
                        </div>

                        {!(isQC || isAO) && (
                            <div style={{ display: "flex", gap: "16px" }}>
                                <div style={{
                                    backgroundColor: "white", padding: "12px 20px", borderRadius: "16px",
                                    border: "1px solid #e2e8f0", display: "flex", flexDirection: "row", gap: "12px",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                }}>
                                    <div>
                                        <div style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.025em" }}>Unassigned</div>
                                        <div style={{ fontSize: "20px", fontWeight: 900, color: "#ef4444" }}>
                                            {beats.filter(b => !b.assignedToId).length}
                                        </div>
                                    </div>
                                    <div style={{ width: "1px", backgroundColor: "#f1f5f9" }} />
                                    <div>
                                        <div style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.025em" }}>Field Team</div>
                                        <div style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a" }}>
                                            {new Set(beats.map(b => b.assignedToId).filter(Boolean)).size}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "12px" }}>
                            <div style={{
                                display: "flex",
                                backgroundColor: "#f1f5f9",
                                padding: "4px",
                                borderRadius: "12px",
                                border: "1px solid #e2e8f0"
                            }}>
                                <button
                                    onClick={() => setActiveTab("beats")}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "8px",
                                        border: "none",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        backgroundColor: activeTab === "beats" ? "white" : "transparent",
                                        color: activeTab === "beats" ? "#2563eb" : "#64748b",
                                        boxShadow: activeTab === "beats" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    Beats
                                </button>
                                {(isQC || isAO) && (
                                    <button
                                        onClick={() => setActiveTab("assessments")}
                                        style={{
                                            padding: "8px 16px",
                                            borderRadius: "8px",
                                            border: "none",
                                            fontSize: "13px",
                                            fontWeight: 700,
                                            backgroundColor: activeTab === "assessments" ? "white" : "transparent",
                                            color: activeTab === "assessments" ? "#2563eb" : "#64748b",
                                            boxShadow: activeTab === "assessments" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                                            cursor: "pointer",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        {isAO ? "Action Required" : "Assessments"} {stats.pending > 0 && <span style={{ marginLeft: "4px", backgroundColor: "#ef4444", color: "white", padding: "1px 6px", borderRadius: "10px", fontSize: "10px" }}>{stats.pending}</span>}
                                    </button>
                                )}
                            </div>

                            <div style={{
                                display: "flex",
                                backgroundColor: "#f1f5f9",
                                padding: "4px",
                                borderRadius: "12px",
                                border: "1px solid #e2e8f0"
                            }}>
                                <button
                                    onClick={() => setViewMode("table")}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "8px",
                                        border: "none",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        backgroundColor: viewMode === "table" ? "white" : "transparent",
                                        color: viewMode === "table" ? "#2563eb" : "#64748b",
                                        boxShadow: viewMode === "table" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    Table View
                                </button>
                                <button
                                    onClick={() => setViewMode("map")}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "8px",
                                        border: "none",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        backgroundColor: viewMode === "map" ? "white" : "transparent",
                                        color: viewMode === "map" ? "#2563eb" : "#64748b",
                                        boxShadow: viewMode === "map" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    Map View
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* QC/AO Summary Cards */}
                    {(isQC || isAO) && !loading && beats.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "32px" }}>
                            {beats.slice(0, 3).map(beat => {
                                const total = beat.totalSegments || beat.segments?.length || 0;
                                const assigned = beat.segments?.filter((s: any) => s.assignedToId).length || 0;
                                return (
                                    <div key={beat.id} style={{ backgroundColor: "white", padding: "20px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                            <div style={{ fontWeight: 800, color: "#1e293b", fontSize: "1rem" }}>{beat.beatName}</div>
                                            <div style={{ backgroundColor: "#eff6ff", color: "#2563eb", padding: "4px 8px", borderRadius: "8px", fontSize: "10px", fontWeight: 800 }}>SUMMARY</div>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                            <div>
                                                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total</div>
                                                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{total}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Assigned</div>
                                                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#10b981" }}>{assigned}</div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: "12px", fontSize: "11px", color: "#64748b" }}>
                                            <strong>{total - assigned}</strong> LineStrings remaining
                                        </div>
                                        <div style={{ width: "100%", height: "6px", backgroundColor: "#f1f5f9", borderRadius: "3px", marginTop: "12px", overflow: "hidden" }}>
                                            <div style={{ width: `${total > 0 ? (assigned / total) * 100 : 0}%`, height: "100%", backgroundColor: "#10b981", borderRadius: "3px" }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {loading || assessmentsLoading ? (
                        <div className="card" style={{ padding: "48px", textAlign: "center" }}>
                            <div className="animate-spin" style={{ width: "24px", height: "24px", border: "3px solid #f3f3f3", borderTop: "3px solid #2563eb", borderRadius: "50%", margin: "0 auto" }}></div>
                            <p style={{ marginTop: "16px", color: "#64748b", fontSize: "14px" }}>Fetching data...</p>
                        </div>
                    ) : (
                        <div style={{ animation: "fadeIn 0.5s ease-out" }}>
                            {activeTab === "beats" ? (
                                viewMode === "table" ? (
                                    <BeatTable
                                        beats={beats}
                                        onRefresh={loadBeats}
                                        onView={setViewingBeat}
                                        onEdit={setEditingBeat}
                                        onViewData={setInspectingBeat}
                                        onAssign={setAssigningBeat}
                                        onViewUser={handleViewUser}
                                        isQC={isQC || isAO}
                                        isAO={isAO}
                                        isReadOnly={isReadOnly}
                                    />
                                ) : (
                                    <GlobalBeatMapView beats={beats} />
                                )
                            ) : (
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0 }}>
                                            {assessmentTab === 'ACTION_REQUIRED' ? "Action Required Reports" :
                                                assessmentTab === 'ACTION_TAKEN' ? "Reports Submitted to Admin" :
                                                    assessmentTab === 'HISTORY' ? "Assessment History" : "Pending Assessments"}
                                        </h3>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => loadAssessments(isAO ? 'ACTION_REQUIRED' : 'PENDING_QC')}
                                                className={`btn small ${assessmentTab === (isAO ? 'ACTION_REQUIRED' : 'PENDING_QC') ? 'primary' : 'secondary'}`}
                                            >
                                                {isAO ? "To Do" : "Pending QC"}
                                            </button>
                                            {isAO && (
                                                <button
                                                    onClick={() => loadAssessments('ACTION_TAKEN')}
                                                    className={`btn small ${assessmentTab === 'ACTION_TAKEN' ? 'primary' : 'secondary'}`}
                                                >
                                                    Submitted ({stats.actionTaken})
                                                </button>
                                            )}
                                            {(!isAO) && (
                                                <button
                                                    onClick={() => loadAssessments('ACTION_TAKEN')}
                                                    className={`btn small ${assessmentTab === 'ACTION_TAKEN' ? 'primary' : 'secondary'}`}
                                                >
                                                    AO Action Taken ({stats.actionTaken})
                                                </button>
                                            )}
                                            <button
                                                onClick={() => loadAssessments('HISTORY')}
                                                className={`btn small ${assessmentTab === 'HISTORY' ? 'primary' : 'secondary'}`}
                                            >
                                                History
                                            </button>
                                        </div>
                                    </div>
                                    <table className="table" style={{ width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Beat / Segment</th>
                                                <th>Employee</th>
                                                <th>Status</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assessments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No assessments found.</td>
                                                </tr>
                                            ) : (
                                                assessments.map((record) => (
                                                    <tr key={record.id}>
                                                        <td>{new Date(record.createdAt).toLocaleDateString()}</td>
                                                        <td>
                                                            <div style={{ fontWeight: 700 }}>{record.beatName}</div>
                                                            <div style={{ fontSize: '11px', color: '#64748b' }}>Segment: {record.segmentId?.split('-')[0]}</div>
                                                        </td>
                                                        <td>
                                                            <div>{record.createdBy}</div>
                                                            <div style={{ fontSize: '11px', color: '#64748b' }}>{record.phone}</div>
                                                        </td>
                                                        <td>
                                                            <span style={{
                                                                padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                                                backgroundColor: record.status === 'PENDING_QC' || record.status === 'SUBMITTED' ? '#fff7ed' :
                                                                    record.status === 'APPROVED' ? '#ecfdf5' :
                                                                        record.status === 'ACTION_REQUIRED' ? '#fef2f2' :
                                                                            record.status === 'ACTION_TAKEN' ? '#eff6ff' : '#f1f5f9',
                                                                color: record.status === 'PENDING_QC' || record.status === 'SUBMITTED' ? '#c2410c' :
                                                                    record.status === 'APPROVED' ? '#065f46' :
                                                                        record.status === 'ACTION_REQUIRED' ? '#991b1b' :
                                                                            record.status === 'ACTION_TAKEN' ? '#2563eb' : '#64748b'
                                                            }}>
                                                                {record.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <button
                                                                className="btn primary small"
                                                                onClick={() => setInspectingBeat({ ...record, isAssessmentReview: true })}
                                                            >
                                                                Review
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )
                    }

                    {/* Modals */}
                    {viewingBeat && (
                        <BeatMapView
                            beat={viewingBeat}
                            filterUserId={filteredUserId}
                            onClose={() => {
                                setViewingBeat(null);
                                setFilteredUserId(null);
                            }}
                            onRefresh={loadBeats}
                        />
                    )}

                    {editingBeat && (
                        <EditBeatModal
                            beat={editingBeat}
                            onClose={() => setEditingBeat(null)}
                            onSuccess={loadBeats}
                        />
                    )}

                    {inspectingBeat && (
                        inspectingBeat.isAssessmentReview ? (
                            <AssessmentReviewModal
                                record={inspectingBeat}
                                onClose={() => setInspectingBeat(null)}
                                onRefresh={refreshAll}
                            />
                        ) : (
                            <KMLDataViewer
                                beat={inspectingBeat}
                                onClose={() => setInspectingBeat(null)}
                            />
                        )
                    )}

                    {assigningBeat && (
                        <AssignBeatModal
                            beat={assigningBeat}
                            onClose={() => setAssigningBeat(null)}
                            onSuccess={() => {
                                setAssigningBeat(null);
                                loadBeats();
                            }}
                        />
                    )}

                    <style jsx>{`
                        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                        .animate-spin { animation: spin 1s linear infinite; }
                        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    `}</style>
                </div>
            </ModuleGuard>
        </Protected >
    );
}
