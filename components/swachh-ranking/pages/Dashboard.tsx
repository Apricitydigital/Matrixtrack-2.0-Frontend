import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from '../react-router-shim';
import api from '../api/axios';
import { fireAchievement } from '../components/AchievementEffect';
import { fireSubmissionAlert } from '../components/LiveNotification';
import {
    LayoutDashboard,
    CheckCircle2,
    Clock,
    MapPin,
    Eye,
    X,
    ClipboardList,
    Calendar,
    ArrowRight,
    Trophy,
    Award,
    Users,
    Users2,
    Building2,
    AlertCircle,
    Navigation,
    Shield,
    Activity,
    TrendingUp,
    Zap,
    BarChart3,
    RefreshCw,
    Search,
    ChevronRight,
    Target,
    Layers
} from 'lucide-react';
import NoAccess from '../components/NoAccess';
import { hasPermission } from '../utils/accessControl';

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

const Dashboard = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const [assignments, setAssignments] = useState<Participant[]>([]);
    const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
    const [qcStats, setQCStats] = useState<any>(null);
    const [qcReviews, setQCReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState<string | null>(null);
    const [assessorActivity, setAssessorActivity] = useState<any>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [selectedReview, setSelectedReview] = useState<any>(null);
    const [qcRemarks, setQCRemarks] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [saDrawer, setSaDrawer] = useState<{ categoryKey: string; label: string; data: any[]; loading: boolean } | null>(null);
    const [saAnswerModal, setSaAnswerModal] = useState<{ loading: boolean; data: any } | null>(null);
    const [activitySearch, setActivitySearch] = useState('');
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [assessorDrawer, setAssessorDrawer] = useState<{ title: string; subtitle: string; data: any[] } | null>(null);
    const prevCompletedTodayRef = useRef<number | null>(null);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    useEffect(() => {
        if (user) {
            if (user.role === 'accessor') {
                fetchAssignments();
            } else if (user.role === 'qc') {
                fetchQCData();
                fetchRecentAssessments();
            } else {
                fetchRecentAssessments();
                fetchDashboardStats();
                fetchAssessorActivity();
            }
        }
    }, []);

    const fetchAssignments = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const response = await api.get(`/participation?assignedToId=${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssignments(response.data);
        } catch (err) {
            console.error('Failed to fetch assignments');
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentAssessments = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const response = await api.get('/assessments/all-completed', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecentAssessments(response.data);
        } catch (err) {
            console.error('Failed to fetch recent assessments', err);
        } finally {
            setLoading(false);
        }
    };

    const resolveImageUrl = (src?: string) => {
        if (!src) return '';
        const trimmed = src.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
            return trimmed;
        }

        // Ensure remote images load correctly from the VITE_MEDIA_BASE_URL config (or standard fallback)
        const mediaBase = import.meta.env.VITE_MEDIA_BASE_URL?.replace(/\/+$/, '');
        const envBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');
        const fallback = import.meta.env.DEV ? 'http://localhost:5000' : (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '');

        let base = '';
        if (mediaBase && mediaBase.length > 0) {
            base = mediaBase;
        } else if (envBase && envBase.length > 0) {
            base = envBase;
        } else {
            base = fallback;
        }

        const needsSlash = trimmed.startsWith('/') ? '' : '/';
        return `${base}${needsSlash}${trimmed}`;
    };

    const fetchQCData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const [statsRes, reviewsRes] = await Promise.all([
                api.get(`/assessments/qc/stats/${user.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                api.get(`/assessments/qc/reviews/${user.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            console.log("QC STATS RESPONSE:", statsRes.data);
        console.log("QC REVIEWS RESPONSE:", reviewsRes.data);
            setQCStats(statsRes.data);
            setQCReviews(reviewsRes.data);
        } catch (err) {
            console.error('Failed to fetch QC data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleQCAction = async (assessmentId: string, status: string) => {
        if (status === 'reassessment' && !qcRemarks) {
            alert('Please provide remarks for reassessment');
            return;
        }

        setActionLoading(true);
        const token = localStorage.getItem('token');
        try {
            await api.patch(`/assessments/qc/update-status/${assessmentId}`, {
                status,
                qcRemarks
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Assessment ${status === 'under_review' ? 'Approved & Sent to Admin' : 'Sent for Reassessment'}`);
            if (status === 'under_review') {
                fireAchievement({ type: 'approved', message: 'QC Approved!' });
            }
            setSelectedReview(null);
            setQCRemarks('');
            fetchQCData();
        } catch (err: any) {
            console.error('Failed to update assessment status', err);
            const serverMsg = err.response?.data?.error || '';
            const serverDetails = err.response?.data?.details || '';
            alert(`Failed: ${err.response?.data?.message || 'Server error'}\n${serverMsg} ${serverDetails ? `(${serverDetails})` : ''}`);
        } finally {
            setActionLoading(false);
        }
    };

    const fetchDashboardStats = async (silent = false) => {
        if (!user) return;
        if (!silent) setStatsLoading(true);
        setStatsError(null);
        try {
            const response = await api.get('/admin/stats');
            setStats(response.data);
        } catch (err: any) {
            console.error('Failed to fetch dashboard stats', err);
            // Default to empty stats cleanly if no database records exist
            setStats({
                totalParticipants: 0,
                totalAssessments: 0,
                qcApproved: 0,
                underReview: 0,
                reassessment: 0,
                categoryCounts: {
                    wards: 0,
                    schools: 0,
                    hospitals: 0,
                    offices: 0,
                    markets: 0,
                    societies_bwg: 0,
                    hotels: 0,
                    citizen_puraskar: 0,
                }
            });
        } finally {
            if (!silent) setStatsLoading(false);
        }
    };

    const fetchAssessorActivity = async () => {
        if (!user) return;
        try {
            const res = await api.get('/dashboard/assessor-stats');
            const data = res.data;
            const newCount: number = data?.completedToday ?? 0;
            const prev = prevCompletedTodayRef.current;
            if (prev !== null && newCount > prev) {
                const diff = newCount - prev;
                for (let i = 0; i < diff; i++) {
                    setTimeout(() => fireSubmissionAlert(undefined, 'New Assessment Submitted'), i * 800);
                }
            }
            prevCompletedTodayRef.current = newCount;
            setAssessorActivity(data);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Failed to fetch assessor activity', err);
        }
    };

    const openCategoryDrawer = async (categoryKey: string, label: string) => {
        setSaDrawer({ categoryKey, label, data: [], loading: true });
        const token = localStorage.getItem('token');
        try {
            const res = await api.get(`/admin/sa-category/${categoryKey}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSaDrawer(prev => prev ? { ...prev, data: res.data, loading: false } : null);
        } catch {
            setSaDrawer(prev => prev ? { ...prev, loading: false } : null);
        }
    };

    const openSAStatusDrawer = async (status: 'Draft' | 'Submitted' | 'Not Started', label: string) => {
        setSaDrawer({ categoryKey: '', label, data: [], loading: true });
        const token = localStorage.getItem('token');
        try {
            const results = await Promise.all(
                CATEGORY_CARDS.map(({ key }) =>
                    api.get(`/admin/sa-category/${key}`, { headers: { Authorization: `Bearer ${token}` } })
                        .then(r => r.data)
                        .catch(() => [])
                )
            );
            const all = (results as any[][]).flat();
            const filtered = status === 'Not Started'
                ? all.filter((p: any) => !p.status || p.status === 'Not Started')
                : all.filter((p: any) => p.status === status);
            setSaDrawer(prev => prev ? { ...prev, data: filtered, loading: false } : null);
        } catch {
            setSaDrawer(prev => prev ? { ...prev, loading: false } : null);
        }
    };

    const openSAAnswers = async (saId: string) => {
        setSaAnswerModal({ loading: true, data: null });
        const token = localStorage.getItem('token');
        try {
            const res = await api.get(`/self-assessment/qc/${saId}/detail`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSaAnswerModal({ loading: false, data: res.data });
        } catch {
            setSaAnswerModal({ loading: false, data: null });
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!user || user.role !== 'admin') return;
        fetchDashboardStats();
        fetchAssessorActivity();
        const interval = setInterval(() => { fetchDashboardStats(true); fetchAssessorActivity(); }, 30000);
        const handleExternalRefresh = () => { fetchDashboardStats(); fetchAssessorActivity(); };
        window.addEventListener('dashboard:refresh', handleExternalRefresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener('dashboard:refresh', handleExternalRefresh);
        };
    }, [user?.role]);

    if (!user) return null;

    const canViewDashboard = hasPermission(user?.permissions, 'dashboard', 'view');
    if (!canViewDashboard) {
        return <NoAccess title="Dashboard" message="Your access to the dashboard has been restricted by your administrator." />;
    }

    // Stats for Accessor
    const accessorStats = {
        total: assignments.length,
        pending: assignments.filter(a => a.status === 'approved' || a.status === 'rejected').length,
        completed: assignments.filter(a => a.status === 'verified').length
    };

    const totalParticipants = stats?.overview?.participants
        ?? stats?.totalParticipants
        ?? (
            stats
                ? Object.values(stats.categories || {}).reduce((acc: number, value: any) => acc + (Number(value) || 0), 0)
                : 0
        );
const exportSystemActivityCSV = () => {
    if (!recentAssessments || recentAssessments.length === 0) {
        alert("No data to export");
        return;
    }

    const headers = [
        "Assessor",
        "Category",
        "Score",
        "Date"
    ];

    const rows = recentAssessments.map((a: any) => [
        a.assessor?.name || "Unknown",
        a.participant?.category || "General",
        a.finalScore ?? a.totalScore,
        new Date(a.createdAt).toLocaleString()
    ]);

    const csvContent =
        [headers, ...rows]
            .map(e => e.map(v => `"${v}"`).join(","))
            .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "system_activity.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
    return (
        <>
        <div className="dashboard-content" style={{ paddingBottom: '4rem' }}>
            {/* <header style={{ marginBottom: '3rem', position: 'relative' }}>
                <div style={{
                    position: 'absolute',
                    top: '-40px',
                    left: '-20px',
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, var(--primary-soft) 0%, transparent 70%)',
                    zIndex: -1,
                    opacity: 0.5
                }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <span style={{
                                padding: '0.4rem 0.8rem',
                                backgroundColor: 'var(--primary-soft)',
                                color: 'var(--primary)',
                                borderRadius: '100px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                {user.role} Portal
                            </span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <h1 style={{ fontSize: '2.75rem', fontWeight: 950, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.05em', lineHeight: 1 }}>
                            {getGreeting()}, {user.name.split(' ')[0]}!
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', fontWeight: 500, maxWidth: '600px', lineHeight: 1.6 }}>
                            {user.role === 'accessor'
                                ? "Here's your mission for today. You've got work to do!"
                                : user.role === 'qc'
                                    ? "Monitor quality and approve verified assessments."
                                    : 'Welcome back to your command center. Everything looks good.'}
                        </p>
                    </div>
                    {user.role === 'admin' && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => navigate('/admin/reports')}
                                className="btn btn-primary shadow-premium"
                                style={{ padding: '0.875rem 1.75rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700 }}
                            >
                                <Award size={20} /> Generate Report
                            </button>
                        </div>
                    )}
                </div>
            </header> */}
{/* <header style={{ marginBottom: '3rem', position: 'relative' }}>
    <div style={{
        position: 'absolute',
        top: '-40px',
        left: '-20px',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, var(--primary-soft) 0%, transparent 70%)',
        zIndex: -1,
        opacity: 0.5
    }}></div>
    <div className="dashboard-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="dashboard-header-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{
                    padding: '0.4rem 0.8rem',
                    backgroundColor: 'var(--primary-soft)',
                    color: 'var(--primary)',
                    borderRadius: '100px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    {user.role} Portal
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
            </div>
            <h1 style={{ fontSize: '2.75rem', fontWeight: 950, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.05em', lineHeight: 1 }}>
                {getGreeting()}, {user.name.split(' ')[0]}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', fontWeight: 500, maxWidth: '600px', lineHeight: 1.6 }}>
                {user.role === 'accessor'
                    ? "Here's your mission for today. You've got work to do!"
                    : user.role === 'qc'
                        ? "Monitor quality and approve verified assessments."
                        : 'Welcome back to your command center. Everything looks good.'}
            </p>
        </div>
        {user.role === 'admin' && (
            <div className="dashboard-header-btn" style={{ display: 'flex', gap: '1rem' }}>
                <button
                    onClick={() => navigate('/admin/reports')}
                    className="btn btn-primary shadow-premium"
                    style={{ padding: '0.875rem 1.75rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700 }}
                >
                    <Award size={20} /> Generate Report
                </button>
            </div>
        )}
    </div>
</header>
            {user.role === 'accessor' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '3.5rem' }}>
                    <div className="card shadow-premium hover-scale" style={{ padding: '2rem', border: 'none', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ backgroundColor: '#e0e7ff', color: '#4338ca', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ClipboardList size={30} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Total Tasks</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{accessorStats.total}</div>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, margin: '0.5rem 0 0' }}>Assigned to your profile</p>
                        </div>
                    </div>
                    <div className="card shadow-premium hover-scale" style={{ padding: '2rem', border: 'none', background: 'linear-gradient(135deg, #ffffff 0%, #fdfcfb 100%)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ backgroundColor: '#ffedd5', color: '#9a3412', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Clock size={30} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>To Action</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{accessorStats.pending}</div>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, margin: '0.5rem 0 0' }}>Requires immediate verification</p>
                        </div>
                    </div>
                    <div className="card shadow-premium hover-scale" style={{ padding: '2rem', border: 'none', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ backgroundColor: '#dcfce7', color: '#15803d', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 size={30} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Verified</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{accessorStats.completed}</div>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, margin: '0.5rem 0 0' }}>Successfully completed tasks</p>
                        </div>
                    </div>
                </div>
            )}
            {user.role === 'qc' && qcStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3.5rem' }}>
                    <div className="card shadow-premium hover-scale" style={{ padding: '1.5rem', border: 'none', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '14px' }}>
                                <ClipboardList size={22} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--success)', backgroundColor: 'var(--success-soft)', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>Active</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Tasks</div>
                        <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-primary)' }}>{qcStats.total}</div>
                    </div>
                    <div className="card shadow-premium hover-scale" style={{ padding: '1.5rem', border: 'none', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div style={{ backgroundColor: 'var(--warning-soft)', color: 'var(--warning)', padding: '0.75rem', borderRadius: '14px' }}>
                                <Clock size={22} />
                            </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Review Pending</div>
                        <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-primary)' }}>{qcStats.pending}</div>
                    </div>
                    <div className="card shadow-premium hover-scale" style={{ padding: '1.5rem', border: 'none', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)', padding: '0.75rem', borderRadius: '14px' }}>
                                <CheckCircle2 size={22} />
                            </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Completed</div>
                        <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-primary)' }}>{qcStats.completed ?? qcStats.approved ?? 0}</div>
                    </div>
                    <div className="card shadow-premium hover-scale" style={{ padding: '1.5rem', border: 'none', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.75rem', borderRadius: '14px' }}>
                                <X size={22} />
                            </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Reassessment</div>
                        <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-primary)' }}>{qcStats.reassessment}</div>
                    </div>
                </div>
            )}

            {user.role !== 'accessor' && (
                <div style={{ marginBottom: '3.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '6px', height: '24px', backgroundColor: 'var(--primary)', borderRadius: '3px' }}></div>
                        Participation by Category
                    </h3>
                    {statsLoading && !stats ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem' }}>
                            {CATEGORY_CARDS.map((_, idx) => (
                                <div key={idx} className="skeleton-block" style={{ width: '165px', height: '62px', borderRadius: '16px' }} />
                            ))}
                        </div>
                    ) : statsError && !stats ? (
                        <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                            {statsError}
                        </div>
                    ) : stats ? (
                       <div className="category-scroll" tabIndex={0}>
                            {CATEGORY_CARDS.map(({ label, key, filter }) => (
                                <div
                                    key={label}
                                    onClick={() => navigate(`/admin/participants?category=${encodeURIComponent(filter)}`)}
                                    className="hover-scale"
                                    style={{
                                        flex: '0 0 auto',
                                        minWidth: '160px',
                                        padding: '0.625rem 1.25rem',
                                        backgroundColor: 'white',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border-light)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                        fontSize: '0.875rem',
                                        fontWeight: 700,
                                        color: 'var(--text-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}>
                                    <span style={{ opacity: 0.8 }}>{label}</span>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.625rem',
                                        backgroundColor: 'var(--primary-soft)',
                                        color: '#3730a3',
                                        borderRadius: '8px',
                                        fontWeight: 900
                                    }}>
                                        {stats?.categories?.[key] || 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            )}

            {user.role === 'admin' && (
                <div style={{ marginBottom: '4rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '6px', height: '24px', backgroundColor: 'var(--swachh-green)', borderRadius: '3px' }}></div>
                        System Overview
                    </h3>
                    {statsError && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '0.875rem 1rem',
                            borderRadius: '12px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            fontWeight: 600
                        }}>
                            {stats ? `Showing last known data. ${statsError}` : statsError}
                        </div>
                    )}
                    {statsLoading && !stats ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1.5rem',
                        }}>
                            {Array.from({ length: 5 }).map((_, idx) => (
                                <div key={idx} className="card shadow-premium" style={{ padding: '1.75rem', border: 'none' }}>
                                    <div className="skeleton-block" style={{ width: '48px', height: '48px', borderRadius: '16px', marginBottom: '1.25rem' }} />
                                    <div className="skeleton-block" style={{ width: '50%', height: '12px', marginBottom: '0.5rem' }} />
                                    <div className="skeleton-block" style={{ width: '70%', height: '28px' }} />
                                </div>
                            ))}
                        </div>
                    ) : stats ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1.5rem',
                        }}>
                            <div
                                onClick={() => navigate('/admin/users?role=qc')}
                                className="card shadow-premium hover-scale"
                                style={{ padding: '1.75rem', border: 'none', background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', cursor: 'pointer', borderLeft: '4px solid var(--swachh-green)' }}>
                                <div style={{ color: 'var(--swachh-green)', marginBottom: '1rem' }}><Shield size={24} /></div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>QC Members</div>
                                <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-primary)' }}>{stats?.overview?.qcMembers ?? 0}</div>
                            </div>
                            <div
                                onClick={() => navigate('/admin/users?role=accessor')}
                                className="card shadow-premium hover-scale"
                                style={{ padding: '1.75rem', border: 'none', background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', cursor: 'pointer', borderLeft: '4px solid var(--primary)' }}>
                                <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}><Users2 size={24} /></div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Assessors</div>
                                <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-primary)' }}>{stats?.overview?.assessors ?? 0}</div>
                            </div>
                            <div
                                onClick={() => navigate('/admin/users?role=admin')}
                                className="card shadow-premium hover-scale"
                                style={{ padding: '1.75rem', border: 'none', background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)', cursor: 'pointer', borderLeft: '4px solid #a855f7' }}>
                                <div style={{ color: '#a855f7', marginBottom: '1rem' }}><Users size={24} /></div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Admins</div>
                                <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-primary)' }}>{stats?.overview?.admins ?? 0}</div>
                            </div>
                            <div
                                onClick={() => navigate('/admin/areas')}
                                className="card shadow-premium hover-scale"
                                style={{ padding: '1.75rem', border: 'none', background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)', cursor: 'pointer', borderLeft: '4px solid var(--warning)' }}>
                                <div style={{ color: 'var(--warning)', marginBottom: '1rem' }}><Map size={24} /></div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Wards</div>
                                <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-primary)' }}>{stats?.overview?.wards ?? 0}</div>
                            </div>
                            <div
                                onClick={() => navigate('/admin/participants')}
                                className="card shadow-premium hover-scale"
                                style={{ padding: '1.75rem', border: 'none', background: 'linear-gradient(135deg, #fdf4ff 0%, #ffffff 100%)', cursor: 'pointer', borderLeft: '4px solid #d946ef' }}>
                                <div style={{ color: '#d946ef', marginBottom: '1rem' }}><Building2 size={24} /></div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Participants</div>
                                <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-primary)' }}>
                                    {totalParticipants}
                                </div>
                            </div>
                        </div>
                    ) : statsError ? (
                        <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                            Unable to load overview.
                        </div>
                    ) : null}
                </div>
            )} */}
            {/* ── Dashboard Header ── */}
<header style={{ marginBottom: '3rem', position: 'relative' }}>
    <div style={{
        position: 'absolute', top: '-40px', left: '-20px',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, var(--primary-soft) 0%, transparent 70%)',
        zIndex: -1, opacity: 0.5
    }} />
    <div className="dashboard-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="dashboard-header-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--primary-soft)', color: '#3730a3', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {user.role} Portal
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', fontWeight: 950, color: 'var(--text-primary)', marginBottom: '0.75rem', letterSpacing: '-0.05em', lineHeight: 1 }}>
                {getGreeting()}, {user.name.split(' ')[0]}!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.9rem, 2vw, 1.125rem)', fontWeight: 500, maxWidth: '600px', lineHeight: 1.6 }}>
                {user.role === 'accessor'
                    ? "Here's your mission for today. You've got work to do!"
                    : user.role === 'qc'
                        ? "Monitor quality and approve verified assessments."
                        : 'Welcome back to your command center. Everything looks good.'}
            </p>
        </div>
        {user.role === 'admin' && (
            <div className="dashboard-header-btn" style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => navigate('/ward-ranking?view=reports')} className="btn btn-primary shadow-premium"
                    style={{ padding: '0.875rem 1.75rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <Award size={20} /> Generate Report
                </button>
            </div>
        )}
    </div>
</header>

{/* ── Accessor Stats: 3-col → 1-col ── */}
{user.role === 'accessor' && (
    <div className="accessor-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="card shadow-premium hover-scale" style={{ padding: '1.75rem', border: 'none', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: '#e0e7ff', color: '#4338ca', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardList size={26} />
            </div>
            <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Total Tasks</div>
                <div style={{ fontSize: '2.25rem', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{accessorStats.total}</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, margin: '0.4rem 0 0' }}>Assigned to your profile</p>
            </div>
        </div>
        <div className="card shadow-premium hover-scale" style={{ padding: '1.75rem', border: 'none', background: 'linear-gradient(135deg, #ffffff 0%, #fdfcfb 100%)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: '#ffedd5', color: '#9a3412', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={26} />
            </div>
            <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>To Action</div>
                <div style={{ fontSize: '2.25rem', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{accessorStats.pending}</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, margin: '0.4rem 0 0' }}>Requires immediate verification</p>
            </div>
        </div>
        <div className="card shadow-premium hover-scale" style={{ padding: '1.75rem', border: 'none', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: '#dcfce7', color: '#15803d', width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={26} />
            </div>
            <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Verified</div>
                <div style={{ fontSize: '2.25rem', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{accessorStats.completed}</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, margin: '0.4rem 0 0' }}>Successfully completed tasks</p>
            </div>
        </div>
    </div>
)}

{/* ── QC Stats: 4-col → 2-col → 1-col ── */}
{user.role === 'qc' && qcStats && (
    <div className="qc-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '3rem' }}>
        {[
            { icon: <ClipboardList size={22} />, bg: 'var(--primary-soft)', color: 'var(--primary)', label: 'Total Tasks', value: qcStats.total, badge: <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--success)', backgroundColor: 'var(--success-soft)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>Active</span> },
            { icon: <Clock size={22} />, bg: 'var(--warning-soft)', color: 'var(--warning)', label: 'Review Pending', value: qcStats.pending },
            { icon: <CheckCircle2 size={22} />, bg: 'var(--success-soft)', color: 'var(--success)', label: 'Completed', value: qcStats.completed ?? qcStats.approved ?? 0 },
            { icon: <X size={22} />, bg: '#fee2e2', color: '#ef4444', label: 'Reassessment', value: qcStats.reassessment },
        ].map(({ icon, bg, color, label, value, badge }) => (
            <div key={label} className="card shadow-premium hover-scale" style={{ padding: '1.25rem', border: 'none', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div style={{ backgroundColor: bg, color, padding: '0.65rem', borderRadius: '12px' }}>{icon}</div>
                    {badge}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{label}</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 950, color: 'var(--text-primary)' }}>{value}</div>
            </div>
        ))}
    </div>
)}

{/* ── Participation by Category ── */}
{user.role !== 'accessor' && (
    <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '6px', height: '22px', backgroundColor: 'var(--primary)', borderRadius: '3px' }} />
            Participation by Category
        </h3>
        {statsLoading && !stats ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem' }}>
                {CATEGORY_CARDS.map((_, idx) => (
                    <div key={idx} className="skeleton-block" style={{ width: '165px', height: '62px', borderRadius: '16px' }} />
                ))}
            </div>
        ) : statsError && !stats ? (
            <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#b91c1c' }}>{statsError}</div>
        ) : stats ? (
            <div className="category-scroll" tabIndex={0}>
                {CATEGORY_CARDS.map(({ label, key, filter }) => (
                    <div key={label} onClick={() => navigate(`/admin/participants?category=${encodeURIComponent(filter)}`)}
                        className="hover-scale"
                        style={{ flex: '0 0 auto', minWidth: '150px', padding: '0.625rem 1.1rem', backgroundColor: 'white', borderRadius: '14px', border: '1px solid var(--border-light)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                        <span style={{ opacity: 0.8 }}>{label}</span>
                        <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', backgroundColor: 'var(--primary-soft)', color: '#3730a3', borderRadius: '7px', fontWeight: 900 }}>
                            {stats?.categories?.[key] || 0}
                        </span>
                    </div>
                ))}
            </div>
        ) : null}
    </div>
)}

{/* ── Admin System Overview ── */}
{user.role === 'admin' && (
    <div style={{ marginBottom: '3.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '6px', height: '22px', backgroundColor: 'var(--swachh-green)', borderRadius: '3px' }} />
            System Overview
        </h3>
        {statsError && (
            <div style={{ marginBottom: '1rem', padding: '0.875rem 1rem', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                {stats ? `Showing last known data. ${statsError}` : statsError}
            </div>
        )}
        {statsLoading && !stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem' }}>
                {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="card shadow-premium" style={{ padding: '1.5rem', border: 'none' }}>
                        <div className="skeleton-block" style={{ width: '44px', height: '44px', borderRadius: '14px', marginBottom: '1rem' }} />
                        <div className="skeleton-block" style={{ width: '50%', height: '11px', marginBottom: '0.5rem' }} />
                        <div className="skeleton-block" style={{ width: '70%', height: '26px' }} />
                    </div>
                ))}
            </div>
        ) : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem' }}>
                {[
                    { path: '/admin/users?role=qc', bg: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', border: 'var(--swachh-green)', icon: <Shield size={22} />, iconColor: 'var(--swachh-green)', label: 'QC Members', value: stats?.overview?.qcMembers ?? 0 },
                    { path: '/admin/users?role=accessor', bg: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', border: 'var(--primary)', icon: <Users2 size={22} />, iconColor: 'var(--primary)', label: 'Assessors', value: stats?.overview?.assessors ?? 0 },
                    { path: '/admin/users?role=admin', bg: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)', border: '#a855f7', icon: <Users size={22} />, iconColor: '#a855f7', label: 'Admins', value: stats?.overview?.admins ?? 0 },
                    { path: '/admin/participants', bg: 'linear-gradient(135deg, #fdf4ff 0%, #ffffff 100%)', border: '#d946ef', icon: <Building2 size={22} />, iconColor: '#d946ef', label: 'Participants', value: totalParticipants },
                ].map(({ path, bg, border, icon, iconColor, label, value }) => (
                    <div key={label} onClick={() => navigate(path)}
                        className="card shadow-premium hover-scale"
                        style={{ padding: '1.5rem', border: 'none', background: bg, cursor: 'pointer', borderLeft: `4px solid ${border}` }}>
                        <div style={{ color: iconColor, marginBottom: '0.875rem' }}>{icon}</div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
                        <div style={{ fontSize: '1.875rem', fontWeight: 950, color: 'var(--text-primary)' }}>{value}</div>
                    </div>
                ))}
            </div>
        ) : statsError ? (
            <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#b91c1c' }}>Unable to load overview.</div>
        ) : null}
    </div>
)}

{/* ── Self-Assessment Live Tracker ── */}
{user.role === 'admin' && stats?.selfAssessments && (
    <div style={{ marginBottom: '3.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '6px', height: '22px', backgroundColor: '#16a34a', borderRadius: '3px' }} />
            Self-Assessment Submissions
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, color: '#475569', backgroundColor: '#f1f5f9', padding: '0.3rem 0.75rem', borderRadius: '8px' }}>
                Auto-refreshes every 30s
            </span>
        </h3>

        {/* Summary pills */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {(() => {
                const notStartedCount = Math.max(0, (stats.overview?.participants ?? 0) - stats.selfAssessments.total);
                return [
                { label: 'Total Registered', value: stats.overview?.participants ?? 0, color: '#475569', bg: '#f8fafc', onClick: () => navigate('/admin/participants') },
                { label: 'Submitted', value: stats.selfAssessments.submitted, color: '#16a34a', bg: '#f0fdf4', onClick: () => openSAStatusDrawer('Submitted', 'Submitted') },
                { label: 'In Progress', value: stats.selfAssessments.draft, color: '#d97706', bg: '#fffbeb', onClick: () => openSAStatusDrawer('Draft', 'In Progress') },
                { label: 'Not Started', value: notStartedCount, color: '#475569', bg: '#f1f5f9', onClick: () => openSAStatusDrawer('Not Started', 'Not Started') },
            ].map(({ label, value, color, bg, onClick }) => (
                <div key={label}
                    onClick={onClick}
                    style={{ background: bg, border: `1px solid ${color}22`, borderRadius: '12px', padding: '0.75rem 1.25rem', minWidth: '120px', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${color}22`; e.currentTarget.style.borderColor = `${color}55`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = `${color}22`; }}
                >
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color }}>{value}</div>
                </div>
            )); })()}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

            {/* Category-wise progress */}
            <div className="card shadow-premium" style={{ border: 'none', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Category-wise Progress</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {CATEGORY_CARDS.map(({ label, key }) => {
                        const catData = stats.selfAssessments.byCategory?.[key] ?? { total: 0, submitted: 0, draft: 0 };
                        const total = (stats.categories?.[key] as number) || catData.total || 0;
                        const submitted = catData.submitted || 0;
                        const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
                        return (
                            <div key={key} onClick={() => openCategoryDrawer(key, label)} style={{ cursor: 'pointer', padding: '0.5rem 0.75rem', borderRadius: '8px', transition: 'background 0.15s' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{label}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{submitted}/{total} ({pct}%) →</span>
                                </div>
                                <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct === 100 ? '#16a34a' : '#22c55e', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recent submissions */}
            <div className="card shadow-premium" style={{ border: 'none', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9', fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Recent Submissions
                </div>
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {stats.selfAssessments.recentSubmissions?.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontWeight: 500 }}>No submissions yet</div>
                    ) : stats.selfAssessments.recentSubmissions?.map((s: any, i: number) => (
                        <div key={s.id} style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: i === 0 ? '#f0fdf4' : 'white' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{s.name}</div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', textTransform: 'capitalize' }}>{s.category}</div>
                            </div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                                {s.submittedAt ? new Date(s.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
)}

{/* ── Assessor Analytics — Premium Enterprise Dashboard ── */}
{user.role === 'admin' && (
    <div style={{ marginBottom: '3.5rem' }}>

        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '6px', height: '32px', background: 'linear-gradient(to bottom, #7c3aed, #4f46e5)', borderRadius: '3px' }} />
                <div>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Assessor Analytics</h3>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, margin: '2px 0 0' }}>Real-time field monitoring &amp; assessment pipeline</p>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.875rem', background: '#f0fdf4', borderRadius: '100px', border: '1px solid #bbf7d0' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 0 3px #22c55e33' }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                    Last updated: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <button onClick={() => { fetchDashboardStats(true); fetchAssessorActivity(); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '0.45rem 0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}>
                    <RefreshCw size={13} /> Refresh
                </button>
            </div>
        </div>

        {assessorActivity ? (
            <>
                {/* ── Row 1: Primary KPI Cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    {([
                        { label: 'Total Assessors', value: assessorActivity.totalAssessors, icon: <Users2 size={22} />, color: '#3730a3', accent: '#6366f1', bg: 'linear-gradient(145deg, #eef2ff 0%, #ffffff 100%)', border: '#c7d2fe', desc: 'Registered field staff', onClick: () => navigate('/admin/users?role=accessor') },
                        { label: 'Active Now', value: assessorActivity.activeAssessors, icon: <Zap size={22} />, color: '#059669', accent: '#10b981', bg: 'linear-gradient(145deg, #ecfdf5 0%, #ffffff 100%)', border: '#a7f3d0', desc: 'Currently in field', isLive: true, onClick: () => setAssessorDrawer({ title: 'Active Assessors', subtitle: 'Assessors with in-progress assessments', data: (assessorActivity.assignedList || []).filter((r: any) => r.status === 'in_progress') }) },
                        { label: 'Total Assigned', value: assessorActivity.totalAssigned, icon: <ClipboardList size={22} />, color: '#0369a1', accent: '#0ea5e9', bg: 'linear-gradient(145deg, #f0f9ff 0%, #ffffff 100%)', border: '#bae6fd', desc: 'Assessments allocated', onClick: () => setAssessorDrawer({ title: 'All Assigned', subtitle: 'Every participant assigned to an assessor', data: assessorActivity.assignedList || [] }) },
                        { label: 'Done Today', value: assessorActivity.completedToday, icon: <TrendingUp size={22} />, color: '#be185d', accent: '#ec4899', bg: 'linear-gradient(145deg, #fdf2f8 0%, #ffffff 100%)', border: '#fbcfe8', desc: "Today's completions", onClick: () => setAssessorDrawer({ title: "Done Today", subtitle: "Assessments completed or verified today", data: assessorActivity.assignedListToday || [] }) },
                    ] as any[]).map(({ label, value, icon, color, accent, bg, border, desc, isLive, onClick }) => (
                        <div key={label}
                            onClick={onClick}
                            style={{ background: bg, border: `1px solid ${border}`, borderRadius: 20, padding: '1.5rem', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)', position: 'relative', overflow: 'hidden' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${color}20`; e.currentTarget.style.borderColor = color + '66'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = border; }}
                        >
                            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: `${color}08`, borderRadius: '50%' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                <div style={{ width: 48, height: 48, borderRadius: 16, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {icon}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                                    {isLive && <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#059669', background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live</span>}
                                    <ChevronRight size={16} color={color} style={{ opacity: 0.5 }} />
                                </div>
                            </div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 950, color, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '4px' }}>{value ?? 0}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{desc}</div>
                        </div>
                    ))}
                </div>

                {/* ── Row 2: Status KPI Cards with progress bars ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
                    {([
                        { label: 'Not Started', value: assessorActivity.notStarted, icon: <Clock size={20} />, color: '#92400e', accent: '#fbbf24', bg: 'linear-gradient(145deg, #fffbeb 0%, #ffffff 100%)', border: '#fde68a', desc: 'Awaiting field visit', filterFn: (r: any) => !r.status || r.status === 'pending' },
                        { label: 'In Progress', value: assessorActivity.inProgress, icon: <Activity size={20} />, color: '#1d4ed8', accent: '#60a5fa', bg: 'linear-gradient(145deg, #eff6ff 0%, #ffffff 100%)', border: '#bfdbfe', desc: 'Currently active', filterFn: (r: any) => r.status === 'in_progress' },
                        { label: 'Completed', value: assessorActivity.completed, icon: <CheckCircle2 size={20} />, color: '#065f46', accent: '#22c55e', bg: 'linear-gradient(145deg, #f0fdf4 0%, #ffffff 100%)', border: '#bbf7d0', desc: 'QC review pending', filterFn: (r: any) => r.status === 'completed' },
                        { label: 'QC Verified', value: assessorActivity.qcVerified, icon: <Shield size={20} />, color: '#7c3aed', accent: '#a78bfa', bg: 'linear-gradient(145deg, #f5f3ff 0%, #ffffff 100%)', border: '#ddd6fe', desc: 'Fully verified', filterFn: (r: any) => ['qc_approved', 'under_review', 'published'].includes(r.status) },
                    ] as any[]).map(({ label, value, icon, color, accent, bg, border, desc, filterFn }) => {
                        const total = assessorActivity.totalAssigned || 1;
                        const pct = Math.min(100, Math.round(((value || 0) / total) * 100));
                        return (
                            <div key={label}
                                onClick={() => setAssessorDrawer({ title: label, subtitle: desc, data: (assessorActivity.assignedList || []).filter(filterFn) })}
                                style={{ background: bg, border: `1px solid ${border}`, borderRadius: 20, padding: '1.5rem', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${color}18`; e.currentTarget.style.borderColor = color + '66'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = border; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 14, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {icon}
                                    </div>
                                    <ChevronRight size={16} color={color} style={{ opacity: 0.5 }} />
                                </div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                                <div style={{ fontSize: '2.25rem', fontWeight: 950, color, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '0.75rem' }}>{value ?? 0}</div>
                                <div style={{ height: 5, background: `${color}15`, borderRadius: '100px', overflow: 'hidden', marginBottom: '6px' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(to right, ${color}, ${accent})`, borderRadius: '100px', transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{desc}</span>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color }}>{pct}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Two-Column: Category Cards + Funnel Pipeline ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                    {/* Category Progress Analytics */}
                    <div className="card shadow-premium" style={{ border: 'none', padding: '1.75rem', borderRadius: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BarChart3 size={16} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>Category Progress</div>
                                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Click category to view details</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.65rem', fontWeight: 700 }}>
                                <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />Done</span>
                                <span style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />Active</span>
                                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />Pending</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {Object.entries(assessorActivity.categoryBreakdown || {}).map(([cat, data]: any) => {
                                const total = data.total || 0;
                                if (total === 0) return null;
                                const done = (data.completed || 0) + (data.qcVerified || 0);
                                const inProg = data.inProgress || 0;
                                const pct = Math.round((done / total) * 100);
                                return (
                                    <div key={cat}
                                        onClick={() => navigate(`/admin/participants?category=${encodeURIComponent(cat)}`)}
                                        style={{ padding: '0.875rem 1rem', background: '#f8fafc', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', border: '1px solid transparent' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'translateX(6px)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'transparent'; }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{cat}</span>
                                            <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22c55e' }}>{done} done</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa' }}>{inProg} active</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>{(data.notStarted || 0)} pending</span>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 900, color: pct >= 80 ? '#16a34a' : pct >= 40 ? '#2563eb' : '#92400e', background: pct >= 80 ? '#f0fdf4' : pct >= 40 ? '#eff6ff' : '#fffbeb', padding: '2px 8px', borderRadius: 8 }}>{pct}%</span>
                                            </div>
                                        </div>
                                        <div style={{ height: 6, background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden', display: 'flex' }}>
                                            <div style={{ width: `${Math.round(((data.completed||0)/total)*100)}%`, height: '100%', background: '#22c55e', transition: 'width 0.7s ease' }} />
                                            <div style={{ width: `${Math.round(((data.qcVerified||0)/total)*100)}%`, height: '100%', background: '#a78bfa', transition: 'width 0.7s ease' }} />
                                            <div style={{ width: `${Math.round((inProg/total)*100)}%`, height: '100%', background: '#60a5fa', transition: 'width 0.7s ease' }} />
                                        </div>
                                    </div>
                                );
                            })}
                            {Object.keys(assessorActivity.categoryBreakdown || {}).length === 0 && (
                                <div style={{ textAlign: 'center', padding: '3rem 2rem', color: '#94a3b8' }}>
                                    <Layers size={36} style={{ marginBottom: '0.75rem', opacity: 0.25, display: 'block', margin: '0 auto 0.75rem' }} />
                                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>No assignments yet</div>
                                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Category data will appear once assessors are assigned</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assessment Funnel Pipeline */}
                    <div className="card shadow-premium" style={{ border: 'none', padding: '1.75rem', borderRadius: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Target size={16} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>Assessment Pipeline</div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Click stage to open filtered view</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {([
                                { label: 'Not Started', value: assessorActivity.notStarted, color: '#92400e', bar: '#fbbf24', bg: '#fffbeb', border: '#fde68a', desc: 'Awaiting field visit', filterFn: (r: any) => !r.status || r.status === 'pending' },
                                { label: 'In Progress', value: assessorActivity.inProgress, color: '#1d4ed8', bar: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', desc: 'Being assessed', filterFn: (r: any) => r.status === 'in_progress' },
                                { label: 'Completed', value: assessorActivity.completed, color: '#065f46', bar: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', desc: 'QC pending', filterFn: (r: any) => r.status === 'completed' },
                                { label: 'QC Verified', value: assessorActivity.qcVerified, color: '#7c3aed', bar: '#a78bfa', bg: '#f5f3ff', border: '#ddd6fe', desc: 'Verified & approved', filterFn: (r: any) => ['qc_approved', 'under_review', 'published'].includes(r.status) },
                                { label: 'Rejected', value: assessorActivity.rejected, color: '#b91c1c', bar: '#f87171', bg: '#fef2f2', border: '#fecaca', desc: 'Needs reassessment', filterFn: (r: any) => ['reassessment', 'rejected'].includes(r.status) },
                            ] as any[]).map(({ label, value, color, bar, bg, border, desc, filterFn }, idx) => {
                                const total = assessorActivity.totalAssigned || 1;
                                const pct = Math.min(100, Math.round(((value || 0) / total) * 100));
                                const funnelWidth = Math.max(60, 100 - (idx * 8));
                                return (
                                    <div key={label}>
                                        <div
                                            onClick={() => setAssessorDrawer({ title: label, subtitle: desc, data: (assessorActivity.assignedList || []).filter(filterFn) })}
                                            style={{ background: bg, borderRadius: 14, padding: '0.875rem 1rem', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', border: `1px solid ${border}`, marginLeft: `${100 - funnelWidth}%`, width: `${funnelWidth}%` }}
                                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`; e.currentTarget.style.borderColor = color + '88'; }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = border; }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                                <div>
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color }}>{label}</span>
                                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '0.4rem', fontWeight: 600 }}>{desc}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>{pct}%</span>
                                                    <span style={{ fontSize: '1.2rem', fontWeight: 950, color, lineHeight: 1 }}>{value ?? 0}</span>
                                                </div>
                                            </div>
                                            <div style={{ height: 4, background: `${color}15`, borderRadius: '100px', overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: bar, borderRadius: '100px', transition: 'width 0.7s ease' }} />
                                            </div>
                                        </div>
                                        {idx < 4 && (
                                            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: 1 }}>↓</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Live Assessor Monitoring Data Grid ── */}
                <div className="card shadow-premium" style={{ border: 'none', padding: 0, overflow: 'hidden', borderRadius: 24 }}>
                    {/* Grid Header */}
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.875rem', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 0 4px #22c55e22' }} />
                            <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Live Assessor Monitoring</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', padding: '0.2rem 0.65rem', background: '#f1f5f9', borderRadius: '8px' }}>
                                {(assessorActivity.liveActivity || []).length} records
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {/* Status legend */}
                            <div style={{ display: 'flex', gap: '0.875rem', fontSize: '0.68rem', fontWeight: 700 }}>
                                {[{ c: '#22c55e', l: 'Completed' }, { c: '#60a5fa', l: 'In Progress' }, { c: '#a78bfa', l: 'QC Verified' }].map(({ c, l }) => (
                                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#64748b' }}>
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
                                    </span>
                                ))}
                            </div>
                            {/* Search */}
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="Search assessor, participant..."
                                    value={activitySearch}
                                    onChange={e => setActivitySearch(e.target.value)}
                                    style={{ paddingLeft: '2rem', paddingRight: '0.875rem', paddingTop: '0.45rem', paddingBottom: '0.45rem', fontSize: '0.78rem', fontWeight: 600, border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none', color: 'var(--text-primary)', background: '#f8fafc', width: '220px', transition: 'all 0.2s' }}
                                    onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 3px #6366f115'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = ''; }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data Grid */}
                    <div style={{ overflowX: 'auto' }}>
                        {(() => {
                            const statusMap: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
                                in_progress:  { label: 'In Progress',  color: '#1d4ed8', bg: '#eff6ff',  dot: '#60a5fa', border: '#bfdbfe' },
                                completed:    { label: 'Completed',    color: '#065f46', bg: '#f0fdf4',  dot: '#22c55e', border: '#bbf7d0' },
                                qc_approved:  { label: 'QC Approved',  color: '#7c3aed', bg: '#f5f3ff',  dot: '#a78bfa', border: '#ddd6fe' },
                                under_review: { label: 'Under Review', color: '#7c3aed', bg: '#f5f3ff',  dot: '#a78bfa', border: '#ddd6fe' },
                                published:    { label: 'Published',    color: '#0369a1', bg: '#f0f9ff',  dot: '#38bdf8', border: '#bae6fd' },
                                reassessment: { label: 'Reassessment', color: '#b91c1c', bg: '#fef2f2',  dot: '#f87171', border: '#fecaca' },
                                rejected:     { label: 'Rejected',     color: '#b91c1c', bg: '#fef2f2',  dot: '#f87171', border: '#fecaca' },
                                pending:      { label: 'Pending',      color: '#92400e', bg: '#fffbeb',  dot: '#fbbf24', border: '#fde68a' },
                            };
                            const q = activitySearch.toLowerCase();
                            const rows = (assessorActivity.liveActivity || []).filter((row: any) =>
                                !q ||
                                row.assessorName?.toLowerCase().includes(q) ||
                                row.participantName?.toLowerCase().includes(q) ||
                                row.category?.toLowerCase().includes(q) ||
                                row.assessorZone?.toLowerCase().includes(q) ||
                                row.assessorWard?.toLowerCase().includes(q) ||
                                row.status?.toLowerCase().includes(q)
                            );
                            return (
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                                            {['Assessor', 'Zone / Ward', 'Participant', 'Category', 'Status', 'Last Activity'].map((h) => (
                                                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                                                    <Activity size={36} style={{ color: '#cbd5e1', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                                                    <div style={{ fontWeight: 700, color: '#94a3b8', fontSize: '0.9rem' }}>{activitySearch ? 'No results found' : 'No assessor activity yet'}</div>
                                                    {activitySearch && <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.25rem' }}>Try a different search term</div>}
                                                </td>
                                            </tr>
                                        ) : rows.map((row: any, i: number) => {
                                            const s = statusMap[row.status] || { label: row.status, color: '#475569', bg: '#f1f5f9', dot: '#94a3b8', border: '#e2e8f0' };
                                            const zoneWard = [row.assessorZone, row.assessorWard].filter((v: string) => v && v !== '—').join(' / ') || '—';
                                            return (
                                                <tr key={i}
                                                    style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s', cursor: 'pointer' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                                                    onClick={() => {
                                                        if (row.assessmentId) {
                                                            if (row.status === 'in_progress') {
                                                                navigate(`/assessment-review/${row.assessmentId}`);
                                                            } else {
                                                                navigate(`/assessment/${row.assessmentId}`);
                                                            }
                                                        } else {
                                                            navigate('/admin/users?role=accessor');
                                                        }
                                                    }}
                                                >
                                                    <td style={{ padding: '0.875rem 1.25rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.82rem', flexShrink: 0, border: '2px solid #fff', boxShadow: '0 2px 8px rgba(99,102,241,0.15)' }}>
                                                                {row.assessorName?.charAt(0)?.toUpperCase() || '?'}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{row.assessorName}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{zoneWard}</td>
                                                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.participantName}</td>
                                                    <td style={{ padding: '0.875rem 1.25rem' }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 8, background: '#f0f4ff', color: '#3730a3', textTransform: 'capitalize', whiteSpace: 'nowrap', border: '1px solid #c7d2fe' }}>{row.category}</span>
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1.25rem' }}>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
                                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />{s.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                        {row.lastActivity ? new Date(row.lastActivity).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            );
                        })()}
                    </div>
                    {(assessorActivity.liveActivity || []).length > 0 && (
                        <div style={{ padding: '0.875rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                                Showing {Math.min((assessorActivity.liveActivity || []).length, activitySearch ? (assessorActivity.liveActivity || []).filter((r: any) => { const q = activitySearch.toLowerCase(); return r.assessorName?.toLowerCase().includes(q) || r.participantName?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q); }).length : (assessorActivity.liveActivity || []).length)} of {(assessorActivity.liveActivity || []).length} records
                            </span>
                            <button onClick={() => navigate('/admin/users?role=accessor')} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                View all assessors <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="skeleton-block" style={{ height: '130px', borderRadius: 20 }} />
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem' }}>
                    <div className="skeleton-block" style={{ height: '280px', borderRadius: 24 }} />
                    <div className="skeleton-block" style={{ height: '280px', borderRadius: 24 }} />
                </div>
                <div className="skeleton-block" style={{ height: '200px', borderRadius: 24 }} />
            </div>
        )}
    </div>
)}

{/* ── Main Content: accessor = 2-col, others = 1-col ── */}
<div className={user.role === 'accessor' ? 'accessor-main-grid' : ''} style={user.role === 'accessor' ? { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' } : {}}>

    {/* Column 1 */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Accessor Queue */}
        {user.role === 'accessor' && (
            <div className="card shadow-premium" style={{ border: 'none', padding: 0, overflow: 'hidden', borderRadius: '24px' }}>
                <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#fff' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Daily Verification Queue</h3>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3730a3', backgroundColor: 'var(--primary-soft)', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
                        {assignments.length} Tasks assigned
                    </div>
                </div>
                <div style={{ padding: '1.25rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Syncing your queue...</p>
                        </div>
                    ) : assignments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <div style={{ width: '72px', height: '72px', backgroundColor: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: 'var(--text-secondary)' }}>
                                <Shield size={36} />
                            </div>
                            <h4 style={{ fontWeight: 900, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Queue is Empty</h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto' }}>No field segments currently assigned to your profile.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {assignments.map(a => (
                                <div key={a.id} className="task-item hover-scale" style={{ padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', backgroundColor: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                        <div style={{ width: '50px', height: '50px', flexShrink: 0, backgroundColor: 'var(--swachh-green-soft)', color: 'var(--swachh-green)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 950, border: '1px solid rgba(22, 163, 74, 0.1)' }}>
                                            {a.category.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontWeight: 850, color: 'var(--text-primary)', textTransform: 'capitalize', fontSize: '1rem', marginBottom: '0.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {a.category} Ranking
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} /> {a.details?.ward || a.details?.Ward || 'L-Zone Sector'}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={13} /> {new Date(a.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexShrink: 0 }}>
                                        <span style={{ padding: '0.35rem 0.875rem', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: a.status === 'verified' ? 'var(--success-soft)' : 'var(--warning-soft)', color: a.status === 'verified' ? 'var(--success)' : 'var(--warning)', whiteSpace: 'nowrap' }}>
                                            {a.status === 'verified' ? 'Completed' : 'Pending'}
                                        </span>
                                        <button onClick={() => setSelectedParticipant(a)} className="btn btn-primary"
                                            style={{ padding: '0.65rem 1.25rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 750, whiteSpace: 'nowrap' }}>
                                            Review <ArrowRight size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Admin / QC sections */}
        {(user.role === 'admin' || user.role === 'qc') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {user.role === 'qc' && (
                    <div className="card shadow-premium" style={{ border: 'none', padding: 0, overflow: 'hidden', borderRadius: '24px' }}>
                        <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#fff' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Assessment Review Inbox</h3>
                            <span className="badge" style={{ backgroundColor: 'var(--warning-soft)', color: 'var(--warning)', padding: '0.4rem 0.875rem', borderRadius: '8px', fontWeight: 800 }}>
                                {qcReviews.length} Pending
                            </span>
                        </div>
                        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '3rem' }}>
                                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                                    <p style={{ color: 'var(--text-secondary)' }}>Refreshing reports...</p>
                                </div>
                            ) : qcReviews.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                                    <div style={{ width: '72px', height: '72px', backgroundColor: 'var(--success-soft)', color: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                                        <CheckCircle2 size={36} />
                                    </div>
                                    <h4 style={{ fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>All Caught Up!</h4>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>No assessments pending for your quality review.</p>
                                </div>
                            ) : (
                                qcReviews.map(review => (
                                    <div key={review.id} className="hover-scale" style={{ padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border-light)', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                            <div style={{ width: '52px', height: '52px', flexShrink: 0, backgroundColor: '#f1f5f9', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3730a3', fontSize: '1.3rem', fontWeight: 950, border: '1px solid #e2e8f0' }}>
                                                {review.questionnaire?.category?.charAt(0) || 'A'}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {review.participant?.details?.ward || review.participant?.details?.Ward || 'Central'} Zone - {review.participant?.category}
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={13} /> {review.assessor?.name}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={13} /> {new Date(review.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexShrink: 0 }}>
                                            <div style={{ textAlign: 'center', padding: '0.35rem 0.875rem', borderRadius: '10px', backgroundColor: 'var(--primary-soft)' }}>
                                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Score</div>
                                                <div style={{ fontSize: '1.35rem', fontWeight: 950, color: '#3730a3', lineHeight: 1 }}>{review.totalScore}</div>
                                            </div>
                                            <button onClick={() => setSelectedReview(review)} className="btn btn-primary"
                                                style={{ backgroundColor: '#064e3b', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '12px', fontWeight: 800, border: 'none', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                                Audit Review
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Category Champions */}
                <div className="card shadow-premium" style={{ padding: '2rem', background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', color: 'white', border: 'none', borderRadius: '28px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '130px', height: '130px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', zIndex: 0 }} />
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.35rem', fontWeight: 950, color: 'white', marginBottom: '0.2rem' }}>Category Champions</h3>
                            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Top Performing Entities Across Regions</p>
                        </div>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.875rem', borderRadius: '18px' }}>
                            <Trophy size={28} color="#fcd34d" />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', position: 'relative', zIndex: 1 }}>
                        {stats && stats.categoryWinners && Object.entries(stats.categoryWinners).map(([cat, winner]: any) => (
                            <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.08)', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ minWidth: 0, marginRight: '0.75rem' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{cat}</div>
                                    <div style={{ fontWeight: 900, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{winner.participantName}</div>
                                </div>
                                <div style={{ textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.5rem 0.875rem', borderRadius: '10px', flexShrink: 0 }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 950, color: '#fcd34d' }}>{winner.displayScore ?? winner.finalScore ?? winner.totalScore}</div>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.6 }}>PTS</div>
                                </div>
                            </div>
                        ))}
                        {(!stats || !stats.categoryWinners || Object.keys(stats.categoryWinners).length === 0) && (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
                                <Clock size={36} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                <p style={{ fontWeight: 700 }}>Awaiting final calculations and audits...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* System-wide Activity Table */}
                <div className="card shadow-premium" style={{ border: 'none', padding: 0, overflow: 'hidden', borderRadius: '28px' }}>
                    <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#fff' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>System-wide Activity</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.2rem' }}>Real-time assessment flow</p>
                        </div>
<button
    onClick={exportSystemActivityCSV}
    className="btn btn-outline"
    style={{
        borderRadius: "10px",
        fontSize: "0.8rem",
        fontWeight: 750,
        padding: "0.5rem 1rem"
    }}
>
    Export CSV
</button>                    </div>
                    <div>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '4rem' }}>
                                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                                <p style={{ color: 'var(--text-secondary)' }}>Streaming data...</p>
                            </div>
                        ) : recentAssessments.length === 0 ? (
                            <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                                <AlertCircle size={44} style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', opacity: 0.4 }} />
                                <h4 style={{ fontWeight: 900, color: 'var(--text-primary)' }}>No Activity Yet</h4>
                                <p style={{ color: 'var(--text-secondary)', maxWidth: '300px', margin: '0.5rem auto 0' }}>Data will appear here as soon as assessors begin their field work.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                                            {['Assessor', 'Category', 'Score', 'Date'].map((h, i) => (
                                                <th key={h} style={{ padding: '1rem 1.5rem', textAlign: i === 2 ? 'center' : i === 3 ? 'right' : 'left', fontSize: '0.68rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentAssessments.slice(0, 8).map((assessment: any) => (
                                            <tr key={assessment.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="hover-light">
                                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                                        <div style={{ width: '34px', height: '34px', flexShrink: 0, backgroundColor: 'var(--primary-soft)', color: '#3730a3', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem' }}>
                                                            {assessment.assessor?.name?.charAt(0) || 'U'}
                                                        </div>
                                                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{assessment.assessor?.name || 'Unknown'}</div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem' }}>
                                                    <span style={{ padding: '0.35rem 0.75rem', backgroundColor: 'var(--primary-soft)', color: '#3730a3', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 850, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                                                        {assessment.participant?.category || 'General'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 950, color: '#047857', fontSize: '1.05rem' }}>{assessment.totalScore}</div>
                                                </td>
                                                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                        {new Date(assessment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>

    {/* Column 2: Accessor sidebar */}
    {user.role === 'accessor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card shadow-premium" style={{ border: 'none', background: 'white', borderRadius: '24px', padding: '1.75rem' }}>
                <h4 style={{ fontWeight: 900, marginBottom: '1.25rem', color: 'var(--text-primary)', fontSize: '1.05rem' }}>Your Progress</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Verification Accuracy</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--swachh-green)' }}>98.4%</span>
                    </div>
                    <div style={{ width: '100%', height: '7px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: '98.4%', height: '100%', backgroundColor: 'var(--swachh-green)', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginTop: '0.5rem' }}>
                        <div style={{ padding: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '14px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Today</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>12</div>
                        </div>
                        <div style={{ padding: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '14px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Target</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#3730a3' }}>15</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-premium" style={{ border: 'none', background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', borderRadius: '24px', padding: '1.75rem', color: 'white', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}><Award size={72} /></div>
                <h4 style={{ fontWeight: 900, marginBottom: '0.875rem', position: 'relative', zIndex: 1 }}>Field Protocol</h4>
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '1.25rem', position: 'relative', zIndex: 1 }}>
                    Ensure you are at the physical location and have captured high-quality evidence images for all verified entities.
                </p>
                <button className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', width: '100%', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 750, padding: '0.75rem' }}>
                    View Guidelines
                </button>
            </div>
        </div>
    )}
</div>

            <div style={{
                
            }}>
                {/* Column 1: Primary Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {user.role === 'accessor' ? (
                        <div className="card shadow-premium" style={{ border: 'none', padding: '0', overflow: 'hidden', borderRadius: '24px' }}>
                            <div style={{ padding: '1.75rem 2rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Daily Verification Queue</h3>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#3730a3', backgroundColor: 'var(--primary-soft)', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
                                    {assignments.length} Tasks assigned
                                </div>
                            </div>

                            <div style={{ padding: '1.5rem' }}>
                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                                        <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                                        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Syncing your queue...</p>
                                    </div>
                                ) : assignments.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                                        <div style={{ width: '80px', height: '80px', backgroundColor: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--text-secondary)' }}>
                                            <Shield size={40} />
                                        </div>
                                        <h4 style={{ fontWeight: 900, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Queue is Empty</h4>
                                        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto' }}>No field segments currently assigned to your profile.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {assignments.map(a => (
                                            <div key={a.id} className="task-item hover-scale" style={{
                                                padding: '1.5rem',
                                                borderRadius: '20px',
                                                border: '1px solid var(--border-light)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                backgroundColor: 'white',
                                                boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}>
                                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                    <div style={{
                                                        width: '56px',
                                                        height: '56px',
                                                        backgroundColor: 'var(--swachh-green-soft)',
                                                        color: 'var(--swachh-green)',
                                                        borderRadius: '16px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '1.25rem',
                                                        fontWeight: 950,
                                                        border: '1px solid rgba(22, 163, 74, 0.1)'
                                                    }}>
                                                        {a.category.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 850, color: 'var(--text-primary)', textTransform: 'capitalize', fontSize: '1.1rem', marginBottom: '0.35rem' }}>
                                                            {a.category} Ranking
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={14} className="text-primary" /> {a.details?.ward || a.details?.Ward || 'L-Zone Sector'}</span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} /> Assigned {new Date(a.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '0.4rem 1rem',
                                                            borderRadius: '100px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 800,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em',
                                                            backgroundColor: a.status === 'verified' ? 'var(--success-soft)' : 'var(--warning-soft)',
                                                            color: a.status === 'verified' ? 'var(--success)' : 'var(--warning)'
                                                        }}>
                                                            {a.status === 'verified' ? 'Completed' : 'Awaiting Action'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedParticipant(a)}
                                                        className="btn btn-primary"
                                                        style={{
                                                            padding: '0.75rem 1.5rem',
                                                            borderRadius: '14px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.625rem',
                                                            fontSize: '0.875rem',
                                                            fontWeight: 750,
                                                            boxShadow: '0 4px 12px var(--primary-soft)'
                                                        }}
                                                    >
                                                        Review Details <ArrowRight size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}

                    {/* Report sections for Admin and QC */}
                    {(user.role === 'admin' || user.role === 'qc') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {user.role === 'qc' && (
                                <div className="card shadow-premium" style={{ border: 'none', padding: '0', overflow: 'hidden', borderRadius: '24px' }}>
                                    <div style={{ padding: '1.75rem 2rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Assessment Review Inbox</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span className="badge" style={{ backgroundColor: 'var(--warning-soft)', color: 'var(--warning)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 800 }}>
                                                {qcReviews.length} Pending
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {loading ? (
                                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                                                <p style={{ color: 'var(--text-secondary)' }}>Refreshing reports...</p>
                                            </div>
                                        ) : qcReviews.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                                                <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--success-soft)', color: 'var(--success)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                                    <CheckCircle2 size={40} />
                                                </div>
                                                <h4 style={{ fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>All Caught Up!</h4>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '300px', margin: '0 auto' }}>No assessments pending for your quality review right now.</p>
                                            </div>
                                        ) : (
                                            qcReviews.map(review => (
                                                <div key={review.id} className="hover-scale" style={{
                                                    padding: '1.5rem',
                                                    borderRadius: '24px',
                                                    border: '1px solid var(--border-light)',
                                                    backgroundColor: 'white',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                }}>
                                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                        <div style={{
                                                            width: '60px',
                                                            height: '60px',
                                                            backgroundColor: '#f1f5f9',
                                                            borderRadius: '18px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#3730a3',
                                                            fontSize: '1.4rem',
                                                            fontWeight: 950,
                                                            border: '1px solid #e2e8f0'
                                                        }}>
                                                            {review.questionnaire?.category?.charAt(0) || 'A'}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '1.15rem', marginBottom: '0.35rem' }}>
                                                                {review.participant?.details?.ward || review.participant?.details?.Ward || 'Central'} Zone - {review.participant?.category}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                    <Users size={14} className="text-primary" /> Assessor: {review.assessor?.name}
                                                                </span>
                                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                    <Calendar size={14} /> Submitted {new Date(review.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                                        <div style={{ textAlign: 'right', paddingRight: '1.5rem', borderRight: '1.5px solid var(--border-light)' }}>
                                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Score</div>
                                                            <div style={{ fontSize: '1.5rem', fontWeight: 950, color: '#3730a3', lineHeight: 1 }}>{review.totalScore}</div>
                                                        </div>
                                                        <button
                                                            onClick={() => setSelectedReview(review)}
                                                            className="btn btn-primary"
                                                            style={{
                                                                backgroundColor: '#064e3b',
                                                                color: 'white',
                                                                padding: '0.875rem 1.75rem',
                                                                borderRadius: '14px',
                                                                fontWeight: 800,
                                                                border: 'none',
                                                                boxShadow: '0 6px 15px rgba(6, 78, 59, 0.15)',
                                                                fontSize: '0.875rem'
                                                            }}
                                                        >
                                                            Audit Review
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Column 2: Secondary Content (For Accessor Sidebar) */}
                {user.role === 'accessor' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="card shadow-premium" style={{ border: 'none', background: 'white', borderRadius: '24px', padding: '2rem' }}>
                            <h4 style={{ fontWeight: 900, marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Your Progress</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Verification Accuracy</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--swachh-green)' }}>98.4%</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: '98.4%', height: '100%', backgroundColor: 'var(--swachh-green)', borderRadius: '4px' }}></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '16px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Today</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>12</div>
                                    </div>
                                    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '16px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Target</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#3730a3' }}>15</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card shadow-premium" style={{ border: 'none', background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', borderRadius: '24px', padding: '2rem', color: 'white', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1 }}><Award size={80} /></div>
                            <h4 style={{ fontWeight: 900, marginBottom: '1rem', position: 'relative', zIndex: 1 }}>Field Protocol</h4>
                            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
                                Ensure you are at the physical location and have captured high-quality evidence images for all verified entities.
                            </p>
                            <button className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', width: '100%', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 750, padding: '0.75rem' }}>
                                View Guidelines
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Review Detail Modal */}
            {selectedReview && (
                <div
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedReview(null);
                    }}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(16px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '2rem'
                    }}
                >
                    <div className="card shadow-premium" style={{
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        position: 'relative',
                        border: 'none',
                        padding: 0,
                        borderRadius: '32px',
                        backgroundColor: 'white'
                    }}>
                        <div style={{
                            padding: '1.5rem 2rem',
                            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.8, marginBottom: '0.5rem' }}>Review Assessment</div>
                                <h2 style={{ fontSize: '2rem', fontWeight: 900, margin: 0 }}>
                                    {selectedReview.participant?.details?.ward || 'Ward'} - {selectedReview.participant?.category}
                                </h2>
                            </div>
                            <button
                                onClick={() => setSelectedReview(null)}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '16px', padding: '0.75rem', cursor: 'pointer', color: 'white' }}
                            >
                                <X size={28} />
                            </button>
                        </div>

                        <div style={{ padding: '3rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4rem' }}>
                                <div>
                                    <div style={{ marginBottom: '3rem' }}>
                                        <h4 style={{ fontWeight: 900, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '4px', height: '24px', backgroundColor: 'var(--primary)', borderRadius: '2px' }}></div>
                                            Assessment Responses
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                            {selectedReview.responses.map((resp: any, idx: number) => (
                                                <div key={idx} style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Question {idx + 1}</span>
                                                        <span style={{ backgroundColor: '#fff', padding: '0.25rem 0.75rem', borderRadius: '8px', fontWeight: 900, fontSize: '0.85rem', color: 'var(--success)', border: '1px solid #e2e8f0' }}>
                                                            {resp.obtainedMarks} Marks
                                                        </span>
                                                    </div>
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                                                        {resp.text || 'Response text not provided'}
                                                    </p>
                                                    {resp.remarks && (
                                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                            <strong>Assessor Remarks:</strong> {resp.remarks}
                                                        </div>
                                                    )}
                                                    {resp.images?.length > 0 && (
                                                        <div style={{ marginTop: '1.25rem' }}>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                                                Submitted Images
                                                            </div>
                                                            <div className="assessment-image-grid">
                                                                {resp.images.map((imageUrl: string, imageIdx: number) => {
                                                                    const resolvedImageUrl = resolveImageUrl(imageUrl);
                                                                    if (!resolvedImageUrl) return null;
                                                                    return (
                                                                        <a
                                                                            key={`${idx}-image-${imageIdx}`}
                                                                            href={resolvedImageUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="assessment-image-thumb"
                                                                            aria-label={`Open image ${imageIdx + 1} for question ${idx + 1}`}
                                                                        >
                                                                            <img
                                                                                src={resolvedImageUrl}
                                                                                alt={`Question ${idx + 1} submission ${imageIdx + 1}`}
                                                                                loading="lazy"
                                                                            />
                                                                        </a>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ position: 'sticky', top: '100px' }}>
                                        <div className="card" style={{ padding: '2rem', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '2.5rem' }}>
                                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Score Obtained</div>
                                                <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#064e3b' }}>
                                                    {selectedReview.totalScore}
                                                    {selectedReview.maxScore && <span style={{ fontSize: '1.5rem', opacity: 0.6 }}> / {selectedReview.maxScore}</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Assessor</span>
                                                    <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{selectedReview.assessor?.name}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Date</span>
                                                    <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{new Date(selectedReview.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '2.5rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>QC Review Feedback</label>
                                            <textarea
                                                value={qcRemarks}
                                                onChange={(e) => setQCRemarks(e.target.value)}
                                                placeholder="Enter feedback or reasons for reassessment..."
                                                style={{
                                                    width: '100%',
                                                    padding: '1.25rem',
                                                    borderRadius: '16px',
                                                    border: '2px solid #e2e8f0',
                                                    minHeight: '120px',
                                                    fontSize: '0.95rem',
                                                    outline: 'none',
                                                    transition: 'border-color 0.2s ease'
                                                }}
                                                onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <button
                                                onClick={() => handleQCAction(selectedReview.id, 'reassessment')}
                                                className="btn"
                                                disabled={actionLoading}
                                                style={{
                                                    padding: '1.25rem',
                                                    borderRadius: '16px',
                                                    backgroundColor: '#fee2e2',
                                                    color: '#b91c1c',
                                                    fontWeight: 800,
                                                    border: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                                                    opacity: actionLoading ? 0.7 : 1,
                                                    width: '100%'
                                                }}
                                            >
                                                Send Back
                                            </button>
                                            <button
                                                onClick={() => handleQCAction(selectedReview.id, 'under_review')}
                                                className="btn"
                                                disabled={actionLoading}
                                                style={{
                                                    padding: '1.25rem',
                                                    borderRadius: '16px',
                                                    backgroundColor: '#064e3b',
                                                    color: 'white',
                                                    fontWeight: 800,
                                                    border: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                                                    opacity: actionLoading ? 0.7 : 1,
                                                    width: '100%'
                                                }}
                                            >
                                                {actionLoading ? 'Processing...' : 'Approve'}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setSelectedReview(null)}
                                            className="btn btn-outline"
                                            style={{ width: '100%', padding: '1rem', borderRadius: '16px' }}
                                        >
                                            Cancel / Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Systematic Detail Modal (For Accessor) */}
            {selectedParticipant && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1.5rem'
                }}>
                    <div className="card shadow-premium" style={{
                        width: '100%',
                        maxWidth: '700px',
                        position: 'relative',
                        border: 'none',
                        padding: 0,
                        overflow: 'hidden',
                        borderRadius: '24px'
                    }}>
                        <div style={{
                            padding: '2rem',
                            background: 'linear-gradient(to right, #10b981, #34d399)',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.9, marginBottom: '0.25rem' }}>Task Details</div>
                                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, textTransform: 'capitalize' }}>{selectedParticipant.category}</h2>
                            </div>
                            <button onClick={() => setSelectedParticipant(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '12px', padding: '0.5rem', cursor: 'pointer', color: 'white' }}><X size={24} /></button>
                        </div>

                        <div style={{ padding: '2.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem' }}>
                                <div>
                                    <h5 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.125rem' }}>Verification Checklist</h5>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {Object.entries(selectedParticipant.details).map(([key, value]) => (
                                            <div key={key} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                                <div style={{ marginTop: '0.25rem' }}>
                                                    <div style={{ width: '18px', height: '18px', border: '2px solid #10b981', borderRadius: '4px' }}></div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.1rem' }}>{key.replace(/([A-Z])/g, ' $1')}</div>
                                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{String(value)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: '2.5rem' }}>
                                    <h5 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.125rem' }}>Location Info</h5>
                                    {selectedParticipant.locationLat ? (
                                        <div style={{ backgroundColor: '#f1f5f9', borderRadius: '16px', padding: '1.5rem', textAlign: 'center' }}>
                                            <div style={{ backgroundColor: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#10b981', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                                <MapPin size={24} />
                                            </div>
                                            <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Coordinates</div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'monospace' }}>
                                                {selectedParticipant.locationLat.toFixed(6)}, <br />
                                                {selectedParticipant.locationLng?.toFixed(6)}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fee2e2', borderRadius: '16px', color: '#b91c1c' }}>
                                            <AlertCircle size={32} style={{ margin: '0 auto 0.5rem' }} />
                                            <div style={{ fontSize: '0.875rem', fontWeight: 800 }}>No GPS Data</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setSelectedParticipant(null)} className="btn btn-outline" style={{ flex: 1, padding: '1rem' }}>Close Summary</button>
                                <button className="btn btn-primary" style={{ flex: 2, padding: '1rem', backgroundColor: '#10b981', border: 'none' }}>Begin Verification</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* ── Assessor Filtered Drawer ── */}
        {assessorDrawer && (() => {
            const statusMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
                pending:      { label: 'Not Started',  color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
                in_progress:  { label: 'In Progress',  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                completed:    { label: 'Completed',    color: '#065f46', bg: '#f0fdf4', border: '#bbf7d0' },
                qc_approved:  { label: 'QC Verified',  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                under_review: { label: 'Under Review', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                published:    { label: 'Published',    color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
                reassessment: { label: 'Reassessment', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
                rejected:     { label: 'Rejected',     color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
            };
            const data = assessorDrawer.data;
            return (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex' }}>
                    <div style={{ flex: 1, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setAssessorDrawer(null)} />
                    <div style={{ width: '540px', background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 50px rgba(0,0,0,0.18)' }}>
                        {/* Header */}
                        <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#fff' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Assessor Analytics</div>
                                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{assessorDrawer.title}</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{assessorDrawer.subtitle}</p>
                            </div>
                            <button onClick={() => setAssessorDrawer(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '1.1rem', flexShrink: 0 }}>✕</button>
                        </div>
                        {/* Count badge */}
                        <div style={{ padding: '0.875rem 1.75rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>
                                {data.length} {data.length === 1 ? 'record' : 'records'} found
                            </span>
                        </div>
                        {/* List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
                            {data.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '5rem 2rem', color: '#94a3b8' }}>
                                    <ClipboardList size={40} style={{ marginBottom: '1rem', opacity: 0.2, display: 'block', margin: '0 auto 1rem' }} />
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>No records found</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>No assessments match this filter</div>
                                </div>
                            ) : data.map((row: any, i: number) => {
                                const s = statusMap[row.status] || { label: row.status || 'Unknown', color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' };
                                const isDraft = row.status === 'in_progress';
                                const canReview = !!row.assessmentId;
                                return (
                                    <div key={i}
                                        onClick={() => {
                                            if (canReview) {
                                                if (isDraft) {
                                                    navigate(`/assessment-review/${row.assessmentId}`);
                                                } else {
                                                    navigate(`/assessment/${row.assessmentId}`);
                                                }
                                            } else if (row.participantId) {
                                                navigate(`/participants/${row.participantId}/assessments`);
                                            }
                                            setAssessorDrawer(null);
                                        }}
                                        style={{
                                            padding: '1rem 1.75rem',
                                            borderBottom: '1px solid #f8fafc',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            transition: 'background 0.15s',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.participantName}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '3px', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                <span style={{ textTransform: 'capitalize' }}>{row.category}</span>
                                                {row.assessorName && row.assessorName !== '—' && <span>👤 {row.assessorName}</span>}
                                                {row.assessorZone && row.assessorZone !== '—' && <span>📍 {row.assessorZone}</span>}
                                            </div>
                                            {row.lastActivity && (
                                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                                                    {new Date(row.lastActivity).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', flexShrink: 0 }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: s.color, background: s.bg, padding: '0.25rem 0.65rem', borderRadius: '100px', border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{s.label}</span>
                                            {row.totalScore !== null && row.totalScore !== undefined && (
                                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Score: {row.totalScore}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        })()}

        {/* ── Category SA Drawer ── */}
        {saDrawer && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.45)' }} onClick={() => setSaDrawer(null)} />
                <div style={{ width: '520px', background: 'white', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)' }}>
                    {/* Header */}
                    <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Self Assessment Status</div>
                            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{saDrawer.label}</h3>
                        </div>
                        <button onClick={() => setSaDrawer(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#475569' }}>✕</button>
                    </div>

                    {/* Summary bar */}
                    {!saDrawer.loading && saDrawer.data.length > 0 && (() => {
                        const sub = saDrawer.data.filter((p: any) => p.status === 'Submitted' || p.status === 'Approved').length;
                        const draft = saDrawer.data.filter((p: any) => p.status === 'Draft').length;
                        const ns = saDrawer.data.filter((p: any) => p.status === 'Not Started').length;
                        return (
                            <div style={{ display: 'flex', gap: '1rem', padding: '1rem 1.75rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                                {[{ label: 'Submitted', val: sub, color: '#16a34a', bg: '#f0fdf4' }, { label: 'In Progress', val: draft, color: '#d97706', bg: '#fffbeb' }, { label: 'Not Started', val: ns, color: '#475569', bg: '#f1f5f9' }].map(({ label, val, color, bg }) => (
                                    <div key={label} style={{ flex: 1, background: bg, borderRadius: '10px', padding: '0.6rem 0.875rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color }}>{val}</div>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>{label}</div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}

                    {/* List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
                        {saDrawer.loading ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: '#475569', fontWeight: 600 }}>Loading...</div>
                        ) : saDrawer.data.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: '#475569', fontWeight: 600 }}>No participants found</div>
                        ) : saDrawer.data.map((p: any) => {
                            const statusColor = p.status === 'Submitted' ? '#16a34a' : p.status === 'Draft' ? '#d97706' : '#475569';
                            const statusBg = p.status === 'Submitted' ? '#f0fdf4' : p.status === 'Draft' ? '#fffbeb' : '#f8fafc';
                            return (
                                <div key={p.id} style={{ padding: '0.875rem 1.75rem', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, marginTop: '2px' }}>{p.mobile}</div>
                                        {p.submittedAt && <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '2px' }}>{new Date(p.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: statusColor, background: statusBg, padding: '0.3rem 0.75rem', borderRadius: '100px', border: `1px solid ${statusColor}33` }}>{p.status}</span>
                                        {p.selfAssessmentId && (
                                            <button onClick={() => openSAAnswers(p.selfAssessmentId)} style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', background: '#4f46e5', border: 'none', borderRadius: '8px', padding: '0.4rem 0.875rem', cursor: 'pointer' }}>
                                                View Answers
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}

        {/* ── SA Answers Modal ── */}
        {saAnswerModal && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '720px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
                    <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Submitted Answers</div>
                            {saAnswerModal.data && (() => {
                            const d = saAnswerModal.data.selfAssessment?.participant?.details as any;
                            const name = d?.name || d?.wardName || d?.schoolName || d?.hospitalName || d?.officeName || d?.marketName || 'Participant';
                            const answers = (saAnswerModal.data.selfAssessment?.answers || {}) as Record<string, any>;
                            const questions = saAnswerModal.data.questions as any[];
                            const totalScore = questions.reduce((s: number, q: any) => s + (answers[q.id]?.score || 0), 0);
                            const maxScore = questions.reduce((s: number, q: any) => s + (q.marks || 0), 0);
                            return (
                                <>
                                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{name}</h3>
                                    <div style={{ marginTop: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5' }}>Total Score: {totalScore} / {maxScore}</div>
                                </>
                            );
                        })()}
                        </div>
                        <button onClick={() => setSaAnswerModal(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#475569' }}>✕</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {saAnswerModal.loading ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: '#475569', fontWeight: 600 }}>Loading answers...</div>
                        ) : !saAnswerModal.data ? (
                            <div style={{ textAlign: 'center', padding: '4rem', color: '#ef4444', fontWeight: 600 }}>Failed to load answers</div>
                        ) : (() => {
                            const { selfAssessment, questions } = saAnswerModal.data;
                            const answers = (selfAssessment?.answers || {}) as Record<string, any>;
                            let lastIndicator = '';
                            return (questions as any[]).map((q: any, i: number) => {
                                const ans = answers[q.id];
                                const score: number | null = ans?.score ?? null;
                                const yesNo: string | null = ans?.yesNo ?? null;
                                const imageUrls: string[] = ans?.imageUrls || [];
                                const showIndicatorHeader = q.indicator && q.indicator !== lastIndicator;
                                if (q.indicator) lastIndicator = q.indicator;
                                return (
                                    <React.Fragment key={q.id}>
                                        {showIndicatorHeader && (
                                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#92400e', background: '#fffbeb', padding: '0.4rem 0.875rem', borderRadius: '6px', marginTop: i > 0 ? '0.5rem' : 0 }}>{q.indicator}</div>
                                        )}
                                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '0.875rem 1.25rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: imageUrls.length > 0 ? '0.75rem' : 0 }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.72rem', color: '#475569', minWidth: '28px', paddingTop: '2px', flexShrink: 0 }}>Q{i + 1}</span>
                                                    <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>{q.text}</span>
                                                </div>
                                                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                                    {score === null && !yesNo ? (
                                                        <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}>—</span>
                                                    ) : yesNo ? (
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: yesNo === 'yes' ? '#16a34a' : '#ef4444', background: yesNo === 'yes' ? '#f0fdf4' : '#fef2f2', padding: '0.25rem 0.75rem', borderRadius: '100px' }}>
                                                            {yesNo === 'yes' ? '✓ Yes' : '✗ No'}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#4f46e5' }}>{score}</span>
                                                            <span style={{ fontSize: '0.78rem', color: '#475569' }}>/{q.marks}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {imageUrls.length > 0 && (
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingLeft: '2rem' }}>
                                                    {imageUrls.map((url: string, idx: number) => {
                                                        const resolved = resolveImageUrl(url);
                                                        return (
                                                            <a key={idx} href={resolved} target="_blank" rel="noreferrer">
                                                                <img src={resolved} alt={`img-${idx}`} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e2e8f0', cursor: 'pointer' }}
                                                                    onClick={e => { e.preventDefault(); window.open(resolved, '_blank'); }} />
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default Dashboard;
