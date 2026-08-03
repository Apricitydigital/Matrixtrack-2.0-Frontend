"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RoleGuard } from "@components/Guards";
import { AreaBeatApi } from "@lib/apiClient";
import BeatTable from "../components/BeatTable";
import AssignBeatModal from "../components/AssignBeatModal";
import KMLDataViewer from "../components/KMLDataViewer";
import dynamic from "next/dynamic";
import type { BeatMapViewProps } from "../components/BeatMapView";
import { ArrowLeftRight, Users, MapPinned } from "lucide-react";

const BeatMapView = dynamic<BeatMapViewProps>(() => import("../components/BeatMapView"), { ssr: false });

export default function EmployeeAssignmentsPage() {
  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingBeat, setViewingBeat] = useState<any | null>(null);
  const [assigningBeat, setAssigningBeat] = useState<any | null>(null);
  const [inspectingBeat, setInspectingBeat] = useState<any | null>(null);

  const loadBeats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await AreaBeatApi.list();
      setBeats((res.beats || []).filter((beat: any) => beat.assignedToId));
    } catch (err) {
      console.error("Failed to load beats", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBeats();
  }, [loadBeats]);

  const totalSupervisors = new Set(beats.map((beat: any) => beat.assignedToId).filter(Boolean)).size;
  const totalEmployeeSegments = beats.reduce((sum: number, beat: any) => sum + (beat.segments?.filter((segment: any) => segment.assignedToId && segment.assignedToId !== beat.assignedToId).length || 0), 0);

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "SUPERVISOR"]}>
      <div className="page" style={{ padding: "32px 40px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", marginBottom: "28px" }}>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "8px" }}>
              <Link href="/city/areas" style={{ color: "#64748b", textDecoration: "none" }}>Area & Beat Management</Link> / <span style={{ color: "#0f172a", fontWeight: 600 }}>Employee Deployment</span>
            </div>
            <h1 style={{ margin: 0, fontSize: "1.875rem", fontWeight: 800, color: "#0f172a" }}>Employee Deployment</h1>
            <p style={{ margin: "8px 0 0", color: "#64748b" }}>Supervisor beat owner alag rahega; employee sub-beat deployment yahan se manage hoga.</p>
          </div>
          <Link href="/city/areas" style={{ textDecoration: "none", backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 18px", color: "#0f172a", fontWeight: 700 }}>
            Back to Supervisors
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px", marginBottom: "28px" }}>
          {[
            { label: "Supervisor Beats", value: beats.length, icon: MapPinned, color: "#2563eb", bg: "#eff6ff" },
            { label: "Supervisors", value: totalSupervisors, icon: ArrowLeftRight, color: "#7c3aed", bg: "#f5f3ff" },
            { label: "Employee Deployments", value: totalEmployeeSegments, icon: Users, color: "#059669", bg: "#ecfdf5" },
          ].map((card) => (
            <div key={card.label} style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: card.bg, color: card.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <card.icon size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>{card.label}</div>
                <div style={{ fontSize: "1.4rem", color: "#0f172a", fontWeight: 900 }}>{card.value}</div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "20px", padding: "48px", textAlign: "center", color: "#64748b", fontWeight: 600 }}>Loading employee deployment page...</div>
        ) : (
          <BeatTable
            beats={beats}
            onRefresh={loadBeats}
            onView={setViewingBeat}
            onEdit={() => undefined}
            onViewData={setInspectingBeat}
            onAssign={setAssigningBeat}
            assignmentActionLabel="Deploy Employees"
            isQC={true}
          />
        )}

        {viewingBeat && (
          <BeatMapView
            beat={viewingBeat}
            assignmentMode="EMPLOYEE"
            onClose={() => setViewingBeat(null)}
            onRefresh={loadBeats}
          />
        )}

        {assigningBeat && (
          <AssignBeatModal
            beat={assigningBeat}
            mode="EMPLOYEE"
            onClose={() => setAssigningBeat(null)}
            onSuccess={() => {
              setAssigningBeat(null);
              loadBeats();
            }}
          />
        )}

        {inspectingBeat && (
          <KMLDataViewer beat={inspectingBeat} onClose={() => setInspectingBeat(null)} />
        )}
      </div>
    </RoleGuard>
  );
}
