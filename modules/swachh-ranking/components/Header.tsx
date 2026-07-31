// import React, { useState, useEffect } from 'react';
// import { useNavigate, Link } from 'react-router-dom';
// import { LogOut, User as UserIcon, Bell, Search, ShieldCheck } from 'lucide-react';
// import PmcLogo from './PmcLogo';
// const Header = () => {
//     const navigate = useNavigate();
//     const [user, setUser] = useState(() => {
//         const userString = localStorage.getItem('user');
//         return userString ? JSON.parse(userString) : null;
//     });

//     useEffect(() => {
//         const handleStorageChange = () => {
//             const updatedUser = localStorage.getItem('user');
//             setUser(updatedUser ? JSON.parse(updatedUser) : null);
//         };

//         window.addEventListener('storage', handleStorageChange);
//         return () => window.removeEventListener('storage', handleStorageChange);
//     }, []);

//     const handleLogout = () => {
//         localStorage.removeItem('token');
//         localStorage.removeItem('user');
//         navigate('/login');
//     };

//     // if (!user) return null;
// if (!user || !user.id) return null;
//     return (
//         <header style={{
//             height: '80px',
//             backgroundColor: 'white',
//             borderBottom: '1px solid var(--border)',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'space-between',
//             padding: '0 2.5rem',
//             position: 'sticky',
//             top: 0,
//             zIndex: 900,
//             boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
//         }}>
//             <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
//                 <div style={{ position: 'relative', width: '320px' }}>
//                     <Search size={18} style={{
//                         position: 'absolute',
//                         left: '1.25rem',
//                         top: '50%',
//                         transform: 'translateY(-50%)',
//                         color: 'var(--text-muted)'
//                     }} />
//                     <input
//                         type="text"
//                         placeholder="Search records, users..."
//                         style={{
//                             padding: '0.625rem 1rem 0.625rem 3rem',
//                             fontSize: '0.875rem',
//                             borderRadius: '12px',
//                             backgroundColor: '#f8fafc',
//                             border: '1px solid transparent'
//                         }}
//                     />
//                 </div>
//             </div>

//             {/* Right Side Actions */}
//             <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
//                 <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-secondary)' }}>
//                     <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
//                         <Bell size={20} />
//                     </button>
//                     <Link to="/admin/approvals" style={{ color: 'inherit' }}>
//                         <ShieldCheck size={20} />
//                     </Link>
//                 </div>

//                 <div style={{ height: '32px', width: '1px', backgroundColor: 'var(--border)' }}></div>

//                 <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', textDecoration: 'none', cursor: 'pointer' }}>
//                     <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
//                         <span style={{ fontSize: '0.9375rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
//                             {user.name}
//                         </span>
//                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
//                             <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'white', backgroundColor: 'var(--primary)', padding: '0.1rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>
//                                 {user.role}
//                             </span>
//                             <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
//                                 {/* ID: USR-{user.id.slice(0, 8).toUpperCase()} */}
//                                 ID: USR-{user?.id ? String(user.id).slice(0, 8).toUpperCase() : 'UNKNOWN'}
//                             </span>
//                         </div>
//                         <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.15rem' }}>
//                             {user.email}
//                         </span>
//                     </div>
//                     <div style={{
//                         width: '48px',
//                         height: '48px',
//                         borderRadius: '14px',
//                         backgroundColor: 'var(--swachh-green)',
//                         color: 'white',
//                         display: 'flex',
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                         fontSize: '1.25rem',
//                         fontWeight: 900,
//                         boxShadow: '0 4px 12px rgba(26, 77, 46, 0.15)',
//                         overflow: 'hidden'
//                     }}>
//                         {user.profileImage ? (
//                             <img src={`${import.meta.env.VITE_API_BASE_URL}${user.profileImage}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
//                         ) : (
//                             user.name.charAt(0).toUpperCase()
//                         )}
//                     </div>
//                 </Link>

//                 <button
//                     onClick={handleLogout}
//                     style={{
//                         background: 'none',
//                         border: 'none',
//                         color: '#ef4444',
//                         cursor: 'pointer',
//                         display: 'flex',
//                         padding: '8px',
//                         borderRadius: '8px',
//                         transition: 'background 0.2s'
//                     }}
//                     onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
//                     onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
//                 >
//                     <LogOut size={20} />
//                 </button>
//             </div>
//         </header>
//     );
// };

// export default Header;

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
                                src={`${(import.meta.env.VITE_MEDIA_BASE_URL || import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin)).replace(/\/+$/, '')}${user.profileImage}?v=${imageVersion}`}
                                alt="Avatar"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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