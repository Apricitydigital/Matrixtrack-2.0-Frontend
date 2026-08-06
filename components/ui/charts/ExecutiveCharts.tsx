'use client';

import React from 'react';

// 1. Reusable Area Line Trend Chart (SVG Smooth Curve with Soft Glow & Gradient)
export function LineTrendChart({
  data,
  height = 160,
  strokeColor = '#2563eb',
  fillColor = 'rgba(37, 99, 235, 0.1)',
  valueSuffix = '%'
}: {
  data: { label: string; value: number }[];
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  valueSuffix?: string;
}) {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.value), 100);
  const minVal = Math.min(...data.map(d => d.value), 0);
  const padding = 22;
  const chartWidth = 440;
  const chartHeight = height - padding * 2;

  // Compute SVG Points
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((d.value - minVal) / (maxVal - minVal || 1)) * chartHeight + padding;
    return { x, y, value: d.value, label: d.label };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg viewBox={`0 0 ${chartWidth} ${height}`} style={{ width: '100%', height: height, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`gradient-${strokeColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={strokeColor} floodOpacity="0.25" />
          </filter>
        </defs>
        
        {/* Subtle Grid Lines */}
        <line x1="0" y1={padding} x2={chartWidth} y2={padding} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
        <line x1="0" y1={height / 2} x2={chartWidth} y2={height / 2} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
        <line x1="0" y1={height - 2} x2={chartWidth} y2={height - 2} stroke="#e2e8f0" strokeWidth="1.5" />

        {/* Gradient Fill */}
        <path d={areaD} fill={`url(#gradient-${strokeColor.replace('#', '')})`} />
        
        {/* Glowing Stroke Line */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

        {/* Crisp Data Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5.5" fill="#ffffff" stroke={strokeColor} strokeWidth="3" style={{ transition: 'all 0.2s' }} />
            <title>{`${p.label}: ${p.value}${valueSuffix}`}</title>
          </g>
        ))}
      </svg>

      {/* X-Axis Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: '0 4px' }}>
        {data.map((d, i) => (
          <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// 2. Reusable Horizontal Bar Comparison Chart
export function BarComparisonChart({
  items,
  barColor = '#2563eb',
  unit = '',
  showMax = false,
}: {
  items: { label: string; value: number; max?: number; color?: string }[];
  barColor?: string;
  unit?: string;
  showMax?: boolean;
}) {
  const globalMax = Math.max(...items.map(i => i.max || i.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {items.map((item, idx) => {
        const percentage = Math.round((item.value / (item.max || globalMax)) * 100);
        const activeColor = item.color || barColor;
        return (
          <div key={idx}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              <span>{item.label}</span>
              <span style={{ color: activeColor, fontWeight: 800 }}>
                {item.value.toLocaleString()} {unit ? unit : (showMax && item.max ? `/ ${item.max}` : '')}
              </span>
            </div>
            <div style={{ height: 8, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <div style={{
                height: '100%',
                width: `${Math.max(percentage, item.value > 0 ? 8 : 0)}%`,
                background: `linear-gradient(90deg, ${activeColor}, ${activeColor}dd)`,
                borderRadius: 6,
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 3. Reusable Large Donut Status Distribution Chart
export function DonutDistributionChart({
  segments,
  size = 230,
  strokeWidth = 26,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-6 w-full my-auto">
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {total === 0 ? (
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth={strokeWidth} fill="transparent" />
          ) : (
            segments.map((seg, i) => {
              const segLength = (seg.value / total) * circ;
              const strokeDasharray = `${segLength} ${circ - segLength}`;
              const rotationOffset = (currentOffset / total) * 360;
              currentOffset += seg.value;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={0}
                  style={{
                    transformOrigin: 'center',
                    transform: `rotate(${rotationOffset}deg)`,
                    transition: 'all 0.6s ease'
                  }}
                />
              );
            })
          )}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: 38, fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-1px' }}>{total}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginTop: 4, letterSpacing: '1px' }}>TOTAL</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}>
        {segments.map((seg, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: seg.color, boxShadow: `0 0 0 3px ${seg.color}25` }} />
            <span>{seg.label}:</span>
            <strong style={{ color: '#0f172a', fontStyle: 'normal', fontWeight: 900, fontSize: 16, marginLeft: 'auto' }}>{seg.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. Vertical Bar Column Chart
export function ColumnBarChart({
  data,
  height = 140,
  barColor = '#2563eb'
}: {
  data: { label: string; value: number }[];
  height?: number;
  barColor?: string;
}) {
  const maxVal = Math.max(...data.map(d => d.value), 100);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: height, gap: 12, width: '100%', paddingTop: 16 }}>
      {data.map((item, idx) => {
        const heightPct = Math.max(Math.round((item.value / maxVal) * 100), 8);
        return (
          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{item.value}%</span>
            <div style={{
              width: '100%',
              maxWidth: 28,
              height: `${heightPct}%`,
              background: `linear-gradient(180deg, ${barColor}, ${barColor}cc)`,
              borderRadius: '6px 6px 0 0',
              transition: 'height 0.6s ease'
            }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginTop: 6, textTransform: 'uppercase' }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
