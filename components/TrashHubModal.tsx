"use client";

import React, { useEffect, useState } from "react";
import { auditLogApi } from "../lib/apiClient";

interface TrashHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrashHubModal: React.FC<TrashHubModalProps> = ({ isOpen, onClose }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const res = await auditLogApi.getTrash();
      if (res.ok) {
        setItems(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load trash:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTrash();
      setMessage(null);
    }
  }, [isOpen]);

  const handleRestore = async (id: string, type: "User" | "City") => {
    try {
      setActionLoadingId(id);
      setMessage(null);
      const res = await auditLogApi.restoreTrash(id, type);
      if (res.ok) {
        setMessage({ type: "success", text: `${type} restored successfully!` });
        await fetchTrash();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to restore item" });
    } finally {
      setActionLoadingId(null);
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
          maxWidth: "850px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>🗑️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
                Trash & 10-Day Recovery Hub
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Items can be restored within 10 days of deletion before permanent auto-purge.
              </p>
            </div>
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

        {/* Status Message */}
        {message && (
          <div
            style={{
              padding: "10px 24px",
              backgroundColor: message.type === "success" ? "#f0fdf4" : "#fef2f2",
              borderBottom: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fee2e2"}`,
              color: message.type === "success" ? "#15803d" : "#b91c1c",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {message.text}
          </div>
        )}

        {/* Modal Body / Table */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: "14px" }}>
              Loading deleted items...
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>✨</div>
              <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#334155" }}>
                Trash is empty
              </h4>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#94a3b8" }}>
                No users or cities are currently in the 10-day retention window.
              </p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "10px 12px", fontWeight: 600 }}>Type</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600 }}>Name / Details</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600 }}>Deleted Date</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600 }}>Retention Countdown</th>
                  <th style={{ padding: "10px 12px", fontWeight: 600, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background-color 0.15s",
                    }}
                  >
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: item.type === "User" ? "#ede9fe" : "#dbeafe",
                          color: item.type === "User" ? "#6d28d9" : "#1d4ed8",
                        }}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.name}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{item.identifier}</div>
                    </td>
                    <td style={{ padding: "12px", color: "#64748b" }}>
                      {new Date(item.deletedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: item.daysRemaining <= 2 ? "#fee2e2" : "#f0fdf4",
                          color: item.daysRemaining <= 2 ? "#b91c1c" : "#15803d",
                        }}
                      >
                        ⏳ {item.daysRemaining} {item.daysRemaining === 1 ? "day" : "days"} left
                      </span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <button
                        onClick={() => handleRestore(item.id, item.type)}
                        disabled={actionLoadingId === item.id}
                        style={{
                          padding: "6px 14px",
                          fontSize: "12px",
                          fontWeight: 600,
                          borderRadius: "6px",
                          border: "1px solid #16a34a",
                          backgroundColor: "#f0fdf4",
                          color: "#15803d",
                          cursor: actionLoadingId === item.id ? "not-allowed" : "pointer",
                        }}
                      >
                        {actionLoadingId === item.id ? "Restoring..." : "↺ Restore"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
