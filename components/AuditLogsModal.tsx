"use client";

import React, { useEffect, useState } from "react";
import { auditLogApi } from "../lib/apiClient";

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityId?: string;
  isSuperAdmin?: boolean;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({
  isOpen,
  onClose,
  cityId,
  isSuperAdmin = false,
}) => {
  const [activeTab, setActiveTab] = useState<"LOGS" | "SESSIONS">("LOGS");
  const [logs, setLogs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditLogApi.getLogs({
        action: actionFilter || undefined,
        module: moduleFilter || undefined,
        cityId: cityId || undefined,
        page,
        limit: 25,
      });
      if (res.ok) {
        setLogs(res.data);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await auditLogApi.getSessions(cityId);
      if (res.ok) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch active sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === "LOGS") {
        fetchLogs();
      } else {
        fetchSessions();
      }
    }
  }, [isOpen, activeTab, actionFilter, moduleFilter, page]);

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to force logout this device?")) return;
    try {
      setRevokingId(sessionId);
      await auditLogApi.revokeSession(sessionId);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "1050px",
          height: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
              🔍 Audit Trail & Security Center
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
              Live 3-day high-precision activity tracking, user actions, device logins, and change diffs.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "20px",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation & Filters */}
        <div
          style={{
            padding: "12px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => { setActiveTab("LOGS"); setPage(1); }}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                backgroundColor: activeTab === "LOGS" ? "#0f172a" : "#f1f5f9",
                color: activeTab === "LOGS" ? "#ffffff" : "#475569",
              }}
            >
              📋 Activity Logs
            </button>
            <button
              onClick={() => setActiveTab("SESSIONS")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                backgroundColor: activeTab === "SESSIONS" ? "#0f172a" : "#f1f5f9",
                color: activeTab === "SESSIONS" ? "#ffffff" : "#475569",
              }}
            >
              💻 Active Devices & Sessions ({sessions.length})
            </button>
          </div>

          {/* Filter dropdowns (Logs Tab) */}
          {activeTab === "LOGS" && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                }}
              >
                <option value="">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="RESTORE">RESTORE</option>
              </select>

              <select
                value={moduleFilter}
                onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                }}
              >
                <option value="">All Modules</option>
                <option value="AUTH">AUTH</option>
                <option value="USERS">USERS</option>
                <option value="CITIES">CITIES</option>
                <option value="TOILETS">TOILETS</option>
                <option value="SWEEPING">SWEEPING</option>
                <option value="TWINBIN">TWINBIN</option>
                <option value="WARD_RANKING">WARD RANKING</option>
              </select>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: "14px" }}>
              Loading data...
            </div>
          ) : activeTab === "LOGS" ? (
            logs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                No audit logs found for the selected filter.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                    <th style={{ padding: "8px 10px" }}>Timestamp</th>
                    <th style={{ padding: "8px 10px" }}>User</th>
                    <th style={{ padding: "8px 10px" }}>Action</th>
                    <th style={{ padding: "8px 10px" }}>Module</th>
                    <th style={{ padding: "8px 10px" }}>Description</th>
                    <th style={{ padding: "8px 10px" }}>Device / IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const actionColors: Record<string, { bg: string; text: string }> = {
                      LOGIN: { bg: "#f0fdf4", text: "#166534" },
                      LOGOUT: { bg: "#f1f5f9", text: "#475569" },
                      CREATE: { bg: "#ecfdf5", text: "#065f46" },
                      UPDATE: { bg: "#eff6ff", text: "#1e40af" },
                      DELETE: { bg: "#fef2f2", text: "#991b1b" },
                      RESTORE: { bg: "#faf5ff", text: "#6b21a8" },
                    };
                    const color = actionColors[log.action] || { bg: "#f1f5f9", text: "#334155" };

                    return (
                      <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px", color: "#64748b", whiteSpace: "nowrap" }}>
                          {new Date(log.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>
                            {log.userName || "System"}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            {log.userRole || log.userEmail || "—"}
                          </div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 700,
                              backgroundColor: color.bg,
                              color: color.text,
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: "10px", fontWeight: 600, color: "#334155" }}>
                          {log.module}
                        </td>
                        <td style={{ padding: "10px", color: "#334155", maxWidth: "320px" }}>
                          {log.description || "—"}
                        </td>
                        <td style={{ padding: "10px", color: "#64748b", fontSize: "11px" }}>
                          <div>{log.deviceType} • {log.browser} ({log.os})</div>
                          <div>IP: {log.ipAddress}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            /* Active Sessions Tab */
            sessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                No active device sessions found.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "16px",
                      backgroundColor: "#f8fafc",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "18px" }}>
                          {sess.deviceType === "Mobile" ? "📱" : sess.deviceType === "Tablet" ? "📟" : "💻"}
                        </span>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontSize: "10px",
                            fontWeight: 700,
                            backgroundColor: "#dcfce7",
                            color: "#15803d",
                          }}
                        >
                          🟢 ACTIVE
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>
                        {sess.user?.name || "Logged In User"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                        {sess.user?.email || sess.user?.phone || "No Email"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#475569" }}>
                        <div><strong>Device:</strong> {sess.deviceType} ({sess.os} • {sess.browser})</div>
                        <div><strong>IP Address:</strong> {sess.ipAddress}</div>
                        <div>
                          <strong>Last Active:</strong>{" "}
                          {new Date(sess.lastActiveAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      disabled={revokingId === sess.id}
                      style={{
                        marginTop: "14px",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #fca5a5",
                        backgroundColor: "#fef2f2",
                        color: "#b91c1c",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: revokingId === sess.id ? "not-allowed" : "pointer",
                        width: "100%",
                      }}
                    >
                      {revokingId === sess.id ? "Logging out..." : "🔒 Force Logout Device"}
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer with Pagination (for Logs) */}
        {activeTab === "LOGS" && totalPages > 1 && (
          <div
            style={{
              padding: "12px 24px",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc",
            }}
          >
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: "4px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  fontSize: "12px",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: "4px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  fontSize: "12px",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
