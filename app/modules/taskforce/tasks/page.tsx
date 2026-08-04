'use client';

import { useEffect, useState } from "react";
import { ModuleGuard } from "@components/Guards";
import { TaskforceApi, ApiError, CityApi, EmployeesApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import AssignmentsTab from "../AssignmentsTab";

type Case = {
  id: string;
  title: string;
  status: string;
  assignedTo?: string;
  geoNodeId?: string;
  activities?: any[];
};

export default function TaskforceTasksPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Tabbed view state for City Admin Dashboard
  const [activeTab, setActiveTab] = useState<'REGISTRATIONS' | 'REPORTS' | 'FEEDER_POINTS' | 'CASES' | 'ASSIGNMENTS'>('REGISTRATIONS');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [allFeederPoints, setAllFeederPoints] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Assignment state
  const [supervisors, setSupervisors] = useState<{ id: string; name: string; email: string; role?: string }[]>([]);
  const [assignSelection, setAssignSelection] = useState<Record<string, string>>({});
  const [assignModal, setAssignModal] = useState<{ fp: any } | null>(null);

  // City Filter State
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");

  // Detailed Metrics State
  const [metrics, setMetrics] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    actionRequired: 0,
    actionTaken: 0,
    systemPerformance: 0,
    eliminated: 0,
    inProgress: 0,
    pendingRequests: 0,
    assignedPoints: 0,
    unassignedPoints: 0,
    registeredStaff: 0
  });

  const [title, setTitle] = useState("");
  const [geoNodeId, setGeoNodeId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [createStatus, setCreateStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const [activityByCase, setActivityByCase] = useState<Record<string, string>>({});
  const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null);

  const loadCases = async () => {
    try {
      const data = await TaskforceApi.listCases(selectedCity);
      setCases(data.cases || []);
      setError("");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError("Not authorized for Taskforce in this city.");
      } else {
        setError("Failed to load tasks.");
      }
    }
  };

  const { user, loading: authLoading } = useAuth();
  const isSuperAdmin = user?.roles?.includes("HMS_SUPER_ADMIN");
  const isCityAdmin = user?.roles?.includes("CITY_ADMIN") || isSuperAdmin;

  const loadCities = async () => {
    try {
      if (isSuperAdmin) {
        const { cities } = await CityApi.list();
        setCities(cities || []);
        if (cities?.length > 0 && !selectedCity) {
          setSelectedCity(cities[0].id);
        }
      } else if (user?.cityId) {
        setCities([{ id: user.cityId, name: user.cityName || "My City" }]);
        setSelectedCity(user.cityId);
      }
    } catch (err) {
      console.error("Failed to load cities", err);
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel:
      // 1. feederRequests() — ALL feeder points for City Admin (no status filter)
      // 2. pendingReports() — reports awaiting QC review
      // 3. getRecords(DAILY_REPORTS) — get full stats across all statuses (most accurate)
      // 4. EmployeesApi — get registered taskforce staff count
      const [allFpRes, repRes, statsRes, empRes] = await Promise.all([
        TaskforceApi.feederRequests().catch((err) => {
          console.error('[loadAdminData] feederRequests() failed:', err);
          return { feederPoints: [] };
        }),
        TaskforceApi.pendingReports().catch((err) => {
          console.error('[loadAdminData] pendingReports() failed:', err);
          return { reports: [] };
        }),
        // Use DAILY_REPORTS tab to get accurate stats across ALL statuses — not PENDING
        TaskforceApi.getRecords({ tab: 'DAILY_REPORTS', limit: 1 }).catch((err) => {
          console.error('[loadAdminData] getRecords(DAILY_REPORTS) failed:', err);
          return { stats: null, data: [] };
        }),
        EmployeesApi.list('TASKFORCE').catch((err) => {
          console.error('[loadAdminData] EmployeesApi.list() failed:', err);
          return { employees: [] };
        })
      ]);

      setSupervisors((empRes.employees || []).map((e: any) => ({ id: e.id, name: e.name, email: e.email || '', role: e.role || '' })));

      const allFPs: any[] = allFpRes.feederPoints || [];
      const reports: any[] = repRes.reports || [];
      // Stats from DAILY_REPORTS gives accurate combined feeder point + report counts
      const stats = (statsRes as any).stats || {};

      // Split feeder points by status
      const pendingFPs = allFPs.filter((fp: any) => fp.status === 'PENDING_QC');
      const approvedUnassigned = allFPs.filter((fp: any) => fp.status === 'APPROVED' && (!fp.assignedEmployeeIds || fp.assignedEmployeeIds.length === 0));
      const approvedAssigned = allFPs.filter((fp: any) => fp.status === 'APPROVED' && fp.assignedEmployeeIds && fp.assignedEmployeeIds.length > 0);

      console.log('[loadAdminData] allFPs:', allFPs.length, '| pending:', pendingFPs.length, '| approvedUnassigned:', approvedUnassigned.length, '| approvedAssigned:', approvedAssigned.length, '| stats:', stats);

      setPendingRequests(pendingFPs);
      setPendingReports(reports);
      setAllFeederPoints(allFPs);
      setRecords((statsRes as any).data || []);

      setMetrics({
        // Feeder point counts derived from the full list (most accurate)
        total: allFPs.filter((fp: any) => fp.status === 'APPROVED').length,
        pendingRequests: pendingFPs.length,
        assignedPoints: approvedAssigned.length,
        unassignedPoints: approvedUnassigned.length,
        // Report stats from DAILY_REPORTS tab (combined feeder point + daily report counts)
        approved: stats.approved || 0,
        rejected: stats.rejected || 0,
        actionRequired: stats.actionRequired || 0,
        actionTaken: 0,
        systemPerformance: 0,
        eliminated: 0,
        inProgress: 0,
        registeredStaff: (empRes.employees || []).length
      });
    } catch (err) {
      console.error('[loadAdminData] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadCities();
  }, [user]);

  useEffect(() => {
    if (selectedCity) {
      loadCases();
      loadAdminData();
    }
  }, [selectedCity]);

  const handleApproveRequest = async (id: string) => {
    if (!confirm("Approve this CTU/GVP feeder point registration request?")) return;
    setActionLoading(id);
    try {
      await TaskforceApi.approveRequest(id, { status: "APPROVED" });
      await loadAdminData();
    } catch (err: any) {
      alert("Approve failed: " + (err?.message || "Unknown error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (id: string) => {
    if (!confirm("Reject this CTU/GVP feeder point registration request?")) return;
    setActionLoading(id);
    try {
      await TaskforceApi.rejectRequest(id);
      await loadAdminData();
    } catch (err: any) {
      alert("Reject failed: " + (err?.message || "Unknown error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveReport = async (id: string) => {
    if (!confirm("Approve this daily monitoring inspection report?")) return;
    setActionLoading(id);
    try {
      await TaskforceApi.approveReport(id);
      await loadAdminData();
    } catch (err: any) {
      alert("Approve report failed: " + (err?.message || "Unknown error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectReport = async (id: string) => {
    if (!confirm("Reject this daily monitoring inspection report?")) return;
    setActionLoading(id);
    try {
      await TaskforceApi.rejectReport(id);
      await loadAdminData();
    } catch (err: any) {
      alert("Reject report failed: " + (err?.message || "Unknown error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleActionRequiredReport = async (id: string) => {
    if (!confirm("Flag this report as Action Required?")) return;
    setActionLoading(id);
    try {
      await TaskforceApi.actionRequiredReport(id);
      await loadAdminData();
    } catch (err: any) {
      alert("Action required failed: " + (err?.message || "Unknown error"));
    } finally {
      setActionLoading(null);
    }
  };


  const handleAssignFeeder = async () => {
    if (!assignModal) return;
    const employeeId = assignSelection[assignModal.fp.id];
    if (!employeeId) { alert('Please select a Taskforce member to assign.'); return; }
    if (!confirm('Assign this Taskforce member to the feeder point?')) return;
    setActionLoading(assignModal.fp.id);
    try {
      await TaskforceApi.assignFeederPoint(assignModal.fp.id, employeeId);
      setAssignSelection(prev => ({ ...prev, [assignModal.fp.id]: '' }));
      setAssignModal(null);
      await loadAdminData();
    } catch (err: any) {
      alert('Assign failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const createCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setCreateStatus("Saving...");
    try {
      await TaskforceApi.createCase({
        title,
        geoNodeId: geoNodeId || undefined,
        assignedTo: assignedTo || undefined
      });
      setCreateStatus("Created task");
      setTitle("");
      setGeoNodeId("");
      setAssignedTo("");
      await loadCases();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create";
      setCreateStatus(msg);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string, newAssignee?: string) => {
    try {
      setUpdatingCaseId(id);
      await TaskforceApi.updateCase(id, { status, assignedTo: newAssignee || undefined });
      setCases((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status, assignedTo: newAssignee || c.assignedTo } : c))
      );
    } catch (err) {
      setError("Failed to update status or assignee.");
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const addActivity = async (id: string) => {
    const note = activityByCase[id];
    if (!note) return;
    try {
      await TaskforceApi.addActivity(id, { action: "NOTE", metadata: { note } });
      setActivityByCase((prev) => ({ ...prev, [id]: "" }));
      await loadCases();
    } catch (err) {
      setError("Failed to add activity.");
    }
  };

  // ⚠️ HYDRATION FIX: Auth is client-side only. During server render, user=null → isCityAdmin=false.
  // Returning a consistent spinner prevents the server/client HTML mismatch.
  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (isCityAdmin) {
    return (
      <ModuleGuard module="TASKFORCE" roles={["CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
        <div style={{ animation: 'fadeIn 0.5s ease-out', paddingBottom: 40 }}>
          <style jsx>{`
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .card-header-flex {
              display: flex;
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
              border-radius: 12px;
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
              padding: 12px 16px;
              border-bottom: 2px solid #f1f5f9;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .modern-table td {
              padding: 14px 16px;
              font-size: 13px;
              border-bottom: 1px solid #f1f5f9;
              vertical-align: middle;
            }
            .tab-btn {
              padding: 8px 16px;
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
            .btn-action-approve {
              background: #10b981;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 700;
              cursor: pointer;
            }
            .btn-action-approve:hover { background: #059669; }
            .btn-action-reject {
              background: #ef4444;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 700;
              cursor: pointer;
            }
            .btn-action-reject:hover { background: #dc2626; }
            .btn-action-warn {
              background: #f59e0b;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 700;
              cursor: pointer;
            }
            .btn-action-warn:hover { background: #d97706; }
          `}</style>

          <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 13, textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>Module · CTU / GVP Transformation</p>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>Task & Monitoring Management</h1>
              <p style={{ color: '#64748b', marginTop: 8 }}>Track CTU/GVP feeder points, daily monitoring reports, and registration requests.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {isSuperAdmin ? (
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    style={{
                      appearance: 'none',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '10px 36px 10px 16px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      minWidth: 200
                    }}
                  >
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                    {cities.length === 0 && <option>Loading cities...</option>}
                  </select>
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: '#f1f5f9',
                  padding: '10px 16px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#334155',
                  border: '1px solid #e2e8f0'
                }}>
                  {cities.find(c => c.id === selectedCity)?.name || user?.cityName || "My City"}
                </div>
              )}
            </div>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            <StatCard label="Total Feeder Points" value={metrics.total || 0} sub="Identified Points" color="#3b82f6" />
            <StatCard label="Pending Requests" value={pendingRequests.length} sub="Registration Queue" color="#8b5cf6" />
            <StatCard label="Assigned Points" value={metrics.assignedPoints || 0} sub="Active Field Coverage" color="#6366f1" />
            <StatCard label="Unassigned Points" value={metrics.unassignedPoints || 0} sub="Awaiting Assignment" color="#0ea5e9" />

            <StatCard label="QC Approved Reports" value={metrics.approved || 0} sub="Verified Clean" color="#10b981" />
            <StatCard label="Action Required" value={metrics.actionRequired || 0} sub="Needs Attention" color="#f59e0b" />
            <StatCard label="QC Rejected Reports" value={metrics.rejected || 0} sub="Issues Found" color="#ef4444" />
            <StatCard label="Registered Staff" value={metrics.registeredStaff || 0} sub="Active Taskforce" color="#84cc16" />
          </div>

          <div className="compact-card">
            <div className="card-header-flex" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
              <h2 className="section-title">CTU / GVP Dashboard</h2>
              <div style={{ display: 'flex', gap: 8, background: '#f8fafc', padding: 4, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <button className={`tab-btn ${activeTab === 'REGISTRATIONS' ? 'active' : ''}`} onClick={() => setActiveTab('REGISTRATIONS')}>
                  Registration Requests ({pendingRequests.length})
                </button>
                <button className={`tab-btn ${activeTab === 'REPORTS' ? 'active' : ''}`} onClick={() => setActiveTab('REPORTS')}>
                  Daily Inspection Reports ({pendingReports.length})
                </button>
                <button className={`tab-btn ${activeTab === 'FEEDER_POINTS' ? 'active' : ''}`} onClick={() => setActiveTab('FEEDER_POINTS')}>
                  All Feeder Points ({allFeederPoints.length})
                </button>
                <button className={`tab-btn ${activeTab === 'ASSIGNMENTS' ? 'active' : ''}`} onClick={() => setActiveTab('ASSIGNMENTS')}>
                  Staff Assignments
                </button>
              </div>
            </div>

            {activeTab === 'REGISTRATIONS' && (
              <div style={{ overflowX: 'auto' }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Feeder Point Name</th>
                      <th>Area / Location</th>
                      <th>Zone / Ward</th>
                      <th>Requested By</th>
                      <th>Households / Vehicle</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.feederPointName || r.areaName || r.id}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>{r.id.slice(0, 8)}...</div>
                        </td>
                        <td>
                          <div>{r.areaName || r.locationDescription || 'N/A'}</div>
                          {r.landmark && <div style={{ fontSize: 12, color: '#64748b' }}>Near: {r.landmark}</div>}
                        </td>
                        <td>
                          <div>{r.zoneName || 'Zone N/A'}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{r.wardName || 'Ward N/A'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.requestedBy?.name || 'Taskforce Member'}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{r.requestedBy?.email || '-'}</div>
                        </td>
                        <td>
                          <div>{r.householdsCount ?? 0} households</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{r.vehicleType || 'HANDCART'}</div>
                        </td>
                        <td>
                          <StatusBadge status={r.status} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn-action-approve" disabled={actionLoading === r.id} onClick={() => handleApproveRequest(r.id)}>
                              {actionLoading === r.id ? "..." : "Approve"}
                            </button>
                            <button className="btn-action-reject" disabled={actionLoading === r.id} onClick={() => handleRejectRequest(r.id)}>
                              {actionLoading === r.id ? "..." : "Reject"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pendingRequests.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No pending CTU/GVP registration requests</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'REPORTS' && (
              <div style={{ overflowX: 'auto' }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Feeder Point</th>
                      <th>Submitted By</th>
                      <th>Location Description</th>
                      <th>Distance</th>
                      <th>Status</th>
                      <th>Submitted Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReports.map((rep) => (
                      <tr key={rep.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{rep.feederPoint?.feederPointName || rep.feederPoint?.areaName || rep.feederPointId}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>Report #{rep.id.slice(0, 8)}...</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{rep.submittedBy?.name || 'Taskforce Inspector'}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{rep.submittedBy?.email || '-'}</div>
                        </td>
                        <td>{rep.feederPoint?.locationDescription || rep.feederPoint?.areaName || 'N/A'}</td>
                        <td>{rep.distanceMeters ? `${Math.round(rep.distanceMeters)} m` : '-'}</td>
                        <td>
                          <StatusBadge status={rep.status} />
                        </td>
                        <td style={{ color: '#64748b', fontSize: 13 }}>
                          {rep.createdAt ? new Date(rep.createdAt).toLocaleString() : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn-action-approve" disabled={actionLoading === rep.id} onClick={() => handleApproveReport(rep.id)}>
                              {actionLoading === rep.id ? "..." : "Approve"}
                            </button>
                            <button className="btn-action-warn" disabled={actionLoading === rep.id} onClick={() => handleActionRequiredReport(rep.id)}>
                              Action Req
                            </button>
                            <button className="btn-action-reject" disabled={actionLoading === rep.id} onClick={() => handleRejectReport(rep.id)}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pendingReports.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No pending daily monitoring inspection reports</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'FEEDER_POINTS' && (
              <div style={{ overflowX: 'auto' }}>
                {supervisors.length === 0 && (
                  <div style={{ padding: '8px 16px', marginBottom: 12, background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, fontSize: 12, color: '#854d0e' }}>
                    ⚠️ No Taskforce supervisors found. Register supervisors first to enable assignment.
                  </div>
                )}
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Point Name / ID</th>
                      <th>Area Name</th>
                      <th>Zone / Ward</th>
                      <th>Requested By</th>
                      <th>Assigned Member</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allFeederPoints.map((fp) => {
                      const assignedMember = (fp.assignedEmployeeIds?.length ?? 0) > 0
                        ? supervisors.find((s: any) => fp.assignedEmployeeIds.includes(s.id))
                        : null;
                      const displayStatus = (fp.assignedEmployeeIds?.length ?? 0) > 0 && fp.status === 'APPROVED' ? 'ASSIGNED' : fp.status;
                      return (
                        <tr key={fp.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{fp.feederPointName || fp.areaName || fp.id}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>{fp.id.slice(0, 8)}...</div>
                          </td>
                          <td>{fp.areaName || fp.locationDescription || '-'}</td>
                          <td>
                            <div>{fp.zoneName || 'Zone N/A'}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{fp.wardName || 'Ward N/A'}</div>
                          </td>
                          <td><div>{fp.requestedBy?.name || '-'}</div></td>
                          <td>
                            {assignedMember ? (
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{assignedMember.name}</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>{assignedMember.email}</div>
                              </div>
                            ) : (fp.assignedEmployeeIds?.length ?? 0) > 0 ? (
                              <span style={{ fontSize: 12, color: '#64748b' }}>{fp.assignedEmployeeIds.length} assigned</span>
                            ) : (
                              <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Not assigned</span>
                            )}
                          </td>
                          <td><StatusBadge status={displayStatus} /></td>
                          <td style={{ textAlign: 'right' }}>
                            {fp.status === 'APPROVED' ? (
                              <button
                                className="btn-action-approve"
                                onClick={() => { setAssignModal({ fp }); setAssignSelection(prev => ({ ...prev, [fp.id]: '' })); }}
                                style={{ whiteSpace: 'nowrap', fontSize: 12 }}
                              >
                                {(fp.assignedEmployeeIds?.length ?? 0) > 0 ? '🔄 Reassign' : '+ Assign'}
                              </button>
                            ) : fp.status === 'PENDING_QC' ? (
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button className="btn-action-approve" disabled={actionLoading === fp.id} onClick={() => handleApproveRequest(fp.id)} style={{ fontSize: 12 }}>
                                  {actionLoading === fp.id ? '...' : 'Approve'}
                                </button>
                                <button className="btn-action-reject" disabled={actionLoading === fp.id} onClick={() => handleRejectRequest(fp.id)} style={{ fontSize: 12 }}>
                                  {actionLoading === fp.id ? '...' : 'Reject'}
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {allFeederPoints.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No feeder points found. Approved points will appear here.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'CASES' && (
              <div style={{ overflowX: 'auto' }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Task Title</th>
                      <th>Status</th>
                      <th>Assignee</th>
                      <th>Geo Node</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.title}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>{c.id.slice(0, 8)}...</div>
                        </td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                        <td>{c.assignedTo || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.geoNodeId || '-'}</td>
                        <td>
                          <select
                            value={c.status}
                            onChange={(e) => updateStatus(c.id, e.target.value)}
                            disabled={updatingCaseId === c.id}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="COMPLETED">COMPLETED</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {cases.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No tasks found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'ASSIGNMENTS' && (
              <AssignmentsTab />
            )}
          </div>

          {assignModal && (
            <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setAssignModal(null)}>
              <div className="modal" style={{ maxWidth: 460 }}>
                <div className="modal-header mb-4">
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                    {(assignModal.fp.assignedEmployeeIds?.length ?? 0) > 0 ? '🔄 Reassign Taskforce Member' : '+ Assign Taskforce Member'}
                  </h3>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAssignModal(null)}>✕</button>
                </div>
                <div style={{ display: 'grid', gap: 16, padding: '0 0 8px' }}>
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, marginBottom: 4 }}>
                      {assignModal.fp.feederPointName || assignModal.fp.areaName}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {assignModal.fp.zoneName || 'Zone N/A'} → {assignModal.fp.wardName || 'Ward N/A'}
                    </div>
                  </div>

                  {(assignModal.fp.assignedEmployeeIds?.length ?? 0) > 0 && (() => {
                    const curr = supervisors.find((s: any) => assignModal.fp.assignedEmployeeIds.includes(s.id));
                    return curr ? (
                      <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                        Currently assigned: <strong>{curr.name}</strong> ({curr.email})
                      </div>
                    ) : null;
                  })()}

                  <div className="form-field">
                    <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>
                      Select Taskforce Member *
                    </label>
                    {supervisors.length === 0 ? (
                      <div style={{ color: '#dc2626', fontSize: 13 }}>No supervisors registered in TASKFORCE module.</div>
                    ) : (
                      <select
                        className="input"
                        value={assignSelection[assignModal.fp.id] || ''}
                        onChange={(e) => setAssignSelection(prev => ({ ...prev, [assignModal.fp.id]: e.target.value }))}
                        style={{ width: '100%' }}
                      >
                        <option value="">-- Select a member --</option>
                        {supervisors.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.email ? `(${s.email})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                    <button className="btn btn-ghost" onClick={() => setAssignModal(null)}>Cancel</button>
                    <button
                      className="btn btn-primary"
                      disabled={!assignSelection[assignModal.fp.id] || actionLoading === assignModal.fp.id}
                      onClick={handleAssignFeeder}
                      style={{ opacity: (!assignSelection[assignModal.fp.id] || actionLoading === assignModal.fp.id) ? 0.6 : 1 }}
                    >
                      {actionLoading === assignModal.fp.id ? 'Assigning...' : 'Confirm Assignment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showCreateModal && (
            <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
              <div className="modal" style={{ maxWidth: 500 }}>
                <div className="modal-header mb-4">
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create New Task</h3>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowCreateModal(false)}>✕</button>
                </div>
                <form onSubmit={createCase}>
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div className="form-field">
                      <label>Title</label>
                      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Clear illegal dumping" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-field">
                        <label>Geo Node ID</label>
                        <input className="input" value={geoNodeId} onChange={(e) => setGeoNodeId(e.target.value)} placeholder="Optional" />
                      </div>
                      <div className="form-field">
                        <label>Assign User ID</label>
                        <input className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Optional" />
                      </div>
                    </div>
                  </div>
                  {createStatus && <div className="text-sm mt-4 text-center opacity-70" style={{ color: createStatus.includes('Failed') ? 'var(--danger)' : 'var(--success)' }}>{createStatus}</div>}
                  <div className="modal-footer mt-6" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
                    <button className="btn btn-primary" type="submit" disabled={saving}>
                      {saving ? "Creating..." : "Create Task"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </ModuleGuard>
    )
  }

  return (
    <ModuleGuard module="TASKFORCE" roles={["SUPERVISOR", "ACTION_OFFICER", "QC", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="content">
        <section className="card card-spacious mb-6">
          <div className="section-header">
            <div>
              <p className="eyebrow">Module • CTU / GVP Transformation</p>
              <h1 className="text-2xl font-bold mb-1">Task Management</h1>
              <p className="muted text-sm">Create and track transformation tasks and activities.</p>
            </div>
          </div>
        </section>

        <section className="card card-spacious">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Active Tasks</h2>
            <div className="muted text-sm">{cases.length} records found</div>
          </div>

          {loading && <div className="p-8 text-center muted">Loading tasks...</div>}
          {error && <div className="alert error mb-4">{error}</div>}

          {!loading && !error && cases.length === 0 && (
            <div className="p-12 text-center border rounded-lg bg-base-50">
              <p className="font-semibold text-lg mb-2">No tasks found</p>
              <p className="muted mb-4">Get started by creating a new transformation task.</p>
              <button className="btn btn-sm btn-primary" onClick={() => setShowCreateModal(true)}>
                Create First Task
              </button>
            </div>
          )}

          {!loading && cases.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Task Details</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>Geo Node</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id} className="hover">
                      <td style={{ maxWidth: '240px' }}>
                        <div className="font-bold truncate" title={c.title}>{c.title}</div>
                        <div className="text-xs muted font-mono mt-1 opacity-70">{c.id.slice(0, 8)}...</div>
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="text-sm">
                        {c.assignedTo || <span className="muted italic">Unassigned</span>}
                      </td>
                      <td className="text-sm font-mono text-xs">{c.geoNodeId || "—"}</td>
                      <td className="text-right">
                        <div className="dropdown dropdown-end">
                          <button tabIndex={0} className="btn btn-ghost btn-xs">Options ▼</button>
                          <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-10">
                            <li>
                              <a onClick={() => {
                                setUpdatingCaseId(c.id);
                                updateStatus(c.id, c.status === 'OPEN' ? 'IN_PROGRESS' : 'COMPLETED');
                              }}>
                                Mark as {c.status === 'OPEN' ? 'In Progress' : 'Completed'}
                              </a>
                            </li>
                            <li>
                              <details>
                                <summary>Assign To</summary>
                                <div className="p-2">
                                  <input
                                    className="input input-sm input-bordered w-full"
                                    placeholder="User ID"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        updateStatus(c.id, c.status, e.currentTarget.value);
                                        e.currentTarget.value = '';
                                      }
                                    }}
                                  />
                                </div>
                              </details>
                            </li>
                            <li>
                              <details>
                                <summary>Add Note</summary>
                                <div className="p-2">
                                  <textarea
                                    className="textarea textarea-sm textarea-bordered w-full"
                                    placeholder="Type note..."
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setActivityByCase(prev => ({ ...prev, [c.id]: e.target.value }))}
                                    value={activityByCase[c.id] || ''}
                                  />
                                  <button
                                    className="btn btn-xs btn-primary mt-2 w-full"
                                    onClick={() => addActivity(c.id)}
                                  >Save Note</button>
                                </div>
                              </details>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
            <div className="modal" style={{ maxWidth: 500 }}>
              <div className="modal-header mb-4">
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create New Task</h3>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowCreateModal(false)}>✕</button>
              </div>
              <form onSubmit={createCase}>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div className="form-field">
                    <label>Title</label>
                    <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Clear illegal dumping" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-field">
                      <label>Geo Node ID</label>
                      <input className="input" value={geoNodeId} onChange={(e) => setGeoNodeId(e.target.value)} placeholder="Optional" />
                    </div>
                    <div className="form-field">
                      <label>Assign User ID</label>
                      <input className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                </div>

                {createStatus && <div className="text-sm mt-4 text-center opacity-70" style={{ color: createStatus.includes('Failed') ? 'var(--danger)' : 'var(--success)' }}>{createStatus}</div>}

                <div className="modal-footer mt-6" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? "Creating..." : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ModuleGuard>
  );
}

function StatCard({ label, value, sub, color }: any) {
  return (
    <div className="stat-card-compact" style={{ borderLeft: `6px solid ${color}`, position: 'relative', overflow: 'hidden', background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', borderLeftWidth: 6, borderLeftColor: color }}>
      <div className="stat-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div className="stat-value" style={{ color: '#0f172a' }}>{value}</div>
      </div>
      <div className="stat-sub">{sub}</div>
      <style jsx>{`
        .stat-card-compact {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card-compact:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08);
        }
        .stat-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          line-height: 1.3;
        }
        .stat-value {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .stat-sub {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: any = {
    'COMPLETED': { bg: '#dcfce7', text: '#166534' },
    'APPROVED': { bg: '#dcfce7', text: '#166534' },
    'IN_PROGRESS': { bg: '#fef3c7', text: '#b45309' },
    'PENDING_QC': { bg: '#fef3c7', text: '#b45309' },
    'SUBMITTED': { bg: '#e0f2fe', text: '#0369a1' },
    'ACTION_REQUIRED': { bg: '#fff7ed', text: '#c2410c' },
    'REJECTED': { bg: '#fee2e2', text: '#991b1b' },
    'OPEN': { bg: '#fee2e2', text: '#991b1b' },
  };
  const s = config[status] || { bg: '#f1f5f9', text: '#475569' };
  return (
    <span style={{
      background: s.bg,
      color: s.text,
      padding: '4px 10px',
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 800,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      display: 'inline-block'
    }}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

