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
import { AuthProvider } from './AuthContext';
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

  useEffect(() => {
    let token = localStorage.getItem('token');
    if (!token) {
      token = 'sso-matrix-token-12345';
      localStorage.setItem('token', token);
    }
    let user = localStorage.getItem('user');
    if (!user) {
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

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 relative dark:bg-slate-950">
      <Sidebar
        isOpen={isSidebarOpen}
        activeView={activeView}
        onSelectView={setActiveView}
      />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 pl-64">
        <Navbar
          isSidebarOpen={isSidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
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
