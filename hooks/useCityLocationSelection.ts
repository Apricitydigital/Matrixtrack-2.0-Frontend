'use client';

import { useCallback, useEffect, useState } from 'react';
import { CityApi } from '@lib/apiClient';

type Master = { id: string; code: string; name: string };
type CityMaster = Master & { districtId: string };
type DivisionMode = 'LOADING' | 'REQUIRED' | 'OPTIONAL' | 'UNVERIFIED';
type Initial = { stateId?: string; divisionId?: string; districtId?: string; cityMasterId?: string; cityName?: string };

export function useCityLocationSelection(initial: Initial = {}) {
  const [stateId, updateState] = useState(initial.stateId || '');
  const [divisionId, updateDivision] = useState(initial.divisionId || '');
  const [districtId, updateDistrict] = useState(initial.districtId || '');
  const [cityMasterId, setCityMasterId] = useState(initial.cityMasterId || '');
  const [divisions, setDivisions] = useState<Master[]>([]);
  const [districts, setDistricts] = useState<Master[]>([]);
  const [masterCities, setMasterCities] = useState<CityMaster[]>([]);
  const [divisionMode, setMode] = useState<DivisionMode>('LOADING');
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [locationError, setLocationError] = useState('');
  const initialCityName = initial.cityName || '';

  const setStateId = useCallback((id: string) => {
    updateState(id); updateDivision(''); updateDistrict(''); setCityMasterId('');
    setDivisions([]); setDistricts([]); setMasterCities([]); setMode('LOADING'); setLocationError('');
  }, []);
  const setDivisionId = useCallback((id: string) => {
    updateDivision(id); updateDistrict(''); setCityMasterId('');
    setDistricts([]); setMasterCities([]); setLocationError('');
  }, []);
  const setDistrictId = useCallback((id: string) => {
    updateDistrict(id); setCityMasterId(''); setMasterCities([]); setLocationError('');
  }, []);

  useEffect(() => {
    let active = true;
    setDivisions([]);
    if (!stateId) { setMode('LOADING'); setLoadingDivisions(false); return; }
    setMode('LOADING'); setLoadingDivisions(true); setLocationError('');
    CityApi.listDivisions(stateId)
      .then((response) => {
        if (!active) return;
        const result = response as { divisions: Master[]; divisionMode?: DivisionMode };
        const mode = result.divisionMode || 'REQUIRED';
        setDivisions(result.divisions || []); setMode(mode);
        updateDivision((current) => mode === 'REQUIRED' && result.divisions.some((entry) => entry.id === current) ? current : '');
        if (mode === 'UNVERIFIED') setLocationError('Verified division mapping is not configured for this state. Select a configured state or update its location master first.');
      })
      .catch(() => { if (active) { setMode('UNVERIFIED'); setLocationError('Could not load divisions. Please retry.'); } })
      .finally(() => { if (active) setLoadingDivisions(false); });
    return () => { active = false; };
  }, [stateId]);

  useEffect(() => {
    let active = true;
    setDistricts([]);
    if (!stateId || divisionMode === 'LOADING' || divisionMode === 'UNVERIFIED'
        || (divisionMode === 'REQUIRED' && !divisionId)) {
      setLoadingDistricts(false); return;
    }
    setLoadingDistricts(true);
    CityApi.listDistricts(stateId, divisionMode === 'OPTIONAL' ? '' : divisionId)
      .then((result) => {
        if (!active) return;
        setDistricts(result.districts || []);
        updateDistrict((current) => result.districts.some((entry) => entry.id === current) ? current : '');
      })
      .catch(() => { if (active) { updateDistrict(''); setLocationError('Could not load districts. Please retry.'); } })
      .finally(() => { if (active) setLoadingDistricts(false); });
    return () => { active = false; };
  }, [stateId, divisionId, divisionMode]);

  useEffect(() => {
    let active = true;
    setMasterCities([]);
    // Only request cities after the current district has been validated against
    // the current parent response, including initial edit-form selections.
    if (!districtId || !districts.some((entry) => entry.id === districtId)) { setLoadingCities(false); return; }
    setLoadingCities(true);
    CityApi.listCities(districtId)
      .then((result) => {
        if (!active) return;
        setMasterCities(result.cities || []);
        setCityMasterId((current) => result.cities.some((entry) => entry.id === current) ? current
          : result.cities.find((entry) => entry.name.toLowerCase() === initialCityName.toLowerCase())?.id || '');
      })
      .catch(() => { if (active) { setCityMasterId(''); setLocationError('Could not load cities. Please retry.'); } })
      .finally(() => { if (active) setLoadingCities(false); });
    return () => { active = false; };
  }, [districtId, districts, initialCityName]);

  const masterLoading = loadingDivisions || loadingDistricts || loadingCities;
  const divisionOptional = divisionMode === 'OPTIONAL';
  const districtEnabled = !!stateId && (divisionOptional || (divisionMode === 'REQUIRED' && divisions.some((entry) => entry.id === divisionId)));
  const hierarchyCompleted = !masterLoading && districtEnabled && districts.some((entry) => entry.id === districtId)
    && masterCities.some((entry) => entry.id === cityMasterId && entry.districtId === districtId);
  const divisionPlaceholder = loadingDivisions ? 'Loading divisions…' : divisionOptional ? 'Not configured — select district directly'
    : divisionMode === 'UNVERIFIED' ? 'Division mapping unavailable' : stateId ? 'Select division' : 'Select state first';

  return {
    stateId, setStateId, divisionId, setDivisionId, districtId, setDistrictId, cityMasterId, setCityMasterId,
    divisions, setDivisions, districts, setDistricts, masterCities, setMasterCities,
    divisionMode, divisionOptional, divisionPlaceholder, districtEnabled, hierarchyCompleted,
    masterLoading, loadingDivisions, loadingDistricts, loadingCities, locationError,
  };
}
