import React from 'react';
import { Mail, Phone, UserRound } from 'lucide-react';
import type { OperationalReport } from '../../types';
import { matrixStore } from '../../services/store';
import { reportContacts, reportStage, telephone } from '../../services/reportContacts';
import { ROLE_LABELS } from '../../services/presentation';
import { formatDate } from './ReportDocument';
export function ReportContacts({report,compact=false}:{report:OperationalReport;compact?:boolean}) {
  const contacts=reportContacts(report,matrixStore.getUsers()),stage=reportStage(report);
  if(compact)return <div className="report-team-compact">{['SUPERVISOR','QC'].map(role=>{const people=contacts.filter(c=>c.role===role);return <div key={role}><small>{ROLE_LABELS[role]}</small>{people.length?people.slice(0,2).map((c,i)=><span key={c.id || `${c.name}-${i}`}><strong>{c.name}</strong>{c.phone?<a href={telephone(c.phone)}>{c.phone}</a>:<em>Contact not supplied</em>}</span>):<span className="contact-missing">Assignment not supplied</span>}{people.length>2&&<small>+{people.length-2} ward / module contacts</small>}</div>;})}</div>;
  return <section className="report-contact-panel"><header><div><span>WORKFLOW & CONTACTS</span><h3>{stage.label}</h3><p>Last recorded stage activity: {formatDate(stage.since)} IST</p></div><UserRound size={21}/></header><div className="report-contact-grid">{['SUPERVISOR','QC','ULB_OFFICER','ACTION_OFFICER'].map(role=>{const people=contacts.filter(c=>c.role===role);return <article key={role} data-current={stage.role===role}><div><span>{ROLE_LABELS[role]}</span>{stage.role===role&&<b>Current review stage</b>}</div>{people.length?people.map((c,i)=><section key={c.id || `${c.name}-${i}`}><strong>{c.name}</strong><small>{c.source}</small>{c.phone?<a href={telephone(c.phone)}><Phone size={12}/>{c.phone}</a>:<p>Phone not supplied</p>}{c.email&&<a href={`mailto:${encodeURIComponent(c.email)}`}><Mail size={12}/>{c.email}</a>}</section>):<p>Assigned officer details not supplied.</p>}</article>;})}</div><p className="contact-source-note">Recorded reviewers and ward/module assignments are identified separately. A ward contact is not assumed to have reviewed this report.</p></section>;
}
