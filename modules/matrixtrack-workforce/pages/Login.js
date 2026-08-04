import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Lock, Mail, ArrowLeft, AlertCircle } from "lucide-react";
import logo from "../assets/logo.png";
import loginVisual from "../assets/login-visual.png";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // 2FA State
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpEmail, setOtpEmail] = useState(""); // to store email for OTP verification
  const [message, setMessage] = useState(null); // success messages like "OTP sent"

  const { login, verifyOTP } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const handle = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await login(email, password);
      if (res?.success) {
        navigate("/dashboard");
      } else if (res?.pending2FA) {
        setIsOtpMode(true);
        setOtpEmail(res.email);
        setMessage("OTP has been sent to your email. Please verify to continue.");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Network error. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const ok = await verifyOTP(otpEmail, otp);
      if (ok) navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-root">
      {/* ══════════ LEFT — VISUAL ══════════ */}
      <div className="lp-left">
        <div className="lp-grid" />
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />

        <div className="lp-brand">
          <div className="lp-brand-logo"><img src={logo} alt="MT" /></div>
          <span className="lp-brand-name">MatrixTrack</span>
        </div>

        <div className="lp-hero-center">
          <img src={loginVisual} alt="MatrixTrack Platform" className="lp-hero-img" />
        </div>

        <div className="lp-left-footer">
          © {new Date().getFullYear()} Apricity Digital
        </div>
      </div>

      {/* ══════════ RIGHT — FORM ══════════ */}
      <div className="lp-right">
        <div className="lp-form-wrap">
          <div className="lp-form-logo-wrap">
            <img src={logo} alt="MatrixTrack" className="lp-form-logo" />
            <span className="lp-form-logo-text">MatrixTrack</span>
          </div>

          <p className="lp-eyebrow">Sign In</p>
          <h1 className="lp-form-title">
            Welcome Back.
          </h1>

          {error && (
            <div className="lp-error">
              <AlertCircle size={18} />
              <p>{error}</p>
            </div>
          )}
          {message && (
            <div className="lp-error" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
              <AlertCircle size={18} color="#0284c7" />
              <p>{message}</p>
            </div>
          )}

          {!isOtpMode ? (
            <form onSubmit={handle}>
              <div className="lp-field">
                <label className="lp-label" htmlFor="lp-email">Email</label>
              <div className="lp-input-wrap">
                <input
                  id="lp-email"
                  type="email"
                  className="lp-input"
                  placeholder="you@matrixtrack.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <Mail className="lp-input-icon" size={18} />
              </div>
            </div>

            <div className="lp-field">
              <label className="lp-label" htmlFor="lp-pass">Password</label>
              <div className="lp-input-wrap">
                <input
                  id="lp-pass"
                  type="password"
                  className="lp-input"
                  placeholder="••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <Lock className="lp-input-icon" size={18} />
              </div>
            </div>

              <button type="submit" className="lp-btn" disabled={submitting}>
                {submitting
                  ? <><Loader2 className="lp-spin" size={20} /> Verifying…</>
                  : "Continue to Dashboard  →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit}>
              <div className="lp-field">
                <label className="lp-label" htmlFor="lp-otp">Enter OTP</label>
                <div className="lp-input-wrap">
                  <input
                    id="lp-otp"
                    type="text"
                    className="lp-input"
                    placeholder="123456"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                  <Lock className="lp-input-icon" size={18} />
                </div>
              </div>
              <button type="submit" className="lp-btn" disabled={submitting}>
                {submitting
                  ? <><Loader2 className="lp-spin" size={20} /> Verifying OTP…</>
                  : "Verify OTP & Login  →"}
              </button>
              <button type="button" onClick={() => setIsOtpMode(false)} className="mt-4 text-sm text-slate-500 hover:text-slate-800" style={{background: 'none', border: 'none', cursor: 'pointer', width: '100%'}}>
                ← Back to Email Login
              </button>
            </form>
          )}

          <div className="lp-divider">
            <div className="lp-divider-line" />
            <span>or</span>
            <div className="lp-divider-line" />
          </div>

          <Link to="/" className="lp-home-link">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
