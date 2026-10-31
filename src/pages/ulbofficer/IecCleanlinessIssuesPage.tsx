import React, { useState, useEffect } from 'react';
import { IecCleanlinessIssue, City, User } from '../../types';
import { Pagination, usePagination } from '../../components/common/Pagination';
import { OperationalFilters } from '../../components/common/OperationalFilters';
import { emptyFilters, matchesFilters, issueIsOverdue, statusTone } from '../../services/presentation';
import { matrixStore } from '../../services/store';
import { StatusBadge } from '../../components/common/Badge';
import { generateCsv, downloadCsv } from '../../services/csv';
import {
  ShieldCheck,
  RotateCcw,
  History,
  Search,
  Filter,
  Download,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye
} from 'lucide-react';

interface IecCleanlinessIssuesPageProps {
  city: City;
  iecIssues: IecCleanlinessIssue[];
  currentUser: User;
  onSelectIssue: (issue: IecCleanlinessIssue) => void;
  onRefresh: () => void;
}

export const IecCleanlinessIssuesPage: React.FC<IecCleanlinessIssuesPageProps> = ({
  city,
  iecIssues,
  currentUser,
  onSelectIssue,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'reopening' | 'history'>('pending');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);

  useEffect(()=>{void matrixStore.ensurePage('ulb_user_perf');},[city.id]);
  const collection=matrixStore.getCollection('iecIssues');
  const cityIssues = iecIssues.filter(i => i.cityId === city.id);

  // Filter issues based on active tab
  const getTabIssues = () => {
    switch (activeTab) {
      case 'pending':
        return cityIssues.filter(i => i.status === 'pending_review' || i.status === 'action_required');
      case 'reopening':
        return cityIssues.filter(i => i.reopeningRequests.some(r => r.status === 'pending'));
      case 'history':
        return cityIssues.filter(i => i.status === 'approved_closed' || i.status === 'rejected');
      default:
        return cityIssues;
    }
  };

  const filteredIssues = getTabIssues().filter(i => {
    if (!matchesFilters(i, {...filters,ryg:'all'}, [i.ticketNumber,i.locationAddress,i.assignedDarogaName,i.reportedBy])) return false;
    if (filters.ryg !== 'all' && (issueIsOverdue(i) ? 'red' : statusTone(i.status)) !== filters.ryg) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.ticketNumber.toLowerCase().includes(q) ||
             i.locationAddress.toLowerCase().includes(q) ||
             i.assignedDarogaName.toLowerCase().includes(q) ||
             i.reportedBy.toLowerCase().includes(q);
    }
    return true;
  });

  const pagination=usePagination(filteredIssues,JSON.stringify({filters,activeTab,city:city.id}),10);
  const handleExportCsv = () => {
    const headers = ['Ticket_Number', 'Category', 'Priority', 'Status', 'Location', 'Reported_By', 'Assigned_Daroga', 'Cycle_Number', 'SLA_Deadline', 'QC_Decision'];
    const rows = filteredIssues.map(i => [
      i.ticketNumber,
      i.category,
      i.priority,
      i.status,
      i.locationAddress,
      i.reportedBy,
      i.assignedDarogaName,
      i.currentCycle,
      i.deadlineTimestamp,
      i.qcDecision || 'N/A'
    ]);
    downloadCsv(`cleanliness_grievances_${city.cityCode}_${activeTab}_${Date.now()}.csv`, generateCsv(headers, rows));
  };

  const pendingCount = cityIssues.filter(i => i.status === 'pending_review' || i.status === 'action_required').length;
  const reopeningCount = cityIssues.filter(i => i.reopeningRequests.some(r => r.status === 'pending')).length;
  const historyCount = cityIssues.filter(i => i.status === 'approved_closed' || i.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              IEC Cleanliness Issues & Review
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded">
              Inspection deadline monitoring
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review Daroga cleanups, verify Sanitary Inspector spot certifications, and manage IEC member reopening requests.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Grievances CSV</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold text-slate-500">
        {[
          { id: 'pending', label: `1. Pending Field Review (${pendingCount})`, icon: ShieldCheck },
          { id: 'reopening', label: `2. Reopening Requests (${reopeningCount})`, icon: RotateCcw },
          { id: 'history', label: `3. Adjudication History (${historyCount})`, icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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

      <OperationalFilters value={filters} onChange={setFilters} zones={matrixStore.getZones(city.id)} wards={matrixStore.getWards(city.id)} users={matrixStore.getUsers(city.id).filter(u => u.role === 'SUPERVISOR')} statuses={['pending_review','action_required','approved_closed','rejected','reopened']} resultCount={filteredIssues.length} />


      {/* Grievances List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {filteredIssues.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No cleanliness grievances in the {activeTab.replace(/_/g, ' ')} queue.
            </div>
          ) : (
            pagination.rows.map((issue) => (
              <div key={issue.id} className="p-5 flex flex-wrap items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      {issue.ticketNumber}
                    </span>
                    <StatusBadge status={issueIsOverdue(issue) ? "overdue" : issue.status} size="sm" />
                    <span className="text-[15px] uppercase font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">
                      Cycle #{issue.currentCycle}
                    </span>
                    <span className={`text-[15px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                      issue.priority === 'urgent' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {issue.priority==='not_specified'?'Priority not recorded':`${issue.priority} priority`}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{issue.locationAddress}</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      "{issue.complaintDescription}"
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[15px] text-slate-500 font-mono">
                    <span>Reported by: <strong>{issue.reportedBy}</strong></span>
                    <span>·</span>
                    <span>Daroga: <strong>{issue.assignedDarogaName}</strong></span>
                    <span>·</span>
                    <span>Reported: <strong>{new Date(issue.reportedDate).toLocaleDateString('en-IN')}</strong></span>
                    <span>·</span>
                    <span>Sanitary Inspector decision: <strong className="capitalize text-slate-700">{issue.qcDecision || 'Pending'}</strong></span>
                  </div>

                  {issue.reopeningRequests.some(r => r.status === 'pending') && (
                    <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex items-center justify-between">
                      <span>Active IEC member reopening request pending ULB approval</span>
                      <span className="font-mono font-bold text-indigo-600">ID: {issue.reopeningRequests[0].id}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>SLA: {issue.deadlineTimestamp}</span>
                  </span>

                  <button
                    onClick={() => onSelectIssue(issue)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Adjudicate & Inspect Dossier</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Pagination {...pagination} noun="IEC issues"/>
      <div className="server-page-control"><span>{collection.loaded} of {collection.total} issues available</span>{collection.hasMore&&<button disabled={collection.status==='loading'} onClick={()=>void matrixStore.loadMore('iecIssues')}>Load more issues</button>}{collection.status==='error'&&<button onClick={()=>void matrixStore.retryCollection('iecIssues')}>Retry loading issues</button>}</div>
    </div>
  );
};
