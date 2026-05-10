import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaFilter,
  FaSearch,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaGlobe,
  FaCalendarAlt
} from 'react-icons/fa';
import adminApi from '../api/adminApi';
import adminDormApi from '../api/adminDormApi';
import toast from 'react-hot-toast';
import AdminHeader from '../components/layout/AdminHeader';
import ProfilePictureUpload from '../components/common/ProfilePictureUpload';

export default function ManageStudents() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('Applications');
  const [residentStudents, setResidentStudents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin = user?.role === 'SuperAdmin';

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [notifyText, setNotifyText] = useState('');
  const [isDormOpen, setIsDormOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState('');
  const [updatingConfig, setUpdatingConfig] = useState(false);

  const openConfigModal = async () => {
    setShowConfigModal(true);
    try {
      const res = await adminDormApi.getGlobalApplicationConfig();
      if (res && res.data) {
        setIsDormOpen(res.data.isOpen);
        setNotifyText(res.data.announcement || '');
        if (res.data.openedAt) {
          const d = new Date(res.data.openedAt);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          setOpenedAt(d.toISOString().slice(0, 16));
        } else {
          setOpenedAt('');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateConfig = async () => {
    setUpdatingConfig(true);
    try {
      await adminDormApi.updateGlobalApplicationConfig({
        announcement: notifyText,
        isOpen: isDormOpen,
        openedAt: openedAt ? new Date(openedAt).toISOString() : null,
      });
      toast.success('Dorm application config updated and users notified!');
      setShowConfigModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update config');
    } finally {
      setUpdatingConfig(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await adminApi.applications();
      const data = res || [];
      setStudents(
        data
          .filter((app) => !!app.student)
          .map((app) => {
            const s = app.student;
            let studentType = 'Other';
            if (app.studentType) {
              if (app.studentType === 'Self-Sponsored' || app.studentType === 'Self Sponsored') {
                studentType = 'Self Sponsored';
              } else if (app.studentType === 'Government' || app.studentType === 'Government Sponsorship') {
                studentType = 'Government Sponsorship';
              } else if (app.studentType === 'Special Needs') {
                studentType = 'Special Needs';
              } else if (app.studentType === 'Staff Relatives' || app.studentType === 'Staff Relative') {
                studentType = 'Staff Relatives';
              }
            } else if (s.sponsorship) {
              if (s.sponsorship === 'Self-Sponsored') {
                studentType = 'Self Sponsored';
              } else if (s.sponsorship === 'Government') {
                studentType = 'Government Sponsorship';
              }
            }

            return {
              id: s.user?.userID || s.studentID || 'N/A',
              applicationId: app._id,
              name: s.user?.name || s.fullName || 'No Name',
              email: s.user?.email || '',
              checkIn: new Date(app.createdAt).toLocaleDateString(),
              status: app.status,
              statusColor:
                app.status === 'Assigned'
                  ? 'bg-emerald-100 text-emerald-700'
                  : app.status === 'Pending' || app.status === 'Under Review' || app.status === 'Approved'
                    ? 'bg-amber-100 text-amber-700'
                    : app.status === 'Rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-700',
              studentType: studentType,
              needsAdminApproval: app.isStaffRelated || app.isSpecialNeed || s.isStaffRelated || s.isSpecialNeed || studentType === 'Special Needs' || studentType === 'Staff Relatives'
            };
          })
      );
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchResidentStudents = async () => {
    try {
      const res = await adminDormApi.getStudentsList();
      setResidentStudents(res?.data || []);
    } catch (error) {
      toast.error('Failed to load resident students');
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchResidentStudents();
  }, []);

  const handleApprove = async (e, applicationId) => {
    e.stopPropagation();
    const notes = window.prompt('Enter review notes (optional):');
    if (notes === null) return; // User cancelled

    try {
      setProcessingId(applicationId);
      await adminApi.reviewApplication(applicationId, 'Approved', notes || 'Approved via Student List');
      toast.success('Application approved');
      await fetchStudents();
    } catch (error) {
      console.error('Error approving:', error);
      toast.error(error.response?.data?.message || 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (e, applicationId) => {
    e.stopPropagation();
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) {
      if (reason === "") toast.error('Rejection reason is required');
      return; // User cancelled or empty
    }

    try {
      setProcessingId(applicationId);
      await adminApi.reviewApplication(applicationId, 'Rejected', reason);
      toast.success('Application rejected');
      await fetchStudents();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error(error.response?.data?.message || 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesType = selectedType === 'All' || student.studentType === selectedType;
      const matchesStatus = statusFilter === 'All' || student.status === statusFilter;
      const matchesSearch =
        (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [selectedType, statusFilter, students, searchTerm]);

  const filteredResidents = useMemo(() => {
    return residentStudents.filter((student) => {
      const q = searchTerm.toLowerCase();
      return (
        String(student.fullName || '').toLowerCase().includes(q) ||
        String(student.studentID || '').toLowerCase().includes(q) ||
        String(student.user?.email || '').toLowerCase().includes(q) ||
        String(student.campus || '').toLowerCase().includes(q)
      );
    });
  }, [residentStudents, searchTerm]);

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Manage Students</h1>
        <p className="text-sm text-slate-500">
          View current residents, manage assignments, and update records.
        </p>
        <div className="mt-3 inline-flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode('Applications')}
            className={`px-3 py-1.5 text-sm font-semibold ${viewMode === 'Applications' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
          >
            Applications
          </button>
          <button
            type="button"
            onClick={() => setViewMode('Residents')}
            className={`px-3 py-1.5 text-sm font-semibold ${viewMode === 'Residents' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
          >
            Resident Students
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-4 mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[220px] relative">
          <FaSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, name, or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-slate-50"
          />
        </div>
        {viewMode === 'Applications' && <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Student Type</span>
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="appearance-none pl-3 pr-9 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            >
              <option>All</option>
              <option>Self Sponsored</option>
              <option>Government Sponsorship</option>
              <option>Special Needs</option>
              <option>Staff Relatives</option>
            </select>
            <FaFilter className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>}
        {viewMode === 'Applications' && (
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <button
                onClick={openConfigModal}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-sm font-semibold"
              >
                <FaGlobe />
                Global Dorm Settings
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-9 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              >
                <option>All</option>
                <option>Pending</option>
                <option>Waiting</option>
                <option>PaymentPending</option>
                <option>Assigned</option>
                <option>Rejected</option>
                <option>Approved</option>
              </select>
            </div>
          </div>
        )}
        <button className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors ml-auto">
          <FaDownload className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Student</th>
              <th className="px-6 py-3 text-left font-semibold">Student ID</th>
              {viewMode === 'Applications' ? (
                <>
                  <th className="px-6 py-3 text-left font-semibold">Check-in Date</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </>
              ) : (
                <>
                  <th className="px-6 py-3 text-left font-semibold">Campus</th>
                  <th className="px-6 py-3 text-left font-semibold">Building/Room</th>
                  <th className="px-6 py-3 text-left font-semibold">Department</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {viewMode === 'Applications' && filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr
                  key={student.applicationId || student.id}
                  onClick={() => navigate(`/students/${student.applicationId || student.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 flex items-center gap-3">
                    <ProfilePictureUpload 
                      currentImage={student.user?.profilePicture} 
                      size="small" 
                      onUploadSuccess={() => fetchStudents()}
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{student.id}</td>
                  <td className="px-6 py-4 text-slate-700">{student.checkIn}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${student.statusColor}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'Assigned' ? 'bg-emerald-500' :
                        student.status === 'Rejected' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {student.status !== 'Assigned' && student.status !== 'Rejected' && student.needsAdminApproval && (
                        <>
                          <button
                            onClick={(e) => handleReject(e, student.applicationId)}
                            disabled={processingId === student.applicationId}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Reject"
                          >
                            {processingId === student.applicationId ? (
                              <FaSpinner className="w-4 h-4 animate-spin" />
                            ) : (
                              <FaTimes className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) => handleApprove(e, student.applicationId)}
                            disabled={processingId === student.applicationId}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            {processingId === student.applicationId ? (
                              <FaSpinner className="w-4 h-4 animate-spin" />
                            ) : (
                              <FaCheck className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : viewMode === 'Residents' && filteredResidents.length > 0 ? (
              filteredResidents.map((student) => (
                <tr key={student._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-900">{student.user?.name || student.fullName || 'No Name'}</p>
                      <p className="text-xs text-slate-500">{student.user?.email || ''}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{student.user?.userID || student.studentID || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-700">{student.campus || '-'}</td>
                  <td className="px-6 py-4 text-slate-700">{student.building || '-'} / {student.roomNumber || '-'}</td>
                  <td className="px-6 py-4 text-slate-700">{student.department || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                  {loading ? 'Loading students...' : 'No students found for the selected type.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 text-xs text-slate-500">
          <span>Rows per page: 5</span>
          <div className="flex items-center gap-4">
            <span>
              {filteredStudents.length > 0 ? `1-${Math.min(filteredStudents.length, 5)}` : '0'} of {filteredStudents.length}
            </span>
            <div className="flex items-center gap-2">
              <button className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
                <FaChevronLeft className="w-3 h-3" />
              </button>
              <button className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
                <FaChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FaGlobe className="text-purple-600" />
                Dorm Application Settings
              </h2>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Global Announcement Message</label>
                <textarea
                  value={notifyText}
                  onChange={(e) => setNotifyText(e.target.value)}
                  placeholder="Write a message for all students, admins, and proctors..."
                  className="w-full min-h-[120px] rounded-xl border border-slate-200 p-3 bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all outline-none"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDormOpen}
                    onChange={(e) => setIsDormOpen(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">Open Dorm Applications</span>
                    <span className="block text-xs text-slate-500 mt-0.5">Allow students to submit placement requests.</span>
                  </div>
                </label>
              </div>

              {isDormOpen && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <FaCalendarAlt className="text-slate-400" />
                    Scheduled Opening Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={openedAt}
                    onChange={(e) => setOpenedAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 bg-slate-50 text-slate-800 focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    If set in the future, students cannot apply until this exact time. Students from outside Addis apply immediately, Shager waits 3 mins, Addis waits 5 mins relative to this time.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateConfig}
                disabled={updatingConfig}
                className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
              >
                {updatingConfig && <FaSpinner className="w-4 h-4 animate-spin" />}
                Notify All & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


