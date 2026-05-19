import { useState, useEffect } from 'react';
import { 
  FaPaperPlane, 
  FaHistory, 
  FaCheckCircle, 
  FaClock, 
  FaExclamationCircle, 
  FaFile,
  FaUser,
  FaBuilding,
  FaSpinner,
  FaPlus,
  FaCheck,
  FaInbox,
  FaExclamationTriangle,
  FaShieldAlt,
  FaWrench,
  FaBriefcase,
  FaHeartbeat,
  FaLayerGroup,
  FaChartPie
} from 'react-icons/fa';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  LineChart, Line, CartesianGrid, Legend 
} from 'recharts';
import operationalReportApi from '../api/operationalReportApi';
import authApi from '../api/authApi';
import toast from 'react-hot-toast';

export default function OperationalReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'history', 'new'
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'Other',
    priority: 'Medium',
    recipientRole: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const currentUser = authApi.getCurrentUser();
    setUser(currentUser);
    
    if (currentUser.role === 'Proctor') {
      setFormData(prev => ({ ...prev, recipientRole: 'Admin' }));
      setActiveTab('history');
    } else {
      setFormData(prev => ({ ...prev, recipientRole: 'SuperAdmin' }));
      setActiveTab('pending');
    }

    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await operationalReportApi.getAll();
      setReports(data || []);
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return;
    
    try {
      setSubmitting(true);
      await operationalReportApi.create(formData);
      toast.success('Report filed successfully');
      setFormData(prev => ({ ...prev, title: '', message: '', category: 'Other', priority: 'Medium' }));
      setActiveTab('history');
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await operationalReportApi.updateStatus(id, status);
      toast.success(`Report ${status === 'Reviewed' ? 'Accepted' : 'Resolved'}`);
      fetchReports();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filteredReports = reports.filter(r => {
    if (activeTab === 'pending') return r.status === 'Pending';
    if (activeTab === 'history') return r.status !== 'Pending';
    return false;
  });

  if (!user) return null;

  const isProctor = user.role === 'Proctor';
  const isAdmin = user.role === 'Admin' || user.role === 'CampusAdmin';
  const isSuper = user.role === 'SuperAdmin';

  const categories = [
    { label: 'Maintenance', icon: <FaWrench />, color: 'text-orange-500' },
    { label: 'Security', icon: <FaShieldAlt />, color: 'text-indigo-500' },
    { label: 'Logistics', icon: <FaBriefcase />, color: 'text-blue-500' },
    { label: 'Student Conduct', icon: <FaUser />, color: 'text-rose-500' },
    { label: 'Health', icon: <FaHeartbeat />, color: 'text-emerald-500' },
    { label: 'Other', icon: <FaFile />, color: 'text-slate-500' }
  ];

  const priorities = [
    { label: 'Low', color: 'bg-slate-100 text-slate-600', hex: '#64748b' },
    { label: 'Medium', color: 'bg-blue-100 text-blue-700', hex: '#2563eb' },
    { label: 'High', color: 'bg-orange-100 text-orange-700', hex: '#ea580c' },
    { label: 'Emergency', color: 'bg-rose-100 text-rose-700 animate-pulse border border-rose-200', hex: '#e11d48' }
  ];

  // Logic to process analytics data from live reports array
  const getAnalytics = () => {
    const cats = {};
    const prios = { Emergency: 0, High: 0, Medium: 0, Low: 0 };
    const dates = {};

    reports.forEach(r => {
      const c = r.category || 'Other';
      cats[c] = (cats[c] || 0) + 1;
      if (prios.hasOwnProperty(r.priority)) prios[r.priority]++;
      const d = new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dates[d] = (dates[d] || 0) + 1;
    });

    return {
      categories: Object.keys(cats).map(n => ({ name: n, value: cats[n] })),
      priorities: Object.keys(prios).map(n => ({ name: n, value: prios[n], color: priorities.find(p => p.label === n)?.hex })),
      trends: Object.keys(dates).slice(-7).map(n => ({ name: n, value: dates[n] }))
    };
  };

  const analytics = getAnalytics();
  const COLORS = ['#6366f1', '#f59e0b', '#3b82f6', '#ef4444', '#10b981', '#64748b'];

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6 bg-[#f8fafc]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
             <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  Operational Intelligence
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold uppercase tracking-widest">Portal</span>
                </h1>
                <p className="text-slate-500 mt-2 font-medium">
                   {isSuper ? 'Global overview of operational status.' : 'File and track operational reports for your campus infrastructure.'}
                </p>
             </div>
             <button 
                onClick={() => setShowAnalytics(!showAnalytics)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border-2 ${
                   showAnalytics ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
             >
                <FaChartPie className={showAnalytics ? 'text-indigo-400' : 'text-slate-400'} />
                {showAnalytics ? 'Hide Analytics' : 'Systems Insights'}
             </button>
          </div>

        {/* Analytics Section - Collapsible */}
        {showAnalytics && (
           <div className="mb-10 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-500">
              {/* Category Breakdown */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Category Composition</h3>
                 <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                       <PieChart>
                          <Pie 
                            data={analytics.categories} 
                            innerRadius={50} 
                            outerRadius={70} 
                            paddingAngle={5} 
                            dataKey="value"
                            stroke="none"
                          >
                             {analytics.categories.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                          </Pie>
                          <Tooltip 
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                          />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
                    {analytics.categories.slice(0, 4).map((c, i) => (
                       <div key={c.name} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-[9px] font-bold text-slate-500 uppercase">{c.name}</span>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Urgency Spectrum */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Urgency Spectrum</h3>
                 <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                       <BarChart data={analytics.priorities}>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={25}>
                             {analytics.priorities.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              {/* Intelligence Trend */}
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Intelligence Trend</h3>
                 <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                       <LineChart data={analytics.trends}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                          <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                       </LineChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>
        )}

        {/* Improved Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-black tracking-tight transition-all border-2 ${
              activeTab === 'pending' 
                ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' 
                : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <FaExclamationTriangle className={activeTab === 'pending' ? 'text-amber-500' : 'text-slate-300'} />
            Action Required
            {reports.filter(r => r.status === 'Pending').length > 0 && (
              <span className="ml-1 w-5 h-5 bg-amber-500 text-white text-[10px] flex items-center justify-center rounded-full">
                {reports.filter(r => r.status === 'Pending').length}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-black tracking-tight transition-all border-2 ${
              activeTab === 'history' 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <FaHistory className={activeTab === 'history' ? 'text-indigo-500' : 'text-slate-300'} />
            Reporting Archive
          </button>

          {!isSuper && (
            <button 
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-black tracking-tight transition-all border-2 ${
                activeTab === 'new' 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <FaPlus className={activeTab === 'new' ? 'text-white' : 'text-slate-300'} />
              New Operational Report
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'new' ? (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="px-10 py-10 bg-slate-50/50 border-b border-slate-100">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Structured Report Entry</h2>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Routing to: {formData.recipientRole === 'SuperAdmin' ? 'Super Admin HQ' : 'Campus Administration'}</p>
             </div>

             <form onSubmit={handleSubmit} className="p-10 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Category Selection */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <FaLayerGroup /> Report Category
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => setFormData({...formData, category: c.label})}
                          className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-bold text-xs ${
                            formData.category === c.label 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                              : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          <span className={formData.category === c.label ? 'text-indigo-500' : 'text-slate-300'}>{c.icon}</span>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Urgency Selection */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <FaExclamationTriangle /> Operational Priority
                    </label>
                    <div className="flex flex-col gap-2">
                      {priorities.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setFormData({...formData, priority: p.label})}
                          className={`flex items-center justify-between px-5 py-3 rounded-xl border-2 transition-all font-black text-xs uppercase tracking-widest ${
                            formData.priority === p.label 
                              ? 'bg-slate-900 border-slate-900 text-white' 
                              : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          {p.label}
                          {formData.priority === p.label && <FaCheck className="text-[10px]" />}
                        </button>
                      ))}
                    </div>
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Refined Subject</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g., HVAC System Instability - Block 2"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-blue-500 transition-all font-bold text-slate-800 placeholder:text-slate-300 bg-slate-50/50"
                  />
               </div>

               <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Comprehensive Intelligence Body</label>
                  <textarea 
                    required
                    rows="6"
                    placeholder="Provide full context, observed symptoms, or logistical requirements..."
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-blue-500 transition-all font-bold text-slate-800 placeholder:text-slate-300 bg-slate-50/50 resize-none font-medium"
                  />
               </div>

               <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-blue-600 hover:bg-slate-900 text-white font-black rounded-3xl transition-all shadow-xl shadow-blue-200 disabled:opacity-70 flex items-center justify-center gap-4 text-sm uppercase tracking-[0.2em] active:scale-95"
                >
                  {submitting ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                  Launch Structured Report
                </button>
             </form>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                <FaSpinner className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Synchronizing Intel...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center shadow-sm">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaInbox className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Queue Clear</h3>
                <p className="text-slate-400 font-medium">No operational alerts found in this directory.</p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <div key={report._id} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group duration-500">
                  <div className="p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                       <div className="flex items-center gap-6">
                          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-sm ${
                             report.status === 'Pending' ? 'bg-amber-50 text-amber-500' : 
                             report.status === 'Reviewed' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
                          }`}>
                            <FaFile />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                               <h3 className="text-xl font-black text-slate-900 tracking-tight">{report.title}</h3>
                               <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                  priorities.find(p => p.label === report.priority)?.color || 'bg-slate-100 text-slate-600'
                               }`}>
                                 {report.priority || 'Medium'}
                               </span>
                            </div>
                            <div className="flex items-center gap-5">
                               <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                                  <FaClock className="w-3 h-3" />
                                  {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                               </span>
                               <span className="flex items-center gap-1.5 text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                  <FaBox /> {report.category || 'Other'}
                               </span>
                               <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                  report.status === 'Pending' ? 'bg-amber-100 text-amber-700 animate-pulse' : 
                                  report.status === 'Reviewed' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                               }`}>
                                  {report.status}
                               </span>
                            </div>
                          </div>
                       </div>

                       {!isProctor && report.status !== 'Resolved' && (
                        <div className="flex items-center gap-2">
                           {report.status === 'Pending' && (
                             <button 
                              onClick={() => handleUpdateStatus(report._id, 'Reviewed')}
                              className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-100 rounded-2xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 shadow-sm uppercase tracking-widest"
                             >
                                <FaCheck /> Accept
                             </button>
                           )}
                           <button 
                            onClick={() => handleUpdateStatus(report._id, 'Resolved')}
                            className="px-6 py-3 bg-white text-emerald-600 border-2 border-emerald-100 rounded-2xl text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 shadow-sm uppercase tracking-widest"
                           >
                              <FaCheckCircle /> Resolve
                           </button>
                        </div>
                       )}
                    </div>

                    <div className="bg-slate-50/70 rounded-[2rem] p-8 border border-slate-100 mb-8 group-hover:bg-indigo-50/20 transition-all">
                       <p className="text-slate-700 text-base leading-relaxed font-medium whitespace-pre-wrap">{report.message}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-8 pt-8 border-t border-slate-50">
                       <div className="flex items-center gap-10">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-500 shadow-sm">
                                <FaUser />
                             </div>
                             <div className="leading-tight">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Source Agent</p>
                                <p className="text-xs font-black text-slate-800">{report.sender?.fullName || 'Root Admin'}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-orange-500 shadow-sm">
                                <FaBuilding />
                             </div>
                             <div className="leading-tight">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sector</p>
                                <p className="text-xs font-black text-slate-800 uppercase italic">{report.campus || 'Global'}</p>
                             </div>
                          </div>
                       </div>

                       <div className="flex items-center gap-3 py-2.5 px-5 bg-slate-900 rounded-2xl border border-slate-800 text-white shadow-xl shadow-slate-200">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Recipient Role:</span>
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{report.recipientRole === 'SuperAdmin' ? 'Command HQ' : 'Regional Administration'}</span>
                       </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}

// Internal reusable icon
function FaBox() {
  return (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
      <path d="M448 341.333v-128H320v128h128zm-128-128V85.333h-128v128h128zm0-128H192v-128h128v128zm-128 128v128h128v-128H192zm0 128H64v128h128v-128z"></path>
    </svg>
  );
}
