'use client';

import { useEffect, useState } from "react";
import { CityModulesApi, ApiError } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import {
    Package,
    Settings,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Info,
    Layers,
    Search,
    Trash2,
    Database,
    Activity,
    Lock,
    Trash,
    UtilityPole,
    Map,
    Download,
    FileSpreadsheet,
    FileText,
    Plus
} from "lucide-react";
import { moduleLabel } from "@lib/labels";
import { RoleGuard } from "@components/Guards";

type CityModule = {
    id: string;
    key: string;
    name: string;
    enabled: boolean;
};

export default function CityModulesPage() {
    const { user } = useAuth();
    const isReadOnly = user?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));
    const [modules, setModules] = useState<CityModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [downloadOpen, setDownloadOpen] = useState(false);

    useEffect(() => {
        fetchModules();
    }, []);

    const fetchModules = async () => {
        try {
            setLoading(true);
            const data = await CityModulesApi.list();
            setModules(data);
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to load modules";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const getModuleIcon = (key: string) => {
        const k = key.toUpperCase();
        if (k.includes('SWEEPING')) return <Activity size={28} />;
        if (k.includes('LITTERBINS') || k.includes('BIN')) return <Trash2 size={28} />;
        if (k.includes('TOILET')) return <Info size={28} />;
        if (k.includes('TASKFORCE')) return <Lock size={28} />;
        if (k.includes('GEO') || k.includes('MAP')) return <Map size={28} />;
        return <Layers size={28} />;
    };

    const getModuleColor = (key: string) => {
        const k = key.toUpperCase();
        if (k.includes('SWEEPING')) return { primary: "#10b981", bg: "#ecfdf5" };
        if (k.includes('LITTERBINS') || k.includes('BIN')) return { primary: "#f59e0b", bg: "#fffbeb" };
        if (k.includes('TOILET')) return { primary: "#3b82f6", bg: "#eff6ff" };
        if (k.includes('TASKFORCE')) return { primary: "#ef4444", bg: "#fef2f2" };
        return { primary: "#6366f1", bg: "#f5f3ff" };
    };

    const activeCount = modules.filter(m => m.enabled).length;
    const inactiveCount = modules.length - activeCount;

    const filteredModules = modules.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.key.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
            <div className="page" style={{ padding: "40px", backgroundColor: "#fdfdfd", minHeight: "100vh" }}>
                <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

                    {error && (
                        <div style={{ padding: "20px", backgroundColor: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "16px", color: "#991b1b", marginBottom: "32px", display: "flex", alignItems: "center", gap: "12px" }}>
                            <XCircle size={20} />
                            <span style={{ fontWeight: 600 }}>{error}</span>
                        </div>
                    )}

                    {/* Simple Header */}
                    <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>
                                System Modules
                            </h1>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                            <div style={{ position: "relative" }}>
                                <button
                                    onClick={() => setDownloadOpen(!downloadOpen)}
                                    style={{
                                        height: "48px", width: "48px", borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "white",
                                        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
                                    title="Download List"
                                >
                                    <Download size={20} color="#475569" />
                                </button>
                                {downloadOpen && (
                                    <div style={{
                                        position: "absolute", top: "56px", right: 0, backgroundColor: "white", border: "1px solid #e2e8f0",
                                        borderRadius: "12px", padding: "8px", width: "180px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
                                        zIndex: 50, display: "flex", flexDirection: "column", gap: "4px"
                                    }}>
                                        <button
                                            onClick={() => { alert("Export to Excel/CSV functionality pending"); setDownloadOpen(false); }}
                                            style={{
                                                display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px",
                                                border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px", fontSize: "0.875rem",
                                                fontWeight: 600, color: "#475569", textAlign: "left", transition: "all 0.2s"
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#475569"; }}
                                        >
                                            <FileSpreadsheet size={16} color="#10b981" />
                                            Excel / CSV
                                        </button>
                                        <button
                                            onClick={() => { alert("Export to PDF functionality pending"); setDownloadOpen(false); }}
                                            style={{
                                                display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px",
                                                border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px", fontSize: "0.875rem",
                                                fontWeight: 600, color: "#475569", textAlign: "left", transition: "all 0.2s"
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#475569"; }}
                                        >
                                            <FileText size={16} color="#ef4444" />
                                            PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <div style={{ backgroundColor: "#f0fdf4", padding: "8px 16px", borderRadius: "12px", border: "1px solid #bbf7d0", textAlign: "center", minWidth: "80px" }}>
                                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "#16a34a" }}>{loading ? "..." : activeCount} Active</div>
                                </div>
                                <div style={{ backgroundColor: "#eff6ff", padding: "8px 16px", borderRadius: "12px", border: "1px solid #bfdbfe", textAlign: "center", minWidth: "80px" }}>
                                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "#2563eb" }}>{loading ? "..." : modules.length} Total</div>
                                </div>
                            </div>
                            <button
                                onClick={fetchModules}
                                disabled={loading}
                                style={{
                                    border: "none",
                                    background: "#e0f2fe",
                                    color: "#0c4a6e",
                                    padding: "10px 18px",
                                    borderRadius: "12px",
                                    fontSize: "0.875rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <Activity size={16} /> REFRESH
                            </button>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1e293b", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {searchQuery ? `Search Results (${filteredModules.length})` : "Active Registry"}
                        </h2>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <button
                                onClick={fetchModules}
                                disabled={loading}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#2563eb",
                                    fontSize: "0.875rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <Activity size={16} /> REFRESH LIST
                            </button>
                            <div style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>
                                Displaying {filteredModules.length} components
                            </div>
                        </div>
                    </div>

                    {/* Modules Container - Switched from Grid to Flex */}
                    <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "32px",
                        justifyContent: "flex-start"
                    }}>
                        {loading ? (
                            Array(6).fill(0).map((_, i) => (
                                <div key={i} className="skeleton" style={{ height: "240px", borderRadius: "32px", flex: "1 1 400px", maxWidth: "600px" }} />
                            ))
                        ) : filteredModules.length === 0 ? (
                            <div style={{ width: "100%", padding: "120px 40px", textAlign: "center", backgroundColor: "white", borderRadius: "32px", border: "1px dashed #e2e8f0" }}>
                                <div style={{ backgroundColor: "#f8fafc", width: "80px", height: "80px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                                    <Database size={40} color="#cbd5e1" />
                                </div>
                                <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", margin: "0 0 8px" }}>Zero Matches Found</h3>
                                <p style={{ color: "#64748b", fontSize: "1.125rem" }}>Adjust your filters or check the naming convention.</p>
                            </div>
                        ) : (
                            filteredModules.map((m) => {
                                const colors = getModuleColor(m.key);
                                return (
                                    <ModuleCard key={m.id} m={m} colors={colors} icon={getModuleIcon(m.key)} />
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}

function ModuleCard({ m, colors, icon }: { m: CityModule, colors: any, icon: any }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                backgroundColor: "white",
                borderRadius: "32px",
                border: `1px solid ${isHovered ? colors.primary + '40' : '#e2e8f0'}`,
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
                position: "relative",
                overflow: "hidden",
                flex: "1 1 400px",
                maxWidth: "600px",
                transform: isHovered ? "translateY(-8px)" : "translateY(0)",
                transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                boxShadow: isHovered
                    ? "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)"
                    : "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)"
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "20px",
                    backgroundColor: colors.bg,
                    color: colors.primary,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: isHovered ? "scale(1.1) rotate(5deg)" : "scale(1)",
                    transition: "all 0.4s ease",
                    boxShadow: `0 8px 16px -4px ${colors.primary}20`
                }}>
                    {icon}
                </div>
                <div style={{
                    padding: "6px 14px",
                    borderRadius: "99px",
                    backgroundColor: m.enabled ? "#f0fdf4" : "#f1f5f9",
                    color: m.enabled ? "#16a34a" : "#94a3b8",
                    fontSize: "0.7rem",
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    border: `1px solid ${m.enabled ? "#bbf7d0" : "#e2e8f0"}`,
                    letterSpacing: "0.5px"
                }}>
                    <span style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: m.enabled ? "#22c55e" : "#94a3b8",
                        boxShadow: m.enabled ? "0 0 8px #22c55e" : "none"
                    }} />
                    {m.enabled ? "ACTIVE" : "STANDBY"}
                </div>
            </div>

            <div>
                <h3 style={{ fontSize: "1.375rem", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>
                    {moduleLabel(m.key, m.name)}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, padding: "2px 8px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                        {m.key.toUpperCase()}
                    </span>
                    {isHovered && <span style={{ fontSize: "0.7rem", color: colors.primary, fontWeight: 800 }}>• READ ONLY</span>}
                </div>
            </div>

            <div style={{
                marginTop: "auto",
                paddingTop: "24px",
                borderTop: "1px dashed #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "0.8125rem", fontWeight: 600 }}>
                    <div style={{ backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "6px" }}>
                        <Settings size={12} />
                    </div>
                    Core Engine v2.0
                </div>

                <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    backgroundColor: isHovered ? colors.primary + '10' : "#f8fafc",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isHovered ? colors.primary : "#cbd5e1",
                    transition: "all 0.3s ease"
                }}>
                    <ArrowRight size={16} />
                </div>
            </div>

            {/* Subsurface pattern */}
            <div style={{
                position: "absolute",
                right: "-30px",
                top: "-30px",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                backgroundColor: `${colors.primary}05`,
                zIndex: 0,
                transform: isHovered ? "scale(1.5)" : "scale(1)",
                transition: "all 0.8s ease"
            }} />
        </div>
    );
}
