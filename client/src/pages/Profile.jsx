import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUser,
  FaLock,
  FaEnvelope,
  FaPhone,
  FaIdCard,
  FaIdBadge,
  FaUniversity,
  FaBuilding,
  FaShieldAlt,
  FaClock,
  FaCheckCircle,
  FaIdCardAlt
} from 'react-icons/fa';
import DashboardLayout from '../components/dashboard/Students/DashboardLayout';
import authApi from '../api/authApi';
import studentApi from '../api/studentApi';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // Get user from auth api
        const currentUser = authApi.getCurrentUser();
        
        // If it's a student, try to get more details
        if (currentUser?.role === 'Student') {
           const res = await studentApi.getDashboard();
           if (res.success) {
              setUser({ ...currentUser, ...res.student });
           } else {
              setUser(currentUser);
           }
        } else {
           setUser(currentUser);
        }
      } catch (err) {
        console.error(err);
        setUser(authApi.getCurrentUser());
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert("Passwords do not match");
      return;
    }
    try {
      setUpdating(true);
      await authApi.updatePassword({
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      alert("Password updated successfully");
      setShowPasswordModal(false);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      alert(err.message || "Failed to update password");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout
      title="Digital Identity"
      breadcrumbs={[{ label: 'Portal', path: '/student-portal' }, { label: 'Identity' }]}
    >
      <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-fade-in">
        {/* Profile Identity Card - The "Digital ID" */}
        <section className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-8 sm:p-12 text-white shadow-2xl group">
           {/* Animated Background Elements */}
           <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full -mr-48 -mt-48 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full -ml-32 -mb-32 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
           
           <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center md:items-start">
             <div className="shrink-0 space-y-4 text-center">
               <div className="relative inline-block">
                 <div className="w-48 h-48 rounded-[3rem] bg-white/10 backdrop-blur-md border-4 border-white/20 p-2 overflow-hidden flex items-center justify-center shadow-2xl relative">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt="" className="w-full h-full object-cover rounded-[2.5rem]" />
                    ) : (
                      <FaUser className="w-20 h-20 text-white/20" />
                    )}
                    {/* Scanning animation effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/20 to-transparent h-1/4 w-full animate-[scan_3s_ease-in-out_infinite]"></div>
                 </div>
                 <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest border-4 border-slate-900 flex items-center gap-2">
                    <FaCheckCircle className="w-3 h-3" /> VERIFIED ID
                 </div>
               </div>
               <div className="pt-4">
                  <h3 className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Authorization</h3>
                  <p className="text-sm font-bold bg-white/10 px-3 py-1 rounded-lg inline-block">LVL 4 RESIDENT</p>
               </div>
             </div>

             <div className="flex-1 space-y-8 text-center md:text-left w-full">
                <div>
                   <h1 className="text-4xl sm:text-6xl font-black tracking-tighter mb-2 leading-none">{user?.name}</h1>
                   <p className="text-lg text-white/60 font-medium font-mono">NODE_ID: {user?.studentId || user?.userId || 'N/A'}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-8 border-t border-white/10">
                   <div>
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Tenure</p>
                     <p className="text-lg font-bold">Year {user?.yearOfStudy || user?.year || '1'}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">District</p>
                     <p className="text-lg font-bold">{user?.campus || 'Main'}</p>
                   </div>
                   <div className="col-span-2 md:col-span-1">
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Division</p>
                     <p className="text-lg font-bold truncate">{user?.department || 'Information Systems'}</p>
                   </div>
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                   <button onClick={() => setShowPasswordModal(true)} className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs hover:bg-blue-50 transition-all flex items-center gap-3 shadow-xl shadow-white/10">
                      <FaLock className="w-3 h-3" /> RE-AUTHENTICATE
                   </button>
                   <button className="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-2xl font-black text-xs hover:bg-white/20 transition-all flex items-center gap-3">
                      <FaEnvelope className="w-3 h-3" /> BROADCAST LOGS
                   </button>
                </div>
             </div>
           </div>
        </section>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <section className="glass-effect rounded-[2.5rem] p-10 border border-white shadow-xl shadow-slate-200/40 hover:shadow-blue-500/5 transition-all">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-4">
                 <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <FaIdCardAlt />
                 </div>
                 Academic Footprint
              </h3>
              <div className="space-y-6">
                 {[
                   { label: 'Full Legal Identity', value: user?.name, icon: FaUser },
                   { label: 'System Registration ID', value: user?.studentId || user?.userId, icon: FaIdBadge },
                   { label: 'Educational Track', value: user?.department, icon: FaUniversity },
                   { label: 'Assigned Habitation', value: user?.roomNumber ? `Block ${user.dormitory}, Room ${user.roomNumber}` : 'Pending Assignment', icon: FaBuilding }
                 ].map((item, i) => (
                   <div key={i} className="flex items-center gap-5 p-5 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 transition-colors group">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                         <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                         <p className="text-sm font-bold text-slate-800">{item.value || 'Not Configured'}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </section>

           <section className="glass-effect rounded-[2.5rem] p-10 border border-white shadow-xl shadow-slate-200/40 hover:shadow-emerald-500/5 transition-all">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-4">
                 <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <FaShieldAlt />
                 </div>
                 Security Protocols
              </h3>
              <div className="space-y-6">
                 {[
                   { label: 'Communication Node', value: user?.email, icon: FaEnvelope },
                   { label: 'Mobile Interface', value: user?.phone || '+251 900 000 000', icon: FaPhone },
                   { label: 'Last System Handshake', value: new Date().toLocaleDateString(), icon: FaClock },
                   { label: 'Access Permissions', value: user?.role?.toUpperCase() || 'RESIDENT', icon: FaLock }
                 ].map((item, i) => (
                   <div key={i} className="flex items-center gap-5 p-5 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 transition-colors group">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                         <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                         <p className="text-sm font-bold text-slate-800">{item.value || 'N/A'}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </section>
        </div>

        {/* Security Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-fade-in">
             <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16"></div>
                <div className="relative z-10">
                   <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Security Override</h2>
                   <p className="text-slate-500 font-medium mb-8">Update your cryptographic access token to maintain residency security.</p>
                   
                   <form onSubmit={handlePasswordUpdate} className="space-y-6">
                      <div className="space-y-4">
                         <div className="relative">
                            <input 
                              type="password" 
                              placeholder="Current Token" 
                              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold"
                              value={passwords.current}
                              onChange={e => setPasswords({...passwords, current: e.target.value})}
                            />
                         </div>
                         <input 
                           type="password" 
                           placeholder="New Secure Signature" 
                           className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold"
                           value={passwords.new}
                           onChange={e => setPasswords({...passwords, new: e.target.value})}
                         />
                         <input 
                           type="password" 
                           placeholder="Confirm New Signature" 
                           className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold"
                           value={passwords.confirm}
                           onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                         />
                      </div>
                      <div className="flex gap-4 pt-4">
                         <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-200 transition-all">
                            ABORT
                         </button>
                         <button disabled={updating} type="submit" className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20">
                            {updating ? 'HASHING...' : 'COMMIT CHANGES'}
                         </button>
                      </div>
                   </form>
                </div>
             </div>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: 75%; }
        }
      `}} />
    </DashboardLayout>
  );
}
