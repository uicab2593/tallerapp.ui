import api from './axios'

export const vehicleCatalogsApi = {
  search: (q) => api.get('/vehicle-catalogs/search', { params: { q } }),
  create: (data) => api.post('/vehicle-catalogs', data),
  update: (id, data) => api.patch(`/vehicle-catalogs/${id}`, data),
}
