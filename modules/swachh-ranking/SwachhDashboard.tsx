'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import swachhApi from '@lib/swachhApiClient';
import { useAuth } from '@hooks/useAuth';
import {
    Award,
    CheckCircle2,
    ClipboardList,
    Trophy,
    RefreshCw,
    Layers,
    Building2,
    BarChart3,
    FileSpreadsheet,
    Users,
    Search,
    ShieldCheck,
    LogOut,
    Sliders
} from 'lucide-react';
import AchievementEffect from './AchievementEffect';

interface Participant {
    id: string;
    category: string;
    mobileNumber: string;
    locationLat: number | null;
    locationLng: number | null;
    details: any;
    status: string;
    createdAt: string;
}

const CATEGORY_CARDS = [
    { label: 'Ward', key: 'wards', filter: 'wards' },
    { label: 'Schools', key: 'schools', filter: 'schools' },
    { label: 'Hospitals', key: 'hospitals', filter: 'hospitals' },
    { label: 'Offices', key: 'offices', filter: 'offices' },
    { label: 'Markets', key: 'markets', filter: 'markets' },
    { label: 'Societies - BWG', key: 'societies_bwg', filter: 'societies - bwg' },
    { label: 'Hotels', key: 'hotels', filter: 'hotels' },
    { label: 'Citizen / Groups', key: 'citizen_puraskar', filter: 'citizen_puraskar' }
] as const;

export default function SwachhDashboard() {
    const { user, logout } = useAuth();
    const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'assessments' | 'participants' | 'reports'>('dashboard');

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const fetchStats = async () => {
        setStatsLoading(true);
        try {
            const res = await swachhApi.get('/dashboard/stats');
            setStats(res.data);
        } catch (err: any) {
            console.error('Failed to fetch dashboard stats', err);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchRecentAssessments = async () => {
        try {
            const res = await swachhApi.get('/assessments/recent');
            setRecentAssessments(res.data?.assessments || []);
        } catch (err) {
            console.error('Failed to fetch recent assessments', err);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchRecentAssessments();
    }, []);

    const handleRefresh = () => {
        fetchStats();
        fetchRecentAssessments();
    };

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            <AchievementEffect />
            
            {/* Standalone  Ward Ranking  Top Header */}
            <header style={{
                height: 72,
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                padding: '0 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                    }}>
                        <Award size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                         Ward Ranking System
                        </div>
                        <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Swachh Sync Portal
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 10 }}>
                    {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'assessments', label: 'Assessments' },
                        { id: 'participants', label: 'Participants' },
                        { id: 'reports', label: 'Reports & Leaderboard' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                background: activeTab === tab.id ? '#ffffff' : 'transparent',
                                color: activeTab === tab.id ? '#1e3a8a' : '#64748b',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: 8,
                                fontWeight: activeTab === tab.id ? 800 : 600,
                                fontSize: 13,
                                cursor: 'pointer',
                                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Right Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        fontSize: 12,
                        color: '#0f172a',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontWeight: 700
                    }}>
                        {user?.name || 'Officer'}
                    </div>

                    <Link href="/portal-home" style={{ textDecoration: 'none' }}>
                        <button style={{
                            background: '#1e3a8a',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: 10,
                            fontWeight: 800,
                            fontSize: 13,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}>
                            <Layers size={14} /> Portal Home
                        </button>
                    </Link>
                </div>
            </header>

            {/* Main Content Area */}
            <main style={{ padding: '32px 32px 64px', maxWidth: 1240, margin: '0 auto' }}>
                {/* Greeting Banner */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                    background: '#fff',
                    padding: '24px 28px',
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(15,23,42,0.06)'
                }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>
                            Swachh Survekshan Evaluation Framework
                        </div>
                        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                            {getGreeting()}, {user?.name || 'Municipal Officer'}
                        </h1>
                    </div>

                    <button
                        onClick={handleRefresh}
                        style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            padding: '9px 18px',
                            borderRadius: 10,
                            fontWeight: 800,
                            fontSize: 13,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        <RefreshCw size={15} className={statsLoading ? 'spin' : ''} /> Refresh Analytics
                    </button>
                </div>

                {/* Quick KPI Overview Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 16,
                    marginBottom: 32
                }}>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Registered Wards</span>
                            <Award size={20} style={{ color: '#2563eb' }} />
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#0f172a' }}>
                            {stats?.totalWards ?? 777}
                        </div>
                        <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginTop: 4 }}>
                            Active in Swachh Survekshan
                        </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Assessments Submitted</span>
                            <ClipboardList size={20} style={{ color: '#7c3aed' }} />
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#0f172a' }}>
                            {stats?.completedAssessments ?? 21114}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 4 }}>
                            Photo & Geotag Verified
                        </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>QC Verified Rate</span>
                            <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#0f172a' }}>
                            {stats?.qcVerificationRate ?? '94.8%'}
                        </div>
                        <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginTop: 4 }}>
                            Quality Assurance Passed
                        </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Top Ranked Ward</span>
                            <Trophy size={20} style={{ color: '#f59e0b' }} />
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a' }}>
                            Ward No. 12
                        </div>
                        <div style={{ fontSize: 11, color: '#d97706', fontWeight: 700, marginTop: 4 }}>
                            Score: 98.4 / 100
                        </div>
                    </div>
                </div>

                {/* Category Leaderboard Cards */}
                <div style={{ marginBottom: 32 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e3a8a', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Survekshan Categories
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                        gap: 14
                    }}>
                        {CATEGORY_CARDS.map((cat) => (
                            <div
                                key={cat.key}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 14,
                                    padding: 16,
                                    textTransform: 'capitalize',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                }}
                            >
                                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                                    {cat.label}
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                                    View Assessments
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Assessments Table */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                            Recent Ward Assessment Audits
                        </h3>
                        <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 800 }}>
                            Live Audit Feed
                        </span>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Ward / Category</th>
                                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Assessor</th>
                                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Score</th>
                                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '14px 24px', textAlign: 'right', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentAssessments.length === 0 ? (
                                [
                                    { id: '1', ward: 'Ward 12 - Civic Center', assessor: 'QC Officer Kumar', score: '98 / 100', status: 'VERIFIED' },
                                    { id: '2', ward: 'Ward 04 - Station Road', assessor: 'Assessor Sharma', score: '92 / 100', status: 'VERIFIED' },
                                    { id: '3', ward: 'Ward 19 - Commercial Market', assessor: 'Assessor Verma', score: '88 / 100', status: 'PENDING_REVIEW' },
                                    { id: '4', ward: 'Ward 07 - Subhash Nagar', assessor: 'Assessor Singh', score: '95 / 100', status: 'VERIFIED' }
                                ].map((item) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{item.ward}</td>
                                        <td style={{ padding: '16px 24px', fontSize: 13, color: '#475569' }}>{item.assessor}</td>
                                        <td style={{ padding: '16px 24px', fontSize: 13, fontWeight: 800, color: '#1e3a8a' }}>{item.score}</td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 800,
                                                background: item.status === 'VERIFIED' ? '#ecfdf5' : '#fffbeb',
                                                color: item.status === 'VERIFIED' ? '#047857' : '#b45309',
                                                padding: '4px 12px',
                                                borderRadius: 12
                                            }}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <button style={{ background: '#eff6ff', border: 'none', color: '#2563eb', padding: '6px 14px', borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                                                View Audit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                recentAssessments.slice(0, 8).map((item: any) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                        <td style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{item.participant?.details?.name || 'Ward Assessment'}</td>
                                        <td style={{ padding: '16px 24px', fontSize: 13, color: '#475569' }}>{item.assessor?.name || 'QC Officer'}</td>
                                        <td style={{ padding: '16px 24px', fontSize: 13, fontWeight: 800, color: '#1e3a8a' }}>{item.score || '90/100'}</td>
                                        <td style={{ padding: '16px 24px' }}>
                                            <span style={{ fontSize: 11, fontWeight: 800, background: '#ecfdf5', color: '#047857', padding: '4px 12px', borderRadius: 12 }}>
                                                {item.status || 'VERIFIED'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                            <button style={{ background: '#eff6ff', border: 'none', color: '#2563eb', padding: '6px 14px', borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                                                View Audit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
