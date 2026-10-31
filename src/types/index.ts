/**
 * MatrixTrack 2.0 - Core Domain Types & Access Model
 */

export type RoleType =
  | 'HMS_SUPER_ADMIN'
  | 'CITY_ADMIN'
  | 'ULB_OFFICER'
  | 'COMMISSIONER';

export type StaffRole =
  | 'SUPERVISOR'     // Business label: Daroga
  | 'QC'             // Business label: Sanitary Inspector
  | 'ACTION_OFFICER' // Business label: IEC Member
  | 'EMPLOYEE';      // Business label: Employee

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  SUPERVISOR: 'Daroga',
  QC: 'Sanitary Inspector',
  ACTION_OFFICER: 'IEC Member',
  EMPLOYEE: 'Employee'
};

export type Capability =
  | 'viewCity'
  | 'manageCity'
  | 'manageGeography'
  | 'manageUsers'
  | 'manageAssignments'
  | 'manageTargets'
  | 'uploadAttendance'
  | 'reviewCleanliness'
  | 'decideReopening'
  | 'escalateOperationalReport'
  | 'manageCityModules'
  | 'viewAudit'
  | 'restoreTrash'
  | 'managePlants'
  | 'exportData';

export type ProductId =
  | 'municipal_operations'
  | 'swachh_assessment'
  | 'workforce_monitoring'
  | 'plant_processing';

export type OperationalModuleId =
  | 'sweeping'
  | 'toilets'
  | 'litter_bins'
  | 'nala'
  | 'ctu_gvp';

export interface ModuleConfig {
  id: OperationalModuleId;
  name: string;
  category: 'cleaning' | 'infrastructure' | 'waste';
  icon: string;
  description: string;
  assetLabel: string;
  expectedDailyFrequency: number;
}

export interface City {
  geographyCountsAvailable?:boolean;
  populationAvailable?:boolean;
  id: string;
  name: string;
  state: string;
  division?: string;
  district: string;
  cityCode: string;
  ulbCode: string;
  status: 'active' | 'inactive';
  adminIds: string[];
  enabledProducts: ProductId[];
  enabledModules: OperationalModuleId[];
  population: number;
  areaSqKm: number;
  totalWards: number;
  totalZones: number;
  centerCoordinates: [number, number]; // [lat, lng]
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
}

export interface Zone {
  backendName?: string;
  id: string;
  cityId: string;
  name: string;
  zoneNumber: number;
  headOfficerId?: string;
  totalWards: number;
  status: 'active' | 'inactive';
}

export interface Ward {
  backendName?: string;
  id: string;
  cityId: string;
  zoneId: string;
  wardNumber: number;
  name: string;
  population: number;
  areaSqKm: number;
  darogaId?: string;
  inspectorId?: string;
  status: 'active' | 'inactive';
}

export interface Area {
  id: string;
  cityId: string;
  wardId: string;
  name: string;
  type: 'residential' | 'commercial' | 'market' | 'industrial' | 'slum' | 'religious_place' | 'tourist_area' | 'transport_hub' | 'parks_and_gardens' | 'market_area' | 'parking';
}

export interface BeatPoint { lat:number; lng:number; label:string; }
export interface Beat {
  geometry?: any;
  rawKml?: string;
  points?: BeatPoint[];
  segments?: {id:string;name?:string;segmentNumber?:number;supervisorAssignedToId?:string;supervisorAssignedToName?:string;employeeAssignedToId?:string;employeeAssignedToName?:string;geometry?:any}[];
  id: string;
  cityId: string;
  zoneId: string;
  wardId: string;
  areaId: string;
  beatNumber: string;
  name: string;
  lengthKm: number;
  startPoint: string;
  endPoint: string;
  startCoords: [number, number];
  endCoords: [number, number];
  assignedDarogaId?: string;
  assignedDarogaIds?: string[];
  assignedDarogaNames?: string[];
  assignedEmployeeIds: string[];
  status: 'active' | 'under_review' | 'inactive';
  shift: 'morning' | 'afternoon' | 'night';
  priority: 'high' | 'medium' | 'low';
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: RoleType | StaffRole;
  cityId?: string; // empty/null for Super Admin
  assignedZoneIds?: string[];
  assignedWardIds?: string[];
  assignedBeatIds?: string[];
  moduleAssignments?: {id?:string;key:string;canWrite?:boolean;zoneIds:string[];wardIds:string[]}[];
  employeeId?:string;
  employmentType?:string;
  status: 'active' | 'inactive' | 'pending_approval' | 'needs_correction' | 'rejected';
  requestedModules?:string[];
  rejectionRemarks?: string;
  customCapabilities?: Capability[];
  createdAt: string;
  lastActiveAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
}

export interface Target {
  id: string;
  cityId: string;
  targetType: 'sweeping_km' | 'inspections_count' | 'cleanliness_score' | 'toilet_inspections' | 'bin_clearances';
  period: 'daily' | 'weekly' | 'monthly';
  targetValue: number;
  achievedValue: number;
  assignedRole?: StaffRole;
  assignedUserId?: string;
  zoneId?: string;
  wardId?: string;
  startDate: string;
  endDate: string;
  status: 'on_track' | 'lagging' | 'achieved' | 'missed';
}

export interface AttendanceRecord {
  id: string;
  cityId: string;
  date: string; // YYYY-MM-DD
  userId: string;
  userName: string;
  role: StaffRole;
  zoneId: string;
  wardId: string;
  shift: 'morning' | 'afternoon' | 'night' | 'not_recorded';
  status: 'present' | 'absent' | 'late' | 'leave' | 'unmarked';
  checkInTime?: string;
  checkOutTime?: string;
  source: 'biometric' | 'app_geofence' | 'manual_upload';
  verifiedBy?: string;
}

export type InspectionStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'action_required'
  | 'action_taken'
  | 'escalated';

export interface InspectionQuestionAnswer {
  questionId: string;
  question: string;
  category: string;
  answerType: 'boolean' | 'rating' | 'select' | 'number' | 'text';
  answerValue: string | number | boolean;
  score?: number;
  maxScore?: number;
  remarks?: string;
  evidencePhotoUrl?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  actorName: string;
  actorRole: string;
  remarks?: string;
  statusBefore?: string;
  statusAfter?: string;
  evidenceUrl?: string;
}

export interface OperationalReport {
  contacts?: {id?:string;role:string;name:string;phone?:string;email?:string;source:string}[];
  currentOwnerRole?: string;
  stageSince?: string;
  qcDecision?: string;
  aiReviews?: { stage: string; decision: string; summary: string; recommendedAction?:string;reasons?:string[];summaryHi?:string;recommendedActionHi?:string;reasonsHi?:string[];generatedAt?:string;model?:string;sourceQcDecision?:string; confidence?: number; checks: { label: string; result: string; reason: string }[]; insights: string[] }[];
  decisions?: { role: string; name: string; decision: string; remarks: string; timestamp: string }[];
  backendId?: string;
  backendType?: string;
  id: string;
  reportNumber: string;
  cityId: string;
  zoneId: string;
  wardId: string;
  beatId?: string;
  moduleId: OperationalModuleId;
  assetId?: string;
  assetName: string;
  coordinates: [number, number];
  inspectionDate: string; // YYYY-MM-DD
  submittedAt: string;
  submittedByUserId: string;
  submittedByName: string;
  submittedByRole: StaffRole;
  assignedDarogaId?: string;
  assignedDarogaName?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewerRole?: string;
  reviewedAt?: string;
  status: InspectionStatus;
  overallScore: number; // 0-100
  questions: InspectionQuestionAnswer[];
  photos: {
    url: string;
    caption: string;
    timestamp: string;
    type: 'before' | 'after' | 'during' | 'corrective';
  }[];
  timeline: TimelineEvent[];
  escalationReason?: string;
  correctiveInstructions?: string;
  actionTakenRemarks?: string;
  actionTakenAt?: string;
  cycleNumber: number;
}

export interface IecCleanlinessIssue {
  inspectionId?: string;
  moduleId?: OperationalModuleId;
  canReview?: boolean;
  id: string;
  ticketNumber: string;
  cityId: string;
  zoneId: string;
  wardId: string;
  locationAddress: string;
  coordinates: [number, number];
  reportedDate: string;
  reportedBy: string; // IEC citizen / member
  complaintDescription: string;
  category: 'garbage_dump' | 'overflowing_bin' | 'open_defecation' | 'clogged_drain' | 'dead_animal' | 'debris' | 'not_specified';
  priority: 'high' | 'urgent' | 'medium' | 'not_specified';
  assignedDarogaId: string;
  assignedDarogaName: string;
  sanitaryInspectorId?: string;
  sanitaryInspectorName?: string;
  status: 'pending_review' | 'action_required' | 'approved_closed' | 'rejected' | 'reopened';
  currentCycle: number;
  deadlineTimestamp: string; // illustrative 24h deadline for reopening/re-inspection
  attemptsCount: number;
  beforePhotos: { url: string; caption: string; timestamp: string }[];
  afterPhotos: { url: string; caption: string; timestamp: string }[];
  qcDecision?: 'verified_clean' | 'incomplete_work' | 'false_report';
  qcRemarks?: string;
  ulbRemarks?: string;
  gpsDistanceMeters: number; // sample distance accuracy from original complaint
  reopeningRequests: {
    id: string;
    requestedAt: string;
    requestedBy: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    decidedAt?: string;
    decidedBy?: string;
    remarks?: string;
  }[];
  timeline: TimelineEvent[];
}

export interface PlantLog {
  id: string;
  plantId: string;
  plantName: string;
  type: 'mrf' | 'compost' | 'waste_to_energy' | 'c_and_d';
  cityId: string;
  date: string; // YYYY-MM-DD
  incomingTons: number;
  processedTons: number;
  recoveredTons: number;
  rejectedTons: number;
  disposedTons: number;
  capacityTonsPerDay: number;
  operatingHours: number;
  powerConsumptionKwh: number;
  status: 'operating' | 'maintenance' | 'idle';
  notes?: string;
}

export interface WardRankingRecord {
  wardId: string;
  wardNumber: number;
  wardName: string;
  zoneId: string;
  zoneName: string;
  cityId: string;
  rank: number;
  previousRank: number;
  totalScore: number;
  components: {
    workforce: { score: number; weight: number; details: string };
    beat: { score: number; weight: number; details: string };
    nala: { score: number; weight: number; details: string };
    toilet: { score: number; weight: number; details: string };
    litterBin: { score: number; weight: number; details: string };
    gvp: { score: number; weight: number; details: string };
    supervisor: { score: number; weight: number; details: string };
    qc: { score: number; weight: number; details: string };
    actionOfficer: { score: number; weight: number; details: string };
  };
  snapshotCutoff: string;
  coveragePercentage: number;
}

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  cityId?: string;
  cityName?: string;
  action: string;
  moduleOrProduct: string;
  platform: 'web' | 'mobile_app' | 'system';
  ipAddress?: string;
  details: string;
  changesBefore?: Record<string, any>;
  changesAfter?: Record<string, any>;
}

export interface ActiveSession {
  id: string;
  userId: string;
  userName: string;
  role: string;
  cityId?: string;
  cityName?: string;
  platform: 'web' | 'mobile_app';
  device: string;
  browser: string;
  ipAddress: string;
  startedAt: string;
  lastActiveAt: string;
  status: 'active' | 'revoked';
}

export interface FilterState {
  cityId: string; // 'all' for Super Admin or specific city
  zoneId: string; // 'all' or specific zone
  wardId: string; // 'all' or specific ward
  moduleId: string; // 'all' or specific module
  status: string; // 'all' or status
  dateRangePreset: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'previous_month' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  searchQuery: string;
  shift?: string;
  roleFilter?: string;
}
