'use client';

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ToiletApi, GeoApi } from "@lib/apiClient";
import { useAuth } from "@hooks/useAuth";

export default function AllToiletsTab({ cityId }: { cityId?: string }) {
    const { user } = useAuth();
    const isAdmin = user?.roles?.includes('CITY_ADMIN') || user?.roles?.includes('HMS_SUPER_ADMIN') || user?.role === 'CITY_ADMIN' || user?.role === 'CITY_ADMINISTRATOR';

    const [toilets, setToilets] = useState<any[]>([]);
    const [filteredToilets, setFilteredToilets] = useState<any[]>([]);
    const [selectedToilet, setSelectedToilet] = useState<any>(null);
    const [deleteConfirmToilet, setDeleteConfirmToilet] = useState<any>(null);
    const [deletingToilet, setDeletingToilet] = useState(false);
    const [loading, setLoading] = useState(true);

    const handleConfirmDeleteToilet = async () => {
        if (!deleteConfirmToilet) return;
        setDeletingToilet(true);
        try {
            await ToiletApi.deleteToilet(deleteConfirmToilet.id);
            setToilets(prev => prev.filter(t => t.id !== deleteConfirmToilet.id));
            setDeleteConfirmToilet(null);
        } catch (err: any) {
            alert(err?.message || "Failed to delete toilet asset");
        } finally {
            setDeletingToilet(false);
        }
    };

    // Assignment Modal State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [toiletToAssign, setToiletToAssign] = useState<any>(null);
    const [supervisors, setEmployees] = useState<any[]>([]);
    const [assigningLoading, setAssigningLoading] = useState(false);

    // Search & Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'CT' | 'PT' | 'URINALS'>('ALL');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [zoneFilter, setZoneFilter] = useState('ALL');
    const [wardFilter, setWardFilter] = useState('ALL');
    const [zones, setZones] = useState<any[]>([]);
    const [allWards, setAllWards] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [searchQuery, typeFilter, statusFilter, zoneFilter, wardFilter, toilets, cityId]);

    const loadData = async () => {
        try {
            const [toiRes, zoneRes, employeeRes, wardRes] = await Promise.allSettled([
                ToiletApi.listAllToilets(),
                ToiletApi.getZones(),
                ToiletApi.listEmployees(),
                GeoApi.list("WARD")
            ]);

            if (toiRes.status === 'fulfilled') {
                setToilets(toiRes.value.toilets || []);
            } else {
                console.error('Failed to load toilets', toiRes.reason);
            }

            if (zoneRes.status === 'fulfilled') {
                setZones(zoneRes.value.nodes || []);
            } else {
                console.error('Failed to load zones', zoneRes.reason);
            }

            if (employeeRes.status === 'fulfilled') {
                setEmployees((employeeRes.value.employees || []).filter((item: any) => item.role === "SUPERVISOR"));
            } else {
                console.error('Failed to load employees', employeeRes.reason);
                setEmployees([]);
            }

            if (wardRes.status === 'fulfilled') {
                setAllWards(wardRes.value.nodes || []);
            }
        } finally {
            setLoading(false);
        }
    };

    const visibleWards = zoneFilter !== 'ALL'
        ? allWards.filter(w => w.parentId === zoneFilter || w.parent?.id === zoneFilter)
        : allWards;

    const handleZoneChange = (zId: string) => {
        setZoneFilter(zId);
        if (wardFilter !== 'ALL') {
            const wardObj = allWards.find(w => w.id === wardFilter);
            const parentZ = wardObj?.parentId || wardObj?.parent?.id;
            if (zId !== 'ALL' && parentZ !== zId) {
                setWardFilter('ALL');
            }
        }
    };

    const handleWardChange = (wId: string) => {
        setWardFilter(wId);
        if (wId !== 'ALL') {
            const wardObj = allWards.find(w => w.id === wId);
            const parentZ = wardObj?.parentId || wardObj?.parent?.id;
            if (parentZ) {
                setZoneFilter(parentZ);
            }
        }
    };

    // Toilet API returns zoneId and wardId directly on every toilet record.
    // The nested ward object is display-only and does not reliably contain ids,
    // so filtering must use the direct ids first.
    const getToiletZoneId = (toilet: any) =>
        String(
            toilet?.zoneId ||
            toilet?.ward?.parentId ||
            toilet?.ward?.parent?.id ||
            ""
        );

    const getToiletWardId = (toilet: any) =>
        String(
            toilet?.wardId ||
            toilet?.ward?.id ||
            ""
        );

    const applyFilters = () => {
        let filtered = [...toilets];

        if (cityId && cityId !== 'ALL') {
            filtered = filtered.filter(
                (t) =>
                    String(t.cityId || t.city?.id || t.location?.cityId || "") ===
                    String(cityId)
            );
        }

        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            filtered = filtered.filter((t) =>
                String(t.name || "").toLowerCase().includes(query) ||
                String(t.code || "").toLowerCase().includes(query) ||
                String(t.ward?.name || "").toLowerCase().includes(query) ||
                String(t.ward?.parent?.name || "").toLowerCase().includes(query)
            );
        }

        if (typeFilter !== 'ALL') {
            filtered = filtered.filter(
                (t) => String(t.type || '').toUpperCase() === typeFilter
            );
        }

        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(
                (t) => String(t.status || '').toUpperCase() === statusFilter
            );
        }

        // Zone and Ward are independent filters. If both are selected,
        // a toilet must match both.
        if (zoneFilter !== 'ALL') {
            filtered = filtered.filter(
                (t) => getToiletZoneId(t) === String(zoneFilter)
            );
        }

        if (wardFilter !== 'ALL') {
            filtered = filtered.filter(
                (t) => getToiletWardId(t) === String(wardFilter)
            );
        }

        setFilteredToilets(filtered);
    };

    const handleQuickAssign = async (supervisorId: string) => {
        if (!toiletToAssign) return;
        if (toiletToAssign.status !== 'APPROVED') {
            alert('Only approved toilets can be assigned');
            return;
        }
        setAssigningLoading(true);
        try {
            await ToiletApi.bulkAssignToilets(supervisorId, [toiletToAssign.id], toiletToAssign.type);
            setShowAssignModal(false);
            setToiletToAssign(null);
            await loadData();
        } catch (err: any) {
            alert(err?.message || "Assignment failed");
        } finally {
            setAssigningLoading(false);
        }
    };

    const exportCSV = () => {
        if (filteredToilets.length === 0) {
            alert('No toilets available to export.');
            return;
        }
        const headers = ['Toilet Name', 'Code', 'Category', 'Seats', 'Zone', 'Ward', 'Status', 'Assigned Supervisor'];
        const rows = filteredToilets.map(t => [
            `"${t.name || ''}"`,
            `"${t.code || ''}"`,
            `"${t.type || ''}"`,
            t.numberOfSeats || 0,
            `"${t.ward?.parent?.name || ''}"`,
            `"${t.ward?.name || ''}"`,
            `"${t.status || ''}"`,
            `"${t.assignments?.[0]?.supervisor?.name || 'Unassigned'}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `registered_toilets_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return (
        <div style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div className="spinner" style={{ width: 36, height: 36, border: '3px solid #f3f3f3', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Syncing Registered Toilets...</span>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header Title & Register New */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Registered Toilets</h2>
                    <p style={{ margin: '3px 0 0 0', color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                        Total Registered Assets: <strong style={{ color: '#2563eb' }}>{filteredToilets.length}</strong>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                        onClick={exportCSV}
                        style={{
                            backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '9px 18px', borderRadius: 12,
                            fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}
                    >
                        📥 Export CSV
                    </button>
                    {isAdmin && (
                        <a href="/modules/toilet/bulk-import" style={{
                            backgroundColor: '#2563eb', color: 'white', padding: '9px 20px', borderRadius: 12,
                            textDecoration: 'none', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
                            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s'
                        }}>
                            ➕ Register New Asset
                        </a>
                    )}
                </div>
            </div>

            {/* Controls Filter Bar */}
            <div style={{ backgroundColor: '#ffffff', padding: 18, borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.5 }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search assets by name, code or ward..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '9px 14px 9px 38px', fontSize: 13, borderRadius: 10, border: '1px solid #cbd5e1', backgroundColor: '#ffffff', outline: 'none', color: '#0f172a' }}
                        />
                    </div>
                    {/* Structure Type Filter */}
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 12, backgroundColor: '#ffffff', fontWeight: 700, color: '#334155', outline: 'none' }}>
                        <option value="ALL">All Structure Types</option>
                        <option value="CT">Community Toilet (CT)</option>
                        <option value="PT">Public Toilet (PT)</option>
                        <option value="URINALS">Urinals</option>
                    </select>
                    {/* Zone Filter */}
                    <select value={zoneFilter} onChange={(e) => handleZoneChange(e.target.value)} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 12, backgroundColor: '#ffffff', fontWeight: 700, color: '#334155', outline: 'none' }}>
                        <option value="ALL">All Zones</option>
                        {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                    {/* Ward Filter (Always enabled, auto-selects zone) */}
                    <select value={wardFilter} onChange={(e) => handleWardChange(e.target.value)} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 12, backgroundColor: '#ffffff', fontWeight: 700, color: '#334155', outline: 'none' }}>
                        <option value="ALL">All Wards</option>
                        {visibleWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    {/* Status Filter */}
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 12, backgroundColor: '#ffffff', fontWeight: 700, color: '#334155', outline: 'none' }}>
                        <option value="ALL">All Status</option>
                        <option value="APPROVED">Approved</option>
                        <option value="PENDING">Pending</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>
            </div>

            {/* High Density Asset Table */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            {['TOILET NAME & CODE', 'ZONE & WARD', 'TOILET TYPE', 'STATUS', ''].map((h, i) => (
                                <th key={i} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredToilets.map((toilet) => {
                            const currentOwner = toilet.assignments?.[0]?.supervisor?.name;
                            const isApproved = toilet.status === 'APPROVED';
                            const isRejected = toilet.status === 'REJECTED';
                            return (
                                <tr key={toilet.id} style={{ transition: 'background 0.15s', borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{toilet.name}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>ID: {toilet.code || 'NO_ID'}</div>
                                    </td>
                                    <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{toilet.ward?.name || '—'}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{toilet.ward?.parent?.name || '—'}</div>
                                    </td>
                                    <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: 10, fontWeight: 900, background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: 8, border: '1px solid #bfdbfe' }}>{toilet.type}</span>
                                    </td>
                                    <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: 20, fontSize: 10, fontWeight: 900,
                                            backgroundColor: isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7',
                                            color: isApproved ? '#15803d' : isRejected ? '#b91c1c' : '#b45309',
                                            border: `1px solid ${isApproved ? '#bbf7d0' : isRejected ? '#fecaca' : '#fde68a'}`,
                                            textTransform: 'uppercase', letterSpacing: '0.04em'
                                        }}>{toilet.status}</span>
                                    </td>
                                    <td style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                            {currentOwner && (
                                                <div style={{ fontSize: 10, fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: 8 }}>
                                                    Assigned: {currentOwner}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                {isAdmin && isApproved && (
                                                    <button
                                                        onClick={() => { setToiletToAssign(toilet); setShowAssignModal(true); }}
                                                        style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', color: '#0f172a', transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                                                    >{currentOwner ? 'Reassign' : 'Assign Staff'}</button>
                                                )}
                                                <button onClick={() => setSelectedToilet(toilet)} style={{ backgroundColor: '#2563eb', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', color: 'white', boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}>View Detail</button>
                                                {isAdmin && (
                                                    <button onClick={() => setDeleteConfirmToilet(toilet)} style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', color: '#dc2626' }}>🗑️ Delete</button>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Delete Toilet Confirmation Modal */}
            {deleteConfirmToilet && typeof document !== 'undefined' && createPortal(
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 20 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: 24, padding: 32, maxWidth: 440, width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'scaleIn 0.2s ease-out' }}>
                        <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>🗑️</div>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a', textAlign: 'center' }}>Delete Toilet Asset?</h3>
                        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, textAlign: 'center', lineHeight: 1.5 }}>
                            Are you sure you want to delete <strong style={{ color: '#0f172a' }}>{deleteConfirmToilet.name || 'this toilet asset'}</strong>? This action cannot be undone and will remove associated inspection logs.
                        </p>
                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button
                                onClick={() => setDeleteConfirmToilet(null)}
                                style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: 12, background: 'white', color: '#64748b', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
                            >Cancel</button>
                            <button
                                onClick={handleConfirmDeleteToilet}
                                disabled={deletingToilet}
                                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 12, background: '#dc2626', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.25)' }}
                            >
                                {deletingToilet ? 'Deleting...' : 'Yes, Delete Asset'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Drilldown Modal Overlay Box (Screen-Aware) */}
            {selectedToilet && typeof document !== 'undefined' && createPortal(
                <div onClick={() => setSelectedToilet(null)} style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: 20, width: '100%', maxWidth: 850, maxHeight: '88vh', overflowY: 'auto', padding: 28, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>

                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{selectedToilet.name}</h2>
                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, backgroundColor: selectedToilet.status === 'APPROVED' ? '#dcfce7' : '#fee2e2', color: selectedToilet.status === 'APPROVED' ? '#15803d' : '#b91c1c' }}>
                                        {selectedToilet.status}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginTop: 4 }}>Asset Code: {selectedToilet.code || selectedToilet.id}</div>
                            </div>
                            <button
                                onClick={() => setSelectedToilet(null)}
                                style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                            >
                                Close
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
                            {/* Left Column: Tech Specs & Location */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {/* Technical Specs */}
                                <div>
                                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Technical Specifications</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Category / Toilet Type</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{selectedToilet.type || 'Public Toilet'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Location & GPS Co-ordinates */}
                                <div>
                                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Location & GPS Coordinates</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Zone</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{selectedToilet.ward?.parent?.name || selectedToilet.zoneName || 'Zone 1'}</div>
                                        </div>
                                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Ward</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>{selectedToilet.ward?.name || selectedToilet.wardName || 'Ward 1'}</div>
                                        </div>
                                            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>GPS Coordinates (Lat, Long)</div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#2563eb', marginTop: 2 }}>
                                                    {(selectedToilet.latitude || selectedToilet.lat) && (selectedToilet.longitude || selectedToilet.lng) ? `${selectedToilet.latitude || selectedToilet.lat}°, ${selectedToilet.longitude || selectedToilet.lng}°` : 'N/A'}
                                                </div>
                                            </div>
                                        {selectedToilet.address && (
                                            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                                                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Address / Landmark</div>
                                                <div style={{ fontSize: 12, fontWeight: 500, color: '#334155', marginTop: 2 }}>{selectedToilet.address}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Infrastructure & Utilities */}
                                {(selectedToilet.hasWater || selectedToilet.hasElectricity || selectedToilet.hasHandwash) && (
                                    <div>
                                        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Infrastructure Facilities</h3>
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            {selectedToilet.hasWater && (
                                                <span style={{ padding: '6px 12px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 600 }}>
                                                    Continuous Water Supply
                                                </span>
                                            )}
                                            {selectedToilet.hasElectricity && (
                                                <span style={{ padding: '6px 12px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 600 }}>
                                                    Electricity Connection
                                                </span>
                                            )}
                                            {selectedToilet.hasHandwash && (
                                                <span style={{ padding: '6px 12px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 600 }}>
                                                    Hygiene & Handwash
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Supervisor & Registration Metadata */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>Assigned Supervisor</h3>
                                    {selectedToilet.assignments?.map((a: any) => (
                                        <div key={a.id} style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 8 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{a.supervisor?.name || 'Supervisor'}</div>
                                            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{a.supervisor?.email || 'Field Staff'}</div>
                                        </div>
                                    ))}
                                    {!selectedToilet.assignments?.length && (
                                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Currently Unassigned</div>
                                    )}
                                </div>

                                <div style={{ background: '#f8fafc', padding: 18, borderRadius: 14, border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>Registration Details</h3>
                                    <div style={{ fontSize: 12, color: '#334155', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div><span style={{ color: '#64748b' }}>Created Date:</span> <strong style={{ fontWeight: 600 }}>{new Date(selectedToilet.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                                        <div><span style={{ color: '#64748b' }}>Status:</span> <strong style={{ fontWeight: 600, color: selectedToilet.status === 'APPROVED' ? '#16a34a' : '#dc2626' }}>{selectedToilet.status}</strong></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Quick Assign Modal */}
            {showAssignModal && typeof document !== 'undefined' && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: 24, width: 440, padding: 28, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'modalScale 0.2s ease-out' }}>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Assign Field Supervisor</h3>
                        <p style={{ margin: '6px 0 20px 0', fontSize: 13, color: '#64748b', fontWeight: 500 }}>Delegate responsibility for <strong>{toiletToAssign?.name}</strong></p>

                        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '2px' }}>
                            {supervisors.map(emp => (
                                <div
                                    key={emp.id}
                                    onClick={() => handleQuickAssign(emp.id)}
                                    style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#f1f5f9'; }}
                                >
                                    <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{emp.name}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>{emp.phone || 'No phone'}</div>
                                    </div>
                                    <div style={{ fontSize: 10, fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 6 }}>{emp.toiletsAssigned || 0} Assets</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => { setShowAssignModal(false); setToiletToAssign(null); }}
                                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#64748b' }}
                            >Cancel</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

