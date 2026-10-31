/**
 * MatrixTrack 2.0 - Deterministic Sample Fixtures
 *
 * Provides rich, realistic data covering >= 3 cities, 90-day inspection records,
 * multi-cycle IEC cleanliness issues, plant logs, attendance records, audit events,
 * and active sessions.
 */

import {
  City,
  Zone,
  Ward,
  Area,
  Beat,
  User,
  OperationalReport,
  IecCleanlinessIssue,
  AttendanceRecord,
  PlantLog,
  AuditLogEvent,
  ActiveSession,
  Target
} from '../types';

export const INITIAL_CITIES: City[] = [
  {
    id: 'city_indore',
    name: 'Indore Municipal Corporation',
    state: 'Madhya Pradesh',
    division: 'Indore Division',
    district: 'Indore',
    cityCode: 'IND',
    ulbCode: 'ULB-MP-001',
    status: 'active',
    adminIds: ['usr_cityadmin_indore'],
    enabledProducts: ['municipal_operations', 'swachh_assessment', 'workforce_monitoring', 'plant_processing'],
    enabledModules: ['sweeping', 'toilets', 'litter_bins', 'nala', 'ctu_gvp'],
    population: 3250000,
    areaSqKm: 530,
    totalWards: 85,
    totalZones: 19,
    centerCoordinates: [22.7196, 75.8577],
    createdAt: '2025-04-10T09:00:00Z',
    updatedAt: '2026-10-25T14:30:00Z'
  },
  {
    id: 'city_surat',
    name: 'Surat Municipal Corporation',
    state: 'Gujarat',
    division: 'Surat Division',
    district: 'Surat',
    cityCode: 'SUR',
    ulbCode: 'ULB-GJ-002',
    status: 'active',
    adminIds: ['usr_cityadmin_surat'],
    enabledProducts: ['municipal_operations', 'swachh_assessment', 'workforce_monitoring', 'plant_processing'],
    enabledModules: ['sweeping', 'toilets', 'litter_bins', 'nala', 'ctu_gvp'],
    population: 4500000,
    areaSqKm: 462,
    totalWards: 38,
    totalZones: 9,
    centerCoordinates: [21.1702, 72.8311],
    createdAt: '2025-06-15T11:00:00Z',
    updatedAt: '2026-10-20T10:15:00Z'
  },
  {
    id: 'city_bhopal',
    name: 'Bhopal Municipal Corporation',
    state: 'Madhya Pradesh',
    division: 'Bhopal Division',
    district: 'Bhopal',
    cityCode: 'BHO',
    ulbCode: 'ULB-MP-003',
    status: 'active',
    adminIds: ['usr_cityadmin_bhopal'],
    enabledProducts: ['municipal_operations', 'workforce_monitoring'],
    enabledModules: ['sweeping', 'toilets', 'litter_bins', 'nala'], // ctu_gvp disabled
    population: 2100000,
    areaSqKm: 416,
    totalWards: 66,
    totalZones: 14,
    centerCoordinates: [23.2599, 77.4126],
    createdAt: '2025-08-01T10:00:00Z',
    updatedAt: '2026-10-18T16:45:00Z'
  },
  {
    id: 'city_ujjain_soft_deleted',
    name: 'Ujjain Municipal Corporation',
    state: 'Madhya Pradesh',
    division: 'Ujjain Division',
    district: 'Ujjain',
    cityCode: 'UJJ',
    ulbCode: 'ULB-MP-008',
    status: 'inactive',
    adminIds: [],
    enabledProducts: ['municipal_operations'],
    enabledModules: ['sweeping', 'toilets'],
    population: 580000,
    areaSqKm: 151,
    totalWards: 54,
    totalZones: 6,
    centerCoordinates: [23.1765, 75.7885],
    createdAt: '2025-09-01T08:00:00Z',
    updatedAt: '2026-10-15T11:20:00Z',
    isDeleted: true,
    deletedAt: '2026-10-15T11:20:00Z',
    deletedBy: 'Anand Verma (Super Admin)',
    deletionReason: 'Pre-merger administrative restructuring and duplicate tenant decommission.'
  }
];

export const INITIAL_ZONES: Zone[] = [
  // Indore Zones
  { id: 'zone_ind_1', cityId: 'city_indore', name: 'Zone 1 - Central Historic', zoneNumber: 1, headOfficerId: 'usr_ulb_indore', totalWards: 5, status: 'active' },
  { id: 'zone_ind_2', cityId: 'city_indore', name: 'Zone 2 - Palasia / Eastern', zoneNumber: 2, headOfficerId: 'usr_ulb_indore', totalWards: 5, status: 'active' },
  { id: 'zone_ind_3', cityId: 'city_indore', name: 'Zone 3 - Vijay Nagar / Northern', zoneNumber: 3, headOfficerId: 'usr_ulb_indore', totalWards: 6, status: 'active' },
  { id: 'zone_ind_4', cityId: 'city_indore', name: 'Zone 4 - Rajendra Nagar / SW', zoneNumber: 4, headOfficerId: 'usr_ulb_indore', totalWards: 4, status: 'active' },
  // Surat Zones
  { id: 'zone_sur_1', cityId: 'city_surat', name: 'Zone 1 - Central Zone (Kot)', zoneNumber: 1, headOfficerId: 'usr_ulb_surat', totalWards: 4, status: 'active' },
  { id: 'zone_sur_2', cityId: 'city_surat', name: 'Zone 2 - Rander (West)', zoneNumber: 2, headOfficerId: 'usr_ulb_surat', totalWards: 4, status: 'active' },
  // Bhopal Zones
  { id: 'zone_bho_1', cityId: 'city_bhopal', name: 'Zone 1 - Old City / Lake View', zoneNumber: 1, headOfficerId: 'usr_ulb_bhopal', totalWards: 5, status: 'active' },
  { id: 'zone_bho_2', cityId: 'city_bhopal', name: 'Zone 2 - MP Nagar / Commercial', zoneNumber: 2, headOfficerId: 'usr_ulb_bhopal', totalWards: 5, status: 'active' }
];

export const INITIAL_WARDS: Ward[] = [
  // Indore Wards (Zone 1)
  { id: 'ward_ind_101', cityId: 'city_indore', zoneId: 'zone_ind_1', wardNumber: 1, name: 'Rajwada - Sarafa Chowk', population: 38400, areaSqKm: 4.8, darogaId: 'usr_daroga_vikram', inspectorId: 'usr_qc_devendra', status: 'active' },
  { id: 'ward_ind_102', cityId: 'city_indore', zoneId: 'zone_ind_1', wardNumber: 2, name: 'Malharganj - Bada Sarafa', population: 42100, areaSqKm: 5.2, darogaId: 'usr_daroga_manoj', inspectorId: 'usr_qc_devendra', status: 'active' },
  { id: 'ward_ind_103', cityId: 'city_indore', zoneId: 'zone_ind_1', wardNumber: 3, name: 'Chhatribagh - Cloth Market', population: 36200, areaSqKm: 3.9, darogaId: 'usr_daroga_kailash', inspectorId: 'usr_qc_rupesh', status: 'active' },
  // Indore Wards (Zone 2)
  { id: 'ward_ind_201', cityId: 'city_indore', zoneId: 'zone_ind_2', wardNumber: 11, name: 'Palasia - Old Chhavani', population: 49500, areaSqKm: 6.4, darogaId: 'usr_daroga_hardeep', inspectorId: 'usr_qc_rupesh', status: 'active' },
  { id: 'ward_ind_202', cityId: 'city_indore', zoneId: 'zone_ind_2', wardNumber: 12, name: 'Geeta Bhawan - Manoramaganj', population: 45000, areaSqKm: 5.8, darogaId: 'usr_daroga_santosh', inspectorId: 'usr_qc_nitin', status: 'active' },
  // Surat Wards
  { id: 'ward_sur_101', cityId: 'city_surat', zoneId: 'zone_sur_1', wardNumber: 1, name: 'Chowk Bazaar - Nanpura', population: 52000, areaSqKm: 5.1, darogaId: 'usr_daroga_vikram', inspectorId: 'usr_qc_devendra', status: 'active' },
  { id: 'ward_sur_102', cityId: 'city_surat', zoneId: 'zone_sur_1', wardNumber: 2, name: 'Athwa Lines - Ring Road', population: 58000, areaSqKm: 6.2, darogaId: 'usr_daroga_manoj', inspectorId: 'usr_qc_rupesh', status: 'active' },
  // Bhopal Wards
  { id: 'ward_bho_101', cityId: 'city_bhopal', zoneId: 'zone_bho_1', wardNumber: 1, name: 'VIP Road - Upper Lake', population: 34000, areaSqKm: 4.5, darogaId: 'usr_daroga_kailash', inspectorId: 'usr_qc_nitin', status: 'active' },
  { id: 'ward_bho_102', cityId: 'city_bhopal', zoneId: 'zone_bho_1', wardNumber: 2, name: 'New Market - TT Nagar', population: 41000, areaSqKm: 5.0, darogaId: 'usr_daroga_santosh', inspectorId: 'usr_qc_nitin', status: 'active' }
];

export const INITIAL_AREAS: Area[] = [
  { id: 'area_ind_101_a', cityId: 'city_indore', wardId: 'ward_ind_101', name: 'Rajwada Palace Precinct', type: 'commercial' },
  { id: 'area_ind_101_b', cityId: 'city_indore', wardId: 'ward_ind_101', name: 'Sarafa Night Food Street', type: 'market' },
  { id: 'area_ind_102_a', cityId: 'city_indore', wardId: 'ward_ind_102', name: 'Malharganj Residential Pocket', type: 'residential' },
  { id: 'area_ind_201_a', cityId: 'city_indore', wardId: 'ward_ind_201', name: 'AB Road Corridor East', type: 'commercial' }
];

export const INITIAL_BEATS: Beat[] = [
  {
    id: 'beat_ind_101_1',
    cityId: 'city_indore',
    zoneId: 'zone_ind_1',
    wardId: 'ward_ind_101',
    areaId: 'area_ind_101_a',
    beatNumber: 'B-101',
    name: 'Rajwada Main Promenade & Gopal Mandir',
    lengthKm: 1.8,
    startPoint: 'Gopal Mandir Chowk',
    endPoint: 'Rajwada Main Gate',
    startCoords: [22.7188, 75.8569],
    endCoords: [22.7197, 75.8576],
    assignedDarogaId: 'usr_daroga_vikram',
    assignedEmployeeIds: ['usr_emp_ramesh', 'usr_emp_sunita'],
    status: 'active',
    shift: 'morning',
    priority: 'high'
  },
  {
    id: 'beat_ind_101_2',
    cityId: 'city_indore',
    zoneId: 'zone_ind_1',
    wardId: 'ward_ind_101',
    areaId: 'area_ind_101_b',
    beatNumber: 'B-102',
    name: 'Sarafa Jewellers Market & Food Alley',
    lengthKm: 1.4,
    startPoint: 'Sarafa Police Chowki',
    endPoint: 'Khajuri Market Corner',
    startCoords: [22.7176, 75.8558],
    endCoords: [22.7182, 75.8549],
    assignedDarogaId: 'usr_daroga_vikram',
    assignedEmployeeIds: ['usr_emp_gopal', 'usr_emp_kanta'],
    status: 'active',
    shift: 'morning',
    priority: 'high'
  },
  {
    id: 'beat_ind_102_1',
    cityId: 'city_indore',
    zoneId: 'zone_ind_1',
    wardId: 'ward_ind_102',
    areaId: 'area_ind_102_a',
    beatNumber: 'B-103',
    name: 'Malharganj Vegetable Market & Subhash Marg',
    lengthKm: 2.1,
    startPoint: 'Malharganj Main Circle',
    endPoint: 'Subhash Marg Link',
    startCoords: [22.7225, 75.8512],
    endCoords: [22.7239, 75.8501],
    assignedDarogaId: 'usr_daroga_manoj',
    assignedEmployeeIds: ['usr_emp_suresh'],
    status: 'active',
    shift: 'morning',
    priority: 'medium'
  },
  {
    id: 'beat_ind_201_1',
    cityId: 'city_indore',
    zoneId: 'zone_ind_2',
    wardId: 'ward_ind_201',
    areaId: 'area_ind_201_a',
    beatNumber: 'B-201',
    name: 'Palasia AB Road BRTS Service Lane',
    lengthKm: 2.6,
    startPoint: 'Geeta Bhawan Square',
    endPoint: 'Palasia Thana Square',
    startCoords: [22.7245, 75.8821],
    endCoords: [22.7268, 75.8856],
    assignedDarogaId: 'usr_daroga_hardeep',
    assignedEmployeeIds: ['usr_emp_bhagwan', 'usr_emp_leela'],
    status: 'active',
    shift: 'morning',
    priority: 'high'
  }
];

export const INITIAL_USERS: User[] = [
  // Super Admins
  {
    id: 'usr_superadmin_1',
    name: 'Anand Verma',
    email: 'anand.verma@matrixtrack.gov.in',
    phone: '+91 98260 11223',
    role: 'HMS_SUPER_ADMIN',
    status: 'active',
    createdAt: '2025-01-01T00:00:00Z',
    lastActiveAt: '2026-10-29T00:35:00Z'
  },
  {
    id: 'usr_superadmin_2',
    name: 'Dr. Neha Trivedi',
    email: 'neha.trivedi@matrixtrack.gov.in',
    phone: '+91 94250 88990',
    role: 'HMS_SUPER_ADMIN',
    status: 'active',
    createdAt: '2025-02-15T00:00:00Z',
    lastActiveAt: '2026-10-28T19:20:00Z'
  },
  // City Admins
  {
    id: 'usr_cityadmin_indore',
    name: 'Rajeshwar Sen',
    email: 'cityadmin.indore@matrixtrack.gov.in',
    phone: '+91 98270 44321',
    role: 'CITY_ADMIN',
    cityId: 'city_indore',
    status: 'active',
    customCapabilities: ['uploadAttendance'],
    createdAt: '2025-04-10T10:00:00Z',
    lastActiveAt: '2026-10-29T00:40:00Z'
  },
  {
    id: 'usr_cityadmin_surat',
    name: 'Ketan Parekh',
    email: 'cityadmin.surat@matrixtrack.gov.in',
    phone: '+91 98980 55667',
    role: 'CITY_ADMIN',
    cityId: 'city_surat',
    status: 'active',
    customCapabilities: ['uploadAttendance'],
    createdAt: '2025-06-15T10:00:00Z',
    lastActiveAt: '2026-10-28T18:10:00Z'
  },
  {
    id: 'usr_cityadmin_bhopal',
    name: 'Mohit Saxena',
    email: 'cityadmin.bhopal@matrixtrack.gov.in',
    phone: '+91 94251 77889',
    role: 'CITY_ADMIN',
    cityId: 'city_bhopal',
    status: 'active',
    customCapabilities: ['uploadAttendance'],
    createdAt: '2025-08-01T10:00:00Z',
    lastActiveAt: '2026-10-28T14:45:00Z'
  },
  // ULB Officers
  {
    id: 'usr_ulb_indore',
    name: 'Sunil Joshi',
    email: 'ulbofficer.indore@matrixtrack.gov.in',
    phone: '+91 98263 33221',
    role: 'ULB_OFFICER',
    cityId: 'city_indore',
    status: 'active',
    createdAt: '2025-04-12T10:00:00Z',
    lastActiveAt: '2026-10-29T00:30:00Z'
  },
  {
    id: 'usr_ulb_surat',
    name: 'Alok Mehta',
    email: 'ulbofficer.surat@matrixtrack.gov.in',
    phone: '+91 98795 22114',
    role: 'ULB_OFFICER',
    cityId: 'city_surat',
    status: 'active',
    createdAt: '2025-06-20T10:00:00Z',
    lastActiveAt: '2026-10-28T17:15:00Z'
  },
  {
    id: 'usr_ulb_bhopal',
    name: 'Priya Deshmukh',
    email: 'ulbofficer.bhopal@matrixtrack.gov.in',
    phone: '+91 94254 99881',
    role: 'ULB_OFFICER',
    cityId: 'city_bhopal',
    status: 'active',
    createdAt: '2025-08-05T10:00:00Z',
    lastActiveAt: '2026-10-28T16:00:00Z'
  },
  // Commissioners
  {
    id: 'usr_comm_indore',
    name: 'Pratibha Pal (IAS)',
    email: 'commissioner.indore@matrixtrack.gov.in',
    phone: '+91 94250 10001',
    role: 'COMMISSIONER',
    cityId: 'city_indore',
    status: 'active',
    customCapabilities: ['uploadAttendance'], // Configurable attendance upload capability enabled
    createdAt: '2025-04-10T09:00:00Z',
    lastActiveAt: '2026-10-28T22:00:00Z'
  },
  {
    id: 'usr_comm_surat',
    name: 'Shalini Agarwal (IAS)',
    email: 'commissioner.surat@matrixtrack.gov.in',
    phone: '+91 98251 20002',
    role: 'COMMISSIONER',
    cityId: 'city_surat',
    status: 'active',
    createdAt: '2025-06-15T09:00:00Z',
    lastActiveAt: '2026-10-28T21:15:00Z'
  },
  {
    id: 'usr_comm_bhopal',
    name: 'KVS Choudhary (IAS)',
    email: 'commissioner.bhopal@matrixtrack.gov.in',
    phone: '+91 94252 30003',
    role: 'COMMISSIONER',
    cityId: 'city_bhopal',
    status: 'active',
    createdAt: '2025-08-01T09:00:00Z',
    lastActiveAt: '2026-10-27T19:00:00Z'
  },
  // Staff - Daroga (Supervisors)
  {
    id: 'usr_daroga_vikram',
    name: 'Vikram Singh',
    email: 'vikram.singh@imc.gov.in',
    phone: '+91 98261 44556',
    role: 'SUPERVISOR',
    cityId: 'city_indore',
    assignedZoneIds: ['zone_ind_1'],
    assignedWardIds: ['ward_ind_101'],
    assignedBeatIds: ['beat_ind_101_1', 'beat_ind_101_2'],
    status: 'active',
    createdAt: '2025-05-01T08:00:00Z',
    lastActiveAt: '2026-10-29T00:15:00Z'
  },
  {
    id: 'usr_daroga_manoj',
    name: 'Manoj Tiwari',
    email: 'manoj.tiwari@imc.gov.in',
    phone: '+91 98262 55667',
    role: 'SUPERVISOR',
    cityId: 'city_indore',
    assignedZoneIds: ['zone_ind_1'],
    assignedWardIds: ['ward_ind_102'],
    assignedBeatIds: ['beat_ind_102_1'],
    status: 'active',
    createdAt: '2025-05-01T08:00:00Z',
    lastActiveAt: '2026-10-28T16:30:00Z'
  },
  {
    id: 'usr_daroga_kailash',
    name: 'Kailash Patidar',
    email: 'kailash.p@imc.gov.in',
    phone: '+91 98263 66778',
    role: 'SUPERVISOR',
    cityId: 'city_indore',
    assignedZoneIds: ['zone_ind_1'],
    assignedWardIds: ['ward_ind_103'],
    status: 'active',
    createdAt: '2025-05-01T08:00:00Z',
    lastActiveAt: '2026-10-28T15:45:00Z'
  },
  {
    id: 'usr_daroga_hardeep',
    name: 'Hardeep Ahirwar',
    email: 'hardeep.a@imc.gov.in',
    phone: '+91 98264 77889',
    role: 'SUPERVISOR',
    cityId: 'city_indore',
    assignedZoneIds: ['zone_ind_2'],
    assignedWardIds: ['ward_ind_201'],
    assignedBeatIds: ['beat_ind_201_1'],
    status: 'active',
    createdAt: '2025-05-01T08:00:00Z',
    lastActiveAt: '2026-10-28T17:00:00Z'
  },
  {
    id: 'usr_daroga_santosh',
    name: 'Santosh Malviya',
    email: 'santosh.m@imc.gov.in',
    phone: '+91 98265 88990',
    role: 'SUPERVISOR',
    cityId: 'city_indore',
    assignedZoneIds: ['zone_ind_2'],
    assignedWardIds: ['ward_ind_202'],
    status: 'active',
    createdAt: '2025-05-01T08:00:00Z',
    lastActiveAt: '2026-10-28T18:20:00Z'
  },
  // Staff - Sanitary Inspectors (QC)
  {
    id: 'usr_qc_devendra',
    name: 'Devendra Verma',
    email: 'devendra.v@imc.gov.in',
    phone: '+91 98266 11335',
    role: 'QC',
    cityId: 'city_indore',
    assignedZoneIds: ['zone_ind_1'],
    assignedWardIds: ['ward_ind_101', 'ward_ind_102'],
    status: 'active',
    createdAt: '2025-04-20T08:00:00Z',
    lastActiveAt: '2026-10-28T20:10:00Z'
  },
  {
    id: 'usr_qc_rupesh',
    name: 'Rupesh Sahu',
    email: 'rupesh.sahu@imc.gov.in',
    phone: '+91 98267 22446',
    role: 'QC',
    cityId: 'city_indore',
    assignedZoneIds: ['zone_ind_1', 'zone_ind_2'],
    assignedWardIds: ['ward_ind_103', 'ward_ind_201'],
    status: 'active',
    createdAt: '2025-04-20T08:00:00Z',
    lastActiveAt: '2026-10-28T19:50:00Z'
  },
  {
    id: 'usr_qc_nitin',
    name: 'Nitin Rathore',
    email: 'nitin.rathore@imc.gov.in',
    phone: '+91 98268 33557',
    role: 'QC',
    cityId: 'city_indore',
    assignedZoneIds: ['zone_ind_2'],
    assignedWardIds: ['ward_ind_202'],
    status: 'active',
    createdAt: '2025-04-20T08:00:00Z',
    lastActiveAt: '2026-10-28T17:30:00Z'
  },
  // Staff - IEC Members (Action Officers)
  {
    id: 'usr_iec_meenakshi',
    name: 'Meenakshi Vyas',
    email: 'meenakshi.vyas@imc.gov.in',
    phone: '+91 98269 44668',
    role: 'ACTION_OFFICER',
    cityId: 'city_indore',
    assignedZoneIds: ['zone_ind_1'],
    status: 'active',
    createdAt: '2025-05-10T08:00:00Z',
    lastActiveAt: '2026-10-28T16:15:00Z'
  },
  {
    id: 'usr_iec_gaurav',
    name: 'Gaurav Chouhan',
    email: 'gaurav.c@imc.gov.in',
    phone: '+91 98271 55779',
    role: 'ACTION_OFFICER',
    cityId: 'city_indore',
    assignedZoneIds: ['zone_ind_2'],
    status: 'active',
    createdAt: '2025-05-10T08:00:00Z',
    lastActiveAt: '2026-10-28T15:20:00Z'
  },
  // Staff - Field Employees
  { id: 'usr_emp_ramesh', name: 'Ramesh Yadav', email: 'ramesh.yadav@staff.imc.in', phone: '+91 97551 10001', role: 'EMPLOYEE', cityId: 'city_indore', assignedZoneIds: ['zone_ind_1'], assignedWardIds: ['ward_ind_101'], assignedBeatIds: ['beat_ind_101_1'], status: 'active', createdAt: '2025-05-15T08:00:00Z' },
  { id: 'usr_emp_sunita', name: 'Sunita Bai', email: 'sunita.bai@staff.imc.in', phone: '+91 97551 10002', role: 'EMPLOYEE', cityId: 'city_indore', assignedZoneIds: ['zone_ind_1'], assignedWardIds: ['ward_ind_101'], assignedBeatIds: ['beat_ind_101_1'], status: 'active', createdAt: '2025-05-15T08:00:00Z' },
  { id: 'usr_emp_gopal', name: 'Gopal Das', email: 'gopal.das@staff.imc.in', phone: '+91 97551 10003', role: 'EMPLOYEE', cityId: 'city_indore', assignedZoneIds: ['zone_ind_1'], assignedWardIds: ['ward_ind_101'], assignedBeatIds: ['beat_ind_101_2'], status: 'active', createdAt: '2025-05-15T08:00:00Z' },
  { id: 'usr_emp_kanta', name: 'Kanta Devi', email: 'kanta.devi@staff.imc.in', phone: '+91 97551 10004', role: 'EMPLOYEE', cityId: 'city_indore', assignedZoneIds: ['zone_ind_1'], assignedWardIds: ['ward_ind_101'], assignedBeatIds: ['beat_ind_101_2'], status: 'active', createdAt: '2025-05-15T08:00:00Z' },
  { id: 'usr_emp_suresh', name: 'Suresh Kumar', email: 'suresh.k@staff.imc.in', phone: '+91 97551 10005', role: 'EMPLOYEE', cityId: 'city_indore', assignedZoneIds: ['zone_ind_1'], assignedWardIds: ['ward_ind_102'], assignedBeatIds: ['beat_ind_102_1'], status: 'active', createdAt: '2025-05-15T08:00:00Z' },
  { id: 'usr_emp_bhagwan', name: 'Bhagwan Das', email: 'bhagwan.das@staff.imc.in', phone: '+91 97551 10006', role: 'EMPLOYEE', cityId: 'city_indore', assignedZoneIds: ['zone_ind_2'], assignedWardIds: ['ward_ind_201'], assignedBeatIds: ['beat_ind_201_1'], status: 'active', createdAt: '2025-05-15T08:00:00Z' },
  { id: 'usr_emp_leela', name: 'Leela Bai', email: 'leela.bai@staff.imc.in', phone: '+91 97551 10007', role: 'EMPLOYEE', cityId: 'city_indore', assignedZoneIds: ['zone_ind_2'], assignedWardIds: ['ward_ind_201'], assignedBeatIds: ['beat_ind_201_1'], status: 'active', createdAt: '2025-05-15T08:00:00Z' },
  // Registration Requests / Inactive / Soft deleted demo users
  {
    id: 'usr_pending_amitabh',
    name: 'Amitabh Dubey',
    email: 'amitabh.dubey@indore.gov.in',
    phone: '+91 98260 99887',
    role: 'SUPERVISOR',
    cityId: 'city_indore',
    assignedZoneIds: ['zone_ind_1'],
    assignedWardIds: ['ward_ind_103'],
    status: 'pending_approval',
    createdAt: '2026-10-27T14:10:00Z'
  },
  {
    id: 'usr_correct_farhan',
    name: 'Farhan Khan',
    email: 'farhan.khan@indore.gov.in',
    phone: '+91 98260 77665',
    role: 'QC',
    cityId: 'city_indore',
    assignedZoneIds: ['zone_ind_2'],
    status: 'needs_correction',
    rejectionRemarks: 'Submitted photo ID copy blurred. Re-upload municipal health inspector badge.',
    createdAt: '2026-10-26T09:30:00Z'
  },
  {
    id: 'usr_soft_deleted_demo',
    name: 'Rakesh Chouhan (Ex-Daroga)',
    email: 'rakesh.c.inactive@imc.gov.in',
    phone: '+91 98260 33441',
    role: 'SUPERVISOR',
    cityId: 'city_indore',
    status: 'inactive',
    createdAt: '2025-05-01T08:00:00Z',
    isDeleted: true,
    deletedAt: '2026-10-18T10:00:00Z',
    deletedBy: 'Rajeshwar Sen (City Admin)',
    deletionReason: 'Transferred to State Rural Water & Sanitation Mission'
  }
];

export const INITIAL_OPERATIONAL_REPORTS: OperationalReport[] = [
  // 1. Approved Sweeping Report
  {
    id: 'rep_swp_101',
    reportNumber: 'SWP-2026-1029-01',
    cityId: 'city_indore',
    zoneId: 'zone_ind_1',
    wardId: 'ward_ind_101',
    beatId: 'beat_ind_101_1',
    moduleId: 'sweeping',
    assetName: 'Rajwada Main Promenade & Gopal Mandir (Beat B-101)',
    coordinates: [22.7196, 75.8577],
    inspectionDate: '2026-10-29',
    submittedAt: '2026-10-29T07:15:00+05:30',
    submittedByUserId: 'usr_daroga_vikram',
    submittedByName: 'Vikram Singh',
    submittedByRole: 'SUPERVISOR',
    assignedDarogaId: 'usr_daroga_vikram',
    assignedDarogaName: 'Vikram Singh (Daroga)',
    reviewerId: 'usr_qc_devendra',
    reviewerName: 'Devendra Verma (Sanitary Inspector)',
    reviewerRole: 'Sanitary Inspector',
    reviewedAt: '2026-10-29T08:30:00+05:30',
    status: 'approved',
    overallScore: 94,
    cycleNumber: 1,
    questions: [
      { questionId: 'q_swp_1', question: 'Was morning primary sweeping completed before 07:00 AM?', category: 'Timing & Attendance', answerType: 'boolean', answerValue: true, score: 25, maxScore: 25, remarks: 'Completed at 06:45 AM with 2 staff members' },
      { questionId: 'q_swp_2', question: 'Litter density rating on curbstones and pedestrian walkways', category: 'Cleanliness Quality', answerType: 'rating', answerValue: 'Grade A - No visible litter', score: 25, maxScore: 25, remarks: 'Spotless pavement along Rajwada gate' },
      { questionId: 'q_swp_3', question: 'Were segregated waste bags cleared and deposited at secondary transfer point?', category: 'Waste Transfer', answerType: 'boolean', answerValue: true, score: 24, maxScore: 25, remarks: 'Tipper truck IND-09-5412 loaded at 07:10 AM' },
      { questionId: 'q_swp_4', question: 'Were stormwater drain grating edges cleared of dry leaves and plastic wrappers?', category: 'Drain Mouths', answerType: 'boolean', answerValue: true, score: 20, maxScore: 25, remarks: '6 inlet grills cleared' }
    ],
    photos: [
      { url: 'evidence_sweeping_rajwada_before', caption: 'Initial inspection at Gopal Mandir Chowk before dawn sweeping', timestamp: '2026-10-29 06:05 IST', type: 'before' },
      { url: 'evidence_sweeping_rajwada_after', caption: 'Post-sweeping verified pavement at Rajwada facade', timestamp: '2026-10-29 07:12 IST', type: 'after' }
    ],
    timeline: [
      { id: 'tl_1', timestamp: '2026-10-29 06:00 IST', action: 'Shift Rollcall & Beat Assignment', actorName: 'Vikram Singh', actorRole: 'Daroga', remarks: 'Staff deployed with safety jackets and brooms' },
      { id: 'tl_2', timestamp: '2026-10-29 07:15 IST', action: 'Inspection Report Submitted', actorName: 'Vikram Singh', actorRole: 'Daroga', statusBefore: 'pending_submission', statusAfter: 'pending_review' },
      { id: 'tl_3', timestamp: '2026-10-29 08:30 IST', action: 'Field QC Spot Check Approved', actorName: 'Devendra Verma', actorRole: 'Sanitary Inspector', remarks: 'Physical spot inspection verified Grade A quality. Pavements pristine.', statusBefore: 'pending_review', statusAfter: 'approved' }
    ]
  },
  // 2. Toilet Report - Rejected initially, eligible for ULB Escalation
  {
    id: 'rep_tlt_102',
    reportNumber: 'TLT-2026-1028-04',
    cityId: 'city_indore',
    zoneId: 'zone_ind_1',
    wardId: 'ward_ind_101',
    moduleId: 'toilets',
    assetId: 'ast_tlt_sarafa',
    assetName: 'Public Convenience Complex - Sarafa Market (CT-04)',
    coordinates: [22.7182, 75.8554],
    inspectionDate: '2026-10-28',
    submittedAt: '2026-10-28T11:20:00+05:30',
    submittedByUserId: 'usr_daroga_vikram',
    submittedByName: 'Vikram Singh',
    submittedByRole: 'SUPERVISOR',
    assignedDarogaId: 'usr_daroga_vikram',
    assignedDarogaName: 'Vikram Singh (Daroga)',
    reviewerId: 'usr_qc_devendra',
    reviewerName: 'Devendra Verma (Sanitary Inspector)',
    reviewerRole: 'Sanitary Inspector',
    reviewedAt: '2026-10-28T12:45:00+05:30',
    status: 'rejected',
    overallScore: 42,
    cycleNumber: 1,
    questions: [
      { questionId: 'q_tlt_1', question: 'Continuous running water in all 6 cubicles and wash basins?', category: 'Plumbing & Water', answerType: 'boolean', answerValue: false, score: 5, maxScore: 25, remarks: 'Low overhead tank pressure in female unit cubicles 2 & 3' },
      { questionId: 'q_tlt_2', question: 'Odor rating score on 1-5 scale (1: strong foul odor, 5: neutral/fresh)?', category: 'Hygiene & Odor', answerType: 'rating', answerValue: '2 - Noticeable urine odor', score: 10, maxScore: 25, remarks: 'Exhaust fan belt broken' },
      { questionId: 'q_tlt_3', question: 'Liquid handwash dispenser refilled and operational?', category: 'Supplies', answerType: 'boolean', answerValue: true, score: 20, maxScore: 25, remarks: 'Soap dispenser filled' },
      { questionId: 'q_tlt_4', question: 'Floor dry and free from stagnant puddles?', category: 'Cleanliness', answerType: 'boolean', answerValue: false, score: 7, maxScore: 25, remarks: 'Floor wet near urinal channel drain' }
    ],
    photos: [
      { url: 'evidence_toilet_wet_floor', caption: 'Urinal drain blockage creating stagnant water near entrance', timestamp: '2026-10-28 11:15 IST', type: 'before' }
    ],
    timeline: [
      { id: 'tl_t1', timestamp: '2026-10-28 11:20 IST', action: 'Daily Midday Inspection Submitted', actorName: 'Vikram Singh', actorRole: 'Daroga', statusBefore: 'pending_submission', statusAfter: 'pending_review' },
      { id: 'tl_t2', timestamp: '2026-10-28 12:45 IST', action: 'QC Review Rejected with Notice', actorName: 'Devendra Verma', actorRole: 'Sanitary Inspector', remarks: 'Plumbing defect and odor unacceptable for high-density market facility. Requires pump repair and deep bleaching wash.', statusBefore: 'pending_review', statusAfter: 'rejected' }
    ]
  },
  // 3. Litter Bins Report - Pending Review
  {
    id: 'rep_bin_103',
    reportNumber: 'BIN-2026-1029-08',
    cityId: 'city_indore',
    zoneId: 'zone_ind_1',
    wardId: 'ward_ind_102',
    moduleId: 'litter_bins',
    assetId: 'ast_bin_malharganj_12',
    assetName: 'Twin Litter Bin Unit (Dry/Wet) - Malharganj Chowk',
    coordinates: [22.7231, 75.8519],
    inspectionDate: '2026-10-29',
    submittedAt: '2026-10-29T08:10:00+05:30',
    submittedByUserId: 'usr_daroga_manoj',
    submittedByName: 'Manoj Tiwari',
    submittedByRole: 'SUPERVISOR',
    assignedDarogaId: 'usr_daroga_manoj',
    assignedDarogaName: 'Manoj Tiwari (Daroga)',
    reviewerId: 'usr_qc_devendra',
    reviewerName: 'Devendra Verma (Sanitary Inspector)',
    reviewerRole: 'Sanitary Inspector',
    status: 'pending_review',
    overallScore: 82,
    cycleNumber: 1,
    questions: [
      { questionId: 'q_bin_1', question: 'Bin fill level percentage prior to morning tipper collection', category: 'Fill Level', answerType: 'select', answerValue: '40% - 60% Capacity', score: 20, maxScore: 25, remarks: 'Normal market accumulation' },
      { questionId: 'q_bin_2', question: 'Structural integrity of bin housing and locking mechanism intact?', category: 'Asset Condition', answerType: 'boolean', answerValue: true, score: 25, maxScore: 25, remarks: 'Green and blue FRP bins intact' },
      { questionId: 'q_bin_3', question: 'Cleanliness of 5-meter radius surrounding the twin bin installation?', category: 'Surroundings', answerType: 'boolean', answerValue: true, score: 22, maxScore: 25, remarks: 'Swept clean by worker Suresh' },
      { questionId: 'q_bin_4', question: 'Is QR code scanning plate readable and unscratched?', category: 'Digital Asset Tag', answerType: 'boolean', answerValue: true, score: 15, maxScore: 25, remarks: 'IMC QR asset tag scanned successfully' }
    ],
    photos: [
      { url: 'evidence_bin_cleared', caption: 'Twin bin post-morning clearance at Malharganj junction', timestamp: '2026-10-29 08:08 IST', type: 'after' }
    ],
    timeline: [
      { id: 'tl_b1', timestamp: '2026-10-29 08:10 IST', action: 'Morning Bin Clearance Inspection Submitted', actorName: 'Manoj Tiwari', actorRole: 'Daroga', statusBefore: 'pending_submission', statusAfter: 'pending_review' }
    ]
  },
  // 4. Nala Report - Action Required (Escalated)
  {
    id: 'rep_nal_104',
    reportNumber: 'NAL-2026-1027-02',
    cityId: 'city_indore',
    zoneId: 'zone_ind_1',
    wardId: 'ward_ind_103',
    moduleId: 'nala',
    assetId: 'ast_nal_chhatribagh_main',
    assetName: 'Chhatribagh Stormwater Main Channel (Section 2B)',
    coordinates: [22.7155, 75.8502],
    inspectionDate: '2026-10-27',
    submittedAt: '2026-10-27T10:00:00+05:30',
    submittedByUserId: 'usr_daroga_kailash',
    submittedByName: 'Kailash Patidar',
    submittedByRole: 'SUPERVISOR',
    assignedDarogaId: 'usr_daroga_kailash',
    assignedDarogaName: 'Kailash Patidar (Daroga)',
    reviewerId: 'usr_qc_rupesh',
    reviewerName: 'Rupesh Sahu (Sanitary Inspector)',
    reviewerRole: 'Sanitary Inspector',
    reviewedAt: '2026-10-27T11:40:00+05:30',
    status: 'action_required',
    overallScore: 54,
    cycleNumber: 1,
    escalationReason: 'Heavy silt choking beneath culvert archway causing backflow into low-lying residential lanes.',
    correctiveInstructions: 'Deploy JCB excavator and desilting squad within 24 hours to clear culvert opening.',
    questions: [
      { questionId: 'q_nal_1', question: 'Free water flow along monitored channel section without stagnant backwater?', category: 'Hydraulic Flow', answerType: 'boolean', answerValue: false, score: 10, maxScore: 25, remarks: 'Flow obstructed by construction debris and plastic' },
      { questionId: 'q_nal_2', question: 'Silt depth percentage relative to total drain invert depth?', category: 'Silt Accumulation', answerType: 'select', answerValue: 'Above 40% (Choked)', score: 12, maxScore: 25, remarks: 'Estimated silt depth 0.8m' },
      { questionId: 'q_nal_3', question: 'Embankment walls and stone pitching intact without erosion cracks?', category: 'Structural', answerType: 'boolean', answerValue: true, score: 20, maxScore: 25, remarks: 'Masonry wall intact' },
      { questionId: 'q_nal_4', question: 'Absence of direct untreated sewage inlets or broken sewer line leaks?', category: 'Pollution', answerType: 'boolean', answerValue: false, score: 12, maxScore: 25, remarks: 'Minor graywater overflow observed from lane 4' }
    ],
    photos: [
      { url: 'evidence_nala_silt_choke', caption: 'Chhatribagh culvert inlet silt accumulation and plastic trap', timestamp: '2026-10-27 09:55 IST', type: 'before' }
    ],
    timeline: [
      { id: 'tl_n1', timestamp: '2026-10-27 10:00 IST', action: 'Bi-Weekly Drain Inspection Logged', actorName: 'Kailash Patidar', actorRole: 'Daroga', statusBefore: 'pending_submission', statusAfter: 'pending_review' },
      { id: 'tl_n2', timestamp: '2026-10-27 11:40 IST', action: 'QC Flagged Critical Obstruction', actorName: 'Rupesh Sahu', actorRole: 'Sanitary Inspector', remarks: 'Requires heavy desilting machinery.', statusBefore: 'pending_review', statusAfter: 'rejected' },
      { id: 'tl_n3', timestamp: '2026-10-27 14:15 IST', action: 'ULB Officer Escalated to Action Required', actorName: 'Sunil Joshi', actorRole: 'ULB Officer', remarks: 'Urgent desilting notice issued to Zone 1 Engineering & Sanitation squad.', statusBefore: 'rejected', statusAfter: 'action_required' }
    ]
  },
  // 5. CTU/GVP Transformation Report - Action Taken
  {
    id: 'rep_gvp_105',
    reportNumber: 'GVP-2026-1026-03',
    cityId: 'city_indore',
    zoneId: 'zone_ind_2',
    wardId: 'ward_ind_201',
    moduleId: 'ctu_gvp',
    assetId: 'ast_gvp_palasia_bridge',
    assetName: 'Palasia Bridge Underpass Garbage Vulnerable Point (GVP #09)',
    coordinates: [22.7258, 75.8834],
    inspectionDate: '2026-10-26',
    submittedAt: '2026-10-26T09:30:00+05:30',
    submittedByUserId: 'usr_daroga_hardeep',
    submittedByName: 'Hardeep Ahirwar',
    submittedByRole: 'SUPERVISOR',
    assignedDarogaId: 'usr_daroga_hardeep',
    assignedDarogaName: 'Hardeep Ahirwar (Daroga)',
    reviewerId: 'usr_qc_rupesh',
    reviewerName: 'Rupesh Sahu (Sanitary Inspector)',
    reviewerRole: 'Sanitary Inspector',
    reviewedAt: '2026-10-26T16:00:00+05:30',
    status: 'action_taken',
    overallScore: 92,
    cycleNumber: 2,
    actionTakenRemarks: 'Cleared 3.4 tons of mixed municipal solid waste, fenced perimeter with galvanized grill, painted Warli civic art mural, and planted 40 flowering bougainvillea pots.',
    actionTakenAt: '2026-10-28T15:30:00+05:30',
    questions: [
      { questionId: 'q_gvp_1', question: 'Is the designated vulnerable location 100% free of open waste accumulation?', category: 'Waste Removal', answerType: 'boolean', answerValue: true, score: 25, maxScore: 25, remarks: 'Zero waste remaining on site' },
      { questionId: 'q_gvp_2', question: 'Has physical beautification/protective fencing or community art been installed?', category: 'Transformation', answerType: 'boolean', answerValue: true, score: 25, maxScore: 25, remarks: 'Decorative fence and wall art installed' },
      { questionId: 'q_gvp_3', question: 'Is active monitoring or CCTV surveillance present to prevent relapse dumping?', category: 'Surveillance', answerType: 'boolean', answerValue: true, score: 22, maxScore: 25, remarks: 'Smart City pole camera 22-A covering junction' },
      { questionId: 'q_gvp_4', question: 'Has door-to-door collection vehicle timing been synchronized with local shops?', category: 'Prevention', answerType: 'boolean', answerValue: true, score: 20, maxScore: 25, remarks: 'Collection tipper arrives twice daily at 09:30 and 19:00' }
    ],
    photos: [
      { url: 'evidence_gvp_palasia_before', caption: 'Chronic dumping hotspot beneath bridge prior to intervention', timestamp: '2026-10-20 08:30 IST', type: 'before' },
      { url: 'evidence_gvp_palasia_after', caption: 'Completed transformation: planters, wall mural, clean sidewalk', timestamp: '2026-10-28 15:20 IST', type: 'after' }
    ],
    timeline: [
      { id: 'tl_g1', timestamp: '2026-10-20 08:30 IST', action: 'GVP Identified & Transformation Plan Approved', actorName: 'Hardeep Ahirwar', actorRole: 'Daroga', statusBefore: 'identified', statusAfter: 'action_required' },
      { id: 'tl_g2', timestamp: '2026-10-26 09:30 IST', action: 'Interim Progress Report', actorName: 'Hardeep Ahirwar', actorRole: 'Daroga', remarks: 'Waste cleared; fencing underway.' },
      { id: 'tl_g3', timestamp: '2026-10-28 15:30 IST', action: 'Corrective Action Completed & Certified', actorName: 'Rupesh Sahu', actorRole: 'Sanitary Inspector', remarks: 'Site inspection verified full beautification.', statusBefore: 'action_required', statusAfter: 'action_taken' }
    ]
  }
];

export const INITIAL_IEC_CLEANLINESS_ISSUES: IecCleanlinessIssue[] = [
  // Issue 1: Pending ULB Review (with before and after evidence, Daroga inspection, QC SI decision)
  {
    id: 'iec_issue_201',
    ticketNumber: 'IEC-IND-2026-0891',
    cityId: 'city_indore',
    zoneId: 'zone_ind_1',
    wardId: 'ward_ind_101',
    locationAddress: 'Behind Sarafa Police Station, lane towards Gopal Mandir',
    coordinates: [22.7189, 75.8562],
    reportedDate: '2026-10-27 15:30 IST',
    reportedBy: 'Kailash Chhabra (IEC Citizen App Volunteer)',
    complaintDescription: 'Heavy accumulation of commercial packing boxes, thermocol and rotting food waste dumped in narrow lane.',
    category: 'garbage_dump',
    priority: 'high',
    assignedDarogaId: 'usr_daroga_vikram',
    assignedDarogaName: 'Vikram Singh (Daroga)',
    sanitaryInspectorId: 'usr_qc_devendra',
    sanitaryInspectorName: 'Devendra Verma (Sanitary Inspector)',
    status: 'pending_review',
    currentCycle: 1,
    deadlineTimestamp: '2026-10-29 15:30 IST',
    attemptsCount: 1,
    gpsDistanceMeters: 8.5,
    beforePhotos: [
      { url: 'iec_waste_sarafa_before', caption: 'Citizen complaint photo: Commercial boxes and loose trash blocking alley', timestamp: '2026-10-27 15:28 IST' }
    ],
    afterPhotos: [
      { url: 'iec_waste_sarafa_after', caption: 'Daroga Vikram Singh field clearance photo with GPS geotag: Alley completely swept', timestamp: '2026-10-28 09:45 IST' }
    ],
    qcDecision: 'verified_clean',
    qcRemarks: 'Physical spot check completed on 2026-10-28 at 11:15 AM. Waste fully removed and area sprinkled with lime powder. Recommended for closure.',
    reopeningRequests: [],
    timeline: [
      { id: 't_iec_1', timestamp: '2026-10-27 15:30 IST', action: 'Citizen Grievance Registered', actorName: 'Kailash Chhabra', actorRole: 'IEC Citizen Reporter', remarks: 'GPS Coordinates accurate within 6m' },
      { id: 't_iec_2', timestamp: '2026-10-27 16:00 IST', action: 'Auto-Assigned to Ward Daroga', actorName: 'System Engine', actorRole: 'Workflow Dispatch', remarks: 'Assigned to Vikram Singh (Daroga - Ward 1)' },
      { id: 't_iec_3', timestamp: '2026-10-28 09:45 IST', action: 'Daroga Cleared Site & Uploaded After-Photo', actorName: 'Vikram Singh', actorRole: 'Daroga', remarks: 'Removed 1.2 tons of cardboard & organic refuse via mini tipper IND-09-5412' },
      { id: 't_iec_4', timestamp: '2026-10-28 11:15 IST', action: 'Sanitary Inspector Verified Clean', actorName: 'Devendra Verma', actorRole: 'Sanitary Inspector', remarks: 'Site verified clean. Escalated to ULB Officer for final closure approval.', statusBefore: 'in_progress', statusAfter: 'pending_review' }
    ]
  },
  // Issue 2: Reopening Request Pending Decision (has active reopening request with 24h deadline)
  {
    id: 'iec_issue_202',
    ticketNumber: 'IEC-IND-2026-0744',
    cityId: 'city_indore',
    zoneId: 'zone_ind_1',
    wardId: 'ward_ind_102',
    locationAddress: 'Subhash Marg near Malharganj Main Bus Stop',
    coordinates: [22.7238, 75.8505],
    reportedDate: '2026-10-24 10:15 IST',
    reportedBy: 'Anita Sharma (Ward Committee Member)',
    complaintDescription: 'Broken masonry debris and garden waste piled on pedestrian walkway forcing people onto active traffic road.',
    category: 'debris',
    priority: 'urgent',
    assignedDarogaId: 'usr_daroga_manoj',
    assignedDarogaName: 'Manoj Tiwari (Daroga)',
    sanitaryInspectorId: 'usr_qc_devendra',
    sanitaryInspectorName: 'Devendra Verma (Sanitary Inspector)',
    status: 'action_required',
    currentCycle: 1,
    deadlineTimestamp: '2026-10-29 18:00 IST',
    attemptsCount: 2,
    gpsDistanceMeters: 14.2,
    beforePhotos: [
      { url: 'iec_debris_malharganj_before', caption: 'Initial complaint: Concrete chunks and tree branches on footpath', timestamp: '2026-10-24 10:12 IST' }
    ],
    afterPhotos: [
      { url: 'iec_debris_malharganj_partial', caption: 'Attempt 1 photo: Garden branches cleared, but heavy concrete rubble remains', timestamp: '2026-10-25 14:00 IST' }
    ],
    qcDecision: 'incomplete_work',
    qcRemarks: 'Daroga cleared green waste but left approximately 200kg of sharp concrete demolition chunks. Not acceptable.',
    reopeningRequests: [
      {
        id: 'reopen_req_901',
        requestedAt: '2026-10-28 16:20 IST',
        requestedBy: 'Anita Sharma (Ward Committee Member)',
        reason: 'Contractor cleared light branches but dumped the heavy concrete blocks behind the transformer. The footpath is still dangerously obstructed.',
        status: 'pending'
      }
    ],
    timeline: [
      { id: 't_re_1', timestamp: '2026-10-24 10:15 IST', action: 'Grievance Registered', actorName: 'Anita Sharma', actorRole: 'Citizen Reporter' },
      { id: 't_re_2', timestamp: '2026-10-25 14:00 IST', action: 'Field Cleanup Attempt 1', actorName: 'Manoj Tiwari', actorRole: 'Daroga', remarks: 'Tractor trolley cleared branches' },
      { id: 't_re_3', timestamp: '2026-10-26 11:00 IST', action: 'SI Flagged Incomplete Work', actorName: 'Devendra Verma', actorRole: 'Sanitary Inspector', remarks: 'Concrete debris remains. Returned for correction.' },
      { id: 't_re_4', timestamp: '2026-10-28 16:20 IST', action: 'Reopening Request Submitted', actorName: 'Anita Sharma', actorRole: 'Citizen Reporter', remarks: 'Request ID reopen_req_901 created under 24-hr deadline policy.' }
    ]
  },
  // Issue 3: Approved Closed (Decision History)
  {
    id: 'iec_issue_203',
    ticketNumber: 'IEC-IND-2026-0610',
    cityId: 'city_indore',
    zoneId: 'zone_ind_2',
    wardId: 'ward_ind_201',
    locationAddress: 'Manoramaganj Lane 3, near Children Park',
    coordinates: [22.7249, 75.8841],
    reportedDate: '2026-10-22 08:30 IST',
    reportedBy: 'Dr. R. K. Saxena (Resident)',
    complaintDescription: 'Overflowing community blue bin with stray cattle spreading vegetable peels on road.',
    category: 'overflowing_bin',
    priority: 'medium',
    assignedDarogaId: 'usr_daroga_hardeep',
    assignedDarogaName: 'Hardeep Ahirwar (Daroga)',
    sanitaryInspectorId: 'usr_qc_rupesh',
    sanitaryInspectorName: 'Rupesh Sahu (Sanitary Inspector)',
    status: 'approved_closed',
    currentCycle: 1,
    deadlineTimestamp: '2026-10-23 08:30 IST',
    attemptsCount: 1,
    gpsDistanceMeters: 4.1,
    beforePhotos: [
      { url: 'iec_bin_overflow_before', caption: 'Overflowing bin and scattered waste on asphalt', timestamp: '2026-10-22 08:25 IST' }
    ],
    afterPhotos: [
      { url: 'iec_bin_overflow_after', caption: 'Bin emptied, washed and disinfected, pavement lime-washed', timestamp: '2026-10-22 14:10 IST' }
    ],
    qcDecision: 'verified_clean',
    qcRemarks: 'Immediate response. Tipper truck deployed within 3 hours. Bin sanitized and surroundings washed.',
    ulbRemarks: 'Verified satisfactory by ULB Officer Sunil Joshi. Complaint closed in public portal.',
    reopeningRequests: [],
    timeline: [
      { id: 't_cl_1', timestamp: '2026-10-22 08:30 IST', action: 'Complaint Logged', actorName: 'Dr. R. K. Saxena', actorRole: 'Citizen' },
      { id: 't_cl_2', timestamp: '2026-10-22 14:10 IST', action: 'Action Completed', actorName: 'Hardeep Ahirwar', actorRole: 'Daroga' },
      { id: 't_cl_3', timestamp: '2026-10-22 16:30 IST', action: 'QC Inspection Certified', actorName: 'Rupesh Sahu', actorRole: 'Sanitary Inspector' },
      { id: 't_cl_4', timestamp: '2026-10-23 09:00 IST', action: 'Approved and Closed by ULB Officer', actorName: 'Sunil Joshi', actorRole: 'ULB Officer', remarks: 'Satisfactory resolution within SLA of 24h.' }
    ]
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  // Indore Date: 2026-10-29
  { id: 'att_01', cityId: 'city_indore', date: '2026-10-29', userId: 'usr_emp_ramesh', userName: 'Ramesh Yadav', role: 'EMPLOYEE', zoneId: 'zone_ind_1', wardId: 'ward_ind_101', shift: 'morning', status: 'present', checkInTime: '06:02 IST', checkOutTime: '14:05 IST', source: 'app_geofence', verifiedBy: 'Vikram Singh (Daroga)' },
  { id: 'att_02', cityId: 'city_indore', date: '2026-10-29', userId: 'usr_emp_sunita', userName: 'Sunita Bai', role: 'EMPLOYEE', zoneId: 'zone_ind_1', wardId: 'ward_ind_101', shift: 'morning', status: 'present', checkInTime: '05:58 IST', checkOutTime: '14:00 IST', source: 'app_geofence', verifiedBy: 'Vikram Singh (Daroga)' },
  { id: 'att_03', cityId: 'city_indore', date: '2026-10-29', userId: 'usr_emp_gopal', userName: 'Gopal Das', role: 'EMPLOYEE', zoneId: 'zone_ind_1', wardId: 'ward_ind_101', shift: 'morning', status: 'present', checkInTime: '06:10 IST', checkOutTime: '14:00 IST', source: 'biometric', verifiedBy: 'Vikram Singh (Daroga)' },
  { id: 'att_04', cityId: 'city_indore', date: '2026-10-29', userId: 'usr_emp_kanta', userName: 'Kanta Devi', role: 'EMPLOYEE', zoneId: 'zone_ind_1', wardId: 'ward_ind_101', shift: 'morning', status: 'late', checkInTime: '06:42 IST', checkOutTime: '14:00 IST', source: 'biometric', verifiedBy: 'Vikram Singh (Daroga)' },
  { id: 'att_05', cityId: 'city_indore', date: '2026-10-29', userId: 'usr_emp_suresh', userName: 'Suresh Kumar', role: 'EMPLOYEE', zoneId: 'zone_ind_1', wardId: 'ward_ind_102', shift: 'morning', status: 'present', checkInTime: '06:05 IST', checkOutTime: '14:00 IST', source: 'app_geofence', verifiedBy: 'Manoj Tiwari (Daroga)' },
  { id: 'att_06', cityId: 'city_indore', date: '2026-10-29', userId: 'usr_emp_bhagwan', userName: 'Bhagwan Das', role: 'EMPLOYEE', zoneId: 'zone_ind_2', wardId: 'ward_ind_201', shift: 'morning', status: 'present', checkInTime: '06:00 IST', checkOutTime: '14:00 IST', source: 'app_geofence', verifiedBy: 'Hardeep Ahirwar (Daroga)' },
  { id: 'att_07', cityId: 'city_indore', date: '2026-10-29', userId: 'usr_emp_leela', userName: 'Leela Bai', role: 'EMPLOYEE', zoneId: 'zone_ind_2', wardId: 'ward_ind_201', shift: 'morning', status: 'leave', source: 'manual_upload', verifiedBy: 'Hardeep Ahirwar (Daroga)' },
  { id: 'att_08', cityId: 'city_indore', date: '2026-10-29', userId: 'usr_daroga_vikram', userName: 'Vikram Singh', role: 'SUPERVISOR', zoneId: 'zone_ind_1', wardId: 'ward_ind_101', shift: 'morning', status: 'present', checkInTime: '05:45 IST', checkOutTime: '14:30 IST', source: 'app_geofence', verifiedBy: 'Devendra Verma (QC)' },
  { id: 'att_09', cityId: 'city_indore', date: '2026-10-29', userId: 'usr_qc_devendra', userName: 'Devendra Verma', role: 'QC', zoneId: 'zone_ind_1', wardId: 'ward_ind_101', shift: 'morning', status: 'present', checkInTime: '06:00 IST', checkOutTime: '14:00 IST', source: 'biometric', verifiedBy: 'Sunil Joshi (ULB Officer)' }
];

export const INITIAL_PLANT_LOGS: PlantLog[] = [
  {
    id: 'plant_log_01',
    plantId: 'plant_ind_mrf_1',
    plantName: 'Devguradia Central MRF & Dry Waste Sorting Plant',
    type: 'mrf',
    cityId: 'city_indore',
    date: '2026-10-29',
    incomingTons: 420.5,
    processedTons: 395.0,
    recoveredTons: 88.2, // recyclables
    rejectedTons: 42.8,  // RDF / non-recyclable
    disposedTons: 264.0, // organic / residue
    capacityTonsPerDay: 450,
    operatingHours: 19.5,
    powerConsumptionKwh: 3840,
    status: 'operating',
    notes: 'Optical sorter line 2 operating at peak 94% efficiency.'
  },
  {
    id: 'plant_log_02',
    plantId: 'plant_ind_bio_1',
    plantName: 'Kabitkhedi Bio-CNG & Wet Waste Processing Facility',
    type: 'compost',
    cityId: 'city_indore',
    date: '2026-10-29',
    incomingTons: 510.0,
    processedTons: 495.0,
    recoveredTons: 112.0, // bio-CNG & organic compost
    rejectedTons: 18.0,   // inert contamination
    disposedTons: 365.0,  // digestate
    capacityTonsPerDay: 550,
    operatingHours: 24.0,
    powerConsumptionKwh: 4920,
    status: 'operating',
    notes: 'Produced 18,200 kg of purified compressed bio-gas (CBG) supplied to city bus fleet.'
  },
  {
    id: 'plant_log_03',
    plantId: 'plant_ind_cnd_1',
    plantName: 'Bada Bangarda C&D Waste Recycling Plant',
    type: 'c_and_d',
    cityId: 'city_indore',
    date: '2026-10-29',
    incomingTons: 180.0,
    processedTons: 165.0,
    recoveredTons: 125.0, // manufactured sand and paver blocks
    rejectedTons: 15.0,
    disposedTons: 25.0,
    capacityTonsPerDay: 200,
    operatingHours: 16.0,
    powerConsumptionKwh: 1980,
    status: 'operating',
    notes: 'Manufactured 4,200 heavy-duty interlocking municipal sidewalk pavers.'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEvent[] = [
  {
    id: 'aud_101',
    timestamp: '2026-10-29 00:30:15 IST',
    actorId: 'usr_superadmin_1',
    actorName: 'Anand Verma',
    actorRole: 'HMS_SUPER_ADMIN',
    cityId: 'city_indore',
    cityName: 'Indore Municipal Corporation',
    action: 'MODULE_CONFIG_UPDATE',
    moduleOrProduct: 'ctu_gvp',
    platform: 'web',
    details: 'Verified municipal transformation pipeline for GVP sites in Zone 1 & 2.',
    changesBefore: { enabled: true, auditVersion: 1.1 },
    changesAfter: { enabled: true, auditVersion: 1.2 }
  },
  {
    id: 'aud_102',
    timestamp: '2026-10-28 16:35:10 IST',
    actorId: 'usr_ulb_indore',
    actorName: 'Sunil Joshi',
    actorRole: 'ULB_OFFICER',
    cityId: 'city_indore',
    cityName: 'Indore Municipal Corporation',
    action: 'IEC_ISSUE_STATUS_UPDATE',
    moduleOrProduct: 'cleanliness_issues',
    platform: 'web',
    details: 'Reviewed and closed citizen complaint IEC-IND-2026-0610 after verified spot cleanup.',
    changesBefore: { status: 'pending_review' },
    changesAfter: { status: 'approved_closed' }
  },
  {
    id: 'aud_103',
    timestamp: '2026-10-28 14:15:22 IST',
    actorId: 'usr_cityadmin_indore',
    actorName: 'Rajeshwar Sen',
    actorRole: 'CITY_ADMIN',
    cityId: 'city_indore',
    cityName: 'Indore Municipal Corporation',
    action: 'BEAT_ASSIGNMENT_UPDATE',
    moduleOrProduct: 'sweeping',
    platform: 'web',
    details: 'Assigned Daroga Vikram Singh to Beat B-101 and B-102 morning shifts.',
    changesBefore: { assignedDarogaId: null },
    changesAfter: { assignedDarogaId: 'usr_daroga_vikram' }
  }
];

export const INITIAL_ACTIVE_SESSIONS: ActiveSession[] = [
  {
    id: 'sess_1',
    userId: 'usr_superadmin_1',
    userName: 'Anand Verma',
    role: 'HMS_SUPER_ADMIN',
    platform: 'web',
    device: 'MacBook Pro 16" (macOS 15.2)',
    browser: 'Chrome 131.0',
    ipAddress: '103.21.144.18',
    startedAt: '2026-10-29 00:05 IST',
    lastActiveAt: '2026-10-29 00:42 IST',
    status: 'active'
  },
  {
    id: 'sess_2',
    userId: 'usr_cityadmin_indore',
    userName: 'Rajeshwar Sen',
    role: 'CITY_ADMIN',
    cityId: 'city_indore',
    cityName: 'Indore',
    platform: 'web',
    device: 'Dell Precision Tower (Windows 11)',
    browser: 'Edge 130.0',
    ipAddress: '14.139.240.2',
    startedAt: '2026-10-28 23:45 IST',
    lastActiveAt: '2026-10-29 00:39 IST',
    status: 'active'
  },
  {
    id: 'sess_3',
    userId: 'usr_ulb_indore',
    userName: 'Sunil Joshi',
    role: 'ULB_OFFICER',
    cityId: 'city_indore',
    cityName: 'Indore',
    platform: 'web',
    device: 'HP EliteBook 840 (Windows 11)',
    browser: 'Firefox 132.0',
    ipAddress: '14.139.240.19',
    startedAt: '2026-10-28 22:10 IST',
    lastActiveAt: '2026-10-29 00:30 IST',
    status: 'active'
  },
  {
    id: 'sess_4',
    userId: 'usr_daroga_vikram',
    userName: 'Vikram Singh',
    role: 'SUPERVISOR (Daroga)',
    cityId: 'city_indore',
    cityName: 'Indore',
    platform: 'mobile_app',
    device: 'Samsung Galaxy A54 (Android 14)',
    browser: 'MatrixTrack Field Agent v2.4.1',
    ipAddress: '223.187.89.44',
    startedAt: '2026-10-29 05:40 IST',
    lastActiveAt: '2026-10-29 07:15 IST',
    status: 'active'
  }
];

export const INITIAL_TARGETS: Target[] = [
  {
    id: 'tgt_01',
    cityId: 'city_indore',
    targetType: 'sweeping_km',
    period: 'daily',
    targetValue: 12.0,
    achievedValue: 11.4,
    assignedRole: 'SUPERVISOR',
    assignedUserId: 'usr_daroga_vikram',
    zoneId: 'zone_ind_1',
    wardId: 'ward_ind_101',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    status: 'on_track'
  },
  {
    id: 'tgt_02',
    cityId: 'city_indore',
    targetType: 'cleanliness_score',
    period: 'monthly',
    targetValue: 90.0,
    achievedValue: 94.0,
    assignedRole: 'QC',
    assignedUserId: 'usr_qc_devendra',
    zoneId: 'zone_ind_1',
    wardId: 'ward_ind_101',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    status: 'achieved'
  },
  {
    id: 'tgt_03',
    cityId: 'city_indore',
    targetType: 'toilet_inspections',
    period: 'daily',
    targetValue: 8,
    achievedValue: 6,
    assignedRole: 'SUPERVISOR',
    assignedUserId: 'usr_daroga_manoj',
    zoneId: 'zone_ind_1',
    wardId: 'ward_ind_102',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    status: 'lagging'
  }
];
