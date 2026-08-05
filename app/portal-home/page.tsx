'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrendAreaChart, DonutChart, ChartLegend } from "@components/ui/Charts";
import { Sparkline } from "@components/ui/Sparkline";
import HmsKpiCards from "@components/ui/HmsKpiCards";
import CityDirectoryTab from "./city-directory/page";
import { Protected } from '@components/Guards';
import { useAuth } from '@hooks/useAuth';
import { roleLabel } from '@lib/labels';
import { getRoleDashboardRedirect } from '@utils/modules';
import { HmsApi, CityApi, ApiError } from '@lib/apiClient';
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
  User as UserIcon,
  Layout,
  Send,
  Loader2,
  CircleHelp,
  MapPin,
  ArrowLeft
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

type MasterNode = {
  id: string;
  code: string;
  name: string;
};

type CityMasterNode = MasterNode & {
  districtId: string;
};

function OnboardCitySection({ onBack }: { onBack?: () => void }) {
  const [states, setStates] = useState<MasterNode[]>([]);
  const [divisions, setDivisions] = useState<MasterNode[]>([]);
  const [districts, setDistricts] = useState<MasterNode[]>([]);
  const [masterCities, setMasterCities] = useState<CityMasterNode[]>([]);

  const [stateId, setStateId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [cityMasterId, setCityMasterId] = useState('');

  const [code, setCode] = useState('');
  const [ulbCode, setUlbCode] = useState('');

  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);

  const fieldClass = `
    h-12 w-full rounded-[12px]
    border border-slate-200 bg-white
    px-4 text-sm font-medium text-slate-700
    outline-none transition-all duration-200
    placeholder:text-slate-400
    hover:border-slate-300
    focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10
    disabled:cursor-not-allowed disabled:bg-slate-50
    disabled:text-slate-400 disabled:opacity-80
  `;

  useEffect(() => {
    CityApi.listStates()
      .then((res: any) => {
        setStates(res.states ?? []);
      })
      .catch(() => {
        setStatus('Failed to load states');
      });
  }, []);

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

    setMasterLoading(true);

    CityApi.listDivisions(stateId)
      .then((res: any) => {
        setDivisions(res.divisions ?? []);
        setDivisionId('');
        setDistricts([]);
        setDistrictId('');
        setMasterCities([]);
        setCityMasterId('');
      })
      .catch(() => {
        setStatus('Failed to load divisions');
      })
      .finally(() => {
        setMasterLoading(false);
      });
  }, [stateId]);

  useEffect(() => {
    if (!stateId || !divisionId) {
      setDistricts([]);
      setDistrictId('');
      setMasterCities([]);
      setCityMasterId('');
      return;
    }

    setMasterLoading(true);

    CityApi.listDistricts(stateId, divisionId)
      .then((res: any) => {
        setDistricts(res.districts ?? []);
        setDistrictId('');
        setMasterCities([]);
        setCityMasterId('');
      })
      .catch(() => {
        setStatus('Failed to load districts');
      })
      .finally(() => {
        setMasterLoading(false);
      });
  }, [stateId, divisionId]);

  useEffect(() => {
    if (!districtId) {
      setMasterCities([]);
      setCityMasterId('');
      return;
    }

    setMasterLoading(true);

    CityApi.listCities(districtId)
      .then((res: any) => {
        setMasterCities(res.cities ?? []);
        setCityMasterId('');
      })
      .catch(() => {
        setStatus('Failed to load cities');
      })
      .finally(() => {
        setMasterLoading(false);
      });
  }, [districtId]);

  useEffect(() => {
    const selectedCity = masterCities.find(
      (city) => city.id === cityMasterId
    );

    if (!selectedCity) return;

    if (!code) {
      setCode(selectedCity.code.toLowerCase());
    }

    if (!ulbCode) {
      setUlbCode(selectedCity.code.toLowerCase());
    }
  }, [cityMasterId, masterCities, code, ulbCode]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCreating(true);
    setStatus('Saving...');

    try {
      await CityApi.create({
        stateId,
        divisionId,
        districtId,
        cityMasterId,
        code,
        ulbCode: ulbCode || code,
      });

      setStatus('City created successfully.');

      setStateId('');
      setDivisionId('');
      setDistrictId('');
      setCityMasterId('');

      setDivisions([]);
      setDistricts([]);
      setMasterCities([]);

      setCode('');
      setUlbCode('');
    } catch (error) {
      setStatus(
        error instanceof ApiError
          ? error.message
          : 'Failed to create city'
      );
    } finally {
      setCreating(false);
    }
  };

  const isSuccess = status.toLowerCase().includes('success');
  const isSaving = status === 'Saving...';
  const isError = Boolean(status) && !isSuccess && !isSaving;

  const hierarchyCompleted =
    Boolean(stateId) &&
    Boolean(divisionId) &&
    Boolean(districtId) &&
    Boolean(cityMasterId);

  return (
    <div className="space-y-6">
      {/* Light hero header */}
      <section className="relative overflow-hidden rounded-[22px] border border-blue-100 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex min-w-0 items-center gap-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/30">
            <Building2 size={29} strokeWidth={1.8} />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Onboard New City
              </h1>
              <Sparkles size={20} className="text-blue-500" />
            </div>
            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Deploy a new city cluster into the system.
            </p>
          </div>
        </div>
      </section>

      {/* Main content grid */}
      <section className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Progress panel */}
        <aside className="flex flex-col rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-base font-black text-slate-900">
              Onboarding Progress
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Complete the city details and review the configuration before deployment.
            </p>
          </div>

          <div className="relative mt-7 space-y-8">
            <div className="absolute bottom-5 left-[17px] top-5 w-px border-l border-dashed border-blue-200" />

            {/* Step 1 */}
            <div className="relative flex gap-3">
              <span className="z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white shadow-md shadow-blue-500/30">
                1
              </span>
              <div className="pt-0.5">
                <div className="text-sm font-extrabold text-slate-800">
                  City Information
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Provide geographic hierarchy and city identifiers.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex gap-3">
              <span
                className={`z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black transition ${
                  hierarchyCompleted
                    ? 'bg-emerald-500 text-white'
                    : 'border border-slate-200 bg-slate-100 text-slate-500'
                }`}
              >
                {hierarchyCompleted ? <Check size={15} /> : '2'}
              </span>

              <div className="pt-0.5">
                <div className="text-sm font-extrabold text-slate-800">
                  Review & Deploy
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Validate the details and activate the city cluster.
                </p>
              </div>
            </div>
          </div>

          <div className="my-6 h-px bg-slate-100" />

          <div className="rounded-[16px] border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                <CircleHelp size={17} />
              </span>
              <div>
                <div className="text-sm font-extrabold text-blue-700">
                  Need help?
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Select State, Division, District and City in sequence for accurate system mapping.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info size={14} />
              Fields marked with * are mandatory.
            </div>
          </div>
        </aside>

        {/* Form panel */}
        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-blue-50 text-blue-600">
                <Building2 size={20} />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  City Onboarding
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Select the complete geographic hierarchy to register a new city cluster.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCreate} className="px-5 py-5 sm:px-7 sm:py-6">
            {/* Hierarchy fields */}
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">
                  State <span className="text-rose-500">*</span>
                </span>
                <select
                  className={fieldClass}
                  value={stateId}
                  onChange={(event) => setStateId(event.target.value)}
                  required
                >
                  <option value="">Select state</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">
                  Division <span className="text-rose-500">*</span>
                </span>
                <select
                  className={fieldClass}
                  value={divisionId}
                  onChange={(event) => setDivisionId(event.target.value)}
                  disabled={!stateId}
                  required
                >
                  <option value="">
                    {stateId
                      ? masterLoading
                        ? 'Loading...'
                        : 'Select division'
                      : 'Select state first'}
                  </option>
                  {divisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">
                  District <span className="text-rose-500">*</span>
                </span>
                <select
                  className={fieldClass}
                  value={districtId}
                  onChange={(event) => setDistrictId(event.target.value)}
                  disabled={!divisionId}
                  required
                >
                  <option value="">
                    {divisionId
                      ? masterLoading
                        ? 'Loading...'
                        : 'Select district'
                      : 'Select division first'}
                  </option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">
                  City <span className="text-rose-500">*</span>
                </span>
                <select
                  className={fieldClass}
                  value={cityMasterId}
                  onChange={(event) => setCityMasterId(event.target.value)}
                  disabled={!districtId}
                  required
                >
                  <option value="">
                    {districtId
                      ? masterLoading
                        ? 'Loading...'
                        : 'Select city'
                      : 'Select district first'}
                  </option>
                  {masterCities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="my-6 h-px bg-slate-100" />

            {/* Identifier fields */}
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">
                  System Code <span className="text-rose-500">*</span>
                </span>
                <input
                  className={fieldClass}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="e.g. indore"
                  required
                />
                <span className="mt-2 block text-xs text-slate-400">
                  Used internally for routing and system references.
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">
                  ULB Identifier
                </span>
                <input
                  className={fieldClass}
                  value={ulbCode}
                  onChange={(event) => setUlbCode(event.target.value)}
                  placeholder="e.g. idr01"
                />
                <span className="mt-2 block text-xs text-slate-400">
                  Urban Local Body code used in reporting.
                </span>
              </label>
            </div>

            {/* Status alert */}
            {status && (
              <div
                role="status"
                className={`mt-6 flex items-center gap-2.5 rounded-[12px] border px-4 py-3 text-sm font-semibold ${
                  isSuccess
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : isError
                      ? 'border-rose-100 bg-rose-50 text-rose-700'
                      : 'border-blue-100 bg-blue-50 text-blue-700'
                }`}
              >
                {isSuccess && <CheckCircle2 size={17} />}
                {isSaving && <Loader2 size={17} className="animate-spin" />}
                {status}
              </div>
            )}

            {/* Actions */}
            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  disabled={creating}
                  className="
                    inline-flex h-12 items-center justify-center gap-2
                    rounded-[12px] border border-slate-200 bg-white
                    px-7 text-sm font-extrabold text-slate-700
                    transition-all duration-200
                    hover:border-blue-200 hover:bg-blue-50/50 hover:text-blue-700
                    disabled:cursor-not-allowed disabled:opacity-60
                    sm:min-w-[210px]
                  "
                >
                  <ArrowLeft size={16} />
                  Back to Dashboard
                </button>
              )}

              <button
                type="submit"
                disabled={creating}
                className="
                  inline-flex h-12 items-center justify-center gap-2
                  rounded-[12px] bg-gradient-to-r
                  from-blue-600 to-indigo-600
                  px-8 text-sm font-extrabold text-white
                  shadow-lg shadow-blue-600/30
                  transition-all duration-200
                  hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700
                  disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-65
                  sm:min-w-[210px]
                "
              >
                {creating ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Deploy City
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </section>
    </div>
  );
}

export default function PortalHomePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'onboard-city' | 'city-directory'>('dashboard');
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
      <div className="flex min-h-screen bg-[#f8fafc]">
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
          .active-workspaces-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
            gap: 24px;
            margin-bottom: 24px;
          }
          .hero-workspace-card {
            background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
            border: 2px solid #3b82f6;
            border-radius: 24px;
            padding: 28px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-shadow: 0 10px 30px -5px rgba(37, 99, 235, 0.12);
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
            width: 54px;
            height: 54px;
            border-radius: 18px;
            background: linear-gradient(135deg, #eff6ff, #dbeafe);
            border: 1.5px solid #93c5fd;
            display: grid;
            place-items: center;
            color: #2563eb;
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
            padding: 5px 14px;
            border-radius: 20px;
            text-transform: uppercase;
          }
          .hero-card-title {
            font-size: 24px;
            font-weight: 950;
            color: #0f172a;
            margin: 0 0 6px;
          }
          .hero-card-sub {
            font-size: 12px;
            color: #2563eb;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 14px;
          }
          .hero-card-desc {
            font-size: 14px;
            color: #475569;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .hero-tags-row {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 24px;
          }
          .feature-pill {
            background: #ffffff;
            color: #1e293b;
            border: 1.5px solid #cbd5e1;
            font-size: 11.5px;
            font-weight: 700;
            padding: 5px 12px;
            border-radius: 12px;
          }
          .btn-launch-hero {
            width: 100%;
            height: 50px;
            background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
            color: #ffffff;
            border: none;
            border-radius: 16px;
            font-weight: 800;
            font-size: 14.5px;
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
          }
          .roadmap-bar {
            background: #ffffff;
            border: 1.5px solid #e2e8f0;
            border-radius: 20px;
            padding: 18px 24px;
            margin-bottom: 32px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
          }
          .roadmap-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13.5px;
            font-weight: 800;
            color: #475569;
            text-transform: uppercase;
          }
          .roadmap-items {
            display: flex;
            gap: 16px;
          }
          .roadmap-item-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #f8fafc;
            border: 1.5px solid #cbd5e1;
            padding: 10px 16px;
            border-radius: 14px;
            cursor: pointer;
            text-align: left;
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

        {/* LEFT SIDEBAR CONTAINING NAVBAR ELEMENTS */}
        <aside className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between p-5 min-h-screen sticky top-0 h-screen overflow-y-auto">
          <div className="flex flex-col gap-6">
            {/* Logo / Brand Header */}
            <div
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-3 px-1 py-1 cursor-pointer group transition-all"
              title="Return to Main Portal Entrance"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
                <Shield size={22} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                  MatrixTrack 2.0
                </div>
                <div className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">
                  Enterprise Portal
                </div>
              </div>
            </div>

            {/* Sidebar Options */}
            <nav className="flex flex-col gap-2">
              <div className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Navigation Menu
              </div>

              {/* Home Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard size={18} className={activeTab === 'dashboard' ? 'text-white' : 'text-slate-500'} />
                <span>Home</span>
              </button>

              {/* Onboard New City */}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('onboard-city')}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    activeTab === 'onboard-city'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Building2 size={18} className={activeTab === 'onboard-city' ? 'text-white' : 'text-slate-500'} />
                  <span>Onboard New City</span>
                </button>
              )}

              {/* City Directory Tab */}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('city-directory')}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    activeTab === 'city-directory'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Globe size={18} className={activeTab === 'city-directory' ? 'text-white' : 'text-slate-500'} />
                  <span>City Directory</span>
                </button>
              )}

              {/* Employee Registration Button */}
              <Link
                href="/portal-home/common-registration"
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                <UserCheck2 size={18} className="text-slate-500" />
                <span>Employee Registration</span>
              </Link>

              {/* Admin Access Manager Button */}
              <Link
                href="/admin-management"
                className="hidden"
              >
                <ShieldCheck size={18} className="text-slate-500" />
                <span>Admin Access Manager</span>
              </Link>
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 mt-6">
            <div className="flex flex-col gap-1 px-1">
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-rose-50 border border-rose-200 text-rose-600 font-extrabold text-sm rounded-xl hover:bg-rose-100 transition-all shadow-sm"
              title="Sign out of portal"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT CONTAINER */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0">
          {/* Top Bar Header with User Profile Badge in Top-Right Corner */}
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:px-7 sm:py-5 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-2 mb-1">
                <ShieldCheck size={15} className="text-blue-600" /> MATRIXTRACK 2.0 
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {activeTab === 'onboard-city' ? 'City Deployment Control' : activeTab === 'city-directory' ? 'City Directory' : `${getGreeting()}, ${displayName}!`}
              </h1>
            </div>

            {/* User Profile & Role Badge in Top Right Corner */}
            {user && (
              <div className="flex items-center gap-4">
                {/* LIVE API FEED moved here */}
                <div className="hidden sm:flex flex-col items-end gap-1 px-1 mr-2">
                  <span className="inline-flex items-center gap-2 text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 w-fit shadow-sm">
                    <span className="pulse-dot w-2 h-2 rounded-full bg-emerald-500"></span> LIVE API FEED
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-500">{clockStr}</span>
                </div>

                <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200 shadow-sm px-4 py-2.5 rounded-2xl shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white font-black text-base flex items-center justify-center shadow-md shadow-blue-600/25 shrink-0">
                    {userInitial}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black text-slate-900 truncate leading-snug">{displayName}</span>
                    {roleLabelText !== displayName && (
                      <span className="text-[11px] font-medium text-slate-500 truncate leading-snug">{roleLabelText}</span>
                    )}
                    {cityName && (
                      <span className="text-[11px] font-medium text-blue-600 truncate leading-snug">{cityName}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'onboard-city' ? (
            <OnboardCitySection onBack={() => setActiveTab('dashboard')} />
          ) : activeTab === 'city-directory' ? (
            <CityDirectoryTab onProvisionClick={() => setActiveTab('onboard-city')} />
          ) : (
            <div className="space-y-8">
              
              <HmsKpiCards />

              {/* Active Operational Workspaces */}
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
                userRoles={user?.roles || []}
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
          )}
        </main>

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
