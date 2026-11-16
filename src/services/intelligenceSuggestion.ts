/** Saved visual advice only. Never changes, or substitutes for, an SI decision. */
export type IntelligenceSuggestion = {
  outcome: 'CLEAN' | 'NOT_CLEAN' | 'UNASSESSABLE' | 'AWAITING_AI';
  reasons: string[];
  reasonsHi: string[];
  confidencePercent: number | null;
  /** True when the photo could not be judged: the outcome is then NOT_CLEAN and the reason says so. */
  unclear?: boolean;
};
const strings = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((s): s is string => typeof s === 'string' && !!s.trim()).map(s => s.trim()).slice(0, 8) : [];
export const CLEANLINESS_SCHEMA = {
  type: 'object', additionalProperties: false,
  description: 'Independent assessment of visible cleanliness, NOT whether the supervisor answer matches. CLEAN requires sufficient clear evidence of clean conditions; NOT_CLEAN requires visible dirt, litter, waste or an unclean condition; otherwise UNASSESSABLE. Never infer cleanliness from a MATCH or approval.',
  properties: {
    outcome: {type: 'string', enum: ['CLEAN', 'NOT_CLEAN', 'UNASSESSABLE']},
    reasons: {type: 'array', items: {type: 'string'}, minItems: 1, maxItems: 8},
    reasonsHi: {type: 'array', items: {type: 'string'}, minItems: 1, maxItems: 8},
    confidence: {type: 'number', minimum: 0, maximum: 1},
  }, required: ['outcome', 'reasons', 'reasonsHi', 'confidence'],
};
export function parseCleanliness(value: any) {
  if (!value || !['CLEAN', 'NOT_CLEAN', 'UNASSESSABLE'].includes(value.outcome)
    || typeof value.confidence !== 'number' || !Number.isFinite(value.confidence)
    || value.confidence < 0 || value.confidence > 1 || !strings(value.reasons).length) return undefined;
  return {outcome: value.outcome as 'CLEAN'|'NOT_CLEAN'|'UNASSESSABLE', reasons: strings(value.reasons), reasonsHi: strings(value.reasonsHi), confidence: value.confidence};
}
function baseSuggestion(raw: any): IntelligenceSuggestion {
  const saved = raw?.intelligenceSuggestion;
  if (saved && !raw?.autoQcResult && !raw?.payload?.autoQcResult && ['CLEAN','NOT_CLEAN','UNASSESSABLE','AWAITING_AI'].includes(saved.outcome)) {
    const confidence = saved.confidencePercent;
    return {outcome: saved.outcome, ...(saved.unclear === true ? {unclear: true} : {}), reasons: strings(saved.reasons), reasonsHi: strings(saved.reasonsHi),
      confidencePercent: typeof confidence === 'number' && Number.isFinite(confidence) && confidence >= 0 && confidence <= 100 ? confidence : null};
  }
  const ai = raw?.autoQcResult ?? raw?.payload?.autoQcResult;
  if (!ai) return {outcome: 'AWAITING_AI', reasons: ['Visual AI analysis has not been recorded.'], reasonsHi: [], confidencePercent: null};
  const explicit = parseCleanliness(ai.cleanliness);
  if (explicit) return {outcome: explicit.outcome, reasons: explicit.reasons, reasonsHi: explicit.reasonsHi, confidencePercent: Math.round(explicit.confidence * 100)};
  // Older point-based analyses assess actual conditions. Answer MATCH checks do not.
  const points = Array.isArray(ai.pointFindings) ? ai.pointFindings : [];
  const issue = points.filter((p: any) => p.result === 'ISSUE');
  const complete = points.length > 0 && points.every((p: any) => p.result === 'ACCEPTABLE');
  const outcome = issue.length ? 'NOT_CLEAN' : complete ? 'CLEAN' : 'UNASSESSABLE';
  const evidence = issue.length ? issue : points;
  const reasons = strings(evidence.map((p: any) => p.reason || p.visualFinding));
  const reasonsHi = strings(evidence.map((p: any) => p.reasonHi || p.visualFindingHi));
  const confidence = ai.confidence;
  return {outcome, reasons: reasons.length ? reasons : ['The saved analysis does not establish visible cleanliness. SI review is required.'], reasonsHi,
    confidencePercent: outcome !== 'UNASSESSABLE' && typeof confidence === 'number' && Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? Math.round(confidence * 100) : null};
}

const UNCLEAR_REASON = 'Blurred or unclear photo: cleanliness could not be verified, so it is treated as not clean.';
const UNCLEAR_REASON_HI = 'फोटो धुंधली या स्पष्ट नहीं है, सफाई की पुष्टि नहीं हो सकी, इसलिए इसे साफ नहीं माना गया।';
/** A report still without any saved AI result after this long is treated as an unreadable photo (AI runs within minutes of submission). */
export const AI_GRACE_MS = 60 * 60 * 1000;
const olderThanGrace = (raw: any) => {
  if (String(raw?.workspaceStatus || raw?.status || '').toUpperCase() === 'DRAFT') return false;
  // Aggregated Sweeping/Nala reports retain the original draft's createdAt.
  // The compact API supplies the small submission timestamp separately.
  const candidates = [raw?.aiSubmittedAt, raw?.payload?.submittedAt, raw?.payload?.lastSubmittedAt,
    raw?.submittedAt, raw?.createdAt, raw?.payload?.createdAt];
  const submitted = candidates.map(value => Date.parse(String(value || ''))).find(Number.isFinite);
  return submitted !== undefined && Date.now() - submitted >= AI_GRACE_MS;
};
/** AI always gives a verdict: an unclear photo, or one the AI never analysed, cannot show clean conditions, so it counts as NOT_CLEAN with the reason stated. */
export function intelligenceSuggestion(raw: any): IntelligenceSuggestion {
  const s = baseSuggestion(raw);
  if (s.outcome !== 'UNASSESSABLE' && !(s.outcome === 'AWAITING_AI' && olderThanGrace(raw))) return s;
  const generic = (r: string) => !/does not establish visible cleanliness|has not been recorded/i.test(r);
  return {outcome: 'NOT_CLEAN', unclear: true, confidencePercent: null,
    reasons: [UNCLEAR_REASON, ...s.reasons.filter(generic)].slice(0, 8), reasonsHi: [UNCLEAR_REASON_HI, ...s.reasonsHi].slice(0, 8)};
}
