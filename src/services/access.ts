import type { Capability, RoleType } from '../types';
export const ROLE_CAPABILITIES: Record<RoleType, Capability[]> = {
  HMS_SUPER_ADMIN: ['viewCity','manageCity','manageGeography','manageUsers','manageAssignments','manageTargets','uploadAttendance','escalateOperationalReport','manageCityModules','viewAudit','restoreTrash','managePlants','exportData'],
  CITY_ADMIN: ['viewCity','manageGeography','manageUsers','manageAssignments','manageTargets','uploadAttendance','managePlants','exportData'],
  ULB_OFFICER: ['viewCity','reviewCleanliness','decideReopening','escalateOperationalReport','uploadAttendance','managePlants','exportData'],
  COMMISSIONER: ['viewCity','exportData','uploadAttendance','managePlants']
};
