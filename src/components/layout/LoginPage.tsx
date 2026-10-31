import {ThemeToggle} from '../common/ThemeToggle';
import {BrandLogo} from '../common/BrandLogo';
import React, { useState } from 'react';
import { ArrowRight, Building2, Eye, EyeOff, Landmark, LoaderCircle, LockKeyhole, MapPinned, ShieldCheck, TriangleAlert, UsersRound, UserRound } from 'lucide-react';

interface LoginPageProps {
  identifier: string;
  password: string;
  submitting: boolean;
  error: string;
  onIdentifierChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function LoginPage({ identifier, password, submitting, error, onIdentifierChange, onPasswordChange, onSubmit }: LoginPageProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  return (
    <main className="login-shell"><div className="login-theme-control"><ThemeToggle/></div>
      <aside className="login-intro" aria-label="About MatrixTrack">
        <a href="/" className="login-brand" aria-label="MatrixTrack home">
          <BrandLogo className="login-logo"/>
          <span><strong>MatrixTrack<span className="login-version">2.0</span></strong><small>MUNICIPAL COMMAND CENTER</small></span>
        </a>

        <div className="login-intro-content">
          <span className="login-eyebrow"><span /> CONNECTED MUNICIPAL OPERATIONS</span>
          <h2>City operations.<br /><em>One clear view.</em></h2>
          <p>The people, evidence and decisions behind a better city. Together in one workspace.</p>
          <div className="login-city-visual" aria-hidden="true">
            <div className="login-map-caption"><span><MapPinned size={13} /> CITY OPERATIONS</span><span>CONNECTED BY DESIGN</span></div>
            <svg viewBox="0 0 560 170" fill="none">
              <defs><pattern id="login-map-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" stroke="#99c6c5" strokeOpacity=".08" /></pattern></defs>
              <rect width="560" height="170" fill="url(#login-map-grid)" />
              <g fill="#163c4a" stroke="#6a9fa5" strokeOpacity=".22"><rect x="38" y="24" width="74" height="40" rx="6"/><rect x="132" y="24" width="82" height="40" rx="6"/><rect x="38" y="101" width="74" height="43" rx="6"/><rect x="132" y="101" width="82" height="43" rx="6"/><rect x="322" y="24" width="76" height="40" rx="6"/><rect x="420" y="24" width="98" height="40" rx="6"/><rect x="322" y="101" width="76" height="43" rx="6"/><rect x="420" y="101" width="98" height="43" rx="6"/></g>
              <path d="M0 82H560M242 0V170M280 0V170" stroke="#8caeb7" strokeOpacity=".14" strokeWidth="9"/>
              <path className="login-route" d="M74 82H261V45H360M261 82H469V122" stroke="#91d2c3" strokeWidth="1.5" strokeLinecap="round" />
              <g className="login-map-nodes" fill="#9bdaca" stroke="#183c49" strokeWidth="4"><circle cx="74" cy="82" r="6"/><circle cx="261" cy="82" r="8"/><circle cx="360" cy="45" r="6"/><circle cx="469" cy="122" r="6"/></g>
              <circle className="login-map-halo" cx="261" cy="82" r="18" stroke="#9bdaca" strokeOpacity=".3"/>
              <g fill="#a3bec4" fontFamily="inherit" fontSize="8" letterSpacing="1"><text x="39" y="161">FIELD OPERATIONS</text><text x="406" y="161">CITY OVERSIGHT</text></g>
            </svg>
          </div>
          <div className="login-capabilities">
            <div><span><MapPinned size={18} /></span><p><strong>Field operations</strong><small>Inspections & evidence</small></p></div>
            <div><span><UsersRound size={18} /></span><p><strong>People & teams</strong><small>Staff & attendance</small></p></div>
            <div><span><Building2 size={18} /></span><p><strong>City oversight</strong><small>Ward performance</small></p></div>
          </div>
        </div>

        <div className="login-intro-footer"><span className="login-footer-rule" /><span>Built for the everyday work of better cities.</span><span className="login-edition">MATRIXTRACK 2.0</span></div>
      </aside>

      <section className="login-form-section" aria-labelledby="login-title">
        <div className="login-mobile-brand"><BrandLogo/><strong>MatrixTrack <span>2.0</span></strong></div>
        <div className="login-form-wrap">
          <div className="login-access-label"><ShieldCheck size={14} /> AUTHORIZED PERSONNEL ACCESS</div>
          <div className="login-heading"><span className="login-form-kicker">YOUR MUNICIPAL WORKSPACE</span><h1 id="login-title">Welcome back.</h1><p>Sign in with your existing MatrixTrack account.</p></div>

          <form onSubmit={onSubmit} className="login-form" aria-busy={submitting}>
            <fieldset disabled={submitting}>
              <div className="login-field">
                <label htmlFor="login-identifier">Email or mobile number</label>
                <div className="login-input-wrap"><UserRound size={17} className="login-input-icon" aria-hidden="true" /><input id="login-identifier" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={identifier} onChange={e => onIdentifierChange(e.target.value)} placeholder="Email address or mobile number" aria-describedby={error ? 'login-error' : undefined} /></div>
              </div>
              <div className="login-field">
                <label htmlFor="login-password">Password</label>
                <div className="login-password-wrap login-input-wrap">
                  <LockKeyhole size={17} className="login-input-icon" aria-hidden="true" />
                  <input id="login-password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => onPasswordChange(e.target.value)} onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))} onKeyDown={e => setCapsLock(e.getModifierState('CapsLock'))} onBlur={() => setCapsLock(false)} placeholder="Enter your password" aria-describedby={[error && 'login-error', capsLock && 'login-caps-lock'].filter(Boolean).join(' ') || undefined} />
                  <button type="button" className="login-password-toggle" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button>
                </div>
                {capsLock && <p id="login-caps-lock" className="login-caps-lock" role="status">Caps Lock is on.</p>}
              </div>
              {error && <div id="login-error" className="login-error" role="alert"><TriangleAlert size={18} /><div><strong>We couldn't sign you in</strong><p>{error}</p></div></div>}
              <button type="submit" className="login-submit" disabled={submitting}>
                <span>{submitting ? 'Signing in…' : 'Sign in to your workspace'}</span>{submitting ? <LoaderCircle size={18} className="login-submit-spinner" /> : <ArrowRight size={18} />}
              </button>
            </fieldset>
          </form>

          <div className="login-account-help"><LockKeyhole size={16} /><p>Access is based on your assigned role and city.<br /><span>Need account help? Contact your city administrator.</span></p></div>
        </div>
        <footer className="login-form-footer"><span>Municipal Command Center</span><span>MatrixTrack 2.0</span></footer>
      </section>
    </main>
  );
}
