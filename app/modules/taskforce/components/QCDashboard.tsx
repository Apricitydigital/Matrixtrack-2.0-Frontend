'use client';

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TaskforceApi, ApiError, AuthApi, apiFetch, EmployeesApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import { StatsCard, RecordsTable, StatusBadge, ActionButtons, TableColumn, FilterTabs } from "../../qc-shared";

type TaskforceRecord = {
    id: string;
    type: 'FEEDER_POINT' | 'FEEDER_REPORT';
    status: string;
    areaName?: string;
    locationName?: string;
    zoneId?: string;
    wardId?: string;
    zoneName?: string;
    wardName?: string;
    createdAt: string;
    assignedEmployeeIds?: string[];
};

export default function TaskforceQCDashboard() {
    const { user: authUser } = useAuth();

    const [viewTab, setViewTab] = useState<'dashboard' | 'verification' | 'supervisors'>('dashboard');
    const [records, setRecords] = useState<TaskforceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTION_REQUIRED'>('PENDING');
    const [stats, setStats] = useState<{ pending: number; approved: number; rejected: number; actionRequired: number; total: number } | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [supervisors, setEmployees] = useState<any[]>([]);
    const [assignSelection, setAssignSelection] = useState<Record<string, string>>({});
    const [selectedRecord, setSelectedRecord] = useState<TaskforceRecord | null>(null);

    // Employee Tab State
    const [empSearch, setEmpSearch] = useState("");
    const [empPage, setEmpPage] = useState(1);
    const [empLimit] = useState(10); // Rows per page for supervisors

    const [scope, setScope] = useState<{
        zones: string[];
        wards: string[];
        zoneIds: string[];
        wardIds: string[];
    } | null>(null);

    // Ensure verification view always shows pending queue
    useEffect(() => {
        if (viewTab === 'verification' && activeTab !== 'PENDING') {
            setActiveTab('PENDING');
        }
    }, [viewTab, activeTab]);

    useEffect(() => {
        setPage(1);
        if (activeTab === 'PENDING') setSelectedRecord(null);
    }, [activeTab]);

    useEffect(() => {
        if (viewTab !== 'supervisors') {
            loadData();
        } else {
            loadEmployeesOnce();
        }
    }, [activeTab, page, viewTab]);

    useEffect(() => setEmpPage(1), [empSearch, viewTab]);

    async function resolveScope() {
        try {
            const meRes = await AuthApi.getMe();
            const user = meRes.user;
            const cityId = user.cityId || authUser?.cityId;

            const moduleScope = user.modules?.find((m: any) => m.key === 'TASKFORCE');
            const zoneIds: string[] = moduleScope?.zoneIds || [];
            const wardIds: string[] = moduleScope?.wardIds || [];

            if (scope) return { zoneIds, wardIds };

            let resolvedZoneNames: string[] = [];
            let resolvedWardNames: string[] = [];
            if (cityId && zoneIds.length > 0) {
                try {
                    const zonesRes = await apiFetch<{ zones: { id: string; name: string }[] }>(`/public/cities/${cityId}/zones`);
                    resolvedZoneNames = zonesRes.zones?.filter(z => zoneIds.includes(z.id)).map(z => z.name) || [];

                    const wardPromises = zoneIds.map(zId =>
                        apiFetch<{ wards: { id: string; name: string }[] }>(`/public/zones/${zId}/wards`)
                    );
                    const wardResponses = await Promise.all(wardPromises);
                    const allWards = wardResponses.flatMap(r => r.wards || []);
                    resolvedWardNames = allWards.filter(w => wardIds.includes(w.id)).map(w => w.name);
                } catch (nameErr) {
                    console.error("QCDashboard: Name resolution failed", nameErr);
                }
            }

            setScope({
                zoneIds,
                wardIds,
                zones: resolvedZoneNames.length > 0 ? resolvedZoneNames : (zoneIds.length > 0 ? ["Ids: " + zoneIds.length] : []),
                wards: resolvedWardNames.length > 0 ? resolvedWardNames : (wardIds.length > 0 ? ["Ids: " + wardIds.length] : [])
            });

            return { zoneIds, wardIds };
        } catch (err) {
            console.error("Failed to resolve scope", err);
            return { zoneIds: [], wardIds: [] };
        }
    }

    async function loadEmployeesOnce() {
        if (supervisors.length > 0) return;
        setLoading(true);
        try {
            const empRes = await EmployeesApi.list("TASKFORCE");
            setEmployees(empRes.employees || []);
        } catch (empErr) {
            console.error("Failed to load supervisors", empErr);
        } finally {
            if (viewTab === 'supervisors') setLoading(false);
        }
    }

    async function loadData() {
        setLoading(true);
        try {
            const { zoneIds, wardIds } = await resolveScope();
            await loadEmployeesOnce();

            // Fetch tab-specific records AND always fetch full stats from DAILY_REPORTS
            // (DAILY_REPORTS tab returns stats across ALL statuses for this QC's scope)
            let allReports: TaskforceRecord[] = [];

            const mapReport = (r: any): TaskforceRecord => ({
                id: r.id,
                type: 'FEEDER_REPORT' as const,
                status: r.status,
                areaName: r.feederPoint?.areaName || r.areaName,
                locationName: r.feederPoint?.feederPointName || r.feederPoint?.locationDescription,
                zoneId: r.feederPoint?.zoneId || r.zoneId,
                wardId: r.feederPoint?.wardId || r.wardId,
                zoneName: r.feederPoint?.zoneName || r.zoneName,
                wardName: r.feederPoint?.wardName || r.wardName,
                createdAt: r.createdAt,
                assignedEmployeeIds: []
            });

            if (activeTab === 'PENDING') {
                // Use dedicated /reports/pending for most reliable pending list
                const [pendingRes, statsRes] = await Promise.all([
                    TaskforceApi.pendingReports(),
                    TaskforceApi.getRecords({ page: 1, limit: 1, tab: 'DAILY_REPORTS' })
                ]);
                allReports = (pendingRes.reports || []).map(mapReport);
                if (statsRes.stats) setStats(statsRes.stats);
            } else {
                // For other tabs use getRecords, but also fetch DAILY_REPORTS stats for accurate counts
                const [reportsRes, statsRes] = await Promise.all([
                    TaskforceApi.getRecords({ page: 1, limit: 200, tab: activeTab }),
                    TaskforceApi.getRecords({ page: 1, limit: 1, tab: 'DAILY_REPORTS' })
                ]);
                allReports = (reportsRes.data || [])
                    .filter((r: any) => r.type === 'FEEDER_REPORT' || !r.type)
                    .map(mapReport);
                if (statsRes.stats) setStats(statsRes.stats);
            }

            // QC scope filter (frontend guard — backend also enforces scope)
            const filteredByScope = allReports.filter((r) => {
                const matchZone = zoneIds.length ? zoneIds.includes(r.zoneId || "") : true;
                const matchWard = wardIds.length ? wardIds.includes(r.wardId || "") : true;
                return matchZone && matchWard;
            });

            setRecords(filteredByScope);

            if (selectedRecord) {
                const stillExists = filteredByScope.find(r => r.id === selectedRecord.id);
                if (!stillExists) setSelectedRecord(null);
            }
        } catch (err) {
            console.error("Failed to load records", err);
        } finally {
            setLoading(false);
        }
    }

    const derivedStats = useMemo(() => {
        if (stats) return stats;
        const counts = records.reduce(
            (acc, r) => {
                if (r.status === 'APPROVED') acc.approved++;
                else if (r.status === 'REJECTED') acc.rejected++;
                else if (r.status === 'ACTION_REQUIRED') acc.actionRequired++;
                else acc.pending++;
                return acc;
            },
            { pending: 0, approved: 0, rejected: 0, actionRequired: 0 }
        );
        const total = counts.pending + counts.approved + counts.rejected + counts.actionRequired;
        return { ...counts, total };
    }, [stats, records]);

    const [qcRemarkText, setQcRemarkText] = useState("");

    async function handleAction(record: TaskforceRecord, action: 'APPROVE' | 'REJECT' | 'ACTION_REQUIRED', remarkOverride?: string) {
        const remark = remarkOverride !== undefined ? remarkOverride : qcRemarkText;
        if (action !== 'APPROVE' && !remark.trim()) {
            alert(`Please enter a remark to mark as ${action.replace('_', ' ').toLowerCase()}.`);
            return;
        }
        if (!confirm(`Are you sure you want to ${action.replace('_', ' ').toLowerCase()} this item?`)) return;

        // QC only handles daily monitoring reports (FEEDER_REPORT).
        // Register Feeder (FEEDER_POINT) approvals are handled by City Admin only.
        if (record.type !== 'FEEDER_REPORT') {
            alert("QC can only review daily monitoring reports. Register Feeder approvals are handled by City Admin.");
            return;
        }

        setActionLoading(record.id);
        try {
            if (action === 'APPROVE') await TaskforceApi.approveReport(record.id, { remark });
            else if (action === 'REJECT') await TaskforceApi.rejectReport(record.id, { remark, reason: remark });
            else await TaskforceApi.actionRequiredReport(record.id, { remark, qcRemark: remark });
            setSelectedRecord(null);
            setQcRemarkText("");
            await loadData();
        } catch (err) {
            alert("Action failed: " + (err instanceof ApiError ? err.message : "Unknown error"));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleAssign(record: TaskforceRecord, supervisorId?: string) {
        const targetId = supervisorId || assignSelection[record.id] || supervisors[0]?.id;
        if (!targetId) {
            alert("Select an supervisor to assign");
            return;
        }
        setActionLoading(record.id);
        try {
            await TaskforceApi.assignFeederPoint(record.id, targetId);
            await loadData();
        } catch (err) {
            alert("Assign failed");
        } finally {
            setActionLoading(null);
        }
    }

    // --- Employee Table Logic ---
    const filteredEmployees = useMemo(() => {
        if (!empSearch) return supervisors;
        const lower = empSearch.toLowerCase();
        return supervisors.filter(e =>
            e.name?.toLowerCase().includes(lower) ||
            e.email?.toLowerCase().includes(lower) ||
            e.phone?.includes(lower)
        );
    }, [supervisors, empSearch]);

    const paginatedEmployees = useMemo(() => {
        const start = (empPage - 1) * empLimit;
        return filteredEmployees.slice(start, start + empLimit);
    }, [filteredEmployees, empPage, empLimit]);

    const totalEmpPages = Math.max(1, Math.ceil(filteredEmployees.length / empLimit));
    const empStartRow = filteredEmployees.length === 0 ? 0 : ((empPage - 1) * empLimit) + 1;
    const empEndRow = Math.min(empPage * empLimit, filteredEmployees.length);

    // --- Records Table Columns ---
    const columns: TableColumn<TaskforceRecord>[] = [
        {
            key: 'record',
            label: 'Record',
            render: (r) => (
                <div>
                    <div className="font-semibold text-sm">{r.type === 'FEEDER_POINT' ? 'Feeder Point' : 'Feeder Report'}</div>
                    <div className="muted text-xs">{r.areaName || r.locationName || '—'}</div>
                </div>
            )
        },
        {
            key: 'zone',
            label: 'Zone / Ward',
            render: (r) => (
                <div className="text-xs">
                    <div>{r.zoneName || '—'}</div>
                    <div className="muted">{r.wardName || '—'}</div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (r) => <StatusBadge status={r.status} />
        },
        {
            key: 'date',
            label: 'Submitted',
            render: (r) => (
                <div className="text-xs muted">
                    {new Date(r.createdAt).toLocaleDateString()} at {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            )
        }
    ];

    const displayRows = useMemo(() => {
        if (viewTab === 'verification') {
            // In verification view, show only reports awaiting QC action
            return records.filter(r => r.status === 'PENDING_QC' || r.status === 'PENDING' || r.status === 'SUBMITTED');
        }
        return records;
    }, [records, viewTab]);

    const pagedRows = useMemo(() => {
        const start = (page - 1) * limit;
        return displayRows.slice(start, start + limit);
    }, [displayRows, page, limit]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(displayRows.length / limit)), [displayRows.length, limit]);

    const totalRecords = displayRows.length;
    const startRow = totalRecords === 0 ? 0 : ((page - 1) * limit) + 1;
    const endRow = Math.min(page * limit, totalRecords);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [totalPages, page]);

    const actionsRenderer = (r: TaskforceRecord) => (
        <ActionButtons
            status={r.status}
            onView={() => setSelectedRecord(r)}
            onApprove={() => handleAction(r, 'APPROVE')}
            onReject={() => handleAction(r, 'REJECT')}
            onActionRequired={() => setSelectedRecord(r)}
            onAssign={(empId) => handleAssign(r, empId)}
            assignOptions={supervisors}
            assignValue={assignSelection[r.id] || ""}
            onAssignChange={(val) => setAssignSelection(prev => ({ ...prev, [r.id]: val }))}
            loading={actionLoading === r.id}
        />
    );

    return (
        <div className="content">
            <section className="card card-spacious mb-6">
                <div className="section-header">
                    <div>
                        <p className="eyebrow">Module - Taskforce</p>
                        <h1 className="text-2xl font-bold mb-1">QC Dashboard</h1>
                        <div className="muted text-sm flex flex-col gap-1">
                            <div className="flex gap-2">
                                <span className="font-semibold text-base-content w-16">Zones:</span>
                                <span>{scope?.zones?.length ? scope.zones.join(", ") : (scope ? "All" : "Loading...")}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-semibold text-base-content w-16">Wards:</span>
                                <span>{scope?.wards?.length ? scope.wards.join(", ") : (scope ? "All" : "Loading...")}</span>
                            </div>
                        </div>
                    </div>
                    <div className="section-actions">
                        <button
                            className={`btn ${viewTab === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setViewTab('dashboard')}
                        >
                            Dashboard
                        </button>
                        <button
                            className={`btn ${viewTab === 'verification' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setViewTab('verification')}
                        >
                            Verification
                        </button>
                        <button
                            className={`btn ${viewTab === 'supervisors' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setViewTab('supervisors')}
                        >
                            Employees
                        </button>
                        <div className="badge badge-warning">QC Access</div>
                    </div>
                </div>

                {viewTab !== 'supervisors' && (
                    <div className="stats-row">
                        <StatsCard label="Pending Review" value={derivedStats.pending || 0} sub="Daily Reports" color="#d97706" />
                        <StatsCard label="Approved" value={derivedStats.approved || 0} sub="Daily Reports" color="#16a34a" />
                        <StatsCard label="Action Required" value={(derivedStats as any).actionRequired || 0} sub="Sent to AO" color="#f59e0b" />
                        <StatsCard label="Rejected" value={derivedStats.rejected || 0} sub="Daily Reports" color="#ef4444" />
                        <StatsCard label="Total In Scope" value={derivedStats.total || 0} sub="All Reports" color="#0f172a" />
                    </div>
                )}
            </section>

            {viewTab === 'supervisors' ? (
                <section className="card card-spacious">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">Assigned Employees</h2>
                        <input
                            type="text"
                            placeholder="Search supervisors..."
                            className="input input-sm input-bordered w-64"
                            value={empSearch}
                            onChange={(e) => setEmpSearch(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-8"><span className="loading loading-spinner loading-md"></span></div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Role</th>
                                            <th>Contact</th>
                                            <th>Assigned Zones</th>
                                            <th>Assigned Wards</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedEmployees.length === 0 ? (
                                            <tr><td colSpan={5} className="text-center p-4 muted">No supervisors found.</td></tr>
                                        ) : (
                                            paginatedEmployees.map((e) => (
                                                <tr key={e.id} className="hover">
                                                    <td>
                                                        <div className="flex items-center gap-3">
                                                            <div className="avatar placeholder">
                                                                <div className="bg-neutral-focus text-neutral-content rounded-full w-8">
                                                                    <span className="text-xs">{e.name?.charAt(0).toUpperCase()}</span>
                                                                </div>
                                                            </div>
                                                            <div className="font-bold">{e.name}</div>
                                                        </div>
                                                    </td>
                                                    <td><div className="badge badge-sm badge-ghost">{e.role}</div></td>
                                                    <td>
                                                        <div className="flex flex-col text-xs">
                                                            <span>{e.email}</span>
                                                            <span className="muted">{e.phone}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                                            {e.zones && e.zones.length > 0 ? (
                                                                e.zones.map((z: string) => <span key={z} className="badge badge-xs badge-outline">{z}</span>)
                                                            ) : <span className="muted text-xs">-</span>}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                                            {e.wards && e.wards.length > 0 ? (
                                                                e.wards.map((w: string) => <span key={w} className="badge badge-xs badge-outline">{w}</span>)
                                                            ) : <span className="muted text-xs">-</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 border-t border-base-200 flex items-center justify-between mt-auto">
                                <div className="text-sm muted">Showing {empStartRow} - {empEndRow} of {filteredEmployees.length} records</div>
                                <div className="join">
                                    <button
                                        className="join-item btn btn-sm"
                                        disabled={empPage === 1}
                                        onClick={() => setEmpPage(p => Math.max(1, p - 1))}
                                    >
                                        « Prev
                                    </button>
                                    <button className="join-item btn btn-sm btn-ghost cursor-default">Page {empPage} of {totalEmpPages}</button>
                                    <button
                                        className="join-item btn btn-sm"
                                        disabled={empPage >= totalEmpPages}
                                        onClick={() => setEmpPage(p => p + 1)}
                                    >
                                        Next »
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            ) : (
                <section className="card card-spacious">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg">Daily Reports Review</h2>
                            <p className="muted text-sm mb-0">Daily monitoring reports within your QC scope. Register Feeder approvals are handled by City Admin.</p>
                        </div>
                        <FilterTabs
                            tabs={[
                                { id: 'PENDING', label: 'Pending' },
                                { id: 'APPROVED', label: 'Approved' },
                                { id: 'REJECTED', label: 'Rejected' },
                                { id: 'ACTION_REQUIRED', label: 'Action Req.' }
                            ]}
                            activeTab={activeTab}
                            onChange={(id) => setActiveTab(id as any)}
                        />
                    </div>

                    <RecordsTable<TaskforceRecord>
                        rows={pagedRows}
                        columns={columns}
                        loading={loading}
                        emptyMessage={viewTab === 'verification' ? "All clear! No pending requests." : "No records found"}
                        renderActions={actionsRenderer}
                        onRowClick={(r) => setSelectedRecord(r)}
                    />

                    <div className="p-4 border-t border-base-200 flex items-center justify-between">
                        <div className="text-sm muted">Showing {startRow} - {endRow} of {totalRecords} records</div>
                        <div className="join">
                            <button
                                className="join-item btn btn-sm"
                                disabled={page === 1 || loading}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                « Prev
                            </button>
                            <button className="join-item btn btn-sm btn-ghost cursor-default">Page {page} of {totalPages}</button>
                            <button
                                className="join-item btn btn-sm"
                                disabled={page >= totalPages || loading}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next »
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {selectedRecord && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', borderRadius: 16,
                        width: '90%', maxWidth: 680, maxHeight: '90vh',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div>
                                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                                    Daily Monitoring Report
                                </span>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                                    {selectedRecord.areaName || selectedRecord.locationName || 'Report'}
                                </h3>
                            </div>
                            <button onClick={() => { setSelectedRecord(null); setQcRemarkText(""); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#94a3b8' }}>✕</button>
                        </div>

                        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#f1f5f9', padding: 16, borderRadius: 10, marginBottom: 20 }}>
                                <InfoItem label="Zone / Ward" value={`${selectedRecord.zoneName || '—'} / ${selectedRecord.wardName || '—'}`} />
                                <InfoItem label="Status" value={<StatusBadge status={selectedRecord.status} />} />
                                <InfoItem label="Submitted At" value={`${new Date(selectedRecord.createdAt).toLocaleDateString()} ${new Date(selectedRecord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} />
                                <InfoItem label="Record ID" value={<span style={{ fontFamily: 'monospace', fontSize: 12 }}>{selectedRecord.id.slice(0, 12)}...</span>} />
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                    QC Review Remark / Reason
                                </label>
                                <textarea
                                    style={{
                                        width: '100%', height: 80, padding: 12, borderRadius: 8,
                                        border: '1px solid #cbd5e1', fontSize: 13, outline: 'none'
                                    }}
                                    value={qcRemarkText}
                                    onChange={(e) => setQcRemarkText(e.target.value)}
                                    placeholder="Enter review remarks (Mandatory for Reject or Action Required)..."
                                />
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button
                                className="btn btn-ghost"
                                onClick={() => { setSelectedRecord(null); setQcRemarkText(""); }}
                            >
                                Cancel
                            </button>

                            <button
                                className="btn btn-success"
                                disabled={actionLoading === selectedRecord.id}
                                onClick={() => handleAction(selectedRecord, 'APPROVE')}
                            >
                                ✓ Accept / Approve
                            </button>

                            <button
                                className="btn btn-warning"
                                disabled={actionLoading === selectedRecord.id}
                                onClick={() => handleAction(selectedRecord, 'ACTION_REQUIRED')}
                                style={{ background: '#f59e0b', color: 'white', border: 'none' }}
                            >
                                ⚠️ Action Required
                            </button>

                            <button
                                className="btn btn-error"
                                disabled={actionLoading === selectedRecord.id}
                                onClick={() => handleAction(selectedRecord, 'REJECT')}
                                style={{ background: '#ef4444', color: 'white', border: 'none' }}
                            >
                                ✕ Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="muted text-xs uppercase tracking-wide">{label}</span>
            <span className="font-semibold text-sm">{value}</span>
        </div>
    );
}

// Note: mapFeederPoint removed — QC Dashboard only handles FEEDER_REPORT records.
// FEEDER_POINT registrations are handled by City Admin (tasks/page.tsx).

