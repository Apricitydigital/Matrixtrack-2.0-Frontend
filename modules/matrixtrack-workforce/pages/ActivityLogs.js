import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  CalendarRange,
  Search,
  User,
  X,
  AlertTriangle,
  Eye,
  CheckCircle,
  Copy,
  Monitor,
  Smartphone,
  Globe,
  RefreshCw,
  Activity,
  Trash2,
  Plus,
  Edit3,
  LogIn,
  LogOut,
  FileJson,
  Users,
  Clock,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  MapPin,
  Megaphone,
  Database,
  Key,
  Ban,
  LayoutGrid,
  Lock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { buildApiUrl } from "../config";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || "mtadmin@apricitydigital.in";

export default function ActivityLogs() {
  const { user: currentUser, logPageView } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsDate, setLogsDate] = useState(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Drill-down and View Mode states
  const [viewMode, setViewMode] = useState("grouped"); // "grouped" or "flat"
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);
  const [activeIpMenu, setActiveIpMenu] = useState(null); // { index, ip }
  const [ipToBlock, setIpToBlock] = useState(null);
  const [blockReason, setBlockReason] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedModule, setSelectedModule] = useState("all");
  const [allCardsExpanded, setAllCardsExpanded] = useState(false);
  const [selectedHourBin, setSelectedHourBin] = useState(null);

  useEffect(() => {
    logPageView("Activity Logs", "/activity-logs");
  }, [logPageView]);

  const fetchLogs = useCallback(async (date, isBackground = false) => {
    if (!isBackground) setLoading(true);
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
      if (!isBackground) setLoading(false);
    }
  }, []);

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
        setIpToBlock(null);
        setBlockReason("");
        alert(`IP address ${ipToBlock} has been blocked successfully!`);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to block IP");
      }
    } catch (error) {
      console.error("Error blocking IP:", error);
    }
  };

  useEffect(() => {
    fetchLogs(logsDate);

    // Auto-update (silent polling) every 15 seconds if logsDate is today
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
  }, [logsDate, fetchLogs]);

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

  // Format request payload into a clean user-friendly list
  const renderPayloadDetails = (payload) => {
    if (!payload || typeof payload !== "object" || Object.keys(payload).length === 0) {
      return <div className="text-slate-500 dark:text-slate-400 text-sm font-semibold italic p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl text-center border border-slate-100 dark:border-slate-800">No parameters updated.</div>;
    }

    // Map raw payload keys to human-readable labels
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
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/50">Yes</span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">No</span>
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
      <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <div className="col-span-1">Details Field</div>
          <div className="col-span-2">Value / Status</div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {keys.map((key) => (
            <div key={key} className="grid grid-cols-3 px-4 py-3 items-center text-sm hover:bg-slate-55/40 dark:hover:bg-slate-800/40 transition-colors">
              <div className="col-span-1 font-bold text-slate-600 dark:text-slate-400">{formatKey(key)}</div>
              <div className="col-span-2 font-semibold text-slate-800 dark:text-slate-200 break-words">{renderValue(payload[key])}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Base filtered logs (excludes admin, applies search)
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

      // Check if the actor is an admin
      const isAdminActor =
        ["admin", "super_admin", "operations_manager", "auditor"].includes(actorRole) ||
        actorEmail === SUPER_ADMIN_EMAIL;

      if (isAdminApiAction || isPageVisitToAdmin || isAdminActor) return false;

      const term = searchQuery.toLowerCase();
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
  }, [logs, searchQuery]);

  // Filter logs by selected module (but not category) for overall module metrics
  const moduleFilteredLogs = React.useMemo(() => {
    return baseFilteredLogs.filter((log) => {
      if (selectedModule !== "all") {
        const logModule = getLogModule(log);
        return logModule === selectedModule;
      }
      return true;
    });
  }, [baseFilteredLogs, selectedModule]);

  // Filter logs by clicked category state and selected module
  const filteredLogs = React.useMemo(() => {
    return baseFilteredLogs.filter((log) => {
      // 1. Filter by category
      const desc = log.action?.description?.toLowerCase() || "";
      if (filterCategory === "logins") {
        if (!(desc.includes("log") || desc.includes("sign"))) return false;
      } else if (filterCategory === "modifications") {
        if (!(desc.includes("create") || desc.includes("add") || desc.includes("update") || desc.includes("edit") || desc.includes("modif") || desc.includes("transfer"))) return false;
      } else if (filterCategory === "deletions") {
        if (!(desc.includes("delete") || desc.includes("remove"))) return false;
      }

      // 2. Filter by module
      if (selectedModule !== "all") {
        const logModule = getLogModule(log);
        if (logModule !== selectedModule) return false;
      }

      return true;
    });
  }, [baseFilteredLogs, filterCategory, selectedModule]);

  // Further filter logs by selected hourly bin for the timeline/users feed
  const timelineLogs = React.useMemo(() => {
    if (selectedHourBin === null) return filteredLogs;
    return filteredLogs.filter((log) => {
      const hour = new Date(log.timestamp).getHours();
      const binIdx = Math.floor(hour / 2);
      return binIdx === selectedHourBin;
    });
  }, [filteredLogs, selectedHourBin]);

  // Group logs by Unique User (Actor)
  const groupedUsers = React.useMemo(() => {
    const groups = {};
    timelineLogs.forEach((log) => {
      const email = log.actor?.email || "system@matrix.com";
      if (!groups[email]) {
        groups[email] = {
          actor: log.actor || { name: "System", email: "system@matrix.com", role: "system" },
          logs: [],
          lastActive: log.timestamp,
          ipList: new Set(),
          deviceList: new Set(),
          actionsCount: { logins: 0, creates: 0, updates: 0, deletes: 0, others: 0 }
        };
      }
      groups[email].logs.push(log);
      groups[email].ipList.add(log.client?.ip || "localhost");
      groups[email].deviceList.add(log.client?.device || "Unknown Device");

      if (new Date(log.timestamp) > new Date(groups[email].lastActive)) {
        groups[email].lastActive = log.timestamp;
      }

      const desc = log.action?.description?.toLowerCase() || "";
      if (desc.includes("log") || desc.includes("sign")) groups[email].actionsCount.logins++;
      else if (desc.includes("create") || desc.includes("add")) groups[email].actionsCount.creates++;
      else if (desc.includes("update") || desc.includes("edit") || desc.includes("modif") || desc.includes("transfer")) groups[email].actionsCount.updates++;
      else if (desc.includes("delete") || desc.includes("remove")) groups[email].actionsCount.deletes++;
      else groups[email].actionsCount.others++;
    });

    return Object.values(groups).sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
  }, [timelineLogs]);

  // Construct Hourly Trend data with actors list (2-hour bins: 00:00 to 24:00)
  const barData = React.useMemo(() => {
    const bins = Array(12).fill(null).map((_, idx) => {
      const startHour = idx * 2;
      const formatHour = (h) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
      return {
        binIdx: idx,
        time: `${formatHour(startHour)}`,
        range: `${formatHour(startHour)} - ${formatHour(startHour + 2)}`,
        events: 0,
        actors: new Set(),
      };
    });

    filteredLogs.forEach((log) => {
      const hour = new Date(log.timestamp).getHours();
      const binIdx = Math.floor(hour / 2);
      if (binIdx >= 0 && binIdx < 12) {
        bins[binIdx].events++;
        const actorName = log.actor?.name || "System";
        bins[binIdx].actors.add(actorName);
      }
    });

    return bins.map((bin) => ({
      binIdx: bin.binIdx,
      time: bin.time,
      range: bin.range,
      events: bin.events,
      actorsList: Array.from(bin.actors).join(", ") || "None"
    }));
  }, [filteredLogs]);

  // Calculate overall metrics
  const stats = React.useMemo(() => {
    let logins = 0;
    let creates = 0;
    let updates = 0;
    let deletes = 0;

    baseFilteredLogs.forEach((log) => {
      if (selectedModule !== "all") {
        const logModule = getLogModule(log);
        if (logModule !== selectedModule) return;
      }

      const desc = log.action?.description?.toLowerCase() || "";
      if (desc.includes("log") || desc.includes("sign")) logins++;
      else if (desc.includes("create") || desc.includes("add")) creates++;
      else if (desc.includes("update") || desc.includes("edit") || desc.includes("modif") || desc.includes("transfer")) updates++;
      else if (desc.includes("delete") || desc.includes("remove")) deletes++;
    });

    return { logins, creates, updates, deletes };
  }, [baseFilteredLogs, selectedModule]);

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
    setSelectedUserEmail(null); // Clear selected user email
    setTimeout(() => {
      const element = document.getElementById("logs-feed-container");
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
          <div className="bg-slate-50/50 dark:bg-slate-950/50 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-2 w-full">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/50">{formattedTime}</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyle}`}>{getFriendlyActionDescription(log.action)}</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-750">
                  <MapPin size={10} className="text-slate-400" />{getFriendlyLocation(log.action)}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 dark:text-slate-500 font-semibold">
                <div className="relative">
                  <span className="flex items-center gap-1 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 p-1 rounded-lg transition-all group/ip"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIpMenu(activeIpMenu?.index === `grouped-${index}` ? null : { index: `grouped-${index}`, ip: log.client?.ip || "127.0.0.1" });
                    }}
                    title="Click for IP options"
                  >
                    <Globe size={12} className="text-slate-400 dark:text-slate-550 group-hover/ip:text-blue-500 dark:group-hover/ip:text-blue-400 transition-colors" />
                    IP:{" "}
                    <strong className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-all border-b border-dashed border-blue-300 dark:border-blue-900">
                      {log.client?.ip || "localhost"}
                    </strong>
                  </span>

                  {activeIpMenu?.index === `grouped-${index}` && (
                    <div
                      className="absolute left-0 top-6 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-1.5 text-xs text-left w-44 animate-in fade-in slide-in-from-top-1 duration-150 font-sans text-slate-800 dark:text-slate-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(currentUser?.email === SUPER_ADMIN_EMAIL || currentUser?.permissions?.actions?.can_block_ip === true) && (
                        <button
                          type="button"
                          onClick={() => {
                            setIpToBlock(activeIpMenu.ip);
                            setActiveIpMenu(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-650 dark:text-red-400 hover:text-red-700 rounded-xl font-bold text-left transition-colors"
                        >
                          <Ban size={13} />
                          Block this IP
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <span className="flex items-center gap-1.5">{getDeviceIcon(log.client?.device)}<strong className="text-slate-600 dark:text-slate-300">{log.client?.device || "Unknown"}</strong></span>
              </div>
            </div>
            <button type="button" onClick={() => setSelectedLog(log)} className="self-start md:self-center inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl border border-slate-200 dark:border-slate-750 hover:border-blue-200/60 dark:hover:border-blue-900/50 transition-all duration-200 active:scale-95 shadow-sm">
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
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded-full border border-slate-250 dark:border-slate-800">{criticalLogs.length}</span>
            </div>
            <div className="relative border-l-2 border-rose-100 dark:border-rose-950 ml-4 pl-8 space-y-6 py-2">
              {criticalLogs.map((log, i) => renderLogItem(log, i))}
            </div>
          </div>
        )}
        {visitLogs.length > 0 && (
          <details className="group" open={criticalLogs.length === 0}>
            <summary className="flex items-center gap-2 cursor-pointer select-none list-none p-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
              <span className="flex h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Page Visits</span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">{visitLogs.length}</span>
              <span className="ml-auto text-[10px] text-slate-400 font-semibold group-open:hidden">Show ▾</span>
              <span className="ml-auto text-[10px] text-slate-400 font-semibold hidden group-open:inline">Hide ▴</span>
            </summary>
            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-8 space-y-4 py-4 mt-3">
              {visitLogs.map((log, i) => {
                const formattedTime = new Date(log.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
                return (
                  <div key={i} className="relative group">
                    <span className="absolute -left-12 top-1.5 flex h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700 ring-2 ring-slate-100 dark:ring-slate-900/60 z-10" />
                    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-850 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-slate-900 transition-colors">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400">{formattedTime}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                          <Eye size={9} />{getFriendlyActionDescription(log.action)}
                        </span>
                      </div>
                      <button type="button" onClick={() => setSelectedLog(log)} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded-lg border border-transparent hover:border-blue-200 dark:hover:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all">Details</button>
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

  // Calculate severity proportions
  const totalActionsForWidget = moduleFilteredLogs.length || 1;
  const loginPct = Math.round((stats.logins / totalActionsForWidget) * 100) || 0;
  const createPct = Math.round((stats.creates / totalActionsForWidget) * 100) || 0;
  const updatePct = Math.round((stats.updates / totalActionsForWidget) * 100) || 0;
  const delPct = Math.round((stats.deletes / totalActionsForWidget) * 100) || 0;

  const pieData = [
    { name: "Logins", value: stats.logins, color: "#22c55e" },
    { name: "Created", value: stats.creates, color: "#3b82f6" },
    { name: "Updated", value: stats.updates, color: "#f59e0b" },
    { name: "Deleted", value: stats.deletes, color: "#ef4444" }
  ].filter(d => d.value > 0);

  if (pieData.length === 0) {
    pieData.push({ name: "No Events", value: 1, color: "#e2e8f0" });
  }

  return (
    <div className="pt-0 px-4 pb-4 md:pt-0 md:px-6 md:pb-6 w-full space-y-4">

      {/* Header Container */}
      <div className="relative bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 dark:from-slate-900 dark:via-emerald-950/20 dark:to-teal-900/15 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden group">
        {/* Ambient Mesh Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(at_0%_0%,rgba(16,185,129,0.12)_0px,transparent_50%),radial-gradient(at_100%_0%,rgba(20,184,166,0.1)_0px,transparent_50%),radial-gradient(at_50%_100%,rgba(6,182,212,0.15)_0px,transparent_50%)] pointer-events-none" />

        {/* Dot Grid Pattern Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20">
          <svg className="w-full h-full text-emerald-600/[0.08]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dotGridLogs" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotGridLogs)" />
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/80 dark:from-green-950/60 dark:to-green-900/40 border border-green-200/60 dark:border-green-800/50 flex items-center justify-center text-green-600 dark:text-green-400 shadow-md shadow-green-100/50 dark:shadow-none shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight leading-none">
              System Activity Audit
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-450 font-medium mt-2">
              Securely tracks operations across all core modules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center z-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-650 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-sm">
            {filteredLogs.length === baseFilteredLogs.length
              ? `${filteredLogs.length} Events Logged`
              : `${filteredLogs.length} of ${baseFilteredLogs.length} Selected`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card: Total Operations */}
        <div
          onClick={() => handleCardClick("all")}
          className={`p-4 rounded-xl border flex items-center gap-4 transition-all duration-200 cursor-pointer bg-white dark:bg-slate-900 ${filterCategory === "all"
              ? "border-green-500 dark:border-green-500/60 shadow-sm ring-1 ring-green-500/30"
              : "border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-700"
            }`}
        >
          <div className="w-11 h-11 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center text-green-500 shrink-0">
            <LayoutGrid size={20} />
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">All Operations</span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-55 leading-none block mb-1">{moduleFilteredLogs.length}</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Total actions recorded</span>
          </div>
        </div>

        {/* Card: Login events */}
        <div
          onClick={() => handleCardClick("logins")}
          className={`p-4 rounded-xl border flex items-center gap-4 transition-all duration-200 cursor-pointer bg-white dark:bg-slate-900 ${filterCategory === "logins"
              ? "border-blue-500 dark:border-blue-500/60 shadow-sm ring-1 ring-blue-500/30"
              : "border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-700"
            }`}
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500 shrink-0">
            <Lock size={20} />
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Logins / Access</span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-55 leading-none block mb-1">{stats.logins}</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Successful logins</span>
          </div>
        </div>

        {/* Card: Updates / Creates */}
        <div
          onClick={() => handleCardClick("modifications")}
          className={`p-4 rounded-xl border flex items-center gap-4 transition-all duration-200 cursor-pointer bg-white dark:bg-slate-900 ${filterCategory === "modifications"
              ? "border-amber-500 dark:border-amber-500/60 shadow-sm ring-1 ring-amber-500/30"
              : "border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-700"
            }`}
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500 shrink-0">
            <Edit3 size={20} />
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Modifications</span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-55 leading-none block mb-1">{stats.creates + stats.updates}</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Data changes made</span>
          </div>
        </div>

        {/* Card: Deletes */}
        <div
          onClick={() => handleCardClick("deletions")}
          className={`p-4 rounded-xl border flex items-center gap-4 transition-all duration-200 cursor-pointer bg-white dark:bg-slate-900 ${filterCategory === "deletions"
              ? "border-rose-500 dark:border-rose-500/60 shadow-sm ring-1 ring-rose-500/30"
              : "border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow hover:border-slate-300 dark:hover:border-slate-700"
            }`}
        >
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500 shrink-0">
            <Trash2 size={20} />
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Deletions</span>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-55 leading-none block mb-1">{stats.deletes}</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Records deleted</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden relative group">
          {/* Moving background ambient light */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-all duration-500" />

          <style>{`
              @keyframes pulseOpacity {
                0% { stop-opacity: 0.25; }
                50% { stop-opacity: 0.55; }
                100% { stop-opacity: 0.25; }
              }
              @keyframes pulseFlow {
                0% {
                  stroke-dashoffset: 24;
                }
                100% {
                  stroke-dashoffset: 0;
                }
              }
              .pulse-area-stop {
                animation: pulseOpacity 4s ease-in-out infinite;
              }
              .animate-dash-flow {
                stroke-dasharray: 6, 6;
                animation: pulseFlow 2s linear infinite;
              }
            `}</style>

          <div className="flex items-center justify-between z-10">
            <div>
              <h2 className="text-slate-900 dark:text-slate-100 text-[15px] font-extrabold">Activity Overview</h2>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium mt-1">Audit pattern over time</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
              24-Hour Range
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>

          {/* Recharts Bar Graph */}
          <div className="flex-1 min-h-[176px] w-full flex items-end justify-center mt-6 mb-2 relative z-10">
            {filteredLogs.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 dark:text-slate-450 text-xs gap-1.5 select-none">
                <Clock size={16} className="animate-spin text-slate-600" />
                <span>No activities logged today</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  onClick={(state) => {
                    if (state && state.activeTooltipIndex !== undefined) {
                      const binIdx = state.activeTooltipIndex;
                      setSelectedHourBin(binIdx);
                      setTimeout(() => {
                        const element = document.getElementById("logs-feed-container");
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }, 100);
                    }
                  }}
                >
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                    ticks={['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '12 AM']}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                    ticks={[0, 20, 40, 60, 80, 100, 120]}
                  />
                  <RechartsTooltip
                    cursor={{ fill: '#f1f5f9' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xl text-xs font-semibold max-w-[240px]">
                            <p className="text-slate-500 dark:text-slate-400 font-bold mb-1">{data.range}</p>
                            <p className="text-slate-800 dark:text-slate-100 font-black text-sm mb-1.5 flex justify-between items-center">
                              <span>Events Count:</span>
                              <span className="bg-slate-150 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-250 dark:border-slate-700 text-xs">{data.events}</span>
                            </p>
                            {data.events > 0 && (
                              <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1.5 space-y-1">
                                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-550 block">Actors Active:</span>
                                <p className="text-blue-600 dark:text-blue-400 font-bold leading-normal break-words">
                                  {data.actorsList}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="events" fill="#22c55e" barSize={12} className="cursor-pointer" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Critical Activity Distribution Widget */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:shadow-md transition-all duration-200">
          <div>
            <h2 className="text-slate-900 dark:text-slate-100 text-[15px] font-extrabold">Activity Distribution</h2>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium mt-1">Breakdown of events by type</p>
          </div>
          {/* Doughnut Chart and Legend */}
          <div className="flex-1 flex items-center justify-center gap-6 mt-4 mb-2">
            <div className="relative w-24 h-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={28}
                    outerRadius={42}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black text-slate-850 dark:text-slate-100 leading-none">{moduleFilteredLogs.length}</span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider leading-none">Total</span>
              </div>
            </div>

            <div className="w-40 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-350 gap-2">
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="truncate">Logins</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-650 dark:text-slate-400 text-xs w-7 text-right">{loginPct}%</span>
                  <span className="text-slate-500 dark:text-slate-450 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-full text-[10px] min-w-[20px] text-center border border-slate-100 dark:border-slate-700">{stats.logins}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-350 gap-2">
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="truncate">Created</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-650 dark:text-slate-400 text-xs w-7 text-right">{createPct}%</span>
                  <span className="text-slate-500 dark:text-slate-450 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-full text-[10px] min-w-[20px] text-center border border-slate-100 dark:border-slate-700">{stats.creates}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-350 gap-2">
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="truncate">Updated</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-650 dark:text-slate-400 text-xs w-7 text-right">{updatePct}%</span>
                  <span className="text-slate-500 dark:text-slate-450 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-full text-[10px] min-w-[20px] text-center border border-slate-100 dark:border-slate-700">{stats.updates}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-350 gap-2">
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="truncate">Deleted</span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-650 dark:text-slate-400 text-xs w-7 text-right">{delPct}%</span>
                  <span className="text-slate-500 dark:text-slate-450 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-full text-[10px] min-w-[20px] text-center border border-slate-100 dark:border-slate-700">{stats.deletes}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar (Filters & Toggle View Mode) */}
      <div id="logs-feed-container" className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm scroll-mt-6">

        <div className="flex flex-wrap items-center gap-2">

          {/* Date Selector input */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1">
            <CalendarRange size={14} className="text-slate-500" />
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Date:</span>
            <input
              type="date"
              value={logsDate}
              onChange={(e) => { setLogsDate(e.target.value); setSelectedUserEmail(null); }}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer focus:text-blue-600 dark:focus:text-blue-400"
            />
          </div>

          {/* Quick Dates */}
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 p-0.5">
            <button
              onClick={setToToday}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${logsDate === new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
                  ? "bg-white dark:bg-slate-800 text-slate-850 dark:text-slate-250 shadow-sm border border-slate-200 dark:border-slate-700"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
            >
              Today
            </button>
            <button
              onClick={setToYesterday}
              className="px-2.5 py-1 text-[11px] font-bold rounded text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Yesterday
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchLogs(logsDate)}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-250 rounded-lg text-[11px] border border-transparent dark:border-slate-750 font-bold transition-all shadow-sm active:scale-95 animate-in fade-in duration-200"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          {selectedHourBin !== null && (
            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-150 dark:border-blue-900/50 rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-inner">
              <span>Time: {barData[selectedHourBin]?.range}</span>
              <button
                type="button"
                onClick={() => setSelectedHourBin(null)}
                className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 hover:bg-blue-100/50 dark:hover:bg-blue-900/50 p-0.5 rounded-full transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Search input & Toggle Mode switch */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">

          {/* View Toggler */}
          {!selectedUserEmail && (
            <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 p-0.5">
              <button
                onClick={() => setViewMode("grouped")}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded transition-all duration-200 ${viewMode === "grouped"
                    ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
              >
                <Users size={12} />
                User-Wise Feed
              </button>
              <button
                onClick={() => setViewMode("flat")}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded transition-all duration-200 ${viewMode === "flat"
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
            <Search size={14} className="absolute left-2.5 text-slate-400 dark:text-slate-550" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-8 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 p-0.5 rounded-full text-slate-400 dark:text-slate-550 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Module Filters Bar */}
      <div className="bg-slate-50/60 dark:bg-slate-950/60 backdrop-blur-md p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-2 overflow-x-auto" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {modulesList.map((mod) => {
          const isActive = selectedModule === mod.id;
          const IconComponent = mod.icon;

          // Calculate counts specifically for this module
          const count = mod.id === "all"
            ? baseFilteredLogs.length
            : baseFilteredLogs.filter(l => getLogModule(l) === mod.id).length;

          // Curated premium colors for active module states
          const themeMap = {
            all: "from-blue-600 to-indigo-650 shadow-blue-500/15 text-white",
            security: "from-emerald-500 to-teal-600 shadow-emerald-500/15 text-white",
            admin: "from-indigo-500 to-violet-650 shadow-indigo-500/15 text-white",
            supervisors: "from-purple-500 to-fuchsia-650 shadow-purple-500/15 text-white",
            employees: "from-cyan-500 to-blue-600 shadow-cyan-500/15 text-white",
            geofencing: "from-sky-500 to-blue-600 shadow-sky-500/15 text-white",
            announcements: "from-amber-500 to-orange-600 shadow-amber-500/15 text-white",
            "master-setup": "from-rose-500 to-pink-600 shadow-rose-500/15 text-white",
            navigation: "from-slate-700 to-slate-800 shadow-slate-700/15 text-white",
          };

          // Text color map for active badge labels to match the theme with high contrast
          const textThemeMap = {
            all: "text-blue-600",
            security: "text-emerald-600",
            admin: "text-indigo-600",
            supervisors: "text-purple-600",
            employees: "text-cyan-600",
            geofencing: "text-sky-600",
            announcements: "text-amber-600",
            "master-setup": "text-rose-600",
            navigation: "text-slate-800",
          };

          const activeClasses = themeMap[mod.id] || "from-blue-600 to-indigo-650 text-white";

          return (
            <button
              key={mod.id}
              onClick={() => { setSelectedModule(mod.id); setSelectedUserEmail(null); }}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-black transition-all duration-300 ease-out whitespace-nowrap active:scale-95 border border-transparent outline-none ${isActive
                  ? `bg-gradient-to-r ${activeClasses} shadow-md scale-[1.01] border-transparent`
                  : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-550 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200 shadow-sm border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
            >
              <span className={`transition-transform duration-300 ${isActive ? "text-white scale-110" : "text-slate-400 group-hover:scale-110"}`}>
                {IconComponent}
              </span>
              <span>{mod.label}</span>
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider transition-all duration-300 shadow-sm ${isActive
                  ? `bg-white dark:bg-slate-800 ${textThemeMap[mod.id] || "text-blue-600"}`
                  : "bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-250/30 dark:border-slate-850/50"
                }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Display Body */}
      {selectedUserEmail ? (

        /* =================== USER TIMELINE DRILL-DOWN SCREEN =================== */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Header Card with User info and Back Button */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedUserEmail(null)}
                className="p-3 bg-slate-50 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-200/50 dark:hover:border-blue-900/50 transition-all duration-200 active:scale-90 shrink-0 shadow-sm"
                title="Go back to users list"
              >
                <ArrowLeft size={18} />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{activeUserDetail?.actor?.name || "System Actor"}</h2>
                  <span className="text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                    {activeUserDetail?.actor?.role || "system"}
                  </span>
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mt-0.5">{activeUserDetail?.actor?.email}</p>
              </div>
            </div>

            {/* Drill Down Stats */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-150 dark:border-slate-850">
              <div className="px-3 py-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm text-center">
                <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Total Operations</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{activeUserDetail?.logs?.length}</span>
              </div>
              <div className="px-3 py-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm text-center">
                <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">IP Addresses</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{activeUserDetail?.ipList?.size}</span>
              </div>
              <div className="px-3 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-sm text-center">
                <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Browsers Used</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{activeUserDetail?.deviceList?.size}</span>
              </div>
            </div>
          </div>

          {/* Timeline Feed Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Clock size={14} className="text-blue-500" />
              Activity Timeline
            </h3>
            {renderTimeline(activeUserDetail)}
          </div>
        </div>

      ) : viewMode === "grouped" ? (

        /* =================== GROUPED USER-WISE SUMMARY FEED =================== */
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider px-2">Unique Active Members</span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-lg shadow-sm">
              {groupedUsers.length} Users active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {loading ? (
              <div className="col-span-full py-20 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-blue-600 animate-spin" />
                    <div className="absolute w-5 h-5 rounded-full bg-blue-500/10 animate-pulse" />
                  </div>
                  <span className="text-slate-500 dark:text-slate-450 font-semibold text-sm animate-pulse mt-2">Retrieving system activity...</span>
                </div>
              </div>
            ) : groupedUsers.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400 dark:text-slate-550">
                    <Users size={22} />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base mt-2">No user active</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-normal">
                    No active operations logged for this date.
                  </p>
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
                    className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm hover:shadow-md hover:border-blue-400/60 dark:hover:border-blue-500/60 transition-all duration-300 flex flex-col space-y-2.5"
                  >
                    {/* User profile layout / Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200/70 dark:from-slate-800 dark:to-slate-850 flex items-center justify-center text-slate-650 dark:text-slate-400 border border-slate-200/60 dark:border-slate-850 shrink-0">
                          <User size={16} className="group-hover:text-blue-650 dark:group-hover:text-blue-400 transition-colors" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs truncate group-hover:text-blue-650 dark:group-hover:text-blue-400 transition-colors" title={userGroup.actor?.name}>
                            {userGroup.actor?.name || "System"}
                          </h4>
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mt-0.5 truncate" title={userGroup.actor?.role}>
                            {userGroup.actor?.role || "system"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-bold text-blue-650 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-150 dark:border-blue-900 px-2 py-0.5 rounded-lg shadow-inner">
                          {totalActions} Actions
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAllCardsExpanded(prev => !prev);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-55 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all active:scale-90"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Brief description of last activity */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-555 uppercase tracking-wider block">Latest Operation</span>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={getFriendlyActionDescription(recentLog?.action)}>
                            {getFriendlyActionDescription(recentLog?.action)}
                          </p>
                        </div>

                        {/* Activity Counts Badges Grid */}
                        <div className="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-100/80 dark:border-slate-850">
                          <div className="text-center bg-white dark:bg-slate-900 py-1.5 px-1 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase mb-0.5">Logins</span>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{userGroup.actionsCount.logins}</span>
                          </div>
                          <div className="text-center bg-white dark:bg-slate-900 py-1.5 px-1 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase mb-0.5">Creates</span>
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400">{userGroup.actionsCount.creates}</span>
                          </div>
                          <div className="text-center bg-white dark:bg-slate-900 py-1.5 px-1 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase mb-0.5">Updates</span>
                            <span className="text-xs font-black text-amber-600 dark:text-amber-400">{userGroup.actionsCount.updates}</span>
                          </div>
                          <div className="text-center bg-white dark:bg-slate-900 py-1.5 px-1 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="block text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase mb-0.5">Deletes</span>
                            <span className="text-xs font-black text-rose-600 dark:text-rose-455">{userGroup.actionsCount.deletes}</span>
                          </div>
                        </div>

                        {/* Network & Device Info Summary */}
                        <div className="flex flex-col gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold border-t border-slate-100 dark:border-slate-800 pt-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <Globe size={11} className="text-slate-400 shrink-0" />
                            <span className="truncate">IP: <strong className="text-slate-650 dark:text-slate-300">{formatSetList(userGroup.ipList, 1)}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            {getDeviceIcon(Array.from(userGroup.deviceList)[0])}
                            <span className="truncate">Device: <strong className="text-slate-650 dark:text-slate-300">{formatSetList(userGroup.deviceList, 1)}</strong></span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer elements */}
                    <div className="pt-2 flex items-center justify-between text-[10px] font-bold text-slate-500 border-t border-slate-50 dark:border-slate-800/40">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400" />
                        <span>Last active: <strong className="text-slate-700 dark:text-slate-300">{formattedLastActive}</strong></span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedUserEmail(userGroup.actor?.email)}
                        className="flex items-center text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors active:scale-95 border-none outline-none bg-transparent"
                      >
                        <span>Timeline</span>
                        <ChevronRight size={13} className="ml-0.5" />
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      ) : (

        /* =================== FLAT CHRONOLOGICAL TIMELINE FEED =================== */
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-4 pl-6 w-32">Time</th>
                  <th className="p-4 w-72">User details (Actor)</th>
                  <th className="p-4 w-80">Performed Action</th>
                  <th className="p-4 w-40">IP Address</th>
                  <th className="p-4 w-44">Client Device</th>
                  <th className="p-4 pr-6 text-center w-28">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="relative flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-blue-600 animate-spin" />
                          <div className="absolute w-5 h-5 rounded-full bg-blue-500/10 animate-pulse" />
                        </div>
                        <span className="text-slate-500 dark:text-slate-450 font-semibold text-sm animate-pulse mt-2">Retrieving secure logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : timelineLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400 dark:text-slate-550">
                          <FileJson size={22} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base mt-2">No activity logged</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs leading-normal">
                          We couldn't find any audited operations matching your criteria on {new Date(logsDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  timelineLogs.map((log, index) => {
                    const desc = log.action?.description?.toLowerCase() || "";
                    const isLogin = desc.includes("log") || desc.includes("sign");
                    const isDelete = desc.includes("delete") || desc.includes("remove");
                    const isCreate = desc.includes("create") || desc.includes("add");

                    let badgeColor = "bg-slate-55 text-slate-600 border-slate-200/60";
                    let glowDot = "bg-slate-400";

                    if (isLogin) {
                      badgeColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/50";
                      glowDot = "bg-emerald-500";
                    } else if (isCreate) {
                      badgeColor = "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/50";
                      glowDot = "bg-blue-500";
                    } else if (isDelete) {
                      badgeColor = "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-455 border-rose-200/50 dark:border-rose-900/50";
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
                        className="group hover:bg-slate-55/40 dark:hover:bg-slate-800/40 hover:translate-x-0.5 transition-all duration-200"
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
                        <td className="p-4 text-sm text-slate-650 dark:text-slate-400 font-mono relative">
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
                                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-50 dark:hover:bg-red-955/40 text-red-650 dark:text-red-400 hover:text-red-700 rounded-xl font-bold text-left transition-colors"
                                >
                                  <Ban size={13} />
                                  Block this IP
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400 font-medium max-w-[150px] truncate" title={log.client?.device}>
                          <span className="flex items-center gap-2">
                            {getDeviceIcon(log.client?.device)}
                            <span className="truncate">{log.client?.device}</span>
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-slate-55 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl border border-slate-200 dark:border-slate-750 hover:border-blue-200/60 dark:hover:border-blue-900/50 transition-all duration-200 active:scale-95"
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
      )}

      {/* Selected Log JSON Details Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300"
          style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)" }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200/80 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 p-6 flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <FileJson size={20} />
                </div>
                <div>
                  <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Logged Payload Data</span>
                  <h3 className="text-white text-base font-bold mt-0.5">{getFriendlyActionDescription(selectedLog.action)}</h3>
                </div>
              </div>
              <button
                onClick={() => { setSelectedLog(null); setShowRawJson(false); }}
                className="text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 p-2 rounded-xl transition-all duration-200 active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">

              {/* Context Summary Cards */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl">
                <div className="space-y-1">
                  <span className="block font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Timestamp</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350 text-sm">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="block font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Initiator (Actor)</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350 text-sm truncate block" title={selectedLog.actor?.email}>
                    {selectedLog.actor?.name || "System"} ({selectedLog.actor?.email})
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="block font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Client Network IP</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-350 text-sm">{selectedLog.client?.ip}</span>
                </div>
                <div className="space-y-1">
                  <span className="block font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">User Device Details</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350 text-sm truncate block" title={selectedLog.client?.device}>
                    {selectedLog.client?.device}
                  </span>
                </div>
              </div>

              {/* User Friendly Operation Parameters */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider">Operation Details</h4>
                {renderPayloadDetails(selectedLog.action?.payload)}
              </div>

              {/* Collapsible Technical Details (Developer Only) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full flex justify-between items-center px-4 py-3 bg-slate-55 dark:bg-slate-950 hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors text-xs font-bold text-slate-650 dark:text-slate-400 uppercase tracking-wider border-none outline-none"
                >
                  <span>Technical Data (JSON)</span>
                  <span className="text-slate-400 font-semibold">{showRawJson ? "Hide" : "Show"}</span>
                </button>

                {showRawJson && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-950 relative">
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => handleCopy(JSON.stringify(selectedLog.action?.payload || {}, null, 2))}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors active:scale-95 border border-slate-700/50"
                      >
                        {copied ? (
                          <>
                            <CheckCircle size={10} className="text-green-400" />
                            <span className="text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={10} />
                            <span>Copy Raw JSON</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-slate-300 text-[10px] font-mono overflow-x-auto max-h-48 leading-relaxed shadow-inner">
                      {JSON.stringify(selectedLog.action?.payload || {}, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 flex justify-end shrink-0 gap-3">
              <button
                onClick={() => { setSelectedLog(null); setShowRawJson(false); }}
                className="px-5 py-2.5 bg-slate-250 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all duration-200 active:scale-95"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ======= BLOCK IP CONFIRMATION MODAL ======= */}
      {ipToBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)' }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left border dark:border-slate-800">
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
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 flex items-center gap-3">
                <Globe size={18} className="text-red-600" />
                <div>
                  <p className="font-mono font-bold text-red-800 text-sm">{ipToBlock}</p>
                  <p className="text-red-600/80 text-xs font-semibold">Banned from entire portal</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Reason for blocking</label>
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
                className="px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
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
      )}
    </div>
  );
}
