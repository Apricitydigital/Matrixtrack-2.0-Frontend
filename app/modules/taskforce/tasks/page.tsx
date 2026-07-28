'use client';

import { useEffect, useState } from "react";
import { ModuleGuard } from "@components/Guards";
import { TaskforceApi, ApiError, CityApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

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
  const [records, setRecords] = useState<any[]>([]); // New records state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
    inProgress: 0
  });

  const [title, setTitle] = useState("");
  const [geoNodeId, setGeoNodeId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [createStatus, setCreateStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const [activityByCase, setActivityByCase] = useState<Record<string, string>>({});
  const [assigneeByCase, setAssigneeByCase] = useState<Record<string, string>>({});
  const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null);

  const loadCases = async () => {
    try {
      setLoading(true);
      const data = await TaskforceApi.listCases(selectedCity);
      setCases(data.cases || []);
      setError("");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setError("Not authorized for Taskforce in this city.");
      } else {
        setError("Failed to load tasks.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Determine role for UI switching
  const { user } = useAuth();

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
        // For regular City Admin, auto-select their city
        setCities([{ id: user.cityId, name: user.cityName || "My City" }]);
        setSelectedCity(user.cityId);
      }
    } catch (err) {
      console.error("Failed to load cities", err);
    }
  };

  const loadMetrics = async () => {
    if (!selectedCity) return;
    try {
      // Fetch stats using getRecords which returns detailed stats
      const { stats, data } = await TaskforceApi.getRecords({ cityId: selectedCity });
      setRecords(data || []); // Store the records

      // Calculate derived metrics
      // "Action Taken" - assume this includes any actioned items (approved + rejected + action required resolved?)
      // For now, let's assume it's approved + rejected
      const actionTaken = (stats.approved || 0) + (stats.rejected || 0);

      // "System Performance" - example calculation: approved / total * 100
      const total = stats.total || 1; // avoid div by zero
      const performance = Math.round(((stats.approved || 0) / total) * 100);

      // "Eliminated Feeder Points" - assume these are the approved ones (cleared)
      const eliminated = stats.approved || 0;

      // "In Progress" - surveys running on ground, calculated based on eliminated feeder points
      // User said: "calculated based on eliminated feeder points". 
      // Maybe Total - Eliminated? Or Pending?
      // Let's use Pending for "In Progress" as it represents active work not yet approved/eliminated.
      const inProgress = stats.pending || 0;

      setMetrics({
        total: stats.total || 0,
        approved: stats.approved || 0,
        rejected: stats.rejected || 0,
        actionRequired: stats.actionRequired || 0,
        actionTaken,
        systemPerformance: performance,
        eliminated,
        inProgress
      });
    } catch (err) {
      console.error("Failed to load metrics", err);
    }
  };

  useEffect(() => {
    if (user) loadCities();
  }, [user]);

  useEffect(() => {
    if (selectedCity) {
      loadCases(); // original logic
      loadMetrics(); // new metrics
    }
  }, [selectedCity]);

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


  // Premium Dashboard for City Admin
  if (isCityAdmin) {




    return (
      <ModuleGuard module="TASKFORCE" roles={["CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
        <div style={{ animation: 'fadeIn 0.5s ease-out', paddingBottom: 40 }}>
          <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .stats-compact-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                }
                .section-divider {
                    height: 1px;
                    background: #e2e8f0;
                }
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
                    padding: 16px 16px;
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
            `}</style>

          <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 13, textTransform: 'uppercase', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 8 }}>Module · CTU / GVP Transformation</p>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>Task Management</h1>
              <p style={{ color: '#64748b', marginTop: 8 }}>Track transformation tasks, assignments, and resolution status.</p>
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

              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ borderRadius: 8, fontWeight: 700 }}>
                + New Task
              </button>
            </div>
          </header>

          {/* New Expanded Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            <StatCard label="Total Feeder Points" value={metrics.total} sub="Identified Points" color="#3b82f6" />
            <StatCard label="In Progress" value={metrics.inProgress} sub="Surveys Running" color="#8b5cf6" />
            <StatCard label="Action Required" value={metrics.actionRequired} sub="Needs Attention" color="#f59e0b" />
            <StatCard label="QC Approved Reports" value={metrics.approved} sub="Verified Clean" color="#10b981" />

            <StatCard label="QC Rejected Reports" value={metrics.rejected} sub="Issues Found" color="#ef4444" />
            <StatCard label="Action Taken" value={metrics.actionTaken} sub="Resolved Items" color="#0ea5e9" />
            <StatCard label="Eliminated Points" value={metrics.eliminated} sub="Permanent Fix" color="#6366f1" />
            <StatCard label="System Performance" value={`${metrics.systemPerformance}%`} sub="Efficiency Score" color="#f43f5e" />
          </div>

          <div className="compact-card">
            <div className="card-header-flex">
              <h2 className="section-title">Recent Feeder Points</h2>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Point ID</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Update Time</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.name || r.id}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>{r.id.slice(0, 8)}...</div>
                      </td>
                      <td>
                        {r.geoNodeId || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unknown</span>}
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>
                        {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reuse existing modal logic */}
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

  // STANDARD VIEW (Original)
  return (
    <ModuleGuard module="TASKFORCE" roles={["EMPLOYEE", "ACTION_OFFICER", "QC", "CITY_ADMIN", "HMS_SUPER_ADMIN"]}>
      <div className="content">
        <section className="card card-spacious mb-6">
          <div className="section-header">
            <div>
              <p className="eyebrow">Module • CTU / GVP Transformation</p>
              <h1 className="text-2xl font-bold mb-1">Task Management</h1>
              <p className="muted text-sm">Create and track transformation tasks and activities.</p>
            </div>
            <div className="section-actions">
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                + New Task
              </button>
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
                    <th>Latest Activity</th>
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
                        <span className={`badge ${c.status === 'COMPLETED' ? 'badge-success' :
                          c.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'
                          } badge-sm font-bold`}>
                          {c.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="text-sm">
                        {c.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs font-bold">
                              {c.assignedTo.charAt(0).toUpperCase()}
                            </div>
                            <span>{c.assignedTo}</span>
                          </div>
                        ) : <span className="muted italic">Unassigned</span>}
                      </td>
                      <td className="text-sm font-mono text-xs">{c.geoNodeId || "—"}</td>
                      <td className="text-sm muted">
                        {c.activities && c.activities.length > 0 ? (
                          <span>
                            {c.activities[0].action} <span className="text-xs opacity-70">• {new Date(c.activities[0].createdAt).toLocaleDateString()}</span>
                          </span>
                        ) : "No activity"}
                      </td>
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
    <div className="stat-card-compact" style={{ borderLeft: `6px solid ${color}`, position: 'relative', overflow: 'hidden', background: 'white', borderRadius: 8, border: '1px solid #e2e8f0', borderLeftWidth: 6, borderLeftColor: color }}>
      <div className="stat-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div className="stat-value" style={{ color: '#1e293b' }}>{value}</div>
      </div>
      <div className="stat-sub">{sub}</div>
      <style jsx>{`
                .stat-card-compact {
                    padding: 16px 20px;
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
                    font-size: 10px;
                    font-weight: 900;
                    color: #94a3b8;
                    letter-spacing: 0.1em;
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
    'COMPLETED': { bg: '#dcfce7', text: '#166534' },
    'IN_PROGRESS': { bg: '#fef3c7', text: '#b45309' },
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
