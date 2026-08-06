'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@hooks/useAuth';
import { roleLabel } from '@lib/labels';
import {
  ShieldCheck,
  Building2,
  LogOut,
  Globe,
  LayoutDashboard,
  Shield,
  UserCheck2,
  ChevronDown,
  Package,
  Map,
  MapPin,
  Target,
  Users,
  UserPlus,
  Layers,
  Lock,
  ClipboardList,
  ClipboardCheck,
  FileText,
  Award,
  CalendarRange,
  FileSpreadsheet,
  UserCheck,
  Settings,
  Info,
  Trash2,
  Activity,
  PlusCircle
} from 'lucide-react';
import { moduleEntryPath } from '@utils/modules';
import { setAuthCookie } from '@lib/auth';

function PortalHomeLayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') || 'dashboard';

  const [clockStr, setClockStr] = useState('');

  const isTaskforceActive = pathname.startsWith('/city') || pathname.startsWith('/modules');
  const isSwachhActive = pathname.startsWith('/ward-ranking');
  const isWorkforceActive = pathname.startsWith('/workforce-monitoring');
  const isInsideWorkspace = isTaskforceActive || isSwachhActive || isWorkforceActive;

  const [taskforceOpen, setTaskforceOpen] = useState(isTaskforceActive);
  const [swachhOpen, setSwachhOpen] = useState(isSwachhActive);
  const [workforceOpen, setWorkforceOpen] = useState(isWorkforceActive);
  const [modulesSubOpen, setModulesSubOpen] = useState(pathname.startsWith('/modules'));
  const [masterSubOpen, setMasterSubOpen] = useState(pathname.startsWith('/city/zones') || pathname.startsWith('/city/wards') || pathname.startsWith('/city/areas') || pathname.startsWith('/city/users'));
  const [portalToolsOpen, setPortalToolsOpen] = useState(!isInsideWorkspace);

  useEffect(() => {
    if (isInsideWorkspace) {
      setPortalToolsOpen(false);
    } else {
      setPortalToolsOpen(true);
    }
    if (isTaskforceActive) setTaskforceOpen(true);
    if (isSwachhActive) setSwachhOpen(true);
    if (isWorkforceActive) setWorkforceOpen(true);
    if (pathname.startsWith('/modules')) setModulesSubOpen(true);
    if (pathname.startsWith('/city/zones') || pathname.startsWith('/city/wards') || pathname.startsWith('/city/areas') || pathname.startsWith('/city/users')) setMasterSubOpen(true);
  }, [pathname, isTaskforceActive, isSwachhActive, isWorkforceActive, isInsideWorkspace]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setAuthCookie('');
    router.push('/unified-login');
  };

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'hms_super_admin' || user?.role === 'SUPER_ADMIN' || (user?.roles || []).includes('hms_super_admin') || (user?.roles || []).includes('HMS_SUPER_ADMIN') || (user?.roles || []).includes('SUPER_ADMIN') || (user?.roles || []).includes('super_admin');
  const displayName = user?.name || 'User';
  const roleLabelText = user?.role ? roleLabel(user.role) : '';
  const cityName = user?.city ? user.city.name : '';
  const userInitial = displayName.charAt(0).toUpperCase();

  const userRoles = user?.roles || [];
  const userRole = user?.role || '';
  const userPermissions = (user as any)?.permissions || [];
  const userModules = (user as any)?.modules || [];
  const userAssignedModules = (user as any)?.assignedModules || [];

  // Normalize all user roles, permissions, modules to uppercase strings
  const normalizedAllRoles = Array.from(
    new Set([
      userRole,
      ...userRoles,
      ...userPermissions,
      ...userAssignedModules,
      ...userModules.map((m: any) => m.key || m.name || m.moduleId || '')
    ].filter(Boolean).map((r: any) => String(r).trim().toUpperCase()))
  );

  const isCityAdmin = isSuperAdmin || normalizedAllRoles.some(r => ['CITY_ADMIN', 'COMMISSIONER', 'ULB_OFFICER', 'HMS_SUPER_ADMIN', 'HMS_ADMIN'].includes(r));
  const isSwachhAdmin = isSuperAdmin || normalizedAllRoles.some(r => ['ADMIN', 'SWACHH_ADMIN', 'SWACHH', 'SWACHH_SYNC', 'SWACHH_RANKING', 'WARD_RANKING', 'SWACHH_ACCESS'].includes(r));
  const isQcUser = normalizedAllRoles.includes('QC');
  const isAccessorUser = normalizedAllRoles.includes('ACCESSOR');
  const isWorkforceAdmin = isSuperAdmin || normalizedAllRoles.some(r => ['ADMIN', 'WORKFORCE_ADMIN', 'WORKFORCE', 'MATRIX_TRACK', 'WORKFORCE_MONITORING', 'WORKFORCE_ACCESS'].includes(r));

  const hasTaskforceAccess = isSuperAdmin || normalizedAllRoles.some(r => ['TASKFORCE', 'TASKFORCE_20', 'TASKFORCE_ADMIN', 'CITY_ADMIN', 'HMS_ADMIN', 'SWEEPING', 'LITTERBINS', 'TOILET'].includes(r));
  const hasSwachhAccess = isSuperAdmin || isSwachhAdmin || isQcUser || isAccessorUser || normalizedAllRoles.some(r => ['SWACHH', 'SWACHH_ADMIN', 'SWACHH_SYNC', 'SWACHH_RANKING', 'WARD_RANKING', 'SWACHH_ACCESS'].includes(r));
  const hasWorkforceAccess = isSuperAdmin || isWorkforceAdmin || normalizedAllRoles.some(r => ['WORKFORCE', 'WORKFORCE_ADMIN', 'MATRIX_TRACK', 'WORKFORCE_MONITORING', 'WORKFORCE_ACCESS'].includes(r));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  let pageTitle = `${getGreeting()}, ${displayName}!`;
  if (pathname.includes('/onboard-city')) pageTitle = 'Create City';
  if (pathname.includes('/city-directory')) pageTitle = 'City Directory';
  if (pathname.includes('/common-registration')) pageTitle = 'Employee Registration';
  if (pathname.includes('/admin-management')) pageTitle = 'User & Admin Management';

  if (isTaskforceActive) {
    if (pathname.includes('/modules')) pageTitle = 'Taskforce - Modules';
    else if (pathname.includes('/zones')) pageTitle = 'Taskforce - Zones';
    else if (pathname.includes('/wards')) pageTitle = 'Taskforce - Wards';
    else if (pathname.includes('/areas')) pageTitle = 'Taskforce - Areas & Beats';
    else if (pathname.includes('/users')) pageTitle = 'Taskforce - Municipal Users';
    else pageTitle = 'Taskforce Workspace Dashboard';
  } else if (isSwachhActive) {
    if (currentView === 'approvals') pageTitle = 'Swachh Sync - Access Requests';
    else if (currentView === 'users') pageTitle = 'Swachh Sync - User Management';
    else if (currentView === 'participants') pageTitle = 'Swachh Sync - Participants';
    else if (currentView === 'access-control') pageTitle = 'Swachh Sync - Sidebar Access Control';
    else if (currentView === 'questionnaire') pageTitle = 'Swachh Sync - Questionnaire Manager';
    else if (currentView === 'sa-review') pageTitle = 'Swachh Sync - Self Assessment QC Review';
    else if (currentView === 'reports') pageTitle = 'Swachh Sync - Reports';
    else if (currentView === 'results') pageTitle = 'Swachh Sync - Results';
    else pageTitle = 'Swachh Ward Ranking Workspace';
  } else if (isWorkforceActive) {
    if (currentView === 'master') pageTitle = 'Workforce - Master Control';
    else if (currentView === 'geofencing') pageTitle = 'Workforce - GeoFencing Management';
    else if (currentView === 'employees') pageTitle = 'Workforce - Employee Master';
    else if (currentView === 'attendance') pageTitle = 'Workforce - Attendance Reports';
    else if (currentView === 'short-attendance') pageTitle = 'Workforce - Short Attendance Report';
    else if (currentView === 'supervisors') pageTitle = 'Workforce - Supervisors Management';
    else if (currentView === 'assignSupervisorWard' || currentView === 'assign-supervisor-ward') pageTitle = 'Workforce - Assign Supervisor Kothi';
    else if (currentView === 'supervisor-audit') pageTitle = 'Workforce - Attendance Audit';
    else if (currentView === 'supervisor-self-punch-requests') pageTitle = 'Workforce - Access Requests';
    else if (currentView === 'supervisor-professional-attendance') pageTitle = 'Workforce - Professional Attendance';
    else if (currentView === 'supervisor-professional-leave') pageTitle = 'Workforce - Professional Leave Management';
    else if (currentView === 'settings') pageTitle = 'Workforce - System Settings';
    else pageTitle = 'Workforce Monitoring Workspace';
  }

  const toiletHref = moduleEntryPath(user || null, 'TOILET');
  const sweepingHref = moduleEntryPath(user || null, 'SWEEPING');
  const litterbinsHref = moduleEntryPath(user || null, 'LITTERBINS');
  const taskforceHref = moduleEntryPath(user || null, 'TASKFORCE');

  const userModuleItems = [
    { name: 'Cleanliness of Toilet', href: toiletHref, icon: <Info size={15} />, isActive: pathname.startsWith('/modules/toilet'), visible: true },
    { name: 'Sweeping', href: sweepingHref, icon: <Activity size={15} />, isActive: pathname.startsWith('/modules/sweeping'), visible: true },
    { name: 'Litter Bins', href: litterbinsHref, icon: <Trash2 size={15} />, isActive: pathname.startsWith('/modules/litterbins'), visible: true },
    { name: 'CTU/GVP Transformation', href: taskforceHref, icon: <Lock size={15} />, isActive: pathname.startsWith('/modules/taskforce'), visible: true },
  ];

  const masterSubTabs = [
    ...(isSuperAdmin ? [{ name: 'Create City', href: '/portal-home/onboard-city', icon: <PlusCircle size={15} />, isActive: pathname.includes('/onboard-city') }] : []),
    { name: 'Zones', href: '/city/zones', icon: <Map size={15} />, isActive: pathname.startsWith('/city/zones') },
    { name: 'Wards', href: '/city/wards', icon: <MapPin size={15} />, isActive: pathname.startsWith('/city/wards') },
    { name: 'Areas & Beats', href: '/city/areas', icon: <Target size={15} />, isActive: pathname.startsWith('/city/areas') },
  ];

  const swachhGroups = [
    {
      group: 'Overview',
      items: [
        { name: 'Dashboard', href: '/ward-ranking?view=dashboard', icon: <LayoutDashboard size={15} />, isActive: isSwachhActive && (currentView === 'dashboard' || !searchParams.get('view')), visible: isSwachhAdmin || isQcUser || isAccessorUser },
      ]
    },
    {
      group: 'Management',
      items: [
        { name: 'Access Requests', href: '/ward-ranking?view=approvals', icon: <UserPlus size={15} />, isActive: isSwachhActive && currentView === 'approvals', visible: isSwachhAdmin },
        { name: 'Users', href: '/ward-ranking?view=users', icon: <Users size={15} />, isActive: isSwachhActive && currentView === 'users', visible: isSwachhAdmin },
        { name: 'Participants', href: '/ward-ranking?view=participants', icon: <Layers size={15} />, isActive: isSwachhActive && currentView === 'participants', visible: isSwachhAdmin },
      ]
    },
    {
      group: 'Configuration',
      items: [
        { name: 'Sidebar Access', href: '/ward-ranking?view=access-control', icon: <Lock size={15} />, isActive: isSwachhActive && currentView === 'access-control', visible: isSwachhAdmin },
        { name: 'Questionnaire', href: '/ward-ranking?view=questionnaire', icon: <ClipboardList size={15} />, isActive: isSwachhActive && currentView === 'questionnaire', visible: isSwachhAdmin },
      ]
    },
    {
      group: 'Assessment',
      items: [
        { name: 'SA Review', href: '/ward-ranking?view=sa-review', icon: <ClipboardCheck size={15} />, isActive: isSwachhActive && currentView === 'sa-review', visible: isSwachhAdmin || isQcUser },
        { name: 'Reports', href: '/ward-ranking?view=reports', icon: <FileText size={15} />, isActive: isSwachhActive && currentView === 'reports', visible: isSwachhAdmin || isQcUser },
        { name: 'Results', href: '/ward-ranking?view=results', icon: <Award size={15} />, isActive: isSwachhActive && currentView === 'results', visible: isSwachhAdmin },
      ]
    },
    {
      group: 'Accessor',
      items: [
        { name: 'Verify Assessment', href: '/ward-ranking?view=verify', icon: <ShieldCheck size={15} />, isActive: isSwachhActive && currentView === 'verify', visible: isAccessorUser },
      ]
    }
  ].map(g => ({ ...g, items: g.items.filter(i => i.visible) })).filter(g => g.items.length > 0);

  const checkWorkforcePerm = (mod: string) => {
    if (isWorkforceAdmin) return true;
    if (Array.isArray(userPermissions)) {
      return userPermissions.some((p: any) => p.module === mod || p === mod || (typeof p === 'object' && p?.module === mod));
    }
    return false;
  };

  const workforceGroups = [
    {
      group: 'Overview & Master',
      items: [
        { name: 'Dashboard', href: '/workforce-monitoring?view=dashboard', icon: <LayoutDashboard size={15} />, isActive: isWorkforceActive && (currentView === 'dashboard' || !searchParams.get('view')), visible: true },
        { name: 'Master', href: '/workforce-monitoring?view=master', icon: <Layers size={15} />, isActive: isWorkforceActive && currentView === 'master', visible: checkWorkforcePerm('master') },
        { name: 'GeoFencing', href: '/workforce-monitoring?view=geofencing', icon: <MapPin size={15} />, isActive: isWorkforceActive && currentView === 'geofencing', visible: checkWorkforcePerm('geofencing') },
      ]
    },
    {
      group: 'Staff & Supervisors',
      items: [
        { name: 'Supervisors Management', href: '/workforce-monitoring?view=supervisors', icon: <UserCheck size={15} />, isActive: isWorkforceActive && currentView === 'supervisors', visible: checkWorkforcePerm('supervisors') },
        { name: 'Assign Supervisor Kothi', href: '/workforce-monitoring?view=assignSupervisorWard', icon: <UserCheck size={15} />, isActive: isWorkforceActive && (currentView === 'assignSupervisorWard' || currentView === 'assign-supervisor-ward'), visible: checkWorkforcePerm('assign_supervisor_ward') || checkWorkforcePerm('assignSupervisorWard') },
        { name: 'Employee Master', href: '/workforce-monitoring?view=employees', icon: <Users size={15} />, isActive: isWorkforceActive && currentView === 'employees', visible: checkWorkforcePerm('employees') },
      ]
    },
    {
      group: 'Attendance & Reports',
      items: [
        { name: 'Attendance Reports', href: '/workforce-monitoring?view=attendance', icon: <CalendarRange size={15} />, isActive: isWorkforceActive && currentView === 'attendance', visible: checkWorkforcePerm('attendance_reports') || checkWorkforcePerm('attendance') },
        { name: 'Short Attendance', href: '/workforce-monitoring?view=short-attendance', icon: <FileSpreadsheet size={15} />, isActive: isWorkforceActive && currentView === 'short-attendance', visible: checkWorkforcePerm('short_attendance') || checkWorkforcePerm('short-attendance') },
        { name: 'Supervisor Audit', href: '/workforce-monitoring?view=supervisor-audit', icon: <UserCheck size={15} />, isActive: isWorkforceActive && currentView === 'supervisor-audit', visible: checkWorkforcePerm('supervisor-audit') },
        { name: 'Access Requests', href: '/workforce-monitoring?view=supervisor-self-punch-requests', icon: <UserCheck size={15} />, isActive: isWorkforceActive && currentView === 'supervisor-self-punch-requests', visible: checkWorkforcePerm('field-access-requests') || checkWorkforcePerm('supervisor-self-punch-requests') },
        { name: 'Professional Attendance', href: '/workforce-monitoring?view=supervisor-professional-attendance', icon: <CalendarRange size={15} />, isActive: isWorkforceActive && currentView === 'supervisor-professional-attendance', visible: checkWorkforcePerm('professional-attendance') },
        { name: 'Professional Leave', href: '/workforce-monitoring?view=supervisor-professional-leave', icon: <CalendarRange size={15} />, isActive: isWorkforceActive && currentView === 'supervisor-professional-leave', visible: checkWorkforcePerm('professional-leave-mgmt') || checkWorkforcePerm('supervisor-professional-leave') },
      ]
    },
    {
      group: 'Settings',
      items: [
        { name: 'Settings', href: '/workforce-monitoring?view=settings', icon: <Settings size={15} />, isActive: isWorkforceActive && currentView === 'settings', visible: checkWorkforcePerm('settings') },
      ]
    }
  ].map(g => ({ ...g, items: g.items.filter(i => i.visible) })).filter(g => g.items.length > 0);

  const canAccessRegistration = isSuperAdmin || isCityAdmin;
  const navItemsCount = 1 + (canAccessRegistration ? 1 : 0) + (isSuperAdmin ? 2 : 0);

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .pulse-dot { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
      {/* LEFT SIDEBAR */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-slate-200 flex flex-col justify-between p-5 h-screen overflow-y-auto scrollbar-hide z-30">
        <div className="flex flex-col gap-6">
          <Link
            href="/portal-home"
            className="flex items-center gap-3 px-1 py-1 cursor-pointer group transition-all"
            title="Return to Main Portal Entrance"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
              <Shield size={22} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                MatrixTrack 2.0
              </div>
            </div>
          </Link>

          <nav className="flex flex-col gap-2">
            {/* COLLAPSIBLE TOP NAVIGATION MENU */}
            <div className="flex flex-col">
              {navItemsCount > 1 ? (
                <button
                  type="button"
                  onClick={() => setPortalToolsOpen((prev) => !prev)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <span>Navigation Menu</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${portalToolsOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`}
                  />
                </button>
              ) : (
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Navigation Menu
                </div>
              )}

              {(portalToolsOpen || navItemsCount <= 1) && (
                <div className="flex flex-col gap-1 mt-1">
                  <Link
                    href="/portal-home"
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                      pathname === '/portal-home'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <LayoutDashboard size={16} className={pathname === '/portal-home' ? 'text-white' : 'text-slate-500'} />
                    <span>Home</span>
                  </Link>

                  {canAccessRegistration && (
                    <>
                      <Link
                        href="/portal-home/common-registration"
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                          pathname.includes('/common-registration')
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <UserCheck2 size={16} className={pathname.includes('/common-registration') ? 'text-white' : 'text-slate-500'} />
                        <span>Employee Registration</span>
                      </Link>

                      <Link
                        href="/portal-home/registered-users"
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                          pathname.includes('/registered-users')
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Users size={16} className={pathname.includes('/registered-users') ? 'text-white' : 'text-slate-500'} />
                        <span>Registered Users</span>
                      </Link>
                    </>
                  )}

                  {isSuperAdmin && (
                    <Link
                      href="/portal-home/city-directory"
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                        pathname.includes('/city-directory')
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Globe size={16} className={pathname.includes('/city-directory') ? 'text-white' : 'text-slate-500'} />
                      <span>City Directory</span>
                    </Link>
                  )}

                  {/* MASTER COLLAPSIBLE DROPDOWN IN NAVIGATION MENU */}
                  {isCityAdmin && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setMasterSubOpen((prev) => !prev)}
                        className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                          masterSubOpen
                            ? 'text-blue-600 font-extrabold bg-blue-50'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Map size={16} className={masterSubOpen ? 'text-blue-600' : 'text-slate-500'} />
                          <span>Master Control</span>
                        </div>
                        <ChevronDown
                          size={15}
                          className={`transition-transform duration-200 ${masterSubOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`}
                        />
                      </button>

                      {masterSubOpen && (
                        <div className="ml-4 mt-1 pl-3 border-l-2 border-blue-200 flex flex-col gap-1">
                          {masterSubTabs.map((sub) => (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                                sub.isActive
                                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <span className={sub.isActive ? 'text-white' : 'text-slate-400'}>{sub.icon}</span>
                              <span>{sub.name}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* WORKSPACES / SYSTEMS */}
            {(hasTaskforceAccess || hasSwachhAccess || hasWorkforceAccess) && (
              <div className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4 mb-1">
                Active Systems
              </div>
            )}
            
            {/* INSPECTION & PERFORMANCE SYSTEM */}
            {hasTaskforceAccess && (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setTaskforceOpen((prev) => !prev)}
                  className={`flex items-center justify-between w-full px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    isTaskforceActive
                      ? 'bg-blue-50 text-blue-700 font-extrabold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className={isTaskforceActive ? 'text-blue-600' : 'text-slate-500'} />
                    <span>Inspection & Performance System</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${taskforceOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`}
                  />
                </button>

                {taskforceOpen && (
                  <div className="ml-4 mt-1 pl-3 border-l-2 border-blue-200 flex flex-col gap-1.5">
                    {/* Dashboard */}
                    <Link
                      href="/city"
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        pathname === '/city'
                          ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <LayoutDashboard size={15} className={pathname === '/city' ? 'text-white' : 'text-slate-400'} />
                      <span>Dashboard</span>
                    </Link>

                    {/* Modules Collapsible Dropdown */}
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setModulesSubOpen((prev) => !prev)}
                        className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                          pathname.startsWith('/modules') || pathname === '/city/modules'
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Package size={15} className={pathname.startsWith('/modules') || pathname === '/city/modules' ? 'text-blue-600' : 'text-slate-400'} />
                          <span>Modules</span>
                        </div>
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${modulesSubOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`}
                        />
                      </button>

                      {modulesSubOpen && (
                        <div className="ml-3 mt-1 pl-2.5 border-l border-blue-200 flex flex-col gap-1">
                          {userModuleItems.map((sub) => (
                            <Link
                              key={sub.name}
                              href={sub.href}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${
                                sub.isActive
                                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <span className={sub.isActive ? 'text-white' : 'text-slate-400'}>{sub.icon}</span>
                              <span>{sub.name}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WARD RANKING SYSTEM */}
            {hasSwachhAccess && (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setSwachhOpen((prev) => !prev)}
                  className={`flex items-center justify-between w-full px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    isSwachhActive
                      ? 'bg-purple-50 text-purple-700 font-extrabold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 size={18} className={isSwachhActive ? 'text-purple-600' : 'text-slate-500'} />
                    <span>Ward Ranking System</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${swachhOpen ? 'rotate-180 text-purple-600' : 'text-slate-400'}`}
                  />
                </button>

                {swachhOpen && (
                  <div className="ml-4 mt-1 pl-3 border-l-2 border-purple-200 flex flex-col gap-2">
                    {swachhGroups.map((grp) => (
                      <div key={grp.group} className="flex flex-col gap-1">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1 px-1">
                          {grp.group}
                        </div>
                        {grp.items.map((sub) => (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                              sub.isActive
                                ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-500/20'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <span className={sub.isActive ? 'text-white' : 'text-slate-400'}>{sub.icon}</span>
                            <span>{sub.name}</span>
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WORKFORCE ATTENDANCE SYSTEM */}
            {hasWorkforceAccess && (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setWorkforceOpen((prev) => !prev)}
                  className={`flex items-center justify-between w-full px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    isWorkforceActive
                      ? 'bg-cyan-50 text-cyan-700 font-extrabold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users size={18} className={isWorkforceActive ? 'text-cyan-600' : 'text-slate-500'} />
                    <span>Workforce Attendance System</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${workforceOpen ? 'rotate-180 text-cyan-600' : 'text-slate-400'}`}
                  />
                </button>

                {workforceOpen && (
                  <div className="ml-4 mt-1 pl-3 border-l-2 border-cyan-200 flex flex-col gap-2">
                    {workforceGroups.map((grp) => (
                      <div key={grp.group} className="flex flex-col gap-1">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1 px-1">
                          {grp.group}
                        </div>
                        {grp.items.map((sub) => (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                              sub.isActive
                                ? 'bg-cyan-600 text-white font-bold shadow-sm shadow-cyan-500/20'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <span className={sub.isActive ? 'text-white' : 'text-slate-400'}>{sub.icon}</span>
                            <span>{sub.name}</span>
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 mt-6">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-rose-50 border border-rose-200 text-rose-600 font-extrabold text-sm rounded-xl hover:bg-rose-100 transition-all shadow-sm"
            title="Sign out of portal"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="portal-main-content flex-1 ml-72 p-5 sm:p-6 min-w-0 min-h-screen text-slate-800">
        <div className="mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:px-6 sm:py-4 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-1.5 mb-0.5">
              <ShieldCheck size={14} className="text-blue-600" /> MATRIXTRACK 2.0 
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {pageTitle}
            </h1>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end gap-1 px-1 mr-2">
                <span className="inline-flex items-center gap-2 text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 w-fit shadow-sm">
                  <span className="pulse-dot w-2 h-2 rounded-full bg-emerald-500"></span> LIVE API FEED
                </span>
                <span className="text-[10px] font-extrabold text-slate-500">{clockStr}</span>
              </div>

              <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200 shadow-sm px-4 py-2.5 rounded-2xl shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white font-black text-base flex items-center justify-center shadow-md shadow-blue-600/25 shrink-0">
                  {userInitial}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black text-slate-900 truncate leading-snug">{displayName}</span>
                  {roleLabelText !== displayName && (
                    <span className="text-[11px] font-medium text-slate-500 truncate leading-snug">{roleLabelText}</span>
                  )}
                  {cityName && (
                    <span className="text-[11px] font-medium text-blue-600 truncate leading-snug">{cityName}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {children}
      </main>
    </div>
  );
}

export default function PortalHomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen bg-slate-50 items-center justify-center">
        <div className="text-sm font-bold text-slate-500">Loading Portal...</div>
      </div>
    }>
      <PortalHomeLayoutContent>{children}</PortalHomeLayoutContent>
    </Suspense>
  );
}
