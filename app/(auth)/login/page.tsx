'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, AuthApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import { getPostLoginRedirect } from "@utils/modules";
import { Eye, EyeOff, ShieldCheck, ArrowRight, Building2 } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { setAuthenticatedUser } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const { token, user: authUser } = await AuthApi.login({ email, password });
            setAuthenticatedUser(token, authUser);
            router.replace(getPostLoginRedirect(authUser));
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

    return (
        <div style={{
            display: "flex",
            minHeight: "100vh",
            width: "100%",
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
        }}>

            {/* ─── LEFT PANEL ─── */}
            <div style={{
                flex: "1.1",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "48px 56px",
                minWidth: 0,
            }}
                className="auth-left-panel"
            >
                {/* Background image */}
                <img
                    src="/login-bg.png"
                    alt=""
                    aria-hidden="true"
                    style={{
                        position: "absolute", inset: 0,
                        width: "100%", height: "100%",
                        objectFit: "cover", objectPosition: "center",
                        zIndex: 1,
                    }}
                />

                {/* Dark gradient overlay */}
                <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(160deg, rgba(10,15,35,0.55) 0%, rgba(10,15,40,0.88) 100%)",
                    zIndex: 2,
                }} />

                {/* Logo */}
                <div style={{
                    position: "relative", zIndex: 3,
                    display: "flex", alignItems: "center", gap: 14
                }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: 14,
                        background: "rgba(255,255,255,0.15)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.25)",
                        display: "grid", placeItems: "center",
                        color: "#fff",
                    }}>
                        <ShieldCheck size={24} />
                    </div>
                    <span style={{
                        color: "#fff", fontWeight: 800,
                        fontSize: 20, letterSpacing: "-0.02em"
                    }}>Taskforce 20</span>
                </div>

                {/* Quote block */}
                <div style={{ position: "relative", zIndex: 3 }}>
                    {/* Stats row */}
                    <div style={{
                        display: "flex", gap: 32, marginBottom: 40
                    }}>
                        {[
                            { value: "15K+", label: "Streets & Beats" },
                            { value: "12K+", label: "Feeder Points" },
                            { value: "500+", label: "Facilities Mapped" },
                        ].map((s) => (
                            <div key={s.label}>
                                <div style={{ color: "#fff", fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 4 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Quote */}
                    <blockquote style={{ margin: 0 }}>
                        <p style={{
                            color: "#fff", fontSize: 24, fontWeight: 700,
                            lineHeight: 1.35, letterSpacing: "-0.02em",
                            maxWidth: 420, margin: "0 0 20px"
                        }}>
                            "Digitizing every beat, facility, and point for a smarter municipal ecosystem."
                        </p>
                        <footer>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: "50%",
                                    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                                    display: "grid", placeItems: "center", color: "#fff"
                                }}>
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>HMS Smart Municipalities</div>
                                    <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>ULB Official, Municipal Teams & Ground Crews</div>
                                </div>
                            </div>
                        </footer>
                    </blockquote>
                </div>
            </div>

            {/* ─── RIGHT PANEL ─── */}
            <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 48px",
                background: "#fff",
                minWidth: 360,
            }}>
                <div style={{ width: "100%", maxWidth: 420 }}>

                    {/* Header */}
                    <div style={{ marginBottom: 36 }}>
                        <h1 style={{
                            fontSize: 34, fontWeight: 800,
                            color: "#0f172a", margin: "0 0 8px",
                            letterSpacing: "-0.04em"
                        }}>Welcome back</h1>
                        <p style={{ color: "#64748b", fontSize: 15, margin: 0 }}>
                            Sign in to your HMS administration account
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Email */}
                        <div style={{ marginBottom: 20 }}>
                            <label htmlFor="login-email" style={{
                                display: "block", marginBottom: 8,
                                fontWeight: 600, fontSize: 14, color: "#0f172a"
                            }}>Email address</label>
                            <input
                                id="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@gov.in"
                                required
                                style={{
                                    width: "100%", height: 50,
                                    padding: "0 16px",
                                    border: "1.5px solid #e2e8f0",
                                    borderRadius: 12, fontSize: 15,
                                    outline: "none",
                                    background: "#fafbfd",
                                    transition: "border-color 0.2s, box-shadow 0.2s",
                                    boxSizing: "border-box",
                                    color: "#0f172a",
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = "#3b82f6";
                                    e.target.style.boxShadow = "0 0 0 4px rgba(59,130,246,0.1)";
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = "#e2e8f0";
                                    e.target.style.boxShadow = "none";
                                }}
                            />
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: 16 }}>
                            <label htmlFor="login-password" style={{
                                display: "block", marginBottom: 8,
                                fontWeight: 600, fontSize: 14, color: "#0f172a"
                            }}>Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={{
                                        width: "100%", height: 50,
                                        padding: "0 52px 0 16px",
                                        border: "1.5px solid #e2e8f0",
                                        borderRadius: 12, fontSize: 15,
                                        outline: "none",
                                        background: "#fafbfd",
                                        transition: "border-color 0.2s, box-shadow 0.2s",
                                        boxSizing: "border-box",
                                        color: "#0f172a",
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = "#3b82f6";
                                        e.target.style.boxShadow = "0 0 0 4px rgba(59,130,246,0.1)";
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = "#e2e8f0";
                                        e.target.style.boxShadow = "none";
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((s) => !s)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    style={{
                                        position: "absolute", right: 14, top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none", border: "none",
                                        color: "#94a3b8", cursor: "pointer",
                                        padding: 4, display: "flex",
                                        alignItems: "center", borderRadius: 8,
                                    }}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember + Forgot */}
                        <div style={{
                            display: "flex", alignItems: "center",
                            justifyContent: "space-between", marginBottom: 28
                        }}>
                            <label style={{
                                display: "flex", alignItems: "center",
                                gap: 8, fontSize: 14, color: "#475569",
                                cursor: "pointer", fontWeight: 500,
                            }}>
                                <input type="checkbox" style={{ width: 16, height: 16, cursor: "pointer" }} />
                                Remember me
                            </label>
                            <a href="#" style={{
                                fontSize: 14, color: "#2563eb",
                                fontWeight: 600, textDecoration: "none"
                            }}>
                                Forgot password?
                            </a>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{
                                marginBottom: 20, padding: "12px 14px",
                                background: "#fef2f2", border: "1px solid #fecdd3",
                                borderRadius: 10, color: "#b91c1c", fontSize: 14,
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: "100%", height: 52,
                                background: loading ? "#93c5fd" : "#1e3a8a",
                                color: "#fff", border: "none",
                                borderRadius: 12, fontSize: 16,
                                fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center",
                                justifyContent: "center", gap: 10,
                                transition: "all 0.2s",
                                boxShadow: loading ? "none" : "0 4px 14px rgba(30,58,138,0.25)",
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) {
                                    (e.target as HTMLButtonElement).style.background = "#172554";
                                    (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!loading) {
                                    (e.target as HTMLButtonElement).style.background = "#1e3a8a";
                                    (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                                }
                            }}
                        >
                            {loading ? "Signing in…" : (<>Sign In <ArrowRight size={18} /></>)}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{
                        display: "flex", alignItems: "center",
                        gap: 14, margin: "28px 0",
                        color: "#94a3b8", fontSize: 13, fontWeight: 600,
                        letterSpacing: "0.06em", textTransform: "uppercase"
                    }}>
                        <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                        or continue with
                        <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                    </div>

                    {/* Social */}
                    <div style={{ display: "flex", gap: 12 }}>
                        {[
                            {
                                label: "Google",
                                icon: (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                )
                            },
                            {
                                label: "Microsoft",
                                icon: (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022" />
                                        <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00" />
                                        <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF" />
                                        <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
                                    </svg>
                                )
                            }
                        ].map((s) => (
                            <button
                                key={s.label}
                                type="button"
                                style={{
                                    flex: 1, height: 50,
                                    display: "flex", alignItems: "center",
                                    justifyContent: "center", gap: 10,
                                    border: "1.5px solid #e2e8f0", borderRadius: 12,
                                    background: "#fff", fontSize: 15,
                                    fontWeight: 600, cursor: "pointer",
                                    transition: "all 0.2s", color: "#0f172a",
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget).style.borderColor = "#cbd5e1";
                                    (e.currentTarget).style.background = "#f8fafc";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget).style.borderColor = "#e2e8f0";
                                    (e.currentTarget).style.background = "#fff";
                                }}
                            >
                                {s.icon} {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Register link */}
                    <p style={{
                        marginTop: 32, textAlign: "center",
                        fontSize: 14, color: "#64748b"
                    }}>
                        Don&apos;t have an account?{" "}
                        <a href="/register" style={{
                            color: "#1e3a8a", fontWeight: 700,
                            textDecoration: "none"
                        }}>
                            Create account
                        </a>
                    </p>
                </div>
            </div>

            {/* Mobile hidden style */}
            <style>{`
        @media (max-width: 900px) {
          .auth-left-panel { display: none !important; }
        }
      `}</style>
        </div>
    );
}
