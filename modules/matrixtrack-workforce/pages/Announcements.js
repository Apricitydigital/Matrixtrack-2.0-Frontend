import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { 
  Bell, 
  Plus, 
  Trash2, 
  Edit, 
  Megaphone,
  Star,
  MessageSquare,
  Layout,
  RefreshCcw,
  X,
  User,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useAuth } from "../AuthContext";

function Announcements() {
  const { logPageView } = useAuth();
  const [activeTab, setActiveTab] = useState('announcements');

  useEffect(() => {
    if (logPageView) logPageView("Announcements Board", "/announcements");
  }, [logPageView]);
  const [announcements, setAnnouncements] = useState([]);
  const [feedbackConfig, setFeedbackConfig] = useState([]);
  const [feedbackResponses, setFeedbackResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Announcement Modal State
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [editingAnnounceId, setEditingAnnounceId] = useState(null);
  const [announceForm, setAnnounceForm] = useState({
    title: "",
    content: "",
    target_role: "supervisor",
    is_active: true
  });

  // Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({
    question: "",
    is_active: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [annRes, fbConfigRes, fbRespRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/announcements`, { headers }),
        axios.get(`${API_BASE_URL}/admin/feedback/config`, { headers }),
        axios.get(`${API_BASE_URL}/admin/feedback/responses`, { headers })
      ]);
      
      setAnnouncements(annRes.data);
      setFeedbackConfig(fbConfigRes.data);
      setFeedbackResponses(fbRespRes.data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Announcement Handlers
  const handleAnnounceSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      if (editingAnnounceId) {
        await axios.put(`${API_BASE_URL}/admin/announcements/${editingAnnounceId}`, announceForm, { headers });
      } else {
        await axios.post(`${API_BASE_URL}/admin/announcements`, announceForm, { headers });
      }
      setShowAnnounceModal(false);
      setEditingAnnounceId(null);
      setAnnounceForm({ title: "", content: "", target_role: "supervisor", is_active: true });
      fetchData();
    } catch (error) {
      console.error("Submit error:", error);
      alert("Error saving announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAnnounce = (item) => {
    setEditingAnnounceId(item.id);
    setAnnounceForm({
      title: item.title,
      content: item.content,
      target_role: item.target_role,
      is_active: item.is_active
    });
    setShowAnnounceModal(true);
  };

  const handleDeleteAnnounce = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/admin/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const toggleAnnounceActive = async (item) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_BASE_URL}/admin/announcements/${item.id}`, {
        ...item,
        is_active: !item.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error("Toggle error:", error);
    }
  };

  // Feedback Handlers
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !feedbackForm.question.trim()) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      if (editingFeedbackId) {
        await axios.put(`${API_BASE_URL}/admin/feedback/config/${editingFeedbackId}`, feedbackForm, { headers });
      } else {
        await axios.post(`${API_BASE_URL}/admin/feedback/config`, feedbackForm, { headers });
      }
      setShowFeedbackModal(false);
      setEditingFeedbackId(null);
      setFeedbackForm({ question: "", is_active: true });
      fetchData();
      alert("Feedback question saved!");
    } catch (error) {
      console.error("Feedback error:", error);
      alert("Failed to save feedback question.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFeedbackActive = async (item) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_BASE_URL}/admin/feedback/config/${item.id}`, {
        is_active: !item.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error("Toggle error:", error);
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (!window.confirm("This will delete all reviews for this question. Continue?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/admin/feedback/config/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white dark:text-white font-black">Communication Hub</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 text-sm font-medium">Manage announcements and multi-question feedback forms.</p>
        </div>
        <div className="
flex
items-center
gap-2

bg-white
dark:bg-slate-900

p-1

rounded-2xl

shadow-sm
dark:shadow-none

border
border-slate-100
dark:border-slate-700
">
          <button 
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'announcements' ? 'bg-indigo-600 text-white shadow-md dark:shadow-none' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800'}`}
          >
            Announcements
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'feedback' ? 'bg-indigo-600 text-white shadow-md dark:shadow-none' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-800'}`}
          >
            Live Feedback
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : activeTab === 'announcements' ? (
        <div className="space-y-6 text-slate-800 dark:text-slate-100">
           <div className="
flex
justify-between
items-center

bg-white
dark:bg-slate-900

p-4

rounded-2xl

border
border-slate-100
dark:border-slate-700

shadow-sm
dark:shadow-none
">
             <div className="flex items-center gap-2 text-indigo-600">
               <Megaphone size={20} />
               <span className="font-bold text-slate-700">{announcements.filter(a => a.is_active).length} Active Notices</span>
             </div>
             <button
              onClick={() => {
                setEditingAnnounceId(null);
                setAnnounceForm({ title: "", content: "", target_role: "supervisor", is_active: true });
                setShowAnnounceModal(true);
              }}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Plus size={18} />
              <span>Create Announcement</span>
            </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {announcements.map((item) => (
              <div key={item.id} className={`
bg-white
dark:bg-slate-900

rounded-3xl

p-6

border

transition-all

shadow-sm
dark:shadow-none ${item.is_active ? "border-indigo-100 dark:border-indigo-500/20 shadow-sm dark:shadow-none" : "border-slate-100 dark:border-slate-700 opacity-75"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${item.is_active ? "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-700 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400"}`}>
                    <Bell size={20} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEditAnnounce(item)} className="p-2 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg"><Edit size={16} /></button>
                    <button onClick={() => handleDeleteAnnounce(item.id)} className="p-2 text-slate-400 dark:text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white dark:text-white dark:text-white text-lg mb-2">{item.title}</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-3 leading-relaxed mb-4">{item.content}</p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{item.target_role}</span>
                  <button onClick={() => toggleAnnounceActive(item)} className={`text-xs font-black px-3 py-1.5 rounded-lg transition-colors ${item.is_active ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"}`}>
                    {item.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
           </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Multi-Question Management */}
          <div className="
bg-white
dark:bg-slate-900

rounded-[2.5rem]

p-8

border
border-slate-100
dark:border-slate-700

shadow-sm
dark:shadow-none
">
             <div className="flex items-center justify-between mb-8">
               <div>
                 <h2 className="text-xl font-black text-slate-900 dark:text-white dark:text-white">Feedback Form Configuration</h2>
                 <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 text-sm font-medium">All active questions will be shown in the app form.</p>
               </div>
               <button 
                 onClick={() => {
                   setEditingFeedbackId(null);
                   setFeedbackForm({ question: "", is_active: true });
                   setShowFeedbackModal(true);
                 }}
                 className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
               >
                 <Plus size={18} />
                 Add Question
               </button>
             </div>

             <div className="grid grid-cols-1 gap-4">
                {feedbackConfig.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between p-5 rounded-3xl border transition-all ${item.is_active ? "bg-indigo-50/30 border-indigo-100 dark:border-indigo-500/20 shadow-sm dark:shadow-none" : "bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800 border-slate-100 dark:border-slate-700"}`}>
                    <div className="flex items-center gap-4">
                       <button 
                         onClick={() => toggleFeedbackActive(item)}
                         className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${item.is_active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-slate-200 text-slate-500 dark:text-slate-400 dark:text-slate-400"}`}
                       >
                          <Star size={20} fill={item.is_active ? "currentColor" : "none"} />
                       </button>
                       <div>
                         <p className={`font-bold ${item.is_active ? "text-slate-900 dark:text-white dark:text-white" : "text-slate-500 dark:text-slate-400 dark:text-slate-400"}`}>{item.question}</p>
                         <button 
                           onClick={() => toggleFeedbackActive(item)}
                           className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mt-0.5 ${item.is_active ? "text-indigo-600" : "text-slate-400"}`}
                         >
                           {item.is_active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                           {item.is_active ? "Currently Live in App" : "Hidden (Click to Activate)"}
                         </button>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingFeedbackId(item.id);
                          setFeedbackForm({ question: item.question, is_active: item.is_active });
                          setShowFeedbackModal(true);
                        }}
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-indigo-50"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteFeedback(item.id)}
                        className="p-3 text-slate-400 hover:text-rose-600 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-rose-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xl font-black text-slate-900 dark:text-white dark:text-white flex items-center gap-2">
                  <MessageSquare size={22} className="text-indigo-600" />
                  Supervisor Feedbacks ({feedbackResponses.length})
                </h3>
                <div className="space-y-6 text-slate-800 dark:text-slate-100">
                   {/* Grouping feedback by user and session (approx same time) */}
                   {(() => {
                     const groups = [];
                     feedbackResponses.forEach(res => {
                       const timeKey = new Date(res.created_at).getTime();
                       // Check if a group for this user within 10s exists
                       const group = groups.find(g => 
                         g.user_id === res.user_id && 
                         Math.abs(new Date(g.created_at).getTime() - timeKey) < 10000
                       );
                       
                       if (group) {
                         group.replies.push({ question: res.question, rating: res.rating, comment: res.comment });
                       } else {
                         groups.push({
                           ...res,
                           replies: [{ question: res.question, rating: res.rating, comment: res.comment }]
                         });
                       }
                     });

                     return groups.map((group) => (
                       <div key={group.id} className="
bg-white
dark:bg-slate-900

rounded-[2.5rem]

border
border-slate-100
dark:border-slate-700

shadow-sm
dark:shadow-none

hover:shadow-lg
dark:hover:shadow-none

transition-all

overflow-hidden
">
                          <div className="
bg-slate-50 dark:bg-slate-800 dark:bg-slate-800/50
dark:bg-slate-800/50

p-6

border-b
border-slate-100
dark:border-slate-700
">
                             <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                   <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg">
                                     {group.user_name?.charAt(0)}
                                   </div>
                                   <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-black text-slate-900 dark:text-white dark:text-white text-lg">{group.user_name}</h4>
                                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black uppercase">ID: {group.user_id}</span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4">
                                         <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                            <Layout size={14} className="text-indigo-500" />
                                            <span>Zone: <span className="text-slate-900 dark:text-white dark:text-white">{group.zone_name || 'No Zone'}</span></span>
                                         </div>
                                         <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                            <RefreshCcw size={14} className="text-emerald-500" />
                                            <span>Kothi (Ward): <span className="text-slate-900 dark:text-white dark:text-white">{group.ward_names || 'No Ward'}</span></span>
                                         </div>
                                         <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400">
                                            <Clock size={14} className="text-slate-400" />
                                            <span>{new Date(group.created_at).toLocaleDateString()}</span>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Overall Avg</p>
                                   <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-xl font-black text-sm flex items-center gap-1">
                                      <Star size={14} fill="currentColor" />
                                      {(group.replies.reduce((a, b) => a + Number(b.rating), 0) / group.replies.length).toFixed(1)}
                                   </div>
                                </div>
                             </div>
                          </div>

                          <div className="p-6 space-y-4">
                             {group.replies.map((reply, idx) => (
                               <div key={idx} className="
bg-slate-50 dark:bg-slate-800 dark:bg-slate-800
dark:bg-slate-800

rounded-2xl

p-4

border
border-slate-100
dark:border-slate-700
">
                                  <div className="flex items-center justify-between mb-2">
                                     <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Question {idx + 1}</p>
                                     <div className="flex gap-0.5">
                                        {[1,2,3,4,5].map(s => (
                                          <Star key={s} size={12} fill={s <= reply.rating ? "#F59E0B" : "none"} stroke={s <= reply.rating ? "#F59E0B" : "#CBD5E1"} />
                                        ))}
                                     </div>
                                  </div>
                                  <p className="text-sm font-bold text-slate-800 mb-2">"{reply.question}"</p>
                                  <p className="text-sm text-slate-600 leading-relaxed italic">
                                     {reply.comment ? `"${reply.comment}"` : <span className="text-slate-300">No comment provided</span>}
                                  </p>
                               </div>
                             ))}
                          </div>
                       </div>
                     ));
                   })()}
                </div>
             </div>

             <div className="space-y-6 text-slate-800 dark:text-slate-100">
                <h3 className="text-xl font-black text-slate-900 dark:text-white dark:text-white">Analytics Box</h3>
                <div className="
bg-white
dark:bg-slate-900

p-8

rounded-[2.5rem]

border
border-slate-100
dark:border-slate-700

shadow-sm
dark:shadow-none

space-y-8
">
                   <div className="text-center">
                     <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Overall Score</p>
                     <div className="text-6xl font-black text-slate-900 dark:text-white dark:text-white mb-2">
                        {feedbackResponses.length > 0 
                           ? (feedbackResponses.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0) / feedbackResponses.length).toFixed(1)
                           : "0.0"}
                     </div>
                     <div className="flex justify-center gap-1">
                        {[1,2,3,4,5].map(s => <Star key={s} size={18} fill={s <= Math.round(feedbackResponses.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0) / (feedbackResponses.length || 1)) ? "#F59E0B" : "none"} stroke="#F59E0B" />)}
                     </div>
                   </div>

                   <div className="space-y-4">
                     {[5,4,3,2,1].map(r => {
                       const count = feedbackResponses.filter(re => Number(re.rating) === r).length;
                       const pct = feedbackResponses.length > 0 ? (count / feedbackResponses.length) * 100 : 0;
                       return (
                         <div key={r} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                               <span>{r} Stars</span>
                               <span>{count} Users</span>
                            </div>
                            <div className="h-2.5 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100">
                               <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                         </div>
                       )
                     })}
                   </div>

                   <div className="pt-8 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                         <div className="text-center flex-1">
                            <div className="text-2xl font-black text-emerald-600">{feedbackResponses.filter(r => Number(r.rating) >= 4).length}</div>
                            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-1">Happy</p>
                         </div>
                         <div className="w-px h-8 bg-slate-100 dark:bg-slate-700"></div>
                         <div className="text-center flex-1">
                            <div className="text-2xl font-black text-slate-400">{feedbackResponses.filter(r => Number(r.rating) === 3).length}</div>
                            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-1">Neutral</p>
                         </div>
                         <div className="w-px h-8 bg-slate-100 dark:bg-slate-700"></div>
                         <div className="text-center flex-1">
                            <div className="text-2xl font-black text-rose-500">{feedbackResponses.filter(r => Number(r.rating) <= 2).length}</div>
                            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-1">Sad</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAnnounceModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md relative z-[1002] shadow-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white dark:text-white mb-6">{editingAnnounceId ? "Update Notice" : "New Announcement"}</h2>
            <form onSubmit={handleAnnounceSubmit} className="space-y-4">
              <input required type="text" value={announceForm.title} onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })} placeholder="Title" className="w-full bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 border-0 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
              <textarea required rows="4" value={announceForm.content} onChange={(e) => setAnnounceForm({ ...announceForm, content: e.target.value })} placeholder="Message content..." className="w-full bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 border-0 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium"></textarea>
              <select value={announceForm.target_role} onChange={(e) => setAnnounceForm({ ...announceForm, target_role: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 border-0 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
                <option value="supervisor">Supervisor</option>
                <option value="all">Everyone</option>
              </select>
              <button disabled={submitting} type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:scale-[1.02] transition-all shadow-lg shadow-indigo-100 mt-2">
                {submitting ? "Wait..." : "Save Announcement"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Item Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowFeedbackModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg relative z-[1002] shadow-2xl p-10 border border-slate-100">
             <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mb-6">
                <Star size={32} className="fill-current" />
             </div>
             <h2 className="text-3xl font-black text-slate-900 dark:text-white dark:text-white mb-2">{editingFeedbackId ? "Edit Question" : "Live App Question"}</h2>
             <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 font-bold mb-8">What should common supervisors see in the feedback prompt today?</p>
             <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                <textarea 
                  required 
                  rows="3" 
                  value={feedbackForm.question} 
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, question: e.target.value })} 
                  placeholder="Enter the question for supervisors..." 
                  className="w-full bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 border-0 rounded-3xl px-6 py-5 text-xl font-bold text-slate-900 dark:text-white dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                ></textarea>
                <div className="flex items-center gap-3 py-2">
                   <button
                     type="button"
                     onClick={() => setFeedbackForm({ ...feedbackForm, is_active: !feedbackForm.is_active })}
                     className={`w-12 h-6 rounded-full relative transition-colors ${feedbackForm.is_active ? "bg-indigo-600" : "bg-slate-200"}`}
                   >
                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${feedbackForm.is_active ? "left-7" : "left-1"}`}></div>
                   </button>
                   <span className="text-sm font-black text-slate-600">This question is currently active</span>
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <button type="button" onClick={() => setShowFeedbackModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-400 dark:text-slate-400 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all font-black">Cancel</button>
                  <button type="submit" disabled={submitting || !feedbackForm.question.trim()} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50">
                    {submitting ? "Saving..." : (editingFeedbackId ? "Update Question" : "Add to Form")}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Announcements;
