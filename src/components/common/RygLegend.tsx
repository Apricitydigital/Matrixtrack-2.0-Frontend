import React from 'react';
import { RYG_LABELS } from '../../services/presentation';
export function RygLegend() { return <div className="ryg-legend" aria-label="Red yellow green status guide"><strong>RYG guide</strong>{(['red','yellow','green','neutral'] as const).map(tone => <span key={tone}><i className={`ryg-dot ryg-${tone}`} aria-hidden="true" />{RYG_LABELS[tone]}</span>)}<small>Workflow status · Ward ranking uses its own performance bands.</small></div>; }
