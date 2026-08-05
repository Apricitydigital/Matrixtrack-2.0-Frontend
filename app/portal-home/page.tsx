'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import HmsKpiCards from "@components/ui/HmsKpiCards";
import { useAuth } from '@hooks/useAuth';
import {
  ShieldCheck,
  Users,
  Award,
  TrendingUp,
  ArrowRight,
  Clock,
  LayoutDashboard,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import UnifiedExecutiveDashboard from '@modules/taskforce/components/dashboard/UnifiedExecutiveDashboard';

interface RoadmapModuleInfo {
  title: string;
  subTitle: string;
  tagline: string;
  targetLaunch: string;
  icon: any;
  description: string;
  plannedFeatures: string[];
  techStack: string[];
}

const ROADMAP_MODULES: Record<string, RoadmapModuleInfo> = {
  workforce: {
    title: 'Workforce Monitoring (Matrix Track)',
    subTitle: 'Field Staff Attendance & Verification Suite',
    tagline: 'Real-time worker punch-ins, geofenced verification, and AI facial matching.',
    targetLaunch: 'Planned Platform Extension (Upcoming)',
    icon: Users,
    description: 'Matrix Track is our next-gen field workforce management extension designed for Municipal Corporations. It enables supervisors to mark employee attendance, supports self-attendance, syncs biometric machine logs, and enforces zero proxy attendance via AI face verification.',
    plannedFeatures: [
      'Supervisors can mark attendance of assigned employees',
      'Self-Attendance Mode (No supervisor dependency)',
      'Biometric Machine Attendance Data Sync Integration',
      'Geo-Fenced Attendance Boundary Verification',
      'AI-Based Face Verification (Zero Proxy Attendance)',
      '100% High Accuracy Attendance Analytics & Audit Reports'
    ],
    techStack: ['React Native Mobile App', 'PostgreSQL Spatial (PostGIS)', 'AI Face Verification Engine', 'Express Microservices']
  },
  mrf: {
    title: 'Processing & Material Recovery (MRF)',
    subTitle: 'Weighbridge & Recyclables Reconciliation Engine',
    tagline: 'Weighbridge-integrated sorting lanes, recyclable sales ledger, and processing plant telemetry.',
    targetLaunch: 'Planned Platform Extension (Upcoming)',
    icon: TrendingUp,
    description: 'MRF Intelligence brings end-to-end transparency to waste processing facilities. It connects automated weighbridge sensors to log incoming dry/wet waste tonnage and track recycled material monetization.',
    plannedFeatures: [
      'Automated Weighbridge Gross & Tare Weight Capture',
      'Recyclable Material Sorting Category Analytics',
      'Vendor Sales & Recyclables Revenue Ledger',
      'Zero-Landfill Compliance Certification Pipeline'
    ],
    techStack: ['IoT Weighbridge Sensors', 'Prisma ORM & PostgreSQL', 'MQTT Telemetry Protocol', 'Next.js Analytics Dashboard']
  }
};

export default function PortalHomePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeModalKey, setActiveModalKey] = useState<string | null>(null);
  const activeModalData = activeModalKey ? ROADMAP_MODULES[activeModalKey] : null;

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'hms_super_admin' || (user?.roles || []).includes('hms_super_admin') || (user?.roles || []).includes('HMS_SUPER_ADMIN');
  const cityName = user?.city ? user.city.name : '';

  // Determine what workspaces they have access to
  const userRoles = user?.roles || [];
  const hasTaskforceAccess = isSuperAdmin || userRoles.includes('taskforce') || userRoles.includes('TASKFORCE_ADMIN') || userRoles.includes('CITY_ADMIN');
  const hasSwachhAccess = isSuperAdmin || userRoles.includes('swachh') || userRoles.includes('SWACHH_ADMIN');
  const hasWorkforceAccess = isSuperAdmin || userRoles.includes('workforce') || userRoles.includes('WORKFORCE_ADMIN');

  // Hardcode workspace URLs just for demo
  const workspaceUrl = 'http://localhost:3000';

  const openTaskforceWorkspace = () => {
    router.push('/city');
  };

  const openWardRankingWorkspace = () => {
    router.push('/ward-ranking');
  };

  const openMatrixTrackWorkspace = () => {
    router.push('/workforce-monitoring');
  };

  return (
    <div className="space-y-8">
      <style>{`
        .section-title-box {
          background: #ffffff;
          padding: 24px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.03);
          margin-bottom: 32px;
        }
        .section-title-box h2 {
          font-size: 19px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.3px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 4px 0;
        }
        .active-workspaces-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
          margin-top: 24px;
        }
        .hero-workspace-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 28px;
          border: 2px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .hero-workspace-card:hover {
          transform: translateY(-4px);
          border-color: #3b82f6;
          box-shadow: 0 20px 40px -10px rgba(59, 130, 246, 0.15);
        }
        .hero-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .hero-icon-box {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }
        .hero-live-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #eff6ff;
          color: #2563eb;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          border: 1px solid #bfdbfe;
        }
        .hero-card-title {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 6px 0;
          line-height: 1.2;
        }
        .hero-card-sub {
          font-size: 13px;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 12px;
        }
        .hero-card-desc {
          font-size: 13.5px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .hero-tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 30px;
        }
        .feature-pill {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
        }
        .btn-launch-hero {
          width: 100%;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          border: none;
          padding: 14px 20px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
        }
        .btn-launch-hero:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.45);
        }
        .roadmap-bar {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 20px;
          padding: 20px 24px;
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .roadmap-title {
          font-size: 14px;
          font-weight: 800;
          color: #b45309;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .roadmap-items {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .roadmap-item-btn {
          flex: 1;
          min-width: 250px;
          background: #ffffff;
          border: 1px solid #fde68a;
          padding: 16px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.2s ease;
          cursor: pointer;
          text-align: left;
        }
        .roadmap-item-btn:hover {
          background: #fef3c7;
          border-color: #fcd34d;
        }
        footer {
          margin-top: 48px;
          border-top: 1px solid #e2e8f0;
          padding-top: 24px;
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          color: #64748b;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(6px);
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 24px;
        }
        .modal-box {
          background: #ffffff;
          border-radius: 24px;
          max-width: 640px;
          width: 100%;
          padding: 32px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
          border: 1px solid #cbd5e1;
          position: relative;
        }
      `}</style>
      
      <HmsKpiCards />

      {/* Active Operational Workspaces */}
      <div className="section-title-box">
        <h2>
          <LayoutDashboard size={22} style={{ color: '#2563eb' }} /> Active Operational Workspaces
        </h2>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
        </span>

        <div className="active-workspaces-grid">
          {/* HERO CARD 1: Taskforce */}
          {hasTaskforceAccess && (
            <div
              className="hero-workspace-card"
              onClick={openTaskforceWorkspace}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <div className="hero-card-header">
                  <div className="hero-icon-box">
                    <ShieldCheck size={32} />
                  </div>
                  <span className="hero-live-tag">
                    <span className="pulse-dot" style={{ width: 6, height: 6 }} /> Active & Live
                  </span>
                </div>
                <h3 className="hero-card-title">Taskforce</h3>
                <div className="hero-card-sub">4-Module Combined Performance Monitoring Suite</div>
                <div className="hero-card-desc">
                  Next-gen urban sanitation suite driving automated monitoring across Beat Sweeping, Smart Litterbins, Vulnerable Spot (GVP/CTU) Transformation, and Community Toilet (CT/PT) Cleanliness.
                </div>

                <div className="hero-tags-row">
                  <span className="feature-pill">Sweeping (Beat)</span>
                  <span className="feature-pill">GVP/CTU Spot Transformation</span>
                  <span className="feature-pill">Litterbin Collection</span>
                  <span className="feature-pill">Cleanliness of Toilet (CT/PT)</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="btn-launch-hero"
                  onClick={(event) => {
                    event.stopPropagation();
                    openTaskforceWorkspace();
                  }}
                >
                  Launch Taskforce Workspace
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* HERO CARD 2: Swachh Ward Ranking */}
          {hasSwachhAccess && (
            <div
              className="hero-workspace-card"
              onClick={openWardRankingWorkspace}
              style={{
                borderColor: '#7c3aed',
                boxShadow: '0 10px 30px -5px rgba(124, 58, 237, 0.12)',
                cursor: 'pointer',
              }}
            >
              <div>
                <div className="hero-card-header">
                  <div className="hero-icon-box" style={{ background: 'linear-gradient(135deg, #f5f3ff, #ddd6fe)', borderColor: '#c4b5fd', color: '#7c3aed' }}>
                    <Award size={32} />
                  </div>
                  <span className="hero-live-tag" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                    <span className="pulse-dot" style={{ width: 6, height: 6, background: '#7c3aed' }} /> Active & Live
                  </span>
                </div>
                <h3 className="hero-card-title">Swachh Ward Ranking System</h3>
                <div className="hero-card-sub" style={{ color: '#7c3aed' }}>Swachh Sync Platform</div>
                <div className="hero-card-desc">
                  Ward-ranking & self-assessment platform for citizens, educational institutions, hospitals, commercial markets, and QC scorecards.
                </div>

                <div className="hero-tags-row">
                  <span className="feature-pill">Citizen & Institutional Self-Assessment</span>
                  <span className="feature-pill">8 Categories Evaluation</span>
                  <span className="feature-pill">QC Audit & Scorecard Ranking</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="btn-launch-hero"
                  style={{
                    background: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
                    boxShadow: '0 8px 24px rgba(124, 58, 237, 0.38)',
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    openWardRankingWorkspace();
                  }}
                >
                  Launch Swachh Sync Workspace
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* HERO CARD 3: Workforce Monitoring */}
          {hasWorkforceAccess && (
            <div
              className="hero-workspace-card"
              onClick={openMatrixTrackWorkspace}
              style={{
                borderColor: '#0284c7',
                boxShadow: '0 10px 30px -5px rgba(2, 132, 199, 0.12)',
                cursor: 'pointer',
              }}
            >
              <div>
                <div className="hero-card-header">
                  <div className="hero-icon-box" style={{ background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', borderColor: '#7dd3fc', color: '#0284c7' }}>
                    <Users size={32} />
                  </div>
                  <span className="hero-live-tag" style={{ background: '#e0f2fe', color: '#0284c7', borderColor: '#7dd3fc' }}>
                    <span className="pulse-dot" style={{ width: 6, height: 6, background: '#0284c7' }} /> Active & Live
                  </span>
                </div>
                <h3 className="hero-card-title">Workforce Monitoring</h3>
                <div className="hero-card-sub" style={{ color: '#0284c7' }}>Matrix Track Attendance Suite</div>
                <div className="hero-card-desc">
                  Biometric facial verification & GPS geo-fenced live attendance tracking suite for municipal sanitation workers & supervisors.
                </div>

                <div className="hero-tags-row">
                  <span className="feature-pill">Facial Recognition AI</span>
                  <span className="feature-pill">GPS Telemetry & Geofencing</span>
                  <span className="feature-pill">Supervisor Self-Punch Audit</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="btn-launch-hero"
                  style={{
                    background: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
                    boxShadow: '0 8px 24px rgba(2, 132, 199, 0.38)',
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    openMatrixTrackWorkspace();
                  }}
                >
                  Launch Workforce Workspace
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* COMPACT ROADMAP BAR FOR COMING SOON MODULES */}
        <div className="roadmap-bar">
          <div className="roadmap-title">
            <Clock size={18} style={{ color: '#d97706' }} /> Upcoming Platform Extensions
          </div>

          <div className="roadmap-items">
            <button onClick={() => setActiveModalKey('mrf')} className="roadmap-item-btn">
              <TrendingUp size={18} style={{ color: '#7c3aed' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Processing & MRF</div>
                <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>Weighbridge & Sorting Telemetry</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, background: '#f5f3ff', color: '#7c3aed', padding: '4px 10px', borderRadius: 8, border: '1px solid #ddd6fe' }}>
                View Specifications &rarr;
              </span>
            </button>
          </div>
        </div>

        {/* SECTION 2: EXECUTIVE ANALYTICS DASHBOARD */}
        <UnifiedExecutiveDashboard
          isSuperAdmin={isSuperAdmin}
          userRoles={userRoles}
          userCityName={cityName || 'Indore'}
          workspaceUrl={workspaceUrl}
          enableTaskforceData={hasTaskforceAccess}
          enableWardRankingData={hasSwachhAccess}
        />

        {/* Footer */}
        <footer>
          <span>
            Human Matrix Group &middot; Apricity Digital Labs &nbsp;|&nbsp; Enterprise Governance Engine v2.0
          </span>
          <span>
            <b>Confidential Enterprise System</b> &middot; Data as of 2026
          </span>
        </footer>
      </div>

      {/* INTERACTIVE ROADMAP SPECIFICATIONS MODAL */}
      {activeModalData && (
        <div className="modal-overlay" onClick={() => setActiveModalKey(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setActiveModalKey(null)}
              style={{
                position: 'absolute', top: 20, right: 20, background: '#f1f5f9', border: 'none',
                width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
                <activeModalData.icon size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>{activeModalData.title}</h3>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', marginTop: 2 }}>{activeModalData.subTitle}</div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', padding: '10px 14px', borderRadius: 12, fontSize: 12.5, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} style={{ color: '#2563eb' }} /> Status: <strong>{activeModalData.targetLaunch}</strong>
            </div>

            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
              {activeModalData.description}
            </p>

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Planned Core Features
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {activeModalData.plannedFeatures.map((feat, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', fontWeight: 600 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Check size={12} />
                    </div>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
