"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const widths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-xl",
  };

  return createPortal(
    <div
      className="
        fixed inset-0 z-[9999]
        flex items-center justify-center
        overflow-hidden
        bg-slate-950/45
        p-3 sm:p-4
        backdrop-blur-[2px]
      "
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`
          flex w-full ${widths[size]}
          max-h-[calc(100dvh-1.5rem)]
          flex-col
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
          animate-scale-in
        `}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div
          className="
            flex shrink-0 items-start justify-between
            border-b border-slate-100
            bg-white
            px-5 py-4 sm:px-6 sm:py-5
          "
        >
          <div className="min-w-0 pr-4">
            <h2
              id="modal-title"
              className="truncate text-base font-black text-slate-900"
            >
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 truncate text-xs font-bold uppercase tracking-wide text-slate-400">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="
              flex h-8 w-8 shrink-0
              items-center justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
            "
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            px-5 py-4
            sm:px-6 sm:py-5
          "
        >
          {children}
        </div>

        {/* Fixed footer */}
        {footer && (
          <div
            className="
              shrink-0
              border-t border-slate-100
              bg-white
              px-5 py-3
              sm:px-6 sm:py-4
            "
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}