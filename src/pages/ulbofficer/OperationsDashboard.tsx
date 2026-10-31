import React from 'react';
import { OperationalReport, IecCleanlinessIssue, City, Zone, Ward, User } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/Badge';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Layers,
  ShieldCheck,
  Award,
  ArrowUpRight,
  TrendingUp,
  Clock
} from 'lucide-react';

interface OperationsDashboardProps {
  city: City;
  reports: OperationalReport[];
  iecIssues: IecCleanlinessIssue[];
  users: User[];
  onNavigate: (pageId: string) => void;
  onSelectReport: (reportId: string) => void;
  onSelectIssue: (issue: IecCleanlinessIssue) => void;
}

export const OperationsDashboard: React.FC<OperationsDashboardProps> = ({
  city,
  reports,
  iecIssues,
  users,
  onNavigate,
  onSelectReport,
  onSelectIssue
}) => {
  const cityReports = reports.filter(r => r.cityId === city.id);
  const cityIec = iecIssues.filter(i => i.cityId === city.id);

  const approved = cityReports.filter(r => r.status === 'approved');
  const rejected = cityReports.filter(r => r.status === 'rejected');
  const pendingReview = cityReports.filter(r => r.status === 'pending_review');
  const actionRequired = cityReports.filter(r => r.status === 'action_required');
  const actionTaken = cityReports.filter(r => r.status === 'action_taken');

  const pendingIec = cityIec.filter(i => i.status === 'pending_review');
  const reopeningReqs = cityIec.flatMap(i => i.reopeningRequests.filter(r => r.status === 'pending'));

  // Daroga performance rankings
  const darogaList = users.filter(u => u.role === 'SUPERVISOR' && (!u.cityId || u.cityId === city.id));
  const darogaStats = darogaList.map(d => {
    const dReports = cityReports.filter(r => r.submittedByUserId === d.id || r.assignedDarogaId === d.id);
    const scoredReports = dReports.filter(r => r.overallScore != null);
    const avgScore = scoredReports.length > 0
      ? Math.round(scoredReports.reduce((acc, c) => acc + c.overallScore, 0) / scoredReports.length)
      : null;
    return {
      user: d,
      totalSubmissions: dReports.length,
      avgScore,
      actionReqCount: dReports.filter(r => r.status === 'action_required').length
    };
  }).sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              ULB Operational Command & Review Pipeline
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
              {city.name.split(' ')[0]} ULB HQ
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supervise field inspection quality, escalate defective work, and adjudicate citizen cleanliness complaints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('ulb_action_req')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors"
          >
            <span>Action Required Queue ({actionRequired.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Pipeline Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => onNavigate('ulb_approved')}
          className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs hover:border-emerald-400 cursor-pointer transition-all"
        >
          <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider block mb-1">Approved</span>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{approved.length}</div>
          <span className="text-[15px] text-slate-400 mt-1 block">Certified clean</span>
        </div>

        <div
          onClick={() => onNavigate('ulb_rejected')}
          className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs hover:border-rose-400 cursor-pointer transition-all"
        >
          <span className="text-xs text-rose-700 font-semibold uppercase tracking-wider block mb-1">Rejected</span>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{rejected.length}</div>
          <span className="text-[15px] text-slate-400 mt-1 block">Sanitary Inspector spot-check failed</span>
        </div>

        <div
          onClick={() => onNavigate('ulb_action_req')}
          className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
        >
          <span className="text-xs text-indigo-700 font-semibold uppercase tracking-wider block mb-1">Action Required</span>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{actionRequired.length}</div>
          <span className="text-[15px] text-slate-400 mt-1 block">Escalated for fix</span>
        </div>

        <div
          onClick={() => onNavigate('ulb_action_taken')}
          className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs hover:border-blue-400 cursor-pointer transition-all"
        >
          <span className="text-xs text-blue-700 font-semibold uppercase tracking-wider block mb-1">Action Taken</span>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{actionTaken.length}</div>
          <span className="text-[15px] text-slate-400 mt-1 block">Field fix submitted</span>
        </div>

        <div
          onClick={() => onNavigate('ulb_iec_issues')}
          className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs hover:border-amber-400 cursor-pointer transition-all col-span-2 sm:col-span-1"
        >
          <span className="text-xs text-amber-700 font-semibold uppercase tracking-wider block mb-1">IEC Grievances</span>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{pendingIec.length}</div>
          <span className="text-[15px] text-slate-400 mt-1 block">{reopeningReqs.length} Reopening Reqs</span>
        </div>
      </div>

      {/* Main Split: Immediate Intervention Queue + Field Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intervention Queue */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Immediate Field Interventions ({actionRequired.length + pendingIec.length})</span>
            </span>
            <span className="text-xs font-mono text-slate-400">Escalated Cases</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {actionRequired.length === 0 && pendingIec.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No active operational escalations requiring intervention.
              </div>
            ) : (
              <>
                {actionRequired.map(r => (
                  <div key={r.id} className="p-4 flex items-start justify-between gap-3 hover:bg-slate-50">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900">{r.reportNumber}</span>
                        <StatusBadge status={r.status} size="sm" />
                        <span className="text-[15px] uppercase font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                          {r.moduleId}
                        </span>
                      </div>
                      <p className="text-slate-800 font-semibold truncate">
                        {r.assetName}
                      </p>
                      {r.escalationReason && (
                        <p className="text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 text-[15px] italic">
                          "{r.escalationReason}"
                        </p>
                      )}
                      <p className="text-slate-400 font-mono text-[15px]">
                        Assignee: {r.assignedDarogaName}
                      </p>
                    </div>

                    <button
                      onClick={() => onSelectReport(r.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors shrink-0"
                    >
                      Dossier
                    </button>
                  </div>
                ))}

                {pendingIec.map(issue => (
                  <div key={issue.id} className="p-4 flex items-start justify-between gap-3 hover:bg-slate-50">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900">{issue.ticketNumber}</span>
                        <StatusBadge status={issue.status} size="sm" />
                        <span className="text-[15px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-mono">
                          24h SLA Active
                        </span>
                      </div>
                      <p className="text-slate-800 font-semibold truncate">
                        {issue.locationAddress}
                      </p>
                      <p className="text-slate-500 text-[15px]">
                        {issue.complaintDescription}
                      </p>
                    </div>

                    <button
                      onClick={() => onSelectIssue(issue)}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors shrink-0"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Team Leaderboard (Daroga Inspection Compliance) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Daroga Supervision & Compliance Leaderboard</span>
            </span>
            <span className="text-xs font-mono text-slate-400">Quality Ranking</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {darogaStats.map((stat, idx) => (
              <div key={stat.user.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full font-mono font-bold text-xs flex items-center justify-center ${
                    idx === 0 ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-900">{stat.user.name}</h4>
                    <p className="text-[15px] text-slate-400 font-mono">
                      Wards: {stat.user.assignedWardIds?.join(', ') || 'Central Zone'} · {stat.user.phone}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="font-bold text-slate-900 text-sm">
                    {stat.avgScore}% <span className="text-[15px] text-slate-400 font-normal">avg score</span>
                  </div>
                  <div className="text-[15px] text-slate-500">
                    {stat.totalSubmissions} submissions · {stat.actionReqCount} escalated
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
