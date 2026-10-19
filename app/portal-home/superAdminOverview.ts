export type OverviewUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cityId: string;
  cityName: string;
  role: string;
};

export type OverviewRequest = {
  id: string;
  name: string;
  status: string;
  requestedRole: string | null;
  cityId: string;
  createdAt: string;
};

export type SuperAdminOverviewResponse = {
  users: OverviewUser[];
  requests: OverviewRequest[];
  generatedAt: string;
};

export const ROLE_LABELS: Record<string, string> = {
  CITY_ADMIN: 'City Admin',
  COMMISSIONER: 'Commissioner',
  SUPERVISOR: 'Daroga',
  QC: 'Sanitary Inspector (SI)',
  ACTION_OFFICER: 'IEC Member',
  ULB_OFFICER: 'ULB Officer',
  EMPLOYEE: 'Employee',
  HMS_SUPER_ADMIN: 'Super Admin',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role.toUpperCase()] || role.replace(/_/g, ' ');
}

export function uniqueUserCount(users: OverviewUser[]): number {
  return new Set(users.map((user) => user.id)).size;
}

export function roleCounts(users: OverviewUser[]): { role: string; label: string; count: number }[] {
  const groups = new Map<string, Set<string>>();
  for (const user of users) {
    const role = user.role.toUpperCase();
    if (!groups.has(role)) groups.set(role, new Set());
    groups.get(role)!.add(user.id);
  }
  return Array.from(groups, ([role, ids]) => ({ role, label: roleLabel(role), count: ids.size }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function pendingRequests(requests: OverviewRequest[]): OverviewRequest[] {
  return requests.filter((request) => request.status?.toUpperCase() === 'PENDING');
}

export function moduleLabel(name: string): string {
  const labels: Record<string, string> = {
    SWEEPING: 'Sweeping', LITTERBINS: 'Twinbin', TOILET: 'Toilet', NALA: 'Nala',
    GVP: 'GVP', TASKFORCE: 'Inspection & Performance', PROCESSING_PLANT: 'Processing Plant',
    WARD_RANKING: 'Ward Ranking', WORKFORCE_ATTENDANCE: 'Workforce Attendance',
    MRF: 'MRF',
  };
  return labels[name.toUpperCase()] || name.replace(/_/g, ' ');
}
