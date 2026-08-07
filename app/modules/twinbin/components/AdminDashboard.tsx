'use client';

import { useEffect, useState, useMemo, useCallback } from "react";
import { ModuleRecordsApi, TwinbinApi, ApiError, EmployeesApi } from "@lib/apiClient";
import LitterBinReviewModal from "./LitterBinReviewModal";
import { extractSurveyPhotos } from "../../common/SurveyAnswers";

export default function AdminDashboard() {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Tab Filters
    const [categoryTab, setCategoryTab] = useState<'DAILY_REPORTS' | 'BIN_REQUESTS' | 'HISTORY'>('DAILY_REPORTS');
    const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTION_REQUIRED'>('ALL');

    // Date Filters
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
    const [customDate, setCustomDate] = useState('');

    // View Modal
    const [viewRecord, setViewRecord] = useState<any | null>(null);

    // Assign Modal
    const [assignRecord, setAssignRecord] = useState<any | null>(null);
    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("");
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

    function openAssignModal(record: any) {
        setAssignRecord(record);
        const assigned = record.assignedEmployees || [];
        const sup = assigned.find((e: any) => e.role === 'SUPERVISOR');
        const emps = assigned.filter((e: any) => e.role !== 'SUPERVISOR').map((e: any) => e.id);

        const allRawIds: string[] = record.assignedEmployeeIds || [];

        setSelectedSupervisorId(sup ? sup.id : (allRawIds[0] || ""));
        setSelectedEmployeeIds(emps.length > 0 ? emps : allRawIds.slice(1));
    }

    const loadData = useCallback(async (
        dFilter = dateFilter,
        cDate = customDate
    ) => {
        setLoading(true);
        try {
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

            const res = await ModuleRecordsApi.getRecords("LITTERBINS", {
                tab: 'HISTORY',
                limit: 200,
                fromDate,
                toDate
            }) as any;

            setRecords(res.data || []);
        } catch (err) {
            console.error("Failed to load records", err);
        } finally {
            setLoading(false);
        }
    }, [dateFilter, customDate]);

    async function loadSupervisors() {
        try {
            const res = await EmployeesApi.list("LITTERBINS");
            let list = res.employees || [];
            if (list.length === 0) {
                const allRes = await EmployeesApi.list();
                list = allRes.employees || [];
            }
            setSupervisors(list);
        } catch (err) {
            console.error("Failed to load supervisors", err);
        }
    }

    useEffect(() => {
        loadData(dateFilter, customDate);
        loadSupervisors();
    }, []);

    const stats = useMemo(() => {
        return {
            total: records.length,
            pending: records.filter(r => r.status === 'PENDING_QC' || r.status === 'PENDING' || r.status === 'SUBMITTED').length,
            approved: records.filter(r => r.status === 'APPROVED').length,
            rejected: records.filter(r => r.status === 'REJECTED').length,
            actionRequired: records.filter(r => r.status === 'ACTION_REQUIRED').length,
        };
    }, [records]);

    const supervisorsList = useMemo(() => {
        return supervisors.filter(emp => emp.role === 'SUPERVISOR');
    }, [supervisors]);

    const fieldEmployeesList = useMemo(() => {
        if (!assignRecord) return [];

        const binZoneId = assignRecord.zoneId;
        const binWardId = assignRecord.wardId;
        const binZoneName = assignRecord.zoneName;
        const binWardName = assignRecord.wardName;

        return supervisors.filter(emp => {
            const role = emp.role ? emp.role.toUpperCase() : '';
            if (role !== 'EMPLOYEE' && role !== 'FIELD_EMPLOYEE' && role !== 'WORKER') {
                return false;
            }

            if (emp.modules && emp.modules.length > 0) {
                const hasModule = emp.modules.some((m: any) => {
                    const k = (m.key || m.name || '').toUpperCase();
                    return k === 'LITTERBINS' || k === 'TWINBIN' || k === 'LITTER BINS';
                });
                if (!hasModule) return false;
            }

            const empZones: string[] = emp.zones || emp.zoneIds || [];
            const empWards: string[] = emp.wards || emp.wardIds || [];

            if (empZones.length > 0) {
                const matchesZone = empZones.some((z: string) =>
                    (binZoneId && z === binZoneId) ||
                    (binZoneName && z.toLowerCase() === binZoneName.toLowerCase())
                );
                if (!matchesZone) return false;
            }

            if (empWards.length > 0) {
                const matchesWard = empWards.some((w: string) =>
                    (binWardId && w === binWardId) ||
                    (binWardName && w.toLowerCase() === binWardName.toLowerCase())
                );
                if (!matchesWard) return false;
            }

            return true;
        });
    }, [supervisors, assignRecord]);

    const filteredRecords = useMemo(() => {
        let result = records;

        // Category Tab Filter
        if (categoryTab === 'DAILY_REPORTS') {
            result = result.filter(r =>
                r.type === 'DAILY_REPORT' || r.type === 'VISIT_REPORT' || r.type === 'CITIZEN_REPORT'
            );
        } else if (categoryTab === 'BIN_REQUESTS') {
            result = result.filter(r =>
                r.type === 'BIN_REQUEST' || r.type === 'BIN_REGISTRATION'
            );
        }

        // Status Tab Filter
        if (activeTab === 'PENDING') {
            result = result.filter(r => r.status === 'PENDING_QC' || r.status === 'PENDING' || r.status === 'SUBMITTED');
        } else if (activeTab !== 'ALL') {
            result = result.filter(r => r.status === activeTab);
        }

        return result;
    }, [records, categoryTab, activeTab]);

    async function handleApprove(record: any, assignedEmployeeIds?: string[], remarks?: string) {
        if ((record.type === 'BIN_REGISTRATION' || record.type === 'BIN_REQUEST') && !assignedEmployeeIds && record.status !== 'APPROVED') {
            openAssignModal(record);
            return;
        }
        if (!confirm(`Are you sure you want to approve this ${readableType(record.type).toLowerCase()}?`)) return;

        setActionLoading(record.id);
        try {
            if (record.type === 'BIN_REGISTRATION' || record.type === 'BIN_REQUEST') {
                await TwinbinApi.approve(record.id, { assignedEmployeeIds });
            } else if (record.type === 'VISIT_REPORT' || record.type === 'DAILY_REPORT') {
                await TwinbinApi.approveVisit(record.id);
            } else {
                await TwinbinApi.approveReport(record.id);
            }
            await loadData(dateFilter, customDate);
            if (viewRecord?.id === record.id) setViewRecord(null);
            setAssignRecord(null);
        } catch (err) {
            alert("Approval failed: " + (err instanceof ApiError ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleReject(record: any, remarks?: string) {
        if (!confirm(`Are you sure you want to reject this ${readableType(record.type).toLowerCase()}?`)) return;

        setActionLoading(record.id);
        try {
            if (record.type === 'BIN_REGISTRATION' || record.type === 'BIN_REQUEST') {
                await TwinbinApi.reject(record.id);
            } else if (record.type === 'VISIT_REPORT' || record.type === 'DAILY_REPORT') {
                await TwinbinApi.rejectVisit(record.id);
            } else {
                await TwinbinApi.rejectReport(record.id);
            }
            await loadData(dateFilter, customDate);
            if (viewRecord?.id === record.id) setViewRecord(null);
        } catch (err) {
            alert("Rejection failed: " + (err instanceof ApiError ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleAssignConfirm() {
        if (!assignRecord) return;
        const allAssignedIds = Array.from(new Set([selectedSupervisorId, ...selectedEmployeeIds])).filter(Boolean);
        setActionLoading(assignRecord.id);
        try {
            if (assignRecord.status === 'PENDING_QC' || assignRecord.status === 'PENDING' || assignRecord.status === 'SUBMITTED') {
                await TwinbinApi.approve(assignRecord.id, { assignedEmployeeIds: allAssignedIds });
            } else {
                await TwinbinApi.assign(assignRecord.id, { assignedEmployeeIds: allAssignedIds });
            }
            await loadData(dateFilter, customDate);
            setAssignRecord(null);
            setSelectedSupervisorId("");
            setSelectedEmployeeIds([]);
        } catch (err) {
            alert("Assignment failed: " + (err instanceof ApiError ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    }

    // Collect evidence photos for viewRecord
    const modalPhotos = useMemo(() => {
        if (!viewRecord) return [];
        const photos: string[] = [];
        if (viewRecord.photo) photos.push(viewRecord.photo);
        if (viewRecord.photoUrl) photos.push(viewRecord.photoUrl);
        if (viewRecord.visit?.photoUrl) photos.push(viewRecord.visit.photoUrl);
        if (viewRecord.payload?.photo) photos.push(viewRecord.payload.photo);
        photos.push(...extractSurveyPhotos(viewRecord.inspectionAnswers || viewRecord.questionnaire || viewRecord.payload?.inspectionAnswers));
        return Array.from(new Set(photos.filter(Boolean)));
    }, [viewRecord]);

    return (
        <div className="reports-tab" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .stats-compact-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                }
                .card-header-flex {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .section-title {
                    font-size: 16px;
                    font-weight: 800;
                    margin: 0;
                    color: #0f172a;
                }
                .compact-card {
                    padding: 24px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .modern-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .modern-table th {
                    text-align: left;
                    font-size: 11px;
                    color: #64748b;
                    padding: 14px 20px;
                    border-bottom: 2px solid #f1f5f9;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .modern-table td {
                    padding: 16px 20px;
                    font-size: 14px;
                    border-bottom: 1px solid #f1f5f9;
                    vertical-align: middle;
                }
                .tab-btn {
                    padding: 6px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 700;
                    background: transparent;
                    color: #64748b;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tab-btn:hover {
                    color: #0f172a;
                    background: #f1f5f9;
                }
                .tab-btn.active {
                    background: #eff6ff;
                    color: #2563eb;
                    box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
                }
                .btn-action {
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    border: 1px solid transparent;
                    transition: all 0.15s;
                }
                .btn-view { background: #2563eb; color: white; border-color: #2563eb; }
                .btn-view:hover { background: #1d4ed8; }
                .btn-approve { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
                .btn-approve:hover { background: #bbf7d0; }
                .btn-reject { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
                .btn-reject:hover { background: #fecaca; }
                .btn-assign { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
                .btn-assign:hover { background: #bae6fd; }
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(4px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                }
                .modal-box {
                    background: white;
                    border-radius: 20px;
                    max-width: 620px;
                    width: 100%;
                    padding: 24px;
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                    max-height: 90vh;
                    overflow-y: auto;
                }
            `}</style>

            {/* Header with Switcher Tabs */}
            <header style={{ marginBottom: 32, display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <p style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b', fontWeight: 800, letterSpacing: '0.05em', marginBottom: 8 }}>Module · Litter Bins & Twinbin</p>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                        City Governance Dashboard
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                        Monitor daily litter bin inspections, bin requests, and supervisor deployments.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <button
                            onClick={() => setCategoryTab('DAILY_REPORTS')}
                            style={{
                                padding: "8px 16px", borderRadius: "8px", border: "none", fontSize: "13px", fontWeight: 700,
                                backgroundColor: categoryTab === 'DAILY_REPORTS' ? "white" : "transparent",
                                color: categoryTab === 'DAILY_REPORTS' ? "#2563eb" : "#64748b",
                                boxShadow: categoryTab === 'DAILY_REPORTS' ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                                cursor: "pointer", transition: "all 0.2s"
                            }}
                        >
                            Daily Reports
                        </button>
                        <button
                            onClick={() => setCategoryTab('BIN_REQUESTS')}
                            style={{
                                padding: "8px 16px", borderRadius: "8px", border: "none", fontSize: "13px", fontWeight: 700,
                                backgroundColor: categoryTab === 'BIN_REQUESTS' ? "white" : "transparent",
                                color: categoryTab === 'BIN_REQUESTS' ? "#2563eb" : "#64748b",
                                boxShadow: categoryTab === 'BIN_REQUESTS' ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                                cursor: "pointer", transition: "all 0.2s"
                            }}
                        >
                            Bin Requests & Assets
                        </button>
                        <button
                            onClick={() => setCategoryTab('HISTORY')}
                            style={{
                                padding: "8px 16px", borderRadius: "8px", border: "none", fontSize: "13px", fontWeight: 700,
                                backgroundColor: categoryTab === 'HISTORY' ? "white" : "transparent",
                                color: categoryTab === 'HISTORY' ? "#2563eb" : "#64748b",
                                boxShadow: categoryTab === 'HISTORY' ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                                cursor: "pointer", transition: "all 0.2s"
                            }}
                        >
                            All / History
                        </button>
                    </div>
                </div>
            </header>

            {/* Operational Intelligence Header & Date Filters */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
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
                                    setDateFilter(d.id as any);
                                    loadData(d.id as any, customDate);
                                }}
                                style={{
                                    padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer',
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
                            loadData('custom', val);
                        }}
                        style={{
                            border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, outline: 'none', background: 'white'
                        }}
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="stats-compact-grid mb-8" style={{ marginBottom: 32 }}>
                <StatCard label="TOTAL SUBMISSIONS" value={stats.total} sub="Total records in period" color="#3b82f6" />
                <StatCard label="APPROVED BY QC" value={stats.approved} sub="Verified & compliant" color="#10b981" />
                <StatCard label="REJECTED / CRITICAL" value={stats.rejected} sub="Non-compliant records" color="#ef4444" />
                <StatCard label="PENDING REVIEW" value={stats.pending} sub="Awaiting approval" color="#f59e0b" />
            </div>

            {/* Full Width Table (Zone Breakdown Removed) */}
            <div style={{ width: '100%' }}>
                <div className="compact-card">
                    <div className="card-header-flex">
                        <h2 className="section-title">
                            {categoryTab === 'DAILY_REPORTS' ? 'Daily Inspection Reports' : categoryTab === 'BIN_REQUESTS' ? 'Bin Registration Requests' : 'All Records Stream'}
                        </h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, background: '#f8fafc', padding: 4, borderRadius: 10 }}>
                            <button className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`} onClick={() => setActiveTab('ALL')}>All</button>
                            <button className={`tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`} onClick={() => setActiveTab('PENDING')}>Pending</button>
                            <button className={`tab-btn ${activeTab === 'APPROVED' ? 'active' : ''}`} onClick={() => setActiveTab('APPROVED')}>Approved</button>
                            <button className={`tab-btn ${activeTab === 'REJECTED' ? 'active' : ''}`} onClick={() => setActiveTab('REJECTED')}>Rejected</button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>Loading records...</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>Type / Location</th>
                                        <th>Zone / Ward</th>
                                        <th>Assigned Staff</th>
                                        <th>Status</th>
                                        <th>Date & Time</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecords.slice(0, 100).map((r) => {
                                        const isPending = r.status === 'PENDING_QC' || r.status === 'PENDING' || r.status === 'SUBMITTED';
                                        const isLoadingThis = actionLoading === r.id;

                                        return (
                                            <tr key={r.id}>
                                                <td>
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                                                        backgroundColor: r.type === 'BIN_REGISTRATION' || r.type === 'BIN_REQUEST' ? '#eff6ff' : '#f0fdf4',
                                                        color: r.type === 'BIN_REGISTRATION' || r.type === 'BIN_REQUEST' ? '#2563eb' : '#059669',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {readableType(r.type)}
                                                    </span>
                                                    <div style={{ fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{r.areaName || "—"}</div>
                                                    <div style={{ fontSize: 12, color: '#64748b' }}>{r.locationName || "—"}</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{r.zoneName || "—"}</div>
                                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.wardName || "—"}</div>
                                                </td>
                                                <td>
                                                    {r.assignedEmployees && r.assignedEmployees.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                            {r.assignedEmployees.map((emp: any) => (
                                                                <span key={emp.id} style={{
                                                                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                                                                    background: emp.role === 'SUPERVISOR' ? '#eff6ff' : '#f0fdf4',
                                                                    color: emp.role === 'SUPERVISOR' ? '#1d4ed8' : '#15803d',
                                                                    border: `1px solid ${emp.role === 'SUPERVISOR' ? '#bfdbfe' : '#bbf7d0'}`,
                                                                    display: 'inline-flex', alignItems: 'center', gap: 4
                                                                }}>
                                                                    👤 {emp.name} ({emp.role ? emp.role.replace('_', ' ') : 'Staff'})
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <StatusBadge status={r.status} />
                                                </td>
                                                <td style={{ fontSize: 12, color: '#64748b' }}>
                                                    {new Date(r.createdAt).toLocaleDateString()}
                                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                                        {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        <button className="btn-action btn-view" onClick={() => setViewRecord(r)}>
                                                            View Report
                                                        </button>

                                                        {isPending && (
                                                            <>
                                                                <button
                                                                    className="btn-action btn-approve"
                                                                    disabled={isLoadingThis}
                                                                    onClick={() => handleApprove(r)}
                                                                >
                                                                    {isLoadingThis ? "..." : "Approve"}
                                                                </button>
                                                                <button
                                                                    className="btn-action btn-reject"
                                                                    disabled={isLoadingThis}
                                                                    onClick={() => handleReject(r)}
                                                                >
                                                                    {isLoadingThis ? "..." : "Reject"}
                                                                </button>
                                                            </>
                                                        )}

                                                        {(r.type === 'BIN_REGISTRATION' || r.type === 'BIN_REQUEST') && (
                                                            <button
                                                                className="btn-action btn-assign"
                                                                disabled={isLoadingThis}
                                                                onClick={() => openAssignModal(r)}
                                                            >
                                                                {r.assignedEmployees && r.assignedEmployees.length > 0 ? "Reassign" : "Assign Staff"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredRecords.length === 0 && (
                                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No records found for this selection</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Review Assessment Modal (Same design as Sweeping Module) */}
            {viewRecord && (
                <LitterBinReviewModal
                    record={viewRecord}
                    onClose={() => setViewRecord(null)}
                    onApprove={async (rec, remarks) => {
                        await handleApprove(rec, undefined, remarks);
                    }}
                    onReject={async (rec, remarks) => {
                        await handleReject(rec, remarks);
                    }}
                    onAssign={(rec) => {
                        setViewRecord(null);
                        openAssignModal(rec);
                    }}
                />
            )}

            {/* Assign Modal */}
            {assignRecord && (
                <div className="modal-overlay" onClick={() => setAssignRecord(null)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                            Assign Personnel Hierarchy
                        </h3>
                        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                            Assign a Supervisor and Field Employees for bin <strong>{assignRecord.areaName || assignRecord.id}</strong>.
                        </p>

                        {/* Step 1: Supervisor */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#1d4ed8', marginBottom: 6, textTransform: 'uppercase' }}>
                                1. Select Supervisor
                            </label>
                            <select
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, background: '#fff' }}
                                value={selectedSupervisorId}
                                onChange={(e) => setSelectedSupervisorId(e.target.value)}
                            >
                                <option value="">-- Choose Supervisor --</option>
                                {supervisorsList.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        👤 {emp.name} ({emp.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Step 2: Field Employees */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#15803d', marginBottom: 6, textTransform: 'uppercase' }}>
                                2. Select Field Employee(s) ({selectedEmployeeIds.length} selected)
                            </label>

                            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, background: '#f8fafc' }}>
                                {fieldEmployeesList.length === 0 ? (
                                    <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                                        No matching field employees found for this Zone ({assignRecord.zoneName || '—'}) / Ward ({assignRecord.wardName || '—'}).
                                    </p>
                                ) : (
                                    fieldEmployeesList.map(emp => {
                                        const isChecked = selectedEmployeeIds.includes(emp.id);
                                        return (
                                            <label
                                                key={emp.id}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                                                    background: isChecked ? '#f0fdf4' : '#ffffff', borderRadius: 6, marginBottom: 6,
                                                    cursor: 'pointer', border: `1px solid ${isChecked ? '#bbf7d0' : '#e2e8f0'}`
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedEmployeeIds(prev => [...prev, emp.id]);
                                                        } else {
                                                            setSelectedEmployeeIds(prev => prev.filter(id => id !== emp.id));
                                                        }
                                                    }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                                        {emp.name}
                                                    </span>
                                                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: '#dcfce7', color: '#166534' }}>
                                                        {emp.role ? emp.role.replace('_', ' ') : 'Employee'}
                                                    </span>
                                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{emp.email}</div>
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, color: '#475569' }}
                                onClick={() => setAssignRecord(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-action btn-approve"
                                style={{ padding: '8px 18px', fontSize: 13 }}
                                disabled={actionLoading === assignRecord.id}
                                onClick={handleAssignConfirm}
                            >
                                {actionLoading === assignRecord.id ? "Saving..." : (assignRecord.status === 'APPROVED' ? "Save Assignments" : "Assign & Approve")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, sub, color }: any) {
    return (
        <div className="stat-card-compact" style={{ borderLeft: `6px solid ${color}`, position: 'relative', overflow: 'hidden', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', borderLeftWidth: 6, borderLeftColor: color }}>
            <div className="stat-label">{label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div className="stat-value" style={{ color: '#1e293b' }}>{value}</div>
            </div>
            <div className="stat-sub">{sub}</div>
            <style jsx>{`
                .stat-card-compact {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .stat-card-compact:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
                }
                .stat-label {
                    font-size: 11px;
                    font-weight: 800;
                    color: #64748b;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                }
                .stat-value {
                    font-size: 28px;
                    font-weight: 900;
                    letter-spacing: -0.02em;
                }
                .stat-sub {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config: any = {
        'APPROVED': { bg: '#ecfdf5', text: '#065f46' },
        'REJECTED': { bg: '#fef2f2', text: '#991b1b' },
        'PENDING_QC': { bg: '#fff7ed', text: '#c2410c' },
        'PENDING': { bg: '#fff7ed', text: '#c2410c' },
        'SUBMITTED': { bg: '#fff7ed', text: '#c2410c' },
        'ACTION_REQUIRED': { bg: '#ffedd5', text: '#9a3412' }
    };
    const s = config[status] || { bg: '#f1f5f9', text: '#475569' };
    return (
        <span style={{
            background: s.bg,
            color: s.text,
            padding: '5px 10px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            display: 'inline-block'
        }}>
            {status?.replace(/_/g, " ")}
        </span>
    );
}

function readableType(type: string) {
    if (!type) return "Record";
    if (type === 'BIN_REQUEST' || type === 'BIN_REGISTRATION') return 'Bin Request';
    if (type === 'DAILY_REPORT' || type === 'VISIT_REPORT' || type === 'CITIZEN_REPORT') return 'Daily Report';
    return type.replace(/_/g, " ");
}

function getQuestionLabel(key: string) {
    const labels: Record<string, string> = {
        q1: "Is the litter bin clean and emptied?",
        q2: "Is the litter bin fixed properly?",
        q3: "Is the litter bin free of damage?",
        q4: "Is the lid present and functional?",
        q5: "Is the surrounding area clean?",
        q6: "Are twin bins separated correctly?",
        q7: "Is branding / labeling visible?",
        q8: "Is there any foul odor?",
        q9: "Is overflow prevented?",
        q10: "Overall Condition Compliant?"
    };
    return labels[key] || key.toUpperCase();
}
