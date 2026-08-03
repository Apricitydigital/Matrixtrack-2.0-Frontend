import React, { useEffect, useState, useRef, useMemo } from 'react';

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
    Download,
    User,

    FileText,

    ChevronRight,
    Target,
    Layers,
    Landmark,

    GraduationCap,
    Briefcase,
    Store,
    Hotel
} from 'lucide-react';
import NoAccess from '../components/NoAccess';
import { hasPermission } from '../utils/accessControl';
import swachhBg from '../assets/swachh_background.png';

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
    { label: 'Ward', key: 'wards', filter: 'wards', icon: Landmark },
    { label: 'Schools', key: 'schools', filter: 'schools', icon: GraduationCap },
    { label: 'Hospitals', key: 'hospitals', filter: 'hospitals', icon: Building2 },
    { label: 'Offices', key: 'offices', filter: 'offices', icon: Briefcase },
    { label: 'Markets', key: 'markets', filter: 'markets', icon: Store },
    { label: 'Societies - BWG', key: 'societies_bwg', filter: 'societies - bwg', icon: Users },
    { label: 'Hotels', key: 'hotels', filter: 'hotels', icon: Hotel },
    { label: 'Citizen / Groups', key: 'citizen_puraskar', filter: 'citizen_puraskar', icon: Users2 }
];

const Dashboard = () => {
    const navigate = useNavigate();
    const user = useMemo(() => {
        if (typeof window === 'undefined') return { role: 'admin', permissions: { dashboard: { view: true } } };
        try {
            const stored = localStorage.getItem('user') || localStorage.getItem('swachh_user');
            return stored ? JSON.parse(stored) : { role: 'admin', permissions: { dashboard: { view: true } } };
        } catch {
            return { role: 'admin', permissions: { dashboard: { view: true } } };
        }
    }, []);


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
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

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
        const metaEnv = (import.meta as any).env || {};
        const mediaBase = metaEnv.VITE_MEDIA_BASE_URL?.replace(/\/+$/, '') || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MEDIA_BASE_URL : '');
        const envBase = metaEnv.VITE_API_BASE_URL?.replace(/\/+$/, '') || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE_URL : '');
        const fallback = metaEnv.DEV ? 'http://localhost:5000' : (typeof window !== 'undefined' ? window.location.origin.replace(/\/+$/, '') : '');


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
        const headers = ["Assessor", "Category", "Score", "Date"];
        const rows = recentAssessments.map((a: any) => [
            a.assessor?.name || "Unknown",
            a.participant?.category || "General",
            a.finalScore ?? a.totalScore ?? 0,
            new Date(a.createdAt).toLocaleString()
        ]);
        const csvContent = [headers, ...rows].map(e => e.map(v => `"${v}"`).join(",")).join("\n");
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
            {/* ── Dashboard Header ── */}

<header style={{ 
    marginBottom: '1.25rem', 
    position: 'relative', 
    borderRadius: '20px', 
    overflow: 'hidden', 
    background: 'white',
    border: '1px solid #f1f5f9',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
}}>
    <div style={{
        position: 'absolute', 
        inset: 0, 
        backgroundImage: `url(${(swachhBg as any)?.src || (typeof swachhBg === 'string' ? swachhBg : '/assets/swachh_background.png')})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'right bottom', 
        backgroundRepeat: 'no-repeat',
        opacity: 1,
        zIndex: 0
    }} />

    <div className="dashboard-header-row" style={{ position: 'relative', zIndex: 1, padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="dashboard-header-text">


            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <span style={{ padding: '0.4rem 0.8rem', backgroundColor: '#f0f5ff', color: '#4f46e5', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {user.role} Portal
                </span>
                <span style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem', letterSpacing: '-0.03em', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'}! <span style={{ fontSize: '2.5rem' }}></span>
            </h1>

            <p style={{ color: '#475569', fontSize: '1rem', fontWeight: 600, maxWidth: '600px', lineHeight: 1.5 }}>
                Real-time field monitoring &amp; city ranking intelligence.
            </p>


        </div>
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
    <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        padding: '1.5rem 1.75rem',
        marginBottom: '2rem'
    }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '4px', height: '20px', backgroundColor: '#5a52ff', borderRadius: '2px' }} />
            Participation by Category
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: '0.875rem' }}>
            {CATEGORY_CARDS.map(({ label, key, filter, icon: IconComponent }) => {
                const isHovered = hoveredCategory === key;
                return (
                    <div key={label}
                        onClick={() => navigate(`/admin/participants?category=${encodeURIComponent(filter)}`)}
                        onMouseEnter={() => setHoveredCategory(key)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        className="hover-scale"
                        title={label}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '14px',
                            border: isHovered ? '1px solid #6366f1' : '1px solid #f1f5f9',
                            boxShadow: isHovered ? '0 6px 18px rgba(99,102,241,0.12)' : '0 2px 8px rgba(0,0,0,0.02)',
                            padding: '0.75rem 0.625rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}>
                        {isHovered && (
                            <div style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 8px)',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#0f172a',
                                color: '#ffffff',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 16px rgba(15,23,42,0.25)',
                                zIndex: 99,
                                pointerEvents: 'none'
                            }}>
                                {label}
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '5px solid transparent',
                                    borderRight: '5px solid transparent',
                                    borderTop: '5px solid #0f172a'
                                }} />
                            </div>
                        )}
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#f0f5ff',
                            color: '#4f46e5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <IconComponent size={18} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={label}>
                                {label}
                            </span>
                            <span style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.5rem',
                                backgroundColor: '#f0f5ff',
                                color: '#4f46e5',
                                borderRadius: '100px',
                                fontWeight: 900,
                                marginTop: '0.2rem',
                                width: 'fit-content'
                            }}>
                                {stats?.categories?.[key] || 0}
                            </span>
                        </div>
                    </div>
                );
            })}

        </div>
    </div>
)}

{/* ── Admin System Overview ── */}
{user.role === 'admin' && (
    <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        padding: '1.5rem 1.75rem',
        marginBottom: '2rem'
    }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '4px', height: '20px', backgroundColor: '#5a52ff', borderRadius: '2px' }} />
            System Overview
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
            {[
                { path: '/admin/users?role=qc', border: '#16a34a', iconBg: '#f0fdf4', iconColor: '#16a34a', icon: <Shield size={20} />, label: 'QC MEMBERS', value: stats?.overview?.qcMembers ?? 0, waveColor: '#16a34a' },
                { path: '/admin/users?role=accessor', border: '#2563eb', iconBg: '#eff6ff', iconColor: '#2563eb', icon: <Users2 size={20} />, label: 'ASSESSORS', value: stats?.overview?.assessors ?? 0, waveColor: '#2563eb' },
                { path: '/admin/users?role=admin', border: '#9333ea', iconBg: '#faf5ff', iconColor: '#9333ea', icon: <Users size={20} />, label: 'ADMINS', value: stats?.overview?.admins ?? 0, waveColor: '#9333ea' },
                { path: '/admin/participants', border: '#db2777', iconBg: '#fdf2f8', iconColor: '#db2777', icon: <Building2 size={20} />, label: 'PARTICIPANTS', value: totalParticipants ?? 0, waveColor: '#db2777' },
            ].map(({ path, border, iconBg, iconColor, icon, label, value, waveColor }) => (
                <div key={label} onClick={() => navigate(path)}
                    className="hover-scale"
                    style={{
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '1.5rem',
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        border: '1px solid #f1f5f9',
                        borderLeft: `4px solid ${border}`,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            backgroundColor: iconBg,
                            color: iconColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            {icon}
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {label}
                        </span>
                    </div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 950, color: '#0f172a', lineHeight: 1 }}>
                        {value}
                    </div>
                    <svg style={{ position: 'absolute', bottom: 0, right: 0, width: '120px', height: '55px', opacity: 0.25, pointerEvents: 'none' }} viewBox="0 0 120 55" preserveAspectRatio="none">
                        <path d="M0,55 C40,25 75,45 120,15 L120,55 Z" fill={waveColor} />
                    </svg>
                </div>
            ))}
        </div>
    </div>
)}

{/* ── Self-Assessment Submissions ── */}
{user.role === 'admin' && (
    <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        padding: '1.5rem 1.75rem',
        marginBottom: '2rem'
    }}>
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '4px', height: '20px', backgroundColor: '#5a52ff', borderRadius: '2px' }} />
                Self-Assessment Submissions
            </h3>
            <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#4f46e5',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '0.3rem 0.75rem',
                borderRadius: '100px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
            }}>
                <RefreshCw size={12} /> Auto-refreshes every 30s
            </span>
        </div>

        {/* 4 Summary KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {[
                {
                    label: 'TOTAL REGISTERED',
                    value: totalParticipants ?? 0,
                    desc: 'All participants',
                    icon: <Users size={20} />,
                    border: '#6366f1',
                    iconBg: '#f0f0fe',
                    iconColor: '#6366f1',
                    valueColor: '#0f172a',
                    onClick: () => navigate('/admin/participants'),
                    watermark: <Users size={56} style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.05, color: '#6366f1' }} />
                },
                {
                    label: 'SUBMITTED',
                    value: stats?.selfAssessments?.submitted ?? 0,
                    desc: 'Completed submissions',
                    icon: <CheckCircle2 size={20} />,
                    border: '#16a34a',
                    iconBg: '#f0fdf4',
                    iconColor: '#16a34a',
                    valueColor: '#16a34a',
                    onClick: () => openSAStatusDrawer('Submitted', 'Submitted'),
                    watermark: <CheckCircle2 size={56} style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.05, color: '#16a34a' }} />
                },
                {
                    label: 'IN PROGRESS',
                    value: stats?.selfAssessments?.draft ?? 0,
                    desc: 'Submissions in progress',
                    icon: <Clock size={20} />,
                    border: '#d97706',
                    iconBg: '#fffbeb',
                    iconColor: '#d97706',
                    valueColor: '#d97706',
                    onClick: () => openSAStatusDrawer('Draft', 'In Progress'),
                    watermark: <Clock size={56} style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.05, color: '#d97706' }} />
                },
                {
                    label: 'NOT STARTED',
                    value: Math.max(0, (totalParticipants ?? 0) - (stats?.selfAssessments?.total ?? 0)),
                    desc: 'Yet to begin',
                    icon: <FileText size={20} />,
                    border: '#2563eb',
                    iconBg: '#eff6ff',
                    iconColor: '#2563eb',
                    valueColor: '#2563eb',
                    onClick: () => openSAStatusDrawer('Not Started', 'Not Started'),
                    watermark: <FileText size={56} style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.05, color: '#2563eb' }} />
                },
            ].map(({ label, value, desc, icon, border, iconBg, iconColor, valueColor, onClick, watermark }) => (
                <div
                    key={label}
                    onClick={onClick}
                    className="hover-scale"
                    style={{
                        position: 'relative',
                        overflow: 'hidden',
                        backgroundColor: 'white',
                        borderRadius: '16px',
                        border: '1px solid #f1f5f9',
                        borderLeft: `4px solid ${border}`,
                        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        padding: '1.25rem 1.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    {watermark}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.875rem' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            backgroundColor: iconBg,
                            color: iconColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            {icon}
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {label}
                        </span>
                    </div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 950, color: valueColor, lineHeight: 1.1, marginBottom: '0.2rem' }}>
                        {value}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                        {desc}
                    </div>
                </div>
            ))}
        </div>

        {/* Bottom 2 Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '1.25rem', alignItems: 'stretch' }}>
            {/* Category-wise progress */}
            <div style={{ backgroundColor: 'white', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
                    CATEGORY-WISE PROGRESS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {CATEGORY_CARDS.map(({ label, key }) => {
                        const catData = stats?.selfAssessments?.byCategory?.[key] ?? { total: 0, submitted: 0, draft: 0 };
                        const total = (stats?.categories?.[key] as number) || catData.total || 0;
                        const submitted = catData.submitted || 0;
                        const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
                        return (
                            <div key={key} onClick={() => openCategoryDrawer(key, label)} style={{ cursor: 'pointer', borderRadius: '8px', transition: 'background 0.15s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{label}</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                                        {submitted} / {total} <span style={{ color: pct === 100 ? '#16a34a' : '#475569' }}>({pct}%)</span> <span style={{ color: '#94a3b8', marginLeft: '2px' }}>&gt;</span>
                                    </span>
                                </div>
                                <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct === 100 ? '#16a34a' : '#22c55e', borderRadius: '100px', transition: 'width 0.5s ease' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recent Submissions */}
            <div style={{ backgroundColor: 'white', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                    RECENT SUBMISSIONS
                </div>
                {(!stats?.selfAssessments?.recentSubmissions || stats?.selfAssessments?.recentSubmissions?.length === 0) ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem 1rem' }}>
                        <div style={{
                            width: '110px',
                            height: '110px',
                            borderRadius: '50%',
                            backgroundColor: '#f5f3ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1.25rem',
                            position: 'relative'
                        }}>
                            <div style={{ color: '#818cf8' }}>
                                <ClipboardList size={52} strokeWidth={1.5} />
                            </div>
                            <div style={{
                                position: 'absolute',
                                bottom: '10px',
                                right: '10px',
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                backgroundColor: '#6366f1',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)'
                            }}>
                                <Search size={15} />
                            </div>
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                            No submissions yet
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                            Recent submissions will appear here once available.
                        </div>
                    </div>
                ) : (
                    <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                        {stats?.selfAssessments?.recentSubmissions?.map((s: any, i: number) => (
                            <div key={s.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: i === 0 ? '#f0fdf4' : 'white', borderRadius: '8px' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{s.name}</div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'capitalize' }}>{s.category}</div>
                                </div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textAlign: 'right' }}>
                                    {s.submittedAt ? new Date(s.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
        { (() => {
            const activityData = assessorActivity || {
                totalAssessors: 0,
                activeAssessors: 0,
                totalAssigned: 0,
                completedToday: 0,
                notStarted: 0,
                inProgress: 0,
                completed: 0,
                qcVerified: 0,
                rejected: 0,
                categoryBreakdown: {},
                liveActivity: [],
                assignedList: [],
                assignedListToday: []
        };

    
            return (
                <>
                    {/* ── Row 1: Primary KPI Cards ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
                        {([
                            { label: 'Total Assessors', value: activityData.totalAssessors, icon: <Users2 size={22} />, color: '#3730a3', accent: '#6366f1', bg: 'linear-gradient(145deg, #eef2ff 0%, #ffffff 100%)', border: '#c7d2fe', desc: 'Registered field staff', onClick: () => navigate('/admin/users?role=accessor') },
                            { label: 'Active Now', value: activityData.activeAssessors, icon: <Zap size={22} />, color: '#059669', accent: '#10b981', bg: 'linear-gradient(145deg, #ecfdf5 0%, #ffffff 100%)', border: '#a7f3d0', desc: 'Currently in field', isLive: true, onClick: () => setAssessorDrawer({ title: 'Active Assessors', subtitle: 'Assessors with in-progress assessments', data: (activityData.assignedList || []).filter((r: any) => r.status === 'in_progress') }) },
                            { label: 'Total Assigned', value: activityData.totalAssigned, icon: <ClipboardList size={22} />, color: '#0369a1', accent: '#0ea5e9', bg: 'linear-gradient(145deg, #f0f9ff 0%, #ffffff 100%)', border: '#bae6fd', desc: 'Assessments allocated', onClick: () => setAssessorDrawer({ title: 'All Assigned', subtitle: 'Every participant assigned to an assessor', data: activityData.assignedList || [] }) },
                            { label: 'Done Today', value: activityData.completedToday, icon: <TrendingUp size={22} />, color: '#be185d', accent: '#ec4899', bg: 'linear-gradient(145deg, #fdf2f8 0%, #ffffff 100%)', border: '#fbcfe8', desc: "Today's completions", onClick: () => setAssessorDrawer({ title: "Done Today", subtitle: "Assessments completed or verified today", data: activityData.assignedListToday || [] }) },
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
                            { label: 'Not Started', value: activityData.notStarted, icon: <Clock size={20} />, color: '#92400e', accent: '#fbbf24', bg: 'linear-gradient(145deg, #fffbeb 0%, #ffffff 100%)', border: '#fde68a', desc: 'Awaiting field visit', filterFn: (r: any) => !r.status || r.status === 'pending' },
                            { label: 'In Progress', value: activityData.inProgress, icon: <Activity size={20} />, color: '#1d4ed8', accent: '#60a5fa', bg: 'linear-gradient(145deg, #eff6ff 0%, #ffffff 100%)', border: '#bfdbfe', desc: 'Currently active', filterFn: (r: any) => r.status === 'in_progress' },
                            { label: 'Completed', value: activityData.completed, icon: <CheckCircle2 size={20} />, color: '#065f46', accent: '#22c55e', bg: 'linear-gradient(145deg, #f0fdf4 0%, #ffffff 100%)', border: '#bbf7d0', desc: 'QC review pending', filterFn: (r: any) => r.status === 'completed' },
                            { label: 'QC Verified', value: activityData.qcVerified, icon: <Shield size={20} />, color: '#7c3aed', accent: '#a78bfa', bg: 'linear-gradient(145deg, #f5f3ff 0%, #ffffff 100%)', border: '#ddd6fe', desc: 'Fully verified', filterFn: (r: any) => ['qc_approved', 'under_review', 'published'].includes(r.status) },
                        ] as any[]).map(({ label, value, icon, color, accent, bg, border, desc, filterFn }) => {
                            const total = activityData.totalAssigned || 1;
                            const pct = Math.min(100, Math.round(((value || 0) / total) * 100));
                            return (
                                <div key={label}
                                    onClick={() => setAssessorDrawer({ title: label, subtitle: desc, data: (activityData.assignedList || []).filter(filterFn) })}
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
                        <div className="card shadow-premium" style={{ border: '1px solid #f1f5f9', padding: '1.75rem', borderRadius: 24, background: '#ffffff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <BarChart3 size={18} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Category Progress</div>
                                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Click category to view details</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', fontWeight: 700 }}>
                                    <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />Done</span>
                                    <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />Active</span>
                                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }} />Pending</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                {(() => {
                                    const defaultCategories = [
                                        { key: 'Wards', label: 'Wards' },
                                        { key: 'Hotels', label: 'Hotels' },
                                        { key: 'Schools', label: 'Schools' },
                                        { key: 'Societies - Bwg', label: 'Societies - BWG' },
                                        { key: 'Hospitals', label: 'Hospitals' },
                                        { key: 'Offices', label: 'Offices' },
                                        { key: 'Markets', label: 'Markets' },
                                    ];

                                    const breakdownKeys = Object.keys(activityData.categoryBreakdown || {});
                                    const itemsToRender = breakdownKeys.length > 0 
                                        ? Object.entries(activityData.categoryBreakdown).map(([cat, d]: any) => ({
                                            cat,
                                            done: (d.completed || 0) + (d.qcVerified || 0),
                                            inProg: d.inProgress || 0,
                                            pending: d.notStarted || 0,
                                            total: d.total || 0,
                                            pct: (d.total || 0) > 0 ? Math.round((((d.completed || 0) + (d.qcVerified || 0)) / d.total) * 100) : 0
                                        }))
                                        : defaultCategories.map(c => ({
                                            cat: c.label,
                                            done: 0,
                                            inProg: 0,
                                            pending: 0,
                                            total: 0,
                                            pct: 0
                                        }));

                                    return itemsToRender.map(({ cat, done, inProg, pending, total, pct }) => (
                                        <div key={cat}
                                            onClick={() => navigate(`/admin/participants?category=${encodeURIComponent(cat)}`)}
                                            style={{ padding: '0.875rem 1.25rem', background: '#f8fafc', borderRadius: 16, cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', border: '1px solid #f1f5f9' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.04)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.boxShadow = ''; }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>{cat}</span>
                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a' }}>{done} done</span>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb' }}>{inProg} active</span>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>{pending} pending</span>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: pct >= 80 ? '#16a34a' : pct >= 40 ? '#2563eb' : '#d97706', background: pct >= 80 ? '#f0fdf4' : pct >= 40 ? '#eff6ff' : '#fffbeb', padding: '2px 10px', borderRadius: 8, border: `1px solid ${pct >= 80 ? '#bbf7d0' : pct >= 40 ? '#bfdbfe' : '#fde68a'}` }}>{pct}%</span>
                                                </div>
                                            </div>
                                            <div style={{ height: 7, background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden', display: 'flex' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: '#22c55e', transition: 'width 0.7s ease' }} />
                                                <div style={{ width: `${total > 0 ? Math.round((inProg/total)*100) : 0}%`, height: '100%', background: '#3b82f6', transition: 'width 0.7s ease' }} />
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>


                        {/* Assessment Pipeline */}
                        <div className="card shadow-premium" style={{ border: '1px solid #f1f5f9', padding: '1.75rem', borderRadius: 24, background: '#ffffff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f5f3ff', border: '1px solid #edd5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Target size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Assessment Pipeline</div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Click stage to open filtered view</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {[
                                    { label: 'Not Started', value: activityData.notStarted, color: '#d97706', bar: '#f59e0b', bg: '#fffdf5', border: '#fef3c7', desc: 'Awaiting field visit', filterFn: (r: any) => !r.status || r.status === 'pending' },
                                    { label: 'In Progress', value: activityData.inProgress, color: '#2563eb', bar: '#3b82f6', bg: '#f8fafc', border: '#dbeafe', desc: 'Being assessed', filterFn: (r: any) => r.status === 'in_progress' },
                                    { label: 'Completed', value: activityData.completed, color: '#16a34a', bar: '#22c55e', bg: '#f9fdfa', border: '#dcfce7', desc: 'QC pending', filterFn: (r: any) => r.status === 'completed' },
                                    { label: 'QC Verified', value: activityData.qcVerified, color: '#7c3aed', bar: '#8b5cf6', bg: '#faf5ff', border: '#f3e8ff', desc: 'Verified & approved', filterFn: (r: any) => ['qc_approved', 'under_review', 'published'].includes(r.status) },
                                    { label: 'Rejected', value: activityData.rejected, color: '#dc2626', bar: '#ef4444', bg: '#fff5f5', border: '#fee2e2', desc: 'Needs reassessment', filterFn: (r: any) => ['reassessment', 'rejected'].includes(r.status) },
                                ].map(({ label, value, color, bar, bg, border, desc, filterFn }, idx) => {
                                    const total = activityData.totalAssigned || 1;
                                    const pct = Math.min(100, Math.round(((value || 0) / total) * 100));
                                    const indentPct = idx * 5;
                                    return (
                                        <React.Fragment key={label}>
                                            <div
                                                onClick={() => setAssessorDrawer({ title: label, subtitle: desc, data: (activityData.assignedList || []).filter(filterFn) })}
                                                style={{
                                                    background: bg,
                                                    borderRadius: 16,
                                                    padding: '0.875rem 1.25rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                                                    border: `1px solid ${border}`,
                                                    borderLeft: `4px solid ${color}`,
                                                    marginLeft: `${indentPct}%`,
                                                    width: `${100 - indentPct}%`
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 18px ${color}15`; }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color }}>{label}</span>
                                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{desc}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>{pct}%</span>
                                                        <span style={{ fontSize: '1.25rem', fontWeight: 950, color, lineHeight: 1 }}>{value ?? 0}</span>
                                                    </div>
                                                </div>
                                                <div style={{ height: 5, background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: bar, borderRadius: '100px', transition: 'width 0.7s ease' }} />
                                                </div>
                                            </div>
                                            {idx < 4 && (
                                                <div style={{ display: 'flex', justifyContent: 'center', padding: '1px 0', color: '#cbd5e1', fontSize: '0.75rem', opacity: 0.7 }}>↓</div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── Live Assessor Monitoring Data Grid ── */}
                    <div className="card shadow-premium" style={{ border: 'none', padding: 0, overflow: 'hidden', borderRadius: 24, background: '#ffffff', marginBottom: '1.75rem' }}>
                        {/* Grid Header */}
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.875rem', background: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 0 4px #22c55e22' }} />
                                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Live Assessor Monitoring</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', padding: '0.2rem 0.65rem', background: '#f1f5f9', borderRadius: '8px' }}>
                                    {(activityData.liveActivity || []).length} records
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                <div style={{ display: 'flex', gap: '0.875rem', fontSize: '0.68rem', fontWeight: 700 }}>
                                    {[{ c: '#22c55e', l: 'Completed' }, { c: '#60a5fa', l: 'In Progress' }, { c: '#a78bfa', l: 'QC Verified' }].map(({ c, l }) => (
                                        <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#64748b' }}>
                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
                                        </span>
                                    ))}
                                </div>
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
                                const list = activityData.liveActivity || [];
                                const filtered = activitySearch
                                    ? list.filter((r: any) => {
                                        const q = activitySearch.toLowerCase();
                                        return (
                                            r.assessorName?.toLowerCase().includes(q) ||
                                            r.participantName?.toLowerCase().includes(q) ||
                                            r.category?.toLowerCase().includes(q) ||
                                            r.assessorZone?.toLowerCase().includes(q) ||
                                            r.assessorWard?.toLowerCase().includes(q)
                                        );
                                    })
                                    : list;
                                const rows = filtered.slice(0, 15);

                                return (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                <th style={{ padding: '0.875rem 1.25rem' }}>Assessor</th>
                                                <th style={{ padding: '0.875rem 1.25rem' }}>Zone / Ward</th>
                                                <th style={{ padding: '0.875rem 1.25rem' }}>Participant</th>
                                                <th style={{ padding: '0.875rem 1.25rem' }}>Category</th>
                                                <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                                                <th style={{ padding: '0.875rem 1.25rem' }}>Submitted Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                                                        <div style={{
                                                            width: '96px',
                                                            height: '96px',
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            margin: '0 auto 1.25rem',
                                                            boxShadow: '0 8px 24px rgba(124,58,237,0.08)',
                                                            border: '1px solid #ddd6fe'
                                                        }}>
                                                            <ClipboardList size={44} color="#8b5cf6" strokeWidth={1.5} />
                                                        </div>
                                                        <h4 style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a', margin: '0 0 0.35rem' }}>No active assessor activity found</h4>
                                                        <p style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, margin: '0 auto 1.25rem', maxWidth: '360px' }}>Live updates will appear automatically as field assessments progress</p>
                                                    </td>
                                                </tr>
                                            ) : rows.map((row: any, i: number) => {
                                                const isDone = row.status === 'completed' || row.status === 'qc_approved';
                                                return (
                                                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s', cursor: 'pointer' }}
                                                        onClick={() => {
                                                            if (row.assessmentId) {
                                                                navigate(row.status === 'in_progress' ? `/assessment-review/${row.assessmentId}` : `/assessment/${row.assessmentId}`);
                                                            } else {
                                                                navigate('/admin/users?role=accessor');
                                                            }
                                                        }}
                                                    >
                                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem' }}>
                                                                    {row.assessorName?.charAt(0)?.toUpperCase() || '?'}
                                                                </div>
                                                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                                                                    {row.assessorName || '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.78rem', color: '#64748b' }}>
                                                            {[row.assessorZone, row.assessorWard].filter((v: string) => v && v !== '—').join(' / ') || '—'}
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.78rem', color: '#1e293b', fontWeight: 700 }}>
                                                            {row.participantName || '—'}
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '6px', backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                                                                {row.category || 'Wards'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                                            <span style={{
                                                                fontSize: '0.72rem',
                                                                fontWeight: 800,
                                                                padding: '0.25rem 0.65rem',
                                                                borderRadius: '100px',
                                                                backgroundColor: isDone ? '#f0fdf4' : '#eff6ff',
                                                                color: isDone ? '#166534' : '#1d4ed8',
                                                                border: `1px solid ${isDone ? '#bbf7d0' : '#bfdbfe'}`,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.35rem'
                                                            }}>
                                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isDone ? '#22c55e' : '#3b82f6' }} />
                                                                {isDone ? 'Completed' : 'In Progress'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', color: '#1e293b', fontWeight: 600 }}>
                                                            {row.lastActivity ? new Date(row.lastActivity).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                );
                            })()}
                            </div>
                        </div>
                


                    {/* ── Category Champions Banner ── */}

                    <div style={{
                        background: 'linear-gradient(135deg, #044e3a 0%, #065f46 100%)',
                        borderRadius: 24,
                        padding: '1.75rem 2rem',
                        marginBottom: '1.75rem',
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 12px 32px rgba(6, 95, 70, 0.25)'
                    }}>
                        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>Category Champions</h3>
                                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', margin: '4px 0 0', fontWeight: 600 }}>Top Performing Entities Across Regions</p>
                            </div>
                            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trophy size={24} color="#facc15" />
                            </div>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.22)', borderRadius: 16, padding: '1.15rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>WARDS</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff' }}>{stats?.topCategoryParticipant || 'Unnamed'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 950, color: '#facc15', lineHeight: 1 }}>{stats?.topCategoryPoints || 7358}</div>
                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>PTS</div>
                            </div>
                        </div>
                    </div>

                    {/* ── System-wide Activity Data Grid ── */}
                    <div className="card shadow-premium" style={{ border: 'none', padding: 0, overflow: 'hidden', borderRadius: 24, background: '#ffffff' }}>
                        {/* Grid Header */}
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.875rem', background: '#fff' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>System-wide Activity</h3>
                                <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, margin: '2px 0 0' }}>Real-time assessment flow</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <button
                                    onClick={exportSystemActivityCSV}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.45rem 1rem',
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '10px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        color: '#475569',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                >
                                    <Download size={14} /> Export CSV
                                </button>
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
                                    qc_approved:  { label: 'QC Verified',  color: '#7c3aed', bg: '#f5f3ff',  dot: '#a78bfa', border: '#ddd6fe' },
                                    under_review: { label: 'Under Review', color: '#7c3aed', bg: '#f5f3ff',  dot: '#a78bfa', border: '#ddd6fe' },
                                    published:    { label: 'Published',    color: '#7c3aed', bg: '#f5f3ff',  dot: '#a78bfa', border: '#ddd6fe' },
                                    reassessment: { label: 'Reassessment', color: '#b91c1c', bg: '#fef2f2',  dot: '#f87171', border: '#fecaca' },
                                    rejected:     { label: 'Rejected',     color: '#b91c1c', bg: '#fef2f2',  dot: '#f87171', border: '#fecaca' },
                                };
                                const list = activityData.liveActivity || [];
                                const filtered = activitySearch
                                    ? list.filter((r: any) => {
                                        const q = activitySearch.toLowerCase();
                                        return (
                                            r.assessorName?.toLowerCase().includes(q) ||
                                            r.participantName?.toLowerCase().includes(q) ||
                                            r.category?.toLowerCase().includes(q) ||
                                            r.assessorZone?.toLowerCase().includes(q) ||
                                            r.assessorWard?.toLowerCase().includes(q)
                                        );
                                    })
                                    : list;

                                const rows = filtered.slice(0, 15);

                                return (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                <th style={{ padding: '0.875rem 1.25rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><User size={14} style={{ color: '#64748b' }} /> ASSESSOR</div>
                                                </th>
                                                <th style={{ padding: '0.875rem 1.25rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><MapPin size={14} style={{ color: '#64748b' }} /> ZONE / WARD</div>
                                                </th>
                                                <th style={{ padding: '0.875rem 1.25rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Users size={14} style={{ color: '#64748b' }} /> ASSIGNED PARTICIPANT</div>
                                                </th>
                                                <th style={{ padding: '0.875rem 1.25rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FileText size={14} style={{ color: '#64748b' }} /> CATEGORY</div>
                                                </th>
                                                <th style={{ padding: '0.875rem 1.25rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Activity size={14} style={{ color: '#64748b' }} /> STATUS</div>
                                                </th>
                                                <th style={{ padding: '0.875rem 1.25rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} style={{ color: '#64748b' }} /> LAST ACTION</div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} style={{ textAlign: 'center', padding: '4.5rem 2rem' }}>
                                                        <div style={{
                                                            width: '130px',
                                                            height: '130px',
                                                            borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            margin: '0 auto 1.5rem',
                                                            position: 'relative',
                                                            boxShadow: '0 10px 30px rgba(124,58,237,0.1)',
                                                            border: '1px solid #ddd6fe'
                                                        }}>
                                                            <ClipboardList size={56} color="#8b5cf6" strokeWidth={1.25} style={{ opacity: 0.9 }} />
                                                            <div style={{
                                                                position: 'absolute',
                                                                bottom: 8,
                                                                right: 8,
                                                                width: 38,
                                                                height: 38,
                                                                borderRadius: '50%',
                                                                background: '#7c3aed',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
                                                                border: '2px solid #ffffff'
                                                            }}>
                                                                <Search size={18} color="#ffffff" strokeWidth={2.5} />
                                                            </div>
                                                        </div>
                                                        <h4 style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0f172a', margin: '0 0 0.35rem' }}>No active assessor activity found</h4>
                                                        <p style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, margin: '0 auto 1.25rem', maxWidth: '380px' }}>Live updates will appear automatically as field assessments progress</p>
                                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', opacity: 0.5 }}>
                                                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#8b5cf6' }} />
                                                            <span style={{ width: 44, height: 2, background: 'linear-gradient(90deg, #8b5cf6, #ddd6fe)', borderRadius: 2 }} />
                                                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#8b5cf6' }} />
                                                        </div>
                                                    </td>
                                                </tr>

                                            ) : rows.map((row: any, i: number) => {
                                                const isDone = row.status === 'completed' || row.status === 'qc_approved';
                                                return (
                                                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s', cursor: 'pointer' }}
                                                        onClick={() => {
                                                            if (row.assessmentId) {
                                                                navigate(row.status === 'in_progress' ? `/assessment-review/${row.assessmentId}` : `/assessment/${row.assessmentId}`);
                                                            } else {
                                                                navigate('/admin/users?role=accessor');
                                                            }
                                                        }}
                                                    >
                                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem' }}>
                                                                    {row.assessorName?.charAt(0)?.toUpperCase() || '?'}
                                                                </div>
                                                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                                                                    {row.assessorName || '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.78rem', color: '#64748b' }}>
                                                            {[row.assessorZone, row.assessorWard].filter((v: string) => v && v !== '—').join(' / ') || '—'}
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.78rem', color: '#1e293b', fontWeight: 700 }}>
                                                            {row.participantName || '—'}
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '6px', backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                                                                {row.category || 'Wards'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1.25rem' }}>
                                                            <span style={{
                                                                fontSize: '0.72rem',
                                                                fontWeight: 800,
                                                                padding: '0.25rem 0.65rem',
                                                                borderRadius: '100px',
                                                                backgroundColor: isDone ? '#f0fdf4' : '#eff6ff',
                                                                color: isDone ? '#166534' : '#1d4ed8',
                                                                border: `1px solid ${isDone ? '#bbf7d0' : '#bfdbfe'}`,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.35rem'
                                                            }}>
                                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isDone ? '#22c55e' : '#3b82f6' }} />
                                                                {isDone ? 'Completed' : 'In Progress'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.75rem', color: '#1e293b', fontWeight: 600 }}>
                                                            {row.lastActivity ? new Date(row.lastActivity).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                );
                            })()}
                        </div>
                    </div>
                </>
            );
        })()}
    </div>
)}


            <div className={user.role === 'accessor' ? 'accessor-main-grid' : ''} style={user.role === 'accessor' ? { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' } : {}}>

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
        </div>
        </>
    );
};

export default Dashboard;