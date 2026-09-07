"use client";

import React, { useEffect, useState } from "react";
import { auditLogApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";
import {
  Activity,
  Laptop,
  Smartphone,
  Tablet,
  RotateCcw,
  Search,
  Filter,
  LogOut,
  Calendar,
  Layers,
  Globe,
  Radio,
  ShieldCheck,
  CheckCircle2,
  Users,
  Monitor,
  ShieldAlert,
  Clock,
} from "lucide-react";

export default function AuditLogsPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"LOGS" | "SESSIONS">("LOGS");
  const [devicePlatformFilter, setDevicePlatformFilter] = useState<"ALL" | "WEB" | "APP">("ALL");
  const [logs, setLogs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Logs
  const [actionFilter, setActionFilter] = useState<string>("");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditLogApi.getLogs({
        action: actionFilter || undefined,
        module: moduleFilter || undefined,
        cityId: user?.cityId,
        page,
        limit: 30,
      });
      if (res.ok) {
        setLogs(res.data);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await auditLogApi.getSessions(user?.cityId);
      if (res.ok) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch active sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "LOGS") {
      fetchLogs();
    } else {
      fetchSessions();
    }
  }, [activeTab, actionFilter, moduleFilter, page]);

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to force logout this device session?")) return;
    try {
      setRevokingId(sessionId);
      await auditLogApi.revokeSession(sessionId);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  // Filter logs by search
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.userName?.toLowerCase().includes(q) ||
      log.userEmail?.toLowerCase().includes(q) ||
      log.description?.toLowerCase().includes(q) ||
      log.ipAddress?.toLowerCase().includes(q) ||
      log.module?.toLowerCase().includes(q)
    );
  });

  // Separate Sessions into Web vs Mobile App
  const webSessions = sessions.filter((s) => s.deviceType === "Desktop" || s.userAgent?.toLowerCase().includes("windows") || s.userAgent?.toLowerCase().includes("macintosh"));
  const appSessions = sessions.filter((s) => s.deviceType === "Mobile" || s.deviceType === "Tablet" || s.userAgent?.toLowerCase().includes("android") || s.userAgent?.toLowerCase().includes("iphone") || s.userAgent?.toLowerCase().includes("expo") || s.userAgent?.toLowerCase().includes("okhttp"));

  const displayedSessions =
    devicePlatformFilter === "WEB"
      ? webSessions
      : devicePlatformFilter === "APP"
      ? appSessions
      : sessions;

  // Counts for Top KPI Cards
  const totalLoginsToday = logs.filter((l) => l.action === "LOGIN").length;
  const totalUpdatesToday = logs.filter((l) => l.action === "UPDATE" || l.action === "CREATE").length;
  const totalDeletionsToday = logs.filter((l) => l.action === "DELETE").length;

  return (
    <div className="space-y-6 animate-page-entrance max-w-[1600px] mx-auto pb-10">
      {/* 1. Top Executive Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Active Sessions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Devices Online
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {sessions.length}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
              <span className="text-blue-600 font-bold">💻 {webSessions.length} Web</span>
              <span>•</span>
              <span className="text-purple-600 font-bold">📱 {appSessions.length} App</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600">
            <Radio size={22} className="animate-pulse text-emerald-500" />
          </div>
        </div>

        {/* Total Logins */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              User Logins Recorded
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {totalLoginsToday}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Within current 3-day hot trail
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600">
            <ShieldCheck size={22} />
          </div>
        </div>

        {/* Total Updates & Creates */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Data Creates & Updates
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {totalUpdatesToday}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              Form edits, inspections, reports
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600">
            <Layers size={22} />
          </div>
        </div>

        {/* Total Soft Deletions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Soft Deletions (Protected)
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {totalDeletionsToday}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              10-day trash recovery active
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-600">
            <ShieldAlert size={22} />
          </div>
        </div>
      </div>

      {/* 2. Main Tabbed Navigation Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Navigation & Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Main Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => { setActiveTab("LOGS"); setPage(1); }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "LOGS"
                  ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Activity size={15} className={activeTab === "LOGS" ? "text-indigo-600" : "text-slate-400"} />
              Activity Logs Trail ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab("SESSIONS")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "SESSIONS"
                  ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Monitor size={15} className={activeTab === "SESSIONS" ? "text-blue-600" : "text-slate-400"} />
              Active Devices & Sessions ({sessions.length})
            </button>
          </div>

          {/* Sub-Filters for Sessions: Separate Web vs Mobile App */}
          {activeTab === "SESSIONS" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
                Platform:
              </span>
              <button
                onClick={() => setDevicePlatformFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  devicePlatformFilter === "ALL"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                }`}
              >
                All Devices ({sessions.length})
              </button>
              <button
                onClick={() => setDevicePlatformFilter("WEB")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  devicePlatformFilter === "WEB"
                    ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                }`}
              >
                <Laptop size={13} />
                Web Portal Users ({webSessions.length})
              </button>
              <button
                onClick={() => setDevicePlatformFilter("APP")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  devicePlatformFilter === "APP"
                    ? "bg-purple-600 text-white shadow-xs shadow-purple-500/20"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                }`}
              >
                <Smartphone size={13} />
                Mobile App Users ({appSessions.length})
              </button>
            </div>
          )}

          {/* Filters for Activity Logs */}
          {activeTab === "LOGS" && (
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search user, action, IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="RESTORE">RESTORE</option>
              </select>

              <select
                value={moduleFilter}
                onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Modules</option>
                <option value="AUTH">AUTH</option>
                <option value="USERS">USERS</option>
                <option value="CITIES">CITIES</option>
                <option value="TOILETS">TOILETS</option>
                <option value="SWEEPING">SWEEPING</option>
                <option value="TWINBIN">TWINBIN</option>
                <option value="WARD_RANKING">WARD RANKING</option>
              </select>

              <button
                onClick={fetchLogs}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                title="Refresh Logs"
              >
                <RotateCcw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Activity Logs Table */}
        {activeTab === "LOGS" ? (
          loading ? (
            <div className="py-24 text-center text-sm font-semibold text-slate-400">
              <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
              <div>Fetching real-time audit logs...</div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-24 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                No Logs Found
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                No activity records matched the selected action and module filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-5">Timestamp</th>
                    <th className="py-3.5 px-5">User & Role</th>
                    <th className="py-3.5 px-5">Action</th>
                    <th className="py-3.5 px-5">Module</th>
                    <th className="py-3.5 px-5">Description</th>
                    <th className="py-3.5 px-5">Device, Browser & IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredLogs.map((log) => {
                    const actionBadgeColors: Record<string, string> = {
                      LOGIN: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
                      LOGOUT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                      CREATE: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
                      UPDATE: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
                      DELETE: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
                      RESTORE: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
                    };
                    const badgeClass = actionBadgeColors[log.action] || "bg-slate-50 text-slate-700 border-slate-200";

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {new Date(log.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">
                            {log.userName || "System"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {log.userRole || log.userEmail || "—"}
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border ${badgeClass}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                            {log.module}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-slate-700 dark:text-slate-300 max-w-md leading-relaxed">
                          {log.description || "—"}
                        </td>
                        <td className="py-4 px-5 text-slate-500 dark:text-slate-400 text-[11px]">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            {log.deviceType === "Mobile" ? <Smartphone size={13} className="text-purple-600" /> : <Laptop size={13} className="text-blue-600" />}
                            {log.deviceType} • {log.browser} ({log.os})
                          </div>
                          <div className="font-mono text-slate-400 text-[10px] mt-0.5">
                            IP: {log.ipAddress || "Unknown"}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Tab 2: Active Devices Grid (Separated Web & Mobile) */
          <div className="p-6">
            {loading ? (
              <div className="py-20 text-center text-sm font-semibold text-slate-400">
                <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
                <div>Fetching active device sessions...</div>
              </div>
            ) : displayedSessions.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-4xl mb-3">
                  {devicePlatformFilter === "APP" ? "📱" : devicePlatformFilter === "WEB" ? "💻" : "🛡️"}
                </div>
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                  No Active {devicePlatformFilter === "APP" ? "Mobile App" : devicePlatformFilter === "WEB" ? "Web Portal" : ""} Sessions Found
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  There are currently no active logins matching this filter. Once users log in from the web portal or mobile app, their live device session will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedSessions.map((sess) => {
                  const isMobile = sess.deviceType === "Mobile" || sess.deviceType === "Tablet" || sess.userAgent?.toLowerCase().includes("android") || sess.userAgent?.toLowerCase().includes("iphone");

                  return (
                    <div
                      key={sess.id}
                      className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between hover:shadow-md transition-all"
                    >
                      <div>
                        {/* Device Header Tag */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              isMobile
                                ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/50"
                                : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/50"
                            }`}>
                              {isMobile ? <Smartphone size={18} /> : <Laptop size={18} />}
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                              isMobile
                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
                                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                            }`}>
                              {isMobile ? "Mobile App" : "Web Portal"}
                            </span>
                          </div>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </span>
                        </div>

                        {/* User Details */}
                        <div className="font-bold text-slate-900 dark:text-white text-base">
                          {sess.user?.name || "Logged In User"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                          {sess.user?.email || sess.user?.phone || "No Email"}
                        </div>

                        {/* Meta Specifications */}
                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Device Platform:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {sess.deviceType} ({sess.os})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Browser / Client:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {sess.browser || "App Client"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">IP Address:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              {sess.ipAddress || "Unknown"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Last Active:</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {new Date(sess.lastActiveAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Force Logout Action */}
                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        disabled={revokingId === sess.id}
                        className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <LogOut size={13} />
                        {revokingId === sess.id ? "Revoking Session..." : "Force Remote Logout"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        {activeTab === "LOGS" && totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 text-xs">
            <span className="text-slate-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 font-bold cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 font-bold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
