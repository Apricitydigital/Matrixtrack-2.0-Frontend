'use client';

import React, { useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import { roleLabel } from '@lib/labels';
import {
  User,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  Layers,
  Sparkles,
  Users,
  Award,
  Factory,
  Home,
  CreditCard,
  Globe,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

interface UserProfileCardProps {
  onClose?: () => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = () => {
  const { user, hydrateUser, loading: authLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'modules' | 'jurisdiction'>('profile');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await hydrateUser();
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleCopyAadhaar = () => {
    const val = user?.aadhaar || user?.id || '';
    if (val) {
      navigator.clipboard.writeText(val);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (authLoading && !user) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[350px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-600">Loading user profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-center text-rose-600 bg-rose-50 rounded-2xl border border-rose-200 font-medium">
        User details not available. Please log in again.
      </div>
    );
  }

  // Filter out module names so ONLY real user roles are displayed
  const rawRoles = user.roles || (user.role ? [user.role] : []);
  const cleanRolesSet = new Set<string>();

  rawRoles.forEach(r => {
    if (!r) return;
    const str = r.toString().toUpperCase();
    if (
      str.includes('ADMIN') ||
      str.includes('QC') ||
      str.includes('CONTROLLER') ||
      str.includes('OFFICER') ||
      str.includes('COMMISSIONER') ||
      str.includes('OFFICIAL') ||
      str.includes('SUPERVISOR') ||
      str.includes('EMPLOYEE')
    ) {
      if (!str.includes('TOILET') && !str.includes('LITTER') && !str.includes('SWEEP') && !str.includes('MRF') && !str.includes('PROCESSING') && !str.includes('WORKFORCE MONITORING')) {
        cleanRolesSet.add(roleLabel(r));
      }
    }
  });

  const cleanRoles = Array.from(cleanRolesSet);
  const primaryRole = cleanRoles.length > 0 ? cleanRoles[0] : roleLabel(user.role || 'User');

  const userInitials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  // STRICTLY ASSIGNED MODULES FROM BACKEND ONLY
  const assignedModules = user.modules || [];

  // Group Assigned Modules into Parent Systems
  const inspectionSubModules = assignedModules.filter(m => {
    const k = (m.key || m.name || '').toUpperCase();
    return k.includes('TOILET') || k.includes('LITTER') || k.includes('SWEEP') || k.includes('TASKFORCE') || k.includes('GVP');
  });

  const workforceSubModules = assignedModules.filter(m => {
    const k = (m.key || m.name || '').toUpperCase();
    return k.includes('WORKFORCE') || k.includes('ATTENDANCE') || k.includes('MATRIX');
  });

  const wardRankingSubModules = assignedModules.filter(m => {
    const k = (m.key || m.name || '').toUpperCase();
    return k.includes('SWACHH') || k.includes('RANKING') || k.includes('WARD');
  });

  const processingSubModules = assignedModules.filter(m => {
    const k = (m.key || m.name || '').toUpperCase();
    return k.includes('PROCESSING') || k.includes('MRF') || k.includes('PLANT');
  });

  const otherSubModules = assignedModules.filter(m => {
    const k = (m.key || m.name || '').toUpperCase();
    return !k.includes('TOILET') && !k.includes('LITTER') && !k.includes('SWEEP') && !k.includes('TASKFORCE') && !k.includes('GVP') &&
           !k.includes('WORKFORCE') && !k.includes('ATTENDANCE') && !k.includes('MATRIX') &&
           !k.includes('SWACHH') && !k.includes('RANKING') && !k.includes('WARD') &&
           !k.includes('PROCESSING') && !k.includes('MRF') && !k.includes('PLANT');
  });

  const getSubModuleLabel = (modKey: string, modName?: string) => {
    const k = (modKey || modName || '').toUpperCase();
    if (k.includes('TOILET')) return 'Cleanliness of Toilets';
    if (k.includes('LITTER')) return 'Litter Bins System';
    if (k.includes('SWEEP')) return 'Sweeping System';
    if (k.includes('TASKFORCE') || k.includes('GVP') || k.includes('CTU')) return 'GVP';
    if (k.includes('WORKFORCE')) return 'Workforce Monitoring (MatrixTrack)';
    if (k.includes('SWACHH') || k.includes('RANKING')) return 'Ward Ranking System';
    if (k.includes('PROCESSING') || k.includes('MRF')) return 'Processing Plant System (MRF)';
    return modName || modKey;
  };

  const displayState = user.stateName || 'Madhya Pradesh';
  const displayDistrict = user.districtName || user.divisionName || user.cityName || 'Indore';

  return (
    <div className="w-full space-y-5 font-sans">

      {/* 1. Top Breadcrumb Bar */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-base font-extrabold text-slate-800 tracking-tight">User Profile</h1>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>/</span>
          <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold">User Profile</span>
        </div>
      </div>

      {/* 2. Cover Banner & Centered Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* Soft Lavender Gradient Waves Cover Banner */}
        <div className="h-28 sm:h-32 w-full bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-300/40 via-purple-300/30 to-transparent pointer-events-none" />
          
          <svg className="absolute bottom-0 left-0 right-0 w-full text-white/40" viewBox="0 0 1440 120" fill="currentColor">
            <path d="M0,32L48,42.7C96,53,192,75,288,80C384,85,480,75,576,64C672,53,768,43,864,48C960,53,1056,75,1152,80C1248,85,1344,75,1392,70L1440,64L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
          </svg>
        </div>

        {/* Profile Header Details (Avatar & Info) */}
        <div className="px-6 pb-5 pt-0 relative">
          
          {/* Centered Overlapping Avatar */}
          <div className="flex flex-col items-center text-center -mt-10 sm:-mt-12">
            <div className="relative">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-0.5 shadow-lg">
                <div className="w-full h-full rounded-full bg-indigo-700 flex items-center justify-center text-xl font-black text-white border-2 border-white">
                  {userInitials}
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow" title="Active Account">
                <CheckCircle2 className="w-3 h-3 text-white stroke-[3]" />
              </div>
            </div>

            {/* Name & Role */}
            <h2 className="mt-2 text-lg sm:text-xl font-black text-slate-800 tracking-tight">{user.name || 'User Profile'}</h2>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full mt-0.5">
              {primaryRole}
            </span>

            {/* Quick Stat Bar */}
            <div className="flex items-center gap-6 sm:gap-10 mt-3 pt-3 border-t border-slate-100 text-center">
              <div>
                <span className="text-base font-black text-slate-800 block">{assignedModules.length}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Modules</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-base font-black text-slate-800 block">{user.cityName || 'City Context'}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ULB Jurisdiction</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-base font-black text-emerald-600 block">ACTIVE</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Status</span>
              </div>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile Info</span>
              </button>

              <button
                onClick={() => setActiveTab('modules')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'modules'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Assigned System Hierarchy ({assignedModules.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('jurisdiction')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === 'jurisdiction'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Jurisdiction Scope</span>
              </button>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-extrabold transition-all shadow-xs active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Realtime'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Personal Details & Identity */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5 lg:col-span-1">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Personal Identity</h3>
              <p className="text-xs text-slate-400">Account holder credentials</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <User className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Full Name</span>
                <span className="font-extrabold text-slate-800 truncate block">{user.name || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Email Address</span>
                <span className="font-semibold text-slate-800 break-all block">{user.email || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Phone className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Mobile Number</span>
                <span className="font-extrabold text-slate-800 block">{user.phone || 'Not Registered'}</span>
              </div>
            </div>

            {/* Aadhaar Number */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <CreditCard className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Aadhaar Number</span>
                  <span className="font-mono font-extrabold text-slate-800 text-[11px] truncate block">
                    {user.aadhaar ? user.aadhaar : 'Not Provided'}
                  </span>
                </div>
              </div>
              {user.aadhaar && (
                <button
                  onClick={handleCopyAadhaar}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
                  title="Copy Aadhaar Number"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* State */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Globe className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">State</span>
                <span className="font-extrabold text-slate-800 block">{displayState}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Column: System Hierarchy Nested Tree Structure */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5 lg:col-span-2">

          {activeTab === 'profile' || activeTab === 'modules' ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">Assigned System Hierarchy</h3>
                    <p className="text-xs text-slate-400">Parent systems with assigned sub-modules nested underneath</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-xs">
                  {assignedModules.length} Active Sub-modules
                </span>
              </div>

              {assignedModules.length > 0 ? (
                <div className="space-y-4">

                  {/* 1. Inspection & Performance System */}
                  {inspectionSubModules.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 overflow-hidden shadow-2xs">
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50/60 border-b border-slate-200/80">
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                            Inspection & Performance System
                          </h4>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold">
                          {inspectionSubModules.length} Sub-modules
                        </span>
                      </div>

                      <div className="p-3.5 space-y-2">
                        {inspectionSubModules.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-blue-300 transition-all">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-xs font-extrabold text-slate-800">
                                {getSubModuleLabel(m.key, m.name)}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                              {m.key || 'CANONICAL'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Workforce Attendance System */}
                  {workforceSubModules.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 overflow-hidden shadow-2xs">
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-50 to-teal-50/60 border-b border-slate-200/80">
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-cyan-600" />
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                            Workforce Attendance System
                          </h4>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-extrabold">
                          {workforceSubModules.length} Sub-modules
                        </span>
                      </div>

                      <div className="p-3.5 space-y-2">
                        {workforceSubModules.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-cyan-300 transition-all">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-cyan-500" />
                              <span className="text-xs font-extrabold text-slate-800">
                                {getSubModuleLabel(m.key, m.name)}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                              {m.key || 'CANONICAL'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Ward Ranking System */}
                  {wardRankingSubModules.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 overflow-hidden shadow-2xs">
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50/60 border-b border-slate-200/80">
                        <div className="flex items-center gap-2.5">
                          <Award className="w-4 h-4 text-purple-600" />
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                            Ward Ranking System
                          </h4>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold">
                          {wardRankingSubModules.length} Sub-modules
                        </span>
                      </div>

                      <div className="p-3.5 space-y-2">
                        {wardRankingSubModules.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-purple-300 transition-all">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-purple-500" />
                              <span className="text-xs font-extrabold text-slate-800">
                                {getSubModuleLabel(m.key, m.name)}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                              {m.key || 'CANONICAL'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Processing Plant System */}
                  {processingSubModules.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 overflow-hidden shadow-2xs">
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50/60 border-b border-slate-200/80">
                        <div className="flex items-center gap-2.5">
                          <Factory className="w-4 h-4 text-amber-600" />
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                            Processing Plant System
                          </h4>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                          {processingSubModules.length} Sub-modules
                        </span>
                      </div>

                      <div className="p-3.5 space-y-2">
                        {processingSubModules.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-amber-300 transition-all">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              <span className="text-xs font-extrabold text-slate-800">
                                {getSubModuleLabel(m.key, m.name)}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                              {m.key || 'CANONICAL'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Additional / Other Assigned Modules */}
                  {otherSubModules.length > 0 && (
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 overflow-hidden shadow-2xs">
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-100 to-slate-200/60 border-b border-slate-200/80">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle className="w-4 h-4 text-slate-600" />
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                            Additional System Privileges
                          </h4>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-extrabold">
                          {otherSubModules.length} Sub-modules
                        </span>
                      </div>

                      <div className="p-3.5 space-y-2">
                        {otherSubModules.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-slate-500" />
                              <span className="text-xs font-extrabold text-slate-800">
                                {getSubModuleLabel(m.key, m.name)}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase">
                              {m.key || 'CANONICAL'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-xs font-semibold text-slate-500">No specific city module restrictions assigned to this user profile.</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">Jurisdiction & Scope</h3>
                    <p className="text-xs text-slate-400">Administrative boundary coverage</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">State</span>
                    <span className="text-sm font-extrabold text-slate-800">{displayState}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">City / ULB</span>
                    <span className="text-sm font-extrabold text-slate-800">{user.cityName || 'All Cities'}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">District / Division</span>
                    <span className="text-sm font-extrabold text-slate-800">{displayDistrict}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-2">Assigned Zone(s)</span>
                  {user.zoneDetails && user.zoneDetails.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {user.zoneDetails.map((z) => (
                        <span key={z.id} className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 font-extrabold">
                          {z.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="font-extrabold text-slate-700">Entire City Jurisdiction (All Zones)</span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-2">Assigned Ward(s)</span>
                  {user.wardDetails && user.wardDetails.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {user.wardDetails.map((w) => (
                        <span key={w.id} className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold">
                          {w.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="font-extrabold text-slate-700">All Wards Access</span>
                  )}
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
