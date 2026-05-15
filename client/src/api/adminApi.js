import api from './axiosConfig';

const adminApi = {
  overview: async () => {
    const res = await api.get('/admin/overview');
    return res.data;
  },
  students: async () => {
    const res = await api.get('/admin/students');
    return res.data;
  },
  buildings: async () => {
    const res = await api.get('/admin/buildings');
    return res.data;
  },
  proctors: async () => {
    const res = await api.get('/admin/proctors');
    return res.data;
  },
  applications: async () => {
    const res = await api.get('/admin/applications');
    return res.data;
  },
  getApplication: async (id) => {
    const res = await api.get(`/admin/applications/${id}`);
    return res.data;
  },
  reviewApplication: async (id, status, notes) => {
    const res = await api.put(`/admin/applications/${id}/review`, { status, notes });
    return res.data;
  },
  assignProctor: async (proctorUserID, buildingID) => {
    const res = await api.post('/admin/assign-proctor', { proctorUserID, buildingID });
    return res.data;
  },
  reports: async (days = 30) => {
    const res = await api.get('/admin/reports', { params: { days } });
    return res.data;
  },
  addProctor: async (proctorData) => {
    const res = await api.post('/admin/proctors', proctorData);
    return res.data;
  },
  updateProctor: async (id, proctorData) => {
    const res = await api.put(`/admin/proctors/${id}`, proctorData);
    return res.data;
  },
  deleteProctor: async (id) => {
    const res = await api.delete(`/admin/proctors/${id}`);
    return res.data;
  },
  getProctorReports: async () => {
    const res = await api.get('/admin/proctor-reports');
    return res.data;
  },
  updateProctorReportStatus: async (id, status, adminComment) => {
    const res = await api.put(`/admin/proctor-reports/${id}/status`, { status, adminComment });
    return res.data;
  }
};

export default adminApi;

