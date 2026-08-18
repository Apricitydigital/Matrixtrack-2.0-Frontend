'use client';

import React, { useState, useEffect } from "react";
import {
  CommonRegistrationApi,
  IntegratedRegistrationPayload,
  PublicGeoApi,
  CityModulesApi
} from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import { getUserPermissions } from "@lib/userPermissions";
import {
  X,
  UserPlus,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  Layers,
  ArrowRight,
  UploadCloud,
  Download,
  Trash2,
  RefreshCw,
  Sparkles,
  Lock
} from "lucide-react";

interface CommonRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  asPage?: boolean;
}

export default function CommonRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  asPage
}: CommonRegistrationModalProps) {
  const { user } = useAuth();
  const userPerms = getUserPermissions(user);
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  // Config options from API
  const [config, setConfig] = useState<{
    cities: { id: string; name: string; code: string }[];
    modules: { key: string; name: string }[];
    taskforceRoles: { key: string; label: string }[];
    swachhRoles: { key: string; label: string }[];
    swachhAccessorTypes: { key: string; label: string }[];
  }>({
    cities: [],
    modules: [
      { key: "SWEEPING", name: "Sweeping Beat Management" },
      { key: "LITTERBINS", name: "Litter Bins / Twinbin" },
      { key: "TOILET", name: "Cleanliness of Toilets" },
      { key: "TASKFORCE", name: "CTU / GVP Feeder Points" }
    ],
    taskforceRoles: [
      { key: "SUPERVISOR", label: "Supervisor" },
      { key: "EMPLOYEE", label: "Field Employee" },
      { key: "QC", label: "Quality Controller" },
      { key: "ACTION_OFFICER", label: "Action Officer" }
    ],
    swachhRoles: [
      { key: "accessor", label: "Assessor / Evaluator" },
      { key: "qc", label: "Quality Controller" },
      { key: "admin", label: "System Admin" }
    ],
    swachhAccessorTypes: [
      { key: "hms", label: "HMS (Human Matrix Solutions)" },
      { key: "pmc", label: "PMC (Pune Municipal Corp)" },
      { key: "janwani", label: "Janwani NGO" }
    ]
  });

  // Location cascades
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Single Registration Form State
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    password: string;
    aadharNumber: string;
    cityId: string;
    zoneId: string;
    wardId: string;
    targetSystems: ("TASKFORCE_20" | "SWACHH_RANKING")[];
    taskforceRole: string;
    taskforceModules: string[];
    swachhRole: "accessor" | "qc" | "admin";
    swachhAccessorType: "hms" | "pmc" | "janwani";
  }>({
    name: "",
    email: "",
    phone: "",
    password: "",
    aadharNumber: "",
    cityId: "",
    zoneId: "",
    wardId: "",
    targetSystems: ["TASKFORCE_20", "SWACHH_RANKING"],
    taskforceRole: "SUPERVISOR",
    taskforceModules: ["SWEEPING", "LITTERBINS"],
    swachhRole: "accessor",
    swachhAccessorType: "hms"
  });

  // Bulk Import State
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [parsedEmployees, setParsedEmployees] = useState<IntegratedRegistrationPayload[]>([]);
  const [bulkResults, setBulkResults] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [cityModulesMap, setCityModulesMap] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen, user]);

  const loadConfig = async () => {
    let fetchedCities: { id: string; name: string; code: string }[] = [];
    try {
      const res = await CommonRegistrationApi.getConfig();
      if (res) {
        fetchedCities = res.cities || [];
        setConfig((prev) => ({
          ...prev,
          cities: res.cities || [],
          modules: res.modules?.length ? res.modules : prev.modules,
          taskforceRoles: res.taskforceRoles?.length ? res.taskforceRoles : prev.taskforceRoles,
          swachhRoles: res.swachhRoles?.length ? res.swachhRoles : prev.swachhRoles,
          swachhAccessorTypes: res.swachhAccessorTypes?.length ? res.swachhAccessorTypes : prev.swachhAccessorTypes
        }));
      }
    } catch {
      const fetchGeoConfig = async () => {
        setLoadingGeo(true);
        try {
          let fetchedCities: any[] = [];
          const res = await CommonRegistrationApi.getConfig();
          if (res?.cities) {
            fetchedCities = res.cities.map((c) => ({ id: c.id, name: c.name, code: c.code || "" }));
            setConfig((prev) => ({ ...prev, cities: fetchedCities }));
          }
        } catch {}
      };
      fetchGeoConfig();
    }

    // Auto-select city if user is a CITY_ADMIN and is assigned a city
    if (user && (user.roles?.includes("CITY_ADMIN") || user.role === "CITY_ADMIN")) {
      const assignedCityId = user.cityId || (user.city && user.city.id);
      if (assignedCityId) {
        handleCityChange(assignedCityId);
      }
    }

    try {
      const modulesRes = await CityModulesApi.list();
      if (Array.isArray(modulesRes)) {
        const map: Record<string, boolean> = {};
        modulesRes.forEach((m: any) => {
          if (m.key || m.name) {
            map[String(m.key || m.name).toUpperCase()] = m.enabled !== false;
          }
        });
        setCityModulesMap(map);
      }
    } catch {
      setCityModulesMap(null);
    }
  };

  const isSwachhPermitted =
    userPerms.swachhAccess !== 'RESTRICTED' &&
    (cityModulesMap === null ||
      Boolean(
        cityModulesMap['SWACHH_RANKING'] ||
        cityModulesMap['SWACHH'] ||
        cityModulesMap['WARD_RANKING']
      ));

  const isTaskforcePermitted =
    userPerms.taskforceAccess !== 'RESTRICTED' &&
    (cityModulesMap === null ||
      Boolean(
        cityModulesMap['TASKFORCE'] ||
        cityModulesMap['LITTERBINS'] ||
        cityModulesMap['SWEEPING'] ||
        cityModulesMap['TOILET']
      ));

  useEffect(() => {
    if (!isSwachhPermitted) {
      setForm((f) => ({
        ...f,
        targetSystems: f.targetSystems.filter((s) => s !== "SWACHH_RANKING")
      }));
    }
  }, [isSwachhPermitted]);

  // Derived filtered cities based on user role
  const getFilteredCities = () => {
    if (!user) return config.cities;
    const isCityAdmin = user.roles?.includes("CITY_ADMIN") || user.role === "CITY_ADMIN";
    if (isCityAdmin) {
      const assignedCityId = user.cityId || (user.city && user.city.id);
      if (assignedCityId) {
        return config.cities.filter((c) => c.id === assignedCityId);
      }
    }
    return config.cities;
  };

  const handleCityChange = async (cityId: string) => {
    setForm((f) => ({ ...f, cityId, zoneId: "", wardId: "" }));
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
    setForm((f) => ({ ...f, zoneId, wardId: "" }));
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

  const toggleTargetSystem = (system: "TASKFORCE_20" | "SWACHH_RANKING") => {
    setForm((f) => {
      const current = f.targetSystems;
      let next: ("TASKFORCE_20" | "SWACHH_RANKING")[];
      if (current.includes(system)) {
        if (current.length === 1) return f; // Keep at least one
        next = current.filter((s) => s !== system);
      } else {
        next = [...current, system];
      }
      return { ...f, targetSystems: next };
    });
  };

  const toggleTaskforceModule = (modKey: string) => {
    setForm((f) => {
      const mods = f.taskforceModules;
      const next = mods.includes(modKey) ? mods.filter((m) => m !== modKey) : [...mods, modKey];
      return { ...f, taskforceModules: next };
    });
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setStatusMsg("");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setErrorMsg("Please enter a valid email address (e.g. name@domain.com)");
      return;
    }

    // Validate mobile number (exactly 10 digits)
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setErrorMsg("Mobile number must be exactly 10 digits");
      return;
    }

    // Validate Aadhaar number (exactly 12 digits if provided)
    if (form.aadharNumber) {
      const aadharDigits = form.aadharNumber.replace(/\D/g, "");
      if (aadharDigits.length !== 12) {
        setErrorMsg("Aadhaar number must be exactly 12 digits");
        return;
      }
    }

    setLoading(true);

    try {
      const payload: IntegratedRegistrationPayload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password || undefined,
        aadharNumber: form.aadharNumber || undefined,
        cityId: form.cityId || undefined,
        zoneId: form.zoneId || undefined,
        wardId: form.wardId || undefined,
        targetSystems: form.targetSystems,
        ...(form.targetSystems.includes("TASKFORCE_20")
          ? {
              taskforceConfig: {
                role: form.taskforceRole,
                moduleKeys: form.taskforceModules
              }
            }
          : {}),
        ...(form.targetSystems.includes("SWACHH_RANKING")
          ? {
              swachhConfig: {
                role: form.swachhRole,
                accessorType: form.swachhAccessorType,
                zone: form.zoneId,
                ward: form.wardId
              }
            }
          : {})
      };

      const res = await CommonRegistrationApi.register(payload);
      if (res.success) {
        setStatusMsg(res.message || "User registered successfully!");
        setForm((f) => ({
          ...f,
          name: "",
          email: "",
          phone: "",
          password: "",
          aadharNumber: ""
        }));
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.message || "Registration failed");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit registration");
    } finally {
      setLoading(false);
    }
  };

  // CSV Parsing
  const parseCsvData = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length <= 1) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const records: IntegratedRegistrationPayload[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      if (cols.length < 3) continue;

      const getCol = (name: string) => {
        const idx = headers.indexOf(name);
        return idx !== -1 ? cols[idx] : "";
      };

      const name = getCol("name") || cols[0];
      const email = getCol("email") || cols[1];
      const phone = getCol("phone") || cols[2];
      const password = getCol("password") || "Matrix@2026";
      const systemsStr = getCol("targetsystems") || getCol("systems") || "BOTH";

      let targetSystems: ("TASKFORCE_20" | "SWACHH_RANKING")[] = ["TASKFORCE_20", "SWACHH_RANKING"];
      if (systemsStr.toUpperCase() === "TASKFORCE" || systemsStr.toUpperCase() === "TASKFORCE_20") {
        targetSystems = ["TASKFORCE_20"];
      } else if (systemsStr.toUpperCase() === "SWACHH" || systemsStr.toUpperCase() === "SWACHH_RANKING") {
        targetSystems = ["SWACHH_RANKING"];
      }

      const tfRole = getCol("taskforcerole") || "SUPERVISOR";
      const modulesStr = getCol("modules") || "SWEEPING,LITTERBINS";
      const moduleKeys = modulesStr.split(";").map((m) => m.trim()).filter(Boolean);

      const swachhRole = (getCol("swachhrole") || "accessor") as "accessor" | "qc" | "admin";
      const swachhAccessorType = (getCol("accessortype") || "hms") as "hms" | "pmc" | "janwani";

      if (name && email && phone) {
        records.push({
          name,
          email,
          phone,
          password,
          targetSystems,
          cityId: form.cityId || undefined,
          zoneId: form.zoneId || undefined,
          wardId: form.wardId || undefined,
          taskforceConfig: {
            role: tfRole,
            moduleKeys
          },
          swachhConfig: {
            role: swachhRole,
            accessorType: swachhAccessorType
          }
        });
      }
    }
    return records;
  };

  const handleBulkTextChange = (text: string) => {
    setBulkCsvText(text);
    const parsed = parseCsvData(text);
    setParsedEmployees(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      handleBulkTextChange(content);
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async () => {
    if (!parsedEmployees.length) {
      setErrorMsg("Please upload or enter valid CSV employee records first");
      return;
    }
    setErrorMsg("");
    setStatusMsg("");
    setLoading(true);

    try {
      const res = await CommonRegistrationApi.bulkImport(parsedEmployees);
      setBulkResults(res);
      setStatusMsg(`Bulk import completed: ${res.successCount} succeeded, ${res.failCount} failed.`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to execute bulk import");
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCsv = () => {
    const sample = `name,email,phone,password,targetSystems,taskforceRole,modules,swachhRole,accessorType\nRahul Sharma,rahul.sharma@example.com,9876543210,Pass@1234,BOTH,SUPERVISOR,SWEEPING;LITTERBINS,accessor,hms\nPriya Patel,priya.patel@example.com,9812345678,Pass@1234,TASKFORCE_20,EMPLOYEE,TOILET,, \nAmit Kumar,amit.kumar@example.com,9765432109,Pass@1234,SWACHH_RANKING,,,accessor,pmc`;
    const blob = new Blob([sample], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "integrated_employee_registration_sample.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen && !asPage) return null;

  return (
    <div
      style={
        asPage
          ? {
              display: "flex",
              justifyContent: "center",
              padding: "0",
              width: "100%"
            }
          : {
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px"
            }
      }
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          maxWidth: asPage ? "100%" : "840px",
          width: "100%",
          maxHeight: asPage ? "none" : "90vh",
          overflowY: asPage ? "visible" : "auto",
          boxShadow: asPage ? "0 4px 24px -8px rgba(0, 0, 0, 0.08)" : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* Header */}
        {!asPage && (
          <div
            style={{
              padding: "24px 32px",
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              color: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)"
                }}
              >
                <Sparkles size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em" }}>
                  Integrated User Registration
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#94a3b8" }}>
                  Register users simultaneously for Inspection and performance system and ward ranking system
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "#fff",
                width: 36,
                height: 36,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div style={{ padding: "28px 32px", maxWidth: "920px", margin: "0 auto" }}>
          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: "flex",
              background: "#f1f5f9",
              padding: "4px",
              borderRadius: "14px",
              marginBottom: "24px",
              gap: "4px"
            }}
          >
            <button
              onClick={() => setActiveTab("single")}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: activeTab === "single" ? "#ffffff" : "transparent",
                color: activeTab === "single" ? "#0f172a" : "#64748b",
                boxShadow: activeTab === "single" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s"
              }}
            >
              <UserPlus size={16} /> Single User Registration
            </button>
            <button
              onClick={() => setActiveTab("bulk")}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: activeTab === "bulk" ? "#ffffff" : "transparent",
                color: activeTab === "bulk" ? "#0f172a" : "#64748b",
                boxShadow: activeTab === "bulk" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s"
              }}
            >
              <FileSpreadsheet size={16} /> Bulk Import (CSV / Excel)
            </button>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                background: "#fef2f2",
                border: "1px solid #fecdd3",
                color: "#991b1b",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <AlertCircle size={18} /> {errorMsg}
            </div>
          )}

          {statusMsg && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "12px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <CheckCircle2 size={18} /> {statusMsg}
            </div>
          )}

          {/* TAB 1: SINGLE EMPLOYEE FORM */}
          {activeTab === "single" && (
            <form onSubmit={handleSingleSubmit}>
              {/* Target Systems Selection */}
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em"
                  }}
                >
                  Permitted Workspace Modules
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {/* Taskforce 2.0 Card */}
                  {isTaskforcePermitted ? (
                    <div
                      onClick={() => toggleTargetSystem("TASKFORCE_20")}
                      style={{
                        padding: "16px",
                        borderRadius: "16px",
                        border: form.targetSystems.includes("TASKFORCE_20")
                          ? "2px solid #3b82f6"
                          : "1.5px solid #e2e8f0",
                        background: form.targetSystems.includes("TASKFORCE_20") ? "#eff6ff" : "#f8fafc",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        gap: "12px",
                        alignItems: "flex-start"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.targetSystems.includes("TASKFORCE_20")}
                        onChange={() => {}}
                        style={{ marginTop: "3px", accentColor: "#2563eb" }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "15px", color: "#1e3a8a", display: "flex", alignItems: "center", gap: "6px" }}>
                          <ShieldCheck size={16} /> Inspection and performance system 
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                          Assign to Inspection and performance System's module - litterbin , sweeping , and toilets.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "16px",
                        border: "1.5px dashed #cbd5e1",
                        background: "#f1f5f9",
                        opacity: 0.65,
                        cursor: "not-allowed",
                        display: "flex",
                        gap: "12px",
                        alignItems: "flex-start"
                      }}
                    >
                      <Lock size={16} style={{ marginTop: "3px", color: "#64748b" }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "15px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                          Taskforce 2.0 (Restricted)
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8", lineHeight: 1.4 }}>
                          Module not assigned/enabled for this city cluster by Super Admin
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Swachh Ranking Card */}
                  {isSwachhPermitted ? (
                    <div
                      onClick={() => toggleTargetSystem("SWACHH_RANKING")}
                      style={{
                        padding: "16px",
                        borderRadius: "16px",
                        border: form.targetSystems.includes("SWACHH_RANKING")
                          ? "2px solid #10b981"
                          : "1.5px solid #e2e8f0",
                        background: form.targetSystems.includes("SWACHH_RANKING") ? "#ecfdf5" : "#f8fafc",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        gap: "12px",
                        alignItems: "flex-start"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.targetSystems.includes("SWACHH_RANKING")}
                        onChange={() => {}}
                        style={{ marginTop: "3px", accentColor: "#059669" }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "15px", color: "#065f46", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Building2 size={16} /> Swachh Ranking Software
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                          Auto-sync user account as Assessor / Evaluator in Swachh Ward Ranking
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "16px",
                        border: "1.5px dashed #cbd5e1",
                        background: "#f1f5f9",
                        opacity: 0.65,
                        cursor: "not-allowed",
                        display: "flex",
                        gap: "12px",
                        alignItems: "flex-start"
                      }}
                    >
                      <Lock size={16} style={{ marginTop: "3px", color: "#64748b" }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "15px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                          Swachh Ranking (Restricted)
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8", lineHeight: 1.4 }}>
                          Module not assigned/enabled for this city cluster by Super Admin
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Details Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@gov.in"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Contact & Password Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="text"
                    placeholder="10-digit Mobile Number"
                    maxLength={10}
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm({ ...form, phone: val });
                    }}
                  />
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    placeholder="Default: Matrix@2026"
                    className="form-input"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Aadhaar Number</label>
                  <input
                    type="text"
                    placeholder="12-digit Aadhaar Number"
                    maxLength={12}
                    className="form-input"
                    value={form.aadharNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 12);
                      setForm({ ...form, aadharNumber: val });
                    }}
                  />
                </div>
              </div>

              {/* City / Location Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div>
                  <label className="form-label">City</label>
                  <select
                    className="form-input"
                    value={form.cityId}
                    onChange={(e) => handleCityChange(e.target.value)}
                  >
                    <option value="">Select City</option>
                    {getFilteredCities().map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Zone</label>
                  <select
                    className="form-input"
                    disabled={!form.cityId || loadingGeo}
                    value={form.zoneId}
                    onChange={(e) => handleZoneChange(e.target.value)}
                  >
                    <option value="">Select Zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Ward</label>
                  <select
                    className="form-input"
                    disabled={!form.zoneId || loadingGeo}
                    value={form.wardId}
                    onChange={(e) => setForm({ ...form, wardId: e.target.value })}
                  >
                    <option value="">Select Ward</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TASKFORCE 20 CONFIG SECTION */}
              {form.targetSystems.includes("TASKFORCE_20") && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "24px",
                    marginBottom: "24px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                  }}
                >
                  <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 800, color: "#1e3a8a", display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldCheck size={18} /> Inspection and Performance System Modules
                  </h4>
                  <div style={{ marginBottom: "16px" }}>
                    <label className="form-label">Select Role</label>
                    <select
                      className="form-input"
                      value={form.taskforceRole}
                      onChange={(e) => setForm({ ...form, taskforceRole: e.target.value })}
                    >
                      {config.taskforceRoles
                        /* Field Employee option commented out/hidden from UI dropdown */
                        .filter((r) => r.key !== "EMPLOYEE")
                        .map((r) => {
                          let labelText = r.label;
                          if (r.key === "QC" || String(r.label).toLowerCase().includes("qc inspector")) {
                            labelText = "Quality Controller";
                          }
                          return (
                            <option key={r.key} value={r.key}>
                              {labelText}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ marginBottom: "12px" }}>Select Module</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                      {config.modules
                        .filter((m) => {
                          const nameLower = (m.name || "").toLowerCase();
                          return (
                            !nameLower.includes("swachh ward ranking system") &&
                            !nameLower.includes("workforce monitoring") &&
                            !nameLower.includes("processing & mrf") &&
                            !nameLower.includes("processing and mrf")
                          );
                        })
                        .map((m) => {
                          const isSelected = form.taskforceModules.includes(m.key);
                          
                          let displayName = m.name;
                          const nameUpper = String(m.name || '').toUpperCase();
                          if (nameUpper.includes("SWEEPING")) displayName = "Sweeping";
                          if (nameUpper.includes("LITTER")) displayName = "Litter Bins";
                          if (nameUpper.includes("TOILET")) displayName = "Cleanliness of Toilets";
                          if (nameUpper.includes("TASKFORCE") || nameUpper.includes("CTU") || nameUpper.includes("GVP")) displayName = "GVP";

                          return (
                            <button
                              type="button"
                              key={m.key}
                              onClick={() => toggleTaskforceModule(m.key)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 12px",
                                borderRadius: "12px",
                                border: isSelected ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
                                backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                                color: isSelected ? "#1d4ed8" : "#475569",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.15s",
                                textAlign: "left"
                              }}
                            >
                              <span>{displayName}</span>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                style={{ accentColor: "#2563eb", width: "13px", height: "13px", cursor: "pointer", pointerEvents: "none" }}
                              />
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {/* SWACHH RANKING CONFIG SECTION */}
              {form.targetSystems.includes("SWACHH_RANKING") && (
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #dcfce7",
                    borderRadius: "16px",
                    padding: "24px",
                    marginBottom: "24px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                  }}
                >
                  <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 800, color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Building2 size={18} /> Swachh Ranking Assignment Details
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label className="form-label">Swachh Role</label>
                      <select
                        className="form-input"
                        value={form.swachhRole}
                        onChange={(e) =>
                          setForm({ ...form, swachhRole: e.target.value as any })
                        }
                      >
                        {config.swachhRoles.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Accessor Category / Agency</label>
                      <select
                        className="form-input"
                        value={form.swachhAccessorType}
                        onChange={(e) =>
                          setForm({ ...form, swachhAccessorType: e.target.value as any })
                        }
                      >
                        {config.swachhAccessorTypes.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  height: "50px",
                  background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                  transition: "all 0.2s"
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} /> Processing Registration...
                  </>
                ) : (
                  <>
                    Register User Across Selected Modules <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: BULK IMPORT */}
          {activeTab === "bulk" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px"
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                    Bulk Employee CSV Import
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>
                    Upload or paste CSV with multiple employees to register at once.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  style={{
                    padding: "8px 14px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Download size={14} /> Download Sample CSV
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: "16px",
                  padding: "24px",
                  textAlign: "center",
                  background: "#f8fafc",
                  marginBottom: "20px"
                }}
              >
                <UploadCloud size={36} style={{ color: "#3b82f6", marginBottom: "8px" }} />
                <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>
                  Upload CSV File or Paste Data Below
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                  id="csv-file-input"
                />
                <label
                  htmlFor="csv-file-input"
                  style={{
                    padding: "8px 16px",
                    background: "#2563eb",
                    color: "#fff",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-block"
                  }}
                >
                  Browse CSV File
                </label>
              </div>

              {/* CSV Text Area */}
              <div style={{ marginBottom: "20px" }}>
                <label className="form-label">CSV Text Data</label>
                <textarea
                  rows={5}
                  className="form-input"
                  style={{ fontFamily: "monospace", fontSize: "12px", height: "auto" }}
                  placeholder="name,email,phone,password,targetSystems,taskforceRole,modules,swachhRole,accessorType..."
                  value={bulkCsvText}
                  onChange={(e) => handleBulkTextChange(e.target.value)}
                />
              </div>

              {/* Preview Table */}
              {parsedEmployees.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                      Preview Parsed Records ({parsedEmployees.length} valid)
                    </span>
                    <button
                      onClick={() => {
                        setBulkCsvText("");
                        setParsedEmployees([]);
                      }}
                      style={{ background: "none", border: "none", color: "#ef4444", fontSize: "12px", cursor: "pointer", fontWeight: 700 }}
                    >
                      Clear
                    </button>
                  </div>
                  <div
                    style={{
                      maxHeight: "180px",
                      overflowY: "auto",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px"
                    }}
                  >
                    <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                      <thead style={{ background: "#f1f5f9", textAlign: "left" }}>
                        <tr>
                          <th style={{ padding: "8px 12px" }}>#</th>
                          <th style={{ padding: "8px 12px" }}>Name</th>
                          <th style={{ padding: "8px 12px" }}>Email</th>
                          <th style={{ padding: "8px 12px" }}>Phone</th>
                          <th style={{ padding: "8px 12px" }}>Target Systems</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedEmployees.map((emp, idx) => (
                          <tr key={idx} style={{ borderTop: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{idx + 1}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 700 }}>{emp.name}</td>
                            <td style={{ padding: "8px 12px" }}>{emp.email}</td>
                            <td style={{ padding: "8px 12px" }}>{emp.phone}</td>
                            <td style={{ padding: "8px 12px" }}>
                              {emp.targetSystems.join(" & ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Submit Bulk Import */}
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={loading || !parsedEmployees.length}
                style={{
                  width: "100%",
                  height: "50px",
                  background: parsedEmployees.length
                    ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
                    : "#cbd5e1",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  fontSize: "16px",
                  fontWeight: 700,
                  cursor: parsedEmployees.length ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  boxShadow: parsedEmployees.length ? "0 4px 14px rgba(16, 185, 129, 0.3)" : "none",
                  transition: "all 0.2s"
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} /> Executing Bulk Import...
                  </>
                ) : (
                  <>
                    Import {parsedEmployees.length} Employees Now <FileSpreadsheet size={18} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
        }
        .form-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .form-input:focus {
          background: #ffffff;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}
