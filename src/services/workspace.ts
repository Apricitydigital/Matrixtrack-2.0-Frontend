import type { AppStoreData } from './store';
import type { User, Area } from '../types';
import { api, todayIST } from './api';
import {concurrentReads} from './concurrentReads';
import { mapUser, mapGeography, mapBeat, mapReport, mapIssue, mapAttendance, MODULE_KEYS } from './adapters';

export type Dataset = 'users' | 'geography' | 'reports' | 'attendance' | 'beats' | 'iecIssues' | 'registration' | 'auditLogs' | 'activeSessions' | 'trash';
export interface CollectionState { status: 'idle' | 'loading' | 'ready' | 'error'; loaded: number; total: number; hasMore: boolean; error?: string; }
export const DATASET_LABELS: Record<Dataset, string> = { users: 'Personnel', geography: 'Zones & wards', reports: 'Inspection reports', attendance: 'Attendance', beats: 'Sweeping beats', iecIssues: 'IEC issues', registration: 'Registration requests', auditLogs: 'Audit logs', activeSessions: 'Sessions', trash: 'Trash' };
type Cursor = { dataset: Dataset; path: string; key: string; sizeKey: string; rows: any[]; page: number; total: number; totalPages: number; apply: (rows: any[]) => void };

export function pageDatasets(pageId: string, role?: string): Dataset[] {
  if(role==='HMS_SUPER_ADMIN'&&['sa_dashboard','sa_users','sa_city_admins'].includes(pageId))return [];
  if(role==='CITY_ADMIN'&&pageId.startsWith('mod_'))return pageId==='mod_sweeping'?['geography','users','beats']:['geography'];
  if(pageId==='comm_chat_history')return [];
  if(role==='HMS_SUPER_ADMIN'&&pageId==='ca_dashboard')return ['geography','users'];
  if(pageId==='ca_logs')return [];
  if (pageId === 'ca_dashboard') return ['geography','users','beats','registration'];
  if (['ca_map','ca_iec_oversight'].includes(pageId)) return ['geography'];
  if (pageId === 'ca_user_perf') return ['geography','users'];
  if (['ca_inspections','ca_daily_reports','ca_attention','ca_inspection_perf','ca_exec_summary'].includes(pageId)) return ['geography','reports'];
  if(pageId==='ulb_dashboard')return ['geography'];
  if(['ulb_reports','ulb_pending','ulb_approved','ulb_rejected','ulb_action_req','ulb_action_taken','ulb_inspection_perf'].includes(pageId))return ['geography','reports'];
  if(['ulb_attendance','ca_attendance','ulb_map'].includes(pageId))return ['geography'];
  if(pageId==='ulb_user_perf')return ['geography','users'];
  if (['comm_dashboard','comm_map'].includes(pageId)) return ['geography'];
  if (['comm_plant','comm_iec_oversight'].includes(pageId)) return ['geography'];
  if (pageId === 'comm_attendance') return ['geography'];
  if (pageId === 'comm_zone_ward') return ['geography'];
  if (pageId === 'comm_user_perf') return ['geography','users'];
  if (pageId === 'comm_inspection_perf') return ['geography','reports'];
  if (pageId === 'comm_exec_summary') return ['geography','reports'];
  if (pageId === 'sa_dashboard') return ['users', 'registration'];
  if (['ca_dashboard','ulb_dashboard','comm_dashboard'].includes(pageId)) return ['geography', 'users', 'reports'];
  if (['sa_cross_city','ca_module_dir'].includes(pageId)) return [];
  if (pageId === 'sa_city_admins') return ['users'];
  if (pageId === 'ca_targets') return ['geography'];
  if (pageId === 'mod_sweeping') return ['geography', 'users', 'reports', 'beats'];
  if (pageId === 'sa_audit_logs') return [];
  if (pageId === 'sa_sessions') return ['activeSessions'];
  if (pageId === 'sa_trash_restore') return ['trash'];
  if (pageId === 'ca_registration_mgmt') return ['geography','registration'];
  if (pageId === 'sa_reg_requests') return ['registration'];
  if (['sa_cities_dir', 'sa_city_admins', 'sa_module_matrix', 'sa_access_matrix', 'prod_swachh', 'prod_plant', 'comm_plant', 'comm_iec_oversight'].includes(pageId)) return [];
  if (/ward_ranking|cross_city/.test(pageId)) return ['geography']; // Rankings have their own backend query.
  if (/zones_wards|geo_hierarchy/.test(pageId)) return ['geography', 'users'];
  if (pageId === 'ca_beats' || pageId === 'ca_assignments') return ['geography', 'users', 'beats'];
  if (/attendance/.test(pageId) || pageId === 'prod_workforce') return ['geography', 'users', 'attendance'];
  if (/municipal_users|employees/.test(pageId)) return ['geography','users'];
  if(pageId==='sa_users')return ['users'];
  if (pageId === 'ulb_iec_issues') return ['iecIssues'];
  if (pageId.startsWith('mod_') || /approved|rejected|action_req|action_taken|inspections|_map$|daily_reports/.test(pageId)) return ['geography', 'users', 'reports'];
  return ['geography', 'users', 'reports', 'attendance', 'beats', 'iecIssues'];
}

/** Session-scoped lazy collections. Each request loads at most one server page. */
export class WorkspaceLoader {
  public states: Partial<Record<Dataset, CollectionState>> = {};
  public warnings: string[] = [];
  public summary: any = null;
  public from = todayIST();
  public to = todayIST();
  private data: AppStoreData;
  private user: User;
  private scopeId?: string;
  private generation = 0;
  private controller = new AbortController();
  private jobs = new Map<Dataset, Promise<void>>();
  private cursors = new Map<string, Cursor>();
  private nodes: any[] = [];
  constructor(private changed: () => void) {}

  public cancel() { this.generation++; this.controller.abort(); this.jobs.clear(); }
  public configure(data: AppStoreData, user: User, scopeId?: string) {
    this.cancel(); this.controller = new AbortController(); this.data = data; this.user = user; this.scopeId = scopeId;
    this.states = {}; this.warnings = []; this.cursors.clear(); this.nodes = []; this.summary = null;
  }
  public changePeriod(from:string,to:string){
    this.cancel();this.controller=new AbortController();this.from=from;this.to=to;
    const dated:Dataset[]=['reports','attendance','iecIssues','auditLogs'];
    for(const key of dated)delete this.states[key];
    for(const [key,state] of Object.entries(this.states))if(state.status==='loading')delete this.states[key as Dataset];
    for(const [path,cursor] of this.cursors)if(dated.includes(cursor.dataset))this.cursors.delete(path);
    this.data.reports=[];this.data.attendance=[];this.data.iecIssues=[];this.data.auditLogs=[];this.summary=null;this.updateWarnings();
  }
  public state(key: Dataset): CollectionState { return this.states[key] || { status: 'idle', loaded: 0, total: 0, hasMore: false }; }
  public async ensurePage(pageId: string) { await Promise.all(pageDatasets(pageId,this.user?.role).map(key => this.ensure(key))); }
  public async ensure(key: Dataset): Promise<void> {
    if (!this.data || !this.user) return;
    const existing = this.jobs.get(key); if (existing) return existing;
    if (this.state(key).status !== 'idle') return;
    const generation = this.generation;
    this.states[key] = { ...this.state(key), status: 'loading', error: undefined }; this.changed();
    const job = this.load(key, generation).then(() => {
      if (generation !== this.generation) return;
      this.updateState(key); this.changed();
    }).catch(error => {
      if (generation !== this.generation) return;
      this.states[key] = { ...this.state(key), status: 'error', error: error instanceof Error ? error.message : 'Unable to load data' };
      this.updateWarnings(); this.changed();
    }).finally(() => { if (generation === this.generation) this.jobs.delete(key); });
    this.jobs.set(key, job); return job;
  }
  public async retry(key: Dataset) {
    if (this.jobs.has(key)) return;
    // Keep successful report/module pages. Retry only the failed or unrequested cursor.
    this.states[key] = { ...this.state(key), status: 'idle', error: undefined };
    this.updateWarnings(); await this.ensure(key);
  }
  public async more(key: Dataset) {
    if (this.jobs.has(key) || this.state(key).status === 'loading') return;
    const generation = this.generation;
    this.states[key] = { ...this.state(key), status: 'loading' }; this.changed();
    const job = (async () => {
      for (const cursor of this.cursors.values()) if (cursor.dataset === key && cursor.page < cursor.totalPages) await this.read(cursor, generation);
      if (generation === this.generation) { this.updateState(key); this.changed(); }
    })().catch(error => {
      if (generation === this.generation) { this.states[key] = { ...this.state(key), status: 'error', error: error.message }; this.updateWarnings(); this.changed(); }
    }).finally(() => { if (generation === this.generation) this.jobs.delete(key); });
    this.jobs.set(key, job); return job;
  }
  private async get(path: string, generation: number) {
    if (generation !== this.generation) throw new DOMException('Context changed', 'AbortError');
    const response = await api(path, { signal: this.controller.signal });
    if (generation !== this.generation) throw new DOMException('Context changed', 'AbortError');
    return response;
  }
  private async first(dataset: Dataset, path: string, key: string, apply: Cursor['apply'], generation: number, sizeKey = 'limit') {
    let cursor = this.cursors.get(path);
    if (!cursor) { cursor = { dataset, path, key, apply, sizeKey, rows: [], page: 0, total: 0, totalPages: 1 }; this.cursors.set(path, cursor); }
    if (!cursor.page) await this.read(cursor, generation);
  }
  private async read(cursor: Cursor, generation: number) {
    const page = cursor.page + 1;
    const response = await this.get(`${cursor.path}${cursor.path.includes('?') ? '&' : '?'}page=${page}&${cursor.sizeKey}=100`, generation);
    if (!Array.isArray(response[cursor.key])) throw new Error('Backend returned an unexpected data format.');
    const paging = response.meta || response.pagination || response;
    cursor.rows.push(...response[cursor.key]); cursor.page = page;
    cursor.total = Number(paging.total ?? cursor.rows.length);
    cursor.totalPages = Number(paging.totalPages ?? 1);
    cursor.apply(cursor.rows); this.data.lastUpdated = new Date().toISOString();
    const cursors=[...this.cursors.values()].filter(c=>c.dataset===cursor.dataset);
    if(this.states[cursor.dataset]?.status==='loading'){
      this.states[cursor.dataset]={...this.states[cursor.dataset]!,loaded:cursors.reduce((n,c)=>n+c.rows.length,0),total:cursors.reduce((n,c)=>n+c.total,0),hasMore:cursors.some(c=>c.page<c.totalPages)};
    }
    this.changed();
  }
  private updateState(key: Dataset) {
    const cursors = [...this.cursors.values()].filter(c => c.dataset === key);
    const loaded = cursors.length ? cursors.reduce((n, c) => n + c.rows.length, 0) : this.count(key);
    this.states[key] = { status: 'ready', loaded, total: cursors.length ? cursors.reduce((n, c) => n + c.total, 0) : loaded, hasMore: cursors.some(c => c.page < c.totalPages) };
    this.updateWarnings();
  }
  private count(key: Dataset) {
    if (key === 'geography') return this.data.zones.length + this.data.wards.length;
    if (key === 'registration') return this.data.users.filter(u => u.status === 'pending_approval' || u.status === 'rejected').length;
    if (key === 'trash') return this.data.users.filter(u => u.isDeleted).length + this.data.cities.filter(c => c.isDeleted).length;
    return (this.data[key] || []).length;
  }
  private updateWarnings() { this.warnings = Object.entries(this.states).filter(([, state]) => state.status === 'error').map(([key, state]) => `${DATASET_LABELS[key as Dataset]}: ${state.error}`); }
  private mergeUsers(rows: User[], registration = false) {
    const keep = this.data.users.filter(u => registration ? u.status === 'active' || u.status === 'inactive' || u.isDeleted : u.status !== 'active' && u.status !== 'inactive' || u.isDeleted);
    this.data.users = [...new Map([...keep, ...rows, this.user].map(u => [`${u.id}:${u.cityId || ''}:${u.role}`, u])).values()];
  }
  private async load(key: Dataset, generation: number) {
    const cityId = this.user.cityId;
    const cities = this.data.cities.filter(c => !c.isDeleted && (!this.scopeId || c.id === this.scopeId));
    const range = `from=${this.from}&to=${this.to}`;
    if (key === 'users') {
      const response = await this.get(this.user.role === 'HMS_SUPER_ADMIN'&&!this.scopeId ? '/city/super-admin-overview' : '/city/users', generation);
      this.mergeUsers(response.users.map((u: any) => mapUser(u, cityId))); return;
    }
    if (key === 'registration') {
      const global=this.user.role==='HMS_SUPER_ADMIN'&&!this.scopeId;
      const response = await this.get(global?'/city/super-admin-overview':'/city/registration-requests', generation);
      this.mergeUsers(response.requests.filter((r: any) => r.status !== 'APPROVED').map((r: any) => mapUser({ ...r, role: r.requestedRole },cityId)), true); return;
    }
    if (key === 'geography') {
      // Cross-city geography is loaded only after the user chooses a city.
      if (!this.scopeId && this.user.role === 'HMS_SUPER_ADMIN') return;
      for (const city of cities) {
        const { nodes } = await this.get(`/city/geo?cityId=${encodeURIComponent(city.id)}`, generation);
        this.nodes = [...this.nodes.filter(n=>n.cityId!==city.id),...nodes.map((n:any)=>({...n,cityId:city.id}))];
        this.data.zones=this.data.zones.filter(n=>n.cityId!==city.id);this.data.wards=this.data.wards.filter(n=>n.cityId!==city.id);this.data.areas=this.data.areas.filter(n=>n.cityId!==city.id);
        const geo = mapGeography(nodes, city.id);
        this.data.zones.push(...geo.zones); this.data.wards.push(...geo.wards);
        this.data.areas.push(...nodes.filter((n: any) => n.level === 'AREA').map((n: any) => ({ id: n.id, cityId: city.id, wardId: n.parentId, name: n.name, type: String(n.areaType||'RESIDENTIAL').toLowerCase() as Area['type'] })));
        city.geographyCountsAvailable=true;city.totalZones = geo.zones.length; city.totalWards = geo.wards.length;
      }
      return;
    }
    if (key === 'reports' || key === 'attendance') {
      if (!this.scopeId && this.user.role === 'HMS_SUPER_ADMIN') return;
      await this.ensure('geography'); if (generation !== this.generation) return;
      const tasks: Array<() => Promise<void>> = [];
      for (const city of cities) {
        const query = `cityId=${encodeURIComponent(city.id)}`;
        if (key === 'attendance') tasks.push(() => this.first(key, `/city/attendance/dashboard?${query}&${range}`, 'records', rows => {
          this.data.attendance = [...this.data.attendance.filter(r => r.cityId !== city.id), ...rows.map(r => mapAttendance(r, city.id, this.nodes))];
        }, generation, 'pageSize'));
        else for (const module of city.enabledModules) tasks.push(() => this.first(key, `/modules/${MODULE_KEYS[module]}/records?${query}&tab=${module === 'litter_bins' ? 'DAILY_REPORTS' : 'HISTORY'}&startDate=${encodeURIComponent(this.from + 'T00:00:00+05:30')}&endDate=${encodeURIComponent(this.to + 'T23:59:59.999+05:30')}`, 'data', rows => {
          this.data.reports = [...this.data.reports.filter(r => r.cityId !== city.id || r.moduleId !== module), ...rows.filter(r => r.type !== 'BIN_REGISTRATION').map(r => mapReport(r, module, city.id, this.nodes))];
        }, generation).catch(error => { throw new Error(`${MODULE_KEYS[module]}: ${error.message}`); }));
      }
      const errors: string[] = [];
      // Bounded request concurrency; one slow module cannot discard successful module data.
      const results=await concurrentReads(tasks,4);
      for(const result of results)if(result.status==='rejected')errors.push(result.reason?.message||'Request failed');
      if (errors.length) throw new Error([...new Set(errors)].join('; ')); return;
    }
    if (key === 'beats' || key === 'iecIssues') {
      const cityId=this.scopeId||this.user.cityId;
      if (!cityId || this.scopeId && this.scopeId !== cityId) return;
      if (key === 'beats') { const response = await this.get('/city/areas', generation); this.data.beats = response.beats.map((r: any) => mapBeat(r, cityId)); return; }
      if (this.user.role === 'COMMISSIONER') { this.summary = (await this.get(`/cleanliness-issues/commissioner/summary?${range}`, generation)).kpis; return; }
      if (this.user.role === 'HMS_SUPER_ADMIN') return;
      const ulb = this.user.role === 'ULB_OFFICER';
      const path = ulb ? '/cleanliness-issues/ulb/pending' : `/cleanliness-issues/admin/issues?${range}`;
      if (ulb) {
        const results=await concurrentReads([path,'/cleanliness-issues/ulb/history','/cleanliness-issues/ulb/reopen/pending'].map(url=>()=>this.first(key,url,'items',()=>this.rebuildIssues(cityId),generation,'pageSize')),3);
        const errors=results.flatMap(r=>r.status==='rejected'?[r.reason?.message||'Unable to load issue queue']:[]);
        if(errors.length)throw new Error([...new Set(errors)].join('; '));
      }else await this.first(key,path,'items',()=>this.rebuildIssues(cityId),generation,'pageSize');
      return;
    }
    if (key === 'auditLogs') {
      await this.first(key, `/audit-logs/logs?startDate=${this.from}&endDate=${this.to}${this.scopeId ? `&cityId=${encodeURIComponent(this.scopeId)}` : ''}`, 'data', rows => {
        this.data.auditLogs = rows.map(r => ({ id: r.id, timestamp: r.createdAt, actorId: r.userId || '', actorName: r.userName || '', actorRole: r.userRole || '', cityId: r.cityId, cityName: r.cityName, action: r.action, moduleOrProduct: r.module || '', platform: r.platform === 'mobile_app' ? 'mobile_app' : 'web', ipAddress: r.ipAddress, details: r.description || '', changesBefore: r.oldData, changesAfter: r.newData }));
      }, generation); return;
    }
    if (key === 'activeSessions') {
      const response = await this.get('/audit-logs/sessions', generation);
      this.data.activeSessions = response.data.map((r: any) => ({ id: r.id, userId: r.userId, userName: r.user?.name || '', role: r.user?.role || '', cityId: r.cityId, cityName: this.data.cities.find(c => c.id === r.cityId)?.name, platform: r.deviceType === 'mobile' ? 'mobile_app' : 'web', device: r.deviceType || '', browser: r.browser || '', ipAddress: r.ipAddress || '', startedAt: r.createdAt, lastActiveAt: r.lastActiveAt, status: r.isActive ? 'active' : 'revoked' })); return;
    }
    if (key === 'trash') {
      const response = await this.get('/audit-logs/trash', generation);
      for (const row of response.data) {
        if (row.type === 'City') { const city = this.data.cities.find(c => c.id === row.id); if (city) { city.isDeleted = true; city.deletedAt = row.deletedAt; } }
        if (row.type === 'User') this.data.users.push({ ...mapUser(row), isDeleted: true, deletedAt: row.deletedAt });
      }
    }
  }
  private rebuildIssues(cityId: string) {
    const issues = new Map<string, ReturnType<typeof mapIssue>>();
    for (const cursor of this.cursors.values()) if (cursor.dataset === 'iecIssues') for (const row of cursor.rows) {
      if (cursor.path.includes('/reopen/pending')) {
        let issue = issues.get(row.issueId); if (!issue) { issue = mapIssue({ ...row, id: row.issueId, status: 'CLOSED' }, cityId); issues.set(row.issueId, issue); }
        if (!issue.reopeningRequests.some(r => r.id === row.requestId)) issue.reopeningRequests.push({ id: row.requestId, requestedAt: row.requestedAt, requestedBy: '', reason: row.reason, status: 'pending' });
      } else if (cursor.path.includes('/history')) { if (!issues.has(row.issueId)) issues.set(row.issueId, mapIssue({ ...row, id: row.issueId, status: row.currentStatus }, cityId)); }
      else issues.set(row.id, mapIssue(row, cityId));
    }
    this.data.iecIssues = [...issues.values()];
  }
}
