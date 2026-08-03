"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ApiError,
    AuthApi,
    PublicGeoApi,
    type UnifiedPortalKey,
    type UnifiedRegistrationRole,
    type UnifiedTaskforceModuleKey,
} from "@lib/apiClient";
import {
    ArrowRight,
    BarChart3,
    Building2,
    Check,
    ClipboardCheck,
    Lock,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
    UserPlus,
} from "lucide-react";

type FormState = {
    name: string;
    email: string;
    phone: string;
    aadhaar: string;
    password: string;
    cityId: string;
    zoneId: string;
    wardId: string;
    requestedRole: UnifiedRegistrationRole;
};

const INITIAL_FORM: FormState = {
    name: "",
    email: "",
    phone: "",
    aadhaar: "",
    password: "",
    cityId: "",
    zoneId: "",
    wardId: "",
    requestedRole: "SUPERVISOR",
};

const PORTAL_OPTIONS: Array<{
    key: UnifiedPortalKey;
    title: string;
    description: string;
    icon: typeof ShieldCheck;
}> = [
        {
            key: "TASKFORCE_20",
            title: "Taskforce 20",
            description: "Sanitation operations, inspections and field monitoring.",
            icon: ShieldCheck,
        },
        {
            key: "MATRIX_TRACK",
            title: "MatrixTrack",
            description: "Workforce and operational performance management.",
            icon: Building2,
        },
        {
            key: "WARD_RANKING",
            title: "Ward Ranking",
            description: "Ward assessment, scoring and ranking management.",
            icon: BarChart3,
        },
    ];

const TASKFORCE_MODULE_OPTIONS: Array<{
    key: UnifiedTaskforceModuleKey;
    title: string;
    description: string;
}> = [
        {
            key: "TASKFORCE",
            title: "Taskforce Operations",
            description: "Task assignment and workforce monitoring.",
        },
        {
            key: "SWEEPING",
            title: "Sweeping",
            description: "Beat-based road sweeping inspections.",
        },
        {
            key: "LITTERBINS",
            title: "Litter Bin",
            description: "Litter bin inspection and monitoring.",
        },
        {
            key: "TOILET",
            title: "Public Toilet",
            description: "Public toilet cleanliness inspections.",
        },
    ];

const ROLE_OPTIONS: Array<{
    value: UnifiedRegistrationRole;
    label: string;
}> = [
        { value: "SUPERVISOR", label: "Supervisor" },
        { value: "EMPLOYEE", label: "Employee / Road Sweeper" },
        { value: "QC", label: "Quality Control" },
        { value: "ACTION_OFFICER", label: "Action Officer" },
    ];

export default function CreateAccountPage() {
    const [form, setForm] = useState<FormState>(INITIAL_FORM);

    const [requestedPortals, setRequestedPortals] = useState<
        UnifiedPortalKey[]
    >([]);

    const [taskforceModules, setTaskforceModules] = useState<
        UnifiedTaskforceModuleKey[]
    >([]);

    const [cities, setCities] = useState<
        Array<{ id: string; name: string }>
    >([]);

    const [zones, setZones] = useState<
        Array<{ id: string; name: string }>
    >([]);

    const [wards, setWards] = useState<
        Array<{ id: string; name: string }>
    >([]);

    const [loading, setLoading] = useState(false);
    const [loadingCities, setLoadingCities] = useState(true);
    const [loadingZones, setLoadingZones] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);

    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    const hasTaskforceAccess =
        requestedPortals.includes("TASKFORCE_20");

    useEffect(() => {
        const loadCities = async () => {
            try {
                const response = await PublicGeoApi.cities();
                setCities(response.cities || []);
            } catch {
                setError("Unable to load cities. Please refresh the page.");
            } finally {
                setLoadingCities(false);
            }
        };

        void loadCities();
    }, []);

    const updateForm = <K extends keyof FormState>(
        key: K,
        value: FormState[K],
    ) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleCityChange = async (cityId: string) => {
        setForm((current) => ({
            ...current,
            cityId,
            zoneId: "",
            wardId: "",
        }));

        setZones([]);
        setWards([]);
        setError("");

        if (!cityId) {
            return;
        }

        setLoadingZones(true);

        try {
            const response = await PublicGeoApi.zones(cityId);
            setZones(response.zones || []);
        } catch {
            setError("Unable to load zones for the selected city.");
        } finally {
            setLoadingZones(false);
        }
    };

    const handleZoneChange = async (zoneId: string) => {
        setForm((current) => ({
            ...current,
            zoneId,
            wardId: "",
        }));

        setWards([]);
        setError("");

        if (!zoneId) {
            return;
        }

        setLoadingWards(true);

        try {
            const response = await PublicGeoApi.wards(zoneId);
            setWards(response.wards || []);
        } catch {
            setError("Unable to load wards for the selected zone.");
        } finally {
            setLoadingWards(false);
        }
    };

    const togglePortal = (portalKey: UnifiedPortalKey) => {
        setRequestedPortals((current) => {
            const alreadySelected = current.includes(portalKey);

            if (alreadySelected) {
                if (portalKey === "TASKFORCE_20") {
                    setTaskforceModules([]);
                }

                return current.filter((key) => key !== portalKey);
            }

            return [...current, portalKey];
        });

        setError("");
        setStatus("");
    };

    const toggleTaskforceModule = (
        moduleKey: UnifiedTaskforceModuleKey,
    ) => {
        if (!hasTaskforceAccess) {
            return;
        }

        setTaskforceModules((current) =>
            current.includes(moduleKey)
                ? current.filter((key) => key !== moduleKey)
                : [...current, moduleKey],
        );

        setError("");
        setStatus("");
    };

    const resetForm = () => {
        setForm(INITIAL_FORM);
        setRequestedPortals([]);
        setTaskforceModules([]);
        setZones([]);
        setWards([]);
    };

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        setError("");
        setStatus("");

        const normalizedPhone = form.phone.replace(/\D/g, "");
        const normalizedAadhaar = form.aadhaar.replace(/\D/g, "");

        if (!form.cityId || !form.zoneId || !form.wardId) {
            setError("City, zone and ward are required.");
            return;
        }

        if (requestedPortals.length === 0) {
            setError("Select at least one application.");
            return;
        }

        if (
            hasTaskforceAccess &&
            taskforceModules.length === 0
        ) {
            setError(
                "Select at least one Taskforce 20 internal module.",
            );
            return;
        }

        if (normalizedPhone.length < 10) {
            setError("Enter a valid phone number.");
            return;
        }

        if (normalizedAadhaar.length !== 12) {
            setError("Aadhaar number must contain exactly 12 digits.");
            return;
        }

        setLoading(true);

        try {
            const response = await AuthApi.unifiedRegisterRequest({
                name: form.name.trim(),

                email: form.email
                    .trim()
                    .toLowerCase(),

                phone: form.phone.trim(),

                aadhaar: form.aadhaar.trim(),

                password: form.password,

                cityId: form.cityId,
                zoneId: form.zoneId,
                wardId: form.wardId,

                requestedRole: form.requestedRole,

                requestedPortals,

                taskforceModules: requestedPortals.includes(
                    "TASKFORCE_20",
                )

                    ? taskforceModules
                    : [],
            });

            setStatus(
                response.message ||
                "Registration request submitted successfully. The City Admin will review your request.",
            );

            resetForm();
        } catch (err) {
            if (err instanceof ApiError) {
                setError(
                    err.message || "Failed to submit registration request.",
                );
            } else {
                setError("Failed to submit registration request.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="create-account-page">
            <section className="brand-panel">
                <div className="brand-background" />
                <div className="brand-overlay" />

                <div className="brand-content">
                    <div className="brand-logo">
                        <div className="brand-icon">
                            <ShieldCheck size={25} />
                        </div>

                        <div>
                            <div className="brand-name">MatrixTrack 2.0</div>
                            <div className="brand-caption">
                                Unified Urban Management Platform
                            </div>
                        </div>
                    </div>

                    <div className="brand-message">
                        <span className="eyebrow">Unified Registration</span>

                        <h1>
                            One account for all your authorized applications.
                        </h1>

                        <p>
                            Request access to Taskforce 20, MatrixTrack and Ward
                            Ranking through a single registration process.
                        </p>

                        <div className="feature-list">
                            <div className="feature-item">
                                <Check size={16} />
                                Single user account
                            </div>

                            <div className="feature-item">
                                <Check size={16} />
                                Role-based application access
                            </div>

                            <div className="feature-item">
                                <Check size={16} />
                                City Admin approval workflow
                            </div>
                        </div>
                    </div>

                    <div className="system-status">
                        <span className="status-dot" />
                        Registration service is active
                    </div>
                </div>
            </section>

            <section className="form-panel">
                <div className="form-container">
                    <header className="form-header">
                        <span className="form-badge">
                            <UserPlus size={15} />
                            Access Request
                        </span>

                        <h2>Create your account</h2>

                        <p>
                            Enter your details and select the applications you
                            require access to.
                        </p>
                    </header>

                    <form onSubmit={handleSubmit}>
                        <section className="form-section">
                            <div className="section-heading">
                                <span className="section-number">1</span>

                                <div>
                                    <h3>Personal information</h3>
                                    <p>Enter your basic contact and login details.</p>
                                </div>
                            </div>

                            <div className="two-column-grid">
                                <div className="field">
                                    <label htmlFor="full-name">
                                        <UserPlus size={14} />
                                        Full Name
                                    </label>

                                    <input
                                        id="full-name"
                                        className="form-input"
                                        type="text"
                                        placeholder="Enter full name"
                                        value={form.name}
                                        onChange={(event) =>
                                            updateForm("name", event.target.value)
                                        }
                                        autoComplete="name"
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label htmlFor="email">
                                        <Mail size={14} />
                                        Email Address
                                    </label>

                                    <input
                                        id="email"
                                        className="form-input"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={form.email}
                                        onChange={(event) =>
                                            updateForm("email", event.target.value)
                                        }
                                        autoComplete="email"
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label htmlFor="phone">
                                        <Phone size={14} />
                                        Phone Number
                                    </label>

                                    <input
                                        id="phone"
                                        className="form-input"
                                        type="tel"
                                        inputMode="numeric"
                                        placeholder="Enter phone number"
                                        value={form.phone}
                                        onChange={(event) =>
                                            updateForm("phone", event.target.value)
                                        }
                                        autoComplete="tel"
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label htmlFor="aadhaar">
                                        <ClipboardCheck size={14} />
                                        Aadhaar Number
                                    </label>

                                    <input
                                        id="aadhaar"
                                        className="form-input"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={14}
                                        placeholder="Enter 12-digit Aadhaar number"
                                        value={form.aadhaar}
                                        onChange={(event) =>
                                            updateForm("aadhaar", event.target.value)
                                        }
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label htmlFor="password">
                                        <Lock size={14} />
                                        Password
                                    </label>

                                    <input
                                        id="password"
                                        className="form-input"
                                        type="password"
                                        placeholder="Create a secure password"
                                        value={form.password}
                                        onChange={(event) =>
                                            updateForm("password", event.target.value)
                                        }
                                        autoComplete="new-password"
                                        minLength={6}
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label htmlFor="requested-role">
                                        <ShieldCheck size={14} />
                                        Requested Role
                                    </label>

                                    <select
                                        id="requested-role"
                                        className="form-input"
                                        value={form.requestedRole}
                                        onChange={(event) =>
                                            updateForm(
                                                "requestedRole",
                                                event.target.value as UnifiedRegistrationRole,
                                            )
                                        }
                                        required
                                    >
                                        {ROLE_OPTIONS.map((role) => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="form-section">
                            <div className="section-heading">
                                <span className="section-number">2</span>

                                <div>
                                    <h3>Location assignment</h3>
                                    <p>Select the city, zone and ward for your access.</p>
                                </div>
                            </div>

                            <div className="three-column-grid">
                                <div className="field">
                                    <label htmlFor="city">
                                        <MapPin size={14} />
                                        City
                                    </label>

                                    <select
                                        id="city"
                                        className="form-input"
                                        value={form.cityId}
                                        onChange={(event) =>
                                            void handleCityChange(event.target.value)
                                        }
                                        disabled={loadingCities}
                                        required
                                    >
                                        <option value="">
                                            {loadingCities ? "Loading cities..." : "Select city"}
                                        </option>

                                        {cities.map((city) => (
                                            <option key={city.id} value={city.id}>
                                                {city.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="field">
                                    <label htmlFor="zone">
                                        <MapPin size={14} />
                                        Zone
                                    </label>

                                    <select
                                        id="zone"
                                        className="form-input"
                                        value={form.zoneId}
                                        onChange={(event) =>
                                            void handleZoneChange(event.target.value)
                                        }
                                        disabled={!form.cityId || loadingZones}
                                        required
                                    >
                                        <option value="">
                                            {loadingZones ? "Loading zones..." : "Select zone"}
                                        </option>

                                        {zones.map((zone) => (
                                            <option key={zone.id} value={zone.id}>
                                                {zone.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="field">
                                    <label htmlFor="ward">
                                        <MapPin size={14} />
                                        Ward
                                    </label>

                                    <select
                                        id="ward"
                                        className="form-input"
                                        value={form.wardId}
                                        onChange={(event) =>
                                            updateForm("wardId", event.target.value)
                                        }
                                        disabled={!form.zoneId || loadingWards}
                                        required
                                    >
                                        <option value="">
                                            {loadingWards ? "Loading wards..." : "Select ward"}
                                        </option>

                                        {wards.map((ward) => (
                                            <option key={ward.id} value={ward.id}>
                                                {ward.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="form-section">
                            <div className="section-heading">
                                <span className="section-number">3</span>

                                <div>
                                    <h3>Select applications</h3>
                                    <p>
                                        Select one or more applications that you need
                                        access to.
                                    </p>
                                </div>
                            </div>

                            <div className="portal-grid">
                                {PORTAL_OPTIONS.map((portal) => {
                                    const Icon = portal.icon;
                                    const selected = requestedPortals.includes(
                                        portal.key,
                                    );

                                    return (
                                        <button
                                            key={portal.key}
                                            type="button"
                                            className={`selection-card portal-card ${selected ? "selected" : ""
                                                }`}
                                            onClick={() => togglePortal(portal.key)}
                                            aria-pressed={selected}
                                        >
                                            <span className="selection-icon">
                                                <Icon size={22} />
                                            </span>

                                            <span className="selection-copy">
                                                <strong>{portal.title}</strong>
                                                <small>{portal.description}</small>
                                            </span>

                                            <span className="selection-check">
                                                {selected && <Check size={15} />}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section
                            className={`form-section taskforce-section ${hasTaskforceAccess ? "active" : "disabled"
                                }`}
                        >
                            <div className="section-heading">
                                <span className="section-number">4</span>

                                <div>
                                    <h3>Taskforce 20 modules</h3>
                                    <p>
                                        {hasTaskforceAccess
                                            ? "Select the Taskforce 20 modules required for this account."
                                            : "Select Taskforce 20 above to choose its internal modules."}
                                    </p>
                                </div>
                            </div>

                            <div className="module-grid">
                                {TASKFORCE_MODULE_OPTIONS.map((module) => {
                                    const selected =
                                        taskforceModules.includes(module.key);

                                    return (
                                        <button
                                            key={module.key}
                                            type="button"
                                            className={`selection-card module-card ${selected ? "selected" : ""
                                                }`}
                                            onClick={() =>
                                                toggleTaskforceModule(module.key)
                                            }
                                            disabled={!hasTaskforceAccess}
                                            aria-pressed={selected}
                                        >
                                            <span className="selection-copy">
                                                <strong>{module.title}</strong>
                                                <small>{module.description}</small>
                                            </span>

                                            <span className="selection-check">
                                                {selected && <Check size={15} />}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {error && (
                            <div className="form-alert error-alert" role="alert">
                                {error}
                            </div>
                        )}

                        {status && (
                            <div className="form-alert success-alert" role="status">
                                {status}
                            </div>
                        )}

                        <button
                            className="submit-button"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                "Submitting Request..."
                            ) : (
                                <>
                                    Submit Access Request
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="login-link">
                        Already have an account?{" "}
                        <Link href="/unified-login">Sign in</Link>
                    </p>
                </div>
            </section>

            <style>{`
        * {
          box-sizing: border-box;
        }

        .create-account-page {
          width: 100%;
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(320px, 0.72fr) minmax(0, 1.28fr);
          background: #f8fafc;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .brand-panel {
          position: sticky;
          top: 0;
          height: 100vh;
          overflow: hidden;
          background: #0f172a;
        }

        .brand-background,
        .brand-overlay {
          position: absolute;
          inset: 0;
        }

        .brand-background {
          background-image: url("/login-bg.png");
          background-position: center;
          background-size: cover;
        }

        .brand-overlay {
          background:
            radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.32), transparent 38%),
            linear-gradient(155deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.98));
        }

        .brand-content {
          position: relative;
          z-index: 2;
          min-height: 100%;
          padding: 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #ffffff;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-icon {
          width: 48px;
          height: 48px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(14px);
        }

        .brand-name {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .brand-caption {
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
        }

        .brand-message {
          max-width: 440px;
        }

        .eyebrow {
          display: inline-flex;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.18);
          border: 1px solid rgba(147, 197, 253, 0.24);
          color: #bfdbfe;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .brand-message h1 {
          margin: 18px 0 16px;
          max-width: 430px;
          font-size: clamp(32px, 3.2vw, 48px);
          line-height: 1.08;
          letter-spacing: -0.045em;
        }

        .brand-message p {
          margin: 0;
          max-width: 400px;
          color: rgba(255, 255, 255, 0.64);
          font-size: 15px;
          line-height: 1.7;
        }

        .feature-list {
          margin-top: 28px;
          display: grid;
          gap: 12px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 13px;
          font-weight: 600;
        }

        .feature-item svg {
          color: #4ade80;
        }

        .system-status {
          display: flex;
          align-items: center;
          gap: 9px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-weight: 600;
        }

        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 0 5px rgba(74, 222, 128, 0.12);
        }

        .form-panel {
          min-width: 0;
          padding: 56px clamp(28px, 5vw, 76px);
          background:
            radial-gradient(circle at top right, rgba(219, 234, 254, 0.55), transparent 32%),
            #f8fafc;
        }

        .form-container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .form-header {
          margin-bottom: 30px;
        }

        .form-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 800;
        }

        .form-header h2 {
          margin: 14px 0 7px;
          color: #0f172a;
          font-size: clamp(30px, 4vw, 42px);
          line-height: 1.1;
          letter-spacing: -0.045em;
        }

        .form-header p {
          margin: 0;
          color: #64748b;
          font-size: 15px;
        }

        .form-section {
          margin-bottom: 22px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.045);
        }

        .section-heading {
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .section-number {
          flex: 0 0 auto;
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: #eff6ff;
          color: #2563eb;
          font-size: 13px;
          font-weight: 900;
        }

        .section-heading h3 {
          margin: 0;
          color: #0f172a;
          font-size: 16px;
          font-weight: 800;
        }

        .section-heading p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .two-column-grid,
        .three-column-grid,
        .portal-grid,
        .module-grid {
          display: grid;
          gap: 16px;
        }

        .two-column-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .three-column-grid,
        .portal-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .module-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .field label {
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #475569;
          font-size: 12px;
          font-weight: 800;
        }

        .form-input {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          border: 1.5px solid #dbe3ef;
          border-radius: 12px;
          outline: none;
          background: #f8fafc;
          color: #0f172a;
          font-size: 14px;
          transition: 160ms ease;
        }

        .form-input:focus {
          border-color: #3b82f6;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.09);
        }

        .form-input:disabled {
          cursor: not-allowed;
          background: #f1f5f9;
          color: #94a3b8;
        }

        .selection-card {
          position: relative;
          width: 100%;
          min-width: 0;
          padding: 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 15px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #ffffff;
          color: #0f172a;
          text-align: left;
          cursor: pointer;
          transition: 160ms ease;
        }

        .selection-card:hover:not(:disabled) {
          border-color: #93c5fd;
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(37, 99, 235, 0.08);
        }

        .selection-card.selected {
          border-color: #2563eb;
          background: #eff6ff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        .selection-card:disabled {
          cursor: not-allowed;
          opacity: 0.52;
        }

        .selection-icon {
          flex: 0 0 auto;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #f1f5f9;
          color: #334155;
        }

        .selection-card.selected .selection-icon {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .selection-copy {
          min-width: 0;
          display: grid;
          gap: 5px;
        }

        .selection-copy strong {
          color: #0f172a;
          font-size: 13px;
          line-height: 1.3;
        }

        .selection-copy small {
          color: #64748b;
          font-size: 11px;
          line-height: 1.45;
        }

        .selection-check {
          flex: 0 0 auto;
          width: 22px;
          height: 22px;
          margin-left: auto;
          border: 1.5px solid #cbd5e1;
          border-radius: 7px;
          display: grid;
          place-items: center;
          background: #ffffff;
          color: #ffffff;
        }

        .selection-card.selected .selection-check {
          border-color: #2563eb;
          background: #2563eb;
        }

        .taskforce-section.disabled {
          background: #f8fafc;
          box-shadow: none;
        }

        .form-alert {
          margin-bottom: 18px;
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.5;
        }

        .error-alert {
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
        }

        .success-alert {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #166534;
        }

        .submit-button {
          width: 100%;
          height: 54px;
          border: none;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #1d4ed8, #1e3a8a);
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 12px 25px rgba(30, 64, 175, 0.2);
          transition: 160ms ease;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 16px 30px rgba(30, 64, 175, 0.27);
        }

        .submit-button:disabled {
          cursor: not-allowed;
          opacity: 0.62;
        }

        .login-link {
          margin: 22px 0 0;
          color: #64748b;
          text-align: center;
          font-size: 13px;
        }

        .login-link a {
          color: #1d4ed8;
          font-weight: 800;
          text-decoration: none;
        }

        @media (max-width: 1180px) {
          .create-account-page {
            grid-template-columns: 330px minmax(0, 1fr);
          }

          .brand-content {
            padding: 36px 30px;
          }

          .three-column-grid,
          .portal-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .create-account-page {
            display: block;
          }

          .brand-panel {
            position: relative;
            height: auto;
            min-height: 280px;
          }

          .brand-content {
            min-height: 280px;
          }

          .brand-message h1 {
            font-size: 32px;
          }

          .feature-list,
          .system-status {
            display: none;
          }

          .form-panel {
            padding: 38px 22px;
          }
        }

        @media (max-width: 640px) {
          .brand-panel {
            min-height: 220px;
          }

          .brand-content {
            min-height: 220px;
            padding: 26px 22px;
          }

          .brand-message p,
          .brand-caption {
            display: none;
          }

          .brand-message h1 {
            margin-bottom: 0;
            font-size: 27px;
          }

          .form-panel {
            padding: 30px 14px;
          }

          .form-section {
            padding: 18px;
            border-radius: 16px;
          }

          .two-column-grid,
          .module-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </main>
    );
}