import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useBranchStore } from '@/stores/branch'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }

  const branch = useBranchStore()
  if (branch.activeBranch?.id) {
    config.headers['X-Branch-Id'] = branch.activeBranch.id
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Error de red'
    return Promise.reject(new Error(message))
  },
)

export default api
