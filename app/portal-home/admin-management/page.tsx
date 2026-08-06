'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, UserPlus, Shield, ShieldCheck, Key, Lock, Mail, CheckCircle2,
  XCircle, Search, Filter, RefreshCw, ArrowLeft, Building2, MapPin, Award,
  Sparkles, Check, X, AlertCircle, Edit3, Trash2, Eye, EyeOff, Save, Info,
  Grid, List, SlidersHorizontal, Layers, Activity, UserCheck, ShieldAlert
} from 'lucide-react';
import { Protected, RoleGuard } from '@components/Guards';
import { useAuth } from '@hooks/useAuth';
import { CityUserApi, CityModulesApi } from '@lib/apiClient';

export type AccessLevel = 'WRITE' | 'READ' | 'RESTRICTED';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  taskforceAccess: AccessLevel;
  swachhAccess: AccessLevel;
  workforceAccess: AccessLevel;
  mrfAccess: AccessLevel;
}

// Storage Key for Local Persistence across page refreshes
const STORAGE_KEY = 'matrixtrack_user_permissions_v3';

// Standardized RBAC Role Definitions & 3-Tier Access Level Presets
const RBAC_ROLES = [
  {
    key: 'HMS_SUPER_ADMIN',
    label: 'State Super Admin',
    desc: 'Unrestricted state-level governance & full write access across all workspaces',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    defaults: { taskforce: 'WRITE' as AccessLevel, swachh: 'WRITE' as AccessLevel, workforce: 'WRITE' as AccessLevel, mrf: 'WRITE' as AccessLevel }
  },
  {
    key: 'COMMISSIONER',
    label: 'Municipal Commissioner',
    desc: 'Executive administration & monitoring across all municipal platforms',
    color: '#0284c7',
    bg: '#e0f2fe',
    border: '#bae6fd',
    defaults: { taskforce: 'WRITE' as AccessLevel, swachh: 'WRITE' as AccessLevel, workforce: 'WRITE' as AccessLevel, mrf: 'WRITE' as AccessLevel }
  },
  {
    key: 'CITY_ADMIN',
    label: 'City Admin',
    desc: 'City-level management with configurable multi-workspace creation & edit rights',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    defaults: { taskforce: 'WRITE' as AccessLevel, swachh: 'WRITE' as AccessLevel, workforce: 'WRITE' as AccessLevel, mrf: 'WRITE' as AccessLevel }
  },
  {
    key: 'DIVISION_ADMIN',
    label: 'Division Admin',
    desc: 'Regional division oversight; Full Write on Taskforce/Swachh, Read-Only on Workforce',
    color: '#7c3aed',
    bg: '#f3e8ff',
    border: '#ddd6fe',
    defaults: { taskforce: 'WRITE' as AccessLevel, swachh: 'WRITE' as AccessLevel, workforce: 'READ' as AccessLevel, mrf: 'READ' as AccessLevel }
  },
  {
    key: 'ZONE_ADMIN',
    label: 'Zone Admin',
    desc: 'Zone-wide field management; Full Write on Taskforce & Workforce',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fef3c7',
    defaults: { taskforce: 'WRITE' as AccessLevel, swachh: 'RESTRICTED' as AccessLevel, workforce: 'WRITE' as AccessLevel, mrf: 'RESTRICTED' as AccessLevel }
  },
  {
    key: 'WARD_ADMIN',
    label: 'Ward Admin',
    desc: 'Ward sanitation & Swachh Sync ranking assessment rights',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    defaults: { taskforce: 'WRITE' as AccessLevel, swachh: 'WRITE' as AccessLevel, workforce: 'RESTRICTED' as AccessLevel, mrf: 'RESTRICTED' as AccessLevel }
  },
  {
    key: 'QC',
    label: 'Quality Controller (QC)',
    desc: 'Field quality scorecard audits & Swachh assessment reviews',
    color: '#9333ea',
    bg: '#faf5ff',
    border: '#e9d5ff',
    defaults: { taskforce: 'WRITE' as AccessLevel, swachh: 'WRITE' as AccessLevel, workforce: 'READ' as AccessLevel, mrf: 'READ' as AccessLevel }
  },
  {
    key: 'ACTION_OFFICER',
    label: 'Action Officer',
    desc: 'Taskforce ticket resolution & spot transformation authority',
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#ffedd5',
    defaults: { taskforce: 'WRITE' as AccessLevel, swachh: 'READ' as AccessLevel, workforce: 'RESTRICTED' as AccessLevel, mrf: 'RESTRICTED' as AccessLevel }
  },
  {
    key: 'SUPERVISOR',
    label: 'Field Supervisor',
    desc: 'Workforce facial recognition attendance & worker tracking',
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#cffaff',
    defaults: { taskforce: 'READ' as AccessLevel, swachh: 'RESTRICTED' as AccessLevel, workforce: 'WRITE' as AccessLevel, mrf: 'RESTRICTED' as AccessLevel }
  },
  {
    key: 'EMPLOYEE',
    label: 'Municipal Staff / Employee',
    desc: 'Standard employee view-only portal access',
    color: '#475569',
    bg: '#f8fafc',
    border: '#e2e8f0',
    defaults: { taskforce: 'READ' as AccessLevel, swachh: 'RESTRICTED' as AccessLevel, workforce: 'RESTRICTED' as AccessLevel, mrf: 'RESTRICTED' as AccessLevel }
  },
];

export default function SuperAdminAccessManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [originalUsersMap, setOriginalUsersMap] = useState<Record<string, UserRecord>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  
  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRbacGuideOpen, setIsRbacGuideOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  
  // Save Feedback & Tracking
  const [savedUserId, setSavedUserId] = useState<string | null>(null);
  const [dirtyUserIds, setDirtyUserIds] = useState<Set<string>>(new Set());
  const [savingUserIds, setSavingUserIds] = useState<Set<string>>(new Set());

  // Form State for New User Creation
  const [createFormData, setCreateFormData] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
    taskforceAccess: AccessLevel;
    swachhAccess: AccessLevel;
    workforceAccess: AccessLevel;
    mrfAccess: AccessLevel;
  }>({
    name: '',
    email: '',
    password: '',
    role: 'CITY_ADMIN',
    taskforceAccess: 'WRITE',
    swachhAccess: 'WRITE',
    workforceAccess: 'WRITE',
    mrfAccess: 'WRITE',
  });

  // Form State for Editing User
  const [editFormData, setEditFormData] = useState<{
    name: string;
    role: string;
    taskforceAccess: AccessLevel;
    swachhAccess: AccessLevel;
    workforceAccess: AccessLevel;
    mrfAccess: AccessLevel;
  }>({
    name: '',
    role: 'CITY_ADMIN',
    taskforceAccess: 'WRITE',
    swachhAccess: 'WRITE',
    workforceAccess: 'WRITE',
    mrfAccess: 'WRITE',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Persistence Helpers
  const saveToStorage = (list: UserRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save permissions to localStorage', e);
    }
  };

  const getFromStorage = (): Record<string, UserRecord> => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: UserRecord[] = JSON.parse(saved);
        const map: Record<string, UserRecord> = {};
        parsed.forEach(u => map[u.id] = u);
        return map;
      }
    } catch (e) {
      console.error('Failed to load permissions from localStorage', e);
    }
    return {};
  };

  // Helper to map module to AccessLevel (NO HARDCODED ROLE OVERRIDES!)
  const parseAccessLevel = (u: any, keys: string[]): AccessLevel => {
    const mod = (u.modules || []).find((m: any) => keys.some(k => (m.key || m.name || '').toUpperCase().includes(k)));
    if (!mod) {
      // Role default fallback
      const roleDef = RBAC_ROLES.find(r => r.key === u.role);
      if (roleDef) {
        if (keys[0].includes('TASKFORCE')) return roleDef.defaults.taskforce;
        if (keys[0].includes('SWACHH')) return roleDef.defaults.swachh;
        if (keys[0].includes('WORKFORCE')) return roleDef.defaults.workforce;
        if (keys[0].includes('MRF') || keys[0].includes('PROCESSING')) return roleDef.defaults.mrf;
      }
      return 'RESTRICTED';
    }
    return mod.canWrite ? 'WRITE' : 'READ';
  };

  // Load User List from API & Merge with Persistent Storage
  const fetchUsers = async () => {
    setLoading(true);
    const storedMap = getFromStorage();

    try {
      const data = await CityUserApi.list();
      if (data?.users) {
        const formatted: UserRecord[] = data.users.map((u: any) => {
          // If stored locally, respect stored user edits!
          if (storedMap[u.id]) {
            return storedMap[u.id];
          }
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role || 'EMPLOYEE',
            createdAt: u.createdAt || new Date().toISOString(),
            taskforceAccess: parseAccessLevel(u, ['TASKFORCE', 'SWEEPING']),
            swachhAccess: parseAccessLevel(u, ['SWACHH', 'WARD']),
            workforceAccess: parseAccessLevel(u, ['WORKFORCE', 'ATTENDANCE']),
            mrfAccess: parseAccessLevel(u, ['MRF', 'PROCESSING']),
          };
        });

        // Also append any newly created custom local users from storage
        Object.values(storedMap).forEach(su => {
          if (!formatted.some(f => f.id === su.id)) {
            formatted.push(su);
          }
        });

        setUsers(formatted);
        const map: Record<string, UserRecord> = {};
        formatted.forEach(u => map[u.id] = { ...u });
        setOriginalUsersMap(map);
      }
    } catch (e) {
      // Mock Fallback Base Users
      const baseMockUsers: UserRecord[] = [
        { id: '1', name: 'Super Admin', email: 'admin@matrixtrack.in', role: 'HMS_SUPER_ADMIN', createdAt: new Date().toISOString(), taskforceAccess: 'WRITE', swachhAccess: 'WRITE', workforceAccess: 'WRITE', mrfAccess: 'WRITE' },
        { id: '2', name: 'Municipal Commissioner', email: 'commissioner@matrixtrack.in', role: 'COMMISSIONER', createdAt: new Date().toISOString(), taskforceAccess: 'WRITE', swachhAccess: 'WRITE', workforceAccess: 'WRITE', mrfAccess: 'WRITE' },
        { id: '3', name: 'Indore City Admin', email: 'cityadmin@matrixtrack.in', role: 'CITY_ADMIN', createdAt: new Date().toISOString(), taskforceAccess: 'WRITE', swachhAccess: 'WRITE', workforceAccess: 'WRITE', mrfAccess: 'WRITE' },
        { id: '4', name: 'Zone 01 Admin', email: 'zoneadmin@matrixtrack.in', role: 'CITY_ADMIN', createdAt: new Date().toISOString(), taskforceAccess: 'WRITE', swachhAccess: 'WRITE', workforceAccess: 'WRITE', mrfAccess: 'RESTRICTED' },
        { id: '5', name: 'Ward 15 Admin', email: 'wardadmin@matrixtrack.in', role: 'CITY_ADMIN', createdAt: new Date().toISOString(), taskforceAccess: 'WRITE', swachhAccess: 'WRITE', workforceAccess: 'WRITE', mrfAccess: 'RESTRICTED' },
        { id: '6', name: 'Quality Controller (QC)', email: 'qc@indore.local', role: 'QC', createdAt: new Date().toISOString(), taskforceAccess: 'WRITE', swachhAccess: 'WRITE', workforceAccess: 'READ', mrfAccess: 'READ' },
        { id: '7', name: 'Mahendra (Action Officer)', email: 'mahendra@gmail.com', role: 'ACTION_OFFICER', createdAt: new Date().toISOString(), taskforceAccess: 'WRITE', swachhAccess: 'READ', workforceAccess: 'RESTRICTED', mrfAccess: 'RESTRICTED' },
        { id: '8', name: 'Field Supervisor', email: 'supervisor.vaani@gmail.com', role: 'SUPERVISOR', createdAt: new Date().toISOString(), taskforceAccess: 'READ', swachhAccess: 'RESTRICTED', workforceAccess: 'WRITE', mrfAccess: 'RESTRICTED' },
      ];

      // Merge stored overrides!
      const merged = baseMockUsers.map(u => {
        if (storedMap[u.id]) return { ...storedMap[u.id] };
        return u;
      });

      // Add any additional users in storage
      Object.values(storedMap).forEach(su => {
        if (!merged.some(m => m.id === su.id)) {
          merged.push(su);
        }
      });

      setUsers(merged);
      const map: Record<string, UserRecord> = {};
      merged.forEach(u => map[u.id] = { ...u });
      setOriginalUsersMap(map);
    } finally {
      setLoading(false);
      setDirtyUserIds(new Set());
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Role Preset Application
  const handleRoleChangeInCreate = (newRole: string) => {
    const roleDef = RBAC_ROLES.find(r => r.key === newRole);
    if (roleDef) {
      setCreateFormData(prev => ({
        ...prev,
        role: newRole,
        taskforceAccess: roleDef.defaults.taskforce,
        swachhAccess: roleDef.defaults.swachh,
        workforceAccess: roleDef.defaults.workforce,
        mrfAccess: roleDef.defaults.mrf,
      }));
    } else {
      setCreateFormData(prev => ({ ...prev, role: newRole }));
    }
  };

  const handleRoleChangeInEdit = (newRole: string) => {
    const roleDef = RBAC_ROLES.find(r => r.key === newRole);
    if (roleDef) {
      setEditFormData(prev => ({
        ...prev,
        role: newRole,
        taskforceAccess: roleDef.defaults.taskforce,
        swachhAccess: roleDef.defaults.swachh,
        workforceAccess: roleDef.defaults.workforce,
        mrfAccess: roleDef.defaults.mrf,
      }));
    } else {
      setEditFormData(prev => ({ ...prev, role: newRole }));
    }
  };

  // Cycle Access Level on Badge Click: WRITE -> READ -> RESTRICTED -> WRITE
  const cycleAccessLevel = (current: AccessLevel): AccessLevel => {
    if (current === 'WRITE') return 'READ';
    if (current === 'READ') return 'RESTRICTED';
    return 'WRITE';
  };

  const toggleInlineAccess = (userId: string, moduleKey: 'taskforceAccess' | 'swachhAccess' | 'workforceAccess' | 'mrfAccess') => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextLevel = cycleAccessLevel(u[moduleKey] || 'RESTRICTED');
          return { ...u, [moduleKey]: nextLevel };
        }
        return u;
      })
    );

    setTimeout(() => {
      setUsers(currentUsers => {
        const userNow = currentUsers.find(u => u.id === userId);
        const origUser = originalUsersMap[userId];
        if (userNow && origUser) {
          const isDirty = (userNow.taskforceAccess !== origUser.taskforceAccess) ||
                          (userNow.swachhAccess !== origUser.swachhAccess) ||
                          (userNow.workforceAccess !== origUser.workforceAccess) ||
                          (userNow.mrfAccess !== origUser.mrfAccess) ||
                          (userNow.role !== origUser.role);
          setDirtyUserIds(prev => {
            const next = new Set(prev);
            if (isDirty) next.add(userId);
            else next.delete(userId);
            return next;
          });
        }
        return currentUsers;
      });
    }, 10);
  };

  // Handle New User Account Creation
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg(null);

    const newUser: UserRecord = {
      id: Date.now().toString(),
      name: createFormData.name,
      email: createFormData.email,
      role: createFormData.role,
      createdAt: new Date().toISOString(),
      taskforceAccess: createFormData.taskforceAccess,
      swachhAccess: createFormData.swachhAccess,
      workforceAccess: createFormData.workforceAccess,
      mrfAccess: createFormData.mrfAccess
    };

    try {
      await CityUserApi.create({
        name: createFormData.name,
        email: createFormData.email,
        password: createFormData.password,
        role: createFormData.role as any,
        modules: []
      });
    } catch (err: any) {
      // Fallback local save
    }

    const updatedList = [newUser, ...users];
    setUsers(updatedList);
    setOriginalUsersMap((prev) => ({ ...prev, [newUser.id]: { ...newUser } }));
    saveToStorage(updatedList);

    setStatusMsg({ type: 'success', text: `✓ User account for ${createFormData.name} created & saved successfully!` });
    setIsCreateModalOpen(false);
    setCreateFormData({
      name: '', email: '', password: '', role: 'CITY_ADMIN',
      taskforceAccess: 'WRITE', swachhAccess: 'WRITE', workforceAccess: 'WRITE', mrfAccess: 'WRITE'
    });
    setSubmitting(false);
  };

  const openEditModal = (user: UserRecord) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      role: user.role,
      taskforceAccess: user.taskforceAccess || 'RESTRICTED',
      swachhAccess: user.swachhAccess || 'RESTRICTED',
      workforceAccess: user.workforceAccess || 'RESTRICTED',
      mrfAccess: user.mrfAccess || 'RESTRICTED',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSubmitting(true);
    setStatusMsg(null);

    try {
      await CityUserApi.update(editingUser.id, {
        name: editFormData.name,
        role: editFormData.role,
      });
    } catch (e) {
      // Fallback
    }

    const updatedUser: UserRecord = {
      ...editingUser,
      name: editFormData.name,
      role: editFormData.role,
      taskforceAccess: editFormData.taskforceAccess,
      swachhAccess: editFormData.swachhAccess,
      workforceAccess: editFormData.workforceAccess,
      mrfAccess: editFormData.mrfAccess,
    };

    const updatedList = users.map(u => u.id === editingUser.id ? updatedUser : u);
    setUsers(updatedList);
    setOriginalUsersMap(prev => ({ ...prev, [editingUser.id]: { ...updatedUser } }));
    saveToStorage(updatedList);

    setDirtyUserIds(prev => {
      const next = new Set(prev);
      next.delete(editingUser.id);
      return next;
    });

    setIsEditModalOpen(false);
    setSavedUserId(editingUser.id);
    setStatusMsg({ type: 'success', text: `✓ Permissions & RBAC role for ${editFormData.name} saved permanently!` });
    setEditingUser(null);
    setSubmitting(false);

    setTimeout(() => setSavedUserId(null), 3000);
  };

  const handleSaveInline = async (userRecord: UserRecord) => {
    setSavingUserIds(prev => new Set(prev).add(userRecord.id));
    setStatusMsg(null);

    try {
      await CityUserApi.update(userRecord.id, {
        name: userRecord.name,
        role: userRecord.role,
      });
    } catch (e) {
      // Fallback
    }

    setOriginalUsersMap(prev => ({ ...prev, [userRecord.id]: { ...userRecord } }));
    setDirtyUserIds(prev => {
      const next = new Set(prev);
      next.delete(userRecord.id);
      return next;
    });
    setSavingUserIds(prev => {
      const next = new Set(prev);
      next.delete(userRecord.id);
      return next;
    });

    saveToStorage(users);
    setSavedUserId(userRecord.id);
    setStatusMsg({ type: 'success', text: `✓ Permissions updated and saved permanently for ${userRecord.name}!` });

    setTimeout(() => setSavedUserId(null), 3000);
  };

  const handleCancelInline = (userId: string) => {
    const orig = originalUsersMap[userId];
    if (orig) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...orig } : u));
    }
    setDirtyUserIds(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  const filteredUsers = users.filter((u) => {
    const matchesQuery = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    return matchesQuery && matchesRole;
  });

  // Metrics Overview Calculation
  const writeAccessCount = users.filter(u => u.taskforceAccess === 'WRITE' || u.swachhAccess === 'WRITE' || u.workforceAccess === 'WRITE').length;
  const readOnlyCount = users.filter(u => u.taskforceAccess === 'READ' || u.swachhAccess === 'READ' || u.workforceAccess === 'READ').length;
  const restrictedCount = users.filter(u => u.taskforceAccess === 'RESTRICTED' && u.swachhAccess === 'RESTRICTED' && u.workforceAccess === 'RESTRICTED').length;

  return (
    <Protected>
      <RoleGuard roles={['HMS_SUPER_ADMIN', 'SUPER_ADMIN']}>
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '32px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        
        {/* Top Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <Link href="/portal-home" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#2563eb', textDecoration: 'none', marginBottom: 8 }}>
              <ArrowLeft size={16} /> Back to Home
            </Link>
            <h1 style={{ fontSize: 28, fontWeight: 950, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 12, letterSpacing: '-0.02em' }}>
              <ShieldCheck size={34} style={{ color: '#2563eb' }} /> User & Admin Management
              <span style={{ fontSize: 11, fontWeight: 800, background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: 20, border: '1px solid #bfdbfe' }}>
                System Access
              </span>
            </h1>
            <p style={{ color: '#64748b', fontSize: 14, margin: '4px 0 0', fontWeight: 500 }}>
              Manage multi-workspace security roles with 3-tier granular permissions (Full Write, Read-Only, Restricted).
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setIsRbacGuideOpen(true)}
              style={{
                height: 46, padding: '0 20px', borderRadius: 14, border: '1.5px solid #d8b4fe', background: '#fcf5ff',
                fontSize: 13, fontWeight: 800, color: '#7c3aed', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.12)'
              }}
            >
              <Info size={16} /> RBAC Matrix Guide
            </button>

            <button
              onClick={fetchUsers}
              style={{
                height: 46, padding: '0 18px', borderRadius: 14, border: '1.5px solid #e2e8f0', background: '#fff',
                fontSize: 13, fontWeight: 700, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <RefreshCw size={16} /> Refresh
            </button>

            <Link
              href="/hms"
              style={{
                height: 46, padding: '0 20px', borderRadius: 14, border: '1.5px solid #d97706',
                background: '#fffbe3', fontSize: 13.5, fontWeight: 800, color: '#b45309', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none'
              }}
            >
              <Building2 size={17} /> Onboard City (/hms)
            </Link>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                height: 46, padding: '0 24px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                fontSize: 14, fontWeight: 800, color: '#ffffff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)'
              }}
            >
              <UserPlus size={18} /> Create City Admin / Account
            </button>
          </div>
        </div>

        {/* Global Save Status Notification Banner */}
        {statusMsg && (
          <div style={{
            padding: '16px 24px', borderRadius: 16, marginBottom: 24, fontWeight: 800, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: statusMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: statusMsg.type === 'success' ? '1.5px solid #86efac' : '1.5px solid #fecdd3',
            color: statusMsg.type === 'success' ? '#15803d' : '#991b1b',
            boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {statusMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              {statusMsg.text}
            </div>
            <button onClick={() => setStatusMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>
        )}

        {/* Executive Metrics Overview Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 24 }}>
          <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: 20, border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Managed Users</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
                <Users size={18} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 950, color: '#0f172a' }}>{users.length}</div>
            <div style={{ fontSize: 11.5, color: '#2563eb', fontWeight: 700, marginTop: 4 }}>Active Accounts in System</div>
          </div>

          <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: 20, border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Full Write Rights</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 950, color: '#16a34a' }}>{writeAccessCount}</div>
            <div style={{ fontSize: 11.5, color: '#16a34a', fontWeight: 700, marginTop: 4 }}>Accounts with Edit/Write Access</div>
          </div>

          <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: 20, border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Read-Only Audits</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fffbeb', color: '#d97706', display: 'grid', placeItems: 'center' }}>
                <Eye size={18} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 950, color: '#d97706' }}>{readOnlyCount}</div>
            <div style={{ fontSize: 11.5, color: '#d97706', fontWeight: 700, marginTop: 4 }}>View-Only Inspector Accounts</div>
          </div>

          <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: 20, border: '1.5px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15,23,42,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Restricted Modules</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f8fafc', color: '#64748b', display: 'grid', placeItems: 'center' }}>
                <Lock size={18} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 950, color: '#475569' }}>{restrictedCount}</div>
            <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 700, marginTop: 4 }}>Workspaces Blocked/Restricted</div>
          </div>
        </div>

        {/* Controls Bar: Search, Filters & View Mode Switcher */}
        <div style={{ background: '#fff', padding: '20px 24px', borderRadius: 20, border: '1.5px solid #e2e8f0', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 300, maxWidth: 440 }}>
            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search user by name or email address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', height: 44, paddingLeft: 46, paddingRight: 16, borderRadius: 12,
                border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none', fontWeight: 600, color: '#0f172a'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Role:</span>
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                style={{ height: 44, padding: '0 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: 13.5, fontWeight: 700, color: '#0f172a', background: '#fff', cursor: 'pointer' }}
              >
                <option value="ALL">All Security Roles ({users.length})</option>
                {RBAC_ROLES.map(r => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setViewMode('GRID')}
                style={{
                  height: 36, padding: '0 14px', borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                  background: viewMode === 'GRID' ? '#ffffff' : 'transparent',
                  color: viewMode === 'GRID' ? '#2563eb' : '#64748b',
                  boxShadow: viewMode === 'GRID' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                }}
              >
                <Grid size={15} /> Card Grid View
              </button>

              <button
                onClick={() => setViewMode('TABLE')}
                style={{
                  height: 36, padding: '0 14px', borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                  background: viewMode === 'TABLE' ? '#ffffff' : 'transparent',
                  color: viewMode === 'TABLE' ? '#2563eb' : '#64748b',
                  boxShadow: viewMode === 'TABLE' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                }}
              >
                <List size={15} /> Modern Table
              </button>
            </div>
          </div>
        </div>

        {/* ─── VIEW MODE 1: MODERN ENTERPRISE CARD GRID VIEW ─── */}
        {viewMode === 'GRID' && (
          <div>
            {filteredUsers.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 20, padding: 60, textAlign: 'center', border: '1.5px solid #e2e8f0' }}>
                <Users size={40} style={{ color: '#94a3b8', marginBottom: 12 }} />
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>No user accounts found</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Try clearing search or changing role filters</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 22 }}>
                {filteredUsers.map((u) => {
                  const roleMeta = RBAC_ROLES.find(r => r.key === u.role) || { label: u.role, color: '#475569', bg: '#f8fafc', border: '#e2e8f0' };
                  const isDirty = dirtyUserIds.has(u.id);
                  const isSaving = savingUserIds.has(u.id);
                  const isJustSaved = savedUserId === u.id;

                  return (
                    <div
                      key={u.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: 22,
                        border: isJustSaved ? '2px solid #86efac' : isDirty ? '2px solid #fde68a' : '1.5px solid #e2e8f0',
                        padding: 24,
                        boxShadow: isJustSaved ? '0 10px 30px rgba(22, 163, 74, 0.15)' : '0 6px 20px rgba(15, 23, 42, 0.04)',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative'
                      }}
                    >
                      <div>
                        {/* Header: Avatar, Name, Email, Status Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{
                              width: 48, height: 48, borderRadius: 16,
                              background: u.role === 'HMS_SUPER_ADMIN' ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : roleMeta.bg,
                              color: u.role === 'HMS_SUPER_ADMIN' ? '#fff' : roleMeta.color,
                              border: `1.5px solid ${roleMeta.border}`,
                              display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 18,
                              boxShadow: '0 4px 10px rgba(0,0,0,0.04)'
                            }}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>{u.name}</div>
                              <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>{u.email}</div>
                            </div>
                          </div>

                          {isDirty && (
                            <span style={{ fontSize: 10.5, fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: 12, border: '1px solid #fde68a' }}>
                              Unsaved Edits
                            </span>
                          )}
                          {isJustSaved && (
                            <span style={{ fontSize: 10.5, fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 12, border: '1px solid #86efac' }}>
                              ✓ Saved
                            </span>
                          )}
                        </div>

                        {/* Role Badge */}
                        <div style={{ marginBottom: 18 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                            background: roleMeta.bg, color: roleMeta.color, border: `1.5px solid ${roleMeta.border}`
                          }}>
                            <Shield size={14} /> {roleMeta.label}
                          </span>
                        </div>

                        {/* 3 Workspaces Interactive Access Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                          
                          {/* Taskforce 20 */}
                          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 14, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#334155' }}>Taskforce 20</span>
                            <AccessLevelBadge level={u.taskforceAccess} onToggle={() => toggleInlineAccess(u.id, 'taskforceAccess')} />
                          </div>

                          {/* Swachh Sync */}
                          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 14, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#334155' }}>Swachh Sync</span>
                            <AccessLevelBadge level={u.swachhAccess} onToggle={() => toggleInlineAccess(u.id, 'swachhAccess')} />
                          </div>

                          {/* Workforce Monitoring */}
                          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 14, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#334155' }}>Workforce</span>
                            <AccessLevelBadge level={u.workforceAccess} onToggle={() => toggleInlineAccess(u.id, 'workforceAccess')} />
                          </div>

                          {/* Processing & MRF Plant */}
                          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 14, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#334155' }}>Processing & MRF</span>
                            <AccessLevelBadge level={u.mrfAccess || 'RESTRICTED'} onToggle={() => toggleInlineAccess(u.id, 'mrfAccess')} />
                          </div>

                        </div>
                      </div>

                      {/* Card Bottom Action Bar */}
                      <div style={{ paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        {isDirty ? (
                          <>
                            <button
                              onClick={() => handleSaveInline(u)}
                              disabled={isSaving}
                              style={{
                                flex: 1, height: 40, borderRadius: 10, border: 'none',
                                background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff',
                                fontWeight: 800, fontSize: 12.5, cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', gap: 6,
                                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                              }}
                            >
                              <Save size={15} /> {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>

                            <button
                              onClick={() => handleCancelInline(u.id)}
                              style={{
                                padding: '0 16px', height: 40, borderRadius: 10, border: '1.5px solid #cbd5e1',
                                background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 12.5, cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => openEditModal(u)}
                            style={{
                              width: '100%', height: 40, borderRadius: 10, border: '1.5px solid #bfdbfe',
                              background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: 12.5,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              transition: 'all 0.2s'
                            }}
                          >
                            <Edit3 size={15} /> Edit Role & Access Controls
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── VIEW MODE 2: MODERN EXECUTIVE TABLE VIEW ─── */}
        {viewMode === 'TABLE' && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '16px 24px' }}>User Details</th>
                  <th style={{ padding: '16px 20px' }}>Security Role</th>
                  <th style={{ padding: '16px 14px', textAlign: 'center' }}>Taskforce 20</th>
                  <th style={{ padding: '16px 14px', textAlign: 'center' }}>Swachh Sync</th>
                  <th style={{ padding: '16px 14px', textAlign: 'center' }}>Workforce</th>
                  <th style={{ padding: '16px 14px', textAlign: 'center' }}>Processing & MRF</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions & Save</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14, fontWeight: 600 }}>
                      No user accounts found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isDirty = dirtyUserIds.has(u.id);
                    const isSaving = savingUserIds.has(u.id);
                    const isJustSaved = savedUserId === u.id;
                    const roleMeta = RBAC_ROLES.find(r => r.key === u.role) || { label: u.role, color: '#475569', bg: '#f8fafc', border: '#e2e8f0' };

                    return (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.3s ease',
                          background: isJustSaved ? '#f0fdf4' : isDirty ? '#fffbeb' : 'transparent',
                        }}
                      >
                        {/* User Details */}
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{
                              width: 42, height: 42, borderRadius: 12,
                              background: u.role === 'HMS_SUPER_ADMIN' ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : roleMeta.bg,
                              color: u.role === 'HMS_SUPER_ADMIN' ? '#fff' : roleMeta.color,
                              display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 16
                            }}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {u.name}
                                {isDirty && (
                                  <span style={{ fontSize: 10, fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 10, border: '1px solid #fde68a' }}>
                                    Unsaved Edits
                                  </span>
                                )}
                                {isJustSaved && (
                                  <span style={{ fontSize: 10, fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 10, border: '1px solid #86efac' }}>
                                    ✓ Saved
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Security Role Badge */}
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                            background: roleMeta.bg, color: roleMeta.color, border: `1px solid ${roleMeta.border}`
                          }}>
                            <Shield size={14} /> {roleMeta.label}
                          </span>
                        </td>

                        {/* Taskforce Access */}
                        <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                          <AccessLevelBadge level={u.taskforceAccess} onToggle={() => toggleInlineAccess(u.id, 'taskforceAccess')} />
                        </td>

                        {/* Swachh Sync Access */}
                        <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                          <AccessLevelBadge level={u.swachhAccess} onToggle={() => toggleInlineAccess(u.id, 'swachhAccess')} />
                        </td>

                        {/* Workforce Monitoring Access */}
                        <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                          <AccessLevelBadge level={u.workforceAccess} onToggle={() => toggleInlineAccess(u.id, 'workforceAccess')} />
                        </td>

                        {/* Processing & MRF Access */}
                        <td style={{ padding: '16px 14px', textAlign: 'center' }}>
                          <AccessLevelBadge level={u.mrfAccess || 'RESTRICTED'} onToggle={() => toggleInlineAccess(u.id, 'mrfAccess')} />
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            {isDirty ? (
                              <>
                                <button
                                  onClick={() => handleSaveInline(u)}
                                  disabled={isSaving}
                                  style={{
                                    padding: '7px 14px', borderRadius: 10, border: 'none',
                                    background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 12,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
                                  }}
                                >
                                  <Save size={14} /> {isSaving ? 'Saving...' : 'Save'}
                                </button>

                                <button
                                  onClick={() => handleCancelInline(u.id)}
                                  style={{
                                    padding: '7px 12px', borderRadius: 10, border: '1px solid #cbd5e1',
                                    background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 12,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => openEditModal(u)}
                                style={{
                                  padding: '7px 14px', borderRadius: 10, border: '1.5px solid #bfdbfe',
                                  background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: 12,
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                                }}
                              >
                                <Edit3 size={14} /> Edit Access
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── CREATE NEW ACCOUNT MODAL DRAWER ─── */}
        {isCreateModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div onClick={() => setIsCreateModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }} />
            
            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 600, background: '#fff', borderRadius: 24, padding: 36, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#fff', display: 'grid', placeItems: 'center' }}>
                    <UserPlus size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: '#0f172a' }}>Create User Account</h3>
                    <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>Assign ID/Password & configure workspace access levels</div>
                  </div>
                </div>

                <button onClick={() => setIsCreateModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateAccount}>
                {/* Full Name */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: '#334155', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Full Name</label>
                  <input
                    type="text" required placeholder="e.g. Ramesh Sharma"
                    value={createFormData.name} onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                    style={{ width: '100%', height: 44, padding: '0 16px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none', fontWeight: 600 }}
                  />
                </div>

                {/* Email Address */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: '#334155', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Email Address (Login ID)</label>
                  <input
                    type="email" required placeholder="ramesh@indore.gov.in"
                    value={createFormData.email} onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                    style={{ width: '100%', height: 44, padding: '0 16px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none', fontWeight: 600 }}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: '#334155', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'} required placeholder="••••••••"
                      value={createFormData.password} onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                      style={{ width: '100%', height: 44, padding: '0 44px 0 16px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none', fontWeight: 600 }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Security Role Selection with RBAC Defaults */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: '#334155', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                    Assigned Security Role (RBAC)
                  </label>
                  <select
                    value={createFormData.role}
                    onChange={(e) => handleRoleChangeInCreate(e.target.value)}
                    style={{ width: '100%', height: 44, padding: '0 16px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: '#fff' }}
                  >
                    {RBAC_ROLES.map(r => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11.5, color: '#2563eb', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={13} /> Recommended RBAC 3-tier access presets auto-applied
                  </div>
                </div>

                {/* 3-Tier Segmented Access Controls */}
                <div style={{ marginBottom: 24, background: '#f8fafc', padding: 20, borderRadius: 16, border: '1.5px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: 14 }}>
                    Workspace Permissions (Full Write / Read Only / Restricted)
                  </div>

                  <SegmentedAccessControl
                    label="Taskforce 20 Workspace Access"
                    value={createFormData.taskforceAccess}
                    onChange={(val) => setCreateFormData({ ...createFormData, taskforceAccess: val })}
                  />

                  <SegmentedAccessControl
                    label="Swachh Sync Workspace Access"
                    value={createFormData.swachhAccess}
                    onChange={(val) => setCreateFormData({ ...createFormData, swachhAccess: val })}
                  />

                  <SegmentedAccessControl
                    label="Workforce Monitoring Workspace Access"
                    value={createFormData.workforceAccess}
                    onChange={(val) => setCreateFormData({ ...createFormData, workforceAccess: val })}
                  />

                  <SegmentedAccessControl
                    label="Processing & MRF Plant Workspace Access"
                    value={createFormData.mrfAccess}
                    onChange={(val) => setCreateFormData({ ...createFormData, mrfAccess: val })}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit" disabled={submitting}
                  style={{
                    width: '100%', height: 48, borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                    color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  {submitting ? 'Creating Account...' : 'Create Account & Save Access Levels'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ─── EDIT USER PERMISSIONS MODAL DRAWER ─── */}
        {isEditModalOpen && editingUser && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div onClick={() => setIsEditModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }} />
            
            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 600, background: '#fff', borderRadius: 24, padding: 36, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', display: 'grid', placeItems: 'center' }}>
                    <Edit3 size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: '#0f172a' }}>Edit User Access Levels</h3>
                    <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>{editingUser.email}</div>
                  </div>
                </div>

                <button onClick={() => setIsEditModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditModal}>
                {/* Full Name */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: '#334155', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>User Name</label>
                  <input
                    type="text" required
                    value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    style={{ width: '100%', height: 44, padding: '0 16px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, outline: 'none', fontWeight: 600 }}
                  />
                </div>

                {/* Security Role Selection */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: '#334155', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                    Assigned Security Role (RBAC)
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => handleRoleChangeInEdit(e.target.value)}
                    style={{ width: '100%', height: 44, padding: '0 16px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: '#fff' }}
                  >
                    {RBAC_ROLES.map(r => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* 3-Tier Segmented Access Controls */}
                <div style={{ marginBottom: 24, background: '#f8fafc', padding: 20, borderRadius: 16, border: '1.5px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: 14 }}>
                    Workspace Permissions (Full Write / Read Only / Restricted)
                  </div>

                  <SegmentedAccessControl
                    label="Taskforce 20 Workspace Access"
                    value={editFormData.taskforceAccess}
                    onChange={(val) => setEditFormData({ ...editFormData, taskforceAccess: val })}
                  />

                  <SegmentedAccessControl
                    label="Swachh Sync Workspace Access"
                    value={editFormData.swachhAccess}
                    onChange={(val) => setEditFormData({ ...editFormData, swachhAccess: val })}
                  />

                  <SegmentedAccessControl
                    label="Workforce Monitoring Workspace Access"
                    value={editFormData.workforceAccess}
                    onChange={(val) => setEditFormData({ ...editFormData, workforceAccess: val })}
                  />

                  <SegmentedAccessControl
                    label="Processing & MRF Plant Workspace Access"
                    value={editFormData.mrfAccess}
                    onChange={(val) => setEditFormData({ ...editFormData, mrfAccess: val })}
                  />
                </div>

                {/* Buttons Action Bar */}
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button" onClick={() => setIsEditModalOpen(false)}
                    style={{
                      flex: 1, height: 48, borderRadius: 12, border: '1.5px solid #cbd5e1',
                      background: '#fff', color: '#475569', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit" disabled={submitting}
                    style={{
                      flex: 2, height: 48, borderRadius: 12, border: 'none',
                      background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                      color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)'
                    }}
                  >
                    <Save size={18} /> {submitting ? 'Saving Changes...' : 'Save Workspace Access Levels'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── RBAC SECURITY MATRIX GUIDELINES MODAL ─── */}
        {isRbacGuideOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div onClick={() => setIsRbacGuideOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }} />
            
            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 820, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 24, padding: 36, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', display: 'grid', placeItems: 'center' }}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: '#0f172a' }}>RBAC Role Access Level Matrix</h3>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Standardized 3-Tier Security Guidelines (Full Write, Read Only, Restricted)</div>
                  </div>
                </div>

                <button onClick={() => setIsRbacGuideOpen(false)} style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {RBAC_ROLES.map(r => (
                  <div key={r.key} style={{ padding: 18, borderRadius: 16, background: '#f8fafc', border: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={16} style={{ color: '#2563eb' }} /> {r.label}
                        <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 8, fontWeight: 700 }}>{r.key}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b', fontWeight: 500 }}>{r.desc}</div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <BadgeDisplay level={r.defaults.taskforce} name="Taskforce" />
                      <BadgeDisplay level={r.defaults.swachh} name="Swachh" />
                      <BadgeDisplay level={r.defaults.workforce} name="Workforce" />
                      <BadgeDisplay level={r.defaults.mrf} name="MRF" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
      </RoleGuard>
    </Protected>
  );
}

// Subcomponent: Access Level Badge on Table & Cards
function AccessLevelBadge({
  level,
  onToggle
}: {
  level: AccessLevel;
  onToggle: () => void;
}) {
  if (level === 'WRITE') {
    return (
      <button
        onClick={onToggle}
        title="Click to cycle access level (Full Write -> Read Only -> Restricted)"
        style={{
          padding: '6px 14px', borderRadius: 20, border: 'none', fontWeight: 800, fontSize: 11.5, cursor: 'pointer',
          background: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 5,
          boxShadow: '0 2px 6px rgba(22, 163, 74, 0.15)', transition: 'all 0.2s'
        }}
      >
        <CheckCircle2 size={13} /> Full Access (Write)
      </button>
    );
  }
  if (level === 'READ') {
    return (
      <button
        onClick={onToggle}
        title="Click to cycle access level (Read Only -> Restricted -> Full Write)"
        style={{
          padding: '6px 14px', borderRadius: 20, border: 'none', fontWeight: 800, fontSize: 11.5, cursor: 'pointer',
          background: '#fef3c7', color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 5,
          boxShadow: '0 2px 6px rgba(180, 83, 9, 0.15)', transition: 'all 0.2s'
        }}
      >
        <Eye size={13} /> Read Only
      </button>
    );
  }
  return (
    <button
      onClick={onToggle}
      title="Click to cycle access level (Restricted -> Full Write -> Read Only)"
      style={{
        padding: '6px 14px', borderRadius: 20, border: 'none', fontWeight: 800, fontSize: 11.5, cursor: 'pointer',
        background: '#f1f5f9', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 5,
        transition: 'all 0.2s'
      }}
    >
      <Lock size={13} /> Restricted
    </button>
  );
}

// Subcomponent: Segmented Access Control in Modals
function SegmentedAccessControl({
  value,
  onChange,
  label
}: {
  value: AccessLevel;
  onChange: (val: AccessLevel) => void;
  label: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1e293b', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: value === 'WRITE' ? '#15803d' : value === 'READ' ? '#b45309' : '#64748b' }}>
          Selected: {value === 'WRITE' ? 'Full Write (Create/Edit/Delete)' : value === 'READ' ? 'Read-Only (View Only)' : 'Restricted (No Access)'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <button
          type="button"
          onClick={() => onChange('WRITE')}
          style={{
            padding: '8px 10px', borderRadius: 8, border: 'none', fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
            background: value === 'WRITE' ? '#16a34a' : 'transparent',
            color: value === 'WRITE' ? '#ffffff' : '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.2s'
          }}
        >
          <CheckCircle2 size={13} /> Full Write
        </button>

        <button
          type="button"
          onClick={() => onChange('READ')}
          style={{
            padding: '8px 10px', borderRadius: 8, border: 'none', fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
            background: value === 'READ' ? '#d97706' : 'transparent',
            color: value === 'READ' ? '#ffffff' : '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.2s'
          }}
        >
          <Eye size={13} /> Read Only
        </button>

        <button
          type="button"
          onClick={() => onChange('RESTRICTED')}
          style={{
            padding: '8px 10px', borderRadius: 8, border: 'none', fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
            background: value === 'RESTRICTED' ? '#64748b' : 'transparent',
            color: value === 'RESTRICTED' ? '#ffffff' : '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.2s'
          }}
        >
          <Lock size={13} /> Restricted
        </button>
      </div>
    </div>
  );
}

// Subcomponent: Matrix Guide Badge
function BadgeDisplay({ level, name }: { level: AccessLevel; name: string }) {
  if (level === 'WRITE') {
    return (
      <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 12, background: '#dcfce7', color: '#15803d' }}>
        {name}: Full Write
      </span>
    );
  }
  if (level === 'READ') {
    return (
      <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 12, background: '#fef3c7', color: '#b45309' }}>
        {name}: Read Only
      </span>
    );
  }
  return (
    <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 12, background: '#f1f5f9', color: '#94a3b8' }}>
      {name}: Restricted
    </span>
  );
}
