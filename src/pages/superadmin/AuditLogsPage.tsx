import React, { useState } from 'react';
import { AuditLogEvent, City } from '../../types';
import { generateCsv, downloadCsv } from '../../services/csv';
import { Search, Filter, Download, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';

interface AuditLogsPageProps {
  auditLogs: AuditLogEvent[];
  cities: City[];
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({
  auditLogs,
  cities
}) => {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = auditLogs.filter(log => {
    if (cityFilter !== 'all' && log.cityId !== cityFilter) return false;
    if (moduleFilter !== 'all' && log.moduleOrProduct !== moduleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return log.action.toLowerCase().includes(q) ||
             log.actorName.toLowerCase().includes(q) ||
             log.details.toLowerCase().includes(q) ||
             log.actorRole.toLowerCase().includes(q);
    }
    return true;
  });

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Action', 'Actor_Name', 'Actor_Role', 'City', 'Module', 'Platform', 'Details'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      l.action,
      l.actorName,
      l.actorRole,
      l.cityName || 'Global',
      l.moduleOrProduct,
      l.platform,
      l.details
    ]);
    downloadCsv(`audit_logs_${Date.now()}.csv`, generateCsv(headers, rows));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Governance & Mutation Audit Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable system activity log tracking administrative decisions, escalations, and credential updates.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor, or keyword..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="all">All Cities</option>
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium capitalize"
          >
            <option value="all">All Modules / Products</option>
            <option value="city_directory">City Directory</option>
            <option value="sweeping">Sweeping</option>
            <option value="cleanliness_issues">Cleanliness Grievances</option>
            <option value="attendance">Attendance</option>
            <option value="geography">Geography</option>
            <option value="trash_restore">Trash & Restore</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Timestamp (IST)</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Actor & Role</th>
                <th className="px-5 py-3">City / Module</th>
                <th className="px-5 py-3">Platform</th>
                <th className="px-5 py-3 text-right">Details & Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 font-mono text-slate-500 text-[15px] whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-800">
                        {log.action}
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900">{log.actorName}</div>
                        <div className="text-[15px] text-slate-400 font-mono">{log.actorRole}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-800 font-medium">{log.cityName || 'Global'}</div>
                        <div className="text-[15px] text-slate-400 font-mono capitalize">{log.moduleOrProduct}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-[15px] text-slate-500 uppercase">
                        {log.platform}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Diff Section */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={6} className="px-6 py-4 space-y-3">
                          <p className="text-xs text-slate-800 font-medium">
                            <strong>Summary:</strong> {log.details}
                          </p>

                          {(log.changesBefore || log.changesAfter) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[15px] font-mono">
                              <div className="p-3 bg-white border border-rose-200 rounded-lg">
                                <span className="font-bold text-rose-800 block mb-1">State Before:</span>
                                <pre className="text-rose-950 overflow-x-auto">
                                  {JSON.stringify(log.changesBefore, null, 2) || 'None'}
                                </pre>
                              </div>
                              <div className="p-3 bg-white border border-emerald-200 rounded-lg">
                                <span className="font-bold text-emerald-800 block mb-1">State After:</span>
                                <pre className="text-emerald-950 overflow-x-auto">
                                  {JSON.stringify(log.changesAfter, null, 2) || 'None'}
                                </pre>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
