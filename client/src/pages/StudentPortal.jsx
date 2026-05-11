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
  FaChevronDown
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
}

function StudentPortal() {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-gray-800 mb-2">{error || 'Failed to load dashboard'}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { student, quickStats, quickActions, recentActivities, applicationSummary, recentEvents } = dashboardData || {};

  const enhancedActions = [
    ...(quickActions || [])
  ];

  // Add application actions if user doesn't have the role yet
  if (['Student', 'Vendor', 'EventPoster'].includes(user?.role)) {
    if (user?.role !== 'EventPoster') {
      enhancedActions.push(
        { title: 'Apply for Event Posting', icon: 'FaCalendarPlus', link: '/apply-event-poster', color: 'bg-rose-50 text-rose-600', description: 'Get permission to post campus events' }
      );
    }
    // Always show Dorm Placement for students if they don't have a room yet
    if (user?.role === 'Student' && !student?.roomNumber) {
      enhancedActions.push(
        { title: 'Dorm Placement', icon: 'FaBuilding', link: '/placement-request', color: 'bg-blue-50 text-blue-600', description: 'Apply for housing & pay fees' }
      );
    }
  }

  // Function to get status color based on status
  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return {
          bg: "bg-green-100",
          text: "text-green-700",
          dot: "bg-green-500",
          icon: <FaCheckCircle className="w-3 h-3 text-green-500" />
        };
      case "IN_PROGRESS":
      case "IN PROGRESS":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
          dot: "bg-blue-500",
          icon: <FaClock className="w-3 h-3 text-blue-500" />
        };
      case "PENDING":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          dot: "bg-yellow-500",
          icon: <FaClock className="w-3 h-3 text-yellow-500" />
        };
      case "REJECTED":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
          dot: "bg-red-500",
          icon: <FaTimesCircle className="w-3 h-3 text-red-500" />
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-700",
          dot: "bg-gray-500",
          icon: <FaClock className="w-3 h-3 text-gray-500" />
        };
    }
  };

  // Map icon names to components
  const iconMap = {
    FaBuilding,
    FaUser,
    FaBell,
    FaExclamationTriangle,
    FaWrench,
    FaClock,
    FaCalendarPlus,
    FaStore,
    FaHistory: FaClock
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-2 py-3 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-0">
            <img src={logoImg} alt="AAU Logo" className="h-12 w-auto object-contain" />

            <div>
              <p className="text-gray-900 font-bold text-base leading-tight">
                DormLife Portal
              </p>
              <p className="text-xs text-gray-500">Student Dashboard</p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">


            {/* Notification */}
            <Link
              to="/notices"
              className="relative p-1.5 rounded-xl hover:bg-gray-100 transition"
            >
              <FaBell className="w-4 h-4 text-gray-700" />
              {quickStats?.notifications > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {quickStats.notifications}
                </span>
              )}
            </Link>

            {/* User Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-xl transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-white border flex items-center justify-center text-gray-700 font-bold text-xs">
                  {user?.name?.charAt(0) || 'S'}
                </div>
                <div className="hidden md:block leading-tight text-left">
                  <p className="text-[10px] font-bold text-gray-900 truncate max-w-[80px]">
                    {student?.name || 'Student'}
                  </p>
                  <p className="text-[10px] text-gray-500">{student?.studentId || 'ID'}</p>
                </div>
                <FaChevronDown className={`w-2.5 h-2.5 text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Link to="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                    <FaUser className="w-3.5 h-3.5 text-gray-400" />
                    <span>My Profile</span>
                  </Link>
                  <Link to="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                    <FaCog className="w-3.5 h-3.5 text-gray-400" />
                    <span>Settings</span>
                  </Link>
                  
                  {/* Dynamic Access Link */}
                  {['Student', 'Vendor'].includes(user?.role) && user?.role !== 'EventPoster' && (
                    <Link to="/apply-event-poster" className="flex items-center gap-3 px-4 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 transition border-t border-gray-50 mt-1">
                      <FaCalendarPlus className="w-3.5 h-3.5" />
                      <span>Apply Event Access</span>
                    </Link>
                  )}

                  <div className="my-1 border-t border-gray-50" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition w-full text-left"
                  >
                    <FaSignOutAlt className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center gap-1.5 transition text-sm"
            >
              <FaSignOutAlt className="w-3 h-3" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* What's happening now */}
        {applicationSummary && (
          <section className="mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="glass-effect rounded-2xl p-5 shadow-sm">

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">What’s happening now</h3>
                  <p className="text-sm text-gray-700">{applicationSummary.message}</p>
                  {Array.isArray(applicationSummary.nextSteps) && applicationSummary.nextSteps.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-gray-600 list-disc pl-5">
                      {applicationSummary.nextSteps.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    {applicationSummary.status}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Dashboard Header Section with Image Floating Outside Card */}
        <section className="relative mb-20 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="relative">
            {/* Welcome Card - Compact */}
            <div className="glass-effect rounded-2xl p-4 shadow-sm relative z-10 mt-16 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-premium-gradient"></div>

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                {/* Left: Welcome Text */}
                <div className="lg:w-4/5">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    Welcome, {student?.name?.split(" ")[0] || 'Student'}!
                  </h2>

                  <p className="text-gray-600 mb-6 max-w-2xl text-sm">
                    This is your personalized dashboard, designed to help you manage
                    your dormitory life effortlessly.
                  </p>

                  <div className="flex flex-wrap gap-x-8 gap-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Student ID</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {student?.studentId || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Status</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {student?.status || 'Active'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Dormitory</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {student?.dormitory || 'Not Assigned'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-0.5">Room</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {student?.roomNumber || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Illustration */}
            <div className="absolute -top-28 -right-8 z-20 hidden lg:block pointer-events-none">
              <img
                src={studentDimage}
                alt="Student Illustration"
                className={`w-96 h-auto drop-shadow-xl transition-all duration-500 ${
                  theme === 'dark' ? 'brightness-90 contrast-110 grayscale-[0.1]' : ''
                }`}
              />

            </div>
          </div>
        </section>

        {/* Dormitory Status Section */}
        <section className="mb-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="glass-effect rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">

              Dormitory Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BuildingIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Building</p>
                    <p className="text-base font-bold text-gray-900">{student?.building || student?.dormitory || 'Not Assigned'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FaDoorOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Room Number</p>
                    <p className="text-base font-bold text-gray-900">{student?.roomNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FaUser className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Student ID</p>
                    <p className="text-base font-bold text-gray-900">{student?.studentId || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Status</p>
                    <p className="text-base font-bold text-gray-900">{student?.status || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Creative Side-by-Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column: Quick Actions & Need Assistance */}
          <div className="space-y-6">
            {/* Quick Actions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
                <Link
                  to="/all-actions"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  View All <FaArrowRight className="w-2.5 h-2.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {enhancedActions?.map((action, index) => {
                  const IconComponent = iconMap[action.icon] || FaBuilding;
                  return (
                    <Link
                      key={index}
                      to={action.link}
                      className="group relative overflow-hidden glass-effect rounded-xl p-4 shadow-sm hover-lift transition-all duration-300"
                    >

                      <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>

                      <div className="relative flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                          <IconComponent className="w-4 h-4 text-blue-600" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                              {action.title}
                            </h4>
                            {action.badge && (
                              <span className="px-1.5 py-0.5 bg-blue-500 text-white rounded-full text-xs font-bold">
                                {action.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {action.description}
                          </p>
                        </div>
                      </div>

                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <FaArrowRight className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Help Section & Quick Tips Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Quick Tips Card */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <FaQuestionCircle className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Quick Tips</h4>
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-1.5 text-xs text-gray-700">
                    <span className="text-blue-500 mt-0.5">•</span>
                    Submit maintenance requests early for faster resolution
                  </li>
                  <li className="flex items-start gap-1.5 text-xs text-gray-700">
                    <span className="text-blue-500 mt-0.5">•</span>
                    Check your notices tab daily for important updates
                  </li>
                  <li className="flex items-start gap-1.5 text-xs text-gray-700">
                    <span className="text-blue-500 mt-0.5">•</span>
                    Update your profile before applying for room changes
                  </li>
                </ul>
              </div>

              {/* Need Assistance Card */}
              <div className="bg-gradient-to-br from-blue-200 to-blue-300 rounded-xl border border-blue-600 p-4 text-black">
                <div className="flex items-center gap-1.5 mb-2">
                  <FaHeadset className="w-4 h-4 text-white" />
                  <h4 className="text-sm font-semibold">Need Assistance?</h4>
                </div>
                <p className="text-black-100 text-xs mb-3">
                  Our support team is available to help you with any questions or issues.
                </p>
                <div className="space-y-1.5">
                  <Link
                    to="/help"
                    className="block w-full text-center px-3 py-1.5 bg-blue-400 text-black-600 rounded-lg font-medium hover:bg-blue-50 transition-colors text-xs"
                  >
                    Visit Help Center
                  </Link>
                  <Link
                    to="/contact"
                    className="block w-full text-center px-3 py-1.5 bg-transparent border border-black text-white rounded-lg font-medium hover:bg-white/10 transition-colors text-xs"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Recent Activity */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
              <Link
                to="/activity"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                View All <FaArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>

            <div className="glass-effect rounded-xl overflow-hidden shadow-sm">

              <div className="divide-y divide-gray-100">
                {recentActivities?.map((activity, index) => {
                  const statusColor = getStatusColor(activity.status);
                  return (
                    <div
                      key={index}
                      className="p-4 hover:bg-gray-50 transition-colors duration-200 group"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium text-gray-800 truncate">
                            {activity.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                            {activity.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            {activity.type === "maintenance" && "Maintenance Request"}
                            {activity.type === "payment" && "Payment"}
                            {activity.type === "application" && "Application"}
                            {activity.type === "complaint" && "Complaint"}
                            {activity.id && ` #${activity.id}`}
                          </div>
                          <div className="text-xs text-gray-400">
                            {activity.timeAgo}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Status Summary */}
              <div className="bg-blue-50 p-3 border-t border-blue-100">
                <div className="flex items-center gap-3 text-xs">
                  {recentActivities && recentActivities.length > 0 ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600">Completed: {recentActivities.filter(a => a.status === 'COMPLETED').length}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-600">In Progress: {recentActivities.filter(a => a.status.includes('PROGRESS')).length}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-gray-600">Pending: {recentActivities.filter(a => a.status === 'PENDING').length}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-gray-600">Rejected: {recentActivities.filter(a => a.status === 'REJECTED').length}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-600">No recent activities</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}