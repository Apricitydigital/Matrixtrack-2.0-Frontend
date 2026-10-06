'use client';

import React, { useCallback, useEffect, useState } from "react";
import { ApiError, TaskforceApi } from "@lib/apiClient";

/*
 * SI verification queue: new GVP registrations and elimination claims.
 * Approving a registration assigns the GVP to the daroga who registered it.
 */
type RequestRow = {
  kind: "REGISTRATION" | "ELIMINATION";
  point: any;
  photoUrl?: string;
  requestedAt?: string;
};

export default function GvpRequestsTab({ onChanged, hideWhenEmpty = false }: { onChanged?: () => void; hideWhenEmpty?: boolean }) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [registrations, eliminations] = await Promise.all([
        TaskforceApi.pendingFeederPoints(),
        TaskforceApi.pendingEliminations()
      ]);
      setRows([
        ...(eliminations.feederPoints || []).map((point: any) => ({
          kind: "ELIMINATION" as const,
          point,
          photoUrl: point.eliminationPhotoUrls?.[0],
          requestedAt: point.eliminationRequestedAt
        })),
        ...(registrations.feederPoints || []).map((point: any) => ({
          kind: "REGISTRATION" as const,
          point,
          photoUrl: point.photoUrl,
          requestedAt: point.createdAt
        }))
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load GVP requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (row: RequestRow, approve: boolean) => {
    let remark: string | undefined;
    if (!approve) {
      const entered = window.prompt(
        row.kind === "ELIMINATION" ? "Why is this elimination rejected?" : "Reason for rejecting this GVP (optional)"
      );
      if (entered === null) return;
      remark = entered.trim() || undefined;
      if (row.kind === "ELIMINATION" && !remark) {
        setError("A remark is required to reject an elimination.");
        return;
      }
    }

    setBusyId(row.point.id);
    setError("");
    try {
      if (row.kind === "ELIMINATION") {
        await TaskforceApi.reviewElimination(row.point.id, approve ? "approve" : "reject", remark);
      } else if (approve) {
        await TaskforceApi.approveRequest(row.point.id, {});
      } else {
        await TaskforceApi.rejectRequest(row.point.id);
      }
      setRows((prev) => prev.filter((item) => !(item.point.id === row.point.id && item.kind === row.kind)));
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  if (hideWhenEmpty && !loading && !error && rows.length === 0) return null;

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a" }}>GVP Requests</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
            Verify new GVP registrations and daroga claims that a GVP is eliminated.
          </p>
        </div>
        <button type="button" onClick={load} style={ghostBtn}>Refresh</button>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      {loading ? (
        <div style={empty}>Loading requests...</div>
      ) : rows.length === 0 ? (
        <div style={empty}>No pending GVP requests.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((row) => {
            const p = row.point;
            const busy = busyId === p.id;
            return (
              <div key={`${row.kind}-${p.id}`} style={rowCard}>
                {row.photoUrl ? (
                  <a href={row.photoUrl} target="_blank" rel="noreferrer">
                    <img src={row.photoUrl} alt={p.feederPointName} style={{ width: 96, height: 96, borderRadius: 10, objectFit: "cover" }} />
                  </a>
                ) : (
                  <div style={{ ...photoPlaceholder }}>No photo</div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={row.kind === "ELIMINATION" ? eliminationBadge : registrationBadge}>
                    {row.kind === "ELIMINATION" ? "Elimination" : "New GVP"}
                  </span>
                  <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{p.feederPointName}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {[p.areaName, p.areaType?.replace(/_/g, " "), p.zoneName, p.wardName].filter(Boolean).join(" • ")}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                    {row.kind === "ELIMINATION"
                      ? p.eliminationRemark || "No remark from daroga."
                      : p.locationDescription}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                    {p.requestedBy?.name ? `Requested by ${p.requestedBy.name} • ` : ""}
                    {row.requestedAt ? new Date(row.requestedAt).toLocaleString() : ""}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button type="button" disabled={busy} onClick={() => decide(row, true)} style={approveBtn}>
                    {row.kind === "ELIMINATION" ? "Verify Eliminated" : "Approve"}
                  </button>
                  <button type="button" disabled={busy} onClick={() => decide(row, false)} style={rejectBtn}>
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 18,
  border: "1px solid #e2e8f0",
  padding: 20
};
const rowCard: React.CSSProperties = {
  display: "flex",
  gap: 16,
  alignItems: "flex-start",
  padding: 14,
  borderRadius: 14,
  border: "1px solid #f1f5f9",
  background: "#f8fafc"
};
const photoPlaceholder: React.CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: 10,
  background: "#e2e8f0",
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};
const badge: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "3px 8px",
  borderRadius: 6
};
const eliminationBadge: React.CSSProperties = { ...badge, background: "#ffe4e6", color: "#be123c" };
const registrationBadge: React.CSSProperties = { ...badge, background: "#dbeafe", color: "#1d4ed8" };
const approveBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "white",
  fontWeight: 800,
  fontSize: 12,
  cursor: "pointer"
};
const rejectBtn: React.CSSProperties = {
  ...approveBtn,
  background: "#ffffff",
  color: "#dc2626",
  border: "1px solid #fecaca"
};
const ghostBtn: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#475569",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer"
};
const errorBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 12
};
const empty: React.CSSProperties = { padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 };
