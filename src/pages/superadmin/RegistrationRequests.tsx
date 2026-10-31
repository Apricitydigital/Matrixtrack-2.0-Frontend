import React, { useState } from 'react';
import { User, City } from '../../types';
import {Pagination,usePagination} from '../../components/common/Pagination';
import {personnelScope,scopeNames,PERSONNEL_ROLES,approvePersonnelRegistration,enabledPersonnelKeys,PERSONNEL_MODULE_LABELS} from '../../services/personnel';
import {MODULE_KEYS,moduleId} from '../../services/adapters';
import {MODULE_LABELS} from '../../services/presentation';
import { matrixStore } from '../../services/store';
import { StatusBadge } from '../../components/common/Badge';
import { CheckCircle2, XCircle, RotateCcw, AlertCircle, Search, Filter } from 'lucide-react';

interface RegistrationRequestsProps {
  users: User[];
  cities: City[];
  currentUser: User;
  onRefresh: () => void;
}

export const RegistrationRequests: React.FC<RegistrationRequestsProps> = ({
  users,
  cities,
  currentUser,
  onRefresh
}) => {
  const [selectedCityId, setSelectedCityId] = useState<string>('all');
  const [activeDecisionUserId, setActiveDecisionUserId] = useState<string | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | 'needs_correction' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [approvalModules,setApprovalModules]=useState<string[]>([]),[approvalZones,setApprovalZones]=useState<string[]>([]),[approvalWards,setApprovalWards]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');

  const [search,setSearch]=useState(''),[zone,setZone]=useState('all'),[ward,setWard]=useState('all');
  const zones=matrixStore.getZones(),wards=matrixStore.getWards();
  // Requests include pending_approval and needs_correction
  const requests = users.filter(u => {
    if (u.status !== 'pending_approval' && u.status !== 'needs_correction' && u.status !== 'rejected') return false;
    if (selectedCityId !== 'all' && u.cityId !== selectedCityId) return false;
    const scope=personnelScope(u,wards);if(zone!=='all'&&!scope.zoneIds.includes(zone)||ward!=='all'&&!scope.wardIds.includes(ward))return false;if(!`${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });

  const paging=usePagination(requests,JSON.stringify([selectedCityId,zone,ward,search]));
  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    try {
    if (!activeDecisionUserId || !decisionType) return;
    if ((decisionType === 'rejected' || decisionType === 'needs_correction') && !remarks.trim()) {
      setError('Remarks are required for rejection.');
      return;
    }

    const request=users.find(u=>u.id===activeDecisionUserId);if(decisionType==='approved'&&currentUser.role==='CITY_ADMIN'&&request)await approvePersonnelRegistration(request.cityId!,request,approvalModules,approvalZones,approvalWards);else await matrixStore.decideUserRegistration(activeDecisionUserId, decisionType, remarks, currentUser);
    setActiveDecisionUserId(null);
    setDecisionType(null);
    setRemarks('');
    onRefresh();

    } catch (error) { setError(error instanceof Error ? error.message : "Backend action failed."); } finally {setBusy(false);}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
            User Registration Approval Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review incoming credential requests for Darogas, Sanitary Inspectors, and Municipal Staff.
          </p>
        </div>

        {/* City Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Filter City:</span>
          <select
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium"
          >
            <option value="all">All Cities ({cities.length})</option>
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="workspace-panel p-4 flex flex-wrap gap-3"><input aria-label="Search registrations" className="workspace-input" placeholder="Search name, email or phone" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Registration Zone" className="workspace-input" value={zone} onChange={e=>{setZone(e.target.value);setWard('all');}}><option value="all">All Zones</option>{zones.filter(z=>selectedCityId==='all'||z.cityId===selectedCityId).map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select><select aria-label="Registration Ward" className="workspace-input" value={ward} onChange={e=>setWard(e.target.value)}><option value="all">All Wards</option>{wards.filter(w=>zone==='all'||w.zoneId===zone).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
      {error&&<p role="alert" className="text-red-700">{error}</p>}
      {/* Requests Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Pending & Correction Requests ({requests.length})
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Requires Super Admin or City Admin Sign-off
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No pending registration requests in the queue.
            </div>
          ) : (
            paging.rows.map(user => {
              const cityName = cities.find(c => c.id === user.cityId)?.name || 'State Level';
              const isDecidingThis = activeDecisionUserId === user.id;

              return (
                <div key={user.id} className="p-5 space-y-3 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{user.name}</h4>
                        <StatusBadge status={user.status} size="sm" />
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {cityName} · Role: <strong>{PERSONNEL_ROLES[user.role]||user.role}</strong> · {user.email} · {user.phone}
                      </p>
                    </div>

                    {user.status!=='pending_approval'?<span className="text-sm text-slate-500">Already processed</span>:!isDecidingThis ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveDecisionUserId(user.id);
                            setDecisionType('approved');setError('');setApprovalModules(user.requestedModules||[]);setApprovalZones(personnelScope(user,wards).zoneIds);setApprovalWards(personnelScope(user,wards).wardIds);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveDecisionUserId(user.id);
                            setDecisionType('rejected');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveDecisionUserId(null);
                          setDecisionType(null);
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        Cancel Decision
                      </button>
                    )}
                  </div>

                  <p className="text-sm">Zones: {scopeNames(personnelScope(user,wards).zoneIds,zones)} | Wards: {scopeNames(personnelScope(user,wards).wardIds,wards)}</p>
                  <p className="text-sm">Requested modules: {(user.requestedModules||[]).map(k=>PERSONNEL_MODULE_LABELS[k]||k).join(', ')||'Not supplied'}</p>
                  {user.rejectionRemarks && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <strong>Correction Note:</strong> {user.rejectionRemarks}
                    </div>
                  )}

                  {isDecidingThis && (
                    <form onSubmit={handleDecisionSubmit} className="pt-3 border-t border-slate-200 space-y-3 bg-slate-50 p-4 rounded-xl">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>
                          Action: <span className="uppercase text-indigo-600">{decisionType?.replace(/_/g, ' ')}</span>
                        </span>
                      </div>

                      {decisionType==='approved'&&currentUser.role==='CITY_ADMIN'&&<div className="space-y-3"><p className="font-medium">Review module and geography assignments before approval.</p><div className="flex flex-wrap gap-4">{enabledPersonnelKeys(user.cityId!).map(m=><label key={m} className="flex items-center gap-2"><input type="checkbox" checked={approvalModules.includes(m)} onChange={e=>setApprovalModules(v=>e.target.checked?[...v,m]:v.filter(k=>k!==m))}/>{PERSONNEL_MODULE_LABELS[m]}</label>)}</div><div className="grid sm:grid-cols-2 gap-3"><fieldset className="max-h-40 overflow-auto"><legend>Zones</legend>{zones.filter(z=>z.cityId===user.cityId).map(z=><label className="flex gap-2 py-1" key={z.id}><input type="checkbox" checked={approvalZones.includes(z.id)} onChange={e=>{const next=e.target.checked?[...approvalZones,z.id]:approvalZones.filter(id=>id!==z.id);setApprovalZones(next);setApprovalWards(v=>v.filter(id=>wards.some(w=>w.id===id&&next.includes(w.zoneId))));}}/>{z.name}</label>)}</fieldset><fieldset className="max-h-40 overflow-auto"><legend>Wards</legend>{wards.filter(w=>approvalZones.includes(w.zoneId)).map(w=><label className="flex gap-2 py-1" key={w.id}><input type="checkbox" checked={approvalWards.includes(w.id)} onChange={e=>setApprovalWards(v=>e.target.checked?[...v,w.id]:v.filter(id=>id!==w.id))}/>{w.name}</label>)}</fieldset></div></div>}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          {decisionType === 'approved' ? 'Approval Note (Optional)' : 'Required Remarks / Correction Details *'}
                        </label>
                        <input
                          type="text"
                          required={decisionType !== 'approved'}
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder={
                            decisionType === 'needs_correction'
                              ? 'Specify which documents or ward details need updating...'
                              : 'Provide justification...'
                          }
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveDecisionUserId(null)}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit" disabled={busy}
                          className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
                        >
                          Confirm Decision
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>
        <Pagination {...paging} noun="registration requests"/>
      </div>
    </div>
  );
};
