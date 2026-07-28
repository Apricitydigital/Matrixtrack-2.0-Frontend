'use client';

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface BeatMapViewerModalProps {
    beatName: string;
    zoneName?: string;
    wardName?: string;
    areaName?: string;
    kmlData?: KMLData | null;
    onClose: () => void;
}

// Dynamic imports for Leaflet components
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

interface KMLData {
    name: string;
    coordinates: [number, number][];
}

export default function BeatMapViewerModal({
    beatName,
    zoneName,
    wardName,
    areaName,
    kmlData,
    onClose
}: BeatMapViewerModalProps) {
    const calculateCenter = (coords: [number, number][]): [number, number] => {
        if (coords.length === 0) return [0, 0];
        const sum = coords.reduce((acc, coord) => [acc[0] + coord[0], acc[1] + coord[1]], [0, 0]);
        return [sum[0] / coords.length, sum[1] / coords.length];
    };

    const hasValidKMLData = kmlData && kmlData.coordinates && kmlData.coordinates.length > 0;

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: "20px"
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    maxWidth: "900px",
                    width: "100%",
                    maxHeight: "90vh",
                    overflow: "hidden",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "20px 24px",
                        borderBottom: "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start"
                    }}
                >
                    <div>
                        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" }}>
                            Beat Map Preview
                        </h2>
                        <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7280" }}>
                            {zoneName && <span><strong>Zone:</strong> {zoneName}</span>}
                            {wardName && <span style={{ marginLeft: "12px" }}><strong>Ward:</strong> {wardName}</span>}
                            {areaName && <span style={{ marginLeft: "12px" }}><strong>Area:</strong> {areaName}</span>}
                            <div style={{ marginTop: "4px" }}>
                                <strong>Beat:</strong> {beatName}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#6b7280",
                            transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f3f4f6";
                            e.currentTarget.style.color = "#111827";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "#6b7280";
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Map Content */}
                <div style={{ height: "500px", position: "relative" }}>
                    {!hasValidKMLData && (
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#fef2f2",
                                padding: "20px"
                            }}
                        >
                            <div style={{ textAlign: "center", maxWidth: "400px" }}>
                                <div style={{ fontSize: "48px", marginBottom: "12px" }}>🗺️</div>
                                <h3 style={{ color: "#dc2626", marginBottom: "8px" }}>No Map Data Available</h3>
                                <p style={{ color: "#991b1b", fontSize: "14px" }}>
                                    This beat does not have KML boundary data attached.
                                </p>
                            </div>
                        </div>
                    )}

                    {hasValidKMLData && (
                        <MapContainer
                            center={calculateCenter(kmlData!.coordinates)}
                            zoom={15}
                            style={{ height: "100%", width: "100%" }}
                        >
                            <TileLayer
                                attribution='&copy; CARTO'
                                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            />
                            {/* Outer glow effect */}
                            <Polyline
                                positions={kmlData!.coordinates as any}
                                pathOptions={{
                                    color: '#8b5cf6',
                                    weight: 16,
                                    opacity: 0.2,
                                }}
                            />
                            {/* Main line */}
                            <Polyline
                                positions={kmlData!.coordinates as any}
                                pathOptions={{
                                    color: '#8b5cf6',
                                    weight: 6,
                                    opacity: 1,
                                    lineCap: 'round',
                                    lineJoin: 'round'
                                }}
                            >
                                <Popup>
                                    <div style={{ padding: "4px" }}>
                                        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>
                                            {beatName}
                                        </div>
                                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                            {kmlData!.coordinates.length} coordinate points
                                        </div>
                                    </div>
                                </Popup>
                            </Polyline>
                        </MapContainer>
                    )}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: "16px 24px",
                        borderTop: "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "flex-end"
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                            color: "white",
                            border: "none",
                            padding: "10px 24px",
                            borderRadius: "8px",
                            fontWeight: 600,
                            fontSize: "14px",
                            cursor: "pointer",
                            transition: "transform 0.2s, box-shadow 0.2s"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(139, 92, 246, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>

            <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
