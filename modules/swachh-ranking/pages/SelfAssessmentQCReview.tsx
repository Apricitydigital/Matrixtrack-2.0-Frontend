import React, { useEffect, useState } from 'react';
import { useLocation } from '../react-router-shim';
import api, { apiBaseUrl } from '../api/axios';
import {
    Check, X, RefreshCw, ClipboardCheck, AlertCircle,
    Eye, Download, FileText, ThumbsUp, ThumbsDown, Edit3, Save, Send,
    ChevronLeft, ChevronRight, CheckCircle2, Users, Clock, TrendingUp,
    Search, SlidersHorizontal, ArrowDownUp, Shield, Building2,
    BarChart3, XCircle, CheckSquare, FileDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import pmcLogoSrc from '../assets/pmc-logo.png';
import swachhLogoSrc from '../assets/swachh-parv-logo.png';

async function toBase64(url: string): Promise<string> {
    const res  = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror  = reject;
        reader.readAsDataURL(blob);
    });
}

// ─── Shared PDF colour palette ──────────────────────────────────────────────
const PDF_C = {
    NAVY:  [30,  58,  138] as [number,number,number],
    BLUE:  [37,  99,  235] as [number,number,number],
    LGREY: [241, 245, 249] as [number,number,number],
    MGREY: [226, 232, 240] as [number,number,number],
    WHITE: [255, 255, 255] as [number,number,number],
    GREEN: [22,  163,  74] as [number,number,number],
    AMBER: [217, 119,   6] as [number,number,number],
    RED:   [220,  38,  38] as [number,number,number],
    TEXT:  [15,  23,  42]  as [number,number,number],
    MUTED: [71,  85, 105]  as [number,number,number],
    PURP:  [124,  58, 237] as [number,number,number],
    STEEL: [51,  65,  85]  as [number,number,number],
};

// ─── Draws one ward's full report into `doc` (adds a page break before if wardIndex > 0) ──
function buildWardPagesInDoc(
    doc: jsPDF,
    detail: DetailData,
    pmcB64: string,
    swachhB64: string,
    wardIndex: number,
): void {
    const { NAVY, BLUE, LGREY, MGREY, WHITE, GREEN, AMBER, RED, TEXT, MUTED, PURP, STEEL } = PDF_C;
    const { selfAssessment, questions } = detail;
    const participant = selfAssessment.participant;
    const answers     = selfAssessment.answers || {};

    if (wardIndex > 0) doc.addPage();

    const PW = 210, ML = 14, MR = 14, CW = PW - ML - MR;
    const BANNER_H = 32;
    let cy = 0;

    const getY = () => (doc as any).lastAutoTable?.finalY ?? cy;

    const sectionHeading = (title: string, y: number) => {
        doc.setFillColor(...NAVY);
        doc.rect(ML, y, CW, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...WHITE);
        doc.text(title.toUpperCase(), ML + 3, y + 4.8);
        doc.setTextColor(...TEXT);
        return y + 7;
    };

    // ── Computed totals ────────────────────────────────────────────────────
    const qcDone     = !!selfAssessment.qcReviewComplete;
    const totalMax   = questions.reduce((s, q) => s + q.marks, 0);
    const totalSelf  = questions.reduce((s, q) => s + (answers[q.id]?.score ?? 0), 0);
    const totalQc    = qcDone ? questions.reduce((s, q) => s + (typeof answers[q.id]?.qcScore === 'number' ? answers[q.id]!.qcScore! : (answers[q.id]?.score ?? 0)), 0) : null;
    const finalScore = qcDone ? (typeof selfAssessment.qcTotalScore === 'number' ? selfAssessment.qcTotalScore : (totalQc ?? 0)) : null;
    const pctFinal   = qcDone && finalScore !== null && totalMax > 0 ? ((finalScore / totalMax) * 100).toFixed(1) : null;
    const approvedN  = qcDone ? questions.filter(q => answers[q.id]?.qcStatus === 'approved').length : 0;
    const rejectedN  = qcDone ? questions.filter(q => answers[q.id]?.qcStatus === 'rejected').length : 0;
    const editedN    = qcDone ? questions.filter(q => answers[q.id]?.qcStatus === 'edited').length : 0;
    const pendingN   = qcDone
        ? questions.filter(q => !answers[q.id]?.qcStatus || answers[q.id]?.qcStatus === 'pending').length
        : questions.length;

    // ── Indicator groups ───────────────────────────────────────────────────
    const groups: { indicator: string; questions: Question[] }[] = [];
    const seenInd: Record<string, number> = {};
    questions.forEach(q => {
        const ind = q.indicator?.trim() || 'General';
        if (seenInd[ind] === undefined) { seenInd[ind] = groups.length; groups.push({ indicator: ind, questions: [] }); }
        groups[seenInd[ind]].questions.push(q);
    });

    // ── HEADER BANNER ──────────────────────────────────────────────────────
    doc.setFillColor(...NAVY);
    doc.rect(0, cy, PW, BANNER_H, 'F');
    if (pmcB64)    doc.addImage(pmcB64,    'PNG', ML,           (BANNER_H - 22) / 2, 22, 22);
    if (swachhB64) doc.addImage(swachhB64, 'PNG', PW - MR - 22, (BANNER_H - 22) / 2, 22, 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 200, 255);
    doc.text('PUNE MUNICIPAL CORPORATION  ·  SWACHH RANKING EVALUATION', PW / 2, cy + 9, { align: 'center' });
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    doc.text('SELF ASSESSMENT — QC REVIEW REPORT', PW / 2, cy + 18, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 200, 255);
    doc.text(
        `Generated: ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        PW / 2, cy + 26, { align: 'center' }
    );

    // ── Participant Info Bar ───────────────────────────────────────────────
    cy = BANNER_H + 2;
    doc.setFillColor(...LGREY);
    doc.rect(ML, cy, CW, 22, 'F');
    doc.setDrawColor(...MGREY);
    doc.rect(ML, cy, CW, 22, 'S');

    const det = participant.details || {};
    const infoFields: [string, string][] = [
        ['Name / Ward', getParticipantName(det)],
        ['Category',    participant.category],
        ['Mobile',      participant.mobileNumber],
        ['Ward No.',    det.wardNumber  || det.ward_number  || '—'],
        ['Zone No.',    det.zoneNumber  || det.zone_number  || '—'],
        ['Officer',     det.officerName || det.officer_name || '—'],
        ['Submitted',   new Date(selfAssessment.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
        ['Status',      STATUS_META[selfAssessment.status]?.label || selfAssessment.status],
    ];
    const colW = CW / 4;
    infoFields.forEach(([label, value], i) => {
        const col = i % 4, row = Math.floor(i / 4);
        const x = ML + col * colW + 4, y2 = cy + 5 + row * 10;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7);   doc.setTextColor(...MUTED); doc.text(label.toUpperCase(), x, y2);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TEXT);  doc.text(String(value || '—').substring(0, 30), x, y2 + 4);
    });

    cy = BANNER_H + 2 + 22 + 2;

    // ── SECTION 1 — Score Summary ──────────────────────────────────────────
    cy = sectionHeading('1. Score Summary', cy + 4);
    const cardW = CW / 3, cardH = 16;
    [
        { label: 'Self Assessment Score', value: totalSelf,                                     color: BLUE  },
        { label: 'QC Score',              value: totalQc !== null ? totalQc : '—',              color: PURP  },
        { label: 'Final Score',           value: finalScore !== null ? finalScore : '—',        color: GREEN },
        { label: 'Total Max Marks',       value: totalMax,                                      color: NAVY  },
        { label: 'Total Questions',       value: questions.length,                              color: MUTED },
        { label: 'Overall %',             value: pctFinal !== null ? `${pctFinal}%` : '—',
          color: pctFinal !== null ? ((finalScore! / (totalMax || 1)) >= 0.75 ? GREEN : (finalScore! / (totalMax || 1)) >= 0.5 ? BLUE : AMBER) : MUTED },
    ].forEach((card, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = ML + col * cardW, y2 = cy + row * (cardH + 2);
        doc.setFillColor(...WHITE); doc.setDrawColor(...MGREY);
        doc.roundedRect(x + 1, y2 + 1, cardW - 2, cardH - 2, 1.5, 1.5, 'FD');
        doc.setFillColor(...card.color); doc.rect(x + 1, y2 + 1, 3, cardH - 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7);   doc.setTextColor(...MUTED); doc.text(card.label.toUpperCase(), x + 7, y2 + 5.5);
        doc.setFontSize(13); doc.setTextColor(...card.color); doc.text(String(card.value), x + 7, y2 + 12);
    });
    cy += 2 * (cardH + 2) + 4;

    // Status counts bar
    cy = sectionHeading('QC Question Status', cy + 4);
    const barH = 20;
    doc.setFillColor(...LGREY); doc.rect(ML, cy, CW, barH, 'F');
    doc.setDrawColor(...MGREY); doc.rect(ML, cy, CW, barH, 'S');
    const sw = CW / 4;
    ([
        { label: 'Approved', count: approvedN, color: GREEN },
        { label: 'Rejected', count: rejectedN, color: RED   },
        { label: 'Rescored',  count: editedN,   color: AMBER },
        { label: 'Pending',  count: pendingN,  color: MUTED },
    ] as { label: string; count: number; color: [number,number,number] }[]).forEach(({ label, count, color }, i) => {
        const x = ML + i * sw + sw / 2;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...color); doc.text(String(count), x, cy + 9, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.text(label.toUpperCase(), x, cy + 16, { align: 'center' });
    });
    cy += barH + 4;

    // ── SECTION 2 — Indicator Summary ─────────────────────────────────────
    cy = sectionHeading('2. Indicator-wise Summary', cy + 4);
    const indRows = groups.map(g => {
        const s = g.questions.reduce((a, q) => a + (answers[q.id]?.score ?? 0), 0);
        const c = qcDone ? g.questions.reduce((a, q) => a + (typeof answers[q.id]?.qcScore === 'number' ? answers[q.id]!.qcScore! : (answers[q.id]?.score ?? 0)), 0) : null;
        const m = g.questions.reduce((a, q) => a + q.marks, 0);
        return [g.indicator, String(s), c !== null ? String(c) : '—', c !== null ? String(c) : '—', String(m), c !== null && m > 0 ? ((c / m) * 100).toFixed(1) + '%' : '—'];
    });
    indRows.push(['TOTAL', String(totalSelf), totalQc !== null ? String(totalQc) : '—', finalScore !== null ? String(finalScore) : '—', String(totalMax), pctFinal !== null ? `${pctFinal}%` : '—']);

    autoTable(doc, {
        startY: cy + 1,
        head: [['Indicator', 'Self Score', 'QC Score', 'Final Score', 'Max Marks', '%']],
        body: indRows,
        styles: { fontSize: 8, cellPadding: 3, textColor: TEXT },
        headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: LGREY },
        columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 25, halign: 'center' }, 3: { cellWidth: 25, halign: 'center' }, 4: { cellWidth: 25, halign: 'center' }, 5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' } },
        didParseCell: d => { if (d.row.index === indRows.length - 1) { d.cell.styles.fillColor = NAVY; d.cell.styles.textColor = WHITE; d.cell.styles.fontStyle = 'bold'; } },
        margin: { left: ML, right: MR },
    });
    cy = getY() + 6;

    // ── SECTION 3 — Question-wise Detail ──────────────────────────────────
    cy = sectionHeading('3. Question-wise Detail', cy + 2);
    cy += 2;

    const stLabel: Record<string, string> = { approved: 'Approved', rejected: 'Rejected', edited: 'Rescored', pending: 'Pending' };
    groups.forEach((g, gIdx) => {
        const sG = g.questions.reduce((a, q) => a + (answers[q.id]?.score ?? 0), 0);
        const cG = qcDone ? g.questions.reduce((a, q) => a + (typeof answers[q.id]?.qcScore === 'number' ? answers[q.id]!.qcScore! : (answers[q.id]?.score ?? 0)), 0) : null;
        const mG = g.questions.reduce((a, q) => a + q.marks, 0);
        const pG = cG !== null && mG > 0 ? ((cG / mG) * 100).toFixed(1) : '—';
        const sy = gIdx === 0 ? cy : getY() + 5;

        doc.setFillColor(...LGREY); doc.setDrawColor(...MGREY); doc.rect(ML, sy, CW, 10, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...NAVY); doc.text(g.indicator, ML + 3, sy + 6.5);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
        doc.text(`Self: ${sG}  |  QC: ${cG !== null ? cG : '—'}  |  Max: ${mG}  |  ${pG}${pG !== '—' ? '%' : ''}`, ML + CW - 3, sy + 6.5, { align: 'right' });

        autoTable(doc, {
            startY: sy + 10,
            head: [['#', 'Question', 'Max', 'Self', 'QC', 'Final', 'Status']],
            body: g.questions.map((q, qi) => {
                const ans = answers[q.id], self = ans?.score ?? 0;
                const qc = qcDone ? (typeof ans?.qcScore === 'number' ? ans.qcScore : self) : null;
                return [String(qi + 1), q.text, String(q.marks), String(self), qc !== null ? String(qc) : '—', qc !== null ? String(qc) : '—', stLabel[ans?.qcStatus || 'pending'] || 'Pending'];
            }),
            styles: { fontSize: 7.5, cellPadding: 2.5, textColor: TEXT, overflow: 'linebreak' },
            headStyles: { fillColor: STEEL, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 85 }, 2: { cellWidth: 14, halign: 'center' }, 3: { cellWidth: 14, halign: 'center' }, 4: { cellWidth: 14, halign: 'center' }, 5: { cellWidth: 14, halign: 'center', fontStyle: 'bold' }, 6: { cellWidth: 23, halign: 'center' } },
            didParseCell: d => {
                if (d.column.index === 6 && d.section === 'body') {
                    const v = String(d.cell.raw).toLowerCase();
                    d.cell.styles.textColor = v === 'approved' ? GREEN : v === 'rejected' ? RED : v === 'edited' ? AMBER : MUTED;
                    if (v !== 'pending') d.cell.styles.fontStyle = 'bold';
                }
            },
            margin: { left: ML, right: MR },
        });
    });

    // ── SECTION 4 — Overall Totals ─────────────────────────────────────────
    const oy = getY() + 6;
    if (oy > 240) { doc.addPage(); cy = 14; } else { cy = oy; }
    cy = sectionHeading('4. Overall Totals & Result', cy);

    autoTable(doc, {
        startY: cy + 2,
        body: [
            ['Self Assessment Score', String(totalSelf),                                          `${totalMax > 0 ? ((totalSelf / totalMax) * 100).toFixed(1) : 0}%`],
            ['QC Score',             totalQc !== null ? String(totalQc) : '—',                   totalQc !== null && totalMax > 0 ? `${((totalQc / totalMax) * 100).toFixed(1)}%` : '—'],
            ['Final Score',          finalScore !== null ? String(finalScore) : '—',             pctFinal !== null ? `${pctFinal}%` : '—'],
            ['Total Max Marks',      String(totalMax),                                            '—'],
            ['Total Questions',      String(questions.length),                                    '—'],
            ['Questions Approved',   String(approvedN),                                           qcDone && questions.length > 0 ? `${((approvedN / questions.length) * 100).toFixed(1)}%` : '—'],
            ['Questions Rejected',   String(rejectedN),                                           qcDone && questions.length > 0 ? `${((rejectedN / questions.length) * 100).toFixed(1)}%` : '—'],
            ['Questions Rescored',    String(editedN),                                             qcDone && questions.length > 0 ? `${((editedN   / questions.length) * 100).toFixed(1)}%` : '—'],
            ['Questions Pending',    String(pendingN),                                            questions.length > 0 ? `${((pendingN / questions.length) * 100).toFixed(1)}%` : '—'],
        ],
        styles: { fontSize: 8.5, cellPadding: 3.5, textColor: TEXT },
        alternateRowStyles: { fillColor: LGREY },
        columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' }, 1: { cellWidth: 30, halign: 'center', fontStyle: 'bold', fontSize: 9 }, 2: { cellWidth: 30, halign: 'center' } },
        didParseCell: d => {
            if (d.row.index === 2 && d.section === 'body') { d.cell.styles.fillColor = NAVY; d.cell.styles.textColor = WHITE; d.cell.styles.fontStyle = 'bold'; d.cell.styles.fontSize = 9.5; }
        },
        margin: { left: ML, right: MR },
    });
}

// ─── Adds footer (page numbers) to every page in doc ────────────────────────
function addPdfFooters(doc: jsPDF): void {
    const { NAVY, MUTED } = PDF_C;
    const PW = 210, ML = 14, MR = 14;
    const total = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFillColor(...NAVY); doc.rect(0, pageH - 10, PW, 10, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(180, 200, 255);
        doc.text('Pune Municipal Corporation — Swachh Ranking Evaluation', ML, pageH - 4);
        doc.text(`Page ${p} of ${total}  ·  Confidential`, PW - MR, pageH - 4, { align: 'right' });
    }
}

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface SelfAssessment {
    id: string;
    participantId: string;
    status: string;
    qcRemarks: string | null;
    submittedAt: string;
    qcTotalScore?: number;
    qcReviewedBy?: string;
    qcReviewedAt?: string;
    qcReviewComplete?: boolean;
    answers?: Record<string, { score?: number; qcScore?: number }>;
    participant: {
        id: string;
        category: string;
        mobileNumber: string;
        details: Record<string, string>;
    };
}

interface Question {
    id: string;
    text: string;
    marks: number;
    imageCount: number;
    indicator?: string | null;
}

interface AnswerData {
    score: number;
    imageUrls?: string[];
    qcStatus?: string;
    qcScore?: number;
    qcRemark?: string;
    qcReviewedAt?: string;
    qcReviewedByName?: string;
}

interface DetailData {
    selfAssessment: SelfAssessment & { answers: Record<string, AnswerData> };
    questions: Question[];
}

type TabFilter = 'Submitted' | 'Approved' | 'Rejected' | 'all';

interface QcQReview {
    qcStatus: 'pending' | 'approved' | 'rejected' | 'edited';
    qcScore: number;
    qcRemark: string;
}

// ─── Design tokens ─────────────────────────────────────────────────────────────

const C = {
    navy:       '#1E3A8A',
    blue:       '#2563EB',
    blueLight:  '#EFF6FF',
    blueMid:    '#DBEAFE',
    success:    '#16A34A',
    successBg:  '#F0FDF4',
    successBd:  '#BBF7D0',
    amber:      '#D97706',
    amberBg:    '#FFFBEB',
    amberBd:    '#FDE68A',
    danger:     '#DC2626',
    dangerBg:   '#FEF2F2',
    dangerBd:   '#FECACA',
    white:      '#FFFFFF',
    bg:         '#F8FAFC',
    border:     '#E2E8F0',
    borderMid:  '#CBD5E1',
    text:       '#0F172A',
    textSub:    '#475569',
    textMute:   '#94A3B8',
    surface:    '#F1F5F9',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    Submitted: {
        label: 'Pending Review',
        color: C.amber,
        bg: C.amberBg,
        border: C.amberBd,
        icon: <Clock size={11} />,
    },
    Approved: {
        label: 'Approved',
        color: C.success,
        bg: C.successBg,
        border: C.successBd,
        icon: <CheckCircle2 size={11} />,
    },
    Rejected: {
        label: 'Rejected',
        color: C.danger,
        bg: C.dangerBg,
        border: C.dangerBd,
        icon: <XCircle size={11} />,
    },
};

const QC_STYLE: Record<string, { borderColor: string; bgColor: string; accentBg: string; accentColor: string; label: string }> = {
    pending:  { borderColor: C.border,   bgColor: C.white,      accentBg: C.surface,     accentColor: C.textMute,  label: 'Pending' },
    approved: { borderColor: C.success,  bgColor: C.successBg,  accentBg: C.successBd,   accentColor: C.success,   label: 'Approved' },
    rejected: { borderColor: C.danger,   bgColor: C.dangerBg,   accentBg: C.dangerBd,    accentColor: C.danger,    label: 'Rejected' },
    edited:   { borderColor: C.amber,    bgColor: C.amberBg,    accentBg: C.amberBd,     accentColor: C.amber,     label: 'Score Rescored' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getParticipantName(details: Record<string, string>): string {
    return details?.name || details?.wardName || 'Participant';
}

function authHeaders() {
    return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function resolveImageUrl(src?: string): string {
    if (!src) return '';
    const trimmed = src.trim();
    if (/^(data:|blob:)/i.test(trimmed)) return trimmed;
    let url: string;
    if (/^https?:/i.test(trimmed)) {
        url = trimmed;
    } else {
        const mediaBase = (((import.meta as any).env?.VITE_MEDIA_BASE_URL || '') as string).replace(/\/+$/, '');
        const base = mediaBase || apiBaseUrl;
        const sep = trimmed.startsWith('/') ? '' : '/';
        url = `${base}${sep}${trimmed}`;
    }
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
        url = url.replace(/^http:\/\/[^/]+/, 'https://swachh-ranking.onrender.com');
    }
    return url;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatusChip = ({ status }: { status: string }) => {
    const meta = STATUS_META[status] || STATUS_META['Submitted'];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: meta.bg, color: meta.color,
            border: `1px solid ${meta.border}`,
            borderRadius: 4, padding: '3px 10px',
            fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
        }}>
            {meta.icon} {meta.label}
        </span>
    );
};

const ScoreCell = ({ assessment }: { assessment: SelfAssessment }) => {
    const selfTotal = assessment.answers
        ? Object.values(assessment.answers).reduce((s, v) => s + (v?.score ?? 0), 0)
        : null;
    const hasQc = typeof assessment.qcTotalScore === 'number';
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    Self Assessment
                </div>
                <div style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: C.blueMid, color: '#1D4ED8',
                    borderRadius: 4, padding: '2px 8px',
                    fontSize: '0.82rem', fontWeight: 700,
                }}>
                    {selfTotal !== null ? selfTotal : '—'}
                </div>
            </div>
            <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    QC Score
                </div>
                {hasQc ? (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: '#EDE9FE', color: '#5B21B6',
                        borderRadius: 4, padding: '2px 8px',
                        fontSize: '0.82rem', fontWeight: 700,
                    }}>
                        {assessment.qcTotalScore}
                    </div>
                ) : (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: C.surface, color: C.textMute,
                        borderRadius: 4, padding: '2px 8px',
                        fontSize: '0.72rem', fontWeight: 500,
                        border: `1px solid ${C.border}`,
                    }}>
                        Pending QC
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────────

interface QuestionnaireData {
    id: string;
    category: string;
    questions: Question[];
}

const SelfAssessmentQCReview = () => {
    const location = useLocation();
    const initialTab = (new URLSearchParams(location.search).get('tab') as TabFilter) || 'Submitted';

    const [assessments, setAssessments]   = useState<SelfAssessment[]>([]);
    const [loading, setLoading]           = useState(true);
    const [allQuestionnaires, setAllQuestionnaires] = useState<QuestionnaireData[]>([]);
    const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);
    const [selectedIds, setSelectedIds]             = useState<Set<string>>(new Set());
    const [bulkDownloading, setBulkDownloading]     = useState(false);
    const [activeTab, setActiveTab]       = useState<TabFilter>(initialTab);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectTarget, setRejectTarget] = useState<SelfAssessment | null>(null);
    const [rejectRemark, setRejectRemark] = useState('');
    const [rejectError, setRejectError]   = useState('');
    const [viewDetail, setViewDetail]     = useState<DetailData | null>(null);
    const [viewLoading, setViewLoading]   = useState(false);
    const [searchQuery, setSearchQuery]   = useState('');
    const [sortOrder, setSortOrder]       = useState<'none' | 'high'>('none');
    const [qcReviews, setQcReviews]       = useState<Record<string, QcQReview>>({});
    const [qcSaving, setQcSaving]         = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [lightboxIndex, setLightboxIndex]   = useState(-1);
    const [collapsedIndicators, setCollapsedIndicators] = useState<Set<string>>(new Set());

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // ── Data fetching ──────────────────────────────────────────────────────────

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get('/self-assessment/qc/list', { headers: authHeaders() });
            setAssessments(res.data);
        } catch {
            console.error('Failed to fetch self assessments');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        api.get('/questionnaire', { headers: authHeaders() })
            .then(res => setAllQuestionnaires(res.data || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (lightboxIndex < 0) return;
        const len = lightboxImages.length;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxIndex(-1);
            else if (e.key === 'ArrowLeft')  setLightboxIndex(i => (i - 1 + len) % len);
            else if (e.key === 'ArrowRight') setLightboxIndex(i => (i + 1) % len);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxIndex, lightboxImages.length]);

    // ── Actions ────────────────────────────────────────────────────────────────

    const openLightbox = (images: string[], idx: number) => { setLightboxImages(images); setLightboxIndex(idx); };

    const handleApprove = async (id: string) => {
        setActionLoading(id);
        try {
            await api.patch(`/self-assessment/qc/${id}/status`, { status: 'Approved' }, { headers: authHeaders() });
            setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: 'Approved', qcRemarks: null } : a));
        } catch { alert('Failed to approve. Please try again.'); }
        finally { setActionLoading(null); }
    };

    const openRejectModal = (a: SelfAssessment) => { setRejectTarget(a); setRejectRemark(''); setRejectError(''); };

    const handleRejectConfirm = async () => {
        if (!rejectTarget) return;
        if (!rejectRemark.trim()) { setRejectError('Rejection reason is required.'); return; }
        setActionLoading(rejectTarget.id);
        try {
            await api.patch(`/self-assessment/qc/${rejectTarget.id}/status`, { status: 'Rejected', qcRemarks: rejectRemark.trim() }, { headers: authHeaders() });
            setAssessments(prev => prev.map(a => a.id === rejectTarget.id ? { ...a, status: 'Rejected', qcRemarks: rejectRemark.trim() } : a));
            setRejectTarget(null);
        } catch { alert('Failed to reject. Please try again.'); }
        finally { setActionLoading(null); }
    };

    const openViewModal = async (a: SelfAssessment) => {
        setViewLoading(true);
        setViewDetail(null);
        setQcReviews({});
        try {
            const res  = await api.get(`/self-assessment/qc/${a.id}/detail`, { headers: authHeaders() });
            const data: DetailData = res.data;
            setViewDetail(data);
            const init: Record<string, QcQReview> = {};
            const answers = data.selfAssessment.answers || {};
            data.questions.forEach(q => {
                const ans = answers[q.id];
                init[q.id] = {
                    qcStatus: (ans?.qcStatus as QcQReview['qcStatus']) || 'pending',
                    qcScore:  typeof ans?.qcScore === 'number' ? ans.qcScore : (ans?.score ?? 0),
                    qcRemark: ans?.qcRemark || '',
                };
            });
            setQcReviews(init);
        } catch { alert('Could not load assessment details.'); }
        finally { setViewLoading(false); }
    };

    const updateQcR = (qId: string, upd: Partial<QcQReview>) =>
        setQcReviews(prev => ({ ...prev, [qId]: { ...prev[qId], ...upd } }));

    const handleQcAction = (qId: string, qcStatus: QcQReview['qcStatus'], qcScore: number) =>
        setQcReviews(prev => ({ ...prev, [qId]: { ...prev[qId], qcStatus, qcScore } }));

    const computeSaQcTotal = () =>
        viewDetail?.questions.reduce((sum, q) => {
            const rev = qcReviews[q.id];
            if (!rev || rev.qcStatus === 'pending') {
                const ans = viewDetail.selfAssessment.answers[q.id];
                return sum + (typeof ans?.qcScore === 'number' ? ans.qcScore : (ans?.score ?? 0));
            }
            return sum + (rev.qcScore ?? 0);
        }, 0) ?? 0;

    const allSaQuestionsReviewed = () =>
        !!viewDetail && viewDetail.questions.every(q => qcReviews[q.id]?.qcStatus !== 'pending');

    const saHasMissingRemarks = () =>
        viewDetail?.questions.some(q => {
            const rev = qcReviews[q.id];
            return rev && (rev.qcStatus === 'rejected' || rev.qcStatus === 'edited') && !rev.qcRemark?.trim();
        }) ?? false;

    const handleSaveSaQcReview = async (finalize: boolean) => {
        if (!viewDetail) return;
        if (finalize && !allSaQuestionsReviewed()) { alert('Please review all questions before finalizing.'); return; }
        if (saHasMissingRemarks()) { alert('Remarks are mandatory for Rejected and Rescored questions.'); return; }
        setQcSaving(true);
        try {
            const questionReviews = Object.entries(qcReviews)
                .filter(([, d]) => d.qcStatus !== 'pending')
                .map(([questionId, d]) => ({ questionId, ...d }));
            await api.patch(`/self-assessment/qc/${viewDetail.selfAssessment.id}/question-review`, {
                questionReviews, finalize,
                qcUserId: currentUser.id,
                qcUserName: currentUser.name,
            }, { headers: authHeaders() });
            if (finalize) {
                alert('QC Review complete! Assessment approved.');
                setViewDetail(null);
                fetchData();
            } else {
                alert('Progress saved.');
                const res = await api.get(`/self-assessment/qc/${viewDetail.selfAssessment.id}/detail`, { headers: authHeaders() });
                setViewDetail(res.data);
            }
        } catch (err: any) {
            alert('Failed: ' + (err.response?.data?.message || err.message));
        } finally { setQcSaving(false); }
    };

    // ── Selection helpers ──────────────────────────────────────────────────────

    const toggleSelect = (id: string) =>
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const handleBulkDownload = async (ids: string[]) => {
        if (ids.length === 0) return;
        setBulkDownloading(true);
        try {
            let pmcB64 = '', swachhB64 = '';
            try { pmcB64    = await toBase64(typeof pmcLogoSrc === 'string' ? pmcLogoSrc : (pmcLogoSrc as any)?.src || '');    } catch { /* skip */ }
            try { swachhB64 = await toBase64(typeof swachhLogoSrc === 'string' ? swachhLogoSrc : (swachhLogoSrc as any)?.src || ''); } catch { /* skip */ }

            const details: DetailData[] = [];
            for (const id of ids) {
                try {
                    const res = await api.get(`/self-assessment/qc/${id}/detail`, { headers: authHeaders() });
                    details.push(res.data);
                } catch { /* skip failed */ }
            }
            if (details.length === 0) { alert('Could not load any assessment data.'); return; }

            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            details.forEach((d, i) => buildWardPagesInDoc(doc, d, pmcB64, swachhB64, i));
            addPdfFooters(doc);
            doc.save(`QC_Bulk_Report_${details.length}_Wards_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err: any) {
            alert('Bulk download failed: ' + (err?.message || 'Unknown error'));
        } finally {
            setBulkDownloading(false);
        }
    };

    // ── Exports ────────────────────────────────────────────────────────────────

    const exportListPDF = async () => {
        let pmcB64    = '';
        let swachhB64 = '';
        try { pmcB64    = await toBase64(typeof pmcLogoSrc === 'string' ? pmcLogoSrc : (pmcLogoSrc as any)?.src || '');   } catch { /* skip */ }
        try { swachhB64 = await toBase64(typeof swachhLogoSrc === 'string' ? swachhLogoSrc : (swachhLogoSrc as any)?.src || ''); } catch { /* skip */ }

        const NAVY_C  = [30, 58, 138]  as [number, number, number];
        const WHITE_C = [255, 255, 255] as [number, number, number];
        const MUTED_C = [180, 200, 255] as [number, number, number];
        const TEXT_C  = [15, 23, 42]   as [number, number, number];
        const LGREY_C = [241, 245, 249] as [number, number, number];

        const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
        const PW   = 210;
        const ML   = 14;
        const MR   = 14;
        const BANNER_H = 30;

        // Banner
        doc.setFillColor(...NAVY_C);
        doc.rect(0, 0, PW, BANNER_H, 'F');

        if (pmcB64)    doc.addImage(pmcB64,    'PNG', ML,              (BANNER_H - 20) / 2, 20, 20);
        if (swachhB64) doc.addImage(swachhB64, 'PNG', PW - MR - 20,   (BANNER_H - 20) / 2, 20, 20);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED_C);
        doc.text('PUNE MUNICIPAL CORPORATION  ·  SWACHH RANKING EVALUATION', PW / 2, 9, { align: 'center' });

        doc.setFontSize(13);
        doc.setTextColor(...WHITE_C);
        doc.text('SELF ASSESSMENT — SUBMISSIONS REPORT', PW / 2, 18, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...MUTED_C);
        doc.text(
            `Generated: ${new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}  ·  Total Records: ${filtered.length}`,
            PW / 2, 26, { align: 'center' }
        );

        const rows = filtered.map((a, i) => [
            String(i + 1),
            getParticipantName(a.participant.details),
            a.participant.category,
            a.participant.mobileNumber,
            new Date(a.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            STATUS_META[a.status]?.label || a.status,
            a.qcRemarks || '—',
        ]);

        autoTable(doc, {
            startY: BANNER_H + 4,
            head: [['#', 'Participant / Ward', 'Category', 'Mobile', 'Submitted', 'Status', 'QC Remarks']],
            body: rows,
            styles: { fontSize: 8, cellPadding: 3, textColor: TEXT_C },
            headStyles: { fillColor: NAVY_C, textColor: WHITE_C, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: LGREY_C },
            columnStyles: {
                0: { cellWidth: 8,  halign: 'center' },
                1: { cellWidth: 50 },
                2: { cellWidth: 28 },
                3: { cellWidth: 26, font: 'courier' },
                4: { cellWidth: 24, halign: 'center' },
                5: { cellWidth: 22, halign: 'center' },
            },
            margin: { left: ML, right: MR },
        });

        // Footer on every page
        const total = (doc as any).internal.getNumberOfPages();
        for (let p = 1; p <= total; p++) {
            doc.setPage(p);
            const pageH = doc.internal.pageSize.getHeight();
            doc.setFillColor(...NAVY_C);
            doc.rect(0, pageH - 10, PW, 10, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(...MUTED_C);
            doc.text('Pune Municipal Corporation — Swachh Ranking Evaluation', ML, pageH - 4);
            doc.text(`Page ${p} of ${total}  ·  Confidential`, PW - MR, pageH - 4, { align: 'right' });
        }

        doc.save(`SA_Submissions_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const exportListExcel = () => {
        const data = filtered.map(a => ({
            Participant: getParticipantName(a.participant.details),
            Category: a.participant.category,
            Mobile: a.participant.mobileNumber,
            Submitted: new Date(a.submittedAt).toLocaleDateString(),
            Status: STATUS_META[a.status]?.label || a.status,
            QC_Remarks: a.qcRemarks || '',
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Self Assessments');
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'self_assessment_report.xlsx');
    };

    const exportDetailPDF = async (detail: DetailData) => {
        let pmcB64 = '', swachhB64 = '';
        try { pmcB64    = await toBase64(typeof pmcLogoSrc === 'string' ? pmcLogoSrc : (pmcLogoSrc as any)?.src || '');    } catch { /* skip */ }
        try { swachhB64 = await toBase64(typeof swachhLogoSrc === 'string' ? swachhLogoSrc : (swachhLogoSrc as any)?.src || ''); } catch { /* skip */ }
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        buildWardPagesInDoc(doc, detail, pmcB64, swachhB64, 0);
        addPdfFooters(doc);
        const safeName = getParticipantName(detail.selfAssessment.participant.details).replace(/\s+/g, '_');
        doc.save(`QC_Report_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    // ── Derived data ───────────────────────────────────────────────────────────

    const getScore = (a: SelfAssessment) =>
        typeof a.qcTotalScore === 'number'
            ? a.qcTotalScore
            : a.answers ? Object.values(a.answers).reduce((s, v) => s + (v?.score ?? 0), 0) : 0;

    const counts = {
        Submitted: assessments.filter(a => a.status === 'Submitted').length,
        Approved:  assessments.filter(a => a.status === 'Approved').length,
        Rejected:  assessments.filter(a => a.status === 'Rejected').length,
        all:       assessments.length,
    };

    const approvedScores  = assessments.filter(a => a.status === 'Approved' && typeof a.qcTotalScore === 'number');
    const avgScore        = approvedScores.length > 0
        ? Math.round(approvedScores.reduce((s, a) => s + (a.qcTotalScore ?? 0), 0) / approvedScores.length)
        : null;
    const topScore        = approvedScores.length > 0
        ? Math.max(...approvedScores.map(a => a.qcTotalScore ?? 0))
        : null;

    const tabFiltered = activeTab === 'all' ? assessments : assessments.filter(a => a.status === activeTab);
    const searchFiltered = searchQuery.trim()
        ? tabFiltered.filter(a => {
            const q = searchQuery.toLowerCase();
            return (
                getParticipantName(a.participant.details).toLowerCase().includes(q) ||
                a.participant.mobileNumber.includes(q) ||
                a.participant.category.toLowerCase().includes(q)
            );
          })
        : tabFiltered;
    const filtered = sortOrder === 'high'
        ? [...searchFiltered].sort((a, b) => getScore(b) - getScore(a))
        : searchFiltered;

    const isAllSelected   = filtered.length > 0 && filtered.every(a => selectedIds.has(a.id));
    const isIndeterminate = !isAllSelected && filtered.some(a => selectedIds.has(a.id));
    const toggleSelectAll = () =>
        setSelectedIds(isAllSelected ? new Set() : new Set(filtered.map(a => a.id)));

    // ── Indicator Leaderboard ──────────────────────────────────────────────────

    const indicatorLeaderboard = React.useMemo(() => {
        const qToIndicator: Record<string, string> = {};
        allQuestionnaires.forEach(q => {
            (q.questions || []).forEach(question => {
                qToIndicator[question.id] = question.indicator?.trim() || 'General';
            });
        });

        const indicatorWardScores: Record<string, Record<string, number>> = {};

        assessments.forEach(a => {
            const answers = a.answers || {};
            const wardName = getParticipantName(a.participant.details);
            Object.entries(answers).forEach(([qId, ans]) => {
                const indicator = qToIndicator[qId];
                if (!indicator) return;
                const score = (ans?.qcScore ?? ans?.score) ?? 0;
                if (!indicatorWardScores[indicator]) indicatorWardScores[indicator] = {};
                indicatorWardScores[indicator][wardName] = (indicatorWardScores[indicator][wardName] ?? 0) + score;
            });
        });

        return Object.entries(indicatorWardScores).map(([indicator, wardMap]) => ({
            indicator,
            wards: Object.entries(wardMap)
                .map(([wardName, score]) => ({ wardName, score }))
                .sort((a, b) => b.score - a.score),
        }));
    }, [assessments, allQuestionnaires]);

    // ── Row color coding ───────────────────────────────────────────────────────

    const allScores   = filtered.map(getScore).filter(s => s > 0);
    const maxS        = allScores.length ? Math.max(...allScores) : 0;
    const minS        = allScores.length ? Math.min(...allScores) : 0;
    const scoreRange  = maxS - minS || 1;

    const getRowStyle = (a: SelfAssessment) => {
        const s = getScore(a);
        if (s === 0) return { bg: C.white, accent: C.border };
        const pct = (s - minS) / scoreRange;
        if (pct >= 0.75) return { bg: '#F0FDF4', accent: C.success };
        if (pct >= 0.5)  return { bg: '#EFF6FF', accent: C.blue };
        if (pct >= 0.25) return { bg: '#FFFBEB', accent: C.amber };
        return { bg: '#FEF2F2', accent: C.danger };
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div style={{ fontFamily: '"Inter", "Source Sans Pro", system-ui, sans-serif', color: C.text, minHeight: '100vh', background: C.bg }}>

            {/* ── Page Header ──────────────────────────────────────────────────── */}
            <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '20px 0 0', marginBottom: 24 }}>
                <div style={{ padding: '0 0 16px' }}>
                    {/* Breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: C.textMute, marginBottom: 10, fontWeight: 500 }}>
                        <Building2 size={12} />
                        <span>Pune Municipal Corporation</span>
                        <span style={{ color: C.border }}>/</span>
                        <span>Swachh Ranking</span>
                        <span style={{ color: C.border }}>/</span>
                        <span style={{ color: C.blue }}>Self Assessment Review</span>
                    </div>

                    {/* Title row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <div style={{ width: 4, height: 28, background: C.navy, borderRadius: 2, flexShrink: 0 }} />
                                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: C.navy, letterSpacing: '-0.01em' }}>
                                    Self Assessment Review
                                </h1>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: C.textSub, paddingLeft: 14 }}>
                                Review, verify and approve participant self-assessments for Swachh Ranking evaluation.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <button
                                onClick={exportListPDF}
                                disabled={filtered.length === 0}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '7px 14px', border: `1px solid ${C.border}`,
                                    borderRadius: 6, background: C.white, color: C.textSub,
                                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                    transition: 'border-color 0.15s, color 0.15s',
                                    opacity: filtered.length === 0 ? 0.5 : 1,
                                }}
                            >
                                <FileText size={14} /> PDF
                            </button>
                            <button
                                onClick={exportListExcel}
                                disabled={filtered.length === 0}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '7px 14px', border: `1px solid ${C.border}`,
                                    borderRadius: 6, background: C.white, color: C.textSub,
                                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                    transition: 'border-color 0.15s',
                                    opacity: filtered.length === 0 ? 0.5 : 1,
                                }}
                            >
                                <FileDown size={14} /> Excel
                            </button>
                            <button
                                onClick={() => fetchData()}
                                disabled={loading}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '7px 14px', border: `1px solid ${C.blue}`,
                                    borderRadius: 6, background: C.blue, color: C.white,
                                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                    transition: 'opacity 0.15s',
                                    opacity: loading ? 0.7 : 1,
                                }}
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Workflow Steps */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderTop: `1px solid ${C.border}` }}>
                    {['Not Started', 'Submitted', 'Pending QC Review', 'Approved / Rejected'].map((step, i, arr) => (
                        <React.Fragment key={step}>
                            <div style={{
                                padding: '8px 16px',
                                fontSize: '0.72rem', fontWeight: 600,
                                color: step === 'Pending QC Review' ? C.blue : C.textMute,
                                borderBottom: step === 'Pending QC Review' ? `2px solid ${C.blue}` : '2px solid transparent',
                                whiteSpace: 'nowrap',
                            }}>
                                <span style={{ marginRight: 6, opacity: 0.5 }}>{i + 1}.</span>{step}
                            </div>
                            {i < arr.length - 1 && (
                                <span style={{ color: C.border, fontSize: '0.9rem', flexShrink: 0 }}>›</span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* ── Summary Cards ────────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                {[
                    {
                        label: 'Total Submissions',
                        value: counts.all,
                        sub: 'All wards',
                        icon: <Users size={18} />,
                        accent: C.navy,
                    },
                    {
                        label: 'Pending Review',
                        value: counts.Submitted,
                        sub: 'Awaiting action',
                        icon: <Clock size={18} />,
                        accent: C.amber,
                    },
                    {
                        label: 'Approved',
                        value: counts.Approved,
                        sub: 'Review complete',
                        icon: <CheckSquare size={18} />,
                        accent: C.success,
                    },
                    {
                        label: 'Rejected',
                        value: counts.Rejected,
                        sub: 'Need resubmission',
                        icon: <XCircle size={18} />,
                        accent: C.danger,
                    },
                    ...(avgScore !== null ? [{
                        label: 'Average QC Score',
                        value: avgScore,
                        sub: `Highest: ${topScore} pts`,
                        icon: <TrendingUp size={18} />,
                        accent: '#7C3AED',
                    }] : []),
                ].map((card, i) => (
                    <div key={i} style={{
                        background: C.white,
                        border: `1px solid ${C.border}`,
                        borderTop: `3px solid ${card.accent}`,
                        borderRadius: 8,
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        transition: 'box-shadow 0.15s',
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: C.surface,
                            border: `1px solid ${C.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: card.accent, flexShrink: 0,
                        }}>
                            {card.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: C.text, lineHeight: 1, marginBottom: 3 }}>
                                {card.value}
                            </div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: C.textSub }}>
                                {card.label}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: C.textMute, marginTop: 1 }}>
                                {card.sub}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filter Toolbar ───────────────────────────────────────────────── */}
            <div style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                justifyContent: 'space-between',
            }}>
                {/* Pill tabs */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {([
                        { key: 'all',       label: 'All',           count: counts.all },
                        { key: 'Submitted', label: 'Pending Review',count: counts.Submitted },
                        { key: 'Approved',  label: 'Approved',      count: counts.Approved },
                        { key: 'Rejected',  label: 'Rejected',      count: counts.Rejected },
                    ] as { key: TabFilter; label: string; count: number }[]).map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                padding: '5px 14px',
                                border: activeTab === tab.key ? `1.5px solid ${C.navy}` : `1.5px solid ${C.border}`,
                                borderRadius: 20,
                                background: activeTab === tab.key ? C.navy : C.white,
                                color: activeTab === tab.key ? C.white : C.textSub,
                                fontSize: '0.8rem', fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            {tab.label}
                            <span style={{
                                background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : C.surface,
                                color: activeTab === tab.key ? C.white : C.textMute,
                                borderRadius: 12, padding: '0 6px',
                                fontSize: '0.7rem', fontWeight: 700, lineHeight: '18px',
                                minWidth: 20, textAlign: 'center',
                            }}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search + sort */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 auto', justifyContent: 'flex-end', minWidth: 0 }}>
                    <div style={{ position: 'relative', flex: '1 1 auto', maxWidth: 380, minWidth: 160 }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.textMute, pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder="Search office, mobile or category…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                padding: '7px 32px 7px 30px',
                                border: `1px solid ${C.border}`, borderRadius: 6,
                                fontSize: '0.82rem', color: C.text,
                                background: C.white, outline: 'none',
                                fontFamily: 'inherit',
                                transition: 'border-color 0.15s',
                            }}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} style={{
                                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', color: C.textMute,
                                display: 'flex', padding: 2,
                            }}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'high' ? 'none' : 'high')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 12px',
                            border: `1px solid ${sortOrder === 'high' ? C.blue : C.border}`,
                            borderRadius: 6,
                            background: sortOrder === 'high' ? C.blueLight : C.white,
                            color: sortOrder === 'high' ? C.blue : C.textSub,
                            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}
                    >
                        <ArrowDownUp size={13} />
                        {sortOrder === 'high' ? 'High to Low' : 'Sort by Score'}
                    </button>
                </div>
            </div>

            {/* ── Data Table ───────────────────────────────────────────────────── */}
            <div style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                overflow: 'hidden',
            }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '5rem 0' }}>
                        <RefreshCw size={32} style={{ display: 'block', margin: '0 auto 1rem', color: C.blue }} className="animate-spin" />
                        <p style={{ color: C.textMute, fontWeight: 500, fontSize: '0.875rem' }}>Loading assessments…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem 0' }}>
                        <ClipboardCheck size={40} style={{ display: 'block', margin: '0 auto 1rem', color: C.border }} />
                        <p style={{ color: C.textSub, fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>No assessments found</p>
                        <p style={{ color: C.textMute, fontSize: '0.82rem', margin: '4px 0 0' }}>Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                                <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                                    {/* Select-all checkbox */}
                                    <th style={{ padding: '10px 12px', width: 36, borderRight: `1px solid ${C.border}` }}>
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                                            onChange={toggleSelectAll}
                                            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: C.navy }}
                                        />
                                    </th>
                                    {['#', 'Office / Participant', 'Category', 'Mobile', 'Submitted', 'Scores', 'Status', 'Actions'].map((h, i) => (
                                        <th key={h} style={{
                                            padding: '10px 14px',
                                            textAlign: i === 7 ? 'right' : 'left',
                                            fontSize: '0.7rem', fontWeight: 700,
                                            color: C.textMute, textTransform: 'uppercase',
                                            letterSpacing: '0.06em', whiteSpace: 'nowrap',
                                            borderRight: i < 7 ? `1px solid ${C.border}` : 'none',
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((a, rowIdx) => {
                                    const isPending  = a.status === 'Submitted';
                                    const isSelected = selectedIds.has(a.id);
                                    const { bg, accent } = getRowStyle(a);
                                    const rowBg = isSelected ? C.blueLight : bg;
                                    return (
                                        <tr
                                            key={a.id}
                                            style={{
                                                background: rowBg,
                                                borderBottom: `1px solid ${C.border}`,
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = isSelected ? C.blueMid : C.surface)}
                                            onMouseLeave={e => (e.currentTarget.style.background = rowBg ?? C.white)}
                                        >
                                            {/* Checkbox */}
                                            <td style={{ padding: '12px', borderLeft: `3px solid ${isSelected ? C.blue : accent}`, borderRight: `1px solid ${C.border}`, width: 36 }}
                                                onClick={() => toggleSelect(a.id)}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(a.id)}
                                                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: C.navy }}
                                                />
                                            </td>

                                            {/* Rank */}
                                            <td style={{ padding: '12px 14px', borderRight: `1px solid ${C.border}`, width: 40 }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    width: 22, height: 22, borderRadius: 4,
                                                    background: sortOrder === 'high' && rowIdx < 3
                                                        ? (rowIdx === 0 ? '#F59E0B' : rowIdx === 1 ? '#94A3B8' : '#CD7C41')
                                                        : C.surface,
                                                    color: sortOrder === 'high' && rowIdx < 3 ? C.white : C.textMute,
                                                    fontSize: '0.68rem', fontWeight: 700,
                                                }}>
                                                    {rowIdx + 1}
                                                </span>
                                            </td>

                                            {/* Name */}
                                            <td style={{ padding: '12px 14px', borderRight: `1px solid ${C.border}`, minWidth: 200 }}>
                                                <div style={{ fontWeight: 700, color: C.navy, fontSize: '0.85rem', lineHeight: 1.3 }}>
                                                    {getParticipantName(a.participant.details)}
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td style={{ padding: '12px 14px', borderRight: `1px solid ${C.border}` }}>
                                                <span style={{
                                                    textTransform: 'capitalize', fontWeight: 500,
                                                    color: C.textSub, fontSize: '0.8rem',
                                                }}>
                                                    {a.participant.category}
                                                </span>
                                            </td>

                                            {/* Mobile */}
                                            <td style={{ padding: '12px 14px', borderRight: `1px solid ${C.border}`, color: C.textSub, fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                {a.participant.mobileNumber}
                                            </td>

                                            {/* Date */}
                                            <td style={{ padding: '12px 14px', borderRight: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: 600, color: C.text, fontSize: '0.8rem' }}>
                                                    {new Date(a.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: C.textMute, marginTop: 1 }}>
                                                    {new Date(a.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>

                                            {/* Scores */}
                                            <td style={{ padding: '12px 14px', borderRight: `1px solid ${C.border}` }}>
                                                <ScoreCell assessment={a} />
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '12px 14px', borderRight: `1px solid ${C.border}` }}>
                                                <StatusChip status={a.status} />
                                                {a.qcRemarks && (
                                                    <div style={{ fontSize: '0.7rem', color: C.textMute, marginTop: 4, maxWidth: 160, lineHeight: 1.4 }}>
                                                        {a.qcRemarks}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                                    <button
                                                        onClick={() => openViewModal(a)}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                                            padding: '5px 11px', border: `1px solid ${C.border}`,
                                                            borderRadius: 5, background: C.white, color: C.textSub,
                                                            fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer',
                                                            transition: 'border-color 0.15s, color 0.15s',
                                                        }}
                                                    >
                                                        <Eye size={13} /> Review
                                                    </button>
                                                    {isPending && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(a.id)}
                                                                disabled={!!actionLoading}
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                                                    padding: '5px 11px', border: `1px solid ${C.success}`,
                                                                    borderRadius: 5, background: C.successBg, color: C.success,
                                                                    fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer',
                                                                    transition: 'background 0.15s',
                                                                    opacity: actionLoading ? 0.6 : 1,
                                                                }}
                                                            >
                                                                <Check size={13} /> Approve
                                                            </button>
                                                            <button
                                                                onClick={() => openRejectModal(a)}
                                                                disabled={!!actionLoading}
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                                                    padding: '5px 11px', border: `1px solid ${C.dangerBd}`,
                                                                    borderRadius: 5, background: C.dangerBg, color: C.danger,
                                                                    fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer',
                                                                    transition: 'background 0.15s',
                                                                    opacity: actionLoading ? 0.6 : 1,
                                                                }}
                                                            >
                                                                <X size={13} /> Reject
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Table footer */}
                {filtered.length > 0 && (
                    <div style={{
                        padding: '8px 16px', borderTop: `1px solid ${C.border}`,
                        background: C.bg, display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <span style={{ fontSize: '0.75rem', color: C.textMute }}>
                            Showing <strong style={{ color: C.textSub }}>{filtered.length}</strong> of <strong style={{ color: C.textSub }}>{assessments.length}</strong> records
                        </span>
                        {/* Score legend */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score:</span>
                            {[
                                { color: C.success, label: 'High' },
                                { color: C.blue,    label: 'Above avg' },
                                { color: C.amber,   label: 'Below avg' },
                                { color: C.danger,  label: 'Low' },
                            ].map(l => (
                                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                                    <span style={{ fontSize: '0.68rem', color: C.textMute, fontWeight: 500 }}>{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Indicator Leaderboard ────────────────────────────────────────── */}
            {indicatorLeaderboard.length > 0 && (() => {
                const selected = indicatorLeaderboard.find(d => d.indicator === expandedIndicator);
                return (
                    <div style={{ marginTop: 24 }}>
                        {/* Section header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 4, height: 24, background: C.navy, borderRadius: 2 }} />
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: C.navy, lineHeight: 1 }}>
                                        Indicator Leaderboard
                                    </h2>
                                    <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: C.textMute, fontWeight: 500 }}>
                                        Select an indicator to view ward rankings
                                    </p>
                                </div>
                            </div>

                            {/* Dropdown */}
                            <div style={{ position: 'relative', minWidth: 300, maxWidth: 420, flex: '1 1 300px' }}>
                                <BarChart3
                                    size={15}
                                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.blue, pointerEvents: 'none', zIndex: 1 }}
                                />
                                <select
                                    value={expandedIndicator || ''}
                                    onChange={e => setExpandedIndicator(e.target.value || null)}
                                    style={{
                                        width: '100%', appearance: 'none', WebkitAppearance: 'none',
                                        padding: '10px 38px 10px 36px',
                                        border: `1.5px solid ${expandedIndicator ? C.blue : C.border}`,
                                        borderRadius: 8,
                                        background: C.white,
                                        fontSize: '0.85rem', fontWeight: 600,
                                        color: expandedIndicator ? C.navy : C.textMute,
                                        cursor: 'pointer', outline: 'none',
                                        boxShadow: expandedIndicator ? `0 0 0 3px ${C.blueMid}` : 'none',
                                        transition: 'border-color 0.15s, box-shadow 0.15s',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <option value="">— Select Indicator —</option>
                                    {indicatorLeaderboard.map(d => (
                                        <option key={d.indicator} value={d.indicator}>
                                            {d.indicator} ({d.wards.length} wards)
                                        </option>
                                    ))}
                                </select>
                                <SlidersHorizontal
                                    size={14}
                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMute, pointerEvents: 'none' }}
                                />
                            </div>
                        </div>

                        {/* Leaderboard table */}
                        {selected ? (
                            <div style={{
                                background: C.white, border: `1px solid ${C.border}`,
                                borderRadius: 10, overflow: 'hidden',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            }}>
                                {/* Table header */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '52px 1fr 120px',
                                    padding: '10px 20px',
                                    background: C.navy,
                                    fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)',
                                    textTransform: 'uppercase', letterSpacing: '0.07em',
                                }}>
                                    <span>Rank</span>
                                    <span>Ward / Participant</span>
                                    <span style={{ textAlign: 'right' }}>Marks Obtained</span>
                                </div>

                                {/* Rows */}
                                {selected.wards.map((w, idx) => {
                                    const isGold   = idx === 0;
                                    const isSilver = idx === 1;
                                    const isBronze = idx === 2;
                                    const medalBg  = isGold ? '#F59E0B' : isSilver ? '#94A3B8' : isBronze ? '#CD7C41' : C.surface;
                                    const medalClr = idx < 3 ? '#fff' : C.textMute;
                                    const rowBg    = isGold ? '#FFFBEB' : isSilver ? '#F8FAFC' : C.white;
                                    const maxScore = selected.wards[0]?.score || 1;
                                    const barPct   = Math.round((w.score / maxScore) * 100);

                                    return (
                                        <div
                                            key={w.wardName}
                                            style={{
                                                display: 'grid', gridTemplateColumns: '52px 1fr 120px',
                                                alignItems: 'center',
                                                padding: '10px 20px',
                                                borderBottom: idx < selected.wards.length - 1 ? `1px solid ${C.border}` : 'none',
                                                background: rowBg,
                                                transition: 'background 0.12s',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = C.surface)}
                                            onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                                        >
                                            {/* Rank badge */}
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{
                                                    width: 28, height: 28, borderRadius: 6,
                                                    background: medalBg, color: medalClr,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.75rem', fontWeight: 800,
                                                    boxShadow: idx < 3 ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                                                }}>
                                                    {isGold ? '🥇' : isSilver ? '🥈' : isBronze ? '🥉' : idx + 1}
                                                </span>
                                            </div>

                                            {/* Ward name + progress bar */}
                                            <div style={{ minWidth: 0, paddingRight: 16 }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: isGold ? 700 : 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                                                    {w.wardName}
                                                </div>
                                                <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: 2,
                                                        width: `${barPct}%`,
                                                        background: isGold ? '#F59E0B' : isSilver ? '#94A3B8' : isBronze ? '#CD7C41' : C.blue,
                                                        transition: 'width 0.4s ease',
                                                    }} />
                                                </div>
                                            </div>

                                            {/* Score */}
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{
                                                    fontSize: '1rem', fontWeight: 800,
                                                    color: isGold ? '#D97706' : isSilver ? '#64748B' : isBronze ? '#92400E' : C.textSub,
                                                }}>
                                                    {w.score}
                                                </span>
                                                <span style={{ fontSize: '0.68rem', color: C.textMute, marginLeft: 3 }}>pts</span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Footer */}
                                <div style={{ padding: '8px 20px', background: C.bg, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.72rem', color: C.textMute }}>
                                        <strong style={{ color: C.textSub }}>{selected.wards.length}</strong> wards · Indicator: <strong style={{ color: C.navy }}>{selected.indicator}</strong>
                                    </span>
                                    <span style={{ fontSize: '0.72rem', color: C.textMute }}>
                                        Top score: <strong style={{ color: C.amber }}>{selected.wards[0]?.score ?? 0} pts</strong>
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                background: C.white, border: `1.5px dashed ${C.border}`,
                                borderRadius: 10, padding: '40px 24px',
                                textAlign: 'center',
                            }}>
                                <BarChart3 size={32} style={{ color: C.border, marginBottom: 10 }} />
                                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: C.textSub }}>No indicator selected</p>
                                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: C.textMute }}>
                                    Choose an indicator from the dropdown above to see ward rankings.
                                </p>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ── Floating Bulk Action Bar ─────────────────────────────────────── */}
            {(selectedIds.size > 0 || bulkDownloading) && (
                <div style={{
                    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                    zIndex: 900,
                    background: C.navy, color: C.white,
                    borderRadius: 12, padding: '12px 20px',
                    display: 'flex', alignItems: 'center', gap: 16,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
                    minWidth: 360, flexWrap: 'wrap', justifyContent: 'space-between',
                    animation: 'slideUp 0.2s ease-out',
                }}>
                    <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }`}</style>

                    {/* Count badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', fontSize: '0.9rem', fontWeight: 800 }}>
                            {selectedIds.size}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.9 }}>
                            ward{selectedIds.size !== 1 ? 's' : ''} selected
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {/* Download Selected */}
                        <button
                            onClick={() => handleBulkDownload(Array.from(selectedIds))}
                            disabled={bulkDownloading || selectedIds.size === 0}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', borderRadius: 8,
                                background: C.white, color: C.navy,
                                border: 'none', fontWeight: 700, fontSize: '0.82rem',
                                cursor: bulkDownloading ? 'not-allowed' : 'pointer',
                                opacity: bulkDownloading ? 0.6 : 1,
                                transition: 'opacity 0.15s',
                            }}
                        >
                            <Download size={14} />
                            {bulkDownloading ? 'Generating…' : `Download Selected (${selectedIds.size})`}
                        </button>

                        {/* Download All */}
                        <button
                            onClick={() => handleBulkDownload(filtered.map(a => a.id))}
                            disabled={bulkDownloading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', borderRadius: 8,
                                background: 'rgba(255,255,255,0.12)', color: C.white,
                                border: '1px solid rgba(255,255,255,0.25)', fontWeight: 600, fontSize: '0.82rem',
                                cursor: bulkDownloading ? 'not-allowed' : 'pointer',
                                opacity: bulkDownloading ? 0.6 : 1,
                            }}
                        >
                            <FileDown size={14} />
                            Download All ({filtered.length})
                        </button>

                        {/* Clear selection */}
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            disabled={bulkDownloading}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Reject Modal ─────────────────────────────────────────────────── */}
            {rejectTarget && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(15,23,42,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '1rem',
                }}>
                    <div style={{
                        width: '100%', maxWidth: 460,
                        background: C.white,
                        borderRadius: 10,
                        border: `1px solid ${C.border}`,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: `1px solid ${C.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 6, background: C.dangerBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <AlertCircle size={16} color={C.danger} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: C.text }}>Reject Assessment</h2>
                                    <p style={{ margin: 0, fontSize: '0.72rem', color: C.textMute }}>
                                        {getParticipantName(rejectTarget.participant.details)}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setRejectTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMute, display: 'flex', padding: 4 }}>
                                <X size={16} />
                            </button>
                        </div>
                        {/* Body */}
                        <div style={{ padding: '20px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: C.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Rejection Reason <span style={{ color: C.danger }}>*</span>
                            </label>
                            <textarea
                                value={rejectRemark}
                                onChange={e => { setRejectRemark(e.target.value); setRejectError(''); }}
                                placeholder="Provide a clear reason for rejection…"
                                rows={4}
                                style={{
                                    width: '100%', boxSizing: 'border-box',
                                    padding: '10px 12px',
                                    border: `1px solid ${rejectError ? C.danger : C.border}`,
                                    borderRadius: 6, fontSize: '0.85rem', resize: 'vertical',
                                    fontFamily: 'inherit', color: C.text, outline: 'none',
                                    background: rejectError ? C.dangerBg : C.white,
                                    transition: 'border-color 0.15s',
                                }}
                            />
                            {rejectError && (
                                <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: C.danger, fontWeight: 500 }}>
                                    {rejectError}
                                </p>
                            )}
                        </div>
                        {/* Footer */}
                        <div style={{
                            padding: '12px 20px', borderTop: `1px solid ${C.border}`,
                            display: 'flex', gap: 8, justifyContent: 'flex-end',
                            background: C.bg,
                        }}>
                            <button
                                onClick={() => setRejectTarget(null)}
                                disabled={!!actionLoading}
                                style={{
                                    padding: '7px 16px', border: `1px solid ${C.border}`,
                                    borderRadius: 6, background: C.white, color: C.textSub,
                                    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectConfirm}
                                disabled={!!actionLoading}
                                style={{
                                    padding: '7px 20px', border: `1px solid ${C.danger}`,
                                    borderRadius: 6, background: C.danger, color: C.white,
                                    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                                    opacity: actionLoading ? 0.7 : 1,
                                }}
                            >
                                {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Detail Side Drawer ────────────────────────────────────────────── */}
            {(viewLoading || viewDetail) && (
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(15,23,42,0.45)',
                        zIndex: 1000,
                        display: 'flex', justifyContent: 'flex-end',
                    }}
                    onClick={e => { if (e.target === e.currentTarget) setViewDetail(null); }}
                >
                    <div style={{
                        width: '100%', maxWidth: 1040,
                        height: '100%',
                        background: C.white,
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
                        animation: 'slideInRight 0.2s ease-out',
                    }}>
                        <style>{`@keyframes slideInRight { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

                        {viewLoading ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                <RefreshCw size={28} style={{ color: C.blue }} className="animate-spin" />
                                <p style={{ color: C.textMute, fontSize: '0.875rem', fontWeight: 500 }}>Loading assessment details…</p>
                            </div>
                        ) : viewDetail ? (() => {
                            const answers      = viewDetail.selfAssessment.answers || {};
                            const totalSubmitted = viewDetail.questions.reduce((s, q) => s + (answers[q.id]?.score ?? 0), 0);
                            const maxScore     = viewDetail.questions.reduce((s, q) => s + q.marks, 0);
                            const qcTot        = computeSaQcTotal();
                            const approvedN    = viewDetail.questions.filter(q => qcReviews[q.id]?.qcStatus === 'approved').length;
                            const rejectedN    = viewDetail.questions.filter(q => qcReviews[q.id]?.qcStatus === 'rejected').length;
                            const editedN      = viewDetail.questions.filter(q => qcReviews[q.id]?.qcStatus === 'edited').length;
                            const pendingN     = viewDetail.questions.length - approvedN - rejectedN - editedN;
                            const reviewedN    = approvedN + rejectedN + editedN;
                            const isQcActive   = currentUser.role === 'qc' && !viewDetail.selfAssessment.qcReviewComplete;
                            const pctSubmitted = maxScore > 0 ? Math.round(totalSubmitted / maxScore * 100) : 0;
                            const pctQc        = maxScore > 0 ? Math.round(qcTot / maxScore * 100) : 0;
                            const pctReviewed  = viewDetail.questions.length > 0 ? Math.round(reviewedN / viewDetail.questions.length * 100) : 0;
                            const participant  = viewDetail.selfAssessment.participant;

                            return (
                                <>
                                    {/* Drawer Header */}
                                    <div style={{
                                        padding: '16px 24px',
                                        borderBottom: `1px solid ${C.border}`,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                        flexShrink: 0, background: C.white,
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: C.navy }}>
                                                    {getParticipantName(viewDetail.selfAssessment.participant.details)}
                                                </h2>
                                                <StatusChip status={viewDetail.selfAssessment.status} />
                                                {viewDetail.selfAssessment.qcReviewComplete && (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                        background: C.successBg, color: C.success,
                                                        border: `1px solid ${C.successBd}`,
                                                        borderRadius: 4, padding: '2px 8px',
                                                        fontSize: '0.7rem', fontWeight: 600,
                                                    }}>
                                                        <Shield size={10} /> QC Complete
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.78rem', color: C.textMute }}>
                                                <span style={{ textTransform: 'capitalize' }}>{participant.category}</span>
                                                {' · '}{participant.mobileNumber}
                                                {' · Submitted '}
                                                {new Date(viewDetail.selfAssessment.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                                            <button
                                                onClick={() => exportDetailPDF(viewDetail)}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                                    padding: '6px 12px', border: `1px solid ${C.border}`,
                                                    borderRadius: 6, background: C.white, color: C.textSub,
                                                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                                }}
                                            >
                                                <FileText size={13} /> Export PDF
                                            </button>
                                            <button
                                                onClick={() => setViewDetail(null)}
                                                style={{
                                                    width: 32, height: 32, borderRadius: 6,
                                                    background: C.surface, border: `1px solid ${C.border}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', color: C.textSub,
                                                }}
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* KPI Strip */}
                                    <div style={{
                                        display: 'flex', borderBottom: `1px solid ${C.border}`,
                                        background: C.bg, flexShrink: 0,
                                    }}>
                                        {[
                                            { label: 'Self Assessment Score', value: totalSubmitted, sub: `/ ${maxScore}`, pct: pctSubmitted, color: C.blue },
                                            { label: 'QC Score',              value: qcTot,          sub: `/ ${maxScore}`, pct: pctQc,        color: '#7C3AED' },
                                            { label: 'Total Marks',           value: maxScore,       sub: `${viewDetail.questions.length} questions`, pct: null, color: C.textMute },
                                            { label: 'Questions Reviewed',    value: `${reviewedN}/${viewDetail.questions.length}`, sub: `${pctReviewed}% complete`, pct: pctReviewed, color: C.success },
                                        ].map((kpi, i, arr) => (
                                            <div key={i} style={{
                                                flex: '1 0 0', minWidth: 0,
                                                padding: '14px 20px',
                                                borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                                            }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                                                    {kpi.label}
                                                </div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: C.text, lineHeight: 1 }}>{kpi.value}</div>
                                                <div style={{ fontSize: '0.7rem', color: C.textMute, marginTop: 3 }}>{kpi.sub}</div>
                                                {kpi.pct !== null && (
                                                    <div style={{ marginTop: 8, height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${kpi.pct}%`, background: kpi.color, borderRadius: 2, transition: 'width 0.4s ease' }} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Drawer Body */}
                                    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

                                        {/* Questions area */}
                                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', minWidth: 0 }}>

                                            {/* QC complete banner */}
                                            {viewDetail.selfAssessment.qcReviewComplete && (() => {
                                                const reviewerName = viewDetail.selfAssessment.qcReviewedBy ||
                                                    Object.values(answers).find((a: any) => a?.qcReviewedByName)?.qcReviewedByName || 'QC Member';
                                                return (
                                                    <div style={{
                                                        marginBottom: 16, background: C.successBg,
                                                        border: `1px solid ${C.successBd}`,
                                                        borderRadius: 8, padding: '10px 14px',
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                    }}>
                                                        <Shield size={15} color={C.success} style={{ flexShrink: 0 }} />
                                                        <div style={{ fontSize: '0.82rem', color: '#166534' }}>
                                                            <strong>QC Review Complete</strong>
                                                            {' · QC Score: '}<strong>{viewDetail.selfAssessment.qcTotalScore}</strong>
                                                            {' · Reviewed by '}<strong>{reviewerName}</strong>
                                                            {viewDetail.selfAssessment.qcReviewedAt
                                                                ? ' on ' + new Date(viewDetail.selfAssessment.qcReviewedAt).toLocaleDateString('en-IN')
                                                                : ''}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* QC remarks */}
                                            {viewDetail.selfAssessment.qcRemarks && (
                                                <div style={{
                                                    marginBottom: 16, background: C.dangerBg,
                                                    border: `1px solid ${C.dangerBd}`,
                                                    borderRadius: 8, padding: '10px 14px',
                                                }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: C.danger, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                                                        QC Remarks
                                                    </div>
                                                    <div style={{ color: '#7F1D1D', fontSize: '0.845rem' }}>
                                                        {viewDetail.selfAssessment.qcRemarks}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Questions — grouped by Indicator */}
                                            {viewDetail.questions.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '3rem 0', color: C.textMute }}>
                                                    No questionnaire found for this category.
                                                </div>
                                            ) : (() => {
                                                // Build ordered indicator groups
                                                const groups: { indicator: string; questions: Question[] }[] = [];
                                                const seen: Record<string, number> = {};
                                                viewDetail.questions.forEach(q => {
                                                    const ind = q.indicator?.trim() || 'General';
                                                    if (seen[ind] === undefined) { seen[ind] = groups.length; groups.push({ indicator: ind, questions: [] }); }
                                                    groups[seen[ind]].questions.push(q);
                                                });

                                                const indColor = (pct: number) =>
                                                    pct >= 75 ? C.success : pct >= 50 ? C.blue : pct >= 25 ? C.amber : C.danger;

                                                return (
                                                    <>
                                                        {/* ── Indicator Summary Strip ── */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 16 }}>
                                                            {groups.map(g => {
                                                                const selfObt = g.questions.reduce((s, q) => s + (answers[q.id]?.score ?? 0), 0);
                                                                const maxObt  = g.questions.reduce((s, q) => s + q.marks, 0);
                                                                const pct     = maxObt > 0 ? Math.round(selfObt / maxObt * 100) : 0;
                                                                const color   = indColor(pct);
                                                                const reviewedCount = g.questions.filter(q => qcReviews[q.id]?.qcStatus !== 'pending').length;
                                                                return (
                                                                    <div key={g.indicator} style={{ background: C.white, border: `1px solid ${C.border}`, borderTop: `3px solid ${color}`, borderRadius: 8, padding: '10px 12px' }}>
                                                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: C.navy, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.indicator}>
                                                                            {g.indicator}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.62rem', color: C.textMute, marginBottom: 6 }}>
                                                                            {g.questions.length} questions · {reviewedCount} reviewed
                                                                        </div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                                                                            <span style={{ fontSize: '1rem', fontWeight: 700, color: C.text }}>{selfObt}</span>
                                                                            <span style={{ fontSize: '0.68rem', color: C.textMute }}>/ {maxObt}</span>
                                                                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{pct}%</span>
                                                                        </div>
                                                                        <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                                                                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* ── Grouped Question Accordions ── */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                            {groups.map(g => {
                                                                const selfObt = g.questions.reduce((s, q) => s + (answers[q.id]?.score ?? 0), 0);
                                                                const maxObt  = g.questions.reduce((s, q) => s + q.marks, 0);
                                                                const pct     = maxObt > 0 ? Math.round(selfObt / maxObt * 100) : 0;
                                                                const color   = indColor(pct);
                                                                const isOpen  = !collapsedIndicators.has(g.indicator);
                                                                const allRevd = g.questions.every(q => qcReviews[q.id]?.qcStatus !== 'pending');

                                                                const toggleIndicator = () => setCollapsedIndicators(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(g.indicator)) next.delete(g.indicator); else next.add(g.indicator);
                                                                    return next;
                                                                });

                                                                return (
                                                                    <div key={g.indicator} style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                                                                        {/* Indicator accordion header */}
                                                                        <button
                                                                            onClick={toggleIndicator}
                                                                            style={{
                                                                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                                                                padding: '11px 14px', background: C.bg,
                                                                                border: 'none', borderBottom: isOpen ? `1px solid ${C.border}` : 'none',
                                                                                cursor: 'pointer', textAlign: 'left',
                                                                            }}
                                                                        >
                                                                            <span style={{
                                                                                fontSize: '0.85rem', color: isOpen ? C.blue : C.textMute,
                                                                                display: 'inline-flex', transition: 'transform 0.2s',
                                                                                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                                                            }}>›</span>
                                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                    {g.indicator}
                                                                                </div>
                                                                                <div style={{ fontSize: '0.65rem', color: C.textMute, marginTop: 1 }}>
                                                                                    {g.questions.length} question{g.questions.length !== 1 ? 's' : ''}
                                                                                </div>
                                                                            </div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                                                                {allRevd && (
                                                                                    <span style={{ fontSize: '0.62rem', background: C.successBg, color: C.success, border: `1px solid ${C.successBd}`, borderRadius: 4, padding: '1px 7px', fontWeight: 700 }}>
                                                                                        ✓ Done
                                                                                    </span>
                                                                                )}
                                                                                <div style={{ textAlign: 'right' }}>
                                                                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text }}>
                                                                                        {selfObt}
                                                                                        <span style={{ fontSize: '0.65rem', fontWeight: 400, color: C.textMute }}> / {maxObt}</span>
                                                                                    </div>
                                                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color }}>{pct}%</div>
                                                                                </div>
                                                                                <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                                                                                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
                                                                                </div>
                                                                            </div>
                                                                        </button>

                                                                        {/* Questions inside this indicator */}
                                                                        {isOpen && (
                                                                            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, background: C.white }}>
                                                                                {g.questions.map(q => {
                                                                                    const globalIdx = viewDetail.questions.indexOf(q);
                                                                                    const ans = answers[q.id];
                                                                                    const rev = qcReviews[q.id] || { qcStatus: 'pending' as const, qcScore: ans?.score ?? 0, qcRemark: '' };
                                                                                    const cs  = QC_STYLE[rev.qcStatus] || QC_STYLE.pending;
                                                                                    const submittedScore = ans?.score ?? 0;
                                                                                    const diff = rev.qcStatus !== 'pending' ? rev.qcScore - submittedScore : 0;
                                                                                    const resolvedImages = (ans?.imageUrls || []).map(resolveImageUrl).filter(Boolean);

                                                                                    return (
                                                                                        <div key={q.id} style={{
                                                                                            border: `1px solid ${cs.borderColor}`,
                                                                                            borderLeft: `3px solid ${cs.borderColor}`,
                                                                                            borderRadius: 8,
                                                                                            padding: '14px 16px',
                                                                                            background: cs.bgColor,
                                                                                            transition: 'border-color 0.15s, background 0.15s',
                                                                                        }}>
                                                                                            {/* Question header */}
                                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                                                                                                <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 0 }}>
                                                                                                    <span style={{
                                                                                                        flexShrink: 0, width: 20, height: 20, borderRadius: 4,
                                                                                                        background: cs.accentBg, color: cs.accentColor,
                                                                                                        fontSize: '0.65rem', fontWeight: 700,
                                                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                                    }}>
                                                                                                        {globalIdx + 1}
                                                                                                    </span>
                                                                                                    <p style={{ margin: 0, fontSize: '0.845rem', fontWeight: 500, color: C.text, lineHeight: 1.5 }}>{q.text}</p>
                                                                                                </div>
                                                                                                <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 80 }}>
                                                                                                    {rev.qcStatus !== 'pending' ? (
                                                                                                        <>
                                                                                                            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' }}>QC Score</div>
                                                                                                            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: cs.accentColor }}>
                                                                                                                {rev.qcScore}
                                                                                                                <span style={{ fontSize: '0.7rem', fontWeight: 400, color: C.textMute }}> / {q.marks}</span>
                                                                                                            </div>
                                                                                                            {diff !== 0 && (
                                                                                                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: diff > 0 ? C.success : C.danger }}>
                                                                                                                    {diff > 0 ? '+' : ''}{diff} pts
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <>
                                                                                                            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Self Score</div>
                                                                                                            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: C.textSub }}>
                                                                                                                {submittedScore}
                                                                                                                <span style={{ fontSize: '0.7rem', fontWeight: 400, color: C.textMute }}> / {q.marks}</span>
                                                                                                            </div>
                                                                                                        </>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Status chip */}
                                                                                            {rev.qcStatus !== 'pending' && (
                                                                                                <span style={{
                                                                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                                                                    background: cs.accentBg, color: cs.accentColor,
                                                                                                    border: `1px solid ${cs.borderColor}40`,
                                                                                                    borderRadius: 4, padding: '2px 7px',
                                                                                                    fontSize: '0.68rem', fontWeight: 600, marginBottom: 8,
                                                                                                }}>
                                                                                                    {rev.qcStatus === 'approved' && <Check size={9} />}
                                                                                                    {rev.qcStatus === 'rejected' && <X size={9} />}
                                                                                                    {rev.qcStatus === 'edited'   && <Edit3 size={9} />}
                                                                                                    {cs.label}
                                                                                                </span>
                                                                                            )}

                                                                                            {/* Evidence images */}
                                                                                            {resolvedImages.length > 0 && (
                                                                                                <div style={{ marginBottom: isQcActive ? 10 : 0 }}>
                                                                                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                                                                                        Evidence Photos ({resolvedImages.length})
                                                                                                    </div>
                                                                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                                                                        {resolvedImages.map((url, idx) => (
                                                                                                            <div key={idx} onClick={() => openLightbox(resolvedImages, idx)} style={{
                                                                                                                position: 'relative', cursor: 'pointer',
                                                                                                                width: 72, height: 72, borderRadius: 6,
                                                                                                                overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0,
                                                                                                            }}>
                                                                                                                <img src={url} alt={`Evidence ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                                                                                                <div style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', borderRadius: 3, padding: '1px 4px', fontSize: '0.6rem', fontWeight: 700, color: 'white' }}>
                                                                                                                    {idx + 1}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Read-only remark */}
                                                                                            {!isQcActive && ans?.qcRemark && (
                                                                                                <div style={{ marginTop: 8, fontSize: '0.78rem', color: C.textSub, background: C.surface, borderRadius: 6, padding: '7px 10px', border: `1px solid ${C.border}` }}>
                                                                                                    <span style={{ fontWeight: 600, color: C.textMute }}>Reviewer note: </span>{ans.qcRemark}
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Active QC controls */}
                                                                                            {isQcActive && (
                                                                                                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10 }}>
                                                                                                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                                                                                                        {[
                                                                                                            { status: 'approved' as const, score: submittedScore, label: 'Approve', icon: <ThumbsUp size={11} />, activeColor: C.success, activeBg: C.successBg },
                                                                                                            { status: 'rejected' as const, score: 0,              label: 'Reject',  icon: <ThumbsDown size={11} />, activeColor: C.danger,  activeBg: C.dangerBg },
                                                                                                            { status: 'edited'   as const, score: rev.qcScore,    label: 'Rescore', icon: <Edit3 size={11} />, activeColor: C.amber, activeBg: C.amberBg },
                                                                                                        ].map(btn => (
                                                                                                            <button
                                                                                                                key={btn.status}
                                                                                                                onClick={() => handleQcAction(q.id, btn.status, btn.score)}
                                                                                                                style={{
                                                                                                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                                                                                                    padding: '4px 11px',
                                                                                                                    border: `1px solid ${rev.qcStatus === btn.status ? btn.activeColor : C.border}`,
                                                                                                                    borderRadius: 5,
                                                                                                                    background: rev.qcStatus === btn.status ? btn.activeBg : C.white,
                                                                                                                    color: rev.qcStatus === btn.status ? btn.activeColor : C.textSub,
                                                                                                                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                                                                                                    transition: 'all 0.15s',
                                                                                                                }}
                                                                                                            >
                                                                                                                {btn.icon} {btn.label}
                                                                                                            </button>
                                                                                                        ))}
                                                                                                    </div>

                                                                                                    {rev.qcStatus === 'edited' && (
                                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                                                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: C.amber }}>Override Score</label>
                                                                                                            <input
                                                                                                                type="number" min={0} max={q.marks}
                                                                                                                value={rev.qcScore}
                                                                                                                onChange={e => updateQcR(q.id, { qcScore: Math.min(q.marks, Math.max(0, Number(e.target.value))) })}
                                                                                                                style={{
                                                                                                                    width: 58, padding: '3px 8px',
                                                                                                                    border: `1px solid ${C.amber}`, borderRadius: 5,
                                                                                                                    fontSize: '0.875rem', fontWeight: 700, textAlign: 'center', outline: 'none',
                                                                                                                }}
                                                                                                            />
                                                                                                            <span style={{ fontSize: '0.75rem', color: C.textMute }}>/ {q.marks} max</span>
                                                                                                        </div>
                                                                                                    )}

                                                                                                    {(rev.qcStatus === 'rejected' || rev.qcStatus === 'edited') && (
                                                                                                        <div>
                                                                                                            <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                                                                                                Reviewer Remarks <span style={{ color: C.danger }}>*</span>
                                                                                                            </label>
                                                                                                            <textarea
                                                                                                                placeholder="Add a detailed note for this question…"
                                                                                                                value={rev.qcRemark}
                                                                                                                onChange={e => updateQcR(q.id, { qcRemark: e.target.value })}
                                                                                                                rows={2}
                                                                                                                style={{
                                                                                                                    width: '100%', boxSizing: 'border-box',
                                                                                                                    padding: '7px 10px',
                                                                                                                    border: `1px solid ${!rev.qcRemark?.trim() ? C.danger : C.border}`,
                                                                                                                    borderRadius: 6,
                                                                                                                    background: !rev.qcRemark?.trim() ? C.dangerBg : C.white,
                                                                                                                    fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit', color: C.text, outline: 'none',
                                                                                                                    transition: 'border-color 0.15s',
                                                                                                                }}
                                                                                                            />
                                                                                                            {!rev.qcRemark?.trim() && (
                                                                                                                <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: C.danger, fontWeight: 600 }}>Remarks required</p>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* ── Right sidebar ──────────────────────────── */}
                                        <div style={{
                                            width: 256, borderLeft: `1px solid ${C.border}`,
                                            overflowY: 'auto', padding: '20px 16px',
                                            background: C.bg, flexShrink: 0,
                                        }}>
                                            {/* Participant details */}
                                            <div style={{ marginBottom: 16 }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                                                    Participant Details
                                                </div>
                                                {Object.entries(viewDetail.selfAssessment.participant.details || {}).slice(0, 4).map(([k, v]) => (
                                                    <div key={k} style={{ marginBottom: 6 }}>
                                                        <div style={{ fontSize: '0.65rem', color: C.textMute, fontWeight: 600, textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</div>
                                                        <div style={{ fontSize: '0.78rem', color: C.text, fontWeight: 500 }}>{v}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ height: 1, background: C.border, marginBottom: 16 }} />

                                            {/* Review complete */}
                                            {viewDetail.selfAssessment.qcReviewComplete && (
                                                <div style={{ marginBottom: 16, background: C.successBg, border: `1px solid ${C.successBd}`, borderRadius: 6, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 7 }}>
                                                    <CheckCircle2 size={14} color={C.success} />
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.success }}>Review Complete</span>
                                                </div>
                                            )}

                                            {/* Review progress */}
                                            <div style={{ marginBottom: 16 }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                                                    Review Progress
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <span style={{ fontSize: '0.78rem', color: C.textSub, fontWeight: 600 }}>{reviewedN} of {viewDetail.questions.length}</span>
                                                    <span style={{ fontSize: '0.75rem', color: C.textMute, fontWeight: 600 }}>{pctReviewed}%</span>
                                                </div>
                                                <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
                                                    <div style={{ height: '100%', width: `${pctReviewed}%`, background: C.blue, borderRadius: 2, transition: 'width 0.4s ease' }} />
                                                </div>
                                                {[
                                                    { label: 'Approved', count: approvedN, color: C.success },
                                                    { label: 'Rejected', count: rejectedN, color: C.danger },
                                                    { label: 'Rescored',  count: editedN,   color: C.amber },
                                                    { label: 'Pending',  count: pendingN,  color: C.textMute },
                                                ].map(s => (
                                                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${C.border}` }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                                                            <span style={{ fontSize: '0.775rem', color: C.textSub, fontWeight: 500 }}>{s.label}</span>
                                                        </div>
                                                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: s.color }}>{s.count}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ height: 1, background: C.border, marginBottom: 16 }} />

                                            {/* Score Summary */}
                                            <div style={{ marginBottom: 16 }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: C.textMute, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                                                    Score Summary
                                                </div>
                                                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', marginBottom: 6 }}>
                                                    <div style={{ fontSize: '0.65rem', color: C.textMute, fontWeight: 600, marginBottom: 2 }}>Self Assessment</div>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                                        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: C.navy }}>{totalSubmitted}</span>
                                                        <span style={{ fontSize: '0.78rem', color: C.textMute }}>/ {maxScore}</span>
                                                        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', fontWeight: 700, color: C.blue }}>{pctSubmitted}%</span>
                                                    </div>
                                                    <div style={{ marginTop: 6, height: 3, background: C.border, borderRadius: 2 }}>
                                                        <div style={{ height: '100%', width: `${pctSubmitted}%`, background: C.blue, borderRadius: 2, transition: 'width 0.4s' }} />
                                                    </div>
                                                </div>
                                                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', marginBottom: 10 }}>
                                                    <div style={{ fontSize: '0.65rem', color: C.textMute, fontWeight: 600, marginBottom: 2 }}>QC Score</div>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                                        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: C.navy }}>{qcTot}</span>
                                                        <span style={{ fontSize: '0.78rem', color: C.textMute }}>/ {maxScore}</span>
                                                        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', fontWeight: 700, color: '#7C3AED' }}>{pctQc}%</span>
                                                    </div>
                                                    <div style={{ marginTop: 6, height: 3, background: C.border, borderRadius: 2 }}>
                                                        <div style={{ height: '100%', width: `${pctQc}%`, background: '#7C3AED', borderRadius: 2, transition: 'width 0.4s' }} />
                                                    </div>
                                                </div>

                                            </div>

                                            {/* QC actions */}
                                            {isQcActive && (
                                                <>
                                                    <div style={{ height: 1, background: C.border, marginBottom: 16 }} />

                                                    {!allSaQuestionsReviewed() && (
                                                        <div style={{ marginBottom: 8, padding: '8px 10px', background: C.amberBg, borderRadius: 6, border: `1px solid ${C.amberBd}` }}>
                                                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#92400E', fontWeight: 600 }}>
                                                                {pendingN} question{pendingN !== 1 ? 's' : ''} still pending review.
                                                            </p>
                                                        </div>
                                                    )}
                                                    {saHasMissingRemarks() && (
                                                        <div style={{ marginBottom: 8, padding: '8px 10px', background: C.dangerBg, borderRadius: 6, border: `1px solid ${C.dangerBd}` }}>
                                                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#7F1D1D', fontWeight: 600 }}>
                                                                Remarks required for rejected / revised items.
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        <button
                                                            onClick={() => handleSaveSaQcReview(false)}
                                                            disabled={qcSaving}
                                                            style={{
                                                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                                padding: '8px 0', border: `1px solid ${C.border}`,
                                                                borderRadius: 6, background: C.white, color: C.textSub,
                                                                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                                                                opacity: qcSaving ? 0.6 : 1,
                                                            }}
                                                        >
                                                            <Save size={13} /> {qcSaving ? 'Saving…' : 'Save Progress'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleSaveSaQcReview(true)}
                                                            disabled={qcSaving || !allSaQuestionsReviewed() || saHasMissingRemarks()}
                                                            style={{
                                                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                                padding: '8px 0', border: `1px solid ${C.success}`,
                                                                borderRadius: 6, background: C.success, color: C.white,
                                                                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                                                                opacity: (!allSaQuestionsReviewed() || saHasMissingRemarks() || qcSaving) ? 0.45 : 1,
                                                                transition: 'opacity 0.15s',
                                                            }}
                                                        >
                                                            <Send size={13} /> {qcSaving ? 'Finalizing…' : 'Finalize & Approve'}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            );
                        })() : null}
                    </div>
                </div>
            )}

            {/* ── Lightbox ─────────────────────────────────────────────────────── */}
            {lightboxIndex >= 0 && (
                <div
                    onClick={() => setLightboxIndex(-1)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <button onClick={() => setLightboxIndex(-1)} style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={18} color="white" />
                    </button>
                    {lightboxImages.length > 1 && (
                        <button onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + lightboxImages.length) % lightboxImages.length); }} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <ChevronLeft size={22} color="white" />
                        </button>
                    )}
                    <img
                        src={lightboxImages[lightboxIndex]}
                        alt={`Evidence ${lightboxIndex + 1}`}
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: '88vw', maxHeight: '84vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
                    />
                    {lightboxImages.length > 1 && (
                        <button onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % lightboxImages.length); }} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <ChevronRight size={22} color="white" />
                        </button>
                    )}
                    <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600, color: 'white' }}>
                        {lightboxIndex + 1} / {lightboxImages.length}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SelfAssessmentQCReview;
