import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import DashboardLayout from '../components/dashboard/Students/DashboardLayout';

import {
  FaSearch,
  FaMapMarkerAlt,
  FaPlus,
  FaBell,
  FaCalendarAlt,
  FaBox,
  FaTrash,
  FaArrowRight,
  FaExclamationCircle
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

  const categoryId = searchParams.get('category') || 'all';
  const currentCategory = NOTICE_CATEGORIES.find(cat => cat.id === categoryId) || NOTICE_CATEGORIES[0];

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

      setServerNotices([...userNotifs, ...publicNotices, ...campusEvents].sort((a, b) => new Date(b.raw.createdAt) - new Date(a.raw.createdAt)));
      setLostFoundItems(lostFoundRes.map(item => ({
        id: item._id,
        title: item.itemName,
        description: item.description,
        location: item.locationFound || item.locationLost,
        posted: new Date(item.createdAt).toLocaleDateString(),
        status: item.type === 'found' ? 'Found' : 'Lost',
        statusColor: item.type === 'found' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
        icon: item.type === 'found' ? FaBox : FaSearch,
        buttonText: item.type === 'found' ? 'View details' : 'Contact reporter',
        buttonColor: 'bg-slate-900 text-white',
        rawItem: item
      })));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetchAllData(alive);
    return () => { alive = false; };
  }, []);

  const filteredNotices = useMemo(() => {
    let list = [...serverNotices];
    if (categoryId === 'urgent') list = list.filter(n => n.type === 'Urgent');
    if (categoryId === 'events') list = list.filter(n => n.type === 'Event');
    return list;
  }, [serverNotices, categoryId]);

  const filteredLostFoundItems = useMemo(() => {
    return lostFoundItems.filter(item => {
      const matchesFilter = lostFoundFilter === 'All' || item.status === lostFoundFilter;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [lostFoundItems, lostFoundFilter, searchQuery]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
           <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Notification Hub"
      breadcrumbs={[{ label: 'Portal', path: '/student-portal' }, { label: 'Signals' }]}
    >
      <div className="max-w-6xl mx-auto space-y-10 pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-fade-in">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-[0.2em]">
                System Communication Stream
             </div>
             <h1 className="text-5xl font-black text-slate-900 tracking-tight">Your Digital Signals</h1>
             <p className="text-lg text-slate-500 font-medium max-w-xl">Centralized intelligence for campus updates, personal alerts, and residency notifications.</p>
          </div>
          <div className="flex bg-white p-1.5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
             {NOTICE_CATEGORIES.map(cat => (
               <button 
                 key={cat.id}
                 onClick={() => navigate(`/notices?category=${cat.id}`)}
                 className={`px-6 py-3 rounded-full text-xs font-black transition-all flex items-center gap-3 ${categoryId === cat.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
               >
                 <cat.icon className="w-4 h-4" />
                 {cat.label}
               </button>
             ))}
          </div>
        </header>

        {(categoryId === 'all' || categoryId === 'urgent') && filteredNotices.length > 0 && (
          <div className="flex justify-end gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
             <button
               onClick={async () => {
                 if (window.confirm('Mark all signals as acknowledged?')) {
                   try { await notificationApi.markAllRead(); fetchAllData(); } catch (e) { console.error(e); }
                 }
               }}
               className="px-5 py-2.5 bg-blue-50 text-blue-600 rounded-2xl text-xs font-black hover:bg-blue-100 transition-all border border-blue-100"
             >
               ACKNOWLEDGE ALL
             </button>
             <button
               onClick={async () => {
                 if (window.confirm('Purge all notification logs?')) {
                   try { await notificationApi.clearAll(); fetchAllData(); } catch (e) { console.error(e); }
                 }
               }}
               className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black hover:bg-rose-100 transition-all border border-rose-100"
             >
               PURGE LOGS
             </button>
          </div>
        )}

        <div className="space-y-6">
          {categoryId === 'lost-found' ? (
             <section className="space-y-8 animate-fade-in">
               <div className="flex flex-col md:flex-row gap-4 items-center">
                 <div className="flex-1 relative w-full group">
                   <FaSearch className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
                   <input
                     type="text"
                     placeholder="Search intelligence feed..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                   />
                 </div>
                 <div className="flex gap-2 p-1.5 bg-slate-100 rounded-full">
                    {LOST_FOUND_FILTERS.map(f => (
                      <button 
                        key={f}
                        onClick={() => setLostFoundFilter(f)}
                        className={`px-6 py-2.5 rounded-full text-xs font-black transition-all ${lostFoundFilter === f ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {f}
                      </button>
                    ))}
                 </div>
                 <button onClick={() => navigate('/report-lost-item')} className="px-8 py-4 bg-slate-900 text-white rounded-[2rem] font-black text-sm hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/20 transition-all flex items-center gap-2">
                   <FaPlus className="w-4 h-4" /> REPORT ITEM
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredLostFoundItems.map(item => (
                   <div key={item.id} className="glass-effect rounded-[2.5rem] p-8 border border-white shadow-xl shadow-slate-200/30 hover:shadow-blue-500/10 transition-all hover-lift">
                      <div className="flex items-start justify-between mb-6">
                         <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.statusColor}`}>
                           {item.status}
                         </span>
                         <span className="text-[10px] font-bold text-slate-400">{item.posted}</span>
                      </div>
                      <h4 className="text-xl font-black text-slate-900 mb-2">{item.title}</h4>
                      <p className="text-sm text-slate-600 font-medium mb-6 line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-8">
                         <FaMapMarkerAlt className="w-3 h-3" />
                         {item.location}
                      </div>
                      <button className="w-full py-4 bg-slate-50 text-slate-900 border border-slate-100 rounded-2xl font-black text-xs hover:bg-slate-900 hover:text-white transition-all">
                        {item.buttonText}
                      </button>
                   </div>
                 ))}
               </div>
             </section>
          ) : (
            <section className="space-y-6 animate-fade-in">
              {filteredNotices.length > 0 ? filteredNotices.map((notice, idx) => (
                <article key={idx} className="relative glass-effect rounded-[2.5rem] p-8 border border-white shadow-xl shadow-slate-200/40 hover:shadow-blue-500/5 transition-all flex flex-col md:flex-row gap-8 overflow-hidden group">
                  <div className={`absolute left-0 top-0 w-2 h-full ${notice.type === 'Urgent' ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : notice.type === 'Event' ? 'bg-violet-500' : 'bg-blue-600'}`}></div>
                  
                  {notice.image?.path && (
                    <div className="w-full md:w-48 h-48 rounded-3xl overflow-hidden shrink-0 shadow-lg border border-white/20">
                      <img src={uploadUrl(notice.image.path)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${notice.type === 'Urgent' ? 'bg-rose-50 text-rose-700' : notice.type === 'Event' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>
                            {notice.type}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">{notice.date}</span>
                       </div>
                       {notice.isNotification && !notice.raw?.read && (
                         <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                       )}
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">{notice.title}</h3>
                    <p className="text-base text-slate-600 font-medium leading-relaxed mb-6 flex-1">{notice.description}</p>
                    
                    {notice.raw?.type === 'ExitClearance' && notice.raw?.data?.qrCode && (
                       <div className="mb-6 p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4 w-fit">
                          <img src={notice.raw.data.qrCode} alt="QR" className="w-16 h-16" />
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Clearance</p>
                            <p className="text-xs font-bold text-slate-900">Scan at Gate Control</p>
                          </div>
                       </div>
                    )}

                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{notice.footer}</p>
                       <div className="flex items-center gap-3">
                          {notice.isNotification && (
                            <>
                              <button onClick={() => notificationApi.delete(notice.id).then(fetchAllData)} className="p-2 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-xl transition-all">
                                <FaTrash className="w-4 h-4" />
                              </button>
                              {!notice.raw?.read && (
                                <button onClick={() => notificationApi.markRead(notice.id).then(fetchAllData)} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black hover:bg-emerald-100 transition-all">
                                  MARK READ
                                </button>
                              )}
                            </>
                          )}
                          <Link to={`/notice/${notice.id}`} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:scale-105 transition-all flex items-center gap-2">
                             DETAILS <FaArrowRight className="w-3 h-3" />
                          </Link>
                       </div>
                    </div>
                  </div>
                </article>
              )) : (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/20">
                   <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                      <FaBell className="w-8 h-8 text-slate-300" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900">All Quiet Here</h3>
                   <p className="text-slate-500 font-medium">Your notification stream is currently empty.</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      
      {showReportModal && selectedItem && (
        <ReportFoundModal
          item={selectedItem}
          onClose={() => { setShowReportModal(false); setSelectedItem(null); }}
          onSuccess={() => fetchAllData(true)}
        />
      )}
    </DashboardLayout>
  );
}