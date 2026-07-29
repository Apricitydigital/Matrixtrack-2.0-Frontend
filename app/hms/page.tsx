'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Building2, Edit2, Globe, Loader2, PlusCircle, Send, Shield, Target, Trash2, UserPlus, Users, X } from "lucide-react";
import { ApiError, CityApi } from "@lib/apiClient";
import { useToast } from "@components/ui/ToastProvider";
import type { CityAdminInfo, CityMasterNode, CityRow, MasterNode } from "../../types/api";

type CityCreateInput = {
  stateId: string;
  divisionId: string;
  districtId: string;
  cityMasterId: string;
  code: string;
  ulbCode: string;
};

type CityUpdateInput = {
  stateId?: string;
  divisionId?: string;
  districtId?: string;
  cityMasterId?: string;
  name?: string;
  code: string;
  ulbCode: string;
  adminName?: string;
  adminEmail?: string;
};

export default function HmsDashboardPage() {
  const { showToast } = useToast();
  const [cities, setCities] = useState<CityRow[]>([]);
  const [states, setStates] = useState<MasterNode[]>([]);
  const [divisions, setDivisions] = useState<MasterNode[]>([]);
  const [districts, setDistricts] = useState<MasterNode[]>([]);
  const [masterCities, setMasterCities] = useState<CityMasterNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCity, setEditingCity] = useState<CityRow | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<{ cityId: string; cityName: string; admin: CityAdminInfo } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ cityId: string; userId: string; adminName: string } | null>(null);

  const [stateId, setStateId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityMasterId, setCityMasterId] = useState("");
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
      setCities(cityRes.cities);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadStates = async () => {
    try {
      setMasterLoading(true);
      const res = await CityApi.listStates();
      setStates(res.states);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load states");
    } finally {
      setMasterLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    loadStates();
  }, []);

  useEffect(() => {
    if (!stateId) {
      setDivisions([]);
      setDivisionId("");
      setDistricts([]);
      setDistrictId("");
      setMasterCities([]);
      setCityMasterId("");
      return;
    }

    let active = true;
    setMasterLoading(true);
    CityApi.listDivisions(stateId)
      .then((res) => {
        if (!active) return;
        setDivisions(res.divisions);
        setDivisionId("");
        setDistricts([]);
        setDistrictId("");
        setMasterCities([]);
        setCityMasterId("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Failed to load divisions");
      })
      .finally(() => {
        if (active) setMasterLoading(false);
      });

    return () => {
      active = false;
    };
  }, [stateId]);

  useEffect(() => {
    if (!stateId || !divisionId) {
      setDistricts([]);
      setDistrictId("");
      setMasterCities([]);
      setCityMasterId("");
      return;
    }

    let active = true;
    setMasterLoading(true);
    CityApi.listDistricts(stateId, divisionId)
      .then((res) => {
        if (!active) return;
        setDistricts(res.districts);
        setDistrictId("");
        setMasterCities([]);
        setCityMasterId("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Failed to load districts");
      })
      .finally(() => {
        if (active) setMasterLoading(false);
      });

    return () => {
      active = false;
    };
  }, [stateId, divisionId]);

  useEffect(() => {
    if (!districtId) {
      setMasterCities([]);
      setCityMasterId("");
      return;
    }

    let active = true;
    setMasterLoading(true);
    CityApi.listCities(districtId)
      .then((res) => {
        if (!active) return;
        setMasterCities(res.cities);
        setCityMasterId("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Failed to load cities");
      })
      .finally(() => {
        if (active) setMasterLoading(false);
      });

    return () => {
      active = false;
    };
  }, [districtId]);

  useEffect(() => {
    const selectedCity = masterCities.find((city) => city.id === cityMasterId);
    if (!selectedCity) return;
    if (!cityCode) setCityCode(selectedCity.code.toLowerCase());
    if (!cityUlbCode) setCityUlbCode(selectedCity.code.toLowerCase());
  }, [cityMasterId, masterCities, cityCode, cityUlbCode]);

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCityStatus("Creating...");
    try {
      const payload: CityCreateInput = {
        stateId,
        divisionId,
        districtId,
        cityMasterId,
        code: cityCode,
        ulbCode: cityUlbCode || cityCode
      };
      await CityApi.create(payload);
      setCityStatus("City created.");
      showToast({ title: "City created", description: "New city cluster deployed successfully.", tone: "success" });
      setStateId("");
      setDivisionId("");
      setDistrictId("");
      setCityMasterId("");
      setDivisions([]);
      setDistricts([]);
      setMasterCities([]);
      setCityCode("");
      setCityUlbCode("");
      await refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create city.";
      setCityStatus(message);
      showToast({ title: "City creation failed", description: message, tone: "error" });
    }
  };

  const handleToggleCity = async (cityId: string, enabled: boolean) => {
    try {
      await CityApi.setEnabled(cityId, enabled);
      setCities((prev) => prev.map((c) => (c.id === cityId ? { ...c, enabled } : c)));
    } catch (err) {
      showToast({
        title: "City status update failed",
        description: err instanceof ApiError ? err.message : "Failed to toggle city.",
        tone: "error"
      });
    }
  };

  const handleUpdateCity = async (cityId: string, data: CityUpdateInput) => {
    try {
      await CityApi.update(cityId, data);
      await refresh();
      setEditingCity(null);
      showToast({ title: "City updated", description: "Cluster details saved.", tone: "success" });
    } catch (err) {
      showToast({
        title: "City update failed",
        description: err instanceof ApiError ? err.message : "Failed to update city.",
        tone: "error"
      });
    }
  };

  const handleUpdateAdmin = async (cityId: string, userId: string, data: { name?: string; email?: string; password?: string }) => {
    try {
      await CityApi.updateCityAdmin(cityId, userId, data);
      await refresh();
      setEditingAdmin(null);
      showToast({ title: "Admin updated", description: "City admin details saved.", tone: "success" });
    } catch (err) {
      showToast({
        title: "Admin update failed",
        description: err instanceof ApiError ? err.message : "Failed to update city admin.",
        tone: "error"
      });
    }
  };

  const handleDeleteAdmin = (cityId: string, userId: string, adminName: string) => {
    setDeleteTarget({ cityId, userId, adminName });
  };

  const confirmDeleteAdmin = async () => {
    if (!deleteTarget) return;
    try {
      await CityApi.removeCityAdmin(deleteTarget.cityId, deleteTarget.userId);
      await refresh();
      showToast({ title: "Admin removed", description: `${deleteTarget.adminName} was removed from the city.`, tone: "success" });
      setDeleteTarget(null);
    } catch (err) {
      showToast({
        title: "Admin deletion failed",
        description: err instanceof ApiError ? err.message : "Failed to delete city admin.",
        tone: "error"
      });
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
      showToast({ title: "Admin created", description: "City administrator provisioned successfully.", tone: "success" });
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      await refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create city admin.";
      setAdminStatus(message);
      showToast({ title: "Admin creation failed", description: message, tone: "error" });
    }
  };

  const totalCities = cities.length;
  const activeCities = cities.filter((c) => c.enabled).length;
  const managedCities = cities.filter((c) => (c.cityAdmins?.length ?? 0) > 0).length;
  const totalUlbs = new Set(cities.map((c) => c.ulbCode).filter(Boolean)).size;

  return (
    <div className="page" style={{ background: '#f8fafc', minHeight: '100vh', padding: 0 }}>
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', padding: '40px 48px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 12, fontSize: 12, fontWeight: 700 }}>HMS / SUPER ADMIN</div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Infrastructure Control</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8, maxWidth: 640 }}>
              State to city onboarding now runs on hierarchical master data. Select state, division, district, then city.
            </p>
          </div>
          <button onClick={refresh} disabled={loading} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Syncing...' : 'Refresh'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 20, marginTop: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Cities', value: totalCities, icon: <Globe size={16} /> },
            { label: 'Active Sites', value: activeCities, icon: <Activity size={16} /> },
            { label: 'Managed Admins', value: managedCities, icon: <Users size={16} /> },
            { label: 'Unique ULBs', value: totalUlbs, icon: <Target size={16} /> }
          ].map((item) => (
            <div key={item.label} style={{ padding: '16px 20px', borderRadius: 14, minWidth: 170, display: 'flex', alignItems: 'center', gap: 14, color: '#fff', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.14)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 700, textTransform: 'uppercase', marginTop: 4 }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '32px 48px' }}>
        {error && <div className="alert error" style={{ marginBottom: 24, borderRadius: 12 }}>{error}</div>}

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>System Mapping</div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Provisioned Cities</h3>
            </div>
            <Link href="/hms/cities/new" style={{ fontSize: 12, fontWeight: 800, color: '#2563eb' }}>Open focused create page</Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <tr>
                  <th style={thStyle}>City</th>
                  <th style={thStyle}>Hierarchy</th>
                  <th style={thStyle}>Identity</th>
                  <th style={thStyle}>Admin</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Control</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city) => (
                  <tr key={city.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={tdStyle}>
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
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={pillStyle}>{city.state?.name || 'No state'}</span>
                        <span style={pillStyle}>{city.division?.name || 'No division'}</span>
                        <span style={pillStyle}>{city.district?.name || 'No district'}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={pillStyle}>CODE: {city.code}</span>
                        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>ULB: {city.ulbCode || '—'}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {(city.cityAdmins?.length ?? 0) > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(city.cityAdmins ?? []).map((admin) => (
                            <div key={admin.id || admin.email} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{admin.name}</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>{admin.email}</div>
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button type="button" onClick={() => setEditingAdmin({ cityId: city.id, cityName: city.name, admin })} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #dbeafe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Edit2 size={14} />
                                </button>
                                <button type="button" onClick={() => handleDeleteAdmin(city.id, admin.id || '', admin.name)} disabled={!admin.id} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: admin.id ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: admin.id ? 1 : 0.5 }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : city.cityAdmin ? (
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{city.cityAdmin.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{city.cityAdmin.email}</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No active administrator</div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => handleToggleCity(city.id, !city.enabled)} style={{ border: `1px solid ${city.enabled ? '#10b981' : '#cbd5e1'}`, background: city.enabled ? '#ecfdf5' : '#f8fafc', color: city.enabled ? '#065f46' : '#64748b', padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                        {city.enabled ? 'LIVE' : 'DORMANT'}
                      </button>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={() => setEditingCity(city)} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!cities.length && !loading && (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No cities provisioned yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 32 }}>
          <div style={cardStyle}>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlusCircle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Onboard New City</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>State ? Division ? District ? City</p>
              </div>
            </div>

            <form onSubmit={handleCreateCity} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <SelectField label="State" value={stateId} onChange={setStateId} options={states} placeholder={masterLoading ? 'Loading states...' : 'Select state'} required />
              <SelectField label="Division" value={divisionId} onChange={setDivisionId} options={divisions} placeholder={stateId ? (masterLoading ? 'Loading divisions...' : 'Select division') : 'Select state first'} disabled={!stateId} required />
              <SelectField label="District" value={districtId} onChange={setDistrictId} options={districts} placeholder={divisionId ? (masterLoading ? 'Loading districts...' : 'Select district') : 'Select division first'} disabled={!divisionId} required />
              <SelectField label="City" value={cityMasterId} onChange={setCityMasterId} options={masterCities} placeholder={districtId ? (masterLoading ? 'Loading cities...' : 'Select city') : 'Select district first'} disabled={!districtId} required />
              <InputField label="System Code" value={cityCode} onChange={setCityCode} placeholder="e.g. indore" required />
              <InputField label="ULB Identifier" value={cityUlbCode} onChange={setCityUlbCode} placeholder="e.g. idr01" />
              <button type="submit" style={{ marginTop: 8, width: '100%', borderRadius: 12, height: 48, fontWeight: 800, fontSize: 15, background: '#1e3a8a', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Send size={16} /> Deploy City Cluster
              </button>
              {cityStatus && <div style={{ fontSize: 12, color: cityStatus.toLowerCase().includes('fail') ? '#dc2626' : '#2563eb', textAlign: 'center', fontWeight: 600 }}>{cityStatus}</div>}
            </form>
          </div>

          <div style={cardStyle}>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0 }}>Provision City Admin</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Delegating control to local authorities.</p>
              </div>
            </div>

            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={labelStyle}>Target Cluster</label>
                <select style={inputStyle} value={adminCityId} onChange={(e) => setAdminCityId(e.target.value)} required>
                  <option value="">Select city cluster...</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>{city.name} ({city.code})</option>
                  ))}
                </select>
              </div>
              <InputField label="Full Name" value={adminName} onChange={setAdminName} placeholder="Administrator Name" required />
              <InputField label="Provisioning Email" value={adminEmail} onChange={setAdminEmail} placeholder="admin@city.local" required type="email" />
              <InputField label="Secure Password" value={adminPassword} onChange={setAdminPassword} placeholder="••••••••" required type="password" />
              <button type="submit" style={{ marginTop: 8, width: '100%', borderRadius: 12, height: 48, fontWeight: 800, fontSize: 15, background: '#1e3a8a', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Shield size={16} /> Provision Admin
              </button>
              {adminStatus && <div style={{ fontSize: 12, color: adminStatus.toLowerCase().includes('fail') ? '#dc2626' : '#2563eb', textAlign: 'center', fontWeight: 600 }}>{adminStatus}</div>}
            </form>
          </div>
        </div>
      </div>

      {editingCity && <EditCityModal city={editingCity} states={states} onClose={() => setEditingCity(null)} onSave={handleUpdateCity} />}
      {deleteTarget && (
        <DeleteAdminConfirmModal
          adminName={deleteTarget.adminName}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteAdmin}
        />
      )}
      {editingAdmin && editingAdmin.admin.id && (
        <EditCityAdminModal
          cityId={editingAdmin.cityId}
          cityName={editingAdmin.cityName}
          admin={editingAdmin.admin}
          onClose={() => setEditingAdmin(null)}
          onSave={handleUpdateAdmin}
        />
      )}
    </div>
  );
}

function EditCityAdminModal({ cityId, cityName, admin, onClose, onSave }: { cityId: string; cityName: string; admin: CityAdminInfo; onClose: () => void; onSave: (cityId: string, userId: string, data: { name?: string; email?: string; password?: string }) => Promise<void> }) {
  const [name, setName] = useState(admin.name);
  const [email, setEmail] = useState(admin.email);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(cityId, admin.id || '', {
        name,
        email,
        ...(password ? { password } : {})
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ width: '90%', maxWidth: 460, overflow: 'hidden', background: '#fff', borderRadius: 24, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Edit City Admin</h3>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>{cityName}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', padding: 8, borderRadius: 10 }}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <InputField label="Admin Name" value={name} onChange={setName} placeholder="e.g. Jane Doe" required compact />
          <InputField label="Admin Email" value={email} onChange={setEmail} placeholder="e.g. admin@city.local" type="email" required compact />
          <InputField label="New Password" value={password} onChange={setPassword} placeholder="Leave blank to keep same" type="password" compact />
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 800, height: 44, borderRadius: 12, cursor: 'pointer' }} disabled={loading}>Discard</button>
            <button type="submit" style={{ flex: 1, background: '#1e3a8a', color: '#fff', border: 'none', fontWeight: 800, height: 44, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditCityModal({ city, states, onClose, onSave }: { city: CityRow; states: MasterNode[]; onClose: () => void; onSave: (id: string, data: CityUpdateInput) => Promise<void> }) {
  const [stateId, setStateId] = useState(city.state?.id || '');
  const [divisionId, setDivisionId] = useState(city.division?.id || '');
  const [districtId, setDistrictId] = useState(city.district?.id || '');
  const [cityMasterId, setCityMasterId] = useState('');
  const [divisions, setDivisions] = useState<MasterNode[]>([]);
  const [districts, setDistricts] = useState<MasterNode[]>([]);
  const [masterCities, setMasterCities] = useState<CityMasterNode[]>([]);
  const [code, setCode] = useState(city.code);
  const [ulbCode, setUlbCode] = useState(city.ulbCode || '');
  const [adminName, setAdminName] = useState(city.cityAdmin?.name || '');
  const [adminEmail, setAdminEmail] = useState(city.cityAdmin?.email || '');
  const [loading, setLoading] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(false);

  useEffect(() => {
    if (!stateId) {
      setDivisions([]);
      setDivisionId('');
      setDistricts([]);
      setDistrictId('');
      setMasterCities([]);
      setCityMasterId('');
      return;
    }

    let active = true;
    setLoadingMasters(true);
    CityApi.listDivisions(stateId)
      .then((res) => {
        if (!active) return;
        const nextDivisions = res.divisions;
        setDivisions(nextDivisions);
        setDivisionId((current) => (nextDivisions.some((item: MasterNode) => item.id === current) ? current : ''));
      })
      .catch(() => {
        if (!active) return;
        setDivisions([]);
        setDivisionId('');
      })
      .finally(() => {
        if (active) setLoadingMasters(false);
      });

    return () => {
      active = false;
    };
  }, [stateId]);

  useEffect(() => {
    if (!stateId || !divisionId) {
      setDistricts([]);
      setDistrictId('');
      setMasterCities([]);
      setCityMasterId('');
      return;
    }

    let active = true;
    setLoadingMasters(true);
    CityApi.listDistricts(stateId, divisionId)
      .then((res) => {
        if (!active) return;
        const nextDistricts = res.districts;
        setDistricts(nextDistricts);
        setDistrictId((current) => (nextDistricts.some((item: MasterNode) => item.id === current) ? current : ''));
      })
      .catch(() => {
        if (!active) return;
        setDistricts([]);
        setDistrictId('');
      })
      .finally(() => {
        if (active) setLoadingMasters(false);
      });

    return () => {
      active = false;
    };
  }, [stateId, divisionId]);

  useEffect(() => {
    if (!districtId) {
      setMasterCities([]);
      setCityMasterId('');
      return;
    }

    let active = true;
    setLoadingMasters(true);
    CityApi.listCities(districtId)
      .then((res) => {
        if (!active) return;
        const nextCities = res.cities;
        setMasterCities(nextCities);
        setCityMasterId((current) => {
          if (nextCities.some((item: CityMasterNode) => item.id === current)) return current;
          const matched = nextCities.find((item: CityMasterNode) => item.name.toLowerCase() === city.name.toLowerCase());
          return matched?.id || '';
        });
      })
      .catch(() => {
        if (!active) return;
        setMasterCities([]);
        setCityMasterId('');
      })
      .finally(() => {
        if (active) setLoadingMasters(false);
      });

    return () => {
      active = false;
    };
  }, [districtId, city.name]);

  const selectedMasterCity = masterCities.find((item) => item.id === cityMasterId) || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(city.id, {
        ...(stateId && divisionId && districtId && cityMasterId ? { stateId, divisionId, districtId, cityMasterId } : {}),
        ...(selectedMasterCity ? { name: selectedMasterCity.name } : { name: city.name }),
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
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ width: '90%', maxWidth: 560, overflow: 'hidden', background: '#fff', borderRadius: 24, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Modify Cluster</h3>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>{city.state?.name || 'No state'} / {city.division?.name || 'No division'} / {city.district?.name || 'No district'}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', padding: 8, borderRadius: 10 }}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SelectField label="State" value={stateId} onChange={setStateId} options={states} placeholder={loadingMasters ? 'Loading states...' : 'Select state'} compact />
          <SelectField label="Division" value={divisionId} onChange={setDivisionId} options={divisions} placeholder={stateId ? (loadingMasters ? 'Loading divisions...' : 'Select division') : 'Select state first'} disabled={!stateId} compact />
          <SelectField label="District" value={districtId} onChange={setDistrictId} options={districts} placeholder={divisionId ? (loadingMasters ? 'Loading districts...' : 'Select district') : 'Select division first'} disabled={!divisionId} compact />
          <SelectField label="City" value={cityMasterId} onChange={setCityMasterId} options={masterCities} placeholder={districtId ? (loadingMasters ? 'Loading cities...' : 'Select city') : 'Select district first'} disabled={!districtId} compact />
          <InputField label="City Name" value={selectedMasterCity?.name || city.name} onChange={() => {}} placeholder="Selected from hierarchy" required compact readOnly />
          <InputField label="City Code" value={code} onChange={setCode} placeholder="e.g. indore" required compact />
          <InputField label="ULB Code" value={ulbCode} onChange={setUlbCode} placeholder="e.g. idr01" required compact />
          <InputField label="Admin Name" value={adminName} onChange={setAdminName} placeholder="e.g. Jane Doe" compact />
          <InputField label="Admin Email" value={adminEmail} onChange={setAdminEmail} placeholder="e.g. admin@city.local" type="email" compact />
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 800, height: 44, borderRadius: 12, cursor: 'pointer' }} disabled={loading}>Discard</button>
            <button type="submit" style={{ flex: 1, background: '#1e3a8a', color: '#fff', border: 'none', fontWeight: 800, height: 44, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Commit Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteAdminConfirmModal({ adminName, onCancel, onConfirm }: { adminName: string; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ width: '90%', maxWidth: 420, overflow: 'hidden', background: '#fff', borderRadius: 24, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', background: '#fef2f2' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#7f1d1d' }}>Delete City Admin</h3>
          <div style={{ fontSize: 13, color: '#991b1b', marginTop: 6 }}>Remove {adminName} from this city cluster?</div>
        </div>
        <div style={{ padding: 32 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
            This action removes the administrator mapping immediately. If the user has no other assignments, the account will also be deleted.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="button" onClick={onCancel} style={{ flex: 1, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 800, height: 44, borderRadius: 12, cursor: 'pointer' }} disabled={loading}>Cancel</button>
            <button type="button" onClick={handleConfirm} style={{ flex: 1, background: '#b91c1c', color: '#fff', border: 'none', fontWeight: 800, height: 44, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Delete Admin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, required, disabled, compact = false }: { label: string; value: string; onChange: (value: string) => void; options: MasterNode[]; placeholder: string; required?: boolean; disabled?: boolean; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={labelStyle}>{label}</label>
      <select style={{ ...inputStyle, height: compact ? 40 : 44 }} value={value} onChange={(e) => onChange(e.target.value)} required={required} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, required, type = 'text', compact = false, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean; type?: string; compact?: boolean; readOnly?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 6 : 8 }}>
      <label style={labelStyle}>{label}</label>
      <input style={{ ...inputStyle, height: compact ? 40 : 44, ...(readOnly ? { color: '#0f172a', background: '#f8fafc' } : {}) }} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} type={type} readOnly={readOnly} />
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle: React.CSSProperties = { padding: '20px 24px' };
const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' };
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle: React.CSSProperties = { background: '#f8fafc', height: 44, borderRadius: 10, border: '1px solid #e2e8f0', padding: '0 14px' };
const pillStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#475569', background: '#f8fafc', padding: '4px 8px', borderRadius: 8, width: 'fit-content' };
