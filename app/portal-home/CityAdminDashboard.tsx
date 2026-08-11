// 'use client';

// import React, { useEffect, useState, useMemo } from 'react';
// import { ModuleRecordsApi, CityUserApi } from '@lib/apiClient';
// import swachhApi from '../../modules/swachh-ranking/api/axios';
// import { 
//   Users, BarChart3, ShieldAlert, CheckCircle2, XCircle, 
//   Activity, MapPin, Search, ShieldCheck, Zap, 
//   Bell, Download, Calendar, Trophy, AlertTriangle, ArrowRight,
//   Landmark, GraduationCap, Building2, Store, ClipboardList, Menu
// } from 'lucide-react';
// import { 
//   BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, 
//   Tooltip, ResponsiveContainer, Legend, AreaChart, Area, CartesianGrid
// } from 'recharts';

// const COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#3b82f6', '#8b5cf6'];
// const CATEGORY_ICONS: Record<string, React.ReactNode> = {
//   wards: <Landmark size={14} />,
//   schools: <GraduationCap size={14} />,
//   hospitals: <Building2 size={14} />,
//   markets: <Store size={14} />,
//   offices: <Building2 size={14} />,
// };

// export default function CityAdminDashboard() {
//   const [loading, setLoading] = useState(true);
//   const [taskforceRecords, setTaskforceRecords] = useState({ sweeping: [] as any[], toilet: [] as any[], twinbin: [] as any[] });
//   const [swachhStats, setSwachhStats] = useState<any>(null);
//   const [users, setUsers] = useState<any[]>([]);
//   const [searchQuery, setSearchQuery] = useState('');

//   useEffect(() => {
//     async function loadData() {
//       setLoading(true);
//       try {
//         const [sweepingRes, toiletRes, twinbinRes, usersRes, swachhRes] = await Promise.all([
//           ModuleRecordsApi.getRecords('SWEEPING').catch(() => ({ data: [] as any[] })),
//           ModuleRecordsApi.getRecords('TOILET').catch(() => ({ data: [] as any[] })),
//           ModuleRecordsApi.getRecords('TWINBIN').catch(() => ({ data: [] as any[] })),
//           CityUserApi.list().catch(() => ({ users: [] })),
//           swachhApi.get('/admin/stats').catch(() => ({ data: null }))
//         ]);
        
//         setTaskforceRecords({
//           sweeping: sweepingRes.data || [],
//           toilet: toiletRes.data || [],
//           twinbin: twinbinRes.data || []
//         });
//         setUsers(usersRes.users || []);
        
//         // Default swachh stats if null
//         const defaultSwachh = {
//           totalParticipants: 0, totalAssessments: 0, qcApproved: 0, underReview: 0, reassessment: 0,
//           categoryCounts: { wards: 0, schools: 0, hospitals: 0, offices: 0, markets: 0, societies_bwg: 0, hotels: 0, citizen_puraskar: 0 }
//         };
//         setSwachhStats(swachhRes.data || defaultSwachh);

//       } catch (err) {
//         console.error("Failed to load dashboard data", err);
//       } finally {
//         setLoading(false);
//       }
//     }
//     loadData();
//   }, []);

//   const allTaskforce = [...taskforceRecords.sweeping, ...taskforceRecords.toilet, ...taskforceRecords.twinbin];
//   const acceptedCount = allTaskforce.filter(r => r.status === 'APPROVED' || r.status === 'RESOLVED' || r.status === 'ACTION_TAKEN').length;
//   const rejectedCount = allTaskforce.filter(r => r.status === 'REJECTED').length;
//   const actionRequiredCount = allTaskforce.filter(r => r.status === 'ACTION_REQUIRED').length;
//   const pendingCount = allTaskforce.filter(r => r.status === 'PENDING').length;

//   // Chart Data
//   const trendData = useMemo(() => {
//     const dates = Array.from({ length: 7 }, (_, i) => {
//       const d = new Date();
//       d.setDate(d.getDate() - (6 - i));
//       return { 
//         fullDate: d.toISOString().split('T')[0], 
//         display: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) 
//       };
//     });

//     return dates.map(dateObj => {
//       const sweeping = taskforceRecords.sweeping.filter(r => r.createdAt?.startsWith(dateObj.fullDate)).length;
//       const toilet = taskforceRecords.toilet.filter(r => r.createdAt?.startsWith(dateObj.fullDate)).length;
//       const twinbin = taskforceRecords.twinbin.filter(r => r.createdAt?.startsWith(dateObj.fullDate)).length;
//       return { name: dateObj.display, Sweeping: sweeping, Toilets: toilet, Litterbins: twinbin };
//     });
//   }, [taskforceRecords]);

//   const donutData = [
//     { name: 'Approved', value: acceptedCount, color: '#10b981' },
//     { name: 'Rejected', value: rejectedCount, color: '#f43f5e' },
//     { name: 'Pending', value: pendingCount, color: '#f59e0b' }
//   ];
//   const totalDonut = donutData.reduce((acc, curr) => acc + curr.value, 0);

//   const todayStr = new Date().toISOString().split('T')[0];
//   const inspectionsToday = allTaskforce.filter(r => r.createdAt?.startsWith(todayStr)).length;
//   const actionsTaken = allTaskforce.filter(r => r.status === 'ACTION_TAKEN').length;
//   const issuesReported = actionRequiredCount;
//   const issuesResolved = acceptedCount;

//   // Alerts Generation
//   const alerts = useMemo(() => {
//     const list = [];
//     if (actionRequiredCount > 0) {
//       list.push({ type: 'warning', msg: `${actionRequiredCount} taskforce reports require immediate action in the field.` });
//     }
//     if (swachhStats?.underReview > 0) {
//       list.push({ type: 'info', msg: `${swachhStats.underReview} Swachh Ward assessments are pending QC review.` });
//     }
//     if (rejectedCount > 5) {
//       list.push({ type: 'error', msg: `High rejection rate detected (${rejectedCount} recent taskforce rejections).` });
//     }
//     if (list.length === 0) {
//       list.push({ type: 'success', msg: 'All systems operational. No pending critical actions.' });
//     }
//     return list;
//   }, [actionRequiredCount, swachhStats, rejectedCount]);

//   // User Filter
//   const filteredUsers = users.filter(u => 
//     u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//     u.email?.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   // CSV Export
//   const downloadReport = () => {
//     let csvContent = "data:text/csv;charset=utf-8,";
    
//     // Section 1: KPIs
//     csvContent += "--- City Analytics Report ---\n\n";
//     csvContent += "Taskforce KPIs\n";
//     csvContent += `Total Reports,${allTaskforce.length}\n`;
//     csvContent += `Resolved,${acceptedCount}\n`;
//     csvContent += `Action Required,${actionRequiredCount}\n\n`;

//     csvContent += "Swachh Ward Ranking KPIs\n";
//     csvContent += `Total Participants,${swachhStats?.totalParticipants || 0}\n`;
//     csvContent += `Assessments Completed,${swachhStats?.totalAssessments || 0}\n`;
//     csvContent += `QC Approved,${swachhStats?.qcApproved || 0}\n\n`;

//     // Section 2: Users
//     csvContent += "--- Platform Users ---\n";
//     csvContent += "Name,Email,Roles,Systems,Status\n";
//     filteredUsers.forEach(u => {
//       const roles = (u.roles || []).join(";") || u.role || 'USER';
//       const systems = (u.modules || []).map((m: any) => m.module?.key || m.moduleId).join(";") || 'None';
//       csvContent += `"${u.name || ''}","${u.email || u.phone || ''}","${roles}","${systems}","${u.status || 'ACTIVE'}"\n`;
//     });

//     const encodedUri = encodeURI(csvContent);
//     const link = document.createElement("a");
//     link.setAttribute("href", encodedUri);
//     link.setAttribute("download", `City_Admin_Report_${new Date().toISOString().split('T')[0]}.csv`);
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   if (loading) {
//     return <div className="p-12 flex items-center justify-center">
//       <div className="flex flex-col items-center gap-3">
//         <Activity className="animate-spin text-blue-600" size={32} />
//         <span className="text-slate-500 font-semibold text-sm">Aggregating Live City Data...</span>
//       </div>
//     </div>;
//   }

//   return (
//     <div className="space-y-6 pb-12 mt-6 max-w-[1400px] mx-auto">
      
//       {/* Action Toolbar */}
//       <div className="bg-white rounded-2xl p-4 px-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
//         <div className="flex items-center gap-2 text-slate-700 font-extrabold text-sm">
//           <Calendar size={16} className="text-blue-600" />
//           <span>Date: {todayStr}</span>
//         </div>
        
//         <div className="flex items-center gap-3 w-full sm:w-auto">
//           <button
//             type="button"
//             onClick={downloadReport}
//             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
//           >
//             <Download size={14} /> Export CSV Report
//           </button>
//         </div>
//       </div>

//       {/* LIVE ALERTS */}
//       <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex">
//         <div className="bg-blue-50 px-4 py-3 border-r border-blue-100 flex items-center justify-center shrink-0">
//           <Bell className="text-blue-600 animate-pulse" size={18} />
//         </div>
//         <div className="p-3 flex-1 overflow-x-auto whitespace-nowrap flex gap-6 items-center hide-scrollbar">
//           {alerts.map((alert, idx) => (
//             <div key={idx} className="flex items-center gap-2 text-xs font-bold">
//               {alert.type === 'warning' && <AlertTriangle size={14} className="text-amber-500" />}
//               {alert.type === 'error' && <XCircle size={14} className="text-rose-500" />}
//               {alert.type === 'info' && <Activity size={14} className="text-blue-500" />}
//               {alert.type === 'success' && <CheckCircle2 size={14} className="text-emerald-500" />}
//               <span className="text-slate-700">{alert.msg}</span>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* CHARTS SECTION - 3 PANELS ROW */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
//         {/* PANEL 1: INSPECTION TREND */}
//         <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col h-[320px]">
//           <div className="flex items-center gap-2 mb-4">
//             <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">INSPECTION TREND</h2>
//             <span className="text-[10px] font-bold text-slate-400">(Last 7 Days)</span>
//           </div>
//           <div className="flex-1 w-full min-h-0">
//             {totalDonut > 0 ? (
//               <ResponsiveContainer width="100%" height="100%">
//                 <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
//                   <defs>
//                     <linearGradient id="colorSweeping" x1="0" y1="0" x2="0" y2="1">
//                       <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
//                       <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
//                     </linearGradient>
//                     <linearGradient id="colorToilets" x1="0" y1="0" x2="0" y2="1">
//                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
//                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
//                     </linearGradient>
//                     <linearGradient id="colorLitterbins" x1="0" y1="0" x2="0" y2="1">
//                       <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
//                       <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
//                     </linearGradient>
//                   </defs>
//                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
//                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
//                   <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
//                   <Legend verticalAlign="top" height={36} iconType="plainline" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', marginTop: '-15px' }} />
//                   <Area type="monotone" dataKey="Sweeping" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSweeping)" />
//                   <Area type="monotone" dataKey="Toilets" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorToilets)" />
//                   <Area type="monotone" dataKey="Litterbins" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorLitterbins)" />
//                 </AreaChart>
//               </ResponsiveContainer>
//             ) : (
//               <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">No trend data available</div>
//             )}
//           </div>
//         </div>

//         {/* PANEL 2: STATUS DISTRIBUTION */}
//         <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col h-[320px]">
//           <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">INSPECTION STATUS</h2>
//           <div className="flex-1 flex items-center justify-between">
//             <div className="w-1/2 h-[200px] relative flex justify-center items-center">
//               {totalDonut > 0 ? (
//                 <>
//                   <ResponsiveContainer width="100%" height="100%">
//                     <PieChart>
//                       <Pie
//                         data={donutData}
//                         cx="50%"
//                         cy="50%"
//                         innerRadius={55}
//                         outerRadius={80}
//                         paddingAngle={2}
//                         dataKey="value"
//                         stroke="none"
//                       >
//                         {donutData.map((entry, index) => (
//                           <Cell key={`cell-${index}`} fill={entry.color} />
//                         ))}
//                       </Pie>
//                     </PieChart>
//                   </ResponsiveContainer>
//                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
//                     <span className="text-2xl font-black text-slate-900">{totalDonut}</span>
//                     <span className="text-[10px] font-bold text-slate-400">Total</span>
//                   </div>
//                 </>
//               ) : (
//                 <div className="text-slate-400 text-xs font-semibold">No data</div>
//               )}
//             </div>
            
//             <div className="w-1/2 pl-4 flex flex-col gap-4">
//               {donutData.map((d, i) => {
//                 const percentage = totalDonut > 0 ? Math.round((d.value / totalDonut) * 100) : 0;
//                 return (
//                   <div key={i} className="flex items-center justify-between">
//                     <div className="flex items-center gap-2">
//                       <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
//                       <span className="text-xs font-bold text-slate-700">{d.name}</span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <span className="text-xs font-black text-slate-900">{d.value}</span>
//                       <span className="text-[10px] font-bold text-slate-400 w-[28px] text-right">({percentage}%)</span>
//                     </div>
//                   </div>
//                 );
//               })}
//               <div className="mt-2 flex justify-center">
//                 <button className="px-4 py-1.5 rounded-full border border-blue-100 bg-blue-50 text-blue-600 text-[10px] font-black hover:bg-blue-100 transition-colors">
//                   View Details
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* PANEL 3: ACTIVITY SUMMARY */}
//         <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col h-[320px]">
//           <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">ACTIVITY SUMMARY</h2>
//           <div className="flex-1 grid grid-cols-2 gap-4">
            
//             <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-slate-200 transition-colors">
//               <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
//                 <ClipboardList size={20} />
//               </div>
//               <div>
//                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Inspections Today</div>
//                 <div className="text-2xl font-black text-slate-900 leading-none">{inspectionsToday}</div>
//               </div>
//             </div>

//             <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-slate-200 transition-colors">
//               <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 border border-violet-100 shrink-0">
//                 <Activity size={20} />
//               </div>
//               <div>
//                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Actions Taken</div>
//                 <div className="text-2xl font-black text-slate-900 leading-none">{actionsTaken}</div>
//               </div>
//             </div>

//             <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-slate-200 transition-colors">
//               <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 shrink-0">
//                 <ClipboardList size={20} />
//               </div>
//               <div>
//                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Issues Reported</div>
//                 <div className="text-2xl font-black text-slate-900 leading-none">{issuesReported}</div>
//               </div>
//             </div>

//             <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-slate-200 transition-colors">
//               <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
//                 <CheckCircle2 size={20} />
//               </div>
//               <div>
//                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Issues Resolved</div>
//                 <div className="text-2xl font-black text-slate-900 leading-none">{issuesResolved}</div>
//               </div>
//             </div>

//           </div>
//         </div>
//       </div>

//       {/* INTEGRATED USER DIRECTORY */}
//       <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
//         <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-50/50">
//           <div>
//             <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
//               <Users size={16} className="text-blue-600" /> Platform User Directory
//             </h3>
//             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Cross-system access and role breakdown</p>
//           </div>
//           <div className="relative w-full sm:w-auto">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
//             <input 
//               type="text" 
//               placeholder="Search personnel..." 
//               className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition shadow-sm"
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//             />
//           </div>
//         </div>
//         <div className="overflow-x-auto max-h-[500px]">
//           <table className="w-full text-left text-sm border-collapse">
//             <thead className="sticky top-0 bg-white shadow-sm z-10">
//               <tr className="border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
//                 <th className="py-4 px-5">Personnel</th>
//                 <th className="py-4 px-5">System Roles</th>
//                 <th className="py-4 px-5">Active Modules</th>
//                 <th className="py-4 px-5 text-right">Status</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
//               {filteredUsers.map((u, idx) => (
//                 <tr key={u.id || idx} className="hover:bg-slate-50/80 transition-colors group">
//                   <td className="py-3 px-5">
//                     <div className="font-bold text-slate-900 text-xs">{u.name || 'Unnamed Personnel'}</div>
//                     <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{u.email || u.phone || '-'}</div>
//                   </td>
//                   <td className="py-3 px-5">
//                     <div className="flex flex-wrap gap-1.5">
//                       {u.roles && u.roles.length > 0 ? u.roles.map((r: string, i: number) => (
//                         <span key={i} className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[9px] uppercase font-bold border border-violet-100">{r.replace('_', ' ')}</span>
//                       )) : (
//                         <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] uppercase font-bold border border-slate-200">{u.role || 'USER'}</span>
//                       )}
//                     </div>
//                   </td>
//                   <td className="py-3 px-5">
//                     <div className="flex flex-wrap gap-1.5">
//                       {u.modules && u.modules.length > 0 ? u.modules.map((m: any, i: number) => (
//                         <span key={i} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[9px] uppercase font-bold border border-blue-100 flex items-center gap-1">
//                           {m.module?.key || m.moduleId}
//                         </span>
//                       )) : (
//                         <span className="text-[10px] text-slate-400 font-bold italic">No specific module</span>
//                       )}
//                     </div>
//                   </td>
//                   <td className="py-3 px-5 text-right">
//                     <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase border border-emerald-100">
//                       <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> {u.status || 'ACTIVE'}
//                     </span>
//                   </td>
//                 </tr>
//               ))}
//               {filteredUsers.length === 0 && (
//                 <tr><td colSpan={4} className="py-16 text-center text-slate-400 font-bold text-xs">No personnel records found.</td></tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }

// function KpiBlock({ label, value, color, highlight = false }: { label: string, value: number, color: string, highlight?: boolean }) {
//   const colorMap: Record<string, string> = {
//     blue: 'bg-blue-50 text-blue-600',
//     emerald: 'bg-emerald-50 text-emerald-600',
//     amber: 'bg-amber-50 text-amber-600',
//     rose: 'bg-rose-50 text-rose-600',
//     violet: 'bg-violet-50 text-violet-600',
//   };
  
//   return (
//     <div className={`p-4 rounded-xl border transition-all ${highlight ? 'bg-amber-50/30 border-amber-200 shadow-sm' : 'bg-slate-50/50 border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
//       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
//       <div className="flex items-end justify-between">
//         <h3 className="text-2xl font-black text-slate-800 leading-none">{value}</h3>
//       </div>
//     </div>
//   );
// }


//




"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  AreaBeatApi,
  CityUserApi,
  ModuleRecordsApi,
  RegistrationApi,
} from "@lib/apiClient";
import swachhApi from "../../modules/swachh-ranking/api/axios";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Flame,
  Layers3,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Toilet,
  Trash2,
  Trophy,
  Truck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ModuleKey = "SWEEPING" | "TOILET" | "TWINBIN" | "TASKFORCE";
type GeoLevel = "zone" | "ward" | "area";

type GeoNode = {
  id: string;
  name: string;
  parentId?: string;
  parent_id?: string;
  parent?: { id?: string };
};

type RequestStats = {
  userRegistrations: number;
  beatRequests: number;
  toiletRequests: number;
  litterBinRequests: number;
  gvpRequests: number;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  count: number;
  route: string;
  color: string;
  soft: string;
  border: string;
  icon: React.ReactNode;
};

const MODULES: Record<
  ModuleKey,
  { name: string; short: string; color: string; soft: string }
> = {
  SWEEPING: {
    name: "Sweeping",
    short: "Sweeping",
    color: "#10b981",
    soft: "#ecfdf5",
  },
  TOILET: {
    name: "Cleanliness of Toilets",
    short: "Toilets",
    color: "#3b82f6",
    soft: "#eff6ff",
  },
  TWINBIN: {
    name: "Litter Bins",
    short: "Litter Bins",
    color: "#f59e0b",
    soft: "#fffbeb",
  },
  TASKFORCE: {
    name: "GVP",
    short: "GVP",
    color: "#8b5cf6",
    soft: "#f5f3ff",
  },
};

const KEYS = Object.keys(MODULES) as ModuleKey[];

const norm = (value: any) => String(value ?? "").trim();
const up = (value: any) => norm(value).toUpperCase();

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const addDays = (value: string, amount: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return dayKey(date);
};

const parentId = (node: any) =>
  norm(node?.parentId ?? node?.parent_id ?? node?.parent?.id);

const approved = (status: any) =>
  ["APPROVED", "RESOLVED", "ACTION_TAKEN"].includes(up(status));

const rejected = (status: any) => up(status) === "REJECTED";
const actionRequired = (status: any) => up(status) === "ACTION_REQUIRED";

const pending = (status: any) =>
  ["PENDING", "SUBMITTED", "UNDER_REVIEW", "QC_PENDING"].includes(up(status));

function recordDate(record: any) {
  const raw =
    record?.createdAt ??
    record?.submittedAt ??
    record?.inspectionDate ??
    record?.reportDate ??
    record?.date ??
    record?.updatedAt;

  if (!raw) return "";

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : dayKey(date);
}

function geoId(record: any, level: GeoLevel) {
  const cap = level[0].toUpperCase() + level.slice(1);

  return norm(
    record?.[`${level}Id`] ??
      record?.[`${level}_id`] ??
      record?.[level]?.id ??
      record?.[`assigned${cap}Id`] ??
      record?.location?.[`${level}Id`]
  );
}

function geoName(
  record: any,
  level: GeoLevel,
  map: Record<string, string>
) {
  const cap = level[0].toUpperCase() + level.slice(1);

  const direct = norm(
    record?.[`${level}Name`] ??
      record?.[level]?.name ??
      record?.[`assigned${cap}Name`] ??
      record?.location?.[`${level}Name`]
  );

  return direct || map[geoId(record, level)] || "";
}

function ownerName(record: any) {
  return (
    norm(
      record?.supervisorName ??
        record?.supervisor?.name ??
        record?.submittedBy?.name ??
        record?.createdBy?.name ??
        record?.employee?.name ??
        record?.user?.name
    ) || "Unknown Supervisor"
  );
}

async function fetchRecords(
  module: ModuleKey,
  fromDate: string,
  toDate: string,
  zoneId?: string,
  wardId?: string
) {
  const output: any[] = [];

  let page = 1;
  let totalPages = 1;

  do {
    const response = await ModuleRecordsApi.getRecords(module, {
      page,
      limit: 200,
      fromDate,
      toDate,
      ...(zoneId ? { zoneIds: [zoneId] } : {}),
      ...(wardId ? { wardIds: [wardId] } : {}),
    });

    output.push(
      ...(response?.data || []).map((record: any) => ({
        ...record,
        __module: module,
      }))
    );

    totalPages = Number(response?.meta?.totalPages || 1);
    page += 1;
  } while (page <= totalPages && page <= 25);

  return output;
}

export default function CityAdminDashboard({
  userCityName = "Indore",
}: {
  userCityName?: string;
}) {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => dayKey(new Date()), []);

  const [filterDate, setFilterDate] = useState(today);
  const [zone, setZone] = useState("ALL");
  const [ward, setWard] = useState("ALL");
  const [area, setArea] = useState("ALL");
  const [subModule, setSubModule] = useState<"ALL" | ModuleKey>("ALL");

  const [zones, setZones] = useState<GeoNode[]>([]);
  const [wards, setWards] = useState<GeoNode[]>([]);
  const [areas, setAreas] = useState<GeoNode[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [swachh, setSwachh] = useState<any>({});

  const [search, setSearch] = useState("");
  const [directoryRole, setDirectoryRole] = useState("ALL");
  const [directoryModule, setDirectoryModule] = useState("ALL");
  const [directoryStatus, setDirectoryStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const [requestStats, setRequestStats] = useState<RequestStats>({
    userRegistrations: 0,
    beatRequests: 0,
    toiletRequests: 0,
    litterBinRequests: 0,
    gvpRequests: 0,
  });
  const [notificationOpen, setNotificationOpen] = useState(true);
  const [notificationUpdatedAt, setNotificationUpdatedAt] = useState<Date | null>(null);

  const geoMap = useMemo(() => {
    const map: Record<string, string> = {};

    [...zones, ...wards, ...areas].forEach((node) => {
      if (node?.id) map[node.id] = node.name;
    });

    return map;
  }, [zones, wards, areas]);

  const visibleWards = useMemo(() => {
    if (zone === "ALL") return wards;

    const related = wards.filter((item) => parentId(item) === zone);
    return related.length ? related : wards;
  }, [wards, zone]);

  const visibleAreas = useMemo(() => {
    if (ward !== "ALL") {
      const related = areas.filter((item) => parentId(item) === ward);
      return related.length ? related : areas;
    }

    if (zone !== "ALL") {
      const wardIds = new Set(visibleWards.map((item) => item.id));
      const related = areas.filter((item) => wardIds.has(parentId(item)));
      return related.length ? related : areas;
    }

    return areas;
  }, [areas, ward, zone, visibleWards]);

  async function loadNotificationData() {
    const [
      userRegistrationResponse,
      beatRequestResponse,
      toiletRequestResponse,
      litterBinRequestResponse,
      gvpRequestResponse,
    ] = await Promise.all([
      RegistrationApi.listRequests().catch(() => ({ requests: [] })),
      AreaBeatApi.listPendingRequests().catch(() => ({ pendingBeats: [] })),
      apiFetch<any>("/modules/toilet/pending").catch(() => ({ toilets: [] })),
      apiFetch<any>("/modules/twinbin/bin-requests/pending").catch(() => ({ data: [] })),
      apiFetch<any>("/modules/taskforce/feeder-points/pending").catch(() => ({
        feederPoints: [],
      })),
    ]);

    const userRegistrations = (userRegistrationResponse?.requests || []).filter(
      (item: any) => !item?.status || up(item.status) === "PENDING"
    ).length;

const beatPayload = beatRequestResponse as any;

const beatRequests = (
  beatPayload?.pendingBeats ||
  beatPayload?.beats ||
  beatPayload?.data ||
  []
).length;

    const toiletRequests = (
      toiletRequestResponse?.toilets ||
      toiletRequestResponse?.data ||
      []
    ).length;

    const litterBinRequests = (
      litterBinRequestResponse?.data ||
      litterBinRequestResponse?.bins ||
      litterBinRequestResponse?.requests ||
      []
    ).length;

    const gvpRequests = (
      gvpRequestResponse?.feederPoints ||
      gvpRequestResponse?.data ||
      []
    ).length;

    setRequestStats({
      userRegistrations,
      beatRequests,
      toiletRequests,
      litterBinRequests,
      gvpRequests,
    });

    setNotificationUpdatedAt(new Date());
  }

  async function loadBase() {
    const [userResponse, beatResponse, zoneResponse, wardResponse, areaResponse, swachhResponse] =
      await Promise.all([
        CityUserApi.list().catch(() => ({ users: [] })),
        AreaBeatApi.list().catch(() => ({ beats: [] })),
        apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=ZONE").catch(() => ({
          nodes: [],
        })),
        apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=WARD").catch(() => ({
          nodes: [],
        })),
        apiFetch<{ nodes: GeoNode[] }>("/city/geo?level=AREA").catch(() => ({
          nodes: [],
        })),
        swachhApi.get("/admin/stats").catch(() => ({ data: {} })),
      ]);

    setUsers(userResponse?.users || []);
    setBeats(beatResponse?.beats || []);
    setZones(zoneResponse?.nodes || []);
    setWards(wardResponse?.nodes || []);
    setAreas(areaResponse?.nodes || []);
    setSwachh(swachhResponse?.data || {});
  }

  async function loadRecords() {
    const fromDate = addDays(filterDate, -6);
    const keys = subModule === "ALL" ? KEYS : [subModule];

    const rows = await Promise.all(
      keys.map((key) =>
        fetchRecords(
          key,
          fromDate,
          filterDate,
          zone !== "ALL" ? zone : undefined,
          ward !== "ALL" ? ward : undefined
        ).catch(() => [])
      )
    );

    setRecords(rows.flat());
  }

  async function loadAll(initial = false) {
    if (initial) setLoading(true);
    else setRefreshing(true);

    try {
      await Promise.all([loadBase(), loadRecords(), loadNotificationData()]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadNotificationData();
    }, 60000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate, zone, ward, subModule]);

  const scoped = useMemo(() => {
    if (area === "ALL") return records;

    return records.filter(
      (record) =>
        geoId(record, "area") === area ||
        geoName(record, "area", geoMap) === geoMap[area]
    );
  }, [records, area, geoMap]);

  const selected = useMemo(
    () => scoped.filter((record) => recordDate(record) === filterDate),
    [scoped, filterDate]
  );

  const status = useMemo(() => {
    const approvedCount = selected.filter((record) =>
      approved(record.status)
    ).length;

    const rejectedCount = selected.filter((record) =>
      rejected(record.status)
    ).length;

    const actionCount = selected.filter((record) =>
      actionRequired(record.status)
    ).length;

    const pendingCount = selected.filter((record) =>
      pending(record.status)
    ).length;

    return {
      total: selected.length,
      approved: approvedCount,
      rejected: rejectedCount,
      actionRequired: actionCount,
      pending: pendingCount,
      approval: selected.length
        ? Math.round((approvedCount * 100) / selected.length)
        : 0,
    };
  }, [selected]);

  const trend = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addDays(filterDate, index - 6)
      ).map((dateValue) => {
        const row: any = {
          date: new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          }),
        };

        KEYS.forEach((key) => {
          row[key] = scoped.filter(
            (record) =>
              record.__module === key && recordDate(record) === dateValue
          ).length;
        });

        return row;
      }),
    [scoped, filterDate]
  );

  const modulePerformance = useMemo(
    () =>
      KEYS.map((key) => {
        const rows = selected.filter((record) => record.__module === key);
        const approvedRows = rows.filter((record) =>
          approved(record.status)
        ).length;

        return {
          key,
          name: MODULES[key].short,
          total: rows.length,
          approval: rows.length
            ? Math.round((approvedRows * 100) / rows.length)
            : 0,
        };
      }),
    [selected]
  );

  const heatLevel: GeoLevel =
    zone === "ALL" ? "zone" : ward === "ALL" ? "ward" : "area";

  const heatLevelLabel =
    heatLevel === "zone" ? "Zone" : heatLevel === "ward" ? "Ward" : "Area";

  const heat = useMemo(() => {
    const map: Record<string, any> = {};

    selected.forEach((record) => {
      const id = geoId(record, heatLevel) || `UNMAPPED_${heatLevel}`;

      if (!map[id]) {
        map[id] = {
          id,
          name:
            geoName(record, heatLevel, geoMap) ||
            `Unmapped ${heatLevelLabel}`,
          total: 0,
          exceptions: 0,
          modules: {
            SWEEPING: 0,
            TOILET: 0,
            TWINBIN: 0,
            TASKFORCE: 0,
          },
        };
      }

      map[id].total += 1;
      map[id].modules[record.__module] += 1;

      if (rejected(record.status) || actionRequired(record.status)) {
        map[id].exceptions += 1;
      }
    });

    return Object.values(map).sort((a: any, b: any) => b.total - a.total);
  }, [selected, geoMap, heatLevel, heatLevelLabel]);

  const maxHeat = useMemo(
    () =>
      Math.max(
        1,
        ...heat.flatMap((row: any) =>
          KEYS.map((key) => row.modules[key])
        )
      ),
    [heat]
  );

  const supervisorPerformance = useMemo(() => {
    const map: Record<string, any> = {};

    selected.forEach((record) => {
      const name = ownerName(record);

      if (!map[name]) {
        map[name] = {
          name,
          total: 0,
          approved: 0,
          rejected: 0,
          action: 0,
        };
      }

      map[name].total += 1;

      if (approved(record.status)) map[name].approved += 1;
      if (rejected(record.status)) map[name].rejected += 1;
      if (actionRequired(record.status)) map[name].action += 1;
    });

    return Object.values(map)
      .map((item: any) => ({
        ...item,
        rate: item.total
          ? Math.round((item.approved * 100) / item.total)
          : 0,
      }))
      .sort(
        (a: any, b: any) =>
          b.rate - a.rate || b.total - a.total
      )
      .slice(0, 6);
  }, [selected]);

  const workforce = useMemo(() => {
    const operationalUsers = users.filter((user) => {
      const roles = [user?.role, ...(user?.roles || [])].map(up);
      const active =
        user?.enabled !== false &&
        !["INACTIVE", "DISABLED", "BLOCKED"].includes(up(user?.status));

      return (
        active &&
        (roles.includes("SUPERVISOR") || roles.includes("EMPLOYEE"))
      );
    });

    const assignedIds = new Set<string>();

    const addId = (value: any) => {
      const id = norm(value);
      if (id) assignedIds.add(id);
    };

    beats.forEach((beat) => {
      addId(beat?.assignedToId);
      addId(beat?.supervisorId);
      addId(beat?.employeeAssignedToId);
      addId(beat?.employeeId);

      (beat?.segments || []).forEach((segment: any) => {
        addId(segment?.assignedToId);
        addId(segment?.employeeAssignedToId);
        addId(segment?.employee?.id);
      });
    });

    records.forEach((record) => {
      addId(record?.supervisorId);
      addId(record?.supervisor?.id);
      addId(record?.employeeId);
      addId(record?.employee?.id);
      addId(record?.submittedById);
      addId(record?.submittedBy?.id);
      addId(record?.createdById);
      addId(record?.createdBy?.id);
      addId(record?.userId);
      addId(record?.user?.id);
    });

    const hasAssignment = (user: any) => {
      const linkedToLiveWork = assignedIds.has(norm(user?.id));

      const linkedToModule =
        (user?.modules || []).length > 0 ||
        (user?.assignedModules || []).length > 0 ||
        (user?.workspaceModules || []).length > 0;

      return linkedToLiveWork || linkedToModule;
    };

    const buildRole = (role: "SUPERVISOR" | "EMPLOYEE") => {
      const roleUsers = operationalUsers.filter((user) =>
        [user?.role, ...(user?.roles || [])].map(up).includes(role)
      );

      const assigned = roleUsers.filter(hasAssignment).length;
      const total = roleUsers.length;
      const available = Math.max(0, total - assigned);
      const allocation = total ? Math.round((assigned * 100) / total) : 0;

      return {
        total,
        assigned,
        available,
        allocation,
      };
    };

    return {
      supervisors: buildRole("SUPERVISOR"),
      employees: buildRole("EMPLOYEE"),
    };
  }, [users, beats, records]);

  const requestNotificationCount =
    requestStats.userRegistrations +
    requestStats.beatRequests +
    requestStats.toiletRequests +
    requestStats.litterBinRequests +
    requestStats.gvpRequests;

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [
      {
        id: "user-registration",
        title: "User Registration Requests",
        message: "New personnel are waiting for City Admin review.",
        count: requestStats.userRegistrations,
        route: "/portal-home/registration-requests",
        color: "#2563eb",
        soft: "#eff6ff",
        border: "#bfdbfe",
        icon: <UserPlus size={16} />,
      },
      {
        id: "beat-registration",
        title: "Beat Registration Requests",
        message: "New beat requests are waiting for approval.",
        count: requestStats.beatRequests,
        route: "/city/beat-requests",
        color: "#0891b2",
        soft: "#ecfeff",
        border: "#a5f3fc",
        icon: <MapPin size={16} />,
      },
      {
        id: "toilet-registration",
        title: "Toilet Registration Requests",
        message: "New toilet points are waiting for review.",
        count: requestStats.toiletRequests,
        route: "/modules/toilet",
        color: "#3b82f6",
        soft: "#eff6ff",
        border: "#bfdbfe",
        icon: <Toilet size={16} />,
      },
      {
        id: "litterbin-registration",
        title: "Litter Bin Requests",
        message: "New litter bin points are waiting for review.",
        count: requestStats.litterBinRequests,
        route: "/modules/litterbins",
        color: "#d97706",
        soft: "#fffbeb",
        border: "#fde68a",
        icon: <Trash2 size={16} />,
      },
      {
        id: "gvp-registration",
        title: "GVP / Feeder Point Requests",
        message: "New GVP points are waiting for review.",
        count: requestStats.gvpRequests,
        route: "/modules/taskforce",
        color: "#7c3aed",
        soft: "#f5f3ff",
        border: "#ddd6fe",
        icon: <Truck size={16} />,
      },
    ];

    if (status.actionRequired > 0) {
      items.push({
        id: "action-required",
        title: "Action Required Reports",
        message: "Reports need field action in the selected dashboard scope.",
        count: status.actionRequired,
        route: "/city",
        color: "#ea580c",
        soft: "#fff7ed",
        border: "#fed7aa",
        icon: <AlertTriangle size={16} />,
      });
    }

    return items.filter((item) => item.count > 0);
  }, [requestStats, status.actionRequired]);


  const headerNotificationCount = useMemo(
    () => notifications.reduce((sum, item) => sum + item.count, 0),
    [notifications]
  );

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("matrixtrack:city-notifications", {
        detail: { count: headerNotificationCount },
      })
    );
  }, [headerNotificationCount]);

  const directoryRoleOptions = useMemo(
    () =>
      Array.from(
        new Set(users.flatMap((user) => getUserRoleLabels(user)))
      ).sort(),
    [users]
  );

  const directoryModuleOptions = useMemo(
    () =>
      Array.from(
        new Set(users.flatMap((user) => getUserModuleLabels(user)))
      ).sort(),
    [users]
  );

  const directoryStatusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((user) => getUserStatus(user))
            .filter(Boolean)
        )
      ).sort(),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const roles = getUserRoleLabels(user);
      const modules = getUserModuleLabels(user);
      const statusLabel = getUserStatus(user);

      const matchesSearch =
        !query ||
        norm(user.name).toLowerCase().includes(query) ||
        norm(user.email).toLowerCase().includes(query) ||
        norm(user.phone).toLowerCase().includes(query) ||
        roles.some((role) => role.toLowerCase().includes(query)) ||
        modules.some((module) => module.toLowerCase().includes(query));

      const matchesRole =
        directoryRole === "ALL" || roles.includes(directoryRole);

      const matchesModule =
        directoryModule === "ALL" || modules.includes(directoryModule);

      const matchesStatus =
        directoryStatus === "ALL" || statusLabel === directoryStatus;

      return (
        matchesSearch &&
        matchesRole &&
        matchesModule &&
        matchesStatus
      );
    });
  }, [
    users,
    search,
    directoryRole,
    directoryModule,
    directoryStatus,
  ]);

  const visibleDirectoryUsers = filteredUsers.slice(0, 10);


  const insightTopGeo: any = heat[0];

  const insightRiskGeo: any = [...heat].sort(
    (a: any, b: any) => b.exceptions - a.exceptions
  )[0];

  const insightBestModule = [...modulePerformance]
    .filter((item) => item.total > 0)
    .sort((a, b) => b.approval - a.approval)[0];

  const insightTopSupervisor: any = supervisorPerformance[0];

  const donut = [
    {
      name: "Approved",
      value: status.approved,
      color: "#10b981",
    },
    {
      name: "Rejected",
      value: status.rejected,
      color: "#f43f5e",
    },
    {
      name: "Pending",
      value: status.pending,
      color: "#f59e0b",
    },
    {
      name: "Action Required",
      value: status.actionRequired,
      color: "#f97316",
    },
  ];

  async function downloadPdf() {
    if (!reportRef.current) return;

    setPdfBusy(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(reportRef.current, {
        scale: 1.25,
        useCORS: true,
        backgroundColor: "#f8fafc",
      });

      const image = canvas.toDataURL("image/jpeg", 0.9);

      const pdf = new jsPDF("p", "mm", "a4");
      const width = 190;
      const height = (canvas.height * width) / canvas.width;
      const pageHeight = 277;

      let remainingHeight = height;
      let position = 10;

      pdf.addImage(image, "JPEG", 10, position, width, height);
      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(image, "JPEG", 10, position, width, height);
        remainingHeight -= pageHeight;
      }

      pdf.save(`City_Admin_Dashboard_${filterDate}.pdf`);
    } catch (error) {
      console.error("PDF download failed, opening print fallback:", error);
      window.print();
    } finally {
      setPdfBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Activity className="animate-spin text-blue-600" size={28} />
          <span className="text-xs font-bold text-slate-500">
            Loading city analytics...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={reportRef}
      className="space-y-5 pb-12 max-w-[1500px] mx-auto"
    >
      {/* FILTERS - directly below portal hero */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Filter size={15} />
            </span>

            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Dashboard Filters
              </h2>

              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                {userCityName} dashboard filters drive all analytics below.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadAll(false)}
              className="h-9 rounded-xl border border-slate-200 px-3 text-[11px] font-extrabold text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 transition"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={downloadPdf}
              className="h-9 rounded-xl bg-blue-600 px-3.5 text-[11px] font-extrabold text-white flex items-center gap-1.5 hover:bg-blue-700 transition shadow-sm"
            >
              <Download size={13} />
              {pdfBusy ? "Preparing..." : "Download PDF"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-6">
          <Field label="Date">
            <input
              type="date"
              max={today}
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-bold outline-none focus:border-blue-400"
            />
          </Field>

          <Field label="Zone">
            <Select
              value={zone}
              onChange={(value) => {
                setZone(value);
                setWard("ALL");
                setArea("ALL");
              }}
              options={[
                { value: "ALL", label: "All Zones" },
                ...zones.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
          </Field>

          <Field label="Ward">
            <Select
              value={ward}
              onChange={(value) => {
                setWard(value);
                setArea("ALL");
              }}
              options={[
                { value: "ALL", label: "All Wards" },
                ...visibleWards.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
          </Field>

          <Field label="Area">
            <Select
              value={area}
              onChange={setArea}
              options={[
                { value: "ALL", label: "All Areas" },
                ...visibleAreas.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
          </Field>

          <Field label="Module">
            <Select
              value="INSPECTION"
              onChange={() => {}}
              options={[
                {
                  value: "INSPECTION",
                  label: "Inspection & Performance",
                },
              ]}
            />
          </Field>

          <Field label="Sub Module">
            <Select
              value={subModule}
              onChange={(value) => setSubModule(value as "ALL" | ModuleKey)}
              options={[
                { value: "ALL", label: "All Sub Modules" },
                { value: "SWEEPING", label: "Sweeping" },
                {
                  value: "TOILET",
                  label: "Cleanliness of Toilets",
                },
                { value: "TWINBIN", label: "Litter Bins" },
                { value: "TASKFORCE", label: "GVP" },
              ]}
            />
          </Field>
        </div>
      </section>

      {/* CITY NOTIFICATION + WORKFORCE COMMAND CENTER */}
      <section id="city-notification-center" className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/70 via-white to-violet-50/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Bell size={18} />

              {requestNotificationCount > 0 && (
                <span className="absolute -right-2 -top-2 min-w-5 h-5 rounded-full bg-rose-500 px-1.5 text-[9px] font-black text-white flex items-center justify-center border-2 border-white">
                  {requestNotificationCount > 99 ? "99+" : requestNotificationCount}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black text-slate-900">
                  City Notification Center
                </h2>

                {requestNotificationCount > 0 ? (
                  <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[9px] font-black uppercase text-rose-600">
                    {requestNotificationCount} pending
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600">
                    Up to date
                  </span>
                )}
              </div>

              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                New registration requests, operational alerts and workforce availability.
                Auto-refreshes every 60 seconds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notificationUpdatedAt && (
              <span className="hidden sm:inline text-[9px] font-bold text-slate-400">
                Updated{" "}
                {notificationUpdatedAt.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            )}

            <button
              type="button"
              onClick={() => loadNotificationData()}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 transition"
            >
              <RefreshCw size={12} />
              Check Now
            </button>

            <button
              type="button"
              onClick={() => setNotificationOpen((open) => !open)}
              className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition"
              aria-label={notificationOpen ? "Hide notifications" : "Show notifications"}
            >
              {notificationOpen ? (
                <ChevronUp size={15} />
              ) : (
                <ChevronDown size={15} />
              )}
            </button>
          </div>
        </div>

        {notificationOpen && (
          <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.55fr]">
            {/* REQUESTS / NEW NOTIFICATIONS */}
            <div className="p-4 lg:p-5 xl:border-r border-slate-100">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    New & Pending Notifications
                  </h3>

                  <p className="text-[9px] font-semibold text-slate-400 mt-0.5">
                    Click any item to open the related review screen.
                  </p>
                </div>

                <span className="text-[9px] font-black text-slate-400">
                  {notifications.length} alert type{notifications.length === 1 ? "" : "s"}
                </span>
              </div>

              {notifications.length === 0 ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-600 border border-emerald-100">
                    <CheckCircle2 size={17} />
                  </span>

                  <div>
                    <div className="text-xs font-black text-emerald-800">
                      No pending registration notifications
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600 mt-1">
                      New requests will appear here automatically.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => router.push(item.route)}
                      className="group w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                      style={{
                        background: item.soft,
                        borderColor: item.border,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border"
                          style={{
                            color: item.color,
                            borderColor: item.border,
                          }}
                        >
                          {item.icon}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className="text-[11px] font-black text-slate-800"
                              title={item.title}
                            >
                              {item.title}
                            </div>

                            <span
                              className="min-w-7 h-6 rounded-lg px-2 flex items-center justify-center text-[10px] font-black text-white"
                              style={{ background: item.color }}
                            >
                              {item.count}
                            </span>
                          </div>

                          <div className="mt-1 text-[9px] leading-4 font-semibold text-slate-500">
                            {item.message}
                          </div>

                          <div
                            className="mt-2 inline-flex items-center gap-1 text-[9px] font-black uppercase"
                            style={{ color: item.color }}
                          >
                            Review
                            <ArrowRight
                              size={11}
                              className="transition-transform group-hover:translate-x-0.5"
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* WORKFORCE ALLOCATION - SUPERVISOR / EMPLOYEE SEPARATE */}
            <div className="p-4 lg:p-5 bg-slate-50/45">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                  <Users size={15} />
                </span>

                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                    Workforce Allocation
                  </h3>

                  <p className="text-[9px] font-semibold text-slate-400">
                    Supervisor and employee assignments shown separately
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <WorkforceRoleCard
                  title="Supervisors"
                  total={workforce.supervisors.total}
                  assigned={workforce.supervisors.assigned}
                  available={workforce.supervisors.available}
                  allocation={workforce.supervisors.allocation}
                  color="#7c3aed"
                  soft="#f5f3ff"
                />

                <WorkforceRoleCard
                  title="Employees"
                  total={workforce.employees.total}
                  assigned={workforce.employees.assigned}
                  available={workforce.employees.available}
                  allocation={workforce.employees.allocation}
                  color="#2563eb"
                  soft="#eff6ff"
                />
              </div>

              {(workforce.supervisors.available > 0 ||
                workforce.employees.available > 0) && (
                <button
                  type="button"
                  onClick={() => router.push("/portal-home/registered-users")}
                  className="mt-3 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left hover:bg-amber-100/70 transition"
                >
                  <div className="flex items-center gap-2 text-[10px] font-black text-amber-800">
                    <AlertTriangle size={13} />
                    Workforce available for assignment
                  </div>

                  <div className="text-[9px] font-semibold text-amber-600 mt-1 pl-5">
                    {workforce.supervisors.available} supervisor(s) and{" "}
                    {workforce.employees.available} employee(s) are currently
                    not allocated to active work.
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* LIVE ALERTS */}
      <section className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-blue-50 border-r border-blue-100 px-4 py-3 flex items-center">
          <Bell size={18} className="text-blue-600 animate-pulse" />
        </div>

        <div className="p-3 flex flex-wrap gap-4 items-center text-xs font-bold text-slate-700">
          {status.actionRequired > 0 && (
            <span className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              {status.actionRequired} reports require field action.
            </span>
          )}

          {status.rejected > 0 && (
            <span className="flex items-center gap-2">
              <XCircle size={14} className="text-rose-500" />
              {status.rejected} reports rejected.
            </span>
          )}

          {!status.actionRequired && !status.rejected && (
            <span className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              No critical exceptions in selected scope.
            </span>
          )}
        </div>
      </section>

      {/* MAIN CHARTS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Inspection Trend gets the width of two chart containers */}
        <div className="lg:col-span-2">
          <Card
            title="Inspection Trend"
            sub="Daily number of submitted inspection reports by module"
            height="h-[410px]"
            action={
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-[9px] font-black uppercase text-slate-400">
                  Trend End Date
                </span>
                <input
                  type="date"
                  max={today}
                  value={filterDate}
                  onChange={(event) => setFilterDate(event.target.value)}
                  className="bg-transparent text-[10px] font-black text-slate-700 outline-none cursor-pointer"
                />
              </label>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ top: 10, right: 20, left: -15, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#eef2f7"
                />

                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                />

                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  label={{
                    value: "No. of Reports",
                    angle: -90,
                    position: "insideLeft",
                    offset: 14,
                    style: {
                      fill: "#64748b",
                      fontSize: 10,
                      fontWeight: 800,
                    },
                  }}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                    fontSize: "11px",
                  }}
                />

                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{
                    fontSize: "10px",
                    fontWeight: 700,
                    paddingTop: "8px",
                  }}
                />

                {KEYS.filter(
                  (key) => subModule === "ALL" || key === subModule
                ).map((key) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={MODULES[key].short}
                    stroke={MODULES[key].color}
                    fill={MODULES[key].soft}
                    strokeWidth={3}
                    dot={{
                      r: 3,
                      fill: MODULES[key].color,
                      strokeWidth: 0,
                    }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Status stays beside the enlarged trend */}
        <Card
          title="Status Distribution"
          sub={`${status.total} selected-date reports`}
          height="h-[390px]"
        >
          <div className="flex h-full items-center">
            <div className="relative h-full w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donut}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={76}
                    stroke="none"
                  >
                    {donut.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <b className="text-2xl">{status.total}</b>
                <span className="text-[9px] text-slate-400">TOTAL</span>
              </div>
            </div>

            <div className="w-1/2 space-y-3 pl-3">
              {donut.map((item) => (
                <div
                  key={item.name}
                  className="flex justify-between gap-3 text-[10px] font-bold"
                >
                  <span className="flex gap-2 items-center">
                    <i
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: item.color }}
                    />
                    {item.name}
                  </span>

                  <b>{item.value}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* Module Performance moved below so the large trend stays clean */}
      <section>
        <Card
          title="Module Performance"
          sub="Approval rate by sub module"
          height="h-[310px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={modulePerformance}
              margin={{ top: 8, right: 20, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#eef2f7"
              />

              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
              />

              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
              />

              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                  fontSize: "11px",
                }}
              />

              <Bar
                dataKey="approval"
                name="Approval %"
                radius={[8, 8, 0, 0]}
                maxBarSize={70}
              >
                {modulePerformance.map((item) => (
                  <Cell
                    key={item.key}
                    fill={MODULES[item.key].color}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* EXECUTIVE INSIGHTS */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Insight
          icon={<Flame size={17} />}
          label="Activity Hotspot"
          title={insightTopGeo?.name || "No activity"}
          value={
            insightTopGeo
              ? `${insightTopGeo.total} reports`
              : "0 reports"
          }
        />

        <Insight
          icon={<Trophy size={17} />}
          label="Best Module"
          title={insightBestModule?.name || "No data"}
          value={
            insightBestModule
              ? `${insightBestModule.approval}% approval`
              : "0% approval"
          }
        />

        <Insight
          icon={<AlertTriangle size={17} />}
          label="Risk Hotspot"
          title={insightRiskGeo?.name || "No hotspot"}
          value={
            insightRiskGeo
              ? `${insightRiskGeo.exceptions} exceptions`
              : "0 exceptions"
          }
        />

        <Insight
          icon={<Sparkles size={17} />}
          label="Top Supervisor"
          title={insightTopSupervisor?.name || "No activity"}
          value={
            insightTopSupervisor
              ? `${insightTopSupervisor.rate}% approval`
              : "0% approval"
          }
        />
      </section>

      {/* ADAPTIVE HEAT MAP + SUPERVISOR RANKING */}
      <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Head
            title={`${heatLevelLabel} Activity Heat Map`}
            sub={`Report concentration by ${heatLevelLabel.toLowerCase()} and sub module`}
            icon={<Layers3 size={17} />}
          />

          <div className="overflow-x-auto p-5">
            {heat.length === 0 ? (
              <Empty />
            ) : (
              <div className="min-w-[700px] space-y-2">
                <div className="grid grid-cols-[170px_repeat(4,1fr)_90px] gap-2 text-[9px] font-black uppercase text-slate-400 mb-2">
                  <div>{heatLevelLabel}</div>
                  <div className="text-center">Sweeping</div>
                  <div className="text-center">Toilets</div>
                  <div className="text-center">Litter Bins</div>
                  <div className="text-center">GVP</div>
                  <div className="text-center">Exceptions</div>
                </div>

                {heat.map((row: any) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[170px_repeat(4,1fr)_90px] gap-2"
                  >
                    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                      <div className="font-black text-[11px] text-slate-800">
                        {row.name}
                      </div>

                      <div className="text-[9px] text-slate-400">
                        {row.total} total
                      </div>
                    </div>

                    {KEYS.map((key) => {
                      const value = row.modules[key];
                      const ratio = value / maxHeat;

                      return (
                        <div
                          key={key}
                          className="rounded-xl border border-slate-100 flex items-center justify-center font-black text-sm transition"
                          style={{
                            background: value
                              ? ratio > 0.7
                                ? MODULES[key].color
                                : MODULES[key].soft
                              : "#f8fafc",
                            color:
                              value && ratio > 0.7
                                ? "#fff"
                                : value
                                  ? MODULES[key].color
                                  : "#94a3b8",
                          }}
                        >
                          {value}
                        </div>
                      );
                    })}

                    <div
                      className={`rounded-xl flex items-center justify-center font-black text-xs border ${
                        row.exceptions
                          ? "bg-rose-50 text-rose-600 border-rose-200"
                          : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      }`}
                    >
                      {row.exceptions}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Head
            title="Supervisor Performance"
            sub="Ranked by approval rate"
            icon={<Trophy size={17} />}
          />

          <div className="p-4 space-y-2.5">
            {supervisorPerformance.length === 0 ? (
              <Empty />
            ) : (
              supervisorPerformance.map((item: any, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-black text-slate-800">
                        {index < 3
                          ? ["🥇", "🥈", "🥉"][index]
                          : `#${index + 1}`}{" "}
                        {item.name}
                      </div>

                      <div className="text-[9px] text-slate-400 mt-1">
                        {item.total} reports • {item.approved} approved
                      </div>
                    </div>

                    <span className="text-[10px] font-black bg-blue-50 text-blue-700 rounded-lg px-2 py-1 h-fit">
                      {item.rate}%
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-slate-200 mt-2.5 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* EXTRA CITY INSIGHTS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-black uppercase text-slate-800">
            Swachh Ranking Snapshot
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            <Small
              label="Participants"
              value={swachh?.totalParticipants || 0}
            />
            <Small
              label="Assessments"
              value={swachh?.totalAssessments || 0}
            />
            <Small
              label="QC Approved"
              value={swachh?.qcApproved || 0}
            />
            <Small
              label="Under Review"
              value={swachh?.underReview || 0}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-black uppercase text-slate-800">
            Executive Readout
          </h3>

          <div className="mt-4 space-y-2 text-[11px] font-semibold text-slate-600">
            <Read
              label="Approval"
              value={`${status.approval}% approval in selected scope`}
            />

            <Read
              label="Coverage"
              value={`${zone === "ALL" ? zones.length : 1} zone(s), ${
                ward === "ALL" ? visibleWards.length : 1
              } ward(s), ${area === "ALL" ? visibleAreas.length : 1} area(s)`}
            />

            <Read
              label="Priority"
              value={`${
                status.rejected + status.actionRequired
              } exception report(s) need attention`}
            />
          </div>
        </div>
      </section>

      {/* PLATFORM USER DIRECTORY - 10 ROW PREVIEW */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 p-5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-600" />

                <h3 className="text-sm font-black text-slate-800">
                  Platform User Directory
                </h3>

                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700">
                  {filteredUsers.length}
                </span>
              </div>

              <p className="text-[10px] uppercase text-slate-400 font-bold mt-1">
                Cross-system access and role breakdown
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[210px] flex-1 xl:flex-none">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search personnel..."
                  className="h-9 w-full xl:w-60 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[10px] font-bold outline-none focus:border-blue-400"
                />
              </div>

              <select
                value={directoryRole}
                onChange={(event) => setDirectoryRole(event.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 outline-none"
              >
                <option value="ALL">All Roles</option>

                {directoryRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              <select
                value={directoryModule}
                onChange={(event) => setDirectoryModule(event.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 outline-none"
              >
                <option value="ALL">All Modules</option>

                {directoryModuleOptions.map((module) => (
                  <option key={module} value={module}>
                    {prettyModuleName(module)}
                  </option>
                ))}
              </select>

              <select
                value={directoryStatus}
                onChange={(event) => setDirectoryStatus(event.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-600 outline-none"
              >
                <option value="ALL">All Status</option>

                {directoryStatusOptions.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {statusValue}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => router.push("/portal-home/registered-users")}
                className="h-9 rounded-xl bg-blue-600 px-3.5 text-[10px] font-black text-white flex items-center gap-1.5 hover:bg-blue-700 transition shadow-sm"
              >
                View All Users
                <ArrowRight size={12} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] font-bold text-slate-400">
            <span>
              Showing {Math.min(10, filteredUsers.length)} of {filteredUsers.length} matching user
              {filteredUsers.length === 1 ? "" : "s"}
            </span>

            {(search ||
              directoryRole !== "ALL" ||
              directoryModule !== "ALL" ||
              directoryStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDirectoryRole("ALL");
                  setDirectoryModule("ALL");
                  setDirectoryStatus("ALL");
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear directory filters
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-white">
              <tr className="border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <th className="p-4">Personnel</th>
                <th className="p-4">System Roles</th>
                <th className="p-4">Active Modules</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {visibleDirectoryUsers.map((user, index) => {
                const roles = getUserRoleLabels(user);
                const modules = getUserModuleLabels(user);
                const statusValue = getUserStatus(user);

                return (
                  <tr
                    key={user.id || user.email || index}
                    className="hover:bg-slate-50 transition"
                  >
                    <td className="p-4">
                      <div className="font-black text-[11px] text-slate-900">
                        {user.name || "Unnamed Personnel"}
                      </div>

                      <div className="mt-1 text-[9px] font-semibold text-slate-400">
                        {user.email || user.phone || "-"}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {roles.length ? (
                          roles.map((role) => (
                            <span
                              key={role}
                              className="rounded-md border border-violet-100 bg-violet-50 px-2 py-0.5 text-[8px] font-black text-violet-700"
                            >
                              {role.replace(/_/g, " ")}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-400">
                            No role assigned
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {modules.length ? (
                          modules.slice(0, 5).map((module) => (
                            <span
                              key={module}
                              className="rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[8px] font-black text-blue-700"
                            >
                              {prettyModuleName(module)}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] font-semibold text-slate-400">
                            No specific module
                          </span>
                        )}

                        {modules.length > 5 && (
                          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[8px] font-black text-slate-500">
                            +{modules.length - 5}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <span
                        className={`rounded-md border px-2 py-1 text-[8px] font-black ${
                          statusValue === "ACTIVE"
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {statusValue}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {visibleDirectoryUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-14 text-center text-[10px] font-bold text-slate-400"
                  >
                    No personnel records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length > 10 && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-[9px] font-bold text-slate-400">
              Preview is limited to 10 users for a cleaner dashboard.
            </span>

            <button
              type="button"
              onClick={() => router.push("/portal-home/registered-users")}
              className="text-[9px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Open full directory
              <ArrowRight size={11} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function getUserRoleLabels(user: any): string[] {
  const raw = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    user?.role,
    user?.systemRole,
    user?.primaryRole,
  ];

  return Array.from(
    new Set(
      raw
        .map((item: any) =>
          norm(
            typeof item === "string"
              ? item
              : item?.key ?? item?.name ?? item?.role ?? item?.code
          )
        )
        .filter(Boolean)
        .map(up)
    )
  );
}

function getUserModuleLabels(user: any): string[] {
  const raw = [
    ...(Array.isArray(user?.modules) ? user.modules : []),
    ...(Array.isArray(user?.assignedModules) ? user.assignedModules : []),
    ...(Array.isArray(user?.workspaceModules) ? user.workspaceModules : []),
    ...(Array.isArray(user?.moduleAccess) ? user.moduleAccess : []),
    ...(Array.isArray(user?.access?.modules) ? user.access.modules : []),
  ];

  const values = raw
    .map((item: any) =>
      norm(
        typeof item === "string"
          ? item
          : item?.module?.key ??
              item?.module?.name ??
              item?.moduleKey ??
              item?.moduleName ??
              item?.key ??
              item?.name ??
              item?.code
      )
    )
    .filter(Boolean)
    .map(up);

  return Array.from(new Set(values));
}

function getUserStatus(user: any): string {
  if (user?.enabled === false) return "INACTIVE";

  const status = up(user?.status || user?.accountStatus || "ACTIVE");

  if (["DISABLED", "BLOCKED", "INACTIVE"].includes(status)) {
    return "INACTIVE";
  }

  return status || "ACTIVE";
}

function prettyModuleName(value: string): string {
  const key = up(value);

  const names: Record<string, string> = {
    TASKFORCE: "Inspection & Performance",
    INSPECTION_AND_PERFORMANCE: "Inspection & Performance",
    SWEEPING: "Sweeping",
    TOILET: "Cleanliness of Toilets",
    CLEANLINESS_OF_TOILET: "Cleanliness of Toilets",
    TWINBIN: "Litter Bins",
    LITTERBIN: "Litter Bins",
    LITTER_BINS: "Litter Bins",
    GVP: "GVP",
    WARD_RANKING: "Ward Ranking",
    SWACHH_RANKING: "Ward Ranking",
    WORKFORCE_ATTENDANCE: "Workforce Attendance",
    ATTENDANCE: "Workforce Attendance",
  };

  return (
    names[key] ||
    value
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function WorkforceRoleCard({
  title,
  total,
  assigned,
  available,
  allocation,
  color,
  soft,
}: {
  title: string;
  total: number;
  assigned: number;
  available: number;
  allocation: number;
  color: string;
  soft: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase text-slate-400">
            {title}
          </div>

          <div className="text-2xl font-black text-slate-900 mt-1">
            {total}
          </div>

          <div className="text-[8px] font-black uppercase text-slate-400 mt-0.5">
            Total {title}
          </div>
        </div>

        <div className="text-right">
          <div
            className="text-xl font-black"
            style={{ color }}
          >
            {allocation}%
          </div>

          <div className="text-[8px] font-black uppercase text-slate-400">
            Assigned
          </div>
        </div>
      </div>

      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-3">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${allocation}%`,
            background: color,
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div
          className="rounded-xl border border-slate-100 p-2.5"
          style={{ background: soft }}
        >
          <div
            className="text-base font-black"
            style={{ color }}
          >
            {assigned}
          </div>

          <div className="mt-0.5 text-[8px] font-black uppercase text-slate-400">
            Assigned
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50 p-2.5">
          <div className="text-base font-black text-amber-600">
            {available}
          </div>

          <div className="mt-0.5 text-[8px] font-black uppercase text-slate-400">
            Available
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="block mb-1.5 text-[9px] font-black uppercase text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-[11px] font-bold outline-none focus:border-blue-400"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={13}
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
      />
    </div>
  );
}



function Card({
  title,
  sub,
  children,
  height = "h-[330px]",
  action,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  height?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`${height} rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-black uppercase text-slate-800">
            {title}
          </h3>

          <p className="text-[10px] text-slate-400 mt-1">
            {sub}
          </p>
        </div>

        {action}
      </div>

      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function Insight({
  icon,
  label,
  title,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex gap-3">
      <span className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        {icon}
      </span>

      <div className="min-w-0">
        <div className="text-[8px] font-black uppercase text-slate-400">
          {label}
        </div>

        <div className="text-sm font-black text-slate-900 mt-1 truncate">
          {title}
        </div>

        <div className="text-[11px] font-black text-blue-600 mt-1">
          {value}
        </div>
      </div>
    </div>
  );
}

function Head({
  title,
  sub,
  icon,
}: {
  title: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
      <span className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
        {icon}
      </span>

      <div>
        <h3 className="text-xs font-black uppercase text-slate-800">
          {title}
        </h3>

        <p className="text-[10px] text-slate-400 mt-0.5">
          {sub}
        </p>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="min-h-[150px] flex items-center justify-center text-[11px] font-bold text-slate-400">
      No data for selected filters.
    </div>
  );
}

function Small({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
      <div className="text-[8px] font-black uppercase text-slate-400">
        {label}
      </div>

      <div className="text-xl font-black mt-1">{value}</div>
    </div>
  );
}

function Read({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 flex gap-3">
      <span className="min-w-[70px] text-[9px] font-black uppercase text-blue-600">
        {label}
      </span>

      <span>{value}</span>
    </div>
  );
}
