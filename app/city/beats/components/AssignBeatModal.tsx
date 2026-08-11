"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Loader2,
  Search,
  AlertCircle,
  Layers,
  UserX,
} from "lucide-react";
import { AreaBeatApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

interface AssignBeatModalProps {
  beat: any;
  initialSelectedSegmentIds?: string[];
  onClose: () => void;
  onSuccess: () => void;
  mode?: "SUPERVISOR" | "EMPLOYEE";
}

export default function AssignBeatModal({
  beat,
  onClose,
  onSuccess,
  mode,
}: AssignBeatModalProps) {
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  const isCityAdmin =
    currentUser?.roles?.includes("CITY_ADMIN") ||
    currentUser?.roles?.includes("HMS_SUPER_ADMIN");

  const targetRole: "SUPERVISOR" | "EMPLOYEE" =
    mode || (isCityAdmin ? "SUPERVISOR" : "EMPLOYEE");

  useEffect(() => {
    fetchUsers();
  }, [beat.id, targetRole]);

  const fetchUsers = async () => {
    setFetching(true);
    setError(null);

    try {
      const data = await AreaBeatApi.listPotentialAssignees(
        beat.id,
        targetRole
      );
      setUsers(data);
    } catch (err: any) {
      console.error("Failed to fetch users", err);
      setError(err.message || "Failed to fetch potential assignees");
    } finally {
      setFetching(false);
    }
  };

  const handleAssign = async (userId: string | null) => {
    setLoading(true);
    setAssigningUserId(userId);
    setError(null);

    try {
      /*
       * Whole-beat assignment only.
       * Sub-beat / segment assignment is intentionally disabled
       * for both SUPERVISOR and EMPLOYEE flows.
       */
      await AreaBeatApi.assign(
        beat.id,
        userId as any,
        null,
        undefined,
        targetRole
      );

      onSuccess();

      setTimeout(() => {
        setAssigningUserId(null);

        if (userId !== null) {
          onClose();
        }
      }, 500);
    } catch (err: any) {
      setError(err.message || "Assignment failed");
      setAssigningUserId(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return users;

    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q)
    );
  }, [search, users]);

  const modalTitle =
    targetRole === "SUPERVISOR"
      ? "Assign Supervisor"
      : "Assign Employee";

  const wholeBeatLabel =
    targetRole === "SUPERVISOR"
      ? "Assign Beat to Supervisor"
      : "Assign Beat to Employee";

  const wholeBeatHelp =
    targetRole === "SUPERVISOR"
      ? "Choose one supervisor for this complete beat."
      : "Choose one employee for this complete beat.";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.6)",
        zIndex: 1001,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: "560px",
          backgroundColor: "white",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {modalTitle}
            </h3>

            <div
              style={{
                fontSize: "0.875rem",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "2px",
              }}
            >
              <Layers size={14} />
              {beat.beatName}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "2px solid #f1f5f9",
              borderRadius: "10px",
              padding: "8px",
              backgroundColor: "white",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div
          style={{
            padding: "0 24px",
            flex: 1,
            overflowY: "auto",
          }}
        >
          {error && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fee2e2",
                borderRadius: "12px",
                color: "#dc2626",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* STEP 1 */}
          <div style={{ marginTop: "24px" }}>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "12px",
              }}
            >
              Step 1: Beat Assignment
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px",
                borderRadius: "14px",
                border: "2px solid #2563eb",
                backgroundColor: "#eff6ff",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: "6px solid #2563eb",
                  backgroundColor: "white",
                  flexShrink: 0,
                }}
              />

              <div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "#1e3a8a",
                  }}
                >
                  {wholeBeatLabel}
                </div>

                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    marginTop: "2px",
                  }}
                >
                  {wholeBeatHelp}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2 */}
          <div
            style={{
              marginTop: "32px",
              paddingBottom: "32px",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "12px",
              }}
            >
              Step 2: Select{" "}
              {targetRole === "SUPERVISOR"
                ? "Supervisor"
                : "Employee"}
            </div>

            <div
              style={{
                position: "relative",
                marginBottom: "16px",
              }}
            >
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />

              <input
                type="text"
                placeholder={
                  targetRole === "SUPERVISOR"
                    ? "Search supervisor..."
                    : "Search employee..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 12px 12px 42px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.875rem",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gap: "8px",
              }}
            >
              {fetching ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                  }}
                >
                  <Loader2
                    className="animate-spin"
                    style={{
                      margin: "0 auto",
                      color: "#2563eb",
                    }}
                  />
                </div>
              ) : (
                filteredUsers.map((user: any) => (
                  <div
                    key={user.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "14px 16px",
                      backgroundColor: user.matchesContext
                        ? "#f8fafc"
                        : "white",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        {user.name}
                      </div>

                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#64748b",
                          marginTop: "2px",
                        }}
                      >
                        {user.email}
                      </div>

                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: user.matchesContext
                            ? "#059669"
                            : "#94a3b8",
                          marginTop: "4px",
                          fontWeight: 600,
                        }}
                      >
                        {user.matchesContext
                          ? "Matches this zone/ward"
                          : "Outside current zone/ward scope"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAssign(user.id)}
                      disabled={loading}
                      style={{
                        minWidth: "92px",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "none",
                        backgroundColor: "#2563eb",
                        color: "white",
                        fontWeight: 700,
                        cursor: loading
                          ? "not-allowed"
                          : "pointer",
                        opacity:
                          loading &&
                          assigningUserId !== user.id
                            ? 0.5
                            : 1,
                      }}
                    >
                      {loading &&
                      assigningUserId === user.id ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                          style={{ margin: "0 auto" }}
                        />
                      ) : (
                        "Assign"
                      )}
                    </button>
                  </div>
                ))
              )}

              {!fetching && filteredUsers.length === 0 && (
                <div
                  style={{
                    padding: "24px",
                    borderRadius: "14px",
                    border: "1px dashed #cbd5e1",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  No{" "}
                  {targetRole === "SUPERVISOR"
                    ? "supervisor"
                    : "employee"}{" "}
                  found for this scope.
                </div>
              )}

              <button
                type="button"
                onClick={() => handleAssign(null)}
                disabled={loading}
                style={{
                  marginTop: "12px",
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1.5px dashed #ef4444",
                  backgroundColor: "#fef2f2",
                  color: "#dc2626",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {loading && assigningUserId === null ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <>
                    <UserX size={16} />
                    <span>
                      Remove{" "}
                      {targetRole === "SUPERVISOR"
                        ? "Supervisor"
                        : "Employee"}{" "}
                      Assignment
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}   