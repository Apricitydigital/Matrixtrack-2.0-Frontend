import React, { useState } from 'react';
import { City, User } from '../../types';
import { matrixStore } from '../../services/store';
import { StatusBadge } from '../../components/common/Badge';
import { Drawer } from '../../components/common/Drawer';
import { OnboardCityModal } from './OnboardCityModal';
import { generateCsv, downloadCsv } from '../../services/csv';
import {
  Building2,
  Search,
  Filter,
  Download,
  Plus,
  Layers,
  Users,
  Trash2,
  Power,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface CityDirectoryProps {
  cities: City[];
  currentUser: User;
  onSelectCityContext: (cityId: string) => void;
  onRefresh: () => void;
}

export const CityDirectory: React.FC<CityDirectoryProps> = ({
  cities,
  currentUser,
  onSelectCityContext,
  onRefresh
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'admins' | 'modules' | 'activity'>('overview');

  // Deletion modal state
  const [deleteCityId, setDeleteCityId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const filteredCities = cities.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) ||
             c.cityCode.toLowerCase().includes(q) ||
             c.ulbCode.toLowerCase().includes(q) ||
             c.state.toLowerCase().includes(q);
    }
    return true;
  });

  const handleToggleStatus = async (city: City) => {
    try {
    if (confirm(`Are you sure you want to change status of ${city.name} to ${city.status === 'active' ? 'INACTIVE' : 'ACTIVE'}?`)) {
      await matrixStore.toggleCityStatus(city.id, currentUser);
      onRefresh();
    }

    } catch (error) { alert(error instanceof Error ? error.message : "Backend action failed."); }
  };

  const handleSoftDelete = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    if (!deleteCityId || !deleteReason.trim()) return;
    await matrixStore.softDeleteCity(deleteCityId, deleteReason, currentUser);
    setDeleteCityId(null);
    setDeleteReason('');
    onRefresh();

    } catch (error) { alert(error instanceof Error ? error.message : "Backend action failed."); }
  };

  const handleExportCsv = () => {
    const headers = ['City_Name', 'City_Code', 'ULB_Code', 'State', 'District', 'Status', 'Population', 'Zones', 'Wards', 'Modules_Count'];
    const rows = filteredCities.map(c => [
      c.name,
      c.cityCode,
      c.ulbCode,
      c.state,
      c.district,
      c.status,
      c.populationAvailable?c.population:'Not available',
      c.geographyCountsAvailable?c.totalZones:'Not loaded',
      c.geographyCountsAvailable?c.totalWards:'Not loaded',
      c.enabledModules.length
    ]);
    downloadCsv(`cities_directory_${Date.now()}.csv`, generateCsv(headers, rows));
  };

  const allUsers = matrixStore.getUsers();
  const allAuditLogs = matrixStore.getAuditLogs();

  return (
    <div className="space-y-6">
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Municipal Corporation Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage onboarding, credentials, module provisioning, and administrative states.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsOnboardOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Municipal Corporation</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city name, code, state, or ULB code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="all">All Statuses ({cities.length})</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Cities Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">City Name</th>
                <th className="px-6 py-3">Codes</th>
                <th className="px-6 py-3">Jurisdiction</th>
                <th className="px-6 py-3">Zones / Wards</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCities.map((city) => (
                <tr key={city.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-3.5">
                    <button
                      onClick={() => setSelectedCity(city)}
                      className="font-bold text-slate-900 hover:text-indigo-600 text-left"
                    >
                      {city.name}
                    </button>
                    <div className="text-[15px] text-slate-500">{city.division || city.district}</div>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-slate-700">
                    <div>{city.cityCode}</div>
                    <div className="text-[15px] text-slate-400">{city.ulbCode}</div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">
                    <div>{city.state}</div>
                    <div className="text-[15px] text-slate-400">{city.populationAvailable?`${city.population.toLocaleString()} citizens`:'Population not recorded'}</div>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-slate-700">
                    {city.geographyCountsAvailable?`${city.totalZones} Zones / ${city.totalWards} Wards`:'Open city for geography counts'}
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={city.status} size="sm" />
                  </td>
                  <td className="px-6 py-3.5 text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => onSelectCityContext(city.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                      title="Open City Operations Overview"
                    >
                      Open Overview
                    </button>
                    <button
                      onClick={() => handleToggleStatus(city)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                      title={city.status === 'active' ? 'Deactivate Corporation' : 'Activate Corporation'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteCityId(city.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                      title="Move to Trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Soft Delete Modal */}
      {deleteCityId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Move Municipal Corporation to Trash?
            </h3>
            <p className="text-xs text-slate-500">
              This will soft-delete the tenant and deactivate active workflows. Records can be safely restored anytime from the Governance Trash panel.
            </p>
            <form onSubmit={handleSoftDelete} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Required Reason for Soft-Deletion *
                </label>
                <textarea
                  required
                  rows={2}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Administrative merger or testing tenant cleanup..."
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteCityId(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
                >
                  Confirm Move to Trash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* City Details Drawer */}
      {selectedCity && (
        <Drawer
          isOpen={Boolean(selectedCity)}
          onClose={() => setSelectedCity(null)}
          title={selectedCity.name}
          subtitle={`Codes: ${selectedCity.cityCode} · ${selectedCity.ulbCode} · State: ${selectedCity.state}`}
          width="2xl"
        >
          <div className="space-y-6">
            <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold text-slate-500">
              {['overview', 'admins', 'modules', 'activity'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-2 border-b-2 capitalize transition-colors ${
                    activeTab === tab ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block font-medium uppercase mb-0.5">Population</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{selectedCity.populationAvailable?selectedCity.population.toLocaleString():'Not recorded'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block font-medium uppercase mb-0.5">Municipal Area</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{selectedCity.areaSqKm} sq km</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block font-medium uppercase mb-0.5">Total Zones</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{selectedCity.geographyCountsAvailable?selectedCity.totalZones:'Not loaded'} Zones</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block font-medium uppercase mb-0.5">Total Wards</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{selectedCity.geographyCountsAvailable?selectedCity.totalWards:'Not loaded'} Wards</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      onSelectCityContext(selectedCity.id);
                      setSelectedCity(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Launch City Operational Dashboard</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'admins' && (
              <div className="space-y-3">
                {allUsers.filter(u => u.cityId === selectedCity.id && u.role === 'CITY_ADMIN').map(adm => (
                  <div key={adm.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <span className="font-bold text-slate-900 block">{adm.name}</span>
                    <span className="text-slate-500 font-mono">{adm.email} · {adm.phone}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'modules' && (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-700 block mb-2">Enabled Modules</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCity.enabledModules.map(m => (
                      <span key={m} className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded capitalize font-medium">
                        {m.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-700 block mb-2">Enabled Products</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCity.enabledProducts.map(p => (
                      <span key={p} className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded capitalize font-medium">
                        {p.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-2 text-xs">
                {allAuditLogs.filter(a => a.cityId === selectedCity.id).slice(0, 5).map(log => (
                  <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex justify-between font-mono text-[15px] text-slate-400">
                      <span>{log.action}</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <p className="text-slate-700 mt-1">{log.details}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Drawer>
      )}

      {/* Onboard City Modal */}
      <OnboardCityModal
        isOpen={isOnboardOpen}
        onClose={() => setIsOnboardOpen(false)}
        currentUser={currentUser}
        onSuccess={() => {
          onRefresh();
          alert('Municipal Corporation successfully onboarded.');
        }}
      />
    </div>
  );
};
