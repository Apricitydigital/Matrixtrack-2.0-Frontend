'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiError, AuthApi, PublicGeoApi } from "@lib/apiClient";
import { setAuthCookie, decodeToken } from "@lib/auth";
import { useAuth } from "@hooks/useAuth";
import { getPostLoginRedirect } from "@utils/modules";
import {
  Eye, EyeOff, ShieldCheck, ArrowRight, Building2, Globe, X, Lock, Users, Sparkles, UserPlus, LogIn, Hash, Mail, Phone, MapPin, CheckCircle2
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 100% Exact Original Register Form States
  const [regForm, setRegForm] = useState({
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
  const [regStatus, setRegStatus] = useState("");
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Fetch Cities on load for registration
  useEffect(() => {
    PublicGeoApi.cities().then((res) => setCities(res.cities || [])).catch(() => {});
  }, []);

  const handleCityChange = async (cityId: string) => {
    setRegForm((f) => ({ ...f, cityId, zoneId: "", wardId: "" }));
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

  const handleZoneChange = async (zoneId: string) => {
    setRegForm((f) => ({ ...f, zoneId, wardId: "" }));
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

  const updateRegForm = (key: keyof typeof regForm, value: string) => {
    setRegForm((f) => ({ ...f, [key]: value }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { token, user: authUser } = await AuthApi.login({ email, password });
      setAuthCookie(token);
      const decoded = decodeToken(token, authUser);
      setUser(decoded);
      router.replace(getPostLoginRedirect(decoded));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid email or password. Please try again.");
      } else if (err instanceof ApiError) {
        setError(err.message || "An error occurred. Please try again.");
      } else {
        setError("Login failed. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setRegStatus("");
    try {
      if (!regForm.cityId || !regForm.zoneId || !regForm.wardId) {
        setError("City, Zone, and Ward are required");
        setLoading(false);
        return;
      }
      await AuthApi.registerRequest(regForm);
      setRegStatus("Registration request sent to City Admin. You will be notified once approved.");
      setRegForm({
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

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      width: "100%",
      background: "linear-gradient(135deg, #090d16 0%, #0f172a 60%, #1e3a8a 100%)",
      color: "#ffffff",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: "hidden"
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-drawer { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hover-btn { transition: all 0.2s ease; }
        .hover-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }
        .drawer-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 6px;
        }
        .drawer-input-v4 {
          width: 100%; height: 46px; padding: 0 16px;
          background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px;
          font-size: 14px; color: #0f172a; outline: none; box-sizing: border-box;
          font-weight: 600; transition: all 0.2s ease;
        }
        .drawer-input-v4:focus {
          background: #ffffff; border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }
        .btn-submit-v4 {
          width: 100%; height: 50px;
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          color: #ffffff; border: none; border-radius: 12px;
          font-size: 15px; font-weight: 800; cursor: pointer;
          display: flex; alignItems: center; justifyContent: center;
          text-align: center;
          box-shadow: 0 4px 18px rgba(37, 99, 235, 0.35);
          transition: all 0.2s ease;
          letter-spacing: 0.2px;
          margin-top: 14px;
        }
        .btn-submit-v4:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(37, 99, 235, 0.45);
        }
        .btn-submit-v4:disabled { opacity: 0.65; cursor: not-allowed; }
      `}</style>

      {/* Background Graphic Image */}
      <img
        src="/login-bg.png"
        alt="Command Platform Background"
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center",
          opacity: 0.28,
          zIndex: 1,
        }}
      />

      {/* Dark Overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(160deg, rgba(9, 13, 22, 0.75) 0%, rgba(15, 23, 42, 0.94) 100%)",
        zIndex: 2,
      }} />

      {/* ─── TOP NAVBAR WITH SINGLE ACTION BUTTON ─── */}
      <header style={{
        position: "relative",
        zIndex: 10,
        height: 80,
        padding: "0 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(12px)"
      }}>
        {/* Brand Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(135deg, #2563eb, #1e3a8a)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            display: "grid", placeItems: "center", color: "#fff",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)"
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              MatrixTrack 2.0
            </div>
            <div style={{ color: "#93c5fd", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>
              Clean Cities Platform
            </div>
          </div>
        </div>

        {/* Center Tag */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.15)",
          padding: "6px 16px", borderRadius: 20, fontSize: 11, fontWeight: 800,
          color: "#a7f3d0", textTransform: "uppercase", letterSpacing: "0.5px"
        }}>
          <Sparkles size={14} /> Unified SSO Portal
        </div>

        {/* Corner Clickable Sign In / Register Action Button */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => { setAuthMode('login'); setIsDrawerOpen(true); }}
            className="hover-btn"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff", border: "none",
              padding: "10px 22px", borderRadius: 12,
              fontWeight: 800, fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)"
            }}
          >
            <LogIn size={16} /> Sign In / Register &rarr;
          </button>
        </div>
      </header>

      {/* ─── MAIN HERO SCREEN CONTENT ─── */}
      <main style={{
        position: "relative",
        zIndex: 10,
        maxWidth: 1240,
        margin: "0 auto",
        padding: "80px 48px 60px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "calc(100vh - 80px)"
      }}>
        <div>
          {/* Main Headline */}
          <div style={{ maxWidth: 840, marginBottom: 40 }}>
            <h1 style={{
              fontSize: 50, fontWeight: 900, lineHeight: 1.15,
              letterSpacing: "-0.03em", margin: "0 0 20px", color: "#ffffff"
            }}>
              Madhya Pradesh Clean Cities Single Sign-On Portal
            </h1>
            <p style={{
              fontSize: 20, color: "#cbd5e1", lineHeight: 1.5,
              fontWeight: 500, margin: "0 0 32px"
            }}>
              "One Unified Single Sign-On (SSO) Portal for Taskforce 20, Swachh Ward Ranking, Workforce Monitoring, and Material Recovery."
            </p>

            {/* Launch Drawer CTA Button */}
            <button
              onClick={() => { setAuthMode('login'); setIsDrawerOpen(true); }}
              className="hover-btn"
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff", border: "none",
                padding: "16px 36px", borderRadius: 14,
                fontWeight: 800, fontSize: 16, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 12,
                boxShadow: "0 8px 28px rgba(37, 99, 235, 0.45)"
              }}
            >
              Access Account Portal <ArrowRight size={18} />
            </button>
          </div>

          {/* Stats Metrics Row */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24,
            background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(12px)", borderRadius: 20, padding: 28, maxWidth: 900
          }}>
            <div>
              <div style={{ color: "#60a5fa", fontSize: 32, fontWeight: 900, lineHeight: 1 }}>14,491+</div>
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginTop: 6 }}>Field Workers</div>
            </div>
            <div>
              <div style={{ color: "#34d399", fontSize: 32, fontWeight: 900, lineHeight: 1 }}>777</div>
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginTop: 6 }}>Swachh Wards</div>
            </div>
            <div>
              <div style={{ color: "#fbbf24", fontSize: 32, fontWeight: 900, lineHeight: 1 }}>4 Modules</div>
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginTop: 6 }}>Unified Suite</div>
            </div>
          </div>
        </div>

        {/* Footer Enterprise Branding */}
        <footer style={{
          display: "flex", alignItems: "center", gap: 16,
          paddingTop: 40, borderTop: "1px solid rgba(255, 255, 255, 0.08)"
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            display: "grid", placeItems: "center", color: "#fff"
          }}>
            <Globe size={22} />
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>MatrixTrack 2.0 Enterprise SSO</div>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Unified Access for Super Admins, Commissioners, QC & Municipal Staff</div>
          </div>
        </footer>
      </main>

      {/* ─── SLIDE-OVER AUTH DRAWER MODAL ─── */}
      {isDrawerOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          display: "flex", justifyContent: "flex-end"
        }}>
          {/* Backdrop Overlay */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            style={{
              position: "absolute", inset: 0,
              background: "rgba(9, 13, 22, 0.72)",
              backdropFilter: "blur(5px)",
              transition: "opacity 0.3s ease"
            }}
          />

          {/* Right Drawer Box */}
          <div className="animate-drawer" style={{
            position: "relative", zIndex: 10,
            width: "100%", maxWidth: 520,
            height: "100vh",
            background: "#ffffff", color: "#0f172a",
            padding: "36px 40px",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
            boxShadow: "-16px 0 50px rgba(0, 0, 0, 0.35)",
            overflowY: "auto"
          }}>
            <div>
              {/* Drawer Close Button & Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #2563eb, #1e3a8a)", display: "grid", placeItems: "center", color: "#fff" }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.1 }}>MatrixTrack 2.0</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Unified Enterprise SSO</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  style={{
                    background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#64748b",
                    width: 34, height: 34, borderRadius: "50%",
                    display: "grid", placeItems: "center", cursor: "pointer", transition: "all 0.2s"
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Switcher Tabs (Sign In vs Create Account) */}
              <div style={{
                display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 12, marginBottom: 24, border: "1px solid #e2e8f0"
              }}>
                <button
                  onClick={() => { setAuthMode('login'); setError(""); setRegStatus(""); }}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 9, border: "none",
                    background: authMode === 'login' ? "#ffffff" : "transparent",
                    color: authMode === 'login' ? "#1e3a8a" : "#64748b",
                    fontWeight: 800, fontSize: 13, cursor: "pointer",
                    boxShadow: authMode === 'login' ? "0 2px 6px rgba(15, 23, 42, 0.08)" : "none",
                    transition: "all 0.2s"
                  }}
                >
                  Sign In (Login)
                </button>

                <button
                  onClick={() => { setAuthMode('register'); setError(""); setRegStatus(""); }}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 9, border: "none",
                    background: authMode === 'register' ? "#ffffff" : "transparent",
                    color: authMode === 'register' ? "#1e3a8a" : "#64748b",
                    fontWeight: 800, fontSize: 13, cursor: "pointer",
                    boxShadow: authMode === 'register' ? "0 2px 6px rgba(15, 23, 42, 0.08)" : "none",
                    transition: "all 0.2s"
                  }}
                >
                  Create Account
                </button>
              </div>

              {/* ─── SIGN IN FORM ─── */}
              {authMode === 'login' ? (
                <div>
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px", color: "#0f172a", letterSpacing: "-0.03em" }}>Sign In</h2>
                    <p style={{ color: "#64748b", fontSize: 13, margin: 0, fontWeight: 500 }}>
                      Enter your credentials to access your unified enterprise account
                    </p>
                  </div>

                  <form onSubmit={handleLoginSubmit}>
                    <div style={{ marginBottom: 18 }}>
                      <label className="drawer-label"><Mail size={14} style={{ color: "#2563eb" }} /> Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@gov.in"
                        required
                        className="drawer-input-v4"
                      />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <label className="drawer-label"><Lock size={14} style={{ color: "#2563eb" }} /> Password</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="drawer-input-v4"
                          style={{ paddingRight: 44 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                            background: "none", border: "none", color: "#94a3b8", cursor: "pointer"
                          }}
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div style={{ marginBottom: 18, padding: "10px 12px", background: "#fef2f2", border: "1px solid #fecdd3", borderRadius: 8, color: "#b91c1c", fontSize: 12.5, fontWeight: 600 }}>
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-submit-v4"
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
                        <span>{loading ? "Signing In…" : "Sign In"}</span>
                        <ArrowRight size={17} />
                      </div>
                    </button>
                  </form>

                  {/* Divider */}
                  <div style={{
                    display: "flex", alignItems: "center",
                    gap: 14, margin: "24px 0 18px",
                    color: "#94a3b8", fontSize: 12, fontWeight: 600,
                    letterSpacing: "0.06em", textTransform: "uppercase"
                  }}>
                    <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                    or continue with
                    <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                  </div>

                  {/* Google & Microsoft Social Buttons */}
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      type="button"
                      style={{
                        flex: 1, height: 44,
                        display: "flex", alignItems: "center",
                        justifyContent: "center", gap: 10,
                        border: "1.5px solid #cbd5e1", borderRadius: 10,
                        background: "#fff", fontSize: 14,
                        fontWeight: 700, cursor: "pointer",
                        color: "#0f172a", transition: "all 0.2s"
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Google
                    </button>

                    <button
                      type="button"
                      style={{
                        flex: 1, height: 44,
                        display: "flex", alignItems: "center",
                        justifyContent: "center", gap: 10,
                        border: "1.5px solid #cbd5e1", borderRadius: 10,
                        background: "#fff", fontSize: 14,
                        fontWeight: 700, cursor: "pointer",
                        color: "#0f172a", transition: "all 0.2s"
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022" />
                        <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00" />
                        <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF" />
                        <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
                      </svg>
                      Microsoft
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── SINGLE-COLUMN FULL WIDTH CREATE ACCOUNT FORM ─── */
                <div>
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 4px", color: "#0f172a", letterSpacing: "-0.03em" }}>Create Account</h2>
                    <p style={{ color: "#64748b", fontSize: 13, margin: 0, fontWeight: 500 }}>
                      Fill in your details to request access to the portal
                    </p>
                  </div>

                  <form onSubmit={handleRegisterSubmit}>
                    {/* 1. ULB Code */}
                    <div style={{ marginBottom: 16 }}>
                      <label className="drawer-label"><Hash size={14} style={{ color: "#2563eb" }} /> ULB Code</label>
                      <input
                        type="text"
                        placeholder="e.g. JMC01"
                        value={regForm.ulbCode}
                        onChange={(e) => updateRegForm("ulbCode", e.target.value)}
                        required
                        className="drawer-input-v4"
                      />
                    </div>

                    {/* 2. Full Name */}
                    <div style={{ marginBottom: 16 }}>
                      <label className="drawer-label"><UserPlus size={14} style={{ color: "#2563eb" }} /> Full Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={regForm.name}
                        onChange={(e) => updateRegForm("name", e.target.value)}
                        required
                        className="drawer-input-v4"
                      />
                    </div>

                    {/* 3. City Dropdown */}
                    <div style={{ marginBottom: 16 }}>
                      <label className="drawer-label"><MapPin size={14} style={{ color: "#2563eb" }} /> City</label>
                      <select
                        className="drawer-input-v4"
                        value={regForm.cityId}
                        onChange={(e) => handleCityChange(e.target.value)}
                        required
                      >
                        <option value="">Select City</option>
                        {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* 4. Zone Dropdown */}
                    <div style={{ marginBottom: 16 }}>
                      <label className="drawer-label"><MapPin size={14} style={{ color: "#2563eb" }} /> Zone</label>
                      <select
                        className="drawer-input-v4"
                        value={regForm.zoneId}
                        onChange={(e) => handleZoneChange(e.target.value)}
                        required
                        disabled={!regForm.cityId || loadingGeo}
                      >
                        <option value="">Select Zone</option>
                        {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                      </select>
                    </div>

                    {/* 5. Ward Dropdown */}
                    <div style={{ marginBottom: 16 }}>
                      <label className="drawer-label"><MapPin size={14} style={{ color: "#2563eb" }} /> Ward</label>
                      <select
                        className="drawer-input-v4"
                        value={regForm.wardId}
                        onChange={(e) => updateRegForm("wardId", e.target.value)}
                        required
                        disabled={!regForm.zoneId || loadingGeo}
                      >
                        <option value="">Select Ward</option>
                        {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>

                    {/* 6. Email */}
                    <div style={{ marginBottom: 16 }}>
                      <label className="drawer-label"><Mail size={14} style={{ color: "#2563eb" }} /> Email Address</label>
                      <input
                        type="email"
                        placeholder="john@gov.in"
                        value={regForm.email}
                        onChange={(e) => updateRegForm("email", e.target.value)}
                        required
                        className="drawer-input-v4"
                      />
                    </div>

                    {/* 7. Phone Number */}
                    <div style={{ marginBottom: 16 }}>
                      <label className="drawer-label"><Phone size={14} style={{ color: "#2563eb" }} /> Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+91 00000 00000"
                        value={regForm.phone}
                        onChange={(e) => updateRegForm("phone", e.target.value)}
                        required
                        className="drawer-input-v4"
                      />
                    </div>

                    {/* 8. Aadhar Number */}
                    <div style={{ marginBottom: 16 }}>
                      <label className="drawer-label"><Hash size={14} style={{ color: "#2563eb" }} /> Aadhar Number</label>
                      <input
                        type="text"
                        placeholder="0000 0000 0000"
                        value={regForm.aadharNumber}
                        onChange={(e) => updateRegForm("aadharNumber", e.target.value)}
                        required
                        className="drawer-input-v4"
                      />
                    </div>

                    {/* 9. Password */}
                    <div style={{ marginBottom: 20 }}>
                      <label className="drawer-label"><Lock size={14} style={{ color: "#2563eb" }} /> Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={regForm.password}
                        onChange={(e) => updateRegForm("password", e.target.value)}
                        required
                        className="drawer-input-v4"
                      />
                    </div>

                    {regStatus && (
                      <div style={{ marginBottom: 16, padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, color: "#166534", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                        <CheckCircle2 size={16} /> {regStatus}
                      </div>
                    )}

                    {error && (
                      <div style={{ marginBottom: 16, padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecdd3", borderRadius: 10, color: "#b91c1c", fontSize: 12.5, fontWeight: 600 }}>
                        {error}
                      </div>
                    )}

                    {/* 10. Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-submit-v4"
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
                        <span>{loading ? "Submitting Request..." : "Submit Access Request"}</span>
                        <ArrowRight size={17} />
                      </div>
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div style={{ textAlign: "center", fontSize: 11.5, color: "#94a3b8", paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
              MatrixTrack 2.0 Unified SSO Platform &copy; 2026
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
