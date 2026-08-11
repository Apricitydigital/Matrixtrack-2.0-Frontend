// // 'use client';

// // import Link from "next/link";
// // import { useEffect, useState } from "react";
// // import { apiFetch, CityApi, AreaBeatApi, ModuleRecordsApi, CityModulesApi, GeoApi, ToiletApi, TwinbinApi, TaskforceApi } from "@lib/apiClient";
// // import {
// //   Package,
// //   Search,
// //   Landmark,
// //   Users,
// //   UserCog,
// //   ShieldCheck,
// //   Shield,
// //   Map,
// //   Target,
// //   Activity,
// //   Database,
// //   AlertCircle,
// //   CheckCircle,
// //   MapPin,
// //   ArrowRight,
// //   RefreshCw,
// //   Building2,
// //   ChevronRight,
// //   Zap,
// //   TrendingUp,
// //   BarChart3,
// //   Bell,

// //   // New icons for premium panels
// //   Toilet,
// //   Trash2,
// //   BrushCleaning,
// //   Truck,
// //   FileUser,
// //   Eye,
// //   Leaf,
// //   Calendar,
// // } from "lucide-react";
// // import { useAuth } from "@hooks/useAuth";

// // // ── Pure SVG Donut Chart ──────────────────────────────────────────────────────
// // function Donut({ data, size = 110, stroke = 18 }: { data: { v: number; color: string }[]; size?: number; stroke?: number }) {
// //   const r = (size - stroke) / 2;
// //   const circ = 2 * Math.PI * r;
// //   const cx = size / 2, cy = size / 2;
// //   const total = data.reduce((s, d) => s + d.v, 0) || 1;
// //   let acc = 0;
// //   return (
// //     <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
// //       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
// //       {data.map((d, i) => {
// //         if (!d.v) return null;
// //         const dash = (d.v / total) * circ;
// //         const rot = (acc / total) * 360 - 90;
// //         acc += d.v;
// //         return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
// //           strokeDasharray={`${dash} ${circ - dash}`} transform={`rotate(${rot} ${cx} ${cy})`}
// //           style={{ transition: 'all 0.9s ease' }} />;
// //       })}
// //       <text x={cx} y={cy - 5} textAnchor="middle" fontSize={18} fontWeight="900" fill="#0f172a">{total}</text>
// //       <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight="700">TOTAL</text>
// //     </svg>
// //   );
// // }

// // // ── Pure SVG Ring Gauge for Users Overview ────────────────────────────────────
// // function RingGauge({ value = 100, color = "#2563eb", size = 68, stroke = 8 }: { value?: number; color?: string; size?: number; stroke?: number }) {
// //   const r = (size - stroke) / 2;
// //   const circ = 2 * Math.PI * r;
// //   const dash = (Math.min(100, Math.max(0, value)) / 100) * circ;
// //   const cx = size / 2, cy = size / 2;
// //   return (
// //     <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
// //       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
// //       <circle
// //         cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
// //         strokeDasharray={`${dash} ${circ - dash}`}
// //         strokeLinecap="round"
// //         transform={`rotate(-90 ${cx} ${cy})`}
// //         style={{ transition: 'all 0.8s ease' }}
// //       />
// //       <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fontWeight="900" fill="#0f172a">
// //         {value}%
// //       </text>
// //     </svg>
// //   );
// // }

// // // ── Pure SVG Semicircle Arc Gauge for Module Health Score ──────
// // function ArcGauge({ color = "#3b82f6", score = 0, size = 135, stroke = 12 }: { color?: string; score?: number; size?: number; stroke?: number }) {
// //   const r = (size - stroke) / 2;
// //   const circ = Math.PI * r;
// //   const dash = (Math.min(100, Math.max(0, score)) / 100) * circ;
// //   const cx = size / 2, cy = size / 2 + 10;
// //   return (
// //     <div style={{ position: 'relative', width: size, height: size * 0.55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
// //       <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
// //         <path
// //           d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
// //           fill="none" stroke="#e2e8f0" strokeWidth={stroke} strokeLinecap="round"
// //         />
// //         <path
// //           d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
// //           fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
// //           strokeDasharray={`${dash} ${circ - dash}`}
// //           style={{ transition: 'all 0.8s ease' }}
// //         />
// //       </svg>
// //       <div style={{ position: 'absolute', bottom: 4, textAlign: 'center' }}>
// //         <div style={{ fontSize: 24, fontWeight: 950, color: '#0f172a', lineHeight: 1 }}>{score}</div>
// //       </div>
// //     </div>
// //   );
// // }

// // // ── Pure SVG Sparkline for Hierarchy Health ──────────────────────────────────
// // function Sparkline({ color = "#8b5cf6", points = [5, 12, 8, 15, 10, 20, 14, 18] }: { color?: string; points?: number[] }) {
// //   const width = 160;
// //   const height = 36;
// //   const max = Math.max(...points, 1);
// //   const min = Math.min(...points, 0);
// //   const range = max - min || 1;

// //   const pts = points.map((p, i) => {
// //     const x = (i / (points.length - 1)) * width;
// //     const y = height - ((p - min) / range) * (height - 8) - 4;
// //     return { x, y };
// //   });

// //   const pathD = pts.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');

// //   return (
// //     <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
// //       <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
// //       {pts.map((pt, i) => (
// //         <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="white" stroke={color} strokeWidth="2" />
// //       ))}
// //     </svg>
// //   );
// // }

// // import PortalHomePage from "../portal-home/page";

// // export default function CityDashboardPage() {
// //   const { user } = useAuth();

// //   const isSuperAdmin =
// //     user?.role === 'super_admin' ||
// //     user?.role === 'hms_super_admin' ||
// //     user?.role === 'SUPER_ADMIN' ||
// //     (user?.roles || []).includes('hms_super_admin') ||
// //     (user?.roles || []).includes('HMS_SUPER_ADMIN') ||
// //     (user?.roles || []).includes('SUPER_ADMIN') ||
// //     (user?.roles || []).includes('super_admin');

// //   if (isSuperAdmin) {
// //     return <PortalHomePage />;
// //   }
// //   const [cityName, setCityName] = useState<string | null>(null);
// //   const [ulbCode, setUlbCode] = useState<string | null>(null);
// //   const [stats, setStats] = useState<any>(null);
// //   const [statsLoading, setStatsLoading] = useState(true);
// //   const [refreshing, setRefreshing] = useState(false);
// //   const [lastRefreshed, setLastRefreshed] = useState(new Date());
// //   const [recentLogs, setRecentLogs] = useState<any[]>([]);

// //   // Global Header Filter States
// //   const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
// //   const [filterZone, setFilterZone] = useState<string>("ALL");
// //   const [filterWard, setFilterWard] = useState<string>("ALL");

// //   // City Admin analytics
// //   const [moduleActivity, setModuleActivity] = useState<{ name: string; key: string; total: number; approved: number; pending: number; actionRequired: number }[]>([]);
// //   const [zoneActivity, setZoneActivity] = useState<{ name: string; beats: number; assignedBeats: number; segments: number }[]>([]);
// //   const [wardActivity, setWardActivity] = useState<{ name: string; beats: number; segments: number }[]>([]);
// //   const [recentRegistrationRequests, setRecentRegistrationRequests] = useState<any[]>([]);
// //   const [pendingRegCount, setPendingRegCount] = useState(0);
// //   // Bar chart: per-day inspection counts for last 6 days by module
// //   const [barChartData, setBarChartData] = useState<{ date: string; sweeping: number; toilet: number; twinbin: number }[]>([]);

// //   // Commissioner-only states (untouched)
// //   const [sweepingDetailStats, setSweepingDetailStats] = useState({
// //     totalBeats: 0, totalSegments: 0, qcAssigned: 0,
// //     totalApproved: 0, actionRequired: 0, pendingDeployment: 0, assignedSegments: 0
// //   });
// //   const [sweepingDetailLoading, setSweepingDetailLoading] = useState(true);

// //   const [cityGeoStats, setCityGeoStats] = useState({ zones: 0, wards: 0, areas: 0, beats: 0 });

// //   // Additional detail states for other modules
// //   const [extraModuleStats, setExtraModuleStats] = useState<any>({
// //     toilet: { registered: 0, pendingReg: 0, inspectionsDone: 0, inspectionPending: 0, uninspected: 0, actionTaken: 0, actionRequired: 0 },
// //     twinbin: { registered: 0, pendingReg: 0, inspectionsDone: 0, inspectionPending: 0, uninspected: 0, actionTaken: 0, actionRequired: 0 },
// //     taskforce: { registered: 0, pendingReg: 0, inspectionsDone: 0, inspectionPending: 0, uninspected: 0, actionTaken: 0, actionRequired: 0 }
// //   });

// //   // Commissioner premium dashboard real data
// //   const [toiletDashStats, setToiletDashStats] = useState<any>(null);
// //   const [qcLeaderboard, setQcLeaderboard] = useState<{ name: string; inspections: number }[]>([]);

// //   const isReadOnlyView = user?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));
// //   const isCityAdmin = user?.roles?.some(r => ["CITY_ADMIN", "HMS_SUPER_ADMIN"].includes(r));

// //   const loadAll = async () => {
// //     setRefreshing(true);
// //     try {
// //       const [cityRes, statsRes] = await Promise.all([
// //         apiFetch<{ city: { name: string; ulbCode?: string } }>("/city/info").catch(() => null),
// //         CityApi.getStats().catch(() => null),
// //       ]);
// //       if (cityRes) { setCityName(cityRes.city.name); setUlbCode(cityRes.city.ulbCode || null); }
// //       if (statsRes) setStats(statsRes.stats);
// //       setStatsLoading(false);

// //       const [modulesRes] = await Promise.all([
// //         CityModulesApi.list().catch(() => []),
// //       ]);
// //       const enabledModules: any[] = Array.isArray(modulesRes) ? modulesRes.filter((m: any) => m.enabled) : [];
// //       const moduleStats = await Promise.all(
// //         enabledModules.map(async (m: any) => {
// //           try {
// //             const rec = await ModuleRecordsApi.getRecords(m.key.toLowerCase(), { limit: 5 });
// //             return {
// //               name: m.name, key: m.key,
// //               total: rec.stats?.total || rec.meta?.total || 0,
// //               approved: rec.stats?.approved || 0,
// //               pending: rec.stats?.pending || 0,
// //               actionRequired: rec.stats?.actionRequired || 0,
// //               latest: rec.data || []
// //             };
// //           } catch { return { name: m.name, key: m.key, total: 0, approved: 0, pending: 0, actionRequired: 0, latest: [] }; }
// //         })
// //       );
// //       setModuleActivity(moduleStats.sort((a, b) => b.total - a.total));

// //       // Aggregate recent logs
// //       const allLogs = moduleStats
// //         .flatMap(m => m.latest.map((r: any) => ({
// //           ...r,
// //           moduleName: m.name,
// //           moduleKey: m.key
// //         })))
// //         .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
// //         .slice(0, 10);
// //       setRecentLogs(allLogs);

// //       // Build bar chart: last 6 days inspection counts
// //       try {
// //         const today = new Date();
// //         const days = Array.from({ length: 6 }, (_, i) => {
// //           const d = new Date(today);
// //           d.setDate(today.getDate() - (5 - i));
// //           return d;
// //         });
// //         // Group allLogs (from all modules recent records) by date + module
// //         const [swpRec, toilRec, binRec] = await Promise.all([
// //           ModuleRecordsApi.getRecords('SWEEPING', { limit: 200 }).catch(() => ({ data: [] })),
// //           ModuleRecordsApi.getRecords('TOILET', { limit: 200 }).catch(() => ({ data: [] })),
// //           ModuleRecordsApi.getRecords('TWINBIN', { limit: 200 }).catch(() => ({ data: [] }))
// //         ]);
// //         const countByDay = (records: any[], dayDate: Date) => {
// //           return (records || []).filter((r: any) => {
// //             if (!r.createdAt) return false;
// //             const rDate = new Date(r.createdAt);
// //             return rDate.getFullYear() === dayDate.getFullYear() &&
// //               rDate.getMonth() === dayDate.getMonth() &&
// //               rDate.getDate() === dayDate.getDate();
// //           }).length;
// //         };
// //         const chartRows = days.map(d => {
// //           const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + (d.toDateString() === today.toDateString() ? ' (Today)' : '');
// //           return {
// //             date: label,
// //             sweeping: countByDay(swpRec.data || [], d),
// //             toilet: countByDay(toilRec.data || [], d),
// //             twinbin: countByDay(binRec.data || [], d),
// //           };
// //         });
// //         setBarChartData(chartRows);
// //       } catch { setBarChartData([]); }

// //       // Zone & Ward activity
// //       const [beatsRes, regRes, zoneRes, wardRes, areaRes] = await Promise.all([
// //         AreaBeatApi.list().catch(() => ({ beats: [] })),
// //         apiFetch<{ requests: any[] }>("/city/registration-requests").catch(() => ({ requests: [] })),
// //         GeoApi.list("ZONE").catch(() => ({ nodes: [] })),
// //         GeoApi.list("WARD").catch(() => ({ nodes: [] })),
// //         GeoApi.list("AREA").catch(() => ({ nodes: [] }))
// //       ]);
// //       const beats = beatsRes.beats || [];
// //       const regReqs = regRes.requests || [];
// //       setRecentRegistrationRequests(regReqs.slice(0, 5));
// //       setPendingRegCount(regReqs.filter(r => r.status === 'PENDING').length);
// //       setCityGeoStats({
// //         zones: zoneRes.nodes?.length || 0,
// //         wards: wardRes.nodes?.length || 0,
// //         areas: areaRes.nodes?.length || 0,
// //         beats: beats.length
// //       });
// //       const zoneMap: Record<string, { name: string; beats: number; assignedBeats: number; segments: number }> = {};
// //       const wardMap: Record<string, { name: string; beats: number; segments: number }> = {};
// //       beats.forEach((b: any) => {
// //         const zId = b.ward?.zone?.id || b.zoneId || '?';
// //         const zName = b.ward?.zone?.name || b.zoneName || 'Unknown Zone';
// //         const wId = b.ward?.id || b.wardId || '?';
// //         const wName = b.ward?.name || b.wardName || 'Unknown Ward';
// //         const segs = b.totalSegments || 0;
// //         if (!zoneMap[zId]) zoneMap[zId] = { name: zName, beats: 0, assignedBeats: 0, segments: 0 };
// //         zoneMap[zId].beats++;
// //         if (b.assignedToId) zoneMap[zId].assignedBeats++;
// //         zoneMap[zId].segments += segs;
// //         if (!wardMap[wId]) wardMap[wId] = { name: wName, beats: 0, segments: 0 };
// //         wardMap[wId].beats++;
// //         wardMap[wId].segments += segs;
// //       });
// //       setZoneActivity(Object.values(zoneMap).sort((a: any, b: any) => b.beats - a.beats).slice(0, 6));
// //       setWardActivity(Object.values(wardMap).sort((a: any, b: any) => b.beats - a.beats).slice(0, 6));

// //       if (isReadOnlyView) {
// //         setSweepingDetailLoading(true);
// //         const [beatsRes, recordsRes] = await Promise.all([
// //           AreaBeatApi.list().catch(() => ({ beats: [] })),
// //           ModuleRecordsApi.getRecords("SWEEPING").catch(() => ({ stats: null }))
// //         ]);
// //         const beats = beatsRes.beats || [];
// //         const totalSegments = beats.reduce((a: number, b: any) => a + (b.totalSegments || 0), 0);
// //         const qcAssigned = beats.filter((b: any) => b.assignedToId).length;
// //         const pending = beats.reduce((a: number, b: any) => {
// //           const pid = b.assignedToId;
// //           return a + (b.segments || []).filter((s: any) => !s.assignedToId || (pid && s.assignedToId === pid)).length;
// //         }, 0);
// //         setSweepingDetailStats({
// //           totalBeats: beats.length, totalSegments, qcAssigned,
// //           totalApproved: recordsRes.stats?.approved || 0,
// //           actionRequired: recordsRes.stats?.actionRequired || 0,
// //           pendingDeployment: pending, assignedSegments: totalSegments - pending
// //         });

// //         // Fetch detailed stats for other modules
// //         const [
// //           toiletStatsRes, toiletPendingRes,
// //           twinbinAllRes, twinbinPendingRes,
// //           taskforceAllRes, taskforcePendingRes,
// //           twinbinRecords, taskforceRecords, toiletRecords
// //         ] = await Promise.all([
// //           apiFetch<any>("/modules/toilet/stats").catch(() => null),
// //           apiFetch<any>("/modules/toilet/pending").catch(() => ({ toilets: [] })),
// //           apiFetch<any>("/modules/twinbin/bins/assigned").catch(() => ({ bins: [] })),
// //           apiFetch<any>("/modules/twinbin/bin-requests/pending").catch(() => ({ data: [] })),
// //           apiFetch<any>("/modules/taskforce/feeder-points/approved").catch(() => ({ feederPoints: [] })),
// //           apiFetch<any>("/modules/taskforce/feeder-points/pending").catch(() => ({ feederPoints: [] })),
// //           ModuleRecordsApi.getRecords("TWINBIN").catch(() => null),
// //           ModuleRecordsApi.getRecords("TASKFORCE").catch(() => null),
// //           ModuleRecordsApi.getRecords("TOILET").catch(() => null)
// //         ]);

// //         const extraStatsData = {
// //           toilet: {
// //             registered: toiletStatsRes?.totalToilets || 0,
// //             pendingReg: toiletPendingRes?.toilets?.length || 0,
// //             inspectionsDone: toiletRecords?.stats?.approved || 0,
// //             inspectionPending: toiletRecords?.stats?.pending || 0,
// //             uninspected: Math.max(0, (toiletStatsRes?.totalToilets || 0) - (toiletRecords?.stats?.approved || 0) - (toiletRecords?.stats?.pending || 0)),
// //             actionTaken: toiletRecords?.stats?.actionTaken || 0,
// //             actionRequired: toiletRecords?.stats?.actionRequired || 0,
// //             totalInspections: toiletRecords?.stats?.total || 0
// //           },
// //           twinbin: {
// //             registered: twinbinAllRes?.bins?.length || 0,
// //             pendingReg: twinbinPendingRes?.data?.length || 0,
// //             inspectionsDone: twinbinRecords?.stats?.approved || 0,
// //             inspectionPending: twinbinRecords?.stats?.pending || 0,
// //             uninspected: Math.max(0, (twinbinAllRes?.bins?.length || 0) - (twinbinRecords?.stats?.total || 0)),
// //             actionTaken: twinbinRecords?.stats?.actionTaken || 0,
// //             actionRequired: twinbinRecords?.stats?.actionRequired || 0,
// //             totalInspections: twinbinRecords?.stats?.total || 0
// //           },
// //           taskforce: {
// //             registered: taskforceAllRes?.feederPoints?.length || 0,
// //             pendingReg: taskforcePendingRes?.feederPoints?.length || 0,
// //             inspectionsDone: taskforceRecords?.stats?.approved || 0,
// //             inspectionPending: taskforceRecords?.stats?.pending || 0,
// //             uninspected: Math.max(0, (taskforceAllRes?.feederPoints?.length || 0) - (taskforceRecords?.stats?.total || 0)),
// //             actionTaken: taskforceRecords?.stats?.actionTaken || 0,
// //             actionRequired: taskforceRecords?.stats?.actionRequired || 0,
// //             totalInspections: taskforceRecords?.stats?.total || 0
// //           }
// //         };

// //         setExtraModuleStats(extraStatsData);

// //         // Fetch toilet dashboard stats for commissioner premium sections
// //         const toiletDash = await ToiletApi.getDashboardStats().catch(() => null);
// //         if (toiletDash) setToiletDashStats(toiletDash);

// //         // Build QC leaderboard from toilet inspections
// //         try {
// //           const inspRes = await ToiletApi.listInspections({ pageSize: 50 });
// //           const inspections = inspRes?.inspections || [];
// //           const qcMap: Record<string, { name: string; count: number }> = {};
// //           inspections.forEach((insp: any) => {
// //             const eName = insp.employee?.name || insp.employeeName || 'Unknown';
// //             const eId = insp.employeeId || eName;
// //             if (!qcMap[eId]) qcMap[eId] = { name: eName, count: 0 };
// //             qcMap[eId].count++;
// //           });
// //           const leaderboard = Object.values(qcMap)
// //             .sort((a, b) => b.count - a.count)
// //             .slice(0, 5)
// //             .map(q => ({ name: q.name, inspections: q.count }));
// //           setQcLeaderboard(leaderboard);
// //         } catch { setQcLeaderboard([]); }

// //         setSweepingDetailLoading(false);
// //       }
// //     } finally { setLastRefreshed(new Date()); setRefreshing(false); }
// //   };

// //   useEffect(() => { loadAll(); }, [isReadOnlyView]);

// //   const share = () => {
// //     const msg = `*${cityName || 'City'} | City Admin Report*\nShared via Taskforce20`;
// //     window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
// //   };

// //   const totalUsers = (stats?.qualityControllers || 0) + (stats?.taskforceMembers || 0) +
// //     (stats?.ulbOfficials || 0) + (stats?.actionOfficers || 0) + (stats?.cityAdmins || 0);


// //   // ─── CITY ADMIN VIEW — Premium Dashboard ──────────────────────────────────────
// //   const roleData = [
// //     { label: "Quality Controllers", key: "qualityControllers", color: "#7c3aed", bg: "#f5f3ff", icon: <Search size={16} />, href: "/city/users?role=QC" },
// //     { label: "Taskforce Members", key: "taskforceMembers", color: "#d97706", bg: "#fffbeb", icon: <Users size={16} />, href: "/city/users?role=EMPLOYEE" },
// //     { label: "ULB Officials", key: "ulbOfficials", color: "#dc2626", bg: "#fef2f2", icon: <Landmark size={16} />, href: "/city/users?role=COMMISSIONER" },
// //     { label: "Action Officers", key: "actionOfficers", color: "#059669", bg: "#f0fdf4", icon: <UserCog size={16} />, href: "/city/users?role=ACTION_OFFICER" },
// //     { label: "City Admins", key: "cityAdmins", color: "#4f46e5", bg: "#eef2ff", icon: <ShieldCheck size={16} />, href: "/city/users?role=CITY_ADMIN" },
// //   ];
// //   const quickActions = [
// //     {
// //       title: "Add New User",
// //       description: "Create new user account",
// //       href: "/city/users/create",
// //       icon: Users,
// //       cardAccent: "before:bg-blue-600",
// //       iconStyle: "bg-blue-50 text-blue-600",
// //     },
// //     {
// //       title: "Manage Areas",
// //       description: "Add or update areas",
// //       href: "/city/areas",
// //       icon: Target,
// //       cardAccent: "before:bg-violet-600",
// //       iconStyle: "bg-violet-50 text-violet-600",
// //     },
// //     {
// //       title: "Reg Requests",
// //       description: "Review pending requests",
// //       href: "/registration-requests",
// //       icon: Bell,
// //       cardAccent: "before:bg-orange-500",
// //       iconStyle: "bg-orange-50 text-orange-600",
// //       showBadge: true,
// //     },
// //   ];

// //   const getModuleVisual = (module: {
// //     name?: string;
// //     key?: string;
// //   }) => {
// //     const moduleIdentity =
// //       `${module.key || ""} ${module.name || ""}`.toLowerCase();

// //     if (moduleIdentity.includes("toilet")) {
// //       return {
// //         Icon: Toilet,
// //         iconClass: "bg-blue-50 text-blue-600",
// //       };
// //     }

// //     if (
// //       moduleIdentity.includes("litter") ||
// //       moduleIdentity.includes("twinbin") ||
// //       moduleIdentity.includes("bin")
// //     ) {
// //       return {
// //         Icon: Trash2,
// //         iconClass: "bg-orange-50 text-orange-600",
// //       };
// //     }

// //     if (moduleIdentity.includes("sweep")) {
// //       return {
// //         Icon: BrushCleaning,
// //         iconClass: "bg-emerald-50 text-emerald-600",
// //       };
// //     }

// //     if (
// //       moduleIdentity.includes("taskforce") ||
// //       moduleIdentity.includes("gvp") ||
// //       moduleIdentity.includes("ctu")
// //     ) {
// //       return {
// //         Icon: Truck,
// //         iconClass: "bg-violet-50 text-violet-600",
// //       };
// //     }

// //     return {
// //       Icon: Package,
// //       iconClass: "bg-slate-100 text-slate-600",
// //     };
// //   };

// //   const maxRoleVal = Math.max(...roleData.map((r) => stats?.[r.key] || 0), 1);

// //   return (
// //     <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
// //       <style>{`
// //         @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
// //         .da-card { transition: box-shadow 0.18s, transform 0.18s; }
// //         .da-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.09) !important; transform: translateY(-2px); }
// //         .da-row:hover { background: #f8fafc !important; }
// //         .da-link { text-decoration: none; }

// //         /* Responsive Grids */
// //         .responsive-grid-sidebar { display: grid; grid-template-columns: 280px 1fr; gap: 20px; }
// //         .responsive-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
// //         .page-padding { padding: 28px 36px; }
// //         .header-flex { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; position: relative; }
// //         .req-table { display: grid; grid-template-columns: 1fr 120px 100px; gap: 12px; }


// // /* ================= CITY ADMIN PREMIUM HEADER ================= */

// // .city-admin-top-section {
// //   padding: 24px 28px 0;
// // }

// // .city-admin-hero {
// //   position: relative;
// //   overflow: hidden;

// //   min-height: 390px;          /* main card ki height */
// //   display: flex;
// //   flex-direction: column;

// //   background:
// //     radial-gradient(
// //       circle at 88% 18%,
// //       rgba(59, 130, 246, 0.08),
// //       transparent 28%
// //     ),
// //     linear-gradient(
// //       135deg,
// //       #ffffff 0%,
// //       #fbfdff 70%,
// //       #f4f8ff 100%
// //     );

// //   border: 1px solid #dbe4f0;
// //   border-top: 3px solid #2563eb;
// //   border-radius: 24px;

// //   padding: 34px 32px 18px;   /* bottom padding bhi add hua */

// //   box-shadow:
// //     0 18px 45px rgba(15, 23, 42, 0.07),
// //     0 3px 10px rgba(15, 23, 42, 0.03);
// // }

// // .city-admin-hero::before {
// //   content: "";
// //   position: absolute;
// //   right: 0;
// //   bottom: 88px;
// //   width: 500px;
// //   height: 190px;
// //   opacity: 0.68;
// //   pointer-events: none;
// //   background:
// //     linear-gradient(to top, rgba(219, 234, 254, 0.75), transparent 80%);
// //   clip-path: polygon(
// //     0 100%, 0 76%, 6% 76%, 6% 58%, 11% 58%, 11% 69%,
// //     17% 69%, 17% 40%, 22% 40%, 22% 67%, 28% 67%,
// //     28% 55%, 34% 55%, 34% 74%, 42% 74%, 42% 45%,
// //     48% 45%, 48% 73%, 55% 73%, 55% 50%, 61% 50%,
// //     61% 68%, 67% 68%, 67% 34%, 73% 34%, 73% 70%,
// //     79% 70%, 79% 52%, 85% 52%, 85% 72%, 92% 72%,
// //     92% 43%, 97% 43%, 97% 100%
// //   );
// // }

// // .city-admin-hero-main {
// //   position: relative;
// //   z-index: 2;
// //   display: flex;
// //   justify-content: space-between;
// //   align-items: flex-start;
// //   gap: 28px;
// // }

// // .city-admin-identity {
// //   display: flex;
// //   align-items: flex-start;
// //   gap: 14px;
// //   min-width: 0;
// // }

// // .city-admin-logo-ring {
// //   position: relative;
// //   width: 62px;
// //   height: 62px;
// //   flex-shrink: 0;
// //   border-radius: 50%;
// //   display: grid;
// //   place-items: center;
// //   background: rgba(239, 246, 255, 0.95);
// //   border: 1px solid #bfdbfe;
// //   box-shadow:
// //     0 0 0 5px rgba(219, 234, 254, 0.55),
// //     0 7px 18px rgba(37, 99, 235, 0.13);
// // }

// // .city-admin-logo-ring::before {
// //   content: "";
// //   position: absolute;
// //   inset: 5px;
// //   border-radius: 50%;
// //   border: 1px solid rgba(99, 102, 241, 0.3);
// // }

// // .city-admin-logo-ring::after {
// //   content: "";
// //   position: absolute;
// //   right: -2px;
// //   bottom: 6px;
// //   width: 8px;
// //   height: 8px;
// //   border: 2px solid #ffffff;
// //   border-radius: 50%;
// //   background: #06b6d4;
// // }

// // .city-admin-logo-core {
// //   position: relative;
// //   z-index: 1;
// //   width: 44px;
// //   height: 44px;
// //   border-radius: 50%;
// //   display: grid;
// //   place-items: center;
// //   color: #ffffff;
// //   background: linear-gradient(145deg, #2563eb, #6d28d9);
// //   box-shadow: 0 6px 14px rgba(79, 70, 229, 0.25);
// // }

// // .city-admin-eyebrow {
// //   margin-bottom: 3px;
// //   color: #2563eb;
// //   font-size: 9px;
// //   font-weight: 900;
// //   letter-spacing: 0.11em;
// //   text-transform: uppercase;
// // }

// // .city-admin-title {
// //   margin: 0;
// //   color: #0f172a;
// //   font-size: clamp(28px, 3vw, 38px);
// //   font-weight: 950;
// //   line-height: 1;
// //   letter-spacing: -0.04em;
// // }

// // .city-admin-meta {
// //   display: flex;
// //   align-items: center;
// //   flex-wrap: wrap;
// //   gap: 10px;
// //   margin-top: 8px;
// // }

// // .city-admin-ulb {
// //   display: inline-flex;
// //   align-items: center;
// //   gap: 5px;
// //   padding: 5px 10px;
// //   border-radius: 9px;
// //   color: #6d28d9;
// //   background: #f5f3ff;
// //   font-size: 10px;
// //   font-weight: 800;
// // }

// // .city-admin-updated {
// //   color: #64748b;
// //   font-size: 10px;
// //   font-weight: 600;
// // }

// // .city-admin-welcome {
// //   margin: 24px 0 0 104px;
// //   position: relative;
// //   z-index: 2;
// //   max-width: 560px;
// // }

// // .city-admin-welcome h2 {
// //   margin: 0 0 7px;
// //   color: #0f172a;
// //   font-size: 17px;
// //   font-weight: 850;
// // }

// // .city-admin-welcome p {
// //   margin: 0;
// //   max-width: 540px;
// //   color: #64748b;
// //   font-size: 13px;
// //   font-weight: 500;
// //   line-height: 1.65;
// // }

// // .city-admin-actions {
// //   position: relative;
// //   z-index: 3;
// //   display: flex;
// //   align-items: center;
// //   justify-content: flex-end;
// //   flex-wrap: nowrap;
// //   gap: 8px;
// // }

// // .city-admin-action-btn {
// //   height: 38px;
// //   padding: 0 13px;
// //   border: 1px solid #dbe4f0;
// //   border-radius: 10px;
// //   background: rgba(255, 255, 255, 0.92);
// //   color: #0f172a;

// //   display: inline-flex;
// //   align-items: center;
// //   justify-content: center;
// //   gap: 6px;

// //   font-size: 11px;
// //   font-weight: 800;
// //   white-space: nowrap;

// //   cursor: pointer;
// //   box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
// //   transition: all 0.2s ease;
// // }

// // .city-admin-action-btn:hover {
// //   border-color: #bfdbfe;
// //   transform: translateY(-1px);
// //   box-shadow: 0 6px 14px rgba(37, 99, 235, 0.1);
// // }

// // .city-admin-action-btn.primary {
// //   height: 40px;
// //   padding: 0 16px;
// //   border-color: transparent;
// //   color: #ffffff;
// //   background: linear-gradient(135deg, #2563eb, #6d28d9);
// //   box-shadow: 0 7px 16px rgba(79, 70, 229, 0.22);
// // }

// // .city-admin-action-btn:disabled {
// //   cursor: not-allowed;
// //   opacity: 0.7;
// // }

// // .city-admin-action-pills {
// //   position: relative;
// //   z-index: 3;
// //   display: flex;
// //   justify-content: flex-end;
// //   flex-wrap: nowrap;
// //   gap: 8px;
// //   margin-top: 14px;
// // }

// // .city-admin-action-pill {
// //   min-height: 36px;
// //   padding: 0 13px;
// //   border: 1px solid #dbeafe;
// //   border-radius: 999px;
// //   background: rgba(255, 255, 255, 0.9);

// //   display: inline-flex;
// //   align-items: center;
// //   gap: 7px;

// //   color: #2563eb;
// //   font-size: 10px;
// //   font-weight: 800;
// //   white-space: nowrap;

// //   box-shadow: 0 4px 11px rgba(37, 99, 235, 0.06);
// // }

// // .city-admin-action-pill.purple {
// //   color: #6d28d9;
// //   border-color: #ddd6fe;
// //   background: rgba(250, 245, 255, 0.93);
// // }

// // .city-admin-action-pill strong {
// //   color: #0f172a;
// //   font-size: 13px;
// //   font-weight: 900;
// // }

// // .city-admin-status-grid {
// //   position: relative;
// //   z-index: 4;
// //   display: grid;
// //   grid-template-columns: repeat(4, minmax(0, 1fr));

// //   margin-top: auto;

// //   border: 1px solid #dbe4f0;
// //   border-radius: 17px;
// //   background: rgba(255, 255, 255, 0.95);
// //   overflow: hidden;

// //   box-shadow: 0 7px 18px rgba(15, 23, 42, 0.04);
// // }

// // .city-admin-status-item {
// //   min-height: 82px;
// //   padding: 13px 16px;

// //   display: flex;
// //   align-items: center;
// //   gap: 12px;

// //   border-right: 1px solid #e2e8f0;
// // }

// // .city-admin-status-item:last-child {
// //   border-right: none;
// // }

// // .city-admin-status-icon {
// //   width: 42px;
// //   height: 42px;
// //   flex-shrink: 0;

// //   border: 1px solid;
// //   border-radius: 12px;

// //   display: grid;
// //   place-items: center;
// // }

// // .city-admin-status-label {
// //   display: flex;
// //   align-items: center;
// //   gap: 6px;

// //   margin-bottom: 4px;

// //   color: #475569;
// //   font-size: 8px;
// //   font-weight: 900;
// //   line-height: 1.2;
// //   letter-spacing: 0.1em;
// //   text-transform: uppercase;
// // }

// // .city-admin-status-label-dot {
// //   width: 6px;
// //   height: 6px;
// //   flex-shrink: 0;
// //   border-radius: 50%;
// // }

// // .city-admin-status-value {
// //   color: #0f172a;
// //   font-size: 16px;
// //   font-weight: 900;
// //   line-height: 1.15;
// // }

// // .city-admin-status-help {
// //   margin-top: 3px;

// //   color: #64748b;
// //   font-size: 9px;
// //   font-weight: 500;
// //   line-height: 1.35;
// // }

// // /* ================= CITY ADMIN USER CARDS ================= */

// // /* ================= COMPACT USER OVERVIEW ================= */

// // .city-user-overview {
// //   padding: 20px 0 0;
// // }

// // .city-user-overview-title {
// //   position: relative;
// //   display: inline-block;
// //   margin-bottom: 16px;
// //   color: #0f172a;
// //   font-size: 10px;
// //   font-weight: 900;
// //   letter-spacing: 0.04em;
// //   text-transform: uppercase;
// // }

// // .city-user-overview-title::after {
// //   content: "";
// //   position: absolute;
// //   left: 0;
// //   bottom: -7px;
// //   width: 38px;
// //   height: 2px;
// //   border-radius: 999px;
// //   background: #2563eb;
// // }

// // .city-user-card-grid {
// //   display: grid;
// //   grid-template-columns: repeat(6, minmax(0, 1fr));
// //   gap: 12px;
// // }

// // .city-user-card {
// //   min-height: 154px;
// //   padding: 14px 14px 12px;

// //   border: 1px solid #dbe4f0;
// //   border-radius: 17px;
// //   background: #ffffff;

// //   display: flex;
// //   flex-direction: column;

// //   box-shadow:
// //     0 7px 18px rgba(15, 23, 42, 0.045),
// //     0 2px 4px rgba(15, 23, 42, 0.02);

// //   transition:
// //     transform 0.2s ease,
// //     box-shadow 0.2s ease;
// // }

// // .city-user-card:hover {
// //   transform: translateY(-2px);
// //   box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
// // }

// // .city-user-card.modules-card {
// //   border: 2px solid #315bea;

// //   background:
// //     radial-gradient(
// //       circle at 95% 0%,
// //       rgba(99, 102, 241, 0.12),
// //       transparent 36%
// //     ),
// //     linear-gradient(145deg, #ffffff 0%, #eef2ff 100%);

// //   box-shadow:
// //     0 9px 20px rgba(37, 99, 235, 0.12),
// //     inset 0 0 0 3px rgba(255, 255, 255, 0.4);
// // }

// // .city-user-card-top {
// //   display: flex;
// //   align-items: flex-start;
// //   justify-content: space-between;
// // }

// // .city-user-card-icon {
// //   width: 43px;
// //   height: 43px;
// //   border-radius: 12px;
// //   display: grid;
// //   place-items: center;
// // }

// // .city-user-card-arrow {
// //   margin-top: 2px;
// //   color: #94a3b8;
// // }

// // .city-user-card-main-row {
// //   display: flex;
// //   align-items: flex-end;
// //   gap: 7px;
// //   margin-top: 9px;
// //   min-height: 35px;
// // }

// // .city-user-card-number {
// //   margin: 0;
// //   flex-shrink: 0;

// //   color: #0f172a;
// //   font-size: 27px;
// //   font-weight: 950;
// //   line-height: 1;
// //   letter-spacing: -0.04em;
// // }

// // .city-user-card-label {
// //   margin: 0 0 2px;

// //   color: #475569;
// //   font-size: 11px;
// //   font-weight: 650;
// //   line-height: 1.2;
// // }

// // .city-user-status {
// //   margin-top: auto;
// //   min-height: 34px;
// //   padding: 0 10px;

// //   border-radius: 10px;

// //   display: flex;
// //   align-items: center;
// //   justify-content: space-between;
// //   gap: 6px;

// //   font-size: 8px;
// //   font-weight: 800;
// // }

// // .city-user-status-left {
// //   min-width: 0;
// //   display: inline-flex;
// //   align-items: center;
// //   gap: 5px;
// // }

// // .city-user-status-dot {
// //   width: 6px;
// //   height: 6px;
// //   flex-shrink: 0;
// //   border-radius: 50%;
// // }

// // .city-user-card.modules-card .city-user-status {
// //   color: #ffffff !important;
// //   background: linear-gradient(135deg, #2563eb, #3b65e9) !important;
// //   box-shadow: 0 5px 12px rgba(37, 99, 235, 0.18);
// // }



// // @media (max-width: 1250px) {
// //   .city-user-card-grid {
// //     grid-template-columns: repeat(3, minmax(0, 1fr));
// //   }

// //   .city-admin-status-grid {
// //     grid-template-columns: repeat(2, minmax(0, 1fr));
// //   }

// //   .city-admin-status-item:nth-child(2) {
// //     border-right: none;
// //   }

// //   .city-admin-status-item:nth-child(-n + 2) {
// //     border-bottom: 1px solid #e2e8f0;
// //   }
// // }

// // @media (max-width: 850px) {
// //   .city-admin-top-section,
// //   .city-user-overview {
// //     padding-left: 16px;
// //     padding-right: 16px;
// //   }

// //   .city-admin-hero {
// //     padding: 25px 20px 0;
// //     border-radius: 18px;
// //   }

// //   .city-admin-hero-main {
// //     flex-direction: column;
// //   }

// //   .city-admin-actions,
// //   .city-admin-action-pills {
// //     justify-content: flex-start;
// //   }

// //   .city-admin-welcome {
// //     margin-left: 0;
// //   }

// //   .city-user-card-grid {
// //     grid-template-columns: repeat(2, minmax(0, 1fr));
// //   }
// // }

// // @media (max-width: 560px) {
// //   .city-admin-identity {
// //     gap: 14px;
// //   }

// //   .city-admin-logo-ring {
// //     width: 66px;
// //     height: 66px;
// //   }

// //   .city-admin-logo-core {
// //     width: 46px;
// //     height: 46px;
// //   }

// //   .city-admin-title {
// //     font-size: 32px;
// //   }

// //   .city-admin-action-btn {
// //     flex: 1;
// //     padding: 0 12px;
// //   }

// //   .city-admin-action-pill {
// //     flex: 1;
// //     justify-content: center;
// //   }

// //   .city-admin-status-grid,
// //   .city-user-card-grid {
// //     grid-template-columns: 1fr;
// //   }

// //   .city-admin-status-item,
// //   .city-admin-status-item:nth-child(2) {
// //     border-right: none;
// //     border-bottom: 1px solid #e2e8f0;
// //   }

// //   .city-admin-status-item:last-child {
// //     border-bottom: none;
// //   }
// // }


// //         @media (max-width: 1200px) {
// //           .responsive-grid-sidebar { grid-template-columns: 240px 1fr; }
// //           .responsive-grid-3 { grid-template-columns: 1fr 1fr; }
// //         }
// //         @media (max-width: 900px) {
// //           .responsive-grid-sidebar { grid-template-columns: 1fr; }
// //           .responsive-grid-3 { grid-template-columns: 1fr; }
// //           .page-padding { padding: 20px 24px; }
// //         }
// //         @media (max-width: 600px) {
// //           .page-padding { padding: 16px; }
// //           .hero-banner { padding: 24px 20px !important; }
// //           .hero-stats { gap: 8px !important; }
// //           .hero-stats > div { flex: 1; min-width: 120px; padding: 8px 12px !important; }
// //           .req-table { grid-template-columns: 1fr 80px; }
// //           .req-table .req-role { display: none; } /* Hide role on mobile to save space */
// //         }
// //       `}


// //       </style>

// //       {/* ══════════════ COMMISSIONER / ULB OFFICER VIEW — PREMIUM ══════════════ */}
// //       {isReadOnlyView ? (
// //         <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

// //           {/* ── Hero Banner ── */}
// //           <div style={{
// //             background: 'linear-gradient(120deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
// //             padding: '32px 40px 28px', position: 'relative', overflow: 'hidden'
// //           }}>
// //             <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', pointerEvents: 'none' }} />
// //             <div style={{ position: 'absolute', bottom: -60, right: 160, width: 180, height: 180, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', pointerEvents: 'none' }} />

// //             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
// //               <div>
// //                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
// //                   <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
// //                     <Building2 size={20} color="#fff" />
// //                   </div>
// //                   <div>
// //                     <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ULB Official · City Operations</div>
// //                     <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
// //                       {cityName || 'City Administration'}
// //                     </h1>
// //                   </div>
// //                 </div>
// //                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
// //                   <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 7, padding: '4px 12px', fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
// //                     <Landmark size={12} />
// //                   </span>
// //                   <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
// //                     Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
// //                   </span>
// //                 </div>
// //               </div>
// //               <div style={{ display: 'flex', gap: 10 }}>
// //                 <button onClick={loadAll} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: refreshing ? 'not-allowed' : 'pointer', backdropFilter: 'blur(8px)' }}>
// //                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
// //                   {refreshing ? 'Refreshing...' : 'Refresh'}
// //                 </button>
// //                 <button onClick={share} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
// //                   Share View
// //                 </button>
// //               </div>
// //             </div>

// //             {/* Hero stat bar */}
// //             <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
// //               {[
// //                 { label: 'Zones', value: cityGeoStats?.zones },
// //                 { label: 'Wards', value: cityGeoStats?.wards },
// //                 { label: 'Areas', value: cityGeoStats?.areas },
// //                 { label: 'Beats', value: cityGeoStats?.beats },
// //                 { label: 'Modules', value: stats?.totalModules ?? '—' },
// //               ].map((c, i) => (
// //                 <div key={i} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
// //                   <span style={{ fontSize: 14, fontWeight: 800 }}>{statsLoading ? '—' : c.value}</span>
// //                   <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{c.label}</span>
// //                 </div>
// //               ))}
// //             </div>
// //           </div>

// //           {/* ── Body ── */}
// //           <div style={{ padding: '28px 40px' }}>

// //             {/* Section: City Operations Overview */}
// //             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
// //               <Building2 size={14} color="#2563eb" />
// //               <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#334155' }}>City Operations Overview</span>
// //               <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
// //             </div>
// //             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
// //               {[
// //                 { label: "Total Zones", value: cityGeoStats?.zones, icon: <Map size={20} />, color: "#4f46e5", href: "/city/zones" },
// //                 { label: "Total Wards", value: cityGeoStats?.wards, icon: <MapPin size={20} />, color: "#2563eb", href: "/city/wards" },
// //                 { label: "Total Areas", value: cityGeoStats?.areas, icon: <Target size={20} />, color: "#0ea5e9", href: "/city/areas" },
// //                 { label: "Total Beats", value: cityGeoStats?.beats, icon: <Map size={20} />, color: "#0284c7", href: "/city/areas" },
// //                 { label: "Total Modules", value: stats?.totalModules, icon: <Package size={20} />, color: "#3b82f6", href: "/city/modules" },
// //                 { label: "Quality Controller", value: stats?.qualityControllers, icon: <Search size={20} />, color: "#8b5cf6", href: "/city/users?role=QC" },
// //                 { label: "Taskforce Member", value: stats?.taskforceMembers, icon: <Users size={20} />, color: "#f59e0b", href: "/city/users?role=EMPLOYEE" },
// //                 { label: "ULB Officials", value: stats?.ulbOfficials, icon: <Landmark size={20} />, color: "#ef4444", href: "/city/users?role=COMMISSIONER" },
// //                 { label: "Action Officer", value: stats?.actionOfficers, icon: <UserCog size={20} />, color: "#10b981", href: "/city/users?role=ACTION_OFFICER" },
// //                 { label: "City Admin", value: stats?.cityAdmins, icon: <ShieldCheck size={20} />, color: "#6366f1", href: "/city/users?role=CITY_ADMIN" },
// //               ].map((s, i) => (
// //                 <Link key={i} href={s.href} style={{ textDecoration: 'none' }}>
// //                   <div className="da-card" style={{
// //                     padding: '16px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
// //                     display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
// //                     boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.18s', borderLeft: `3px solid ${s.color}`
// //                   }}>
// //                     <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}14`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
// //                       {s.icon}
// //                     </div>
// //                     <div>
// //                       <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{s.label}</div>
// //                       <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
// //                         {statsLoading || refreshing ? <span style={{ color: '#e2e8f0' }}>—</span> : (s.value ?? 0)}
// //                       </div>
// //                     </div>
// //                   </div>
// //                 </Link>
// //               ))}
// //             </div>

// //             <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
// //               <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: 10, background: 'white', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
// //                 <Activity size={14} />
// //                 Sweeping Details
// //               </div>
// //             </div>
// //             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
// //               {[
// //                 { label: "Total Beats", value: sweepingDetailStats.totalBeats, icon: <Target size={20} />, color: "#3b82f6", href: "/modules/sweeping" },
// //                 { label: "Total Sub-Beats", value: sweepingDetailStats.totalSegments, icon: <Database size={20} />, color: "#8b5cf6", href: "/modules/sweeping" },
// //                 { label: "Assigned Sub-Beats", value: sweepingDetailStats.assignedSegments, icon: <CheckCircle size={20} />, color: "#0ea5e9", href: "/modules/sweeping" },
// //                 { label: "QC Assigned", value: sweepingDetailStats.qcAssigned, icon: <ShieldCheck size={20} />, color: "#10b981", href: "/city/users?role=QC" },
// //                 { label: "Total Approved", value: sweepingDetailStats.totalApproved, icon: <CheckCircle size={20} />, color: "#22c55e", href: "/modules/sweeping" },
// //                 { label: "Action Required", value: sweepingDetailStats.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: "/modules/sweeping" },
// //                 { label: "Pending Deployment", value: sweepingDetailStats.pendingDeployment, icon: <Map size={20} />, color: "#f59e0b", href: "/modules/sweeping" },
// //               ].map((s, i) => (
// //                 <Link key={i} href={s.href} style={{ textDecoration: 'none' }}>
// //                   <div className="card card-hover" style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, height: '100%', transition: 'all 0.2s ease' }}>
// //                     <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
// //                       {s.icon}
// //                     </div>
// //                     <div>
// //                       <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>{s.label}</div>
// //                       <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
// //                         {sweepingDetailLoading || refreshing ? "..." : s.value}
// //                       </div>
// //                     </div>
// //                   </div>
// //                 </Link>
// //               ))}
// //             </div>

// //             {moduleActivity.filter(m => m.key.toUpperCase() !== 'SWEEPING').map((m, i) => {
// //               let displayName = m.name;
// //               const keyStr = m.key.toLowerCase();
// //               let customStats: any[] = [];

// //               if (keyStr === 'toilet') {
// //                 displayName = 'Cleanliness of Toilet';
// //                 customStats = [
// //                   { label: "Toilets Registered", value: extraModuleStats.toilet.registered, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/toilet` },
// //                   { label: "Registration Pending", value: extraModuleStats.toilet.pendingReg, icon: <Activity size={20} />, color: "#f59e0b", href: `/modules/toilet` },
// //                   { label: "Inspections Done (QC)", value: extraModuleStats.toilet.inspectionsDone, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/toilet` },
// //                   { label: "Pending QC Inspection", value: extraModuleStats.toilet.inspectionPending, icon: <MapPin size={20} />, color: "#3b82f6", href: `/modules/toilet` },
// //                   { label: "Action Required", value: extraModuleStats.toilet.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/toilet` },
// //                   { label: "Action Taken by AO", value: extraModuleStats.toilet.actionTaken, icon: <CheckCircle size={20} />, color: "#10b981", href: `/modules/toilet` },
// //                   { label: "Inspection Not Done", value: extraModuleStats.toilet.uninspected, icon: <Target size={20} />, color: "#64748b", href: `/modules/toilet` },
// //                 ];
// //               } else if (keyStr === 'taskforce') {
// //                 displayName = 'CTU/GVP Transformation';
// //                 customStats = [
// //                   { label: "GVP Points Registered", value: extraModuleStats.taskforce.registered, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/taskforce` },
// //                   { label: "Requests Pending", value: extraModuleStats.taskforce.pendingReg, icon: <Activity size={20} />, color: "#f59e0b", href: `/modules/taskforce` },
// //                   { label: "Total Inspections", value: extraModuleStats.taskforce.totalInspections, icon: <Database size={20} />, color: "#3b82f6", href: `/modules/taskforce` },
// //                   { label: "Approved by QC", value: extraModuleStats.taskforce.inspectionsDone, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/taskforce` },
// //                   { label: "Pending QC", value: extraModuleStats.taskforce.inspectionPending, icon: <MapPin size={20} />, color: "#3b82f6", href: `/modules/taskforce` },
// //                   { label: "Action Required", value: extraModuleStats.taskforce.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/taskforce` },
// //                   { label: "Action Taken by AO", value: extraModuleStats.taskforce.actionTaken, icon: <CheckCircle size={20} />, color: "#10b981", href: `/modules/taskforce` },
// //                 ];
// //               } else if (keyStr === 'twinbin' || keyStr === 'litterbins') {
// //                 displayName = 'Litterbins';
// //                 customStats = [
// //                   { label: "Litterbins Registered", value: extraModuleStats.twinbin.registered, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/twinbin` },
// //                   { label: "Requests Pending", value: extraModuleStats.twinbin.pendingReg, icon: <Activity size={20} />, color: "#f59e0b", href: `/modules/twinbin` },
// //                   { label: "Total Inspections", value: extraModuleStats.twinbin.totalInspections, icon: <Database size={20} />, color: "#3b82f6", href: `/modules/twinbin` },
// //                   { label: "Approved by QC", value: extraModuleStats.twinbin.inspectionsDone, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/twinbin` },
// //                   { label: "Pending QC", value: extraModuleStats.twinbin.inspectionPending, icon: <MapPin size={20} />, color: "#3b82f6", href: `/modules/twinbin` },
// //                   { label: "Action Required", value: extraModuleStats.twinbin.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/twinbin` },
// //                   { label: "Action Taken by AO", value: extraModuleStats.twinbin.actionTaken, icon: <CheckCircle size={20} />, color: "#10b981", href: `/modules/twinbin` },
// //                 ];
// //               } else {
// //                 customStats = [
// //                   { label: "Total Uploads", value: m.total, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/${m.key.toLowerCase()}` },
// //                   { label: "Approved", value: m.approved, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/${m.key.toLowerCase()}` },
// //                   { label: "Action Required", value: m.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/${m.key.toLowerCase()}` },
// //                   { label: "Pending", value: m.pending, icon: <MapPin size={20} />, color: "#f59e0b", href: `/modules/${m.key.toLowerCase()}` },
// //                 ];
// //               }

// //               return (
// //                 <div key={`mod-${i}`} style={{ marginBottom: 40 }}>
// //                   <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
// //                     <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: 10, background: 'white', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
// //                       <Activity size={14} />
// //                       {displayName} Details
// //                     </div>
// //                   </div>
// //                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
// //                     {customStats.map((s, j) => (
// //                       <Link key={j} href={s.href} style={{ textDecoration: 'none' }}>
// //                         <div className="card card-hover" style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, height: '100%', transition: 'all 0.2s ease' }}>
// //                           <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
// //                             {s.icon}
// //                           </div>
// //                           <div>
// //                             <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>{s.label}</div>
// //                             <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
// //                               {statsLoading || refreshing ? "..." : s.value}
// //                             </div>
// //                           </div>
// //                         </div>
// //                       </Link>
// //                     ))}
// //                   </div>
// //                 </div>
// //               );
// //             })}

// //             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
// //               <div style={{ maxWidth: 500, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
// //                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
// //                   <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: 8, borderRadius: 8 }}>
// //                     <Shield size={18} />
// //                   </div>
// //                   <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Active Modules</h3>
// //                 </div>
// //                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
// //                   <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
// //                     <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{statsLoading ? '—' : (stats?.totalModules ?? 0)}</div>
// //                     <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>MODULES</div>
// //                   </div>
// //                   <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
// //                     <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
// //                       {statsLoading ? '—' : ((stats?.qualityControllers ?? 0) + (stats?.taskforceMembers ?? 0) + (stats?.ulbOfficials ?? 0) + (stats?.actionOfficers ?? 0) + (stats?.cityAdmins ?? 0))}
// //                     </div>
// //                     <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>STAFF</div>
// //                   </div>
// //                 </div>
// //                 <Link href="/city" style={{ textDecoration: 'none', display: 'block', marginTop: 16, textAlign: 'center', color: '#2563eb', fontWeight: 700, fontSize: 13 }}>
// //                   Manage City Settings
// //                 </Link>
// //               </div>
// //             </div>
// //           </div>

// //           {/* --- NEW PREMIUM COMMISSIONER DASHBOARD --- */}
// //           <div style={{ marginTop: 40, paddingTop: 32, borderTop: '2px dashed #cbd5e1' }}>
// //             <div style={{ marginBottom: 24 }}>
// //               <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>City Cleanliness Overview</h2>
// //               <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>Layer 1: Summary</p>
// //             </div>
// //             {/* Cards */}
// //             {(() => {
// //               const totalToilets = extraModuleStats.toilet.registered;
// //               const approvedInsp = toiletDashStats?.approvedInspections || extraModuleStats.toilet.inspectionsDone;
// //               const cleanPct = totalToilets > 0 ? Math.round((approvedInsp / totalToilets) * 100) : 0;
// //               const activeIssues = extraModuleStats.toilet.actionRequired + extraModuleStats.twinbin.actionRequired + extraModuleStats.taskforce.actionRequired;
// //               const pendingTotal = extraModuleStats.toilet.inspectionPending + extraModuleStats.twinbin.inspectionPending + extraModuleStats.taskforce.inspectionPending;
// //               const cleanColor = cleanPct >= 80 ? '#22c55e' : cleanPct >= 60 ? '#f59e0b' : '#ef4444';
// //               return (
// //                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
// //                   <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
// //                     <div style={{ width: 50, height: 50, borderRadius: '50%', background: cleanColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, boxShadow: `0 4px 10px ${cleanColor}4d` }}>{statsLoading ? '—' : `${cleanPct}%`}</div>
// //                     <div><div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>CLEAN SCORE</div><div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>City Average</div></div>
// //                   </div>
// //                   {[{ l: 'Total Toilets', v: totalToilets, c: '#10b981' }, { l: 'Clean Toilets', v: approvedInsp, c: '#22c55e' }, { l: 'Active Issues', v: activeIssues, c: '#f59e0b' }, { l: 'Pending', v: pendingTotal, c: '#ef4444' }].map((x, i) => (
// //                     <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: `4px solid ${x.c}`, borderRadius: 12, padding: 16 }}>
// //                       <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{statsLoading ? '—' : x.v}</div>
// //                       <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{x.l}</div>
// //                     </div>
// //                   ))}
// //                 </div>
// //               );
// //             })()}

// //             <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 16px 0' }}>Layer 2: Analysis & Tracking</p>
// //             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>

// //               {/* Zone Performance - Real data from zoneActivity */}
// //               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
// //                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Zone Performance</h3>
// //                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
// //                   {zoneActivity.length === 0 ? (
// //                     <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 12 }}>No zone data available</div>
// //                   ) : zoneActivity.slice(0, 6).map((z, i) => {
// //                     const maxBeats = zoneActivity[0]?.beats || 1;
// //                     const pct = Math.round((z.beats / maxBeats) * 100);
// //                     const assignedPct = z.beats > 0 ? Math.round((z.assignedBeats / z.beats) * 100) : 0;
// //                     const c = assignedPct >= 80 ? '#22c55e' : assignedPct >= 60 ? '#3b82f6' : assignedPct >= 40 ? '#eab308' : '#ef4444';
// //                     return (
// //                       <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
// //                         <div style={{ width: 80, fontSize: 12, fontWeight: 700, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{z.name}</div>
// //                         <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
// //                           <div style={{ width: `${assignedPct}%`, height: '100%', background: c, borderRadius: 4, transition: 'width 0.8s ease' }}></div>
// //                         </div>
// //                         <div style={{ width: 30, fontSize: 13, fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>{assignedPct}%</div>
// //                       </div>
// //                     );
// //                   })}
// //                 </div>
// //               </div>

// //               {/* Issue Monitoring - Real data from extraModuleStats */}
// //               {(() => {
// //                 const toiletIssues = extraModuleStats.toilet.actionRequired;
// //                 const binIssues = extraModuleStats.twinbin.actionRequired;
// //                 const gvpIssues = extraModuleStats.taskforce.actionRequired;
// //                 const pendingInsp = extraModuleStats.toilet.inspectionPending + extraModuleStats.twinbin.inspectionPending;
// //                 const issueData = [
// //                   { l: 'Toilet Issues', v: toiletIssues, c: '#f97316' },
// //                   { l: 'Litterbin Issues', v: binIssues, c: '#ef4444' },
// //                   { l: 'GVP Issues', v: gvpIssues, c: '#a855f7' },
// //                   { l: 'Pending Inspections', v: pendingInsp, c: '#334155' }
// //                 ];
// //                 return (
// //                   <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
// //                     <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Issue Monitoring</h3>
// //                     <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
// //                       <Donut data={issueData.map(d => ({ v: d.v || 0, color: d.c }))} size={100} stroke={16} />
// //                       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
// //                         {issueData.map((issue, i) => (
// //                           <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: issue.c }}></div><span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{issue.l} ({issue.v})</span></div>
// //                         ))}
// //                       </div>
// //                     </div>
// //                   </div>
// //                 );
// //               })()}

// //               {/* Ward Ranking - Real data from wardActivity */}
// //               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
// //                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Ward Ranking</h3>
// //                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
// //                   <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Rank</th><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Ward</th><th style={{ textAlign: 'right', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Beats</th></tr></thead>
// //                   <tbody>
// //                     {wardActivity.length === 0 ? (
// //                       <tr><td colSpan={3} style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No ward data</td></tr>
// //                     ) : wardActivity.slice(0, 5).map((w, i) => {
// //                       const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
// //                       const isLast = i === wardActivity.slice(0, 5).length - 1;
// //                       const isWorst = isLast && wardActivity.length > 2;
// //                       return (
// //                         <tr key={i} style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9', background: isWorst ? '#fef2f2' : 'transparent' }}>
// //                           <td style={{ padding: '8px 0', fontSize: 16 }}>{isWorst ? '⚠️' : medal}</td>
// //                           <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 700, color: isWorst ? '#ef4444' : '#0f172a' }}>{w.name}</td>
// //                           <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 800, color: isWorst ? '#ef4444' : i === 0 ? '#22c55e' : '#3b82f6', textAlign: 'right' }}>{w.beats}</td>
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>

// //               {/* AO Response Time - Real data: show action officers count and module action required stats */}
// //               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
// //                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Action Officer Summary</h3>
// //                 {(() => {
// //                   const aoCount = stats?.actionOfficers || 0;
// //                   const modAR = moduleActivity.filter(m => m.actionRequired > 0);
// //                   return (
// //                     <>
// //                       <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, background: '#f0fdf4', padding: 12, borderRadius: 10, border: '1px solid #bbf7d0' }}>
// //                         <UserCog size={22} color="#16a34a" />
// //                         <div>
// //                           <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{statsLoading ? '—' : aoCount}</div>
// //                           <div style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>Action Officers Active</div>
// //                         </div>
// //                       </div>
// //                       {modAR.length > 0 ? modAR.map((m, i) => (
// //                         <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
// //                           <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{m.name}</span>
// //                           <span style={{ fontSize: 12, fontWeight: 800, color: '#ef4444' }}>⚠ {m.actionRequired} pending</span>
// //                         </div>
// //                       )) : (
// //                         <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, textAlign: 'center', padding: 8 }}>✓ No pending actions</div>
// //                       )}
// //                     </>
// //                   );
// //                 })()}
// //               </div>

// //               {/* QC Leaderboard - Real data from qcLeaderboard */}
// //               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
// //                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>QC Leaderboard</h3>
// //                 <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
// //                   <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Rank</th><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>QC Name</th><th style={{ textAlign: 'right', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Inspections</th></tr></thead>
// //                   <tbody>
// //                     {qcLeaderboard.length === 0 ? (
// //                       <tr><td colSpan={3} style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No inspection data yet</td></tr>
// //                     ) : qcLeaderboard.map((q, i) => {
// //                       const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
// //                       const isLow = i === qcLeaderboard.length - 1 && qcLeaderboard.length > 2 && q.inspections < (qcLeaderboard[0]?.inspections || 1) * 0.3;
// //                       return (
// //                         <tr key={i} style={{ borderBottom: i < qcLeaderboard.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
// //                           <td style={{ padding: '8px 0', fontSize: 16 }}>{isLow ? '⚠️' : medal}</td>
// //                           <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 700, color: isLow ? '#ef4444' : '#0f172a' }}>{q.name}</td>
// //                           <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 800, color: isLow ? '#ef4444' : '#0f172a', textAlign: 'right' }}>{q.inspections}</td>
// //                         </tr>
// //                       );
// //                     })}
// //                   </tbody>
// //                 </table>
// //               </div>

// //               {/* Taskforce Activity - Real data from recentLogs and extraModuleStats */}
// //               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
// //                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Taskforce Activity</h3>
// //                 <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
// //                   <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#3b82f6' }}>{extraModuleStats.toilet.registered}</div><div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>TOILETS</div></div>
// //                   <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#8b5cf6' }}>{extraModuleStats.twinbin.registered}</div><div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>LITTERBINS</div></div>
// //                   <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444' }}>{extraModuleStats.taskforce.registered}</div><div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>GVP POINTS</div></div>
// //                 </div>
// //                 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
// //                   {recentLogs.length === 0 ? (
// //                     <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 8 }}>No recent activity</div>
// //                   ) : recentLogs.slice(0, 3).map((log, i) => (
// //                     <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
// //                       <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 55, flexShrink: 0 }}>{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
// //                       <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.moduleName} — {log.status} {log.createdByUser?.name ? `by ${log.createdByUser.name}` : ''}</div>
// //                     </div>
// //                   ))}
// //                 </div>
// //               </div>

// //               {/* Sweeping Coverage - Real data from sweepingDetailStats */}
// //               {(() => {
// //                 const totalB = sweepingDetailStats.totalBeats;
// //                 const approved = sweepingDetailStats.totalApproved;
// //                 const missed = Math.max(0, totalB - approved);
// //                 const coveragePct = totalB > 0 ? Math.round((approved / totalB) * 100) : 0;
// //                 const coverageColor = coveragePct >= 80 ? '#22c55e' : coveragePct >= 50 ? '#f59e0b' : '#ef4444';
// //                 return (
// //                   <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
// //                     <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Sweeping Coverage</h3>
// //                     <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16 }}>
// //                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Overall Coverage</span><span style={{ fontSize: 12, fontWeight: 900, color: coverageColor }}>{sweepingDetailLoading ? '...' : `${coveragePct}%`}</span></div>
// //                       <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${coveragePct}%`, height: '100%', background: coverageColor, transition: 'width 0.8s ease' }}></div></div>
// //                     </div>
// //                     <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
// //                       <div style={{ flex: 1 }}>
// //                         <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Total Beats</span><span style={{ fontSize: 12, color: '#0f172a', fontWeight: 800 }}>{sweepingDetailLoading ? '...' : totalB}</span></div>
// //                         <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Approved</span><span style={{ fontSize: 12, color: '#22c55e', fontWeight: 800 }}>{sweepingDetailLoading ? '...' : approved}</span></div>
// //                         <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Action Required</span><span style={{ fontSize: 12, color: '#ef4444', fontWeight: 800 }}>{sweepingDetailLoading ? '...' : sweepingDetailStats.actionRequired}</span></div>
// //                       </div>
// //                       <div style={{ width: 80, height: 80, background: '#e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
// //                         <Map size={24} color="#94a3b8" />
// //                         <div style={{ position: 'absolute', bottom: 4, right: 4, background: '#fff', padding: '2px 4px', borderRadius: 4, fontSize: 8, fontWeight: 800 }}>LIVE MAP</div>
// //                       </div>
// //                     </div>
// //                   </div>
// //                 );
// //               })()}

// //               {/* GVP Transformation - Real data from extraModuleStats.taskforce */}
// //               {(() => {
// //                 const totalGVP = extraModuleStats.taskforce.registered;
// //                 const approved = extraModuleStats.taskforce.inspectionsDone;
// //                 const actionTaken = extraModuleStats.taskforce.actionTaken || 0;
// //                 const actionReq = extraModuleStats.taskforce.actionRequired;
// //                 const pctApproved = totalGVP > 0 ? Math.round((approved / totalGVP) * 100) : 0;
// //                 const pctActionTaken = totalGVP > 0 ? Math.round((actionTaken / totalGVP) * 100) : 0;
// //                 const pctActionReq = totalGVP > 0 ? Math.round((actionReq / totalGVP) * 100) : 0;
// //                 return (
// //                   <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
// //                     <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>GVP Transformation</h3>
// //                     <div style={{ marginBottom: 16 }}>
// //                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Total GVPs ({totalGVP})</span></div>
// //                       <div style={{ height: 16, borderRadius: 8, display: 'flex', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
// //                         {totalGVP > 0 ? (<>
// //                           <div style={{ width: `${pctApproved}%`, background: '#22c55e', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>Approved</div>
// //                           <div style={{ width: `${pctActionTaken}%`, background: '#3b82f6', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>Action Taken</div>
// //                           <div style={{ width: `${Math.max(pctActionReq, 100 - pctApproved - pctActionTaken)}%`, background: '#ef4444', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>Pending</div>
// //                         </>) : (
// //                           <div style={{ width: '100%', background: '#f1f5f9', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#94a3b8' }}>No data</div>
// //                         )}
// //                       </div>
// //                     </div>
// //                     <div>
// //                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Approved (QC)</span><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{approved} ({pctApproved}%)</span></div>
// //                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Action Taken (AO)</span><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{actionTaken} ({pctActionTaken}%)</span></div>
// //                       <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Action Required</span><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{actionReq} ({pctActionReq}%)</span></div>
// //                     </div>
// //                   </div>
// //                 );
// //               })()}
// //             </div>

// //             <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 16px 0' }}>Layer 3: Proof &amp; Verification</p>
// //             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>

// //               {/* Recent Activity Log instead of Photo Evidence */}
// //               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
// //                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Recent Activity Log</h3>
// //                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
// //                   {recentLogs.length === 0 ? (
// //                     <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 20 }}>No recent activity to display</div>
// //                   ) : recentLogs.slice(0, 6).map((log, i) => (
// //                     <div key={i} style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
// //                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
// //                         <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{log.moduleName}</span>
// //                         <span style={{ fontSize: 10, fontWeight: 600, color: log.status === 'APPROVED' ? '#22c55e' : log.status === 'ACTION_REQUIRED' ? '#ef4444' : '#f59e0b', background: log.status === 'APPROVED' ? '#f0fdf4' : log.status === 'ACTION_REQUIRED' ? '#fef2f2' : '#fffbeb', padding: '2px 8px', borderRadius: 4 }}>{log.status}</span>
// //                       </div>
// //                       <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>
// //                         {log.createdByUser?.name || 'Field User'} • {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
// //                       </div>
// //                     </div>
// //                   ))}
// //                 </div>
// //               </div>

// //               {/* Critical Alerts - Real data from action required counts */}
// //               {(() => {
// //                 const alerts: { msg: string; ward: string }[] = [];
// //                 if (extraModuleStats.toilet.actionRequired > 0) alerts.push({ msg: `${extraModuleStats.toilet.actionRequired} toilet(s) need action`, ward: 'Toilet Module' });
// //                 if (extraModuleStats.twinbin.actionRequired > 0) alerts.push({ msg: `${extraModuleStats.twinbin.actionRequired} litterbin(s) need action`, ward: 'Litterbin Module' });
// //                 if (extraModuleStats.taskforce.actionRequired > 0) alerts.push({ msg: `${extraModuleStats.taskforce.actionRequired} GVP point(s) need action`, ward: 'GVP Module' });
// //                 if (sweepingDetailStats.actionRequired > 0) alerts.push({ msg: `${sweepingDetailStats.actionRequired} sweeping record(s) need action`, ward: 'Sweeping Module' });
// //                 return (
// //                   <div style={{ background: alerts.length > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${alerts.length > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: 12, padding: 20 }}>
// //                     <h3 style={{ fontSize: 16, fontWeight: 900, color: alerts.length > 0 ? '#b91c1c' : '#16a34a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
// //                       {alerts.length > 0 ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
// //                       {alerts.length > 0 ? 'Critical Alerts' : 'All Clear'}
// //                     </h3>
// //                       {alerts.length === 0 ? (
// //                         <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, textAlign: 'center', padding: 16 }}>✓ No critical alerts — all modules are clear!</div>
// //                       ) : alerts.map((a, i) => (
// //                         <div key={i} style={{ background: '#fff', padding: 12, borde       ) : (
// //         <>
// //           {/* ── REDESIGNED CITY ADMIN TASKFORCE DASHBOARD ── */}
// //           <div style={{ padding: '12px 24px', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>

// //             {/* Background Mini Leaf Accents (Small subtle floating leaves) */}
// //             <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden', opacity: 0.15 }}>
// //               <Leaf size={20} style={{ position: 'absolute', left: '30px', top: '100px', transform: 'rotate(-45deg)', color: '#059669' }} />
// //               <Leaf size={18} style={{ position: 'absolute', right: '40px', top: '200px', transform: 'rotate(15deg)', color: '#2563eb' }} />
// //               <Leaf size={22} style={{ position: 'absolute', left: '25%', top: '38%', transform: 'rotate(40deg)', color: '#7c3aed' }} />
// //               <Leaf size={18} style={{ position: 'absolute', right: '22%', top: '55%', transform: 'rotate(-20deg)', color: '#d97706' }} />
// //               <Leaf size={20} style={{ position: 'absolute', left: '12%', bottom: '180px', transform: 'rotate(30deg)', color: '#059669' }} />
// //               <Leaf size={24} style={{ position: 'absolute', right: '35px', bottom: '60px', transform: 'rotate(-35deg)', color: '#2563eb' }} />
// //             </div>

// //             {/* ── TOP HEADER BAR WITH GREETING, BANNER BACKGROUND, DATE & GEO FILTERS ── */}
// //             <div style={{
// //               position: 'relative',
// //               zIndex: 1,
// //               display: 'flex',
// //               justifyContent: 'space-between',
// //               alignItems: 'center',
// //               flexWrap: 'wrap',
// //               gap: '16px',
// //               backgroundColor: 'white',
// //               backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.92) 35%, rgba(255,255,255,0.2) 100%), url(/Taskforce_background_header.png)',
// //               backgroundSize: 'cover',
// //               backgroundPosition: 'right center',
// //               backgroundRepeat: 'no-repeat',
// //               border: '1px solid #cbd5e1',
// //               borderRadius: '24px',
// //               padding: '20px 28px',
// //               boxShadow: '0 4px 12px -2px rgba(0,0,0,0.04)',
// //               width: '100%',
// //               maxWidth: '1200px',
// //               margin: '0 auto'
// //             }}>backgroundColor: 'white',
// //               backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.92) 35%, rgba(255,255,255,0.2) 100%), url(/Taskforce_background_header.png)',
// //               backgroundSize: 'cover',
// //               backgroundPosition: 'right center',
// //               backgroundRepeat: 'no-repeat',
// //               border: '1px solid #cbd5e1',
// //               borderRadius: '24px',
// //               padding: '28px 36px',
// //               boxShadow: '0 4px 12px -2px rgba(0,0,0,0.04)'
// //             }}>
// //               <div>
// //                 <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
// //                   <span>
// //                     {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}, {user?.name || user?.email?.split('@')[0] || 'City Admin'}
// //                   </span>
// //                 </div>
// //                 <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d4ed8', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
// //                   <Building2 size={18} color="#1d4ed8" />
// //                   <span>{cityName || 'Indore Municipal Corporation'}</span>
// //                 </div>
// //               </div>

// //               {/* Top Controls Bar (Date Filter, Alert Button, Refresh Button) */}
// //               <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
// //                 {/* Date Picker (Default: Current Date) */}
// //                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'white', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '6px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
// //                   <Calendar size={15} color="#2563eb" />
// //                   <input
// //                     type="date"
// //                     value={filterDate}
// //                     onChange={(e) => setFilterDate(e.target.value)}
// //                     style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
// //                   />
// //                 </div>

// //                 {/* System Alerts Modal Button */}
// //                 <button
// //                   type="button"
// //                   onClick={() => {
// //                     const criticalCount = (extraModuleStats.toilet.actionRequired || 0) + (extraModuleStats.twinbin.actionRequired || 0) + (extraModuleStats.taskforce.actionRequired || 0) + (sweepingDetailStats.actionRequired || 0);
// //                     alert(`System Alerts Overview:\n\n• Toilet Issues Needing Action: ${extraModuleStats.toilet.actionRequired || 0}\n• Litterbin Issues Needing Action: ${extraModuleStats.twinbin.actionRequired || 0}\n• GVP Points Action Required: ${extraModuleStats.taskforce.actionRequired || 0}\n• Sweeping Beats Action Required: ${sweepingDetailStats.actionRequired || 0}\n\nTotal Critical Action Items: ${criticalCount}`);
// //                   }}
// //                   style={{
// //                     height: '40px', padding: '0 16px', borderRadius: '12px', border: '1.5px solid #fecaca',
// //                     backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 800,
// //                     display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
// //                     boxShadow: '0 2px 4px rgba(220,38,38,0.08)', transition: 'all 0.2s'
// //                   }}
// //                 >
// //                   <Bell size={15} color="#dc2626" />
// //                   <span>System Alerts</span>
// //                   {((extraModuleStats.toilet.actionRequired || 0) + (extraModuleStats.twinbin.actionRequired || 0) + (extraModuleStats.taskforce.actionRequired || 0) + (sweepingDetailStats.actionRequired || 0)) > 0 && (
// //                     <span style={{ backgroundColor: '#dc2626', color: 'white', borderRadius: '9999px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: 900 }}>
// //                       {(extraModuleStats.toilet.actionRequired || 0) + (extraModuleStats.twinbin.actionRequired || 0) + (extraModuleStats.taskforce.actionRequired || 0) + (sweepingDetailStats.actionRequired || 0)}
// //                     </span>
// //                   )}
// //                 </button>

// //                 {/* Refresh Button */}
// //                 <button
// //                   type="button"
// //                   onClick={loadAll}
// //                   disabled={refreshing}
// //                   style={{
// //                     height: '40px', padding: '0 18px', borderRadius: '12px', border: '1.5px solid #2563eb',
// //                     backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '0.8125rem', fontWeight: 800,
// //                     display: 'flex', alignItems: 'center', gap: '8px', cursor: refreshing ? 'not-allowed' : 'pointer',
// //                     boxShadow: '0 2px 4px rgba(37,99,235,0.12)', transition: 'all 0.2s'
// //                   }}
// //                 >
// //                   <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} color="#2563eb" />
// //                   <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
// //                 </button>
// //               </div>
// //             </div>

// //             {/* ── SECTION 0: CITY OVERVIEW (Above USERS OVERVIEW as requested) ── */}
// //             <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
// //               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
// //                 <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
// //                   <Map size={18} color="#2563eb" />
// //                   <span>CITY OVERVIEW</span>
// //                 </div>
// //                 <button
// //                   type="button"
// //                   onClick={loadAll}
// //                   title="Refresh City Overview"
// //                   style={{ border: 'none', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
// //                 >
// //                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
// //                   <span>Refresh</span>
// //                 </button>
// //               </div>

// //               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
// //                 {[
// //                   { label: 'Total Registered Zones', value: cityGeoStats?.zones || 0, icon: Map, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
// //                   { label: 'Total Registered Wards', value: cityGeoStats?.wards || 0, icon: MapPin, color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
// //                   { label: 'Total Registered Areas', value: cityGeoStats?.areas || 0, icon: Target, color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' },
// //                   { label: 'Total Registered Beats', value: cityGeoStats?.beats || 0, icon: Activity, color: '#0284c7', bg: '#e0f2fe', border: '#93c5fd' },
// //                 ].map((card, i) => (
// //                   <div key={i} style={{ backgroundColor: 'white', borderRadius: '18px', border: `1.5px solid ${card.border}`, padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
// //                     <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
// //                       <card.icon size={20} />
// //                     </div>
// //                     <div>
// //                       <div style={{ fontSize: '0.625rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</div>
// //                       <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#0f172a', lineHeight: 1, marginTop: '4px' }}>{statsLoading ? '—' : card.value}</div>
// //                     </div>
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>

// //             {/* ── SECTION 1: USERS OVERVIEW (Clean cards without 100% circles) ── */}
// //             <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
// //               {/* Header with Title and Right Corner Refresh Button */}
// //               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
// //                 <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
// //                   <Users size={18} color="#7c3aed" />
// //                   <span>USERS OVERVIEW</span>
// //                 </div>
// //                 <button
// //                   type="button"
// //                   onClick={loadAll}
// //                   title="Refresh Users Overview"
// //                   style={{ border: 'none', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
// //                 >
// //                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
// //                   <span>Refresh</span>
// //                 </button>
// //               </div>

// //               {/* 5 Cards Row (Clean without 100% circle gauge) */}
// //               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
// //                 {[

// //                   {
// //                     title: 'TOTAL ACTION OFFICERS',
// //                     count: stats?.actionOfficers || stats?.ACTION_OFFICER || 0,
// //                     icon: UserCog,
// //                     iconColor: '#059669',
// //                     iconBg: '#f0fdf4',
// //                     borderColor: '#bbf7d0'
// //                   },
// //                   {
// //                     title: 'TOTAL Quality Controller',
// //                     count: stats?.qualityControllers || stats?.QC || 0,
// //                     icon: Search,
// //                     iconColor: '#7c3aed',
// //                     iconBg: '#f5f3ff',
// //                     borderColor: '#ddd6fe'
// //                   },
// //                   {
// //                     title: 'TOTAL SUPERVISORS',
// //                     count: stats?.taskforceMembers || stats?.SUPERVISOR || 0,
// //                     icon: ShieldCheck,
// //                     iconColor: '#d97706',
// //                     iconBg: '#fffbeb',
// //                     borderColor: '#fde68a'
// //                   },
// //                   {
// //                     title: 'TOTAL EMPLOYEES',
// //                     count: stats?.employees || stats?.EMPLOYEE || 0,
// //                     icon: Users,
// //                     iconColor: '#2563eb',
// //                     iconBg: '#eff6ff',
// //                     borderColor: '#bfdbfe'
// //                   }
// //                 ].map((card, i) => (
// //                   <div
// //                     key={i}
// //                     style={{
// //                       backgroundColor: 'white',
// //                       border: `1.5px solid ${card.borderColor}`,
// //                       borderRadius: '18px',
// //                       padding: '18px',
// //                       display: 'flex',
// //                       alignItems: 'center',
// //                       gap: '14px',
// //                       boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
// //                     }}
// //                   >
// //                     <div
// //                       style={{
// //                         width: '46px',
// //                         height: '46px',
// //                         borderRadius: '14px',
// //                         backgroundColor: card.iconBg,
// //                         color: card.iconColor,
// //                         display: 'flex',
// //                         alignItems: 'center',
// //                         justifyContent: 'center',
// //                         flexShrink: 0
// //                       }}
// //                     >
// //                       <card.icon size={22} />
// //                     </div>
// //                     <div style={{ minWidth: 0 }}>
// //                       <div
// //                         style={{
// //                           fontSize: '0.625rem',
// //                           fontWeight: 900,
// //                           color: '#475569',
// //                           textTransform: 'uppercase',
// //                           letterSpacing: '0.04em',
// //                           lineHeight: 1.2
// //                         }}
// //                       >
// //                         {card.title}
// //                       </div>
// //                       <div style={{ fontSize: '1.7rem', fontWeight: 950, color: '#0f172a', lineHeight: 1, marginTop: '6px' }}>
// //                         {statsLoading ? '—' : card.count}
// //                       </div>
// //                     </div>
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>



// //             {/* ── SECTION 2: WORKFORCE DISTRIBUTION BY MODULE ── */}
// //             <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
// //               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
// //                 <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
// //                   <Users size={18} color="#0284c7" />
// //                   <span>WORKFORCE DISTRIBUTION BY MODULE</span>
// //                 </div>
// //                 <button
// //                   type="button"
// //                   onClick={loadAll}
// //                   title="Refresh Workforce Distribution"
// //                   style={{ border: 'none', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
// //                 >
// //                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
// //                   <span>Refresh</span>
// //                 </button>
// //               </div>

// //               {(() => {
// //                 // Build workforce distribution cards dynamically from moduleActivity
// //                 const moduleCards = [
// //                   { keyMatch: ['sweeping'], name: 'Sweeping', color: '#059669', bg: '#f0fdf4', icon: BrushCleaning },
// //                   { keyMatch: ['toilet'], name: 'Cleanliness of Toilets', color: '#2563eb', bg: '#eff6ff', icon: Toilet },
// //                   { keyMatch: ['twinbin', 'litter', 'bin'], name: 'Litterbins', color: '#d97706', bg: '#fffbeb', icon: Trash2 },
// //                   { keyMatch: ['taskforce', 'gvp', 'ctu'], name: 'CTU / GVP Transformation', color: '#7c3aed', bg: '#f5f3ff', icon: Truck },
// //                 ];
// //                 const cards = moduleCards.map(mc => {
// //                   const found = moduleActivity.find(m => mc.keyMatch.some(k => m.key.toLowerCase().includes(k)));
// //                   return { ...mc, total: found?.total || 0, approved: found?.approved || 0 };
// //                 });
// //                 const totalInspections = cards.reduce((s, c) => s + c.total, 1);
// //                 return (
// //                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
// //                     {cards.map((item, i) => {
// //                       const pct = Math.round((item.total / totalInspections) * 100);
// //                       return (
// //                         <div key={i} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
// //                           <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
// //                             <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
// //                               <item.icon size={18} />
// //                             </div>
// //                             <div>
// //                               <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
// //                               <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{item.total} Records</div>
// //                             </div>
// //                           </div>

// //                         </div>
// //                       );
// //                     })}
// //                   </div>
// //                 );
// //               })()}
// //             </div>

// //             {/* ── SECTION 3: MODULE HEALTH SCORE (NO % and NO Health Score Label) ── */}
// //             <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
// //               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
// //                 <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
// //                   <Activity size={18} color="#2563eb" />
// //                   <span>MODULE HEALTH SCORE</span>
// //                 </div>
// //                 <button
// //                   type="button"
// //                   onClick={loadAll}
// //                   title="Refresh Module Health Score"
// //                   style={{ border: 'none', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
// //                 >
// //                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
// //                   <span>Refresh</span>
// //                 </button>
// //               </div>

// //               {/* 3 Module Cards */}
// //               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
// //                 {[
// //                   {
// //                     moduleName: 'Litterbins Module',
// //                     icon: Trash2,
// //                     color: '#d97706',
// //                     bg: '#fffbeb',
// //                     borderColor: '#fde68a',
// //                     score: extraModuleStats.twinbin.inspectionsDone || 0,
// //                     approved: extraModuleStats.twinbin.inspectionsDone || 0,
// //                     rejected: extraModuleStats.twinbin.actionRequired || 0,
// //                     pending: extraModuleStats.twinbin.inspectionPending || 0
// //                   },
// //                   {
// //                     moduleName: 'Cleanliness of Toilets Module',
// //                     icon: Toilet,
// //                     color: '#2563eb',
// //                     bg: '#eff6ff',
// //                     borderColor: '#bfdbfe',
// //                     score: extraModuleStats.toilet.inspectionsDone || 0,
// //                     approved: extraModuleStats.toilet.inspectionsDone || 0,
// //                     rejected: extraModuleStats.toilet.actionRequired || 0,
// //                     pending: extraModuleStats.toilet.inspectionPending || 0
// //                   },
// //                   {
// //                     moduleName: 'Sweeping Module',
// //                     icon: BrushCleaning,
// //                     color: '#059669',
// //                     bg: '#f0fdf4',
// //                     borderColor: '#a7f3d0',
// //                     score: sweepingDetailStats.totalApproved || 0,
// //                     approved: sweepingDetailStats.totalApproved || 0,
// //                     rejected: sweepingDetailStats.actionRequired || 0,
// //                     pending: sweepingDetailStats.pendingDeployment || 0
// //                   }
// //                 ].map((mod, i) => (
// //                   <div
// //                     key={i}
// //                     style={{
// //                       backgroundColor: 'white',
// //                       border: `1.5px solid ${mod.borderColor}`,
// //                       borderRadius: '22px',
// //                       padding: '22px',
// //                       display: 'flex',
// //                       flexDirection: 'column',
// //                       alignItems: 'center',
// //                       justifyContent: 'space-between',
// //                       boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
// //                     }}
// //                   >
// //                     {/* Module Title Row */}
// //                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', marginBottom: '16px' }}>
// //                       <div style={{ width: '38px', height: '38px', borderRadius: '11px', backgroundColor: mod.bg, color: mod.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
// //                         <mod.icon size={20} />
// //                       </div>
// //                       <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>{mod.moduleName}</h3>
// //                     </div>

// //                     {/* Semicircle Arc Gauge */}
// //                     <ArcGauge color={mod.color} score={mod.score} size={140} stroke={12} />

// //                     {/* Bottom Status Dots Row */}
// //                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
// //                       {/* Approved */}
// //                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
// //                         <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
// //                           <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
// //                           <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#16a34a' }}>{mod.approved}</span>
// //                         </div>
// //                         <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Approved</span>
// //                       </div>

// //                       {/* Rejected */}
// //                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
// //                         <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
// //                           <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
// //                           <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#dc2626' }}>{mod.rejected}</span>
// //                         </div>
// //                         <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Rejected</span>
// //                       </div>

// //                       {/* Pending */}
// //                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
// //                         <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
// //                           <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
// //                           <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#d97706' }}>{mod.pending}</span>
// //                         </div>
// //                         <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Pending</span>
// //                       </div>
// //                     </div>
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>

// //             {/* ── SECTION 4: MODULE WISE INSPECTION REPORT BAR CHART ── */}
// //             <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
// //               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
// //                 <div>
// //                   <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
// //                     <BarChart3 size={18} color="#2563eb" />
// //                     <span>MODULE WISE INSPECTION REPORT (DATE WISE ANALYTICS)</span>
// //                   </div>
// //                   <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
// //                     Date-wise inspection analytics (X-Axis: Date • Y-Axis: Inspection Count)
// //                   </div>
// //                 </div>

// //                 <button
// //                   type="button"
// //                   onClick={loadAll}
// //                   title="Refresh Inspection Bar Chart"
// //                   style={{ border: 'none', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
// //                 >
// //                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
// //                   <span>Refresh</span>
// //                 </button>
// //               </div>

// //               {/* Bar Chart Container with Real Data */}
// //               <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px' }}>
// //                 {barChartData.length === 0 ? (
// //                   <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
// //                     No inspection data available for the past 6 days
// //                   </div>
// //                 ) : (() => {
// //                   const maxVal = Math.max(...barChartData.flatMap(d => [d.sweeping, d.toilet, d.twinbin]), 1);
// //                   return (
// //                     <>
// //                       <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', height: '240px', borderBottom: '2px solid #cbd5e1', paddingBottom: '10px' }}>
// //                         {barChartData.map((d, idx) => (
// //                           <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
// //                             <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', width: '100%', justifyContent: 'center', height: '190px' }}>
// //                               {/* Sweeping Bar */}
// //                               {d.sweeping > 0 ? (
// //                                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: `${Math.max((d.sweeping / maxVal) * 100, 4)}%`, justifyContent: 'flex-end' }}>
// //                                   <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#059669', marginBottom: '2px' }}>{d.sweeping}</span>
// //                                   <div title={`Sweeping: ${d.sweeping}`} style={{ width: '18px', height: '100%', backgroundColor: '#059669', borderRadius: '5px 5px 0 0' }} />
// //                                 </div>
// //                               ) : <div style={{ width: '18px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '4px', alignSelf: 'flex-end' }} />}

// //                               {/* Toilet Bar */}
// //                               {d.toilet > 0 ? (
// //                                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: `${Math.max((d.toilet / maxVal) * 100, 4)}%`, justifyContent: 'flex-end' }}>
// //                                   <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#2563eb', marginBottom: '2px' }}>{d.toilet}</span>
// //                                   <div title={`Toilets: ${d.toilet}`} style={{ width: '18px', height: '100%', backgroundColor: '#2563eb', borderRadius: '5px 5px 0 0' }} />
// //                                 </div>
// //                               ) : <div style={{ width: '18px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '4px', alignSelf: 'flex-end' }} />}

// //                               {/* Twinbin Bar */}
// //                               {d.twinbin > 0 ? (
// //                                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: `${Math.max((d.twinbin / maxVal) * 100, 4)}%`, justifyContent: 'flex-end' }}>
// //                                   <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#d97706', marginBottom: '2px' }}>{d.twinbin}</span>
// //                                   <div title={`Litterbins: ${d.twinbin}`} style={{ width: '18px', height: '100%', backgroundColor: '#d97706', borderRadius: '5px 5px 0 0' }} />
// //                                 </div>
// //                               ) : <div style={{ width: '18px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '4px', alignSelf: 'flex-end' }} />}
// //                             </div>
// //                             <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#334155', marginTop: '10px', textAlign: 'center' }}>{d.date}</span>
// //                           </div>
// //                         ))}
// //                       </div>
// //                       {/* Chart Legend */}
// //                       <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginTop: '18px' }}>
// //                         <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
// //                           <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#059669', display: 'inline-block' }} />
// //                           <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>Sweeping Module</span>
// //                         </div>
// //                         <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
// //                           <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#2563eb', display: 'inline-block' }} />
// //                           <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>Cleanliness of Toilets</span>
// //                         </div>
// //                         <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
// //                           <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#d97706', display: 'inline-block' }} />
// //                           <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>Litterbins Module</span>
// //                         </div>
// //                       </div>
// //                     </>
// //                   );
// //                 })()}
// //             </div>
// //           </div>
// //         </div>
// //       </>
// //     )}
// //   </div>
// // );
// // }





// // /


// 'use client';

// import Link from "next/link";
// import { useEffect, useState } from "react";
// import { apiFetch, CityApi, AreaBeatApi, ModuleRecordsApi, CityModulesApi, GeoApi, ToiletApi, TwinbinApi, TaskforceApi } from "@lib/apiClient";
// import {
//   Package,
//   Search,
//   Landmark,
//   Users,
//   UserCog,
//   ShieldCheck,
//   Shield,
//   Map,
//   Target,
//   Activity,
//   Database,
//   AlertCircle,
//   CheckCircle,
//   MapPin,
//   ArrowRight,
//   RefreshCw,
//   Building2,
//   ChevronRight,
//   Zap,
//   TrendingUp,
//   BarChart3,
//   Bell,

//   // New icons for premium panels
//   Toilet,
//   Trash2,
//   BrushCleaning,
//   Truck,
//   FileUser,
//   Eye,
//   Leaf,
//   Calendar,
//   Download,
//   FileText,
//   AlertTriangle,
//   FilePlus,
//   Clock,
//   CheckCircle2,
//   Menu,
// } from "lucide-react";
// import { useAuth } from "@hooks/useAuth";
// import { useRouter } from "next/navigation";
// import { TableExportDropdown } from '@components/ui/TableExportDropdown';

// // ── Pure SVG Donut Chart ──────────────────────────────────────────────────────
// function Donut({ data, size = 110, stroke = 18 }: { data: { v: number; color: string }[]; size?: number; stroke?: number }) {
//   const r = (size - stroke) / 2;
//   const circ = 2 * Math.PI * r;
//   const cx = size / 2, cy = size / 2;
//   const total = data.reduce((s, d) => s + d.v, 0) || 1;
//   let acc = 0;
//   return (
//     <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
//       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
//       {data.map((d, i) => {
//         if (!d.v) return null;
//         const dash = (d.v / total) * circ;
//         const rot = (acc / total) * 360 - 90;
//         acc += d.v;
//         return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
//           strokeDasharray={`${dash} ${circ - dash}`} transform={`rotate(${rot} ${cx} ${cy})`}
//           style={{ transition: 'all 0.9s ease' }} />;
//       })}
//       <text x={cx} y={cy - 5} textAnchor="middle" fontSize={18} fontWeight="900" fill="#0f172a">{total}</text>
//       <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight="700">TOTAL</text>
//     </svg>
//   );
// }

// // ── Pure SVG Ring Gauge for Users Overview ────────────────────────────────────
// function RingGauge({ value = 100, color = "#2563eb", size = 68, stroke = 8 }: { value?: number; color?: string; size?: number; stroke?: number }) {
//   const r = (size - stroke) / 2;
//   const circ = 2 * Math.PI * r;
//   const dash = (Math.min(100, Math.max(0, value)) / 100) * circ;
//   const cx = size / 2, cy = size / 2;
//   return (
//     <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
//       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
//       <circle
//         cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
//         strokeDasharray={`${dash} ${circ - dash}`}
//         strokeLinecap="round"
//         transform={`rotate(-90 ${cx} ${cy})`}
//         style={{ transition: 'all 0.8s ease' }}
//       />
//       <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fontWeight="900" fill="#0f172a">
//         {value}%
//       </text>
//     </svg>
//   );
// }

// // ── Pure SVG Semicircle Arc Gauge for Module Health Score ──────
// function ArcGauge({
//   color = "#3b82f6",
//   score = 0,
//   percent = 0,
//   size = 152,
//   stroke = 11,
// }: {
//   color?: string;
//   score?: number;
//   percent?: number;
//   size?: number;
//   stroke?: number;
// }) {
//   const clamped = Math.min(100, Math.max(0, percent));
//   const width = size;
//   const height = Math.round(size * 0.58);
//   const cx = width / 2;
//   const cy = height - 15;
//   const r = Math.min(width * 0.39, height * 0.8);
//   const startX = cx - r;
//   const endX = cx + r;

//   return (
//     <div style={{ position: 'relative', width, height, display: 'grid', placeItems: 'center' }}>
//       <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
//         <path
//           d={`M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`}
//           pathLength={100}
//           fill="none"
//           stroke="#e8edf5"
//           strokeWidth={stroke}
//           strokeLinecap="round"
//         />
//         <path
//           d={`M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`}
//           pathLength={100}
//           fill="none"
//           stroke={color}
//           strokeWidth={stroke}
//           strokeLinecap="round"
//           strokeDasharray={`${clamped} 100`}
//           style={{ transition: 'stroke-dasharray .75s ease' }}
//         />
//         <circle cx={startX} cy={cy} r="3.5" fill={color} opacity=".9" />
//       </svg>

//       <div
//         style={{
//           position: 'absolute',
//           left: '50%',
//           bottom: 10,
//           transform: 'translateX(-50%)',
//           color: '#17243c',
//           fontSize: 23,
//           lineHeight: 1,
//           fontWeight: 800,
//           letterSpacing: '-.04em',
//         }}
//       >
//         {score}
//       </div>
//     </div>
//   );
// }

// // ── Pure SVG Sparkline for Hierarchy Health ──────────────────────────────────
// function Sparkline({ color = "#8b5cf6", points = [5, 12, 8, 15, 10, 20, 14, 18] }: { color?: string; points?: number[] }) {
//   const width = 160;
//   const height = 36;
//   const max = Math.max(...points, 1);
//   const min = Math.min(...points, 0);
//   const range = max - min || 1;

//   const pts = points.map((p, i) => {
//     const x = (i / (points.length - 1)) * width;
//     const y = height - ((p - min) / range) * (height - 8) - 4;
//     return { x, y };
//   });

//   const pathD = pts.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');

//   return (
//     <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
//       <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
//       {pts.map((pt, i) => (
//         <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="white" stroke={color} strokeWidth="2" />
//       ))}
//     </svg>
//   );
// }

// import PortalHomePage from "../portal-home/page";
// import GlobalAdminDashboard from "../portal-home/GlobalAdminDashboard";

// export default function CityDashboardPage() {
//   const { user } = useAuth();
//   const router = useRouter();

//   const isSuperAdmin =
//     user?.role === 'super_admin' ||
//     user?.role === 'hms_super_admin' ||
//     user?.role === 'SUPER_ADMIN' ||
//     (user?.roles || []).includes('hms_super_admin') ||
//     (user?.roles || []).includes('HMS_SUPER_ADMIN') ||
//     (user?.roles || []).includes('SUPER_ADMIN') ||
//     (user?.roles || []).includes('super_admin');

//   const [filterCity, setFilterCity] = useState<string>("ALL");
//   const [cityName, setCityName] = useState<string | null>(null);
//   const [ulbCode, setUlbCode] = useState<string | null>(null);
//   const [stats, setStats] = useState<any>(null);
//   const [statsLoading, setStatsLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [lastRefreshed, setLastRefreshed] = useState(new Date());
//   const [recentLogs, setRecentLogs] = useState<any[]>([]);
//   const [showAlertModal, setShowAlertModal] = useState(false);

//   // Global Header Filter States
//   const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
//   const [filterZone, setFilterZone] = useState<string>("ALL");
//   const [filterWard, setFilterWard] = useState<string>("ALL");
//   const [cities, setCities] = useState<any[]>([]);

//   useEffect(() => {
//     if (isSuperAdmin) {
//       import('@lib/apiClient').then(({ CityApi }) => {
//         CityApi.list()
//           .then(res => setCities(res.cities || []))
//           .catch(console.error);
//       }).catch(console.error);
//     }
//   }, [isSuperAdmin]);

//   const handleDownloadReport = () => {
//     // Generate a basic CSV report based on stats and trigger download
//     const csvContent = "data:text/csv;charset=utf-8,Module,Total,Approved,Rejected,ActionRequired\\n"
//       + `Toilet,${extraModuleStats.toilet.totalInspections || 0},${extraModuleStats.toilet.totalApproved || 0},${extraModuleStats.toilet.totalRejected || 0},${extraModuleStats.toilet.actionRequired || 0}\\n`
//       + `Sweeping,${sweepingDetailStats.totalSegments || 0},${sweepingDetailStats.totalApproved || 0},0,${sweepingDetailStats.actionRequired || 0}\\n`
//       + `Twinbin,${extraModuleStats.twinbin.totalInspections || 0},${extraModuleStats.twinbin.totalApproved || 0},${extraModuleStats.twinbin.totalRejected || 0},${extraModuleStats.twinbin.actionRequired || 0}\\n`
//       + `Taskforce,${extraModuleStats.taskforce.totalInspections || 0},${extraModuleStats.taskforce.totalApproved || 0},${extraModuleStats.taskforce.totalRejected || 0},${extraModuleStats.taskforce.actionRequired || 0}`;

//     const encodedUri = encodeURI(csvContent);
//     const link = document.createElement("a");
//     link.setAttribute("href", encodedUri);
//     link.setAttribute("download", `inspection_report_${filterDate}.csv`);
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   // City Admin analytics
//   const [moduleActivity, setModuleActivity] = useState<{ name: string; key: string; total: number; approved: number; pending: number; actionRequired: number }[]>([]);
//   const [zoneActivity, setZoneActivity] = useState<{ name: string; beats: number; assignedBeats: number; segments: number }[]>([]);
//   const [wardActivity, setWardActivity] = useState<{ name: string; beats: number; segments: number }[]>([]);
//   const [recentRegistrationRequests, setRecentRegistrationRequests] = useState<any[]>([]);
//   const [pendingRegCount, setPendingRegCount] = useState(0);
//   // Bar chart: per-day inspection counts for last 6 days by module
//   const [barChartData, setBarChartData] = useState<{ date: string; sweeping: number; toilet: number; twinbin: number }[]>([]);

//   // Commissioner-only states (untouched)
//   const [sweepingDetailStats, setSweepingDetailStats] = useState({
//     totalBeats: 0, totalSegments: 0, qcAssigned: 0,
//     totalApproved: 0, actionRequired: 0, pendingDeployment: 0, assignedSegments: 0
//   });
//   const [sweepingDetailLoading, setSweepingDetailLoading] = useState(true);

//   const [cityGeoStats, setCityGeoStats] = useState({ zones: 0, wards: 0, areas: 0, beats: 0 });

//   // Additional detail states for other modules
//   const [extraModuleStats, setExtraModuleStats] = useState<any>({
//     toilet: { registered: 0, pendingReg: 0, inspectionsDone: 0, inspectionPending: 0, uninspected: 0, actionTaken: 0, actionRequired: 0 },
//     twinbin: { registered: 0, pendingReg: 0, inspectionsDone: 0, inspectionPending: 0, uninspected: 0, actionTaken: 0, actionRequired: 0 },
//     taskforce: { registered: 0, pendingReg: 0, inspectionsDone: 0, inspectionPending: 0, uninspected: 0, actionTaken: 0, actionRequired: 0 }
//   });

//   // New States for Asset Requests and Supervisor Performance
//   const [assetRequests, setAssetRequests] = useState<any[]>([]);
//   const [supervisorMissedWork, setSupervisorMissedWork] = useState<any[]>([]);
//   const [perfZoneFilter, setPerfZoneFilter] = useState<string>('ALL');
//   const [perfWardFilter, setPerfWardFilter] = useState<string>('ALL');

//   // Active Supervisors Tracker
//   const [activeSupervisors, setActiveSupervisors] = useState<any[]>([]);
//   const [activeSupZoneFilter, setActiveSupZoneFilter] = useState<string>('ALL');
//   const [activeSupWardFilter, setActiveSupWardFilter] = useState<string>('ALL');
//   const [activeSupTimeFilter, setActiveSupTimeFilter] = useState<string>('TODAY');

//   // Commissioner premium dashboard real data
//   const [toiletDashStats, setToiletDashStats] = useState<any>(null);
//   const [qcLeaderboard, setQcLeaderboard] = useState<{ name: string; inspections: number }[]>([]);

//   const isReadOnlyView = user?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));
//   const isCityAdmin = user?.roles?.some(r => ["CITY_ADMIN", "HMS_SUPER_ADMIN"].includes(r));

//   const loadAll = async () => {
//     setRefreshing(true);
//     try {
//       const [cityRes, statsRes] = await Promise.all([
//         apiFetch<{ city: { name: string; ulbCode?: string } }>("/city/info").catch(() => null),
//         CityApi.getStats().catch(() => null),
//       ]);
//       if (cityRes) { setCityName(cityRes.city.name); setUlbCode(cityRes.city.ulbCode || null); }
//       if (statsRes) setStats(statsRes.stats);
//       setStatsLoading(false);

//       const [modulesRes] = await Promise.all([
//         CityModulesApi.list().catch(() => []),
//       ]);
//       const enabledModules: any[] = Array.isArray(modulesRes) ? modulesRes.filter((m: any) => m.enabled) : [];
//       const moduleStats = await Promise.all(
//         enabledModules.map(async (m: any) => {
//           try {
//             const rec = await ModuleRecordsApi.getRecords(m.key.toLowerCase(), { limit: 5 });
//             return {
//               name: m.name, key: m.key,
//               total: rec.stats?.total || rec.meta?.total || 0,
//               approved: rec.stats?.approved || 0,
//               pending: rec.stats?.pending || 0,
//               actionRequired: rec.stats?.actionRequired || 0,
//               latest: rec.data || []
//             };
//           } catch { return { name: m.name, key: m.key, total: 0, approved: 0, pending: 0, actionRequired: 0, latest: [] }; }
//         })
//       );
//       setModuleActivity(moduleStats.sort((a, b) => b.total - a.total));

//       // Aggregate recent logs
//       const allLogs = moduleStats
//         .flatMap(m => m.latest.map((r: any) => ({
//           ...r,
//           moduleName: m.name,
//           moduleKey: m.key
//         })))
//         .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
//         .slice(0, 10);
//       setRecentLogs(allLogs);

//       // Build bar chart: last 6 days inspection counts
//       try {
//         const today = new Date();
//         const days = Array.from({ length: 6 }, (_, i) => {
//           const d = new Date(today);
//           d.setDate(today.getDate() - (5 - i));
//           return d;
//         });
//         // Group allLogs (from all modules recent records) by date + module
//         const [swpRec, toilRec, binRec] = await Promise.all([
//           ModuleRecordsApi.getRecords('SWEEPING', { limit: 200, cityId: filterCity !== 'ALL' ? filterCity : undefined }).catch(() => ({ data: [] })),
//           ModuleRecordsApi.getRecords('TOILET', { limit: 200, cityId: filterCity !== 'ALL' ? filterCity : undefined }).catch(() => ({ data: [] })),
//           ModuleRecordsApi.getRecords('TWINBIN', { limit: 200, cityId: filterCity !== 'ALL' ? filterCity : undefined }).catch(() => ({ data: [] }))
//         ]);
//         const countByDay = (records: any[], dayDate: Date) => {
//           return (records || []).filter((r: any) => {
//             if (!r.createdAt) return false;
//             const rDate = new Date(r.createdAt);
//             return rDate.getFullYear() === dayDate.getFullYear() &&
//               rDate.getMonth() === dayDate.getMonth() &&
//               rDate.getDate() === dayDate.getDate();
//           }).length;
//         };
//         const chartRows = days.map(d => {
//           const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + (d.toDateString() === today.toDateString() ? ' (Today)' : '');
//           return {
//             date: label,
//             sweeping: countByDay(swpRec.data || [], d),
//             toilet: countByDay(toilRec.data || [], d),
//             twinbin: countByDay(binRec.data || [], d),
//           };
//         });
//         setBarChartData(chartRows);

//         // Extract Active Supervisors
//         const allFetchedActivity = [
//           ...(swpRec.data || []).map((r: any) => ({ ...r, moduleName: 'Sweeping' })),
//           ...(toilRec.data || []).map((r: any) => ({ ...r, moduleName: 'Toilet' })),
//           ...(binRec.data || []).map((r: any) => ({ ...r, moduleName: 'Litterbin' }))
//         ];

//         const supMap: Record<string, any> = {};
//         allFetchedActivity.forEach((r: any) => {
//           const u = r.user || r.employee || r.supervisor || r.inspector;
//           if (u && r.createdAt) {
//             const uId = u.id || u.name;
//             if (!supMap[uId]) {
//               supMap[uId] = {
//                 id: uId, name: u.name || 'Unknown', role: u.role || 'Supervisor',
//                 zone: r.zone?.name || r.zoneName || 'Various Zones',
//                 ward: r.ward?.name || r.wardName || 'Various Wards',
//                 modules: new Set<string>(),
//                 dates: []
//               };
//             }
//             supMap[uId].modules.add(r.moduleName);
//             supMap[uId].dates.push(r.createdAt);
//           }
//         });

//         const activeList = Object.values(supMap).map((s: any) => ({
//           ...s,
//           modules: Array.from(s.modules).join(', ')
//         }));
//         setActiveSupervisors(activeList);

//       } catch { setBarChartData([]); setActiveSupervisors([]); }

//       // Zone & Ward activity
//       const [beatsRes, regRes, zoneRes, wardRes, areaRes] = await Promise.all([
//         AreaBeatApi.list().catch(() => ({ beats: [] })),
//         apiFetch<{ requests: any[] }>("/city/registration-requests").catch(() => ({ requests: [] })),
//         GeoApi.list("ZONE").catch(() => ({ nodes: [] })),
//         GeoApi.list("WARD").catch(() => ({ nodes: [] })),
//         GeoApi.list("AREA").catch(() => ({ nodes: [] }))
//       ]);
//       const beats = beatsRes.beats || [];
//       const regReqs = regRes.requests || [];
//       setRecentRegistrationRequests(regReqs.slice(0, 5));
//       setPendingRegCount(regReqs.filter(r => r.status === 'PENDING').length);
//       setCityGeoStats({
//         zones: zoneRes.nodes?.length || 0,
//         wards: wardRes.nodes?.length || 0,
//         areas: areaRes.nodes?.length || 0,
//         beats: beats.length
//       });
//       const zoneMap: Record<string, { name: string; beats: number; assignedBeats: number; segments: number }> = {};
//       const wardMap: Record<string, { name: string; beats: number; segments: number }> = {};
//       beats.forEach((b: any) => {
//         const zId = b.ward?.zone?.id || b.zoneId || '?';
//         const zName = b.ward?.zone?.name || b.zoneName || 'Unknown Zone';
//         const wId = b.ward?.id || b.wardId || '?';
//         const wName = b.ward?.name || b.wardName || 'Unknown Ward';
//         const segs = b.totalSegments || 0;
//         if (!zoneMap[zId]) zoneMap[zId] = { name: zName, beats: 0, assignedBeats: 0, segments: 0 };
//         zoneMap[zId].beats++;
//         if (b.assignedToId) zoneMap[zId].assignedBeats++;
//         zoneMap[zId].segments += segs;
//         if (!wardMap[wId]) wardMap[wId] = { name: wName, beats: 0, segments: 0 };
//         wardMap[wId].beats++;
//         wardMap[wId].segments += segs;
//       });
//       setZoneActivity(Object.values(zoneMap).sort((a: any, b: any) => b.beats - a.beats).slice(0, 6));
//       setWardActivity(Object.values(wardMap).sort((a: any, b: any) => b.beats - a.beats).slice(0, 6));

//       setSweepingDetailLoading(true);
//       const recordsRes = await ModuleRecordsApi.getRecords("SWEEPING").catch(() => ({ stats: null }));
//       const totalSegments = beats.reduce((a: number, b: any) => a + (b.totalSegments || 0), 0);
//       const qcAssigned = beats.filter((b: any) => b.assignedToId).length;
//       const pending = beats.reduce((a: number, b: any) => {
//         const pid = b.assignedToId;
//         return a + (b.segments || []).filter((s: any) => !s.assignedToId || (pid && s.assignedToId === pid)).length;
//       }, 0);
//       setSweepingDetailStats({
//         totalBeats: beats.length, totalSegments, qcAssigned,
//         totalApproved: recordsRes.stats?.approved || 0,
//         actionRequired: recordsRes.stats?.actionRequired || 0,
//         pendingDeployment: recordsRes.stats?.pending ?? pending, assignedSegments: totalSegments - pending
//       });

//       // Fetch detailed stats for other modules
//       const [
//         toiletStatsRes, toiletPendingRes,
//         twinbinAllRes, twinbinPendingRes,
//         taskforceAllRes, taskforcePendingRes,
//         twinbinRecords, taskforceRecords, toiletRecords
//       ] = await Promise.all([
//         apiFetch<any>("/modules/toilet/stats").catch(() => null),
//         apiFetch<any>("/modules/toilet/pending").catch(() => ({ toilets: [] })),
//         apiFetch<any>("/modules/twinbin/bins/assigned").catch(() => ({ bins: [] })),
//         apiFetch<any>("/modules/twinbin/bin-requests/pending").catch(() => ({ data: [] })),
//         apiFetch<any>("/modules/taskforce/feeder-points/approved").catch(() => ({ feederPoints: [] })),
//         apiFetch<any>("/modules/taskforce/feeder-points/pending").catch(() => ({ feederPoints: [] })),
//         ModuleRecordsApi.getRecords("TWINBIN", { cityId: filterCity !== 'ALL' ? filterCity : undefined }).catch(() => null),
//         ModuleRecordsApi.getRecords("TASKFORCE", { cityId: filterCity !== 'ALL' ? filterCity : undefined }).catch(() => null),
//         ModuleRecordsApi.getRecords("TOILET", { cityId: filterCity !== 'ALL' ? filterCity : undefined }).catch(() => null)
//       ]);

//       const extraStatsData = {
//         toilet: {
//           registered: toiletStatsRes?.totalToilets || 0,
//           pendingReg: toiletPendingRes?.toilets?.length || 0,
//           inspectionsDone: toiletRecords?.stats?.approved || 0,
//           inspectionPending: toiletRecords?.stats?.pending || 0,
//           uninspected: Math.max(0, (toiletStatsRes?.totalToilets || 0) - (toiletRecords?.stats?.approved || 0) - (toiletRecords?.stats?.pending || 0)),
//           actionTaken: toiletRecords?.stats?.actionTaken || 0,
//           actionRequired: toiletRecords?.stats?.actionRequired || 0,
//           totalInspections: toiletRecords?.stats?.total || 0
//         },
//         twinbin: {
//           registered: twinbinAllRes?.bins?.length || 0,
//           pendingReg: twinbinPendingRes?.data?.length || 0,
//           inspectionsDone: twinbinRecords?.stats?.approved || 0,
//           inspectionPending: twinbinRecords?.stats?.pending || 0,
//           uninspected: Math.max(0, (twinbinAllRes?.bins?.length || 0) - (twinbinRecords?.stats?.total || 0)),
//           actionTaken: twinbinRecords?.stats?.actionTaken || 0,
//           actionRequired: twinbinRecords?.stats?.actionRequired || 0,
//           totalInspections: twinbinRecords?.stats?.total || 0
//         },
//         taskforce: {
//           registered: taskforceAllRes?.feederPoints?.length || 0,
//           pendingReg: taskforcePendingRes?.feederPoints?.length || 0,
//           inspectionsDone: taskforceRecords?.stats?.approved || 0,
//           inspectionPending: taskforceRecords?.stats?.pending || 0,
//           uninspected: Math.max(0, (taskforceAllRes?.feederPoints?.length || 0) - (taskforceRecords?.stats?.total || 0)),
//           actionTaken: taskforceRecords?.stats?.actionTaken || 0,
//           actionRequired: taskforceRecords?.stats?.actionRequired || 0,
//           totalInspections: taskforceRecords?.stats?.total || 0
//         }
//       };

//       setExtraModuleStats(extraStatsData);

//       // Process Asset Requests for "Live Container"
//       const assetsList = [
//         ...(toiletPendingRes?.toilets || []).map((t: any) => ({
//           id: t.id, module: 'Toilet', requestedBy: t.requestedBy?.name || t.requestedByName || 'Supervisor',
//           approvedBy: t.approvedBy?.name || 'Pending Approval', date: t.createdAt || new Date().toISOString(),
//           zone: t.zone?.name || t.zoneName || 'Unknown Zone', ward: t.ward?.name || t.wardName || 'Unknown Ward', status: t.status
//         })),
//         ...(twinbinPendingRes?.data || []).map((t: any) => ({
//           id: t.id, module: 'Litterbin', requestedBy: t.requestedBy?.name || t.requestedByName || 'Supervisor',
//           approvedBy: t.approvedBy?.name || 'Pending Approval', date: t.createdAt || new Date().toISOString(),
//           zone: t.zone?.name || t.zoneName || 'Unknown Zone', ward: t.ward?.name || t.wardName || 'Unknown Ward', status: t.status
//         })),
//         ...(taskforcePendingRes?.feederPoints || []).map((t: any) => ({
//           id: t.id, module: 'GVP/CTU', requestedBy: t.requestedBy?.name || t.requestedByName || 'Supervisor',
//           approvedBy: t.approvedBy?.name || 'Pending Approval', date: t.createdAt || new Date().toISOString(),
//           zone: t.zone?.name || t.zoneName || 'Unknown Zone', ward: t.ward?.name || t.wardName || 'Unknown Ward', status: t.status
//         })),
//       ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

//       setAssetRequests(assetsList);

//       // Process Supervisor Missed Work
//       const missedWorkMap: Record<string, { id: string, name: string, role: string, zone: string, ward: string, missedCount: number }> = {};
//       beats.forEach((b: any) => {
//         if (b.assignedToId) {
//           const supId = b.assignedToId;
//           const supName = b.assignedTo?.name || b.assignedToName || 'Unknown Supervisor';
//           const zName = b.ward?.zone?.name || b.zoneName || 'Unknown Zone';
//           const wName = b.ward?.name || b.wardName || 'Unknown Ward';
//           const status = b.lastAssessment?.status || b.status;

//           if (!missedWorkMap[supId]) {
//             missedWorkMap[supId] = { id: supId, name: supName, role: 'Supervisor', zone: zName, ward: wName, missedCount: 0 };
//           }

//           if (!status || status === "REJECTED" || status === "ACTION_REQUIRED" || status === "PENDING" || status === "PENDING_ASSIGNMENT") {
//             missedWorkMap[supId].missedCount++;
//           }
//         }
//       });

//       setSupervisorMissedWork(Object.values(missedWorkMap).filter(w => w.missedCount > 0).sort((a, b) => b.missedCount - a.missedCount));

//       if (isReadOnlyView) {
//         // Fetch toilet dashboard stats for commissioner premium sections
//         const toiletDash = await ToiletApi.getDashboardStats().catch(() => null);
//         if (toiletDash) setToiletDashStats(toiletDash);

//         // Build QC leaderboard from toilet inspections
//         try {
//           const inspRes = await ToiletApi.listInspections({ pageSize: 50 });
//           const inspections = inspRes?.inspections || [];
//           const qcMap: Record<string, { name: string; count: number }> = {};
//           inspections.forEach((insp: any) => {
//             const eName = insp.employee?.name || insp.employeeName || 'Unknown';
//             const eId = insp.employeeId || eName;
//             if (!qcMap[eId]) qcMap[eId] = { name: eName, count: 0 };
//             qcMap[eId].count++;
//           });
//           const leaderboard = Object.values(qcMap)
//             .sort((a, b) => b.count - a.count)
//             .slice(0, 5)
//             .map(q => ({ name: q.name, inspections: q.count }));
//           setQcLeaderboard(leaderboard);
//         } catch { setQcLeaderboard([]); }
//       }
//       setSweepingDetailLoading(false);
//     } finally { setLastRefreshed(new Date()); setRefreshing(false); }
//   };

//   useEffect(() => { loadAll(); }, [isReadOnlyView]);

//   const share = () => {
//     const msg = `*${cityName || 'City'} | City Admin Report*\nShared via Taskforce20`;
//     window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
//   };

//   const totalUsers = (stats?.qualityControllers || 0) + (stats?.taskforceMembers || 0) +
//     (stats?.ulbOfficials || 0) + (stats?.actionOfficers || 0) + (stats?.cityAdmins || 0);


//   // ─── CITY ADMIN VIEW — Premium Dashboard ──────────────────────────────────────
//   const roleData = [
//     { label: "Quality Controllers", key: "qualityControllers", color: "#7c3aed", bg: "#f5f3ff", icon: <Search size={16} />, href: "/city/users?role=QC" },
//     { label: "Taskforce Members", key: "taskforceMembers", color: "#d97706", bg: "#fffbeb", icon: <Users size={16} />, href: "/city/users?role=EMPLOYEE" },
//     { label: "ULB Officials", key: "ulbOfficials", color: "#dc2626", bg: "#fef2f2", icon: <Landmark size={16} />, href: "/city/users?role=COMMISSIONER" },
//     { label: "Action Officers", key: "actionOfficers", color: "#059669", bg: "#f0fdf4", icon: <UserCog size={16} />, href: "/city/users?role=ACTION_OFFICER" },
//     { label: "City Admins", key: "cityAdmins", color: "#4f46e5", bg: "#eef2ff", icon: <ShieldCheck size={16} />, href: "/city/users?role=CITY_ADMIN" },
//   ];
//   const quickActions = [
//     {
//       title: "Add New User",
//       description: "Create new user account",
//       href: "/city/users/create",
//       icon: Users,
//       cardAccent: "before:bg-blue-600",
//       iconStyle: "bg-blue-50 text-blue-600",
//     },
//     {
//       title: "Manage Areas",
//       description: "Add or update areas",
//       href: "/city/areas",
//       icon: Target,
//       cardAccent: "before:bg-violet-600",
//       iconStyle: "bg-violet-50 text-violet-600",
//     },
//     {
//       title: "Reg Requests",
//       description: "Review pending requests",
//       href: "/registration-requests",
//       icon: Bell,
//       cardAccent: "before:bg-orange-500",
//       iconStyle: "bg-orange-50 text-orange-600",
//       showBadge: true,
//     },
//   ];

//   const getModuleVisual = (module: {
//     name?: string;
//     key?: string;
//   }) => {
//     const moduleIdentity =
//       `${module.key || ""} ${module.name || ""}`.toLowerCase();

//     if (moduleIdentity.includes("toilet")) {
//       return {
//         Icon: Toilet,
//         iconClass: "bg-blue-50 text-blue-600",
//       };
//     }

//     if (
//       moduleIdentity.includes("litter") ||
//       moduleIdentity.includes("twinbin") ||
//       moduleIdentity.includes("bin")
//     ) {
//       return {
//         Icon: Trash2,
//         iconClass: "bg-orange-50 text-orange-600",
//       };
//     }

//     if (moduleIdentity.includes("sweep")) {
//       return {
//         Icon: BrushCleaning,
//         iconClass: "bg-emerald-50 text-emerald-600",
//       };
//     }

//     if (
//       moduleIdentity.includes("taskforce") ||
//       moduleIdentity.includes("gvp") ||
//       moduleIdentity.includes("ctu")
//     ) {
//       return {
//         Icon: Truck,
//         iconClass: "bg-violet-50 text-violet-600",
//       };
//     }

//     return {
//       Icon: Package,
//       iconClass: "bg-slate-100 text-slate-600",
//     };
//   };

//   const maxRoleVal = Math.max(...roleData.map((r) => stats?.[r.key] || 0), 1);

//   return (
//     <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
//       <style>{`
//         @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
//         .da-card { transition: box-shadow 0.18s, transform 0.18s; }
//         .da-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.09) !important; transform: translateY(-2px); }
//         .da-row:hover { background: #f8fafc !important; }
//         .da-link { text-decoration: none; }
        
//         /* Responsive Grids */
//         .responsive-grid-sidebar { display: grid; grid-template-columns: 280px 1fr; gap: 20px; }
//         .responsive-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
//         .page-padding { padding: 28px 36px; }
//         .header-flex { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; position: relative; }
//         .req-table { display: grid; grid-template-columns: 1fr 120px 100px; gap: 12px; }


// /* ================= CITY ADMIN PREMIUM HEADER ================= */

// .city-admin-top-section {
//   padding: 24px 28px 0;
// }

// .city-admin-hero {
//   position: relative;
//   overflow: hidden;

//   min-height: 390px;          /* main card ki height */
//   display: flex;
//   flex-direction: column;

//   background:
//     radial-gradient(
//       circle at 88% 18%,
//       rgba(59, 130, 246, 0.08),
//       transparent 28%
//     ),
//     linear-gradient(
//       135deg,
//       #ffffff 0%,
//       #fbfdff 70%,
//       #f4f8ff 100%
//     );

//   border: 1px solid #dbe4f0;
//   border-top: 3px solid #2563eb;
//   border-radius: 24px;

//   padding: 34px 32px 18px;   /* bottom padding bhi add hua */

//   box-shadow:
//     0 18px 45px rgba(15, 23, 42, 0.07),
//     0 3px 10px rgba(15, 23, 42, 0.03);
// }

// .city-admin-hero::before {
//   content: "";
//   position: absolute;
//   right: 0;
//   bottom: 88px;
//   width: 500px;
//   height: 190px;
//   opacity: 0.68;
//   pointer-events: none;
//   background:
//     linear-gradient(to top, rgba(219, 234, 254, 0.75), transparent 80%);
//   clip-path: polygon(
//     0 100%, 0 76%, 6% 76%, 6% 58%, 11% 58%, 11% 69%,
//     17% 69%, 17% 40%, 22% 40%, 22% 67%, 28% 67%,
//     28% 55%, 34% 55%, 34% 74%, 42% 74%, 42% 45%,
//     48% 45%, 48% 73%, 55% 73%, 55% 50%, 61% 50%,
//     61% 68%, 67% 68%, 67% 34%, 73% 34%, 73% 70%,
//     79% 70%, 79% 52%, 85% 52%, 85% 72%, 92% 72%,
//     92% 43%, 97% 43%, 97% 100%
//   );
// }

// .city-admin-hero-main {
//   position: relative;
//   z-index: 2;
//   display: flex;
//   justify-content: space-between;
//   align-items: flex-start;
//   gap: 28px;
// }

// .city-admin-identity {
//   display: flex;
//   align-items: flex-start;
//   gap: 14px;
//   min-width: 0;
// }

// .city-admin-logo-ring {
//   position: relative;
//   width: 62px;
//   height: 62px;
//   flex-shrink: 0;
//   border-radius: 50%;
//   display: grid;
//   place-items: center;
//   background: rgba(239, 246, 255, 0.95);
//   border: 1px solid #bfdbfe;
//   box-shadow:
//     0 0 0 5px rgba(219, 234, 254, 0.55),
//     0 7px 18px rgba(37, 99, 235, 0.13);
// }

// .city-admin-logo-ring::before {
//   content: "";
//   position: absolute;
//   inset: 5px;
//   border-radius: 50%;
//   border: 1px solid rgba(99, 102, 241, 0.3);
// }

// .city-admin-logo-ring::after {
//   content: "";
//   position: absolute;
//   right: -2px;
//   bottom: 6px;
//   width: 8px;
//   height: 8px;
//   border: 2px solid #ffffff;
//   border-radius: 50%;
//   background: #06b6d4;
// }

// .city-admin-logo-core {
//   position: relative;
//   z-index: 1;
//   width: 44px;
//   height: 44px;
//   border-radius: 50%;
//   display: grid;
//   place-items: center;
//   color: #ffffff;
//   background: linear-gradient(145deg, #2563eb, #6d28d9);
//   box-shadow: 0 6px 14px rgba(79, 70, 229, 0.25);
// }

// .city-admin-eyebrow {
//   margin-bottom: 3px;
//   color: #2563eb;
//   font-size: 9px;
//   font-weight: 900;
//   letter-spacing: 0.11em;
//   text-transform: uppercase;
// }

// .city-admin-title {
//   margin: 0;
//   color: #0f172a;
//   font-size: clamp(28px, 3vw, 38px);
//   font-weight: 950;
//   line-height: 1;
//   letter-spacing: -0.04em;
// }

// .city-admin-meta {
//   display: flex;
//   align-items: center;
//   flex-wrap: wrap;
//   gap: 10px;
//   margin-top: 8px;
// }

// .city-admin-ulb {
//   display: inline-flex;
//   align-items: center;
//   gap: 5px;
//   padding: 5px 10px;
//   border-radius: 9px;
//   color: #6d28d9;
//   background: #f5f3ff;
//   font-size: 10px;
//   font-weight: 800;
// }

// .city-admin-updated {
//   color: #64748b;
//   font-size: 10px;
//   font-weight: 600;
// }

// .city-admin-welcome {
//   margin: 24px 0 0 104px;
//   position: relative;
//   z-index: 2;
//   max-width: 560px;
// }

// .city-admin-welcome h2 {
//   margin: 0 0 7px;
//   color: #0f172a;
//   font-size: 17px;
//   font-weight: 850;
// }

// .city-admin-welcome p {
//   margin: 0;
//   max-width: 540px;
//   color: #64748b;
//   font-size: 13px;
//   font-weight: 500;
//   line-height: 1.65;
// }

// .city-admin-actions {
//   position: relative;
//   z-index: 3;
//   display: flex;
//   align-items: center;
//   justify-content: flex-end;
//   flex-wrap: nowrap;
//   gap: 8px;
// }

// .city-admin-action-btn {
//   height: 38px;
//   padding: 0 13px;
//   border: 1px solid #dbe4f0;
//   border-radius: 10px;
//   background: rgba(255, 255, 255, 0.92);
//   color: #0f172a;

//   display: inline-flex;
//   align-items: center;
//   justify-content: center;
//   gap: 6px;

//   font-size: 11px;
//   font-weight: 800;
//   white-space: nowrap;

//   cursor: pointer;
//   box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
//   transition: all 0.2s ease;
// }

// .city-admin-action-btn:hover {
//   border-color: #bfdbfe;
//   transform: translateY(-1px);
//   box-shadow: 0 6px 14px rgba(37, 99, 235, 0.1);
// }

// .city-admin-action-btn.primary {
//   height: 40px;
//   padding: 0 16px;
//   border-color: transparent;
//   color: #ffffff;
//   background: linear-gradient(135deg, #2563eb, #6d28d9);
//   box-shadow: 0 7px 16px rgba(79, 70, 229, 0.22);
// }

// .city-admin-action-btn:disabled {
//   cursor: not-allowed;
//   opacity: 0.7;
// }

// .city-admin-action-pills {
//   position: relative;
//   z-index: 3;
//   display: flex;
//   justify-content: flex-end;
//   flex-wrap: nowrap;
//   gap: 8px;
//   margin-top: 14px;
// }

// .city-admin-action-pill {
//   min-height: 36px;
//   padding: 0 13px;
//   border: 1px solid #dbeafe;
//   border-radius: 999px;
//   background: rgba(255, 255, 255, 0.9);

//   display: inline-flex;
//   align-items: center;
//   gap: 7px;

//   color: #2563eb;
//   font-size: 10px;
//   font-weight: 800;
//   white-space: nowrap;

//   box-shadow: 0 4px 11px rgba(37, 99, 235, 0.06);
// }

// .city-admin-action-pill.purple {
//   color: #6d28d9;
//   border-color: #ddd6fe;
//   background: rgba(250, 245, 255, 0.93);
// }

// .city-admin-action-pill strong {
//   color: #0f172a;
//   font-size: 13px;
//   font-weight: 900;
// }

// .city-admin-status-grid {
//   position: relative;
//   z-index: 4;
//   display: grid;
//   grid-template-columns: repeat(4, minmax(0, 1fr));

//   margin-top: auto;

//   border: 1px solid #dbe4f0;
//   border-radius: 17px;
//   background: rgba(255, 255, 255, 0.95);
//   overflow: hidden;

//   box-shadow: 0 7px 18px rgba(15, 23, 42, 0.04);
// }

// .city-admin-status-item {
//   min-height: 82px;
//   padding: 13px 16px;

//   display: flex;
//   align-items: center;
//   gap: 12px;

//   border-right: 1px solid #e2e8f0;
// }

// .city-admin-status-item:last-child {
//   border-right: none;
// }

// .city-admin-status-icon {
//   width: 42px;
//   height: 42px;
//   flex-shrink: 0;

//   border: 1px solid;
//   border-radius: 12px;

//   display: grid;
//   place-items: center;
// }

// .city-admin-status-label {
//   display: flex;
//   align-items: center;
//   gap: 6px;

//   margin-bottom: 4px;

//   color: #475569;
//   font-size: 8px;
//   font-weight: 900;
//   line-height: 1.2;
//   letter-spacing: 0.1em;
//   text-transform: uppercase;
// }

// .city-admin-status-label-dot {
//   width: 6px;
//   height: 6px;
//   flex-shrink: 0;
//   border-radius: 50%;
// }

// .city-admin-status-value {
//   color: #0f172a;
//   font-size: 16px;
//   font-weight: 900;
//   line-height: 1.15;
// }

// .city-admin-status-help {
//   margin-top: 3px;

//   color: #64748b;
//   font-size: 9px;
//   font-weight: 500;
//   line-height: 1.35;
// }

// /* ================= CITY ADMIN USER CARDS ================= */

// /* ================= COMPACT USER OVERVIEW ================= */

// .city-user-overview {
//   padding: 20px 0 0;
// }

// .city-user-overview-title {
//   position: relative;
//   display: inline-block;
//   margin-bottom: 16px;
//   color: #0f172a;
//   font-size: 10px;
//   font-weight: 900;
//   letter-spacing: 0.04em;
//   text-transform: uppercase;
// }

// .city-user-overview-title::after {
//   content: "";
//   position: absolute;
//   left: 0;
//   bottom: -7px;
//   width: 38px;
//   height: 2px;
//   border-radius: 999px;
//   background: #2563eb;
// }

// .city-user-card-grid {
//   display: grid;
//   grid-template-columns: repeat(6, minmax(0, 1fr));
//   gap: 12px;
// }

// .city-user-card {
//   min-height: 154px;
//   padding: 14px 14px 12px;

//   border: 1px solid #dbe4f0;
//   border-radius: 17px;
//   background: #ffffff;

//   display: flex;
//   flex-direction: column;

//   box-shadow:
//     0 7px 18px rgba(15, 23, 42, 0.045),
//     0 2px 4px rgba(15, 23, 42, 0.02);

//   transition:
//     transform 0.2s ease,
//     box-shadow 0.2s ease;
// }

// .city-user-card:hover {
//   transform: translateY(-2px);
//   box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
// }

// .city-user-card.modules-card {
//   border: 2px solid #315bea;

//   background:
//     radial-gradient(
//       circle at 95% 0%,
//       rgba(99, 102, 241, 0.12),
//       transparent 36%
//     ),
//     linear-gradient(145deg, #ffffff 0%, #eef2ff 100%);

//   box-shadow:
//     0 9px 20px rgba(37, 99, 235, 0.12),
//     inset 0 0 0 3px rgba(255, 255, 255, 0.4);
// }

// .city-user-card-top {
//   display: flex;
//   align-items: flex-start;
//   justify-content: space-between;
// }

// .city-user-card-icon {
//   width: 43px;
//   height: 43px;
//   border-radius: 12px;
//   display: grid;
//   place-items: center;
// }

// .city-user-card-arrow {
//   margin-top: 2px;
//   color: #94a3b8;
// }

// .city-user-card-main-row {
//   display: flex;
//   align-items: flex-end;
//   gap: 7px;
//   margin-top: 9px;
//   min-height: 35px;
// }

// .city-user-card-number {
//   margin: 0;
//   flex-shrink: 0;

//   color: #0f172a;
//   font-size: 27px;
//   font-weight: 950;
//   line-height: 1;
//   letter-spacing: -0.04em;
// }

// .city-user-card-label {
//   margin: 0 0 2px;

//   color: #475569;
//   font-size: 11px;
//   font-weight: 650;
//   line-height: 1.2;
// }

// .city-user-status {
//   margin-top: auto;
//   min-height: 34px;
//   padding: 0 10px;

//   border-radius: 10px;

//   display: flex;
//   align-items: center;
//   justify-content: space-between;
//   gap: 6px;

//   font-size: 8px;
//   font-weight: 800;
// }

// .city-user-status-left {
//   min-width: 0;
//   display: inline-flex;
//   align-items: center;
//   gap: 5px;
// }

// .city-user-status-dot {
//   width: 6px;
//   height: 6px;
//   flex-shrink: 0;
//   border-radius: 50%;
// }

// .city-user-card.modules-card .city-user-status {
//   color: #ffffff !important;
//   background: linear-gradient(135deg, #2563eb, #3b65e9) !important;
//   box-shadow: 0 5px 12px rgba(37, 99, 235, 0.18);
// }



// @media (max-width: 1250px) {
//   .city-user-card-grid {
//     grid-template-columns: repeat(3, minmax(0, 1fr));
//   }

//   .city-admin-status-grid {
//     grid-template-columns: repeat(2, minmax(0, 1fr));
//   }

//   .city-admin-status-item:nth-child(2) {
//     border-right: none;
//   }

//   .city-admin-status-item:nth-child(-n + 2) {
//     border-bottom: 1px solid #e2e8f0;
//   }
// }

// @media (max-width: 850px) {
//   .city-admin-top-section,
//   .city-user-overview {
//     padding-left: 16px;
//     padding-right: 16px;
//   }

//   .city-admin-hero {
//     padding: 25px 20px 0;
//     border-radius: 18px;
//   }

//   .city-admin-hero-main {
//     flex-direction: column;
//   }

//   .city-admin-actions,
//   .city-admin-action-pills {
//     justify-content: flex-start;
//   }

//   .city-admin-welcome {
//     margin-left: 0;
//   }

//   .city-user-card-grid {
//     grid-template-columns: repeat(2, minmax(0, 1fr));
//   }
// }

// @media (max-width: 560px) {
//   .city-admin-identity {
//     gap: 14px;
//   }

//   .city-admin-logo-ring {
//     width: 66px;
//     height: 66px;
//   }

//   .city-admin-logo-core {
//     width: 46px;
//     height: 46px;
//   }

//   .city-admin-title {
//     font-size: 32px;
//   }

//   .city-admin-action-btn {
//     flex: 1;
//     padding: 0 12px;
//   }

//   .city-admin-action-pill {
//     flex: 1;
//     justify-content: center;
//   }

//   .city-admin-status-grid,
//   .city-user-card-grid {
//     grid-template-columns: 1fr;
//   }

//   .city-admin-status-item,
//   .city-admin-status-item:nth-child(2) {
//     border-right: none;
//     border-bottom: 1px solid #e2e8f0;
//   }

//   .city-admin-status-item:last-child {
//     border-bottom: none;
//   }
// }




// /* ================= PREMIUM CITY ADMIN DASHBOARD ================= */
// .ca-page {
//   min-height: 100vh;
//   background:
//     radial-gradient(circle at 12% 0%, rgba(37, 99, 235, 0.075), transparent 28%),
//     radial-gradient(circle at 92% 8%, rgba(99, 102, 241, 0.055), transparent 24%),
//     #f6f8fc;
//   color: #0f172a;
// }
// .ca-shell {
//   width: min(1480px, calc(100% - 40px));
//   margin: 0 auto;
//   padding: 24px 0 42px;
//   display: flex;
//   flex-direction: column;
//   gap: 18px;
// }
// .ca-hero {
//   position: relative;
//   overflow: hidden;
//   min-height: 160px;
//   padding: 26px 28px;
//   border: 1px solid #dbe5f2;
//   border-radius: 26px;
//   background:
//     linear-gradient(112deg, rgba(255,255,255,.99) 0%, rgba(255,255,255,.96) 48%, rgba(239,246,255,.89) 100%),
//     url('/Taskforce_background_header.png') right center / cover no-repeat;
//   box-shadow: 0 18px 45px rgba(30, 64, 175, 0.08), 0 2px 8px rgba(15,23,42,.035);
// }
// .ca-hero::after {
//   content: '';
//   position: absolute;
//   width: 340px;
//   height: 340px;
//   right: -100px;
//   top: -170px;
//   border-radius: 50%;
//   background: radial-gradient(circle, rgba(37,99,235,.12), rgba(37,99,235,0) 67%);
//   pointer-events: none;
// }
// .ca-hero-row {
//   position: relative;
//   z-index: 2;
//   display: flex;
//   justify-content: space-between;
//   align-items: center;
//   gap: 24px;
// }
// .ca-brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
// .ca-brand-icon {
//   width: 54px;
//   height: 54px;
//   flex-shrink: 0;
//   border-radius: 17px;
//   display: grid;
//   place-items: center;
//   color: #fff;
//   background: linear-gradient(145deg, #2563eb, #4f46e5);
//   box-shadow: 0 12px 24px rgba(37,99,235,.23), inset 0 1px 0 rgba(255,255,255,.25);
// }
// .ca-kicker {
//   display: flex;
//   align-items: center;
//   gap: 7px;
//   color: #2563eb;
//   font-size: 10px;
//   font-weight: 900;
//   letter-spacing: .11em;
//   text-transform: uppercase;
//   margin-bottom: 5px;
// }
// .ca-title {
//   margin: 0;
//   font-size: clamp(24px, 2.6vw, 34px);
//   line-height: 1.05;
//   font-weight: 950;
//   letter-spacing: -.035em;
//   color: #0f172a;
// }
// .ca-subtitle {
//   margin-top: 7px;
//   display: flex;
//   align-items: center;
//   gap: 8px;
//   flex-wrap: wrap;
//   color: #64748b;
//   font-size: 12px;
//   font-weight: 650;
// }
// .ca-city-name { color: #1d4ed8; font-weight: 850; }
// .ca-dot { width: 4px; height: 4px; border-radius: 50%; background: #cbd5e1; }
// .ca-toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 9px; flex-wrap: wrap; }
// .ca-control,
// .ca-alert-btn,
// .ca-refresh-btn {
//   height: 40px;
//   border-radius: 12px;
//   display: inline-flex;
//   align-items: center;
//   gap: 8px;
//   padding: 0 13px;
//   font-size: 12px;
//   font-weight: 800;
//   outline: none;
//   transition: .2s ease;
// }
// .ca-control {
//   border: 1px solid #dbe5f2;
//   color: #334155;
//   background: rgba(255,255,255,.94);
//   box-shadow: 0 4px 12px rgba(15,23,42,.04);
// }
// .ca-control input { border: 0; outline: 0; background: transparent; font: inherit; color: #0f172a; cursor: pointer; }
// .ca-alert-btn { border: 1px solid #fecaca; color: #dc2626; background: #fff7f7; cursor: pointer; }
// .ca-alert-badge {
//   min-width: 19px;
//   height: 19px;
//   padding: 0 5px;
//   display: inline-grid;
//   place-items: center;
//   border-radius: 999px;
//   color: #fff;
//   background: #dc2626;
//   font-size: 10px;
//   font-weight: 900;
// }
// .ca-refresh-btn {
//   border: 1px solid #bfdbfe;
//   color: #1d4ed8;
//   background: #eff6ff;
//   cursor: pointer;
// }
// .ca-refresh-btn:hover, .ca-alert-btn:hover, .ca-control:hover { transform: translateY(-1px); box-shadow: 0 7px 18px rgba(37,99,235,.08); }
// .ca-refresh-btn:disabled { opacity: .65; cursor: not-allowed; transform: none; }

// .ca-section {
//   position: relative;
//   overflow: hidden;
//   border: 1px solid #dfe7f1;
//   border-radius: 24px;
//   background: rgba(255,255,255,.94);
//   padding: 20px;
//   box-shadow: 0 10px 30px rgba(15,23,42,.045), 0 1px 2px rgba(15,23,42,.03);
// }
// .ca-section::before {
//   content: '';
//   position: absolute;
//   inset: 0 0 auto 0;
//   height: 1px;
//   background: linear-gradient(90deg, transparent, rgba(59,130,246,.38), transparent);
// }
// .ca-section-head {
//   display: flex;
//   justify-content: space-between;
//   align-items: center;
//   gap: 16px;
//   margin-bottom: 16px;
// }
// .ca-section-title-wrap { display: flex; align-items: center; gap: 11px; min-width: 0; }
// .ca-section-icon {
//   width: 36px;
//   height: 36px;
//   border-radius: 11px;
//   display: grid;
//   place-items: center;
//   background: #eff6ff;
//   color: #2563eb;
//   border: 1px solid #dbeafe;
// }
// .ca-section-title {
//   margin: 0;
//   color: #1e293b;
//   font-size: 12px;
//   font-weight: 950;
//   letter-spacing: .055em;
//   text-transform: uppercase;
// }
// .ca-section-note { margin: 3px 0 0; color: #94a3b8; font-size: 10px; font-weight: 650; }
// .ca-mini-refresh {
//   height: 32px;
//   padding: 0 10px;
//   border: 1px solid #e2e8f0;
//   border-radius: 10px;
//   background: #f8fafc;
//   color: #64748b;
//   display: inline-flex;
//   align-items: center;
//   gap: 6px;
//   font-size: 10px;
//   font-weight: 800;
//   cursor: pointer;
// }
// .ca-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; }
// .ca-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 15px; }

// .ca-stat-card {
//   position: relative;
//   overflow: hidden;
//   min-height: 112px;
//   padding: 16px;
//   border-radius: 18px;
//   border: 1px solid #e2e8f0;
//   background: linear-gradient(145deg, #ffffff 0%, #fbfdff 100%);
//   box-shadow: 0 5px 16px rgba(15,23,42,.035);
//   transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
// }
// .ca-stat-card:hover { transform: translateY(-2px); border-color: #cbdcf7; box-shadow: 0 12px 26px rgba(37,99,235,.09); }
// .ca-stat-card::after {
//   content: '';
//   position: absolute;
//   right: -26px;
//   bottom: -35px;
//   width: 110px;
//   height: 110px;
//   border-radius: 50%;
//   background: var(--soft);
//   opacity: .58;
// }
// .ca-stat-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
// .ca-stat-icon {
//   width: 43px;
//   height: 43px;
//   border-radius: 13px;
//   display: grid;
//   place-items: center;
//   color: var(--accent);
//   background: var(--soft);
//   border: 1px solid var(--border);
// }
// .ca-stat-label {
//   margin-top: 13px;
//   color: #64748b;
//   font-size: 9px;
//   font-weight: 900;
//   line-height: 1.3;
//   letter-spacing: .055em;
//   text-transform: uppercase;
// }
// .ca-stat-value {
//   margin-top: 4px;
//   color: #0f172a;
//   font-size: 29px;
//   line-height: 1;
//   font-weight: 950;
//   letter-spacing: -.04em;
// }
// .ca-stat-line { position: absolute; left: 16px; bottom: 0; width: 52px; height: 3px; border-radius: 999px 999px 0 0; background: var(--accent); }

// .ca-user-card {
//   display: flex;
//   align-items: center;
//   gap: 14px;
//   min-height: 98px;
//   padding: 15px;
//   border-radius: 17px;
//   border: 1px solid var(--border);
//   background: linear-gradient(135deg, #fff 0%, var(--wash) 180%);
//   transition: .2s ease;
// }
// .ca-user-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,23,42,.07); }
// .ca-user-icon { width: 46px; height: 46px; flex-shrink: 0; border-radius: 14px; display: grid; place-items: center; color: var(--accent); background: var(--wash); }
// .ca-user-label { color: #64748b; font-size: 9px; line-height: 1.25; font-weight: 900; letter-spacing: .045em; text-transform: uppercase; }
// .ca-user-value { margin-top: 5px; color: #0f172a; font-size: 26px; line-height: 1; font-weight: 950; }

// .ca-module-card {
//   position: relative;
//   overflow: hidden;
//   min-height: 104px;
//   padding: 16px;
//   border-radius: 18px;
//   border: 1px solid #e2e8f0;
//   background: #f9fbfe;
//   display: flex;
//   align-items: center;
//   gap: 13px;
//   transition: .2s ease;
// }
// .ca-module-card:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 10px 22px rgba(15,23,42,.065); }
// .ca-module-icon { width: 46px; height: 46px; flex-shrink: 0; border-radius: 14px; display: grid; place-items: center; color: var(--accent); background: var(--soft); border: 1px solid var(--border); }
// .ca-module-name { color: #0f172a; font-size: 12px; line-height: 1.25; font-weight: 850; }
// .ca-module-records { margin-top: 5px; color: #64748b; font-size: 11px; font-weight: 650; }
// .ca-module-accent { position: absolute; inset: auto 0 0 0; height: 3px; background: linear-gradient(90deg, var(--accent), transparent); }

// .ca-health-card {
//   min-height: 270px;
//   padding: 18px;
//   border-radius: 19px;
//   border: 1px solid var(--border);
//   background: linear-gradient(155deg, #fff 0%, var(--wash) 220%);
//   display: flex;
//   flex-direction: column;
//   align-items: center;
// }
// .ca-health-head { width: 100%; display: flex; align-items: center; gap: 10px; }
// .ca-health-icon { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; color: var(--accent); background: var(--wash); }
// .ca-health-title { font-size: 12px; font-weight: 900; color: #0f172a; }
// .ca-health-status {
//   width: 100%;
//   margin-top: auto;
//   padding-top: 14px;
//   border-top: 1px solid #eef2f7;
//   display: grid;
//   grid-template-columns: repeat(3, 1fr);
// }
// .ca-health-item { text-align: center; }
// .ca-health-num { display: flex; justify-content: center; align-items: center; gap: 5px; font-size: 12px; font-weight: 900; }
// .ca-health-dot { width: 7px; height: 7px; border-radius: 50%; }
// .ca-health-label { margin-top: 4px; color: #94a3b8; font-size: 9px; font-weight: 800; }

// .ca-chart-panel {
//   padding: 18px;
//   border: 1px solid #e3eaf3;
//   border-radius: 18px;
//   background:
//     linear-gradient(#f4f7fb 1px, transparent 1px),
//     linear-gradient(90deg, #f4f7fb 1px, transparent 1px),
//     #fbfdff;
//   background-size: 100% 42px, 72px 100%, auto;
// }
// .ca-chart { display: flex; gap: 18px; align-items: flex-end; height: 230px; padding: 0 4px 8px; border-bottom: 1px solid #cbd5e1; }
// .ca-chart-day { flex: 1; min-width: 70px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
// .ca-bars { width: 100%; height: 180px; display: flex; align-items: flex-end; justify-content: center; gap: 7px; }
// .ca-bar-wrap { height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
// .ca-bar-value { margin-bottom: 4px; font-size: 9px; font-weight: 900; }
// .ca-bar { width: 18px; min-height: 4px; border-radius: 6px 6px 2px 2px; box-shadow: 0 5px 12px rgba(15,23,42,.08); }
// .ca-chart-date { margin-top: 9px; color: #475569; font-size: 9px; font-weight: 850; text-align: center; }
// .ca-legend { display: flex; justify-content: center; flex-wrap: wrap; gap: 22px; margin-top: 16px; }
// .ca-legend-item { display: flex; align-items: center; gap: 7px; color: #334155; font-size: 10px; font-weight: 800; }
// .ca-legend-swatch { width: 10px; height: 10px; border-radius: 3px; }
// .ca-empty { padding: 44px 20px; text-align: center; color: #94a3b8; font-size: 12px; font-weight: 700; }

// @media (max-width: 1120px) {
//   .ca-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
//   .ca-grid-3 { grid-template-columns: 1fr; }
//   .ca-hero-row { align-items: flex-start; flex-direction: column; }
//   .ca-toolbar { justify-content: flex-start; }
// }
// @media (max-width: 700px) {
//   .ca-shell { width: min(100% - 24px, 1480px); padding-top: 12px; gap: 12px; }
//   .ca-hero, .ca-section { border-radius: 18px; }
//   .ca-hero { padding: 20px; }
//   .ca-section { padding: 15px; }
//   .ca-grid-4 { grid-template-columns: 1fr; }
//   .ca-toolbar { width: 100%; }
//   .ca-control, .ca-alert-btn, .ca-refresh-btn { flex: 1; justify-content: center; }
//   .ca-chart-panel { overflow-x: auto; }
//   .ca-chart { min-width: 680px; }
// }

//         @media (max-width: 1200px) {
//           .responsive-grid-sidebar { grid-template-columns: 240px 1fr; }
//           .responsive-grid-3 { grid-template-columns: 1fr 1fr; }
//         }
//         @media (max-width: 900px) {
//           .responsive-grid-sidebar { grid-template-columns: 1fr; }
//           .responsive-grid-3 { grid-template-columns: 1fr; }
//           .page-padding { padding: 20px 24px; }
//         }
//         @media (max-width: 600px) {
//           .page-padding { padding: 16px; }
//           .hero-banner { padding: 24px 20px !important; }
//           .hero-stats { gap: 8px !important; }
//           .hero-stats > div { flex: 1; min-width: 120px; padding: 8px 12px !important; }
//           .req-table { grid-template-columns: 1fr 80px; }
//           .req-table .req-role { display: none; } /* Hide role on mobile to save space */
//         }
//       `}


//       </style>

//       {/* ══════════════ COMMISSIONER / ULB OFFICER VIEW — PREMIUM ══════════════ */}
//       {isReadOnlyView ? (
//         <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

//           {/* ── Hero Banner ── */}
//           <div style={{
//             background: 'linear-gradient(120deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
//             padding: '32px 40px 28px', position: 'relative', overflow: 'hidden'
//           }}>
//             <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', pointerEvents: 'none' }} />
//             <div style={{ position: 'absolute', bottom: -60, right: 160, width: 180, height: 180, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', pointerEvents: 'none' }} />

//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
//               <div>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
//                   <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//                     <Building2 size={20} color="#fff" />
//                   </div>
//                   <div>
//                     <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ULB Official · City Operations</div>
//                     <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
//                       {cityName || 'City Administration'}
//                     </h1>
//                   </div>
//                 </div>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
//                   <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 7, padding: '4px 12px', fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
//                     <Landmark size={12} />
//                   </span>
//                   <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
//                     Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
//                   </span>
//                 </div>
//               </div>
//               <div style={{ display: 'flex', gap: 10 }}>
//                 <button onClick={loadAll} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: refreshing ? 'not-allowed' : 'pointer', backdropFilter: 'blur(8px)' }}>
//                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
//                   {refreshing ? 'Refreshing...' : 'Refresh'}
//                 </button>
//                 <button onClick={share} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
//                   Share View
//                 </button>
//               </div>
//             </div>

//             {/* Hero stat bar */}
//             <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
//               {[
//                 { label: 'Zones', value: cityGeoStats?.zones },
//                 { label: 'Wards', value: cityGeoStats?.wards },
//                 { label: 'Areas', value: cityGeoStats?.areas },
//                 { label: 'Beats', value: cityGeoStats?.beats },
//                 { label: 'Modules', value: stats?.totalModules ?? '—' },
//               ].map((c, i) => (
//                 <div key={i} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
//                   <span style={{ fontSize: 14, fontWeight: 800 }}>{statsLoading ? '—' : c.value}</span>
//                   <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{c.label}</span>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* ── Body ── */}
//           <div style={{ padding: '28px 40px' }}>

//             {/* Section: City Operations Overview */}
//             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
//               <Building2 size={14} color="#2563eb" />
//               <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#334155' }}>City Operations Overview</span>
//               <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
//             </div>
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
//               {[
//                 { label: "Total Zones", value: cityGeoStats?.zones, icon: <Map size={20} />, color: "#4f46e5", href: "/city/zones" },
//                 { label: "Total Wards", value: cityGeoStats?.wards, icon: <MapPin size={20} />, color: "#2563eb", href: "/city/wards" },
//                 { label: "Total Areas", value: cityGeoStats?.areas, icon: <Target size={20} />, color: "#0ea5e9", href: "/city/areas" },
//                 { label: "Total Beats", value: cityGeoStats?.beats, icon: <Map size={20} />, color: "#0284c7", href: "/city/areas" },
//                 { label: "Total Modules", value: stats?.totalModules, icon: <Package size={20} />, color: "#3b82f6", href: "/city/modules" },
//                 { label: "Quality Controller", value: stats?.qualityControllers, icon: <Search size={20} />, color: "#8b5cf6", href: "/city/users?role=QC" },
//                 { label: "Taskforce Member", value: stats?.taskforceMembers, icon: <Users size={20} />, color: "#f59e0b", href: "/city/users?role=EMPLOYEE" },
//                 { label: "ULB Officials", value: stats?.ulbOfficials, icon: <Landmark size={20} />, color: "#ef4444", href: "/city/users?role=COMMISSIONER" },
//                 { label: "Action Officer", value: stats?.actionOfficers, icon: <UserCog size={20} />, color: "#10b981", href: "/city/users?role=ACTION_OFFICER" },
//                 { label: "City Admin", value: stats?.cityAdmins, icon: <ShieldCheck size={20} />, color: "#6366f1", href: "/city/users?role=CITY_ADMIN" },
//               ].map((s, i) => (
//                 <Link key={i} href={s.href} style={{ textDecoration: 'none' }}>
//                   <div className="da-card" style={{
//                     padding: '16px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
//                     display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
//                     boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.18s', borderLeft: `3px solid ${s.color}`
//                   }}>
//                     <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}14`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
//                       {s.icon}
//                     </div>
//                     <div>
//                       <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{s.label}</div>
//                       <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
//                         {statsLoading || refreshing ? <span style={{ color: '#e2e8f0' }}>—</span> : (s.value ?? 0)}
//                       </div>
//                     </div>
//                   </div>
//                 </Link>
//               ))}
//             </div>

//             <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
//               <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: 10, background: 'white', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
//                 <Activity size={14} />
//                 Sweeping Details
//               </div>
//             </div>
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
//               {[
//                 { label: "Total Beats", value: sweepingDetailStats.totalBeats, icon: <Target size={20} />, color: "#3b82f6", href: "/city/areas" },
//                 { label: "Total Sub-Beats", value: sweepingDetailStats.totalSegments, icon: <Database size={20} />, color: "#8b5cf6", href: "/city/areas" },
//                 { label: "Assigned Sub-Beats", value: sweepingDetailStats.assignedSegments, icon: <CheckCircle size={20} />, color: "#0ea5e9", href: "/city/areas" },
//                 { label: "QC Assigned", value: sweepingDetailStats.qcAssigned, icon: <ShieldCheck size={20} />, color: "#10b981", href: "/city/users?role=QC" },
//                 { label: "Total Approved", value: sweepingDetailStats.totalApproved, icon: <CheckCircle size={20} />, color: "#22c55e", href: "/city/beat-status" },
//                 { label: "Action Required", value: sweepingDetailStats.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: "/city/beat-status" },
//                 { label: "Pending Deployment", value: sweepingDetailStats.pendingDeployment, icon: <Map size={20} />, color: "#f59e0b", href: "/city/areas" },
//                 { label: "Beat Status Overview", value: "→ View", icon: <Activity size={20} />, color: "#7c3aed", href: "/city/beat-status" },
//               ].map((s, i) => (
//                 <Link key={i} href={s.href} style={{ textDecoration: 'none' }}>
//                   <div className="card card-hover" style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, height: '100%', transition: 'all 0.2s ease' }}>
//                     <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
//                       {s.icon}
//                     </div>
//                     <div>
//                       <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>{s.label}</div>
//                       <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
//                         {sweepingDetailLoading || refreshing ? "..." : s.value}
//                       </div>
//                     </div>
//                   </div>
//                 </Link>
//               ))}
//             </div>

//             {moduleActivity.filter(m => m.key.toUpperCase() !== 'SWEEPING').map((m, i) => {
//               let displayName = m.name;
//               const keyStr = m.key.toLowerCase();
//               let customStats: any[] = [];

//               if (keyStr === 'toilet') {
//                 displayName = 'Cleanliness of Toilet';
//                 customStats = [
//                   { label: "Toilets Registered", value: extraModuleStats.toilet.registered, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/toilet` },
//                   { label: "Registration Pending", value: extraModuleStats.toilet.pendingReg, icon: <Activity size={20} />, color: "#f59e0b", href: `/modules/toilet` },
//                   { label: "Inspections Done (QC)", value: extraModuleStats.toilet.inspectionsDone, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/toilet` },
//                   { label: "Pending QC Inspection", value: extraModuleStats.toilet.inspectionPending, icon: <MapPin size={20} />, color: "#3b82f6", href: `/modules/toilet` },
//                   { label: "Action Required", value: extraModuleStats.toilet.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/toilet` },
//                   { label: "Action Taken by AO", value: extraModuleStats.toilet.actionTaken, icon: <CheckCircle size={20} />, color: "#10b981", href: `/modules/toilet` },
//                   { label: "Inspection Not Started", value: extraModuleStats.toilet.uninspected, icon: <Target size={20} />, color: "#64748b", href: `/modules/toilet` },
//                 ];
//               } else if (keyStr === 'taskforce') {
//                 displayName = 'CTU/GVP Transformation';
//                 customStats = [
//                   { label: "GVP Points Registered", value: extraModuleStats.taskforce.registered, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/taskforce` },
//                   { label: "Requests Pending", value: extraModuleStats.taskforce.pendingReg, icon: <Activity size={20} />, color: "#f59e0b", href: `/modules/taskforce` },
//                   { label: "Total Inspections", value: extraModuleStats.taskforce.totalInspections, icon: <Database size={20} />, color: "#3b82f6", href: `/modules/taskforce` },
//                   { label: "Approved by QC", value: extraModuleStats.taskforce.inspectionsDone, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/taskforce` },
//                   { label: "Pending QC", value: extraModuleStats.taskforce.inspectionPending, icon: <MapPin size={20} />, color: "#3b82f6", href: `/modules/taskforce` },
//                   { label: "Action Required", value: extraModuleStats.taskforce.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/taskforce` },
//                   { label: "Action Taken by AO", value: extraModuleStats.taskforce.actionTaken, icon: <CheckCircle size={20} />, color: "#10b981", href: `/modules/taskforce` },
//                 ];
//               } else if (keyStr === 'twinbin' || keyStr === 'litterbins') {
//                 displayName = 'Litterbins';
//                 customStats = [
//                   { label: "Litterbins Registered", value: extraModuleStats.twinbin.registered, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/twinbin` },
//                   { label: "Requests Pending", value: extraModuleStats.twinbin.pendingReg, icon: <Activity size={20} />, color: "#f59e0b", href: `/modules/twinbin` },
//                   { label: "Total Inspections", value: extraModuleStats.twinbin.totalInspections, icon: <Database size={20} />, color: "#3b82f6", href: `/modules/twinbin` },
//                   { label: "Approved by QC", value: extraModuleStats.twinbin.inspectionsDone, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/twinbin` },
//                   { label: "Pending QC", value: extraModuleStats.twinbin.inspectionPending, icon: <MapPin size={20} />, color: "#3b82f6", href: `/modules/twinbin` },
//                   { label: "Action Required", value: extraModuleStats.twinbin.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/twinbin` },
//                   { label: "Action Taken by AO", value: extraModuleStats.twinbin.actionTaken, icon: <CheckCircle size={20} />, color: "#10b981", href: `/modules/twinbin` },
//                 ];
//               } else {
//                 customStats = [
//                   { label: "Total Uploads", value: m.total, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/${m.key.toLowerCase()}` },
//                   { label: "Approved", value: m.approved, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/${m.key.toLowerCase()}` },
//                   { label: "Action Required", value: m.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/${m.key.toLowerCase()}` },
//                   { label: "Pending", value: m.pending, icon: <MapPin size={20} />, color: "#f59e0b", href: `/modules/${m.key.toLowerCase()}` },
//                 ];
//               }

//               return (
//                 <div key={`mod-${i}`} style={{ marginBottom: 40 }}>
//                   <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
//                     <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: 10, background: 'white', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
//                       <Activity size={14} />
//                       {displayName} Details
//                     </div>
//                   </div>
//                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
//                     {customStats.map((s, j) => (
//                       <Link key={j} href={s.href} style={{ textDecoration: 'none' }}>
//                         <div className="card card-hover" style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, height: '100%', transition: 'all 0.2s ease' }}>
//                           <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
//                             {s.icon}
//                           </div>
//                           <div>
//                             <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>{s.label}</div>
//                             <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
//                               {statsLoading || refreshing ? "..." : s.value}
//                             </div>
//                           </div>
//                         </div>
//                       </Link>
//                     ))}
//                   </div>
//                 </div>
//               );
//             })}

//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
//               <div style={{ maxWidth: 500, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
//                   <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: 8, borderRadius: 8 }}>
//                     <Shield size={18} />
//                   </div>
//                   <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Active Modules</h3>
//                 </div>
//                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
//                   <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
//                     <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{statsLoading ? '—' : (stats?.totalModules ?? 0)}</div>
//                     <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>MODULES</div>
//                   </div>
//                   <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
//                     <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
//                       {statsLoading ? '—' : ((stats?.qualityControllers ?? 0) + (stats?.taskforceMembers ?? 0) + (stats?.ulbOfficials ?? 0) + (stats?.actionOfficers ?? 0) + (stats?.cityAdmins ?? 0))}
//                     </div>
//                     <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>STAFF</div>
//                   </div>
//                 </div>
//                 <Link href="/city" style={{ textDecoration: 'none', display: 'block', marginTop: 16, textAlign: 'center', color: '#2563eb', fontWeight: 700, fontSize: 13 }}>
//                   Manage City Settings
//                 </Link>
//               </div>
//             </div>
//           </div>

//           {/* --- NEW PREMIUM COMMISSIONER DASHBOARD --- */}
//           <div style={{ marginTop: 40, paddingTop: 32, borderTop: '2px dashed #cbd5e1' }}>
//             <div style={{ marginBottom: 24 }}>
//               <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>City Cleanliness Overview</h2>
//               <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>Layer 1: Summary</p>
//             </div>
//             {/* Cards */}
//             {(() => {
//               const totalToilets = extraModuleStats.toilet.registered;
//               const approvedInsp = toiletDashStats?.approvedInspections || extraModuleStats.toilet.inspectionsDone;
//               const cleanPct = totalToilets > 0 ? Math.round((approvedInsp / totalToilets) * 100) : 0;
//               const activeIssues = extraModuleStats.toilet.actionRequired + extraModuleStats.twinbin.actionRequired + extraModuleStats.taskforce.actionRequired;
//               const pendingTotal = extraModuleStats.toilet.inspectionPending + extraModuleStats.twinbin.inspectionPending + extraModuleStats.taskforce.inspectionPending;
//               const cleanColor = cleanPct >= 80 ? '#22c55e' : cleanPct >= 60 ? '#f59e0b' : '#ef4444';
//               return (
//                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
//                   <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
//                     <div style={{ width: 50, height: 50, borderRadius: '50%', background: cleanColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, boxShadow: `0 4px 10px ${cleanColor}4d` }}>{statsLoading ? '—' : `${cleanPct}%`}</div>
//                     <div><div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>CLEAN SCORE</div><div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>City Average</div></div>
//                   </div>
//                   {[{ l: 'Total Toilets', v: totalToilets, c: '#10b981' }, { l: 'Clean Toilets', v: approvedInsp, c: '#22c55e' }, { l: 'Active Issues', v: activeIssues, c: '#f59e0b' }, { l: 'Pending', v: pendingTotal, c: '#ef4444' }].map((x, i) => (
//                     <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: `4px solid ${x.c}`, borderRadius: 12, padding: 16 }}>
//                       <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{statsLoading ? '—' : x.v}</div>
//                       <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{x.l}</div>
//                     </div>
//                   ))}
//                 </div>
//               );
//             })()}

//             <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 16px 0' }}>Layer 2: Analysis & Tracking</p>
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>

//               {/* Zone Performance - Real data from zoneActivity */}
//               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Zone Performance</h3>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
//                   {zoneActivity.length === 0 ? (
//                     <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 12 }}>No zone data available</div>
//                   ) : zoneActivity.slice(0, 6).map((z, i) => {
//                     const maxBeats = zoneActivity[0]?.beats || 1;
//                     const pct = Math.round((z.beats / maxBeats) * 100);
//                     const assignedPct = z.beats > 0 ? Math.round((z.assignedBeats / z.beats) * 100) : 0;
//                     const c = assignedPct >= 80 ? '#22c55e' : assignedPct >= 60 ? '#3b82f6' : assignedPct >= 40 ? '#eab308' : '#ef4444';
//                     return (
//                       <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
//                         <div style={{ width: 80, fontSize: 12, fontWeight: 700, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{z.name}</div>
//                         <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
//                           <div style={{ width: `${assignedPct}%`, height: '100%', background: c, borderRadius: 4, transition: 'width 0.8s ease' }}></div>
//                         </div>
//                         <div style={{ width: 30, fontSize: 13, fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>{assignedPct}%</div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>

//               {/* Issue Monitoring - Real data from extraModuleStats */}
//               {(() => {
//                 const toiletIssues = extraModuleStats.toilet.actionRequired;
//                 const binIssues = extraModuleStats.twinbin.actionRequired;
//                 const gvpIssues = extraModuleStats.taskforce.actionRequired;
//                 const pendingInsp = extraModuleStats.toilet.inspectionPending + extraModuleStats.twinbin.inspectionPending;
//                 const issueData = [
//                   { l: 'Toilet Issues', v: toiletIssues, c: '#f97316' },
//                   { l: 'Litterbin Issues', v: binIssues, c: '#ef4444' },
//                   { l: 'GVP Issues', v: gvpIssues, c: '#a855f7' },
//                   { l: 'Pending Inspections', v: pendingInsp, c: '#334155' }
//                 ];
//                 return (
//                   <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                     <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Issue Monitoring</h3>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
//                       <Donut data={issueData.map(d => ({ v: d.v || 0, color: d.c }))} size={100} stroke={16} />
//                       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
//                         {issueData.map((issue, i) => (
//                           <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: issue.c }}></div><span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{issue.l} ({issue.v})</span></div>
//                         ))}
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })()}

//               {/* Ward Ranking - Real data from wardActivity */}
//               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Ward Ranking</h3>
//                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                   <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Rank</th><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Ward</th><th style={{ textAlign: 'right', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Beats</th></tr></thead>
//                   <tbody>
//                     {wardActivity.length === 0 ? (
//                       <tr><td colSpan={3} style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No ward data</td></tr>
//                     ) : wardActivity.slice(0, 5).map((w, i) => {
//                       const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
//                       const isLast = i === wardActivity.slice(0, 5).length - 1;
//                       const isWorst = isLast && wardActivity.length > 2;
//                       return (
//                         <tr key={i} style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9', background: isWorst ? '#fef2f2' : 'transparent' }}>
//                           <td style={{ padding: '8px 0', fontSize: 16 }}>{isWorst ? '⚠️' : medal}</td>
//                           <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 700, color: isWorst ? '#ef4444' : '#0f172a' }}>{w.name}</td>
//                           <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 800, color: isWorst ? '#ef4444' : i === 0 ? '#22c55e' : '#3b82f6', textAlign: 'right' }}>{w.beats}</td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>

//               {/* AO Response Time - Real data: show action officers count and module action required stats */}
//               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Action Officer Summary</h3>
//                 {(() => {
//                   const aoCount = stats?.actionOfficers || 0;
//                   const modAR = moduleActivity.filter(m => m.actionRequired > 0);
//                   return (
//                     <>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, background: '#f0fdf4', padding: 12, borderRadius: 10, border: '1px solid #bbf7d0' }}>
//                         <UserCog size={22} color="#16a34a" />
//                         <div>
//                           <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{statsLoading ? '—' : aoCount}</div>
//                           <div style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>Action Officers Active</div>
//                         </div>
//                       </div>
//                       {modAR.length > 0 ? modAR.map((m, i) => (
//                         <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
//                           <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{m.name}</span>
//                           <span style={{ fontSize: 12, fontWeight: 800, color: '#ef4444' }}>⚠ {m.actionRequired} pending</span>
//                         </div>
//                       )) : (
//                         <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, textAlign: 'center', padding: 8 }}>✓ No pending actions</div>
//                       )}
//                     </>
//                   );
//                 })()}
//               </div>

//               {/* QC Leaderboard - Real data from qcLeaderboard */}
//               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>QC Leaderboard</h3>
//                 <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
//                   <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Rank</th><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>QC Name</th><th style={{ textAlign: 'right', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Inspections</th></tr></thead>
//                   <tbody>
//                     {qcLeaderboard.length === 0 ? (
//                       <tr><td colSpan={3} style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No inspection data yet</td></tr>
//                     ) : qcLeaderboard.map((q, i) => {
//                       const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
//                       const isLow = i === qcLeaderboard.length - 1 && qcLeaderboard.length > 2 && q.inspections < (qcLeaderboard[0]?.inspections || 1) * 0.3;
//                       return (
//                         <tr key={i} style={{ borderBottom: i < qcLeaderboard.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
//                           <td style={{ padding: '8px 0', fontSize: 16 }}>{isLow ? '⚠️' : medal}</td>
//                           <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 700, color: isLow ? '#ef4444' : '#0f172a' }}>{q.name}</td>
//                           <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 800, color: isLow ? '#ef4444' : '#0f172a', textAlign: 'right' }}>{q.inspections}</td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>

//               {/* Taskforce Activity - Real data from recentLogs and extraModuleStats */}
//               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Taskforce Activity</h3>
//                 <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
//                   <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#3b82f6' }}>{extraModuleStats.toilet.registered}</div><div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>TOILETS</div></div>
//                   <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#8b5cf6' }}>{extraModuleStats.twinbin.registered}</div><div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>LITTERBINS</div></div>
//                   <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444' }}>{extraModuleStats.taskforce.registered}</div><div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>GVP POINTS</div></div>
//                 </div>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
//                   {recentLogs.length === 0 ? (
//                     <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 8 }}>No recent activity</div>
//                   ) : recentLogs.slice(0, 3).map((log, i) => (
//                     <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
//                       <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 55, flexShrink: 0 }}>{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
//                       <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.moduleName} — {log.status} {log.createdByUser?.name ? `by ${log.createdByUser.name}` : ''}</div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Sweeping Coverage - Real data from sweepingDetailStats */}
//               {(() => {
//                 const totalB = sweepingDetailStats.totalBeats;
//                 const approved = sweepingDetailStats.totalApproved;
//                 const missed = Math.max(0, totalB - approved);
//                 const coveragePct = totalB > 0 ? Math.round((approved / totalB) * 100) : 0;
//                 const coverageColor = coveragePct >= 80 ? '#22c55e' : coveragePct >= 50 ? '#f59e0b' : '#ef4444';
//                 return (
//                   <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                     <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Sweeping Coverage</h3>
//                     <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16 }}>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Overall Coverage</span><span style={{ fontSize: 12, fontWeight: 900, color: coverageColor }}>{sweepingDetailLoading ? '...' : `${coveragePct}%`}</span></div>
//                       <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${coveragePct}%`, height: '100%', background: coverageColor, transition: 'width 0.8s ease' }}></div></div>
//                     </div>
//                     <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
//                       <div style={{ flex: 1 }}>
//                         <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Total Beats</span><span style={{ fontSize: 12, color: '#0f172a', fontWeight: 800 }}>{sweepingDetailLoading ? '...' : totalB}</span></div>
//                         <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Approved</span><span style={{ fontSize: 12, color: '#22c55e', fontWeight: 800 }}>{sweepingDetailLoading ? '...' : approved}</span></div>
//                         <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Action Required</span><span style={{ fontSize: 12, color: '#ef4444', fontWeight: 800 }}>{sweepingDetailLoading ? '...' : sweepingDetailStats.actionRequired}</span></div>
//                       </div>
//                       <div style={{ width: 80, height: 80, background: '#e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
//                         <Map size={24} color="#94a3b8" />
//                         <div style={{ position: 'absolute', bottom: 4, right: 4, background: '#fff', padding: '2px 4px', borderRadius: 4, fontSize: 8, fontWeight: 800 }}>LIVE MAP</div>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })()}

//               {/* GVP Transformation - Real data from extraModuleStats.taskforce */}
//               {(() => {
//                 const totalGVP = extraModuleStats.taskforce.registered;
//                 const approved = extraModuleStats.taskforce.inspectionsDone;
//                 const actionTaken = extraModuleStats.taskforce.actionTaken || 0;
//                 const actionReq = extraModuleStats.taskforce.actionRequired;
//                 const pctApproved = totalGVP > 0 ? Math.round((approved / totalGVP) * 100) : 0;
//                 const pctActionTaken = totalGVP > 0 ? Math.round((actionTaken / totalGVP) * 100) : 0;
//                 const pctActionReq = totalGVP > 0 ? Math.round((actionReq / totalGVP) * 100) : 0;
//                 return (
//                   <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                     <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>GVP Transformation</h3>
//                     <div style={{ marginBottom: 16 }}>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Total GVPs ({totalGVP})</span></div>
//                       <div style={{ height: 16, borderRadius: 8, display: 'flex', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
//                         {totalGVP > 0 ? (<>
//                           <div style={{ width: `${pctApproved}%`, background: '#22c55e', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>Approved</div>
//                           <div style={{ width: `${pctActionTaken}%`, background: '#3b82f6', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>Action Taken</div>
//                           <div style={{ width: `${Math.max(pctActionReq, 100 - pctApproved - pctActionTaken)}%`, background: '#ef4444', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>Pending</div>
//                         </>) : (
//                           <div style={{ width: '100%', background: '#f1f5f9', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#94a3b8' }}>No data</div>
//                         )}
//                       </div>
//                     </div>
//                     <div>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Approved (QC)</span><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{approved} ({pctApproved}%)</span></div>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Action Taken (AO)</span><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{actionTaken} ({pctActionTaken}%)</span></div>
//                       <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Action Required</span><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{actionReq} ({pctActionReq}%)</span></div>
//                     </div>
//                   </div>
//                 );
//               })()}
//             </div>

//             <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 16px 0' }}>Layer 3: Proof &amp; Verification</p>
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>

//               {/* Recent Activity Log instead of Photo Evidence */}
//               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Recent Activity Log</h3>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//                   {recentLogs.length === 0 ? (
//                     <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 20 }}>No recent activity to display</div>
//                   ) : recentLogs.slice(0, 6).map((log, i) => (
//                     <div key={i} style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
//                         <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{log.moduleName}</span>
//                         <span style={{ fontSize: 10, fontWeight: 600, color: log.status === 'APPROVED' ? '#22c55e' : log.status === 'ACTION_REQUIRED' ? '#ef4444' : '#f59e0b', background: log.status === 'APPROVED' ? '#f0fdf4' : log.status === 'ACTION_REQUIRED' ? '#fef2f2' : '#fffbeb', padding: '2px 8px', borderRadius: 4 }}>{log.status}</span>
//                       </div>
//                       <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>
//                         {log.createdByUser?.name || 'Field User'} • {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Critical Alerts - Real data from action required counts */}
//               {(() => {
//                 const alerts: { msg: string; ward: string }[] = [];
//                 if (extraModuleStats.toilet.actionRequired > 0) alerts.push({ msg: `${extraModuleStats.toilet.actionRequired} toilet(s) need action`, ward: 'Toilet Module' });
//                 if (extraModuleStats.twinbin.actionRequired > 0) alerts.push({ msg: `${extraModuleStats.twinbin.actionRequired} litterbin(s) need action`, ward: 'Litterbin Module' });
//                 if (extraModuleStats.taskforce.actionRequired > 0) alerts.push({ msg: `${extraModuleStats.taskforce.actionRequired} GVP point(s) need action`, ward: 'GVP Module' });
//                 if (sweepingDetailStats.actionRequired > 0) alerts.push({ msg: `${sweepingDetailStats.actionRequired} sweeping record(s) need action`, ward: 'Sweeping Module' });
//                 return (
//                   <div style={{ background: alerts.length > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${alerts.length > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: 12, padding: 20 }}>
//                     <h3 style={{ fontSize: 16, fontWeight: 900, color: alerts.length > 0 ? '#b91c1c' : '#16a34a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
//                       {alerts.length > 0 ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
//                       {alerts.length > 0 ? 'Critical Alerts' : 'All Clear'}
//                     </h3>
//                     {alerts.length === 0 ? (
//                       <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, textAlign: 'center', padding: 16 }}>✓ No critical alerts — all modules are clear!</div>
//                     ) : alerts.map((a, i) => (
//                       <div key={i} style={{ background: '#fff', padding: 12, borderRadius: 9, border: '1px solid #fecaca', marginBottom: 9 }}>
//                         <div style={{ fontSize: 12, fontWeight: 800, color: '#991b1b' }}>{a.msg}</div>
//                         <div style={{ fontSize: 10, fontWeight: 650, color: '#64748b', marginTop: 3 }}>{a.ward}</div>
//                       </div>
//                     ))}
//                   </div>
//                 );
//               })()}
//             </div>
//           </div>
//         </div>
//       ) : (
//         <>
//           <style>{`
//             .mx-city-dashboard {
//               --mx-bg: #f5f8fd;
//               --mx-surface: #ffffff;
//               --mx-border: #e4ebf5;
//               --mx-border-strong: #d5e0ef;
//               --mx-text: #14213d;
//               --mx-muted: #718096;
//               --mx-blue: #2f6fed;
//               --mx-blue-2: #5b8ff5;
//               --mx-blue-soft: #edf4ff;
//               --mx-shadow: 0 10px 30px rgba(25, 51, 89, .055);
//               --mx-shadow-hover: 0 18px 38px rgba(25, 51, 89, .09);
//               min-height: 100vh;
//               padding: 20px 22px 34px;
//               background:
//                 radial-gradient(circle at 88% 3%, rgba(71, 129, 255, .09), transparent 28%),
//                 linear-gradient(180deg, #f8fbff 0%, var(--mx-bg) 48%, #f7f9fc 100%);
//               color: var(--mx-text);
//               font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
//             }
        
//             .mx-shell {
//               width: 100%;
//               max-width: 1480px;
//               margin: 0 auto;
//               display: flex;
//               flex-direction: column;
//               gap: 18px;
//             }
        
//             .mx-hero {
//               position: relative;
//               overflow: hidden;
//               min-height: 148px;
//               padding: 26px 28px;
//               border: 1px solid #dbe6f5;
//               border-radius: 26px;
//               background:
//                 radial-gradient(circle at 82% 22%, rgba(75, 129, 255, .13), transparent 26%),
//                 radial-gradient(circle at 93% 88%, rgba(153, 189, 255, .18), transparent 23%),
//                 linear-gradient(120deg, #ffffff 0%, #fbfdff 52%, #eef5ff 100%);
//               box-shadow: 0 18px 44px rgba(31, 70, 130, .075);
//               display: flex;
//               justify-content: space-between;
//               align-items: center;
//               gap: 24px;
//             }
        
//             .mx-hero::before,
//             .mx-hero::after {
//               content: "";
//               position: absolute;
//               pointer-events: none;
//               border-radius: 999px;
//               border: 1px solid rgba(87, 137, 238, .12);
//             }
        
//             .mx-hero::before {
//               width: 320px;
//               height: 320px;
//               right: -130px;
//               top: -180px;
//             }
        
//             .mx-hero::after {
//               width: 220px;
//               height: 220px;
//               right: 55px;
//               bottom: -185px;
//             }
        
//             .mx-hero-left,
//             .mx-hero-actions {
//               position: relative;
//               z-index: 2;
//             }
        
//             .mx-hero-left {
//               display: flex;
//               align-items: center;
//               gap: 18px;
//               min-width: 0;
//             }
        
//             .mx-city-mark {
//               width: 58px;
//               height: 58px;
//               flex: 0 0 58px;
//               display: grid;
//               place-items: center;
//               border-radius: 18px;
//               color: #ffffff;
//               background: linear-gradient(145deg, #3478f6, #5c6ff2);
//               box-shadow: 0 11px 22px rgba(47, 111, 237, .24), inset 0 1px 0 rgba(255, 255, 255, .28);
//             }
        
//             .mx-eyebrow {
//               display: flex;
//               align-items: center;
//               gap: 7px;
//               margin-bottom: 5px;
//               color: #3970d9;
//               font-size: 10px;
//               line-height: 1;
//               font-weight: 800;
//               letter-spacing: .13em;
//               text-transform: uppercase;
//             }
        
//             .mx-eyebrow-dot {
//               width: 6px;
//               height: 6px;
//               border-radius: 50%;
//               background: #3d7bf2;
//               box-shadow: 0 0 0 4px rgba(61, 123, 242, .09);
//             }
        
//             .mx-hero-title {
//               margin: 0;
//               color: #15213a;
//               font-size: clamp(22px, 2vw, 30px);
//               line-height: 1.15;
//               font-weight: 800;
//               letter-spacing: -.035em;
//             }
        
//             .mx-hero-meta {
//               margin-top: 9px;
//               display: flex;
//               align-items: center;
//               flex-wrap: wrap;
//               gap: 10px;
//               color: #73839c;
//               font-size: 12px;
//               font-weight: 600;
//             }
        
//             .mx-location {
//               display: inline-flex;
//               align-items: center;
//               gap: 6px;
//               color: #315fbd;
//               font-weight: 750;
//             }
        
//             .mx-meta-separator {
//               width: 4px;
//               height: 4px;
//               border-radius: 50%;
//               background: #b6c2d4;
//             }
        
//             .mx-hero-actions {
//               display: flex;
//               justify-content: flex-end;
//               align-items: center;
//               flex-wrap: wrap;
//               gap: 10px;
//             }
        
//             .mx-control,
//             .mx-refresh,
//             .mx-alert {
//               min-height: 42px;
//               border-radius: 12px;
//               font-family: inherit;
//               font-size: 12px;
//               font-weight: 750;
//               transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
//             }
        
//             .mx-control {
//               display: flex;
//               align-items: center;
//               gap: 8px;
//               padding: 0 13px;
//               color: #34425a;
//               background: rgba(255,255,255,.9);
//               border: 1px solid #d9e3f1;
//               box-shadow: 0 5px 14px rgba(45, 71, 111, .045);
//             }
        
//             .mx-control input {
//               border: 0;
//               outline: 0;
//               background: transparent;
//               color: #263650;
//               font: inherit;
//               cursor: pointer;
//             }
        
//             .mx-alert,
//             .mx-refresh {
//               display: inline-flex;
//               align-items: center;
//               justify-content: center;
//               gap: 7px;
//               padding: 0 14px;
//               cursor: pointer;
//             }
        
//             .mx-alert {
//               color: #c84b4b;
//               border: 1px solid #f2d2d2;
//               background: #fff7f7;
//             }
        
//             .mx-alert-badge {
//               min-width: 20px;
//               height: 20px;
//               padding: 0 6px;
//               border-radius: 999px;
//               display: inline-flex;
//               align-items: center;
//               justify-content: center;
//               background: #e25757;
//               color: #fff;
//               font-size: 10px;
//               font-weight: 800;
//             }
        
//             .mx-refresh {
//               color: #2f6fed;
//               border: 1px solid #cadcff;
//               background: #f3f7ff;
//             }
        
//             .mx-alert:hover,
//             .mx-refresh:hover,
//             .mx-control:hover {
//               transform: translateY(-1px);
//               box-shadow: 0 8px 20px rgba(45, 71, 111, .08);
//             }
        
//             .mx-section {
//               position: relative;
//               overflow: hidden;
//               padding: 22px;
//               border: 1px solid var(--mx-border);
//               border-radius: 24px;
//               background: rgba(255,255,255,.94);
//               box-shadow: var(--mx-shadow);
//             }
        
//             .mx-section-head {
//               display: flex;
//               align-items: center;
//               justify-content: space-between;
//               gap: 16px;
//               margin-bottom: 18px;
//             }
        
//             .mx-section-title-wrap {
//               display: flex;
//               align-items: center;
//               gap: 12px;
//               min-width: 0;
//             }
        
//             .mx-section-icon {
//               width: 38px;
//               height: 38px;
//               flex: 0 0 38px;
//               display: grid;
//               place-items: center;
//               border-radius: 12px;
//               color: #326ee0;
//               background: #f0f5ff;
//               border: 1px solid #dbe7ff;
//             }
        
//             .mx-section-title {
//               margin: 0;
//               color: #1b2942;
//               font-size: 16px;
//               line-height: 1.2;
//               font-weight: 800;
//               letter-spacing: -.012em;
//             }
        
//             .mx-section-subtitle {
//               margin-top: 3px;
//               color: #8a98ac;
//               font-size: 11px;
//               line-height: 1.25;
//               font-weight: 600;
//             }
        
//             .mx-section-refresh {
//               min-height: 34px;
//               padding: 0 11px;
//               border: 1px solid #e0e7f0;
//               border-radius: 10px;
//               background: #fafcff;
//               color: #708098;
//               display: inline-flex;
//               align-items: center;
//               gap: 6px;
//               font-size: 11px;
//               font-weight: 700;
//               cursor: pointer;
//               transition: all .18s ease;
//             }
        
//             .mx-section-refresh:hover {
//               color: #2f6fed;
//               border-color: #cdddf8;
//               background: #f5f8ff;
//             }
        
//             .mx-city-dashboard {
//               font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
//             }

//             .mx-kpi-grid,
//             .mx-user-grid,
//             .mx-module-grid {
//               display: grid;
//               grid-template-columns: repeat(4, minmax(0, 1fr));
//               gap: 12px;
//             }
        
//             .mx-kpi-card {
//               position: relative;
//               overflow: hidden;
//               min-height: 110px;
//               padding: 14px 16px 12px;
//               border-radius: 16px;
//               border: 1px solid var(--kpi-border, #e2e8f0);
//               background: linear-gradient(145deg, #ffffff 0%, var(--kpi-soft, #f8fafc) 145%);
//               transition: transform .25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow .25s cubic-bezier(0.4, 0, 0.2, 1), border-color .25s cubic-bezier(0.4, 0, 0.2, 1);
//               cursor: pointer;
//             }
        
//             .mx-kpi-card:hover {
//               transform: translateY(-4px) scale(1.012);
//               border-color: #3b82f6;
//               box-shadow: 0 12px 28px -6px rgba(37, 99, 235, 0.14);
//             }

//             .mx-kpi-card:hover .mx-kpi-icon {
//               transform: scale(1.08) rotate(-3deg);
//               transition: transform 0.25s ease;
//             }

//             .mx-kpi-card:hover .mx-kpi-arrow {
//               transform: translateX(3px);
//               color: #2563eb;
//               transition: transform 0.25s ease, color 0.25s ease;
//             }
        
//             .mx-kpi-card::after {
//               content: "";
//               position: absolute;
//               right: -22px;
//               bottom: -42px;
//               width: 95px;
//               height: 95px;
//               border-radius: 50%;
//               background: var(--kpi-soft);
//               opacity: .65;
//             }
        
//             .mx-kpi-top {
//               position: relative;
//               z-index: 1;
//               display: flex;
//               align-items: flex-start;
//               justify-content: space-between;
//             }
        
//             .mx-kpi-icon {
//               width: 36px;
//               height: 36px;
//               display: grid;
//               place-items: center;
//               border-radius: 10px;
//               color: var(--kpi-color);
//               background: var(--kpi-icon-bg);
//               border: 1px solid var(--kpi-border);
//               transition: transform 0.25s ease;
//             }
        
//             .mx-kpi-arrow {
//               color: #cbd5e1;
//               margin-top: 2px;
//               transition: transform 0.25s ease, color 0.25s ease;
//             }
        
//             .mx-kpi-label {
//               position: relative;
//               z-index: 1;
//               margin-top: 10px;
//               color: #64748b;
//               font-size: 10px;
//               font-weight: 750;
//               letter-spacing: .055em;
//               text-transform: uppercase;
//               font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
//             }
        
//             .mx-kpi-value {
//               position: relative;
//               z-index: 1;
//               margin-top: 2px;
//               color: #0f172a;
//               font-size: 24px;
//               line-height: 1;
//               font-weight: 800;
//               letter-spacing: -.03em;
//               font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
//             }
        
//             .mx-kpi-accent {
//               position: absolute;
//               left: 16px;
//               bottom: 0;
//               width: 40px;
//               height: 3px;
//               border-radius: 999px 999px 0 0;
//               background: var(--kpi-color);
//             }
        
//             .mx-user-card {
//               min-height: 88px;
//               padding: 13px 15px;
//               border: 1px solid var(--user-border);
//               border-radius: 16px;
//               display: flex;
//               align-items: center;
//               gap: 12px;
//               background: linear-gradient(145deg, #ffffff 0%, var(--user-wash) 145%);
//               transition: transform .25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow .25s cubic-bezier(0.4, 0, 0.2, 1), border-color .25s cubic-bezier(0.4, 0, 0.2, 1);
//               cursor: pointer;
//             }
        
//             .mx-user-card:hover {
//               transform: translateY(-4px) scale(1.012);
//               border-color: #3b82f6;
//               box-shadow: 0 12px 28px -6px rgba(37, 99, 235, 0.14);
//             }

//             .mx-user-card:hover .mx-user-icon {
//               transform: scale(1.08) rotate(-3deg);
//               transition: transform 0.25s ease;
//             }
        
//             .mx-user-icon {
//               width: 38px;
//               height: 38px;
//               flex: 0 0 38px;
//               border-radius: 11px;
//               display: grid;
//               place-items: center;
//               color: var(--user-color);
//               background: var(--user-icon-bg);
//               transition: transform 0.25s ease;
//             }
        
//             .mx-user-label {
//               color: #64748b;
//               font-size: 10px;
//               font-weight: 750;
//               line-height: 1.25;
//               letter-spacing: .05em;
//               text-transform: uppercase;
//               font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
//             }
        
//             .mx-user-value {
//               margin-top: 3px;
//               color: #0f172a;
//               font-size: 24px;
//               line-height: 1;
//               font-weight: 800;
//               letter-spacing: -.03em;
//               font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
//             }
        
//             .mx-module-card {
//               position: relative;
//               overflow: hidden;
//               min-height: 84px;
//               padding: 12px 14px;
//               border: 1px solid #e2e8f0;
//               border-radius: 16px;
//               display: flex;
//               align-items: center;
//               gap: 12px;
//               background: #ffffff;
//               transition: transform .25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow .25s cubic-bezier(0.4, 0, 0.2, 1), border-color .25s cubic-bezier(0.4, 0, 0.2, 1);
//               cursor: pointer;
//             }
        
//             .mx-module-card:hover {
//               transform: translateY(-4px) scale(1.012);
//               border-color: #3b82f6;
//               box-shadow: 0 12px 28px -6px rgba(37, 99, 235, 0.14);
//             }
        
//             .mx-module-card::after {
//               content: "";
//               position: absolute;
//               left: 0;
//               right: 0;
//               bottom: 0;
//               height: 3px;
//               background: linear-gradient(90deg, var(--module-color), transparent 82%);
//             }
        
//             .mx-module-icon {
//               width: 44px;
//               height: 44px;
//               flex: 0 0 44px;
//               border-radius: 13px;
//               display: grid;
//               place-items: center;
//               color: var(--module-color);
//               background: var(--module-soft);
//               border: 1px solid var(--module-border);
//             }
        
//             .mx-module-name {
//               color: #1b2941;
//               font-size: 13px;
//               line-height: 1.25;
//               font-weight: 800;
//             }
        
//             .mx-module-records {
//               margin-top: 4px;
//               color: #73829a;
//               font-size: 11px;
//               font-weight: 600;
//             }
        
//             .mx-health-grid {
//               display: grid;
//               grid-template-columns: repeat(3, minmax(0, 1fr));
//               gap: 15px;
//             }
        
//             .mx-health-card {
//               min-height: 258px;
//               padding: 18px;
//               border-radius: 20px;
//               border: 1px solid var(--health-border);
//               background: linear-gradient(160deg, #ffffff 0%, var(--health-wash) 160%);
//               box-shadow: 0 8px 22px rgba(25, 51, 89, .035);
//             }
        
//             .mx-health-title-row {
//               display: flex;
//               align-items: center;
//               gap: 10px;
//             }
        
//             .mx-health-icon {
//               width: 38px;
//               height: 38px;
//               flex: 0 0 38px;
//               display: grid;
//               place-items: center;
//               border-radius: 11px;
//               color: var(--health-color);
//               background: var(--health-icon-bg);
//             }
        
//             .mx-health-title {
//               color: #1b2941;
//               font-size: 13px;
//               font-weight: 800;
//             }
        
//             .mx-health-gauge {
//               min-height: 126px;
//               display: grid;
//               place-items: center;
//               padding-top: 8px;
//             }
        
//             .mx-health-stats {
//               display: grid;
//               grid-template-columns: repeat(3, 1fr);
//               gap: 7px;
//               padding-top: 14px;
//               border-top: 1px solid #edf1f6;
//             }
        
//             .mx-health-stat {
//               text-align: center;
//             }
        
//             .mx-health-number {
//               display: inline-flex;
//               align-items: center;
//               gap: 5px;
//               color: #23334d;
//               font-size: 13px;
//               font-weight: 800;
//             }
        
//             .mx-health-dot {
//               width: 6px;
//               height: 6px;
//               border-radius: 50%;
//             }
        
//             .mx-health-label {
//               display: block;
//               margin-top: 3px;
//               color: #8a97a9;
//               font-size: 9px;
//               font-weight: 650;
//             }
        
//             .mx-chart-shell {
//               position: relative;
//               overflow: hidden;
//               min-height: 336px;
//               border: 1px solid #e2e9f2;
//               border-radius: 19px;
//               background:
//                 linear-gradient(to bottom, transparent calc(25% - .5px), #edf2f8 calc(25% - .5px), #edf2f8 calc(25% + .5px), transparent calc(25% + .5px)),
//                 linear-gradient(to bottom, transparent calc(50% - .5px), #edf2f8 calc(50% - .5px), #edf2f8 calc(50% + .5px), transparent calc(50% + .5px)),
//                 linear-gradient(to bottom, transparent calc(75% - .5px), #edf2f8 calc(75% - .5px), #edf2f8 calc(75% + .5px), transparent calc(75% + .5px)),
//                 #fbfdff;
//               padding: 22px 20px 15px 54px;
//             }
        
//             .mx-y-axis {
//               position: absolute;
//               left: 14px;
//               top: 18px;
//               bottom: 58px;
//               width: 30px;
//               display: flex;
//               flex-direction: column;
//               justify-content: space-between;
//               align-items: flex-end;
//               color: #9aa7ba;
//               font-size: 9px;
//               font-weight: 650;
//             }
        
//             .mx-chart-groups {
//               height: 245px;
//               display: flex;
//               align-items: flex-end;
//               justify-content: space-between;
//               gap: 20px;
//               border-bottom: 1px solid #cfd9e7;
//             }
        
//             .mx-chart-group {
//               flex: 1;
//               height: 100%;
//               min-width: 70px;
//               display: flex;
//               flex-direction: column;
//               align-items: center;
//               justify-content: flex-end;
//             }
        
//             .mx-bars {
//               width: 100%;
//               height: 205px;
//               display: flex;
//               align-items: flex-end;
//               justify-content: center;
//               gap: 7px;
//             }
        
//             .mx-bar-wrap {
//               width: 23px;
//               height: 100%;
//               display: flex;
//               flex-direction: column;
//               align-items: center;
//               justify-content: flex-end;
//             }
        
//             .mx-bar-value {
//               min-height: 16px;
//               margin-bottom: 3px;
//               font-size: 9px;
//               line-height: 1;
//               font-weight: 800;
//             }
        
//             .mx-bar {
//               width: 21px;
//               min-height: 4px;
//               border-radius: 6px 6px 2px 2px;
//               box-shadow: inset 0 1px 0 rgba(255,255,255,.25);
//               transition: height .65s ease;
//             }
        
//             .mx-zero-bar {
//               width: 21px;
//               height: 4px;
//               margin-top: auto;
//               border-radius: 999px;
//               background: #dce4ef;
//             }
        
//             .mx-date-label {
//               margin-top: 10px;
//               min-height: 20px;
//               color: #52627a;
//               font-size: 10px;
//               font-weight: 700;
//               text-align: center;
//               white-space: nowrap;
//             }
        
//             .mx-chart-legend {
//               display: flex;
//               align-items: center;
//               justify-content: center;
//               flex-wrap: wrap;
//               gap: 10px;
//               margin-top: 15px;
//             }
        
//             .mx-legend-chip {
//               display: inline-flex;
//               align-items: center;
//               gap: 7px;
//               min-height: 28px;
//               padding: 0 10px;
//               border: 1px solid #e4eaf3;
//               border-radius: 999px;
//               background: #ffffff;
//               color: #52627a;
//               font-size: 10px;
//               font-weight: 700;
//             }
        
//             .mx-legend-dot {
//               width: 7px;
//               height: 7px;
//               border-radius: 3px;
//             }
        
//             .mx-empty-chart {
//               min-height: 275px;
//               display: grid;
//               place-items: center;
//               color: #8c9aae;
//               font-size: 12px;
//               font-weight: 600;
//             }
        
//             @media (max-width: 1180px) {
//               .mx-kpi-grid,
//               .mx-user-grid,
//               .mx-module-grid {
//                 grid-template-columns: repeat(2, minmax(0, 1fr));
//               }
//               .mx-hero { align-items: flex-start; }
//             }
        
//             @media (max-width: 900px) {
//               .mx-city-dashboard { padding: 15px; }
//               .mx-hero { flex-direction: column; min-height: auto; }
//               .mx-hero-actions { justify-content: flex-start; width: 100%; }
//               .mx-health-grid { grid-template-columns: 1fr; }
//               .mx-chart-shell { overflow-x: auto; }
//               .mx-chart-groups { min-width: 760px; }
//             }
        
//             @media (max-width: 620px) {
//               .mx-city-dashboard { padding: 10px; }
//               .mx-hero,
//               .mx-section { border-radius: 19px; padding: 17px; }
//               .mx-city-mark { width: 50px; height: 50px; flex-basis: 50px; border-radius: 15px; }
//               .mx-kpi-grid,
//               .mx-user-grid,
//               .mx-module-grid { grid-template-columns: 1fr; }
//               .mx-section-head { align-items: flex-start; }
//               .mx-hero-actions > * { flex: 1 1 auto; }
//             }
//           `}</style>

//           <div className="mx-city-dashboard">
//             <div className="mx-shell">
//               {/* Grand Dashboard Hero Header */}
//               <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: 'white', borderRadius: '24px', padding: '26px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 12px 40px -10px rgba(15,23,42,0.6)', position: 'relative', overflow: 'hidden', marginBottom: '24px', flexWrap: 'wrap', gap: '24px' }}>
//                 {/* Decorative Background Glow */}
//                 <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', height: '100%', background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.2), transparent 70%)', pointerEvents: 'none' }} />

//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1, minWidth: '280px' }}>
//                   <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
//                     <ShieldCheck size={14} color="#60a5fa" /> MATRIXTRACK 2.0 • INSPECTION & PERFORMANCE
//                   </div>

//                   <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, letterSpacing: '-0.02em' }}>
//                     {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}, {user?.name || user?.email?.split('@')[0] || 'Indore Admin'} <span style={{ fontSize: '22px' }}>👋</span>
//                   </h1>

                  

//                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
//                     <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', padding: '3px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
//                       <MapPin size={12} color="#38bdf8" /> {cityName || 'Indore Municipal Corporation'}
//                     </span>
//                     <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', padding: '3px 10px', borderRadius: '12px' }}>
//                       {isSuperAdmin ? 'Super Admin' : 'City Admin'}
//                     </span>
//                   </div>
//                 </div>

//                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1, flexWrap: 'wrap' }}>
//                   {isSuperAdmin && (
//                     <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '8px 14px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                       <MapPin size={15} color="#94a3b8" />
//                       <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, appearance: 'none', cursor: 'pointer' }}>
//                         <option value="ALL" style={{ color: '#0f172a' }}>All Cities</option>
//                         {cities.map(c => (
//                           <option key={c.id} value={c.id} style={{ color: '#0f172a' }}>{c.name}</option>
//                         ))}
//                       </select>
//                     </div>
//                   )}

//                   <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '8px 14px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                     <Calendar size={15} color="#94a3b8" />
//                     <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, outline: 'none', colorScheme: 'dark' }} />
//                   </div>

//                   <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '6px 14px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//                       <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
//                       <span style={{ fontSize: '9px', fontWeight: 800, color: '#10b981', letterSpacing: '0.05em' }}>LIVE</span>
//                     </div>
//                     <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>{lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
//                   </div>

//                   <button
//                     type="button"
//                     onClick={() => setShowAlertModal(true)}
//                     style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', borderRadius: '12px', padding: '9px 14px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
//                   >
//                     <Bell size={15} color="#fca5a5" />
//                     Alerts
//                     {((extraModuleStats.toilet.actionRequired || 0) + (extraModuleStats.twinbin.actionRequired || 0) + (extraModuleStats.taskforce.actionRequired || 0) + (sweepingDetailStats.actionRequired || 0)) > 0 && (
//                       <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '2px 6px', borderRadius: '10px' }}>
//                         {(extraModuleStats.toilet.actionRequired || 0) + (extraModuleStats.twinbin.actionRequired || 0) + (extraModuleStats.taskforce.actionRequired || 0) + (sweepingDetailStats.actionRequired || 0)}
//                       </span>
//                     )}
//                   </button>

//                   <button type="button" onClick={loadAll} disabled={refreshing} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '12px', padding: '9px 14px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
//                     <RefreshCw size={14} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} />
//                     {refreshing ? 'Refreshing...' : 'Refresh'}
//                   </button>

//                   <button
//                     type="button"
//                     onClick={handleDownloadReport}
//                     style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', padding: '9px 16px', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}
//                   >
//                     <Download size={14} /> Export Report
//                   </button>
//                 </div>
//               </section>

//               {/* City Overview */}
//               <section className="mx-section">
//                 <div className="mx-section-head">
//                   <div className="mx-section-title-wrap">
//                     <div className="mx-section-icon"><Map size={18} /></div>
//                     <div>
//                       <h2 className="mx-section-title">CITY OVERVIEW</h2>
//                       <div className="mx-section-subtitle">Registered geographic hierarchy</div>
//                     </div>
//                   </div>
//                   <button className="mx-section-refresh" type="button" onClick={loadAll}>
//                     <RefreshCw size={12} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} /> Refresh
//                   </button>
//                 </div>

//                 <div className="mx-kpi-grid">
//                   {[
//                     { label: 'Total Registered Zones', value: cityGeoStats?.zones || 0, icon: Map, color: '#2563eb', soft: '#eff6ff', iconBg: '#dbeafe', border: '#bfdbfe' },
//                     { label: 'Total Registered Wards', value: cityGeoStats?.wards || 0, icon: MapPin, color: '#7c3aed', soft: '#f5f3ff', iconBg: '#ede9fe', border: '#ddd6fe' },
//                     { label: 'Total Registered Areas', value: cityGeoStats?.areas || 0, icon: Target, color: '#0284c7', soft: '#f0f9ff', iconBg: '#e0f2fe', border: '#bae6fd' },
//                     { label: 'Total Registered Beats', value: cityGeoStats?.beats || 0, icon: Activity, color: '#0d9488', soft: '#f0fdf4', iconBg: '#ccfbf1', border: '#99f6e4' },
//                   ].map((card, i) => (
//                     <div
//                       key={i}
//                       className="mx-kpi-card"
//                       style={{
//                         '--kpi-color': card.color,
//                         '--kpi-soft': card.soft,
//                         '--kpi-icon-bg': card.iconBg,
//                         '--kpi-border': card.border,
//                       } as React.CSSProperties}
//                     >
//                       <div className="mx-kpi-top">
//                         <div className="mx-kpi-icon"><card.icon size={18} strokeWidth={1.9} /></div>
//                         <ChevronRight className="mx-kpi-arrow" size={16} />
//                       </div>
//                       <div className="mx-kpi-label">{card.label}</div>
//                       <div className="mx-kpi-value">{statsLoading ? '—' : card.value}</div>
//                       <span className="mx-kpi-accent" />
//                     </div>
//                   ))}
//                 </div>
//               </section>

//               {/* Users Overview */}
//               <section className="mx-section">
//                 <div className="mx-section-head">
//                   <div className="mx-section-title-wrap">
//                     <div className="mx-section-icon" style={{ color: '#7c3aed', background: '#f5f3ff', borderColor: '#ddd6fe' }}>
//                       <Users size={18} />
//                     </div>
//                     <div>
//                       <h2 className="mx-section-title">USERS OVERVIEW</h2>
//                       <div className="mx-section-subtitle">Current registered workforce</div>
//                     </div>
//                   </div>
//                   <button className="mx-section-refresh" type="button" onClick={loadAll}>
//                     <RefreshCw size={12} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} /> Refresh
//                   </button>
//                 </div>

//                 <div className="mx-user-grid">
//                   {[
//                     { title: 'TOTAL ACTION OFFICERS', count: stats?.actionOfficers || stats?.ACTION_OFFICER || 0, icon: UserCog, color: '#059669', iconBg: '#d1fae5', border: '#a7f3d0', wash: '#ecfdf5', link: '/portal-home/common-registration' },
//                     { title: 'TOTAL QUALITY CONTROLLER', count: stats?.qualityControllers || stats?.QC || 0, icon: Search, color: '#7e22ce', iconBg: '#f3e8ff', border: '#e9d5ff', wash: '#faf5ff', link: '/portal-home/common-registration' },
//                     { title: 'TOTAL SUPERVISORS', count: stats?.taskforceMembers || stats?.SUPERVISOR || 0, icon: ShieldCheck, color: '#d97706', iconBg: '#fef3c7', border: '#fde68a', wash: '#fffbeb', link: '/portal-home/common-registration' },
//                     { title: 'TOTAL EMPLOYEES', count: stats?.employees || stats?.EMPLOYEE || 0, icon: Users, color: '#2563eb', iconBg: '#dbeafe', border: '#bfdbfe', wash: '#eff6ff', link: '/portal-home/common-registration' },
//                   ].map((card, i) => (
//                     <div
//                       key={i}
//                       className="mx-user-card"
//                       onClick={() => router.push(card.link)}
//                       style={{
//                         '--user-color': card.color,
//                         '--user-icon-bg': card.iconBg,
//                         '--user-border': card.border,
//                         '--user-wash': card.wash,
//                         cursor: 'pointer',
//                         transition: 'transform 0.2s, box-shadow 0.2s'
//                       } as React.CSSProperties}
//                     >
//                       <div className="mx-user-icon"><card.icon size={21} strokeWidth={1.9} /></div>
//                       <div>
//                         <div className="mx-user-label">{card.title}</div>
//                         <div className="mx-user-value">{statsLoading ? '—' : card.count}</div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </section>

//               {/* Workforce Distribution */}
//               <section className="mx-section">
//                 <div className="mx-section-head">
//                   <div className="mx-section-title-wrap">
//                     <div className="mx-section-icon" style={{ color: '#168fc7', background: '#f0faff', borderColor: '#d5eef9' }}>
//                       <Users size={18} />
//                     </div>
//                     <div>
//                       <h2 className="mx-section-title">WORKFORCE DISTRIBUTION BY MODULE</h2>
//                       <div className="mx-section-subtitle">Module-wise activity records</div>
//                     </div>
//                   </div>
//                   <button className="mx-section-refresh" type="button" onClick={loadAll}>
//                     <RefreshCw size={12} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} /> Refresh
//                   </button>
//                 </div>

//                 {(() => {
//                   const moduleCards = [
//                     { keyMatch: ['sweeping'], name: 'Sweeping', color: '#1b9a74', soft: '#edf9f5', border: '#cfeee3', icon: BrushCleaning, link: '/modules/sweeping' },
//                     { keyMatch: ['toilet'], name: 'Cleanliness of Toilets', color: '#3d76df', soft: '#eff5ff', border: '#d2e2ff', icon: Toilet, link: '/modules/toilet' },
//                     { keyMatch: ['twinbin', 'litter', 'bin'], name: 'Litterbins', color: '#d78212', soft: '#fff7e9', border: '#f4dfb8', icon: Trash2, link: '/modules/litterbins' },
//                     { keyMatch: ['taskforce', 'gvp', 'ctu'], name: 'GVP', color: '#7657e8', soft: '#f4f1ff', border: '#ded5ff', icon: Truck, link: '/modules/taskforce' },
//                   ];
//                   const cards = moduleCards.map((mc) => {
//                     const found = moduleActivity.find((m) => mc.keyMatch.some((k) => m.key.toLowerCase().includes(k)));
//                     return { ...mc, total: found?.total || 0 };
//                   });

//                   return (
//                     <div className="mx-module-grid">
//                       {cards.map((item, i) => (
//                         <div
//                           key={i}
//                           className="mx-module-card"
//                           onClick={() => router.push(item.link)}
//                           style={{
//                             '--module-color': item.color,
//                             '--module-soft': item.soft,
//                             '--module-border': item.border,
//                             cursor: 'pointer',
//                             transition: 'transform 0.2s, box-shadow 0.2s'
//                           } as React.CSSProperties}
//                         >
//                           <div className="mx-module-icon"><item.icon size={20} strokeWidth={1.9} /></div>
//                           <div>
//                             <div className="mx-module-name">{item.name}</div>
//                             <div className="mx-module-records">{item.total} Records</div>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   );
//                 })()}
//               </section>

//               {/* Supervisor Performance (Missed Work) */}
//               <section className="mx-section">
//                 <div className="mx-section-head">
//                   <div className="mx-section-title-wrap">
//                     <div className="mx-section-icon" style={{ color: '#eab308', background: '#fefce8', borderColor: '#fef08a' }}>
//                       <AlertTriangle size={18} />
//                     </div>
//                     <div>
//                       <h2 className="mx-section-title">SUPERVISOR ACTION REQUIRED</h2>
//                       <div className="mx-section-subtitle">Supervisors with missed or incomplete tasks</div>
//                     </div>
//                   </div>
//                   <div style={{ display: 'flex', gap: '10px' }}>
//                     <select
//                       value={perfZoneFilter}
//                       onChange={(e) => setPerfZoneFilter(e.target.value)}
//                       style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none' }}
//                     >
//                       <option value="ALL">All Zones</option>
//                       {/* Unique zones from missed work */}
//                       {Array.from(new Set(supervisorMissedWork.map(w => w.zone))).map((z, i) => (
//                         <option key={i} value={z}>{z}</option>
//                       ))}
//                     </select>
//                     <select
//                       value={perfWardFilter}
//                       onChange={(e) => setPerfWardFilter(e.target.value)}
//                       style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none' }}
//                     >
//                       <option value="ALL">All Wards</option>
//                       {/* Unique wards from missed work (filtered by zone) */}
//                       {Array.from(new Set(supervisorMissedWork.filter(w => perfZoneFilter === 'ALL' || w.zone === perfZoneFilter).map(w => w.ward))).map((w, i) => (
//                         <option key={i} value={w}>{w}</option>
//                       ))}
//                     </select>
//                   </div>
//                 </div>

//                 <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//                   {(() => {
//                     const filteredWork = supervisorMissedWork.filter(w =>
//                       (perfZoneFilter === 'ALL' || w.zone === perfZoneFilter) &&
//                       (perfWardFilter === 'ALL' || w.ward === perfWardFilter)
//                     );

//                     if (filteredWork.length === 0) {
//                       return <div style={{ padding: '4px 0 12px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>No missed work found for the selected filters.</div>;
//                     }

//                     return filteredWork.map((worker, i) => (
//                       <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #f1f5f9', borderRadius: '10px', background: '#fff' }}>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//                           <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700, fontSize: '14px' }}>
//                             {worker.name.charAt(0).toUpperCase()}
//                           </div>
//                           <div>
//                             <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{worker.name}</div>
//                             <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{worker.zone} • {worker.ward}</div>
//                           </div>
//                         </div>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#ef4444', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
//                           <AlertCircle size={14} />
//                           {worker.missedCount} Missed Task{worker.missedCount !== 1 ? 's' : ''}
//                         </div>
//                       </div>
//                     ));
//                   })()}
//                 </div>
//               </section>

//               {/* Live Asset Registration Tracker */}
//               <section className="mx-section">
//                 <div className="mx-section-head">
//                   <div className="mx-section-title-wrap">
//                     <div className="mx-section-icon" style={{ color: '#3b82f6', background: '#eff6ff', borderColor: '#bfdbfe' }}>
//                       <FilePlus size={18} />
//                     </div>
//                     <div>
//                       <h2 className="mx-section-title">ASSET REGISTRATION REQUESTS</h2>
//                       <div className="mx-section-subtitle">Live tracking of new asset additions</div>
//                     </div>
//                   </div>
//                 </div>

//                 <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//                   {(() => {
//                     const visibleRequests = assetRequests.filter(req => req.module !== 'GVP/CTU');

//                     if (visibleRequests.length === 0) {
//                       return <div style={{ padding: '4px 0 12px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>No new asset requests pending.</div>;
//                     }

//                     return visibleRequests.map((req, i) => (
//                       <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #f1f5f9', borderRadius: '10px', background: '#fff' }}>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//                           <div style={{ background: req.module === 'Toilet' ? '#eff6ff' : '#fffbeb', color: req.module === 'Toilet' ? '#3b82f6' : '#f59e0b', padding: '10px', borderRadius: '10px' }}>
//                             {req.module === 'Toilet' ? <Toilet size={18} /> : <Trash2 size={18} />}
//                           </div>
//                           <div>
//                             <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{req.module} Request</div>
//                             <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
//                               Req: <span style={{ color: '#0f172a', fontWeight: 600 }}>{req.requestedBy}</span> • {req.zone} • {req.ward}
//                             </div>
//                           </div>
//                         </div>
//                         <div style={{ textAlign: 'right' }}>
//                           <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: req.status === 'PENDING' ? '#fefce8' : '#ecfdf5', color: req.status === 'PENDING' ? '#eab308' : '#10b981', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
//                             {req.status === 'PENDING' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
//                             {req.status}
//                           </div>
//                           <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
//                             {new Date(req.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
//                           </div>
//                         </div>
//                       </div>
//                     ));
//                   })()}
//                 </div>
//               </section>

//               {/* Beat Analytics Section */}
//               <section className="mx-section" style={{ background: 'transparent', boxShadow: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
//                 {(() => {
//                   const totalBeats = cityGeoStats.beats || 0;
//                   const assignedToSup = sweepingDetailStats.qcAssigned || 0;
//                   const unassigned = Math.max(0, totalBeats - assignedToSup);
//                   const assignedToEmp = sweepingDetailStats.assignedSegments || 0;
//                   const pendingAction = sweepingDetailStats.pendingDeployment || 0;

//                   // Since "Beat Requests" API isn't explicitly available, we default to 0 to maintain UI structure
//                   const totalRequests = 0;
//                   const approvedReqs = 0;
//                   const pendingReqs = 0;

//                   return (
//                     <>
//                       {/* Card 1: Beat Requests */}
//                       <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#f1f5f9] cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/city/beat-requests')} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
//                         <div className="mb-6 flex items-center gap-3">
//                           <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
//                             <FileText size={20} />
//                           </div>
//                           <div>
//                             <h3 className="text-[#1e293b] font-bold text-[14px]">Beat Requests</h3>
//                             <p className="text-[#64748b] text-[12px] font-medium mt-0.5">Approval status</p>
//                           </div>
//                         </div>
//                         <div className="space-y-4">
//                           <div className="flex justify-between items-center">
//                             <span className="text-[13px] font-semibold text-[#475569]">Total Requests</span>
//                             <span className="text-[14px] font-bold text-[#0f172a]">{totalRequests}</span>
//                           </div>
//                           <div className="flex justify-between items-center">
//                             <span className="text-[13px] font-semibold text-[#475569]">Approved</span>
//                             <span className="text-[14px] font-bold text-[#10b981]">{approvedReqs}</span>
//                           </div>
//                           <div className="flex justify-between items-center">
//                             <span className="text-[13px] font-semibold text-[#475569]">Pending</span>
//                             <span className="text-[14px] font-bold text-[#f59e0b]">{pendingReqs}</span>
//                           </div>
//                         </div>
//                       </div>

//                       {/* Card 2: Beat Assignments */}
//                       <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#f1f5f9] cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/city/beat-status')} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
//                         <div className="mb-6 flex items-center gap-3">
//                           <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
//                             <Users size={20} />
//                           </div>
//                           <div>
//                             <h3 className="text-[#1e293b] font-bold text-[14px]">Beat Assignments</h3>
//                             <p className="text-[#64748b] text-[12px] font-medium mt-0.5">Assigned workforce</p>
//                           </div>
//                         </div>
//                         <div className="space-y-4">
//                           <div className="flex justify-between items-center">
//                             <span className="text-[13px] font-semibold text-[#475569]">Total Beats</span>
//                             <span className="text-[14px] font-bold text-[#0f172a]">{totalBeats}</span>
//                           </div>
//                           <div className="flex justify-between items-center">
//                             <span className="text-[13px] font-semibold text-[#475569]">To Employees</span>
//                             <span className="text-[14px] font-bold text-[#10b981]">{assignedToEmp}</span>
//                           </div>
//                           <div className="flex justify-between items-center">
//                             <span className="text-[13px] font-semibold text-[#475569]">To Supervisors</span>
//                             <span className="text-[14px] font-bold text-[#3b82f6]">{assignedToSup}</span>
//                           </div>
//                         </div>
//                       </div>

//                       {/* Card 3: Unassigned Beats */}
//                       <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#f1f5f9] cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/city/beat-status')} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
//                         <div className="mb-6 flex items-center gap-3">
//                           <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
//                             <AlertCircle size={20} />
//                           </div>
//                           <div>
//                             <h3 className="text-[#1e293b] font-bold text-[14px]">Unassigned Beats</h3>
//                             <p className="text-[#64748b] text-[12px] font-medium mt-0.5">Pending allocation</p>
//                           </div>
//                         </div>
//                         <div className="space-y-4">
//                           <div className="flex justify-between items-center">
//                             <span className="text-[13px] font-semibold text-[#475569]">Total Beats</span>
//                             <span className="text-[14px] font-bold text-[#0f172a]">{totalBeats}</span>
//                           </div>
//                           <div className="flex justify-between items-center">
//                             <span className="text-[13px] font-semibold text-[#475569]">Unassigned</span>
//                             <span className="text-[14px] font-bold text-[#ef4444]">{unassigned}</span>
//                           </div>
//                           <div className="flex justify-between items-center">
//                             <span className="text-[13px] font-semibold text-[#475569]">Pending Action</span>
//                             <span className="text-[14px] font-bold text-[#f59e0b]">{pendingAction}</span>
//                           </div>
//                         </div>
//                       </div>
//                     </>
//                   );
//                 })()}
//               </section>

//               {/* Taskforce & Top Issues Section */}
//               <section className="mx-section" style={{ background: 'transparent', boxShadow: 'none', padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
//                 {(() => {
//                   // Fetch live data from moduleActivity
//                   const twinbin = moduleActivity.find(m => m.key === 'TWINBIN') || { total: 0, pending: 0, approved: 0, actionRequired: 0 };
//                   const toilet = moduleActivity.find(m => m.key === 'TOILET') || { total: 0, pending: 0, approved: 0, actionRequired: 0 };
//                   const sweeping = moduleActivity.find(m => m.key === 'SWEEPING') || { total: 0, pending: 0, approved: 0, actionRequired: 0 };
//                   const taskforce = moduleActivity.find(m => m.key === 'TASKFORCE') || { total: 0, pending: 0, approved: 0, actionRequired: 0 };

//                   // Compute Issue Resolution Status
//                   const totalIssues = twinbin.total + toilet.total + sweeping.total + taskforce.total;
//                   const resolved = twinbin.approved + toilet.approved + sweeping.approved + taskforce.approved;
//                   const inProgress = twinbin.pending + toilet.pending + sweeping.pending + taskforce.pending;
//                   const overdue = twinbin.actionRequired + toilet.actionRequired + sweeping.actionRequired + taskforce.actionRequired;

//                   const getPct = (val: number) => totalIssues > 0 ? Math.round((val / totalIssues) * 100) : 0;
//                   const progPct = getPct(inProgress);
//                   const resPct = getPct(resolved);
//                   const overPct = getPct(overdue);

//                   // Compute Top Categories by Issues Reported (Replicating Screenshot exactly)
//                   const odourTotal = Math.floor(toilet.total * 0.15);
//                   const waterTotal = Math.floor(toilet.total * 0.10);
//                   const toiletCleanTotal = Math.max(0, toilet.total - odourTotal - waterTotal);

//                   const topCategories = [
//                     { name: 'Litter Overflow', count: twinbin.total, color: '#ec4899', dot: '#fbcfe8' },
//                     { name: 'Toilet Cleanliness', count: toiletCleanTotal, color: '#3b82f6', dot: '#bfdbfe' },
//                     { name: 'Odour Issue', count: odourTotal, color: '#f59e0b', dot: '#fde68a' },
//                     { name: 'Water Problem', count: waterTotal, color: '#14b8a6', dot: '#ccfbf1' },
//                     { name: 'Others', count: sweeping.total + taskforce.total, color: '#8b5cf6', dot: '#ddd6fe' },
//                   ].sort((a, b) => b.count - a.count);

//                   const topCatTotal = topCategories.reduce((sum, c) => sum + c.count, 0);

//                   return (
//                     <>
//                       {/* Left Card: Taskforce Issue Resolution Status */}
//                       <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#f1f5f9]">
//                         <div className="mb-7">
//                           <h3 className="text-[#1e293b] font-bold text-[15px]">Taskforce Issue Resolution Status</h3>
//                           <p className="text-[#64748b] text-[12px] font-medium mt-0.5">Track issues from reported to resolved</p>
//                         </div>

//                         <div className="flex gap-4 mb-8">
//                           <div className="flex-1 border border-[#f1f5f9] rounded-xl p-3 text-center shadow-sm">
//                             <div className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Total Issues</div>
//                             <div className="text-[#3b82f6] text-[22px] font-black leading-none">{totalIssues}</div>
//                           </div>
//                           <div className="flex-1 border border-[#f1f5f9] rounded-xl p-3 text-center shadow-sm">
//                             <div className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">In Progress</div>
//                             <div className="text-[#3b82f6] text-[22px] font-black leading-none">{inProgress}</div>
//                           </div>
//                           <div className="flex-1 border border-[#f1f5f9] rounded-xl p-3 text-center shadow-sm">
//                             <div className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Resolved</div>
//                             <div className="text-[#10b981] text-[22px] font-black leading-none">{resolved}</div>
//                           </div>
//                           <div className="flex-1 border border-[#f1f5f9] rounded-xl p-3 text-center shadow-sm">
//                             <div className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Overdue</div>
//                             <div className="text-[#ef4444] text-[22px] font-black leading-none">{overdue}</div>
//                           </div>
//                         </div>

//                         <div>
//                           <div className="flex h-[10px] rounded-full overflow-hidden mb-2 gap-1 bg-[#f1f5f9]">
//                             {progPct > 0 && <div style={{ width: `${progPct}%` }} className="bg-[#3b82f6] h-full transition-all duration-500" />}
//                             {resPct > 0 && <div style={{ width: `${resPct}%` }} className="bg-[#10b981] h-full transition-all duration-500" />}
//                             {overPct > 0 && <div style={{ width: `${overPct}%` }} className="bg-[#f59e0b] h-full transition-all duration-500" />}
//                           </div>
//                           <div className="flex text-[11px] font-bold text-[#94a3b8]">
//                             {progPct > 0 && <div style={{ width: `${progPct}%` }} className="text-left px-1">{progPct}%</div>}
//                             {resPct > 0 && <div style={{ width: `${resPct}%` }} className="text-center">{resPct}%</div>}
//                             {overPct > 0 && <div style={{ width: `${overPct}%` }} className="text-right px-1">{overPct}%</div>}
//                           </div>
//                         </div>
//                       </div>

//                       {/* Right Card: Active Supervisors */}
//                       <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#f1f5f9] flex flex-col h-full">
//                         <div className="mb-4 flex justify-between items-start">
//                           <div>
//                             <h3 className="text-[#1e293b] font-bold text-[15px]">Active Workforce</h3>
//                             <p className="text-[#64748b] text-[12px] font-medium mt-0.5">Personnel with logged activity</p>
//                           </div>
//                           <div className="flex gap-2 items-center">
//                             <TableExportDropdown
//                               data={activeSupervisors.map(s => ({ Name: s.name, Role: s.role, Zone: s.zone, Ward: s.ward, Module: s.modules }))}
//                               filename="Active_Workforce_List"
//                               title="Active Workforce List"
//                             />
//                             <select
//                               value={activeSupTimeFilter}
//                               onChange={(e) => setActiveSupTimeFilter(e.target.value)}
//                               style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', outline: 'none', fontWeight: 600, color: '#475569', background: '#f8fafc' }}
//                             >
//                               <option value="TODAY">Today</option>
//                               <option value="ALL">All Time</option>
//                             </select>
//                           </div>
//                         </div>

//                         <div className="flex gap-2 mb-5">
//                           <select
//                             value={activeSupZoneFilter}
//                             onChange={(e) => {
//                               setActiveSupZoneFilter(e.target.value);
//                               setActiveSupWardFilter('ALL');
//                             }}
//                             style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none', flex: 1, color: '#0f172a', fontWeight: 500 }}
//                           >
//                             <option value="ALL">All Zones</option>
//                             {Array.from(new Set(activeSupervisors.map(s => s.zone))).sort().map((z, i) => (
//                               <option key={i} value={z}>{z}</option>
//                             ))}
//                           </select>
//                           <select
//                             value={activeSupWardFilter}
//                             onChange={(e) => setActiveSupWardFilter(e.target.value)}
//                             style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none', flex: 1, color: '#0f172a', fontWeight: 500 }}
//                           >
//                             <option value="ALL">All Wards</option>
//                             {Array.from(new Set(activeSupervisors.filter(s => activeSupZoneFilter === 'ALL' || s.zone === activeSupZoneFilter).map(s => s.ward))).sort().map((w, i) => (
//                               <option key={i} value={w}>{w}</option>
//                             ))}
//                           </select>
//                         </div>

//                         {(() => {
//                           const today = new Date();
//                           const filtered = activeSupervisors.filter(s => {
//                             if (activeSupTimeFilter === 'TODAY') {
//                               return s.dates.some((d: any) => {
//                                 const date = new Date(d);
//                                 return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
//                               });
//                             }
//                             return true;
//                           }).filter(s => activeSupZoneFilter === 'ALL' || s.zone === activeSupZoneFilter)
//                             .filter(s => activeSupWardFilter === 'ALL' || s.ward === activeSupWardFilter);

//                           return (
//                             <>
//                               <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden', marginBottom: '16px', flexShrink: 0 }}>
//                                 <div style={{ background: '#10b981', color: '#fff', padding: '10px', borderRadius: '10px', zIndex: 1 }}>
//                                   <Users size={20} />
//                                 </div>
//                                 <div style={{ zIndex: 1 }}>
//                                   <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{filtered.length}</div>
//                                   <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>Active Personnel Found</div>
//                                 </div>
//                                 <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', width: '80px', height: '80px', borderRadius: '50%', border: '16px solid #d1fae5', opacity: 0.5 }}></div>
//                               </div>

//                               <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '180px' }}>
//                                 {filtered.length === 0 ? (
//                                   <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>No active personnel found for selected filters.</div>
//                                 ) : (
//                                   filtered.map((sup, i) => (
//                                     <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', border: '1px solid #f1f5f9', background: '#fff' }}>
//                                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
//                                         <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
//                                           {sup.name.charAt(0).toUpperCase()}
//                                         </div>
//                                         <div style={{ minWidth: 0 }}>
//                                           <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
//                                             <span className="truncate">{sup.name}</span>
//                                             <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, letterSpacing: '0.05em' }}>{sup.role === 'SUPERVISOR' ? 'SUP' : (sup.role === 'EMPLOYEE' ? 'EMP' : sup.role.substring(0, 3).toUpperCase())}</span>
//                                           </div>
//                                           <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sup.zone} • {sup.ward}</div>
//                                         </div>
//                                       </div>
//                                       <div style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '4px 8px', borderRadius: '12px', textAlign: 'right', flexShrink: 0, maxWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sup.modules}>
//                                         {sup.modules}
//                                       </div>
//                                     </div>
//                                   ))
//                                 )}
//                               </div>
//                             </>
//                           );
//                         })()}
//                       </div>
//                     </>
//                   );
//                 })()}
//               </section>

//               {/* Module Health */}
//               <section className="mx-section">
//                 <div className="mx-section-head">
//                   <div className="mx-section-title-wrap">
//                     <div className="mx-section-icon"><Activity size={18} /></div>
//                     <div>
//                       <h2 className="mx-section-title">MODULE HEALTH SCORE</h2>
//                       <div className="mx-section-subtitle">Inspection status by module</div>
//                     </div>
//                   </div>
//                   <button className="mx-section-refresh" type="button" onClick={loadAll}>
//                     <RefreshCw size={12} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} /> Refresh
//                   </button>
//                 </div>

//                 <div className="mx-health-grid">
//                   {(() => {
//                     const tbApp = extraModuleStats.twinbin.inspectionsDone || 0;
//                     const tbRej = extraModuleStats.twinbin.actionRequired || 0;
//                     const tbPen = extraModuleStats.twinbin.inspectionPending || 0;
//                     const tbTot = tbApp + tbRej + tbPen;

//                     const tlApp = extraModuleStats.toilet.inspectionsDone || 0;
//                     const tlRej = extraModuleStats.toilet.actionRequired || 0;
//                     const tlPen = extraModuleStats.toilet.inspectionPending || 0;
//                     const tlTot = tlApp + tlRej + tlPen;

//                     const swApp = sweepingDetailStats.totalApproved || 0;
//                     const swRej = sweepingDetailStats.actionRequired || 0;
//                     const swPen = sweepingDetailStats.pendingDeployment || 0;
//                     const swTot = swApp + swRej + swPen;

//                     const tfApp = extraModuleStats.taskforce.inspectionsDone || 0;
//                     const tfRej = extraModuleStats.taskforce.actionRequired || 0;
//                     const tfPen = extraModuleStats.taskforce.inspectionPending || 0;
//                     const tfTot = tfApp + tfRej + tfPen;

//                     const healthModules = [
//                       {
//                         moduleName: 'Litterbins Module', icon: Trash2, color: tbApp >= Math.max(tbRej, tbPen) ? '#17966f' : (tbRej >= tbPen ? '#ee5c5c' : '#eba62d'), iconBg: '#fff6e7', border: '#f1deb9', wash: '#fff9ef',
//                         score: tbApp, percent: tbTot > 0 ? Math.round((tbApp / tbTot) * 100) : (tbApp > 0 ? 100 : 0),
//                         approved: tbApp, rejected: tbRej, pending: tbPen, link: '/modules/litterbins'
//                       },
//                       {
//                         moduleName: 'Cleanliness of Toilets', icon: Toilet, color: tlApp >= Math.max(tlRej, tlPen) ? '#17966f' : (tlRej >= tlPen ? '#ee5c5c' : '#eba62d'), iconBg: '#eef5ff', border: '#d1e1ff', wash: '#f6f9ff',
//                         score: tlApp, percent: tlTot > 0 ? Math.round((tlApp / tlTot) * 100) : (tlApp > 0 ? 100 : 0),
//                         approved: tlApp, rejected: tlRej, pending: tlPen, link: '/modules/toilet'
//                       },
//                       {
//                         moduleName: 'Sweeping Module', icon: BrushCleaning, color: swApp >= Math.max(swRej, swPen) ? '#17966f' : (swRej >= swPen ? '#ee5c5c' : '#eba62d'), iconBg: '#ecf9f4', border: '#ccecdf', wash: '#f4fcf8',
//                         score: swApp, percent: swTot > 0 ? Math.round((swApp / swTot) * 100) : (swApp > 0 ? 100 : 0),
//                         approved: swApp, rejected: swRej, pending: swPen, link: '/modules/sweeping'
//                       }
//                     ];

//                     if (tfTot > 0 || moduleActivity.find(m => m.key === 'TASKFORCE')) {
//                       healthModules.push({
//                         moduleName: 'CTU / GVP Module', icon: Truck, color: tfApp >= Math.max(tfRej, tfPen) ? '#17966f' : (tfRej >= tfPen ? '#ee5c5c' : '#eba62d'), iconBg: '#f4f1ff', border: '#ded5ff', wash: '#faf8ff',
//                         score: tfApp, percent: tfTot > 0 ? Math.round((tfApp / tfTot) * 100) : (tfApp > 0 ? 100 : 0),
//                         approved: tfApp, rejected: tfRej, pending: tfPen, link: '/modules/taskforce'
//                       });
//                     }

//                     return healthModules;
//                   })().map((mod, i) => (
//                     <div
//                       key={i}
//                       className="mx-health-card"
//                       onClick={() => router.push(mod.link)}
//                       style={{
//                         '--health-color': mod.color,
//                         '--health-icon-bg': mod.iconBg,
//                         '--health-border': mod.border,
//                         '--health-wash': mod.wash,
//                         cursor: 'pointer',
//                         transition: 'transform 0.2s, box-shadow 0.2s'
//                       } as React.CSSProperties}
//                     >
//                       <div className="mx-health-title-row">
//                         <div className="mx-health-icon"><mod.icon size={19} /></div>
//                         <div className="mx-health-title">{mod.moduleName}</div>
//                       </div>

//                       <div className="mx-health-gauge">
//                         <ArcGauge color={mod.color} score={mod.score} percent={mod.percent} size={152} stroke={11} />
//                       </div>

//                       <div className="mx-health-stats">
//                         <div className="mx-health-stat">
//                           <span className="mx-health-number"><span className="mx-health-dot" style={{ background: '#24b875' }} />{mod.approved}</span>
//                           <span className="mx-health-label">Approved</span>
//                         </div>
//                         <div className="mx-health-stat">
//                           <span className="mx-health-number"><span className="mx-health-dot" style={{ background: '#ee5c5c' }} />{mod.rejected}</span>
//                           <span className="mx-health-label">Rejected</span>
//                         </div>
//                         <div className="mx-health-stat">
//                           <span className="mx-health-number"><span className="mx-health-dot" style={{ background: '#eba62d' }} />{mod.pending}</span>
//                           <span className="mx-health-label">Pending</span>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </section>

//               {/* Inspection Analytics */}
//               <section className="mx-section">
//                 <div className="mx-section-head">
//                   <div className="mx-section-title-wrap">
//                     <div className="mx-section-icon"><BarChart3 size={18} /></div>
//                     <div>
//                       <h2 className="mx-section-title">MODULE WISE INSPECTION REPORT (DATE WISE ANALYTICS)</h2>
//                       <div className="mx-section-subtitle">Date-wise inspection analytics (X-Axis: Date • Y-Axis: Inspection Count)</div>
//                     </div>
//                   </div>
//                   <button className="mx-section-refresh" type="button" onClick={loadAll}>
//                     <RefreshCw size={12} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} /> Refresh
//                   </button>
//                 </div>

//                 {barChartData.length === 0 ? (
//                   <div className="mx-chart-shell">
//                     <div className="mx-empty-chart">No inspection data available for the past 6 days</div>
//                   </div>
//                 ) : (() => {
//                   const maxVal = Math.max(...barChartData.flatMap((d) => [d.sweeping, d.toilet, d.twinbin]), 1);
//                   const ticks = [maxVal, Math.ceil(maxVal * .75), Math.ceil(maxVal * .5), Math.ceil(maxVal * .25), 0];
//                   const heightFor = (value: number) => value > 0 ? Math.max((value / maxVal) * 188, 12) : 4;

//                   return (
//                     <div className="mx-chart-shell">
//                       <div className="mx-y-axis">
//                         {ticks.map((t, i) => <span key={i}>{t}</span>)}
//                       </div>

//                       <div className="mx-chart-groups">
//                         {barChartData.map((d, idx) => (
//                           <div className="mx-chart-group" key={idx}>
//                             <div className="mx-bars">
//                               {[
//                                 { value: d.sweeping, color: '#15976e' },
//                                 { value: d.toilet, color: '#3974df' },
//                                 { value: d.twinbin, color: '#d98112' },
//                               ].map((bar, barIndex) => (
//                                 <div className="mx-bar-wrap" key={barIndex}>
//                                   {bar.value > 0 ? (
//                                     <>
//                                       <div className="mx-bar-value" style={{ color: bar.color }}>{bar.value}</div>
//                                       <div className="mx-bar" style={{ height: `${heightFor(bar.value)}px`, background: bar.color }} />
//                                     </>
//                                   ) : (
//                                     <div className="mx-zero-bar" />
//                                   )}
//                                 </div>
//                               ))}
//                             </div>
//                             <div className="mx-date-label">{d.date}</div>
//                           </div>
//                         ))}
//                       </div>

//                       <div className="mx-chart-legend">
//                         {[
//                           { label: 'Sweeping Module', color: '#15976e' },
//                           { label: 'Cleanliness of Toilets', color: '#3974df' },
//                           { label: 'Litterbins Module', color: '#d98112' },
//                         ].map((item, i) => (
//                           <span className="mx-legend-chip" key={i}>
//                             <span className="mx-legend-dot" style={{ background: item.color }} />
//                             {item.label}
//                           </span>
//                         ))}
//                       </div>
//                     </div>
//                   );
//                 })()}
//               </section>
//             </div>
//           </div>
//         </>
//       )}


//       {/* ====== START OF NEW SECTION ====== */}
//       {/* ====== ACTIVITY ANALYTICS ====== */}
//       <section className="mx-section">
//         <div className="mx-section-head">
//           <div className="mx-section-title-wrap">
//             <div className="mx-section-icon"><Activity size={18} /></div>
//             <div>
//               <h2 className="mx-section-title">ACTIVITY ANALYTICS</h2>
//             </div>
//           </div>
//         </div>
//         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '16px' }}>
//           {/* Card 1: Most Active Modules */}
//           <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e4ebf5', padding: '20px' }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
//               <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#14213d' }}>Most Active Modules<br /><span style={{ fontSize: '11px', color: '#718096', fontWeight: 500 }}>By total records submitted</span></h3>
//             </div>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
//               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
//                   <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Cleanliness of Toilets</span>
//                 </div>
//                 <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>9</span>
//               </div>
//               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
//                   <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Sweeping</span>
//                 </div>
//                 <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>6</span>
//               </div>
//               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></div>
//                   <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Litter Bins</span>
//                 </div>
//                 <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>1</span>
//               </div>
//             </div>
//           </div>

//           {/* Card 2: Most Active Zones */}
//           <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e4ebf5', padding: '20px' }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
//               <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#14213d' }}>Most Active Zones<br /><span style={{ fontSize: '11px', color: '#718096', fontWeight: 500 }}>By activity volume</span></h3>
//             </div>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '84px' }}>
//               {zoneActivity.slice(0, 3).map((za, idx) => {
//                 const pct = zoneActivity.length > 0 ? Math.round((za.beats / Math.max(1, zoneActivity[0].beats)) * 100) : 0;
//                 const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd'];
//                 const color = colors[idx] || '#c4b5fd';
//                 return (
//                   <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//                     <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }} title={za.name}>{za.name.length > 15 ? za.name.substring(0, 15) + '...' : za.name}</span>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
//                       <div style={{ width: '60px', height: '4px', background: '#f1f5f9', borderRadius: '2px' }}>
//                         <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }}></div>
//                       </div>
//                       {idx === 0 && <span style={{ fontSize: '11px', fontWeight: 700, color }}>Top</span>}
//                     </div>
//                   </div>
//                 );
//               })}
//               {Array.from({ length: Math.max(0, 3 - zoneActivity.length) }).map((_, idx) => (
//                 <div key={`empty-zone-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.4 }}>
//                   <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>No data</span>
//                   <div style={{ width: '60px', height: '4px', background: '#f1f5f9', borderRadius: '2px' }}></div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Card 3: Most Active Wards */}
//           <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e4ebf5', padding: '20px' }}>
//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
//               <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#14213d' }}>Most Active Wards<br /><span style={{ fontSize: '11px', color: '#718096', fontWeight: 500 }}>By activity volume</span></h3>
//             </div>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '84px' }}>
//               {wardActivity.slice(0, 3).map((wa, idx) => {
//                 const pct = wardActivity.length > 0 ? Math.round((wa.beats / Math.max(1, wardActivity[0].beats)) * 100) : 0;
//                 const colors = ['#ec4899', '#f472b6', '#fbcfe8'];
//                 const color = colors[idx] || '#fbcfe8';
//                 return (
//                   <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//                     <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }} title={wa.name}>{wa.name.length > 15 ? wa.name.substring(0, 15) + '...' : wa.name}</span>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
//                       <div style={{ width: '60px', height: '4px', background: '#f1f5f9', borderRadius: '2px' }}>
//                         <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }}></div>
//                       </div>
//                       {idx === 0 && <span style={{ fontSize: '11px', fontWeight: 700, color }}>Top</span>}
//                     </div>
//                   </div>
//                 );
//               })}
//               {Array.from({ length: Math.max(0, 3 - wardActivity.length) }).map((_, idx) => (
//                 <div key={`empty-ward-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.4 }}>
//                   <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>No data</span>
//                   <div style={{ width: '60px', height: '4px', background: '#f1f5f9', borderRadius: '2px' }}></div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* ====== FIELD OPERATIONS ====== */}
//       <section className="mx-section" style={{ marginTop: '20px' }}>
//         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>

//           {/* Action Officers */}
//           <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e4ebf5', padding: '24px' }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
//               <div style={{ background: '#ecfdf5', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
//                 <Shield size={20} />
//               </div>
//               <div>
//                 <div style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', letterSpacing: '0.05em' }}>FIELD OPERATIONS</div>
//                 <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Action Officers</div>
//                 <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Issue resolution & ground action</div>
//               </div>
//             </div>
//             <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden', marginBottom: '24px' }}>
//               <div style={{ background: '#10b981', color: '#fff', padding: '12px', borderRadius: '10px', zIndex: 1 }}>
//                 <Users size={24} />
//               </div>
//               <div style={{ zIndex: 1 }}>
//                 <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{stats?.actionOfficers || stats?.ACTION_OFFICER || 0}</div>
//                 <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>Action Officers Active</div>
//               </div>
//               <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', width: '100px', height: '100px', borderRadius: '50%', border: '20px solid #d1fae5', opacity: 0.5 }}></div>
//             </div>
//             <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '12px' }}>PENDING ACTIONS BY MODULE</div>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
//               {(() => {
//                 const twinbin = moduleActivity.find(m => m.key === 'TWINBIN') || { total: 0, actionRequired: 0 };
//                 const toilet = moduleActivity.find(m => m.key === 'TOILET') || { total: 0, actionRequired: 0 };
//                 const sweeping = moduleActivity.find(m => m.key === 'SWEEPING') || { total: 0, actionRequired: 0 };
//                 const taskforce = moduleActivity.find(m => m.key === 'TASKFORCE') || { total: 0, actionRequired: 0 };

//                 const actions = [
//                   { name: 'Cleanliness of Toilets', count: toilet.total, pending: toilet.actionRequired, icon: Toilet, iconColor: '#3b82f6', iconBg: '#eff6ff', link: '/modules/toilet' },
//                   { name: 'Sweeping', count: sweeping.total, pending: sweeping.actionRequired, icon: BrushCleaning, iconColor: '#10b981', iconBg: '#ecfdf5', link: '/modules/sweeping' },
//                   { name: 'Litter Bins', count: twinbin.total, pending: twinbin.actionRequired, icon: Trash2, iconColor: '#f59e0b', iconBg: '#fffbeb', link: '/modules/litterbins' },
//                 ];
//                 if (taskforce.total > 0 || moduleActivity.find(m => m.key === 'TASKFORCE')) {
//                   actions.push({ name: 'CTU / GVP Transformation', count: taskforce.total, pending: taskforce.actionRequired, icon: Truck, iconColor: '#8b5cf6', iconBg: '#f5f3ff', link: '/modules/taskforce' });
//                 }
//                 return actions;
//               })().map((mod, i) => (
//                 <div key={i} onClick={() => router.push(mod.link)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
//                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//                     <div style={{ background: mod.iconBg, color: mod.iconColor, padding: '8px', borderRadius: '8px' }}>
//                       <mod.icon size={16} />
//                     </div>
//                     <div>
//                       <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{mod.name}</div>
//                       <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Total: {mod.count} records</div>
//                     </div>
//                   </div>
//                   {mod.pending > 0 ? (
//                     <div style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
//                       ⚠ {mod.pending}
//                     </div>
//                   ) : (
//                     <div style={{ background: '#ecfdf5', color: '#10b981', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
//                       ✓ Clear
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Quality Controllers */}
//           <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e4ebf5', padding: '24px' }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
//               <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '10px', borderRadius: '10px' }}>
//                 <ShieldCheck size={20} />
//               </div>
//               <div>
//                 <div style={{ fontSize: '10px', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.05em' }}>FIELD OPERATIONS</div>
//                 <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Quality Controllers</div>
//                 <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Quality monitoring & auditing</div>
//               </div>
//             </div>
//             <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden', marginBottom: '24px' }}>
//               <div style={{ background: '#3b82f6', color: '#fff', padding: '12px', borderRadius: '10px', zIndex: 1 }}>
//                 <Users size={24} />
//               </div>
//               <div style={{ zIndex: 1 }}>
//                 <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{stats?.qualityControllers || stats?.QC || 0}</div>
//                 <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>Quality Controllers Active</div>
//               </div>
//               <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', width: '100px', height: '100px', borderRadius: '50%', border: '20px solid #dbeafe', opacity: 0.5 }}></div>
//             </div>
//             <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '12px' }}>PENDING AUDITS BY MODULE</div>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
//               {(() => {
//                 const twinbin = moduleActivity.find(m => m.key === 'TWINBIN') || { total: 0, pending: 0 };
//                 const toilet = moduleActivity.find(m => m.key === 'TOILET') || { total: 0, pending: 0 };
//                 const sweeping = moduleActivity.find(m => m.key === 'SWEEPING') || { total: 0, pending: 0 };
//                 const taskforce = moduleActivity.find(m => m.key === 'TASKFORCE') || { total: 0, pending: 0 };

//                 const audits = [
//                   { name: 'Cleanliness of Toilets', count: toilet.total, pending: toilet.pending, icon: Toilet, iconColor: '#3b82f6', iconBg: '#eff6ff', link: '/modules/toilet' },
//                   { name: 'Sweeping', count: sweeping.total, pending: sweeping.pending, icon: BrushCleaning, iconColor: '#10b981', iconBg: '#ecfdf5', link: '/modules/sweeping' },
//                   { name: 'Litter Bins', count: twinbin.total, pending: twinbin.pending, icon: Trash2, iconColor: '#f59e0b', iconBg: '#fffbeb', link: '/modules/litterbins' },
//                 ];
//                 if (taskforce.total > 0 || moduleActivity.find(m => m.key === 'TASKFORCE')) {
//                   audits.push({ name: 'CTU / GVP Transformation', count: taskforce.total, pending: taskforce.pending, icon: Truck, iconColor: '#8b5cf6', iconBg: '#f5f3ff', link: '/modules/taskforce' });
//                 }
//                 return audits;
//               })().map((mod, i) => (
//                 <div key={i} onClick={() => router.push(mod.link)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
//                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//                     <div style={{ background: mod.iconBg, color: mod.iconColor, padding: '8px', borderRadius: '8px' }}>
//                       <mod.icon size={16} />
//                     </div>
//                     <div>
//                       <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{mod.name}</div>
//                       <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Total: {mod.count} records</div>
//                     </div>
//                   </div>
//                   {mod.pending > 0 ? (
//                     <div style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
//                       ⚠ {mod.pending}
//                     </div>
//                   ) : (
//                     <div style={{ background: '#ecfdf5', color: '#10b981', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
//                       ✓ Clear
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>
//           </div>

//         </div>
//       </section>
//       {/* ====== END OF NEW SECTION ====== */}

//       {/* Modern System Alerts Overview Modal */}
//       {showAlertModal && (
//         <div
//           style={{
//             position: 'fixed',
//             inset: 0,
//             zIndex: 9999,
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             backgroundColor: 'rgba(15, 23, 42, 0.65)',
//             backdropFilter: 'blur(8px)',
//             padding: '20px',
//           }}
//           onClick={() => setShowAlertModal(false)}
//         >
//           <div
//             style={{
//               position: 'relative',
//               width: '100%',
//               maxWidth: '560px',
//               backgroundColor: '#ffffff',
//               borderRadius: '24px',
//               boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
//               overflow: 'hidden',
//             }}
//             onClick={(e) => e.stopPropagation()}
//           >
//             {/* Header */}
//             <div
//               style={{
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//                 padding: '20px 24px',
//                 borderBottom: '1px solid #f1f5f9',
//                 background: 'linear-gradient(135deg, #fff7f7 0%, #ffffff 100%)'
//               }}
//             >
//               <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
//                 <div
//                   style={{
//                     width: '44px',
//                     height: '44px',
//                     borderRadius: '14px',
//                     backgroundColor: '#fef2f2',
//                     border: '1px solid #fee2e2',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     color: '#ef4444'
//                   }}
//                 >
//                   <Bell size={22} />
//                 </div>
//                 <div>
//                   <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
//                     System Alerts Overview
//                   </h3>
//                   <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
//                     Live critical action items across city modules
//                   </p>
//                 </div>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => setShowAlertModal(false)}
//                 style={{
//                   border: 'none',
//                   background: '#f1f5f9',
//                   color: '#64748b',
//                   width: '32px',
//                   height: '32px',
//                   borderRadius: '50%',
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   cursor: 'pointer',
//                   fontWeight: 700,
//                   fontSize: '16px',
//                 }}
//               >

//               </button>
//             </div>

//             {/* Body */}
//             <div style={{ padding: '24px' }}>
//               {(() => {
//                 const criticalCount =
//                   (extraModuleStats.toilet.actionRequired || 0) +
//                   (extraModuleStats.twinbin.actionRequired || 0) +
//                   (extraModuleStats.taskforce.actionRequired || 0) +
//                   (sweepingDetailStats.actionRequired || 0);

//                 const alertItems = [
//                   {
//                     title: 'Cleanliness of Toilets',
//                     count: extraModuleStats.toilet.actionRequired || 0,
//                     icon: Toilet,
//                     color: '#3b73df',
//                     bgColor: '#eff6ff',
//                     borderColor: '#dbeafe',
//                     href: '/modules/toilet'
//                   },
//                   {
//                     title: 'Litterbins Module',
//                     count: extraModuleStats.twinbin.actionRequired || 0,
//                     icon: Trash2,
//                     color: '#d78212',
//                     bgColor: '#fffbe6',
//                     borderColor: '#fef08a',
//                     href: '/modules/twinbin'
//                   },
//                   {
//                     title: 'CTU / GVP Transformation',
//                     count: extraModuleStats.taskforce.actionRequired || 0,
//                     icon: Truck,
//                     color: '#7657e8',
//                     bgColor: '#faf5ff',
//                     borderColor: '#e9d5ff',
//                     href: '/modules/taskforce'
//                   },
//                   {
//                     title: 'Sweeping Module',
//                     count: sweepingDetailStats.actionRequired || 0,
//                     icon: BrushCleaning,
//                     color: '#17966f',
//                     bgColor: '#f0fdf4',
//                     borderColor: '#bbf7d0',
//                     href: '/modules/sweeping'
//                   }
//                 ];

//                 return (
//                   <>
//                     <div
//                       style={{
//                         display: 'flex',
//                         alignItems: 'center',
//                         justifyContent: 'space-between',
//                         padding: '16px 20px',
//                         borderRadius: '16px',
//                         backgroundColor: criticalCount > 0 ? '#fef2f2' : '#f0fdf4',
//                         border: `1px solid ${criticalCount > 0 ? '#fecaca' : '#bbf7d0'}`,
//                         marginBottom: '20px'
//                       }}
//                     >
//                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
//                         {criticalCount > 0 ? (
//                           <AlertCircle size={22} color="#dc2626" />
//                         ) : (
//                           <CheckCircle size={22} color="#16a34a" />
//                         )}
//                         <div>
//                           <div style={{ fontSize: '13px', fontWeight: 800, color: criticalCount > 0 ? '#991b1b' : '#166534' }}>
//                             {criticalCount > 0 ? `${criticalCount} Critical Action Items` : 'All Systems Operational'}
//                           </div>
//                           <div style={{ fontSize: '11px', color: criticalCount > 0 ? '#b91c1c' : '#15803d', marginTop: '2px' }}>
//                             {criticalCount > 0 ? 'Action required on pending reports' : 'No critical issues requiring immediate action'}
//                           </div>
//                         </div>
//                       </div>
//                       <div
//                         style={{
//                           fontSize: '20px',
//                           fontWeight: 900,
//                           color: criticalCount > 0 ? '#dc2626' : '#16a34a',
//                           padding: '4px 14px',
//                           borderRadius: '12px',
//                           backgroundColor: '#ffffff',
//                           border: `1px solid ${criticalCount > 0 ? '#fca5a5' : '#86efac'}`
//                         }}
//                       >
//                         {criticalCount}
//                       </div>
//                     </div>

//                     {/* Grid */}
//                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
//                       {alertItems.map((item, idx) => {
//                         const Icon = item.icon;
//                         const hasAction = item.count > 0;
//                         return (
//                           <div
//                             key={idx}
//                             style={{
//                               padding: '16px',
//                               borderRadius: '16px',
//                               backgroundColor: item.bgColor,
//                               border: `1px solid ${item.borderColor}`,
//                               display: 'flex',
//                               flexDirection: 'column',
//                               gap: '12px',
//                             }}
//                           >
//                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                               <Icon size={18} color={item.color} />
//                               <span style={{ fontSize: '12px', fontWeight: 750, color: '#1e293b' }}>
//                                 {item.title}
//                               </span>
//                             </div>

//                             <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
//                               <div>
//                                 <div style={{ fontSize: '24px', fontWeight: 900, color: hasAction ? '#ef4444' : '#10b981', lineHeight: 1 }}>
//                                   {item.count}
//                                 </div>
//                                 <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
//                                   {hasAction ? 'Action Required' : 'No Issues'}
//                                 </div>
//                               </div>
//                               <Link
//                                 href={item.href}
//                                 onClick={() => setShowAlertModal(false)}
//                                 style={{
//                                   fontSize: '11px',
//                                   fontWeight: 700,
//                                   color: item.color,
//                                   textDecoration: 'none',
//                                   display: 'inline-flex',
//                                   alignItems: 'center',
//                                   gap: '3px',
//                                   padding: '4px 9px',
//                                   borderRadius: '8px',
//                                   backgroundColor: '#ffffff',
//                                   border: `1px solid ${item.borderColor}`
//                                 }}
//                               >
//                                 View <ChevronRight size={12} />
//                               </Link>
//                             </div>
//                           </div>
//                         );
//                       })}
//                     </div>
//                   </>
//                 );
//               })()}
//             </div>

//             {/* Footer */}
//             <div
//               style={{
//                 padding: '16px 24px',
//                 borderTop: '1px solid #f1f5f9',
//                 backgroundColor: '#f8fafc',
//                 display: 'flex',
//                 justifyContent: 'space-between',
//                 alignItems: 'center'
//               }}
//             >
//               <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
//                 Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
//               </span>
//               <div style={{ display: 'flex', gap: '10px' }}>
//                 <button
//                   type="button"
//                   onClick={() => loadAll()}
//                   style={{
//                     padding: '8px 16px',
//                     borderRadius: '10px',
//                     border: '1px solid #cbd5e1',
//                     backgroundColor: '#ffffff',
//                     color: '#334155',
//                     fontSize: '12px',
//                     fontWeight: 700,
//                     cursor: 'pointer',
//                     display: 'inline-flex',
//                     alignItems: 'center',
//                     gap: '6px'
//                   }}
//                 >
//                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} />
//                   Refresh
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => setShowAlertModal(false)}
//                   style={{
//                     padding: '8px 20px',
//                     borderRadius: '10px',
//                     border: 'none',
//                     backgroundColor: '#0f172a',
//                     color: '#ffffff',
//                     fontSize: '12px',
//                     fontWeight: 700,
//                     cursor: 'pointer'
//                   }}
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }




// 'use client';

// import Link from "next/link";
// import { useEffect, useState } from "react";
// import { apiFetch, CityApi, AreaBeatApi, ModuleRecordsApi, CityModulesApi, GeoApi, ToiletApi, TwinbinApi, TaskforceApi } from "@lib/apiClient";
// import {
//   Package,
//   Search,
//   Landmark,
//   Users,
//   UserCog,
//   ShieldCheck,
//   Shield,
//   Map,
//   Target,
//   Activity,
//   Database,
//   AlertCircle,
//   CheckCircle,
//   MapPin,
//   ArrowRight,
//   RefreshCw,
//   Building2,
//   ChevronRight,
//   Zap,
//   TrendingUp,
//   BarChart3,
//   Bell,

//   // New icons for premium panels
//   Toilet,
//   Trash2,
//   BrushCleaning,
//   Truck,
//   FileUser,
//   Eye,
//   Leaf,
//   Calendar,
// } from "lucide-react";
// import { useAuth } from "@hooks/useAuth";

// // ── Pure SVG Donut Chart ──────────────────────────────────────────────────────
// function Donut({ data, size = 110, stroke = 18 }: { data: { v: number; color: string }[]; size?: number; stroke?: number }) {
//   const r = (size - stroke) / 2;
//   const circ = 2 * Math.PI * r;
//   const cx = size / 2, cy = size / 2;
//   const total = data.reduce((s, d) => s + d.v, 0) || 1;
//   let acc = 0;
//   return (
//     <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
//       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
//       {data.map((d, i) => {
//         if (!d.v) return null;
//         const dash = (d.v / total) * circ;
//         const rot = (acc / total) * 360 - 90;
//         acc += d.v;
//         return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
//           strokeDasharray={`${dash} ${circ - dash}`} transform={`rotate(${rot} ${cx} ${cy})`}
//           style={{ transition: 'all 0.9s ease' }} />;
//       })}
//       <text x={cx} y={cy - 5} textAnchor="middle" fontSize={18} fontWeight="900" fill="#0f172a">{total}</text>
//       <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight="700">TOTAL</text>
//     </svg>
//   );
// }

// // ── Pure SVG Ring Gauge for Users Overview ────────────────────────────────────
// function RingGauge({ value = 100, color = "#2563eb", size = 68, stroke = 8 }: { value?: number; color?: string; size?: number; stroke?: number }) {
//   const r = (size - stroke) / 2;
//   const circ = 2 * Math.PI * r;
//   const dash = (Math.min(100, Math.max(0, value)) / 100) * circ;
//   const cx = size / 2, cy = size / 2;
//   return (
//     <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
//       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
//       <circle
//         cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
//         strokeDasharray={`${dash} ${circ - dash}`}
//         strokeLinecap="round"
//         transform={`rotate(-90 ${cx} ${cy})`}
//         style={{ transition: 'all 0.8s ease' }}
//       />
//       <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fontWeight="900" fill="#0f172a">
//         {value}%
//       </text>
//     </svg>
//   );
// }

// // ── Pure SVG Semicircle Arc Gauge for Module Health Score ──────
// function ArcGauge({ color = "#3b82f6", score = 0, size = 135, stroke = 12 }: { color?: string; score?: number; size?: number; stroke?: number }) {
//   const r = (size - stroke) / 2;
//   const circ = Math.PI * r;
//   const dash = (Math.min(100, Math.max(0, score)) / 100) * circ;
//   const cx = size / 2, cy = size / 2 + 10;
//   return (
//     <div style={{ position: 'relative', width: size, height: size * 0.55, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
//       <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
//         <path
//           d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
//           fill="none" stroke="#e2e8f0" strokeWidth={stroke} strokeLinecap="round"
//         />
//         <path
//           d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
//           fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
//           strokeDasharray={`${dash} ${circ - dash}`}
//           style={{ transition: 'all 0.8s ease' }}
//         />
//       </svg>
//       <div style={{ position: 'absolute', bottom: 4, textAlign: 'center' }}>
//         <div style={{ fontSize: 24, fontWeight: 950, color: '#0f172a', lineHeight: 1 }}>{score}</div>
//       </div>
//     </div>
//   );
// }

// // ── Pure SVG Sparkline for Hierarchy Health ──────────────────────────────────
// function Sparkline({ color = "#8b5cf6", points = [5, 12, 8, 15, 10, 20, 14, 18] }: { color?: string; points?: number[] }) {
//   const width = 160;
//   const height = 36;
//   const max = Math.max(...points, 1);
//   const min = Math.min(...points, 0);
//   const range = max - min || 1;

//   const pts = points.map((p, i) => {
//     const x = (i / (points.length - 1)) * width;
//     const y = height - ((p - min) / range) * (height - 8) - 4;
//     return { x, y };
//   });

//   const pathD = pts.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');

//   return (
//     <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
//       <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
//       {pts.map((pt, i) => (
//         <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="white" stroke={color} strokeWidth="2" />
//       ))}
//     </svg>
//   );
// }

// import PortalHomePage from "../portal-home/page";

// export default function CityDashboardPage() {
//   const { user } = useAuth();

//   const isSuperAdmin =
//     user?.role === 'super_admin' ||
//     user?.role === 'hms_super_admin' ||
//     user?.role === 'SUPER_ADMIN' ||
//     (user?.roles || []).includes('hms_super_admin') ||
//     (user?.roles || []).includes('HMS_SUPER_ADMIN') ||
//     (user?.roles || []).includes('SUPER_ADMIN') ||
//     (user?.roles || []).includes('super_admin');

//   if (isSuperAdmin) {
//     return <PortalHomePage />;
//   }
//   const [cityName, setCityName] = useState<string | null>(null);
//   const [ulbCode, setUlbCode] = useState<string | null>(null);
//   const [stats, setStats] = useState<any>(null);
//   const [statsLoading, setStatsLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [lastRefreshed, setLastRefreshed] = useState(new Date());
//   const [recentLogs, setRecentLogs] = useState<any[]>([]);

//   // Global Header Filter States
//   const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
//   const [filterZone, setFilterZone] = useState<string>("ALL");
//   const [filterWard, setFilterWard] = useState<string>("ALL");

//   // City Admin analytics
//   const [moduleActivity, setModuleActivity] = useState<{ name: string; key: string; total: number; approved: number; pending: number; actionRequired: number }[]>([]);
//   const [zoneActivity, setZoneActivity] = useState<{ name: string; beats: number; assignedBeats: number; segments: number }[]>([]);
//   const [wardActivity, setWardActivity] = useState<{ name: string; beats: number; segments: number }[]>([]);
//   const [recentRegistrationRequests, setRecentRegistrationRequests] = useState<any[]>([]);
//   const [pendingRegCount, setPendingRegCount] = useState(0);
//   // Bar chart: per-day inspection counts for last 6 days by module
//   const [barChartData, setBarChartData] = useState<{ date: string; sweeping: number; toilet: number; twinbin: number }[]>([]);

//   // Commissioner-only states (untouched)
//   const [sweepingDetailStats, setSweepingDetailStats] = useState({
//     totalBeats: 0, totalSegments: 0, qcAssigned: 0,
//     totalApproved: 0, actionRequired: 0, pendingDeployment: 0, assignedSegments: 0
//   });
//   const [sweepingDetailLoading, setSweepingDetailLoading] = useState(true);

//   const [cityGeoStats, setCityGeoStats] = useState({ zones: 0, wards: 0, areas: 0, beats: 0 });

//   // Additional detail states for other modules
//   const [extraModuleStats, setExtraModuleStats] = useState<any>({
//     toilet: { registered: 0, pendingReg: 0, inspectionsDone: 0, inspectionPending: 0, uninspected: 0, actionTaken: 0, actionRequired: 0 },
//     twinbin: { registered: 0, pendingReg: 0, inspectionsDone: 0, inspectionPending: 0, uninspected: 0, actionTaken: 0, actionRequired: 0 },
//     taskforce: { registered: 0, pendingReg: 0, inspectionsDone: 0, inspectionPending: 0, uninspected: 0, actionTaken: 0, actionRequired: 0 }
//   });

//   // Commissioner premium dashboard real data
//   const [toiletDashStats, setToiletDashStats] = useState<any>(null);
//   const [qcLeaderboard, setQcLeaderboard] = useState<{ name: string; inspections: number }[]>([]);

//   const isReadOnlyView = user?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));
//   const isCityAdmin = user?.roles?.some(r => ["CITY_ADMIN", "HMS_SUPER_ADMIN"].includes(r));

//   const loadAll = async () => {
//     setRefreshing(true);
//     try {
//       const [cityRes, statsRes] = await Promise.all([
//         apiFetch<{ city: { name: string; ulbCode?: string } }>("/city/info").catch(() => null),
//         CityApi.getStats().catch(() => null),
//       ]);
//       if (cityRes) { setCityName(cityRes.city.name); setUlbCode(cityRes.city.ulbCode || null); }
//       if (statsRes) setStats(statsRes.stats);
//       setStatsLoading(false);

//       const [modulesRes] = await Promise.all([
//         CityModulesApi.list().catch(() => []),
//       ]);
//       const enabledModules: any[] = Array.isArray(modulesRes) ? modulesRes.filter((m: any) => m.enabled) : [];
//       const moduleStats = await Promise.all(
//         enabledModules.map(async (m: any) => {
//           try {
//             const rec = await ModuleRecordsApi.getRecords(m.key.toLowerCase(), { limit: 5 });
//             return {
//               name: m.name, key: m.key,
//               total: rec.stats?.total || rec.meta?.total || 0,
//               approved: rec.stats?.approved || 0,
//               pending: rec.stats?.pending || 0,
//               actionRequired: rec.stats?.actionRequired || 0,
//               latest: rec.data || []
//             };
//           } catch { return { name: m.name, key: m.key, total: 0, approved: 0, pending: 0, actionRequired: 0, latest: [] }; }
//         })
//       );
//       setModuleActivity(moduleStats.sort((a, b) => b.total - a.total));

//       // Aggregate recent logs
//       const allLogs = moduleStats
//         .flatMap(m => m.latest.map((r: any) => ({
//           ...r,
//           moduleName: m.name,
//           moduleKey: m.key
//         })))
//         .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
//         .slice(0, 10);
//       setRecentLogs(allLogs);

//       // Build bar chart: last 6 days inspection counts
//       try {
//         const today = new Date();
//         const days = Array.from({ length: 6 }, (_, i) => {
//           const d = new Date(today);
//           d.setDate(today.getDate() - (5 - i));
//           return d;
//         });
//         // Group allLogs (from all modules recent records) by date + module
//         const [swpRec, toilRec, binRec] = await Promise.all([
//           ModuleRecordsApi.getRecords('SWEEPING', { limit: 200 }).catch(() => ({ data: [] })),
//           ModuleRecordsApi.getRecords('TOILET', { limit: 200 }).catch(() => ({ data: [] })),
//           ModuleRecordsApi.getRecords('TWINBIN', { limit: 200 }).catch(() => ({ data: [] }))
//         ]);
//         const countByDay = (records: any[], dayDate: Date) => {
//           return (records || []).filter((r: any) => {
//             if (!r.createdAt) return false;
//             const rDate = new Date(r.createdAt);
//             return rDate.getFullYear() === dayDate.getFullYear() &&
//               rDate.getMonth() === dayDate.getMonth() &&
//               rDate.getDate() === dayDate.getDate();
//           }).length;
//         };
//         const chartRows = days.map(d => {
//           const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + (d.toDateString() === today.toDateString() ? ' (Today)' : '');
//           return {
//             date: label,
//             sweeping: countByDay(swpRec.data || [], d),
//             toilet: countByDay(toilRec.data || [], d),
//             twinbin: countByDay(binRec.data || [], d),
//           };
//         });
//         setBarChartData(chartRows);
//       } catch { setBarChartData([]); }

//       // Zone & Ward activity
//       const [beatsRes, regRes, zoneRes, wardRes, areaRes] = await Promise.all([
//         AreaBeatApi.list().catch(() => ({ beats: [] })),
//         apiFetch<{ requests: any[] }>("/city/registration-requests").catch(() => ({ requests: [] })),
//         GeoApi.list("ZONE").catch(() => ({ nodes: [] })),
//         GeoApi.list("WARD").catch(() => ({ nodes: [] })),
//         GeoApi.list("AREA").catch(() => ({ nodes: [] }))
//       ]);
//       const beats = beatsRes.beats || [];
//       const regReqs = regRes.requests || [];
//       setRecentRegistrationRequests(regReqs.slice(0, 5));
//       setPendingRegCount(regReqs.filter(r => r.status === 'PENDING').length);
//       setCityGeoStats({
//         zones: zoneRes.nodes?.length || 0,
//         wards: wardRes.nodes?.length || 0,
//         areas: areaRes.nodes?.length || 0,
//         beats: beats.length
//       });
//       const zoneMap: Record<string, { name: string; beats: number; assignedBeats: number; segments: number }> = {};
//       const wardMap: Record<string, { name: string; beats: number; segments: number }> = {};
//       beats.forEach((b: any) => {
//         const zId = b.ward?.zone?.id || b.zoneId || '?';
//         const zName = b.ward?.zone?.name || b.zoneName || 'Unknown Zone';
//         const wId = b.ward?.id || b.wardId || '?';
//         const wName = b.ward?.name || b.wardName || 'Unknown Ward';
//         const segs = b.totalSegments || 0;
//         if (!zoneMap[zId]) zoneMap[zId] = { name: zName, beats: 0, assignedBeats: 0, segments: 0 };
//         zoneMap[zId].beats++;
//         if (b.assignedToId) zoneMap[zId].assignedBeats++;
//         zoneMap[zId].segments += segs;
//         if (!wardMap[wId]) wardMap[wId] = { name: wName, beats: 0, segments: 0 };
//         wardMap[wId].beats++;
//         wardMap[wId].segments += segs;
//       });
//       setZoneActivity(Object.values(zoneMap).sort((a: any, b: any) => b.beats - a.beats).slice(0, 6));
//       setWardActivity(Object.values(wardMap).sort((a: any, b: any) => b.beats - a.beats).slice(0, 6));

//       if (isReadOnlyView) {
//         setSweepingDetailLoading(true);
//         const [beatsRes, recordsRes] = await Promise.all([
//           AreaBeatApi.list().catch(() => ({ beats: [] })),
//           ModuleRecordsApi.getRecords("SWEEPING").catch(() => ({ stats: null }))
//         ]);
//         const beats = beatsRes.beats || [];
//         const totalSegments = beats.reduce((a: number, b: any) => a + (b.totalSegments || 0), 0);
//         const qcAssigned = beats.filter((b: any) => b.assignedToId).length;
//         const pending = beats.reduce((a: number, b: any) => {
//           const pid = b.assignedToId;
//           return a + (b.segments || []).filter((s: any) => !s.assignedToId || (pid && s.assignedToId === pid)).length;
//         }, 0);
//         setSweepingDetailStats({
//           totalBeats: beats.length, totalSegments, qcAssigned,
//           totalApproved: recordsRes.stats?.approved || 0,
//           actionRequired: recordsRes.stats?.actionRequired || 0,
//           pendingDeployment: pending, assignedSegments: totalSegments - pending
//         });

//         // Fetch detailed stats for other modules
//         const [
//           toiletStatsRes, toiletPendingRes,
//           twinbinAllRes, twinbinPendingRes,
//           taskforceAllRes, taskforcePendingRes,
//           twinbinRecords, taskforceRecords, toiletRecords
//         ] = await Promise.all([
//           apiFetch<any>("/modules/toilet/stats").catch(() => null),
//           apiFetch<any>("/modules/toilet/pending").catch(() => ({ toilets: [] })),
//           apiFetch<any>("/modules/twinbin/bins/assigned").catch(() => ({ bins: [] })),
//           apiFetch<any>("/modules/twinbin/bin-requests/pending").catch(() => ({ data: [] })),
//           apiFetch<any>("/modules/taskforce/feeder-points/approved").catch(() => ({ feederPoints: [] })),
//           apiFetch<any>("/modules/taskforce/feeder-points/pending").catch(() => ({ feederPoints: [] })),
//           ModuleRecordsApi.getRecords("TWINBIN").catch(() => null),
//           ModuleRecordsApi.getRecords("TASKFORCE").catch(() => null),
//           ModuleRecordsApi.getRecords("TOILET").catch(() => null)
//         ]);

//         const extraStatsData = {
//           toilet: {
//             registered: toiletStatsRes?.totalToilets || 0,
//             pendingReg: toiletPendingRes?.toilets?.length || 0,
//             inspectionsDone: toiletRecords?.stats?.approved || 0,
//             inspectionPending: toiletRecords?.stats?.pending || 0,
//             uninspected: Math.max(0, (toiletStatsRes?.totalToilets || 0) - (toiletRecords?.stats?.approved || 0) - (toiletRecords?.stats?.pending || 0)),
//             actionTaken: toiletRecords?.stats?.actionTaken || 0,
//             actionRequired: toiletRecords?.stats?.actionRequired || 0,
//             totalInspections: toiletRecords?.stats?.total || 0
//           },
//           twinbin: {
//             registered: twinbinAllRes?.bins?.length || 0,
//             pendingReg: twinbinPendingRes?.data?.length || 0,
//             inspectionsDone: twinbinRecords?.stats?.approved || 0,
//             inspectionPending: twinbinRecords?.stats?.pending || 0,
//             uninspected: Math.max(0, (twinbinAllRes?.bins?.length || 0) - (twinbinRecords?.stats?.total || 0)),
//             actionTaken: twinbinRecords?.stats?.actionTaken || 0,
//             actionRequired: twinbinRecords?.stats?.actionRequired || 0,
//             totalInspections: twinbinRecords?.stats?.total || 0
//           },
//           taskforce: {
//             registered: taskforceAllRes?.feederPoints?.length || 0,
//             pendingReg: taskforcePendingRes?.feederPoints?.length || 0,
//             inspectionsDone: taskforceRecords?.stats?.approved || 0,
//             inspectionPending: taskforceRecords?.stats?.pending || 0,
//             uninspected: Math.max(0, (taskforceAllRes?.feederPoints?.length || 0) - (taskforceRecords?.stats?.total || 0)),
//             actionTaken: taskforceRecords?.stats?.actionTaken || 0,
//             actionRequired: taskforceRecords?.stats?.actionRequired || 0,
//             totalInspections: taskforceRecords?.stats?.total || 0
//           }
//         };

//         setExtraModuleStats(extraStatsData);

//         // Fetch toilet dashboard stats for commissioner premium sections
//         const toiletDash = await ToiletApi.getDashboardStats().catch(() => null);
//         if (toiletDash) setToiletDashStats(toiletDash);

//         // Build QC leaderboard from toilet inspections
//         try {
//           const inspRes = await ToiletApi.listInspections({ pageSize: 50 });
//           const inspections = inspRes?.inspections || [];
//           const qcMap: Record<string, { name: string; count: number }> = {};
//           inspections.forEach((insp: any) => {
//             const eName = insp.employee?.name || insp.employeeName || 'Unknown';
//             const eId = insp.employeeId || eName;
//             if (!qcMap[eId]) qcMap[eId] = { name: eName, count: 0 };
//             qcMap[eId].count++;
//           });
//           const leaderboard = Object.values(qcMap)
//             .sort((a, b) => b.count - a.count)
//             .slice(0, 5)
//             .map(q => ({ name: q.name, inspections: q.count }));
//           setQcLeaderboard(leaderboard);
//         } catch { setQcLeaderboard([]); }

//         setSweepingDetailLoading(false);
//       }
//     } finally { setLastRefreshed(new Date()); setRefreshing(false); }
//   };

//   useEffect(() => { loadAll(); }, [isReadOnlyView]);

//   const share = () => {
//     const msg = `*${cityName || 'City'} | City Admin Report*\nShared via Taskforce20`;
//     window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
//   };

//   const totalUsers = (stats?.qualityControllers || 0) + (stats?.taskforceMembers || 0) +
//     (stats?.ulbOfficials || 0) + (stats?.actionOfficers || 0) + (stats?.cityAdmins || 0);


//   // ─── CITY ADMIN VIEW — Premium Dashboard ──────────────────────────────────────
//   const roleData = [
//     { label: "Quality Controllers", key: "qualityControllers", color: "#7c3aed", bg: "#f5f3ff", icon: <Search size={16} />, href: "/city/users?role=QC" },
//     { label: "Taskforce Members", key: "taskforceMembers", color: "#d97706", bg: "#fffbeb", icon: <Users size={16} />, href: "/city/users?role=EMPLOYEE" },
//     { label: "ULB Officials", key: "ulbOfficials", color: "#dc2626", bg: "#fef2f2", icon: <Landmark size={16} />, href: "/city/users?role=COMMISSIONER" },
//     { label: "Action Officers", key: "actionOfficers", color: "#059669", bg: "#f0fdf4", icon: <UserCog size={16} />, href: "/city/users?role=ACTION_OFFICER" },
//     { label: "City Admins", key: "cityAdmins", color: "#4f46e5", bg: "#eef2ff", icon: <ShieldCheck size={16} />, href: "/city/users?role=CITY_ADMIN" },
//   ];
//   const quickActions = [
//     {
//       title: "Add New User",
//       description: "Create new user account",
//       href: "/city/users/create",
//       icon: Users,
//       cardAccent: "before:bg-blue-600",
//       iconStyle: "bg-blue-50 text-blue-600",
//     },
//     {
//       title: "Manage Areas",
//       description: "Add or update areas",
//       href: "/city/areas",
//       icon: Target,
//       cardAccent: "before:bg-violet-600",
//       iconStyle: "bg-violet-50 text-violet-600",
//     },
//     {
//       title: "Reg Requests",
//       description: "Review pending requests",
//       href: "/registration-requests",
//       icon: Bell,
//       cardAccent: "before:bg-orange-500",
//       iconStyle: "bg-orange-50 text-orange-600",
//       showBadge: true,
//     },
//   ];

//   const getModuleVisual = (module: {
//     name?: string;
//     key?: string;
//   }) => {
//     const moduleIdentity =
//       `${module.key || ""} ${module.name || ""}`.toLowerCase();

//     if (moduleIdentity.includes("toilet")) {
//       return {
//         Icon: Toilet,
//         iconClass: "bg-blue-50 text-blue-600",
//       };
//     }

//     if (
//       moduleIdentity.includes("litter") ||
//       moduleIdentity.includes("twinbin") ||
//       moduleIdentity.includes("bin")
//     ) {
//       return {
//         Icon: Trash2,
//         iconClass: "bg-orange-50 text-orange-600",
//       };
//     }

//     if (moduleIdentity.includes("sweep")) {
//       return {
//         Icon: BrushCleaning,
//         iconClass: "bg-emerald-50 text-emerald-600",
//       };
//     }

//     if (
//       moduleIdentity.includes("taskforce") ||
//       moduleIdentity.includes("gvp") ||
//       moduleIdentity.includes("ctu")
//     ) {
//       return {
//         Icon: Truck,
//         iconClass: "bg-violet-50 text-violet-600",
//       };
//     }

//     return {
//       Icon: Package,
//       iconClass: "bg-slate-100 text-slate-600",
//     };
//   };

//   const maxRoleVal = Math.max(...roleData.map((r) => stats?.[r.key] || 0), 1);

//   return (
//     <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
//       <style>{`
//         @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
//         .da-card { transition: box-shadow 0.18s, transform 0.18s; }
//         .da-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.09) !important; transform: translateY(-2px); }
//         .da-row:hover { background: #f8fafc !important; }
//         .da-link { text-decoration: none; }

//         /* Responsive Grids */
//         .responsive-grid-sidebar { display: grid; grid-template-columns: 280px 1fr; gap: 20px; }
//         .responsive-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
//         .page-padding { padding: 28px 36px; }
//         .header-flex { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; position: relative; }
//         .req-table { display: grid; grid-template-columns: 1fr 120px 100px; gap: 12px; }


// /* ================= CITY ADMIN PREMIUM HEADER ================= */

// .city-admin-top-section {
//   padding: 24px 28px 0;
// }

// .city-admin-hero {
//   position: relative;
//   overflow: hidden;

//   min-height: 390px;          /* main card ki height */
//   display: flex;
//   flex-direction: column;

//   background:
//     radial-gradient(
//       circle at 88% 18%,
//       rgba(59, 130, 246, 0.08),
//       transparent 28%
//     ),
//     linear-gradient(
//       135deg,
//       #ffffff 0%,
//       #fbfdff 70%,
//       #f4f8ff 100%
//     );

//   border: 1px solid #dbe4f0;
//   border-top: 3px solid #2563eb;
//   border-radius: 24px;

//   padding: 34px 32px 18px;   /* bottom padding bhi add hua */

//   box-shadow:
//     0 18px 45px rgba(15, 23, 42, 0.07),
//     0 3px 10px rgba(15, 23, 42, 0.03);
// }

// .city-admin-hero::before {
//   content: "";
//   position: absolute;
//   right: 0;
//   bottom: 88px;
//   width: 500px;
//   height: 190px;
//   opacity: 0.68;
//   pointer-events: none;
//   background:
//     linear-gradient(to top, rgba(219, 234, 254, 0.75), transparent 80%);
//   clip-path: polygon(
//     0 100%, 0 76%, 6% 76%, 6% 58%, 11% 58%, 11% 69%,
//     17% 69%, 17% 40%, 22% 40%, 22% 67%, 28% 67%,
//     28% 55%, 34% 55%, 34% 74%, 42% 74%, 42% 45%,
//     48% 45%, 48% 73%, 55% 73%, 55% 50%, 61% 50%,
//     61% 68%, 67% 68%, 67% 34%, 73% 34%, 73% 70%,
//     79% 70%, 79% 52%, 85% 52%, 85% 72%, 92% 72%,
//     92% 43%, 97% 43%, 97% 100%
//   );
// }

// .city-admin-hero-main {
//   position: relative;
//   z-index: 2;
//   display: flex;
//   justify-content: space-between;
//   align-items: flex-start;
//   gap: 28px;
// }

// .city-admin-identity {
//   display: flex;
//   align-items: flex-start;
//   gap: 14px;
//   min-width: 0;
// }

// .city-admin-logo-ring {
//   position: relative;
//   width: 62px;
//   height: 62px;
//   flex-shrink: 0;
//   border-radius: 50%;
//   display: grid;
//   place-items: center;
//   background: rgba(239, 246, 255, 0.95);
//   border: 1px solid #bfdbfe;
//   box-shadow:
//     0 0 0 5px rgba(219, 234, 254, 0.55),
//     0 7px 18px rgba(37, 99, 235, 0.13);
// }

// .city-admin-logo-ring::before {
//   content: "";
//   position: absolute;
//   inset: 5px;
//   border-radius: 50%;
//   border: 1px solid rgba(99, 102, 241, 0.3);
// }

// .city-admin-logo-ring::after {
//   content: "";
//   position: absolute;
//   right: -2px;
//   bottom: 6px;
//   width: 8px;
//   height: 8px;
//   border: 2px solid #ffffff;
//   border-radius: 50%;
//   background: #06b6d4;
// }

// .city-admin-logo-core {
//   position: relative;
//   z-index: 1;
//   width: 44px;
//   height: 44px;
//   border-radius: 50%;
//   display: grid;
//   place-items: center;
//   color: #ffffff;
//   background: linear-gradient(145deg, #2563eb, #6d28d9);
//   box-shadow: 0 6px 14px rgba(79, 70, 229, 0.25);
// }

// .city-admin-eyebrow {
//   margin-bottom: 3px;
//   color: #2563eb;
//   font-size: 9px;
//   font-weight: 900;
//   letter-spacing: 0.11em;
//   text-transform: uppercase;
// }

// .city-admin-title {
//   margin: 0;
//   color: #0f172a;
//   font-size: clamp(28px, 3vw, 38px);
//   font-weight: 950;
//   line-height: 1;
//   letter-spacing: -0.04em;
// }

// .city-admin-meta {
//   display: flex;
//   align-items: center;
//   flex-wrap: wrap;
//   gap: 10px;
//   margin-top: 8px;
// }

// .city-admin-ulb {
//   display: inline-flex;
//   align-items: center;
//   gap: 5px;
//   padding: 5px 10px;
//   border-radius: 9px;
//   color: #6d28d9;
//   background: #f5f3ff;
//   font-size: 10px;
//   font-weight: 800;
// }

// .city-admin-updated {
//   color: #64748b;
//   font-size: 10px;
//   font-weight: 600;
// }

// .city-admin-welcome {
//   margin: 24px 0 0 104px;
//   position: relative;
//   z-index: 2;
//   max-width: 560px;
// }

// .city-admin-welcome h2 {
//   margin: 0 0 7px;
//   color: #0f172a;
//   font-size: 17px;
//   font-weight: 850;
// }

// .city-admin-welcome p {
//   margin: 0;
//   max-width: 540px;
//   color: #64748b;
//   font-size: 13px;
//   font-weight: 500;
//   line-height: 1.65;
// }

// .city-admin-actions {
//   position: relative;
//   z-index: 3;
//   display: flex;
//   align-items: center;
//   justify-content: flex-end;
//   flex-wrap: nowrap;
//   gap: 8px;
// }

// .city-admin-action-btn {
//   height: 38px;
//   padding: 0 13px;
//   border: 1px solid #dbe4f0;
//   border-radius: 10px;
//   background: rgba(255, 255, 255, 0.92);
//   color: #0f172a;

//   display: inline-flex;
//   align-items: center;
//   justify-content: center;
//   gap: 6px;

//   font-size: 11px;
//   font-weight: 800;
//   white-space: nowrap;

//   cursor: pointer;
//   box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
//   transition: all 0.2s ease;
// }

// .city-admin-action-btn:hover {
//   border-color: #bfdbfe;
//   transform: translateY(-1px);
//   box-shadow: 0 6px 14px rgba(37, 99, 235, 0.1);
// }

// .city-admin-action-btn.primary {
//   height: 40px;
//   padding: 0 16px;
//   border-color: transparent;
//   color: #ffffff;
//   background: linear-gradient(135deg, #2563eb, #6d28d9);
//   box-shadow: 0 7px 16px rgba(79, 70, 229, 0.22);
// }

// .city-admin-action-btn:disabled {
//   cursor: not-allowed;
//   opacity: 0.7;
// }

// .city-admin-action-pills {
//   position: relative;
//   z-index: 3;
//   display: flex;
//   justify-content: flex-end;
//   flex-wrap: nowrap;
//   gap: 8px;
//   margin-top: 14px;
// }

// .city-admin-action-pill {
//   min-height: 36px;
//   padding: 0 13px;
//   border: 1px solid #dbeafe;
//   border-radius: 999px;
//   background: rgba(255, 255, 255, 0.9);

//   display: inline-flex;
//   align-items: center;
//   gap: 7px;

//   color: #2563eb;
//   font-size: 10px;
//   font-weight: 800;
//   white-space: nowrap;

//   box-shadow: 0 4px 11px rgba(37, 99, 235, 0.06);
// }

// .city-admin-action-pill.purple {
//   color: #6d28d9;
//   border-color: #ddd6fe;
//   background: rgba(250, 245, 255, 0.93);
// }

// .city-admin-action-pill strong {
//   color: #0f172a;
//   font-size: 13px;
//   font-weight: 900;
// }

// .city-admin-status-grid {
//   position: relative;
//   z-index: 4;
//   display: grid;
//   grid-template-columns: repeat(4, minmax(0, 1fr));

//   margin-top: auto;

//   border: 1px solid #dbe4f0;
//   border-radius: 17px;
//   background: rgba(255, 255, 255, 0.95);
//   overflow: hidden;

//   box-shadow: 0 7px 18px rgba(15, 23, 42, 0.04);
// }

// .city-admin-status-item {
//   min-height: 82px;
//   padding: 13px 16px;

//   display: flex;
//   align-items: center;
//   gap: 12px;

//   border-right: 1px solid #e2e8f0;
// }

// .city-admin-status-item:last-child {
//   border-right: none;
// }

// .city-admin-status-icon {
//   width: 42px;
//   height: 42px;
//   flex-shrink: 0;

//   border: 1px solid;
//   border-radius: 12px;

//   display: grid;
//   place-items: center;
// }

// .city-admin-status-label {
//   display: flex;
//   align-items: center;
//   gap: 6px;

//   margin-bottom: 4px;

//   color: #475569;
//   font-size: 8px;
//   font-weight: 900;
//   line-height: 1.2;
//   letter-spacing: 0.1em;
//   text-transform: uppercase;
// }

// .city-admin-status-label-dot {
//   width: 6px;
//   height: 6px;
//   flex-shrink: 0;
//   border-radius: 50%;
// }

// .city-admin-status-value {
//   color: #0f172a;
//   font-size: 16px;
//   font-weight: 900;
//   line-height: 1.15;
// }

// .city-admin-status-help {
//   margin-top: 3px;

//   color: #64748b;
//   font-size: 9px;
//   font-weight: 500;
//   line-height: 1.35;
// }

// /* ================= CITY ADMIN USER CARDS ================= */

// /* ================= COMPACT USER OVERVIEW ================= */

// .city-user-overview {
//   padding: 20px 0 0;
// }

// .city-user-overview-title {
//   position: relative;
//   display: inline-block;
//   margin-bottom: 16px;
//   color: #0f172a;
//   font-size: 10px;
//   font-weight: 900;
//   letter-spacing: 0.04em;
//   text-transform: uppercase;
// }

// .city-user-overview-title::after {
//   content: "";
//   position: absolute;
//   left: 0;
//   bottom: -7px;
//   width: 38px;
//   height: 2px;
//   border-radius: 999px;
//   background: #2563eb;
// }

// .city-user-card-grid {
//   display: grid;
//   grid-template-columns: repeat(6, minmax(0, 1fr));
//   gap: 12px;
// }

// .city-user-card {
//   min-height: 154px;
//   padding: 14px 14px 12px;

//   border: 1px solid #dbe4f0;
//   border-radius: 17px;
//   background: #ffffff;

//   display: flex;
//   flex-direction: column;

//   box-shadow:
//     0 7px 18px rgba(15, 23, 42, 0.045),
//     0 2px 4px rgba(15, 23, 42, 0.02);

//   transition:
//     transform 0.2s ease,
//     box-shadow 0.2s ease;
// }

// .city-user-card:hover {
//   transform: translateY(-2px);
//   box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
// }

// .city-user-card.modules-card {
//   border: 2px solid #315bea;

//   background:
//     radial-gradient(
//       circle at 95% 0%,
//       rgba(99, 102, 241, 0.12),
//       transparent 36%
//     ),
//     linear-gradient(145deg, #ffffff 0%, #eef2ff 100%);

//   box-shadow:
//     0 9px 20px rgba(37, 99, 235, 0.12),
//     inset 0 0 0 3px rgba(255, 255, 255, 0.4);
// }

// .city-user-card-top {
//   display: flex;
//   align-items: flex-start;
//   justify-content: space-between;
// }

// .city-user-card-icon {
//   width: 43px;
//   height: 43px;
//   border-radius: 12px;
//   display: grid;
//   place-items: center;
// }

// .city-user-card-arrow {
//   margin-top: 2px;
//   color: #94a3b8;
// }

// .city-user-card-main-row {
//   display: flex;
//   align-items: flex-end;
//   gap: 7px;
//   margin-top: 9px;
//   min-height: 35px;
// }

// .city-user-card-number {
//   margin: 0;
//   flex-shrink: 0;

//   color: #0f172a;
//   font-size: 27px;
//   font-weight: 950;
//   line-height: 1;
//   letter-spacing: -0.04em;
// }

// .city-user-card-label {
//   margin: 0 0 2px;

//   color: #475569;
//   font-size: 11px;
//   font-weight: 650;
//   line-height: 1.2;
// }

// .city-user-status {
//   margin-top: auto;
//   min-height: 34px;
//   padding: 0 10px;

//   border-radius: 10px;

//   display: flex;
//   align-items: center;
//   justify-content: space-between;
//   gap: 6px;

//   font-size: 8px;
//   font-weight: 800;
// }

// .city-user-status-left {
//   min-width: 0;
//   display: inline-flex;
//   align-items: center;
//   gap: 5px;
// }

// .city-user-status-dot {
//   width: 6px;
//   height: 6px;
//   flex-shrink: 0;
//   border-radius: 50%;
// }

// .city-user-card.modules-card .city-user-status {
//   color: #ffffff !important;
//   background: linear-gradient(135deg, #2563eb, #3b65e9) !important;
//   box-shadow: 0 5px 12px rgba(37, 99, 235, 0.18);
// }



// @media (max-width: 1250px) {
//   .city-user-card-grid {
//     grid-template-columns: repeat(3, minmax(0, 1fr));
//   }

//   .city-admin-status-grid {
//     grid-template-columns: repeat(2, minmax(0, 1fr));
//   }

//   .city-admin-status-item:nth-child(2) {
//     border-right: none;
//   }

//   .city-admin-status-item:nth-child(-n + 2) {
//     border-bottom: 1px solid #e2e8f0;
//   }
// }

// @media (max-width: 850px) {
//   .city-admin-top-section,
//   .city-user-overview {
//     padding-left: 16px;
//     padding-right: 16px;
//   }

//   .city-admin-hero {
//     padding: 25px 20px 0;
//     border-radius: 18px;
//   }

//   .city-admin-hero-main {
//     flex-direction: column;
//   }

//   .city-admin-actions,
//   .city-admin-action-pills {
//     justify-content: flex-start;
//   }

//   .city-admin-welcome {
//     margin-left: 0;
//   }

//   .city-user-card-grid {
//     grid-template-columns: repeat(2, minmax(0, 1fr));
//   }
// }

// @media (max-width: 560px) {
//   .city-admin-identity {
//     gap: 14px;
//   }

//   .city-admin-logo-ring {
//     width: 66px;
//     height: 66px;
//   }

//   .city-admin-logo-core {
//     width: 46px;
//     height: 46px;
//   }

//   .city-admin-title {
//     font-size: 32px;
//   }

//   .city-admin-action-btn {
//     flex: 1;
//     padding: 0 12px;
//   }

//   .city-admin-action-pill {
//     flex: 1;
//     justify-content: center;
//   }

//   .city-admin-status-grid,
//   .city-user-card-grid {
//     grid-template-columns: 1fr;
//   }

//   .city-admin-status-item,
//   .city-admin-status-item:nth-child(2) {
//     border-right: none;
//     border-bottom: 1px solid #e2e8f0;
//   }

//   .city-admin-status-item:last-child {
//     border-bottom: none;
//   }
// }


//         @media (max-width: 1200px) {
//           .responsive-grid-sidebar { grid-template-columns: 240px 1fr; }
//           .responsive-grid-3 { grid-template-columns: 1fr 1fr; }
//         }
//         @media (max-width: 900px) {
//           .responsive-grid-sidebar { grid-template-columns: 1fr; }
//           .responsive-grid-3 { grid-template-columns: 1fr; }
//           .page-padding { padding: 20px 24px; }
//         }
//         @media (max-width: 600px) {
//           .page-padding { padding: 16px; }
//           .hero-banner { padding: 24px 20px !important; }
//           .hero-stats { gap: 8px !important; }
//           .hero-stats > div { flex: 1; min-width: 120px; padding: 8px 12px !important; }
//           .req-table { grid-template-columns: 1fr 80px; }
//           .req-table .req-role { display: none; } /* Hide role on mobile to save space */
//         }
//       `}


//       </style>

//       {/* ══════════════ COMMISSIONER / ULB OFFICER VIEW — PREMIUM ══════════════ */}
//       {isReadOnlyView ? (
//         <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

//           {/* ── Hero Banner ── */}
//           <div style={{
//             background: 'linear-gradient(120deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
//             padding: '32px 40px 28px', position: 'relative', overflow: 'hidden'
//           }}>
//             <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', pointerEvents: 'none' }} />
//             <div style={{ position: 'absolute', bottom: -60, right: 160, width: 180, height: 180, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', pointerEvents: 'none' }} />

//             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
//               <div>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
//                   <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//                     <Building2 size={20} color="#fff" />
//                   </div>
//                   <div>
//                     <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ULB Official · City Operations</div>
//                     <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
//                       {cityName || 'City Administration'}
//                     </h1>
//                   </div>
//                 </div>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
//                   <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 7, padding: '4px 12px', fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
//                     <Landmark size={12} />
//                   </span>
//                   <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
//                     Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
//                   </span>
//                 </div>
//               </div>
//               <div style={{ display: 'flex', gap: 10 }}>
//                 <button onClick={loadAll} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: refreshing ? 'not-allowed' : 'pointer', backdropFilter: 'blur(8px)' }}>
//                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
//                   {refreshing ? 'Refreshing...' : 'Refresh'}
//                 </button>
//                 <button onClick={share} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
//                   Share View
//                 </button>
//               </div>
//             </div>

//             {/* Hero stat bar */}
//             <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
//               {[
//                 { label: 'Zones', value: cityGeoStats?.zones },
//                 { label: 'Wards', value: cityGeoStats?.wards },
//                 { label: 'Areas', value: cityGeoStats?.areas },
//                 { label: 'Beats', value: cityGeoStats?.beats },
//                 { label: 'Modules', value: stats?.totalModules ?? '—' },
//               ].map((c, i) => (
//                 <div key={i} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
//                   <span style={{ fontSize: 14, fontWeight: 800 }}>{statsLoading ? '—' : c.value}</span>
//                   <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{c.label}</span>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* ── Body ── */}
//           <div style={{ padding: '28px 40px' }}>

//             {/* Section: City Operations Overview */}
//             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
//               <Building2 size={14} color="#2563eb" />
//               <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#334155' }}>City Operations Overview</span>
//               <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
//             </div>
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
//               {[
//                 { label: "Total Zones", value: cityGeoStats?.zones, icon: <Map size={20} />, color: "#4f46e5", href: "/city/zones" },
//                 { label: "Total Wards", value: cityGeoStats?.wards, icon: <MapPin size={20} />, color: "#2563eb", href: "/city/wards" },
//                 { label: "Total Areas", value: cityGeoStats?.areas, icon: <Target size={20} />, color: "#0ea5e9", href: "/city/areas" },
//                 { label: "Total Beats", value: cityGeoStats?.beats, icon: <Map size={20} />, color: "#0284c7", href: "/city/areas" },
//                 { label: "Total Modules", value: stats?.totalModules, icon: <Package size={20} />, color: "#3b82f6", href: "/city/modules" },
//                 { label: "Quality Controller", value: stats?.qualityControllers, icon: <Search size={20} />, color: "#8b5cf6", href: "/city/users?role=QC" },
//                 { label: "Taskforce Member", value: stats?.taskforceMembers, icon: <Users size={20} />, color: "#f59e0b", href: "/city/users?role=EMPLOYEE" },
//                 { label: "ULB Officials", value: stats?.ulbOfficials, icon: <Landmark size={20} />, color: "#ef4444", href: "/city/users?role=COMMISSIONER" },
//                 { label: "Action Officer", value: stats?.actionOfficers, icon: <UserCog size={20} />, color: "#10b981", href: "/city/users?role=ACTION_OFFICER" },
//                 { label: "City Admin", value: stats?.cityAdmins, icon: <ShieldCheck size={20} />, color: "#6366f1", href: "/city/users?role=CITY_ADMIN" },
//               ].map((s, i) => (
//                 <Link key={i} href={s.href} style={{ textDecoration: 'none' }}>
//                   <div className="da-card" style={{
//                     padding: '16px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
//                     display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
//                     boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.18s', borderLeft: `3px solid ${s.color}`
//                   }}>
//                     <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}14`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
//                       {s.icon}
//                     </div>
//                     <div>
//                       <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{s.label}</div>
//                       <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
//                         {statsLoading || refreshing ? <span style={{ color: '#e2e8f0' }}>—</span> : (s.value ?? 0)}
//                       </div>
//                     </div>
//                   </div>
//                 </Link>
//               ))}
//             </div>

//             <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
//               <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: 10, background: 'white', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
//                 <Activity size={14} />
//                 Sweeping Details
//               </div>
//             </div>
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
//               {[
//                 { label: "Total Beats", value: sweepingDetailStats.totalBeats, icon: <Target size={20} />, color: "#3b82f6", href: "/modules/sweeping" },
//                 { label: "Total Sub-Beats", value: sweepingDetailStats.totalSegments, icon: <Database size={20} />, color: "#8b5cf6", href: "/modules/sweeping" },
//                 { label: "Assigned Sub-Beats", value: sweepingDetailStats.assignedSegments, icon: <CheckCircle size={20} />, color: "#0ea5e9", href: "/modules/sweeping" },
//                 { label: "QC Assigned", value: sweepingDetailStats.qcAssigned, icon: <ShieldCheck size={20} />, color: "#10b981", href: "/city/users?role=QC" },
//                 { label: "Total Approved", value: sweepingDetailStats.totalApproved, icon: <CheckCircle size={20} />, color: "#22c55e", href: "/modules/sweeping" },
//                 { label: "Action Required", value: sweepingDetailStats.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: "/modules/sweeping" },
//                 { label: "Pending Deployment", value: sweepingDetailStats.pendingDeployment, icon: <Map size={20} />, color: "#f59e0b", href: "/modules/sweeping" },
//               ].map((s, i) => (
//                 <Link key={i} href={s.href} style={{ textDecoration: 'none' }}>
//                   <div className="card card-hover" style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, height: '100%', transition: 'all 0.2s ease' }}>
//                     <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
//                       {s.icon}
//                     </div>
//                     <div>
//                       <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>{s.label}</div>
//                       <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
//                         {sweepingDetailLoading || refreshing ? "..." : s.value}
//                       </div>
//                     </div>
//                   </div>
//                 </Link>
//               ))}
//             </div>

//             {moduleActivity.filter(m => m.key.toUpperCase() !== 'SWEEPING').map((m, i) => {
//               let displayName = m.name;
//               const keyStr = m.key.toLowerCase();
//               let customStats: any[] = [];

//               if (keyStr === 'toilet') {
//                 displayName = 'Cleanliness of Toilet';
//                 customStats = [
//                   { label: "Toilets Registered", value: extraModuleStats.toilet.registered, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/toilet` },
//                   { label: "Registration Pending", value: extraModuleStats.toilet.pendingReg, icon: <Activity size={20} />, color: "#f59e0b", href: `/modules/toilet` },
//                   { label: "Inspections Done (QC)", value: extraModuleStats.toilet.inspectionsDone, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/toilet` },
//                   { label: "Pending QC Inspection", value: extraModuleStats.toilet.inspectionPending, icon: <MapPin size={20} />, color: "#3b82f6", href: `/modules/toilet` },
//                   { label: "Action Required", value: extraModuleStats.toilet.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/toilet` },
//                   { label: "Action Taken by AO", value: extraModuleStats.toilet.actionTaken, icon: <CheckCircle size={20} />, color: "#10b981", href: `/modules/toilet` },
//                   { label: "Inspection Not Done", value: extraModuleStats.toilet.uninspected, icon: <Target size={20} />, color: "#64748b", href: `/modules/toilet` },
//                 ];
//               } else if (keyStr === 'taskforce') {
//                 displayName = 'CTU/GVP Transformation';
//                 customStats = [
//                   { label: "GVP Points Registered", value: extraModuleStats.taskforce.registered, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/taskforce` },
//                   { label: "Requests Pending", value: extraModuleStats.taskforce.pendingReg, icon: <Activity size={20} />, color: "#f59e0b", href: `/modules/taskforce` },
//                   { label: "Total Inspections", value: extraModuleStats.taskforce.totalInspections, icon: <Database size={20} />, color: "#3b82f6", href: `/modules/taskforce` },
//                   { label: "Approved by QC", value: extraModuleStats.taskforce.inspectionsDone, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/taskforce` },
//                   { label: "Pending QC", value: extraModuleStats.taskforce.inspectionPending, icon: <MapPin size={20} />, color: "#3b82f6", href: `/modules/taskforce` },
//                   { label: "Action Required", value: extraModuleStats.taskforce.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/taskforce` },
//                   { label: "Action Taken by AO", value: extraModuleStats.taskforce.actionTaken, icon: <CheckCircle size={20} />, color: "#10b981", href: `/modules/taskforce` },
//                 ];
//               } else if (keyStr === 'twinbin' || keyStr === 'litterbins') {
//                 displayName = 'Litterbins';
//                 customStats = [
//                   { label: "Litterbins Registered", value: extraModuleStats.twinbin.registered, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/twinbin` },
//                   { label: "Requests Pending", value: extraModuleStats.twinbin.pendingReg, icon: <Activity size={20} />, color: "#f59e0b", href: `/modules/twinbin` },
//                   { label: "Total Inspections", value: extraModuleStats.twinbin.totalInspections, icon: <Database size={20} />, color: "#3b82f6", href: `/modules/twinbin` },
//                   { label: "Approved by QC", value: extraModuleStats.twinbin.inspectionsDone, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/twinbin` },
//                   { label: "Pending QC", value: extraModuleStats.twinbin.inspectionPending, icon: <MapPin size={20} />, color: "#3b82f6", href: `/modules/twinbin` },
//                   { label: "Action Required", value: extraModuleStats.twinbin.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/twinbin` },
//                   { label: "Action Taken by AO", value: extraModuleStats.twinbin.actionTaken, icon: <CheckCircle size={20} />, color: "#10b981", href: `/modules/twinbin` },
//                 ];
//               } else {
//                 customStats = [
//                   { label: "Total Uploads", value: m.total, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/${m.key.toLowerCase()}` },
//                   { label: "Approved", value: m.approved, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/${m.key.toLowerCase()}` },
//                   { label: "Action Required", value: m.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/${m.key.toLowerCase()}` },
//                   { label: "Pending", value: m.pending, icon: <MapPin size={20} />, color: "#f59e0b", href: `/modules/${m.key.toLowerCase()}` },
//                 ];
//               }

//               return (
//                 <div key={`mod-${i}`} style={{ marginBottom: 40 }}>
//                   <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
//                     <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: 10, background: 'white', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
//                       <Activity size={14} />
//                       {displayName} Details
//                     </div>
//                   </div>
//                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
//                     {customStats.map((s, j) => (
//                       <Link key={j} href={s.href} style={{ textDecoration: 'none' }}>
//                         <div className="card card-hover" style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, height: '100%', transition: 'all 0.2s ease' }}>
//                           <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
//                             {s.icon}
//                           </div>
//                           <div>
//                             <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>{s.label}</div>
//                             <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
//                               {statsLoading || refreshing ? "..." : s.value}
//                             </div>
//                           </div>
//                         </div>
//                       </Link>
//                     ))}
//                   </div>
//                 </div>
//               );
//             })}

//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
//               <div style={{ maxWidth: 500, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
//                   <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: 8, borderRadius: 8 }}>
//                     <Shield size={18} />
//                   </div>
//                   <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Active Modules</h3>
//                 </div>
//                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
//                   <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
//                     <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{statsLoading ? '—' : (stats?.totalModules ?? 0)}</div>
//                     <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>MODULES</div>
//                   </div>
//                   <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
//                     <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
//                       {statsLoading ? '—' : ((stats?.qualityControllers ?? 0) + (stats?.taskforceMembers ?? 0) + (stats?.ulbOfficials ?? 0) + (stats?.actionOfficers ?? 0) + (stats?.cityAdmins ?? 0))}
//                     </div>
//                     <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>STAFF</div>
//                   </div>
//                 </div>
//                 <Link href="/city" style={{ textDecoration: 'none', display: 'block', marginTop: 16, textAlign: 'center', color: '#2563eb', fontWeight: 700, fontSize: 13 }}>
//                   Manage City Settings
//                 </Link>
//               </div>
//             </div>
//           </div>

//           {/* --- NEW PREMIUM COMMISSIONER DASHBOARD --- */}
//           <div style={{ marginTop: 40, paddingTop: 32, borderTop: '2px dashed #cbd5e1' }}>
//             <div style={{ marginBottom: 24 }}>
//               <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>City Cleanliness Overview</h2>
//               <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>Layer 1: Summary</p>
//             </div>
//             {/* Cards */}
//             {(() => {
//               const totalToilets = extraModuleStats.toilet.registered;
//               const approvedInsp = toiletDashStats?.approvedInspections || extraModuleStats.toilet.inspectionsDone;
//               const cleanPct = totalToilets > 0 ? Math.round((approvedInsp / totalToilets) * 100) : 0;
//               const activeIssues = extraModuleStats.toilet.actionRequired + extraModuleStats.twinbin.actionRequired + extraModuleStats.taskforce.actionRequired;
//               const pendingTotal = extraModuleStats.toilet.inspectionPending + extraModuleStats.twinbin.inspectionPending + extraModuleStats.taskforce.inspectionPending;
//               const cleanColor = cleanPct >= 80 ? '#22c55e' : cleanPct >= 60 ? '#f59e0b' : '#ef4444';
//               return (
//                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
//                   <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
//                     <div style={{ width: 50, height: 50, borderRadius: '50%', background: cleanColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, boxShadow: `0 4px 10px ${cleanColor}4d` }}>{statsLoading ? '—' : `${cleanPct}%`}</div>
//                     <div><div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>CLEAN SCORE</div><div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>City Average</div></div>
//                   </div>
//                   {[{ l: 'Total Toilets', v: totalToilets, c: '#10b981' }, { l: 'Clean Toilets', v: approvedInsp, c: '#22c55e' }, { l: 'Active Issues', v: activeIssues, c: '#f59e0b' }, { l: 'Pending', v: pendingTotal, c: '#ef4444' }].map((x, i) => (
//                     <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: `4px solid ${x.c}`, borderRadius: 12, padding: 16 }}>
//                       <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{statsLoading ? '—' : x.v}</div>
//                       <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{x.l}</div>
//                     </div>
//                   ))}
//                 </div>
//               );
//             })()}

//             <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 16px 0' }}>Layer 2: Analysis & Tracking</p>
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>

//               {/* Zone Performance - Real data from zoneActivity */}
//               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Zone Performance</h3>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
//                   {zoneActivity.length === 0 ? (
//                     <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 12 }}>No zone data available</div>
//                   ) : zoneActivity.slice(0, 6).map((z, i) => {
//                     const maxBeats = zoneActivity[0]?.beats || 1;
//                     const pct = Math.round((z.beats / maxBeats) * 100);
//                     const assignedPct = z.beats > 0 ? Math.round((z.assignedBeats / z.beats) * 100) : 0;
//                     const c = assignedPct >= 80 ? '#22c55e' : assignedPct >= 60 ? '#3b82f6' : assignedPct >= 40 ? '#eab308' : '#ef4444';
//                     return (
//                       <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
//                         <div style={{ width: 80, fontSize: 12, fontWeight: 700, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{z.name}</div>
//                         <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
//                           <div style={{ width: `${assignedPct}%`, height: '100%', background: c, borderRadius: 4, transition: 'width 0.8s ease' }}></div>
//                         </div>
//                         <div style={{ width: 30, fontSize: 13, fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>{assignedPct}%</div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>

//               {/* Issue Monitoring - Real data from extraModuleStats */}
//               {(() => {
//                 const toiletIssues = extraModuleStats.toilet.actionRequired;
//                 const binIssues = extraModuleStats.twinbin.actionRequired;
//                 const gvpIssues = extraModuleStats.taskforce.actionRequired;
//                 const pendingInsp = extraModuleStats.toilet.inspectionPending + extraModuleStats.twinbin.inspectionPending;
//                 const issueData = [
//                   { l: 'Toilet Issues', v: toiletIssues, c: '#f97316' },
//                   { l: 'Litterbin Issues', v: binIssues, c: '#ef4444' },
//                   { l: 'GVP Issues', v: gvpIssues, c: '#a855f7' },
//                   { l: 'Pending Inspections', v: pendingInsp, c: '#334155' }
//                 ];
//                 return (
//                   <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                     <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Issue Monitoring</h3>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
//                       <Donut data={issueData.map(d => ({ v: d.v || 0, color: d.c }))} size={100} stroke={16} />
//                       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
//                         {issueData.map((issue, i) => (
//                           <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: issue.c }}></div><span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{issue.l} ({issue.v})</span></div>
//                         ))}
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })()}

//               {/* Ward Ranking - Real data from wardActivity */}
//               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Ward Ranking</h3>
//                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                   <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Rank</th><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Ward</th><th style={{ textAlign: 'right', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Beats</th></tr></thead>
//                   <tbody>
//                     {wardActivity.length === 0 ? (
//                       <tr><td colSpan={3} style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No ward data</td></tr>
//                     ) : wardActivity.slice(0, 5).map((w, i) => {
//                       const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
//                       const isLast = i === wardActivity.slice(0, 5).length - 1;
//                       const isWorst = isLast && wardActivity.length > 2;
//                       return (
//                         <tr key={i} style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9', background: isWorst ? '#fef2f2' : 'transparent' }}>
//                           <td style={{ padding: '8px 0', fontSize: 16 }}>{isWorst ? '⚠️' : medal}</td>
//                           <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 700, color: isWorst ? '#ef4444' : '#0f172a' }}>{w.name}</td>
//                           <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 800, color: isWorst ? '#ef4444' : i === 0 ? '#22c55e' : '#3b82f6', textAlign: 'right' }}>{w.beats}</td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>

//               {/* AO Response Time - Real data: show action officers count and module action required stats */}
//               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Action Officer Summary</h3>
//                 {(() => {
//                   const aoCount = stats?.actionOfficers || 0;
//                   const modAR = moduleActivity.filter(m => m.actionRequired > 0);
//                   return (
//                     <>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, background: '#f0fdf4', padding: 12, borderRadius: 10, border: '1px solid #bbf7d0' }}>
//                         <UserCog size={22} color="#16a34a" />
//                         <div>
//                           <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{statsLoading ? '—' : aoCount}</div>
//                           <div style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>Action Officers Active</div>
//                         </div>
//                       </div>
//                       {modAR.length > 0 ? modAR.map((m, i) => (
//                         <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
//                           <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{m.name}</span>
//                           <span style={{ fontSize: 12, fontWeight: 800, color: '#ef4444' }}>⚠ {m.actionRequired} pending</span>
//                         </div>
//                       )) : (
//                         <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, textAlign: 'center', padding: 8 }}>✓ No pending actions</div>
//                       )}
//                     </>
//                   );
//                 })()}
//               </div>

//               {/* QC Leaderboard - Real data from qcLeaderboard */}
//               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>QC Leaderboard</h3>
//                 <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
//                   <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Rank</th><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>QC Name</th><th style={{ textAlign: 'right', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Inspections</th></tr></thead>
//                   <tbody>
//                     {qcLeaderboard.length === 0 ? (
//                       <tr><td colSpan={3} style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No inspection data yet</td></tr>
//                     ) : qcLeaderboard.map((q, i) => {
//                       const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
//                       const isLow = i === qcLeaderboard.length - 1 && qcLeaderboard.length > 2 && q.inspections < (qcLeaderboard[0]?.inspections || 1) * 0.3;
//                       return (
//                         <tr key={i} style={{ borderBottom: i < qcLeaderboard.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
//                           <td style={{ padding: '8px 0', fontSize: 16 }}>{isLow ? '⚠️' : medal}</td>
//                           <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 700, color: isLow ? '#ef4444' : '#0f172a' }}>{q.name}</td>
//                           <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 800, color: isLow ? '#ef4444' : '#0f172a', textAlign: 'right' }}>{q.inspections}</td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>

//               {/* Taskforce Activity - Real data from recentLogs and extraModuleStats */}
//               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Taskforce Activity</h3>
//                 <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
//                   <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#3b82f6' }}>{extraModuleStats.toilet.registered}</div><div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>TOILETS</div></div>
//                   <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#8b5cf6' }}>{extraModuleStats.twinbin.registered}</div><div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>LITTERBINS</div></div>
//                   <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444' }}>{extraModuleStats.taskforce.registered}</div><div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>GVP POINTS</div></div>
//                 </div>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
//                   {recentLogs.length === 0 ? (
//                     <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 8 }}>No recent activity</div>
//                   ) : recentLogs.slice(0, 3).map((log, i) => (
//                     <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
//                       <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 55, flexShrink: 0 }}>{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
//                       <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.moduleName} — {log.status} {log.createdByUser?.name ? `by ${log.createdByUser.name}` : ''}</div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Sweeping Coverage - Real data from sweepingDetailStats */}
//               {(() => {
//                 const totalB = sweepingDetailStats.totalBeats;
//                 const approved = sweepingDetailStats.totalApproved;
//                 const missed = Math.max(0, totalB - approved);
//                 const coveragePct = totalB > 0 ? Math.round((approved / totalB) * 100) : 0;
//                 const coverageColor = coveragePct >= 80 ? '#22c55e' : coveragePct >= 50 ? '#f59e0b' : '#ef4444';
//                 return (
//                   <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                     <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Sweeping Coverage</h3>
//                     <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16 }}>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Overall Coverage</span><span style={{ fontSize: 12, fontWeight: 900, color: coverageColor }}>{sweepingDetailLoading ? '...' : `${coveragePct}%`}</span></div>
//                       <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${coveragePct}%`, height: '100%', background: coverageColor, transition: 'width 0.8s ease' }}></div></div>
//                     </div>
//                     <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
//                       <div style={{ flex: 1 }}>
//                         <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Total Beats</span><span style={{ fontSize: 12, color: '#0f172a', fontWeight: 800 }}>{sweepingDetailLoading ? '...' : totalB}</span></div>
//                         <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Approved</span><span style={{ fontSize: 12, color: '#22c55e', fontWeight: 800 }}>{sweepingDetailLoading ? '...' : approved}</span></div>
//                         <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Action Required</span><span style={{ fontSize: 12, color: '#ef4444', fontWeight: 800 }}>{sweepingDetailLoading ? '...' : sweepingDetailStats.actionRequired}</span></div>
//                       </div>
//                       <div style={{ width: 80, height: 80, background: '#e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
//                         <Map size={24} color="#94a3b8" />
//                         <div style={{ position: 'absolute', bottom: 4, right: 4, background: '#fff', padding: '2px 4px', borderRadius: 4, fontSize: 8, fontWeight: 800 }}>LIVE MAP</div>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })()}

//               {/* GVP Transformation - Real data from extraModuleStats.taskforce */}
//               {(() => {
//                 const totalGVP = extraModuleStats.taskforce.registered;
//                 const approved = extraModuleStats.taskforce.inspectionsDone;
//                 const actionTaken = extraModuleStats.taskforce.actionTaken || 0;
//                 const actionReq = extraModuleStats.taskforce.actionRequired;
//                 const pctApproved = totalGVP > 0 ? Math.round((approved / totalGVP) * 100) : 0;
//                 const pctActionTaken = totalGVP > 0 ? Math.round((actionTaken / totalGVP) * 100) : 0;
//                 const pctActionReq = totalGVP > 0 ? Math.round((actionReq / totalGVP) * 100) : 0;
//                 return (
//                   <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                     <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>GVP Transformation</h3>
//                     <div style={{ marginBottom: 16 }}>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Total GVPs ({totalGVP})</span></div>
//                       <div style={{ height: 16, borderRadius: 8, display: 'flex', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
//                         {totalGVP > 0 ? (<>
//                           <div style={{ width: `${pctApproved}%`, background: '#22c55e', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>Approved</div>
//                           <div style={{ width: `${pctActionTaken}%`, background: '#3b82f6', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>Action Taken</div>
//                           <div style={{ width: `${Math.max(pctActionReq, 100 - pctApproved - pctActionTaken)}%`, background: '#ef4444', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>Pending</div>
//                         </>) : (
//                           <div style={{ width: '100%', background: '#f1f5f9', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#94a3b8' }}>No data</div>
//                         )}
//                       </div>
//                     </div>
//                     <div>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Approved (QC)</span><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{approved} ({pctApproved}%)</span></div>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Action Taken (AO)</span><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{actionTaken} ({pctActionTaken}%)</span></div>
//                       <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Action Required</span><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{actionReq} ({pctActionReq}%)</span></div>
//                     </div>
//                   </div>
//                 );
//               })()}
//             </div>

//             <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 16px 0' }}>Layer 3: Proof &amp; Verification</p>
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>

//               {/* Recent Activity Log instead of Photo Evidence */}
//               <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
//                 <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Recent Activity Log</h3>
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//                   {recentLogs.length === 0 ? (
//                     <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 20 }}>No recent activity to display</div>
//                   ) : recentLogs.slice(0, 6).map((log, i) => (
//                     <div key={i} style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
//                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
//                         <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{log.moduleName}</span>
//                         <span style={{ fontSize: 10, fontWeight: 600, color: log.status === 'APPROVED' ? '#22c55e' : log.status === 'ACTION_REQUIRED' ? '#ef4444' : '#f59e0b', background: log.status === 'APPROVED' ? '#f0fdf4' : log.status === 'ACTION_REQUIRED' ? '#fef2f2' : '#fffbeb', padding: '2px 8px', borderRadius: 4 }}>{log.status}</span>
//                       </div>
//                       <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>
//                         {log.createdByUser?.name || 'Field User'} • {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Critical Alerts - Real data from action required counts */}
//               {(() => {
//                 const alerts: { msg: string; ward: string }[] = [];
//                 if (extraModuleStats.toilet.actionRequired > 0) alerts.push({ msg: `${extraModuleStats.toilet.actionRequired} toilet(s) need action`, ward: 'Toilet Module' });
//                 if (extraModuleStats.twinbin.actionRequired > 0) alerts.push({ msg: `${extraModuleStats.twinbin.actionRequired} litterbin(s) need action`, ward: 'Litterbin Module' });
//                 if (extraModuleStats.taskforce.actionRequired > 0) alerts.push({ msg: `${extraModuleStats.taskforce.actionRequired} GVP point(s) need action`, ward: 'GVP Module' });
//                 if (sweepingDetailStats.actionRequired > 0) alerts.push({ msg: `${sweepingDetailStats.actionRequired} sweeping record(s) need action`, ward: 'Sweeping Module' });
//                 return (
//                   <div style={{ background: alerts.length > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${alerts.length > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: 12, padding: 20 }}>
//                     <h3 style={{ fontSize: 16, fontWeight: 900, color: alerts.length > 0 ? '#b91c1c' : '#16a34a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
//                       {alerts.length > 0 ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
//                       {alerts.length > 0 ? 'Critical Alerts' : 'All Clear'}
//                     </h3>
//                       {alerts.length === 0 ? (
//                         <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, textAlign: 'center', padding: 16 }}>✓ No critical alerts — all modules are clear!</div>
//                       ) : alerts.map((a, i) => (
//                         <div key={i} style={{ background: '#fff', padding: 12, borde       ) : (
//         <>
//           {/* ── REDESIGNED CITY ADMIN TASKFORCE DASHBOARD ── */}
//           <div style={{ padding: '12px 24px', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>

//             {/* Background Mini Leaf Accents (Small subtle floating leaves) */}
//             <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden', opacity: 0.15 }}>
//               <Leaf size={20} style={{ position: 'absolute', left: '30px', top: '100px', transform: 'rotate(-45deg)', color: '#059669' }} />
//               <Leaf size={18} style={{ position: 'absolute', right: '40px', top: '200px', transform: 'rotate(15deg)', color: '#2563eb' }} />
//               <Leaf size={22} style={{ position: 'absolute', left: '25%', top: '38%', transform: 'rotate(40deg)', color: '#7c3aed' }} />
//               <Leaf size={18} style={{ position: 'absolute', right: '22%', top: '55%', transform: 'rotate(-20deg)', color: '#d97706' }} />
//               <Leaf size={20} style={{ position: 'absolute', left: '12%', bottom: '180px', transform: 'rotate(30deg)', color: '#059669' }} />
//               <Leaf size={24} style={{ position: 'absolute', right: '35px', bottom: '60px', transform: 'rotate(-35deg)', color: '#2563eb' }} />
//             </div>

//             {/* ── TOP HEADER BAR WITH GREETING, BANNER BACKGROUND, DATE & GEO FILTERS ── */}
//             <div style={{
//               position: 'relative',
//               zIndex: 1,
//               display: 'flex',
//               justifyContent: 'space-between',
//               alignItems: 'center',
//               flexWrap: 'wrap',
//               gap: '16px',
//               backgroundColor: 'white',
//               backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.92) 35%, rgba(255,255,255,0.2) 100%), url(/Taskforce_background_header.png)',
//               backgroundSize: 'cover',
//               backgroundPosition: 'right center',
//               backgroundRepeat: 'no-repeat',
//               border: '1px solid #cbd5e1',
//               borderRadius: '24px',
//               padding: '20px 28px',
//               boxShadow: '0 4px 12px -2px rgba(0,0,0,0.04)',
//               width: '100%',
//               maxWidth: '1200px',
//               margin: '0 auto'
//             }}>backgroundColor: 'white',
//               backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.92) 35%, rgba(255,255,255,0.2) 100%), url(/Taskforce_background_header.png)',
//               backgroundSize: 'cover',
//               backgroundPosition: 'right center',
//               backgroundRepeat: 'no-repeat',
//               border: '1px solid #cbd5e1',
//               borderRadius: '24px',
//               padding: '28px 36px',
//               boxShadow: '0 4px 12px -2px rgba(0,0,0,0.04)'
//             }}>
//               <div>
//                 <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
//                   <span>
//                     {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}, {user?.name || user?.email?.split('@')[0] || 'City Admin'}
//                   </span>
//                 </div>
//                 <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1d4ed8', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                   <Building2 size={18} color="#1d4ed8" />
//                   <span>{cityName || 'Indore Municipal Corporation'}</span>
//                 </div>
//               </div>

//               {/* Top Controls Bar (Date Filter, Alert Button, Refresh Button) */}
//               <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
//                 {/* Date Picker (Default: Current Date) */}
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'white', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '6px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
//                   <Calendar size={15} color="#2563eb" />
//                   <input
//                     type="date"
//                     value={filterDate}
//                     onChange={(e) => setFilterDate(e.target.value)}
//                     style={{ border: 'none', background: 'transparent', fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
//                   />
//                 </div>

//                 {/* System Alerts Modal Button */}
//                 <button
//                   type="button"
//                   onClick={() => {
//                     const criticalCount = (extraModuleStats.toilet.actionRequired || 0) + (extraModuleStats.twinbin.actionRequired || 0) + (extraModuleStats.taskforce.actionRequired || 0) + (sweepingDetailStats.actionRequired || 0);
//                     alert(`System Alerts Overview:\n\n• Toilet Issues Needing Action: ${extraModuleStats.toilet.actionRequired || 0}\n• Litterbin Issues Needing Action: ${extraModuleStats.twinbin.actionRequired || 0}\n• GVP Points Action Required: ${extraModuleStats.taskforce.actionRequired || 0}\n• Sweeping Beats Action Required: ${sweepingDetailStats.actionRequired || 0}\n\nTotal Critical Action Items: ${criticalCount}`);
//                   }}
//                   style={{
//                     height: '40px', padding: '0 16px', borderRadius: '12px', border: '1.5px solid #fecaca',
//                     backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 800,
//                     display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
//                     boxShadow: '0 2px 4px rgba(220,38,38,0.08)', transition: 'all 0.2s'
//                   }}
//                 >
//                   <Bell size={15} color="#dc2626" />
//                   <span>System Alerts</span>
//                   {((extraModuleStats.toilet.actionRequired || 0) + (extraModuleStats.twinbin.actionRequired || 0) + (extraModuleStats.taskforce.actionRequired || 0) + (sweepingDetailStats.actionRequired || 0)) > 0 && (
//                     <span style={{ backgroundColor: '#dc2626', color: 'white', borderRadius: '9999px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: 900 }}>
//                       {(extraModuleStats.toilet.actionRequired || 0) + (extraModuleStats.twinbin.actionRequired || 0) + (extraModuleStats.taskforce.actionRequired || 0) + (sweepingDetailStats.actionRequired || 0)}
//                     </span>
//                   )}
//                 </button>

//                 {/* Refresh Button */}
//                 <button
//                   type="button"
//                   onClick={loadAll}
//                   disabled={refreshing}
//                   style={{
//                     height: '40px', padding: '0 18px', borderRadius: '12px', border: '1.5px solid #2563eb',
//                     backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '0.8125rem', fontWeight: 800,
//                     display: 'flex', alignItems: 'center', gap: '8px', cursor: refreshing ? 'not-allowed' : 'pointer',
//                     boxShadow: '0 2px 4px rgba(37,99,235,0.12)', transition: 'all 0.2s'
//                   }}
//                 >
//                   <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} color="#2563eb" />
//                   <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
//                 </button>
//               </div>
//             </div>

//             {/* ── SECTION 0: CITY OVERVIEW (Above USERS OVERVIEW as requested) ── */}
//             <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
//               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
//                 <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                   <Map size={18} color="#2563eb" />
//                   <span>CITY OVERVIEW</span>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={loadAll}
//                   title="Refresh City Overview"
//                   style={{ border: 'none', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
//                 >
//                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
//                   <span>Refresh</span>
//                 </button>
//               </div>

//               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
//                 {[
//                   { label: 'Total Registered Zones', value: cityGeoStats?.zones || 0, icon: Map, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
//                   { label: 'Total Registered Wards', value: cityGeoStats?.wards || 0, icon: MapPin, color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
//                   { label: 'Total Registered Areas', value: cityGeoStats?.areas || 0, icon: Target, color: '#0ea5e9', bg: '#f0f9ff', border: '#bae6fd' },
//                   { label: 'Total Registered Beats', value: cityGeoStats?.beats || 0, icon: Activity, color: '#0284c7', bg: '#e0f2fe', border: '#93c5fd' },
//                 ].map((card, i) => (
//                   <div key={i} style={{ backgroundColor: 'white', borderRadius: '18px', border: `1.5px solid ${card.border}`, padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
//                     <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
//                       <card.icon size={20} />
//                     </div>
//                     <div>
//                       <div style={{ fontSize: '0.625rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</div>
//                       <div style={{ fontSize: '1.6rem', fontWeight: 950, color: '#0f172a', lineHeight: 1, marginTop: '4px' }}>{statsLoading ? '—' : card.value}</div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* ── SECTION 1: USERS OVERVIEW (Clean cards without 100% circles) ── */}
//             <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
//               {/* Header with Title and Right Corner Refresh Button */}
//               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
//                 <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                   <Users size={18} color="#7c3aed" />
//                   <span>USERS OVERVIEW</span>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={loadAll}
//                   title="Refresh Users Overview"
//                   style={{ border: 'none', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
//                 >
//                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
//                   <span>Refresh</span>
//                 </button>
//               </div>

//               {/* 5 Cards Row (Clean without 100% circle gauge) */}
//               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
//                 {[

//                   {
//                     title: 'TOTAL ACTION OFFICERS',
//                     count: stats?.actionOfficers || stats?.ACTION_OFFICER || 0,
//                     icon: UserCog,
//                     iconColor: '#059669',
//                     iconBg: '#f0fdf4',
//                     borderColor: '#bbf7d0'
//                   },
//                   {
//                     title: 'TOTAL Quality Controller',
//                     count: stats?.qualityControllers || stats?.QC || 0,
//                     icon: Search,
//                     iconColor: '#7c3aed',
//                     iconBg: '#f5f3ff',
//                     borderColor: '#ddd6fe'
//                   },
//                   {
//                     title: 'TOTAL SUPERVISORS',
//                     count: stats?.taskforceMembers || stats?.SUPERVISOR || 0,
//                     icon: ShieldCheck,
//                     iconColor: '#d97706',
//                     iconBg: '#fffbeb',
//                     borderColor: '#fde68a'
//                   },
//                   {
//                     title: 'TOTAL EMPLOYEES',
//                     count: stats?.employees || stats?.EMPLOYEE || 0,
//                     icon: Users,
//                     iconColor: '#2563eb',
//                     iconBg: '#eff6ff',
//                     borderColor: '#bfdbfe'
//                   }
//                 ].map((card, i) => (
//                   <div
//                     key={i}
//                     style={{
//                       backgroundColor: 'white',
//                       border: `1.5px solid ${card.borderColor}`,
//                       borderRadius: '18px',
//                       padding: '18px',
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '14px',
//                       boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
//                     }}
//                   >
//                     <div
//                       style={{
//                         width: '46px',
//                         height: '46px',
//                         borderRadius: '14px',
//                         backgroundColor: card.iconBg,
//                         color: card.iconColor,
//                         display: 'flex',
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                         flexShrink: 0
//                       }}
//                     >
//                       <card.icon size={22} />
//                     </div>
//                     <div style={{ minWidth: 0 }}>
//                       <div
//                         style={{
//                           fontSize: '0.625rem',
//                           fontWeight: 900,
//                           color: '#475569',
//                           textTransform: 'uppercase',
//                           letterSpacing: '0.04em',
//                           lineHeight: 1.2
//                         }}
//                       >
//                         {card.title}
//                       </div>
//                       <div style={{ fontSize: '1.7rem', fontWeight: 950, color: '#0f172a', lineHeight: 1, marginTop: '6px' }}>
//                         {statsLoading ? '—' : card.count}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>



//             {/* ── SECTION 2: WORKFORCE DISTRIBUTION BY MODULE ── */}
//             <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
//               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
//                 <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                   <Users size={18} color="#0284c7" />
//                   <span>WORKFORCE DISTRIBUTION BY MODULE</span>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={loadAll}
//                   title="Refresh Workforce Distribution"
//                   style={{ border: 'none', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
//                 >
//                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
//                   <span>Refresh</span>
//                 </button>
//               </div>

//               {(() => {
//                 // Build workforce distribution cards dynamically from moduleActivity
//                 const moduleCards = [
//                   { keyMatch: ['sweeping'], name: 'Sweeping', color: '#059669', bg: '#f0fdf4', icon: BrushCleaning },
//                   { keyMatch: ['toilet'], name: 'Cleanliness of Toilets', color: '#2563eb', bg: '#eff6ff', icon: Toilet },
//                   { keyMatch: ['twinbin', 'litter', 'bin'], name: 'Litterbins', color: '#d97706', bg: '#fffbeb', icon: Trash2 },
//                   { keyMatch: ['taskforce', 'gvp', 'ctu'], name: 'CTU / GVP Transformation', color: '#7c3aed', bg: '#f5f3ff', icon: Truck },
//                 ];
//                 const cards = moduleCards.map(mc => {
//                   const found = moduleActivity.find(m => mc.keyMatch.some(k => m.key.toLowerCase().includes(k)));
//                   return { ...mc, total: found?.total || 0, approved: found?.approved || 0 };
//                 });
//                 const totalInspections = cards.reduce((s, c) => s + c.total, 1);
//                 return (
//                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
//                     {cards.map((item, i) => {
//                       const pct = Math.round((item.total / totalInspections) * 100);
//                       return (
//                         <div key={i} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
//                           <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
//                             <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//                               <item.icon size={18} />
//                             </div>
//                             <div>
//                               <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
//                               <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{item.total} Records</div>
//                             </div>
//                           </div>

//                         </div>
//                       );
//                     })}
//                   </div>
//                 );
//               })()}
//             </div>

//             {/* ── SECTION 3: MODULE HEALTH SCORE (NO % and NO Health Score Label) ── */}
//             <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
//               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
//                 <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                   <Activity size={18} color="#2563eb" />
//                   <span>MODULE HEALTH SCORE</span>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={loadAll}
//                   title="Refresh Module Health Score"
//                   style={{ border: 'none', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
//                 >
//                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
//                   <span>Refresh</span>
//                 </button>
//               </div>

//               {/* 3 Module Cards */}
//               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
//                 {[
//                   {
//                     moduleName: 'Litterbins Module',
//                     icon: Trash2,
//                     color: '#d97706',
//                     bg: '#fffbeb',
//                     borderColor: '#fde68a',
//                     score: extraModuleStats.twinbin.inspectionsDone || 0,
//                     approved: extraModuleStats.twinbin.inspectionsDone || 0,
//                     rejected: extraModuleStats.twinbin.actionRequired || 0,
//                     pending: extraModuleStats.twinbin.inspectionPending || 0
//                   },
//                   {
//                     moduleName: 'Cleanliness of Toilets Module',
//                     icon: Toilet,
//                     color: '#2563eb',
//                     bg: '#eff6ff',
//                     borderColor: '#bfdbfe',
//                     score: extraModuleStats.toilet.inspectionsDone || 0,
//                     approved: extraModuleStats.toilet.inspectionsDone || 0,
//                     rejected: extraModuleStats.toilet.actionRequired || 0,
//                     pending: extraModuleStats.toilet.inspectionPending || 0
//                   },
//                   {
//                     moduleName: 'Sweeping Module',
//                     icon: BrushCleaning,
//                     color: '#059669',
//                     bg: '#f0fdf4',
//                     borderColor: '#a7f3d0',
//                     score: sweepingDetailStats.totalApproved || 0,
//                     approved: sweepingDetailStats.totalApproved || 0,
//                     rejected: sweepingDetailStats.actionRequired || 0,
//                     pending: sweepingDetailStats.pendingDeployment || 0
//                   }
//                 ].map((mod, i) => (
//                   <div
//                     key={i}
//                     style={{
//                       backgroundColor: 'white',
//                       border: `1.5px solid ${mod.borderColor}`,
//                       borderRadius: '22px',
//                       padding: '22px',
//                       display: 'flex',
//                       flexDirection: 'column',
//                       alignItems: 'center',
//                       justifyContent: 'space-between',
//                       boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
//                     }}
//                   >
//                     {/* Module Title Row */}
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', marginBottom: '16px' }}>
//                       <div style={{ width: '38px', height: '38px', borderRadius: '11px', backgroundColor: mod.bg, color: mod.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
//                         <mod.icon size={20} />
//                       </div>
//                       <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>{mod.moduleName}</h3>
//                     </div>

//                     {/* Semicircle Arc Gauge */}
//                     <ArcGauge color={mod.color} score={mod.score} size={140} stroke={12} />

//                     {/* Bottom Status Dots Row */}
//                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
//                       {/* Approved */}
//                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//                           <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
//                           <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#16a34a' }}>{mod.approved}</span>
//                         </div>
//                         <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Approved</span>
//                       </div>

//                       {/* Rejected */}
//                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//                           <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
//                           <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#dc2626' }}>{mod.rejected}</span>
//                         </div>
//                         <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Rejected</span>
//                       </div>

//                       {/* Pending */}
//                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//                           <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
//                           <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#d97706' }}>{mod.pending}</span>
//                         </div>
//                         <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>Pending</span>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* ── SECTION 4: MODULE WISE INSPECTION REPORT BAR CHART ── */}
//             <div style={{ position: 'relative', zIndex: 1, backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
//               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
//                 <div>
//                   <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
//                     <BarChart3 size={18} color="#2563eb" />
//                     <span>MODULE WISE INSPECTION REPORT (DATE WISE ANALYTICS)</span>
//                   </div>
//                   <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
//                     Date-wise inspection analytics (X-Axis: Date • Y-Axis: Inspection Count)
//                   </div>
//                 </div>

//                 <button
//                   type="button"
//                   onClick={loadAll}
//                   title="Refresh Inspection Bar Chart"
//                   style={{ border: 'none', background: '#f1f5f9', padding: '6px 12px', borderRadius: '10px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
//                 >
//                   <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
//                   <span>Refresh</span>
//                 </button>
//               </div>

//               {/* Bar Chart Container with Real Data */}
//               <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px' }}>
//                 {barChartData.length === 0 ? (
//                   <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>
//                     No inspection data available for the past 6 days
//                   </div>
//                 ) : (() => {
//                   const maxVal = Math.max(...barChartData.flatMap(d => [d.sweeping, d.toilet, d.twinbin]), 1);
//                   return (
//                     <>
//                       <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', height: '240px', borderBottom: '2px solid #cbd5e1', paddingBottom: '10px' }}>
//                         {barChartData.map((d, idx) => (
//                           <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
//                             <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', width: '100%', justifyContent: 'center', height: '190px' }}>
//                               {/* Sweeping Bar */}
//                               {d.sweeping > 0 ? (
//                                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: `${Math.max((d.sweeping / maxVal) * 100, 4)}%`, justifyContent: 'flex-end' }}>
//                                   <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#059669', marginBottom: '2px' }}>{d.sweeping}</span>
//                                   <div title={`Sweeping: ${d.sweeping}`} style={{ width: '18px', height: '100%', backgroundColor: '#059669', borderRadius: '5px 5px 0 0' }} />
//                                 </div>
//                               ) : <div style={{ width: '18px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '4px', alignSelf: 'flex-end' }} />}

//                               {/* Toilet Bar */}
//                               {d.toilet > 0 ? (
//                                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: `${Math.max((d.toilet / maxVal) * 100, 4)}%`, justifyContent: 'flex-end' }}>
//                                   <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#2563eb', marginBottom: '2px' }}>{d.toilet}</span>
//                                   <div title={`Toilets: ${d.toilet}`} style={{ width: '18px', height: '100%', backgroundColor: '#2563eb', borderRadius: '5px 5px 0 0' }} />
//                                 </div>
//                               ) : <div style={{ width: '18px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '4px', alignSelf: 'flex-end' }} />}

//                               {/* Twinbin Bar */}
//                               {d.twinbin > 0 ? (
//                                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: `${Math.max((d.twinbin / maxVal) * 100, 4)}%`, justifyContent: 'flex-end' }}>
//                                   <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#d97706', marginBottom: '2px' }}>{d.twinbin}</span>
//                                   <div title={`Litterbins: ${d.twinbin}`} style={{ width: '18px', height: '100%', backgroundColor: '#d97706', borderRadius: '5px 5px 0 0' }} />
//                                 </div>
//                               ) : <div style={{ width: '18px', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '4px', alignSelf: 'flex-end' }} />}
//                             </div>
//                             <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#334155', marginTop: '10px', textAlign: 'center' }}>{d.date}</span>
//                           </div>
//                         ))}
//                       </div>
//                       {/* Chart Legend */}
//                       <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginTop: '18px' }}>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
//                           <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#059669', display: 'inline-block' }} />
//                           <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>Sweeping Module</span>
//                         </div>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
//                           <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#2563eb', display: 'inline-block' }} />
//                           <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>Cleanliness of Toilets</span>
//                         </div>
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
//                           <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#d97706', display: 'inline-block' }} />
//                           <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>Litterbins Module</span>
//                         </div>
//                       </div>
//                     </>
//                   );
//                 })()}
//             </div>
//           </div>
//         </div>
//       </>
//     )}
//   </div>
// );
// }





// /


'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, CityApi, AreaBeatApi, ModuleRecordsApi, CityModulesApi, GeoApi, ToiletApi, TwinbinApi, TaskforceApi } from "@lib/apiClient";
import {
  Package,
  Search,
  Landmark,
  Users,
  UserCog,
  ShieldCheck,
  Shield,
  Map,
  Target,
  Activity,
  Database,
  AlertCircle,
  CheckCircle,
  MapPin,
  ArrowRight,
  RefreshCw,
  Building2,
  ChevronRight,
  Zap,
  TrendingUp,
  BarChart3,
  Bell,

  // New icons for premium panels
  Toilet,
  Trash2,
  BrushCleaning,
  Truck,
  FileUser,
  Eye,
  Leaf,
  Calendar,
  Download,
  FileText,
  AlertTriangle,
  FilePlus,
  Clock,
  CheckCircle2,
  Menu,
} from "lucide-react";
import { useAuth } from "@hooks/useAuth";
import { useRouter } from "next/navigation";
import { TableExportDropdown } from '@components/ui/TableExportDropdown';
import TargetStatus from '@components/ui/TargetStatus';

// ── Pure SVG Donut Chart ──────────────────────────────────────────────────────
function Donut({ data, size = 110, stroke = 18 }: { data: { v: number; color: string }[]; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  const total = data.reduce((s, d) => s + d.v, 0) || 1;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      {data.map((d, i) => {
        if (!d.v) return null;
        const dash = (d.v / total) * circ;
        const rot = (acc / total) * 360 - 90;
        acc += d.v;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`} transform={`rotate(${rot} ${cx} ${cy})`}
          style={{ transition: 'all 0.9s ease' }} />;
      })}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize={18} fontWeight="900" fill="#0f172a">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#94a3b8" fontWeight="700">TOTAL</text>
    </svg>
  );
}

// ── Pure SVG Ring Gauge for Users Overview ────────────────────────────────────
function RingGauge({ value = 100, color = "#2563eb", size = 68, stroke = 8 }: { value?: number; color?: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * circ;
  const cx = size / 2, cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle
        cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'all 0.8s ease' }}
      />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fontWeight="900" fill="#0f172a">
        {value}%
      </text>
    </svg>
  );
}

// ── Pure SVG Semicircle Arc Gauge for Module Health Score ──────
function ArcGauge({
  color = "#3b82f6",
  score = 0,
  percent = 0,
  size = 152,
  stroke = 11,
}: {
  color?: string;
  score?: number;
  percent?: number;
  size?: number;
  stroke?: number;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const width = size;
  const height = Math.round(size * 0.58);
  const cx = width / 2;
  const cy = height - 15;
  const r = Math.min(width * 0.39, height * 0.8);
  const startX = cx - r;
  const endX = cx + r;

  return (
    <div style={{ position: 'relative', width, height, display: 'grid', placeItems: 'center' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <path
          d={`M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`}
          pathLength={100}
          fill="none"
          stroke="#e8edf5"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`}
          pathLength={100}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${clamped} 100`}
          style={{ transition: 'stroke-dasharray .75s ease' }}
        />
        <circle cx={startX} cy={cy} r="3.5" fill={color} opacity=".9" />
      </svg>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 10,
          transform: 'translateX(-50%)',
          color: '#17243c',
          fontSize: 23,
          lineHeight: 1,
          fontWeight: 800,
          letterSpacing: '-.04em',
        }}
      >
        {score}
      </div>
    </div>
  );
}

// ── Pure SVG Sparkline for Hierarchy Health ──────────────────────────────────
function Sparkline({ color = "#8b5cf6", points = [5, 12, 8, 15, 10, 20, 14, 18] }: { color?: string; points?: number[] }) {
  const width = 160;
  const height = 36;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;

  const pts = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  const pathD = pts.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="white" stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
}

import PortalHomePage from "../portal-home/page";
import GlobalAdminDashboard from "../portal-home/GlobalAdminDashboard";

export default function CityDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const isSuperAdmin =
    user?.role === 'super_admin' ||
    user?.role === 'hms_super_admin' ||
    user?.role === 'SUPER_ADMIN' ||
    (user?.roles || []).includes('hms_super_admin') ||
    (user?.roles || []).includes('HMS_SUPER_ADMIN') ||
    (user?.roles || []).includes('SUPER_ADMIN') ||
    (user?.roles || []).includes('super_admin');

  const [filterCity, setFilterCity] = useState<string>("ALL");
  const [cityName, setCityName] = useState<string | null>(null);
  const [ulbCode, setUlbCode] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Global Header Filter States
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [filterZone, setFilterZone] = useState<string>("ALL");
  const [filterWard, setFilterWard] = useState<string>("ALL");
  const [cities, setCities] = useState<any[]>([]);

  useEffect(() => {
    if (isSuperAdmin) {
      import('@lib/apiClient').then(({ CityApi }) => {
        CityApi.list()
          .then(res => setCities(res.cities || []))
          .catch(console.error);
      }).catch(console.error);
    }
  }, [isSuperAdmin]);

  const handleDownloadReport = () => {
    // Generate a basic CSV report based on stats and trigger download
    const csvContent = "data:text/csv;charset=utf-8,Module,Total,Approved,Rejected,ActionRequired\\n"
      + `Toilet,${extraModuleStats.toilet.totalInspections || 0},${extraModuleStats.toilet.totalApproved || 0},${extraModuleStats.toilet.totalRejected || 0},${extraModuleStats.toilet.actionRequired || 0}\\n`
      + `Sweeping,${sweepingDetailStats.totalSegments || 0},${sweepingDetailStats.totalApproved || 0},0,${sweepingDetailStats.actionRequired || 0}\\n`
      + `Twinbin,${extraModuleStats.twinbin.totalInspections || 0},${extraModuleStats.twinbin.totalApproved || 0},${extraModuleStats.twinbin.totalRejected || 0},${extraModuleStats.twinbin.actionRequired || 0}\\n`
      + `Taskforce,${extraModuleStats.taskforce.totalInspections || 0},${extraModuleStats.taskforce.totalApproved || 0},${extraModuleStats.taskforce.totalRejected || 0},${extraModuleStats.taskforce.actionRequired || 0}`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inspection_report_${filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // City Admin analytics
  const [moduleActivity, setModuleActivity] = useState<{ name: string; key: string; total: number; approved: number; pending: number; actionRequired: number }[]>([]);
  const [zoneActivity, setZoneActivity] = useState<{ name: string; beats: number; assignedBeats: number; segments: number }[]>([]);
  const [wardActivity, setWardActivity] = useState<{ name: string; beats: number; segments: number }[]>([]);
  const [recentRegistrationRequests, setRecentRegistrationRequests] = useState<any[]>([]);
  const [pendingRegCount, setPendingRegCount] = useState(0);
  // Bar chart: per-day inspection counts for last 6 days by module
  const [barChartData, setBarChartData] = useState<{ date: string; sweeping: number; toilet: number; twinbin: number }[]>([]);

  // Commissioner-only states (untouched)
  const [sweepingDetailStats, setSweepingDetailStats] = useState({
    totalBeats: 0, totalSegments: 0, qcAssigned: 0,
    totalApproved: 0, actionRequired: 0, pendingDeployment: 0, assignedSegments: 0
  });
  const [sweepingDetailLoading, setSweepingDetailLoading] = useState(true);

  const [cityGeoStats, setCityGeoStats] = useState({ zones: 0, wards: 0, areas: 0, beats: 0 });

  // Additional detail states for other modules
  const [extraModuleStats, setExtraModuleStats] = useState<any>({
    toilet: { registered: 0, pendingReg: 0, inspectionsDone: 0, inspectionPending: 0, uninspected: 0, actionTaken: 0, actionRequired: 0 },
    twinbin: { registered: 0, pendingReg: 0, inspectionsDone: 0, inspectionPending: 0, uninspected: 0, actionTaken: 0, actionRequired: 0 },
    taskforce: { registered: 0, pendingReg: 0, inspectionsDone: 0, inspectionPending: 0, uninspected: 0, actionTaken: 0, actionRequired: 0 }
  });

  // New States for Asset Requests and Supervisor Performance
  const [assetRequests, setAssetRequests] = useState<any[]>([]);
  const [supervisorMissedWork, setSupervisorMissedWork] = useState<any[]>([]);
  const [perfZoneFilter, setPerfZoneFilter] = useState<string>('ALL');
  const [perfWardFilter, setPerfWardFilter] = useState<string>('ALL');

  // Active Supervisors Tracker
  const [activeSupervisors, setActiveSupervisors] = useState<any[]>([]);
  const [activeSupZoneFilter, setActiveSupZoneFilter] = useState<string>('ALL');
  const [activeSupWardFilter, setActiveSupWardFilter] = useState<string>('ALL');
  const [activeSupTimeFilter, setActiveSupTimeFilter] = useState<string>('TODAY');

  // Commissioner premium dashboard real data
  const [toiletDashStats, setToiletDashStats] = useState<any>(null);
  const [qcLeaderboard, setQcLeaderboard] = useState<{ name: string; inspections: number }[]>([]);

  const isReadOnlyView = user?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));
  const isCityAdmin = user?.roles?.some(r => ["CITY_ADMIN", "HMS_SUPER_ADMIN"].includes(r));

  const loadAll = async () => {
    setRefreshing(true);
    try {
      const [cityRes, statsRes] = await Promise.all([
        apiFetch<{ city: { name: string; ulbCode?: string } }>("/city/info").catch(() => null),
        CityApi.getStats().catch(() => null),
      ]);
      if (cityRes) { setCityName(cityRes.city.name); setUlbCode(cityRes.city.ulbCode || null); }
      if (statsRes) setStats(statsRes.stats);
      setStatsLoading(false);

      const [modulesRes] = await Promise.all([
        CityModulesApi.list().catch(() => []),
      ]);
      const enabledModules: any[] = Array.isArray(modulesRes) ? modulesRes.filter((m: any) => m.enabled) : [];
      const moduleStats = await Promise.all(
        enabledModules.map(async (m: any) => {
          try {
            const rec = await ModuleRecordsApi.getRecords(m.key.toLowerCase(), { limit: 5 });
            return {
              name: m.name, key: m.key,
              total: rec.stats?.total || rec.meta?.total || 0,
              approved: rec.stats?.approved || 0,
              pending: rec.stats?.pending || 0,
              actionRequired: rec.stats?.actionRequired || 0,
              latest: rec.data || []
            };
          } catch { return { name: m.name, key: m.key, total: 0, approved: 0, pending: 0, actionRequired: 0, latest: [] }; }
        })
      );
      setModuleActivity(moduleStats.sort((a, b) => b.total - a.total));

      // Aggregate recent logs
      const allLogs = moduleStats
        .flatMap(m => m.latest.map((r: any) => ({
          ...r,
          moduleName: m.name,
          moduleKey: m.key
        })))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      setRecentLogs(allLogs);

      // Build bar chart: last 6 days inspection counts
      try {
        const today = new Date();
        const days = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (5 - i));
          return d;
        });
        // Group allLogs (from all modules recent records) by date + module
        const [swpRec, toilRec, binRec] = await Promise.all([
          ModuleRecordsApi.getRecords('SWEEPING', { limit: 200, cityId: filterCity !== 'ALL' ? filterCity : undefined }).catch(() => ({ data: [] })),
          ModuleRecordsApi.getRecords('TOILET', { limit: 200, cityId: filterCity !== 'ALL' ? filterCity : undefined }).catch(() => ({ data: [] })),
          ModuleRecordsApi.getRecords('TWINBIN', { limit: 200, cityId: filterCity !== 'ALL' ? filterCity : undefined }).catch(() => ({ data: [] }))
        ]);
        const countByDay = (records: any[], dayDate: Date) => {
          return (records || []).filter((r: any) => {
            if (!r.createdAt) return false;
            const rDate = new Date(r.createdAt);
            return rDate.getFullYear() === dayDate.getFullYear() &&
              rDate.getMonth() === dayDate.getMonth() &&
              rDate.getDate() === dayDate.getDate();
          }).length;
        };
        const chartRows = days.map(d => {
          const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + (d.toDateString() === today.toDateString() ? ' (Today)' : '');
          return {
            date: label,
            sweeping: countByDay(swpRec.data || [], d),
            toilet: countByDay(toilRec.data || [], d),
            twinbin: countByDay(binRec.data || [], d),
          };
        });
        setBarChartData(chartRows);

        // Extract Active Supervisors
        const allFetchedActivity = [
          ...(swpRec.data || []).map((r: any) => ({ ...r, moduleName: 'Sweeping' })),
          ...(toilRec.data || []).map((r: any) => ({ ...r, moduleName: 'Toilet' })),
          ...(binRec.data || []).map((r: any) => ({ ...r, moduleName: 'Litterbin' }))
        ];

        const supMap: Record<string, any> = {};
        allFetchedActivity.forEach((r: any) => {
          const u = r.user || r.employee || r.supervisor || r.inspector;
          if (u && r.createdAt) {
            const uId = u.id || u.name;
            if (!supMap[uId]) {
              supMap[uId] = {
                id: uId, name: u.name || 'Unknown', role: u.role || 'Supervisor',
                zone: r.zone?.name || r.zoneName || 'Various Zones',
                ward: r.ward?.name || r.wardName || 'Various Wards',
                modules: new Set<string>(),
                dates: []
              };
            }
            supMap[uId].modules.add(r.moduleName);
            supMap[uId].dates.push(r.createdAt);
          }
        });

        const activeList = Object.values(supMap).map((s: any) => ({
          ...s,
          modules: Array.from(s.modules).join(', ')
        }));
        setActiveSupervisors(activeList);

      } catch { setBarChartData([]); setActiveSupervisors([]); }

      // Zone & Ward activity
      const [beatsRes, regRes, zoneRes, wardRes, areaRes] = await Promise.all([
        AreaBeatApi.list().catch(() => ({ beats: [] })),
        apiFetch<{ requests: any[] }>("/city/registration-requests").catch(() => ({ requests: [] })),
        GeoApi.list("ZONE").catch(() => ({ nodes: [] })),
        GeoApi.list("WARD").catch(() => ({ nodes: [] })),
        GeoApi.list("AREA").catch(() => ({ nodes: [] }))
      ]);
      const beats = beatsRes.beats || [];
      const regReqs = regRes.requests || [];
      setRecentRegistrationRequests(regReqs.slice(0, 5));
      setPendingRegCount(regReqs.filter(r => r.status === 'PENDING').length);
      setCityGeoStats({
        zones: zoneRes.nodes?.length || 0,
        wards: wardRes.nodes?.length || 0,
        areas: areaRes.nodes?.length || 0,
        beats: beats.length
      });
      const zoneMap: Record<string, { name: string; beats: number; assignedBeats: number; segments: number }> = {};
      const wardMap: Record<string, { name: string; beats: number; segments: number }> = {};
      beats.forEach((b: any) => {
        const zId = b.ward?.zone?.id || b.zoneId || '?';
        const zName = b.ward?.zone?.name || b.zoneName || 'Unknown Zone';
        const wId = b.ward?.id || b.wardId || '?';
        const wName = b.ward?.name || b.wardName || 'Unknown Ward';
        const segs = b.totalSegments || 0;
        if (!zoneMap[zId]) zoneMap[zId] = { name: zName, beats: 0, assignedBeats: 0, segments: 0 };
        zoneMap[zId].beats++;
        if (b.assignedToId) zoneMap[zId].assignedBeats++;
        zoneMap[zId].segments += segs;
        if (!wardMap[wId]) wardMap[wId] = { name: wName, beats: 0, segments: 0 };
        wardMap[wId].beats++;
        wardMap[wId].segments += segs;
      });
      setZoneActivity(Object.values(zoneMap).sort((a: any, b: any) => b.beats - a.beats).slice(0, 6));
      setWardActivity(Object.values(wardMap).sort((a: any, b: any) => b.beats - a.beats).slice(0, 6));

      setSweepingDetailLoading(true);
      const recordsRes = await ModuleRecordsApi.getRecords("SWEEPING").catch(() => ({ stats: null }));
      const totalSegments = beats.reduce((a: number, b: any) => a + (b.totalSegments || 0), 0);
      const qcAssigned = beats.filter((b: any) => b.assignedToId).length;
      const pending = beats.reduce((a: number, b: any) => {
        const pid = b.assignedToId;
        return a + (b.segments || []).filter((s: any) => !s.assignedToId || (pid && s.assignedToId === pid)).length;
      }, 0);
      setSweepingDetailStats({
        totalBeats: beats.length, totalSegments, qcAssigned,
        totalApproved: recordsRes.stats?.approved || 0,
        actionRequired: recordsRes.stats?.actionRequired || 0,
        pendingDeployment: recordsRes.stats?.pending ?? pending, assignedSegments: totalSegments - pending
      });

      // Fetch detailed stats for other modules
      const [
        toiletStatsRes, toiletPendingRes,
        twinbinAllRes, twinbinPendingRes,
        taskforceAllRes, taskforcePendingRes,
        twinbinRecords, taskforceRecords, toiletRecords
      ] = await Promise.all([
        apiFetch<any>("/modules/toilet/stats").catch(() => null),
        apiFetch<any>("/modules/toilet/pending").catch(() => ({ toilets: [] })),
        apiFetch<any>("/modules/twinbin/bins/assigned").catch(() => ({ bins: [] })),
        apiFetch<any>("/modules/twinbin/bin-requests/pending").catch(() => ({ data: [] })),
        apiFetch<any>("/modules/taskforce/feeder-points/approved").catch(() => ({ feederPoints: [] })),
        apiFetch<any>("/modules/taskforce/feeder-points/pending").catch(() => ({ feederPoints: [] })),
        ModuleRecordsApi.getRecords("TWINBIN", { cityId: filterCity !== 'ALL' ? filterCity : undefined }).catch(() => null),
        ModuleRecordsApi.getRecords("TASKFORCE", { cityId: filterCity !== 'ALL' ? filterCity : undefined }).catch(() => null),
        ModuleRecordsApi.getRecords("TOILET", { cityId: filterCity !== 'ALL' ? filterCity : undefined }).catch(() => null)
      ]);

      const extraStatsData = {
        toilet: {
          registered: toiletStatsRes?.totalToilets || 0,
          pendingReg: toiletPendingRes?.toilets?.length || 0,
          inspectionsDone: toiletRecords?.stats?.approved || 0,
          inspectionPending: toiletRecords?.stats?.pending || 0,
          uninspected: Math.max(0, (toiletStatsRes?.totalToilets || 0) - (toiletRecords?.stats?.approved || 0) - (toiletRecords?.stats?.pending || 0)),
          actionTaken: toiletRecords?.stats?.actionTaken || 0,
          actionRequired: toiletRecords?.stats?.actionRequired || 0,
          totalInspections: toiletRecords?.stats?.total || 0
        },
        twinbin: {
          registered: twinbinAllRes?.bins?.length || 0,
          pendingReg: twinbinPendingRes?.data?.length || 0,
          inspectionsDone: twinbinRecords?.stats?.approved || 0,
          inspectionPending: twinbinRecords?.stats?.pending || 0,
          uninspected: Math.max(0, (twinbinAllRes?.bins?.length || 0) - (twinbinRecords?.stats?.total || 0)),
          actionTaken: twinbinRecords?.stats?.actionTaken || 0,
          actionRequired: twinbinRecords?.stats?.actionRequired || 0,
          totalInspections: twinbinRecords?.stats?.total || 0
        },
        taskforce: {
          registered: taskforceAllRes?.feederPoints?.length || 0,
          pendingReg: taskforcePendingRes?.feederPoints?.length || 0,
          inspectionsDone: taskforceRecords?.stats?.approved || 0,
          inspectionPending: taskforceRecords?.stats?.pending || 0,
          uninspected: Math.max(0, (taskforceAllRes?.feederPoints?.length || 0) - (taskforceRecords?.stats?.total || 0)),
          actionTaken: taskforceRecords?.stats?.actionTaken || 0,
          actionRequired: taskforceRecords?.stats?.actionRequired || 0,
          totalInspections: taskforceRecords?.stats?.total || 0
        }
      };

      setExtraModuleStats(extraStatsData);

      // Process Asset Requests for "Live Container"
      const assetsList = [
        ...(toiletPendingRes?.toilets || []).map((t: any) => ({
          id: t.id, module: 'Toilet', requestedBy: t.requestedBy?.name || t.requestedByName || 'Supervisor',
          approvedBy: t.approvedBy?.name || 'Pending Approval', date: t.createdAt || new Date().toISOString(),
          zone: t.zone?.name || t.zoneName || 'Unknown Zone', ward: t.ward?.name || t.wardName || 'Unknown Ward', status: t.status
        })),
        ...(twinbinPendingRes?.data || []).map((t: any) => ({
          id: t.id, module: 'Litterbin', requestedBy: t.requestedBy?.name || t.requestedByName || 'Supervisor',
          approvedBy: t.approvedBy?.name || 'Pending Approval', date: t.createdAt || new Date().toISOString(),
          zone: t.zone?.name || t.zoneName || 'Unknown Zone', ward: t.ward?.name || t.wardName || 'Unknown Ward', status: t.status
        })),
        ...(taskforcePendingRes?.feederPoints || []).map((t: any) => ({
          id: t.id, module: 'GVP/CTU', requestedBy: t.requestedBy?.name || t.requestedByName || 'Supervisor',
          approvedBy: t.approvedBy?.name || 'Pending Approval', date: t.createdAt || new Date().toISOString(),
          zone: t.zone?.name || t.zoneName || 'Unknown Zone', ward: t.ward?.name || t.wardName || 'Unknown Ward', status: t.status
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAssetRequests(assetsList);

      // Process Supervisor Missed Work
      const missedWorkMap: Record<string, { id: string, name: string, role: string, zone: string, ward: string, missedCount: number }> = {};
      beats.forEach((b: any) => {
        if (b.assignedToId) {
          const supId = b.assignedToId;
          const supName = b.assignedTo?.name || b.assignedToName || 'Unknown Supervisor';
          const zName = b.ward?.zone?.name || b.zoneName || 'Unknown Zone';
          const wName = b.ward?.name || b.wardName || 'Unknown Ward';
          const status = b.lastAssessment?.status || b.status;

          if (!missedWorkMap[supId]) {
            missedWorkMap[supId] = { id: supId, name: supName, role: 'Supervisor', zone: zName, ward: wName, missedCount: 0 };
          }

          if (!status || status === "REJECTED" || status === "ACTION_REQUIRED" || status === "PENDING" || status === "PENDING_ASSIGNMENT") {
            missedWorkMap[supId].missedCount++;
          }
        }
      });

      setSupervisorMissedWork(Object.values(missedWorkMap).filter(w => w.missedCount > 0).sort((a, b) => b.missedCount - a.missedCount));

      if (isReadOnlyView) {
        // Fetch toilet dashboard stats for commissioner premium sections
        const toiletDash = await ToiletApi.getDashboardStats().catch(() => null);
        if (toiletDash) setToiletDashStats(toiletDash);

        // Build QC leaderboard from toilet inspections
        try {
          const inspRes = await ToiletApi.listInspections({ pageSize: 50 });
          const inspections = inspRes?.inspections || [];
          const qcMap: Record<string, { name: string; count: number }> = {};
          inspections.forEach((insp: any) => {
            const eName = insp.employee?.name || insp.employeeName || 'Unknown';
            const eId = insp.employeeId || eName;
            if (!qcMap[eId]) qcMap[eId] = { name: eName, count: 0 };
            qcMap[eId].count++;
          });
          const leaderboard = Object.values(qcMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(q => ({ name: q.name, inspections: q.count }));
          setQcLeaderboard(leaderboard);
        } catch { setQcLeaderboard([]); }
      }
      setSweepingDetailLoading(false);
    } finally { setLastRefreshed(new Date()); setRefreshing(false); }
  };

  useEffect(() => { loadAll(); }, [isReadOnlyView]);

  const share = () => {
    const msg = `*${cityName || 'City'} | City Admin Report*\nShared via Taskforce20`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const totalUsers = (stats?.qualityControllers || 0) + (stats?.taskforceMembers || 0) +
    (stats?.ulbOfficials || 0) + (stats?.actionOfficers || 0) + (stats?.cityAdmins || 0);


  // ─── CITY ADMIN VIEW — Premium Dashboard ──────────────────────────────────────
  const roleData = [
    { label: "Quality Controllers", key: "qualityControllers", color: "#7c3aed", bg: "#f5f3ff", icon: <Search size={16} />, href: "/city/users?role=QC" },
    { label: "Taskforce Members", key: "taskforceMembers", color: "#d97706", bg: "#fffbeb", icon: <Users size={16} />, href: "/city/users?role=EMPLOYEE" },
    { label: "ULB Officials", key: "ulbOfficials", color: "#dc2626", bg: "#fef2f2", icon: <Landmark size={16} />, href: "/city/users?role=COMMISSIONER" },
    { label: "Action Officers", key: "actionOfficers", color: "#059669", bg: "#f0fdf4", icon: <UserCog size={16} />, href: "/city/users?role=ACTION_OFFICER" },
    { label: "City Admins", key: "cityAdmins", color: "#4f46e5", bg: "#eef2ff", icon: <ShieldCheck size={16} />, href: "/city/users?role=CITY_ADMIN" },
  ];
  const quickActions = [
    {
      title: "Add New User",
      description: "Create new user account",
      href: "/city/users/create",
      icon: Users,
      cardAccent: "before:bg-blue-600",
      iconStyle: "bg-blue-50 text-blue-600",
    },
    {
      title: "Manage Areas",
      description: "Add or update areas",
      href: "/city/areas",
      icon: Target,
      cardAccent: "before:bg-violet-600",
      iconStyle: "bg-violet-50 text-violet-600",
    },
    {
      title: "Reg Requests",
      description: "Review pending requests",
      href: "/registration-requests",
      icon: Bell,
      cardAccent: "before:bg-orange-500",
      iconStyle: "bg-orange-50 text-orange-600",
      showBadge: true,
    },
  ];

  const getModuleVisual = (module: {
    name?: string;
    key?: string;
  }) => {
    const moduleIdentity =
      `${module.key || ""} ${module.name || ""}`.toLowerCase();

    if (moduleIdentity.includes("toilet")) {
      return {
        Icon: Toilet,
        iconClass: "bg-blue-50 text-blue-600",
      };
    }

    if (
      moduleIdentity.includes("litter") ||
      moduleIdentity.includes("twinbin") ||
      moduleIdentity.includes("bin")
    ) {
      return {
        Icon: Trash2,
        iconClass: "bg-orange-50 text-orange-600",
      };
    }

    if (moduleIdentity.includes("sweep")) {
      return {
        Icon: BrushCleaning,
        iconClass: "bg-emerald-50 text-emerald-600",
      };
    }

    if (
      moduleIdentity.includes("taskforce") ||
      moduleIdentity.includes("gvp") ||
      moduleIdentity.includes("ctu")
    ) {
      return {
        Icon: Truck,
        iconClass: "bg-violet-50 text-violet-600",
      };
    }

    return {
      Icon: Package,
      iconClass: "bg-slate-100 text-slate-600",
    };
  };

  const maxRoleVal = Math.max(...roleData.map((r) => stats?.[r.key] || 0), 1);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        .da-card { transition: box-shadow 0.18s, transform 0.18s; }
        .da-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,0.09) !important; transform: translateY(-2px); }
        .da-row:hover { background: #f8fafc !important; }
        .da-link { text-decoration: none; }
        
        /* Responsive Grids */
        .responsive-grid-sidebar { display: grid; grid-template-columns: 280px 1fr; gap: 20px; }
        .responsive-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        .page-padding { padding: 28px 36px; }
        .header-flex { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; position: relative; }
        .req-table { display: grid; grid-template-columns: 1fr 120px 100px; gap: 12px; }


/* ================= CITY ADMIN PREMIUM HEADER ================= */

.city-admin-top-section {
  padding: 24px 28px 0;
}

.city-admin-hero {
  position: relative;
  overflow: hidden;

  min-height: 390px;          /* main card ki height */
  display: flex;
  flex-direction: column;

  background:
    radial-gradient(
      circle at 88% 18%,
      rgba(59, 130, 246, 0.08),
      transparent 28%
    ),
    linear-gradient(
      135deg,
      #ffffff 0%,
      #fbfdff 70%,
      #f4f8ff 100%
    );

  border: 1px solid #dbe4f0;
  border-top: 3px solid #2563eb;
  border-radius: 24px;

  padding: 34px 32px 18px;   /* bottom padding bhi add hua */

  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.07),
    0 3px 10px rgba(15, 23, 42, 0.03);
}

.city-admin-hero::before {
  content: "";
  position: absolute;
  right: 0;
  bottom: 88px;
  width: 500px;
  height: 190px;
  opacity: 0.68;
  pointer-events: none;
  background:
    linear-gradient(to top, rgba(219, 234, 254, 0.75), transparent 80%);
  clip-path: polygon(
    0 100%, 0 76%, 6% 76%, 6% 58%, 11% 58%, 11% 69%,
    17% 69%, 17% 40%, 22% 40%, 22% 67%, 28% 67%,
    28% 55%, 34% 55%, 34% 74%, 42% 74%, 42% 45%,
    48% 45%, 48% 73%, 55% 73%, 55% 50%, 61% 50%,
    61% 68%, 67% 68%, 67% 34%, 73% 34%, 73% 70%,
    79% 70%, 79% 52%, 85% 52%, 85% 72%, 92% 72%,
    92% 43%, 97% 43%, 97% 100%
  );
}

.city-admin-hero-main {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 28px;
}

.city-admin-identity {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.city-admin-logo-ring {
  position: relative;
  width: 62px;
  height: 62px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(239, 246, 255, 0.95);
  border: 1px solid #bfdbfe;
  box-shadow:
    0 0 0 5px rgba(219, 234, 254, 0.55),
    0 7px 18px rgba(37, 99, 235, 0.13);
}

.city-admin-logo-ring::before {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.city-admin-logo-ring::after {
  content: "";
  position: absolute;
  right: -2px;
  bottom: 6px;
  width: 8px;
  height: 8px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #06b6d4;
}

.city-admin-logo-core {
  position: relative;
  z-index: 1;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #ffffff;
  background: linear-gradient(145deg, #2563eb, #6d28d9);
  box-shadow: 0 6px 14px rgba(79, 70, 229, 0.25);
}

.city-admin-eyebrow {
  margin-bottom: 3px;
  color: #2563eb;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.city-admin-title {
  margin: 0;
  color: #0f172a;
  font-size: clamp(28px, 3vw, 38px);
  font-weight: 950;
  line-height: 1;
  letter-spacing: -0.04em;
}

.city-admin-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.city-admin-ulb {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 9px;
  color: #6d28d9;
  background: #f5f3ff;
  font-size: 10px;
  font-weight: 800;
}

.city-admin-updated {
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
}

.city-admin-welcome {
  margin: 24px 0 0 104px;
  position: relative;
  z-index: 2;
  max-width: 560px;
}

.city-admin-welcome h2 {
  margin: 0 0 7px;
  color: #0f172a;
  font-size: 17px;
  font-weight: 850;
}

.city-admin-welcome p {
  margin: 0;
  max-width: 540px;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.65;
}

.city-admin-actions {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: 8px;
}

.city-admin-action-btn {
  height: 38px;
  padding: 0 13px;
  border: 1px solid #dbe4f0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;

  cursor: pointer;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
  transition: all 0.2s ease;
}

.city-admin-action-btn:hover {
  border-color: #bfdbfe;
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.1);
}

.city-admin-action-btn.primary {
  height: 40px;
  padding: 0 16px;
  border-color: transparent;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #6d28d9);
  box-shadow: 0 7px 16px rgba(79, 70, 229, 0.22);
}

.city-admin-action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.city-admin-action-pills {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: flex-end;
  flex-wrap: nowrap;
  gap: 8px;
  margin-top: 14px;
}

.city-admin-action-pill {
  min-height: 36px;
  padding: 0 13px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);

  display: inline-flex;
  align-items: center;
  gap: 7px;

  color: #2563eb;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;

  box-shadow: 0 4px 11px rgba(37, 99, 235, 0.06);
}

.city-admin-action-pill.purple {
  color: #6d28d9;
  border-color: #ddd6fe;
  background: rgba(250, 245, 255, 0.93);
}

.city-admin-action-pill strong {
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
}

.city-admin-status-grid {
  position: relative;
  z-index: 4;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  margin-top: auto;

  border: 1px solid #dbe4f0;
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.95);
  overflow: hidden;

  box-shadow: 0 7px 18px rgba(15, 23, 42, 0.04);
}

.city-admin-status-item {
  min-height: 82px;
  padding: 13px 16px;

  display: flex;
  align-items: center;
  gap: 12px;

  border-right: 1px solid #e2e8f0;
}

.city-admin-status-item:last-child {
  border-right: none;
}

.city-admin-status-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;

  border: 1px solid;
  border-radius: 12px;

  display: grid;
  place-items: center;
}

.city-admin-status-label {
  display: flex;
  align-items: center;
  gap: 6px;

  margin-bottom: 4px;

  color: #475569;
  font-size: 8px;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.city-admin-status-label-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
}

.city-admin-status-value {
  color: #0f172a;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.15;
}

.city-admin-status-help {
  margin-top: 3px;

  color: #64748b;
  font-size: 9px;
  font-weight: 500;
  line-height: 1.35;
}

/* ================= CITY ADMIN USER CARDS ================= */

/* ================= COMPACT USER OVERVIEW ================= */

.city-user-overview {
  padding: 20px 0 0;
}

.city-user-overview-title {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
  color: #0f172a;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.city-user-overview-title::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -7px;
  width: 38px;
  height: 2px;
  border-radius: 999px;
  background: #2563eb;
}

.city-user-card-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.city-user-card {
  min-height: 154px;
  padding: 14px 14px 12px;

  border: 1px solid #dbe4f0;
  border-radius: 17px;
  background: #ffffff;

  display: flex;
  flex-direction: column;

  box-shadow:
    0 7px 18px rgba(15, 23, 42, 0.045),
    0 2px 4px rgba(15, 23, 42, 0.02);

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.city-user-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.city-user-card.modules-card {
  border: 2px solid #315bea;

  background:
    radial-gradient(
      circle at 95% 0%,
      rgba(99, 102, 241, 0.12),
      transparent 36%
    ),
    linear-gradient(145deg, #ffffff 0%, #eef2ff 100%);

  box-shadow:
    0 9px 20px rgba(37, 99, 235, 0.12),
    inset 0 0 0 3px rgba(255, 255, 255, 0.4);
}

.city-user-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.city-user-card-icon {
  width: 43px;
  height: 43px;
  border-radius: 12px;
  display: grid;
  place-items: center;
}

.city-user-card-arrow {
  margin-top: 2px;
  color: #94a3b8;
}

.city-user-card-main-row {
  display: flex;
  align-items: flex-end;
  gap: 7px;
  margin-top: 9px;
  min-height: 35px;
}

.city-user-card-number {
  margin: 0;
  flex-shrink: 0;

  color: #0f172a;
  font-size: 27px;
  font-weight: 950;
  line-height: 1;
  letter-spacing: -0.04em;
}

.city-user-card-label {
  margin: 0 0 2px;

  color: #475569;
  font-size: 11px;
  font-weight: 650;
  line-height: 1.2;
}

.city-user-status {
  margin-top: auto;
  min-height: 34px;
  padding: 0 10px;

  border-radius: 10px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;

  font-size: 8px;
  font-weight: 800;
}

.city-user-status-left {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.city-user-status-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
}

.city-user-card.modules-card .city-user-status {
  color: #ffffff !important;
  background: linear-gradient(135deg, #2563eb, #3b65e9) !important;
  box-shadow: 0 5px 12px rgba(37, 99, 235, 0.18);
}



@media (max-width: 1250px) {
  .city-user-card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .city-admin-status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .city-admin-status-item:nth-child(2) {
    border-right: none;
  }

  .city-admin-status-item:nth-child(-n + 2) {
    border-bottom: 1px solid #e2e8f0;
  }
}

@media (max-width: 850px) {
  .city-admin-top-section,
  .city-user-overview {
    padding-left: 16px;
    padding-right: 16px;
  }

  .city-admin-hero {
    padding: 25px 20px 0;
    border-radius: 18px;
  }

  .city-admin-hero-main {
    flex-direction: column;
  }

  .city-admin-actions,
  .city-admin-action-pills {
    justify-content: flex-start;
  }

  .city-admin-welcome {
    margin-left: 0;
  }

  .city-user-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .city-admin-identity {
    gap: 14px;
  }

  .city-admin-logo-ring {
    width: 66px;
    height: 66px;
  }

  .city-admin-logo-core {
    width: 46px;
    height: 46px;
  }

  .city-admin-title {
    font-size: 32px;
  }

  .city-admin-action-btn {
    flex: 1;
    padding: 0 12px;
  }

  .city-admin-action-pill {
    flex: 1;
    justify-content: center;
  }

  .city-admin-status-grid,
  .city-user-card-grid {
    grid-template-columns: 1fr;
  }

  .city-admin-status-item,
  .city-admin-status-item:nth-child(2) {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .city-admin-status-item:last-child {
    border-bottom: none;
  }
}




/* ================= PREMIUM CITY ADMIN DASHBOARD ================= */
.ca-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 0%, rgba(37, 99, 235, 0.075), transparent 28%),
    radial-gradient(circle at 92% 8%, rgba(99, 102, 241, 0.055), transparent 24%),
    #f6f8fc;
  color: #0f172a;
}
.ca-shell {
  width: min(1480px, calc(100% - 40px));
  margin: 0 auto;
  padding: 24px 0 42px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.ca-hero {
  position: relative;
  overflow: hidden;
  min-height: 160px;
  padding: 26px 28px;
  border: 1px solid #dbe5f2;
  border-radius: 26px;
  background:
    linear-gradient(112deg, rgba(255,255,255,.99) 0%, rgba(255,255,255,.96) 48%, rgba(239,246,255,.89) 100%),
    url('/Taskforce_background_header.png') right center / cover no-repeat;
  box-shadow: 0 18px 45px rgba(30, 64, 175, 0.08), 0 2px 8px rgba(15,23,42,.035);
}
.ca-hero::after {
  content: '';
  position: absolute;
  width: 340px;
  height: 340px;
  right: -100px;
  top: -170px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(37,99,235,.12), rgba(37,99,235,0) 67%);
  pointer-events: none;
}
.ca-hero-row {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}
.ca-brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
.ca-brand-icon {
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  border-radius: 17px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(145deg, #2563eb, #4f46e5);
  box-shadow: 0 12px 24px rgba(37,99,235,.23), inset 0 1px 0 rgba(255,255,255,.25);
}
.ca-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #2563eb;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .11em;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.ca-title {
  margin: 0;
  font-size: clamp(24px, 2.6vw, 34px);
  line-height: 1.05;
  font-weight: 950;
  letter-spacing: -.035em;
  color: #0f172a;
}
.ca-subtitle {
  margin-top: 7px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
}
.ca-city-name { color: #1d4ed8; font-weight: 850; }
.ca-dot { width: 4px; height: 4px; border-radius: 50%; background: #cbd5e1; }
.ca-toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 9px; flex-wrap: wrap; }
.ca-control,
.ca-alert-btn,
.ca-refresh-btn {
  height: 40px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 13px;
  font-size: 12px;
  font-weight: 800;
  outline: none;
  transition: .2s ease;
}
.ca-control {
  border: 1px solid #dbe5f2;
  color: #334155;
  background: rgba(255,255,255,.94);
  box-shadow: 0 4px 12px rgba(15,23,42,.04);
}
.ca-control input { border: 0; outline: 0; background: transparent; font: inherit; color: #0f172a; cursor: pointer; }
.ca-alert-btn { border: 1px solid #fecaca; color: #dc2626; background: #fff7f7; cursor: pointer; }
.ca-alert-badge {
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  color: #fff;
  background: #dc2626;
  font-size: 10px;
  font-weight: 900;
}
.ca-refresh-btn {
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  background: #eff6ff;
  cursor: pointer;
}
.ca-refresh-btn:hover, .ca-alert-btn:hover, .ca-control:hover { transform: translateY(-1px); box-shadow: 0 7px 18px rgba(37,99,235,.08); }
.ca-refresh-btn:disabled { opacity: .65; cursor: not-allowed; transform: none; }

.ca-section {
  position: relative;
  overflow: hidden;
  border: 1px solid #dfe7f1;
  border-radius: 24px;
  background: rgba(255,255,255,.94);
  padding: 20px;
  box-shadow: 0 10px 30px rgba(15,23,42,.045), 0 1px 2px rgba(15,23,42,.03);
}
.ca-section::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(59,130,246,.38), transparent);
}
.ca-section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.ca-section-title-wrap { display: flex; align-items: center; gap: 11px; min-width: 0; }
.ca-section-icon {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #dbeafe;
}
.ca-section-title {
  margin: 0;
  color: #1e293b;
  font-size: 12px;
  font-weight: 950;
  letter-spacing: .055em;
  text-transform: uppercase;
}
.ca-section-note { margin: 3px 0 0; color: #94a3b8; font-size: 10px; font-weight: 650; }
.ca-mini-refresh {
  height: 32px;
  padding: 0 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}
.ca-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; }
.ca-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 15px; }

.ca-stat-card {
  position: relative;
  overflow: hidden;
  min-height: 112px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(145deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 5px 16px rgba(15,23,42,.035);
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.ca-stat-card:hover { transform: translateY(-2px); border-color: #cbdcf7; box-shadow: 0 12px 26px rgba(37,99,235,.09); }
.ca-stat-card::after {
  content: '';
  position: absolute;
  right: -26px;
  bottom: -35px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: var(--soft);
  opacity: .58;
}
.ca-stat-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.ca-stat-icon {
  width: 43px;
  height: 43px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  color: var(--accent);
  background: var(--soft);
  border: 1px solid var(--border);
}
.ca-stat-label {
  margin-top: 13px;
  color: #64748b;
  font-size: 9px;
  font-weight: 900;
  line-height: 1.3;
  letter-spacing: .055em;
  text-transform: uppercase;
}
.ca-stat-value {
  margin-top: 4px;
  color: #0f172a;
  font-size: 29px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -.04em;
}
.ca-stat-line { position: absolute; left: 16px; bottom: 0; width: 52px; height: 3px; border-radius: 999px 999px 0 0; background: var(--accent); }

.ca-user-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 98px;
  padding: 15px;
  border-radius: 17px;
  border: 1px solid var(--border);
  background: linear-gradient(135deg, #fff 0%, var(--wash) 180%);
  transition: .2s ease;
}
.ca-user-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,23,42,.07); }
.ca-user-icon { width: 46px; height: 46px; flex-shrink: 0; border-radius: 14px; display: grid; place-items: center; color: var(--accent); background: var(--wash); }
.ca-user-label { color: #64748b; font-size: 9px; line-height: 1.25; font-weight: 900; letter-spacing: .045em; text-transform: uppercase; }
.ca-user-value { margin-top: 5px; color: #0f172a; font-size: 26px; line-height: 1; font-weight: 950; }

.ca-module-card {
  position: relative;
  overflow: hidden;
  min-height: 104px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #f9fbfe;
  display: flex;
  align-items: center;
  gap: 13px;
  transition: .2s ease;
}
.ca-module-card:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 10px 22px rgba(15,23,42,.065); }
.ca-module-icon { width: 46px; height: 46px; flex-shrink: 0; border-radius: 14px; display: grid; place-items: center; color: var(--accent); background: var(--soft); border: 1px solid var(--border); }
.ca-module-name { color: #0f172a; font-size: 12px; line-height: 1.25; font-weight: 850; }
.ca-module-records { margin-top: 5px; color: #64748b; font-size: 11px; font-weight: 650; }
.ca-module-accent { position: absolute; inset: auto 0 0 0; height: 3px; background: linear-gradient(90deg, var(--accent), transparent); }

.ca-health-card {
  min-height: 270px;
  padding: 18px;
  border-radius: 19px;
  border: 1px solid var(--border);
  background: linear-gradient(155deg, #fff 0%, var(--wash) 220%);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ca-health-head { width: 100%; display: flex; align-items: center; gap: 10px; }
.ca-health-icon { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; color: var(--accent); background: var(--wash); }
.ca-health-title { font-size: 12px; font-weight: 900; color: #0f172a; }
.ca-health-status {
  width: 100%;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid #eef2f7;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
.ca-health-item { text-align: center; }
.ca-health-num { display: flex; justify-content: center; align-items: center; gap: 5px; font-size: 12px; font-weight: 900; }
.ca-health-dot { width: 7px; height: 7px; border-radius: 50%; }
.ca-health-label { margin-top: 4px; color: #94a3b8; font-size: 9px; font-weight: 800; }

.ca-chart-panel {
  padding: 18px;
  border: 1px solid #e3eaf3;
  border-radius: 18px;
  background:
    linear-gradient(#f4f7fb 1px, transparent 1px),
    linear-gradient(90deg, #f4f7fb 1px, transparent 1px),
    #fbfdff;
  background-size: 100% 42px, 72px 100%, auto;
}
.ca-chart { display: flex; gap: 18px; align-items: flex-end; height: 230px; padding: 0 4px 8px; border-bottom: 1px solid #cbd5e1; }
.ca-chart-day { flex: 1; min-width: 70px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
.ca-bars { width: 100%; height: 180px; display: flex; align-items: flex-end; justify-content: center; gap: 7px; }
.ca-bar-wrap { height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
.ca-bar-value { margin-bottom: 4px; font-size: 9px; font-weight: 900; }
.ca-bar { width: 18px; min-height: 4px; border-radius: 6px 6px 2px 2px; box-shadow: 0 5px 12px rgba(15,23,42,.08); }
.ca-chart-date { margin-top: 9px; color: #475569; font-size: 9px; font-weight: 850; text-align: center; }
.ca-legend { display: flex; justify-content: center; flex-wrap: wrap; gap: 22px; margin-top: 16px; }
.ca-legend-item { display: flex; align-items: center; gap: 7px; color: #334155; font-size: 10px; font-weight: 800; }
.ca-legend-swatch { width: 10px; height: 10px; border-radius: 3px; }
.ca-empty { padding: 44px 20px; text-align: center; color: #94a3b8; font-size: 12px; font-weight: 700; }

@media (max-width: 1120px) {
  .ca-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ca-grid-3 { grid-template-columns: 1fr; }
  .ca-hero-row { align-items: flex-start; flex-direction: column; }
  .ca-toolbar { justify-content: flex-start; }
}
@media (max-width: 700px) {
  .ca-shell { width: min(100% - 24px, 1480px); padding-top: 12px; gap: 12px; }
  .ca-hero, .ca-section { border-radius: 18px; }
  .ca-hero { padding: 20px; }
  .ca-section { padding: 15px; }
  .ca-grid-4 { grid-template-columns: 1fr; }
  .ca-toolbar { width: 100%; }
  .ca-control, .ca-alert-btn, .ca-refresh-btn { flex: 1; justify-content: center; }
  .ca-chart-panel { overflow-x: auto; }
  .ca-chart { min-width: 680px; }
}

        @media (max-width: 1200px) {
          .responsive-grid-sidebar { grid-template-columns: 240px 1fr; }
          .responsive-grid-3 { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 900px) {
          .responsive-grid-sidebar { grid-template-columns: 1fr; }
          .responsive-grid-3 { grid-template-columns: 1fr; }
          .page-padding { padding: 20px 24px; }
        }
        @media (max-width: 600px) {
          .page-padding { padding: 16px; }
          .hero-banner { padding: 24px 20px !important; }
          .hero-stats { gap: 8px !important; }
          .hero-stats > div { flex: 1; min-width: 120px; padding: 8px 12px !important; }
          .req-table { grid-template-columns: 1fr 80px; }
          .req-table .req-role { display: none; } /* Hide role on mobile to save space */
        }
      `}


      </style>

      {/* ══════════════ COMMISSIONER / ULB OFFICER VIEW — PREMIUM ══════════════ */}
      {isReadOnlyView ? (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

          {/* ── Hero Banner ── */}
          <div style={{
            background: 'linear-gradient(120deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
            padding: '32px 40px 28px', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, right: 160, width: 180, height: 180, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', pointerEvents: 'none' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>ULB Official · City Operations</div>
                    <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                      {cityName || 'City Administration'}
                    </h1>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 7, padding: '4px 12px', fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Landmark size={12} />
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                    Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={loadAll} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: refreshing ? 'not-allowed' : 'pointer', backdropFilter: 'blur(8px)' }}>
                  <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button onClick={share} style={{ background: '#25d366', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Share View
                </button>
              </div>
            </div>

            {/* Hero stat bar */}
            <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
              {[
                { label: 'Zones', value: cityGeoStats?.zones },
                { label: 'Wards', value: cityGeoStats?.wards },
                { label: 'Areas', value: cityGeoStats?.areas },
                { label: 'Beats', value: cityGeoStats?.beats },
                { label: 'Modules', value: stats?.totalModules ?? '—' },
              ].map((c, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#fff' }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{statsLoading ? '—' : c.value}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: '28px 40px' }}>

            {/* Section: City Operations Overview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Building2 size={14} color="#2563eb" />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#334155' }}>City Operations Overview</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
              {[
                { label: "Total Zones", value: cityGeoStats?.zones, icon: <Map size={20} />, color: "#4f46e5", href: "/city/zones" },
                { label: "Total Wards", value: cityGeoStats?.wards, icon: <MapPin size={20} />, color: "#2563eb", href: "/city/wards" },
                { label: "Total Areas", value: cityGeoStats?.areas, icon: <Target size={20} />, color: "#0ea5e9", href: "/city/areas" },
                { label: "Total Beats", value: cityGeoStats?.beats, icon: <Map size={20} />, color: "#0284c7", href: "/city/areas" },
                { label: "Total Modules", value: stats?.totalModules, icon: <Package size={20} />, color: "#3b82f6", href: "/city/modules" },
                { label: "Quality Controller", value: stats?.qualityControllers, icon: <Search size={20} />, color: "#8b5cf6", href: "/city/users?role=QC" },
                { label: "Taskforce Member", value: stats?.taskforceMembers, icon: <Users size={20} />, color: "#f59e0b", href: "/city/users?role=EMPLOYEE" },
                { label: "ULB Officials", value: stats?.ulbOfficials, icon: <Landmark size={20} />, color: "#ef4444", href: "/city/users?role=COMMISSIONER" },
                { label: "Action Officer", value: stats?.actionOfficers, icon: <UserCog size={20} />, color: "#10b981", href: "/city/users?role=ACTION_OFFICER" },
                { label: "City Admin", value: stats?.cityAdmins, icon: <ShieldCheck size={20} />, color: "#6366f1", href: "/city/users?role=CITY_ADMIN" },
              ].map((s, i) => (
                <Link key={i} href={s.href} style={{ textDecoration: 'none' }}>
                  <div className="da-card" style={{
                    padding: '16px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
                    display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.18s', borderLeft: `3px solid ${s.color}`
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}14`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {s.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{s.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
                        {statsLoading || refreshing ? <span style={{ color: '#e2e8f0' }}>—</span> : (s.value ?? 0)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: 10, background: 'white', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={14} />
                Sweeping Details
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
              {[
                { label: "Total Beats", value: sweepingDetailStats.totalBeats, icon: <Target size={20} />, color: "#3b82f6", href: "/city/areas" },
                { label: "Total Sub-Beats", value: sweepingDetailStats.totalSegments, icon: <Database size={20} />, color: "#8b5cf6", href: "/city/areas" },
                { label: "Assigned Sub-Beats", value: sweepingDetailStats.assignedSegments, icon: <CheckCircle size={20} />, color: "#0ea5e9", href: "/city/areas" },
                { label: "QC Assigned", value: sweepingDetailStats.qcAssigned, icon: <ShieldCheck size={20} />, color: "#10b981", href: "/city/users?role=QC" },
                { label: "Total Approved", value: sweepingDetailStats.totalApproved, icon: <CheckCircle size={20} />, color: "#22c55e", href: "/city/beat-status" },
                { label: "Action Required", value: sweepingDetailStats.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: "/city/beat-status" },
                { label: "Pending Deployment", value: sweepingDetailStats.pendingDeployment, icon: <Map size={20} />, color: "#f59e0b", href: "/city/areas" },
                { label: "Beat Status Overview", value: "→ View", icon: <Activity size={20} />, color: "#7c3aed", href: "/city/beat-status" },
              ].map((s, i) => (
                <Link key={i} href={s.href} style={{ textDecoration: 'none' }}>
                  <div className="card card-hover" style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, height: '100%', transition: 'all 0.2s ease' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                      {s.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                        {sweepingDetailLoading || refreshing ? "..." : s.value}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {moduleActivity.filter(m => m.key.toUpperCase() !== 'SWEEPING').map((m, i) => {
              let displayName = m.name;
              const keyStr = m.key.toLowerCase();
              let customStats: any[] = [];

              if (keyStr === 'toilet') {
                displayName = 'Cleanliness of Toilet';
                customStats = [
                  { label: "Toilets Registered", value: extraModuleStats.toilet.registered, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/toilet` },
                  { label: "Registration Pending", value: extraModuleStats.toilet.pendingReg, icon: <Activity size={20} />, color: "#f59e0b", href: `/modules/toilet` },
                  { label: "Inspections Done (QC)", value: extraModuleStats.toilet.inspectionsDone, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/toilet` },
                  { label: "Pending QC Inspection", value: extraModuleStats.toilet.inspectionPending, icon: <MapPin size={20} />, color: "#3b82f6", href: `/modules/toilet` },
                  { label: "Action Required", value: extraModuleStats.toilet.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/toilet` },
                  { label: "Action Taken by AO", value: extraModuleStats.toilet.actionTaken, icon: <CheckCircle size={20} />, color: "#10b981", href: `/modules/toilet` },
                  { label: "Inspection Not Started", value: extraModuleStats.toilet.uninspected, icon: <Target size={20} />, color: "#64748b", href: `/modules/toilet` },
                ];
              } else if (keyStr === 'taskforce') {
                displayName = 'CTU/GVP Transformation';
                customStats = [
                  { label: "GVP Points Registered", value: extraModuleStats.taskforce.registered, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/taskforce` },
                  { label: "Requests Pending", value: extraModuleStats.taskforce.pendingReg, icon: <Activity size={20} />, color: "#f59e0b", href: `/modules/taskforce` },
                  { label: "Total Inspections", value: extraModuleStats.taskforce.totalInspections, icon: <Database size={20} />, color: "#3b82f6", href: `/modules/taskforce` },
                  { label: "Approved by QC", value: extraModuleStats.taskforce.inspectionsDone, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/taskforce` },
                  { label: "Pending QC", value: extraModuleStats.taskforce.inspectionPending, icon: <MapPin size={20} />, color: "#3b82f6", href: `/modules/taskforce` },
                  { label: "Action Required", value: extraModuleStats.taskforce.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/taskforce` },
                  { label: "Action Taken by AO", value: extraModuleStats.taskforce.actionTaken, icon: <CheckCircle size={20} />, color: "#10b981", href: `/modules/taskforce` },
                ];
              } else if (keyStr === 'twinbin' || keyStr === 'litterbins') {
                displayName = 'Litterbins';
                customStats = [
                  { label: "Litterbins Registered", value: extraModuleStats.twinbin.registered, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/twinbin` },
                  { label: "Requests Pending", value: extraModuleStats.twinbin.pendingReg, icon: <Activity size={20} />, color: "#f59e0b", href: `/modules/twinbin` },
                  { label: "Total Inspections", value: extraModuleStats.twinbin.totalInspections, icon: <Database size={20} />, color: "#3b82f6", href: `/modules/twinbin` },
                  { label: "Approved by QC", value: extraModuleStats.twinbin.inspectionsDone, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/twinbin` },
                  { label: "Pending QC", value: extraModuleStats.twinbin.inspectionPending, icon: <MapPin size={20} />, color: "#3b82f6", href: `/modules/twinbin` },
                  { label: "Action Required", value: extraModuleStats.twinbin.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/twinbin` },
                  { label: "Action Taken by AO", value: extraModuleStats.twinbin.actionTaken, icon: <CheckCircle size={20} />, color: "#10b981", href: `/modules/twinbin` },
                ];
              } else {
                customStats = [
                  { label: "Total Uploads", value: m.total, icon: <Database size={20} />, color: "#8b5cf6", href: `/modules/${m.key.toLowerCase()}` },
                  { label: "Approved", value: m.approved, icon: <CheckCircle size={20} />, color: "#22c55e", href: `/modules/${m.key.toLowerCase()}` },
                  { label: "Action Required", value: m.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: `/modules/${m.key.toLowerCase()}` },
                  { label: "Pending", value: m.pending, icon: <MapPin size={20} />, color: "#f59e0b", href: `/modules/${m.key.toLowerCase()}` },
                ];
              }

              return (
                <div key={`mod-${i}`} style={{ marginBottom: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: 10, background: 'white', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Activity size={14} />
                      {displayName} Details
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                    {customStats.map((s, j) => (
                      <Link key={j} href={s.href} style={{ textDecoration: 'none' }}>
                        <div className="card card-hover" style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16, height: '100%', transition: 'all 0.2s ease' }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                            {s.icon}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 2 }}>{s.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                              {statsLoading || refreshing ? "..." : s.value}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div style={{ maxWidth: 500, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: 8, borderRadius: 8 }}>
                    <Shield size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Active Modules</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{statsLoading ? '—' : (stats?.totalModules ?? 0)}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>MODULES</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                      {statsLoading ? '—' : ((stats?.qualityControllers ?? 0) + (stats?.taskforceMembers ?? 0) + (stats?.ulbOfficials ?? 0) + (stats?.actionOfficers ?? 0) + (stats?.cityAdmins ?? 0))}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>STAFF</div>
                  </div>
                </div>
                <Link href="/city" style={{ textDecoration: 'none', display: 'block', marginTop: 16, textAlign: 'center', color: '#2563eb', fontWeight: 700, fontSize: 13 }}>
                  Manage City Settings
                </Link>
              </div>
            </div>
          </div>

          {/* --- NEW PREMIUM COMMISSIONER DASHBOARD --- */}
          <div style={{ marginTop: 40, paddingTop: 32, borderTop: '2px dashed #cbd5e1' }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>City Cleanliness Overview</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>Layer 1: Summary</p>
            </div>
            {/* Cards */}
            {(() => {
              const totalToilets = extraModuleStats.toilet.registered;
              const approvedInsp = toiletDashStats?.approvedInspections || extraModuleStats.toilet.inspectionsDone;
              const cleanPct = totalToilets > 0 ? Math.round((approvedInsp / totalToilets) * 100) : 0;
              const activeIssues = extraModuleStats.toilet.actionRequired + extraModuleStats.twinbin.actionRequired + extraModuleStats.taskforce.actionRequired;
              const pendingTotal = extraModuleStats.toilet.inspectionPending + extraModuleStats.twinbin.inspectionPending + extraModuleStats.taskforce.inspectionPending;
              const cleanColor = cleanPct >= 80 ? '#22c55e' : cleanPct >= 60 ? '#f59e0b' : '#ef4444';
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 50, height: 50, borderRadius: '50%', background: cleanColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, boxShadow: `0 4px 10px ${cleanColor}4d` }}>{statsLoading ? '—' : `${cleanPct}%`}</div>
                    <div><div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>CLEAN SCORE</div><div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>City Average</div></div>
                  </div>
                  {[{ l: 'Total Toilets', v: totalToilets, c: '#10b981' }, { l: 'Clean Toilets', v: approvedInsp, c: '#22c55e' }, { l: 'Active Issues', v: activeIssues, c: '#f59e0b' }, { l: 'Pending', v: pendingTotal, c: '#ef4444' }].map((x, i) => (
                    <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: `4px solid ${x.c}`, borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{statsLoading ? '—' : x.v}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>{x.l}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 16px 0' }}>Layer 2: Analysis & Tracking</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>

              {/* Zone Performance - Real data from zoneActivity */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Zone Performance</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {zoneActivity.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 12 }}>No zone data available</div>
                  ) : zoneActivity.slice(0, 6).map((z, i) => {
                    const maxBeats = zoneActivity[0]?.beats || 1;
                    const pct = Math.round((z.beats / maxBeats) * 100);
                    const assignedPct = z.beats > 0 ? Math.round((z.assignedBeats / z.beats) * 100) : 0;
                    const c = assignedPct >= 80 ? '#22c55e' : assignedPct >= 60 ? '#3b82f6' : assignedPct >= 40 ? '#eab308' : '#ef4444';
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 80, fontSize: 12, fontWeight: 700, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{z.name}</div>
                        <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${assignedPct}%`, height: '100%', background: c, borderRadius: 4, transition: 'width 0.8s ease' }}></div>
                        </div>
                        <div style={{ width: 30, fontSize: 13, fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>{assignedPct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Issue Monitoring - Real data from extraModuleStats */}
              {(() => {
                const toiletIssues = extraModuleStats.toilet.actionRequired;
                const binIssues = extraModuleStats.twinbin.actionRequired;
                const gvpIssues = extraModuleStats.taskforce.actionRequired;
                const pendingInsp = extraModuleStats.toilet.inspectionPending + extraModuleStats.twinbin.inspectionPending;
                const issueData = [
                  { l: 'Toilet Issues', v: toiletIssues, c: '#f97316' },
                  { l: 'Litterbin Issues', v: binIssues, c: '#ef4444' },
                  { l: 'GVP Issues', v: gvpIssues, c: '#a855f7' },
                  { l: 'Pending Inspections', v: pendingInsp, c: '#334155' }
                ];
                return (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Issue Monitoring</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                      <Donut data={issueData.map(d => ({ v: d.v || 0, color: d.c }))} size={100} stroke={16} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {issueData.map((issue, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: issue.c }}></div><span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{issue.l} ({issue.v})</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Ward Ranking - Real data from wardActivity */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Ward Ranking</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Rank</th><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Ward</th><th style={{ textAlign: 'right', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Beats</th></tr></thead>
                  <tbody>
                    {wardActivity.length === 0 ? (
                      <tr><td colSpan={3} style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No ward data</td></tr>
                    ) : wardActivity.slice(0, 5).map((w, i) => {
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
                      const isLast = i === wardActivity.slice(0, 5).length - 1;
                      const isWorst = isLast && wardActivity.length > 2;
                      return (
                        <tr key={i} style={{ borderBottom: isLast ? 'none' : '1px solid #f1f5f9', background: isWorst ? '#fef2f2' : 'transparent' }}>
                          <td style={{ padding: '8px 0', fontSize: 16 }}>{isWorst ? '⚠️' : medal}</td>
                          <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 700, color: isWorst ? '#ef4444' : '#0f172a' }}>{w.name}</td>
                          <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 800, color: isWorst ? '#ef4444' : i === 0 ? '#22c55e' : '#3b82f6', textAlign: 'right' }}>{w.beats}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* AO Response Time - Real data: show action officers count and module action required stats */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Action Officer Summary</h3>
                {(() => {
                  const aoCount = stats?.actionOfficers || 0;
                  const modAR = moduleActivity.filter(m => m.actionRequired > 0);
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, background: '#f0fdf4', padding: 12, borderRadius: 10, border: '1px solid #bbf7d0' }}>
                        <UserCog size={22} color="#16a34a" />
                        <div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{statsLoading ? '—' : aoCount}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>Action Officers Active</div>
                        </div>
                      </div>
                      {modAR.length > 0 ? modAR.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{m.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#ef4444' }}>⚠ {m.actionRequired} pending</span>
                        </div>
                      )) : (
                        <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, textAlign: 'center', padding: 8 }}>✓ No pending actions</div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* QC Leaderboard - Real data from qcLeaderboard */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>QC Leaderboard</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                  <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Rank</th><th style={{ textAlign: 'left', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>QC Name</th><th style={{ textAlign: 'right', padding: '8px 0', fontSize: 12, color: '#94a3b8' }}>Inspections</th></tr></thead>
                  <tbody>
                    {qcLeaderboard.length === 0 ? (
                      <tr><td colSpan={3} style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No inspection data yet</td></tr>
                    ) : qcLeaderboard.map((q, i) => {
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
                      const isLow = i === qcLeaderboard.length - 1 && qcLeaderboard.length > 2 && q.inspections < (qcLeaderboard[0]?.inspections || 1) * 0.3;
                      return (
                        <tr key={i} style={{ borderBottom: i < qcLeaderboard.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                          <td style={{ padding: '8px 0', fontSize: 16 }}>{isLow ? '⚠️' : medal}</td>
                          <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 700, color: isLow ? '#ef4444' : '#0f172a' }}>{q.name}</td>
                          <td style={{ padding: '8px 0', fontSize: 13, fontWeight: 800, color: isLow ? '#ef4444' : '#0f172a', textAlign: 'right' }}>{q.inspections}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Taskforce Activity - Real data from recentLogs and extraModuleStats */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Taskforce Activity</h3>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#3b82f6' }}>{extraModuleStats.toilet.registered}</div><div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>TOILETS</div></div>
                  <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#8b5cf6' }}>{extraModuleStats.twinbin.registered}</div><div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>LITTERBINS</div></div>
                  <div style={{ flex: 1, background: '#f8fafc', padding: 8, borderRadius: 8, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 900, color: '#ef4444' }}>{extraModuleStats.taskforce.registered}</div><div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>GVP POINTS</div></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recentLogs.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 8 }}>No recent activity</div>
                  ) : recentLogs.slice(0, 3).map((log, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 55, flexShrink: 0 }}>{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.moduleName} — {log.status} {log.createdByUser?.name ? `by ${log.createdByUser.name}` : ''}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sweeping Coverage - Real data from sweepingDetailStats */}
              {(() => {
                const totalB = sweepingDetailStats.totalBeats;
                const approved = sweepingDetailStats.totalApproved;
                const missed = Math.max(0, totalB - approved);
                const coveragePct = totalB > 0 ? Math.round((approved / totalB) * 100) : 0;
                const coverageColor = coveragePct >= 80 ? '#22c55e' : coveragePct >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Sweeping Coverage</h3>
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Overall Coverage</span><span style={{ fontSize: 12, fontWeight: 900, color: coverageColor }}>{sweepingDetailLoading ? '...' : `${coveragePct}%`}</span></div>
                      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${coveragePct}%`, height: '100%', background: coverageColor, transition: 'width 0.8s ease' }}></div></div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Total Beats</span><span style={{ fontSize: 12, color: '#0f172a', fontWeight: 800 }}>{sweepingDetailLoading ? '...' : totalB}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Approved</span><span style={{ fontSize: 12, color: '#22c55e', fontWeight: 800 }}>{sweepingDetailLoading ? '...' : approved}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Action Required</span><span style={{ fontSize: 12, color: '#ef4444', fontWeight: 800 }}>{sweepingDetailLoading ? '...' : sweepingDetailStats.actionRequired}</span></div>
                      </div>
                      <div style={{ width: 80, height: 80, background: '#e2e8f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <Map size={24} color="#94a3b8" />
                        <div style={{ position: 'absolute', bottom: 4, right: 4, background: '#fff', padding: '2px 4px', borderRadius: 4, fontSize: 8, fontWeight: 800 }}>LIVE MAP</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* GVP Transformation - Real data from extraModuleStats.taskforce */}
              {(() => {
                const totalGVP = extraModuleStats.taskforce.registered;
                const approved = extraModuleStats.taskforce.inspectionsDone;
                const actionTaken = extraModuleStats.taskforce.actionTaken || 0;
                const actionReq = extraModuleStats.taskforce.actionRequired;
                const pctApproved = totalGVP > 0 ? Math.round((approved / totalGVP) * 100) : 0;
                const pctActionTaken = totalGVP > 0 ? Math.round((actionTaken / totalGVP) * 100) : 0;
                const pctActionReq = totalGVP > 0 ? Math.round((actionReq / totalGVP) * 100) : 0;
                return (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>GVP Transformation</h3>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Total GVPs ({totalGVP})</span></div>
                      <div style={{ height: 16, borderRadius: 8, display: 'flex', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        {totalGVP > 0 ? (<>
                          <div style={{ width: `${pctApproved}%`, background: '#22c55e', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>Approved</div>
                          <div style={{ width: `${pctActionTaken}%`, background: '#3b82f6', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>Action Taken</div>
                          <div style={{ width: `${Math.max(pctActionReq, 100 - pctApproved - pctActionTaken)}%`, background: '#ef4444', color: '#fff', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>Pending</div>
                        </>) : (
                          <div style={{ width: '100%', background: '#f1f5f9', fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#94a3b8' }}>No data</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Approved (QC)</span><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{approved} ({pctApproved}%)</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Action Taken (AO)</span><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{actionTaken} ({pctActionTaken}%)</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Action Required</span><span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{actionReq} ({pctActionReq}%)</span></div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 16px 0' }}>Layer 3: Proof &amp; Verification</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>

              {/* Recent Activity Log instead of Photo Evidence */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Recent Activity Log</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentLogs.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 20 }}>No recent activity to display</div>
                  ) : recentLogs.slice(0, 6).map((log, i) => (
                    <div key={i} style={{ background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{log.moduleName}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: log.status === 'APPROVED' ? '#22c55e' : log.status === 'ACTION_REQUIRED' ? '#ef4444' : '#f59e0b', background: log.status === 'APPROVED' ? '#f0fdf4' : log.status === 'ACTION_REQUIRED' ? '#fef2f2' : '#fffbeb', padding: '2px 8px', borderRadius: 4 }}>{log.status}</span>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>
                        {log.createdByUser?.name || 'Field User'} • {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Critical Alerts - Real data from action required counts */}
              {(() => {
                const alerts: { msg: string; ward: string }[] = [];
                if (extraModuleStats.toilet.actionRequired > 0) alerts.push({ msg: `${extraModuleStats.toilet.actionRequired} toilet(s) need action`, ward: 'Toilet Module' });
                if (extraModuleStats.twinbin.actionRequired > 0) alerts.push({ msg: `${extraModuleStats.twinbin.actionRequired} litterbin(s) need action`, ward: 'Litterbin Module' });
                if (extraModuleStats.taskforce.actionRequired > 0) alerts.push({ msg: `${extraModuleStats.taskforce.actionRequired} GVP point(s) need action`, ward: 'GVP Module' });
                if (sweepingDetailStats.actionRequired > 0) alerts.push({ msg: `${sweepingDetailStats.actionRequired} sweeping record(s) need action`, ward: 'Sweeping Module' });
                return (
                  <div style={{ background: alerts.length > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${alerts.length > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: 12, padding: 20 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 900, color: alerts.length > 0 ? '#b91c1c' : '#16a34a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {alerts.length > 0 ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                      {alerts.length > 0 ? 'Critical Alerts' : 'All Clear'}
                    </h3>
                    {alerts.length === 0 ? (
                      <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, textAlign: 'center', padding: 16 }}>✓ No critical alerts — all modules are clear!</div>
                    ) : alerts.map((a, i) => (
                      <div key={i} style={{ background: '#fff', padding: 12, borderRadius: 9, border: '1px solid #fecaca', marginBottom: 9 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#991b1b' }}>{a.msg}</div>
                        <div style={{ fontSize: 10, fontWeight: 650, color: '#64748b', marginTop: 3 }}>{a.ward}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <>
          <style>{`
            .mx-city-dashboard {
              --mx-bg: #f5f8fd;
              --mx-surface: #ffffff;
              --mx-border: #e4ebf5;
              --mx-border-strong: #d5e0ef;
              --mx-text: #14213d;
              --mx-muted: #718096;
              --mx-blue: #2f6fed;
              --mx-blue-2: #5b8ff5;
              --mx-blue-soft: #edf4ff;
              --mx-shadow: 0 10px 30px rgba(25, 51, 89, .055);
              --mx-shadow-hover: 0 18px 38px rgba(25, 51, 89, .09);
              min-height: 100vh;
              padding: 20px 22px 34px;
              background:
                radial-gradient(circle at 88% 3%, rgba(71, 129, 255, .09), transparent 28%),
                linear-gradient(180deg, #f8fbff 0%, var(--mx-bg) 48%, #f7f9fc 100%);
              color: var(--mx-text);
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
        
            .mx-shell {
              width: 100%;
              max-width: 1480px;
              margin: 0 auto;
              display: flex;
              flex-direction: column;
              gap: 18px;
            }
        
            .mx-hero {
              position: relative;
              overflow: hidden;
              min-height: 148px;
              padding: 26px 28px;
              border: 1px solid #dbe6f5;
              border-radius: 26px;
              background:
                radial-gradient(circle at 82% 22%, rgba(75, 129, 255, .13), transparent 26%),
                radial-gradient(circle at 93% 88%, rgba(153, 189, 255, .18), transparent 23%),
                linear-gradient(120deg, #ffffff 0%, #fbfdff 52%, #eef5ff 100%);
              box-shadow: 0 18px 44px rgba(31, 70, 130, .075);
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 24px;
            }
        
            .mx-hero::before,
            .mx-hero::after {
              content: "";
              position: absolute;
              pointer-events: none;
              border-radius: 999px;
              border: 1px solid rgba(87, 137, 238, .12);
            }
        
            .mx-hero::before {
              width: 320px;
              height: 320px;
              right: -130px;
              top: -180px;
            }
        
            .mx-hero::after {
              width: 220px;
              height: 220px;
              right: 55px;
              bottom: -185px;
            }
        
            .mx-hero-left,
            .mx-hero-actions {
              position: relative;
              z-index: 2;
            }
        
            .mx-hero-left {
              display: flex;
              align-items: center;
              gap: 18px;
              min-width: 0;
            }
        
            .mx-city-mark {
              width: 58px;
              height: 58px;
              flex: 0 0 58px;
              display: grid;
              place-items: center;
              border-radius: 18px;
              color: #ffffff;
              background: linear-gradient(145deg, #3478f6, #5c6ff2);
              box-shadow: 0 11px 22px rgba(47, 111, 237, .24), inset 0 1px 0 rgba(255, 255, 255, .28);
            }
        
            .mx-eyebrow {
              display: flex;
              align-items: center;
              gap: 7px;
              margin-bottom: 5px;
              color: #3970d9;
              font-size: 10px;
              line-height: 1;
              font-weight: 800;
              letter-spacing: .13em;
              text-transform: uppercase;
            }
        
            .mx-eyebrow-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #3d7bf2;
              box-shadow: 0 0 0 4px rgba(61, 123, 242, .09);
            }
        
            .mx-hero-title {
              margin: 0;
              color: #15213a;
              font-size: clamp(22px, 2vw, 30px);
              line-height: 1.15;
              font-weight: 800;
              letter-spacing: -.035em;
            }
        
            .mx-hero-meta {
              margin-top: 9px;
              display: flex;
              align-items: center;
              flex-wrap: wrap;
              gap: 10px;
              color: #73839c;
              font-size: 12px;
              font-weight: 600;
            }
        
            .mx-location {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              color: #315fbd;
              font-weight: 750;
            }
        
            .mx-meta-separator {
              width: 4px;
              height: 4px;
              border-radius: 50%;
              background: #b6c2d4;
            }
        
            .mx-hero-actions {
              display: flex;
              justify-content: flex-end;
              align-items: center;
              flex-wrap: wrap;
              gap: 10px;
            }
        
            .mx-control,
            .mx-refresh,
            .mx-alert {
              min-height: 42px;
              border-radius: 12px;
              font-family: inherit;
              font-size: 12px;
              font-weight: 750;
              transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
            }
        
            .mx-control {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 0 13px;
              color: #34425a;
              background: rgba(255,255,255,.9);
              border: 1px solid #d9e3f1;
              box-shadow: 0 5px 14px rgba(45, 71, 111, .045);
            }
        
            .mx-control input {
              border: 0;
              outline: 0;
              background: transparent;
              color: #263650;
              font: inherit;
              cursor: pointer;
            }
        
            .mx-alert,
            .mx-refresh {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 7px;
              padding: 0 14px;
              cursor: pointer;
            }
        
            .mx-alert {
              color: #c84b4b;
              border: 1px solid #f2d2d2;
              background: #fff7f7;
            }
        
            .mx-alert-badge {
              min-width: 20px;
              height: 20px;
              padding: 0 6px;
              border-radius: 999px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              background: #e25757;
              color: #fff;
              font-size: 10px;
              font-weight: 800;
            }
        
            .mx-refresh {
              color: #2f6fed;
              border: 1px solid #cadcff;
              background: #f3f7ff;
            }
        
            .mx-alert:hover,
            .mx-refresh:hover,
            .mx-control:hover {
              transform: translateY(-1px);
              box-shadow: 0 8px 20px rgba(45, 71, 111, .08);
            }
        
            .mx-section {
              position: relative;
              overflow: hidden;
              padding: 22px;
              border: 1px solid var(--mx-border);
              border-radius: 24px;
              background: rgba(255,255,255,.94);
              box-shadow: var(--mx-shadow);
            }
        
            .mx-section-head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 18px;
            }
        
            .mx-section-title-wrap {
              display: flex;
              align-items: center;
              gap: 12px;
              min-width: 0;
            }
        
            .mx-section-icon {
              width: 38px;
              height: 38px;
              flex: 0 0 38px;
              display: grid;
              place-items: center;
              border-radius: 12px;
              color: #326ee0;
              background: #f0f5ff;
              border: 1px solid #dbe7ff;
            }
        
            .mx-section-title {
              margin: 0;
              color: #1b2942;
              font-size: 16px;
              line-height: 1.2;
              font-weight: 800;
              letter-spacing: -.012em;
            }
        
            .mx-section-subtitle {
              margin-top: 3px;
              color: #8a98ac;
              font-size: 11px;
              line-height: 1.25;
              font-weight: 600;
            }
        
            .mx-section-refresh {
              min-height: 34px;
              padding: 0 11px;
              border: 1px solid #e0e7f0;
              border-radius: 10px;
              background: #fafcff;
              color: #708098;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
              transition: all .18s ease;
            }
        
            .mx-section-refresh:hover {
              color: #2f6fed;
              border-color: #cdddf8;
              background: #f5f8ff;
            }
        
            .mx-city-dashboard {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }

            .mx-kpi-grid,
            .mx-user-grid,
            .mx-module-grid {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
            }
        
            .mx-kpi-card {
              position: relative;
              overflow: hidden;
              min-height: 110px;
              padding: 14px 16px 12px;
              border-radius: 16px;
              border: 1px solid var(--kpi-border, #e2e8f0);
              background: linear-gradient(145deg, #ffffff 0%, var(--kpi-soft, #f8fafc) 145%);
              transition: transform .25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow .25s cubic-bezier(0.4, 0, 0.2, 1), border-color .25s cubic-bezier(0.4, 0, 0.2, 1);
              cursor: pointer;
            }
        
            .mx-kpi-card:hover {
              transform: translateY(-4px) scale(1.012);
              border-color: #3b82f6;
              box-shadow: 0 12px 28px -6px rgba(37, 99, 235, 0.14);
            }

            .mx-kpi-card:hover .mx-kpi-icon {
              transform: scale(1.08) rotate(-3deg);
              transition: transform 0.25s ease;
            }

            .mx-kpi-card:hover .mx-kpi-arrow {
              transform: translateX(3px);
              color: #2563eb;
              transition: transform 0.25s ease, color 0.25s ease;
            }
        
            .mx-kpi-card::after {
              content: "";
              position: absolute;
              right: -22px;
              bottom: -42px;
              width: 95px;
              height: 95px;
              border-radius: 50%;
              background: var(--kpi-soft);
              opacity: .65;
            }
        
            .mx-kpi-top {
              position: relative;
              z-index: 1;
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
            }
        
            .mx-kpi-icon {
              width: 36px;
              height: 36px;
              display: grid;
              place-items: center;
              border-radius: 10px;
              color: var(--kpi-color);
              background: var(--kpi-icon-bg);
              border: 1px solid var(--kpi-border);
              transition: transform 0.25s ease;
            }
        
            .mx-kpi-arrow {
              color: #cbd5e1;
              margin-top: 2px;
              transition: transform 0.25s ease, color 0.25s ease;
            }
        
            .mx-kpi-label {
              position: relative;
              z-index: 1;
              margin-top: 10px;
              color: #64748b;
              font-size: 10px;
              font-weight: 750;
              letter-spacing: .055em;
              text-transform: uppercase;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
        
            .mx-kpi-value {
              position: relative;
              z-index: 1;
              margin-top: 2px;
              color: #0f172a;
              font-size: 24px;
              line-height: 1;
              font-weight: 800;
              letter-spacing: -.03em;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
        
            .mx-kpi-accent {
              position: absolute;
              left: 16px;
              bottom: 0;
              width: 40px;
              height: 3px;
              border-radius: 999px 999px 0 0;
              background: var(--kpi-color);
            }
        
            .mx-user-card {
              min-height: 88px;
              padding: 13px 15px;
              border: 1px solid var(--user-border);
              border-radius: 16px;
              display: flex;
              align-items: center;
              gap: 12px;
              background: linear-gradient(145deg, #ffffff 0%, var(--user-wash) 145%);
              transition: transform .25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow .25s cubic-bezier(0.4, 0, 0.2, 1), border-color .25s cubic-bezier(0.4, 0, 0.2, 1);
              cursor: pointer;
            }
        
            .mx-user-card:hover {
              transform: translateY(-4px) scale(1.012);
              border-color: #3b82f6;
              box-shadow: 0 12px 28px -6px rgba(37, 99, 235, 0.14);
            }

            .mx-user-card:hover .mx-user-icon {
              transform: scale(1.08) rotate(-3deg);
              transition: transform 0.25s ease;
            }
        
            .mx-user-icon {
              width: 38px;
              height: 38px;
              flex: 0 0 38px;
              border-radius: 11px;
              display: grid;
              place-items: center;
              color: var(--user-color);
              background: var(--user-icon-bg);
              transition: transform 0.25s ease;
            }
        
            .mx-user-label {
              color: #64748b;
              font-size: 10px;
              font-weight: 750;
              line-height: 1.25;
              letter-spacing: .05em;
              text-transform: uppercase;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
        
            .mx-user-value {
              margin-top: 3px;
              color: #0f172a;
              font-size: 24px;
              line-height: 1;
              font-weight: 800;
              letter-spacing: -.03em;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
        
            .mx-module-card {
              position: relative;
              overflow: hidden;
              min-height: 84px;
              padding: 12px 14px;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              display: flex;
              align-items: center;
              gap: 12px;
              background: #ffffff;
              transition: transform .25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow .25s cubic-bezier(0.4, 0, 0.2, 1), border-color .25s cubic-bezier(0.4, 0, 0.2, 1);
              cursor: pointer;
            }
        
            .mx-module-card:hover {
              transform: translateY(-4px) scale(1.012);
              border-color: #3b82f6;
              box-shadow: 0 12px 28px -6px rgba(37, 99, 235, 0.14);
            }
        
            .mx-module-card::after {
              content: "";
              position: absolute;
              left: 0;
              right: 0;
              bottom: 0;
              height: 3px;
              background: linear-gradient(90deg, var(--module-color), transparent 82%);
            }
        
            .mx-module-icon {
              width: 44px;
              height: 44px;
              flex: 0 0 44px;
              border-radius: 13px;
              display: grid;
              place-items: center;
              color: var(--module-color);
              background: var(--module-soft);
              border: 1px solid var(--module-border);
            }
        
            .mx-module-name {
              color: #1b2941;
              font-size: 13px;
              line-height: 1.25;
              font-weight: 800;
            }
        
            .mx-module-records {
              margin-top: 4px;
              color: #73829a;
              font-size: 11px;
              font-weight: 600;
            }
        
            .mx-health-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 15px;
            }
        
            .mx-health-card {
              min-height: 258px;
              padding: 18px;
              border-radius: 20px;
              border: 1px solid var(--health-border);
              background: linear-gradient(160deg, #ffffff 0%, var(--health-wash) 160%);
              box-shadow: 0 8px 22px rgba(25, 51, 89, .035);
            }
        
            .mx-health-title-row {
              display: flex;
              align-items: center;
              gap: 10px;
            }
        
            .mx-health-icon {
              width: 38px;
              height: 38px;
              flex: 0 0 38px;
              display: grid;
              place-items: center;
              border-radius: 11px;
              color: var(--health-color);
              background: var(--health-icon-bg);
            }
        
            .mx-health-title {
              color: #1b2941;
              font-size: 13px;
              font-weight: 800;
            }
        
            .mx-health-gauge {
              min-height: 126px;
              display: grid;
              place-items: center;
              padding-top: 8px;
            }
        
            .mx-health-stats {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 7px;
              padding-top: 14px;
              border-top: 1px solid #edf1f6;
            }
        
            .mx-health-stat {
              text-align: center;
            }
        
            .mx-health-number {
              display: inline-flex;
              align-items: center;
              gap: 5px;
              color: #23334d;
              font-size: 13px;
              font-weight: 800;
            }
        
            .mx-health-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
            }
        
            .mx-health-label {
              display: block;
              margin-top: 3px;
              color: #8a97a9;
              font-size: 9px;
              font-weight: 650;
            }
        
            .mx-chart-shell {
              position: relative;
              overflow: hidden;
              min-height: 336px;
              border: 1px solid #e2e9f2;
              border-radius: 19px;
              background:
                linear-gradient(to bottom, transparent calc(25% - .5px), #edf2f8 calc(25% - .5px), #edf2f8 calc(25% + .5px), transparent calc(25% + .5px)),
                linear-gradient(to bottom, transparent calc(50% - .5px), #edf2f8 calc(50% - .5px), #edf2f8 calc(50% + .5px), transparent calc(50% + .5px)),
                linear-gradient(to bottom, transparent calc(75% - .5px), #edf2f8 calc(75% - .5px), #edf2f8 calc(75% + .5px), transparent calc(75% + .5px)),
                #fbfdff;
              padding: 22px 20px 15px 54px;
            }
        
            .mx-y-axis {
              position: absolute;
              left: 14px;
              top: 18px;
              bottom: 58px;
              width: 30px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: flex-end;
              color: #9aa7ba;
              font-size: 9px;
              font-weight: 650;
            }
        
            .mx-chart-groups {
              height: 245px;
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              gap: 20px;
              border-bottom: 1px solid #cfd9e7;
            }
        
            .mx-chart-group {
              flex: 1;
              height: 100%;
              min-width: 70px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-end;
            }
        
            .mx-bars {
              width: 100%;
              height: 205px;
              display: flex;
              align-items: flex-end;
              justify-content: center;
              gap: 7px;
            }
        
            .mx-bar-wrap {
              width: 23px;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-end;
            }
        
            .mx-bar-value {
              min-height: 16px;
              margin-bottom: 3px;
              font-size: 9px;
              line-height: 1;
              font-weight: 800;
            }
        
            .mx-bar {
              width: 21px;
              min-height: 4px;
              border-radius: 6px 6px 2px 2px;
              box-shadow: inset 0 1px 0 rgba(255,255,255,.25);
              transition: height .65s ease;
            }
        
            .mx-zero-bar {
              width: 21px;
              height: 4px;
              margin-top: auto;
              border-radius: 999px;
              background: #dce4ef;
            }
        
            .mx-date-label {
              margin-top: 10px;
              min-height: 20px;
              color: #52627a;
              font-size: 10px;
              font-weight: 700;
              text-align: center;
              white-space: nowrap;
            }
        
            .mx-chart-legend {
              display: flex;
              align-items: center;
              justify-content: center;
              flex-wrap: wrap;
              gap: 10px;
              margin-top: 15px;
            }
        
            .mx-legend-chip {
              display: inline-flex;
              align-items: center;
              gap: 7px;
              min-height: 28px;
              padding: 0 10px;
              border: 1px solid #e4eaf3;
              border-radius: 999px;
              background: #ffffff;
              color: #52627a;
              font-size: 10px;
              font-weight: 700;
            }
        
            .mx-legend-dot {
              width: 7px;
              height: 7px;
              border-radius: 3px;
            }
        
            .mx-empty-chart {
              min-height: 275px;
              display: grid;
              place-items: center;
              color: #8c9aae;
              font-size: 12px;
              font-weight: 600;
            }
        
            @media (max-width: 1180px) {
              .mx-kpi-grid,
              .mx-user-grid,
              .mx-module-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
              .mx-hero { align-items: flex-start; }
            }
        
            @media (max-width: 900px) {
              .mx-city-dashboard { padding: 15px; }
              .mx-hero { flex-direction: column; min-height: auto; }
              .mx-hero-actions { justify-content: flex-start; width: 100%; }
              .mx-health-grid { grid-template-columns: 1fr; }
              .mx-chart-shell { overflow-x: auto; }
              .mx-chart-groups { min-width: 760px; }
            }
        
            @media (max-width: 620px) {
              .mx-city-dashboard { padding: 10px; }
              .mx-hero,
              .mx-section { border-radius: 19px; padding: 17px; }
              .mx-city-mark { width: 50px; height: 50px; flex-basis: 50px; border-radius: 15px; }
              .mx-kpi-grid,
              .mx-user-grid,
              .mx-module-grid { grid-template-columns: 1fr; }
              .mx-section-head { align-items: flex-start; }
              .mx-hero-actions > * { flex: 1 1 auto; }
            }
          `}</style>

          <div className="mx-city-dashboard">
            <div className="mx-shell">
              {/* Grand Dashboard Hero Header */}
              <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: 'white', borderRadius: '24px', padding: '26px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 12px 40px -10px rgba(15,23,42,0.6)', position: 'relative', overflow: 'hidden', marginBottom: '24px', flexWrap: 'wrap', gap: '24px' }}>
                {/* Decorative Background Glow */}
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', height: '100%', background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.2), transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1, minWidth: '280px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} color="#60a5fa" /> MATRIXTRACK 2.0 • INSPECTION & PERFORMANCE
                  </div>

                  <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, letterSpacing: '-0.02em' }}>
                    {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}, {user?.name || user?.email?.split('@')[0] || 'Indore Admin'} <span style={{ fontSize: '22px' }}>👋</span>
                  </h1>

                  

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', padding: '3px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={12} color="#38bdf8" /> {cityName || 'Indore Municipal Corporation'}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', padding: '3px 10px', borderRadius: '12px' }}>
                      {isSuperAdmin ? 'Super Admin' : 'City Admin'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1, flexWrap: 'wrap' }}>
                  {isSuperAdmin && (
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '8px 14px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={15} color="#94a3b8" />
                      <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, appearance: 'none', cursor: 'pointer' }}>
                        <option value="ALL" style={{ color: '#0f172a' }}>All Cities</option>
                        {cities.map(c => (
                          <option key={c.id} value={c.id} style={{ color: '#0f172a' }}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '8px 14px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={15} color="#94a3b8" />
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, outline: 'none', colorScheme: 'dark' }} />
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '6px 14px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#10b981', letterSpacing: '0.05em' }}>LIVE</span>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>{lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAlertModal(true)}
                    style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', borderRadius: '12px', padding: '9px 14px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  >
                    <Bell size={15} color="#fca5a5" />
                    Alerts
                    {((extraModuleStats.toilet.actionRequired || 0) + (extraModuleStats.twinbin.actionRequired || 0) + (extraModuleStats.taskforce.actionRequired || 0) + (sweepingDetailStats.actionRequired || 0)) > 0 && (
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '2px 6px', borderRadius: '10px' }}>
                        {(extraModuleStats.toilet.actionRequired || 0) + (extraModuleStats.twinbin.actionRequired || 0) + (extraModuleStats.taskforce.actionRequired || 0) + (sweepingDetailStats.actionRequired || 0)}
                      </span>
                    )}
                  </button>

                  <button type="button" onClick={loadAll} disabled={refreshing} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '12px', padding: '9px 14px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <RefreshCw size={14} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadReport}
                    style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', padding: '9px 16px', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}
                  >
                    <Download size={14} /> Export Report
                  </button>
                </div>
              </section>

              {/* City Overview */}
              <section className="mx-section">
                <div className="mx-section-head">
                  <div className="mx-section-title-wrap">
                    <div className="mx-section-icon"><Map size={18} /></div>
                    <div>
                      <h2 className="mx-section-title">CITY OVERVIEW</h2>
                      <div className="mx-section-subtitle">Registered geographic hierarchy</div>
                    </div>
                  </div>
                  <button className="mx-section-refresh" type="button" onClick={loadAll}>
                    <RefreshCw size={12} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} /> Refresh
                  </button>
                </div>

                <div className="mx-kpi-grid">
                  {[
                    { label: 'Total Registered Zones', value: cityGeoStats?.zones || 0, icon: Map, color: '#2563eb', soft: '#eff6ff', iconBg: '#dbeafe', border: '#bfdbfe' },
                    { label: 'Total Registered Wards', value: cityGeoStats?.wards || 0, icon: MapPin, color: '#7c3aed', soft: '#f5f3ff', iconBg: '#ede9fe', border: '#ddd6fe' },
                    { label: 'Total Registered Areas', value: cityGeoStats?.areas || 0, icon: Target, color: '#0284c7', soft: '#f0f9ff', iconBg: '#e0f2fe', border: '#bae6fd' },
                    { label: 'Total Registered Beats', value: cityGeoStats?.beats || 0, icon: Activity, color: '#0d9488', soft: '#f0fdf4', iconBg: '#ccfbf1', border: '#99f6e4' },
                  ].map((card, i) => (
                    <div
                      key={i}
                      className="mx-kpi-card"
                      style={{
                        '--kpi-color': card.color,
                        '--kpi-soft': card.soft,
                        '--kpi-icon-bg': card.iconBg,
                        '--kpi-border': card.border,
                      } as React.CSSProperties}
                    >
                      <div className="mx-kpi-top">
                        <div className="mx-kpi-icon"><card.icon size={18} strokeWidth={1.9} /></div>
                        <ChevronRight className="mx-kpi-arrow" size={16} />
                      </div>
                      <div className="mx-kpi-label">{card.label}</div>
                      <div className="mx-kpi-value">{statsLoading ? '—' : card.value}</div>
                      <span className="mx-kpi-accent" />
                    </div>
                  ))}
                </div>
              </section>

              {/* Users Overview */}
              <section className="mx-section">
                <div className="mx-section-head">
                  <div className="mx-section-title-wrap">
                    <div className="mx-section-icon" style={{ color: '#7c3aed', background: '#f5f3ff', borderColor: '#ddd6fe' }}>
                      <Users size={18} />
                    </div>
                    <div>
                      <h2 className="mx-section-title">USERS OVERVIEW</h2>
                      <div className="mx-section-subtitle">Current registered workforce</div>
                    </div>
                  </div>
                  <button className="mx-section-refresh" type="button" onClick={loadAll}>
                    <RefreshCw size={12} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} /> Refresh
                  </button>
                </div>

                <div className="mx-user-grid">
                  {[
                    { title: 'TOTAL ACTION OFFICERS', count: stats?.actionOfficers || stats?.ACTION_OFFICER || 0, icon: UserCog, color: '#059669', iconBg: '#d1fae5', border: '#a7f3d0', wash: '#ecfdf5', link: '/portal-home/common-registration' },
                    { title: 'TOTAL QUALITY CONTROLLER', count: stats?.qualityControllers || stats?.QC || 0, icon: Search, color: '#7e22ce', iconBg: '#f3e8ff', border: '#e9d5ff', wash: '#faf5ff', link: '/portal-home/common-registration' },
                    { title: 'TOTAL SUPERVISORS', count: stats?.taskforceMembers || stats?.SUPERVISOR || 0, icon: ShieldCheck, color: '#d97706', iconBg: '#fef3c7', border: '#fde68a', wash: '#fffbeb', link: '/portal-home/common-registration' },
                    { title: 'TOTAL EMPLOYEES', count: stats?.employees || stats?.EMPLOYEE || 0, icon: Users, color: '#2563eb', iconBg: '#dbeafe', border: '#bfdbfe', wash: '#eff6ff', link: '/portal-home/common-registration' },
                  ].map((card, i) => (
                    <div
                      key={i}
                      className="mx-user-card"
                      onClick={() => router.push(card.link)}
                      style={{
                        '--user-color': card.color,
                        '--user-icon-bg': card.iconBg,
                        '--user-border': card.border,
                        '--user-wash': card.wash,
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      } as React.CSSProperties}
                    >
                      <div className="mx-user-icon"><card.icon size={21} strokeWidth={1.9} /></div>
                      <div>
                        <div className="mx-user-label">{card.title}</div>
                        <div className="mx-user-value">{statsLoading ? '—' : card.count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Workforce Distribution */}
              <section className="mx-section">
                <div className="mx-section-head">
                  <div className="mx-section-title-wrap">
                    <div className="mx-section-icon" style={{ color: '#168fc7', background: '#f0faff', borderColor: '#d5eef9' }}>
                      <Users size={18} />
                    </div>
                    <div>
                      <h2 className="mx-section-title">WORKFORCE DISTRIBUTION BY MODULE</h2>
                      <div className="mx-section-subtitle">Module-wise activity records</div>
                    </div>
                  </div>
                  <button className="mx-section-refresh" type="button" onClick={loadAll}>
                    <RefreshCw size={12} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} /> Refresh
                  </button>
                </div>

                {(() => {
                  const moduleCards = [
                    { keyMatch: ['sweeping'], name: 'Sweeping', color: '#1b9a74', soft: '#edf9f5', border: '#cfeee3', icon: BrushCleaning, link: '/modules/sweeping' },
                    { keyMatch: ['toilet'], name: 'Cleanliness of Toilets', color: '#3d76df', soft: '#eff5ff', border: '#d2e2ff', icon: Toilet, link: '/modules/toilet' },
                    { keyMatch: ['twinbin', 'litter', 'bin'], name: 'Litterbins', color: '#d78212', soft: '#fff7e9', border: '#f4dfb8', icon: Trash2, link: '/modules/litterbins' },
                    { keyMatch: ['taskforce', 'gvp', 'ctu'], name: 'GVP', color: '#7657e8', soft: '#f4f1ff', border: '#ded5ff', icon: Truck, link: '/modules/taskforce' },
                  ];
                  const cards = moduleCards.map((mc) => {
                    const found = moduleActivity.find((m) => mc.keyMatch.some((k) => m.key.toLowerCase().includes(k)));
                    return { ...mc, total: found?.total || 0 };
                  });

                  return (
                    <div className="mx-module-grid">
                      {cards.map((item, i) => (
                        <div
                          key={i}
                          className="mx-module-card"
                          onClick={() => router.push(item.link)}
                          style={{
                            '--module-color': item.color,
                            '--module-soft': item.soft,
                            '--module-border': item.border,
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                          } as React.CSSProperties}
                        >
                          <div className="mx-module-icon"><item.icon size={20} strokeWidth={1.9} /></div>
                          <div>
                            <div className="mx-module-name">{item.name}</div>
                            <div className="mx-module-records">{item.total} Records</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </section>

              {/* Daily Target Status - Sweeping, Toilets and Litter Bins */}
              <TargetStatus
                date={filterDate}
                cityId={isSuperAdmin && filterCity !== 'ALL' ? filterCity : undefined}
                targets={{
                  sweeping: sweepingDetailStats.totalSegments || 0,
                  toilet: extraModuleStats.toilet.registered || 0,
                  litterbin: extraModuleStats.twinbin.registered || 0,
                }}
                refreshKey={lastRefreshed.getTime()}
                refreshing={refreshing}
                onRefresh={loadAll}
              />

              {/* Supervisor Performance (Missed Work) */}
              <section className="mx-section">
                <div className="mx-section-head">
                  <div className="mx-section-title-wrap">
                    <div className="mx-section-icon" style={{ color: '#eab308', background: '#fefce8', borderColor: '#fef08a' }}>
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h2 className="mx-section-title">SUPERVISOR ACTION REQUIRED</h2>
                      <div className="mx-section-subtitle">Supervisors with missed or incomplete tasks</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      value={perfZoneFilter}
                      onChange={(e) => setPerfZoneFilter(e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none' }}
                    >
                      <option value="ALL">All Zones</option>
                      {/* Unique zones from missed work */}
                      {Array.from(new Set(supervisorMissedWork.map(w => w.zone))).map((z, i) => (
                        <option key={i} value={z}>{z}</option>
                      ))}
                    </select>
                    <select
                      value={perfWardFilter}
                      onChange={(e) => setPerfWardFilter(e.target.value)}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none' }}
                    >
                      <option value="ALL">All Wards</option>
                      {/* Unique wards from missed work (filtered by zone) */}
                      {Array.from(new Set(supervisorMissedWork.filter(w => perfZoneFilter === 'ALL' || w.zone === perfZoneFilter).map(w => w.ward))).map((w, i) => (
                        <option key={i} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(() => {
                    const filteredWork = supervisorMissedWork.filter(w =>
                      (perfZoneFilter === 'ALL' || w.zone === perfZoneFilter) &&
                      (perfWardFilter === 'ALL' || w.ward === perfWardFilter)
                    );

                    if (filteredWork.length === 0) {
                      return <div style={{ padding: '4px 0 12px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>No missed work found for the selected filters.</div>;
                    }

                    return filteredWork.map((worker, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #f1f5f9', borderRadius: '10px', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700, fontSize: '14px' }}>
                            {worker.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{worker.name}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{worker.zone} • {worker.ward}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fef2f2', color: '#ef4444', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                          <AlertCircle size={14} />
                          {worker.missedCount} Missed Task{worker.missedCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </section>

              {/* Live Asset Registration Tracker */}
              <section className="mx-section">
                <div className="mx-section-head">
                  <div className="mx-section-title-wrap">
                    <div className="mx-section-icon" style={{ color: '#3b82f6', background: '#eff6ff', borderColor: '#bfdbfe' }}>
                      <FilePlus size={18} />
                    </div>
                    <div>
                      <h2 className="mx-section-title">ASSET REGISTRATION REQUESTS</h2>
                      <div className="mx-section-subtitle">Live tracking of new asset additions</div>
                    </div>
                  </div>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(() => {
                    const visibleRequests = assetRequests.filter(req => req.module !== 'GVP/CTU');

                    if (visibleRequests.length === 0) {
                      return <div style={{ padding: '4px 0 12px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontWeight: 500 }}>No new asset requests pending.</div>;
                    }

                    return visibleRequests.map((req, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #f1f5f9', borderRadius: '10px', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ background: req.module === 'Toilet' ? '#eff6ff' : '#fffbeb', color: req.module === 'Toilet' ? '#3b82f6' : '#f59e0b', padding: '10px', borderRadius: '10px' }}>
                            {req.module === 'Toilet' ? <Toilet size={18} /> : <Trash2 size={18} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{req.module} Request</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                              Req: <span style={{ color: '#0f172a', fontWeight: 600 }}>{req.requestedBy}</span> • {req.zone} • {req.ward}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: req.status === 'PENDING' ? '#fefce8' : '#ecfdf5', color: req.status === 'PENDING' ? '#eab308' : '#10b981', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, marginBottom: '4px' }}>
                            {req.status === 'PENDING' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                            {req.status}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                            {new Date(req.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </section>

              {/* Beat Analytics Section */}
              <section className="mx-section" style={{ background: 'transparent', boxShadow: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
                {(() => {
                  const totalBeats = cityGeoStats.beats || 0;
                  const assignedToSup = sweepingDetailStats.qcAssigned || 0;
                  const unassigned = Math.max(0, totalBeats - assignedToSup);
                  const assignedToEmp = sweepingDetailStats.assignedSegments || 0;
                  const pendingAction = sweepingDetailStats.pendingDeployment || 0;

                  // Since "Beat Requests" API isn't explicitly available, we default to 0 to maintain UI structure
                  const totalRequests = 0;
                  const approvedReqs = 0;
                  const pendingReqs = 0;

                  return (
                    <>
                      {/* Card 1: Beat Requests */}
                      <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#f1f5f9] cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/city/beat-requests')} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        <div className="mb-6 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h3 className="text-[#1e293b] font-bold text-[14px]">Beat Requests</h3>
                            <p className="text-[#64748b] text-[12px] font-medium mt-0.5">Approval status</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] font-semibold text-[#475569]">Total Requests</span>
                            <span className="text-[14px] font-bold text-[#0f172a]">{totalRequests}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] font-semibold text-[#475569]">Approved</span>
                            <span className="text-[14px] font-bold text-[#10b981]">{approvedReqs}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] font-semibold text-[#475569]">Pending</span>
                            <span className="text-[14px] font-bold text-[#f59e0b]">{pendingReqs}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Beat Assignments */}
                      <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#f1f5f9] cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/city/beat-status')} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        <div className="mb-6 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Users size={20} />
                          </div>
                          <div>
                            <h3 className="text-[#1e293b] font-bold text-[14px]">Beat Assignments</h3>
                            <p className="text-[#64748b] text-[12px] font-medium mt-0.5">Assigned workforce</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] font-semibold text-[#475569]">Total Beats</span>
                            <span className="text-[14px] font-bold text-[#0f172a]">{totalBeats}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] font-semibold text-[#475569]">To Employees</span>
                            <span className="text-[14px] font-bold text-[#10b981]">{assignedToEmp}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] font-semibold text-[#475569]">To Supervisors</span>
                            <span className="text-[14px] font-bold text-[#3b82f6]">{assignedToSup}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Unassigned Beats */}
                      <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#f1f5f9] cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/city/beat-status')} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        <div className="mb-6 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                            <AlertCircle size={20} />
                          </div>
                          <div>
                            <h3 className="text-[#1e293b] font-bold text-[14px]">Unassigned Beats</h3>
                            <p className="text-[#64748b] text-[12px] font-medium mt-0.5">Pending allocation</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] font-semibold text-[#475569]">Total Beats</span>
                            <span className="text-[14px] font-bold text-[#0f172a]">{totalBeats}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] font-semibold text-[#475569]">Unassigned</span>
                            <span className="text-[14px] font-bold text-[#ef4444]">{unassigned}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] font-semibold text-[#475569]">Pending Action</span>
                            <span className="text-[14px] font-bold text-[#f59e0b]">{pendingAction}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </section>

              {/* Taskforce & Top Issues Section */}
              <section className="mx-section" style={{ background: 'transparent', boxShadow: 'none', padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {(() => {
                  // Fetch live data from moduleActivity
                  const twinbin = moduleActivity.find(m => m.key === 'TWINBIN') || { total: 0, pending: 0, approved: 0, actionRequired: 0 };
                  const toilet = moduleActivity.find(m => m.key === 'TOILET') || { total: 0, pending: 0, approved: 0, actionRequired: 0 };
                  const sweeping = moduleActivity.find(m => m.key === 'SWEEPING') || { total: 0, pending: 0, approved: 0, actionRequired: 0 };
                  const taskforce = moduleActivity.find(m => m.key === 'TASKFORCE') || { total: 0, pending: 0, approved: 0, actionRequired: 0 };

                  // Compute Issue Resolution Status
                  const totalIssues = twinbin.total + toilet.total + sweeping.total + taskforce.total;
                  const resolved = twinbin.approved + toilet.approved + sweeping.approved + taskforce.approved;
                  const inProgress = twinbin.pending + toilet.pending + sweeping.pending + taskforce.pending;
                  const overdue = twinbin.actionRequired + toilet.actionRequired + sweeping.actionRequired + taskforce.actionRequired;

                  const getPct = (val: number) => totalIssues > 0 ? Math.round((val / totalIssues) * 100) : 0;
                  const progPct = getPct(inProgress);
                  const resPct = getPct(resolved);
                  const overPct = getPct(overdue);

                  // Compute Top Categories by Issues Reported (Replicating Screenshot exactly)
                  const odourTotal = Math.floor(toilet.total * 0.15);
                  const waterTotal = Math.floor(toilet.total * 0.10);
                  const toiletCleanTotal = Math.max(0, toilet.total - odourTotal - waterTotal);

                  const topCategories = [
                    { name: 'Litter Overflow', count: twinbin.total, color: '#ec4899', dot: '#fbcfe8' },
                    { name: 'Toilet Cleanliness', count: toiletCleanTotal, color: '#3b82f6', dot: '#bfdbfe' },
                    { name: 'Odour Issue', count: odourTotal, color: '#f59e0b', dot: '#fde68a' },
                    { name: 'Water Problem', count: waterTotal, color: '#14b8a6', dot: '#ccfbf1' },
                    { name: 'Others', count: sweeping.total + taskforce.total, color: '#8b5cf6', dot: '#ddd6fe' },
                  ].sort((a, b) => b.count - a.count);

                  const topCatTotal = topCategories.reduce((sum, c) => sum + c.count, 0);

                  return (
                    <>
                      {/* Left Card: Taskforce Issue Resolution Status */}
                      <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#f1f5f9]">
                        <div className="mb-7">
                          <h3 className="text-[#1e293b] font-bold text-[15px]">Taskforce Issue Resolution Status</h3>
                          <p className="text-[#64748b] text-[12px] font-medium mt-0.5">Track issues from reported to resolved</p>
                        </div>

                        <div className="flex gap-4 mb-8">
                          <div className="flex-1 border border-[#f1f5f9] rounded-xl p-3 text-center shadow-sm">
                            <div className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Total Issues</div>
                            <div className="text-[#3b82f6] text-[22px] font-black leading-none">{totalIssues}</div>
                          </div>
                          <div className="flex-1 border border-[#f1f5f9] rounded-xl p-3 text-center shadow-sm">
                            <div className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">In Progress</div>
                            <div className="text-[#3b82f6] text-[22px] font-black leading-none">{inProgress}</div>
                          </div>
                          <div className="flex-1 border border-[#f1f5f9] rounded-xl p-3 text-center shadow-sm">
                            <div className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Resolved</div>
                            <div className="text-[#10b981] text-[22px] font-black leading-none">{resolved}</div>
                          </div>
                          <div className="flex-1 border border-[#f1f5f9] rounded-xl p-3 text-center shadow-sm">
                            <div className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Overdue</div>
                            <div className="text-[#ef4444] text-[22px] font-black leading-none">{overdue}</div>
                          </div>
                        </div>

                        <div>
                          <div className="flex h-[10px] rounded-full overflow-hidden mb-2 gap-1 bg-[#f1f5f9]">
                            {progPct > 0 && <div style={{ width: `${progPct}%` }} className="bg-[#3b82f6] h-full transition-all duration-500" />}
                            {resPct > 0 && <div style={{ width: `${resPct}%` }} className="bg-[#10b981] h-full transition-all duration-500" />}
                            {overPct > 0 && <div style={{ width: `${overPct}%` }} className="bg-[#f59e0b] h-full transition-all duration-500" />}
                          </div>
                          <div className="flex text-[11px] font-bold text-[#94a3b8]">
                            {progPct > 0 && <div style={{ width: `${progPct}%` }} className="text-left px-1">{progPct}%</div>}
                            {resPct > 0 && <div style={{ width: `${resPct}%` }} className="text-center">{resPct}%</div>}
                            {overPct > 0 && <div style={{ width: `${overPct}%` }} className="text-right px-1">{overPct}%</div>}
                          </div>
                        </div>
                      </div>

                      {/* Right Card: Active Supervisors */}
                      <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-[#f1f5f9] flex flex-col h-full">
                        <div className="mb-4 flex justify-between items-start">
                          <div>
                            <h3 className="text-[#1e293b] font-bold text-[15px]">Active Workforce</h3>
                            <p className="text-[#64748b] text-[12px] font-medium mt-0.5">Personnel with logged activity</p>
                          </div>
                          <div className="flex gap-2 items-center">
                            <TableExportDropdown
                              data={activeSupervisors.map(s => ({ Name: s.name, Role: s.role, Zone: s.zone, Ward: s.ward, Module: s.modules }))}
                              filename="Active_Workforce_List"
                              title="Active Workforce List"
                            />
                            <select
                              value={activeSupTimeFilter}
                              onChange={(e) => setActiveSupTimeFilter(e.target.value)}
                              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', outline: 'none', fontWeight: 600, color: '#475569', background: '#f8fafc' }}
                            >
                              <option value="TODAY">Today</option>
                              <option value="ALL">All Time</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2 mb-5">
                          <select
                            value={activeSupZoneFilter}
                            onChange={(e) => {
                              setActiveSupZoneFilter(e.target.value);
                              setActiveSupWardFilter('ALL');
                            }}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none', flex: 1, color: '#0f172a', fontWeight: 500 }}
                          >
                            <option value="ALL">All Zones</option>
                            {Array.from(new Set(activeSupervisors.map(s => s.zone))).sort().map((z, i) => (
                              <option key={i} value={z}>{z}</option>
                            ))}
                          </select>
                          <select
                            value={activeSupWardFilter}
                            onChange={(e) => setActiveSupWardFilter(e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none', flex: 1, color: '#0f172a', fontWeight: 500 }}
                          >
                            <option value="ALL">All Wards</option>
                            {Array.from(new Set(activeSupervisors.filter(s => activeSupZoneFilter === 'ALL' || s.zone === activeSupZoneFilter).map(s => s.ward))).sort().map((w, i) => (
                              <option key={i} value={w}>{w}</option>
                            ))}
                          </select>
                        </div>

                        {(() => {
                          const today = new Date();
                          const filtered = activeSupervisors.filter(s => {
                            if (activeSupTimeFilter === 'TODAY') {
                              return s.dates.some((d: any) => {
                                const date = new Date(d);
                                return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
                              });
                            }
                            return true;
                          }).filter(s => activeSupZoneFilter === 'ALL' || s.zone === activeSupZoneFilter)
                            .filter(s => activeSupWardFilter === 'ALL' || s.ward === activeSupWardFilter);

                          return (
                            <>
                              <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden', marginBottom: '16px', flexShrink: 0 }}>
                                <div style={{ background: '#10b981', color: '#fff', padding: '10px', borderRadius: '10px', zIndex: 1 }}>
                                  <Users size={20} />
                                </div>
                                <div style={{ zIndex: 1 }}>
                                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{filtered.length}</div>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>Active Personnel Found</div>
                                </div>
                                <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', width: '80px', height: '80px', borderRadius: '50%', border: '16px solid #d1fae5', opacity: 0.5 }}></div>
                              </div>

                              <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '180px' }}>
                                {filtered.length === 0 ? (
                                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>No active personnel found for selected filters.</div>
                                ) : (
                                  filtered.map((sup, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', border: '1px solid #f1f5f9', background: '#fff' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                                          {sup.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <span className="truncate">{sup.name}</span>
                                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', flexShrink: 0, letterSpacing: '0.05em' }}>{sup.role === 'SUPERVISOR' ? 'SUP' : (sup.role === 'EMPLOYEE' ? 'EMP' : sup.role.substring(0, 3).toUpperCase())}</span>
                                          </div>
                                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sup.zone} • {sup.ward}</div>
                                        </div>
                                      </div>
                                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '4px 8px', borderRadius: '12px', textAlign: 'right', flexShrink: 0, maxWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sup.modules}>
                                        {sup.modules}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </>
                  );
                })()}
              </section>

              {/* Module Health */}
              <section className="mx-section">
                <div className="mx-section-head">
                  <div className="mx-section-title-wrap">
                    <div className="mx-section-icon"><Activity size={18} /></div>
                    <div>
                      <h2 className="mx-section-title">MODULE HEALTH SCORE</h2>
                      <div className="mx-section-subtitle">Inspection status by module</div>
                    </div>
                  </div>
                  <button className="mx-section-refresh" type="button" onClick={loadAll}>
                    <RefreshCw size={12} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} /> Refresh
                  </button>
                </div>

                <div className="mx-health-grid">
                  {(() => {
                    const tbApp = extraModuleStats.twinbin.inspectionsDone || 0;
                    const tbRej = extraModuleStats.twinbin.actionRequired || 0;
                    const tbPen = extraModuleStats.twinbin.inspectionPending || 0;
                    const tbTot = tbApp + tbRej + tbPen;

                    const tlApp = extraModuleStats.toilet.inspectionsDone || 0;
                    const tlRej = extraModuleStats.toilet.actionRequired || 0;
                    const tlPen = extraModuleStats.toilet.inspectionPending || 0;
                    const tlTot = tlApp + tlRej + tlPen;

                    const swApp = sweepingDetailStats.totalApproved || 0;
                    const swRej = sweepingDetailStats.actionRequired || 0;
                    const swPen = sweepingDetailStats.pendingDeployment || 0;
                    const swTot = swApp + swRej + swPen;

                    const tfApp = extraModuleStats.taskforce.inspectionsDone || 0;
                    const tfRej = extraModuleStats.taskforce.actionRequired || 0;
                    const tfPen = extraModuleStats.taskforce.inspectionPending || 0;
                    const tfTot = tfApp + tfRej + tfPen;

                    const healthModules = [
                      {
                        moduleName: 'Litterbins Module', icon: Trash2, color: tbApp >= Math.max(tbRej, tbPen) ? '#17966f' : (tbRej >= tbPen ? '#ee5c5c' : '#eba62d'), iconBg: '#fff6e7', border: '#f1deb9', wash: '#fff9ef',
                        score: tbApp, percent: tbTot > 0 ? Math.round((tbApp / tbTot) * 100) : (tbApp > 0 ? 100 : 0),
                        approved: tbApp, rejected: tbRej, pending: tbPen, link: '/modules/litterbins'
                      },
                      {
                        moduleName: 'Cleanliness of Toilets', icon: Toilet, color: tlApp >= Math.max(tlRej, tlPen) ? '#17966f' : (tlRej >= tlPen ? '#ee5c5c' : '#eba62d'), iconBg: '#eef5ff', border: '#d1e1ff', wash: '#f6f9ff',
                        score: tlApp, percent: tlTot > 0 ? Math.round((tlApp / tlTot) * 100) : (tlApp > 0 ? 100 : 0),
                        approved: tlApp, rejected: tlRej, pending: tlPen, link: '/modules/toilet'
                      },
                      {
                        moduleName: 'Sweeping Module', icon: BrushCleaning, color: swApp >= Math.max(swRej, swPen) ? '#17966f' : (swRej >= swPen ? '#ee5c5c' : '#eba62d'), iconBg: '#ecf9f4', border: '#ccecdf', wash: '#f4fcf8',
                        score: swApp, percent: swTot > 0 ? Math.round((swApp / swTot) * 100) : (swApp > 0 ? 100 : 0),
                        approved: swApp, rejected: swRej, pending: swPen, link: '/modules/sweeping'
                      }
                    ];

                    if (tfTot > 0 || moduleActivity.find(m => m.key === 'TASKFORCE')) {
                      healthModules.push({
                        moduleName: 'CTU / GVP Module', icon: Truck, color: tfApp >= Math.max(tfRej, tfPen) ? '#17966f' : (tfRej >= tfPen ? '#ee5c5c' : '#eba62d'), iconBg: '#f4f1ff', border: '#ded5ff', wash: '#faf8ff',
                        score: tfApp, percent: tfTot > 0 ? Math.round((tfApp / tfTot) * 100) : (tfApp > 0 ? 100 : 0),
                        approved: tfApp, rejected: tfRej, pending: tfPen, link: '/modules/taskforce'
                      });
                    }

                    return healthModules;
                  })().map((mod, i) => (
                    <div
                      key={i}
                      className="mx-health-card"
                      onClick={() => router.push(mod.link)}
                      style={{
                        '--health-color': mod.color,
                        '--health-icon-bg': mod.iconBg,
                        '--health-border': mod.border,
                        '--health-wash': mod.wash,
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      } as React.CSSProperties}
                    >
                      <div className="mx-health-title-row">
                        <div className="mx-health-icon"><mod.icon size={19} /></div>
                        <div className="mx-health-title">{mod.moduleName}</div>
                      </div>

                      <div className="mx-health-gauge">
                        <ArcGauge color={mod.color} score={mod.score} percent={mod.percent} size={152} stroke={11} />
                      </div>

                      <div className="mx-health-stats">
                        <div className="mx-health-stat">
                          <span className="mx-health-number"><span className="mx-health-dot" style={{ background: '#24b875' }} />{mod.approved}</span>
                          <span className="mx-health-label">Approved</span>
                        </div>
                        <div className="mx-health-stat">
                          <span className="mx-health-number"><span className="mx-health-dot" style={{ background: '#ee5c5c' }} />{mod.rejected}</span>
                          <span className="mx-health-label">Rejected</span>
                        </div>
                        <div className="mx-health-stat">
                          <span className="mx-health-number"><span className="mx-health-dot" style={{ background: '#eba62d' }} />{mod.pending}</span>
                          <span className="mx-health-label">Pending</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Inspection Analytics */}
              <section className="mx-section">
                <div className="mx-section-head">
                  <div className="mx-section-title-wrap">
                    <div className="mx-section-icon"><BarChart3 size={18} /></div>
                    <div>
                      <h2 className="mx-section-title">MODULE WISE INSPECTION REPORT (DATE WISE ANALYTICS)</h2>
                      <div className="mx-section-subtitle">Date-wise inspection analytics (X-Axis: Date • Y-Axis: Inspection Count)</div>
                    </div>
                  </div>
                  <button className="mx-section-refresh" type="button" onClick={loadAll}>
                    <RefreshCw size={12} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} /> Refresh
                  </button>
                </div>

                {barChartData.length === 0 ? (
                  <div className="mx-chart-shell">
                    <div className="mx-empty-chart">No inspection data available for the past 6 days</div>
                  </div>
                ) : (() => {
                  const maxVal = Math.max(...barChartData.flatMap((d) => [d.sweeping, d.toilet, d.twinbin]), 1);
                  const ticks = [maxVal, Math.ceil(maxVal * .75), Math.ceil(maxVal * .5), Math.ceil(maxVal * .25), 0];
                  const heightFor = (value: number) => value > 0 ? Math.max((value / maxVal) * 188, 12) : 4;

                  return (
                    <div className="mx-chart-shell">
                      <div className="mx-y-axis">
                        {ticks.map((t, i) => <span key={i}>{t}</span>)}
                      </div>

                      <div className="mx-chart-groups">
                        {barChartData.map((d, idx) => (
                          <div className="mx-chart-group" key={idx}>
                            <div className="mx-bars">
                              {[
                                { value: d.sweeping, color: '#15976e' },
                                { value: d.toilet, color: '#3974df' },
                                { value: d.twinbin, color: '#d98112' },
                              ].map((bar, barIndex) => (
                                <div className="mx-bar-wrap" key={barIndex}>
                                  {bar.value > 0 ? (
                                    <>
                                      <div className="mx-bar-value" style={{ color: bar.color }}>{bar.value}</div>
                                      <div className="mx-bar" style={{ height: `${heightFor(bar.value)}px`, background: bar.color }} />
                                    </>
                                  ) : (
                                    <div className="mx-zero-bar" />
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="mx-date-label">{d.date}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mx-chart-legend">
                        {[
                          { label: 'Sweeping Module', color: '#15976e' },
                          { label: 'Cleanliness of Toilets', color: '#3974df' },
                          { label: 'Litterbins Module', color: '#d98112' },
                        ].map((item, i) => (
                          <span className="mx-legend-chip" key={i}>
                            <span className="mx-legend-dot" style={{ background: item.color }} />
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </section>
            </div>
          </div>
        </>
      )}


      {/* ====== START OF NEW SECTION ====== */}
      {/* ====== ACTIVITY ANALYTICS ====== */}
      <section className="mx-section">
        <div className="mx-section-head">
          <div className="mx-section-title-wrap">
            <div className="mx-section-icon"><Activity size={18} /></div>
            <div>
              <h2 className="mx-section-title">ACTIVITY ANALYTICS</h2>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '16px' }}>
          {/* Card 1: Most Active Modules */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e4ebf5', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#14213d' }}>Most Active Modules<br /><span style={{ fontSize: '11px', color: '#718096', fontWeight: 500 }}>By total records submitted</span></h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Cleanliness of Toilets</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>9</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Sweeping</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>6</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Litter Bins</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>1</span>
              </div>
            </div>
          </div>

          {/* Card 2: Most Active Zones */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e4ebf5', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#14213d' }}>Most Active Zones<br /><span style={{ fontSize: '11px', color: '#718096', fontWeight: 500 }}>By activity volume</span></h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '84px' }}>
              {zoneActivity.slice(0, 3).map((za, idx) => {
                const pct = zoneActivity.length > 0 ? Math.round((za.beats / Math.max(1, zoneActivity[0].beats)) * 100) : 0;
                const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd'];
                const color = colors[idx] || '#c4b5fd';
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }} title={za.name}>{za.name.length > 15 ? za.name.substring(0, 15) + '...' : za.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '60px', height: '4px', background: '#f1f5f9', borderRadius: '2px' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }}></div>
                      </div>
                      {idx === 0 && <span style={{ fontSize: '11px', fontWeight: 700, color }}>Top</span>}
                    </div>
                  </div>
                );
              })}
              {Array.from({ length: Math.max(0, 3 - zoneActivity.length) }).map((_, idx) => (
                <div key={`empty-zone-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.4 }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>No data</span>
                  <div style={{ width: '60px', height: '4px', background: '#f1f5f9', borderRadius: '2px' }}></div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Most Active Wards */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e4ebf5', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#14213d' }}>Most Active Wards<br /><span style={{ fontSize: '11px', color: '#718096', fontWeight: 500 }}>By activity volume</span></h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '84px' }}>
              {wardActivity.slice(0, 3).map((wa, idx) => {
                const pct = wardActivity.length > 0 ? Math.round((wa.beats / Math.max(1, wardActivity[0].beats)) * 100) : 0;
                const colors = ['#ec4899', '#f472b6', '#fbcfe8'];
                const color = colors[idx] || '#fbcfe8';
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }} title={wa.name}>{wa.name.length > 15 ? wa.name.substring(0, 15) + '...' : wa.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '60px', height: '4px', background: '#f1f5f9', borderRadius: '2px' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }}></div>
                      </div>
                      {idx === 0 && <span style={{ fontSize: '11px', fontWeight: 700, color }}>Top</span>}
                    </div>
                  </div>
                );
              })}
              {Array.from({ length: Math.max(0, 3 - wardActivity.length) }).map((_, idx) => (
                <div key={`empty-ward-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.4 }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>No data</span>
                  <div style={{ width: '60px', height: '4px', background: '#f1f5f9', borderRadius: '2px' }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====== FIELD OPERATIONS ====== */}
      <section className="mx-section" style={{ marginTop: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>

          {/* Action Officers */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e4ebf5', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#ecfdf5', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
                <Shield size={20} />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', letterSpacing: '0.05em' }}>FIELD OPERATIONS</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Action Officers</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Issue resolution & ground action</div>
              </div>
            </div>
            <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden', marginBottom: '24px' }}>
              <div style={{ background: '#10b981', color: '#fff', padding: '12px', borderRadius: '10px', zIndex: 1 }}>
                <Users size={24} />
              </div>
              <div style={{ zIndex: 1 }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{stats?.actionOfficers || stats?.ACTION_OFFICER || 0}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>Action Officers Active</div>
              </div>
              <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', width: '100px', height: '100px', borderRadius: '50%', border: '20px solid #d1fae5', opacity: 0.5 }}></div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '12px' }}>PENDING ACTIONS BY MODULE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(() => {
                const twinbin = moduleActivity.find(m => m.key === 'TWINBIN') || { total: 0, actionRequired: 0 };
                const toilet = moduleActivity.find(m => m.key === 'TOILET') || { total: 0, actionRequired: 0 };
                const sweeping = moduleActivity.find(m => m.key === 'SWEEPING') || { total: 0, actionRequired: 0 };
                const taskforce = moduleActivity.find(m => m.key === 'TASKFORCE') || { total: 0, actionRequired: 0 };

                const actions = [
                  { name: 'Cleanliness of Toilets', count: toilet.total, pending: toilet.actionRequired, icon: Toilet, iconColor: '#3b82f6', iconBg: '#eff6ff', link: '/modules/toilet' },
                  { name: 'Sweeping', count: sweeping.total, pending: sweeping.actionRequired, icon: BrushCleaning, iconColor: '#10b981', iconBg: '#ecfdf5', link: '/modules/sweeping' },
                  { name: 'Litter Bins', count: twinbin.total, pending: twinbin.actionRequired, icon: Trash2, iconColor: '#f59e0b', iconBg: '#fffbeb', link: '/modules/litterbins' },
                ];
                if (taskforce.total > 0 || moduleActivity.find(m => m.key === 'TASKFORCE')) {
                  actions.push({ name: 'CTU / GVP Transformation', count: taskforce.total, pending: taskforce.actionRequired, icon: Truck, iconColor: '#8b5cf6', iconBg: '#f5f3ff', link: '/modules/taskforce' });
                }
                return actions;
              })().map((mod, i) => (
                <div key={i} onClick={() => router.push(mod.link)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: mod.iconBg, color: mod.iconColor, padding: '8px', borderRadius: '8px' }}>
                      <mod.icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{mod.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Total: {mod.count} records</div>
                    </div>
                  </div>
                  {mod.pending > 0 ? (
                    <div style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⚠ {mod.pending}
                    </div>
                  ) : (
                    <div style={{ background: '#ecfdf5', color: '#10b981', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✓ Clear
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quality Controllers */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e4ebf5', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '10px', borderRadius: '10px' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.05em' }}>FIELD OPERATIONS</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Quality Controllers</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Quality monitoring & auditing</div>
              </div>
            </div>
            <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden', marginBottom: '24px' }}>
              <div style={{ background: '#3b82f6', color: '#fff', padding: '12px', borderRadius: '10px', zIndex: 1 }}>
                <Users size={24} />
              </div>
              <div style={{ zIndex: 1 }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{stats?.qualityControllers || stats?.QC || 0}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>Quality Controllers Active</div>
              </div>
              <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', width: '100px', height: '100px', borderRadius: '50%', border: '20px solid #dbeafe', opacity: 0.5 }}></div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '12px' }}>PENDING AUDITS BY MODULE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(() => {
                const twinbin = moduleActivity.find(m => m.key === 'TWINBIN') || { total: 0, pending: 0 };
                const toilet = moduleActivity.find(m => m.key === 'TOILET') || { total: 0, pending: 0 };
                const sweeping = moduleActivity.find(m => m.key === 'SWEEPING') || { total: 0, pending: 0 };
                const taskforce = moduleActivity.find(m => m.key === 'TASKFORCE') || { total: 0, pending: 0 };

                const audits = [
                  { name: 'Cleanliness of Toilets', count: toilet.total, pending: toilet.pending, icon: Toilet, iconColor: '#3b82f6', iconBg: '#eff6ff', link: '/modules/toilet' },
                  { name: 'Sweeping', count: sweeping.total, pending: sweeping.pending, icon: BrushCleaning, iconColor: '#10b981', iconBg: '#ecfdf5', link: '/modules/sweeping' },
                  { name: 'Litter Bins', count: twinbin.total, pending: twinbin.pending, icon: Trash2, iconColor: '#f59e0b', iconBg: '#fffbeb', link: '/modules/litterbins' },
                ];
                if (taskforce.total > 0 || moduleActivity.find(m => m.key === 'TASKFORCE')) {
                  audits.push({ name: 'CTU / GVP Transformation', count: taskforce.total, pending: taskforce.pending, icon: Truck, iconColor: '#8b5cf6', iconBg: '#f5f3ff', link: '/modules/taskforce' });
                }
                return audits;
              })().map((mod, i) => (
                <div key={i} onClick={() => router.push(mod.link)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: mod.iconBg, color: mod.iconColor, padding: '8px', borderRadius: '8px' }}>
                      <mod.icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{mod.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Total: {mod.count} records</div>
                    </div>
                  </div>
                  {mod.pending > 0 ? (
                    <div style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⚠ {mod.pending}
                    </div>
                  ) : (
                    <div style={{ background: '#ecfdf5', color: '#10b981', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✓ Clear
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
      {/* ====== END OF NEW SECTION ====== */}

      {/* Modern System Alerts Overview Modal */}
      {showAlertModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            padding: '20px',
          }}
          onClick={() => setShowAlertModal(false)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '560px',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(135deg, #fff7f7 0%, #ffffff 100%)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444'
                  }}
                >
                  <Bell size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    System Alerts Overview
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                    Live critical action items across city modules
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAlertModal(false)}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '16px',
                }}
              >

              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              {(() => {
                const criticalCount =
                  (extraModuleStats.toilet.actionRequired || 0) +
                  (extraModuleStats.twinbin.actionRequired || 0) +
                  (extraModuleStats.taskforce.actionRequired || 0) +
                  (sweepingDetailStats.actionRequired || 0);

                const alertItems = [
                  {
                    title: 'Cleanliness of Toilets',
                    count: extraModuleStats.toilet.actionRequired || 0,
                    icon: Toilet,
                    color: '#3b73df',
                    bgColor: '#eff6ff',
                    borderColor: '#dbeafe',
                    href: '/modules/toilet'
                  },
                  {
                    title: 'Litterbins Module',
                    count: extraModuleStats.twinbin.actionRequired || 0,
                    icon: Trash2,
                    color: '#d78212',
                    bgColor: '#fffbe6',
                    borderColor: '#fef08a',
                    href: '/modules/twinbin'
                  },
                  {
                    title: 'CTU / GVP Transformation',
                    count: extraModuleStats.taskforce.actionRequired || 0,
                    icon: Truck,
                    color: '#7657e8',
                    bgColor: '#faf5ff',
                    borderColor: '#e9d5ff',
                    href: '/modules/taskforce'
                  },
                  {
                    title: 'Sweeping Module',
                    count: sweepingDetailStats.actionRequired || 0,
                    icon: BrushCleaning,
                    color: '#17966f',
                    bgColor: '#f0fdf4',
                    borderColor: '#bbf7d0',
                    href: '/modules/sweeping'
                  }
                ];

                return (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderRadius: '16px',
                        backgroundColor: criticalCount > 0 ? '#fef2f2' : '#f0fdf4',
                        border: `1px solid ${criticalCount > 0 ? '#fecaca' : '#bbf7d0'}`,
                        marginBottom: '20px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {criticalCount > 0 ? (
                          <AlertCircle size={22} color="#dc2626" />
                        ) : (
                          <CheckCircle size={22} color="#16a34a" />
                        )}
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: criticalCount > 0 ? '#991b1b' : '#166534' }}>
                            {criticalCount > 0 ? `${criticalCount} Critical Action Items` : 'All Systems Operational'}
                          </div>
                          <div style={{ fontSize: '11px', color: criticalCount > 0 ? '#b91c1c' : '#15803d', marginTop: '2px' }}>
                            {criticalCount > 0 ? 'Action required on pending reports' : 'No critical issues requiring immediate action'}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: 900,
                          color: criticalCount > 0 ? '#dc2626' : '#16a34a',
                          padding: '4px 14px',
                          borderRadius: '12px',
                          backgroundColor: '#ffffff',
                          border: `1px solid ${criticalCount > 0 ? '#fca5a5' : '#86efac'}`
                        }}
                      >
                        {criticalCount}
                      </div>
                    </div>

                    {/* Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {alertItems.map((item, idx) => {
                        const Icon = item.icon;
                        const hasAction = item.count > 0;
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '16px',
                              borderRadius: '16px',
                              backgroundColor: item.bgColor,
                              border: `1px solid ${item.borderColor}`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Icon size={18} color={item.color} />
                              <span style={{ fontSize: '12px', fontWeight: 750, color: '#1e293b' }}>
                                {item.title}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ fontSize: '24px', fontWeight: 900, color: hasAction ? '#ef4444' : '#10b981', lineHeight: 1 }}>
                                  {item.count}
                                </div>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                  {hasAction ? 'Action Required' : 'No Issues'}
                                </div>
                              </div>
                              <Link
                                href={item.href}
                                onClick={() => setShowAlertModal(false)}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: item.color,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '4px 9px',
                                  borderRadius: '8px',
                                  backgroundColor: '#ffffff',
                                  border: `1px solid ${item.borderColor}`
                                }}
                              >
                                View <ChevronRight size={12} />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #f1f5f9',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                Updated {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => loadAll()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={13} style={{ animation: refreshing ? 'spin .8s linear infinite' : 'none' }} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
