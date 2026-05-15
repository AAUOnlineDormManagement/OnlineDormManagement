import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import notificationApi from '../../../api/notificationApi';
import {
  FaBuilding,
  FaBell,
  FaUser,
  FaWrench,
  FaExclamationTriangle,
  FaSignOutAlt,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaHome,
  FaCalendarAlt,
  FaSearch,
  FaCog,
  FaQuestionCircle,
  FaUsers,
  FaClipboardCheck,
  FaDoorOpen,
  FaChartBar,
  FaTachometerAlt,
  FaFile,
  FaQrcode,
  FaTrash,
  FaCheck
} from 'react-icons/fa';
import logoImg from '../../../assets/logo/logo.png';



const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: FaTachometerAlt,
    path: '/proctor/dashboard',
    hasNotification: false
  },

  {
    id: 'students',
    label: 'Student Directory',
    icon: FaUsers,
    path: '/proctor/student-list',
    hasNotification: false
  },
  {
    id: 'tasks',
    label: 'Task Management',
    icon: FaClipboardCheck,
    submenu: [
      {
        id: 'complaints',
        label: 'Student Complaints',
        icon: FaExclamationTriangle,
        path: '/proctor/complaints',
      },
      {
        id: 'maintenance',
        label: 'Maintenance Requests',
        icon: FaWrench,
        path: '/proctor/maintenance',
      },
      {
        id: 'exit-clearance',
        label: 'Exit Clearance',
        icon: FaDoorOpen,
        path: '/proctor/exit-clearance',
      },
    ]
  },
  {
    id: 'reports-system',
    label: 'Reports System',
    icon: FaFile,
    submenu: [
      {
        id: 'submit-report',
        label: 'Submit Report',
        icon: FaPaperPlane,
        path: '/proctor/submit-report',
      },
      {
        id: 'my-reports',
        label: 'My Reports',
        icon: FaFileAlt,
        path: '/proctor/my-reports',
      },
      {
        id: 'operational-reports',
        label: 'Operational',
        icon: FaChartBar,
        path: '/proctor/operational-reports',
      }
    ]
  }
];

export default function ProctorTopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadCount = useRef(0);

  const fetchNotifications = async (isFirstLoad = false) => {
    try {
      const res = await notificationApi.my();
      if (res.success) {
        const newUnread = res.data.filter(n => !n.read).length;

        if (!isFirstLoad && newUnread > prevUnreadCount.current) {
          const latest = res.data.find(n => !n.read);
          if (latest) {
            toast.success(`New Request: ${latest.title}`, {
              icon: '🚨',
              style: {
                borderRadius: '12px',
                background: '#312e81',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 'bold'
              },
            });
          }
        }

        setNotifications(res.data);
        setUnreadCount(newUnread);
        prevUnreadCount.current = newUnread;
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (e, id) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markRead(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };
  
  const handleDeleteNotification = async (e, id) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.delete(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleMenuClick = (item) => {
    if (item.path) {
      navigate(item.path);
      setActiveDropdown(null);
    } else if (item.submenu) {
      setActiveDropdown(activeDropdown === item.id ? null : item.id);
    }
  };

  const handleSubmenuClick = (path) => {
    navigate(path);
    setActiveDropdown(null);
  };

  const isActive = (path) => location.pathname === path;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
      if (userDropdownOpen && !event.target.closest('.user-dropdown-container')) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown, userDropdownOpen]);

  return (
    <nav className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
      <div className="max-w-none mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex items-center gap-0">
              <img src={logoImg} alt="AAU Logo" className="h-12 w-auto object-contain" />
              <div className="leading-tight">
                <span className="block text-slate-900 font-bold text-[13px]">
                  Addis Ababa University
                </span>
                <span className="block text-slate-800 font-semibold text-[11px]">
                  Online Dormitory Management System
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 dropdown-container">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isItemActive = isActive(item.path) ||
                (item.submenu && item.submenu.some(sub => isActive(sub.path)));
              const isDropdownOpen = activeDropdown === item.id;

              return (
                <div key={item.id} className="relative dropdown-container">
                  <button
                    onClick={() => handleMenuClick(item)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isItemActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.hasNotification && !isItemActive && (
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    )}
                    {item.submenu && (
                      isDropdownOpen ? (
                        <FaChevronUp className="w-3 h-3" />
                      ) : (
                        <FaChevronDown className="w-3 h-3" />
                      )
                    )}
                  </button>

                  {/* Submenu Dropdown */}
                  {item.submenu && isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 dropdown-container">
                      {item.submenu.map((subItem) => (
                        <button
                          key={subItem.path}
                          onClick={() => handleSubmenuClick(subItem.path)}
                          className={`flex items-center gap-3 w-full px-4 py-3 text-sm text-left transition-colors ${isActive(subItem.path)
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                          {subItem.icon && (
                            <subItem.icon className="w-4 h-4 text-slate-400" />
                          )}
                          <span>{subItem.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Side - User & Notifications */}
          <div className="flex items-center gap-4">
            {/* Search Button */}
            <button className="p-2 text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100">
              <FaSearch className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <div className="relative dropdown-container">
              <button
                onClick={() => setActiveDropdown(activeDropdown === 'notifications' ? null : 'notifications')}
                className="relative p-2 text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <FaBell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {activeDropdown === 'notifications' && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[100]">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">System Alerts</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{unreadCount} New Requests</p>
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <FaBell className="text-slate-300 w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">All clear!</p>
                        <p className="text-[10px] text-slate-300 mt-1 uppercase tracking-widest font-black">No pending updates</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {notifications.slice(0, 10).map((notif) => (
                          <div
                            key={notif._id}
                            className={`p-4 hover:bg-indigo-50/30 transition-colors cursor-pointer relative group ${!notif.read ? 'bg-indigo-50/10' : ''}`}
                            onClick={(e) => !notif.read && handleMarkRead(e, notif._id)}
                          >
                            <div className="flex gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.type === 'Maintenance' ? 'bg-amber-50 text-amber-600' :
                                notif.type === 'Complaint' ? 'bg-rose-50 text-rose-600' :
                                  notif.type === 'ExitClearance' ? 'bg-indigo-50 text-indigo-600' :
                                    'bg-slate-50 text-slate-600'
                                }`}>
                                {notif.type === 'Maintenance' ? <FaWrench className="w-4 h-4" /> :
                                  notif.type === 'Complaint' ? <FaExclamationTriangle className="w-4 h-4" /> :
                                    <FaBell className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">
                                    {notif.title}
                                  </p>
                                  <span className="text-[9px] font-bold text-slate-400 shrink-0">
                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                  {notif.message}
                                </p>
                                <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!notif.read && (
                                    <button
                                      onClick={(e) => handleMarkRead(e, notif._id)}
                                      className="px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1"
                                    >
                                      <FaCheck className="w-2.5 h-2.5" /> Read
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => handleDeleteNotification(e, notif._id)}
                                    className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-1"
                                  >
                                    <FaTrash className="w-2.5 h-2.5" /> Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                            {!notif.read && (
                              <div className="absolute right-4 top-4 w-2 h-2 bg-indigo-600 rounded-full group-hover:scale-125 transition-transform" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                    <button
                      onClick={() => setActiveDropdown(null)}
                      className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* User Dropdown */}
            <div className="relative user-dropdown-container">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <FaUser className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-slate-800">{JSON.parse(localStorage.getItem('user'))?.name || 'Proctor'}</p>
                  <p className="text-xs text-slate-500">{JSON.parse(localStorage.getItem('user'))?.campus || 'Staff'}</p>
                </div>
                <FaChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 user-dropdown-container">
                  <Link
                    to="/proctor/profile"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <FaUser className="w-4 h-4 text-slate-400" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    to="/proctor/settings"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <FaCog className="w-4 h-4 text-slate-400" />
                    <span>Settings</span>
                  </Link>
                  <div className="border-t border-slate-200 my-1"></div>
                  <Link
                    to="/logout"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    <FaSignOutAlt className="w-4 h-4" />
                    <span>Logout</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-slate-200 mt-2 pt-2">
          <div className="flex justify-between items-center overflow-x-auto pb-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isItemActive = isActive(item.path) ||
                (item.submenu && item.submenu.some(sub => isActive(sub.path)));

              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 min-w-16 ${isItemActive
                    ? 'text-indigo-600'
                    : 'text-slate-600'
                    }`}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {item.hasNotification && !isItemActive && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500"></span>
                    )}
                  </div>
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Submenu Dropdown */}
          {activeDropdown && (
            <div className="mt-2 bg-white rounded-lg border border-slate-200 shadow-sm p-2">
              {menuItems
                .find(item => item.id === activeDropdown)
                ?.submenu?.map((subItem) => (
                  <button
                    key={subItem.path}
                    onClick={() => handleSubmenuClick(subItem.path)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm text-left transition-colors ${isActive(subItem.path)
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    {subItem.icon && (
                      <subItem.icon className="w-4 h-4 text-slate-400" />
                    )}
                    <span>{subItem.label}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}