"use client";

import React, { useState, useEffect } from "react";
import { GeoApi } from "@lib/apiClient";
import { Plus, Loader2, CheckCircle2, AlertCircle, MapPin } from "lucide-react";

interface AreaFormProps {
    onSuccess: () => void;
}

export default function AreaForm({ onSuccess }: AreaFormProps) {
    const [zones, setZones] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);

    const [selectedZone, setSelectedZone] = useState("");
    const [selectedWard, setSelectedWard] = useState("");
    const [areaName, setAreaName] = useState("");
    const [areaType, setAreaType] = useState("RESIDENTIAL");

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        loadZones();
    }, []);

    const loadZones = async () => {
        try {
            const res = await GeoApi.list("ZONE");
            setZones(res.nodes || []);
        } catch (err) {
            console.error("Failed to load zones", err);
        }
    };

    const loadWards = async (zoneId: string) => {
        try {
            const res = await GeoApi.list("WARD");
            setWards(res.nodes.filter((n: any) => n.parentId === zoneId) || []);
        } catch (err) {
            console.error("Failed to load wards", err);
        }
    };

    const handleZoneChange = (id: string) => {
        setSelectedZone(id);
        setSelectedWard("");
        setWards([]);
        if (id) loadWards(id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedZone || !selectedWard || !areaName) {
            setStatus({ type: "error", message: "Please fill all required fields" });
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            await GeoApi.create({
                name: areaName,
                parentId: selectedWard,
                level: "AREA",
                areaType: areaType
            });
            setStatus({ type: "success", message: "Area created successfully!" });
            setAreaName("");
            onSuccess();
        } catch (err: any) {
            setStatus({ type: "error", message: err.message || "Failed to create area" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ padding: "24px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", background: "white" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ backgroundColor: "#eff6ff", padding: "8px", borderRadius: "8px" }}>
                    <MapPin size={24} color="#2563eb" />
                </div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#1f2937" }}>
                    Create New Area
                </h3>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div className="form-group">
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Select Zone *</label>
                        <select
                            className="input"
                            value={selectedZone}
                            onChange={(e) => handleZoneChange(e.target.value)}
                            required
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                        >
                            <option value="">Choose Zone</option>
                            {zones.map((z) => (
                                <option key={z.id} value={z.id}>{z.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Select Ward *</label>
                        <select
                            className="input"
                            value={selectedWard}
                            onChange={(e) => setSelectedWard(e.target.value)}
                            required
                            disabled={!selectedZone}
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                        >
                            <option value="">Choose Ward</option>
                            {wards.map((w) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
                    <div className="form-group">
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Area Name *</label>
                        <input
                            type="text"
                            className="input"
                            value={areaName}
                            onChange={(e) => setAreaName(e.target.value)}
                            placeholder="Enter Area Name (e.g. Model Town)"
                            required
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Area Type</label>
                        <select
                            className="input"
                            value={areaType}
                            onChange={(e) => setAreaType(e.target.value)}
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                        >
                            <option value="RESIDENTIAL">Residential</option>
                            <option value="COMMERCIAL">Commercial</option>
                            <option value="SLUM">Slum</option>
                        </select>
                    </div>
                </div>

                {status && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px",
                        borderRadius: "8px",
                        backgroundColor: status.type === "success" ? "#f0fdf4" : "#fef2f2",
                        color: status.type === "success" ? "#15803d" : "#b91c1c",
                        fontSize: "0.875rem"
                    }}>
                        {status.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {status.message}
                    </div>
                )}

                <button
                    type="submit"
                    className="btn btn-secondary"
                    disabled={loading}
                    style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "8px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        backgroundColor: "#1e293b",
                        color: "white",
                        border: "none",
                        cursor: loading ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                        transition: "all 0.2s"
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Creating Area...
                        </>
                    ) : (
                        <>
                            <Plus size={18} />
                            Create Area
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
