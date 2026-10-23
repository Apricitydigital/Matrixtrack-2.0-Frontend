/**
 * Pure helpers of the Cleanliness Issues (IEC-originated) City Admin / Commissioner screens: labels, IST
 * formatting, query strings, time-remaining wording, image-viewer geometry and photo-metadata rows.
 *
 * No React / browser imports so it can be unit-tested with plain `node --test` (see tests/).
 * Values are shown exactly as stored: a missing value is "Not available", never a guess.
 */

export type IssueStatus =
  | "REPORTED"
  | "UNASSIGNED"
  | "ASSIGNED"
  | "QC_PENDING"
  | "ULB_PENDING"
  | "REINSPECTION_REQUIRED"
  | "CLOSED"
  | "REOPEN_REQUESTED"
  | "REOPENED";

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

export const STATUS_LABEL: Record<string, string> = {
  REPORTED: "Reported",
  UNASSIGNED: "Unassigned",
  ASSIGNED: "Pending Daroga inspection",
  QC_PENDING: "Waiting for QC",
  ULB_PENDING: "Waiting for ULB",
  REINSPECTION_REQUIRED: "Reinspection required",
  CLOSED: "Closed",
  REOPEN_REQUESTED: "Reopen requested",
  REOPENED: "Reopened"
};

export const STATUS_TONE: Record<string, Tone> = {
  REPORTED: "neutral",
  UNASSIGNED: "danger",
  ASSIGNED: "primary",
  QC_PENDING: "warning",
  ULB_PENDING: "warning",
  REINSPECTION_REQUIRED: "danger",
  CLOSED: "success",
  REOPEN_REQUESTED: "warning",
  REOPENED: "primary"
};

export const statusLabel = (status: string | null | undefined) =>
  status ? STATUS_LABEL[status] ?? status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "—";

export const EVENT_LABEL: Record<string, string> = {
  CREATE: "Issue reported",
  ASSIGN: "Daroga assigned",
  REASSIGN: "Reassigned to another Daroga",
  MARK_UNASSIGNED: "Moved to unassigned",
  CLEAR_ASSIGNEE: "Daroga removed (waiting for a Daroga)",
  SUBMIT_INSPECTION: "Daroga submitted an inspection",
  QC_ACCEPT: "QC accepted",
  QC_REJECT: "QC rejected - reinspection required",
  ULB_APPROVE: "ULB approved - issue closed",
  ULB_REJECT: "ULB rejected - reinspection required",
  ULB_ACTION_REQUIRED: "ULB required corrective action",
  REQUEST_REOPEN: "IEC requested reopening",
  APPROVE_REOPEN: "Reopening approved - new cycle",
  REJECT_REOPEN: "Reopening rejected"
};
export const eventLabel = (event: string) => EVENT_LABEL[event] ?? event;

export const DECISION_LABEL: Record<string, string> = {
  QC_ACCEPT: "Accepted by QC",
  QC_REJECT: "Rejected by QC",
  ULB_APPROVE: "Approved by ULB",
  ULB_REJECT: "Rejected by ULB",
  ULB_ACTION_REQUIRED: "Action required by ULB"
};
export const decisionLabel = (decision: string) => DECISION_LABEL[decision] ?? decision;

export const ASSIGNMENT_REASON_LABEL: Record<string, string> = {
  INITIAL: "Automatic (new issue)",
  REOPEN: "Automatic (reopened)",
  REASSIGN_INELIGIBLE: "Automatic (previous Daroga ineligible)",
  MANUAL: "Manual (City Admin)"
};
export const assignmentReasonLabel = (reason: string) => ASSIGNMENT_REASON_LABEL[reason] ?? reason;

/* ------------------------------------------------------------------ time */

const IST = "Asia/Kolkata";
const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: IST, day: "2-digit", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

const toDate = (value: string | Date | null | undefined): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function formatDateIst(value: string | Date | null | undefined): string | null {
  const d = toDate(value);
  return d ? dateFormat.format(d) : null;
}
export function formatTimeIst(value: string | Date | null | undefined): string | null {
  const d = toDate(value);
  return d ? timeFormat.format(d).toUpperCase() : null;
}
/** "21 Oct 2026, 10:30:15 AM IST" */
export function formatDateTimeIst(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? `${dateFormat.format(d)}, ${timeFormat.format(d).toUpperCase()} IST` : "—";
}

/** Whole-minute duration: "2h 05m", "3d 4h", "45m". */
export function humanDuration(ms: number): string {
  const total = Math.max(0, Math.round(Math.abs(ms) / 60_000));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m`;
}

/** Time to the deadline: negative = overdue. */
export function describeRemaining(msRemaining: number): { text: string; overdue: boolean } {
  if (!Number.isFinite(msRemaining)) return { text: "—", overdue: false };
  return msRemaining < 0 ? { text: `Overdue by ${humanDuration(msRemaining)}`, overdue: true } : { text: `${humanDuration(msRemaining)} left`, overdue: false };
}

export type OverdueInfo = { isOverdue: boolean; isOutstanding: boolean; submittedLate: boolean; overdueByMs: number };
export function overdueLabel(o: OverdueInfo | null | undefined): { text: string; tone: Tone } {
  if (!o) return { text: "—", tone: "neutral" };
  if (o.isOutstanding) return { text: `Overdue ${humanDuration(o.overdueByMs)}`, tone: "danger" };
  if (o.submittedLate) return { text: `Inspected late (${humanDuration(o.overdueByMs)})`, tone: "warning" };
  return { text: "On time", tone: "success" };
}

export const hoursText = (hours: number | null | undefined) => (hours === null || hours === undefined ? "—" : `${hours.toFixed(1)} h`);
export const percentText = (value: number | null | undefined) => (value === null || value === undefined ? "—" : `${value.toFixed(1)}%`);

/* --------------------------------------------------------------- queries */

export type FilterState = {
  from?: string;
  to?: string;
  zoneId?: string;
  wardId?: string;
  module?: string;
  status?: string;
  darogaId?: string;
  overdue?: string;
  search?: string;
};

export const EMPTY_FILTERS: FilterState = {};

/** Query string (leading "?") of the non-empty parameters only. */
export function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v).trim())}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/** A ward cannot stay selected after its zone changes to one that does not contain it. */
export function normalizeFilters(next: FilterState, zones: Array<{ id: string; wards: Array<{ id: string }> }>): FilterState {
  const out = { ...next };
  if (out.zoneId && out.wardId) {
    const zone = zones.find((z) => z.id === out.zoneId);
    if (!zone || !zone.wards.some((w) => w.id === out.wardId)) out.wardId = undefined;
  }
  if (out.from && out.to && out.to < out.from) out.to = out.from;
  return out;
}

export const hasActiveFilters = (f: FilterState) => Object.values(f).some((v) => v !== undefined && v !== null && String(v).trim() !== "");

/* ------------------------------------------------------------ image view */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;
export const ZOOM_STEP = 0.5;
export const DOUBLE_TAP_ZOOM = 2.5;

export const clampZoom = (zoom: number) => (Number.isFinite(zoom) ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) : MIN_ZOOM);
export const zoomIn = (zoom: number) => clampZoom(Math.round((zoom + ZOOM_STEP) * 100) / 100);
export const zoomOut = (zoom: number) => clampZoom(Math.round((zoom - ZOOM_STEP) * 100) / 100);
/** Double click / tap: zoom in, or back to fit when already zoomed. */
export const toggleZoom = (zoom: number) => (zoom > MIN_ZOOM ? MIN_ZOOM : DOUBLE_TAP_ZOOM);
/** Mouse wheel: deltaY < 0 zooms in. */
export const wheelZoom = (zoom: number, deltaY: number) => clampZoom(zoom * (deltaY < 0 ? 1.15 : 1 / 1.15));
/** Two-finger pinch: scale relative to the distance when the pinch started. */
export const pinchZoom = (startZoom: number, startDistance: number, distance: number) => (startDistance > 0 ? clampZoom(startZoom * (distance / startDistance)) : startZoom);

export type Pan = { x: number; y: number };
/** The image may be dragged only as far as its zoomed edge: no empty space can be dragged into view. */
export function clampPan(pan: Pan, zoom: number, viewport: { width: number; height: number }): Pan {
  if (zoom <= MIN_ZOOM) return { x: 0, y: 0 };
  const maxX = ((zoom - 1) * viewport.width) / 2;
  const maxY = ((zoom - 1) * viewport.height) / 2;
  return { x: Math.min(maxX, Math.max(-maxX, pan.x)), y: Math.min(maxY, Math.max(-maxY, pan.y)) };
}
export const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/* --------------------------------------------------------- photo metadata */

export type PhotoLike = {
  capturedAt?: string | null;
  capturedAtDisplay?: { date: string; time: string; timeZone: string } | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracyMeters?: number | null;
};

export const NOT_AVAILABLE = "Not available";

/** The five mandatory evidence values, exactly as stored; a missing one reads "Not available". */
export function describePhotoMetadata(photo: PhotoLike | null | undefined): Array<{ label: string; value: string; missing: boolean }> {
  const date = photo?.capturedAtDisplay?.date ?? formatDateIst(photo?.capturedAt ?? null);
  const time = photo?.capturedAtDisplay?.time ?? formatTimeIst(photo?.capturedAt ?? null);
  const num = (v: number | null | undefined, digits: number, suffix = "") => (typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(digits)}${suffix}` : null);
  const rows: Array<[string, string | null]> = [
    ["Date", date],
    ["Time (IST)", time ? `${time} IST` : null],
    ["Latitude", num(photo?.latitude, 6)],
    ["Longitude", num(photo?.longitude, 6)],
    ["GPS accuracy", typeof photo?.accuracyMeters === "number" && Number.isFinite(photo.accuracyMeters) ? `±${Math.round(photo.accuracyMeters * 10) / 10} m` : null]
  ];
  return rows.map(([label, value]) => ({ label, value: value ?? NOT_AVAILABLE, missing: value === null }));
}

export const mapsUrl = (latitude: number, longitude: number) => `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

/** Only http(s) image links are rendered; anything else is shown as unavailable. */
export const safeImageUrl = (url: string | null | undefined) => (url && /^https?:\/\//i.test(url) ? url : null);
