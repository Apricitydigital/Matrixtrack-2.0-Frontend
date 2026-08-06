'use client';

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
    const [deployingBeat, setDeployingBeat] = useState<any | null>(null);
    const [filteredUserId, setFilteredUserId] = useState<string | null>(null);
    const [pendingBeatCount, setPendingBeatCount] = useState(0);

    const [viewMode, setViewMode] = useState<"table" | "map">("table");
    const [activeTab, setActiveTab] = useState<"beats" | "assessments">("assessments");
    const [assessments, setAssessments] = useState<any[]>([]);
    const [assessmentsLoading, setAssessmentsLoading] = useState(false);
    const [stats, setStats] = useState<{ pending: number; approved: number; total: number; actionRequired: number; actionTaken: number }>({ pending: 0, approved: 0, total: 0, actionRequired: 0, actionTaken: 0 });
    const [assessmentTab, setAssessmentTab] = useState('PENDING_QC');

    const isQC = user?.roles?.includes("QC");
    const isAO = user?.roles?.includes("ACTION_OFFICER");
    const isReadOnly = user?.roles?.includes("COMMISSIONER");

    const [dateFilter, setDateFilter] = useState('today');
    const [customDate, setCustomDate] = useState('');

    const loadBeats = useCallback(async () => {
        try {
            setLoading(true);
            const [beatsRes, pendingRes] = await Promise.allSettled([
                (isQC || isAO) ? AreaBeatApi.listMyBeats() : AreaBeatApi.list(),
                AreaBeatApi.listPendingRequests()
            ]);
            if (beatsRes.status === "fulfilled") {
                setBeats(beatsRes.value.beats || []);
            }
            if (pendingRes.status === "fulfilled") {
                setPendingBeatCount(pendingRes.value.pendingBeats?.length || 0);
            }
        } catch (err) {
            console.error("Failed to load beats", err);
        } finally {
            setLoading(false);
        }
    }, [isQC, isAO]);

    const loadAssessments = useCallback(async (tab = assessmentTab, dFilter = dateFilter, cDate = customDate) => {
        try {
            setAssessmentsLoading(true);
            setAssessmentTab(tab);

            let fromDate: string | undefined;
            let toDate: string | undefined;
            const now = new Date();
            if (dFilter === 'today') {
                fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
                toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
            } else if (dFilter === 'week') {
                fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
            } else if (dFilter === 'month') {
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
                toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
            } else if (dFilter === 'custom' && cDate) {
                const [y, m, d] = cDate.split('-').map(Number);
                if (y && m && d) {
                    fromDate = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
                    toDate = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
                }
            }

            const res = await ModuleRecordsApi.getRecords("SWEEPING", { tab, limit: 100, fromDate, toDate });
            setAssessments(res.data || []);
            if (res.stats) setStats(res.stats);
        } catch (err) {
            console.error("Failed to load assessments", err);
        } finally {
            setAssessmentsLoading(false);
        }
    }, [assessmentTab, dateFilter, customDate]);

    const handleViewUser = (beat: any, userId: string) => {
        setFilteredUserId(userId);
        setViewingBeat(beat);
    };

    useEffect(() => {
        loadBeats();
        loadAssessments(isAO ? 'ACTION_REQUIRED' : 'PENDING_QC', dateFilter, customDate);
    }, []);

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
                                Sweeping & Sanitation {user?.cityName && <span style={{ color: '#64748b', fontWeight: 400 }}>| {user.cityName}</span>}
                            </h1>
                            <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
                                Manage street beats, daily inspection reports, and quality control.
                            </p>
                        </div>

                        <div style={{ display: "flex", gap: "12px" }}>
                            <div style={{
                                display: "flex",
                                backgroundColor: "#f1f5f9",
                                padding: "4px",
                                borderRadius: "12px",
                                border: "1px solid #e2e8f0"
                            }}>
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
                                    Dashboard & Daily Reports {stats.pending > 0 && <span style={{ marginLeft: "6px", backgroundColor: "#ef4444", color: "white", padding: "2px 6px", borderRadius: "10px", fontSize: "10px" }}>{stats.pending}</span>}
                                </button>
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
                                    Beat Management ({beats.length})
                                </button>
                                <Link
                                    href="/city/beat-requests"
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "8px",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        backgroundColor: pendingBeatCount > 0 ? "#fef3c7" : "transparent",
                                        color: pendingBeatCount > 0 ? "#b45309" : "#64748b",
                                        textDecoration: "none",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    Beat Requests
                                    {pendingBeatCount > 0 && (
                                        <span style={{ backgroundColor: "#d97706", color: "white", padding: "2px 6px", borderRadius: "10px", fontSize: "10px", fontWeight: 800 }}>
                                            {pendingBeatCount}
                                        </span>
                                    )}
                                </Link>
                            </div>

                            {activeTab === "beats" && (
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
                            )}
                        </div>
                    </div>

                    {/* Operational Intelligence Cards (Shown when activeTab === "assessments") */}
                    {activeTab === "assessments" && (
                        <div>
                            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Operational Intelligence</h3>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                                        {[
                                            { id: 'today', label: 'TODAY' },
                                            { id: 'week', label: 'WEEK' },
                                            { id: 'month', label: 'MONTH' },
                                            { id: 'all', label: 'ALL TIME' },
                                        ].map((d) => (
                                            <button
                                                key={d.id}
                                                onClick={() => {
                                                    setDateFilter(d.id);
                                                    loadAssessments(assessmentTab, d.id, customDate);
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    background: dateFilter === d.id ? '#0f172a' : 'transparent',
                                                    color: dateFilter === d.id ? '#ffffff' : '#64748b'
                                                }}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="date"
                                        value={customDate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCustomDate(val);
                                            setDateFilter('custom');
                                            loadAssessments(assessmentTab, 'custom', val);
                                        }}
                                        style={{
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '10px',
                                            padding: '6px 10px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            outline: 'none',
                                            background: 'white'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* 4 Stat Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL SUBMISSIONS</div>
                                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>{stats.total || 0}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Total reports in period</div>
                                </div>
                                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>APPROVED BY QC</div>
                                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#10b981', marginTop: '6px' }}>{stats.approved || 0}</div>
                                    <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>Status: Verified Clean</div>
                                </div>
                                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REJECTED / ACTION REQ.</div>
                                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#ef4444', marginTop: '6px' }}>{stats.actionRequired || 0}</div>
                                    <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>Status: Non-Compliant</div>
                                </div>
                                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PENDING REVIEW</div>
                                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#f59e0b', marginTop: '6px' }}>{stats.pending || 0}</div>
                                    <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px' }}>Awaiting QC inspection</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    {loading || assessmentsLoading ? (
                        <div className="card" style={{ padding: "48px", textAlign: "center", backgroundColor: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                            <div className="animate-spin" style={{ width: "28px", height: "28px", border: "3px solid #f3f3f3", borderTop: "3px solid #2563eb", borderRadius: "50%", margin: "0 auto" }}></div>
                            <p style={{ marginTop: "16px", color: "#64748b", fontSize: "14px" }}>Loading data...</p>
                        </div>
                    ) : (
                        <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                            {activeTab === "beats" ? (
                                viewMode === "table" ? (
                                    <BeatTable
                                        beats={beats}
                                        onRefresh={loadBeats}
                                        onView={setViewingBeat}
                                        onEdit={setEditingBeat}
                                        onViewData={setInspectingBeat}
                                        onAssign={setAssigningBeat}
                                        onAssignEmployees={setDeployingBeat}
                                        onViewUser={handleViewUser}
                                        isQC={isQC || isAO}
                                        isAO={isAO}
                                        isReadOnly={isReadOnly}
                                    />
                                ) : (
                                    <GlobalBeatMapView beats={beats} />
                                )
                            ) : (
                                <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                                Latest Sweeping Inspections & Reports
                                            </h3>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                                Real-time stream of employee sweeping submissions and QC assessments.
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => loadAssessments('PENDING_QC')}
                                                style={{
                                                    padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                                    border: assessmentTab === 'PENDING_QC' ? 'none' : '1px solid #e2e8f0',
                                                    backgroundColor: assessmentTab === 'PENDING_QC' ? '#2563eb' : 'white',
                                                    color: assessmentTab === 'PENDING_QC' ? 'white' : '#64748b', cursor: 'pointer'
                                                }}
                                            >
                                                Pending QC
                                            </button>
                                            <button
                                                onClick={() => loadAssessments('ACTION_REQUIRED')}
                                                style={{
                                                    padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                                    border: assessmentTab === 'ACTION_REQUIRED' ? 'none' : '1px solid #e2e8f0',
                                                    backgroundColor: assessmentTab === 'ACTION_REQUIRED' ? '#ef4444' : 'white',
                                                    color: assessmentTab === 'ACTION_REQUIRED' ? 'white' : '#64748b', cursor: 'pointer'
                                                }}
                                            >
                                                Action Required
                                            </button>
                                            <button
                                                onClick={() => loadAssessments('ACTION_TAKEN')}
                                                style={{
                                                    padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                                    border: assessmentTab === 'ACTION_TAKEN' ? 'none' : '1px solid #e2e8f0',
                                                    backgroundColor: assessmentTab === 'ACTION_TAKEN' ? '#059669' : 'white',
                                                    color: assessmentTab === 'ACTION_TAKEN' ? 'white' : '#64748b', cursor: 'pointer'
                                                }}
                                            >
                                                AO Action Taken ({stats.actionTaken || 0})
                                            </button>
                                            <button
                                                onClick={() => loadAssessments('HISTORY')}
                                                style={{
                                                    padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                                    border: assessmentTab === 'HISTORY' ? 'none' : '1px solid #e2e8f0',
                                                    backgroundColor: assessmentTab === 'HISTORY' ? '#0f172a' : 'white',
                                                    color: assessmentTab === 'HISTORY' ? 'white' : '#64748b', cursor: 'pointer'
                                                }}
                                            >
                                                All Reports / History
                                            </button>
                                        </div>
                                    </div>
                                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                                <th style={{ padding: '14px 24px', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Date & Time</th>
                                                <th style={{ padding: '14px 24px', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Beat / Segment</th>
                                                <th style={{ padding: '14px 24px', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Submitted By</th>
                                                <th style={{ padding: '14px 24px', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                                                <th style={{ padding: '14px 24px', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assessments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: '#64748b', fontSize: '14px' }}>
                                                        No sweeping reports found for this period.
                                                    </td>
                                                </tr>
                                            ) : (
                                                assessments.map((record) => (
                                                    <tr key={record.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '16px 24px', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                                                            {new Date(record.createdAt).toLocaleDateString()}
                                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                                {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '16px 24px' }}>
                                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{record.beatName || "Street Beat"}</div>
                                                            <div style={{ fontSize: '12px', color: '#64748b' }}>Segment: {record.segmentId?.split('-')[0]}</div>
                                                        </td>
                                                        <td style={{ padding: '16px 24px' }}>
                                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>{record.createdBy || "Field Employee"}</div>
                                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{record.phone || "—"}</div>
                                                        </td>
                                                        <td style={{ padding: '16px 24px' }}>
                                                            <span style={{
                                                                padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
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
                                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                            <button
                                                                onClick={() => setInspectingBeat({ ...record, isAssessmentReview: true })}
                                                                style={{
                                                                    backgroundColor: '#2563eb', color: 'white', border: 'none',
                                                                    padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                                                    cursor: 'pointer', boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                                                                }}
                                                            >
                                                                View Report
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
                    )}

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
                            mode="SUPERVISOR"
                            onClose={() => setAssigningBeat(null)}
                            onSuccess={() => {
                                setAssigningBeat(null);
                                loadBeats();
                            }}
                        />
                    )}

                    {deployingBeat && (
                        <AssignBeatModal
                            beat={deployingBeat}
                            mode="EMPLOYEE"
                            onClose={() => setDeployingBeat(null)}
                            onSuccess={() => {
                                setDeployingBeat(null);
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
        </Protected>
    );
}
