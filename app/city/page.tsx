'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, CityApi, AreaBeatApi, ModuleRecordsApi, CityModulesApi, GeoApi, ToiletApi, TwinbinApi, TaskforceApi } from "@lib/apiClient";
import {
  Package, Search, Landmark, Users, UserCog, ShieldCheck, Shield,
  Map, Target, Activity, Database, AlertCircle, CheckCircle,
  MapPin, ArrowRight, RefreshCw, Building2, ChevronRight, Zap, TrendingUp, BarChart3, Bell
} from "lucide-react";
import { getTokenFromCookies, decodeToken } from "@lib/auth";

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

export default function CityDashboardPage() {
  const [cityName, setCityName] = useState<string | null>(null);
  const [ulbCode, setUlbCode] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  // City Admin analytics
  const [moduleActivity, setModuleActivity] = useState<{ name: string; key: string; total: number; approved: number; pending: number; actionRequired: number }[]>([]);
  const [zoneActivity, setZoneActivity] = useState<{ name: string; beats: number; assignedBeats: number; segments: number }[]>([]);
  const [wardActivity, setWardActivity] = useState<{ name: string; beats: number; segments: number }[]>([]);
  const [recentRegistrationRequests, setRecentRegistrationRequests] = useState<any[]>([]);
  const [pendingRegCount, setPendingRegCount] = useState(0);

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

  // Commissioner premium dashboard real data
  const [toiletDashStats, setToiletDashStats] = useState<any>(null);
  const [qcLeaderboard, setQcLeaderboard] = useState<{ name: string; inspections: number }[]>([]);

  const user = decodeToken(getTokenFromCookies());
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

      if (isReadOnlyView) {
        setSweepingDetailLoading(true);
        const [beatsRes, recordsRes] = await Promise.all([
          AreaBeatApi.list().catch(() => ({ beats: [] })),
          ModuleRecordsApi.getRecords("SWEEPING").catch(() => ({ stats: null }))
        ]);
        const beats = beatsRes.beats || [];
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
          pendingDeployment: pending, assignedSegments: totalSegments - pending
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
          ModuleRecordsApi.getRecords("TWINBIN").catch(() => null),
          ModuleRecordsApi.getRecords("TASKFORCE").catch(() => null),
          ModuleRecordsApi.getRecords("TOILET").catch(() => null)
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

        // Fetch toilet dashboard stats for commissioner premium sections
        const toiletDash = await ToiletApi.getDashboardStats().catch(() => null);
        if (toiletDash) setToiletDashStats(toiletDash);

        // Build QC leaderboard from toilet inspections
        try {
          const inspRes = await ToiletApi.listInspections({ pageSize: 500 });
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

        setSweepingDetailLoading(false);
      }
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
      `}</style>

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
                    <Landmark size={12} /> ULB: {ulbCode || '—'}
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
                { label: "Total Beats", value: sweepingDetailStats.totalBeats, icon: <Target size={20} />, color: "#3b82f6", href: "/modules/sweeping" },
                { label: "Total Sub-Beats", value: sweepingDetailStats.totalSegments, icon: <Database size={20} />, color: "#8b5cf6", href: "/modules/sweeping" },
                { label: "Assigned Sub-Beats", value: sweepingDetailStats.assignedSegments, icon: <CheckCircle size={20} />, color: "#0ea5e9", href: "/modules/sweeping" },
                { label: "QC Assigned", value: sweepingDetailStats.qcAssigned, icon: <ShieldCheck size={20} />, color: "#10b981", href: "/city/users?role=QC" },
                { label: "Total Approved", value: sweepingDetailStats.totalApproved, icon: <CheckCircle size={20} />, color: "#22c55e", href: "/modules/sweeping" },
                { label: "Action Required", value: sweepingDetailStats.actionRequired, icon: <AlertCircle size={20} />, color: "#ef4444", href: "/modules/sweeping" },
                { label: "Pending Deployment", value: sweepingDetailStats.pendingDeployment, icon: <Map size={20} />, color: "#f59e0b", href: "/modules/sweeping" },
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
                  { label: "Inspection Not Done", value: extraModuleStats.toilet.uninspected, icon: <Target size={20} />, color: "#64748b", href: `/modules/toilet` },
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {alerts.length === 0 ? (
                        <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, textAlign: 'center', padding: 16 }}>✓ No critical alerts — all modules are clear!</div>
                      ) : alerts.map((a, i) => (
                        <div key={i} style={{ background: '#fff', padding: 12, borderRadius: 8, borderLeft: '4px solid #ef4444', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{a.msg}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', marginTop: 4 }}>{a.ward}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      ) : (


        <>
          {/* ── Hero Banner (City Admin Only) ── */}
          <div className="hero-banner" style={{
            background: 'linear-gradient(120deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
            padding: '32px 36px 28px',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, right: 160, width: 180, height: 180, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', pointerEvents: 'none' }} />
            <div className="header-flex">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>City Administration</div>
                    <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                      {cityName || 'Dashboard'}
                    </h1>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 7, padding: '4px 12px', fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Landmark size={12} /> ULB: {ulbCode || '—'}
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
                  Share Report
                </button>
              </div>
            </div>
            <div className="hero-stats" style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Modules', value: stats?.totalModules ?? '—', icon: <Package size={14} /> },
                { label: 'Total Users', value: statsLoading ? '—' : totalUsers, icon: <Users size={14} /> },
              ].map((c, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
                  <span style={{ opacity: 0.6 }}>{c.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{c.value}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="page-padding">

            {/* ── User Role KPI Cards (City Admin only) ── */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#000', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>User Overview</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
                {roleData.map((r, i) => (
                  <Link key={i} href={r.href} className="da-link">
                    <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 18px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: r.bg, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {r.icon}
                        </div>
                        <ChevronRight size={14} color="#cbd5e1" />
                      </div>
                      <div style={{ fontSize: 30, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 }}>
                        {statsLoading ? <span style={{ color: '#e2e8f0' }}>—</span> : (stats?.[r.key] ?? 0)}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, lineHeight: 1.3 }}>{r.label}</div>
                    </div>
                  </Link>
                ))}
                <Link href="/city/modules" className="da-link">
                  <div className="da-card" style={{ background: '#2563eb', border: 'none', borderRadius: 12, padding: '18px 18px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.28)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={16} />
                      </div>
                      <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 }}>
                      {statsLoading ? '—' : (stats?.totalModules ?? 0)}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Total Modules</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* ── Quick Actions (City Admin only) ── */}
            <div style={{ marginBottom: 24, marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#000', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Quick Actions</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/city/users/create" className="da-link" style={{ flex: 1, minWidth: 150 }}>
                  <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0f9ff', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={16} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Add New User</span>
                  </div>
                </Link>
                <Link href="/city/areas" className="da-link" style={{ flex: 1, minWidth: 150 }}>
                  <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f5f3ff', color: '#6d28d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Target size={16} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Manage Areas</span>
                  </div>
                </Link>
                <Link href="/registration-requests" className="da-link" style={{ flex: 1, minWidth: 150 }}>
                  <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff7ed', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bell size={16} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Reg Requests</span>
                    {pendingRegCount > 0 && (
                      <span style={{ position: 'absolute', top: -5, right: -5, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 10, boxShadow: '0 2px 4px rgba(220,38,38,0.3)' }}>
                        {pendingRegCount}
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
              {/* Registration Requests Widget */}
              <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>New Registrations</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Approval pending</div>
                  </div>
                  <Link href="/registration-requests" style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>View All →</Link>
                </div>

                <div style={{ flex: 1 }}>
                  {recentRegistrationRequests.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      <Users size={24} style={{ marginBottom: 12, opacity: 0.3 }} />
                      <div style={{ fontSize: 13 }}>No pending requests</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {recentRegistrationRequests.map((req, i) => (
                        <div key={i} style={{ padding: '14px 22px', borderBottom: i < recentRegistrationRequests.length - 1 ? '1px solid #f8fafc' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{req.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{req.email} • {req.phone}</div>
                          </div>
                          <Link href="/registration-requests" style={{ padding: '6px 14px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>Review</Link>
                        </div>
                      ))}
                      <div style={{ padding: '14px 22px', background: '#f8fafc', textAlign: 'center' }}>
                        <Link href="/registration-requests" style={{ fontSize: 12, fontWeight: 700, color: '#475569', textDecoration: 'none' }}>
                          {recentRegistrationRequests.length === 5 ? 'View All Requests' : 'Manage Requests'}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Officer Panel */}
              <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '22px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Field Operations</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 18 }}>Action Officers</div>

                {/* AO big count */}
                <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCog size={22} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {statsLoading ? '—' : (stats?.actionOfficers ?? 0)}
                    </div>
                    <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 3 }}>Action Officers Active</div>
                  </div>
                </div>

                {/* Module-wise AO pending from moduleActivity */}
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Pending Actions by Module</div>
                <div style={{ flex: 1 }}>
                  {moduleActivity.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Loading...</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {moduleActivity.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: m.actionRequired > 0 ? '#fef2f2' : '#f8fafc', borderRadius: 8, border: `1px solid ${m.actionRequired > 0 ? '#fecaca' : '#f1f5f9'}` }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{m.name}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Total: {m.total} records</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {m.actionRequired > 0 ? (
                              <span style={{ background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 800, borderRadius: 6, padding: '3px 8px' }}>
                                ⚠ {m.actionRequired}
                              </span>
                            ) : (
                              <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px' }}>
                                ✓ Clear
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <Link href="/city/users?role=ACTION_OFFICER" style={{ textDecoration: 'none', fontSize: 12, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 5 }}>
                    Manage Action Officers <ArrowRight size={12} />
                  </Link>
                </div>
              </div>

              {/* Live Activity Feed */}
              <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ background: '#fff', border: '1px solid #e2e8f0', transform: 'scale(0.8)' }}>
                      <Activity size={16} color="#2563eb" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Live Field Activity</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Real-time audit stream</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 9, background: '#16a34a', boxShadow: '0 0 8px #22c55e' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>LIVE</span>
                  </div>
                </div>

                <div style={{ padding: '0', overflowY: 'auto', maxHeight: '420px', flex: 1 }}>
                  {recentLogs.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      <RefreshCw size={24} style={{ marginBottom: 12, opacity: 0.3 }} />
                      <div style={{ fontSize: 13 }}>No recent activity found</div>
                    </div>
                  ) : (
                    recentLogs.map((log, i) => (
                      <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid #f8fafc', display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: log.status === 'APPROVED' ? '#eff6ff' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <MapPin size={14} color={log.status === 'APPROVED' ? '#2563eb' : '#d97706'} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{log.moduleName} Audit</span>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                            By <b>{log.createdByUser?.name || 'Field User'}</b> • {log.status}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── Analytics Section ── */}
            <div style={{ marginTop: 28 }}>

              {/* Section label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <TrendingUp size={15} color="#2563eb" />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#000' }}>Activity Analytics</span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>

              <div className="responsive-grid-3">

                {/* ── Most Active Modules ── */}
                <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={14} color="#2563eb" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Most Active Modules</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>By total records submitted</div>
                      </div>
                    </div>
                    <Link href="/city/modules" style={{ textDecoration: 'none', fontSize: 11, color: '#2563eb', fontWeight: 700 }}>View all →</Link>
                  </div>
                  {moduleActivity.length === 0 ? (
                    <div style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No module data yet</div>
                  ) : (
                    <div style={{ padding: '8px 0' }}>
                      {moduleActivity.map((m, i) => {
                        const maxM = moduleActivity[0]?.total || 1;
                        const pct = Math.max((m.total / maxM) * 100, 2);
                        return (
                          <div key={i} style={{ padding: '10px 20px', borderBottom: i < moduleActivity.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 22, height: 22, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#475569' }}>{i + 1}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{m.name}</span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{m.total}</span>
                            </div>
                            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #2563eb, #7c3aed)', borderRadius: 99, transition: 'width 0.8s ease' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>✓ {m.approved}</span>
                              <span style={{ fontSize: 10, color: '#d97706', fontWeight: 600 }}>⏳ {m.pending}</span>
                              {m.actionRequired > 0 && <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600 }}>⚠ {m.actionRequired}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Most Active Zones ── */}
                <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Map size={14} color="#7c3aed" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Most Active Zones</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>By beats assigned</div>
                      </div>
                    </div>
                    <Link href="/city/zones" style={{ textDecoration: 'none', fontSize: 11, color: '#7c3aed', fontWeight: 700 }}>Manage →</Link>
                  </div>
                  {zoneActivity.length === 0 ? (
                    <div style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No zone data yet</div>
                  ) : (
                    <div style={{ padding: '8px 0' }}>
                      {zoneActivity.map((z, i) => {
                        const maxZ = zoneActivity[0]?.beats || 1;
                        const pct = Math.max((z.beats / maxZ) * 100, 2);
                        const assignedPct = z.beats > 0 ? Math.round((z.assignedBeats / z.beats) * 100) : 0;
                        return (
                          <div key={i} style={{ padding: '10px 20px', borderBottom: i < zoneActivity.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 22, height: 22, borderRadius: 6, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#7c3aed' }}>{i + 1}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{z.name}</span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{z.beats} beats</span>
                            </div>
                            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#7c3aed', borderRadius: 99, transition: 'width 0.8s ease' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                              <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>✓ {z.assignedBeats} assigned ({assignedPct}%)</span>
                              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>Segments: {z.segments}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Top Wards ── */}
                <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MapPin size={14} color="#059669" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Top Wards</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>By beat coverage</div>
                      </div>
                    </div>
                    <Link href="/city/wards" style={{ textDecoration: 'none', fontSize: 11, color: '#059669', fontWeight: 700 }}>Manage →</Link>
                  </div>
                  {wardActivity.length === 0 ? (
                    <div style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No ward data yet</div>
                  ) : (
                    <div style={{ padding: '8px 0' }}>
                      {wardActivity.map((w, i) => {
                        const maxW = wardActivity[0]?.beats || 1;
                        const pct = Math.max((w.beats / maxW) * 100, 2);
                        return (
                          <div key={i} style={{ padding: '10px 20px', borderBottom: i < wardActivity.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 22, height: 22, borderRadius: 6, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#059669' }}>{i + 1}</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{w.name}</span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{w.beats} beats</span>
                            </div>
                            <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#059669', borderRadius: 99, transition: 'width 0.8s ease' }} />
                            </div>
                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{w.segments} total segments</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )
      }
    </div >
  )
}


