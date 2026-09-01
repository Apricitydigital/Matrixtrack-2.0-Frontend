"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Activity, CheckCircle2, XCircle, TrendingUp, Filter, Calendar } from "lucide-react";
import { apiFetch } from "@lib/apiClient";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

type UserPerformanceModalProps = {
  user: any; // The selected user object from the directory
  isOpen: boolean;
  onClose: () => void;
};

export default function UserPerformanceModal({
  user,
  isOpen,
  onClose,
}: UserPerformanceModalProps) {
  // Filter mode: 'preset' (15/30 days), 'month' (specific month/year), 'custom' (custom start/end date)
  const [filterMode, setFilterMode] = useState<"15" | "30" | "month" | "custom">("30");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{ present: number; absent: number; total: number } | null | undefined>(undefined);

  // Compute start/end dates
  const dateRange = useMemo(() => {
    const now = new Date();
    if (filterMode === "15") {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15);
      return { start, end };
    } else if (filterMode === "30") {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      return { start, end };
    } else if (filterMode === "month") {
      const [y, m] = selectedMonth.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1); // 1st of next month
      return { start, end };
    } else {
      // custom
      const start = customStart ? new Date(`${customStart}T00:00:00.000Z`) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      const end = customEnd ? new Date(`${customEnd}T23:59:59.999Z`) : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return { start, end };
    }
  }, [filterMode, selectedMonth, customStart, customEnd]);

  useEffect(() => {
    let isActive = true;
    const fetchPerformance = async () => {
      const targetUserId = user?.id || user?._id || user?.userId;
      if (!isOpen || !targetUserId) return;
      
      setLoading(true);
      try {
        const { start, end } = dateRange;

        const startDateIso = start.toISOString();
        const endDateIso = end.toISOString();

        const params = new URLSearchParams({
          startDate: startDateIso,
          endDate: endDateIso,
          userId: targetUserId,
          userName: (user.name || "").trim(),
        });

        const searchKey = user.name || user.employeeId || "";
        const attParams = new URLSearchParams({
          from: startDateIso.split("T")[0],
          to: endDateIso.split("T")[0],
          search: searchKey,
          pageSize: "100",
        });

        const [recordsRes, attRes] = await Promise.allSettled([
          apiFetch<{ data: any[] }>(`/city/dashboard/inspection-records?${params.toString()}`),
          apiFetch<any>(`/city/attendance/dashboard?${attParams.toString()}`)
        ]);
        
        if (isActive) {
          if (recordsRes.status === "fulfilled" && recordsRes.value?.data) {
            setRecords(recordsRes.value.data);
          } else {
            setRecords([]);
          }

          if (attRes.status === "fulfilled" && attRes.value) {
            const attData = attRes.value;
            let present = 0;
            let absent = 0;

            if (Array.isArray(attData?.records) && attData.records.length > 0) {
              attData.records.forEach((r: any) => {
                const status = (r.status || "").toUpperCase();
                if (status === "PRESENT" || status === "P" || status === "HALF_DAY") present++;
                else if (status === "ABSENT" || status === "A") absent++;
              });
              setAttendance({ present, absent, total: present + absent });
            } else if (Array.isArray(attData?.topEmployees) && attData.topEmployees.length > 0) {
              const matchedEmp = attData.topEmployees.find((e: any) => 
                (user.name && e.employeeName?.toLowerCase().trim() === user.name.toLowerCase().trim()) ||
                (user.employeeId && e.attendanceId === user.employeeId) ||
                (user.id && e.matrixTrackUserId === user.id)
              );

              if (matchedEmp) {
                setAttendance({
                  present: matchedEmp.presentDays || 0,
                  absent: matchedEmp.absentDays || 0,
                  total: matchedEmp.totalDays || ((matchedEmp.presentDays || 0) + (matchedEmp.absentDays || 0)),
                });
              } else {
                setAttendance({ present: 0, absent: 0, total: 0 });
              }
            } else {
              setAttendance({ present: 0, absent: 0, total: 0 });
            }
          } else {
            setAttendance({ present: 0, absent: 0, total: 0 });
          }
        }
      } catch (error) {
        console.error("Failed to fetch user performance:", error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchPerformance();
    return () => {
      isActive = false;
    };
  }, [isOpen, user?.id, user?._id, user?.userId, dateRange, user?.name]);

  // Generate Month Options (e.g. past 12 months)
  const monthOptions = useMemo(() => {
    const list: { label: string; value: string }[] = [];
    const d = new Date();
    for (let i = 0; i < 12; i++) {
      const cur = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const val = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
      const label = cur.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      list.push({ label, value: val });
    }
    return list;
  }, []);

  // Aggregate metrics
  const formatModule = (m: any) => {
    const str = typeof m === "string" ? m : (m?.name || m?.module || String(m));
    const up = (str || "").toUpperCase();
    if (up === "TWINBIN" || up === "LITTERBIN") return "Litterbin";
    if (up === "CLEANLINESS_OF_TOILET" || up === "TOILET") return "Toilet";
    if (up === "SWEEPING") return "Sweeping";
    if (up === "TASKFORCE") return "Taskforce";
    return up.replace(/_/g, " ");
  };

  const metrics = useMemo(() => {
    const total = records.length;
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    
    const byModule: Record<string, number> = {};
    const byDate: Record<string, number> = {};

    // Initialize daily chart data across the dateRange
    const startTime = dateRange.start.getTime();
    const endTime = Math.min(dateRange.end.getTime(), Date.now() + 86400000);
    const dayDiff = Math.max(1, Math.min(90, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24))));

    for (let i = 0; i < dayDiff; i++) {
      const d = new Date(startTime);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      byDate[dateStr] = 0;
    }

    records.forEach((record) => {
      const status = (record.status || "").toUpperCase();
      if (["APPROVED", "RESOLVED", "ACTION_TAKEN"].includes(status)) approved++;
      else if (status === "REJECTED") rejected++;
      else pending++;

      const module = record.__module || "UNKNOWN";
      if (module !== "TASKFORCE") {
        byModule[module] = (byModule[module] || 0) + 1;
      }

      const rDate = new Date(record.createdAt);
      if (!Number.isNaN(rDate.getTime())) {
         const dateStr = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, "0")}-${String(rDate.getDate()).padStart(2, "0")}`;
         if (byDate[dateStr] !== undefined) {
           byDate[dateStr]++;
         } else {
           byDate[dateStr] = 1;
         }
      }
    });

    const dailyData: { date: string; inspections: any }[] = [];
    Object.keys(byDate).sort().forEach(date => {
      dailyData.push({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        inspections: byDate[date]
      });
    });

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    
    const rawTopModule = Object.entries(byModule).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
    const topModule = rawTopModule !== "None" ? formatModule(rawTopModule) : "None";

    const moduleData = Object.keys(byModule).map(k => ({
      name: formatModule(k),
      value: byModule[k]
    }));

    return { total, approved, rejected, pending, approvalRate, topModule, dailyData, moduleData };
  }, [records, dateRange]);

  const isEmployee = useMemo(() => {
    const roles = [
      ...(Array.isArray(user?.roles) ? user.roles : []),
      user?.role,
      user?.systemRole,
      user?.primaryRole,
    ].map((r: any) => (typeof r === "string" ? r : r?.name || r?.role || "").toUpperCase());
    return roles.includes("EMPLOYEE") && !roles.includes("SUPERVISOR") && !roles.includes("ADMIN");
  }, [user]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 sm:p-6 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Compact & Slim) */}
        <div className="bg-[#1e2336] px-6 py-4 relative shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-3 min-w-0">
               <div className="min-w-0">
                 <div className="flex items-center gap-2 mb-1">
                   <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase text-white ${isEmployee ? 'bg-amber-500' : 'bg-rose-500'}`}>
                     {isEmployee ? "Employee Profile" : "Supervisor Performance"}
                   </span>
                   <span className="px-2 py-0.5 rounded-full border border-white/20 text-[9px] font-bold text-white/70">
                     {isEmployee ? (attendance ? `${attendance.present} Present Days` : "Attendance") : `${metrics.total || 0} inspections`}
                   </span>
                 </div>
                 <div className="flex items-center gap-3">
                   <h2 className="text-xl font-black text-white truncate">
                      {user?.name || "User"}
                   </h2>
                   {!isEmployee && <span className="text-sm font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded-md">{metrics.approvalRate}% Approval</span>}
                   {isEmployee && attendance && <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">{attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 0}% Attendance</span>}
                 </div>
               </div>
             </div>

             {/* Date / Month / Custom Filter Controls */}
             <div className="flex flex-wrap items-center gap-2 shrink-0">
               {/* Segmented Control Bar */}
               <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-white/10 shadow-inner gap-1">
                 {/* 30 Days Preset */}
                 <button
                   onClick={() => setFilterMode("30")}
                   className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150 ${
                     filterMode === "30"
                       ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                       : "text-slate-300 hover:text-white hover:bg-white/5"
                   }`}
                 >
                   30 Days
                 </button>

                 {/* Month Dropdown Pill */}
                 <div
                   className={`relative flex items-center rounded-xl px-3 py-1.5 transition-all duration-150 ${
                     filterMode === "month"
                       ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                       : "text-slate-300 hover:text-white hover:bg-white/5"
                   }`}
                 >
                   <span className="text-[11px] font-bold mr-1.5 flex items-center gap-1 pointer-events-none">
                     <Calendar size={12} className={filterMode === "month" ? "text-white" : "text-slate-400"} />
                     {filterMode === "month" 
                       ? (monthOptions.find(o => o.value === selectedMonth)?.label || "Select Month")
                       : "Month"}
                   </span>
                   <select
                     value={filterMode === "month" ? selectedMonth : ""}
                     onChange={(e) => {
                       setSelectedMonth(e.target.value);
                       setFilterMode("month");
                     }}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[11px]"
                   >
                     <option value="" disabled className="text-slate-900">Select Month</option>
                     {monthOptions.map((opt) => (
                       <option key={opt.value} value={opt.value} className="text-slate-900 font-semibold">
                         {opt.label}
                       </option>
                     ))}
                   </select>
                 </div>

                 {/* Custom Range Toggle */}
                 <button
                   onClick={() => setFilterMode(filterMode === "custom" ? "30" : "custom")}
                   className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150 ${
                     filterMode === "custom"
                       ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                       : "text-slate-300 hover:text-white hover:bg-white/5"
                   }`}
                 >
                   Custom Range
                 </button>
               </div>

               {/* Custom Date Inputs inline when custom is active */}
               {filterMode === "custom" && (
                 <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 px-3 rounded-2xl border border-blue-500/40 shadow-inner text-[11px] text-white animate-in fade-in zoom-in-95 duration-150">
                   <input
                     type="date"
                     value={customStart}
                     onChange={(e) => setCustomStart(e.target.value)}
                     className="bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-2 py-1 text-[10px] font-semibold text-white outline-none focus:border-blue-400 cursor-pointer"
                   />
                   <span className="text-slate-400 text-[10px] font-bold">to</span>
                   <input
                     type="date"
                     value={customEnd}
                     onChange={(e) => setCustomEnd(e.target.value)}
                     className="bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-2 py-1 text-[10px] font-semibold text-white outline-none focus:border-blue-400 cursor-pointer"
                   />
                 </div>
               )}

               {/* Close Button */}
               <button
                 onClick={onClose}
                 className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/15 hover:text-white transition shadow-sm ml-1"
               >
                 <X size={16} />
               </button>
             </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Activity className="w-8 h-8 animate-pulse mb-3 text-blue-500" />
            <p className="text-xs font-bold">Loading personnel analytics...</p>
          </div>
        ) : (
          <div className="space-y-6">
              {/* User Assignment Info */}
              <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-slate-200">
                {(user?.assignedZone || user?.assignedWard || user?.assignedArea) && (
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-black text-slate-700 flex items-center gap-1.5 shadow-sm">
                    <span className="text-slate-400 font-bold">LOCATION:</span>
                    {[user.assignedZone?.name, user.assignedWard?.name, user.assignedArea?.name].filter(Boolean).join(" • ")}
                  </div>
                )}
                {user?.modules && user.modules.length > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-[11px] font-black text-blue-700 flex items-center gap-1.5 shadow-sm">
                    <span className="text-blue-400 font-bold">MODULES:</span>
                    {user.modules.map(formatModule).join(" • ")}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {user?.litterBins && user.litterBins.length > 0 && (
                    <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm">
                      <span className="text-slate-900 font-black mr-1">{user.litterBins.length}</span> Litterbins
                    </div>
                  )}
                  {user?.toilets && user.toilets.length > 0 && (
                    <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm">
                      <span className="text-slate-900 font-black mr-1">{user.toilets.length}</span> Toilets
                    </div>
                  )}
                  {user?.beats && user.beats.length > 0 && (
                    <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-600 shadow-sm">
                      <span className="text-slate-900 font-black mr-1">{user.beats.length}</span> Sweeping Beats
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              {isEmployee ? (
                /* EMPLOYEE SPECIFIC STATS */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-orange-50 border border-orange-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-orange-600">Total Tracked Days</span>
                      <Calendar size={16} className="text-orange-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-orange-950">
                      {attendance ? attendance.total : (attendance === undefined ? "..." : "-")}
                    </div>
                    <div className="text-[10px] font-semibold text-orange-600/80 mt-1">Selected Period</div>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-600">Present Days</span>
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-emerald-950">
                      {attendance ? attendance.present : (attendance === undefined ? "..." : "-")}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600/80 mt-1">Active on duty</div>
                  </div>

                  <div className="p-5 rounded-2xl bg-rose-50 border border-rose-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-rose-600">Absent Days</span>
                      <XCircle size={16} className="text-rose-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-rose-950">
                      {attendance ? attendance.absent : (attendance === undefined ? "..." : "-")}
                    </div>
                    <div className="text-[10px] font-semibold text-rose-600/80 mt-1">Unmarked / Absent</div>
                  </div>

                  <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-blue-600">Assigned Module</span>
                      <Filter size={16} className="text-blue-500" />
                    </div>
                    <div className="mt-2 text-lg font-black text-blue-950 truncate">
                      {user?.modules && user.modules.length > 0 ? user.modules.map(formatModule).join(", ") : "Sweeping"}
                    </div>
                    <div className="text-[10px] font-semibold text-blue-600/80 mt-1">Operational Module</div>
                  </div>
                </div>
              ) : (
                /* SUPERVISOR SPECIFIC STATS */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-blue-600">Total Activity</span>
                      <TrendingUp size={14} className="text-blue-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-blue-900">{metrics.total}</div>
                    <div className="text-[10px] font-semibold text-blue-600/80 mt-1">Inspections</div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-600">Approval Rate</span>
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-emerald-900">{metrics.approvalRate}%</div>
                    <div className="text-[10px] font-semibold text-emerald-600/80 mt-1">{metrics.approved} approved</div>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-rose-600">Rejected</span>
                      <XCircle size={14} className="text-rose-500" />
                    </div>
                    <div className="mt-2 text-2xl font-black text-rose-900">{metrics.rejected}</div>
                    <div className="text-[10px] font-semibold text-rose-600/80 mt-1">Rejected inspections</div>
                  </div>

                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-purple-600">Top Module</span>
                      <Filter size={14} className="text-purple-500" />
                    </div>
                    <div className="mt-2 text-lg font-black text-purple-900 truncate" title={metrics.topModule}>{metrics.topModule}</div>
                    <div className="text-[10px] font-semibold text-purple-600/80 mt-1">Most frequent</div>
                  </div>
                </div>
              )}
              {/* Charts or Detailed View */}
              {!isEmployee ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <h3 className="text-xs font-black text-slate-800 mb-4 uppercase">Daily Inspection Activity Trend</h3>
                    <div className="h-56 w-full">
                      {metrics.dailyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={metrics.dailyData}>
                            <defs>
                              <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} dx={-10} allowDecimals={false} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 700 }}
                              cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area type="monotone" dataKey="inspections" name="inspections" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">No activity data available</div>
                      )}
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <h3 className="text-xs font-black text-slate-800 mb-4 uppercase">Module Breakdown</h3>
                    <div className="h-56 w-full">
                      {metrics.moduleData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={metrics.moduleData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} allowDecimals={false} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} width={80} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 700 }}
                              cursor={{ fill: '#f8fafc' }}
                            />
                            <Bar dataKey="value" name="inspections" radius={[0, 4, 4, 0]} barSize={20}>
                              {metrics.moduleData.map((entry, index) => {
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400">No module data available</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* EMPLOYEE ATTENDANCE & BEATS HIGHLIGHT */
                <div className="space-y-4">
                  <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <h3 className="text-xs font-black text-slate-800 mb-2 uppercase">Field Assignment & Attendance Summary</h3>
                    <p className="text-[11px] text-slate-500 font-medium mb-4">
                      Field employees performance is measured by daily attendance, shift compliance, and inspections submitted across their assigned beats.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[9px] font-black uppercase text-slate-400">Assigned Ward & Zone</div>
                        <div className="text-sm font-black text-slate-800 mt-1">
                          {user?.assignedWard?.name || user?.assignedZone?.name || "Unassigned Zone"}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[9px] font-black uppercase text-slate-400">Assigned Sweeping Beats</div>
                        <div className="text-sm font-black text-slate-800 mt-1">
                          {user?.beats?.length || 0} Beats Registered
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[9px] font-black uppercase text-slate-400">System Status</div>
                        <div className="text-sm font-black text-emerald-600 mt-1 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active Personnel
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Beat Inspection Results */}
                  <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-black text-slate-800 uppercase">Assigned Beat Inspection History</h3>
                      <span className="text-[10px] font-bold text-slate-400">Inspections conducted by beat supervisor</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                        <div className="text-[9px] font-black uppercase text-blue-500">Total Reports</div>
                        <div className="text-xl font-black text-blue-900 mt-1">{metrics.total}</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                        <div className="text-[9px] font-black uppercase text-emerald-500">Approved</div>
                        <div className="text-xl font-black text-emerald-900 mt-1">{metrics.approved}</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100">
                        <div className="text-[9px] font-black uppercase text-rose-500">Rejected</div>
                        <div className="text-xl font-black text-rose-900 mt-1">{metrics.rejected}</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100">
                        <div className="text-[9px] font-black uppercase text-purple-500">Beat Approval Rate</div>
                        <div className="text-xl font-black text-purple-900 mt-1">{metrics.approvalRate}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}



