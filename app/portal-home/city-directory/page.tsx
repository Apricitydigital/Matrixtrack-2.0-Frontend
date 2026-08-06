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
  MoreVertical,
} from "lucide-react";
import { ApiError, CityApi } from "@lib/apiClient";
import { useToast } from "@components/ui/ToastProvider";
import { Card } from "@components/ui/Card";
import { Button } from "@components/ui/Button";
import { Badge } from "@components/ui/Badge";
import { Modal } from "@components/ui/Modal";
import { ConfirmDialog } from "@components/ui/ConfirmDialog";
import { SkeletonCard } from "@components/ui/Skeleton";
import { FormField } from "@components/ui/FormField";
import type { CityAdminInfo, CityMasterNode, CityRow, MasterNode } from "../../../types/api";
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
  const [deleteCityTarget, setDeleteCityTarget] = useState<{ cityId: string; cityName: string } | null>(null);
  const [createCityOpen, setCreateCityOpen] = useState(false);

  // Check if current logged-in user is Super Admin
  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  const isSuperAdmin = currentUser?.role === 'HMS_SUPER_ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'hms_admin' || !currentUser?.role || currentUser?.isSuperAdmin === true;

  const handleDeleteCity = (cityId: string, cityName: string) => {
    setDeleteCityTarget({ cityId, cityName });
  };

  const confirmDeleteCity = async () => {
    if (!deleteCityTarget) return;
    try {
      await CityApi.delete(deleteCityTarget.cityId);
      await refresh();
      showToast({ title: "City deleted", description: `${deleteCityTarget.cityName} was permanently removed.`, tone: "success" });
      setDeleteCityTarget(null);
    } catch (err) {
      showToast({
        title: "City deletion failed",
        description: err instanceof ApiError ? err.message : "Failed to delete city.",
        tone: "error"
      });
    }
  };
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
      await CityApi.create(payload);
      showToast({ title: "City created", description: "New city city deployed successfully.", tone: "success" });
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
      showToast({ title: "City updated", description: "City details saved.", tone: "success" });
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
      showToast({ title: "Admin created", tone: "success" });
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




  const [filterState, setFilterState] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");

  const uniqueFilterStates = useMemo(() => Array.from(new Set(cities.map((c) => c.state?.name).filter(Boolean))), [cities]);
  const uniqueFilterDivisions = useMemo(() => Array.from(new Set(cities.map((c) => c.division?.name).filter(Boolean))), [cities]);
  const uniqueFilterDistricts = useMemo(() => Array.from(new Set(cities.map((c) => c.district?.name).filter(Boolean))), [cities]);

  useEffect(() => {
    setTablePage(1);
  }, [searchQuery, statusFilter, filterState, filterDivision, filterDistrict]);

  const filteredCities = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const result = cities.filter((city) => {
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

      const matchesState = !filterState || city.state?.name === filterState;
      const matchesDivision = !filterDivision || city.division?.name === filterDivision;
      const matchesDistrict = !filterDistrict || city.district?.name === filterDistrict;

      return matchesQuery && matchesStatus && matchesState && matchesDivision && matchesDistrict;
    });

    // Sort alphabetically by City Name (A to Z)
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [cities, searchQuery, statusFilter, filterState, filterDivision, filterDistrict]);

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

     {/* Clean Provisioned Cities table */}
<section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_40px_-30px_rgba(15,23,42,0.35)]">
  {/* Header */}
  <div className="flex flex-col gap-5 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-7">
    <div className="min-w-0">
      <h2 className="text-[21px] font-black tracking-[-0.025em] text-slate-950">
        City Directory
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        Overview of cities and their admins sorted alphabetically
      </p>
    </div>

    {/* Add City Button */}
    <button
      onClick={() => {
        window.location.href = '/portal-home/onboard-city';
      }}
      className="
        inline-flex h-11 shrink-0 items-center justify-center gap-2
        rounded-[11px] bg-blue-600 px-5
        text-sm font-extrabold text-white
        shadow-[0_10px_20px_-12px_rgba(37,99,235,0.75)]
        hover:bg-blue-500 transition
      "
    >
      <PlusCircle size={16} />
      Add new city
    </button>
  </div>

  {/* ── FILTER TOOLBAR ROW (STATE, DIVISION, DISTRICT, STATUS, SEARCH) ── */}
  <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 lg:px-7">
    {/* Search Box */}
    <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.target.value);
          setTablePage(1);
        }}
        placeholder="Search cities..."
        className="
          h-10 w-full rounded-[10px] border border-slate-200
          bg-white pl-9 pr-8 text-xs font-semibold text-slate-700
          outline-none transition placeholder:text-slate-400
          hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10
        "
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setTablePage(1);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
        >
          ×
        </button>
      )}
    </div>

    {/* State Filter */}
    <div className="relative min-w-[140px]">
      <select
        value={filterState}
        onChange={(e) => { setFilterState(e.target.value); setTablePage(1); }}
        className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400"
      >
        <option value="">All States</option>
        {uniqueFilterStates.map((st) => (
          <option key={st} value={st}>{st}</option>
        ))}
      </select>
    </div>

    {/* Division Filter */}
    <div className="relative min-w-[140px]">
      <select
        value={filterDivision}
        onChange={(e) => { setFilterDivision(e.target.value); setTablePage(1); }}
        className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400"
      >
        <option value="">All Divisions</option>
        {uniqueFilterDivisions.map((div) => (
          <option key={div} value={div}>{div}</option>
        ))}
      </select>
    </div>

    {/* District Filter */}
    <div className="relative min-w-[140px]">
      <select
        value={filterDistrict}
        onChange={(e) => { setFilterDistrict(e.target.value); setTablePage(1); }}
        className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400"
      >
        <option value="">All Districts</option>
        {uniqueFilterDistricts.map((dis) => (
          <option key={dis} value={dis}>{dis}</option>
        ))}
      </select>
    </div>

    {/* Status Filter */}
    <div className="relative min-w-[130px]">
      <select
        value={statusFilter}
        onChange={(e) => { setStatusFilter(e.target.value as any); setTablePage(1); }}
        className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400"
      >
        <option value="all">All Status</option>
        <option value="live">Live</option>
        <option value="dormant">Dormant</option>
        <option value="managed">Managed</option>
        <option value="unmanaged">Needs Admin</option>
      </select>
    </div>
  </div>

  {/* Active Filter Summary Pills */}
  {(searchQuery || statusFilter !== "all" || filterState || filterDivision || filterDistrict) && (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2 lg:px-7">
      <span className="text-xs font-bold text-slate-400">Active filters:</span>
      {searchQuery && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
          Search: {searchQuery}
          <button type="button" onClick={() => setSearchQuery("")} className="text-blue-400 hover:text-blue-700">×</button>
        </span>
      )}
      {filterState && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
          State: {filterState}
          <button type="button" onClick={() => setFilterState("")} className="text-slate-400 hover:text-slate-700">×</button>
        </span>
      )}
      {filterDivision && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
          Division: {filterDivision}
          <button type="button" onClick={() => setFilterDivision("")} className="text-slate-400 hover:text-slate-700">×</button>
        </span>
      )}
      {filterDistrict && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
          District: {filterDistrict}
          <button type="button" onClick={() => setFilterDistrict("")} className="text-slate-400 hover:text-slate-700">×</button>
        </span>
      )}
      {statusFilter !== "all" && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold capitalize text-slate-700">
          Status: {statusFilter}
          <button type="button" onClick={() => setStatusFilter("all")} className="text-slate-400 hover:text-slate-700">×</button>
        </span>
      )}
    </div>
  )}

  {/* Table */}
  <div className="overflow-x-auto">
    <table className="w-full min-w-[1180px] table-fixed">
      <colgroup>
        <col className="w-[6%]" />
        <col className="w-[14%]" />
        <col className="w-[16%]" />
        <col className="w-[16%]" />
        <col className="w-[14%]" />
        <col className="w-[12%]" />
        <col className="w-[16%]" />
        <col className="w-[6%]" />
      </colgroup>

      <thead>
        <tr className="border-b border-slate-200 bg-slate-50/75">
          {[
            "Sr. No.",
            "State",
            "City",
            "Hierarchy",
            "Users",
            "Created On",
            "Assigned Modules",
            "Actions",
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
          visibleCities.map((city, index) => {
            const srNo = (safeTablePage - 1) * tablePageSize + index + 1;
            const admins =
              (city.cityAdmins?.length ?? 0) > 0
                ? city.cityAdmins ?? []
                : city.cityAdmin
                  ? [city.cityAdmin]
                  : [];

            const hierarchyItems = [
              { label: city.state?.name || "No state", missing: !city.state?.name },
              { label: city.division?.name || "No division", missing: !city.division?.name },
              { label: city.district?.name || "No district", missing: !city.district?.name },
            ];

            const createdDate = city.createdAt
              ? new Date(city.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : '06 Aug 2026';

            return (
              <tr
                key={city.id}
                className="
                  group border-b border-slate-200/80
                  transition-colors last:border-b-0
                  hover:bg-blue-50/20
                "
              >
                {/* Sr. No. */}
                <td className="px-5 py-4 pl-7 align-middle text-xs font-black text-slate-700">
                  {srNo}
                </td>

                {/* State */}
                <td className="px-5 py-4 align-middle text-[13px] font-bold text-slate-700">
                  {city.state?.name || "No state"}
                </td>

                {/* City */}
                <td className="px-5 py-4 align-middle">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-900">
                      {city.name}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] font-bold text-slate-400">
                      CODE: {city.code || `ID-${city.id.slice(0, 6)}`}
                    </div>
                  </div>
                </td>

                {/* Hierarchy */}
                <td className="px-5 py-4 align-middle">
                  <div className="flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px]">
                    {[
                      { label: city.division?.name || "No division", missing: !city.division?.name },
                      { label: city.district?.name || "No district", missing: !city.district?.name },
                    ].map((item, hierarchyIndex, arr) => (
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
                          arr.length - 1 && (
                          <ChevronRight
                            size={13}
                            className="shrink-0 text-slate-300"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </td>

                {/* Identity - Hidden from UI */}
                <td className="px-5 py-4 align-middle hidden">
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

                {/* Created On */}
                <td className="px-5 py-4 align-middle">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-bold text-slate-700">{createdDate}</span>
                    <span className="text-[10px] font-semibold text-slate-400">{city.createdAt ? new Date(city.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '10:30 AM'}</span>
                  </div>
                </td>

                {/* Assigned Modules */}
                <td className="px-5 py-4 align-middle">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">Inspection & Performance</span>
                    <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700 ring-1 ring-inset ring-purple-700/10">Workforce</span>
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-700/10">Ward Ranking</span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-5 py-4 pr-7 align-middle relative group cursor-pointer">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[9px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 ml-auto">
                    <MoreVertical size={16} />
                  </div>
                  
                  {/* Dropdown */}
                  <div className="absolute right-7 top-10 z-[100] hidden w-[170px] flex-col rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg group-hover:flex">
                    <button
                      onClick={() => setEditingCity(city)}
                      className="flex w-full items-center px-4 py-2 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 text-left"
                    >
                      Edit City
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteCity(city.id, city.name)}
                        className="flex w-full items-center px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 text-left"
                      >
                        Delete City
                      </button>
                    )}
                    <div className="my-1 border-t border-slate-100"></div>
                    <button
                      className="flex w-full items-center px-4 py-2 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 text-left"
                      onClick={() => {
                        // TODO: Open Assign Modules modal
                        alert("Assign Modules implementation pending");
                      }}
                    >
                      Assign Modules
                    </button>
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
            <select
              className={selectClass}
              value={cityMasterId}
              onChange={(e) => {
                const val = e.target.value;
                setCityMasterId(val);
                const match = masterCities.find((c) => c.id === val);
                if (match) {
                  setCityCode(match.code.toLowerCase());
                  setCityUlbCode(match.code.toLowerCase());
                }
              }}
              disabled={!districtId}
              required
            >
              <option value="">{districtId ? (masterLoading ? "Loading cities..." : "Select city") : "Select district first"}</option>
              {masterCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>
          <div className="hidden">
            <FormField label="System Code">
              <input className={inputClass} value={cityCode} onChange={(e) => setCityCode(e.target.value)} placeholder="e.g. indore" />
            </FormField>
            <FormField label="ULB Identifier">
              <input className={inputClass} value={cityUlbCode} onChange={(e) => setCityUlbCode(e.target.value)} placeholder="e.g. idr01" />
            </FormField>
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
        title="Register City Admin"
        subtitle="Delegate control to local authorities"
        size="sm"
      >
        <form onSubmit={handleCreateAdmin} className="flex flex-col gap-4">
          <FormField label="City" required>
            <select className={selectClass} value={adminCityId} onChange={(e) => setAdminCityId(e.target.value)} required>
              <option value="">Select city...</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </FormField>
          <FormField label="Full Name" required>
            <input className={inputClass} value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Administrator Name" required />
          </FormField>
          <FormField label="Email Id" required>
            <input className={inputClass} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@city.local" required />
          </FormField>
          <FormField label="Enter Password" required>
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
             Create
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
          message={`Remove ${deleteTarget.adminName} from this city ? This action removes the administrator mapping immediately. If the user has no other assignments, the account will also be deleted.`}
          confirmLabel="Delete Admin"
          tone="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteAdmin}
        />
      )}

      {deleteCityTarget && (
        <ConfirmDialog
          open={!!deleteCityTarget}
          title="Delete City"
          message={`Are you sure you want to permanently delete city "${deleteCityTarget.cityName}"? This action cannot be undone and will unmap all city configurations.`}
          confirmLabel="Delete City"
          tone="danger"
          onCancel={() => setDeleteCityTarget(null)}
          onConfirm={confirmDeleteCity}
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

  // Module & Sub-Module Authorization Checkboxes State
  const [modules, setModules] = useState({
    taskforceMain: true,
    litter: true,
    sweeping: true,
    ctu: true,
    toilets: true,
    mrf: true,
    swachh: true,
    workforce: true,
  });

  const selectClass = "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:border-primary/40 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-60";
  const inputClass = selectClass;
  const readOnlyClass = "h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(city.id, {
        ...(stateId && divisionId && districtId && cityMasterId ? { stateId, divisionId, districtId, cityMasterId } : {}),
        ...(selectedMasterCity ? { name: selectedMasterCity.name } : { name: city.name }),
        code, ulbCode, adminName, adminEmail
      });
    } finally {
      setLoading(false);
    }
  };

  const activeSubModulesCount = [modules.litter, modules.sweeping, modules.ctu, modules.toilets].filter(Boolean).length;
  const totalEnabledModulesCount = [modules.taskforceMain, modules.litter, modules.sweeping, modules.ctu, modules.toilets, modules.mrf, modules.swachh, modules.workforce].filter(Boolean).length;

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit city"
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

        {/* <div className="grid grid-cols-2 gap-4">
          <FormField label="City Code" required>
            <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} required />
          </FormField>
          <FormField label="ULB Code" required>
            <input className={inputClass} value={ulbCode} onChange={(e) => setUlbCode(e.target.value)} required />
          </FormField>
        </div> */}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Admin Name">
            <input className={inputClass} value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          </FormField>
          <FormField label="Admin Email">
            <input className={inputClass} type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
          </FormField>
        </div>

        {/* ── AUTHORIZED PLATFORM MODULES & SUB-MODULES CONTAINER ── */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Authorized Platform Modules & Sub-Modules <span className="text-rose-500">*</span>
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-0.5 text-[11px] font-black text-blue-700">
              {totalEnabledModulesCount} Enabled
            </span>
          </div>

          {/* 1. Taskforce 20 Suite Container */}
          <div className="rounded-xl border border-blue-100 bg-white p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <label className="flex items-center gap-2.5 font-extrabold text-slate-900 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={modules.taskforceMain}
                  onChange={(e) => setModules(prev => ({ ...prev, taskforceMain: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-blue-900 font-black">Taskforce 20 Combined Monitoring Suite</span>
              </label>
              <span className="text-[10px] font-bold text-blue-600">
                {activeSubModulesCount} / 4 Sub-Modules
              </span>
            </div>

            {/* 4 Sub-Modules Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-blue-50/50 transition">
                <input
                  type="checkbox"
                  checked={modules.litter}
                  onChange={(e) => setModules(prev => ({ ...prev, litter: e.target.checked }))}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Litter Bins Collection
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-blue-50/50 transition">
                <input
                  type="checkbox"
                  checked={modules.sweeping}
                  onChange={(e) => setModules(prev => ({ ...prev, sweeping: e.target.checked }))}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Beat Sweeping & Sanitation
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-blue-50/50 transition">
                <input
                  type="checkbox"
                  checked={modules.ctu}
                  onChange={(e) => setModules(prev => ({ ...prev, ctu: e.target.checked }))}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                CTU / GVP Spot Transformation
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-blue-50/50 transition">
                <input
                  type="checkbox"
                  checked={modules.toilets}
                  onChange={(e) => setModules(prev => ({ ...prev, toilets: e.target.checked }))}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Cleanliness of Toilets (CT/PT)
              </label>
            </div>
          </div>

          {/* 2. Governance Platforms */}
          <div className="space-y-2.5 pt-1">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
              Governance Platforms
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/60 px-3.5 py-2.5 text-xs font-black text-amber-900 cursor-pointer hover:bg-amber-100/60 transition">
                <input
                  type="checkbox"
                  checked={modules.mrf}
                  onChange={(e) => setModules(prev => ({ ...prev, mrf: e.target.checked }))}
                  className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                Processing & MRF Telemetry
              </label>

              <label className="flex items-center gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-3.5 py-2.5 text-xs font-black text-emerald-900 cursor-pointer hover:bg-emerald-100/60 transition">
                <input
                  type="checkbox"
                  checked={modules.swachh}
                  onChange={(e) => setModules(prev => ({ ...prev, swachh: e.target.checked }))}
                  className="h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                />
                Swachh Ward Ranking System
              </label>

              <label className="flex items-center gap-2.5 rounded-xl border border-purple-200/80 bg-purple-50/60 px-3.5 py-2.5 text-xs font-black text-purple-900 cursor-pointer hover:bg-purple-100/60 transition sm:col-span-2">
                <input
                  type="checkbox"
                  checked={modules.workforce}
                  onChange={(e) => setModules(prev => ({ ...prev, workforce: e.target.checked }))}
                  className="h-4 w-4 rounded border-purple-400 text-purple-600 focus:ring-purple-500"
                />
                Workforce Monitoring (Matrix Track)
              </label>
            </div>
          </div>
        </div>

        <div className="mt-2 flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            Discard
          </Button>
          <Button type="submit" className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-extrabold" loading={loading}>
            Commit Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
