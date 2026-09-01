"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { AlertCircle, CheckCircle2, GripVertical, MapPin, Save, X } from "lucide-react";
import { AreaBeatApi } from "@lib/apiClient";
import "leaflet/dist/leaflet.css";

const markerIcon = (label: string) => L.divIcon({
    className: "beat-point-editor-marker",
    html: `<span>${String(label).replace(/[^a-zA-Z0-9_-]/g, "")}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

function FitEditorBounds({ beat, points }: { beat: any; points: any[] }) {
    const map = useMap();
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const group = new L.FeatureGroup();
            try { if (beat.geometry) group.addLayer(L.geoJSON(beat.geometry)); } catch { }
            points.forEach((point) => group.addLayer(L.marker([point.lat, point.lng])));
            const bounds = group.getBounds();
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [55, 55], maxZoom: 18 });
            map.invalidateSize();
        }, 100);
        return () => window.clearTimeout(timer);
    }, [map, beat.geometry, points]);
    return null;
}

interface Props {
    beat: any;
    onClose: () => void;
    onSuccess: () => void;
}

interface EditablePoint {
    lat: number;
    lng: number;
    label: string;
}

export default function BeatPointEditor({ beat, onClose, onSuccess }: Props) {
    const [mounted, setMounted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);

    const initialPoints = useMemo<EditablePoint[]>(() => (Array.isArray(beat.points) ? beat.points : []).slice(0, 5).map((point: any, index: number) => ({
        lat: Number(point.latitude ?? point.lat),
        lng: Number(point.longitude ?? point.lng ?? point.lon),
        label: String(point.code ?? point.label ?? `P${index + 1}`),
    })).filter((point: any) => Number.isFinite(point.lat) && Number.isFinite(point.lng)), [beat]);
    const [points, setPoints] = useState<EditablePoint[]>(initialPoints);

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    const movePoint = (index: number, lat: number, lng: number) => {
        setSaved(false);
        setPoints((current) => current.map((point, pointIndex) => pointIndex === index ? { ...point, lat, lng } : point));
    };

    const save = async () => {
        if (points.length !== 5) {
            setError("This beat must contain exactly five valid points.");
            return;
        }
        try {
            setSaving(true);
            setError("");
            await AreaBeatApi.updatePoints(beat.id, points);
            setSaved(true);
            onSuccess();
        } catch (err: any) {
            setError(err?.message || "Failed to save beat points");
        } finally {
            setSaving(false);
        }
    };

    if (!mounted) return null;
    return createPortal(
        <div className="point-editor-overlay">
            <div className="point-editor-shell">
                <header>
                    <div><small>Five-point route editor</small><h2>{beat.beatName}</h2><p>{beat.zoneName} • {beat.wardName} • {beat.areaName}</p></div>
                    <button onClick={onClose}><X size={20} /></button>
                </header>
                <div className="point-editor-content">
                    <aside>
                        <div className="point-editor-tip"><GripVertical size={17} /><span>Map par P1–P5 markers ko drag karke exact location set karein.</span></div>
                        {points.map((point, index) => (
                            <button key={point.label} onClick={() => undefined}>
                                <span>{point.label}</span><div><strong>Point {index + 1}</strong><small>{point.lat.toFixed(6)}, {point.lng.toFixed(6)}</small></div><MapPin size={16} />
                            </button>
                        ))}
                        {error && <div className="point-editor-error"><AlertCircle size={16} />{error}</div>}
                        {saved && <div className="point-editor-success"><CheckCircle2 size={16} />Points saved successfully.</div>}
                        <button className="save-points" onClick={save} disabled={saving || points.length !== 5}><Save size={16} />{saving ? "Saving..." : "Save 5 Points"}</button>
                    </aside>
                    <section>
                        <MapContainer center={[22.7196, 75.8577]} zoom={14} style={{ width: "100%", height: "100%" }}>
                            <TileLayer attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>' url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" maxZoom={20} />
                            <FitEditorBounds beat={beat} points={points} />
                            {beat.geometry && <GeoJSON data={beat.geometry} style={{ color: "#2563eb", weight: 5, opacity: .9 }} />}
                            {points.map((point, index) => (
                                <Marker key={`${point.label}-${index}`} position={[point.lat, point.lng]} icon={markerIcon(point.label)} draggable eventHandlers={{
                                    dragend: (event: any) => { const location = event.target.getLatLng(); movePoint(index, location.lat, location.lng); },
                                }}><Tooltip direction="top" offset={[0, -18]}>{point.label} • drag to edit</Tooltip></Marker>
                            ))}
                        </MapContainer>
                    </section>
                </div>
            </div>
            <style jsx global>{`
                .point-editor-overlay{position:fixed;inset:0;z-index:6500;background:rgba(15,23,42,.62);backdrop-filter:blur(5px);padding:22px;display:grid;place-items:center}.point-editor-shell{width:min(1280px,100%);height:min(780px,calc(100vh - 44px));background:#fff;border-radius:20px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(15,23,42,.35)}.point-editor-shell header{padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}.point-editor-shell header small{color:#2563eb;text-transform:uppercase;font-weight:900;letter-spacing:.07em}.point-editor-shell header h2{margin:3px 0;color:#0f172a}.point-editor-shell header p{margin:0;color:#64748b;font-size:12px}.point-editor-shell header button{width:38px;height:38px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;display:grid;place-items:center;cursor:pointer}.point-editor-content{min-height:0;flex:1;display:grid;grid-template-columns:310px 1fr}.point-editor-content aside{padding:16px;border-right:1px solid #e2e8f0;overflow:auto}.point-editor-content aside>button:not(.save-points){width:100%;display:grid;grid-template-columns:36px 1fr 18px;gap:9px;align-items:center;text-align:left;border:1px solid #e2e8f0;border-radius:11px;background:#fff;padding:10px;margin-bottom:8px}.point-editor-content aside>button>span{width:32px;height:32px;border-radius:50%;background:#2563eb;color:#fff;display:grid;place-items:center;font-size:11px;font-weight:900}.point-editor-content aside>button div{display:flex;flex-direction:column}.point-editor-content aside strong{font-size:12px;color:#0f172a}.point-editor-content aside small{font-size:10px;color:#64748b}.point-editor-tip,.point-editor-error,.point-editor-success{display:flex;gap:8px;padding:10px;border-radius:10px;margin-bottom:12px;font-size:11px;font-weight:700}.point-editor-tip{background:#eff6ff;color:#1d4ed8}.point-editor-error{background:#fef2f2;color:#dc2626}.point-editor-success{background:#ecfdf5;color:#047857}.save-points{width:100%;height:42px;border:0;border-radius:10px;background:#2563eb;color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}.point-editor-content section{min-width:0;min-height:0}.beat-point-editor-marker{border:0;background:transparent}.beat-point-editor-marker span{width:32px;height:32px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 3px 10px rgba(15,23,42,.38);color:#fff;display:grid;place-items:center;font-size:10px;font-weight:900}@media(max-width:760px){.point-editor-content{grid-template-columns:1fr;grid-template-rows:230px 1fr}.point-editor-content aside{border-right:0;border-bottom:1px solid #e2e8f0}.point-editor-overlay{padding:8px}}
            `}</style>
        </div>, document.body
    );
}
