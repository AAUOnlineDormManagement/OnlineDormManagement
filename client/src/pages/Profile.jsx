import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBuilding,
  FaBell,
  FaUser,
  FaWrench,
  FaExclamationTriangle,
  FaSignOutAlt,
  FaCheckCircle,
  FaSpinner,
  FaLock,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaChevronRight,
  FaEdit,
  FaSave,
  FaTimes
} from 'react-icons/fa';
import ProfilePictureUpload from '../components/common/ProfilePictureUpload';
import BuildingIcon from '../components/common/BuildingIcon';
import DashboardLayout from '../components/dashboard/Students/DashboardLayout';
import studentApi from '../api/studentApi';
import authApi from '../api/authApi';
import proctorApi from '../api/proctorApi';
import toast from 'react-hot-toast';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const user = authApi.getCurrentUser();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        if (['Student', 'EventPoster', 'Vendor'].includes(user?.role)) {
          const res = await studentApi.getDashboard();
          if (res.success) {
            setProfileData(res);
          }
        } else if (user?.role === 'Proctor') {
          const res = await proctorApi.getDashboard();
          if (res.success) {
            // Adapt proctor dashboard data to profile needs
            setProfileData({
              student: {
                name: user.name,
                studentId: user.userId,
                status: 'Staff',
                department: 'Management',
                yearOfStudy: 'N/A',
                gender: 'N/A',
                dormitory: res.building?.building?.name || 'Assigned Building',
                block: res.building?.building?.buildingID || '',
                roomNumber: 'Office',
                floor: '1',
                sponsorship: 'Employee'
              }
            });
          }
        } else {
          // Fallback for Admin or unknown
          setProfileData({
            student: {
              name: user?.name || 'User',
              studentId: user?.userId || 'N/A',
              status: user?.role || 'User',
              department: 'Administration'
            }
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.role, user?.userId, user?.name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <FaSpinner className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl max-w-md text-center">
          <FaExclamationTriangle className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-lg font-bold mb-2">Error Loading Profile</h2>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const student = profileData?.student || {};
  const stats = profileData?.quickStats || {};
  const displayName = user?.name || student.name || 'User';

  const rawType = student.studentType || student.sponsorship || '';
  const t = String(rawType).toLowerCase();
  let studentTypeLabel = rawType || 'Not Set';
  if (t.includes('self')) {
    studentTypeLabel = 'Self Sponsored';
  } else if (t.includes('government')) {
    studentTypeLabel = 'Government Sponsorship';
  } else if (t.includes('special')) {
    studentTypeLabel = 'Special Needs';
  } else if (t.includes('staff')) {
    studentTypeLabel = 'Staff Relatives';
  }

  const isAdmin = ['Admin', 'CampusAdmin', 'SuperAdmin'].includes(user?.role);

  const startNameEdit = () => {
    setNameDraft(displayName);
    setIsEditingName(true);
  };

  const cancelNameEdit = () => {
    setIsEditingName(false);
    setNameDraft('');
  };

  const saveName = async () => {
    const trimmed = String(nameDraft || '').trim();
    if (!trimmed) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      setSavingName(true);
      const res = await authApi.updateProfile({ name: trimmed });
      if (!res?.success) {
        throw new Error(res?.message || 'Failed to update name');
      }

      const currentUser = authApi.getCurrentUser();
      if (currentUser) {
        localStorage.setItem('user', JSON.stringify({ ...currentUser, name: res.data?.name || trimmed }));
        window.dispatchEvent(new Event('storage'));
      }

      setProfileData((prev) => ({
        ...(prev || {}),
        student: {
          ...(prev?.student || {}),
          name: res.data?.name || trimmed,
        },
      }));

      setIsEditingName(false);
      toast.success('Name updated successfully');
      window.location.reload();
    } catch (e) {
      toast.error(e?.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const ProfileContent = (
    <section className="px-2 sm:px-4 py-4 sm:py-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: main profile card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center">
              <div className="relative mb-6">
                <ProfilePictureUpload 
                  currentImage={user?.profilePicture} 
                  onUploadSuccess={(newPath) => {
                    const updatedUser = { ...user, profilePicture: newPath };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    window.location.reload();
                  }}
                />
                <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-sm">
                  {student.status === 'Assigned' ? 'Active Resident' : student.status || 'Active'}
                </div>
              </div>

              <div className="w-full flex items-center justify-center gap-2 mb-1">
                {isEditingName ? (
                  <>
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="max-w-[260px] px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900"
                      placeholder="Enter your full name"
                    />
                    <button
                      type="button"
                      onClick={saveName}
                      disabled={savingName}
                      className="p-2 rounded-lg bg-emerald-600 text-white disabled:opacity-60"
                      title="Save name"
                    >
                      {savingName ? <FaSpinner className="w-3 h-3 animate-spin" /> : <FaSave className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={cancelNameEdit}
                      disabled={savingName}
                      className="p-2 rounded-lg bg-slate-100 text-slate-700"
                      title="Cancel"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-slate-900">{displayName}</h2>
                    {user?.role !== 'Student' && (
                      <button
                        type="button"
                        onClick={startNameEdit}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600"
                        title="Edit name"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-6 font-medium">ID: {student.studentId || user?.userID}</p>

              <div className="flex gap-3 w-full">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  <FaEnvelope className="w-4 h-4 text-slate-400" />
                  Email
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  <FaPhone className="w-4 h-4 text-slate-400" />
                  Call
                </button>
              </div>

              <div className="w-full mt-8 pt-6 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">{['Student', 'EventPoster', 'Vendor'].includes(user?.role) ? 'Department' : 'Position'}</span>
                  <span className="font-semibold text-slate-800">{['Student', 'EventPoster', 'Vendor'].includes(user?.role) ? student.department : 'System Administrator'}</span>
                </div>
                {['Student', 'EventPoster', 'Vendor'].includes(user?.role) && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Year of Study</span>
                    <span className="font-semibold text-slate-800">Year {student.yearOfStudy}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Gender</span>
                  <span className="font-semibold text-slate-800">{['Student', 'EventPoster', 'Vendor'].includes(user?.role) ? student.gender : user?.gender || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-5 text-sm text-slate-600">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <FaCheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-blue-900 mb-1">Status Verified</h4>
                  <p className="text-blue-700/80 leading-relaxed">
                    Account status is active. All administrative permissions have been successfully granted.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                <h3 className="text-lg font-bold text-slate-900">
                  Personnel Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-slate-400">Full Name</p>
                  <p className="font-medium text-slate-800">{user?.name || student.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-slate-400">Role Authority</p>
                  <p className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                    {user?.role || 'Admin'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-slate-400">Campus Jurisdiction</p>
                  <p className="font-medium text-slate-800 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-slate-300 w-3 h-3" />
                    {user?.campus || student.campus || 'Global / Main Campus'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-slate-400">Security Email</p>
                  <p className="text-blue-600 font-medium">{user?.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Security Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <FaLock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Account Security</h3>
                    <p className="text-xs text-slate-500">Update your credentials.</p>
                  </div>
                </div>
                <Link to="/change-password" title="Change Password" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Update Password
                </Link>
              </div>
            </div>

            {/* Conditional Resident Info */}
            {['Student', 'EventPoster', 'Vendor'].includes(user?.role) && (
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                 <div className="flex items-center justify-between mb-8 relative z-10">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                     <h3 className="text-lg font-bold text-slate-900">Assigned Dormitory</h3>
                   </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                   <div className="flex items-start gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                       <BuildingIcon className="w-6 h-6 text-blue-600" />
                     </div>
                     <div>
                       <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Building</p>
                       <p className="font-bold text-slate-800">{student.dormitory || 'Pending'}</p>
                     </div>
                   </div>
                   {/* ... more items ... */}
                 </div>
               </div>
            )}
          </div>
      </div>
    </section>
  );

  if (isAdmin) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-slate-200 py-6 px-4 mb-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Administrative Profile</h1>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">Management Portal / User Settings</p>
          </div>
        </div>
        {ProfileContent}
      </div>
    );
  }

  return (
    <DashboardLayout
      title="My Profile"
      breadcrumbs={[
        { label: 'Dashboard', path: user?.role === 'Proctor' ? '/proctor/dashboard' : '/student-portal' },
        { label: 'Profile' }
      ]}
      showPageHeader={true}
    >
      {ProfileContent}
    </DashboardLayout>
  );
}


