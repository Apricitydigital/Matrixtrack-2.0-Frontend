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
        navigate('/login');
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

    return (
        <aside className={`sidebar ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
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
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(226,232,240,0.8)',
                    padding: '6px',
                    borderRadius: '8px',
                    zIndex: 10,
                }}
            >
                <X size={18} />
            </button>

            <div className="sidebar-header">
                <PmcLogo size={72} direction="column" />
            </div>

            <nav className="sidebar-nav" style={{ gap: 0, paddingTop: '0.25rem' }}>
                {navGroups.map((group, groupIdx) => (
                    <div key={group.label}>
                        <div className="nav-section-label" style={{ marginTop: groupIdx > 0 ? '0.5rem' : 0 }}>
                            {group.label}
                        </div>
                        {group.items.map(item => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={onClose}
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                    style={!isActive ? { color: 'rgba(148,163,184,0.85)' } : undefined}
                                >
                                    {item.icon}
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
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
                        margin: '0 -8px'
                    }}
                >
                    <div className="user-avatar">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                        <span className="user-name" style={{ color: 'rgba(226,232,240,0.95)' }}>{user.name}</span>
                        <span className="user-role" style={{ color: 'rgba(148,163,184,0.7)' }}>{user.role} Member</span>
                    </div>
                </Link>
                <button onClick={handleLogout} className="logout-btn">
                    <LogOut size={18} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
