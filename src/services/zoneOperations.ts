import { useEffect, useState } from 'react';
import type { City, OperationalModuleId } from '../types';
import { api } from './api';
import { matrixStore } from './store';
import { moduleId } from './adapters';
import { loadInspectionCoverage, emptyCoverage, inspectionOutcomes, inspectionActions, type InspectionCoverage } from './inspectionCoverage';
import { ulbReportRegister } from './ulbReportRegister';
import { inspectionMetrics, type InspectionScope } from './inspectionMetrics';
import { cleanlinessStats } from './cleanliness';
import { reportTargetDelivery, targetReadState } from './targetDelivery';
import type { InspectionFigures } from './commissioner';

export type ReadState = 'loading' | 'ready' | 'error';
export interface ZoneOperations {
  key: string;
  data: InspectionCoverage;
  targets: any[];
  attendance: any | null;
  issues: any | null;
  issueLabel: string;
  states: Record<'inspections' | 'targets' | 'attendance' | 'issues', ReadState>;
  errors: Record<string, string>;
}
export const emptyZoneOperations = (key = ''): ZoneOperations => ({ key, data: emptyCoverage(), targets: [], attendance: null, issues: null, issueLabel: 'Open IEC issues',
  states: { inspections: 'loading', targets: 'loading', attendance: 'loading', issues: 'loading' }, errors: {} });

/** All four sources settle independently; a scoring or attendance failure cannot hide inspections. */
export function useZoneOperations(city: City, from: string, to: string, revision: number, zoneId = '', wardId = '') {
  const modules = (city.enabledModules || []).join(','), role = matrixStore.currentUser?.role;
  const key = JSON.stringify([city.id, modules, from, to, revision, zoneId, wardId, role]);
  const [state, setState] = useState<ZoneOperations>(() => emptyZoneOperations());
  useEffect(() => {
    const controller = new AbortController(); setState(emptyZoneOperations(key));
    const update = (topic: keyof ZoneOperations['states'], value: Partial<ZoneOperations>) => {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, ...value, states: { ...previous.states, [topic]: 'ready' } }));
    };
    const fail = (topic: keyof ZoneOperations['states'], reason: unknown) => {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, states: { ...previous.states, [topic]: 'error' }, errors: { ...previous.errors, [topic]: reason instanceof Error ? reason.message : 'Source unavailable.' } }));
    };
    const geo = new URLSearchParams({ from, to, ...(zoneId ? { zoneId } : {}), ...(wardId ? { wardId } : {}) });
    void loadInspectionCoverage({ ...city, enabledModules: city.enabledModules || [] }, from, to, controller.signal, true)
      .then(data => update('inspections', { data: ulbReportRegister(data) })).catch(error => fail('inspections', error));
    const targetQuery = new URLSearchParams({ startDate: new Date(`${from}T00:00:00+05:30`).toISOString(), endDate: new Date(`${to}T23:59:59.999+05:30`).toISOString(), tzOffset: '-330' });
    void api(`/city/users/daroga-performance?${targetQuery}`, { signal: controller.signal }).then(response => {
      if (!response.users || typeof response.users !== 'object' || Array.isArray(response.users) || Object.keys(response.errors || {}).length) throw Error('Some inspection targets are unavailable.');
      const geography = new Map(matrixStore.getWards(city.id).map(ward => [ward.id, ward.zoneId]));
      update('targets', { targets: Object.values(response.users).flatMap((user: any) => Array.isArray(user.rows) ? user.rows.map(row => ({ ...row, zoneId: geography.get(row.wardId) || row.zoneId })) : []) });
    }).catch(error => fail('targets', error));
    void api(`/city/attendance/dashboard?${geo}&page=1&pageSize=1`, { signal: controller.signal }).then(response => {
      if (typeof response.hasData !== 'boolean') throw Error('Attendance response is incomplete.');
      update('attendance', { attendance: { ...response.summary, hasData: response.hasData, days: response.dailyTrend?.length ?? 0 } });
    }).catch(error => fail('attendance', error));
    // The ULB workflow summary is city-wide; never present it as a zone/ward count.
    if (role === 'ULB_OFFICER') {
      if (zoneId || wardId) update('issues', { issues: null, issueLabel: 'IEC issues (city workflow only)' });
      else void api(`/cleanliness-issues/ulb/summary?${new URLSearchParams({ from, to })}`, { signal: controller.signal }).then(response => {
        if (typeof response.pendingApprovals !== 'number') throw Error('IEC workflow summary is unavailable.');
        update('issues', { issues: { count: response.pendingApprovals }, issueLabel: 'IEC pending approvals' });
      }).catch(error => fail('issues', error));
    } else void api(`/cleanliness-issues/commissioner/summary?${geo}`, { signal: controller.signal }).then(response => {
      if (typeof response.kpis?.openIssues !== 'number') throw Error('IEC issue summary is unavailable.');
      update('issues', { issues: { count: response.kpis.openIssues, ...response.kpis } });
    }).catch(error => fail('issues', error));
    return () => controller.abort();
  }, [key]);
  return state.key === key ? state : emptyZoneOperations(key);
}

/** Use the same ADMIN/DEFAULT target evidence as User Performance, at ward + module scope. */
export function zoneTargetFigures(rows: any[], data: InspectionCoverage, scope: InspectionScope = {}): InspectionFigures | undefined {
  const assets = data.assets.filter(asset => (!scope.zone || asset.zoneId === scope.zone) && (!scope.ward || asset.wardId === scope.ward));
  const wardIds = new Set(assets.map(asset => asset.wardId));
  const selected = rows.filter(row => row.wardId && ['ADMIN', 'DEFAULT'].includes(row.source) && moduleId(row.module) &&
    data.modules.includes(moduleId(row.module)) && (!scope.module || moduleId(row.module) === scope.module) &&
    (!scope.ward || row.wardId === scope.ward) && (!scope.zone || row.zoneId === scope.zone || wardIds.has(row.wardId)) &&
    typeof row.target === 'number' && row.target >= 0 && Number.isFinite(row.target) && typeof row.credit === 'number' && row.credit >= 0 && Number.isFinite(row.credit));
  if (!selected.length || !selected.some(row => row.source === 'ADMIN')) return undefined;
  return { target: selected.reduce((sum, row) => sum + row.target, 0), completed: selected.reduce((sum, row) => sum + row.credit, 0), targetState: 'configured',
    pending: 0, cleaned: 0, notCleaned: 0, siPending: 0, actionRequired: 0, actionPending: 0, actionTaken: 0 };
}

export function zoneOperationalStats(source: ZoneOperations, scope: InspectionScope = {}) {
  const metrics = inspectionMetrics(source.data, scope, zoneTargetFigures(source.targets, source.data, scope));
  const ready = source.states.inspections === 'ready';
  const target = targetReadState(reportTargetDelivery(metrics.delivery, metrics.achieved), ready && source.states.targets === 'ready');
  const outcomes = inspectionOutcomes(source.data, scope), actions = inspectionActions(source.data, scope);
  const visits = source.data.visits.filter(visit => (!scope.zone || visit.zoneId === scope.zone) && (!scope.ward || visit.wardId === scope.ward) && (!scope.module || visit.module === scope.module));
  const clean = ready && metrics.totalRecords !== null ? cleanlinessStats(visits) : null;
  return { ...metrics, target, clean, ready,
    achieved: ready ? metrics.achieved : null, totalRecords: ready ? metrics.totalRecords : null, drafts: ready ? metrics.drafts : null,
    totalEntities: ready ? metrics.totalEntities : null, uniqueEntities: ready ? metrics.uniqueEntities : null,
    coveragePercent: ready ? metrics.coveragePercent : null,
    outcomes: ready ? outcomes : { total: null, rows: outcomes.rows.map(row => ({ ...row, value: null })) },
    actions: ready ? actions : { totalRequired: null, taken: null, outstanding: null },
    pendingReview: ready ? outcomes.rows.find(row => row.id === 'pending_review')?.value ?? null : null };
}
