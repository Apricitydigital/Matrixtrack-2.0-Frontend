import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  KeyRound,
  MapPin,
  Settings as SettingsIcon,
  ShieldCheck,
  User2,
  Monitor,
  Clock,
  Globe,
  Ban,
  RefreshCw,
  Smartphone,
  Laptop
} from "lucide-react";
import { useCallback } from "react";
import { ALLOWED_CITIES_ENDPOINT, buildApiUrl } from "../config";
import { useAuth } from "../AuthContext";
import SearchableSelect from "../components/SearchableSelect";
import Swal from "sweetalert2";

const USERS_ENDPOINT = buildApiUrl("/rbac/users");
const PERMISSIONS_ENDPOINT = buildApiUrl("/rbac/permissions");

const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "master", label: "Master View" },
  { key: "geofencing", label: "GeoFencing" },
  { key: "supervisors", label: "Supervisors" },
  { key: "assign-supervisor-ward", label: "Assign Supervisor Kothi" },

  { key: "employees", label: "Employees" },
  { key: "attendance-reports", label: "Attendance Reports" },
  { key: "short-attendance", label: "Short Attendance Report" },
  { key: "supervisor-audit", label: "Supervisor Attendance Audit" },
  { key: "field-access-requests", label: "Professional Access Requests" },
  { key: "professional-attendance", label: "Professional Attendance" },
  { key: "professional-leave-mgmt", label: "Professional Leave Management" },
  { key: "professional-leave-allocation", label: "Professional Leave Allocations" },
  { key: "announcements", label: "Announcements" },
  { key: "system-health", label: "System Health" },
  { key: "activity-logs", label: "Activity Logs" },
  { key: "settings", label: "Settings" },
];

const LEVELS = [
  { key: "none", label: "No Access" },
  { key: "view", label: "View Only" },
  { key: "write", label: "Write" },
];

function Settings() {
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [moduleLevels, setModuleLevels] = useState({});
  const [loading, setLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [customPolicy, setCustomPolicy] = useState("global");
  const [customMaxDevices, setCustomMaxDevices] = useState(10);
  const [success, setSuccess] = useState(null);
  const [availableCities, setAvailableCities] = useState([]);
  const [availableZones, setAvailableZones] = useState([]);
  const [availableSectors, setAvailableSectors] = useState([]);
  const [availableWards, setAvailableWards] = useState([]);
  const [cityScopeAll, setCityScopeAll] = useState(false);
  const [selectedCityIds, setSelectedCityIds] = useState([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState([]);
  const [selectedKothiIds, setSelectedKothiIds] = useState([]);
  const [expandedKothiRows, setExpandedKothiRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const { refreshUser, user: currentUser, logPageView } = useAuth();
  const isAdmin =
    (currentUser?.role || "").toString().toLowerCase() === "admin";

  useEffect(() => {
    if (logPageView) logPageView("Settings", "/settings");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- ACTIVE SESSIONS LOGIC ---
  const [mySessions, setMySessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  const fetchMySessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const response = await fetch(buildApiUrl("/auth/active-sessions"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
        setMySessions(await response.json());
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchMySessions();
    const intv = setInterval(fetchMySessions, 30000); // 30s refresh
    return () => clearInterval(intv);
  }, [fetchMySessions]);

  const revokeSession = async (id) => {
    if (!window.confirm("Are you sure you want to log out of this device?")) return;
    try {
      const response = await fetch(buildApiUrl("/auth/revoke-session"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}` 
        },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        fetchMySessions();
      }
    } catch (err) {
      console.error("Failed to revoke session", err);
    }
  };
  // ------------------------------
  const buildRequestConfig = useMemo(() => {
    return {
      withCredentials: true,
      headers: (() => {
        const token = localStorage.getItem("token");
        return token ? { Authorization: `Bearer ${token}` } : {};
      })(),
    };
  }, []);

  const permissionMap = useMemo(() => {
    const map = {};
    permissions.forEach((perm) => {
      const module = perm.module?.toLowerCase();
      const action = perm.action?.toLowerCase();
      if (module && action) {
        map[`${module}:${action}`] = perm.id;
      }
    });
    return map;
  }, [permissions]);

  const ensurePermissionId = async (module, action) => {
    const key = `${module}:${action}`;
    if (permissionMap[key]) return permissionMap[key];
    const payload = {
      module,
      action,
      label: `${module} ${action}`,
      description: `Auto-created for ${module} ${action}`,
    };
    const { data } = await axios.post(
      PERMISSIONS_ENDPOINT,
      payload,
      buildRequestConfig
    );
    await fetchPermissions();
    return data?.id || permissionMap[key];
  };

  const fetchPermissions = async () => {
    try {
      const { data } = await axios.get(PERMISSIONS_ENDPOINT, buildRequestConfig);
      setPermissions(data);
    } catch (err) {
      console.error("Failed to fetch permissions:", err);
    }
  };

  const fetchZones = async () => {
    try {
      const { data } = await axios.get(
        buildApiUrl("/zones"),
        buildRequestConfig
      );
      setAvailableZones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load zones", err);
      setAvailableZones([]);
    }
  };

  const fetchSectors = async () => {
    try {
      const { data } = await axios.get(
        buildApiUrl("/sectors"),
        buildRequestConfig
      );
      setAvailableSectors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load sectors", err);
      setAvailableSectors([]);
    }
  };

  const fetchWards = async () => {
    try {
      const { data } = await axios.get(
        buildApiUrl("/wards"),
        buildRequestConfig
      );
      setAvailableWards(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load wards", err);
      setAvailableWards([]);
    }
  };

  const fetchAllowedCities = async () => {
    try {
      const { data } = await axios.get(
        ALLOWED_CITIES_ENDPOINT,
        buildRequestConfig
      );
      const payload = data || {};
      const cityList = Array.isArray(payload.cities)
        ? payload.cities
        : Array.isArray(payload)
          ? payload
          : [];
      setCityScopeAll(Boolean(payload.all));
      setAvailableCities(cityList);
    } catch (err) {
      console.error("Failed to load cities", err);
      setAvailableCities([]);
      setCityScopeAll(false);
    }
  };

  const scopedCityIds = useMemo(() => {
    if (cityScopeAll) return new Set();
    return new Set(
      availableCities
        .map((city) => Number(city.city_id))
        .filter((cityId) => Number.isFinite(cityId))
    );
  }, [availableCities, cityScopeAll]);

  const userFallsWithinScopedCities = useCallback(
    (user) => {
      if (cityScopeAll) return true;
      if (scopedCityIds.size === 0) return false;

      const access = user?.access || {};
      const candidateIds = [
        ...(Array.isArray(access.cities) ? access.cities.map((city) => city.city_id) : []),
        ...(Array.isArray(access.zones) ? access.zones.map((zone) => zone.city_id) : []),
        ...(Array.isArray(access.kothis) ? access.kothis.map((kothi) => kothi.city_id) : []),
      ]
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));

      if (!candidateIds.length) return false;
      return candidateIds.some((cityId) => scopedCityIds.has(cityId));
    },
    [cityScopeAll, scopedCityIds]
  );

  const unifiedTree = useMemo(() => {
    const tree = {};

    // 1. Initialize with all cities
    availableCities.forEach((city) => {
      tree[city.city_id] = {
        cityId: city.city_id,
        city: city.city_name,
        zones: {},
      };
    });

    // 2. Add all zones
    availableZones.forEach((zone) => {
      const cityId = zone.city_id;
      if (tree[cityId]) {
        tree[cityId].zones[zone.zone_id] = {
          zoneId: zone.zone_id,
          zone: zone.zone_name,
          wards: [],
        };
      }
    });

    // 3. Populate with wards (and nested structure from availableWards if available)
    availableWards.forEach((cityNode) => {
      const cityId = cityNode.cityId;
      if (tree[cityId]) {
        (cityNode.zones || []).forEach((zoneNode) => {
          const zoneId = zoneNode.zoneId;
          if (tree[cityId].zones[zoneId]) {
            tree[cityId].zones[zoneId].wards = zoneNode.wards || [];
          }
        });
      }
    });

    return tree;
  }, [availableCities, availableZones, availableWards]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(USERS_ENDPOINT, buildRequestConfig);
      setUsers(data);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
    fetchUsers();
    fetchAllowedCities();
    fetchZones();
    fetchSectors();
    fetchWards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deriveLevelsFromUser = (user) => {
    const levels = {};
    (user?.access?.permissions || []).forEach((perm) => {
      const module = perm.module?.toLowerCase();
      const action = perm.action?.toLowerCase();
      if (!module || !action) return;
      const current = levels[module];
      if (action === "write" || current === "write") {
        levels[module] = "write";
      } else if (!current) {
        levels[module] = "view";
      }
    });
    return levels;
  };

  const handleSelectUser = (event) => {
    const value = event.target.value;
    setSelectedUserId(value);
    setSuccess(null);
    setError(null);
    if (!value) {
      setModuleLevels({});
      setSelectedCityIds([]);
      setSelectedZoneIds([]);
      setSelectedKothiIds([]);
      return;
    }
    const user = users.find((u) => String(u.user_id) === String(value));
    setModuleLevels(deriveLevelsFromUser(user));
    setSelectedCityIds((user?.access?.cities || []).map((city) => Number(city.city_id)));
    setSelectedZoneIds((user?.access?.zones || []).map((zone) => Number(zone.zone_id)));
    setSelectedKothiIds(
      (user?.access?.kothis || []).map((kothi) => Number(kothi.ward_id))
    );
    setCustomPolicy(user?.custom_login_policy || "global");
    setCustomMaxDevices(user?.custom_max_devices || 10);
  };

  const setLevel = (moduleKey, level) => {
    setModuleLevels((prev) => ({
      ...prev,
      [moduleKey]: level,
    }));
  };

  const toggleCitySelection = (cityIdRaw) => {
    const cityId = Number(cityIdRaw);
    setSelectedCityIds((prev) => {
      const exists = prev.includes(cityId);
      const next = exists
        ? prev.filter((id) => id !== cityId)
        : [...prev, cityId];

      setSelectedZoneIds((zones) =>
        zones.filter((zoneId) => {
          const zone = availableZones.find((z) => Number(z.zone_id) === Number(zoneId));
          return zone && next.includes(Number(zone.city_id));
        })
      );
      return next;
    });
  };

  const toggleZoneSelection = (zoneIdRaw) => {
    const zoneId = Number(zoneIdRaw);
    setSelectedZoneIds((prev) => {
      const exists = prev.includes(zoneId);
      const next = exists
        ? prev.filter((id) => id !== zoneId)
        : [...prev, zoneId];
      return next;
    });
  };

  const toggleKothiSelection = (wardIdRaw) => {
    const wardId = Number(wardIdRaw);
    setSelectedKothiIds((prev) => {
      const exists = prev.includes(wardId);
      if (exists) return prev.filter((id) => id !== wardId);
      return [...prev, wardId];
    });
  };

  const selectAllKothisForZone = (zoneIdRaw, wards = []) => {
    if (!wards.length) return;
    const wardIds = wards.map(w => Number(w.wardId));
    setSelectedKothiIds(prev => {
      const otherWards = prev.filter(id => !wardIds.includes(id));
      // If all already selected, unselect all for this zone
      const allSelected = wardIds.every(id => prev.includes(id));
      if (allSelected) return otherWards;
      return [...otherWards, ...wardIds];
    });
  };

  const handleEditUser = (userId) => {
    const user = users.find((u) => String(u.user_id) === String(userId));
    if (!user) return;
    setSelectedUserId(userId);
    setModuleLevels(deriveLevelsFromUser(user));
    setSelectedCityIds((user.access?.cities || []).map((city) => city.city_id));
    setSelectedZoneIds((user.access?.zones || []).map((zone) => zone.zone_id));
    setSelectedKothiIds(
      (user.access?.kothis || []).map((kothi) => kothi.ward_id)
    );
    setSuccess(null);
    setError(null);
  };

  const handleDeletePermissions = async (userId) => {
    const user = users.find((u) => String(u.user_id) === String(userId));
    if (!user) return;
    const confirmed = window.confirm(
      `Remove all permissions for ${user.name || user.email}?`
    );
    if (!confirmed) return;
    setDeletingUserId(userId);
    setError(null);
    setSuccess(null);
    try {
      await axios.put(
        `${USERS_ENDPOINT}/${userId}`,
        { permissions: [] },
        buildRequestConfig
      );
      await fetchUsers();
      if (
        currentUser?.user_id &&
        String(currentUser.user_id) === String(userId)
      ) {
        await refreshUser?.();
      }
      setSuccess("Permissions removed.");
      Swal.fire({
        icon: "success",
        title: "Permissions Removed",
        text: "Permissions have been successfully removed for the user.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      if (String(selectedUserId) === String(userId)) {
        setSelectedUserId("");
        setModuleLevels({});
        setSelectedCityIds([]);
        setSelectedZoneIds([]);
        setSelectedKothiIds([]);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err?.response?.data?.error || "Failed to remove permissions.";
      setError(errMsg);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errMsg,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      setError("Select a user first.");
      Swal.fire({
        icon: "warning",
        title: "No User Selected",
        text: "Please select a user first.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payloadPermissions = [];
      for (const module of MODULES) {
        const level = moduleLevels[module.key] || "none";
        if (level === "none") continue;
        const permId = await ensurePermissionId(module.key, level);
        if (permId) {
          payloadPermissions.push({ id: permId });
        }
      }

      await axios.put(
        `${USERS_ENDPOINT}/${selectedUserId}`,
        {
          permissions: payloadPermissions,
          allowedCities: selectedCityIds,
          allowedZones: selectedZoneIds,
          allowedKothis: selectedKothiIds,
          customLoginPolicy: customPolicy === "global" ? null : customPolicy,
          customMaxDevices: customPolicy === "multiple" ? customMaxDevices : null,
        },
        buildRequestConfig
      );
      setSuccess("Permissions updated.");
      Swal.fire({
        icon: "success",
        title: "Permissions updated.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      await fetchUsers();
      if (
        currentUser?.user_id &&
        String(currentUser.user_id) === String(selectedUserId)
      ) {
        await refreshUser?.();
      }
    } catch (err) {
      console.error(err);
      const errMsg = err?.response?.data?.error || "Failed to save permissions.";
      setError(errMsg);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errMsg,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const buildModuleSummary = (user) => {
    const levels = deriveLevelsFromUser(user);
    return Object.entries(levels)
      .map(([module, level]) => {
        const moduleLabel =
          MODULES.find((m) => m.key === module)?.label || module;
        const levelLabel = LEVELS.find((l) => l.key === level)?.label || level;
        return `${moduleLabel}: ${levelLabel}`;
      })
      .join(", ");
  };

  const buildCitySummary = (user) => {
    const cities = user?.access?.cities || [];
    if (!cities.length) return "—";
    return cities
      .map((city) => city.city_name || city.name || city.city)
      .filter(Boolean)
      .join(", ");
  };

  const buildZoneSummary = (user) => {
    const zones = user?.access?.zones || [];
    if (!zones.length) return "—";
    return zones
      .map((zone) => {
        const cityLabel = zone.city_name || zone.city || "";
        const zoneLabel = zone.zone_name || zone.name || "";
        return cityLabel ? `${zoneLabel} (${cityLabel})` : zoneLabel;
      })
      .filter(Boolean)
      .join(", ");
  };

  const buildKothiSummary = (user) => {
    const kothis = Array.isArray(user?.access?.kothis) ? user.access.kothis : [];
    const names = kothis
      .map((kothi) => {
        const sectorLabel = kothi.sector_name || kothi.name || "";
        const wardLabel = kothi.ward_name || kothi.ward || "";
        if (!wardLabel && !sectorLabel) return null;
        return sectorLabel ? `${wardLabel} (${sectorLabel})` : wardLabel;
      })
      .filter(Boolean);
    return { count: names.length, names };
  };

  const filteredUsers = useMemo(() => {
    const nonAdmins = users
      .filter((u) => u.role !== 'admin')
      .filter(userFallsWithinScopedCities);
    if (isAdmin) return nonAdmins;
    
    const me = currentUser?.user_id;
    return nonAdmins.filter(
      (u) =>
        String(u.user_id) === String(me) ||
        String(u.created_by) === String(me)
    );
  }, [users, isAdmin, currentUser, userFallsWithinScopedCities]);

  const assignedUsers = useMemo(() => {
    const base = isAdmin ? users : filteredUsers;
    return base.filter((u) => (u?.access?.permissions || []).length);
  }, [users, filteredUsers, isAdmin]);

  const totalPages = Math.ceil((assignedUsers?.length || 0) / ITEMS_PER_PAGE);
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [assignedUsers, currentPage, totalPages]);

  const paginatedUsers = useMemo(() => {
    if (!assignedUsers) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return assignedUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [assignedUsers, currentPage]);

  useEffect(() => {
    if (
      selectedUserId &&
      !filteredUsers.some((u) => String(u.user_id) === String(selectedUserId))
    ) {
      setSelectedUserId("");
      setModuleLevels({});
      setSelectedCityIds([]);
      setSelectedZoneIds([]);
      setSelectedKothiIds([]);
    }
  }, [filteredUsers, selectedUserId]);

  const canEditSelected = useMemo(() => {
    if (isAdmin) return true;
    const me = currentUser?.user_id;
    const target = filteredUsers.find(
      (u) => String(u.user_id) === String(selectedUserId)
    );
    return target && String(target.created_by) === String(me);
  }, [isAdmin, currentUser, filteredUsers, selectedUserId]);

  return (
    <div  className="p-5 lg:p-8 mx-auto space-y-8 text-slate-800 dark:text-slate-100">
      <div className="flex items-center gap-2 text-2xl font-bold text-slate-800 dark:text-white">
        <SettingsIcon size={22} /> Admin Settings
      </div>

      {/* MY ACTIVE DEVICES */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm animate-in fade-in">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
          <div className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
            <Monitor size={18} className="text-indigo-500" /> My Active Devices
          </div>
          <button 
            onClick={fetchMySessions} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-50 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 transition-colors"
            title="Refresh sessions"
          >
            <RefreshCw size={15} className={loadingSessions ? "animate-spin" : ""} />
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed font-medium">
          Manage your active login sessions. If you hit your device limit, you can log out from an old device here.
        </p>

        {mySessions.length === 0 && !loadingSessions ? (
           <p className="text-sm text-slate-500 font-medium py-2">No active sessions found.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {mySessions.map((session, idx) => {
              const deviceStr = (session.device || "").toLowerCase();
              let DeviceIcon = Monitor;
              if (deviceStr.includes("mobile") || deviceStr.includes("phone") || deviceStr.includes("android") || deviceStr.includes("iphone")) {
                DeviceIcon = Smartphone;
              } else if (deviceStr.includes("mac") || deviceStr.includes("windows") || deviceStr.includes("linux") || deviceStr.includes("desktop")) {
                DeviceIcon = Laptop;
              }

              // Parse User Agent to a human-readable string
              const parseDeviceName = (ua) => {
                if (!ua) return "Unknown Device";
                let os = "";
                if (ua.includes("Windows")) os = "Windows";
                else if (ua.includes("Mac OS") || ua.includes("Macintosh")) os = "macOS";
                else if (ua.includes("Android")) os = "Android";
                else if (ua.includes("iPhone")) os = "iPhone";
                else if (ua.includes("iPad")) os = "iPad";
                else if (ua.includes("Linux")) os = "Linux";

                let browser = "";
                if (ua.includes("Edg")) browser = "Edge";
                else if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
                else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
                else if (ua.includes("Firefox")) browser = "Firefox";

                if (browser && os) return `${browser} on ${os}`;
                if (os) return os;
                if (browser) return browser;
                return "Unknown Device";
              };

              return (
                <div key={session.id} className="py-4 flex justify-between items-center group transition-colors first:pt-1 last:pb-1">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                      idx === 0
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                        : "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800/30"
                    }`}>
                      <DeviceIcon size={18} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{session.ip_address || 'Unknown IP'}</span>
                        {session.device && (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-100/40 dark:border-indigo-900/20">
                            {parseDeviceName(session.device)}
                          </span>
                        )}
                        {idx === 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Current Device
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-slate-400" /> Logged in: {new Date(session.logged_in_at).toLocaleString()}
                        </span>
                        {session.last_active_at && (
                          <>
                            <span className="text-slate-300 dark:text-slate-700 font-normal">•</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              Active: {new Date(session.last_active_at).toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    {idx === 0 ? (
                      <span className="px-3 py-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800/50 cursor-default select-none">
                        Active
                      </span>
                    ) : (
                      <button 
                        onClick={() => revokeSession(session.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 rounded-lg text-xs font-bold transition-all border border-transparent dark:border-red-900/20 shadow-sm active:scale-95"
                        title="Logout this device"
                      >
                        <Ban size={12} />
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="
bg-white
dark:bg-slate-900

shadow-md
dark:shadow-none

p-5

rounded-lg

space-y-6

border
border-slate-100
dark:border-slate-700
">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white">
          <ShieldCheck size={18} /> Sidebar Access Control
        </div>
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <User2 size={16} /> Select User
            </label>
            <SearchableSelect
              options={[
                { label: "Choose a user…", value: "" },
                ...filteredUsers.map((u) => ({
                  label: `${u.name} (${u.email})`,
                  value: u.user_id,
                })),
              ]}
              value={selectedUserId}
              onChange={handleSelectUser}
              placeholder="Select a User"
            />
            {loading && <p className="text-xs text-slate-500 dark:text-slate-400">Loading users…</p>}
          </div>

          <div className="space-y-4">
            <div className="
border
border-slate-200
dark:border-slate-700

rounded-lg

bg-gray-50
dark:bg-slate-800

p-3
">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <MapPin size={16} /> Allowed Cities
              </div>
              {availableCities.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  No cities available. Add a city first or check your access.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-3">
                  {availableCities.map((city) => (
                    <label
                      key={city.city_id}
                      className="
inline-flex
items-center
gap-2

rounded

border
border-slate-200
dark:border-slate-700

px-3
py-2

bg-white
dark:bg-slate-900

text-sm

text-slate-800
dark:text-slate-200

shadow-sm
dark:shadow-none
"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCityIds.includes(city.city_id)}
                        onChange={() => toggleCitySelection(city.city_id)}
                        disabled={!selectedUserId || !canEditSelected}
                      />
                      {city.city_name}
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
                  <MapPin size={16} className="text-indigo-500" />
                  Zones & Kothis in selected cities
                </div>
                
                {!selectedCityIds.length ? (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-center border border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Select at least one city above to view and assign its zones and kothis.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedCityIds.map((cityId) => {
                      const cityObj = unifiedTree[cityId];
                      if (!cityObj) return null;
                      
                      const zonesArray = Object.values(cityObj.zones || {});

                      return (
                        <div
                          key={cityId}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
                        >
                          <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                            <div className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                              <MapPin size={14} />
                              {cityObj.city}
                            </div>
                          </div>
                          
                          <div className="p-4 space-y-5">
                            {zonesArray.map((zone) => (
                              <div key={zone.zoneId} className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/50 p-4 transition-all">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    id={`zone-${zone.zoneId}`}
                                    checked={selectedZoneIds.includes(zone.zoneId)}
                                    onChange={() => toggleZoneSelection(zone.zoneId)}
                                    disabled={!selectedUserId || !canEditSelected}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <label
                                    htmlFor={`zone-${zone.zoneId}`}
                                    className="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none"
                                  >
                                    Zone: {zone.zone}
                                  </label>
                                </div>
                                
                                {selectedZoneIds.includes(Number(zone.zoneId)) && (
                                  <div className="mt-4 ml-7 space-y-4">
                                    {(() => {
                                      const wardsInZone = zone.wards || [];
                                      const groupedWards = {};
                                      wardsInZone.forEach(w => {
                                        const sId = w.sectorId || 'none';
                                        if (!groupedWards[sId]) groupedWards[sId] = [];
                                        groupedWards[sId].push(w);
                                      });

                                      const sortedSectorIds = Object.keys(groupedWards).sort((a, b) => {
                                        if (a === 'none') return 1;
                                        if (b === 'none') return -1;
                                        return 0;
                                      });

                                      return (
                                        <>
                                          {wardsInZone.length > 0 && (
                                            <div className="flex justify-end mb-2">
                                              <button
                                                type="button"
                                                onClick={() => selectAllKothisForZone(zone.zoneId, wardsInZone)}
                                                className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors font-semibold"
                                              >
                                                {wardsInZone.every(w => selectedKothiIds.includes(Number(w.wardId)))
                                                  ? 'Deselect All Kothis'
                                                  : 'Select All Kothis'}
                                              </button>
                                            </div>
                                          )}
                                          
                                          {sortedSectorIds.map((sId) => {
                                            const wards = groupedWards[sId];
                                            const sectorObj = availableSectors
                                              .flatMap(c => c.zones || [])
                                              .flatMap(z => z.sectors || [])
                                              .find(se => String(se.sectorId) === String(sId));
                                            
                                            const sectorLabel = sectorObj ? `Ward: ${sectorObj.sectorName}` : 'No Sector (Ward)';
                                            
                                            return (
                                              <div key={sId} className="space-y-3 bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                                  {sectorLabel}
                                                </div>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                  {wards.map((ward) => (
                                                    <label
                                                      key={ward.wardId}
                                                      className={`inline-flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs font-medium shadow-sm transition-all cursor-pointer select-none ${
                                                        selectedKothiIds.includes(Number(ward.wardId)) 
                                                          ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20' 
                                                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50'
                                                      }`}
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        className="w-3.5 h-3.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        checked={selectedKothiIds.includes(Number(ward.wardId))}
                                                        onChange={() => toggleKothiSelection(ward.wardId)}
                                                        disabled={!selectedUserId || !canEditSelected}
                                                      />
                                                      {ward.wardName}
                                                    </label>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </>
                                      );
                                    })()}
                                    {zone.wards.length === 0 && (
                                      <div className="p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                        <span className="text-xs text-slate-400 italic flex items-center justify-center">
                                          No kothis defined in this zone
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="
overflow-x-auto

rounded-xl

border
border-slate-200
dark:border-slate-700
">
              <table className="
min-w-full

divide-y
divide-slate-200
dark:divide-slate-700

bg-white
dark:bg-slate-900
">
                <thead className="
bg-slate-50
dark:bg-slate-800

border-b
border-slate-200
dark:border-slate-700
">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                      Module
                    </th>
                    {LEVELS.map((level) => (
                      <th
                        key={level.key}
                        className="px-4 py-2 text-center text-sm font-semibold text-slate-600 dark:text-slate-300"
                      >
                        {level.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                  {MODULES.map((module) => {
                    const currentLevel = moduleLevels[module.key] || "none";
                    return (
                      <tr key={module.key} className="
transition-colors

hover:bg-slate-50
dark:hover:bg-slate-800/70
">
                        <td className="px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                          {module.label}
                        </td>
                        {LEVELS.map((level) => (
                          <td key={level.key} className="px-4 py-2 text-center">
                            <input
                              type="radio"
                              name={`${module.key}-level`}
                              value={level.key}
                              checked={currentLevel === level.key}
                              onChange={() => setLevel(module.key, level.key)}
                              disabled={!selectedUserId || !canEditSelected}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>


            {/* Custom Login Policy */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 p-4 mt-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
                <Monitor size={16} /> Custom Login Policy
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Override the global login policy for this specific user. If set to "Use Global Rule", the default role-based limits apply.
              </p>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <select
                  value={customPolicy}
                  onChange={(e) => setCustomPolicy(e.target.value)}
                  disabled={!selectedUserId || !canEditSelected}
                  className="border border-slate-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 min-w-[200px]"
                >
                  <option value="global">Use Global Rule</option>
                  <option value="strict_single">Strict Single (1 Device)</option>
                  <option value="multiple">Multiple Devices</option>
                </select>

                {customPolicy === "multiple" && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Limit:</span>
                    <input
                      type="number"
                      min="2"
                      max="100"
                      value={customMaxDevices}
                      onChange={(e) => setCustomMaxDevices(parseInt(e.target.value) || 2)}
                      disabled={!selectedUserId || !canEditSelected}
                      className="border border-slate-300 dark:border-slate-700 rounded px-3 py-2 w-20 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSave}
                disabled={!selectedUserId || saving || !canEditSelected}
                className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Permissions & Policies"}
              </button>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}
      </div>

      <div className="
bg-white
dark:bg-slate-900

shadow-md
dark:shadow-none

p-5

rounded-lg

space-y-4

border
border-slate-100
dark:border-slate-700
">
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white">
          <ShieldCheck size={18} /> Assigned Permissions
        </div>
        {assignedUsers.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No users have permissions assigned yet.
          </p>
        ) : (
          <div className="
overflow-x-auto

rounded-xl

border
border-slate-200
dark:border-slate-700
">
            <table className="
min-w-full

divide-y
divide-slate-200
dark:divide-slate-700

bg-white
dark:bg-slate-900
">
              <thead className="
bg-slate-50
dark:bg-slate-800

border-b
border-slate-200
dark:border-slate-700
">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    User
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Permissions
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Cities
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Zones
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Kothis
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                {paginatedUsers.map((user) => {
                  const canModifyRow =
                    isAdmin ||
                    String(user.created_by) === String(currentUser?.user_id);
                  const kothiSummary = buildKothiSummary(user) || { count: 0, names: [] };
                  const isExpanded = expandedKothiRows.has(user.user_id);
                  return (
                  <tr key={user.user_id} className="
transition-colors

hover:bg-slate-50
dark:hover:bg-slate-800/70
">
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {buildModuleSummary(user) || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {buildCitySummary(user)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {buildZoneSummary(user)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {kothiSummary.count === 0 ? (
                        "—"
                      ) : (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedKothiRows((prev) => {
                                const next = new Set(prev);
                                if (next.has(user.user_id)) {
                                  next.delete(user.user_id);
                                } else {
                                  next.add(user.user_id);
                                }
                                return next;
                              });
                            }}
                            className="
text-xs

text-blue-700
dark:text-blue-400

hover:underline

flex
items-center
gap-1

font-medium
"
                          >
                            <span className="font-semibold">{kothiSummary.count}</span>
                            kothis
                            <span>{isExpanded ? "▾" : "▸"}</span>
                          </button>
                          {isExpanded && (
                            <div className="
text-[11px]

text-slate-700
dark:text-slate-300

leading-snug

max-h-32
overflow-y-auto

border
border-slate-200
dark:border-slate-700

rounded-lg

p-2

bg-slate-50
dark:bg-slate-800
">
                              {(kothiSummary.names || []).join(", ")}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center space-x-2">
                      <button
                        onClick={() => handleEditUser(user.user_id)}
                        className="
px-3
py-1

rounded

bg-blue-50
dark:bg-blue-500/20

text-blue-700
dark:text-blue-400

hover:bg-blue-100 dark:hover:bg-blue-500/30
dark:hover:bg-blue-500/30

border
border-blue-200
dark:border-blue-500/30

disabled:opacity-50
"
                        disabled={!canModifyRow}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePermissions(user.user_id)}
                        className="
px-3
py-1

rounded

bg-red-50
dark:bg-red-500/20

text-red-700
dark:text-red-400

hover:bg-red-100
dark:hover:bg-red-500/30

border
border-red-200
dark:border-red-500/30

disabled:opacity-50
"
                        disabled={deletingUserId === user.user_id || !canModifyRow}
                      >
                        {deletingUserId === user.user_id
                          ? "Removing..."
                          : "Delete"}
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 sm:px-6 rounded-b-xl">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Showing <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, assignedUsers.length)}</span> of{' '}
                      <span className="font-medium">{assignedUsers.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {[...Array(totalPages)].map((_, i) => {
                        // Show first, last, current, and +/- 1
                        if (
                          i === 0 || 
                          i === totalPages - 1 || 
                          (i >= currentPage - 2 && i <= currentPage)
                        ) {
                          return (
                            <button
                              key={i}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === i + 1 ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-800'}`}
                            >
                              {i + 1}
                            </button>
                          );
                        }
                        if (
                          i === 1 && currentPage > 3 ||
                          i === totalPages - 2 && currentPage < totalPages - 2
                        ) {
                          return <span key={i} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-300 dark:ring-slate-600">...</span>;
                        }
                        return null;
                      })}
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white shadow-md p-5 rounded-lg">
        <label className="block mb-2 flex items-center gap-2">
          <KeyRound size={18} /> Change Password
        </label>
        <input
          type="password"
          className="
border
border-slate-300
dark:border-slate-700

p-2

rounded

w-full

mb-3

bg-white
dark:bg-slate-800

text-slate-700
dark:text-slate-200
"
          placeholder="Enter new password"
        />
        <button className="
bg-blue-500
hover:bg-blue-600

dark:bg-blue-600
dark:hover:bg-blue-700

text-white

px-4
py-2

rounded

transition-colors
">
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default Settings;
