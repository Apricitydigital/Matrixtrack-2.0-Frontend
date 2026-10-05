'use client';

import React, { useCallback, useEffect, useState } from "react";
import { Protected, ModuleGuard } from "@components/Guards";
import { ModuleRecordsApi, TaskforceApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import SubmittedReportsTab from "../../qc-shared/SubmittedReportsTab";
import GvpReviewModal from "./GvpReviewModal";
import GvpRequestsTab from "./GvpRequestsTab";
import GvpRegistryTab from "./GvpRegistryTab";

type GvpTab = "dashboard" | "submitted_reports" | "gvps" | "requests";

type GvpStats = {
  pending: number;
  approved: number;
  rejected: number;
  actionRequired: number;
  actionTaken: number;
  total: number;
};

const EMPTY_STATS: GvpStats = { pending: 0, approved: 0, rejected: 0, actionRequired: 0, actionTaken: 0, total: 0 };

/*
 * GVP (CTU / GVP Transformation) management, same layout as Nala:
 * dashboard, inspection reports, registered GVPs and the SI request queue
 * (new GVPs + elimination claims).
 */
export default function GvpModulePage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<GvpTab>("dashboard");
  const [points, setPoints] = useState<any[]>([]);
  const [stats, setStats] = useState<GvpStats>(EMPTY_STATS);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [reviewingRecord, setReviewingRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const roleValues = [user?.role, ...(user?.roles || [])]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());

  // GVP registration / elimination review and daroga assignment are SI-only on the backend.
  const isQc = roleValues.includes("QC");
  const isAdmin = roleValues.includes("CITY_ADMIN") || roleValues.includes("HMS_SUPER_ADMIN");

  const loadPoints = useCallback(async () => {
    try {
      const res = await TaskforceApi.workspaceAssets();
      setPoints(res.feederPoints || []);
    } catch (error) {
      console.error("Failed to load GVPs", error);
      setPoints([]);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      // DAILY_REPORTS counts inspection reports only; stats also cover registrations.
      const res: any = await ModuleRecordsApi.getRecords("TASKFORCE", { page: 1, limit: 1, tab: "DAILY_REPORTS" });
      const s = res?.stats || {};
      setStats({
        pending: Number(s.pending) || 0,
        approved: Number(s.approved) || 0,
        rejected: Number(s.rejected) || 0,
        actionRequired: Number(s.actionRequired) || 0,
        actionTaken: Number(s.actionTaken) || 0,
        total: Number(res?.meta?.total) || 0
      });
    } catch (error) {
      console.error("Failed to load GVP report stats", error);
    }
  }, []);

  const loadRequestCount = useCallback(async () => {
    if (!isQc) return;
    try {
      const [registrations, eliminations] = await Promise.all([
        TaskforceApi.pendingFeederPoints(),
        TaskforceApi.pendingEliminations()
      ]);
      setPendingRequests((registrations.feederPoints?.length || 0) + (eliminations.feederPoints?.length || 0));
    } catch (error) {
      console.error("Failed to load GVP requests", error);
    }
  }, [isQc]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadPoints(), loadStats(), loadRequestCount()]);
  }, [loadPoints, loadStats, loadRequestCount]);

  useEffect(() => {
    setLoading(true);
    refreshAll().finally(() => setLoading(false));
  }, [refreshAll]);

  const active = points.filter((point) => !point.eliminatedAt);
  const eliminated = points.length - active.length;
  const eliminationPending = points.filter((point) => point.eliminationStatus === "PENDING_QC").length;
  const assigned = active.filter((point) => (point.assignedEmployeeIds || []).length > 0).length;

  return (
    <Protected>
      <ModuleGuard module="TASKFORCE" roles={["QC", "CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER"]}>
        <div className="page" style={{ padding: "24px 28px", minHeight: "100vh" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
            <div>
              <h1 style={{ margin: 0, color: "#0f172a", fontSize: 26, fontWeight: 900 }}>GVP Management</h1>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13, fontWeight: 500 }}>
                Garbage vulnerable points: registrations, daily inspections, eliminations and assignments
                {user?.cityName ? ` for ${user.cityName}` : ""}.
              </p>
            </div>

            <div style={{ display: "flex", gap: 5, background: "#f1f5f9", padding: 4, borderRadius: 14, border: "1px solid #e2e8f0", flexWrap: "wrap" }}>
              <TabButton label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
              <TabButton
                label="Inspection Reports"
                active={activeTab === "submitted_reports"}
                badge={stats.pending}
                onClick={() => setActiveTab("submitted_reports")}
              />
              <TabButton label={`Registered GVPs (${points.length})`} active={activeTab === "gvps"} onClick={() => setActiveTab("gvps")} />
              {isQc && (
                <TabButton
                  label="GVP Requests"
                  active={activeTab === "requests"}
                  badge={pendingRequests}
                  onClick={() => setActiveTab("requests")}
                />
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontWeight: 700, background: "#ffffff", borderRadius: 18, border: "1px solid #e2e8f0" }}>
              Loading GVP module...
            </div>
          ) : activeTab === "submitted_reports" ? (
            <SubmittedReportsTab moduleKey="TASKFORCE" assetLabel="GVP" onViewReport={(record) => setReviewingRecord(record)} />
          ) : activeTab === "gvps" ? (
            <GvpRegistryTab points={points} canAssign={isQc} canDelete={isAdmin} onRefresh={loadPoints} />
          ) : activeTab === "requests" && isQc ? (
            <GvpRequestsTab onChanged={refreshAll} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" style={{ marginBottom: 16 }}>
                <StatCard label="REGISTERED GVPS" value={points.length} sub="Approved points" color="#2563eb" />
                <StatCard label="ACTIVE GVPS" value={active.length} sub={`${assigned} assigned to a daroga`} color="#0891b2" />
                <StatCard label="ELIMINATED" value={eliminated} sub="Verified by SI" color="#16a34a" />
                <StatCard label="ELIMINATION PENDING" value={eliminationPending} sub="Awaiting SI verification" color="#d97706" />
                <StatCard label="SUBMITTED REPORTS" value={stats.total} sub="Inspection reports" color="#6366f1" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard label="PENDING REVIEW" value={stats.pending} sub="Awaiting SI" color="#f59e0b" />
                <StatCard label="APPROVED" value={stats.approved} sub="SI approved" color="#16a34a" />
                <StatCard label="REJECTED" value={stats.rejected} sub="SI rejected" color="#e11d48" />
                <StatCard label="ACTION REQUIRED" value={stats.actionRequired} sub="With IEC member" color="#f97316" />
                <StatCard label="ACTION TAKEN" value={stats.actionTaken} sub="Awaiting ULB closure" color="#0d9488" />
              </div>
            </>
          )}
        </div>

        {reviewingRecord && (
          <GvpReviewModal
            record={reviewingRecord}
            onClose={() => setReviewingRecord(null)}
            onRefresh={() => {
              setReviewingRecord(null);
              loadStats();
            }}
          />
        )}
      </ModuleGuard>
    </Protected>
  );
}

function TabButton({ label, active, badge, onClick }: { label: string; active: boolean; badge?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 10,
        border: "none",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
        background: active ? "#ffffff" : "transparent",
        color: active ? "#2563eb" : "#64748b",
        boxShadow: active ? "0 1px 2px rgba(15,23,42,0.08)" : "none"
      }}
    >
      {label}
      {badge ? (
        <span style={{ background: "#ef4444", color: "white", borderRadius: 999, padding: "1px 7px", fontSize: 10, fontWeight: 900 }}>{badge}</span>
      ) : null}
    </button>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${color}12, #ffffff)`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 14,
        padding: "14px 16px",
        border: "1px solid #e2e8f0"
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748b" }}>{sub}</div>
    </div>
  );
}
