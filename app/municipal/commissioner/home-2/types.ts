export type WorkState =
  | 'NOT_REPORTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTION_REQUIRED'
  | 'ACTION_TAKEN';

export type OperationalRole =
  | 'SUPERVISOR'
  | 'QC'
  | 'ACTION_OFFICER'
  | 'ULB_OFFICER'
  | 'EMPLOYEE';

export type AssignedSupervisor = {
  id: string;
  name: string;
};

export type MapActor = {
  id: string;
  name: string;
  role: OperationalRole;
};

export type WorkflowEvent = {
  key: string;
  label: string;
  status?: WorkState | null;
  at?: string | null;
  actor?: MapActor | null;
  detail?: string | null;
  completed: boolean;
};

export type WorkflowTimes = {
  reportedAt?: string | null;
  reviewedAt?: string | null;
  actionRequiredAt?: string | null;
  actionTakenAt?: string | null;
};
export type AssetWorkflow = {
  supervisor?: MapActor | null;
  si?: MapActor | null;
  iecMember?: MapActor | null;
  reporter?: MapActor | null;
  events: WorkflowEvent[];
};

export type BeatMapItem = {
  id: string;
  name: string;
  code?: string | null;
  zoneId: string;
  zoneName: string;
  wardId: string;
  wardName: string;
  geometry: any;
  state: WorkState;
  reportedSegments: number;
  totalSegments: number;
  supervisors: AssignedSupervisor[];
  actors: MapActor[];
  workflow?: AssetWorkflow;
  workflowTimes?: WorkflowTimes;
};

export type PointMapItem = {
  id: string;
  name: string;
  type?: string;
  address?: string;
  areaName?: string;
  condition?: string;
  latitude: number;
  longitude: number;
  zoneId?: string | null;
  zoneName: string;
  wardId?: string | null;
  wardName: string;
  state: WorkState;
  reportId?: string | null;
  supervisors: AssignedSupervisor[];
  actors: MapActor[];
  workflow?: AssetWorkflow;
  workflowTimes?: WorkflowTimes;
};

export type OperationsSummary = {
  total: number;
  notReported: number;
  pending: number;
  approved: number;
  rejected: number;
  actionRequired: number;
  actionTaken: number;
};

export type OperationsMapData = {
  date: string;

  city: {
    id: string;
    name: string;
  };

  filters: {
    zones: Array<{
      id: string;
      name: string;
    }>;

    wards: Array<{
      id: string;
      zoneId?: string | null;
      name: string;
    }>;

    supervisors: AssignedSupervisor[];

    roles: Array<{
      value: OperationalRole;
      label: string;
    }>;

    users: Array<{
      id: string;
      name: string;
      role: OperationalRole;
      roleLabel: string;
    }>;
  };

  summary: Record<
    'overall' | 'beats' | 'toilets' | 'bins',
    OperationsSummary
  >;

  beats: BeatMapItem[];
  toilets: PointMapItem[];
  bins: PointMapItem[];
};
