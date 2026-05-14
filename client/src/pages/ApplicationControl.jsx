import { useEffect, useState } from 'react';
import { 
  FaLock, 
  FaUnlock, 
  FaClock, 
  FaPlus, 
  FaTrash, 
  FaUniversity, 
  FaMapMarkerAlt, 
  FaUserShield,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowLeft,
  FaSync
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import applicationControlApi from '../api/applicationControlApi';
import authApi from '../api/authApi';
import toast from 'react-hot-toast';

export default function ApplicationControl() {
  const user = authApi.getCurrentUser();
  const isAdmin = user?.role === 'SuperAdmin' || user?.role === 'CampusAdmin';
  const isCampusAdmin = user?.role === 'CampusAdmin';

  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newSetting, setNewSetting] = useState({
    campus: isCampusAdmin ? user.campus : 'Any',
    locationCategory: 'all',
    sponsorshipType: 'Both',
    isOpen: true,
    waitMinutes: 3,
    openedAt: '',
    closedAt: ''
  });



  const campuses = isCampusAdmin ? [user.campus] : ['Any', '5 kilo', '4 kilo', '6 kilo', 'FBE', 'Lideta', 'AAC', 'CHMS'];


  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'addis', label: 'Addis Ababa' },
    { value: 'shager', label: 'Shegar City' },
    { value: 'other', label: 'Outside Addis/Sheger' }
  ];
  const sponsorships = [
    { value: 'Both', label: 'Both' },
    { value: 'Government', label: 'Government' },
    { value: 'Self-Sponsored', label: 'Self-Sponsored' }
  ];

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await applicationControlApi.getSettings();
      if (res.success) {
        setSettings(res.data);
      }
    } catch (err) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newSetting };
      if (payload.openedAt) payload.openedAt = new Date(payload.openedAt).toISOString();
      if (payload.closedAt) payload.closedAt = new Date(payload.closedAt).toISOString();
      
      const res = await applicationControlApi.createSetting(payload);
      if (res.success) {
        toast.success('New control rule added');
        setIsAdding(false);
        fetchSettings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create setting');
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      const res = await applicationControlApi.updateSetting(id, { isOpen: !currentStatus });
      if (res.success) {
        toast.success(`Window ${!currentStatus ? 'Opened' : 'Closed'}`);
        fetchSettings();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleWaitChange = async (id, minutes) => {
    try {
      const res = await applicationControlApi.updateSetting(id, { waitMinutes: parseInt(minutes) });
      if (res.success) {
        toast.success('Wait time updated');
        fetchSettings();
      }
    } catch (err) {
      toast.error('Failed to update wait time');
    }
  };

  const handleDateChange = async (id, field, value) => {
    try {
      // Convert local datetime string to ISO string (UTC) to avoid timezone mismatches on the server
      const isoValue = value ? new Date(value).toISOString() : null;
      const res = await applicationControlApi.updateSetting(id, { [field]: isoValue });
      if (res.success) {
        toast.success('Schedule updated');
        fetchSettings();
      }
    } catch (err) {
      toast.error('Failed to update schedule');
    }
  };



  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      const res = await applicationControlApi.deleteSetting(id);
      if (res.success) {
        toast.success('Rule deleted');
        fetchSettings();
      }
    } catch (err) {
      toast.error('Failed to delete rule');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md">
          <FaUserShield className="text-rose-500 text-5xl mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-500 mb-6">Only administrators can access this page.</p>
          <Link to="/student-portal" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-slate-900 transition-all inline-block">
            Back to Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Premium Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
              <FaArrowLeft />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Application Window <span className="text-indigo-600">Control</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Granular Dorm Access Management</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsAdding(true)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <FaPlus className="text-xs" /> New Rule
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        {/* Quick Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <FaExclamationTriangle />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Priority Logic</h3>
              <p className="text-xs text-amber-700 mt-1">Specific campus rules take priority over 'Any' campus rules. Freshmen can apply if ANY window is open and are assigned immediately.</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <FaSync />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-900">Real-time Updates</h3>
              <p className="text-xs text-blue-700 mt-1">Changes are applied immediately to all new and pending applications.</p>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <FaClock />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-900">Wait Times</h3>
              <p className="text-xs text-emerald-700 mt-1">Set in minutes. Typically 3m for Addis/Sheger residents.</p>
            </div>
          </div>
        </div>

        {/* Add New Setting Form (Modal-like Overlay) */}
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-800">Create New Control Rule</h2>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <FaTrash />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 ml-1">Campus</label>
                    <select 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:border-indigo-500 transition-all outline-none"
                      value={newSetting.campus}
                      onChange={(e) => setNewSetting({...newSetting, campus: e.target.value})}
                    >
                      {campuses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 ml-1">Location</label>
                    <select 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:border-indigo-500 transition-all outline-none"
                      value={newSetting.locationCategory}
                      onChange={(e) => setNewSetting({...newSetting, locationCategory: e.target.value})}
                    >
                      {locations.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 ml-1">Sponsorship</label>
                  <select 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:border-indigo-500 transition-all outline-none"
                    value={newSetting.sponsorshipType}
                    onChange={(e) => setNewSetting({...newSetting, sponsorshipType: e.target.value})}
                  >
                    {sponsorships.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 ml-1">Wait Time (Minutes)</label>
                    <div className="relative">
                      <FaClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="number"
                        min="0"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm font-semibold text-slate-700 focus:border-indigo-500 transition-all outline-none"
                        value={newSetting.waitMinutes}
                        onChange={(e) => setNewSetting({...newSetting, waitMinutes: e.target.value})}
                      />
                    </div>
                  </div>

                <div className="grid grid-cols-2 gap-4">

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 ml-1">Open At</label>
                    <input 
                      type="datetime-local"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:border-indigo-500 transition-all outline-none"
                      value={newSetting.openedAt}
                      onChange={(e) => setNewSetting({...newSetting, openedAt: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 ml-1">Close At</label>
                    <input 
                      type="datetime-local"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:border-indigo-500 transition-all outline-none"
                      value={newSetting.closedAt}
                      onChange={(e) => setNewSetting({...newSetting, closedAt: e.target.value})}
                    />
                  </div>
                </div>






                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-6 py-3 border-2 border-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-50 transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100">
                    Create Rule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Settings List */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Condition</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wait Time</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center text-slate-400 font-medium">
                      <div className="animate-pulse flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 border-4 border-slate-200 border-t-indigo-500 animate-spin"></div>
                        Loading control settings...
                      </div>
                    </td>
                  </tr>
                ) : settings.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-20 text-center">
                      <div className="max-w-xs mx-auto">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                          <FaUniversity className="text-3xl" />
                        </div>
                        <h3 className="text-slate-800 font-bold mb-1">No Rules Defined</h3>
                        <p className="text-slate-400 text-xs">Create your first application window control rule to manage student access.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  settings.map((setting) => (
                    <tr key={setting._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <FaUniversity className="text-indigo-400 text-sm" />
                            <span className="text-sm font-black text-slate-800">{setting.campus} Campus</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-[10px] font-bold text-blue-600 rounded-lg border border-blue-100">
                              <FaMapMarkerAlt /> {locations.find(l => l.value === setting.locationCategory)?.label}
                            </span>
                            <span className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-[10px] font-bold text-purple-600 rounded-lg border border-purple-100">
                              <FaUserShield /> {setting.sponsorshipType}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <button 
                          onClick={() => handleToggle(setting._id, setting.isOpen)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            setting.isOpen 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {setting.isOpen ? <><FaUnlock /> Open</> : <><FaLock /> Closed</>}
                        </button>
                      </td>


                      <td className="px-6 py-6">
                        <div className="space-y-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Starts</span>
                            <input 
                              type="datetime-local"
                              className="bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-500"
                              defaultValue={setting.openedAt && !isNaN(new Date(setting.openedAt)) ? new Date(setting.openedAt).toISOString().slice(0, 16) : ''}
                              onBlur={(e) => handleDateChange(setting._id, 'openedAt', e.target.value)}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Ends</span>
                            <input 
                              type="datetime-local"
                              className="bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-500"
                              defaultValue={setting.closedAt && !isNaN(new Date(setting.closedAt)) ? new Date(setting.closedAt).toISOString().slice(0, 16) : ''}
                              onBlur={(e) => handleDateChange(setting._id, 'closedAt', e.target.value)}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <input 
                            type="number"
                            min="0"
                            className="w-16 bg-slate-50 border-2 border-slate-100 rounded-lg px-2 py-1.5 text-xs font-black text-slate-700 focus:border-indigo-500 transition-all outline-none"
                            defaultValue={setting.waitMinutes}
                            onBlur={(e) => handleWaitChange(setting._id, e.target.value)}
                          />
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">mins</span>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <button 
                          onClick={() => handleDelete(setting._id)}
                          className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center shadow-sm"
                          title="Delete Rule"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
