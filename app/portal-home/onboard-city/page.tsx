"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  CircleHelp,
  Info,
  Loader2,
  MapPin,
  Send,
  Sparkles,
  ShieldCheck,
  Users,
  TrendingUp,
  Layers,
  Lock
} from "lucide-react";

import { ApiError, CityApi } from "@lib/apiClient";

type MasterNode = {
  id: string;
  code: string;
  name: string;
};

type CityMasterNode = MasterNode & {
  districtId: string;
};

export default function CreateCityPage() {
  const router = useRouter();

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

  // Module Access Configuration for City  Onboarding
  const [enabledModules, setEnabledModules] = useState<{
    taskforce: boolean;
    swachh: boolean;
    workforce: boolean;
    mrf: boolean;
  }>({
    taskforce: true,
    swachh: true,
    workforce: true,
    mrf: true
  });

  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);

  const fieldClass = `
    h-12 w-full rounded-[12px]
    border border-slate-200 bg-white
    px-4 text-sm font-medium text-slate-700
    outline-none transition-all duration-200
    placeholder:text-slate-400
    hover:border-slate-300
    focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10
    disabled:cursor-not-allowed disabled:bg-slate-50
    disabled:text-slate-400 disabled:opacity-80
  `;

  useEffect(() => {
    CityApi.listStates()
      .then((res: any) => {
        setStates(res.states ?? []);
      })
      .catch(() => {
        setStatus("Failed to load states");
      });
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

    setMasterLoading(true);

    CityApi.listDivisions(stateId)
      .then((res: any) => {
        setDivisions(res.divisions ?? []);
        setDivisionId("");
        setDistricts([]);
        setDistrictId("");
        setMasterCities([]);
        setCityMasterId("");
      })
      .catch(() => {
        setStatus("Failed to load divisions");
      })
      .finally(() => {
        setMasterLoading(false);
      });
  }, [stateId]);

  useEffect(() => {
    if (!stateId || !divisionId) {
      setDistricts([]);
      setDistrictId("");
      setMasterCities([]);
      setCityMasterId("");
      return;
    }

    setMasterLoading(true);

    CityApi.listDistricts(stateId, divisionId)
      .then((res: any) => {
        setDistricts(res.districts ?? []);
        setDistrictId("");
        setMasterCities([]);
        setCityMasterId("");
      })
      .catch(() => {
        setStatus("Failed to load districts");
      })
      .finally(() => {
        setMasterLoading(false);
      });
  }, [stateId, divisionId]);

  useEffect(() => {
    if (!districtId) {
      setMasterCities([]);
      setCityMasterId("");
      return;
    }

    setMasterLoading(true);

    CityApi.listCities(districtId)
      .then((res: any) => {
        setMasterCities(res.cities ?? []);
        setCityMasterId("");
      })
      .catch(() => {
        setStatus("Failed to load cities");
      })
      .finally(() => {
        setMasterLoading(false);
      });
  }, [districtId]);

  useEffect(() => {
    const selectedCity = masterCities.find(
      (city) => city.id === cityMasterId
    );

    if (!selectedCity) return;

    if (!code) {
      setCode(selectedCity.code.toLowerCase());
    }

    if (!ulbCode) {
      setUlbCode(selectedCity.code.toLowerCase());
    }
  }, [cityMasterId, masterCities, code, ulbCode]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setCreating(true);
    setStatus("Saving...");

    try {
      await CityApi.create({
        stateId,
        divisionId,
        districtId,
        cityMasterId,
        code,
        ulbCode: ulbCode || code,
      });

      setStatus("City created successfully.");

      setStateId("");
      setDivisionId("");
      setDistrictId("");
      setCityMasterId("");

      setDivisions([]);
      setDistricts([]);
      setMasterCities([]);

      setCode("");
      setUlbCode("");
    } catch (error) {
      setStatus(
        error instanceof ApiError
          ? error.message
          : "Failed to create city"
      );
    } finally {
      setCreating(false);
    }
  };

  const isSuccess = status.toLowerCase().includes("success");

  const isSaving = status === "Saving...";

  const isError =
    Boolean(status) &&
    !isSuccess &&
    !isSaving;

  const hierarchyCompleted =
    Boolean(stateId) &&
    Boolean(divisionId) &&
    Boolean(districtId) &&
    Boolean(cityMasterId);

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => router.push("/portal-home")}
            className="font-semibold text-blue-600 transition hover:text-blue-700"
          >
            Portal Home
          </button>

          <span className="text-slate-300">/</span>

          <span className="font-bold text-slate-700">
            Create City
          </span>
        </nav>

        {/* Light hero header */}
        <section className="relative overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-[0_18px_50px_-35px_rgba(30,64,175,0.4)]">
          {/* Background waves */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -bottom-24 -left-20 h-56 w-[65%] rotate-[-4deg] rounded-[50%] border border-blue-100/70" />
            <div className="absolute -bottom-20 left-24 h-48 w-[70%] rotate-[-2deg] rounded-[50%] border border-blue-100/60" />
            <div className="absolute -bottom-16 left-52 h-40 w-[70%] rounded-[50%] border border-cyan-100/60" />

            <div className="absolute inset-y-0 right-0 w-[42%] bg-gradient-to-l from-blue-50/90 via-blue-50/35 to-transparent" />

            <div
              className="absolute right-8 top-4 h-32 w-64 opacity-50"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(37,99,235,0.2) 1.2px, transparent 1.2px)",
                backgroundSize: "15px 15px",
                maskImage:
                  "linear-gradient(to left, black, transparent)",
                WebkitMaskImage:
                  "linear-gradient(to left, black, transparent)",
              }}
            />
          </div>

          <div className="relative flex min-h-[170px] items-center justify-between gap-8 px-6 py-7 sm:px-8 lg:px-10">
            <div className="flex min-w-0 items-center gap-5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-[0_16px_32px_-16px_rgba(37,99,235,0.85)]">
                <Building2 size={29} strokeWidth={1.8} />
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">
                    Onboard New City
                  </h1>

                  <Sparkles
                    size={20}
                    className="text-blue-500"
                  />
                </div>

                <p className="mt-2 text-sm text-slate-500 sm:text-base">
                  Create a new city into the system.
                </p>
              </div>
            </div>

            {/* Abstract city illustration */}
            <div className="relative hidden h-28 w-[390px] shrink-0 items-end justify-end lg:flex">
              <div className="absolute bottom-1 right-6 flex items-end gap-2">
                {[45, 72, 58, 94, 65, 108, 76].map(
                  (height, index) => (
                    <span
                      key={`${height}-${index}`}
                      className="relative w-9 rounded-t-md border border-blue-100 bg-gradient-to-t from-blue-100 to-blue-50"
                      style={{ height }}
                    >
                      <span className="absolute inset-x-2 top-3 grid grid-cols-2 gap-1">
                        {Array.from({ length: 6 }).map(
                          (_, dotIndex) => (
                            <span
                              key={dotIndex}
                              className="h-1 rounded-full bg-blue-300/70"
                            />
                          )
                        )}
                      </span>
                    </span>
                  )
                )}
              </div>

              <span className="absolute bottom-2 left-10 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-sm">
                <MapPin size={24} />
              </span>

              <span className="absolute bottom-0 right-0 h-2 w-[310px] rounded-full bg-blue-100/70" />
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="grid grid-cols-1 items-stretch gap-5">

          {/* Form panel */}
          <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_48px_-38px_rgba(15,23,42,0.45)]">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7 sm:py-6">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-blue-50 text-blue-600">
                  <Building2 size={20} />
                </span>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    City Onboarding
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Select the complete geographic hierarchy to
                    register a new city .
                  </p>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleCreate}
              className="px-5 py-5 sm:px-7 sm:py-6"
            >
              {/* Hierarchy fields */}
              <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">
                    State <span className="text-rose-500">*</span>
                  </span>

                  <select
                    className={fieldClass}
                    value={stateId}
                    onChange={(event) =>
                      setStateId(event.target.value)
                    }
                    required
                  >
                    <option value="">Select state</option>

                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">
                    Division{" "}
                    <span className="text-rose-500">*</span>
                  </span>

                  <select
                    className={fieldClass}
                    value={divisionId}
                    onChange={(event) =>
                      setDivisionId(event.target.value)
                    }
                    disabled={!stateId}
                    required
                  >
                    <option value="">
                      {stateId
                        ? masterLoading
                          ? "Loading..."
                          : "Select division"
                        : "Select state first"}
                    </option>

                    {divisions.map((division) => (
                      <option
                        key={division.id}
                        value={division.id}
                      >
                        {division.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">
                    District{" "}
                    <span className="text-rose-500">*</span>
                  </span>

                  <select
                    className={fieldClass}
                    value={districtId}
                    onChange={(event) =>
                      setDistrictId(event.target.value)
                    }
                    disabled={!divisionId}
                    required
                  >
                    <option value="">
                      {divisionId
                        ? masterLoading
                          ? "Loading..."
                          : "Select district"
                        : "Select division first"}
                    </option>

                    {districts.map((district) => (
                      <option
                        key={district.id}
                        value={district.id}
                      >
                        {district.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">
                    City <span className="text-rose-500">*</span>
                  </span>

                  <select
                    className={fieldClass}
                    value={cityMasterId}
                    onChange={(event) =>
                      setCityMasterId(event.target.value)
                    }
                    disabled={!districtId}
                    required
                  >
                    <option value="">
                      {districtId
                        ? masterLoading
                          ? "Loading..."
                          : "Select city"
                        : "Select district first"}
                    </option>

                    {masterCities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Identifier fields - Hidden from UI */}
              <input type="hidden" value={code} />
              <input type="hidden" value={ulbCode} />

              <div className="my-6 h-px bg-slate-100" />

              {/* ── AUTHORIZED PLATFORM MODULES ASSIGNMENT ── */}
              <div>
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      Select and Assign Modules
                    </h3>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-600">
                    {Object.values(enabledModules).filter(Boolean).length} / 4 Enabled
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {/* 1. Taskforce 2.0 */}
                  <div
                    onClick={() => setEnabledModules(prev => ({ ...prev, taskforce: !prev.taskforce }))}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                      enabledModules.taskforce
                        ? "border-blue-500 bg-blue-50/50 shadow-sm"
                        : "border-slate-200 bg-slate-50/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                        <ShieldCheck size={18} className={enabledModules.taskforce ? "text-blue-600" : "text-slate-400"} />
                        Inspection and Performance system
                      </div>
                      <input
                        type="checkbox"
                        checked={enabledModules.taskforce}
                        onChange={() => {}}
                        className="h-4 w-4 accent-blue-600"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                      Beat Sweeping, Litterbins, Toilets monitoring modules Portal
                    </p>
                  </div>

                  {/* 2. Swachh Ward Ranking */}
                  <div
                    onClick={() => setEnabledModules(prev => ({ ...prev, swachh: !prev.swachh }))}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                      enabledModules.swachh
                        ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                        : "border-slate-200 bg-slate-50/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                        <Building2 size={18} className={enabledModules.swachh ? "text-emerald-600" : "text-slate-400"} />
                        Ward Ranking System
                      </div>
                      <input
                        type="checkbox"
                        checked={enabledModules.swachh}
                        onChange={() => {}}
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                      Assessor evaluations, Ward Ranking scoring system, and QC inspection portal.
                    </p>
                  </div>

                  {/* 3. Workforce Monitoring */}
                  <div
                    onClick={() => setEnabledModules(prev => ({ ...prev, workforce: !prev.workforce }))}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                      enabledModules.workforce
                        ? "border-purple-500 bg-purple-50/50 shadow-sm"
                        : "border-slate-200 bg-slate-50/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                        <Users size={18} className={enabledModules.workforce ? "text-purple-600" : "text-slate-400"} />
                        Workforce Attendance System
                      </div>
                      <input
                        type="checkbox"
                        checked={enabledModules.workforce}
                        onChange={() => {}}
                        className="h-4 w-4 accent-purple-600"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                      Employee attendance tracking, face verification attendance portal. 
                    </p>
                  </div>

                  {/* 4. Processing & MRF Plant */}
                  <div
                    onClick={() => setEnabledModules(prev => ({ ...prev, mrf: !prev.mrf }))}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                      enabledModules.mrf
                        ? "border-amber-500 bg-amber-50/50 shadow-sm"
                        : "border-slate-200 bg-slate-50/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 font-bold text-slate-900 text-sm">
                        <TrendingUp size={18} className={enabledModules.mrf ? "text-amber-600" : "text-slate-400"} />
                        Processing Plant System
                      </div>
                      <input
                        type="checkbox"
                        checked={enabledModules.mrf}
                        onChange={() => {}}
                        className="h-4 w-4 accent-amber-600"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                      Weighbridge gross/tare logging, recyclables sorting analytics & plant ledger.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status */}
              {status && (
                <div
                  role="status"
                  className={`mt-6 flex items-center gap-2.5 rounded-[12px] border px-4 py-3 text-sm font-semibold ${
                    isSuccess
                      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                      : isError
                        ? "border-rose-100 bg-rose-50 text-rose-700"
                        : "border-blue-100 bg-blue-50 text-blue-700"
                  }`}
                >
                  {isSuccess && <CheckCircle2 size={17} />}

                  {isSaving && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {status}
                </div>
              )}

              {/* Actions */}
              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/hms")}
                  disabled={creating}
                  className="
                    inline-flex h-12 items-center justify-center gap-2
                    rounded-[12px] border border-slate-200 bg-white
                    px-7 text-sm font-extrabold text-slate-700
                    transition-all duration-200
                    hover:border-blue-200 hover:bg-blue-50/50
                    hover:text-blue-700
                    disabled:cursor-not-allowed disabled:opacity-60
                    sm:min-w-[210px]
                  "
                >
                  <ArrowLeft size={16} />
                  Back to Dashboard
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="
                    inline-flex h-12 items-center justify-center gap-2
                    rounded-[12px] bg-gradient-to-r
                    from-blue-600 to-indigo-600
                    px-8 text-sm font-extrabold text-white
                    shadow-[0_14px_28px_-16px_rgba(37,99,235,0.8)]
                    transition-all duration-200
                    hover:-translate-y-0.5
                    hover:from-blue-700 hover:to-indigo-700
                    hover:shadow-[0_18px_34px_-16px_rgba(37,99,235,0.9)]
                    disabled:cursor-not-allowed
                    disabled:translate-y-0 disabled:opacity-65
                    sm:min-w-[210px]
                  "
                >
                  {creating ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Create City
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </section>
      </div>
    </div>
  );
}