export type WorkState = 'NOT_STARTED' | 'SUBMITTED' | 'APPROVED' | 'ATTENTION';

export type AssignedSupervisor = { id: string; name: string };

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
};

export type OperationsMapData = {
  date: string;
  city: { id: string; name: string };
  filters: {
    zones: Array<{ id: string; name: string }>;
    wards: Array<{ id: string; zoneId?: string | null; name: string }>;
    supervisors: AssignedSupervisor[];
  };
  summary: Record<'overall' | 'beats' | 'toilets' | 'bins', {
    total: number;
    notStarted: number;
    submitted: number;
    approved: number;
    attention: number;
  }>;
  beats: BeatMapItem[];
  toilets: PointMapItem[];
  bins: PointMapItem[];
};
