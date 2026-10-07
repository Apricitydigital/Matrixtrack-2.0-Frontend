"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AreaBeatApi, GeoApi } from "@lib/apiClient";
import { X, Upload, Loader2, AlertCircle } from "lucide-react";

interface EditBeatModalProps {
    beat: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditBeatModal({ beat, onClose, onSuccess }: EditBeatModalProps) {
    const [beatName, setBeatName] = useState(beat.beatName);
    const [zoneId, setZoneId] = useState(beat.zoneId || "");
    const [wardId, setWardId] = useState(beat.wardId || "");
    const [areaId, setAreaId] = useState(beat.areaId || "");
    const [zones, setZones] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [geoLoading, setGeoLoading] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        let cancelled = false;

        const loadGeo = async () => {
            try {
                setGeoLoading(true);

                const [zoneRes, wardRes, areaRes] = await Promise.all([
                    GeoApi.list("ZONE"),
                    GeoApi.list("WARD"),
                    GeoApi.list("AREA")
                ]);

                if (cancelled) return;

                setZones(zoneRes.nodes || []);
                setWards(wardRes.nodes || []);
                setAreas(areaRes.nodes || []);
            } catch (err: any) {
                if (!cancelled) {
                    setError(
                        err?.message ||
                        "Failed to load Zone, Ward and Area"
                    );
                }
            } finally {
                if (!cancelled) {
                    setGeoLoading(false);
                }
            }
        };

        void loadGeo();

        return () => {
            cancelled = true;
        };
    }, []);

    const filteredWards = wards.filter(
        (ward: any) => ward.parentId === zoneId
    );

    const filteredAreas = areas.filter(
        (area: any) => area.parentId === wardId
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const fileName = selectedFile.name.toLowerCase();

            if (
                !fileName.endsWith(".kml") &&
                !fileName.endsWith(".kmz")
            ) {
                setError("Only .kml or .kmz files are allowed");
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();        if (!zoneId) {
            setError("Please select a Zone");
            return;
        }

        if (!wardId) {
            setError("Please select a Ward");
            return;
        }

        if (!areaId) {
            setError("Please select an Area");
            return;
        }

        setLoading(true);
        setError("");

        const formData = new FormData();
        formData.append("beatName", beatName.trim());
        formData.append("zoneId", zoneId);
        formData.append("wardId", wardId);
        formData.append("areaId", areaId);
        if (file) {
            formData.append("kmlFile", file);
        }

        try {
            await AreaBeatApi.update(beat.id, formData);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to update beat");
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <div style={{
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1001,
            display: "flex", justifyContent: "center", alignItems: "center",
            backdropFilter: "blur(2px)"
        }}>
            <div style={{
                width: "90%", maxWidth: "500px",
                backgroundColor: "white", borderRadius: "12px", overflow: "hidden",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Edit Beat</h3>
                    <button onClick={onClose} style={{ border: "none", backgroundColor: "transparent", cursor: "pointer" }}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: "24px", display: "grid", gap: "20px" }}>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Beat Name</label>
                        <input
                            type="text"
                            className="input"
                            value={beatName}
                            onChange={(e) => setBeatName(e.target.value)}
                            required
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Zone</label>
                        <select
                            value={zoneId}
                            onChange={(e) => {
                                setZoneId(e.target.value);
                                setWardId("");
                                setAreaId("");
                                setError("");
                            }}
                            disabled={geoLoading || loading}
                            required
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white" }}
                        >
                            <option value="">{geoLoading ? "Loading Zones..." : "Select Zone"}</option>
                            {zones.map((zone: any) => (
                                <option key={zone.id} value={zone.id}>
                                    {zone.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Ward</label>
                        <select
                            value={wardId}
                            onChange={(e) => {
                                setWardId(e.target.value);
                                setAreaId("");
                                setError("");
                            }}
                            disabled={!zoneId || geoLoading || loading}
                            required
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white" }}
                        >
                            <option value="">
                                {!zoneId ? "Select Zone first" : "Select Ward"}
                            </option>

                            {filteredWards.map((ward: any) => (
                                <option key={ward.id} value={ward.id}>
                                    {ward.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Area</label>
                        <select
                            value={areaId}
                            onChange={(e) => {
                                setAreaId(e.target.value);
                                setError("");
                            }}
                            disabled={!wardId || geoLoading || loading}
                            required
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white" }}
                        >
                            <option value="">
                                {!wardId ? "Select Ward first" : "Select Area"}
                            </option>

                            {filteredAreas.map((area: any) => (
                                <option key={area.id} value={area.id}>
                                    {area.name}
                                </option>
                            ))}
                        </select>
                    </div>


                    <div>
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Replace KML / KMZ File (Optional)</label>
                        <div
                            style={{ border: "2px dashed #e5e7eb", borderRadius: "8px", padding: "16px", textAlign: "center", backgroundColor: "#f9fafb", cursor: "pointer" }}
                            onClick={() => document.getElementById("edit-kml-upload")?.click()}
                        >
                            <Upload size={24} style={{ margin: "0 auto 8px", color: "#6b7280" }} />
                            <p style={{ margin: 0, fontSize: "0.75rem", color: "#4b5563" }}>
                                {file ? file.name : "Click to replace KML / KMZ"}
                            </p>
                            <input
                                id="edit-kml-upload"
                                type="file"
                                accept=".kml,.kmz"
                                onChange={handleFileChange}
                                style={{ display: "none" }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px", borderRadius: "6px", backgroundColor: "#fef2f2", color: "#b91c1c", fontSize: "0.75rem" }}>
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1, padding: "10px", borderRadius: "8px" }}>Cancel</button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ flex: 1, padding: "10px", borderRadius: "8px", backgroundColor: "#2563eb", color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer", fontWeight: 600 }}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
