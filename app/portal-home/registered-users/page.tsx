'use client';

import React, { useEffect, useMemo, useState } from "react";
import {
  Users, UserPlus, Shield, Search, Filter, RefreshCw, PlusCircle, Edit2, Trash2,
  CheckCircle2, AlertCircle, Building2, ChevronLeft, ChevronRight, X, Lock, Activity,
  Trash, Info, Eye, Layers, ShieldCheck, MapPin, Globe, Award, Map, MoreVertical
} from "lucide-react";
import { CityUserApi, CityApi, CityModulesApi, GeoApi, ApiError, apiFetch } from "@lib/apiClient";
import { useToast } from "@components/ui/ToastProvider";
import { ConfirmDialog } from "@components/ui/ConfirmDialog";
import { Modal } from "@components/ui/Modal";

type Role =
  | "HMS_SUPER_ADMIN"
  | "COMMISSIONER"
  | "CITY_ADMIN"
  | "QC"
  | "ACTION_OFFICER"
  | "SUPERVISOR"
  | "EMPLOYEE";

type UserModule = {
  id: string;
  key: string;
  name: string;
  canWrite: boolean;
};

type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  cityId?: string;
  cityName?: string;
  zoneId?: string;
  zoneName?: string;
  wardId?: string;
  wardName?: string;
  zoneIds?: string[];
  wardIds?: string[];
  city?: any;
  zone?: any;
  ward?: any;
  stateName?: string;
  divisionName?: string;
  districtName?: string;
  createdAt: string;
  enabled?: boolean;
  modules?: UserModule[];
  assignedModules?: string[];
  permissions?: string[];
};

export default function RegisteredUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [geoMap, setGeoMap] = useState<Record<string, string>>({});
  const [cityMap, setCityMap] = useState<Record<string, string>>({});
  const [fullCityMap, setFullCityMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active 3-dots action menu user ID
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [filterState, setFilterState] = useState<string>("");
  const [filterDivision, setFilterDivision] = useState<string>("");
  const [filterDistrict, setFilterDistrict] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterWorkspace, setFilterWorkspace] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("");

  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Edit / Delete Modal State
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, cityRes, zoneRes, wardRes, areaRes] = await Promise.all([
        CityUserApi.list().catch(() => ({ users: [] })),
        CityApi.list().catch(() => ({ cities: [] })),
        apiFetch<{ nodes: any[] }>("/city/geo?level=ZONE").catch(() => ({ nodes: [] })),
        apiFetch<{ nodes: any[] }>("/city/geo?level=WARD").catch(() => ({ nodes: [] })),
        apiFetch<{ nodes: any[] }>("/city/geo?level=AREA").catch(() => ({ nodes: [] }))
      ]);

      const rawUsers = userRes.users || [];
      const fetchedCities = cityRes.cities || [];
      const allNodes = [
        ...((zoneRes as any)?.nodes || []),
        ...((wardRes as any)?.nodes || []),
        ...((areaRes as any)?.nodes || [])
      ];

      const cMap: Record<string, string> = {};
      const fCityMap: Record<string, any> = {};
      fetchedCities.forEach((c: any) => {
        if (c.id && c.name) cMap[c.id] = c.name;
        if (c.id) fCityMap[c.id] = c;
      });

      const gMap: Record<string, string> = {};
      allNodes.forEach((n: any) => {
        if (n.id && n.name) gMap[n.id] = n.name;
      });

      setUsers(rawUsers as any[]);
      setCities(fetchedCities);
      setCityMap(cMap);
      setFullCityMap(fCityMap);
      setGeoMap(gMap);
    } catch (err: any) {
      setError(err?.message || "Failed to load registered users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterRole, filterState, filterDivision, filterDistrict, filterCity, filterWorkspace, statusFilter, filterDate]);

  // Derived Filter Options
  const uniqueStates = useMemo(() => Array.from(new Set(cities.map((c) => c.state?.name).filter(Boolean))), [cities]);
  const uniqueDivisions = useMemo(() => Array.from(new Set(cities.map((c) => c.division?.name).filter(Boolean))), [cities]);
  const uniqueDistricts = useMemo(() => Array.from(new Set(cities.map((c) => c.district?.name).filter(Boolean))), [cities]);
  const uniqueCities = useMemo(() => Array.from(new Set(cities.map((c) => c.name).filter(Boolean))), [cities]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const uCity = fullCityMap[u.cityId || ''] || {};
        const uCityName = u.cityName || u.city?.name || uCity.name || 'Indore';
        const uStateName = u.stateName || uCity.state?.name || 'Madhya Pradesh';
        const uDivName = u.divisionName || uCity.division?.name;
        const uDistName = u.districtName || uCity.district?.name;

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (uCityName && uCityName.toLowerCase().includes(q)) ||
          (u.role && u.role.toLowerCase().includes(q));

        const matchesRole = filterRole === "ALL" || u.role === filterRole;
        const matchesCity = !filterCity || uCityName === filterCity;
        const matchesState = !filterState || uStateName === filterState;
        const matchesDivision = !filterDivision || uDivName === filterDivision;
        const matchesDistrict = !filterDistrict || uDistName === filterDistrict;

        const matchesDate =
          !filterDate ||
          (u.createdAt && u.createdAt.startsWith(filterDate));

        const isLive = u.enabled !== false;
        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "active" && isLive) ||
          (statusFilter === "inactive" && !isLive);

        // Workspace module check
        const rolesAndPerms = [
          u.role,
          ...(u.permissions || []),
          ...(u.assignedModules || []),
          ...(u.modules || []).map(m => m.key || m.name)
        ].map(r => String(r).toUpperCase());

        const matchesWorkspace =
          filterWorkspace === "ALL" ||
          (filterWorkspace === "TASKFORCE" && rolesAndPerms.some(r => r.includes("TASKFORCE") || r.includes("SWEEPING") || r.includes("LITTER") || r.includes("TOILET") || r.includes("CITY_ADMIN"))) ||
          (filterWorkspace === "SWACHH" && rolesAndPerms.some(r => r.includes("SWACHH") || r.includes("RANKING") || r.includes("WARD"))) ||
          (filterWorkspace === "WORKFORCE" && rolesAndPerms.some(r => r.includes("WORKFORCE") || r.includes("MATRIX")));

        return matchesSearch && matchesRole && matchesCity && matchesState && matchesDivision && matchesDistrict && matchesStatus && matchesWorkspace && matchesDate;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users, searchQuery, filterRole, filterState, filterDivision, filterDistrict, filterCity, filterWorkspace, statusFilter, filterDate]);

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredUsers, safePage, pageSize]);

  // Delete User Confirmation
  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await CityUserApi.remove(deleteTarget.id);
      showToast({ title: "User deleted", description: `${deleteTarget.name} was removed.`, tone: "success" });
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      showToast({ title: "Delete failed", description: err?.message || "Failed to delete user.", tone: "error" });
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'HMS_SUPER_ADMIN': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'COMMISSIONER': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'CITY_ADMIN': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'QC': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ACTION_OFFICER': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'SUPERVISOR': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Hide header row if displayed inside nested context (i.e. URL path is common-registration)
  const isNested = typeof window !== 'undefined' && window.location.pathname.includes('common-registration');

  return (
    <div className="space-y-6 pb-12">
      {/* ── HEADER TITLE ROW ── */}
      {!isNested && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 lg:px-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <Users size={22} />
              </span>
              Registered Users Directory
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Overview and access configuration for all employees and officials registered via User Registration
            </p>
          </div>

          <button
            onClick={() => window.location.href = '/portal-home/common-registration'}
            className="
              inline-flex h-11 shrink-0 items-center justify-center gap-2
              rounded-[11px] bg-blue-600 px-5
              text-xs font-extrabold text-white
              shadow-[0_10px_20px_-12px_rgba(37,99,235,0.75)]
              hover:bg-blue-500 transition
            "
          >
            <UserPlus size={16} />
            Register New Employee
          </button>
        </div>
      )}

      {/* ── FILTER TOOLBAR ROW (SEARCH, ROLE DROPDOWN, WORKSPACE DROPDOWN, HIERARCHY) ── */}
      <div className="mx-4 sm:mx-5 lg:mx-6 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 lg:px-7">
          {/* Search Box */}
          <div className="relative min-w-0 flex-1 sm:min-w-[240px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user name, email, city..."
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700">×</button>
            )}
          </div>

          {/* Role Filter Dropdown */}
          <div className="relative min-w-[150px]">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400"
            >
              <option value="ALL">All Roles</option>
              <option value="HMS_SUPER_ADMIN">Super Admin</option>
              <option value="COMMISSIONER">Commissioner</option>
              <option value="CITY_ADMIN">City Admin</option>
              <option value="QC">Quality Controller (QC)</option>
              <option value="ACTION_OFFICER">Action Officer</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="EMPLOYEE">Field Employee</option>
            </select>
          </div>

          {/* Workspace Filter Dropdown */}
          <div className="relative min-w-[170px]">
            <select
              value={filterWorkspace}
              onChange={(e) => setFilterWorkspace(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400"
            >
              <option value="ALL">All Systems</option>
              <option value="TASKFORCE">Inspection & Performance System</option>
              <option value="SWACHH">Ward Ranking System</option>
              <option value="WORKFORCE">Workforce Attendance System</option>
            </select>
          </div>

          {/* State Filter */}
          <div className="relative min-w-[130px]">
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400"
            >
              <option value="">All States</option>
              {uniqueStates.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div className="relative min-w-[130px]">
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400"
            >
              <option value="">All Cities</option>
              {uniqueCities.map((ct) => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative min-w-[140px]">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400"
            />
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[120px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Active Filter Pills Bar */}
        {(searchQuery || filterRole !== "ALL" || filterWorkspace !== "ALL" || filterCity || filterState || statusFilter !== "ALL" || filterDate) && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2 lg:px-7">
            <span className="text-xs font-bold text-slate-400">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                Search: {searchQuery}
                <button type="button" onClick={() => setSearchQuery("")} className="text-blue-400 hover:text-blue-700">×</button>
              </span>
            )}
            {filterRole !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                Role: {filterRole}
                <button type="button" onClick={() => setFilterRole("ALL")} className="text-slate-400 hover:text-slate-700">×</button>
              </span>
            )}
            {filterWorkspace !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                Workspace: {filterWorkspace}
                <button type="button" onClick={() => setFilterWorkspace("ALL")} className="text-slate-400 hover:text-slate-700">×</button>
              </span>
            )}
            {filterCity && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                City: {filterCity}
                <button type="button" onClick={() => setFilterCity("")} className="text-slate-400 hover:text-slate-700">×</button>
              </span>
            )}
            {filterDate && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                Date: {filterDate}
                <button type="button" onClick={() => setFilterDate("")} className="text-slate-400 hover:text-slate-700">×</button>
              </span>
            )}
          </div>
        )}

        {/* ── USERS TABLE ── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] table-fixed">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[13%]" />
              <col className="w-[15%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[7%]" />
            </colgroup>

            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75">
                {["SR. NO.", "USER NAME", "USER EMAIL", "USER ROLE", "STATE & CITY", "ZONE & WARD", "ASSIGNED MODULES", "DATE CREATED ON", "CONTROL"].map((h) => (
                  <th key={h} className="px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500 first:pl-5 last:pr-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="px-6 py-4"><div className="h-8 animate-pulse rounded-lg bg-slate-100" /></td></tr>
                ))
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-xs font-semibold text-slate-400">
                    No registered users match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, index) => {
                  const srNo = (safePage - 1) * pageSize + index + 1;
                  const createdDate = u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '06 Aug 2026';
                  const createdTime = u.createdAt
                    ? new Date(u.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '12:45 PM';

                  const cleanGeoLabel = (val: any, prefix: string, idx: number) => {
                    if (!val) return `${prefix} ${idx + 1}`;
                    const str = String(val).trim();
                    if (geoMap[str]) return geoMap[str];
                    if (str.length > 20 || str.includes('-') || str.startsWith('PT')) {
                      return `${prefix} ${idx + 1}`;
                    }
                    return str;
                  };

                  const stateText = u.stateName || 'Madhya Pradesh';
                  const cityText = u.cityName || u.city?.name || cityMap[u.cityId || ''] || 'Indore';
                  const rawZone = u.zoneName || u.zone?.name || (u.zoneIds && u.zoneIds.length > 0 ? u.zoneIds.map((id: string, i: number) => cleanGeoLabel(id, 'Zone', i)).join(', ') : 'Zone 1');
                  const rawWard = u.wardName || u.ward?.name || (u.wardIds && u.wardIds.length > 0 ? u.wardIds.map((id: string, i: number) => cleanGeoLabel(id, 'Ward', i)).join(', ') : 'Ward 1');
                  const zoneText = cleanGeoLabel(rawZone, 'Zone', index);
                  const wardText = cleanGeoLabel(rawWard, 'Ward', index);

                  return (
                    <tr key={u.id} className="group hover:bg-blue-50/20 transition">
                      {/* Sr. No. */}
                      <td className="px-3 py-3 pl-5 align-middle text-xs font-black text-slate-700">
                        {srNo}
                      </td>

                      {/* User Name (Avatar icon removed as requested) */}
                      <td className="px-3 py-3 align-middle">
                        <span className="truncate text-xs font-black text-slate-900 block">{u.name}</span>
                      </td>

                      {/* User Email */}
                      <td className="px-3 py-3 align-middle">
                        <span className="truncate text-xs font-semibold text-slate-600 block">{u.email}</span>
                      </td>

                      {/* User Role */}
                      <td className="px-3 py-3 align-middle">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${getRoleBadgeStyle(u.role)}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* State & City */}
                      <td className="px-3 py-3 align-middle">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-extrabold text-slate-800 flex items-center gap-1">
                            <Globe size={11} className="text-emerald-600 shrink-0" />
                            {stateText}
                          </span>
                          <span className="font-semibold text-slate-600 flex items-center gap-1 text-[11px]">
                            <Building2 size={11} className="text-blue-600 shrink-0" />
                            {cityText}
                          </span>
                        </div>
                      </td>

                      {/* Zone & Ward */}
                      <td className="px-3 py-3 align-middle">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-semibold text-slate-600 flex items-center gap-1 text-[11px]">
                            <Map size={11} className="text-indigo-500 shrink-0" />
                            {zoneText}
                          </span>
                          <span className="font-semibold text-slate-600 flex items-center gap-1 text-[11px]">
                            <MapPin size={11} className="text-amber-500 shrink-0" />
                            {wardText}
                          </span>
                        </div>
                      </td>

                      {/* Assigned Modules - Inspection & Performance System Modules only */}
                      <td className="px-3 py-3 align-middle">
                         <div className="flex flex-wrap items-center gap-1">
                           {(() => {
                             // Collect only Inspection & Performance System (Taskforce) modules
                             const allowedTaskforceKeys = ["TOILET", "SWEEPING", "LITTERBINS", "TASKFORCE", "LITTERBIN"];
                             const mods: string[] = [];
                             if (u.modules && u.modules.length > 0) {
                               u.modules.forEach((m: any) => {
                                 const keyUpper = String(m.key || m.id || m.name || '').toUpperCase();
                                 if (allowedTaskforceKeys.some(tk => keyUpper.includes(tk))) {
                                   mods.push(m.name || m.key);
                                 }
                               });
                             } else if (u.assignedModules && u.assignedModules.length > 0) {
                               u.assignedModules.forEach((mKey: string) => {
                                 const keyUpper = String(mKey).toUpperCase();
                                 if (allowedTaskforceKeys.some(tk => keyUpper.includes(tk))) {
                                   mods.push(mKey);
                                 }
                               });
                             }
                             if (mods.length === 0) {
                               return <span className="text-[10px] font-semibold text-slate-400 italic">None</span>;
                             }
                             const colors = ['blue', 'emerald', 'purple', 'orange', 'amber'];
                             return mods.slice(0, 3).map((mod, mi) => {
                               const c = colors[mi % colors.length];
                               // Display labels cleanly
                               let displayLabel = mod;
                               if (mod.toUpperCase() === "SWEEPING") displayLabel = "Sweeping";
                               if (mod.toUpperCase().includes("LITTER")) displayLabel = "Litter Bins";
                               if (mod.toUpperCase().includes("TOILET")) displayLabel = "Cleanliness of Toilets";
                               if (mod.toUpperCase() === "TASKFORCE" || mod.toUpperCase().includes("CTU")) displayLabel = "CTU / GVP Transformation";
                               return (
                                 <span key={mi} className={`inline-flex items-center rounded-md border border-${c}-200 bg-${c}-50 px-2 py-0.5 text-[10px] font-bold text-${c}-700`}>
                                   {displayLabel}
                                 </span>
                               );
                             }).concat(mods.length > 3 ? [
                               <span key="more" className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                 +{mods.length - 3}
                               </span>
                             ] : []);
                           })()}
                         </div>
                      </td>

                      {/* Date Created On (Date + Time) */}
                      <td className="px-3 py-3 align-middle">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{createdDate}</span>
                          <span className="text-[10px] font-semibold text-slate-400">{createdTime}</span>
                        </div>
                      </td>

                      {/* Control (3-Dots Dropdown Menu - Fully visible) */}
                      <td className="px-3 py-3 pr-5 align-middle relative">
                        <div className="relative flex justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveMenuUserId(activeMenuUserId === u.id ? null : u.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer shadow-xs"
                            title="Actions Menu"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {activeMenuUserId === u.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => { setEditingUser(u); setActiveMenuUserId(null); }}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition w-full text-left cursor-pointer"
                              >
                                <Edit2 size={13} /> Edit User
                              </button>
                              <button
                                type="button"
                                onClick={() => { setActiveMenuUserId(null); showToast({ title: u.name, description: `Email: ${u.email} | Role: ${u.role}`, tone: "info" }); }}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition w-full text-left cursor-pointer"
                              >
                                <Eye size={13} /> View Details
                              </button>
                              <button
                                type="button"
                                onClick={() => { setDeleteTarget(u); setActiveMenuUserId(null); }}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition w-full text-left cursor-pointer"
                              >
                                <Trash2 size={13} /> Delete User
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION FOOTER ── */}
        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 lg:px-7">
            <div className="text-xs font-bold text-slate-500">
              Showing {(safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filteredUsers.length)} of {filteredUsers.length} personnel
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                <ChevronLeft size={14} className="mr-1" /> Previous
              </button>

              <span className="text-xs font-extrabold text-slate-800 px-2">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next <ChevronRight size={14} className="ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── DELETE USER CONFIRM DIALOG ── */}
      {deleteTarget && (
        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete User"
          message={`Are you sure you want to permanently delete registered user "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Delete User"
          tone="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteUser}
        />
      )}

      {/* ── EDIT USER CONFIGURATION MODAL ── */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={async () => {
            await loadData();
            setEditingUser(null);
            showToast({ title: "User updated", description: "User configuration saved successfully.", tone: "success" });
          }}
        />
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onSave }: { user: UserRecord; onClose: () => void; onSave: () => Promise<void> }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [password, setPassword] = useState("");
  
  const [assignedModules, setAssignedModules] = useState<string[]>(user.assignedModules || []);
  const [zoneIds, setZoneIds] = useState<string[]>(user.zoneIds || (user.zoneId ? [user.zoneId] : []));
  const [wardIds, setWardIds] = useState<string[]>(user.wardIds || (user.wardId ? [user.wardId] : []));

  const [zones, setZones] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [zonesRes, wardsRes, modsRes] = await Promise.all([
          apiFetch<{ nodes: any[] }>("/city/geo?level=ZONE").catch(() => ({ nodes: [] })),
          apiFetch<{ nodes: any[] }>("/city/geo?level=WARD").catch(() => ({ nodes: [] })),
          CityModulesApi.list().catch(() => [])
        ]);
        setZones(zonesRes.nodes || []);
        setWards(wardsRes.nodes || []);
        
        const fetchedMods = modsRes || [];
        setModules(fetchedMods.length > 0 ? fetchedMods : [
          { id: 'TASKFORCE', name: 'CTU / GVP Transformation' },
          { id: 'LITTERBINS', name: 'Litterbin Inspection' },
          { id: 'TOILET', name: 'Cleanliness of Toilet' },
          { id: 'SWEEPING', name: 'Sweeping Management' }
        ]);
      } catch (err) {
        console.error("Failed to load options", err);
      } finally {
        setFetchingData(false);
      }
    }
    fetchData();
  }, []);

  const toggleModule = (modId: string) => {
    setAssignedModules(prev => prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]);
  };

  const toggleZone = (zId: string) => {
    setZoneIds(prev => prev.includes(zId) ? prev.filter(id => id !== zId) : [...prev, zId]);
  };

  const toggleWard = (wId: string) => {
    setWardIds(prev => prev.includes(wId) ? prev.filter(id => id !== wId) : [...prev, wId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const mappedModules = assignedModules.map(modId => ({
        moduleId: modId,
        canWrite: true,
        zoneIds,
        wardIds
      }));

      await CityUserApi.update(user.id, {
        name,
        role: role as any,
        modules: mappedModules,
        zoneIds,
        wardIds
      });
      await onSave();
    } catch {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit User & Access Permissions" subtitle={user.email} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address (Read-only)</label>
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-500 outline-none cursor-not-allowed"
              value={email}
              disabled
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">System Role</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="HMS_SUPER_ADMIN">Super Admin</option>
              <option value="COMMISSIONER">Commissioner</option>
              <option value="CITY_ADMIN">City Admin</option>
              <option value="QC">Quality Controller (QC)</option>
              <option value="ACTION_OFFICER">Action Officer</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="EMPLOYEE">Field Employee</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reset Password (Optional)</label>
            <input
              type="password"
              placeholder="Leave blank to keep current password"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {/* Assigned Workspace Modules Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Assigned Workspace Modules <span className="text-slate-400 font-normal">(Click to toggle access)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {/* Primary Modules list */}
            {(() => {
              // Primary Main Systems
              const mainSystems = [
                { id: "TASKFORCE_20", name: "Inspection & Performance System" },
                { id: "SWACHH_RANKING", name: "Ward Ranking System" },
                { id: "WORKFORCE_MONITORING", name: "Workforce Attendance System" },
                { id: "PROCESSING_MRF", name: "Processing Plant System" }
              ];

              // Check which systems are currently selected. We map base modules inside matching roles.
              // If TASKFORCE (ctu/sweeping/litter/toilet) are checked, TASKFORCE_20 system is active.
              const isTaskforceActive = assignedModules.some(m => ["TASKFORCE", "LITTERBINS", "TOILET", "SWEEPING", "LITTERBIN"].includes(m.toUpperCase()));
              const isSwachhActive = assignedModules.some(m => ["SWACHH", "SWACHH_RANKING", "WARD_RANKING"].includes(m.toUpperCase()));
              const isWorkforceActive = assignedModules.some(m => ["WORKFORCE", "MATRIX"].includes(m.toUpperCase()));
              const isProcessingActive = assignedModules.some(m => ["PROCESSING"].includes(m.toUpperCase()));

              const toggleMainSystem = (sysId: string) => {
                if (sysId === "TASKFORCE_20") {
                  if (isTaskforceActive) {
                    // Turn off all taskforce sub-modules
                    setAssignedModules(prev => prev.filter(m => !["TASKFORCE", "LITTERBINS", "TOILET", "SWEEPING", "LITTERBIN"].includes(m.toUpperCase())));
                  } else {
                    // Turn on default taskforce modules
                    setAssignedModules(prev => [...prev, "TASKFORCE", "LITTERBINS", "TOILET", "SWEEPING"]);
                  }
                } else if (sysId === "SWACHH_RANKING") {
                  if (isSwachhActive) {
                    setAssignedModules(prev => prev.filter(m => !["SWACHH", "SWACHH_RANKING", "WARD_RANKING"].includes(m.toUpperCase())));
                  } else {
                    setAssignedModules(prev => [...prev, "SWACHH_RANKING"]);
                  }
                } else if (sysId === "WORKFORCE_MONITORING") {
                  if (isWorkforceActive) {
                    setAssignedModules(prev => prev.filter(m => !["WORKFORCE", "MATRIX"].includes(m.toUpperCase())));
                  } else {
                    setAssignedModules(prev => [...prev, "WORKFORCE"]);
                  }
                } else if (sysId === "PROCESSING_MRF") {
                  if (isProcessingActive) {
                    setAssignedModules(prev => prev.filter(m => !["PROCESSING"].includes(m.toUpperCase())));
                  } else {
                    setAssignedModules(prev => [...prev, "PROCESSING"]);
                  }
                }
              };

              return (
                <>
                  {mainSystems.map(sys => {
                    let isSelected = false;
                    if (sys.id === "TASKFORCE_20") isSelected = isTaskforceActive;
                    if (sys.id === "SWACHH_RANKING") isSelected = isSwachhActive;
                    if (sys.id === "WORKFORCE_MONITORING") isSelected = isWorkforceActive;
                    if (sys.id === "PROCESSING_MRF") isSelected = isProcessingActive;

                    return (
                      <div key={sys.id} className="col-span-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-3">
                        <button
                          type="button"
                          onClick={() => toggleMainSystem(sys.id)}
                          className={`w-full px-3 py-2.5 rounded-xl border text-xs font-black flex items-center justify-between transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{sys.name}</span>
                          <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && '✓'}
                          </span>
                        </button>

                        {/* If Inspection & Performance System is checked, show sub-modules */}
                        {sys.id === "TASKFORCE_20" && isSelected && (
                          <div className="pl-4 pt-1 border-l-2 border-blue-200 grid grid-cols-2 gap-2">
                            {[
                              { id: "LITTERBINS", name: "Litter Bins" },
                              { id: "SWEEPING", name: "Sweeping" },
                              { id: "TOILET", name: "Cleanliness of Toilets" },
                              { id: "TASKFORCE", name: "CTU / GVP Transformation" }
                            ].map(sub => {
                              const isSubSelected = assignedModules.some(m => String(m).toUpperCase().includes(sub.id));
                              const toggleSub = () => {
                                setAssignedModules(prev => {
                                  // Find any match in array regardless of casing
                                  const exists = prev.some(m => String(m).toUpperCase().includes(sub.id));
                                  if (exists) {
                                    return prev.filter(m => !String(m).toUpperCase().includes(sub.id));
                                  } else {
                                    return [...prev, sub.id];
                                  }
                                });
                              };
                              return (
                                <button
                                  type="button"
                                  key={sub.id}
                                  onClick={toggleSub}
                                  className={`px-3 py-2 rounded-lg border text-[11px] font-bold flex items-center justify-between transition-all ${
                                    isSubSelected
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                  }`}
                                >
                                  <span>{sub.name}</span>
                                  <input
                                    type="checkbox"
                                    checked={isSubSelected}
                                    onChange={() => {}}
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>

        {/* Geographic Access Control (Zones & Wards) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assigned Zones <span className="text-slate-400 font-normal">({zoneIds.length} selected)</span>
            </label>
            <div className="h-32 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1">
              {zones.length === 0 ? (
                <span className="text-xs text-slate-400 p-2 block">No zones available</span>
              ) : zones.map(z => {
                const isSelected = zoneIds.includes(z.id);
                return (
                  <label
                    key={z.id}
                    onClick={() => toggleZone(z.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-100 text-blue-800 font-bold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{z.name}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assigned Wards <span className="text-slate-400 font-normal">({wardIds.length} selected)</span>
            </label>
            <div className="h-32 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1">
              {wards.length === 0 ? (
                <span className="text-xs text-slate-400 p-2 block">No wards available</span>
              ) : wards.map(w => {
                const isSelected = wardIds.includes(w.id);
                return (
                  <label
                    key={w.id}
                    onClick={() => toggleWard(w.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-100 text-indigo-800 font-bold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{w.name}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pt-3 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            {loading ? "Saving access..." : "Save Access Permissions"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
