'use client';

import React from "react";
import { MapPin } from "lucide-react";
import { eventLabel, formatDateTimeIst, mapsUrl, statusLabel } from "@lib/cleanlinessIssuesLogic";
import { afterPhotoCaption, answerRows, answerText, decisionTone, ulbDecisionLabel } from "@lib/ulbCleanlinessLogic";
import type { AfterPhoto, DecisionInfo, SurveyAnswer } from "@lib/ulbCleanlinessApi";
import type { Photo } from "@lib/cleanlinessIssuesApi";
import { PhotoThumb } from "../PhotoViewer";
import { Pill } from "../ui";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white p-4">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h4>
      {children}
    </section>
  );
}

export function Facts({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k}</dt>
          <dd className="font-medium text-slate-800">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Gps({ latitude, longitude, accuracyMeters }: { latitude: number; longitude: number; accuracyMeters: number | null }) {
  return (
    <a href={mapsUrl(latitude, longitude)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
      <MapPin size={13} />
      {latitude.toFixed(6)}, {longitude.toFixed(6)}
      {accuracyMeters !== null ? ` (±${Math.round(accuracyMeters)} m)` : ""}
    </a>
  );
}

export function Photos({ photos, label }: { photos: Photo[]; label: string }) {
  if (!photos.length) return <p className="text-sm italic text-slate-400">No {label.toLowerCase()} available.</p>;
  return (
    <div className="flex flex-wrap gap-4">
      {photos.map((p, i) => (
        <PhotoThumb key={p.id} photo={p} caption={`${label}${photos.length > 1 ? ` ${i + 1}` : ""}`} />
      ))}
    </div>
  );
}

export function AfterPhotos({ photos, answers }: { photos: AfterPhoto[]; answers: SurveyAnswer[] }) {
  if (!photos.length) return <p className="text-sm italic text-slate-400">No After photos available.</p>;
  return (
    <div className="flex flex-wrap gap-4">
      {photos.map((p, i) => (
        <PhotoThumb key={p.id} photo={p} caption={afterPhotoCaption(p, answers, i, photos.length)} />
      ))}
    </div>
  );
}

export function Answers({ answers }: { answers: SurveyAnswer[] }) {
  const rows = answerRows(answers);
  if (!rows.length) return <p className="text-sm italic text-slate-400">No survey answers recorded.</p>;
  let section = "";
  return (
    <div className="space-y-1.5 text-sm">
      {rows.map((a) => {
        const heading = a.section !== section ? ((section = a.section), a.section) : null;
        return (
          <React.Fragment key={a.code}>
            {heading ? <div className="pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{heading}</div> : null}
            <div className="flex flex-wrap justify-between gap-x-4 border-b border-slate-50 pb-1">
              <span className="text-slate-600">{a.question}</span>
              <span className="font-semibold text-slate-900">{answerText(a.answer)}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function Decisions({ items }: { items: Array<Pick<DecisionInfo, "decision" | "remarks" | "reviewedAt"> & { reviewer: { name: string | null } | string | null; reviewerRole?: string }> }) {
  if (!items.length) return <p className="text-sm italic text-slate-400">No review decisions yet.</p>;
  return (
    <ul className="space-y-2">
      {items.map((d, i) => {
        const who = typeof d.reviewer === "string" ? d.reviewer : d.reviewer?.name;
        return (
          <li key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={decisionTone(d.decision)}>{ulbDecisionLabel(d.decision)}</Pill>
              <span className="text-xs text-slate-500">{who ?? "—"} · {formatDateTimeIst(d.reviewedAt)}</span>
            </div>
            {d.remarks ? <p className="mt-1 whitespace-pre-wrap text-slate-700">{d.remarks}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function Timeline({ items }: { items: Array<{ event: string; fromStatus: string | null; toStatus: string; actorRole: string | null; actorName?: string | null; reason: string | null; at: string }> }) {
  if (!items.length) return <p className="text-sm italic text-slate-400">No history recorded.</p>;
  return (
    <ol className="space-y-2 border-l-2 border-slate-100 pl-4">
      {items.map((h, i) => (
        <li key={i} className="text-sm">
          <div className="font-semibold text-slate-800">
            {eventLabel(h.event)} <span className="font-normal text-slate-400">→ {statusLabel(h.toStatus)}</span>
          </div>
          <div className="text-xs text-slate-500">
            {formatDateTimeIst(h.at)}
            {h.actorName || h.actorRole ? ` · ${[h.actorName, h.actorRole].filter(Boolean).join(" · ")}` : ""}
          </div>
          {h.reason ? <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-600">{h.reason}</p> : null}
        </li>
      ))}
    </ol>
  );
}
