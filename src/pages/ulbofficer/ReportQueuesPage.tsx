import React, { useState, useEffect } from 'react';
import { OperationalReport, City, User, InspectionStatus } from '../../types';
import { OperationalFilters } from '../../components/common/OperationalFilters';
import { emptyFilters, matchesFilters, MODULE_LABELS, ROLE_LABELS } from '../../services/presentation';
import { matrixStore } from '../../services/store';
import { StatusBadge } from '../../components/common/Badge';
import { generateCsv, downloadCsv } from '../../services/csv';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Download,
  Eye,
  MapPin,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface ReportQueuesPageProps {
  city: City;
  reports: OperationalReport[];
  defaultQueue: 'all' | InspectionStatus;
  currentUser: User;
  onSelectReport: (reportId: string) => void;
  onRefresh: () => void;
}

export const ReportQueuesPage: React.FC<ReportQueuesPageProps> = ({
  city,
  reports,
  defaultQueue,
  currentUser,
  onSelectReport,
  onRefresh
}) => {
  const [activeQueue, setActiveQueue] = useState<InspectionStatus | 'all'>(defaultQueue);
  const [filters, setFilters] = useState(emptyFilters);
  useEffect(() => { setActiveQueue(defaultQueue); setFilters(emptyFilters()); }, [defaultQueue, city.id]);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');

  const cityReports = reports.filter(r => r.cityId === city.id);

  const filteredReports = cityReports.filter(r => {
    if (activeQueue !== 'all' && r.status !== activeQueue) return false;
    if (!matchesFilters(r, filters, [r.reportNumber, r.assetName, r.submittedByName, r.assignedDarogaName || ''])) return false;
    if (moduleFilter !== 'all' && r.moduleId !== moduleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.reportNumber.toLowerCase().includes(q) ||
             r.assetName.toLowerCase().includes(q) ||
             r.submittedByName.toLowerCase().includes(q) ||
             (r.assignedDarogaName && r.assignedDarogaName.toLowerCase().includes(q));
    }
    return true;
  });

  const handleExportCsv = () => {
    const headers = ['Report_Number', 'Module', 'Asset_Name', 'Ward_ID', 'Submitted_By', 'Date', 'Score', 'Status', 'Assignee', 'Escalation_Reason'];
    const rows = filteredReports.map(r => [
      r.reportNumber,
      r.moduleId,
      r.assetName,
      r.wardId,
      r.submittedByName,
      r.inspectionDate,
      r.overallScore,
      r.status,
      r.assignedDarogaName || 'N/A',
      r.escalationReason || 'None'
    ]);
    downloadCsv(`report_queue_${activeQueue}_${city.cityCode}_${Date.now()}.csv`, generateCsv(headers, rows));
  };

  const queueCounts = {
    approved: cityReports.filter(r => r.status === 'approved').length,
    rejected: cityReports.filter(r => r.status === 'rejected').length,
    action_required: cityReports.filter(r => r.status === 'action_required').length,
    action_taken: cityReports.filter(r => r.status === 'action_taken').length
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              Operational Inspection Queues & Escalations
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded uppercase">
              {activeQueue.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Separate review queues with full report dossiers, Sanitary Inspector spot check results, and intervention controls.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Queue CSV</span>
        </button>
      </div>

      {/* Segmented Queue Selector */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold text-slate-500">
        {[
          { id: 'all', label: `All reports (${cityReports.length})`, icon: Filter },
          { id: 'pending_review', label: `Pending review (${cityReports.filter(r => r.status === 'pending_review').length})`, icon: Clock },
          { id: 'approved', label: `Approved Reports (${queueCounts.approved})`, icon: CheckCircle2 },
          { id: 'rejected', label: `Rejected Reports (${queueCounts.rejected})`, icon: XCircle },
          { id: 'action_required', label: `Action Required (${queueCounts.action_required})`, icon: AlertTriangle },
          { id: 'action_taken', label: `Action Taken (${queueCounts.action_taken})`, icon: RotateCcw }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeQueue === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveQueue(tab.id as any)}
              className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <OperationalFilters value={filters} onChange={setFilters} zones={matrixStore.getZones(city.id)} wards={matrixStore.getWards(city.id)} users={matrixStore.getUsers(city.id)} statuses={['pending_review','approved','rejected','action_required','action_taken','escalated']} resultCount={filteredReports.length} />

      {/* Reports Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Report Number</th>
                <th className="px-5 py-3">Module & Asset</th>
                <th className="px-5 py-3">Submitting Officer</th>
                <th className="px-5 py-3">Assigned Daroga</th>
                <th className="px-5 py-3">Inspection Score</th>
                <th className="px-5 py-3 text-right">Dossier & Escalation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No inspection reports currently in the {activeQueue.replace(/_/g, ' ')} queue.
                  </td>
                </tr>
              ) : (
                filteredReports.map(rep => (
                  <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold font-mono text-slate-900">{rep.reportNumber}</div>
                      <div className="text-[15px] text-slate-400 font-mono">{rep.submittedAt}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{rep.assetName}</div>
                      <div className="text-[15px] uppercase font-mono text-indigo-700">{MODULE_LABELS[rep.moduleId]}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800">{rep.submittedByName}</div>
                      <div className="text-[15px] text-slate-400 font-mono">{ROLE_LABELS[rep.submittedByRole]}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {rep.assignedDarogaName || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {rep.overallScore == null ? 'Not supplied' : `${rep.overallScore} / 100`}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => onSelectReport(rep.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
