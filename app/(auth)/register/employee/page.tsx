'use client';

import { useEffect, useState } from "react";
import { ApiError, AuthApi, PublicGeoApi } from "@lib/apiClient";
import { ArrowRight, HardHat, MapPin, Phone, Hash, Mail, Lock, UserPlus } from "lucide-react";

export default function EmployeeRegisterPage() {
    const [form, setForm] = useState({
        ulbCode: "",
        name: "",
        email: "",
        phone: "",
        aadharNumber: "",
        password: "",
        cityId: "",
        zoneId: "",
        wardId: ""
    });
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
    const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
    const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
    const [loadingGeo, setLoadingGeo] = useState(false);

    useEffect(() => {
        PublicGeoApi.cities().then((res) => setCities(res.cities || [])).catch(() => {});
    }, []);

    const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

    const handleCity = async (cityId: string) => {
        setForm((f) => ({ ...f, cityId, zoneId: "", wardId: "" }));
        setZones([]);
        setWards([]);
        if (!cityId) return;
        setLoadingGeo(true);
        try {
            const res = await PublicGeoApi.zones(cityId);
            setZones(res.zones || []);
        } finally {
            setLoadingGeo(false);
        }
    };

    const handleZone = async (zoneId: string) => {
        setForm((f) => ({ ...f, zoneId, wardId: "" }));
        setWards([]);
        if (!zoneId) return;
        setLoadingGeo(true);
        try {
            const res = await PublicGeoApi.wards(zoneId);
            setWards(res.wards || []);
        } finally {
            setLoadingGeo(false);
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setStatus("");
        try {
            if (!form.cityId || !form.zoneId || !form.wardId) {
                setError("City, zone, and ward are required");
                setLoading(false);
                return;
            }
            await AuthApi.registerEmployeeRequest(form);
            setStatus("Employee registration request sent to City Admin.");
            setForm({ ulbCode: "", name: "", email: "", phone: "", aadharNumber: "", password: "", cityId: "", zoneId: "", wardId: "" });
            setZones([]);
            setWards([]);
        } catch (err) {
            if (err instanceof ApiError) setError(err.message || "Failed to submit request");
            else setError("Failed to submit request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #f8fafc 0%, #ecfeff 100%)", padding: "48px 20px" }}>
            <div style={{ maxWidth: 760, margin: "0 auto", background: "#fff", border: "1px solid #dbeafe", borderRadius: 24, padding: 32, boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: "#ccfbf1", color: "#115e59", display: "grid", placeItems: "center" }}>
                        <HardHat size={26} />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#0f766e", textTransform: "uppercase", letterSpacing: "0.08em" }}>Employee Registration</div>
                        <h1 style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 800, color: "#0f172a" }}>Register As Employee</h1>
                    </div>
                </div>

                <p style={{ color: "#475569", fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
                    Use this form only for field employees. Your request will be created as an employee registration and then mapped by the city administration.
                </p>

                <form onSubmit={onSubmit}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                        <Field label="ULB Code" icon={<Hash size={14} />}>
                            <input className="employee-input" placeholder="e.g. JMC01" value={form.ulbCode} onChange={(e) => update("ulbCode", e.target.value)} required />
                        </Field>
                        <Field label="Full Name" icon={<UserPlus size={14} />}>
                            <input className="employee-input" placeholder="Ashu Kumar" value={form.name} onChange={(e) => update("name", e.target.value)} required />
                        </Field>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                        <Field label="City" icon={<MapPin size={14} />}>
                            <select className="employee-input" value={form.cityId} onChange={(e) => handleCity(e.target.value)} required>
                                <option value="">City</option>
                                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Zone" icon={<MapPin size={14} />}>
                            <select className="employee-input" value={form.zoneId} onChange={(e) => handleZone(e.target.value)} required disabled={!form.cityId || loadingGeo}>
                                <option value="">Zone</option>
                                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Ward" icon={<MapPin size={14} />}>
                            <select className="employee-input" value={form.wardId} onChange={(e) => update("wardId", e.target.value)} required disabled={!form.zoneId || loadingGeo}>
                                <option value="">Ward</option>
                                {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </Field>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                        <Field label="Email" icon={<Mail size={14} />}>
                            <input className="employee-input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
                        </Field>
                        <Field label="Phone Number" icon={<Phone size={14} />}>
                            <input className="employee-input" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
                        </Field>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
                        <Field label="Aadhar Number" icon={<Hash size={14} />}>
                            <input className="employee-input" value={form.aadharNumber} onChange={(e) => update("aadharNumber", e.target.value)} required />
                        </Field>
                        <Field label="Password" icon={<Lock size={14} />}>
                            <input className="employee-input" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required />
                        </Field>
                    </div>

                    {error ? <div className="alert-box error">{error}</div> : null}
                    {status ? <div className="alert-box success">{status}</div> : null}

                    <button className="employee-submit" type="submit" disabled={loading}>
                        {loading ? "Submitting Request..." : <>Submit Employee Request <ArrowRight size={18} /></>}
                    </button>
                </form>

                <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <a href="/register" style={{ color: "#1d4ed8", fontWeight: 700, textDecoration: "none" }}>Back To Supervisor Registration</a>
                    <a href="/login" style={{ color: "#0f172a", fontWeight: 700, textDecoration: "none" }}>Back To Login</a>
                </div>
            </div>

            <style jsx>{`
                .employee-input {
                    width: 100%;
                    height: 48px;
                    padding: 0 16px;
                    background: #f8fafc;
                    border: 1.5px solid #dbeafe;
                    border-radius: 12px;
                    font-size: 14px;
                    color: #0f172a;
                    outline: none;
                    box-sizing: border-box;
                }
                .employee-input:focus {
                    background: #fff;
                    border-color: #14b8a6;
                    box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.08);
                }
                .employee-submit {
                    width: 100%;
                    height: 54px;
                    border: none;
                    border-radius: 14px;
                    background: #0f766e;
                    color: white;
                    font-weight: 800;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    cursor: pointer;
                }
                .employee-submit:disabled { opacity: 0.6; cursor: not-allowed; }
                .alert-box { padding: 14px; border-radius: 12px; margin-bottom: 18px; font-size: 14px; }
                .alert-box.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
                .alert-box.success { background: #f0fdfa; color: #115e59; border: 1px solid #99f6e4; }
                @media (max-width: 768px) {
                    form > div { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                {icon} {label}
            </label>
            {children}
        </div>
    );
}
