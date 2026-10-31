import React from 'react';
import { ActiveSession, User } from '../../types';
import { matrixStore } from '../../services/store';
import { StatusBadge } from '../../components/common/Badge';
import { Clock, Smartphone, Monitor, ShieldAlert, LogOut } from 'lucide-react';

interface ActiveSessionsPageProps {
  sessions: ActiveSession[];
  currentUser: User;
  onRefresh: () => void;
}

export const ActiveSessionsPage: React.FC<ActiveSessionsPageProps> = ({
  sessions,
  currentUser,
  onRefresh
}) => {
  const handleRevoke = async (session: ActiveSession) => {
    try {
    if (confirm(`Confirm revoking session for ${session.userName} on ${session.device}?`)) {
      await matrixStore.revokeSession(session.id, currentUser);
      onRefresh();
    }

    } catch (error) { alert(error instanceof Error ? error.message : "Backend action failed."); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
          Active Municipal Sessions & Device Telemetry
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor concurrent web portal and field mobile application logins across authorized municipal officers.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Current Active & Revoked Sessions ({sessions.length})
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Local Demo Session Simulation
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {sessions.map((sess) => {
            const isWeb = sess.platform === 'web';
            const isActive = sess.status === 'active';

            return (
              <div key={sess.id} className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                    {isWeb ? <Monitor className="w-5 h-5 text-indigo-600" /> : <Smartphone className="w-5 h-5 text-emerald-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{sess.userName}</h4>
                      <StatusBadge status={sess.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      {sess.role} · {sess.cityName || 'HQ State'} · {sess.device}
                    </p>
                    <p className="text-[15px] text-slate-400 font-mono mt-1">
                      Started: {sess.startedAt} · Last Active: {sess.lastActiveAt} · IP: {sess.ipAddress}
                    </p>
                  </div>
                </div>

                {isActive && (
                  <button
                    onClick={() => handleRevoke(sess)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-2xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Revoke Session</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
