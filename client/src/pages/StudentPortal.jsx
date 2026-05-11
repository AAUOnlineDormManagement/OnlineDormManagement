import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import studentDimage from "../assets/Student_Dashboard/studentdashboard.png";
import {
  FaBell,
  FaBuilding,
  FaUser,
  FaWrench,
  FaExclamationTriangle,
  FaSignOutAlt,
  FaDoorOpen,
  FaArrowRight,
  FaQuestionCircle,
  FaHeadset,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaHome,
  FaCalendarPlus,
  FaStore,
  FaBox,
  FaCalendarAlt,
  FaCog,
  FaChevronDown,
  FaInfoCircle
} from "react-icons/fa";
import studentApi from '../api/studentApi';
import authApi from '../api/authApi';
import { useTheme } from '../context/ThemeContext';
import { uploadUrl } from '../utils/uploadUrl';
import marketplaceApi from '../api/marketplaceApi';

import BuildingIcon from "../components/common/BuildingIcon";
import logoImg from '../assets/logo/logo.png';

function MarketplaceSection() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    marketplaceApi.listPublic({ limit: 3 }).then(data => setItems(data || [])).catch(() => {});
  }, []);
  if (items.length === 0) return null;
  return (
    <section className="mb-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
      <div className="glass-effect rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FaStore className="w-4 h-4 text-emerald-600" /> Campus Marketplace
          </h3>
          <Link to="/marketplace" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it._id} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm group hover:shadow-md transition-shadow">
              <div className="h-28 bg-emerald-50 relative">
                {it.image?.path ? (
                  <img src={uploadUrl(it.image.path)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-200">
                    <FaStore className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-gray-900 line-clamp-1">{it.title}</p>
                <p className="text-emerald-700 font-bold text-sm">{it.price} {it.currency || 'ETB'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{it.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


class StudentPortalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("StudentPortal Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong in the Portal</h1>
          <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto text-left mx-auto max-w-2xl">
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function StudentPortalWithBoundary() {
  return (
    <StudentPortalErrorBoundary>
      <StudentPortal />
    </StudentPortalErrorBoundary>
  );
}function StudentPortal() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const user = authApi.getCurrentUser();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await studentApi.getDashboard();
      if (response.success) {
        setDashboardData(response);
      } else {
        setError(response.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium animate-pulse">Initializing Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="glass-effect rounded-3xl p-10 max-w-md w-full text-center border border-rose-100 shadow-xl">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaExclamationTriangle className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Connection Lost</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">{error || 'We couldn\'t sync your dashboard data.'}</p>
          <button
            onClick={fetchDashboardData}
            className="w-full py-4 bg-premium-gradient text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
          >
            <FaClock className="w-4 h-4" />
            Reconnect Now
          </button>
        </div>
      </div>
    );
  }

  const { student, quickStats, quickActions, recentActivities, applicationSummary } = dashboardData || {};

  const enhancedActions = [...(quickActions || [])];
  if (['Student', 'Vendor', 'EventPoster'].includes(user?.role)) {
    if (user?.role !== 'EventPoster') {
      enhancedActions.push({
        title: 'Event Posting',
        icon: 'FaCalendarPlus',
        link: '/apply-event-poster',
        color: 'bg-violet-50 text-violet-600',
        description: 'Publish campus activities'
      });
    }
    if (user?.role === 'Student' && !student?.roomNumber) {
      enhancedActions.push({
        title: 'Dorm Placement',
        icon: 'FaBuilding',
        link: '/placement-request',
        color: 'bg-blue-50 text-blue-600',
        description: 'Apply for housing & fees'
      });
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED": return { bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", icon: <FaCheckCircle className="w-4 h-4" /> };
      case "IN_PROGRESS": case "IN PROGRESS": return { bg: "bg-sky-50 text-sky-700", dot: "bg-sky-500", icon: <FaClock className="w-4 h-4" /> };
      case "PENDING": return { bg: "bg-amber-50 text-amber-700", dot: "bg-amber-500", icon: <FaClock className="w-4 h-4" /> };
      case "REJECTED": return { bg: "bg-rose-50 text-rose-700", dot: "bg-rose-500", icon: <FaTimesCircle className="w-4 h-4" /> };
      default: return { bg: "bg-slate-50 text-slate-700", dot: "bg-slate-500", icon: <FaClock className="w-4 h-4" /> };
    }
  };

  const iconMap = { FaBuilding, FaUser, FaBell, FaExclamationTriangle, FaWrench, FaClock, FaCalendarPlus, FaStore, FaHistory: FaClock };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-700">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-premium-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <img src={logoImg} alt="AAU" className="w-8 h-8 object-contain brightness-0 invert" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight bg-clip-text text-transparent bg-premium-gradient">DormLife Portal</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Universe</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <Link to="/notices" className="relative p-2.5 rounded-2xl hover:bg-slate-100 transition-all group">
              <FaBell className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
              {quickStats?.notifications > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                  {quickStats.notifications}
                </span>
              )}
            </Link>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl bg-slate-50 border border-slate-200/60 hover:bg-white hover:shadow-md transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-premium-gradient flex items-center justify-center text-white font-black text-sm shadow-inner">
                  {user?.name?.charAt(0) || 'S'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-black text-slate-800 truncate max-w-[100px]">{student?.name?.split(' ')?.[0] || 'Student'}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{student?.studentId || 'ID'}</p>
                </div>
                <FaChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-3xl shadow-2xl shadow-blue-900/10 border border-slate-100 py-3 z-50 animate-fade-in origin-top-right">
                  <div className="px-4 py-2 border-b border-slate-50 mb-2">
                    <p className="text-xs font-black text-slate-900">{student?.name}</p>
                    <p className="text-[10px] text-slate-500">{student?.studentId}</p>
                  </div>
                  <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                    <FaUser className="w-4 h-4 text-slate-400 group-hover:text-blue-500" /> My Identity
                  </Link>
                  <Link to="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                    <FaCog className="w-4 h-4 text-slate-400 group-hover:text-blue-500" /> Preferences
                  </Link>
                  <div className="my-2 border-t border-slate-50" />
                  <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-all w-full text-left">
                    <FaSignOutAlt className="w-4 h-4" /> End Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Modern Status Alert */}
        {applicationSummary && (
          <section className="animate-fade-in">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-violet-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
              <div className="relative glass-effect rounded-3xl p-6 border border-white flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-blue-500/5">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                  <FaInfoCircle className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Status Intelligence</p>
                  <h3 className="text-lg font-black text-slate-900 mb-1">{applicationSummary.status}</h3>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed">{applicationSummary.message}</p>
                </div>
                <div className="shrink-0 flex gap-3">
                   {applicationSummary.status === 'PaymentPending' && (
                     <Link to="/placement-request" className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all">
                       Proceed to Payment
                     </Link>
                   )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Dynamic Hero Section */}
        <section className="relative animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Systems Online</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Hello, <span className="bg-clip-text text-transparent bg-premium-gradient">{student?.name?.split(" ")?.[0] || 'Explorer'}</span>.
              </h1>
              <p className="text-lg text-slate-500 font-medium max-w-xl leading-relaxed">
                Welcome to your centralized dormitory command center. Manage your residency, track requests, and stay connected with campus life.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="glass-effect rounded-2xl p-4 border border-slate-200 min-w-[140px] hover-lift">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Unit</p>
                  <p className="text-lg font-black text-slate-800">{student?.building || 'Pending'}</p>
                </div>
                <div className="glass-effect rounded-2xl p-4 border border-slate-200 min-w-[140px] hover-lift">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Room Vector</p>
                  <p className="text-lg font-black text-slate-800">{student?.roomNumber || 'None'}</p>
                </div>
                <div className="glass-effect rounded-2xl p-4 border border-slate-200 min-w-[140px] hover-lift">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Residence Status</p>
                  <p className="text-lg font-black text-emerald-600">{student?.status || 'Active'}</p>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-5 hidden lg:block relative">
              <div className="absolute inset-0 bg-blue-600/5 blur-[120px] rounded-full"></div>
              <img 
                src={studentDimage} 
                alt="Student Life" 
                className="relative z-10 w-full h-auto drop-shadow-2xl animate-float"
              />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: Quick Links & Marketplace */}
          <div className="lg:col-span-2 space-y-10">
            {/* Action Grid */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                  Core Operations
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {enhancedActions?.map((action, idx) => {
                  const Icon = iconMap[action.icon] || FaBuilding;
                  return (
                    <Link 
                      key={idx} 
                      to={action.link}
                      className="group relative glass-effect rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover-lift transition-all duration-500 overflow-hidden"
                    >
                      <div className={`absolute top-0 right-0 w-32 h-32 ${action.color?.split(' ')?.[0] || 'bg-blue-50'} opacity-5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`}></div>
                      <div className="relative z-10 flex items-start gap-5">
                        <div className={`w-14 h-14 rounded-2xl ${action.color || 'bg-blue-50 text-blue-600'} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{action.title}</h4>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">{action.description}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                          <FaArrowRight className="w-3 h-3 text-blue-600" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Marketplace & Events Section */}
            <MarketplaceSection />
          </div>

          {/* Right: Activity & Meta */}
          <div className="space-y-10">
            {/* Timeline Activity */}
            <section className="glass-effect rounded-[2.5rem] p-8 border border-white shadow-2xl shadow-slate-200/50">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Pulse</h3>
                <Link to="/activity" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View Log</Link>
              </div>
              
              <div className="space-y-8">
                {recentActivities?.length > 0 ? recentActivities.map((activity, idx) => {
                  const status = getStatusColor(activity.status);
                  return (
                    <div key={idx} className="relative pl-8 group">
                      {idx !== recentActivities.length - 1 && (
                        <div className="absolute left-[7px] top-8 bottom-[-24px] w-0.5 bg-slate-100"></div>
                      )}
                      <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white ${status.dot} shadow-sm z-10 group-hover:scale-125 transition-transform`}></div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-800">{activity.title}</h4>
                          <span className="text-[10px] font-bold text-slate-400">{activity.timeAgo}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium line-clamp-1">{activity.description || "Activity logged successfully."}</p>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${status.bg}`}>
                          {status.icon}
                          {activity.status}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <FaHistory className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">No recent signals detected.</p>
                  </div>
                )}
              </div>
              
              <div className="mt-10 pt-8 border-t border-slate-50">
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Alerts</p>
                     <p className="text-lg font-black text-slate-800">{quickStats?.notifications || 0}</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Messages</p>
                     <p className="text-lg font-black text-slate-800">0</p>
                   </div>
                </div>
              </div>
            </section>

            {/* Assistance Card */}
            <section className="bg-premium-gradient rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
              <div className="relative z-10 space-y-6">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center">
                  <FaHeadset className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black mb-2">Need Support?</h3>
                  <p className="text-sm text-blue-100 font-medium leading-relaxed mb-8">
                    Our digital assistance team is ready to resolve any infrastructure or administrative challenges.
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <Link to="/help" className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-center text-sm shadow-lg hover:bg-blue-50 transition-colors">
                      Enter Help Center
                    </Link>
                    <Link to="/contact" className="w-full py-4 bg-transparent border-2 border-white/30 rounded-2xl font-black text-center text-sm hover:bg-white/10 transition-colors">
                      Contact Direct
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Global Style Inject for Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}