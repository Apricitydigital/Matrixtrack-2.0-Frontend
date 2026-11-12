import React, { useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useFilterDismiss } from './FilterPopover';

interface Props { label: string; options: [string, string][]; selected: string[]; onChange: (selected: string[]) => void; allLabel?: string; quickSelection?: { label: string; active: boolean; onSelect: () => void }; }

/** Checkbox dropdown: empty selection means "all". */
export function MultiSelectDropdown({ label, options, selected, onChange, allLabel, quickSelection }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useFilterDismiss(root, reason => { setOpen(false); if (reason === 'escape') trigger.current?.focus(); }, open);
  const sorted = [...new Map(options).entries()].sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true, sensitivity: 'base' }));
  const names = new Map(sorted);
  const chosen = selected.filter(key => names.has(key));
  const summary = chosen.length === 0 ? (allLabel || `All ${label.toLowerCase()}`) : chosen.length === 1 ? names.get(chosen[0])! : `${chosen.length} ${label.toLowerCase()} selected`;
  const toggle = (key: string) => onChange(chosen.includes(key) ? chosen.filter(k => k !== key) : [...chosen, key]);
  return <div className="ops-filter ops-multi" ref={root}>
    <span id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" className="ops-multi-trigger" aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`${id}-label`} onClick={() => setOpen(v => !v)}>
      <em>{summary}</em><ChevronDown size={14} />
    </button>
    {open && <div className="ops-multi-menu" role="group" aria-labelledby={`${id}-label`}>
      {quickSelection && <button type="button" className="ops-multi-preset" aria-pressed={quickSelection.active} onClick={() => { quickSelection.onSelect(); setOpen(false); trigger.current?.focus(); }}><span>{quickSelection.label}</span>{quickSelection.active && <Check size={13} />}</button>}
      <div className="ops-multi-actions">
        <button type="button" disabled={chosen.length === sorted.length} onClick={() => onChange(sorted.map(([key]) => key))}>Select all</button>
        <button type="button" disabled={!chosen.length} onClick={() => onChange([])}>Clear</button>
      </div>
      <ul>{sorted.map(([key, name]) => <li key={key}><label><input type="checkbox" checked={chosen.includes(key)} onChange={() => toggle(key)} /><span>{name}</span>{chosen.includes(key) && <Check size={13} />}</label></li>)}</ul>
      {!sorted.length && <p>No options</p>}
    </div>}
  </div>;
}
