import { defineStore } from 'pinia'
import { ref } from 'vue'
import { serviceOrdersApi } from '@/api/serviceOrders'

export const useServicesStore = defineStore('services', () => {
  const orders  = ref([])
  const meta    = ref({ current_page: 1, last_page: 1, total: 0, per_page: 20 })
  const loading = ref(false)
  const error   = ref(null)

  const filters = ref({
    date_from:      '',
    date_to:        '',
    customer_name:  '',
    customer_phone: '',
    plate:          '',
    status:         '',
  })

  async function fetchOrders(page = 1) {
    loading.value = true
    error.value   = null
    try {
      const params = { page, per_page: meta.value.per_page }
      if (filters.value.date_from)      params.date_from      = filters.value.date_from
      if (filters.value.date_to)        params.date_to        = filters.value.date_to
      if (filters.value.customer_name)  params.customer_name  = filters.value.customer_name
      if (filters.value.customer_phone) params.customer_phone = filters.value.customer_phone
      if (filters.value.plate)          params.plate          = filters.value.plate
      if (filters.value.status)         params.status         = filters.value.status
      const res = await serviceOrdersApi.getAll(params)
      orders.value = res.data.data
      meta.value = {
        current_page: res.data.current_page,
        last_page:    res.data.last_page,
        total:        res.data.total,
        per_page:     res.data.per_page,
      }
    } catch (e) {
      error.value = e.response?.data?.message ?? 'Error al cargar los servicios'
    } finally {
      loading.value = false
    }
  }

  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  function resetFilters() {
    filters.value = { date_from: '', date_to: '', customer_name: '', customer_phone: '', plate: '', status: '' }
  }

  return { orders, meta, loading, error, filters, fetchOrders, setFilters, resetFilters }
})
