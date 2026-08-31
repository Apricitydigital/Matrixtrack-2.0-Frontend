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
  PlusCircle,
  CheckCircle2,
  ChartNoAxesCombined,
  AlertTriangle,
  FileCheck2,
  XCircle,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun
} from 'lucide-react';

import { moduleEntryPath } from '@utils/modules';
import { setAuthCookie } from '@lib/auth';
import { UserProfileModal } from '@components/ui/UserProfileModal';


function PortalHomeLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark-theme');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newDark = !prev;
      if (newDark) {
        document.documentElement.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
      }
      return newDark;
    });
  };

  const router = useRouter();

  const pathname = usePathname();

  const searchParams = useSearchParams();

  const currentView =
    searchParams.get('view') || 'dashboard';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const handleMenuClick = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      setter(true);
    } else {
      setter((prev) => !prev);
    }
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, searchParams]);


  /* =========================================================
     CLOCK
  ========================================================= */

  const [clockStr, setClockStr] =
    useState('');


  /* =========================================================
     WORKSPACE ACTIVE STATES
  ========================================================= */

  const isTaskforceActive =
    pathname.startsWith('/city') ||
    pathname.startsWith('/modules');

  const isSwachhActive =
    pathname.startsWith('/ward-ranking') ||
    pathname.startsWith('/ulb/ward-ranking');

  const isWorkforceActive =
    pathname.startsWith('/workforce-monitoring');

  const isInsideWorkspace =
    isTaskforceActive ||
    isSwachhActive ||
    isWorkforceActive;

  const isMainDashboard =
    pathname === '/portal-home' ||
    pathname === '/city' ||
    pathname === '/city/' ||
    pathname === '/dashboard';


  /* =========================================================
     BEAT SECTION
  ========================================================= */

  const isBeatSectionActive =
    pathname.startsWith('/city/beats') ||
    pathname.startsWith('/city/beat-status') ||
    pathname.startsWith('/city/beat-requests');

  const isBeatStaffActive =
    pathname.startsWith(
      '/city/beats/assignments'
    );


  /* =========================================================
     SIDEBAR STATES
  ========================================================= */

  const [
    taskforceOpen,
    setTaskforceOpen,
  ] = useState(isTaskforceActive);

  const [
    swachhOpen,
    setSwachhOpen,
  ] = useState(isSwachhActive);

  const [
    workforceOpen,
    setWorkforceOpen,
  ] = useState(isWorkforceActive);

  const [
    modulesSubOpen,
    setModulesSubOpen,
  ] = useState(
    pathname.startsWith('/modules')
  );

  const [
    masterSubOpen,
    setMasterSubOpen,
  ] = useState(
    pathname.startsWith('/city/zones') ||
    pathname.startsWith('/city/wards') ||
    pathname.startsWith('/city/areas') ||
    pathname.startsWith('/city/employees') ||
    pathname.startsWith('/city/users') ||
    isBeatSectionActive
  );

  const [
    beatsSubOpen,
    setBeatsSubOpen,
  ] = useState(isBeatSectionActive);

  const [
    beatStaffSubOpen,
    setBeatStaffSubOpen,
  ] = useState(isBeatStaffActive);

  const [
    userManagementOpen,
    setUserManagementOpen,
  ] = useState(
    pathname.startsWith(
      '/portal-home/common-registration'
    ) ||
    pathname.startsWith(
      '/portal-home/registered-users'
    ) ||
    pathname.startsWith(
      '/portal-home/registration-requests'
    )
  );

  const [
    portalToolsOpen,
    setPortalToolsOpen,
  ] = useState(true);


  /* =========================================================
     WORKSPACE AUTO OPEN
  ========================================================= */

  useEffect(() => {
    if (isTaskforceActive) {
      setTaskforceOpen(true);
    }

    if (isSwachhActive) {
      setSwachhOpen(true);
    }

    if (isWorkforceActive) {
      setWorkforceOpen(true);
    }
  }, []);


  /* =========================================================
     BEAT MENU AUTO OPEN
  ========================================================= */

  useEffect(() => {
    if (isBeatSectionActive) {
      setMasterSubOpen(true);
      setBeatsSubOpen(true);
    }

    if (isBeatStaffActive) {
      setBeatStaffSubOpen(true);
    }
  }, [
    isBeatSectionActive,
    isBeatStaffActive,
  ]);


  /* =========================================================
     CLOCK
  ========================================================= */

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      setClockStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };

    updateClock();

    const timer =
      setInterval(
        updateClock,
        1000
      );

    return () =>
      clearInterval(timer);
  }, []);


  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    localStorage.clear();

    setAuthCookie('');

    router.push('/unified-login');
  };


  /* =========================================================
     USER / ROLE INFO
  ========================================================= */

  const isSuperAdmin =
    user?.role === 'super_admin' ||
    user?.role === 'hms_super_admin' ||
    user?.role === 'SUPER_ADMIN' ||
    (user?.roles || []).includes(
      'hms_super_admin'
    ) ||
    (user?.roles || []).includes(
      'HMS_SUPER_ADMIN'
    ) ||
    (user?.roles || []).includes(
      'SUPER_ADMIN'
    ) ||
    (user?.roles || []).includes(
      'super_admin'
    );

  const displayName =
    user?.name || 'User';

  const roleLabelText =
    user?.role
      ? roleLabel(user.role)
      : '';

  const cityName =
    user?.city
      ? user.city.name
      : '';

  const userInitial =
    displayName
      .charAt(0)
      .toUpperCase();


  const userRoles =
    user?.roles || [];

  const userRole =
    user?.role || '';

  const userPermissions =
    (user as any)?.permissions || [];

  const scopedAssignedCities =
    Array.isArray((user as any)?.customPermissions?.assigned_cities)
      ? (user as any).customPermissions.assigned_cities
      : [];

  const userModules =
    (user as any)?.modules || [];

  const userAssignedModules =
    (user as any)?.assignedModules || [];


  /* =========================================================
     NORMALIZE ROLES / PERMISSIONS
  ========================================================= */

  const normalizedAllRoles =
    Array.from(
      new Set(
        [
          userRole,
          ...userRoles,
          ...userPermissions,
          ...userAssignedModules,

          ...userModules.map(
            (m: any) =>
              m.key ||
              m.name ||
              m.moduleId ||
              ''
          ),
        ]
          .filter(Boolean)
          .map(
            (r: any) =>
              String(r)
                .trim()
                .toUpperCase()
          )
      )
    );


  const isCityAdmin =
    isSuperAdmin ||
    scopedAssignedCities.length > 0 ||
    normalizedAllRoles.some(
      (r) =>
        [
          'CITY_ADMIN',
          'COMMISSIONER',
          'HMS_SUPER_ADMIN',
          'HMS_ADMIN',
        ].includes(r)
    );

  const isSwachhAdmin =
    isSuperAdmin ||
    normalizedAllRoles.some(
      (r) =>
        [
          'ADMIN',
          'SWACHH_ADMIN',
          'SWACHH',
          'SWACHH_SYNC',
          'SWACHH_RANKING',
          'WARD_RANKING',
          'SWACHH_ACCESS',
        ].includes(r)
    );


  const isQcUser =
    normalizedAllRoles.includes(
      'QC'
    );

  const isUlbUser =
    normalizedAllRoles.includes(
      'ULB_OFFICER'
    );

  const isAccessorUser =
    normalizedAllRoles.includes(
      'ACCESSOR'
    );


  const isWorkforceAdmin =
    isSuperAdmin ||
    normalizedAllRoles.some(
      (r) =>
        [
          'ADMIN',
          'WORKFORCE_ADMIN',
          'WORKFORCE',
          'MATRIX_TRACK',
          'WORKFORCE_MONITORING',
          'WORKFORCE_ACCESS',
        ].includes(r)
    );


  const hasTaskforceAccess =
    isSuperAdmin ||
    normalizedAllRoles.some(
      (r) =>
        [
          'TASKFORCE',
          'TASKFORCE_20',
          'TASKFORCE_ADMIN',
          'SWEEPING',
          'LITTERBINS',
          'TOILET',
        ].includes(r)
    );


  const hasSwachhAccess =
    isSuperAdmin ||
    isSwachhAdmin ||
    isQcUser ||
    isAccessorUser ||
    normalizedAllRoles.some(
      (r) =>
        [
          'SWACHH',
          'SWACHH_ADMIN',
          'SWACHH_SYNC',
          'SWACHH_RANKING',
          'WARD_RANKING',
          'SWACHH_ACCESS',
        ].includes(r)
    );


  const hasWorkforceAccess =
    isSuperAdmin ||
    isWorkforceAdmin ||
    normalizedAllRoles.some(
      (r) =>
        [
          'WORKFORCE',
          'WORKFORCE_ADMIN',
          'MATRIX_TRACK',
          'WORKFORCE_MONITORING',
          'WORKFORCE_ACCESS',
        ].includes(r)
    );


  /* =========================================================
     GREETING
  ========================================================= */

  const getGreeting = () => {
    const hour =
      new Date().getHours();

    if (hour < 12) {
      return 'Good Morning';
    }

    if (hour < 18) {
      return 'Good Afternoon';
    }

    return 'Good Evening';
  };


  /* =========================================================
     PAGE TITLE
  ========================================================= */

  let pageTitle =
    `${getGreeting()}, ${displayName}!`;


  if (
    pathname.includes('/onboard-city')
  ) {
    pageTitle =
      'Create City';
  }

  if (
    pathname.includes('/city-directory')
  ) {
    pageTitle =
      'City Directory';
  }

  if (
    pathname.includes(
      '/common-registration'
    )
  ) {
    pageTitle =
      'Create User';
  }

  if (
    pathname.includes(
      '/registered-users'
    )
  ) {
    pageTitle =
      'Existing Users';
  }

  if (
    pathname.includes(
      '/registration-requests'
    )
  ) {
    pageTitle =
      'User Registration Requests';
  }

  if (
    pathname.includes(
      '/admin-management'
    )
  ) {
    pageTitle =
      'User & Admin Management';
  }

  if (pathname.startsWith('/ulb/inspection-performance')) {
    pageTitle = 'Inspection and Performance';
  }

  if (pathname.startsWith('/ulb/attendance')) {
    pageTitle = 'Attendance Analytics';
  }

  if (pathname.startsWith('/ulb/ward-ranking')) {
    pageTitle = 'Ward Ranking';
  }

  if (pathname.startsWith('/ulb/map-view-dashboard')) {
    pageTitle = 'Map View Dashboard';
  }




  /* =========================================================
     TARGET / TASKFORCE TITLES
  ========================================================= */

  if (pathname.startsWith('/city/targets')) {
    pageTitle = 'Target Assignment';
  }

  else if (isTaskforceActive) {
    if (
      pathname.startsWith('/city/attendance')
    ) {
      pageTitle =
        'Attendance Analytics';
    }

    else if (
      pathname.includes('/modules')
    ) {
      pageTitle =
        'Taskforce - Modules';
    }

    else if (
      pathname.includes('/zones')
    ) {
      pageTitle =
        'Taskforce - Zones';
    }

    else if (
      pathname.includes('/wards')
    ) {
      pageTitle =
        'Taskforce - Wards';
    }

    else if (
      pathname.startsWith(
        '/city/beat-requests'
      )
    ) {
      pageTitle =
        'Taskforce - Beat Requests';
    }

    else if (
      pathname.startsWith(
        '/city/beat-status'
      )
    ) {
      pageTitle =
        'Taskforce - Beat Status';
    }

    else if (
      pathname.startsWith(
        '/city/beats/assignments'
      )
    ) {
      pageTitle =
        searchParams.get('view') ===
          'employee'
          ? 'Taskforce - Employee Assignment'
          : 'Taskforce - Supervisor Assignment';
    }

    else if (
      pathname.startsWith(
        '/city/beats'
      )
    ) {
      pageTitle =
        'Taskforce - Beats';
    }

    else if (
      pathname.includes('/areas')
    ) {
      pageTitle =
        'Taskforce - Areas';
    }

    else if (
      pathname.includes('/users')
    ) {
      pageTitle =
        'Taskforce - Municipal Users';
    }

    else {
      pageTitle =
        'Inspection & Performance System Dashboard';
    }
  }

  else if (isSwachhActive) {
    if (
      currentView === 'approvals'
    ) {
      pageTitle =
        'Swachh Sync - Access Requests';
    }

    else if (
      currentView === 'users'
    ) {
      pageTitle =
        'Swachh Sync - User Management';
    }

    else if (
      currentView === 'participants'
    ) {
      pageTitle =
        'Swachh Sync - Participants';
    }

    else if (
      currentView === 'access-control'
    ) {
      pageTitle =
        'Swachh Sync - Sidebar Access Control';
    }

    else if (
      currentView === 'questionnaire'
    ) {
      pageTitle =
        'Swachh Sync - Questionnaire Manager';
    }

    else if (
      currentView === 'sa-review'
    ) {
      pageTitle =
        'Swachh Sync - Self Assessment QC Review';
    }

    else if (
      currentView === 'reports'
    ) {
      pageTitle =
        'Swachh Sync - Reports';
    }

    else if (
      currentView === 'results'
    ) {
      pageTitle =
        'Swachh Sync - Results';
    }

    else {
      pageTitle =
        'Ward Ranking Workspace';
    }
  }

  else if (isWorkforceActive) {
    if (
      currentView === 'master'
    ) {
      pageTitle =
        'Workforce - Master Control';
    }

    else if (
      currentView === 'geofencing'
    ) {
      pageTitle =
        'Workforce - GeoFencing Management';
    }

    else if (
      currentView === 'employees'
    ) {
      pageTitle =
        'Workforce - Employee Master';
    }

    else if (
      currentView === 'attendance'
    ) {
      pageTitle =
        'Workforce - Attendance Reports';
    }

    else if (
      currentView ===
      'short-attendance'
    ) {
      pageTitle =
        'Workforce - Short Attendance Report';
    }

    else if (
      currentView === 'supervisors'
    ) {
      pageTitle =
        'Workforce - Supervisors Management';
    }

    else if (
      currentView ===
      'assignSupervisorWard' ||
      currentView ===
      'assign-supervisor-ward'
    ) {
      pageTitle =
        'Workforce - Assign Supervisor Kothi';
    }

    else if (
      currentView ===
      'supervisor-audit'
    ) {
      pageTitle =
        'Workforce - Attendance Audit';
    }

    else if (
      currentView ===
      'supervisor-self-punch-requests'
    ) {
      pageTitle =
        'Workforce - Access Requests';
    }

    else if (
      currentView ===
      'supervisor-professional-attendance'
    ) {
      pageTitle =
        'Workforce - Professional Attendance';
    }

    else if (
      currentView ===
      'supervisor-professional-leave'
    ) {
      pageTitle =
        'Workforce - Professional Leave Management';
    }

    else if (
      currentView === 'settings'
    ) {
      pageTitle =
        'Workforce - System Settings';
    }

    else {
      pageTitle =
        'Workforce Monitoring Workspace';
    }
  }


  /* =========================================================
     MODULE ROUTES
  ========================================================= */

  const toiletHref =
    moduleEntryPath(
      user || null,
      'TOILET'
    );

  const sweepingHref =
    moduleEntryPath(
      user || null,
      'SWEEPING'
    );

  const litterbinsHref =
    moduleEntryPath(
      user || null,
      'LITTERBINS'
    );

  const taskforceHref =
    moduleEntryPath(
      user || null,
      'TASKFORCE'
    );


  const activeModuleKeys = (userModules || []).map((m: any) => (m.key || m.name || '').toUpperCase());
  const hasSubModule = (key: string) =>
    isCityAdmin || activeModuleKeys.some((k: string) => k.includes(key));

  const userModuleItems = [
    {
      name:
        'Litter Bins',

      href:
        litterbinsHref,

      icon:
        <Trash2 size={15} />,

      isActive:
        pathname.startsWith(
          '/modules/litterbins'
        ) ||
        pathname.startsWith(
          '/modules/litter'
        ),

      visible:
        hasSubModule('LITTER'),
    },

    {
      name:
        'Sweeping',

      href:
        sweepingHref,

      icon:
        <Activity size={15} />,

      isActive:
        pathname.startsWith(
          '/modules/sweeping'
        ),

      visible:
        hasSubModule('SWEEP'),
    },

    {
      name:
        'Cleanliness of Toilet',

      href:
        toiletHref,

      icon:
        <Info size={15} />,

      isActive:
        pathname.startsWith(
          '/modules/toilet'
        ),

      visible:
        hasSubModule('TOILET'),
    },

    {
      name:
        'CTU/GVP Transformation',

      href:
        taskforceHref,

      icon:
        <Lock size={15} />,

      isActive:
        pathname.startsWith(
          '/modules/taskforce'
        ) ||
        pathname.startsWith(
          '/modules/ctu'
        ) ||
        pathname.startsWith(
          '/modules/gvp'
        ),

      visible:
        hasSubModule('TASKFORCE') || hasSubModule('GVP'),
    },
  ].filter((item) => item.visible);

  const ulbNavigationItems = [
    {
      name: 'Dashboard',

      href:
        '/ulb/dashboard',

      icon:
        <LayoutDashboard size={15} />,

      isActive:
        pathname === '/ulb/dashboard' ||
        pathname === '/ulb',
    },

    {
      name: 'Approved',

      href:
        '/ulb/reports/approved',

      icon:
        <CheckCircle2 size={15} />,

      isActive:
        pathname ===
        '/ulb/reports/approved',
    },

    {
      name: 'Rejected',

      href:
        '/ulb/reports/rejected',

      icon:
        <XCircle size={15} />,

      isActive:
        pathname ===
        '/ulb/reports/rejected',
    },

    {
      name:
        'Action Required',

      href:
        '/ulb/reports/action-required',

      icon:
        <AlertTriangle size={15} />,

      isActive:
        pathname ===
        '/ulb/reports/action-required',
    },

    {
      name:
        'Action Taken',

      href:
        '/ulb/reports/action-taken',

      icon:
        <FileCheck2 size={15} />,

      isActive:
        pathname ===
        '/ulb/reports/action-taken',
    },
  ];

  /* =========================================================
     MASTER CONTROL
     BEATS ARE HANDLED SEPARATELY BELOW
  ========================================================= */

  const masterSubTabs = [
    ...(isSuperAdmin
      ? [
        {
          name:
            'Create City',

          href:
            '/portal-home/onboard-city',

          icon:
            <PlusCircle size={15} />,

          isActive:
            pathname.includes(
              '/onboard-city'
            ),
        },
      ]
      : []),

    {
      name:
        'Zones',

      href:
        '/city/zones',

      icon:
        <Map size={15} />,

      isActive:
        pathname.startsWith(
          '/city/zones'
        ),
    },

    {
      name:
        'Wards',

      href:
        '/city/wards',

      icon:
        <MapPin size={15} />,

      isActive:
        pathname.startsWith(
          '/city/wards'
        ),
    },

    {
      name:
        'Areas',

      href:
        '/city/areas',

      icon:
        <Target size={15} />,

      isActive:
        pathname ===
        '/city/areas',
    },
  ];


  /* =========================================================
     SWACHH GROUPS
  ========================================================= */

  const swachhGroups = [
    {
      group:
        'Overview',

      items: [
        {
          name:
            'Dashboard',

          href:
            '/ward-ranking?view=dashboard',

          icon:
            <LayoutDashboard size={15} />,

          isActive:
            isSwachhActive &&
            (
              currentView === 'dashboard' ||
              !searchParams.get('view')
            ),

          visible:
            isSwachhAdmin ||
            isQcUser ||
            isAccessorUser,
        },
      ],
    },

    {
      group:
        'Management',

      items: [
        {
          name:
            'Access Requests',

          href:
            '/ward-ranking?view=approvals',

          icon:
            <UserPlus size={15} />,

          isActive:
            isSwachhActive &&
            currentView === 'approvals',

          visible:
            isSwachhAdmin,
        },

        {
          name:
            'Users',

          href:
            '/ward-ranking?view=users',

          icon:
            <Users size={15} />,

          isActive:
            isSwachhActive &&
            currentView === 'users',

          visible:
            isSwachhAdmin,
        },

        {
          name:
            'Participants',

          href:
            '/ward-ranking?view=participants',

          icon:
            <Layers size={15} />,

          isActive:
            isSwachhActive &&
            currentView === 'participants',

          visible:
            isSwachhAdmin,
        },
      ],
    },

    {
      group:
        'Configuration',

      items: [
        {
          name:
            'Sidebar Access',

          href:
            '/ward-ranking?view=access-control',

          icon:
            <Lock size={15} />,

          isActive:
            isSwachhActive &&
            currentView ===
            'access-control',

          visible:
            isSwachhAdmin,
        },

        {
          name:
            'Questionnaire',

          href:
            '/ward-ranking?view=questionnaire',

          icon:
            <ClipboardList size={15} />,

          isActive:
            isSwachhActive &&
            currentView ===
            'questionnaire',

          visible:
            isSwachhAdmin,
        },
      ],
    },

    {
      group:
        'Assessment',

      items: [
        {
          name:
            'SA Review',

          href:
            '/ward-ranking?view=sa-review',

          icon:
            <ClipboardCheck size={15} />,

          isActive:
            isSwachhActive &&
            currentView ===
            'sa-review',

          visible:
            isSwachhAdmin ||
            isQcUser,
        },

        {
          name:
            'Reports',

          href:
            '/ward-ranking?view=reports',

          icon:
            <FileText size={15} />,

          isActive:
            isSwachhActive &&
            currentView ===
            'reports',

          visible:
            isSwachhAdmin ||
            isQcUser,
        },

        {
          name:
            'Results',

          href:
            '/ward-ranking?view=results',

          icon:
            <Award size={15} />,

          isActive:
            isSwachhActive &&
            currentView ===
            'results',

          visible:
            isSwachhAdmin,
        },
      ],
    },

    {
      group:
        'Accessor',

      items: [
        {
          name:
            'Verify Assessment',

          href:
            '/ward-ranking?view=verify',

          icon:
            <ShieldCheck size={15} />,

          isActive:
            isSwachhActive &&
            currentView === 'verify',

          visible:
            isAccessorUser,
        },
      ],
    },
  ]
    .map((g) => ({
      ...g,

      items:
        g.items.filter(
          (i) => i.visible
        ),
    }))
    .filter(
      (g) =>
        g.items.length > 0
    );


  /* =========================================================
     WORKFORCE PERMISSION
  ========================================================= */

  const checkWorkforcePerm =
    (mod: string) => {
      if (
        isCityAdmin &&
        ['geofencing'].includes(
          String(mod || '')
            .trim()
            .toLowerCase()
        )
      ) {
        return false;
      }

      if (isWorkforceAdmin) {
        return true;
      }

      if (
        Array.isArray(
          userPermissions
        )
      ) {
        return userPermissions.some(
          (p: any) =>
            p.module === mod ||
            p === mod ||
            (
              typeof p === 'object' &&
              p?.module === mod
            )
        );
      }

      return false;
    };


  /* =========================================================
     WORKFORCE GROUPS
  ========================================================= */

  const workforceGroups = [
    {
      group:
        'Overview & Master',

      items: [
        {
          name:
            'Dashboard',

          href:
            '/workforce-monitoring?view=dashboard',

          icon:
            <LayoutDashboard size={15} />,

          isActive:
            isWorkforceActive &&
            (
              currentView ===
              'dashboard' ||
              !searchParams.get('view')
            ),

          visible:
            true,
        },

        {
          name:
            'Master',

          href:
            '/workforce-monitoring?view=master',

          icon:
            <Layers size={15} />,

          isActive:
            isWorkforceActive &&
            currentView === 'master',

          visible:
            checkWorkforcePerm(
              'master'
            ),
        },

        {
          name:
            'GeoFencing',

          href:
            '/workforce-monitoring?view=geofencing',

          icon:
            <MapPin size={15} />,

          isActive:
            isWorkforceActive &&
            currentView ===
            'geofencing',

          visible:
            checkWorkforcePerm(
              'geofencing'
            ),
        },
      ],
    },

    {
      group:
        'Staff & Supervisors',

      items: [
        {
          name:
            'Supervisors Management',

          href:
            '/workforce-monitoring?view=supervisors',

          icon:
            <UserCheck size={15} />,

          isActive:
            isWorkforceActive &&
            currentView ===
            'supervisors',

          visible:
            checkWorkforcePerm(
              'supervisors'
            ),
        },

        {
          name:
            'Assign Supervisor Kothi',

          href:
            '/workforce-monitoring?view=assignSupervisorWard',

          icon:
            <UserCheck size={15} />,

          isActive:
            isWorkforceActive &&
            (
              currentView ===
              'assignSupervisorWard' ||
              currentView ===
              'assign-supervisor-ward'
            ),

          visible:
            checkWorkforcePerm(
              'assign_supervisor_ward'
            ) ||
            checkWorkforcePerm(
              'assignSupervisorWard'
            ),
        },

        {
          name:
            'Employee Master',

          href:
            '/workforce-monitoring?view=employees',

          icon:
            <Users size={15} />,

          isActive:
            isWorkforceActive &&
            currentView ===
            'employees',

          visible:
            checkWorkforcePerm(
              'employees'
            ),
        },
      ],
    },

    {
      group:
        'Attendance & Reports',

      items: [
        {
          name:
            'Attendance Reports',

          href:
            '/workforce-monitoring?view=attendance',

          icon:
            <CalendarRange size={15} />,

          isActive:
            isWorkforceActive &&
            currentView ===
            'attendance',

          visible:
            checkWorkforcePerm(
              'attendance_reports'
            ) ||
            checkWorkforcePerm(
              'attendance'
            ),
        },

        {
          name:
            'Short Attendance',

          href:
            '/workforce-monitoring?view=short-attendance',

          icon:
            <FileSpreadsheet size={15} />,

          isActive:
            isWorkforceActive &&
            currentView ===
            'short-attendance',

          visible:
            checkWorkforcePerm(
              'short_attendance'
            ) ||
            checkWorkforcePerm(
              'short-attendance'
            ),
        },

        {
          name:
            'Supervisor Audit',

          href:
            '/workforce-monitoring?view=supervisor-audit',

          icon:
            <UserCheck size={15} />,

          isActive:
            isWorkforceActive &&
            currentView ===
            'supervisor-audit',

          visible:
            checkWorkforcePerm(
              'supervisor-audit'
            ),
        },

        {
          name:
            'Access Requests',

          href:
            '/workforce-monitoring?view=supervisor-self-punch-requests',

          icon:
            <UserCheck size={15} />,

          isActive:
            isWorkforceActive &&
            currentView ===
            'supervisor-self-punch-requests',

          visible:
            checkWorkforcePerm(
              'field-access-requests'
            ) ||
            checkWorkforcePerm(
              'supervisor-self-punch-requests'
            ),
        },

        {
          name:
            'Professional Attendance',

          href:
            '/workforce-monitoring?view=supervisor-professional-attendance',

          icon:
            <CalendarRange size={15} />,

          isActive:
            isWorkforceActive &&
            currentView ===
            'supervisor-professional-attendance',

          visible:
            checkWorkforcePerm(
              'professional-attendance'
            ),
        },

        {
          name:
            'Professional Leave',

          href:
            '/workforce-monitoring?view=supervisor-professional-leave',

          icon:
            <CalendarRange size={15} />,

          isActive:
            isWorkforceActive &&
            currentView ===
            'supervisor-professional-leave',

          visible:
            checkWorkforcePerm(
              'professional-leave-mgmt'
            ) ||
            checkWorkforcePerm(
              'supervisor-professional-leave'
            ),
        },
      ],
    },

    {
      group:
        'Settings',

      items: [
        {
          name:
            'Settings',

          href:
            '/workforce-monitoring?view=settings',

          icon:
            <Settings size={15} />,

          isActive:
            isWorkforceActive &&
            currentView ===
            'settings',

          visible:
            checkWorkforcePerm(
              'settings'
            ),
        },
      ],
    },
  ]
    .map((g) => ({
      ...g,

      items:
        g.items.filter(
          (i) => i.visible
        ),
    }))
    .filter(
      (g) =>
        g.items.length > 0
    );


  const canAccessRegistration =
    isSuperAdmin ||
    isCityAdmin;

  const navItemsCount =
    (isUlbUser ? 0 : 1) +
    (
      canAccessRegistration
        ? 1
        : 0
    ) +
    (
      isSuperAdmin
        ? 2
        : 0
    );


  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col w-full overflow-x-hidden">

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .pulse-dot {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }

          50% {
            opacity: .5;
          }
        }
      `}</style>


      {/* =====================================================
          MOBILE TOPBAR (< lg)
      ===================================================== */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm w-full">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          <Link
            href={isUlbUser ? "/ulb/dashboard" : "/portal-home"}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white shadow-sm font-black text-xs">
              <Shield size={16} />
            </div>
            <span className="text-sm font-black text-slate-900 tracking-tight">
              MatrixTrack 2.0
            </span>
          </Link>
        </div>

        {user && (
          <Link
            href="/portal-home/profile"
            className="flex items-center gap-2"
            title="Profile"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                  {userInitial}
                </div>
              </button>
            </div>
          </Link>
        )}
      </header>

      {/* =====================================================
          MOBILE DRAWER BACKDROP (< lg)
      ===================================================== */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* =====================================================
          LEFT SIDEBAR (DRAWER ON MOBILE, FIXED ON LG)
      ===================================================== */}
      <aside
        className={`fixed left-0 top-0 bottom-0 bg-white border-r border-slate-200 flex flex-col justify-between h-screen overflow-y-auto scrollbar-hide z-50 transition-all duration-300 ease-out ${sidebarCollapsed ? 'lg:w-[76px] lg:p-3 p-5 w-72' : 'w-72 p-5'
          } ${mobileMenuOpen
            ? 'translate-x-0 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className="flex flex-col gap-6">

          {/* LOGO & CLOSE / TOGGLE BUTTON */}
          <div className="flex items-center justify-between">
            <Link
              href={isUlbUser ? "/ulb/dashboard" : "/portal-home"}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-1 py-1 cursor-pointer group transition-all ${sidebarCollapsed ? 'lg:justify-center lg:w-full' : ''
                }`}
              title="Return to Main Portal Entrance"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
                <Shield size={20} />
              </div>

              <div className={`min-w-0 ${sidebarCollapsed ? 'lg:hidden' : 'block'}`}>
                <div className="truncate text-base font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                  MatrixTrack 2.0
                </div>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>

            {/* Desktop Quick Collapse Button (shown ONLY when expanded) */}
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-xs cursor-pointer"
                title="Collapse sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>


          <nav className="flex flex-col gap-2">


            {/* =================================================
                NAVIGATION MENU
            ================================================= */}

            {navItemsCount > 0 && (
              <div className="flex flex-col">

                {navItemsCount > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPortalToolsOpen(
                        (prev) => !prev
                      )
                    }
                    className={`flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors cursor-pointer ${sidebarCollapsed ? 'lg:hidden' : ''
                      }`}
                  >
                    <span>
                      Navigation Menu
                    </span>

                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${portalToolsOpen
                        ? 'rotate-180 text-blue-600'
                        : 'text-slate-400'
                        }`}
                    />
                  </button>
                ) : (
                  <div className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 ${sidebarCollapsed ? 'lg:hidden' : ''
                    }`}>
                    Navigation Menu
                  </div>
                )}


                {(portalToolsOpen ||
                  navItemsCount <= 1) && (

                    <div className="flex flex-col gap-1 mt-1">

                      {/* HOME */}
                      {!isUlbUser && (
                        <Link
                          href="/portal-home"
                          title="Home"
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${pathname === '/portal-home'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                        >
                          <LayoutDashboard
                            size={16}
                            className={`shrink-0 ${pathname === '/portal-home'
                              ? 'text-white'
                              : 'text-slate-400'
                              }`}
                          />

                          <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Home</span>
                        </Link>
                      )}


                      {/* =================================================
                      USER MANAGEMENT
                  ================================================= */}

                      {canAccessRegistration && (

                        <div className="flex flex-col">

                          <button
                            type="button"
                            title="User Management"
                            onClick={() =>
                              handleMenuClick(setUserManagementOpen)
                            }
                            className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${userManagementOpen
                              ? 'text-blue-600 font-extrabold bg-blue-50'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                              } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                          >
                            <div className="flex items-center gap-3">

                              <UserCheck2
                                size={16}
                                className={`shrink-0 ${userManagementOpen
                                  ? 'text-blue-600'
                                  : 'text-slate-500'
                                  }`}
                              />

                              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>
                                User Management
                              </span>

                            </div>


                            <ChevronDown
                              size={15}
                              className={`transition-transform duration-200 ${sidebarCollapsed ? 'lg:hidden' : ''} ${userManagementOpen
                                ? 'rotate-180 text-blue-600'
                                : 'text-slate-400'
                                }`}
                            />
                          </button>


                          {userManagementOpen && (

                            <div className={`ml-4 mt-1 pl-3 border-l-2 border-blue-200 flex flex-col gap-1 ${sidebarCollapsed ? 'lg:hidden' : ''
                              }`}>

                              <Link
                                href="/portal-home/common-registration"
                                title="Create User"
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${pathname.startsWith(
                                  '/portal-home/common-registration'
                                )
                                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                              >
                                <UserPlus
                                  size={15}
                                  className={
                                    pathname.startsWith(
                                      '/portal-home/common-registration'
                                    )
                                      ? 'text-white'
                                      : 'text-slate-400'
                                  }
                                />

                                <span>
                                  Create User
                                </span>
                              </Link>


                              <Link
                                href="/portal-home/registered-users"
                                title="Existing Users"
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${pathname.startsWith(
                                  '/portal-home/registered-users'
                                )
                                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                              >
                                <Users
                                  size={15}
                                  className={
                                    pathname.startsWith(
                                      '/portal-home/registered-users'
                                    )
                                      ? 'text-white'
                                      : 'text-slate-400'
                                  }
                                />

                                <span>
                                  Existing Users
                                </span>
                              </Link>


                              <Link
                                href="/portal-home/registration-requests"
                                title="User Registration Requests"
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${pathname.startsWith(
                                  '/portal-home/registration-requests'
                                )
                                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                              >
                                <UserCheck
                                  size={15}
                                  className={
                                    pathname.startsWith(
                                      '/portal-home/registration-requests'
                                    )
                                      ? 'text-white'
                                      : 'text-slate-400'
                                  }
                                />

                                <span>
                                  User Registration Requests
                                </span>
                              </Link>

                              {/* Employees Tab */}
                              <Link
                                href="/city/employees"
                                title="Employees"
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${pathname.startsWith(
                                  '/city/employees'
                                )
                                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                              >
                                <Users
                                  size={15}
                                  className={
                                    pathname.startsWith(
                                      '/city/employees'
                                    )
                                      ? 'text-white'
                                      : 'text-slate-400'
                                  }
                                />

                                <span>
                                  Employees
                                </span>
                              </Link>

                            </div>

                          )}

                        </div>

                      )}


                      {/* CITY DIRECTORY */}

                      {isSuperAdmin && (

                        <Link
                          href="/portal-home/city-directory"
                          title="City Directory"
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${pathname.includes(
                            '/city-directory'
                          )
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                        >
                          <Globe
                            size={16}
                            className={`shrink-0 ${pathname.includes(
                              '/city-directory'
                            )
                              ? 'text-white'
                              : 'text-slate-500'
                              }`}
                          />

                          <span className={sidebarCollapsed ? 'lg:hidden' : ''}>
                            City Directory
                          </span>
                        </Link>

                      )}


                      {/* =================================================
                      MASTER CONTROL
                  ================================================= */}

                      {isCityAdmin && (

                        <div className="flex flex-col">

                          <button
                            type="button"
                            title="Master Control"
                            onClick={() =>
                              handleMenuClick(setMasterSubOpen)
                            }
                            className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${masterSubOpen
                              ? 'text-blue-600 font-extrabold bg-blue-50'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                              } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                          >
                            <div className="flex items-center gap-3">

                              <Map
                                size={16}
                                className={`shrink-0 ${masterSubOpen
                                  ? 'text-blue-600'
                                  : 'text-slate-500'
                                  }`}
                              />

                              <span className={sidebarCollapsed ? 'lg:hidden' : ''}>
                                Master Control
                              </span>

                            </div>


                            <ChevronDown
                              size={15}
                              className={`transition-transform duration-200 ${sidebarCollapsed ? 'lg:hidden' : ''} ${masterSubOpen
                                ? 'rotate-180 text-blue-600'
                                : 'text-slate-400'
                                }`}
                            />
                          </button>


                          {masterSubOpen && (

                            <div className={`ml-4 mt-1 pl-3 border-l-2 border-blue-200 flex flex-col gap-1 ${sidebarCollapsed ? 'lg:hidden' : ''
                              }`}>


                              {/* ZONES / WARDS / AREAS */}

                              {masterSubTabs.map(
                                (sub) => (

                                  <Link
                                    key={
                                      sub.name
                                    }
                                    href={
                                      sub.href
                                    }
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${sub.isActive
                                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                      }`}
                                  >
                                    <span
                                      className={
                                        sub.isActive
                                          ? 'text-white'
                                          : 'text-slate-400'
                                      }
                                    >
                                      {
                                        sub.icon
                                      }
                                    </span>

                                    <span>
                                      {
                                        sub.name
                                      }
                                    </span>
                                  </Link>

                                )
                              )}


                              {/* =================================================
                              BEATS
                          ================================================= */}

                              <div className="flex flex-col">

                                <div
                                  className={`flex items-center justify-between rounded-lg transition-all duration-200 ${isBeatSectionActive
                                    ? 'bg-blue-50 text-blue-700 font-bold'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                                >

                                  {/* BEATS MAIN PAGE */}

                                  <Link
                                    href="/city/beats"
                                    className="flex flex-1 items-center gap-2 px-3 py-1.5 text-xs font-semibold min-w-0"
                                  >
                                    <Activity
                                      size={15}
                                      className={
                                        isBeatSectionActive
                                          ? 'text-blue-600'
                                          : 'text-slate-400'
                                      }
                                    />

                                    <span>
                                      Beats
                                    </span>
                                  </Link>


                                  {/* BEATS ARROW */}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setBeatsSubOpen(
                                        (prev) =>
                                          !prev
                                      )
                                    }
                                    className="flex items-center justify-center px-2.5 py-1.5 cursor-pointer"
                                  >
                                    <ChevronDown
                                      size={14}
                                      className={`transition-transform duration-200 ${beatsSubOpen
                                        ? 'rotate-180 text-blue-600'
                                        : 'text-slate-400'
                                        }`}
                                    />
                                  </button>

                                </div>


                                {/* BEATS SUB MENU */}

                                {beatsSubOpen && (

                                  <div className="ml-3 mt-1 pl-2.5 border-l border-blue-200 flex flex-col gap-1">


                                    {/* BEAT REQUESTS */}

                                    <Link
                                      href="/city/beat-requests"
                                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${pathname.startsWith(
                                        '/city/beat-requests'
                                      )
                                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                    >
                                      <FileText
                                        size={14}
                                        className={
                                          pathname.startsWith(
                                            '/city/beat-requests'
                                          )
                                            ? 'text-white'
                                            : 'text-slate-400'
                                        }
                                      />

                                      <span>
                                        Beat Requests
                                      </span>
                                    </Link>


                                    {/* BEAT STATUS */}

                                    <Link
                                      href="/city/beat-status"
                                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${pathname.startsWith(
                                        '/city/beat-status'
                                      )
                                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                    >
                                      <CheckCircle2
                                        size={14}
                                        className={
                                          pathname.startsWith(
                                            '/city/beat-status'
                                          )
                                            ? 'text-white'
                                            : 'text-slate-400'
                                        }
                                      />

                                      <span>
                                        Beat Status
                                      </span>
                                    </Link>


                                    {/* =================================================
                                    BEAT STAFF ASSIGNMENT
                                ================================================= */}

                                    <div className="flex flex-col">

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setBeatStaffSubOpen(
                                            (prev) =>
                                              !prev
                                          )
                                        }
                                        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 cursor-pointer ${isBeatStaffActive
                                          ? 'bg-blue-50 text-blue-700 font-bold'
                                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                          }`}
                                      >
                                        <div className="flex items-center gap-2">

                                          <Users
                                            size={14}
                                            className={
                                              isBeatStaffActive
                                                ? 'text-blue-600'
                                                : 'text-slate-400'
                                            }
                                          />

                                          <span>
                                            Beat Staff Assignment
                                          </span>

                                        </div>


                                        <ChevronDown
                                          size={13}
                                          className={`transition-transform duration-200 ${beatStaffSubOpen
                                            ? 'rotate-180 text-blue-600'
                                            : 'text-slate-400'
                                            }`}
                                        />

                                      </button>


                                      {/* STAFF CHILDREN */}

                                      {beatStaffSubOpen && (

                                        <div className="ml-3 mt-1 pl-2.5 border-l border-blue-100 flex flex-col gap-1">


                                          {/* SUPERVISOR ASSIGNMENT */}

                                          <Link
                                            href="/city/beats/assignments?view=supervisor"
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[10.5px] font-semibold transition-all ${pathname.startsWith(
                                              '/city/beats/assignments'
                                            ) &&
                                              searchParams.get(
                                                'view'
                                              ) !==
                                              'employee'
                                              ? 'bg-blue-600 text-white font-bold'
                                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                              }`}
                                          >
                                            <UserCheck2
                                              size={13}
                                            />

                                            <span>
                                              Supervisor Assignment
                                            </span>
                                          </Link>


                                          {/* EMPLOYEE ASSIGNMENT */}

                                          <Link
                                            href="/city/beats/assignments?view=employee"
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[10.5px] font-semibold transition-all ${pathname.startsWith(
                                              '/city/beats/assignments'
                                            ) &&
                                              searchParams.get(
                                                'view'
                                              ) ===
                                              'employee'
                                              ? 'bg-blue-600 text-white font-bold'
                                              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                              }`}
                                          >
                                            <Users
                                              size={13}
                                            />

                                            <span>
                                              Employee Assignment
                                            </span>
                                          </Link>

                                        </div>

                                      )}

                                    </div>

                                  </div>

                                )}

                              </div>

                            </div>

                          )}

                        </div>

                      )}
                      {/* =================================================
    TARGET ASSIGNMENT - CITY ADMIN
================================================= */}

                      {isCityAdmin && (
                        <Link
                          href="/city/targets"
                          title="Target Assignment"
                          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${pathname.startsWith('/city/targets')
                            ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-500/20'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                        >
                          <Target
                            size={16}
                            className={`shrink-0 ${pathname.startsWith('/city/targets')
                              ? 'text-white'
                              : 'text-slate-500'
                              }`}
                          />

                          <span
                            className={`text-left leading-snug ${sidebarCollapsed ? 'lg:hidden' : ''
                              }`}
                          >
                            Target Assignment
                          </span>
                        </Link>
                      )}

                    </div>

                  )}

              </div>
            )}


            {/* =================================================
                ACTIVE MODULE TITLE
            ================================================= */}

            {(hasTaskforceAccess ||
              hasSwachhAccess ||
              hasWorkforceAccess ||
              isCityAdmin) && (

                <div className={`px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4 mb-1 ${sidebarCollapsed ? 'lg:hidden' : ''
                  }`}>
                  Active Module
                </div>

              )}
            {/* =================================================
    ATTENDANCE ANALYTICS - CITY ADMIN
================================================= */}

            {isCityAdmin && (
              <Link
                href="/city/attendance"
                title="Attendance Analytics"
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${pathname.startsWith('/city/attendance')
                  ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-500/20'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
              >
                <ChartNoAxesCombined
                  size={18}
                  className={`shrink-0 ${pathname.startsWith('/city/attendance')
                    ? 'text-white'
                    : 'text-slate-500'
                    }`}
                />

                <span className={`text-left leading-snug ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  Attendance Analytics
                </span>
              </Link>
            )}


            {/* =================================================
    ULB OFFICER WORKSPACE
================================================= */}

            {isUlbUser && (
              <div className="flex flex-col gap-1.5">

                {/* DASHBOARD */}

                <Link
                  href="/ulb/dashboard"
                  title="Dashboard"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${pathname === '/ulb/dashboard'
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <LayoutDashboard size={15} className="shrink-0" />

                  <span className={sidebarCollapsed ? 'lg:hidden' : ''}>
                    Dashboard
                  </span>
                </Link>

                <Link
                  href="/ulb/map-view-dashboard"
                  title="Map View Dashboard"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${pathname.startsWith('/ulb/map-view-dashboard')
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <Map size={15} className="shrink-0" />

                  <span className={sidebarCollapsed ? 'lg:hidden' : ''}>
                    Map View Dashboard
                  </span>
                </Link>


                <Link
                  href="/ulb/attendance"
                  title="Attendance Analytics"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${pathname.startsWith('/ulb/attendance') || pathname.startsWith('/city/attendance')
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <ChartNoAxesCombined size={15} className="shrink-0" />

                  <span className={sidebarCollapsed ? 'lg:hidden' : ''}>
                    Attendance Analytics
                  </span>
                </Link>


                {/* INSPECTION AND PERFORMANCE */}

                <Link
                  href="/ulb/inspection-performance"
                  title="Inspection and Performance"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${pathname.startsWith('/ulb/inspection-performance')
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <ShieldCheck size={15} className="shrink-0" />

                  <span className={sidebarCollapsed ? 'lg:hidden' : ''}>
                    Inspection and Performance
                  </span>
                </Link>


                {/* WARD RANKING */}

                <Link
                  href="/ulb/ward-ranking"
                  title="Ward Ranking"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${pathname.startsWith('/ulb/ward-ranking')
                    ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <Award size={15} className="shrink-0" />

                  <span className={sidebarCollapsed ? 'lg:hidden' : ''}>
                    Ward Ranking
                  </span>
                </Link>

              </div>
            )}


            {/* =================================================
                INSPECTION & PERFORMANCE SYSTEM
            ================================================= */}

            {hasTaskforceAccess && !isUlbUser && (

              <div className="flex flex-col">

                <button
                  type="button"
                  title="Inspection & Performance System"
                  onClick={() =>
                    handleMenuClick(setTaskforceOpen)
                  }
                  className={`flex items-center justify-between w-full px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${isTaskforceActive
                    ? 'bg-blue-50 text-blue-700 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <div className="flex items-center gap-3 text-left min-w-0">

                    <ShieldCheck
                      size={18}
                      className={`shrink-0 ${isTaskforceActive
                        ? 'text-blue-600'
                        : 'text-slate-500'
                        }`}
                    />

                    <span className={`text-left leading-snug ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                      Inspection & Performance System
                    </span>

                  </div>


                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform duration-200 ${sidebarCollapsed ? 'lg:hidden' : ''} ${taskforceOpen
                      ? 'rotate-180 text-blue-600'
                      : 'text-slate-400'
                      }`}
                  />

                </button>


                {taskforceOpen && (

                  <div className={`ml-4 mt-1 pl-3 border-l-2 border-blue-200 flex flex-col gap-1.5 ${sidebarCollapsed ? 'lg:hidden' : ''
                    }`}>

                    {/* DASHBOARD */}

                    <Link
                      href="/city"
                      title="Dashboard"
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${pathname ===
                        '/city'
                        ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                      <LayoutDashboard
                        size={15}
                        className={
                          pathname ===
                            '/city'
                            ? 'text-white'
                            : 'text-slate-400'
                        }
                      />

                      <span>
                        Dashboard
                      </span>
                    </Link>


                    {/* MODULES */}

                    <div className="flex flex-col">

                      <button
                        type="button"
                        onClick={() =>
                          setModulesSubOpen(
                            (prev) =>
                              !prev
                          )
                        }
                        className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${pathname.startsWith(
                          '/modules'
                        ) ||
                          pathname ===
                          '/city/modules'
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 text-left min-w-0">

                          <Package
                            size={15}
                            className={`shrink-0 ${pathname.startsWith(
                              '/modules'
                            ) ||
                              pathname ===
                              '/city/modules'
                              ? 'text-blue-600'
                              : 'text-slate-400'
                              }`}
                          />

                          <span className="text-left leading-snug">
                            Modules
                          </span>

                        </div>


                        <ChevronDown
                          size={14}
                          className={`shrink-0 transition-transform duration-200 ${modulesSubOpen
                            ? 'rotate-180 text-blue-600'
                            : 'text-slate-400'
                            }`}
                        />

                      </button>


                      {modulesSubOpen && (

                        <div className="ml-3 mt-1 pl-2.5 border-l border-blue-200 flex flex-col gap-1">

                          {userModuleItems.map(
                            (sub) => (

                              <Link
                                key={
                                  sub.name
                                }
                                href={
                                  sub.href
                                }
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${sub.isActive
                                  ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                              >
                                <span
                                  className={
                                    sub.isActive
                                      ? 'text-white'
                                      : 'text-slate-400'
                                  }
                                >
                                  {
                                    sub.icon
                                  }
                                </span>

                                <span>
                                  {
                                    sub.name
                                  }
                                </span>
                              </Link>

                            )
                          )}

                        </div>

                      )}

                    </div>

                  </div>

                )}

              </div>

            )}


            {/* =================================================
                WARD RANKING SYSTEM
            ================================================= */}

            {(hasSwachhAccess || isCityAdmin) && (

              <div className="flex flex-col">

                <button
                  type="button"
                  title={isCityAdmin ? 'Ward Ranking' : 'Ward Ranking System'}
                  onClick={() => {
                    if (isCityAdmin) {
                      router.push('/ulb/ward-ranking');
                      return;
                    }

                    handleMenuClick(setSwachhOpen);
                  }}
                  className={`flex items-center justify-between w-full px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${isSwachhActive
                    ? 'bg-purple-50 text-purple-700 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <div className="flex items-center gap-3 text-left min-w-0">

                    <Building2
                      size={18}
                      className={`shrink-0 ${isSwachhActive
                        ? 'text-purple-600'
                        : 'text-slate-500'
                        }`}
                    />

                    <span className={`text-left leading-snug ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                      {isCityAdmin ? 'Ward Ranking' : 'Ward Ranking System'}
                    </span>

                  </div>


                  {isCityAdmin ? (
                    <ChevronRight
                      size={16}
                      className={`shrink-0 text-slate-400 ${sidebarCollapsed ? 'lg:hidden' : ''}`}
                    />
                  ) : (
                    <ChevronDown
                      size={16}
                      className={`shrink-0 transition-transform duration-200 ${sidebarCollapsed ? 'lg:hidden' : ''} ${swachhOpen
                        ? 'rotate-180 text-purple-600'
                        : 'text-slate-400'
                        }`}
                    />
                  )}

                </button>


                {swachhOpen && !isCityAdmin && (

                  <div className={`ml-4 mt-1 pl-3 border-l-2 border-purple-200 flex flex-col gap-2 ${sidebarCollapsed ? 'lg:hidden' : ''
                    }`}>

                    {swachhGroups.map(
                      (grp) => (

                        <div
                          key={
                            grp.group
                          }
                          className="flex flex-col gap-1"
                        >

                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1 px-1">
                            {
                              grp.group
                            }
                          </div>


                          {grp.items.map(
                            (sub) => (

                              <Link
                                key={
                                  sub.name
                                }
                                href={
                                  sub.href
                                }
                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${sub.isActive
                                  ? 'bg-purple-600 text-white font-bold shadow-sm shadow-purple-500/20'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                              >
                                <span
                                  className={
                                    sub.isActive
                                      ? 'text-white'
                                      : 'text-slate-400'
                                  }
                                >
                                  {
                                    sub.icon
                                  }
                                </span>

                                <span>
                                  {
                                    sub.name
                                  }
                                </span>
                              </Link>

                            )
                          )}

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

            )}


            {/* =================================================
                WORKFORCE ATTENDANCE SYSTEM
            ================================================= */}

            {hasWorkforceAccess && (

              <div className="flex flex-col">

                <button
                  type="button"
                  title="Workforce Attendance System"
                  onClick={() =>
                    handleMenuClick(setWorkforceOpen)
                  }
                  className={`flex items-center justify-between w-full px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${isWorkforceActive
                    ? 'bg-cyan-50 text-cyan-700 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <div className="flex items-center gap-3 text-left min-w-0">

                    <Users
                      size={18}
                      className={`shrink-0 ${isWorkforceActive
                        ? 'text-cyan-600'
                        : 'text-slate-500'
                        }`}
                    />

                    <span className={`text-left leading-snug ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                      Workforce Attendance System
                    </span>

                  </div>


                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${sidebarCollapsed ? 'lg:hidden' : ''} ${workforceOpen
                      ? 'rotate-180 text-cyan-600'
                      : 'text-slate-400'
                      }`}
                  />

                </button>


                {workforceOpen && (

                  <div className={`ml-4 mt-1 pl-3 border-l-2 border-cyan-200 flex flex-col gap-2 ${sidebarCollapsed ? 'lg:hidden' : ''
                    }`}>

                    {workforceGroups.map(
                      (grp) => (

                        <div
                          key={
                            grp.group
                          }
                          className="flex flex-col gap-1"
                        >

                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1 px-1">
                            {
                              grp.group
                            }
                          </div>


                          {grp.items.map(
                            (sub) => (

                              <Link
                                key={
                                  sub.name
                                }
                                href={
                                  sub.href
                                }
                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${sub.isActive
                                  ? 'bg-cyan-600 text-white font-bold shadow-sm shadow-cyan-500/20'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                              >
                                <span
                                  className={
                                    sub.isActive
                                      ? 'text-white'
                                      : 'text-slate-400'
                                  }
                                >
                                  {
                                    sub.icon
                                  }
                                </span>

                                <span>
                                  {
                                    sub.name
                                  }
                                </span>
                              </Link>

                            )
                          )}

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

            )}

          </nav>

        </div>


        {/* =====================================================
            LOGOUT & PROFILE & EXPAND TOGGLE
        ===================================================== */}

        <div className="flex flex-col gap-2.5 border-t border-slate-200 pt-4 mt-6">

          {/* Expand Button: ONLY visible on desktop when sidebar is collapsed */}
          {sidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="hidden lg:flex h-9 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-xs cursor-pointer"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={18} className="text-blue-600" />
            </button>
          )}

          <button
            onClick={toggleDarkMode}
            className={`flex items-center justify-center w-full py-2.5 px-4 rounded-xl transition-all shadow-sm bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={20} className="shrink-0" /> : <Moon size={20} className="shrink-0" />}
          </button>

          <Link
            href="/portal-home/profile"
            title="My Profile"
            className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 font-bold text-sm rounded-xl transition-all shadow-sm ${pathname === '/portal-home/profile' || pathname === '/profile'
              ? 'bg-blue-600 text-white shadow-blue-500/20'
              : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
              } ${sidebarCollapsed ? 'lg:px-0 lg:justify-center' : ''}`}
          >
            <UserCheck size={16} className="shrink-0" />
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>My Profile</span>
          </Link>

          <button
            onClick={handleLogout}
            className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-rose-50 border border-rose-200 text-rose-600 font-extrabold text-sm rounded-xl hover:bg-rose-100 transition-all shadow-sm cursor-pointer ${sidebarCollapsed ? 'lg:px-0 lg:justify-center' : ''
              }`}
            title="Sign out of portal"
          >
            <LogOut size={16} className="shrink-0" />
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Logout</span>
          </button>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main
        className={`portal-main-content min-h-screen text-slate-800 transition-all duration-300 w-full min-w-0 ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-72'
          }`}
      >
        <div className="p-3 sm:p-5 lg:p-6 w-full min-h-full">
          {!isMainDashboard && (

            <div
              className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-white px-6 py-3.5 rounded-2xl border border-slate-800/80 shadow-lg sticky top-3 z-30 transition-all overflow-hidden relative"
              style={{
                background:
                  'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              }}
            >

              {/* SUBTLE GLOW */}

              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />


              <div className="z-10">

                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-400 flex items-center gap-1.5 mb-0.5">

                  <ShieldCheck
                    size={13}
                    className="text-blue-400"
                  />

                  MATRIXTRACK 2.0

                </div>


                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                  {pageTitle}
                </h1>

              </div>


              {user && (

                <div className="flex items-center gap-5 z-10">


                  {/* LIVE CLOCK */}

                  <div className="hidden sm:flex flex-col items-end gap-1 px-1">

                    <span className="inline-flex items-center gap-2 text-emerald-400 font-extrabold text-[11px] bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30 w-fit shadow-sm">

                      <span className="relative flex h-2 w-2">

                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />

                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />

                      </span>

                      <span className="relative">
                        LIVE
                      </span>

                    </span>


                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                      {clockStr}
                    </span>

                  </div>


                  {/* USER */}

                  <Link
                    href="/portal-home/profile"
                    className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 shadow-sm px-3.5 py-1.5 rounded-[16px] shrink-0 hover:bg-white/15 transition-all cursor-pointer text-left no-underline"
                    title="Click to view user profile"
                  >

                    <div className="w-8 h-8 rounded-[10px] bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shrink-0">
                      {
                        userInitial
                      }
                    </div>


                    <div className="flex flex-col min-w-0">

                      <span className="text-[12px] font-bold text-white truncate leading-tight">
                        {
                          displayName
                        }
                      </span>

                      <span className="text-[10px] font-medium text-slate-300 truncate leading-tight mt-0.5">
                        {
                          roleLabelText
                        }
                      </span>

                    </div>

                  </Link>

                </div>

              )}

            </div>

          )}


          <div
            key={
              pathname
            }
            className="relative z-10 animate-page-entrance"
          >
            {
              children
            }
          </div>
        </div>

      </main>

    </div>
  );
}


export default function PortalHomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-slate-50 items-center justify-center">
          <div className="text-sm font-bold text-slate-500">
            Loading Portal...
          </div>
        </div>
      }
    >
      <PortalHomeLayoutContent>
        {children}
      </PortalHomeLayoutContent>
    </Suspense>
  );
}
