'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HmsKpiCards from "@components/ui/HmsKpiCards";
import { useAuth } from '@hooks/useAuth';
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
    <div className="space-y-8">
      {/* 1. TOP FAST KPI CARDS (PRESERVED & UNTOUCHED ON TOP) */}
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
                            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                              isLive
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

              <button
                type="button"
                onClick={() => router.push('/portal-home/admin-management')}
                className="text-xs font-extrabold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
              >
                Manage Access <ArrowRight size={14} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
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
        <UnifiedExecutiveDashboard
          isSuperAdmin={isSuperAdmin}
          userRoles={userRoles}
          userCityName={userCityName}
          workspaceUrl="/city"
          enableTaskforceData={true}
          enableWardRankingData={true}
        />
      </div>
    </div>
  );
}
