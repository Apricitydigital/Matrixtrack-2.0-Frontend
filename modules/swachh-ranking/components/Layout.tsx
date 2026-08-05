
import { ReactNode, useEffect,useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import api from '../api/axios';
import EnvironmentalBranding from './EnvironmentalBranding';
import AchievementEffect from './AchievementEffect';
import LiveNotification from './LiveNotification';

interface LayoutProps {
    children: ReactNode;
    hideSidebar?: boolean;
}

const Layout = ({ children, hideSidebar = true }: LayoutProps) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const syncPermissions = async () => {
            const token = localStorage.getItem('token');
            const userString = localStorage.getItem('user');
            if (!token || !userString) return;
            try {
                const response = await api.get('/permissions/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const storedUser = JSON.parse(userString);
                const updatedUser = {
                    ...storedUser,
                    permissions: response.data.permissions
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                window.dispatchEvent(new Event('user:permissions-updated'));
            } catch (error) {
                console.error('Failed to refresh permission cache', error);
            }
        };
        syncPermissions();
    }, []);

    return (
        <>
        <EnvironmentalBranding />
        <AchievementEffect />
        <LiveNotification />
        <div className="app-layout">
            {/* Mobile overlay */}
            {!hideSidebar && sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            {!hideSidebar && <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
            <div className="layout-main" style={hideSidebar ? { marginLeft: 0 } : undefined}>
                {!hideSidebar && <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />}
                <main className="main-content" style={hideSidebar ? { padding: '0.5rem 0' } : undefined}>
                    {children}
                </main>
            </div>
        </div>
        </>
    );
};

export default Layout;