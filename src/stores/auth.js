import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api/axios'
import { useBranchStore } from '@/stores/branch'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('auth_token') ?? null)
  const user = ref(null)

  const isAuthenticated = computed(() => !!token.value)

  function setToken(newToken) {
    token.value = newToken
    if (newToken) {
      localStorage.setItem('auth_token', newToken)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  function hydrateBranches(data) {
    const branch = useBranchStore()
    branch.setBranches(data.branches)
    branch.setActiveBranch(data.active_branch)
  }

  async function login(phone, password) {
    const { data } = await api.post('/auth/login', { phone, password })
    setToken(data.token)
    user.value = data.user
    hydrateBranches(data)
  }

  async function fetchUser() {
    const { data } = await api.get('/auth/me')
    user.value = data.user
    hydrateBranches(data)
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      setToken(null)
      user.value = null
      useBranchStore().clear()
    }
  }

  return { token, user, isAuthenticated, login, logout, fetchUser }
})
