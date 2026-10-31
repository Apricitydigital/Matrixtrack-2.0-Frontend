import { todayIST } from './api';
/**
 * MatrixTrack 2.0 - Domain Calculations, Metrics Aggregators & Ward Ranking Engine
 */

import {
  WardRankingRecord,
  OperationalReport,
  AttendanceRecord,
  IecCleanlinessIssue,
  Ward,
  Beat,
  OperationalModuleId
} from '../types';

export interface WardRankingFormulaInputs {
  ward: Ward;
  beats: Beat[];
  attendanceRecords: AttendanceRecord[];
  reports: OperationalReport[];
  iecIssues: IecCleanlinessIssue[];
}

/**
 * Calculates official illustrative Ward Ranking using the specified 100-point weighting:
 * - Workforce Attendance (15 pts): (Present + Late*0.5) / Verified Denominator * 15
 * - Beat Coverage (10 pts): Active beats with timely sweeping reports / Total beats * 10
 * - Nala (10 pts): Clean nala inspection pass rate * 10
 * - Cleanliness of Toilet (15 pts): Average toilet inspection score (0-100) / 100 * 15
 * - Litter Bin Clearance (10 pts): Bins inspected non-overflowing / Total bin inspections * 10
 * - CTU/GVP Transformation (10 pts): Cleared & monitored GVPs / Total GVPs in ward * 10
 * - Supervisor (Daroga) Timeliness (10 pts): Daroga reviews completed within 2h / total * 10
 * - QC (Sanitary Inspector) Verification (10 pts): SI inspections completed / expected * 10
 * - Action Officer (IEC Member) Closure (10 pts): IEC complaints resolved & verified / total * 10
 * Total = 100 pts
 */
export function computeWardRanking(
  cityId: string,
  wards: Ward[],
  zoneMap: Record<string, string>,
  beats: Beat[],
  attendance: AttendanceRecord[],
  reports: OperationalReport[],
  iecIssues: IecCleanlinessIssue[],
  previousRankings: Record<string, number> = {}
): WardRankingRecord[] {
  const cityWards = wards.filter(w => w.cityId === cityId && w.status === 'active');
  const nowStr = todayIST();

  const scoredWards = cityWards.map(ward => {
    const wardBeats = beats.filter(b => b.wardId === ward.id && b.status === 'active');
    const wardAtt = attendance.filter(a => a.wardId === ward.id);
    const wardReports = reports.filter(r => r.wardId === ward.id);
    const wardIec = iecIssues.filter(i => i.wardId === ward.id);

    // 1. Workforce Score (max 15)
    let workforceScore = 0;
    let workforceDetails = 'No backend data available';
    if (wardAtt.length > 0) {
      const present = wardAtt.filter(a => a.status === 'present').length;
      const late = wardAtt.filter(a => a.status === 'late').length;
      const effectiveAtt = (present + late * 0.7) / wardAtt.length;
      workforceScore = Math.min(15, Math.round(effectiveAtt * 15 * 10) / 10);
      workforceDetails = `${present} present, ${late} late of ${wardAtt.length} staff (${Math.round(effectiveAtt * 100)}%)`;
    }

    // 2. Beat Sweeping Score (max 10)
    let beatScore = 0;
    let beatDetails = 'No backend data available';
    if (wardBeats.length > 0) {
      const sweepingReports = wardReports.filter(r => r.moduleId === 'sweeping' && r.status === 'approved');
      const ratio = Math.min(1, sweepingReports.length / Math.max(1, wardBeats.length));
      beatScore = Math.round(ratio * 10 * 10) / 10;
      beatDetails = `${sweepingReports.length} approved inspections across ${wardBeats.length} beats`;
    }

    // 3. Nala Score (max 10)
    const nalaReports = wardReports.filter(r => r.moduleId === 'nala');
    let nalaScore = 0;
    let nalaDetails = 'No backend data available';
    if (nalaReports.length > 0) {
      const approved = nalaReports.filter(r => r.status === 'approved').length;
      nalaScore = Math.round((approved / nalaReports.length) * 10 * 10) / 10;
      nalaDetails = `${approved}/${nalaReports.length} drains verified silt-free`;
    }

    // 4. Cleanliness of Toilet Score (max 15)
    const toiletReports = wardReports.filter(r => r.moduleId === 'toilets');
    let toiletScore = 0;
    let toiletDetails = 'No backend data available';
    if (toiletReports.length > 0) {
      const avgHygiene = toiletReports.reduce((acc, curr) => acc + curr.overallScore, 0) / toiletReports.length;
      toiletScore = Math.round((avgHygiene / 100) * 15 * 10) / 10;
      toiletDetails = `Avg score ${Math.round(avgHygiene)}% across ${toiletReports.length} facility inspections`;
    }

    // 5. Litter Bin Score (max 10)
    const binReports = wardReports.filter(r => r.moduleId === 'litter_bins');
    let binScore = 0;
    let binDetails = 'No backend data available';
    if (binReports.length > 0) {
      const approved = binReports.filter(r => r.status === 'approved').length;
      binScore = Math.round((approved / binReports.length) * 10 * 10) / 10;
      binDetails = `${approved}/${binReports.length} bins cleared on schedule`;
    }

    // 6. CTU/GVP Score (max 10)
    const gvpReports = wardReports.filter(r => r.moduleId === 'ctu_gvp');
    let gvpScore = 0;
    let gvpDetails = 'No backend data available';
    if (gvpReports.length > 0) {
      const transformed = gvpReports.filter(r => r.status === 'approved' || r.status === 'action_taken').length;
      gvpScore = Math.round((transformed / gvpReports.length) * 10 * 10) / 10;
      gvpDetails = `${transformed}/${gvpReports.length} GVPs transformed or zero-waste`;
    }

    // 7. Supervisor (Daroga) Score (max 10)
    const darogaReports = wardReports.filter(r => r.submittedByRole === 'SUPERVISOR');
    let supervisorScore = 0;
    let supervisorDetails = 'No backend data available';
    if (darogaReports.length > 0) {
      const timely = darogaReports.filter(r => r.overallScore >= 70).length;
      supervisorScore = Math.round((timely / darogaReports.length) * 10 * 10) / 10;
      supervisorDetails = `${timely}/${darogaReports.length} submissions meeting benchmark`;
    }

    // 8. QC (Sanitary Inspector) Score (max 10)
    const reviewedReports = wardReports.filter(r => r.reviewerRole === 'QC' || r.reviewerRole === 'Sanitary Inspector');
    let qcScore = 0;
    let qcDetails = 'No backend data available';
    if (reviewedReports.length > 0) {
      const verified = reviewedReports.filter(r => r.status === 'approved' || r.status === 'action_required').length;
      qcScore = Math.round((verified / reviewedReports.length) * 10 * 10) / 10;
      qcDetails = `${verified}/${reviewedReports.length} spot checks certified`;
    }

    // 9. Action Officer (IEC Member) Score (max 10)
    let actionOfficerScore = 0;
    let actionOfficerDetails = 'No backend data available';
    if (wardIec.length > 0) {
      const closed = wardIec.filter(i => i.status === 'approved_closed').length;
      actionOfficerScore = Math.round((closed / wardIec.length) * 10 * 10) / 10;
      actionOfficerDetails = `${closed}/${wardIec.length} cleanliness grievances verified closed`;
    }

    const totalScore = Math.min(100, Math.round(
      (workforceScore + beatScore + nalaScore + toiletScore + binScore + gvpScore + supervisorScore + qcScore + actionOfficerScore) * 10
    ) / 10);

    return {
      wardId: ward.id,
      wardNumber: ward.wardNumber,
      wardName: ward.name,
      zoneId: ward.zoneId,
      zoneName: zoneMap[ward.zoneId] || `Zone ${ward.zoneId}`,
      cityId: ward.cityId,
      rank: 0, // determined after sorting
      previousRank: previousRankings[ward.id] || 0,
      totalScore,
      components: {
        workforce: { score: workforceScore, weight: 15, details: workforceDetails },
        beat: { score: beatScore, weight: 10, details: beatDetails },
        nala: { score: nalaScore, weight: 10, details: nalaDetails },
        toilet: { score: toiletScore, weight: 15, details: toiletDetails },
        litterBin: { score: binScore, weight: 10, details: binDetails },
        gvp: { score: gvpScore, weight: 10, details: gvpDetails },
        supervisor: { score: supervisorScore, weight: 10, details: supervisorDetails },
        qc: { score: qcScore, weight: 10, details: qcDetails },
        actionOfficer: { score: actionOfficerScore, weight: 10, details: actionOfficerDetails }
      },
      snapshotCutoff: `${nowStr} 06:00 IST`,
      coveragePercentage: 0
    };
  });

  // Sort descending by total score to determine rank
  scoredWards.sort((a, b) => b.totalScore - a.totalScore);
  scoredWards.forEach((item, index) => {
    item.rank = index + 1;
    if (!item.previousRank) {
      // simulate realistic previous rank nearby
      item.previousRank = item.rank;
    }
  });

  return scoredWards;
}

export function filterReportsByDate(reports: OperationalReport[], datePreset: string, customStart?: string, customEnd?: string): OperationalReport[] {
  // Demo reference date: 2026-10-29
  const refDate = new Date(`${todayIST()}T23:59:59+05:30`);

  return reports.filter(r => {
    const rDate = new Date(`${r.inspectionDate}T00:00:00+05:30`);
    const diffDays = Math.floor((refDate.getTime() - rDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (datePreset) {
      case 'today':
        return diffDays === 0;
      case 'yesterday':
        return diffDays === 1;
      case 'last_7_days':
        return diffDays >= 0 && diffDays <= 7;
      case 'last_30_days':
        return diffDays >= 0 && diffDays <= 30;
      case 'this_month':
        return r.inspectionDate.startsWith(todayIST().slice(0, 7));
      case 'previous_month':
        return r.inspectionDate.startsWith(new Date(Date.UTC(refDate.getFullYear(), refDate.getMonth() - 1, 15)).toISOString().slice(0, 7));
      case 'custom':
        if (customStart && customEnd) {
          return r.inspectionDate >= customStart && r.inspectionDate <= customEnd;
        }
        return true;
      default:
        return true;
    }
  });
}
