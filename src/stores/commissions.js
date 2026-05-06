import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { commissionsApi } from '@/api/commissions'
import { usersApi } from '@/api/serviceOrders'

const todayStr = () => new Date().toLocaleDateString('en-CA')

export const useCommissionsStore = defineStore('commissions', () => {
  const mechanics        = ref([])
  const deliveredOrders  = ref([])
  const pendingOrders    = ref([])
  const loading          = ref(false)
  const error            = ref(null)
  const saving           = ref(false)
  const saveError        = ref(null)
  const saveSuccess      = ref(false)

  const filters = ref({
    mechanic_id: null,
    date_from:   todayStr(),
    date_to:     todayStr(),
  })

  const selectedMechanic = computed(() =>
    mechanics.value.find(m => m.id === Number(filters.value.mechanic_id)) ?? null
  )

  async function fetchMechanics() {
    try {
      const res = await usersApi.getMechanics()
      mechanics.value = res.data
    } catch {
      // non-blocking
    }
  }

  async function fetchOrders() {
    if (!filters.value.mechanic_id) return
    loading.value = true
    error.value   = null
    try {
      const [deliveredRes, pendingRes] = await Promise.all([
        commissionsApi.getOrders({
          mechanic_id: filters.value.mechanic_id,
          status:      'delivered',
          date_from:   filters.value.date_from,
          date_to:     filters.value.date_to,
        }),
        commissionsApi.getOrders({
          mechanic_id: filters.value.mechanic_id,
          date_to:     filters.value.date_to,
        }),
      ])
      deliveredOrders.value = deliveredRes.data
      pendingOrders.value   = pendingRes.data.filter(o => o.status !== 'delivered')
    } catch (e) {
      error.value = e.response?.data?.message ?? 'Error al cargar los servicios'
    } finally {
      loading.value = false
    }
  }

  async function bulkSave(commissions) {
    saving.value      = true
    saveError.value   = null
    saveSuccess.value = false
    try {
      await commissionsApi.bulkUpdateCommissions(commissions)
      saveSuccess.value = true
      setTimeout(() => { saveSuccess.value = false }, 3000)
      await fetchOrders()
    } catch (e) {
      saveError.value = e.response?.data?.message ?? 'Error al guardar las comisiones'
    } finally {
      saving.value = false
    }
  }

  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  return {
    mechanics,
    deliveredOrders,
    pendingOrders,
    loading,
    error,
    saving,
    saveError,
    saveSuccess,
    filters,
    selectedMechanic,
    fetchMechanics,
    fetchOrders,
    bulkSave,
    setFilters,
  }
})
