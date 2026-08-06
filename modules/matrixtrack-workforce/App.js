import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Master from "./pages/Master";
import GeoFencing from "./pages/GeoFencing";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import AttendanceReports from "./pages/AttendanceReports";
import ShortAttendanceReport from "./pages/ShortAttendanceReport";
import Supervisors from "./pages/Supervisors";
import AssignSupervisorWard from "./pages/AssignSupervisorWard";

import Announcements from "./pages/Announcements";
import HomePage from "./pages/HomePage";
import SupervisorAttendanceAudit from "./pages/SupervisorAttendanceAudit";
import AdminManagement from "./pages/AdminManagement";
import ActivityLogs from "./pages/ActivityLogs";
import CityTrafficCostPage from "./pages/CityTrafficCostPage";

// Professional management pages
import SupervisorProfessionalAttendancePage from "./pages/SupervisorProfessionalAttendance";
import SupervisorProfessionalAttendanceRangeDetailsPage from "./pages/SupervisorProfessionalAttendanceRangeDetails";
import ProfessionalLeaveManagementPage from "./pages/ProfessionalLeaveManagement";
import SupervisorSelfPunchRequestsPage from "./pages/SupervisorSelfPunchRequests";
import SupervisorSelfPunchRequestDetailPage from "./pages/SupervisorSelfPunchRequestDetail";

import Settings from "./pages/Settings";
import Navbar from "./components/Navbar";
import SystemHealth from "./pages/SystemHealth";
import Login from "./pages/Login";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "./AuthContext";
import { AuthProvider } from "./AuthContext";
import { SearchProvider } from "./SearchContext";

/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Splash Loader ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */
const SplashLoader = ({ onDone }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 1700);
    const t2 = setTimeout(() => onDone(), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#ffffff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      transition: 'opacity .5s ease',
      opacity: fadeOut ? 0 : 1,
      pointerEvents: fadeOut ? 'none' : 'auto',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Title */}
      <div style={{
        fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
        fontWeight: 800,
        letterSpacing: '-.04em',
        opacity: 0,
        animation: 'splashUp .7s cubic-bezier(.16,1,.3,1) .1s forwards',
      }}>
        <span style={{ color: '#0f172a' }}>Matrix</span>
        <span style={{ color: '#6366f1' }}>Track</span>
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0,
        width: '100%', height: 3,
        background: '#f1f5f9',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          borderRadius: 4,
          animation: 'splashBar 1.6s cubic-bezier(.4,0,.2,1) .2s forwards',
          transformOrigin: 'left',
          transform: 'scaleX(0)',
        }} />
      </div>

      <style>{`
        @keyframes splashUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashBar {
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
};

function App() {
  const [ready, setReady] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);
  if (!ready) {
    return <SplashLoader onDone={() => setReady(true)} />;
  }

  return (
    <AuthProvider>
      <SearchProvider>
        <Router>
          <MainContent
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        </Router>
      </SearchProvider>
    </AuthProvider>
  );
}

function MainContent({ darkMode, setDarkMode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const { user, hasPermission, isAdmin } = useAuth();

  useMemo(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const ROUTE_CONFIG = useMemo(
    () => [
      { path: "/dashboard", element: <Dashboard />, permission: { module: "dashboard", action: "view" } },
      { path: "/master", element: <Master />, permission: { module: "master", action: "view" } },
      { path: "/geofencing", element: <GeoFencing />, permission: { module: "geofencing", action: "view" } },
      { path: "/employees", element: <Employees />, permission: { module: "employees", action: "view" } },
      {
        path: "/attendance",
        element: <AttendanceReports />,
        permission: { module: "attendance_reports", action: "view" },
      },
      {
        path: "/short-attendance",
        element: <ShortAttendanceReport />,
        permission: { module: "short_attendance", action: "view" },
      },
      {
        path: "/supervisors",
        element: <Supervisors />,
        permission: { module: "supervisors", action: "view" },
      },
      {
        path: "/assignSupervisorWard",
        element: <AssignSupervisorWard />,
        permission: { module: "assign_supervisor_ward", action: "view" },
      },

      { path: "/settings", element: <Settings />, permission: { module: "settings", action: "view" } },
      { path: "/announcements", element: <Announcements />, permission: { module: "announcements", action: "view" }, adminOnly: true },
      { path: "/system-health", element: <SystemHealth />, permission: { module: "system-health", action: "view" }, adminOnly: true },
      {
        path: "/supervisor-audit",
        element: <SupervisorAttendanceAudit />,
        permission: { module: "supervisor_audit", action: "view" },
      },
      {
        path: "/admin-management",
        element: <AdminManagement />,
        permission: { module: "admin_management", action: "view" },
        adminOnly: true,
      },
      {
        path: "/activity-logs",
        element: <ActivityLogs />,
        permission: { module: "activity-logs", action: "view" },
        adminOnly: true,
      },
      {
        path: "/city-traffic-cost",
        element: <CityTrafficCostPage />,
        permission: { module: "dashboard", action: "view" },
        adminOnly: true,
      },
      // Professional ManagementÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
      {
        path: "/supervisor/professional-attendance",
        element: <SupervisorProfessionalAttendancePage />,
        permission: { module: "professional-attendance", action: "view" },
      },
      {
        path: "/supervisor/professional-attendance/date-range-details",
        element: <SupervisorProfessionalAttendanceRangeDetailsPage />,
        permission: { module: "professional-attendance", action: "view" },
      },
      {
        path: "/supervisor/professional-leave",
        element: <ProfessionalLeaveManagementPage />,
        permission: { module: "professional-leave-mgmt", action: "view" },
      },
      {
        path: "/supervisor/self-punch/requests",
        element: <SupervisorSelfPunchRequestsPage />,
        permission: { module: "field-access-requests", action: "view" },
      },
      {
        path: "/supervisor/self-punch/requests/:id",
        element: <SupervisorSelfPunchRequestDetailPage />,
        permission: { module: "field-access-requests", action: "view" },
      },
    ],
    []
  );

  const allowedRoutes = useMemo(
    () => {
      const isAllowedAdmin = isAdmin();
      return ROUTE_CONFIG.filter(
        (route) =>
          (!route.permission || hasPermission(route.permission)) &&
          (!route.adminOnly || isAllowedAdmin)
      );
    },
    [ROUTE_CONFIG, hasPermission, user, isAdmin]
  );

  const defaultRoute = useMemo(() => {
    const firstAllowed = allowedRoutes[0];
    return firstAllowed ? firstAllowed.path : "/no-access";
  }, [allowedRoutes]);

  // Check if current path is a public page (no sidebar, no navbar, no padding)
  const isPublicPage = !user && (
    window.location.pathname === "/" ||
    window.location.pathname === "/home" ||
    window.location.pathname === "/unified-login"
  );

  if (isPublicPage) {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/unified-login" element={<RedirectIfAuthenticated />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <div className="
  flex
  min-h-screen
  bg-slate-50
  relative

  dark:bg-slate-950
">      {user && <Sidebar isOpen={isSidebarOpen} />}

      {/* Mobile Backdrop */}
      {user && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`flex-1 w-full min-w-0 transition-all duration-300 ${user && isSidebarOpen ? "lg:ml-64" : "ml-0"
          }`}
      >
        {user && (
          <Navbar
            toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
          />
        )}
        {user && (
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="
      fixed
      bottom-5
      right-5
      z-50
      px-4
      py-2
      rounded-xl
      shadow-lg
      bg-white
      text-slate-800
      border
      border-slate-200

      dark:bg-slate-800
      dark:text-white
      dark:border-slate-700
    "
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        )}
        <div className="
  p-3
  sm:p-5

  text-slate-800
  dark:text-slate-100
">          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <HomePage />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/unified-login" element={<RedirectIfAuthenticated />} />
            <Route path="/no-access" element={<NoAccess />} />

            {ROUTE_CONFIG.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <ProtectedRoute
                    element={route.element}
                    requiredPermission={route.permission}
                    adminOnly={Boolean(route.adminOnly)}
                    fallback={defaultRoute}
                  />
                }
              />
            ))}
            <Route path="*" element={<Navigate to={user ? defaultRoute : "/"} replace />} />
          </Routes>
          {user && allowedRoutes.length === 0 && <NoAccess inline />}
        </div>
      </div>
    </div>
  );
}

const RedirectIfAuthenticated = () => {
  const { user, hasPermission, isAdmin } = useAuth();
  const ROUTE_CONFIG = [
    {
      path: "/dashboard",
      element: (
        <div className="
      min-h-screen
      bg-slate-950

      text-slate-800
      dark:text-slate-100
    ">
          <Dashboard />
        </div>
      ),
      permission: { module: "dashboard", action: "view" }
    }, { path: "/master", permission: { module: "master", action: "view" } },
    { path: "/geofencing", permission: { module: "geofencing", action: "view" } },
    { path: "/employees", permission: { module: "employees", action: "view" } },
    { path: "/attendance", permission: { module: "attendance_reports", action: "view" } },
    { path: "/short-attendance", permission: { module: "short_attendance", action: "view" } },
    { path: "/supervisors", permission: { module: "supervisors", action: "view" } },
    { path: "/assignSupervisorWard", permission: { module: "assign_supervisor_ward", action: "view" } },

    { path: "/settings", permission: { module: "settings", action: "view" } },
    { path: "/announcements", permission: { module: "announcements", action: "view" }, adminOnly: true },
    { path: "/system-health", permission: { module: "system-health", action: "view" }, adminOnly: true },
    { path: "/supervisor-audit", permission: { module: "supervisor_audit", action: "view" } },
    { path: "/admin-management", permission: { module: "admin_management", action: "view" }, adminOnly: true },
    { path: "/city-traffic-cost", permission: { module: "dashboard", action: "view" }, adminOnly: true },
    { path: "/supervisor/professional-attendance", permission: { module: "professional-attendance", action: "view" } },
    { path: "/supervisor/professional-leave", permission: { module: "professional-leave-mgmt", action: "view" } },
    { path: "/supervisor/self-punch/requests", permission: { module: "field-access-requests", action: "view" } },
    { path: "/supervisor/self-punch/requests/:id", permission: { module: "field-access-requests", action: "view" } },
  ];

  if (user) {
    const fallback =
      ROUTE_CONFIG.find((route) => (!route.adminOnly || isAdmin()) && hasPermission(route.permission))?.path || "/no-access";
    return <Navigate to={fallback} replace />;
  }
  return <Login />;
};

const NoAccess = ({ inline = false }) => {
  const { user } = useAuth();
  return (
    <div className={`
  max-w-3xl
  ${inline ? "" : "mx-auto"}

  bg-white
  border
  border-gray-200
  rounded-lg
  shadow
  p-6
  space-y-3

  dark:bg-slate-900
  dark:border-slate-700
`}>      <div>
        <h2 className="text-xl font-semibold text-gray-800">No access assigned</h2>
        <p className="text-sm text-gray-600">
          Your account does not have access to any modules. Please contact an administrator to grant permissions.
        </p>
      </div>

      {user && (
        <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-3 space-y-1">
          <div className="font-semibold text-gray-800">Debug info (visible only here)</div>
          <div>User: {user.name} ({user.email}) | role: {user.role}</div>
          <div>Permissions count: {Array.isArray(user.permissions) ? user.permissions.length : 0}</div>
          <div>
            Permissions:
            <span className="block break-words">
              {Array.isArray(user.permissions) && user.permissions.length > 0
                ? user.permissions.map((p) => `${p.module}:${p.action}`).join(", ")
                : "none"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
