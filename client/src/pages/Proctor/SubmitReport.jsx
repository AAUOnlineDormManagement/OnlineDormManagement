import React, { useState } from 'react';
import { FaUpload, FaPaperPlane, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import proctorApi from '../../api/proctorApi';

const reportTypes = [
  'Maintenance Report',
  'Student Incident Report',
  'Complaint Summary Report',
  'Daily Shift Report',
  'Lost & Found Report',
  'General Observation / Suggestion'
];

export default function SubmitReport() {
  const [formData, setFormData] = useState({
    reportType: '',
    title: '',
    description: '',
    priority: 'Low'
  });
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    // Simple validation
    if (attachments.length + files.length > 5) {
      toast.error('Maximum 5 attachments allowed');
      return;
    }
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reportType) return toast.error('Please select a report type');
    if (!formData.title.trim()) return toast.error('Please enter a title');
    if (!formData.description.trim()) return toast.error('Please provide a description');

    setIsSubmitting(true);
    const toastId = toast.loading('Submitting report...');

    try {
      const data = new FormData();
      data.append('reportType', formData.reportType);
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('priority', formData.priority);
      
      attachments.forEach(file => {
        data.append('attachments', file);
      });

      await proctorApi.submitReport(data);
      toast.success('Report submitted successfully!', { id: toastId });
      
      // Reset form
      setFormData({ reportType: '', title: '', description: '', priority: 'Low' });
      setAttachments([]);
    } catch (error) {
      toast.error(error.message || 'Failed to submit report', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-blue-600 p-6 text-white">
            <h2 className="text-2xl font-bold">Submit a Proctor Report</h2>
            <p className="text-blue-100 mt-2">File an official report to the Campus Administration</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Report Type <span className="text-rose-500">*</span></label>
                <select 
                  name="reportType" 
                  value={formData.reportType} 
                  onChange={handleChange}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {reportTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                <select 
                  name="priority" 
                  value={formData.priority} 
                  onChange={handleChange}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Low">Low (Routine)</option>
                  <option value="Medium">Medium (Attention Needed)</option>
                  <option value="High">High (Urgent)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Title <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                name="title" 
                value={formData.title} 
                onChange={handleChange}
                placeholder="Brief summary of the report"
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description / Details <span className="text-rose-500">*</span></label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange}
                rows="6"
                placeholder="Provide all necessary details..."
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Attachments (Images/Docs)</label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg border border-slate-300 flex items-center gap-2 transition-colors">
                  <FaUpload /> Choose Files
                  <input type="file" multiple className="hidden" onChange={handleFileChange} />
                </label>
                <span className="text-sm text-slate-500">{attachments.length} / 5 files selected</span>
              </div>
              
              {attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full flex items-center gap-2 text-sm border border-blue-200">
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button type="button" onClick={() => removeAttachment(idx)} className="text-rose-500 hover:text-rose-700">
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : <><FaPaperPlane /> Submit Report</>}
              </button>
            </div>
          </form>
        </div>
      </div>
  );
}
