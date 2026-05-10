import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiConfig';

const API_URL = getApiBaseUrl();
const UNIVERSITY_ACCOUNT = import.meta.env.VITE_UNIVERSITY_ACCOUNT || '1000123456789';

// Create axios instance with auth headers
const api = axios.create({
  baseURL: API_URL,
  timeout: 55000, // 55 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        if (typeof config.headers.delete === 'function') {
          config.headers.delete('Content-Type');
          config.headers.delete('content-type');
        } else {
          delete config.headers['Content-Type'];
          delete config.headers['content-type'];
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const dormApi = {
  // Get current student's profile
  getStudentProfile: async () => {
    try {
      const response = await api.get('/students/me', { timeout: 10000 });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get current student's application
  getMyApplication: async () => {
    try {
      const response = await api.get('/dorm/application');
      const data = response.data;
      if (data && typeof data === 'object' && 'application' in data) {
        if (data.chapaPaymentUrl && data.application) {
          data.application.chapaPaymentUrl = data.chapaPaymentUrl;
        }
        return data.application;
      }
      if (data && data._id) return data;
      return null;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get global dorm application config
  getConfig: async () => {
    try {
      const response = await api.get('/dorm/config');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Submit dorm application
  submitApplication: async (formData) => {
    try {
      const response = await api.post('/dorm/application', formData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getAcademicYears: async () => {
    const res = await api.get('/dorm/options/academic-years');
    return res.data;
  },

  getDepartments: async () => {
    const res = await api.get('/dorm/options/departments');
    return res.data;
  },

  getGenderOptions: async () => {
    const res = await api.get('/dorm/options/gender-options');
    return res.data;
  },

  getStudentTypes: async () => {
    const res = await api.get('/dorm/options/student-types');
    return res.data;
  },

  getYearOfStudyOptions: async () => {
    const res = await api.get('/dorm/options/year-of-study-options');
    return res.data;
  },

  // Get university account number
  getUniversityAccount: () => UNIVERSITY_ACCOUNT,

  resetMyApplication: async () => {
    try {
      const response = await api.post('/dorm/reset-my-application');
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default dormApi;