'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Protected, ModuleGuard } from "@components/Guards";
import { AreaBeatApi, ModuleRecordsApi, GeoApi, CityApi } from "@lib/apiClient";
import BeatTable from "../../city/areas/components/BeatTable";
import EditBeatModal from "../../city/areas/components/EditBeatModal";
import KMLDataViewer from "../../city/areas/components/KMLDataViewer";
import AssignBeatModal from "../../city/areas/components/AssignBeatModal";
import dynamic from "next/dynamic";
import { useAuth } from "@hooks/useAuth";
import AssessmentReviewModal from "./components/AssessmentReviewModal";
import BeatStaffAssignmentsTab from "./components/BeatStaffAssignmentsTab";
import SubmittedReportsTab from "../qc-shared/SubmittedReportsTab";

const BeatMapView = dynamic(() => import("../../city/areas/components/BeatMapView"), { ssr: false });
const GlobalBeatMapView = dynamic(() => import("../../city/areas/components/GlobalBeatMapView"), { ssr: false });

export default function SweepingModulePage() {
    const { user } = useAuth();
    const mainSectionRef = useRef<HTMLDivElement>(null);
    const [beats, setBeats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingBeat, setViewingBeat] = useState<any | null>(null);
    const [editingBeat, setEditingBeat] = useState<any | null>(null);
    const [inspectingBeat, setInspectingBeat] = useState<any | null>(null);
    const [assigningBeat, setAssigningBeat] = useState<any | null>(null);
    const [deployingBeat, setDeployingBeat] = useState<any | null>(null);
    const [filteredUserId, setFilteredUserId] = useState<string | null>(null);
    const [pendingBeatCount, setPendingBeatCount] = useState(0);

    const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
    const [selectedCity, setSelectedCity] = useState<string>("ALL");

    const isSuperAdmin =
        user?.role === 'super_admin' ||
        user?.role === 'hms_super_admin' ||
        user?.role === 'SUPER_ADMIN' ||
        (user?.roles || []).includes('hms_super_admin') ||
        (user?.roles || []).includes('HMS_SUPER_ADMIN') ||
        (user?.roles || []).includes('SUPER_ADMIN') ||
        (user?.roles || []).includes('super_admin');

    useEffect(() => {
        if (isSuperAdmin) {
            CityApi.list().then(res => setCities(res.cities || [])).catch(console.error);
        }
    }, [isSuperAdmin]);

    const [viewMode, setViewMode] = useState<"table" | "map">("table");
    const [activeTab, setActiveTab] = useState<"assessments" | "submitted_reports" | "beats" | "assignments">("assessments");
    const [assessments, setAssessments] = useState<any[]>([]);
    const [assessmentsLoading, setAssessmentsLoading] = useState(false);
    const [stats, setStats] = useState<{ pending: number; approved: number; total: number; actionRequired: number; actionTaken: number }>({ pending: 0, approved: 0, total: 0, actionRequired: 0, actionTaken: 0 });

    // Date Filters
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today');
    const [customDate, setCustomDate] = useState('');

    // Dropdown Filters for Inspection List
    const [selectedZone, setSelectedZone] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedAreaType, setSelectedAreaType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Geo metadata
    const [zones, setZones] = useState<any[]>([]);
    const [allWards, setAllWards] = useState<any[]>([]);

    const isQC = user?.roles?.includes("QC");
    const isAO = user?.roles?.includes("ACTION_OFFICER");
    const isReadOnly = user?.roles?.includes("COMMISSIONER");

    useEffect(() => {
        loadMetadata();
    }, []);

    const loadMetadata = async () => {
        try {
            const [zRes, wRes] = await Promise.allSettled([
                GeoApi.list("ZONE"),
                GeoApi.list("WARD")
            ]);
            if (zRes.status === 'fulfilled') setZones(zRes.value.nodes || []);
            if (wRes.status === 'fulfilled') setAllWards(wRes.value.nodes || []);
        } catch (e) {
            console.error('Failed to load geo metadata', e);
        }
    };

    const visibleWards = selectedZone
        ? allWards.filter(w => w.parentId === selectedZone || w.parent?.id === selectedZone)
        : allWards;

    const handleZoneChange = (zoneId: string) => {
        setSelectedZone(zoneId);
        if (selectedWard) {
            const wardObj = allWards.find(w => w.id === selectedWard);
            const parentZ = wardObj?.parentId || wardObj?.parent?.id;
            if (zoneId && parentZ !== zoneId) {
                setSelectedWard('');
            }
        }
    };

    const handleWardChange = (wardId: string) => {
        setSelectedWard(wardId);
        if (wardId) {
            const wardObj = allWards.find(w => w.id === wardId);
            const parentZ = wardObj?.parentId || wardObj?.parent?.id;
            if (parentZ) {
                setSelectedZone(parentZ);
            }
        }
    };

    const handleViewUser = (beat: any, userId: string) => {
        setFilteredUserId(userId);
        setViewingBeat(beat);
    };

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

    const loadAssessments = useCallback(async (dFilter = dateFilter, cDate = customDate) => {
        try {
            setAssessmentsLoading(true);
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

            const res = await ModuleRecordsApi.getRecords("SWEEPING", {
                limit: 100,
                fromDate,
                toDate,
                cityId: selectedCity !== 'ALL' ? selectedCity : undefined
            });
            setAssessments(res.data || []);
            if (res.stats) setStats(res.stats);
        } catch (err) {
            console.error("Failed to load assessments", err);
        } finally {
            setAssessmentsLoading(false);
        }
    }, [dateFilter, customDate, selectedCity]);

    useEffect(() => {
        loadBeats();
        loadAssessments(dateFilter, customDate);
    }, []);

    // Filtered inspection reports
    const filteredAssessments = assessments.filter(rec => {
        if (selectedStatus && (rec.status || '').toUpperCase() !== selectedStatus) return false;

        if (selectedZone) {
            const selectedZoneObj = zones.find(z => z.id === selectedZone);
            const zName = selectedZoneObj?.name?.toLowerCase() || '';
            const recZone = (rec.zoneName || rec.zone?.name || '').toLowerCase();
            if (zName && !recZone.includes(zName)) return false;
        }

        if (selectedWard) {
            const selectedWardObj = allWards.find(w => w.id === selectedWard);
            const wName = selectedWardObj?.name?.toLowerCase() || '';
            const recWard = (rec.wardName || rec.ward?.name || '').toLowerCase();
            if (wName && !recWard.includes(wName)) return false;
        }

        if (selectedArea && (rec.areaName || rec.area?.name) !== selectedArea) return false;
        if (selectedAreaType && (rec.areaType || rec.type) !== selectedAreaType) return false;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const bName = (rec.beatName || '').toLowerCase();
            const supName = (rec.createdBy || rec.supervisor?.name || '').toLowerCase();
            if (!bName.includes(q) && !supName.includes(q)) return false;
        }

        return true;
    });

    // Unique Areas and Area Types for Dropdowns
    const uniqueAreas = Array.from(new Set(assessments.map(a => a.areaName || a.area?.name).filter(Boolean))).sort();
    const uniqueAreaTypes = Array.from(new Set(assessments.map(a => a.areaType || a.type).filter(Boolean))).sort();

    return (
        <Protected>
            <ModuleGuard module="SWEEPING" roles={["QC", "ACTION_OFFICER", "CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER"]}>
                <div className="page" style={{ padding: "24px 28px", animation: 'fadeIn 0.3s ease-out' }}>
                    <style jsx>{`
                        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                        .date-picker-input {
                            border: 1px solid #cbd5e1;
                            border-radius: 10px;
                            padding: 7px 12px;
                            font-size: 12px;
                            font-weight: 700;
                            color: #0f172a;
                            outline: none;
                            cursor: pointer;
                            background: #ffffff;
                            transition: all 0.2s;
                        }
                        .filter-select {
                            padding: 8px 14px;
                            border-radius: 10px;
                            border: 1px solid #cbd5e1;
                            font-size: 12px;
                            font-weight: 700;
                            color: #334155;
                            background-color: #ffffff;
                            outline: none;
                            cursor: pointer;
                            transition: border-color 0.15s, box-shadow 0.15s;
                        }
                        .filter-select:focus {
                            border-color: #2563eb;
                            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                        }
                    `}</style>

                    {/* TOP HEADER CONTAINER */}
                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        borderRadius: 24, padding: '24px 28px', border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 20px rgba(15,23,42,0.03)', marginBottom: 28
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                    <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                        Sweeping - Beat Management
                                    </h1>
                                    {isSuperAdmin ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>City:</span>
                                            <select
                                                value={selectedCity}
                                                onChange={(e) => setSelectedCity(e.target.value)}
                                                style={{
                                                    padding: '4px 10px',
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    borderRadius: 10,
                                                    border: '1px solid #93c5fd',
                                                    background: '#eff6ff',
                                                    color: '#1d4ed8',
                                                    cursor: 'pointer',
                                                    outline: 'none'
                                                }}
                                            >
                                                <option value="ALL">All Cities</option>
                                                {cities.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: 12, border: '1px solid #bfdbfe' }}>
                                            {user?.cityName || 'Indore'}
                                        </span>
                                    )}
                                </div>
                                <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontWeight: 500 }}>
                                    Manage street beats, daily inspection reports, and quality control assignments.
                                </p>
                            </div>

                            {/* TOP NAVIGATION TABS */}
                            <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                                <button
                                    onClick={() => setActiveTab("assessments")}
                                    style={{
                                        padding: '9px 18px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                                        background: activeTab === "assessments" ? "#2563eb" : "transparent",
                                        color: activeTab === "assessments" ? "#ffffff" : "#64748b",
                                        boxShadow: activeTab === "assessments" ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
                                        transition: "all 0.15s"
                                    }}
                                >
                                    Dashboard {stats.pending > 0 && <span style={{ marginLeft: 6, background: "#ef4444", color: "#ffffff", padding: "2px 7px", borderRadius: 10, fontSize: 10 }}>{stats.pending}</span>}
                                </button>
                                <button
                                    onClick={() => setActiveTab("submitted_reports")}
                                    style={{
                                        padding: '9px 18px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                                        background: activeTab === "submitted_reports" ? "#2563eb" : "transparent",
                                        color: activeTab === "submitted_reports" ? "#ffffff" : "#64748b",
                                        boxShadow: activeTab === "submitted_reports" ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
                                        transition: "all 0.15s"
                                    }}
                                >
                                    Inspection Reports
                                </button>
                                <button
                                    onClick={() => setActiveTab("beats")}
                                    style={{
                                        padding: '9px 18px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                                        background: activeTab === "beats" ? "#2563eb" : "transparent",
                                        color: activeTab === "beats" ? "#ffffff" : "#64748b",
                                        boxShadow: activeTab === "beats" ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
                                        transition: "all 0.15s"
                                    }}
                                >
                                    Registered Beats ({beats.length})
                                </button>
                                <Link
                                    href="/city/beat-requests"
                                    style={{
                                        padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: 'none',
                                        background: pendingBeatCount > 0 ? '#fef3c7' : 'transparent',
                                        color: pendingBeatCount > 0 ? '#b45309' : '#64748b',
                                        display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s'
                                    }}
                                >
                                    Beat Requests
                                    {pendingBeatCount > 0 && (
                                        <span style={{ background: "#d97706", color: "#ffffff", padding: "2px 6px", borderRadius: 10, fontSize: 10 }}>
                                            {pendingBeatCount}
                                        </span>
                                    )}
                                </Link>
                                <button
                                    onClick={() => setActiveTab("assignments")}
                                    style={{
                                        padding: '9px 18px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                                        background: activeTab === "assignments" ? "#2563eb" : "transparent",
                                        color: activeTab === "assignments" ? "#ffffff" : "#64748b",
                                        boxShadow: activeTab === "assignments" ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
                                        transition: "all 0.15s"
                                    }}
                                >
                                    Beat Staff Assignments
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* OPERATIONAL INTELLIGENCE & STATS (Only on Dashboard Tab) */}
                    {activeTab === "assessments" && (
                        <div style={{ marginBottom: 28 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Inspection Summary</h2>
                                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>Real-time status of beat inspections and verification reports</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 10 }}>
                                        {[
                                            { id: 'today', label: 'Today' },
                                            { id: 'week', label: 'This Week' },
                                            { id: 'month', label: 'This Month' },
                                        ].map((d) => (
                                            <button
                                                key={d.id}
                                                onClick={() => {
                                                    setDateFilter(d.id as any);
                                                    loadAssessments(d.id as any, customDate);
                                                }}
                                                style={{
                                                    padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 11,
                                                    fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                                                    background: dateFilter === d.id ? '#2563eb' : 'transparent',
                                                    color: dateFilter === d.id ? '#ffffff' : '#64748b'
                                                }}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="date"
                                        className="date-picker-input"
                                        value={customDate}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCustomDate(val);
                                            setDateFilter('custom');
                                            loadAssessments('custom', val);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* 7 STAT CARDS GRID */}
                            {(() => {
                                const handleStatClick = (statusKey: string) => {
                                    if (statusKey === 'TOTAL') {
                                        setSelectedStatus('');
                                    } else if (selectedStatus === statusKey) {
                                        setSelectedStatus('');
                                    } else {
                                        setSelectedStatus(statusKey);
                                        setActiveTab('submitted_reports');
                                    }
                                    setTimeout(() => {
                                        mainSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }, 80);
                                };

                                return (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-3.5 mb-6">
                                        <StatCard label="TOTAL REGISTERED BEATS" value={beats.length || 0} sub="Registered Assets" color="#0f172a" onClick={() => handleStatClick('TOTAL')} isActive={selectedStatus === ''} />
                                        <StatCard label="SUBMITTED REPORTS" value={stats.total || 0} sub="Total Submitted" color="#2563eb" onClick={() => handleStatClick('SUBMITTED')} isActive={selectedStatus === 'SUBMITTED'} />
                                        <StatCard label="PENDING REPORTS" value={stats.pending || 0} sub="Awaiting QC Review" color="#f59e0b" onClick={() => handleStatClick('SUBMITTED')} isActive={selectedStatus === 'SUBMITTED'} />
                                        <StatCard label="APPROVED REPORTS" value={stats.approved || 0} sub="Verified Clean" color="#10b981" onClick={() => handleStatClick('APPROVED')} isActive={selectedStatus === 'APPROVED'} />
                                        <StatCard label="REJECTED REPORTS" value={stats.actionRequired || 0} sub="Non-Compliant" color="#ef4444" onClick={() => handleStatClick('REJECTED')} isActive={selectedStatus === 'REJECTED'} />
                                        <StatCard label="ACTION REQUIRED REPORTS" value={stats.actionRequired || 0} sub="Needs Resolution" color="#ea580c" onClick={() => handleStatClick('ACTION_REQUIRED')} isActive={selectedStatus === 'ACTION_REQUIRED'} />
                                        <StatCard label="ACTION TAKEN REPORTS" value={stats.actionTaken || 0} sub="Action Completed" color="#06b6d4" onClick={() => handleStatClick('ACTION_TAKEN')} isActive={selectedStatus === 'ACTION_TAKEN'} />
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* MAIN CONTENT AREA */}
                    {loading || assessmentsLoading ? (
                        <div style={{ padding: 48, textAlign: 'center', background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                            <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid #f3f3f3', borderTop: '3px solid #2563eb', borderRadius: '50%', margin: '0 auto' }} />
                            <p style={{ marginTop: 14, color: '#64748b', fontSize: 13, fontWeight: 600 }}>Syncing sweeping workspace...</p>
                        </div>
                    ) : (
                        <div ref={mainSectionRef} style={{ animation: 'fadeIn 0.3s ease-out' }}>
                            {activeTab === 'submitted_reports' ? (
                                <SubmittedReportsTab
                                    moduleKey="SWEEPING"
                                    assetLabel="Beat"
                                    cityId={selectedCity}
                                    initialStatus={selectedStatus}
                                    onViewReport={(rec) => setInspectingBeat({ ...rec, isAssessmentReview: true })}
                                />
                            ) : activeTab === 'assignments' ? (
                                <BeatStaffAssignmentsTab />
                            ) : activeTab === 'beats' ? (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                                        <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 10 }}>
                                            <button onClick={() => setViewMode('table')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', background: viewMode === 'table' ? '#ffffff' : 'transparent', color: viewMode === 'table' ? '#2563eb' : '#64748b' }}>Table View</button>
                                            <button onClick={() => setViewMode('map')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', background: viewMode === 'map' ? '#ffffff' : 'transparent', color: viewMode === 'map' ? '#2563eb' : '#64748b' }}>Map View</button>
                                        </div>
                                    </div>
                                    {viewMode === 'table' ? (
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
                                    )}
                                </div>
                            ) : (
                                /* DASHBOARD INSPECTION REPORTS STREAM TABLE */
                                <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                                    {/* Header Controls with Dropdowns */}
                                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#fcfdfe' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Sweeping Inspection Reports</h3>
                                                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>Real-time stream of field assessments</p>
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 12px', borderRadius: 12 }}>
                                                {filteredAssessments.length} Reports Found
                                            </span>
                                        </div>

                                        {/* Dropdowns Filter Bar */}
                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                            {/* Search Input */}
                                            <input
                                                type="text"
                                                placeholder="🔍 Search by beat, supervisor..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="filter-select"
                                                style={{ flex: 1, minWidth: 220 }}
                                            />

                                            {/* Zone Dropdown */}
                                            <select value={selectedZone} onChange={e => handleZoneChange(e.target.value)} className="filter-select">
                                                <option value="">All Zones</option>
                                                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                            </select>

                                            {/* Ward Dropdown */}
                                            <select value={selectedWard} onChange={e => handleWardChange(e.target.value)} className="filter-select">
                                                <option value="">All Wards</option>
                                                {visibleWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                            </select>

                                            {/* Area Dropdown */}
                                            <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)} className="filter-select">
                                                <option value="">All Areas</option>
                                                {uniqueAreas.map((area: any) => <option key={area} value={area}>{area}</option>)}
                                            </select>

                                            {/* Area Type Dropdown */}
                                            <select value={selectedAreaType} onChange={e => setSelectedAreaType(e.target.value)} className="filter-select">
                                                <option value="">All Area Types</option>
                                                {uniqueAreaTypes.map((type: any) => <option key={type} value={type}>{type}</option>)}
                                            </select>

                                            {/* Status Dropdown */}
                                            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="filter-select">
                                                <option value="">All Status</option>
                                                <option value="PENDING_QC">Pending QC</option>
                                                <option value="APPROVED">Approved</option>
                                                <option value="REJECTED">Rejected</option>
                                                <option value="ACTION_REQUIRED">Action Required</option>
                                                <option value="ACTION_TAKEN">Resolved (Action Taken)</option>
                                            </select>

                                            {(selectedZone || selectedWard || selectedArea || selectedAreaType || selectedStatus || searchQuery) && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedZone(''); setSelectedWard(''); setSelectedArea('');
                                                        setSelectedAreaType(''); setSelectedStatus(''); setSearchQuery('');
                                                    }}
                                                    style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                                                >
                                                    Reset Filters
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Records Table */}
                                    {filteredAssessments.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '56px 24px', color: '#94a3b8' }}>
                                            <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                                            <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No sweeping reports found for this selection.</p>
                                        </div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>DATE & TIME</th>
                                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>BEAT & LOCATION</th>
                                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ZONE & WARD</th>
                                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>SUBMITTED BY</th>
                                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>STATUS</th>
                                                    <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ACTIONS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredAssessments.map((record) => (
                                                    <ReportTableRow
                                                        key={record.id}
                                                        record={record}
                                                        onView={() => setInspectingBeat({ ...record, isAssessmentReview: true })}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MODALS */}
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
                                onRefresh={() => loadAssessments(dateFilter, customDate)}
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
                            onSuccess={loadBeats}
                        />
                    )}
                </div>
            </ModuleGuard>
        </Protected>
    );
}

function StatCard({ label, value, sub, color, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
            style={{
                borderLeft: `5px solid ${color}`,
            }}
        >
            <div className="text-[9.5px] font-black text-slate-400 tracking-wider uppercase truncate" title={label}>{label}</div>
            <div className="my-1.5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{value}</div>
            <div className="text-xs text-slate-500 font-semibold truncate">{sub}</div>
        </div>
    );
}

function ReportTableRow({ record, onView }: any) {
    const st = (record.status || 'SUBMITTED').toUpperCase();
    const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
        PENDING_QC: { bg: '#eff6ff', color: '#2563eb', label: 'PENDING QC' },
        SUBMITTED: { bg: '#eff6ff', color: '#2563eb', label: 'SUBMITTED' },
        APPROVED: { bg: '#ecfdf5', color: '#059669', label: 'APPROVED' },
        REJECTED: { bg: '#fef2f2', color: '#dc2626', label: 'REJECTED' },
        ACTION_REQUIRED: { bg: '#fff7ed', color: '#c2410c', label: 'ACTION REQ.' },
        ACTION_TAKEN: { bg: '#f0fdf4', color: '#15803d', label: 'RESOLVED' },
    };
    const sc = statusConfig[st] || { bg: '#f1f5f9', color: '#64748b', label: st };
    const dt = new Date(record.createdAt);

    return (
        <tr style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}>
            <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                    {dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                    {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </td>
            <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{record.beatName || 'Street Beat'}</div>
                {record.segmentId && <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Seg: <strong>{String(record.segmentId).split('-')[0]}</strong></div>}
            </td>
            <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{record.wardName || 'Ward N/A'}</div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{record.zoneName || 'Zone N/A'}</div>
            </td>
            <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{record.createdBy || record.supervisor?.name || 'Field Employee'}</div>
                {record.phone && <div style={{ fontSize: 10, color: '#94a3b8' }}>{record.phone}</div>}
            </td>
            <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                    background: sc.bg, color: sc.color, letterSpacing: '0.04em',
                    border: `1px solid ${sc.color}22`
                }}>{sc.label}</span>
            </td>
            <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                <button
                    onClick={onView}
                    style={{
                        padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                        background: '#2563eb', color: 'white', border: 'none',
                        cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.25)', transition: 'all 0.15s'
                    }}
                >
                    📋 View Report
                </button>
            </td>
        </tr>
    );
}
