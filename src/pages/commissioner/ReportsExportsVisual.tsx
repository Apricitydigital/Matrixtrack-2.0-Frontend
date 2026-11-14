import React, {useEffect, useMemo, useRef, useState} from 'react';
import {AlertTriangle, CalendarRange, CheckCircle2, Download, FileBarChart, FileSpreadsheet, FileText, Images, Layers, LayoutGrid, Loader2, MapPin, Printer, RefreshCw} from 'lucide-react';
import type {City, OperationalReport, Ward, Zone} from '../../types';
import {MultiSelectDropdown} from '../../components/common/MultiSelectDropdown';
import {FilterPopover} from '../../components/common/FilterPopover';
import {Pagination, usePagination} from '../../components/common/Pagination';
import {IntelligenceSummary, IntelligenceSuggestion} from '../../components/reports/IntelligenceSuggestion';
import {PhotoIntegrityWarning} from '../../components/reports/PhotoIntegrityWarning';
import {printReports} from '../../components/reports/ReportDocument';
import {api} from '../../services/api';
import {applyPerformanceTargets, reconcileZoneExport, ulbInspectionSummary, useCityPulse} from '../../services/commissioner';
import {commissionerReportData} from '../../services/commissionerReportData';
import {exportCommissionerAudit} from '../../services/commissionerAuditExport';
import {downloadCsv, generateCsv} from '../../services/csv';
import {loadInspectionCoverage, selectInspectionModules} from '../../services/inspectionCoverage';
import {MODULE_LABELS, ROLE_LABELS} from '../../services/presentation';
import {REPORT_BRAND} from '../../services/reportBrand';
import {cityReportDocument, cityReportModel, zoneReportDocument} from '../../services/reportDocuments';
import {printDocument, type DocContext} from '../../services/reportPdf';
import {matrixStore} from '../../services/store';
import {ulbReportRegister} from '../../services/ulbReportRegister';
import {useInspectionCoverage} from '../../services/useInspectionCoverage';
import {wardInspectionRows} from '../../services/wardInspections';
import {naturalCompare} from '../../services/wardRankingEvidence';

type Tab = 'summary' | 'zones' | 'evidence';
const stamp = () => new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'});

/** Renders a finished report document in an isolated frame and grows to fit its pages. */
function ReportFrame({html, title}:{html:string;title:string}) {
  const ref = useRef<HTMLIFrameElement>(null), [height, setHeight] = useState(900);
  const measure = () => { try { const d = ref.current?.contentDocument; if (d?.documentElement) setHeight(Math.max(400, d.documentElement.scrollHeight + 4)); } catch { /* cross-origin guard */ } };
  useEffect(() => {
    const el = ref.current; if (!el || typeof ResizeObserver === 'undefined') return;
    let last = el.clientWidth;
    const ro = new ResizeObserver(() => { if (el.clientWidth !== last) { last = el.clientWidth; measure(); } });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return <iframe ref={ref} className="rx-frame" title={title} srcDoc={html} sandbox="allow-same-origin" onLoad={measure} style={{height}}/>;
}

export function ReportsExportsVisual({city, zones, wards, reports: _reports}:{city:City;zones:Zone[];wards:Ward[];reports:OperationalReport[]}) {
  const [tab, setTab] = useState<Tab>('summary');
  const [selectedZones, setSelectedZones] = useState<string[]>([]), [selectedWards, setSelectedWards] = useState<string[]>([]), [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [data, setData] = useState<any>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [images, setImages] = useState(true);
  const [exportMessage, setExportMessage] = useState(''), [exporting, setExporting] = useState(false), [peopleError, setPeopleError] = useState('');
  const {from, to} = matrixStore.getDateRange();
  const scopeCity = {...city, enabledModules: city.enabledModules.filter(id => !selectedModules.length || selectedModules.includes(id))};
  const request = useRef<AbortController | null>(null), exportRequest = useRef<AbortController | null>(null);
  const scopeKey = [city.id, from, to, selectedZones.join(','), selectedWards.join(','), selectedModules.join(',')].join('|');
  useEffect(() => { request.current?.abort(); exportRequest.current?.abort(); setData(null); setError(''); setBusy(false); setExporting(false); setExportMessage(''); return () => { request.current?.abort(); exportRequest.current?.abort(); }; }, [scopeKey]);

  const cityZones = useMemo(() => zones.filter(z => z.cityId === city.id).sort((a, b) => naturalCompare(a.name, b.name)), [zones, city.id]);
  const available = wards.filter(w => w.cityId === city.id && selectedZones.includes(w.zoneId)).sort((a, b) => naturalCompare(a.name, b.name));
  const toggle = (ids:string[], id:string) => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];

  /* Same data sources as the classic page, so every number matches it. */
  const rawCoverage = useInspectionCoverage(scopeCity, from, to, matrixStore.loadRevision, true);
  const coverage = useMemo(() => selectInspectionModules(ulbReportRegister(rawCoverage.data), selectedModules), [rawCoverage.data, selectedModules.join(',')]);
  const loadedPulse = useCityPulse(city.id, from, to, selectedZones, selectedWards, matrixStore.loadRevision, ['attendance', 'rankings', 'plants', 'iec', 'performance']);
  const loading = rawCoverage.loading || loadedPulse.pending > 0;

  /* Personnel totals must be complete before officer counts are reported. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await matrixStore.loadCollection('users');
        for (let page = 0; !cancelled && matrixStore.getCollection('users').hasMore && page < 1000; page++) {
          const before = matrixStore.getCollection('users').loaded;
          await matrixStore.loadMore('users');
          if (matrixStore.getCollection('users').status === 'error' || matrixStore.getCollection('users').loaded <= before) break;
        }
        if (!cancelled && matrixStore.getCollection('users').status !== 'ready') setPeopleError('Personnel totals could not be verified.');
      } catch { if (!cancelled) setPeopleError('Personnel totals could not be verified.'); }
    })();
    return () => { cancelled = true; };
  }, [city.id]);
  const people = matrixStore.getCollection('users'), personnelComplete = people.status === 'ready' && !people.hasMore, users = matrixStore.getUsers(city.id);

  const zoneLabel = selectedWards.length ? `${selectedWards.length} ward${selectedWards.length === 1 ? '' : 's'}` : selectedZones.length ? (selectedZones.length === cityZones.length ? 'All zones' : cityZones.filter(z => selectedZones.includes(z.id)).map(z => z.name).join(', ')) : 'All zones and wards';
  const moduleLabel = selectedModules.length ? selectedModules.map(id => MODULE_LABELS[id as keyof typeof MODULE_LABELS] || id).join(', ') : 'All modules';
  const ctx = (generated:string, scope:string, f = from, t = to):DocContext => ({city: city.name, from: f, to: t, generated, scope, role: ROLE_LABELS[matrixStore.currentUser?.role || 'COMMISSIONER'], brand: REPORT_BRAND});

  /* City summary document (rebuilt only when its inputs change, so the preview does not flicker). */
  const summary = useMemo(() => {
    if (loading) return {state: 'loading' as const};
    try {
      const official = ulbInspectionSummary(coverage, zones.filter(z => z.cityId === city.id && (!selectedZones.length || selectedZones.includes(z.id))), selectedWards);
      const pulse = {...loadedPulse, official: official && loadedPulse.performance?.SUPERVISOR ? applyPerformanceTargets(official, loadedPulse.performance.SUPERVISOR, selectedWards, selectedModules) : official};
      const input = {city: scopeCity, from, to, zone: selectedZones.length === 1 ? selectedZones[0] : '', ward: selectedWards.length === 1 ? selectedWards[0] : '', zones, wards, users, selectedZoneIds: selectedZones, selectedWardIds: selectedWards, coverage, pulse};
      const report = commissionerReportData({...input, personnelComplete});
      const model = cityReportModel({report, coverage, pulse, zones: cityZones, zone: input.zone, ward: input.ward, selectedZoneIds: selectedZones, selectedWardIds: selectedWards});
      return {state: 'ready' as const, input, report, model, html: cityReportDocument(model, ctx(stamp(), `${report.scope} · ${moduleLabel}`))};
    } catch (e) { return {state: 'error' as const, message: e instanceof Error ? e.message : 'The summary could not be built.'}; }
  }, [loading, coverage, loadedPulse, scopeKey, personnelComplete, users.length]);

  const zoneDoc = useMemo(() => {
    if (!data) return null;
    try { return {html: zoneReportDocument(data, ctx(stamp(), `${zoneLabel} · ${moduleLabel}`, data.range?.from || from, data.range?.to || to)), zones: (data.zones || []).length}; }
    catch (e) { return {error: e instanceof Error ? e.message : 'The zone report could not be built.'}; }
  }, [data]);

  const generate = async () => {
    const c = new AbortController(); request.current?.abort(); request.current = c; setBusy(true); setError(''); setData(null);
    try {
      const [report, cov] = await Promise.all([
        api(`/city/dashboard/zone-export?${new URLSearchParams({from, to, zoneIds: selectedZones.join(','), ...(selectedWards.length ? {wardIds: selectedWards.join(',')} : {})})}`, {signal: c.signal}),
        loadInspectionCoverage(scopeCity, from, to, c.signal, true),
      ]);
      if (c.signal.aborted) return;
      const q = new URLSearchParams({startDate: new Date(from + 'T00:00:00+05:30').toISOString(), endDate: new Date(to + 'T23:59:59.999+05:30').toISOString(), tzOffset: '-330'});
      let performance;
      try {
        const response = await api(`/city/users/daroga-performance?${q}`, {signal: c.signal});
        performance = Object.fromEntries(Object.entries(response.users || {}).map(([id, user]:[string, any]) => [id, {...user, rows: (user.rows || []).filter((r:any) => !selectedWards.length || selectedWards.includes(r.wardId))}]));
      } catch { if (c.signal.aborted) return; }
      if (!c.signal.aborted) setData({...reconcileZoneExport(report, selectInspectionModules(ulbReportRegister(cov), scopeCity.enabledModules), selectedWards, performance, scopeCity.enabledModules), targetEvidenceAvailable: Boolean(performance)});
    } catch (e) { if (!c.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to prepare report.'); }
    finally { if (!c.signal.aborted) setBusy(false); }
  };

  const downloadExcel = async () => {
    if (summary.state !== 'ready') return;
    const c = new AbortController(); exportRequest.current = c; setExporting(true); setExportMessage('Preparing Excel report…');
    try { await exportCommissionerAudit({...summary.input, personnelComplete: true}, c.signal, setExportMessage); if (!c.signal.aborted) setExportMessage('Excel report downloaded.'); }
    catch (e) { if (!c.signal.aborted) setExportMessage(e instanceof Error ? e.message : 'Export failed.'); }
    finally { if (!c.signal.aborted) setExporting(false); }
  };
  const downloadCsvFile = () => {
    if (summary.state !== 'ready') return;
    const {report} = summary;
    downloadCsv(`commissioner-report-data-${from}-${to}.csv`, generateCsv(['From (IST)', 'To (IST)', 'Scope', 'Section', 'Metric', 'Value', 'Source', 'Definition / availability'], [
      ...report.facts.map(f => [from, to, report.scope, f.section, f.label, f.value ?? 'Not available', f.source, f.note]),
      ...report.modules.flatMap(m => [['Total assets', m.totalEntities], ['Inspection target', m.delivery.target], ['Achieved: inspections completed', m.achieved], ['Coverage %', m.coveragePercent], ['Unique assets inspected', m.uniqueEntities], ['Total inspection records', m.totalRecords], ['Target credits', m.delivery.completed]].map(([label, value]) => [from, to, report.scope, `Service: ${m.label}`, label, value ?? 'Not available', 'Same inspection register and target source as dashboard', '']))]));
  };

  /* Evidence pack (unchanged behaviour). */
  const evidenceKey = JSON.stringify([city.id, from, to]), [evidenceScope, setEvidenceScope] = useState(''), evidenceRequested = evidenceScope === evidenceKey;
  const register = useMemo(() => wardInspectionRows(coverage, city.id, undefined, zones, wards), [coverage, city.id, zones, wards]);
  const selected = register.filter(r => r.cityId === city.id && r.inspectionDate >= from && r.inspectionDate <= to && (!selectedZones.length || selectedZones.includes(r.zoneId)) && (!selectedWards.length || selectedWards.includes(r.wardId)));
  const paging = usePagination(selected, selectedZones.join() + selectedWards.join() + selectedModules.join() + from + to);

  const m = summary.state === 'ready' ? summary.model : null;
  return <section className="rx">
    <header className="rx-hero">
      <div><span className="rx-eyebrow"><FileBarChart size={14}/>MEETING & REVIEW DOCUMENTS</span><h1>Reports & Exports</h1><p>Board-ready summaries and zone reports for {city.name}. The preview below is exactly what the PDF contains.</p></div>
      <div className="rx-hero-stats">
        <div><CalendarRange size={16}/><b>{from === to ? from : `${from} → ${to}`}</b><small>Reporting dates (IST)</small></div>
        <div><MapPin size={16}/><b>{selectedZones.length || cityZones.length}</b><small>{selectedZones.length ? 'zones selected' : 'zones in city'}</small></div>
        <div><Layers size={16}/><b>{selectedModules.length || city.enabledModules.length}</b><small>modules</small></div>
      </div>
    </header>

    <div className="rx-builder">
      <div className="rx-step"><span>1</span><div><strong>Modules</strong><MultiSelectDropdown label="Modules" options={city.enabledModules.map(id => [id, MODULE_LABELS[id]])} selected={selectedModules} onChange={setSelectedModules}/></div></div>
      <div className="rx-step rx-step-wide"><span>2</span><div><strong>Zones <small>leave empty for the whole city</small></strong>
        <div className="rx-chips" role="group" aria-label="Zones">
          <button type="button" data-on={!selectedZones.length} onClick={() => { setSelectedZones([]); setSelectedWards([]); }}>Whole city</button>
          {cityZones.map(z => <button type="button" key={z.id} data-on={selectedZones.includes(z.id)} aria-pressed={selectedZones.includes(z.id)} onClick={() => { setSelectedZones(toggle(selectedZones, z.id)); setSelectedWards([]); }}>{z.name}</button>)}
          {cityZones.length > 1 && <button type="button" className="rx-chip-link" onClick={() => { setSelectedZones(cityZones.map(z => z.id)); setSelectedWards([]); }}>Select all</button>}
        </div>
        {available.length > 0 && <FilterPopover><summary className="rx-wards-toggle">Limit to specific wards{selectedWards.length ? ` (${selectedWards.length})` : ' (optional)'}</summary><div className="export-choice-grid mt-3">{available.map(w => <label key={w.id}><input type="checkbox" checked={selectedWards.includes(w.id)} onChange={() => setSelectedWards(toggle(selectedWards, w.id))}/>{w.name}</label>)}</div></FilterPopover>}
      </div></div>
    </div>

    <nav className="rx-tabs" role="tablist" aria-label="Report type">
      {([['summary', 'City summary', LayoutGrid, 'KPIs, service delivery, trends, ward scores'], ['zones', 'Zone-wise report', FileText, 'Overview + one page per zone'], ['evidence', 'Evidence pack', Images, 'Photos, decisions & timeline']] as const).map(([id, label, Icon, hint]) =>
        <button key={id} role="tab" aria-selected={tab === id} data-on={tab === id} onClick={() => setTab(id)}><Icon size={17}/><span><b>{label}</b><small>{hint}</small></span></button>)}
    </nav>

    {tab === 'summary' && <div className="rx-panel">
      <div className="rx-toolbar">
        <div><strong>Inspection summary report</strong><small>{zoneLabel} · {moduleLabel} · 2 pages, A4 landscape</small></div>
        <div className="rx-actions">
          <button className="rx-primary" disabled={summary.state !== 'ready'} onClick={() => summary.state === 'ready' && printDocument(`${city.name} · Inspection Summary Report`, summary.html)}><Printer size={15}/>Download PDF</button>
          <button disabled={summary.state !== 'ready' || exporting || !personnelComplete} onClick={downloadExcel} title={personnelComplete ? undefined : 'Waiting for the complete personnel directory'}>{exporting ? <Loader2 size={15} className="rx-spin"/> : <FileSpreadsheet size={15}/>}Excel</button>
          <button disabled={summary.state !== 'ready'} onClick={downloadCsvFile}><Download size={15}/>CSV</button>
        </div>
      </div>
      {(exportMessage || peopleError) && <p className="rx-note" role="status">{exportMessage || peopleError}</p>}
      {m && <div className="rx-glance">
        <div><span>Inspections completed</span><b>{m.achieved?.toLocaleString('en-IN') ?? '—'}</b></div>
        <div><span>Target progress</span><b>{m.progress == null ? '—' : `${m.progress.toLocaleString('en-IN', {maximumFractionDigits: 1})}%`}</b></div>
        <div><span>Asset coverage</span><b>{m.coverage == null ? '—' : `${m.coverage.toLocaleString('en-IN', {maximumFractionDigits: 1})}%`}</b></div>
        <div><span>Fields with source data</span><b>{m.available} / {m.totalFacts}</b></div>
      </div>}
      {summary.state === 'loading' && <div className="rx-skeleton"><Loader2 size={20} className="rx-spin"/>Loading the complete inspection register…</div>}
      {summary.state === 'error' && <div className="rx-error"><AlertTriangle size={18}/>{summary.message}</div>}
      {summary.state === 'ready' && <ReportFrame html={summary.html} title="Inspection summary preview"/>}
      <IntelligenceSummary reports={selected} loading={rawCoverage.loading} unavailable={coverage.failedModules.length > 0}/>
    </div>}

    {tab === 'zones' && <div className="rx-panel">
      <div className="rx-toolbar">
        <div><strong>Zone-wise inspection report</strong><small>{selectedZones.length ? `${zoneLabel} · ${moduleLabel}` : 'Choose at least one zone above'}{zoneDoc && 'zones' in zoneDoc ? ` · ${zoneDoc.zones + 1} pages, A4 landscape` : ''}</small></div>
        <div className="rx-actions">
          <button disabled={busy || !selectedZones.length} onClick={generate}>{busy ? <Loader2 size={15} className="rx-spin"/> : data ? <RefreshCw size={15}/> : <FileBarChart size={15}/>}{busy ? 'Preparing…' : data ? 'Regenerate' : 'Generate report'}</button>
          <button className="rx-primary" disabled={!zoneDoc || !('html' in zoneDoc)} onClick={() => zoneDoc && 'html' in zoneDoc && printDocument(`${city.name} · Zone-wise Inspection Report`, zoneDoc.html!)}><Printer size={15}/>Download PDF</button>
        </div>
      </div>
      {error && <div className="rx-error" role="alert"><AlertTriangle size={18}/>{error}</div>}
      {!selectedZones.length && <div className="rx-empty"><MapPin size={26}/><h3>Pick the zones to report on</h3><p>Use “Select all” for a city-wide zone report. You get an overview page, then one page per zone with targets, outcomes and ward scores.</p><button onClick={() => { setSelectedZones(cityZones.map(z => z.id)); setSelectedWards([]); }}>Select all zones</button></div>}
      {selectedZones.length > 0 && !data && !busy && !error && <div className="rx-empty"><FileBarChart size={26}/><h3>Ready to generate</h3><p>{zoneLabel} · {moduleLabel} · {from === to ? from : `${from} to ${to}`}</p><button onClick={generate}>Generate report</button></div>}
      {busy && <div className="rx-skeleton"><Loader2 size={20} className="rx-spin"/>Collecting targets, outcomes and ward scores…</div>}
      {zoneDoc && 'error' in zoneDoc && <div className="rx-error"><AlertTriangle size={18}/>{zoneDoc.error}</div>}
      {zoneDoc && 'html' in zoneDoc && <ReportFrame html={zoneDoc.html!} title="Zone report preview"/>}
    </div>}

    {tab === 'evidence' && <div className="rx-panel">
      <div className="rx-toolbar">
        <div><strong>Inspection evidence pack</strong><small>Images, role decisions, AI suggestions and timeline for {zoneLabel}</small></div>
        <div className="rx-actions">
          {!evidenceRequested && <button onClick={() => setEvidenceScope(evidenceKey)}><Images size={15}/>Load inspection evidence</button>}
          <label className="rx-check"><input type="checkbox" checked={images} onChange={e => setImages(e.target.checked)}/>Include photographs</label>
          <button className="rx-primary" disabled={!evidenceRequested || rawCoverage.loading || coverage.failedModules.length > 0 || !selected.length} onClick={() => printReports(`${city.name} · Inspection Evidence Pack`, selected, images)}><Printer size={15}/>Print / Save PDF</button>
        </div>
      </div>
      {!evidenceRequested && <div className="rx-empty"><Images size={26}/><h3>Load the evidence register</h3><p>Evidence packs include every inspection photo, so they are loaded on request.</p></div>}
      {evidenceRequested && rawCoverage.loading && <div className="rx-skeleton"><Loader2 size={20} className="rx-spin"/>Loading the complete evidence register…</div>}
      {coverage.errors.length > 0 && <div className="rx-error"><AlertTriangle size={18}/>Some evidence records are unavailable. A complete evidence pack cannot be verified.</div>}
      {evidenceRequested && !rawCoverage.loading && <>
        <div className="rx-glance"><div><span>Reports in pack</span><b>{selected.length.toLocaleString('en-IN')}</b></div><div><span>Photographs</span><b>{selected.reduce((s, r) => s + r.photos.length, 0).toLocaleString('en-IN')}</b></div><div><span>Decisions recorded</span><b>{selected.reduce((s, r) => s + (r.decisions?.length || 0), 0).toLocaleString('en-IN')}</b></div><div><span>Status</span><b className="rx-ok"><CheckCircle2 size={16}/>{selected.length ? 'Ready' : 'Nothing to print'}</b></div></div>
        <div className="overflow-x-auto"><table className="w-full text-xs text-left rx-table"><thead><tr><th>Location</th><th>Module</th><th>Images</th><th>Decisions</th><th>Timeline</th></tr></thead><tbody>{paging.rows.map(r => <tr key={r.id}><td>{r.assetName}<PhotoIntegrityWarning confidence={r.photoRecaptureConfidence}/><IntelligenceSuggestion report={r} compact/></td><td>{MODULE_LABELS[r.moduleId]}</td><td>{r.photos.length}</td><td>{r.decisions?.length || 0}</td><td>{r.timeline.length}</td></tr>)}</tbody></table></div>
        <Pagination {...paging}/>
      </>}
    </div>}
  </section>;
}
