import api from './axios'

export const vehiclesApi = {
  update: (id, data) => api.patch(`/vehicles/${id}`, data),
}
