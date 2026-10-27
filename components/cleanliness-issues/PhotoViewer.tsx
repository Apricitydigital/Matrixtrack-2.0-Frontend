'use client';

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageOff, Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import {
  clampPan,
  clampZoom,
  describePhotoMetadata,
  distance,
  MIN_ZOOM,
  MAX_ZOOM,
  pinchZoom,
  safeImageUrl,
  toggleZoom,
  wheelZoom,
  zoomIn,
  zoomOut,
  type Pan,
  type PhotoLike
} from "@lib/cleanlinessIssuesLogic";

type Photo = PhotoLike & { url: string };

/**
 * Full-screen evidence viewer: zoom in / out buttons, mouse wheel, pinch (touch), double click, drag to pan,
 * Escape / close button. The original capture metadata (IST date and time, latitude, longitude, GPS accuracy)
 * is shown over the photo exactly as stored; a missing value reads "Not available".
 */
export function PhotoViewer({ photo, caption, onClose, showMetadata = true, footer }: { photo: Photo; caption?: string; onClose: () => void; showMetadata?: boolean; footer?: React.ReactNode }) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(MIN_ZOOM);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ startDistance: number; startZoom: number } | null>(null);
  const drag = useRef<{ x: number; y: number; pan: Pan } | null>(null);
  const url = safeImageUrl(photo.url) ?? (!showMetadata && /^(\/[^/]|blob:|data:image\/)/i.test(photo.url) ? photo.url : null);

  const viewport = () => {
    const r = stage.current?.getBoundingClientRect();
    return { width: r?.width ?? 0, height: r?.height ?? 0 };
  };
  const apply = useCallback((nextZoom: number, nextPan?: Pan) => {
    const z = clampZoom(nextZoom);
    zoomRef.current = z;
    setZoom(z);
    const r = stage.current?.getBoundingClientRect();
    setPan((current) => clampPan(nextPan ?? current, z, { width: r?.width ?? 0, height: r?.height ?? 0 }, { width: image.current?.clientWidth ?? 0, height: image.current?.clientHeight ?? 0 }));
  }, []);
  const reset = useCallback(() => apply(MIN_ZOOM, { x: 0, y: 0 }), [apply]);

  useEffect(() => {
    reset();
    setFailed(false);
    pointers.current.clear();
    pinch.current = null;
    drag.current = null;
  }, [photo.url, reset]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    window.addEventListener('resize', reset);
    return () => window.removeEventListener('resize', reset);
  }, [reset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); }
      else if (e.key === "+" || e.key === "=") apply(zoomIn(zoomRef.current));
      else if (e.key === "-") apply(zoomOut(zoomRef.current));
      else if (e.key === "0") reset();
      else if (e.key === "Tab") {
        const buttons = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        return;
      } else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey, true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previous;
    };
  }, [onClose, reset, apply]);

  // A passive React onWheel cannot stop the page from scrolling, so the listener is attached by hand.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY) apply(wheelZoom(zoomRef.current, e.deltaY));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [apply]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { startDistance: distance(a, b), startZoom: zoom };
      drag.current = null;
    } else if (pointers.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, pan };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      apply(pinchZoom(pinch.current.startZoom, pinch.current.startDistance, distance(a, b)));
    } else if (drag.current && zoom > MIN_ZOOM) {
      const d = drag.current;
      setPan(clampPan({ x: d.pan.x + (e.clientX - d.x), y: d.pan.y + (e.clientY - d.y) }, zoom, viewport(), { width: image.current?.clientWidth ?? 0, height: image.current?.clientHeight ?? 0 }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
    else if (pointers.current.size === 1) {
      const [rest] = Array.from(pointers.current.values());
      drag.current = { x: rest.x, y: rest.y, pan };
    }
  };

  const rows = describePhotoMetadata(photo);
  if (typeof document === "undefined") return null;

  return createPortal(
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={caption ?? "Photo"} onClick={(e) => e.stopPropagation()} className="fixed inset-0 z-[1000001] flex flex-col bg-black/95 text-white outline-none">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="truncate text-sm font-bold">{caption ?? "Photo"}</div>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Zoom out" onClick={() => apply(zoomOut(zoom))} disabled={zoom <= MIN_ZOOM} className="rounded-lg bg-white/10 p-2 hover:bg-white/20 disabled:opacity-40"><Minus size={18} /></button>
          <span className="w-12 text-center text-xs tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => apply(zoomIn(zoom))} disabled={zoom >= MAX_ZOOM} className="rounded-lg bg-white/10 p-2 hover:bg-white/20 disabled:opacity-40"><Plus size={18} /></button>
          <button type="button" aria-label="Reset zoom" onClick={reset} className="rounded-lg bg-white/10 p-2 hover:bg-white/20"><RotateCcw size={18} /></button>
          <button type="button" aria-label="Close photo" onClick={onClose} className="ml-2 rounded-lg bg-white/10 p-2 hover:bg-white/20"><X size={18} /></button>
        </div>
      </div>

      <div
        ref={stage}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        style={{ cursor: zoom > MIN_ZOOM ? "grab" : "zoom-in" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => apply(toggleZoom(zoom), { x: 0, y: 0 })}
      >
        {url && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={image}
            src={url}
            alt={caption ?? "Evidence photo"}
            draggable={false}
            onError={() => setFailed(true)}
            className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: pointers.current.size ? "none" : "transform 120ms ease-out" }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-300">
            <ImageOff size={36} />
            <div className="text-sm">The photo could not be loaded.</div>
          </div>
        )}
      </div>

      <p className="shrink-0 px-4 py-2 text-center text-xs text-slate-300">Scroll or pinch to zoom. Drag to move. Double-click to zoom or fit.</p>
      {footer}
      {showMetadata && <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-1 bg-black/70 px-4 py-3 text-xs sm:grid-cols-5" aria-label="Photo details">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{r.label}</dt>
            <dd className={`font-semibold tabular-nums ${r.missing ? "italic text-amber-300" : ""}`}>{r.value}</dd>
          </div>
        ))}
      </dl>}
    </div>,
    document.body
  );
}

/** Thumbnail + the stored metadata underneath; click (or Enter) opens the full-screen viewer. */
export function PhotoThumb({ photo, caption, height = 150 }: { photo: Photo; caption: string; height?: number }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = safeImageUrl(photo.url);
  const rows = describePhotoMetadata(photo);
  const close = useCallback(() => setOpen(false), []);
  return (
    <figure className="w-full max-w-[260px]">
      <figcaption className="mb-1 text-xs font-bold text-slate-600">{caption}</figcaption>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${caption}. Open full screen`}
        style={{ height }}
        className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
      >
        {url && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={caption} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-slate-400"><ImageOff size={20} />Photo unavailable</span>
        )}
        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"><Maximize2 size={14} /></span>
      </button>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
        {rows.map((r) => (
          <div key={r.label} className={r.label === "GPS accuracy" || r.label === "Date" ? "" : ""}>
            <dt className="inline text-slate-400">{r.label}: </dt>
            <dd className={`inline font-semibold tabular-nums ${r.missing ? "italic text-amber-600" : "text-slate-700"}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
      {open ? <PhotoViewer photo={photo} caption={caption} onClose={close} /> : null}
    </figure>
  );
}

export function PhotoGrid({ photos, label }: { photos: Array<Photo & { id: string }>; label: string }) {
  if (!photos.length) return <p className="text-sm italic text-slate-400">No {label.toLowerCase()} available.</p>;
  return (
    <div className="flex flex-wrap gap-4">
      {photos.map((p, i) => (
        <PhotoThumb key={p.id} photo={p} caption={`${label}${photos.length > 1 ? ` ${i + 1}` : ""}`} />
      ))}
    </div>
  );
}
