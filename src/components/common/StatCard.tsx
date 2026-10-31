import React from 'react';
import type { RygTone } from '../../services/presentation';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  denominator?: string;
  trend?: {
    value: string;
    isPositive: boolean;
    period: string;
  };
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  onClick?: () => void;
  className?: string;
  tone?: RygTone;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  denominator,
  trend,
  subtitle,
  icon,
  badge,
  onClick,
  className = '',
  tone = 'neutral'
}) => {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      data-tone={tone}
      className={`metric-card bg-white border border-slate-200 rounded-xl p-5 shadow-xs transition-all ${
        isClickable ? 'hover:border-indigo-400 hover:shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-xs font-semibold tracking-wide text-slate-500 min-w-0">
          {label}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">
              {badge}
            </span>
          )}
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              {icon}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-baseline flex-wrap gap-2">
        <span className="text-2xl lg:text-3xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-slate-500">
            {unit}
          </span>
        )}
        {denominator && (
          <span className="text-xs text-slate-400 font-mono">
            / {denominator}
          </span>
        )}
      </div>

      {(trend || subtitle) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between text-xs text-slate-500">
          {trend ? (
            <div className="flex items-center gap-1.5">
              <span className={`font-semibold ${trend.isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
              <span>vs {trend.period}</span>
            </div>
          ) : (
            <span>{subtitle}</span>
          )}
          {isClickable && (
            <span className="text-indigo-600 font-medium hover:text-indigo-700 whitespace-nowrap">
              Drill down →
            </span>
          )}
        </div>
      )}
    </div>
  );
};
