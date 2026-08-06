'use client';

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { ApiError, CityModulesApi, CityUserApi, GeoApi } from "@lib/apiClient";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@hooks/useAuth";
import type { Role } from "../../../types/auth";
import { RoleGuard } from "@components/Guards";
import { roleLabel, moduleLabel } from "@lib/labels";
import { canonicalizeModules, normalizeModuleKey } from "@utils/modules";
import {
  Users, UserPlus, Shield, MapPin,
  Settings, Save, Trash2, MoreHorizontal,
  ChevronDown, ChevronUp, Mail, Lock,
  Globe, CheckCircle2, AlertCircle, Search,
  ArrowRight, ShieldCheck, UserCog, X, Download, FileSpreadsheet, FileText
} from "lucide-react";

type CityModule = { id: string; key: string; name: string; enabled?: boolean };
type UserModule = { id: string; key: string; name: string; canWrite: boolean; zoneIds?: string[]; wardIds?: string[] };
type CityUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  modules: UserModule[];
  zoneIds?: string[];
  wardIds?: string[];
};
type EditableUser = {
  name: string;
  role: Role;
  modules: Record<string, { canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }>;
  zoneIds: Set<string>;
  wardIds: Set<string>;
};

const allowedRoles: Role[] = ["COMMISSIONER", "ACTION_OFFICER", "QC", "SUPERVISOR", "EMPLOYEE"];
const enforceRoleWriteRules = (
  role: Role,
  modules: Record<string, { canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }>
) => modules;
const toModuleMap = (modules: UserModule[] = []) =>
  modules.reduce<Record<string, { canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }>>((acc, m) => {
    acc[m.id] = { canWrite: m.canWrite, zoneIds: m.zoneIds || [], wardIds: m.wardIds || [] };
    return acc;
  }, {});

export default function CityUsersPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CityUsersPage />
    </Suspense>
  );
}

function CityUsersPage() {
  const [mounted, setMounted] = useState(false);
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const isReadOnly = currentUser?.roles?.some(r => ["COMMISSIONER", "ULB_OFFICER"].includes(r));

  useEffect(() => {
    setMounted(true);
  }, []);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState<CityUser[]>([]);
  const [availableModules, setAvailableModules] = useState<CityModule[]>([]);
  const [newUserModules, setNewUserModules] = useState<Record<string, { canWrite: boolean; zoneIds?: string[]; wardIds?: string[] }>>({});
  const [newZoneIds, setNewZoneIds] = useState<Set<string>>(new Set());
  const [newWardIds, setNewWardIds] = useState<Set<string>>(new Set());
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string; parentId?: string | null }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, EditableUser>>({});
  const [editName, setEditName] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Role | "ALL">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam && (roleParam === "ALL" || allowedRoles.includes(roleParam as Role) || roleParam === "CITY_ADMIN")) {
      setActiveTab(roleParam as any);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.action-menu')) {
        setOpenActionId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { ALL: users.length, QC: 0, ACTION_OFFICER: 0, COMMISSIONER: 0, EMPLOYEE: 0, CITY_ADMIN: 0 };
    users.forEach(u => {
      if (counts[u.role] !== undefined) counts[u.role]++;
    });
    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "ALL" || (u.role as string) === activeTab;
        return matchesSearch && matchesTab;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [users, searchQuery, activeTab]);

  const displayModules = useMemo(() => {
    const keyMap = new Map<string, CityModule>();

    availableModules.forEach((m) => {
      const normKey = normalizeModuleKey(m.key);
      keyMap.set(normKey, { ...m, key: normKey });
    });

    return Array.from(keyMap.values());
  }, [availableModules]);

  const loadModules = async () => {
    setLoadingModules(true);
    try {
      const modules = await CityModulesApi.list();
      const enabledModules = canonicalizeModules(modules).filter((m) => m.enabled !== false);
      setAvailableModules(enabledModules);
    } catch (err: any) {
      setError(err?.message || "Failed to load modules");
    } finally {
      setLoadingModules(false);
    }
  };

  const loadGeo = async () => {
    setLoadingGeo(true);
    try {
      const [zonesData, wardsData] = await Promise.all([GeoApi.list("ZONE"), GeoApi.list("WARD")]);
      setZones((zonesData.nodes || []).map((z: any) => ({ id: z.id, name: z.name })));
      setWards((wardsData.nodes || []).map((w: any) => ({ id: w.id, name: w.name, parentId: w.parentId || null })));
    } catch (err: any) {
      setError(err?.message || "Failed to load zones/wards");
    } finally {
      setLoadingGeo(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setError("");
    try {
      const data = await CityUserApi.list();
      const casted = data.users as CityUser[];
      setUsers(casted);
      const editState: Record<string, EditableUser> = {};
      casted.forEach((u) => {
        editState[u.id] = {
          name: u.name,
          role: u.role,
          modules: toModuleMap(u.modules),
          zoneIds: new Set(u.zoneIds || []),
          wardIds: new Set(u.wardIds || [])
        };
      });
      setEditing(editState);
    } catch (err: any) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadModules();
    loadGeo();
    loadUsers();
  }, []);

  const updateNewModuleSelection = (moduleId: string, checked: boolean) => {
    setNewUserModules((prev) => {
      const next = { ...prev };
      if (checked) next[moduleId] = { canWrite: false, zoneIds: Array.from(newZoneIds), wardIds: Array.from(newWardIds) };
      else delete next[moduleId];
      return enforceRoleWriteRules(role, next);
    });
  };

  const updateNewModuleWrite = (moduleId: string, canWrite: boolean) => {
    setNewUserModules((prev) => {
      if (!prev[moduleId]) return prev;
      return enforceRoleWriteRules(role, { ...prev, [moduleId]: { ...prev[moduleId], canWrite } });
    });
  };

  const changeNewUserRole = (nextRole: Role) => {
    setRole(nextRole);
    setNewUserModules((prev) => enforceRoleWriteRules(nextRole, { ...prev }));
  };

  const toggleNewZone = (id: string) => {
    setNewZoneIds((prev) => {
      const next = new Set(prev);
      const isRemoving = next.has(id);
      if (isRemoving) {
        next.delete(id);
        setNewWardIds((prevWards) => {
          const nextWards = new Set(prevWards);
          wards.filter((w) => w.parentId === id).forEach((w) => nextWards.delete(w.id));
          return nextWards;
        });
      } else {
        next.add(id);
      }
      setNewUserModules((mods) =>
        role === "QC"
          ? Object.fromEntries(
            Object.entries(mods).map(([mid, val]) => [
              mid,
              {
                ...val,
                zoneIds: Array.from(next),
                wardIds: isRemoving && val.wardIds ? val.wardIds.filter((wid) => wards.find((w) => w.id === wid)?.parentId !== id) : val.wardIds
              }
            ])
          )
          : mods
      );
      return next;
    });
  };

  const toggleNewWard = (id: string) => {
    setNewWardIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      setNewUserModules((mods) =>
        role === "QC"
          ? Object.fromEntries(
            Object.entries(mods).map(([mid, val]) => [
              mid,
              { ...val, wardIds: Array.from(next), zoneIds: val.zoneIds }
            ])
          )
          : mods
      );
      return next;
    });
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving...");
    setError("");
    try {
      if (role === "QC" && (newZoneIds.size === 0 || newWardIds.size === 0)) {
        setStatus("");
        setError("QC users require at least one zone and ward");
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      const existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (existingUser) {
        setStatus("");
        setError("Error: A user with this email address already exists.");
        return;
      }
      const modules = Object.entries(newUserModules).map(([moduleId, { canWrite, zoneIds, wardIds }]) => ({
        moduleId,
        canWrite,
        ...(role === "QC" ? { zoneIds: zoneIds || Array.from(newZoneIds), wardIds: wardIds || Array.from(newWardIds) } : {})
      }));
      await CityUserApi.create({
        email,
        name,
        password,
        role,
        zoneIds: Array.from(newZoneIds),
        wardIds: Array.from(newWardIds),
        modules
      });
      setStatus("User created");
      setIsModalOpen(false);
      setEmail("");
      setName("");
      setPassword("");
      setNewUserModules({});
      setNewZoneIds(new Set());
      setNewWardIds(new Set());
      await loadUsers();
    } catch (err: any) {
      setStatus("");
      const message = err instanceof ApiError ? err.message : err?.message;
      setError(message || "Failed to create user");
    }
  };

  const updateEditingRole = (userId: string, nextRole: Role) => {
    setEditing((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      return {
        ...prev,
        [userId]: { ...current, role: nextRole, modules: enforceRoleWriteRules(nextRole, { ...current.modules }) }
      };
    });
  };

  const toggleUserModule = (userId: string, moduleId: string, checked: boolean) => {
    setEditing((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      const modules = { ...current.modules };
      if (checked)
        modules[moduleId] = {
          canWrite: false,
          zoneIds: current.role === "QC" ? Array.from(current.zoneIds) : [],
          wardIds: current.role === "QC" ? Array.from(current.wardIds) : []
        };
      else {
        delete modules[moduleId];
        const userObj = users.find((u) => u.id === userId);
        const targetMod = displayModules.find((m) => m.id === moduleId);
        if (targetMod && userObj) {
          Object.keys(modules).forEach((mid) => {
            const uMod = userObj.modules?.find((um) => um.id === mid);
            if (uMod && normalizeModuleKey(uMod.key) === normalizeModuleKey(targetMod.key)) {
              delete modules[mid];
            }
          });
        }
      }
      return { ...prev, [userId]: { ...current, modules: enforceRoleWriteRules(current.role, modules) } };
    });
  };

  const toggleUserWrite = (userId: string, moduleId: string, canWrite: boolean) => {
    setEditing((prev) => {
      const current = prev[userId];
      if (!current || !current.modules[moduleId]) return prev;
      const modules = { ...current.modules, [moduleId]: { ...current.modules[moduleId], canWrite } };
      return { ...prev, [userId]: { ...current, modules: enforceRoleWriteRules(current.role, modules) } };
    });
  };

  const toggleUserZone = (userId: string, zoneId: string) => {
    setEditing((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      const nextZones = new Set(current.zoneIds);
      let nextWards = current.wardIds;
      const isRemoving = nextZones.has(zoneId);

      if (isRemoving) {
        nextZones.delete(zoneId);
        nextWards = new Set(Array.from(current.wardIds).filter((wid) => wards.find((w) => w.id === wid)?.parentId !== zoneId));
      } else {
        nextZones.add(zoneId);
      }

      const modules =
        current.role === "QC"
          ? Object.fromEntries(
            Object.entries(current.modules).map(([mid, val]) => [
              mid,
              {
                ...val,
                zoneIds: Array.from(nextZones),
                wardIds: isRemoving && val.wardIds ? val.wardIds.filter((wid) => wards.find((w) => w.id === wid)?.parentId !== zoneId) : val.wardIds
              }
            ])
          )
          : current.modules;
      return { ...prev, [userId]: { ...current, zoneIds: nextZones, wardIds: nextWards, modules } };
    });
  };

  const toggleUserWard = (userId: string, wardId: string) => {
    setEditing((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      const nextWards = new Set(current.wardIds);
      nextWards.has(wardId) ? nextWards.delete(wardId) : nextWards.add(wardId);
      const modules =
        current.role === "QC"
          ? Object.fromEntries(
            Object.entries(current.modules).map(([mid, val]) => [
              mid,
              { ...val, wardIds: Array.from(nextWards), zoneIds: val.zoneIds }
            ])
          )
          : current.modules;
      return { ...prev, [userId]: { ...current, wardIds: nextWards, modules } };
    });
  };

  const updateUser = async (id: string) => {
    const payload = editing[id];
    if (!payload) return;
    setSavingUserId(id);
    setError("");
    try {
      const validZoneIds = new Set(zones.map((z) => z.id));
      const validWardIds = new Set(wards.map((w) => w.id));

      const cleanZoneIds = Array.from(payload.zoneIds).filter((id) => validZoneIds.has(id));
      const cleanWardIds = Array.from(payload.wardIds).filter((id) => validWardIds.has(id));

      if (payload.role === "QC" && (cleanZoneIds.length === 0 || cleanWardIds.length === 0)) {
        setError("QC users require at least one zone and ward");
        setSavingUserId(null);
        return;
      }

      // We cannot check duplicated email here easily because payload doesn't contain the editable email, only `payload.name`. To ensure a proper duplicate checker, backend is mostly responsible, but front end does basic name duplicate check (since we are on 'Edit' mode).
      const existingName = users.find(u => u.name.trim().toLowerCase() === payload.name.trim().toLowerCase() && u.id !== id);
      if (existingName) {
        setError("Error: A user with this name already exists.");
        setSavingUserId(null);
        return;
      }
      const modules = Object.entries(payload.modules).map(([moduleId, { canWrite, zoneIds, wardIds }]) => ({
        moduleId,
        canWrite,
        ...(payload.role === "QC"
          ? {
            zoneIds: zoneIds && zoneIds.length ? zoneIds.filter((id) => validZoneIds.has(id)) : cleanZoneIds,
            wardIds: wardIds && wardIds.length ? wardIds.filter((id) => validWardIds.has(id)) : cleanWardIds
          }
          : {})
      }));
      await CityUserApi.update(id, {
        name: payload.name,
        role: payload.role,
        zoneIds: cleanZoneIds,
        wardIds: cleanWardIds,
        modules
      });
      await loadUsers();
      setStatus("User updated");
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : err?.message;
      setError(message || "Failed to update user");
    } finally {
      setSavingUserId(null);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user from the city?")) return;
    setSavingUserId(id);
    setError("");
    try {
      await CityUserApi.remove(id);
      setStatus("User deleted");
      await loadUsers();
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : err?.message;
      setError(message || "Failed to delete user");
    } finally {
      setSavingUserId(null);
    }
  };

  if (!mounted) return null;

  return (
    <RoleGuard roles={["CITY_ADMIN", "HMS_SUPER_ADMIN", "COMMISSIONER", "ULB_OFFICER"]}>
      <div className="page" style={{ padding: "32px 40px", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
        <div style={{ width: "100%" }}>
          {/* Header Section */}
          <div style={{ marginBottom: "32px" }}>
            <div className="breadcrumb" style={{ fontSize: "0.875rem", color: "#64748b", display: "flex", gap: "8px", marginBottom: "8px" }}>
              <span>Governance</span>
              <span>/</span>
              <span style={{ color: "#1e293b", fontWeight: 500 }}>Municipal Personnel</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ backgroundColor: "#2563eb", padding: "12px", borderRadius: "14px", color: "white" }}>
                  <Users size={28} />
                </div>
                <h1 style={{ fontSize: "1.875rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Personnel Management
                </h1>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setDownloadOpen(!downloadOpen)}
                    style={{
                      height: "44px", padding: "0 16px", borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "white",
                      display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      transition: "all 0.2s", fontSize: "0.875rem", fontWeight: 700, color: "#475569"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "white"; }}
                  >
                    <Download size={18} />
                    Download
                  </button>
                  {downloadOpen && (
                    <div style={{
                      position: "absolute", top: "52px", right: 0, backgroundColor: "white", border: "1px solid #e2e8f0",
                      borderRadius: "12px", padding: "8px", width: "180px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
                      zIndex: 150, display: "flex", flexDirection: "column", gap: "4px"
                    }}>
                      <button
                        onClick={() => { alert("Export to Excel/CSV functionality pending"); setDownloadOpen(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px",
                          border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px", fontSize: "0.875rem",
                          fontWeight: 700, color: "#475569", textAlign: "left", transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#475569"; }}
                      >
                        <FileSpreadsheet size={16} color="#10b981" />
                        Excel / CSV
                      </button>
                      <button
                        onClick={() => { alert("Export to PDF functionality pending"); setDownloadOpen(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px",
                          border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px", fontSize: "0.875rem",
                          fontWeight: 700, color: "#475569", textAlign: "left", transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#475569"; }}
                      >
                        <FileText size={16} color="#ef4444" />
                        PDF
                      </button>
                    </div>
                  )}
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => {
                      setName("");
                      setEmail("");
                      setPassword("");
                      setStatus("");
                      setError("");
                      setRole("EMPLOYEE");
                      setNewUserModules({});
                      setNewZoneIds(new Set());
                      setNewWardIds(new Set());
                      setIsModalOpen(true);
                    }}
                    style={{
                      height: "44px", borderRadius: "12px", background: "#2563eb", color: "white", border: "none",
                      display: "flex", alignItems: "center", gap: "10px", fontWeight: 800, padding: "0 24px",
                      cursor: "pointer", boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.25)"
                    }}
                  >
                    <UserPlus size={18} />
                    Register Personnel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Create User Form Modal */}
          {!isReadOnly && isModalOpen && (
            <div style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.4)",
              backdropFilter: "blur(4px)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px"
            }}>
              <div className="card" style={{
                padding: 0,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                borderRadius: "24px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                margin: 0,
                width: "100%",
                maxWidth: "1000px",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "white"
              }}>
                <div style={{
                  padding: "24px 32px",
                  borderBottom: "1px solid #f1f5f9",
                  backgroundColor: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ backgroundColor: "#eff6ff", padding: "8px", borderRadius: "10px" }}>
                      <UserPlus size={20} color="#2563eb" />
                    </div>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>Register Personnel</h2>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      border: "none",
                      background: "#f1f5f9",
                      color: "#64748b",
                      cursor: "pointer",
                      width: "32px", height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "10px",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fee2e2"; e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={createUser} autoComplete="off" style={{ padding: "32px", overflowY: "auto", flex: 1, backgroundColor: "#fcfdfe" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "40px" }}>
                    {/* Left Column: Basic Info */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <ShieldCheck size={18} color="#2563eb" />
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Account Credentials</h4>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div className="field">
                          <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", marginBottom: "6px", display: "block", textTransform: "uppercase" }}>Full Name</label>
                          <div style={{ position: "relative" }}>
                            <Users size={16} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                            <input className="input" placeholder="e.g. Rahul Sharma" style={{ paddingLeft: "42px", height: "44px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontWeight: 600, fontSize: "0.9rem" }} value={name} onChange={(e) => setName(e.target.value)} required />
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                          <div className="field">
                            <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", marginBottom: "6px", display: "block", textTransform: "uppercase" }}>Email Address</label>
                            <div style={{ position: "relative" }}>
                              <Mail size={16} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                              <input className="input" type="email" autoComplete="off" placeholder="official@city.gov" style={{ paddingLeft: "42px", height: "44px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontWeight: 600, fontSize: "0.9rem" }} value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                          </div>
                          <div className="field">
                            <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", marginBottom: "6px", display: "block", textTransform: "uppercase" }}>Password</label>
                            <div style={{ position: "relative" }}>
                              <Lock size={16} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                              <input className="input" type="password" autoComplete="new-password" placeholder="••••••••" style={{ paddingLeft: "42px", height: "44px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontWeight: 600, fontSize: "0.9rem" }} value={password} onChange={(e) => setPassword(e.target.value)} required />
                            </div>
                          </div>
                        </div>

                        <div className="field">
                          <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", marginBottom: "6px", display: "block", textTransform: "uppercase" }}>Security Role</label>
                          <select className="input" style={{ height: "44px", borderRadius: "12px", border: "1.5px solid #e2e8f0", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }} value={role} onChange={(e) => changeNewUserRole(e.target.value as Role)}>
                            {allowedRoles.map((r) => (
                              <option key={r} value={r}>{roleLabel(r)}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ padding: "20px", backgroundColor: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                          <Globe size={18} color="#2563eb" />
                          <h4 style={{ fontSize: "0.7rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", margin: 0 }}>Assigned Territory</h4>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                          <div>
                            <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", display: "block", marginBottom: "10px", textTransform: "uppercase" }}>Primary Zones</span>
                            <div className="pill-grid" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                              {zones.map((z) => (
                                <label key={z.id} className={`pill ${newZoneIds.has(z.id) ? 'pill-active' : ''}`} style={{ fontSize: "0.75rem", cursor: "pointer", padding: "6px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                                  <input type="checkbox" className="hidden" style={{ display: "none" }} checked={newZoneIds.has(z.id)} onChange={() => toggleNewZone(z.id)} />
                                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: newZoneIds.has(z.id) ? "#2563eb" : "#e2e8f0" }} />
                                  {z.name}
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", display: "block", marginBottom: "10px", textTransform: "uppercase" }}>Service Wards</span>
                            <div className="pill-grid max-h-[140px] overflow-y-auto pr-2 custom-scrollbar" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                              {wards.filter((w) => newZoneIds.size === 0 || (w.parentId && newZoneIds.has(w.parentId))).map((w) => (
                                <label key={w.id} className={`pill ${newWardIds.has(w.id) ? 'pill-active' : ''}`} style={{ fontSize: "0.75rem", cursor: "pointer", padding: "6px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                                  <input type="checkbox" className="hidden" style={{ display: "none" }} checked={newWardIds.has(w.id)} onChange={() => toggleNewWard(w.id)} />
                                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: newWardIds.has(w.id) ? "#2563eb" : "#e2e8f0" }} />
                                  {w.name}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Modules */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Settings size={18} color="#2563eb" />
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Module Access</h4>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {loadingModules ? (
                          Array(4).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: "60px", borderRadius: "16px" }} />)
                        ) : (
                          displayModules.map((m) => {
                            const selected = newUserModules[m.id];
                            return (
                              <div key={m.id} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "14px 18px", borderRadius: "16px", border: "1px solid",
                                borderColor: selected ? "#bfdbfe" : "#f1f5f9",
                                backgroundColor: selected ? "#f0f7ff" : "white",
                                boxShadow: selected ? "0 2px 4px rgba(37, 99, 235, 0.05)" : "none",
                                transition: "all 0.2s"
                              }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", flex: 1 }}>
                                  <input type="checkbox" style={{ width: "18px", height: "18px", accentColor: "#2563eb" }} checked={Boolean(selected)} onChange={(e) => updateNewModuleSelection(m.id, e.target.checked)} />
                                  <div style={{ display: "flex", flexDirection: "column" }}>
                                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: selected ? "#1e40af" : "#475569" }}>{moduleLabel(m.key, m.name)}</span>
                                  </div>
                                </label>
                                {selected && (
                                  <button
                                    type="button"
                                    onClick={() => updateNewModuleWrite(m.id, !selected.canWrite)}
                                    style={{
                                      border: "1px solid",
                                      borderColor: selected.canWrite ? "#bbf7d0" : "#e2e8f0",
                                      background: selected.canWrite ? "#dcfce7" : "#f8fafc",
                                      color: selected.canWrite ? "#166534" : "#94a3b8",
                                      padding: "6px 12px",
                                      borderRadius: "10px",
                                      fontSize: "10px",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                      textTransform: "uppercase"
                                    }}
                                  >
                                    {selected.canWrite ? "WRITE" : "READ"}
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div style={{ marginTop: "auto", paddingTop: "24px", borderTop: "1px solid #f1f5f9" }}>
                        {error && (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#991b1b", backgroundColor: "#fef2f2", padding: "12px", borderRadius: "12px", fontSize: "0.8125rem", fontWeight: 700, marginBottom: "16px" }}>
                            <AlertCircle size={16} /> {error}
                          </div>
                        )}
                        {status && (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", backgroundColor: "#f0fdf4", padding: "12px", borderRadius: "12px", fontSize: "0.8125rem", fontWeight: 700, marginBottom: "16px" }}>
                            <CheckCircle2 size={16} /> {status}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "12px" }}>
                          <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, height: "48px", borderRadius: "12px", border: "1.5px solid #e2e8f0", backgroundColor: "white", color: "#64748b", fontWeight: 700, cursor: "pointer" }}>
                            Cancel
                          </button>
                          <button type="submit" disabled={!email || !name || !password} style={{ flex: 2, height: "48px", borderRadius: "12px", border: "none", backgroundColor: "#2563eb", color: "white", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.25)" }}>
                            <UserPlus size={18} />
                            Register Official
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}


          {/* Stats & Controls Section */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px", alignItems: "flex-end", marginBottom: "32px" }}>
            {/* Stats Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {[
                { label: "Active Personnel", count: stats.ALL, icon: Users, color: "#2563eb", bg: "#eff6ff", border: "#dbeafe" },
                { label: "Quality Assurance", count: stats.QC, icon: ShieldCheck, color: "#4338ca", bg: "#eef2ff", border: "#e0e7ff" },
                { label: "Operations Team", count: stats.ACTION_OFFICER, icon: UserCog, color: "#7c3aed", bg: "#f5f3ff", border: "#ede9fe" },
              ].map((s, i) => (
                <div key={i} style={{
                  backgroundColor: "white", padding: "16px 20px", borderRadius: "20px", border: "1px solid #e2e8f0",
                  display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
                  transition: "all 0.2s"
                }}>
                  <div style={{ backgroundColor: s.bg, color: s.color, width: "48px", height: "48px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${s.border}` }}>
                    <s.icon size={22} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>{s.count}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Search Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={18} color="#94a3b8" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  placeholder="Search personnel directory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%", height: "52px", padding: "0 16px 0 48px", borderRadius: "18px", border: "1.5px solid #e2e8f0",
                    fontSize: "0.95rem", fontWeight: 500, outline: "none", transition: "all 0.2s",
                    backgroundColor: "white", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.03)"
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 4px rgba(37, 99, 235, 0.08)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.03)"; }}
                />
              </div>
            </div>
          </div>

          {/* Personnel Database Section */}
          <div style={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.04)"
          }}>
            <div style={{
              padding: "24px 32px",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ backgroundColor: "#eff6ff", padding: "8px", borderRadius: "10px" }}>
                  <Shield size={20} color="#2563eb" />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>Human Resources Registry</h2>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Manage system access and roles</p>
                </div>
              </div>


              <div style={{ display: "flex", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                {["ALL", "QC", "ACTION_OFFICER", "COMMISSIONER", "CITY_ADMIN", "SUPERVISOR", "EMPLOYEE"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t as any)}
                    style={{
                      padding: "6px 14px", borderRadius: "8px", border: "none",
                      fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                      backgroundColor: activeTab === t ? "white" : "transparent",
                      color: activeTab === t ? "#2563eb" : "#64748b",
                      boxShadow: activeTab === t ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    {t === "ALL" ? "All" : t === "ACTION_OFFICER" ? "Officers" : roleLabel(t as Role)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ backgroundColor: "#fafbfc", borderBottom: "1px solid #f1f5f9" }}>
                  <tr>
                    <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Personnel Profile</th>
                    <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Global Role</th>
                    <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Access & Scope</th>
                    <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Timeline</th>
                    <th style={{ padding: "16px 32px", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={i}><td colSpan={5} style={{ padding: "24px 32px" }}><div className="skeleton" style={{ height: "40px", borderRadius: "10px" }} /></td></tr>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "80px 32px", textAlign: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                          <Search size={40} color="#cbd5e1" />
                          <p style={{ color: "#64748b", fontWeight: 600 }}>No personnel found matching your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => (
                      <UserRow
                        key={u.id}
                        index={idx + 1}
                        u={u}
                        edit={editing[u.id] || { name: u.name, role: u.role, modules: {}, zoneIds: new Set(), wardIds: new Set() }}
                        zones={zones}
                        wards={wards}
                        availableModules={displayModules}
                        savingUserId={savingUserId}
                        onUpdateUser={updateUser}
                        onDeleteUser={deleteUser}
                        onUpdateEditingRole={updateEditingRole}
                        onToggleUserZone={toggleUserZone}
                        onToggleUserWard={toggleUserWard}
                        onToggleUserModule={toggleUserModule}
                        onToggleUserWrite={toggleUserWrite}
                        setEditing={setEditing}
                        openActionId={openActionId}
                        setOpenActionId={setOpenActionId}
                        isReadOnly={isReadOnly}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

function UserRow({
  u,
  index,
  edit,
  zones,
  wards,
  availableModules,
  savingUserId,
  onUpdateUser,
  onDeleteUser,
  onUpdateEditingRole,
  onToggleUserZone,
  onToggleUserWard,
  onToggleUserModule,
  onToggleUserWrite,
  isReadOnly,
  setEditing,
  openActionId,
  setOpenActionId
}: {
  u: CityUser;
  index: number;
  edit: EditableUser;
  zones: any[];
  wards: any[];
  availableModules: CityModule[];
  savingUserId: string | null;
  onUpdateUser: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onUpdateEditingRole: (id: string, role: Role) => void;
  onToggleUserZone: (id: string, zid: string) => void;
  onToggleUserWard: (id: string, wid: string) => void;
  onToggleUserModule: (id: string, mid: string, checked: boolean) => void;
  onToggleUserWrite: (id: string, mid: string, canWrite: boolean) => void;
  isReadOnly?: boolean;
  setEditing: React.Dispatch<React.SetStateAction<Record<string, EditableUser>>>;
  openActionId: string | null;
  setOpenActionId: (id: string | null) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Role Badge Styling
  const getRoleStyle = (role: Role) => {
    switch (role) {
      case 'QC': return { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', label: 'Quality Control' };
      case 'ACTION_OFFICER': return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: 'Action Officer' };
      case 'COMMISSIONER': return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', label: 'Commissioner' };
      case 'CITY_ADMIN': return { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', label: 'City Admin' };
      case 'SUPERVISOR': return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd', label: 'Supervisor' };
      default: return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', label: 'Field Employee' };
    }
  };
  const rs = getRoleStyle(u.role);

  return (
    <>
      <tr
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          borderBottom: "1px solid #f8fafc",
          transition: "all 0.2s",
          cursor: "pointer",
          backgroundColor: isExpanded ? "#fcfdfe" : "transparent"
        }}
        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = "#fafbfc"; }}
        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        <td style={{ padding: "20px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "12px",
              backgroundColor: `${rs.color}10`, color: rs.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: "1rem"
            }}>
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>{u.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                <Mail size={12} /> {u.email}
              </div>
            </div>
          </div>
        </td>
        <td style={{ padding: "20px 32px" }}>
          <span style={{
            display: "inline-block", backgroundColor: rs.bg, color: rs.color,
            padding: "4px 10px", borderRadius: "8px", fontSize: "0.7rem",
            fontWeight: 800, border: `1px solid ${rs.border}`, textTransform: "uppercase"
          }}>
            {rs.label}
          </span>
        </td>
        <td style={{ padding: "20px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569" }}>
              {Object.keys(edit.modules).length} Active Modules
            </span>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Jurisdiction: {edit.zoneIds.size} Zones / {edit.wardIds.size} Wards
            </span>
          </div>
        </td>
        <td style={{ padding: "20px 32px" }}>
          <div style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 500 }}>
            {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </td>
        <td style={{ padding: "20px 32px", textAlign: "right" }}>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
            {!isReadOnly && (
              <div className="action-menu" style={{ position: "relative" }}>
                <button
                  className="btn btn-icon"
                  style={{ backgroundColor: "white", border: "1px solid #e2e8f0", padding: "6px", borderRadius: "8px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenActionId(openActionId === u.id ? null : u.id);
                  }}
                >
                  <MoreHorizontal size={18} color="#64748b" />
                </button>

                {openActionId === u.id && (
                  <div style={{
                    position: "absolute", right: 0, top: "40px", zIndex: 200,
                    backgroundColor: "white", borderRadius: "12px", border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", minWidth: "160px", padding: "8px",
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); setOpenActionId(null); }}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none", background: "none", display: "flex", alignItems: "center", gap: "10px", color: "#475569", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <UserCog size={16} /> {isExpanded ? "Close Config" : "Configure Access"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteUser(u.id); setOpenActionId(null); }}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "none", background: "none", display: "flex", alignItems: "center", gap: "10px", color: "#ef4444", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fef2f2"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <Trash2 size={16} /> Delete Personnel
                    </button>
                  </div>
                )}
              </div>
            )}
            {isReadOnly && (
              <span style={{
                fontSize: "0.65rem", fontWeight: 800, color: "#64748b",
                backgroundColor: "#f1f5f9", padding: "4px 10px",
                borderRadius: "6px", border: "1px solid #e2e8f0"
              }}>READ ONLY</span>
            )}
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={5} style={{ padding: 0, backgroundColor: "#fcfdfe", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ padding: "32px 40px", animation: "slideDown 0.3s ease-out" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "40px" }}>
                {/* Column 1: Identity & Scope */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Shield size={18} color="#2563eb" />
                    <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Personnel Configuration</h4>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="field">
                      <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", marginBottom: "6px", display: "block", textTransform: "uppercase" }}>Full Name</label>
                      <input className="input" value={edit.name} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditing((prev) => ({ ...prev, [u.id]: { ...edit, name: e.target.value } }))} style={{ height: "44px", borderRadius: "12px", border: "1.5px solid #e2e8f0", padding: "0 14px", fontWeight: 600, fontSize: "0.9rem" }} disabled={isReadOnly} />
                    </div>
                    <div className="field">
                      <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", marginBottom: "6px", display: "block", textTransform: "uppercase" }}>System Role</label>
                      <select className="input" value={edit.role} onClick={(e) => e.stopPropagation()} onChange={(e) => onUpdateEditingRole(u.id, e.target.value as Role)} style={{ height: "44px", borderRadius: "12px", border: "1.5px solid #e2e8f0", padding: "0 10px", fontWeight: 600, fontSize: "0.9rem" }} disabled={isReadOnly}>
                        {allowedRoles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ padding: "20px", backgroundColor: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>Assigned Territory</span>
                      {edit.role === 'QC' && <span style={{ fontSize: "10px", backgroundColor: "#fff7ed", color: "#c2410c", padding: "2px 8px", borderRadius: "6px", fontWeight: 800, border: "1px solid #ffedd5" }}>REQUIRED FOR QC</span>}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div>
                        <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", display: "block", marginBottom: "10px", textTransform: "uppercase" }}>Primary Zones</span>
                        <div className="pill-grid" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {zones.map((z) => (
                            <label key={z.id} className={`pill ${edit.zoneIds.has(z.id) ? 'pill-active' : ''}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: "0.75rem", cursor: isReadOnly ? "default" : "pointer", padding: "6px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                              <input type="checkbox" className="hidden" style={{ display: "none" }} checked={edit.zoneIds.has(z.id)} onChange={() => onToggleUserZone(u.id, z.id)} disabled={isReadOnly} />
                              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: edit.zoneIds.has(z.id) ? "#2563eb" : "#e2e8f0" }} />
                              {z.name}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", display: "block", marginBottom: "10px", textTransform: "uppercase" }}>Service Wards</span>
                        <div className="pill-grid max-h-[160px] overflow-y-auto pr-2 custom-scrollbar" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {wards.filter((w) => edit.zoneIds.size === 0 || (w.parentId && edit.zoneIds.has(w.parentId))).map((w) => (
                            <label key={w.id} className={`pill ${edit.wardIds.has(w.id) ? 'pill-active' : ''}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: "0.75rem", cursor: isReadOnly ? "default" : "pointer", padding: "6px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}>
                              <input type="checkbox" className="hidden" style={{ display: "none" }} checked={edit.wardIds.has(w.id)} onChange={() => onToggleUserWard(u.id, w.id)} disabled={isReadOnly} />
                              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: edit.wardIds.has(w.id) ? "#2563eb" : "#e2e8f0" }} />
                              {w.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Capabilities */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Settings size={18} color="#2563eb" />
                      <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>System Access</h4>
                    </div>
                    {edit.role === "QC" && !isReadOnly && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditing((prev) => { const cur = prev[u.id]; if (!cur) return prev; const modules = { ...cur.modules }; Object.keys(modules).forEach(mid => { modules[mid] = { ...modules[mid], zoneIds: Array.from(cur.zoneIds), wardIds: Array.from(cur.wardIds) }; }); return { ...prev, [u.id]: { ...cur, modules } }; }); }} style={{ fontSize: "10px", padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", fontWeight: 700, color: "#64748b", cursor: "pointer" }}>
                        Sync All Regions
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {availableModules.map((m) => {
                      const selectedKey = Object.keys(edit.modules).find((mid) => {
                        if (mid === m.id) return true;
                        const uMod = u.modules?.find((um) => um.id === mid);
                        return uMod && normalizeModuleKey(uMod.key) === normalizeModuleKey(m.key);
                      });
                      const selected = selectedKey ? edit.modules[selectedKey] : undefined;
                      const activeModuleId = selectedKey || m.id;
                      return (
                        <div key={m.id} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "14px 18px", borderRadius: "16px", border: "1px solid",
                          borderColor: selected ? "#bfdbfe" : "#f1f5f9",
                          backgroundColor: selected ? "#f0f7ff" : "white",
                          boxShadow: selected ? "0 2px 4px rgba(37, 99, 235, 0.05)" : "none",
                          transition: "all 0.2s"
                        }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: isReadOnly ? "default" : "pointer", flex: 1 }} onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" style={{ width: "18px", height: "18px", accentColor: "#2563eb" }} checked={Boolean(selected)} onChange={(e) => onToggleUserModule(u.id, activeModuleId, e.target.checked)} disabled={isReadOnly} />
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: "0.875rem", fontWeight: 700, color: selected ? "#1e40af" : "#475569" }}>{moduleLabel(m.key, m.name)}</span>
                              {selected && (
                                <span style={{ fontSize: "10px", color: "#3b82f6", fontWeight: 700, textTransform: "uppercase", marginTop: "2px" }}>
                                  {selected.canWrite ? "Full Access Granted" : "Watch Mode Only"}
                                </span>
                              )}
                            </div>
                          </label>
                          {selected && (
                            <button
                              onClick={(e) => { e.stopPropagation(); if (!isReadOnly) onToggleUserWrite(u.id, activeModuleId, !selected.canWrite); }}
                              style={{
                                border: "1px solid",
                                borderColor: selected.canWrite ? "#bbf7d0" : "#e2e8f0",
                                background: selected.canWrite ? "#dcfce7" : "#f8fafc",
                                color: selected.canWrite ? "#166534" : "#94a3b8",
                                padding: "6px 12px",
                                borderRadius: "10px",
                                fontSize: "10px",
                                fontWeight: 800,
                                cursor: isReadOnly ? "default" : "pointer",
                                textTransform: "uppercase"
                              }}
                            >
                              {selected.canWrite ? "WRITE" : "READ"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end", gap: "12px", paddingTop: "24px", borderTop: "1px solid #f1f5f9", alignItems: "center" }}>
                    <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} style={{ height: "44px", padding: "0 20px", borderRadius: "12px", border: "1.5px solid #e2e8f0", backgroundColor: "white", color: "#64748b", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>
                      {isReadOnly ? "Close Profile" : "Dismiss"}
                    </button>
                    {!isReadOnly && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onUpdateUser(u.id); }}
                        disabled={savingUserId === u.id}
                        style={{ height: "44px", padding: "0 24px", borderRadius: "12px", border: "none", backgroundColor: "#2563eb", color: "white", fontWeight: 800, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "10px" }}
                      >
                        {savingUserId === u.id ? <div className="animate-spin" style={{ width: 14, height: 14, border: "2px solid white", borderTop: "2px solid transparent", borderRadius: "50%" }} /> : <Save size={16} />}
                        Update Account
                      </button>
                    )}
                    {isReadOnly && (
                      <div style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700 }}>PROFILE VIEW MODE</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </>
  );
}
