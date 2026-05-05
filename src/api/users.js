import api from '@/api/axios'

export function getUsers() {
  return api.get('/users').then(r => r.data)
}

export function createUser(payload) {
  return api.post('/users', payload).then(r => r.data)
}

export function updateUser(id, payload) {
  return api.patch(`/users/${id}`, payload).then(r => r.data)
}

export function deleteUser(id) {
  return api.delete(`/users/${id}`)
}

export function assignBranchToUser(branchId, userId) {
  return api.post(`/branches/${branchId}/users`, { user_id: userId })
}

export function removeBranchFromUser(branchId, userId) {
  return api.delete(`/branches/${branchId}/users/${userId}`)
}
