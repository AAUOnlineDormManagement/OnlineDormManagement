import api from './axiosConfig';
import { clearDraft } from '../utils/draftStorage';

// Request and Response interceptors are now centralized in axiosConfig.js

// Auth API methods
const authApi = {
  // Login user
  login: async (userId, password) => {
    try {
      console.log('🔐 Login attempt for:', userId);
      
      const response = await api.post('/auth/login', {
        userId: userId.trim(),
        password: String(password ?? '').trim(),
      });
      
      // Store auth data
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user || {
          userId: response.data.userId,
          name: response.data.name,
          role: response.data.role
        }));
        
        // Set default auth header
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      
      return response.data;
      
    } catch (error) {
      const serverMsg = error.response?.data?.message || error.message;
      console.error('❌ Login failed:', serverMsg);
      if (error.response?.data?.error) console.error('🔍 Server Detail:', error.response.data.error);
      throw error;
    }
  },
  
  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    console.log('👋 User logged out');
    
    // Clear any pending dorm application drafts so another student doesn't see them
    clearDraft().catch(e => console.error('Failed to clear draft on logout:', e));
  },
  
  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },
  
  // Get auth token
  getToken: () => {
    return localStorage.getItem('token');
  },
  
  // Set auth header (for manual token setting)
  setAuthHeader: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },
  
  // Change password
  changePassword: async (oldPassword, newPassword) => {
    try {
      const response = await api.put('/auth/change-password', {
        oldPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Change password failed:', error);
      throw error;
    }
  },
  
  // Update profile picture
  updateProfilePicture: async (formData) => {
    try {
      const response = await api.post('/auth/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      throw error;
    }
  },
  
  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      console.error('Forgot password failed:', error);
      throw error;
    }
  },
  
  // Reset password
  resetPassword: async (token, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Reset password failed:', error);
      throw error;
    }
  },
  
  // Verify token
  verifyToken: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');
      
      const response = await api.get('/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Token verification failed:', error);
      this.logout();
      throw error;
    }
  },
  
  // Check server health
  checkHealth: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },
  updateProfile: async (data) => {
    try {
      const response = await api.put('/auth/profile-update', data);
      return response.data;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error.response?.data || error;
    }
  },

  // ── Face Recognition ────────────────────────────────────────────────────────

  /** Login using a face descriptor array (128 floats from face-api.js) and optional userId */
  faceLogin: async (descriptor, userId) => {
    try {
      const response = await api.post('/auth/face-login', { descriptor, userId });
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user || {
          userId: response.data.userId,
          name: response.data.name,
          role: response.data.role
        }));
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      return response.data;
    } catch (error) {
      const serverMsg = error.response?.data?.message || error.message;
      console.error('❌ Face login failed:', serverMsg);
      throw error;
    }
  },

  /** Get profile picture and face status by user ID / UGR */
  getProfilePicture: async (userId) => {
    try {
      const response = await api.get(`/auth/profile-picture/${encodeURIComponent(userId)}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get profile picture:', error);
      throw error;
    }
  },

  /** Register the current user's face — must be authenticated first */
  registerFace: async (descriptor) => {
    try {
      const response = await api.post('/auth/register-face', { descriptor });
      return response.data;
    } catch (error) {
      console.error('Face registration failed:', error);
      throw error.response?.data || error;
    }
  },

  /** Remove the current user's stored face descriptor */
  removeFace: async () => {
    try {
      const response = await api.delete('/auth/remove-face');
      return response.data;
    } catch (error) {
      console.error('Face removal failed:', error);
      throw error.response?.data || error;
    }
  },

  /** Get the current user profile from /auth/me */
  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('Fetching current user profile failed:', error);
      throw error.response?.data || error;
    }
  }
};

// Initialization is now centralized in axiosConfig.js

export default authApi;