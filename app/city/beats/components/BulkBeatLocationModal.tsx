"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AreaBeatApi, GeoApi } from "@lib/apiClient";
import { AlertCircle, Loader2, X } from "lucide-react";

interface Props {
    beatIds: string[];
    groupTitle: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BulkBeatLocationModal({
    beatIds,
    groupTitle,
    onClose,
    onSuccess
}: Props) {
    const [zones, setZones] = useState<any[]>([]);
    const [wards, setWards] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);

    const [zoneId, setZoneId] = useState("");
    const [wardId, setWardId] = useState("");
    const [areaId, setAreaId] = useState("");

    const [geoLoading, setGeoLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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

    const save = async () => {
        if (!zoneId) {
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

        try {
            setSaving(true);
            setError("");

            await AreaBeatApi.bulkUpdateLocation(
                beatIds,
                zoneId,
                wardId,
                areaId
            );

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(
                err?.message ||
                "Failed to update Beat locations"
            );
        } finally {
            setSaving(false);
        }
    };

    if (!mounted) return null;

    const fieldStyle: React.CSSProperties = {
        width: "100%",
        padding: "10px",
        borderRadius: "8px",
        border: "1px solid #d1d5db",
        backgroundColor: "white"
    };

    const labelStyle: React.CSSProperties = {
        display: "block",
        marginBottom: "8px",
        fontSize: "0.875rem",
        fontWeight: 600
    };

    return createPortal(
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(15,23,42,.55)",
                backdropFilter: "blur(2px)"
            }}
        >
            <div
                style={{
                    width: "90%",
                    maxWidth: "500px",
                    borderRadius: "14px",
                    background: "white",
                    boxShadow: "0 24px 60px rgba(15,23,42,.22)"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "18px 24px",
                        borderBottom: "1px solid #e5e7eb"
                    }}
                >
                    <div>
                        <h3
                            style={{
                                margin: 0,
                                fontSize: "1.1rem",
                                fontWeight: 800
                            }}
                        >
                            Edit Location for All Beats
                        </h3>

                        <div
                            style={{
                                marginTop: "4px",
                                fontSize: "0.75rem",
                                color: "#64748b"
                            }}
                        >
                            {groupTitle} - {beatIds.length} Beats
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer"
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div
                    style={{
                        display: "grid",
                        gap: "18px",
                        padding: "24px"
                    }}
                >
                    <div>
                        <label style={labelStyle}>Zone</label>
                        <select
                            value={zoneId}
                            disabled={geoLoading || saving}
                            style={fieldStyle}
                            onChange={(e) => {
                                setZoneId(e.target.value);
                                setWardId("");
                                setAreaId("");
                                setError("");
                            }}
                        >
                            <option value="">
                                {geoLoading ? "Loading Zones..." : "Select Zone"}
                            </option>

                            {zones.map((zone: any) => (
                                <option key={zone.id} value={zone.id}>
                                    {zone.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Ward</label>
                        <select
                            value={wardId}
                            disabled={!zoneId || geoLoading || saving}
                            style={fieldStyle}
                            onChange={(e) => {
                                setWardId(e.target.value);
                                setAreaId("");
                                setError("");
                            }}
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
                        <label style={labelStyle}>Area</label>
                        <select
                            value={areaId}
                            disabled={!wardId || geoLoading || saving}
                            style={fieldStyle}
                            onChange={(e) => {
                                setAreaId(e.target.value);
                                setError("");
                            }}
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

                    {error && (
                        <div
                            style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                                padding: "10px",
                                borderRadius: "8px",
                                background: "#fef2f2",
                                color: "#b91c1c",
                                fontSize: "0.75rem"
                            }}
                        >
                            <AlertCircle size={15} />
                            {error}
                        </div>
                    )}

                    <div
                        style={{
                            display: "flex",
                            gap: "12px"
                        }}
                    >
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: "11px",
                                borderRadius: "8px",
                                border: "1px solid #d1d5db",
                                background: "white",
                                fontWeight: 700,
                                cursor: "pointer"
                            }}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            disabled={saving || geoLoading}
                            onClick={save}
                            style={{
                                flex: 1,
                                padding: "11px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#2563eb",
                                color: "white",
                                fontWeight: 700,
                                cursor:
                                    saving || geoLoading
                                        ? "not-allowed"
                                        : "pointer"
                            }}
                        >
                            {saving
                                ? <Loader2 size={18} className="animate-spin" />
                                : `Update ${beatIds.length} Beats`}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}