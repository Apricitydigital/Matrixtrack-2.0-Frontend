import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Edit2, ShieldCheck, X, User, Mail, Lock, Phone, MapPin,
  Grid, Wrench, Shield, AlertTriangle, CheckCircle, EyeOff, Eye, Trash2,
  Copy, Monitor, Smartphone, Globe, RefreshCw, FileJson, CalendarRange,
  Search, Activity, LogIn, LogOut, Edit3, TrendingUp, Users, Clock, ArrowLeft,
  ChevronRight, ChevronDown, PlusCircle, Megaphone, Database, Key, Ban, ChevronUp
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { buildApiUrl } from "../config";
import { NAV_ITEMS } from "../components/Sidebar";

const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || "mtadmin@apricitydigital.in";

export default function AdminManagement() {
  const { user: currentUser, logPageView } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  // Custom Confirmation Modal State (for Edit)
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, step: 1, admin: null });
  // Custom Delete Confirmation Modal State
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState({ isOpen: false, step: 1, admin: null });
  // Custom Submit (Create/Update) Confirmation Modal State
  const [submitConfirmConfig, setSubmitConfirmConfig] = useState({ isOpen: false, step: 1, pendingSubmit: null });
  // Custom Force Logout Confirmation Modal State
  const [forceLogoutConfirmConfig, setForceLogoutConfirmConfig] = useState({ isOpen: false, sessionId: null, adminName: null });

  // Tab State
  const [activeTab, setActiveTab] = useState("accounts"); // "accounts" or "logs" or "blocked"

  // Look up assigned cities
  const getAdminCities = (admin) => {
    // SUPER_ADMIN_EMAIL has full access to all cities
    if (admin.email === SUPER_ADMIN_EMAIL) return "All Cities (Full Access)";
    const assignedCityIds = admin.permissions?.assigned_cities || [];
    if (assignedCityIds.length === 0) return "No City Assigned";
    const names = assignedCityIds
      .map(id => cities.find(c => c.city_id === id)?.city_name)
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "No City Assigned";
  };

  const getAdminRoleName = (admin) => {
    // SUPER_ADMIN_EMAIL is always Super Admin
    if (admin.email === SUPER_ADMIN_EMAIL) return "Super Admin";
    const rawRole = admin.role || admin.permissions?.role_type || "admin";
    const roles = {
      admin: "Admin",
      super_admin: "Super Admin",
      operations_manager: "Operations Manager",
      auditor: "Auditor",
      supervisor: "Supervisor",
      custom: "Custom"
    };
    return roles[rawRole.toLowerCase()] || rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
  };

  // Blocked IPs States
  const [blockedIps, setBlockedIps] = useState([]);
  const [ipToBlock, setIpToBlock] = useState(null);
  const [blockReason, setBlockReason] = useState("");
  const [activeIpMenu, setActiveIpMenu] = useState(null); // { index, ip }

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    admin_login_mode: 'multiple', admin_max_devices: 10,
    supervisor_login_mode: 'multiple', supervisor_max_devices: 10
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Secure Audit Logs States
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsDate, setLogsDate] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  const [logsSearch, setLogsSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [viewMode, setViewMode] = useState("grouped"); // "grouped" or "flat"
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedModule, setSelectedModule] = useState("all");
  const [allCardsExpanded, setAllCardsExpanded] = useState(false);

  useEffect(() => {
    if (logPageView) {
      if (activeTab === "accounts") {
        logPageView("Admin Management", "/admin-management?tab=accounts");
      } else if (activeTab === "logs") {
        logPageView("Activity Logs", "/admin-management?tab=logs");
      }
    }
  }, [activeTab, logPageView]);

  const fetchLogs = useCallback(async (date, isBackground = false) => {
    if (!isBackground) setLogsLoading(true);
    try {
      const url = `${buildApiUrl("/admin-management/audit-logs")}?date=${date}${isBackground ? "&bg=true" : ""}`;
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data || []);
      } else {
        console.error("Failed to fetch activity logs");
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      if (!isBackground) setLogsLoading(false);
    }
  }, []);

  const fetchSecuritySettings = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl("/auth/security-settings"), {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.ok) {
         setSecuritySettings(await response.json());
      }
    } catch (err) { 
      console.error("Error fetching security settings:", err); 
    }
  }, []);

  const saveSecuritySettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch(buildApiUrl("/auth/security-settings"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(securitySettings)
      });
      if (response.ok) {
         alert("Login Access Control settings saved successfully");
         if (currentUser?.logAction) currentUser.logAction("Update Security Settings", "Updated session limits and access control", true);
      }
    } catch (err) {
      alert("Failed to save security settings");
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs(logsDate);

      const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      let intervalId;

      if (logsDate === todayStr) {
        intervalId = setInterval(() => {
          fetchLogs(logsDate, true);
        }, 15000);
      }

      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }

    if (activeTab === "sessions") {
      fetchActiveSessions();
      fetchSecuritySettings();
      const intervalId = setInterval(() => {
        fetchActiveSessions(true);
      }, 15000); // refresh every 15s

      return () => clearInterval(intervalId);
    }
  }, [logsDate, activeTab, fetchLogs]);


  // Base/default modules that we always want to include, in case they aren't in NAV_ITEMS or map differently:
  const BASE_MODULES = {
    dashboard: false,
    master: false,
    geofencing: false,
    supervisors: false,
    assign_supervisor_ward: false,
    employees: false,
    attendance_reports: false,
    short_attendance: false,
    supervisor_audit: false,
    settings: false,
    announcements: false,
    system_health: false,
    admin_management: false,
    activity_logs: false,
    field_access_requests: false,
    professional_attendance: false,
    professional_leave_mgmt: false,
    professional_holiday_declare: false,
  };

  // Dynamically generate the custom/default modules list:
  const getDynamicModules = (defaultValue = false) => {
    const modules = { ...BASE_MODULES };
    
    // Set all base keys to defaultValue
    Object.keys(modules).forEach(key => {
      modules[key] = defaultValue;
    });

    // Dynamically add any modules from Sidebar NAV_ITEMS
    if (Array.isArray(NAV_ITEMS)) {
      NAV_ITEMS.forEach(item => {
        if (item.permission && item.permission.module) {
          const modName = item.permission.module.replace(/-/g, "_");
          modules[modName] = defaultValue;
        }
      });
    }

    return modules;
  };

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    emp_code: "",
    custom_login_policy: "global",
    custom_max_devices: 10,
    role_type: "custom", // Dropdown for RBAC role
    permissions: {
      is_active: true,
      assigned_cities: [],
      modules: getDynamicModules(false),
      actions: {
        can_create_supervisor: false,
        can_edit_supervisor: false,
        can_delete_supervisor: false,
        can_create_employee: false,
        can_edit_employee: false,
        can_delete_employee: false,
        can_create_admin: false,
        can_edit_admin: false,
        can_block_ip: false,
      }
    }
  });

  const ROLE_TEMPLATES = {
    super_admin: {
      modules: getDynamicModules("write"),
      actions: { can_create_supervisor: true, can_edit_supervisor: true, can_delete_supervisor: true, can_create_employee: true, can_edit_employee: true, can_delete_employee: true, can_create_admin: true, can_edit_admin: true, can_block_ip: true }
    },
    operations_manager: {
      modules: {
        ...getDynamicModules(false),
        dashboard: "view",
        master: "view",
        geofencing: "write",
        supervisors: "write",
        assign_supervisor_ward: "write",
        employees: "write",
        attendance_reports: "view",
        short_attendance: "view",
        supervisor_audit: "write",
        announcements: "write",
        field_access_requests: "write",
        professional_attendance: "view",
        professional_leave_mgmt: "write",
        professional_holiday_declare: "write",
      },
      actions: { can_create_supervisor: true, can_edit_supervisor: true, can_delete_supervisor: false, can_create_employee: true, can_edit_employee: true, can_delete_employee: false, can_create_admin: false, can_edit_admin: false, can_block_ip: false }
    },
    auditor: {
      modules: {
        ...getDynamicModules("view"),
        settings: false,
        admin_management: false,
      },
      actions: { can_create_supervisor: false, can_edit_supervisor: false, can_delete_supervisor: false, can_create_employee: false, can_edit_employee: false, can_delete_employee: false, can_create_admin: false, can_edit_admin: false, can_block_ip: false }
    },
    custom: {
      modules: getDynamicModules(false),
      actions: { can_create_supervisor: false, can_edit_supervisor: false, can_delete_supervisor: false, can_create_employee: false, can_edit_employee: false, can_delete_employee: false, can_create_admin: false, can_edit_admin: false, can_block_ip: false }
    }
  };

  const handleRoleSelect = (roleKey) => {
    setFormData((prev) => ({
      ...prev,
      role_type: roleKey,
      permissions: {
        ...ROLE_TEMPLATES[roleKey],
        assigned_cities: prev.permissions.assigned_cities || [],
        is_active: prev.permissions.is_active !== false,
      }
    }));
  };

  const fetchCities = async () => {
    try {
      const response = await fetch(buildApiUrl("/cities"), {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await response.json();
      setCities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await fetch(buildApiUrl("/admin-management"), {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Failed to fetch admins: ${errorData.error || response.statusText || response.status}`);
        setLoading(false);
        return;
      }
      const data = await response.json();
      setAdmins(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching admins:", error);
      alert(`Error fetching admins: ${error.message}`);
      setLoading(false);
    }
  };

  const fetchBlockedIps = async () => {
    try {
      const response = await fetch(buildApiUrl("/admin-management/blocked-ips"), {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await response.json();
      setBlockedIps(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching blocked IPs:", error);
    }
  };

  const handleBlockIp = async () => {
    if (!ipToBlock) return;
    try {
      const response = await fetch(buildApiUrl("/admin-management/block-ip"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ ip: ipToBlock, reason: blockReason })
      });
      
      if (response.ok) {
        fetchBlockedIps();
        setIpToBlock(null);
        setBlockReason("");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to block IP");
      }
    } catch (error) {
      console.error("Error blocking IP:", error);
    }
  };

  const handleUnblockIp = async (ip) => {
    if (!window.confirm(`Are you sure you want to unblock IP ${ip}?`)) return;
    try {
      const response = await fetch(buildApiUrl(`/admin-management/block-ip/${ip}`), {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (response.ok) {
        fetchBlockedIps();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to unblock IP");
      }
    } catch (error) {
      console.error("Error unblocking IP:", error);
    }
  };

  const fetchActiveSessions = async (isBackground = false) => {
    if (!isBackground) setLoadingSessions(true);
    try {
      const response = await fetch(buildApiUrl("/admin-management/active-sessions"), {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setActiveSessions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching active sessions:", error);
    } finally {
      if (!isBackground) setLoadingSessions(false);
    }
  };

  const handleForceLogout = async () => {
    if (!forceLogoutConfirmConfig.sessionId) return;
    try {
      const response = await fetch(buildApiUrl(`/admin-management/force-logout/${forceLogoutConfirmConfig.sessionId}`), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setForceLogoutConfirmConfig({ isOpen: false, sessionId: null, adminName: null });
        fetchActiveSessions();
        alert(data.message || "Session terminated successfully.");
      } else {
        alert(data.error || "Failed to force logout.");
      }
    } catch (error) {
      console.error("Error force logging out:", error);
      alert("Error terminating session.");
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchCities();
    fetchBlockedIps();
    fetchActiveSessions();
  }, []);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveIpMenu(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Translate technical HTTP descriptions to client-friendly ones
  const getFriendlyActionDescription = (actionObj) => {
    if (!actionObj) return "System Activity";
    const desc = actionObj.description || "";
    const url = actionObj.url || "";
    const method = actionObj.method || "";

    if (desc && !desc.includes("request to") && !desc.includes("/api/")) {
      return desc;
    }

    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes("/api/auth/login") || lowerUrl.includes("/api/auth/supervisor-login")) {
      return "User Signed In";
    }
    if (lowerUrl.includes("/api/auth/logout")) {
      return "User Signed Out";
    }
    if (lowerUrl.includes("/api/admin-management")) {
      if (method === "POST") return "Created Admin Account";
      if (method === "PUT") return "Updated Admin Permissions";
      if (method === "DELETE") return "Deleted Admin Account";
      return "Modified Admin Management Settings";
    }
    if (lowerUrl.includes("/api/app/supervisor/wards") || lowerUrl.includes("supervisor/wards")) {
      return "Assigned Ward Areas to Supervisor";
    }
    if (lowerUrl.includes("/api/supervisor") || lowerUrl.includes("/api/supervisors")) {
      if (method === "POST") return "Created Supervisor Profile";
      if (method === "PUT") return "Updated Supervisor Details";
      if (method === "DELETE") return "Deleted Supervisor Profile";
      return "Modified Supervisor Settings";
    }
    if (lowerUrl.includes("/api/employees")) {
      if (method === "POST") return "Created Employee Profile";
      if (method === "PUT") return "Updated Employee Profile";
      if (method === "DELETE") return "Deleted Employee Profile";
      return "Modified Employee Settings";
    }
    if (lowerUrl.includes("/api/geofencing")) {
      return "Configured GeoFencing Boundary";
    }
    if (lowerUrl.includes("/api/announcements")) {
      if (method === "POST") return "Published Announcement";
      if (method === "DELETE") return "Removed Announcement";
      return "Modified Announcements List";
    }
    if (lowerUrl.includes("/api/cities")) {
      return "Updated City Configuration";
    }
    if (lowerUrl.includes("/api/wards")) {
      return "Updated Ward/Kothi Area Setup";
    }

    if (method === "POST") return "Added New Record";
    if (method === "PUT") return "Modified Details";
    if (method === "DELETE") return "Deleted Record";

    return desc || "Performed System Action";
  };

  const getFriendlyLocation = (actionObj) => {
    if (!actionObj) return "System Settings";
    const url = actionObj.url || "";
    const payload = actionObj.payload || {};

    if (url.toLowerCase().includes("log-page-visit") || url.toLowerCase().includes("log-action")) {
      return payload.pageName || payload.actionName || "Navigation";
    }

    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("/api/auth")) return "Security Center / Authentication";
    if (lowerUrl.includes("/api/admin-management")) return "Admin Management Panel";
    if (lowerUrl.includes("/api/app/supervisor") || lowerUrl.includes("/api/supervisor") || lowerUrl.includes("supervisor")) {
      return "Supervisors Control";
    }
    if (lowerUrl.includes("/api/employees")) return "Employee Master List";
    if (lowerUrl.includes("/api/geofencing")) return "GeoFencing Settings";
    if (lowerUrl.includes("/api/announcements")) return "Announcements Board";
    if (lowerUrl.includes("/api/cities")) return "City Setup Directory";
    if (lowerUrl.includes("/api/wards")) return "Ward Boundaries Config";
    return "Core System Settings";
  };

  const getLogModule = (log) => {
    if (!log || !log.action) return "other";
    const url = log.action.url?.toLowerCase() || "";
    const desc = log.action.description?.toLowerCase() || "";

    if (url.includes("/api/auth")) return "security";
    if (url.includes("/api/admin-management")) return "admin";
    if (url.includes("/api/app/supervisor") || url.includes("/api/supervisor") || url.includes("supervisor")) return "supervisors";
    if (url.includes("/api/employees")) return "employees";
    if (url.includes("/api/geofencing")) return "geofencing";
    if (url.includes("announcement")) return "announcements";
    if (url.includes("/feedback")) return "feedback";
    if (
      url.includes("/api/cities") ||
      url.includes("/api/zones") ||
      url.includes("/api/sectors") ||
      url.includes("/api/wards") ||
      url.includes("/api/departments") ||
      url.includes("/api/designations")
    ) {
      return "master-setup";
    }
    if (url.includes("log-page-visit") || desc.includes("visited")) return "navigation";
    return "other";
  };

  const modulesList = [
    { id: "all", label: "All Modules", icon: <Activity size={13} /> },
    { id: "security", label: "Security & Login", icon: <Key size={13} /> },
    { id: "admin", label: "Admin Panel", icon: <ShieldCheck size={13} /> },
    { id: "supervisors", label: "Supervisors Control", icon: <User size={13} /> },
    { id: "employees", label: "Employees Master", icon: <Users size={13} /> },
    { id: "geofencing", label: "GeoFencing Settings", icon: <MapPin size={13} /> },
    { id: "announcements", label: "Announcements", icon: <Megaphone size={13} /> },
    { id: "master-setup", label: "Master Setup", icon: <Database size={13} /> },
    { id: "navigation", label: "Page Visits", icon: <Monitor size={13} /> },
  ];

  const formatSetList = (set, limit = 1) => {
    const arr = Array.from(set || []);
    if (arr.length === 0) return "N/A";
    if (arr.length <= limit) return arr.join(", ");
    return `${arr.slice(0, limit).join(", ")} (+${arr.length - limit} more)`;
  };

  const renderPayloadDetails = (payload) => {
    if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
      return <div className="text-slate-500 text-sm font-semibold italic p-4 bg-slate-50 rounded-2xl text-center border border-slate-100">No parameters updated.</div>;
    }

    const friendlyKeyMap = {
      user_id: "Supervisor / User",
      userId: "Supervisor / User",
      ward_id: "Ward / Kothi",
      wardId: "Ward / Kothi",
      kothi_id: "Kothi",
      kothiId: "Kothi",
      emp_code: "Employee Code",
      empCode: "Employee Code",
      emp_id: "Employee",
      empId: "Employee",
      city_id: "City",
      cityId: "City",
      zone_id: "Zone",
      zoneId: "Zone",
      sector_id: "Ward/Sector",
      sectorId: "Ward/Sector",
      department_id: "Department",
      departmentId: "Department",
      designation_id: "Designation",
      designationId: "Designation",
      supervisor_id: "Supervisor",
      supervisorId: "Supervisor",
      pageName: "Page Visited",
      pageUrl: "Page URL",
      actionName: "Action Performed",
      actionDescription: "Action Description",
      password_hash: "Password",
      password: "Password",
      role: "Role / Access Level",
      name: "Full Name",
      email: "Email Address",
      phone: "Phone Number",
      city_name: "City Name",
      zone_name: "Zone Name",
      ward_name: "Kothi / Ward Name",
      sector_name: "Ward / Sector Name",
      department_name: "Department Name",
      designation_name: "Designation Name",
      supervisor_name: "Supervisor Name",
      supervisorName: "Supervisor Name",
      employee_name: "Employee Name",
      address: "Address",
      latitude: "Latitude",
      longitude: "Longitude",
      radius: "Geofence Radius (m)",
      title: "Announcement Title",
      message: "Message Content",
      question: "Feedback Question",
      is_active: "Active Status",
      is_admin: "Admin Access",
      modules: "Module Permissions",
    };

    const formatKey = (key) => {
      if (friendlyKeyMap[key]) return friendlyKeyMap[key];
      const words = key
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .trim();
      return words.charAt(0).toUpperCase() + words.slice(1);
    };

    const renderValue = (val) => {
      if (val === null || val === undefined) return "N/A";
      if (typeof val === "boolean") {
        return val ? (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-50 text-green-700 border border-green-200">Yes</span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">No</span>
        );
      }
      if (typeof val === "object") {
        if (Array.isArray(val)) {
          if (val.length === 0) return "None Assigned";
          if (typeof val[0] !== "object") return val.join(", ");
        }
        return JSON.stringify(val);
      }
      return String(val);
    };

    const keys = Object.keys(payload);

    return (
      <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <div className="col-span-1">Details Field</div>
          <div className="col-span-2">Value / Status</div>
        </div>
        <div className="divide-y divide-slate-100 bg-white">
          {keys.map((key) => (
            <div key={key} className="grid grid-cols-3 px-4 py-3 items-center text-sm hover:bg-slate-50 transition-colors">
              <div className="col-span-1 font-bold text-slate-600">{formatKey(key)}</div>
              <div className="col-span-2 font-semibold text-slate-800 break-words">{renderValue(payload[key])}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Base filtered logs (strictly actions inside Admin Management page only, or performed by admins)
  const baseFilteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const url = log.action?.url?.toLowerCase() || "";
      const desc = log.action?.description?.toLowerCase() || "";
      const pageName = log.action?.payload?.pageName?.toLowerCase() || "";
      const actorRole = log.actor?.role?.toLowerCase() || "";
      const actorEmail = log.actor?.email?.toLowerCase() || "";

      // Check if it is a page visit to Admin Management or an API action in Admin Management
      const isPageVisitToAdmin = url.includes("log-page-visit") &&
        (pageName.includes("admin management") || pageName.includes("admin accounts") || pageName.includes("activity logs"));

      const isAdminApiAction = url.includes("/api/admin-management");

      // Exclude guest/system actors — these are unresolved identities from login/logout
      if (actorRole === "guest" || actorRole === "system" || actorEmail === "guest@matrixtrack.in") return false;

      // Check if the actor is an admin
      const isAdminActor = 
        ["admin", "super_admin", "operations_manager", "auditor"].includes(actorRole) ||
        actorEmail === SUPER_ADMIN_EMAIL;

      if (!isAdminApiAction && !isPageVisitToAdmin && !isAdminActor) return false;

      const term = logsSearch.toLowerCase();
      const name = (log.actor?.name || "").toLowerCase();
      const email = (log.actor?.email || "").toLowerCase();
      const friendlyDesc = getFriendlyActionDescription(log.action).toLowerCase();
      const ip = (log.client?.ip || "").toLowerCase();

      return (
        name.includes(term) ||
        email.includes(term) ||
        friendlyDesc.includes(term) ||
        ip.includes(term)
      );
    });
  }, [logs, logsSearch]);

  // Filter logs by clicked category state
  const filteredLogs = React.useMemo(() => {
    return baseFilteredLogs.filter((log) => {
      if (filterCategory === "all") return true;

      const method = log.action?.method;
      const url = log.action?.url || "";

      if (filterCategory === "creates") {
        return url.includes("/api/admin-management") && method === "POST";
      }
      if (filterCategory === "updates") {
        return url.includes("/api/admin-management") && method === "PUT";
      }
      if (filterCategory === "deletions") {
        return url.includes("/api/admin-management") && method === "DELETE";
      }
      return true;
    });
  }, [baseFilteredLogs, filterCategory]);

  // Group logs by Unique User (Actor)
  const groupedUsers = React.useMemo(() => {
    const groups = {};
    filteredLogs.forEach((log) => {
      const email = log.actor?.email || "system@matrix.com";
      if (!groups[email]) {
        groups[email] = {
          actor: log.actor || { name: "System", email: "system@matrix.com", role: "system" },
          logs: [],
          lastActive: log.timestamp,
          ipList: new Set(),
          deviceList: new Set(),
          actionsCount: { visits: 0, creates: 0, updates: 0, deletes: 0 }
        };
      }
      groups[email].logs.push(log);
      groups[email].ipList.add(log.client?.ip || "localhost");
      groups[email].deviceList.add(log.client?.device || "Unknown Device");

      if (new Date(log.timestamp) > new Date(groups[email].lastActive)) {
        groups[email].lastActive = log.timestamp;
      }

      const method = log.action?.method;
      const url = log.action?.url || "";
      if (url.includes("/api/admin-management") && !url.includes("log-page-visit") && !url.includes("log-action")) {
        if (method === "POST") groups[email].actionsCount.creates++;
        else if (method === "PUT") groups[email].actionsCount.updates++;
        else if (method === "DELETE") groups[email].actionsCount.deletes++;
      } else {
        groups[email].actionsCount.visits++;
      }
    });

    return Object.values(groups).sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
  }, [filteredLogs]);

  // Construct Hourly Trend data (2-hour bins: 00:00 to 24:00)
  const hourlyChartData = React.useMemo(() => {
    const bins = Array(12).fill(0);
    filteredLogs.forEach((log) => {
      const hour = new Date(log.timestamp).getHours();
      const binIdx = Math.floor(hour / 2);
      if (binIdx >= 0 && binIdx < 12) {
        bins[binIdx]++;
      }
    });
    return bins;
  }, [filteredLogs]);

  // Generate SVG Path coordinates for the moving trend line
  const svgLinePath = React.useMemo(() => {
    const maxVal = Math.max(...hourlyChartData, 1);
    const points = hourlyChartData.map((val, idx) => {
      const x = (idx / 11) * 240 + 20; // range 20px to 260px
      const y = 90 - (val / maxVal) * 70; // range 20px to 90px
      return { x, y };
    });

    const lineD = points.reduce((acc, p, idx) => {
      if (idx === 0) return `M ${p.x} ${p.y}`;
      const prev = points[idx - 1];
      const cp1x = prev.x + (p.x - prev.x) / 2;
      return `${acc} C ${cp1x} ${prev.y}, ${cp1x} ${p.y}, ${p.x} ${p.y}`;
    }, "");

    const fillD = `${lineD} L 260 95 L 20 95 Z`;

    return { lineD, fillD, points };
  }, [hourlyChartData]);

  // Calculate overall metrics
  const stats = React.useMemo(() => {
    let creates = 0;
    let updates = 0;
    let deletes = 0;
    let visits = 0;

    baseFilteredLogs.forEach((log) => {
      const method = log.action?.method;
      const url = log.action?.url || "";

      if (url.includes("/api/admin-management") && !url.includes("log-page-visit") && !url.includes("log-action")) {
        if (method === "POST") creates++;
        else if (method === "PUT") updates++;
        else if (method === "DELETE") deletes++;
      } else {
        visits++;
      }
    });

    return { creates, updates, deletes, visits };
  }, [baseFilteredLogs]);

  // Device Icons
  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return <Monitor size={14} className="text-slate-400" />;
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone")) {
      return <Smartphone size={14} className="text-slate-400" />;
    }
    return <Monitor size={14} className="text-slate-400" />;
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const setToToday = () => {
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    setLogsDate(todayStr);
    setSelectedUserEmail(null);
  };

  const setToYesterday = () => {
    const kolkataTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    kolkataTime.setDate(kolkataTime.getDate() - 1);
    const yesterdayStr = kolkataTime.toLocaleDateString("en-CA");
    setLogsDate(yesterdayStr);
    setSelectedUserEmail(null);
  };

  const handleCardClick = (category) => {
    setFilterCategory(category);
    setSelectedUserEmail(null);
    setTimeout(() => {
      const element = document.getElementById("admin-logs-feed-container");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  // Find currently active drill-down user details
  const activeUserDetail = groupedUsers.find(g => g.actor?.email === selectedUserEmail);

  // Render timeline for drill-down view (split critical vs visits)
  const renderTimeline = (userDetail) => {
    if (!userDetail?.logs?.length) return <div className="text-center py-10 text-slate-400 text-sm">No details loaded.</div>;

    const criticalLogs = userDetail.logs.filter(log => {
      const d = log.action?.description?.toLowerCase() || "";
      const url = log.action?.url || "";
      return !d.includes("visited") && !url.includes("log-page-visit");
    });
    const visitLogs = userDetail.logs.filter(log => {
      const d = log.action?.description?.toLowerCase() || "";
      const url = log.action?.url || "";
      return d.includes("visited") || url.includes("log-page-visit");
    });

    const renderLogItem = (log, index) => {
      const desc = log.action?.description?.toLowerCase() || "";
      const isLogin = desc.includes("log") || desc.includes("sign");
      const isDelete = desc.includes("delete") || desc.includes("remove");
      const isCreate = desc.includes("create") || desc.includes("add");

      let bulletColor = "bg-amber-500 ring-amber-100";
      let badgeStyle = "bg-amber-50 text-amber-700 border-amber-200/50";
      if (isLogin) { bulletColor = "bg-emerald-500 ring-emerald-100"; badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200/50"; }
      else if (isCreate) { bulletColor = "bg-blue-500 ring-blue-100"; badgeStyle = "bg-blue-50 text-blue-700 border-blue-200/50"; }
      else if (isDelete) { bulletColor = "bg-rose-500 ring-rose-100"; badgeStyle = "bg-rose-50 text-rose-700 border-rose-200/50"; }

      const formattedTime = new Date(log.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

      return (
        <div key={index} className="relative group">
          <span className={`absolute -left-12 top-1.5 flex h-4 w-4 rounded-full ring-4 ${bulletColor} z-10 transition-transform group-hover:scale-125 duration-200`}></span>
          <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-2 w-full">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100">{formattedTime}</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyle}`}>{getFriendlyActionDescription(log.action)}</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  <MapPin size={10} className="text-slate-400" />{getFriendlyLocation(log.action)}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-semibold">
                <span className="flex items-center gap-1"><Globe size={12} className="text-slate-400" />IP: <strong className="text-slate-600">{log.client?.ip || "localhost"}</strong></span>
                <span className="flex items-center gap-1.5">{getDeviceIcon(log.client?.device)}<strong className="text-slate-600">{log.client?.device || "Unknown"}</strong></span>
              </div>
            </div>
            <button type="button" onClick={() => setSelectedLog(log)} className="self-start md:self-center inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl border border-slate-200 hover:border-blue-200/60 transition-all duration-200 active:scale-95 shadow-sm">
              <Eye size={12} />Details
            </button>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {criticalLogs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Critical Actions</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border">{criticalLogs.length}</span>
            </div>
            <div className="relative border-l-2 border-rose-100 ml-4 pl-8 space-y-6 py-2">
              {criticalLogs.map((log, i) => renderLogItem(log, i))}
            </div>
          </div>
        )}
        {visitLogs.length > 0 && (
          <details className="group" open={criticalLogs.length === 0}>
            <summary className="flex items-center gap-2 cursor-pointer select-none list-none p-3 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors">
              <span className="flex h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Page Visits</span>
              <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">{visitLogs.length}</span>
              <span className="ml-auto text-[10px] text-slate-400 font-semibold group-open:hidden">Show ▾</span>
              <span className="ml-auto text-[10px] text-slate-400 font-semibold hidden group-open:inline">Hide ▴</span>
            </summary>
            <div className="relative border-l-2 border-slate-100 ml-4 pl-8 space-y-4 py-4 mt-3">
              {visitLogs.map((log, i) => {
                const formattedTime = new Date(log.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
                return (
                  <div key={i} className="relative group">
                    <span className="absolute -left-12 top-1.5 flex h-3 w-3 rounded-full bg-slate-300 ring-2 ring-slate-100 z-10" />
                    <div className="bg-slate-50 border border-slate-200/70 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 hover:bg-white transition-colors">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400">{formattedTime}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                          <Eye size={9} />{getFriendlyActionDescription(log.action)}
                        </span>
                      </div>
                      <button type="button" onClick={() => setSelectedLog(log)} className="text-[10px] font-bold text-slate-400 hover:text-blue-600 px-2 py-1 rounded-lg border border-transparent hover:border-blue-200 hover:bg-blue-50 transition-all">Details</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}
      </div>
    );
  };


  const handleCityChange = (cityId) => {
    setFormData((prev) => {
      const currentCities = prev.permissions.assigned_cities || [];
      const updatedCities = currentCities.includes(cityId)
        ? currentCities.filter(id => id !== cityId)
        : [...currentCities, cityId];

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          assigned_cities: updatedCities
        }
      };
    });
  };

  const handleModuleChange = (module, level) => {
    setFormData((prev) => ({
      ...prev,
      role_type: "custom", // switch to custom if manually edited
      permissions: {
        ...prev.permissions,
        modules: {
          ...prev.permissions.modules,
          [module]: level === "none" ? false : level
        }
      }
    }));
  };

  const handleActionChange = (action) => {
    setFormData((prev) => ({
      ...prev,
      role_type: "custom", // switch to custom if manually edited
      permissions: {
        ...prev.permissions,
        actions: {
          ...prev.permissions.actions,
          [action]: !prev.permissions.actions[action],
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations first (before showing modal)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setInlineError("Please enter a valid email address.");
      return;
    }

    if (formData.phone) {
      const digits = formData.phone.replace(/\D/g, '');
      if (digits.length !== 12) {
        setInlineError("Mobile number must be exactly 10 digits.");
        return;
      }
    }

    if (!editingAdmin) {
      if (formData.password !== confirmPassword) {
        setInlineError("Passwords do not match. Please check and try again.");
        return;
      }
      if (formData.password.length < 6) {
        setInlineError("Password must be at least 6 characters long.");
        return;
      }
    }

    // Validate password change during edit (optional but if provided must match)
    if (editingAdmin && formData.password && formData.password.trim() !== "") {
      if (formData.password !== confirmPassword) {
        setInlineError("New passwords do not match. Please check and try again.");
        return;
      }
      if (formData.password.length < 6) {
        setInlineError("New password must be at least 6 characters long.");
        return;
      }
    }

    setInlineError("");
    // Open custom confirmation modal instead of window.confirm
    setSubmitConfirmConfig({ isOpen: true, step: 1, pendingSubmit: true });
  };

  const [inlineError, setInlineError] = useState("");

  const executeSubmit = async () => {
    setSubmitConfirmConfig({ isOpen: false, step: 1, pendingSubmit: null });
    try {
      const url = editingAdmin
        ? buildApiUrl(`/admin-management/${editingAdmin.user_id}`)
        : buildApiUrl("/admin-management");
      const method = editingAdmin ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowModal(false);
        fetchAdmins();
      } else {
        const err = await res.json();
        setInlineError(err.error || "Failed to save admin.");
        setShowModal(true);
      }
    } catch (error) {
      console.error("Error saving admin:", error);
      setInlineError("Something went wrong. Please try again.");
    }
  };

  const handleSubmitConfirmNext = () => {
    if (submitConfirmConfig.step === 1) {
      setSubmitConfirmConfig(prev => ({ ...prev, step: 2 }));
    } else {
      executeSubmit();
    }
  };

  const openEditModal = (admin) => {
    // Open the custom confirmation modal starting at step 1
    setConfirmConfig({ isOpen: true, step: 1, admin });
  };

  const handleConfirmNext = () => {
    if (confirmConfig.step === 1) {
      setConfirmConfig(prev => ({ ...prev, step: 2 }));
    } else {
      // Step 2 confirmed, proceed to open edit form
      const admin = confirmConfig.admin;
      setEditingAdmin(admin);

      const adminPermissions = admin.permissions || {};
      const isSuperAdmin = admin.email === SUPER_ADMIN_EMAIL || admin.role === "super_admin" || adminPermissions.role_type === "super_admin";

      const mergedModules = {
        ...getDynamicModules(false),
        ...(adminPermissions.modules || {})
      };
      if (isSuperAdmin) {
        Object.keys(mergedModules).forEach(key => {
          mergedModules[key] = "write";
        });
      }

      const mergedActions = {
        ...ROLE_TEMPLATES.custom.actions,
        ...(adminPermissions.actions || {})
      };
      if (isSuperAdmin) {
        Object.keys(mergedActions).forEach(key => {
          mergedActions[key] = true;
        });
      }

      setFormData({
        name: admin.name || "",
        email: admin.email || "",
        password: "",
        phone: admin.phone || "",
        emp_code: admin.emp_code || "",
        custom_login_policy: admin.custom_login_policy || "global",
        custom_max_devices: admin.custom_max_devices || 10,
        role_type: isSuperAdmin ? "super_admin" : (adminPermissions.role_type || "custom"),
        permissions: {
          ...ROLE_TEMPLATES.custom,
          ...adminPermissions,
          role_type: isSuperAdmin ? "super_admin" : (adminPermissions.role_type || "custom"),
          modules: mergedModules,
          actions: mergedActions
        }
      });
      setConfirmConfig({ isOpen: false, step: 1, admin: null });
      setShowChangePassword(false);
      setConfirmPassword("");
      setShowModal(true);
    }
  };

  const cancelConfirm = () => {
    setConfirmConfig({ isOpen: false, step: 1, admin: null });
  };

  const openDeleteConfirm = (admin) => {
    setDeleteConfirmConfig({ isOpen: true, step: 1, admin });
  };

  const cancelDeleteConfirm = () => {
    setDeleteConfirmConfig({ isOpen: false, step: 1, admin: null });
  };

  const handleDeleteConfirmNext = async () => {
    if (deleteConfirmConfig.step === 1) {
      setDeleteConfirmConfig(prev => ({ ...prev, step: 2 }));
    } else {
      // Step 2 confirmed — proceed with actual delete
      const adminId = deleteConfirmConfig.admin?.user_id;
      setDeleteConfirmConfig({ isOpen: false, step: 1, admin: null });
      try {
        const res = await fetch(buildApiUrl(`/admin-management/${adminId}`), {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (res.ok) {
          fetchAdmins();
        } else {
          const errorData = await res.json();
          alert(errorData.error || "Failed to delete admin.");
        }
      } catch (error) {
        console.error("Error deleting admin:", error);
        alert("Failed to delete admin.");
      }
    }
  };

  const openCreateModal = () => {
    setEditingAdmin(null);
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      emp_code: "",
      role_type: "custom",
      permissions: ROLE_TEMPLATES.custom
    });
    setShowModal(true);
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value;

    // Handle backspace when only prefix remains
    if (val === "+91" || val === "+9" || val === "+" || val === "") {
      setFormData({ ...formData, phone: "" });
      return;
    }

    let digits = val.replace(/\D/g, '');

    if (digits.startsWith('91') && digits.length > 2) {
      digits = digits.substring(2);
    }

    digits = digits.slice(0, 10);

    setFormData({ ...formData, phone: digits.length > 0 ? '+91 ' + digits : '' });
  };



  if (showModal) {
    return (
      <>
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <div className="bg-white rounded-2xl w-full flex flex-col shadow-sm border border-slate-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="text-blue-600" />
                {editingAdmin ? "Edit Admin" : "Create New Admin"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-600 hover:text-slate-900 flex items-center gap-2 font-medium bg-white px-4 py-2 border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
              >
                <X size={20} /> Back to List
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6 bg-slate-50">

              {/* Status Section */}
              <div className="bg-white p-5 md:p-6 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Admin Account Status</h3>
                    <p className="text-sm text-slate-500">Toggle to activate or deactivate this admin's access to the system.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={formData.permissions.is_active !== false}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      permissions: { ...prev.permissions, is_active: e.target.checked }
                    }))}
                  />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                  <span className="ml-3 text-sm font-medium text-slate-700 hidden sm:block">
                    {formData.permissions.is_active !== false ? 'Active (Has Rights)' : 'Inactive (No Access)'}
                  </span>
                </label>
              </div>

              {/* Basic Info Section */}
              <div className="bg-white p-5 md:p-6 border border-slate-200 rounded-xl shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 1. Full Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter full name"
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      />
                    </div>
                  </div>
                  {/* 2. Employee Code */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Employee Code</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        value={formData.emp_code}
                        onChange={(e) => setFormData({ ...formData, emp_code: e.target.value })}
                        placeholder="Enter employee code (optional)"
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      />
                    </div>
                  </div>
                  {/* 3. Email */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter email address"
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      />
                    </div>
                  </div>
                  {/* 4. Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone size={18} />
                      </div>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="Enter phone number"
                        className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                      />
                    </div>
                  </div>
                  {/* 5 & 6. Password + Confirm Password — when creating new admin */}
                  {!editingAdmin && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            required={!editingAdmin}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Enter password"
                            className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required={!editingAdmin}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm password"
                            className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Change Password Section — only in edit mode */}
              {editingAdmin && (
                <div className="bg-amber-50/60 p-5 md:p-6 border-2 border-amber-300 rounded-xl shadow-md ring-1 ring-amber-200/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                        <Lock size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Change Password</h3>
                        <p className="text-sm text-slate-500">Set a new password for this admin account.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePassword(!showChangePassword);
                        if (showChangePassword) {
                          setFormData({ ...formData, password: "" });
                          setConfirmPassword("");
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-200 ${
                        showChangePassword
                          ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                          : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                      }`}
                    >
                      {showChangePassword ? "Cancel" : "Change Password"}
                    </button>
                  </div>

                  {showChangePassword && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">New Password <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Enter new password"
                            className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm New Password <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div className="col-span-full">
                        <p className="text-xs text-slate-400 font-medium">Leave blank to keep the current password unchanged. Minimum 6 characters required.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* Role Selection */}
              <div className="bg-white p-5 md:p-6 border border-slate-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">RBAC Role Selection</h3>
                    <p className="text-sm text-slate-500">Choose a role with predefined permissions or create a custom configuration.</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="w-full">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Predefined Role</label>
                    <select
                      value={formData.role_type || "custom"}
                      onChange={(e) => handleRoleSelect(e.target.value)}
                      className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="operations_manager">Operations Manager</option>
                      <option value="auditor">Auditor (Read-Only)</option>
                      <option value="custom">Custom Configuration</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Custom Login Policy */}
              <div className="bg-white p-5 md:p-6 border border-slate-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Monitor size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Custom Login Policy</h3>
                    <p className="text-sm text-slate-500">Override the global login policy for this admin account.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <select
                    value={formData.custom_login_policy}
                    onChange={(e) => setFormData({ ...formData, custom_login_policy: e.target.value })}
                    className="p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
                  >
                    <option value="global">Use Global Rule</option>
                    <option value="strict_single">Strict Single (1 Device)</option>
                    <option value="multiple">Multiple Devices</option>
                  </select>

                  {formData.custom_login_policy === "multiple" && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700">Limit:</span>
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={formData.custom_max_devices}
                        onChange={(e) => setFormData({ ...formData, custom_max_devices: parseInt(e.target.value) || 2 })}
                        className="p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 w-24 bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* City Assignment */}
              <div className="bg-white p-5 md:p-6 border border-slate-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">City Assignment</h3>
                    <p className="text-sm text-slate-500">Select the cities this admin will have access to.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {cities.map(city => {
                    const isChecked = (formData.permissions.assigned_cities || []).includes(city.city_id);
                    return (
                      <label key={city.city_id} className={`flex items-center gap-3 text-sm cursor-pointer p-3 rounded-lg border transition-all ${isChecked ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCityChange(city.city_id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium">{city.city_name}</span>
                      </label>
                    );
                  })}
                  {cities.length === 0 && <p className="text-sm text-slate-500 col-span-full">No cities available to assign.</p>}
                </div>
              </div>

              {/* Module Access */}
              <div className="bg-white p-5 md:p-6 border border-slate-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Grid size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Module Access</h3>
                    <p className="text-sm text-slate-500">Choose the modules and access level this admin can have.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.keys(formData.permissions.modules || {}).map(module => {
                    let label = module.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                    if (module === 'field_access_requests') label = 'Professional Access Requests';
                    if (module === 'professional_leave_mgmt') label = 'Professional Leave Management';
                    if (module === 'professional_holiday_declare') label = 'Declare Professional Holidays';
                    const currentValue = formData.permissions.modules?.[module];
                    const selectValue = currentValue === true ? "write" : (currentValue || "none");
                    const hasAccess = selectValue !== "none";

                    return (
                      <div key={module} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${hasAccess ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasAccess}
                            onChange={(e) => handleModuleChange(module, e.target.checked ? "view" : "none")}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className={`text-sm font-semibold ${hasAccess ? 'text-blue-900' : 'text-slate-600'}`}>
                            {label}
                          </span>
                        </label>
                        <select
                          value={selectValue}
                          onChange={(e) => handleModuleChange(module, e.target.value)}
                          className={`text-sm p-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium min-w-[120px] outline-none ${hasAccess ? 'bg-white border-blue-300 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                        >
                          <option value="none">No Access</option>
                          <option value="view">View Only</option>
                          <option value="write">View & Edit</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Action Rights */}
              <div className="bg-white p-5 md:p-6 border border-slate-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Advanced Action Rights</h3>
                    <p className="text-sm text-slate-500">Define what actions this admin can perform.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.keys(formData.permissions.actions || {}).map(action => {
                    // Remove can_delete_admin from UI — only super admin (admin@gmail.com) can delete
                    if (action === 'can_delete_admin') {
                      return null;
                    }
                    const isAdminAction = action === 'can_create_admin' || action === 'can_edit_admin';
                    const adminModuleAccess = formData.permissions.modules?.admin_management;
                    const hasAdminModuleAccess = adminModuleAccess === 'view' || adminModuleAccess === 'write' || adminModuleAccess === true;

                    if (isAdminAction && !hasAdminModuleAccess) {
                      return null;
                    }

                    const label = action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                    const isChecked = formData.permissions.actions?.[action] || false;

                    return (
                      <label key={action} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'}`}>
                        <span className="text-sm font-medium">{label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleActionChange(action)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 flex flex-col gap-3">
                {/* Inline Error Banner */}
                {inlineError && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                    <AlertTriangle size={16} className="flex-shrink-0" />
                    {inlineError}
                    <button onClick={() => setInlineError('')} className="ml-auto text-red-400 hover:text-red-600"><X size={14} /></button>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, permissions: ROLE_TEMPLATES.custom }))}
                    className="px-4 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
                  >
                    <X size={18} /> Reset
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
                    >
                      {editingAdmin ? <><ShieldCheck size={18} /> Update Admin</> : <><Plus size={18} /> Create Admin</>}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Submit Confirmation Modal — inside showModal block so it works for both create & edit */}
        {submitConfirmConfig.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className={`relative p-6 flex items-center gap-4 ${submitConfirmConfig.step === 2
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                }`}>
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  {submitConfirmConfig.step === 2
                    ? <AlertTriangle size={24} className="text-white" />
                    : <ShieldCheck size={24} className="text-white" />}
                </div>
                <div>
                  <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Step {submitConfirmConfig.step} of 2</p>
                  <h3 className="text-white text-xl font-bold">
                    {submitConfirmConfig.step === 1
                      ? editingAdmin ? 'Update Admin?' : 'Create Admin?'
                      : 'Final Confirmation'}
                  </h3>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div className="h-full bg-white/60 transition-all duration-500"
                    style={{ width: submitConfirmConfig.step === 1 ? '50%' : '100%' }} />
                </div>
              </div>
              <div className="p-6 space-y-4">
                {submitConfirmConfig.step === 1 ? (
                  <>
                    <p className="text-slate-600 text-sm">You are about to <strong className="text-slate-900">{editingAdmin ? 'update' : 'create'}</strong> the following admin account:</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{formData.name || 'Admin'}</p>
                        <p className="text-slate-500 text-xs">{formData.email}</p>
                      </div>
                    </div>
                    <p className="text-slate-500 text-sm">Please review and confirm to proceed.</p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-600 text-sm">This action will <strong className="text-slate-900">{editingAdmin ? 'immediately update' : 'grant system access to'}</strong> this admin.</p>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-800 text-sm font-medium">
                        {editingAdmin
                          ? 'Updated permissions will take effect on next login.'
                          : 'The new admin will be able to log in immediately.'}
                      </p>
                    </div>
                    <p className="text-slate-500 text-sm">Are you absolutely sure you want to continue?</p>
                  </>
                )}
              </div>
              <div className="px-6 pb-6 flex items-center justify-between">
                <button
                  onClick={() => setSubmitConfirmConfig({ isOpen: false, step: 1, pendingSubmit: null })}
                  className="px-4 py-2 rounded-lg text-slate-500 font-medium hover:bg-slate-100 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitConfirmNext}
                  className={`px-6 py-2.5 rounded-xl text-white font-semibold shadow-md transition-all text-sm flex items-center gap-2 ${submitConfirmConfig.step === 2
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                    }`}
                >
                  {submitConfirmConfig.step === 1
                    ? <><CheckCircle size={16} /> Yes, Continue</>
                    : <><ShieldCheck size={16} /> {editingAdmin ? 'Update Admin' : 'Create Admin'}</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
  const totalActionsForWidget = baseFilteredLogs.length || 1;
  const visitPct = Math.round((stats.visits / totalActionsForWidget) * 100) || 0;
  const createPct = Math.round((stats.creates / totalActionsForWidget) * 100) || 0;
  const updatePct = Math.round((stats.updates / totalActionsForWidget) * 100) || 0;
  const deletePct = Math.round((stats.deletes / totalActionsForWidget) * 100) || 0;

  return (
    <div className="pt-0 px-4 pb-4 md:pt-0 md:px-6 md:pb-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="relative bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 dark:from-slate-900 dark:via-indigo-950/20 dark:to-purple-900/15 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 overflow-hidden group">
        {/* Ambient Mesh Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(at_0%_0%,rgba(59,130,246,0.15)_0px,transparent_50%),radial-gradient(at_100%_0%,rgba(139,92,246,0.12)_0px,transparent_50%),radial-gradient(at_50%_100%,rgba(99,102,241,0.15)_0px,transparent_50%)] pointer-events-none" />

        {/* Dot Grid Pattern Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
          <svg className="w-full h-full text-indigo-600/[0.08]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dotGridAdmin" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotGridAdmin)" />
          </svg>
        </div>

        {/* Abstract Overlapping Waves Texture */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-75 dark:opacity-20">
          <svg className="absolute right-0 top-0 h-full w-[450px] text-white/50 dark:text-slate-800/25" viewBox="0 0 450 120" fill="currentColor" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M 150 120 C 250 100, 300 20, 450 40 L 450 120 Z" opacity="0.35" />
            <path d="M 50 120 C 180 80, 280 40, 450 80 L 450 120 Z" opacity="0.55" />
            <path d="M 0 120 C 120 90, 260 10, 450 20 L 450 120 Z" opacity="0.2" />
            {/* Soft highlight lines */}
            <path d="M 150 120 C 250 100, 300 20, 450 40" fill="none" stroke="white" strokeWidth="1.5" opacity="0.4" />
            <path d="M 50 120 C 180 80, 280 40, 450 80" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
          </svg>
        </div>
        
        <div className="flex items-center gap-5 z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/80 dark:from-indigo-950/60 dark:to-indigo-900/40 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center justify-center text-indigo-650 dark:text-indigo-400 shadow-md shadow-indigo-100/50 dark:shadow-none shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight leading-none">
              Admin Management
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-450 font-medium mt-2">
              Manage operators and track secure activity logs
            </p>
          </div>
        </div>

        {activeTab === "accounts" && (
          <button
            onClick={openCreateModal}
            className="z-10 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all text-sm font-bold active:scale-95 shrink-0 self-start md:self-center"
          >
            <Plus size={16} /> 
            <span>Add New Admin</span>
          </button>
        )}
      </div>

      {/* KPI Cards (Always visible) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm min-h-[84px]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <User size={18} />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Total Admins</span>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none block mb-1">{admins.length}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-medium">Active accounts</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm min-h-[84px]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Activity size={18} />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Activity Logs</span>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none block mb-1">{baseFilteredLogs.length}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-medium">This month</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm min-h-[84px]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 dark:text-orange-400 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Blocked IPs</span>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none block mb-1">{blockedIps.length}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-medium">Total blocked</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm min-h-[84px]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Monitor size={18} />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">Active Sessions</span>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none block mb-1">{activeSessions.length}</span>
              <span className="block text-[9px] text-slate-400 dark:text-slate-500 font-medium">Online now</span>
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="flex w-full mb-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-1.5 overflow-x-auto gap-1.5">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-[13px] font-bold relative transition-colors ${activeTab === "accounts" ? "text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700"}`}
        >
          <User size={16} className={activeTab === "accounts" ? "text-indigo-600" : "text-slate-400"} />
          Admin Accounts
          {activeTab === "accounts" && <div className="absolute bottom-0 left-6 right-6 h-[3px] bg-indigo-500 rounded-t-md shadow-[0_-2px_10px_rgba(99,102,241,0.5)]"></div>}
        </button>
        
        <button
          onClick={() => {
            setActiveTab("logs");
            setViewMode("grouped");
            setSelectedUserEmail(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-[13px] font-bold relative transition-colors ${activeTab === "logs" ? "text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Activity size={16} className={activeTab === "logs" ? "text-emerald-600" : "text-slate-400"} />
          Activity Logs
          {baseFilteredLogs.length > 0 && <span className="ml-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold">{baseFilteredLogs.length}</span>}
          {activeTab === "logs" && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-600 rounded-t-md shadow-[0_-2px_10px_rgba(16,185,129,0.5)]"></div>}
        </button>
        
        {(currentUser?.email === SUPER_ADMIN_EMAIL || currentUser?.permissions?.actions?.can_block_ip === true) && (
        <button
          onClick={() => setActiveTab("blocked")}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-[13px] font-bold relative transition-colors ${activeTab === "blocked" ? "text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Ban size={16} className={activeTab === "blocked" ? "text-emerald-600" : "text-slate-400"} />
          Blocked IPs
          {activeTab === "blocked" && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-600 rounded-t-md shadow-[0_-2px_10px_rgba(16,185,129,0.5)]"></div>}
        </button>
        )}
        
        <button
          onClick={() => setActiveTab("sessions")}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-[13px] font-bold relative transition-colors ${activeTab === "sessions" ? "text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Monitor size={16} className={activeTab === "sessions" ? "text-emerald-600" : "text-slate-400"} />
          Active Sessions
          {activeTab === "sessions" && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-600 rounded-t-md shadow-[0_-2px_10px_rgba(16,185,129,0.5)]"></div>}
        </button>
      </div>

      {activeTab === "accounts" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="p-5 pl-6">Name</th>
                <th className="p-5">Email</th>
                <th className="p-5">Emp Code</th>
                <th className="p-5">City</th>
                <th className="p-5">Role</th>
                <th className="p-5">Status</th>
                <th className="p-5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-indigo-600 animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : admins.map((admin, i) => {
                const isSuper = getAdminRoleName(admin) === 'Super Admin';
                const colorVariants = [
                  "from-indigo-600 to-purple-600",
                  "from-blue-500 to-cyan-500",
                  "from-orange-500 to-red-500"
                ];
                const bgColors = colorVariants[i % colorVariants.length];
                
                return (
                <tr key={admin.user_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 pl-6 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${bgColors} shrink-0 shadow-sm`}>
                      {admin.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{admin.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Administrator</p>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 text-[13px]">{admin.email}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 text-[13px]">{admin.emp_code || "-"}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 text-[13px] max-w-[150px] truncate">{getAdminCities(admin) || "All Cities (Full Access)"}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-md text-[11px] font-bold ${isSuper ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                      {isSuper ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td className="p-4">
                    {admin.permissions?.is_active !== false ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-green-50 text-green-600 text-xs font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Active
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-50 text-red-600 text-xs font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Inactive
                      </div>
                    )}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(admin)}
                        className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all bg-white"
                      >
                        <Edit2 size={14} />
                      </button>
                      {currentUser?.email === SUPER_ADMIN_EMAIL && admin.email !== currentUser?.email && (
                        <button
                          onClick={() => openDeleteConfirm(admin)}
                          className="p-1.5 rounded-md border border-slate-200 text-red-500 hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-all bg-white"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
              {!loading && admins.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-16 text-center text-slate-500 text-sm">No administrators found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "logs" && (
        /* =================== TAB: AUDIT LOGS DISPLAY =================== */
        <div className="space-y-6">

                {/* Side-by-Side Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  {/* Hourly activity Wave */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden relative group">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div>
                        <h2 className="text-slate-800 dark:text-slate-100 text-[15px] font-bold tracking-tight mb-0.5">Hourly Activity Wave</h2>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
                          Audit Pattern
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-sm cursor-pointer hover:bg-slate-50">
                        24-Hour Range <ChevronDown size={14} className="text-slate-400" />
                      </div>
                    </div>

                    <div className="h-44 w-full flex items-end justify-center my-2 relative z-10 pl-6">
                      {filteredLogs.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs font-semibold gap-2">
                          <Clock size={16} className="animate-spin text-slate-300" />
                          <span>No active logs</span>
                        </div>
                      ) : (
                        <svg viewBox="0 0 280 120" className="w-full h-full overflow-visible">
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                           {/* Simplified Grid */}
                           <line x1="0" y1="20" x2="280" y2="20" className="stroke-slate-100 dark:stroke-slate-800" strokeDasharray="3" />
                           <line x1="0" y1="60" x2="280" y2="60" className="stroke-slate-100 dark:stroke-slate-800" strokeDasharray="3" />
                           <line x1="0" y1="100" x2="280" y2="100" className="stroke-slate-100 dark:stroke-slate-800" strokeDasharray="3" />
                           <text x="-15" y="24" className="text-[9px] fill-slate-400 font-bold">60</text>
                           <text x="-15" y="64" className="text-[9px] fill-slate-400 font-bold">30</text>
                           <text x="-10" y="104" className="text-[9px] fill-slate-400 font-bold">0</text>
                          
                          <path d={svgLinePath.fillD} fill="url(#areaGrad)" transform="translate(0, 10) scale(1, 0.9)" />
                          <path d={svgLinePath.lineD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(0, 10) scale(1, 0.9)" />

                          {svgLinePath.points.map((p, i) => {
                             const maxVal = Math.max(...hourlyChartData);
                             const isMax = hourlyChartData[i] === maxVal && maxVal > 0;
                             const py = (p.y * 0.9) + 10;
                             return hourlyChartData[i] > 0 && (
                               <g key={i} className="cursor-pointer group/node">
                                 {isMax && <line x1={p.x} y1={py} x2={p.x} y2="100" className="stroke-emerald-300 dark:stroke-emerald-900/50" strokeDasharray="3" strokeWidth="1.5" />}
                                 <circle cx={p.x} cy={py} r={isMax ? "4.5" : "1.5"} fill={isMax ? "#10b981" : "#ffffff"} stroke={isMax ? "#ffffff" : "#10b981"} strokeWidth={isMax ? "2" : "1.5"} className={isMax ? "drop-shadow-sm" : ""} />
                               </g>
                             )
                           })}
                        </svg>
                      )}
                    </div>

                    <div className="flex justify-between text-[10px] font-extrabold text-slate-400 pt-3 z-10 pl-6 pr-1">
                      <span>12 AM</span><span>4 AM</span><span>8 AM</span><span>12 PM</span><span>4 PM</span><span>8 PM</span><span>12 AM</span>
                    </div>
                  </div>

                  {/* Criticality proportions */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col group">
                    <div className="mb-6">
                      <h2 className="text-slate-800 dark:text-slate-100 text-[15px] font-bold tracking-tight mb-0.5">Criticality Distribution</h2>
                      <p className="text-xs text-slate-500 font-semibold">Proportion of high-severity write events vs low-severity access events today.</p>
                    </div>

                    <div className="flex-1 flex items-center justify-between gap-4 mt-2">
                      <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="14" />
                          <circle cx="50" cy="50" r="40" fill="none" stroke="url(#donutGrad)" strokeWidth="14" strokeDasharray={`${(createPct + updatePct + deletePct || 100) * 2.51} 251`} className="transition-all duration-1000" strokeLinecap="round" />
                          <defs>
                            <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#34d399" />
                              <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                          <ShieldCheck size={22} className="text-slate-300 mb-1" />
                          <span className="text-2xl font-black text-slate-800 leading-none">100%</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total Events</span>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col gap-3 pl-4">
                        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm border border-transparent hover:border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                              <Eye size={14} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-bold text-slate-600">Views</span>
                          </div>
                          <span className="text-[15px] font-black text-slate-800">{visitPct}%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm border border-transparent hover:border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                              <PlusCircle size={14} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-bold text-slate-600">Created</span>
                          </div>
                          <span className="text-[15px] font-black text-slate-800">{createPct}%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm border border-transparent hover:border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                              <Edit2 size={14} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-bold text-slate-600">Updated</span>
                          </div>
                          <span className="text-[15px] font-black text-slate-800">{updatePct}%</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm border border-transparent hover:border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                              <Trash2 size={14} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-bold text-slate-600">Deleted</span>
                          </div>
                          <span className="text-[15px] font-black text-slate-800">{deletePct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date Controls & Filters Bar */}
                {/* Date Controls & Filters Bar */}
                <div id="admin-logs-feed-container" className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mt-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5">
                      <CalendarRange size={16} className="text-slate-500" />
                      <span className="text-xs font-extrabold text-slate-500 tracking-wide">Select Date:</span>
                      <input
                        type="date"
                        value={logsDate}
                        onChange={(e) => { setLogsDate(e.target.value); setSelectedUserEmail(null); }}
                        className="bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:text-emerald-600"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={setToToday}
                        className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-colors shadow-sm ${logsDate === new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-white text-slate-500 hover:text-slate-700 border border-slate-200"
                          }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={setToYesterday}
                        className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-colors shadow-sm ${logsDate !== new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-white text-slate-500 hover:text-slate-700 border border-slate-200"
                          }`}
                      >
                        Yesterday
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => fetchLogs(logsDate)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800/50 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm ml-2"
                    >
                      <RefreshCw size={14} className={logsLoading ? "animate-spin text-emerald-500" : "text-slate-500"} />
                      Refresh
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    {/* View Toggler */}
                    {!selectedUserEmail && (
                      <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 p-0.5 animate-in fade-in duration-200">
                        <button
                          type="button"
                          onClick={() => setViewMode("grouped")}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded transition-all duration-200 ${
                            viewMode === "grouped"
                              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700"
                              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          <Users size={12} />
                          User-Wise Logs
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("flat")}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded transition-all duration-200 ${
                            viewMode === "flat"
                              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700"
                              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          <Activity size={12} />
                          All Events
                        </button>
                      </div>
                    )}
                    <div className="relative flex items-center">
                      <Search size={16} className="absolute left-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search logs..."
                        value={logsSearch}
                        onChange={(e) => setLogsSearch(e.target.value)}
                        className="w-full sm:w-64 pl-10 pr-8 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 bg-white dark:bg-slate-800/50 text-sm font-bold transition-all shadow-sm"
                      />
                      {logsSearch && (
                        <button
                          onClick={() => setLogsSearch("")}
                          className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subview display */ }
            {
              selectedUserEmail ? (
                /* =================== TIMELINE DRILL-DOWN VIEW =================== */
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedUserEmail(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 transition-colors shadow-sm active:scale-95"
                    >
                      <ArrowLeft size={14} />
                      Back to Members
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: User Summary Card */}
                    <div className="lg:col-span-4 space-y-4">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200/70 dark:from-slate-800 dark:to-slate-850 flex items-center justify-center text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
                                <User size={18} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[140px]">
                                  {activeUserDetail?.actor?.name || "System"}
                                </h4>
                                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mt-0.5">
                                  {activeUserDetail?.actor?.role || "system"}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-150 dark:border-blue-900 px-2.5 py-1 rounded-xl shadow-inner">
                              {activeUserDetail?.logs?.length || 0} Actions
                            </span>
                          </div>

                          <div className="h-px bg-slate-100 dark:bg-slate-800" />

                          <div className="space-y-1.5">
                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider block">Latest Operation</span>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={getFriendlyActionDescription(activeUserDetail?.logs[0]?.action)}>
                              {getFriendlyActionDescription(activeUserDetail?.logs[0]?.action)}
                            </p>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-100/80 dark:border-slate-850">
                            <div className="text-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Visits</span>
                              <span className="text-xs font-black text-blue-600 dark:text-blue-405">{activeUserDetail?.actionsCount?.visits || 0}</span>
                            </div>
                            <div className="text-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Creates</span>
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-405">{activeUserDetail?.actionsCount?.creates || 0}</span>
                            </div>
                            <div className="text-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Updates</span>
                              <span className="text-xs font-black text-amber-600 dark:text-amber-405">{activeUserDetail?.actionsCount?.updates || 0}</span>
                            </div>
                            <div className="text-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Deletes</span>
                              <span className="text-xs font-black text-rose-600 dark:text-rose-455">{activeUserDetail?.actionsCount?.deletes || 0}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold border-t border-slate-100 dark:border-slate-800 pt-2">
                            <div className="flex items-center gap-1.5 truncate">
                              <Globe size={11} className="text-slate-400 shrink-0" />
                              <span className="truncate">IP: <strong className="text-slate-655 dark:text-slate-350">{formatSetList(activeUserDetail?.ipList, 1)}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                              {getDeviceIcon(Array.from(activeUserDetail?.deviceList || [])[0])}
                              <span className="truncate">Device: <strong className="text-slate-655 dark:text-slate-350">{formatSetList(activeUserDetail?.deviceList, 1)}</strong></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Recent Activity Timeline Panel */}
                    <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">Recent Activity</h3>
                          <button
                            onClick={() => { setSelectedUserEmail(null); setViewMode("grouped"); }}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                          >
                            View All
                          </button>
                        </div>

                        {/* Logs List */}
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                          {activeUserDetail?.logs?.map((log, idx) => {
                            const desc = log.action?.description?.toLowerCase() || "";
                            const method = log.action?.method || "";
                            const url = log.action?.url || "";
                            
                            // Determine type and icon/color
                            const isPageVisit = url.includes("log-page-visit") || desc.includes("visited");
                            const isCreate = method === "POST";
                            const isUpdate = method === "PUT";
                            const isDelete = method === "DELETE";

                            let iconBg = "bg-slate-50 text-slate-500 border-slate-100";
                            let iconEl = <Activity size={16} />;
                            let statusBadge = (
                              <span className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider bg-slate-55 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-850 shadow-inner">
                                Success
                              </span>
                            );

                            if (isPageVisit) {
                              iconBg = "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50";
                              iconEl = <Eye size={16} />;
                              statusBadge = (
                                <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-wider bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                                  Info
                                </span>
                              );
                            } else if (isCreate) {
                              iconBg = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50";
                              iconEl = <Plus size={16} />;
                              statusBadge = (
                                <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/50">
                                  Success
                                </span>
                              );
                            } else if (isDelete) {
                              iconBg = "bg-rose-50 dark:bg-rose-955/40 text-rose-600 dark:text-rose-455 border-rose-100 dark:border-rose-900/50";
                              iconEl = <Trash2 size={16} />;
                              statusBadge = (
                                <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-wider bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-455 border border-rose-250 dark:border-rose-900/50">
                                  Success
                                </span>
                              );
                            } else if (isUpdate) {
                              iconBg = "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-405 border-amber-100 dark:border-amber-900/50";
                              iconEl = <Edit3 size={16} />;
                              statusBadge = (
                                <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black tracking-wider bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-250 dark:border-amber-900/50">
                                  Warning
                                </span>
                              );
                            }

                            const formattedTime = new Date(log.timestamp).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true
                            });

                            // Build subtitle detail
                            let subtitleDetail = "Viewed page details and configurations";
                            if (log.action?.payload) {
                              const p = log.action.payload;
                              if (isPageVisit) {
                                subtitleDetail = `Viewed ${p.pageName || "pages"} and statistics`;
                              } else if (url.includes("/api/auth/login")) {
                                subtitleDetail = "System login session started";
                              } else {
                                const targetName = p.name || p.email || "";
                                const actionType = isCreate ? "created" : isUpdate ? "updated" : "removed";
                                subtitleDetail = targetName ? `${targetName} (${p.email || ""})` : log.action?.description || "Modified system settings";
                              }
                            } else {
                              subtitleDetail = log.action?.description || "No extra data logged";
                            }

                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedLog(log)}
                                className="group flex items-center justify-between gap-4 p-3 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-55 dark:hover:bg-slate-800 border border-slate-150/60 dark:border-slate-850 hover:border-slate-250 dark:hover:border-slate-700 rounded-2xl cursor-pointer transition-all duration-200"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${iconBg}`}>
                                    {iconEl}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                      {getFriendlyActionDescription(log.action)}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 truncate">
                                      {subtitleDetail}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-550">
                                    {formattedTime}
                                  </span>
                                  {statusBadge}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-4">
                        <button
                          onClick={() => { setSelectedUserEmail(null); setViewMode("flat"); }}
                          className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        >
                          View Full Activity Log
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : viewMode === "grouped" ? (
                /* =================== GROUPED USER CARDS FEED =================== */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-200">
                  {logsLoading ? (
                    <div className="col-span-full py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="relative flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-blue-600 animate-spin" />
                        </div>
                        <span className="text-slate-400 dark:text-slate-500 font-semibold text-sm animate-pulse">Retrieving system activity...</span>
                      </div>
                    </div>
                  ) : groupedUsers.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400 dark:text-slate-550">
                          <Users size={22} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-1">No active members</h3>
                        <p className="text-slate-400 dark:text-slate-500 text-xs">No active operations found for this date.</p>
                      </div>
                    </div>
                  ) : (
                    groupedUsers.map((userGroup, index) => {
                      const recentLog = userGroup.logs[0];
                      const totalActions = userGroup.logs.length;
                      const formattedLastActive = new Date(userGroup.lastActive).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true
                      });
                      const isExpanded = allCardsExpanded;
                      return (
                        <div
                          key={index}
                          className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300 flex flex-col space-y-2.5"
                        >
                          {/* User Profile Layout Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-extrabold text-xs shadow-sm shrink-0">
                                {userGroup.actor?.name ? userGroup.actor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : "SY"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs group-hover:text-indigo-600 transition-colors truncate" title={userGroup.actor?.name}>
                                  {userGroup.actor?.name || "System"}
                                </h4>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block mt-0.5 truncate" title={userGroup.actor?.email}>
                                  {userGroup.actor?.email || "system@matrix"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                {totalActions} Actions
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAllCardsExpanded(prev => !prev);
                                }}
                                className="p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-355 transition-all active:scale-90"
                              >
                                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </button>
                            </div>
                          </div>

                          {/* Expandable Details */}
                          {isExpanded && (
                            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="space-y-1 bg-slate-55 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Latest Operation</span>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={getFriendlyActionDescription(recentLog?.action)}>
                                  {getFriendlyActionDescription(recentLog?.action)}
                                </p>
                              </div>

                              <div className="grid grid-cols-4 gap-1.5">
                                <div className="text-center bg-white dark:bg-slate-900 py-1.5 px-1 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                  <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase mb-0.5">Visits</span>
                                  <span className="text-xs font-black text-blue-600">{userGroup.actionsCount.visits}</span>
                                </div>
                                <div className="text-center bg-white dark:bg-slate-900 py-1.5 px-1 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                  <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase mb-0.5">Creates</span>
                                  <span className="text-xs font-black text-emerald-600">{userGroup.actionsCount.creates}</span>
                                </div>
                                <div className="text-center bg-white dark:bg-slate-900 py-1.5 px-1 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                  <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase mb-0.5">Updates</span>
                                  <span className="text-xs font-black text-amber-600">{userGroup.actionsCount.updates}</span>
                                </div>
                                <div className="text-center bg-white dark:bg-slate-900 py-1.5 px-1 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                  <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase mb-0.5">Deletes</span>
                                  <span className="text-xs font-black text-rose-600">{userGroup.actionsCount.deletes}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="pt-2 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/40">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                              <Clock size={12} className="text-slate-300" />
                              <span>{formattedLastActive}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedUserEmail(userGroup.actor?.email)}
                              className="flex items-center text-[10px] font-bold text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-400 group-hover:translate-x-0.5 transition-all border-none outline-none bg-transparent"
                            >
                              <span>Timeline</span>
                              <ChevronRight size={12} className="ml-0.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* =================== FLAT CHRONOLOGICAL FEED TABLE =================== */
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in duration-200">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          <th className="p-4 pl-6 w-32 text-slate-600 dark:text-slate-350">Time</th>
                          <th className="p-4 w-72 text-slate-600 dark:text-slate-350">User details</th>
                          <th className="p-4 w-80 text-slate-600 dark:text-slate-350">Action Performed</th>
                          <th className="p-4 w-40 text-slate-600 dark:text-slate-350">IP Address</th>
                          <th className="p-4 w-44 text-slate-600 dark:text-slate-350">Device</th>
                          <th className="p-4 pr-6 text-center w-28 text-slate-600 dark:text-slate-350">Metadata</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {logsLoading ? (
                          <tr>
                            <td colSpan="6" className="p-20 text-center">
                              <div className="flex flex-col items-center justify-center gap-3">
                                <div className="w-10 h-10 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-blue-600 animate-spin" />
                                <span className="text-slate-550 dark:text-slate-500 font-semibold text-sm animate-pulse mt-2">Retrieving secure logs...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredLogs.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-20 text-center">
                              <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400 dark:text-slate-500">
                                  <FileJson size={22} />
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-2">No activity logged</h3>
                                <p className="text-slate-400 dark:text-slate-500 text-xs leading-normal">
                                  We couldn't find any audited operations matching your criteria on {new Date(logsDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredLogs.map((log, index) => {
                            const desc = log.action?.description?.toLowerCase() || "";
                            const isPageVisit = !log.action?.url?.includes("/api/admin-management");
                            const isDelete = desc.includes("delete") || desc.includes("remove");
                            const isCreate = desc.includes("create") || desc.includes("add");

                            let badgeColor = "bg-slate-55 text-slate-600 border-slate-200/60";
                            let glowDot = "bg-slate-400";

                            if (isPageVisit) {
                              badgeColor = "bg-blue-50 text-blue-700 dark:bg-blue-955/40 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/50";
                              glowDot = "bg-blue-500";
                            } else if (isCreate) {
                              badgeColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/50";
                              glowDot = "bg-emerald-500";
                            } else if (isDelete) {
                              badgeColor = "bg-rose-50 text-rose-700 dark:bg-rose-955/40 dark:text-rose-455 border-rose-200/50 dark:border-rose-900/50";
                              glowDot = "bg-rose-500";
                            } else {
                              badgeColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/50";
                              glowDot = "bg-amber-500";
                            }

                            const formattedTime = new Date(log.timestamp).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true
                            });

                            return (
                              <tr
                                key={index}
                                className="group hover:bg-blue-50/30 dark:hover:bg-slate-800/40 hover:translate-x-0.5 transition-all duration-200"
                              >
                                <td className="p-4 pl-6 text-sm font-mono font-semibold text-slate-600 dark:text-slate-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                  {formattedTime}
                                </td>
                                <td className="p-4">
                                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                                    {log.actor?.name || "System"}
                                    {log.actor?.role && (
                                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
                                        {log.actor.role}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-slate-400 dark:text-slate-500 text-xs mt-0.5 font-medium">{log.actor?.email}</div>
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeColor}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${glowDot} animate-pulse`} />
                                    {getFriendlyActionDescription(log.action)}
                                  </span>
                                </td>
                                <td className="p-4 text-sm text-slate-655 dark:text-slate-400 font-mono relative">
                                  <div className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 p-1.5 rounded-lg w-fit transition-all group/ip"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setActiveIpMenu(activeIpMenu?.index === index ? null : { index, ip: log.client?.ip || "127.0.0.1" });
                                       }}
                                       title="Click for IP options"
                                  >
                                    <Globe size={13} className="text-slate-400 dark:text-slate-500 group-hover/ip:text-blue-500 dark:group-hover/ip:text-blue-400 transition-colors" />
                                    <span className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all border-b border-dashed border-blue-300 dark:border-blue-900">
                                      {log.client?.ip || "localhost"}
                                    </span>
                                  </div>

                                  {activeIpMenu?.index === index && (
                                    <div 
                                      className="absolute left-4 top-10 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-1.5 text-xs text-left w-44 animate-in fade-in slide-in-from-top-1 duration-150 font-sans text-slate-800 dark:text-slate-200"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {(currentUser?.email === SUPER_ADMIN_EMAIL || currentUser?.permissions?.actions?.can_block_ip === true) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setIpToBlock(activeIpMenu.ip);
                                            setActiveIpMenu(null);
                                          }}
                                          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-50 dark:hover:bg-red-955/40 text-red-655 dark:text-red-400 hover:text-red-700 rounded-xl font-bold text-left transition-colors"
                                        >
                                          <Ban size={13} />
                                          Block this IP
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 text-xs text-slate-505 dark:text-slate-400 font-medium max-w-[150px] truncate" title={log.client?.device}>
                                  <span className="flex items-center gap-2">
                                    {getDeviceIcon(log.client?.device)}
                                    <span className="truncate">{log.client?.device}</span>
                                  </span>
                                </td>
                                <td className="p-4 pr-6 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLog(log)}
                                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-slate-55 dark:bg-slate-800 hover:bg-blue-55 dark:hover:bg-blue-950/40 text-slate-707 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl border border-slate-200 dark:border-slate-750 hover:border-blue-200/60 dark:hover:border-blue-900/50 transition-all duration-200 active:scale-95 shadow-sm"
                                  >
                                    <Eye size={12} />
                                    Details
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }
            </div>
          )}

  {activeTab === "blocked" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-50/30 dark:bg-slate-900">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Ban size={20} className="text-rose-500" />
                  Blocked IP Addresses
                </h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Manage client IP addresses that are banned from accessing the system.</p>
              </div>
              <button
                onClick={() => {
                  const ip = window.prompt("Enter IP Address to block (e.g. 192.168.1.1):");
                  if (ip) {
                    setIpToBlock(ip);
                  }
                }}
                className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all text-sm font-bold"
              >
                <Plus size={16} strokeWidth={3} /> Block Custom IP
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    <th className="p-5 pl-8 w-1/4 text-slate-500">IP Address</th>
                    <th className="p-5 w-1/5 text-slate-500">Blocked At</th>
                    <th className="p-5 w-1/5 text-slate-500">Blocked By</th>
                    <th className="p-5 w-1/4 text-slate-500">Reason</th>
                    <th className="p-5 pr-8 text-right w-32 text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {blockedIps.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-20 text-center bg-white dark:bg-slate-900">
                        <div className="flex flex-col items-center justify-center gap-4 max-w-sm mx-auto">
                          <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 border border-rose-100 dark:border-rose-900/50 shadow-sm rotate-3 hover:rotate-0 transition-transform">
                            <Ban size={28} />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">No Blocked IPs</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1.5 leading-relaxed">All IP addresses are currently allowed to access the system. No restrictions have been applied yet.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    blockedIps.map((ip) => (
                      <tr key={ip.ip_address} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="p-5 pl-8">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                              <Globe size={14} />
                            </div>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 group-hover:text-rose-600 transition-colors">{ip.ip_address}</span>
                          </div>
                        </td>
                        <td className="p-5 text-slate-500 dark:text-slate-400 text-xs font-semibold">{new Date(ip.blocked_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</td>
                        <td className="p-5 text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[9px] border border-blue-100 dark:border-blue-800/50 uppercase">
                            {ip.blocked_by_name ? ip.blocked_by_name.substring(0,2) : "SY"}
                          </div>
                          {ip.blocked_by_name || "System"}
                        </td>
                        <td className="p-5 text-slate-500 dark:text-slate-400 text-xs font-medium">{ip.reason || "Policy violation"}</td>
                        <td className="p-5 pr-8 text-right">
                          <button
                            onClick={() => handleUnblockIp(ip.ip_address)}
                            className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 px-4 py-2 rounded-xl border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all font-bold text-xs"
                          >
                            Unblock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======= TAB: ACTIVE SESSIONS ======= */}
      {activeTab === "sessions" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 md:p-8 min-h-[400px]">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Monitor size={20} className="text-indigo-500" />
                Active Sessions
              </h3>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Monitor currently logged-in administrators in real-time.</p>
            </div>

            {loadingSessions ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <div className="w-12 h-12 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-600 animate-spin mb-4" />
                <p className="font-bold text-sm">Loading active sessions...</p>
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl border border-slate-100 dark:border-slate-800/50 border-dashed">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-400 rotate-3 hover:rotate-0 transition-transform">
                  <Monitor size={28} />
                </div>
                <h3 className="text-base font-extrabold text-slate-700 dark:text-slate-300">No Active Sessions</h3>
                <p className="text-slate-500 dark:text-slate-500 max-w-xs mt-1.5 text-xs font-semibold leading-relaxed">There are currently no active admin sessions recorded in the system.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeSessions.map((session) => (
                  <div key={session.session_id} className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between gap-5 relative overflow-hidden group ${
                    currentUser?.email === session.admin_email 
                      ? 'ring-1 ring-emerald-500/30' 
                      : 'hover:border-indigo-500/20'
                  }`}>
                    {/* Left edge indicator */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full transition-all duration-300 ${
                      currentUser?.email === session.admin_email 
                        ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]' 
                        : 'bg-indigo-500 group-hover:bg-indigo-600'
                    }`}></div>

                    {/* Top Row: User Avatar & Role */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-4">
                        {/* Dynamic Avatar with Live Indicator */}
                        <div className="relative">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm transition-transform duration-300 group-hover:scale-105 ${
                            currentUser?.email === session.admin_email
                              ? 'bg-gradient-to-tr from-emerald-500 to-teal-500'
                              : 'bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600'
                          }`}>
                            {session.admin_name 
                              ? session.admin_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                              : "AD"}
                          </div>
                          {/* Live pulse dot */}
                          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                          </span>
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-[15px] leading-tight flex items-center gap-1.5">
                            {session.admin_name}
                          </h3>
                          <p className="text-slate-450 dark:text-slate-400 text-xs mt-1 truncate max-w-[200px]" title={session.admin_email}>
                            {session.admin_email}
                          </p>
                        </div>
                      </div>
                      
                      {/* Role Badge */}
                      <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border shadow-xs ${
                        session.admin_role === 'super_admin' || session.admin_email === SUPER_ADMIN_EMAIL
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                      }`}>
                        {session.admin_role === 'super_admin' || session.admin_email === SUPER_ADMIN_EMAIL ? 'Super Admin' : 'Admin'}
                      </span>
                    </div>

                    {/* Middle Section: Session Info Cards */}
                    <div className="grid grid-cols-2 gap-3.5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="bg-slate-50/50 dark:bg-slate-800/35 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-center">
                        <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1 block">IP Address</span>
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-750 dark:text-slate-300">
                          <Globe size={13} className="text-slate-400 dark:text-slate-500" />
                          <span className="font-mono">{session.ip_address || 'Unknown IP'}</span>
                        </div>
                      </div>
                      <div className="bg-slate-50/50 dark:bg-slate-800/35 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-center">
                        <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-1 block">Logged In</span>
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-750 dark:text-slate-300">
                          <Clock size={13} className="text-slate-400 dark:text-slate-500" />
                          <span>{new Date(session.logged_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Section */}
                    <div className="pt-2 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between gap-3">
                      {currentUser?.email === session.admin_email ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Current Session (You)
                          </span>
                          <button
                            disabled
                            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold border border-slate-200 dark:border-slate-700 text-xs opacity-60 cursor-not-allowed"
                          >
                            <Shield size={13} />
                            Active
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] text-slate-400 font-semibold italic">Remote management available</span>
                          <button
                            type="button"
                            onClick={() => setForceLogoutConfirmConfig({ isOpen: true, sessionId: session.session_id, adminName: session.admin_name })}
                            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-white dark:bg-slate-850 hover:bg-rose-50 dark:hover:bg-rose-955/25 text-rose-600 dark:text-rose-455 hover:text-rose-700 font-bold transition-all border border-rose-100 dark:border-rose-900/30 hover:border-rose-250 hover:scale-98 text-xs shadow-sm active:scale-95 cursor-pointer"
                          >
                            <LogOut size={13} />
                            Logout Session
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

{/* ======= LOG JSON DETAIL MODAL ======= */}
{
  selectedLog && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border dark:border-slate-800">
        <div className="p-6 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/55">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-200">Operation Audit Details</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                Logged ID: {selectedLog._id || selectedLog.id || "N/A"}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setSelectedLog(null); setShowRawJson(false); }}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Actor</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedLog.actor?.name || "System"}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{selectedLog.actor?.email || "system@matrix.com"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Timestamp</span>
              <p className="text-xs font-mono font-bold text-slate-655 dark:text-slate-350">
                {new Date(selectedLog.timestamp).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" })}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Action Performed</span>
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-150 dark:border-blue-900/50 rounded-2xl">
              <p className="text-sm font-bold text-blue-800 dark:text-blue-300">{getFriendlyActionDescription(selectedLog.action)}</p>
              <p className="text-xs text-slate-505 dark:text-slate-400 font-semibold mt-1">Route: <code className="bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded text-slate-650 dark:text-slate-350 font-mono text-[11px] border dark:border-slate-800">{selectedLog.action?.method} {selectedLog.action?.url}</code></p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Parameters Updated (Payload)</span>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-350 transition-colors"
              >
                {showRawJson ? "Show Formatted" : "View Raw JSON"}
              </button>
            </div>
            {showRawJson ? (
              <pre className="bg-slate-900 dark:bg-slate-950 text-slate-200 dark:text-slate-300 text-xs font-mono p-4 rounded-2xl overflow-x-auto max-h-[30vh] border dark:border-slate-800">
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            ) : (
              renderPayloadDetails(selectedLog.action?.payload)
            )}
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center">
          <button
            onClick={() => handleCopy(JSON.stringify(selectedLog, null, 2))}
            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-707 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-750 transition-colors shadow-sm"
          >
            {copied ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? "Copied Raw Data" : "Copy Raw Log"}
          </button>
          <button
            onClick={() => { setSelectedLog(null); setShowRawJson(false); }}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}

{/* ======= SUBMIT CONFIRMATION MODAL (Create / Update) ======= */}
{
  submitConfirmConfig.isOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeIn border dark:border-slate-800">
        {/* Header */}
        <div className={`relative p-6 flex items-center gap-4 ${submitConfirmConfig.step === 2
            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          }`}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            {submitConfirmConfig.step === 2
              ? <AlertTriangle size={24} className="text-white" />
              : <ShieldCheck size={24} className="text-white" />}
          </div>
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Step {submitConfirmConfig.step} of 2</p>
            <h3 className="text-white text-xl font-bold">
              {submitConfirmConfig.step === 1
                ? editingAdmin ? 'Update Admin?' : 'Create Admin?'
                : 'Final Confirmation'}
            </h3>
          </div>
          {/* Step progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-white/60 transition-all duration-500"
              style={{ width: submitConfirmConfig.step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {submitConfirmConfig.step === 1 ? (
            <>
              <p className="text-slate-600 dark:text-slate-400 text-sm">You are about to <strong className="text-slate-900 dark:text-slate-100">{editingAdmin ? 'update' : 'create'}</strong> the following admin account:</p>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border dark:border-blue-900/40">
                  <User size={18} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{formData.name || 'New Admin'}</p>
                  <p className="text-slate-500 dark:text-slate-500 text-xs">{formData.email}</p>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-500 text-sm">Please review and confirm to proceed.</p>
            </>
          ) : (
            <>
              <p className="text-slate-600 dark:text-slate-400 text-sm">This action will <strong className="text-slate-900 dark:text-slate-100">{editingAdmin ? 'immediately update' : 'grant system access to'}</strong> this admin.</p>
              <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">
                  {editingAdmin
                    ? 'Updated permissions will take effect on next login.'
                    : 'The new admin will be able to log in immediately.'}
                </p>
              </div>
              <p className="text-slate-500 dark:text-slate-500 text-sm">Are you absolutely sure you want to continue?</p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <button
            onClick={() => setSubmitConfirmConfig({ isOpen: false, step: 1, pendingSubmit: null })}
            className="px-4 py-2 rounded-lg text-slate-550 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitConfirmNext}
            className={`px-6 py-2.5 rounded-xl text-white font-semibold shadow-md transition-all text-sm flex items-center gap-2 ${submitConfirmConfig.step === 2
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
          >
            {submitConfirmConfig.step === 1
              ? <><CheckCircle size={16} /> Yes, Continue</>
              : <><ShieldCheck size={16} /> {editingAdmin ? 'Update Admin' : 'Create Admin'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

{/* ======= DELETE CONFIRMATION MODAL — 2 Steps ======= */}
{
  deleteConfirmConfig.isOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border dark:border-slate-800 animate-fadeIn">
        {/* Header */}
        <div className={`relative p-6 flex items-center gap-4 ${deleteConfirmConfig.step === 2
            ? 'bg-gradient-to-r from-red-650 to-rose-600'
            : 'bg-gradient-to-r from-orange-550 to-red-500'
          }`}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Trash2 size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Step {deleteConfirmConfig.step} of 2</p>
            <h3 className="text-white text-xl font-bold">
              {deleteConfirmConfig.step === 1 ? 'Delete Admin?' : 'Final Warning'}
            </h3>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-white/60 transition-all duration-500"
              style={{ width: deleteConfirmConfig.step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {deleteConfirmConfig.step === 1 ? (
            <>
              <p className="text-slate-600 dark:text-slate-400 text-sm">You are about to delete the following admin account:</p>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 border dark:border-red-900/40">
                  <User size={18} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{deleteConfirmConfig.admin?.name}</p>
                  <p className="text-slate-500 dark:text-slate-500 text-xs break-all">{deleteConfirmConfig.admin?.email}</p>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-500 text-sm">Are you sure you want to proceed?</p>
            </>
          ) : (
            <>
              <p className="text-slate-600 dark:text-slate-400 text-sm">This will <strong className="text-red-700 dark:text-red-400">immediately revoke access</strong> for this admin.</p>
              <div className="bg-red-50 dark:bg-red-955/25 border border-red-200 dark:border-red-900/40 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 dark:text-red-300 text-sm font-semibold">Account will be soft-deleted</p>
                  <p className="text-red-700 dark:text-red-400 text-xs mt-1">Data is retained for <strong>7 days</strong> and can be recovered within that period.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <button
            onClick={cancelDeleteConfirm}
            className="px-4 py-2 rounded-lg text-slate-550 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteConfirmNext}
            className={`px-6 py-2.5 rounded-xl text-white font-semibold shadow-md transition-all text-sm flex items-center gap-2 ${deleteConfirmConfig.step === 2
                ? 'bg-gradient-to-r from-red-650 to-rose-600 hover:from-red-700 hover:to-rose-700'
                : 'bg-gradient-to-r from-orange-550 to-red-500 hover:from-orange-600 hover:to-red-600'
              }`}
          >
            {deleteConfirmConfig.step === 1
              ? <><AlertTriangle size={16} /> Yes, Proceed</>
              : <><Trash2 size={16} /> Delete Admin</>}
          </button>
        </div>
      </div>
    </div>
  )
}

{/* ======= EDIT CONFIRMATION MODAL — 2 Steps ======= */}
{
  confirmConfig.isOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border dark:border-slate-800 animate-fadeIn">
        {/* Header */}
        <div className={`relative p-6 flex items-center gap-4 ${confirmConfig.step === 2
            ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600'
          }`}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            {confirmConfig.step === 2
              ? <AlertTriangle size={24} className="text-white" />
              : <Edit2 size={24} className="text-white" />}
          </div>
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Step {confirmConfig.step} of 2</p>
            <h3 className="text-white text-xl font-bold">
              {confirmConfig.step === 1 ? 'Edit Admin Rights?' : 'Security Warning'}
            </h3>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-white/60 transition-all duration-500"
              style={{ width: confirmConfig.step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {confirmConfig.step === 1 ? (
            <>
              <p className="text-slate-600 dark:text-slate-400 text-sm">You are about to edit access rights for:</p>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 border dark:border-blue-900/40">
                  <User size={18} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{confirmConfig.admin?.name}</p>
                  <p className="text-slate-500 dark:text-slate-500 text-xs">{confirmConfig.admin?.email}</p>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-500 text-sm">Do you want to continue?</p>
            </>
          ) : (
            <>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Changing access rights can <strong className="text-slate-900 dark:text-slate-100">impact system security</strong>.</p>
              <div className="bg-amber-50 dark:bg-amber-955/25 border border-amber-200 dark:border-amber-900/45 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">
                  Modified permissions will take effect immediately on next login.
                </p>
              </div>
              <p className="text-slate-500 dark:text-slate-500 text-sm">Are you absolutely sure you want to proceed?</p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <button
            onClick={cancelConfirm}
            className="px-4 py-2 rounded-lg text-slate-550 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmNext}
            className={`px-6 py-2.5 rounded-xl text-white font-semibold shadow-md transition-all text-sm flex items-center gap-2 ${confirmConfig.step === 2
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }`}
          >
            {confirmConfig.step === 1
              ? <><CheckCircle size={16} /> Yes, Continue</>
              : <><ShieldCheck size={16} /> I Understand, Edit</>}
          </button>
        </div>
      </div>
    </div>
  )
}

{/* ======= BLOCK IP CONFIRMATION MODAL ======= */}
{
  ipToBlock && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-650 to-rose-600 p-6 flex items-center gap-4 text-white">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Ban size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Block IP Address?</h3>
            <p className="text-white/70 text-xs font-medium">Banning access to the system</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            You are about to block all traffic and login requests from:
          </p>
          <div className="bg-red-50 dark:bg-red-955/25 border border-red-200 dark:border-red-900/40 rounded-xl p-4 flex items-center gap-3">
            <Globe size={18} className="text-red-600" />
            <div>
              <p className="font-mono font-bold text-red-800 dark:text-red-300 text-sm">{ipToBlock}</p>
              <p className="text-red-600/80 dark:text-red-400/80 text-xs font-semibold">Banned from entire portal</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Reason for blocking</label>
            <input
              type="text"
              placeholder="e.g. Repeated failed logins, suspicious activity"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-medium transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <button
            onClick={() => { setIpToBlock(null); setBlockReason(""); }}
            className="px-4 py-2 rounded-lg text-slate-550 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleBlockIp}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold shadow-md hover:shadow-lg active:scale-95 transition-all text-sm flex items-center gap-2"
          >
            <Ban size={14} /> Block IP
          </button>
        </div>
      </div>
    </div>
  )
}

      {/* ======= CUSTOM FORCE LOGOUT CONFIRMATION MODAL ======= */}
      {forceLogoutConfirmConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200 transform transition-all animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-6 flex flex-col items-center border-b border-red-100">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Ban size={32} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 text-center">Force Logout?</h3>
              <p className="text-slate-500 text-center mt-2 text-sm">
                You are about to instantly terminate the session for <strong className="text-slate-700">{forceLogoutConfirmConfig.adminName}</strong>.
              </p>
            </div>
            <div className="p-5 flex gap-3">
              <button
                onClick={() => setForceLogoutConfirmConfig({ isOpen: false, sessionId: null, adminName: null })}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleForceLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Ban size={18} /> Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
