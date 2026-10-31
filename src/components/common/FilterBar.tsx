import React from 'react';
import { todayIST } from '../../services/api';
import { Filter, RotateCcw, Download, Search } from 'lucide-react';
import { FilterState, City, Zone, Ward, OperationalModuleId } from '../../types';

interface FilterBarProps {
  filters: FilterState;
  onChange: (updated: FilterState) => void;
  cities?: City[];
  zones?: Zone[];
  wards?: Ward[];
  modules?: { id: OperationalModuleId; name: string }[];
  statuses?: string[];
  showCityFilter?: boolean;
  showZoneFilter?: boolean;
  showWardFilter?: boolean;
  showModuleFilter?: boolean;
  showStatusFilter?: boolean;
  showShiftFilter?: boolean;
  onExportCsv?: () => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  cities = [],
  zones = [],
  wards = [],
  modules = [
    { id: 'sweeping', name: 'Sweeping' },
    { id: 'toilets', name: 'Toilets' },
    { id: 'litter_bins', name: 'Litter Bins' },
    { id: 'nala', name: 'Nala' },
    { id: 'ctu_gvp', name: 'CTU / GVP' }
  ],
  statuses = ['all', 'pending_review', 'approved', 'rejected', 'action_required', 'action_taken'],
  showCityFilter = false,
  showZoneFilter = true,
  showWardFilter = true,
  showModuleFilter = true,
  showStatusFilter = true,
  showShiftFilter = false,
  onExportCsv,
  className = ''
}) => {
  // Filter zones and wards based on parent selection
  const filteredZones = filters.cityId && filters.cityId !== 'all'
    ? zones.filter(z => z.cityId === filters.cityId)
    : zones;

  const filteredWards = filters.zoneId && filters.zoneId !== 'all'
    ? wards.filter(w => w.zoneId === filters.zoneId)
    : (filters.cityId && filters.cityId !== 'all' ? wards.filter(w => w.cityId === filters.cityId) : wards);

  const handleCityChange = (newCityId: string) => {
    onChange({
      ...filters,
      cityId: newCityId,
      zoneId: 'all',
      wardId: 'all'
    });
  };

  const handleZoneChange = (newZoneId: string) => {
    onChange({
      ...filters,
      zoneId: newZoneId,
      wardId: 'all' // reset dependent ward selection
    });
  };

  const handleClearAll = () => {
    onChange({
      ...filters,
      zoneId: 'all',
      wardId: 'all',
      moduleId: 'all',
      status: 'all',
      dateRangePreset: 'today',
      searchQuery: '',
      shift: undefined,
      customStartDate: undefined,
      customEndDate: undefined
    });
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 ${className}`}>
      {/* Top Filter Controls Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Search by ID, keyword, or name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* City Filter (Super Admin) */}
        {showCityFilter && (
          <div className="min-w-[140px]">
            <select
              value={filters.cityId}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Authorized Cities</option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Zone Filter */}
        {showZoneFilter && (
          <div className="min-w-[130px]">
            <select
              value={filters.zoneId}
              onChange={(e) => handleZoneChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Zones</option>
              {filteredZones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Ward Filter */}
        {showWardFilter && (
          <div className="min-w-[130px]">
            <select
              value={filters.wardId}
              onChange={(e) => onChange({ ...filters, wardId: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Wards</option>
              {filteredWards.map(w => (
                <option key={w.id} value={w.id}>Ward {w.wardNumber} - {w.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Module Filter */}
        {showModuleFilter && (
          <div className="min-w-[130px]">
            <select
              value={filters.moduleId}
              onChange={(e) => onChange({ ...filters, moduleId: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Modules</option>
              {modules.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        {showStatusFilter && (
          <div className="min-w-[130px]">
            <select
              value={filters.status}
              onChange={(e) => onChange({ ...filters, status: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium capitalize"
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        )}

        {/* Shift Filter */}
        {showShiftFilter && (
          <div className="min-w-[120px]">
            <select
              value={filters.shift || 'all'}
              onChange={(e) => onChange({ ...filters, shift: e.target.value === 'all' ? undefined : e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium capitalize"
            >
              <option value="all">All Shifts</option>
              <option value="morning">Morning Shift</option>
              <option value="afternoon">Afternoon Shift</option>
              <option value="night">Night Shift</option>
            </select>
          </div>
        )}

        {/* Clear All & Export Buttons */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors font-medium whitespace-nowrap"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors font-semibold whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Presets Row */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
        <span className="text-slate-400 font-medium mr-1.5 flex items-center gap-1">
          <Filter className="w-3 h-3" />
          <span>Period:</span>
        </span>
        {[
          { id: 'today', label: 'Today' },
          { id: 'yesterday', label: 'Yesterday' },
          { id: 'last_7_days', label: 'Last 7 Days' },
          { id: 'last_30_days', label: 'Last 30 Days' },
          { id: 'this_month', label: 'This Month' },
          { id: 'previous_month', label: 'Prev Month' },
          { id: 'custom', label: 'Custom' }
        ].map(preset => {
          const isActive = filters.dateRangePreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onChange({ ...filters, dateRangePreset: preset.id as any })}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {preset.label}
            </button>
          );
        })}

        {/* Custom Date Pickers */}
        {filters.dateRangePreset === 'custom' && (
          <div className="flex items-center gap-1.5 ml-2">
            <input
              type="date"
              value={filters.customStartDate || todayIST()}
              onChange={(e) => onChange({ ...filters, customStartDate: e.target.value })}
              className="px-2 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={filters.customEndDate || todayIST()}
              onChange={(e) => onChange({ ...filters, customEndDate: e.target.value })}
              className="px-2 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700"
            />
          </div>
        )}
      </div>
    </div>
  );
};
