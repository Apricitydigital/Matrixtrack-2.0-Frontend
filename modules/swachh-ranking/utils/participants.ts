const PARTICIPANT_CATEGORY_ORDER = [
    'wards',
    'schools',
    'hospitals',
    'offices',
    'markets',
    'societies - bwg',
    'hotels',
    'citizen_puraskar'
] as const;

export type ParticipantCategory = typeof PARTICIPANT_CATEGORY_ORDER[number] | string;

const CATEGORY_ALIAS_MAP: Record<string, ParticipantCategory> = {
    ward: 'wards',
    wards: 'wards',
    'ward ranking': 'wards',
    school: 'schools',
    schools: 'schools',
    hospital: 'hospitals',
    hospitals: 'hospitals',
    office: 'offices',
    offices: 'offices',
    market: 'markets',
    markets: 'markets',
    'society': 'societies - bwg',
    'societies': 'societies - bwg',
    'societies-bwg': 'societies - bwg',
    'society-bwg': 'societies - bwg',
    'society bwg': 'societies - bwg',
    'societies bwg': 'societies - bwg',
    'societies - bwg': 'societies - bwg',
    'societies_bwg': 'societies - bwg',
    hotel: 'hotels',
    hotels: 'hotels',
    citizen: 'citizen_puraskar',
    'citizen groups': 'citizen_puraskar',
    'citizen group': 'citizen_puraskar',
    'citizen puraskar': 'citizen_puraskar',
    'citizen-puraskar': 'citizen_puraskar',
    'citizen_puraskar': 'citizen_puraskar',
    'citizen / citizen groups / other organizations': 'citizen_puraskar'
};

const canonicalizeCategoryKey = (rawCategory?: string | null) => {
    if (!rawCategory) {
        return '';
    }
    return rawCategory
        .toLowerCase()
        .replace(/[_–]+/g, '-') // treat underscores/en-dashes the same as hyphen
        .replace(/\s*-\s*/g, '-') // collapse spaces around hyphen
        .replace(/\s+/g, ' ') // collapse internal spacing
        .trim();
};

export const normalizeParticipantCategory = (rawCategory?: string | null): ParticipantCategory => {
    const canonical = canonicalizeCategoryKey(rawCategory);
    if (!canonical) {
        return '';
    }
    return CATEGORY_ALIAS_MAP[canonical] || canonical;
};

export const CATEGORY_LABELS: Record<string, string> = {
    wards: 'Ward',
    schools: 'School',
    hospitals: 'Hospital',
    offices: 'Office',
    markets: 'Market',
    'societies - bwg': 'Society',
    societies_bwg: 'Society',
    hotels: 'Hotel',
    citizen_puraskar: 'Citizen / Groups'
};

const CATEGORY_META_MAP: Record<string, { label: string; code: string; color: string }> = {
    wards: { label: 'Ward', code: 'WRD', color: '#1E40AF' },
    schools: { label: 'School', code: 'SCH', color: '#1E40AF' },
    hospitals: { label: 'Hospital', code: 'HSP', color: '#B91C1C' },
    offices: { label: 'Office', code: 'OFF', color: '#5B21B6' },
    markets: { label: 'Market', code: 'MKT', color: '#9A3412' },
    'societies - bwg': { label: 'Society', code: 'SOC', color: '#065F46' },
    societies_bwg: { label: 'Society', code: 'SOC', color: '#065F46' },
    hotels: { label: 'Hotel', code: 'HTL', color: '#0369A1' },
    citizen_puraskar: { label: 'Citizen', code: 'CTZ', color: '#134E4A' }
};

const toTitleCase = (value: string) =>
    value
        .replace(/[_-]+/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .trim();

export const getCategoryMeta = (rawCategory: string | undefined | null) => {
    const normalized = (rawCategory || '').toLowerCase().trim();
    if (CATEGORY_META_MAP[normalized]) {
        return CATEGORY_META_MAP[normalized];
    }

    const inferredLabel =
        CATEGORY_LABELS[normalized] ||
        (normalized ? toTitleCase(normalized) : 'General');

    return {
        label: inferredLabel,
        code: inferredLabel.slice(0, 3).toUpperCase() || 'GEN',
        color: '#475569'
    };
};

export const formatParticipantDisplayId = (participantId: string, category: string) => {
    const meta = getCategoryMeta(category);
    const sanitized = (participantId || '').replace(/-/g, '');
    const numericSeed = parseInt(sanitized.slice(-4), 16);
    const sequence = Number.isFinite(numericSeed) ? (numericSeed % 1000) + 1 : 1;
    return `PMC-${meta.code}-${String(sequence).padStart(3, '0')}`;
};

export const PARTICIPANT_CATEGORIES = Array.from(
    new Set(PARTICIPANT_CATEGORY_ORDER)
) as string[];

export const DEFAULT_ASSIGNMENT_BATCH = 6;

export type AssignmentStatsLike = {
    total?: number | null;
    completed?: number | null;
    pending?: number | null;
};

export const getAssignmentProgressSummary = (
    stats?: AssignmentStatsLike,
    fallbackTotal: number = DEFAULT_ASSIGNMENT_BATCH
) => {
    if (!stats || typeof stats.total !== 'number' || stats.total === 0) {
        return {
            total: 0,
            completed: 0,
            pending: 0,
            percent: 0,
            label: 'No field assessments assigned'
        };
    }
    const total = stats.total;
    const completed = typeof stats.completed === 'number' ? stats.completed : 0;
    const percent = Math.min(100, (completed / total) * 100);
    return {
        total,
        completed,
        pending: Math.max(total - completed, 0),
        percent,
        label: `${completed} / ${total} Completed`
    };
};
