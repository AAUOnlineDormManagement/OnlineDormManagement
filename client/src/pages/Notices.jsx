import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import DashboardLayout from '../components/dashboard/Students/DashboardLayout';

import {
  FaSearch,
  FaMapMarkerAlt,
  FaPlus,
  FaTint,
  FaWallet,
  FaBook,
  FaKey,
  FaUmbrella,
  FaHeadphones,
  FaBell,
  FaExclamationCircle,
  FaCalendarAlt,
  FaBox
} from 'react-icons/fa';
import notificationApi from '../api/notificationApi';
import noticeApi from '../api/noticeApi';
import eventApi from '../api/eventApi';
import lostFoundApi from '../api/lostFoundApi';
import { uploadUrl } from '../utils/uploadUrl';
import ReportFoundModal from '../components/common/ReportFoundModal';

// Notice categories
const NOTICE_CATEGORIES = [
  { id: 'all', label: 'All Notices', icon: FaBell, color: 'bg-blue-50 text-blue-700' },
  { id: 'urgent', label: 'Urgent', icon: FaExclamationCircle, color: 'bg-rose-50 text-rose-700' },
  { id: 'events', label: 'Events', icon: FaCalendarAlt, color: 'bg-violet-50 text-violet-700' },
  { id: 'lost-found', label: 'Lost & Found', icon: FaBox, color: 'bg-emerald-50 text-emerald-700' },
];

const LOST_FOUND_FILTERS = ['All', 'Found', 'Lost'];

export default function Notices() {
  const navigate = useNavigate();


  const [searchParams] = useSearchParams();
  const [lostFoundFilter, setLostFoundFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [serverNotices, setServerNotices] = useState([]);
  const [lostFoundItems, setLostFoundItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Get category from URL params
  const categoryId = searchParams.get('category') || 'all';
  const currentCategory = NOTICE_CATEGORIES.find(cat => cat.id === categoryId) || NOTICE_CATEGORIES[0];

  // Fetch data
  const fetchAllData = async (alive = true) => {
    try {
      setLoading(true);
      const [notifRes, noticesRes, lostFoundRes, eventsRes] = await Promise.all([
        notificationApi.my().catch(() => ({ data: [] })),
        noticeApi.list().catch(() => []),
        lostFoundApi.listPublic().catch(() => []),
        eventApi.list().catch(() => [])
      ]);

      if (!alive) return;

      const userNotifs = (notifRes?.data || []).map((n) => ({
        id: n._id,
        type: ['ExitClearance', 'Complaint', 'Maintenance', 'Payment'].includes(n.type) ? 'Urgent' : 'General',
        date: new Date(n.createdAt).toLocaleDateString(),
        title: n.title,
        description: n.message,
        footer: n.type || 'Dorm System',
        raw: n,
        isNotification: true
      }));

      const publicNotices = (noticesRes || []).map(n => ({
        id: n._id,
        type: n.priority === 'High' ? 'Urgent' : 'General',
        date: new Date(n.createdAt).toLocaleDateString(),
        title: n.title,
        description: n.message,
        footer: 'Admin Notice',
        raw: n
      }));

      const campusEvents = (eventsRes || []).map(ev => ({
        id: ev._id,
        type: 'Event',
        date: ev.date ? new Date(ev.date).toLocaleDateString() : 'TBD',
        title: ev.title,
        description: `${ev.description} | Location: ${ev.location}`,
        footer: 'Campus Event',
        image: ev.image,
        raw: ev
      }));

      setServerNotices([...userNotifs, ...publicNotices, ...campusEvents]);

      const items = (lostFoundRes || []).map(item => ({
        id: item._id,
        status: item.type === 'found' ? 'Found' : 
                item.status === 'ReportedFound' ? 'Reported Found' : 'Lost',
        statusColor: item.type === 'found' ? 'bg-emerald-100 text-emerald-700' : 
                     item.status === 'ReportedFound' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700',
        icon: item.category === 'Electronics' ? FaHeadphones :
          item.category === 'Books' ? FaBook :
            item.category === 'Keys' ? FaKey : FaBox,
        title: item.itemName,
        posted: new Date(item.createdAt).toLocaleDateString(),
        description: item.description,
        location: item.location,
        buttonText: item.type === 'found' ? 'Contact Finder' : 'I Found This',
        buttonColor: item.type === 'found' ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700',
        rawItem: item
      }));
      setLostFoundItems(items);

    } catch (e) {
      console.error(e);
    } finally {
      if (alive) setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetchAllData(alive);
    return () => {
      alive = false;
    };
  }, []);

  const filteredNotices = useMemo(() => {
    const list = serverNotices;
    if (categoryId === 'all') return list;
    return list.filter((notice) => {
      if (categoryId === 'urgent') return notice.type === 'Urgent';
      if (categoryId === 'events') return notice.type === 'Event';
      if (categoryId === 'lost-found') return notice.type === 'General';
      return true;
    });
  }, [categoryId, serverNotices]);

  const filteredLostFoundItems = lostFoundItems.filter((item) => {
    const matchesFilter = lostFoundFilter === 'All' || item.status === lostFoundFilter;
    const matchesSearch = searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Get color classes safely
  const getColorClasses = (colorString) => {
    if (!colorString) return { bg: '', text: '' };
    const parts = colorString.split(' ');
    return {
      bg: parts[0] || '',
      text: parts[1] || ''
    };
  };

  const colors = getColorClasses(currentCategory.color);

  return (
    <DashboardLayout
      title={currentCategory.label}
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: currentCategory.label }
      ]}
      showPageHeader={true}
    >
      <div className={`mx-auto space-y-6 ${categoryId === 'lost-found' ? 'max-w-6xl' : 'max-w-5xl'}`}>
        {/* Category Header */}
        <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
          <div className={`p-3 rounded-lg ${colors.bg}`}>
            <currentCategory.icon className={`w-6 h-6 ${colors.text}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">{currentCategory.label}</h2>
            <p className="text-sm text-slate-600">
              {categoryId === 'lost-found'
                ? 'Browse items found in common areas or report your lost belongings. Help our community return items to their rightful owners.'
                : `${filteredNotices.length} ${filteredNotices.length === 1 ? 'notice' : 'notices'} found`
              }
            </p>
          </div>
          {categoryId === 'events' && (
            <button
              onClick={() => navigate('/events/calendar')}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              View Calendar →
            </button>
          )}

          {(categoryId === 'all' || categoryId === 'urgent') && (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (window.confirm('Mark all notifications as read?')) {
                    try {
                      await notificationApi.markAllRead();
                      fetchAllData();
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
              >
                Mark all read
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('Clear all notifications? This cannot be undone.')) {
                    try {
                      await notificationApi.clearAll();
                      fetchAllData();
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Content based on selected category */}
        {categoryId === 'lost-found' ? (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1 relative w-full">
                <FaSearch className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white"
                />
              </div>

              <div className="flex gap-2">
                {LOST_FOUND_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLostFoundFilter(filter)}
                    className={`px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${lostFoundFilter === filter
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <button
                onClick={() => navigate('/report-lost-item')}
                className="inline-flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                <FaPlus className="w-4 h-4" />
                Report Item
              </button>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLostFoundItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${item.statusColor}`}>
                      {item.status}
                    </span>

                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{item.title}</h3>
                        <p className="text-xs text-slate-500">{item.posted}</p>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">{item.description}</p>

                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                      <FaMapMarkerAlt className="w-4 h-4 text-slate-400" />
                      <span>{item.location}</span>
                    </div>

                    <button 
                      onClick={() => {
                        if (item.rawItem?.type === 'lost' && item.rawItem?.status === 'Open') {
                          setSelectedItem(item.rawItem);
                          setShowReportModal(true);
                        }
                      }}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${item.buttonColor}`}
                    >
                      {item.buttonText}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Empty state for Lost & Found */}
            {filteredLostFoundItems.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <FaBox className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No {searchQuery ? 'matching' : ''} items found
                </h3>
                <p className="text-slate-600 max-w-md mx-auto mb-6">
                  {searchQuery
                    ? `No items found matching "${searchQuery}". Try a different search term.`
                    : 'No lost or found items have been reported yet.'
                  }
                </p>
                <button
                  onClick={() => navigate('/report-lost-item')}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  Be the first to report an item
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Notices List */}
            <div className="space-y-4">
              {loading && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm text-slate-600">
                  Loading notices...
                </div>
              )}
              {filteredNotices.map((notice) => (
                <article
                  key={notice.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col md:flex-row gap-5"
                >
                  {(notice.image?.path || notice.raw?.image?.path) && (
                    <div className="w-full md:w-32 h-32 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
                      <img 
                        src={uploadUrl(notice.image?.path || notice.raw?.image?.path)} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3 text-xs">
                      <span
                        className={`px-3 py-1 rounded-full font-semibold ${notice.type === 'Urgent'
                          ? 'bg-rose-50 text-rose-700'
                          : notice.type === 'Event'
                            ? 'bg-violet-50 text-violet-700'
                            : 'bg-amber-50 text-amber-700'
                          }`}
                      >
                        {notice.type}
                      </span>
                      <span className="text-slate-500">{notice.date}</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">
                    {notice.title}
                  </h2>
                  <p className="text-sm text-slate-600 mb-3">{notice.description}</p>

                  {/* Exit clearance "stamp" (QR) */}
                  {notice.raw?.type === 'ExitClearance' && notice.raw?.data?.qrCode && (
                    <div className="mt-4 p-4 glass-effect rounded-2xl border border-slate-100/50 shadow-lg animate-fade-in">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                        Digital Authorization Stamp
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 p-2 bg-white rounded-xl shadow-md border border-slate-100 relative group overflow-hidden">
                           {/* Small ticket notches */}
                           <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-100"></div>
                           <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-100"></div>
                           <img
                             src={notice.raw.data.qrCode}
                             alt="Exit clearance QR"
                             className="w-32 h-32 bg-white filter contrast-125"
                           />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1.5">
                             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                             <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active Clearance</span>
                          </div>
                          <p className="text-sm font-black text-slate-900 leading-tight">Dormitory Exit Pass</p>
                          <p className="text-[10px] text-slate-500 mt-1 font-medium">Show this at the gate for verification.</p>
                        </div>
                      </div>
                    </div>
                  )}


                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{notice.footer}</span>
                    <div className="flex items-center gap-3">
                      {notice.isNotification && (
                        <button
                          type="button"
                          className="text-rose-500 hover:text-rose-600 text-xs font-medium"
                          onClick={async () => {
                            try {
                              await notificationApi.delete(notice.id);
                              setServerNotices((prev) =>
                                prev.filter((n) => n.id !== notice.id)
                              );
                            } catch (e) {
                              console.error('Failed to delete notification', e);
                            }
                          }}
                        >
                          Delete
                        </button>
                      )}
                      {notice.isNotification && !notice.raw?.read && (
                        <button
                          type="button"
                          className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                          onClick={async () => {
                            try {
                              await notificationApi.markRead(notice.id);
                              fetchAllData();
                            } catch (e) {
                              console.error('Failed to mark read', e);
                            }
                          }}
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                        onClick={() => navigate(`/notice/${notice.id}`)}
                      >
                        <span>Read details</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
              ))}
            </div>

            {/* Load More */}
            {filteredNotices.length > 0 && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-full border border-slate-300 text-sm text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  <span>▾</span>
                  <span>Load Older Notices</span>
                </button>
              </div>
            )}

            {/* Empty State for Notices */}
            {filteredNotices.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <currentCategory.icon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No {currentCategory.label.toLowerCase()} found
                </h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  {categoryId === 'urgent' && 'There are no urgent notices at the moment.'}
                  {categoryId === 'events' && 'No upcoming events scheduled. Check back later!'}
                  {categoryId === 'all' && 'No notices available at the moment.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {showReportModal && selectedItem && (
        <ReportFoundModal
          item={selectedItem}
          onClose={() => {
            setShowReportModal(false);
            setSelectedItem(null);
          }}
          onSuccess={() => fetchAllData(true)}
        />
      )}
    </DashboardLayout>
  );
}