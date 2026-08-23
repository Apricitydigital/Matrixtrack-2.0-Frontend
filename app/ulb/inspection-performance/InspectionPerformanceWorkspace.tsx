'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  FileText,
  Image as ImageIcon,
  Inbox,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Send,
  User,
  X,
  XCircle,
  ZoomIn,
  Sparkles,
} from 'lucide-react';

import {
  GeoApi,
  ModuleRecordsApi,
  ToiletApi,
  apiFetch,
} from '@lib/apiClient';

type ModuleKey = 'TOILET' | 'LITTERBINS' | 'SWEEPING';
type ModuleFilter = 'ALL' | ModuleKey;
type StatusKey =
  | 'TOTAL'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTION_REQUIRED'
  | 'ACTION_TAKEN';
type DatePreset = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL' | 'CUSTOM';
type SortField = 'DATE' | 'POINT' | 'USER';
type SortDirection = 'asc' | 'desc';

type DashboardRecord = any & {
  dashboardModule: ModuleKey;
  dashboardModuleLabel: string;
};

type AnswerRow = {
  question: string;
  answer: string;
  photos: string[];
  section?: string;
};

const PAGE_SIZE = 20;
const LOAD_MORE_SIZE = 20;

const MODULES: Array<{
  key: ModuleKey;
  label: string;
  shortLabel: string;
}> = [
    { key: 'TOILET', label: 'Cleanliness of Toilets', shortLabel: 'Toilet' },
    { key: 'LITTERBINS', label: 'Litter Bins', shortLabel: 'Litter Bin' },
    { key: 'SWEEPING', label: 'Sweeping', shortLabel: 'Sweeping' },
  ];

const DATE_PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: 'TODAY', label: 'Today' },
  { key: 'YESTERDAY', label: 'Yesterday' },
  { key: 'WEEK', label: 'This Week' },
  { key: 'MONTH', label: 'This Month' },
  { key: 'ALL', label: 'All' },
  { key: 'CUSTOM', label: 'Custom' },
];

const STATUS_ORDER: StatusKey[] = [
  'TOTAL',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'ACTION_REQUIRED',
  'ACTION_TAKEN',
];

const STATUS_CONFIG: Record<
  StatusKey,
  {
    label: string;
    shortLabel: string;
    text: string;
    bg: string;
    border: string;
    icon: any;
  }
> = {
  TOTAL: {
    label: 'Total Reports',
    shortLabel: 'Total',
    text: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    icon: FileText,
  },
  PENDING: {
    label: 'Pending Reports',
    shortLabel: 'Pending',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    icon: Clock3,
  },
  APPROVED: {
    label: 'Approved Reports',
    shortLabel: 'Approved',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Rejected Reports',
    shortLabel: 'Rejected',
    text: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-500',
    icon: XCircle,
  },
  ACTION_REQUIRED: {
    label: 'Action Required Reports',
    shortLabel: 'Action Req.',
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-500',
    icon: AlertTriangle,
  },
  ACTION_TAKEN: {
    label: 'Action Taken Reports',
    shortLabel: 'Action Taken',
    text: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-500',
    icon: CheckCircle2,
  },
};

function toLocalISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayString() {
  return toLocalISO(new Date());
}

function dateRangeForPreset(
  preset: DatePreset,
  customStart: string,
  customEnd: string
) {
  const today = new Date();

  if (preset === 'TODAY') {
    const value = toLocalISO(today);
    return { start: value, end: value };
  }

  if (preset === 'YESTERDAY') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const value = toLocalISO(yesterday);
    return { start: value, end: value };
  }

  if (preset === 'WEEK') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { start: toLocalISO(start), end: toLocalISO(today) };
  }

  if (preset === 'MONTH') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: toLocalISO(start), end: toLocalISO(today) };
  }

  if (preset === 'CUSTOM') {
    return {
      start: customStart || '2000-01-01',
      end: customEnd || toLocalISO(today),
    };
  }

  return { start: '2000-01-01', end: toLocalISO(today) };
}

function normalizedStatus(item: any): Exclude<StatusKey, 'TOTAL'> | string {
  const workspaceStatus = String(item?.workspaceStatus || '').toUpperCase();
  const actionStatus = String(item?.actionStatus || '').toUpperCase();
  const rawStatus = String(item?.status || '').toUpperCase();

  if (workspaceStatus === 'ACTION_TAKEN') return 'ACTION_TAKEN';
  if (workspaceStatus === 'ACTION_REQUIRED') return 'ACTION_REQUIRED';
  if (workspaceStatus === 'APPROVED') return 'APPROVED';
  if (workspaceStatus === 'REJECTED') return 'REJECTED';
  if (['SUBMITTED', 'PENDING', 'PENDING_QC'].includes(workspaceStatus)) return 'PENDING';

  if (actionStatus === 'ACTION_TAKEN') return 'ACTION_TAKEN';
  if (actionStatus === 'ACTION_REQUIRED') return 'ACTION_REQUIRED';

  if (
    item?.actionOfficerRespondedAt ||
    item?.actionTakenBy ||
    item?.actionTakenById ||
    rawStatus === 'ACTION_TAKEN'
  ) {
    return 'ACTION_TAKEN';
  }

  if (rawStatus === 'ACTION_REQUIRED') return 'ACTION_REQUIRED';
  if (rawStatus === 'APPROVED') return 'APPROVED';
  if (rawStatus === 'REJECTED') return 'REJECTED';
  if (['SUBMITTED', 'PENDING', 'PENDING_QC'].includes(rawStatus)) return 'PENDING';

  return rawStatus || 'PENDING';
}

function moduleLabel(moduleKey: ModuleKey) {
  return MODULES.find((module) => module.key === moduleKey)?.label || moduleKey;
}

function moduleShortLabel(moduleKey: ModuleKey) {
  return MODULES.find((module) => module.key === moduleKey)?.shortLabel || moduleKey;
}

function reportTitle(item: any, moduleKey: ModuleKey) {
  if (moduleKey === 'TOILET') {
    return item?.toilet?.name || item?.toiletName || item?.name || 'Toilet Inspection';
  }

  if (moduleKey === 'SWEEPING') {
    return (
      item?.payload?.pointName ||
      item?.pointName ||
      item?.beatName ||
      item?.beat?.beatName ||
      item?.areaName ||
      'Sweeping Report'
    );
  }

  return (
    item?.locationName ||
    item?.bin?.locationName ||
    item?.areaName ||
    item?.bin?.areaName ||
    'Litter Bin Report'
  );
}

function rawZoneName(item: any) {
  return item?.zoneName || item?.zone?.name || item?.bin?.zoneName || item?.toilet?.zoneName || item?.beat?.zoneName || '';
}

function rawWardName(item: any) {
  return item?.wardName || item?.ward?.name || item?.bin?.wardName || item?.toilet?.wardName || item?.beat?.wardName || '';
}

function reportArea(item: any) {
  return (
    item?.areaName ||
    item?.toilet?.address ||
    item?.address ||
    item?.locationName ||
    item?.bin?.areaName ||
    item?.bin?.locationName ||
    'Assigned location'
  );
}

function submittedByName(item: any) {
  return (
    item?.submittedBy?.name ||
    item?.submittedByName ||
    item?.createdBy?.name ||
    item?.createdBy ||
    item?.supervisor?.name ||
    item?.employee?.name ||
    '—'
  );
}

function reportTimestamp(item: any) {
  const raw =
    item?.createdAt ||
    item?.submittedAt ||
    item?.visitedAt ||
    item?.reviewedAt ||
    item?.updatedAt ||
    null;

  if (!raw) return 0;
  const value = new Date(raw).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function formatShortDate(item: any) {
  const time = reportTimestamp(item);
  if (!time) return '—';

  return new Date(time).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFullDate(value: any) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN');
}

function isWithinRange(item: any, start: string, end: string) {
  if (start === '2000-01-01') return true;

  const time = reportTimestamp(item);
  if (!time) return false;

  const localDate = toLocalISO(new Date(time));
  return localDate >= start && localDate <= end;
}

function isRenderableImage(value: any) {
  const uri = String(value || '');
  return (
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('data:image/') ||
    uri.startsWith('file://') ||
    uri.startsWith('/uploads/') ||
    uri.startsWith('/media/')
  );
}

function normalizeImages(values: any[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter(Boolean)
        .map(String)
        .filter(isRenderableImage)
    )
  );
}

function displayAnswer(value: any) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);

  try {
    const text = JSON.stringify(value);
    return text.length > 500 ? `${text.slice(0, 497)}...` : text;
  } catch {
    return String(value);
  }
}

function extractAnswers(item: any): AnswerRow[] {
  let source =
    item?.answers ||
    item?.inspectionAnswers ||
    item?.questionnaire ||
    item?.payload?.surveyAnswers ||
    item?.payload?.answers ||
    item?.payload?.responses ||
    null;

  if (
    !source &&
    item?.payload &&
    typeof item.payload === 'object' &&
    !Array.isArray(item.payload)
  ) {
    const surveyEntries = Object.entries(item.payload).filter(([key]) => /^Q\d+$/i.test(key));
    if (surveyEntries.length) source = Object.fromEntries(surveyEntries);
  }

  if (!source) return [];

  const toRow = (fallbackQuestion: string, raw: any): AnswerRow => {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const answer =
        raw.answer ??
        raw.value ??
        raw.response ??
        raw.selectedOption ??
        raw.selected ??
        raw.text ??
        raw.remarks;

      const question =
        raw.question ||
        raw.questionText ||
        raw.label ||
        raw.code ||
        fallbackQuestion;

      const photos = normalizeImages([
        raw.photos,
        raw.photoUrls,
        raw.images,
        raw.imageUrls,
        raw.photo,
        raw.photoUrl,
        raw.image,
        raw.imageUrl,
      ]);

      return {
        question: String(question),
        answer: displayAnswer(answer ?? raw),
        photos,
        section: raw.section || raw.category || raw.group || undefined,
      };
    }

    return {
      question: fallbackQuestion,
      answer: displayAnswer(raw),
      photos: [],
    };
  };

  if (Array.isArray(source)) {
    return source.map((raw: any, index: number) => {
      const fallback =
        raw?.question ||
        raw?.questionText ||
        raw?.label ||
        raw?.code ||
        `Question ${index + 1}`;
      return toRow(String(fallback), raw);
    });
  }

  if (typeof source === 'object') {
    return Object.entries(source).map(([key, value]) => toRow(key, value));
  }

  return [{ question: 'Response', answer: displayAnswer(source), photos: [] }];
}

function getSweepingSubmittedPoints(
  item: any
) {
  const points =
    Array.isArray(
      item?.payload?.points
    )
      ? item.payload.points
      : [];

  return [...points].sort(
    (a: any, b: any) =>
      Number(
        a?.pointIndex ?? 999
      ) -
      Number(
        b?.pointIndex ?? 999
      )
  );
}

function getSweepingSummary(
  item: any
) {
  const points =
    getSweepingSubmittedPoints(
      item
    );

  const submitted =
    Number(
      item?.payload
        ?.submittedPointCount
    );

  const total =
    Number(
      item?.payload
        ?.totalPointCount
    );

  return {
    points,

    submitted:
      Number.isFinite(submitted)
        ? submitted
        : points.length,

    total:
      Number.isFinite(total) &&
        total > 0
        ? total
        : Array.isArray(
          item?.beatPoints
        )
          ? item.beatPoints.length
          : 5,
  };
}

function collectTopLevelImages(item: any) {
  return normalizeImages([
    item?.photos,
    item?.photoUrls,
    item?.images,
    item?.imageUrls,
    item?.photo,
    item?.photoUrl,
    item?.image,
    item?.imageUrl,
    item?.actionPhoto,
    item?.actionPhotoUrl,
    item?.payload?.photos,
    item?.payload?.photoUrls,
    item?.payload?.aoPhoto,
  ]);
}

function totalImageCount(
  item: any
) {
  if (
    item?.dashboardModule ===
    'SWEEPING'
  ) {
    const pointImages =
      getSweepingSubmittedPoints(
        item
      ).flatMap(
        (point: any) =>
          normalizeImages([
            point?.photo,
            point?.photoUrl,
            point?.image,
            point?.imageUrl,
          ])
      );

    return new Set(
      pointImages
    ).size;
  }

  const answerImages =
    extractAnswers(item).flatMap(
      (answer) =>
        answer.photos
    );

  return new Set([
    ...answerImages,
    ...collectTopLevelImages(
      item
    ),
  ]).size;
}

function getQcRemark(
  item: any
) {
  return (
    item?.qcRemark ||
    item?.qcComment ||
    item?.qcRemarks ||
    item?.payload?.qcRemark ||
    item?.payload?.qcRemarks ||
    null
  );
}

function parseAiObject(value: any) {
  if (!value) return null;

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      return parsed && typeof parsed === 'object'
        ? parsed
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

function getAutoQcResult(item: any) {
  return parseAiObject(
    item?.autoQcResult ??
    item?.payload?.autoQcResult
  );
}

function getActionAiResult(item: any) {
  return parseAiObject(
    item?.actionAiResult ??
    item?.payload?.actionAiResult
  );
}

function formatAiConfidence(value: any) {
  const confidence = Number(value);

  if (!Number.isFinite(confidence)) {
    return '—';
  }

  return `${Math.round(confidence * 100)}%`;
}

function getActionRequiredRemark(item: any, moduleKey: ModuleKey) {
  if (moduleKey === 'SWEEPING') return item?.payload?.ulbRemark || null;
  if (moduleKey === 'LITTERBINS' && item?.type === 'VISIT_REPORT') {
    return item?.qcRemark || null;
  }
  return item?.ulbRemark || null;
}

function getActionTakenRemark(item: any, moduleKey: ModuleKey) {
  if (moduleKey === 'SWEEPING') return item?.payload?.aoRemark || null;
  if (moduleKey === 'LITTERBINS' && item?.type === 'VISIT_REPORT') {
    return item?.actionRemark || null;
  }
  if (moduleKey === 'LITTERBINS') return item?.actionOfficerRemark || null;
  return item?.actionNote || null;
}

function searchText(item: DashboardRecord) {
  return [
    reportTitle(item, item.dashboardModule),
    reportArea(item),
    item?.zoneName,
    item?.wardName,
    item?.bin?.zoneName,
    item?.bin?.wardName,
    submittedByName(item),
    item?.dashboardModuleLabel,
    moduleShortLabel(item.dashboardModule),
    getQcRemark(item),
    getActionRequiredRemark(item, item.dashboardModule),
    getActionTakenRemark(item, item.dashboardModule),
    normalizedStatus(item),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function statusClasses(status: string) {
  switch (status) {
    case 'APPROVED':
      return {
        text: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        top: 'bg-emerald-500',
        icon: CheckCircle2,
      };
    case 'REJECTED':
      return {
        text: 'text-rose-600',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        top: 'bg-rose-500',
        icon: XCircle,
      };
    case 'ACTION_REQUIRED':
      return {
        text: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        top: 'bg-orange-500',
        icon: AlertTriangle,
      };
    case 'ACTION_TAKEN':
      return {
        text: 'text-indigo-600',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        top: 'bg-indigo-500',
        icon: CheckCircle2,
      };
    default:
      return {
        text: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        top: 'bg-amber-500',
        icon: Clock3,
      };
  }
}

export default function InspectionPerformanceWorkspace() {
  const [records, setRecords] = useState<DashboardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeStatus, setActiveStatus] = useState<StatusKey>('TOTAL');
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('ALL');
  const [datePreset, setDatePreset] = useState<DatePreset>('MONTH');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [zones, setZones] = useState<any[]>([]);
  const [allWards, setAllWards] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortField, setSortField] = useState<SortField>('DATE');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selected, setSelected] = useState<DashboardRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionTarget, setActionTarget] = useState<DashboardRecord | null>(null);
  const [actionRemark, setActionRemark] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const suggestionBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dateRange = useMemo(
    () => dateRangeForPreset(datePreset, customStart, customEnd),
    [datePreset, customStart, customEnd]
  );

  async function loadRecords() {
    setLoading(true);
    setError('');

    try {
      const responses = await Promise.all(
        MODULES.map(async (module) => {
          const response = await ModuleRecordsApi.getRecords(module.key, {
            page: 1,
            limit: 500,
            tab: 'HISTORY',
          });

          return (response.data || []).map((record: any) => ({
            ...record,
            dashboardModule: module.key,
            dashboardModuleLabel: module.label,
          }));
        })
      );

      setRecords(responses.flat());
    } catch (err: any) {
      console.error('Inspection & Performance load failed', err);
      setError(err?.message || 'Unable to load inspection reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
    loadGeo();
  }, []);

  async function loadGeo() {
    try {
      const [zRes, wRes] = await Promise.allSettled([GeoApi.list('ZONE'), GeoApi.list('WARD')]);
      if (zRes.status === 'fulfilled') setZones(zRes.value?.nodes || []);
      if (wRes.status === 'fulfilled') setAllWards(wRes.value?.nodes || []);
    } catch (err) {
      console.error('Unable to load zone/ward metadata', err);
    }
  }

  const visibleWards = useMemo(
    () =>
      selectedZone
        ? allWards.filter((ward) => ward.parentId === selectedZone || ward.parent?.id === selectedZone)
        : allWards,
    [allWards, selectedZone]
  );

  function handleZoneChange(zoneId: string) {
    setSelectedZone(zoneId);
    if (selectedWard) {
      const wardObj = allWards.find((ward) => ward.id === selectedWard);
      const parentZoneId = wardObj?.parentId || wardObj?.parent?.id;
      if (zoneId && parentZoneId !== zoneId) setSelectedWard('');
    }
  }

  function handleWardChange(wardId: string) {
    setSelectedWard(wardId);
    if (wardId) {
      const wardObj = allWards.find((ward) => ward.id === wardId);
      const parentZoneId = wardObj?.parentId || wardObj?.parent?.id;
      if (parentZoneId) setSelectedZone(parentZoneId);
    }
  }

  function clearLocationFilters() {
    setSelectedZone('');
    setSelectedWard('');
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [
    activeStatus,
    moduleFilter,
    datePreset,
    customStart,
    customEnd,
    selectedZone,
    selectedWard,
    debouncedSearch,
    sortField,
    sortDirection,
  ]);

  const rangeRecords = useMemo(
    () => records.filter((item) => isWithinRange(item, dateRange.start, dateRange.end)),
    [records, dateRange]
  );

  const locationRecords = useMemo(() => {
    if (!selectedZone && !selectedWard) return rangeRecords;

    const zoneName = (zones.find((zone) => zone.id === selectedZone)?.name || '').toLowerCase();
    const wardName = (allWards.find((ward) => ward.id === selectedWard)?.name || '').toLowerCase();

    return rangeRecords.filter((item) => {
      if (zoneName && !rawZoneName(item).toLowerCase().includes(zoneName)) return false;
      if (wardName && !rawWardName(item).toLowerCase().includes(wardName)) return false;
      return true;
    });
  }, [rangeRecords, selectedZone, selectedWard, zones, allWards]);

  const moduleRecords = useMemo(
    () =>
      moduleFilter === 'ALL'
        ? locationRecords
        : locationRecords.filter((item) => item.dashboardModule === moduleFilter),
    [locationRecords, moduleFilter]
  );

  const searchableRecords = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return moduleRecords;
    return moduleRecords.filter((item) => searchText(item).includes(query));
  }, [moduleRecords, debouncedSearch]);

  const counts = useMemo(() => {
    const next: Record<StatusKey, number> = {
      TOTAL: searchableRecords.length,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      ACTION_REQUIRED: 0,
      ACTION_TAKEN: 0,
    };

    searchableRecords.forEach((item) => {
      const status = normalizedStatus(item);
      if (status in next && status !== 'TOTAL') {
        next[status as Exclude<StatusKey, 'TOTAL'>] += 1;
      }
    });

    return next;
  }, [searchableRecords]);

  const filteredRecords = useMemo(() => {
    const list = searchableRecords.filter((item) => {
      if (activeStatus === 'TOTAL') return true;
      return normalizedStatus(item) === activeStatus;
    });

    list.sort((a, b) => {
      let compare = 0;

      if (sortField === 'DATE') {
        compare = reportTimestamp(a) - reportTimestamp(b);
      } else if (sortField === 'POINT') {
        compare = reportTitle(a, a.dashboardModule).localeCompare(
          reportTitle(b, b.dashboardModule)
        );
      } else {
        compare = submittedByName(a).localeCompare(submittedByName(b));
      }

      return sortDirection === 'desc' ? -compare : compare;
    });

    return list;
  }, [searchableRecords, activeStatus, sortField, sortDirection]);

  const displayedRecords = useMemo(
    () => filteredRecords.slice(0, visibleCount),
    [filteredRecords, visibleCount]
  );

  const moduleSplit = useMemo(() => {
    const base = locationRecords;
    return {
      TOILET: base.filter((item) => item.dashboardModule === 'TOILET').length,
      LITTERBINS: base.filter((item) => item.dashboardModule === 'LITTERBINS').length,
      SWEEPING: base.filter((item) => item.dashboardModule === 'SWEEPING').length,
    };
  }, [locationRecords]);

  const suggestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];

    const values = new Map<string, { label: string; type: string }>();

    records.forEach((item) => {
      const candidates = [
        { label: reportTitle(item, item.dashboardModule), type: 'Report' },
        { label: submittedByName(item), type: 'User' },
        { label: reportArea(item), type: 'Location' },
        { label: item?.zoneName || item?.bin?.zoneName, type: 'Zone' },
        { label: item?.wardName || item?.bin?.wardName, type: 'Ward' },
      ];

      candidates.forEach((candidate) => {
        const label = String(candidate.label || '').trim();
        if (!label || label === '—' || !label.toLowerCase().includes(query)) return;
        const key = `${candidate.type}:${label}`;
        if (!values.has(key)) values.set(key, { label, type: candidate.type });
      });
    });

    return Array.from(values.values()).slice(0, 8);
  }, [search, records]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('desc');
  }

  async function openDetail(
    item: DashboardRecord
  ) {
    setSelected(item);
    setDetailLoading(true);
    setError('');

    try {
      /*
       * =====================================================
       * TOILET
       * Keep existing Toilet detail hydration unchanged.
       * =====================================================
       */
      if (
        item.dashboardModule ===
        'TOILET'
      ) {
        /*
         * First hydrate the complete inspection.
         */
        const detailResponse =
          await ToiletApi.getInspectionDetails(
            item.id
          );

        const detailedInspection =
          detailResponse?.inspection || {};

        /*
         * Then generate / retrieve ULB Action AI.
         *
         * Existing results are returned without
         * another OpenAI request.
         */
        const aiResponse =
          await apiFetch<{
            inspection?: any;
            actionAiResult?: any;
            generated?: boolean;
          }>(
            `/modules/toilet/inspections/${item.id}/action-ai`,
            {
              method: 'POST',
            }
          );

        const hydratedReport: DashboardRecord = {
          ...item,
          ...detailedInspection,
          ...(aiResponse?.inspection || {}),

          actionAiResult:
            aiResponse?.actionAiResult ??
            aiResponse?.inspection
              ?.actionAiResult ??
            detailedInspection
              ?.actionAiResult ??
            item.actionAiResult,

          actionAiAt:
            aiResponse?.inspection
              ?.actionAiAt ??
            detailedInspection
              ?.actionAiAt ??
            item.actionAiAt,

          actionAiModel:
            aiResponse?.inspection
              ?.actionAiModel ??
            detailedInspection
              ?.actionAiModel ??
            item.actionAiModel,

          autoQcResult:
            aiResponse?.inspection
              ?.autoQcResult ??
            detailedInspection
              ?.autoQcResult ??
            item.autoQcResult,

          qcComment:
            aiResponse?.inspection
              ?.qcComment ??
            detailedInspection
              ?.qcComment ??
            item.qcComment,

          dashboardModule:
            item.dashboardModule,

          dashboardModuleLabel:
            item.dashboardModuleLabel,
        };

        /*
         * Update View popup.
         */
        setSelected(
          hydratedReport
        );

        /*
         * Update outside Toilet card immediately.
         */
        setRecords((current) =>
          current.map((record) =>
            record.id === item.id &&
              record.dashboardModule ===
              'TOILET'
              ? {
                ...record,
                ...hydratedReport,
              }
              : record
          )
        );

        return;
      }

      /*
 * =====================================================
 * SWEEPING
 *
 * One report = one Beat/day.
 *
 * Retrieves existing ULB AI or generates it once.
 * No questionnaire hydration is required.
 * =====================================================
 */
      if (
        item.dashboardModule ===
        'SWEEPING'
      ) {
        const response =
          await apiFetch<{
            record?: any;
            actionAiResult?: any;
            generated?: boolean;
          }>(
            `/modules/SWEEPING/records/${item.id}/action-ai`,
            {
              method: 'POST',
            }
          );

        const hydratedReport:
          DashboardRecord = {
          ...item,
          ...(response?.record || {}),

          actionAiResult:
            response?.actionAiResult ??
            response?.record
              ?.actionAiResult ??
            item.actionAiResult,

          actionAiAt:
            response?.record
              ?.actionAiAt ??
            item.actionAiAt,

          actionAiModel:
            response?.record
              ?.actionAiModel ??
            item.actionAiModel,

          /*
           * Preserve loaded Beat/P1-P5 data because
           * update response contains only the DB record.
           */
          payload:
            item.payload,

          beatPoints:
            item.beatPoints,

          beatName:
            item.beatName,

          zoneName:
            item.zoneName,

          wardName:
            item.wardName,

          areaName:
            item.areaName,

          autoQcResult:
            item.autoQcResult,

          dashboardModule:
            item.dashboardModule,

          dashboardModuleLabel:
            item.dashboardModuleLabel,
        };

        /*
         * Full View popup.
         */
        setSelected(
          hydratedReport
        );

        /*
         * Outside Beat card.
         */
        setRecords((current) =>
          current.map((record) =>
            record.id === item.id &&
              record.dashboardModule ===
              'SWEEPING'
              ? {
                ...record,
                ...hydratedReport,
              }
              : record
          )
        );

        return;
      }

      /*
       * =====================================================
       * LITTER BIN
       *
       * Normal daily Litter Bin report.
       *
       * - Existing Action AI is returned directly.
       * - Old QC-processed reports generate Action AI once.
       * - Modal is updated.
       * - Outside report card is also updated immediately.
       * =====================================================
       */
      if (
        item.dashboardModule ===
        'LITTERBINS' &&
        item.type !==
        'VISIT_REPORT'
      ) {
        const response =
          await apiFetch<{
            report?: any;
            actionAiResult?: any;
            generated?: boolean;
          }>(
            `/modules/twinbin/reports/${item.id}/action-ai`,
            {
              method: 'POST',
            }
          );

        const hydratedReport: DashboardRecord = {
          ...item,
          ...(response?.report || {}),

          actionAiResult:
            response?.actionAiResult ??
            response?.report?.actionAiResult ??
            item.actionAiResult,

          actionAiAt:
            response?.report?.actionAiAt ??
            item.actionAiAt,

          actionAiModel:
            response?.report?.actionAiModel ??
            item.actionAiModel,

          dashboardModule:
            item.dashboardModule,

          dashboardModuleLabel:
            item.dashboardModuleLabel,
        };

        /*
         * Update open modal.
         */
        setSelected(
          hydratedReport
        );

        /*
         * Update outside card immediately.
         *
         * This means after closing View,
         * AI Recommendation remains visible
         * without refreshing the page.
         */
        setRecords((current) =>
          current.map((record) =>
            record.id === item.id &&
              record.dashboardModule ===
              item.dashboardModule
              ? {
                ...record,
                ...hydratedReport,
              }
              : record
          )
        );

        return;
      }

      /*
       * Litter Bin visit reports and Sweeping
       * currently use their loaded history data.
       *
       * Their ULB AI hydration will be added
       * separately when we connect those flows.
       */
    } catch (err: any) {
      console.warn(
        'Unable to hydrate report detail',
        err
      );

      setError(
        err?.message ||
        'Unable to generate ULB AI insight.'
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function beginActionRequired(item: DashboardRecord) {
    const status = normalizedStatus(item);
    if (!['APPROVED', 'REJECTED'].includes(status)) return;
    setActionTarget(item);
    setActionRemark('');
    setError('');
  }

  async function submitActionRequired() {
    if (!actionTarget) return;

    const remark = actionRemark.trim();
    if (!remark) {
      setError('Please enter a corrective-action instruction before submitting.');
      return;
    }

    const moduleKey = actionTarget.dashboardModule;
    setActionSubmitting(true);
    setError('');

    try {
      if (moduleKey === 'TOILET') {
        await ToiletApi.reviewInspection(actionTarget.id, {
          status: 'ACTION_REQUIRED',
          comment: remark,
        });
      } else if (moduleKey === 'SWEEPING') {
        await ModuleRecordsApi.updateRecordStatus(
          'SWEEPING',
          actionTarget.id,
          'ACTION_REQUIRED',
          remark
        );
      } else if (actionTarget.type === 'VISIT_REPORT') {
        await apiFetch(`/modules/twinbin/visits/${actionTarget.id}/action-required`, {
          method: 'POST',
          body: JSON.stringify({ qcRemark: remark }),
        });
      } else {
        await apiFetch(`/modules/twinbin/reports/${actionTarget.id}/action-required`, {
          method: 'POST',
          body: JSON.stringify({ ulbRemark: remark }),
        });
      }

      setActionTarget(null);
      setActionRemark('');
      setSelected(null);
      setActiveStatus('ACTION_REQUIRED');
      await loadRecords();
    } catch (err: any) {
      console.error('Unable to mark Action Required', err);
      setError(err?.message || 'Unable to send this report to the Action Officer.');
    } finally {
      setActionSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="grid grid-cols-[1fr_auto] items-center gap-3">
        <p className="text-sm font-semibold text-slate-500">
          {locationRecords.length.toLocaleString()} reports in range ·{' '}
          {moduleSplit.TOILET.toLocaleString()} toilet ·{' '}
          {moduleSplit.LITTERBINS.toLocaleString()} litter bin ·{' '}
          {moduleSplit.SWEEPING.toLocaleString()} sweeping
        </p>

        <button
          type="button"
          onClick={loadRecords}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError('')} className="text-rose-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                <CalendarDays className="h-4 w-4" />
                Period
              </div>

              <div className="flex flex-wrap gap-1.5">
                {DATE_PRESETS.map((preset) => {
                  const active = datePreset === preset.key;
                  return (
                    <button
                      type="button"
                      key={preset.key}
                      onClick={() => setDatePreset(preset.key)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${active
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                        }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'TOILET', 'LITTERBINS', 'SWEEPING'] as ModuleFilter[]).map((moduleKey) => {
                const active = moduleFilter === moduleKey;
                const label =
                  moduleKey === 'ALL'
                    ? 'All'
                    : moduleKey === 'TOILET'
                      ? 'Toilet'
                      : moduleKey === 'LITTERBINS'
                        ? 'Litter Bin'
                        : 'Sweeping';

                return (
                  <button
                    type="button"
                    key={moduleKey}
                    onClick={() => setModuleFilter(moduleKey)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${active
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                      }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-3">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              <MapPin className="h-4 w-4" />
              Location
            </div>

            <select
              value={selectedZone}
              onChange={(event) => handleZoneChange(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none transition focus:border-blue-400"
            >
              <option value="">All Zones</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>

            <select
              value={selectedWard}
              onChange={(event) => handleWardChange(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 outline-none transition focus:border-blue-400"
            >
              <option value="">All Wards</option>
              {visibleWards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </select>

            {(selectedZone || selectedWard) && (
              <button
                type="button"
                onClick={clearLocationFilters}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
              >
                Clear
              </button>
            )}
          </div>

          {datePreset === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
              <input
                type="date"
                value={customStart}
                onChange={(event) => setCustomStart(event.target.value)}
                max={customEnd || todayString()}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-blue-400"
              />
              <span className="text-xs font-semibold text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(event) => setCustomEnd(event.target.value)}
                min={customStart || undefined}
                max={todayString()}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-blue-400"
              />
            </div>
          )}
        </div>

        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => search && setShowSuggestions(true)}
                onBlur={() => {
                  suggestionBlurTimer.current = setTimeout(() => setShowSuggestions(false), 120);
                }}
                placeholder="Search report, location, user, zone, ward..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  {suggestions.map((suggestion, index) => (
                    <button
                      type="button"
                      key={`${suggestion.type}-${suggestion.label}-${index}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        if (suggestionBlurTimer.current) clearTimeout(suggestionBlurTimer.current);
                        setSearch(suggestion.label);
                        setShowSuggestions(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left text-xs font-semibold text-slate-700 last:border-b-0 hover:bg-slate-50"
                    >
                      <span className="truncate">{suggestion.label}</span>
                      <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                        {suggestion.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {([
                ['DATE', 'Date'],
                ['POINT', 'Point'],
                ['USER', 'User'],
              ] as Array<[SortField, string]>).map(([field, label]) => {
                const active = sortField === field;
                return (
                  <button
                    type="button"
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2.5 text-xs font-bold transition ${active
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                      }`}
                  >
                    {label}
                    {active && <ArrowUpDown className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-400">
            <span>
              Showing {displayedRecords.length.toLocaleString()} of{' '}
              {filteredRecords.length.toLocaleString()} {STATUS_CONFIG[activeStatus].shortLabel.toLowerCase()} reports
            </span>
            <div className="flex items-center gap-3">
              <span className="text-blue-600">T: {moduleSplit.TOILET}</span>
              <span className="text-emerald-600">L: {moduleSplit.LITTERBINS}</span>
              <span className="text-violet-600">S: {moduleSplit.SWEEPING}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
          {STATUS_ORDER.map((statusKey) => {
            const config = STATUS_CONFIG[statusKey];
            const Icon = config.icon;
            const active = activeStatus === statusKey;

            return (
              <button
                type="button"
                key={statusKey}
                onClick={() => setActiveStatus(statusKey)}
                className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${active
                  ? `${config.border} ${config.bg} shadow-sm`
                  : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
              >
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${config.bg}`}>
                  <Icon className={`h-5 w-5 ${config.text}`} />
                </div>
                <div className={`text-[24px] font-black leading-none ${config.text}`}>
                  {counts[statusKey].toLocaleString()}
                </div>
                <div
                  className={`mt-2 text-[10px] font-black uppercase tracking-[0.12em] ${active ? config.text : 'text-slate-500'
                    }`}
                >
                  {config.shortLabel}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mx-4 h-px bg-slate-200" />

        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="h-0.5 bg-slate-200" />
                  <div className="p-4">
                    <div className="mb-3 flex gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-slate-100" />
                        <div className="h-3 w-1/2 rounded bg-slate-100" />
                      </div>
                    </div>
                    <div className="h-3 rounded bg-slate-100" />
                    <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Inbox className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-black text-slate-700">
                No {STATUS_CONFIG[activeStatus].shortLabel} Reports
              </p>
              <p className="mt-1 max-w-md text-xs font-medium text-slate-400">
                No reports match the selected period, module, status and search filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {displayedRecords.map((record) => (
                  <ReportCard
                    key={`${record.dashboardModule}-${record.id}`}
                    report={record}
                    onView={openDetail}
                    onActionRequired={beginActionRequired}
                  />
                ))}
              </div>

              {visibleCount < filteredRecords.length && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + LOAD_MORE_SIZE)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Load More ({Math.max(filteredRecords.length - visibleCount, 0)} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {selected && (
        <DetailModal
          report={selected}
          loading={detailLoading}
          onClose={() => setSelected(null)}
          onImagePreview={setImagePreview}
        />
      )}

      {actionTarget && (
        <ActionRequiredModal
          report={actionTarget}
          remark={actionRemark}
          setRemark={setActionRemark}
          submitting={actionSubmitting}
          onClose={() => {
            if (actionSubmitting) return;
            setActionTarget(null);
            setActionRemark('');
          }}
          onSubmit={submitActionRequired}
        />
      )}

      {imagePreview && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setImagePreview(null)}
        >
          <button
            type="button"
            onClick={() => setImagePreview(null)}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={imagePreview}
            alt="Inspection evidence"
            className="max-h-full max-w-full rounded-xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function ReportCard({
  report,
  onView,
  onActionRequired,
}: {
  report: DashboardRecord;
  onView: (report: DashboardRecord) => void;
  onActionRequired: (report: DashboardRecord) => void;
}) {
  const status = normalizedStatus(report);
  const classes = statusClasses(status);
  const StatusIcon = classes.icon;
  const answers = extractAnswers(report);
  const imageCount = totalImageCount(report);
  const actionEnabled = ['APPROVED', 'REJECTED'].includes(status);
  const actionAi =
    getActionAiResult(report);

  const aiRecommendation =
    String(
      actionAi?.recommendation || ''
    ).toUpperCase();

  const aiSuggestsAction =
    aiRecommendation ===
    'ACTION_REQUIRED';

  const isSweeping =
    report.dashboardModule ===
    'SWEEPING';

  const sweepingSummary =
    isSweeping
      ? getSweepingSummary(report)
      : null;

  const moduleTone =
    report.dashboardModule === 'TOILET'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : report.dashboardModule === 'LITTERBINS'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-violet-200 bg-violet-50 text-violet-700';

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`h-0.5 ${classes.top}`} />

      <div className="p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${classes.bg}`}>
            <StatusIcon className={`h-5 w-5 ${classes.text}`} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-black text-slate-800">
              {reportTitle(report, report.dashboardModule)}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${moduleTone}`}>
                {moduleShortLabel(report.dashboardModule)}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${classes.bg} ${classes.text} ${classes.border}`}>
                {status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-[11px] font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{reportArea(report)}</span>
          </div>

          {(report?.zoneName || report?.wardName || report?.bin?.zoneName || report?.bin?.wardName) && (
            <div className="flex flex-wrap gap-x-2 gap-y-1 pl-5 text-[10px] text-slate-400">
              <span>Zone: {report?.zoneName || report?.bin?.zoneName || '—'}</span>
              <span>Ward: {report?.wardName || report?.bin?.wardName || '—'}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {submittedByName(report)}
            </span>
            <span className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {formatShortDate(report)}
            </span>
            {imageCount > 0 && (
              <span className="flex items-center gap-1 font-bold text-blue-600">
                <ImageIcon className="h-3.5 w-3.5" />
                {imageCount} photo{imageCount === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {isSweeping &&
            sweepingSummary ? (
            <div className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />

              <span className="font-bold text-violet-600">
                {sweepingSummary.submitted}
                {' / '}
                {sweepingSummary.total}
                {' points submitted'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />

              {answers.length}{' '}
              answer
              {answers.length === 1
                ? ''
                : 's'}
            </div>
          )}
        </div>
      </div>
      {actionAi && (
        <div className="px-4 pb-3">
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${aiSuggestsAction
              ? 'border-orange-200 bg-orange-50'
              : 'border-emerald-200 bg-emerald-50'
              }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${aiSuggestsAction
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-emerald-100 text-emerald-600'
                  }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </div>

              <div className="min-w-0">
                <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
                  AI Recommendation
                </div>

                <div
                  className={`truncate text-[11px] font-black ${aiSuggestsAction
                    ? 'text-orange-700'
                    : 'text-emerald-700'
                    }`}
                >
                  {aiSuggestsAction
                    ? 'Action Required'
                    : 'No Action Required'}
                </div>
              </div>
            </div>

            {Number.isFinite(
              Number(actionAi?.confidence)
            ) && (
                <span
                  className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black ${aiSuggestsAction
                    ? 'border-orange-200 bg-white text-orange-700'
                    : 'border-emerald-200 bg-white text-emerald-700'
                    }`}
                >
                  {Math.round(
                    Number(actionAi.confidence) *
                    100
                  )}
                  %
                </span>
              )}
          </div>
        </div>
      )}
      <footer className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-3">
        <button
          type="button"
          onClick={() => onView(report)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>

        <button
          type="button"
          onClick={() => onActionRequired(report)}
          disabled={!actionEnabled}
          title={
            actionEnabled
              ? 'Send this QC-processed report for corrective action'
              : 'Action Required can only be raised from Approved or Rejected reports'
          }
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${actionEnabled
            ? 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300 hover:bg-orange-100'
            : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
            }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Action Required
        </button>
      </footer>
    </article>
  );
}

function DetailModal({
  report,
  loading,
  onClose,
  onImagePreview,
}: {
  report: DashboardRecord;
  loading: boolean;
  onClose: () => void;
  onImagePreview: (url: string) => void;
}) {
  const status = normalizedStatus(report);
  const classes = statusClasses(status);
  const answers = extractAnswers(report);
  const topLevelImages = collectTopLevelImages(report);
  const qcRemark = getQcRemark(report);
  const actionRequiredRemark = getActionRequiredRemark(report, report.dashboardModule);
  const actionTakenRemark = getActionTakenRemark(report, report.dashboardModule);
  const isSweeping =
    report.dashboardModule ===
    'SWEEPING';

  const sweepingSummary =
    isSweeping
      ? getSweepingSummary(report)
      : null;
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100vh-32px)] w-[min(1080px,calc(100vw-32px))] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-slate-50 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-blue-700">
                  {moduleLabel(report.dashboardModule)}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${classes.bg} ${classes.text} ${classes.border}`}>
                  {status.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="truncate text-xl font-black text-slate-900">
                {reportTitle(report, report.dashboardModule)}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">{reportArea(report)}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading complete report details...
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Module', value: moduleShortLabel(report.dashboardModule) },
              { label: 'Status', value: status.replace(/_/g, ' ') },
              {
                label:
                  isSweeping
                    ? 'Points'
                    : 'Answers',

                value:
                  isSweeping &&
                    sweepingSummary
                    ? `${sweepingSummary.submitted}/${sweepingSummary.total}`
                    : String(
                      answers.length
                    ),
              },
              { label: 'Photos', value: String(totalImageCount(report)) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-black capitalize text-slate-800">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <section className="mt-5">
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              Report Details
            </h3>
            <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-600 sm:grid-cols-2">
              <DetailRow icon={User} label="Submitted by" value={submittedByName(report)} />
              <DetailRow icon={Clock3} label="Submitted at" value={formatFullDate(report?.createdAt || report?.submittedAt || report?.visitedAt)} />
              <DetailRow icon={MapPin} label="Zone" value={report?.zoneName || report?.bin?.zoneName || '—'} />
              <DetailRow icon={MapPin} label="Ward" value={report?.wardName || report?.bin?.wardName || '—'} />
            </div>
          </section>
          <AiInsightsSection report={report} />
          {(qcRemark || actionRequiredRemark || actionTakenRemark) && (
            <section className="mt-5">
              <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Workflow Remarks
              </h3>
              <div className="space-y-2">
                {qcRemark && <RemarkBox label="QC Remark" value={qcRemark} tone="blue" />}
                {actionRequiredRemark && (
                  <RemarkBox label="ULB Action Required Instruction" value={actionRequiredRemark} tone="orange" />
                )}
                {actionTakenRemark && (
                  <RemarkBox label="Action Officer Response" value={actionTakenRemark} tone="indigo" />
                )}
              </div>
            </section>
          )}

          {topLevelImages.length > 0 && (
            <section className="mt-5">
              <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Submitted Evidence
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {topLevelImages.map((url) => (
                  <ImageTile key={url} url={url} onOpen={onImagePreview} />
                ))}
              </div>
            </section>
          )}

          {isSweeping ? (
            <SweepingPointEvidenceSection
              report={report}
              onImagePreview={
                onImagePreview
              }
            />
          ) : (
            <section className="mt-5">
              <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Questions &amp; Answers ({answers.length})
              </h3>

              {answers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-400">
                  No question/answer snapshot is available for this report.
                </div>
              ) : (
                <div className="space-y-2">
                  {answers.map((answer, index) => (
                    <div key={`${answer.question}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                      {answer.section && (
                        <div className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-blue-600">
                          {answer.section}
                        </div>
                      )}
                      <div className="text-sm font-black text-slate-800">
                        <span className="text-slate-400">Q{index + 1}. </span>
                        {answer.question}
                      </div>
                      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        <span className="text-slate-400">Answer: </span>
                        {answer.answer}
                      </div>

                      {answer.photos.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {answer.photos.map((url) => (
                            <ImageTile key={url} url={url} onOpen={onImagePreview} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span>
        <span className="text-slate-400">{label}: </span>
        <span className="font-bold text-slate-700">{value}</span>
      </span>
    </div>
  );
}

function RemarkBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: any;
  tone: 'blue' | 'orange' | 'indigo';
}) {
  const classes =
    tone === 'orange'
      ? 'border-orange-200 bg-orange-50 text-orange-800'
      : tone === 'indigo'
        ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
        : 'border-blue-200 bg-blue-50 text-blue-800';

  return (
    <div className={`rounded-xl border px-4 py-3 ${classes}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">{label}</div>
      <div className="mt-1 text-sm font-semibold">{displayAnswer(value)}</div>
    </div>
  );
}

function AiInsightsSection({
  report,
}: {
  report: DashboardRecord;
}) {
  const autoQc = getAutoQcResult(report);
  const actionAi = getActionAiResult(report);

  if (!autoQc && !actionAi) {
    return (
      <section className="mt-5">
        <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          AI Insights
        </h3>

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Sparkles className="h-4 w-4" />
            </div>

            <div>
              <div className="text-sm font-black text-slate-700">
                No AI insight available
              </div>

              <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                No stored AI analysis is available for this report.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const actionRecommendation =
    String(
      actionAi?.recommendation || ''
    ).toUpperCase();

  const actionRequired =
    actionRecommendation ===
    'ACTION_REQUIRED';

  const autoDecision =
    String(
      autoQc?.decision || ''
    ).toUpperCase();

  const autoRejected =
    autoDecision === 'REJECTED';

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-600" />

        <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          AI Insights
        </h3>
      </div>

      <div className="space-y-3">

        {/* ============================= */}
        {/* ULB ACTION AI */}
        {/* ============================= */}

        {actionAi && (
          <div
            className={`overflow-hidden rounded-2xl border ${actionRequired
              ? 'border-orange-200 bg-orange-50/60'
              : 'border-emerald-200 bg-emerald-50/60'
              }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-4 py-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                  ULB AI Recommendation
                </div>

                <div className="mt-1 text-sm font-black text-slate-800">
                  Corrective Action Assessment
                </div>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${actionRequired
                  ? 'border-orange-200 bg-orange-100 text-orange-700'
                  : 'border-emerald-200 bg-emerald-100 text-emerald-700'
                  }`}
              >
                {actionRequired
                  ? 'Action Required'
                  : 'No Action Required'}
              </span>
            </div>

            <div className="p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2.5">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    AI Confidence
                  </div>

                  <div className="mt-1 text-lg font-black text-slate-800">
                    {formatAiConfidence(
                      actionAi.confidence
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2.5">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Source QC Decision
                  </div>

                  <div className="mt-1 text-sm font-black text-slate-800">
                    {String(
                      actionAi.sourceQcDecision ||
                      '—'
                    ).replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              {actionAi.summary && (
                <div className="mt-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    AI Summary
                  </div>

                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                    {actionAi.summary}
                  </p>
                </div>
              )}

              {Array.isArray(actionAi.reasons) &&
                actionAi.reasons.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Key Findings
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {actionAi.reasons.map(
                        (
                          reason: any,
                          index: number
                        ) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 text-xs font-medium leading-5 text-slate-600"
                          >
                            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                            <span>
                              {String(reason)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {actionAi.recommendedAction && (
                <div className="mt-4 rounded-xl border border-orange-200 bg-white px-4 py-3">
                  <div className="text-[9px] font-black uppercase tracking-wider text-orange-500">
                    Recommended Corrective Action
                  </div>

                  <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
                    {actionAi.recommendedAction}
                  </p>
                </div>
              )}

              <p className="mt-3 text-[10px] font-semibold leading-4 text-slate-400">
                AI provides operational guidance only.
                The ULB Officer remains responsible for
                the final Action Required decision.
              </p>
            </div>
          </div>
        )}

        {/* ============================= */}
        {/* ORIGINAL QC AUTO AI */}
        {/* ============================= */}

        {autoQc && (
          <div className="overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/50">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 px-4 py-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-violet-500">
                  QC AI Verification
                </div>

                <div className="mt-1 text-sm font-black text-slate-800">
                  Photo &amp; Response Analysis
                </div>
              </div>

              {autoDecision && (
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${autoRejected
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                >
                  {autoDecision.replace(
                    /_/g,
                    ' '
                  )}
                </span>
              )}
            </div>

            <div className="p-4">
              <div className="mb-3 inline-flex rounded-lg border border-violet-100 bg-white px-3 py-2">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Confidence
                  </div>

                  <div className="mt-0.5 text-sm font-black text-violet-700">
                    {formatAiConfidence(
                      autoQc.confidence
                    )}
                  </div>
                </div>
              </div>

              {autoQc.summary && (
                <p className="text-sm font-semibold leading-6 text-slate-700">
                  {autoQc.summary}
                </p>
              )}

              {Array.isArray(autoQc.reasons) &&
                autoQc.reasons.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {autoQc.reasons.map(
                      (
                        reason: any,
                        index: number
                      ) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 text-xs font-medium leading-5 text-slate-600"
                        >
                          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                          <span>
                            {String(reason)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SweepingPointEvidenceSection({
  report,
  onImagePreview,
}: {
  report: DashboardRecord;
  onImagePreview: (
    url: string
  ) => void;
}) {
  const {
    points: submittedPoints,
    submitted,
    total,
  } = getSweepingSummary(
    report
  );

  const beatPoints =
    Array.isArray(
      report?.beatPoints
    ) &&
      report.beatPoints.length > 0
      ? report.beatPoints
      : Array.from(
        {
          length: total,
        },
        (_, index) => ({
          code:
            `P${index + 1}`,

          name:
            `Point ${index + 1}`,

          type:
            index === 0
              ? 'START'
              : index ===
                total - 1
                ? 'END'
                : 'ROUTE',
        })
      );

  const autoQc =
    getAutoQcResult(
      report
    );

  const pointFindings =
    Array.isArray(
      autoQc?.pointFindings
    )
      ? autoQc.pointFindings
      : [];

  return (
    <section className="mt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          Beat Point Evidence
        </h3>

        <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">
          {submitted}/{total} submitted
        </span>
      </div>

      <div className="space-y-3">
        {beatPoints.map(
          (
            beatPoint: any,
            index: number
          ) => {
            const pointCode =
              beatPoint?.code ||
              `P${index + 1}`;

            const pointIndex =
              index;

            const evidence =
              submittedPoints.find(
                (point: any) =>
                  point?.pointCode ===
                  pointCode ||
                  Number(
                    point?.pointIndex
                  ) === pointIndex
              );

            const finding =
              pointFindings.find(
                (item: any) =>
                  item?.pointCode ===
                  pointCode ||
                  Number(
                    item?.pointIndex
                  ) === pointIndex
              );

            const photos =
              evidence
                ? normalizeImages([
                  evidence?.photo,
                  evidence?.photoUrl,
                  evidence?.image,
                  evidence?.imageUrl,
                ])
                : [];

            const submittedPoint =
              Boolean(evidence);

            return (
              <div
                key={pointCode}
                className={`overflow-hidden rounded-2xl border ${submittedPoint
                  ? 'border-slate-200 bg-white'
                  : 'border-dashed border-amber-200 bg-amber-50/50'
                  }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <div>
                    <div className="text-sm font-black text-slate-800">
                      {beatPoint?.name ||
                        `Point ${index + 1}`}
                    </div>

                    <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                      {pointCode}

                      {beatPoint?.type
                        ? ` · ${beatPoint.type}`
                        : ''}
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${submittedPoint
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                  >
                    {submittedPoint
                      ? 'Submitted'
                      : 'Not Submitted'}
                  </span>
                </div>

                <div className="p-4">
                  {submittedPoint ? (
                    <>
                      {photos.length >
                        0 && (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {photos.map(
                              (
                                url
                              ) => (
                                <ImageTile
                                  key={
                                    url
                                  }
                                  url={
                                    url
                                  }
                                  onOpen={
                                    onImagePreview
                                  }
                                />
                              )
                            )}
                          </div>
                        )}

                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-[8px] font-black uppercase text-slate-400">
                            Submitted At
                          </div>

                          <div className="mt-1 font-bold text-slate-700">
                            {formatFullDate(
                              evidence
                                ?.submittedAt
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-[8px] font-black uppercase text-slate-400">
                            Distance
                          </div>

                          <div className="mt-1 font-bold text-slate-700">
                            {Number.isFinite(
                              Number(
                                evidence
                                  ?.distanceMeters
                              )
                            )
                              ? `${Number(
                                evidence
                                  .distanceMeters
                              ).toFixed(
                                1
                              )} m`
                              : '—'}
                          </div>
                        </div>

                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-[8px] font-black uppercase text-slate-400">
                            QC AI
                          </div>

                          <div className="mt-1 font-bold text-slate-700">
                            {String(
                              finding
                                ?.result ||
                              '—'
                            ).replace(
                              /_/g,
                              ' '
                            )}
                          </div>
                        </div>
                      </div>

                      {finding?.reason && (
                        <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5">
                          <div className="text-[8px] font-black uppercase tracking-wider text-violet-500">
                            QC AI Finding
                          </div>

                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                            {finding.reason}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-5 text-center text-xs font-semibold text-amber-700">
                      No photo was submitted
                      for this Beat point.
                    </div>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}

function ImageTile({
  url,
  onOpen,
}: {
  url: string;
  onOpen: (url: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(url)}
      className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
    >
      <img src={url} alt="Inspection evidence" className="h-full w-full object-cover" />
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
        <ZoomIn className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
      </div>
    </button>
  );
}

function ActionRequiredModal({
  report,
  remark,
  setRemark,
  submitting,
  onClose,
  onSubmit,
}: {
  report: DashboardRecord;
  remark: string;
  setRemark: (value: string) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-orange-100 bg-orange-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Mark Action Required</h2>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Send this QC-processed report to the mapped Action Officer.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-200 bg-white text-slate-500 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-black text-slate-800">
              {reportTitle(report, report.dashboardModule)}
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500">
              {moduleLabel(report.dashboardModule)} · {submittedByName(report)}
            </div>
          </div>

          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            Corrective Action Instruction
          </label>
          <textarea
            rows={5}
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            placeholder="Write exactly what corrective action is required..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting || !remark.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send to Action Officer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
