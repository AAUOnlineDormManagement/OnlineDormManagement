import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaSearch, FaFilter, FaClock, FaCheckCircle, FaSpinner, FaTimesCircle } from 'react-icons/fa';
import proctorApi from '../../../api/proctorApi';
import toast from 'react-hot-toast';

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await proctorApi.getMyReports();
      setReports(res.reports || []);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          report.reportType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || report.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Submitted': return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold flex items-center gap-1"><FaFileAlt/> Submitted</span>;
      case 'InProgress': return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold flex items-center gap-1"><FaSpinner className="animate-spin"/> In Progress</span>;
      case 'Resolved': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1"><FaCheckCircle/> Resolved</span>;
      case 'Closed': return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold flex items-center gap-1"><FaTimesCircle/> Closed</span>;
      default: return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">{status}</span>;
    }
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'text-rose-500 bg-rose-50 border-rose-200';
    if (priority === 'Medium') return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-emerald-500 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Submitted Reports</h1>
            <p className="text-slate-500 text-sm">View and track the status of reports you have filed.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search reports..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-2 pl-3 pr-8 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="InProgress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <FaSpinner className="animate-spin text-4xl text-blue-500" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FaFileAlt size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No reports found</h3>
            <p className="text-slate-500 mt-2">You haven't submitted any reports matching this criteria yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map(report => (
              <div key={report._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4 gap-2">
                  <div className={`px-2 py-1 border rounded text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(report.priority)}`}>
                    {report.priority} Priority
                  </div>
                  {getStatusBadge(report.status)}
                </div>
                
                <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-2">{report.title}</h3>
                <p className="text-xs text-blue-600 font-medium mb-3">{report.reportType}</p>
                
                <p className="text-slate-600 text-sm mb-4 line-clamp-3 flex-grow">{report.description}</p>
                
                {report.adminComment && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 mt-auto">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Admin Response:</p>
                    <p className="text-sm text-slate-600 italic line-clamp-2">"{report.adminComment}"</p>
                  </div>
                )}
                
                <div className="flex items-center text-xs text-slate-400 pt-4 border-t border-slate-100 mt-auto">
                  <FaClock className="mr-1.5" />
                  {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
}
