'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { 
  Award, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Briefcase,
  Layers,
  MapPin,
  X,
  FileText,
  UserCheck,
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Users,
  Star,
  Activity,
  ArrowRight,
  Filter,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { apiFetch, GeoApi } from '@lib/apiClient';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  Legend,
  ComposedChart,
  Line
} from 'recharts';

interface WardPerformance {
  rank?: number;
  wardId: string;
  wardName: string;
  zoneId: string;
  zoneName: string;
  attendancePercentage: number;
  totalEmployees: number;
  presentEmployees: number;
  target: number;
  submitted: number;
  pending: number;
  completionPercentage: number;
  totalReports: number;
  approved: number;
  rejected: number;
  actionRequired: number;
  qcPercentage: number;
  repeatHotspots: number;
  hotspotsList: { location: string; count: number }[];
  overallScore: number;
  status: 'Good' | 'Needs Attention' | 'Critical';
  sweeping: { reports: number; approved: number; issues: number };
  toilets: { reports: number; approved: number; issues: number };
  twinbin: { reports: number; approved: number; issues: number };
  taskforce: { reports: number; approved: number; issues: number };
}

interface ZonePerformance {
  zoneId: string;
  zoneName: string;
  score: number;
  status: 'Good' | 'Needs Attention' | 'Critical';
}

interface ExceptionCardRow {
  employeeName: string;
  role: string;
  wardName: string;
  issueType: 'Absent' | 'Failed QC' | 'Critical';
  details: string;
  reportedAt: string;
}

interface EmployeePerformanceLog {
  id: string;
  name: string;
  role: string;
  wardName: string;
  zoneName: string;
  zoneId: string;
  wardId: string;
  attendanceStatus: 'Present' | 'Absent';
  punchIn: string;
  sweeping: number;
  toilet: number;
  twinbin: number;
  taskforce: number;
  totalSubmissions: number;
  approvedCount: number;
  rejectedCount: number;
  lastQcStatus: 'APPROVED' | 'REJECTED' | 'ACTION_REQUIRED' | 'N/A';
}

interface ModuleBreakdownStats {
  registered: number;
  present: number;
  absent: number;
}

interface AreaWorkforceMatrix {
  id: string;
  name: string;
  parentId?: string;
  registered: number;
  present: number;
  absent: number;
  submissions: number;
  target: number;
  targetSubmitted: number;
  completionPercentage: number;
  modules: {
    sweeping: ModuleBreakdownStats;
    toilet: ModuleBreakdownStats;
    twinbin: ModuleBreakdownStats;
    taskforce: ModuleBreakdownStats;
  };
}

interface ZoneModuleReportSubmission {
  zoneId: string;
  zoneName: string;
  sweeping: number;
  toilets: number;
  twinbin: number;
  taskforce: number;
  total: number;
}

export default function WardRankingSystemPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [selectedDate, setSelectedDate] = useState('TODAY');
  const [selectedZoneId, setSelectedZoneId] = useState('ALL');
  const [selectedWardId, setSelectedWardId] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');

  // Master Data
  const [zones, setZones] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  // Calculated Metrics
  const [wardPerformances, setWardPerformances] = useState<WardPerformance[]>([]);
  const [zonePerformances, setZonePerformances] = useState<ZonePerformance[]>([]);
  const [selectedWardDetailId, setSelectedWardDetailId] = useState<string | null>(null);
  
  // Employee Logs & Pagination
  const [employeePerformanceLogs, setEmployeePerformanceLogs] = useState<EmployeePerformanceLog[]>([]);
  const [currentEmpPage, setCurrentEmpPage] = useState(1);
  const itemsPerPage = 10;

  // Modals & Details
  const [isFullLogOpen, setIsFullLogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Zone & Ward Employee List Modals
  const [activeAreaEmployeesModal, setActiveAreaEmployeesModal] = useState<{
    areaId: string;
    areaName: string;
    areaType: 'Zone' | 'Ward';
    type: 'present' | 'absent' | 'registered';
  } | null>(null);

  // Executive KPI summary
  const [summaryStats, setSummaryStats] = useState({
    cityScore: 0,
    topWardName: 'N/A',
    topWardScore: 0,
    greenCount: 0,
    amberCount: 0,
    redCount: 0,
    avgAttendance: 0,
    bestZoneName: 'N/A',
    bestZoneScore: 0,
    worstZoneName: 'N/A',
    worstZoneScore: 0
  });

  // Global module quality sums
  const [moduleStats, setModuleStats] = useState({
    sweeping: { total: 0, approved: 0, rejected: 0, issues: 0 },
    toilets: { total: 0, approved: 0, rejected: 0, issues: 0 },
    twinbin: { total: 0, approved: 0, rejected: 0, issues: 0 },
    taskforce: { total: 0, approved: 0, rejected: 0, issues: 0 }
  });

  // Workforce stats (Present / Absent / Registered) by Module
  const [workforceStats, setWorkforceStats] = useState({
    sweeping: { registered: 0, present: 0 },
    toilet: { registered: 0, present: 0 },
    twinbin: { registered: 0, present: 0 },
    taskforce: { registered: 0, present: 0 }
  });

  // Star Performers of the Week
  const [starPerformers, setStarPerformers] = useState<EmployeePerformanceLog[]>([]);

  // Workforce Matrix lists
  const [zoneWorkforceMatrix, setZoneWorkforceMatrix] = useState<AreaWorkforceMatrix[]>([]);
  const [wardWorkforceMatrix, setWardWorkforceMatrix] = useState<AreaWorkforceMatrix[]>([]);
  const [zoneModuleReportSubmissions, setZoneModuleReportSubmissions] = useState<ZoneModuleReportSubmission[]>([]);
  const [selectedZoneVisualId, setSelectedZoneVisualId] = useState<string | null>(null);

  // Daily Exceptions
  const [exceptions, setExceptions] = useState<ExceptionCardRow[]>([]);

  // Search and Pagination States
  const [wardSearchQuery, setWardSearchQuery] = useState('');
  const [wardLeaderboardPage, setWardLeaderboardPage] = useState(1);
  const wardsPerPage = 10;

  // Top performers states
  const [topZonePerformer, setTopZonePerformer] = useState<any>(null);
  const [topWardPerformer, setTopWardPerformer] = useState<any>(null);
  const [topEmployeePerformer, setTopEmployeePerformer] = useState<any>(null);
  const [topSupervisorPerformer, setTopSupervisorPerformer] = useState<any>(null);
  const [topQcPerformer, setTopQcPerformer] = useState<any>(null);
  const [topAoPerformer, setTopAoPerformer] = useState<any>(null);
  const [activeTopPerformerModal, setActiveTopPerformerModal] = useState<
    'zone' | 'ward' | 'employee' | 'supervisor' | 'qc' | 'ao' | null
  >(null);

  // Submission Chart & Drill-down States
  const [submissionTrendData, setSubmissionTrendData] = useState<any[]>([]);
  const [activeChartTab, setActiveChartTab] = useState<'trend' | 'lifecycle'>('trend');
  const [drillDownWard, setDrillDownWard] = useState<WardPerformance | null>(null);

  const pathname = usePathname();
  const isEmployeeAttendancePage = pathname.startsWith('/ward-ranking-system/employee-attendance');

  // Collapsible Filters Panel States
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterAttendanceStatus, setFilterAttendanceStatus] = useState('ALL');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');

  // Selected Drill Down Ward for Attendance Chart
  const [selectedAttendanceWardId, setSelectedAttendanceWardId] = useState<string | null>(null);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState('');

  const loadDashboardData = async () => {
    setRefreshing(true);
    try {
      const [zoneRes, wardRes] = await Promise.all([
        GeoApi.list('ZONE').catch(() => ({ nodes: [] })),
        GeoApi.list('WARD').catch(() => ({ nodes: [] }))
      ]);

      const rawZones = zoneRes?.nodes || [];
      const liveWards = wardRes?.nodes || [];

      // Ward Ranking never invents a fixed number of zones. Use only zone nodes returned
      // by the backend for the current city, and when wards exist keep zones that actually
      // participate in the current ward hierarchy. If the city later has 3, 4, 7 or more
      // zones, the charts automatically resize from this response.
      const wardZoneIds = new Set(
        liveWards
          .map((ward: any) => String(ward.parentId || ward.parent_id || ward.parent?.id || ''))
          .filter(Boolean)
      );
      const liveZones = wardZoneIds.size > 0
        ? rawZones.filter((zone: any) => wardZoneIds.has(String(zone.id)))
        : rawZones;

      setZones(liveZones);
      setWards(liveWards);

      const zoneMap = new Map(liveZones.map((z: any) => [String(z.id), z.name]));

      if (liveWards.length === 0) {
        setWardPerformances([]);
        setZonePerformances([]);
        setEmployeePerformanceLogs([]);
        setZoneModuleReportSubmissions([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();

      if (selectedDate === 'TODAY') {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (selectedDate === 'YESTERDAY') {
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
      } else if (selectedDate === 'LAST_7_DAYS') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (selectedDate === 'LAST_30_DAYS') {
        startDate.setDate(startDate.getDate() - 30);
      }

      const dateQueryStr = startDate.toISOString().split('T')[0];
      const queryParams = new URLSearchParams({ 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });

      // Keep Submission Trend fixed to the latest 7 calendar days, independent of the dashboard filter.
      const trendEndDate = new Date();
      trendEndDate.setHours(23, 59, 59, 999);
      const trendStartDate = new Date(trendEndDate);
      trendStartDate.setDate(trendStartDate.getDate() - 6);
      trendStartDate.setHours(0, 0, 0, 0);
      const trendQueryParams = new URLSearchParams({
        startDate: trendStartDate.toISOString(),
        endDate: trendEndDate.toISOString()
      });

      const fetchAttendanceForDay = async () => {
        const pageSize = 100;
        const firstParams = new URLSearchParams({
          from: dateQueryStr,
          to: dateQueryStr,
          page: '1',
          pageSize: String(pageSize)
        });
        const first = await apiFetch<any>(`/city/attendance/dashboard?${firstParams.toString()}`).catch(() => ({ records: [], pagination: { totalPages: 0 } }));
        const records = [...(first?.records || [])];
        const totalPages = Number(first?.pagination?.totalPages || 1);

        for (let page = 2; page <= totalPages; page += 1) {
          const params = new URLSearchParams({
            from: dateQueryStr,
            to: dateQueryStr,
            page: String(page),
            pageSize: String(pageSize)
          });
          const next = await apiFetch<any>(`/city/attendance/dashboard?${params.toString()}`).catch(() => ({ records: [] }));
          records.push(...(next?.records || []));
        }

        return { records };
      };

      const [targetRes, inspectionRes, trendInspectionRes, attendanceRes, usersRes] = await Promise.all([
        apiFetch<any>(`/city/dashboard/daily-target-status?date=${dateQueryStr}`).catch(() => null),
        apiFetch<any>(`/city/dashboard/inspection-records?${queryParams.toString()}`).catch(() => ({ data: [] })),
        apiFetch<any>(`/city/dashboard/inspection-records?${trendQueryParams.toString()}`).catch(() => ({ data: [] })),
        fetchAttendanceForDay(),
        apiFetch<any>('/city/users').catch(() => ({ users: [] }))
      ]);

      const dailyTargets = targetRes?.supervisors || [];
      const inspections = inspectionRes?.data || [];
      const trendInspections = trendInspectionRes?.data || [];
      const attendanceRecords = attendanceRes?.records || [];
      const registeredUsers = usersRes?.users || [];

      const attendanceTargetStr = startDate.toISOString().split('T')[0];
      const dayAttendance = attendanceRecords.filter((r: any) => String(r.attendanceDate).startsWith(attendanceTargetStr));

      const performanceMap = new Map<string, WardPerformance>();

      liveWards.forEach((ward: any) => {
        const wardId = String(ward.id);
        const parentZoneId = String(ward.parentId || ward.parent_id || ward.parent?.id || '');
        const zoneName = zoneMap.get(parentZoneId) || 'No Zone';

        performanceMap.set(wardId, {
          wardId,
          wardName: ward.name,
          zoneId: parentZoneId,
          zoneName,
          attendancePercentage: 0,
          totalEmployees: 0,
          presentEmployees: 0,
          target: 0,
          submitted: 0,
          pending: 0,
          completionPercentage: 0,
          totalReports: 0,
          approved: 0,
          rejected: 0,
          actionRequired: 0,
          qcPercentage: 0,
          repeatHotspots: 0,
          hotspotsList: [],
          overallScore: 0,
          status: 'Critical',
          sweeping: { reports: 0, approved: 0, issues: 0 },
          toilets: { reports: 0, approved: 0, issues: 0 },
          twinbin: { reports: 0, approved: 0, issues: 0 },
          taskforce: { reports: 0, approved: 0, issues: 0 }
        });
      });

      const presentUserNames = new Set(
        dayAttendance.filter((r: any) => r.status === 'P' || r.status === 'Present').map((r: any) => String(r.employeeName).toLowerCase().trim())
      );
      const presentUserIds = new Set(
        dayAttendance.filter((r: any) => r.status === 'P' || r.status === 'Present').map((r: any) => String(r.attendanceId))
      );

      registeredUsers.forEach((u: any) => {
        if (!u.wardIds || u.wardIds.length === 0) return;
        u.wardIds.forEach((wId: string) => {
          const perf = performanceMap.get(String(wId));
          if (perf) {
            perf.totalEmployees += 1;
            const isPresent = presentUserIds.has(String(u.id)) || presentUserNames.has(u.name.toLowerCase().trim());
            if (isPresent) {
              perf.presentEmployees += 1;
            }
          }
        });
      });

      dailyTargets.forEach((t: any) => {
        const wId = String(t.wardId);
        const perf = performanceMap.get(wId);
        if (perf) {
          if (selectedModule === 'ALL' || t.module === selectedModule) {
            perf.target += t.target || 0;
            perf.submitted += t.submitted || 0;
          }
        }
      });

      const hotspotsTracker = new Map<string, Map<string, number>>();

      inspections.forEach((r: any) => {
        const wId = String(r.wardId);
        const perf = performanceMap.get(wId);
        if (!perf) return;

        const moduleKey = String(r.__module || '').toUpperCase();
        const matchesSelectedModule = selectedModule === 'ALL' ||
          moduleKey === selectedModule ||
          (selectedModule === 'TWINBIN' && moduleKey === 'LITTERBIN') ||
          (selectedModule === 'TASKFORCE' && moduleKey === 'GVP');
        if (!matchesSelectedModule) return;

        perf.totalReports += 1;
        const isApproved = r.status === 'APPROVED';
        const isRejected = r.status === 'REJECTED';
        const isActionRequired = r.status === 'ACTION_REQUIRED';

        if (isApproved) perf.approved += 1;
        if (isRejected) perf.rejected += 1;
        if (isActionRequired) perf.actionRequired += 1;
        if (moduleKey === 'SWEEPING') {
          perf.sweeping.reports += 1;
          if (isApproved) perf.sweeping.approved += 1;
          if (isRejected || isActionRequired) perf.sweeping.issues += 1;
        } else if (moduleKey === 'TOILET') {
          perf.toilets.reports += 1;
          if (isApproved) perf.toilets.approved += 1;
          if (isRejected || isActionRequired) perf.toilets.issues += 1;
        } else if (moduleKey === 'TWINBIN' || moduleKey === 'LITTERBIN') {
          perf.twinbin.reports += 1;
          if (isApproved) perf.twinbin.approved += 1;
          if (isRejected || isActionRequired) perf.twinbin.issues += 1;
        } else if (moduleKey === 'TASKFORCE' || moduleKey === 'GVP') {
          perf.taskforce.reports += 1;
          if (isApproved) perf.taskforce.approved += 1;
          if (isRejected || isActionRequired) perf.taskforce.issues += 1;
        }

        if (isRejected || isActionRequired) {
          const locName = r.locationName || r.beatName || 'Beat location';
          if (!hotspotsTracker.has(wId)) {
            hotspotsTracker.set(wId, new Map());
          }
          const wardHotspots = hotspotsTracker.get(wId)!;
          wardHotspots.set(locName, (wardHotspots.get(locName) || 0) + 1);
        }
      });

      // Zone-wise module report submission comparison.
      // This uses only actual inspection records returned by the backend for the selected date range.
      // No attendance score, estimated module allocation, or custom performance weight is applied.
      const wardToZoneId = new Map(
        liveWards.map((ward: any) => [
          String(ward.id),
          String(ward.parentId || ward.parent_id || ward.parent?.id || '')
        ])
      );
      const zoneReportMap = new Map<string, ZoneModuleReportSubmission>();
      liveZones.forEach((zone: any) => {
        const zoneId = String(zone.id);
        zoneReportMap.set(zoneId, {
          zoneId,
          zoneName: zone.name,
          sweeping: 0,
          toilets: 0,
          twinbin: 0,
          taskforce: 0,
          total: 0
        });
      });

      inspections.forEach((report: any) => {
        const wardId = String(report.wardId || '');
        if (selectedWardId !== 'ALL' && wardId !== selectedWardId) return;

        const zoneId = wardToZoneId.get(wardId) || '';
        if (!zoneId) return;
        if (selectedZoneId !== 'ALL' && zoneId !== selectedZoneId) return;

        const moduleKey = String(report.__module || '').toUpperCase();
        const matchesSelectedModule = selectedModule === 'ALL' ||
          moduleKey === selectedModule ||
          (selectedModule === 'TWINBIN' && moduleKey === 'LITTERBIN') ||
          (selectedModule === 'TASKFORCE' && moduleKey === 'GVP');
        if (!matchesSelectedModule) return;

        const row = zoneReportMap.get(zoneId);
        if (!row) return;

        if (moduleKey === 'SWEEPING') row.sweeping += 1;
        else if (moduleKey === 'TOILET') row.toilets += 1;
        else if (moduleKey === 'TWINBIN' || moduleKey === 'LITTERBIN') row.twinbin += 1;
        else if (moduleKey === 'TASKFORCE' || moduleKey === 'GVP') row.taskforce += 1;
        else return;

        row.total += 1;
      });

      const zoneSubmissionRows = Array.from(zoneReportMap.values())
        .filter((row) => selectedZoneId === 'ALL' || row.zoneId === selectedZoneId)
        .sort((a, b) => b.total - a.total || a.zoneName.localeCompare(b.zoneName));
      setZoneModuleReportSubmissions(zoneSubmissionRows);

      let totalAttendanceSum = 0;
      let totalAttendanceWards = 0;

      const calculatedWards: WardPerformance[] = Array.from(performanceMap.values()).map((perf) => {
        perf.attendancePercentage = perf.totalEmployees > 0 
          ? Math.round((perf.presentEmployees / perf.totalEmployees) * 100)
          : 0;

        if (perf.totalEmployees > 0) {
          totalAttendanceSum += perf.attendancePercentage;
          totalAttendanceWards += 1;
        }

        perf.completionPercentage = perf.target > 0
          ? Math.min(100, Math.round((perf.submitted / perf.target) * 100))
          : 0;

        perf.pending = Math.max(0, perf.target - perf.submitted);

        const qcTotal = perf.approved + perf.rejected + perf.actionRequired;
        perf.qcPercentage = qcTotal > 0
          ? Math.round((perf.approved / qcTotal) * 100)
          : 0;

        const wardHotspots = hotspotsTracker.get(perf.wardId);
        if (wardHotspots) {
          wardHotspots.forEach((cnt, loc) => {
            if (cnt >= 2) {
              perf.repeatHotspots += 1;
              perf.hotspotsList.push({ location: loc, count: cnt });
            }
          });
        }

        const attendanceScore = perf.attendancePercentage;
        const taskScore = perf.completionPercentage;
        const qcScore = perf.qcPercentage;
        const issueScore = Math.max(0, 100 - (perf.actionRequired * 10));
        const hotspotScore = Math.max(0, 100 - (perf.repeatHotspots * 20));

        const rawScore = (attendanceScore * 0.25) + (taskScore * 0.25) + (qcScore * 0.30) + (issueScore * 0.10) + (hotspotScore * 0.10);
        perf.overallScore = Math.max(0, Math.min(100, Math.round(rawScore)));

        if (perf.overallScore >= 85) {
          perf.status = 'Good';
        } else if (perf.overallScore >= 60) {
          perf.status = 'Needs Attention';
        } else {
          perf.status = 'Critical';
        }

        return perf;
      });

      const zoneGroupMap = new Map<string, { totalScore: number; count: number; name: string }>();
      calculatedWards.forEach((w) => {
        if (!w.zoneId) return;
        if (!zoneGroupMap.has(w.zoneId)) {
          zoneGroupMap.set(w.zoneId, { totalScore: 0, count: 0, name: w.zoneName });
        }
        const g = zoneGroupMap.get(w.zoneId)!;
        g.totalScore += w.overallScore;
        g.count += 1;
      });

      const calculatedZones: ZonePerformance[] = Array.from(zoneGroupMap.entries()).map(([zId, g]) => {
        const score = g.count > 0 ? Math.round(g.totalScore / g.count) : 0;
        let status: 'Good' | 'Needs Attention' | 'Critical' = 'Needs Attention';
        if (score >= 85) status = 'Good';
        else if (score < 60) status = 'Critical';

        return {
          zoneId: zId,
          zoneName: g.name,
          score,
          status
        };
      });

      calculatedZones.sort((a, b) => b.score - a.score);
      setZonePerformances(calculatedZones);

      calculatedWards.sort((a, b) => b.overallScore - a.overallScore);
      const rankedWards = calculatedWards.map((w, idx) => ({ ...w, rank: idx + 1 }));
      setWardPerformances(rankedWards);

      const greenWards = rankedWards.filter((w) => w.status === 'Good').length;
      const amberWards = rankedWards.filter((w) => w.status === 'Needs Attention').length;
      const redWards = rankedWards.filter((w) => w.status === 'Critical').length;
      const topWard = rankedWards[0];
      const cityScore = rankedWards.length > 0
        ? Math.round(rankedWards.reduce((acc, cur) => acc + cur.overallScore, 0) / rankedWards.length)
        : 0;

      const bestZone = calculatedZones[0];
      const worstZone = calculatedZones[calculatedZones.length - 1];

      setSummaryStats({
        cityScore,
        topWardName: topWard?.wardName || 'N/A',
        topWardScore: topWard?.overallScore || 0,
        greenCount: greenWards,
        amberCount: amberWards,
        redCount: redWards,
        avgAttendance: totalAttendanceWards > 0 ? Math.round(totalAttendanceSum / totalAttendanceWards) : 0,
        bestZoneName: bestZone?.zoneName || 'N/A',
        bestZoneScore: bestZone?.score || 0,
        worstZoneName: worstZone?.zoneName || 'N/A',
        worstZoneScore: worstZone?.score || 0
      });

      const globalModules = {
        sweeping: { total: 0, approved: 0, rejected: 0, issues: 0 },
        toilets: { total: 0, approved: 0, rejected: 0, issues: 0 },
        twinbin: { total: 0, approved: 0, rejected: 0, issues: 0 },
        taskforce: { total: 0, approved: 0, rejected: 0, issues: 0 }
      };

      inspections.forEach((r: any) => {
        const moduleKey = String(r.__module || '').toUpperCase();
        const isApproved = r.status === 'APPROVED';
        const isRejected = r.status === 'REJECTED';
        const isActionRequired = r.status === 'ACTION_REQUIRED';

        let targetMod: 'sweeping' | 'toilets' | 'twinbin' | 'taskforce' | null = null;
        if (moduleKey === 'SWEEPING') targetMod = 'sweeping';
        else if (moduleKey === 'TOILET') targetMod = 'toilets';
        else if (moduleKey === 'TWINBIN' || moduleKey === 'LITTERBIN') targetMod = 'twinbin';
        else if (moduleKey === 'TASKFORCE' || moduleKey === 'GVP') targetMod = 'taskforce';

        if (targetMod) {
          globalModules[targetMod].total += 1;
          if (isApproved) globalModules[targetMod].approved += 1;
          if (isRejected) globalModules[targetMod].rejected += 1;
          if (isActionRequired) globalModules[targetMod].issues += 1;
        }
      });
      setModuleStats(globalModules);

      const operationalRoles = ['EMPLOYEE', 'SUPERVISOR', 'QC', 'ACTION_OFFICER'];
      const operationalUsers = registeredUsers.filter((u: any) => operationalRoles.includes(u.role));

      // Calculate module-wise workforce stats
      const liveWorkforce = {
        sweeping: { registered: 0, present: 0 },
        toilet: { registered: 0, present: 0 },
        twinbin: { registered: 0, present: 0 },
        taskforce: { registered: 0, present: 0 }
      };

      operationalUsers.forEach((u: any) => {
        const isPresent = presentUserIds.has(String(u.id)) || presentUserNames.has(u.name.toLowerCase().trim());
        const userRecords = inspections.filter((r: any) => 
          r.employeeId === u.id || r.supervisorId === u.id ||
          String(r.employee?.name || '').toLowerCase() === u.name.toLowerCase()
        );

        let primaryMod = 'sweeping';
        if (userRecords.length > 0) {
          const mKey = String(userRecords[0].__module || '').toUpperCase();
          if (mKey === 'TOILET') primaryMod = 'toilet';
          else if (mKey === 'TWINBIN' || mKey === 'LITTERBIN') primaryMod = 'twinbin';
          else if (mKey === 'TASKFORCE' || mKey === 'GVP') primaryMod = 'taskforce';
        } else {
          if (u.designation?.toLowerCase().includes('toilet')) primaryMod = 'toilet';
          else if (u.designation?.toLowerCase().includes('bin') || u.designation?.toLowerCase().includes('litter')) primaryMod = 'twinbin';
          else if (u.designation?.toLowerCase().includes('task') || u.designation?.toLowerCase().includes('gvp')) primaryMod = 'taskforce';
        }

        if (primaryMod === 'sweeping') {
          liveWorkforce.sweeping.registered += 1;
          if (isPresent) liveWorkforce.sweeping.present += 1;
        } else if (primaryMod === 'toilet') {
          liveWorkforce.toilet.registered += 1;
          if (isPresent) liveWorkforce.toilet.present += 1;
        } else if (primaryMod === 'twinbin') {
          liveWorkforce.twinbin.registered += 1;
          if (isPresent) liveWorkforce.twinbin.present += 1;
        } else if (primaryMod === 'taskforce') {
          liveWorkforce.taskforce.registered += 1;
          if (isPresent) liveWorkforce.taskforce.present += 1;
        }
      });

      setWorkforceStats(liveWorkforce);

      const empLogs: EmployeePerformanceLog[] = operationalUsers.map((u: any, idx: number) => {
        const primaryWardId = u.wardIds && u.wardIds.length > 0 ? String(u.wardIds[0]) : '';
        const wardNode = liveWards.find((w: any) => String(w.id) === primaryWardId);
        const wName = wardNode?.name || 'Unassigned';
        const parentZoneId = wardNode ? String(wardNode.parentId || wardNode.parent_id || '') : '';
        const zName = wardNode ? (zoneMap.get(parentZoneId) || 'Unmapped Zone') : 'N/A';

        const isPresent = presentUserIds.has(String(u.id)) || presentUserNames.has(u.name.toLowerCase().trim());
        const att = dayAttendance.find((r: any) => 
          String(r.attendanceId) === String(u.id) || 
          String(r.employeeName).toLowerCase().trim() === u.name.toLowerCase().trim()
        );

        const userRecords = inspections.filter((r: any) => 
          r.employeeId === u.id || r.supervisorId === u.id || r.createdById === u.id ||
          String(r.employee?.name || '').toLowerCase() === u.name.toLowerCase()
        );

        const swp = userRecords.filter((r: any) => r.__module === 'SWEEPING').length;
        const toil = userRecords.filter((r: any) => r.__module === 'TOILET').length;
        const bin = userRecords.filter((r: any) => r.__module === 'TWINBIN' || r.__module === 'LITTERBIN').length;
        const tf = userRecords.filter((r: any) => r.__module === 'TASKFORCE' || r.__module === 'GVP').length;

        const total = userRecords.length;
        const approved = userRecords.filter((r: any) => r.status === 'APPROVED').length;
        const rejected = userRecords.filter((r: any) => r.status === 'REJECTED' || r.status === 'ACTION_REQUIRED').length;
        
        let lastQc: any = 'N/A';
        if (userRecords.length > 0) {
          lastQc = userRecords[0].status || 'N/A';
        }

        return {
          id: u.id || `emp-${idx}`,
          name: u.name,
          role: u.role === 'EMPLOYEE' ? 'Ground Staff' : u.role === 'SUPERVISOR' ? 'Supervisor' : u.role,
          wardName: wName,
          zoneName: zName,
          zoneId: parentZoneId,
          wardId: primaryWardId,
          attendanceStatus: isPresent ? 'Present' : 'Absent',
          punchIn: att?.inTime ? new Date(att.inTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
          sweeping: swp,
          toilet: toil,
          twinbin: bin,
          taskforce: tf,
          totalSubmissions: total,
          approvedCount: approved,
          rejectedCount: rejected,
          lastQcStatus: lastQc
        };
      });

      setEmployeePerformanceLogs(empLogs);

      // Calculate Weekly Star Performers
      const sortedStars = [...empLogs]
        .filter(e => e.attendanceStatus === 'Present' && e.totalSubmissions > 0)
        .sort((a, b) => b.totalSubmissions - a.totalSubmissions || b.approvedCount - a.approvedCount);
      setStarPerformers(sortedStars.slice(0, 4));

      // Calculate Zone-wise Workforce & Performance Matrix.
      // Workforce counts are mapped operational users (Employee, Supervisor, QC and Action Officer).
      // Module user counts are based only on real report activity in the selected period.
      const calculatedZoneMatrix: AreaWorkforceMatrix[] = liveZones.map((z: any) => {
        const zoneId = String(z.id);
        const zoneUsers = empLogs.filter(e => e.zoneId === zoneId);
        const zoneWards = calculatedWards.filter(w => w.zoneId === zoneId);

        const registered = zoneUsers.length;
        const present = zoneUsers.filter(e => e.attendanceStatus === 'Present').length;
        const absent = registered - present;
        const submissions = zoneWards.reduce((sum, ward) => sum + ward.totalReports, 0);
        const target = zoneWards.reduce((sum, ward) => sum + ward.target, 0);
        const targetSubmitted = zoneWards.reduce((sum, ward) => sum + ward.submitted, 0);
        const completionPercentage = target > 0
          ? Math.min(100, Math.round((targetSubmitted / target) * 100))
          : 0;

        const sweepingReg = zoneUsers.filter(e => e.sweeping > 0).length;
        const sweepingPres = zoneUsers.filter(e => e.sweeping > 0 && e.attendanceStatus === 'Present').length;
        const toiletReg = zoneUsers.filter(e => e.toilet > 0).length;
        const toiletPres = zoneUsers.filter(e => e.toilet > 0 && e.attendanceStatus === 'Present').length;
        const twinbinReg = zoneUsers.filter(e => e.twinbin > 0).length;
        const twinbinPres = zoneUsers.filter(e => e.twinbin > 0 && e.attendanceStatus === 'Present').length;
        const taskforceReg = zoneUsers.filter(e => e.taskforce > 0).length;
        const taskforcePres = zoneUsers.filter(e => e.taskforce > 0 && e.attendanceStatus === 'Present').length;

        return {
          id: zoneId,
          name: z.name,
          registered,
          present,
          absent,
          submissions,
          target,
          targetSubmitted,
          completionPercentage,
          modules: {
            sweeping: { registered: sweepingReg, present: sweepingPres, absent: sweepingReg - sweepingPres },
            toilet: { registered: toiletReg, present: toiletPres, absent: toiletReg - toiletPres },
            twinbin: { registered: twinbinReg, present: twinbinPres, absent: twinbinReg - twinbinPres },
            taskforce: { registered: taskforceReg, present: taskforcePres, absent: taskforceReg - taskforcePres }
          }
        };
      });
      setZoneWorkforceMatrix(calculatedZoneMatrix);

      // Calculate Ward-wise Workforce & Performance Matrix using exact backend-derived values.
      const calculatedWardMatrix: AreaWorkforceMatrix[] = liveWards.map((w: any) => {
        const wardId = String(w.id);
        const parentId = String(w.parentId || w.parent_id || w.parent?.id || '');
        const wardUsers = empLogs.filter(e => e.wardId === wardId);
        const wardPerformance = calculatedWards.find(perf => perf.wardId === wardId);

        const registered = wardUsers.length;
        const present = wardUsers.filter(e => e.attendanceStatus === 'Present').length;
        const absent = registered - present;
        const submissions = wardPerformance?.totalReports || 0;
        const target = wardPerformance?.target || 0;
        const targetSubmitted = wardPerformance?.submitted || 0;
        const completionPercentage = wardPerformance?.completionPercentage || 0;

        const sweepingReg = wardUsers.filter(e => e.sweeping > 0).length;
        const sweepingPres = wardUsers.filter(e => e.sweeping > 0 && e.attendanceStatus === 'Present').length;
        const toiletReg = wardUsers.filter(e => e.toilet > 0).length;
        const toiletPres = wardUsers.filter(e => e.toilet > 0 && e.attendanceStatus === 'Present').length;
        const twinbinReg = wardUsers.filter(e => e.twinbin > 0).length;
        const twinbinPres = wardUsers.filter(e => e.twinbin > 0 && e.attendanceStatus === 'Present').length;
        const taskforceReg = wardUsers.filter(e => e.taskforce > 0).length;
        const taskforcePres = wardUsers.filter(e => e.taskforce > 0 && e.attendanceStatus === 'Present').length;

        return {
          id: wardId,
          name: w.name,
          parentId,
          registered,
          present,
          absent,
          submissions,
          target,
          targetSubmitted,
          completionPercentage,
          modules: {
            sweeping: { registered: sweepingReg, present: sweepingPres, absent: sweepingReg - sweepingPres },
            toilet: { registered: toiletReg, present: toiletPres, absent: toiletReg - toiletPres },
            twinbin: { registered: twinbinReg, present: twinbinPres, absent: twinbinReg - twinbinPres },
            taskforce: { registered: taskforceReg, present: taskforcePres, absent: taskforceReg - taskforcePres }
          }
        };
      });
      setWardWorkforceMatrix(calculatedWardMatrix);

      const alertLogs: ExceptionCardRow[] = [];
      const absentSupervisors = empLogs.filter(e => e.attendanceStatus === 'Absent' && e.role === 'Supervisor');
      absentSupervisors.slice(0, 3).forEach((s) => {
        alertLogs.push({
          employeeName: s.name,
          role: s.role,
          wardName: s.wardName,
          issueType: 'Absent',
          details: "User failed to punch-in for today's shift.",
          reportedAt: '09:15 AM Today'
        });
      });

      const failedQCInspections = inspections.filter((r: any) => r.status === 'REJECTED' || r.status === 'ACTION_REQUIRED');
      failedQCInspections.slice(0, 2).forEach((f: any) => {
        const empNode = registeredUsers.find((u: any) => u.id === f.employeeId || u.id === f.supervisorId);
        const wNode = liveWards.find((w: any) => String(w.id) === String(f.wardId));
        alertLogs.push({
          employeeName: f.employee?.name || f.supervisorName || empNode?.name || 'Field Executive',
          role: empNode?.role === 'SUPERVISOR' ? 'Supervisor' : 'Ground Staff',
          wardName: wNode?.name || 'Ward 1',
          issueType: 'Failed QC',
          details: `Inspection rejected by QC: ${f.rejectionReason || 'Incomplete/unhygienic work.'}`,
          reportedAt: 'Recent Audit'
        });
      });

      setExceptions(alertLogs);

      // Top Performer Calculations - use only live values available in this dashboard feed.
      setTopZonePerformer(calculatedZones[0] || null);
      setTopWardPerformer(rankedWards[0] || null);

      const rankPeople = (rows: EmployeePerformanceLog[]) =>
        [...rows].sort(
          (a, b) =>
            b.approvedCount - a.approvedCount ||
            b.totalSubmissions - a.totalSubmissions ||
            a.name.localeCompare(b.name)
        );

      const empList = rankPeople(empLogs.filter(e => e.role === 'Ground Staff' || e.role === 'EMPLOYEE'));
      setTopEmployeePerformer(empList.some(e => e.approvedCount > 0 || e.totalSubmissions > 0) ? empList[0] : null);

      const supList = rankPeople(empLogs.filter(e => e.role === 'Supervisor' || e.role === 'SUPERVISOR'));
      setTopSupervisorPerformer(supList.some(e => e.approvedCount > 0 || e.totalSubmissions > 0) ? supList[0] : null);

      const qcList = rankPeople(empLogs.filter(e => e.role === 'QC'));
      setTopQcPerformer(qcList.some(e => e.approvedCount > 0 || e.totalSubmissions > 0) ? qcList[0] : null);

      const aoList = rankPeople(empLogs.filter(e => e.role === 'ACTION_OFFICER' || e.role === 'AO' || e.role === 'Action Officer'));
      setTopAoPerformer(aoList.some(e => e.approvedCount > 0 || e.totalSubmissions > 0) ? aoList[0] : null);

      // Build a real 7-day submission trend and keep zero-data days visible on the chart.
      const dateGroups: { [key: string]: { submissions: number; approved: number; issues: number } } = {};
      trendInspections.forEach((insp: any) => {
        const rawDate = insp.createdAt || insp.updatedAt || insp.date;
        if (!rawDate) return;
        const formattedDate = String(rawDate).split('T')[0];
        if (!dateGroups[formattedDate]) {
          dateGroups[formattedDate] = { submissions: 0, approved: 0, issues: 0 };
        }
        dateGroups[formattedDate].submissions += 1;
        if (insp.status === 'APPROVED') dateGroups[formattedDate].approved += 1;
        else if (insp.status === 'ACTION_REQUIRED' || insp.status === 'REJECTED') dateGroups[formattedDate].issues += 1;
      });

      const sevenDayTrend = Array.from({ length: 7 }, (_, index) => {
        const day = new Date(trendStartDate);
        day.setDate(trendStartDate.getDate() + index);
        const key = day.toISOString().split('T')[0];
        const stats = dateGroups[key] || { submissions: 0, approved: 0, issues: 0 };
        return {
          date: day.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          ...stats
        };
      });
      setSubmissionTrendData(sevenDayTrend);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate, selectedZoneId, selectedWardId, selectedModule]);

  const handleSelectZoneRow = (zoneId: string) => {
    setSelectedZoneId(zoneId);
  };

  const downloadCSV = () => {
    const headers = 'Name,Role,Ward,Zone,Attendance,Punch-In,Sweeping,Toilet,TwinBin,Taskforce,Total Submitted,Approved,Rejected,Last QC Result\n';
    const rows = employeePerformanceLogs.map(e => 
      `"${e.name}","${e.role}","${e.wardName}","${e.zoneName}","${e.attendanceStatus}","${e.punchIn}",${e.sweeping},${e.toilet},${e.twinbin},${e.taskforce},${e.totalSubmissions},${e.approvedCount},${e.rejectedCount},"${e.lastQcStatus}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `employee_performance_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredWards = wardPerformances.filter((w) => {
    if (selectedZoneId !== 'ALL' && w.zoneId !== selectedZoneId) return false;
    if (selectedWardId !== 'ALL' && w.wardId !== selectedWardId) return false;
    return true;
  });

  const searchedWards = filteredWards.filter((w) =>
    w.wardName.toLowerCase().includes(wardSearchQuery.toLowerCase()) ||
    w.zoneName.toLowerCase().includes(wardSearchQuery.toLowerCase())
  );

  const paginatedWards = searchedWards.slice(
    (wardLeaderboardPage - 1) * wardsPerPage,
    wardLeaderboardPage * wardsPerPage
  );

  const totalWardPages = Math.ceil(searchedWards.length / wardsPerPage);

  const activeWardDetail = wardPerformances.find(w => w.wardId === selectedWardDetailId);
  const activeEmployeeDetail = employeePerformanceLogs.find(e => e.id === selectedEmployeeId);

  // Pagination Logic
  const totalEmpPages = Math.ceil(employeePerformanceLogs.length / itemsPerPage);
  const currentEmpData = employeePerformanceLogs.slice(
    (currentEmpPage - 1) * itemsPerPage,
    currentEmpPage * itemsPerPage
  );

  // Modal Area lists
  const getModalEmployeeList = () => {
    if (!activeAreaEmployeesModal) return [];
    const { areaId, areaType, type } = activeAreaEmployeesModal;

    return employeePerformanceLogs.filter((emp) => {
      const matchesArea = areaType === 'Zone' ? emp.zoneId === areaId : emp.wardId === areaId;
      if (!matchesArea) return false;

      if (type === 'present') return emp.attendanceStatus === 'Present';
      if (type === 'absent') return emp.attendanceStatus === 'Absent';
      return true;
    });
  };

  const rankPeopleForModal = (rows: EmployeePerformanceLog[]) =>
    [...rows].sort(
      (a, b) =>
        b.approvedCount - a.approvedCount ||
        b.totalSubmissions - a.totalSubmissions ||
        a.name.localeCompare(b.name)
    );

  const filteredZoneWorkforce = zoneWorkforceMatrix.filter(
    (zone) => selectedZoneId === 'ALL' || zone.id === selectedZoneId
  );

  const zoneVisualData = filteredZoneWorkforce.map((zone) => {
    const attendanceRate = zone.registered > 0
      ? Math.round((zone.present / zone.registered) * 100)
      : 0;

    return {
      id: zone.id,
      zoneName: zone.name,
      mappedUsers: zone.registered,
      presentUsers: zone.present,
      absentUsers: zone.absent,
      attendanceRate,
      submittedReports: zone.submissions,
      targetCompletion: zone.completionPercentage,
      targetSubmitted: zone.targetSubmitted,
      target: zone.target,
      sweepingSubmitters: zone.modules.sweeping.registered,
      toiletSubmitters: zone.modules.toilet.registered,
      twinbinSubmitters: zone.modules.twinbin.registered,
      taskforceSubmitters: zone.modules.taskforce.registered,
      modules: zone.modules,
    };
  });

  const selectedZoneVisual =
    zoneVisualData.find((zone) => zone.id === selectedZoneVisualId) ||
    zoneVisualData[0] ||
    null;

  const zoneVisualTotals = zoneVisualData.reduce(
    (acc, zone) => {
      acc.mappedUsers += zone.mappedUsers;
      acc.presentUsers += zone.presentUsers;
      acc.absentUsers += zone.absentUsers;
      acc.submittedReports += zone.submittedReports;
      return acc;
    },
    { mappedUsers: 0, presentUsers: 0, absentUsers: 0, submittedReports: 0 }
  );


  const filteredWardWorkforce = wardWorkforceMatrix
    .filter((ward) => selectedZoneId === 'ALL' || ward.parentId === selectedZoneId)
    .filter((ward) => selectedWardId === 'ALL' || ward.id === selectedWardId)
    .filter((ward) => ward.name.toLowerCase().includes(wardSearchQuery.toLowerCase()));

  const wardVisualData = filteredWardWorkforce.map((ward) => {
    const performance = wardPerformances.find((row) => row.wardId === ward.id);
    const attendanceRate = ward.registered > 0
      ? Math.round((ward.present / ward.registered) * 100)
      : 0;

    return {
      id: ward.id,
      wardName: ward.name,
      zoneName: performance?.zoneName || '',
      mappedUsers: ward.registered,
      presentUsers: ward.present,
      absentUsers: ward.absent,
      attendanceRate,
      submittedReports: ward.submissions,
      target: ward.target,
      targetSubmitted: ward.targetSubmitted,
      targetCompletion: ward.completionPercentage,
      sweepingReports: performance?.sweeping.reports || 0,
      toiletReports: performance?.toilets.reports || 0,
      twinbinReports: performance?.twinbin.reports || 0,
      taskforceReports: performance?.taskforce.reports || 0,
    };
  });

  const wardVisualTotals = wardVisualData.reduce(
    (acc, ward) => {
      acc.mappedUsers += ward.mappedUsers;
      acc.presentUsers += ward.presentUsers;
      acc.absentUsers += ward.absentUsers;
      acc.submittedReports += ward.submittedReports;
      acc.target += ward.target;
      acc.targetSubmitted += ward.targetSubmitted;
      return acc;
    },
    { mappedUsers: 0, presentUsers: 0, absentUsers: 0, submittedReports: 0, target: 0, targetSubmitted: 0 }
  );

  const visibleWardAttendanceRate = wardVisualTotals.mappedUsers > 0
    ? Math.round((wardVisualTotals.presentUsers / wardVisualTotals.mappedUsers) * 100)
    : 0;
  const visibleWardTargetCompletion = wardVisualTotals.target > 0
    ? Math.min(100, Math.round((wardVisualTotals.targetSubmitted / wardVisualTotals.target) * 100))
    : 0;

  const topPerformerModalData = (() => {
    if (!activeTopPerformerModal) return null;

    if (activeTopPerformerModal === 'zone') {
      const rows = [...zonePerformances]
        .sort((a, b) => b.score - a.score || a.zoneName.localeCompare(b.zoneName))
        .map((zone) => {
          const zoneWards = wardPerformances.filter((ward) => ward.zoneId === zone.zoneId);
          const bestWard = [...zoneWards].sort((a, b) => b.overallScore - a.overallScore)[0];
          return {
            id: zone.zoneId,
            name: zone.zoneName,
            subtitle: `${zoneWards.length} ward${zoneWards.length === 1 ? '' : 's'}`,
            primary: `${zone.score}`,
            primaryLabel: 'Zone score',
            detail: bestWard ? `Best ward: ${bestWard.wardName} (${bestWard.overallScore}/100)` : 'No ward performance data',
          };
        });

      return {
        title: 'Zone Ranking',
        label: 'Top Zone',
        calculation: [
          'Zone score is the average of the ward scores inside that zone.',
          'Ward score = Attendance 25% + Daily Target Completion 25% + QC Approval 30% + Issue Control 10% + Repeat Hotspot Control 10%.',
        ],
        rows,
      };
    }

    if (activeTopPerformerModal === 'ward') {
      const rows = [...wardPerformances]
        .sort((a, b) => b.overallScore - a.overallScore || a.wardName.localeCompare(b.wardName))
        .map((ward) => ({
          id: ward.wardId,
          wardId: ward.wardId,
          name: ward.wardName,
          subtitle: ward.zoneName,
          primary: `${ward.overallScore}`,
          primaryLabel: 'Ward score',
          detail: `Attendance ${ward.attendancePercentage}% | Target ${ward.completionPercentage}% | QC ${ward.qcPercentage}% | ${ward.totalReports} reports`,
        }));

      return {
        title: 'Ward Ranking',
        label: 'Top Ward',
        calculation: [
          'Ward score = Attendance 25% + Daily Target Completion 25% + QC Approval 30% + Issue Control 10% + Repeat Hotspot Control 10%.',
          'Issue Control reduces with Action Required records. Repeat Hotspot Control reduces when the same problem location appears repeatedly.',
        ],
        rows,
      };
    }

    const roleRows =
      activeTopPerformerModal === 'employee'
        ? employeePerformanceLogs.filter((e) => e.role === 'Ground Staff' || e.role === 'EMPLOYEE')
        : activeTopPerformerModal === 'supervisor'
          ? employeePerformanceLogs.filter((e) => e.role === 'Supervisor' || e.role === 'SUPERVISOR')
          : activeTopPerformerModal === 'qc'
            ? employeePerformanceLogs.filter((e) => e.role === 'QC')
            : employeePerformanceLogs.filter((e) => e.role === 'ACTION_OFFICER' || e.role === 'AO' || e.role === 'Action Officer');

    const rows = rankPeopleForModal(roleRows).map((person) => ({
      id: person.id,
      employeeId: person.id,
      name: person.name,
      subtitle: `${person.wardName} | ${person.zoneName}`,
      primary: `${person.approvedCount}`,
      primaryLabel: 'Approved linked reports',
      detail: `${person.totalSubmissions} linked reports | ${person.rejectedCount} rejected/action required | ${person.attendanceStatus}`,
    }));

    const titles = {
      employee: ['Employee Ranking', 'Top Employee'],
      supervisor: ['Supervisor Ranking', 'Top Supervisor'],
      qc: ['QC User Ranking', 'Top QC'],
      ao: ['Action Officer Ranking', 'Top AO'],
    } as const;
    const [title, label] = titles[activeTopPerformerModal as 'employee' | 'supervisor' | 'qc' | 'ao'];

    const calculation =
      activeTopPerformerModal === 'qc' || activeTopPerformerModal === 'ao'
        ? [
            'Ranks available linked report activity: Approved linked reports first, then total linked reports as the tie-breaker.',
            'The current city inspection feed does not identify the QC reviewer or Action Officer resolver per record, so no audit/resolution score is invented here.',
          ]
        : [
            'Ranks by Approved linked reports. If two users are tied, the user with more total linked reports ranks higher.',
            'These counts come from inspection records linked to the user for the selected date range.',
          ];

    return { title, label, calculation, rows };
  })();

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] -m-5 sm:-m-6 p-5 sm:p-6 text-slate-800" style={{ fontFamily: 'Inter, sans-serif' }}>
      
      {/* TOP PERFORMERS STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <button
          type="button"
          onClick={() => setActiveTopPerformerModal('zone')}
          className="text-left bg-white border border-slate-200/80 rounded-2xl p-4 hover:border-blue-200 hover:shadow-md transition-all flex flex-col justify-between group shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Top Zone</span>
            <Layers size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-800 truncate">{topZonePerformer?.zoneName || 'No zone data'}</h4>
            <span className="text-xs font-black text-emerald-600 mt-1 block">
              {topZonePerformer ? `Score: ${topZonePerformer.score ?? topZonePerformer.overallScore ?? 0}` : 'No ranking data'}
            </span>
            <span className="text-[9px] font-bold text-blue-500 mt-2 inline-flex items-center gap-1">View ranking <ArrowRight size={10} /></span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTopPerformerModal('ward')}
          className="text-left bg-white border border-slate-200/80 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between group shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Top Ward</span>
            <MapPin size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-800 truncate">{topWardPerformer?.wardName || 'No ward data'}</h4>
            <span className="text-xs font-black text-emerald-600 mt-1 block">
              {topWardPerformer ? `Score: ${topWardPerformer.overallScore ?? 0}` : 'No ranking data'}
            </span>
            <span className="text-[9px] font-bold text-indigo-500 mt-2 inline-flex items-center gap-1">View ranking <ArrowRight size={10} /></span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTopPerformerModal('employee')}
          className="text-left bg-white border border-slate-200/80 rounded-2xl p-4 hover:border-emerald-200 hover:shadow-md transition-all flex flex-col justify-between group shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Top Employee</span>
            <UserCheck size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-800 truncate">{topEmployeePerformer?.name || 'No activity data'}</h4>
            <span className="text-[10px] font-semibold text-slate-500 mt-1 block truncate">
              {topEmployeePerformer ? `${topEmployeePerformer.approvedCount} approved | ${topEmployeePerformer.wardName}` : 'Open to view employee list'}
            </span>
            <span className="text-[9px] font-bold text-emerald-600 mt-2 inline-flex items-center gap-1">View ranking <ArrowRight size={10} /></span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTopPerformerModal('supervisor')}
          className="text-left bg-white border border-slate-200/80 rounded-2xl p-4 hover:border-amber-200 hover:shadow-md transition-all flex flex-col justify-between group shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-100"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Top Supervisor</span>
            <Users size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-800 truncate">{topSupervisorPerformer?.name || 'No activity data'}</h4>
            <span className="text-[10px] font-semibold text-slate-500 mt-1 block truncate">
              {topSupervisorPerformer ? `${topSupervisorPerformer.approvedCount} approved | ${topSupervisorPerformer.wardName}` : 'Open to view supervisor list'}
            </span>
            <span className="text-[9px] font-bold text-amber-600 mt-2 inline-flex items-center gap-1">View ranking <ArrowRight size={10} /></span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTopPerformerModal('qc')}
          className="text-left bg-white border border-slate-200/80 rounded-2xl p-4 hover:border-teal-200 hover:shadow-md transition-all flex flex-col justify-between group shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-100"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Top QC</span>
            <CheckCircle2 size={16} className="text-teal-500 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-800 truncate">{topQcPerformer?.name || 'No linked activity'}</h4>
            <span className="text-[10px] font-semibold text-slate-500 mt-1 block truncate">
              {topQcPerformer ? `${topQcPerformer.approvedCount} approved linked reports` : 'Open to view QC user list'}
            </span>
            <span className="text-[9px] font-bold text-teal-600 mt-2 inline-flex items-center gap-1">View ranking <ArrowRight size={10} /></span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTopPerformerModal('ao')}
          className="text-left bg-white border border-slate-200/80 rounded-2xl p-4 hover:border-rose-200 hover:shadow-md transition-all flex flex-col justify-between group shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-100"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Top AO</span>
            <Activity size={16} className="text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-800 truncate">{topAoPerformer?.name || 'No linked activity'}</h4>
            <span className="text-[10px] font-semibold text-slate-500 mt-1 block truncate">
              {topAoPerformer ? `${topAoPerformer.approvedCount} approved linked reports` : 'Open to view Action Officer list'}
            </span>
            <span className="text-[9px] font-bold text-rose-600 mt-2 inline-flex items-center gap-1">View ranking <ArrowRight size={10} /></span>
          </div>
        </button>
      </div>

      {/* HEADER, COLLAPSIBLE FILTERS PANEL, SUB-TABS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm mb-6 mt-2">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center min-h-9">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
              {isEmployeeAttendancePage ? 'Employee Attendance' : 'Performance Overview'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`flex items-center gap-2 border font-extrabold text-xs px-4 h-9 rounded-xl transition-all shadow-sm ${
                showFiltersPanel || selectedZoneId !== 'ALL' || selectedWardId !== 'ALL' || selectedModule !== 'ALL' || filterStatus !== 'ALL'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter size={12} />
              Filters
              { (selectedZoneId !== 'ALL' || selectedWardId !== 'ALL' || selectedModule !== 'ALL' || filterStatus !== 'ALL' || filterRole !== 'ALL' || startDateStr !== '' || endDateStr !== '') && (
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              )}
            </button>

            <button 
              onClick={loadDashboardData} 
              disabled={refreshing}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-extrabold text-xs px-4 h-9 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Sync Data
            </button>
          </div>
        </div>

        {/* Collapsible Panel content */}
        {showFiltersPanel && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-page-entrance">
            
            {/* Assessors/Role */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User Designation</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="ALL">All Roles</option>
                <option value="Ground Staff">Ground Staff</option>
                <option value="Supervisor">Supervisor</option>
                <option value="QC">QC Officer</option>
                <option value="AO">Action Officer</option>
              </select>
            </div>

            {/* Category / Module */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Module Category</span>
              <select 
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="ALL">All Modules</option>
                <option value="SWEEPING">Sweeping</option>
                <option value="TOILET">Toilets</option>
                <option value="TWINBIN">Litter Bin / TwinBin</option>
                <option value="TASKFORCE">Taskforce / GVP</option>
              </select>
            </div>

            {/* Wards / Zones */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zone Filter</span>
              <select 
                value={selectedZoneId}
                onChange={(e) => {
                  setSelectedZoneId(e.target.value);
                  setSelectedWardId('ALL');
                }}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="ALL">All Zones</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward Filter</span>
              <select 
                value={selectedWardId}
                onChange={(e) => setSelectedWardId(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="ALL">All Wards</option>
                {wards
                  .filter((w) => selectedZoneId === 'ALL' || String(w.parentId || w.parent_id || w.parent?.id) === selectedZoneId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Status</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="Good">Good</option>
                <option value="Needs Attention">Needs Attention</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Quick date picker & Custom dates */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timeline Range</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDate('TODAY')}
                  className={`px-3 h-9 rounded-xl text-xs font-black transition-all border ${
                    selectedDate === 'TODAY'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  7D
                </button>
                <button
                  onClick={() => setSelectedDate('LAST_7_DAYS')}
                  className={`px-3 h-9 rounded-xl text-xs font-black transition-all border ${
                    selectedDate === 'LAST_7_DAYS'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  15D
                </button>
                <button
                  onClick={() => setSelectedDate('LAST_30_DAYS')}
                  className={`px-3 h-9 rounded-xl text-xs font-black transition-all border ${
                    selectedDate === 'LAST_30_DAYS'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  30D
                </button>
                <div className="relative flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2">
                  <Calendar size={12} className="text-slate-400 mr-2" />
                  <input
                    type="date"
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="w-full bg-transparent outline-none text-xs font-semibold text-slate-700"
                  />
                </div>
                <span className="self-center text-xs font-bold text-slate-400">to</span>
                <div className="relative flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2">
                  <Calendar size={12} className="text-slate-400 mr-2" />
                  <input
                    type="date"
                    value={endDateStr}
                    onChange={(e) => setEndDateStr(e.target.value)}
                    className="w-full bg-transparent outline-none text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="flex flex-col justify-end">
              <button
                onClick={() => {
                  setSelectedDate('TODAY');
                  setSelectedZoneId('ALL');
                  setSelectedWardId('ALL');
                  setSelectedModule('ALL');
                  setFilterStatus('ALL');
                  setFilterRole('ALL');
                  setStartDateStr('');
                  setEndDateStr('');
                }}
                className="flex items-center justify-center gap-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 font-extrabold text-xs px-4 h-9 rounded-xl transition-all shadow-sm active:scale-95"
              >
                <RotateCcw size={12} />
                Reset Filters
              </button>
            </div>

          </div>
        )}
      </div>

      {!isEmployeeAttendancePage ? (
        <>
          {/* WEEKLY STAR PERFORMERS (Top of the Page Awards) */}
          {starPerformers.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-5 shadow-xl text-white mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="text-amber-300 animate-bounce" size={20} />
            <h2 className="text-sm font-black uppercase tracking-wider">Weekly Star Performers (Top Ground Officers)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {starPerformers.map((emp, i) => (
              <div 
                key={emp.id}
                onClick={() => setSelectedEmployeeId(emp.id)}
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all border border-white/10 rounded-2xl p-4 flex items-center gap-3 cursor-pointer group"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-900 rounded-full p-0.5">
                    <Star size={10} fill="currentColor" />
                  </div>
                </div>
                <div>
                  <h3 className="font-extrabold text-xs truncate max-w-[120px]">{emp.name}</h3>
                  <span className="text-[10px] text-white/60 block">{emp.role}</span>
                  <span className="text-[9px] font-black text-amber-300 block mt-1">{emp.totalSubmissions} Done ({emp.wardName})</span>
                </div>
                <ArrowRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ZONE WORKFORCE & PERFORMANCE MATRIX */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Zone Workforce & Performance Matrix</h2>
            <p className="text-[10px] text-slate-500 mt-1">Zone-wise attendance, workforce and report activity.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5 self-start lg:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            Click any chart bar for zone details
          </div>
        </div>

        {zoneVisualData.length > 0 ? (
          <div className="p-4 sm:p-5 space-y-5">
            {/* COMPACT CITY / FILTERED-ZONE SUMMARY */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Zones', value: zoneVisualData.length, icon: Layers, tone: 'text-blue-600 bg-blue-50' },
                { label: 'Mapped Users', value: zoneVisualTotals.mappedUsers, icon: Users, tone: 'text-slate-700 bg-slate-50' },
                { label: 'Present Today', value: zoneVisualTotals.presentUsers, icon: UserCheck, tone: 'text-emerald-700 bg-emerald-50' },
                { label: 'Absent Today', value: zoneVisualTotals.absentUsers, icon: AlertCircle, tone: 'text-rose-700 bg-rose-50' },
                { label: 'Submitted Reports', value: zoneVisualTotals.submittedReports, icon: FileText, tone: 'text-violet-700 bg-violet-50' },
              ].map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 flex items-center gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate">{label}</p>
                    <p className="text-lg font-black text-slate-900 leading-tight">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* PRIMARY VISUAL COMPARISON */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-800">Present vs Absent by Zone</h3>
                    <p className="text-[9px] text-slate-400 mt-0.5">Operational users for the selected attendance day.</p>
                  </div>
                  <div className="text-[9px] font-bold text-slate-400">Users</div>
                </div>
                <div className="h-[285px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={zoneVisualData}
                      margin={{ top: 8, right: 10, left: -18, bottom: 4 }}
                      onClick={(state: any) => {
                        const row = state?.activePayload?.[0]?.payload;
                        if (row?.id) setSelectedZoneVisualId(row.id);
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="zoneName" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                        formatter={(value: any, name: any) => [value, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                      <Bar dataKey="presentUsers" name="Present Users" stackId="attendance" fill="#10b981" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="absentUsers" name="Absent Users" stackId="attendance" fill="#f43f5e" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-800">Submitted Reports by Zone</h3>
                    <p className="text-[9px] text-slate-400 mt-0.5">Actual inspection reports in the selected period.</p>
                  </div>
                  <div className="text-[9px] font-bold text-slate-400">Reports</div>
                </div>
                <div className="h-[285px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={zoneVisualData}
                      margin={{ top: 8, right: 10, left: -18, bottom: 4 }}
                      onClick={(state: any) => {
                        const row = state?.activePayload?.[0]?.payload;
                        if (row?.id) setSelectedZoneVisualId(row.id);
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="zoneName" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                        formatter={(value: any) => [`${value} reports`, 'Submitted Reports']}
                      />
                      <Bar dataKey="submittedReports" name="Submitted Reports" fill="#2563eb" radius={[7, 7, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* MODULE ACTIVE-SUBMITTER CHART + ONE SELECTED ZONE DETAIL */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.85fr] gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3">
                  <h3 className="text-xs font-black text-slate-800">Module Submitters by Zone</h3>
                  <p className="text-[9px] text-slate-400 mt-0.5">Users who submitted at least one report in each module.</p>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={zoneVisualData}
                      margin={{ top: 8, right: 10, left: -18, bottom: 4 }}
                      onClick={(state: any) => {
                        const row = state?.activePayload?.[0]?.payload;
                        if (row?.id) setSelectedZoneVisualId(row.id);
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="zoneName" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }} />
                      <Bar dataKey="sweepingSubmitters" name="Sweeping" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="toiletSubmitters" name="Toilets" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="twinbinSubmitters" name="Litter Bin / Twin Bin" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="taskforceSubmitters" name="Taskforce / GVP" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {selectedZoneVisual && (
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-4 shadow-[0_8px_24px_rgba(37,99,235,0.06)]">
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-blue-100/80">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-[0.16em] text-blue-600">Selected Zone</span>
                      <h3 className="text-base font-black text-slate-900 mt-1">{selectedZoneVisual.zoneName}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectZoneRow(selectedZoneVisual.id)}
                      className="text-[9px] font-black text-blue-700 bg-white border border-blue-100 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition-colors"
                    >
                      Use as filter
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 py-3">
                    <button
                      type="button"
                      onClick={() => setActiveAreaEmployeesModal({ areaId: selectedZoneVisual.id, areaName: selectedZoneVisual.zoneName, areaType: 'Zone', type: 'registered' })}
                      className="rounded-xl bg-white border border-slate-200 p-3 text-left hover:border-blue-200 hover:shadow-sm transition-all"
                    >
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Mapped Users</span>
                      <span className="text-lg font-black text-slate-900 block mt-0.5">{selectedZoneVisual.mappedUsers}</span>
                    </button>
                    <div className="rounded-xl bg-white border border-slate-200 p-3">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Submitted Reports</span>
                      <span className="text-lg font-black text-blue-700 block mt-0.5">{selectedZoneVisual.submittedReports}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[9px] mb-1.5">
                        <span className="font-bold text-slate-500">Attendance Rate</span>
                        <span className="font-black text-slate-900">{selectedZoneVisual.attendanceRate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${selectedZoneVisual.attendanceRate}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[8px] mt-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveAreaEmployeesModal({ areaId: selectedZoneVisual.id, areaName: selectedZoneVisual.zoneName, areaType: 'Zone', type: 'present' })}
                          className="font-bold text-emerald-700 hover:underline"
                        >
                          {selectedZoneVisual.presentUsers} present
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveAreaEmployeesModal({ areaId: selectedZoneVisual.id, areaName: selectedZoneVisual.zoneName, areaType: 'Zone', type: 'absent' })}
                          className="font-bold text-rose-700 hover:underline"
                        >
                          {selectedZoneVisual.absentUsers} absent
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[9px] mb-1.5">
                        <span className="font-bold text-slate-500">Daily Target Completion</span>
                        <span className="font-black text-slate-900">{selectedZoneVisual.targetCompletion}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, selectedZoneVisual.targetCompletion)}%` }} />
                      </div>
                      <p className="text-[8px] text-slate-400 mt-1.5">{selectedZoneVisual.targetSubmitted} submitted of {selectedZoneVisual.target} assigned daily targets</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 mb-2">Module User Activity</p>
                    <div className="space-y-2">
                      {[
                        ['Sweeping', selectedZoneVisual.modules.sweeping],
                        ['Toilets', selectedZoneVisual.modules.toilet],
                        ['Litter Bin / Twin Bin', selectedZoneVisual.modules.twinbin],
                        ['Taskforce / GVP', selectedZoneVisual.modules.taskforce],
                      ].map(([label, stats]: any) => (
                        <div key={label} className="flex items-center justify-between gap-3 text-[9px]">
                          <span className="font-bold text-slate-600 truncate">{label}</span>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="font-black text-slate-800">{stats.registered} submitters</span>
                            <span className="font-bold text-emerald-600">{stats.present} P</span>
                            <span className="font-bold text-rose-600">{stats.absent} A</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-10 text-center">
            <Activity size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-500">No zone workforce data available for the selected filters.</p>
          </div>
        )}
      </div>

      {/* ZONE MODULE-WISE REPORT SUBMISSION COMPARISON */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Zone Module-wise Report Submission Comparison</h2>
            <p className="text-[10px] text-slate-500 mt-1 max-w-4xl leading-relaxed">
              Actual submitted inspection reports by zone and module. Zones are ranked only by total report count.
            </p>
          </div>
          {zoneModuleReportSubmissions.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 min-w-[220px]">
              <span className="text-[8px] font-black uppercase tracking-wider text-blue-600 block">Highest Report Volume</span>
              <div className="flex items-end justify-between gap-3 mt-1">
                <span className="text-xs font-black text-slate-900 truncate">{zoneModuleReportSubmissions[0].zoneName}</span>
                <span className="text-sm font-black text-blue-700">{zoneModuleReportSubmissions[0].total} reports</span>
              </div>
            </div>
          )}
        </div>

        {zoneModuleReportSubmissions.length > 0 ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-3 overflow-y-auto max-h-[520px]">
              <div style={{ height: `${Math.max(300, zoneModuleReportSubmissions.length * 48)}px`, minWidth: '760px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={zoneModuleReportSubmissions}
                    layout="vertical"
                    margin={{ top: 10, right: 24, left: 10, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                    <YAxis type="category" dataKey="zoneName" width={105} tick={{ fontSize: 9, fill: '#475569', fontWeight: 700 }} />
                    <RechartsTooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                      formatter={(value: any, name: any) => [`${value} reports`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Bar dataKey="sweeping" name="Sweeping Reports" stackId="reports" fill="#2563eb" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="toilets" name="Toilet Reports" stackId="reports" fill="#0ea5e9" />
                    <Bar dataKey="twinbin" name="Litter Bin / Twin Bin Reports" stackId="reports" fill="#8b5cf6" />
                    <Bar dataKey="taskforce" name="Taskforce / GVP Reports" stackId="reports" fill="#14b8a6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[850px] text-[10px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr className="text-left">
                    <th className="px-3 py-3 font-black">Report Volume Rank</th>
                    <th className="px-3 py-3 font-black">Zone</th>
                    <th className="px-3 py-3 font-black text-center">Sweeping Reports</th>
                    <th className="px-3 py-3 font-black text-center">Toilet Reports</th>
                    <th className="px-3 py-3 font-black text-center">Litter Bin / Twin Bin Reports</th>
                    <th className="px-3 py-3 font-black text-center">Taskforce / GVP Reports</th>
                    <th className="px-3 py-3 font-black text-center">Total Submitted Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneModuleReportSubmissions.map((zone, index) => (
                    <tr key={zone.zoneId} className="border-t border-slate-100 hover:bg-slate-50/70">
                      <td className="px-3 py-3 font-black text-slate-700">#{index + 1}</td>
                      <td className="px-3 py-3 font-black text-slate-900">{zone.zoneName}</td>
                      <td className="px-3 py-3 text-center font-bold text-slate-700">{zone.sweeping}</td>
                      <td className="px-3 py-3 text-center font-bold text-slate-700">{zone.toilets}</td>
                      <td className="px-3 py-3 text-center font-bold text-slate-700">{zone.twinbin}</td>
                      <td className="px-3 py-3 text-center font-bold text-slate-700">{zone.taskforce}</td>
                      <td className="px-3 py-3 text-center font-black text-blue-700">{zone.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-slate-400 mt-2">
              Report Volume Rank is based only on total submitted report count. It is not a performance score.
            </p>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
            <FileText className="w-5 h-5 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No submitted inspection reports found for the selected filters.</p>
          </div>
        )}
      </div>

      {/* WARD WORKFORCE & MODULE PERFORMANCE MATRIX */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm mb-6">
        <div className="mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Ward Workforce & Performance Matrix</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Compare ward attendance, submitted reports, daily targets and module activity.</p>
          </div>
          <div className="relative w-full lg:w-64">
            <input
              type="text"
              placeholder="Search ward..."
              value={wardSearchQuery}
              onChange={(e) => setWardSearchQuery(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium placeholder:text-slate-400"
            />
          </div>
        </div>

        {wardVisualData.length > 0 ? (
          <>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3 mb-4">
              <div>
                <div className="text-[9px] uppercase tracking-wider font-black text-slate-400">Visible Wards</div>
                <div className="text-lg font-black text-slate-900">{wardVisualData.length}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider font-black text-slate-400">Mapped Users</div>
                <div className="text-lg font-black text-slate-900">{wardVisualTotals.mappedUsers}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider font-black text-slate-400">Attendance</div>
                <div className="text-lg font-black text-emerald-600">{visibleWardAttendanceRate}%</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider font-black text-slate-400">Submitted Reports</div>
                <div className="text-lg font-black text-blue-700">{wardVisualTotals.submittedReports}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider font-black text-slate-400">Daily Target Completion</div>
                <div className="text-lg font-black text-violet-700">{visibleWardTargetCompletion}%</div>
              </div>
              <div className="ml-auto text-[9px] font-semibold text-slate-400">Click any ward bar for details</div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                <div className="mb-3">
                  <h3 className="text-xs font-black text-slate-800">Ward Attendance Distribution</h3>
                  <p className="text-[9px] text-slate-400">Present and absent mapped users by ward.</p>
                </div>
                <div className="overflow-x-auto pb-1">
                  <div style={{ height: 320, minWidth: `${Math.max(680, wardVisualData.length * 92)}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={wardVisualData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 28 }}
                        onClick={(state: any) => {
                          const id = state?.activePayload?.[0]?.payload?.id;
                          if (id) setSelectedWardDetailId(id);
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="wardName" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={48} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          formatter={(value: any, name: any) => [value, name === 'presentUsers' ? 'Present Users' : 'Absent Users']}
                          labelFormatter={(label) => `${label}`}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} formatter={(value) => value === 'presentUsers' ? 'Present Users' : 'Absent Users'} />
                        <Bar dataKey="presentUsers" stackId="attendance" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="absentUsers" stackId="attendance" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4">
                <div className="mb-3">
                  <h3 className="text-xs font-black text-slate-800">Reports & Daily Target Completion</h3>
                  <p className="text-[9px] text-slate-400">Submitted inspection reports with actual daily target completion.</p>
                </div>
                <div className="overflow-x-auto pb-1">
                  <div style={{ height: 320, minWidth: `${Math.max(680, wardVisualData.length * 92)}px` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={wardVisualData}
                        margin={{ top: 10, right: 12, left: -10, bottom: 28 }}
                        onClick={(state: any) => {
                          const id = state?.activePayload?.[0]?.payload?.id;
                          if (id) setSelectedWardDetailId(id);
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="wardName" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={48} />
                        <YAxis yAxisId="reports" allowDecimals={false} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="completion" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          formatter={(value: any, name: any) => {
                            if (name === 'targetCompletion') return [`${value}%`, 'Daily Target Completion'];
                            return [value, 'Submitted Reports'];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} formatter={(value) => value === 'submittedReports' ? 'Submitted Reports' : 'Daily Target Completion'} />
                        <Bar yAxisId="reports" dataKey="submittedReports" fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={34} />
                        <Line yAxisId="completion" type="monotone" dataKey="targetCompletion" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-4 mt-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-800">Module Report Activity by Ward</h3>
                  <p className="text-[9px] text-slate-400">Actual inspection report volume from each module.</p>
                </div>
                <span className="text-[9px] font-bold text-blue-600">Click a ward to open its drill-down</span>
              </div>
              <div className="overflow-x-auto pb-1">
                <div style={{ height: 320, minWidth: `${Math.max(760, wardVisualData.length * 96)}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={wardVisualData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 28 }}
                      onClick={(state: any) => {
                        const id = state?.activePayload?.[0]?.payload?.id;
                        if (id) setSelectedWardDetailId(id);
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="wardName" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={48} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="sweepingReports" name="Sweeping Reports" stackId="modules" fill="#2563eb" />
                      <Bar dataKey="toiletReports" name="Toilet Reports" stackId="modules" fill="#0ea5e9" />
                      <Bar dataKey="twinbinReports" name="Litter Bin / Twin Bin Reports" stackId="modules" fill="#8b5cf6" />
                      <Bar dataKey="taskforceReports" name="Taskforce / GVP Reports" stackId="modules" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
            <MapPin className="w-5 h-5 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">No wards found for the selected filters.</p>
          </div>
        )}
      </div>

      {/* WARD-WISE STAFF ROSTER: also surfaced on the dashboard below the workforce matrix */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm mb-6">
        <div className="mb-4">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Ward-wise Staff Roster (Present vs Absent)</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Click any bar to drill down and view the mapped roster for that ward.</p>
        </div>

        <div className="w-full h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={wardPerformances.map(w => ({
                name: w.wardName,
                Present: w.presentEmployees,
                Absent: Math.max(0, w.totalEmployees - w.presentEmployees),
                Total: w.totalEmployees,
                raw: w
              }))}
              margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
              onClick={(data) => {
                if (data && data.activePayload) {
                  const ward = data.activePayload[0].payload.raw;
                  setActiveAreaEmployeesModal({
                    areaId: ward.wardId,
                    areaName: ward.wardName,
                    areaType: 'Ward',
                    type: 'registered'
                  });
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const attendanceRate = data.Total > 0 ? Math.round((data.Present / data.Total) * 100) : 0;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-semibold">
                        <p className="font-bold text-blue-400 mb-1">{data.name}</p>
                        <p>Total Mapped: <span className="font-black text-white">{data.Total} employees</span></p>
                        <p className="text-emerald-400">Present today: {data.Present}</p>
                        <p className="text-rose-400">Absent today: {data.Absent}</p>
                        <p className="text-blue-300 mt-1 font-bold">Attendance Rate: {attendanceRate}%</p>
                        <p className="text-[9px] text-slate-400 mt-1 font-normal">Click bar to view full employee roster</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
              <Bar dataKey="Present" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} cursor="pointer" />
              <Bar dataKey="Absent" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NEW INTERACTIVE ANALYTICS CARD: SUBMISSION TREND & WARD LIFECYCLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              Submission Trend & Ward Lifecycle Analytics
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Latest 7-day submission trend with real-time lifecycle stages (Registered vs Approved vs Issues) across municipal modules.
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveChartTab('trend')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeChartTab === 'trend'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              Submission Trend
            </button>
            <button
              onClick={() => setActiveChartTab('lifecycle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeChartTab === 'lifecycle'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              Ward Lifecycle
            </button>
          </div>
        </div>

        {activeChartTab === 'trend' ? (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={submissionTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <RechartsTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-semibold">
                          <p className="font-bold text-blue-400 mb-1">{data.date}</p>
                          <p>Total Submitted Inspection Reports: <span className="font-black text-white">{data.submissions}</span></p>
                          <p className="text-emerald-400">Approved by QC: {data.approved}</p>
                          <p className="text-rose-400">Pending Issues: {data.issues}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="submissions" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSubmissions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={wardPerformances.slice(0, 15).map(w => ({
                  name: w.wardName,
                  Submissions: w.totalReports,
                  Approved: w.approved,
                  Issues: w.actionRequired,
                  raw: w
                }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(data) => {
                  if (data && data.activePayload) {
                    setDrillDownWard(data.activePayload[0].payload.raw);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <RechartsTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-semibold">
                          <p className="font-bold text-blue-400 mb-1">{data.name}</p>
                          <p>Total Reports: <span className="font-black text-white">{data.Submissions}</span></p>
                          <p className="text-emerald-400">QC Approved: {data.Approved}</p>
                          <p className="text-rose-400">Open Issues: {data.Issues}</p>
                          <p className="text-[9px] text-slate-400 mt-1">Click bar to view full drill-down roster details</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="Submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} cursor="pointer" />
                <Bar dataKey="Approved" fill="#10b981" radius={[4, 4, 0, 0]} cursor="pointer" />
                <Bar dataKey="Issues" fill="#f59e0b" radius={[4, 4, 0, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* TOP PERFORMER RANKING DRILL-DOWN */}
      {typeof document !== 'undefined' && activeTopPerformerModal && topPerformerModalData && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveTopPerformerModal(null);
          }}
        >
          <div className="bg-white w-full max-w-4xl max-h-[86vh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <Award size={17} className="text-blue-600" />
                  <h3 className="text-base font-black text-slate-900">{topPerformerModalData.title}</h3>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">Click a ward or user row to open its detailed record.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTopPerformerModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                aria-label="Close ranking details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/55 px-4 py-3 mb-5">
                <div className="text-[10px] font-black uppercase tracking-wider text-blue-700 mb-1.5">How {topPerformerModalData.label} is selected</div>
                <div className="space-y-1">
                  {topPerformerModalData.calculation.map((line, index) => (
                    <p key={index} className="text-[11px] leading-5 font-semibold text-slate-600">{line}</p>
                  ))}
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[54px_minmax(180px,1.4fr)_minmax(120px,.7fr)_minmax(220px,1.4fr)] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  <span>Rank</span>
                  <span>Name</span>
                  <span>Primary Metric</span>
                  <span>Related Data</span>
                </div>

                {topPerformerModalData.rows.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {topPerformerModalData.rows.map((row: any, index: number) => {
                      const canOpenDetail = Boolean(row.wardId || row.employeeId);
                      return (
                        <button
                          key={row.id || `${row.name}-${index}`}
                          type="button"
                          disabled={!canOpenDetail}
                          onClick={() => {
                            if (row.wardId) {
                              setSelectedWardDetailId(row.wardId);
                              setActiveTopPerformerModal(null);
                            } else if (row.employeeId) {
                              setSelectedEmployeeId(row.employeeId);
                              setActiveTopPerformerModal(null);
                            }
                          }}
                          className={`w-full grid grid-cols-[54px_minmax(180px,1.4fr)_minmax(120px,.7fr)_minmax(220px,1.4fr)] gap-3 px-4 py-3 text-left items-center transition-colors ${
                            index === 0 ? 'bg-emerald-50/35' : 'bg-white'
                          } ${canOpenDetail ? 'hover:bg-blue-50/45 cursor-pointer' : 'cursor-default'}`}
                        >
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black ${
                            index === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-extrabold text-slate-800 truncate">{row.name}</span>
                            <span className="block text-[10px] font-semibold text-slate-400 truncate mt-0.5">{row.subtitle}</span>
                          </span>
                          <span>
                            <span className="block text-sm font-black text-slate-900">{row.primary}</span>
                            <span className="block text-[9px] font-bold text-slate-400 mt-0.5">{row.primaryLabel}</span>
                          </span>
                          <span className="text-[10px] leading-4 font-semibold text-slate-600">{row.detail}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-10 text-center text-xs font-semibold text-slate-400">No matching ranking data is available for the selected filters.</div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-[10px] font-semibold text-slate-400">{topPerformerModalData.rows.length} records in this ranking</span>
              <button
                type="button"
                onClick={() => setActiveTopPerformerModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[11px] font-extrabold hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DYNAMIC AREA EMPLOYEES POPUP LIST MODAL */}
      {activeAreaEmployeesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {activeAreaEmployeesModal.areaName} - {activeAreaEmployeesModal.type.toUpperCase()} Employees
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Showing roster list of {activeAreaEmployeesModal.type} employees assigned to this area.</p>
              </div>
              <button 
                onClick={() => setActiveAreaEmployeesModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-650 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal List */}
            <div className="p-6 max-h-[400px] overflow-y-auto space-y-2">
              {getModalEmployeeList().length > 0 ? getModalEmployeeList().map((emp) => (
                <div 
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployeeId(emp.id);
                    setActiveAreaEmployeesModal(null);
                  }}
                  className="flex justify-between items-center p-3 bg-slate-50 hover:bg-blue-50/30 border border-slate-100 rounded-2xl cursor-pointer transition-colors text-xs"
                >
                  <div>
                    <span className="font-extrabold text-slate-800 block">{emp.name}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{emp.role}</span>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      emp.attendanceStatus === 'Present' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {emp.attendanceStatus}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">Punch: {emp.punchIn}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  No operational employees matched in this filter category.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setActiveAreaEmployeesModal(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
              >
                Close List
              </button>
            </div>
          </div>
        </div>
      )}
      {/* WARD DRILL DOWN DETAILS MODAL */}
      {drillDownWard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-page-entrance">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {drillDownWard.zoneName}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {drillDownWard.wardName} - Drill-down Performance Detail
                </h3>
              </div>
              <button 
                onClick={() => setDrillDownWard(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-650 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[500px] overflow-y-auto space-y-6">
              
              {/* Top stats summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl shadow-sm">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Submissions</span>
                  <span className="text-xl font-black text-slate-800">{drillDownWard.totalReports}</span>
                </div>
                <div className="bg-emerald-50/40 border border-emerald-100 p-3 rounded-2xl shadow-sm">
                  <span className="text-[10px] text-emerald-600 font-bold block uppercase">QC Approved</span>
                  <span className="text-xl font-black text-emerald-700">{drillDownWard.approved}</span>
                </div>
                <div className="bg-amber-50/40 border border-amber-100 p-3 rounded-2xl shadow-sm">
                  <span className="text-[10px] text-amber-600 font-bold block uppercase">Open Issues</span>
                  <span className="text-xl font-black text-amber-700">{drillDownWard.actionRequired}</span>
                </div>
                <div className="bg-rose-50/40 border border-rose-100 p-3 rounded-2xl shadow-sm">
                  <span className="text-[10px] text-rose-600 font-bold block uppercase">QC Rejected</span>
                  <span className="text-xl font-black text-rose-700">{drillDownWard.rejected}</span>
                </div>
              </div>

              {/* Roster & Attendance stats */}
              <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Roster & Staff Details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Mapped Employees:</span>
                    <span className="font-bold text-slate-700">{drillDownWard.totalEmployees}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Present Officers:</span>
                    <span className="font-bold text-emerald-600">{drillDownWard.presentEmployees}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Attendance Rate:</span>
                    <span className="font-black text-slate-800">{drillDownWard.attendancePercentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Completion Rate:</span>
                    <span className="font-black text-slate-800">{drillDownWard.completionPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Module-wise Breakdown progress bars */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Module Submission Detail</h4>
                
                {/* Sweeping */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-750">Sweeping Submissions</span>
                    <span className="text-slate-500">{drillDownWard.sweeping.reports} Subm. | {drillDownWard.sweeping.approved} Appr.</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-blue-500 h-full" style={{ width: `${drillDownWard.sweeping.reports ? (drillDownWard.sweeping.approved / drillDownWard.sweeping.reports) * 100 : 0}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${drillDownWard.sweeping.reports ? (drillDownWard.sweeping.issues / drillDownWard.sweeping.reports) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Toilets */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-750">Toilet Inspections</span>
                    <span className="text-slate-500">{drillDownWard.toilets.reports} Subm. | {drillDownWard.toilets.approved} Appr.</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-blue-500 h-full" style={{ width: `${drillDownWard.toilets.reports ? (drillDownWard.toilets.approved / drillDownWard.toilets.reports) * 100 : 0}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${drillDownWard.toilets.reports ? (drillDownWard.toilets.issues / drillDownWard.toilets.reports) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* Twinbins */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-750">Litterbin Collections</span>
                    <span className="text-slate-500">{drillDownWard.twinbin.reports} Subm. | {drillDownWard.twinbin.approved} Appr.</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-blue-500 h-full" style={{ width: `${drillDownWard.twinbin.reports ? (drillDownWard.twinbin.approved / drillDownWard.twinbin.reports) * 100 : 0}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${drillDownWard.twinbin.reports ? (drillDownWard.twinbin.issues / drillDownWard.twinbin.reports) * 100 : 0}%` }} />
                  </div>
                </div>

                {/* GVP Taskforce */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-750">GVP Taskforce</span>
                    <span className="text-slate-500">{drillDownWard.taskforce.reports} Subm. | {drillDownWard.taskforce.approved} Appr.</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-blue-500 h-full" style={{ width: `${drillDownWard.taskforce.reports ? (drillDownWard.taskforce.approved / drillDownWard.taskforce.reports) * 100 : 0}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${drillDownWard.taskforce.reports ? (drillDownWard.taskforce.issues / drillDownWard.taskforce.reports) * 100 : 0}%` }} />
                  </div>
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setDrillDownWard(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
              >
                Close details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- EXISTING DASHBOARD LAYOUT (SHIFTED DOWN) --- */}

      {/* SECTION ONE — EXECUTIVE KPI CARDS */}
      <div className="mt-8">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Overall Performance Summary Indices</h3>
      </div>

      {/* MIDDLE LAYOUT GRID: ZONE PERFORMANCE RANKING & WARD STATUS DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* SECTION TWO — ZONE PERFORMANCE RANKING */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Zone Performance Ranking</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Displays zone-level aggregate performance score. Click any row to filter wards belonging to that zone.</p>
          </div>

          <div className="space-y-4">
            {zonePerformances.length > 0 ? zonePerformances.map((zone) => (
              <div 
                key={zone.zoneId}
                onClick={() => handleSelectZoneRow(zone.zoneId)}
                className={`group cursor-pointer p-2.5 rounded-xl border transition-all ${
                  selectedZoneId === zone.zoneId ? 'bg-blue-50/50 border-blue-200 shadow-sm' : 'bg-slate-50/30 border-transparent hover:bg-slate-50/80 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="font-extrabold text-slate-700">{zone.zoneName}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-900">{zone.score}</span>
                    <span className={`inline-flex px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                      zone.status === 'Good' ? 'bg-emerald-50 text-emerald-700' : 
                      zone.status === 'Needs Attention' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {zone.status}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      zone.status === 'Good' ? 'bg-emerald-500' : 
                      zone.status === 'Needs Attention' ? 'bg-amber-500' : 'bg-rose-500'
                    }`} 
                    style={{ width: `${zone.score}%` }} 
                  />
                </div>
              </div>
            )) : (
              <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                No zone performance calculated.
              </div>
            )}
          </div>
        </div>

        {/* SECTION SIX — WARD STATUS DISTRIBUTION */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Ward Status Distribution</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Overview of active wards categorized by performance tiers.</p>
            </div>
            
            <div className="flex items-center justify-around py-2">
              <div className="text-center">
                <span className="text-[10px] font-black text-emerald-600 block">Good</span>
                <span className="text-2xl font-black text-emerald-600">{summaryStats.greenCount}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-black text-amber-600 block font-semibold">Needs Attention</span>
                <span className="text-2xl font-black text-amber-600">{summaryStats.amberCount}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-black text-rose-600 block">Critical</span>
                <span className="text-2xl font-black text-rose-600">{summaryStats.redCount}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Best Performing Zone:</span>
              <span className="font-extrabold text-slate-800">{summaryStats.bestZoneName} ({summaryStats.bestZoneScore})</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Needs Urgent Attention:</span>
              <span className="font-extrabold text-slate-800">{summaryStats.worstZoneName} ({summaryStats.worstZoneScore})</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION THREE — WARD LEADERBOARD */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm mb-6 overflow-hidden">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Ward Leaderboard</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Click any ward row below to inspect its detailed geographic parameters, target logs and quality breakdowns.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search leaderboard ward/zone..."
              value={wardSearchQuery}
              onChange={(e) => {
                setWardSearchQuery(e.target.value);
                setWardLeaderboardPage(1); // Reset page on search
              }}
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                <th className="pb-3 text-center w-12">Rank</th>
                <th className="pb-3 pl-2">Ward</th>
                <th className="pb-3">Zone</th>
                <th className="pb-3 text-center">Attendance</th>
                <th className="pb-3 text-center">Completion</th>
                <th className="pb-3 text-center">QC Pass</th>
                <th className="pb-3 text-center">Open Issues</th>
                <th className="pb-3 text-center">Hotspots</th>
                <th className="pb-3 text-center">Score</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedWards.length > 0 ? paginatedWards.map((row) => (
                <tr 
                  key={row.wardId} 
                  onClick={() => setSelectedWardDetailId(row.wardId)}
                  className={`border-b border-slate-50 last:border-b-0 hover:bg-blue-50/50 hover:shadow-sm cursor-pointer transition-all text-xs ${
                    selectedWardDetailId === row.wardId ? 'bg-blue-50/40 border-l-2 border-l-blue-600' : ''
                  }`}
                >
                  <td className="py-3 text-center font-black text-slate-700">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black ${
                      row.rank === 1 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      row.rank === 2 ? 'bg-slate-200 text-slate-850 border border-slate-300' :
                      row.rank === 3 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                      'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}>
                      {row.rank}
                    </span>
                  </td>
                  <td className="py-3 pl-2 font-extrabold text-slate-850">{row.wardName}</td>
                  <td className="py-3 font-semibold text-slate-500">{row.zoneName}</td>
                  <td className="py-3 text-center font-bold text-slate-700">{row.totalEmployees > 0 ? `${row.attendancePercentage}%` : 'N/A'}</td>
                  <td className="py-3 text-center font-bold text-slate-700">{row.target > 0 ? `${row.completionPercentage}%` : 'No target assigned'}</td>
                  <td className="py-3 text-center font-black text-emerald-600">{row.totalReports > 0 ? `${row.qcPercentage}%` : 'No inspection records'}</td>
                  <td className="py-3 text-center font-bold text-slate-700">{row.actionRequired}</td>
                  <td className="py-3 text-center font-bold text-slate-700">{row.repeatHotspots}</td>
                  <td className="py-3 text-center font-black text-slate-900">{row.overallScore}</td>
                  <td className="py-3 text-right">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      row.status === 'Good' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' : 
                      row.status === 'Needs Attention' ? 'bg-amber-50 text-amber-700 border-amber-200/50' : 
                      'bg-rose-50 text-rose-700 border-rose-200/50'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        row.status === 'Good' ? 'bg-emerald-500' : 
                        row.status === 'Needs Attention' ? 'bg-amber-500' : 
                        'bg-rose-500'
                      }`} />
                      {row.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-bold">
                    No active ward ranking statistics computed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalWardPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-500">
              Showing {Math.min(searchedWards.length, (wardLeaderboardPage - 1) * wardsPerPage + 1)}–{Math.min(searchedWards.length, wardLeaderboardPage * wardsPerPage)} of {searchedWards.length} Wards
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWardLeaderboardPage(p => Math.max(1, p - 1))}
                disabled={wardLeaderboardPage === 1}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors font-bold flex items-center gap-1 active:scale-95"
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <span className="font-extrabold text-slate-700 px-2">
                Page {wardLeaderboardPage} of {totalWardPages}
              </span>
              <button
                onClick={() => setWardLeaderboardPage(p => Math.min(totalWardPages, p + 1))}
                disabled={wardLeaderboardPage === totalWardPages}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors font-bold flex items-center gap-1 active:scale-95"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LOWER SECTION: MODULE QUALITY & DYNAMIC DAILY EXCEPTION REPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* SECTION FIVE — INSPECTION QUALITY & WORKFORCE DEPLOYMENT */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Module performance bars */}
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">Module Performance</h2>
              <p className="text-[10px] text-slate-400 mb-4">Approved, Rejected and Action Required logs sorted by different operational modules</p>
              
              <div className="space-y-4">
                {/* Sweeping */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Sweeping</span>
                    <span>{moduleStats.sweeping.total} total</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${moduleStats.sweeping.total ? (moduleStats.sweeping.approved / moduleStats.sweeping.total)*100 : 0}%` }} />
                    <div className="bg-rose-500 h-full" style={{ width: `${moduleStats.sweeping.total ? (moduleStats.sweeping.rejected / moduleStats.sweeping.total)*100 : 0}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${moduleStats.sweeping.total ? (moduleStats.sweeping.issues / moduleStats.sweeping.total)*100 : 0}%` }} />
                  </div>
                </div>

                {/* Toilets */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Toilets</span>
                    <span>{moduleStats.toilets.total} total</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${moduleStats.toilets.total ? (moduleStats.toilets.approved / moduleStats.toilets.total)*100 : 0}%` }} />
                    <div className="bg-rose-500 h-full" style={{ width: `${moduleStats.toilets.total ? (moduleStats.toilets.rejected / moduleStats.toilets.total)*100 : 0}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${moduleStats.toilets.total ? (moduleStats.toilets.issues / moduleStats.toilets.total)*100 : 0}%` }} />
                  </div>
                </div>

                {/* Litter Bin */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Litter Bin</span>
                    <span>{moduleStats.twinbin.total} total</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${moduleStats.twinbin.total ? (moduleStats.twinbin.approved / moduleStats.twinbin.total)*100 : 0}%` }} />
                    <div className="bg-rose-500 h-full" style={{ width: `${moduleStats.twinbin.total ? (moduleStats.twinbin.rejected / moduleStats.twinbin.total)*100 : 0}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${moduleStats.twinbin.total ? (moduleStats.twinbin.issues / moduleStats.twinbin.total)*100 : 0}%` }} />
                  </div>
                </div>

                {/* GVP */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>GVP / Taskforce</span>
                    <span>{moduleStats.taskforce.total} total</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${moduleStats.taskforce.total ? (moduleStats.taskforce.approved / moduleStats.taskforce.total)*100 : 0}%` }} />
                    <div className="bg-rose-500 h-full" style={{ width: `${moduleStats.taskforce.total ? (moduleStats.taskforce.rejected / moduleStats.taskforce.total)*100 : 0}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${moduleStats.taskforce.total ? (moduleStats.taskforce.issues / moduleStats.taskforce.total)*100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Modules Table data */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl p-3 h-fit mt-10">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase">
                    <th className="pb-2">Module</th>
                    <th className="pb-2 text-center">Total</th>
                    <th className="pb-2 text-center text-emerald-600">App</th>
                    <th className="pb-2 text-center text-rose-600">Rej</th>
                    <th className="pb-2 text-center text-amber-600">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-50/50">
                    <td className="py-2 font-bold">Sweeping</td>
                    <td className="py-2 text-center">{moduleStats.sweeping.total}</td>
                    <td className="py-2 text-center">{moduleStats.sweeping.approved}</td>
                    <td className="py-2 text-center">{moduleStats.sweeping.rejected}</td>
                    <td className="py-2 text-center">{moduleStats.sweeping.issues}</td>
                  </tr>
                  <tr className="border-b border-slate-50/50">
                    <td className="py-2 font-bold">Toilets</td>
                    <td className="py-2 text-center">{moduleStats.toilets.total}</td>
                    <td className="py-2 text-center">{moduleStats.toilets.approved}</td>
                    <td className="py-2 text-center">{moduleStats.toilets.rejected}</td>
                    <td className="py-2 text-center">{moduleStats.toilets.issues}</td>
                  </tr>
                  <tr className="border-b border-slate-50/50">
                    <td className="py-2 font-bold">Litter Bin</td>
                    <td className="py-2 text-center">{moduleStats.twinbin.total}</td>
                    <td className="py-2 text-center">{moduleStats.twinbin.approved}</td>
                    <td className="py-2 text-center">{moduleStats.twinbin.rejected}</td>
                    <td className="py-2 text-center">{moduleStats.twinbin.issues}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold">GVP</td>
                    <td className="py-2 text-center">{moduleStats.taskforce.total}</td>
                    <td className="py-2 text-center">{moduleStats.taskforce.approved}</td>
                    <td className="py-2 text-center">{moduleStats.taskforce.rejected}</td>
                    <td className="py-2 text-center">{moduleStats.taskforce.issues}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* DYNAMIC WORKFORCE DEPLOYMENT STATS */}
          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider mb-1">Workforce Deployment Status by Module</h3>
            <p className="text-[10px] text-slate-400 mb-4">Real-time attendance ratio showing active workforce (Present) vs total mapped roster (Registered)</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Sweeping */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60">
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Sweeping Workforce</span>
                  <span>{workforceStats.sweeping.present} / {workforceStats.sweeping.registered} Present</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all" 
                    style={{ width: `${workforceStats.sweeping.registered > 0 ? (workforceStats.sweeping.present / workforceStats.sweeping.registered)*100 : 0}%` }} 
                  />
                </div>
              </div>

              {/* Toilet */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60">
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Toilet Inspections Staff</span>
                  <span>{workforceStats.toilet.present} / {workforceStats.toilet.registered} Present</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all" 
                    style={{ width: `${workforceStats.toilet.registered > 0 ? (workforceStats.toilet.present / workforceStats.toilet.registered)*100 : 0}%` }} 
                  />
                </div>
              </div>

              {/* Twinbin */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60">
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Litterbin Collection Team</span>
                  <span>{workforceStats.twinbin.present} / {workforceStats.twinbin.registered} Present</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all" 
                    style={{ width: `${workforceStats.twinbin.registered > 0 ? (workforceStats.twinbin.present / workforceStats.twinbin.registered)*100 : 0}%` }} 
                  />
                </div>
              </div>

              {/* Taskforce */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/60">
                <div className="flex justify-between font-bold text-slate-700 mb-1">
                  <span>Taskforce Feeder Unit</span>
                  <span>{workforceStats.taskforce.present} / {workforceStats.taskforce.registered} Present</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all" 
                    style={{ width: `${workforceStats.taskforce.registered > 0 ? (workforceStats.taskforce.present / workforceStats.taskforce.registered)*100 : 0}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* SECTION SEVEN — DAILY EXCEPTION REPORT */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={16} className="text-rose-600" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Daily Exception Report</h2>
            </div>
            <p className="text-[10px] text-slate-400">Urgent operational exceptions requiring direct administrative attention.</p>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {exceptions.map((exc, idx) => (
              <div key={idx} className="border border-slate-100 rounded-2xl p-4 bg-[#f8fafc] relative shadow-sm hover:shadow transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm leading-tight">{exc.employeeName}</h3>
                    <span className="text-[10px] text-slate-400 block font-semibold mt-0.5">{exc.role} - {exc.wardName}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${
                    exc.issueType === 'Absent' 
                      ? 'bg-amber-50 text-amber-600 border-amber-100' 
                      : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    {exc.issueType}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600 mt-3 leading-relaxed">{exc.details}</p>
                <div className="text-right mt-3">
                  <span className="text-[9px] font-bold text-slate-400">{exc.reportedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* EMPLOYEE-WISE ATTENDANCE & PERFORMANCE LOG TABLE SECTION */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm overflow-hidden mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Employee Attendance & Performance Log</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Comprehensive log listing registered workers, punch status, volume of inspections generated per system module, and audits feedback.
            </p>
          </div>
          <button 
            onClick={() => setIsFullLogOpen(true)}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-extrabold text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all"
          >
            <Maximize2 size={12} />
            View Full Log
          </button>
        </div>

        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Employee Name & Role</th>
                <th className="pb-3">Zone / Ward</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-center">Punch-In Time</th>
                <th className="pb-3 text-center">Module work (Swp | Tlt | Bin | Tkf)</th>
                <th className="pb-3 text-center">Total Submitted</th>
                <th className="pb-3 text-center text-emerald-600">QC Approved</th>
                <th className="pb-3 text-center text-rose-600">QC Rejected</th>
                <th className="pb-3 text-right">Last QC Result</th>
              </tr>
            </thead>
            <tbody>
              {currentEmpData.map((emp) => (
                <tr 
                  key={emp.id} 
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  className="border-b border-slate-50 last:border-b-0 hover:bg-blue-50/30 hover:shadow-sm cursor-pointer transition-all text-xs"
                >
                  <td className="py-3 pl-2">
                    <div className="font-extrabold text-slate-850">{emp.name}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">{emp.role}</div>
                  </td>
                  <td className="py-3">
                    <div className="font-semibold text-slate-800">{emp.wardName}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">{emp.zoneName}</div>
                  </td>
                  <td className="py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black ${
                      emp.attendanceStatus === 'Present' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                      {emp.attendanceStatus}
                    </span>
                  </td>
                  <td className="py-3 text-center font-semibold text-slate-600">{emp.punchIn}</td>
                  <td className="py-3 text-center">
                    <div className="inline-flex gap-2 text-[10px] font-bold text-slate-500">
                      <span>Swp: {emp.sweeping}</span>
                      <span>Tlt: {emp.toilet}</span>
                      <span>Bin: {emp.twinbin}</span>
                      <span>Tkf: {emp.taskforce}</span>
                    </div>
                  </td>
                  <td className="py-3 text-center font-extrabold text-slate-700">{emp.totalSubmissions}</td>
                  <td className="py-3 text-center font-bold text-emerald-600">{emp.approvedCount}</td>
                  <td className="py-3 text-center font-bold text-rose-600">{emp.rejectedCount}</td>
                  <td className="py-3 text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      emp.lastQcStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                      emp.lastQcStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                      emp.lastQcStatus === 'ACTION_REQUIRED' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-400'
                    }`}>
                      {emp.lastQcStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION TOOLBAR */}
        {totalEmpPages > 1 && (
          <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-450">
              Showing page {currentEmpPage} of {totalEmpPages} ({employeePerformanceLogs.length} items)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentEmpPage(prev => Math.max(1, prev - 1))}
                disabled={currentEmpPage === 1}
                className="p-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentEmpPage(prev => Math.min(totalEmpPages, prev + 1))}
                disabled={currentEmpPage === totalEmpPages}
                className="p-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      ) : (
        <>
        

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm mb-6">
            <div className="mb-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Ward-wise Staff Roster (Present vs Absent)</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Click any bar to drill down and filter the roster details listing for that ward.</p>
            </div>

            <div className="w-full h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={wardPerformances.map(w => ({
                    name: w.wardName,
                    Present: w.presentEmployees,
                    Absent: Math.max(0, w.totalEmployees - w.presentEmployees),
                    Total: w.totalEmployees,
                    raw: w
                  }))}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                  onClick={(data) => {
                    if (data && data.activePayload) {
                      setSelectedAttendanceWardId(data.activePayload[0].payload.raw.wardId);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const attendanceRate = data.Total > 0 ? Math.round((data.Present / data.Total) * 100) : 0;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-semibold">
                            <p className="font-bold text-blue-400 mb-1">{data.name}</p>
                            <p>Total Mapped: <span className="font-black text-white">{data.Total} employees</span></p>
                            <p className="text-emerald-400">Present today: {data.Present}</p>
                            <p className="text-rose-400">Absent today: {data.Absent}</p>
                            <p className="text-blue-300 mt-1 font-bold">Attendance Rate: {attendanceRate}%</p>
                            <p className="text-[9px] text-slate-400 mt-1 font-normal">Click bar to view full employee roster</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  <Bar dataKey="Present" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} cursor="pointer" />
                  <Bar dataKey="Absent" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* OPERATIONS ROSTER LIST */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  {selectedAttendanceWardId 
                    ? `${wardPerformances.find(w => w.wardId === selectedAttendanceWardId)?.wardName || 'Ward'} Operational Roster`
                    : 'All Wards Operational Roster'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Showing list of mapped city officers, supervisors, and QC/AO validators.</p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search officer by name..."
                  value={attendanceSearchQuery}
                  onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                  className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium placeholder:text-slate-400 w-full sm:w-48"
                />
                {selectedAttendanceWardId && (
                  <button
                    onClick={() => setSelectedAttendanceWardId(null)}
                    className="px-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 h-9 shrink-0"
                  >
                    Clear Ward Filter
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[450px] overflow-y-auto pr-1">
              {employeePerformanceLogs
                .filter((emp) => !selectedAttendanceWardId || emp.wardId === selectedAttendanceWardId)
                .filter((emp) => filterRole === 'ALL' || emp.role.toLowerCase().includes(filterRole.toLowerCase()))
                .filter((emp) => filterAttendanceStatus === 'ALL' || emp.attendanceStatus === filterAttendanceStatus)
                .filter((emp) => emp.name.toLowerCase().includes(attendanceSearchQuery.toLowerCase()))
                .map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40 hover:shadow-md transition-all flex flex-col justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800">{emp.name}</h4>
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg inline-block mt-1">{emp.role}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                        emp.attendanceStatus === 'Present' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {emp.attendanceStatus}
                      </span>
                    </div>

                    <div className="text-[10px] space-y-1 bg-white border border-slate-100 rounded-xl p-2">
                      <div className="flex justify-between text-slate-500">
                        <span>Ward / Zone:</span>
                        <span className="font-bold text-slate-700">{emp.wardName} ({emp.zoneName})</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Punch-In Time:</span>
                        <span className="font-bold text-slate-700">{emp.punchIn || '—'}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Total Done:</span>
                        <span className="font-bold text-slate-750">{emp.totalSubmissions} submissions</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {/* FULL-SCREEN EXPANDED LOG MODAL */}
      {isFullLogOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">Full Employee Performance Registry</h3>
                <p className="text-xs text-slate-400 mt-0.5">Browse, search, and download audit lists representing present and absent workforce units.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <Download size={14} />
                  Download CSV
                </button>
                <button 
                  onClick={() => setIsFullLogOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-650 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Employee Name & Role</th>
                    <th className="pb-3">Zone / Ward</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-center">Punch-In Time</th>
                    <th className="pb-3 text-center">Module work (Swp | Tlt | Bin | Tkf)</th>
                    <th className="pb-3 text-center">Total Submitted</th>
                    <th className="pb-3 text-center text-emerald-600">QC Approved</th>
                    <th className="pb-3 text-center text-rose-600">QC Rejected</th>
                    <th className="pb-3 text-right">Last QC Result</th>
                  </tr>
                </thead>
                <tbody>
                  {employeePerformanceLogs.map((emp) => (
                    <tr 
                      key={emp.id} 
                      onClick={() => {
                        setSelectedEmployeeId(emp.id);
                        setIsFullLogOpen(false);
                      }}
                      className="border-b border-slate-50 last:border-b-0 hover:bg-blue-50/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 pl-2">
                        <div className="font-extrabold text-slate-850">{emp.name}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{emp.role}</div>
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-slate-805">{emp.wardName}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{emp.zoneName}</div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black ${
                          emp.attendanceStatus === 'Present' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {emp.attendanceStatus}
                        </span>
                      </td>
                      <td className="py-3 text-center font-semibold text-slate-600">{emp.punchIn}</td>
                      <td className="py-3 text-center">
                        <div className="inline-flex gap-2 text-[10px] font-bold text-slate-500">
                          <span>Swp: {emp.sweeping}</span>
                          <span>Tlt: {emp.toilet}</span>
                          <span>Bin: {emp.twinbin}</span>
                          <span>Tkf: {emp.taskforce}</span>
                        </div>
                      </td>
                      <td className="py-3 text-center font-extrabold text-slate-700">{emp.totalSubmissions}</td>
                      <td className="py-3 text-center font-bold text-emerald-600">{emp.approvedCount}</td>
                      <td className="py-3 text-center font-bold text-rose-600">{emp.rejectedCount}</td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          emp.lastQcStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                          emp.lastQcStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                          emp.lastQcStatus === 'ACTION_REQUIRED' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {emp.lastQcStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsFullLogOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
              >
                Close Registry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL EMPLOYEE DRILL-DOWN MODAL */}
      {selectedEmployeeId && activeEmployeeDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-page-entrance">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-blue-600" />
                <h3 className="text-base font-black text-slate-900">Employee Profile Detail</h3>
              </div>
              <button 
                onClick={() => setSelectedEmployeeId(null)}
                className="p-1 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-655 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100/50">
                <span className="text-slate-450 font-bold">Worker Identity:</span>
                <div className="text-right">
                  <span className="font-extrabold text-slate-800 block text-sm">{activeEmployeeDetail.name}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{activeEmployeeDetail.role}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-100/50">
                <span className="text-slate-450 font-bold">Assignment Bounds:</span>
                <div className="text-right font-semibold">
                  <span className="text-slate-700 block">{activeEmployeeDetail.wardName}</span>
                  <span className="text-[10px] text-slate-455">{activeEmployeeDetail.zoneName}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-100/50">
                <span className="text-slate-455 font-bold">Shift Punch Time:</span>
                <span className="font-extrabold text-slate-800">{activeEmployeeDetail.punchIn}</span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-100/50">
                <span className="text-slate-455 font-bold">Shift Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeEmployeeDetail.attendanceStatus === 'Present' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {activeEmployeeDetail.attendanceStatus}
                </span>
              </div>

              {/* Module wise work list */}
              <div className="space-y-2">
                <span className="text-slate-455 font-bold block">Volume of Work by Module:</span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 block font-bold">Sweeping</span>
                    <span className="font-black text-slate-800 text-sm">{activeEmployeeDetail.sweeping}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 block font-bold">Toilets</span>
                    <span className="font-black text-slate-800 text-sm">{activeEmployeeDetail.toilet}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 block font-bold">Twinbin</span>
                    <span className="font-black text-slate-800 text-sm">{activeEmployeeDetail.twinbin}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 block font-bold">Taskforce</span>
                    <span className="font-black text-slate-800 text-sm">{activeEmployeeDetail.taskforce}</span>
                  </div>
                </div>
              </div>

              {/* QC Performance */}
              <div className="space-y-2">
                <span className="text-slate-455 font-bold block">QC Audit Feedback summary:</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 block font-bold">Approved</span>
                    <span className="font-black text-emerald-600 text-sm">{activeEmployeeDetail.approvedCount}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 block font-bold">Rejected</span>
                    <span className="font-black text-rose-600 text-sm">{activeEmployeeDetail.rejectedCount}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 block font-bold">Last QC</span>
                    <span className="font-black text-slate-700 text-xs truncate block">{activeEmployeeDetail.lastQcStatus}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedEmployeeId(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION EIGHT — WARD DETAIL DRAWER / OVERLAY PANEL */}
      {selectedWardDetailId && activeWardDetail && (
        <div className="fixed inset-y-0 right-0 w-full md:max-w-md bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col justify-between transform transition-transform duration-300 ease-out">
          
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">{activeWardDetail.wardName} Performance</h3>
                <span className="text-xs text-slate-400 font-semibold">{activeWardDetail.zoneName}</span>
              </div>
              <button 
                onClick={() => setSelectedWardDetailId(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Score Stats */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Overall Score</span>
                <span className="text-2xl font-black text-slate-800">{activeWardDetail.overallScore}</span>
                <span className="text-[10px] text-slate-400 font-bold">/100</span>
              </div>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black uppercase border ${
                activeWardDetail.status === 'Good' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                activeWardDetail.status === 'Needs Attention' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {activeWardDetail.status}
              </span>
            </div>

            {/* Detail Section: Attendance */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Attendance</h4>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Present</span>
                  <span className="font-extrabold text-slate-800 text-sm">{activeWardDetail.presentEmployees}</span>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Absent</span>
                  <span className="font-extrabold text-slate-800 text-sm">{Math.max(0, activeWardDetail.totalEmployees - activeWardDetail.presentEmployees)}</span>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">Rate</span>
                  <span className="font-black text-slate-800 text-sm">{activeWardDetail.totalEmployees > 0 ? `${activeWardDetail.attendancePercentage}%` : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Detail Section: Daily Target Tasks */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Daily Work Targets</h4>
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold block">Target</span>
                  <span className="font-extrabold text-slate-800">{activeWardDetail.target}</span>
                </div>
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold block">Submitted</span>
                  <span className="font-extrabold text-slate-800">{activeWardDetail.submitted}</span>
                </div>
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold block">Pending</span>
                  <span className="font-extrabold text-slate-800">{activeWardDetail.pending}</span>
                </div>
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold block">Completion</span>
                  <span className="font-black text-slate-800">{activeWardDetail.target > 0 ? `${activeWardDetail.completionPercentage}%` : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Detail Section: Inspections & QC */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Inspection & Quality</h4>
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold block">Total Reps</span>
                  <span className="font-extrabold text-slate-800">{activeWardDetail.totalReports}</span>
                </div>
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold block">Approved</span>
                  <span className="font-extrabold text-slate-800 text-emerald-600">{activeWardDetail.approved}</span>
                </div>
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold block">Rejected</span>
                  <span className="font-extrabold text-slate-800 text-rose-600">{activeWardDetail.rejected}</span>
                </div>
                <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 font-semibold block">QC Pass</span>
                  <span className="font-black text-slate-800">{activeWardDetail.totalReports > 0 ? `${activeWardDetail.qcPercentage}%` : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Detail Section: Module Breakdown table */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Module Breakdown</h4>
              <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="p-2">Module</th>
                      <th className="p-2 text-center">Reports</th>
                      <th className="p-2 text-center">Approved</th>
                      <th className="p-2 text-center">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-50">
                      <td className="p-2 font-bold">Sweeping</td>
                      <td className="p-2 text-center">{activeWardDetail.sweeping.reports}</td>
                      <td className="p-2 text-center text-emerald-600">{activeWardDetail.sweeping.approved}</td>
                      <td className="p-2 text-center text-rose-600">{activeWardDetail.sweeping.issues}</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="p-2 font-bold">Toilets</td>
                      <td className="p-2 text-center">{activeWardDetail.toilets.reports}</td>
                      <td className="p-2 text-center text-emerald-600">{activeWardDetail.toilets.approved}</td>
                      <td className="p-2 text-center text-rose-600">{activeWardDetail.toilets.issues}</td>
                    </tr>
                    <tr className="border-b border-slate-50">
                      <td className="p-2 font-bold">Litter Bin</td>
                      <td className="p-2 text-center">{activeWardDetail.twinbin.reports}</td>
                      <td className="p-2 text-center text-emerald-600">{activeWardDetail.twinbin.approved}</td>
                      <td className="p-2 text-center text-rose-600">{activeWardDetail.twinbin.issues}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold">GVP</td>
                      <td className="p-2 text-center">{activeWardDetail.taskforce.reports}</td>
                      <td className="p-2 text-center text-emerald-600">{activeWardDetail.taskforce.approved}</td>
                      <td className="p-2 text-center text-rose-600">{activeWardDetail.taskforce.issues}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Repeat Hotspots details */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Repeat Hotspots ({activeWardDetail.repeatHotspots})</h4>
              {activeWardDetail.hotspotsList.length > 0 ? (
                <div className="space-y-2">
                  {activeWardDetail.hotspotsList.map((h, i) => (
                    <div key={i} className="flex justify-between items-center text-xs p-2 bg-rose-50/30 rounded-xl border border-rose-100/50">
                      <span className="font-semibold text-slate-700">{h.location}</span>
                      <span className="font-black text-rose-600">{h.count} negative reports</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">No repeat hotspots logged.</div>
              )}
            </div>

          </div>

          {/* Drawer footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button 
              onClick={() => setSelectedWardDetailId(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all"
            >
              Close
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
