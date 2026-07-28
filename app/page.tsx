'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@hooks/useAuth";
import { ApiError, apiFetch, RegistrationApi, CityApi, HmsApi } from "@lib/apiClient";
import {
  Shield, Globe, Building2, Activity, Users, ArrowRight, Settings,
  RefreshCw, CheckCircle2, Clock, Zap, Database, Server, BarChart3,
  PieChart, LayoutGrid, ArrowUpRight, Check, Play, LayoutDashboard, Calendar
} from "lucide-react";

/** 
 * Nomenclature Updates:
 * TASKFORCE -> CTU/GVP Transformation
 * TOILET -> Cleanliness of Toilet
 */

const moduleCards = [
  {
    title: "CTU/GVP Transformation",
    desc: "Manage field operations and team assignments.",
    icon: <Users size={20} />,
    href: "/taskforce",
    actions: [
      { label: "Zones", href: "/taskforce/zones" },
      { label: "Wards", href: "/taskforce/wards" },
      { label: "Areas", href: "/taskforce/areas" },
      { label: "Beats", href: "/taskforce/beats" },
    ],
  },
  {
    title: "HMS Super Admin",
    desc: "System-wide infrastructure and city management.",
    icon: <Shield size={20} />,
    href: "/hms",
  },
  {
    title: "User Management",
    desc: "Control access and permissions for all staff.",
    icon: <Users size={20} />,
    href: "/users",
  },
];

function CityAdminDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setLoading(true);
        const res = await RegistrationApi.listRequests();
        setRequests((res as any).requests ?? []);
      } catch (err) {
        console.error("Failed to load registration requests", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.cityId) loadRequests();
  }, [user]);

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  return (
    <div className="page" style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px 32px' }}>
      <div className="fade-in">
        <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Building2 size={18} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>City Command Center</h1>
            </div>
            <p style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>Managing {(user as any)?.city?.name || 'Municipal'} Infrastructure</p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/city" style={{ textDecoration: 'none' }}>
              <button style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13 }}>
                <Settings size={16} /> Configuration
              </button>
            </Link>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#eff6ff', color: '#2563eb', padding: 8, borderRadius: 8 }}>
                  <Users size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Registrations</h3>
              </div>
              {pendingRequests.length > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', padding: '1px 8px', borderRadius: 12, fontSize: 10, fontWeight: 900 }}>{pendingRequests.length} NEW</span>
              )}
            </div>
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
              Review {pendingRequests.length} pending requests from municipal staff.
            </div>
            <Link href="/registration-requests" style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', background: '#1e3a8a', color: '#fff', padding: '10px', borderRadius: 10, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13 }}>
                Review Requests <ArrowRight size={14} />
              </button>
            </Link>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: 8, borderRadius: 8 }}>
                <Shield size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Active Modules</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>8</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>Modules</div>
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>124</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>Staff</div>
              </div>
            </div>
            <Link href="/city" style={{ textDecoration: 'none', display: 'block', marginTop: 16, textAlign: 'center', color: '#2563eb', fontWeight: 700, fontSize: 13 }}>
              Manage City Settings
            </Link>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Registration Pipeline</h3>
            <Link href="/registration-requests" style={{ color: '#2563eb', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>View All</Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Module</th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.slice(0, 5).map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '12px 24px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{r.email}</div>
                  </td>
                  <td style={{ padding: '12px 24px', fontSize: 12, color: '#475569', fontWeight: 600 }}>{r.moduleKey || 'N/A'}</td>
                  <td style={{ padding: '12px 24px' }}>
                    <span style={{ fontSize: 9, fontWeight: 900, background: '#fef3c7', color: '#d97706', padding: '3px 6px', borderRadius: 4 }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                    <Link href={`/registration-requests/${r.id}`} style={{ color: '#2563eb', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SuperAdminDashboard() {
  const [cities, setCities] = useState<any[]>([]);
  const [allModules, setAllModules] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'cities' | 'modules'>('overview');
  const [lastCheck, setLastCheck] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const loadData = async () => {
    try {
      setLoading(true);

      // Load foundational city data
      try {
        const cityRes: any = await CityApi.list();
        setCities(cityRes.cities || cityRes || []);
      } catch (e) { console.error("Cities load failed", e); }

      // Load static module list
      try {
        const moduleRes: any = await apiFetch("/hms/modules");
        setAllModules(moduleRes.modules || []);
      } catch (e) { console.error("Modules load failed", e); }

      // Load global workforce stats
      try {
        const statsRes: any = await HmsApi.getGlobalStats({ startDate, endDate });
        setStats(statsRes.stats || null);
      } catch (e) { console.error("Global stats load failed", e); }

      // Load pending registration requests
      try {
        const regRes: any = await RegistrationApi.listRequests();
        setRequests(regRes.requests || []);
      } catch (e) { console.error("Registration requests load failed", e); }

      setLastCheck(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Critical Super Admin load failure", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]); // Initial load or when tabbing back

  const totalCities = cities.length;
  const activeCities = cities.filter(c => c.enabled).length;
  const totalUlbs = new Set(cities.map(c => c.ulbCode).filter(Boolean)).size;

  const getCityAdoptionCount = (moduleName: string) => {
    return cities.filter(c => c.modules?.some((m: any) => m.name === moduleName && m.enabled)).length;
  };

  // Derive Coverage from real ULB info
  const regionMap: Record<string, string> = { RJ: 'Rajasthan', UP: 'UP', MP: 'MP', DL: 'Delhi', MH: 'MH' };
  const coverageData = cities.reduce((acc: any, c) => {
    const code = c.ulbCode?.substring(0, 2).toUpperCase() || 'GLOBAL';
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});
  const strategicCoverage = Object.entries(coverageData).map(([k, v]: [any, any]) => ({
    state: regionMap[k] || k,
    count: v,
    col: k === 'RJ' ? '#2563eb' : (k === 'UP' ? '#7c3aed' : '#10b981')
  })).slice(0, 2);

  // Derive Audit Log from recent records
  const auditLogs = [
    ...cities.slice(-2).map(c => ({ event: 'Cluster Provisioned', label: c.name, time: 'Cloud Sync' })),
    ...requests.slice(0, 2).map(r => ({ event: 'Staff Onboarding', label: r.name, time: 'New Request' }))
  ];

  return (
    <div className="page" style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px 32px' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        .tab-btn { padding: 10px 20px; border: none; background: transparent; color: #64748b; font-weight: 700; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; font-size: 13px; outline: none; }
        .tab-btn.active { border-color: #1e3a8a; color: #1e3a8a; background: #eff6ff; border-radius: 8px 8px 0 0; }
      `}</style>

      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px -2px rgba(30,58,138,0.3)' }}>
                <Shield size={20} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 950, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>HMS Master Console</h1>
            </div>
            <p style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Global infrastructure monitoring & city orchestration.</p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{loading ? 'SYNCING' : 'NODE-UP'}</div>
              </div>
              <div style={{ height: 16, width: 1, background: '#e2e8f0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Database size={12} color="#2563eb" />
                <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{lastCheck || 'Checking...'}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`tab-btn ${activeTab === 'cities' ? 'active' : ''}`} onClick={() => setActiveTab('cities')}>City Matrix</button>
          <button className={`tab-btn ${activeTab === 'modules' ? 'active' : ''}`} onClick={() => setActiveTab('modules')}>Module Inventory</button>
        </div>

        {activeTab === 'overview' && (
          <div className="fade-in">
            {/* Filter Dashboard Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, background: '#fff', padding: '10px 20px', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Calendar size={14} color="#64748b" />
                <div style={{ fontSize: 13, fontWeight: 900, color: '#1e293b' }}>Global Data Scope</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '3px 10px', borderRadius: 8, border: '1px solid #f1f5f9', gap: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8' }}>SINCE</span>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ background: 'transparent', border: 'none', fontSize: 11, fontWeight: 800, color: '#1e3a8a', cursor: 'pointer', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '3px 10px', borderRadius: 8, border: '1px solid #f1f5f9', gap: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8' }}>UNTIL</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ background: 'transparent', border: 'none', fontSize: 11, fontWeight: 800, color: '#1e3a8a', cursor: 'pointer', outline: 'none' }} />
                </div>
                <button onClick={loadData} style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> SYNC DATA
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Total Clusters', value: totalCities, icon: <Globe size={18} />, color: '#2563eb', bg: '#eff6ff' },
                { label: 'Active Deployments', value: activeCities, icon: <Zap size={18} />, color: '#10b981', bg: '#ecfdf5' },
                { label: 'Regional ULBs', value: totalUlbs, icon: <Building2 size={18} />, color: '#7c3aed', bg: '#f5f3ff' },
                { label: 'System Assets', value: allModules.length, icon: <LayoutGrid size={18} />, color: '#f59e0b', bg: '#fffbeb' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '16px 20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {s.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 950, color: '#0f172a', lineHeight: 1 }}>{loading ? '..' : s.value}</div>
                      <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: 20, marginBottom: 24 }}>
              {/* Provisioning Funnel */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#1e293b' }}>City Lifecycle Tracking</h3>
                  <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>ONBOARDING PIPELINE</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {cities.slice(0, 4).map((city, idx) => (
                    <div key={idx} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 800 }}>{city.name}</div>
                        <div style={{ fontSize: 8, fontWeight: 900, color: city.enabled ? '#059669' : '#d97706', background: city.enabled ? '#ecfdf5' : '#fff7ed', padding: '1px 6px', borderRadius: 4 }}>
                          {city.enabled ? 'DEPLOYED' : 'PENDING'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[
                          { label: 'Crt', full: 'Cluster Provisioned', done: true },
                          { label: 'Adm', full: 'Admin Onboarded', done: !!city.cityAdmin || !!city.adminName },
                          { label: 'Mod', full: 'Modules Configured', done: city.modules?.some((m: any) => m.enabled) },
                          { label: 'Live', full: 'Production Live', done: city.enabled }
                        ].map((s, i) => (
                          <div key={i} title={s.full} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, cursor: 'help' }}>
                            <div style={{ height: 3, borderRadius: 2, background: s.done ? '#10b981' : '#e2e8f0' }} />
                            <div style={{ fontSize: 7, fontWeight: 900, color: s.done ? '#065f46' : '#94a3b8', textAlign: 'center' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Health */}
              <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: 16 }}>
                <div style={{ background: '#0f172a', borderRadius: 20, padding: 20, color: '#fff' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 900, marginBottom: 12, color: '#94a3b8' }}>Global Workforce</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Workforce Hub', val: stats?.taskforceMembers || 0, color: '#10b981' },
                      { label: 'Quality Control', val: stats?.qualityControllers || 0, color: '#3b82f6' },
                      { label: 'ULB Officials', val: stats?.ulbOfficials || 0, color: '#f59e0b' }
                    ].map((v, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{v.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 900, color: v.color }}>{v.val} Active</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button style={{ width: '100%', background: '#f1f5f9', border: 'none', padding: '10px', borderRadius: 10, fontSize: 11, fontWeight: 800, color: '#1e3a8a', cursor: 'pointer' }}>System Broadcast</button>
                  <button style={{ width: '100%', background: '#1e3a8a', border: 'none', padding: '10px', borderRadius: 10, fontSize: 11, fontWeight: 800, color: '#fff', cursor: 'pointer' }}>Auto-Map Assets</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {/* Strategic Coverage */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 900 }}>Strategic Coverage</h3>
                <div style={{ display: 'flex', gap: 12 }}>
                  {strategicCoverage.length > 0 ? strategicCoverage.map((st, i) => (
                    <div key={i} style={{ flex: 1, padding: 12, background: '#f8fafc', borderRadius: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 900 }}>{st.state}</div>
                      <div style={{ fontSize: 20, fontWeight: 950, color: st.col }}>{st.count}</div>
                      <div style={{ fontSize: 8, color: '#64748b', fontWeight: 700 }}>Cities</div>
                    </div>
                  )) : (
                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Pending deployment mapping...</div>
                  )}
                </div>
              </div>

              {/* Activity Log */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 900 }}>Infrastructure Audit</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {auditLogs.length > 0 ? auditLogs.map((ev, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: ev.time === 'New Request' ? '#ef4444' : '#10b981' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>{ev.event}</div>
                        <div style={{ fontSize: 9, color: '#64748b' }}>{ev.label} • {ev.time}</div>
                      </div>
                    </div>
                  )) : (
                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Monitoring system traffic...</div>
                  )}
                </div>
              </div>

              {/* Cloud Resources */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 900 }}>Cloud Health Pulse</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b' }}>UPTIME</span>
                      <span style={{ fontSize: 10, fontWeight: 900 }}>99.9%</span>
                    </div>
                    <div style={{ height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: '99.9%', height: '100%', background: '#10b981' }} />
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', margin: '0 0 2px' }}>PRIMARY NODE</div>
                    <div style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Server size={10} color="#2563eb" /> node-ams-prod-01
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cities' && (
          <div className="fade-in">
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>City Infrastructure Matrix</h3></div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>MUNICIPALITY</th>
                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>MODULES</th>
                    <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>HEALTH</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((city, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 24px', fontWeight: 700, fontSize: 13 }}>{city.name}</td>
                      <td style={{ padding: '14px 24px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {city.modules?.filter((m: any) => m.enabled).map((m: any, i: number) => {
                            let mName = m.name;
                            if (mName.toUpperCase() === 'TOILET') mName = 'Cleanliness of Toilet';
                            if (mName.toUpperCase() === 'TASKFORCE') mName = 'CTU/GVP';
                            return <span key={i} style={{ fontSize: 9, fontWeight: 800, background: '#eff6ff', color: '#1e3a8a', padding: '2px 6px', borderRadius: 4 }}>{mName}</span>;
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: city.enabled ? '#10b981' : '#64748b' }}>{city.enabled ? 'ACTIVE' : 'OFFLINE'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              {allModules.map((m, idx) => {
                let displayName = m.name;
                if (displayName.toUpperCase() === 'TOILET') displayName = 'Cleanliness of Toilet';
                if (displayName.toUpperCase() === 'TASKFORCE') displayName = 'CTU/GVP Transformation';

                return (
                  <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LayoutGrid size={20} /></div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 950 }}>{getCityAdoptionCount(m.name)}</div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8' }}>CITY DEPLOYMENTS</div>
                      </div>
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 900 }}>{displayName}</h3>
                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16, lineHeight: 1.4 }}>Enterprise resource for city-wide governance and resource management.</p>
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981' }}>Availability: Production Live</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RegularUserDashboard() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleCard = (title: string) => {
    setExpanded((prev) => (prev === title ? null : title));
  };

  const visibleCards = moduleCards.filter(card => {
    if (card.title === "HMS Super Admin") {
      return user?.roles.includes("HMS_SUPER_ADMIN");
    }
    return true;
  });

  return (
    <div className="page" style={{ padding: '24px' }}>
      <div className="hero" style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Taskforce 20</h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>Select a workspace to manage city activities.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {visibleCards.map((card) => {
          const isTransformation = card.title === "CTU/GVP Transformation";
          const isOpen = expanded === card.title;
          return (
            <div key={card.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px' }}>
              <div style={{ marginBottom: '16px', color: '#1e3a8a' }}>{card.icon}</div>
              <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 900 }}>{card.title}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: 1.4 }}>{card.desc}</p>
              {!card.actions ? (
                <Link href={card.href} style={{ display: 'inline-block', background: '#1e3a8a', color: '#fff', padding: '8px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>Open Console</Link>
              ) : (
                <>
                  <button onClick={() => toggleCard(card.title)} style={{ background: '#1e3a8a', color: '#fff', padding: '8px 20px', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>{isOpen ? 'Close' : 'Open Transformation'}</button>
                  {isOpen && card.actions && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {card.actions.map(action => <Link key={action.label} href={action.href} style={{ color: '#1e3a8a', fontWeight: 600, textDecoration: 'none', fontSize: 13, background: '#eff6ff', padding: '6px 10px', borderRadius: '6px' }}>{action.label}</Link>)}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  const isSuperAdmin = user?.roles.includes("HMS_SUPER_ADMIN");
  const isCityAdminOrCommissioner = user?.roles.includes("CITY_ADMIN") || user?.roles.includes("COMMISSIONER");
  if (isSuperAdmin) return <SuperAdminDashboard />;
  if (isCityAdminOrCommissioner) return <CityAdminDashboard />;
  return <RegularUserDashboard />;
}
