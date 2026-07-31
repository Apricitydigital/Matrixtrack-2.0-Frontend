import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Check, X, RefreshCw, Layers, User as UserIcon, Eye } from 'lucide-react';
import NoAccess from '../components/NoAccess';
import { hasPermission } from '../utils/accessControl';

interface User {
    id: string;
    name: string;
    email: string;
    mobileNumber: string;
    aadharNumber: string | null;
    role: string;
    accessorType: string | null;
    status: string;
    createdAt: string;
}

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

const AdminApprovals = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const canViewAccessRequests = hasPermission(currentUser?.permissions, 'access_requests', 'view');
    const canWriteAccessRequests = hasPermission(currentUser?.permissions, 'access_requests', 'write');

    if (!currentUser || !canViewAccessRequests) {
        return <NoAccess title="Access Requests" message="You do not have permission to review pending requests." />;
    }

    const [users, setUsers] = useState<User[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [activeTab, setActiveTab] = useState<'users' | 'participation'>('users');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

    const fetchData = async (silent = false) => {
        if (!silent) {
            setLoading(true);
        }
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            if (activeTab === 'users') {
                const response = await api.get('/admin/users?status=pending', { headers });
                setUsers(response.data);
            } else {
                const response = await api.get('/participation?status=pending', { headers });
                setParticipants(response.data);
            }
        } catch (err: any) {
            console.error('Failed to fetch data');
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 10000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const handleUserAction = async (id: string, action: 'approve' | 'reject') => {
        if (!canWriteAccessRequests) {
            alert('Write permission required for this action.');
            return;
        }
        setActionLoading(id);
        try {
            const token = localStorage.getItem('token');
            await api.patch(`/admin/users/${id}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(users.filter(u => u.id !== id));
        } catch (err: any) {
            alert(`Failed to ${action} user`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleParticipantAction = async (id: string, action: 'approve' | 'reject') => {
        if (!canWriteAccessRequests) {
            alert('Write permission required for this action.');
            return;
        }
        setActionLoading(id);
        try {
            const token = localStorage.getItem('token');
            await api.patch(`/participation/${id}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setParticipants(participants.filter(p => p.id !== id));
        } catch (err: any) {
            alert(`Failed to ${action} participant`);
        } finally {
            setActionLoading(null);
        }
    };

    const renderDetails = (details: any) => {
        return (
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                {Object.entries(details).map(([key, value]) => (
                    <div key={key} style={{ marginBottom: '2px' }}>
                        <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}:</span> {String(value)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="admin-approvals-view">
            {/* <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 850, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                        Platform Approvals
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
                        Review and manage pending registrations and participation requests.
                    </p>
                </div>
                <button
                    onClick={() => fetchData()}
                    className="btn btn-outline"
                    style={{ padding: '0.75rem', height: 'fit-content' }}
                    disabled={loading}
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </header> */}
            <header className="page-header-row" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
    <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 850, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Platform Approvals
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
            Review and manage pending registrations and participation requests.
        </p>
    </div>
    <button
        onClick={() => fetchData()}
        className="btn btn-outline"
        aria-label="Refresh"
        style={{ padding: '0.75rem', height: 'fit-content', flexShrink: 0 }}
        disabled={loading}
    >
        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
    </button>
</header>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
                >
                    <UserIcon size={18} />
                    Portal Access Request ({users.length})
                </button>
                <button
                    onClick={() => setActiveTab('participation')}
                    className={`btn ${activeTab === 'participation' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
                >
                    <Layers size={18} />
                    Participation Requests ({participants.length})
                </button>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '6rem 0' }}>
                        <RefreshCw size={40} style={{ margin: '0 auto 1.5rem', display: 'block', color: 'var(--primary)' }} className="animate-spin" />
                        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Fetching pending requests...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'users' ? (
                            users.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '6rem 0' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Pending Access Requests</h3>
                                </div>
                            ) : (
                                <div className="table-container" style={{ border: 'none' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>User Details</th>
                                                <th>Contact</th>
                                                <th>Role</th>
                                                <th>Identity</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((u) => (
                                                <tr key={u.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{u.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(u.createdAt).toLocaleDateString()}</div>
                                                    </td>
                                                    <td>{u.email}<br />{u.mobileNumber}</td>
                                                    <td>{u.role} {u.accessorType && `(${u.accessorType})`}</td>
                                                    <td>{u.aadharNumber || 'Not provided'}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                            <button onClick={() => handleUserAction(u.id, 'approve')} className="btn btn-primary" style={{ background: 'var(--success)', padding: '0.5rem' }} disabled={!!actionLoading || !canWriteAccessRequests}><Check size={18} /></button>
                                                            <button onClick={() => handleUserAction(u.id, 'reject')} className="btn" style={{ background: 'var(--error-soft)', color: 'var(--error)', padding: '0.5rem' }} disabled={!!actionLoading || !canWriteAccessRequests}><X size={18} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : (
                            participants.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '6rem 0' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Pending Participation Requests</h3>
                                </div>
                            ) : (
                                <div className="table-container" style={{ border: 'none' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Category & Contact</th>
                                                <th>Details</th>
                                                <th>Location</th>
                                                <th style={{ textAlign: 'right' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {participants.map((p) => (
                                                <tr key={p.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 800, color: 'var(--swachh-green)', textTransform: 'capitalize' }}>{p.category}</div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.mobileNumber}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(p.createdAt).toLocaleDateString()}</div>
                                                    </td>
                                                    <td>{renderDetails(p.details)}</td>
                                                    <td>
                                                        {p.locationLat ? (
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                                                Lat: {p.locationLat.toFixed(4)}<br />Lng: {p.locationLng?.toFixed(4)}
                                                            </div>
                                                        ) : 'N/A'}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                            <button
                                                                onClick={() => setSelectedParticipant(p)}
                                                                className="btn btn-outline"
                                                                aria-label="View details"
                                                                style={{ padding: '0.5rem', borderColor: 'var(--swachh-green)', color: 'var(--swachh-green)' }}
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            <button onClick={() => handleParticipantAction(p.id, 'approve')} aria-label="Approve" className="btn btn-primary" style={{ background: 'var(--success)', padding: '0.5rem' }} disabled={!!actionLoading || !canWriteAccessRequests}><Check size={18} /></button>
                                                            <button onClick={() => handleParticipantAction(p.id, 'reject')} aria-label="Reject" className="btn" style={{ background: 'var(--error-soft)', color: 'var(--error)', padding: '0.5rem' }} disabled={!!actionLoading || !canWriteAccessRequests}><X size={18} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                    </>
                )}
            </div>

            {/* Participation Detail Modal */}
            {selectedParticipant && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div className="card shadow-premium" style={{ width: '100%', maxWidth: '600px', position: 'relative', border: 'none', padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            padding: '1.5rem 2rem',
                            backgroundColor: 'var(--swachh-green)',
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, textTransform: 'capitalize' }}>
                                    {selectedParticipant.category} Details
                                </h2>
                                <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.8 }}>ID: {selectedParticipant.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedParticipant(null)}
                                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: 'white', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Contact Number</label>
                                    <p style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>+91 {selectedParticipant.mobileNumber}</p>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Registration Date</label>
                                    <p style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>{new Date(selectedParticipant.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div style={{
                                backgroundColor: '#fcfdfe',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                marginBottom: '2rem'
                            }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--swachh-green)', textTransform: 'uppercase', marginBottom: '1.25rem' }}>Detailed Information</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    {Object.entries(selectedParticipant.details).map(([key, value]) => (
                                        <div key={key}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize', marginBottom: '0.25rem' }}>
                                                {key.replace(/([A-Z])/g, ' $1')}
                                            </label>
                                            <p style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                                {String(value)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedParticipant.locationLat && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Geographical Location</label>
                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--swachh-green-light)' }}>Lat:</span>
                                            <span style={{ fontWeight: 800 }}>{selectedParticipant.locationLat.toFixed(6)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--swachh-green-light)' }}>Lng:</span>
                                            <span style={{ fontWeight: 800 }}>{selectedParticipant.locationLng?.toFixed(6)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button
                                    onClick={() => { handleParticipantAction(selectedParticipant.id, 'approve'); setSelectedParticipant(null); }}
                                    className="btn btn-primary"
                                    style={{ flex: 1, padding: '1rem', background: 'var(--success)', fontWeight: 800, border: 'none' }}
                                    disabled={!!actionLoading}
                                >
                                    Approve Request
                                </button>
                                <button
                                    onClick={() => { handleParticipantAction(selectedParticipant.id, 'reject'); setSelectedParticipant(null); }}
                                    className="btn"
                                    style={{ flex: 1, padding: '1rem', background: 'var(--error-soft)', color: 'var(--error)', fontWeight: 800, border: 'none' }}
                                    disabled={!!actionLoading}
                                >
                                    Reject Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminApprovals;
