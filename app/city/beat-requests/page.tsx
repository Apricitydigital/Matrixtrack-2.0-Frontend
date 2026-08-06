"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AreaBeatApi } from "@lib/apiClient";
import { RoleGuard } from "@components/Guards";
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  User,
  ArrowLeft,
  RefreshCw,
  Eye,
  X,
  AlertTriangle,
  Navigation,
  History,
  Filter
} from "lucide-react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamic import Leaflet components for SSR safety
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// Helper component to auto-fit map bounds
function FitMapBounds({ coords }: { coords: [number, number][] }) {
  const { useMap } = require("react-leaflet");
  const map = useMap();

  useEffect(() => {
    if (!map || !coords || coords.length === 0) return;
    const L = require("leaflet");
    map.invalidateSize();
    const timer = setTimeout(() => {
      const bounds = L.latLngBounds(coords);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], animate: true });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [coords, map]);

  return null;
}

// Controller for focusing on a clicked point
function MapController({ targetCoord }: { targetCoord: [number, number] | null }) {
  const { useMap } = require("react-leaflet");
  const map = useMap();

  useEffect(() => {
    if (targetCoord && map) {
      map.setView(targetCoord, 18, { animate: true });
    }
  }, [targetCoord, map]);

  return null;
}

// Custom DivIcon marker generator with explicit point numbers (1, 2, 3, 4...)
const getCustomMarkerIcon = (index: number, total: number, isSelected: boolean = false) => {
  if (typeof window === "undefined") return undefined;
  try {
    const L = require("leaflet");
    const isStart = index === 0;
    const isEnd = index === total - 1;
    const color = isStart ? "#16a34a" : isEnd ? "#dc2626" : "#2563eb";
    const bg = isSelected ? color : (isStart ? "#f0fdf4" : isEnd ? "#fef2f2" : "#eff6ff");
    const textColor = isSelected ? "white" : color;

    return L.divIcon({
      html: `
        <div style="
          position: relative;
          width: 30px;
          height: 30px;
          background: ${bg};
          border: 3px solid ${color};
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: Inter, system-ui, sans-serif;
          font-weight: 900;
          font-size: 12px;
          color: ${textColor};
          transition: transform 0.2s;
        ">
          ${index + 1}
          ${isStart ? '<span style="position:absolute; bottom:-18px; left:50%; transform:translateX(-50%); background:#16a34a; color:white; font-size:9px; font-weight:800; padding:1px 5px; border-radius:4px; white-space:nowrap; box-shadow:0 2px 4px rgba(0,0,0,0.2);">START</span>' : ''}
          ${isEnd && !isStart ? '<span style="position:absolute; top:-18px; left:50%; transform:translateX(-50%); background:#dc2626; color:white; font-size:9px; font-weight:800; padding:1px 5px; border-radius:4px; white-space:nowrap; box-shadow:0 2px 4px rgba(0,0,0,0.2);">END</span>' : ''}
        </div>
      `,
      className: "",
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  } catch {
    return undefined;
  }
};

// Coordinate Extractor Helper
const extractLineCoords = (beat: any): [number, number][] => {
  const coords: [number, number][] = [];

  if (beat.points && Array.isArray(beat.points) && beat.points.length > 0) {
    beat.points.forEach((p: any) => {
      if (p.latitude && p.longitude) {
        coords.push([Number(p.latitude), Number(p.longitude)]);
      }
    });
  }

  if (coords.length === 0 && beat.geometry) {
    let geom = beat.geometry;
    if (typeof geom === "string") {
      try {
        geom = JSON.parse(geom);
      } catch {}
    }
    const extractFromGeo = (g: any) => {
      if (!g) return;
      if (g.type === "FeatureCollection") {
        g.features?.forEach((f: any) => extractFromGeo(f.geometry));
      } else if (g.type === "Feature") {
        extractFromGeo(g.geometry);
      } else if (g.type === "LineString") {
        g.coordinates?.forEach((c: any) => coords.push([c[1], c[0]]));
      } else if (g.type === "MultiLineString") {
        g.coordinates?.forEach((line: any) => {
          line.forEach((c: any) => coords.push([c[1], c[0]]));
        });
      } else if (g.type === "Point") {
        coords.push([g.coordinates[1], g.coordinates[0]]);
      }
    };
    extractFromGeo(geom);
  }

  if (coords.length === 0 && beat.segments && Array.isArray(beat.segments)) {
    beat.segments.forEach((seg: any) => {
      let segGeom = seg.geometry;
      if (typeof segGeom === "string") {
        try {
          segGeom = JSON.parse(segGeom);
        } catch {}
      }
      if (segGeom && segGeom.type === "LineString") {
        segGeom.coordinates?.forEach((c: any) => coords.push([c[1], c[0]]));
      }
    });
  }

  return coords;
};

export default function BeatRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [counts, setCounts] = useState<{ pending: number; approved: number; rejected: number; all: number }>({
    pending: 0,
    approved: 0,
    rejected: 0,
    all: 0
  });
  const [activeTab, setActiveTab] = useState<"PENDING_QC" | "APPROVED" | "REJECTED" | "ALL">("PENDING_QC");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingMapBeat, setViewingMapBeat] = useState<any | null>(null);
  const [mapType, setMapType] = useState<"streets" | "satellite">("streets");
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [rejectingBeat, setRejectingBeat] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await AreaBeatApi.listPendingRequests(activeTab);
      setRequests(res.pendingBeats || []);
      if (res.counts) {
        setCounts(res.counts);
      }
    } catch (err) {
      console.error("Failed to load beat requests", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (beatId: string, beatName: string) => {
    if (processingId) return;
    try {
      setProcessingId(beatId);
      await AreaBeatApi.reviewBeatRequest(beatId, "APPROVE");
      setActionSuccessMessage(`Beat "${beatName}" approved successfully!`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      await loadRequests();
    } catch (err: any) {
      alert(err.message || "Failed to approve beat request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingBeat || processingId) return;
    try {
      setProcessingId(rejectingBeat.id);
      await AreaBeatApi.reviewBeatRequest(
        rejectingBeat.id,
        "REJECT",
        rejectionReason || "Rejected by administrator"
      );
      setActionSuccessMessage(`Beat "${rejectingBeat.beatName}" rejected.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setRejectingBeat(null);
      setRejectionReason("");
      await loadRequests();
    } catch (err: any) {
      alert(err.message || "Failed to reject beat request");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.beatName?.toLowerCase().includes(q) ||
      r.beatCode?.toLowerCase().includes(q) ||
      r.zoneName?.toLowerCase().includes(q) ||
      r.wardName?.toLowerCase().includes(q) ||
      r.areaName?.toLowerCase().includes(q) ||
      r.requestedBy?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "QC", "COMMISSIONER"]}>
      <div
        className="page"
        style={{
          padding: "32px 40px",
          backgroundColor: "#f8fafc",
          minHeight: "100vh",
          fontFamily: "'Inter', sans-serif"
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              marginBottom: "24px",
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              justifyContent: "space-between",
              alignItems: "flex-end"
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px"
                }}
              >
                <Link
                  href="/city/areas"
                  style={{
                    color: "#2563eb",
                    textDecoration: "none",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <ArrowLeft size={16} /> Area & Beat Management
                </Link>
                <span>/</span>
                <span style={{ color: "#1e293b", fontWeight: 500 }}>
                  Beat Requests & History
                </span>
              </div>
              <h1
                style={{
                  fontSize: "1.875rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}
              >
                Beat Approval & History
                {counts.pending > 0 && (
                  <span
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      padding: "4px 12px",
                      borderRadius: "9999px",
                      backgroundColor: "#fef3c7",
                      color: "#d97706",
                      border: "1px solid #fde68a"
                    }}
                  >
                    {counts.pending} Pending
                  </span>
                )}
              </h1>
              <p
                style={{
                  marginTop: "8px",
                  color: "#64748b",
                  fontSize: "1rem"
                }}
              >
                Review beat registration requests and inspect past approval/rejection history.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={loadRequests}
                style={{
                  height: "44px",
                  padding: "0 16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "#475569",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {/* Status Tabs Navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "24px",
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: "12px",
              overflowX: "auto"
            }}
          >
            <button
              onClick={() => setActiveTab("PENDING_QC")}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                border: "none",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: activeTab === "PENDING_QC" ? "#2563eb" : "#f1f5f9",
                color: activeTab === "PENDING_QC" ? "white" : "#475569",
                transition: "all 0.2s"
              }}
            >
              <Clock size={16} />
              Pending Requests ({counts.pending})
            </button>

            <button
              onClick={() => setActiveTab("APPROVED")}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                border: "none",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: activeTab === "APPROVED" ? "#16a34a" : "#f1f5f9",
                color: activeTab === "APPROVED" ? "white" : "#475569",
                transition: "all 0.2s"
              }}
            >
              <CheckCircle2 size={16} />
              Approved History ({counts.approved})
            </button>

            <button
              onClick={() => setActiveTab("REJECTED")}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                border: "none",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: activeTab === "REJECTED" ? "#dc2626" : "#f1f5f9",
                color: activeTab === "REJECTED" ? "white" : "#475569",
                transition: "all 0.2s"
              }}
            >
              <XCircle size={16} />
              Rejected History ({counts.rejected})
            </button>

            <button
              onClick={() => setActiveTab("ALL")}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                border: "none",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: activeTab === "ALL" ? "#0f172a" : "#f1f5f9",
                color: activeTab === "ALL" ? "white" : "#475569",
                transition: "all 0.2s"
              }}
            >
              <History size={16} />
              All Records ({counts.all})
            </button>
          </div>

          {/* Action Success Alert Banner */}
          {actionSuccessMessage && (
            <div
              style={{
                marginBottom: "24px",
                padding: "16px 20px",
                borderRadius: "16px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontWeight: 600,
                fontSize: "0.95rem"
              }}
            >
              <CheckCircle2 size={20} color="#16a34a" />
              {actionSuccessMessage}
            </div>
          )}

          {/* Search bar */}
          <div
            style={{
              marginBottom: "24px",
              position: "relative",
              maxWidth: "480px"
            }}
          >
            <Search
              size={18}
              color="#94a3b8"
              style={{
                position: "absolute",
                left: "16px",
                top: "50%",
                transform: "translateY(-50%)"
              }}
            />
            <input
              type="text"
              placeholder="Search beat name, zone, ward or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: "48px",
                padding: "0 16px 0 48px",
                borderRadius: "14px",
                border: "1.5px solid #e2e8f0",
                fontSize: "0.925rem",
                fontWeight: 500,
                outline: "none",
                backgroundColor: "white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
              }}
            />
          </div>

          {/* Content */}
          {loading ? (
            <div
              style={{
                padding: "60px",
                textAlign: "center",
                backgroundColor: "white",
                borderRadius: "20px",
                border: "1px solid #e2e8f0"
              }}
            >
              <div
                className="animate-spin"
                style={{
                  width: "36px",
                  height: "36px",
                  border: "4px solid #f3f3f3",
                  borderTop: "4px solid #2563eb",
                  borderRadius: "50%",
                  margin: "0 auto"
                }}
              />
              <p style={{ marginTop: "16px", color: "#64748b", fontWeight: 600 }}>
                Loading beat requests...
              </p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div
              style={{
                padding: "60px 24px",
                textAlign: "center",
                backgroundColor: "white",
                borderRadius: "24px",
                border: "1px solid #e2e8f0"
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "20px",
                  backgroundColor: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px"
                }}
              >
                <History size={32} color="#94a3b8" />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                No Beat Requests Found
              </h3>
              <p style={{ marginTop: "8px", color: "#64748b", fontSize: "0.95rem" }}>
                {activeTab === "PENDING_QC"
                  ? "All beat requests have been reviewed and processed."
                  : activeTab === "APPROVED"
                  ? "No approved beat request history found."
                  : activeTab === "REJECTED"
                  ? "No rejected beat request history found."
                  : "No beat requests match the criteria."}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
                gap: "24px"
              }}
            >
              {filteredRequests.map((req) => {
                const isPending = req.status === "PENDING_QC";
                const isApproved = req.status === "APPROVED";
                const isRejected = req.status === "REJECTED";

                return (
                  <div
                    key={req.id}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "20px",
                      border: "1px solid",
                      borderColor: isApproved ? "#bbf7d0" : isRejected ? "#fecaca" : "#e2e8f0",
                      padding: "24px",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s"
                    }}
                  >
                    <div>
                      {/* Top Row */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "12px"
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              color: "#2563eb",
                              backgroundColor: "#eff6ff",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              letterSpacing: "0.05em"
                            }}
                          >
                            {req.beatCode || "BEAT"}
                          </span>
                          <h3
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: 800,
                              color: "#0f172a",
                              margin: "8px 0 0"
                            }}
                          >
                            {req.beatName}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        {isPending && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: "9999px",
                              backgroundColor: "#fef3c7",
                              color: "#b45309",
                              border: "1px solid #fde68a",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <Clock size={12} /> Pending QC
                          </span>
                        )}

                        {isApproved && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: "9999px",
                              backgroundColor: "#f0fdf4",
                              color: "#166534",
                              border: "1px solid #bbf7d0",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <CheckCircle2 size={12} /> Approved
                          </span>
                        )}

                        {isRejected && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: "9999px",
                              backgroundColor: "#fef2f2",
                              color: "#991b1b",
                              border: "1px solid #fecaca",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <XCircle size={12} /> Rejected
                          </span>
                        )}
                      </div>

                      {/* Location Badges */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          marginBottom: "16px"
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                            padding: "4px 10px",
                            borderRadius: "8px"
                          }}
                        >
                          {req.zoneName}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                            padding: "4px 10px",
                            borderRadius: "8px"
                          }}
                        >
                          {req.wardName}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                            padding: "4px 10px",
                            borderRadius: "8px"
                          }}
                        >
                          {req.areaName}
                        </span>
                      </div>

                      {/* Requester & Segments Info */}
                      <div
                        style={{
                          backgroundColor: "#f8fafc",
                          borderRadius: "14px",
                          padding: "14px",
                          marginBottom: isRejected && req.rejectionReason ? "12px" : "20px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          border: "1px solid #f1f5f9"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#334155" }}>
                          <User size={16} color="#64748b" />
                          <span>Requested By: <strong>{req.requestedBy?.name || "Field User"}</strong></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#334155" }}>
                          <MapPin size={16} color="#64748b" />
                          <span>Route Segments: <strong>{req.totalSegments || (req.segments || []).length || (req.points || []).length || "N/A"} points</strong></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "#64748b" }}>
                          <Clock size={14} color="#94a3b8" />
                          <span>Submitted on: {new Date(req.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Rejection Reason Banner if Rejected */}
                      {isRejected && req.rejectionReason && (
                        <div
                          style={{
                            padding: "12px 14px",
                            borderRadius: "12px",
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fecaca",
                            marginBottom: "20px"
                          }}
                        >
                          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#991b1b", textTransform: "uppercase" }}>
                            Rejection Reason:
                          </div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#7f1d1d", marginTop: "2px" }}>
                            {req.rejectionReason}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        paddingTop: "16px",
                        borderTop: "1px solid #f1f5f9"
                      }}
                    >
                      <button
                        onClick={() => { setSelectedPointIdx(null); setViewingMapBeat(req); }}
                        style={{
                          flex: 1,
                          height: "42px",
                          borderRadius: "10px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "white",
                          color: "#334155",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          cursor: "pointer"
                        }}
                      >
                        <Eye size={16} /> View Map
                      </button>

                      {isPending && (
                        <>
                          <button
                            onClick={() => setRejectingBeat(req)}
                            disabled={processingId === req.id}
                            style={{
                              height: "42px",
                              padding: "0 16px",
                              borderRadius: "10px",
                              border: "none",
                              backgroundColor: "#fef2f2",
                              color: "#dc2626",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: "pointer"
                            }}
                          >
                            <XCircle size={16} /> Reject
                          </button>

                          <button
                            onClick={() => handleApprove(req.id, req.beatName)}
                            disabled={processingId === req.id}
                            style={{
                              flex: 1,
                              height: "42px",
                              borderRadius: "10px",
                              border: "none",
                              backgroundColor: "#16a34a",
                              color: "white",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              cursor: "pointer",
                              boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)"
                            }}
                          >
                            {processingId === req.id ? (
                              <div className="animate-spin" style={{ width: "16px", height: "16px", border: "2px solid white", borderTop: "2px solid transparent", borderRadius: "50%" }} />
                            ) : (
                              <>
                                <CheckCircle2 size={16} /> Approve
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pro Map Preview Modal with Left Points Explorer Panel */}
        {viewingMapBeat && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(8px)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px"
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "1200px",
                height: "88vh",
                backgroundColor: "white",
                borderRadius: "24px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.2)"
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "18px 28px",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#ffffff"
                }}
              >
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <MapPin size={20} color="#2563eb" />
                    {viewingMapBeat.beatName} - Requested Route Map
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "4px 0 0" }}>
                    {[viewingMapBeat.zoneName, viewingMapBeat.wardName, viewingMapBeat.areaName].filter(Boolean).join(" | ")}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  {/* Streets vs Satellite Switcher */}
                  <div style={{ display: "flex", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <button
                      onClick={() => setMapType("streets")}
                      style={{
                        padding: "6px 14px", borderRadius: "8px", border: "none", fontSize: "0.75rem", fontWeight: 700,
                        backgroundColor: mapType === "streets" ? "white" : "transparent",
                        color: mapType === "streets" ? "#2563eb" : "#64748b",
                        boxShadow: mapType === "streets" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                        cursor: "pointer", transition: "all 0.2s"
                      }}
                    >
                      Streets
                    </button>
                    <button
                      onClick={() => setMapType("satellite")}
                      style={{
                        padding: "6px 14px", borderRadius: "8px", border: "none", fontSize: "0.75rem", fontWeight: 700,
                        backgroundColor: mapType === "satellite" ? "white" : "transparent",
                        color: mapType === "satellite" ? "#2563eb" : "#64748b",
                        boxShadow: mapType === "satellite" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                        cursor: "pointer", transition: "all 0.2s"
                      }}
                    >
                      Satellite
                    </button>
                  </div>

                  <button
                    onClick={() => setViewingMapBeat(null)}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      border: "none",
                      backgroundColor: "#fef2f2",
                      color: "#ef4444",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s"
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Main Content Body */}
              <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {(() => {
                  const lineCoords = extractLineCoords(viewingMapBeat);
                  const defaultCenter =
                    lineCoords.length > 0 ? lineCoords[0] : [20.5937, 78.9629];
                  const selectedCoord = selectedPointIdx !== null ? lineCoords[selectedPointIdx] : null;

                  return (
                    <>
                      {/* Left Points List Side Panel */}
                      <div
                        style={{
                          width: "320px",
                          backgroundColor: "#f8fafc",
                          borderRight: "1px solid #e2e8f0",
                          display: "flex",
                          flexDirection: "column",
                          overflowY: "auto",
                          padding: "16px"
                        }}
                      >
                        <div style={{ marginBottom: "16px" }}>
                          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                            Route Summary
                          </div>
                          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                            {lineCoords.length} Route Points
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
                            Click any point to focus on map
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {lineCoords.map((coord: [number, number], idx: number) => {
                            const isStart = idx === 0;
                            const isEnd = idx === lineCoords.length - 1;
                            const isSelected = selectedPointIdx === idx;
                            const badgeColor = isStart ? "#16a34a" : isEnd ? "#dc2626" : "#2563eb";
                            const badgeBg = isStart ? "#f0fdf4" : isEnd ? "#fef2f2" : "#eff6ff";

                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedPointIdx(idx)}
                                style={{
                                  padding: "12px 14px",
                                  borderRadius: "14px",
                                  backgroundColor: isSelected ? "#eff6ff" : "white",
                                  border: "1.5px solid",
                                  borderColor: isSelected ? "#2563eb" : "#e2e8f0",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                  boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.15)" : "0 1px 2px rgba(0,0,0,0.03)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between"
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                  <div
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "50%",
                                      backgroundColor: badgeBg,
                                      color: badgeColor,
                                      border: `2px solid ${badgeColor}`,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 900,
                                      fontSize: "0.8rem",
                                      flexShrink: 0
                                    }}
                                  >
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span>Point #{idx + 1}</span>
                                      {isStart && <span style={{ fontSize: "9px", backgroundColor: "#16a34a", color: "white", padding: "1px 5px", borderRadius: "4px" }}>START</span>}
                                      {isEnd && <span style={{ fontSize: "9px", backgroundColor: "#dc2626", color: "white", padding: "1px 5px", borderRadius: "4px" }}>END</span>}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                                      {coord[0].toFixed(5)}, {coord[1].toFixed(5)}
                                    </div>
                                  </div>
                                </div>

                                <Navigation size={14} color={isSelected ? "#2563eb" : "#94a3b8"} />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Map Area */}
                      <div style={{ flex: 1, position: "relative" }}>
                        <MapContainer
                          key={`${viewingMapBeat.id}-${mapType}`}
                          center={defaultCenter as [number, number]}
                          zoom={15}
                          style={{ width: "100%", height: "100%", background: "#f8fafc" }}
                        >
                          <FitMapBounds coords={lineCoords} />
                          <MapController targetCoord={selectedCoord} />

                          {mapType === "streets" ? (
                            <TileLayer
                              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                            />
                          ) : (
                            <TileLayer
                              attribution="Google Hybrid"
                              url="http://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                            />
                          )}

                          {lineCoords.length > 0 && (
                            <Polyline
                              positions={lineCoords as any}
                              pathOptions={{
                                color: "#2563eb",
                                weight: 6,
                                opacity: 0.9,
                                lineCap: "round",
                                lineJoin: "round"
                              }}
                            />
                          )}

                          {lineCoords.map((coord: [number, number], idx: number) => {
                            const isSelected = selectedPointIdx === idx;
                            const icon = getCustomMarkerIcon(idx, lineCoords.length, isSelected);
                            return (
                              <Marker
                                key={idx}
                                position={coord}
                                icon={icon}
                                eventHandlers={{
                                  click: () => setSelectedPointIdx(idx)
                                }}
                              >
                                <Popup>
                                  <div style={{ fontFamily: "Inter, sans-serif", padding: "6px 8px" }}>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#2563eb", textTransform: "uppercase" }}>
                                      {idx === 0 ? "🏁 Start Point (#1)" : idx === lineCoords.length - 1 ? `🎯 End Point (#${idx + 1})` : `Point #${idx + 1}`}
                                    </div>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", marginTop: "4px" }}>
                                      Lat: {coord[0].toFixed(6)}
                                    </div>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>
                                      Lng: {coord[1].toFixed(6)}
                                    </div>
                                  </div>
                                </Popup>
                              </Marker>
                            );
                          })}
                        </MapContainer>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Reject Reason Modal */}
        {rejectingBeat && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.5)",
              backdropFilter: "blur(4px)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px"
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "480px",
                backgroundColor: "white",
                borderRadius: "24px",
                padding: "28px",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "14px",
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Reject Beat Request
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
                    {rejectingBeat.beatName}
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                  Reason for Rejection:
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter reason for rejecting this beat request..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.9rem",
                    outline: "none",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setRejectingBeat(null)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "white",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: "#475569",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={processingId === rejectingBeat.id}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#dc2626",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: "white",
                    cursor: "pointer"
                  }}
                >
                  Confirm Rejection
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
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </RoleGuard>
  );
}
