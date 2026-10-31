import {BrandLogo} from '../common/BrandLogo';
import React from 'react';
import {preloadCityAdminPage} from '../../services/cityAdminPagePreload';
import {preloadUlbPage} from '../../services/ulbPagePreload';
import { RoleType, City } from '../../types';
import { ROLE_LABELS } from '../../services/presentation';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  Map,
  FileText,
  AlertCircle,
  Layers,
  Target,
  CalendarCheck,
  BarChart3,
  Trash2,
  Sparkles,
  Briefcase,
  Factory,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  SlidersHorizontal,
  ChevronRight,
  FolderSync,
  MessageSquare
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

interface SidebarProps {
  currentRole: RoleType;
  activePageId: string;
  onNavigate: (pageId: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  pendingRequestCount?: number;
  openIssuesCount?: number;
  city?: City;
}

export function canAccessPage(role: RoleType, pageId: string, city?: City): boolean {
  const listed = getNavGroups(role).some(group => group.items.some(item => item.id === pageId));
  const superCityView = role === 'HMS_SUPER_ADMIN' && pageId.startsWith('ca_') && getNavGroups('CITY_ADMIN').some(group => group.items.some(item => item.id === pageId));
  if (!listed && !superCityView) return false;
  if (city && pageId.startsWith('mod_') && !city.enabledModules.includes(pageId.slice(4) as any)) return false;
  const product = ({ prod_swachh: 'swachh_assessment', prod_workforce: 'workforce_monitoring', prod_plant: 'plant_processing', comm_plant: 'plant_processing' } as const)[pageId];
  if (city && product && role !== 'HMS_SUPER_ADMIN' && !city.enabledProducts.includes(product)) return false;
  return true;
}

  // Navigation structure based on current active role
export function getNavGroups(currentRole: RoleType, pendingRequestCount = 0, openIssuesCount = 0): NavGroup[] {
    switch (currentRole) {
      case 'HMS_SUPER_ADMIN':
        return [
          {
            groupTitle: 'OVERVIEW',
            items: [
              { id: 'sa_dashboard', label: 'Global Dashboard', icon: LayoutDashboard },
              { id: 'sa_cross_city', label: 'Cross-City Overview', icon: BarChart3 }
            ]
          },
          {
            groupTitle: 'CITIES',
            items: [
              { id: 'sa_cities_dir', label: 'City Directory', icon: Building2 },
              { id: 'sa_city_admins', label: 'City Administrators', icon: Users },
              { id: 'sa_module_matrix', label: 'Product & Module Access', icon: Layers }
            ]
          },
          {
            groupTitle: 'PEOPLE AND ACCESS',
            items: [
              { id: 'sa_users', label: 'Registered Users', icon: Users },
              { id: 'sa_reg_requests', label: 'Registration Requests', icon: AlertCircle, badge: pendingRequestCount },
              { id: 'sa_access_matrix', label: 'Access Matrix', icon: ShieldCheck }
            ]
          },
          {
            groupTitle: 'GOVERNANCE',
            items: [
              { id: 'sa_audit_logs', label: 'Audit Logs', icon: FileText },
              { id: 'sa_sessions', label: 'Active Sessions', icon: Clock },
              { id: 'sa_trash_restore', label: 'Trash and Restore', icon: Trash2 }
            ]
          },
          {
            groupTitle: 'CONNECTED PRODUCTS',
            items: [
              { id: 'prod_swachh', label: 'Swachh Assessment', icon: Sparkles },
              { id: 'prod_workforce', label: 'Workforce Monitoring', icon: Briefcase },
              { id: 'prod_plant', label: 'Plant & Processing', icon: Factory }
            ]
          }
        ];

      case 'CITY_ADMIN':
        return [
          {
            groupTitle: 'OVERVIEW',
            items: [
              { id: 'ca_dashboard', label: 'City Administration', icon: LayoutDashboard },
              { id: 'ca_map', label: 'City Operations Map', icon: Map },
              { id: 'ca_daily_reports', label: 'Inspection Reports', icon: FileText },
              { id: 'ca_attention', label: 'Action Required', icon: AlertCircle }
            ]
          },
          {
            groupTitle: 'CITY SETUP & GEOGRAPHY',
            items: [
              { id: 'ca_zones_wards', label: 'Zones & Wards', icon: Building2 },
              { id: 'ca_beats', label: 'Areas and Beats', icon: Layers },
              { id: 'ca_geo_hierarchy', label: 'Geography Hierarchy', icon: Map },
              { id: 'ca_module_dir', label: 'Module Directory', icon: SlidersHorizontal }
            ]
          },
          {
            groupTitle: 'PEOPLE & ASSIGNMENTS',
            items: [
              { id: 'ca_municipal_users', label: 'Municipal Users', icon: Users },
              { id: 'ca_employees', label: 'Employees', icon: Briefcase },
              { id: 'ca_assignments', label: 'Staff Assignments', icon: ShieldCheck },
              { id: 'ca_targets', label: 'Targets & Quotas', icon: Target },
              { id: 'ca_registration_mgmt', label: 'User Registrations', icon: AlertCircle, badge: pendingRequestCount }
            ]
          },
          {
            groupTitle: 'OPERATIONAL MODULES',
            items: [
              { id: 'mod_sweeping', label: 'Sweeping', icon: Layers },
              { id: 'mod_toilets', label: 'Cleanliness of Toilet', icon: Layers },
              { id: 'mod_litter_bins', label: 'Litter Bins', icon: Layers },
              { id: 'mod_nala', label: 'Nala', icon: Layers },
              { id: 'mod_ctu_gvp', label: 'CTU/GVP Transformation', icon: Layers }
            ]
          },
          {
            groupTitle: 'OPERATIONS & ANALYTICS',
            items: [
              { id: 'ca_attendance', label: 'Attendance', icon: CalendarCheck },
              { id: 'ca_inspections', label: 'Inspection Reports', icon: FileText },
              { id: 'ca_ward_ranking', label: 'Ward Ranking', icon: Award },
              { id: 'ca_user_perf', label: 'User Performance', icon: BarChart3 },
              { id: 'ca_inspection_perf', label: 'Inspection Performance', icon: BarChart3 },
              { id: 'ca_iec_oversight', label: 'IEC Cleanliness Oversight', icon: ShieldCheck, badge: openIssuesCount },
              { id: 'ca_exec_summary', label: 'Reports & Exports', icon: FileText },
              { id: 'ca_logs', label: 'Activity logs', icon: FileText }
            ]
          },
          {
            groupTitle: 'CONNECTED PRODUCTS',
            items: [
              { id: 'prod_swachh', label: 'Swachh Assessment', icon: Sparkles },
              { id: 'prod_workforce', label: 'Workforce Monitoring', icon: Briefcase },
              { id: 'prod_plant', label: 'Plant & Processing', icon: Factory }
            ]
          }
        ];

      case 'ULB_OFFICER':
        return [
          {
            groupTitle: 'OPERATIONS COMMAND',
            items: [
              { id: 'ulb_dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
              { id: 'ulb_map', label: 'City Operations Map', icon: Map }
            ]
          },
          {
            groupTitle: 'OPERATIONAL REPORT QUEUES',
            items: [
              {id:'ulb_reports',label:'Inspection Reports',icon:FileText},
              {id:'ulb_pending',label:'Pending SI Review',icon:Clock},
              { id: 'ulb_approved', label: 'Approved Reports', icon: CheckCircle2 },
              { id: 'ulb_rejected', label: 'Rejected Reports', icon: XCircle },
              { id: 'ulb_action_req', label: 'Action Required Queue', icon: AlertCircle, badge: 'Intervene' },
              { id: 'ulb_action_taken', label: 'Action Taken Queue', icon: CheckCircle2 }
            ]
          },
          {
            groupTitle: 'IEC CLEANLINESS WORKFLOW',
            items: [
              { id: 'ulb_iec_issues', label: 'IEC Cleanliness Issues', icon: ShieldCheck, badge: openIssuesCount }
            ]
          },
          {
            groupTitle: 'ANALYTICS & OVERSIGHT',
            items: [
              { id: 'ulb_attendance', label: 'Attendance', icon: CalendarCheck },
              {id:'ulb_user_perf',label:'User Performance',icon:Users},
              { id: 'ulb_inspection_perf', label: 'Inspection Performance', icon: BarChart3 },
              { id: 'ulb_ward_ranking', label: 'Ward Ranking', icon: Award },
              {id:'prod_plant',label:'Plant & Processing',icon:Factory}
            ]
          }
        ];

      case 'COMMISSIONER':
        return [
          {
            groupTitle: 'EXECUTIVE OVERVIEW',
            items: [
              { id: 'comm_dashboard', label: 'City Overview', icon: LayoutDashboard },
              { id: 'comm_map', label: 'City Operations Map', icon: Map },
              { id: 'comm_zone_ward', label: 'Zone Details', icon: Building2 }
            ]
          },
          {
            groupTitle: 'EXECUTIVE OVERSIGHT',
            items: [
              { id: 'comm_iec_oversight', label: 'IEC Cleanliness Oversight', icon: ShieldCheck },
              { id: 'comm_ward_ranking', label: 'Ward Ranking', icon: Award },
              { id: 'comm_attendance', label: 'Attendance', icon: CalendarCheck },
              { id: 'comm_plant', label: 'Plant & Processing', icon: Factory }
            ]
          },
          {
            groupTitle: 'PERFORMANCE BENCHMARKS',
            items: [
              { id: 'comm_user_perf', label: 'User Performance', icon: BarChart3 },
              { id: 'comm_inspection_perf', label: 'Inspection Performance', icon: Target },
              { id: 'comm_exec_summary', label: 'Reports & Exports', icon: FileText },
              { id: 'comm_chat_history', label: 'Chat history', icon: MessageSquare }
            ]
          }
        ];

      default:
        return [];
    }
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activePageId,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  pendingRequestCount = 0,
  openIssuesCount = 0,
  city
}) => {
  const navGroups = getNavGroups(currentRole, pendingRequestCount, openIssuesCount).map(group => ({ ...group, items: group.items.filter(item => canAccessPage(currentRole, item.id, city)) })).filter(group => group.items.length);


  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-50
        w-64 bg-slate-900 border-r border-slate-800 text-slate-300
        flex flex-col shrink-0 transition-transform duration-200 ease-in-out
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Brand Lockup */}
        <div className="h-16 px-5 border-b border-slate-800 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo/>
            <div>
              <span className="font-bold text-white text-sm tracking-tight block">
                MatrixTrack 2.0
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="sidebar-navigation flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <span className="px-3 text-[15px] font-bold tracking-wider text-slate-500 uppercase block mb-1">
                {group.groupTitle}
              </span>
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activePageId === item.id;
                return (
                  <button
                    key={item.id}
                    aria-current={isActive ? "page" : undefined}
                    onMouseEnter={()=>{if(currentRole==='ULB_OFFICER')preloadUlbPage(item.id);else if(currentRole==='CITY_ADMIN')preloadCityAdminPage(item.id);}}
                    onFocus={()=>{if(currentRole==='ULB_OFFICER')preloadUlbPage(item.id);else if(currentRole==='CITY_ADMIN')preloadCityAdminPage(item.id);}}
                    onPointerDown={()=>{if(currentRole==='ULB_OFFICER')preloadUlbPage(item.id);else if(currentRole==='CITY_ADMIN')preloadCityAdminPage(item.id);}}
                    onClick={() => {
                      onNavigate(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[15px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Workspace Context */}
        <div className="p-3 shrink-0 border-t border-slate-800 text-[15px] text-slate-400 bg-slate-950/40">
          <div className="flex items-center justify-between text-slate-300 font-semibold mb-0.5">
            <span>Your workspace</span>

          </div>
          <p className="text-[15px] text-slate-500 leading-tight">
            City operations & oversight
          </p>
        </div>
      </aside>
    </>
  );
};
