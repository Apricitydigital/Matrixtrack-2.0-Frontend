'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './SuperAdminHomeDashboard.module.css';
import { AlertCircle, ArrowRight, Building2, CheckCircle2, ChevronDown, ChevronUp, Globe, Layers, RefreshCw, Search, ShieldCheck, UserCheck, Users, Clock, PlusCircle } from 'lucide-react';
import { CityApi, CityUserApi } from '@lib/apiClient';
import { useAuth } from '@hooks/useAuth';
import type { CityRow } from '../../types/api';
import { moduleLabel, pendingRequests, roleCounts, roleLabel, uniqueUserCount } from './superAdminOverview';
import type { OverviewUser, SuperAdminOverviewResponse } from './superAdminOverview';

const panel = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
const secondary = 'text-sm text-slate-500 dark:text-slate-400';
const control = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const action = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800';
const number = (value: number) => value.toLocaleString('en-IN');
const dateTime = (value: string | Date) => new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const isValidDate = (value: unknown): value is string | Date => !!value && Number.isFinite(new Date(value as string).getTime());
const enabledModules = (city: CityRow) => (city.modules || []).filter((module) => module.enabled === true);

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">{children}</p>;
}

function SummaryCard({ label, value, detail, icon: Icon }: {
  label: string; value: number | null; detail: string; icon: typeof Globe;
}) {
  return <article className={styles.metric}>
    <div className="flex items-center justify-between gap-2">
      <p className={styles.metricLabel}>{label}</p>
      <span className={styles.metricIcon}><Icon className="h-5 w-5" aria-hidden="true" /></span>
    </div>
    <p className={`${styles.metricValue} mt-3`}>{value === null ? '—' : number(value)}</p>
    <p className={styles.metricDetail}>{detail}</p>
  </article>;
}

function CityDetails({ city, users, available }: { city: CityRow; users: OverviewUser[]; available: boolean }) {
  const admins = Array.from(new Map(users.filter((user) => user.role.toUpperCase() === 'CITY_ADMIN').map((user) => [user.id, user])).values());
  return <div className="grid gap-5 p-4 text-sm lg:grid-cols-3">
    <section>
      <h4 className="mb-2 font-semibold text-slate-900 dark:text-white">Assigned city admins</h4>
      {!available ? <p className={secondary}>Admin details unavailable. Retry loading.</p> : admins.length === 0 ? <p className={secondary}>No city admin assigned.</p> :
        <ul className="space-y-3">{admins.map((admin) => <li key={admin.id}>
          <p className="font-medium text-slate-800 dark:text-slate-100">{admin.name}</p>
          {admin.email && <p className="break-all text-slate-500 dark:text-slate-400">{admin.email}</p>}
          {admin.phone && <p className="text-slate-500 dark:text-slate-400">{admin.phone}</p>}
        </li>)}</ul>}
    </section>
    <section>
      <h4 className="mb-2 font-semibold text-slate-900 dark:text-white">Registered users by role</h4>
      {!available ? <p className={secondary}>User details unavailable. Retry loading.</p> : users.length === 0 ? <p className={secondary}>No registered users.</p> :
        <ul className="space-y-2">{roleCounts(users).map((item) => <li key={item.role} className="flex justify-between gap-3 text-slate-600 dark:text-slate-300"><span>{item.label}</span><strong>{number(item.count)}</strong></li>)}</ul>}
    </section>
    <section>
      <h4 className="mb-2 font-semibold text-slate-900 dark:text-white">Enabled modules ({enabledModules(city).length})</h4>
      <div className="flex flex-wrap gap-2">{enabledModules(city).map((module) => <span key={module.id} className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">{moduleLabel(module.name)}</span>)}</div>
      {enabledModules(city).length === 0 && <p className={secondary}>No modules enabled.</p>}
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">ULB code: {city.ulbCode || 'Not provided'}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Division: {city.division?.name || 'Not provided'}</p>
    </section>
  </div>;
}

export default function SuperAdminHomeDashboard() {
  const { user } = useAuth();
  const [cities, setCities] = useState<CityRow[] | null>(null);
  const [overview, setOverview] = useState<SuperAdminOverviewResponse | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [cityId, setCityId] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cityPage, setCityPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  const mounted = useRef(false);
  const generation = useRef(0);
  const pageSize = 8;

  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setErrors([]);
    const [cityResult, overviewResult] = await Promise.allSettled([
      CityApi.list().then((result) => {
        if (!Array.isArray(result.cities)) throw new Error('Invalid city response');
        return result.cities;
      }),
      CityUserApi.superAdminOverview().then((result) => {
        if (!Array.isArray(result.users) || !Array.isArray(result.requests)) throw new Error('Invalid overview response');
        return result;
      }),
    ]);
    if (!mounted.current || request !== generation.current) return;
    const failures: string[] = [];
    if (cityResult.status === 'fulfilled') {
      setCities(cityResult.value);
      setCityId((current) => current === 'all' || cityResult.value.some((city) => city.id === current) ? current : 'all');
    } else {
      setCities(null);
      failures.push('City details could not be loaded.');
    }
    if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value);
    else {
      setOverview(null);
      failures.push('User and registration details could not be loaded. Check the backend update and your session, then retry.');
    }
    setLastUpdated(failures.length === 0 ? new Date().toISOString() : null);
    setErrors(failures);
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; ++generation.current; };
  }, [load]);

  useEffect(() => { setCityPage(1); setAdminPage(1); setExpanded(null); }, [cityId]);
  useEffect(() => { setCityPage(1); setExpanded(null); }, [search, status]);

  const scopedCities = useMemo(() => (cities || []).filter((city) => cityId === 'all' || city.id === cityId), [cities, cityId]);
  const scopedUsers = useMemo(() => (overview?.users || []).filter((entry) => cityId === 'all' || entry.cityId === cityId), [overview, cityId]);
  const scopedRequests = useMemo(() => (overview?.requests || []).filter((entry) => cityId === 'all' || entry.cityId === cityId), [overview, cityId]);
  const roles = useMemo(() => roleCounts(scopedUsers), [scopedUsers]);
  const usersByCity = useMemo(() => {
    const result = new Map<string, OverviewUser[]>();
    for (const entry of scopedUsers) result.set(entry.cityId, [...(result.get(entry.cityId) || []), entry]);
    return result;
  }, [scopedUsers]);
  const adminMemberships = useMemo(() => Array.from(new Map(scopedUsers.filter((entry) => entry.role.toUpperCase() === 'CITY_ADMIN').map((entry) => [`${entry.cityId}:${entry.id}`, entry])).values())
    .sort((a, b) => a.cityName.localeCompare(b.cityName) || a.name.localeCompare(b.name)), [scopedUsers]);
  const pending = pendingRequests(scopedRequests);
  const noAdmin = overview && cities ? scopedCities.filter((city) => !(usersByCity.get(city.id) || []).some((entry) => entry.role.toUpperCase() === 'CITY_ADMIN')) : [];
  const noModules = scopedCities.filter((city) => enabledModules(city).length === 0);
  const inactive = scopedCities.filter((city) => !city.enabled);
  const visibleCities = scopedCities.filter((city) => {
    const query = search.trim().toLowerCase();
    const haystack = [city.name, city.code, city.ulbCode, city.state?.name, city.district?.name].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query) && (status === 'all' || (status === 'active' ? city.enabled : !city.enabled));
  }).sort((a, b) => a.name.localeCompare(b.name));
  const cityPages = Math.max(1, Math.ceil(visibleCities.length / pageSize));
  const adminPages = Math.max(1, Math.ceil(adminMemberships.length / pageSize));
  const actualCityPage = Math.min(cityPage, cityPages);
  const actualAdminPage = Math.min(adminPage, adminPages);
  const scopeName = cityId === 'all' ? 'All cities' : cities?.find((city) => city.id === cityId)?.name || 'Selected city';
  const moduleCount = new Set(scopedCities.flatMap((city) => enabledModules(city).map((module) => module.id))).size;
  const userValue = (value: number) => overview && !loading ? value : null;
  const cityValue = (value: number) => cities && !loading ? value : null;
  const recent = useMemo(() => {
    const additions: { id: string; title: string; detail: string; at: string | Date }[] = [];
    for (const city of scopedCities) if (isValidDate(city.createdAt)) additions.push({ id: `city:${city.id}`, title: `${city.name} added`, detail: 'City onboarding', at: city.createdAt });
    for (const request of scopedRequests) if (isValidDate(request.createdAt)) additions.push({ id: `request:${request.id}`, title: `${request.name} submitted a registration`, detail: `${cities?.find((city) => city.id === request.cityId)?.name || 'City not listed'} · ${request.status.replace(/_/g, ' ')}`, at: request.createdAt });
    return additions.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 4);
  }, [scopedCities, scopedRequests, cities]);

  return <div className={`${styles.dashboard} space-y-5 pb-6`} aria-busy={loading}>
    <header className={`${styles.hero} flex flex-col gap-4 text-white sm:flex-row sm:items-center sm:justify-between`}>
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-blue-300"><ShieldCheck size={16} aria-hidden="true" /> MatrixTrack 2.0 · Super Admin</p>
        <h1 className="mt-2 text-2xl font-bold">Platform overview</h1>
        <p className="mt-1 text-sm text-slate-300">Welcome, {user?.name || 'Super Admin'}. Your cities, teams and pending actions in one place.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={loading} onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />{loading ? 'Loading…' : 'Refresh'}</button>
        <Link href="/portal-home/onboard-city" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"><PlusCircle size={16} aria-hidden="true" />Create city</Link>
      </div>
    </header>

    <div className={`${styles.scopeBar} flex flex-col justify-between gap-3 sm:flex-row sm:items-center`}>
      <label className="flex items-center gap-3 text-sm font-medium">Overview scope
        <select value={cityId} onChange={(event) => setCityId(event.target.value)} disabled={loading || !cities} className={control}>
          <option value="all">All cities</option>
          {(cities || []).map((city) => <option key={city.id} value={city.id}>{city.name}{!city.enabled ? ' (Inactive)' : ''}</option>)}
        </select>
      </label>
      <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">{loading ? 'Loading overview…' : lastUpdated ? `Updated ${dateTime(lastUpdated)}` : 'Some details are unavailable. Retry loading.'}</p>
    </div>

    {errors.length > 0 && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"><p className="font-semibold">Overview partially unavailable</p>{errors.map((message) => <p key={message} className="mt-1">{message}</p>)}<button type="button" onClick={() => void load()} disabled={loading} className="mt-2 font-semibold underline">Retry</button></div>}

    <section aria-label="Summary" className={`${styles.summary} grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6`}>
      <SummaryCard label="Total cities" value={cityValue(scopedCities.length)} detail="Cities in selected scope" icon={Globe} />
      <SummaryCard label="Active cities" value={cityValue(scopedCities.filter((city) => city.enabled).length)} detail="Currently enabled" icon={CheckCircle2} />
      <SummaryCard label="City admins" value={userValue(uniqueUserCount(adminMemberships))} detail="Assigned administrator accounts" icon={UserCheck} />
      <SummaryCard label="Registered users" value={userValue(uniqueUserCount(scopedUsers))} detail="Across selected cities" icon={Users} />
      <SummaryCard label="Enabled modules" value={cityValue(moduleCount)} detail="Available across selected cities" icon={Layers} />
      <SummaryCard label="Pending registrations" value={userValue(pending.length)} detail="Awaiting your review" icon={Clock} />
    </section>

    <section className={`${panel} ${styles.attention} p-4 sm:p-5`} aria-labelledby="attention-title">
      <h2 id="attention-title" className="flex items-center gap-2 text-base font-bold"><AlertCircle size={18} className="text-amber-600" aria-hidden="true" />Needs attention <span className="text-xs font-normal text-slate-500">· {scopeName}</span></h2>
      {loading ? <p className={`${secondary} mt-3`}>Checking setup and registrations…</p> : <div className={`${styles.attentionGrid} mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4`}>
        <div className={`${pending.length > 0 ? styles.pendingAttention : ''} rounded-xl bg-slate-50 p-3 dark:bg-slate-800`}><p className="font-semibold">{overview ? number(pending.length) : '—'} pending {pending.length === 1 ? 'registration' : 'registrations'}</p><Link href="/portal-home/registration-requests" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400">Review requests<ArrowRight size={14} /></Link></div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="font-semibold">{cities && overview ? noAdmin.length : '—'} {noAdmin.length === 1 ? 'city' : 'cities'} without an admin</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cities && overview ? noAdmin.map((city) => city.name).join(', ') || 'Every city has an assigned admin.' : 'Details unavailable.'}</p><Link href="/portal-home/city-directory" className="mt-2 inline-block text-sm font-semibold text-blue-600 dark:text-blue-400">Manage assignments</Link></div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="font-semibold">{cities ? noModules.length : '—'} {noModules.length === 1 ? 'city' : 'cities'} without modules</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cities ? noModules.map((city) => city.name).join(', ') || 'All cities have enabled modules.' : 'Details unavailable.'}</p><Link href="/portal-home/city-directory" className="mt-2 inline-block text-sm font-semibold text-blue-600 dark:text-blue-400">Manage city modules</Link></div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="font-semibold">{cities ? inactive.length : '—'} inactive {inactive.length === 1 ? 'city' : 'cities'}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cities ? inactive.map((city) => city.name).join(', ') || 'All cities are enabled.' : 'Details unavailable.'}</p><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Review if access needs to change.</p></div>
      </div>}
    </section>

    <section className={`${panel} overflow-hidden`} aria-labelledby="cities-title">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5 lg:flex-row lg:items-center">
        <div><h2 id="cities-title" className="flex items-center gap-2 text-base font-bold"><Building2 size={18} className="text-blue-600" aria-hidden="true" />City overview</h2><p className={`${secondary} mt-1`}>{scopeName} · Expand a city for admin contacts, roles and modules.</p></div>
        <div className="flex flex-wrap gap-2">
          <label className="relative"><span className="sr-only">Search city table</span><Search size={16} className="absolute left-3 top-3 text-slate-400" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search city or code" className={`${styles.searchInput} ${control} w-full sm:w-56`} /></label>
          <label><span className="sr-only">City table status filter</span><select value={status} onChange={(event) => setStatus(event.target.value)} className={control}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className={`${styles.cityTable} w-full min-w-[900px] text-left text-sm`}>
          <caption className="sr-only">Cities with status, assigned admins, registered users and enabled modules. Search and status filters apply to this table.</caption>
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr>{['City / code', 'Location', 'Status', 'City admins', 'Users', 'Enabled modules', 'Details'].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? <tr><td colSpan={7}><Empty>Loading cities…</Empty></td></tr> : !cities ? <tr><td colSpan={7}><Empty>City details are unavailable. Retry loading.</Empty></td></tr> : visibleCities.length === 0 ? <tr><td colSpan={7}><Empty>{cities.length === 0 ? 'No cities onboarded yet. Create a city to begin.' : 'No cities match these table filters.'}</Empty></td></tr> : visibleCities.slice((actualCityPage - 1) * pageSize, actualCityPage * pageSize).map((city) => {
              const cityUsers = usersByCity.get(city.id) || [];
              const adminNames = Array.from(new Map(cityUsers.filter((entry) => entry.role.toUpperCase() === 'CITY_ADMIN').map((entry) => [entry.id, entry.name])).values());
              return <React.Fragment key={city.id}><tr className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <th scope="row" className="px-4 py-4 font-semibold"><div className={styles.cityName}><span className={styles.cityAvatar} aria-hidden="true">{city.name.slice(0, 2).toUpperCase()}</span><div><span className="block">{city.name}</span><span className="mt-1 block text-xs font-normal text-slate-500">{city.code}</span></div></div></th>
                <td className="px-4 py-4 text-slate-500 dark:text-slate-400">{city.state?.name || 'State not provided'}<span className="mt-1 block text-xs">{city.district?.name || 'District not provided'}</span></td>
                <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${city.enabled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{city.enabled ? 'Active' : 'Inactive'}</span></td>
                <td className="px-4 py-4">{overview ? <><span className="font-semibold">{adminNames.length}</span><p className="mt-1 max-w-[180px] text-xs text-slate-500 dark:text-slate-400">{adminNames.join(', ') || 'Not assigned'}</p></> : '—'}</td>
                <td className="px-4 py-4 font-semibold">{overview ? number(uniqueUserCount(cityUsers)) : '—'}</td>
                <td className="px-4 py-4"><span className={styles.moduleCount}><Layers size={13} aria-hidden="true" />{enabledModules(city).length} enabled</span></td>
                <td className="px-4 py-4"><button type="button" aria-expanded={expanded === city.id} aria-controls={`city-details-${city.id}`} aria-label={`${expanded === city.id ? 'Hide' : 'View'} ${city.name} details`} onClick={() => setExpanded(expanded === city.id ? null : city.id)} className={action}>{expanded === city.id ? 'Hide' : 'View'}{expanded === city.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></td>
              </tr>{expanded === city.id && <tr id={`city-details-${city.id}`} className="bg-slate-50/70 dark:bg-slate-950/40"><td colSpan={7}><CityDetails city={city} users={cityUsers} available={!!overview} /></td></tr>}</React.Fragment>;
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"><p>{visibleCities.length} matching cities · Table search and status do not change summary totals.</p><div className="flex items-center gap-3"><button className={action} disabled={loading || actualCityPage <= 1} onClick={() => setCityPage(actualCityPage - 1)}>Previous</button><span>{actualCityPage} / {cityPages}</span><button className={action} disabled={loading || actualCityPage >= cityPages} onClick={() => setCityPage(actualCityPage + 1)}>Next</button></div></div>
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className={`${panel} p-4 sm:p-5`} aria-labelledby="roles-title">
        <h2 id="roles-title" className="flex items-center gap-2 text-base font-bold"><Users size={18} className="text-violet-600" aria-hidden="true" />Registered users by role</h2>
        <p className={`${secondary} mt-1`}>{scopeName} · Unique accounts in each role.</p>
        {loading ? <Empty>Loading roles…</Empty> : !overview ? <Empty>Role details unavailable. Retry loading.</Empty> : roles.length === 0 ? <Empty>No registered users in this scope.</Empty> : <ul className={styles.rolesGrid}>{roles.map((item) => <li key={item.role} className={styles.roleTile}><span className={styles.roleLabel}>{item.label}</span><strong className={styles.roleCount}>{number(item.count)}</strong></li>)}</ul>}
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">An account with several roles appears in each applicable role. Registered users counts each account once.</p>
      </section>
      <section className={`${panel} p-4 sm:p-5`} aria-labelledby="recent-title">
        <h2 id="recent-title" className="flex items-center gap-2 text-base font-bold"><Clock size={18} className="text-blue-600" aria-hidden="true" />Recent additions</h2>
        <p className={`${secondary} mt-1`}>{scopeName} · City onboarding and registration submissions.</p>
        {loading ? <Empty>Loading recent additions…</Empty> : recent.length === 0 ? <Empty>No dated additions available.</Empty> : <ul className={`${styles.recentList} mt-2 divide-y divide-slate-100 dark:divide-slate-800`}>{recent.map((entry) => <li key={entry.id} className="py-3"><p className="text-sm font-medium">{entry.title}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{entry.detail}</p><time dateTime={new Date(entry.at).toISOString()} className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{dateTime(entry.at)}</time></li>)}</ul>}
      </section>
    </div>

    <section className={`${panel} overflow-hidden`} aria-labelledby="admins-title">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"><div><h2 id="admins-title" className="flex items-center gap-2 text-base font-bold"><UserCheck size={18} className="text-blue-600" aria-hidden="true" />City admin directory</h2><p className={`${secondary} mt-1`}>{scopeName} · City admin assignments only.</p></div><Link href="/portal-home/city-directory" className={action}>Manage admins<ArrowRight size={14} /></Link></div>
      <div className="overflow-x-auto"><table className={`${styles.adminTable} w-full min-w-[600px] text-left text-sm`}><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr>{['Name', 'Email', 'Phone', 'City', 'Role'].map((heading) => <th scope="col" key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{loading ? <tr><td colSpan={5}><Empty>Loading admins…</Empty></td></tr> : !overview ? <tr><td colSpan={5}><Empty>Admin details unavailable. Retry loading.</Empty></td></tr> : adminMemberships.length === 0 ? <tr><td colSpan={5}><Empty>No city admins assigned in this scope.</Empty></td></tr> : adminMemberships.slice((actualAdminPage - 1) * pageSize, actualAdminPage * pageSize).map((admin) => <tr key={`${admin.cityId}:${admin.id}`}><th scope="row" className="px-4 py-3 font-medium">{admin.name}</th><td className="break-all px-4 py-3 text-slate-500 dark:text-slate-400">{admin.email || 'Not provided'}</td><td className="px-4 py-3 text-slate-500 dark:text-slate-400">{admin.phone || 'Not provided'}</td><td className="px-4 py-3">{admin.cityName}</td><td className="px-4 py-3">{roleLabel(admin.role)}</td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"><span>{overview ? adminMemberships.length : '—'} city admin assignments</span><div className="flex items-center gap-3"><button className={action} disabled={loading || actualAdminPage <= 1} onClick={() => setAdminPage(actualAdminPage - 1)}>Previous</button><span>{actualAdminPage} / {adminPages}</span><button className={action} disabled={loading || actualAdminPage >= adminPages} onClick={() => setAdminPage(actualAdminPage + 1)}>Next</button></div></div>
    </section>

    <nav aria-label="Quick actions" className={`${styles.footerActions} grid gap-3 sm:grid-cols-2 xl:grid-cols-4`}>
      {[
        { label: 'Create city', href: '/portal-home/onboard-city' },
        { label: 'Manage cities & admins', href: '/portal-home/city-directory' },
        { label: 'Manage access', href: '/portal-home/admin-management' },
        { label: 'Review registrations', href: '/portal-home/registration-requests' },
      ].map((item) => <Link key={item.label} href={item.href} className={`${panel} flex items-center justify-between gap-3 p-4 text-sm font-semibold hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500`}>{item.label}<ArrowRight size={16} className="text-blue-600" aria-hidden="true" /></Link>)}
    </nav>
  </div>;
}
