import api from '@/api/axios'

export function getBranches() {
  return api.get('/branches').then(r => r.data)
}

export function createBranch(payload) {
  return api.post('/branches', payload).then(r => r.data)
}

export function updateBranch(id, payload) {
  return api.patch(`/branches/${id}`, payload).then(r => r.data)
}
