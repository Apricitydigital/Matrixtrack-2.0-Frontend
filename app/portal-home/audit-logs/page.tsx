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
  ShieldAlert,
  LogOut,
  Calendar,
  Layers,
  Globe,
  Radio,
} from "lucide-react";

export default function AuditLogsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles?.includes("SUPERADMIN" as any) || user?.roles?.includes("ADMIN" as any);

  const [activeTab, setActiveTab] = useState<"LOGS" | "SESSIONS">("LOGS");
  const [logs, setLogs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
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
        setTotalPages(res.pagination.totalPages);
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

  return (
    <div className="space-y-6 animate-page-entrance">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
            <Activity size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Enterprise Audit Trail & Security Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live 3-Day Hot Trail
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Real-time activity logs, edit/delete change diffs, multi-device logins, IP addresses, and remote device revocation.
            </p>
          </div>
        </div>

        <button
          onClick={activeTab === "LOGS" ? fetchLogs : fetchSessions}
          className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <RotateCcw size={14} className={loading ? "animate-spin" : ""} />
          Refresh Data
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => { setActiveTab("LOGS"); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "LOGS"
                  ? "bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Activity size={15} />
              Activity Logs Trail ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab("SESSIONS")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "SESSIONS"
                  ? "bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Laptop size={15} />
              Active Devices & Logged-In Sessions ({sessions.length})
            </button>
          </div>

          {/* Filters for Activity Logs */}
          {activeTab === "LOGS" && (
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
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
                        <td className="py-4 px-5 text-slate-700 dark:text-slate-300 max-w-sm leading-relaxed">
                          {log.description || "—"}
                        </td>
                        <td className="py-4 px-5 text-slate-500 dark:text-slate-400 text-[11px]">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
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
          /* Tab 2: Active Devices Grid */
          <div className="p-6">
            {loading ? (
              <div className="py-20 text-center text-sm font-semibold text-slate-400">
                <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
                <div>Fetching active device sessions...</div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-20 text-center">
                <div className="text-4xl mb-3">📱</div>
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                  No Active Sessions Found
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  There are currently no active device logins recorded in the system.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 shrink-0">
                          {sess.deviceType === "Mobile" ? (
                            <Smartphone size={20} />
                          ) : sess.deviceType === "Tablet" ? (
                            <Tablet size={20} />
                          ) : (
                            <Laptop size={20} />
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active Now
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 dark:text-white text-base">
                        {sess.user?.name || "User Session"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        {sess.user?.email || sess.user?.phone || "No Email"}
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Device / OS:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {sess.deviceType} ({sess.os})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Browser:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {sess.browser}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">IP Address:</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {sess.ipAddress}
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

                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      disabled={revokingId === sess.id}
                      className="mt-4 w-full py-2 px-3 rounded-xl text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogOut size={13} />
                      {revokingId === sess.id ? "Revoking Session..." : "Force Remote Logout"}
                    </button>
                  </div>
                ))}
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
