import type { ProcessingPlantPerformanceRow, PlantQuantityKey } from '../types/processingPlant';
import { plantQuantity } from './plantAnalytics';

export function buildPlantInsights(source: ProcessingPlantPerformanceRow[], unit: string) {
  const rows = source.filter(r => (r.unit || 'MT') === unit);
  const comparable = rows.filter(r => r.efficiencyAvailable !== false && r.materialComparable !== false && (plantQuantity(r, 'received') ?? 0) > 0 && plantQuantity(r, 'recovered') != null)
    .map(r => ({ ...r, efficiency: r.recovered / r.received * 100 })).sort((a, b) => a.efficiency - b.efficiency);
  const inputs = rows.map(row => ({ row, value: plantQuantity(row, 'received') })).filter((r): r is { row: ProcessingPlantPerformanceRow; value: number } => r.value != null && r.value > 0).sort((a, b) => b.value - a.value);
  const total = inputs.reduce((n, r) => n + r.value, 0);
  const segments: { id: string; label: string; value: number; row?: ProcessingPlantPerformanceRow }[] = inputs.slice(0, 5).map(r => ({ id: r.row.plantId, label: r.row.plantName, ...r }));
  if (inputs.length > 5) segments.push({ id: 'other-plants', label: `${inputs.length - 5} other plants`, value: inputs.slice(5).reduce((n, r) => n + r.value, 0) });
  const reporting = rows.filter(r => Number.isInteger(r.daysInRange) && r.daysInRange! > 0 && Number.isInteger(r.daysReported) && r.daysReported! >= 0 && r.daysReported! <= r.daysInRange!)
    .map(row => ({ row, expected: row.daysInRange!, reported: row.daysReported!, missing: row.daysInRange! - row.daysReported! }))
    .sort((a, b) => b.missing - a.missing || a.row.plantName.localeCompare(b.row.plantName));
  const keys: PlantQuantityKey[] = ['received', 'recovered', 'reject', 'processLoss'];
  const balances = rows.filter(r => r.balanceAvailable !== false && r.materialComparable !== false && r.efficiencyAvailable !== false && keys.every(key => plantQuantity(r, key) != null))
    .map(row => ({ row, delta: row.received - row.recovered - row.reject - row.processLoss }));
  // Ignore floating-point subtraction noise, without hiding measured discrepancies.
  const discrepancies = balances.filter(r => Math.abs(r.delta) > 1e-8).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return {
    plants: rows.length,
    recovery: { rows: comparable.slice(0, 6), count: comparable.length, spread: comparable.length > 1 ? comparable[comparable.length - 1].efficiency - comparable[0].efficiency : null, scale: Math.max(100, ...comparable.map(r => r.efficiency)) },
    input: { total, segments, contributors: inputs.length, topShare: total > 0 ? inputs.slice(0, 2).reduce((n, r) => n + r.value, 0) / total * 100 : null, unknown: rows.filter(r => plantQuantity(r, 'received') == null).length },
    reporting: { rows: reporting, expected: reporting.reduce((n, r) => n + r.expected, 0), reported: reporting.reduce((n, r) => n + r.reported, 0), missing: reporting.reduce((n, r) => n + r.missing, 0), complete: reporting.filter(r => !r.missing).length, gaps: reporting.filter(r => r.missing > 0).length, unknown: rows.length - reporting.length },
    balance: { rows: discrepancies.slice(0, 6), checked: balances.length, excluded: rows.length - balances.length, discrepancies: discrepancies.length, absolute: discrepancies.reduce((n, r) => n + Math.abs(r.delta), 0), scale: Math.max(1, ...discrepancies.map(r => Math.abs(r.delta))) },
  };
}
