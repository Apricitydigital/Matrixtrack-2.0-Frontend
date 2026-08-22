'use client';

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { ToiletApi, GeoApi, EmployeesApi, TwinbinApi, ModuleRecordsApi } from "@lib/apiClient";

export default function TwinbinStaffAssignmentsTab() {
    const [supervisors, setSupervisors] = useState<any[]>([]);

    const [bins, setBins] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [allWards, setAllWards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedZone, setSelectedZone] = useState("");
    const [selectedWard, setSelectedWard] = useState("");
    const [selectedSupervisor, setSelectedSupervisor] = useState("");

    // Modal State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedBinToAssign, setSelectedBinToAssign] = useState<any | null>(null);
    const [targetSupervisorId, setTargetSupervisorId] = useState("");
    const [assigning, setAssigning] = useState(false);
    const [unassignConfirmRow, setUnassignConfirmRow] = useState<any | null>(null);

    // 3-dots Menu Dropdown State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [empRes, binAssignedRes, binMyRes, recRes, zoneRes, wardRes] = await Promise.allSettled([
                EmployeesApi.list(),
                TwinbinApi.assigned(),
                TwinbinApi.myBins(),
                ModuleRecordsApi.getRecords("LITTERBINS", { tab: "APPROVED_BINS", limit: 500 }),
                ToiletApi.getZones(),
                GeoApi.list("WARD")
            ]);

            if (empRes.status === 'fulfilled') {
                const fetchedEmps = empRes.value.employees || [];
                const sups = fetchedEmps.filter((item: any) => String(item.role).toUpperCase() === "SUPERVISOR");
                setSupervisors(sups.length > 0 ? sups : fetchedEmps);
            }

            const binMap = new Map<string, any>();
            if (binAssignedRes.status === 'fulfilled' && binAssignedRes.value.bins) {
                binAssignedRes.value.bins.forEach((b: any) => {
                    binMap.set(b.id, {
                        ...b,
                        assignedEmployeeIds: b.assignedEmployeeIds || (b.assignedEmployees ? b.assignedEmployees.map((e: any) => e.id) : [])
                    });
                });
            }
            if (binMyRes.status === 'fulfilled' && binMyRes.value.bins) {
                binMyRes.value.bins.forEach((b: any) => {
                    if (!binMap.has(b.id)) {
                        binMap.set(b.id, {
                            ...b,
                            assignedEmployeeIds: b.assignedEmployeeIds || (b.assignedEmployees ? b.assignedEmployees.map((e: any) => e.id) : [])
                        });
                    }
                });
            }
            if (recRes.status === 'fulfilled' && recRes.value.data) {
                recRes.value.data.forEach((r: any) => {
                    const empIds = r.assignedEmployeeIds || (r.assignedEmployees ? r.assignedEmployees.map((e: any) => e.id) : []);
                    if (!binMap.has(r.id)) {
                        binMap.set(r.id, {
                            ...r,
                            id: r.id,
                            locationName: r.locationName || r.location || r.name || 'Location',
                            areaName: r.areaName || r.area || 'Area',
                            zoneId: r.zoneId,
                            wardId: r.wardId,
                            zoneName: r.zoneName || r.zone?.name,
                            wardName: r.wardName || r.ward?.name,
                            latitude: r.latitude || r.lat,
                            longitude: r.longitude || r.lng,
                            assignedEmployeeIds: empIds,
                            assignedSupervisorId: r.assignedSupervisorId || r.supervisorId || empIds[0]
                        });
                    } else {
                        const existing = binMap.get(r.id);
                        Object.assign(existing, {
                            ...r,
                            ...existing,
                            assignedEmployeeIds: existing.assignedEmployeeIds?.length ? existing.assignedEmployeeIds : empIds
                        });
                    }
                });
            }

            const validBins = Array.from(binMap.values()).filter((b: any) => b.status !== 'REJECTED');
            setBins(validBins);
            if (zoneRes.status === 'fulfilled') setZones(zoneRes.value.nodes || []);
            if (wardRes.status === 'fulfilled') setAllWards(wardRes.value.nodes || []);
        } catch (err) {
            console.error('Failed to load twinbin staff assignments data', err);
        } finally {
            setLoading(false);
        }
    };

    const visibleWards = selectedZone
        ? allWards.filter(w => w.parentId === selectedZone || w.parent?.id === selectedZone)
        : allWards;

    const handleZoneChange = (zId: string) => {
        setSelectedZone(zId);
        if (selectedWard) {
            const wardObj = allWards.find(w => w.id === selectedWard);
            const parentZ = wardObj?.parentId || wardObj?.parent?.id;
            if (zId && parentZ !== zId) setSelectedWard("");
        }
    };

    const handleWardChange = (wId: string) => {
        setSelectedWard(wId);
        if (wId) {
            const wardObj = allWards.find(w => w.id === wId);
            const parentZ = wardObj?.parentId || wardObj?.parent?.id;
            if (parentZ) setSelectedZone(parentZ);
        }
    };

    // Flattened Assignment Rows for Litterbins (Supervisor List + Bins List fallback)
    const assignmentRows = useMemo(() => {
        const rows: any[] = [];
        const mappedBinIds = new Set<string>();

        // 1. Map supervisors with their assigned bins
        supervisors.forEach(sup => {
            const supBins = bins.filter(b => {
                const empIds = b.assignedEmployeeIds || (b.assignedEmployees ? b.assignedEmployees.map((e: any) => e.id) : []);
                return (Array.isArray(empIds) && empIds.includes(sup.id)) ||
                    b.assignedSupervisorId === sup.id ||
                    b.assignedToId === sup.id ||
                    b.supervisorId === sup.id;
            });
            if (supBins.length > 0) {
                supBins.forEach(b => {
                    mappedBinIds.add(b.id);
                    const zName = b.zoneName || b.zone?.name || 'Zone 1';
                    const wName = b.wardName || b.ward?.name || 'Ward 1';
                    rows.push({
                        id: `sup-bin-${sup.id}-${b.id}`,
                        binId: b.id,
                        areaName: b.areaName || b.locationName || 'Litterbin Asset',
                        locationName: b.locationName || '',
                        binCode: b.code || b.id.slice(0, 8),
                        lat: b.latitude || b.lat || '22.7196',
                        lng: b.longitude || b.lng || '75.8577',
                        zoneName: zName,
                        wardName: wName,
                        zoneId: b.zoneId,
                        wardId: b.wardId,
                        supervisorId: sup.id,
                        supervisorName: sup.name || 'Supervisor',
                        supervisorPhone: sup.phone || sup.mobile || '9893001122',
                        supervisorEmail: sup.email || 'supervisor@indore.gov.in',
                        supervisorAadhar: sup.aadhar || sup.aadhaar || sup.employeeCode || `EMP-${String(sup.id).slice(0, 6)}`,
                        qcOfficer: b.qcOfficer?.name || 'QC Litterbin Team',
                        actionOfficer: b.actionOfficer?.name || 'AO Division',
                        isAssigned: true
                    });
                });
            } else {
                rows.push({
                    id: `sup-unassigned-${sup.id}`,
                    binId: null,
                    areaName: 'No Litterbin Location Assigned',
                    binName: 'No Litterbin Location Assigned',
                    binCode: '—',
                    lat: '22.7196',
                    lng: '75.8577',
                    zoneName: 'Zone 1',
                    wardName: 'Ward 1',
                    zoneId: null,
                    wardId: null,
                    supervisorId: sup.id,
                    supervisorName: sup.name || 'Supervisor',
                    supervisorPhone: sup.phone || sup.mobile || '9893001122',
                    supervisorEmail: sup.email || 'supervisor@indore.gov.in',
                    supervisorAadhar: sup.aadhar || sup.aadhaar || sup.employeeCode || `EMP-${String(sup.id).slice(0, 6)}`,
                    qcOfficer: 'QC Litterbin Team',
                    actionOfficer: 'AO Division',
                    isAssigned: false
                });
            }
        });

        // 2. Map remaining unassigned bins
        bins.forEach(b => {
            if (!mappedBinIds.has(b.id)) {
                const zName = b.zoneName || b.zone?.name || 'Zone 1';
                const wName = b.wardName || b.ward?.name || 'Ward 1';
                rows.push({
                    id: `bin-unassigned-${b.id}`,
                    binId: b.id,
                    areaName: b.areaName || b.locationName || 'Litterbin Asset',
                    locationName: b.locationName || '',
                    binCode: b.code || b.id.slice(0, 8),
                    lat: b.latitude || b.lat || '22.7196',
                    lng: b.longitude || b.lng || '75.8577',
                    zoneName: zName,
                    wardName: wName,
                    zoneId: b.zoneId,
                    wardId: b.wardId,
                    supervisorId: null,
                    supervisorName: 'Unassigned',
                    supervisorPhone: '—',
                    supervisorEmail: '—',
                    supervisorAadhar: '—',
                    qcOfficer: b.qcOfficer?.name || 'QC Litterbin Team',
                    actionOfficer: b.actionOfficer?.name || 'AO Division',
                    isAssigned: false
                });
            }
        });

        return rows;
    }, [bins, supervisors]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Filtered Table Rows
    const filteredRows = useMemo(() => {
        const filtered = assignmentRows.filter(r => {
            if (selectedZone && r.zoneId !== selectedZone && r.zoneName !== zones.find(z => z.id === selectedZone)?.name) return false;
            if (selectedWard && r.wardId !== selectedWard && r.wardName !== allWards.find(w => w.id === selectedWard)?.name) return false;
            if (selectedSupervisor && r.supervisorId !== selectedSupervisor) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const sName = (r.supervisorName || '').toLowerCase();
                const sPhone = (r.supervisorPhone || '').toLowerCase();
                const bName = (r.areaName || r.binName || '').toLowerCase();
                const wName = (r.wardName || '').toLowerCase();
                if (!sName.includes(q) && !sPhone.includes(q) && !bName.includes(q) && !wName.includes(q)) return false;
            }

            return true;
        });

        // Group / Sort by Supervisor (assigned supervisor rows together, unassigned at bottom)
        return filtered.sort((a, b) => {
            if (a.isAssigned && !b.isAssigned) return -1;
            if (!a.isAssigned && b.isAssigned) return 1;
            return (a.supervisorName || '').localeCompare(b.supervisorName || '');
        });
    }, [assignmentRows, selectedZone, selectedWard, selectedSupervisor, searchQuery, zones, allWards]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedZone, selectedWard, selectedSupervisor, searchQuery]);

    const totalPages = useMemo(() => Math.ceil(filteredRows.length / pageSize) || 1, [filteredRows.length, pageSize]);
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredRows.slice(start, start + pageSize);
    }, [filteredRows, currentPage, pageSize]);

    const handleExportCSV = () => {
        if (filteredRows.length === 0) return alert("No data available to export.");
        const headers = ["Supervisor Name", "Supervisor Phone", "Litterbin Area", "Location Name", "Zone", "Ward", "QC Officer", "Action Officer"];
        const csvRows = [
            headers.join(","),
            ...filteredRows.map(r => [
                `"${r.supervisorName || ''}"`,
                `"${r.supervisorPhone || ''}"`,
                `"${r.areaName || ''}"`,
                `"${r.locationName || ''}"`,
                `"${r.zoneName || ''}"`,
                `"${r.wardName || ''}"`,
                `"${r.qcOfficer || ''}"`,
                `"${r.actionOfficer || ''}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Litterbin_Supervisor_Assignments_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [processingText, setProcessingText] = useState<string | null>(null);

    const handleAssignSave = async () => {
        if (!selectedBinToAssign || !targetSupervisorId) return;
        setAssigning(true);
        setProcessingText('Saving supervisor assignment...');
        try {
            await TwinbinApi.assign(selectedBinToAssign.id, { assignedEmployeeIds: [targetSupervisorId] });
            setShowAssignModal(false);
            setSelectedBinToAssign(null);
            setTargetSupervisorId("");
            await loadData();
        } catch (err: any) {
            console.error("Assignment failed:", err);
        } finally {
            setAssigning(false);
            setProcessingText(null);
        }
    };

    const handleUnassign = (row: any) => {
        if (!row.binId) return;
        setUnassignConfirmRow(row);
    };

    const confirmUnassignAction = async () => {
        if (!unassignConfirmRow || !unassignConfirmRow.binId) return;
        setProcessingText('Unassigning supervisor...');
        try {
            await TwinbinApi.assign(unassignConfirmRow.binId, { assignedEmployeeIds: [] });
            setUnassignConfirmRow(null);
            await loadData();
        } catch (err: any) {
            console.error("Unassign failed:", err);
        } finally {
            setProcessingText(null);
        }
    };

    const exportCSV = () => {
        if (filteredRows.length === 0) return;
        const headers = ['S.No', 'Supervisor Name', 'Phone', 'Email', 'Aadhar/Emp Code', 'Bin Location', 'Bin ID', 'Zone', 'Ward', 'Latitude', 'Longitude', 'QC Officer', 'Action Officer'];
        const rows = filteredRows.map((r, i) => [
            i + 1,
            `"${r.supervisorName}"`,
            `"${r.supervisorPhone}"`,
            `"${r.supervisorEmail}"`,
            `"${r.supervisorAadhar}"`,
            `"${r.binName}"`,
            `"${r.binCode}"`,
            `"${r.zoneName}"`,
            `"${r.wardName}"`,
            `"${r.lat}"`,
            `"${r.lng}"`,
            `"${r.qcOfficer}"`,
            `"${r.actionOfficer}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `litterbin_staff_assignments_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-out', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
                .filter-select {
                    padding: 6px 12px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    font-size: 12px;
                    font-weight: 500;
                    color: #334155;
                    background: #ffffff;
                    outline: none;
                    height: 34px;
                    transition: border-color 0.15s;
                }
                .filter-select:focus {
                    border-color: #2563eb;
                }
            `}</style>

            {/* TOP SINGLE-ROW TOOLBAR */}
            <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '12px 18px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                    {/* Left: Search & Dropdowns */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 300 }}>
                        <input
                            type="text"
                            placeholder="🔍 Search supervisor, phone, bin..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="filter-select"
                            style={{ flex: 1, minWidth: 180, maxWidth: 240 }}
                        />

                        <select value={selectedZone} onChange={e => handleZoneChange(e.target.value)} className="filter-select">
                            <option value="">All Zones</option>
                            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                        </select>

                        <select value={selectedWard} onChange={e => handleWardChange(e.target.value)} className="filter-select">
                            <option value="">All Wards</option>
                            {visibleWards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>

                        <select value={selectedSupervisor} onChange={e => setSelectedSupervisor(e.target.value)} className="filter-select">
                            <option value="">All Supervisors</option>
                            {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>

                        {(selectedZone || selectedWard || selectedSupervisor || searchQuery) && (
                            <button
                                onClick={() => { setSelectedZone(''); setSelectedWard(''); setSelectedSupervisor(''); setSearchQuery(''); }}
                                style={{ padding: '0 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: 11, fontWeight: 600, cursor: 'pointer', height: 34 }}
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Right: Actions & Export */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                            onClick={exportCSV}
                            style={{
                                padding: '0 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                                background: '#ffffff', color: '#0f172a', fontSize: 11, fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, height: 34
                            }}
                        >
                            📥 Export CSV
                        </button>

                        <button
                            onClick={() => { setSelectedBinToAssign(bins[0] || null); setShowAssignModal(true); }}
                            style={{
                                padding: '0 14px', borderRadius: 8, border: 'none',
                                background: '#2563eb', color: '#ffffff', fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, height: 34,
                                boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
                            }}
                        >
                            ➕ Assign Supervisor
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: 10, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc', padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', fontWeight: 500 }}>
                    <span>👨‍💼 Total Supervisors: <strong style={{ color: '#0f172a', fontWeight: 700 }}>{supervisors.length}</strong></span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span>📍 Litterbin Points: <strong style={{ color: '#2563eb', fontWeight: 700 }}>{bins.length || filteredRows.length} Points</strong></span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span>✅ Total Assigned Supervisors: <strong style={{ color: '#16a34a', fontWeight: 700 }}>{new Set(filteredRows.filter(r => r.isAssigned && r.supervisorId).map(r => r.supervisorId)).size}</strong></span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span>👥 Unassigned Supervisors: <strong style={{ color: '#d97706', fontWeight: 700 }}>{Math.max(0, supervisors.length - new Set(filteredRows.filter(r => r.isAssigned && r.supervisorId).map(r => r.supervisorId)).size)}</strong></span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span>⚠️ Unassigned Locations: <strong style={{ color: '#dc2626', fontWeight: 700 }}>{filteredRows.filter(r => !r.isAssigned || !r.supervisorId || r.supervisorName === 'Unassigned').length}</strong></span>
                </div>
            </div>

            {/* WORKFORCE ASSIGNMENTS TABLE STREAM */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                    <div className="animate-spin" style={{ width: 28, height: 28, border: '3px solid #f3f3f3', borderTop: '3px solid #2563eb', borderRadius: '50%', margin: '0 auto' }} />
                    <p style={{ marginTop: 12, color: '#64748b', fontSize: 13, fontWeight: 500 }}>Loading supervisor deployments...</p>
                </div>
            ) : filteredRows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#334155' }}>No supervisor assignments found</h4>
                    <p style={{ fontSize: 12, margin: '4px 0 0' }}>Try adjusting your filters above or add a new assignment.</p>
                </div>
            ) : (
                <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', minHeight: 280, paddingBottom: 0, overflow: 'visible', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>S.NO.</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>SUPERVISOR</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>LITTERBIN AREA AND LOCATION</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>ZONE & WARD</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>GPS COORDINATES</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>QC & ACTION OFFICER</th>
                                <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRows.map((row, index) => (
                                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}>
                                    <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                                        {(currentPage - 1) * pageSize + index + 1}
                                    </td>
                                    {/* Staff / Supervisor Details */}
                                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: row.isAssigned ? '#0f172a' : '#334155' }}>{row.supervisorName}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle' }}>
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                            </svg>
                                            <span>{row.supervisorPhone}</span>
                                        </div>
                                    </td>

                                    {/* Litterbin Area & Location */}
                                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: row.binId ? '#0f172a' : '#94a3b8' }}>{row.areaName}</div>
                                        {row.binId && row.locationName && row.locationName !== row.areaName ? (
                                            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>📍 Location: {row.locationName}</div>
                                        ) : null}
                                    </td>

                                    {/* Zone & Ward */}
                                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{row.wardName}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>{row.zoneName}</div>
                                    </td>

                                    {/* Coordinates */}
                                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#2563eb' }}>
                                            {row.lat && row.lng ? `${row.lat}°, ${row.lng}°` : 'N/A'}
                                        </div>
                                    </td>

                                    {/* QC & Action Officer */}
                                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>QC: {row.qcOfficer}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>AO: {row.actionOfficer}</div>
                                    </td>

                                    {/* Actions Column (3-Dots Menu) */}
                                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', position: 'relative' }}>
                                        <button
                                            onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)}
                                            style={{
                                                background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8,
                                                padding: '6px 12px', fontSize: 14, fontWeight: 700, color: '#334155',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ⋮
                                        </button>

                                        {/* Dropdown Menu */}
                                        {activeMenuId === row.id && (
                                            <div
                                                onClick={() => setActiveMenuId(null)}
                                                style={{
                                                    position: 'absolute', right: 14, top: 44, zIndex: 999,
                                                    background: '#ffffff', borderRadius: 10, border: '1px solid #cbd5e1',
                                                    boxShadow: '0 12px 30px rgba(0,0,0,0.18)', padding: 6, minWidth: 170, textAlign: 'left'
                                                }}
                                            >
                                                <button
                                                    onClick={() => {
                                                        const targetBin = bins.find(b => b.id === row.binId) || bins[0];
                                                        setSelectedBinToAssign(targetBin || null);
                                                        setTargetSupervisorId(row.supervisorId || '');
                                                        setShowAssignModal(true);
                                                    }}
                                                    style={{
                                                        width: '100%', padding: '9px 12px', border: 'none', background: 'transparent',
                                                        fontSize: 12, fontWeight: 600, color: '#0f172a', textAlign: 'left',
                                                        cursor: 'pointer', borderRadius: 6
                                                    }}
                                                >
                                                    🔄 Reassign Supervisor
                                                </button>
                                                {row.isAssigned && (
                                                    <button
                                                        onClick={() => handleUnassign(row)}
                                                        style={{
                                                            width: '100%', padding: '9px 12px', border: 'none', background: 'transparent',
                                                            fontSize: 12, fontWeight: 600, color: '#dc2626', textAlign: 'left',
                                                            cursor: 'pointer', borderRadius: 6
                                                        }}
                                                    >
                                                        ❌ Unassign Supervisor
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* PAGINATION FOOTER CONTROL BAR */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '0 0 14px 14px' }}>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                            Showing <strong style={{ color: '#0f172a' }}>{filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to <strong style={{ color: '#0f172a' }}>{Math.min(currentPage * pageSize, filteredRows.length)}</strong> of <strong style={{ color: '#0f172a' }}>{filteredRows.length}</strong> entries
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                                <span>Rows per page:</span>
                                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, background: '#fff', color: '#0f172a', fontWeight: 600 }}>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPage <= 1 ? '#f1f5f9' : '#fff', color: currentPage <= 1 ? '#94a3b8' : '#0f172a', fontSize: 12, fontWeight: 600, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
                                <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 12, fontWeight: 600, color: '#334155' }}>Page {currentPage} of {totalPages}</span>
                                <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: currentPage >= totalPages ? '#f1f5f9' : '#fff', color: currentPage >= totalPages ? '#94a3b8' : '#0f172a', fontSize: 12, fontWeight: 600, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSIGN / REASSIGN MODAL */}
            {showAssignModal && typeof document !== 'undefined' && createPortal(
                <div onClick={() => setShowAssignModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 500, padding: 24, boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Assign Supervisor to Litterbin</h3>
                            <button onClick={() => setShowAssignModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Close</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Select Litterbin Location</label>
                                <select
                                    value={selectedBinToAssign?.id || ''}
                                    onChange={e => setSelectedBinToAssign(bins.find(b => b.id === e.target.value) || null)}
                                    className="filter-select"
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Choose Litterbin...</option>
                                    {bins.map(b => {
                                        const title = (b.areaName && b.locationName && b.areaName !== b.locationName)
                                            ? `${b.areaName} - ${b.locationName}`
                                            : (b.areaName || b.locationName || 'Litterbin');
                                        return (
                                            <option key={b.id} value={b.id}>
                                                {title} ({b.wardName || b.ward?.name || 'Ward 1'})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Select Supervisor</label>
                                <select
                                    value={targetSupervisorId}
                                    onChange={e => setTargetSupervisorId(e.target.value)}
                                    className="filter-select"
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Choose Supervisor...</option>
                                    {supervisors.map(s => {
                                        const phone = s.phone || s.mobile || s.contactNo;
                                        return (
                                            <option key={s.id} value={s.id}>
                                                {s.name}{phone ? ` (${phone})` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {selectedBinToAssign && (
                                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569' }}>
                                    <div><strong>Location:</strong> {selectedBinToAssign.wardName || 'Ward 1'}, {selectedBinToAssign.zoneName || 'Zone 1'}</div>
                                    <div><strong>GPS:</strong> {selectedBinToAssign.latitude || '22.7196'}°, {selectedBinToAssign.longitude || '75.8577'}°</div>
                                </div>
                            )}

                            <button
                                onClick={handleAssignSave}
                                disabled={assigning || !selectedBinToAssign || !targetSupervisorId}
                                style={{
                                    marginTop: 8, padding: '10px 16px', borderRadius: 8, border: 'none',
                                    background: assigning ? '#93c5fd' : '#2563eb', color: '#ffffff',
                                    fontSize: 13, fontWeight: 600, cursor: assigning ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {assigning ? 'Saving Assignment...' : 'Save Supervisor Assignment'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* UNASSIGN CONFIRMATION MODAL */}
            {unassignConfirmRow && typeof document !== 'undefined' && createPortal(
                <div onClick={() => setUnassignConfirmRow(null)} style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 440, padding: 24, boxShadow: '0 25px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 12px' }}>
                            ⚠️
                        </div>
                        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Unassign Supervisor</h3>
                        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                            Are you sure you want to unassign the supervisor from <strong style={{ color: '#0f172a' }}>{unassignConfirmRow.binName}</strong>?
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => setUnassignConfirmRow(null)}
                                style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmUnassignAction}
                                style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#ffffff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(220,38,38,0.2)' }}
                            >
                                Yes, Unassign
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Processing Spinner Overlay */}
            {processingText && typeof document !== 'undefined' && createPortal(
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 999999,
                    backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#ffffff', gap: 16
                }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        border: '4px solid rgba(255,255,255,0.2)',
                        borderTop: '4px solid #2563eb',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.02em', color: '#f8fafc' }}>
                        {processingText}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
