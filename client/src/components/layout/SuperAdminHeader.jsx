import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaBell,
  FaSignOutAlt,
  FaGlobe,
  FaUniversity,
  FaUsersCog,
  FaFileInvoice,
  FaShieldAlt,
  FaFile,
  FaTrash,
  FaCheck,
  FaChevronDown,
  FaUserCog,
  FaClock
} from 'react-icons/fa';
import logoImg from '../../assets/logo/logo.png';
import notificationApi from '../../api/notificationApi';
import authApi from '../../api/authApi';
import toast from 'react-hot-toast';
import { getUploadBaseUrl } from '../../utils/apiConfig';

export default function SuperAdminHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const uploadBase = getUploadBaseUrl();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const prevUnreadCount = useRef(0);

  const [user, setUser] = useState(() => {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : {};
  });

  const fetchNotifications = async (isFirstLoad = false) => {
    try {
      const res = await notificationApi.my();
      if (res.success) {
        const newUnread = res.data.filter(n => !n.read).length;

        if (!isFirstLoad && newUnread > prevUnreadCount.current) {
          const latest = res.data.find(n => !n.read);
          if (latest) {
            toast.success(`System Alert: ${latest.title}`, {
              icon: '🚨',
              style: {
                borderRadius: '12px',
                background: '#ef4444',
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

  const handleMarkRead = async (e, id) => {
    if (e) e.stopPropagation();
    try {
      // Optimistic UI update
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      await notificationApi.markRead(id);
      fetchNotifications(true);
    } catch (err) {
      console.error('Failed to mark read:', err);
      fetchNotifications(true); // Revert on failure
    }
  };

  const handleDeleteNotification = async (e, id) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.delete(id);
      fetchNotifications(true);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(false), 30000);

    const handleStorageChange = () => {
      const userString = localStorage.getItem('user');
      if (userString) setUser(JSON.parse(userString));
    };
    window.addEventListener('storage', handleStorageChange);

    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const mainNavItems = [
    { path: '/super-admin-dashboard', label: 'Command Center', icon: FaGlobe },
    { path: '/super-admin/students', label: 'Global Students', icon: FaUsersCog },
    { path: '/super-admin/proctors', label: 'Staff Directory', icon: FaShieldAlt },
    { path: '/super-admin/buildings', label: 'Infrastructure', icon: FaUniversity },
    { path: '/super-admin/application-control', label: 'Window', icon: FaClock }
  ];

  const moreNavItems = [
    { path: '/super-admin/reports', label: 'Analytics', icon: FaFileInvoice },
    { path: '/super-admin/operational-reports', label: 'Reports', icon: FaFile },
  ];

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutsideMore = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideMore);
    return () => document.removeEventListener('mousedown', handleClickOutsideMore);
  }, []);

  return (
    <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="AAU Logo" className="h-10 w-auto object-contain drop-shadow-sm" />
          <div className="flex flex-col">
            <p className="text-slate-900 dark:text-white font-black text-xs tracking-tight whitespace-nowrap uppercase leading-none">Super Admin Console</p>
            <span className="text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-[0.2em] mt-1">Global Control</span>
          </div>
        </div>

        {/* Navigation (Center) - visible on lg up */}
        <nav className="hidden lg:flex items-center justify-center gap-1.5 flex-1 mx-8">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            // Match exactly or starts with for active state
            const isActive = location.pathname.startsWith(item.path) && (item.path !== '/super-admin-dashboard' || location.pathname === '/super-admin-dashboard');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 font-bold transition-all text-xs px-4 py-2.5 rounded-full ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                {item.label}
              </Link>
            );
          })}

          {/* More Dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex items-center gap-2 font-bold transition-all text-xs px-4 py-2.5 rounded-full ${
                moreNavItems.some(item => location.pathname.startsWith(item.path)) || showMoreMenu
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              More
              <FaChevronDown className={`w-3 h-3 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showMoreMenu && (
              <div className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50">
                {moreNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMoreMenu(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-colors ${
                        isActive 
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right side (Profile, Notifications, Logout) */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative dropdown-container" ref={notificationRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileDropdown(false);
              }}
              className="relative p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <FaBell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950 animate-pulse"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">System Alerts</h3>
                  <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">{unreadCount} New</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                      No alerts
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                      {notifications.slice(0, 10).map((n) => (
                        <div
                          key={n._id}
                          className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group relative ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                          onClick={(e) => !n.read && handleMarkRead(e, n._id)}
                        >
                          {!n.read && (
                            <div className="absolute right-4 top-4 w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-500/20" />
                          )}
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                              <FaFile className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white mb-0.5 truncate">{n.title}</p>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{n.message}</p>
                              <div className="flex items-center gap-2 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!n.read && (
                                  <button
                                    onClick={(e) => handleMarkRead(e, n._id)}
                                    className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white rounded flex items-center gap-1"
                                  >
                                    <FaCheck className="w-2 h-2" /> Read
                                  </button>
                                )}
                                <button
                                  onClick={(e) => handleDeleteNotification(e, n._id)}
                                  className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded flex items-center gap-1"
                                >
                                  <FaTrash className="w-2 h-2" /> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0 overflow-hidden">
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture.startsWith('http') ? user.profilePicture : `${uploadBase}/${user.profilePicture}`} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.classList.add('hidden'); e.target.nextElementSibling?.classList.remove('hidden'); }}
                  />
                ) : null}
                <span className={`text-blue-700 dark:text-blue-400 font-bold text-xs ${user.profilePicture ? 'hidden' : ''}`}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'S'}
                </span>
              </div>
              <div className="leading-tight pr-1 text-left hidden md:block">
                <p className="text-[11px] font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[100px]">{user.name || 'Manager'}</p>
                <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none">Global Admin</p>
              </div>
              <FaChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-300 ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Super Admin Profile Dropdown Menu */}
            {showProfileDropdown && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
                  <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight truncate">{user.email || 'Admin Account'}</p>
                  <p className="text-[9px] font-black text-blue-500 dark:text-blue-400 mt-0.5 uppercase tracking-widest">Master Identifier: {user.userID || 'N/A'}</p>
                </div>
                <div className="p-2">
                  <Link 
                    to="/super-admin/profile" 
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
                  >
                    <FaUserCog className="w-4 h-4 text-slate-400" />
                    Security Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  >
                    <FaSignOutAlt className="w-4 h-4" />
                    Sign Out System
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation (Scrollable) */}
      <div className="lg:hidden bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-2 p-2 px-4 w-max">
          {navItems.map((item) => {
             const Icon = item.icon;
             const isActive = location.pathname.startsWith(item.path) && (item.path !== '/super-admin-dashboard' || location.pathname === '/super-admin-dashboard');
             return (
               <Link
                 key={item.path}
                 to={item.path}
                 className={`flex items-center gap-2 font-bold transition-all text-xs px-4 py-2 rounded-full whitespace-nowrap ${
                   isActive
                     ? 'bg-blue-600 text-white shadow-sm'
                     : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                 }`}
               >
                 <Icon className={isActive ? 'text-white' : 'text-slate-400'} />
                 {item.label}
               </Link>
             );
           })}
        </nav>
      </div>
    </header>
  );
}
