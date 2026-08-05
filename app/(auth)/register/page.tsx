'use client';

import { useEffect, useState } from "react";
import { ApiError, AuthApi, PublicGeoApi } from "@lib/apiClient";
import { ShieldCheck, ArrowRight, Building2, UserPlus, MapPin, Phone, Hash, Mail, Lock } from "lucide-react";

export default function RegisterPage() {
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
        PublicGeoApi.cities().then((res) => setCities(res.cities || [])).catch(() => { });
    }, []);

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
            await AuthApi.registerRequest(form);
            setStatus("Registration request sent to City Admin. You will be notified once approved.");
            setForm({
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
            setZones([]);
            setWards([]);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message || "Failed to submit request");
            } else {
                setError("Failed to submit request");
            }
        } finally {
            setLoading(false);
        }
    };

    const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

    return (
        <div style={{
            display: "flex",
            minHeight: "100vh",
            width: "100%",
            background: "#fff",
            fontFamily: "'Inter', sans-serif"
        }}>

            {/* ─── LEFT PANEL ─── */}
            <div style={{
                flex: "0.8",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "48px 56px",
                minWidth: 0,
            }} className="auth-left-panel">
                <img src="/login-bg.png" alt="" style={{
                    position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1,
                }} />
                <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(160deg, rgba(10,15,35,0.7) 0%, rgba(10,15,40,0.95) 100%)",
                    zIndex: 2,
                }} />

                <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: 14, background: "rgba(255,255,255,0.15)",
                        backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)",
                        display: "grid", placeItems: "center", color: "#fff",
                    }}>
                        <ShieldCheck size={24} />
                    </div>
                    <span style={{ color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>Taskforce 20</span>
                </div>

                <div style={{ position: "relative", zIndex: 3 }}>
                    <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                        Public Registration
                    </div>
                    <h2 style={{ color: "#fff", fontSize: 32, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.03em", maxWidth: 400, marginBottom: 24 }}>
                        Join the movement for smarter, cleaner cities.
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, lineHeight: 1.6, maxWidth: 360 }}>
                        Submit your supervisor application to become part of the HMS network. Your request will be reviewed by city administrators.
                    </p>
                </div>

                <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80" }} />
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 500 }}>System Live & Accepting Applications</span>
                </div>
            </div>

            {/* ─── RIGHT PANEL ─── */}
            <div style={{
                flex: 1.2,
                background: "#fff",
                padding: "60px 80px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
            }}>
                <div style={{ width: "100%", maxWidth: 640 }}>
                    <div style={{ marginBottom: 32 }}>
                        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.04em" }}>Create Account</h1>
                        <p style={{ color: "#64748b", fontSize: 15 }}>Fill in your details to request access to the portal</p>
                    </div>

                    <form onSubmit={onSubmit}>
                        {/* ULB & Name Row */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                            <div className="field">
                                <label className="premium-label"><Hash size={14} /> ULB Code</label>
                                <input className="premium-input-v2" placeholder="e.g. JMC01" value={form.ulbCode} onChange={(e) => update("ulbCode", e.target.value)} required />
                            </div>
                            <div className="field">
                                <label className="premium-label"><UserPlus size={14} /> Full Name</label>
                                <input className="premium-input-v2" placeholder="John Doe" value={form.name} onChange={(e) => update("name", e.target.value)} required />
                            </div>
                        </div>

                        {/* Geo Selectors Row */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                            <div className="field">
                                <label className="premium-label"><MapPin size={14} /> City</label>
                                <select className="premium-input-v2" value={form.cityId} onChange={(e) => handleCity(e.target.value)} required>
                                    <option value="">City</option>
                                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label className="premium-label"><MapPin size={14} /> Zone</label>
                                <select
                                    className="premium-input-v2"
                                    value={form.zoneId}
                                    onChange={(e) => handleZone(e.target.value)}
                                    required
                                    disabled={!form.cityId || loadingGeo}
                                >
                                    <option value="">Zone</option>
                                    {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                                </select>
                            </div>
                            <div className="field">
                                <label className="premium-label"><MapPin size={14} /> Ward</label>
                                <select
                                    className="premium-input-v2"
                                    value={form.wardId}
                                    onChange={(e) => update("wardId", e.target.value)}
                                    required
                                    disabled={!form.zoneId || loadingGeo}
                                >
                                    <option value="">Ward</option>
                                    {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Contact Row */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                            <div className="field">
                                <label className="premium-label"><Mail size={14} /> Email</label>
                                <input className="premium-input-v2" type="email" placeholder="john@gov.in" value={form.email} onChange={(e) => update("email", e.target.value)} required />
                            </div>
                            <div className="field">
                                <label className="premium-label"><Phone size={14} /> Phone Number</label>
                                <input className="premium-input-v2" placeholder="+91 00000 00000" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
                            </div>
                        </div>

                        {/* Secure Info Row */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
                            <div className="field">
                                <label className="premium-label"><Hash size={14} /> Aadhar Number</label>
                                <input className="premium-input-v2" placeholder="0000 0000 0000" value={form.aadharNumber} onChange={(e) => update("aadharNumber", e.target.value)} required />
                            </div>
                            <div className="field">
                                <label className="premium-label"><Lock size={14} /> Password</label>
                                <input className="premium-input-v2" type="password" placeholder="••••••••" value={form.password} onChange={(e) => update("password", e.target.value)} required />
                            </div>
                        </div>

                        {error && <div className="alert-v2 error">{error}</div>}
                        {status && <div className="alert-v2 success">{status}</div>}

                        <button className="premium-submit" type="submit" disabled={loading}>
                            {loading ? "Submitting Request..." : (<>Submit Access Request <ArrowRight size={18} /></>)}
                        </button>
                    </form>

                    <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                        <a href="/common-registration" style={{ color: "#0f766e", fontWeight: 700, textDecoration: "none" }}>Register As Employee (Taskforce + Swachh)</a>
                        <p style={{ margin: 0, textAlign: "center", color: "#64748b", fontSize: 14 }}>
                            Already have an account? <a href="/login" style={{ color: "#1e3a8a", fontWeight: 700, textDecoration: "none" }}>Sign In</a>
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
        .premium-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 700;
            color: #475569;
            margin-bottom: 8px;
        }
        .premium-input-v2 {
            width: 100%;
            height: 48px;
            padding: 0 16px;
            background: #f8fafc;
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            font-size: 14px;
            color: #0f172a;
            outline: none;
            transition: all 0.2s;
            box-sizing: border-box;
        }
        .premium-input-v2:focus {
            background: #fff;
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
        }
        .premium-submit {
            width: 100%;
            height: 54px;
            background: #1e3a8a;
            color: #fff;
            border: none;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            box-shadow: 0 4px 12px rgba(30, 58, 138, 0.2);
            transition: all 0.2s;
        }
        .premium-submit:hover:not(:disabled) {
            background: #172554;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(30, 58, 138, 0.3);
        }
        .premium-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .alert-v2 {
            padding: 14px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 24px;
        }
        .alert-v2.error {
            background: #fef2f2;
            color: #b91c1c;
            border: 1px solid #fecdd3;
        }
        .alert-v2.success {
            background: #f0fdf4;
            color: #166534;
            border: 1px solid #bbf7d0;
        }
        @media (max-width: 1024px) {
          .auth-left-panel { display: none !important; }
        }
      `}</style>
        </div>
    );
}
