import React from "react";
import {
  Activity,
  CalendarRange,
  FileSpreadsheet,
  FileText,
  Layers,
  LayoutDashboard,
  MapPin,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  IndianRupee,
} from "lucide-react";
import { useAuth } from "../AuthContext";

const logo = "/assets/logo.png";

const SUPER_ADMIN_EMAIL = process.env.REACT_APP_SUPER_ADMIN_EMAIL || "mtadmin@apricitydigital.in";

export const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: { module: "dashboard", action: "view" },
  },
  {
    to: "/master",
    label: "Master",
    icon: Layers,
    permission: { module: "master", action: "view" },
  },
  {
    to: "/geofencing",
    label: "GeoFencing",
    icon: MapPin,
    permission: { module: "geofencing", action: "view" },
  },
  {
    to: "/supervisors",
    label: "Supervisors Management",
    icon: UserCheck,
    permission: { module: "supervisors", action: "view" },
  },
  {
    to: "/assignSupervisorWard",
    label: "Assign Supervisor Kothi",
    icon: UserCheck,
    permission: { module: "assign-supervisor-ward", action: "view" },
  },
  {
    to: "/employees",
    label: "Employee Master",
    icon: Users,
    permission: { module: "employees", action: "view" },
  },
  {
    to: "/attendance",
    label: "Attendance Reports",
    icon: CalendarRange,
    permission: { module: "attendance-reports", action: "view" },
  },
  {
    to: "/short-attendance",
    label: "Short Attendance Report",
    icon: FileSpreadsheet,
    permission: { module: "short-attendance", action: "view" },
  },
  {
    to: "/supervisor-audit",
    label: "Supervisor Attendance Audit",
    icon: UserCheck,
    permission: { module: "supervisor-audit", action: "view" },
  },
  {
    to: "/supervisor/self-punch/requests",
    label: "Professional Access Requests",
    icon: UserCheck,
    permission: { module: "field-access-requests", action: "view" },
  },
  {
    to: "/supervisor/professional-attendance",
    label: "Professional Attendance",
    icon: CalendarRange,
    permission: { module: "professional-attendance", action: "view" },
  },
  {
    to: "/supervisor/professional-leave",
    label: "Professional Leave Management",
    icon: CalendarRange,
    permission: { module: "professional-leave-mgmt", action: "view" },
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
    permission: { module: "settings", action: "view" },
  },
  {
    to: "/announcements",
    label: "Announcements",
    icon: FileSpreadsheet,
    permission: { module: "announcements", action: "view" },
    adminOnly: true,
  },
  {
    to: "/system-health",
    label: "System Health",
    icon: Activity,
    permission: { module: "system-health", action: "view" },
    adminOnly: true,
  },
  {
    to: "/admin-management",
    label: "Admin Management",
    icon: ShieldCheck,
    permission: { module: "admin_management", action: "view" },
    adminOnly: true,
  },
  {
    to: "/activity-logs",
    label: "Activity Logs",
    icon: FileText,
    permission: { module: "activity-logs", action: "view" },
    adminOnly: true,
  },
  {
    to: "/city-traffic-cost",
    label: "City Traffic Cost",
    icon: IndianRupee,
    permission: { module: "dashboard", action: "view" },
    adminOnly: true,
    superAdminOnly: true,
  },
];

function Sidebar({ isOpen, activeView, onSelectView }) {
  const { user, hasPermission, isAdmin } = useAuth();

  const filteredNav = NAV_ITEMS.filter(
    (item) =>
      !item.permission ||
      hasPermission(item.permission) ||
      isAdmin() ||
      !user
  );

  return (
    <div
      className={`w-64 h-screen bg-slate-900 text-white fixed top-0 transition-transform duration-300 shadow-2xl z-50 flex flex-col ${
        isOpen ? "left-0" : "-left-64"
      }`}
    >
      {/* Fixed header */}
      <div className="flex flex-col items-start gap-3 px-5 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-2 px-2">
          <img
            src={logo}
            alt="Company Logo"
            className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">MatrixTrack</p>
            <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
          </div>
        </div>
        <div className="w-full h-px bg-white/10" />
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto px-5 pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <ul className="space-y-1">
          {filteredNav.map(({ to, label, icon: Icon }) => {
            const viewKey = to.replace(/^\//, "").replace(/\//g, "-");
            const href = `/workforce-monitoring?view=${viewKey || "dashboard"}`;
            const isActive =
              activeView === viewKey ||
              (activeView === "dashboard" && viewKey === "dashboard") ||
              (activeView === "assign-supervisor-ward" && viewKey === "assignSupervisorWard");

            return (
              <li key={to}>
                <a
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    if (onSelectView) {
                      onSelectView(viewKey || "dashboard");
                    }
                    if (typeof window !== "undefined") {
                      window.history.pushState({}, "", href);
                    }
                  }}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                    isActive
                      ? "bg-indigo-600 text-white font-semibold shadow-md"
                      : "text-slate-200 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span
                    className={`p-2 rounded-lg border ${
                      isActive
                        ? "bg-indigo-500/30 border-white/20"
                        : "border-white/5 bg-white/5"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export default Sidebar;