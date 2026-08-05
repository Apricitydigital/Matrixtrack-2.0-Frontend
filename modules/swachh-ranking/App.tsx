import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminApprovals from './pages/AdminApprovals';
import UsersList from './pages/UsersList';
import ParticipantsList from './pages/ParticipantsList';
import ParticipantAssessments from './pages/ParticipantAssessments';
import QuestionnaireManager from './pages/QuestionnaireManager';
import Verification from './pages/Verification';
import AreaManagement from './pages/AreaManagement';
import Reports from './pages/Reports';
import Results from './pages/Results';
import LandingPage from './pages/LandingPage';
import Profile from './pages/Profile';
import AssessmentDetails from './pages/AssessmentDetails';
import AssessmentReview from './pages/AssessmentReview';
import SidebarAccessControl from './pages/SidebarAccessControl';
import SelfAssessmentLogin from './pages/SelfAssessmentLogin';
import SelfAssessmentForm from './pages/SelfAssessmentForm';
import SelfAssessmentQCReview from './pages/SelfAssessmentQCReview';
import SupportPolicy from './pages/SupportPolicy';
import { hasPermission } from './utils/accessControl';

function App() {
    const isAuthenticated = !!localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const userPermissions = user?.permissions;
    const ensurePermission = (moduleKey: any, requirement: 'view' | 'write' = 'view') =>
        hasPermission(userPermissions, moduleKey, requirement);

    return (
        <div className="app">
            <Routes>
                {/* Public Routes */}
                <Route path="/unified-login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Private Routes with Sidebar Layout */}
                <Route
                    path="/dashboard"
                    element={
                        isAuthenticated ? (
                            <Layout>
                                <Dashboard />
                            </Layout>
                        ) : (
                            <Navigate to="/unified-login" />
                        )
                    }
                />

                <Route
                    path="/admin/approvals"
                    element={
                        isAuthenticated && user?.role === 'admin' && ensurePermission('access_requests', 'view') ? (
                            <Layout>
                                <AdminApprovals />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />

                <Route
                    path="/admin/users"
                    element={
                        isAuthenticated && user?.role === 'admin' && ensurePermission('users', 'view') ? (
                            <Layout>
                                <UsersList />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />

                <Route
                    path="/admin/participants"
                    element={
                        isAuthenticated && user?.role === 'admin' && ensurePermission('participants', 'view') ? (
                            <Layout>
                                <ParticipantsList />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />
                <Route
                    path="/participants/:participantId/assessments"
                    element={
                        isAuthenticated && user?.role === 'admin' && ensurePermission('participants', 'view') ? (
                            <Layout>
                                <ParticipantAssessments />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />

                <Route
                    path="/admin/questionnaire"
                    element={
                        isAuthenticated && user?.role === 'admin' && ensurePermission('questionnaire', 'view') ? (
                            <Layout>
                                <QuestionnaireManager />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />
                <Route
                    path="/admin/access-control"
                    element={
                        isAuthenticated && user?.role === 'admin' && ensurePermission('users', 'write') ? (
                            <Layout>
                                <SidebarAccessControl />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />

                <Route
                    path="/admin/areas"
                    element={
                        isAuthenticated && user?.role === 'admin' && ensurePermission('zone_ward', 'view') ? (
                            <Layout>
                                <AreaManagement />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />

                <Route
                    path="/admin/reports"
                    element={
                        isAuthenticated && (user?.role === 'admin' || user?.role === 'qc') && ensurePermission('reports', 'view') ? (
                            <Layout>
                                <Reports />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />

                <Route
                    path="/admin/results"
                    element={
                        isAuthenticated && user?.role === 'admin' && ensurePermission('reports', 'view') ? (
                            <Layout>
                                <Results />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />

                <Route
                    path="/accessor/verify"
                    element={
                        isAuthenticated && user?.role === 'accessor' ? (
                            <Layout>
                                <Verification />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />
                <Route
                    path="/profile"
                    element={
                        isAuthenticated && ensurePermission('my_profile', 'view') ? (
                            <Layout>
                                <Profile />
                            </Layout>
                        ) : (
                            <Navigate to="/unified-login" />
                        )
                    }
                />

                <Route
                    path="/assessment/:assessmentId"
                    element={
                        isAuthenticated && user?.role === 'admin' && ensurePermission('reports', 'view') ? (
                            <Layout>
                                <AssessmentDetails />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />

                <Route
                    path="/assessment-review/:assessmentId"
                    element={
                        isAuthenticated && (user?.role === 'admin' || user?.role === 'qc') ? (
                            <Layout>
                                <AssessmentReview />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />

                {/* Self-Assessment QC Review */}
                <Route
                    path="/qc/self-assessments"
                    element={
                        isAuthenticated && (user?.role === 'admin' || user?.role === 'qc') ? (
                            <Layout>
                                <SelfAssessmentQCReview />
                            </Layout>
                        ) : (
                            <Navigate to="/dashboard" />
                        )
                    }
                />

                {/* Self-Assessment (public, participant-facing) */}
                <Route path="/self-assessment" element={<SelfAssessmentLogin />} />
                <Route path="/self-assessment/form" element={<SelfAssessmentForm />} />

                <Route path="/" element={<LandingPage />} />
                <Route path="/support-policy" element={<SupportPolicy />} />
            </Routes>
        </div>
    );
}

export default App;
