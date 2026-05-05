import api from './axios'

export const serviceOrdersApi = {
  getActive:     (params = {}) => api.get('/service-orders', { params }),
  getDelivered:  (params = {}) => api.get('/service-orders', { params: { status: 'delivered', ...params } }),
  getById:       (id) => api.get(`/service-orders/${id}`),
  create:        (data) => api.post('/service-orders', data),
  update:        (id, data) => api.patch(`/service-orders/${id}`, data),
  getStatusLogs: (id) => api.get(`/service-orders/${id}/status-logs`),
}

export const usersApi = {
  getMechanics: () => api.get('/users/mechanics'),
}
