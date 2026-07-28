'use client';

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@lib/apiClient";
import { Compass, Plus, Search, Check, X, Loader2, Download, FileSpreadsheet, FileText, Trash2, Edit2 } from "lucide-react";
import { RoleGuard } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";

type GeoNode = { id: string; name: string; createdAt?: string };

export default function ZoneManagementPage() {
  const { user } = useAuth();
  const isReadOnly = user?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));

  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<GeoNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  const filteredZones = zones.filter(z =>
    z.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadZones = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=ZONE");
      setZones((data as any).nodes ?? []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load zones";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const createZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const cleanName = name.trim();
    if (!cleanName) return;

    if (zones.some(z => z.name.toLowerCase() === cleanName.toLowerCase())) {
      setStatus("Error: This zone already exists!");
      return;
    }

    setSaving(true);
    setStatus("Saving...");
    try {
      await apiFetch("/city/geo", { method: "POST", body: JSON.stringify({ name, level: "ZONE" }) });
      setStatus("Zone created successfully");
      setIsModalOpen(false);
      setName("");
      await loadZones();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create zone";
      setStatus(msg);
    } finally {
      setSaving(false);
    }
  };

  const updateZone = async (id: string) => {
    if (isReadOnly || !editName.trim()) return;
    setUpdatingId(id);
    try {
      await apiFetch(`/city/geo/${id}`, { method: "PATCH", body: JSON.stringify({ name: editName }) });
      setEditingId(null);
      await loadZones();
    } catch (err) {
      alert("Failed to update zone");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteZone = async (id: string) => {
    if (isReadOnly) return;
    if (!confirm("Are you sure? This will delete all wards under this zone!")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/city/geo/${id}`, { method: "DELETE" });
      await loadZones();
    } catch (err) {
      alert("Failed to delete zone");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
      <div className="page" style={{ padding: "32px 40px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ width: "100%" }}>

          {/* Header Section */}
          <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div className="breadcrumb" style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", gap: "8px", marginBottom: "8px" }}>
                <span>City Admin</span>
                <span>/</span>
                <span style={{ color: "#1e293b", fontWeight: 500 }}>Zone Management</span>
              </div>
              <h1 style={{ fontSize: "1.875rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Zone Management
              </h1>
              <p style={{ marginTop: "8px", color: "#64748b", fontSize: "1rem" }}>
                Create and manage primary geographic zones in the city.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setDownloadOpen(!downloadOpen)}
                  style={{
                    height: "48px", width: "48px", borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "white",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
                  title="Download List"
                >
                  <Download size={20} color="#475569" />
                </button>
                {downloadOpen && (
                  <div style={{
                    position: "absolute", top: "56px", right: 0, backgroundColor: "white", border: "1px solid #e2e8f0",
                    borderRadius: "12px", padding: "8px", width: "180px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
                    zIndex: 50, display: "flex", flexDirection: "column", gap: "4px"
                  }}>
                    <button
                      onClick={() => { alert("Export to Excel/CSV functionality pending"); setDownloadOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px",
                        border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px", fontSize: "0.875rem",
                        fontWeight: 600, color: "#475569", textAlign: "left", transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#475569"; }}
                    >
                      <FileSpreadsheet size={16} color="#10b981" />
                      Excel / CSV
                    </button>
                    <button
                      onClick={() => { alert("Export to PDF functionality pending"); setDownloadOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px",
                        border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px", fontSize: "0.875rem",
                        fontWeight: 600, color: "#475569", textAlign: "left", transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#475569"; }}
                    >
                      <FileText size={16} color="#ef4444" />
                      PDF
                    </button>
                  </div>
                )}
              </div>
              {!isReadOnly && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn btn-primary"
                  style={{ height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, padding: "0 24px" }}
                >
                  <Plus size={18} />
                  Create Zone
                </button>
              )}
            </div>
          </div>

          {/* Create Zone Modal */}
          {isModalOpen && !isReadOnly && (
            <div style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(4px)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px"
            }}>
              <div className="card" style={{
                padding: 0,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                borderRadius: "24px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                margin: 0,
                width: "100%",
                maxWidth: "500px",
                backgroundColor: "white"
              }}>
                <div style={{
                  padding: "24px 32px",
                  borderBottom: "1px solid #f1f5f9",
                  backgroundColor: "#fcfdfe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Compass size={20} color="#2563eb" />
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Create New Zone</h2>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#94a3b8",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "8px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={createZone} style={{ padding: "32px" }}>
                  <div className="field" style={{ marginBottom: "24px" }}>
                    <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>Zone Name <span style={{ color: "#ef4444" }}>*</span></label>
                    <input className="input" placeholder="e.g. North Zone" value={name} onChange={(e) => setName(e.target.value)} required style={{ height: "48px" }} />
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={saving || !name.trim()} style={{ width: "100%", height: "48px", borderRadius: "12px", fontSize: "1rem" }}>
                    {saving ? "Creating..." : "Create Zone"}
                  </button>
                  {status && <div className="muted" style={{ marginTop: "16px", textAlign: "center" }}>{status}</div>}
                </form>
              </div>
            </div>
          )}

          {/* Stats & Search Row */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{
                backgroundColor: "#fff", padding: "12px 20px", borderRadius: "14px", border: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
              }}>
                <div style={{ backgroundColor: "#eff6ff", padding: "8px", borderRadius: "10px" }}>
                  <Compass size={18} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Zones</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{zones.length}</div>
                </div>
              </div>

              {isReadOnly && (
                <div style={{
                  backgroundColor: "#fff", padding: "12px 20px", borderRadius: "14px", border: "1px solid #e2e8f0",
                  display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                }}>
                  <div style={{ backgroundColor: "#f0f9ff", padding: "8px", borderRadius: "10px" }}>
                    <Check size={18} color="#0369a1" />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Mode</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0c4a6e", lineHeight: 1.1 }}>ReadOnly View</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, maxWidth: "450px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Search by zone name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 14px 12px 42px", borderRadius: "14px", border: "1px solid #e2e8f0",
                    fontSize: "0.9rem", outline: "none", transition: "all 0.2s",
                    backgroundColor: "white", boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 4px rgba(37, 99, 235, 0.08)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)"; }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#334155" }}>
              Registered Zones
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>Manage and review overarching city zones.</p>
          </div>

          {loading && (
            <div style={{ padding: "60px", textAlign: "center", backgroundColor: "white", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
              <Loader2 size={32} className="animate-spin" color="#2563eb" style={{ margin: "0 auto" }} />
              <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 600 }}>Loading city data...</p>
            </div>
          )}

          {error && <div className="alert error" style={{ borderRadius: "14px" }}>{error}</div>}

          {!loading && !error && filteredZones.length === 0 && (
            <div style={{ padding: "80px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", backgroundColor: "white", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
              <div style={{ padding: "20px", backgroundColor: "#f8fafc", borderRadius: "50%" }}>
                <Search size={40} color="#cbd5e1" />
              </div>
              <div>
                <div style={{ color: "#0f172a", fontWeight: 800, fontSize: "1.1rem" }}>No matching results</div>
                <div style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "4px" }}>Try adjusting your search term</div>
              </div>
            </div>
          )}

          {!loading && !error && filteredZones.length > 0 && (
            <div style={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.02)"
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ backgroundColor: "#fafbfc", borderBottom: "1px solid #f1f5f9" }}>
                    <tr>
                      <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Zone Details</th>
                      <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Created On</th>
                      <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredZones.map((z) => (
                      <tr
                        key={z.id}
                        style={{ borderBottom: "1px solid #f8fafc", transition: "all 0.2s" }}
                      >
                        <td style={{ padding: "20px 32px" }}>
                          {editingId === z.id ? (
                            <input
                              className="input"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              style={{ margin: 0, padding: "8px 12px", height: "38px", borderRadius: "10px" }}
                              autoFocus
                            />
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                              <div style={{ backgroundColor: "#f8fafc", padding: "8px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                                <Compass size={20} color="#475569" />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem" }}>{z.name}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                                  <span style={{ backgroundColor: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: "6px", fontSize: "0.65rem", fontWeight: 800, fontFamily: "monospace" }}>ID: {z.id.slice(0, 8)}...</span>
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(z.id); alert("ID Copied!"); }}
                                    style={{ border: "none", background: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.65rem", fontWeight: 800, padding: 0 }}
                                  >
                                    COPY
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "20px 32px" }}>
                          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155" }}>
                            {z.createdAt ? new Date(z.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                          </span>
                        </td>
                        <td style={{ padding: "20px 32px", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            {isReadOnly ? (
                              <span style={{
                                fontSize: "0.65rem", fontWeight: 800, color: "#64748b",
                                backgroundColor: "#f1f5f9", padding: "4px 10px",
                                borderRadius: "6px", border: "1px solid #e2e8f0"
                              }}>READ ONLY</span>
                            ) : (
                              editingId === z.id ? (
                                <>
                                  <button
                                    onClick={() => updateZone(z.id)}
                                    disabled={updatingId === z.id}
                                    style={{ border: "none", background: "#dcfce7", color: "#16a34a", padding: "8px", borderRadius: "8px", cursor: "pointer" }}
                                  >
                                    {updatingId === z.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    style={{ border: "none", background: "#fee2e2", color: "#dc2626", padding: "8px", borderRadius: "8px", cursor: "pointer" }}
                                  >
                                    <X size={18} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => { setEditingId(z.id); setEditName(z.name); }}
                                    style={{ background: "#f8fafc", color: "#64748b", padding: "8px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s", border: "1px solid #e2e8f0" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                                  >
                                    <Edit2 size={18} />
                                  </button>
                                  <button
                                    onClick={() => deleteZone(z.id)}
                                    disabled={deletingId === z.id}
                                    style={{ background: "#fff5f5", color: "#f87171", padding: "8px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s", border: "1px solid #fee2e2" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "#fecaca"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff5f5"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "#fee2e2"; }}
                                  >
                                    {deletingId === z.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                  </button>
                                </>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <style jsx>
            {`
            .animate-spin {
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
          </style>
        </div>
      </div>
    </RoleGuard>
  );
}
