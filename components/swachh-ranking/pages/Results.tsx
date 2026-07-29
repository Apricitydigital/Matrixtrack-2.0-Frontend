// import React, { useEffect, useState } from 'react';
// import api from '../api/axios';
// import {
//     Trophy,
//     Search,
//     Filter,
//     RefreshCw,
//     Building,
//     Award,
//     MapPin,
//     Calendar,
//     X,
//     FileText,
//     Clock,
//     CheckCircle2,
//     ShieldCheck
// } from 'lucide-react';

// interface AssessmentResult {
//     id: string;
//     totalScore: number;
//     maxScore: number;
//     status: string;
//     createdAt: string;
//     participant: {
//         id: string;
//         category: string;
//         details: any;
//     };
//     responses: any[];
//     assessor: {
//         name: string;
//     };
// }

// const Results = () => {
//     const [results, setResults] = useState<AssessmentResult[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [categoryFilter, setCategoryFilter] = useState('');
//     const [selectedResult, setSelectedResult] = useState<AssessmentResult | null>(null);

//     const fetchResults = async () => {
//         setLoading(true);
//         try {
//             const token = localStorage.getItem('token');
//             const response = await api.get('/assessments/all-completed', {
//                 headers: { Authorization: `Bearer ${token}` }
//             });
//             // Show only published or completed - user said "submitted", let's show all that are completed
//             setResults(response.data);
//         } catch (err) {
//             console.error('Failed to fetch results');
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchResults();
//     }, []);

//     const getParticipantName = (p: any) => {
//         if (!p) return 'Unknown Entity';
//         return p.details?.name || p.details?.schoolName || p.details?.hospitalName || p.details?.officeName || p.details?.marketName || 'Unnamed Participant';
//     };

//     const filteredResults = results
//         .filter(r => {
//             const participantName = getParticipantName(r.participant).toLowerCase();
//             const search = searchTerm.toLowerCase();
//             const matchesSearch = participantName.includes(search);
//             const matchesCategory = categoryFilter ? r.participant?.category === categoryFilter : true;
//             return matchesSearch && matchesCategory;
//         })
//         .sort((a, b) => effectiveScore(b) - effectiveScore(a)); // Sort by highest score first

//     return (
//         <div className="results-view" style={{ padding: '1rem' }}>
//             <header style={{ marginBottom: '3rem' }}>
//                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
//                     <div>
//                         <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>
//                             Final Rankings & Results
//                         </h1>
//                         <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', fontWeight: 500 }}>
//                             Official performance scores and sanctioned rankings for the city.
//                         </p>
//                     </div>
//                 </div>
//             </header>

//             {/* Stats Overview */}
//             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
//                 <div className="card shadow-premium" style={{ padding: '1.5rem', border: 'none', backgroundColor: 'var(--primary-soft)' }}>
//                     <div style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}><Trophy size={28} /></div>
//                     <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>City Champion</div>
//                     <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
//                         {results.length > 0 ? getParticipantName(results.sort((a, b) => b.totalScore - a.totalScore)[0].participant) : 'N/A'}
//                     </div>
//                 </div>

//                 <div className="card shadow-premium" style={{ padding: '1.5rem', border: 'none', backgroundColor: 'var(--swachh-green-soft)' }}>
//                     <div style={{ color: 'var(--swachh-green)', marginBottom: '0.75rem' }}><ShieldCheck size={28} /></div>
//                     <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--swachh-green)', textTransform: 'uppercase' }}>Published Results</div>
//                     <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
//                         {results.filter(r => r.status === 'published').length}
//                     </div>
//                 </div>

//                 <div className="card shadow-premium" style={{ padding: '1.5rem', border: 'none', backgroundColor: 'var(--warning-soft)' }}>
//                     <div style={{ color: 'var(--warning)', marginBottom: '0.75rem' }}><RefreshCw size={28} /></div>
//                     <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase' }}>Average Score</div>
//                     <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
//                         {results.length > 0 ? (results.reduce((s, r) => s + effectiveScore(r), 0) / results.length).toFixed(1) : '0'}
//                     </div>
//                 </div>

//                 <div className="card shadow-premium" style={{ padding: '1.5rem', border: 'none', backgroundColor: '#f0f2f5' }}>
//                     <div style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }}><Building size={28} /></div>
//                     <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Entities</div>
//                     <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
//                         {results.length}
//                     </div>
//                 </div>
//             </div>

//             <div className="card shadow-lg" style={{ marginBottom: '2rem', padding: '1.5rem', border: 'none' }}>
//                 <div style={{ display: 'flex', gap: '1.25rem' }}>
//                     <div style={{ flex: 1, position: 'relative' }}>
//                         <Search style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
//                         <input
//                             type="text"
//                             placeholder="Find an entity result..."
//                             value={searchTerm}
//                             onChange={(e) => setSearchTerm(e.target.value)}
//                             style={{ paddingLeft: '3.5rem', height: '52px', fontWeight: 500 }}
//                         />
//                     </div>
//                     <select
//                         value={categoryFilter}
//                         onChange={(e) => setCategoryFilter(e.target.value)}
//                         style={{ width: '220px', height: '52px', fontWeight: 600 }}
//                     >
//                         <option value="">All Categories</option>
//                         <option value="wards">Wards</option>
//                         <option value="schools">Schools</option>
//                         <option value="hospitals">Hospitals</option>
//                         <option value="offices">Offices</option>
//                         <option value="markets">Markets</option>
//                         <option value="societies - bwg">Societies - BWG</option>
//                         <option value="hotels">Hotels</option>
//                     </select>
//                 </div>
//             </div>

//             <div className="card shadow-premium" style={{ border: 'none', overflow: 'hidden' }}>
//                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                     <thead>
//                         <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
//                             <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Rank</th>
//                             <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Entity</th>
//                             <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Location</th>
//                             <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Performance</th>
//                             <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Status</th>
//                             <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Certificate</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {filteredResults.map((res, idx) => (
//                             <tr key={res.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }} className="table-row-hover">
//                                 <td style={{ padding: '1.5rem' }}>
//                                     <div style={{
//                                         width: '32px',
//                                         height: '32px',
//                                         borderRadius: '50%',
//                                         backgroundColor: idx < 3 ? 'var(--primary-soft)' : '#f0f2f5',
//                                         color: idx < 3 ? 'var(--primary)' : 'var(--text-muted)',
//                                         display: 'flex',
//                                         alignItems: 'center',
//                                         justifyContent: 'center',
//                                         fontWeight: 900,
//                                         fontSize: '0.875rem'
//                                     }}>
//                                         #{idx + 1}
//                                     </div>
//                                 </td>
//                                 <td style={{ padding: '1.5rem', cursor: 'pointer' }} onClick={() => setSelectedResult(res)}>
//                                     <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{getParticipantName(res.participant)}</div>
//                                     <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{res.participant.category}</div>
//                                 </td>
//                                 <td style={{ padding: '1.5rem' }}>
//                                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
//                                         <MapPin size={14} style={{ color: 'var(--swachh-green)' }} />
//                                         {res.participant.details?.zone || 'Global'} {res.participant.details?.ward ? `| ${res.participant.details.ward}` : ''}
//                                     </div>
//                                 </td>
//                                 <td style={{ padding: '1.5rem' }}>
//                                     <div style={{ fontSize: '1.125rem', fontWeight: 900, color: 'var(--text-primary)' }}>
//                                         {res.totalScore} <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}> / {res.maxScore}</span>
//                                     </div>
//                                     <div style={{ width: '100px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
//                                         <div style={{
//                                             width: `${(res.totalScore / res.maxScore) * 100}%`,
//                                             height: '100%',
//                                             backgroundColor: (res.totalScore / res.maxScore) > 0.7 ? 'var(--swachh-green)' : (res.totalScore / res.maxScore) > 0.4 ? 'var(--warning)' : 'var(--error)'
//                                         }}></div>
//                                     </div>
//                                 </td>
//                                 <td style={{ padding: '1.5rem' }}>
//                                     <span style={{
//                                         padding: '4px 12px',
//                                         borderRadius: '20px',
//                                         fontSize: '0.65rem',
//                                         fontWeight: 900,
//                                         textTransform: 'uppercase',
//                                         backgroundColor: res.status === 'published' ? 'var(--swachh-green-soft)' : '#f0f2f5',
//                                         color: res.status === 'published' ? 'var(--swachh-green)' : 'var(--text-muted)'
//                                     }}>
//                                         {res.status}
//                                     </span>
//                                 </td>
//                                 <td style={{ padding: '1.5rem', textAlign: 'right' }}>
//                                     {res.status === 'published' ? (
//                                         <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', gap: '0.5rem' }}>
//                                             <Award size={16} />
//                                             View Certificate
//                                         </button>
//                                     ) : (
//                                         <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pending Clearance</span>
//                                     )}
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//                 {loading && (
//                     <div style={{ padding: '4rem', textAlign: 'center' }}>
//                         <RefreshCw className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto' }} size={32} />
//                         <p style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Calculating city rankings...</p>
//                     </div>
//                 )}
//             </div>

//             {/* Result Details Modal */}
//             {selectedResult && (
//                 <div style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     backgroundColor: 'rgba(0,0,0,0.7)',
//                     backdropFilter: 'blur(10px)',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     zIndex: 2000,
//                     padding: '2rem'
//                 }}>
//                     <div className="card shadow-premium" style={{
//                         width: '100%',
//                         maxWidth: '850px',
//                         maxHeight: '90vh',
//                         padding: 0,
//                         overflow: 'hidden',
//                         border: 'none',
//                         display: 'flex',
//                         flexDirection: 'column'
//                     }}>
//                         {/* Modal Header */}
//                         <div style={{
//                             padding: '1.5rem 2rem',
//                             backgroundColor: 'white',
//                             borderBottom: '1px solid var(--border-light)',
//                             display: 'flex',
//                             justifyContent: 'space-between',
//                             alignItems: 'center'
//                         }}>
//                             <div>
//                                 <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>Performance Breakdown</h2>
//                                 <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
//                                     Ref ID: {selectedResult.id.split('-')[0].toUpperCase()}
//                                 </p>
//                             </div>
//                             <button
//                                 onClick={() => setSelectedResult(null)}
//                                 style={{ background: 'var(--primary-soft)', border: 'none', padding: '0.5rem', borderRadius: '10px', cursor: 'pointer', color: 'var(--primary)' }}
//                             >
//                                 <X size={20} />
//                             </button>
//                         </div>

//                         {/* Modal Content */}
//                         <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, backgroundColor: '#fcfdfe' }}>
//                             {/* Summary Cards */}
//                             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
//                                 <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
//                                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>
//                                         <Building size={18} />
//                                         <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Participant</span>
//                                     </div>
//                                     <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{getParticipantName(selectedResult.participant)}</div>
//                                     <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{selectedResult.participant?.category}</div>
//                                 </div>

//                                 <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
//                                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--swachh-green)' }}>
//                                         <CheckCircle2 size={18} />
//                                         <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Final Score</span>
//                                     </div>
//                                     <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '1.5rem' }}>
//                                         {selectedResult.totalScore} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>/ {selectedResult.maxScore}</span>
//                                     </div>
//                                 </div>

//                                 <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
//                                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
//                                         <Clock size={18} />
//                                         <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Assessment Date</span>
//                                     </div>
//                                     <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
//                                         {new Date(selectedResult.createdAt).toLocaleDateString()}
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Response Breakdown */}
//                             <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
//                                 <FileText size={20} style={{ color: 'var(--primary)' }} />
//                                 Detailed Questionnaire Responses
//                             </h3>

//                             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
//                                 {selectedResult.responses.map((resp, idx) => (
//                                     <div key={idx} style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
//                                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
//                                             <div style={{ flex: 1, paddingRight: '2rem' }}>
//                                                 <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Question {idx + 1}</div>
//                                                 <div style={{ fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>{resp.questionText || 'Assessment Parameter'}</div>
//                                             </div>
//                                             <div style={{ textAlign: 'right' }}>
//                                                 <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Marks</div>
//                                                 <div style={{ fontWeight: 900, color: resp.obtainedMarks > 0 ? 'var(--success)' : 'var(--text-muted)', fontSize: '1.125rem' }}>
//                                                     {resp.obtainedMarks}
//                                                 </div>
//                                             </div>
//                                         </div>

//                                         {resp.text && (
//                                             <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #edf2f7' }}>
//                                                 <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Response Value</div>
//                                                 <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{resp.text}</div>
//                                             </div>
//                                         )}
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>

//                         {/* Modal Footer */}
//                         <div style={{ padding: '1.5rem 2rem', backgroundColor: 'white', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
//                             <button
//                                 onClick={() => setSelectedResult(null)}
//                                 className="btn btn-outline"
//                                 style={{ padding: '0.75rem 2rem' }}
//                             >
//                                 Close Scorecard
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Results;

import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import {
    Trophy, Search, RefreshCw, Building, Award,
    MapPin, X, FileText, Clock, CheckCircle2, ShieldCheck
} from 'lucide-react';
import NoAccess from '../components/NoAccess';
import { hasPermission } from '../utils/accessControl';

interface AssessmentResult {
    id: string;
    totalScore: number;
    maxScore: number;
    finalScore?: number | null;
    finalScoreSource?: string | null;
    status: string;
    createdAt: string;
    participant: { id: string; category: string; details: any; };
    responses: any[];
    assessor: { name: string; };
}

const effectiveScore = (r: AssessmentResult) => r.finalScore ?? r.totalScore;

const Results = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const canViewReports = hasPermission(currentUser?.permissions, 'reports', 'view');

    if (!currentUser || !canViewReports) {
        return <NoAccess title="Results" message="You do not have permission to view results." />;
    }
    const [results, setResults] = useState<AssessmentResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [selectedResult, setSelectedResult] = useState<AssessmentResult | null>(null);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/assessments/all-completed', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResults(response.data);
        } catch (err) {
            console.error('Failed to fetch results');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchResults(); }, []);

    const getParticipantName = (p: any) => {
        if (!p) return 'Unknown Entity';
        return p.details?.name || p.details?.schoolName || p.details?.hospitalName ||
            p.details?.officeName || p.details?.marketName || 'Unnamed Participant';
    };

    const filteredResults = results
        .filter(r => {
            const name = getParticipantName(r.participant).toLowerCase();
            const matchesSearch = name.includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter ? r.participant?.category === categoryFilter : true;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => effectiveScore(b) - effectiveScore(a));

    return (
        <div style={{ padding: '0.5rem' }}>

            {/* ── Header ── */}
            <header className="page-header-row" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>
                        Final Rankings & Results
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
                        Official performance scores and sanctioned rankings for the city.
                    </p>
                </div>
            </header>

            {/* ── Stats — 4 col → 2 col → 1 col ── */}
            <div className="results-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="card shadow-premium" style={{ padding: '1.25rem', border: 'none', backgroundColor: 'var(--primary-soft)' }}>
                    <div style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}><Trophy size={26} /></div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3730a3', textTransform: 'uppercase' }}>City Champion</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.2rem', wordBreak: 'break-word' }}>
                        {results.length > 0 ? getParticipantName([...results].sort((a, b) => effectiveScore(b) - effectiveScore(a))[0].participant) : 'N/A'}
                    </div>
                </div>
                <div className="card shadow-premium" style={{ padding: '1.25rem', border: 'none', backgroundColor: 'var(--swachh-green-soft)' }}>
                    <div style={{ color: 'var(--swachh-green)', marginBottom: '0.5rem' }}><ShieldCheck size={26} /></div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--swachh-green)', textTransform: 'uppercase' }}>Published</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                        {results.filter(r => r.status === 'published').length}
                    </div>
                </div>
                <div className="card shadow-premium" style={{ padding: '1.25rem', border: 'none', backgroundColor: 'var(--warning-soft)' }}>
                    <div style={{ color: 'var(--warning)', marginBottom: '0.5rem' }}><RefreshCw size={26} /></div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>Avg Score</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                        {results.length > 0 ? (results.reduce((s, r) => s + effectiveScore(r), 0) / results.length).toFixed(1) : '0'}
                    </div>
                </div>
                <div className="card shadow-premium" style={{ padding: '1.25rem', border: 'none', backgroundColor: '#f0f2f5' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}><Building size={26} /></div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Entities</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.2rem' }}>{results.length}</div>
                </div>
            </div>

            {/* ── Search + Filter ── */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', border: 'none', boxShadow: 'var(--shadow-md)' }}>
                <div className="results-filter-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
                        <input
                            type="text"
                            placeholder="Find an entity result..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '3rem', height: '48px', fontWeight: 500 }}
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        aria-label="Filter by category"
                        style={{ width: '200px', height: '48px', fontWeight: 600, minWidth: '140px' }}
                    >
                        <option value="">All Categories</option>
                        <option value="wards">Wards</option>
                        <option value="schools">Schools</option>
                        <option value="hospitals">Hospitals</option>
                        <option value="offices">Offices</option>
                        <option value="markets">Markets</option>
                        <option value="societies - bwg">Societies - BWG</option>
                        <option value="hotels">Hotels</option>
                    </select>
                </div>
            </div>

            {/* ── Results Table — scrollable on mobile ── */}
            <div className="card shadow-premium" style={{ border: 'none', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                                {['Rank', 'Entity', 'Location', 'Performance', 'Status', 'Certificate'].map((h, i) => (
                                    <th key={h} style={{ padding: '1rem 1.25rem', textAlign: i === 5 ? 'right' : 'left', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults.map((res, idx) => (
                                <tr key={res.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }} className="hover-light">
                                    <td style={{ padding: '1.25rem' }}>
                                        <div style={{
                                            width: '30px', height: '30px', borderRadius: '50%',
                                            backgroundColor: idx < 3 ? 'var(--primary-soft)' : '#f0f2f5',
                                            color: idx < 3 ? '#3730a3' : 'var(--text-secondary)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 900, fontSize: '0.8rem'
                                        }}>#{idx + 1}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => setSelectedResult(res)}>
                                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{getParticipantName(res.participant)}</div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{res.participant.category}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            <MapPin size={13} style={{ color: 'var(--swachh-green)', flexShrink: 0 }} />
                                            {res.participant.details?.zone || 'Global'}{res.participant.details?.ward ? ` | ${res.participant.details.ward}` : ''}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                            {effectiveScore(res)} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>/ {res.maxScore}</span>
                                        </div>
                                        <div style={{ width: '90px', height: '5px', backgroundColor: '#e2e8f0', borderRadius: '3px', marginTop: '0.4rem', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${(effectiveScore(res) / res.maxScore) * 100}%`,
                                                height: '100%',
                                                backgroundColor: (effectiveScore(res) / res.maxScore) > 0.7 ? 'var(--swachh-green)' : (effectiveScore(res) / res.maxScore) > 0.4 ? 'var(--warning)' : 'var(--error)'
                                            }} />
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem' }}>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: '20px', fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', whiteSpace: 'nowrap',
                                            backgroundColor: res.status === 'published' ? 'var(--swachh-green-soft)' : '#f0f2f5',
                                            color: res.status === 'published' ? 'var(--swachh-green)' : 'var(--text-secondary)'
                                        }}>{res.status}</span>
                                    </td>
                                    <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                                        {res.status === 'published' ? (
                                            <button className="btn btn-outline" style={{ padding: '0.4rem 0.875rem', fontSize: '0.72rem', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                                                <Award size={14} /> Certificate
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Pending</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {loading && (
                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                        <RefreshCw className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto' }} size={32} />
                        <p style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Calculating city rankings...</p>
                    </div>
                )}
            </div>

            {/* ── Modal ── */}
            {selectedResult && (
                <div
                    onClick={(e) => { if (e.target === e.currentTarget) setSelectedResult(null); }}
                    style={{
                        position: 'fixed', inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 2000, padding: '1rem'
                    }}
                >
                    <div className="card shadow-premium" style={{
                        width: '100%', maxWidth: '850px', maxHeight: '90vh',
                        padding: 0, overflow: 'hidden', border: 'none',
                        display: 'flex', flexDirection: 'column', borderRadius: '24px'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem', backgroundColor: 'white',
                            borderBottom: '1px solid var(--border-light)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>Performance Breakdown</h2>
                                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    Ref: {selectedResult.id.split('-')[0].toUpperCase()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedResult(null)}
                                aria-label="Close result details"
                                style={{ background: 'var(--primary-soft)', border: 'none', padding: '0.5rem', borderRadius: '10px', cursor: 'pointer', color: '#3730a3', flexShrink: 0 }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#fcfdfe' }}>

                            {/* Summary cards — 3 col → 1 col */}
                            <div className="modal-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#3730a3' }}>
                                        <Building size={16} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Participant</span>
                                    </div>
                                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.95rem', wordBreak: 'break-word' }}>{getParticipantName(selectedResult.participant)}</div>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{selectedResult.participant?.category}</div>
                                </div>
                                <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--swachh-green)' }}>
                                        <CheckCircle2 size={16} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Final Score</span>
                                    </div>
                                    <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '1.5rem' }}>
                                        {effectiveScore(selectedResult)} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>/ {selectedResult.maxScore}</span>
                                    </div>
                                    {selectedResult.finalScoreSource && (
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                            Source: {selectedResult.finalScoreSource === 'QC' ? 'QC Reviewed' : 'Self Assessment'}
                                        </div>
                                    )}
                                </div>
                                <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                        <Clock size={16} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Date</span>
                                    </div>
                                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                                        {new Date(selectedResult.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            {/* Responses */}
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={18} style={{ color: 'var(--primary)' }} /> Detailed Responses
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                {selectedResult.responses.map((resp, idx) => (
                                    <div key={idx} style={{ padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: resp.text ? '0.75rem' : 0 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Q{idx + 1}</div>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5, fontSize: '0.9rem' }}>{resp.questionText || 'Assessment Parameter'}</div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Marks</div>
                                                <div style={{ fontWeight: 900, color: resp.obtainedMarks > 0 ? 'var(--success)' : 'var(--text-secondary)', fontSize: '1.1rem' }}>
                                                    {resp.obtainedMarks}
                                                </div>
                                            </div>
                                        </div>
                                        {resp.text && (
                                            <div style={{ padding: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #edf2f7' }}>
                                                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Response</div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{resp.text}</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: '1.25rem 1.5rem', backgroundColor: 'white', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setSelectedResult(null)} className="btn btn-outline" style={{ padding: '0.75rem 2rem' }}>
                                Close Scorecard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Results;