

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from '../react-router-shim';
import { LogOut, Bell, Search, ShieldCheck, Menu } from 'lucide-react';
import PmcLogo from './PmcLogo';

interface HeaderProps {
    onMenuToggle?: () => void;
}

const Header = ({ onMenuToggle }: HeaderProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(() => {
        const userString = localStorage.getItem('user');
        return userString ? JSON.parse(userString) : null;
    });

    const [imageVersion, setImageVersion] = useState(Date.now());
    const [navbarSearch, setNavbarSearch] = useState('');
    const debounceRef = useRef<number | null>(null);

    const isUsersRoute = location.pathname.startsWith('/admin/users');

    // sync user when localStorage updates
    useEffect(() => {

        const syncUser = () => {
            const updatedUser = localStorage.getItem('user');
            setUser(updatedUser ? JSON.parse(updatedUser) : null);
            setImageVersion(Date.now());
        };

        window.addEventListener('storage', syncUser);
        window.addEventListener('userUpdated', syncUser);

        return () => {
            window.removeEventListener('storage', syncUser);
            window.removeEventListener('userUpdated', syncUser);
        };

    }, []);

    // receive search sync
    useEffect(() => {

        const handleUsersSearchSync = (event: Event) => {
            const detail = (event as CustomEvent<string>).detail || '';
            setNavbarSearch(detail);
        };

        window.addEventListener('users:search-sync', handleUsersSearchSync as EventListener);

        return () => {
            window.removeEventListener('users:search-sync', handleUsersSearchSync as EventListener);
        };

    }, []);

    useEffect(() => {
        if (!isUsersRoute && navbarSearch) {
            setNavbarSearch('');
        }
    }, [isUsersRoute, navbarSearch]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                window.clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const emitNavbarSearch = (value: string) => {
        if (!isUsersRoute) return;

        window.dispatchEvent(
            new CustomEvent('navbar:search', { detail: value })
        );
    };

    const handleNavbarSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {

        const value = event.target.value;
        setNavbarSearch(value);

        if (debounceRef.current) {
            window.clearTimeout(debounceRef.current);
        }

        debounceRef.current = window.setTimeout(() => {
            emitNavbarSearch(value);
        }, 250);

    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (!user || !user.id) return null;

    return (
        <header style={{
            height: '70px',
            backgroundColor: 'white',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 900,
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            gap: '1rem',
        }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>

                <button
                    onClick={onMenuToggle}
                    className="hamburger-btn"
                    aria-label="Toggle menu"
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        padding: '6px',
                        borderRadius: '8px',
                        flexShrink: 0,
                        display: 'none',
                    }}
                >
                    <Menu size={22} />
                </button>

                <div className="header-search-wrap" style={{ position: 'relative', width: '280px' }}>

                    <Search size={16} style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        pointerEvents: 'none',
                    }} />

                    <input
                        type="text"
                        aria-label="Search records"
                        placeholder="Search records, users..."
                        value={navbarSearch}
                        onChange={handleNavbarSearchChange}
                        style={{
                            padding: '0.5rem 1rem 0.5rem 2.5rem',
                            fontSize: '0.875rem',
                            borderRadius: '10px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid transparent',
                            width: '100%',
                        }}
                    />
                </div>

            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>

                <div className="header-icon-group" style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)' }}>

                    <button aria-label="Notifications" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '6px', borderRadius: '8px' }}>
                        <Bell size={20} />
                    </button>

                    <Link to="/admin/approvals" aria-label="Access Approvals" style={{ color: 'inherit', display: 'flex', alignItems: 'center', padding: '6px', borderRadius: '8px' }}>
                        <ShieldCheck size={20} />
                    </Link>

                </div>

                <div className="header-divider" style={{ height: '28px', width: '1px', backgroundColor: 'var(--border)' }} />

                <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', textDecoration: 'none', cursor: 'pointer' }}>

                    <div className="header-user-text" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>

                        <span style={{ fontSize: '0.875rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                            {user.name}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem' }}>

                            <span style={{
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                color: 'white',
                                backgroundColor: '#4338ca',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                textTransform: 'uppercase'
                            }}>
                                {user.role}
                            </span>

                            <span style={{
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                color: '#4b5563',
                                fontFamily: 'monospace'
                            }}>
                                ID: USR-{user?.id ? String(user.id).slice(0, 8).toUpperCase() : 'UNKNOWN'}
                            </span>

                        </div>

                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#4b5563' }}>
                            {user.email}
                        </span>

                    </div>

                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--swachh-green)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        fontWeight: 900,
                        boxShadow: '0 4px 12px rgba(26, 77, 46, 0.15)',
                        overflow: 'hidden'
                    }}>
                        {user.profileImage ? (
                            <img
                                src={`${(
                                    process.env.NEXT_PUBLIC_SWACHH_MEDIA_URL ||
                                    process.env.NEXT_PUBLIC_SWACHH_API_URL ||
                                    (
                                        process.env.NODE_ENV !== "production"
                                            ? "http://localhost:5000"
                                            : typeof window !== "undefined"
                                                ? window.location.origin
                                                : ""
                                    )
                                ).replace(/\/+$/, "")}${user.profileImage}?v=${imageVersion}`}
                                alt="Avatar"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                }}
                            />
                        ) : (
                            user.name.charAt(0).toUpperCase()
                        )}
                    </div>

                </Link>

                <Link to="/portal-home" style={{ textDecoration: 'none' }}>
                    <button
                        title="Return to Portal Home"
                        style={{
                            background: '#1e3a8a',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        Portal Home
                    </button>
                </Link>

                <button
                    onClick={handleLogout}
                    aria-label="Logout"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: '8px',
                        borderRadius: '8px'
                    }}
                >
                    <LogOut size={20} />
                </button>

            </div>

        </header>
    );
};

export default Header;