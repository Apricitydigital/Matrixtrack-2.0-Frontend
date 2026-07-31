import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Shield, Save, RefreshCw, Monitor, Wifi, LogOut, AlertTriangle } from 'lucide-react';
import NoAccess from '../components/NoAccess';
import {
    SIDEBAR_MODULES,
    PERMISSION_LEVELS,
    getPermissionLabel,
    PermissionLevel,
    ModuleKey,
    hasPermission
} from '../utils/accessControl';

interface UserOption {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface ActiveSession {
    id: string;
    deviceName: string;
    ipAddress: string;
    loginTime: string;
    lastSeen: string;
}

const SidebarAccessControl = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const canManage = hasPermission(currentUser?.permissions, 'sidebar_access', 'write');

    const [users, setUsers] = useState<UserOption[]>([]);
    const [modules, setModules] = useState(SIDEBAR_MODULES);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [permissionMap, setPermissionMap] = useState<Record<string, PermissionLevel>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);

    // ── Login / Session state ────────────────────────────────────────────────
    const [loginMode, setLoginMode] = useState<'single' | 'multiple'>('single');
    const [maxDevices, setMaxDevices] = useState(1);
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sharingWarning, setSharingWarning] = useState(false);
    // ────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const fetchUsersAndModules = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const [usersResponse, modulesResponse] = await Promise.all([
                    api.get('/admin/users?status=approved', {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    api.get('/permissions/modules', {
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => ({ data: SIDEBAR_MODULES }))
                ]);
                setUsers(usersResponse.data || []);
                setModules(modulesResponse.data || SIDEBAR_MODULES);
            } catch (error) {
                console.error('Failed to load permission metadata', error);
            }
        };
        fetchUsersAndModules();
    }, []);

    const loadPermissions = async (userId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        setLoading(true);
        try {
            const response = await api.get(`/permissions/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPermissionMap(response.data.permissions || {});
        } catch (error) {
            console.error('Failed to load permissions', error);
            setPermissionMap({});
        } finally {
            setLoading(false);
        }
    };

    const loadSessionInfo = async (userId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        setSessionsLoading(true);
        try {
            const response = await api.get(`/sessions/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLoginMode(response.data.loginMode ?? 'single');
            setMaxDevices(response.data.maxDevices ?? 1);
            setActiveSessions(response.data.sessions ?? []);
            setSharingWarning(response.data.sharingWarning ?? false);
        } catch {
            // Leave defaults in place if fetch fails
        } finally {
            setSessionsLoading(false);
        }
    };

    const handleUserChange = (id: string) => {
        setSelectedUserId(id);
        if (id) {
            loadPermissions(id);
            loadSessionInfo(id);
        } else {
            setPermissionMap({});
            setActiveSessions([]);
            setLoginMode('single');
            setMaxDevices(1);
            setSharingWarning(false);
        }
        setStatusMessage('');
    };

    const handlePasswordChange = async () => {
        if (!selectedUserId) return;

        if (newPassword.length < 6) {
            setStatusMessage('Password must be minimum 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setStatusMessage('Passwords do not match');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;
        setPasswordSaving(true);
        try {
            await api.put(
                `/admin/users/${selectedUserId}/password`,
                { newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setStatusMessage('Password updated successfully');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setStatusMessage(error.response?.data?.message || 'Password update failed');
        } finally {
            setPasswordSaving(false);
        }
    };

    const handlePermissionSelect = (moduleKey: ModuleKey, permission: PermissionLevel) => {
        setPermissionMap((prev) => ({ ...prev, [moduleKey]: permission }));
    };

    const handleSave = async () => {
        if (!selectedUserId) return;
        if (!canManage) {
            alert('Write permission required to modify permissions.');
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) return;

        setSaving(true);
        try {
            const permPayload = {
                permissions: modules.map((module) => ({
                    module: module.key,
                    permission: permissionMap[module.key] || 'write'
                }))
            };

            const [permResult, sessionResult] = await Promise.allSettled([
                api.put(`/permissions/users/${selectedUserId}`, permPayload, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                api.put(
                    `/sessions/users/${selectedUserId}/config`,
                    { loginMode, maxDevices },
                    { headers: { Authorization: `Bearer ${token}` } }
                )
            ]);

            if (permResult.status === 'fulfilled') {
                setPermissionMap(permResult.value.data.permissions || {});
                if (selectedUserId === String(currentUser?.id)) {
                    const updatedUser = { ...currentUser, permissions: permResult.value.data.permissions };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    window.dispatchEvent(new Event('user:permissions-updated'));
                }
            }

            const permOk = permResult.status === 'fulfilled';
            const sessionOk = sessionResult.status === 'fulfilled';

            if (permOk && sessionOk) {
                setStatusMessage('Permissions and login settings saved successfully.');
            } else if (permOk) {
                setStatusMessage('Permissions saved. Login settings could not be saved.');
            } else {
                setStatusMessage((permResult as PromiseRejectedResult).reason?.response?.data?.message || 'Failed to save permissions.');
            }
        } catch (error: any) {
            setStatusMessage(error.response?.data?.message || 'Failed to save.');
        } finally {
            setSaving(false);
            setTimeout(() => setStatusMessage(''), 5000);
        }
    };

    const handleLogoutAll = async () => {
        const token = localStorage.getItem('token');
        if (!token || !selectedUserId) return;
        try {
            await api.delete(`/sessions/users/${selectedUserId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveSessions([]);
            setSharingWarning(false);
            setStatusMessage('All sessions terminated.');
            setTimeout(() => setStatusMessage(''), 4000);
        } catch {
            setStatusMessage('Failed to terminate sessions.');
        }
    };

    const handleLogoutSession = async (sessionId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            await api.delete(`/sessions/${sessionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
        } catch {
            setStatusMessage('Failed to terminate session.');
        }
    };

    if (!currentUser || !canManage) {
        return <NoAccess title="Sidebar Access Control" message="You do not have permission to manage module access." />;
    }

    return (
        <div className="card shadow-premium" style={{ padding: '2rem', border: 'none' }}>
            <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary-soft)', padding: '0.75rem', borderRadius: '12px', color: 'var(--primary)' }}>
                    <Shield size={28} />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0 }}>Sidebar Access Control</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Grant granular access per module for every administrator and field officer.</p>
                </div>
            </header>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Select User</label>
                <select
                    value={selectedUserId}
                    onChange={(e) => handleUserChange(e.target.value)}
                    aria-label="Select User"
                    style={{ marginTop: '0.5rem', padding: '0.9rem 1.2rem', borderRadius: '12px', width: '100%' }}
                >
                    <option value="">Choose a user...</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.name} ({user.role})
                        </option>
                    ))}
                </select>
            </div>

            {selectedUserId && (
                <>
                    {/* ── Module Permissions Table ── */}
                    <div className="table-container" style={{ marginBottom: '1.5rem' }}>
                        {loading ? (
                            <div style={{ padding: '3rem', textAlign: 'center' }}>
                                <RefreshCw className="animate-spin" size={32} />
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Module</th>
                                        {PERMISSION_LEVELS.map((level) => (
                                            <th key={level} style={{ textTransform: 'capitalize' }}>{getPermissionLabel(level)}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {modules.map((module) => (
                                        <tr key={module.key}>
                                            <td style={{ fontWeight: 700 }}>{module.label}</td>
                                            {PERMISSION_LEVELS.map((level) => (
                                                <td key={level} style={{ textAlign: 'center' }}>
                                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                                                        <input
                                                            type="radio"
                                                            name={`${module.key}-permission`}
                                                            value={level}
                                                            checked={(permissionMap[module.key] || 'write') === level}
                                                            onChange={() => handlePermissionSelect(module.key as ModuleKey, level)}
                                                        />
                                                    </label>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* ── Action Row: Save + Password ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => selectedUserId && loadPermissions(selectedUserId)}
                                className="btn btn-outline"
                                disabled={loading}
                                style={{ padding: '0.6rem 1.2rem' }}
                            >
                                <RefreshCw size={16} /> Reset
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn btn-primary"
                                disabled={saving}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.4rem' }}
                            >
                                <Save size={16} />
                                {saving ? 'Saving...' : 'Save Permissions'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8f9ff', padding: '0.6rem', borderRadius: '10px', border: '1px solid #e6e8f0' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#555' }}>Change Password</span>
                            <input
                                type="password"
                                placeholder="New"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={{ padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid #ddd', width: '140px' }}
                            />
                            <input
                                type="password"
                                placeholder="Confirm"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                style={{ padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid #ddd', width: '140px' }}
                            />
                            <button
                                onClick={handlePasswordChange}
                                disabled={passwordSaving}
                                className="btn btn-primary"
                                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', borderRadius: '8px' }}
                            >
                                {passwordSaving ? '...' : 'Update'}
                            </button>
                        </div>
                    </div>

                    {statusMessage && (
                        <p style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{statusMessage}</p>
                    )}

                    {/* ── Login Access Control ─────────────────────────────────────────── */}
                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8f9ff', borderRadius: '16px', border: '1px solid #e6e8f0' }}>

                        {/* Section header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: 'var(--primary-soft)', padding: '0.5rem', borderRadius: '10px', color: 'var(--primary)' }}>
                                    <Monitor size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Login Access Control</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Control session limits and detect account sharing</p>
                                </div>
                            </div>
                            <button
                                onClick={() => loadSessionInfo(selectedUserId)}
                                className="btn btn-outline"
                                style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                                <RefreshCw size={14} /> Refresh
                            </button>
                        </div>

                        {/* Login Mode */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                Login Mode
                            </label>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {(['single', 'multiple'] as const).map((mode) => {
                                    const active = loginMode === mode;
                                    return (
                                        <label
                                            key={mode}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                                                padding: '0.6rem 1.1rem',
                                                background: active ? 'var(--primary-soft)' : 'white',
                                                border: `1.5px solid ${active ? 'var(--primary)' : '#ddd'}`,
                                                borderRadius: '10px',
                                                fontWeight: 600, fontSize: '0.875rem',
                                                color: active ? 'var(--primary)' : 'var(--text-primary)',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <input type="radio" name="loginMode" value={mode} checked={active} onChange={() => setLoginMode(mode)} style={{ accentColor: 'var(--primary)' }} />
                                            {mode === 'single' ? '🔒 Single Login' : '📱 Multiple Login'}
                                        </label>
                                    );
                                })}
                            </div>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                {loginMode === 'single'
                                    ? 'Only one active session allowed. A new login will automatically terminate the previous session.'
                                    : 'Multiple concurrent sessions allowed up to the device limit. Exceeding the limit evicts the oldest session.'}
                            </p>
                        </div>

                        {/* Max Devices (multiple only) */}
                        {loginMode === 'multiple' && (
                            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Max Allowed Devices</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={maxDevices}
                                    onChange={(e) => setMaxDevices(Math.max(1, parseInt(e.target.value) || 1))}
                                    style={{ width: '80px', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid #ddd', fontWeight: 700, fontSize: '0.95rem', textAlign: 'center' }}
                                />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {maxDevices === 1 ? '(same as single login)' : `(up to ${maxDevices} concurrent sessions)`}
                                </span>
                            </div>
                        )}

                        {/* Sharing warning */}
                        {sharingWarning && (
                            <div style={{ marginBottom: '1.25rem', padding: '0.8rem 1rem', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#92400e', fontWeight: 600, fontSize: '0.875rem' }}>
                                <AlertTriangle size={16} />
                                Possible account sharing detected — multiple IPs active simultaneously
                            </div>
                        )}

                        {/* Active Sessions */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Wifi size={15} />
                                    Active Sessions
                                    <span style={{ padding: '0.1rem 0.5rem', background: activeSessions.length > 0 ? 'var(--primary-soft)' : '#f1f5f9', color: activeSessions.length > 0 ? 'var(--primary)' : 'var(--text-secondary)', borderRadius: '6px', fontWeight: 900, fontSize: '0.75rem' }}>
                                        {activeSessions.length}
                                    </span>
                                </label>
                                {activeSessions.length > 0 && (
                                    <button
                                        onClick={handleLogoutAll}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', fontSize: '0.78rem', background: 'none', border: '1.5px solid #ef4444', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontWeight: 700, transition: 'all 0.15s' }}
                                    >
                                        <LogOut size={13} /> Logout All
                                    </button>
                                )}
                            </div>

                            {sessionsLoading ? (
                                <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                                    <RefreshCw className="animate-spin" size={22} style={{ color: 'var(--primary)' }} />
                                </div>
                            ) : activeSessions.length === 0 ? (
                                <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', background: 'white', borderRadius: '10px', border: '1px solid #eee' }}>
                                    No active sessions
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {activeSessions.map((session) => (
                                        <div
                                            key={session.id}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', background: 'white', borderRadius: '10px', border: '1px solid #eee', gap: '1rem', flexWrap: 'wrap' }}
                                        >
                                            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.83rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                    <Monitor size={14} /> {session.deviceName}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace', background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '5px' }}>
                                                    {session.ipAddress}
                                                </span>
                                                <span style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                                                    Login: {new Date(session.loginTime).toLocaleString()}
                                                </span>
                                                <span style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                                                    Last seen: {new Date(session.lastSeen).toLocaleString()}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleLogoutSession(session.id)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.7rem', fontSize: '0.75rem', background: 'none', border: '1px solid #ddd', borderRadius: '7px', cursor: 'pointer', color: '#ef4444', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                                            >
                                                <LogOut size={12} /> Logout
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Hint text */}
                        <p style={{ marginTop: '1rem', fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                            Login mode and device limit are saved with the <strong>Save Permissions</strong> button above.
                        </p>
                    </div>
                    {/* ─────────────────────────────────────────────────────────────────── */}
                </>
            )}
        </div>
    );
};

export default SidebarAccessControl;
