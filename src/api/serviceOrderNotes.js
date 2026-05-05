import api from './axios'

export const serviceOrderNotesApi = {
  getAll: (orderId) => api.get(`/service-orders/${orderId}/notes`),
  create: (orderId, note) => api.post(`/service-orders/${orderId}/notes`, { note }),
  update: (orderId, noteId, note) => api.patch(`/service-orders/${orderId}/notes/${noteId}`, { note }),
}
