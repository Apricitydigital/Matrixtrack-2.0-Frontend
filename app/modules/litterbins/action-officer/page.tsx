'use client';

import { useEffect, useMemo, useState } from "react";
import { ModuleGuard, Protected } from "@components/Guards";
import { ApiError, TwinbinApi, GeoApi, ToiletApi } from "@lib/apiClient";
import UniversalReportModal from "@components/UniversalReportModal";
import { useAuth } from "@hooks/useAuth";

type ActionReport = {
  id: string;
  status: string;
  createdAt: string;
  actionOfficerRemark?: string;
  actionRemark?: string;
  actionPhotoUrl?: string;
  bin?: {
    id: string;
    areaName?: string;
    locationName?: string;
    zoneId?: string;
    wardId?: string;
    condition?: string;
    areaType?: string;
  };
  createdBy?: string;
  supervisorName?: string;
  [key: string]: any;
};

export default function LitterbinsActionOfficerPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ActionReport[]>([]);
  const [history, setHistory] = useState<ActionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<ActionReport | null>(null);

  // Date Filters
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');

  // Top Tab
  const [topTab, setTopTab] = useState<'reports' | 'submitted_reports' | 'all' | 'approvals'>('reports');

  // List Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Metadata for dropdowns
  const [zones, setZones] = useState<any[]>([]);
  const [allWards, setAllWards] = useState<any[]>([]);

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

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [pendingRes, historyRes] = await Promise.all([
        TwinbinApi.actionOfficerPending(),
        TwinbinApi.actionOfficerHistory()
      ]);
      setReports(pendingRes.reports || []);
      setHistory(historyRes.reports || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load action tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
    load();
  }, []);

  // Handle AO submission
  const handleActionTaken = async (record: any, actionDescription: string, remarks?: string, photoUrl?: string) => {
    const note = (actionDescription || remarks || "").trim();
    await TwinbinApi.actionOfficerSubmit(record.id, { actionNote: note || undefined });

    // Locally move from Pending to History
    const updated = {
      ...record,
      status: 'ACTION_TAKEN',
      actionOfficerRemark: note || undefined,
      actionRemark: note || undefined,
      actionPhotoUrl: photoUrl || record.actionPhotoUrl
    };
    setReports((prev) => prev.filter((r) => r.id !== record.id));
    setHistory((prev) => [updated, ...prev]);
    setActive(null);
  };

  // Combine pending + history reports for full stats & filtering
  const allReports = useMemo(() => {
    const list = [...reports, ...history];
    return list;
  }, [reports, history]);

  // Date Filter Logic
  const dateFilteredReports = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (dateFilter === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === 'week') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateFilter === 'custom' && customDate) {
      const [y, m, d] = customDate.split('-').map(Number);
      if (y && m && d) {
        start = new Date(y, m - 1, d, 0, 0, 0, 0);
        end = new Date(y, m - 1, d, 23, 59, 59, 999);
      }
    }

    if (!start || !end) return allReports;

    return allReports.filter(r => {
      const created = new Date(r.createdAt);
      return created >= start! && created <= end!;
    });
  }, [allReports, dateFilter, customDate]);

  // Calculated Stats matching Toilet Module 7-card Summary
  const stats = useMemo(() => {
    const total = dateFilteredReports.length;
    const submitted = dateFilteredReports.length;
    const pending = dateFilteredReports.filter(r => r.status === 'PENDING' || r.status === 'SUBMITTED').length;
    const approved = dateFilteredReports.filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED').length;
    const rejected = dateFilteredReports.filter(r => r.status === 'REJECTED').length;
    const actionRequired = reports.length; // Pending AO tasks
    const actionTaken = history.length; // Completed AO tasks

    return { total, submitted, pending, approved, rejected, actionRequired, actionTaken };
  }, [dateFilteredReports, reports.length, history.length]);

  // Filtered List for Table
  const filteredRows = useMemo(() => {
    let source = dateFilteredReports;

    if (topTab === 'approvals') {
      source = reports; // Pending tasks queue
    } else if (topTab === 'submitted_reports') {
      source = history; // Completed tasks
    }

    return source.filter(r => {
      if (selectedStatus && selectedStatus !== 'ALL') {
        if (selectedStatus === 'ACTION_REQUIRED' && r.status !== 'ACTION_REQUIRED' && !reports.some(p => p.id === r.id)) return false;
        if (selectedStatus === 'ACTION_TAKEN' && r.status !== 'ACTION_TAKEN' && !history.some(h => h.id === r.id)) return false;
        if (selectedStatus !== 'ACTION_REQUIRED' && selectedStatus !== 'ACTION_TAKEN' && r.status !== selectedStatus) return false;
      }

      if (selectedZone && selectedZone !== 'ALL') {
        const zId = r.bin?.zoneId || r.zoneId;
        if (zId !== selectedZone) return false;
      }

      if (selectedWard && selectedWard !== 'ALL') {
        const wId = r.bin?.wardId || r.wardId;
        if (wId !== selectedWard) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const area = (r.bin?.areaName || r.areaName || '').toLowerCase();
        const loc = (r.bin?.locationName || r.locationName || '').toLowerCase();
        const id = (r.id || '').toLowerCase();
        if (!area.includes(q) && !loc.includes(q) && !id.includes(q)) return false;
      }

      return true;
    });
  }, [dateFilteredReports, topTab, reports, history, selectedStatus, selectedZone, selectedWard, searchQuery]);

  const visibleWards = selectedZone && selectedZone !== 'ALL'
    ? allWards.filter(w => w.parentId === selectedZone || w.parent?.id === selectedZone)
    : allWards;

  return (
    <Protected>
      <ModuleGuard module="LITTERBINS" roles={["ACTION_OFFICER"]}>
        <div style={{ padding: '0 0 24px 0', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
          {/* Header Card matching Cleanliness of Toilets Page */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 24,
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px -5px rgba(15,23,42,0.05)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Litter Bins
                </h1>
                <span style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: '1px solid #93c5fd',
                  background: '#eff6ff',
                  color: '#1d4ed8'
                }}>
                  {user?.cityName || 'Indore'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                Review assigned bin reports, take necessary actions, and mark them as complete to notify QC.
              </p>
            </div>

            {/* Top Navigation Pill Tabs matching Toilet Module */}
            <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
              {[
                { id: 'reports', label: 'Dashboard' },
                { id: 'submitted_reports', label: 'Inspection Reports' },
                { id: 'all', label: 'All Registered Bins' },
                { id: 'approvals', label: 'Verification & Approvals' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTopTab(t.id as any)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.2s',
                    background: topTab === t.id ? '#2563eb' : 'transparent',
                    color: topTab === t.id ? '#ffffff' : '#64748b',
                    boxShadow: topTab === t.id ? '0 2px 8px rgba(37,99,235,0.25)' : 'none'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: 16, borderRadius: 12, backgroundColor: '#fee2e2', color: '#991b1b', marginBottom: 24, fontSize: 14, fontWeight: 600, border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          {/* Inspection Summary (7 Stat Cards Row matching Cleanliness of Toilets) */}
          <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, marginBottom: 24, boxShadow: '0 4px 20px -5px rgba(15,23,42,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>Inspection Summary</h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0', fontWeight: 500 }}>Real-time status of bin inspections and verification reports</p>
              </div>

              {/* Date Filter Pills */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#f8fafc', padding: 4, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <button
                  onClick={() => setDateFilter('today')}
                  style={{
                    padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: dateFilter === 'today' ? '#ffffff' : 'transparent',
                    color: dateFilter === 'today' ? '#0f172a' : '#64748b',
                    boxShadow: dateFilter === 'today' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateFilter('week')}
                  style={{
                    padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: dateFilter === 'week' ? '#ffffff' : 'transparent',
                    color: dateFilter === 'week' ? '#0f172a' : '#64748b',
                    boxShadow: dateFilter === 'week' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  This Week
                </button>
                <button
                  onClick={() => setDateFilter('month')}
                  style={{
                    padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: dateFilter === 'month' ? '#ffffff' : 'transparent',
                    color: dateFilter === 'month' ? '#0f172a' : '#64748b',
                    boxShadow: dateFilter === 'month' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  This Month
                </button>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => { setCustomDate(e.target.value); setDateFilter('custom'); }}
                  style={{
                    padding: '3px 8px', fontSize: 11, borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff', color: '#334155'
                  }}
                />
              </div>
            </div>

            {/* 7 Stat Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
              <StatCard label="TOTAL BINS" value={stats.total} sub="Registered Assets" borderColor="#2563eb" />
              <StatCard label="SUBMITTED REPORTS" value={stats.submitted} sub="Total Submitted" borderColor="#4f46e5" />
              <StatCard label="PENDING REPORTS" value={stats.pending} sub="Pending Review" borderColor="#f59e0b" />
              <StatCard label="APPROVED REPORTS" value={stats.approved} sub="Approved by QC" borderColor="#10b981" />
              <StatCard label="REJECTED REPORTS" value={stats.rejected} sub="Rejected by QC" borderColor="#ef4444" />
              <StatCard label="ACTION REQUIRED" value={stats.actionRequired} sub="Needs Resolution" borderColor="#ea580c" />
              <StatCard label="ACTION TAKEN REPORTS" value={stats.actionTaken} sub="Action Completed" borderColor="#06b6d4" />
            </div>
          </div>

          {/* Table & Filters Section matching Cleanliness of Toilets */}
          <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 4px 20px -5px rgba(15,23,42,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>Latest Cleanliness Inspections</h2>
              <span style={{ fontSize: 12, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', padding: '4px 12px', borderRadius: 12 }}>
                {filteredRows.length} Reports Found
              </span>
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Search bin name, ID, ward..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: '1 min-width 220px',
                  padding: '8px 14px',
                  fontSize: 13,
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  background: '#f8fafc'
                }}
              />

              <select
                value={selectedZone}
                onChange={(e) => { setSelectedZone(e.target.value); setSelectedWard('ALL'); }}
                style={{
                  padding: '8px 12px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', outline: 'none'
                }}
              >
                <option value="ALL">All Zones</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name || `Zone ${z.id}`}</option>)}
              </select>

              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                style={{
                  padding: '8px 12px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', outline: 'none'
                }}
              >
                <option value="ALL">All Wards</option>
                {visibleWards.map(w => <option key={w.id} value={w.id}>{w.name || `Ward ${w.id}`}</option>)}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  padding: '8px 12px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', outline: 'none'
                }}
              >
                <option value="">All Status</option>
                <option value="ACTION_REQUIRED">Action Required</option>
                <option value="ACTION_TAKEN">Action Taken / Resolved</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Inspections Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'left', borderBottom: '2px solid #e2e8f0', borderRadius: '10px 0 0 0' }}>S.NO</th>
                    <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>SUBMISSION DATE & TIME</th>
                    <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>BIN NAME & TYPE</th>
                    <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>LOCATION</th>
                    <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>SUBMITTED BY</th>
                    <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>STATUS</th>
                    <th style={{ padding: '12px 14px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'right', borderBottom: '2px solid #e2e8f0', borderRadius: '0 10px 0 0' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
                        Loading inspections...
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
                        No inspection reports found matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, idx) => {
                      const isPendingTask = reports.some(p => p.id === r.id);
                      const displayStatus = isPendingTask ? 'ACTION_REQUIRED' : (r.status || 'ACTION_TAKEN');

                      return (
                        <tr key={r.id} style={{ transition: 'background 0.15s' }}>
                          <td style={{ padding: '14px', fontSize: 13, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{idx + 1}</td>
                          <td style={{ padding: '14px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td style={{ padding: '14px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{r.bin?.areaName || r.areaName || "Litter Bin"}</div>
                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{r.bin?.areaType || "Twin Bin Asset"}</div>
                          </td>
                          <td style={{ padding: '14px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                              {r.bin?.locationName || r.locationName || `Zone ${r.bin?.zoneId || r.zoneId || '1'}`}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              Ward {r.bin?.wardId || r.wardId || '1'}
                            </div>
                          </td>
                          <td style={{ padding: '14px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{r.createdBy || r.supervisorName || "Supervisor"}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Field Supervisor</div>
                          </td>
                          <td style={{ padding: '14px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                            <StatusBadge status={displayStatus} />
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                            <button
                              onClick={() => setActive(r)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                background: isPendingTask ? '#2563eb' : '#eff6ff',
                                color: isPendingTask ? '#ffffff' : '#2563eb',
                                boxShadow: isPendingTask ? '0 2px 6px rgba(37,99,235,0.2)' : 'none',
                                transition: 'all 0.15s'
                              }}
                            >
                              {isPendingTask ? 'Process Action' : 'View Report'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Universal Report Modal */}
          {active && (
            <UniversalReportModal
              moduleTitle="Litter Bins"
              moduleBadge="ACTION OFFICER"
              record={active}
              isAO={true}
              onClose={() => setActive(null)}
              onActionTaken={handleActionTaken}
            />
          )}
        </div>
      </ModuleGuard>
    </Protected>
  );
}

function StatCard({ label, value, sub, borderColor }: { label: string; value: number; sub: string; borderColor: string }) {
  return (
    <div style={{
      borderLeft: `5px solid ${borderColor}`,
      background: '#ffffff',
      padding: '12px 14px',
      borderRadius: 14,
      borderTop: '1px solid #f1f5f9',
      borderRight: '1px solid #f1f5f9',
      borderBottom: '1px solid #f1f5f9',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '4px 0 2px 0', letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    APPROVED: { bg: '#ecfdf5', color: '#059669', label: 'APPROVED' },
    COMPLETED: { bg: '#ecfdf5', color: '#059669', label: 'APPROVED' },
    ACTION_TAKEN: { bg: '#f0fdf4', color: '#15803d', label: 'RESOLVED' },
    REJECTED: { bg: '#fef2f2', color: '#dc2626', label: 'REJECTED' },
    PENDING: { bg: '#eff6ff', color: '#2563eb', label: 'PENDING' },
    SUBMITTED: { bg: '#eff6ff', color: '#2563eb', label: 'SUBMITTED' },
    ACTION_REQUIRED: { bg: '#fff7ed', color: '#c2410c', label: 'ACTION REQ.' }
  };
  const s = map[status] || { bg: '#f1f5f9', color: '#475569', label: status.replace(/_/g, ' ') };
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: 12,
      fontSize: 10,
      fontWeight: 800,
      backgroundColor: s.bg,
      color: s.color,
      letterSpacing: '0.03em',
      display: 'inline-block'
    }}>
      {s.label}
    </span>
  );
}
