import api from './axios'

export const commissionsApi = {
  getOrders: (params = {}) => api.get('/service-orders', { params }),
  bulkUpdateCommissions: (commissions) =>
    api.patch('/service-order-mechanics/bulk-commission', { commissions }),
}
