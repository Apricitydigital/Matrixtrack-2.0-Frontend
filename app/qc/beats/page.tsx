"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Protected, RoleGuard } from "@components/Guards";
import {
    MapPin,
    CheckCircle2,
    AlertCircle,
    Info,
    Calendar,
    Filter,
    Clock,
    User,
    Navigation,
    X,
    TrendingUp,
    BarChart3,
    Layers,
    ArrowRight,
    Maximize2,
    Target,
    Moon,
    Sun,
    LayoutDashboard,
    Truck,
    CloudSun,
    Search,
    Wind,
    Droplets,
    PieChart as PieIcon,
    Upload
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, AreaChart, Area, Legend
} from "recharts";
import { mockBeats } from "./data";
import { useMap } from "react-leaflet";
import KMLUploader, { ParsedKMLData } from "./components/KMLUploader";
import BeatPreviewPanel from "./components/BeatPreviewPanel";

// Dynamic imports for Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });

// Import Leaflet only on client side
let L: any;
if (typeof window !== 'undefined') {
    L = require('leaflet');
}

// --- Helper Components & Hooks ---

// Live Vehicle Component
const LiveVehicle = ({ beat, icon }: { beat: any, icon: any }) => {
    const [pos, setPos] = useState(beat.coordinates[0]);
    const [direction, setDirection] = useState(1);
    const progress = useRef(0);

    useEffect(() => {
        const interval = setInterval(() => {
            progress.current += 0.005 * direction;
            if (progress.current >= 1) {
                progress.current = 1;
                setDirection(-1);
            } else if (progress.current <= 0) {
                progress.current = 0;
                setDirection(1);
            }
            const start = beat.coordinates[0];
            const end = beat.coordinates[1];
            setPos([
                start[0] + (end[0] - start[0]) * progress.current,
                start[1] + (end[1] - start[1]) * progress.current
            ]);
        }, 50);
        return () => clearInterval(interval);
    }, [beat, direction]);

    if (!icon) return null;

    return (
        <Marker position={pos} icon={icon} zIndexOffset={1000}>
            <Popup closeButton={false} offset={[0, -10]} className="vehicle-popup">
                <div className="text-xs font-bold">Sweeper Unit #04</div>
                <div className="text-[10px] opacity-75">Live Tracking</div>
            </Popup>
        </Marker>
    );
};

const MapController = ({ center, zoom, selectedBeat }: any) => {
    const map = useMap();
    useEffect(() => {
        if (selectedBeat) {
            const coords = selectedBeat.coordinates;
            const lat = (coords[0][0] + coords[1][0]) / 2;
            const lng = (coords[0][1] + coords[1][1]) / 2;
            map.flyTo([lat, lng], 17, { duration: 1.5, easeLinearity: 0.25 });
        } else if (center) {
            map.flyTo(center, zoom, { duration: 1.5 });
        }
    }, [center, zoom, selectedBeat, map]);
    return null;
};

export default function BeatsManagementPage() {
    const [selectedBeat, setSelectedBeat] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({ ward: "All", status: "All" });
    const [isDarkMode, setIsDarkMode] = useState(false); // Defaulting to Light for dashboard readability
    const [sweeperIcon, setSweeperIcon] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"all" | "my">("all");
    const [assignedBeats, setAssignedBeats] = useState<any[]>([]);
    const [loadingBeats, setLoadingBeats] = useState(false);

    useEffect(() => {
        if (activeTab === "my") {
            loadMyBeats();
        }
    }, [activeTab]);

    const loadMyBeats = async () => {
        setLoadingBeats(true);
        try {
            const response = await fetch("/api/city/areas/my-beats", {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setAssignedBeats(data.beats || []);
            }
        } catch (err) {
            console.error("Failed to load assigned beats", err);
        } finally {
            setLoadingBeats(false);
        }
    };

    // KML Upload states
    const [showKMLUploader, setShowKMLUploader] = useState(false);
    const [uploadedKMLData, setUploadedKMLData] = useState<ParsedKMLData | null>(null);
    const [tempBeatOnMap, setTempBeatOnMap] = useState<any>(null);

    // Initialize custom icon on client side only
    useEffect(() => {
        if (typeof window !== 'undefined' && L) {
            const icon = L.divIcon({
                className: 'custom-sweeper-icon',
                html: `<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px #3b82f6, 0 0 20px rgba(59, 130, 246, 0.5); border: 2px solid white;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                    </div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            setSweeperIcon(icon);
        }
    }, []);

    // Handle KML Upload
    const handleKMLParsed = (data: ParsedKMLData) => {
        setUploadedKMLData(data);
        setShowKMLUploader(false);

        // Create temporary beat object for map display
        const tempBeat = {
            id: "TEMP-KML",
            name: data.name,
            coordinates: data.coordinates,
            status: "New Upload",
            color: "#8b5cf6", // Purple for new upload
        };

        setTempBeatOnMap(tempBeat);
        setSelectedBeat(null); // Clear any selected beat
    };

    const handleSaveBeat = () => {
        // TODO: Here you would make an API call to save the beat
        // For now, we'll just show an alert and clear the data
        alert(`Beat "${uploadedKMLData?.name}" saved successfully!\n\nIn production, this will save to the backend.`);

        // Clear the uploaded data
        setUploadedKMLData(null);
        setTempBeatOnMap(null);
    };

    const handleCancelKML = () => {
        setUploadedKMLData(null);
        setTempBeatOnMap(null);
    };

    // --- Data Statistics ---
    const liveVehicleBeats = useMemo(() => mockBeats.filter(b => b.status === 'Cleaned').slice(0, 3), []);

    const filteredBeats = useMemo(() => {
        const sourceData = activeTab === "all" ? mockBeats : assignedBeats;
        return (sourceData || []).filter(beat => {
            if (searchQuery && !beat.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !beat.beatName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            // Map beatName to name for consistency if needed
            const name = beat.name || beat.beatName || "Unnamed Beat";
            if (filters.ward !== "All" && beat.ward !== filters.ward) return false;
            if (filters.status !== "All" && beat.status !== filters.status) return false;
            return true;
        });
    }, [filters, searchQuery, activeTab, assignedBeats]);

    const stats = useMemo(() => {
        const total = filteredBeats.length;
        const cleaned = filteredBeats.filter(b => b.status === "Cleaned").length;
        const notCleaned = filteredBeats.filter(b => b.status === "Not cleaned").length;
        const partial = filteredBeats.filter(b => b.status === "Partially covered").length;
        const notAssigned = filteredBeats.filter(b => b.status === "Not assigned").length;
        const coverage = total > 0 ? ((cleaned / total) * 100).toFixed(1) : "0.0";
        return { total, cleaned, notCleaned, partial, notAssigned, coverage };
    }, [filteredBeats]);

    const wardStackedData = useMemo(() => {
        const wards = Array.from(new Set(filteredBeats.map(b => b.ward))).sort();
        return wards.map(ward => {
            const beatsInWard = filteredBeats.filter(b => b.ward === ward);
            return {
                name: ward,
                Cleaned: beatsInWard.filter(b => b.status === "Cleaned").length,
                NotCleaned: beatsInWard.filter(b => b.status === "Not cleaned").length,
                Partial: beatsInWard.filter(b => b.status === "Partially covered").length,
                NotAssigned: beatsInWard.filter(b => b.status === "Not assigned").length
            };
        });
    }, [filteredBeats]);

    const statusChartData = [
        { name: 'Cleaned', value: stats.cleaned, color: '#22c55e' },
        { name: 'Issue', value: stats.notCleaned, color: '#ef4444' },
        { name: 'Partial', value: stats.partial, color: '#f59e0b' },
        { name: 'Pending', value: stats.notAssigned, color: '#94a3b8' },
    ].filter(d => d.value > 0);

    // --- Styling Variables ---
    const mapTileUrl = isDarkMode
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    const bgColor = isDarkMode ? "#0f172a" : "#f1f5f9";
    const cardColor = isDarkMode ? "#1e293b" : "#ffffff";
    const textColor = isDarkMode ? "#f8fafc" : "#0f172a";
    const borderColor = isDarkMode ? "#334155" : "#e2e8f0";

    return (
        <Protected>
            <RoleGuard roles={["QC"]}>
                <div className="page beats-page" style={{ background: bgColor, color: textColor }}>

                    {/* Header */}
                    <div className="header-row">
                        <div>
                            <h1 className="page-title">
                                <span className="icon-box"><LayoutDashboard size={20} color="white" /></span>
                                Beats Command Center
                            </h1>
                            <p className="page-subtitle">Real-time sanitation monitoring network</p>

                            <div className="tab-switcher mt-4">
                                <button
                                    className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('all')}
                                >
                                    All Fleet Monitoring
                                </button>
                                <button
                                    className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('my')}
                                >
                                    My Assigned Beats
                                </button>
                            </div>
                        </div>

                        <div className="header-actions">
                            {/* Weather Widget */}
                            <div className="weather-widget">
                                <CloudSun size={18} color="#fbbf24" />
                                <div className="weather-info">
                                    <span className="temp">28°C HYD</span>
                                    <div className="sub-info">
                                        <span><Wind size={8} /> 12kph</span>
                                        <span><Droplets size={8} /> 45%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="search-box">
                                <Search size={14} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search beats..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={() => setShowKMLUploader(true)}
                                className="upload-kml-btn"
                                title="Upload KML File"
                            >
                                <Upload size={16} />
                                Upload KML
                            </button>

                            <button onClick={() => setIsDarkMode(!isDarkMode)} className="theme-btn" title="Toggle Theme">
                                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* KPI Statistics Row */}
                    <div className="stats-grid">
                        <MetricCard
                            title={activeTab === 'all' ? "Total Beats" : "My Beats"}
                            value={stats.total}
                            icon={<Navigation size={18} />}
                            theme={isDarkMode}
                            trend={activeTab === 'my' ? "Directly assigned to you" : "+2 from last week"}
                        />
                        <MetricCard
                            title="Coverage"
                            value={`${stats.coverage}%`}
                            icon={<TrendingUp size={18} />}
                            color="#22c55e"
                            theme={isDarkMode}
                            trend="High performance"
                        />
                        <MetricCard
                            title="Issues Detected"
                            value={stats.notCleaned}
                            icon={<AlertCircle size={18} />}
                            color="#ef4444"
                            theme={isDarkMode}
                            highlight={stats.notCleaned > 0}
                        />
                        <MetricCard
                            title="Active Sweepers"
                            value={activeTab === 'all' ? liveVehicleBeats.length : 0}
                            icon={<Truck size={18} />}
                            color="#3b82f6"
                            theme={isDarkMode}
                            trend="Live tracking active"
                        />
                    </div>

                    {/* Main Content Grid */}
                    <div className="main-layout">

                        {/* LEFT: Map Container */}
                        <div className="map-section card" style={{ background: cardColor, borderColor: borderColor }}>
                            <div className="card-header">
                                <div className="flex items-center gap-4">
                                    <div className="card-title">{activeTab === 'all' ? 'Fleet Logistics View' : 'My Beats Map'}</div>
                                    <div className="filter-pills">
                                        {[
                                            { label: 'All', value: 'All' },
                                            { label: 'Cleaned', value: 'Cleaned' },
                                            { label: 'Issues', value: 'Not cleaned' },
                                            { label: 'Partial', value: 'Partially covered' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setFilters(prev => ({ ...prev, status: opt.value }))}
                                                className={`filter-btn ${filters.status === opt.value ? 'active' : ''}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="map-legend">
                                    <span className="legend-item"><span className="dot cleaned"></span> Cleaned</span>
                                    <span className="legend-item"><span className="dot issue"></span> Issue</span>
                                    <span className="legend-item"><span className="dot partial"></span> Partial</span>
                                </div>
                            </div>

                            <div className="map-frame">
                                <MapContainer
                                    key="unique-map-key"
                                    center={[17.4100, 78.4700]}
                                    zoom={13}
                                    style={{ height: "100%", width: "100%" }}
                                >
                                    <TileLayer attribution='&copy; CARTO' url={mapTileUrl} />
                                    <MapController center={[17.4100, 78.4700]} zoom={13} selectedBeat={selectedBeat} />

                                    {/* Live Sweepers - Hide if filtering for non-cleaned statuses */}
                                    {sweeperIcon && (filters.status === 'All' || filters.status === 'Cleaned') && liveVehicleBeats.map(beat => (
                                        <LiveVehicle key={`veh-${beat.id}`} beat={beat} icon={sweeperIcon} />
                                    ))}

                                    {filteredBeats.map((beat) => {
                                        const isSelected = selectedBeat?.id === beat.id;
                                        const isCritical = beat.status === "Not cleaned";
                                        const color = beat.status === 'Not cleaned' ? '#ef4444' : beat.status === 'Cleaned' ? '#22c55e' : '#f59e0b';

                                        // Normalize coordinates: 
                                        // Backend geometry is GeoJSON [lng, lat]. Mock data is [lat, lng].
                                        let coords = beat.coordinates;
                                        if (!coords && beat.geometry?.coordinates) {
                                            if (beat.geometry.type === 'LineString') {
                                                coords = beat.geometry.coordinates.map((c: any) => [c[1], c[0]]);
                                            } else if (beat.geometry.type === 'Point') {
                                                coords = [[beat.geometry.coordinates[1], beat.geometry.coordinates[0]]];
                                            }
                                        }

                                        if (!coords || coords.length === 0) return null;

                                        return (
                                            <React.Fragment key={beat.id}>
                                                <Polyline
                                                    positions={coords as any}
                                                    pathOptions={{
                                                        color: color,
                                                        weight: isSelected ? 18 : 10,
                                                        opacity: isSelected ? 0.3 : (isDarkMode ? 0.2 : 0.1),
                                                        className: isCritical ? 'pulse-anim' : ''
                                                    }}
                                                />
                                                <Polyline
                                                    positions={coords as any}
                                                    pathOptions={{
                                                        color: color,
                                                        weight: isSelected ? 6 : 4,
                                                        opacity: 1,
                                                        lineCap: 'round'
                                                    }}
                                                    eventHandlers={{
                                                        click: () => setSelectedBeat(beat),
                                                        mouseover: (e) => { e.target.setStyle({ weight: 8 }); e.target.openPopup(); },
                                                        mouseout: (e) => { if (!isSelected) { e.target.setStyle({ weight: 4 }); e.target.closePopup(); } },
                                                    }}
                                                >
                                                    <Popup closeButton={false} className="glass-popup">
                                                        <div className="popup-content">
                                                            <div className="pop-name">{beat.name || beat.beatName}</div>
                                                            <div className="pop-status">{beat.status || "Assigned Beat"}</div>
                                                        </div>
                                                    </Popup>
                                                </Polyline>
                                            </React.Fragment>
                                        );
                                    })}

                                    {/* Render Uploaded KML Beat */}
                                    {tempBeatOnMap && (
                                        <React.Fragment>
                                            <Polyline
                                                positions={tempBeatOnMap.coordinates as any}
                                                pathOptions={{
                                                    color: '#8b5cf6',
                                                    weight: 16,
                                                    opacity: 0.2,
                                                    className: 'kml-glow'
                                                }}
                                            />
                                            <Polyline
                                                positions={tempBeatOnMap.coordinates as any}
                                                pathOptions={{
                                                    color: '#8b5cf6',
                                                    weight: 6,
                                                    opacity: 1,
                                                    lineCap: 'round'
                                                }}
                                            >
                                                <Popup closeButton={false} className="glass-popup">
                                                    <div className="popup-content">
                                                        <div className="pop-name">{tempBeatOnMap.name}</div>
                                                        <div className="pop-status">📤 Uploaded - Ready to Save</div>
                                                    </div>
                                                </Popup>
                                            </Polyline>
                                        </React.Fragment>
                                    )}
                                </MapContainer>
                            </div>
                        </div>

                        {/* RIGHT: Analytics & Details Panel */}
                        <div className="analytics-section">

                            {selectedBeat ? (
                                // Detail View when beat is selected
                                <div className="card detail-card slide-in" style={{ background: cardColor, borderColor: borderColor }}>
                                    <div className="detail-header">
                                        <div>
                                            <div className="eyebrow">Selected Beat</div>
                                            <h2 className="detail-title">{selectedBeat.name}</h2>
                                        </div>
                                        <button onClick={() => setSelectedBeat(null)} className="close-icon"><X size={18} /></button>
                                    </div>

                                    <div className="status-banner" style={{
                                        background: selectedBeat.status === 'Cleaned' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: selectedBeat.status === 'Cleaned' ? '#15803d' : '#b91c1c',
                                        borderColor: selectedBeat.status === 'Cleaned' ? '#22c55e' : '#ef4444'
                                    }}>
                                        <div className="flex items-center gap-2 font-bold">
                                            {selectedBeat.status === 'Cleaned' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                            {selectedBeat.status}
                                        </div>
                                        <div className="text-xs mt-1 opacity-80">Last update: {selectedBeat.lastCleaned || 'N/A'}</div>
                                    </div>

                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <span className="label">Ward</span>
                                            <span className="val">{selectedBeat.ward}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Zone</span>
                                            <span className="val">{selectedBeat.zone}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Assignee</span>
                                            <span className="val">{selectedBeat.assignedTo || 'Unassigned'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Shift</span>
                                            <span className="val">{selectedBeat.shift}</span>
                                        </div>
                                    </div>

                                    {selectedBeat.status !== 'Cleaned' && (
                                        <div className="action-area">
                                            <div className="label mb-2">Issue Reported</div>
                                            <div className="text-sm font-medium mb-4">{selectedBeat.reason}</div>
                                            <button className="action-btn">Escalate Issue <ArrowRight size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Default Dashboard View
                                <div className="dashboard-view">
                                    {/* Charts */}
                                    <div className="card" style={{ background: cardColor, borderColor: borderColor, marginBottom: 20 }}>
                                        <div className="card-header pb-2">
                                            <div className="card-title text-sm flex gap-2"><PieIcon size={14} /> Status Distribution</div>
                                        </div>
                                        <div style={{ height: 160 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={statusChartData}
                                                        cx="50%" cy="50%"
                                                        innerRadius={40} outerRadius={60}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {statusChartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ borderRadius: 8 }} />
                                                    <Legend iconSize={8} layout="vertical" verticalAlign="middle" align="right" />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="card" style={{ background: cardColor, borderColor: borderColor, marginBottom: 20 }}>
                                        <div className="card-header pb-2">
                                            <div className="card-title text-sm flex gap-2"><BarChart3 size={14} /> Ward Performance</div>
                                        </div>
                                        <div style={{ height: 180 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={wardStackedData} layout="vertical" barSize={12}>
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 8 }} />
                                                    <Bar dataKey="Cleaned" stackId="a" fill="#22c55e" radius={[0, 4, 4, 0]} />
                                                    <Bar dataKey="NotCleaned" stackId="a" fill="#ef4444" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Action Required */}
                                    <div className="card bg-danger-soft" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                                        <div className="card-header">
                                            <div className="card-title text-danger text-sm flex gap-2"><AlertCircle size={14} /> Action Required</div>
                                        </div>
                                        <div className="alert-list">
                                            {filteredBeats.filter(b => b.slaBreach).map(beat => (
                                                <div key={beat.id} className="alert-row">
                                                    <div className="flex-1">
                                                        <div className="font-bold text-xs">{beat.name}</div>
                                                        <div className="text-xs opacity-70">{beat.reason}</div>
                                                    </div>
                                                    <span className="badge-sla">SLA</span>
                                                </div>
                                            ))}
                                            {filteredBeats.filter(b => b.slaBreach).length === 0 && (
                                                <div className="text-xs opacity-60 italic p-2">No active SLA breaches.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <style jsx>{`
                        .page {
                            padding: 24px;
                            min-height: 100vh;
                            font-family: 'Inter', sans-serif;
                            display: flex;
                            flex-direction: column;
                            gap: 24px;
                        }

                        .header-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }

                        .page-title {
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            font-size: 24px;
                            font-weight: 700;
                            margin: 0;
                            line-height: 1.2;
                        }
                        
                        .icon-box {
                            background: #2563eb;
                            width: 36px;
                            height: 36px;
                            border-radius: 8px;
                            display: grid;
                            place-items: center;
                            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                        }

                        .page-subtitle {
                            font-size: 13px;
                            opacity: 0.6;
                            margin: 4px 0 0 48px;
                        }

                        .header-actions {
                            display: flex;
                            gap: 12px;
                            align-items: center;
                        }

                        .search-box {
                            background: rgba(128, 128, 128, 0.1);
                            padding: 8px 12px;
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            width: 240px;
                        }

                        .search-box input {
                            background: transparent;
                            border: none;
                            outline: none;
                            font-size: 13px;
                            color: inherit;
                            width: 100%;
                        }

                        .weather-widget {
                            background: rgba(128, 128, 128, 0.1);
                            padding: 6px 12px;
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        }
                        
                        .weather-info { display: flex; flex-direction: column; }
                        .temp { font-size: 12px; font-weight: 700; }
                        .sub-info { display: flex; gap: 6px; font-size: 10px; opacity: 0.7; }

                        .theme-btn {
                            background: rgba(128, 128, 128, 0.1);
                            border: none;
                            padding: 8px;
                            border-radius: 8px;
                            cursor: pointer;
                            color: inherit;
                        }

                        .stats-grid {
                            display: grid;
                            grid-template-columns: repeat(4, 1fr);
                            gap: 20px;
                        }

                        .main-layout {
                            display: grid;
                            grid-template-columns: 2fr 1fr;
                            gap: 24px;
                            flex: 1;
                            min-height: 0; 
                        }

                        .card {
                            border: 1px solid;
                            border-radius: 16px;
                            overflow: hidden;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.03);
                            display: flex;
                            flex-direction: column;
                        }

                        .map-section {
                            height: 600px;
                        }

                        .map-frame {
                            flex: 1;
                            position: relative;
                            z-index: 0;
                        }

                        .card-header {
                            padding: 16px;
                            border-bottom: 1px solid rgba(128,128,128,0.1);
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }

                        .card-title {
                            font-weight: 600;
                            font-size: 15px;
                        }

                        /* Filter Pills Style */
                        .filter-pills {
                            background: rgba(128,128,128,0.08);
                            padding: 4px;
                            border-radius: 8px;
                            display: flex;
                            gap: 4px;
                        }

                        .filter-btn {
                            border: none;
                            background: transparent;
                            padding: 4px 12px;
                            font-size: 11px;
                            font-weight: 600;
                            border-radius: 6px;
                            cursor: pointer;
                            color: inherit;
                            opacity: 0.7;
                            transition: all 0.2s;
                        }

                        .filter-btn:hover { opacity: 1; background: rgba(128,128,128,0.05); }

                        .filter-btn.active {
                            background: white;
                            color: #2563eb;
                            opacity: 1;
                            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
                        }
                        
                        ${isDarkMode ? `
                            .filter-btn.active { background: #3b82f6; color: white; }
                        ` : ''}

                        .map-legend {
                            display: flex;
                            gap: 12px;
                            font-size: 11px;
                            font-weight: 500;
                        }
                        .legend-item { display: flex; align-items: center; gap: 6px; }
                        .dot { width: 8px; height: 8px; border-radius: 50%; }
                        .dot.cleaned { background: #22c55e; box-shadow: 0 0 5px #22c55e; }
                        .dot.issue { background: #ef4444; box-shadow: 0 0 5px #ef4444; }
                        .dot.partial { background: #f59e0b; }

                        .dashboard-view {
                            display: flex;
                            flex-direction: column;
                            height: 100%;
                        }

                        .detail-card {
                            padding: 20px;
                            height: 100%;
                        }

                        .detail-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            margin-bottom: 20px;
                        }
                        
                        .eyebrow { text-transform: uppercase; font-size: 10px; font-weight: 700; opacity: 0.5; margin-bottom: 4px; }
                        .detail-title { font-size: 20px; font-weight: 700; margin: 0; }
                        
                        .close-icon { background: transparent; border: none; cursor: pointer; opacity: 0.5; }
                        
                        .status-banner {
                            padding: 12px;
                            border-radius: 8px;
                            border: 1px solid;
                            margin-bottom: 24px;
                        }

                        .detail-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 16px;
                            margin-bottom: 24px;
                        }
                        
                        .detail-item {
                            background: rgba(128,128,128,0.05);
                            padding: 10px;
                            border-radius: 8px;
                        }
                        
                        .detail-item .label { display: block; font-size: 10px; text-transform: uppercase; opacity: 0.6; font-weight: 600; margin-bottom: 2px; }
                        .detail-item .val { font-size: 14px; font-weight: 600; }

                        .action-btn {
                            width: 100%;
                            background: #2563eb;
                            color: white;
                            border: none;
                            padding: 12px;
                            border-radius: 8px;
                            font-weight: 600;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            gap: 8px;
                            cursor: pointer;
                        }

                        .alert-list {
                            display: flex;
                            flex-direction: column;
                            gap: 12px;
                            padding: 16px;
                        }
                        
                        .alert-row {
                            display: flex;
                            gap: 8px;
                            align-items: flex-start;
                        }
                        
                        .badge-sla {
                            background: #ef4444;
                            color: white;
                            font-size: 9px;
                            font-weight: 700;
                            padding: 2px 6px;
                            border-radius: 4px;
                        }

                        /* Animation pulse */
                        @keyframes pulse-ring { 0% { opacity: 0.5; stroke-width: 15; } 100% { opacity: 0; stroke-width: 25; } }
                        :global(.pulse-anim) { animation: pulse-ring 2s infinite; }
                        
                        /* KML Glow Animation */
                        @keyframes kml-glow { 
                            0%, 100% { opacity: 0.3; } 
                            50% { opacity: 0.5; } 
                        }
                        :global(.kml-glow) { 
                            animation: kml-glow 2s ease-in-out infinite;
                            filter: drop-shadow(0 0 8px #8b5cf6);
                        }
                        
                        /* Popup styling */
                        :global(.glass-popup .leaflet-popup-content-wrapper) {
                            background: rgba(0, 0, 0, 0.8) !important;
                            backdrop-filter: blur(4px);
                            color: white !important;
                            border-radius: 8px !important;
                            padding: 0 !important;
                        }
                        :global(.glass-popup .leaflet-popup-content) { margin: 8px 12px !important; }
                        .pop-name { font-weight: 700; font-size: 12px; }
                        .pop-status { font-size: 10px; opacity: 0.8; }
                        
                        .slide-in { animation: slideIn 0.3s ease-out; }
                        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                        
                        /* Upload KML Button */
                        .upload-kml-btn {
                            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 8px;
                            font-weight: 600;
                            font-size: 13px;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            transition: all 0.2s;
                            box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
                        }
                        
                        .upload-kml-btn:hover {
                            transform: translateY(-1px);
                            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
                        }

                        .tab-switcher {
                            display: flex;
                            gap: 12px;
                            margin-bottom: 0;
                        }

                        .tab-btn {
                            background: rgba(128, 128, 128, 0.08);
                            border: 1px solid rgba(128, 128, 128, 0.1);
                            padding: 6px 16px;
                            border-radius: 20px;
                            font-size: 13px;
                            font-weight: 600;
                            cursor: pointer;
                            color: inherit;
                            transition: all 0.2s;
                        }

                        .tab-btn.active {
                            background: white;
                            color: #2563eb;
                            border-color: #2563eb;
                            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
                        }
                        
                        ${isDarkMode ? `
                            .tab-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; }
                        ` : ''}
                    `}</style>

                    {/* KML Uploader Modal */}
                    {showKMLUploader && (
                        <KMLUploader
                            onKMLParsed={handleKMLParsed}
                            onClose={() => setShowKMLUploader(false)}
                            isDarkMode={isDarkMode}
                        />
                    )}

                    {/* Beat Preview Panel at Bottom */}
                    {uploadedKMLData && (
                        <BeatPreviewPanel
                            kmlData={uploadedKMLData}
                            onSave={handleSaveBeat}
                            onCancel={handleCancelKML}
                            isDarkMode={isDarkMode}
                        />
                    )}
                </div>
            </RoleGuard>
        </Protected>
    );
}

const MetricCard = ({ title, value, icon, color, theme, highlight, trend }: any) => (
    <div className="metric-card" style={{
        background: theme ? '#1e293b' : '#ffffff',
        borderColor: highlight ? '#ef4444' : (theme ? '#334155' : '#e2e8f0'),
        borderWidth: highlight ? 2 : 1
    }}>
        <div className="flex justify-between items-start mb-2">
            <span className="metric-title">{title}</span>
            <span className="metric-icon" style={{ color: color || 'inherit', background: color ? `${color}15` : 'rgba(128,128,128,0.1)' }}>{icon}</span>
        </div>
        <div className="metric-value" style={{ color: color || 'inherit' }}>{value}</div>
        {trend && <div className="metric-trend">{trend}</div>}

        <style jsx>{`
            .metric-card {
                padding: 16px;
                border: 1px solid;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            }
            .metric-title { font-size: 11px; text-transform: uppercase; font-weight: 600; opacity: 0.6; }
            .metric-icon { pading: 6px; border-radius: 6px; padding: 4px; }
            .metric-value { font-size: 24px; font-weight: 700; margin-bottom: 2px; }
            .metric-trend { font-size: 11px; opacity: 0.5; }
        `}</style>
    </div>
);
