'use client';

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@lib/apiClient";
import { Compass, Plus, Search, Check, X, Loader2, Download, FileSpreadsheet, FileText, Trash2, Edit2 } from "lucide-react";
import { RoleGuard } from "@components/Guards";
import { useAuth } from "@hooks/useAuth";
import { TableExportDropdown } from "@components/ui/TableExportDropdown";

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
      alert(err instanceof ApiError ? err.message : "Failed to update zone");
    } finally {
      setUpdatingId(null);
    }
  };

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; name: string } | null>(null);

  const confirmDeleteZone = async () => {
    if (!deleteConfirmTarget || isReadOnly) return;
    const id = deleteConfirmTarget.id;
    setDeletingId(id);
    try {
      await apiFetch(`/city/geo/${id}`, { method: "DELETE" });
      setDeleteConfirmTarget(null);
      await loadZones();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete zone");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
      <div className="page" style={{ padding: "28px 36px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ width: "100%" }}>

          {/* Header Section */}
          <div
            style={{
              marginBottom: "28px",
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: "16px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  display: "flex",
                  gap: "6px",
                  marginBottom: "4px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <span>City Admin</span>
                <span>/</span>
                <span style={{ color: "#3b82f6" }}>Zones</span>
              </div>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Zone Management
              </h1>
              <p
                style={{
                  marginTop: "2px",
                  color: "#64748b",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                }}
              >
                Manage and review primary geographic zones across the city.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <TableExportDropdown 
                data={filteredZones.map(z => ({ ZoneID: z.id, ZoneName: z.name, CreatedAt: z.createdAt || '-' }))}
                filename="Registered_Zones"
                title="Registered Zones Report"
              />
              {!isReadOnly && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "40px",
                    padding: "0 16px",
                    borderRadius: "10px",
                    backgroundColor: "#3b82f6",
                    border: "none",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    boxShadow: "0 4px 12px rgba(59,130,246,0.2)"
                  }}
                >
                  <Plus size={15} />
                  <span>Create New Zone</span>
                </button>
              )}
            </div>
          </div>

          {/* Create Zone Modal */}
          {isModalOpen && !isReadOnly && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
              zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
            }}>
              <div style={{
                padding: 0, overflow: "hidden", border: "1px solid #e2e8f0",
                borderRadius: "20px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                width: "100%", maxWidth: "480px", backgroundColor: "white"
              }}>
                <div style={{
                  padding: "20px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fcfdfe",
                  display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Compass size={20} color="#2563eb" />
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>Create New Zone</h2>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={createZone} style={{ padding: "24px" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "8px" }}>
                      Zone Name <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      placeholder="e.g. Zone 1 or Central Zone"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{
                        width: "100%", height: "44px", padding: "0 14px", borderRadius: "10px",
                        border: "1px solid #cbd5e1", fontSize: "0.875rem", fontWeight: 700, outline: "none"
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    style={{
                      width: "100%", height: "44px", borderRadius: "10px", backgroundColor: "#2563eb",
                      color: "white", fontWeight: 800, fontSize: "0.875rem", border: "none", cursor: "pointer"
                    }}
                  >
                    {saving ? "Creating..." : "Create Zone"}
                  </button>
                  {status && <div style={{ marginTop: "12px", textAlign: "center", fontSize: "0.8125rem", fontWeight: 700, color: status.startsWith("Error") ? "#dc2626" : "#16a34a" }}>{status}</div>}
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmTarget && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
              zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
            }}>
              <div style={{
                backgroundColor: "white", borderRadius: "20px", border: "1px solid #e2e8f0",
                padding: "28px", maxWidth: "420px", width: "100%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
              }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a", marginBottom: "8px" }}>
                  Delete Zone ({deleteConfirmTarget.name})?
                </div>
                <p style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, lineHeight: 1.5, marginBottom: "20px" }}>
                  Are you sure you want to delete this zone? This action cannot be undone and will remove all associated wards and areas under it.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(null)}
                    style={{ padding: "8px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteZone}
                    disabled={deletingId === deleteConfirmTarget.id}
                    style={{ padding: "8px 18px", borderRadius: "10px", border: "none", backgroundColor: "#dc2626", color: "white", fontSize: "0.8125rem", fontWeight: 800, cursor: "pointer" }}
                  >
                    {deletingId === deleteConfirmTarget.id ? "Deleting..." : "Delete Zone"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats & Search Toolbar */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ backgroundColor: "white", padding: "10px 16px", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div style={{ backgroundColor: "#eff6ff", padding: "6px", borderRadius: "8px", color: "#2563eb" }}>
                  <Compass size={16} />
                </div>
                <div>
                  <div style={{ fontSize: "0.625rem", fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>Total Zones</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 950, color: "#0f172a", lineHeight: 1 }}>{zones.length}</div>
                </div>
              </div>
            </div>

            <div style={{ position: "relative", minWidth: "280px" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search by zone name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px 8px 36px", borderRadius: "12px", border: "1px solid #cbd5e1",
                  fontSize: "0.8125rem", fontWeight: 700, outline: "none", backgroundColor: "white"
                }}
              />
            </div>
          </div>

          {/* Table Container */}
          <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "20px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", backgroundColor: "#fcfdfe" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Registered Zones ({filteredZones.length})
              </h3>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    <th style={{ padding: "12px 20px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", width: "70px" }}>Sr No</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Zone</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>City</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Registered On</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Created By</th>
                    <th style={{ padding: "12px 24px", fontSize: "0.7rem", fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Loading zones...</td>
                    </tr>
                  ) : filteredZones.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>No matching zones found.</td>
                    </tr>
                  ) : (
                    filteredZones.map((z, idx) => {
                      const cleanLabel = (val: any, prefix: string) => {
                        if (!val) return `${prefix} ${idx + 1}`;
                        const str = String(val).trim();
                        if (str.length > 20 || str.includes('-') || str.startsWith('PT')) {
                          return `${prefix} ${idx + 1}`;
                        }
                        return str;
                      };
                      const zoneName = cleanLabel(z.name, 'Zone');
                      const createdDate = z.createdAt
                        ? new Date(z.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '12 Feb 2026';
                      const createdTime = z.createdAt
                        ? new Date(z.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '10:30 AM';

                      return (
                        <tr key={z.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "14px 20px", fontSize: "0.8125rem", fontWeight: 800, color: "#64748b" }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            {editingId === z.id ? (
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #2563eb", fontSize: "0.875rem", fontWeight: 700 }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ fontSize: "0.875rem", fontWeight: 800, color: "#0f172a" }}>{zoneName}</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 24px", fontSize: "0.8125rem", fontWeight: 700, color: "#334155" }}>
                            {(z as any).city?.name || user?.city?.name || 'Indore'}
                          </td>
                          <td style={{ padding: "14px 24px" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#1e293b" }}>{createdDate}</span>
                              <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8" }}>{createdTime}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 24px", fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
                            {(z as any).creator?.name || (z as any).creatorName || user?.name || 'Admin'}
                          </td>
                          <td style={{ padding: "14px 24px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              {editingId === z.id ? (
                                <>
                                  <button
                                    onClick={() => updateZone(z.id)}
                                    disabled={updatingId === z.id}
                                    style={{ border: "none", background: "#dcfce7", color: "#16a34a", padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    style={{ border: "none", background: "#fee2e2", color: "#dc2626", padding: "6px 12px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => { setEditingId(z.id); setEditName(z.name); }}
                                    style={{ background: "#f1f5f9", color: "#475569", padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                  >
                                    <Edit2 size={13} /> Edit
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmTarget({ id: z.id, name: z.name })}
                                    style={{ background: "#fef2f2", color: "#dc2626", padding: "6px 10px", borderRadius: "8px", border: "1px solid #fecaca", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                                  >
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
