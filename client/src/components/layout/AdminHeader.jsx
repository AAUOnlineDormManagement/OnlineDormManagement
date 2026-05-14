import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaBell,
  FaSignOutAlt,
  FaUsers,
  FaHouseUser,
  FaChartPie,
  FaFile,
  FaTrash,
  FaCheck,
  FaChevronDown,
  FaUserCog,
  FaClock
} from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';
import BuildingIcon from '../common/BuildingIcon';
import logoImg from '../../assets/logo/logo.png';
import notificationApi from '../../api/notificationApi';
import toast from 'react-hot-toast';
import { getUploadBaseUrl } from '../../utils/apiConfig';

export default function AdminHeader() {
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
            toast.success(`Admin Alert: ${latest.title}`, {
              icon: '🛡️',
              style: {
                borderRadius: '12px',
                background: '#4338ca',
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
    { path: '/dashboard', label: 'Dashboard', icon: MdDashboard },
    { path: '/students', label: 'Students', icon: FaUsers },
    { path: '/staff-management', label: 'Proctors', icon: FaUsers },
    { path: '/building-management', label: 'Blocks', icon: FaHouseUser },
    { path: '/assign-blocks', label: 'Assignments', icon: FaFile },
    { path: '/application-control', label: 'Window', icon: FaClock },
  ];

  const moreNavItems = [
    { path: '/reports', label: 'Analytics', icon: FaChartPie },
    { path: '/operational-reports', label: 'Reports', icon: FaFile },
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
    <header className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-2 py-3 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="AAU Logo" className="h-10 w-auto object-contain drop-shadow-sm" />
          <div className="flex flex-col">
            <h1 className="text-slate-900 font-black text-xs tracking-tight whitespace-nowrap uppercase leading-none">Admin Console</h1>
            <span className="text-[9px] text-indigo-600 font-black uppercase tracking-[0.2em] mt-1">{user.role || 'Admin'}</span>
          </div>
        </div>

        {/* Navigation (Center) */}
        <nav className="hidden lg:flex items-center gap-4">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 font-semibold transition-colors text-sm px-3 py-2 rounded-lg ${
                  isActive
                    ? 'bg-primary-light text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {/* More Dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex items-center gap-2 font-semibold transition-colors text-sm px-3 py-2 rounded-lg ${
                moreNavItems.some(item => location.pathname.startsWith(item.path)) || showMoreMenu
                  ? 'bg-primary-light text-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              More
              <FaChevronDown className={`w-3 h-3 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showMoreMenu && (
              <div className="absolute top-full mt-1 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
                {moreNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMoreMenu(false)}
                      className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${
                        isActive ? 'text-primary bg-primary-light/50' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right side (Profile, Logout) */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative dropdown-container" ref={notificationRef}>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileDropdown(false);
              }}
              className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <FaBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Admin Alerts</h3>
                  <span className="text-[10px] font-bold bg-primary-light text-primary px-2 py-0.5 rounded-full">{unreadCount} New</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                      No alerts
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {notifications.slice(0, 10).map((n) => (
                        <div
                          key={n._id}
                          className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors group relative ${!n.read ? 'bg-blue-50/20' : ''}`}
                          onClick={(e) => !n.read && handleMarkRead(e, n._id)}
                        >
                          {!n.read && (
                            <div className="absolute right-4 top-4 w-2 h-2 bg-primary rounded-full animate-pulse shadow-sm shadow-primary/20" />
                          )}
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
                              <FaFile className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 mb-0.5 truncate">{n.title}</p>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{n.message}</p>
                              <div className="flex items-center gap-2 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!n.read && (
                                  <button
                                    onClick={(e) => handleMarkRead(e, n._id)}
                                    className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-primary text-white rounded flex items-center gap-1"
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
              className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-100 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 overflow-hidden">
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture.startsWith('http') ? user.profilePicture : `${uploadBase}/${user.profilePicture}`} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.classList.add('hidden'); e.target.nextElementSibling?.classList.remove('hidden'); }}
                  />
                ) : null}
                <span className={`text-primary font-bold text-sm ${user.profilePicture ? 'hidden' : ''}`}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
                </span>
              </div>
              <div className="hidden md:block leading-tight text-left">
                <p className="text-xs font-black text-slate-900 tracking-tight truncate max-w-[120px]">{user.name || 'Administrator'}</p>
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{user.role || 'Admin'}</p>
              </div>
              <FaChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-300 ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-slate-50">
                  <p className="text-xs font-black text-slate-900 tracking-tight truncate">{user.email || 'Admin Account'}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">Personnel ID: {user.userID || 'N/A'}</p>
                </div>
                <div className="p-2">
                  <Link 
                    to="/admin/profile" 
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors"
                  >
                    <FaUserCog className="w-4 h-4 text-slate-400" />
                    Account Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    <FaSignOutAlt className="w-4 h-4" />
                    Logout Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
