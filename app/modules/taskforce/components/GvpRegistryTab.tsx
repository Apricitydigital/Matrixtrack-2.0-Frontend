'use client';

import React, { useEffect, useMemo, useState } from "react";
import { ApiError, TaskforceApi } from "@lib/apiClient";

type StateFilter = "ALL" | "ACTIVE" | "ELIMINATION_PENDING" | "ELIMINATED";

function gvpState(point: any): Exclude<StateFilter, "ALL"> {
  if (point.eliminatedAt) return "ELIMINATED";
  if (point.eliminationStatus === "PENDING_QC") return "ELIMINATION_PENDING";
  return "ACTIVE";
}

const STATE_META: Record<Exclude<StateFilter, "ALL">, { label: string; bg: string; color: string }> = {
  ACTIVE: { label: "Active", bg: "#dbeafe", color: "#1d4ed8" },
  ELIMINATION_PENDING: { label: "Elimination Pending", bg: "#fef3c7", color: "#b45309" },
  ELIMINATED: { label: "Eliminated", bg: "#dcfce7", color: "#15803d" }
};

/*
 * Registered (approved) GVPs. The SI can reassign the daroga who
 * inspects a GVP; the backend only allows QC to assign.
 */
export default function GvpRegistryTab({
  points,
  canAssign,
  canDelete = false,
  onRefresh
}: {
  points: any[];
  canAssign: boolean;
  canDelete?: boolean;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("ALL");
  const [staff, setStaff] = useState<any[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!canAssign) return;
    TaskforceApi.workspaceStaff()
      .then((res) => setStaff(res.staff || []))
      .catch(() => setStaff([]));
  }, [canAssign]);

  const counts = useMemo(() => {
    const out = { ALL: points.length, ACTIVE: 0, ELIMINATION_PENDING: 0, ELIMINATED: 0 };
    points.forEach((point) => {
      out[gvpState(point)] += 1;
    });
    return out;
  }, [points]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return points.filter((point) => {
      if (stateFilter !== "ALL" && gvpState(point) !== stateFilter) return false;
      if (!q) return true;
      return [point.feederPointName, point.areaName, point.locationDescription, point.zoneName, point.wardName, point.landmark]
        .filter(Boolean)
        .some((value: string) => value.toLowerCase().includes(q));
    });
  }, [points, search, stateFilter]);

  const assign = async (pointId: string, supervisorId: string) => {
    if (!supervisorId) return;
    setAssigning(pointId);
    setError("");
    try {
      await TaskforceApi.assignFeederPoint(pointId, supervisorId);
      onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Assignment failed");
    } finally {
      setAssigning(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      await TaskforceApi.deleteFeederPoint(deleteTarget.id);
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete GVP");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = ["GVP", "Zone / Ward", "Area Type", "Assigned Daroga", "State", "Registered", ...(canDelete ? ["Action"] : [])];

  return (
    <div style={card}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search GVP, area, ward..."
          style={{ flex: 1, minWidth: 220, padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <div style={{ display: "flex", background: "#f1f5f9", padding: 3, borderRadius: 10, flexWrap: "wrap" }}>
          {(["ALL", "ACTIVE", "ELIMINATION_PENDING", "ELIMINATED"] as StateFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStateFilter(key)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "none",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                background: stateFilter === key ? "#ffffff" : "transparent",
                color: stateFilter === key ? "#2563eb" : "#64748b"
              }}
            >
              {key === "ALL" ? "All" : STATE_META[key].label} ({counts[key]})
            </button>
          ))}
        </div>
      </div>

      {error && <div style={errorBox}>{error}</div>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((label) => (
                <th key={label} style={th}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  No GVPs match the filters.
                </td>
              </tr>
            ) : (
              filtered.map((point) => {
                const state = gvpState(point);
                const meta = STATE_META[state];
                const assignedIds: string[] = point.assignedEmployeeIds || [];
                const assignedNames = (point.assignedEmployees || []).map((user: any) => user?.name).filter(Boolean);
                return (
                  <tr key={point.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>{point.feederPointName}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        {[point.areaName, point.landmark].filter(Boolean).join(" • ") || point.locationDescription}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{point.zoneName || "-"}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{point.wardName || "-"}</div>
                    </td>
                    <td style={td}>{point.areaType ? String(point.areaType).replace(/_/g, " ") : "-"}</td>
                    <td style={td}>
                      {canAssign && state !== "ELIMINATED" ? (
                        <select
                          value={assignedIds[0] || ""}
                          disabled={assigning === point.id}
                          onChange={(e) => assign(point.id, e.target.value)}
                          style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, maxWidth: 200 }}
                        >
                          <option value="">{assignedNames[0] || "Not assigned"}</option>
                          {staff
                            .filter((member) => member.id !== assignedIds[0])
                            .map((member) => (
                              <option key={member.id} value={member.id}>{member.name || member.email}</option>
                            ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: 12 }}>{assignedNames.join(", ") || "Not assigned"}</span>
                      )}
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", padding: "3px 8px", borderRadius: 6, background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                      {point.eliminatedAt && (
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                          {new Date(point.eliminatedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td style={td}>{point.createdAt ? new Date(point.createdAt).toLocaleDateString() : "-"}</td>
                    {canDelete && (
                      <td style={td}>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(point)}
                          style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#ffffff", borderRadius: 18, padding: 24, maxWidth: 420, width: "100%" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#0f172a", textAlign: "center" }}>Delete GVP?</h3>
            <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", margin: "10px 0 18px" }}>
              Delete <strong style={{ color: "#0f172a" }}>{deleteTarget.feederPointName || deleteTarget.areaName}</strong> and all of its inspection reports. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #e2e8f0", background: "#ffffff", fontWeight: 800, cursor: "pointer" }}>
                Cancel
              </button>
              <button type="button" disabled={deleting} onClick={confirmDelete} style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: "#dc2626", color: "#ffffff", fontWeight: 800, cursor: "pointer" }}>
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
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
const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  padding: "10px 8px",
  borderBottom: "2px solid #f1f5f9"
};
const td: React.CSSProperties = {
  padding: "12px 8px",
  fontSize: 13,
  color: "#334155",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top"
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
