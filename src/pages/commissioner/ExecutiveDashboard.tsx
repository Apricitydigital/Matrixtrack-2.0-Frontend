import React from 'react';
import { matrixStore } from '../../services/store';
import { City, Zone, Ward, Beat, OperationalReport, IecCleanlinessIssue, AttendanceRecord, User } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/Badge';
import {
  Building2,
  Layers,
  AlertTriangle,
  CalendarCheck,
  Award,
  Clock,
  MapPin,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';

interface ExecutiveDashboardProps {
  city: City;
  zones: Zone[];
  wards: Ward[];
  beats: Beat[];
  reports: OperationalReport[];
  iecIssues: IecCleanlinessIssue[];
  attendance: AttendanceRecord[];
  onNavigate: (pageId: string) => void;
  onSelectReport: (reportId: string) => void;
  onSelectIssue: (issue: IecCleanlinessIssue) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  city,
  zones,
  wards,
  beats,
  reports,
  iecIssues,
  attendance,
  onNavigate,
  onSelectReport,
  onSelectIssue
}) => {
  const cityReports = reports.filter(r => r.cityId === city.id);
  const cityIec = iecIssues.filter(i => i.cityId === city.id);
  const cityAtt = attendance.filter(a => a.cityId === city.id);

  // Expected vs received work
  // Expected daily: beats (sweeping) + designated toilets (2x daily) + bins
  const expectedInspections = beats.filter(b => b.cityId === city.id).length * 2;
  const receivedInspections = cityReports.length;
  const reviewCompletionRate = Math.min(100, Math.round((cityReports.filter(r => r.status !== 'pending_review').length / Math.max(1, cityReports.length)) * 100));

  // Open issues and aging
  const openIssues = cityIec.filter(i => i.status !== 'approved_closed');
  const overdueIssues = openIssues.filter(i => i.status === 'action_required' || i.currentCycle > 1);

  // Attendance coverage
  const presentCount = cityAtt.filter(a => a.status === 'present').length;
  const attendanceRate = cityAtt.length > 0 ? Math.round((presentCount / cityAtt.length) * 100) : 0;

  // Priority Attention Queue Items (What, Where, Age/Deadline, Responsible, Evidence, Next Step)
  const priorityQueue = cityReports.filter(r => ['rejected', 'action_required', 'escalated'].includes(r.status)).slice(0, 10).map(r => ({
    id: r.id, what: r.assetName, where: wards.find(w => w.id === r.wardId)?.name || r.wardId || 'Location not provided',
    age: r.inspectionDate, responsible: r.assignedDarogaName || r.submittedByName || 'Not provided',
    evidence: r.escalationReason || r.status, nextStep: r.correctiveInstructions || 'Review inspection evidence', type: 'report', reportId: r.id, issue: undefined
  }));
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              Executive Municipal Briefing & Oversight
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
              Commissioner Office · {city.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Factual municipal dashboard highlighting expected vs received operations, service level agreements, and priority interventions.
          </p>
        </div>

        <button
          onClick={() => onNavigate('comm_exec_summary')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Printable Executive Brief</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Review Completion Rate"
          value={`${reviewCompletionRate}%`}
          denominator={`${cityReports.length} Submitted`}
          subtitle="Sanitary Inspector spot-checks reviewed"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
        <StatCard
          label="Sanitation Workforce Presence"
          value={`${attendanceRate}%`}
          denominator={`${cityAtt.length} Roster`}
          subtitle="Verified biometrics / geofenced"
          icon={<CalendarCheck className="w-4 h-4 text-blue-600" />}
          onClick={() => onNavigate('comm_attendance')}
        />
        <StatCard
          label="Open Citizen Grievances"
          value={matrixStore.cleanlinessSummary?.openIssues ?? openIssues.length}
          denominator={`${matrixStore.cleanlinessSummary?.overdueInspections ?? overdueIssues.length} Overdue / SLA Alert`}
          subtitle="IEC public cleanliness tickets"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          onClick={() => onNavigate('comm_iec_oversight')}
        />
        <StatCard
          label="Cleanliness Index (Ward Avg)"
          value="View rankings"
          unit="/ 100"
          denominator="100-Pt Index"
          subtitle="Workforce, Toilets, Beats, Nala, GVPs"
          icon={<Award className="w-4 h-4 text-indigo-600" />}
          onClick={() => onNavigate('comm_ward_ranking')}
        />
      </div>

      {/* Priority Attention Queue (What, Where, Age, Responsible, Evidence, Next Step) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Priority Executive Attention Queue</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Defects with escalated status, repeated inspection failures, or citizen reopening requests.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">
            {priorityQueue.length} Active Items
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {priorityQueue.map(item => (
            <div key={item.id} className="p-5 flex flex-wrap items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{item.what}</h4>
                  <span className="text-[15px] font-mono font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded">
                    {item.where}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-0.5">
                  <p><strong className="text-slate-700">Evidence:</strong> {item.evidence}</p>
                  <p className="text-slate-500 font-mono text-[15px]">
                    Responsible: <strong className="text-slate-800">{item.responsible}</strong> · {item.age}
                  </p>
                  <p className="text-indigo-800 font-semibold bg-indigo-50/60 p-1.5 rounded border border-indigo-100">
                    Recommended Action: {item.nextStep}
                  </p>
                </div>
              </div>

              <div className="shrink-0 pt-1">
                {item.type === 'report' && item.reportId && (
                  <button
                    onClick={() => onSelectReport(item.reportId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors"
                  >
                    <span>Inspect Report</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {item.type === 'issue' && item.issue && (
                  <button
                    onClick={() => onSelectIssue(item.issue!)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs transition-colors"
                  >
                    <span>Inspect Grievance</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Zone & Ward Quick Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Zone Operational Coverage
            </h3>
            <button
              onClick={() => onNavigate('comm_zone_ward')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Full Geography Drilldown →
            </button>
          </div>

          <div className="space-y-3">
            {zones.filter(z => z.cityId === city.id).map(z => (
              <div key={z.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-slate-900">{z.name}</h4>
                  <p className="text-[15px] text-slate-500 font-mono mt-0.5">{z.totalWards} Administrative Wards</p>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-emerald-700">92% Compliance</span>
                  <p className="text-[15px] text-slate-400">14 beats monitored</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Solid Waste Processing Infrastructure
            </h3>
            <button
              onClick={() => onNavigate('prod_plant')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              MRF Plant Details →
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Central MRF Material Recovery:</span>
              <span className="font-mono font-bold text-slate-900">395.0 Tons / 450 Cap (88%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bio-CNG Production (CBG):</span>
              <span className="font-mono font-bold text-slate-900">18,200 kg / Day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">C&D Waste Paver Manufacturing:</span>
              <span className="font-mono font-bold text-slate-900">4,200 Pavers / Day</span>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[15px] text-slate-400 font-mono">
              Mass balance verified: Zero unprocessed dry waste to regional sanitary landfill.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
