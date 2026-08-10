"use client";

import React, { useState } from "react";
import { AreaBeatApi } from "@lib/apiClient";
import { X, Upload, Loader2, AlertCircle } from "lucide-react";

interface EditBeatModalProps {
    beat: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditBeatModal({ beat, onClose, onSuccess }: EditBeatModalProps) {
    const [beatName, setBeatName] = useState(beat.beatName);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.toLowerCase().endsWith(".kml")) {
                setError("Only .kml files are allowed");
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData();
        formData.append("beatName", beatName);
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

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
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
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, fontSize: "0.875rem" }}>Replace KML File (Optional)</label>
                        <div
                            style={{ border: "2px dashed #e5e7eb", borderRadius: "8px", padding: "16px", textAlign: "center", backgroundColor: "#f9fafb", cursor: "pointer" }}
                            onClick={() => document.getElementById("edit-kml-upload")?.click()}
                        >
                            <Upload size={24} style={{ margin: "0 auto 8px", color: "#6b7280" }} />
                            <p style={{ margin: 0, fontSize: "0.75rem", color: "#4b5563" }}>
                                {file ? file.name : "Click to replace KML"}
                            </p>
                            <input
                                id="edit-kml-upload"
                                type="file"
                                accept=".kml"
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
        </div>
    );
}
