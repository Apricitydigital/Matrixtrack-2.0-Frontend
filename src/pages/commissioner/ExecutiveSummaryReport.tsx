import { todayIST } from '../../services/api';
import React from 'react';
import { City, OperationalReport, IecCleanlinessIssue, AttendanceRecord, Zone, Ward } from '../../types';
import { Printer, Download, ArrowLeft, CheckCircle2, AlertTriangle, Building2, CalendarCheck, ShieldCheck } from 'lucide-react';

interface ExecutiveSummaryReportProps {
  city: City;
  zones: Zone[];
  wards: Ward[];
  reports: OperationalReport[];
  iecIssues: IecCleanlinessIssue[];
  attendance: AttendanceRecord[];
  onBack: () => void;
}

export const ExecutiveSummaryReport: React.FC<ExecutiveSummaryReportProps> = ({
  city,
  zones,
  wards,
  reports,
  iecIssues,
  attendance,
  onBack
}) => {
  const cityReports = reports.filter(r => r.cityId === city.id);
  const cityIec = iecIssues.filter(i => i.cityId === city.id);
  const cityAtt = attendance.filter(a => a.cityId === city.id);

  const approved = cityReports.filter(r => r.status === 'approved').length;
  const rejected = cityReports.filter(r => r.status === 'rejected').length;
  const actionReq = cityReports.filter(r => r.status === 'action_required').length;
  const present = cityAtt.filter(a => a.status === 'present').length;
  const openIec = cityIec.filter(i => i.status !== 'approved_closed').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto print:max-w-none print:m-0">
      {/* Action Header - hidden in print */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Executive Brief</span>
          </button>
        </div>
      </div>

      {/* Printable Briefing Document */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs print:border-none print:shadow-none space-y-8">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-5 flex items-start justify-between">
          <div>
            <div className="text-[15px] font-mono uppercase tracking-widest text-slate-500 font-bold mb-1">
              OFFICIAL MUNICIPAL GOVERNANCE BRIEFING · RESTRICTED CIRCULATION
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {city.name}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Office of the Municipal Commissioner · Daily Executive Command Digest
            </p>
          </div>

          <div className="text-right font-mono text-xs text-slate-500">
            <div>Date: <strong>{todayIST()}</strong></div>
            <div>ULB Code: <strong>{city.ulbCode}</strong></div>
            <div>Classification: <strong>CIVIC-CMD-V2</strong></div>
          </div>
        </div>

        {/* Executive Summary Narrative */}
        <div className="space-y-3 text-xs leading-relaxed text-slate-700">
          <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
            1. Operational Executive Digest
          </h3>
          <p>
            During the 24-hour cycle ending at 06:00 IST on {todayIST()}, {city.name} deployed {cityAtt.length} registered municipal staff members across {city.totalZones} zones and {city.totalWards} wards. Morning shift muster achieved an effective attendance coverage rate of {cityAtt.length > 0 ? Math.round((present / cityAtt.length) * 100) : 0}%, with {present} personnel on-time via biometric and geofenced field applications.
          </p>
          <p>
            Field supervisory teams completed {cityReports.length} multi-module inspections across street sweeping beats, public convenience complexes, twin litter bins, stormwater nala networks, and transformed garbage vulnerable points (GVPs).
          </p>
        </div>

        {/* Core Key Performance Indicators Strip */}
        <div className="grid grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[15px] text-slate-500 block uppercase font-sans">Sanitary Inspector approved</span>
            <span className="text-xl font-bold text-slate-900 tabular-nums">{approved}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[15px] text-slate-500 block uppercase font-sans">Defects Rejected</span>
            <span className="text-xl font-bold text-rose-700 tabular-nums">{rejected}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[15px] text-slate-500 block uppercase font-sans">Action Required</span>
            <span className="text-xl font-bold text-amber-700 tabular-nums">{actionReq}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <span className="text-[15px] text-slate-500 block uppercase font-sans">Open Grievances</span>
            <span className="text-xl font-bold text-indigo-700 tabular-nums">{openIec}</span>
          </div>
        </div>

        {/* Priority Attention Interventions */}
        <div className="space-y-3 text-xs">
          <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
            2. Priority Interventions Requiring Commissioner Attention
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            <div className="p-3.5 bg-slate-50 flex justify-between font-semibold text-slate-800">
              <span>Item & Location</span>
              <span>Accountable Team & Directive</span>
            </div>
            <div className="p-3.5 flex justify-between items-center">
              <div>
                <strong className="text-slate-900 block">Culvert Archway Choking (Nala Drain 2B)</strong>
                <span className="text-slate-500 font-mono">Ward 3 - Chhatribagh Precinct</span>
              </div>
              <div className="text-right">
                <span className="text-rose-700 font-bold block">24h SLA Breached</span>
                <span className="text-slate-500">Deploy JCB excavator & desilting squad</span>
              </div>
            </div>
            <div className="p-3.5 flex justify-between items-center">
              <div>
                <strong className="text-slate-900 block">Concrete Debris Obstructing Footpath</strong>
                <span className="text-slate-500 font-mono">Ward 2 - Subhash Marg Bus Stand</span>
              </div>
              <div className="text-right">
                <span className="text-amber-700 font-bold block">Reopening Request Pending</span>
                <span className="text-slate-500">ULB Reopening Approval & Tractor Dispatch</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mass Balance & Resource Recovery */}
        <div className="space-y-3 text-xs">
          <h3 className="font-bold uppercase tracking-wider text-slate-900 text-xs">
            3. Municipal Solid Waste Mass Balance Summary
          </h3>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-[15px]">
            <div className="flex justify-between">
              <span>Total Incoming Municipal Waste:</span>
              <strong className="text-slate-900">1,110.5 Tons / Day</strong>
            </div>
            <div className="flex justify-between">
              <span>Recovered Recyclables (Dry Waste MRF):</span>
              <strong className="text-emerald-700">88.2 Tons / Day (Optical Sorting)</strong>
            </div>
            <div className="flex justify-between">
              <span>Compressed Bio-Gas (CBG) Generation:</span>
              <strong className="text-emerald-700">18,200 kg / Day (Supplied to City Buses)</strong>
            </div>
            <div className="flex justify-between">
              <span>Interlocking Concrete Paver Manufacturing:</span>
              <strong className="text-emerald-700">4,200 Sidewalk Pavers / Day</strong>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
              <span>Total Sanitary Landfill Diversion Rate:</span>
              <span className="text-indigo-600">99.4% Diverted from Open Dumping</span>
            </div>
          </div>
        </div>

        {/* Sign-off Block */}
        <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs">
          <div className="text-slate-400 font-mono text-[15px]">
            Generated via MatrixTrack 2.0 Enterprise Engine<br />
            Deterministic Local Workspace Session Verification
          </div>
          <div className="text-right space-y-1">
            <div className="font-bold text-slate-900">Commissioner Office Sign-off</div>
            <div className="text-slate-500 font-mono text-[15px]">{city.name}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
