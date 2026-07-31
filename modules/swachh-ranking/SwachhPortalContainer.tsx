'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import './index.css';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AdminApprovals from './pages/AdminApprovals';
import UsersList from './pages/UsersList';
import ParticipantsList from './pages/ParticipantsList';
import QuestionnaireManager from './pages/QuestionnaireManager';
import SelfAssessmentQCReview from './pages/SelfAssessmentQCReview';
import Reports from './pages/Reports';
import Results from './pages/Results';
import Profile from './pages/Profile';
import SidebarAccessControl from './pages/SidebarAccessControl';
import Verification from './pages/Verification';
import { useAuth } from '@hooks/useAuth';
import { getTokenFromCookies } from '@lib/auth';
import SwachhErrorBoundary from './components/SwachhErrorBoundary';

function SwachhContent() {
    const searchParams = useSearchParams();
    const view = searchParams.get('view') || 'dashboard';

    const renderView = () => {
        switch (view) {
            case 'approvals':
                return <AdminApprovals />;
            case 'users':
                return <UsersList />;
            case 'participants':
                return <ParticipantsList />;
            case 'questionnaire':
                return <QuestionnaireManager />;
            case 'sa-review':
                return <SelfAssessmentQCReview />;
            case 'reports':
                return <Reports />;
            case 'results':
                return <Results />;
            case 'profile':
                return <Profile />;
            case 'access-control':
                return <SidebarAccessControl />;
            case 'verify':
                return <Verification />;
            case 'dashboard':
            default:
                return <Dashboard />;
        }
    };

    return (
        <Layout>
            <SwachhErrorBoundary>
                {renderView()}
            </SwachhErrorBoundary>
        </Layout>
    );
}

export default function SwachhPortalContainer() {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            // Grab real JWT SSO token from cookies or localStorage
            const realToken = getTokenFromCookies();
            if (realToken && realToken !== 'matrix_track_session_token') {
                localStorage.setItem('token', realToken);
                localStorage.setItem('swachh_token', realToken);
            }

            if (user) {
                const rawRole = (user.roles && user.roles[0]) ? user.roles[0].toLowerCase() : 'admin';
                const mappedRole = (rawRole.includes('admin') || rawRole.includes('commissioner') || rawRole.includes('hms')) ? 'admin' : rawRole;
                const swachhUser = {
                    id: user.id || 'usr-1',
                    name: user.name || 'Admin User',
                    role: mappedRole,
                    email: (user as any).email || 'admin@matrixtrack.in',
                    permissions: {}
                };
                localStorage.setItem('user', JSON.stringify(swachhUser));
            }
        }
    }, [user]);

    if (!mounted) return null;

    return (
        <div className="swachh-ranking-app-wrapper" style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <SwachhErrorBoundary>
                <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading Swachh Ward Ranking...</div>}>
                    <SwachhContent />
                </Suspense>
            </SwachhErrorBoundary>
        </div>
    );
}
