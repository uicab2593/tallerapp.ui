import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { serviceOrdersApi, usersApi } from '@/api/serviceOrders'

export const ACTIVE_STATUSES = ['received', 'diagnosed', 'approved', 'in_service', 'service_finished', 'delivered']

const KANBAN_STATUSES = ['received', 'diagnosed', 'approved', 'in_service', 'service_finished']
const REMOVE_FROM_KANBAN = ['not_approved', 'delivered']

export const STATUS_META = {
  received:         { label: 'Recibido',            color: 'blue' },
  diagnosed:        { label: 'Diagnosticado',        color: 'amber' },
  approved:         { label: 'Aprobado',             color: 'emerald' },
  not_approved:     { label: 'No aprobado',          color: 'red' },
  in_service:       { label: 'En Servicio',          color: 'violet' },
  service_finished: { label: 'Servicio finalizado',  color: 'teal' },
  delivered:        { label: 'Entregado',            color: 'gray' },
}

export const STATUS_TRANSITIONS = {
  received:         ['diagnosed', 'approved', 'not_approved', 'in_service', 'service_finished', 'delivered'],
  diagnosed:        ['approved', 'not_approved', 'in_service', 'service_finished', 'delivered'],
  approved:         ['in_service', 'service_finished', 'delivered'],
  not_approved:     ['in_service', 'service_finished', 'delivered'],
  in_service:       ['service_finished', 'delivered'],
  service_finished: ['delivered'],
  delivered:        [],
}

export const useServiceOrdersStore = defineStore('serviceOrders', () => {
  // ── Kanban (Tab 1) ───────────────────────────────────────────────────────────
  const orders    = ref([])
  const mechanics = ref([])
  const loading   = ref(false)
  const error     = ref(null)
  const filters   = ref({ date_from: '', date_to: '', status: '' })

  const visibleStatuses = computed(() =>
    filters.value.status ? [filters.value.status] : KANBAN_STATUSES,
  )

  const ordersByStatus = computed(() =>
    KANBAN_STATUSES.reduce((acc, status) => {
      acc[status] = orders.value.filter((o) => o.status === status)
      return acc
    }, {}),
  )

  async function fetchOrders() {
    loading.value = true
    error.value = null
    try {
      const params = {}
      if (filters.value.date_from) params.date_from = filters.value.date_from
      if (filters.value.date_to)   params.date_to   = filters.value.date_to
      if (filters.value.status)    params.status     = filters.value.status
      const res = await serviceOrdersApi.getActive(params)
      orders.value = res.data
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchMechanics() {
    const res = await usersApi.getMechanics()
    mechanics.value = res.data
  }

  async function createOrder(data) {
    const res = await serviceOrdersApi.create(data)
    const order = res.data
    if (!REMOVE_FROM_KANBAN.includes(order.status)) {
      orders.value.unshift(order)
    }
    return order
  }

  async function updateOrder(id, data) {
    const res = await serviceOrdersApi.update(id, data)
    const idx = orders.value.findIndex((o) => o.id === id)
    if (idx !== -1) {
      if (REMOVE_FROM_KANBAN.includes(res.data.status)) {
        orders.value.splice(idx, 1)
      } else {
        orders.value[idx] = res.data
      }
    }
    return res.data
  }

  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  // ── Entregados (Tab 2) ───────────────────────────────────────────────────────
  const deliveredOrders  = ref([])
  const deliveredMeta    = ref({ current_page: 1, last_page: 1, total: 0, per_page: 15 })
  const deliveredLoading = ref(false)
  const deliveredError   = ref(null)
  const deliveredFilters = ref({ date_from: '', date_to: '', customer_name: '', customer_phone: '', plate: '' })

  async function fetchDelivered(page = 1) {
    deliveredLoading.value = true
    deliveredError.value   = null
    try {
      const params = { page, per_page: deliveredMeta.value.per_page }
      if (deliveredFilters.value.date_from)     params.date_from      = deliveredFilters.value.date_from
      if (deliveredFilters.value.date_to)       params.date_to        = deliveredFilters.value.date_to
      if (deliveredFilters.value.customer_name) params.customer_name  = deliveredFilters.value.customer_name
      if (deliveredFilters.value.customer_phone)params.customer_phone = deliveredFilters.value.customer_phone
      if (deliveredFilters.value.plate)         params.plate          = deliveredFilters.value.plate
      const res = await serviceOrdersApi.getDelivered(params)
      deliveredOrders.value = res.data.data
      deliveredMeta.value = {
        current_page: res.data.current_page,
        last_page:    res.data.last_page,
        total:        res.data.total,
        per_page:     res.data.per_page,
      }
    } catch (e) {
      deliveredError.value = e.message
    } finally {
      deliveredLoading.value = false
    }
  }

  function setDeliveredFilters(newFilters) {
    deliveredFilters.value = { ...deliveredFilters.value, ...newFilters }
  }

  return {
    // kanban
    orders,
    mechanics,
    loading,
    error,
    filters,
    visibleStatuses,
    ordersByStatus,
    fetchOrders,
    fetchMechanics,
    createOrder,
    updateOrder,
    setFilters,
    // entregados
    deliveredOrders,
    deliveredMeta,
    deliveredLoading,
    deliveredError,
    deliveredFilters,
    fetchDelivered,
    setDeliveredFilters,
  }
})
