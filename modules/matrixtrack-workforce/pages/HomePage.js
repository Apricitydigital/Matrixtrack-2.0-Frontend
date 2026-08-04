import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
const logo = "/assets/logo.png";
import "./HomePage.css";

/* ───────────── intersection-observer hook ───────────── */
const useOnScreen = (options = { threshold: 0.15 }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.unobserve(el); }
    }, options);
    obs.observe(el);
    return () => obs.disconnect();
  }, [options]);
  return [ref, visible];
};

/* ───────────── animated counter ───────────── */
const AnimatedCounter = ({ end, suffix = "", duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const [ref, visible] = useOnScreen();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, end, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

/* ───────────── PARTICLES CANVAS ───────────── */
const ParticlesCanvas = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const fit = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    fit();
    window.addEventListener("resize", fit);

    const N = 100;
    const dots = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.4 + 0.1,
    }));

    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${0.15 * (1 - d / 110)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      dots.forEach((d) => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148,163,184,${d.a})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", fit); };
  }, []);
  return (
    <canvas ref={ref} style={{
      position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none"
    }} />
  );
};

/* ────────────────── ICONS ────────────────── */
const icons = {
  face: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="hp-icon">
      <circle cx="12" cy="8" r="4" /><path d="M6 21v-2a4 4 0 0 1 4-4h0" /><path d="M16 11a4 4 0 0 1 0 8" /><path d="M20 19v2" /><path d="M12 19v2" />
    </svg>
  ),
  geo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="hp-icon">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  report: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="hp-icon">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 17V13" /><path d="M12 17V9" /><path d="M16 17V5" />
    </svg>
  ),
  leave: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="hp-icon">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M9 16l2 2 4-4" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="hp-icon">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
    </svg>
  ),
  dash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="hp-icon">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
    </svg>
  ),
};

/* ───────────── data ───────────── */
const features = [
  { icon: icons.face, title: "Face Recognition", desc: "AI-powered facial verification ensures employees are physically present. Real-time anti-spoof protection built-in.", color: "#6366f1" },
  { icon: icons.geo,  title: "Geofencing",       desc: "GPS-based virtual boundaries ensure attendance from authorized locations only. Auto-detect proximity for seamless check-in.", color: "#0ea5e9" },
  { icon: icons.report, title: "Smart Reports",  desc: "Download detailed Excel & PDF reports. Visual analytics with real-time dashboards and downloadable data.", color: "#8b5cf6" },
  { icon: icons.leave, title: "Leave Management", desc: "Comprehensive leave module supporting CL, SL, LOP, Comp-off. Supervisors can mark & unmark leave seamlessly.", color: "#10b981" },
  { icon: icons.shield, title: "Supervisor Integrity", desc: "Role-based access control with audit trails. Every action validated against supervisor assignments.", color: "#f59e0b" },
  { icon: icons.dash, title: "Live Dashboard",   desc: "Real-time stats — present, absent, on-leave counts. Auto-syncing every 30 seconds with visual cards.", color: "#ec4899" },
];

const howItWorks = [
  { step: "01", title: "Supervisor Logs In", desc: "Secure role-based authentication with assigned permissions for each module." },
  { step: "02", title: "Select Kothi / Ward", desc: "Browse assigned locations. Geofence validation ensures you're on-site." },
  { step: "03", title: "Capture & Verify",    desc: "Take a photo — our AI matches it against enrolled faces in milliseconds." },
  { step: "04", title: "Attendance Recorded",  desc: "Punch-in/out timestamps, GPS coordinates, and face-match scores saved instantly." },
];

const stats = [
  { value: 14000, suffix: "+",  label: "Employees Tracked"  },
  { value: 99.8,  suffix: "%",  label: "Face Match Accuracy" },
  { value: 30,    suffix: "s",  label: "Auto-Sync Interval"  },
  { value: 24,    suffix: "/7", label: "Cloud Availability"  },
];

const capabilities = [
  "Ward / Kothi assignment",       "Group attendance capture",
  "Face gallery management",       "Supervisor role-based access",
  "Leave type management (CL, SL, LOP …)", "Excel & PDF report downloads",
  "Geofence request workflow",      "Real-time auto-sync (30s polling)",
  "Short attendance reports",       "Multi-zone / multi-city support",
  "Announcement broadcasting",     "Play Store & Web deployment",
];

/* ═══════════════════════════════════════════════════════════
   HOME PAGE COMPONENT
   ═══════════════════════════════════════════════════════════ */
const HomePage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="hp-root">
      {/* ──── NAVBAR ──── */}
      <nav className={`hp-nav ${scrolled ? "hp-nav--scrolled" : ""}`}>
        <div className="hp-nav-inner">
          <a href="#hero" className="hp-nav-logo">
            <img src={logo} alt="Matrix Track" />
            <span>MatrixTrack</span>
          </a>
          <div className="hp-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#stats">Stats</a>
          </div>
          <button className="hp-nav-cta" onClick={() => navigate("/login")}>
            Sign In {icons.arrow}
          </button>
        </div>
      </nav>

      {/* ──── HERO ──── */}
      <section id="hero" className="hp-hero">
        <div className="hp-hero-grid" />
        <div className="hp-hero-blob hp-hero-blob--1" />
        <div className="hp-hero-blob hp-hero-blob--2" />
        <div className="hp-hero-blob hp-hero-blob--3" />
        <ParticlesCanvas />

        <div className="hp-hero-content">
          <div className="hp-hero-badge animate-fade-up">
            <span className="hp-pulse" />
            Trusted by 14,000+ employees nationwide
          </div>

          <h1 className="hp-hero-title animate-fade-up delay1">
            Workforce Attendance,
            <br />
            <span className="hp-gradient-text">Reimagined.</span>
          </h1>

          <p className="hp-hero-sub animate-fade-up delay2">
            AI-powered face recognition, GPS geofencing, and real-time
            analytics — all in one beautiful platform. MatrixTrack makes
            attendance tracking effortless, accurate, and tamper-proof.
          </p>

          <div className="hp-hero-actions animate-fade-up delay3">
            <button className="hp-btn hp-btn--primary" onClick={() => navigate("/login")}>
              Get Started {icons.arrow}
            </button>
            <a href="#features" className="hp-btn hp-btn--ghost">
              Explore Features
            </a>
          </div>

          {/* hero visual / floating cards */}
          <div className="hp-hero-visual animate-fade-up delay4">
            <div className="hp-float-card hp-float-card--1">
              <div className="hp-float-icon" style={{ background: "rgba(99,102,241,.15)", color: "#818cf8" }}>{icons.face}</div>
              <div>
                <div className="hp-float-label">Face Match</div>
                <div className="hp-float-value" style={{ color: "#818cf8" }}>✓ Verified</div>
              </div>
            </div>
            <div className="hp-float-card hp-float-card--2">
              <div className="hp-float-icon" style={{ background: "rgba(16,185,129,.15)", color: "#34d399" }}>{icons.geo}</div>
              <div>
                <div className="hp-float-label">Location</div>
                <div className="hp-float-value" style={{ color: "#34d399" }}>Inside Geofence</div>
              </div>
            </div>
            <div className="hp-float-card hp-float-card--3">
              <div className="hp-float-icon" style={{ background: "rgba(245,158,11,.15)", color: "#fbbf24" }}>{icons.shield}</div>
              <div>
                <div className="hp-float-label">Attendance</div>
                <div className="hp-float-value" style={{ color: "#fbbf24" }}>Punch-In 09:02 AM</div>
              </div>
            </div>

            {/* central dashboard mockup */}
            <div className="hp-dash-mock">
              <div className="hp-dash-mock-header">
                <div className="hp-dash-dots"><span /><span /><span /></div>
                <span className="hp-dash-title">Dashboard — Today</span>
              </div>
              <div className="hp-dash-mock-body">
                <div className="hp-mock-stat">
                  <span className="hp-mock-stat-val" style={{ color: "#818cf8" }}>847</span>
                  <span className="hp-mock-stat-lbl">Present</span>
                </div>
                <div className="hp-mock-stat">
                  <span className="hp-mock-stat-val" style={{ color: "#f87171" }}>23</span>
                  <span className="hp-mock-stat-lbl">Absent</span>
                </div>
                <div className="hp-mock-stat">
                  <span className="hp-mock-stat-val" style={{ color: "#fbbf24" }}>14</span>
                  <span className="hp-mock-stat-lbl">On Leave</span>
                </div>
                <div className="hp-mock-bar-group">
                  <div className="hp-mock-bar" style={{ width: "92%", background: "linear-gradient(90deg,#6366f1,#818cf8)" }} />
                  <div className="hp-mock-bar" style={{ width: "68%", background: "linear-gradient(90deg,#10b981,#34d399)" }} />
                  <div className="hp-mock-bar" style={{ width: "45%", background: "linear-gradient(90deg,#f59e0b,#fbbf24)" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── FEATURES ──── */}
      <section id="features" className="hp-section">
        <SectionHeading
          tag="Features"
          title="Everything You Need"
          subtitle="Powerful tools designed for modern workforce management. From face recognition to real-time reporting — MatrixTrack covers it all."
        />
        <div className="hp-features-grid">
          {features.map((f, i) => (
            <FeatureCard key={i} feature={f} index={i} />
          ))}
        </div>
      </section>

      {/* ──── HOW IT WORKS ──── */}
      <section id="how" className="hp-section hp-section--alt">
        <SectionHeading
          tag="How It Works"
          title="Simple. Fast. Secure."
          subtitle="Four easy steps from login to recorded attendance. No manual registers, no buddy-punching."
        />
        <div className="hp-how-grid">
          {howItWorks.map((h, i) => (
            <HowCard key={i} data={h} index={i} />
          ))}
        </div>
      </section>

      {/* ──── STATS ──── */}
      <section id="stats" className="hp-section hp-stats-section">
        <div className="hp-stats-grid">
          {stats.map((s, i) => (
            <div className="hp-stat-card" key={i}>
              <div className="hp-stat-val">
                <AnimatedCounter end={s.value} suffix={s.suffix} />
              </div>
              <div className="hp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ──── CAPABILITIES ──── */}
      <section className="hp-section">
        <SectionHeading
          tag="Capabilities"
          title="Built for Scale"
          subtitle="MatrixTrack handles thousands of employees across multiple cities and zones."
        />
        <div className="hp-caps-grid">
          {capabilities.map((cap, i) => (
            <div className="hp-cap-item" key={i}>
              <span className="hp-cap-check">{icons.check}</span>
              {cap}
            </div>
          ))}
        </div>
      </section>

      {/* ──── CTA ──── */}
      <section className="hp-cta-section">
        <div className="hp-cta-content">
          <h2 className="hp-cta-title">Ready to Transform Attendance?</h2>
          <p className="hp-cta-sub">
            Join the modern workforce management revolution. Log in now and
            experience the future of attendance tracking.
          </p>
          <button className="hp-btn hp-btn--white" onClick={() => navigate("/login")}>
            Sign In to Dashboard {icons.arrow}
          </button>
        </div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <div className="hp-footer-brand">
            <img src={logo} alt="Matrix Track" />
            <span>MatrixTrack</span>
          </div>
          <p className="hp-footer-copy">
            © {new Date().getFullYear()} Apricity Digital. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

/* ─── Sub-components ─── */
const SectionHeading = ({ tag, title, subtitle }) => {
  const [ref, visible] = useOnScreen();
  return (
    <div ref={ref} className={`hp-section-head ${visible ? "animate-in" : ""}`}>
      <span className="hp-tag">{tag}</span>
      <h2 className="hp-section-title">{title}</h2>
      <p className="hp-section-sub">{subtitle}</p>
    </div>
  );
};

const FeatureCard = ({ feature, index }) => {
  const [ref, visible] = useOnScreen();
  return (
    <div
      ref={ref}
      className={`hp-feature-card ${visible ? "animate-in" : ""}`}
      style={{ animationDelay: `${index * 80}ms`, "--accent": feature.color }}
    >
      <div className="hp-feature-icon" style={{ background: `${feature.color}18`, color: feature.color }}>
        {feature.icon}
      </div>
      <h3 className="hp-feature-title">{feature.title}</h3>
      <p className="hp-feature-desc">{feature.desc}</p>
    </div>
  );
};

const HowCard = ({ data, index }) => {
  const [ref, visible] = useOnScreen();
  return (
    <div ref={ref} className={`hp-how-card ${visible ? "animate-in" : ""}`} style={{ animationDelay: `${index * 120}ms` }}>
      <span className="hp-how-step">{data.step}</span>
      <h3 className="hp-how-title">{data.title}</h3>
      <p className="hp-how-desc">{data.desc}</p>
    </div>
  );
};

export default HomePage;
