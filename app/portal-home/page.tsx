'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HmsKpiCards from "@components/ui/HmsKpiCards";
import { TableExportDropdown } from '@components/ui/TableExportDropdown';
import { useAuth } from '@hooks/useAuth';
import dynamic from 'next/dynamic';
import {
  ShieldCheck,
  Users,
  Award,
  Globe,
  PlusCircle,
  Building2,
  MapPin,
  Layers,
  UserCheck,
  ChevronRight,
  ArrowRight,
  UserPlus,
  Clock,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import UnifiedExecutiveDashboard from '@modules/taskforce/components/dashboard/UnifiedExecutiveDashboard';
import CityAdminDashboard from './CityAdminDashboard';
import { CityApi, CityUserApi, RegistrationApi } from '@lib/apiClient';
import type { CityRow } from '../../types/api';

export default function PortalHomePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [cities, setCities] = useState<CityRow[]>([]);
  const [cityUsers, setCityUsers] = useState<any[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loadingCities, setLoadingCities] = useState(false);

  const isSuperAdmin =
    user?.role === 'super_admin' ||
    user?.role === 'hms_super_admin' ||
    user?.role === 'SUPER_ADMIN' ||
    (user?.roles || []).includes('hms_super_admin') ||
    (user?.roles || []).includes('HMS_SUPER_ADMIN') ||
    (user?.roles || []).includes('SUPER_ADMIN') ||
    (user?.roles || []).includes('super_admin');

  const isCityAdmin =
    user?.role === 'CITY_ADMIN' ||
    user?.role === 'city_admin' ||
    (user?.roles || []).includes('CITY_ADMIN') ||
    (user?.roles || []).includes('city_admin');

  const userCityName = user?.city ? user.city.name : 'Indore';
  const userRoles = user?.roles || [];

  useEffect(() => {
    async function loadData() {
      setLoadingCities(true);
      try {
        if (isSuperAdmin) {
          const [cityRes, userRes, reqsRes] = await Promise.all([
            CityApi.list().catch(() => ({ cities: [] })),
            CityUserApi.list().catch(() => ({ users: [] })),
            RegistrationApi.listRequests().catch(() => ({ requests: [] })),
          ]);

          setCities(cityRes.cities || []);
          setCityUsers(userRes.users || []);
          const pending = (reqsRes.requests || []).filter((r: any) => r.status === 'PENDING' || !r.status).length;
          setPendingRequestsCount(pending);
        } else {
          const reqsRes = await RegistrationApi.listRequests().catch(() => ({ requests: [] }));
          const pending = (reqsRes.requests || []).filter((r: any) => r.status === 'PENDING' || !r.status).length;
          setPendingRequestsCount(pending);
        }
      } catch (err) {
        console.warn('Portal home load error:', err);
      } finally {
        setLoadingCities(false);
      }
    }

    loadData();
  }, [isSuperAdmin]);

  return (
    <div className="space-y-6">
      {/* 1. GRAND DASHBOARD HERO HEADER (AT VERY TOP ABOVE STATS) */}
      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: 'white', borderRadius: '24px', padding: '26px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 12px 40px -10px rgba(15,23,42,0.6)', position: 'relative', overflow: 'hidden', marginBottom: '20px', flexWrap: 'wrap', gap: '24px' }}>
        {/* Background Glow */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', height: '100%', background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.2), transparent 70%)', pointerEvents: 'none' }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 1, minWidth: '280px' }}>
          <div style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#60a5fa" /> MATRIXTRACK 2.0 • {isSuperAdmin ? 'GLOBAL COMMAND CENTER' : 'CITY COMMAND CENTER'}
          </div>
          
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px', margin: 0, letterSpacing: '-0.02em' }}>
            {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}, {user?.name || 'Admin'} <span style={{ fontSize: '22px' }}>👋</span>
          </h1>

          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontWeight: 500 }}>
            Track inspections, monitor performance & improve city operations
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', padding: '3px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={12} color="#38bdf8" /> {userCityName || 'Indore Municipal Corporation'}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', padding: '3px 10px', borderRadius: '12px' }}>
              {isSuperAdmin ? 'Super Admin' : 'City Admin'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1, flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '8px 14px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={15} color="#94a3b8" />
            <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>{new Date().toISOString().split('T')[0]}</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '6px 14px', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
               <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></div>
               <span style={{ fontSize: '9px', fontWeight: 800, color: '#10b981', letterSpacing: '0.05em' }}>LIVE</span>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginTop: '2px' }}>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
          </div>
        </div>
      </section>

      {/* 2. TOP FAST KPI CARDS (BELOW HERO HEADER) */}
      <HmsKpiCards isSuperAdmin={isSuperAdmin} userCityName={userCityName} />

      {/* 2. SUPER ADMIN HORIZONTAL CITIES ROW & CITY ADMIN DIRECTORY */}
      {isSuperAdmin && (
        <div className="space-y-8 px-4 sm:px-5 lg:px-6">
          {/* HORIZONTAL CITIES ROW */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Globe size={20} className="text-blue-600" />
                  Active Cities ({cities.length})
                </h2>
              </div>

              <button
                type="button"
                onClick={() => router.push('/portal-home/onboard-city')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
              >
                <PlusCircle size={15} /> Create New City
              </button>
            </div>
            {/* Scrollable horizontal cards container */}
            <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-hide">
              {cities.length === 0 && !loadingCities ? (
                <div className="w-full text-center py-8 text-sm font-semibold text-slate-400 bg-white rounded-2xl border border-slate-200/80">
                  No cities found. Click &quot;Create New City&quot; to add one.
                </div>
              ) : (
                cities.map((city) => {
                  const adminCount = (city.cityAdmins?.length ?? 0) || (city.cityAdmin ? 1 : 0);
                  const isLive = city.enabled;

                  return (
                    <div
                      key={city.id}
                      onClick={() => router.push('/portal-home/city-directory')}
                      className="min-w-[260px] max-w-[280px] shrink-0 bg-white border border-slate-200/85 hover:border-blue-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-xs">
                            <Building2 size={18} />
                          </span>

                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${isLive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                          >
                            {isLive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <h3 className="text-lg font-black text-slate-900 truncate">
                          {city.name}
                        </h3>

                        <p className="text-xs font-semibold text-slate-500 mt-1 truncate">
                          {[city.state?.name, city.division?.name, city.district?.name].filter(Boolean).join(' · ') || 'Location pending'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600 flex items-center gap-1.5">
                          <UserCheck size={14} className={adminCount > 0 ? 'text-blue-600' : 'text-slate-400'} />
                          {adminCount > 0 ? `${adminCount} Admin Assigned` : 'No Admin'}
                        </span>

                        <ChevronRight size={15} className="text-slate-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CITY ADMINS DIRECTORY TABLE */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <UserCheck size={18} className="text-violet-600" />
                  City Admini Overview
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Active admin assigned to manage city.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <TableExportDropdown tableId="city-admin-table" filename="City_Admins_List" title="City Admin Overview Table" />
                <button
                  type="button"
                  onClick={() => router.push('/portal-home/admin-management')}
                  className="text-xs font-extrabold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                >
                  Manage Access <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table id="city-admin-table" className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <th className="py-3 px-4">User Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {cityUsers
                    .filter((u: any) => u.role !== 'SUPER_ADMIN' && u.role !== 'HMS_SUPER_ADMIN')
                    .sort((a: any, b: any) => (a.role === 'CITY_ADMIN' || a.role === 'hms_admin' ? -1 : 1))
                    .slice(0, 6)
                    .map((u: any) => (
                      <tr key={u.id || u.email} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                        <td className="py-3 px-4 text-slate-500">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-violet-50 text-violet-700 border border-violet-200">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* 4. EXECUTIVE ANALYTICS DASHBOARD (CHARTS & WORKSPACE PERFORMANCE) */}
      <div className="px-4 sm:px-5 lg:px-6">
        {isCityAdmin && !isSuperAdmin ? (
          <CityAdminDashboard />
        ) : (
          <UnifiedExecutiveDashboard
            isSuperAdmin={isSuperAdmin}
            userRoles={userRoles}
            userCityName={userCityName}
            workspaceUrl="/city"
            enableTaskforceData={true}
            enableWardRankingData={true}
          />
        )}
      </div>
    </div>
  );
}
