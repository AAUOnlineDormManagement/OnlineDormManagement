import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  FaDoorOpen,
  FaFile,
  FaTools,
  FaUserGraduate,
  FaUsers,
  FaBuilding,
  FaClipboardList,
  FaArrowUp,
  FaArrowDown,
  FaCheckCircle,
  FaClock,
  FaChartLine,
  FaCalendarAlt,
  FaBell,
  FaSearch,
  FaEllipsisV,
  FaUserShield,
  FaCalendarPlus,
  FaStore,
  FaShieldAlt,
  FaPaperPlane,
  FaCheck
} from 'react-icons/fa';
import { HiOutlineDocumentReport } from 'react-icons/hi';
import { MdEventNote, MdDashboard } from 'react-icons/md';
import { IoSparkles } from 'react-icons/io5';
import operationalReportApi from '../api/operationalReportApi';
import BedIcon from '../components/common/BedIcon';
import adminApi from '../api/adminApi';
import authApi from '../api/authApi';
import ProfilePictureUpload from '../components/common/ProfilePictureUpload';

const quickActions = [
  { title: 'Assign Blocks', icon: MdEventNote, link: '/assign-blocks', color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50' },
  { title: 'Student Directory', icon: FaUsers, link: '/students', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
  { title: 'System Reports', icon: HiOutlineDocumentReport, link: '/reports', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
  { title: 'Staff Management', icon: FaUserShield, link: '/staff-management', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
  { title: 'Access Requests', icon: FaShieldAlt, link: '/access-requests', color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50' },
  { title: 'Window Control', icon: FaClock, link: '/application-control', color: 'from-rose-500 to-rose-600', bg: 'bg-rose-50' }
];


export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const user = authApi.getCurrentUser();

  useEffect(() => {
    // If student tries to access admin dashboard, redirect to student portal
    if (user?.role === 'Student') {
      window.location.href = '/student-portal';
    }
  }, [user]);

  const [recentReports, setRecentReports] = useState([]);

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
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const s = overview?.stats;
    return [
      { 
        title: 'Active Students', 
        value: s?.students ?? '-', 
        change: '+12%', 
        trend: 'up', 
        icon: FaUserGraduate, 
        color: 'text-indigo-600',
        bg: 'bg-indigo-50'
      },
      { 
        title: 'Occupancy Rate', 
        value: s ? `${s.occupancyRate}%` : '-', 
        change: 'Stable', 
        trend: 'neutral', 
        icon: BedIcon, 
        color: 'text-emerald-600',
        bg: 'bg-emerald-50'
      },
      { 
        title: 'Total Blocks', 
        value: overview?.buildings?.length ?? '-', 
        change: '7 buildings', 
        trend: 'neutral', 
        icon: FaBuilding, 
        color: 'text-amber-600',
        bg: 'bg-amber-50'
      },
      { 
        title: 'Pending Apps', 
        value: s?.pendingApplications ?? '-', 
        change: 'Need review', 
        trend: 'warning', 
        icon: FaFile, 
        color: 'text-rose-600',
        bg: 'bg-rose-50'
      }
    ];
  }, [overview]);

  const pendingApps = useMemo(() => overview?.pendingApplicationsList?.slice(0, 4) || [], [overview]);
  const occupancyPercent = overview?.stats?.occupancyRate ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-100 border-t-indigo-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-indigo-50 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section - Simplified but vibrant */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
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
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Welcome back, <span className="bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                  {user?.name?.split(' ')[0] || 'Admin'}
                </span>
              </h1>
              <p className="text-slate-500 text-sm mt-1">Here's what's happening with your dormitory today</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
              <FaBell className="text-slate-500" />
            </button>
            <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2">
              <IoSparkles className="text-sm" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Stats Grid - Clean cards with minimal design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center transition-transform group-hover:scale-105`}>
                    <Icon className={`text-xl ${item.color}`} />
                  </div>
                  {item.trend === 'up' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                      <FaArrowUp className="text-[10px]" /> {item.change}
                    </span>
                  )}
                  {item.trend === 'warning' && (
                    <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                      {item.change}
                    </span>
                  )}
                  {item.trend === 'neutral' && (
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                      {item.change}
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{item.title}</h3>
                <div className="text-3xl font-bold text-slate-800 tracking-tight">{item.value}</div>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid - 2 columns layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Occupancy Card - Simple donut */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FaChartLine className="text-indigo-500 text-sm" />
                Live Occupancy
              </h3>
              <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">Real-time</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="relative w-40 h-40 mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                    fill="none"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    stroke="#6366f1"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 72}
                    strokeDashoffset={2 * Math.PI * 72 * (1 - occupancyPercent / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-800">{occupancyPercent}%</span>
                  <span className="text-xs text-slate-500 mt-1">Occupied</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 w-full pt-4 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Assigned</p>
                  <p className="text-xl font-bold text-slate-800">{overview?.stats?.students || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Total Beds</p>
                  <p className="text-xl font-bold text-slate-800">{overview?.stats?.capacity || overview?.stats?.rooms * 2 || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions + Pending Apps */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MdDashboard className="text-indigo-500" />
                  Quick Actions
                </h3>
                <Link to="/students" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  View all <span className="text-lg">→</span>
                </Link>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {quickActions.map(action => (
                  <Link 
                    key={action.title}
                    to={action.link}
                    className="group p-4 rounded-xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 transition-all text-center"
                  >
                    <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                      <action.icon className={`text-lg ${action.color?.replace('from', 'text')?.split(' ')?.[0] || 'text-indigo-500'}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{action.title}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Pending Applications */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FaClock className="text-rose-500" />
                  Pending Applications
                </h3>
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                  {pendingApps.length} waiting
                </span>
              </div>
              
              {pendingApps.length === 0 ? (
                <div className="text-center py-8">
                  <FaCheckCircle className="text-emerald-500 text-3xl mx-auto mb-2" />
                  <p className="text-sm text-slate-500">All caught up! No pending applications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingApps.map(app => (
                    <Link 
                      key={app._id}
                      to={`/students/${app.student?._id}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center font-semibold text-indigo-600 text-sm">
                          {app.student?.fullName?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{app.student?.fullName}</p>
                          <p className="text-xs text-slate-500">{app.student?.department || 'Student'} • {app.student?.studentID}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">New</span>
                        <FaArrowUp className="text-slate-300 text-xs group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Operational Reports */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
               <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                     <FaClipboardList className="text-indigo-500" />
                     Recent Operational Reports
                  </h3>
                  <Link to="/operational-reports" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                     Full Portal <span className="text-lg">→</span>
                  </Link>
               </div>

               {recentReports.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No recent reports</p>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {recentReports.map(report => (
                        <div key={report._id} className="p-4 rounded-xl bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
                           <div className="flex items-center justify-between mb-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                 report.priority === 'Emergency' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                 {report.priority || 'Medium'}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{report.category}</span>
                           </div>
                           <h4 className="text-xs font-bold text-slate-800 truncate mb-1">{report.title}</h4>
                           <p className="text-[10px] text-slate-500 line-clamp-1">{report.sender?.fullName || 'Proctor'}</p>
                        </div>
                     ))}
                  </div>
               )}
            </div>
          </div>
          </div>
        
        {/* Simple Footer */}
        <div className="mt-10 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">Dormitory Management System © 2026</p>
        </div>

        {/* Floating Quick Report Button */}
        <Link 
          to="/operational-reports"
          className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 hover:bg-slate-900 text-white rounded-full flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] hover:shadow-xl transition-all hover:-translate-y-1 active:scale-95 group z-[40]"
          title="Send Operational Report to Super Admin"
        >
          <FaPaperPlane className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Escalate Report
          </span>
        </Link>
      </div>
    </div>
  );
}