'use client';

import { useEffect, useMemo, useState } from "react";
import { CityModulesApi, RegistrationApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

import { RoleGuard } from "@components/Guards";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { roleLabel } from "@lib/labels";

type Request = {
  id: string;
  name: string;
  email: string;
  phone: string;
  aadhaar: string;
  status: string;
  createdAt: string;
  requestedRole?: "SUPERVISOR" | "EMPLOYEE" | "QC" | "ACTION_OFFICER";
};

const ROLE_OPTIONS: Array<"SUPERVISOR" | "EMPLOYEE" | "QC" | "ACTION_OFFICER"> = ["SUPERVISOR", "EMPLOYEE", "QC", "ACTION_OFFICER"];

export default function RegistrationRequestsPage() {
  const { user } = useAuth();
  const isReadOnly = user?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));
  const [requests, setRequests] = useState<Request[]>([]);
  const [modules, setModules] = useState<{ id: string; key: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{
    requestId: string;
    role: "SUPERVISOR" | "EMPLOYEE" | "QC" | "ACTION_OFFICER" | "";
    moduleIds: Set<string>;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [reqs, mods] = await Promise.all([RegistrationApi.listRequests(), CityModulesApi.list()]);
      setRequests(reqs.requests || []);
      setModules(mods);
    } catch {
      setError("Failed to load registration requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (req: Request) =>
    setModal({
      requestId: req.id,
      role: req.requestedRole || "",
      moduleIds: new Set<string>()
    });

  const closeModal = () => setModal(null);

  const toggleSet = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const onApprove = async () => {
    if (!modal) return;
    if (!modal.role || modal.moduleIds.size === 0) return;
    setSaving(true);
    try {
      await RegistrationApi.approve(modal.requestId, {
        role: modal.role as any,
        moduleKeys: modules.filter((m) => modal.moduleIds.has(m.id)).map((m) => m.key.toUpperCase())
      });
      closeModal();
      await load();
    } catch {
      setError("Failed to approve request");
    } finally {
      setSaving(false);
    }
  };

  const onReject = async (id: string) => {
    try {
      await RegistrationApi.reject(id);
      await load();
    } catch {
      setError("Failed to reject request");
    }
  };

  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  const filteredRequests = useMemo(() => {
    if (filter === "ALL") return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const modalValid = useMemo(() => modal && modal.role && modal.moduleIds.size > 0, [modal]);

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
      <div className="page" style={{ padding: '24px 32px' }}>
        {/* Header Section */}
        <div style={{ marginBottom: "32px" }}>
          <div className="breadcrumb" style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", gap: "8px", marginBottom: "8px" }}>
            <span>Governance</span>
            <span>/</span>
            <span style={{ color: "#1e293b", fontWeight: 500 }}>Registration Requests</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 style={{ fontSize: "1.875rem", fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
              Pending Approvals
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setDownloadOpen(!downloadOpen)}
                  style={{
                    height: "44px", padding: "0 16px", borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "white",
                    display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    transition: "all 0.2s", fontSize: "0.875rem", fontWeight: 600, color: "#475569"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
                >
                  <Download size={18} />
                  Download
                </button>
                {downloadOpen && (
                  <div style={{
                    position: "absolute", top: "52px", right: 0, backgroundColor: "white", border: "1px solid #e2e8f0",
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
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div style={{ display: "flex", background: "#f1f5f9", padding: "4px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: filter === f ? "white" : "transparent",
                  color: filter === f ? "#2563eb" : "#64748b",
                  boxShadow: filter === f ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                  transition: "all 0.2s"
                }}
              >
                {f === "ALL" ? "All Requests" : f.charAt(0) + f.slice(1).toLowerCase()}
                <span style={{ marginLeft: "6px", opacity: 0.6 }}>({f === "ALL" ? requests.length : requests.filter(r => r.status === f).length})</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert error" style={{ borderRadius: "14px", marginBottom: "20px" }}>{error}</div>}

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", backgroundColor: "white", borderRadius: "20px", border: "1px solid #e2e8f0" }}>
            <div className="animate-spin" style={{ width: "32px", height: "32px", border: "4px solid #f3f3f3", borderTop: "4px solid #2563eb", borderRadius: "50%", margin: "0 auto" }}></div>
            <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 600 }}>Loading enrollment requests...</p>
          </div>
        ) : (
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
                    <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Applicant</th>
                    <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Requested For</th>
                    <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Contact</th>
                    <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Identification</th>
                    <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Timeline</th>
                    <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Status</th>
                    <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "80px 24px", textAlign: "center" }}>
                        <div style={{ color: "#64748b", fontWeight: 600 }}>No requests found in this category</div>
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f8fafc", transition: "all 0.2s" }}>
                        <td style={{ padding: "20px 32px" }}>
                          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>{r.name}</div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>{r.email}</div>
                        </td>
                        <td style={{ padding: "20px 32px" }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "6px 12px",
                            borderRadius: "999px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            backgroundColor: r.requestedRole === "EMPLOYEE" ? "#ecfeff" : "#eef2ff",
                            color: r.requestedRole === "EMPLOYEE" ? "#0f766e" : "#3730a3",
                            border: r.requestedRole === "EMPLOYEE" ? "1px solid #a5f3fc" : "1px solid #c7d2fe"
                          }}>
                            {roleLabel(r.requestedRole || "SUPERVISOR")}
                          </span>
                        </td>
                        <td style={{ padding: "20px 32px" }}>
                          <div style={{ fontSize: "0.875rem", color: "#334155", fontWeight: 600 }}>{r.phone}</div>
                        </td>
                        <td style={{ padding: "20px 32px" }}>
                          <div style={{
                            display: "inline-block", backgroundColor: "#f1f5f9", padding: "4px 10px",
                            borderRadius: "8px", fontSize: "0.75rem", fontFamily: "monospace", color: "#475569", border: "1px solid #e2e8f0"
                          }}>
                            {r.aadhaar}
                          </div>
                        </td>
                        <td style={{ padding: "20px 32px" }}>
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                            {new Date(r.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td style={{ padding: "20px 32px" }}>
                          <span style={{
                            fontSize: "0.65rem", fontWeight: 800, padding: "4px 10px", borderRadius: "8px", textTransform: "uppercase",
                            background: r.status === "APPROVED" ? "#dcfce7" : r.status === "REJECTED" ? "#fef2f2" : "#fff7ed",
                            color: r.status === "APPROVED" ? "#166534" : r.status === "REJECTED" ? "#991b1b" : "#c2410c",
                            border: "1px solid",
                            borderColor: r.status === "APPROVED" ? "#bbf7d0" : r.status === "REJECTED" ? "#fee2e2" : "#ffedd5"
                          }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: "20px 32px", textAlign: "right" }}>
                          {r.status === "PENDING" ? (
                            isReadOnly ? (
                              <span style={{
                                fontSize: "0.65rem", fontWeight: 800, color: "#64748b",
                                backgroundColor: "#f1f5f9", padding: "4px 10px",
                                borderRadius: "6px", border: "1px solid #e2e8f0"
                              }}>READ ONLY</span>
                            ) : (
                              <div style={{ display: "inline-flex", gap: "8px" }}>
                                <button
                                  onClick={() => openModal(r)}
                                  style={{
                                    padding: "8px 16px", background: "#2563eb", color: "white", border: "none",
                                    borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                                    boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)"
                                  }}
                                >
                                  Review
                                </button>
                                <button
                                  onClick={() => onReject(r.id)}
                                  style={{
                                    padding: "8px 16px", background: "white", color: "#64748b", border: "1px solid #e2e8f0",
                                    borderRadius: "10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer"
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            )
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#cbd5e1", fontStyle: "italic", fontWeight: 600 }}>Archived</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {modal && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(6px)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
          }}>
            <div style={{
              background: "white", width: "90%", maxWidth: "480px", borderRadius: "24px",
              overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", border: "1px solid #e2e8f0"
            }}>
              <div style={{
                padding: "24px 32px", borderBottom: "1px solid #f1f5f9", display: "flex",
                justifyContent: "space-between", alignItems: "center", background: "#fcfdfe"
              }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>Review Application</h3>
                <button
                  onClick={closeModal}
                  style={{ background: "#f1f5f9", border: "none", color: "#64748b", fontSize: "1.25rem", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Administrative Role</label>
                  <select
                    className="input"
                    style={{ width: "100%", height: "48px", borderRadius: "12px", border: "1.5px solid #e2e8f0", padding: "0 16px", fontWeight: 700, color: "#1e293b", backgroundColor: "#f8fafc" }}
                    value={modal.role}
                    onChange={(e) => setModal((m) => (m ? { ...m, role: e.target.value as any } : m))}
                  >
                    <option value="">Select organizational role</option>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>System Modules</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {modules.map((m) => {
                      const isActive = modal.moduleIds.has(m.id);
                      return (
                        <label
                          key={m.id}
                          style={{
                            display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px", borderRadius: "12px",
                            border: `1.5px solid ${isActive ? "#2563eb" : "#e2e8f0"}`,
                            background: isActive ? "#eff6ff" : "white",
                            color: isActive ? "#2563eb" : "#475569",
                            fontSize: "0.85rem", fontWeight: 800, cursor: "pointer", transition: "all 0.2s"
                          }}
                        >
                          <input
                            type="checkbox"
                            style={{ width: "16px", height: "16px", accentColor: "#2563eb" }}
                            checked={isActive}
                            onChange={() =>
                              setModal((mod) => (mod ? { ...mod, moduleIds: toggleSet(mod.moduleIds, m.id) } : mod))
                            }
                          />
                          {m.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ padding: "24px 32px", background: "#f8fafc", borderTop: "1px solid #f1f5f9", display: "flex", gap: "12px" }}>
                <button
                  style={{ flex: 1, height: "48px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "white", fontWeight: 700, cursor: "pointer" }}
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  style={{
                    flex: 2, height: "48px", borderRadius: "12px", border: "none", background: modalValid ? "#2563eb" : "#cbd5e1",
                    color: "white", fontWeight: 700, cursor: modalValid ? "pointer" : "not-allowed",
                    boxShadow: modalValid ? "0 10px 15px -3px rgba(37, 99, 235, 0.25)" : "none"
                  }}
                  disabled={!modalValid || saving}
                  onClick={onApprove}
                >
                  {saving ? "Processing..." : "Grant Access"}
                </button>
              </div>
            </div>
          </div>
        )}
        <style jsx>{`
            .animate-spin {
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
      </div>
    </RoleGuard>
  );
}

