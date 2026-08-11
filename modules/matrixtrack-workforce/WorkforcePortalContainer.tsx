'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { WorkspaceLoading } from '@components/ui/WorkspaceLoading';
import './index.css';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { AuthProvider, useAuth } from './AuthContext';
import { SearchProvider } from './SearchContext';

import Dashboard from './pages/Dashboard';
import Master from './pages/Master';
import GeoFencing from './pages/GeoFencing';
import Employees from './pages/Employees';
import AttendanceReports from './pages/AttendanceReports';
import ShortAttendanceReport from './pages/ShortAttendanceReport';
import Supervisors from './pages/Supervisors';
import AssignSupervisorWard from './pages/AssignSupervisorWard';
import Settings from './pages/Settings';
import SupervisorAttendanceAudit from './pages/SupervisorAttendanceAudit';
import SupervisorSelfPunchRequests from './pages/SupervisorSelfPunchRequests';
import SupervisorProfessionalAttendance from './pages/SupervisorProfessionalAttendance';
import ProfessionalLeaveManagement from './pages/ProfessionalLeaveManagement';
import Announcements from './pages/Announcements';
import SystemHealth from './pages/SystemHealth';
import AdminManagement from './pages/AdminManagement';
import ActivityLogs from './pages/ActivityLogs';
import CityTrafficCostPage from './pages/CityTrafficCostPage';

function WorkforceContent() {
  const { user, hasPermission, isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') || 'dashboard';
  const [activeView, setActiveView] = useState<string>(initialView);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam) {
      setActiveView(viewParam);
    }
  }, [searchParams]);

  const normalizedRoles = Array.isArray(user?.roles)
    ? user.roles.map((role: string | { name?: string }) =>
      String(
        typeof role === 'string'
          ? role
          : role?.name || ''
      )
        .trim()
        .toUpperCase()
    )
    : [];

  const scopedAssignedCities = Array.isArray(user?.customPermissions?.assigned_cities)
    ? user.customPermissions.assigned_cities
    : [];

  const isCityAdminUser = normalizedRoles.some((role: string) =>
    ['CITY_ADMIN', 'COMMISSIONER', 'ULB_OFFICER'].includes(role)
  ) || scopedAssignedCities.length > 0;

  const canAccessView = (view: string) => {
    const normalizedView = String(view || '').trim();
    if (!normalizedView || normalizedView === 'dashboard') return true;

    if (
      isCityAdminUser &&
      ['geofencing'].includes(normalizedView)
    ) {
      return false;
    }

    const permissionMap: Record<string, { module: string; action: string }> = {
      master: { module: 'master', action: 'view' },
      geofencing: { module: 'geofencing', action: 'view' },
      employees: { module: 'employees', action: 'view' },
      attendance: { module: 'attendance_reports', action: 'view' },
      'short-attendance': { module: 'short_attendance', action: 'view' },
      supervisors: { module: 'supervisors', action: 'view' },
      assignSupervisorWard: { module: 'assign_supervisor_ward', action: 'view' },
      'assign-supervisor-ward': { module: 'assign_supervisor_ward', action: 'view' },
      'supervisor-audit': { module: 'supervisor_audit', action: 'view' },
      'supervisor-self-punch-requests': { module: 'field-access-requests', action: 'view' },
      'supervisor-professional-attendance': { module: 'professional-attendance', action: 'view' },
      'supervisor-professional-leave': { module: 'professional-leave-mgmt', action: 'view' },
      announcements: { module: 'announcements', action: 'view' },
      'system-health': { module: 'system-health', action: 'view' },
      'admin-management': { module: 'admin_management', action: 'view' },
      'activity-logs': { module: 'activity-logs', action: 'view' },
      'city-traffic-cost': { module: 'dashboard', action: 'view' },
      settings: { module: 'settings', action: 'view' },
    };

    const targetPermission = permissionMap[normalizedView];
    if (!targetPermission) return true;
    return Boolean(hasPermission(targetPermission) || isAdmin());
  };

  useEffect(() => {
    if (!canAccessView(activeView)) {
      setActiveView('dashboard');
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/workforce-monitoring?view=dashboard');
      }
    }
  }, [activeView, hasPermission, isAdmin, isCityAdminUser]);

  useEffect(() => {
    let unifiedMatrixTrackToken: string | null = null;
    try {
      const rawUnifiedSession = localStorage.getItem('unified_auth_session');
      if (rawUnifiedSession) {
        const parsed = JSON.parse(rawUnifiedSession);
        unifiedMatrixTrackToken = parsed?.tokens?.matrixTrack || null;
      }
    } catch {
      unifiedMatrixTrackToken = null;
    }

    const matrixTrackToken =
      localStorage.getItem('matrixtrack_access_token') ||
      unifiedMatrixTrackToken;
    const genericToken = localStorage.getItem('token');

    if (matrixTrackToken) {
      localStorage.setItem('matrixtrack_access_token', matrixTrackToken);
    }

    if (matrixTrackToken && genericToken !== matrixTrackToken) {
      localStorage.setItem('token', matrixTrackToken);
    }

    let user = localStorage.getItem('user');
    if (!user && !matrixTrackToken && !genericToken) {
      const defaultUser = {
        id: 'admin-sso',
        name: 'Admin',
        email: 'admin@matrixtrack.in',
        role: 'admin',
        roles: ['admin'],
        permissions: [
          { module: 'dashboard', action: 'view' },
          { module: 'master', action: 'view' },
          { module: 'geofencing', action: 'view' },
          { module: 'employees', action: 'view' },
          { module: 'attendance_reports', action: 'view' },
          { module: 'short_attendance', action: 'view' },
          { module: 'supervisors', action: 'view' },
          { module: 'assign_supervisor_ward', action: 'view' },
          { module: 'settings', action: 'view' },
        ]
      };
      localStorage.setItem('user', JSON.stringify(defaultUser));
    }
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'master':
        return <Master />;
      case 'geofencing':
        return <GeoFencing />;
      case 'employees':
        return <Employees />;
      case 'attendance':
        return <AttendanceReports />;
      case 'short-attendance':
        return <ShortAttendanceReport />;
      case 'supervisors':
        return <Supervisors />;
      case 'assignSupervisorWard':
      case 'assign-supervisor-ward':
        return <AssignSupervisorWard />;
      case 'supervisor-audit':
        return <SupervisorAttendanceAudit />;
      case 'supervisor-self-punch-requests':
        return <SupervisorSelfPunchRequests />;
      case 'supervisor-professional-attendance':
        return <SupervisorProfessionalAttendance />;
      case 'supervisor-professional-leave':
        return <ProfessionalLeaveManagement />;
      case 'announcements':
        return <Announcements />;
      case 'system-health':
        return <SystemHealth />;
      case 'admin-management':
        return <AdminManagement />;
      case 'activity-logs':
        return <ActivityLogs />;
      case 'city-traffic-cost':
        return <CityTrafficCostPage />;
      case 'settings':
        return <Settings />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  const hideSidebar = true;
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 relative dark:bg-slate-950">
      {!hideSidebar && (
        <Sidebar
          isOpen={isSidebarOpen}
          activeView={activeView}
          onSelectView={setActiveView}
        />
      )}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${hideSidebar ? 'pl-0' : 'pl-64'}`}>
        {!hideSidebar && (
          <Navbar
            toggleSidebar={() =>
              setSidebarOpen((previous) => !previous)
            }
          />
        )}
        <main className="flex-1 p-2 lg:p-4 overflow-x-hidden">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default function WorkforcePortalContainer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <WorkspaceLoading
        title="Workforce Monitoring Workspace"
        subtitle="Loading field employee management, attendance & professional leave records..."
      />
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <SearchProvider>
            <Suspense fallback={
              <WorkspaceLoading
                title="Workforce Monitoring Workspace"
                subtitle="Loading field employee management, attendance & professional leave records..."
              />
            }>
              <WorkforceContent />
            </Suspense>
          </SearchProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
