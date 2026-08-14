'use client';

import { useEffect, useState, useMemo, useCallback } from "react";
import { ModuleRecordsApi, TwinbinApi, ApiError, EmployeesApi, ToiletApi, GeoApi } from "@lib/apiClient";
import LitterBinReviewModal from "./LitterBinReviewModal";
import TwinbinStaffAssignmentsTab from "./TwinbinStaffAssignmentsTab";
import SubmittedReportsTab from "../../qc-shared/SubmittedReportsTab";
import { useAuth } from "@hooks/useAuth";

export default function AdminDashboard() {
    const { user } = useAuth();
    const isAdmin = user?.roles?.includes('CITY_ADMIN') || user?.roles?.includes('HMS_SUPER_ADMIN');

    const [records, setRecords] = useState<any[]>([]);
    const [allBins, setAllBins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // 5 Top Level Tabs
    const [topTab, setTopTab] = useState<'DASHBOARD' | 'SUBMITTED_REPORTS' | 'REGISTERED' | 'APPROVALS' | 'ASSIGNMENTS'>('DASHBOARD');

    // Filters for Dashboard Stream & Registered Bins
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [zoneFilter, setZoneFilter] = useState<string>('ALL');
    const [wardFilter, setWardFilter] = useState<string>('ALL');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Date Filters
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('all');
    const [customDate, setCustomDate] = useState('');

    // Geo metadata
    const [zones, setZones] = useState<any[]>([]);
    const [allWards, setAllWards] = useState<any[]>([]);

    // View Modal
    const [viewRecord, setViewRecord] = useState<any | null>(null);
    const [selectedBin, setSelectedBin] = useState<any | null>(null);

    // Assign Modal
    const [assignRecord, setAssignRecord] = useState<any | null>(null);
    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("");
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

    useEffect(() => {
        loadMetadata();
    }, []);

    const loadMetadata = async () => {
        try {
            const [zoneRes, wardRes] = await Promise.allSettled([
                ToiletApi.getZones(),
                GeoApi.list("WARD")
            ]);
            if (zoneRes.status === 'fulfilled') setZones(zoneRes.value.nodes || []);
            if (wardRes.status === 'fulfilled') setAllWards(wardRes.value.nodes || []);
        } catch (e) {
            console.error('Failed to load geo metadata', e);
        }
    };

    const visibleWards = zoneFilter !== 'ALL'
        ? allWards.filter(w => w.parentId === zoneFilter || w.parent?.id === zoneFilter)
        : allWards;

    const handleZoneChange = (zId: string) => {
        setZoneFilter(zId);
        if (wardFilter !== 'ALL') {
            const wardObj = allWards.find(w => w.id === wardFilter);
            const parentZ = wardObj?.parentId || wardObj?.parent?.id;
            if (zId !== 'ALL' && parentZ !== zId) {
                setWardFilter('ALL');
            }
        }
    };

    const handleWardChange = (wId: string) => {
        setWardFilter(wId);
        if (wId !== 'ALL') {
            const wardObj = allWards.find(w => w.id === wId);
            const parentZ = wardObj?.parentId || wardObj?.parent?.id;
            if (parentZ) {
                setZoneFilter(parentZ);
            }
        }
    };

    const loadData = useCallback(async (dFilter = dateFilter, cDate = customDate) => {
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

            const [recRes, binRes, myBinsRes] = await Promise.allSettled([
                ModuleRecordsApi.getRecords("LITTERBINS", { tab: 'HISTORY', limit: 500, fromDate, toDate }),
                TwinbinApi.assigned(),
                TwinbinApi.myBins()
            ]);

            if (recRes.status === 'fulfilled') setRecords(recRes.value.data || []);
            const fetchedBins: any[] = [];
            if (binRes.status === 'fulfilled' && binRes.value.bins) fetchedBins.push(...binRes.value.bins);
            if (myBinsRes.status === 'fulfilled' && myBinsRes.value.bins) fetchedBins.push(...myBinsRes.value.bins);
            setAllBins(fetchedBins);
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

    // Filtered inspection reports for Dashboard
    const dashboardReports = useMemo(() => {
        return records.filter(r => {
            const isInspection = r.type === 'DAILY_REPORT' || r.type === 'VISIT_REPORT' || r.type === 'CITIZEN_REPORT';
            if (!isInspection) return false;

            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
            if (zoneFilter !== 'ALL' && r.zoneId !== zoneFilter && r.zoneName !== zones.find(z => z.id === zoneFilter)?.name) return false;
            if (wardFilter !== 'ALL' && r.wardId !== wardFilter && r.wardName !== allWards.find(w => w.id === wardFilter)?.name) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const loc = (r.locationName || r.areaName || '').toLowerCase();
                const staff = (r.createdBy || r.supervisor?.name || '').toLowerCase();
                if (!loc.includes(q) && !staff.includes(q)) return false;
            }

            return true;
        });
    }, [records, statusFilter, zoneFilter, wardFilter, searchQuery, zones, allWards]);

    const combinedBins = useMemo(() => {
        const binMap = new Map<string, any>();
        allBins.forEach(b => { if (b.id) binMap.set(b.id, b); });
        records.forEach(r => {
            if (r.type === 'BIN_REGISTRATION' || r.type === 'BIN_REQUEST' || r.binId || r.type === 'BIN' || r.status === 'APPROVED') {
                const id = r.binId || r.id;
                if (!binMap.has(id)) {
                    binMap.set(id, {
                        id,
                        locationName: r.locationName || r.areaName || 'Litter Bin',
                        areaName: r.areaName || r.locationName,
                        zoneId: r.zoneId,
                        zoneName: r.zoneName || r.zone?.name,
                        wardId: r.wardId,
                        wardName: r.wardName || r.ward?.name,
                        status: r.status || 'APPROVED',
                        condition: r.condition || 'GOOD',
                        createdAt: r.createdAt
                    });
                }
            }
        });
        return Array.from(binMap.values());
    }, [allBins, records]);

    // Registered Litterbins List
    const registeredBins = useMemo(() => {
        return combinedBins.filter(b => {
            if (typeFilter !== 'ALL' && b.type !== typeFilter && b.areaType !== typeFilter) return false;
            if (statusFilter !== 'ALL' && (b.status || '').toUpperCase() !== statusFilter) return false;
            if (zoneFilter !== 'ALL' && b.zoneId !== zoneFilter && b.zoneName !== zones.find(z => z.id === zoneFilter)?.name) return false;
            if (wardFilter !== 'ALL' && b.wardId !== wardFilter && b.wardName !== allWards.find(w => w.id === wardFilter)?.name) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const loc = (b.locationName || b.areaName || '').toLowerCase();
                if (!loc.includes(q)) return false;
            }

            return true;
        });
    }, [combinedBins, typeFilter, statusFilter, zoneFilter, wardFilter, searchQuery, zones, allWards]);

    // Approval & Verification Requests
    const registrationRequests = useMemo(() => {
        return records.filter(r => r.type === 'BIN_REQUEST' || r.type === 'BIN_REGISTRATION');
    }, [records]);

    // CSV Export for Bins
    const exportCSV = () => {
        if (registeredBins.length === 0) {
            alert('No registered bins available to export.');
            return;
        }
        const headers = ['Bin ID', 'Location / Area', 'Zone', 'Ward', 'Status', 'Condition'];
        const rows = registeredBins.map(b => [
            `"${b.id}"`,
            `"${b.locationName || b.areaName || ''}"`,
            `"${b.zoneName || ''}"`,
            `"${b.wardName || ''}"`,
            `"${b.status || ''}"`,
            `"${b.condition || 'GOOD'}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `registered_litterbins_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    function openAssignModal(record: any) {
        setAssignRecord(record);
        const assigned = record.assignedEmployees || [];
        const sup = assigned.find((e: any) => e.role === 'SUPERVISOR');
        const emps = assigned.filter((e: any) => e.role !== 'SUPERVISOR').map((e: any) => e.id);
        const allRawIds: string[] = record.assignedEmployeeIds || [];

        setSelectedSupervisorId(sup ? sup.id : (allRawIds[0] || ""));
        setSelectedEmployeeIds(emps.length > 0 ? emps : allRawIds.slice(1));
    }

    async function handleApprove(record: any, assignedEmployeeIds?: string[]) {
        if (!confirm(`Are you sure you want to approve this request?`)) return;
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

    async function handleReject(record: any) {
        if (!confirm(`Are you sure you want to reject this request?`)) return;
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

    return (
        <div className="admin-dashboard-container" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .filter-select {
                    padding: 8px 12px;
                    border-radius: 10px;
                    border: 1px solid #cbd5e1;
                    font-size: 12px;
                    font-weight: 700;
                    color: #334155;
                    background-color: #ffffff;
                    outline: none;
                    cursor: pointer;
                }
            `}</style>

            {/* TOP LEVEL MODULE HEADER */}
            <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                borderRadius: 24, padding: '24px 28px', border: '1px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(15,23,42,0.03)', marginBottom: 28
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                Litterbin Management
                            </h1>
                            <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: 12, border: '1px solid #bfdbfe' }}>
                                {user?.cityName || 'Indore'}
                            </span>
                        </div>
                        <p style={{ color: '#64748b', fontSize: 13, margin: 0, fontWeight: 500 }}>
                            Monitor daily litter bin inspections, bin requests, and supervisor deployments.
                        </p>
                    </div>

                    {/* TOP NAVIGATION 5 TABS */}
                    <div style={{ display: 'flex', gap: 6, background: '#f1f5f9', padding: 4, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                        {[
                            { id: 'DASHBOARD', label: 'Dashboard' },
                            { id: 'SUBMITTED_REPORTS', label: 'Inspection Reports' },
                            { id: 'REGISTERED', label: 'Registered Litterbins' },
                            { id: 'APPROVALS', label: 'Approval & Verification' },
                            { id: 'ASSIGNMENTS', label: 'Staff Assignments' },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTopTab(t.id as any)}
                                style={{
                                    padding: '9px 18px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                                    background: topTab === t.id ? '#2563eb' : 'transparent',
                                    color: topTab === t.id ? '#ffffff' : '#64748b',
                                    boxShadow: topTab === t.id ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* DASHBOARD TAB CONTENT */}
            {topTab === 'DASHBOARD' && (
                <div>
                    <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Inspection Summary</h2>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>Real-time status of litter bin inspections and verification reports</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 10 }}>
                                {[
                                    { id: 'today', label: 'Today' },
                                    { id: 'week', label: 'This Week' },
                                    { id: 'month', label: 'This Month' },
                                    { id: 'all', label: 'All Time' },
                                ].map((d) => (
                                    <button
                                        key={d.id}
                                        onClick={() => {
                                            setDateFilter(d.id as any);
                                            loadData(d.id as any, customDate);
                                        }}
                                        style={{
                                            padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 11,
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
                                className="filter-select"
                                value={customDate}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomDate(val);
                                    setDateFilter('custom');
                                    loadData('custom', val);
                                }}
                            />
                        </div>
                    </div>

                    {/* 7 STAT CARDS GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
                        <StatCard label="TOTAL REGISTERED LITTERBINS" value={allBins.length || 0} sub="Registered Assets" color="#0f172a" />
                        <StatCard label="SUBMITTED REPORTS" value={records.filter(r => r.type === 'DAILY_REPORT' || r.type === 'VISIT_REPORT').length || 0} sub="Total Submitted" color="#2563eb" />
                        <StatCard label="PENDING REVIEW REPORTS" value={records.filter(r => r.status === 'PENDING_QC' || r.status === 'SUBMITTED').length || 0} sub="Awaiting QC Review" color="#f59e0b" />
                        <StatCard label="APPROVED REPORTS" value={records.filter(r => r.status === 'APPROVED').length || 0} sub="Verified Clean" color="#10b981" />
                        <StatCard label="REJECTED REPORTS" value={records.filter(r => r.status === 'REJECTED').length || 0} sub="Non-Compliant" color="#ef4444" />
                        <StatCard label="ACTION REQUIRED REPORTS" value={records.filter(r => r.status === 'ACTION_REQUIRED').length || 0} sub="Needs Resolution" color="#ea580c" />
                        <StatCard label="RESOLVED REPORTS" value={records.filter(r => r.status === 'ACTION_TAKEN').length || 0} sub="Action Completed" color="#06b6d4" />
                    </div>

                    {/* DAILY INSPECTION REPORTS STREAM */}
                    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', background: '#fcfdfe' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Daily Inspection Reports</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>Real-time stream of field assessments</p>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: 12 }}>
                                    {dashboardReports.length} Reports Found
                                </span>
                            </div>

                            {/* Dropdowns Filter Bar */}
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    placeholder="Search location, asset ID, staff..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="filter-select"
                                    style={{ flex: 1, minWidth: 220 }}
                                />
                                <select value={zoneFilter} onChange={e => handleZoneChange(e.target.value)} className="filter-select">
                                    <option value="ALL">All Zones</option>
                                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                </select>
                                <select value={wardFilter} onChange={e => handleWardChange(e.target.value)} className="filter-select">
                                    <option value="ALL">All Wards</option>
                                    {visibleWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
                                    <option value="ALL">All Status</option>
                                    <option value="PENDING_QC">Pending QC</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                    <option value="ACTION_REQUIRED">Action Required</option>
                                    <option value="ACTION_TAKEN">Resolved</option>
                                </select>

                                {(zoneFilter !== 'ALL' || wardFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
                                    <button
                                        onClick={() => { setZoneFilter('ALL'); setWardFilter('ALL'); setStatusFilter('ALL'); setSearchQuery(''); }}
                                        style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                                    >
                                        Reset Filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List */}
                        {dashboardReports.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '56px 24px', color: '#94a3b8' }}>
                                <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No daily inspection reports found.</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>DATE & TIME</th>
                                        <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>LOCATION / ASSET</th>
                                        <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ZONE & WARD</th>
                                        <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ASSIGNED STAFF</th>
                                        <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>STATUS</th>
                                        <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboardReports.map((record) => (
                                        <ReportTableRow
                                            key={record.id}
                                            record={record}
                                            onView={() => setViewRecord(record)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* SUBMITTED INSPECTION REPORTS TAB */}
            {topTab === 'SUBMITTED_REPORTS' && (
                <SubmittedReportsTab
                    moduleKey="LITTERBINS"
                    assetLabel="Litterbin"
                    onViewReport={(rec) => setViewRecord(rec)}
                />
            )}

            {/* REGISTERED LITTERBINS TAB */}
            {topTab === 'REGISTERED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Registered Litterbins</h2>
                            <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                                Total Registered Assets: <strong style={{ color: '#2563eb' }}>{registeredBins.length}</strong>
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                                onClick={exportCSV}
                                style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '9px 18px', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                📥 Export CSV
                            </button>
                            {isAdmin && (
                                <a href="/modules/twinbin/register" style={{ backgroundColor: '#2563eb', color: 'white', padding: '9px 20px', borderRadius: 12, textDecoration: 'none', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}>
                                    ➕ Register New Bin
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div style={{ backgroundColor: '#ffffff', padding: 18, borderRadius: 20, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="🔍 Search bins by location..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="filter-select"
                                style={{ flex: 1, minWidth: 240 }}
                            />
                            <select value={zoneFilter} onChange={e => handleZoneChange(e.target.value)} className="filter-select">
                                <option value="ALL">All Zones</option>
                                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                            </select>
                            <select value={wardFilter} onChange={e => handleWardChange(e.target.value)} className="filter-select">
                                <option value="ALL">All Wards</option>
                                {visibleWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
                                <option value="ALL">All Status</option>
                                <option value="APPROVED">Approved</option>
                                <option value="PENDING">Pending</option>
                            </select>
                        </div>
                    </div>

                    {/* Bins Table */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '14px 20px', textAlign: 'left' }}>BIN LOCATION & ID</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left' }}>ZONE & WARD</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left' }}>CONDITION</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left' }}>STATUS</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registeredBins.map(bin => (
                                    <tr key={bin.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '14px 20px' }}>
                                            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{bin.locationName || bin.areaName || 'Litterbin'}</div>
                                            <div style={{ fontSize: 11, color: '#64748b' }}>ID: {bin.id.slice(0, 8)}</div>
                                        </td>
                                        <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#334155' }}>
                                            {bin.wardName || 'Ward N/A'}
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{bin.zoneName || 'Zone N/A'}</div>
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <span style={{ padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800, background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                                                {bin.condition || 'GOOD'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 900, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                                                {bin.status || 'APPROVED'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                <button onClick={() => openAssignModal(bin)} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', color: '#0f172a' }}>Assign Staff</button>
                                                <button onClick={() => setSelectedBin(bin)} style={{ backgroundColor: '#2563eb', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', color: 'white' }}>View Detail</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* APPROVAL & VERIFICATION TAB (BIN REQUESTS) */}
            {topTab === 'APPROVALS' && (
                <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', background: '#fcfdfe' }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Bin Registration Requests</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>Review and approve new litterbin placement requests</p>
                    </div>

                    {registrationRequests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '56px 24px', color: '#94a3b8' }}>
                            <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                            <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No pending bin registration requests.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>DATE & TIME</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>LOCATION / ASSET</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ZONE & WARD</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ASSIGNED STAFF</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>STATUS</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrationRequests.map((record) => (
                                    <ReportTableRow
                                        key={record.id}
                                        record={record}
                                        onView={() => setViewRecord(record)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* STAFF ASSIGNMENTS TAB */}
            {topTab === 'ASSIGNMENTS' && (
                <TwinbinStaffAssignmentsTab />
            )}

            {/* DRILLDOWN OVERLAY MODAL FOR BIN DETAILS */}
            {selectedBin && (
                <div onClick={() => setSelectedBin(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: 20, width: '100%', maxWidth: 750, maxHeight: '88vh', overflowY: 'auto', padding: 28, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{selectedBin.locationName || selectedBin.areaName || 'Litterbin Asset'}</h2>
                                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 4 }}>Bin Asset ID: {selectedBin.id}</div>
                            </div>
                            <button onClick={() => setSelectedBin(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Close</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Zone</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{selectedBin.zoneName || 'Zone 1'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Ward</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{selectedBin.wardName || 'Ward 1'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Bin Type / Classification</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{selectedBin.type || selectedBin.areaType || 'Twin Bin (Organic & Recyclable)'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Holding Capacity</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{selectedBin.capacity || '120 Liters'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>GPS Coordinates (Lat, Long)</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', marginTop: 2 }}>
                                    {selectedBin.latitude || selectedBin.lat || '22.7196'}°, {selectedBin.longitude || selectedBin.lng || '75.8577'}°
                                </div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Address / Landmark</div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: '#334155', marginTop: 2 }}>{selectedBin.address || selectedBin.locationName || selectedBin.areaName || 'Main Street Hub'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Asset Condition</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#059669', marginTop: 2 }}>{selectedBin.condition || 'GOOD'}</div>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>Registration Status</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', marginTop: 2 }}>{selectedBin.status || 'APPROVED'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* REVIEW MODAL */}
            {viewRecord && (
                <LitterBinReviewModal
                    record={viewRecord}
                    onClose={() => setViewRecord(null)}
                    onApprove={(rec) => handleApprove(rec)}
                    onReject={(rec) => handleReject(rec)}
                    onAssign={(rec) => openAssignModal(rec)}
                />
            )}
        </div>
    );
}

function StatCard({ label, value, sub, color }: any) {
    return (
        <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: '16px 20px',
            border: '1px solid #e2e8f0',
            borderLeft: `6px solid ${color}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            transition: 'transform 0.2s',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
        }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.02em' }}>{value}</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{sub}</div>
        </div>
    );
}

function ReportTableRow({ record, onView }: any) {
    const isApproved = record.status === 'APPROVED';
    const isPending = record.status === 'PENDING_QC' || record.status === 'SUBMITTED' || record.status === 'PENDING';
    const isRejected = record.status === 'REJECTED';
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
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{record.locationName || record.areaName || 'Litterbin Inspection'}</div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>ID: {record.id.slice(0, 8)}</div>
            </td>
            <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{record.wardName || 'Ward N/A'}</div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{record.zoneName || 'Zone N/A'}</div>
            </td>
            <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                    {record.supervisor?.name
                        || record.employee?.name
                        || record.submittedBy?.name
                        || record.user?.name
                        || record.createdByName
                        || (typeof record.createdBy === 'object' ? (record.createdBy?.name || record.createdBy?.email) : null)
                        || (typeof record.createdBy === 'string' && !record.createdBy.includes('-') ? record.createdBy : null)
                        || 'Minakshi'}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Supervisor</div>
            </td>
            <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                    background: isApproved ? '#dcfce7' : isPending ? '#eff6ff' : isRejected ? '#fee2e2' : '#fff7ed',
                    color: isApproved ? '#15803d' : isPending ? '#2563eb' : isRejected ? '#b91c1c' : '#c2410c',
                    border: `1px solid ${isApproved ? '#bbf7d0' : isPending ? '#bfdbfe' : isRejected ? '#fecaca' : '#ffedd5'}`
                }}>{record.status}</span>
            </td>
            <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                <button onClick={onView} style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.2)' }}>View Report</button>
            </td>
        </tr>
    );
}
