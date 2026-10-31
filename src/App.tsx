/**
 * MatrixTrack 2.0 - Core Municipal Command Center Web Application
 *
 * Features:
 * - Four role-based workspaces: HMS_SUPER_ADMIN, CITY_ADMIN, ULB_OFFICER, COMMISSIONER
 * - Authenticated sessions and live MatrixTrack backend data
 * - Operational Map, Report Drawer with Q&A, Evidence Lightbox, Timeline, and Action Escalations
 * - Multi-cycle IEC Cleanliness with 24-hr SLA deadline and citizen reopening approvals
 * - Working CSV Parser/Generator with formula injection protection
 * - 100-point Ward Ranking engine
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  RoleType,
  User,
  City,
  OperationalReport,
  IecCleanlinessIssue,
  OperationalModuleId
} from './types';
import { matrixStore } from './services/store';
import { api,getToken } from './services/api';
import {preloadCityAdminPage} from './services/cityAdminPagePreload';
import {preloadUlbPage} from './services/ulbPagePreload';
const LivePlantWorkspace=lazy(()=>import('./pages/products/LiveProducts').then(m=>({default:m.LivePlantWorkspace})));
const LiveWorkforce=lazy(()=>import('./pages/products/LiveProducts').then(m=>({default:m.LiveWorkforce})));
const CommissionerCleanliness=lazy(()=>import('./pages/products/LiveProducts').then(m=>({default:m.CommissionerCleanliness})));

// Layout & Common Components
import { Header } from './components/layout/Header';
import { LoginPage } from './components/layout/LoginPage';
import { DataLoadingBar, PageLoadingSkeleton } from './components/layout/DataLoadingBar';
import { pageDatasets } from './services/workspace';
const RoleDashboard=lazy(()=>import('./pages/RoleDashboard').then(m=>({default:m.RoleDashboard})));
const CityComparison=lazy(()=>import('./pages/RoleDashboard').then(m=>({default:m.CityComparison})));
const CommissionerWorkspace=lazy(()=>import('./pages/commissioner/CommissionerWorkspace').then(m=>({default:m.CommissionerWorkspace})));
const CommissionerHome=lazy(()=>import('./pages/commissioner/CommissionerHome').then(m=>({default:m.CommissionerHome})));
const UlbDashboard=lazy(()=>import('./pages/ulbofficer/UlbDashboard').then(m=>({default:m.UlbDashboard})));
const UlbWorkspace=lazy(()=>import('./pages/ulbofficer/UlbWorkspace').then(m=>({default:m.UlbWorkspace})));
import { CommissionerToolbar } from './components/layout/CommissionerToolbar';
const PlantProcessing=lazy(()=>import('./pages/commissioner/PlantProcessing').then(m=>({default:m.PlantProcessing})));
const UserPerformance=lazy(()=>import('./pages/commissioner/UserPerformance').then(m=>({default:m.UserPerformance})));
const ReportsExports=lazy(()=>import('./pages/commissioner/ReportsExports').then(m=>({default:m.ReportsExports})));
const CleanlinessOversight=lazy(()=>import('./pages/commissioner/CleanlinessOversight').then(m=>({default:m.CleanlinessOversight})));
import { printElement } from './services/print';
const ModuleDirectory=lazy(()=>import('./pages/OperationalSupportPages').then(m=>({default:m.ModuleDirectory})));
const StaffActivity=lazy(()=>import('./pages/OperationalSupportPages').then(m=>({default:m.StaffActivity})));
const TargetsWorkspace=lazy(()=>import('./pages/OperationalSupportPages').then(m=>({default:m.TargetsWorkspace})));
const ExecutiveBrief=lazy(()=>import('./pages/OperationalSupportPages').then(m=>({default:m.ExecutiveBrief})));
import { Sidebar, canAccessPage } from './components/layout/Sidebar';
const ReportDetailDrawer=lazy(()=>import('./components/reports/ReportDetailDrawer').then(m=>({default:m.ReportDetailDrawer})));
const IecIssueDrawer=lazy(()=>import('./components/reports/IecIssueDrawer').then(m=>({default:m.IecIssueDrawer})));
const CsvImportModal=lazy(()=>import('./components/import/CsvImportModal').then(m=>({default:m.CsvImportModal})));
const OperationalMap=lazy(()=>import('./components/map/OperationalMap').then(m=>({default:m.OperationalMap})));

// Super Admin Pages
const GlobalDashboard=lazy(()=>import('./pages/superadmin/GlobalDashboard').then(m=>({default:m.GlobalDashboard})));
const CityDirectory=lazy(()=>import('./pages/superadmin/CityDirectory').then(m=>({default:m.CityDirectory})));
const CityModuleAccess=lazy(()=>import('./pages/superadmin/CityModuleAccess').then(m=>({default:m.CityModuleAccess})));
const PersonnelDirectory=lazy(()=>import('./pages/cityadmin/PersonnelDirectory').then(m=>({default:m.PersonnelDirectory})));
const PlatformDashboard=lazy(()=>import('./pages/superadmin/PlatformDashboard').then(m=>({default:m.PlatformDashboard})));
const CityAdministrators=lazy(()=>import('./pages/superadmin/CityAdministrators').then(m=>({default:m.CityAdministrators})));
const ActivityLogs=lazy(()=>import('./pages/superadmin/ActivityLogs').then(m=>({default:m.ActivityLogs})));
const CityProgress=lazy(()=>import('./pages/superadmin/CityProgress').then(m=>({default:m.CityProgress})));
const RegisteredUsers=lazy(()=>import('./pages/superadmin/RegisteredUsers').then(m=>({default:m.RegisteredUsers})));
const RegistrationRequests=lazy(()=>import('./pages/superadmin/RegistrationRequests').then(m=>({default:m.RegistrationRequests})));
const AccessMatrix=lazy(()=>import('./pages/superadmin/AccessMatrix').then(m=>({default:m.AccessMatrix})));
const AuditLogsPage=lazy(()=>import('./pages/superadmin/AuditLogsPage').then(m=>({default:m.AuditLogsPage})));
const ActiveSessionsPage=lazy(()=>import('./pages/superadmin/ActiveSessionsPage').then(m=>({default:m.ActiveSessionsPage})));
const TrashRestorePage=lazy(()=>import('./pages/superadmin/TrashRestorePage').then(m=>({default:m.TrashRestorePage})));

// City Admin Pages
const CityDashboard=lazy(()=>import('./pages/cityadmin/CityDashboard').then(m=>({default:m.CityDashboard})));
const ZonesWards=lazy(()=>import('./pages/cityadmin/ZonesWards').then(m=>({default:m.ZonesWards})));
const AreasBeats=lazy(()=>import('./pages/cityadmin/AreasBeats').then(m=>({default:m.AreasBeats})));
const CommissionerAttendance=lazy(()=>import('./pages/commissioner/CommissionerAttendance').then(m=>({default:m.CommissionerAttendance})));
const WardRankingPage=lazy(()=>import('./pages/cityadmin/WardRankingPage').then(m=>({default:m.WardRankingPage})));
const ChatHistory=lazy(()=>import('./pages/commissioner/ChatHistory').then(m=>({default:m.ChatHistory})));
const NagarInsight=lazy(()=>import('./components/commissioner/NagarInsight').then(m=>({default:m.NagarInsight})));

// ULB Officer Pages
const OperationsDashboard=lazy(()=>import('./pages/ulbofficer/OperationsDashboard').then(m=>({default:m.OperationsDashboard})));
const ReportQueuesPage=lazy(()=>import('./pages/ulbofficer/ReportQueuesPage').then(m=>({default:m.ReportQueuesPage})));
const IecCleanlinessIssuesPage=lazy(()=>import('./pages/ulbofficer/IecCleanlinessIssuesPage').then(m=>({default:m.IecCleanlinessIssuesPage})));

// Commissioner Pages
const ExecutiveDashboard=lazy(()=>import('./pages/commissioner/ExecutiveDashboard').then(m=>({default:m.ExecutiveDashboard})));
const ZoneWardDetails=lazy(()=>import('./pages/commissioner/ZoneWardDetails').then(m=>({default:m.ZoneWardDetails})));
const ExecutiveSummaryReport=lazy(()=>import('./pages/commissioner/ExecutiveSummaryReport').then(m=>({default:m.ExecutiveSummaryReport})));

// Shared Module Workspaces & Connected Products
const ModuleWorkspace=lazy(()=>import('./pages/modules/ModuleWorkspace').then(m=>({default:m.ModuleWorkspace})));

export default function App() {
  const [, update] = useState(0);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [restoring, setRestoring] = useState(Boolean(getToken()));
  useEffect(() => {
    const unsubscribe = matrixStore.subscribe(() => update(r => r + 1));
    const expired = () => { matrixStore.logout(); setLoginError('Session expired. Please sign in again.'); };
    window.addEventListener('matrixtrack:session-expired', expired);
    if (getToken()) matrixStore.initialize().catch(error => setLoginError(error.message)).finally(() => setRestoring(false));
    return () => { unsubscribe(); window.removeEventListener('matrixtrack:session-expired', expired); };
  }, []);
  useEffect(()=>{if(matrixStore.currentUser?.role==='ULB_OFFICER')preloadUlbPage('ulb_dashboard');else if(matrixStore.currentUser?.role==='CITY_ADMIN')preloadCityAdminPage('ca_dashboard');},[matrixStore.currentUser?.role]);
  const login = async (event: React.FormEvent) => {
    event.preventDefault(); if (submitting) return; setSubmitting(true); setLoginError('');
    try { await matrixStore.login(identifier.trim(), password); setPassword(''); }
    catch (error) { setLoginError(error instanceof Error ? error.message : 'Sign in failed.'); }
    finally { setSubmitting(false); }
  };
  if (restoring) return <div className="min-h-screen grid place-items-center bg-slate-50">Restoring your MatrixTrack session…</div>;
  if (!matrixStore.currentUser) return (
    <LoginPage identifier={identifier} password={password} submitting={submitting} error={loginError}
      onIdentifierChange={value => { setIdentifier(value); setLoginError(''); }}
      onPasswordChange={value => { setPassword(value); setLoginError(''); }} onSubmit={login} />
  );
  if (matrixStore.loading && !matrixStore.getData().lastUpdated) return <div className="min-h-screen grid place-items-center">Loading municipal data…</div>;
  if (!matrixStore.getCities().length || matrixStore.error) return (
    <main className="p-8 space-y-4"><h1 className="text-xl font-bold">MatrixTrack Command Center</h1><p role="alert">{matrixStore.error || 'No cities are available to this account.'}</p><button className="mr-4 underline" onClick={() => matrixStore.refresh()}>Retry</button><button className="underline" onClick={() => matrixStore.logout()}>Sign out</button></main>
  );
  return <Dashboard key={matrixStore.currentUser.id} />;
}

export function Dashboard({ initialPage }: { initialPage?: string } = {}) {
  // Store synchronization
  const [, setStoreRevision] = useState(0);

  useEffect(() => {
    return matrixStore.subscribe(() => {
      setStoreRevision(r => r + 1);
    });
  }, []);

  const storeData = matrixStore.getData();
  const cities = matrixStore.getCities();
  const users = matrixStore.getUsers();
  const zones = matrixStore.getZones();
  const wards = matrixStore.getWards();
  const beats = matrixStore.getBeats();
  const reports = matrixStore.getReports();
  const iecIssues = matrixStore.getIecIssues();
  const attendance = matrixStore.getAttendance();
  const plantLogs = matrixStore.getPlantLogs();
  const auditLogs = matrixStore.getAuditLogs();
  const activeSessions = matrixStore.getActiveSessions();

  // Role & Context state
  const [currentRole, setCurrentRole] = useState<RoleType>(matrixStore.currentUser!.role as RoleType);
  useEffect(()=>{
    if(currentRole==='ULB_OFFICER'&&window.location.pathname==='/municipal/commissioner'){
      window.history.replaceState(null,'',`/municipal/ulb${window.location.search}`);
    }
  },[currentRole]);
  const [platformPending,setPlatformPending]=useState<number|undefined>(undefined);
  useEffect(()=>{if(currentRole!=='HMS_SUPER_ADMIN'){setPlatformPending(undefined);return;}const c=new AbortController();api('/city/super-admin-overview',{signal:c.signal}).then(d=>{if(!c.signal.aborted&&Array.isArray(d.requests))setPlatformPending(new Set(d.requests.filter((r:any)=>r.status==='PENDING').map((r:any)=>r.id)).size);}).catch(()=>{});return()=>c.abort();},[currentRole,matrixStore.loadRevision]);
  const [currentCityId, setCurrentCityId] = useState<string>(matrixStore.selectedCityId);
  const [activePageId, setActivePageId] = useState<string>(initialPage || ({ HMS_SUPER_ADMIN: 'sa_dashboard', CITY_ADMIN: 'ca_dashboard', ULB_OFFICER: 'ulb_dashboard', COMMISSIONER: 'comm_dashboard' })[matrixStore.currentUser!.role] || 'ca_dashboard');
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [noticeRequest,setNoticeRequest]=useState(0),[noticeCount,setNoticeCount]=useState(0);
  const [reportIntent,setReportIntent]=useState({moduleId:'all',status:'all'});
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activePageId,currentCityId]);

  const needsCitySelection=currentRole==='HMS_SUPER_ADMIN'&&currentCityId==='all'&&/^(ca_|prod_|mod_)/.test(activePageId);
  useEffect(() => {
    if (!needsCitySelection&&canAccessPage(matrixStore.currentUser!.role as RoleType, activePageId, matrixStore.getCityById(matrixStore.selectedCityId))) void matrixStore.ensurePage(activePageId);
  }, [activePageId, matrixStore.loadRevision,needsCitySelection]);
  // These pages own their loading/error states and can start their API reads
  // while the shared geography/personnel directories are still loading.
  const independentUlbPage=currentRole==='ULB_OFFICER'&&['ulb_dashboard','ulb_map','ulb_attendance','ulb_user_perf','ulb_ward_ranking','prod_plant'].includes(activePageId);
  const independentCityAdminPage=currentRole==='CITY_ADMIN'&&['ca_dashboard','ca_map','ca_targets','ca_attendance','ca_user_perf','ca_ward_ranking','ca_iec_oversight','prod_plant'].includes(activePageId);
  const independentSuperPage=currentRole==='HMS_SUPER_ADMIN'&&['sa_dashboard','sa_users','sa_city_admins','sa_audit_logs','ca_dashboard'].includes(activePageId);
  const pageLoading = !independentSuperPage&&!independentUlbPage&&!independentCityAdminPage&&pageDatasets(activePageId,currentRole).some(key => {
    const state = matrixStore.getCollection(key);
    return state.status === 'idle' || state.status === 'loading' && state.loaded === 0;
  });

  const currentUser = matrixStore.currentUser!;

  // Drawers and Modals state
  const [inspectedReportId, setInspectedReportId] = useState<string | null>(null);
  const [inspectedIecIssue, setInspectedIecIssue] = useState<IecCleanlinessIssue | null>(null);
  const [csvImportModal, setCsvImportModal] = useState<{
    isOpen: boolean;
    type: 'attendance' | 'beats' | 'plantLogs';
    title: string;
  }>({
    isOpen: false,
    type: 'attendance',
    title: 'Upload Daily Attendance Roster'
  });

  // Effective city for views that require a single city
  const effectiveCity = cities.find(c => c.id === currentCityId) || cities[0];

  // Role switching effect: resets landing page and city scope appropriately
  const handleRoleChange = (newRole: RoleType) => {
    if (!matrixStore.getAvailableRoles().includes(newRole)) return;
    setCurrentRole(newRole);
    if (newRole === 'HMS_SUPER_ADMIN') {
      setCurrentCityId('all');
      setActivePageId('sa_dashboard');
    } else if (newRole === 'CITY_ADMIN') {
      const targetCity = currentCityId === 'all' ? cities[0]?.id || 'city_indore' : currentCityId;
      setCurrentCityId(targetCity);
      setActivePageId('ca_dashboard');
    } else if (newRole === 'ULB_OFFICER') {
      const targetCity = currentCityId === 'all' ? cities[0]?.id || 'city_indore' : currentCityId;
      setCurrentCityId(targetCity);
      setActivePageId('ulb_dashboard');
    } else if (newRole === 'COMMISSIONER') {
      const targetCity = currentCityId === 'all' ? cities[0]?.id || 'city_indore' : currentCityId;
      setCurrentCityId(targetCity);
      setActivePageId('comm_dashboard');
    }
  };

  const handleCityChange = (newCityId: string) => {
    if (currentUser.role !== 'HMS_SUPER_ADMIN') return;
    setCurrentCityId(newCityId);
    void matrixStore.selectCity(newCityId);
  };

  const handleOpenCityOverviewFromSuperAdmin = (cityId: string) => {
    if (currentUser.role !== 'HMS_SUPER_ADMIN') return;
    setCurrentCityId(cityId);
    void matrixStore.selectCity(cityId);
    setActivePageId('ca_dashboard');
  };

  // Human page title
  const getPageTitle = (): string => {
    const titles: Record<string, string> = {
      sa_dashboard: 'Statewide Global Command',
      sa_cross_city: 'Cross-City Overview',
      sa_cities_dir: 'Municipal Corporation Directory',
      sa_city_admins: 'City Administrator Directory',
      sa_module_matrix: 'Product & Module Provisioning',
      sa_users: 'Registered Personnel & Staff',
      sa_reg_requests: 'Registration Approval Queue',
      sa_access_matrix: 'Role & Capability Matrix',
      sa_audit_logs: 'Governance Audit Ledger',
      sa_sessions: 'Active Session Telemetry',
      sa_trash_restore: 'Governance Trash & Safe Restore',

      ca_dashboard: 'City Administration',
      ca_logs: 'Activity logs',
      ca_map: 'City Operations Map',
      ca_daily_reports: 'Inspection Reports',
      ca_attention: 'Attention & Actionable Gaps',
      ca_zones_wards: 'Zones & Wards',
      ca_beats: 'Sweeping Beats Registry',
      ca_geo_hierarchy: 'Geography Hierarchy Tree',
      ca_module_dir: 'Operational Module Directory',
      ca_municipal_users: 'Municipal Users & Officers',
      ca_employees: 'Field Sanitation Staff',
      ca_assignments: 'Staff & Supervisor Assignments',
      ca_targets: 'Operational Targets & Quotas',
      ca_registration_mgmt: 'Staff Registration Management',
      ca_attendance: 'Attendance',
      ca_inspections: 'Inspection Reports',
      ca_ward_ranking: 'Ward Ranking',
      ca_user_perf: 'User Performance',
      ca_inspection_perf: 'Inspection Performance',
      ca_iec_oversight: 'IEC Cleanliness Oversight',
      ca_exec_summary: 'Reports & Exports',

      ulb_dashboard: 'Operations Dashboard',ulb_reports:'Inspection Reports',
      ulb_map: 'City Operations Map',
      ulb_pending:'Pending SI Review',ulb_approved: 'Approved Inspection Reports',
      ulb_rejected: 'Rejected Inspection Reports',
      ulb_action_req: 'Action Required Escalations',
      ulb_action_taken: 'Action Taken Verification',
      ulb_iec_issues: 'IEC Cleanliness Grievance Adjudication',
      ulb_attendance: 'Attendance',
      ulb_inspection_perf: 'Inspection Performance',ulb_user_perf:'User Performance',
      ulb_ward_ranking: 'Ward Ranking',

      comm_dashboard: 'City Overview',
      comm_map: 'City Operations Map',
      comm_chat_history: 'Chat history',
      comm_zone_ward: 'Zone Details',
      comm_iec_oversight: 'IEC Cleanliness Oversight',
      comm_ward_ranking: 'Ward Ranking',
      comm_attendance: 'Attendance',
      comm_plant: 'Plant & Processing',
      comm_user_perf: 'User Performance',
      comm_inspection_perf: 'Inspection Performance',
      comm_exec_summary: 'Reports & Exports',

      mod_sweeping: 'Sweeping Beats Master',
      mod_toilets: 'Cleanliness of Toilet',
      mod_litter_bins: 'Litter Bins Infrastructure',
      mod_nala: 'Nala',
      mod_ctu_gvp: 'CTU/GVP Transformation',

      prod_swachh: 'Swachh Participant Assessment',
      prod_workforce: 'Workforce Monitoring Engine',
      prod_plant: 'Plant & Processing'
    };
    return titles[activePageId] || 'Command Center';
  };

  const overviewRole: RoleType = activePageId === 'ca_dashboard' ? 'CITY_ADMIN' : currentRole;
  const navigate = (pageId: string) => {
    if(currentRole==='ULB_OFFICER'){pageId=({comm_dashboard:'ulb_dashboard',comm_map:'ulb_map',comm_zone_ward:'ulb_dashboard',comm_attendance:'ulb_attendance',comm_plant:'prod_plant',comm_user_perf:'ulb_user_perf',comm_ward_ranking:'ulb_ward_ranking',comm_inspection_perf:'ulb_inspection_perf',comm_iec_oversight:'ulb_iec_issues'} as Record<string,string>)[pageId]||pageId;}
    if (currentRole === 'CITY_ADMIN' || activePageId.startsWith('ca_')) {
      pageId = ({ comm_dashboard: 'ca_dashboard', comm_map: 'ca_map', comm_zone_ward: 'ca_zones_wards', comm_attendance: 'ca_attendance', comm_plant: 'prod_plant', comm_user_perf: 'ca_user_perf', comm_ward_ranking: 'ca_ward_ranking', comm_inspection_perf: 'ca_inspection_perf', comm_iec_oversight: 'ca_iec_oversight', comm_exec_summary: 'ca_exec_summary' } as Record<string, string>)[pageId] || pageId;
    }
    if (canAccessPage(currentUser.role as RoleType, pageId, effectiveCity)) setActivePageId(pageId);
  };

  // Determine if current user has attendance upload capability

  return (
    <div className={`workspace-app ${['COMMISSIONER','ULB_OFFICER','CITY_ADMIN'].includes(currentRole) ? 'commissioner-shell' : ''} bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-indigo-500 selection:text-white`}>
      {/* Top Header */}
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        currentUser={currentUser}
        currentCityId={currentCityId}
        onCityChange={handleCityChange}
        cities={cities}
        onToggleSidebarMobile={() => setIsSidebarMobileOpen(prev => !prev)}
        activePageTitle={getPageTitle()}
        availableRoles={matrixStore.getAvailableRoles()}
        onLogout={() => matrixStore.logout()}
        loading={matrixStore.loading}
        noticeCount={currentRole==='CITY_ADMIN'?users.filter(u=>u.status==='pending_approval').length:noticeCount}
        onNotices={['COMMISSIONER','ULB_OFFICER','CITY_ADMIN'].includes(currentRole)?()=>{setActivePageId(currentRole==='COMMISSIONER'?'comm_dashboard':currentRole==='CITY_ADMIN'?'ca_registration_mgmt':'ulb_dashboard');if(currentRole!=='CITY_ADMIN')setNoticeRequest(n=>n+1);}:undefined}
      />

      {matrixStore.error && <div role="alert" className="bg-red-50 text-red-800 px-6 py-3 text-sm">{matrixStore.error}</div>}
      {matrixStore.warnings.length > 0 && <details className="bg-amber-50 text-amber-900 px-6 py-3 text-xs"><summary className="cursor-pointer font-semibold">Some data is unavailable ({matrixStore.warnings.length}). Dashboard totals may be incomplete.</summary><ul className="mt-2 list-disc pl-5">{matrixStore.warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
      {matrixStore.loading && <div role="status" className="bg-indigo-50 text-indigo-800 px-6 py-2 text-xs">Updating your workspace…</div>}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          city={effectiveCity}
          currentRole={currentRole}
          activePageId={activePageId}
          onNavigate={navigate}
          isOpenMobile={isSidebarMobileOpen}
          onCloseMobile={() => setIsSidebarMobileOpen(false)}
          pendingRequestCount={currentRole==='HMS_SUPER_ADMIN'?platformPending:users.filter(u => u.status === 'pending_approval').length}
          openIssuesCount={iecIssues.filter(i => i.status !== 'approved_closed').length}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
          {['COMMISSIONER','ULB_OFFICER','CITY_ADMIN'].includes(currentRole) && <CommissionerToolbar pageId={activePageId} title={getPageTitle()} cityName={effectiveCity.name}/>}
          {!['COMMISSIONER','ULB_OFFICER','CITY_ADMIN'].includes(currentRole)&&!['sa_dashboard','sa_users','sa_city_admins','sa_audit_logs','ca_dashboard'].includes(activePageId)&&activePageId!=='ca_attendance' && <DataLoadingBar pageId={activePageId} />}
          <div className="commissioner-page-content"><Suspense fallback={<PageLoadingSkeleton/>}>
          {needsCitySelection ? <section className="workspace-panel p-8"><h1>Choose a city</h1><p>Select an authorized city above to view its operational progress.</p><button className="workspace-secondary-button mt-4" onClick={()=>navigate('sa_cities_dir')}>Open city directory</button></section> : !canAccessPage(currentUser.role as RoleType, activePageId, effectiveCity) ? <section className="workspace-panel p-8"><h1 className="text-lg font-semibold">This page is not available to your account</h1><p className="text-sm text-slate-500 mt-2">Choose an enabled page from your navigation.</p></section> : pageLoading ? <PageLoadingSkeleton /> : <>
          {/* ================= SUPER ADMIN PAGES ================= */}
          {activePageId==='sa_dashboard'&&<PlatformDashboard cities={cities} users={users} onNavigate={navigate} onSelectCity={handleOpenCityOverviewFromSuperAdmin}/>}
          {activePageId==='sa_city_admins'&&<CityAdministrators cities={cities} users={users}/>}

          {activePageId === 'sa_cities_dir' && (
            <CityDirectory
              cities={cities}
              currentUser={currentUser}
              onSelectCityContext={handleOpenCityOverviewFromSuperAdmin}
              onRefresh={() => setStoreRevision(r => r + 1)}
            />
          )}

          {activePageId === 'sa_cross_city' && <CityComparison cities={cities} onSelectCity={handleOpenCityOverviewFromSuperAdmin} />}

          {activePageId === 'sa_module_matrix' && (
            <CityModuleAccess
              cities={cities}
              currentUser={currentUser}
              onRefresh={() => setStoreRevision(r => r + 1)}
            />
          )}

          {activePageId === 'sa_users' && (
            <RegisteredUsers
              users={users}
              cities={cities}
            />
          )}

          {(activePageId === 'sa_reg_requests' || activePageId === 'ca_registration_mgmt') && (
            <RegistrationRequests
              users={users}
              cities={cities}
              currentUser={currentUser}
              onRefresh={() => setStoreRevision(r => r + 1)}
            />
          )}

          {activePageId === 'sa_access_matrix' && (
            <AccessMatrix />
          )}

          {['sa_audit_logs','ca_logs'].includes(activePageId)&&<ActivityLogs cities={cities}/>}

          {activePageId === 'sa_sessions' && (
            <ActiveSessionsPage
              sessions={activeSessions}
              currentUser={currentUser}
              onRefresh={() => setStoreRevision(r => r + 1)}
            />
          )}

          {activePageId === 'sa_trash_restore' && (
            <TrashRestorePage
              currentUser={currentUser}
              onRefresh={() => setStoreRevision(r => r + 1)}
            />
          )}

          {activePageId === 'ca_module_dir' && <ModuleDirectory city={effectiveCity} />}
          {activePageId === 'ca_targets' && <TargetsWorkspace city={effectiveCity} wards={wards.filter(w => w.cityId === effectiveCity.id)} />}
          {/* ================= CITY ADMIN PAGES ================= */}


          {(activePageId === 'ca_map' || activePageId === 'ulb_map' || activePageId === 'comm_map') && (
            <OperationalMap
              key={effectiveCity.id}
              reports={reports.filter(r => r.cityId === effectiveCity.id)}
              onSelectReport={(rId) => setInspectedReportId(rId)}
              selectedCityName={effectiveCity.name}
              cityId={effectiveCity.id}
              currentUser={currentUser}
            />
          )}

          {(activePageId === 'ca_zones_wards' || activePageId === 'ca_geo_hierarchy') && (
            <ZonesWards
              city={effectiveCity}
              zones={zones}
              wards={wards}
              users={users}
              currentUser={currentUser}
              onRefresh={() => setStoreRevision(r => r + 1)}
            />
          )}

          {(activePageId === 'ca_beats' || activePageId === 'ca_assignments') && (
            <AreasBeats
              city={effectiveCity}
              beats={beats}
              zones={zones}
              wards={wards}
              users={users}
              currentUser={currentUser}
              onOpenImport={() => setCsvImportModal({
                isOpen: true,
                type: 'beats',
                title: `Bulk Import Sweeping Beats - ${effectiveCity.name}`
              })}
              onRefresh={() => setStoreRevision(r => r + 1)}
            />
          )}

          {['comm_attendance','ulb_attendance','ca_attendance'].includes(activePageId) && <CommissionerAttendance city={effectiveCity} zones={zones} wards={wards} onUpload={()=>setCsvImportModal({isOpen:true,type:'attendance',title:`Upload Attendance · ${effectiveCity.name}`})}/>}
          {(activePageId === 'ca_ward_ranking' || activePageId === 'ulb_ward_ranking' || activePageId === 'comm_ward_ranking') && (
            <WardRankingPage
              city={effectiveCity}
              wards={wards}
              beats={beats}
              attendance={attendance}
              reports={reports}
              iecIssues={iecIssues}
            />
          )}

          {(activePageId === 'ca_municipal_users' || activePageId === 'ca_employees') && <PersonnelDirectory key={activePageId} city={effectiveCity} users={users.filter(u=>u.cityId===effectiveCity.id&&(activePageId==='ca_employees'?u.role==='EMPLOYEE':u.role!=='EMPLOYEE'))} zones={zones.filter(z=>z.cityId===effectiveCity.id)} wards={wards.filter(w=>w.cityId===effectiveCity.id)} employeeOnly={activePageId==='ca_employees'}/>}

          {['ca_inspections','ca_daily_reports','ca_attention','ca_inspection_perf'].includes(activePageId) && <CommissionerWorkspace key={activePageId} city={effectiveCity} reports={reports} zones={zones} wards={wards} users={users} role="CITY_ADMIN" onSelectReport={setInspectedReportId} onNavigate={navigate} registryOnly title={activePageId==='ca_inspection_perf'?'Inspection Performance':'Inspection Reports'} initialFilters={activePageId==='ca_attention'?{status:'action_required'}:activePageId==='ca_inspection_perf'?reportIntent:undefined}/>}

          {/* ================= ULB OFFICER PAGES ================= */}
          {['ulb_reports','ulb_pending','ulb_approved','ulb_rejected','ulb_action_req','ulb_action_taken','ulb_inspection_perf'].includes(activePageId)&&<UlbWorkspace city={effectiveCity} reports={reports} users={users} zones={zones} wards={wards} currentUser={currentUser} pageId={activePageId} reportIntent={reportIntent} onSelectReport={setInspectedReportId} onNavigate={navigate} noticeRequest={noticeRequest} onNoticeHandled={()=>setNoticeRequest(0)}/>}
          {['comm_iec_oversight','ca_iec_oversight'].includes(activePageId) && <CleanlinessOversight city={effectiveCity} zones={zones} wards={wards} />}
          {activePageId === 'ulb_iec_issues' && (
            <IecCleanlinessIssuesPage
              city={effectiveCity}
              iecIssues={iecIssues}
              currentUser={currentUser}
              onSelectIssue={(issue) => { matrixStore.loadIssue(issue.id).then(setInspectedIecIssue).catch(error => alert(error.message)); }}
              onRefresh={() => setStoreRevision(r => r + 1)}
            />
          )}


          {['comm_user_perf','ulb_user_perf','ca_user_perf'].includes(activePageId) && <UserPerformance city={effectiveCity} users={users} zones={zones} wards={wards}/>}

          {activePageId==='ulb_dashboard'&&<UlbDashboard city={effectiveCity} zones={zones} wards={wards} currentUser={currentUser} onNavigate={navigate} onSelectReport={setInspectedReportId} noticeRequest={noticeRequest} onNoticeCount={setNoticeCount} onNoticeHandled={()=>setNoticeRequest(0)}/>}
          {/* ================= COMMISSIONER PAGES ================= */}
          {activePageId==='comm_chat_history'&&currentUser.role==='COMMISSIONER'&&<ChatHistory user={currentUser} city={effectiveCity}/>}
          {activePageId==='ca_dashboard'&&currentUser.role==='HMS_SUPER_ADMIN'&&<CityProgress city={effectiveCity} users={users} onNavigate={navigate}/>}
          {activePageId==='ca_dashboard'&&currentUser.role!=='HMS_SUPER_ADMIN' && <CityDashboard city={effectiveCity} zones={zones} wards={wards} beats={beats} users={users} onNavigate={navigate}/>}
          {activePageId==='comm_dashboard' && <CommissionerHome city={effectiveCity} zones={zones} wards={wards} reports={reports} currentUser={currentUser} onNavigate={navigate} onSelectReport={setInspectedReportId} onInspect={(moduleId='all',status='all')=>{setReportIntent({moduleId,status});navigate('comm_inspection_perf');}} noticeRequest={noticeRequest} onNoticeCount={setNoticeCount} onNoticeHandled={()=>setNoticeRequest(0)}/>}
          {activePageId === 'comm_inspection_perf' && <CommissionerWorkspace city={effectiveCity} reports={reports} zones={zones} wards={wards} users={users} onSelectReport={setInspectedReportId} onNavigate={navigate} registryOnly initialFilters={reportIntent}/>}

          {activePageId === 'comm_zone_ward' && (
            <ZoneWardDetails
              city={effectiveCity}
              zones={zones}
              wards={wards}
              beats={beats}
              reports={reports}
              iecIssues={iecIssues}
              attendance={attendance}
              users={users}
              onSelectReport={(rId) => setInspectedReportId(rId)}
            />
          )}

          {['comm_exec_summary','ca_exec_summary'].includes(activePageId) && <ReportsExports city={effectiveCity} zones={zones} wards={wards} reports={reports} />}

          {/* ================= OPERATIONAL MODULES ================= */}
          {activePageId.startsWith('mod_') && (
            <ModuleWorkspace
              moduleId={activePageId.replace('mod_', '') as OperationalModuleId}
              city={effectiveCity}
              zones={zones}
              wards={wards}
              beats={beats}
              reports={reports}
              currentUser={currentUser}
              onSelectReport={(rId) => setInspectedReportId(rId)}
            />
          )}

          {/* ================= CONNECTED PRODUCTS ================= */}
          {activePageId === 'prod_plant' || activePageId === 'comm_plant' ? (
            <PlantProcessing
              city={effectiveCity}
              onUpload={() => setCsvImportModal({
                isOpen: true,
                type: 'plantLogs',
                title: `Import Plant Daily Log - ${effectiveCity.name}`
              })}
            />
          ) : null}

          {activePageId === 'prod_swachh' && (
            <section className="bg-white border rounded-xl p-6 space-y-3"><h1 className="text-xl font-bold">Swachh Assessment</h1><p className="text-sm text-slate-600">Swachh Assessment uses a separate service and login token. Open it through your existing MatrixTrack portal; assessment records are not supplied by this backend.</p></section>
          )}

          {activePageId === 'prod_workforce' && (
            <LiveWorkforce
              city={effectiveCity}
              users={users}
              attendance={attendance}
            />
          )}
          </>}
          </Suspense></div>
        </main>
      </div>

      {/* Global Report Detail Drawer (Opens inspection dossier with full Q&A, Lightbox & Escalation) */}
      <Suspense fallback={null}>{currentRole==='COMMISSIONER'&&<NagarInsight key={`${currentUser.id}:${effectiveCity.id}:${matrixStore.getDateRange().from}:${matrixStore.getDateRange().to}:${matrixStore.loadRevision}`} user={currentUser} activeRole={currentRole} city={effectiveCity} zones={zones} wards={wards} from={matrixStore.getDateRange().from} to={matrixStore.getDateRange().to} onNavigate={navigate}/>}</Suspense>
      <Suspense fallback={null}>{inspectedReportId&&<ReportDetailDrawer
        reportId={inspectedReportId}
        onClose={() => setInspectedReportId(null)}
        currentUser={currentUser}
        onReportUpdated={() => setStoreRevision(r => r + 1)}
      />}</Suspense>

      {/* Global IEC Cleanliness Grievance Drawer (3 Tabs, 24h SLA, Reopening decisions) */}
      <Suspense fallback={null}>{inspectedIecIssue&&<IecIssueDrawer
        issue={inspectedIecIssue}
        onClose={() => setInspectedIecIssue(null)}
        currentUser={currentUser}
        onIssueUpdated={() => { setInspectedIecIssue(null); setStoreRevision(r => r + 1); }}
      />}</Suspense>

      {/* Working CSV Import Modal (Attendance, Beats, Plant logs) */}
      <Suspense fallback={null}>{csvImportModal.isOpen&&<CsvImportModal
        isOpen={csvImportModal.isOpen}
        onClose={() => setCsvImportModal(prev => ({ ...prev, isOpen: false }))}
        type={csvImportModal.type}
        title={csvImportModal.title}
        currentUser={currentUser}
        cityId={effectiveCity.id}
        onSuccess={() => setStoreRevision(r => r + 1)}
      />}</Suspense>


    </div>
  );
}
