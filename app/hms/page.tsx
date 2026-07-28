'use client';

import { useEffect, useState } from "react";
import { ApiError, CityApi } from "@lib/apiClient";
import { Edit2, X, Loader2, Activity, Shield, Building2, Globe, Users, Target, ChevronRight, PlusCircle, UserPlus, Send } from "lucide-react";
import Link from "next/link";

interface CityAdminInfo {
  name: string;
  email: string;
}

interface CityRow {
  id: string;
  name: string;
  code: string;
  ulbCode?: string;
  enabled: boolean;
  cityAdmin: CityAdminInfo | null;
}

export default function HmsDashboardPage() {
  const [cities, setCities] = useState<CityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCity, setEditingCity] = useState<CityRow | null>(null);

  const [cityName, setCityName] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [cityUlbCode, setCityUlbCode] = useState("");
  const [cityStatus, setCityStatus] = useState("");

  const [adminCityId, setAdminCityId] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminStatus, setAdminStatus] = useState("");

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const cityRes = await CityApi.list();
      setCities((cityRes as any).cities ?? cityRes);
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : "Failed to load data";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCityStatus("Creating...");
    try {
      await CityApi.create({ name: cityName, code: cityCode, ulbCode: cityUlbCode || cityCode });
      setCityStatus("City created.");
      setCityName("");
      setCityCode("");
      setCityUlbCode("");
      await refresh();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : "Failed to create city.";
      setCityStatus(message);
    }
  };

  const handleToggleCity = async (cityId: string, enabled: boolean) => {
    try {
      await CityApi.setEnabled(cityId, enabled);
      setCities((prev) => prev.map((c) => (c.id === cityId ? { ...c, enabled } : c)));
    } catch (err) {
      alert("Failed to toggle city: " + (err instanceof ApiError ? err.message : ""));
    }
  };

  const handleUpdateCity = async (cityId: string, data: { name: string; code: string; ulbCode: string; adminName?: string; adminEmail?: string }) => {
    try {
      await CityApi.update(cityId, data);
      await refresh();
      setEditingCity(null);
    } catch (err: any) {
      alert(err instanceof ApiError ? err.message : "Failed to update city");
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminStatus("Creating...");
    try {
      await CityApi.createCityAdmin(adminCityId, {
        email: adminEmail,
        password: adminPassword,
        name: adminName
      });
      setAdminStatus("City admin created.");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      await refresh();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : "Failed to create city admin.";
      setAdminStatus(message);
    }
  };

  const totalCities = cities.length;
  const activeCities = cities.filter(c => c.enabled).length;
  const managedCities = cities.filter(c => c.cityAdmin).length;
  const totalUlbs = new Set(cities.map(c => c.ulbCode).filter(Boolean)).size;

  return (
    <div className="page" style={{ background: '#f8fafc', minHeight: '100vh', padding: 0 }}>
      <style>{`
        .da-card { transition: all 0.2s ease; }
        .da-card:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.08) !important; }
        .hero-banner { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); position: relative; overflow: hidden; }
        .glass-stat { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(8px); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* ── Premium Hero Banner ── */}
      <div className="hero-banner" style={{ padding: '40px 48px 32px' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="breadcrumb" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 12, fontSize: 12, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={12} /> HMS / SUPER ADMIN</span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              Infrastructure Control
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 8, maxWidth: 500 }}>
              Global oversight of municipal deployments, city-level administration, and system-wide module provisioning.
            </p>
          </div>

          <button onClick={refresh} disabled={loading} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Syncing..." : "Refresh Cluster"}
          </button>
        </div>

        {/* ── Global Stats Row ── */}
        <div style={{ display: 'flex', gap: 20, marginTop: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Cities', value: totalCities, icon: <Globe size={16} /> },
            { label: 'Active Sites', value: activeCities, icon: <Activity size={16} /> },
            { label: 'Managed Admins', value: managedCities, icon: <Users size={16} /> },
            { label: 'Unique ULBs', value: totalUlbs, icon: <Target size={16} /> },
          ].map((s, i) => (
            <div key={i} className="glass-stat" style={{ padding: '16px 24px', borderRadius: 14, minWidth: 160, display: 'flex', alignItems: 'center', gap: 14, color: '#fff' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '32px 48px' }}>
        {error && <div className="alert error" style={{ marginBottom: 24, borderRadius: 12 }}>{error}</div>}

        {loading ? (
          <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
        ) : (
          <>
            {/* City Overview Table */}
            <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', marginBottom: 32 }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>System Mapping</div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Provisioned Cities</h3>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f8fafc', padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    {cities.length} Total Clusters
                  </div>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <tr>
                      <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>City Details</th>
                      <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Identity Codes</th>
                      <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Administrative Lead</th>
                      <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operational Status</th>
                      <th style={{ padding: '16px 32px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Control</th>
                    </tr>
                  </thead>
                  <tbody style={{ background: 'white' }}>
                    {cities.map((city) => (
                      <tr key={city.id} className="da-row" style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.2s' }}>
                        <td style={{ padding: '20px 32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: city.enabled ? '#eff6ff' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: city.enabled ? '#2563eb' : '#94a3b8' }}>
                              <Building2 size={20} />
                            </div>
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{city.name}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>ID: {city.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '20px 32px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, width: 'fit-content' }}>CODE: {city.code}</span>
                            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>ULB: {city.ulbCode || "—"}</span>
                          </div>
                        </td>
                        <td style={{ padding: '20px 32px' }}>
                          {city.cityAdmin ? (
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{city.cityAdmin.name}</div>
                              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{city.cityAdmin.email}</div>
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', fontWeight: 500 }}>No active administrator</div>
                          )}
                        </td>
                        <td style={{ padding: '20px 32px' }}>
                          <label
                            onClick={(e) => {
                              e.preventDefault();
                              handleToggleCity(city.id, !city.enabled);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 10,
                              cursor: 'pointer',
                              background: city.enabled ? '#ecfdf5' : '#f1f5f9',
                              padding: '6px 14px',
                              borderRadius: 10,
                              border: `1px solid ${city.enabled ? '#10b981' : '#e2e8f0'}`,
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: city.enabled ? '#10b981' : '#94a3b8' }} />
                            <span style={{ fontSize: 12, fontWeight: 800, color: city.enabled ? '#065f46' : '#64748b' }}>
                              {city.enabled ? "LIVE" : "DORMANT"}
                            </span>
                          </label>
                        </td>
                        <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                          <button
                            onClick={() => setEditingCity(city)}
                            style={{
                              width: 36, height: 36,
                              borderRadius: 10,
                              border: '1px solid #e2e8f0',
                              background: '#fff',
                              color: '#475569',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f8fafc';
                              e.currentTarget.style.borderColor = '#2563eb';
                              e.currentTarget.style.color = '#2563eb';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fff';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.color = '#475569';
                            }}
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {cities.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                          <Globe size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
                          <div style={{ fontSize: 16, fontWeight: 700 }}>No cities provisioned yet</div>
                          <p style={{ fontSize: 12, marginTop: 4 }}>Deploy your first municipal cluster below.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Creation Forms */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 32 }}>
              {/* Create City */}
              <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PlusCircle size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Onboard New City</h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 500 }}>Deploy a new municipal cluster.</p>
                  </div>
                </div>
                <form onSubmit={handleCreateCity} className="form" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cluster Name</label>
                    <input className="input" style={{ background: '#f8fafc', height: 44, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 14px' }} value={cityName} onChange={(e) => setCityName(e.target.value)} placeholder="e.g. Indore" required />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Code</label>
                    <input className="input" style={{ background: '#f8fafc', height: 44, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 14px' }} value={cityCode} onChange={(e) => setCityCode(e.target.value)} placeholder="e.g. indore" required />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ULB Identifier</label>
                    <input
                      className="input"
                      style={{ background: '#f8fafc', height: 44, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 14px' }}
                      value={cityUlbCode}
                      onChange={(e) => setCityUlbCode(e.target.value)}
                      placeholder="Enter ULB code (e.g. idr01)"
                    />
                  </div>

                  <button className="btn btn-primary" style={{ marginTop: 12, width: '100%', borderRadius: 12, height: 48, fontWeight: 800, fontSize: 15, background: '#1e3a8a', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} type="submit">
                    <Send size={16} /> Deploy City Cluster
                  </button>
                  {cityStatus && <div style={{ fontSize: 12, color: cityStatus.includes("Error") ? '#dc2626' : '#2563eb', textAlign: 'center', fontWeight: 600 }}>{cityStatus}</div>}
                </form>
              </div>

              {/* Create Admin */}
              <div className="da-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserPlus size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Provision City Admin</h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontWeight: 500 }}>Delegating control to local authorities.</p>
                  </div>
                </div>
                <form onSubmit={handleCreateAdmin} className="form" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Cluster</label>
                    <select
                      className="input"
                      style={{ background: '#f8fafc', height: 44, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 14px' }}
                      value={adminCityId}
                      onChange={(e) => setAdminCityId(e.target.value)}
                      required
                    >
                      <option value="">Select city cluster...</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                    <input
                      className="input"
                      style={{ background: '#f8fafc', height: 44, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 14px' }}
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Administrator Name"
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Provisioning Email</label>
                    <input
                      className="input"
                      style={{ background: '#f8fafc', height: 44, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 14px' }}
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@city.local"
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secure Password</label>
                    <input
                      className="input"
                      style={{ background: '#f8fafc', height: 44, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 14px' }}
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <button className="btn btn-primary" style={{ marginTop: 12, width: '100%', borderRadius: 12, height: 48, fontWeight: 800, fontSize: 15, background: '#1e3a8a', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} type="submit">
                    <Shield size={16} /> Provision Admin
                  </button>
                  {adminStatus && <div style={{ fontSize: 12, color: adminStatus.includes("Error") ? '#dc2626' : '#2563eb', textAlign: 'center', fontWeight: 600 }}>{adminStatus}</div>}
                </form>
              </div>
            </div>
          </>
        )}
      </div>

      {editingCity && (
        <EditCityModal
          city={editingCity}
          onClose={() => setEditingCity(null)}
          onSave={handleUpdateCity}
        />
      )}
    </div>
  );
}

function EditCityModal({ city, onClose, onSave }: { city: CityRow; onClose: () => void; onSave: (id: string, data: any) => Promise<void> }) {
  const [name, setName] = useState(city.name);
  const [code, setCode] = useState(city.code);
  const [ulbCode, setUlbCode] = useState(city.ulbCode || "");
  const [adminName, setAdminName] = useState(city.cityAdmin?.name || "");
  const [adminEmail, setAdminEmail] = useState(city.cityAdmin?.email || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(city.id, {
        name,
        code,
        ulbCode,
        adminName,
        adminEmail
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="da-card" style={{
        width: '90%', maxWidth: '450px', padding: 0, overflow: 'hidden', background: '#fff', borderRadius: 24,
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
      }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Modify Cluster</h3>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>Edit City & Admin Details</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', padding: 8, borderRadius: 10 }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>City Name</label>
              <input
                className="input"
                style={{ background: '#f8fafc', height: 40, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 12px' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pune"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>City Code</label>
              <input
                className="input"
                style={{ background: '#f8fafc', height: 40, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 12px' }}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. pune"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>ULB Code</label>
            <input
              className="input"
              style={{ background: '#f8fafc', height: 40, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 12px' }}
              value={ulbCode}
              onChange={(e) => setUlbCode(e.target.value)}
              placeholder="e.g. pn01"
              required
            />
          </div>

          <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Shield size={14} color="#2563eb" />
              <span style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Administrative Data</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>ADMIN NAME</label>
                <input
                  className="input"
                  style={{ background: '#f8fafc', height: 40, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 12px' }}
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>ADMIN EMAIL</label>
                <input
                  className="input"
                  style={{ background: '#f8fafc', height: 40, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 12px' }}
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="e.g. admin@city.local"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 800, height: 44, borderRadius: 12, cursor: 'pointer' }}
              disabled={loading}
            >
              Discard
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, background: '#1e3a8a', color: '#fff', border: 'none', fontWeight: 800, height: 44, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Commit Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
