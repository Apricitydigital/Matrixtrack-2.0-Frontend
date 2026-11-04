/** Automatic SI samples share the register but cannot be edited or deleted as manual targets. */
export function targetRegister(data: any) {
  if (!Array.isArray(data?.targets) || (data.total != null && data.total !== data.targets.length)) {
    throw new Error('Target data is unavailable.');
  }
  const samplingAvailable = Array.isArray(data.samplingTargets);
  return {rows: [...data.targets, ...(samplingAvailable ? data.samplingTargets : [])], samplingAvailable};
}

export const manualTargetIds = (rows: any[]): string[] =>
  [...new Set<string>(rows.filter(row => !row.isSampling).map(row => row.id))];

export const matchesTargetScope = (row: any, scope: string) =>
  scope === 'all' || (scope === 'ward' ? Boolean(row.wardId) : scope === 'si' ? row.role === 'QC' : !row.wardId);
