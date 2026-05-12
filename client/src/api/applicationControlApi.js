import api from './axiosConfig';

const applicationControlApi = {
  getSettings: async () => {
    const res = await api.get('/application-control');
    return res.data;
  },
  createSetting: async (data) => {
    const res = await api.post('/application-control', data);
    return res.data;
  },
  updateSetting: async (id, data) => {
    const res = await api.put(`/application-control/${id}`, data);
    return res.data;
  },
  deleteSetting: async (id) => {
    const res = await api.delete(`/application-control/${id}`);
    return res.data;
  }
};

export default applicationControlApi;
