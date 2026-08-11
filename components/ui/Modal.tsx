"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

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
        bg-slate-950/45
        p-4
        backdrop-blur-[2px]
      "
      onMouseDown={onClose}
    >
      <div
        className={`
          w-full ${widths[size]}
          animate-scale-in
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        `}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-base font-black text-slate-900">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex h-8 w-8 items-center justify-center
              rounded-lg text-slate-400
              transition hover:bg-slate-100 hover:text-slate-700
            "
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          {children}
        </div>

        {footer && (
          <div className="border-t border-slate-100 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}