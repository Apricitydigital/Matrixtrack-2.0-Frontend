"use client";

import React from "react";
import { X, FileText, MapPin } from "lucide-react";

interface KMLDataViewerProps {
    beat: any;
    onClose: () => void;
}

export default function KMLDataViewer({ beat, onClose }: KMLDataViewerProps) {
    const [activeTab, setActiveTab] = React.useState<"properties" | "raw">("properties");
    const features = beat.geometry?.features || [];

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1001,
            display: "flex", justifyContent: "center", alignItems: "center",
            backdropFilter: "blur(2px)"
        }}>
            <div style={{
                width: "90%", maxWidth: "800px", height: "80vh",
                backgroundColor: "white", borderRadius: "16px", overflow: "hidden",
                display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}>
                <div style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid #f3f4f6",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#f9fafb"
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#111827" }}>
                            KML Data Center
                        </h3>
                        <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>
                            Inspecting {beat.beatName}
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <div style={{ display: "flex", backgroundColor: "#fff", padding: "4px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                            <button
                                onClick={() => setActiveTab("properties")}
                                style={{
                                    padding: "6px 12px", borderRadius: "6px", border: "none", fontSize: "0.75rem", fontWeight: activeTab === "properties" ? 700 : 500,
                                    backgroundColor: activeTab === "properties" ? "#eff6ff" : "transparent",
                                    color: activeTab === "properties" ? "#2563eb" : "#64748b",
                                    cursor: "pointer"
                                }}
                            >
                                Properties
                            </button>
                            {beat.rawKml && (
                                <button
                                    onClick={() => setActiveTab("raw")}
                                    style={{
                                        padding: "6px 12px", borderRadius: "6px", border: "none", fontSize: "0.75rem", fontWeight: activeTab === "raw" ? 700 : 500,
                                        backgroundColor: activeTab === "raw" ? "#eff6ff" : "transparent",
                                        color: activeTab === "raw" ? "#2563eb" : "#64748b",
                                        cursor: "pointer"
                                    }}
                                >
                                    Raw KML
                                </button>
                            )}
                        </div>
                        <button onClick={onClose} style={{ padding: "8px", borderRadius: "50%", border: "none", backgroundColor: "#fff", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
                    {activeTab === "properties" ? (
                        features.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                                <FileText size={48} style={{ margin: "0 auto 16px", opacity: 0.5 }} />
                                <p>No feature metadata found in this KML file.</p>
                            </div>
                        ) : (
                            <div style={{ display: "grid", gap: "16px" }}>
                                {features.map((feature: any, idx: number) => (
                                    <div key={idx} style={{
                                        padding: "16px",
                                        borderRadius: "12px",
                                        border: "1px solid #e5e7eb",
                                        backgroundColor: "#fff"
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                                            <div style={{
                                                padding: "8px",
                                                borderRadius: "8px",
                                                backgroundColor: "#eff6ff",
                                                color: "#2563eb"
                                            }}>
                                                <MapPin size={18} />
                                            </div>
                                            <strong style={{ fontSize: "1rem", color: "#111827" }}>
                                                {feature.properties?.name || `Feature #${idx + 1}`}
                                            </strong>
                                            <span style={{
                                                marginLeft: "auto",
                                                fontSize: "0.75rem",
                                                padding: "2px 8px",
                                                borderRadius: "9999px",
                                                backgroundColor: "#f3f4f6",
                                                color: "#4b5563"
                                            }}>
                                                {feature.geometry?.type}
                                            </span>
                                        </div>

                                        <div style={{ display: "grid", gap: "8px" }}>
                                            {Object.entries(feature.properties || {}).map(([key, value]) => {
                                                if (key === "name" || key === "styleUrl") return null;
                                                return (
                                                    <div key={key} style={{ display: "flex", fontSize: "0.875rem" }}>
                                                        <span style={{ color: "#6b7280", width: "140px", flexShrink: 0 }}>{key}:</span>
                                                        <span style={{ color: "#374151", wordBreak: "break-all" }}>{String(value)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <div style={{
                            backgroundColor: "#1e293b",
                            color: "#94a3b8",
                            padding: "24px",
                            borderRadius: "12px",
                            fontFamily: "monospace",
                            fontSize: "0.875rem",
                            whiteSpace: "pre-wrap",
                            lineHeight: "1.6"
                        }}>
                            {beat.rawKml || "No raw KML data available for this beat."}
                        </div>
                    )}
                </div>

                <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", backgroundColor: "#f9fafb", textAlign: "right" }}>
                    <button onClick={onClose} className="btn btn-secondary" style={{ padding: "8px 24px", borderRadius: "8px" }}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
