import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { MapPin, Plus, Home, Building2, RefreshCw } from 'lucide-react';
import NoAccess from '../components/NoAccess';
import { hasPermission } from '../utils/accessControl';

interface Ward {
    id: string;
    name: string;
}

interface Zone {
    id: string;
    name: string;
    wards: Ward[];
}

const AreaManagement = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const canViewZoneWard = hasPermission(currentUser?.permissions, 'zone_ward', 'view');
    const canWriteZoneWard = hasPermission(currentUser?.permissions, 'zone_ward', 'write');
    const readOnly = !canWriteZoneWard;

    if (!currentUser || !canViewZoneWard) {
        return <NoAccess title="Zone & Ward" message="You do not have permission to view this module." />;
    }
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);
    const [newZoneName, setNewZoneName] = useState('');
    const [newWardName, setNewWardName] = useState('');
    const [selectedZoneId, setSelectedZoneId] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchAreas = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/areas/zones', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setZones(response.data);
            if (response.data.length > 0 && !selectedZoneId) {
                setSelectedZoneId(response.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch areas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAreas();
    }, []);

    const handleCreateZone = async (e: React.FormEvent) => {
        if (readOnly) {
            alert('Write permission required to manage zones.');
            return;
        }
        e.preventDefault();
        if (!newZoneName) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/areas/zones',
                { name: newZoneName },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setZones([...zones, { ...response.data, wards: [] }]);
            setNewZoneName('');
            if (!selectedZoneId) setSelectedZoneId(response.data.id);
        } catch (err) {
            alert('Failed to create zone');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateWard = async (e: React.FormEvent) => {
        if (readOnly) {
            alert('Write permission required to manage wards.');
            return;
        }
        e.preventDefault();
        if (!newWardName || !selectedZoneId) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/areas/wards',
                { name: newWardName, zoneId: selectedZoneId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setZones(zones.map(z =>
                z.id === selectedZoneId
                    ? { ...z, wards: [...z.wards, response.data] }
                    : z
            ));
            setNewWardName('');
        } catch (err) {
            alert('Failed to create ward');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="area-management-view">
            <header className="page-header-row" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 850, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                    Urban Territory Management
                </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
                    Define city zones and specific wards for structured field staff assignment.
                </p>
                </div>
            </header>

<div className="area-grid">
                {/* Zone Creation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card shadow-premium" style={{ border: 'none', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '12px' }}>
                                <MapPin size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Register New Zone</h3>
                        </div>

                        {readOnly && (
                            <div style={{ background: '#fef9c3', padding: '0.8rem 1rem', borderRadius: '10px', fontWeight: 600, color: '#854d0e', marginBottom: '1rem' }}>
                                View-only mode enabled. Editing controls are disabled.
                            </div>
                        )}
                        <form onSubmit={handleCreateZone} style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="e.g. Zone 1 (Aundh)"
                                value={newZoneName}
                                onChange={(e) => setNewZoneName(e.target.value)}
                                style={{ flex: 1, padding: '1rem', borderRadius: '12px' }}
                                disabled={readOnly}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary"
                                aria-label="Add zone"
                                disabled={actionLoading || !newZoneName || readOnly}
                                style={{ width: '52px', height: '52px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Plus size={24} />
                            </button>
                        </form>
                    </div>

                    <div className="card shadow-premium" style={{ border: 'none', padding: '2.5rem', minHeight: '400px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)', padding: '0.75rem', borderRadius: '12px' }}>
                                    <RefreshCw size={24} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Active Zones</h3>
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '4rem' }}>
                                <div className="spinner" style={{ margin: '0 auto' }}></div>
                            </div>
                        ) : zones.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No zones registered yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {zones.map(zone => (
                                    <button
                                        key={zone.id}
                                        onClick={() => setSelectedZoneId(zone.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '1.25rem',
                                            borderRadius: '16px',
                                            border: selectedZoneId === zone.id ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                                            backgroundColor: selectedZoneId === zone.id ? 'var(--primary-soft)' : 'white',
                                            transition: 'all 0.2s ease',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ color: selectedZoneId === zone.id ? 'var(--primary)' : 'var(--text-muted)' }}>
                                                <MapPin size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{zone.name}</div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{zone.wards.length} Wards Assigned</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Ward Management for Selected Zone */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card shadow-premium" style={{ border: 'none', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '12px' }}>
                                <Home size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Add Ward to {zones.find(z => z.id === selectedZoneId)?.name || 'Selected Zone'}</h3>
                        </div>

                        <form onSubmit={handleCreateWard} style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="e.g. Ward No. 12"
                                value={newWardName}
                                onChange={(e) => setNewWardName(e.target.value)}
                                style={{ flex: 1, padding: '1rem', borderRadius: '12px' }}
                                disabled={!selectedZoneId || readOnly}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary"
                                aria-label="Add ward"
                                disabled={actionLoading || !newWardName || !selectedZoneId || readOnly}
                                style={{ width: '52px', height: '52px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Plus size={24} />
                            </button>
                        </form>
                    </div>

                    <div className="card shadow-premium" style={{ border: 'none', padding: '2.5rem', flex: 1, minHeight: '400px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ backgroundColor: 'var(--swachh-green-soft)', color: 'var(--swachh-green)', padding: '0.75rem', borderRadius: '12px' }}>
                                <Building2 size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Wards in {zones.find(z => z.id === selectedZoneId)?.name || 'Zone'}</h3>
                        </div>

                        {!selectedZoneId ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '4rem' }}>Select a zone from the left to manage wards.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {zones.find(z => z.id === selectedZoneId)?.wards.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No wards registered in this zone yet.</p>
                                ) : (
                                    zones.find(z => z.id === selectedZoneId)?.wards.map(ward => (
                                        <div
                                            key={ward.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '1.25rem',
                                                borderRadius: '16px',
                                                border: '1px solid var(--border-light)',
                                                backgroundColor: '#fcfdfe'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <Home size={18} style={{ color: 'var(--text-secondary)' }} />
                                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ward.name}</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--swachh-green)', background: 'var(--swachh-green-soft)', padding: '4px 12px', borderRadius: '20px' }}>
                                                Active
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AreaManagement;
