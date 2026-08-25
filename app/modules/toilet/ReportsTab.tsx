import { useEffect, useState, useRef } from 'react';
import { ApiError, ToiletApi, GeoApi } from '@lib/apiClient';
import Link from 'next/link';
import { FilterTabs } from "../qc-shared";
import UniversalReportModal from '@components/UniversalReportModal';
import { useAuth } from '@hooks/useAuth';
import { isReportVisibleToAO } from '@lib/aoScope';

export default function ReportsTab({ cityId }: { cityId?: string }) {
    const { user } = useAuth();
    const tableSectionRef = useRef<HTMLDivElement>(null);
    const [stats, setStats] = useState<any>(null);
    const [totalToiletsCount, setTotalToiletsCount] = useState<number>(0);
    const [reports, setReports] = useState<any[]>([]);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reportsError, setReportsError] = useState('');
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today');
    const [customDate, setCustomDate] = useState('');

    // List Filters
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [selectedZone, setSelectedZone] = useState<string>('');
    const [selectedWard, setSelectedWard] = useState<string>('');
    const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Metadata for dropdowns
    const [zones, setZones] = useState<any[]>([]);
    const [allWards, setAllWards] = useState<any[]>([]);
    const [supervisors, setSupervisors] = useState<any[]>([]);

    useEffect(() => {
        loadMetadata();
    }, []);

    const loadMetadata = async () => {
        try {
            const [zoneRes, empRes, toiRes, wardRes] = await Promise.allSettled([
                ToiletApi.getZones(),
                ToiletApi.listEmployees(),
                ToiletApi.listAllToilets(),
                GeoApi.list("WARD")
            ]);
            if (zoneRes.status === 'fulfilled') setZones(zoneRes.value.nodes || []);
            if (empRes.status === 'fulfilled') setSupervisors((empRes.value.employees || []).filter((e: any) => e.role === 'SUPERVISOR'));
            if (toiRes.status === 'fulfilled') {
                const list = toiRes.value.toilets || [];
                const filtered = cityId && cityId !== 'ALL' ? list.filter((t: any) => t.cityId === cityId || t.city?.id === cityId) : list;
                setTotalToiletsCount(filtered.length);
            }
            if (wardRes.status === 'fulfilled') setAllWards(wardRes.value.nodes || []);
        } catch (e) {
            console.error('Failed to load metadata', e);
        }
    };

    // Filtered wards based on selectedZone
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

    useEffect(() => {
        loadReports();
    }, [dateFilter, customDate, selectedStatus, cityId]);

    const loadReports = async () => {
        setLoading(true);
        setError('');
        setReportsError('');

        let startDate: string | undefined;
        let endDate: string | undefined;

        const now = new Date();
        if (dateFilter === 'today') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            startDate = start.toISOString();
            endDate = end.toISOString();
        } else if (dateFilter === 'custom' && customDate) {
            const [year, month, day] = customDate.split('-').map(Number);
            if (year && month && day) {
                const start = new Date(year, month - 1, day, 0, 0, 0, 0);
                const end = new Date(year, month - 1, day, 23, 59, 59, 999);
                startDate = start.toISOString();
                endDate = end.toISOString();
            }
        }

        try {
            const params: any = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            const statsRes = await ToiletApi.getDashboardStats(params);
            setStats(statsRes);
        } catch (err) {
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                setError('Not authorized for Cleanliness of Toilets module.');
            } else {
                setError('Failed to load dashboard data.');
            }
        }

        try {
            const inspectionsRes = await ToiletApi.listInspections({
                pageSize: 100,
                status: selectedStatus || undefined,
                startDate,
                endDate
            });
            setReports(inspectionsRes.inspections || []);
        } catch (err: any) {
            console.error('Failed to load recent toilet inspections', err);
            setReports([]);
            setReportsError(err instanceof ApiError ? err.message : 'Failed to load recent inspections.');
        } finally {
            setLoading(false);
        }
    };

    const statusMap: Record<string, { bg: string; color: string; label: string }> = {
        SUBMITTED: { bg: '#eff6ff', color: '#2563eb', label: 'SUBMITTED' },
        APPROVED: { bg: '#ecfdf5', color: '#059669', label: 'APPROVED' },
        REJECTED: { bg: '#fef2f2', color: '#dc2626', label: 'REJECTED' },
        ACTION_REQUIRED: { bg: '#fff7ed', color: '#c2410c', label: 'ACTION REQ.' },
        ACTION_TAKEN: { bg: '#f0fdf4', color: '#15803d', label: 'RESOLVED' },
    };

    // Client-side filtering by Zone, Ward, Supervisor & AO Scope
    const filteredReports = reports.filter(r => {
        if (!isReportVisibleToAO(user, r, 'TOILET')) return false;

        if (selectedZone) {
            const zId = r.toilet?.ward?.parentId || r.toilet?.zoneId || r.zoneId;
            if (zId !== selectedZone) return false;
        }
        if (selectedWard) {
            const wId = r.toilet?.wardId || r.wardId;
            if (wId !== selectedWard) return false;
        }
        if (selectedSupervisor) {
            const supId = r.supervisorId || r.supervisor?.id;
            if (supId !== selectedSupervisor) return false;
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const tName = (r.toilet?.name || '').toLowerCase();
            const tType = (r.toilet?.type || '').toLowerCase();
            const sName = (r.supervisor?.name || r.employee?.name || r.submittedBy?.name || '').toLowerCase();
            const wName = (r.toilet?.ward?.name || r.wardName || '').toLowerCase();
            if (!tName.includes(q) && !tType.includes(q) && !sName.includes(q) && !wName.includes(q)) return false;
        }
        return true;
    });

    const activeStats = stats ? (stats[dateFilter] || stats.today || {}) : {};

    return (
        <div className="reports-tab" style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .date-picker-input {
                    border: 1px solid #cbd5e1;
                    border-radius: 10px;
                    padding: 6px 12px;
                    font-size: 12px;
                    font-weight: 700;
                    color: #0f172a;
                    outline: none;
                    cursor: pointer;
                    background: #ffffff;
                    transition: all 0.2s;
                }
                .date-picker-input:focus {
                    border-color: #2563eb;
                }
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

            <div className="admin-dashboard">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Inspection Summary</h2>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>Real-time status of toilet inspections and verification reports</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <FilterTabs
                            tabs={[
                                { id: 'today', label: 'Today' },
                                { id: 'week', label: 'This Week' },
                                { id: 'month', label: 'This Month' },
                            ]}
                            activeTab={dateFilter}
                            onChange={(id: any) => setDateFilter(id)}
                        />
                        <input
                            type="date"
                            className="date-picker-input"
                            value={customDate}
                            onChange={(e) => {
                                setCustomDate(e.target.value);
                                setDateFilter('custom');
                            }}
                        />
                    </div>
                </div>

                {/* 7 STAT CARDS IN A GRID */}
                {(() => {
                    const handleStatClick = (statusKey: string) => {
                        if (statusKey === 'TOTAL') {
                            setSelectedStatus('');
                        } else if (selectedStatus === statusKey) {
                            setSelectedStatus('');
                        } else {
                            setSelectedStatus(statusKey);
                        }
                        setTimeout(() => {
                            tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 80);
                    };

                    const pendingVal = (activeStats?.submitted || 0) - (activeStats?.approved || 0) - (activeStats?.rejected || 0);

                    return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-3.5 mb-6">
                            <StatCard label="TOTAL TOILETS" value={totalToiletsCount} sub="Registered Assets" color="#0f172a" onClick={() => handleStatClick('TOTAL')} isActive={selectedStatus === ''} />
                            <StatCard label="SUBMITTED REPORTS" value={activeStats?.submitted || 0} sub="Total Submitted" color="#2563eb" onClick={() => handleStatClick('SUBMITTED')} isActive={selectedStatus === 'SUBMITTED'} />
                            <StatCard label="PENDING REPORTS" value={pendingVal > 0 ? pendingVal : 0} sub="Pending Review" color="#f59e0b" onClick={() => handleStatClick('SUBMITTED')} isActive={selectedStatus === 'SUBMITTED'} />
                            <StatCard label="APPROVED REPORTS" value={activeStats?.approved || 0} sub="Approved by QC" color="#10b981" onClick={() => handleStatClick('APPROVED')} isActive={selectedStatus === 'APPROVED'} />
                            <StatCard label="REJECTED REPORTS" value={activeStats?.rejected || 0} sub="Rejected by QC" color="#ef4444" onClick={() => handleStatClick('REJECTED')} isActive={selectedStatus === 'REJECTED'} />
                            <StatCard label="ACTION REQUIRED" value={activeStats?.actionRequired || 0} sub="Needs Resolution" color="#ea580c" onClick={() => handleStatClick('ACTION_REQUIRED')} isActive={selectedStatus === 'ACTION_REQUIRED'} />
                            <StatCard label="ACTION TAKEN REPORTS" value={activeStats?.actionTaken || 0} sub="Action Completed" color="#06b6d4" onClick={() => handleStatClick('ACTION_TAKEN')} isActive={selectedStatus === 'ACTION_TAKEN'} />
                        </div>
                    );
                })()}
            </div>

            {loading && <div className="loading-state" style={{ padding: 24, textAlign: 'center', color: '#64748b' }}><p>Syncing dashboard...</p></div>}
            {error && <div className="alert error" style={{ padding: 12, borderRadius: 10, background: '#fee2e2', color: '#b91c1c', marginBottom: 16 }}>{error}</div>}
            {!error && reportsError && <div className="alert error" style={{ padding: 12, borderRadius: 10, background: '#fee2e2', color: '#b91c1c', marginBottom: 16 }}>{reportsError}</div>}

            {!loading && !error && (
                <div ref={tableSectionRef} style={{ background: 'white', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                    {/* Header Controls with Dropdown Filters */}
                    <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', background: '#fcfdfe' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>Latest Cleanliness Inspections</h3>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: 12 }}>
                                {filteredReports.length} Reports Found
                            </span>
                        </div>

                        {/* Dropdowns & Search Filter Bar */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="Search toilet name, ID, ward, supervisor..."
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

                            {/* Ward Dropdown (Always enabled, auto-selects zone) */}
                            <select value={selectedWard} onChange={e => handleWardChange(e.target.value)} className="filter-select">
                                <option value="">All Wards</option>
                                {visibleWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>

                            {/* Supervisor Dropdown */}
                            <select value={selectedSupervisor} onChange={e => setSelectedSupervisor(e.target.value)} className="filter-select">
                                <option value="">All Supervisors</option>
                                {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>

                            {/* Status Dropdown */}
                            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="filter-select">
                                <option value="">All Status</option>
                                <option value="SUBMITTED">Submitted</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                                <option value="ACTION_REQUIRED">Action Required</option>
                                <option value="ACTION_TAKEN">Resolved (Action Taken)</option>
                            </select>

                            {(selectedZone || selectedWard || selectedSupervisor || selectedStatus) && (
                                <button
                                    onClick={() => { setSelectedZone(''); setSelectedWard(''); setSelectedSupervisor(''); setSelectedStatus(''); }}
                                    style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Records Table */}
                    {filteredReports.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '56px 24px', color: '#94a3b8' }}>
                            <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                            <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>No inspections found for this selection.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', width: 45 }}>S.NO</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>SUBMISSION DATE & TIME</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>TOILET NAME & TYPE </th>
                                        <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>LOCATION</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>SUBMITTED BY</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>STATUS</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReports.slice(0, 15).map((report, idx) => {
                                        const st = (report.status || 'SUBMITTED').toUpperCase();
                                        const sc = statusMap[st] || { bg: '#f1f5f9', color: '#64748b', label: st };
                                        const dt = new Date(report.createdAt);

                                        const submitterName = report.supervisor?.name
                                            || report.employee?.name
                                            || report.submittedBy?.name
                                            || report.user?.name
                                            || report.createdByName
                                            || (typeof report.supervisor === 'string' && !report.supervisor.includes('-') ? report.supervisor : 'Minakshi');

                                        return (
                                            <tr key={report.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}>
                                                {/* S.NO */}
                                                <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                                                    {idx + 1}
                                                </td>

                                                {/* Date & Time */}
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                                                        {dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                                                        {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>

                                                {/* Toilet Name & Type */}
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{report.toilet?.name || 'Public Toilet Asset'}</div>
                                                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{report.toilet?.type || 'PT / CT Toilet'}</div>
                                                </td>

                                                {/* Location (Zone & Ward) */}
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{report.toilet?.ward?.name || report.wardName || 'Ward 1'}</div>
                                                    <div style={{ fontSize: 11, color: '#64748b' }}>{report.toilet?.ward?.parent?.name || report.zoneName || 'Zone 1'}</div>
                                                </td>

                                                {/* Submitted By */}
                                                <td style={{ padding: '12px 14px' }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{submitterName}</div>
                                                    <div style={{ fontSize: 11, color: '#64748b' }}>Supervisor</div>
                                                </td>

                                                {/* Status */}
                                                <td style={{ padding: '12px 14px' }}>
                                                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}22` }}>
                                                        {sc.label}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => setSelectedReport(report)}
                                                        style={{
                                                            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                                                            background: '#2563eb', color: '#fff', border: 'none',
                                                            cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.2)'
                                                        }}
                                                    >
                                                        View Report
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {selectedReport && (
                <UniversalReportModal
                    moduleTitle="Cleanliness of Toilet"
                    moduleBadge="HMS TOILET AUDIT"
                    record={selectedReport}
                    onClose={() => setSelectedReport(null)}
                    onApprove={async (rec, comment) => {
                        await ToiletApi.reviewInspection(rec.id, { status: 'APPROVED', comment });
                        loadReports();
                    }}
                    onReject={async (rec, comment) => {
                        await ToiletApi.reviewInspection(rec.id, { status: 'REJECTED', comment });
                        loadReports();
                    }}
                    onActionRequired={async (rec, comment) => {
                        await ToiletApi.reviewInspection(rec.id, { status: 'ACTION_REQUIRED', comment });
                        loadReports();
                    }}
                />
            )}

            <style jsx>{`
                .stats-compact-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 14px;
                }
            `}</style>
        </div>
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
