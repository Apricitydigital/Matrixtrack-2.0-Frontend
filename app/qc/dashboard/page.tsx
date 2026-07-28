"use client";

import React, { useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from "recharts";
import {
    Trash2,
    CheckCircle2,
    AlertCircle,
    MapPin,
    TrendingUp,
    Award,
    Filter,
    Calendar,
    Layers,
    Wind,
    ShieldAlert,
    Clock
} from "lucide-react";
import { Protected, RoleGuard } from "@components/Guards";

// --- Mock Data ---

const actionTrackingData = [
    {
        parameter: "Toilets",
        issue: "24 Not Cleaned",
        count: 24,
        ward: "Ward 4",
        status: "In Progress",
        assignedTo: "Sanitation Team A",
        teamRole: "Field Team",
        reportedAt: "2h ago",
        isEscalated: false
    },
    {
        parameter: "Litter Bins",
        issue: "15 Overloaded",
        count: 15,
        ward: "Ward 2",
        status: "Assigned",
        assignedTo: "Beat Supervisor",
        teamRole: "Supervisor",
        reportedAt: "5h ago",
        isEscalated: true
    },
    {
        parameter: "Beats",
        issue: "8 Not Covered",
        count: 8,
        ward: "Ward 8",
        status: "Assigned",
        assignedTo: "Deployment Unit",
        teamRole: "Ops Team",
        reportedAt: "1h ago",
        isEscalated: false
    },
    {
        parameter: "Feeder Points",
        issue: "5 Not Cleared",
        count: 5,
        ward: "Ward 3",
        status: "Resolved",
        assignedTo: "Quick Response Team",
        teamRole: "QRT",
        reportedAt: "4h ago",
        isEscalated: false
    },
    {
        parameter: "Overloaded Bins",
        issue: "12 Critical",
        count: 12,
        ward: "Ward 1",
        status: "In Progress",
        assignedTo: "Waste Logistics",
        teamRole: "Logistics",
        reportedAt: "3h ago",
        isEscalated: true
    }
];

const kpis = [
    {
        title: "Toilets Cleaned",
        value: "84%",
        total: "126/150",
        status: "success",
        icon: CheckCircle2,
        color: "#16a34a"
    },
    {
        title: "Feeder Points Cleared",
        value: "42",
        total: "Target: 50",
        status: "warning",
        icon: Trash2,
        color: "#ca8a04"
    },
    {
        title: "Feeder Points Eliminated",
        value: "12",
        total: "This month",
        status: "success",
        icon: Award,
        color: "#2563eb"
    },
    {
        title: "Beats Covered",
        value: "92%",
        total: "210/228",
        status: "success",
        icon: MapPin,
        color: "#7c3aed"
    },
    {
        title: "Litter Bins Clean",
        value: "88%",
        total: "412/468",
        status: "success",
        icon: CheckCircle2,
        color: "#16a34a"
    },
    {
        title: "Overloaded Bins",
        value: "15",
        total: "Immediate action",
        status: "danger",
        icon: AlertCircle,
        color: "#dc2626"
    }
];

const wardCleanlinessData = [
    { name: "Ward 1", score: 85 },
    { name: "Ward 2", score: 72 },
    { name: "Ward 3", score: 91 },
    { name: "Ward 4", score: 65 },
    { name: "Ward 5", score: 88 },
    { name: "Ward 6", score: 78 },
    { name: "Ward 7", score: 94 },
    { name: "Ward 8", score: 61 }
];

const dailyTrendData = [
    { day: "Mon", toilets: 120, feeder: 35, efficiency: 85 },
    { day: "Tue", toilets: 132, feeder: 42, efficiency: 88 },
    { day: "Wed", toilets: 125, feeder: 38, efficiency: 86 },
    { day: "Thu", toilets: 145, feeder: 48, efficiency: 91 },
    { day: "Fri", toilets: 140, feeder: 45, efficiency: 90 },
    { day: "Sat", toilets: 110, feeder: 30, efficiency: 82 },
    { day: "Sun", toilets: 95, feeder: 25, efficiency: 80 }
];

const zonePerformanceData = [
    { zone: "North", toilets: 85, feeder: 78, beats: 92 },
    { zone: "South", toilets: 92, feeder: 88, beats: 95 },
    { zone: "East", toilets: 78, feeder: 72, beats: 84 },
    { zone: "West", toilets: 88, feeder: 82, beats: 90 },
    { zone: "Central", toilets: 95, feeder: 94, beats: 98 }
];

const binStatusData = [
    { ward: "Ward 1", clean: 45, overloaded: 5 },
    { ward: "Ward 2", clean: 38, overloaded: 12 },
    { ward: "Ward 3", clean: 52, overloaded: 3 },
    { ward: "Ward 4", clean: 30, overloaded: 15 },
    { ward: "Ward 5", clean: 48, overloaded: 7 }
];

const distributionData = [
    { name: "Clean", value: 75, color: "#16a34a" },
    { name: "Moderately Clean", value: 15, color: "#ca8a04" },
    { name: "Dirty", value: 10, color: "#dc2626" }
];

const topWards = [
    { name: "Ward 7", score: "94%", trend: "up" },
    { name: "Ward 3", score: "91%", trend: "up" },
    { name: "Ward 5", score: "88%", trend: "stable" },
    { name: "Ward 1", score: "85%", trend: "down" },
    { name: "Ward 6", score: "78%", trend: "up" }
];

const bottomWards = [
    { name: "Ward 8", score: "61%", issue: "Low coverage" },
    { name: "Ward 4", score: "65%", issue: "Overloaded bins" },
    { name: "Ward 2", score: "72%", issue: "Feeder points" },
    { name: "Ward 6", score: "78%", issue: "Slow clearance" }
];

const beatsTrendData = [
    { day: "Mon", coverage: 82 },
    { day: "Tue", coverage: 85 },
    { day: "Wed", coverage: 84 },
    { day: "Thu", coverage: 88 },
    { day: "Fri", coverage: 91 },
    { day: "Sat", coverage: 92 },
    { day: "Sun", coverage: 90 }
];

const wardBeatsData = [
    { ward: "Ward 1", covered: 42, notCovered: 3 },
    { ward: "Ward 2", covered: 35, notCovered: 10 },
    { ward: "Ward 3", covered: 48, notCovered: 2 },
    { ward: "Ward 4", covered: 30, notCovered: 15 },
    { ward: "Ward 5", covered: 45, notCovered: 5 }
];

// --- Components ---

const KPICard = ({ kpi }: { kpi: any }) => (
    <div className="card card-hover dashboard-kpi">
        <div className="kpi-header">
            <div className="kpi-icon-wrapper" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                <kpi.icon size={20} />
            </div>
            <div className={`badge badge-${kpi.status}`}>{kpi.status === "success" ? "Stable" : kpi.status === "warning" ? "Attention" : "Critical"}</div>
        </div>
        <div className="kpi-body">
            <h3 className="muted" style={{ fontSize: "14px", fontWeight: 500 }}>{kpi.title}</h3>
            <div className="kpi-value">{kpi.value}</div>
            <p className="kpi-total">{kpi.total}</p>
        </div>
    </div>
);

export default function QCDashboard() {
    const [dateRange, setDateRange] = useState("Last 7 Days");

    return (
        <Protected>
            <RoleGuard roles={["QC"]}>
                <div className="page dashboard-page">
                    <header className="section-header">
                        <div>
                            <h1 className="dashboard-title">QC Command Center</h1>
                            <p className="muted">City cleanliness & sanitation performance overview</p>
                        </div>
                        <div className="section-actions">
                            <div className="filter-group">
                                <button className="btn btn-secondary btn-sm">
                                    <Filter size={16} />
                                    <span>Wards: All</span>
                                </button>
                                <button className="btn btn-secondary btn-sm">
                                    <Calendar size={16} />
                                    <span>{dateRange}</span>
                                </button>
                            </div>
                            <button className="btn btn-primary btn-sm">
                                Generate Report
                            </button>
                        </div>
                    </header>

                    {/* KPI Section */}
                    <div className="grid grid-3 grid-6-lg">
                        {kpis.map((kpi, idx) => (
                            <KPICard key={idx} kpi={kpi} />
                        ))}
                    </div>

                    <div className="dashboard-grid-layout">
                        {/* Main Charts Column */}
                        <div className="dashboard-main">

                            <div className="grid grid-2">
                                {/* Ward Cleanliness */}
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title">Ward-wise Cleanliness Score</h3>
                                        <Layers size={18} className="muted" />
                                    </div>
                                    <div className="chart-container" style={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={wardCleanlinessData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                />
                                                <Bar dataKey="score" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={30} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Daily Trends */}
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title">Cleaning Trends</h3>
                                        <TrendingUp size={18} className="muted" />
                                    </div>
                                    <div className="chart-container" style={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={dailyTrendData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                                <Line type="monotone" dataKey="toilets" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} name="Toilets" />
                                                <Line type="monotone" dataKey="feeder" stroke="#ca8a04" strokeWidth={3} dot={{ r: 4, fill: '#ca8a04' }} activeDot={{ r: 6 }} name="Feeder Points" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-2" style={{ marginTop: '24px' }}>
                                {/* Zone Performance */}
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title">Zone-wise Performance Ranking</h3>
                                        <Award size={18} className="muted" />
                                    </div>
                                    <div className="chart-container" style={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={zonePerformanceData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="zone" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                                <Bar dataKey="toilets" name="Toilets" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                                <Bar dataKey="feeder" name="Feeder Points" fill="#eab308" radius={[4, 4, 0, 0]} barSize={20} />
                                                <Bar dataKey="beats" name="Beats" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Litter Bin Status */}
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title">Litter Bin Status per Ward</h3>
                                        <Trash2 size={18} className="muted" />
                                    </div>
                                    <div className="chart-container" style={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={binStatusData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="ward" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                                <Bar dataKey="clean" name="Cleaned" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} barSize={30} />
                                                <Bar dataKey="overloaded" name="Overloaded" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={30} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-2" style={{ marginTop: '24px' }}>
                                {/* Sweeping Trend */}
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title">Sweeping Trends (Beats Coverage)</h3>
                                        <TrendingUp size={18} className="muted" />
                                    </div>
                                    <div className="chart-container" style={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={beatsTrendData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                <Line type="monotone" dataKey="coverage" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4, fill: '#7c3aed' }} activeDot={{ r: 6 }} name="Coverage %" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Beats Coverage per Ward */}
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title">Beats Realization per Ward</h3>
                                        <MapPin size={18} className="muted" />
                                    </div>
                                    <div className="chart-container" style={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={wardBeatsData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="ward" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                                <Bar dataKey="covered" name="Covered" stackId="b" fill="#16a34a" radius={[0, 0, 0, 0]} barSize={30} />
                                                <Bar dataKey="notCovered" name="Not Covered" stackId="b" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={30} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Action Required & Resolution Tracking */}
                            <div className="card" style={{ marginTop: '24px' }}>
                                <div className="card-header">
                                    <h3 className="card-title">Action Required & Resolution Tracking</h3>
                                    <ShieldAlert size={18} className="critical" />
                                </div>
                                <div className="table-responsive">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Parameter</th>
                                                <th>Issue Detail</th>
                                                <th>Team Assigned</th>
                                                <th>Status</th>
                                                <th>Reported</th>
                                                <th>Action Tracker</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {actionTrackingData.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div className="dot" style={{ backgroundColor: item.isEscalated ? '#dc2626' : '#2563eb' }}></div>
                                                            <span style={{ fontWeight: 700 }}>{item.parameter}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold">{item.issue}</span>
                                                            <span className="text-xs muted">{item.ward}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-col">
                                                            <span>{item.assignedTo}</span>
                                                            <span className="badge" style={{ width: 'fit-content', marginTop: 4, opacity: 0.8 }}>{item.teamRole}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className={`status-badge ${item.status.toLowerCase().replace(' ', '-')}`}>
                                                            {item.status}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-1 muted text-sm">
                                                            <Clock size={12} />
                                                            <span>{item.reportedAt}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {item.isEscalated ? (
                                                            <div className="badge badge-error flex items-center gap-1">
                                                                <AlertCircle size={12} />
                                                                <span>Escalated</span>
                                                            </div>
                                                        ) : (
                                                            <div className="badge badge-success">On Track</div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>

                        {/* Sidebar Insights Column */}
                        <aside className="dashboard-sidebar">
                            <div className="card h-full">
                                <h3 className="section-title">Ranking & Insights</h3>

                                <div className="insight-section">
                                    <h4 className="insight-label">Top 5 Cleanest Wards</h4>
                                    <div className="rank-list">
                                        {topWards.map((w, i) => (
                                            <div className="rank-item" key={i}>
                                                <div className="rank-number">{i + 1}</div>
                                                <div className="rank-name">{w.name}</div>
                                                <div className={`rank-score ${w.trend === 'up' ? 'text-success' : 'text-muted'}`}>
                                                    {w.score}
                                                    {w.trend === 'up' && <TrendingUp size={14} style={{ marginLeft: 4 }} />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="insight-section">
                                    <h4 className="insight-label">Requires Attention</h4>
                                    <div className="rank-list">
                                        {bottomWards.map((w, i) => (
                                            <div className="rank-item attention" key={i}>
                                                <div className="rank-icon"><AlertCircle size={16} /></div>
                                                <div className="rank-name-container">
                                                    <div className="rank-name">{w.name}</div>
                                                    <div className="rank-issue">{w.issue}</div>
                                                </div>
                                                <div className="rank-score critical">{w.score}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="card-promo">
                                    <h4>Weekly QC Tip</h4>
                                    <p>Focus on Ward 4 this week. Litter bin overflow has increased by 12% in the last 48 hours.</p>
                                    <button className="btn btn-primary btn-sm w-full">View Details</button>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </RoleGuard>
        </Protected>
    );
}
