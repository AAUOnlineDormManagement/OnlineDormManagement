import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaSearch, FaFilter, FaCheck, FaTimes, FaSpinner, FaEye, FaDownload } from 'react-icons/fa';
import adminApi from '../../api/adminApi';
import DashboardLayout from '../../components/dashboard/Students/DashboardLayout'; // or whatever standard layout they use, but let's just use standard div and let router handle layout like proctor
import toast from 'react-hot-toast';

export default function ProctorReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getProctorReports();
      setReports(res.reports || []);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (report.proctor?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || report.status === filterStatus;
    const matchesPriority = filterPriority === 'All' || report.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleOpenModal = (report) => {
    setSelectedReport(report);
    setUpdateStatus(report.status);
    setAdminComment(report.adminComment || '');
    setIsModalOpen(true);
  };

  const handleUpdateReport = async () => {
    if (!selectedReport) return;
    setIsUpdating(true);
    try {
      await adminApi.updateProctorReportStatus(selectedReport._id, updateStatus, adminComment);
      toast.success('Report updated successfully');
      setIsModalOpen(false);
      fetchReports();
    } catch (error) {
      toast.error(error.message || 'Failed to update report');
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'text-rose-600 bg-rose-50 border-rose-200';
    if (priority === 'Medium') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Proctor Reports</h1>
          <p className="text-slate-500 mt-1">Review and manage reports submitted by proctors across campus.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search title or proctor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm w-full md:w-64"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="py-2 pl-3 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="InProgress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <select 
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="py-2 pl-3 pr-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Report Info</th>
                <th className="px-6 py-4 font-semibold">Proctor</th>
                <th className="px-6 py-4 font-semibold">Type & Priority</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <FaSpinner className="animate-spin text-3xl text-indigo-500 mx-auto" />
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    No reports found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredReports.map(report => (
                  <tr key={report._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900 line-clamp-1">{report.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{new Date(report.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{report.proctor?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{report.campus}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-indigo-600 text-xs mb-1">{report.reportType}</p>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPriorityColor(report.priority)}`}>
                        {report.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold
                        ${report.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                          report.status === 'InProgress' ? 'bg-amber-100 text-amber-700' :
                          report.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                          'bg-slate-100 text-slate-700'}`}
                      >
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleOpenModal(report)}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-2"
                      >
                        <FaEye /> Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <h3 className="text-xl font-bold text-slate-900">Review Report</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm">
                <FaTimes />
              </button>
            </div>
            
            <div className="p-6 flex-grow">
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                <div>
                  <h4 className="text-xl font-bold text-slate-800 mb-2">{selectedReport.title}</h4>
                  <p className="text-sm text-indigo-600 font-semibold mb-2">{selectedReport.reportType}</p>
                  <p className="text-sm text-slate-500">Submitted by: <span className="font-semibold text-slate-700">{selectedReport.proctor?.name}</span> ({selectedReport.campus})</p>
                  <p className="text-sm text-slate-500">Date: {new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
                <div className={`px-3 py-1 rounded text-xs font-bold uppercase ${getPriorityColor(selectedReport.priority)}`}>
                  {selectedReport.priority} Priority
                </div>
              </div>

              <div className="mb-6">
                <h5 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Description</h5>
                <div className="bg-slate-50 rounded-xl p-4 text-slate-700 text-sm leading-relaxed border border-slate-200">
                  {selectedReport.description}
                </div>
              </div>

              {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                <div className="mb-6">
                  <h5 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-2">Attachments</h5>
                  <div className="flex flex-wrap gap-3">
                    {selectedReport.attachments.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-100">
                        <FaDownload /> Attachment {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Update Status</label>
                  <select 
                    value={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Admin Comments</label>
                  <textarea 
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Add notes for the proctor..."
                    rows="3"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateReport}
                disabled={isUpdating}
                className="px-6 py-2.5 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {isUpdating ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                Save Updates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
