'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (input: { title: string; description?: string; tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toneStyles: Record<ToastTone, { border: string; bg: string; text: string; icon: JSX.Element }> = {
  success: {
    border: "#86efac",
    bg: "#f0fdf4",
    text: "#166534",
    icon: <CheckCircle2 size={18} />
  },
  error: {
    border: "#fca5a5",
    bg: "#fef2f2",
    text: "#991b1b",
    icon: <TriangleAlert size={18} />
  },
  info: {
    border: "#93c5fd",
    bg: "#eff6ff",
    text: "#1d4ed8",
    icon: <Info size={18} />
  }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, tone = "info" }: { title: string; description?: string; tone?: ToastTone }) => {
      const id = idRef.current++;
      setToasts((current) => [...current, { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          zIndex: 2000
        }}
      >
        {toasts.map((toast) => {
          const style = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              style={{
                width: 320,
                maxWidth: "calc(100vw - 32px)",
                borderRadius: 16,
                border: `1px solid ${style.border}`,
                background: style.bg,
                color: style.text,
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
                padding: 16
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ display: "flex", marginTop: 1 }}>{style.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{toast.title}</div>
                  {toast.description ? <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>{toast.description}</div> : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", padding: 0 }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
