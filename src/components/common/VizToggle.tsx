import React, {useEffect} from 'react';
import {BarChart3, PieChart} from 'lucide-react';
import {setVizMode, useVizMode} from '../../services/vizMode';

/** Prototype switch: classic bar charts vs. pictorial charts across every dashboard. */
export function VizToggle() {
  const mode = useVizMode(), next = mode === 'visual' ? 'classic' : 'visual';
  useEffect(() => { document.documentElement.dataset.viz = mode; }, [mode]);
  return <button type="button" className="theme-toggle viz-toggle" data-mode={mode} onClick={() => setVizMode(next)}
    aria-label={`Switch to ${next} charts`} title={`Switch to ${next} charts`}>
    {mode === 'visual' ? <PieChart size={17}/> : <BarChart3 size={17}/>}<span>{mode === 'visual' ? 'Visual' : 'Classic'}</span>
  </button>;
}
