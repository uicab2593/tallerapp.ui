import { defineStore } from 'pinia'
import { ref } from 'vue'
import { customersApi } from '@/api/customers'

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref([])
  const meta      = ref({ current_page: 1, last_page: 1, total: 0, per_page: 20 })
  const loading   = ref(false)
  const error     = ref(null)

  const filters = ref({
    name:  '',
    phone: '',
    email: '',
    plate: '',
  })

  async function fetchCustomers(page = 1) {
    loading.value = true
    error.value   = null
    try {
      const params = { page, per_page: meta.value.per_page }
      if (filters.value.name)  params.name  = filters.value.name
      if (filters.value.phone) params.phone = filters.value.phone
      if (filters.value.email) params.email = filters.value.email
      if (filters.value.plate) params.plate = filters.value.plate
      const res = await customersApi.list(params)
      customers.value = res.data.data
      meta.value = {
        current_page: res.data.current_page,
        last_page:    res.data.last_page,
        total:        res.data.total,
        per_page:     res.data.per_page,
      }
    } catch (e) {
      error.value = e.response?.data?.message ?? 'Error al cargar los clientes'
    } finally {
      loading.value = false
    }
  }

  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  function resetFilters() {
    filters.value = { name: '', phone: '', email: '', plate: '' }
  }

  return { customers, meta, loading, error, filters, fetchCustomers, setFilters, resetFilters }
})
