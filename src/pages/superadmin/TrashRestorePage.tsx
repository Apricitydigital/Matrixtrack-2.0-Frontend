import React, { useState } from 'react';
import { User, City } from '../../types';
import { matrixStore } from '../../services/store';
import { StatusBadge } from '../../components/common/Badge';
import { Trash2, RotateCcw, Building2, Users, Search, AlertCircle, CheckCircle } from 'lucide-react';

interface TrashRestorePageProps {
  currentUser: User;
  onRefresh: () => void;
}

export const TrashRestorePage: React.FC<TrashRestorePageProps> = ({
  currentUser,
  onRefresh
}) => {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<'all' | 'cities' | 'users'>('all');

  const allCitiesWithTrash = matrixStore.getAllCitiesWithTrash();
  const allUsersWithTrash = matrixStore.getAllUsersWithTrash();

  const deletedCities = allCitiesWithTrash.filter(c => c.isDeleted);
  const deletedUsers = allUsersWithTrash.filter(u => u.isDeleted);

  const handleRestoreCity = async (city: City) => {
    try {
    if (confirm(`Restore municipal corporation ${city.name} back to active directory?`)) {
      await matrixStore.restoreCity(city.id, currentUser);
      onRefresh();
    }

    } catch (error) { alert(error instanceof Error ? error.message : "Backend action failed."); }
  };

  const handleRestoreUser = async (user: User) => {
    try {
    if (confirm(`Restore municipal staff ${user.name} back to active directory?`)) {
      await matrixStore.restoreUser(user.id, currentUser);
      onRefresh();
    }

    } catch (error) { alert(error instanceof Error ? error.message : "Backend action failed."); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
          Governance Trash & Safe Restore Ledger
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Safely review soft-deleted municipal corporations and staff accounts with full audit tracking. Permanent deletion is disabled.
        </p>
      </div>

      {/* Filter Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deleted records by name or reason..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEntityFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
              entityFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Entities ({deletedCities.length + deletedUsers.length})
          </button>
          <button
            onClick={() => setEntityFilter('cities')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
              entityFilter === 'cities' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Cities ({deletedCities.length})
          </button>
          <button
            onClick={() => setEntityFilter('users')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
              entityFilter === 'users' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Users ({deletedUsers.length})
          </button>
        </div>
      </div>

      {/* Deleted Cities Section */}
      {(entityFilter === 'all' || entityFilter === 'cities') && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Soft-Deleted Municipal Corporations ({deletedCities.length})</span>
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {deletedCities.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No soft-deleted municipal corporations in trash.
              </div>
            ) : (
              deletedCities.map(city => (
                <div key={city.id} className="p-5 flex flex-wrap items-start justify-between gap-4 hover:bg-slate-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{city.name}</h4>
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600">{city.cityCode}</span>
                    </div>
                    <p className="text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200 inline-block font-medium">
                      Reason: {city.deletionReason || 'Administrative decommission'}
                    </p>
                    <p className="text-[15px] text-slate-400 font-mono mt-1">
                      Deleted by {city.deletedBy} on {city.deletedAt}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRestoreCity(city)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore City</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Deleted Users Section */}
      {(entityFilter === 'all' || entityFilter === 'users') && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Soft-Deleted Personnel Accounts ({deletedUsers.length})</span>
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {deletedUsers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No soft-deleted staff accounts in trash.
              </div>
            ) : (
              deletedUsers.map(user => (
                <div key={user.id} className="p-5 flex flex-wrap items-start justify-between gap-4 hover:bg-slate-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{user.name}</h4>
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600">{user.role}</span>
                    </div>
                    <p className="text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200 inline-block font-medium">
                      Reason: {user.deletionReason || 'Staff transfer / separation'}
                    </p>
                    <p className="text-[15px] text-slate-400 font-mono mt-1">
                      Deleted by {user.deletedBy} on {user.deletedAt}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRestoreUser(user)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Account</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
