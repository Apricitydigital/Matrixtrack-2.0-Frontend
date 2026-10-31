import React, { useState } from 'react';
import { City, Zone, Ward, User } from '../../types';
import {Pagination,usePagination} from '../../components/common/Pagination';
import {downloadWorkbook} from '../../services/spreadsheets';
import {downloadCsv,generateCsv} from '../../services/csv';
import {WardImport} from './WardImport';
import {personnelAssignedToWard} from '../../services/personnel';
import { matrixStore } from '../../services/store';
import { Modal } from '../../components/common/Modal';
import { Building2, Plus, Search, MapPin, Users, Layers } from 'lucide-react';

interface ZonesWardsProps {
  city: City;
  zones: Zone[];
  wards: Ward[];
  users: User[];
  currentUser: User;
  onRefresh: () => void;
}

export const ZonesWards: React.FC<ZonesWardsProps> = ({
  city,
  zones,
  wards,
  users,
  currentUser,
  onRefresh
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('all');
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [isCreateWardOpen, setIsCreateWardOpen] = useState(false);
  const [importOpen,setImportOpen]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');

  // Create Zone state
  const [zoneName, setZoneName] = useState('');
  const [zoneNumber, setZoneNumber] = useState('');

  // Create Ward state
  const [wardName, setWardName] = useState('');
  const [wardNumber, setWardNumber] = useState('');
  const [wardZoneId, setWardZoneId] = useState(zones.find(z=>z.cityId===city.id)?.id || '');

  const [wardFilter,setWardFilter]=useState('all'),[search,setSearch]=useState(''),[exportError,setExportError]=useState('');
  const cityZones = zones.filter(z => z.cityId === city.id);
  const cityWards = wards.filter(w => {
    if (w.cityId !== city.id || wardFilter!=='all'&&w.id!==wardFilter || !w.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedZoneId !== 'all' && w.zoneId !== selectedZoneId) return false;
    return true;
  });

  const paging=usePagination(cityWards,JSON.stringify([city.id,selectedZoneId,wardFilter,search]));
  const exportHeaders=['Ward','Zone','Darogas','Sanitary Inspectors'];
  const staffNames=(ward:Ward,role:string)=>users.filter(u=>u.cityId===city.id&&u.role===role&&u.status==='active'&&personnelAssignedToWard(u,ward)).map(u=>u.name).join('; ');
  const exportRows=cityWards.map(w=>[w.name,cityZones.find(z=>z.id===w.zoneId)?.name||'',staffNames(w,'SUPERVISOR'),staffNames(w,'QC')]);
  const exportExcel=async()=>{try{await downloadWorkbook('zones-and-wards.xlsx',exportHeaders,exportRows,'Wards');}catch(e){setExportError(e instanceof Error?e.message:'Export failed.');}};

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();if(busy)return;
    try {
    setError('');setBusy(true);
    if (!zoneName.trim()) throw new Error('Enter a Zone name.');
    await matrixStore.createZone({
      cityId: city.id,
      name: zoneName,
      zoneNumber: Number(zoneNumber)
    }, currentUser);
    setIsCreateZoneOpen(false);
    setZoneName('');
    onRefresh();

    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save."); } finally {setBusy(false);}
  };

  const handleCreateWard = async (e: React.FormEvent) => {
    e.preventDefault();if(busy)return;
    try {
    setError('');setBusy(true);
    if (!wardName.trim() || !(wardZoneId || cityZones[0]?.id)) throw new Error('Choose a Zone and enter a Ward name.');
    await matrixStore.createWard({
      cityId: city.id,
      zoneId: wardZoneId || cityZones[0]?.id,
      name: wardName,
      wardNumber: Number(wardNumber)
    }, currentUser);
    setIsCreateWardOpen(false);
    setWardName('');
    onRefresh();

    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save."); } finally {setBusy(false);}
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            Administrative Zones & Electoral Wards
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Hierarchical municipal structure defining supervisory boundaries and sanitary inspector beats for {city.name}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button className="workspace-secondary-button" onClick={()=>setImportOpen(true)}>Import CSV / Excel</button>
          <button
            onClick={() => {setError('');setZoneNumber('');setZoneName('');setIsCreateZoneOpen(true);}}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Zone</span>
          </button>
          <button
            disabled={!cityZones.length} onClick={() => {setError('');setWardNumber('');setWardName('');setWardZoneId(selectedZoneId==='all'?cityZones[0]?.id||'':selectedZoneId);setIsCreateWardOpen(true);}}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Ward</span>
          </button>
        </div>
      </div>

      {/* Zone Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => {setSelectedZoneId('all');setWardFilter('all');}}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            selectedZoneId === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Zones ({cityZones.length})
        </button>
        {cityZones.map(z => (
          <button
            key={z.id}
            onClick={() => {setSelectedZoneId(z.id);setWardFilter('all');}}
            className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
              selectedZoneId === z.id ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {z.name}
          </button>
        ))}
      </div>

      <div className="workspace-panel p-4 flex flex-wrap gap-3"><input aria-label="Search Wards" placeholder="Search Ward name" className="workspace-input" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter Ward" className="workspace-input" value={wardFilter} onChange={e=>setWardFilter(e.target.value)}><option value="all">All Wards</option>{wards.filter(w=>w.cityId===city.id&&(selectedZoneId==='all'||w.zoneId===selectedZoneId)).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select><button className="workspace-secondary-button" onClick={()=>downloadCsv('wards.csv',generateCsv(exportHeaders,exportRows))}>Export CSV</button><button className="workspace-secondary-button" onClick={()=>void exportExcel()}>Export Excel</button></div>{exportError&&<p role="alert" className="text-red-700">{exportError}</p>}
      {/* Wards Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Ward Number & Name</th>
                <th className="px-5 py-3">Zone Membership</th>
                <th className="px-5 py-3">Assigned Daroga</th>
                <th className="px-5 py-3 text-right">Sanitary Inspector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paging.rows.map(ward => {
                const zone = cityZones.find(z => z.id === ward.zoneId);
                const daroga = users.find(u => u.id === ward.darogaId) || users.find(u=>u.cityId===city.id&&u.role==='SUPERVISOR'&&u.status==='active'&&(u.assignedWardIds?.includes(ward.id)||u.moduleAssignments?.some(m=>m.wardIds.includes(ward.id))));
                const inspector = users.find(u => u.id === ward.inspectorId) || users.find(u=>u.cityId===city.id&&u.role==='QC'&&u.status==='active'&&personnelAssignedToWard(u,ward));

                return (
                  <tr key={ward.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 font-mono">Ward #{ward.wardNumber}</div>
                      <div className="text-slate-600 font-medium">{ward.name}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">
                      {zone?.name || 'Unavailable Zone'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-800">
                      {staffNames(ward,'SUPERVISOR') || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-800">
                      {staffNames(ward,'QC') || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div><Pagination {...paging} noun="Wards"/>
      </div>

      {importOpen&&<WardImport cityId={city.id} zones={cityZones} onClose={changed=>{setImportOpen(false);if(changed)void matrixStore.refreshCollections(['geography']);}}/>}
      {/* Create Zone Modal */}
      {isCreateZoneOpen && (
        <Modal
          isOpen={isCreateZoneOpen}
          onClose={() => !busy && setIsCreateZoneOpen(false)}
          title="Create Administrative Zone"
          description={`Add a new administrative cluster to ${city.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleCreateZone} className="space-y-4 text-sm">{error&&<p role="alert" className="text-red-700">{error}</p>}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Zone Number *</label>
              <input
                type="number"
                min="1"
                required
                value={zoneNumber}
                onChange={(e) => setZoneNumber(e.target.value)}
                placeholder="e.g. 5"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Zone Name *</label>
              <input
                type="text"
                required
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="e.g. Industrial Corridor"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCreateZoneOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={busy}
                className="px-4 py-1.5 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
              >
                Create Zone
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Ward Modal */}
      {isCreateWardOpen && (
        <Modal
          isOpen={isCreateWardOpen}
          onClose={() => !busy && setIsCreateWardOpen(false)}
          title="Create Municipal Ward"
          description={`Add an electoral ward under an administrative zone.`}
          maxWidth="md"
        >
          <form onSubmit={handleCreateWard} className="space-y-4 text-sm">{error&&<p role="alert" className="text-red-700">{error}</p>}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Parent Administrative Zone *</label>
              <select
                value={wardZoneId}
                onChange={(e) => setWardZoneId(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              >
                {cityZones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ward Number *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={wardNumber}
                  onChange={(e) => setWardNumber(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ward Name *</label>
              <input
                type="text"
                required
                value={wardName}
                onChange={(e) => setWardName(e.target.value)}
                placeholder="e.g. Vijay Nagar Main Circle"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCreateWardOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={busy}
                className="px-4 py-1.5 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
              >
                Create Ward
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
