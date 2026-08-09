"use client";

import React, { useState, useEffect } from "react";
import { GeoApi, AreaBeatApi } from "@lib/apiClient";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface BeatFormProps {
    onSuccess: () => void;
    geoVersion?: number;
}

export default function BeatForm({ onSuccess, geoVersion }: BeatFormProps) {
    const [zones, setZones] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);

    useEffect(() => {
        if (selectedWard && geoVersion) {
            loadAreas(selectedWard);
        }
    }, [geoVersion]);

    const [selectedZone, setSelectedZone] = useState("");
    const [selectedWard, setSelectedWard] = useState("");
    const [selectedArea, setSelectedArea] = useState("");
    const [beatName, setBeatName] = useState("");
    const [file, setFile] = useState<File | null>(null);

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

    const loadAreas = async (wardId: string) => {
        try {
            const res = await GeoApi.list("AREA");
            setAreas(res.nodes.filter((n: any) => n.parentId === wardId) || []);
        } catch (err) {
            console.error("Failed to load areas", err);
        }
    };

    const handleZoneChange = (id: string) => {
        setSelectedZone(id);
        setSelectedWard("");
        setSelectedArea("");
        setWards([]);
        setAreas([]);
        if (id) loadWards(id);
    };

    const handleWardChange = (id: string) => {
        setSelectedWard(id);
        setSelectedArea("");
        setAreas([]);
        if (id) loadAreas(id);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.toLowerCase().endsWith(".kml")) {
                setStatus({ type: "error", message: "Only .kml files are allowed" });
                setFile(null);
                return;
            }
            if (selectedFile.size > 5 * 1024 * 1024) {
                setStatus({ type: "error", message: "File size exceeds 5MB limit" });
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setStatus(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedZone || !selectedWard || !selectedArea || !beatName) {
            setStatus({ type: "error", message: "Please fill all required fields" });
            return;
        }

        setLoading(true);
        setStatus(null);

        const formData = new FormData();
        formData.append("zoneId", selectedZone);
        formData.append("wardId", selectedWard);
        formData.append("areaId", selectedArea);
        formData.append("beatName", beatName);
        if (file) {
            formData.append("kmlFile", file);
        }

        try {
            await AreaBeatApi.create(formData);
            setStatus({ type: "success", message: "Beat created successfully" });
            setBeatName("");
            setFile(null);
            // Keep zone/ward/area selection or reset? Resetting is safer.
            onSuccess();
        } catch (err: any) {
            setStatus({ type: "error", message: err.message || "Failed to create beat" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ padding: "24px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginBottom: "20px", fontSize: "1.25rem", fontWeight: 700, color: "#1f2937" }}>
                Add New Beat
            </h3>

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
                            onChange={(e) => handleWardChange(e.target.value)}
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div className="form-group">
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Select Area *</label>
                        <select
                            className="input"
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                            required
                            disabled={!selectedWard}
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                        >
                            <option value="">Choose Area</option>
                            {areas.map((a) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Beat Name *</label>
                        <input
                            type="text"
                            className="input"
                            value={beatName}
                            onChange={(e) => setBeatName(e.target.value)}
                            placeholder="Enter Beat Name"
                            required
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Upload KML File</label>
                    <div
                        style={{
                            border: "2px dashed #e5e7eb",
                            borderRadius: "12px",
                            padding: "20px",
                            textAlign: "center",
                            backgroundColor: "#f9fafb",
                            cursor: "pointer",
                            transition: "border-color 0.2s"
                        }}
                        onClick={() => document.getElementById("kml-upload")?.click()}
                    >
                        <Upload size={32} style={{ margin: "0 auto 12px", color: "#6b7280" }} />
                        <p style={{ margin: 0, fontSize: "0.875rem", color: "#4b5563" }}>
                            {file ? file.name : "Click to upload or drag and drop"}
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#9ca3af" }}>
                            Only .kml files allowed (Max 5MB)
                        </p>
                        <input
                            id="kml-upload"
                            type="file"
                            accept=".kml"
                            onChange={handleFileChange}
                            style={{ display: "none" }}
                        />
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
                    className="btn btn-primary"
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
                        backgroundColor: "#2563eb",
                        color: "white",
                        border: "none",
                        cursor: loading ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)"
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Processing...
                        </>
                    ) : (
                        "Create Beat"
                    )}
                </button>
            </form>
        </div>
    );
}
