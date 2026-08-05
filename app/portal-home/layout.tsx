'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { setAuthCookie } from '@lib/auth';

export default function PortalHomeLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [clockStr, setClockStr] = useState('');
  
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

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'hms_super_admin' || (user?.roles || []).includes('hms_super_admin') || (user?.roles || []).includes('HMS_SUPER_ADMIN');
  const displayName = user?.name || 'User';
  const roleLabelText = user?.role ? roleLabel(user.role) : '';
  const cityName = user?.city ? user.city.name : '';
  const userInitial = displayName.charAt(0).toUpperCase();

  const userRoles = user?.roles || [];
  const hasTaskforceAccess = isSuperAdmin || userRoles.includes('taskforce') || userRoles.includes('TASKFORCE_ADMIN') || userRoles.includes('CITY_ADMIN');
  const hasSwachhAccess = isSuperAdmin || userRoles.includes('swachh') || userRoles.includes('SWACHH_ADMIN');
  const hasWorkforceAccess = isSuperAdmin || userRoles.includes('workforce') || userRoles.includes('WORKFORCE_ADMIN');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  let pageTitle = `${getGreeting()}, ${displayName}!`;
  if (pathname.includes('/onboard-city')) pageTitle = 'City Deployment Control';
  if (pathname.includes('/city-directory')) pageTitle = 'City Directory';
  if (pathname.includes('/common-registration')) pageTitle = 'Integrated Employee Registration';
  if (pathname.includes('/admin-management')) pageTitle = 'Enterprise User & RBAC Governance Center';

  return (
    <div className="flex min-h-screen bg-slate-50/50">
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
      <aside className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between p-5 min-h-screen sticky top-0 h-screen overflow-y-auto scrollbar-hide">
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
              <div className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">
                Enterprise Portal
              </div>
            </div>
          </Link>

          <nav className="flex flex-col gap-2">
            <div className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              Navigation Menu
            </div>
            <Link
              href="/portal-home"
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                pathname === '/portal-home'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard size={18} className={pathname === '/portal-home' ? 'text-white' : 'text-slate-500'} />
              <span>Home</span>
            </Link>

            {isSuperAdmin && (
              <>
                <Link
                  href="/portal-home/onboard-city"
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    pathname.includes('/onboard-city')
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Building2 size={18} className={pathname.includes('/onboard-city') ? 'text-white' : 'text-slate-500'} />
                  <span>Onboard New City</span>
                </Link>
                <Link
                  href="/portal-home/city-directory"
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    pathname.includes('/city-directory')
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Globe size={18} className={pathname.includes('/city-directory') ? 'text-white' : 'text-slate-500'} />
                  <span>City Directory</span>
                </Link>
              </>
            )}

            <Link
              href="/portal-home/common-registration"
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                pathname.includes('/common-registration')
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <UserCheck2 size={18} className={pathname.includes('/common-registration') ? 'text-white' : 'text-slate-500'} />
              <span>Employee Registration</span>
            </Link>

            <Link
              href="/portal-home/admin-management"
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                pathname.includes('/admin-management')
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShieldCheck size={18} className={pathname.includes('/admin-management') ? 'text-white' : 'text-slate-500'} />
              <span>Admin Access Manager</span>
            </Link>

            {/* WORKSPACES */}
            {(hasTaskforceAccess || hasSwachhAccess || hasWorkforceAccess) && (
              <div className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2 mb-1">
                Active Workspaces
              </div>
            )}
            
            {hasTaskforceAccess && (
              <Link
                href="/city"
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900`}
              >
                <ShieldCheck size={18} className="text-slate-500" />
                <span>Taskforce Workspace</span>
              </Link>
            )}

            {hasSwachhAccess && (
              <Link
                href="/ward-ranking"
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900`}
              >
                <Building2 size={18} className="text-slate-500" />
                <span>Swachh Sync Workspace</span>
              </Link>
            )}

            {hasWorkforceAccess && (
              <Link
                href="/workforce-monitoring"
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900`}
              >
                <UserCheck2 size={18} className="text-slate-500" />
                <span>Workforce Workspace</span>
              </Link>
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

      <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:px-7 sm:py-5 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-2 mb-1">
              <ShieldCheck size={15} className="text-blue-600" /> MATRIXTRACK 2.0 
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
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
