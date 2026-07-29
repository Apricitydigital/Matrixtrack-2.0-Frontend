'use client';

import { useEffect, useState } from "react";
import { ApiError, CityApi } from "@lib/apiClient";

type MasterNode = { id: string; code: string; name: string };
type CityMasterNode = MasterNode & { districtId: string };

export default function CreateCityPage() {
  const [states, setStates] = useState<MasterNode[]>([]);
  const [divisions, setDivisions] = useState<MasterNode[]>([]);
  const [districts, setDistricts] = useState<MasterNode[]>([]);
  const [masterCities, setMasterCities] = useState<CityMasterNode[]>([]);
  const [stateId, setStateId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [cityMasterId, setCityMasterId] = useState("");
  const [code, setCode] = useState("");
  const [ulbCode, setUlbCode] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    CityApi.listStates().then((res: any) => setStates(res.states ?? [])).catch(() => setStatus("Failed to load states"));
  }, []);

  useEffect(() => {
    if (!stateId) {
      setDivisions([]);
      setDivisionId("");
      setDistricts([]);
      setDistrictId("");
      setMasterCities([]);
      setCityMasterId("");
      return;
    }
    CityApi.listDivisions(stateId)
      .then((res: any) => {
        setDivisions(res.divisions ?? []);
        setDivisionId("");
        setDistricts([]);
        setDistrictId("");
        setMasterCities([]);
        setCityMasterId("");
      })
      .catch(() => setStatus("Failed to load divisions"));
  }, [stateId]);

  useEffect(() => {
    if (!stateId || !divisionId) {
      setDistricts([]);
      setDistrictId("");
      setMasterCities([]);
      setCityMasterId("");
      return;
    }
    CityApi.listDistricts(stateId, divisionId)
      .then((res: any) => {
        setDistricts(res.districts ?? []);
        setDistrictId("");
        setMasterCities([]);
        setCityMasterId("");
      })
      .catch(() => setStatus("Failed to load districts"));
  }, [stateId, divisionId]);

  useEffect(() => {
    if (!districtId) {
      setMasterCities([]);
      setCityMasterId("");
      return;
    }
    CityApi.listCities(districtId)
      .then((res: any) => {
        setMasterCities(res.cities ?? []);
        setCityMasterId("");
      })
      .catch(() => setStatus("Failed to load cities"));
  }, [districtId]);

  useEffect(() => {
    const selectedCity = masterCities.find((city) => city.id === cityMasterId);
    if (!selectedCity) return;
    if (!code) setCode(selectedCity.code.toLowerCase());
    if (!ulbCode) setUlbCode(selectedCity.code.toLowerCase());
  }, [cityMasterId, masterCities, code, ulbCode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Saving...");
    try {
      await CityApi.create({ stateId, divisionId, districtId, cityMasterId, code, ulbCode: ulbCode || code });
      setStatus("City created");
      setStateId("");
      setDivisionId("");
      setDistrictId("");
      setCityMasterId("");
      setDivisions([]);
      setDistricts([]);
      setMasterCities([]);
      setCode("");
      setUlbCode("");
    } catch (err) {
      setStatus(err instanceof ApiError ? err.message : "Failed to create city");
    }
  };

  return (
    <div className="card">
      <h2>Create City</h2>
      <form onSubmit={handleCreate} className="form">
        <div className="form-field">
          <label>State</label>
          <select className="input" value={stateId} onChange={(e) => setStateId(e.target.value)} required>
            <option value="">Select state</option>
            {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Division</label>
          <select className="input" value={divisionId} onChange={(e) => setDivisionId(e.target.value)} disabled={!stateId} required>
            <option value="">Select division</option>
            {divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>District</label>
          <select className="input" value={districtId} onChange={(e) => setDistrictId(e.target.value)} disabled={!divisionId} required>
            <option value="">Select district</option>
            {districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>City</label>
          <select className="input" value={cityMasterId} onChange={(e) => setCityMasterId(e.target.value)} disabled={!districtId} required>
            <option value="">Select city</option>
            {masterCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Code</label>
          <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="form-field">
          <label>ULB Code</label>
          <input className="input" value={ulbCode} onChange={(e) => setUlbCode(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit">Create</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}
