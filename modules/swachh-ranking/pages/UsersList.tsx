import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from '../react-router-shim';
import api from '../api/axios';
import { Search, Filter, RefreshCw, Mail, Phone, Calendar, Edit2, X, Save, Trash2, FileDown } from 'lucide-react';
import NoAccess from '../components/NoAccess';
import { hasPermission } from '../utils/accessControl';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface User {
    id: string;
    name: string;
    email: string;
    mobileNumber: string;
    aadharNumber: string | null;
    role: string;
    accessorType: string | null;
    ward: string | null;
    zone: string | null;
    status: string;
    createdAt: string;
    deletedAt?: string
    deletedBy?: string
}

const UsersList = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const canViewUsers = hasPermission(currentUser?.permissions, 'users', 'view');
    const canWriteUsers = hasPermission(currentUser?.permissions, 'users', 'write');

    if (!currentUser || !canViewUsers) {
        return <NoAccess title="Users Module" message="You do not have permission to view the user directory." />;
    }

    const [searchParams] = useSearchParams();
    const initialRole = searchParams.get('role') || '';
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState(initialRole);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});
    const [saving, setSaving] = useState(false);
    const [zones, setZones] = useState<any[]>([]);
    const [deletedUsers, setDeletedUsers] = useState<User[]>([]);
    // ⭐ PAGINATION
const [currentPage, setCurrentPage] = useState(1);
const [rowsPerPage, setRowsPerPage] = useState(10);

const indexOfLast = currentPage * rowsPerPage;
const indexOfFirst = indexOfLast - rowsPerPage;

const currentUsers = users.slice(indexOfFirst, indexOfLast);

const totalPages = Math.ceil(users.length / rowsPerPage);

const startRecord = users.length === 0 ? 0 : indexOfFirst + 1;
const endRecord = Math.min(indexOfLast, users.length);
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            params.append('status', 'approved');
            if (roleFilter) {
                params.append('role', roleFilter);
            }
            const trimmedSearch = searchTerm.trim();
            if (trimmedSearch) {
                params.append('search', trimmedSearch);
            }

            const response = await api.get(`/admin/users?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (err: any) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAreas = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/areas/zones', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setZones(response.data);
        } catch (err) {
            console.error('Failed to fetch areas');
        }
    };

    const dispatchUsersSearchSync = useCallback((value: string) => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('users:search-sync', { detail: value }));
    }, []);

    useEffect(() => {
        dispatchUsersSearchSync('');
        const handleNavbarSearch = (event: Event) => {
            const detail = (event as CustomEvent<string>).detail ?? '';
            setSearchTerm(detail);
        };

        window.addEventListener('navbar:search', handleNavbarSearch as EventListener);
        return () => {
            window.removeEventListener('navbar:search', handleNavbarSearch as EventListener);
            dispatchUsersSearchSync('');
        };
    }, [dispatchUsersSearchSync]);

    useEffect(() => {
        const delayDebounceFn = window.setTimeout(() => {
            fetchUsers();
        }, 300);

        return () => window.clearTimeout(delayDebounceFn);
    }, [searchTerm, roleFilter]);

    useEffect(() => {
        fetchAreas();
        fetchDeletedUsers();
    }, []);

    const handleSearchInputChange = (value: string) => {
        setSearchTerm(value);
        dispatchUsersSearchSync(value);
    };

    const handleRefreshClick = () => {
        fetchUsers();
        fetchDeletedUsers();
    };

    const handleExportCsv = () => {
        if (users.length === 0) {
            alert('No users available to export.');
            return;
        }

        const toCsvValue = (value: string | null | undefined) => {
            const normalized = value ?? '';
            const escaped = normalized.replace(/"/g, '""');
            return `"${escaped}"`;
        };

        const headers = ['Name', 'Email', 'Mobile', 'Role', 'Status', 'Zone', 'Ward'];
        const rows = users.map((user) => [
            user.name,
            user.email,
            user.mobileNumber,
            user.role,
            user.status,
            user.zone || '',
            user.ward || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(toCsvValue).join(','))
            .join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `users-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    const handleExportPdf = () => {

    if (users.length === 0) {
        alert("No users available to export.");
        return;
    }

    const doc = new jsPDF("landscape");

    const tableColumn = [
        "Name",
        "Email",
        "Mobile",
        "Role",
        "Status",
        "Zone",
        "Ward",
        "Joining Date"
    ];

    const tableRows = users.map(u => ([
        u.name,
        u.email,
        u.mobileNumber,
        u.role,
        u.status,
        u.zone || "-",
        u.ward || "-",
        new Date(u.createdAt).toLocaleDateString()
    ]));

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: {
            fontSize: 8
        },
        headStyles: {
            fillColor: [79, 70, 229]   // indigo theme
        }
    });

    doc.text(`Total Users : ${users.length}`, 14, 12);

    doc.save(`users-${new Date().toISOString().split("T")[0]}.pdf`);
};
    const handleEditClick = (user: User) => {
        if (!canWriteUsers) {
            alert('Write permission required for editing.');
            return;
        }
        setEditingUser(user);
        setEditForm({
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            role: user.role,
            accessorType: user.accessorType,
            ward: user.ward || '',
            zone: user.zone || ''
        });
    };

    const handleSaveEdit = async () => {
        if (!canWriteUsers) {
            alert('Write permission required for editing.');
            return;
        }
        if (!editingUser) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await api.patch(`/admin/users/${editingUser.id}`, editForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditingUser(null);
            fetchUsers();
            alert('User updated successfully!');
        } catch (err: any) {
            console.error('Failed to update user', err);
            alert('Update failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };
const handleDeleteUser = async (id: string) => {
    if (!canWriteUsers) {
        alert('Write permission required for deletion.');
        return;
    }
    const confirmDelete = window.confirm("Are you sure you want to delete this user?");
    if (!confirmDelete) return;

    try {
        const token = localStorage.getItem("token");

        await api.delete(`/admin/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        alert("User deleted successfully");
        handleRefreshClick();
        window.dispatchEvent(new Event("dashboard:refresh"));
    } catch (err: any) {
        console.error("Delete failed", err);
        alert(err.response?.data?.message || "Failed to delete user");
    }
};
const fetchDeletedUsers = async () => {
    try {
        const token = localStorage.getItem("token");

        const res = await api.get("/admin/users/deleted", {
            headers: { Authorization: `Bearer ${token}` }
        });

        setDeletedUsers(res.data);
    } catch (err) {
        console.error("Failed to fetch deleted users");
    }
};
const handleRestore = async (id: string) => {
    if (!canWriteUsers) {
        alert('Write permission required for restore.');
        return;
    }
    const token = localStorage.getItem("token");

    await api.patch(`/admin/users/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });

    handleRefreshClick();
    window.dispatchEvent(new Event("dashboard:refresh"));
};

    return (
        <div className="users-list-view">
            <header className="page-header-row" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 850, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                        User Management
                    </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
                        Monitor and manage active accounts across the Swachh Ranking system.
                    </p>
                </div>
                <button
                    onClick={fetchUsers}
                    className="btn btn-outline"
                    aria-label="Refresh users"
                    style={{ padding: '0.75rem', height: 'fit-content', flexShrink: 0 }}
                    disabled={loading}
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            <div className="card shadow-lg" style={{ marginBottom: '2.5rem', padding: '1.5rem', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '320px', position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                        <input
                            type="text"
                            placeholder="Search by name, email or mobile..."
                            value={searchTerm}
                            onChange={(e) => handleSearchInputChange(e.target.value)}
                            style={{ paddingLeft: '3.5rem', height: '52px', fontWeight: 500 }}
                        />
                    </div>

                    <div style={{ width: '220px', position: 'relative' }}>
                        <Filter style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            aria-label="Filter by role"
                            style={{ paddingLeft: '3.5rem', height: '52px', fontWeight: 600 }}
                        >
                            <option value="">All Roles</option>
                            <option value="admin">Administrators</option>
                            <option value="qc">Quality Control</option>
                            <option value="accessor">Field Accessors</option>
                        </select>
                    </div>

                    <button
                        onClick={handleRefreshClick}
                        className="btn btn-outline"
                        style={{ width: '52px', height: '52px', padding: 0 }}
                        disabled={loading}
                        title="Reload latest users"
                    >
                        <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {/* <button
                        onClick={handleExportCsv}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.25rem', fontWeight: 700, height: '52px' }}
                        disabled={users.length === 0}
                        title="Download the current list as CSV"
                    >
                        <FileDown size={18} />
                        Export CSV
                    </button> */}
                    <div style={{ display: "flex", gap: "10px" }}>
    
<button
    onClick={handleExportCsv}
    className="btn btn-outline"
    disabled={users.length === 0}
>
    <FileDown size={18} />
    Excel
</button>

<button
    onClick={handleExportPdf}
    className="btn btn-primary"
    disabled={users.length === 0}
>
    <FileDown size={18} />
    PDF
</button>

</div>
                </div>
            </div>

            <div className="card shadow-lg" style={{ padding: '0', overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                {loading && users.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '6rem 0' }}>
                        <RefreshCw size={40} style={{ margin: '0 auto 1.5rem', display: 'block', color: 'var(--primary)' }} className="animate-spin" />
                        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Syncing user database...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '6rem 0' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', fontWeight: 600 }}>No active users found matching your criteria.</p>
                    </div>
                ) : (
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Contact Details</th>
                                    <th>System Role</th>
                                    <th>Identity Check</th>
                                    <th>Joining Date</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
{currentUsers.map((u) => (                                    
    <tr key={u.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                <div className="user-avatar" style={{ width: '42px', height: '42px', fontSize: '1rem' }}>
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{u.name}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    <Mail size={16} style={{ color: 'var(--primary)' }} />
                                                    {u.email}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                                    <Phone size={16} style={{ color: 'var(--text-secondary)' }} />
                                                    {u.mobileNumber}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge badge-approved" style={{ fontWeight: 800, background: 'var(--primary-soft)', color: '#3730a3' }}>
                                                {u.role}
                                            </span>
                                            {u.accessorType && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                                    Dept: {u.accessorType}
                                                </div>
                                            )}
                                            {(u.ward || u.zone) && (
                                                <div style={{ fontSize: '0.7rem', color: 'var(--swachh-green)', marginTop: '0.25rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                                    {u.zone && `Z: ${u.zone}`} {u.ward && `W: ${u.ward}`}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>Aadhar Verification</div>
                                            <div style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.125em', color: 'var(--text-primary)' }}>{u.aadharNumber || 'Not provided'}</div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9375rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
                                                {new Date(u.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                            </div>
                                        </td>
                                        {/* <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleEditClick(u)}
                                                className="btn btn-outline"
                                                style={{ padding: '0.5rem', color: 'var(--primary)', borderColor: 'var(--primary-soft)' }}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </td> */}
                                        <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>

    <button
        onClick={() => handleEditClick(u)}
        className="btn btn-outline"
        aria-label="Edit user"
        style={{ padding: '0.5rem', color: 'var(--primary)', borderColor: 'var(--primary-soft)' }}
        disabled={!canWriteUsers}
    >
        <Edit2 size={18} />
    </button>

    <button
        onClick={() => handleDeleteUser(u.id)}
        className="btn btn-outline"
        aria-label="Delete user"
        style={{ padding: '0.5rem', color: '#ef4444', borderColor: '#fecaca' }}
        disabled={!canWriteUsers}
    >
        <Trash2 size={18} />
    </button>

</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 18px",
    background: "#f8fafc",
    borderTop: "1px solid #e5e7eb"
  }}
>
  {/* LEFT */}
  <div style={{ display: "flex", alignItems: "center", gap: "12px", whiteSpace: "nowrap" }}>
    
    <span style={{ fontWeight: 600 }}>Rows per page</span>

    <select
      value={rowsPerPage}
      aria-label="Rows per page"
      onChange={(e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
      }}
      style={{
        padding: "6px 10px",
        borderRadius: "8px",
        border: "1px solid #d1d5db",
        background: "white",
        fontWeight: 600
      }}
    >
      <option value={10}>10</option>
      <option value={25}>25</option>
      <option value={50}>50</option>
      <option value={100}>100</option>
    </select>

    <span style={{ color: "#6b7280", fontWeight: 600 }}>
      {startRecord}-{endRecord} of {users.length}
    </span>

  </div>

  {/* RIGHT */}
  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
    
    <span style={{ fontWeight: 600 }}>
      Page {currentPage} of {totalPages}
    </span>

    <button
      onClick={() => setCurrentPage((p) => p - 1)}
      disabled={currentPage === 1}
      className="btn btn-outline"
    >
      ‹
    </button>

    <button
      onClick={() => setCurrentPage((p) => p + 1)}
      disabled={currentPage === totalPages}
      className="btn btn-outline"
    >
      ›
    </button>

  </div>
</div>
                    </div>
                )}
            </div>
{/* Deleted Users Section */}

<div className="card shadow-lg" style={{ marginTop: '2rem', padding: '1.5rem' }}>
    <h2 style={{ marginBottom: '1rem' }}>Deleted Users</h2>

    {deletedUsers.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No deleted users</p>
    ) : (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Mobile</th>
                        <th>Deleted By</th>
                        <th>Deleted At</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {deletedUsers.map(u => (
                        <tr key={u.id}>
                            <td>{u.name}</td>
                            <td>{u.email}</td>
                            <td>{u.mobileNumber}</td>
<td>{u.deletedBy || "-"}</td>

<td>
{u.deletedAt 
    ? new Date(u.deletedAt).toLocaleString() 
    : "-"
}
</td>

                            <td style={{ textAlign: "right" }}>
                                <button
                                    onClick={() => handleRestore(u.id)}
                                    className="btn btn-outline"
                                    disabled={!canWriteUsers}
                                >
                                    Restore
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )}
</div>
            {/* Edit User Modal */}
            {editingUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card shadow-premium" style={{ width: '100%', maxWidth: '600px', padding: 0, overflow: 'hidden', border: 'none' }}>
                        <div style={{ padding: '1.5rem 2rem', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Edit User Profile</h2>
                            <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div className="form-group">
                                    <label>Full Employee Name</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div className="form-group">
                                    <label>Mobile Number</label>
                                    <input
                                        type="text"
                                        value={editForm.mobileNumber}
                                        onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>System Role</label>
                                    <select
                                        value={editForm.role}
                                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="qc">QC</option>
                                        <option value="accessor">Accessor</option>
                                    </select>
                                </div>
                            </div>

                            {editForm.role === 'accessor' && (
                                <div className="form-group">
                                    <label>Department / Accessor Type</label>
                                    <select
                                        value={editForm.accessorType || ''}
                                        onChange={(e) => setEditForm({ ...editForm, accessorType: e.target.value as any })}
                                    >
                                        <option value="">Select Dept...</option>
                                        <option value="pmc">PMC</option>
                                        <option value="hms">HMS</option>
                                        <option value="janwani">Janwani</option>
                                    </select>
                                </div>
                            )}

                            {/* Added Dynamic Ward and Zone Dropdowns */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div className="form-group">
                                    <label>Assigned Zone</label>
                                    <select
                                        value={editForm.zone || ''}
                                        onChange={(e) => setEditForm({ ...editForm, zone: e.target.value, ward: '' })}
                                    >
                                        <option value="">Select Zone...</option>
                                        {zones.map(z => (
                                            <option key={z.id} value={z.name}>{z.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Assigned Ward</label>
                                    <select
                                        value={editForm.ward || ''}
                                        onChange={(e) => setEditForm({ ...editForm, ward: e.target.value })}
                                        disabled={!editForm.zone}
                                    >
                                        <option value="">Select Ward...</option>
                                        {zones.find(z => z.name === editForm.zone)?.wards.map((w: any) => (
                                            <option key={w.id} value={w.name}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button onClick={() => setEditingUser(null)} className="btn btn-outline" style={{ flex: 1, padding: '1rem' }}>Cancel</button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="btn btn-primary"
                                    style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    disabled={saving || !canWriteUsers}
                                >
                                    {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersList;
