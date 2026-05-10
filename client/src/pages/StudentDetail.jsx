import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  FaCheck,
  FaCheckCircle,
  FaChevronLeft,
  FaDownload,
  FaFileImage,
  FaFilePdf,
  FaTimes,
  FaFile,
  FaWheelchair,
  FaSpinner
} from 'react-icons/fa';
import adminApi from '../api/adminApi';
import toast from 'react-hot-toast';
import AdminHeader from '../components/layout/AdminHeader';
import { getUploadBaseUrl } from '../utils/apiConfig';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await adminApi.getApplication(id);
        if (!alive) return;
        setApplication(data);
      } catch (error) {
        console.error('Error fetching application:', error);
        toast.error('Failed to load application details');
        if (!alive) return;
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const handleApprove = async () => {
    if (!reviewNotes.trim() && application?.status === 'Pending') {
      toast.error('Please add review notes before approving');
      return;
    }
    
    try {
      setProcessing(true);
      await adminApi.reviewApplication(id, 'Approved', reviewNotes);
      toast.success('Application approved successfully');
      navigate('/students');
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error(error.response?.data?.message || 'Failed to approve application');
    } finally {
      setProcessing(false);
      }
    };

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      toast.error('Please add rejection reason');
      return;
    }
    
    try {
      setProcessing(true);
      await adminApi.reviewApplication(id, 'Rejected', reviewNotes);
      toast.success('Application rejected');
      navigate('/students');
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error(error.response?.data?.message || 'Failed to reject application');
    } finally {
      setProcessing(false);
        }
      };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <FaSpinner className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!application || !application.student) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Application not found</p>
          <Link to="/students" className="text-blue-600 hover:underline">
            Back to Students
          </Link>
        </div>
      </div>
    );
  }

  const student = application.student;
  const studentType = application.studentType || 
    (student.sponsorship === 'Self-Sponsored' ? 'Self Sponsored' : 
     student.sponsorship === 'Government' ? 'Government Sponsorship' : 'Other');
  
  const isSpecialNeeds = studentType === 'Special Needs' || application.specialNeeds;
  const isStaffRelative = studentType === 'Staff Relatives' || studentType === 'Staff Relative';
  const isGovernmentSponsored = studentType === 'Government Sponsorship' || student.sponsorship === 'Government';
  const isSelfSponsored = studentType === 'Self Sponsored' || student.sponsorship === 'Self-Sponsored';
  const needsAdminApproval = application.isStaffRelated || application.isSpecialNeed || student.isStaffRelated || student.isSpecialNeed || isSpecialNeeds || isStaffRelative;

  // Helper to get file URL
  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    if (filePath.startsWith('http')) return filePath;
    // Remove leading slash if present and construct URL
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const baseURL = getUploadBaseUrl();
    // Files are served from /uploads route
    return `${baseURL}/${cleanPath}`;
  };

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      {/* Page Title Section */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Student Application Review</h1>
          <p className="text-sm text-slate-500">
            Review details for {studentType.toLowerCase()} student application.
          </p>
        </div>
        <Link
          to="/students"
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
        >
          <FaChevronLeft className="w-3 h-3" />
          Back to List
        </Link>
      </div>

      {/* Student Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-start gap-6">
          <div className="relative flex-shrink-0">
            <div className="w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-3xl font-bold text-slate-600">
                {(student.user?.name || student.fullName || 'NN')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-3">{student.user?.name || student.fullName || 'No Name'}</h1>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    application.status === 'Assigned' ? 'bg-emerald-100 text-emerald-700' :
                    application.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    application.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {application.status}
                  </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {studentType}
                    </span>
                </div>
                  <div className="space-y-1">
                  <p className="text-sm text-slate-600">ID: {student.user?.userID || student.studentID || 'N/A'}</p>
                  <p className="text-sm text-slate-600">Department: {student.department}</p>
                  <p className="text-sm text-slate-600">Year: {student.year || application.yearOfStudy}</p>
                  <p className="text-sm text-slate-500">Applied {new Date(application.createdAt).toLocaleDateString()}</p>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal & Academic Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <h2 className="text-lg font-semibold text-slate-900 mb-5">Personal & Academic Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-500 mb-1">Full Name</p>
                <p className="text-sm font-semibold text-slate-900">{student.user?.name || student.fullName || 'No Name'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Student ID</p>
                <p className="text-sm font-semibold text-slate-900">{student.user?.userID || student.studentID || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Email Address</p>
                <p className="text-sm font-semibold text-slate-900">{student.user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Gender</p>
                <p className="text-sm font-semibold text-slate-900">{student.user?.gender || student.gender || application.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Department</p>
                <p className="text-sm font-semibold text-slate-900">{student.department || application.department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Year of Study</p>
                <p className="text-sm font-semibold text-slate-900">{student.year || application.yearOfStudy || 'N/A'}</p>
              </div>
              {application.origin && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Origin</p>
                  <p className="text-sm font-semibold text-slate-900">{application.origin}</p>
                </div>
              )}
              {application.academicYear && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Academic Year</p>
                  <p className="text-sm font-semibold text-slate-900">{application.academicYear}</p>
                </div>
              )}
            </div>
          </div>

          {/* Application Reason */}
          {application.reason && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <h2 className="text-lg font-semibold text-slate-900 mb-5">Application Reason</h2>
              <p className="text-sm text-slate-700 leading-relaxed">{application.reason}</p>
        </div>
          )}

          {/* Special Needs */}
          {isSpecialNeeds && application.specialNeeds && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <FaWheelchair className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Special Needs</h2>
                </div>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{application.specialNeeds}</p>
            </div>
          )}

          {/* Review Notes Section */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <h2 className="text-lg font-semibold text-slate-900 mb-5">Review Notes</h2>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add your review notes or comments here..."
              className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 resize-none"
            />
            {application.notes && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Previous Notes:</p>
                <p className="text-sm text-slate-700">{application.notes}</p>
              </div>
            )}
            </div>
          </div>

        {/* Right Column - Documents */}
          <div className="lg:col-span-1 space-y-6">
          {/* Kebele ID Document */}
          {application.kebeleID && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Kebele ID</h2>
              <p className="text-sm text-slate-500 mb-5">Identity document</p>
              <div className="relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 mb-4">
                <div className="flex flex-col items-center justify-center text-center">
                  <FaFileImage className="w-12 h-12 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Kebele ID Document</p>
                </div>
                  </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FaFileImage className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-600">kebeleID</span>
                </div>
                <a
                  href={getFileUrl(application.kebeleID)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-white text-slate-500 transition-colors"
                >
                  <FaDownload className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Payment Receipt (for self-sponsored) */}
          {isSelfSponsored && application.paymentReceipt && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Payment Receipt</h2>
              <p className="text-sm text-slate-500 mb-5">Proof of payment</p>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FaFilePdf className="w-4 h-4 text-red-600" />
                  <span className="text-xs text-slate-600">payment_receipt</span>
                </div>
                <a
                  href={getFileUrl(application.paymentReceipt)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-white text-slate-500 transition-colors"
                >
                  <FaDownload className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Proof Letter (for government sponsored) */}
          {isGovernmentSponsored && application.proofLetter && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Sponsorship Letter</h2>
              <p className="text-sm text-slate-500 mb-5">Government sponsorship proof</p>
              <div className="relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 mb-4">
                <div className="flex flex-col items-center justify-center text-center">
                  <FaFileImage className="w-12 h-12 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Sponsorship Letter</p>
                </div>
                {application.paymentStatus === 'Verified' && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      <FaCheckCircle className="w-3 h-3" />
                      Verified
                  </span>
                  </div>
                )}
                  </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FaFileImage className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-600">proof_letter</span>
                </div>
                <a
                  href={getFileUrl(application.proofLetter)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-white text-slate-500 transition-colors"
                >
                  <FaDownload className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* Supporting Documents */}
          {application.supportingDocuments && application.supportingDocuments.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <h2 className="text-lg font-semibold text-slate-900 mb-5">Supporting Documents</h2>
              <div className="space-y-3">
                {application.supportingDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FaFile className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-600">Document {index + 1}</span>
              </div>
                    <a
                      href={getFileUrl(doc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-white text-slate-500 transition-colors"
                    >
                      <FaDownload className="w-4 h-4" />
                    </a>
            </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Room Info */}
          {application.assignedRoom && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <h2 className="text-lg font-semibold text-slate-900 mb-5">Assigned Room</h2>
              <div className="space-y-2">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Room:</span> {application.assignedRoom.roomNumber || 'N/A'}
                </p>
                {application.assignedRoom.building && (
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">Building:</span> {application.assignedRoom.building.name || application.assignedRoom.building.buildingID}
                  </p>
                )}
              </div>
                  </div>
          )}
                </div>
              </div>

      {/* Action Buttons */}
      {application.status !== 'Assigned' && application.status !== 'Rejected' && needsAdminApproval && (
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={handleReject}
            disabled={processing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaTimes className="w-4 h-4" />}
            Reject Application
                      </button>
          <button
            onClick={handleApprove}
            disabled={processing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaCheck className="w-4 h-4" />}
            Approve Application
                      </button>
                    </div>
      )}
    </main>
  );
}
