import React from 'react';
import { City, User, OperationalReport, IecCleanlinessIssue } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/Badge';
import { Building2, Users, Layers, AlertCircle, CheckCircle2, ShieldCheck, ArrowUpRight } from 'lucide-react';

interface GlobalDashboardProps {
  cities: City[];
  users: User[];
  reports: OperationalReport[];
  iecIssues: IecCleanlinessIssue[];
  onNavigate: (pageId: string) => void;
  onSelectReport: (reportId: string) => void;
  onSelectIssue: (issue: IecCleanlinessIssue) => void;
}

export const GlobalDashboard: React.FC<GlobalDashboardProps> = ({
  cities,
  users,
  reports,
  iecIssues,
  onNavigate,
  onSelectReport,
  onSelectIssue
}) => {
  const activeCities = cities.filter(c => c.status === 'active');
  const inactiveCities = cities.filter(c => c.status === 'inactive');
  const pendingUsers = users.filter(u => u.status === 'pending_approval');
  const openCleanlinessIssues = iecIssues.filter(i => i.status !== 'approved_closed');
  const approvedReports = reports.filter(r => r.status === 'approved');
  const rejectedReports = reports.filter(r => r.status === 'rejected');
  const actionRequiredReports = reports.filter(r => r.status === 'action_required');

  const totalUrbanPop = cities.reduce((acc, c) => acc + (c.population || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Statewide Municipal Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Executive governance oversight across all authorized Urban Local Bodies (ULBs).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('sa_cities_dir')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors"
          >
            <span>Onboard Municipal Corporation</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Municipal Corporations"
          value={cities.length}
          denominator={`${activeCities.length} Active`}
          subtitle={`${inactiveCities.length} Inactive · ${(totalUrbanPop / 1000000).toFixed(1)}M Urban Pop`}
          icon={<Building2 className="w-4 h-4 text-indigo-600" />}
          onClick={() => onNavigate('sa_cities_dir')}
        />
        <StatCard
          label="Registered Personnel"
          value={users.length}
          denominator={`${pendingUsers.length} Pending Approval`}
          subtitle="Darogas, SIs, Officers & Field Workers"
          icon={<Users className="w-4 h-4 text-emerald-600" />}
          onClick={() => onNavigate('sa_users')}
        />
        <StatCard
          label="90-Day Inspection Volume"
          value={reports.length}
          denominator={`${approvedReports.length} Approved`}
          subtitle={`${rejectedReports.length} Rejected · ${actionRequiredReports.length} Action Req`}
          icon={<Layers className="w-4 h-4 text-blue-600" />}
        />
        <StatCard
          label="Open Cleanliness Grievances"
          value={openCleanlinessIssues.length}
          denominator={`${iecIssues.length} Total`}
          subtitle="Citizen IEC tickets in review/reopening"
          icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
          onClick={() => onNavigate('sa_reg_requests')}
        />
      </div>

      {/* City Comparisons & Coverage Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Cross-City Municipal Coverage & Denominators
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Metrics evaluated with baseline population, active zones, wards, and enabled module availability.
            </p>
          </div>
          <button
            onClick={() => onNavigate('sa_cross_city')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Detailed Analytics →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">City / Corporation</th>
                <th className="px-6 py-3">Codes</th>
                <th className="px-6 py-3">Population</th>
                <th className="px-6 py-3">Zones / Wards</th>
                <th className="px-6 py-3">Active Modules</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cities.map((city) => {
                const cityReports = reports.filter(r => r.cityId === city.id);
                const cityUsers = users.filter(u => u.cityId === city.id);

                return (
                  <tr key={city.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-slate-900">{city.name}</div>
                      <div className="text-[15px] text-slate-500">{city.state} · {city.district}</div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-600">
                      <div>{city.cityCode}</div>
                      <div className="text-[15px] text-slate-400">{city.ulbCode}</div>
                    </td>
                    <td className="px-6 py-3.5 font-mono tabular-nums text-slate-700">
                      {(city.population).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-700">
                      {city.totalZones} Zones · {city.totalWards} Wards
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {city.enabledModules.map(m => (
                          <span key={m} className="px-1.5 py-0.5 text-[15px] font-mono bg-slate-100 text-slate-700 rounded capitalize">
                            {m.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={city.status} size="sm" />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => onNavigate('sa_cities_dir')}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* State Attention & Intervention Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Registration Requests */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Staff Registrations Pending Approval ({pendingUsers.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('sa_reg_requests')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Review All →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingUsers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                All municipal staff registrations are processed.
              </div>
            ) : (
              pendingUsers.map(user => (
                <div key={user.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{user.name}</h4>
                    <p className="text-[15px] text-slate-500 font-mono mt-0.5">
                      Role: {user.role} · Email: {user.email}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('sa_reg_requests')}
                    className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
                  >
                    Action
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cleanliness Issues Requiring Attention */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                High-Priority Cleanliness Tickets ({openCleanlinessIssues.length})
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">24h SLA Active</span>
          </div>

          <div className="divide-y divide-slate-100">
            {openCleanlinessIssues.slice(0, 3).map(issue => (
              <div key={issue.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-slate-900">{issue.ticketNumber}</span>
                    <StatusBadge status={issue.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-600 truncate mt-1">
                    {issue.locationAddress}
                  </p>
                  <p className="text-[15px] text-slate-400 font-mono mt-0.5">
                    Assigned: {issue.assignedDarogaName}
                  </p>
                </div>
                <button
                  onClick={() => onSelectIssue(issue)}
                  className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors shrink-0"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
