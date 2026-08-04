'use client';

import { useState, useEffect } from "react";
import {
  ApiError,
  AuthApi,
  PublicGeoApi,
  type UnifiedLoginResponse,
  type UnifiedPortalKey,
  type UnifiedTaskforceModuleKey,
  type UnifiedRegistrationRole,
} from "@lib/apiClient";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Globe,
  X,
  Lock,
  Users,
  UserPlus,
  Hash,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Layers,
  Check,
  Trash2,
  Boxes,
  Leaf,
  BarChart3,
  Clock3,
} from "lucide-react";
import { setAuthCookie } from "@lib/auth";
import { persistAccessToken } from "@lib/session";

export default function LoginPage() {
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login Form States
  const [email, setEmail] = useState("");
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

  const [requestedRole, setRequestedRole] =
    useState<UnifiedRegistrationRole | "">("");

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
    PublicGeoApi.cities().then((res) => setCities(res.cities || [])).catch(() => { });
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

        return current.filter(
          (item) => item !== portal,
        );
      }

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

  const completeUnifiedLogin = (
    response: UnifiedLoginResponse,
  ) => {
    saveUnifiedSession(response);

    // Full reload lets AuthProvider read the newly saved
    // cookie and unified session before guards execute.
    window.location.assign("/portal-home");
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
      const normalizedEmail =
        email.trim().toLowerCase();

      const response = await AuthApi.unifiedLogin({
        email: normalizedEmail,
        password,
      });

      if (response.requiresOtp) {
        setPendingLogin(response);

        setOtpEmail(
          response.pendingOtp?.email ||
          response.email ||
          normalizedEmail,
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
          "Invalid email or password. Please try again.",
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
        !regForm.cityId ||
        !regForm.zoneId ||
        !regForm.wardId
      ) {
        setError(
          "City, Zone, and Ward are required.",
        );
        return;
      }

      if (!requestedRole) {
        setError(
          "Please select the role you are requesting.",
        );
        return;
      }

      if (selectedPortals.length === 0) {
        setError(
          "Please select at least one application.",
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


      await AuthApi.unifiedRegisterRequest({

        name: regForm.name.trim(),
        email: regForm.email
          .trim()
          .toLowerCase(),
        phone: regForm.phone.trim(),

        // Keep the exact Aadhaar field required by
        // UnifiedRegistrationRequest in apiClient.ts
        aadhaar: regForm.aadharNumber.trim(),

        password: regForm.password,
        cityId: regForm.cityId,
        zoneId: regForm.zoneId,
        wardId: regForm.wardId,

        requestedRole,

        requestedPortals: selectedPortals,

        taskforceModules: selectedPortals.includes(
          "TASKFORCE_20",
        )
          ? selectedTaskforceModules
          : [],
      });

      setRegStatus(
        "Registration request submitted successfully. Your selected role and application access will be reviewed by the City Admin.",
      );

      setRegForm({
        ulbCode: "",
        name: "",
        email: "",
        phone: "",
        aadharNumber: "",
        password: "",
        cityId: "",
        zoneId: "",
        wardId: "",
      });

      setRequestedRole("");
      setSelectedPortals([]);
      setSelectedTaskforceModules([]);
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
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --mt-bg: #031b13;
          --mt-bg-2: #05291d;
          --mt-card: rgba(5, 42, 29, 0.82);
          --mt-card-strong: rgba(3, 27, 19, 0.94);
          --mt-green: #7ccb55;
          --mt-lime: #b7e66c;
          --mt-gold: #f5c84b;
          --mt-warm-gold: #e9a93a;
          --mt-white: #f7faf4;
          --mt-muted: #a7b9aa;
          --mt-border: rgba(170, 215, 100, 0.2);
        }

        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; }
        button, input, select { font: inherit; }
        button { -webkit-tap-highlight-color: transparent; }

        @keyframes mtPulse {
          0%, 100% { transform: scale(1); opacity: .62; }
          50% { transform: scale(1.16); opacity: .18; }
        }
        @keyframes mtOrbit {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes mtFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes mtDrawer {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes mtFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .mt-page {
          position: relative;
          min-height: 100svh;
          overflow-x: hidden;
          color: var(--mt-white);
          font-family: Inter, Manrope, "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background:
            radial-gradient(circle at 67% 18%, rgba(124, 203, 85, .1), transparent 26%),
            radial-gradient(circle at 17% 20%, rgba(245, 200, 75, .1), transparent 29%),
            linear-gradient(135deg, #02150f 0%, var(--mt-bg) 40%, #05291d 100%);
        }
        .mt-page::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(2, 21, 15, .22), rgba(2, 21, 15, .76)),
            url('/matrixtrack-reference-bg.png') center top / cover no-repeat;
          opacity: .20;
          filter: saturate(.88) contrast(1.05);
        }
        .mt-page::after {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(1, 17, 12, .12), rgba(1, 17, 12, .72)),
            radial-gradient(circle at 50% 38%, transparent 0, rgba(1, 15, 10, .26) 54%, rgba(1, 15, 10, .72) 100%);
        }

        .mt-header,
        .mt-shell { position: relative; z-index: 2; }
        .mt-header {
          height: 76px;
          width: min(100% - 56px, 1660px);
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(340px, 1fr) auto minmax(360px, 1fr);
          align-items: center;
          gap: 24px;
          border-bottom: 1px solid rgba(183, 230, 108, .12);
        }
        .mt-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .mt-brand-mark {
          width: 48px;
          height: 52px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          color: var(--mt-gold);
          background: linear-gradient(145deg, rgba(124,203,85,.18), rgba(3,27,19,.84));
          clip-path: polygon(50% 0, 92% 18%, 87% 72%, 50% 100%, 13% 72%, 8% 18%);
          border: 1px solid rgba(245, 200, 75, .54);
          filter: drop-shadow(0 0 14px rgba(124, 203, 85, .18));
        }
        .mt-brand-title { font-size: 19px; font-weight: 900; line-height: 1.05; letter-spacing: -.035em; }
        .mt-brand-kicker { margin-top: 4px; color: var(--mt-lime); font-size: 9px; font-weight: 800; letter-spacing: .16em; }
        .mt-nav { display: flex; align-items: center; justify-content: center; gap: clamp(18px, 2.6vw, 42px); }
        .mt-nav a { color: rgba(247,250,244,.82); text-decoration: none; font-size: 12px; font-weight: 700; transition: color .2s ease; }
        .mt-nav a:hover { color: var(--mt-lime); }
        .mt-header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
        .mt-outline-btn,
        .mt-gold-btn,
        .mt-hero-btn {
          border: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 900;
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }
        .mt-outline-btn:hover,
        .mt-gold-btn:hover,
        .mt-hero-btn:hover { transform: translateY(-2px); }
        .mt-outline-btn {
          min-height: 38px;
          padding: 0 16px;
          color: var(--mt-lime);
          border: 1px solid rgba(183, 230, 108, .28);
          border-radius: 9px;
          background: rgba(3, 27, 19, .48);
          font-size: 10px;
          letter-spacing: .02em;
          backdrop-filter: blur(12px);
        }
        .mt-gold-btn,
        .mt-hero-btn {
          color: #17200c;
          background: linear-gradient(135deg, #ffd86c 0%, var(--mt-gold) 58%, #e9a93a 100%);
          box-shadow: 0 10px 28px rgba(233, 169, 58, .22);
        }
        .mt-gold-btn { min-height: 42px; padding: 0 19px; border-radius: 10px; font-size: 11px; }

        .mt-shell {
          width: min(100% - 56px, 1660px);
          margin: 0 auto;
          padding: 12px 0 18px;
        }
        .mt-hero {
          display: grid;
          grid-template-columns: minmax(510px, .9fr) minmax(780px, 1.14fr);
          gap: clamp(18px, 2vw, 32px);
          align-items: center;
          min-height: 438px;
        }
        .mt-hero-copy { padding: 8px 0 4px 18px; }
        .mt-location-pill {
          width: fit-content;
          min-height: 30px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--mt-lime);
          background: rgba(5, 42, 29, .66);
          border: 1px solid rgba(183, 230, 108, .3);
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 10px 28px rgba(0,0,0,.12);
          backdrop-filter: blur(10px);
        }
        .mt-title {
          margin: 14px 0 12px;
          max-width: 650px;
          font-size: clamp(44px, 3.45vw, 64px);
          line-height: .98;
          letter-spacing: -.055em;
          font-weight: 950;
          text-wrap: balance;
        }
        .mt-title span { display: block; }
        .mt-title .green { color: var(--mt-green); text-shadow: 0 0 28px rgba(124,203,85,.14); }
        .mt-subtitle {
          margin: 0;
          max-width: 570px;
          color: rgba(247,250,244,.8);
          font-size: clamp(13px, 1.25vw, 17px);
          line-height: 1.58;
          font-weight: 500;
        }
        .mt-hero-btn {
          min-height: 46px;
          margin-top: 20px;
          padding: 0 20px;
          border-radius: 9px;
          font-size: 13px;
        }

        .mt-map-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 196px;
          gap: 18px;
          align-items: center;
          min-width: 0;
        }
        .mt-map-card {
          position: relative;
          min-height: 430px;
          overflow: hidden;
          display: grid;
          place-items: center;
          background: transparent;
          border-radius: 22px;
        }
        .mt-map-card::before {
          content: "";
          position: absolute;
          inset: 10% 4%;
          background-image:
            linear-gradient(rgba(124,203,85,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,203,85,.035) 1px, transparent 1px);
          background-size: 30px 30px;
          mask-image: radial-gradient(circle, #000 42%, transparent 75%);
        }
        .mt-orbit {
          position: absolute;
          left: 50%;
          top: 50%;
          border: 1px solid rgba(124,203,85,.12);
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }
        .mt-orbit.one { width: 82%; height: 82%; animation: mtOrbit 30s linear infinite; }
        .mt-orbit.two { width: 65%; height: 65%; animation: mtOrbit 24s linear reverse infinite; }
        .mt-orbit.three { width: 48%; height: 48%; }
        .mt-orbit::after {
          content: "";
          position: absolute;
          top: -3px;
          left: 55%;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--mt-lime);
          box-shadow: 0 0 14px rgba(183,230,108,.8);
        }
        .mt-map-svg { position: relative; z-index: 1; width: 98%; height: auto; filter: drop-shadow(0 18px 34px rgba(0,0,0,.25)); }
        .mt-map-image {
          position: relative;
          z-index: 2;
          display: block;
          width: 100%;
          height: 430px;
          object-fit: contain;
          object-position: center;
          filter: drop-shadow(0 18px 34px rgba(0,0,0,.34));
          user-select: none;
        }
        .mt-city-marker {
          position: absolute;
          z-index: 4;
          display: flex;
          align-items: center;
          gap: 6px;
          transform: translate(-50%, -50%);
          white-space: nowrap;
        }
        .mt-city-pin {
          position: relative;
          width: 25px;
          height: 25px;
          border-radius: 50% 50% 50% 8px;
          transform: rotate(-45deg);
          display: grid;
          place-items: center;
          color: #082216;
          background: var(--mt-lime);
          border: 3px solid rgba(3,27,19,.9);
          box-shadow: 0 0 0 5px rgba(124,203,85,.11), 0 0 18px rgba(124,203,85,.52);
        }
        .mt-city-pin::after {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #12361f;
        }
        .mt-city-pin-ring {
          position: absolute;
          inset: -12px;
          border: 1px solid rgba(124,203,85,.35);
          border-radius: 50%;
          animation: mtPulse 2.6s ease-in-out infinite;
        }
        .mt-city-label {
          margin-left: -2px;
          padding: 6px 10px;
          color: var(--mt-white);
          background: rgba(3, 27, 19, .92);
          border: 1px solid rgba(124,203,85,.22);
          border-radius: 7px;
          font-size: 10px;
          font-weight: 800;
          box-shadow: 0 8px 18px rgba(0,0,0,.22);
          backdrop-filter: blur(8px);
        }
        .mt-key-cities { min-width: 0; }
        .mt-key-cities h3 { margin: 0 0 10px 6px; color: var(--mt-lime); font-size: 12px; font-weight: 900; }
        .mt-city-list { display: grid; gap: 8px; }
        .mt-city-card {
          min-height: 66px;
          padding: 8px;
          display: grid;
          grid-template-columns: 50px 1fr;
          align-items: center;
          gap: 10px;
          background: linear-gradient(145deg, rgba(7,52,33,.74), rgba(3,27,19,.78));
          border: 1px solid rgba(183,230,108,.18);
          border-radius: 10px;
          box-shadow: 0 10px 22px rgba(0,0,0,.12);
          backdrop-filter: blur(10px);
        }
        .mt-city-thumb {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 1px solid rgba(245,200,75,.34);
          overflow: hidden;
          box-shadow: 0 0 18px rgba(245,200,75,.1);
        }
        .mt-city-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .mt-city-card strong { display: block; font-size: 11px; }
        .mt-city-card span { display: block; margin-top: 3px; color: var(--mt-muted); font-size: 9px; }

        .mt-lower-grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: minmax(0, 1.52fr) minmax(340px, .78fr);
          gap: 18px;
          align-items: stretch;
        }
        .mt-left-stack,
        .mt-right-stack { display: grid; gap: 12px; min-width: 0; }
        .mt-glass {
          background: linear-gradient(145deg, rgba(5,42,29,.82), rgba(3,27,19,.72));
          border: 1px solid var(--mt-border);
          box-shadow: 0 18px 44px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.02);
          backdrop-filter: blur(15px);
        }
        .mt-stats {
          min-height: 92px;
          padding: 16px 20px;
          border-radius: 14px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: center;
        }
        .mt-stat {
          min-width: 0;
          padding: 0 18px;
          display: grid;
          grid-template-columns: 44px 1fr;
          align-items: center;
          gap: 12px;
          border-right: 1px solid rgba(183,230,108,.14);
        }
        .mt-stat:first-child { padding-left: 0; }
        .mt-stat:last-child { padding-right: 0; border-right: 0; }
        .mt-icon-ring {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 1px solid currentColor;
          background: rgba(255,255,255,.025);
          box-shadow: inset 0 0 18px rgba(255,255,255,.025);
        }
        .mt-stat-value { font-size: 22px; line-height: 1; font-weight: 950; letter-spacing: -.025em; }
        .mt-stat-label { margin-top: 5px; color: rgba(247,250,244,.68); font-size: 10px; font-weight: 600; }
        .accent-cyan { color: #42d8ef; }
        .accent-green { color: #79dc58; }
        .accent-purple { color: #bd82ff; }
        .accent-gold { color: #f5c84b; }

        .mt-features { padding: 15px 18px 14px; border-radius: 14px; }
        .mt-section-heading { text-align: center; margin-bottom: 14px; }
        .mt-section-heading h2 { margin: 0; color: var(--mt-lime); font-size: 14px; font-weight: 900; }
        .mt-heading-line { width: 52px; height: 2px; margin: 8px auto 0; border-radius: 999px; background: linear-gradient(90deg, transparent, var(--mt-gold), transparent); }
        .mt-feature-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); }
        .mt-feature {
          min-width: 0;
          min-height: 126px;
          padding: 3px 15px 0;
          text-align: center;
          border-right: 1px solid rgba(183,230,108,.13);
        }
        .mt-feature:first-child { padding-left: 5px; }
        .mt-feature:last-child { padding-right: 5px; border-right: 0; }
        .mt-feature-icon { height: 36px; display: grid; place-items: center; color: var(--mt-lime); }
        .mt-feature:nth-child(3) .mt-feature-icon,
        .mt-feature:nth-child(4) .mt-feature-icon { color: var(--mt-gold); }
        .mt-feature strong { display: block; margin-top: 6px; color: var(--mt-lime); font-size: 10px; }
        .mt-feature p { margin: 7px 0 0; color: rgba(247,250,244,.7); font-size: 9px; line-height: 1.42; }

        .mt-benefits {
          min-height: 52px;
          padding: 8px 14px;
          border-radius: 12px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          align-items: center;
        }
        .mt-benefit {
          min-width: 0;
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 10px;
          color: rgba(247,250,244,.78);
          border-right: 1px solid rgba(183,230,108,.12);
          font-size: 8px;
          line-height: 1.35;
        }
        .mt-benefit:last-child { border-right: 0; }
        .mt-benefit svg { color: var(--mt-lime); flex: 0 0 auto; }

        .mt-kpis {
          padding: 10px;
          border-radius: 14px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }
        .mt-kpi {
          min-height: 76px;
          padding: 12px 14px;
          display: grid;
          grid-template-columns: 42px 1fr;
          align-items: center;
          gap: 10px;
          border-radius: 10px;
          background: linear-gradient(145deg, rgba(7,52,33,.82), rgba(3,27,19,.84));
          border: 1px solid rgba(183,230,108,.13);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
        }
        .mt-kpi .mt-icon-ring { width: 42px; height: 42px; }
        .mt-kpi strong { display: block; font-size: 20px; line-height: 1; }
        .mt-kpi span { display: block; margin-top: 5px; color: rgba(247,250,244,.68); font-size: 9px; }

        .mt-scene {
          position: relative;
          min-height: 214px;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid rgba(183,230,108,.15);
          background: #061e15;
          box-shadow: 0 18px 44px rgba(0,0,0,.2);
        }
        .mt-scene::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(3,27,19,.01), rgba(3,27,19,.14));
          box-shadow: inset 0 0 42px rgba(3,27,19,.28);
        }
        .mt-scene img {
          display: block;
          width: 100%;
          height: 214px;
          object-fit: cover;
          object-position: center;
          user-select: none;
        }

        .mt-mobile-menu { display: none; }

        .mt-auth-layer {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          justify-content: flex-end;
          animation: mtFade .2s ease both;
        }
        .mt-auth-backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          width: 100%;
          height: 100%;
          cursor: default;
          background: rgba(1, 13, 9, .74);
          backdrop-filter: blur(6px);
        }
        .mt-drawer {
          position: relative;
          z-index: 1;
          width: min(100%, 560px);
          height: 100svh;
          overflow-y: auto;
          color: #163021;
          background: linear-gradient(180deg, #fbfdf8 0%, #f4f8ef 100%);
          box-shadow: -24px 0 70px rgba(0,0,0,.42);
          animation: mtDrawer .34s cubic-bezier(.16,1,.3,1) both;
        }
        .mt-drawer-inner { min-height: 100%; padding: 28px 34px 22px; display: flex; flex-direction: column; }
        .mt-drawer-head { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
        .mt-drawer-brand { display: flex; align-items: center; gap: 10px; }
        .mt-drawer-logo {
          width: 38px;
          height: 42px;
          display: grid;
          place-items: center;
          color: #fff;
          background: linear-gradient(145deg, #79b94e, #14532d);
          clip-path: polygon(50% 0, 92% 18%, 87% 72%, 50% 100%, 13% 72%, 8% 18%);
          filter: drop-shadow(0 6px 12px rgba(20,83,45,.2));
        }
        .mt-drawer-brand strong { display: block; color: #10271a; font-size: 17px; line-height: 1.1; }
        .mt-drawer-brand small { display: block; margin-top: 3px; color: #6a806e; font-size: 9px; font-weight: 800; letter-spacing: .1em; }
        .mt-close-btn {
          width: 35px;
          height: 35px;
          border-radius: 50%;
          border: 1px solid #d7e2d4;
          color: #59705e;
          background: #f0f5ed;
          display: grid;
          place-items: center;
          cursor: pointer;
        }
        .mt-auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          padding: 4px;
          margin-bottom: 22px;
          border-radius: 12px;
          background: #eaf1e6;
          border: 1px solid #d9e5d5;
        }
        .mt-auth-tab {
          min-height: 40px;
          border: 0;
          border-radius: 9px;
          cursor: pointer;
          color: #69806d;
          background: transparent;
          font-size: 12px;
          font-weight: 850;
        }
        .mt-auth-tab.active {
          color: #14532d;
          background: #fff;
          box-shadow: 0 3px 10px rgba(27,62,37,.08);
        }
        .mt-form-title { margin: 0 0 4px; color: #10271a; font-size: 23px; font-weight: 950; letter-spacing: -.035em; }
        .mt-form-copy { margin: 0 0 20px; color: #6b806f; font-size: 12px; line-height: 1.5; }
        .drawer-label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
          color: #2a4933;
          font-size: 12px;
          font-weight: 800;
        }
        .drawer-label svg { color: #2f8d4f !important; }
        .drawer-input-v4 {
          width: 100%;
          height: 45px;
          padding: 0 14px;
          outline: none;
          color: #12281a;
          background: #f8fbf6;
          border: 1.5px solid #cad9c7;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 650;
          transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
        }
        .drawer-input-v4:focus {
          background: #fff;
          border-color: #4c9e5e;
          box-shadow: 0 0 0 4px rgba(76,158,94,.12);
        }
        .drawer-input-v4:disabled { opacity: .62; cursor: not-allowed; }
        .btn-submit-v4 {
          width: 100%;
          min-height: 49px;
          margin-top: 12px;
          border: 0;
          border-radius: 11px;
          cursor: pointer;
          color: #13210d;
          background: linear-gradient(135deg, #ffd86c, #f5c84b 62%, #e9a93a);
          box-shadow: 0 8px 20px rgba(233,169,58,.24);
          font-size: 14px;
          font-weight: 900;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .btn-submit-v4:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 11px 26px rgba(233,169,58,.3); }
        .btn-submit-v4:disabled { opacity: .64; cursor: not-allowed; }
        .mt-field { margin-bottom: 15px; }
        .mt-alert { margin-bottom: 16px; padding: 11px 13px; border-radius: 9px; font-size: 12px; line-height: 1.45; font-weight: 650; }
        .mt-alert.error { color: #a11d1d; background: #fff1f1; border: 1px solid #f2c5c5; }
        .mt-alert.success { color: #17602f; background: #eefaf0; border: 1px solid #bfe4c6; }
        .mt-otp-note { padding: 12px 13px; margin-bottom: 16px; color: #1d6334; background: #eef9ee; border: 1px solid #c3e5c8; border-radius: 10px; font-size: 12px; line-height: 1.5; }
        .mt-link-btn { margin-top: 10px; padding: 0; border: 0; color: #267643; background: transparent; font-size: 12px; font-weight: 800; cursor: pointer; }
        .mt-divider { display: flex; align-items: center; gap: 12px; margin: 22px 0 16px; color: #87988a; font-size: 10px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
        .mt-divider::before, .mt-divider::after { content: ""; flex: 1; height: 1px; background: #dfe8dc; }
        .mt-social-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .mt-social-btn { height: 42px; display: flex; align-items: center; justify-content: center; gap: 9px; color: #183022; background: #fff; border: 1px solid #d3dfd0; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .mt-option-list { display: grid; gap: 9px; margin-top: 8px; }
        .mt-portal-option {
          width: 100%;
          padding: 12px 13px;
          border-radius: 11px;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: #183022;
          background: #fff;
          border: 1.5px solid #cbd9c8;
        }
        .mt-portal-option.selected { background: #eef8ed; border-color: #4d9e5f; }
        .mt-option-title { font-size: 12.5px; font-weight: 850; }
        .mt-option-description { margin-top: 3px; color: #708174; font-size: 10.5px; line-height: 1.4; }
        .mt-check-box { width: 21px; height: 21px; flex: 0 0 auto; display: grid; place-items: center; color: #fff; background: #f4f7f2; border: 1px solid #c5d3c2; border-radius: 7px; }
        .mt-portal-option.selected .mt-check-box { background: #378b52; border-color: #378b52; }
        .mt-module-box { margin-bottom: 17px; padding: 13px; border-radius: 11px; background: #f4f9f1; border: 1px solid #cfe0ca; }
        .mt-module-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 9px; }
        .mt-module-btn { min-height: 42px; padding: 8px 10px; border-radius: 9px; cursor: pointer; color: #405845; background: #fff; border: 1px solid #cbd8c8; font-size: 11px; font-weight: 850; }
        .mt-module-btn.selected { color: #1d6334; background: #e1f4df; border-color: #4d9e5f; }
        .mt-drawer-footer { margin-top: auto; padding-top: 20px; text-align: center; color: #8a9a8d; border-top: 1px solid #e4ebe2; font-size: 10.5px; }

        @media (max-width: 1180px) {
          .mt-header { grid-template-columns: 1fr auto; }
          .mt-nav { display: none; }
          .mt-hero { grid-template-columns: 1fr; }
          .mt-hero-copy { max-width: 720px; }
          .mt-map-layout { grid-template-columns: minmax(0, 1fr) 200px; }
          .mt-lower-grid { grid-template-columns: 1fr; }
          .mt-right-stack { grid-template-columns: minmax(0, .78fr) minmax(0, 1.22fr); }
          .mt-scene { min-height: 210px; }
        }
        @media (max-width: 760px) {
          .mt-header { width: min(100% - 28px, 1480px); height: 68px; grid-template-columns: 1fr auto; }
          .mt-brand-mark { width: 40px; height: 44px; }
          .mt-brand-title { font-size: 16px; }
          .mt-brand-kicker { font-size: 8px; }
          .mt-outline-btn { display: none; }
          .mt-gold-btn { min-height: 38px; padding: 0 13px; font-size: 10px; }
          .mt-shell { width: min(100% - 28px, 1480px); padding-top: 18px; }
          .mt-hero { min-height: auto; gap: 18px; }
          .mt-hero-copy { padding-left: 0; }
          .mt-title { font-size: clamp(38px, 12vw, 55px); }
          .mt-map-layout { grid-template-columns: 1fr; }
          .mt-map-card { min-height: 340px; }
          .mt-key-cities { display: none; }
          .mt-city-label { font-size: 8px; padding: 5px 7px; }
          .mt-city-pin { width: 21px; height: 21px; }
          .mt-stats { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .mt-stat { padding: 8px 10px; border-right: 0; border-bottom: 1px solid rgba(183,230,108,.12); }
          .mt-stat:nth-child(3), .mt-stat:nth-child(4) { border-bottom: 0; }
          .mt-feature-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
          .mt-feature { min-height: 110px; border-right: 0; border-bottom: 1px solid rgba(183,230,108,.12); }
          .mt-feature:last-child { grid-column: 1 / -1; border-bottom: 0; }
          .mt-benefits { grid-template-columns: 1fr 1fr; }
          .mt-benefit { justify-content: flex-start; min-height: 42px; border-right: 0; border-bottom: 1px solid rgba(183,230,108,.1); }
          .mt-benefit:last-child { grid-column: 1 / -1; border-bottom: 0; }
          .mt-right-stack { grid-template-columns: 1fr; }
          .mt-drawer-inner { padding: 24px 20px 20px; }
        }
        @media (max-width: 460px) {
          .mt-brand-kicker { display: none; }
          .mt-header-actions { gap: 6px; }
          .mt-gold-btn { padding: 0 10px; }
          .mt-gold-btn svg { display: none; }
          .mt-map-card { min-height: 292px; }
          .mt-map-image { height: 292px; }
          .mt-city-label { display: none; }
          .mt-city-pin { width: 19px; height: 19px; border-width: 2px; }
          .mt-stats, .mt-kpis { grid-template-columns: 1fr; }
          .mt-stat { border-bottom: 1px solid rgba(183,230,108,.12) !important; }
          .mt-stat:last-child { border-bottom: 0 !important; }
          .mt-feature-grid { grid-template-columns: 1fr; }
          .mt-feature, .mt-feature:last-child { grid-column: auto; border-bottom: 1px solid rgba(183,230,108,.12); }
          .mt-feature:last-child { border-bottom: 0; }
          .mt-social-row, .mt-module-grid { grid-template-columns: 1fr; }
        }
      ` }} />

      <header className="mt-header">
        <div className="mt-brand">
          <div className="mt-brand-mark"><ShieldCheck size={24} /></div>
          <div>
            <div className="mt-brand-title">MatrixTrack 2.0</div>
            <div className="mt-brand-kicker">CLEAN CITIES PLATFORM</div>
          </div>
        </div>

        <nav className="mt-nav" aria-label="Primary navigation">
          <a href="#about">About Us</a>
          <a href="#modules">Modules</a>
          <a href="#features">Features</a>
          <a href="#resources">Resources</a>
          <a href="#reports">Reports</a>
        </nav>

        <div className="mt-header-actions">
          <button className="mt-outline-btn" type="button" onClick={() => { setAuthMode('login'); setIsDrawerOpen(true); }}>
            <ShieldCheck size={14} /> UNIFIED SSO PORTAL
          </button>
          <button className="mt-gold-btn" type="button" onClick={() => { setAuthMode('login'); setIsDrawerOpen(true); }}>
            Sign In / Register <ArrowRight size={15} />
          </button>
        </div>
      </header>

      <main className="mt-shell">
        <section className="mt-hero" id="about">
          <div className="mt-hero-copy">
            <div className="mt-location-pill"><MapPin size={14} /> Madhya Pradesh</div>
            <h1 className="mt-title">
              <span>Madhya Pradesh</span>
              <span className="green">Clean Cities</span>
              <span>Single Sign-On Portal</span>
            </h1>
            <p className="mt-subtitle">
              One Unified Single Sign-On (SSO) Portal for Taskforce 20, Swachh Ward Ranking,
              Workforce Monitoring, and Material Recovery.
            </p>
            <button className="mt-hero-btn" type="button" onClick={() => { setAuthMode('login'); setIsDrawerOpen(true); }}>
              Access Account Portal <ArrowRight size={17} />
            </button>
          </div>

          <div className="mt-map-layout" aria-label="Madhya Pradesh city coverage map">
            <div className="mt-map-card">
              <img
                className="mt-map-image"
                src="/mp-map-premium.png"
                alt="Madhya Pradesh map with Gwalior, Bhopal, Ujjain, Indore and Jabalpur city markers"
                draggable={false}
              />
            </div>

            <aside className="mt-key-cities">
              <h3>Our Key Cities</h3>
              <div className="mt-city-list">
                {[
                  { name: "Bhopal", caption: "Capital City", image: "/city-bhopal.png" },
                  { name: "Indore", caption: "Cleanest City", image: "/city-indore.png" },
                  { name: "Gwalior", caption: "Heritage City", image: "/city-gwalior.png" },
                  { name: "Jabalpur", caption: "Smart City", image: "/city-jabalpur.png" },
                ].map((city) => (
                  <div className="mt-city-card" key={city.name}>
                    <div className="mt-city-thumb">
                      <img src={city.image} alt="" aria-hidden="true" />
                    </div>
                    <div><strong>{city.name}</strong><span>{city.caption}</span></div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-lower-grid" id="features">
          <div className="mt-left-stack">
            <div className="mt-stats mt-glass">
              {[
                { value: "14,491+", label: "Field Workers", className: "accent-cyan", icon: <Users size={22} /> },
                { value: "777", label: "Swachh Wards", className: "accent-green", icon: <Trash2 size={22} /> },
                { value: "4", label: "Modules", className: "accent-purple", icon: <Boxes size={22} /> },
                { value: "1", label: "Unified Suite", className: "accent-gold", icon: <ShieldCheck size={22} /> },
              ].map((item) => (
                <div className={`mt-stat ${item.className}`} key={item.label}>
                  <div className="mt-icon-ring">{item.icon}</div>
                  <div><div className="mt-stat-value">{item.value}</div><div className="mt-stat-label">{item.label}</div></div>
                </div>
              ))}
            </div>

            <div className="mt-features mt-glass" id="modules">
              <div className="mt-section-heading">
                <h2>Empowering Clean Cities with Technology &amp; Transparency</h2>
                <div className="mt-heading-line" />
              </div>
              <div className="mt-feature-grid">
                {[
                  { title: "Unified Access", copy: "One login for all municipal solutions", icon: <MapPin size={29} /> },
                  { title: "Smart Monitoring", copy: "Real-time tracking of workforce & activities", icon: <Globe size={29} /> },
                  { title: "Data & Analytics", copy: "Insights that drive better decisions", icon: <BarChart3 size={29} /> },
                  { title: "Transparency", copy: "Building accountability & public trust", icon: <ShieldCheck size={29} /> },
                  { title: "Sustainable Impact", copy: "Healthier cities for a better tomorrow", icon: <Leaf size={29} /> },
                ].map((item) => (
                  <div className="mt-feature" key={item.title}>
                    <div className="mt-feature-icon">{item.icon}</div>
                    <strong>{item.title}</strong>
                    <p>{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-benefits mt-glass" id="resources">
              {[
                { label: "Secure & Unified SSO Access", icon: <ShieldCheck size={21} /> },
                { label: "Role-Based Dashboards", icon: <Users size={21} /> },
                { label: "Real-time Monitoring", icon: <Clock3 size={21} /> },
                { label: "Data-Driven Decision Making", icon: <BarChart3 size={21} /> },
                { label: "Clean Cities Better Tomorrow", icon: <Leaf size={21} /> },
              ].map((item) => <div className="mt-benefit" key={item.label}>{item.icon}<span>{item.label}</span></div>)}
            </div>
          </div>

          <div className="mt-right-stack" id="reports">
            <div className="mt-kpis mt-glass">
              {[
                { value: "14,491+", label: "Field Workers", className: "accent-cyan", icon: <Users size={21} /> },
                { value: "777", label: "Swachh Wards", className: "accent-green", icon: <Trash2 size={21} /> },
                { value: "4", label: "Modules", className: "accent-purple", icon: <Boxes size={21} /> },
                { value: "1", label: "Unified Suite", className: "accent-gold", icon: <ShieldCheck size={21} /> },
              ].map((item) => (
                <div className={`mt-kpi ${item.className}`} key={item.label}>
                  <div className="mt-icon-ring">{item.icon}</div>
                  <div><strong>{item.value}</strong><span>{item.label}</span></div>
                </div>
              ))}
            </div>

            <div className="mt-scene" aria-label="Municipal sanitation workers and green recycling truck at sunset">
              <img
                src="/clean-city-operations-premium.png"
                alt="Municipal sanitation workers cleaning a public space beside a green recycling truck"
                draggable={false}
              />
            </div>
          </div>
        </section>
      </main>

      {isDrawerOpen && (
        <div className="mt-auth-layer">
          <button className="mt-auth-backdrop" type="button" aria-label="Close authentication panel" onClick={() => setIsDrawerOpen(false)} />

          <aside className="mt-drawer" aria-label="Unified SSO authentication">
            <div className="mt-drawer-inner">
              <div>
                <div className="mt-drawer-head">
                  <div className="mt-drawer-brand">
                    <div className="mt-drawer-logo"><ShieldCheck size={20} /></div>
                    <div><strong>MatrixTrack 2.0</strong><small>UNIFIED ENTERPRISE SSO</small></div>
                  </div>
                  <button className="mt-close-btn" type="button" onClick={() => setIsDrawerOpen(false)}><X size={17} /></button>
                </div>

                <div className="mt-auth-tabs">
                  <button type="button" className={`mt-auth-tab ${authMode === 'login' ? 'active' : ''}`} onClick={() => { setAuthMode('login'); setError(""); setRegStatus(""); }}>
                    Sign In (Login)
                  </button>
                  <button type="button" className={`mt-auth-tab ${authMode === 'register' ? 'active' : ''}`} onClick={() => { setAuthMode('register'); setError(""); setRegStatus(""); }}>
                    Create Account
                  </button>
                </div>

                {authMode === 'login' ? (
                  <div>
                    <h2 className="mt-form-title">Sign In</h2>
                    <p className="mt-form-copy">Enter your credentials to access your unified enterprise account.</p>

                    <form onSubmit={otpStep ? handleOtpSubmit : handleLoginSubmit}>
                      {!otpStep && (
                        <>
                          <div className="mt-field">
                            <label className="drawer-label"><Mail size={14} /> Email Address</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gov.in" required className="drawer-input-v4" />
                          </div>
                          <div className="mt-field">
                            <label className="drawer-label"><Lock size={14} /> Password</label>
                            <div style={{ position: "relative" }}>
                              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="........" required className="drawer-input-v4" style={{ paddingRight: 44 }} />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", border: 0, color: "#718475", background: "transparent", cursor: "pointer" }}>
                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {otpStep && (
                        <div className="mt-field">
                          <div className="mt-otp-note">A verification code has been sent to <strong>{otpEmail}</strong>. Enter the 6-digit OTP to complete MatrixTrack login.</div>
                          <label className="drawer-label"><Lock size={14} /> Verification Code</label>
                          <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit OTP" required className="drawer-input-v4" style={{ textAlign: "center", letterSpacing: ".34em", fontSize: 18, fontWeight: 850 }} />
                          <button className="mt-link-btn" type="button" onClick={resetOtpStep} disabled={loading}>Back to email and password</button>
                        </div>
                      )}

                      {error && <div className="mt-alert error">{error}</div>}

                      <button type="submit" disabled={loading} className="btn-submit-v4">
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          {loading ? (otpStep ? "Verifying OTP..." : "Signing In...") : (otpStep ? "Verify OTP & Continue" : "Sign In")}
                          <ArrowRight size={16} />
                        </span>
                      </button>
                    </form>

                    <div className="mt-divider">or continue with</div>
                    <div className="mt-social-row">
                      <button type="button" className="mt-social-btn">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                      </button>
                      <button type="button" className="mt-social-btn">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022" /><rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00" /><rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF" /><rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
                        </svg>
                        Microsoft
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="mt-form-title">Create Account</h2>
                    <p className="mt-form-copy">Fill in your details to request access to the portal.</p>

                    <form onSubmit={handleRegisterSubmit}>
                      <div className="mt-field">
                        <label className="drawer-label"><Hash size={14} /> ULB Code</label>
                        <input type="text" placeholder="e.g. JMC01" value={regForm.ulbCode} onChange={(e) => updateRegForm("ulbCode", e.target.value)} required className="drawer-input-v4" />
                      </div>
                      <div className="mt-field">
                        <label className="drawer-label"><UserPlus size={14} /> Full Name</label>
                        <input type="text" placeholder="John Doe" value={regForm.name} onChange={(e) => updateRegForm("name", e.target.value)} required className="drawer-input-v4" />
                      </div>
                      <div className="mt-field">
                        <label className="drawer-label"><MapPin size={14} /> City</label>
                        <select className="drawer-input-v4" value={regForm.cityId} onChange={(e) => handleCityChange(e.target.value)} required>
                          <option value="">Select City</option>
                          {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                        </select>
                      </div>
                      <div className="mt-field">
                        <label className="drawer-label"><MapPin size={14} /> Zone</label>
                        <select className="drawer-input-v4" value={regForm.zoneId} onChange={(e) => handleZoneChange(e.target.value)} required disabled={!regForm.cityId || loadingGeo}>
                          <option value="">Select Zone</option>
                          {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                        </select>
                      </div>
                      <div className="mt-field">
                        <label className="drawer-label"><MapPin size={14} /> Ward</label>
                        <select className="drawer-input-v4" value={regForm.wardId} onChange={(e) => updateRegForm("wardId", e.target.value)} required disabled={!regForm.zoneId || loadingGeo}>
                          <option value="">Select Ward</option>
                          {wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}
                        </select>
                      </div>
                      <div className="mt-field">
                        <label className="drawer-label"><ShieldCheck size={14} /> Requested Role</label>
                        <select className="drawer-input-v4" value={requestedRole} onChange={(e) => setRequestedRole(e.target.value as UnifiedRegistrationRole)} required>
                          <option value="">Select Role</option>
                          <option value="SUPERVISOR">Supervisor</option>
                          <option value="EMPLOYEE">Employee</option>
                          <option value="QC">Quality Controller</option>
                          <option value="ACTION_OFFICER">Action Officer</option>
                        </select>
                      </div>

                      <div className="mt-field">
                        <label className="drawer-label"><Layers size={14} /> Required Application Access</label>
                        <div className="mt-option-list">
                          {[
                            { key: "TASKFORCE_20", title: "Taskforce 20", description: "Sanitation operations and performance monitoring" },
                            { key: "MATRIX_TRACK", title: "MatrixTrack", description: "Workforce attendance and geo-tracking" },
                            { key: "WARD_RANKING", title: "Ward Ranking", description: "Ward assessment, ranking and QC scorecards" },
                          ].map((portal) => {
                            const portalKey = portal.key as UnifiedPortalKey;
                            const selected = selectedPortals.includes(portalKey);
                            return (
                              <button key={portal.key} type="button" className={`mt-portal-option ${selected ? 'selected' : ''}`} onClick={() => togglePortal(portalKey)}>
                                <div><div className="mt-option-title">{portal.title}</div><div className="mt-option-description">{portal.description}</div></div>
                                <div className="mt-check-box">{selected && <Check size={13} />}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {selectedPortals.includes("TASKFORCE_20") && (
                        <div className="mt-module-box">
                          <label className="drawer-label"><ShieldCheck size={14} /> Select Taskforce Modules</label>
                          <div className="mt-module-grid">
                            {[
                              { key: "TASKFORCE", label: "Taskforce" },
                              { key: "SWEEPING", label: "Sweeping" },
                              { key: "LITTERBINS", label: "Litter Bins" },
                              { key: "TOILET", label: "Toilet" },
                            ].map((module) => {
                              const moduleKey = module.key as UnifiedTaskforceModuleKey;
                              const selected = selectedTaskforceModules.includes(moduleKey);
                              return <button key={module.key} type="button" className={`mt-module-btn ${selected ? 'selected' : ''}`} onClick={() => toggleTaskforceModule(moduleKey)}>{selected ? "OK - " : ""}{module.label}</button>;
                            })}
                          </div>
                        </div>
                      )}

                      <div className="mt-field">
                        <label className="drawer-label"><Mail size={14} /> Email Address</label>
                        <input type="email" placeholder="john@gov.in" value={regForm.email} onChange={(e) => updateRegForm("email", e.target.value)} required className="drawer-input-v4" />
                      </div>
                      <div className="mt-field">
                        <label className="drawer-label"><Phone size={14} /> Phone Number</label>
                        <input type="tel" placeholder="+91 00000 00000" value={regForm.phone} onChange={(e) => updateRegForm("phone", e.target.value)} required className="drawer-input-v4" />
                      </div>
                      <div className="mt-field">
                        <label className="drawer-label"><Hash size={14} /> Aadhar Number</label>
                        <input type="text" placeholder="0000 0000 0000" value={regForm.aadharNumber} onChange={(e) => updateRegForm("aadharNumber", e.target.value)} required className="drawer-input-v4" />
                      </div>
                      <div className="mt-field">
                        <label className="drawer-label"><Lock size={14} /> Password</label>
                        <input type="password" placeholder="........" value={regForm.password} onChange={(e) => updateRegForm("password", e.target.value)} required className="drawer-input-v4" />
                      </div>

                      {regStatus && <div className="mt-alert success" style={{ display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={16} /> {regStatus}</div>}
                      {error && <div className="mt-alert error">{error}</div>}

                      <button type="submit" disabled={loading} className="btn-submit-v4">
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          {loading ? "Submitting Request..." : "Request Unified Access"}<ArrowRight size={16} />
                        </span>
                      </button>
                    </form>
                  </div>
                )}
              </div>

              <div className="mt-drawer-footer">MatrixTrack 2.0 Unified SSO Platform &copy; 2026</div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}