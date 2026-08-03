import React, { useEffect, useState } from 'react';
import { useNavigate } from '../react-router-shim';
import api from '../api/axios';
import { RefreshCw, Eye, X, Filter, UserPlus, Check, UserMinus, Trash2, Search } from 'lucide-react';
import NoAccess from '../components/NoAccess';
import { hasPermission } from '../utils/accessControl';
import {
    CATEGORY_LABELS,
    PARTICIPANT_CATEGORIES,
    DEFAULT_ASSIGNMENT_BATCH,
    formatParticipantDisplayId,
    getCategoryMeta,
    getAssignmentProgressSummary
} from '../utils/participants';
import ParticipantDetailDrawer, { ParticipantRecord as ParticipantDetailRecord } from '../components/ParticipantDetailDrawer';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import Sanscript from "@indic-transliteration/sanscript";
import autoTable from "jspdf-autotable";
import { wardOptions as canonicalWardOptions } from '../constants/wardOptions';
interface User {
    id: string;
    name: string;
    role: string;
    accessorType: string | null;
}

interface AssignmentStats {
    total?: number | null;
    completed?: number | null;
    pending?: number | null;
}

interface SelfAssessmentInfo {
    id: string;
    status: string;
    submittedAt: string;
    qcRemarks?: string | null;
    qcReviewedBy?: string | null;
    qcReviewedAt?: string | null;
    qcTotalScore?: number | null;
    qcReviewComplete?: boolean;
    answers?: Record<string, any> | null;
}

interface Participant {
    id: string;
    category: string;
    mobileNumber: string;
    locationLat?: number | null;
    locationLng?: number | null;
    details: any;
    status: string;
    assignedTo?: {
        id: string;
        name: string;
        role: string;
    } | null;
    createdAt: string;
    deletedAt?: string
    deletedBy?: string
    assignmentStats?: AssignmentStats
    selfAssessment?: SelfAssessmentInfo | null;
}

type ConvertibleValue = string | number | boolean | null | undefined;

const WARD_DETAIL_KEYS = [
    'wardName',
    'ward',
    'wardNo',
    'wardNumber',
    'Ward',
    'WardName',
    'WardNo',
    'WardNumber'
];

const TYPE_DETAIL_KEYS = [
    'type',
    'schoolType',
    'hospitalType',
    'officeType',
    'hotelType',
    'groupType',
    'societyType',
    'marketType',
    'stakeholderType',
    'organizationType',
    'entityType',
    'participantType',
    'establishmentType',
    'institutionType',
    'categoryType'
];

const normalizeWardText = (value: string) =>
    value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

type WardOptionEntry = {
    number: number;
    label: string;
    normalizedName: string;
};

const CANONICAL_WARD_ENTRIES: WardOptionEntry[] = canonicalWardOptions
    .map((option): WardOptionEntry | null => {
        const match = option.match(/^(\d{1,2})\.\s*(.+)$/);
        if (!match) return null;
        const number = Number(match[1]);
        const name = match[2].trim();
        return {
            number,
            label: `${number}. ${name}`,
            normalizedName: normalizeWardText(name)
        };
    })
    .filter(
        (entry): entry is WardOptionEntry =>
            entry !== null && entry.number >= 1 && entry.number <= 15
    )
    .sort((a, b) => a.number - b.number);

const DEFAULT_WARD_OPTIONS = CANONICAL_WARD_ENTRIES.map((entry) => entry.label);
const OTHERS_WARD_LABEL = "Others";
const WARD_NUMBER_MAP = new Map(
    CANONICAL_WARD_ENTRIES.map((entry) => [entry.number, entry])
);

const mapWardValueToOption = (value: ConvertibleValue): string | null => {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    const numericMatch = raw.match(/(\d{1,2})/);
    if (numericMatch) {
        const wardNumber = Number(numericMatch[1]);
        const entry = WARD_NUMBER_MAP.get(wardNumber);
        if (entry) {
            return entry.label;
        }
    }

    const normalized = normalizeWardText(raw);
    if (!normalized) return OTHERS_WARD_LABEL;

    const entry = CANONICAL_WARD_ENTRIES.find(
        (ward) =>
            normalized.includes(ward.normalizedName) ||
            ward.normalizedName.includes(normalized)
    );

    if (entry) {
        return entry.label;
    }

    return OTHERS_WARD_LABEL;
};

const getParticipantWardLabel = (participant: Participant): string | null => {
    const details = participant.details || {};
    for (const key of WARD_DETAIL_KEYS) {
        const value = details?.[key];
        if (value !== undefined && value !== null) {
            const wardString = String(value).trim();
            if (wardString) {
                return mapWardValueToOption(wardString);
            }
        }
    }
    return null;
};

const ParticipantsList = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const canViewParticipants = hasPermission(currentUser?.permissions, 'participants', 'view');
    const canWriteParticipants = hasPermission(currentUser?.permissions, 'participants', 'write');

    if (!currentUser || !canViewParticipants) {
        return <NoAccess title="Participants Module" message="You do not have permission to view participants." />;
    }

    const [participants, setParticipants] = useState<Participant[]>([]);
     const [currentPage, setCurrentPage] = useState(1);
const [rowsPerPage, setRowsPerPage] = useState(10);
const indexOfLast = currentPage * rowsPerPage;
const indexOfFirst = indexOfLast - rowsPerPage;
const currentParticipants = participants.slice(indexOfFirst, indexOfLast);

const totalPages = Math.ceil(participants.length / rowsPerPage);
const startRecord = participants.length === 0 ? 0 : indexOfFirst + 1;
const endRecord = Math.min(indexOfLast, participants.length);
    const [accessors, setAccessors] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [assigningTo, setAssigningTo] = useState<Participant | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [deletingParticipantId, setDeletingParticipantId] = useState<string | null>(null);
    const [deletedParticipants, setDeletedParticipants] = useState<Participant[]>([]);
    const [showDeletedModal, setShowDeletedModal] = useState(false);
    const [deletedSearch, setDeletedSearch] = useState('');
    const [deletedSortDir, setDeletedSortDir] = useState<'asc' | 'desc'>('desc');
    const [assignmentCount, setAssignmentCount] = useState(DEFAULT_ASSIGNMENT_BATCH);
    const [assignmentError, setAssignmentError] = useState('');
 
    const navigate = useNavigate();
    const categoryFilters = PARTICIPANT_CATEGORIES;
    const selectedAssignmentSummary = getAssignmentProgressSummary(selectedParticipant?.assignmentStats);
    const assigningAssignmentSummary = getAssignmentProgressSummary(assigningTo?.assignmentStats);
    const showTypeFilter =
  (CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("school") ||
  (CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("hospital") ||
  (CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("office") ||
  (CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("hotel") ||
  (CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("citizen");
const [typeFilter, setTypeFilter] = useState("");
const [wardFilter, setWardFilter] = useState("");
const [wardOptions, setWardOptions] = useState<string[]>(DEFAULT_WARD_OPTIONS);

const cleanText = (val: ConvertibleValue): string => {
    if (val === null || val === undefined) return "";

    return String(val)
        .normalize("NFKD")            // unicode normalize
        .replace(/[^\x00-\x7F]/g, "") // remove non latin chars
        .replace(/\s+/g, " ")         // extra spaces remove
        .trim();
};
const convertToEnglish = (val: ConvertibleValue): string => {
    if (val === null || val === undefined) return "";

    try {
        return Sanscript.t(String(val), "devanagari", "itrans");
    } catch {
        return String(val);
    }
};
const exportFullDetailPDF = () => {

    if (participants.length === 0) {
        alert("No data to export");
        return;
    }

const doc = new jsPDF("landscape");

if (typeof (window as any).font !== "undefined") {
    doc.addFileToVFS("NotoSans-Regular.ttf", (window as any).font);
    doc.addFont("NotoSans-Regular.ttf", "Noto", "normal");
    doc.setFont("Noto");
}
    // ⭐ dynamic columns collect karenge
    const dynamicKeys = new Set<string>();

    participants.forEach(p => {
        Object.keys(p.details || {}).forEach(k => dynamicKeys.add(k));
    });

    const dynamicColumns = Array.from(dynamicKeys);

    const columns = [
        "Category",
        "Participant ID",
        "Status",
        "Mobile",
        "Assigned To",
        "Created Date",
        ...dynamicColumns.map(k =>
            k.replace(/([A-Z])/g, " $1")
        )
    ];

    const rows = participants.map(p => {

       const base = [
   convertToEnglish(p.category),
   convertToEnglish(formatParticipantDisplayId(p.id, p.category)),
   convertToEnglish(p.status),
   convertToEnglish(p.mobileNumber),
   convertToEnglish(p.assignedTo?.name || "Not Assigned"),
   convertToEnglish(new Date(p.createdAt).toLocaleDateString())
];

      const dynamicValues = dynamicColumns.map(
   k => convertToEnglish(p.details?.[k])
);

        return [...base, ...dynamicValues];
    });

    autoTable(doc, {
        head: [columns],
        body: rows,
        styles: {
            fontSize: 7
        },
        headStyles: {
            fillColor: [22, 160, 133]
        },
        startY: 20
    });
const finalY = (doc as any).lastAutoTable.finalY || 20;

doc.setFontSize(12);
doc.text(
  `Total Records : ${participants.length}`,
  14,
  finalY + 10
);
    doc.save(`${categoryFilter || "All"}_Full_Table_Report.pdf`);
};

const exportFullDetailExcel = () => {

    if (participants.length === 0) {
        alert("No data to export");
        return;
    }

    const data = participants.map(p => ({
        Category: p.category,
        ParticipantID: formatParticipantDisplayId(p.id, p.category),
        Status: p.status,
        Mobile: p.mobileNumber,
        AssignedTo: p.assignedTo?.name || "Not Assigned",
        CreatedDate: new Date(p.createdAt).toLocaleDateString(),
        ...p.details   // ⭐ popup jaisa dynamic columns
    }));

    const ws = XLSX.utils.json_to_sheet(data);
XLSX.utils.sheet_add_aoa(ws, [
  [],
  [`Total Records`, participants.length]
], { origin: -1 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participants Full Detail");

    const buffer = XLSX.write(wb, {
        bookType: "xlsx",
        type: "array"
    });

    const file = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    saveAs(file, `${categoryFilter || "All"}_Full_Details.xlsx`);
};
  
    const actionButtonStyle = (bg: string) => ({
        backgroundColor: bg,
        border: 'none',
        color: '#fff',
        fontWeight: 700,
        padding: '0.65rem 1rem',
        borderRadius: '999px',
        transition: 'background 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        cursor: 'pointer',
        boxShadow: '0 4px 10px rgba(15,23,42,0.08)',
        justifyContent: 'center',
        width: '142px'
    });

    const buttonThemes = {
        assign: { base: '#4F46E5', hover: '#4338CA' },
        delete: { base: '#EF4444', hover: '#DC2626' },
        view: { base: '#10B981', hover: '#059669' }
    };

    const getButtonHoverHandlers = (theme: { base: string; hover: string }) => ({
        onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = theme.hover;
        },
        onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = theme.base;
        }
    });

    const resetAssignmentModal = () => {
        setAssigningTo(null);
        setAssignmentCount(DEFAULT_ASSIGNMENT_BATCH);
        setAssignmentError('');
    };

    const openAssignmentModal = (participant: Participant) => {
        if (!canWriteParticipants) {
            alert('Write permission required to manage assignments.');
            return;
        }
        setAssigningTo(participant);
        setAssignmentCount(DEFAULT_ASSIGNMENT_BATCH);
        setAssignmentError('');
    };

//     const fetchData = async () => {
//         setLoading(true);
//         const token = localStorage.getItem('token');
//         try {
//             // Fetch Approved Participants
//             let url = "/participation?status=approved";

// if (categoryFilter) url += `&category=${categoryFilter}`;
// if (typeFilter) url += `&type=${typeFilter}`;
// if (wardFilter) url += `&wardName=${wardFilter}`;
//             const pResponse = await api.get(url, {
//                 headers: { Authorization: `Bearer ${token}` }
//             });
//             setParticipants(pResponse.data);

//             // Fetch Accessors
//             const uResponse = await api.get('/admin/users?role=accessor&status=approved', {
//                 headers: { Authorization: `Bearer ${token}` }
//             });
//             setAccessors(uResponse.data);
//         } catch (err) {
//             console.error('Failed to fetch data');
//         } finally {
//             setLoading(false);
//         }
//     };
const fetchData = async () => {
  setLoading(true);
  const token = localStorage.getItem("token");

  try {
    let url = "/participation?status=approved";
    if (categoryFilter) {
      url += `&category=${categoryFilter}`;
    }

    const pResponse = await api.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    let originalData: Participant[] = pResponse.data;

    const hasOtherWards = originalData.some(
      (participant) => getParticipantWardLabel(participant) === OTHERS_WARD_LABEL
    );

    const availableWardOptions = [
      ...DEFAULT_WARD_OPTIONS,
      ...(hasOtherWards ? [OTHERS_WARD_LABEL] : [])
    ];

    setWardOptions(availableWardOptions);
    if (wardFilter && !availableWardOptions.includes(wardFilter)) {
      setWardFilter("");
    }

    let filteredData = [...originalData];

    /* ⭐ type filter */
    if (typeFilter) {
      filteredData = filteredData.filter((p: Participant) =>
        String(
          p.details?.schoolType ||
          p.details?.hospitalType ||
          p.details?.officeType ||
          p.details?.groupType ||
          p.details?.type ||
          ""
        )
          .toLowerCase()
          .includes(typeFilter.toLowerCase())
      );
    }

    /* ⭐ ward filter */
    if (wardFilter) {
      filteredData = filteredData.filter(
        (p: Participant) => getParticipantWardLabel(p) === wardFilter
      );
    }

    setParticipants(filteredData);

    const uResponse = await api.get(
      "/admin/users?role=accessor&status=approved",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setAccessors(uResponse.data);

  } catch (err) {
    console.error("Failed to fetch participants", err);
  } finally {
    setLoading(false);
  }
};
   useEffect(() => {
    fetchData();
    fetchDeletedParticipants();
}, [categoryFilter, typeFilter, wardFilter]);
    const handleAssign = async (userId: string) => {
        if (!canWriteParticipants) {
            alert('Write permission required to assign.');
            return;
        }
        if (!assigningTo) return;
        if (assignmentCount < 1) {
            setAssignmentError('Please enter at least 1 assessment');
            return;
        }
        setAssignmentError('');
        setActionLoading(true);
        const token = localStorage.getItem('token');
        try {
            const { data } = await api.patch(`/participation/${assigningTo.id}/assign`,
                { userId, assignments: assignmentCount },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data?.participant) {
                setParticipants(prev =>
                    prev.map(p => p.id === data.participant.id ? data.participant : p)
                );
                if (selectedParticipant?.id === data.participant.id) {
                    setSelectedParticipant(data.participant);
                }
            }
            window.dispatchEvent(new Event('dashboard:refresh'));
            resetAssignmentModal();
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.message || 'Failed to assign participant');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnassign = async (participantId: string) => {
        if (!canWriteParticipants) {
            alert('Write permission required to unassign.');
            return;
        }
        if (!window.confirm('Are you sure you want to unassign this participant?')) return;
        setActionLoading(true);
        const token = localStorage.getItem('token');
        try {
            const { data } = await api.patch(`/participation/${participantId}/unassign`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data?.participant) {
                setParticipants(prev =>
                    prev.map(p => p.id === data.participant.id ? data.participant : p)
                );
                if (selectedParticipant?.id === data.participant.id) {
                    setSelectedParticipant(data.participant);
                }
            }
            if (assigningTo && assigningTo.id === participantId) {
                resetAssignmentModal();
            }
            window.dispatchEvent(new Event('dashboard:refresh'));
        } catch (err) {
            alert('Failed to unassign participant');
        } finally {
            setActionLoading(false);
        }
    };
const fetchDeletedParticipants = async () => {

    const token = localStorage.getItem('token');

    try{

        const res = await api.get("/participation/deleted",{
            headers:{Authorization:`Bearer ${token}`}
        })

        setDeletedParticipants(res.data)

    }catch(err){
        console.error("Failed to fetch deleted participants")
    }
}
const handleRestore = async (id:string) => {
    if (!canWriteParticipants) {
        alert('Write permission required to restore participants.');
        return;
    }

    const token = localStorage.getItem("token")

    await api.patch(`/participation/${id}/restore`,{},{
        headers:{Authorization:`Bearer ${token}`}
    })

    fetchData()
    fetchDeletedParticipants()

}
    const handleDelete = async (participantId: string) => {
if (!canWriteParticipants) {
    alert('Write permission required to delete participants.');
    return;
}
if (!window.confirm('This will move the participant to deleted list. Continue?')) return;        setDeletingParticipantId(participantId);
        const token = localStorage.getItem('token');
        try {
            await api.delete(`/participation/${participantId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setParticipants(prev => prev.filter(p => p.id !== participantId));
            if (selectedParticipant?.id === participantId) {
                setSelectedParticipant(null);
            }
            if (assigningTo?.id === participantId) {
                resetAssignmentModal();
            }
            window.dispatchEvent(new Event('dashboard:refresh'));
        } catch (err) {
            alert('Failed to delete participant');
        } finally {
            setDeletingParticipantId(null);
        }
    };

    const handleParticipantUpdated = (updatedParticipant: ParticipantDetailRecord) => {
        setParticipants((prev) => prev.map((participant) => (participant.id === updatedParticipant.id ? { ...participant, ...updatedParticipant } : participant)));
        setSelectedParticipant((prev) => (prev && prev.id === updatedParticipant.id ? { ...prev, ...updatedParticipant } : prev));
    };

    const renderDetails = (participant: Participant) => {
        const details = participant.details || {};

        const getDetailValue = (keys: string[]) => {
            for (const key of keys) {
                const value = details?.[key];
                if (value !== undefined && value !== null && value !== '') {
                    return value;
                }
            }
            return null;
        };

        const nameValue = getDetailValue([
            'name',
            'organizationName',
            'entityName',
            'participantName'
        ]);

        const wardNameValue = getDetailValue([
            'wardName',
            'ward',
            'wardNo',
            'wardNumber'
        ]);

        const normalizedCategoryTypeKey = (participant.category || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '');

        const typeValue = getDetailValue([
            ...TYPE_DETAIL_KEYS,
            ...(normalizedCategoryTypeKey ? [`${normalizedCategoryTypeKey}Type`] : [])
        ]);

        const hasAnyDetail = nameValue !== null || wardNameValue !== null || typeValue !== null;

        const renderDetailRow = (label: string, value: ConvertibleValue | null, alwaysShow = false) => {
            if (!alwaysShow && (value === null || value === undefined || value === '')) {
                return null;
            }

            const displayValue =
                value === null || value === undefined || value === '' ? 'N/A' : String(value);

            return (
                <div style={{ marginBottom: '2px' }}>
                    <span style={{ fontWeight: 700 }}>{label}:</span> {displayValue}
                </div>
            );
        };

        const containerStyle = {
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            marginTop: '0.5rem'
        };

        if (!hasAnyDetail) {
            return (
                <div style={containerStyle}>
                    {renderDetailRow('Name', null, true)}
                    {renderDetailRow('Type', null, true)}
                    {renderDetailRow('Ward Name', null, true)}
                </div>
            );
        }

        return (
            <div style={containerStyle}>
                {renderDetailRow('Name', nameValue)}
                {renderDetailRow('Type', typeValue, true)}
                {renderDetailRow('Ward Name', wardNameValue)}
            </div>
        );
    };

    const filteredDeleted = deletedParticipants
        .filter(p => {
            if (!deletedSearch) return true;
            const s = deletedSearch.toLowerCase();
            return (
                (CATEGORY_LABELS[p.category] || p.category || '').toLowerCase().includes(s) ||
                (p.mobileNumber || '').toLowerCase().includes(s) ||
                (p.deletedBy || '').toLowerCase().includes(s)
            );
        })
        .sort((a, b) => {
            const aDate = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
            const bDate = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
            return deletedSortDir === 'asc' ? aDate - bDate : bDate - aDate;
        });

    return (
        <div className="participants-view">
            <header className="page-header-row" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 850, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                        Registered Participants
                    </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
                        Directory of all verified and approved competition participants.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {deletedParticipants.length > 0 && (
                        <button
                            onClick={() => setShowDeletedModal(true)}
                            className="btn btn-outline"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderColor: 'var(--error)', color: 'var(--error)' }}
                        >
                            <Trash2 size={15} />
                            <span style={{ fontWeight: 700 }}>Deleted</span>
                            <span style={{
                                backgroundColor: 'var(--error-soft)',
                                color: 'var(--error)',
                                padding: '1px 7px',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 800
                            }}>
                                {deletedParticipants.length}
                            </span>
                        </button>
                    )}
                    <button
                        onClick={fetchData}
                        className="btn btn-outline"
                        aria-label="Refresh participants"
                        style={{ padding: '0.75rem', height: 'fit-content' }}
                        disabled={loading}
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem',  alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem',marginBottom: '2rem' }}>
                    <div style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', padding: '8px', borderRadius: '8px' }}>
                        <Filter size={20} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', }}>Filter by Category:</span>
                </div>
                {/* <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setCategoryFilter('')}
                        className={`btn ${categoryFilter === '' ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                        All
                    </button>
                    {categoryFilters.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-outline'}`}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', textTransform: 'capitalize' }}
                        >
                            {CATEGORY_LABELS[cat] || CATEGORY_LABELS[cat.replace('_', ' ')] || cat}
                        </button>
                    ))}
                </div> */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>

    {/* Existing Category Buttons */}
    <button
        onClick={() => setCategoryFilter('')}
        className={`btn ${categoryFilter === '' ? 'btn-primary' : 'btn-outline'}`}
    >
        All
    </button>

    {categoryFilters.map(cat => (
        <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-outline'}`}
        >
            {CATEGORY_LABELS[cat] || cat}
        </button>
    ))}

    {/* ⭐ ADD THIS TYPE FILTER */}
{/* <select
  value={typeFilter}
  onChange={(e) => setTypeFilter(e.target.value)}
  className="btn btn-outline"
>
  <option value="">All Type</option>

  {(CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("school") && (
    <>
      <option value="Government">Government</option>
      <option value="Private">Private</option>
      <option value="Trust">Trust</option>
    </>
  )}

  {(CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("hospital") && (
    <>
      <option value="Government">Government</option>
      <option value="Private">Private</option>
      <option value="NGO">NGO</option>

    </>
  )}

  {(CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("office") && (
    <>
      <option value="Government">Government</option>
      <option value="Private">Private</option>
    </>
  )}
{(CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("hotel") && (
    <>
      <option value="Hotel">Hotel</option>
      <option value="Restaurant">Restaurant</option>
    </>
)}
  {(CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("citizen") && (
    <>
      <option value="NGO">NGO</option>
      <option value="Citizen Group">Citizen Group</option>
      <option value="Other">Other</option>
    </>
  )}
</select> */}
{showTypeFilter && (
<select
  value={typeFilter}
  onChange={(e) => setTypeFilter(e.target.value)}
  aria-label="Filter by type"
  className="btn btn-outline"
>
  <option value="">All Type</option>

  {(CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("school") && (
    <>
      <option value="Government">Government</option>
      <option value="Private">Private</option>
      <option value="Trust">Trust</option>
    </>
  )}

  {(CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("hospital") && (
    <>
      <option value="Government">Government</option>
      <option value="Private">Private</option>
      <option value="NGO">NGO</option>
    </>
  )}

  {(CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("office") && (
    <>
      <option value="Government">Government</option>
      <option value="Private">Private</option>
    </>
  )}

  {(CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("hotel") && (
    <>
      <option value="Hotel">Hotel</option>
      <option value="Restaurant">Restaurant</option>
    </>
  )}

  {(CATEGORY_LABELS[categoryFilter] || "")
    .toLowerCase()
    .includes("citizen") && (
    <>
      <option value="NGO">NGO</option>
      <option value="Citizen Group">Citizen Group</option>
      <option value="Other">Other</option>
    </>
  )}
</select>
)}
    {/* ⭐ ADD THIS ZONE FILTER */}
  <select
    value={wardFilter}
    onChange={(e) => setWardFilter(e.target.value)}
    aria-label="Filter by ward"
    className="btn btn-outline"
>
    <option value="">All Wards</option>

    {wardOptions.map(ward => (
        <option key={ward} value={ward}>
            {ward}
        </option>
    ))}
</select>

</div>
            </div>
   
<div style={{
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginBottom: "10px"
}}>
    <button
        onClick={exportFullDetailExcel}
        className="btn btn-outline"
        style={{ fontWeight: 700 }}
    >
        Export Full Detail Excel
    </button>

    <button
        onClick={exportFullDetailPDF}
        className="btn btn-primary"
        style={{ fontWeight: 700 }}
    >
        Export Full Detail PDF
    </button>
</div>
<div
  className="card"
  style={{
    padding: 0,
    overflow: "hidden",
    borderRadius: "14px",
    border: "1px solid #e5e7eb"
  }}
>                {loading ? (
                    <div style={{ textAlign: 'center', padding: '6rem 0' }}>
                        <RefreshCw size={40} style={{ margin: '0 auto 1.5rem', display: 'block', color: 'var(--primary)' }} className="animate-spin" />
                        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading participants...</p>
                    </div>
                ) : participants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '6rem 0' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Approved Participants Found</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Try changing the category filter or check back later.</p>
                    </div>
                ) : (
                    <div className="table-container participants-table" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Category & Contact</th>
                                    <th>Key Details</th>
                                    <th>Assignment Status</th>
                                    <th>Date Joined</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentParticipants.map((p) => (
                                    <tr key={p.id} className="participants-row">
                                        <td>
                                            <div className="participant-card">
                                                <span
                                                    className="participant-category-badge"
                                                    style={{
                                                        backgroundColor: `${getCategoryMeta(p.category).color}15`,
                                                        color: getCategoryMeta(p.category).color
                                                    }}
                                                >
                                                    {CATEGORY_LABELS[p.category] || getCategoryMeta(p.category).label}
                                                </span>
                                                <div className="participant-meta">
                                                    <div className="meta-line">
                                                        <span className="meta-label">Participant ID:</span>
                                                        <button className="participant-id-link" onClick={() => navigate(`/participants/${p.id}/assessments`)}>
                                                            {formatParticipantDisplayId(p.id, p.category)}
                                                        </button>
                                                    </div>
                                                    <div className="meta-line">
                                                        <span className="meta-label">Contact:</span>
                                                        <span>{p.category === 'citizen_puraskar' ? (p.details?.phoneNumber || p.mobileNumber) : p.mobileNumber}</span>
                                                    </div>
                                                    {p.category === 'citizen_puraskar' && (
                                                        <div className="meta-line">
                                                            <span className="meta-label">Name:</span>
                                                            <span>{p.details?.name || 'N/A'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>{renderDetails(p)}</td>
                                        <td>
                                            {(() => {
                                                const assignmentSummary = getAssignmentProgressSummary(p.assignmentStats);
                                                const sa = p.selfAssessment;
                                                const saColors: Record<string, { bg: string; color: string }> = {
                                                    Submitted: { bg: '#fff7e6', color: '#d97706' },
                                                    Approved:  { bg: '#e6f9f0', color: '#16a34a' },
                                                    Rejected:  { bg: '#fef2f2', color: '#dc2626' },
                                                };
                                                const saStyle = sa ? (saColors[sa.status] || { bg: '#f3f4f6', color: '#374151' }) : null;
                                                return (
                                                    <div className="assignment-status-card">
                                                        <div className="meta-line">
                                                            <span className="meta-label">Assessor:</span>
                                                            <span>{p.assignedTo ? `${p.assignedTo.name}` : 'Not Assigned'}</span>
                                                        </div>
                                                        <div className="meta-line">
                                                            <span className="meta-label">Field:</span>
                                                            <span>{assignmentSummary.label}</span>
                                                        </div>
                                                        {assignmentSummary.total > 0 && (
                                                            <div className="assignment-progress">
                                                                <div
                                                                    className="assignment-progress-bar"
                                                                    style={{ width: `${assignmentSummary.percent}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="meta-line" style={{ marginTop: '0.35rem' }}>
                                                            <span className="meta-label">Self:</span>
                                                            {sa ? (
                                                                <span style={{
                                                                    background: saStyle!.bg,
                                                                    color: saStyle!.color,
                                                                    borderRadius: '999px',
                                                                    padding: '1px 8px',
                                                                    fontSize: '0.72rem',
                                                                    fontWeight: 700,
                                                                }}>
                                                                    {sa.status === 'Submitted' ? 'Pending Review' : sa.status}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Not Started</span>
                                                            )}
                                                        </div>
                                                        <div className="assignment-actions">
                                                    <button
                                                        onClick={() => openAssignmentModal(p)}
                                                        className="text-link"
                                                        disabled={!canWriteParticipants}
                                                        style={{ cursor: canWriteParticipants ? 'pointer' : 'not-allowed', opacity: canWriteParticipants ? 1 : 0.5 }}
                                                    >
                                                        Manage
                                                    </button>
                                                    {p.assignedTo && (
                                                        <button
                                                            onClick={() => handleUnassign(p.id)}
                                                            className="text-link danger"
                                                            disabled={actionLoading || !canWriteParticipants}
                                                        >
                                                            Unassign
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                                );
                                            })()}
                                        </td>
                                        <td style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                            {new Date(p.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                       <td style={{ textAlign: "right" }}>
  <div
    style={{
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px"
    }}
  >
   <button
  onClick={() => setSelectedParticipant(p)}
  className="actionIcon viewIcon"
  aria-label="View participant details"
>
  <Eye size={18} />
</button>
<button
  onClick={() => handleDelete(p.id)}
  disabled={deletingParticipantId === p.id || !canWriteParticipants}
  className="actionIcon deleteIcon"
  aria-label="Delete participant"
>
  <Trash2 size={18} />
</button>
<button
  onClick={() => openAssignmentModal(p)}
  disabled={!canWriteParticipants}
  className="actionIcon assignIcon"
  aria-label="Assign accessor"
>
  <UserPlus size={18} />
</button>
  </div>
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
    borderTop: "1px solid #e5e7eb",
    marginTop: "8px"
  }}
>
  {/* LEFT */}
 <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "10px",
    whiteSpace: "nowrap"   // ⭐ important
  }}
>
  <span style={{ fontWeight: 600 }}>Rows per page</span>

  <select
    value={rowsPerPage}
    aria-label="Rows per page"
    onChange={(e) => {
      setRowsPerPage(Number(e.target.value));
      setCurrentPage(1);
    }}
    style={{
      padding: "5px 8px",
      borderRadius: "6px",
      border: "1px solid #d1d5db"
    }}
  >
    <option value={10}>10</option>
    <option value={25}>25</option>
    <option value={50}>50</option>
  </select>

  <span style={{ fontWeight: 500 }}>
    {startRecord}-{endRecord} of {participants.length}
  </span>
</div>

  {/* RIGHT */}
  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
    
    <span style={{ fontWeight: 600, color: "#374151" }}>
      Page {currentPage} of {totalPages}
    </span>

    <button
      onClick={() => setCurrentPage((p) => p - 1)}
      disabled={currentPage === 1}
      style={{
        height: 36,
        width: 36,
        borderRadius: "8px",
        border: "1px solid #d1d5db",
        background: currentPage === 1 ? "#f3f4f6" : "white",
        cursor: currentPage === 1 ? "not-allowed" : "pointer",
        fontSize: 18,
        fontWeight: 700
      }}
    >
      ‹
    </button>

    <button
      onClick={() => setCurrentPage((p) => p + 1)}
      disabled={currentPage === totalPages}
      style={{
        height: 36,
        width: 36,
        borderRadius: "8px",
        border: "1px solid #d1d5db",
        background: currentPage === totalPages ? "#f3f4f6" : "white",
        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
        fontSize: 18,
        fontWeight: 700
      }}
    >
      ›
    </button>

  </div>
</div>
                    </div>
                    
                )}
            </div>
{/* Deleted Records Modal */}
{showDeletedModal && (
    <div style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.7)',
        backdropFilter: 'blur(6px)', zIndex: 1200, display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: '2rem 1rem', overflowY: 'auto'
    }} onClick={e => { if (e.target === e.currentTarget) setShowDeletedModal(false); }}>
        <div className="card" style={{
            width: '100%', maxWidth: '920px', padding: 0, overflow: 'hidden',
            boxShadow: 'var(--shadow-premium)', border: '1px solid var(--border)',
            marginBottom: '2rem'
        }}>
            {/* Modal Header */}
            <div style={{
                padding: '1.5rem 2rem',
                background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 60%)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: '10px',
                        backgroundColor: 'var(--error-soft)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <Trash2 size={18} color="var(--error)" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                            Deleted Records
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0, marginTop: '1px' }}>
                            {deletedParticipants.length} participant{deletedParticipants.length !== 1 ? 's' : ''} removed from the active list
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowDeletedModal(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Search + Sort Bar */}
            <div style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border-light)', background: '#fcfdfe', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        placeholder="Search by category, mobile, or deleted by..."
                        value={deletedSearch}
                        onChange={e => setDeletedSearch(e.target.value)}
                        style={{ paddingLeft: '2.5rem', padding: '0.6rem 1rem 0.6rem 2.5rem', fontSize: '0.875rem', width: '100%' }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Sort by date:</span>
                    <button
                        onClick={() => setDeletedSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                        className="btn btn-outline"
                        style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}
                    >
                        {deletedSortDir === 'desc' ? 'Newest first ↓' : 'Oldest first ↑'}
                    </button>
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {filteredDeleted.length} result{filteredDeleted.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Table */}
            <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                {filteredDeleted.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '12px', backgroundColor: 'var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <Trash2 size={22} color="var(--text-muted)" />
                        </div>
                        <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                            {deletedSearch ? 'No matching records' : 'No deleted participants'}
                        </p>
                        <p style={{ fontSize: '0.875rem' }}>
                            {deletedSearch ? 'Try a different search term.' : 'Deleted participants will appear here.'}
                        </p>
                    </div>
                ) : (
                    <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Mobile</th>
                                    <th>Deleted By</th>
                                    <th>Deleted At</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDeleted.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <span className="badge badge-pending" style={{ textTransform: 'none', fontSize: '0.8125rem' }}>
                                                {CATEGORY_LABELS[p.category] || p.category}
                                            </span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.875rem', letterSpacing: '0.02em' }}>{p.mobileNumber}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{p.deletedBy || '—'}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                            {p.deletedAt ? new Date(p.deletedAt).toLocaleString() : '—'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleRestore(p.id)}
                                                className="btn btn-outline"
                                                disabled={!canWriteParticipants}
                                                style={{ padding: '0.45rem 0.875rem', fontSize: '0.8125rem', borderColor: 'var(--success)', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                            >
                                                <UserMinus size={13} /> Restore
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-light)', background: '#fcfdfe', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowDeletedModal(false)} className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
                    Close
                </button>
            </div>
        </div>
    </div>
)}
            {selectedParticipant && (
                <ParticipantDetailDrawer
                    participant={selectedParticipant}
                    onClose={() => setSelectedParticipant(null)}
                    onDelete={handleDelete}
                    onManageAssignment={(participant) => {
                        setSelectedParticipant(null);
                        openAssignmentModal(participant);
                    }}
                    canWriteParticipants={canWriteParticipants}
                    onSave={handleParticipantUpdated}
                    assignmentSummary={selectedAssignmentSummary}
                    currentUserName={currentUser?.name}
                />
            )}

            {/* Assignment Modal */}
            {assigningTo && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '1rem'
                }}>
                    <div className="card shadow-premium" style={{ width: '100%', maxWidth: '500px', position: 'relative', border: 'none', padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem 2rem', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Assign Accessor</h2>
                            <button onClick={resetAssignmentModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '2rem' }}>
                            <p style={{ marginBottom: '1.5rem', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                                Assign <strong>{assigningTo.category}</strong> (ID: {formatParticipantDisplayId(assigningTo.id, assigningTo.category)}) to an authorized accessor for verification.
                            </p>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                                    Number of Assessments
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={assignmentCount}
                                    onChange={(e) => setAssignmentCount(Math.max(1, Math.floor(Number(e.target.value) || 0)))}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '10px' }}
                                />
                                <small style={{ display: 'block', marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
                                    Default is 6. Existing progress: {assigningAssignmentSummary.label}
                                </small>
                                {assignmentError && (
                                    <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.35rem' }}>{assignmentError}</div>
                                )}
                            </div>

                            <div tabIndex={0} style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                {accessors.length === 0 ? (
                                    <p style={{ textAlign: 'center', padding: '1rem', fontStyle: 'italic' }}>No approved accessors found.</p>
                                ) : (
                                    accessors.map(u => (
                                            <button
                                                key={u.id}
                                                onClick={() => handleAssign(u.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '1rem',
                                                borderRadius: '12px',
                                                border: assigningTo.assignedTo?.id === u.id ? '2px solid var(--success)' : '1px solid var(--border)',
                                                backgroundColor: assigningTo.assignedTo?.id === u.id ? 'var(--success-soft)' : 'white',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                            disabled={actionLoading}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{u.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{u.accessorType || 'Standard Accessor'}</div>
                                            </div>
                                            {assigningTo.assignedTo?.id === u.id && <Check size={20} color="var(--success)" />}
                                        </button>
                                    ))
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={resetAssignmentModal} className="btn btn-outline" style={{ flex: 1, padding: '1rem' }}>Cancel</button>
                                {assigningTo.assignedTo && (
                                    <button
                                        onClick={() => handleUnassign(assigningTo.id)}
                                        className="btn btn-outline"
                                        style={{ flex: 1, padding: '1rem', borderColor: 'var(--error)', color: 'var(--error)' }}
                                        disabled={actionLoading || !canWriteParticipants}
                                    >
                                        <UserMinus size={18} style={{ marginRight: '0.5rem' }} />
                                        Unassign
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParticipantsList;
