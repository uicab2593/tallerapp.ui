import api from './axios'

export const customersApi = {
  list:    (params) => api.get('/customers', { params }),
  autocomplete:  (q)     => api.get('/customers/search', { params: { q } }),
  searchByPhone: (phone) => api.get('/customers/search', { params: { phone } }),
  create:  (data) => api.post('/customers', data),
  update:  (id, data) => api.patch(`/customers/${id}`, data),
  vehicles: (id) => api.get(`/customers/${id}/vehicles`),
}
