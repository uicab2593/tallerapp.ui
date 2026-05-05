import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getUsers, createUser, updateUser, deleteUser, assignBranchToUser, removeBranchFromUser } from '@/api/users'

export const useUsersStore = defineStore('users', () => {
  const users = ref([])
  const loading = ref(false)
  const error = ref(null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      users.value = await getUsers()
    } catch (e) {
      error.value = e.message ?? 'Error al cargar usuarios.'
    } finally {
      loading.value = false
    }
  }

  async function addUser(payload) {
    const user = await createUser(payload)
    users.value.push(user)
    users.value.sort((a, b) => a.name.localeCompare(b.name))
    return user
  }

  async function editUser(id, payload) {
    const updated = await updateUser(id, payload)
    const idx = users.value.findIndex(u => u.id === id)
    if (idx !== -1) users.value[idx] = updated
    users.value.sort((a, b) => a.name.localeCompare(b.name))
    return updated
  }

  async function removeUser(id) {
    await deleteUser(id)
    users.value = users.value.filter(u => u.id !== id)
  }

  async function toggleUserBranch(userId, branchId, assign) {
    if (assign) {
      await assignBranchToUser(branchId, userId)
    } else {
      await removeBranchFromUser(branchId, userId)
    }
    const user = users.value.find(u => u.id === userId)
    if (!user) return
    if (assign) {
      if (!user.branch_ids.includes(branchId)) user.branch_ids.push(branchId)
    } else {
      user.branch_ids = user.branch_ids.filter(id => id !== branchId)
    }
  }

  return { users, loading, error, fetchUsers, addUser, editUser, removeUser, toggleUserBranch }
})
