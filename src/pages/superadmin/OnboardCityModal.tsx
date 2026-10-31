import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { matrixStore } from '../../services/store';
import { api } from '../../services/api';
import type { User, ProductId, OperationalModuleId } from '../../types';

interface Props { isOpen: boolean; onClose: () => void; currentUser: User; onSuccess: () => void; }
export function OnboardCityModal({ isOpen, onClose, currentUser, onSuccess }: Props) {
  const [states, setStates] = useState<any[]>([]), [districts, setDistricts] = useState<any[]>([]), [cities, setCities] = useState<any[]>([]);
  const [stateId, setStateId] = useState(''), [districtId, setDistrictId] = useState(''), [cityId, setCityId] = useState('');
  const [cityCode, setCityCode] = useState(''), [ulbCode, setUlbCode] = useState('');
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [modules, setModules] = useState<OperationalModuleId[]>([]);
  const [products, setProducts] = useState<ProductId[]>(['municipal_operations']);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { if (!isOpen) return; let active = true; api('/hms/locations/states').then(r => { if (active) setStates(r.states); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [isOpen]);
  useEffect(() => {
    setDistricts([]); setDistrictId(''); setCities([]); setCityId('');
    if (!stateId) return; let active = true;
    api(`/hms/locations/districts?stateId=${stateId}`).then(r => { if (active) setDistricts(r.districts); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [stateId]);
  useEffect(() => {
    setCities([]); setCityId(''); if (!districtId) return; let active = true;
    api(`/hms/locations/cities?districtId=${districtId}`).then(r => { if (active) setCities(r.cities); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [districtId]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      await matrixStore.onboardCity({ name: cities.find(c => c.id === cityId)?.name, state: states.find(s => s.id === stateId)?.name, district: districts.find(d => d.id === districtId)?.name, cityCode, ulbCode, enabledModules: modules, enabledProducts: products }, { name, email, password }, currentUser);
      setPassword(''); setCityCode(''); setUlbCode(''); setName(''); setEmail(''); onSuccess(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'Onboarding failed.'); }
    finally { setBusy(false); }
  };
  const inputClass = 'w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 bg-white';
  return <Modal isOpen={isOpen} onClose={() => { if (!busy) { setPassword(''); onClose(); } }} title="Onboard Municipal Corporation" maxWidth="2xl"><form onSubmit={submit} className="space-y-5 text-sm"><fieldset disabled={busy} className="space-y-5">
    <p className="text-slate-500">Choose a location from the MatrixTrack master and create its administrator.</p>
    <div className="grid sm:grid-cols-3 gap-3">{[['State', stateId, states, setStateId], ['District', districtId, districts, setDistrictId], ['City', cityId, cities, setCityId]].map(([label, value, rows, change]: any) => <label key={label}>{label}<select required value={value} onChange={e => change(e.target.value)} className={inputClass}><option value="">Select {label}</option>{rows.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>)}</div>
    <div className="grid sm:grid-cols-2 gap-3"><label>City code<input required value={cityCode} onChange={e => setCityCode(e.target.value)} className={inputClass} /></label><label>ULB code<input required value={ulbCode} onChange={e => setUlbCode(e.target.value)} className={inputClass} /></label></div>
    <div><h2 className="font-semibold mb-2">Operational modules</h2><div className="flex flex-wrap gap-4">{(['sweeping','toilets','litter_bins','nala','ctu_gvp'] as OperationalModuleId[]).map(m => <label key={m} className="flex items-center gap-2"><input type="checkbox" checked={modules.includes(m)} onChange={e => setModules(e.target.checked ? [...modules, m] : modules.filter(x => x !== m))} />{m.replaceAll('_', ' ')}</label>)}</div></div>
    <div><h2 className="font-semibold mb-2">Connected products</h2><div className="flex flex-wrap gap-4">{(['workforce_monitoring','swachh_assessment','plant_processing'] as ProductId[]).map(p => <label key={p} className="flex items-center gap-2"><input type="checkbox" checked={products.includes(p)} onChange={e => setProducts(e.target.checked ? [...products, p] : products.filter(x => x !== p))} />{p.replaceAll('_', ' ')}</label>)}</div></div>
    <label className="block">Administrator name<input required value={name} onChange={e => setName(e.target.value)} className={inputClass} /></label>
    <div className="grid sm:grid-cols-2 gap-3"><label>Email<input type="email" required autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} /></label><label>Initial password<input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} /></label></div>
    {error && <p role="alert" className="text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">{busy ? 'Creating city and administrator…' : 'Create city'}</button>
  </fieldset></form></Modal>;
}
