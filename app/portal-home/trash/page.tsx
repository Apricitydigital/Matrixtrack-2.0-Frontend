"use client";

import React, { useEffect, useState } from "react";
import { auditLogApi } from "@lib/apiClient";
import { Trash2, RotateCcw, AlertTriangle, Search, Filter, ShieldCheck, Calendar, Clock } from "lucide-react";
import Link from "next/link";

export default function TrashHubPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "User" | "City">("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const res = await auditLogApi.getTrash();
      if (res.ok) {
        setItems(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load trash:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id: string, type: "User" | "City") => {
    try {
      setActionLoadingId(id);
      setMessage(null);
      const res = await auditLogApi.restoreTrash(id, type);
      if (res.ok) {
        setMessage({ type: "success", text: `${type} restored successfully!` });
        await fetchTrash();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to restore item" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.identifier?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "ALL" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-page-entrance">
      {/* Page Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-600 shadow-sm shrink-0">
            <Trash2 size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Trash & 10-Day Safe Recovery Hub
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300">
                10-Day Auto Purge
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Soft-deleted users and cities can be safely restored anytime within 10 days before permanent auto-purge.
            </p>
          </div>
        </div>

        <button
          onClick={fetchTrash}
          className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <RotateCcw size={14} className={loading ? "animate-spin" : ""} />
          Refresh Trash
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center gap-3 ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300"
          }`}
        >
          <span>{message.type === "success" ? "✅" : "⚠️"}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, email, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setTypeFilter("User")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === "User"
                  ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              Users ({items.filter((i) => i.type === "User").length})
            </button>
            <button
              onClick={() => setTypeFilter("City")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === "City"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              Cities ({items.filter((i) => i.type === "City").length})
            </button>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-20 text-center text-sm font-semibold text-slate-400">
            <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
            <div>Loading trash items...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Trash is Empty
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No soft-deleted users or cities are currently in the 10-day retention window.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Type</th>
                  <th className="py-3.5 px-5">Name & Identifier</th>
                  <th className="py-3.5 px-5">Deleted At</th>
                  <th className="py-3.5 px-5">Auto-Purge Expiration</th>
                  <th className="py-3.5 px-5">Retention Countdown</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-5">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider border ${
                          item.type === "User"
                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {item.name}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {item.identifier || "—"}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {new Date(item.deletedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400 pl-5">
                        {new Date(item.deletedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400" />
                        {new Date(item.expiresAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          item.daysRemaining <= 2
                            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.daysRemaining <= 2 ? "bg-rose-500" : "bg-emerald-500"}`} />
                        {item.daysRemaining} {item.daysRemaining === 1 ? "day" : "days"} left
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => handleRestore(item.id, item.type)}
                        disabled={actionLoadingId === item.id}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                      >
                        <RotateCcw size={13} className={actionLoadingId === item.id ? "animate-spin" : ""} />
                        {actionLoadingId === item.id ? "Restoring..." : "Restore"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
