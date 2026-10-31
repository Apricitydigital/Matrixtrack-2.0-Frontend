import type { City, Zone, Ward, Area, Beat, User, OperationalReport, IecCleanlinessIssue, AttendanceRecord, PlantLog, AuditLogEvent, ActiveSession, Target, Capability, OperationalModuleId, ProductId, RoleType } from '../types';
import { api, writeApi, clearToken, setToken, getToken, clearReadCache,setApiCityContext } from './api';
import { WorkspaceLoader, type Dataset } from './workspace';
import { ROLE_CAPABILITIES } from './access';
import { mapCity, mapUser, mapIssue, mapReport, MODULE_KEYS, rolesOf } from './adapters';
import { reportAudit } from './reportAudit';

export interface AppStoreData {
  schemaVersion: string; cities: City[]; zones: Zone[]; wards: Ward[]; areas: Area[];
  beats: Beat[]; users: User[]; reports: OperationalReport[]; iecIssues: IecCleanlinessIssue[];
  attendance: AttendanceRecord[]; plantLogs: PlantLog[]; auditLogs: AuditLogEvent[];
  activeSessions: ActiveSession[]; targets: Target[]; lastUpdated: string;
}
const emptyData = (): AppStoreData => ({ schemaVersion: 'live-1', cities: [], zones: [], wards: [], areas: [], beats: [], users: [], reports: [], iecIssues: [], attendance: [], plantLogs: [], auditLogs: [], activeSessions: [], targets: [], lastUpdated: '' });
const dashboardRoles: RoleType[] = ['HMS_SUPER_ADMIN', 'COMMISSIONER', 'CITY_ADMIN', 'ULB_OFFICER'];

class MatrixStore {
  private data = emptyData();
  private listeners = new Set<() => void>();
  private generation = 0;
  private rawCities = new Map<string, any>();
  private profile: any = null;
  public currentUser: User | null = null;
  public loading = false;
  public error = '';
  public warnings: string[] = [];
  public selectedCityId = 'all';
  public cleanlinessSummary: any = null;
  private mutationPending = false;
  public loadRevision = 0;
  private workspace = new WorkspaceLoader(() => {
    this.warnings = this.workspace.warnings; this.cleanlinessSummary = this.workspace.summary; this.notify();
  });

  public subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private notify() { this.listeners.forEach(fn => fn()); }
  public getData() { return this.data; }
  public getCities() { return this.data.cities.filter(c => !c.isDeleted); }
  public getAllCitiesWithTrash() { return this.data.cities; }
  public getCityById(id: string) { return this.data.cities.find(c => c.id === id); }
  public getCityModules(id:string):{id:string;key:string;enabled:boolean}[]{return (this.rawCities.get(id)?.modules||[]).map((m:any)=>({id:m.id||m.moduleId,key:m.key||m.name,enabled:m.enabled!==false}));}
  public getZones(cityId?: string) { return this.data.zones.filter(z => !cityId || cityId === 'all' || z.cityId === cityId); }
  public getWards(cityId?: string, zoneId?: string) { return this.data.wards.filter(w => (!cityId || cityId === 'all' || w.cityId === cityId) && (!zoneId || zoneId === 'all' || w.zoneId === zoneId)); }
  public getBeats(cityId?: string, wardId?: string) { return this.data.beats.filter(b => (!cityId || cityId === 'all' || b.cityId === cityId) && (!wardId || wardId === 'all' || b.wardId === wardId)); }
  public getUsers(cityId?: string) { return this.data.users.filter(u => !u.isDeleted && (!cityId || cityId === 'all' || u.cityId === cityId)); }
  public getAllUsersWithTrash() { return this.data.users; }
  public getReports(cityId?: string) { return this.data.reports.filter(r => !cityId || cityId === 'all' || r.cityId === cityId); }
  public getReportById(id: string) { return this.data.reports.find(r => r.id === id); }
  public getIecIssues(cityId?: string) { return this.data.iecIssues.filter(i => !cityId || cityId === 'all' || i.cityId === cityId); }
  public getAttendance(cityId?: string) { return this.data.attendance.filter(a => !cityId || cityId === 'all' || a.cityId === cityId); }
  public getPlantLogs(cityId?: string) { return this.data.plantLogs.filter(p => !cityId || cityId === 'all' || p.cityId === cityId); }
  public getAuditLogs(cityId?: string) { return this.data.auditLogs.filter(a => !cityId || cityId === 'all' || a.cityId === cityId); }
  public getActiveSessions() { return this.data.activeSessions; }
  public getTargets(cityId?: string) { return this.data.targets.filter(t => !cityId || cityId === 'all' || t.cityId === cityId); }
  public getAvailableRoles(): RoleType[] { return dashboardRoles.filter(role => rolesOf(this.profile || {}).includes(role)); }

  public async login(identifier: string, password: string) {
    const response = await writeApi('/auth/login', 'POST', { identifier, password });
    if (!response.token) throw new Error('Backend did not return an access token.');
    setToken(response.token);
    try { await this.initialize(); } catch (error) { clearToken(); this.currentUser = null; throw error; }
  }

  public async initialize() {
    if (!getToken()) return;
    this.loading = true; this.error = ''; this.notify();
    try {
      const response = await api('/auth/me');
      this.profile = response.user;
      const role = this.getAvailableRoles()[0];
      if (!role) throw new Error('This account does not have a Command Center role. Use a Super Admin, Commissioner, City Admin or ULB Officer account.');
      this.currentUser = { ...mapUser(response.user), role };
      this.selectedCityId = role === 'HMS_SUPER_ADMIN' ? 'all' : this.currentUser.cityId || '';
      await this.refresh(response.user);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to load your session.';
      this.loading = false; this.notify(); throw error;
    }
  }

  public logout() {
    sessionStorage.removeItem('matrixtrack_briefing_seen');sessionStorage.removeItem('matrixtrack_ulb_briefing_seen');
    clearToken(); this.generation++; this.workspace.cancel(); this.profile = null; this.currentUser = null;
    this.data = emptyData(); this.cleanlinessSummary = null; this.rawCities.clear(); this.loading = false; this.error = ''; this.warnings = []; this.notify();
  }

  public async selectCity(id: string) {
    if (this.currentUser?.role !== 'HMS_SUPER_ADMIN' && id !== this.currentUser?.cityId) throw new Error('This account is restricted to its assigned city.');
    if(id!=='all'&&!this.getCityById(id))throw new Error('Choose an authorized city.');
    this.selectedCityId = id;setApiCityContext(this.currentUser?.role==='HMS_SUPER_ADMIN'&&id!=='all'?id:undefined); await this.refresh();
  }

  public async refresh(authenticatedProfile?: any) {
    if (!this.currentUser) return;
    clearReadCache();
    const generation = ++this.generation;
    this.workspace.cancel();
    const user = this.currentUser;
    const selectedCityId = this.selectedCityId;
    this.loading = true; this.error = ''; this.warnings = []; this.notify();
    try {
      let rawCities: any[];
      if (user.role === 'HMS_SUPER_ADMIN') rawCities = (await api('/hms/cities')).cities;
      else {
        // /city/modules excludes ULB_OFFICER. Its auth profile already returns
        // only assigned modules that are enabled in the active city.
        const [response, moduleResponse] = await Promise.all([
          api('/city/info'),
          user.role === 'ULB_OFFICER'
            ? authenticatedProfile ? Promise.resolve({user:authenticatedProfile}) : api('/auth/me')
            : api('/city/modules')
        ]);
        const modules = user.role === 'ULB_OFFICER'
          ? (moduleResponse.user?.modules || []).filter((m:any)=>m.enabled!==false&&(!m.cityId||m.cityId===user.cityId))
          : moduleResponse;
        rawCities = [{ ...response.city, stateName: this.profile.stateName, districtName: this.profile.districtName, divisionName: this.profile.divisionName, modules }];
      }
      if (generation !== this.generation) return;
      const next = emptyData(); next.cities = rawCities.map(mapCity); next.users = [user];
      next.lastUpdated = new Date().toISOString();
      this.data = next; this.rawCities = new Map(rawCities.map(c => [c.id, c]));
      this.cleanlinessSummary = null;
      const scopeId = user.role === 'HMS_SUPER_ADMIN' ? selectedCityId === 'all' ? undefined : selectedCityId : user.cityId;
      this.workspace.configure(next, user, scopeId); this.loadRevision++;
    } catch (error) {
      if (generation === this.generation) this.error = error instanceof Error ? error.message : 'Unable to load backend data.';
    } finally { if (generation === this.generation) { this.loading = false; this.notify(); } }
  }

  public ensurePage(pageId: string) { return this.workspace.ensurePage(pageId); }
  public async refreshCityCatalog(){
    if(this.currentUser?.role!=='HMS_SUPER_ADMIN')throw new Error('Super Admin access required.');
    const generation=this.generation,result=await api('/hms/cities');
    if(generation!==this.generation)return;
    if(!Array.isArray(result.cities))throw new Error('City directory could not be refreshed.');
    this.rawCities=new Map(result.cities.map((c:any)=>[c.id,c]));this.data.cities=result.cities.map(mapCity);this.notify();
  }
  public async refreshCollections(keys:Dataset[]){await Promise.all([...new Set(keys)].map(key=>this.workspace.retry(key)));}
  public async refreshPersonnel(){
    // Retain loaded rows and open import results while refreshing the two directories.
    await Promise.all([this.workspace.retry('users'),this.workspace.retry('registration')]);
  }
  public async loadOperationalReport(module: OperationalModuleId, backendId: string, labels?: {name?:string;zoneId?:string;wardId?:string},loadedRecord?:any) {
    if(!this.currentUser)throw new Error('Please sign in again.');
    const generation=this.generation,cityId=this.currentUser.role==='HMS_SUPER_ADMIN'?this.selectedCityId:this.currentUser.cityId;
    if(!cityId || cityId==='all')throw new Error('Select a city first.');
    let response:any;
    // Dashboard records already came from the city-scoped, paginated inspection
    // API. Reuse the exact row: several module endpoints ignore recordId.
    if(loadedRecord){if(loadedRecord.id!==backendId)throw new Error('Report identifier does not match the selected report.');response={data:[loadedRecord]};}
    else try{response=await api(`/modules/${MODULE_KEYS[module]}/records?${new URLSearchParams({recordId:backendId,limit:'1',cityId})}`);}catch(error){if(generation!==this.generation)throw new Error('Your workspace changed. Please try again.');throw error;}
    if(generation!==this.generation)throw new Error('Your workspace changed. Please try again.');
    const raw=response.data?.find((r:any)=>r.id===backendId);
    if(!raw)throw new Error('This report is unavailable.');
    if(raw.cityId && raw.cityId!==cityId)throw new Error('This report is outside your city.');
    const report=mapReport(raw,module,cityId,[]);
    if(labels?.name)report.assetName=labels.name;
    if(!report.zoneId)report.zoneId=labels?.zoneId || '';
    if(!report.wardId)report.wardId=labels?.wardId || '';
    this.data.reports=[...this.data.reports.filter(r=>r.id!==report.id),report];this.notify();return report.id;
  }
  public getCollection(key: Dataset) { return this.workspace.state(key); }
  public loadCollection(key: Dataset) { return this.workspace.ensure(key); }
  public retryCollection(key: Dataset) { return this.workspace.retry(key); }
  public loadMore(key: Dataset) { return this.workspace.more(key); }
  public getDateRange() { return { from: this.workspace.from, to: this.workspace.to }; }
  public async setDateRange(from: string, to: string) {
    const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
    if (!valid(from) || !valid(to) || from > to) throw new Error('Choose a valid start and end date.');
    if (from === this.workspace.from && to === this.workspace.to) return;
    if(this.currentUser?.role==='CITY_ADMIN'){clearReadCache();this.workspace.changePeriod(from,to);this.loadRevision++;this.notify();return;}
    this.workspace.from = from; this.workspace.to = to; await this.refresh();
  }

  private cityScope(cityId?: string) {
    if (!cityId || cityId !== this.currentUser?.cityId) throw new Error('This action uses the city in your login session. Sign in with an administrator of this city.');
  }
  private async mutate(path: string, method: string, body?: unknown) {
    if (this.mutationPending) throw new Error('An update is already in progress. Please wait.');
    this.mutationPending = true; this.loading = true; this.notify();
    try { const response = await writeApi(path, method, body); if(this.currentUser?.role==='CITY_ADMIN'&&/^\/city\/geo(?:\/|$)/.test(path))await this.refreshCollections(['geography']);else await this.refresh();return response; }
    finally { this.mutationPending = false; this.loading = false; this.notify(); }
  }
  public hasCapability(user: User, capability: Capability, targetCityId?: string) {
    if (!this.currentUser || user.id !== this.currentUser.id || user.role !== this.currentUser.role) return false;
    if (user.role !== 'HMS_SUPER_ADMIN' && targetCityId && targetCityId !== this.currentUser.cityId) return false;
    return Boolean(ROLE_CAPABILITIES[user.role as RoleType]?.includes(capability));
  }
  public async updateCity(id: string, updates: Partial<City>, _actor: User) { return this.mutate(`/hms/cities/${id}`, 'PATCH', { name: updates.name, code: updates.cityCode, ulbCode: updates.ulbCode, enabled: updates.status ? updates.status === 'active' : undefined }); }
  public async toggleCityStatus(id: string, actor: User) { return this.updateCity(id, { status: this.getCityById(id)?.status === 'active' ? 'inactive' : 'active' }, actor); }
  public async toggleCityModule(id: string, module: OperationalModuleId, _actor: User) {
    const raw = this.rawCities.get(id)?.modules.find((m: any) => m.name === MODULE_KEYS[module]);
    if (!raw) throw new Error('Module is missing from the backend city configuration.');
    return this.mutate(`/hms/cities/${id}/modules/${raw.id}`, 'PATCH', { enabled: !raw.enabled });
  }
  public async toggleCityProduct(id: string, product: ProductId, _actor: User) {
    const patterns: Partial<Record<ProductId, RegExp>> = { swachh_assessment: /SWACHH/, workforce_monitoring: /WORKFORCE|ATTEND/, plant_processing: /PROCESSING|MRF/ };
    const raw = patterns[product] && this.rawCities.get(id)?.modules.find((m: any) => patterns[product]!.test(m.name));
    if (!raw) throw new Error('This product is not exposed in the backend module configuration. Manage it in the existing MatrixTrack portal.');
    return this.mutate(`/hms/cities/${id}/modules/${raw.id}`, 'PATCH', { enabled: !raw.enabled });
  }
  public async softDeleteCity(id: string, _reason: string, _actor: User) { return this.mutate('/audit-logs/trash/soft-delete', 'POST', { id, type: 'City' }); }
  public async restoreCity(id: string, _actor: User) { return this.mutate('/audit-logs/trash/restore', 'POST', { id, type: 'City' }); }
  public async softDeleteUser(id: string, _reason: string, _actor: User) { return this.mutate('/audit-logs/trash/soft-delete', 'POST', { id, type: 'User' }); }
  public async restoreUser(id: string, _actor: User) { return this.mutate('/audit-logs/trash/restore', 'POST', { id, type: 'User' }); }
  public async revokeSession(id: string, _actor: User) { return this.mutate(`/audit-logs/sessions/${id}/revoke`, 'POST'); }
  public async decideUserRegistration(id: string, decision: 'approved' | 'rejected' | 'needs_correction', remarks: string, _actor: User) {
    if (decision === 'needs_correction') throw new Error('Backend supports approval or rejection only. Reject with the correction instructions in the reason.');
    return this.mutate(`/city/registration-requests/${id}/${decision === 'approved' ? 'approve' : 'reject'}`, 'POST', decision === 'approved' ? {} : { reason: remarks });
  }
  public async createZone(data: Partial<Zone>, _actor: User) { this.cityScope(data.cityId); if(!Number.isSafeInteger(data.zoneNumber)||data.zoneNumber!<1||this.data.zones.some(z=>z.cityId===data.cityId&&z.zoneNumber===data.zoneNumber))throw new Error('Enter a positive Zone number not already used in this city.'); if(!this.currentUser||!this.hasCapability(this.currentUser,'manageGeography',data.cityId))throw new Error('Geography management access is required.'); if(!data.name?.trim())throw new Error('Enter a name.'); return this.mutate('/city/geo', 'POST', { name: data.zoneNumber ? `Zone ${data.zoneNumber}` : data.name?.trim(), displayName: data.name?.trim(), level: 'ZONE' }); }
  public async createWard(data: Partial<Ward>, _actor: User) { this.cityScope(data.cityId); if(!this.currentUser||!this.hasCapability(this.currentUser,'manageGeography',data.cityId))throw new Error('Geography management access is required.'); if(!data.name?.trim()||!this.data.zones.some(z=>z.id===data.zoneId&&z.cityId===data.cityId))throw new Error('Choose a Zone belonging to this city and enter a Ward name.'); if(!Number.isSafeInteger(data.wardNumber)||data.wardNumber!<1||this.data.wards.some(w=>w.cityId===data.cityId&&w.wardNumber===data.wardNumber))throw new Error('Enter a positive Ward number not already used in this city.'); return this.mutate('/city/geo', 'POST', { name: data.wardNumber ? `Ward ${data.wardNumber}` : data.name?.trim(), displayName: data.name?.trim(), level: 'WARD', parentId: data.zoneId }); }
  public async createBeat(data: Partial<Beat>, _actor: User) {
    this.cityScope(data.cityId);
    const area = this.data.areas.find(a => a.wardId === data.wardId && (!data.areaId || a.id === data.areaId));
    if (!area) throw new Error('Create an Area under this Ward from Areas & Beats before adding a Beat.');
    if (data.assignedDarogaId) throw new Error('Create the beat first, then assign its Daroga using the assignment action.');
    const form = new FormData();
    for (const [key, value] of Object.entries({ zoneId: data.zoneId, wardId: data.wardId, areaId: area.id, beatName: data.name })) form.set(key, value || '');
    await api('/city/areas', { method: 'POST', body: form }); await this.refresh();
  }
  public async updateBeat(id: string, updates: Partial<Beat>, _actor: User) {
    this.cityScope(this.data.beats.find(b => b.id === id)?.cityId);
    return this.mutate(`/city/areas/${id}/assign`, 'POST', { userId: updates.assignedDarogaId || null, targetRole: 'SUPERVISOR' });
  }
  public async bulkImportBeats(_rows: Partial<Beat>[], _actor: User): Promise<number> { throw new Error('Use the KML / KMZ import in Areas & Beats to preview and import Beat geometry.'); }
  public async uploadAttendance(_records: Partial<AttendanceRecord>[], _actor: User) { throw new Error('Use the backend attendance file upload; the demo CSV format is not compatible.'); }
  public async uploadFile(file: File, kind: 'attendance' | 'plantLogs', cityId: string) {
    if(!this.currentUser||!this.hasCapability(this.currentUser,kind==='attendance'?'uploadAttendance':'managePlants',cityId))throw new Error('Your account cannot upload this file for this city.');
    const form = new FormData(); form.set('file', file);
    if (kind === 'attendance') form.set('cityId', cityId); else this.cityScope(cityId);
    const result = await api(kind === 'attendance' ? '/city/attendance/upload' : '/modules/processing-plant/upload', { method: 'POST', body: form });
    await this.refresh(); return result;
  }
  public async escalateOperationalReport(id: string, reason: string, assignedToId: string, _actor: User) {
    const report = this.getReportById(id);
    if (!report) throw new Error('Report not found.');
    if(!this.currentUser || !this.hasCapability(this.currentUser,'escalateOperationalReport',report.cityId))throw new Error('This account cannot request corrective action.');
    if(!['approved','rejected'].includes(report.status))throw new Error('Action Required is available after a Sanitary Inspector decision.');
    if(!reason.trim())throw new Error('Enter the reason for corrective action.');
    if (report.moduleId === 'litter_bins') {
      if(report.backendType==='CITIZEN_REPORT')return this.mutate(`/modules/twinbin/reports/${report.backendId}/action-required`,'POST',{ulbRemark:reason,remarks:reason});
      if (report.backendType !== 'VISIT_REPORT') throw new Error('This litter-bin report type cannot be escalated.');
      return this.mutate(`/modules/twinbin/visits/${report.backendId}/action-required`, 'POST', { qcRemark: reason });
    }
    return this.mutate(`/modules/${MODULE_KEYS[report.moduleId]}/records/${report.backendId}/status`, 'PATCH', { status: 'ACTION_REQUIRED', remarks: reason,...(assignedToId?{actionOfficerId:assignedToId}:{}) });
  }
  public async generateOperationalAi(id:string) {
    const report=this.getReportById(id),user=this.currentUser;
    if(!report||!user||user.role!=='ULB_OFFICER'||user.cityId!==report.cityId)throw new Error('ULB Officer access is required to generate this recommendation.');
    if(!['approved','rejected'].includes(report.status)&&!['APPROVED','REJECTED'].includes(report.qcDecision || ''))throw new Error('ULB AI is available after the Sanitary Inspector decision.');
    if(!report.backendId)throw new Error('Report identifier is missing.');
    const path=report.moduleId==='toilets'?`/modules/toilet/inspections/${report.backendId}/action-ai`:report.moduleId==='litter_bins'?`/modules/twinbin/reports/${report.backendId}/action-ai`:`/modules/${MODULE_KEYS[report.moduleId]}/records/${report.backendId}/action-ai`;
    if(report.moduleId==='litter_bins'&&report.backendType!=='CITIZEN_REPORT')throw new Error('ULB AI is available for daily Litter Bin reports.');
    const generation=this.generation,response=await writeApi(path,'POST',{});
    if(generation!==this.generation)throw new Error('Your workspace changed. Please open the report again.');
    const result=response.actionAiResult || response.record?.actionAiResult || response.report?.actionAiResult;
    if(!result)throw new Error('No ULB recommendation was returned.');
    const ai=reportAudit({actionAiResult:result,actionAiAt:response.actionAiAt || response.record?.actionAiAt}).aiReviews || [];
    report.aiReviews=[...(report.aiReviews || []).filter(r=>r.stage!=='ULB Officer'),...ai];this.notify();return ai;
  }
  public async markReportActionTaken(_id: string, _remarks: string, _actor: User) { throw new Error('Corrective work must be submitted by the assigned Action Officer with the required photo evidence in the existing portal/app.'); }
  public async loadIssue(id: string) {
    const role = this.currentUser?.role;
    const prefix = role === 'ULB_OFFICER' ? 'ulb' : role === 'COMMISSIONER' ? 'commissioner/issues' : 'admin/issues';
    let response: any;
    try { response = await api(`/cleanliness-issues/${prefix}/${encodeURIComponent(id)}`); }
    catch (error) {
      if (role !== 'ULB_OFFICER' || (error as any).status !== 404) throw error;
      response = await api(`/cleanliness-issues/ulb/history/${encodeURIComponent(id)}`);
    }
    const { issue } = response;
    const mapped = mapIssue(issue, this.currentUser!.cityId!);
    const requests = this.data.iecIssues.find(i => i.id === id)?.reopeningRequests || [];
    for (const request of requests) if (!mapped.reopeningRequests.some(r => r.id === request.id)) mapped.reopeningRequests.push(request);
    this.data.iecIssues = this.data.iecIssues.map(i => i.id === id ? mapped : i); this.notify(); return mapped;
  }
  public async decideIecIssue(id: string, decision: 'approved_closed' | 'rejected' | 'action_required', remarks: string, _actor: User) {
    const issue = await this.loadIssue(id);
    if (!issue.inspectionId) throw new Error('No inspection is awaiting ULB review.');
    return this.mutate(`/cleanliness-issues/${id}/ulb/review`, 'POST', { inspectionId: issue.inspectionId, decision: { approved_closed: 'APPROVE', rejected: 'REJECT', action_required: 'ACTION_REQUIRED' }[decision], remarks });
  }
  public async decideReopeningRequest(_issueId: string, requestId: string, decision: 'approved' | 'rejected', remarks: string, _actor: User) { return this.mutate(`/cleanliness-issues/ulb/reopen/${requestId}/decision`, 'POST', { decision: decision === 'approved' ? 'APPROVE' : 'REJECT', remarks }); }
  public async onboardCity(data: Partial<City>, admin: Partial<User> & { password?: string }, _actor: User) {
    if(this.currentUser?.role!=='HMS_SUPER_ADMIN'||_actor.id!==this.currentUser.id)throw new Error('Super Admin access is required to onboard cities.');
    if (!admin.password || admin.password.length < 6) throw new Error('Administrator password must have at least 6 characters.');
    const normalize = (s: string) => s.trim().toLowerCase();
    const match = (rows: any[], value: string, label: string) => { const found = rows.find(r => normalize(r.name) === normalize(value)); if (!found) throw new Error(`Enter an existing ${label} name from the backend location master. "${value}" was not found.`); return found; };
    const state = match((await api('/hms/locations/states')).states, data.state!, 'State');
    const district = match((await api(`/hms/locations/districts?stateId=${state.id}`)).districts, data.district!, 'District');
    const cityMaster = match((await api(`/hms/locations/cities?districtId=${district.id}`)).cities, data.name!, 'City');
    const modules = (await api('/hms/modules')).modules;
    const response = await writeApi('/hms/cities', 'POST', { stateId: state.id, divisionId: district.divisionId || undefined, districtId: district.id, cityMasterId: cityMaster.id, code: data.cityCode, ulbCode: data.ulbCode });
    try {
      await writeApi(`/hms/cities/${response.city.id}/admins`, 'POST', { name: admin.name, email: admin.email, password: admin.password });
      const enabled = new Set((data.enabledModules || []).map(m => MODULE_KEYS[m]));
      if (data.enabledProducts?.includes('workforce_monitoring')) enabled.add('WORKFORCE_MONITORING');
      if (data.enabledProducts?.includes('swachh_assessment')) enabled.add('SWACHH_RANKING');
      if (data.enabledProducts?.includes('plant_processing')) enabled.add('PROCESSING_PLANT');
      for (const module of modules) await writeApi(`/hms/cities/${response.city.id}/modules/${module.id}`, 'PATCH', { enabled: enabled.has(module.name) });
    }
    catch (error) { await this.refresh(); throw new Error(`City was created, but administrator or module setup failed: ${error instanceof Error ? error.message : error}. Open City Administrators and Product & Module Access to finish setup; do not submit this city again.`); }
    await this.refresh(); return response;
  }
}
export const matrixStore = new MatrixStore();
