"use client";

import React, { useEffect, useMemo, useState } from "react";
import { NalaApi } from "@lib/apiClient";
import ModalPortal from "@components/ui/ModalPortal";

/*
 * Assign one Supervisor / Employee to every NalaPoint of a group
 * of Nalas (Sweeping: GroupAssignModal). The group must share one
 * Ward so the first Nala's eligible users apply to all of them.
 */

type Props = {
  nalas: any[];
  title: string;
  mode: "SUPERVISOR" | "EMPLOYEE";
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

export default function NalaGroupAssignModal({ nalas, title, mode, onClose, onSuccess }: Props) {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const roleLabel = mode === "SUPERVISOR" ? "Supervisor" : "Employee";
  const pointCount = nalas.reduce((sum, nala) => sum + Number(nala.totalPoints ?? nala.nalaPoints?.length ?? 0), 0);

  useEffect(() => {
    let active = true;

    if (!nalas.length) return;

    setFetching(true);
    NalaApi.listPotentialAssignees(nalas[0].id, mode)
      .then((items) => {
        if (active) setUsers(items || []);
      })
      .catch((err) => {
        if (active) setError(err?.message || "Failed to load eligible users");
      })
      .finally(() => {
        if (active) setFetching(false);
      });

    return () => {
      active = false;
    };
  }, [nalas, mode]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter(
      (user) =>
        !query ||
        [user.name, user.email, user.phone, user.employeeId].some((value) =>
          String(value || "").toLowerCase().includes(query)
        )
    );
  }, [users, search]);

  const assign = async (userId: string | null) => {
    try {
      setSavingId(userId || "CLEAR");
      setError("");
      await NalaApi.bulkAssign(
        nalas.map((nala) => nala.id),
        userId,
        mode
      );
      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Bulk assignment failed");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <ModalPortal>
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={headerStyle}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#2563eb", letterSpacing: "0.06em" }}>
                ASSIGN NALA GROUP
              </div>
              <div style={{ fontSize: 17, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {nalas.length} Nalas · {pointCount} NalaPoints · one {roleLabel.toLowerCase()} applied to all
              </div>
            </div>
            <button type="button" onClick={onClose} style={closeButtonStyle}>
              ×
            </button>
          </div>

          <div style={{ padding: 18 }}>
            {error && <div style={errorStyle}>{error}</div>}

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${roleLabel.toLowerCase()}...`}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                fontSize: 13,
                outline: "none"
              }}
            />

            <div style={{ display: "grid", gap: 8, maxHeight: 380, overflowY: "auto", margin: "14px 0" }}>
              {fetching ? (
                <div style={emptyStyle}>Loading eligible users...</div>
              ) : filtered.length ? (
                filtered.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => assign(user.id)}
                    disabled={!!savingId}
                    style={userRowStyle}
                  >
                    <span style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                      <strong style={{ fontSize: 13, color: "#0f172a" }}>{user.name}</strong>
                      <small style={{ fontSize: 11, color: "#64748b" }}>
                        {user.employeeId || user.email || user.phone || roleLabel} · {user.currentNalaPointCount || 0}{" "}
                        points now
                      </small>
                    </span>
                    <em style={{ fontSize: 10.5, color: "#2563eb", fontStyle: "normal", fontWeight: 900 }}>
                      {savingId === user.id ? "Assigning..." : `Assign all ${nalas.length}`}
                    </em>
                  </button>
                ))
              ) : (
                <div style={emptyStyle}>No eligible {roleLabel.toLowerCase()} found for this ward.</div>
              )}
            </div>

            <button
              type="button"
              onClick={() => assign(null)}
              disabled={!!savingId}
              style={{
                width: "100%",
                height: 40,
                border: "1px solid #fecaca",
                borderRadius: 10,
                background: "#ffffff",
                color: "#dc2626",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              {savingId === "CLEAR" ? "Clearing..." : `Clear ${roleLabel} from all ${nalas.length} Nalas`}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 6000,
  background: "rgba(15,23,42,0.58)",
  display: "grid",
  placeItems: "center",
  padding: 20
};

const modalStyle: React.CSSProperties = {
  width: "min(560px, 100%)",
  maxHeight: "88vh",
  background: "#ffffff",
  borderRadius: 18,
  overflow: "hidden",
  boxShadow: "0 28px 70px rgba(15,23,42,0.3)"
};

const headerStyle: React.CSSProperties = {
  padding: "18px 20px",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "space-between",
  gap: 16
};

const closeButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  fontSize: 20,
  cursor: "pointer"
};

const userRowStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#ffffff",
  padding: "10px 12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  cursor: "pointer"
};

const emptyStyle: React.CSSProperties = {
  padding: 30,
  textAlign: "center",
  color: "#64748b",
  fontSize: 13
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
