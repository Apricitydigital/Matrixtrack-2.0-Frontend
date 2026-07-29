// import React, { useState, useEffect } from 'react';
// import api from '../api/axios';
// import { ClipboardList, PlusCircle, Save, Trash2, ArrowRight, Layout, CheckCircle2, Image as ImageIcon } from 'lucide-react';

// interface Question {
//     text: string;
//     marks: number;
//     imageCount: number;
// }

// const CATEGORIES = ['wards', 'schools', 'hospitals', 'offices', 'markets', 'societies - bwg', 'hotels'];

// const QuestionnaireManager = () => {
//     const [selectedCategory, setSelectedCategory] = useState('');
//     const [numQuestions, setNumQuestions] = useState(0);
//     const [questions, setQuestions] = useState<Question[]>([]);
//     const [loading, setLoading] = useState(false);
//     const [saving, setSaving] = useState(false);
//     const [successMessage, setSuccessMessage] = useState('');
//     const [allQuestionnaires, setAllQuestionnaires] = useState<any[]>([]);

//     // Fetch existing questionnaire when category changes
//     useEffect(() => {
//         fetchAllQuestionnaires();
//         if (selectedCategory) {
//             fetchQuestionnaire();
//         }
//     }, [selectedCategory]);

//     const fetchAllQuestionnaires = async () => {
//         const token = localStorage.getItem('token');
//         try {
//             const response = await api.get('/questionnaire', {
//                 headers: { Authorization: `Bearer ${token}` }
//             });
//             setAllQuestionnaires(response.data || []);
//         } catch (err) {
//             console.error('Failed to fetch all questionnaires');
//         }
//     };

//     const fetchQuestionnaire = async () => {
//         setLoading(true);
//         const token = localStorage.getItem('token');
//         try {
//             const response = await api.get(`/questionnaire/${selectedCategory}`, {
//                 headers: { Authorization: `Bearer ${token}` }
//             });
//             if (response.data) {
//                 // Map response to state, ensuring imageCount exists
//                 const fetchedQuestions = (response.data.questions || []).map((q: any) => ({
//                     text: q.text,
//                     marks: q.marks,
//                     imageCount: q.imageCount || 0
//                 }));
//                 setQuestions(fetchedQuestions);
//                 setNumQuestions(fetchedQuestions.length);
//             }
//         } catch (err: any) {
//             if (err.response?.status === 404) {
//                 // No questionnaire yet, reset
//                 setQuestions([]);
//                 setNumQuestions(0);
//             } else {
//                 console.error('Failed to fetch questionnaire');
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         const val = parseInt(e.target.value) || 0;
//         setNumQuestions(val);

//         // Adjust questions array
//         if (val > questions.length) {
//             const newQuestions = [...questions];
//             for (let i = questions.length; i < val; i++) {
//                 newQuestions.push({ text: '', marks: 0, imageCount: 0 });
//             }
//             setQuestions(newQuestions);
//         } else {
//             setQuestions(questions.slice(0, val));
//         }
//     };

//     const handleQuestionChange = (index: number, field: keyof Question, value: string | number) => {
//         const updated = [...questions];
//         updated[index] = { ...updated[index], [field]: value };
//         setQuestions(updated);
//     };

//     const removeQuestion = (index: number) => {
//         const updated = questions.filter((_, i) => i !== index);
//         setQuestions(updated);
//         setNumQuestions(updated.length);
//     };

//     const handleSave = async (silent = false) => {
//         if (!selectedCategory || questions.length === 0) return;

//         if (!silent) setSaving(true);
//         const token = localStorage.getItem('token');
//         try {
//             await api.post('/questionnaire/save', {
//                 category: selectedCategory,
//                 questions
//             }, {
//                 headers: { Authorization: `Bearer ${token}` }
//             });

//             if (!silent) {
//                 setSuccessMessage(`Assessment metrics for ${selectedCategory.toUpperCase()} saved successfully!`);
//                 setTimeout(() => setSuccessMessage(''), 3000);
//             }

//             // Re-fetch to confirm state matches backend
//             await fetchQuestionnaire();
//             await fetchAllQuestionnaires();
//         } catch (err: any) {
//             console.error('Failed to save questionnaire', err);
//             const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
//             alert(`Failed to save: ${errMsg}`);
//         } finally {
//             if (!silent) setSaving(false);
//         }
//     };

//     const addQuestion = () => {
//         setQuestions([...questions, { text: '', marks: 0, imageCount: 0 }]);
//         setNumQuestions(numQuestions + 1);
//     };

//     const handleEdit = (q: any) => {
//         setSelectedCategory(q.category);
//         // fetchQuestionnaire() will be triggered by useEffect
//     };

//     const handleRedeploy = async (q: any) => {
//         // This will save the currently loaded questionnaire for that category
//         // If the user hasn't modified it, it just re-saves the same data
//         const token = localStorage.getItem('token');
//         setSaving(true);
//         try {
//             await api.post('/questionnaire/save', {
//                 category: q.category,
//                 questions: q.questions.map((item: any) => ({
//                     text: item.text,
//                     marks: Number(item.marks),
//                     imageCount: Number(item.imageCount || 0)
//                 }))
//             }, {
//                 headers: { Authorization: `Bearer ${token}` }
//             });
//             setSuccessMessage(`Redeployment of ${q.category.toUpperCase()} successful!`);
//             await fetchAllQuestionnaires();
//             setTimeout(() => setSuccessMessage(''), 3000);
//         } catch (err: any) {
//             const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
//             alert(`Redeployment failed: ${errMsg}`);
//         } finally {
//             setSaving(false);
//         }
//     };

//     const handleDelete = async (id: string, category: string) => {
//         if (!window.confirm(`Are you sure you want to delete the questionnaire for ${category.toUpperCase()}? This will remove all associated metrics.`)) {
//             return;
//         }

//         const token = localStorage.getItem('token');
//         setSaving(true);
//         try {
//             await api.delete(`/questionnaire/${id}`, {
//                 headers: { Authorization: `Bearer ${token}` }
//             });
//             setSuccessMessage(`Questionnaire for ${category.toUpperCase()} deleted successfully.`);
//             await fetchAllQuestionnaires();
//             setTimeout(() => setSuccessMessage(''), 3000);
//         } catch (err: any) {
//             const errMsg = err.response?.data?.error || err.response?.data?.message || err.message;
//             alert(`Deletion failed: ${errMsg}`);
//         } finally {
//             setSaving(false);
//         }
//     };

//     return (
//         <div className="dashboard-content">
//             <header className="page-header-row" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
//                     <div>

//         <h1 style={{ fontSize: '2rem', fontWeight: 850, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
//                     Assessment Configuration
//                 </h1>
//         <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
//                     Define dynamic scoring parameters and evaluation metrics for different urban categories.
//                 </p></div>
//             </header>

//             <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '2.5rem', alignItems: 'start' }}>

//                 {/* Configuration Panel */}
//                 <div className="card shadow-premium" style={{ border: 'none', padding: '2.5rem' }}>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
//                         <div style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '12px' }}>
//                             <Layout size={24} />
//                         </div>
//                         <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Metric Settings</h3>
//                     </div>

//                     <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
//                         <div className="form-group">
//                             <label style={{ color: 'var(--swachh-green)', fontWeight: 700, fontSize: '0.875rem' }}>Evaluation Category</label>
//                             <select
//                                 value={selectedCategory}
//                                 onChange={(e) => setSelectedCategory(e.target.value)}
//                                 style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}
//                             >
//                                 <option value="">Select a Category</option>
//                                 {CATEGORIES.map(cat => (
//                                     <option key={cat} value={cat}>
//                                         {cat === 'societies - bwg' ? 'Societies - BWG' : cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
//                                     </option>
//                                 ))}
//                             </select>
//                         </div>

//                         <div className="form-group">
//                             <label style={{ color: 'var(--swachh-green)', fontWeight: 700, fontSize: '0.875rem' }}>Question Count</label>
//                             <input
//                                 type="number"
//                                 min="0"
//                                 max="50"
//                                 value={numQuestions}
//                                 onChange={handleNumQuestionsChange}
//                                 placeholder="E.g. 10"
//                                 style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}
//                             />
//                             <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>
//                                 Number of evaluation points to define for this category.
//                             </p>
//                         </div>

//                         <button
//                             onClick={() => handleSave()}
//                             disabled={saving || !selectedCategory || numQuestions === 0}
//                             className="btn btn-primary"
//                             style={{
//                                 marginTop: '1rem',
//                                 padding: '1.125rem',
//                                 display: 'flex',
//                                 alignItems: 'center',
//                                 justifyContent: 'center',
//                                 gap: '0.75rem',
//                                 backgroundColor: 'var(--swachh-green)',
//                                 border: 'none',
//                                 boxShadow: '0 8px 16px rgba(26, 77, 46, 0.2)'
//                             }}
//                         >
//                             {saving ? 'UPDATING SYSTEM...' : <><Save size={20} /> Deploy Questionnaire</>}
//                         </button>
//                     </div>
//                 </div>

//                 {/* Field Builder */}
//                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
//                     {successMessage && (
//                         <div style={{
//                             backgroundColor: 'var(--success-soft)',
//                             color: 'var(--success)',
//                             padding: '1.25rem',
//                             borderLeft: '4px solid var(--success)',
//                             borderRadius: '16px',
//                             display: 'flex',
//                             alignItems: 'center',
//                             gap: '1rem',
//                             fontWeight: 700,
//                             boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)',
//                             animation: 'slideUp 0.3s ease-out'
//                         }}>
//                             <CheckCircle2 size={24} />
//                             {successMessage}
//                         </div>
//                     )}

//                     {!selectedCategory ? (
//                         <div className="card shadow-premium" style={{
//                             border: '1px dashed var(--border)',
//                             padding: '6rem 3rem',
//                             textAlign: 'center',
//                             backgroundColor: 'white',
//                             opacity: 0.8
//                         }}>
//                             <ClipboardList size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', margin: '0 auto' }} />
//                             <h3 style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>Workspace Inactive</h3>
//                             <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Select a category to begin defining assessment metrics.</p>
//                         </div>
//                     ) : loading ? (
//                         <div className="card shadow-premium" style={{ padding: '6rem', textAlign: 'center' }}>
//                             <div className="spinner" style={{ margin: '0 auto' }}></div>
//                             <p style={{ marginTop: '2rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Syncing schema for {selectedCategory}...</p>
//                         </div>
//                     ) : (
//                         <div className="card shadow-premium" style={{ border: 'none', padding: 0, overflow: 'hidden' }}>
//                             <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--border-light)', backgroundColor: '#fcfdfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//                                 <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
//                                     <h4 style={{ fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '1rem' }}>
//                                         Metric Field Builder ({selectedCategory})
//                                     </h4>
//                                     <button
//                                         onClick={addQuestion}
//                                         style={{
//                                             display: 'flex',
//                                             alignItems: 'center',
//                                             gap: '0.5rem',
//                                             backgroundColor: 'var(--primary-soft)',
//                                             color: 'var(--primary)',
//                                             border: 'none',
//                                             padding: '0.5rem 1rem',
//                                             borderRadius: '10px',
//                                             fontSize: '0.8rem',
//                                             fontWeight: 800,
//                                             cursor: 'pointer'
//                                         }}
//                                     >
//                                         <PlusCircle size={16} /> Add Metric
//                                     </button>
//                                 </div>
//                                 <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)' }}>
//                                     MAX SCORE: {questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0)}
//                                 </div>
//                             </div>

//                             <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '650px', overflowY: 'auto' }}>
//                                 {numQuestions === 0 ? (
//                                     <div style={{ textAlign: 'center', padding: '3rem' }}>
//                                         <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Initialize number of questions in the configuration panel.</p>
//                                     </div>
//                                 ) : (
//                                     questions.map((q, idx) => (
//                                         <div key={idx} style={{
//                                             display: 'grid',
//                                             gridTemplateColumns: '40px 1fr auto auto 40px',
//                                             gap: '1rem',
//                                             alignItems: 'center',
//                                             padding: '1rem 1.25rem',
//                                             backgroundColor: '#f8fafc',
//                                             borderRadius: '16px',
//                                             border: '1px solid var(--border-light)'
//                                         }}>
//                                             <div style={{
//                                                 width: '28px',
//                                                 height: '28px',
//                                                 backgroundColor: 'var(--primary-dark)',
//                                                 color: 'white',
//                                                 borderRadius: '50%',
//                                                 display: 'flex',
//                                                 alignItems: 'center',
//                                                 justifyContent: 'center',
//                                                 fontSize: '0.75rem',
//                                                 fontWeight: 900,
//                                                 flexShrink: 0
//                                             }}>
//                                                 {idx + 1}
//                                             </div>
//                                             <div style={{ minWidth: '200px' }}>
//                                                 <input
//                                                     type="text"
//                                                     value={q.text}
//                                                     onChange={(e) => handleQuestionChange(idx, 'text', e.target.value)}
//                                                     placeholder="Define assessment criteria description..."
//                                                     style={{
//                                                         width: '100%',
//                                                         padding: '0.6rem 1rem',
//                                                         borderRadius: '10px',
//                                                         border: '1px solid var(--border-light)',
//                                                         backgroundColor: 'white',
//                                                         fontWeight: 600,
//                                                         fontSize: '0.875rem',
//                                                         color: 'var(--text-primary)',
//                                                         outline: 'none'
//                                                     }}
//                                                 />
//                                             </div>
//                                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
//                                                 <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pts</span>
//                                                 <input
//                                                     type="number"
//                                                     value={q.marks}
//                                                     onChange={(e) => handleQuestionChange(idx, 'marks', parseInt(e.target.value) || 0)}
//                                                     style={{ width: '50px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontWeight: 800, textAlign: 'center' }}
//                                                 />
//                                             </div>
//                                             <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
//                                                 <ImageIcon size={14} color="var(--text-muted)" />
//                                                 <input
//                                                     type="number"
//                                                     min="0"
//                                                     value={q.imageCount}
//                                                     onChange={(e) => handleQuestionChange(idx, 'imageCount', parseInt(e.target.value) || 0)}
//                                                     style={{ width: '45px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}
//                                                 />
//                                             </div>
//                                             <button
//                                                 onClick={() => removeQuestion(idx)}
//                                                 style={{
//                                                     border: 'none',
//                                                     backgroundColor: 'transparent',
//                                                     color: 'var(--danger)',
//                                                     cursor: 'pointer',
//                                                     padding: '0.5rem',
//                                                     display: 'flex',
//                                                     alignItems: 'center',
//                                                     justifyContent: 'center'
//                                                 }}
//                                                 title="Remove Metric"
//                                             >
//                                                 <Trash2 size={16} />
//                                             </button>
//                                         </div>
//                                     ))
//                                 )}
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             </div>

//             {/* Deployed Questionnaires List */}
//             <div style={{ marginTop: '4rem' }}>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
//                     <div style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)', padding: '0.6rem', borderRadius: '10px' }}>
//                         <CheckCircle2 size={20} />
//                     </div>
//                     <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Deployment History</h3>
//                 </div>

//                 <div className="card shadow-premium" style={{ border: 'none', padding: 0, overflow: 'hidden' }}>
//                     <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//                         <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
//                             <tr>
//                                 <th style={{ textAlign: 'left', padding: '1.25rem 2rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Category</th>
//                                 <th style={{ textAlign: 'center', padding: '1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Questions</th>
//                                 <th style={{ textAlign: 'center', padding: '1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Score</th>
//                                 <th style={{ textAlign: 'left', padding: '1.25rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Last Updated</th>
//                                 <th style={{ textAlign: 'right', padding: '1.25rem 2rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Actions</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {allQuestionnaires.length === 0 ? (
//                                 <tr>
//                                     <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 500 }}>
//                                         No questionnaires deployed yet.
//                                     </td>
//                                 </tr>
//                             ) : (
//                                 allQuestionnaires.map((q) => (
//                                     <tr key={q.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }} className="table-row-hover">
//                                         <td style={{ padding: '1.5rem 2rem' }}>
//                                             <div style={{ fontWeight: 800, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
//                                                 {q.category.replace(/_/g, ' ')}
//                                             </div>
//                                         </td>
//                                         <td style={{ padding: '1.5rem', textAlign: 'center' }}>
//                                             <span style={{ backgroundColor: '#f1f5f9', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem' }}>
//                                                 {q.questions.length} Fields
//                                             </span>
//                                         </td>
//                                         <td style={{ padding: '1.5rem', textAlign: 'center' }}>
//                                             <div style={{ fontWeight: 900, color: 'var(--swachh-green)', fontSize: '1.125rem' }}>
//                                                 {q.questions.reduce((acc: number, cur: any) => acc + (cur.marks || 0), 0)}
//                                             </div>
//                                         </td>
//                                         <td style={{ padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
//                                             {new Date(q.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
//                                         </td>
//                                         <td style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>
//                                             <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
//                                                 <button
//                                                     onClick={() => handleEdit(q)}
//                                                     className="btn btn-outline"
//                                                     style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', height: '36px' }}
//                                                 >
//                                                     Edit Builder
//                                                 </button>
//                                                 <button
//                                                     onClick={() => handleRedeploy(q)}
//                                                     className="btn btn-primary"
//                                                     style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', height: '36px', backgroundColor: 'var(--primary-dark)' }}
//                                                 >
//                                                     Redeploy
//                                                 </button>
//                                                 <button
//                                                     onClick={() => handleDelete(q.id, q.category)}
//                                                     className="btn btn-outline"
//                                                     style={{ padding: '0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)', height: '36px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
//                                                     title="Delete Questionnaire"
//                                                 >
//                                                     <Trash2 size={16} />
//                                                 </button>
//                                             </div>
//                                         </td>
//                                     </tr>
//                                 ))
//                             )}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default QuestionnaireManager;

import React, { useState, useEffect } from 'react';
import api from '../api/axios';

import { ClipboardList, PlusCircle, Save, Trash2, ArrowRight, Layout, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import NoAccess from '../components/NoAccess';
import { hasPermission } from '../utils/accessControl';

interface Question {
    text: string;
    marks: number;
    imageCount: number;
    indicator?: string;
}

const CATEGORIES = ['wards', 'schools', 'hospitals', 'offices', 'markets', 'societies - bwg', 'hotels'];

const QuestionnaireManager = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const canViewQuestionnaire = hasPermission(currentUser?.permissions, 'questionnaire', 'view');
    const canWriteQuestionnaire = hasPermission(currentUser?.permissions, 'questionnaire', 'write');
    const isReadOnly = !canWriteQuestionnaire;

    if (!currentUser || !canViewQuestionnaire) {
        return <NoAccess title="Questionnaire" message="You do not have permission to view this module." />;
    }

    const [selectedCategory, setSelectedCategory] = useState('');
    const [numQuestions, setNumQuestions] = useState(0);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [allQuestionnaires, setAllQuestionnaires] = useState<any[]>([]);

    useEffect(() => {
        fetchAllQuestionnaires();
        if (selectedCategory) fetchQuestionnaire();
    }, [selectedCategory]);

    const fetchAllQuestionnaires = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await api.get('/questionnaire', { headers: { Authorization: `Bearer ${token}` } });
            setAllQuestionnaires(response.data || []);
        } catch (err) { console.error('Failed to fetch all questionnaires'); }
    };

    const fetchQuestionnaire = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const response = await api.get(`/questionnaire/${selectedCategory}`, { headers: { Authorization: `Bearer ${token}` } });
            if (response.data) {
                const fetched = (response.data.questions || []).map((q: any) => ({ text: q.text, marks: q.marks, imageCount: q.imageCount || 0, indicator: q.indicator || '' }));
                setQuestions(fetched);
                setNumQuestions(fetched.length);
            }
        } catch (err: any) {
            if (err.response?.status === 404) { setQuestions([]); setNumQuestions(0); }
        } finally { setLoading(false); }
    };

    const handleNumQuestionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isReadOnly) return;
        const val = parseInt(e.target.value) || 0;
        setNumQuestions(val);
        if (val > questions.length) {
            const newQ = [...questions];
            for (let i = questions.length; i < val; i++) newQ.push({ text: '', marks: 0, imageCount: 0, indicator: '' });
            setQuestions(newQ);
        } else {
            setQuestions(questions.slice(0, val));
        }
    };

    const handleQuestionChange = (index: number, field: keyof Question, value: string | number) => {
        if (isReadOnly) return;
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const removeQuestion = (index: number) => {
        if (isReadOnly) return;
        const updated = questions.filter((_, i) => i !== index);
        setQuestions(updated);
        setNumQuestions(updated.length);
    };

    const handleSave = async (silent = false) => {
        if (isReadOnly) {
            alert('Write permission required to update questionnaires.');
            return;
        }
        if (!selectedCategory || questions.length === 0) return;
        if (!silent) setSaving(true);
        const token = localStorage.getItem('token');
        try {
            await api.post('/questionnaire/save', { category: selectedCategory, questions }, { headers: { Authorization: `Bearer ${token}` } });
            if (!silent) { setSuccessMessage(`Metrics for ${selectedCategory.toUpperCase()} saved!`); setTimeout(() => setSuccessMessage(''), 3000); }
            await fetchQuestionnaire();
            await fetchAllQuestionnaires();
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            alert(`Failed to save: ${msg}`);
        } finally { if (!silent) setSaving(false); }
    };

    const addQuestion = () => {
        if (isReadOnly) return;
        setQuestions([...questions, { text: '', marks: 0, imageCount: 0, indicator: '' }]);
        setNumQuestions(numQuestions + 1);
    };

    const handleEdit = (q: any) => setSelectedCategory(q.category);

    const handleRedeploy = async (q: any) => {

        if (isReadOnly) {
            alert('Write permission required to redeploy questionnaires.');
            return;
        }
        // This will save the currently loaded questionnaire for that category
        // If the user hasn't modified it, it just re-saves the same data
        const token = localStorage.getItem('token');
        setSaving(true);
        try {
            await api.post('/questionnaire/save', {
                category: q.category,
                questions: q.questions.map((item: any) => ({ text: item.text, marks: Number(item.marks), imageCount: Number(item.imageCount || 0) }))
            }, { headers: { Authorization: `Bearer ${token}` } });
            setSuccessMessage(`Redeployment of ${q.category.toUpperCase()} successful!`);
            await fetchAllQuestionnaires();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            alert(`Redeployment failed: ${err.response?.data?.error || err.message}`);
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string, category: string) => {
        if (!window.confirm(`Delete questionnaire for ${category.toUpperCase()}?`)) return;

        if (isReadOnly) {
            alert('Write permission required to delete questionnaires.');
            return;
        }
        if (!window.confirm(`Are you sure you want to delete the questionnaire for ${category.toUpperCase()}? This will remove all associated metrics.`)) {
            return;
        }

        const token = localStorage.getItem('token');
        setSaving(true);
        try {
            await api.delete(`/questionnaire/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setSuccessMessage(`Deleted ${category.toUpperCase()} questionnaire.`);
            await fetchAllQuestionnaires();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            alert(`Deletion failed: ${err.response?.data?.error || err.message}`);
        } finally { setSaving(false); }
    };

    return (
        <div className="dashboard-content">

            {/* ── Header ── */}
            <header className="page-header-row" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 850, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                        Assessment Configuration
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
                        Define dynamic scoring parameters and evaluation metrics for different urban categories.
                    </p>
                </div>
            </header>

            {/* ── Main Grid: config panel + builder ── */}
            <div className="questionnaire-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: '2rem', alignItems: 'start' }}>

                {/* Config Panel */}
                <div className="card shadow-premium" style={{ border: 'none', padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '2rem' }}>
                        <div style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '12px', flexShrink: 0 }}>
                            <Layout size={22} />
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>Metric Settings</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ color: 'var(--swachh-green)', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>
                                Evaluation Category
                            </label>
                            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                                aria-label="Evaluation Category"
                                style={{ padding: '0.875rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                                <option value="">Select a Category</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat === 'societies - bwg' ? 'Societies - BWG' : cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">

                            <label style={{ color: 'var(--swachh-green)', fontWeight: 700, fontSize: '0.875rem' }}>Question Count</label>
                            <input
                                type="number"
                                min="0"
                                max="50"
                                value={numQuestions}
                                onChange={handleNumQuestionsChange}
                                placeholder="E.g. 10"
                                style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}
                                disabled={isReadOnly}
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 500 }}>
                                Number of evaluation points to define for this category.
                            </p>
                        </div>

                        {isReadOnly && (
                            <div style={{ background: '#fef9c3', padding: '0.9rem 1.25rem', borderRadius: '12px', fontWeight: 600, color: '#854d0e' }}>
                                You currently have view-only access. Editing actions are disabled.
                            </div>
                        )}

                        <button
                            onClick={() => handleSave()}
                            disabled={saving || !selectedCategory || numQuestions === 0 || isReadOnly}
                            className="btn btn-primary"
                            style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', backgroundColor: 'var(--swachh-green)', border: 'none', boxShadow: '0 8px 16px rgba(26,77,46,0.2)' }}
                        >
                            {saving ? 'UPDATING...' : <><Save size={18} /> Deploy Questionnaire</>}
                        </button>
                    </div>
                </div>

                {/* Field Builder */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {successMessage && (
                        <div style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)', padding: '1rem 1.25rem', borderLeft: '4px solid var(--success)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700 }}>
                            <CheckCircle2 size={20} /> {successMessage}
                        </div>
                    )}

                    {!selectedCategory ? (
                        <div className="card shadow-premium" style={{ border: '1px dashed var(--border)', padding: '5rem 2rem', textAlign: 'center', backgroundColor: 'white', opacity: 0.8 }}>
                            <ClipboardList size={44} style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', display: 'block', margin: '0 auto 1.25rem' }} />
                            <h3 style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>Workspace Inactive</h3>
                            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Select a category to begin defining assessment metrics.</p>
                        </div>
                    ) : loading ? (
                        <div className="card shadow-premium" style={{ padding: '5rem', textAlign: 'center' }}>
                            <div className="spinner" style={{ margin: '0 auto' }}></div>
                            <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Syncing schema for {selectedCategory}...</p>
                        </div>
                    ) : (
                        <div className="card shadow-premium" style={{ border: 'none', padding: 0, overflow: 'hidden' }}>
                            {/* Builder Header */}
                            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', backgroundColor: '#fcfdfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    <h4 style={{ fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.875rem', margin: 0 }}>
                                        Builder — {selectedCategory}
                                    </h4>

                                    <button
                                        onClick={addQuestion}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            backgroundColor: 'var(--primary-soft)',
                                            color: 'var(--primary)',
                                            border: 'none',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '10px',
                                            fontSize: '0.8rem',
                                            fontWeight: 800,
                                            cursor: 'pointer'
                                        }}
                                            disabled={isReadOnly}
                                        >
                                            <PlusCircle size={16} /> Add Metric
                                        </button>
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3730a3', backgroundColor: 'var(--primary-soft)', padding: '0.3rem 0.75rem', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                                    MAX: {questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0)} pts
                                </div>
                            </div>

                            {/* Question List */}
                            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', maxHeight: '600px', overflowY: 'auto' }}>
                                {numQuestions === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2.5rem' }}>
                                        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Initialize number of questions in the configuration panel.</p>
                                    </div>
                                ) : (
                                    questions.map((q, idx) => (
                                        <div key={idx} className="question-row" style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '0.625rem',
                                            alignItems: 'center',
                                            padding: '0.875rem 1rem',
                                            backgroundColor: '#f8fafc',
                                            borderRadius: '14px',
                                            border: '1px solid var(--border-light)'
                                        }}>
                                            {/* Number badge */}
                                            <div style={{ width: '26px', height: '26px', backgroundColor: 'var(--primary-dark)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, flexShrink: 0 }}>
                                                {idx + 1}
                                            </div>

                                            {/* Indicator */}
                                            <input
                                                type="text"
                                                value={q.indicator || ''}
                                                onChange={(e) => handleQuestionChange(idx, 'indicator', e.target.value)}
                                                placeholder="Indicator (e.g. Sanitation)"
                                                title="Indicator / Section name for grouping questions"
                                                style={{
                                                    flex: '0 0 150px',
                                                    padding: '0.6rem 0.75rem',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border-light)',
                                                    backgroundColor: '#fffbeb',
                                                    fontWeight: 600,
                                                    fontSize: '0.8rem',
                                                    color: '#92400e',
                                                    outline: 'none',
                                                    minWidth: 0,
                                                }}
                                                disabled={isReadOnly}
                                            />

                                            {/* Question text — grows to fill all remaining space */}
                                            <textarea
                                                value={q.text}
                                                onChange={(e) => handleQuestionChange(idx, 'text', e.target.value)}
                                                placeholder="Define assessment criteria description..."
                                                rows={2}
                                                style={{
                                                    flex: '1 1 200px',
                                                    padding: '0.6rem 1rem',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border-light)',
                                                    backgroundColor: 'white',
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none',
                                                    resize: 'vertical',
                                                    lineHeight: 1.5,
                                                    fontFamily: 'inherit',
                                                    minWidth: 0,
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-word',
                                                }}
                                                disabled={isReadOnly}
                                            />

                                            {/* Right-side actions: Pts + Image + Delete */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pts</span>
                                                <input
                                                    type="number"
                                                    value={q.marks}
                                                    onChange={(e) => handleQuestionChange(idx, 'marks', parseInt(e.target.value) || 0)}
                                                    style={{ width: '52px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontWeight: 800, textAlign: 'center' }}
                                                    disabled={isReadOnly}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                                                <ImageIcon size={13} color="var(--text-secondary)" />
                                                <input type="number" min="0" value={q.imageCount}
                                                    onChange={(e) => handleQuestionChange(idx, 'imageCount', parseInt(e.target.value) || 0)}
                                                    style={{ width: '46px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center' }}
                                                    disabled={isReadOnly}
                                                />
                                            </div>

                                            <button
                                                onClick={() => removeQuestion(idx)}
                                                style={{
                                                    border: 'none',
                                                    backgroundColor: 'transparent',
                                                    color: 'var(--danger)',
                                                    cursor: 'pointer',
                                                    padding: '0.5rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                                title="Remove Metric"
                                                disabled={isReadOnly}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Deployment History ── */}
            <div style={{ marginTop: '3.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)', padding: '0.6rem', borderRadius: '10px' }}>
                        <CheckCircle2 size={18} />
                    </div>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Deployment History</h3>
                </div>

                <div className="card shadow-premium" style={{ border: 'none', padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                            <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                                <tr>
                                    {['Category', 'Questions', 'Total Score', 'Last Updated', 'Actions'].map((h, i) => (
                                        <th key={h} style={{ textAlign: i === 4 ? 'right' : i === 1 || i === 2 ? 'center' : 'left', padding: i === 0 || i === 4 ? '1.1rem 1.5rem' : '1.1rem', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {allQuestionnaires.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                            No questionnaires deployed yet.
                                        </td>
                                    </tr>
                                ) : (
                                    allQuestionnaires.map((q) => (
                                        <tr key={q.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }} className="hover-light">
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ fontWeight: 800, color: 'var(--text-primary)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                                                    {q.category.replace(/_/g, ' ')}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem', textAlign: 'center' }}>
                                                <span style={{ backgroundColor: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                    {q.questions.length} Fields
                                                </span>
                                            </td>
                                            <td style={{ padding: '1.25rem', textAlign: 'center' }}>
                                                <div style={{ fontWeight: 900, color: 'var(--swachh-green)', fontSize: '1.1rem' }}>
                                                    {q.questions.reduce((acc: number, cur: any) => acc + (cur.marks || 0), 0)}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                {new Date(q.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                                <div className="questionnaire-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                    <button onClick={() => handleEdit(q)} className="btn btn-outline"
                                                        style={{ padding: '0.4rem 0.875rem', fontSize: '0.78rem', height: '34px', whiteSpace: 'nowrap' }}>
                                                        Edit
                                                    </button>
                                                    <button onClick={() => handleRedeploy(q)} className="btn btn-primary"
                                                        style={{ padding: '0.4rem 0.875rem', fontSize: '0.78rem', height: '34px', backgroundColor: 'var(--primary-dark)', whiteSpace: 'nowrap' }}>
                                                        Redeploy
                                                    </button>
                                                    <button onClick={() => handleDelete(q.id, q.category)} className="btn btn-outline"
                                                        style={{ padding: '0.4rem', color: '#ef4444', borderColor: '#ef4444', height: '34px', width: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                                        title="Delete">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuestionnaireManager;