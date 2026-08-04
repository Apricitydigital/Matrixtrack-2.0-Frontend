export const SIDEBAR_MODULES = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'access_requests', label: 'Access Requests' },
    { key: 'users', label: 'Users' },
    { key: 'participants', label: 'Participants' },
    { key: 'questionnaire', label: 'Questionnaire' },
    { key: 'zone_ward', label: 'Zone & Ward' },
    { key: 'reports', label: 'Reports' },
    { key: 'sidebar_access', label: 'Sidebar Access' },
    { key: 'self_assessment_review', label: 'Self Assessment Review' },
    { key: 'my_profile', label: 'My Profile' }
] as const;

export const PERMISSION_LEVELS = ['no_access', 'view', 'write'] as const;

export type ModuleKey = typeof SIDEBAR_MODULES[number]['key'];
export type PermissionLevel = typeof PERMISSION_LEVELS[number];
export type PermissionMap = Partial<Record<ModuleKey, PermissionLevel>>;

const ranks: Record<PermissionLevel, number> = {
    no_access: 0,
    view: 1,
    write: 2
};

export const hasPermission = (
    permissionMap: PermissionMap | undefined,
    moduleKey: ModuleKey,
    requirement: 'view' | 'write' = 'view'
) => {
    if (typeof window !== 'undefined') {
        try {
            const u = JSON.parse(localStorage.getItem('user') || 'null');
            if (u && Array.isArray(u.modules) && u.modules.length > 0) {
                const hasSwachh = u.modules.some((m: any) =>
                    ['SWACHH_RANKING', 'SWACHH', 'WARD_RANKING', 'SWEEPING'].includes((m.key || m.name || '').toUpperCase())
                );
                if (!hasSwachh && !u.roles?.includes('HMS_SUPER_ADMIN')) {
                    return false;
                }
            }
        } catch (e) {}
    }

    if (!permissionMap) return true;
    const requiredLevel = requirement === 'write' ? 'write' : 'view';
    const current = permissionMap[moduleKey] ?? 'write';
    return ranks[current] >= ranks[requiredLevel];
};

export const getPermissionLabel = (level: PermissionLevel) => {
    switch (level) {
        case 'no_access':
            return 'No Access';
        case 'view':
            return 'View Only';
        case 'write':
            return 'Write';
        default:
            return level;
    }
};
