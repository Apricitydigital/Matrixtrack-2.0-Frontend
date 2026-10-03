"use client";

import React, { useCallback, useEffect, useState } from "react";
import { NalaApi } from "@lib/apiClient";

/*
 * Supervisor Nala requests (Sweeping: /city/beat-requests).
 *
 * A Supervisor proposes a Nala from the field; it stays PENDING_QC
 * and cannot be assigned or inspected until QC / City Admin approves it.
 */

type StatusTab = "PENDING_QC" | "APPROVED" | "REJECTED" | "ALL";

const STATUS_TABS: { id: StatusTab; label: string; countKey: "pending" | "approved" | "rejected" | "all" }[] = [
  { id: "PENDING_QC", label: "Pending", countKey: "pending" },
  { id: "APPROVED", label: "Approved", countKey: "approved" },
  { id: "REJECTED", label: "Rejected", countKey: "rejected" },
  { id: "ALL", label: "All", countKey: "all" }
];

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_QC: { label: "PENDING", color: "#b45309", bg: "#fffbeb" },
  APPROVED: { label: "APPROVED", color: "#047857", bg: "#ecfdf5" },
  REJECTED: { label: "REJECTED", color: "#b91c1c", bg: "#fef2f2" }
};

export default function NalaRequestsTab({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const [activeTab, setActiveTab] = useState<StatusTab>("PENDING_QC");
  const [requests, setRequests] = useState<any[]>([]);
  const [counts, setCounts] = useState<{ pending: number; approved: number; rejected: number; all: number }>({
    pending: 0,
    approved: 0,
    rejected: 0,
    all: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await NalaApi.listPendingRequests(activeTab);
      setRequests(response.pendingNalas || []);
      if (response.counts) setCounts(response.counts);
    } catch (err: any) {
      setError(err?.message || "Unable to load Nala requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (nala: any, action: "APPROVE" | "REJECT", reason?: string) => {
    try {
      setWorkingId(nala.id);
      setError("");
      await NalaApi.reviewRequest(nala.id, action, reason);
      setRejecting(null);
      setRejectReason("");
      await load();
      await onChanged?.();
    } catch (err: any) {
      setError(err?.message || "Review failed.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 5,
          background: "#f1f5f9",
          padding: 4,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          width: "fit-content",
          marginBottom: 16,
          flexWrap: "wrap"
        }}
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "7px 14px",
              borderRadius: 9,
              border: "none",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              background: activeTab === tab.id ? "#2563eb" : "transparent",
              color: activeTab === tab.id ? "#ffffff" : "#64748b"
            }}
          >
            {tab.label} ({counts[tab.countKey] || 0})
          </button>
        ))}
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {loading ? (
        <div style={emptyStyle}>Loading Nala requests...</div>
      ) : requests.length === 0 ? (
        <div style={emptyStyle}>No Nala requests in this list.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {requests.map((nala) => {
            const status = STATUS_STYLE[nala.status] || { label: nala.status, color: "#64748b", bg: "#f1f5f9" };
            const points: any[] = nala.nalaPoints || [];

            return (
              <div
                key={nala.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: 16
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: "#0f172a" }}>{nala.nalaName}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 900,
                          padding: "3px 9px",
                          borderRadius: 999,
                          color: status.color,
                          background: status.bg
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      {[nala.nalaCode, nala.zoneName, nala.wardName, nala.areaName].filter(Boolean).join(" · ")}
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                      Requested by <strong>{nala.requestedByName || "Supervisor"}</strong>
                      {nala.createdAt && ` on ${new Date(nala.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                    </div>
                    {nala.status === "REJECTED" && nala.rejectionReason && (
                      <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}>Reason: {nala.rejectionReason}</div>
                    )}
                  </div>

                  {nala.status === "PENDING_QC" && (
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <button
                        type="button"
                        disabled={workingId === nala.id}
                        onClick={() => review(nala, "APPROVE")}
                        style={{ ...buttonStyle, background: "#16a34a", color: "#ffffff", border: "none" }}
                      >
                        {workingId === nala.id ? "Saving..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={workingId === nala.id}
                        onClick={() => {
                          setRejecting(nala);
                          setRejectReason("");
                        }}
                        style={{ ...buttonStyle, background: "#ffffff", color: "#dc2626", border: "1px solid #fecaca" }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {points.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                    {points.map((point) => (
                      <a
                        key={point.id}
                        href={
                          point.pointLatitude != null && point.pointLongitude != null
                            ? `https://www.google.com/maps?q=${point.pointLatitude},${point.pointLongitude}`
                            : undefined
                        }
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "4px 9px",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                          color: "#334155",
                          textDecoration: "none"
                        }}
                      >
                        {point.pointCode} · {point.pointName}
                      </a>
                    ))}
                  </div>
                )}

                {rejecting?.id === nala.id && (
                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Reason for rejection"
                      style={{
                        flex: 1,
                        minWidth: 220,
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        fontSize: 12,
                        outline: "none"
                      }}
                    />
                    <button
                      type="button"
                      disabled={workingId === nala.id || !rejectReason.trim()}
                      onClick={() => review(nala, "REJECT", rejectReason.trim())}
                      style={{ ...buttonStyle, background: "#dc2626", color: "#ffffff", border: "none" }}
                    >
                      Confirm Reject
                    </button>
                    <button type="button" onClick={() => setRejecting(null)} style={buttonStyle}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer"
};

const emptyStyle: React.CSSProperties = {
  padding: 40,
  textAlign: "center",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  color: "#64748b",
  fontSize: 13,
  fontWeight: 600
};

const errorStyle: React.CSSProperties = {
  marginBottom: 12,
  padding: "10px 12px",
  borderRadius: 10,
  background: "#fef2f2",
  color: "#b91c1c",
  fontSize: 12,
  fontWeight: 700
};
