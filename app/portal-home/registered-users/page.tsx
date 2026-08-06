'use client';

import React, { useEffect, useMemo, useState } from "react";
import {
  Users, UserPlus, Shield, Search, Filter, RefreshCw, PlusCircle, Edit2, Trash2,
  CheckCircle2, AlertCircle, Building2, ChevronLeft, ChevronRight, X, Lock, Activity,
  Trash, Info, Eye, Layers, ShieldCheck, MapPin, Globe, Award
} from "lucide-react";
import { CityUserApi, CityApi, CityModulesApi, ApiError } from "@lib/apiClient";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [filterState, setFilterState] = useState<string>("");
  const [filterDivision, setFilterDivision] = useState<string>("");
  const [filterDistrict, setFilterDistrict] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterWorkspace, setFilterWorkspace] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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
      const [userRes, cityRes] = await Promise.all([
        CityUserApi.list().catch(() => ({ users: [] })),
        CityApi.list().catch(() => ({ cities: [] }))
      ]);

      const rawUsers = userRes.users || [];
      setUsers(rawUsers as any[]);
      setCities(cityRes.cities || []);
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
  }, [searchQuery, filterRole, filterState, filterDivision, filterDistrict, filterCity, filterWorkspace, statusFilter]);

  // Derived Filter Options
  const uniqueStates = useMemo(() => Array.from(new Set(cities.map((c) => c.state?.name).filter(Boolean))), [cities]);
  const uniqueDivisions = useMemo(() => Array.from(new Set(cities.map((c) => c.division?.name).filter(Boolean))), [cities]);
  const uniqueDistricts = useMemo(() => Array.from(new Set(cities.map((c) => c.district?.name).filter(Boolean))), [cities]);
  const uniqueCities = useMemo(() => Array.from(new Set(cities.map((c) => c.name).filter(Boolean))), [cities]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.cityName && u.cityName.toLowerCase().includes(q)) ||
          (u.role && u.role.toLowerCase().includes(q));

        const matchesRole = filterRole === "ALL" || u.role === filterRole;
        const matchesCity = !filterCity || u.cityName === filterCity;
        const matchesState = !filterState || u.stateName === filterState;
        const matchesDivision = !filterDivision || u.divisionName === filterDivision;
        const matchesDistrict = !filterDistrict || u.districtName === filterDistrict;

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

        return matchesSearch && matchesRole && matchesCity && matchesState && matchesDivision && matchesDistrict && matchesStatus && matchesWorkspace;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users, searchQuery, filterRole, filterState, filterDivision, filterDistrict, filterCity, filterWorkspace, statusFilter]);

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

  return (
    <div className="space-y-6 pb-12">
      {/* ── HEADER TITLE ROW ── */}
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

      {/* ── KPI STATS CARDS ROW ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 px-4 sm:px-5 lg:px-6">
        <div className="rounded-[18px] border border-blue-100 bg-blue-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-black uppercase text-blue-600 tracking-wider">Total Registered</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{users.length}</div>
          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Personnel in System</div>
        </div>

        <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-black uppercase text-emerald-600 tracking-wider">Active Personnel</div>
          <div className="mt-1 text-2xl font-black text-slate-900">
            {users.filter(u => u.enabled !== false).length}
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Active Shift Users</div>
        </div>

        <div className="rounded-[18px] border border-purple-100 bg-purple-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-black uppercase text-purple-600 tracking-wider">Quality Control & Officers</div>
          <div className="mt-1 text-2xl font-black text-slate-900">
            {users.filter(u => u.role === 'QC' || u.role === 'ACTION_OFFICER').length}
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Auditors & Officers</div>
        </div>

        <div className="rounded-[18px] border border-amber-100 bg-amber-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-black uppercase text-amber-600 tracking-wider">Supervisors & Staff</div>
          <div className="mt-1 text-2xl font-black text-slate-900">
            {users.filter(u => u.role === 'SUPERVISOR' || u.role === 'EMPLOYEE').length}
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Field Workforce Team</div>
        </div>
      </div>

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
        {(searchQuery || filterRole !== "ALL" || filterWorkspace !== "ALL" || filterCity || filterState || statusFilter !== "ALL") && (
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
          </div>
        )}

        {/* ── USERS TABLE ── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] table-fixed">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[22%]" />
              <col className="w-[16%]" />
              <col className="w-[28%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[6%]" />
            </colgroup>

            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75">
                {["Sr. No.", "Personnel Profile", "User Role", "Assigned Systems", "Date Created On", "Status", "Control"].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500 first:pl-7 last:pr-7">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-7 py-5"><div className="h-8 animate-pulse rounded-lg bg-slate-100" /></td></tr>
                ))
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-7 py-12 text-center text-xs font-semibold text-slate-400">
                    No registered users match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, index) => {
                  const srNo = (safePage - 1) * pageSize + index + 1;
                  const initial = (u.name || "U").charAt(0).toUpperCase();
                  const createdDate = u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '06 Aug 2026';

                  const userModules = u.modules || [];
                  const isLive = u.enabled !== false;

                  return (
                    <tr key={u.id} className="group hover:bg-blue-50/20 transition">
                      {/* Sr. No. */}
                      <td className="px-5 py-4 pl-7 align-middle text-xs font-black text-slate-700">
                        {srNo}
                      </td>

                      {/* User Profile */}
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-black text-white shadow-xs">
                            {initial}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black text-slate-900">{u.name}</div>
                            <div className="mt-0.5 truncate text-xs font-semibold text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Global Role */}
                      <td className="px-5 py-4 align-middle">
                        <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase ${getRoleBadgeStyle(u.role)}`}>
                          {u.role}
                        </span>
                      </td>

                      {/* Assigned Workspaces & Modules */}
                      <td className="px-5 py-4 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Inspection & Performance System
                          </span>
                          <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Ward Ranking System
                          </span>
                          <span className="inline-flex items-center rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                            Workforce Attendance System
                          </span>
                        </div>
                      </td>

                      {/* Date Created On */}
                      <td className="px-5 py-4 align-middle text-xs font-extrabold text-slate-700">
                        {createdDate}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 align-middle">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${isLive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {isLive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Control */}
                      <td className="px-5 py-4 pr-7 align-middle">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingUser(u)}
                            title="Edit User Configuration"
                            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            title="Delete User"
                            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-rose-200 bg-rose-50 text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700"
                          >
                            <Trash2 size={14} />
                          </button>
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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await CityUserApi.update(user.id, {
        name,
        role: role as any
      });
      await onSave();
    } catch {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Edit User Access" subtitle={user.email} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
          <input
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            value={email}
            disabled
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">System Role</label>
          <select
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
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
          <label className="block text-xs font-bold text-slate-700 mb-1">New Password (Optional)</label>
          <input
            type="password"
            placeholder="Leave blank to keep same"
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="pt-3 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex-1 h-10 rounded-lg bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-500"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
