'use client';

import React, { useEffect, useMemo, useState } from "react";
import {
  Users, UserPlus, Shield, Search, Filter, RefreshCw, PlusCircle, Edit2, Trash2,
  CheckCircle2, AlertCircle, Building2, ChevronLeft, ChevronRight, ChevronDown, X, Lock, Activity,
  Trash, Info, Eye, Layers, ShieldCheck, MapPin, Globe, Award, Map, MoreVertical, Download, Key, Copy, Check, Sparkles
} from "lucide-react";
import { CityUserApi, CityApi, CityModulesApi, GeoApi, ApiError, apiFetch } from "@lib/apiClient";
import { useToast } from "@components/ui/ToastProvider";
import { ConfirmDialog } from "@components/ui/ConfirmDialog";
import { TableExportDropdown } from '@components/ui/TableExportDropdown';
import { roleLabel } from '@lib/labels';
import { Modal } from "@components/ui/Modal";
import * as XLSX from "xlsx";

type Role =
  | "HMS_SUPER_ADMIN"
  | "COMMISSIONER"
  | "ULB_OFFICER"
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
  email?: string | null;
  phone?: string;
  password?: string | null;
  plainPassword?: string | null;
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
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string; parentId?: string | null }[]>([]);
  const [filterZone, setFilterZone] = useState<string>("");
  const [filterWard, setFilterWard] = useState<string>("");
  const [filterWorkspace, setFilterWorkspace] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("");

  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Edit / Delete Modal State
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [selectedUserGeoModal, setSelectedUserGeoModal] = useState<{ user: UserRecord; zoneList: string[]; wardList: string[] } | null>(null);

  // Reset Password State
  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordPlain, setShowPasswordPlain] = useState(true);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Register Commissioner Modal State
  const [showRegisterCommissionerModal, setShowRegisterCommissionerModal] = useState(false);
  const [commissionerCityId, setCommissionerCityId] = useState("");
  const [commissionerName, setCommissionerName] = useState("");
  const [commissionerEmail, setCommissionerEmail] = useState("");
  const [commissionerPassword, setCommissionerPassword] = useState("");
  const [commissionerCreating, setCommissionerCreating] = useState(false);
  const [commissionerStatus, setCommissionerStatus] = useState<string | null>(null);
  const [citiesList, setCitiesList] = useState<any[]>([]);

  // Custom Export Columns Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [exportType, setExportType] = useState<"STANDARD" | "CREDENTIALS" | "CUSTOM">("STANDARD");
  const [showAdvancedCols, setShowAdvancedCols] = useState(false);
  const [exportModalSearch, setExportModalSearch] = useState("");
  const [exportModalZoneIds, setExportModalZoneIds] = useState<string[]>([]);
  const [exportModalWardIds, setExportModalWardIds] = useState<string[]>([]);
  const [exportModalRole, setExportModalRole] = useState("ALL");
  const [selectedExportCols, setSelectedExportCols] = useState<Record<string, boolean>>({
    srNo: true,
    name: true,
    email: false,
    password: false,
    phone: true,
    role: true,
    state: true,
    city: true,
    zone: true,
    ward: true,
    modules: true,
    status: true,
    createdOn: true
  });

  const toggleExportCol = (key: string) => {
    setSelectedExportCols((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const selectExportType = (type: "STANDARD" | "CREDENTIALS" | "CUSTOM") => {
    setExportType(type);
    if (type === "STANDARD") {
      setSelectedExportCols({
        srNo: true, name: true, email: false, password: false, phone: true,
        role: true, state: true, city: true, zone: true, ward: true,
        modules: true, status: true, createdOn: true
      });
    } else if (type === "CREDENTIALS") {
      setSelectedExportCols({
        srNo: true, name: true, email: true, password: true, phone: true,
        role: true, state: true, city: true, zone: true, ward: true,
        modules: true, status: true, createdOn: true
      });
    }
  };

  const applyExportPreset = (preset: "ALL" | "CREDS" | "SCOPE") => {
    if (preset === "ALL") {
      setSelectedExportCols({
        srNo: true, name: true, email: true, password: true, phone: true,
        role: true, state: true, city: true, zone: true, ward: true,
        modules: true, status: true, createdOn: true
      });
    } else if (preset === "CREDS") {
      setSelectedExportCols({
        srNo: true, name: true, email: true, password: true, phone: true,
        role: true, state: false, city: false, zone: false, ward: false,
        modules: false, status: true, createdOn: false
      });
    } else if (preset === "SCOPE") {
      setSelectedExportCols({
        srNo: true, name: true, email: true, password: true, phone: true,
        role: true, state: true, city: true, zone: true, ward: true,
        modules: true, status: false, createdOn: false
      });
    }
  };

  const generateAutoPasswordForReset = (name: string, phone?: string | null) => {
    const cleanName = (name || "").trim().replace(/[^a-zA-Z]/g, "");
    const prefix = cleanName.length >= 4
      ? cleanName.slice(0, 4)
      : cleanName.length > 0
        ? cleanName
        : "User";
    const capitalizedPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
    const digits = (phone || "").replace(/\D/g, "");
    const last4 = digits.length >= 4 ? digits.slice(-4) : "1234";
    return `${capitalizedPrefix}@${last4}`;
  };

  const handleOpenResetModal = (u: UserRecord) => {
    setResetPasswordTarget(u);
    setNewPassword(generateAutoPasswordForReset(u.name, u.phone));
    setShowPasswordPlain(true);
    setCopiedCreds(false);
    setActiveMenuUserId(null);
  };

  const handleConfirmPasswordReset = async () => {
    if (!resetPasswordTarget) return;
    if (!newPassword || newPassword.trim().length < 4) {
      showToast({ title: "Validation Error", description: "Password must be at least 4 characters long.", tone: "error" });
      return;
    }

    setUpdatingPassword(true);
    try {
      await apiFetch(`/city/users/${resetPasswordTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: newPassword.trim() })
      });
      showToast({
        title: "Password Updated",
        description: `New password for ${resetPasswordTarget.name} has been set to: ${newPassword.trim()}`,
        tone: "success"
      });
      setResetPasswordTarget(null);
      setNewPassword("");
    } catch (err: any) {
      showToast({
        title: "Password Reset Failed",
        description: err?.message || "Failed to update user password.",
        tone: "error"
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const copyResetCredentials = () => {
    if (!resetPasswordTarget) return;
    const credText = `System User Credentials:\nName: ${resetPasswordTarget.name}\nContact: ${resetPasswordTarget.phone || resetPasswordTarget.email || "N/A"}\nNew Password: ${newPassword}`;
    navigator.clipboard.writeText(credText);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 3000);
    showToast({ title: "Credentials Copied", description: "Copied user login details to clipboard.", tone: "success" });
  };

  const handleCreateCommissionerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommissionerCreating(true);
    setCommissionerStatus(null);

    try {
      const defaultCity = citiesList[0]?.id || "";
      const targetCityId = commissionerCityId || defaultCity;

      if (!targetCityId) {
        setCommissionerStatus("Please select a city.");
        setCommissionerCreating(false);
        return;
      }

      await CityApi.createCommissioner(targetCityId, {
        name: commissionerName.trim(),
        email: commissionerEmail.trim().toLowerCase(),
        password: commissionerPassword.trim()
      });

      showToast({
        title: "Commissioner Created",
        description: `Successfully registered Commissioner "${commissionerName}".`,
        tone: "success"
      });

      setShowRegisterCommissionerModal(false);
      setCommissionerName("");
      setCommissionerEmail("");
      setCommissionerPassword("");
      await loadData();
    } catch (err: any) {
      console.error("Failed to create commissioner", err);
      const msg = err?.message || "Failed to create commissioner.";
      setCommissionerStatus(msg);
      showToast({
        title: "Registration Failed",
        description: msg,
        tone: "error"
      });
    } finally {
      setCommissionerCreating(false);
    }
  };

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
      setCitiesList(fetchedCities);
      const zNodes = ((zoneRes as any)?.nodes || []).map((n: any) => ({ id: n.id, name: n.name }));
      const wNodes = ((wardRes as any)?.nodes || []).map((n: any) => ({ id: n.id, name: n.name, parentId: n.parentId }));
      setZones(zNodes);
      setWards(wNodes);

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

      const enrichedUsers = rawUsers.map((u: any) => {
        const city = fCityMap[u.cityId] || null;

        return {
          ...u,
          cityName:
            u.cityName ||
            city?.name ||
            "",
          stateName:
            u.stateName ||
            city?.state?.name ||
            "",
          divisionName:
            u.divisionName ||
            city?.division?.name ||
            "",
          districtName:
            u.districtName ||
            city?.district?.name ||
            ""
        };
      });

      setUsers(enrichedUsers as any[]);
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
  }, [searchQuery, filterRole, filterZone, filterWard, filterWorkspace, statusFilter, filterDate]);

  // Derived Ward Options filtered by selected Zone
  const availableWards = useMemo(() => {
    if (!filterZone) return wards;
    return wards.filter((w) => !w.parentId || w.parentId === filterZone);
  }, [wards, filterZone]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const uCity = fullCityMap[u.cityId || ''] || {};
        const uCityName = u.cityName || u.city?.name || uCity.name || 'Indore';

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          String(u.name || "").toLowerCase().includes(q) ||
          String(u.email || "").toLowerCase().includes(q) ||
          String(u.phone || "").toLowerCase().includes(q) ||
          String(uCityName || "").toLowerCase().includes(q) ||
          String(u.role || "").toLowerCase().includes(q);

        const matchesRole = filterRole === "ALL" || u.role === filterRole;

        // Zone Filter Matching
        let matchesZone = true;
        if (filterZone) {
          if (u.role !== 'CITY_ADMIN') {
            const selectedZoneObj = zones.find((z) => z.id === filterZone);
            const targetZoneName = (selectedZoneObj?.name || filterZone).toLowerCase();
            const uZoneIds = u.zoneIds || [];
            const uZoneNames = uZoneIds.map((zid: string) => (geoMap[zid] || zid).toLowerCase());

            matchesZone =
              uZoneIds.includes(filterZone) ||
              uZoneNames.some((zn: string) => zn === targetZoneName || zn.includes(targetZoneName)) ||
              Boolean(u.zoneName && u.zoneName.toLowerCase().includes(targetZoneName));
          }
        }

        // Ward Filter Matching
        let matchesWard = true;
        if (filterWard) {
          if (u.role !== 'CITY_ADMIN') {
            const selectedWardObj = wards.find((w) => w.id === filterWard);
            const targetWardName = (selectedWardObj?.name || filterWard).toLowerCase();
            const uWardIds = u.wardIds || [];
            const uWardNames = uWardIds.map((wid: string) => (geoMap[wid] || wid).toLowerCase());

            matchesWard =
              uWardIds.includes(filterWard) ||
              uWardNames.some((wn: string) => wn === targetWardName || wn.includes(targetWardName)) ||
              Boolean(u.wardName && u.wardName.toLowerCase().includes(targetWardName));
          }
        }

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

        return matchesSearch && matchesRole && matchesZone && matchesWard && matchesStatus && matchesWorkspace && matchesDate;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users, searchQuery, filterRole, filterZone, filterWard, filterWorkspace, statusFilter, filterDate, fullCityMap, geoMap, zones, wards]);

  // Unique Available Zones in Loaded Users
  const availableZones = useMemo<string[]>(() => {
    const list: string[] = [];
    users.forEach((u) => {
      if (u.zoneIds && Array.isArray(u.zoneIds)) {
        u.zoneIds.forEach((zid: string, i: number) => {
          const name = geoMap[zid] || (zid.length > 20 || zid.includes('-') || zid.startsWith('PT') ? `Zone ${i + 1}` : zid);
          if (!list.includes(name)) list.push(name);
        });
      } else if (u.zoneName || u.zone?.name) {
        const zName = u.zoneName || u.zone?.name;
        if (zName && !list.includes(zName)) list.push(zName);
      }
    });
    return list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [users, geoMap]);

  // Unique Available Wards in Loaded Users
  const allUserWardNames = useMemo<string[]>(() => {
    const list: string[] = [];
    users.forEach((u) => {
      if (u.wardIds && Array.isArray(u.wardIds)) {
        u.wardIds.forEach((wid: string, i: number) => {
          const name = geoMap[wid] || (wid.length > 20 || wid.includes('-') || wid.startsWith('PT') ? `Ward ${i + 1}` : wid);
          if (!list.includes(name)) list.push(name);
        });
      } else if (u.wardName || u.ward?.name) {
        const wName = u.wardName || u.ward?.name;
        if (wName && !list.includes(wName)) list.push(wName);
      }
    });
    return list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [users, geoMap]);

  // Filtered Users scoped inside Export Modal
  const finalExportUsers = useMemo(() => {
    return filteredUsers.filter((u) => {
      const q = exportModalSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(u.name || "").toLowerCase().includes(q) ||
        String(u.email || "").toLowerCase().includes(q) ||
        String(u.phone || "").toLowerCase().includes(q);

      const matchesRole = exportModalRole === "ALL" || u.role === exportModalRole;

      const isCityAdminUser = u.role === 'CITY_ADMIN';

      let matchesZone = true;
      if (exportModalZoneIds.length > 0) {
        if (!isCityAdminUser) {
          const uZoneIds = u.zoneIds || [];
          const uZoneNames = uZoneIds.map((zid: string) => (geoMap[zid] || zid).toLowerCase());
          const selectedZoneNames = zones
            .filter((z) => exportModalZoneIds.includes(z.id))
            .map((z) => z.name.toLowerCase());

          matchesZone =
            uZoneIds.some((zid: string) => exportModalZoneIds.includes(zid)) ||
            uZoneNames.some((zn: string) => selectedZoneNames.includes(zn)) ||
            Boolean(u.zoneName && selectedZoneNames.some((zn) => (u.zoneName || "").toLowerCase().includes(zn)));
        }
      }

      let matchesWard = true;
      if (exportModalWardIds.length > 0) {
        if (!isCityAdminUser) {
          const uWardIds = u.wardIds || [];
          const uWardNames = uWardIds.map((wid: string) => (geoMap[wid] || wid).toLowerCase());
          const selectedWardNames = wards
            .filter((w) => exportModalWardIds.includes(w.id))
            .map((w) => w.name.toLowerCase());

          matchesWard =
            uWardIds.some((wid: string) => exportModalWardIds.includes(wid)) ||
            uWardNames.some((wn: string) => selectedWardNames.includes(wn)) ||
            Boolean(u.wardName && selectedWardNames.some((wn) => (u.wardName || "").toLowerCase().includes(wn)));
        }
      }

      return matchesSearch && matchesRole && matchesZone && matchesWard;
    });
  }, [filteredUsers, exportModalSearch, exportModalRole, exportModalZoneIds, exportModalWardIds, zones, wards, geoMap]);

  // All Export Columns Definitions
  const ALL_EXPORT_COLUMNS: { key: string; header: string; label: string }[] = [
    { key: "srNo", header: "SR. NO.", label: "Sr. No." },
    { key: "name", header: "USER NAME", label: "User Name" },
    { key: "email", header: "USER EMAIL", label: "User Email" },
    { key: "password", header: "LOGIN PASSWORD", label: "Login Password" },
    { key: "phone", header: "MOBILE NUMBER", label: "Mobile Number" },
    { key: "role", header: "USER ROLE", label: "User Role" },
    { key: "state", header: "STATE", label: "State Name" },
    { key: "city", header: "CITY", label: "City Name" },
    { key: "zone", header: "ZONE(S)", label: "Zone Scope" },
    { key: "ward", header: "WARD(S)", label: "Ward Scope" },
    { key: "modules", header: "ASSIGNED MODULES", label: "Assigned Modules" },
    { key: "status", header: "ACCOUNT STATUS", label: "Account Status" },
    { key: "createdOn", header: "CREATED ON", label: "Created Date & Time" }
  ];

  // Customizable XLSX/CSV Export Handler with Explicit Column Widths
  const executeCustomExcelExport = (
    fileFormat: "XLSX" | "CSV" = "XLSX",
    overrideCols?: Record<string, boolean>,
    customFilePrefix?: string
  ) => {
    const targetUsers = finalExportUsers;
    if (!targetUsers.length) {
      showToast({ title: "No data to export", description: "There are no users matching your export filters.", tone: "info" });
      return;
    }

    const colsMap = overrideCols || selectedExportCols;
    const activeCols = ALL_EXPORT_COLUMNS.filter((col) => colsMap[col.key]);
    if (activeCols.length === 0) {
      showToast({ title: "No columns selected", description: "Please select at least one column to export.", tone: "info" });
      return;
    }

    const excelRows: Record<string, any>[] = [];

    targetUsers.forEach((u, index) => {
      const isCityAdmin = u.role === 'CITY_ADMIN';
      const cleanGeoLabel = (val: any, prefix: string, idx: number) => {
        if (!val) return `${prefix} ${idx + 1}`;
        const str = String(val).trim();
        if (geoMap[str]) return geoMap[str];
        if (str.length > 20 || str.includes('-') || str.startsWith('PT')) {
          return `${prefix} ${idx + 1}`;
        }
        return str;
      };

      const zoneList: string[] = isCityAdmin
        ? ["All Zones (City Admin)"]
        : u.zoneIds && u.zoneIds.length > 0
          ? u.zoneIds.map((id: string, i: number) => cleanGeoLabel(id, 'Zone', i))
          : u.zoneName || u.zone?.name
            ? [u.zoneName || u.zone?.name]
            : ['Zone 1'];

      const wardList: string[] = isCityAdmin
        ? ["All Wards (City Admin)"]
        : u.wardIds && u.wardIds.length > 0
          ? u.wardIds.map((id: string, i: number) => cleanGeoLabel(id, 'Ward', i))
          : u.wardName || u.ward?.name
            ? [u.wardName || u.ward?.name]
            : ['Ward 1'];

      // Collect Assigned Modules
      const allowedTaskforceKeys = ["TOILET", "SWEEPING", "LITTERBINS", "TASKFORCE", "LITTERBIN"];
      const mods: string[] = [];
      if (u.modules && u.modules.length > 0) {
        u.modules.forEach((m: any) => {
          const keyUpper = String(m.key || m.id || m.name || '').toUpperCase();
          if (allowedTaskforceKeys.some(tk => keyUpper.includes(tk))) {
            let displayLabel = m.name || m.key;
            if (displayLabel.toUpperCase() === "SWEEPING") displayLabel = "Sweeping";
            if (displayLabel.toUpperCase().includes("LITTER")) displayLabel = "Litter Bins";
            if (displayLabel.toUpperCase().includes("TOILET")) displayLabel = "Cleanliness of Toilets";
            if (displayLabel.toUpperCase() === "TASKFORCE" || displayLabel.toUpperCase().includes("CTU") || displayLabel.toUpperCase().includes("GVP")) displayLabel = "GVP";
            mods.push(displayLabel);
          }
        });
      } else if (u.assignedModules && u.assignedModules.length > 0) {
        u.assignedModules.forEach((mKey: string) => {
          let displayLabel = mKey;
          if (mKey.toUpperCase() === "SWEEPING") displayLabel = "Sweeping";
          if (mKey.toUpperCase().includes("LITTER")) displayLabel = "Litter Bins";
          if (mKey.toUpperCase().includes("TOILET")) displayLabel = "Cleanliness of Toilets";
          if (mKey.toUpperCase() === "TASKFORCE" || mKey.toUpperCase().includes("CTU") || mKey.toUpperCase().includes("GVP")) displayLabel = "GVP";
          mods.push(displayLabel);
        });
      }

      const modulesText = mods.length > 0 ? mods.join("; ") : "None";
      const stateText = u.stateName || 'Madhya Pradesh';
      const cityText = u.cityName || u.city?.name || cityMap[u.cityId || ''] || 'Indore';

      // Real Password / Registration Pattern calculation
      let passwordDisplay = "";
      if (u.role === "EMPLOYEE") {
        passwordDisplay = "—";
      } else {
        let rawPass = u.plainPassword || u.password || "";
        if (rawPass && !rawPass.startsWith("$2b$") && !rawPass.startsWith("$2a$")) {
          passwordDisplay = rawPass;
        } else {
          const namePrefix = (u.name || "").trim().replace(/[^a-zA-Z]/g, "").slice(0, 4) || "User";
          const capPrefix = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1).toLowerCase();
          const digits = (u.phone || "").replace(/\D/g, "");
          const last4 = digits.length >= 4 ? digits.slice(-4) : "1234";
          passwordDisplay = `${capPrefix}@${last4}`;
        }
      }

      const createdDateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : "";
      const isLive = u.enabled !== false;

      const rowFullData: Record<string, string> = {
        srNo: String(index + 1),
        name: u.name || "",
        email: u.email || "N/A",
        password: passwordDisplay,
        phone: u.phone || "",
        role: u.role || "",
        state: stateText,
        city: cityText,
        zone: zoneList.join(", "),
        ward: wardList.join(", "),
        modules: modulesText,
        status: isLive ? "Active" : "Inactive",
        createdOn: createdDateStr
      };

      const rowObj: Record<string, string> = {};
      activeCols.forEach((col) => {
        rowObj[col.header] = rowFullData[col.key] || "";
      });

      excelRows.push(rowObj);
    });

    const worksheet = XLSX.utils.json_to_sheet(excelRows);

    const colWidthsMap: Record<string, number> = {
      "SR. NO.": 10,
      "USER NAME": 26,
      "USER EMAIL": 32,
      "PASSWORD": 22,
      "MOBILE NUMBER": 18,
      "USER ROLE": 20,
      "STATE": 20,
      "CITY": 18,
      "ZONE(S)": 30,
      "WARD(S)": 40,
      "ASSIGNED MODULES": 35,
      "ACCOUNT STATUS": 16,
      "CREATED ON": 22
    };

    worksheet["!cols"] = activeCols.map((col) => ({
      wch: colWidthsMap[col.header] || 25
    }));

    // Format header row (Row 1) with 26pt height, bold font and subtle slate background
    worksheet["!rows"] = [{ hpt: 26 }];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C });
      if (worksheet[address]) {
        worksheet[address].s = {
          font: { bold: true, name: "Segoe UI", sz: 11, color: { rgb: "0F172A" } },
          fill: { fgColor: { rgb: "E2E8F0" } },
          alignment: { horizontal: "left", vertical: "center" }
        };
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registered Users");

    const extension = fileFormat === "CSV" ? "csv" : "xlsx";
    const filePrefix = customFilePrefix || "Registered_Users_Export";
    const fileName = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.${extension}`;

    if (fileFormat === "CSV") {
      XLSX.writeFile(workbook, fileName, { bookType: "csv" });
    } else {
      XLSX.writeFile(workbook, fileName, { bookType: "xlsx" });
    }

    setShowExportModal(false);
    showToast({
      title: "Export Successful",
      description: `Exported ${targetUsers.length} user records to ${fileName}.`,
      tone: "success"
    });
  };

  // Direct Credentials Export Handler (Name, Email, Mobile No, City, Zone, Ward, Password)
  const executeCredentialsExport = (fileFormat: "XLSX" | "CSV" = "XLSX") => {
    const credCols = {
      srNo: true, name: true, email: true, password: true, phone: true,
      role: true, state: true, city: true, zone: true, ward: true,
      modules: false, status: true, createdOn: false
    };
    executeCustomExcelExport(fileFormat, credCols, "User_Credentials_Data");
  };

  // Direct Table Data Export Handler (Green Download Icon)
  const executeTableDataExport = (fileFormat: "XLSX" | "CSV" = "XLSX") => {
    const stdCols = {
      srNo: true, name: true, email: true, password: false, phone: true,
      role: true, state: true, city: true, zone: true, ward: true,
      modules: true, status: true, createdOn: true
    };
    executeCustomExcelExport(fileFormat, stdCols, "Filtered_Users_Directory");
  };

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredUsers, safePage, pageSize]);

  // Delete User Confirmation
  // The backend soft-deletes users: they move to Trash Hub,
  // remain recoverable for 10 days, and are purged afterwards.
  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;

    const target = deleteTarget;

    try {
      await CityUserApi.remove(target.id);

      // Close the dialog only after the backend confirms success.
      setDeleteTarget(null);

      showToast({
        title: "Moved to Trash",
        description: `${target.name} can be restored from Trash Hub for the next 10 days.`,
        tone: "success"
      });

      await loadData();
    } catch (err: any) {
      showToast({
        title: "Move to Trash failed",
        description: err?.message || "Failed to move this user to Trash.",
        tone: "error"
      });
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

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <button
              onClick={() => window.location.href = '/portal-home/common-registration'}
              className="
                inline-flex h-11 shrink-0 items-center justify-center gap-2
                rounded-[11px] bg-blue-600 px-5
                text-xs font-extrabold text-white
                shadow-[0_10px_20px_-12px_rgba(37,99,235,0.75)]
                hover:bg-blue-500 transition cursor-pointer
              "
            >
              <UserPlus size={16} />
              Register New User
            </button>

            {/* 3-Dots Action Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                className="
                  inline-flex h-11 w-11 shrink-0 items-center justify-center
                  rounded-[11px] border border-slate-200 bg-white
                  text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer
                "
                title="More Action Options"
              >
                <MoreVertical size={18} />
              </button>

              {showHeaderMenu && (
                <div className="absolute right-0 top-full mt-2 z-[60] w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-scale-in">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      selectExportType("CREDENTIALS");
                      setShowExportModal(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition cursor-pointer"
                  >
                    <Key size={16} className="text-amber-600 shrink-0" />
                    Download User Credentials
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER TOOLBAR ROW (SEARCH, ROLE DROPDOWN, WORKSPACE DROPDOWN, HIERARCHY) ── */}
      <div className="mx-4 sm:mx-5 lg:mx-6 min-h-[440px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
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
              <option value="ULB_OFFICER">ULB Officer</option>
              <option value="CITY_ADMIN">City Admin</option>
              <option value="QC">Quality Controller (QC)</option>
              <option value="ACTION_OFFICER">Action Officer</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="EMPLOYEE">Employee</option>
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

          {/* Zone Filter Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              value={filterZone}
              onChange={(e) => {
                setFilterZone(e.target.value);
                setFilterWard("");
              }}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400"
            >
              <option value="">All Zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {/* Ward Filter Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              value={filterWard}
              onChange={(e) => setFilterWard(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400"
            >
              <option value="">All Wards</option>
              {availableWards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
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

          {/* Green Download Icon Button next to Status Filter */}
          <button
            type="button"
            onClick={() => executeTableDataExport("XLSX")}
            className="
              inline-flex h-10 w-10 shrink-0 items-center justify-center
              rounded-[10px] bg-emerald-600 text-white
              shadow-xs hover:bg-emerald-500 transition cursor-pointer
            "
            title={`Download Filtered Table Data (${filteredUsers.length} Users)`}
          >
            <Download size={17} />
          </button>
        </div>

        {/* Active Filter Pills Bar */}
        {(searchQuery || filterRole !== "ALL" || filterWorkspace !== "ALL" || filterZone || filterWard || statusFilter !== "ALL" || filterDate) && (
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
            {filterZone && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                Zone: {zones.find(z => z.id === filterZone)?.name || filterZone}
                <button type="button" onClick={() => { setFilterZone(""); setFilterWard(""); }} className="text-slate-400 hover:text-slate-700">×</button>
              </span>
            )}
            {filterWard && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                Ward: {wards.find(w => w.id === filterWard)?.name || filterWard}
                <button type="button" onClick={() => setFilterWard("")} className="text-slate-400 hover:text-slate-700">×</button>
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
        <div className="overflow-x-auto min-h-[360px] flex-1">
          <table id="registered-users-table" className="w-full min-w-[1380px] table-fixed">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[5%]" />
            </colgroup>

            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75">
                {["SR. NO.", "USER NAME", "USER EMAIL", "MOBILE NUMBER", "USER ROLE", "STATE & CITY", "ZONE & WARD", "ASSIGNED MODULES", "CREATED ON", "ACTION"].map((h) => (
                  <th key={h} className="px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-[0.05em] text-slate-500 first:pl-5 last:pr-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={10} className="px-6 py-4"><div className="h-8 animate-pulse rounded-lg bg-slate-100" /></td></tr>
                ))
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-24 text-center text-xs font-semibold text-slate-400">
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

                  const openActionMenuUpward =
                    paginatedUsers.length > 3 && index >= paginatedUsers.length - 2;

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
                  // City Admin has complete city access, so an empty geo scope is intentional.
                  const isCityAdmin = u.role === 'CITY_ADMIN';
                  const zoneList: string[] = isCityAdmin
                    ? []
                    : u.zoneIds && u.zoneIds.length > 0
                      ? u.zoneIds.map((id: string, i: number) => cleanGeoLabel(id, 'Zone', i))
                      : u.zoneName || u.zone?.name
                        ? [u.zoneName || u.zone?.name]
                        : ['Zone 1'];

                  const wardList: string[] = isCityAdmin
                    ? []
                    : u.wardIds && u.wardIds.length > 0
                      ? u.wardIds.map((id: string, i: number) => cleanGeoLabel(id, 'Ward', i))
                      : u.wardName || u.ward?.name
                        ? [u.wardName || u.ward?.name]
                        : ['Ward 1'];

                  return (
                    <tr key={u.id} className="group hover:bg-blue-50/20 transition">
                      {/* Sr. No. */}
                      <td className="px-3 py-3 pl-5 align-middle text-xs font-black text-slate-700">
                        {srNo}
                      </td>

                      {/* User Name */}
                      <td className="px-3 py-3 align-middle">
                        <span className="truncate text-xs font-black text-slate-900 block">{u.name}</span>
                      </td>

                      {/* User Email */}
                      <td className="px-3 py-3 align-middle">
                        {(!u.email || u.email.trim() === '' || u.email.includes('@internal.')) ? (
                          <span className="truncate text-xs font-semibold text-slate-400 block">
                            N/A
                          </span>
                        ) : (
                          <span className="truncate text-xs font-semibold text-slate-600 block">
                            {u.email}
                          </span>
                        )}
                      </td >

                      {/* Mobile Number */}
                      < td className="px-3 py-3 align-middle" >
                        <span className="truncate text-xs font-semibold text-slate-700 block">{u.phone || '-'}</span>
                      </td >

                      {/* User Role */}
                      < td className="px-3 py-3 align-middle" >
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${getRoleBadgeStyle(u.role)}`}>
                          {u.role}
                        </span>
                      </td >

                      {/* State & City */}
                      < td className="px-3 py-3 align-middle" >
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
                      </td >

                      {/* Zone & Ward */}
                      <td className="px-3 py-3 align-middle">
                        {isCityAdmin ? (
                          <div className="flex flex-col gap-0.5 items-start text-xs min-w-[130px]">
                            <span className="font-bold text-emerald-700 text-[11px] flex items-center gap-1">
                              <Building2 size={11} className="text-emerald-600 shrink-0" />
                              Complete City
                            </span>
                            <span className="font-semibold text-slate-500 text-[10px]">
                              No Zone / Ward restriction
                            </span>
                          </div>
                        ) : (() => {
                          const totalZones = zoneList.length;
                          const totalWards = wardList.length;

                          return (
                            <div className="flex flex-col gap-1 items-start text-xs min-w-[130px]">
                              {/* Primary Zone & Ward Labels */}
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                                  <Map size={11} className="text-slate-400 shrink-0" />
                                  {zoneList[0] || 'Zone 1'}
                                  {totalZones > 1 && (
                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-1">
                                      +{totalZones - 1}
                                    </span>
                                  )}
                                </span>

                                <span className="font-semibold text-slate-600 text-[11px] flex items-center gap-1">
                                  <MapPin size={11} className="text-slate-400 shrink-0" />
                                  {wardList[0] || 'Ward 1'}
                                  {totalWards > 1 && (
                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-1">
                                      +{totalWards - 1}
                                    </span>
                                  )}
                                </span>
                              </div>

                              {/* View Details Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedUserGeoModal({ user: u, zoneList, wardList })}
                                className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-blue-600 hover:underline cursor-pointer transition"
                              >
                                <Eye size={10} />
                                View All ({totalZones} Z, {totalWards} W)
                              </button>
                            </div>
                          );
                        })()
                        }
                      </td >

                      {/* Assigned Modules - Inspection & Performance System Modules only */}
                      < td className="px-3 py-3 align-middle" >
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
                              if (mod.toUpperCase() === "TASKFORCE" || mod.toUpperCase().includes("CTU") || mod.toUpperCase().includes("GVP")) displayLabel = "GVP";
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
                      </td >

                      {/* Date Created On (Date + Time) */}
                      < td className="px-3 py-3 align-middle" >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800">{createdDate}</span>
                          <span className="text-[10px] font-semibold text-slate-400">{createdTime}</span>
                        </div>
                      </td >

                      {/* Control (3-Dots Dropdown Menu - Fully visible) */}
                      < td className="px-3 py-3 pr-5 align-middle relative" >
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
                            <div
                              className={`absolute right-0 w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-[100] flex flex-col gap-1 ${openActionMenuUpward
                                ? "bottom-full mb-1"
                                : "top-full mt-1"
                                }`}
                            >
                              <button
                                type="button"
                                onClick={() => { setEditingUser(u); setActiveMenuUserId(null); }}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition w-full text-left cursor-pointer"
                              >
                                <Edit2 size={13} /> Edit User
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenResetModal(u)}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 transition w-full text-left cursor-pointer"
                              >
                                <Lock size={13} /> Reset Password
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
                      </td >
                    </tr >
                  );
                })
              )}
            </tbody >
          </table >
        </div >

        {/* ── PAGINATION FOOTER ── */}
        {
          filteredUsers.length > 0 && (
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
          )
        }
      </div >

      {/* ── DELETE USER CONFIRM DIALOG ── */}
      {deleteTarget && (
        <ConfirmDialog
          open={true}
          title="Move User to Trash?"
          message={`Are you sure you want to delete registered user "${deleteTarget.name}"? The user will be moved to Trash Hub and can be restored for the next 10 days. After 10 days, the user will be permanently deleted automatically.`}
          confirmLabel="Move to Trash"
          tone="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteUser}
        />
      )}

      {/* ── EDIT USER CONFIGURATION MODAL ── */}
      {
        editingUser && (
          <EditUserModal
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSave={async () => {
              await loadData();
              setEditingUser(null);
              showToast({ title: "User updated", description: "User configuration saved successfully.", tone: "success" });
            }}
          />
        )
      }

      {/* ── ASSIGNED ZONE & WARD DETAILS MODAL ── */}
      {
        selectedUserGeoModal && (
          <Modal
            open={!!selectedUserGeoModal}
            onClose={() => setSelectedUserGeoModal(null)}
            title={`Assigned Zones & Wards - ${selectedUserGeoModal.user.name}`}
            size="md"
          >
            <div className="flex flex-col gap-6 py-1">
              {/* Header info card */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-extrabold">
                  {selectedUserGeoModal.user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-900 truncate">{selectedUserGeoModal.user.name}</h4>
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9.5px] font-black uppercase ${getRoleBadgeStyle(selectedUserGeoModal.user.role)}`}>
                      {selectedUserGeoModal.user.role}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 truncate">
                    {selectedUserGeoModal.user.email?.includes('@internal.')
                      ? (selectedUserGeoModal.user.phone ? `Mobile: ${selectedUserGeoModal.user.phone}` : 'Registere Users')
                      : selectedUserGeoModal.user.email}
                  </p>
                </div>
              </div>

              {/* Assigned Zones Box */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Map size={15} className="text-indigo-600" />
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Assigned Zones ({selectedUserGeoModal.zoneList.length})
                  </h5>
                </div>
                <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
                  {selectedUserGeoModal.zoneList.map((z, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-lg shadow-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                      {z}
                    </span>
                  ))}
                </div>
              </div>

              {/* Assigned Wards Box */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-amber-600" />
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Assigned Wards ({selectedUserGeoModal.wardList.length})
                  </h5>
                </div>
                <div className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
                  {selectedUserGeoModal.wardList.map((w, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-white border border-amber-200 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-lg shadow-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      {w}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserGeoModal(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )
      }

      {/* ── RESET PASSWORD MODAL ── */}
      {resetPasswordTarget && (
        <Modal
          open={!!resetPasswordTarget}
          onClose={() => setResetPasswordTarget(null)}
          title={`Reset Password - ${resetPasswordTarget.name}`}
          size="md"
        >
          <div className="flex flex-col gap-5 py-2">
            {/* User Info Header Card */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md shadow-amber-500/20 font-black text-sm">
                <Lock size={20} />
              </div>
              <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900 truncate">{resetPasswordTarget.name}</h4>
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[9.5px] font-black uppercase ${getRoleBadgeStyle(resetPasswordTarget.role)}`}>
                    {resetPasswordTarget.role}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-500 truncate">
                  Contact: <span className="text-slate-700 font-bold">{resetPasswordTarget.phone || resetPasswordTarget.email || "N/A"}</span>
                </p>
              </div>
            </div>

            {/* New Password Field & Action Controls */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-700">
                  Set New Password *
                </label>
              </div>

              <div className="relative">
                <input
                  type={showPasswordPlain ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-3.5 pr-10 text-xs font-bold text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordPlain(!showPasswordPlain)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title={showPasswordPlain ? "Hide password" : "Show password"}
                >
                  <Eye size={16} />
                </button>
              </div>

            </div>

            {/* Quick Actions & Confirm Buttons */}
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={copyResetCredentials}
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                {copiedCreds ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copiedCreds ? "Credentials Copied to Clipboard!" : "Copy User Login Credentials"}
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setResetPasswordTarget(null)}
                  disabled={updatingPassword}
                  className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updatingPassword || !newPassword}
                  onClick={handleConfirmPasswordReset}
                  className="flex-1 h-11 rounded-xl bg-amber-600 text-xs font-black text-white shadow-md shadow-amber-600/20 hover:bg-amber-500 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {updatingPassword ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Lock size={14} />
                  )}
                  {updatingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── REGISTER COMMISSIONER MODAL ── */}
      {showRegisterCommissionerModal && (
        <Modal
          open={showRegisterCommissionerModal}
          onClose={() => setShowRegisterCommissionerModal(false)}
          title="Register Commissioner"
          subtitle="CREATE A CITY-LEVEL READ-ONLY COMMISSIONER ACCOUNT"
          size="sm"
        >
          <form onSubmit={handleCreateCommissionerSubmit} className="flex flex-col gap-4 py-1">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-wider">
                City <span className="text-red-500">*</span>
              </label>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                value={commissionerCityId || citiesList[0]?.id || ""}
                onChange={(e) => setCommissionerCityId(e.target.value)}
                required
              >
                {citiesList.length === 0 ? (
                  <option value="">Indore (indore)</option>
                ) : (
                  citiesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code || c.id})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-wider">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                value={commissionerName}
                onChange={(e) => setCommissionerName(e.target.value)}
                placeholder="Commissioner Name"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-wider">
                Email Id <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                value={commissionerEmail}
                onChange={(e) => setCommissionerEmail(e.target.value)}
                placeholder="commissioner@city.local"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-wider">
                Enter Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                value={commissionerPassword}
                onChange={(e) => setCommissionerPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {commissionerStatus && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700">
                {commissionerStatus}
              </div>
            )}

            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowRegisterCommissionerModal(false)}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={commissionerCreating}
                className="flex-1 h-10 rounded-xl bg-blue-900 text-xs font-extrabold text-white shadow-md hover:bg-blue-800 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {commissionerCreating ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Shield size={15} />
                    <span>Create</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showExportModal && (
        <Modal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          title={exportType === "CREDENTIALS" ? "Download User Credentials" : "Export User Directory"}
          size="2xl"
        >
          <div className="flex flex-col gap-5 py-2">
            {/* Export Scope Filters (Zone, Ward, Role) */}
            <div className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/70">
              <div className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Filter size={15} className="text-blue-600" />
                  Select Filters for Export Scope:
                </span>
                <span className="text-xs font-black text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                  {finalExportUsers.length} records matching
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
                {/* Zone Scope MultiSelect */}
                <MultiSelectDropdown
                  label="Zone Scope"
                  options={zones.map((z) => ({
                    id: z.id,
                    name: z.name
                  }))}
                  selectedIds={exportModalZoneIds}
                  onChange={(newZoneIds) => {
                    setExportModalZoneIds(newZoneIds);
                    if (newZoneIds.length > 0) {
                      setExportModalWardIds((currWards) =>
                        currWards.filter((wid) => {
                          const w = wards.find((item) => item.id === wid);
                          return !w || !w.parentId || newZoneIds.includes(w.parentId);
                        })
                      );
                    }
                  }}
                  placeholder="All Zones"
                />

                {/* Ward Scope MultiSelect */}
                <MultiSelectDropdown
                  label="Ward Scope"
                  options={(exportModalZoneIds.length > 0
                    ? wards.filter((w) => !w.parentId || exportModalZoneIds.includes(w.parentId))
                    : wards
                  ).map((w) => ({
                    id: w.id,
                    name: w.name
                  }))}
                  selectedIds={exportModalWardIds}
                  onChange={setExportModalWardIds}
                  placeholder="All Wards"
                />

                {/* Role Scope */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role Scope</label>
                  <select
                    value={exportModalRole}
                    onChange={(e) => setExportModalRole(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 shadow-xs cursor-pointer"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="HMS_SUPER_ADMIN">Super Admin</option>
                    <option value="COMMISSIONER">Commissioner</option>
                    <option value="ULB_OFFICER">ULB Officer</option>
                    <option value="CITY_ADMIN">City Admin</option>
                    <option value="QC">Quality Controller (QC)</option>
                    <option value="ACTION_OFFICER">Action Officer</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Custom Field Selection Accordion Header */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide">
                Export Columns Selected:
              </span>
              <button
                type="button"
                onClick={() => setShowAdvancedCols(!showAdvancedCols)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              >
                {showAdvancedCols ? "Hide Column Customization" : "Customize Columns..."}
              </button>
            </div>

            {/* Collapsible Custom Field Selection */}
            {showAdvancedCols && (
              <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Select Specific Columns:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyExportPreset("ALL")}
                      className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 hover:bg-blue-100"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => applyExportPreset("CREDS")}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 hover:bg-slate-200"
                    >
                      Creds
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {ALL_EXPORT_COLUMNS.map((col) => {
                    const isSelected = !!selectedExportCols[col.key];
                    return (
                      <label
                        key={col.key}
                        onClick={() => toggleExportCol(col.key)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] font-bold cursor-pointer transition select-none ${isSelected
                          ? "bg-blue-50 border-blue-300 text-blue-900"
                          : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
                          }`}
                      >
                        <div className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition ${isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                          }`}>
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                        <span className="truncate">{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Footer with XLSX & CSV options */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="h-11 px-5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => executeCustomExcelExport("CSV")}
                  className="h-11 px-5 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-800 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => executeCustomExcelExport("XLSX")}
                  className="h-11 px-6 rounded-xl bg-blue-600 text-xs font-black text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Download Excel (.xlsx)
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div >
  );
}

function MultiSelectDropdown({
  label,
  options,
  selectedIds,
  onChange,
  placeholder = "Select...",
  openUpward = false,
  singleSelect = false
}: {
  label: string;
  options: {
    id: string;
    name: string;
  }[];
  selectedIds: string[];
  onChange: (
    newIds: string[]
  ) => void;
  placeholder?: string;
  openUpward?: boolean;
  singleSelect?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAllSelected = options.length > 0 && selectedIds.length === options.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.id));
    }
  };

  const toggleOption = (id: string) => {
    if (singleSelect) {
      onChange(
        selectedIds.includes(id)
          ? []
          : [id]
      );
      setIsOpen(false);
      return;
    }

    if (selectedIds.includes(id)) {
      onChange(
        selectedIds.filter(
          (item) => item !== id
        )
      );
    } else {
      onChange([
        ...selectedIds,
        id
      ]);
    }
  };

  const selectedNames = options
    .filter((o) => selectedIds.includes(o.id))
    .map((o) => o.name);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-bold text-slate-700">
          {label}

          {!singleSelect && (
            <span className="text-slate-400 font-normal">
              ({selectedIds.length} selected)
            </span>
          )}
        </label>
        {options.length > 0 &&
          !singleSelect && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              {isAllSelected ? "Clear All" : "Select All"}
            </button>
          )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 flex items-center justify-between outline-none focus:border-blue-500 shadow-xs cursor-pointer"
      >
        <span className="truncate text-left">
          {selectedNames.length > 0
            ? selectedNames.join(", ")
            : placeholder}
        </span>
        <ChevronDown size={14} className={`shrink-0 ml-2 text-slate-400 transition-transform ${isOpen ? "rotate-180 text-blue-600" : ""}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-[100] flex flex-col gap-1 ${openUpward
            ? "bottom-full mb-1"
            : "top-full mt-1"
            }`}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 font-medium">No options available</div>
          ) : (
            <>
              {/* Select All Option in Dropdown Menu Header */}
              {!singleSelect && (
                <>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="w-full px-3 py-1.5 rounded-lg text-xs font-black flex items-center justify-between text-left transition-colors cursor-pointer bg-blue-50/70 text-blue-800 hover:bg-blue-100 border border-blue-100"
                  >
                    <span>
                      {isAllSelected
                        ? "Deselect All"
                        : "Select All Options"}
                    </span>

                    <span className="text-[10px] font-bold text-blue-600">
                      {selectedIds.length}/
                      {options.length}
                    </span>
                  </button>

                  <div className="my-0.5 border-t border-slate-100" />
                </>
              )}

              {options.map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between text-left transition-colors cursor-pointer ${isSelected ? "bg-blue-50/60 text-blue-700 font-bold" : "hover:bg-slate-50 text-slate-700"
                      }`}
                  >
                    <span className="truncate">{opt.name}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => { }}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onSave }: { user: UserRecord; onClose: () => void; onSave: () => Promise<void> }) {
  const { showToast } = useToast();
  const [name, setName] = useState(user.name);
  const [email] = useState(user.email || "");
  const [role, setRole] = useState(user.role);
  const isSingleZoneRole =
    role === "SUPERVISOR" ||
    role === "QC";
  const [password, setPassword] = useState("");

  const [assignedModules, setAssignedModules] =
    useState<string[]>(() => {
      const moduleKeys = (user.modules || [])
        .map((m: any) => m.key || "")
        .filter(Boolean);

      return moduleKeys.length
        ? moduleKeys
        : (user.assignedModules || []);
    });

  const normalizeAssignedModuleKey = (value: string) => {
    const key = String(value || "")
      .trim()
      .toUpperCase();

    const aliases: Record<string, string> = {
      TASKFORCE_20: "TASKFORCE",

      LITTERBIN: "LITTERBINS",
      TWINBIN: "LITTERBINS",

      SWACHH: "SWACHH_RANKING",
      WARD_RANKING: "SWACHH_RANKING",

      WORKFORCE: "WORKFORCE_MONITORING",
      MATRIX: "WORKFORCE_MONITORING",
      MATRIXTRACK: "WORKFORCE_MONITORING",
      MATRIX_TRACK: "WORKFORCE_MONITORING",

      PROCESSING: "MRF",
      PROCESSING_MRF: "MRF",
      PROCESSING_PLANT: "MRF"
    };

    return aliases[key] || key;
  };

  const [zoneIds, setZoneIds] = useState<string[]>(() => {
    const cityScope = [
      ...(user.zoneIds || []),
      ...(user.zoneId ? [user.zoneId] : [])
    ].filter(Boolean);

    // City-level scope is the source of truth.
    if (cityScope.length > 0) {
      return Array.from(new Set(cityScope));
    }

    // Legacy fallback only when old users have no UserCity scope.
    return Array.from(
      new Set(
        (user.modules || [])
          .flatMap((m: any) => m.zoneIds || [])
          .filter(Boolean)
      )
    );
  });

  const [wardIds, setWardIds] = useState<string[]>(() => {
    const cityScope = [
      ...(user.wardIds || []),
      ...(user.wardId ? [user.wardId] : [])
    ].filter(Boolean);

    if (cityScope.length > 0) {
      return Array.from(new Set(cityScope));
    }

    return Array.from(
      new Set(
        (user.modules || [])
          .flatMap((m: any) => m.wardIds || [])
          .filter(Boolean)
      )
    );
  });

  const [zones, setZones] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          zonesRes,
          wardsRes,
          modsRes,
          meRes
        ] = await Promise.all([
          apiFetch<{ nodes: any[] }>(
            "/city/geo?level=ZONE"
          ).catch(() => ({ nodes: [] })),

          apiFetch<{ nodes: any[] }>(
            "/city/geo?level=WARD"
          ).catch(() => ({ nodes: [] })),

          CityModulesApi.list().catch(() => []),

          apiFetch<{
            user: {
              role?: string;
              roles?: string[];
              modules?: Array<{
                id?: string;
                key?: string;
                name?: string;
              }>;
            };
          }>("/auth/me").catch(() => ({
            user: {
              role: "",
              roles: [],
              modules: []
            }
          }))
        ]);
        setZones(zonesRes.nodes || []);
        setWards(wardsRes.nodes || []);

        const fetchedMods = modsRes || [];

        const currentUser =
          (meRes as any)?.user || {};

        const currentRoles = [
          currentUser.role,
          ...(currentUser.roles || [])
        ]
          .filter(Boolean)
          .map((role) =>
            String(role).trim().toUpperCase()
          );

        const isHmsSuperAdmin =
          currentRoles.includes(
            "HMS_SUPER_ADMIN"
          );

        const myModuleKeys = new Set(
          (currentUser.modules || [])
            .map((module: any) =>
              normalizeAssignedModuleKey(
                module.key ||
                module.name ||
                ""
              )
            )
            .filter(Boolean)
        );

        const visibleModules =
          isHmsSuperAdmin
            ? fetchedMods
            : fetchedMods.filter(
              (module: any) =>
                myModuleKeys.has(
                  normalizeAssignedModuleKey(
                    module.key ||
                    module.name ||
                    ""
                  )
                )
            );

        setModules(visibleModules);
      } catch (err) {
        console.error("Failed to load options", err);
      } finally {
        setFetchingData(false);
      }
    }
    fetchData();
  }, []);

  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const availableWards = useMemo(() => {
    if (
      isSingleZoneRole &&
      zoneIds.length === 0
    ) {
      return [];
    }

    if (!zoneIds.length) {
      return wards;
    }

    return wards.filter((ward: any) => {
      const parentZoneId =
        ward.parentId ||
        ward.parent?.id;

      return (
        !parentZoneId ||
        zoneIds.includes(parentZoneId)
      );
    });
  }, [
    wards,
    zoneIds,
    isSingleZoneRole
  ]);

  const handleZoneChange = (
    newZoneIds: string[]
  ) => {
    const nextZoneIds =
      isSingleZoneRole
        ? newZoneIds.slice(-1)
        : newZoneIds;

    setZoneIds(nextZoneIds);

    if (nextZoneIds.length > 0) {
      setWardIds((currentWardIds) =>
        currentWardIds.filter((wardId) => {
          const ward = wards.find(
            (item: any) =>
              item.id === wardId
          );

          if (!ward) return false;

          const parentZoneId =
            ward.parentId ||
            ward.parent?.id;

          return (
            !parentZoneId ||
            nextZoneIds.includes(
              parentZoneId
            )
          );
        })
      );
    } else {
      setWardIds([]);
    }
  };

  useEffect(() => {
    if (fetchingData || wards.length === 0) {
      return;
    }

    if (isSingleZoneRole && zoneIds.length > 1) {
      const retainedZoneId = zoneIds[0];
      setZoneIds([retainedZoneId]);
    }

    if (zoneIds.length > 0) {
      setWardIds((currentWardIds) => {
        const cleaned = currentWardIds.filter((wardId) => {
          const ward = wards.find((item: any) => item.id === wardId);
          if (!ward) return true; // Keep if not loaded yet
          const parentZoneId = ward.parentId || ward.parent?.id;
          return !parentZoneId || zoneIds.includes(parentZoneId);
        });

        // If wards changed, update state
        if (cleaned.length !== currentWardIds.length) {
          return cleaned;
        }
        return currentWardIds;
      });
    }
  }, [
    fetchingData,
    isSingleZoneRole,
    zoneIds,
    wards
  ]);

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setStatusMsg(null);

    if (
      isSingleZoneRole &&
      zoneIds.length !== 1
    ) {
      setStatusMsg({
        type: "error",
        text:
          "Supervisor and QC users must be assigned to exactly one zone."
      });

      return;
    }

    setLoading(true);

    try {
      const enabledModuleKeys = new Set(
        modules
          .filter((m: any) => m.enabled !== false)
          .map((m: any) =>
            String(m.key || "")
              .trim()
              .toUpperCase()
          )
      );

      const safeAssignedModules = Array.from(
        new Set(
          assignedModules
            .map(normalizeAssignedModuleKey)
            .filter((key) =>
              enabledModuleKeys.size === 0 || enabledModuleKeys.has(key)
            )
        )
      );

      const mappedModules = safeAssignedModules.map(
        (modId) => ({
          moduleId: modId,
          canWrite: true,
          zoneIds,
          wardIds
        })
      );

      await CityUserApi.update(user.id, {
        name: name.trim(),
        ...(password.trim()
          ? { password: password.trim() }
          : {}),
        role: role as any,
        modules: mappedModules,
        zoneIds,
        wardIds
      });

      setStatusMsg({
        type: "success",
        text: `User details and access permissions for "${name}" updated successfully!`
      });

      showToast({
        title: "Access Saved",
        description: `Updated access permissions for ${name}.`,
        tone: "success"
      });

      setTimeout(async () => {
        await onSave();
      }, 1000);
    } catch (err: any) {
      console.error("Failed to update user access", err);
      setStatusMsg({
        type: "error",
        text: err?.message || "Failed to update user access permissions. Please try again."
      });
      showToast({
        title: "Update Failed",
        description: err?.message || "Failed to save user access permissions.",
        tone: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit User & Access Permissions"
      subtitle={user.email || user.phone || "No login email"}
      size="2xl"
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[80vh] flex-col"
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-1.5">
          <div className="space-y-4 pb-4">


            {/* User Details */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Users size={16} className="text-blue-600" />
                <div>
                  <div className="text-xs font-black text-slate-800">
                    User Details
                  </div>
                  <div className="text-[10px] font-medium text-slate-400">
                    Basic account and location information
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Full Name
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Email Address
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-500"
                    value={email}
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Mobile Number
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-500"
                    value={user.phone || "-"}
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    System Role
                  </label>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                  >
                    <option value="HMS_SUPER_ADMIN">Super Admin</option>
                    <option value="COMMISSIONER">Commissioner</option>
                    <option value="ULB_OFFICER">ULB Officer</option>
                    <option value="CITY_ADMIN">City Admin</option>
                    <option value="QC">Quality Controller (QC)</option>
                    <option value="ACTION_OFFICER">Action Officer</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    City
                  </label>
                  <div className="h-10 flex items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-600">
                    <Building2 size={13} className="mr-2 text-blue-500" />
                    {user.cityName || user.city?.name || "-"}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    State
                  </label>
                  <div className="h-10 flex items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-600">
                    <Globe size={13} className="mr-2 text-emerald-500" />
                    {user.stateName || user.city?.state?.name || "-"}
                  </div>
                </div>
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
                  if (fetchingData) {
                    return (
                      <div className="col-span-2 py-5 text-center text-xs font-semibold text-slate-400">
                        Loading available systems...
                      </div>
                    );
                  }

                  const enabledKeys = new Set(
                    modules
                      .filter((m: any) => m.enabled)
                      .map((m: any) =>
                        String(m.key || "")
                          .trim()
                          .toUpperCase()
                      )
                  );

                  const taskforceSubModules = [
                    {
                      id: "LITTERBINS",
                      name: "Litter Bins"
                    },
                    {
                      id: "SWEEPING",
                      name: "Sweeping"
                    },
                    {
                      id: "TOILET",
                      name: "Cleanliness of Toilets"
                    },
                    {
                      id: "TASKFORCE",
                      name: "CTU / GVP Transformation"
                    }
                  ].filter((sub) =>
                    enabledKeys.size === 0 || enabledKeys.has(sub.id)
                  );

                  const mainSystems: {
                    id: string;
                    name: string;
                  }[] = [];

                  if (taskforceSubModules.length > 0) {
                    mainSystems.push({
                      id: "TASKFORCE_20",
                      name: "Inspection & Performance System"
                    });
                  }

                  if (
                    enabledKeys.size === 0 || enabledKeys.has("SWACHH_RANKING")
                  ) {
                    mainSystems.push({
                      id: "SWACHH_RANKING",
                      name: "Ward Ranking System"
                    });
                  }

                  if (
                    enabledKeys.size === 0 || enabledKeys.has("WORKFORCE_MONITORING")
                  ) {
                    mainSystems.push({
                      id: "WORKFORCE_MONITORING",
                      name: "Workforce Attendance System"
                    });
                  }

                  if (enabledKeys.size === 0 || enabledKeys.has("MRF")) {
                    mainSystems.push({
                      id: "MRF",
                      name: "Processing Plant System"
                    });
                  }

                  const selectedKeys = new Set(
                    assignedModules.map(
                      normalizeAssignedModuleKey
                    )
                  );

                  const taskforceKeys = [
                    "TASKFORCE",
                    "LITTERBINS",
                    "TOILET",
                    "SWEEPING"
                  ];

                  const isTaskforceActive =
                    taskforceKeys.some((key) =>
                      selectedKeys.has(key)
                    );

                  const isSwachhActive =
                    selectedKeys.has(
                      "SWACHH_RANKING"
                    );

                  const isWorkforceActive =
                    selectedKeys.has(
                      "WORKFORCE_MONITORING"
                    );

                  const isProcessingActive =
                    selectedKeys.has("MRF");

                  const removeKeys = (
                    current: string[],
                    keys: string[]
                  ) =>
                    current.filter(
                      (item) =>
                        !keys.includes(
                          normalizeAssignedModuleKey(
                            item
                          )
                        )
                    );

                  const addKeys = (
                    current: string[],
                    keys: string[]
                  ) =>
                    Array.from(
                      new Set([
                        ...current.map(
                          normalizeAssignedModuleKey
                        ),
                        ...keys
                      ])
                    );

                  const toggleMainSystem = (
                    sysId: string
                  ) => {
                    if (sysId === "TASKFORCE_20") {
                      setAssignedModules((prev) =>
                        isTaskforceActive
                          ? removeKeys(
                            prev,
                            taskforceKeys
                          )
                          : addKeys(
                            prev,
                            taskforceSubModules.map(
                              (sub) => sub.id
                            )
                          )
                      );

                      return;
                    }

                    if (
                      sysId === "SWACHH_RANKING"
                    ) {
                      setAssignedModules((prev) =>
                        isSwachhActive
                          ? removeKeys(prev, [
                            "SWACHH_RANKING"
                          ])
                          : addKeys(prev, [
                            "SWACHH_RANKING"
                          ])
                      );

                      return;
                    }

                    if (
                      sysId ===
                      "WORKFORCE_MONITORING"
                    ) {
                      setAssignedModules((prev) =>
                        isWorkforceActive
                          ? removeKeys(prev, [
                            "WORKFORCE_MONITORING"
                          ])
                          : addKeys(prev, [
                            "WORKFORCE_MONITORING"
                          ])
                      );

                      return;
                    }

                    if (sysId === "MRF") {
                      setAssignedModules((prev) =>
                        isProcessingActive
                          ? removeKeys(prev, [
                            "MRF"
                          ])
                          : addKeys(prev, [
                            "MRF"
                          ])
                      );
                    }
                  };

                  if (!mainSystems.length) {
                    return (
                      <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-xs font-semibold text-slate-500">
                        No systems are enabled for this city.
                      </div>
                    );
                  }

                  return (
                    <>
                      {mainSystems.map((sys) => {
                        let isSelected = false;

                        if (
                          sys.id === "TASKFORCE_20"
                        ) {
                          isSelected =
                            isTaskforceActive;
                        }

                        if (
                          sys.id ===
                          "SWACHH_RANKING"
                        ) {
                          isSelected =
                            isSwachhActive;
                        }

                        if (
                          sys.id ===
                          "WORKFORCE_MONITORING"
                        ) {
                          isSelected =
                            isWorkforceActive;
                        }

                        if (sys.id === "MRF") {
                          isSelected =
                            isProcessingActive;
                        }

                        return (
                          <div
                            key={sys.id}
                            className="col-span-2 space-y-2"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                toggleMainSystem(
                                  sys.id
                                )
                              }
                              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-black flex items-center justify-between transition-all cursor-pointer ${isSelected
                                ? "border-blue-500 bg-blue-50/80 text-blue-800 shadow-2xs"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                              <span>
                                {sys.name}
                              </span>

                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${isSelected
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "border-slate-300 bg-white"
                                  }`}
                              >
                                {isSelected && "✓"}
                              </span>
                            </button>

                            {sys.id ===
                              "TASKFORCE_20" &&
                              isSelected && (
                                <div className="pl-3 pt-1 border-l-2 border-blue-300 grid grid-cols-2 gap-2 mt-1">
                                  {taskforceSubModules.map(
                                    (sub) => {
                                      const isSubSelected =
                                        selectedKeys.has(
                                          sub.id
                                        );

                                      const toggleSub =
                                        () => {
                                          setAssignedModules(
                                            (prev) =>
                                              isSubSelected
                                                ? removeKeys(
                                                  prev,
                                                  [
                                                    sub.id
                                                  ]
                                                )
                                                : addKeys(
                                                  prev,
                                                  [
                                                    sub.id
                                                  ]
                                                )
                                          );
                                        };

                                      return (
                                        <button
                                          type="button"
                                          key={sub.id}
                                          onClick={
                                            toggleSub
                                          }
                                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-extrabold flex items-center justify-between transition-all cursor-pointer ${isSubSelected
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                            }`}
                                        >
                                          <span>
                                            {sub.name}
                                          </span>

                                          <input
                                            type="checkbox"
                                            checked={
                                              isSubSelected
                                            }
                                            readOnly
                                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                                          />
                                        </button>
                                      );
                                    }
                                  )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MultiSelectDropdown
                label={
                  isSingleZoneRole
                    ? "Assigned Zone"
                    : "Assigned Zones"
                }
                options={zones.map((z) => ({
                  id: z.id,
                  name: z.name
                }))}
                selectedIds={zoneIds}
                onChange={handleZoneChange}
                placeholder={
                  isSingleZoneRole
                    ? "Select one zone..."
                    : "Select zones..."
                }
                singleSelect={isSingleZoneRole}
                openUpward
              />

              <MultiSelectDropdown
                label="Assigned Wards"
                options={availableWards.map((w) => ({
                  id: w.id,
                  name: w.name
                }))}
                selectedIds={wardIds}
                onChange={setWardIds}
                placeholder={
                  isSingleZoneRole &&
                    zoneIds.length === 0
                    ? "Select zone first..."
                    : "Select assigned wards..."
                }
                openUpward
              />
            </div>

            {/* Status Message Alert Box */}
            {statusMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 shadow-2xs transition-all ${statusMsg.type === "success"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-red-50 border-red-300 text-red-800"
                  }`}
              >
                {statusMsg.type === "success" ? (
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={17} className="text-red-600 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <div className="shrink-0 flex gap-3 border-t border-slate-200 bg-white pt-3 mt-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Saving Access Permissions...</span>
                  </>
                ) : (
                  "Save Access Permissions"
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
