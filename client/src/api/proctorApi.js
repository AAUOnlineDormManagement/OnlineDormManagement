import api from './axiosConfig';

const proctorApi = {
  // Get proctor dashboard stats
  getDashboard: async () => {
    try {
      const response = await api.get('/proctor/dashboard');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error fetching dashboard data' };
    }
  },

  // Get students in proctor's building
  getStudents: async () => {
    try {
      const response = await api.get('/proctor/students');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error fetching students' };
    }
  },

  // Get proctor profile
  getProfile: async () => {
    try {
      const response = await api.get('/proctor/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error fetching profile' };
    }
  },

  // Update student status/notes
  updateStudent: async (id, data) => {
    try {
      const response = await api.put(`/proctor/students/${id}`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error updating student' };
    }
  },
  // Get proctor reports
  getReports: async (days) => {
    try {
      const response = await api.get('/proctor/reports', { params: { days } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error fetching reports' };
    }
  },
  // Get proctor overview
  getOverview: async () => {
    try {
      const response = await api.get('/proctor/overview');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error fetching overview' };
    }
  },

  // Submit a new Proctor Report
  submitReport: async (formData) => {
    try {
      const response = await api.post('/proctor/proctor-reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error submitting report' };
    }
  },

  // Get own submitted Proctor Reports
  getMyReports: async () => {
    try {
      const response = await api.get('/proctor/proctor-reports/my');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error fetching my reports' };
    }
  }
};

export default proctorApi;

