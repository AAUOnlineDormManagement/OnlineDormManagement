import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FaGlobe,
  FaUniversity,
  FaShieldAlt,
  FaChartBar,
  FaUsersCog,
  FaServer,
  FaDatabase,
  FaChevronRight,
  FaArrowUp,
  FaFileInvoice,
  FaCogs,
  FaBell,
  FaChartLine,
  FaClipboardList,
  FaExclamationTriangle,
  FaFile,
  FaCheckCircle,
  FaClock,
  FaPaperPlane,
  FaCheck,
  FaSpinner
} from 'react-icons/fa';
import operationalReportApi from '../api/operationalReportApi';
import adminApi from '../api/adminApi';
import authApi from '../api/authApi';
import ProfilePictureUpload from '../components/common/ProfilePictureUpload';
import adminDormApi from '../api/adminDormApi';
import toast from 'react-hot-toast';

const quickActions = [
  { title: 'Admin Management', icon: FaUsersCog, link: '/super-admin/proctors', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { title: 'Building Logistics', icon: FaUniversity, link: '/super-admin/buildings', color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { title: 'Global Inventory', icon: FaFileInvoice, link: '/super-admin/reports', color: 'from-red-500 to-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  { title: 'Security Protocols', icon: FaShieldAlt, link: '/super-admin-dashboard', color: 'from-slate-600 to-slate-700', bg: 'bg-slate-100 dark:bg-slate-800' },
  { title: 'Role Access', icon: FaShieldAlt, link: '/super-admin/access-requests', color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { title: 'Window Control', icon: FaClock, link: '/super-admin/application-control', color: 'from-rose-500 to-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' }
];


export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const user = authApi.getCurrentUser();

  const [recentReports, setRecentReports] = useState([]);
  const [notifyText, setNotifyText] = useState('');
  const [isDormOpen, setIsDormOpen] = useState(false);
  const [updatingOpenState, setUpdatingOpenState] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [overviewData, reportsData] = await Promise.all([
          adminApi.overview(),
          operationalReportApi.getAll()
        ]);
        if (!alive) return;
        setOverview(overviewData);
        setRecentReports((reportsData || []).slice(0, 5));
        const cfg = await adminDormApi.getGlobalApplicationConfig();
        setIsDormOpen(Boolean(cfg?.data?.isOpen));
        setNotifyText(cfg?.data?.announcement || '');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const stats = [
    { label: 'Total Campuses', value: '4', change: 'Stable', trend: 'neutral', icon: FaUniversity, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'System Uptime', value: '99.9%', change: '+0.1%', trend: 'up', icon: FaServer, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Database Health', value: 'Optimal', change: 'All Good', trend: 'neutral', icon: FaDatabase, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Active Sessions', value: '1.2k', change: '+124', trend: 'up', icon: FaShieldAlt, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' }
  ];

  const handleNotifyAllAndToggle = async () => {
    try {
      setUpdatingOpenState(true);
      const res = await adminDormApi.updateGlobalApplicationConfig({
        announcement: notifyText,
        isOpen: isDormOpen,
      });
      toast.success(res?.message || 'Updated and notified all users');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to notify users');
    } finally {
      setUpdatingOpenState(false);
    }
  };

  if (loading) {
     return (
       <div className="flex items-center justify-center min-h-[60vh] bg-slate-50 dark:bg-slate-950">
         <div className="relative">
           <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-500"></div>
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/50 animate-pulse"></div>
           </div>
         </div>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <ProfilePictureUpload 
                currentImage={user?.profilePicture}
                onUploadSuccess={(newPath) => {
                  const updated = { ...user, profilePicture: newPath };
                  localStorage.setItem('user', JSON.stringify(updated));
                  window.location.reload();
                }}
                size="medium"
              />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Master Command, <span className="bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">
                  {user?.name?.split(' ')[0] || 'SuperAdmin'}
                </span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Addis Ababa University • Central Management Node</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
              <FaBell />
            </button>
            <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20">
              <FaCogs className="text-sm" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
           {/* Quick Actions at Top Header */}
           <div className="lg:col-span-3 bg-white dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                 <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <FaGlobe className="text-blue-500 text-xl" />
                    Global Access
                 </h2>
                 <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                 {quickActions.map((action) => (
                    <Link
                       key={action.title}
                       to={action.link}
                       className={`flex flex-col items-center justify-center p-4 rounded-xl ${action.bg} border border-transparent hover:border-slate-200 dark:hover:border-slate-700 dark:border-slate-800 hover:shadow-md transition-all group`}
                    >
                       <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${action.color} text-white flex items-center justify-center mb-3 shadow-lg group-hover:-translate-y-1 transition-transform`}>
                          <action.icon className="text-xl" />
                       </div>
                       <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">{action.title}</span>
                    </Link>
                 ))}
              </div>
           </div>
        </div>



        {/* Stats Grid - MATCHING Admin Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="group bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center transition-transform group-hover:scale-105 border border-slate-100 dark:border-slate-800`}>
                    <Icon className={`text-xl ${item.color}`} />
                  </div>
                  {item.trend === 'up' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">
                      <FaArrowUp className="text-[10px]" /> {item.change}
                    </span>
                  )}
                  {item.trend === 'warning' && (
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-lg">
                      {item.change}
                    </span>
                  )}
                  {item.trend === 'neutral' && (
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                      {item.change}
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{item.label}</h3>
                <div className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{item.value}</div>
              </div>
            );
          })}
        </div>

        {/* Global Control Center */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FaBell className="text-blue-500" />
                Global Announcement
              </h2>
              <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest rounded-md">
                Notify All Users
              </span>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={notifyText}
                onChange={(e) => setNotifyText(e.target.value)}
                placeholder="Type an important message for all students, admins, and proctors..."
                className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              />
              <div className="flex items-center justify-end">
                <button
                  onClick={async () => {
                    if (!notifyText.trim()) return toast.error('Please enter a message');
                    try {
                      setUpdatingOpenState(true);
                      await adminDormApi.sendGlobalAnnouncement(notifyText);
                      toast.success('Announcement sent successfully!');
                      setNotifyText('');
                    } catch (err) {
                      toast.error('Failed to send announcement');
                    } finally {
                      setUpdatingOpenState(false);
                    }
                  }}
                  disabled={updatingOpenState}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {updatingOpenState ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                  Notify All
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FaCogs className="text-orange-500" />
                Dorm Status
              </h2>
            </div>
            
            <div className="flex flex-col items-center justify-center py-6 gap-6">
              <div 
                onClick={() => setIsDormOpen(!isDormOpen)}
                className={`w-24 h-12 rounded-full p-1 cursor-pointer transition-colors duration-300 relative ${isDormOpen ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`w-10 h-10 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${isDormOpen ? 'translate-x-12' : 'translate-x-0'}`}>
                  {isDormOpen ? <FaCheck className="text-emerald-500 text-xs" /> : <div className="w-2 h-2 bg-slate-300 rounded-full" />}
                </div>
              </div>
              
              <div className="text-center">
                <p className={`text-xl font-black uppercase tracking-widest ${isDormOpen ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {isDormOpen ? 'Applications Open' : 'Applications Closed'}
                </p>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  {isDormOpen ? 'Students can apply for placement' : 'Placement portal is currently disabled'}
                </p>
              </div>

              <button
                onClick={handleNotifyAllAndToggle}
                disabled={updatingOpenState}
                className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md ${
                  isDormOpen 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-none' 
                    : 'bg-slate-800 hover:bg-slate-900 text-white'
                } disabled:opacity-50`}
              >
                {updatingOpenState ? 'Saving...' : 'Apply Status Change'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8">
           {/* Live Campus Nodes */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                 <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <FaChartLine className="text-red-500 text-xl" />
                       Regional Node Status
                    </h2>
                    <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                       <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">All Systems Online</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['Main Campus', '6-Kilo', '5-Kilo', '4-Kilo'].map((campus, idx) => (
                       <div key={campus} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all group">
                          <div className="flex items-center gap-3 mb-4">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-md text-xs
                                 ${idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-red-500' : 'bg-slate-700'}
                             `}>
                                {idx + 1}
                             </div>
                             <div>
                                <p className="font-bold text-slate-800 dark:text-white text-xs">{campus}</p>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Active Node</p>
                             </div>
                          </div>
                          
                          <div className="space-y-2">
                             <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                <span>Occupancy</span>
                                <span className={idx === 2 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}>
                                  {(Math.random() * 30 + 70).toFixed(1)}%
                                </span>
                             </div>
                             <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full ${idx === 0 ? 'bg-blue-600' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-red-500' : 'bg-slate-500'}`} style={{ width: `${Math.random() * 30 + 70}%` }}></div>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Recent Operational Reports */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                 <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <FaClipboardList className="text-blue-500 text-xl" />
                       Recent Reports
                    </h2>
                    <Link to="/super-admin/operational-reports" className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest">
                       View All
                    </Link>
                 </div>

                 <div className="space-y-3">
                    {recentReports.length === 0 ? (
                       <div className="py-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                          No recent reports
                       </div>
                    ) : (
                       recentReports.map((report) => (
                          <div key={report._id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:shadow-sm transition-all group">
                             <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      report.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                   }`}>
                                      <FaExclamationTriangle className="text-xs" />
                                   </div>
                                   <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{report.title}</p>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">By: {report.sender?.fullName || 'Proctor'} • {report.campus || 'Main'}</p>
                                   </div>
                                </div>
                                <span className={`shrink-0 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                   report.priority === 'Emergency' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                   {report.priority || 'Medium'}
                                </span>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
