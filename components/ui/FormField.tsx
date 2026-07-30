import React from "react";

interface Props {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const FormField: React.FC<Props> = ({ label, hint, error, required, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
    {children}
    {hint && !error && <span className="text-xs text-slate-400">{hint}</span>}
    {error && <span className="text-xs font-medium text-danger">{error}</span>}
  </div>
);