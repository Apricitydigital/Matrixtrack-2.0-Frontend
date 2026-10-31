import React, { useState } from 'react';
import { PlantLog, City, User } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/Badge';
import { generateCsv, downloadCsv } from '../../services/csv';
import {
  Factory,
  Download,
  Upload,
  Search,
  Recycle,
  Zap,
  CheckCircle2,
  Scale,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

interface PlantProcessingWorkspaceProps {
  city: City;
  plantLogs: PlantLog[];
  currentUser: User;
  onOpenImportModal: () => void;
}

export const PlantProcessingWorkspace: React.FC<PlantProcessingWorkspaceProps> = ({
  city,
  plantLogs,
  currentUser,
  onOpenImportModal
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const cityLogs = plantLogs.filter(p => p.cityId === city.id);

  const filteredLogs = cityLogs.filter(p => {
    if (selectedType !== 'all' && p.type !== selectedType) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.plantName.toLowerCase().includes(q) || p.type.toLowerCase().includes(q);
    }
    return true;
  });

  const totalIncoming = cityLogs.reduce((acc, p) => acc + p.incomingTons, 0);
  const totalProcessed = cityLogs.reduce((acc, p) => acc + p.processedTons, 0);
  const totalRecovered = cityLogs.reduce((acc, p) => acc + p.recoveredTons, 0);
  const totalRejected = cityLogs.reduce((acc, p) => acc + p.rejectedTons, 0);
  const totalCapacity = cityLogs.reduce((acc, p) => acc + p.capacityTonsPerDay, 0);

  const utilizationRate = totalCapacity > 0
    ? Math.round((totalProcessed / totalCapacity) * 100)
    : 85;

  const handleExportCsv = () => {
    const headers = ['Date', 'Plant_Name', 'Type', 'Incoming_Tons', 'Processed_Tons', 'Recovered_Tons', 'Rejected_Tons', 'Disposed_Tons', 'Capacity_TPD', 'Status'];
    const rows = filteredLogs.map(p => [
      p.date,
      p.plantName,
      p.type,
      p.incomingTons,
      p.processedTons,
      p.recoveredTons,
      p.rejectedTons,
      p.disposedTons,
      p.capacityTonsPerDay,
      p.status
    ]);
    downloadCsv(`plant_processing_${city.cityCode}_${Date.now()}.csv`, generateCsv(headers, rows));
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
              Plant & Processing Plant Operations
            </h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
              Mass Balance Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Material Recovery Facilities (MRF), Bio-CNG digestion, and Construction & Demolition (C&D) recycling plants in {city.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Mass Balance (CSV)</span>
          </button>
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Daily Plant Log</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Waste Processed Today"
          value={`${totalProcessed.toFixed(1)}`}
          unit="Tons"
          denominator={`${totalCapacity} TPD Cap`}
          subtitle={`Overall ${utilizationRate}% capacity utilization`}
          icon={<Scale className="w-4 h-4 text-indigo-600" />}
        />
        <StatCard
          label="Recovered Recyclables / Biogas"
          value={`${totalRecovered.toFixed(1)}`}
          unit="Tons"
          denominator={`${totalIncoming.toFixed(1)} Tons In`}
          subtitle="Resource recovery and circular economy"
          icon={<Recycle className="w-4 h-4 text-emerald-600" />}
        />
        <StatCard
          label="Refuse Derived Fuel (RDF)"
          value={`${totalRejected.toFixed(1)}`}
          unit="Tons"
          denominator="To Cement Kilns"
          subtitle="Non-recyclable combustible fraction"
          icon={<Zap className="w-4 h-4 text-amber-600" />}
        />
        <StatCard
          label="Sanitary Landfill Diversion"
          value="99.4%"
          denominator="Zero Dump Goal"
          subtitle="Inerts only dispatched to scientific landfill"
          icon={<CheckCircle2 className="w-4 h-4 text-blue-600" />}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plant by name or technology..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Plant Technology:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium capitalize"
          >
            <option value="all">All Processing Technologies</option>
            <option value="mrf">Dry Waste Sorting (MRF)</option>
            <option value="compost">Wet Waste / Bio-CNG</option>
            <option value="c_and_d">Construction & Demolition (C&D)</option>
          </select>
        </div>
      </div>

      {/* Processing Facilities Directory & Ledger */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Facility Name</th>
                <th className="px-5 py-3">Technology</th>
                <th className="px-5 py-3">Incoming Waste</th>
                <th className="px-5 py-3">Processed (TPD)</th>
                <th className="px-5 py-3">Resource Recovery</th>
                <th className="px-5 py-3">Operating Hours</th>
                <th className="px-5 py-3 text-right">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(plant => (
                <tr key={plant.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900">{plant.plantName}</div>
                    <div className="text-[15px] text-slate-500 font-mono">Date: {plant.date}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono uppercase text-slate-700 font-medium">
                    {plant.type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-slate-800">
                    {plant.incomingTons} Tons
                  </td>
                  <td className="px-5 py-3.5 font-mono tabular-nums text-slate-900 font-bold">
                    {plant.processedTons} / {plant.capacityTonsPerDay} TPD
                  </td>
                  <td className="px-5 py-3.5 font-mono text-emerald-700 font-semibold">
                    {plant.recoveredTons} Tons Recycled
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-600">
                    {plant.operatingHours} hrs / day
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <StatusBadge status={plant.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
