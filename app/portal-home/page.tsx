'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Protected } from '@components/Guards';
import { useAuth } from '@hooks/useAuth';
import { roleLabel } from '@lib/labels';
import { getRoleDashboardRedirect } from '@utils/modules';
import { HmsApi, CityApi } from '@lib/apiClient';
import swachhApi from '@lib/swachhApiClient';
import { setAuthCookie } from '@lib/auth';
import {
  ShieldCheck,
  Building2,
  Users,
  Award,
  TrendingUp,
  ArrowRight,
  LogOut,
  Layers,
  UserCheck,
  Sparkles,
  Zap,
  CheckCircle2,
  Globe,
  Radio,
  LayoutDashboard,
  Clock,
  ChevronRight,
  X,
  Info,
  Check,
  UserCheck2,
  Shield,
  Fingerprint,
  User as UserIcon
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

interface UnifiedApplicationAccess {
  key?: string;
  portalKey?: string;
  applicationKey?: string;
  isActive?: boolean;
  role?: string;
}

interface UnifiedPortalSession {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    roles?: string[];
    [key: string]: unknown;
  };

  applications?: UnifiedApplicationAccess[];

  tokens?: {
    taskforce?: string | null;
    matrixTrack?: string | null;
    wardRanking?: string | null;
  };
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
  const { user, logout } = useAuth();
  const router = useRouter();
  const [clockStr, setClockStr] = useState<string>('');
  const [activeModalKey, setActiveModalKey] = useState<string | null>(null);
  const [unifiedSession, setUnifiedSession] =
    useState<UnifiedPortalSession | null>(null);

  const [sessionChecked, setSessionChecked] =
    useState(false);
  // Real Dynamic Stats from API
  const [liveTaskforceCount, setLiveTaskforceCount] = useState<number>(0);
  const [liveQCCount, setLiveQCCount] = useState<number>(0);
  const [liveSwachhParticipants, setLiveSwachhParticipants] = useState<number>(0);

  // Fetch Live Real API Data


  // Clock Ticker
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const s = d.toLocaleString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setClockStr(`${s} IST`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const rawSession = localStorage.getItem(
        'unified_auth_session'
      );

      if (rawSession) {
        const parsedSession = JSON.parse(
          rawSession
        ) as UnifiedPortalSession;

        setUnifiedSession(parsedSession);
      }
    } catch {
      localStorage.removeItem(
        'unified_auth_session'
      );
    } finally {
      setSessionChecked(true);
    }
  }, []);



  const handleLogout = async () => {
    await logout();
  };

  // Determine Role & City Context
  const isSuperAdmin = Boolean(user?.roles?.includes('HMS_SUPER_ADMIN'));
  const isCityAdmin = Boolean(user?.roles?.includes('CITY_ADMIN') || user?.roles?.includes('COMMISSIONER'));

  const primaryRole = user?.roles?.[0] || 'EMPLOYEE';
  const roleLabelText = roleLabel(primaryRole);
  const cityName = user?.cityName || (isCityAdmin ? 'Indore' : '');

  const displayName = user?.name || 'User';
  const userInitial = displayName.charAt(0).toUpperCase();

  // Dynamic Workspace Link for Taskforce 20
  const workspaceUrl = isSuperAdmin
    ? '/city'
    : isCityAdmin
      ? '/city'
      : getRoleDashboardRedirect(user || null);

  // Granular Workspace Access Checks based on Single SSO Token
  // Normalize unified application keys
  const unifiedApplicationKeys = new Set(
    (unifiedSession?.applications || [])
      .filter(
        (application) =>
          application.isActive !== false
      )
      .map((application) =>
        String(
          application.key ||
          application.portalKey ||
          application.applicationKey ||
          ''
        ).toUpperCase()
      )
      .filter(Boolean)
  );

  const isUnifiedLogin = Boolean(unifiedSession);

  // Existing native Taskforce access
  const hasNativeTaskforceAccess =
    isSuperAdmin ||
    isCityAdmin ||
    Boolean(
      user?.modules?.some((module) =>
        [
          'TASKFORCE',
          'LITTERBINS',
          'SWEEPING',
          'TOILET',
        ].includes(
          String(
            module.key || module.name || ''
          ).toUpperCase()
        )
      )
    );

  // Unified portal access
  const hasUnifiedTaskforceAccess =
    unifiedApplicationKeys.has('TASKFORCE_20') ||
    unifiedApplicationKeys.has(
      'PORTAL_TASKFORCE_20'
    ) ||
    Boolean(unifiedSession?.tokens?.taskforce);

  const hasUnifiedWardRankingAccess =
    unifiedApplicationKeys.has('WARD_RANKING') ||
    unifiedApplicationKeys.has(
      'PORTAL_WARD_RANKING'
    ) ||
    Boolean(unifiedSession?.tokens?.wardRanking);

  const hasUnifiedMatrixTrackAccess =
    unifiedApplicationKeys.has('MATRIX_TRACK') ||
    unifiedApplicationKeys.has(
      'PORTAL_MATRIX_TRACK'
    ) ||
    Boolean(unifiedSession?.tokens?.matrixTrack);

  // Final card visibility
  const hasTaskforceAccess = isUnifiedLogin
    ? hasUnifiedTaskforceAccess
    : hasNativeTaskforceAccess;

  const hasSwachhAccess = isUnifiedLogin
    ? hasUnifiedWardRankingAccess
    : isSuperAdmin ||
    isCityAdmin ||
    Boolean(
      user?.modules?.some((module) =>
        [
          'SWACHH_RANKING',
          'SWACHH',
          'WARD_RANKING',
        ].includes(
          String(
            module.key || module.name || ''
          ).toUpperCase()
        )
      )
    );

  const hasWorkforceAccess = isUnifiedLogin
    ? hasUnifiedMatrixTrackAccess
    : isSuperAdmin ||
    isCityAdmin ||
    Boolean(
      user?.modules?.some((module) =>
        [
          'WORKFORCE_MONITORING',
          'WORKFORCE',
          'MATRIXTRACK_WORKFORCE',
          'ATTENDANCE',
        ].includes(
          String(
            module.key || module.name || ''
          ).toUpperCase()
        )
      )
    );

  const openTaskforceWorkspace = () => {
    const taskforceToken =
      unifiedSession?.tokens?.taskforce ||
      localStorage.getItem(
        'taskforce_access_token'
      );

    if (isUnifiedLogin) {
      if (!taskforceToken) {
        return;
      }

      localStorage.setItem(
        'taskforce_access_token',
        taskforceToken
      );

      localStorage.setItem(
        'active_unified_application',
        'TASKFORCE_20'
      );

      // Taskforce uses the native HMS authentication cookie
      setAuthCookie(taskforceToken);

      window.location.assign(
        workspaceUrl || '/city'
      );

      return;
    }

    router.push(workspaceUrl || '/city');
  };

  useEffect(() => {
    if (!sessionChecked) return;

    async function fetchLiveCounts() {
      if (hasTaskforceAccess) {
        try {
          const isSuper = Boolean(
            user?.roles?.includes(
              'HMS_SUPER_ADMIN'
            )
          );

          const statsRes = isSuper
            ? await HmsApi.getGlobalStats()
            : await CityApi.getStats();

          if (statsRes?.stats) {
            setLiveTaskforceCount(
              statsRes.stats.taskforceMembers || 0
            );

            setLiveQCCount(
              statsRes.stats.qualityControllers ||
              0
            );
          }
        } catch {
          // Keep fallback values
        }
      }

      if (hasSwachhAccess) {
        try {
          const swachhRes =
            await swachhApi.get('/admin/stats');

          if (swachhRes?.data) {
            setLiveSwachhParticipants(
              swachhRes.data.totalParticipants ||
              0
            );
          }
        } catch {
          // Keep fallback values
        }
      }
    }

    fetchLiveCounts();
  }, [
    user,
    sessionChecked,
    hasTaskforceAccess,
    hasSwachhAccess,
  ]);

  const openWardRankingWorkspace = () => {
    const wardRankingToken =
      unifiedSession?.tokens?.wardRanking ||
      localStorage.getItem(
        'ward_ranking_access_token'
      );

    if (isUnifiedLogin && !wardRankingToken) {
      return;
    }

    if (wardRankingToken) {
      localStorage.setItem(
        'ward_ranking_access_token',
        wardRankingToken
      );

      localStorage.setItem(
        'swachh_token',
        wardRankingToken
      );
    }

    localStorage.setItem(
      'active_unified_application',
      'WARD_RANKING'
    );

    window.location.assign('/ward-ranking');
  };

  const openMatrixTrackWorkspace = () => {
    const matrixTrackToken =
      unifiedSession?.tokens?.matrixTrack ||
      localStorage.getItem(
        'matrixtrack_access_token'
      );

    if (isUnifiedLogin && !matrixTrackToken) {
      return;
    }

    if (matrixTrackToken) {
      localStorage.setItem(
        'matrixtrack_access_token',
        matrixTrackToken
      );
    }

    localStorage.setItem(
      'active_unified_application',
      'MATRIX_TRACK'
    );

    window.location.assign(
      '/workforce-monitoring'
    );
  };

  // Dynamic Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const activeModalData = activeModalKey ? ROADMAP_MODULES[activeModalKey] : null;

  if (!sessionChecked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          color: '#1e3a8a',
        }}
      >
        Loading your authorized workspaces...
      </div>
    );
  }

  return (
    <Protected>
      <div className="portal-container">
        {/* Enterprise SaaS Design System */}
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
          
          body {
            background: #f8fafc !important;
            color: #0f172a !important;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 0;
          }
          .portal-container {
            padding: 24px 32px;
            min-height: 100vh;
            background: #f8fafc;
          }
          .wrap {
            max-width: 100%;
            width: 100%;
            margin: 0 auto;
          }

          /* ENTERPRISE COMMAND HEADER */
          .header-box {
            background: #ffffff;
            padding: 24px 32px;
            border-radius: 24px;
            box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02);
            border: 1.5px solid #e2e8f0;
            margin-bottom: 32px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 24px;
          }
          .brandline {
            font-size: 11px;
            letter-spacing: 1.8px;
            text-transform: uppercase;
            color: #1e3a8a;
            margin-bottom: 6px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          h1.main-title {
            font-size: 27px;
            font-weight: 950;
            letter-spacing: -0.03em;
            line-height: 1.15;
            color: #0f172a;
            margin: 0;
          }
          h1.main-title .sub {
            display: block;
            font-size: 13.5px;
            font-weight: 600;
            color: #64748b;
            letter-spacing: 0;
            margin-top: 4px;
          }
          
          .header-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 12px;
          }
          .header-user-bar {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          /* User Executive Profile Pill */
          .user-profile-badge {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #ffffff;
            border: 1.5px solid #cbd5e1;
            padding: 5px 16px 5px 6px;
            border-radius: 30px;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
          }
          .avatar-circle {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #1e3a8a, #2563eb);
            color: #ffffff;
            font-weight: 900;
            font-size: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            line-height: 1;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
            flex-shrink: 0;
          }
          .user-details {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .user-name-text {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
          }
          .role-tag-pill {
            font-size: 10.5px;
            font-weight: 800;
            background: #1e3a8a;
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .city-tag-pill {
            font-size: 10.5px;
            font-weight: 800;
            background: #2563eb;
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          .btn-logout-sleek {
            background: #fef2f2;
            border: 1.5px solid #fecdd3;
            color: #dc2626;
            padding: 8px 18px;
            border-radius: 30px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 7px;
            box-shadow: 0 2px 6px rgba(220, 38, 38, 0.05);
            transition: all 0.2s ease;
          }
          .btn-logout-sleek:hover {
            background: #fee2e2;
            border-color: #f87171;
            transform: translateY(-1px);
          }

          .meta-info-row {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 12px;
            color: #64748b;
          }
          .live-badge-pulse {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            color: #047857;
            font-weight: 800;
            font-size: 11px;
            background: #ecfdf5;
            padding: 4px 12px;
            border-radius: 20px;
            border: 1px solid #a7f3d0;
            letter-spacing: 0.3px;
          }
          .pulse-dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            animation: pulse 1.8s infinite;
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
            70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
          }

          /* Section Headings */
          .section-title-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .section-title-box h2 {
            font-size: 20px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.02em;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          /* FEATURED ACTIVE WORKSPACES GRID */
          .active-workspaces-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(460px, 1fr));
            gap: 24px;
            margin-bottom: 24px;
          }
          .hero-workspace-card {
            background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
            border: 2px solid #3b82f6;
            border-radius: 24px;
            padding: 32px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 10px 30px -5px rgba(37, 99, 235, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.04);
            position: relative;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .hero-workspace-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 18px 45px -6px rgba(37, 99, 235, 0.24);
            border-color: #2563eb;
          }
          .hero-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .hero-icon-box {
            width: 58px;
            height: 58px;
            border-radius: 18px;
            background: linear-gradient(135deg, #eff6ff, #dbeafe);
            border: 1.5px solid #93c5fd;
            display: grid;
            placeItems: center;
            color: #2563eb;
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.18);
          }
          .hero-live-tag {
            display: flex;
            align-items: center;
            gap: 7px;
            background: #ecfdf5;
            color: #047857;
            border: 1.5px solid #a7f3d0;
            font-size: 11.5px;
            font-weight: 800;
            padding: 6px 16px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .hero-card-title {
            font-size: 26px;
            font-weight: 950;
            color: #0f172a;
            margin: 0 0 6px;
            letter-spacing: -0.03em;
          }
          .hero-card-sub {
            font-size: 12px;
            color: #2563eb;
            font-weight: 800;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            margin-bottom: 16px;
          }
          .hero-card-desc {
            font-size: 14.5px;
            color: #475569;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .hero-tags-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 26px;
          }
          .feature-pill {
            background: #ffffff;
            color: #1e293b;
            border: 1.5px solid #cbd5e1;
            font-size: 12px;
            font-weight: 700;
            padding: 6px 14px;
            border-radius: 14px;
            box-shadow: 0 2px 4px rgba(15, 23, 42, 0.02);
          }
          .btn-launch-hero {
            width: 100%;
            height: 54px;
            background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
            color: #ffffff;
            border: none;
            border-radius: 16px;
            font-weight: 800;
            font-size: 15px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            box-shadow: 0 8px 24px rgba(37, 99, 235, 0.38);
            transition: all 0.25s ease;
          }
          .btn-launch-hero:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(37, 99, 235, 0.52);
          }

          /* UPCOMING MODULES ROADMAP BAR */
          .roadmap-bar {
            background: #ffffff;
            border: 1.5px solid #e2e8f0;
            border-radius: 20px;
            padding: 20px 26px;
            margin-bottom: 32px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03);
          }
          .roadmap-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            fontWeight: 800;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .roadmap-items {
            display: flex;
            gap: 20px;
            flex: 1;
            justify-content: flex-end;
          }
          .roadmap-item-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #f8fafc;
            border: 1.5px solid #cbd5e1;
            padding: 10px 18px;
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            textAlign: left;
          }
          .roadmap-item-btn:hover {
            background: #eff6ff;
            border-color: #3b82f6;
            transform: translateY(-2px);
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

          /* Responsive Media Queries for Mobile, Tablet & Desktop */
          @media (max-width: 1024px) {
            .portal-container {
              padding: 16px 20px;
            }
            .active-workspaces-grid {
              grid-template-columns: 1fr !important;
            }
            .roadmap-bar {
              flex-direction: column;
              align-items: flex-start;
              gap: 14px;
            }
            .roadmap-items {
              width: 100%;
              flex-direction: column;
            }
            .roadmap-item-btn {
              width: 100%;
            }
          }

          @media (max-width: 768px) {
            .header-box {
              flex-direction: column;
              align-items: flex-start;
              padding: 20px;
              gap: 16px;
            }
            .header-right {
              align-items: flex-start;
              width: 100%;
            }
            .header-user-bar {
              width: 100%;
              flex-wrap: wrap;
            }
            h1.main-title {
              font-size: 22px;
            }
            .hero-workspace-card {
              padding: 22px 20px;
            }
            .hero-card-title {
              font-size: 22px;
            }
            footer {
              flex-direction: column;
              gap: 10px;
            }
          }

          /* Modal Styling */
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(6px);
            z-index: 9999;
            display: grid;
            placeItems: center;
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
            animation: modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <div className="wrap">
          {/* Executive Governance Header */}
          <header className="header-box">
            <div>
              <div className="brandline">
                <ShieldCheck size={15} style={{ color: '#2563eb' }} /> HUMAN MATRIX GROUP · UNIFIED GOVERNANCE PLATFORM
              </div>
              <h1 className="main-title">
                {getGreeting()}, {displayName}!
                <span className="sub">{cityName ? `${cityName} Municipal Command & Operations Portal` : 'Madhya Pradesh State Clean Cities Command Suite'}</span>
              </h1>
            </div>

            <div className="header-right">
              <div className="header-user-bar">
                {user && (
                  <div className="user-profile-badge">
                    <div className="avatar-circle">
                      {userInitial}
                    </div>
                    <div className="user-details">
                      <span className="user-name-text">{displayName}</span>
                      <span className="role-tag-pill">{roleLabelText}</span>
                      {cityName && <span className="city-tag-pill">{cityName}</span>}
                    </div>
                  </div>
                )}

                <Link href="/common-registration" className="btn-logout-sleek" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', borderColor: '#2563eb', color: '#ffffff', textDecoration: 'none', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
                  <UserCheck2 size={14} /> Integrated Registration
                </Link>

                <Link href="/admin-management" className="btn-logout-sleek" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8', textDecoration: 'none' }}>
                  <ShieldCheck size={14} /> Admin Access Manager
                </Link>

                <button onClick={handleLogout} className="btn-logout-sleek" title="Sign out of portal">
                  <LogOut size={14} /> Logout
                </button>
              </div>

              <div className="meta-info-row">
                <span className="live-badge-pulse">
                  <span className="pulse-dot"></span> LIVE API FEED
                </span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{clockStr}</span>
              </div>
            </div>
          </header>

          {/* SECTION 1: PROMINENT ACTIVE WORKSPACES */}
          <div className="section-title-box">
            <h2>
              <LayoutDashboard size={22} style={{ color: '#2563eb' }} /> Active Operational Workspaces
            </h2>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
              Launch live application suites
            </span>
          </div>

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
                  boxShadow:
                    '0 10px 30px -5px rgba(124, 58, 237, 0.12)',
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
                      background:
                        'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
                      boxShadow:
                        '0 8px 24px rgba(124, 58, 237, 0.38)',
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
                  boxShadow:
                    '0 10px 30px -5px rgba(2, 132, 199, 0.12)',
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
                      background:
                        'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
                      boxShadow:
                        '0 8px 24px rgba(2, 132, 199, 0.38)',
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
            userRoles={user?.roles || []}
            userCityName={cityName || 'Indore'}
            workspaceUrl={workspaceUrl}
            enableTaskforceData={
              hasTaskforceAccess
            }
            enableWardRankingData={
              hasSwachhAccess
            }
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <button
                  onClick={() => setActiveModalKey(null)}
                  style={{ background: '#1e3a8a', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                >
                  Close Specifications
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Protected>
  );
}
