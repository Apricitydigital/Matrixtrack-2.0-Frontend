import React from 'react';
import { statusTone, statusLabel } from '../../services/presentation';

export type StatusVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'pending';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  size = 'md',
  className = ''
}) => {
  // Infer variant if not explicitly provided
  const normalized = statusLabel(status);
  let inferredVariant: StatusVariant = variant || 'neutral';

  if (!variant) {
    inferredVariant = ({ green: 'success', yellow: 'warning', red: 'danger', neutral: 'neutral' } as const)[statusTone(status)];
  }

  const variantStyles: Record<StatusVariant, string> = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200'
  };

  const dotStyles: Record<StatusVariant, string> = {
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-rose-600',
    info: 'bg-indigo-600',
    neutral: 'bg-slate-500',
    pending: 'bg-amber-600'
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span data-ryg={statusTone(status)} className={`inline-flex items-center gap-1.5 font-medium border rounded-md whitespace-nowrap shrink-0 ${variantStyles[inferredVariant]} ${sizeClasses} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles[inferredVariant]}`} aria-hidden="true" />
      <span>{normalized}</span>
    </span>
  );
};
