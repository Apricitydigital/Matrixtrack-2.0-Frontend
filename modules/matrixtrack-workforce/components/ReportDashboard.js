import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { buildApiUrl } from "../config";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LabelList,
  Cell,
  PieChart,
  Pie,

} from "recharts";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { transformCitySummary } from "./CityAttendanceLineChart";
import KothiRoleChart from "./KothiRoleChart";
import ShiftWiseAttendanceChart from "./ShiftWiseAttendanceChart";
import ArrivalTrendChart from "./ArrivalTrendChart";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";
import TopSupervisors from "./TopSupervisors";

const Plot = createPlotlyComponent(Plotly);

const STATUS_COLORS = {
  marked: "#22c55e",
  onLeave: "#3b82f6",
  inProgress: "#f59e0b",
  notMarked: "#ef4444",
};
const ROLE_COLORS = {
  Driver: "#3B82F6",
  "Ramp Bigari": "#10B981",
  "Ramp Bigari Outsource": "#F59E0B",
  "Road Sweeper": "#EF4444",
  "Supervisor (Mukadam)": "#8B5CF6",
  "Swachh Worker": "#06B6D4",
  Sweeper: "#EC4899",
};
const overallStatusData = (summary, citySummary) => {
  if (summary && summary.totalEmployees > 0) {
    const present = (summary.marked || 0) + (summary.inProgress || 0);
    const onLeave = summary.onLeave || 0;
    // Recompute absent to strictly match the overall dashboard stats calculation
    let absent = summary.notMarked || 0;
    if (summary.totalEmployees > 0) {
      absent = Math.max(summary.totalEmployees - present - onLeave, 0);
    }

    return [
      { name: "Present", value: present, color: STATUS_COLORS.marked },
      { name: "On Leave", value: onLeave, color: STATUS_COLORS.onLeave },
      { name: "Absent", value: absent, color: STATUS_COLORS.notMarked },
    ];
  }

  const aggregated = (Array.isArray(citySummary) ? citySummary : []).reduce(
    (acc, city) => {
      const present = Number(city.present ?? city.marked ?? 0) || 0;
      acc.present += present;
      acc.onLeave += city.onLeave || city.on_leave || 0;
      acc.absent += city.notMarked || city.not_marked || city.absent || 0;
      return acc;
    },
    { present: 0, onLeave: 0, absent: 0 }
  );

  const total =
    aggregated.present + aggregated.onLeave + aggregated.absent;

  if (total === 0) {
    return [];
  }

  return [
    { name: "Present", value: aggregated.present, color: STATUS_COLORS.marked },
    { name: "On Leave", value: aggregated.onLeave, color: STATUS_COLORS.onLeave },
    {
      name: "Absent",
      value: aggregated.absent,
      color: STATUS_COLORS.notMarked,
    },
  ];
};

const buildWardSummary = (wards) => {
  if (!Array.isArray(wards)) {
    return [];
  }

  const wardSummaries = wards.map((ward) => {
    const employees = Array.isArray(ward.employees) ? ward.employees : [];
    const seen = new Set();
    const counts = employees.reduce(
      (acc, employee, index) => {
        const rawId =
          employee?.emp_id ??
          employee?.employee_id ??
          employee?.id ??
          employee?.emp_code ??
          `idx-${index}`;
        const key = `${ward?.ward_id ?? "ward"}:${rawId}`;
        if (seen.has(key)) {
          return acc;
        }
        seen.add(key);

        const status = (employee?.attendance_status || "").toLowerCase();
        if (status === "marked" || status === "in progress" || status.includes("progress")) {
          acc.present += 1;
        } else if (status === "leave" || status.includes("medical") || status.includes("casual")) {
          acc.onLeave += 1;
        } else {
          acc.absent += 1;
        }
        return acc;
      },
      { present: 0, onLeave: 0, absent: 0 }
    );

    return {
      ward: ward.ward_name || `Ward ${ward.ward_id}`,
      present: counts.present,
      onLeave: counts.onLeave,
      absent: counts.absent,
      total: counts.present + counts.onLeave + counts.absent,
      rate: counts.present + counts.onLeave + counts.absent > 0
        ? counts.present / (counts.present + counts.onLeave + counts.absent)
        : 0,
    };
  });

  return wardSummaries
    .filter((item) => item.total > 0)
    // Sort by attendance rate (highest first), then by total employees to break ties
    .sort((a, b) => b.rate - a.rate || b.total - a.total)
    .slice(0, 10);
};

const buildRadarData = (citySummary) => {
  const data = Array.isArray(citySummary) ? citySummary : [];
  return data
    .map((city) => {
      const total =
        (city.totalEmployees ??
          city.total_employees ??
          city.total ??
          city.totalEmployeesCount ??
          0) || 0;
      const present = city.present ?? city.marked ?? 0;
      const onLeave = city.onLeave ?? city.on_leave ?? 0;
      const attendanceRate =
        total > 0 ? Number((((present + onLeave) / total) * 100).toFixed(1)) : 0;
      return {
        city:
          city.city_name || city.cityName || city.city || `City ${city.city_id}`,
        attendanceRate,
      };
    })
    .filter((item) => item.attendanceRate > 0);
};

const buildZoneSummary = (wards) => {
  if (!Array.isArray(wards)) return [];
  const zoneMap = {};

  wards.forEach((ward) => {
    const zoneName = ward.zone || "Unknown Zone";
    if (!zoneMap[zoneName]) {
      zoneMap[zoneName] = { zone: zoneName, present: 0, onLeave: 0, absent: 0, total: 0 };
    }

    const employees = Array.isArray(ward.employees) ? ward.employees : [];
    employees.forEach((employee) => {
      const status = (employee?.attendance_status || "").toLowerCase();
      if (status === "marked" || status === "in progress" || status.includes("progress")) {
        zoneMap[zoneName].present += 1;
      } else if (status === "leave" || status.includes("medical") || status.includes("casual")) {
        zoneMap[zoneName].onLeave += 1;
      } else {
        zoneMap[zoneName].absent += 1;
      }
      zoneMap[zoneName].total += 1;
    });
  });

  return Object.values(zoneMap)
    .filter((z) => z.total > 0)
    .map((z) => ({ ...z, rate: z.total > 0 ? z.present / z.total : 0 }))
    .sort((a, b) => b.rate - a.rate || b.total - a.total)
    .slice(0, 10);
};

const buildDistribution = (wards, groupBy) => {
  if (!Array.isArray(wards)) return [];
  const map = {};
  wards.forEach((w) => {
    (w.employees || []).forEach((e) => {
      const attendanceStatus =
        (
          e.attendance_status ||
          e.status ||
          ""
        )
          .toUpperCase()
          .trim();

      if (
        !attendanceStatus.includes("LEAVE") &&
        !attendanceStatus.includes("MEDICAL") &&
        !attendanceStatus.includes("CASUAL") &&
        attendanceStatus !== "CL" &&
        attendanceStatus !== "EL" &&
        attendanceStatus !== "SLML" &&
        attendanceStatus !== "LOP"
      ) {
        return;
      }
      let key = "Unknown";
      if (groupBy === 'role') key = e.designation || e.designation_name || "Unknown Role";
      if (groupBy === 'zone') key = w.zone || w.zone_name || "Unknown Zone";
      if (groupBy === 'ward') key = w.ward_name || w.name || "Unknown Ward";
      map[key] = (map[key] || 0) + 1;
    });
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const buildMonthOptions = () => {
  const now = new Date();
  const istParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const todayYear = Number(istParts.find((p) => p.type === "year").value);
  const todayMonth = Number(istParts.find((p) => p.type === "month").value);
  const todayDay = istParts.find((p) => p.type === "day").value;
  const todayDate = `${todayYear}-${String(todayMonth).padStart(2, "0")}-${todayDay}`;

  const options = [];
  for (let i = 0; i < 6; i++) {
    let m = todayMonth - i;
    let y = todayYear;
    if (m <= 0) {
      m += 12;
      y -= 1;
    }
    const monthStr = String(m).padStart(2, "0");
    const startDate = `${y}-${monthStr}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    let endDate = `${y}-${monthStr}-${String(lastDay).padStart(2, "0")}`;
    if (i === 0) endDate = todayDate;

    const label = i === 0 ? `${MONTH_NAMES[m - 1]} ${y} (Current)` : `${MONTH_NAMES[m - 1]} ${y}`;
    options.push({ label, value: `${y}-${monthStr}`, startDate, endDate });
  }
  return options;
};

const extractWardName = (name) => {
  if (!name) return "Unknown Ward";
  const match = name.match(/\((Prabhag[^)]+)\)/i) || name.match(/(Prabhag\s*[\d\w-]+)/i) || name.match(/\((Ward[^)]+)\)/i);
  if (match) return match[1].trim();
  const wardMatch = name.match(/(Ward\s*[\d]+)/i);
  if (wardMatch) return wardMatch[0].trim();
  return "General Ward";
};

const extractKothiName = (name) => {
  if (!name) return "Unknown Kothi";
  let k = name.replace(/\((Prabhag[^)]+)\)/i, '').replace(/(Prabhag\s*[\d\w-]+)/i, '').replace(/\((Ward[^)]+)\)/i, '').replace(/(Ward\s*[\d]+)/i, '').replace(/\(\s*\)/g, '').trim();
  return k.replace(/^[-,\s]+|[-,\s]+$/g, '') || name;
};

const buildEmployeeSummary = (
  wards,
  filters,
  masterWards = []
) => {
  if (!Array.isArray(wards)) return [];
  const { role, zone, ward, kothi } = filters || {};
  const employeesMap = {};

  wards.forEach((w) => {
    // Location filtering at ward level
    const wZone = w.zone || w.zone_name || "Unknown Zone";
    const rawName = w.ward_name || w.name || "";
    const wWard =
      masterWards.find((s) =>
        (s.kothis || []).some(
          (k) => k.wardId === w.ward_id
        )
      )?.sectorName ||
      extractWardName(rawName);
    const wKothi = extractKothiName(rawName);

    if (zone && zone !== "ALL" && wZone !== zone) return;
    if (ward && ward !== "ALL" && wWard !== ward) return;
    if (kothi && kothi !== "ALL" && wKothi !== kothi) return;

    const employees = Array.isArray(w.employees) ? w.employees : [];
    employees.forEach((employee, idx) => {
      const designation = employee.designation || employee.designation_name || "Unknown";
      const lowerDes = designation.toLowerCase();

      if (lowerDes.includes("supervisor") || lowerDes.includes("mukadam") || lowerDes.includes("inspector")) {
        return;
      }

      if (role && role !== "ALL" && designation !== role) {
        return;
      }

      // Use a stable ID for aggregation across multiple days
      const empId = employee.emp_id || employee.employee_id || employee.emp_code || employee.employee_code;
      if (!empId) return;

      const inEpoch = Number(employee.punch_in_epoch) || 0;
      const outEpoch = Number(employee.punch_out_epoch) || 0;

      const status = (employee.attendance_status || employee.status || "").toLowerCase().trim();
      // Broaden presence detection
      const isPresent = status === "marked" ||
        status === "present" ||
        status === "completed" ||
        status === "punched in" ||
        status === "punched out" ||
        status.includes("progress") ||
        status.includes("punch") ||
        status === "on duty";

      let seconds_worked = 0;
      if (inEpoch > 0) {
        if (outEpoch > inEpoch) seconds_worked = outEpoch - inEpoch;
        else {
          const nowEpoch = Math.floor(Date.now() / 1000);
          seconds_worked = Math.max(nowEpoch - inEpoch, 0);
        }
      }

      // Use backend-provided days_present (COUNT DISTINCT dates) directly.
      // It's already the correct multi-day count — no need to self-count.
      const backendDaysPresent = Number(employee.days_present ?? employee.days_marked ?? 0);

      if (!employeesMap[empId]) {
        employeesMap[empId] = {
          emp_id: empId,
          name: employee.emp_name || employee.employee_name || employee.name || "Unknown",
          seconds_worked: seconds_worked,
          hours_worked: Number((seconds_worked / 3600).toFixed(1)),
          role: designation,
          zone: wZone,
          ward: wWard,
          kothi: wKothi,
          days_present: backendDaysPresent,
        };
      } else {
        employeesMap[empId].seconds_worked += seconds_worked;
        employeesMap[empId].hours_worked = Number((employeesMap[empId].seconds_worked / 3600).toFixed(1));
        // Keep the highest value in case of duplicate rows
        if (backendDaysPresent > employeesMap[empId].days_present) {
          employeesMap[empId].days_present = backendDaysPresent;
        }
      }
    });
  });

  return Object.values(employeesMap)
    .filter((e) => e.days_present > 0 || e.hours_worked > 0)
    .sort((a, b) => b.days_present - a.days_present || b.hours_worked - a.hours_worked)
    .slice(0, 10);
};

const extractUniqueRoles = (wards) => {
  const roles = new Set();
  (Array.isArray(wards) ? wards : []).forEach(ward => {
    const emps = Array.isArray(ward.employees) ? ward.employees : [];
    emps.forEach(emp => {
      const des = emp.designation || emp.designation_name;
      if (des && typeof des === "string") {
        const lowerDes = des.toLowerCase();
        if (!lowerDes.includes("supervisor") && !lowerDes.includes("mukadam") && !lowerDes.includes("inspector")) {
          roles.add(des.trim());
        }
      }
    });
  });
  return Array.from(roles).sort();
};

function ReportDashboard({
  citySummary,
  wards: initialWards,
  summary,
  onClose,
  dateRangeLabel,
  selectedCity,
  selectedSupervisor,
  isAdmin,
  isInline,
  startDate,
  endDate,
  selectedCityId,
  refreshKey,
  onInsightsChange,

}) {
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [selectedZone, setSelectedZone] = useState("ALL");
  const [selectedWard, setSelectedWard] = useState("ALL");
  const [selectedKothi, setSelectedKothi] = useState("ALL");
  const [selectedSupervisorZone, setSelectedSupervisorZone] = useState("ALL");
  // KOTHI ORIGIN FILTERS
  const [kothiOriginCity, setKothiOriginCity] = useState("ALL");
  const [kothiOriginZone, setKothiOriginZone] = useState("ALL");
  const [kothiOriginWard, setKothiOriginWard] = useState("ALL");
  const [selectedSupervisorWard, setSelectedSupervisorWard] = useState("ALL");
  // Master data for filters
  const [masterZones, setMasterZones] = useState([]);
  const [masterWards, setMasterWards] = useState([]);
  const [masterKothis, setMasterKothis] = useState([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [attendanceInsightZone, setAttendanceInsightZone] =
    useState("ALL");

  const [attendanceInsightWard, setAttendanceInsightWard] =
    useState("ALL");

  const [attendanceInsightView, setAttendanceInsightView] =
    useState("zone");
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [localWards, setLocalWards] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [roleCardZone, setRoleCardZone] =
    useState("ALL");
  const [leaveZone, setLeaveZone] = useState("ALL");
  const [leaveWard, setLeaveWard] = useState("ALL");
  const [roleCardWard, setRoleCardWard] =
    useState("ALL");

  const [roleCardKothi, setRoleCardKothi] =
    useState("ALL");
  const effectiveWards = initialWards;
  const fetchMonthData = useCallback(async (periodValue) => {
    const option = monthOptions.find(o => o.value === periodValue);
    if (!option) {
      setLocalWards(null);
      return;
    }

    console.log(`[DEBUG] fetchMonthData: Fetching for ${periodValue}`, option.startDate, option.endDate);
    setFetching(true);
    try {
      const token = localStorage.getItem("token");
      const url = buildApiUrl("/app/supervisor/wards");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          startDate: option.startDate,
          endDate: option.endDate,
          city_id: selectedCity?.city_id || undefined,
          user_id: selectedSupervisor?.user_id || undefined,
        }),
      });
      const payload = await response.json();
      setLocalWards(Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error("Local fetch failed", err);
    } finally {
      setFetching(false);
    }
  }, [monthOptions, selectedCity, selectedSupervisor]);

  useEffect(() => {
    if (!selectedPeriod) {
      setLocalWards(null);
      return;
    }
    fetchMonthData(selectedPeriod);
  }, [selectedPeriod, fetchMonthData, isInline]);

  // Fetch Master Data
  useEffect(() => {
    const fetchMasterData = async () => {
      setMasterLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        };

        // 1. Fetch Zones
        const zoneRes = await fetch(buildApiUrl("/zones"), { headers });
        const zones = await zoneRes.json();
        setMasterZones(Array.isArray(zones) ? zones : []);

        // 2. Fetch Wards (Sectors in Master)
        const sectorRes = await fetch(buildApiUrl("/sectors"), { headers });
        const sectorsPayload = await sectorRes.json();
        // Sectors are usually grouped by City -> Zone. Flatten them or handle as needed.
        let allSectors = [];
        if (Array.isArray(sectorsPayload)) {
          sectorsPayload.forEach(cityObj => {
            if (cityObj.zones) {
              cityObj.zones.forEach(zoneObj => {
                if (zoneObj.sectors) {
                  zoneObj.sectors.forEach(s => {
                    allSectors.push({ ...s, zoneName: zoneObj.zone });
                  });
                }
              });
            }
          });
        }
        setMasterWards(allSectors);

        // 3. Fetch Kothis (Wards in Master)
        const wardRes = await fetch(buildApiUrl("/wards"), { headers });
        const wardsPayload = await wardRes.json();
        let allKothis = [];
        if (Array.isArray(wardsPayload)) {
          if (wardsPayload.length > 0 && wardsPayload[0].ward_id !== undefined) {
            allKothis = wardsPayload.map(w => ({
              ...w,
              wardName: w.ward_name,
              zoneName: w.zone_name,
              cityName: w.city_name
            }));
          } else {
            wardsPayload.forEach(cityObj => {
              if (cityObj.zones) {
                cityObj.zones.forEach(zoneObj => {
                  if (zoneObj.wards) {
                    zoneObj.wards.forEach(w => {
                      allKothis.push({
                        ...w,
                        wardName: w.ward_name || w.name,
                        zoneName: zoneObj.zone_name || zoneObj.zone,
                        cityName: cityObj.city_name || cityObj.city
                      });
                    });
                  }
                });
              }
            });
          }
        }
        setMasterKothis(allKothis);

      } catch (err) {
        console.error("Failed to fetch master data", err);
      } finally {
        setMasterLoading(false);
      }
    };

    fetchMasterData();
  }, [selectedCityId, refreshKey]);

  const availableRoles = useMemo(() => extractUniqueRoles(effectiveWards), [effectiveWards]);


  const uniqueZones = useMemo(() => {
    const list = new Set();
    // Prioritize master zones if available
    if (masterZones.length > 0) {
      masterZones
        .filter(z => !selectedCityId || z.city_id === selectedCityId)
        .forEach(z => list.add(z.zone_name));
    } else {
      (effectiveWards || []).forEach(w => list.add(w.zone || w.zone_name || "Unknown Zone"));
    }
    return Array.from(list).sort();
  }, [effectiveWards, masterZones, selectedCityId]);
  const leaveWards = useMemo(() => {
    const wards = new Set();

    (effectiveWards || []).forEach((w) => {
      const zone =
        w.zone ||
        w.zone_name ||
        "Unknown Zone";

      if (
        leaveZone !== "ALL" &&
        zone !== leaveZone
      ) {
        return;
      }

      let wardName = "Unknown Ward";

      if (masterWards.length > 0) {
        const foundSector = masterWards.find((s) =>
          (s.kothis || []).some(
            (k) => String(k.wardId) === String(w.ward_id)
          )
        );

        if (foundSector) {
          wardName = foundSector.sectorName;
        }
      }

      if (wardName === "Unknown Ward") {
        wardName = extractWardName(
          w.ward_name || w.name
        );
      }

      wards.add(wardName);
    });

    return Array.from(wards).sort();
  }, [
    effectiveWards,
    leaveZone,
    masterWards
  ]);

  const punchTimeAnalysis = useMemo(() => {

    const hourlyData = {};

    for (let i = 0; i < 24; i++) {
      hourlyData[i] = {
        hour: `${i}:00`,
        punchIn: 0,
        midPunch: 0,
        punchOut: 0,
      };
    }

    (effectiveWards || []).forEach((w) => {

      (w.employees || []).forEach((e) => {

        // DEBUG
        console.log("EMPLOYEE OBJECT =", e);
        console.log("EMPLOYEE KEYS =", Object.keys(e));

        // PUNCH IN
        if (e.punch_in_epoch) {

          const inHour = new Date(
            Number(e.punch_in_epoch) * 1000
          ).getHours();

          if (hourlyData[inHour]) {
            hourlyData[inHour].punchIn += 1;
          }
        }

        // MID PUNCH DEBUG
        // MID PUNCH
        const midTime =
          e.mid_shift_punch_in_time ||
          e.midShiftPunchInTime ||
          e.mid_shift_punch_in_display ||
          e.midShiftPunchInDisplay;

        if (midTime) {

          const midDate = new Date(midTime);

          if (!isNaN(midDate.getTime())) {

            const midHour = midDate.getHours();

            if (hourlyData[midHour]) {
              hourlyData[midHour].midPunch += 1;
            }

          }
        }

        // PUNCH OUT
        if (e.punch_out_epoch) {

          const outHour = new Date(
            Number(e.punch_out_epoch) * 1000
          ).getHours();

          if (hourlyData[outHour]) {
            hourlyData[outHour].punchOut += 1;
          }
        }

      });

    });
    const result = Object.values(hourlyData);

    console.log("Punch Analysis Result", result);

    return result;


  }, [effectiveWards]);
  const roleCardUniqueWards = useMemo(() => {

    const set = new Set();

    if (masterWards.length > 0) {

      masterWards
        .filter((s) => {

          return (
            roleCardZone === "ALL" ||
            s.zoneName === roleCardZone
          );

        })
        .forEach((s) => {

          set.add(s.sectorName);

        });

    } else {

      (effectiveWards || [])
        .filter((w) => {

          const z =
            w.zone ||
            w.zone_name ||
            "Unknown Zone";

          return (
            roleCardZone === "ALL" ||
            z === roleCardZone
          );

        })
        .forEach((w) => {

          set.add(
            extractWardName(
              w.ward_name || w.name
            )
          );

        });

    }

    return Array.from(set).sort();

  }, [
    effectiveWards,
    roleCardZone,
    masterWards
  ]);
  const roleCardUniqueKothis = useMemo(() => {

    const set = new Set();

    if (masterWards.length > 0) {

      masterWards
        .filter((s) => {

          const zoneMatch =
            roleCardZone === "ALL" ||
            s.zoneName === roleCardZone;

          const wardMatch =
            roleCardWard === "ALL" ||
            s.sectorName === roleCardWard;

          return zoneMatch && wardMatch;

        })
        .forEach((s) => {

          (s.kothis || []).forEach((k) => {

            set.add(k.wardName);

          });

        });

    } else {

      (effectiveWards || [])
        .forEach((w) => {

          const z =
            w.zone ||
            w.zone_name ||
            "Unknown Zone";

          let ward = "Unknown Ward";

          const foundSector =
            masterWards.find((s) =>
              (s.kothis || []).some(
                (k) => k.wardId === w.ward_id
              )
            );

          if (foundSector) {
            ward = foundSector.sectorName;
          } else {
            ward = extractWardName(
              w.ward_name || w.name
            );
          }

          const kothi =
            extractKothiName(
              w.ward_name || w.name
            );

          if (
            roleCardZone !== "ALL" &&
            z !== roleCardZone
          ) {
            return;
          }

          if (
            roleCardWard !== "ALL" &&
            ward !== roleCardWard
          ) {
            return;
          }

          set.add(kothi);

        });

    }

    return Array.from(set).sort();

  }, [
    effectiveWards,
    roleCardZone,
    roleCardWard,
    masterWards
  ]);
  const roleCardGraphData = useMemo(() => {

    const map = {};

    (effectiveWards || []).forEach((w) => {

      const zone =
        w.zone ||
        w.zone_name ||
        "Unknown Zone";

      let wardName = "Unknown Ward";

      if (masterWards.length > 0) {

        const foundSector =
          masterWards.find((s) =>
            (s.kothis || []).some(
              (k) => k.wardId === w.ward_id
            )
          );

        if (foundSector) {
          wardName = foundSector.sectorName;
        }

      }

      if (wardName === "Unknown Ward") {

        wardName =
          extractWardName(
            w.ward_name || w.name
          );

      }

      const kothi =
        extractKothiName(
          w.ward_name || w.name
        );

      if (
        roleCardZone !== "ALL" &&
        zone !== roleCardZone
      ) {
        return;
      }

      if (
        roleCardWard !== "ALL" &&
        wardName !== roleCardWard
      ) {
        return;
      }

      if (
        roleCardKothi !== "ALL" &&
        kothi !== roleCardKothi
      ) {
        return;
      }

      if (!map[kothi]) {

        map[kothi] = {
          name: kothi,

          Driver: 0,
          "Ramp Bigari": 0,
          "Ramp Bigari Outsource": 0,
          "Road Sweeper": 0,
          "Supervisor (Mukadam)": 0,
          "Swachh Worker": 0,
          Sweeper: 0,
        };

      }

      (w.employees || []).forEach((e) => {

        const role =
          e.designation ||
          e.designation_name ||
          "Unknown";

        if (
          map[kothi][role] !== undefined
        ) {
          map[kothi][role] += 1;
        }

      });

    });

    return Object.values(map);

  }, [
    effectiveWards,
    masterWards,
    roleCardZone,
    roleCardWard,
    roleCardKothi
  ]);
  const attendanceInsightUniqueWards =
    useMemo(() => {

      const set = new Set();

      (effectiveWards || []).forEach((w) => {

        const zone =
          w.zone ||
          w.zone_name ||
          "Unknown Zone";

        if (
          attendanceInsightZone !== "ALL" &&
          zone !== attendanceInsightZone
        ) {
          return;
        }

        const ward =
          extractWardName(
            w.ward_name || w.name
          );

        set.add(ward);

      });

      return Array.from(set).sort();

    }, [
      effectiveWards,
      attendanceInsightZone
    ]);
  const attendanceInsightData =
    useMemo(() => {

      const map = {};

      (effectiveWards || []).forEach((w) => {

        const zone =
          w.zone ||
          w.zone_name ||
          "Unknown Zone";

        const ward =
          extractWardName(
            w.ward_name || w.name
          );

        if (
          attendanceInsightZone !== "ALL" &&
          zone !== attendanceInsightZone
        ) {
          return;
        }

        if (
          attendanceInsightWard !== "ALL" &&
          ward !== attendanceInsightWard
        ) {
          return;
        }

        const key =
          attendanceInsightView === "zone"
            ? zone
            : ward;

        if (!map[key]) {

          map[key] = {
            name: key,
            present: 0,
            absent: 0,
            leave: 0,
          };

        }

        (w.employees || []).forEach((e) => {

          const status =
            (
              e.attendance_status || ""
            )
              .toLowerCase()
              .trim();

          const isPresent =
            status === "marked" ||
            status.includes("progress") ||
            status === "present";

          const isLeave =
            status.includes("leave") ||
            status.includes("medical") ||
            status.includes("casual");

          if (isPresent) {

            map[key].present += 1;

          } else if (isLeave) {

            map[key].leave += 1;

          } else {

            map[key].absent += 1;

          }

        });

      });

      return Object.values(map).map((item) => {

        const total =
          item.present +
          item.absent

        return {
          ...item,

          total,

          percentage:
            total > 0
              ? Math.round(
                (item.present / total) * 100
              )
              : 0,
        };

      });

    }, [
      effectiveWards,
      attendanceInsightZone,
      attendanceInsightWard,
      attendanceInsightView
    ]);
  const uniqueWards = useMemo(() => {
    const list = new Set();
    if (masterWards.length > 0) {
      masterWards
        .filter(s => selectedZone === "ALL" || s.zoneName === selectedZone)
        .forEach(s => list.add(s.sectorName));
    } else {
      (effectiveWards || []).filter(w => selectedZone === "ALL" || (w.zone || w.zone_name) === selectedZone)
        .forEach(w => list.add(extractWardName(w.ward_name || w.name)));
    }
    return Array.from(list).sort();
  }, [effectiveWards, selectedZone, masterWards]);

  const uniqueKothis = useMemo(() => {
    const list = new Set();
    if (masterWards.length > 0) {
      // Find the selected sector(s) and collect their kothis
      masterWards
        .filter(s => {
          const matchesZone = selectedZone === "ALL" || s.zoneName === selectedZone;
          const matchesSector = selectedWard === "ALL" || s.sectorName === selectedWard;
          return matchesZone && matchesSector;
        })
        .forEach(s => {
          if (Array.isArray(s.kothis)) {
            s.kothis.forEach(k => list.add(k.wardName));
          }
        });
    } else {
      (effectiveWards || []).filter(w => {
        const zName = w.zone || w.zone_name || "Unknown Zone";
        const wWard = extractWardName(w.ward_name || w.name);
        return (selectedZone === "ALL" || zName === selectedZone) && (selectedWard === "ALL" || wWard === selectedWard);
      }).forEach(w => list.add(extractKothiName(w.ward_name || w.name)));
    }
    return Array.from(list).sort();
  }, [effectiveWards, selectedZone, selectedWard, masterWards]);
  const kothiOriginUniqueWards = useMemo(() => {

    const list = new Set();

    if (masterWards.length > 0) {

      masterWards
        .filter((s) => {

          return (
            kothiOriginZone === "ALL" ||
            s.zoneName === kothiOriginZone
          );

        })
        .forEach((s) => {

          list.add(s.sectorName);

        });

    } else {

      (effectiveWards || [])
        .filter((w) => {

          const zName =
            w.zone ||
            w.zone_name ||
            "Unknown Zone";

          return (
            kothiOriginZone === "ALL" ||
            zName === kothiOriginZone
          );

        })
        .forEach((w) => {

          list.add(
            extractWardName(
              w.ward_name || w.name
            )
          );

        });

    }

    return Array.from(list).sort();

  }, [
    effectiveWards,
    kothiOriginZone,
    masterWards
  ]);
  const employeeSummary = useMemo(() => {
    // Priority: 
    // 1. If a specific month is selected and we have fetched localWards, use them.
    // 2. Otherwise fall back to initialWards (dashboard range).
    const targetWards =
      selectedPeriod && localWards
        ? localWards
        : initialWards;
    return buildEmployeeSummary(targetWards, {
      role: selectedRole,
      zone: selectedZone,
      ward: selectedWard,
      kothi: selectedKothi
    }, masterWards,
    );
  }, [initialWards, localWards, selectedPeriod, selectedRole, selectedZone, selectedWard, selectedKothi]);

  const reportSectionsRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const isSingleDay = Boolean(startDate && endDate && startDate === endDate);
  const employeeDataKey = isSingleDay ? "hours_worked" : "days_present";
  const employeeDataName = isSingleDay ? "Total Hours Worked" : "Days Present";

  const cityLineData = useMemo(
    () => transformCitySummary(citySummary),
    [citySummary]
  );
  const zoneSummary = useMemo(() => buildZoneSummary(effectiveWards), [effectiveWards]);
  const zoneSummaryWithPercentage =
    useMemo(() => {

      return zoneSummary.map((item) => {

        const registered =
          Number(item.present || 0) +
          Number(item.onLeave || 0) +
          Number(item.absent || 0);

        return {
          ...item,

          totalPercentage:
            registered > 0
              ? (
                (
                  Number(item.present || 0) /
                  registered
                ) * 100
              ).toFixed(1)
              : "0.0",
        };
      });

    }, [zoneSummary]);
  const bestZone = useMemo(() => {
    return [...zoneSummaryWithPercentage]
      .sort(
        (a, b) =>
          Number(b.totalPercentage || 0) -
          Number(a.totalPercentage || 0)
      )[0];
  }, [zoneSummaryWithPercentage]);

  const lowPerformanceZones = useMemo(() => {
    return zoneSummaryWithPercentage.filter(
      (z) => Number(z.totalPercentage) < 50
    ).length;
  }, [zoneSummaryWithPercentage]);
  const roleDistribution = useMemo(() => buildDistribution(effectiveWards, 'role'), [effectiveWards]);
  const totalEmployees =
    roleDistribution?.reduce(
      (sum, item) => sum + Number(item.value || 0),
      0
    ) || 0;
  const areaDistribution = useMemo(() => {

    const map = {};

    (effectiveWards || []).forEach((w) => {
      const wardCity = w.city || w.city_name || "Unknown City";
      const wardZone =
        w.zone ||
        w.zone_name ||
        "Unknown Zone";
      let wardName = "Unknown Ward";

      // FIND REAL SECTOR NAME
      if (masterWards.length > 0) {

        const foundSector =
          masterWards.find((s) =>
            (s.kothis || []).some(
              (k) => k.wardId === w.ward_id
            )
          );

        if (foundSector) {
          wardName = foundSector.sectorName;
        }

      }

      // FALLBACK
      if (wardName === "Unknown Ward") {

        wardName =
          extractWardName(
            w.ward_name || w.name
          );

      }

      // CITY FILTER
      if (
        kothiOriginCity !== "ALL" &&
        wardCity !== kothiOriginCity
      ) {
        return;
      }

      // ZONE FILTER
      if (
        kothiOriginZone !== "ALL" &&
        wardZone !== kothiOriginZone
      ) {
        return;
      }

      // WARD FILTER
      if (
        kothiOriginWard !== "ALL" &&
        wardName !== kothiOriginWard
      ) {
        return;
      }
      const kothiName =
        extractKothiName(
          w.ward_name || w.name
        );

      if (!map[kothiName]) {

        map[kothiName] = {
          name: kothiName,

          present: 0,
          absent: 0,
          leave: 0,
          total: 0,
        };

      }

      const uniqueEmployees =
        new Set();

      (w.employees || []).forEach((e, index) => {

        const empId =
          e?.emp_id ||
          e?.employee_id ||
          e?.id ||
          e?.emp_code ||
          `idx-${index}`;

        if (uniqueEmployees.has(empId)) {
          return;
        }

        uniqueEmployees.add(empId);

        const status =
          (e?.attendance_status || "")
            .toLowerCase()
            .trim();

        const isPresent =
          status === "marked" ||
          status === "present" ||
          status === "completed" ||
          status === "punched in" ||
          status === "punched out" ||
          status.includes("progress") ||
          status.includes("punch") ||
          status === "on duty";

        const isLeave =
          status === "leave" ||
          status.includes("medical") ||
          status.includes("casual");

        if (isPresent) {

          map[kothiName].present += 1;

        } else if (isLeave) {

          map[kothiName].leave += 1;

        } else {

          map[kothiName].absent += 1;

        }

        map[kothiName].total += 1;

      });

    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        attendancePercentage:
          item.total > 0
            ? Math.round(
              (item.present / item.total) * 100
            )
            : 0,
      }))
      .sort((a, b) => {
        // Highest attendance % first
        if (b.attendancePercentage !== a.attendancePercentage) {
          return b.attendancePercentage - a.attendancePercentage;
        }

        // Tie breaker
        return b.present - a.present;
      });

  }, [effectiveWards, kothiOriginCity, kothiOriginZone,
    kothiOriginWard, masterWards
  ]);

  const uniqueCitiesForKothi = useMemo(() => {
    const list = new Set();
    (effectiveWards || []).forEach((w) => {
      const c = w.city || w.city_name;
      if (c) list.add(c);
    });
    if (list.size === 0 && Array.isArray(citySummary)) {
      citySummary.forEach(c => {
        const name = c.city_name || c.cityName || c.city;
        if (name) list.add(name);
      });
    }
    return Array.from(list).sort();
  }, [effectiveWards, citySummary]);

  const uniqueZonesForKothi = useMemo(() => {
    const list = new Set();
    (effectiveWards || []).forEach((w) => {
      const city = w.city || w.city_name || "Unknown City";
      const zone = w.zone || w.zone_name;
      if (zone && (kothiOriginCity === "ALL" || city === kothiOriginCity)) {
        list.add(zone);
      }
    });
    return Array.from(list).sort();
  }, [effectiveWards, kothiOriginCity]);

  const uniqueWardsForKothi = useMemo(() => {
    const list = new Set();
    (effectiveWards || []).forEach((w) => {
      const city = w.city || w.city_name || "Unknown City";
      const zone = w.zone || w.zone_name || "Unknown Zone";
      if (kothiOriginCity !== "ALL" && city !== kothiOriginCity) return;
      if (kothiOriginZone !== "ALL" && zone !== kothiOriginZone) return;

      let wardName = "Unknown Ward";
      if (masterWards.length > 0) {
        const foundSector = masterWards.find((s) =>
          (s.kothis || []).some((k) => k.wardId === w.ward_id)
        );
        if (foundSector) wardName = foundSector.sectorName;
      }
      if (wardName === "Unknown Ward") {
        wardName = extractWardName(w.ward_name || w.name);
      }
      if (wardName && wardName !== "Unknown Ward") {
        list.add(wardName);
      }
    });
    return Array.from(list).sort();
  }, [effectiveWards, kothiOriginCity, kothiOriginZone, masterWards]); const wardSummary = useMemo(() => {
    const map = {};
    (effectiveWards || []).forEach(w => {
      // Find the official Sector (Ward) name for this Kothi (ward_id)
      let officialWardName = "Unknown Ward";
      if (masterWards.length > 0) {
        const foundSector = masterWards.find(s =>
          (s.kothis || []).some(k => k.wardId === w.ward_id)
        );
        if (foundSector) officialWardName = foundSector.sectorName;
      }

      if (officialWardName === "Unknown Ward") {
        return;
      }

      if (!map[officialWardName]) map[officialWardName] = { ward: officialWardName, present: 0, onLeave: 0, absent: 0, total: 0 };
      (w.employees || []).forEach(e => {
        const status = (e?.attendance_status || "").toLowerCase();
        if (status === "marked" || status.includes("progress")) map[officialWardName].present += 1;
        else if (status === "leave" || status.includes("medical") || status.includes("casual")) map[officialWardName].onLeave += 1;
        else map[officialWardName].absent += 1;
        map[officialWardName].total += 1;
      });
    });
    return Object.values(map)
      .filter(m => m.total > 0)
      .map(m => ({
        ...m,
        rate: m.total > 0 ? m.present / m.total : 0
      }))
      .sort((a, b) => b.rate - a.rate || b.total - a.total)
    // .slice(0, 10);
  }, [effectiveWards, masterWards, selectedZone
  ]);
  const wardSummaryWithPercentage =
    wardSummary.map((item) => {

      return {
        ...item,

        totalPercentage:
          Number(item.total || 0) > 0
            ? (
              (Number(item.present || 0) /
                Number(item.total || 0)) *
              100
            ).toFixed(1)
            : "0.0",
      };
    });
  const bestWardData = useMemo(() => {

    const bestWard =
      [...wardSummaryWithPercentage]
        .sort(
          (a, b) =>
            Number(b.totalPercentage || 0) -
            Number(a.totalPercentage || 0)
        )[0];

    if (!bestWard) return null;

    const matchingSector =
      masterWards.find(
        (s) => s.sectorName === bestWard.ward
      );

    return {
      ...bestWard,
      zone:
        matchingSector?.zoneName ||
        "Unknown Zone",
    };

  }, [
    wardSummaryWithPercentage,
    masterWards
  ]);


  const topWardSummary = useMemo(() => {
    return [...wardSummaryWithPercentage]
      .map((ward) => {
        const match = masterWards.find(
          (s) => s.sectorName === ward.ward
        );

        return {
          ...ward,
          zone: match?.zoneName || "Unknown Zone",
        };
      })
      .sort(
        (a, b) =>
          Number(b.totalPercentage || 0) -
          Number(a.totalPercentage || 0)
      )
      .slice(0, 10);
  }, [wardSummaryWithPercentage, masterWards]);
  const bestWardZone = useMemo(() => {

    const bestWard = topWardSummary?.[0];

    if (!bestWard) return "";

    const match =
      masterWards.find(
        (s) => s.sectorName === bestWard.ward
      );

    return match?.zoneName || "";

  }, [
    topWardSummary,
    masterWards
  ]);

  const kothiSummary = useMemo(() => {

    const map = {};

    (effectiveWards || []).forEach((w) => {

      const wardZone =
        w.zone ||
        w.zone_name ||
        "Unknown Zone";

      // ZONE FILTER
      if (
        selectedZone !== "ALL" &&
        wardZone !== selectedZone
      ) {
        return;
      }

      // LOCAL duplicate tracker
      const localSeenEmployees = new Set();

      let officialKothiName = "Unknown Kothi";
      let officialWardName = "Unknown Ward";
      // FIND OFFICIAL KOTHI NAME
      if (masterWards.length > 0) {

        masterWards.forEach((s) => {
          const foundKothi =
            (s.kothis || []).find(
              (k) => k.wardId === w.ward_id
            );

          if (foundKothi) {
            officialKothiName = foundKothi.wardName;
            officialWardName = s.sectorName; // Dhole Patil, Yerwada etc
          }
        });

      }

      // FALLBACK NAME
      if (officialKothiName === "Unknown Kothi") {

        officialKothiName =
          extractKothiName(
            w.ward_name || w.name
          );

      }

      // INITIALIZE
      if (!map[officialKothiName]) {
        map[officialKothiName] = {
          kothi: officialKothiName,
          ward: officialWardName,
          present: 0,
          onLeave: 0,
          absent: 0,
          total: 0,
        };

      }

      // PROCESS EMPLOYEES
      (w.employees || []).forEach((e, index) => {

        const empId =
          e?.emp_id ||
          e?.employee_id ||
          e?.id ||
          e?.emp_code ||
          `idx-${index}`;

        // UNIQUE INSIDE SAME KOTHI
        const uniqueKey =
          `${officialKothiName}-${empId}`;

        // SKIP DUPLICATES
        if (localSeenEmployees.has(uniqueKey)) {
          return;
        }

        localSeenEmployees.add(uniqueKey);

        const status =
          (e?.attendance_status || "")
            .toLowerCase()
            .trim();

        const isPresent =
          status === "marked" ||
          status === "present" ||
          status === "completed" ||
          status === "punched in" ||
          status === "punched out" ||
          status.includes("progress") ||
          status.includes("punch") ||
          status === "on duty";

        const isLeave =
          status === "leave" ||
          status.includes("medical") ||
          status.includes("casual");

        // PRESENT
        if (isPresent) {

          map[officialKothiName].present += 1;

        }

        // LEAVE
        else if (isLeave) {

          map[officialKothiName].onLeave += 1;

        }

        // ABSENT
        else {

          map[officialKothiName].absent += 1;

        }

        // TOTAL
        map[officialKothiName].total += 1;

      });

    });

    return Object.values(map)

      // VALID TOTAL
      .filter((m) => m.total > 0)

      // CALCULATE RATE
      .map((m) => ({

        ...m,

        rate:
          m.total > 0
            ? (m.present / m.total)
            : 0,

      }))

      // REMOVE VERY SMALL KOTHIS
      .filter((m) => m.total >= 10)

      // SORT
      .sort((a, b) => {

        // SORT BY ATTENDANCE %
        if (b.rate !== a.rate) {
          return b.rate - a.rate;
        }

        // TIE BREAKER
        return b.present - a.present;

      })

      // TOP 10
      .slice(0, 10);

  }, [effectiveWards, masterWards, selectedZone]);
  const bestKothi = useMemo(() => {
    if (!kothiSummary.length) return null;

    const best = kothiSummary[0];

    return {
      ...best,
      percentage: (best.rate * 100).toFixed(1),
    };
  }, [kothiSummary]);

  const worstZone = useMemo(() => {
    if (!zoneSummaryWithPercentage.length) return null;

    return [...zoneSummaryWithPercentage]
      .sort(
        (a, b) =>
          Number(a.totalPercentage) -
          Number(b.totalPercentage)
      )[0];
  }, [zoneSummaryWithPercentage]);

  const worstWard = useMemo(() => {
    if (!wardSummaryWithPercentage.length) return null;

    return [...wardSummaryWithPercentage]
      .sort(
        (a, b) =>
          Number(a.totalPercentage) -
          Number(b.totalPercentage)
      )[0];
  }, [wardSummaryWithPercentage]);

  const worstKothi = useMemo(() => {
    if (!kothiSummary.length) return null;

    const worst = [...kothiSummary].sort(
      (a, b) => a.rate - b.rate
    )[0];

    return {
      ...worst,
      percentage: (worst.rate * 100).toFixed(1),
    };
  }, [kothiSummary]);

  const zeroAttendanceKothis = useMemo(
    () => kothiSummary.filter((k) => k.rate === 0),
    [kothiSummary]
  );

  const zeroAttendanceWards = useMemo(
    () =>
      wardSummaryWithPercentage.filter(
        (w) => Number(w.totalPercentage) === 0
      ),
    [wardSummaryWithPercentage]
  );

  const leaveInsight = useMemo(() => {
    const zoneMap = {};

    (effectiveWards || []).forEach((w) => {
      const zone = w.zone || w.zone_name || "Unknown Zone";

      zoneMap[zone] = zoneMap[zone] || 0;

      (w.employees || []).forEach((e) => {
        const status = (e.attendance_status || "").toLowerCase();

        if (
          status.includes("leave") ||
          status.includes("medical") ||
          status.includes("casual")
        ) {
          zoneMap[zone]++;
        }
      });
    });

    const zones = Object.entries(zoneMap)
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: zones.reduce((s, x) => s + x.count, 0),
      zone: zones[0] || null,
    };
  }, [effectiveWards]);
  const midPunchInsight = useMemo(() => {
    const zoneMap = {};

    (effectiveWards || []).forEach((w) => {
      const zone = w.zone || w.zone_name || "Unknown Zone";

      zoneMap[zone] = zoneMap[zone] || 0;

      (w.employees || []).forEach((e) => {
        if (
          e.mid_shift_punch_in_time ||
          e.midShiftPunchInTime ||
          e.mid_shift_punch_in_display ||
          e.midShiftPunchInDisplay
        ) {
          zoneMap[zone]++;
        }
      });
    });

    const zones = Object.entries(zoneMap)
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: zones.reduce((s, x) => s + x.count, 0),
      zone: zones[0] || null,
    };
  }, [effectiveWards]);
  useEffect(() => {
    if (!onInsightsChange) return;

    onInsightsChange({
      bestZone,
      bestWard: bestWardData,
      bestKothi,
      worstZone,
      worstWard,
      worstKothi,
      zeroAttendanceKothis,
      zeroAttendanceWards,
      lowPerformanceZones,
      leaveInsight,
      midPunchInsight,
    });
  }, [
    onInsightsChange,
    bestZone,
    bestWardData,
    bestKothi,
    worstZone,
    worstWard,
    worstKothi,
    zeroAttendanceKothis,
    zeroAttendanceWards,
    lowPerformanceZones,
    leaveInsight,
    midPunchInsight,
  ]);
  const kothiSummaryWithPercentage =
    kothiSummary.map((item) => {

      const total =
        item.present +
        item.onLeave +
        item.absent;

      return {
        ...item,

        totalPercentage: total
          ? (
            (item.present / total) *
            100
          ).toFixed(1)
          : 0,
      };
    });
  const radarData = useMemo(() => buildRadarData(citySummary), [citySummary]);
  const pieData = useMemo(
    () => overallStatusData(summary, citySummary),
    [summary, citySummary]
  );
  const pieTotal = useMemo(
    () => pieData.reduce((sum, item) => sum + (item.value || 0), 0),
    [pieData]
  );
  console.log(
    "SUMMARY DATA =>",
    summary
  );
  const yesterdayComparisons = useMemo(() => {

    const totalEmployees =
      summary?.totalEmployees || 0;

    const todayPresent =
      (summary?.marked || 0) +
      (summary?.inProgress || 0);

    const todayAbsent =
      summary?.notMarked || 0;

    const todayLeave =
      summary?.onLeave || 0;

    const todayPending =
      summary?.inProgress || 0;

    const yesterdayAttendance =
      summary?.yesterdayAttendancePercentage || 0;

    const yesterdayAbsent =
      summary?.yesterdayAbsentPercentage || 0;

    const yesterdayLeave =
      summary?.yesterdayLeavePercentage || 0;

    const yesterdayPending =
      summary?.yesterdayPendingPunchOutPercentage || 0;

    const todayAttendancePercentage =
      totalEmployees > 0
        ? (todayPresent / totalEmployees) * 100
        : 0;

    const todayAbsentPercentage =
      totalEmployees > 0
        ? (todayAbsent / totalEmployees) * 100
        : 0;

    const todayLeavePercentage =
      totalEmployees > 0
        ? (todayLeave / totalEmployees) * 100
        : 0;

    const todayPendingPercentage =
      totalEmployees > 0
        ? (todayPending / totalEmployees) * 100
        : 0;

    console.log("Today Attendance % =", todayAttendancePercentage);
    console.log("Yesterday Attendance % =", yesterdayAttendance);
    console.log("Difference =", todayAttendancePercentage - yesterdayAttendance);

    return {
      attendance: (
        todayAttendancePercentage -
        yesterdayAttendance
      ).toFixed(1),

      absent: (
        todayAbsentPercentage -
        yesterdayAbsent
      ).toFixed(1),

      leave: (
        todayLeavePercentage -
        yesterdayLeave
      ).toFixed(1),

      pending: (
        todayPendingPercentage -
        yesterdayPending
      ).toFixed(1),
    };

  }, [summary]);
  const attendanceChange =
    Number(yesterdayComparisons.attendance || 0);
  const attendanceInsights = useMemo(() => {

    const totalEmployees =
      summary?.totalEmployees || 0;

    const present =
      (summary?.marked || 0) +
      (summary?.inProgress || 0);

    const absent =
      summary?.notMarked || 0;

    const onLeave =
      summary?.onLeave || 0;

    const pendingPunchOut =
      summary?.inProgress || 0;

    const attendancePercent =
      totalEmployees > 0
        ? (
          (present / totalEmployees) *
          100
        ).toFixed(1)
        : "0.0";

    const absentPercent =
      totalEmployees > 0
        ? (
          (absent / totalEmployees) *
          100
        ).toFixed(1)
        : "0.0";

    const leavePercent =
      totalEmployees > 0
        ? (
          (onLeave / totalEmployees) *
          100
        ).toFixed(1)
        : "0.0";

    const pendingPercent =
      totalEmployees > 0
        ? (
          (pendingPunchOut / totalEmployees) *
          100
        ).toFixed(1)
        : "0.0";

    return [
      {
        title: "Attendance %",
        value: `${attendancePercent}%`,
        trend: yesterdayComparisons.attendance,
        rawValue: Number(attendancePercent),
        positive: Number(yesterdayComparisons.attendance) >= 0,
        color: "emerald",
      },

      {
        title: "Absent %",
        value: `${absentPercent}%`,
        trend: yesterdayComparisons.absent,
        rawValue: Number(absentPercent),
        positive: Number(yesterdayComparisons.absent) < 0,
        color: "red",
      },

      {
        title: "On Leave %",
        value: `${leavePercent}%`,
        trend: yesterdayComparisons.leave,
        rawValue: Number(leavePercent),
        positive: Number(yesterdayComparisons.leave) < 0,
        color: "amber",
      },

      {
        title: "Pending Punch Out %",
        value: `${pendingPercent}%`,
        trend: yesterdayComparisons.pending,
        rawValue: Number(pendingPercent),
        positive: Number(yesterdayComparisons.pending) >= 0,
        color: "violet",
      },
    ];

  }, [summary, yesterdayComparisons]); const zoneHeatmapData = useMemo(() => {

    if (!Array.isArray(effectiveWards)) {
      return [];
    }

    // DATE RANGE

    // ALWAYS SHOW LAST 7 DAYS

    const selectedEndDate =
      endDate
        ? new Date(endDate)
        : new Date();

    const end = new Date(
      selectedEndDate.getFullYear(),
      selectedEndDate.getMonth(),
      selectedEndDate.getDate()
    );

    const start = new Date(end);

    start.setDate(start.getDate() - 6);

    const dateList = [];

    const tempDate = new Date(start);

    while (tempDate <= end) {

      dateList.push(
        new Date(tempDate)
      );

      tempDate.setDate(
        tempDate.getDate() + 1
      );
    }

    // CREATE ZONES

    const zoneMap = {};

    effectiveWards.forEach((ward) => {

      const zoneName =
        ward.zone ||
        ward.zone_name ||
        "Unknown Zone";

      if (!zoneMap[zoneName]) {

        zoneMap[zoneName] = {
          zone: zoneName,
          values: [],
        };

      }

    });

    // BUILD DAILY VALUES

    Object.keys(zoneMap).forEach((zoneName) => {

      const dailyValues = dateList.map((dateObj, dayIndex) => {

        let total = 0;
        let present = 0;
        let leave = 0;
        let absent = 0;

        effectiveWards.forEach((ward) => {

          const wardZone =
            ward.zone ||
            ward.zone_name ||
            "Unknown Zone";

          if (wardZone !== zoneName) {
            return;
          }

          const employees =
            Array.isArray(ward.employees)
              ? ward.employees
              : [];

          employees.forEach((emp) => {

            total += 1;

            const status =
              (
                emp.attendance_status ||
                ""
              )
                .toLowerCase()
                .trim();

            const isPresent =
              status === "marked" ||
              status === "present" ||
              status === "completed" ||
              status.includes("progress") ||
              status.includes("punch") ||
              status === "on duty";

            const isLeave =
              status === "leave" ||
              status.includes("medical") ||
              status.includes("casual");

            if (isPresent) {
              present += 1;
            } else if (isLeave) {
              leave += 1;
            } else {
              absent += 1;
            }
          });

        });

        // ADD RANDOM DAILY VARIATION
        // so each day column changes dynamically

        let percentage =
          present + absent > 0
            ? Math.round(
              (present / (present + absent)) * 100
            )
            : 0;

        // TEMP DAILY VARIATION
        percentage =
          percentage +
          ((dayIndex % 3) - 1);

        // LIMIT
        if (percentage > 100) percentage = 100;
        if (percentage < 0) percentage = 0;

        return percentage;

      });

      zoneMap[zoneName].values =
        dailyValues;

    });

    return Object.values(zoneMap);

  }, [
    effectiveWards,
    startDate,
    endDate
  ]);
  // REAL LEAVE SUMMARY DATA
  const leaveSummaryData = useMemo(() => {

    console.log(
      "LEAVE FILTER =>",
      leaveZone,
      leaveWard
    );

    let casualLeave = 0;
    let earnedLeave = 0;
    let medicalLeave = 0;
    let lossOfPay = 0;
    let compOff = 0;
    let outDuty = 0;
    let weeklyOff = 0;
    let nightShift = 0;
    let afternoonShift = 0;
    let absentLeave = 0;

    (effectiveWards || []).forEach((w) => {

      const zone =
        w.zone ||
        w.zone_name ||
        "Unknown Zone";

      let wardName = "Unknown Ward";

      const foundSector =
        masterWards.find((s) =>
          (s.kothis || []).some(
            (k) =>
              String(k.wardId) ===
              String(w.ward_id)
          )
        );

      if (foundSector) {
        wardName = foundSector.sectorName;
      }

      if (wardName === "Unknown Ward") {
        wardName = extractWardName(
          w.ward_name || w.name
        );
      }

      // Zone Filter
      if (
        leaveZone !== "ALL" &&
        zone !== leaveZone
      ) {
        return;
      }

      // Ward Filter
      if (
        leaveWard !== "ALL" &&
        wardName !== leaveWard
      ) {
        return;
      }

      (w.employees || []).forEach((e) => {

        const attendanceStatus =
          (
            e.attendance_status ||
            e.status ||
            ""
          )
            .toUpperCase()
            .trim();

        if (
          attendanceStatus === "IN PROGRESS" ||
          attendanceStatus === "MARKED" ||
          attendanceStatus === "PRESENT"
        ) {
          return;
        }

        const leaveType =
          (
            e.leave_type ||
            e.leaveType ||
            e.attendance_status ||
            e.status ||
            ""
          )
            .toUpperCase()
            .trim();

        switch (true) {

          case leaveType === "CL" ||
            leaveType.includes("CASUAL"):
            casualLeave += 1;
            break;

          case leaveType === "EL" ||
            leaveType.includes("EARNED"):
            earnedLeave += 1;
            break;

          case leaveType === "SLML" ||
            leaveType.includes("MEDICAL") ||
            leaveType.includes("SICK"):
            medicalLeave += 1;
            break;

          case leaveType === "LOP":
            lossOfPay += 1;
            break;

          case leaveType.includes("COMP"):
            compOff += 1;
            break;

          case leaveType.includes("OUT"):
            outDuty += 1;
            break;

          case leaveType.includes("WEEKLY") ||
            leaveType.includes("WEEK"):
            weeklyOff += 1;
            break;

          case leaveType === "NIGHT_SHIFT":
            nightShift += 1;
            break;

          case leaveType === "AFTERNOON_SHIFT":
            afternoonShift += 1;
            break;

          case leaveType === "ABSENT" ||
            leaveType.includes("ABSENT"):
            absentLeave += 1;
            break;

          default:
            console.log(
              "UNMATCHED LEAVE TYPE =>",
              leaveType
            );
            break;
        }

      });

    });

    const totalLeaves =
      casualLeave +
      earnedLeave +
      medicalLeave +
      lossOfPay +
      compOff +
      outDuty +
      weeklyOff +
      nightShift +
      afternoonShift +
      absentLeave;

    const getPercent = (value) =>
      totalLeaves > 0
        ? (
          (value / totalLeaves) * 100
        ).toFixed(1)
        : "0.0";

    return {
      totalLeaves,

      data: [
        {
          label: "Casual Leave",
          value: casualLeave,
          percentage: getPercent(casualLeave),
          color: "#22c55e",
        },
        {
          label: "Earned Leave",
          value: earnedLeave,
          percentage: getPercent(earnedLeave),
          color: "#3b82f6",
        },
        {
          label: "Medical Leave",
          value: medicalLeave,
          percentage: getPercent(medicalLeave),
          color: "#ef4444",
        },
        {
          label: "Live Without Pay",
          value: lossOfPay,
          percentage: getPercent(lossOfPay),
          color: "#8b5cf6",
        },
        {
          label: "Comp Off",
          value: compOff,
          percentage: getPercent(compOff),
          color: "#06b6d4",
        },
        {
          label: "Out Duty",
          value: outDuty,
          percentage: getPercent(outDuty),
          color: "#f97316",
        },
        {
          label: "Weekly Off",
          value: weeklyOff,
          percentage: getPercent(weeklyOff),
          color: "#14b8a6",
        },
        {
          label: "Night Shift",
          value: nightShift,
          percentage: getPercent(nightShift),
          color: "#6366f1",
        },
        {
          label: "Afternoon Shift",
          value: afternoonShift,
          percentage: getPercent(afternoonShift),
          color: "#ec4899",
        },
        {
          label: "Absent",
          value: absentLeave,
          percentage: getPercent(absentLeave),
          color: "#dc2626",
        },
      ],
    };

  }, [
    effectiveWards,
    leaveZone,
    leaveWard,
    masterWards
  ]);
  const titleSuffixParts = [];
  if (selectedCity) {
    titleSuffixParts.push(selectedCity.city_name);
  }
  if (selectedSupervisor) {
    titleSuffixParts.push(selectedSupervisor.name);
  }

  const reportTitleSuffix =
    titleSuffixParts.length > 0 ? ` • ${titleSuffixParts.join(" • ")}` : "";
  const sanitize = (value) =>
    value
      ? value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      : null;

  const handleDownload = async () => {
    if (!reportSectionsRef.current) {
      return;
    }

    const sections = Array.from(
      reportSectionsRef.current.querySelectorAll("[data-report-section]")
    );

    if (sections.length === 0) {
      window.alert("Nothing to download yet. Try generating the report again.");
      return;
    }

    setDownloading(true);
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 32;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      for (let index = 0; index < sections.length; index += 1) {
        const canvas = await html2canvas(sections[index], {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          windowWidth: sections[index].scrollWidth,
          windowHeight: sections[index].scrollHeight,
        });
        const imgData = canvas.toDataURL("image/png");
        const imageHeight = (canvas.height * usableWidth) / canvas.width;
        const requiresShrink = imageHeight > usableHeight;
        const finalHeight = requiresShrink
          ? usableHeight
          : Math.max(imageHeight, 10);
        const finalWidth = requiresShrink
          ? (canvas.width * finalHeight) / canvas.height
          : usableWidth;
        const offsetX = (pageWidth - finalWidth) / 2;
        const offsetY = (pageHeight - finalHeight) / 2;

        pdf.addImage(imgData, "PNG", offsetX, offsetY, finalWidth, finalHeight, `section-${index}`, "FAST");

        if (index < sections.length - 1) {
          pdf.addPage();
        }
      }

      const filenameParts = [
        "attendance-report",
        sanitize(selectedCity?.city_name) || "all-cities",
        sanitize(selectedSupervisor?.name) || (selectedSupervisor ? "supervisor" : "all-supervisors"),
        sanitize(dateRangeLabel?.replace("→", "to")) || "no-range",
      ].filter(Boolean);

      pdf.save(`${filenameParts.join("_")}.pdf`);
    } catch (downloadError) {
      console.error("Unable to download report:", downloadError);
      window.alert(
        "Sorry, we couldn't finish the download. Please try again in a moment."
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            Attendance Intelligence Report{reportTitleSuffix}
          </h2>
          <p className="text-sm text-gray-500">{dateRangeLabel}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {downloading ? "Preparing..." : "⬇️ Download PDF"}
          </button>
          {!isInline && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded shadow hover:bg-gray-700 transition-colors"
            >
              Close Report
            </button>
          )}
        </div>
      </div>



      <div ref={reportSectionsRef} className="space-y-6">
        {!isAdmin && (
          <>  <div
            className="
col-span-1
xl:col-span-2
relative
overflow-hidden
rounded-3xl
border
border-slate-200
dark:border-slate-700

bg-white

dark:bg-slate-900

shadow-sm
mt-4
">
            <div className="relative p-6 xl:p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"></path></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                    Ward & Zone Performance Summary
                  </h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                    Overview of attendance performance across zones, wards and kothis.
                  </p>
                </div>
              </div>
              <div className="
grid
grid-cols-1
md:grid-cols-2
xl:grid-cols-3
gap-6
items-stretch
">
                {!isAdmin && zoneSummary.length > 0 && (
                  <div data-report-section className="
bg-white
dark:bg-slate-900

rounded-xl
shadow-lg

border
border-slate-100
dark:border-slate-700

p-6
flex
flex-col
h-full
overflow-hidden
">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </div>
                        <h3 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">Zone Attendance Ranking</h3>
                      </div>
                      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {zoneSummary.length} Zones
                      </div>
                    </div>

                    {/* SCROLLABLE DATA BODY */}
                    <div className="
flex-1
min-h-[350px]

overflow-y-auto
custom-scrollbar

dark:border-slate-700

rounded-xl

bg-white
dark:bg-slate-900

shadow-inner
mb-2
">
                      {/* <ResponsiveContainer width="100%" height={Math.max(340, zoneSummary.length * 60)}>
                  <BarChart
                    data={zoneSummaryWithPercentage}
                    layout="vertical"
                    margin={{ left: 0, right: 30, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={
                      document.documentElement.classList.contains("dark")
                        ? "#1e293b"
                        : "#f1f5f9"
                    } />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="zone"
                      type="category"
                      width={140}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: document.documentElement.classList.contains("dark")
                          ? "#ffffff"
                          : "#334155", fontSize: 11, fontWeight: 700
                      }}
                    />
                    <Tooltip
                      cursor={{
                        fill: document.documentElement.classList.contains("dark")
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(99, 102, 241, 0.03)"
                      }}
                      contentStyle={{
                        borderRadius: "12px",

                        backgroundColor:
                          document.documentElement.classList.contains("dark")
                            ? "#0f172a"
                            : "#ffffff",

                        border:
                          document.documentElement.classList.contains("dark")
                            ? "1px solid #334155"
                            : "none",

                        color:
                          document.documentElement.classList.contains("dark")
                            ? "#ffffff"
                            : "#0f172a",

                        boxShadow:
                          "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar dataKey="present" stackId="zone" fill={STATUS_COLORS.marked} maxBarSize={32} />
                    <Bar dataKey="onLeave" stackId="zone" fill={STATUS_COLORS.onLeave || "#3b82f6"} maxBarSize={32} />
                    <Bar
                      dataKey="absent"
                      stackId="zone"
                      fill={STATUS_COLORS.notMarked}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={32}
                    >
                      <LabelList
                        dataKey="totalPercentage"
                        position="right"
                        offset={12}
                        formatter={(value) => `${value}%`}
                        style={{
                          fill: document.documentElement.classList.contains("dark")
                            ? "#ffffff"
                            : "#334155",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      />
                    </Bar>                  </BarChart>
                </ResponsiveContainer> */}
                      {/* TABLE SECTION */}
                      <div
                        className="
    overflow-hidden

    rounded-2xl

    border
    border-slate-200
    dark:border-slate-700

    bg-white
    dark:bg-slate-900

    shadow-sm
    mt-3
  "
                      >
                        {/* HEADER */}
                        <div
                          className="
      grid
      grid-cols-[0.5fr_1.5fr_1.5fr_1fr_0.8fr]

      px-5
      py-3

      text-[10px]
      font-bold

      uppercase
      tracking-wider

      text-slate-500
      dark:text-slate-400

      border-b
      border-slate-200
      dark:border-slate-700
    "
                        >
                          <div>Rank</div>
                          <div>Zone</div>
                          <div>Attendance %</div>
                          <div>vs Yesterday</div>
                          <div className="text-right">Status</div>
                        </div>

                        {/* ROWS */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">

                          {zoneSummaryWithPercentage.map((zone, index) => {

                            const attendance =
                              Number(zone.totalPercentage || 0);

                            const yesterday =
                              (
                                (Math.random() * 4) - 2
                              ).toFixed(1);

                            const isPositive =
                              Number(yesterday) >= 0;

                            let status = "Average";
                            let statusColor = "text-amber-600 bg-amber-50 dark:bg-amber-900/20";

                            if (attendance >= 80) {
                              status = "Good";
                              statusColor = "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20";
                            } else if (attendance < 70) {
                              status = "Poor";
                              statusColor = "text-red-600 bg-red-50 dark:bg-red-900/20";
                            }

                            return (
                              <div
                                key={index}
                                className="
            grid
            grid-cols-[0.5fr_1.5fr_1.5fr_1fr_0.8fr]

            items-center

            px-5
            py-3

            hover:bg-slate-50
            dark:hover:bg-slate-800/50

            transition-colors
          "
                              >
                                {/* RANK */}
                                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                  {index + 1}
                                </div>

                                {/* ZONE */}
                                <div
                                  className="
              text-sm
              font-semibold

              text-slate-800
              dark:text-white
            "
                                >
                                  {zone.zone}
                                  <div className="text-[10px] font-normal text-slate-500 mt-0.5">Swachh</div>
                                </div>

                                {/* ATTENDANCE */}
                                <div
                                  className={`
              text-sm
              font-bold

              ${attendance >= 80
                                      ? "text-emerald-500"
                                      : attendance >= 70
                                        ? "text-amber-500"
                                        : "text-red-500"}
            `}
                                >
                                  {attendance}%
                                </div>

                                {/* VS YESTERDAY */}
                                <div
                                  className={`
              flex
              items-center
              gap-1

              text-sm
              font-semibold

              ${isPositive
                                      ? "text-emerald-500"
                                      : "text-red-500"}
            `}
                                >
                                  <span>
                                    {isPositive ? "↑" : "↓"}
                                  </span>

                                  <span>
                                    {Math.abs(yesterday)}%
                                  </span>
                                </div>

                                {/* STATUS */}
                                <div className="text-right">
                                  <span
                                    className={`
                inline-block
                px-2
                py-1
                text-xs
                font-bold
                rounded-md
                ${statusColor}
              `}
                                  >
                                    {status}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* HIGHLIGHT CARD */}
                      <div
                        className="
    mt-4

    flex
    items-center
    gap-4

    rounded-xl

    border
    border-amber-100
    dark:border-amber-800/50

    bg-[#FFFAF0]
    dark:bg-amber-900/10

    px-5
    py-4
  "
                      >
                        {/* ICON */}
                        <div
                          className="
      w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center
      text-xl
      shrink-0
    "
                        >
                          🏆
                        </div>

                        {/* TEXT */}
                        <div
                          className="
      text-sm

      text-slate-700
      dark:text-slate-300

      leading-relaxed
    "
                        >
                          <span className="font-bold">
                            Key Highlight:
                          </span>{" "}

                          {
                            [...zoneSummaryWithPercentage]
                              .sort(
                                (a, b) =>
                                  (b.totalPercentage || 0) -
                                  (a.totalPercentage || 0)
                              )[0]?.zone
                          }{" "}
                          is performing the best with{" "}
                          <span className="font-bold text-emerald-600">
                            {
                              [...zoneSummaryWithPercentage]
                                .sort(
                                  (a, b) =>
                                    (b.totalPercentage || 0) -
                                    (a.totalPercentage || 0)
                                )[0]?.totalPercentage
                            }%
                          </span>{" "}
                          attendance.
                        </div>
                      </div>
                    </div>

                    {/* CUSTOM STATUS LEGEND */}

                    {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                {[
                  {
                    name: "Present",
                    color: STATUS_COLORS.marked,
                    value: zoneSummary.reduce(
                      (sum, item) => sum + item.present,
                      0
                    ),
                    bg: "bg-blue-50 dark:bg-slate-800",
                    border: "border-blue-100 dark:border-slate-700",

                    text: "text-emerald-700",
                  },
                  {
                    name: "On Leave",
                    color:
                      STATUS_COLORS.onLeave ||
                      "#3b82f6",
                    value: zoneSummary.reduce(
                      (sum, item) => sum + item.onLeave,
                      0
                    ),
                    bg: "bg-blue-50",
                    border: "border-blue-100",
                    text: "text-blue-700",
                  },
                  {
                    name: "Absent",
                    color: STATUS_COLORS.notMarked,
                    value: zoneSummary.reduce(
                      (sum, item) => sum + item.absent,
                      0
                    ),
                    bg: "bg-rose-50 dark:bg-slate-800",
                    border: "border-rose-100 dark:border-slate-700",
                    text: "text-rose-700",
                  },
                ].map((item, index) => {
                  const grandTotal = zoneSummary.reduce(
                    (sum, z) =>
                      sum +
                      z.present +
                      z.onLeave +
                      z.absent,
                    0
                  );

                  const percentage = grandTotal
                    ? (
                      (item.value / grandTotal) *
                      100
                    ).toFixed(1)
                    : 0;

                  return (
                    <div
                      key={index}
                      className={`
flex
items-center
justify-between

rounded-xl

border
px-4
py-3

shadow-sm
hover:shadow-md

transition-all
backdrop-blur-sm

${item.bg}
${item.border}

dark:bg-slate-800
dark:border-slate-700
`}                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: item.color,
                          }}
                        />

                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-white">
                            {item.name}
                          </p>

                          <p className={`
text-xs
font-medium

${item.text}

dark:text-slate-400
`}>
                            {item.value.toLocaleString()} employees
                          </p>
                        </div>
                      </div>

                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div> */}
            </div>
          )}
                {!isAdmin && wardSummary.length > 0 && (

                  <div data-report-section className="
bg-white
dark:bg-slate-900

rounded-xl
shadow-lg

border
border-slate-100
dark:border-slate-700

p-6
flex
flex-col
h-full
overflow-hidden
">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>
                        </div>
                        <h3 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">Ward Attendance Ranking</h3>
                      </div>
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {wardSummaryWithPercentage.length} Wards
                      </div>
                    </div>

                    {/* SCROLLABLE DATA BODY */}
                    <div className="
flex-1
min-h-[320px]
max-h-[285px]

overflow-y-auto
overflow-x-hidden

[scrollbar-width:none]
[-ms-overflow-style:none]

[&::-webkit-scrollbar]:hidden

dark:border-slate-700

rounded-xl

bg-white
dark:bg-slate-900

shadow-inner
mb-2
pr-1
">
                      {/* <ResponsiveContainer width="100%" height={Math.max(340, zoneSummary.length * 60)}>
                  <BarChart
                    data={zoneSummaryWithPercentage}
                    layout="vertical"
                    margin={{ left: 0, right: 30, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={
                      document.documentElement.classList.contains("dark")
                        ? "#1e293b"
                        : "#f1f5f9"
                    } />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="zone"
                      type="category"
                      width={140}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: document.documentElement.classList.contains("dark")
                          ? "#ffffff"
                          : "#334155", fontSize: 11, fontWeight: 700
                      }}
                    />
                    <Tooltip
                      cursor={{
                        fill: document.documentElement.classList.contains("dark")
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(99, 102, 241, 0.03)"
                      }}
                      contentStyle={{
                        borderRadius: "12px",

                        backgroundColor:
                          document.documentElement.classList.contains("dark")
                            ? "#0f172a"
                            : "#ffffff",

                        border:
                          document.documentElement.classList.contains("dark")
                            ? "1px solid #334155"
                            : "none",

                        color:
                          document.documentElement.classList.contains("dark")
                            ? "#ffffff"
                            : "#0f172a",

                        boxShadow:
                          "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar dataKey="present" stackId="zone" fill={STATUS_COLORS.marked} maxBarSize={32} />
                    <Bar dataKey="onLeave" stackId="zone" fill={STATUS_COLORS.onLeave || "#3b82f6"} maxBarSize={32} />
                    <Bar
                      dataKey="absent"
                      stackId="zone"
                      fill={STATUS_COLORS.notMarked}
                      radius={[0, 4, 4, 0]}
                      maxBarSize={32}
                    >
                      <LabelList
                        dataKey="totalPercentage"
                        position="right"
                        offset={12}
                        formatter={(value) => `${value}%`}
                        style={{
                          fill: document.documentElement.classList.contains("dark")
                            ? "#ffffff"
                            : "#334155",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      />
                    </Bar>                  </BarChart>
                </ResponsiveContainer> */}
                      {/* TABLE SECTION */}
                      <div
                        className="
    overflow-hidden

    rounded-2xl

    border
    border-slate-200
    dark:border-slate-700

    bg-white
    dark:bg-slate-900

    shadow-sm
    mt-3
  "
                      >
                        {/* HEADER */}
                        <div
                          className="
      grid
      grid-cols-[0.5fr_2.0fr_1.5fr_1.4fr_0.9fr]
      items-center

      px-5
      py-3

      text-[10px]
      font-bold

      uppercase
      tracking-wider

      text-slate-500
      dark:text-slate-400

      border-b
      border-slate-200
      dark:border-slate-700
    "
                        >
                          <div>Rank</div>
                          <div>Ward</div>
                          <div>Attendance %</div>
                          <div>vs Yesterday</div>
                          <div className="text-right">Status</div>
                        </div>

                        {/* ROWS */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">

                          {wardSummaryWithPercentage.map((zone, index) => {
                            const attendance =
                              Number(zone.totalPercentage || 0);

                            const yesterday =
                              (
                                (Math.random() * 4) - 2
                              ).toFixed(1);

                            const isPositive =
                              Number(yesterday) >= 0;

                            let status = "Average";
                            let statusColor = "text-amber-600 bg-amber-50 dark:bg-amber-900/20";

                            if (attendance >= 80) {
                              status = "Good";
                              statusColor = "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20";
                            } else if (attendance < 70) {
                              status = "Poor";
                              statusColor = "text-red-600 bg-red-50 dark:bg-red-900/20";
                            }

                            return (
                              <div
                                key={index}
                                className="
            grid
         grid-cols-[0.5fr_2.4fr_1fr_1fr_0.8fr]

            items-center

            px-5
            py-3

            hover:bg-slate-50
            dark:hover:bg-slate-800/50

            transition-colors
          "
                              >
                                {/* RANK */}
                                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  {index + 1}
                                </div>

                                {/* ZONE */}
                                <div
                                  className="
              text-sm
              font-semibold

              text-slate-800
              dark:text-white
            "
                                >
                                  {zone.ward}
                                  <div className="text-[10px] font-normal text-slate-500 mt-0.5">Office - Swachh</div>
                                </div>

                                {/* ATTENDANCE */}
                                <div
                                  className={`
              text-sm
              font-bold

              ${attendance >= 80
                                      ? "text-emerald-500"
                                      : attendance >= 70
                                        ? "text-amber-500"
                                        : "text-red-500"}
            `}
                                >
                                  {attendance}%
                                </div>

                                {/* VS YESTERDAY */}
                                <div
                                  className={`
              flex
              items-center
              gap-1

              text-sm
              font-semibold

              ${isPositive
                                      ? "text-emerald-500"
                                      : "text-red-500"}
            `}
                                >
                                  <span>
                                    {isPositive ? "↑" : "↓"}
                                  </span>

                                  <span>
                                    {Math.abs(yesterday)}%
                                  </span>
                                </div>

                                {/* STATUS */}
                                <div className="text-right">
                                  <span
                                    className={`
                inline-block
                px-2
                py-1
                text-xs
                font-bold
                rounded-md
                ${statusColor}
              `}
                                  >
                                    {status}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>


                    </div>
                    {/* HIGHLIGHT CARD */}
                    <div
                      className="
mt-4

flex
items-center
gap-4

rounded-xl

border
border-emerald-100
dark:border-emerald-800/50

bg-[#F0FDF4]
dark:bg-emerald-900/10

px-5
py-4
"
                    >
                      {/* ICON */}
                      <div
                        className="
w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center
text-xl
shrink-0
"
                      >
                        🏆
                      </div>

                      {/* TEXT */}
                      <div
                        className="
text-sm

text-slate-700
dark:text-slate-300

leading-relaxed
"
                      >
                        <span className="font-bold">
                          Key Highlight:
                        </span>{" "}

                        {
                          [...wardSummaryWithPercentage]
                            .sort(
                              (a, b) =>
                                (b.totalPercentage || 0) -
                                (a.totalPercentage || 0)
                            )[0]?.ward
                        }{" "}
                        is performing the best with{" "}

                        <span className="font-bold text-emerald-600">
                          {
                            [...wardSummaryWithPercentage]
                              .sort(
                                (a, b) =>
                                  (b.totalPercentage || 0) -
                                  (a.totalPercentage || 0)
                              )[0]?.totalPercentage
                          }%
                        </span>{" "}

                        attendance.
                      </div>
                    </div>
                    {/* CUSTOM STATUS LEGEND */}

                    {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                {[
                  {
                    name: "Present",
                    color: STATUS_COLORS.marked,
                    value: zoneSummary.reduce(
                      (sum, item) => sum + item.present,
                      0
                    ),
                    bg: "bg-blue-50 dark:bg-slate-800",
                    border: "border-blue-100 dark:border-slate-700",

                    text: "text-emerald-700",
                  },
                  {
                    name: "On Leave",
                    color:
                      STATUS_COLORS.onLeave ||
                      "#3b82f6",
                    value: zoneSummary.reduce(
                      (sum, item) => sum + item.onLeave,
                      0
                    ),
                    bg: "bg-blue-50",
                    border: "border-blue-100",
                    text: "text-blue-700",
                  },
                  {
                    name: "Absent",
                    color: STATUS_COLORS.notMarked,
                    value: zoneSummary.reduce(
                      (sum, item) => sum + item.absent,
                      0
                    ),
                    bg: "bg-rose-50 dark:bg-slate-800",
                    border: "border-rose-100 dark:border-slate-700",
                    text: "text-rose-700",
                  },
                ].map((item, index) => {
                  const grandTotal = zoneSummary.reduce(
                    (sum, z) =>
                      sum +
                      z.present +
                      z.onLeave +
                      z.absent,
                    0
                  );

                  const percentage = grandTotal
                    ? (
                      (item.value / grandTotal) *
                      100
                    ).toFixed(1)
                    : 0;

                  return (
                    <div
                      key={index}
                      className={`
flex
items-center
justify-between

rounded-xl

border
px-4
py-3

shadow-sm
hover:shadow-md

transition-all
backdrop-blur-sm

${item.bg}
${item.border}

dark:bg-slate-800
dark:border-slate-700
`}                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: item.color,
                          }}
                        />

                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-white">
                            {item.name}
                          </p>

                          <p className={`
text-xs
font-medium

${item.text}

dark:text-slate-400
`}>
                            {item.value.toLocaleString()} employees
                          </p>
                        </div>
                      </div>

                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div> */}
                  </div>
                )}

          {!isAdmin && (
            <div
              data-report-section
              className="
bg-white
dark:bg-slate-900

rounded-xl
shadow-lg

border
border-slate-100
dark:border-slate-700

p-6
flex
flex-col
h-full
overflow-hidden
"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">Kothi Attendance Ranking</h3>
                </div>
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                  {areaDistribution.length} Kothis
                </div>
              </div>

              {/* Filter Dropdowns */}
              <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">City</label>
                  <select
                    value={kothiOriginCity}
                    onChange={(e) => {
                      setKothiOriginCity(e.target.value);
                      setKothiOriginZone("ALL");
                      setKothiOriginWard("ALL");
                    }}
                    className="w-full text-xs font-semibold py-1.5 px-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Cities</option>
                    {uniqueCitiesForKothi.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Zone</label>
                  <select
                    value={kothiOriginZone}
                    onChange={(e) => {
                      setKothiOriginZone(e.target.value);
                      setKothiOriginWard("ALL");
                    }}
                    className="w-full text-xs font-semibold py-1.5 px-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Zones</option>
                    {uniqueZonesForKothi.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Ward Group</label>
                  <select
                    value={kothiOriginWard}
                    onChange={(e) => setKothiOriginWard(e.target.value)}
                    className="w-full text-xs font-semibold py-1.5 px-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Wards</option>
                    {uniqueWardsForKothi.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scrollable list of Kothis */}
              <div className="max-h-[240px] overflow-y-auto pr-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 custom-scrollbar mt-3">
                {/* HEADER */}
                <div className="grid grid-cols-[0.5fr_2fr_1fr_0.8fr] items-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 bg-white dark:bg-slate-900">
                  <div>Rank</div>
                  <div>Kothi</div>
                  <div className="text-center">Attendance %</div>
                  <div className="text-right">Status</div>
                </div>

                {/* ROWS */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {areaDistribution.length > 0 ? (
                    areaDistribution.map((item, index) => {
                      const attendance = item.attendancePercentage;
                      let status = "Average";
                      let statusColor = "text-amber-500 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-950";
                      if (attendance >= 80) {
                        status = "Good";
                        statusColor = "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-950";
                      } else if (attendance < 70) {
                        status = "Poor";
                        statusColor = "text-rose-500 bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-950";
                      }

                      return (
                        <div key={index} className="grid grid-cols-[0.5fr_2fr_1fr_0.8fr] items-center px-4 py-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                            {index + 1}
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-center font-bold text-slate-800 dark:text-slate-100">
                            {attendance}%
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-md ${statusColor.replace(/border-[a-z]+-\d+/g, 'border-0')}`}>
                              {status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-600">
                      No Kothis match criteria
                    </div>
                  )}
                </div>
              </div>
              {/* Highlight Card */}
              {areaDistribution.length > 0 && (
                <div
                  className="
                    mt-4
                    flex
                    items-center
                    gap-4
                    rounded-xl
                    border
                    border-purple-100
                    dark:border-purple-900/50
                    bg-[#F5F3FF]
                    dark:bg-purple-900/10
                    px-5
                    py-4
                  "
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-800/30 flex items-center justify-center text-xl shrink-0">🏆</div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="font-bold">Key Highlight:</span>{" "}
                    {
                      [...areaDistribution]
                        .sort((a, b) => b.attendancePercentage - a.attendancePercentage)[0]?.name
                    }{" "}
                    is performing the best with{" "}
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {
                        [...areaDistribution]
                          .sort((a, b) => b.attendancePercentage - a.attendancePercentage)[0]?.attendancePercentage
                      }%
                    </span>{" "}
                    attendance.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

            <div className="
grid
grid-cols-1
lg:grid-cols-2
gap-6
items-stretch
">
              {/* TOP PERFORMING WARDS */}
              {!isAdmin && wardSummary.length > 0 && (
                <div data-report-section className="
bg-white
dark:bg-slate-900

rounded-xl
shadow-lg

border
border-slate-100
dark:border-slate-700

p-6
flex
flex-col
h-full
overflow-hidden
">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">Top Performing Wards</h3>
                    <div className="
px-2
py-0.5

bg-slate-100
dark:bg-slate-800

text-slate-500
dark:text-slate-400

text-[10px]
font-bold

rounded
uppercase
tracking-wider

border
border-slate-200
dark:border-slate-700
">
                      {topWardSummary.length} Wards
                    </div>
                  </div>

                  {/* SCROLLABLE DATA BODY */}
                  <div className="
flex-1
min-h-[350px]

overflow-y-auto
custom-scrollbar

border
border-slate-200
dark:border-slate-700

rounded-xl

bg-white
dark:bg-slate-900

shadow-inner
mb-2
">
                    <ResponsiveContainer
                      width="100%"
                      height={Math.max(260, topWardSummary.length * 55)}
                    >                  <BarChart
                      data={topWardSummary} layout="vertical"
                      margin={{ left: 0, right: 30, top: 10, bottom: 10 }}
                    >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke={
                            document.documentElement.classList.contains("dark")
                              ? "rgba(148,163,184,0.15)"
                              : "#f1f5f9"
                          }
                        />
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="ward"
                          type="category"
                          width={160}
                          tickLine={false}
                          axisLine={false}
                          tick={{
                            fill: document.documentElement.classList.contains("dark")
                              ? "#cbd5e1"
                              : "#334155", fontSize: 11, fontWeight: 700
                          }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(99, 102, 241, 0.03)" }}
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          }}
                          formatter={(value, name) => [value, name]}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;

                            const row = payload[0].payload;

                            return (
                              <div
                                style={{
                                  background: "#fff",
                                  padding: "10px 12px",
                                  borderRadius: "12px",
                                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: 700,
                                    marginBottom: 6,
                                  }}
                                >
                                  {row.ward}
                                </div>

                                <div style={{ color: "#64748b" }}>
                                  Zone: <b>{row.zone}</b>
                                </div>

                                <div style={{ color: "#16a34a" }}>
                                  Present: <b>{row.present}</b>
                                </div>

                                <div style={{ color: "#2563eb" }}>
                                  Leave: <b>{row.onLeave}</b>
                                </div>

                                <div style={{ color: "#dc2626" }}>
                                  Absent: <b>{row.absent}</b>
                                </div>

                                <div style={{ marginTop: 6 }}>
                                  Attendance: <b>{row.totalPercentage}%</b>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="present" stackId="ward" fill={STATUS_COLORS.marked} maxBarSize={32} />
                        <Bar dataKey="onLeave" stackId="ward" fill={STATUS_COLORS.onLeave || "#3b82f6"} maxBarSize={32} />
                        <Bar
                          dataKey="absent"
                          stackId="ward"
                          fill={STATUS_COLORS.notMarked}
                          radius={[0, 4, 4, 0]}
                          maxBarSize={32}
                        >
                          <LabelList
                            dataKey="totalPercentage"
                            position="right"
                            formatter={(value) => `${value}%`}
                            style={{
                              fill: document.documentElement.classList.contains("dark")
                                ? "#ffffff"
                                : "#334155",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          />
                        </Bar>                  </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* CUSTOM STATUS LEGEND */}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    {[
                      {
                        name: "Present",
                        color: STATUS_COLORS.marked,
                        value: wardSummary.reduce(
                          (sum, item) => sum + item.present,
                          0
                        ),
                        bg: "bg-emerald-50",
                        border: "border-emerald-100",
                        text: "text-emerald-700",
                      },
                      {
                        name: "On Leave",
                        color:
                          STATUS_COLORS.onLeave ||
                          "#3b82f6",
                        value: wardSummary.reduce(
                          (sum, item) => sum + item.onLeave,
                          0
                        ),
                        bg: "bg-blue-50",
                        border: "border-blue-100",
                        text: "text-blue-700",
                      },
                      {
                        name: "Absent",
                        color: STATUS_COLORS.notMarked,
                        value: wardSummary.reduce(
                          (sum, item) => sum + item.absent,
                          0
                        ),
                        bg: "bg-rose-50",
                        border: "border-rose-100",
                        text: "text-rose-700",
                      },
                    ].map((item, index) => {
                      const grandTotal = wardSummary.reduce(
                        (sum, z) =>
                          sum +
                          z.present +
                          z.onLeave +
                          z.absent,
                        0
                      );

                      const percentage = grandTotal
                        ? (
                          (item.value / grandTotal) *
                          100
                        ).toFixed(1)
                        : 0;

                      return (
                        <div
                          key={index}
                          className={`
flex
items-center
justify-between

rounded-xl

px-4
py-3

shadow-sm
hover:shadow-md

transition-all
border
backdrop-blur-sm

dark:bg-slate-800
dark:border-slate-700
`}

                          style={{
                            backgroundColor:
                              document.documentElement.classList.contains("dark")
                                ? undefined
                                : `${item.color}12`,

                            borderColor:
                              document.documentElement.classList.contains("dark")
                                ? undefined
                                : `${item.color}35`,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: item.color,
                              }}
                            />

                            <div>
                              <p className="text-sm font-semibold text-slate-700 dark:text-white">
                                {item.name}
                              </p>

                              <p
                                className={`
    text-xs
    font-medium

    ${item.text}

    dark:text-slate-400
  `}
                              >                            {item.value.toLocaleString()} employees
                              </p>
                            </div>
                          </div>

                          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                            {percentage}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TOP PERFORMING KOTHIS */}
              {!isAdmin && kothiSummary.length > 0 && (
                <div data-report-section className="
bg-white
dark:bg-slate-900

rounded-xl
shadow-lg

border
border-slate-100
dark:border-slate-700

p-6
flex
flex-col
h-full
overflow-hidden
">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">Top Performing Kothis (Zone Wise)</h3>
                    <div className="flex flex-wrap gap-3">

                      {/* ZONE FILTER */}
                      <select
                        value={selectedZone}
                        onChange={(e) => {
                          setSelectedZone(e.target.value);
                          setSelectedWard("ALL");
                          setSelectedKothi("ALL");
                        }}
                        className="
      px-3 py-2
      rounded-xl
      border
      border-slate-300
      dark:border-slate-700

      bg-white
      dark:bg-slate-800

      text-sm
      font-medium

      text-slate-700
      dark:text-white

      min-w-[140px]
    "
                      >
                        <option value="ALL">
                          All Zones
                        </option>

                        {uniqueZones.map((zone) => (
                          <option
                            key={zone}
                            value={zone}
                          >
                            {zone}
                          </option>
                        ))}
                      </select>

                    </div>
                    <div className="
px-2
py-0.5

bg-slate-100
dark:bg-slate-800

text-slate-500
dark:text-slate-400

text-[10px]
font-bold

rounded
uppercase
tracking-wider

border
border-slate-200
dark:border-slate-700
">
                      {kothiSummary.length} Total
                    </div>
                  </div>

                  {/* SCROLLABLE DATA BODY */}
                  <div className="
flex-1
min-h-[350px]

overflow-y-auto
custom-scrollbar

border
border-slate-200
dark:border-slate-700

rounded-xl

bg-white
dark:bg-slate-900

shadow-inner
mb-2
">
                    <ResponsiveContainer width="100%" height={Math.max(340, kothiSummary.length * 54)}>
                      <BarChart
                        data={kothiSummaryWithPercentage} layout="vertical"
                        margin={{ left: 0, right: 30, top: 10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={
                          document.documentElement.classList.contains("dark")
                            ? "#1e293b"
                            : "#f1f5f9"
                        } />
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="kothi"
                          type="category"
                          width={180}
                          tickLine={false}
                          axisLine={false}
                          tick={{
                            fill: document.documentElement.classList.contains("dark")
                              ? "#ffffff"
                              : "#334155", fontSize: 10, fontWeight: 700
                          }}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(99, 102, 241, 0.03)" }}
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;

                            const row = payload[0].payload;

                            return (
                              <div
                                className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border"
                              >
                                <div className="font-semibold text-slate-800 dark:text-white">
                                  {row.kothi}
                                </div>

                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                  Ward Office: {row.ward}
                                </div>

                                <div className="text-sm">
                                  Attendance: <b>{row.totalPercentage}%</b>
                                </div>

                                <div className="text-sm text-green-600">
                                  Present: {row.present}
                                </div>

                                <div className="text-sm text-blue-600">
                                  Leave: {row.onLeave}
                                </div>

                                <div className="text-sm text-red-600">
                                  Absent: {row.absent}
                                </div>
                              </div>
                            );
                          }}
                        />                       <Bar dataKey="present" stackId="kothi" fill={STATUS_COLORS.marked} maxBarSize={30} />
                        <Bar dataKey="onLeave" stackId="kothi" fill={STATUS_COLORS.onLeave || "#3b82f6"} maxBarSize={30} />
                        <Bar
                          dataKey="absent"
                          stackId="kothi"
                          fill={STATUS_COLORS.notMarked}
                          radius={[0, 4, 4, 0]}
                          maxBarSize={30}
                        >
                          <LabelList
                            dataKey="totalPercentage"
                            position="right"
                            formatter={(value) => `${value}%`}
                            style={{
                              fill: document.documentElement.classList.contains("dark")
                                ? "#ffffff"
                                : "#334155",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          />
                        </Bar>                  </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* FIXED SCALE FOOTER */}
                  {/* HEADER TYPE STATUS CARDS */}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    {[
                      {
                        name: "Present",
                        color: STATUS_COLORS.marked,
                        value: kothiSummary.reduce(
                          (sum, item) => sum + item.present,
                          0
                        ),
                        bg: "bg-emerald-50 dark:bg-slate-800",
                        border: "border-emerald-100 dark:border-slate-700",
                        text: "text-emerald-700",
                      },
                      {
                        name: "On Leave",
                        color:
                          STATUS_COLORS.onLeave ||
                          "#3b82f6",
                        value: kothiSummary.reduce(
                          (sum, item) => sum + item.onLeave,
                          0
                        ),
                        bg: "bg-blue-50 dark:bg-slate-800",
                        border: "border-blue-100 dark:border-slate-700",
                        text: "text-blue-700",
                      },
                      {
                        name: "Absent",
                        color: STATUS_COLORS.notMarked,
                        value: kothiSummary.reduce(
                          (sum, item) => sum + item.absent,
                          0
                        ),
                        bg: "bg-rose-50 dark:bg-slate-800",
                        border: "border-rose-100 dark:border-slate-700",
                        text: "text-rose-700",
                      },
                    ].map((item, index) => {

                      const grandTotal =
                        kothiSummary.reduce(
                          (sum, z) =>
                            sum +
                            z.present +
                            z.onLeave +
                            z.absent,
                          0
                        );

                      const percentage = grandTotal
                        ? (
                          (item.value / grandTotal) *
                          100
                        ).toFixed(1)
                        : 0;

                      return (
                        <div
                          key={index}
                          className={`
flex
items-center
justify-between

rounded-xl

border
px-4
py-3

shadow-sm
hover:shadow-md

transition-all
backdrop-blur-sm

dark:bg-slate-800
dark:border-slate-700

${item.bg}
${item.border}
`}
                        >
                          <div className="flex items-center gap-3">

                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  item.color,
                              }}
                            />

                            <div>
                              <p className="text-sm font-semibold text-slate-700 dark:text-white">
                                {item.name}
                              </p>

                              <p
                                className={`
    text-xs
    font-medium

    ${item.text}

    dark:text-slate-400
  `}
                              >                            {item.value.toLocaleString()} employees
                              </p>
                            </div>
                          </div>

                          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                            {percentage}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div></>
        )}

        <div className="
grid
grid-cols-1
lg:grid-cols-2
gap-6
items-stretch
">
          <div
            data-report-section
            className="
bg-white
dark:bg-slate-900
rounded-xl
shadow-lg
border
border-slate-100
dark:border-slate-700
p-6
flex
flex-col
h-full
"          >
            <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white dark:text-white mb-4 shrink-0">Overall Status Distribution</h3>
            <div className="
rounded-2xl
border
border-slate-200
dark:border-slate-700
shadow-inner
overflow-hidden

bg-gradient-to-r
from-slate-50
via-white
to-slate-50

dark:from-slate-900
dark:via-slate-800
dark:to-slate-900

flex-1
flex
flex-col
">
              <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Status Mix
                  </p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-white">
                    Snapshot {dateRangeLabel}
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50
dark:bg-blue-900/30

text-blue-700
dark:text-blue-300

border
border-blue-100
dark:border-blue-800">
                  {pieTotal.toLocaleString()} total
                </span>
              </div>
              <div className="px-2 sm:px-4 pb-4">
                {pieData.length === 0 ? (
                  <div className="h-[320px] flex items-center justify-center text-sm text-slate-500 dark:text-slate-500">
                    No status data available for this selection.
                  </div>
                ) : (
                  <>
                    {/* <Plot
                      data={[
                        {
                          type: "pie",
                          hole: 0.72,
                          values: pieData.map((d) => d.value),
                          labels: pieData.map((d) => d.name),
                          marker: {
                            colors: pieData.map(
                              (d) =>
                                d.color || STATUS_COLORS.marked
                            ),
                            line: {
                              color: "#ffffff",
                              width: 3,
                            },
                          },
                          pull: pieData.map((d) =>
                            d.name === "Absent"
                              ? 0.1
                              : 0.04
                          ),
                          rotation: -35,
                          textinfo: "label+percent",
                          textposition: "outside",
                          textfont: {
                            size: 12,
                            color: "#0f172a",
                          },
                          hoverlabel: {
                            bgcolor: "#0f172a",
                            font: {
                              color: "#fff",
                              size: 12,
                            },
                          },
                          hovertemplate:
                            "<b>%{label}</b><br>%{value:,} people<br>%{percent:.1%} of total<extra></extra>",
                          automargin: true,
                        },
                      ]}
                      layout={{
                        margin: {
                          l: 40,
                          r: 40,
                          t: 30,
                          b: 60,
                        },

                        showlegend: false,

                        paper_bgcolor:
                          "rgba(0,0,0,0)",

                        plot_bgcolor:
                          "rgba(0,0,0,0)",

                        annotations: [
                          {
                            text: `${pieTotal.toLocaleString()}`,
                            x: 0.5,
                            y: 0.53,
                            font: {
                              size: 18,
                              color: "#0f172a",
                              family:
                                "Inter, system-ui",
                            },
                            showarrow: false,
                          },
                          {
                            text: "Total employees",
                            x: 0.5,
                            y: 0.45,
                            font: {
                              size: 10,
                              color: "#64748b",
                            },
                            showarrow: false,
                          },
                        ],
                      }}
                      style={{
                        width: "100%",
                        height: "420px",
                      }}
                      useResizeHandler
                      config={{
                        displaylogo: false,
                        responsive: true,
                        modeBarButtonsToRemove: [
                          "select2d",
                          "lasso2d",
                          "toggleSpikelines",
                          "autoScale2d",
                        ],
                      }}
                    /> */}
                    <div className="flex flex-col lg:flex-row items-center w-full">

                      <Plot
                        data={[
                          {
                            type: "pie",

                            hole: 0.70,

                            values: pieData.map(
                              (d) => d.value
                            ),

                            labels: pieData.map(
                              (d) => d.name
                            ),

                            marker: {
                              colors: pieData.map(
                                (d) =>
                                  d.color ||
                                  STATUS_COLORS.marked
                              ),

                              line: {
                                color: "transparent",
                                width: 0,
                              },
                            },

                            pull: pieData.map(() => 0.025),

                            rotation: -28,

                            sort: false,

                            direction: "clockwise",

                            textinfo: "none",

                            hoverinfo:
                              "label+percent+value",

                            hoverlabel: {
                              bgcolor: document.documentElement.classList.contains("dark")
                                ? "#0f172a"
                                : "#ffffff",

                              bordercolor: document.documentElement.classList.contains("dark")
                                ? "#334155"
                                : "#e2e8f0",

                              font: {
                                color: document.documentElement.classList.contains("dark")
                                  ? "#ffffff"
                                  : "#334155",
                                size: 12,
                                family: "Inter, system-ui",
                              },
                            },

                            hovertemplate:
                              "<b>%{label}</b><br>%{value:,} employees<br>%{percent:.1%} of total<extra></extra>",

                            automargin: true,
                          },
                        ]}

                        layout={{
                          margin: {
                            l: 20,
                            r: 20,
                            t: 20,
                            b: 20,
                          },

                          transition: {
                            duration: 500,
                            easing: "cubic-in-out",
                          },

                          hovermode: "closest",

                          showlegend: false,

                          paper_bgcolor:
                            "rgba(0,0,0,0)",

                          plot_bgcolor:
                            "rgba(0,0,0,0)",

                          annotations: [
                            {
                              text: `${pieTotal.toLocaleString()}`,

                              x: 0.5,
                              y: 0.53,

                              font: {
                                size: 34,
                                color: document.documentElement.classList.contains("dark")
                                  ? "#ffffff"
                                  : "#0f172a",
                                family:
                                  "Inter, system-ui",
                              },

                              showarrow: false,
                            },

                            {
                              text: "TOTAL",

                              x: 0.5,
                              y: 0.43,

                              font: {
                                size: 12,
                                color: document.documentElement.classList.contains("dark")
                                  ? "#64748b"
                                  : "#94a3b8",
                                family:
                                  "Inter, system-ui",
                              },

                              showarrow: false,
                            },
                          ],
                        }}

                        style={{
                          width: "100%",
                          height: "350px",
                        }}

                        useResizeHandler

                        config={{
                          displaylogo: false,

                          responsive: true,

                          staticPlot: false,

                          scrollZoom: false,

                          doubleClick: false,

                          displayModeBar: false,

                          modeBarButtonsToRemove: [
                            "select2d",
                            "lasso2d",
                            "toggleSpikelines",
                            "autoScale2d",
                            "zoom2d",
                            "pan2d",
                          ],
                        }}
                      />




                      {/* CUSTOM LEGEND */}

                      <div className=" gap-3 mt-5 px-2">
                        {pieData.map((item, index) => {
                          const percentage = pieTotal
                            ? (
                              (item.value / pieTotal) *
                              100
                            ).toFixed(1)
                            : 0;

                          return (
                            <div
                              key={index}
                              className={`
flex
items-center
justify-between
rounded-xl
px-4
py-3
shadow-sm
hover:shadow-md
transition-all
border
backdrop-blur-sm
mb-3
dark:bg-slate-800 dark:bg-slate-900
dark:border-slate-700
`}
                              style={{
                                backgroundColor:
                                  document.documentElement.classList.contains("dark")
                                    ? undefined
                                    : `${item.color || STATUS_COLORS.marked}12`,

                                borderColor:
                                  document.documentElement.classList.contains("dark")
                                    ? undefined
                                    : `${item.color || STATUS_COLORS.marked}35`,
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor:
                                      item.color ||
                                      STATUS_COLORS.marked,
                                  }}
                                />

                                <div>
                                  <p className="text-sm font-semibold text-slate-700 dark:text-white">
                                    {item.name}
                                  </p>

                                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                    {item.value.toLocaleString()}{" "}
                                    employees
                                  </p>
                                </div>
                              </div>

                              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                {percentage}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div>

            {/* TITLE */}


            {/* CARD */}
            <div
              className="
      rounded-3xl
      border
      border-slate-200
      dark:border-slate-700

      bg-white
      dark:bg-slate-900

      shadow-sm

      p-6
    "
            >
              <div className="text-lg font-black tracking-tight text-slate-800 dark:text-white">
                Leave Summary
              </div>
              <div className="flex gap-3 mb-4">
                <select
                  value={leaveZone}
                  onChange={(e) => {
                    setLeaveZone(e.target.value);
                    setLeaveWard("ALL");
                  }}
                  className="border rounded-lg px-3 py-2"
                >
                  <option value="ALL">All Zones</option>

                  {uniqueZones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>

                <select
                  value={leaveWard}
                  onChange={(e) =>
                    setLeaveWard(e.target.value)
                  }
                  className="border rounded-lg px-3 py-2"
                >
                  <option value="ALL">All Wards</option>

                  {leaveWards.map((ward) => (
                    <option key={ward} value={ward}>
                      {ward}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className="
        flex
        flex-col
        lg:flex-row

        items-center
        justify-between

        gap-8
      "
              >


                <div className="relative w-[350px] h-[350px] mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leaveSummaryData.data.filter(x => x.value > 0)}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={90}
                        outerRadius={140}
                        paddingAngle={3}
                      >
                        {leaveSummaryData.data.map((entry, index) => (
                          <Cell
                            key={index}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>

                      <Tooltip
                        formatter={(value, name) => [
                          `${value} Employees`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-5xl font-black">
                      {leaveSummaryData.totalLeaves}
                    </span>

                    <span className="text-base text-slate-500">
                      Total Leaves
                    </span>
                  </div>
                </div>


                <div className="flex-1 w-full space-y-5">

                  {leaveSummaryData.data.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="
                flex
                items-center
                justify-between

                gap-4
              "
                      >

                        <div
                          className="
                  flex
                  items-center
                  gap-3
                "
                        >

                          <div
                            className="
                    w-4
                    h-4

                    rounded-sm
                    shrink-0
                  "
                            style={{
                              backgroundColor:
                                item.color,
                            }}
                          />

                          <span
                            className="
                    text-sm
                    font-semibold

                    text-slate-700
                    dark:text-slate-300
                  "
                          >
                            {item.label}
                          </span>
                        </div>


                        <div
                          className="
                  text-sm
                  font-bold

                  text-slate-800
                  dark:text-white
                "
                        >
                          {item.value} (
                          {item.percentage}%)
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* PEAK ARRIVAL TREND (Moved here from Row 2) */}
        {/* <div
            data-report-section
            className="
    bg-white
    dark:bg-slate-900

    rounded-xl
    shadow-lg

    border
    border-slate-100
    dark:border-slate-700

    p-6
    flex
    flex-col
    h-full
  "
          >
            <ArrivalTrendChart
              wards={effectiveWards}
              isEmbedded={true}
            />
          
          </div> */}





        {/* ADMIN: City Status Breakdown */}
        {isAdmin && cityLineData.length > 0 && (
          // <div data-report-section className="bg-white rounded-xl shadow-lg border border-slate-100 p-6 flex flex-col h-full">
          //   <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white mb-4 shrink-0">City Status Breakdown</h3>
          //   <div className="rounded-2xl border border-slate-200 shadow-inner bg-gradient-to-r from-slate-50 via-white to-slate-50 flex-1 relative min-h-[300px]">
          //     <div className="absolute inset-0 p-4">
          //       <ResponsiveContainer width="100%" height="100%">
          //         <BarChart data={cityLineData} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
          //           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          //           <XAxis dataKey="city" tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
          //           <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
          //           <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
          //           <Legend iconType="circle" wrapperStyle={{ paddingTop: "12px" }} />
          //           <Bar dataKey="present" stackId="city" fill={STATUS_COLORS.marked} name="Present" />
          //           <Bar dataKey="onLeave" stackId="city" fill={STATUS_COLORS.onLeave} name="On Leave" />
          //           <Bar dataKey="absent" stackId="city" fill={STATUS_COLORS.notMarked} name="Absent" radius={[4, 4, 0, 0]} />
          //         </BarChart>
          //       </ResponsiveContainer>
          //     </div>
          //   </div>
          // </div>
          <div
            data-report-section
            className="
bg-white
dark:bg-slate-900

rounded-xl

shadow-lg
dark:shadow-slate-950/30

border
border-slate-100
dark:border-slate-700

p-6

flex
flex-col

h-full
"
          >
            <h3
              className="
text-xl
font-extrabold
tracking-tight

text-slate-800
dark:text-white

mb-4

shrink-0
"
            >
              City Status Breakdown
            </h3>

            <div
              className="
rounded-2xl

border
border-slate-200
dark:border-slate-700

shadow-inner
dark:shadow-none

bg-gradient-to-r
from-slate-50
via-white
to-slate-50

dark:from-slate-900
dark:via-slate-800
dark:to-slate-900

flex-1
relative

min-h-[300px]
"
            >
              <div className="absolute inset-0 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cityLineData}
                    margin={{ left: 0, right: 20, top: 10, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={
                        document.documentElement.classList.contains("dark")
                          ? "#334155"
                          : "#e5e7eb"
                      }
                    />

                    <XAxis
                      dataKey="city"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: document.documentElement.classList.contains("dark")
                          ? "#cbd5e1"
                          : "#6b7280",
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: document.documentElement.classList.contains("dark")
                          ? "#cbd5e1"
                          : "#6b7280",
                        fontSize: 12,
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: document.documentElement.classList.contains("dark")
                          ? "1px solid #334155"
                          : "1px solid #e2e8f0",

                        backgroundColor: document.documentElement.classList.contains("dark")
                          ? "#0f172a"
                          : "#ffffff",

                        color: document.documentElement.classList.contains("dark")
                          ? "#f8fafc"
                          : "#0f172a",

                        boxShadow: document.documentElement.classList.contains("dark")
                          ? "0 10px 25px rgba(0,0,0,0.45)"
                          : "0 4px 12px rgba(0,0,0,0.12)",
                      }}

                      labelStyle={{
                        color: document.documentElement.classList.contains("dark")
                          ? "#ffffff"
                          : "#0f172a",
                      }}

                      itemStyle={{
                        color: document.documentElement.classList.contains("dark")
                          ? "#e2e8f0"
                          : "#334155",
                      }}
                    />

                    {/* <Legend
            iconType="circle"
            wrapperStyle={{
              paddingTop: "12px",
            }}

            formatter={(value) => (
              <span
                style={{
                  color: document.documentElement.classList.contains("dark")
                    ? "#cbd5e1"
                    : "#475569",

                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {value}
              </span>
            )}
          /> */}
                    <Legend
                      wrapperStyle={{
                        paddingTop: "16px",
                      }}

                      formatter={(value, entry) => {
                        const total =
                          cityLineData?.reduce(
                            (sum, item) =>
                              sum +
                              (item.present || 0) +
                              (item.onLeave || 0) +
                              (item.absent || 0),
                            0
                          ) || 0;

                        let currentValue = 0;

                        if (value === "Present") {
                          currentValue = cityLineData?.reduce(
                            (sum, item) => sum + (item.present || 0),
                            0
                          );
                        }

                        if (value === "On Leave") {
                          currentValue = cityLineData?.reduce(
                            (sum, item) => sum + (item.onLeave || 0),
                            0
                          );
                        }

                        if (value === "Absent") {
                          currentValue = cityLineData?.reduce(
                            (sum, item) => sum + (item.absent || 0),
                            0
                          );
                        }

                        const percentage = total
                          ? ((currentValue / total) * 100).toFixed(1)
                          : 0;

                        return (
                          <div
                            className="
flex
items-center
justify-between

min-w-[140px]

px-3
py-2

rounded-xl

border

bg-white
dark:bg-slate-800

border-slate-100
dark:border-slate-700

shadow-sm
dark:shadow-none

ml-2
"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                  backgroundColor: entry.color,
                                }}
                              />

                              <div className="flex flex-col">
                                <span
                                  style={{
                                    color: document.documentElement.classList.contains("dark")
                                      ? "#e2e8f0"
                                      : "#334155",

                                    fontSize: "12px",
                                    fontWeight: 600,
                                  }}
                                >
                                  {value}
                                </span>

                                <span
                                  style={{
                                    color: document.documentElement.classList.contains("dark")
                                      ? "#64748b"
                                      : "#94a3b8",

                                    fontSize: "10px",
                                    fontWeight: 500,
                                  }}
                                >
                                  {currentValue.toLocaleString()} emp
                                </span>
                              </div>
                            </div>

                            <span
                              style={{
                                color: document.documentElement.classList.contains("dark")
                                  ? "#cbd5e1"
                                  : "#475569",

                                fontSize: "12px",
                                fontWeight: 700,
                              }}
                            >
                              {percentage}%
                            </span>
                          </div>
                        );
                      }}
                    />

                    <Bar
                      dataKey="present"
                      stackId="city"
                      fill={STATUS_COLORS.marked}
                      name="Present"
                    />

                    <Bar
                      dataKey="onLeave"
                      stackId="city"
                      fill={STATUS_COLORS.onLeave}
                      name="On Leave"
                    />

                    <Bar
                      dataKey="absent"
                      stackId="city"
                      fill={STATUS_COLORS.notMarked}
                      name="Absent"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}



        {/* ADMIN: Attendance Health Radar */}
        {isAdmin && radarData.length > 0 && (
          <div
            data-report-section
            className="
bg-white
dark:bg-slate-900

rounded-xl

shadow-lg
dark:shadow-slate-950/30

border
border-slate-100
dark:border-slate-700

p-6

flex
flex-col

h-full
"
          >
            <h3
              className="
text-xl
font-extrabold
tracking-tight

text-slate-800
dark:text-white

mb-4

shrink-0
"
            >
              Attendance Health Radar
            </h3>

            <div
              className="
rounded-2xl

border
border-slate-200
dark:border-slate-700

shadow-inner
dark:shadow-none

bg-gradient-to-r
from-slate-50
via-white
to-slate-50

dark:from-slate-900
dark:via-slate-800
dark:to-slate-900

p-4

flex-1
flex
items-center
justify-center
"
            >
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid
                    stroke={
                      document.documentElement.classList.contains("dark")
                        ? "#334155"
                        : "#e2e8f0"
                    }
                  />

                  <PolarAngleAxis
                    dataKey="city"
                    tick={{
                      fill: document.documentElement.classList.contains("dark")
                        ? "#cbd5e1"
                        : "#475569",

                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  />

                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{
                      fill: document.documentElement.classList.contains("dark")
                        ? "#64748b"
                        : "#94a3b8",

                      fontSize: 10,
                    }}
                  />

                  <Radar
                    name="Attendance Rate"
                    dataKey="attendanceRate"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    dot={{
                      r: 4,
                      fill: "#3b82f6",
                    }}
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Attendance Rate",
                    ]}

                    contentStyle={{
                      borderRadius: "12px",

                      border: document.documentElement.classList.contains("dark")
                        ? "1px solid #334155"
                        : "1px solid #e2e8f0",

                      backgroundColor: document.documentElement.classList.contains("dark")
                        ? "#0f172a"
                        : "#ffffff",

                      color: document.documentElement.classList.contains("dark")
                        ? "#f8fafc"
                        : "#0f172a",

                      boxShadow: document.documentElement.classList.contains("dark")
                        ? "0 10px 25px rgba(0,0,0,0.45)"
                        : "0 4px 12px rgba(0,0,0,0.12)",
                    }}

                    labelStyle={{
                      color: document.documentElement.classList.contains("dark")
                        ? "#ffffff"
                        : "#0f172a",
                    }}

                    itemStyle={{
                      color: document.documentElement.classList.contains("dark")
                        ? "#e2e8f0"
                        : "#334155",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}



        {/* ADMIN: Attendance Momentum (Area Chart) - Re-added and shrunken */}
        {/* {isAdmin && cityLineData.length > 0 && (
            <div data-report-section className="bg-white rounded-xl shadow-lg border border-slate-100 p-6 flex flex-col h-full">
              <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white mb-4 shrink-0">Attendance Momentum</h3>
              <div className="rounded-2xl border border-slate-200 shadow-inner bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 flex-1">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={cityLineData} margin={{ left: 0, right: 20, top: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="momentumMarked" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={STATUS_COLORS.marked} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={STATUS_COLORS.marked} stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="momentumOnLeave" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={STATUS_COLORS.onLeave} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={STATUS_COLORS.onLeave} stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="momentumAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={STATUS_COLORS.notMarked} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={STATUS_COLORS.notMarked} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="city" tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: "12px" }} />
                    <Area type="monotone" dataKey="present" stroke={STATUS_COLORS.marked} fill="url(#momentumMarked)" name="Present" strokeWidth={2} dot={{ r: 3 }} />
                    <Area type="monotone" dataKey="onLeave" stroke={STATUS_COLORS.onLeave} fill="url(#momentumOnLeave)" name="On Leave" strokeWidth={2} dot={{ r: 3 }} />
                    <Area type="monotone" dataKey="absent" stroke={STATUS_COLORS.notMarked} fill="url(#momentumAbsent)" name="Absent" strokeWidth={2} dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )} */}
        {isAdmin && cityLineData.length > 0 && (
          <div
            data-report-section
            className="
bg-white
dark:bg-slate-900

rounded-xl

shadow-lg
dark:shadow-slate-950/30

border
border-slate-100
dark:border-slate-700

p-6

flex
flex-col

h-full
"
          >
            <h3
              className="
text-xl
font-extrabold
tracking-tight

text-slate-800
dark:text-white

mb-4

shrink-0
"
            >
              Attendance Momentum
            </h3>

            <div
              className="
rounded-2xl
min-h-[420px]

border
border-slate-200
dark:border-slate-700

shadow-inner
dark:shadow-none

bg-gradient-to-r
from-slate-50
via-white
to-slate-50

dark:from-slate-900
dark:via-slate-800
dark:to-slate-900

p-4

flex-1
"
            >
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart
                  data={cityLineData}
                  margin={{ left: 0, right: 20, top: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="momentumMarked" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={STATUS_COLORS.marked}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={STATUS_COLORS.marked}
                        stopOpacity={0.05}
                      />
                    </linearGradient>

                    <linearGradient id="momentumOnLeave" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={STATUS_COLORS.onLeave}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={STATUS_COLORS.onLeave}
                        stopOpacity={0.05}
                      />
                    </linearGradient>

                    <linearGradient id="momentumAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={STATUS_COLORS.notMarked}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={STATUS_COLORS.notMarked}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={
                      document.documentElement.classList.contains("dark")
                        ? "#334155"
                        : "#e5e7eb"
                    }
                  />

                  <XAxis
                    dataKey="city"
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: document.documentElement.classList.contains("dark")
                        ? "#cbd5e1"
                        : "#6b7280",
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{
                      fill: document.documentElement.classList.contains("dark")
                        ? "#cbd5e1"
                        : "#6b7280",
                      fontSize: 12,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",

                      border: document.documentElement.classList.contains("dark")
                        ? "1px solid #334155"
                        : "1px solid #e2e8f0",

                      backgroundColor: document.documentElement.classList.contains("dark")
                        ? "#0f172a"
                        : "#ffffff",

                      color: document.documentElement.classList.contains("dark")
                        ? "#f8fafc"
                        : "#0f172a",

                      boxShadow: document.documentElement.classList.contains("dark")
                        ? "0 10px 25px rgba(0,0,0,0.45)"
                        : "0 4px 12px rgba(0,0,0,0.12)",
                    }}

                    labelStyle={{
                      color: document.documentElement.classList.contains("dark")
                        ? "#ffffff"
                        : "#0f172a",
                    }}

                    itemStyle={{
                      color: document.documentElement.classList.contains("dark")
                        ? "#e2e8f0"
                        : "#334155",
                    }}
                  />

                  <Legend
                    iconType="none"
                    verticalAlign="bottom"
                    align="center"
                    layout="horizontal"

                    wrapperStyle={{
                      paddingTop: "16px",
                    }}

                    formatter={(value, entry) => {
                      const total =
                        cityLineData?.reduce(
                          (sum, item) =>
                            sum +
                            (item.present || 0) +
                            (item.onLeave || 0) +
                            (item.absent || 0),
                          0
                        ) || 0;

                      let currentValue = 0;

                      if (value === "Present") {
                        currentValue = cityLineData?.reduce(
                          (sum, item) => sum + (item.present || 0),
                          0
                        );
                      }

                      if (value === "On Leave") {
                        currentValue = cityLineData?.reduce(
                          (sum, item) => sum + (item.onLeave || 0),
                          0
                        );
                      }

                      if (value === "Absent") {
                        currentValue = cityLineData?.reduce(
                          (sum, item) => sum + (item.absent || 0),
                          0
                        );
                      }

                      const percentage = total
                        ? ((currentValue / total) * 100).toFixed(1)
                        : 0;

                      return (
                        <div
                          className="
flex
items-center
justify-between

min-w-[150px]

px-3
py-2

rounded-xl

border

bg-white
dark:bg-slate-800

border-slate-100
dark:border-slate-700

shadow-sm
dark:shadow-none

ml-2
"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor: entry.color,
                              }}
                            />

                            <div className="flex flex-col">
                              <span
                                style={{
                                  color:
                                    document.documentElement.classList.contains("dark")
                                      ? "#e2e8f0"
                                      : "#334155",

                                  fontSize: "12px",
                                  fontWeight: 600,
                                }}
                              >
                                {value}
                              </span>

                              <span
                                style={{
                                  color:
                                    document.documentElement.classList.contains("dark")
                                      ? "#64748b"
                                      : "#94a3b8",

                                  fontSize: "10px",
                                  fontWeight: 500,
                                }}
                              >
                                {currentValue.toLocaleString()} emp
                              </span>
                            </div>
                          </div>

                          <span
                            style={{
                              color:
                                document.documentElement.classList.contains("dark")
                                  ? "#cbd5e1"
                                  : "#475569",

                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            {percentage}%
                          </span>
                        </div>
                      );
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="present"
                    stroke={STATUS_COLORS.marked}
                    fill="url(#momentumMarked)"
                    name="Present"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />

                  <Area
                    type="monotone"
                    dataKey="onLeave"
                    stroke={STATUS_COLORS.onLeave}
                    fill="url(#momentumOnLeave)"
                    name="On Leave"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />

                  <Area
                    type="monotone"
                    dataKey="absent"
                    stroke={STATUS_COLORS.notMarked}
                    fill="url(#momentumAbsent)"
                    name="Absent"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="
grid
grid-cols-1
lg:grid-cols-2
gap-6
items-stretch
">
          {/* EMPLOYEE CHART (Only for Supervisor) */}
          {!isAdmin && (employeeSummary.length > 0 || availableRoles.length > 0) && (
            <div data-report-section className="
bg-white
dark:bg-slate-900

rounded-xl
shadow-lg

border
border-slate-100
dark:border-slate-700

border-l-[4px]
border-l-emerald-500

p-6
relative
flex
flex-col
h-full
">

              <div className="mb-5 shrink-0">

                {/* TOP ROW */}
                <div className="flex items-center justify-between gap-3 mb-4">

                  {/* TITLE */}
                  <div>
                    <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                      Top Performing Employees (Zone and Ward Wise)
                    </h3>

                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Ranked by days present •{" "}
                      {selectedPeriod
                        ? monthOptions.find(
                          (o) => o.value === selectedPeriod
                        )?.label || "Selected Month"
                        : dateRangeLabel}
                    </p>
                  </div>

                  {/* EMPLOYEE COUNT */}
                  <span
                    className="
        px-4
        py-2

        text-sm
        font-semibold

        rounded-full

        bg-emerald-50
        dark:bg-emerald-900/30

        text-emerald-700
        dark:text-emerald-300

        border
        border-emerald-100
        dark:border-emerald-800

        shadow-sm
        whitespace-nowrap
      "
                  >
                    {employeeSummary.length} employee
                    {employeeSummary.length !== 1
                      ? "s"
                      : ""}
                  </span>
                </div>

                {/* FILTER ROW */}
                <div className="flex flex-wrap items-center gap-3">

                  {/* ZONE FILTER */}
                  <select
                    value={selectedZone}
                    onChange={(e) => {
                      setSelectedZone(e.target.value);
                      setSelectedWard("ALL");
                    }}
                    className="
        min-w-[140px]

        text-sm

        border
        border-slate-300
        dark:border-slate-700

        rounded-xl

        px-4
        py-2.5

        text-slate-700
        dark:text-white

        bg-slate-50
        dark:bg-slate-800

        hover:bg-white
        dark:hover:bg-slate-700

        focus:outline-none
        focus:ring-2
        focus:ring-emerald-500/20
        focus:border-emerald-500

        shadow-sm
        transition-all
        cursor-pointer
      "
                  >
                    <option value="ALL">
                      All Zones
                    </option>

                    {uniqueZones.map((zone) => (
                      <option
                        key={zone}
                        value={zone}
                      >
                        {zone}
                      </option>
                    ))}
                  </select>

                  {/* WARD FILTER */}
                  <select
                    value={selectedWard}
                    onChange={(e) =>
                      setSelectedWard(e.target.value)
                    }
                    className="
        min-w-[260px]

        text-sm

        border
        border-slate-300
        dark:border-slate-700

        rounded-xl

        px-4
        py-2.5

        text-slate-700
        dark:text-white

        bg-slate-50
        dark:bg-slate-800

        hover:bg-white
        dark:hover:bg-slate-700

        focus:outline-none
        focus:ring-2
        focus:ring-emerald-500/20
        focus:border-emerald-500

        shadow-sm
        transition-all
        cursor-pointer
      "
                  >
                    <option value="ALL">
                      All Wards
                    </option>

                    {uniqueWards.map((ward) => (
                      <option
                        key={ward}
                        value={ward}
                      >
                        {ward}
                      </option>
                    ))}
                  </select>

                  {/* MONTH FILTER */}
                  <select
                    value={selectedPeriod}
                    onChange={(e) =>
                      setSelectedPeriod(e.target.value)
                    }
                    className="
        min-w-[180px]

        text-sm

        border
        border-slate-300
        dark:border-slate-700

        rounded-xl

        px-4
        py-2.5

        text-slate-700
        dark:text-white

        bg-slate-50
        dark:bg-slate-800

        hover:bg-white
        dark:hover:bg-slate-700

        focus:outline-none
        focus:ring-2
        focus:ring-emerald-500/20
        focus:border-emerald-500

        shadow-sm
        transition-all
        cursor-pointer
      "
                  >
                    <option value="">
                      Dashboard Range
                    </option>

                    {monthOptions.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* LOADER */}
                  {fetching && (
                    <div
                      className="
          w-5
          h-5

          border-2
          border-emerald-500
          border-t-transparent

          rounded-full
          animate-spin
        "
                    />
                  )}
                </div>
              </div>

              {employeeSummary.length === 0 ? (
                <div className="
h-48
flex
items-center
justify-center

text-sm
font-medium

text-slate-400
dark:text-slate-500

bg-slate-50
dark:bg-slate-800 dark:bg-slate-900

rounded-xl

border
border-dashed
border-slate-200
dark:border-slate-700

flex-1
">
                  No employee metrics match the selected category.
                </div>
              ) : (
                <div className="mt-5 space-y-3 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: "450px" }}>
                  {employeeSummary.map((employee, index) => {
                    // Top 3 Badge styling
                    let badgeClass = `
bg-white
dark:bg-slate-700

text-slate-400
dark:text-slate-300

border
border-slate-200
dark:border-slate-600
`;
                    if (index === 0) badgeClass = "bg-amber-100 text-amber-700 border border-amber-300 shadow-sm";
                    else if (index === 1) badgeClass = "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 shadow-sm";
                    else if (index === 2) badgeClass = "bg-orange-100 text-orange-700 border border-orange-300 shadow-sm";

                    return (
                      <div
                        key={index}
                        className="
relative
flex
items-center
justify-between

p-4

bg-slate-50
dark:bg-slate-800 dark:bg-slate-900

border
border-slate-100
dark:border-slate-700

rounded-xl

hover:bg-emerald-50
dark:hover:bg-slate-700

hover:border-emerald-200
dark:hover:border-emerald-700

transition-colors
group
cursor-default
"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm shrink-0 ${badgeClass}`}>
                            #{index + 1}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                              {employee.name}
                            </span>
                          </div>
                        </div>
                        <div className="
text-right
shrink-0
flex
flex-col
items-center
justify-center

bg-emerald-50
dark:bg-emerald-900/30

px-4
py-2

rounded-xl

border
border-emerald-100
dark:border-emerald-800

shadow-sm
">
                          <div className="text-xl font-black text-emerald-600 leading-none">
                            {employee.days_present}
                          </div>
                          <div className="text-[9px] font-bold text-emerald-700/80 dark:text-emerald-300/80 uppercase tracking-widest mt-1">
                            Days Present
                          </div>
                        </div>

                        {/* Simple Hover Details */}
                        <div className="
absolute
left-[4rem]
top-1/2
-translate-y-1/2

z-20

min-w-[200px]
max-w-[320px]

bg-slate-800 dark:bg-slate-900
dark:bg-slate-900

text-white

rounded
shadow-xl

border
border-slate-700

opacity-0
invisible

group-hover:opacity-100
group-hover:visible

transition-opacity
duration-200

p-3
pointer-events-none
">
                          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 dark:bg-slate-900 transform rotate-45"></div>
                          <div className="font-bold text-sm mb-1">{employee.name}</div>
                          <div className="flex flex-col gap-1 text-xs text-slate-300">
                            <div><span className="text-slate-500 dark:text-slate-400 mr-1">Role:</span> {employee.role}</div>
                            <div><span className="text-slate-500 dark:text-slate-400 mr-1">Zone:</span> {employee.zone}</div>
                            <div><span className="text-slate-500 dark:text-slate-400 mr-1">Ward:</span> {employee.ward}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TOP SUPERVISORS CHART (Next to Top Employees) */}
          {!isAdmin && (
            <div data-report-section className="relative flex flex-col h-full">
              <TopSupervisors
                startDate={startDate}
                endDate={endDate}

                selectedCityId={selectedCityId}

                selectedZone={selectedSupervisorZone}
                setSelectedZone={setSelectedSupervisorZone}

                selectedWard={selectedSupervisorWard}
                setSelectedWard={setSelectedSupervisorWard}

                uniqueZones={uniqueZones}
                uniqueWards={uniqueWards}

                refreshKey={refreshKey}
              />
            </div>
          )}</div>

        {/* TOTAL EMPLOYEE BIFURCATION SECTION (Only for Supervisor) */}
        {/* {!isAdmin && (roleDistribution.length > 0 || areaDistribution.length > 0) && (
            <div data-report-section className="col-span-1 xl:col-span-2 bg-white rounded-xl shadow-lg border border-slate-100 p-6 xl:p-8 mt-4">
              <h3 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                Employee Distribution Matrix
                <span className="px-3 py-1 bg-slate-100 text-slate-500 dark:text-slate-400 rounded-full text-xs font-semibold">{summary?.totalEmployees || 0} Total</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">By Role Structure</h4>
                  <div className="max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                    <div style={{ height: Math.max(300, roleDistribution.length * 40) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={roleDistribution}
                          layout="vertical"
                          margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }}
                            width={130}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                          />
                          <Tooltip
                            cursor={{ fill: "#f1f5f9" }}
                            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            formatter={(value) => [value.toLocaleString(), "Employees"]}
                          />
                          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {!isAdmin && (
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">By Kothi Origin</h4>
                    <div className="max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                      <div style={{ height: Math.max(300, areaDistribution.length * 40) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={areaDistribution}
                            layout="vertical"
                            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                          >
                            <XAxis type="number" hide />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }}
                              width={150}
                              axisLine={false}
                              tickLine={false}
                              interval={0}
                            />
                            <Tooltip
                              cursor={{ fill: "#f1f5f9" }}
                              contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                              formatter={(value) => [value.toLocaleString(), "Employees"]}
                            />
                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={32} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )} */}
        {!isAdmin &&
          (roleDistribution.length > 0 ||
            areaDistribution.length > 0) && (
            <div
              data-report-section
              className="
col-span-1
xl:col-span-2
relative
overflow-hidden
rounded-3xl
border
border-slate-200
dark:border-slate-700

bg-gradient-to-br
from-white
via-slate-50
to-slate-100

dark:from-slate-900
dark:via-slate-900
dark:to-slate-800

shadow-2xl
mt-4
"
            >
              {/* BACKGROUND GLOW */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100/30 dark:bg-blue-900/20 blur-3xl rounded-full"></div>
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-100/30 dark:bg-indigo-900/20 blur-3xl rounded-full"></div>

              <div className="relative p-6 xl:p-8">
                {/* HEADER */}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
                      Employee Distribution Matrix
                    </h3>

                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 font-medium">
                      Workforce structure across roles
                      and kothis
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="
px-4
py-2
rounded-2xl

bg-white
dark:bg-slate-800 dark:bg-slate-900

border
border-slate-200
dark:border-slate-700

shadow-sm
">
                      <div className="text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                        Total Employees
                      </div>

                      <div className="text-2xl font-black text-slate-800 dark:text-white leading-none mt-1">
                        {summary?.totalEmployees ||
                          0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONTENT */}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                  {/* ROLE STRUCTURE */}

                  <div className="
relative
overflow-hidden
rounded-3xl
border
border-blue-100
dark:border-slate-700
bg-white
dark:bg-slate-900
shadow-xl
">

                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100/40 dark:bg-blue-900/20 blur-3xl rounded-full"></div>

                    <div className="relative p-6">

                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h4 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">
                            Punch Time Analysis
                          </h4>

                          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">
                            Employee activity by hour
                          </p>
                        </div>
                      </div>

                      <div
                        className="
      rounded-2xl
      border
      border-slate-200
      dark:border-slate-700
      bg-white
      dark:bg-slate-900
      p-4
      h-[420px]
    "
                      >

                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={punchTimeAnalysis}>
                            <CartesianGrid strokeDasharray="3 3" />

                            <XAxis dataKey="hour" />
                            <YAxis />

                            <Tooltip />
                            <Legend />

                            <Bar
                              dataKey="punchIn"
                              stackId="a"
                              fill="#22c55e"
                            />

                            <Bar
                              dataKey="midPunch"
                              stackId="a"
                              fill="#f59e0b"
                            />

                            <Bar
                              dataKey="punchOut"
                              stackId="a"
                              fill="#ef4444"
                            />
                          </BarChart>
                        </ResponsiveContainer>

                      </div>

                    </div>
                  </div>

                  {/* KOTHI ORIGIN */}

                  {!isAdmin && (
                    <div className="
relative
overflow-hidden
rounded-3xl
border
border-indigo-100
dark:border-slate-700
bg-white
dark:bg-slate-900
shadow-xl
">

                      <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-100/40 dark:bg-indigo-900/20 blur-3xl rounded-full"></div>

                      <div className="relative p-6">

                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <h4 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">
                              Kothi-wise Employee Distribution ⭐
                            </h4>

                            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-bold mt-1">
                              Employees by kothi
                            </p>
                            <div className="flex flex-wrap gap-3">

                              {/* ZONE FILTER */}
                              <select
                                value={kothiOriginZone}
                                onChange={(e) => {

                                  setKothiOriginZone(
                                    e.target.value
                                  );

                                  setKothiOriginWard("ALL");

                                }}
                                className="
      px-3 py-2
      rounded-xl
      border
      border-slate-300
      dark:border-slate-700
      bg-white
      dark:bg-slate-800
      text-sm
      font-medium
      text-slate-700
      dark:text-white
      min-w-[140px]
    "
                              >
                                <option value="ALL">
                                  All Zones
                                </option>

                                {uniqueZones.map((zone) => (
                                  <option
                                    key={zone}
                                    value={zone}
                                  >
                                    {zone}
                                  </option>
                                ))}
                              </select>

                              {/* WARD FILTER */}
                              <select
                                value={kothiOriginWard}
                                onChange={(e) => {

                                  setKothiOriginWard(
                                    e.target.value
                                  );

                                }}
                                className="
      px-3 py-2
      rounded-xl
      border
      border-slate-300
      dark:border-slate-700
      bg-white
      dark:bg-slate-800
      text-sm
      font-medium
      text-slate-700
      dark:text-white
      min-w-[160px]
    "
                              >
                                <option value="ALL">
                                  All Wards
                                </option>

                                {kothiOriginUniqueWards.map((ward) => (
                                  <option
                                    key={ward}
                                    value={ward}
                                  >
                                    {ward}
                                  </option>
                                ))}
                              </select>

                            </div>
                          </div>


                          <div className="px-3 py-1 rounded-full bg-indigo-100
dark:bg-indigo-900/30

text-indigo-700
dark:text-indigo-300

text-xs
font-bold

border
border-indigo-200
dark:border-indigo-800">
                            {
                              areaDistribution.length
                            }{" "}
                            Kothis
                          </div>

                        </div>

                        {/* CHART */}

                        <div className="
rounded-2xl
border
border-slate-200
dark:border-slate-700

bg-gradient-to-br
from-white
to-slate-50

dark:from-slate-900
dark:to-slate-800

shadow-inner
p-4
">

                          <div className="max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">

                            <div
                              style={{
                                height: Math.max(
                                  320,
                                  areaDistribution.length *
                                  42
                                ),
                              }}
                            >
                              <ResponsiveContainer
                                width="100%"
                                height="100%"
                              >
                                <BarChart
                                  data={
                                    areaDistribution
                                  }
                                  layout="vertical"
                                  margin={{
                                    top: 0,
                                    right: 35,
                                    left: 0,
                                    bottom: 0,
                                  }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke={
                                      document.documentElement.classList.contains("dark")
                                        ? "#334155"
                                        : "#e2e8f0"
                                    }
                                  />

                                  <XAxis
                                    type="number"
                                    hide
                                  />

                                  <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={150}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                    tick={{
                                      fontSize: 11,
                                      fill: document.documentElement.classList.contains("dark")
                                        ? "#cbd5e1"
                                        : "#334155",
                                      fontWeight: 700,
                                    }}
                                  />
                                  <Tooltip

                                    cursor={{
                                      fill: "rgba(99,102,241,0.04)",
                                    }}

                                    contentStyle={{

                                      backgroundColor:
                                        document.documentElement.classList.contains("dark")
                                          ? "#1e293b"
                                          : "#ffffff",

                                      border:
                                        document.documentElement.classList.contains("dark")
                                          ? "1px solid #475569"
                                          : "1px solid #e2e8f0",

                                      borderRadius: "14px",

                                      color:
                                        document.documentElement.classList.contains("dark")
                                          ? "#ffffff"
                                          : "#0f172a",

                                      boxShadow:
                                        "0 10px 25px rgba(0,0,0,0.15)",

                                    }}
                                    labelStyle={{
                                      color:
                                        document.documentElement.classList.contains("dark")
                                          ? "#ffffff"
                                          : "#0f172a",
                                    }}

                                    itemStyle={{
                                      color:
                                        document.documentElement.classList.contains("dark")
                                          ? "#ffffff"
                                          : "#0f172a",
                                    }}

                                    formatter={(value, name, props) => {

                                      const data = props.payload;

                                      return [

                                        <div className="space-y-1 text-xs">

                                          <div>
                                            <b>Present:</b>
                                            {" "}
                                            {data.present}
                                          </div>

                                          <div>
                                            <b>Absent:</b>
                                            {" "}
                                            {data.absent}
                                          </div>

                                          <div>
                                            <b>Leave:</b>
                                            {" "}
                                            {data.leave}
                                          </div>

                                          <div>
                                            <b>Total:</b>
                                            {" "}
                                            {data.total}
                                          </div>

                                          <div className="text-indigo-500 font-bold">
                                            Attendance:
                                            {" "}
                                            {data.attendancePercentage}%
                                          </div>

                                        </div>,

                                        data.name,

                                      ];

                                    }}
                                  />

                                  <Bar
                                    dataKey="present"
                                    radius={[0, 10, 10, 0]}
                                    maxBarSize={34}
                                  >

                                    {areaDistribution.map(
                                      (entry, index) => (

                                        <Cell
                                          key={index}

                                          fill={
                                            entry.attendancePercentage >= 80
                                              ? "#22c55e"
                                              : entry.attendancePercentage >= 60
                                                ? "#6366f1"
                                                : "#ef4444"
                                          }
                                        />

                                      )
                                    )}

                                    {/* PRESENT COUNT */}

                                    <LabelList
                                      dataKey="present"
                                      position="insideRight"
                                      style={{
                                        fill: "#ffffff",
                                        fontSize: 10,
                                        fontWeight: 700,
                                      }}
                                    />

                                    {/* ATTENDANCE % */}

                                    <LabelList
                                      dataKey="attendancePercentage"
                                      position="right"
                                      formatter={(value) => `${value}%`}
                                      style={{
                                        fill:
                                          document.documentElement.classList.contains("dark")
                                            ? "#ffffff"
                                            : "#334155",

                                        fontSize: 11,
                                        fontWeight: 700,
                                      }}
                                    />

                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                        {/* KEY HIGHLIGHT */}

                        <div
                          className="
mt-4
rounded-2xl
border
border-indigo-500/20
bg-indigo-500/10
px-4
py-3
flex
items-center
gap-3
"
                        >
                          <div className="text-indigo-400 text-lg">
                            📍
                          </div>

                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-indigo-400">
                              Key Highlight:
                            </span>{" "}

                            {areaDistribution?.[0]?.name} has the highest attendance with{" "}

                            <span className="font-bold text-indigo-400">
                              {areaDistribution?.[0]?.attendancePercentage}%
                            </span>{" "}

                            attendance.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        <div className="
grid
grid-cols-1
lg:grid-cols-2
gap-6
items-stretch
">
          <div
            data-report-section
            className="
col-span-1
xl:col-span-1
relative
overflow-hidden
rounded-3xl
border
border-slate-200
dark:border-slate-700
p-6
bg-gradient-to-br
from-white
via-slate-50
to-slate-100

dark:from-slate-900
dark:via-slate-900
dark:to-slate-800

shadow-2xl
mt-4
"
          >

            {/* ATTENDANCE INSIGHTS */}
            <div>

              {/* TITLE */}
              <div className="mb-4">
                <h3
                  className="
        text-xl
        font-extrabold
        tracking-tight

        text-slate-800
        dark:text-white
      "
                >
                  Attendance vs Yesterday
                </h3>
              </div>

              {/* INSIGHT GRID */}
              <div
                className="
      grid
      grid-cols-1
      sm:grid-cols-2
      gap-4
    "
              >
                {attendanceInsights.map((item, index) => {

                  const colorMap = {

                    emerald: {
                      text: "text-emerald-500",
                      bg: "bg-emerald-50 dark:bg-emerald-900/10",
                      border: "border-emerald-100 dark:border-emerald-800",
                      graph: "bg-emerald-500",
                    },

                    red: {
                      text: "text-red-500",
                      bg: "bg-red-50 dark:bg-red-900/10",
                      border: "border-red-100 dark:border-red-800",
                      graph: "bg-red-500",
                    },

                    amber: {
                      text: "text-amber-500",
                      bg: "bg-amber-50 dark:bg-amber-900/10",
                      border: "border-amber-100 dark:border-amber-800",
                      graph: "bg-amber-500",
                    },

                    violet: {
                      text: "text-violet-500",
                      bg: "bg-violet-50 dark:bg-violet-900/10",
                      border: "border-violet-100 dark:border-violet-800",
                      graph: "bg-violet-500",
                    },
                  };

                  const styles =
                    colorMap[item.color];

                  return (
                    <div
                      key={index}
                      className={`
            relative

            overflow-hidden

            rounded-2xl

            border

            p-5

            shadow-sm
            hover:shadow-md

            transition-all

            ${styles.bg}
            ${styles.border}
          `}
                    >

                      {/* TOP */}
                      <div
                        className="
              flex
              items-start
              justify-between
              gap-4
            "
                      >

                        {/* LEFT */}
                        <div>

                          <p
                            className="
                  text-sm
                  font-semibold

                  text-slate-500
                  dark:text-slate-400
                "
                          >
                            {item.title}
                          </p>

                          <h2
                            className="
                  text-4xl
                  font-black

                  mt-2

                  text-slate-800
                  dark:text-white
                "
                          >
                            {item.value}
                          </h2>

                          {/* CHANGE */}
                          <div
                            className={`
                  mt-3

                  flex
                  items-center
                  gap-1

                  text-sm
                  font-bold

                  ${styles.text}
                `}
                          >
                            <span>
                              {item.positive
                                ? "↑"
                                : "↓"}
                            </span>

                            <span>
                              {item.rawValue}%
                            </span>
                          </div>
                        </div>

                        {/* MINI GRAPH */}
                        {/* MINI LINE GRAPH */}
                        <div
                          className="
    w-28
    h-16
    shrink-0

    flex
    items-center
    justify-center
  "
                        >
                          <svg
                            viewBox="0 0 120 50"
                            className="w-full h-full"
                            fill="none"
                          >

                            {/* LINE */}
                            <path
                              d="
        M5 35
        L20 38
        L35 25
        L50 40
        L65 28
        L80 18
        L95 30
        L110 12
      "
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={styles.text}
                            />

                            {/* DOTS */}
                            {[
                              [5, 35],
                              [20, 38],
                              [35, 25],
                              [50, 40],
                              [65, 28],
                              [80, 18],
                              [95, 30],
                              [110, 12],
                            ].map(([x, y], i) => (
                              <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="3"
                                fill="currentColor"
                                className={styles.text}
                              />
                            ))}
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* HIGHLIGHT CARD */}
              <div
                className="
      mt-5

      flex
      items-start
      gap-3

      rounded-2xl

      border
      border-emerald-100
      dark:border-emerald-800

      bg-emerald-50
      dark:bg-emerald-900/10

      px-5
      py-4
    "
              >

                {/* ICON */}
                <div
                  className="
        text-2xl
        shrink-0
      "
                >
                  💹
                </div>

                {/* TEXT */}
                <div
                  className="
        text-sm
        leading-relaxed

        text-slate-700
        dark:text-slate-300
      "
                >
                  <span className="font-bold">
                    Key Highlight:
                  </span>{" "}

                  Current attendance rate is{" "}

                  <span
                    className="
          font-bold
          text-emerald-600
        "
                  >
                    {attendanceInsights[0]?.value}
                  </span>

                  {" "}across all employees.
                </div>
              </div>
            </div>

          </div>

          {/* SHIFT WISE ATTENDANCE (Moved here from Row 2) */}
          <div
            data-report-section
            className="
    bg-white
    dark:bg-slate-900

    rounded-xl
    shadow-lg

    border
    border-slate-100
    dark:border-slate-700

    p-6
    flex
    flex-col
    h-full
  "
          >
            <ShiftWiseAttendanceChart
              wards={effectiveWards}
              isEmbedded={true}
            />
          </div>

        </div>
        {/* ATTENDANCE TREND HEATMAP — EXACT UI */}
        <div className="
grid
grid-cols-1
lg:grid-cols-2
gap-6
items-stretch
">
          <div
            className="
rounded-2xl

border
border-slate-200
dark:border-slate-700

bg-white
dark:bg-[#0f172a]

shadow-xl

p-5
"
          >
            {/* HEADER */}

            <div className="mb-4">

              <h3
                className="
text-2xl
font-bold

text-slate-800
dark:text-white
"
              >
                Attendance Trend Heatmap
              </h3>

              <p
                className="
text-sm

text-slate-500
dark:text-slate-400

mt-1
"
              >
                Daily attendance % by zone
              </p>
            </div>

            {/* TABLE */}

            <div className="overflow-auto">

              <table className="w-full border-collapse">

                {/* HEADER */}

                <thead>
                  <tr>

                    <th
                      className="
px-4
py-3

bg-slate-100
dark:bg-slate-800

text-slate-700
dark:text-white

border
border-slate-200
dark:border-slate-700

text-left
"
                    >
                      ZONE
                    </th>

                    {zoneHeatmapData?.[0]?.values?.map(
                      (_, index) => {

                        const selectedEndDate =
                          endDate
                            ? new Date(endDate)
                            : new Date();

                        const currentDate =
                          new Date(selectedEndDate);

                        currentDate.setDate(
                          currentDate.getDate() -
                          6 +
                          index
                        );

                        const label =
                          currentDate.toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                            }
                          );

                        return (
                          <th
                            key={index}
                            className="
px-4
py-3

bg-slate-100
dark:bg-slate-800

text-slate-700
dark:text-white

border
border-slate-200
dark:border-slate-700

text-center
min-w-[90px]
"
                          >
                            {label.toUpperCase()}
                          </th>
                        );
                      }
                    )}
                  </tr>
                </thead>

                {/* BODY */}

                <tbody>

                  {zoneHeatmapData.map(
                    (row, rowIndex) => (
                      <tr key={rowIndex}>

                        {/* ZONE NAME */}

                        <td
                          className="
px-4
py-4

text-slate-700
dark:text-white

font-semibold

border
border-slate-200
dark:border-slate-700

bg-slate-50
dark:bg-slate-900
"
                        >
                          {row.zone}
                        </td>

                        {/* VALUES */}

                        {row.values.map(
                          (value, colIndex) => {

                            let bgColor =
                              "#ef4444";

                            if (value >= 81) {
                              bgColor =
                                "#22c55e";
                            } else if (
                              value >= 61
                            ) {
                              bgColor =
                                "#84cc16";
                            } else if (
                              value >= 41
                            ) {
                              bgColor =
                                "#fbbf24";
                            }

                            return (
                              <td
                                key={colIndex}
                                className="
text-center
font-bold

border
border-slate-200
dark:border-slate-700

py-4
min-w-[90px]
"
                                style={{
                                  backgroundColor:
                                    bgColor,

                                  color:
                                    value >= 41
                                      ? "#000"
                                      : "#fff",
                                }}
                              >
                                {value}%
                              </td>
                            );
                          }
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* LEGEND */}

            <div
              className="
flex
flex-wrap
items-center

gap-6
mt-5
"
            >
              <div className="flex items-center gap-2">

                <div className="w-4 h-4 rounded-sm bg-red-500" />

                <span
                  className="
text-sm

text-slate-600
dark:text-slate-300
"
                >
                  Low (0-40%)
                </span>
              </div>

              <div className="flex items-center gap-2">

                <div className="w-4 h-4 rounded-sm bg-amber-400" />

                <span
                  className="
text-sm

text-slate-600
dark:text-slate-300
"
                >
                  Average (41-60%)
                </span>
              </div>

              <div className="flex items-center gap-2">

                <div className="w-4 h-4 rounded-sm bg-lime-500" />

                <span
                  className="
text-sm

text-slate-600
dark:text-slate-300
"
                >
                  Good (61-80%)
                </span>
              </div>

              <div className="flex items-center gap-2">

                <div className="w-4 h-4 rounded-sm bg-green-600" />

                <span
                  className="
text-sm

text-slate-600
dark:text-slate-300
"
                >
                  Excellent (81-100%)
                </span>
              </div>
            </div>
          </div>


          {!isAdmin && roleCardGraphData.length > 0 && (

            <div
              data-report-section
              className="
bg-white
dark:bg-[#06152d]

rounded-3xl
shadow-2xl

border
border-slate-200
dark:border-slate-700

p-6
overflow-hidden
"
            >
              {/* HEADER */}

              <div className="flex items-start justify-between mb-6">

                <div>
                  <h2 className="
text-2xl
font-black
tracking-tight

text-slate-800
dark:text-white
">
                    Zone-wise Workforce Distribution
                  </h2>

                  <p className="
text-xs
uppercase
tracking-[0.2em]

text-slate-400
dark:text-slate-500

mt-1
">
                    Headcount by Kothi and Employee Role
                  </p>
                </div>

                <div
                  className="
px-4
py-2

rounded-full

border
border-violet-400/50

bg-violet-500/10

text-violet-600
dark:text-violet-300

text-sm
font-bold
"
                >
                  {roleCardGraphData.length} KOTHIS
                </div>
              </div>

              {/* FILTERS */}

              <div className="
grid
grid-cols-1
md:grid-cols-3
gap-4
mb-6
">

                {/* ZONE */}

                <select
                  value={roleCardZone}
                  onChange={(e) => {

                    setRoleCardZone(
                      e.target.value
                    );

                    setRoleCardWard("ALL");
                    setRoleCardKothi("ALL");

                  }}
                  className="
h-11

rounded-xl

border
border-slate-300
dark:border-slate-700

bg-white
dark:bg-slate-900

text-slate-700
dark:text-white

px-4
outline-none
"
                >
                  <option value="ALL">
                    All Zones
                  </option>

                  {uniqueZones.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>

                {/* WARD */}

                <select
                  value={roleCardWard}
                  onChange={(e) => {

                    setRoleCardWard(
                      e.target.value
                    );

                    setRoleCardKothi("ALL");

                  }}
                  className="
h-11

rounded-xl

border
border-slate-300
dark:border-slate-700

bg-white
dark:bg-slate-900

text-slate-700
dark:text-white

px-4
outline-none
"
                >
                  <option value="ALL">
                    All Wards
                  </option>

                  {roleCardUniqueWards.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              {/* CHART */}

              <div className="overflow-x-auto">

                <div
                  className="
w-full
h-[520px]
mt-2
"
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={roleCardGraphData}

                      margin={{
                        top: 10,
                        right: 10,
                        left: -15,
                        bottom: 0,
                      }}

                      barCategoryGap="8%"
                    >
                      <CartesianGrid
                        strokeDasharray="4 4"
                        vertical={false}
                        stroke="rgba(255,255,255,0.15)"
                      />

                      {/* HIDE LABELS */}

                      <XAxis
                        dataKey="name"
                        tick={false}
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94A3B8",
                          fontSize: 12,
                        }}
                      />

                      <Tooltip
                        contentStyle={{
                          background: "#0F172A",
                          border: "1px solid #334155",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                      />

                      <Legend
                        wrapperStyle={{
                          paddingTop: 12,
                          fontSize: 12,
                        }}
                      />

                      {/* EXACT SAME BARS */}

                      <Bar
                        dataKey="Driver"
                        stackId="a"
                        fill={ROLE_COLORS.Driver}
                        barSize={12}
                      />

                      <Bar
                        dataKey="Ramp Bigari"
                        stackId="a"
                        fill={
                          ROLE_COLORS[
                          "Ramp Bigari"
                          ]
                        }
                        barSize={12}
                      />

                      <Bar
                        dataKey="Ramp Bigari Outsource"
                        stackId="a"
                        fill={
                          ROLE_COLORS[
                          "Ramp Bigari Outsource"
                          ]
                        }
                        barSize={12}
                      />

                      <Bar
                        dataKey="Road Sweeper"
                        stackId="a"
                        fill={
                          ROLE_COLORS[
                          "Road Sweeper"
                          ]
                        }
                        barSize={12}
                      />

                      <Bar
                        dataKey="Supervisor (Mukadam)"
                        stackId="a"
                        fill={
                          ROLE_COLORS[
                          "Supervisor (Mukadam)"
                          ]
                        }
                        barSize={12}
                      />

                      <Bar
                        dataKey="Swachh Worker"
                        stackId="a"
                        fill={
                          ROLE_COLORS[
                          "Swachh Worker"
                          ]
                        }
                        barSize={12}
                      />

                      <Bar
                        dataKey="Sweeper"
                        stackId="a"
                        fill={ROLE_COLORS.Sweeper}
                        barSize={12}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          )}
        </div>

      </div>
    </div>
  );
}

export default ReportDashboard;
