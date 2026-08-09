import { useNavigate, Link, useLocation } from '../react-router-shim';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    Users,
    ClipboardList,
    ClipboardCheck,
    LogOut,
    UserPlus,
    Layers,
    ShieldCheck,
    FileText,
    Award,
    User as UserIcon,
    X,
    Lock
} from 'lucide-react';
import PmcLogo from './PmcLogo';
import { hasPermission, ModuleKey } from '../utils/accessControl';

interface SidebarProps {
    mobileOpen?: boolean;
    onClose?: () => void;
}

type NavItem = {
    name: string;
    path: string;
    icon: JSX.Element;
    roles: string[];
    permissionKey?: ModuleKey;
};

type NavGroup = {
    label: string;
    items: NavItem[];
};

const Sidebar = ({ mobileOpen = false, onClose }: SidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState<any>(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });

    useEffect(() => {
        const handleUserUpdate = () => {
            const stored = localStorage.getItem('user');
            setUser(stored ? JSON.parse(stored) : null);
        };
        window.addEventListener('storage', handleUserUpdate);
        window.addEventListener('user:permissions-updated', handleUserUpdate);
        return () => {
            window.removeEventListener('storage', handleUserUpdate);
            window.removeEventListener('user:permissions-updated', handleUserUpdate);
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/unified-login');
    };

    if (!user) return null;

    const allNavGroups: NavGroup[] = [
        {
            label: 'Overview',
            items: [
                { name: 'Dashboard', path: '/ward-ranking', icon: <LayoutDashboard size={18} />, roles: ['admin', 'qc', 'accessor'], permissionKey: 'dashboard' },
            ]
        },
        {
            label: 'Management',
            items: [
                { name: 'Access Requests', path: '/ward-ranking?view=approvals', icon: <UserPlus size={18} />, roles: ['admin'], permissionKey: 'access_requests' },
                { name: 'Users', path: '/ward-ranking?view=users', icon: <Users size={18} />, roles: ['admin'], permissionKey: 'users' },
                { name: 'Participants', path: '/ward-ranking?view=participants', icon: <Layers size={18} />, roles: ['admin'], permissionKey: 'participants' },
            ]
        },
        {
            label: 'Configuration',
            items: [
                { name: 'Sidebar Access', path: '/ward-ranking?view=access-control', icon: <Lock size={18} />, roles: ['admin'], permissionKey: 'sidebar_access' },
                { name: 'Questionnaire', path: '/ward-ranking?view=questionnaire', icon: <ClipboardList size={18} />, roles: ['admin'], permissionKey: 'questionnaire' },
            ]
        },
        {
            label: 'Assessment',
            items: [
                { name: 'SA Review', path: '/ward-ranking?view=sa-review', icon: <ClipboardCheck size={18} />, roles: ['admin', 'qc'], permissionKey: 'self_assessment_review' },
                { name: 'Reports', path: '/ward-ranking?view=reports', icon: <FileText size={18} />, roles: ['admin', 'qc'], permissionKey: 'reports' },
                { name: 'Results', path: '/ward-ranking?view=results', icon: <Award size={18} />, roles: ['admin'], permissionKey: 'reports' },
            ]
        },
        {
            label: 'Accessor',
            items: [
                { name: 'Verify Assessment', path: '/ward-ranking?view=verify', icon: <ShieldCheck size={18} />, roles: ['accessor'] },
            ]
        },
        {
            label: 'Account',
            items: [
                { name: 'My Profile', path: '/ward-ranking?view=profile', icon: <UserIcon size={18} />, roles: ['admin', 'qc', 'accessor'], permissionKey: 'my_profile' },
            ]
        },
    ];

    const navGroups = allNavGroups.map(group => ({
        ...group,
        items: group.items.filter(item => {
            if (!item.roles.includes(user.role)) return false;
            if (item.permissionKey) {
                return hasPermission(user.permissions, item.permissionKey, 'view');
            }
            return true;
        })
    })).filter(group => group.items.length > 0);

    const currentUrl = (location.pathname || '/ward-ranking') + (location.search || '');

    return (
        <aside className={`sidebar ${mobileOpen ? 'sidebar--mobile-open' : ''}`} style={{ backgroundColor: '#ffffff', borderRight: '1px solid #f1f5f9', boxShadow: '2px 0 16px rgba(0,0,0,0.02)' }}>
            {/* Mobile close button */}
            <button
                className="sidebar-close-btn"
                onClick={onClose}
                aria-label="Close sidebar"
                style={{
                    display: 'none',
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: '#f1f5f9',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: '6px',
                    borderRadius: '8px',
                    zIndex: 10,
                }}
            >
                <X size={18} />
            </button>

            <div className="sidebar-header" style={{ padding: '1.25rem 1.5rem 0.5rem', textAlign: 'center' }}>
                <PmcLogo size={60} direction="column" />
            </div>

            <nav className="sidebar-nav" style={{ gap: 0, paddingTop: '0.25rem' }}>
                {navGroups.map((group, groupIdx) => (
                    <div key={group.label}>
                        <div className="nav-section-label" style={{ marginTop: groupIdx > 0 ? '0.5rem' : 0, color: '#475569', fontWeight: 800, letterSpacing: '0.06em' }}>
                            {group.label}
                        </div>
                        {group.items.map(item => {
                            const isActive = item.path === '/ward-ranking'
                                ? (currentUrl === '/ward-ranking' || currentUrl === '/ward-ranking?view=dashboard')
                                : currentUrl === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={onClose}
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                    style={isActive ? {
                                        backgroundColor: '#5a52ff',
                                        color: '#ffffff',
                                        fontWeight: 800,
                                        boxShadow: '0 4px 14px rgba(90, 82, 255, 0.25)',
                                        borderRadius: '12px'
                                    } : {
                                        color: '#1e293b',
                                        fontWeight: 700,
                                        borderRadius: '12px'
                                    }}
                                >
                                    {item.icon}
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer" style={{ borderTop: '1px solid #e2e8f0' }}>
                <Link
                    to="/dashboard"
                    className="user-info"
                    onClick={onClose}
                    style={{
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        padding: '8px',
                        borderRadius: '12px',
                        margin: '0 -8px 0.75rem -8px'
                    }}
                >
                    <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #5a52ff 0%, #4338ca 100%)', color: 'white' }}>
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                        <span className="user-name" style={{ color: '#0f172a', fontWeight: 900 }}>{user.name}</span>
                        <span className="user-role" style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>{user.role} Member</span>
                    </div>
                </Link>
                <button onClick={handleLogout} className="logout-btn" style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', transition: 'all 0.2s ease' }}>
                    <LogOut size={16} color="#ef4444" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
