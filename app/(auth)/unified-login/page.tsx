'use client';

import { useState, useEffect } from "react";
import {
  ApiError,
  AuthApi,
  PublicGeoApi,
  type UnifiedLoginResponse,
  type UnifiedPortalKey,
  type UnifiedTaskforceModuleKey,
} from "@lib/apiClient";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Building2,
  X,
  Hash,
  Lock,
  UserPlus,
  LogIn,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Layers,
  Check,
  Landmark,
  MapPinned,
  KeyRound,
  LayoutDashboard,
  BadgeCheck,
} from "lucide-react";
import { setAuthCookie } from "@lib/auth";
import { persistAccessToken } from "@lib/session";

const PORTAL_ROLE_OPTIONS: Record<
  UnifiedPortalKey,
  Array<{ value: string; label: string }>
> = {
  TASKFORCE_20: [
    { value: "SUPERVISOR", label: "Supervisor" },
    { value: "QC", label: "Quality Controller" },
    { value: "ACTION_OFFICER", label: "Action Officer" },
  ],

  PROCESSING_PLANT: [
    { value: "ADMIN", label: "Admin" },
  ],

  MATRIX_TRACK: [
    { value: "ADMIN", label: "Administrator" },
    // { value: "EMPLOYEE", label: "Employee" },
  ],

  WARD_RANKING: [
    { value: "ACCESSOR", label: "Assessor / Evaluator" },
    { value: "QC", label: "Quality Controller" },
    { value: "ADMIN", label: "Admin" },
  ],
};

const DEFAULT_PORTAL_ROLE: Record<
  UnifiedPortalKey,
  string
> = {
  TASKFORCE_20: "SUPERVISOR",
  PROCESSING_PLANT: "ADMIN",
  MATRIX_TRACK: "EMPLOYEE",
  WARD_RANKING: "ACCESSOR",
};

const PORTAL_LABELS: Record<
  UnifiedPortalKey,
  string
> = {
  TASKFORCE_20: "Inspection & Performance System",
  PROCESSING_PLANT: "Processing Monitoring System",
  MATRIX_TRACK: "Workforce Attendance System",
  WARD_RANKING: "Ward Ranking System",
};

const CITY_ADMIN_APPLICATION_ROLES: Partial<
  Record<UnifiedPortalKey, string>
> = {
  TASKFORCE_20: "CITY_ADMIN",
  PROCESSING_PLANT: "ADMIN",
  MATRIX_TRACK: "ADMIN",
  WARD_RANKING: "ADMIN",
};

export default function LoginPage() {
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] =
    useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [pendingLogin, setPendingLogin] =
    useState<UnifiedLoginResponse | null>(null);

  // 100% Exact Original Register Form States
  const [regForm, setRegForm] = useState({
    name: "",
    email: "",
    phone: "",
    aadharNumber: "",
    password: "",
    stateId: "",
    divisionId: "",
    districtId: "",
    cityId: "",
    zoneId: "",
    wardId: "",
  });
  const [regStatus, setRegStatus] = useState("");

  const [applicationRoles, setApplicationRoles] =
    useState<
      Partial<Record<UnifiedPortalKey, string>>
    >({});

  const [states, setStates] = useState<
    { id: string; name: string }[]
  >([]);

  const [divisions, setDivisions] = useState<
    { id: string; name: string }[]
  >([]);

  const [districts, setDistricts] = useState<
    { id: string; name: string }[]
  >([]);

  const [selectedPortals, setSelectedPortals] =
    useState<UnifiedPortalKey[]>([]);

  const [
    selectedTaskforceModules,
    setSelectedTaskforceModules,
  ] = useState<UnifiedTaskforceModuleKey[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Fetch Cities on load for registration
  useEffect(() => {
    PublicGeoApi.states()
      .then((response) =>
        setStates(response.states || []),
      )
      .catch(() => { });
  }, []);

  const handleStateChange = async (
    stateId: string,
  ) => {
    setRegForm((current) => ({
      ...current,
      stateId,
      divisionId: "",
      districtId: "",
      cityId: "",
      zoneId: "",
      wardId: "",
    }));

    setDivisions([]);
    setDistricts([]);
    setCities([]);
    setZones([]);
    setWards([]);

    if (!stateId) return;

    setLoadingGeo(true);

    try {
      const response =
        await PublicGeoApi.divisions(stateId);

      setDivisions(response.divisions || []);
    } finally {
      setLoadingGeo(false);
    }
  };

  const isCityLevelAccess =
    Boolean(regForm.cityId) &&
    !regForm.zoneId &&
    !regForm.wardId;

  const handleDivisionChange = async (
    divisionId: string,
  ) => {
    setRegForm((current) => ({
      ...current,
      divisionId,
      districtId: "",
      cityId: "",
      zoneId: "",
      wardId: "",
    }));

    setDistricts([]);
    setCities([]);
    setZones([]);
    setWards([]);

    if (!regForm.stateId || !divisionId) return;

    setLoadingGeo(true);

    try {
      const response =
        await PublicGeoApi.districts(
          regForm.stateId,
          divisionId,
        );

      setDistricts(response.districts || []);
    } finally {
      setLoadingGeo(false);
    }
  };

  const handleDistrictChange = async (
    districtId: string,
  ) => {
    setRegForm((current) => ({
      ...current,
      districtId,
      cityId: "",
      zoneId: "",
      wardId: "",
    }));

    setCities([]);
    setZones([]);
    setWards([]);

    if (!districtId) return;

    setLoadingGeo(true);

    try {
      const response =
        await PublicGeoApi.citiesByDistrict(
          districtId,
        );

      setCities(response.cities || []);
    } finally {
      setLoadingGeo(false);
    }
  };

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

  const updateRegForm = (
    key: keyof typeof regForm,
    value: string,
  ) => {
    setRegForm((f) => ({ ...f, [key]: value }));
  };

  const togglePortal = (
    portal: UnifiedPortalKey,
  ) => {
    setSelectedPortals((current) => {
      const isSelected = current.includes(portal);

      if (isSelected) {
        if (portal === "TASKFORCE_20") {
          setSelectedTaskforceModules([]);
        }

        setApplicationRoles((roles) => {
          const updatedRoles = { ...roles };
          delete updatedRoles[portal];
          return updatedRoles;
        });

        return current.filter(
          (item) => item !== portal,
        );
      }

      setApplicationRoles((roles) => ({
        ...roles,
        [portal]: DEFAULT_PORTAL_ROLE[portal],
      }));

      return [...current, portal];
    });
  };

  const toggleTaskforceModule = (
    moduleKey: UnifiedTaskforceModuleKey,
  ) => {
    setSelectedTaskforceModules((current) =>
      current.includes(moduleKey)
        ? current.filter(
          (item) => item !== moduleKey,
        )
        : [...current, moduleKey],
    );
  };

  const mergeApplications = (
    first: any[] = [],
    second: any[] = [],
  ) => {
    const applicationMap = new Map<string, any>();

    [...first, ...second].forEach(
      (application) => {
        const applicationKey =
          application?.key ||
          application?.portalKey ||
          application?.applicationKey;

        if (!applicationKey) return;

        applicationMap.set(applicationKey, {
          ...(applicationMap.get(applicationKey) ||
            {}),
          ...application,
          key: applicationKey,
        });
      },
    );

    return Array.from(applicationMap.values());
  };

  const saveUnifiedSession = (
    response: UnifiedLoginResponse,
  ) => {
    if (typeof window === "undefined") return;

    const {
      taskforce = null,
      matrixTrack = null,
      wardRanking = null,
      processingPlant = null,
    } = response.tokens || {};

    if (taskforce) {
      localStorage.setItem(
        "taskforce_access_token",
        taskforce,
      );

      // Token used by apiFetch() for Authorization header
      persistAccessToken(taskforce);

      // Preserve existing Taskforce cookie/localStorage compatibility
      setAuthCookie(taskforce);
    } else {
      localStorage.removeItem(
        "taskforce_access_token"
      );
    }

    if (matrixTrack) {
      localStorage.setItem(
        "matrixtrack_access_token",
        matrixTrack,
      );
    } else {
      localStorage.removeItem("matrixtrack_access_token");
    }

    if (wardRanking) {
      localStorage.setItem(
        "ward_ranking_access_token",
        wardRanking,
      );
    } else {
      localStorage.removeItem("ward_ranking_access_token");
    }

    if (processingPlant) {
      localStorage.setItem(
        "processing_plant_access_token",
        processingPlant,
      );
    } else {
      localStorage.removeItem(
        "processing_plant_access_token",
      );
    }

    localStorage.setItem(
      "unified_auth_session",
      JSON.stringify({
        user: response.user,
        applications: response.applications,
        tokens: response.tokens,
      }),
    );

    const secureCookie =
      window.location.protocol === "https:"
        ? "; Secure"
        : "";

    document.cookie =
      `unified_session=1; Path=/; Max-Age=28800; SameSite=Lax${secureCookie}`;
  };

  const resolveUnifiedRedirect = (
    response: UnifiedLoginResponse,
  ) => {
    const roles = [
      response.user?.role,
      ...(Array.isArray(response.user?.roles)
        ? response.user.roles
        : []),
      response.taskforce?.user?.role,
      ...(Array.isArray(response.taskforce?.user?.roles)
        ? response.taskforce.user.roles
        : []),
    ]
      .filter(Boolean)
      .map((role) => String(role).toUpperCase());

    if (roles.includes("ULB_OFFICER")) {
      return "/ulb/dashboard";
    }

    if (roles.includes("COMMISSIONER")) {
      return "/municipal/commissioner";
    }

    return response.redirectTo || "/portal-home";
  };

  const completeUnifiedLogin = (
    response: UnifiedLoginResponse,
  ) => {
    saveUnifiedSession(response);

    // Full reload lets AuthProvider read the newly saved
    // cookie and unified session before guards execute.
    window.location.assign(
      resolveUnifiedRedirect(response),
    );
  };

  const resetOtpStep = () => {
    setOtp("");
    setOtpStep(false);
    setOtpEmail("");
    setPendingLogin(null);
    setError("");
  };

  const handleLoginSubmit = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const normalizedIdentifier =
        loginIdentifier.trim();

      const response = await AuthApi.unifiedLogin({
        identifier: normalizedIdentifier,
        password,
      });

      if (response.requiresOtp) {
        setPendingLogin(response);

        setOtpEmail(
          response.pendingOtp?.email ||
          response.email ||
          "",
        );

        setOtp("");
        setOtpStep(true);
        return;
      }

      if (!response.success) {
        setError(
          response.message ||
          "Unable to complete login.",
        );
        return;
      }

      completeUnifiedLogin(response);
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 401
      ) {
        setError(
          "Invalid email, mobile number or password. Please try again.",
        );
      } else if (err instanceof ApiError) {
        setError(
          err.message ||
          "An error occurred. Please try again.",
        );
      } else {
        setError(
          "Login failed. Please check your connection.",
        );
      }
    } finally {
      setLoading(false);
    }
  };



  const handleOtpSubmit = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    const normalizedOtp = otp.replace(/\D/g, "");

    if (normalizedOtp.length !== 6) {
      setError("Enter the valid 6-digit OTP.");
      return;
    }

    if (!otpEmail) {
      setError(
        "OTP email is missing. Please return to login.",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const otpResponse =
        await AuthApi.unifiedVerifyMatrixTrackOtp({
          email: otpEmail,
          otp: normalizedOtp,
          cityId:
            pendingLogin?.pendingOtp?.cityId,
        });

      const mergedApplications =
        mergeApplications(
          pendingLogin?.applications || [],
          otpResponse.applications || [],
        );

      const mergedResponse: UnifiedLoginResponse = {
        ...otpResponse,

        success: true,

        user: {
          ...(pendingLogin?.user || {}),
          ...(otpResponse.user || {}),
          email:
            otpResponse.user?.email ||
            pendingLogin?.user?.email ||
            otpEmail,
          applications: mergedApplications,
        },

        applications: mergedApplications,

        tokens: {
          taskforce:
            pendingLogin?.tokens?.taskforce ||
            otpResponse.tokens?.taskforce ||
            null,

          matrixTrack:
            otpResponse.tokens?.matrixTrack ||
            pendingLogin?.tokens?.matrixTrack ||
            null,

          wardRanking:
            pendingLogin?.tokens?.wardRanking ||
            otpResponse.tokens?.wardRanking ||
            null,

          processingPlant:
            pendingLogin?.tokens?.processingPlant ||
            otpResponse.tokens?.processingPlant ||
            null,
        },

        requiresOtp: false,
        pendingOtp: null,
        redirectTo: "/portal-home",
      };

      completeUnifiedLogin(mergedResponse);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.message ||
          "OTP verification failed.",
        );
      } else {
        setError(
          "OTP verification failed. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setRegStatus("");

    try {
      if (
        !regForm.stateId ||
        !regForm.divisionId ||
        !regForm.districtId ||
        !regForm.cityId
      ) {
        setError(
          "Please select State, Division, District and City."
        );
        return;
      }

      if (!isCityLevelAccess) {
        const missingRole = selectedPortals.find(
          (portal) => !applicationRoles[portal]
        );

        if (missingRole) {
          setError(
            "Please select a role for each application."
          );
          return;
        }
      }

      if (!/^\d{10}$/.test(regForm.phone)) {
        setError(
          "Please enter a valid 10-digit mobile number.",
        );
        return;
      }

      if (!/^\d{12}$/.test(regForm.aadharNumber)) {
        setError(
          "Please enter a valid 12-digit Aadhaar number.",
        );
        return;
      }

      if (
        selectedPortals.includes("TASKFORCE_20") &&
        selectedTaskforceModules.length === 0
      ) {
        setError(
          "Please select at least one Taskforce module.",
        );
        return;
      }

      const effectiveApplicationRoles =
        isCityLevelAccess
          ? selectedPortals.reduce<
            Partial<Record<UnifiedPortalKey, string>>
          >((result, portal) => {
            const role =
              CITY_ADMIN_APPLICATION_ROLES[portal];

            if (role) {
              result[portal] = role;
            }

            return result;
          }, {})
          : applicationRoles;

      await AuthApi.unifiedRegisterRequest({
        name: regForm.name.trim(),
        email: regForm.email
          .trim()
          .toLowerCase(),
        phone: regForm.phone.trim(),
        aadhaar: regForm.aadharNumber.trim(),
        password: regForm.password,

        stateId: regForm.stateId,
        divisionId: regForm.divisionId,
        districtId: regForm.districtId,
        cityId: regForm.cityId,
        zoneId: regForm.zoneId,
        wardId: regForm.wardId,

        requestedPortals: selectedPortals,
        applicationRoles: effectiveApplicationRoles,

        taskforceModules:
          selectedPortals.includes(
            "TASKFORCE_20",
          )
            ? selectedTaskforceModules
            : [],
      });

      setRegStatus(
        "Registration request submitted successfully. Your selected role and application access will be reviewed by the City Admin.",
      );

      setRegForm({
        name: "",
        email: "",
        phone: "",
        aadharNumber: "",
        password: "",
        stateId: "",
        divisionId: "",
        districtId: "",
        cityId: "",
        zoneId: "",
        wardId: "",
      });

      setApplicationRoles({});
      setSelectedPortals([]);
      setSelectedTaskforceModules([]);
      setDivisions([]);
      setDistricts([]);
      setCities([]);
      setZones([]);
      setWards([]);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.message ||
          "Failed to submit registration request.",
        );
      } else {
        setError(
          "Failed to submit registration request.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-page">
      <style dangerouslySetInnerHTML={{
        __html: `
        :root {
          --mt-navy-950: #050b16;
          --mt-navy-900: #071225;
          --mt-navy-850: #0a1830;
          --mt-navy-800: #0d2142;
          --mt-blue-600: #2563eb;
          --mt-blue-500: #3b82f6;
          --mt-blue-400: #60a5fa;
          --mt-cyan-400: #22d3ee;
          --mt-teal-400: #2dd4bf;
          --mt-white: #ffffff;
          --mt-slate-50: #f8fafc;
          --mt-slate-100: #f1f5f9;
          --mt-slate-200: #e2e8f0;
          --mt-slate-300: #cbd5e1;
          --mt-slate-500: #64748b;
          --mt-slate-700: #334155;
          --mt-slate-900: #0f172a;
        }

        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; }
        button, input, select { font: inherit; }
        button { -webkit-tap-highlight-color: transparent; }

        @keyframes mtFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mtPulse {
          0%, 100% { opacity: .42; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.22); }
        }
        @keyframes mtScan {
          0% { transform: translateY(-110%); opacity: 0; }
          16% { opacity: .72; }
          84% { opacity: .45; }
          100% { transform: translateY(500%); opacity: 0; }
        }
        @keyframes mtFlow {
          to { stroke-dashoffset: -42; }
        }
        @keyframes mtFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes mtGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,.05), 0 24px 80px rgba(0,0,0,.24); }
          50% { box-shadow: 0 0 0 9px rgba(59,130,246,.035), 0 28px 90px rgba(0,0,0,.3); }
        }
        @keyframes mtDrawer {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .mt-page {
          position: relative;
          min-height: 100vh;
          width: 100%;
          overflow-x: hidden;
          color: var(--mt-white);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background:
            radial-gradient(circle at 76% 20%, rgba(37,99,235,.2), transparent 31%),
            radial-gradient(circle at 17% 76%, rgba(14,165,233,.09), transparent 30%),
            linear-gradient(135deg, var(--mt-navy-950) 0%, var(--mt-navy-900) 45%, #081a36 100%);
        }
        .mt-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .34;
          background-image:
            linear-gradient(rgba(96,165,250,.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(96,165,250,.055) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(to bottom, transparent 0%, #000 28%, #000 100%);
        }
        .mt-page::after {
          content: "";
          position: fixed;
          inset: 78px 0 0;
          pointer-events: none;
          background:
            linear-gradient(118deg, transparent 0 47%, rgba(37,99,235,.06) 47.2% 47.45%, transparent 47.7%),
            linear-gradient(23deg, transparent 0 60%, rgba(96,165,250,.045) 60.2% 60.4%, transparent 60.6%);
        }
        .mt-noise {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .035;
          z-index: 1;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E");
        }

        .mt-header {
          position: relative;
          z-index: 20;
          height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 clamp(24px, 4vw, 68px);
          border-bottom: 1px solid rgba(148,163,184,.14);
          background: rgba(5,11,22,.72);
          backdrop-filter: blur(20px);
        }
        .mt-brand {
          display: inline-flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }
        .mt-brand-mark {
          width: 44px;
          height: 44px;
          border-radius: 13px;
          display: grid;
          place-items: center;
          color: #fff;
          flex: 0 0 auto;
          background: linear-gradient(145deg, #3b82f6, #1d4ed8);
          border: 1px solid rgba(255,255,255,.24);
          box-shadow: 0 12px 28px rgba(37,99,235,.3), inset 0 1px 0 rgba(255,255,255,.24);
        }
        .mt-brand-name {
          color: #fff;
          font-size: 20px;
          font-weight: 850;
          letter-spacing: -.025em;
          line-height: 1;
          white-space: nowrap;
        }
        .mt-header-actions { display: flex; align-items: center; gap: 10px; }
        .mt-header-request {
          border: 1px solid rgba(148,163,184,.2);
          color: #cbd5e1;
          background: rgba(255,255,255,.045);
          min-height: 42px;
          padding: 0 17px;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition: .2s ease;
        }
        .mt-header-request:hover { color: #fff; border-color: rgba(96,165,250,.48); background: rgba(59,130,246,.09); }
        .mt-header-signin,
        .mt-primary-button {
          border: 0;
          color: #fff;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          font-weight: 800;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          box-shadow: 0 12px 26px rgba(37,99,235,.28), inset 0 1px 0 rgba(255,255,255,.18);
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .mt-header-signin {
          min-height: 42px;
          padding: 0 18px;
          border-radius: 11px;
          font-size: 13px;
        }
        .mt-header-signin:hover,
        .mt-primary-button:hover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(37,99,235,.38); }

        .mt-main {
          position: relative;
          z-index: 5;
          width: min(1500px, 100%);
          margin: 0 auto;
          padding: clamp(30px, 4vw, 58px) clamp(24px, 4vw, 68px) 34px;
          min-height: calc(100vh - 78px);
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(390px, 448px);
          align-items: center;
          gap: clamp(34px, 5vw, 78px);
        }
        .mt-hero {
          min-width: 0;
          animation: mtFadeUp .65s ease both;
        }
        .mt-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #bfdbfe;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: .16em;
          text-transform: uppercase;
          margin-bottom: 17px;
        }
        .mt-eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--mt-teal-400);
          box-shadow: 0 0 0 6px rgba(45,212,191,.1), 0 0 18px rgba(45,212,191,.65);
        }
        .mt-title {
          margin: 0;
          color: #fff;
          font-size: clamp(48px, 5vw, 76px);
          line-height: .97;
          letter-spacing: -.055em;
          font-weight: 900;
        }
        .mt-title span { color: #8ab9ff; }
        .mt-description {
          max-width: 720px;
          margin: 22px 0 0;
          color: #a9bad1;
          font-size: clamp(15px, 1.3vw, 18px);
          line-height: 1.7;
          font-weight: 480;
        }
        .mt-hero-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 27px;
        }
        .mt-primary-button {
          min-height: 50px;
          padding: 0 22px;
          border-radius: 13px;
          font-size: 14px;
        }
        .mt-status-line {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #91a5c0;
          font-size: 12px;
          font-weight: 650;
        }
        .mt-status-line span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2dd4bf;
          box-shadow: 0 0 12px rgba(45,212,191,.7);
        }

        .mt-access-visual {
          position: relative;
          min-height: 338px;
          margin-top: 32px;
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid rgba(96,165,250,.19);
          background:
            linear-gradient(150deg, rgba(13,33,66,.78), rgba(5,16,34,.88)),
            radial-gradient(circle at 64% 40%, rgba(59,130,246,.14), transparent 40%);
          box-shadow: 0 30px 90px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.035);
          animation: mtGlow 6s ease-in-out infinite;
        }
        .mt-access-visual::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: .23;
          background-image:
            linear-gradient(rgba(96,165,250,.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(96,165,250,.12) 1px, transparent 1px);
          background-size: 42px 42px;
        }
        .mt-access-visual::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 64% 50%, transparent 0 32%, rgba(5,11,22,.26) 66%, rgba(5,11,22,.62) 100%);
        }
        .mt-scan-line {
          position: absolute;
          z-index: 4;
          left: 0;
          right: 0;
          top: 0;
          height: 90px;
          pointer-events: none;
          background: linear-gradient(to bottom, transparent, rgba(96,165,250,.08), rgba(96,165,250,.24), transparent);
          animation: mtScan 7.4s linear infinite;
        }
        .mt-visual-content {
          position: relative;
          z-index: 5;
          min-height: 338px;
          display: grid;
          grid-template-columns: 205px minmax(260px, 1fr) 180px;
          gap: 20px;
          align-items: center;
          padding: 24px;
        }
        .mt-hierarchy {
          position: relative;
          display: grid;
          gap: 11px;
          align-content: center;
        }
        .mt-hierarchy::before {
          content: "";
          position: absolute;
          left: 20px;
          top: 31px;
          bottom: 31px;
          width: 1px;
          background: linear-gradient(to bottom, rgba(96,165,250,.15), rgba(96,165,250,.8), rgba(45,212,191,.32));
        }
        .mt-level {
          position: relative;
          display: flex;
          align-items: center;
          gap: 11px;
          min-height: 52px;
          padding: 8px 10px 8px 8px;
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,.13);
          background: rgba(5,18,39,.62);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
        }
        .mt-level-icon {
          position: relative;
          z-index: 2;
          width: 26px;
          height: 26px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: #bfdbfe;
          background: #102a55;
          border: 1px solid rgba(96,165,250,.28);
        }
        .mt-level-label {
          color: #dbeafe;
          font-size: 12px;
          font-weight: 760;
          letter-spacing: .01em;
        }
        .mt-level-sub {
          margin-top: 2px;
          color: #7085a3;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .mt-core {
          position: relative;
          min-height: 270px;
          display: grid;
          place-items: center;
        }
        .mt-core-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .mt-core-svg path {
          fill: none;
          stroke: rgba(96,165,250,.44);
          stroke-width: 1.2;
          stroke-dasharray: 7 8;
          animation: mtFlow 6s linear infinite;
        }
        .mt-core-ring {
          position: absolute;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          border: 1px solid rgba(96,165,250,.22);
          box-shadow: inset 0 0 45px rgba(37,99,235,.06), 0 0 55px rgba(37,99,235,.08);
        }
        .mt-core-ring::before,
        .mt-core-ring::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          border: 1px dashed rgba(96,165,250,.14);
        }
        .mt-core-ring::before { inset: 23px; }
        .mt-core-ring::after { inset: 50px; }
        .mt-core-badge {
          position: relative;
          z-index: 4;
          width: 116px;
          height: 116px;
          border-radius: 31px;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(145deg, #3b82f6, #1d4ed8 68%, #1e40af);
          border: 1px solid rgba(255,255,255,.32);
          box-shadow: 0 24px 60px rgba(37,99,235,.3), inset 0 1px 0 rgba(255,255,255,.28);
          transform: rotate(45deg);
          animation: mtFloat 5.5s ease-in-out infinite;
        }
        .mt-core-badge svg { transform: rotate(-45deg); }
        .mt-factor {
          position: absolute;
          z-index: 6;
          min-width: 104px;
          padding: 9px 11px;
          border-radius: 12px;
          border: 1px solid rgba(96,165,250,.2);
          background: rgba(5,18,39,.83);
          box-shadow: 0 10px 28px rgba(0,0,0,.2);
          backdrop-filter: blur(10px);
        }
        .mt-factor b {
          display: block;
          color: #dbeafe;
          font-size: 11px;
          font-weight: 800;
        }
        .mt-factor small {
          display: block;
          color: #7187a7;
          font-size: 9px;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .mt-factor-role { left: 1%; top: 16%; }
        .mt-factor-geo { right: 0; top: 19%; }
        .mt-factor-app { right: 5%; bottom: 10%; }
        .mt-pulse-dot {
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #60a5fa;
          box-shadow: 0 0 13px rgba(96,165,250,.8);
          animation: mtPulse 2.4s ease-in-out infinite;
        }
        .mt-dot-one { left: 12%; bottom: 25%; }
        .mt-dot-two { right: 15%; top: 36%; animation-delay: .8s; }
        .mt-dot-three { right: 24%; bottom: 12%; animation-delay: 1.4s; background: #2dd4bf; }
        .mt-access-state {
          align-self: stretch;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 18px 16px;
          border-radius: 17px;
          border: 1px solid rgba(148,163,184,.13);
          background: rgba(5,18,39,.62);
        }
        .mt-state-label {
          color: #7085a3;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: .14em;
          text-transform: uppercase;
        }
        .mt-state-title {
          margin-top: 8px;
          color: #f8fbff;
          font-size: 14px;
          font-weight: 820;
          line-height: 1.3;
        }
        .mt-state-list { display: grid; gap: 10px; margin-top: 18px; }
        .mt-state-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #9db0c9;
          font-size: 10.5px;
          font-weight: 650;
        }
        .mt-state-check {
          width: 19px;
          height: 19px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 6px;
          color: #7dd3fc;
          background: rgba(59,130,246,.12);
          border: 1px solid rgba(96,165,250,.2);
        }
        .mt-state-ready {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 18px;
          padding-top: 13px;
          border-top: 1px solid rgba(148,163,184,.1);
          color: #8ca1bc;
          font-size: 9.5px;
          font-weight: 700;
        }
        .mt-state-ready span:last-child {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2dd4bf;
          box-shadow: 0 0 12px rgba(45,212,191,.7);
        }

        .mt-info-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-top: 17px;
          border: 1px solid rgba(148,163,184,.12);
          border-radius: 17px;
          background: rgba(7,18,37,.58);
          backdrop-filter: blur(12px);
          overflow: hidden;
        }
        .mt-info-item {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 15px 17px;
          border-right: 1px solid rgba(148,163,184,.1);
        }
        .mt-info-item:last-child { border-right: 0; }
        .mt-info-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #93c5fd;
          background: rgba(59,130,246,.1);
          border: 1px solid rgba(96,165,250,.16);
        }
        .mt-info-title {
          color: #dce8f8;
          font-size: 11px;
          font-weight: 800;
        }
        .mt-info-copy {
          margin-top: 2px;
          color: #7187a7;
          font-size: 9.5px;
          font-weight: 650;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mt-auth-panel {
          position: relative;
          z-index: 30;
          width: 100%;
          max-height: calc(100vh - 118px);
          overflow: hidden;
          border-radius: 24px;
          color: var(--mt-slate-900);
          background: rgba(255,255,255,.985);
          border: 1px solid rgba(255,255,255,.7);
          box-shadow: 0 35px 100px rgba(0,0,0,.35), 0 0 0 1px rgba(59,130,246,.05);
          animation: mtFadeUp .75s .08s ease both;
        }
        .mt-auth-panel::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          height: 4px;
          background: linear-gradient(90deg, #1d4ed8, #60a5fa, #2dd4bf);
        }
        .mt-auth-inner {
          max-height: calc(100vh - 118px);
          overflow-y: auto;
          padding: 28px 30px 24px;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
        .mt-auth-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
        }
        .mt-auth-brand { display: flex; align-items: center; gap: 11px; }
        .mt-auth-logo {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: #fff;
          background: linear-gradient(145deg, #3b82f6, #1d4ed8);
          box-shadow: 0 10px 24px rgba(37,99,235,.2);
        }
        .mt-auth-name { color: #0f172a; font-size: 16px; font-weight: 900; letter-spacing: -.025em; }
        .mt-auth-sub { color: #94a3b8; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; margin-top: 2px; }
        .mt-mobile-close {
          display: none;
          width: 34px;
          height: 34px;
          place-items: center;
          border-radius: 50%;
          border: 1px solid #dbe4ef;
          color: #64748b;
          background: #f8fafc;
          cursor: pointer;
        }
        .mt-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          padding: 4px;
          margin-bottom: 24px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f1f5f9;
        }
        .mt-tab {
          min-height: 40px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          font-size: 12.5px;
          font-weight: 800;
          transition: .2s ease;
        }
        .mt-tab.active {
          color: #1e3a8a;
          background: #fff;
          box-shadow: 0 4px 12px rgba(15,23,42,.07);
        }
        .mt-auth-heading { margin-bottom: 20px; }
        .mt-auth-heading h2 {
          margin: 0;
          color: #0f172a;
          font-size: 24px;
          line-height: 1.1;
          letter-spacing: -.035em;
          font-weight: 900;
        }
        .mt-auth-heading p {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 12.5px;
          line-height: 1.5;
          font-weight: 520;
        }
        .mt-field { margin-bottom: 15px; }
        .mt-field-label {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 6px;
          color: #334155;
          font-size: 12px;
          font-weight: 780;
        }
        .mt-field-label svg { color: #2563eb; }
        .mt-input {
          width: 100%;
          height: 46px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1.5px solid #d6e0eb;
          outline: none;
          color: #0f172a;
          background: #f8fafc;
          font-size: 13.5px;
          font-weight: 620;
          transition: .2s ease;
        }
        .mt-input:hover:not(:disabled) { border-color: #bfcee0; }
        .mt-input:focus {
          border-color: #3b82f6;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(59,130,246,.1);
        }
        .mt-input:disabled { opacity: .58; cursor: not-allowed; }
        .mt-password-wrap { position: relative; }
        .mt-password-wrap .mt-input { padding-right: 44px; }
        .mt-eye-button {
          position: absolute;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          display: grid;
          place-items: center;
          border: 0;
          color: #94a3b8;
          background: transparent;
          cursor: pointer;
        }
        .mt-submit {
          width: 100%;
          height: 49px;
          margin-top: 6px;
          border: 0;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #fff;
          background: linear-gradient(135deg, #1e40af, #2563eb);
          box-shadow: 0 13px 28px rgba(37,99,235,.25);
          font-size: 14px;
          font-weight: 850;
          cursor: pointer;
          transition: .2s ease;
        }
        .mt-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 17px 34px rgba(37,99,235,.32); }
        .mt-submit:disabled { opacity: .62; cursor: not-allowed; }
        .mt-message {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 15px;
          padding: 11px 12px;
          border-radius: 10px;
          font-size: 11.5px;
          font-weight: 650;
          line-height: 1.45;
        }
        .mt-message.error { color: #b91c1c; background: #fff1f2; border: 1px solid #fecdd3; }
        .mt-message.success { color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; }
        .mt-otp-note {
          margin-bottom: 16px;
          padding: 12px 13px;
          border-radius: 10px;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          background: #eff6ff;
          font-size: 11.5px;
          line-height: 1.5;
        }
        .mt-otp-input { text-align: center; letter-spacing: .32em; font-size: 18px; font-weight: 850; }
        .mt-link-button {
          border: 0;
          padding: 0;
          color: #2563eb;
          background: transparent;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }
        .mt-auth-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 22px;
          padding-top: 16px;
          border-top: 1px solid #eef2f7;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 650;
        }
        .mt-portal-grid { display: grid; gap: 9px; margin-top: 8px; }
        .mt-option-card {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 11px 12px;
          border-radius: 11px;
          border: 1.5px solid #d7e0eb;
          color: #0f172a;
          background: #fff;
          text-align: left;
          cursor: pointer;
          transition: .2s ease;
        }
        .mt-option-card:hover { border-color: #93c5fd; background: #f8fbff; }
        .mt-option-card.selected { border-color: #3b82f6; background: #eff6ff; }
        .mt-option-title { font-size: 12.5px; font-weight: 820; }
        .mt-option-check {
          width: 21px;
          height: 21px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 7px;
          border: 1px solid #cbd5e1;
          color: #fff;
          background: #f8fafc;
        }
        .mt-option-card.selected .mt-option-check { border-color: #2563eb; background: #2563eb; }
        .mt-module-box {
          margin-bottom: 16px;
          padding: 13px;
          border-radius: 11px;
          border: 1px solid #bfdbfe;
          background: #f8fbff;
        }
        .mt-module-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 9px;
        }
        .mt-module-button {
          min-height: 41px;
          padding: 8px 9px;
          border-radius: 9px;
          border: 1px solid #cbd5e1;
          color: #334155;
          background: #fff;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
        }
        .mt-module-button.selected { color: #1d4ed8; border-color: #2563eb; background: #dbeafe; }
        .mt-mobile-backdrop { display: none; }

        @media (max-width: 1180px) {
          .mt-main { grid-template-columns: minmax(0, 1fr) minmax(370px, 414px); gap: 36px; }
          .mt-visual-content { grid-template-columns: 185px minmax(230px, 1fr); }
          .mt-access-state { display: none; }
        }

        @media (max-width: 980px) {
          .mt-header-request { display: none; }
          .mt-main {
            display: block;
            min-height: calc(100vh - 78px);
            padding-bottom: 48px;
          }
          .mt-hero { max-width: 820px; margin: 0 auto; }
          .mt-auth-panel {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            z-index: 100;
            width: min(100%, 520px);
            max-height: none;
            border-radius: 0;
            transform: translateX(100%);
            opacity: 0;
            pointer-events: none;
            transition: transform .3s cubic-bezier(.16,1,.3,1), opacity .2s ease;
            animation: none;
          }
          .mt-auth-panel.is-open { transform: translateX(0); opacity: 1; pointer-events: auto; }
          .mt-auth-inner { max-height: 100vh; min-height: 100vh; padding: 28px 30px; }
          .mt-mobile-close { display: grid; }
          .mt-mobile-backdrop {
            position: fixed;
            inset: 0;
            z-index: 90;
            display: block;
            border: 0;
            background: rgba(2,6,15,.72);
            backdrop-filter: blur(6px);
          }
        }

        @media (max-width: 720px) {
          .mt-header { height: 70px; padding: 0 18px; }
          .mt-brand-mark { width: 40px; height: 40px; border-radius: 12px; }
          .mt-brand-name { font-size: 18px; }
          .mt-header-signin { min-height: 40px; padding: 0 14px; }
          .mt-main { padding: 34px 18px 40px; min-height: calc(100vh - 70px); }
          .mt-title { font-size: clamp(44px, 13vw, 62px); }
          .mt-description { font-size: 14px; line-height: 1.65; }
          .mt-status-line { display: none; }
          .mt-access-visual { min-height: 368px; margin-top: 26px; }
          .mt-visual-content {
            min-height: 368px;
            grid-template-columns: 132px minmax(0, 1fr);
            gap: 10px;
            padding: 15px;
          }
          .mt-level { min-height: 56px; padding: 7px; }
          .mt-level-label { font-size: 10px; }
          .mt-level-sub { font-size: 7.5px; }
          .mt-core-ring { width: 180px; height: 180px; }
          .mt-core-badge { width: 92px; height: 92px; border-radius: 25px; }
          .mt-factor { min-width: 82px; padding: 7px 8px; }
          .mt-factor b { font-size: 9px; }
          .mt-factor small { font-size: 7px; }
          .mt-factor-role { left: -4%; top: 8%; }
          .mt-factor-geo { right: -2%; top: 15%; }
          .mt-factor-app { right: 0; bottom: 7%; }
          .mt-info-strip { grid-template-columns: 1fr; }
          .mt-info-item { border-right: 0; border-bottom: 1px solid rgba(148,163,184,.1); }
          .mt-info-item:last-child { border-bottom: 0; }
          .mt-info-copy { white-space: normal; }
        }

        @media (max-width: 480px) {
          .mt-header-actions .mt-header-signin span { display: none; }
          .mt-header-signin { width: 42px; padding: 0; }
          .mt-hero-actions { justify-content: space-between; }
          .mt-primary-button { flex: 1; }
          .mt-visual-content { grid-template-columns: 116px minmax(0, 1fr); }
          .mt-hierarchy { gap: 8px; }
          .mt-level-icon { width: 23px; height: 23px; }
          .mt-core-ring { width: 154px; height: 154px; }
          .mt-core-badge { width: 78px; height: 78px; border-radius: 21px; }
          .mt-factor { display: none; }
          .mt-auth-inner { padding: 25px 20px; }
          .mt-module-grid { grid-template-columns: 1fr; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      ` }} />

      <div className="mt-noise" aria-hidden="true" />

      <header className="mt-header">
        <div className="mt-brand">
          <div className="mt-brand-mark"><ShieldCheck size={23} /></div>
          <div className="mt-brand-name">MatrixTrack 2.0</div>
        </div>

        <div className="mt-header-actions">
          <button
            type="button"
            className="mt-header-request"
            onClick={() => {
              setAuthMode("register");
              setError("");
              setRegStatus("");
              setIsDrawerOpen(true);
            }}
          >
            Request Access
          </button>
          <button
            type="button"
            className="mt-header-signin"
            onClick={() => {
              setAuthMode("login");
              setError("");
              setRegStatus("");
              setIsDrawerOpen(true);
            }}
          >
            <LogIn size={16} /> <span>Sign In</span>
          </button>
        </div>
      </header>

      <main className="mt-main">
        <section className="mt-hero" aria-labelledby="matrixtrack-title">
          <div className="mt-eyebrow">
            <span className="mt-eyebrow-dot" />
            Monitor in One Place. Act at Every Level.
          </div>

          <h1 id="matrixtrack-title" className="mt-title">
            MatrixTrack <span>2.0</span>
          </h1>

          <p className="mt-description">
            Access your assigned workspace based on administrative role,
            jurisdiction and authorised applications.
          </p>


          <div className="mt-access-visual" aria-label="Administrative access structure">
            <div className="mt-scan-line" aria-hidden="true" />

            <div className="mt-visual-content">
              <div className="mt-hierarchy">
                {[
                  { label: "State", sub: "Administration", icon: <Landmark size={14} /> },
                  { label: "Division", sub: "Administration", icon: <Layers size={14} /> },
                  { label: "District", sub: "Administration", icon: <MapPinned size={14} /> },
                  { label: "City", sub: "Administration", icon: <Building2 size={14} /> },
                ].map((level) => (
                  <div className="mt-level" key={level.label}>
                    <div className="mt-level-icon">{level.icon}</div>
                    <div>
                      <div className="mt-level-label">{level.label}</div>
                      <div className="mt-level-sub">{level.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-core">
                <svg className="mt-core-svg" viewBox="0 0 420 280" aria-hidden="true">
                  <path d="M36 52 C112 58, 116 120, 196 133" />
                  <path d="M386 56 C312 60, 305 112, 222 133" />
                  <path d="M373 233 C301 218, 286 170, 225 150" />
                </svg>

                <div className="mt-core-ring" aria-hidden="true" />
                <div className="mt-core-badge"><ShieldCheck size={44} strokeWidth={1.8} /></div>

                <div className="mt-factor mt-factor-role">
                  <b>Role</b>
                  <small>Assigned authority</small>
                </div>
                <div className="mt-factor mt-factor-geo">
                  <b>Jurisdiction</b>
                  <small>Administrative scope</small>
                </div>
                <div className="mt-factor mt-factor-app">
                  <b>Applications</b>
                  <small>Approved workspace</small>
                </div>

                <span className="mt-pulse-dot mt-dot-one" aria-hidden="true" />
                <span className="mt-pulse-dot mt-dot-two" aria-hidden="true" />
                <span className="mt-pulse-dot mt-dot-three" aria-hidden="true" />
              </div>

              <div className="mt-access-state">
                <div>
                  <div className="mt-state-label">Access context</div>
                  <div className="mt-state-title">Workspace prepared after verification</div>

                  <div className="mt-state-list">
                    {[
                      [<BadgeCheck size={12} key="i1" />, "Verified identity"],
                      [<MapPin size={12} key="i2" />, "Assigned geography"],
                      [<LayoutDashboard size={12} key="i3" />, "Enabled workspace"],
                    ].map(([icon, label], index) => (
                      <div className="mt-state-item" key={index}>
                        <div className="mt-state-check">{icon}</div>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-state-ready">
                  <span>Secure gateway ready</span>
                  <span />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-info-strip">
            <div className="mt-info-item">
              <div className="mt-info-icon"><Landmark size={17} /></div>
              <div>
                <div className="mt-info-title">Administrative Scope</div>
                <div className="mt-info-copy">State · Division · District · City</div>
              </div>
            </div>
            <div className="mt-info-item">
              <div className="mt-info-icon"><KeyRound size={17} /></div>
              <div>
                <div className="mt-info-title">Access Assignment</div>
                <div className="mt-info-copy">Role · Geography · Application</div>
              </div>
            </div>
            <div className="mt-info-item">
              <div className="mt-info-icon"><LayoutDashboard size={17} /></div>
              <div>
                <div className="mt-info-title">Workspace Delivery</div>
                <div className="mt-info-copy">Authorised dashboards only</div>
              </div>
            </div>
          </div>
        </section>

        {isDrawerOpen && (
          <button
            type="button"
            className="mt-mobile-backdrop"
            aria-label="Close access panel"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}

        <aside
          id="auth-panel"
          className={`mt-auth-panel ${isDrawerOpen ? "is-open" : ""}`}
          aria-label="MatrixTrack account access"
        >
          <div className="mt-auth-inner">
            <div className="mt-auth-top">
              <div className="mt-auth-brand">
                <div className="mt-auth-logo"><ShieldCheck size={20} /></div>
                <div>
                  <div className="mt-auth-name">MatrixTrack 2.0</div>
                  <div className="mt-auth-sub">Administrative Access</div>
                </div>
              </div>

              <button
                type="button"
                className="mt-mobile-close"
                aria-label="Close"
                onClick={() => setIsDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-tabs">
              <button
                type="button"
                className={`mt-tab ${authMode === "login" ? "active" : ""}`}
                onClick={() => {
                  setAuthMode("login");
                  setError("");
                  setRegStatus("");
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`mt-tab ${authMode === "register" ? "active" : ""}`}
                onClick={() => {
                  setAuthMode("register");
                  setError("");
                  setRegStatus("");
                }}
              >
                Request Access
              </button>
            </div>

            {authMode === "login" ? (
              <div>
                <div className="mt-auth-heading">
                  <h2>{otpStep ? "Verify account" : "Sign in"}</h2>
                  <p>
                    {otpStep
                      ? "Enter the verification code sent to your registered email."
                      : "Use your authorised account credentials."}
                  </p>
                </div>

                <form onSubmit={otpStep ? handleOtpSubmit : handleLoginSubmit}>
                  {!otpStep && (
                    <>
                      <div className="mt-field">
                        <label className="mt-field-label">
                          <UserPlus size={14} /> Email or Mobile Number
                        </label>

                        <input
                          type="text"
                          value={loginIdentifier}
                          onChange={(e) =>
                            setLoginIdentifier(e.target.value)
                          }
                          placeholder="Email or 10-digit mobile number"
                          required
                          autoComplete="username"
                          className="mt-input"
                        />
                      </div>

                      <div className="mt-field">
                        <label className="mt-field-label">
                          <Lock size={14} /> Password
                        </label>
                        <div className="mt-password-wrap">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="mt-input"
                          />
                          <button
                            type="button"
                            className="mt-eye-button"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {otpStep && (
                    <div className="mt-field">
                      <div className="mt-otp-note">
                        Code sent to <strong>{otpEmail}</strong>
                      </div>
                      <label className="mt-field-label">
                        <Lock size={14} /> Verification Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        placeholder="000000"
                        required
                        className="mt-input mt-otp-input"
                      />
                      <button
                        type="button"
                        className="mt-link-button"
                        style={{ marginTop: 11 }}
                        onClick={resetOtpStep}
                        disabled={loading}
                      >
                        Back to sign in
                      </button>
                    </div>
                  )}

                  {error && <div className="mt-message error">{error}</div>}

                  <button type="submit" disabled={loading} className="mt-submit">
                    <span>
                      {loading
                        ? otpStep
                          ? "Verifying..."
                          : "Signing in..."
                        : otpStep
                          ? "Verify OTP"
                          : "Sign In"}
                    </span>
                    <ArrowRight size={17} />
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="mt-auth-heading">
                  <h2>Request access</h2>
                  <p>Submit your details for administrative approval.</p>
                </div>

                <form onSubmit={handleRegisterSubmit}>


                  <div className="mt-field">
                    <label className="mt-field-label"><UserPlus size={14} /> Full Name</label>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={regForm.name}
                      onChange={(e) => updateRegForm("name", e.target.value)}
                      required
                      className="mt-input"
                    />
                  </div>

                  <div className="mt-field">
                    <label className="mt-field-label">
                      <Landmark size={14} /> State
                    </label>

                    <select
                      className="mt-input"
                      value={regForm.stateId}
                      onChange={(event) =>
                        void handleStateChange(event.target.value)
                      }
                      required
                    >
                      <option value="">Select State</option>

                      {states.map((state) => (
                        <option
                          key={state.id}
                          value={state.id}
                        >
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-field">
                    <label className="mt-field-label">
                      <Layers size={14} /> Division
                    </label>

                    <select
                      className="mt-input"
                      value={regForm.divisionId}
                      onChange={(event) =>
                        void handleDivisionChange(
                          event.target.value,
                        )
                      }
                      disabled={!regForm.stateId || loadingGeo}
                      required
                    >
                      <option value="">Select Division</option>

                      {divisions.map((division) => (
                        <option
                          key={division.id}
                          value={division.id}
                        >
                          {division.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-field">
                    <label className="mt-field-label">
                      <MapPinned size={14} /> District
                    </label>

                    <select
                      className="mt-input"
                      value={regForm.districtId}
                      onChange={(event) =>
                        void handleDistrictChange(
                          event.target.value,
                        )
                      }
                      disabled={
                        !regForm.divisionId || loadingGeo
                      }
                      required
                    >
                      <option value="">Select District</option>

                      {districts.map((district) => (
                        <option
                          key={district.id}
                          value={district.id}
                        >
                          {district.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-field">
                    <label className="mt-field-label"><MapPin size={14} /> City</label>
                    <select
                      className="mt-input"
                      value={regForm.cityId}
                      onChange={(event) =>
                        void handleCityChange(event.target.value)
                      }
                      disabled={
                        !regForm.districtId || loadingGeo
                      }
                      required
                    >
                      <option value="">Select City</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>{city.name}</option>
                      ))}
                    </select>
                  </div>


                  <div className="mt-field">
                    <label className="mt-field-label"><MapPin size={14} /> Zone</label>
                    <select
                      className="mt-input"
                      value={regForm.zoneId}
                      onChange={(e) => handleZoneChange(e.target.value)}
                      required
                      disabled={!regForm.cityId || loadingGeo}
                    >
                      <option value="">Select Zone</option>
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>{zone.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-field">
                    <label className="mt-field-label"><MapPin size={14} /> Ward</label>
                    <select
                      className="mt-input"
                      value={regForm.wardId}
                      onChange={(e) => updateRegForm("wardId", e.target.value)}
                      required
                      disabled={!regForm.zoneId || loadingGeo}
                    >
                      <option value="">Select Ward</option>
                      {wards.map((ward) => (
                        <option key={ward.id} value={ward.id}>{ward.name}</option>
                      ))}
                    </select>
                  </div>



                  <div className="mt-field">
                    <label className="mt-field-label"><Layers size={14} /> Required Application Access</label>
                    <div className="mt-portal-grid">
                      {[
                        {
                          key: "TASKFORCE_20",
                          title: "Inspection & Performance System",
                        },
                        {
                          key: "PROCESSING_PLANT",
                          title: "Processing Monitoring System",
                        },
                        {
                          key: "MATRIX_TRACK",
                          title: "Workforce Attendance System",
                        },
                        {
                          key: "WARD_RANKING",
                          title: "Ward Ranking System",
                        },
                      ].map((portal) => {
                        const portalKey = portal.key as UnifiedPortalKey;
                        const selected = selectedPortals.includes(portalKey);

                        return (
                          <button
                            key={portal.key}
                            type="button"
                            className={`mt-option-card ${selected ? "selected" : ""}`}
                            onClick={() => togglePortal(portalKey)}
                          >
                            <span className="mt-option-title">{portal.title}</span>
                            <span className="mt-option-check">
                              {selected && <Check size={14} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>



                  {selectedPortals.includes("TASKFORCE_20") && (
                    <div className="mt-module-box">
                      <label className="mt-field-label"><ShieldCheck size={14} /> Select Taskforce Modules</label>
                      <div className="mt-module-grid">
                        {[
                          { key: "TASKFORCE", label: "Taskforce" },
                          { key: "SWEEPING", label: "Sweeping" },
                          { key: "LITTERBINS", label: "Litter Bins" },
                          { key: "TOILET", label: "Toilet" },
                        ].map((module) => {
                          const moduleKey = module.key as UnifiedTaskforceModuleKey;
                          const selected = selectedTaskforceModules.includes(moduleKey);

                          return (
                            <button
                              key={module.key}
                              type="button"
                              className={`mt-module-button ${selected ? "selected" : ""}`}
                              onClick={() => toggleTaskforceModule(moduleKey)}
                            >
                              {selected ? "✓ " : ""}{module.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!isCityLevelAccess && (
                    <>
                      {selectedPortals.map((portalKey) => (
                        <div
                          className="mt-field"
                          key={`application-role-${portalKey}`}
                          style={{ marginTop: 12 }}
                        >
                          <label className="mt-field-label">
                            <ShieldCheck size={14} />
                            {PORTAL_LABELS[portalKey]} Role
                          </label>

                          <select
                            className="mt-input"
                            value={
                              applicationRoles[portalKey] || ""
                            }
                            onChange={(event) =>
                              setApplicationRoles((current) => ({
                                ...current,
                                [portalKey]: event.target.value,
                              }))
                            }
                            required
                          >
                            <option value="">Select Role</option>

                            {PORTAL_ROLE_OPTIONS[
                              portalKey
                            ].map((role) => (
                              <option
                                key={role.value}
                                value={role.value}
                              >
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </>
                  )}

                  <div className="mt-field">
                    <label className="mt-field-label"><Mail size={14} /> Email Address</label>
                    <input
                      type="email"
                      placeholder="you@gov.in"
                      value={regForm.email}
                      onChange={(e) => updateRegForm("email", e.target.value)}
                      required
                      className="mt-input"
                    />
                  </div>

                  <div className="mt-field">
                    <label className="mt-field-label">
                      <Phone size={14} /> Mobile Number
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      placeholder="0000000000"
                      value={regForm.phone}
                      onChange={(e) =>
                        updateRegForm(
                          "phone",
                          e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10),
                        )
                      }
                      autoComplete="tel"
                      required
                      className="mt-input"
                    />
                  </div>

                  <div className="mt-field">
                    <label className="mt-field-label">
                      <Hash size={14} /> Aadhaar Number
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{12}"
                      maxLength={12}
                      placeholder="000000000000"
                      value={regForm.aadharNumber}
                      onChange={(e) =>
                        updateRegForm(
                          "aadharNumber",
                          e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 12),
                        )
                      }
                      autoComplete="off"
                      required
                      className="mt-input"
                    />
                  </div>

                  <div className="mt-field">
                    <label className="mt-field-label"><Lock size={14} /> Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={regForm.password}
                      onChange={(e) => updateRegForm("password", e.target.value)}
                      required
                      className="mt-input"
                    />
                  </div>

                  {regStatus && (
                    <div className="mt-message success">
                      <CheckCircle2 size={15} /> <span>{regStatus}</span>
                    </div>
                  )}

                  {error && <div className="mt-message error">{error}</div>}

                  <button type="submit" disabled={loading} className="mt-submit">
                    <span>{loading ? "Submitting..." : "Submit Request"}</span>
                    <ArrowRight size={17} />
                  </button>
                </form>
              </div>
            )}

            <div className="mt-auth-footer">
              <ShieldCheck size={12} /> MatrixTrack 2.0 · © 2026
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
