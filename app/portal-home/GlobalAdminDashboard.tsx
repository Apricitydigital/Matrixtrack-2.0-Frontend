'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ModuleRecordsApi, CityUserApi } from '@lib/apiClient';
import swachhApi from '../../modules/swachh-ranking/api/axios';
import { 
  Users, ShieldCheck, 
  Bell, Download, Calendar, Trophy, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Menu,
  Activity, MapPin, Search, Globe
} from 'lucide-react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

const COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function GlobalAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [taskforceRecords, setTaskforceRecords] = useState({ sweeping: [] as any[], toilet: [] as any[], twinbin: [] as any[] });
  const [swachhStats, setSwachhStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date Filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const filters = { fromDate, toDate, limit: 1000 };
      
      const [sweepingRes, toiletRes, twinbinRes, usersRes, swachhRes] = await Promise.all([
        ModuleRecordsApi.getRecords('SWEEPING', filters).catch(() => ({ data: [] as any[] })),
        ModuleRecordsApi.getRecords('TOILET', filters).catch(() => ({ data: [] as any[] })),
        ModuleRecordsApi.getRecords('TWINBIN', filters).catch(() => ({ data: [] as any[] })),
        CityUserApi.list().catch(() => ({ users: [] })),
        swachhApi.get('/admin/stats').catch(() => ({ data: null }))
      ]);
      
      setTaskforceRecords({
        sweeping: sweepingRes.data || [],
        toilet: toiletRes.data || [],
        twinbin: twinbinRes.data || []
      });
      setUsers(usersRes.users || []);
      
      // Default swachh stats if null
      const defaultSwachh = {
        totalParticipants: 0, totalAssessments: 0, qcApproved: 0, underReview: 0, reassessment: 0,
        categoryCounts: { wards: 0, schools: 0, hospitals: 0, offices: 0, markets: 0, societies_bwg: 0, hotels: 0, citizen_puraskar: 0 }
      };
      setSwachhStats(swachhRes.data || defaultSwachh);

    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate]);

  // --- Aggregations ---
  const allTaskforce = [...taskforceRecords.sweeping, ...taskforceRecords.toilet, ...taskforceRecords.twinbin];
  const acceptedCount = allTaskforce.filter(r => r.status === 'APPROVED' || r.status === 'RESOLVED' || r.status === 'ACTION_TAKEN').length;
  const rejectedCount = allTaskforce.filter(r => r.status === 'REJECTED').length;
  const actionRequiredCount = allTaskforce.filter(r => r.status === 'ACTION_REQUIRED').length;
  const pendingCount = allTaskforce.filter(r => r.status === 'PENDING').length;

  // Chart Data
  const taskforceChartData = [
    { name: 'Resolved', value: acceptedCount },
    { name: 'Rejected', value: rejectedCount },
    { name: 'Action Required', value: actionRequiredCount },
    { name: 'Pending', value: pendingCount }
  ].filter(d => d.value > 0);

  const swachhChartData = useMemo(() => {
    if (!swachhStats?.categoryCounts) return [];
    return Object.entries(swachhStats.categoryCounts)
      .filter(([k, v]) => (v as number) > 0)
      .map(([k, v]) => ({
        name: k.replace('_', ' ').toUpperCase(),
        count: v
      }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 5);
  }, [swachhStats]);

  // Alerts Generation
  const alerts = useMemo(() => {
    const list = [];
    if (actionRequiredCount > 0) {
      list.push({ type: 'warning', msg: `${actionRequiredCount} global taskforce reports require immediate action in the field.` });
    }
    if (swachhStats?.underReview > 0) {
      list.push({ type: 'info', msg: `${swachhStats.underReview} Swachh Ward assessments are pending QC review.` });
    }
    if (rejectedCount > 5) {
      list.push({ type: 'error', msg: `High rejection rate detected (${rejectedCount} recent taskforce rejections).` });
    }
    if (list.length === 0) {
      list.push({ type: 'success', msg: 'All systems operational. No pending critical actions.' });
    }
    return list;
  }, [actionRequiredCount, swachhStats, rejectedCount]);

  // User Filter
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // CSV Export
  const downloadReport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Section 1: KPIs
    csvContent += "--- Global Analytics Report ---\n\n";
    csvContent += "Taskforce KPIs\n";
    csvContent += `Total Reports,${allTaskforce.length}\n`;
    csvContent += `Resolved,${acceptedCount}\n`;
    csvContent += `Action Required,${actionRequiredCount}\n\n`;

    csvContent += "Swachh Ward Ranking KPIs\n";
    csvContent += `Total Participants,${swachhStats?.totalParticipants || 0}\n`;
    csvContent += `Assessments Completed,${swachhStats?.totalAssessments || 0}\n`;
    csvContent += `QC Approved,${swachhStats?.qcApproved || 0}\n\n`;

    // Section 2: Users
    csvContent += "--- Platform Users ---\n";
    csvContent += "Name,Email,City,Roles,Systems,Status\n";
    filteredUsers.forEach(u => {
      const roles = (u.roles || []).join(";") || u.role || 'USER';
      const systems = (u.modules || []).map((m: any) => m.module?.key || m.moduleId).join(";") || 'None';
      const cityName = u.cityName || u.city?.name || 'All Cities';
      csvContent += `"${u.name || ''}","${u.email || u.phone || ''}","${cityName}","${roles}","${systems}","${u.status || 'ACTIVE'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Global_Admin_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="p-12 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Activity className="animate-spin text-blue-600" size={32} />
        <span className="text-slate-500 font-semibold text-sm">Aggregating Global Network Data...</span>
      </div>
    </div>;
  }

  return (
    <div className="space-y-6 pb-12 mt-6 max-w-[1400px] mx-auto">
      
      {/* Action Toolbar */}
      <div className="bg-white rounded-2xl p-4 px-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-blue-600" />
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <input 
              type="date" 
              className="bg-transparent text-xs font-bold text-slate-700 outline-none px-1 cursor-pointer" 
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
            <span className="text-slate-400 font-bold text-xs">-</span>
            <input 
              type="date" 
              className="bg-transparent text-xs font-bold text-slate-700 outline-none px-1 cursor-pointer" 
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 border border-slate-200"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-blue-600' : ''} />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={downloadReport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Download size={14} /> Export CSV Report
          </button>
        </div>
      </div>

      {/* LIVE ALERTS */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex">
        <div className="bg-blue-50 px-4 py-3 border-r border-blue-100 flex items-center justify-center shrink-0">
          <Bell className="text-blue-600 animate-pulse" size={18} />
        </div>
        <div className="p-3 flex-1 overflow-x-auto whitespace-nowrap flex gap-6 items-center hide-scrollbar">
          {alerts.map((alert, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs font-bold">
              {alert.type === 'warning' && <AlertTriangle size={14} className="text-amber-500" />}
              {alert.type === 'error' && <XCircle size={14} className="text-rose-500" />}
              {alert.type === 'info' && <Activity size={14} className="text-blue-500" />}
              {alert.type === 'success' && <CheckCircle2 size={14} className="text-emerald-500" />}
              <span className="text-slate-700">{alert.msg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TASKFORCE KPIs */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <MapPin size={14} /> Global Inspection & Performance
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <KpiBlock label="Total Reports" value={allTaskforce.length} color="blue" />
            <KpiBlock label="Action Required" value={actionRequiredCount} color="amber" highlight />
            <KpiBlock label="Resolved" value={acceptedCount} color="emerald" />
            <KpiBlock label="Rejected" value={rejectedCount} color="rose" />
          </div>
        </div>

        {/* SWACHH KPIs */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Trophy size={14} /> Global Ward Ranking Stats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <KpiBlock label="Total Participants" value={swachhStats?.totalParticipants || 0} color="violet" />
            <KpiBlock label="QC Pending" value={swachhStats?.underReview || 0} color="amber" highlight />
            <KpiBlock label="Completed Assessments" value={swachhStats?.totalAssessments || 0} color="emerald" />
            <KpiBlock label="QC Approved" value={swachhStats?.qcApproved || 0} color="blue" />
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TASKFORCE CHART */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col h-[350px]">
          <h2 className="text-xs font-black text-slate-800 mb-4">Global Issue Resolution Status</h2>
          <div className="flex-1 w-full min-h-0">
            {taskforceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskforceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {taskforceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">No taskforce data to visualize</div>
            )}
          </div>
        </div>

        {/* SWACHH CHART */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col h-[350px]">
          <h2 className="text-xs font-black text-slate-800 mb-4">Top Swachh Categories by Participation</h2>
          <div className="flex-1 w-full min-h-0">
            {swachhChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={swachhChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {swachhChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">No category data to visualize</div>
            )}
          </div>
        </div>
      </div>

      {/* INTEGRATED USER DIRECTORY */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
              <Users size={16} className="text-blue-600" /> Global Platform User Directory
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Cross-system access and role breakdown across all cities</p>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search personnel..." 
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 bg-white shadow-sm z-10">
              <tr className="border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-4 px-5">Personnel</th>
                <th className="py-4 px-5">City</th>
                <th className="py-4 px-5">System Roles</th>
                <th className="py-4 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
              {filteredUsers.map((u, idx) => (
                <tr key={u.id || idx} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-3 px-5">
                    <div className="font-bold text-slate-900 text-xs">{u.name || 'Unnamed Personnel'}</div>
                    <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{u.email || u.phone || '-'}</div>
                  </td>
                  <td className="py-3 px-5">
                    <span className="text-[10px] font-black uppercase text-slate-500">{u.cityName || u.city?.name || 'All Cities'}</span>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles && u.roles.length > 0 ? u.roles.map((r: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[9px] uppercase font-bold border border-violet-100">{r.replace('_', ' ')}</span>
                      )) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] uppercase font-bold border border-slate-200">{u.role || 'USER'}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase border border-emerald-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> {u.status || 'ACTIVE'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={4} className="py-16 text-center text-slate-400 font-bold text-xs">No personnel records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiBlock({ label, value, color, highlight = false }: { label: string, value: number, color: string, highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${highlight ? 'bg-amber-50/30 border-amber-200 shadow-sm' : 'bg-slate-50/50 border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-black text-slate-800 leading-none">{value}</h3>
      </div>
    </div>
  );
}
