'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Filter,
  Globe,
  Layers,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Shield,
  Target,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { ApiError, CityApi, ModuleApi } from "@lib/apiClient";
import { useToast } from "@components/ui/ToastProvider";
import { Card } from "@components/ui/Card";
import { Button } from "@components/ui/Button";
import { Badge } from "@components/ui/Badge";
import { Modal } from "@components/ui/Modal";
import { ConfirmDialog } from "@components/ui/ConfirmDialog";
import { SkeletonCard } from "@components/ui/Skeleton";
import { FormField } from "@components/ui/FormField";
import type { CityAdminInfo, CityMasterNode, CityRow, MasterNode } from "../../types/api";
import { TrendAreaChart, DonutChart, ChartLegend } from "@components/ui/Charts";
import { Sparkline } from "@components/ui/Sparkline";

type CityCreateInput = {
  stateId: string;
  divisionId: string;
  districtId: string;
  cityMasterId: string;
  code: string;
  ulbCode: string;
};

type CityUpdateInput = {
  stateId?: string;
  divisionId?: string;
  districtId?: string;
  cityMasterId?: string;
  name?: string;
  code: string;
  ulbCode: string;
  adminName?: string;
  adminEmail?: string;
};

export default function HmsDashboardPage() {
  const { showToast } = useToast();
  const [cities, setCities] = useState<CityRow[]>([]);
  const [states, setStates] = useState<MasterNode[]>([]);
  const [divisions, setDivisions] = useState<MasterNode[]>([]);
  const [districts, setDistricts] = useState<MasterNode[]>([]);
  const [masterCities, setMasterCities] = useState<CityMasterNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCity, setEditingCity] = useState<CityRow | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<{ cityId: string; cityName: string; admin: CityAdminInfo } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ cityId: string; userId: string; adminName: string } | null>(null);
  const [createCityOpen, setCreateCityOpen] = useState(false);
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "dormant" | "managed" | "unmanaged">("all");
  const [tablePage, setTablePage] = useState(1);

  const [stateId, setStateId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityMasterId, setCityMasterId] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [cityUlbCode, setCityUlbCode] = useState("");
  const [cityModules, setCityModules] = useState<{
    taskforce: boolean;
    swachh: boolean;
    workforce: boolean;
    mrf: boolean;
  }>({
    taskforce: true,
    swachh: true,
    workforce: true,
    mrf: true
  });
  const [cityStatus, setCityStatus] = useState("");
  const [cityCreating, setCityCreating] = useState(false);

  const [adminCityId, setAdminCityId] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const [adminCreating, setAdminCreating] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const cityRes = await CityApi.list();
      setCities(cityRes.cities);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadStates = async () => {
    try {
      setMasterLoading(true);
      const res = await CityApi.listStates();
      setStates(res.states);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load states");
    } finally {
      setMasterLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    loadStates();
  }, []);

  useEffect(() => {
    setTablePage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (!stateId) {
      setDivisions([]); setDivisionId("");
      setDistricts([]); setDistrictId("");
      setMasterCities([]); setCityMasterId("");
      return;
    }
    let active = true;
    setMasterLoading(true);
    CityApi.listDivisions(stateId)
      .then((res) => {
        if (!active) return;
        setDivisions(res.divisions);
        setDivisionId(""); setDistricts([]); setDistrictId("");
        setMasterCities([]); setCityMasterId("");
      })
      .catch((err) => { if (active) setError(err instanceof ApiError ? err.message : "Failed to load divisions"); })
      .finally(() => { if (active) setMasterLoading(false); });
    return () => { active = false; };
  }, [stateId]);

  useEffect(() => {
    if (!stateId || !divisionId) {
      setDistricts([]); setDistrictId("");
      setMasterCities([]); setCityMasterId("");
      return;
    }
    let active = true;
    setMasterLoading(true);
    CityApi.listDistricts(stateId, divisionId)
      .then((res) => {
        if (!active) return;
        setDistricts(res.districts);
        setDistrictId(""); setMasterCities([]); setCityMasterId("");
      })
      .catch((err) => { if (active) setError(err instanceof ApiError ? err.message : "Failed to load districts"); })
      .finally(() => { if (active) setMasterLoading(false); });
    return () => { active = false; };
  }, [stateId, divisionId]);

  useEffect(() => {
    if (!districtId) {
      setMasterCities([]); setCityMasterId("");
      return;
    }
    let active = true;
    setMasterLoading(true);
    CityApi.listCities(districtId)
      .then((res) => {
        if (!active) return;
        setMasterCities(res.cities);
        setCityMasterId("");
      })
      .catch((err) => { if (active) setError(err instanceof ApiError ? err.message : "Failed to load cities"); })
      .finally(() => { if (active) setMasterLoading(false); });
    return () => { active = false; };
  }, [districtId]);

  useEffect(() => {
    const selectedCity = masterCities.find((city) => city.id === cityMasterId);
    if (!selectedCity) return;
    if (!cityCode) setCityCode(selectedCity.code.toLowerCase());
    if (!cityUlbCode) setCityUlbCode(selectedCity.code.toLowerCase());
  }, [cityMasterId, masterCities, cityCode, cityUlbCode]);

  const resetCityForm = () => {
    setStateId(""); setDivisionId(""); setDistrictId(""); setCityMasterId("");
    setDivisions([]); setDistricts([]); setMasterCities([]);
    setCityCode(""); setCityUlbCode(""); setCityStatus("");
  };

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCityCreating(true);
    setCityStatus("Creating...");
    try {
      const payload: CityCreateInput = {
        stateId, divisionId, districtId, cityMasterId,
        code: cityCode, ulbCode: cityUlbCode || cityCode
      };
      const res: any = await CityApi.create(payload);

      if (res?.city?.id) {
        const sysModulesRes = await ModuleApi.list().catch(() => ({ modules: [] }));
        const sysModules = sysModulesRes.modules || [];
        for (const mod of sysModules) {
          const modName = mod.name.toUpperCase();
          let isEnabled = true;
          if (["TASKFORCE", "TOILET", "SWEEPING", "LITTERBINS"].includes(modName)) {
            isEnabled = cityModules.taskforce;
          } else if (modName === "SWACHH_RANKING" || modName === "SWACHH") {
            isEnabled = cityModules.swachh;
          } else if (modName === "WORKFORCE_MONITORING" || modName === "WORKFORCE") {
            isEnabled = cityModules.workforce;
          } else if (modName === "MRF") {
            isEnabled = cityModules.mrf;
          }

          if (!isEnabled) {
            await CityApi.toggleModule(res.city.id, mod.id, false).catch(() => {});
          }
        }
      }

      showToast({ title: "City created", description: "New city cluster deployed successfully.", tone: "success" });
      resetCityForm();
      setCreateCityOpen(false);
      await refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create city.";
      setCityStatus(message);
      showToast({ title: "City creation failed", description: message, tone: "error" });
    } finally {
      setCityCreating(false);
    }
  };

  const handleToggleCity = async (cityId: string, enabled: boolean) => {
    try {
      await CityApi.setEnabled(cityId, enabled);
      setCities((prev) => prev.map((c) => (c.id === cityId ? { ...c, enabled } : c)));
    } catch (err) {
      showToast({
        title: "City status update failed",
        description: err instanceof ApiError ? err.message : "Failed to toggle city.",
        tone: "error"
      });
    }
  };

  const handleUpdateCity = async (cityId: string, data: CityUpdateInput) => {
    try {
      await CityApi.update(cityId, data);
      await refresh();
      setEditingCity(null);
      showToast({ title: "City updated", description: "Cluster details saved.", tone: "success" });
    } catch (err) {
      showToast({
        title: "City update failed",
        description: err instanceof ApiError ? err.message : "Failed to update city.",
        tone: "error"
      });
    }
  };

  const handleUpdateAdmin = async (cityId: string, userId: string, data: { name?: string; email?: string; password?: string }) => {
    try {
      await CityApi.updateCityAdmin(cityId, userId, data);
      await refresh();
      setEditingAdmin(null);
      showToast({ title: "Admin updated", description: "City admin details saved.", tone: "success" });
    } catch (err) {
      showToast({
        title: "Admin update failed",
        description: err instanceof ApiError ? err.message : "Failed to update city admin.",
        tone: "error"
      });
    }
  };

  const handleDeleteAdmin = (cityId: string, userId: string, adminName: string) => {
    setDeleteTarget({ cityId, userId, adminName });
  };

  const confirmDeleteAdmin = async () => {
    if (!deleteTarget) return;
    try {
      await CityApi.removeCityAdmin(deleteTarget.cityId, deleteTarget.userId);
      await refresh();
      showToast({ title: "Admin removed", description: `${deleteTarget.adminName} was removed from the city.`, tone: "success" });
      setDeleteTarget(null);
    } catch (err) {
      showToast({
        title: "Admin deletion failed",
        description: err instanceof ApiError ? err.message : "Failed to delete city admin.",
        tone: "error"
      });
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCreating(true);
    setAdminStatus("Creating...");
    try {
      await CityApi.createCityAdmin(adminCityId, { email: adminEmail, password: adminPassword, name: adminName });
      showToast({ title: "Admin created", description: "City administrator provisioned successfully.", tone: "success" });
      setAdminName(""); setAdminEmail(""); setAdminPassword(""); setAdminCityId("");
      setCreateAdminOpen(false);
      await refresh();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create city admin.";
      setAdminStatus(message);
      showToast({ title: "Admin creation failed", description: message, tone: "error" });
    } finally {
      setAdminCreating(false);
    }
  };

  const totalCities = cities.length;
  const activeCities = cities.filter((c) => c.enabled).length;
  const managedCities = cities.filter((c) => (c.cityAdmins?.length ?? 0) > 0).length;
  const totalUlbs = new Set(cities.map((c) => c.ulbCode).filter(Boolean)).size;

  const unmanagedCities = totalCities - managedCities;
  const totalAdmins = cities.reduce(
    (sum, city) => sum + ((city.cityAdmins?.length ?? 0) || (city.cityAdmin ? 1 : 0)),
    0
  );
  const hierarchyReadyCities = cities.filter(
    (city) => city.state?.name && city.division?.name && city.district?.name
  ).length;
  const coverageRate = totalCities ? Math.round((activeCities / totalCities) * 100) : 0;
  const adminRate = totalCities ? Math.round((managedCities / totalCities) * 100) : 0;
  const hierarchyRate = totalCities ? Math.round((hierarchyReadyCities / totalCities) * 100) : 0;

  // ── PLACEHOLDER SPARKLINES (BACKEND: GET /hms/stats/kpi-trends) ──
  const spark = {
    cities: [3, 4, 4, 5, 6, 6, 7, 7],
    active: [2, 3, 3, 4, 5, 5, 6, 7],
    admins: [1, 2, 3, 3, 4, 5, 5, 6],
    ulbs: [2, 3, 4, 4, 5, 6, 6, 7],
    dormant: [1, 1, 2, 2, 1, 1, 0, 0],
    unmanaged: [5, 4, 4, 3, 2, 2, 1, 1],
  };

  const kpiCards = [
    {
      label: "Total Cities",
      value: totalCities,
      delta: `${activeCities} currently live`,
      up: true,
      color: "#2563eb",
      data: spark.cities,
      icon: <Globe size={16} />,
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      label: "Live Cities",
      value: activeCities,
      delta: `${coverageRate}% operational`,
      up: true,
      color: "#10b981",
      data: spark.active,
      icon: <Activity size={16} />,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "City Admins",
      value: totalAdmins,
      delta: `${managedCities} covered cities`,
      up: true,
      color: "#8b5cf6",
      data: spark.admins,
      icon: <Users size={16} />,
      iconClass: "bg-violet-50 text-violet-600",
    },
    {
      label: "Unique ULBs",
      value: totalUlbs,
      delta: `${hierarchyRate}% hierarchy ready`,
      up: true,
      color: "#06b6d4",
      data: spark.ulbs,
      icon: <Target size={16} />,
      iconClass: "bg-cyan-50 text-cyan-600",
    },
    {
      label: "Dormant Cities",
      value: totalCities - activeCities,
      delta: totalCities - activeCities > 0 ? "review required" : "all live",
      up: false,
      color: "#f59e0b",
      data: spark.dormant,
      icon: <Clock size={16} />,
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      label: "Needs Admin",
      value: unmanagedCities,
      delta: unmanagedCities > 0 ? "action required" : "all covered",
      up: false,
      color: "#ef4444",
      data: spark.unmanaged,
      icon: <AlertCircle size={16} />,
      iconClass: "bg-rose-50 text-rose-600",
    },
  ];

  const statusSplit = [
    { label: "Live", value: activeCities },
    { label: "Dormant", value: totalCities - activeCities },
  ];
  const adminDonut = [
    { label: "Managed", value: managedCities },
    { label: "Unmanaged", value: unmanagedCities },
  ];
  const trendData = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => ({
    label: m, value: Math.max(1, Math.round((totalCities / 6) * (i + 1))),
  }));

  // ── Zone-performance analog: top cities by hierarchy completeness ──
  const topCities = [...cities]
    .map((c) => {
      const filled = [c.state?.name, c.division?.name, c.district?.name].filter(Boolean).length;
      return { name: c.name, pct: Math.round((filled / 3) * 100) };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  // ── PLACEHOLDER FEEDS (BACKEND specs below) ──
  const notifications = cities.slice(0, 4).map((c, i) => ({
    id: c.id,
    title: (c.cityAdmins?.length ?? 0) || c.cityAdmin ? `${c.name} admin active` : `${c.name} needs an admin`,
    meta: c.enabled ? "Site live" : "Site dormant",
    time: ["10 min ago", "25 min ago", "1 hour ago", "2 hours ago"][i] || "recently",
    tone: (c.cityAdmins?.length ?? 0) || c.cityAdmin ? "success" : "warning",
  }));

  const recentActivity = cities.slice(0, 4).map((c, i) => ({
    id: c.id,
    action: c.enabled ? "City set live" : "City provisioned",
    type: c.enabled ? "Status" : "Onboard",
    location: `${c.state?.name || "—"} · ${c.code}`,
    by: c.cityAdmin?.name || (c.cityAdmins?.[0]?.name ?? "System"),
    time: ["10 min ago", "25 min ago", "1 hour ago", "2 hours ago"][i] || "recently",
  }));




  const filteredCities = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return cities.filter((city) => {
      const adminNames = [
        ...(city.cityAdmins ?? []).flatMap((admin) => [admin.name, admin.email]),
        city.cityAdmin?.name,
        city.cityAdmin?.email,
      ]
        .filter(Boolean)
        .join(" ");

      const searchableValue = [
        city.name,
        city.code,
        city.ulbCode,
        city.state?.name,
        city.division?.name,
        city.district?.name,
        adminNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const hasAdmin = Boolean((city.cityAdmins?.length ?? 0) || city.cityAdmin);
      const matchesQuery = !normalizedQuery || searchableValue.includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "live" && city.enabled) ||
        (statusFilter === "dormant" && !city.enabled) ||
        (statusFilter === "managed" && hasAdmin) ||
        (statusFilter === "unmanaged" && !hasAdmin);

      return matchesQuery && matchesStatus;
    });
  }, [cities, searchQuery, statusFilter]);

  const tablePageSize = 6;
  const tablePageCount = Math.max(1, Math.ceil(filteredCities.length / tablePageSize));
  const safeTablePage = Math.min(tablePage, tablePageCount);
  const visibleCities = filteredCities.slice(
    (safeTablePage - 1) * tablePageSize,
    safeTablePage * tablePageSize
  );

  const attentionCities = cities.filter(
    (city) => !((city.cityAdmins?.length ?? 0) || city.cityAdmin)
  );

  const hierarchyIssues = cities.filter(
    (city) => !city.state?.name || !city.division?.name || !city.district?.name
  );

  const selectClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 transition-all duration-200 focus:border-blue-500/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60";
  const inputClass = selectClass;

  return (
    <div className="min-w-0 space-y-5 pb-10">
      {error && (
        <div className="animate-slide-up rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      {/* Ultra-compact premium welcome and command header */}
      <section className="relative overflow-hidden rounded-[24px] border border-blue-200/70 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.52)]">
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

        {/* Compact background decoration */}
        <div className="pointer-events-none absolute -right-20 -top-28 h-56 w-56 rounded-full bg-blue-100/55 blur-3xl" />
        <div className="pointer-events-none absolute right-36 top-0 h-32 w-32 rounded-full bg-cyan-100/35 blur-3xl" />

        <div
          className="pointer-events-none absolute right-0 top-0 hidden h-36 w-64 opacity-35 xl:block"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(59,130,246,0.2) 1.1px, transparent 1.1px)",
            backgroundSize: "13px 13px",
            maskImage:
              "linear-gradient(to left, black 0%, rgba(0,0,0,0.68) 50%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to left, black 0%, rgba(0,0,0,0.68) 50%, transparent 100%)",
          }}
        />

        {/* Compact skyline */}
        <div className="pointer-events-none absolute bottom-[86px] right-5 hidden h-16 w-44 items-end justify-end gap-[3px] overflow-hidden opacity-[0.075] xl:flex">
          {[22, 32, 26, 44, 30, 58, 38, 50, 28].map((height, index) => (
            <div
              key={index}
              className="relative w-3 rounded-t-sm bg-blue-600"
              style={{ height }}
            >
              <div className="absolute inset-x-[2px] top-1.5 grid grid-cols-2 gap-[2px]">
                {Array.from({ length: 4 }).map((_, windowIndex) => (
                  <span
                    key={windowIndex}
                    className="h-[2px] w-[2px] rounded-full bg-white"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Header content */}
        <div className="relative grid gap-4 px-5 pb-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-5 xl:px-7">
          {/* Left content */}
          <div className="flex min-w-0 items-center gap-4">
            {/* Smaller shield */}
            <div className="relative hidden h-[68px] w-[68px] shrink-0 items-center justify-center sm:flex">
              <div className="absolute inset-0 rounded-full border border-blue-200/80" />
              <div className="absolute inset-[5px] rounded-full border border-dashed border-blue-300/75" />
              <div className="absolute inset-[10px] rounded-full bg-blue-100/55 blur-sm" />

              <div className="relative flex h-[50px] w-[50px] items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 text-white shadow-[0_12px_24px_-10px_rgba(37,99,235,0.72)]">
                <Shield size={23} strokeWidth={1.9} />
              </div>

              <span className="absolute bottom-[7px] right-[2px] h-2.5 w-2.5 rounded-full border-2 border-white bg-cyan-400 shadow-sm" />
              <span className="absolute left-[4px] top-[13px] h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.1)]" />
            </div>

            {/* Heading */}
            <div className="min-w-0">
              <h1 className="text-[22px] font-black leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-[25px] lg:text-[27px] xl:text-[29px]">
                Welcome back, HMS Super Admin{" "}
                <span aria-hidden className="inline-block">
                  👋
                </span>
              </h1>

              <p className="mt-1.5 max-w-[660px] text-xs leading-5 text-slate-500 sm:text-[13px]">
                Monitor city provisioning, hierarchy readiness, ULB identity and
                administrator coverage from one executive command center.
              </p>
            </div>
          </div>

          {/* Compact aligned controls */}
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto lg:grid-cols-[138px_122px_158px]">
            <div className="flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[11px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-[0_7px_18px_-15px_rgba(15,23,42,0.65)]">
              <Calendar size={15} className="shrink-0 text-blue-600" />

              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>

            <Button
              variant="secondary"
              className="h-10 w-full justify-center whitespace-nowrap rounded-[11px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-[0_7px_18px_-15px_rgba(15,23,42,0.65)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40"
              icon={
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
              }
              onClick={refresh}
              disabled={loading}
            >
              {loading ? "Syncing..." : "Refresh"}
            </Button>

            <Button
              className="h-10 w-full justify-center whitespace-nowrap rounded-[11px] border-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-4 text-xs font-bold text-white shadow-[0_10px_20px_-10px_rgba(37,99,235,0.78)] transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-700 hover:via-indigo-700 hover:to-indigo-800"
              icon={<PlusCircle size={14} />}
              onClick={() => setCreateCityOpen(true)}
            >
              Onboard City
            </Button>
          </div>
        </div>

        {/* Ultra-compact status strip */}
        <div className="relative mx-4 mb-4 overflow-hidden rounded-[17px] border border-slate-200/85 bg-white/95 shadow-[0_14px_32px_-26px_rgba(15,23,42,0.42)] sm:mx-5 lg:mx-6">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "System status",
                value: "Operational",
                helper: `${activeCities} live cities`,
                icon: <Activity size={17} />,
                iconClass:
                  "border-emerald-100 bg-emerald-50 text-emerald-600",
                dotClass: "bg-emerald-500",
              },
              {
                label: "Admin coverage",
                value: `${adminRate}%`,
                helper: `${managedCities} of ${totalCities || 0} covered`,
                icon: <Users size={17} />,
                iconClass:
                  "border-violet-100 bg-violet-50 text-violet-600",
                dotClass: "bg-violet-500",
              },
              {
                label: "Hierarchy readiness",
                value: `${hierarchyRate}%`,
                helper: `${hierarchyReadyCities} fully mapped`,
                icon: <Layers size={17} />,
                iconClass: "border-blue-100 bg-blue-50 text-blue-600",
                dotClass: "bg-blue-500",
              },
              {
                label: "Action queue",
                value: `${unmanagedCities + hierarchyIssues.length}`,
                helper: "Items requiring review",
                icon: <AlertCircle size={17} />,
                iconClass:
                  "border-amber-100 bg-amber-50 text-amber-600",
                dotClass: "bg-amber-500",
              },
            ].map((item, index) => (
              <div
                key={item.label}
                className={`
            relative flex min-h-[78px] items-center gap-3
            border-b border-slate-200/75 px-4 py-3
            ${index % 2 === 0 ? "sm:border-r" : ""}
            ${index < 2 ? "sm:border-b" : "sm:border-b-0"}
            xl:border-b-0
            ${index < 3 ? "xl:border-r" : "xl:border-r-0"}
          `}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border shadow-sm ${item.iconClass}`}
                >
                  {item.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.dotClass}`}
                    />

                    <span className="truncate text-[9px] font-extrabold uppercase tracking-[0.13em] text-slate-500">
                      {item.label}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[16px] font-black leading-none tracking-[-0.025em] text-slate-950">
                      {item.value}
                    </span>

                    <span className="truncate text-[11px] font-medium text-slate-500">
                      {item.helper}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compact premium KPI cards — circular status design */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {loading && !cities.length ? (
          Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))
        ) : (
          kpiCards.map((kpi, index) => {
            const numericValue =
              typeof kpi.value === "number"
                ? kpi.value
                : Number.parseFloat(String(kpi.value)) || 0;

            const highestPoint = Math.max(...kpi.data, 1);

            const progress = Math.min(
              100,
              Math.max(
                numericValue === 0 ? 4 : 12,
                Math.round((numericValue / highestPoint) * 100)
              )
            );

            return (
              <article
                key={kpi.label}
                className="
            group relative flex min-h-[162px] flex-col overflow-hidden
            rounded-[18px] border border-slate-200/85 bg-white
            px-3.5 pb-3 pt-3.5 opacity-100
            shadow-[0_12px_30px_-24px_rgba(15,23,42,0.65)]
            transition-all duration-300
            hover:-translate-y-0.5 hover:border-blue-200
            hover:shadow-[0_18px_38px_-25px_rgba(37,99,235,0.35)]
          "
              >
                {/* Soft top-right gradient decoration */}
                <div
                  className="
              pointer-events-none absolute -right-9 -top-10
              h-24 w-28 rounded-full opacity-[0.12] blur-2xl
              transition-opacity duration-300
              group-hover:opacity-[0.2]
            "
                  style={{
                    backgroundColor: kpi.color,
                  }}
                />

                {/* Top row: icon and trend */}
                <div className="relative flex items-start justify-between gap-2">
                  <span
                    className={`
                flex h-8 w-8 shrink-0 items-center justify-center
                rounded-[10px] transition-transform duration-300
                group-hover:scale-105
                ${kpi.iconClass}
              `}
                  >
                    <span className="[&>svg]:h-[15px] [&>svg]:w-[15px]">
                      {kpi.icon}
                    </span>
                  </span>

                  <span
                    className="
                flex max-w-[110px] items-start gap-1 rounded-lg
                bg-white/75 px-2 py-1 text-right
                text-[9px] font-extrabold leading-[12px]
                shadow-[0_5px_15px_-12px_rgba(15,23,42,0.55)]
                backdrop-blur-sm
              "
                    style={{
                      color: kpi.up ? kpi.color : "#94a3b8",
                    }}
                  >
                    {kpi.up ? (
                      <ArrowUpRight
                        size={10}
                        strokeWidth={2.5}
                        className="mt-[1px] shrink-0"
                      />
                    ) : (
                      <ArrowDownRight
                        size={10}
                        strokeWidth={2.5}
                        className="mt-[1px] shrink-0"
                      />
                    )}

                    <span>{kpi.delta}</span>
                  </span>
                </div>

                {/* Value and compact circular indicator */}
                <div className="relative mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[25px] font-black leading-none tracking-[-0.04em] text-slate-950">
                      {kpi.value}
                    </div>

                    <div className="mt-1.5 truncate text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      {kpi.label}
                    </div>
                  </div>

                  {/* Circular progress */}
                  <div className="relative h-[48px] w-[48px] shrink-0">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(
                    ${kpi.color} ${progress}%,
                    #e9eef5 ${progress}% 100%
                  )`,
                      }}
                    />

                    <div className="absolute inset-[5px] flex items-center justify-center rounded-full bg-white shadow-inner">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          color: kpi.color,
                          backgroundColor: `${kpi.color}12`,
                        }}
                      >
                        <span className="[&>svg]:h-[12px] [&>svg]:w-[12px]">
                          {kpi.icon}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom status row */}
                <div
                  className="
              relative mt-auto flex min-h-[34px] items-center gap-2
              rounded-[11px] px-2.5 py-2
            "
                  style={{
                    backgroundColor: `${kpi.color}0D`,
                  }}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: kpi.color,
                    }}
                  />

                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-[9px] font-extrabold"
                      style={{
                        color: kpi.color,
                      }}
                    >
                      {kpi.delta}
                    </div>
                  </div>

                  <span className="text-[9px] font-bold text-slate-400">
                    {progress}%
                  </span>
                </div>
              </article>
            );
          })
        )}
      </section>


      {/* Premium operational widgets */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Hierarchy Readiness */}
        <article className="relative flex min-h-[520px] flex-col overflow-hidden rounded-[26px] border border-slate-200/85 bg-white p-5 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_65px_-40px_rgba(37,99,235,0.25)] sm:p-6">
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-violet-100/45 blur-3xl" />

          {/* Header */}
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 text-violet-600 shadow-sm">
                <Layers size={21} />
              </span>

              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight text-slate-950">
                  Hierarchy Readiness
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-400">
                  Top cities by state, division and district mapping
                </p>
              </div>
            </div>
          </div>

          {/* Hierarchy list */}
          <div className="relative mt-6 overflow-hidden rounded-[20px] border border-slate-200/80 bg-slate-50/30">
            {topCities.length ? (
              topCities.map((city, index) => {
                const rowTones = [
                  {
                    icon: "bg-violet-50 text-violet-600",
                    progress:
                      "from-violet-600 via-indigo-500 to-cyan-400",
                  },
                  {
                    icon: "bg-cyan-50 text-cyan-600",
                    progress:
                      "from-cyan-500 via-blue-500 to-indigo-500",
                  },
                  {
                    icon: "bg-blue-50 text-blue-600",
                    progress:
                      "from-blue-600 via-indigo-500 to-violet-500",
                  },
                  {
                    icon: "bg-emerald-50 text-emerald-600",
                    progress:
                      "from-emerald-500 via-teal-500 to-cyan-500",
                  },
                  {
                    icon: "bg-amber-50 text-amber-600",
                    progress:
                      "from-amber-500 via-orange-400 to-yellow-400",
                  },
                ];

                const tone = rowTones[index % rowTones.length];

                return (
                  <div
                    key={`${city.name}-${index}`}
                    className="group border-b border-slate-200/75 px-4 py-4 transition-colors last:border-b-0 hover:bg-white sm:px-5"
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-black text-slate-500 shadow-sm">
                        {index + 1}
                      </span>

                      {/* City icon */}
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${tone.icon}`}
                      >
                        <Building2 size={17} />
                      </span>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-extrabold text-slate-800">
                            {city.name}
                          </span>

                          <span className="shrink-0 text-xs font-black text-slate-700">
                            {city.pct}%
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/75">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${tone.progress} transition-all duration-700`}
                            style={{
                              width: `${Math.max(city.pct, city.pct > 0 ? 4 : 0)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Layers size={20} />
                </span>

                <p className="mt-3 text-sm font-bold text-slate-600">
                  No hierarchy data
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  City hierarchy information will appear here.
                </p>
              </div>
            )}
          </div>

          {topCities.length > 0 && (
            <div className="relative mt-auto pt-5 text-xs font-medium text-slate-400">
              Showing top {topCities.length} cities
            </div>
          )}
        </article>

        {/* Admin Coverage */}
        <article className="relative flex min-h-[520px] flex-col overflow-hidden rounded-[26px] border border-slate-200/85 bg-white p-5 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_65px_-40px_rgba(37,99,235,0.25)] sm:p-6">
          {/* Decorative dots */}
          <div
            className="pointer-events-none absolute right-0 top-0 h-40 w-40 opacity-35"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(99,102,241,0.18) 1.2px, transparent 1.2px)",
              backgroundSize: "12px 12px",
              maskImage:
                "linear-gradient(to bottom left, black 0%, transparent 78%)",
              WebkitMaskImage:
                "linear-gradient(to bottom left, black 0%, transparent 78%)",
            }}
          />

          {/* Header */}
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-sm">
                <Shield size={21} />
              </span>

              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight text-slate-950">
                  Admin Coverage
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-400">
                  Administrator delegation across city clusters
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Admin coverage options"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg font-black leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              ⋯
            </button>
          </div>

          {/* Donut chart */}
          <div className="relative mt-5 flex flex-1 flex-col items-center justify-center">
            <div className="w-full max-w-[300px]">
              <DonutChart data={adminDonut} />
            </div>

            {/* Custom legend cards */}
            <div className="mt-3 grid w-full grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-[15px] border border-blue-100 bg-blue-50/45 px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.08)]" />

                  <span className="truncate text-xs font-semibold text-slate-500">
                    Managed
                  </span>
                </div>

                <span className="text-base font-black text-slate-900">
                  {managedCities}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-[15px] border border-emerald-100 bg-emerald-50/45 px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.08)]" />

                  <span className="truncate text-xs font-semibold text-slate-500">
                    Unmanaged
                  </span>
                </div>

                <span className="text-base font-black text-slate-900">
                  {unmanagedCities}
                </span>
              </div>
            </div>

            {/* Coverage health */}
            <div className="mt-4 w-full rounded-[18px] border border-slate-200/80 bg-slate-50/75 p-4 shadow-inner">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-extrabold text-slate-700">
                  Coverage health
                </span>

                <span className="text-lg font-black text-slate-950">
                  {adminRate}%
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-blue-500 transition-all duration-700"
                  style={{ width: `${adminRate}%` }}
                />
              </div>
            </div>
          </div>
        </article>

        {/* Quick Actions */}
        <article className="relative flex min-h-[520px] flex-col overflow-hidden rounded-[26px] border border-slate-200/85 bg-white p-5 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_65px_-40px_rgba(37,99,235,0.25)] sm:p-6">
          {/* Background decoration */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-100/40 blur-3xl" />

          {/* Header */}
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 text-violet-600 shadow-sm">
                <Zap size={21} />
              </span>

              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight text-slate-950">
                  Quick Actions
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-400">
                  Common administrative workflows
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="relative mt-7 space-y-4">
            <button
              type="button"
              onClick={() => setCreateCityOpen(true)}
              className="group relative flex min-h-[104px] w-full items-center gap-4 overflow-hidden rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-left shadow-[0_12px_30px_-26px_rgba(15,23,42,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/20 hover:shadow-[0_18px_36px_-25px_rgba(37,99,235,0.3)]"
            >
              <span className="absolute inset-y-0 left-0 w-[3px] bg-blue-600" />

              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 transition-transform duration-300 group-hover:scale-105">
                <PlusCircle size={25} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-base font-black text-slate-900">
                  Onboard City
                </span>

                <span className="mt-1 block truncate text-sm text-slate-400">
                  Deploy a new municipal cluster
                </span>
              </span>

              <ChevronRight
                size={19}
                className="shrink-0 text-slate-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-blue-600"
              />
            </button>

            <button
              type="button"
              onClick={() => setCreateAdminOpen(true)}
              className="group relative flex min-h-[104px] w-full items-center gap-4 overflow-hidden rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-left shadow-[0_12px_30px_-26px_rgba(15,23,42,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50/20 hover:shadow-[0_18px_36px_-25px_rgba(245,158,11,0.25)]"
            >
              <span className="absolute inset-y-0 left-0 w-[3px] bg-amber-500" />

              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 transition-transform duration-300 group-hover:scale-105">
                <UserPlus size={25} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-base font-black text-slate-900">
                  Provision Admin
                </span>

                <span className="mt-1 block truncate text-sm text-slate-400">
                  Delegate city-level control
                </span>
              </span>

              <ChevronRight
                size={19}
                className="shrink-0 text-slate-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-amber-600"
              />
            </button>

            <Link
              href="/hms/cities/new"
              className="group relative flex min-h-[104px] w-full items-center gap-4 overflow-hidden rounded-[20px] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/20 hover:shadow-[0_18px_36px_-25px_rgba(16,185,129,0.25)]"
            >
              <span className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500" />

              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 transition-transform duration-300 group-hover:scale-105">
                <Layers size={25} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-base font-black text-slate-900">
                  Focused Create
                </span>

                <span className="mt-1 block truncate text-sm text-slate-400">
                  Open full-page onboarding
                </span>
              </span>

              <ChevronRight
                size={19}
                className="shrink-0 text-slate-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-emerald-600"
              />
            </Link>
          </div>
        </article>
      </section>

      {/* Notifications and provisioning watchlist */}
      <section className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        {/* Notifications */}
        <article className="relative flex min-h-[370px] flex-col overflow-hidden rounded-[24px] border border-slate-200/85 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.58)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200/80 hover:shadow-[0_24px_58px_-38px_rgba(37,99,235,0.28)] sm:p-6">
          {/* Decorative background */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-emerald-100/35 blur-3xl" />

          {/* Header */}
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
                <Bell size={19} />
              </span>

              <div className="min-w-0">
                <h2 className="text-lg font-black tracking-tight text-slate-950">
                  Notifications
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-400">
                  System alerts and provisioning updates
                </p>
              </div>
            </div>

            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-extrabold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
            >
              View all
            </button>
          </div>

          {/* Notification list */}
          <div className="relative mt-5 flex flex-1 flex-col gap-2">
            {notifications.length ? (
              notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  style={{
                    animationDelay: `${index * 55}ms`,
                  }}
                  className="group flex items-center gap-3 rounded-[16px] border border-transparent px-3 py-3 opacity-100 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50/80"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${notification.tone === "success"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-amber-50 text-amber-600"
                      }`}
                  >
                    {notification.tone === "success" ? (
                      <CheckCircle2 size={17} />
                    ) : (
                      <Bell size={17} />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold text-slate-800">
                      {notification.title}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      <span>{notification.meta}</span>
                      <span className="text-slate-300">•</span>
                      <span>{notification.time}</span>
                    </div>
                  </div>

                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_0_4px_rgba(15,23,42,0.03)] ${notification.tone === "success"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                      }`}
                  />
                </div>
              ))
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                  <Bell size={20} />
                </span>

                <div className="mt-3 text-sm font-extrabold text-slate-700">
                  No notifications
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  New platform alerts will appear here.
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Provisioning Watchlist */}
        <article className="relative flex min-h-[370px] flex-col overflow-hidden rounded-[24px] border border-slate-200/85 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.58)] transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200/80 hover:shadow-[0_24px_58px_-38px_rgba(245,158,11,0.24)] sm:p-6">
          {/* Decorative background */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-amber-100/35 blur-3xl" />

          {/* Header */}
          <div className="relative flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border border-amber-100 bg-amber-50 text-amber-600 shadow-sm">
              <AlertCircle size={19} />
            </span>

            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-tight text-slate-950">
                Provisioning Watchlist
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-400">
                Items requiring administrative attention
              </p>
            </div>
          </div>

          {/* Watchlist items */}
          <div className="relative mt-5 flex flex-1 flex-col gap-3">
            {/* Cities without admin */}
            <button
              type="button"
              onClick={() => setCreateAdminOpen(true)}
              className="group flex min-h-[78px] w-full items-center gap-3 rounded-[17px] border border-rose-100 bg-rose-50/60 px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:shadow-[0_14px_30px_-25px_rgba(244,63,94,0.45)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-rose-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
                <UserPlus size={18} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-slate-800">
                  Cities without admin
                </span>

                <span className="mt-1 block truncate text-xs text-slate-400">
                  Immediate delegation required
                </span>
              </span>

              <span className="text-[24px] font-black leading-none text-rose-600">
                {attentionCities.length}
              </span>

              <ChevronRight
                size={16}
                className="shrink-0 text-rose-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-rose-500"
              />
            </button>

            {/* Hierarchy incomplete */}
            <div className="group flex min-h-[78px] items-center gap-3 rounded-[17px] border border-amber-100 bg-amber-50/60 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50 hover:shadow-[0_14px_30px_-25px_rgba(245,158,11,0.4)]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-amber-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Layers size={18} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold text-slate-800">
                  Hierarchy incomplete
                </div>

                <div className="mt-1 truncate text-xs text-slate-400">
                  Missing state, division or district
                </div>
              </div>

              <span className="text-[24px] font-black leading-none text-amber-600">
                {hierarchyIssues.length}
              </span>
            </div>

            {/* Dormant clusters */}
            <div className="group flex min-h-[78px] items-center gap-3 rounded-[17px] border border-slate-200 bg-slate-50/80 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-[0_14px_30px_-25px_rgba(37,99,235,0.28)]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white text-slate-600 shadow-sm transition-transform duration-200 group-hover:scale-105 group-hover:text-blue-600">
                <Clock size={18} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold text-slate-800">
                  Dormant clusters
                </div>

                <div className="mt-1 truncate text-xs text-slate-400">
                  Review activation status
                </div>
              </div>

              <span className="text-[24px] font-black leading-none text-slate-700">
                {totalCities - activeCities}
              </span>
            </div>
          </div>
        </article>
      </section>

     {/* Clean Provisioned Cities table */}
<section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_40px_-30px_rgba(15,23,42,0.35)]">
  {/* Header */}
  <div className="flex flex-col gap-5 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
    <div className="min-w-0">
      <h2 className="text-[21px] font-black tracking-[-0.025em] text-slate-950">
        Provisioned Cities
      </h2>

      <p className="mt-1 text-sm text-slate-400">
        Overview of provisioned cities and their administrative ownership.
      </p>
    </div>

    {/* Search, filter and create */}
    <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
      <div className="relative min-w-0 sm:w-[285px]">
        <Search
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setTablePage(1);
          }}
          placeholder="Search cities..."
          className="
            h-11 w-full rounded-[11px] border border-slate-200
            bg-white pl-10 pr-10 text-sm font-medium text-slate-700
            outline-none transition
            placeholder:text-slate-400
            hover:border-slate-300
            focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10
          "
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setTablePage(1);
            }}
            aria-label="Clear search"
            className="
              absolute right-3 top-1/2 flex h-5 w-5
              -translate-y-1/2 items-center justify-center
              rounded text-xs font-bold text-slate-400
              transition hover:bg-slate-100 hover:text-slate-700
            "
          >
            ×
          </button>
        )}
      </div>

      <div className="relative sm:w-[190px]">
        <Filter
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(
              event.target.value as
                | "all"
                | "live"
                | "dormant"
                | "managed"
                | "unmanaged"
            );
            setTablePage(1);
          }}
          className="
            h-11 w-full appearance-none rounded-[11px]
            border border-slate-200 bg-white
            pl-10 pr-9 text-sm font-semibold text-slate-600
            outline-none transition
            hover:border-slate-300
            focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10
          "
        >
          <option value="all">All Status</option>
          <option value="live">Live</option>
          <option value="dormant">Dormant</option>
          <option value="managed">Managed</option>
          <option value="unmanaged">Needs Admin</option>
        </select>

        <ChevronRight
          size={15}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rotate-90 text-slate-400"
        />
      </div>

      <Link
        href="/hms/cities/new"
        className="
          inline-flex h-11 shrink-0 items-center justify-center gap-2
          rounded-[11px] bg-blue-600 px-5
          text-sm font-extrabold text-white
          shadow-[0_10px_20px_-12px_rgba(37,99,235,0.75)]
          transition-all duration-200
          hover:-translate-y-0.5 hover:bg-blue-700
          hover:shadow-[0_14px_26px_-12px_rgba(37,99,235,0.8)]
        "
      >
        <PlusCircle size={16} />
        Provision City
      </Link>
    </div>
  </div>

  {/* Active filter summary */}
  {(searchQuery || statusFilter !== "all") && (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 lg:px-7">
      <span className="text-xs font-semibold text-slate-400">
        Active filters:
      </span>

      {searchQuery && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
          Search: {searchQuery}
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setTablePage(1);
            }}
            className="text-blue-400 hover:text-blue-700"
          >
            ×
          </button>
        </span>
      )}

      {statusFilter !== "all" && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold capitalize text-slate-600">
          {statusFilter === "unmanaged" ? "Needs admin" : statusFilter}
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setTablePage(1);
            }}
            className="text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        </span>
      )}
    </div>
  )}

  {/* Table */}
  <div className="overflow-x-auto">
    <table className="w-full min-w-[1180px] table-fixed">
      <colgroup>
        <col className="w-[17%]" />
        <col className="w-[26%]" />
        <col className="w-[14%]" />
        <col className="w-[25%]" />
        <col className="w-[10%]" />
        <col className="w-[8%]" />
      </colgroup>

      <thead>
        <tr className="border-b border-slate-200 bg-slate-50/75">
          {[
            "City",
            "Hierarchy",
            "Identity",
            "Administrator",
            "Status",
            "Control",
          ].map((heading) => (
            <th
              key={heading}
              className="
                px-5 py-4 text-left text-[11px] font-extrabold
                uppercase tracking-[0.08em] text-slate-500
                first:pl-7 last:pr-7
              "
            >
              {heading}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {visibleCities.length ? (
          visibleCities.map((city, cityIndex) => {
            const admins =
              (city.cityAdmins?.length ?? 0) > 0
                ? city.cityAdmins ?? []
                : city.cityAdmin
                  ? [city.cityAdmin]
                  : [];

            const cityIconTones = [
              "bg-violet-50 text-violet-600",
              "bg-emerald-50 text-emerald-600",
              "bg-orange-50 text-orange-600",
              "bg-rose-50 text-rose-600",
              "bg-blue-50 text-blue-600",
              "bg-cyan-50 text-cyan-600",
            ];

            const cityTone =
              cityIconTones[cityIndex % cityIconTones.length];

            const hierarchyItems = [
              {
                label: city.state?.name || "No state",
                missing: !city.state?.name,
              },
              {
                label: city.division?.name || "No division",
                missing: !city.division?.name,
              },
              {
                label: city.district?.name || "No district",
                missing: !city.district?.name,
              },
            ];

            return (
              <tr
                key={city.id}
                className="
                  group border-b border-slate-200/80
                  transition-colors last:border-b-0
                  hover:bg-blue-50/20
                "
              >
                {/* City */}
                <td className="px-5 py-4 pl-7 align-middle">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`
                        flex h-11 w-11 shrink-0 items-center
                        justify-center rounded-full
                        transition-transform duration-200
                        group-hover:scale-105
                        ${
                          city.enabled
                            ? cityTone
                            : "bg-slate-100 text-slate-400"
                        }
                      `}
                    >
                      <Building2 size={18} strokeWidth={2} />
                    </span>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-slate-900">
                        {city.name}
                      </div>

                      <div className="mt-1 truncate text-xs font-medium text-slate-400">
                        {city.code || `ID-${city.id.slice(0, 6)}`}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Hierarchy */}
                <td className="px-5 py-4 align-middle">
                  <div className="flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px]">
                    {hierarchyItems.map((item, hierarchyIndex) => (
                      <div
                        key={`${city.id}-${hierarchyIndex}`}
                        className="flex min-w-0 items-center gap-1.5"
                      >
                        <span
                          className={`max-w-[130px] truncate font-medium ${
                            item.missing
                              ? "text-amber-600"
                              : "text-slate-500"
                          }`}
                          title={item.label}
                        >
                          {item.label}
                        </span>

                        {hierarchyIndex <
                          hierarchyItems.length - 1 && (
                          <ChevronRight
                            size={13}
                            className="shrink-0 text-slate-300"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </td>

                {/* Identity */}
                <td className="px-5 py-4 align-middle">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-50 text-blue-600">
                      <Building2 size={15} />
                    </span>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-600">
                        {city.code || "No code"}
                      </div>

                      <div className="mt-0.5 truncate text-xs text-slate-400">
                        ULB: {city.ulbCode || "—"}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Administrator */}
                <td className="px-5 py-4 align-middle">
                  {admins.length ? (
                    <div className="space-y-2.5">
                      {admins.map((admin, adminIndex) => {
                        const initials =
                          admin.name
                            ?.trim()
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part.charAt(0))
                            .join("")
                            .toUpperCase() || "A";

                        const avatarTones = [
                          "bg-blue-100 text-blue-700",
                          "bg-violet-100 text-violet-700",
                          "bg-emerald-100 text-emerald-700",
                          "bg-amber-100 text-amber-700",
                        ];

                        const avatarTone =
                          avatarTones[
                            adminIndex % avatarTones.length
                          ];

                        return (
                          <div
                            key={
                              admin.id ||
                              admin.email ||
                              `${city.id}-${adminIndex}`
                            }
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              {/* Initial avatar — no profile image */}
                              <span
                                className={`
                                  flex h-9 w-9 shrink-0 items-center
                                  justify-center rounded-full
                                  text-[11px] font-black
                                  ${avatarTone}
                                `}
                              >
                                {initials}
                              </span>

                              <div className="min-w-0">
                                <div className="truncate text-sm font-extrabold text-slate-800">
                                  {admin.name}
                                </div>

                                <div className="mt-0.5 truncate text-xs text-slate-400">
                                  {admin.email}
                                </div>
                              </div>
                            </div>

                            <div className="flex min-w-0 items-center gap-2.5">
                              {/* Initial avatar — no profile image */}
                              <span
                                className={`
                                  flex h-9 w-9 shrink-0 items-center
                                  justify-center rounded-full
                                  text-[11px] font-black
                                  ${avatarTone}
                                `}
                              >
                                {initials}
                              </span>

                              <div className="min-w-0">
                                <div className="truncate text-sm font-extrabold text-slate-800">
                                  {admin.name}
                                </div>

                                <div className="mt-0.5 truncate text-xs text-slate-400">
                                  {admin.email}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAdminCityId(city.id);
                        setCreateAdminOpen(true);
                      }}
                      className="
                        inline-flex items-center gap-2 rounded-[9px]
                        border border-amber-200 bg-amber-50
                        px-3 py-2 text-xs font-extrabold text-amber-700
                        transition hover:border-amber-300
                        hover:bg-amber-100
                      "
                    >
                      <UserPlus size={14} />
                      Assign administrator
                    </button>
                  )}
                </td>

                {/* Status */}
                <td className="px-5 py-4 align-middle">
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleCity(city.id, !city.enabled)
                    }
                    title={
                      city.enabled
                        ? "Click to mark dormant"
                        : "Click to mark live"
                    }
                    className={`
                      inline-flex items-center gap-2 rounded-[9px]
                      border px-3 py-1.5 text-xs font-bold
                      transition
                      ${
                        city.enabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }
                    `}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        city.enabled
                          ? "bg-emerald-500"
                          : "bg-slate-400"
                      }`}
                    />

                    {city.enabled ? "Live" : "Dormant"}
                  </button>
                </td>

                {/* Control */}
                <td className="px-5 py-4 pr-7 align-middle">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingCity(city)}
                      aria-label={`Edit city ${city.name}`}
                      title="Edit City Configuration"
                      className="
                        flex h-8 w-8 items-center justify-center
                        rounded-[9px] border border-slate-200
                        bg-white text-slate-600 transition
                        hover:border-blue-200 hover:bg-blue-50
                        hover:text-blue-600
                      "
                    >
                      <Edit2 size={14} />
                    </button>

                    {admins.length > 0 && admins[0].id && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingAdmin({
                              cityId: city.id,
                              cityName: city.name,
                              admin: admins[0],
                            })
                          }
                          aria-label={`Edit Admin ${admins[0].name}`}
                          title="Edit City Administrator"
                          className="
                            flex h-8 w-8 items-center justify-center
                            rounded-[9px] border border-slate-200
                            bg-white text-slate-500 transition
                            hover:border-amber-200 hover:bg-amber-50
                            hover:text-amber-600
                          "
                        >
                          <UserCog size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteAdmin(
                              city.id,
                              admins[0].id || "",
                              admins[0].name
                            )
                          }
                          aria-label={`Delete Admin ${admins[0].name}`}
                          title="Remove City Administrator"
                          className="
                            flex h-8 w-8 items-center justify-center
                            rounded-[9px] border border-slate-200
                            bg-white text-slate-400 transition
                            hover:border-rose-200 hover:bg-rose-50
                            hover:text-rose-600
                          "
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={6} className="px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Search size={19} />
              </div>

              <div className="mt-3 text-sm font-extrabold text-slate-700">
                No matching cities found
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Try changing your search text or status filter.
              </div>

              {(searchQuery || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setTablePage(1);
                  }}
                  className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  Clear all filters
                </button>
              )}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

  {/* Pagination */}
  <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/40 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between lg:px-7">
    <div className="text-xs font-medium text-slate-500">
      Showing{" "}
      <span className="font-bold text-slate-700">
        {filteredCities.length
          ? (safeTablePage - 1) * tablePageSize + 1
          : 0}
      </span>{" "}
      to{" "}
      <span className="font-bold text-slate-700">
        {Math.min(
          safeTablePage * tablePageSize,
          filteredCities.length
        )}
      </span>{" "}
      of{" "}
      <span className="font-bold text-slate-700">
        {filteredCities.length}
      </span>{" "}
      cities
    </div>

    <div className="flex flex-wrap items-center gap-1.5">
      {/* First page */}
      <button
        type="button"
        onClick={() => setTablePage(1)}
        disabled={safeTablePage === 1}
        aria-label="First page"
        className="
          flex h-9 w-9 items-center justify-center rounded-[8px]
          border border-slate-200 bg-white text-xs font-bold
          text-slate-500 transition
          hover:border-blue-200 hover:text-blue-600
          disabled:cursor-not-allowed disabled:opacity-35
        "
      >
        «
      </button>

      {/* Previous page */}
      <button
        type="button"
        onClick={() =>
          setTablePage((page) => Math.max(1, page - 1))
        }
        disabled={safeTablePage === 1}
        aria-label="Previous page"
        className="
          flex h-9 w-9 items-center justify-center rounded-[8px]
          border border-slate-200 bg-white text-slate-500
          transition hover:border-blue-200 hover:text-blue-600
          disabled:cursor-not-allowed disabled:opacity-35
        "
      >
        <ChevronLeft size={15} />
      </button>

      {/* Numbered pages */}
      {(() => {
        const visiblePageCount = Math.min(tablePageCount, 5);

        const startPage = Math.max(
          1,
          Math.min(
            safeTablePage - 2,
            Math.max(1, tablePageCount - visiblePageCount + 1)
          )
        );

        return Array.from(
          { length: visiblePageCount },
          (_, index) => startPage + index
        ).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => setTablePage(pageNumber)}
            aria-current={
              safeTablePage === pageNumber ? "page" : undefined
            }
            className={`
              flex h-9 min-w-9 items-center justify-center
              rounded-[8px] border px-2 text-xs font-bold
              transition
              ${
                safeTablePage === pageNumber
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-600"
              }
            `}
          >
            {pageNumber}
          </button>
        ));
      })()}

      {/* Next page */}
      <button
        type="button"
        onClick={() =>
          setTablePage((page) =>
            Math.min(tablePageCount, page + 1)
          )
        }
        disabled={safeTablePage === tablePageCount}
        aria-label="Next page"
        className="
          flex h-9 w-9 items-center justify-center rounded-[8px]
          border border-slate-200 bg-white text-slate-500
          transition hover:border-blue-200 hover:text-blue-600
          disabled:cursor-not-allowed disabled:opacity-35
        "
      >
        <ChevronRight size={15} />
      </button>

      {/* Last page */}
      <button
        type="button"
        onClick={() => setTablePage(tablePageCount)}
        disabled={safeTablePage === tablePageCount}
        aria-label="Last page"
        className="
          flex h-9 w-9 items-center justify-center rounded-[8px]
          border border-slate-200 bg-white text-xs font-bold
          text-slate-500 transition
          hover:border-blue-200 hover:text-blue-600
          disabled:cursor-not-allowed disabled:opacity-35
        "
      >
        »
      </button>

      <span className="ml-1 inline-flex h-9 items-center rounded-[8px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500">
        {tablePageSize} / page
      </span>
    </div>
  </div>
</section>

      {/* Create City Modal */}
      <Modal
        open={createCityOpen}
        onClose={() => setCreateCityOpen(false)}
        title="Onboard New City"
        subtitle="State → Division → District → City"
        size="md"
      >
        <form onSubmit={handleCreateCity} className="flex flex-col gap-4">
          <FormField label="State" required>
            <select className={selectClass} value={stateId} onChange={(e) => setStateId(e.target.value)} required>
              <option value="">{masterLoading ? "Loading states..." : "Select state"}</option>
              {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
          <FormField label="Division" required>
            <select className={selectClass} value={divisionId} onChange={(e) => setDivisionId(e.target.value)} disabled={!stateId} required>
              <option value="">{stateId ? (masterLoading ? "Loading divisions..." : "Select division") : "Select state first"}</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </FormField>
          <FormField label="District" required>
            <select className={selectClass} value={districtId} onChange={(e) => setDistrictId(e.target.value)} disabled={!divisionId} required>
              <option value="">{divisionId ? (masterLoading ? "Loading districts..." : "Select district") : "Select division first"}</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </FormField>
          <FormField label="City" required>
            <select className={selectClass} value={cityMasterId} onChange={(e) => setCityMasterId(e.target.value)} disabled={!districtId} required>
              <option value="">{districtId ? (masterLoading ? "Loading cities..." : "Select city") : "Select district first"}</option>
              {masterCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <FormField label="System Code" required>
            <input className={inputClass} value={cityCode} onChange={(e) => setCityCode(e.target.value)} placeholder="e.g. indore" required />
          </FormField>
          <FormField label="ULB Identifier">
            <input className={inputClass} value={cityUlbCode} onChange={(e) => setCityUlbCode(e.target.value)} placeholder="e.g. idr01" />
          </FormField>

          {/* Authorized Modules Assignment */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 mt-1">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Authorized Platform Modules *
              </span>
              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
                {Object.values(cityModules).filter(Boolean).length} / 4 Enabled
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label onClick={() => setCityModules(p => ({ ...p, taskforce: !p.taskforce }))} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${cityModules.taskforce ? 'bg-white border-blue-400 font-bold text-blue-800' : 'bg-slate-100 border-slate-200 text-slate-500 opacity-60'}`}>
                <input type="checkbox" checked={cityModules.taskforce} onChange={() => {}} className="accent-blue-600" />
                <span>Taskforce 20</span>
              </label>

              <label onClick={() => setCityModules(p => ({ ...p, swachh: !p.swachh }))} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${cityModules.swachh ? 'bg-white border-emerald-400 font-bold text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-500 opacity-60'}`}>
                <input type="checkbox" checked={cityModules.swachh} onChange={() => {}} className="accent-emerald-600" />
                <span>Swachh Ward Ranking</span>
              </label>

              <label onClick={() => setCityModules(p => ({ ...p, workforce: !p.workforce }))} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${cityModules.workforce ? 'bg-white border-purple-400 font-bold text-purple-800' : 'bg-slate-100 border-slate-200 text-slate-500 opacity-60'}`}>
                <input type="checkbox" checked={cityModules.workforce} onChange={() => {}} className="accent-purple-600" />
                <span>Workforce Monitoring</span>
              </label>

              <label onClick={() => setCityModules(p => ({ ...p, mrf: !p.mrf }))} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${cityModules.mrf ? 'bg-white border-amber-400 font-bold text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-500 opacity-60'}`}>
                <input type="checkbox" checked={cityModules.mrf} onChange={() => {}} className="accent-amber-600" />
                <span>Processing & MRF</span>
              </label>
            </div>
          </div>

          {cityStatus && (
            <div className={`text-xs font-semibold ${cityStatus.toLowerCase().includes("fail") ? "text-danger" : "text-primary"}`}>
              {cityStatus}
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setCreateCityOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={cityCreating} icon={<Send size={15} />}>
              Deploy City
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Admin Modal */}
      <Modal
        open={createAdminOpen}
        onClose={() => setCreateAdminOpen(false)}
        title="Provision City Admin"
        subtitle="Delegate control to local authorities"
        size="sm"
      >
        <form onSubmit={handleCreateAdmin} className="flex flex-col gap-4">
          <FormField label="Target Cluster" required>
            <select className={selectClass} value={adminCityId} onChange={(e) => setAdminCityId(e.target.value)} required>
              <option value="">Select city cluster...</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </FormField>
          <FormField label="Full Name" required>
            <input className={inputClass} value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Administrator Name" required />
          </FormField>
          <FormField label="Provisioning Email" required>
            <input className={inputClass} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@city.local" required />
          </FormField>
          <FormField label="Secure Password" required>
            <input className={inputClass} type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="••••••••" required />
          </FormField>

          {adminStatus && (
            <div className={`text-xs font-semibold ${adminStatus.toLowerCase().includes("fail") ? "text-danger" : "text-primary"}`}>
              {adminStatus}
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setCreateAdminOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={adminCreating} icon={<Shield size={15} />}>
              Provision Admin
            </Button>
          </div>
        </form>
      </Modal>

      {editingCity && (
        <EditCityModal city={editingCity} states={states} onClose={() => setEditingCity(null)} onSave={handleUpdateCity} />
      )}

      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete City Admin"
          message={`Remove ${deleteTarget.adminName} from this city cluster? This action removes the administrator mapping immediately. If the user has no other assignments, the account will also be deleted.`}
          confirmLabel="Delete Admin"
          tone="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteAdmin}
        />
      )}

      {editingAdmin && editingAdmin.admin.id && (
        <EditCityAdminModal
          cityId={editingAdmin.cityId}
          cityName={editingAdmin.cityName}
          admin={editingAdmin.admin}
          onClose={() => setEditingAdmin(null)}
          onSave={handleUpdateAdmin}
        />
      )}
    </div>
  );
}

function EditCityAdminModal({
  cityId, cityName, admin, onClose, onSave
}: {
  cityId: string; cityName: string; admin: CityAdminInfo; onClose: () => void;
  onSave: (cityId: string, userId: string, data: { name?: string; email?: string; password?: string }) => Promise<void>;
}) {
  const [name, setName] = useState(admin.name);
  const [email, setEmail] = useState(admin.email);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const inputClass = "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:border-primary/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(cityId, admin.id || "", { name, email, ...(password ? { password } : {}) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit City Admin" subtitle={cityName} size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Admin Name" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </FormField>
        <FormField label="Admin Email" required>
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormField>
        <FormField label="New Password" hint="Leave blank to keep same">
          <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormField>
        <div className="mt-2 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>Discard</Button>
          <Button type="submit" className="flex-1" loading={loading}>Save Admin</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditCityModal({
  city, states, onClose, onSave
}: {
  city: CityRow; states: MasterNode[]; onClose: () => void;
  onSave: (id: string, data: CityUpdateInput) => Promise<void>;
}) {
  const [stateId, setStateId] = useState(city.state?.id || "");
  const [divisionId, setDivisionId] = useState(city.division?.id || "");
  const [districtId, setDistrictId] = useState(city.district?.id || "");
  const [cityMasterId, setCityMasterId] = useState("");
  const [divisions, setDivisions] = useState<MasterNode[]>([]);
  const [districts, setDistricts] = useState<MasterNode[]>([]);
  const [masterCities, setMasterCities] = useState<CityMasterNode[]>([]);
  const [code, setCode] = useState(city.code);
  const [ulbCode, setUlbCode] = useState(city.ulbCode || "");
  const [adminName, setAdminName] = useState(city.cityAdmin?.name || "");
  const [adminEmail, setAdminEmail] = useState(city.cityAdmin?.email || "");
  const [loading, setLoading] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [moduleList, setModuleList] = useState<{ id: string; name: string; enabled: boolean }[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);

  const selectClass = "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:border-primary/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-60";
  const inputClass = selectClass;
  const readOnlyClass = "h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500";

  useEffect(() => {
    let active = true;
    setLoadingModules(true);
    ModuleApi.list()
      .then((res) => {
        if (!active) return;
        const available = res.modules || [];
        const mapped = available.map((m) => {
          const existing = (city.modules || []).find(
            (cm) => cm.id === m.id || cm.name.toUpperCase() === m.name.toUpperCase()
          );
          return {
            id: m.id,
            name: m.name,
            enabled: existing ? existing.enabled : true,
          };
        });
        setModuleList(mapped);
      })
      .catch(() => {
        if (!active) return;
        if (city.modules && city.modules.length > 0) {
          setModuleList(city.modules.map((m) => ({ id: m.id, name: m.name, enabled: m.enabled })));
        }
      })
      .finally(() => {
        if (active) setLoadingModules(false);
      });
    return () => {
      active = false;
    };
  }, [city]);

  useEffect(() => {
    if (!stateId) {
      setDivisions([]); setDivisionId("");
      setDistricts([]); setDistrictId("");
      setMasterCities([]); setCityMasterId("");
      return;
    }
    let active = true;
    setLoadingMasters(true);
    CityApi.listDivisions(stateId)
      .then((res) => {
        if (!active) return;
        setDivisions(res.divisions);
        setDivisionId((current) => (res.divisions.some((item: MasterNode) => item.id === current) ? current : ""));
      })
      .catch(() => { if (active) { setDivisions([]); setDivisionId(""); } })
      .finally(() => { if (active) setLoadingMasters(false); });
    return () => { active = false; };
  }, [stateId]);

  useEffect(() => {
    if (!stateId || !divisionId) {
      setDistricts([]); setDistrictId("");
      setMasterCities([]); setCityMasterId("");
      return;
    }
    let active = true;
    setLoadingMasters(true);
    CityApi.listDistricts(stateId, divisionId)
      .then((res) => {
        if (!active) return;
        setDistricts(res.districts);
        setDistrictId((current) => (res.districts.some((item: MasterNode) => item.id === current) ? current : ""));
      })
      .catch(() => { if (active) { setDistricts([]); setDistrictId(""); } })
      .finally(() => { if (active) setLoadingMasters(false); });
    return () => { active = false; };
  }, [stateId, divisionId]);

  useEffect(() => {
    if (!districtId) {
      setMasterCities([]); setCityMasterId("");
      return;
    }
    let active = true;
    setLoadingMasters(true);
    CityApi.listCities(districtId)
      .then((res) => {
        if (!active) return;
        setMasterCities(res.cities);
        setCityMasterId((current) => {
          if (res.cities.some((item: CityMasterNode) => item.id === current)) return current;
          const matched = res.cities.find((item: CityMasterNode) => item.name.toLowerCase() === city.name.toLowerCase());
          return matched?.id || "";
        });
      })
      .catch(() => { if (active) { setMasterCities([]); setCityMasterId(""); } })
      .finally(() => { if (active) setLoadingMasters(false); });
    return () => { active = false; };
  }, [districtId, city.name]);

  const selectedMasterCity = masterCities.find((item) => item.id === cityMasterId) || null;

  const getModuleMeta = (name: string) => {
    const upper = name.toUpperCase();
    if (upper === "TASKFORCE") return { label: "CTU / GVP Spot Transformation", suite: "TASKFORCE_20", activeClass: "bg-white border-blue-400 font-bold text-blue-800", checkClass: "accent-blue-600" };
    if (upper === "LITTERBINS") return { label: "Litter Bins Collection", suite: "TASKFORCE_20", activeClass: "bg-white border-blue-400 font-bold text-blue-800", checkClass: "accent-blue-600" };
    if (upper === "SWEEPING") return { label: "Beat Sweeping & Sanitation", suite: "TASKFORCE_20", activeClass: "bg-white border-blue-400 font-bold text-blue-800", checkClass: "accent-blue-600" };
    if (upper === "TOILET") return { label: "Cleanliness of Toilets (CT/PT)", suite: "TASKFORCE_20", activeClass: "bg-white border-blue-400 font-bold text-blue-800", checkClass: "accent-blue-600" };
    if (upper === "SWACHH_RANKING" || upper === "SWACHH") return { label: "Swachh Ward Ranking System", suite: "PLATFORM", activeClass: "bg-white border-emerald-400 font-bold text-emerald-800", checkClass: "accent-emerald-600" };
    if (upper === "WORKFORCE_MONITORING" || upper === "WORKFORCE") return { label: "Workforce Monitoring (Matrix Track)", suite: "PLATFORM", activeClass: "bg-white border-purple-400 font-bold text-purple-800", checkClass: "accent-purple-600" };
    if (upper === "MRF" || upper === "PROCESSING") return { label: "Processing & MRF Telemetry", suite: "PLATFORM", activeClass: "bg-white border-amber-400 font-bold text-amber-800", checkClass: "accent-amber-600" };
    return {
      label: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      suite: "PLATFORM",
      activeClass: "bg-white border-blue-400 font-bold text-blue-800",
      checkClass: "accent-blue-600"
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(city.id, {
        ...(stateId && divisionId && districtId && cityMasterId ? { stateId, divisionId, districtId, cityMasterId } : {}),
        ...(selectedMasterCity ? { name: selectedMasterCity.name } : { name: city.name }),
        code, ulbCode, adminName, adminEmail
      });

      for (const m of moduleList) {
        const existing = (city.modules || []).find((cm) => cm.id === m.id);
        if (!existing || existing.enabled !== m.enabled) {
          await CityApi.toggleModule(city.id, m.id, m.enabled).catch(() => {});
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const taskforceModules = moduleList.filter((m) => getModuleMeta(m.name).suite === "TASKFORCE_20");
  const platformModules = moduleList.filter((m) => getModuleMeta(m.name).suite === "PLATFORM");

  const allTaskforceEnabled = taskforceModules.length > 0 && taskforceModules.every((m) => m.enabled);
  const toggleAllTaskforce = () => {
    const nextState = !allTaskforceEnabled;
    setModuleList((prev) =>
      prev.map((item) => (getModuleMeta(item.name).suite === "TASKFORCE_20" ? { ...item, enabled: nextState } : item))
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Modify Cluster"
      subtitle={`${city.state?.name || "No state"} / ${city.division?.name || "No division"} / ${city.district?.name || "No district"}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="State">
            <select className={selectClass} value={stateId} onChange={(e) => setStateId(e.target.value)}>
              <option value="">{loadingMasters ? "Loading..." : "Select state"}</option>
              {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
          <FormField label="Division">
            <select className={selectClass} value={divisionId} onChange={(e) => setDivisionId(e.target.value)} disabled={!stateId}>
              <option value="">{stateId ? (loadingMasters ? "Loading..." : "Select division") : "Select state first"}</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </FormField>
          <FormField label="District">
            <select className={selectClass} value={districtId} onChange={(e) => setDistrictId(e.target.value)} disabled={!divisionId}>
              <option value="">{divisionId ? (loadingMasters ? "Loading..." : "Select district") : "Select division first"}</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </FormField>
          <FormField label="City">
            <select className={selectClass} value={cityMasterId} onChange={(e) => setCityMasterId(e.target.value)} disabled={!districtId}>
              <option value="">{districtId ? (loadingMasters ? "Loading..." : "Select city") : "Select district first"}</option>
              {masterCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="City Name">
          <input className={readOnlyClass} value={selectedMasterCity?.name || city.name} readOnly />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="City Code" required>
            <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} required />
          </FormField>
          <FormField label="ULB Code" required>
            <input className={inputClass} value={ulbCode} onChange={(e) => setUlbCode(e.target.value)} required />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Admin Name">
            <input className={inputClass} value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          </FormField>
          <FormField label="Admin Email">
            <input className={inputClass} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          </FormField>
        </div>

        {/* Authorized Modules Re-assignment */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 mt-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Authorized Platform Modules & Sub-Modules *
            </span>
            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
              {loadingModules ? "Loading..." : `${moduleList.filter((m) => m.enabled).length} Enabled`}
            </span>
          </div>

          {/* Taskforce 20 Suite Box */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <label
                onClick={toggleAllTaskforce}
                className="flex items-center gap-2 font-bold text-xs text-blue-900 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={allTaskforceEnabled}
                  onChange={() => {}}
                  className="accent-blue-600 rounded"
                />
                <span>Taskforce 20 Combined Monitoring Suite</span>
              </label>
              <span className="text-[10px] text-blue-600 font-medium">
                {taskforceModules.filter((m) => m.enabled).length} / {taskforceModules.length} Sub-Modules
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {taskforceModules.map((m) => {
                const meta = getModuleMeta(m.name);
                return (
                  <label
                    key={m.id}
                    onClick={() => {
                      setModuleList((prev) =>
                        prev.map((item) => (item.id === m.id ? { ...item, enabled: !item.enabled } : item))
                      );
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition select-none ${
                      m.enabled ? meta.activeClass : "bg-slate-100 border-slate-200 text-slate-500 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={m.enabled}
                      onChange={() => {}}
                      className={`${meta.checkClass} rounded`}
                    />
                    <span className="truncate">{meta.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Standalone Platforms Box */}
          {platformModules.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                Governance Platforms
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {platformModules.map((m) => {
                  const meta = getModuleMeta(m.name);
                  return (
                    <label
                      key={m.id}
                      onClick={() => {
                        setModuleList((prev) =>
                          prev.map((item) => (item.id === m.id ? { ...item, enabled: !item.enabled } : item))
                        );
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition select-none ${
                        m.enabled ? meta.activeClass : "bg-slate-100 border-slate-200 text-slate-500 opacity-60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={m.enabled}
                        onChange={() => {}}
                        className={`${meta.checkClass} rounded`}
                      />
                      <span className="truncate">{meta.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>Discard</Button>
          <Button type="submit" className="flex-1" loading={loading}>Commit Changes</Button>
        </div>
      </form>
    </Modal>
  );
}