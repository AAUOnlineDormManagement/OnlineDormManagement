import DashboardLayout from '../components/dashboard/Students/DashboardLayout';
import { useState } from 'react';
import { 
  FaBell, 
  FaMoon, 
  FaSun, 
  FaGlobeAfrica, 
  FaShieldAlt, 
  FaChevronRight,
  FaCheckCircle,
  FaPalette,
  FaCog,
  FaSearch,
  FaTrash
} from 'react-icons/fa';
import { MdFace } from 'react-icons/md';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import authApi from '../api/authApi';
import FaceScannerModal from '../components/auth/FaceScannerModal';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('notifications');
  const { theme, toggleTheme, highContrast, toggleHighContrast } = useTheme();
  const darkMode = theme === 'dark';
  const [saving, setSaving] = useState(false);

  // Face recognition state
  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Preferences saved', {
        style: { borderRadius: '1rem', background: '#0f172a', color: '#fff' }
      });
    }, 1000);
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: FaBell, desc: 'Email and SMS alerts' },
    { id: 'biometrics', label: 'Security & Biometrics', icon: MdFace, desc: 'Face recognition setup' },
    { id: 'privacy', label: 'Privacy & Data', icon: FaShieldAlt, desc: 'Dorm record visibility' },
    { id: 'appearance', label: 'Appearance', icon: FaPalette, desc: 'Themes and accessibility' },
    { id: 'region', label: 'Region & Time', icon: FaGlobeAfrica, desc: 'Language and format' }
  ];

  const isAdmin = ['Admin', 'CampusAdmin', 'SuperAdmin'].includes(authApi.getCurrentUser()?.role);

  const SettingsContent = (
    <div className={`max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 ${highContrast ? 'contrast-125' : ''}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
         <div>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">User Preferences</h2>
            <p className="text-slate-600 font-bold">Manage your dormitory platform experience.</p>
         </div>
         <button 
           onClick={handleSave}
           disabled={saving}
           className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center gap-2"
         >
           {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaCheckCircle />}
           {saving ? 'Saving...' : 'Sync Preferences'}
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar Navigation */}
        <nav className="lg:col-span-3 space-y-2" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={isActive}
                className={`w-full group flex items-start gap-4 p-5 rounded-[1.5rem] transition-all duration-300 text-left ${
                  isActive 
                    ? 'bg-white shadow-xl shadow-slate-100 border border-slate-100 text-slate-900' 
                    : 'text-slate-400 hover:bg-white/50 hover:text-slate-600'
                }`}
              >
                <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-black uppercase tracking-wider">{tab.label}</span>
                  <span className="block text-[10px] font-bold text-slate-400 mt-0.5">{tab.desc}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Settings Content */}
        <main className="lg:col-span-9">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden min-h-[450px]">
             <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-50">
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                   {tabs.find(t => t.id === activeTab)?.label}
                </h3>
             </div>
             
             <div className="p-8 lg:p-12">
                {activeTab === 'notifications' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                     {[
                       { title: 'Email Alerts', desc: 'Receive notices for new items, events, and maintenance.', active: true },
                       { title: 'SMS Notifications', desc: 'Urgent alerts for emergency maintenance or safety.', active: false },
                       { title: 'Push Notices', desc: 'Dashboard notifications for marketplace updates.', active: true }
                     ].map((n, i) => (
                       <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                          <div>
                             <p className="text-sm font-black text-slate-900 mb-1">{n.title}</p>
                             <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">{n.desc}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                             <input type="checkbox" className="sr-only peer" defaultChecked={n.active} />
                             <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                          </label>
                       </div>
                     ))}
                  </div>
                )}

                {activeTab === 'privacy' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                     <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex gap-4">
                        <FaShieldAlt className="text-amber-500 text-xl shrink-0" />
                        <p className="text-xs text-amber-800 font-bold leading-relaxed uppercase tracking-tight">
                           Your privacy is protected by AAU Dorm Regulations. Staff only access room data for maintenance or emergency purposes.
                        </p>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          'Room Number Privacy',
                          'Maintenance Logs',
                          'Complaint Visibility',
                          'Account History'
                        ].map((item, i) => (
                          <div key={i} className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between">
                             <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{item}</span>
                             <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">SECURE</span>
                          </div>
                        ))}
                     </div>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Visual Mode</h4>
                           <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => { if (darkMode) toggleTheme(); }}
                                className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${!darkMode ? 'border-slate-900 bg-white' : 'border-transparent bg-slate-50'}`}
                              >
                                 <FaSun className={!darkMode ? 'text-slate-900' : 'text-slate-300'} />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Light</span>
                              </button>
                              <button 
                                onClick={() => { if (!darkMode) toggleTheme(); }}
                                className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${darkMode ? 'border-indigo-400 bg-slate-900 text-white' : 'border-transparent bg-slate-100'}`}
                              >
                                 <FaMoon className={darkMode ? 'text-indigo-400' : 'text-slate-400'} />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Dark</span>
                              </button>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Accessibility</h4>
                           <div className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100">
                              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">High Contrast</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                 <input type="checkbox" className="sr-only peer" checked={highContrast} onChange={toggleHighContrast} />
                                 <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                              </label>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === 'region' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                     <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 flex items-center justify-between">
                        <div>
                           <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">Language</p>
                           <p className="text-lg font-black text-slate-900 tracking-tight">English (US)</p>
                        </div>
                        <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Change</button>
                     </div>
                     <div className="p-6 bg-white rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                              <FaGlobeAfrica />
                           </div>
                           <div>
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Time Zone</p>
                              <p className="text-sm font-black text-slate-900 uppercase">Africa/Addis_Ababa (UTC+3)</p>
                           </div>
                        </div>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </main>
      </div>
    </div>
  );

  if (isAdmin) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="bg-white border-b border-slate-200 py-6 px-10 -mx-10 -mt-10 mb-10">
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Configuration</h1>
           <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">Global Preferences / Personnel Settings</p>
        </div>
        {SettingsContent}
      </div>
    );
  }

  return (
    <DashboardLayout
      title="System Settings"
      breadcrumbs={[
        { label: 'Dashboard', path: '/student-portal' },
        { label: 'Settings' }
      ]}
      showPageHeader={true}
    >
      {SettingsContent}
    </DashboardLayout>
  );
}
