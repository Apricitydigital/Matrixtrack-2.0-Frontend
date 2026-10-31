import {ThemeToggle} from '../common/ThemeToggle';
import {BrandLogo} from '../common/BrandLogo';
import React from 'react';
import { RoleType, User, City } from '../../types';
import { Bell, Shield, MapPin, RotateCcw, Menu } from 'lucide-react';
import { matrixStore } from '../../services/store';

interface HeaderProps {
  currentRole: RoleType;
  onRoleChange: (role: RoleType) => void;
  currentUser: User;
  currentCityId: string;
  onCityChange: (cityId: string) => void;
  cities: City[];
  onToggleSidebarMobile: () => void;
  activePageTitle: string;
  availableRoles: RoleType[];
  onLogout: () => void;
  loading: boolean;
  onNotices?: () => void;
  noticeCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  currentUser,
  currentCityId,
  onCityChange,
  cities,
  onToggleSidebarMobile,
  activePageTitle,
  availableRoles,
  onLogout,
  loading,
  onNotices,
  noticeCount = 0
}) => {
  const currentCity = cities.find(c => c.id === currentCityId);

  const roleTitles: Record<RoleType, string> = {
    HMS_SUPER_ADMIN: 'HMS Super Admin',
    CITY_ADMIN: 'City Admin',
    ULB_OFFICER: 'ULB Officer',
    COMMISSIONER: 'Commissioner'
  };

  const redundantName=[roleTitles[currentRole],`${currentCity?.name || ''} ${roleTitles[currentRole]}`].some(label=>label.trim().toLowerCase()===currentUser.name.trim().toLowerCase());
  return (
    <header className="workspace-header h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-40 shrink-0">
      {/* Zone 1: Brand & Mobile Menu Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <a href="#dashboard" className="flex items-center gap-2 text-slate-900 tracking-tight font-bold text-base whitespace-nowrap shrink-0">
          <BrandLogo/>
          <span>MatrixTrack 2.0</span>
        </a>

        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">{activePageTitle}</span>
        </div>
      </div>

      {/* Zone 3: Interactive Demo Controls (Role Switcher, City Switcher, Reset) */}
      <div className="flex items-center gap-2.5 shrink-0">
        {onNotices && <button className="notice-bell" onClick={onNotices} aria-label="Open city briefing"><Bell size={18}/>{noticeCount>0 && <span>{noticeCount>9?'9+':noticeCount}</span>}</button>}
        {/* City Selector for Super Admin or display badge for city-bound roles */}
        {currentRole === 'HMS_SUPER_ADMIN' ? (
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={currentCityId}
              disabled={loading}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-transparent text-slate-800 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Authorized Cities</option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{currentCity?.name || 'Assigned city'}</span>
          </div>
        )}

        {/* Demo Role Switcher Segmented / Dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <Shield className="w-3.5 h-3.5 text-indigo-600 ml-1.5 shrink-0" />
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as RoleType)}
            className="text-xs font-bold text-slate-800 bg-transparent pr-2 py-0.5 focus:outline-none cursor-pointer"
            aria-label="Authorized role"
            disabled={availableRoles.length < 2 || loading}
          >
            {availableRoles.map(role => <option key={role} value={role}>{roleTitles[role]}</option>)}
          </select>
        </div>

        {/* Reset Demo Data Button */}
        {!redundantName&&<span className="hidden 2xl:block max-w-32 truncate text-xs text-slate-600" title={currentUser.email}>{currentUser.name}</span>}
        <button
          onClick={() => { void matrixStore.refresh(); }}
          disabled={loading}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <ThemeToggle/><button onClick={onLogout} className="text-xs text-slate-600 px-2 py-1 rounded hover:bg-slate-100" title={currentUser.email}>Sign out</button>
      </div>
    </header>
  );
};
