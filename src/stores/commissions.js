import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { commissionsApi } from '@/api/commissions'
import { usersApi } from '@/api/serviceOrders'

const todayStr = () => new Date().toLocaleDateString('en-CA')

export const useCommissionsStore = defineStore('commissions', () => {
  const mechanics      = ref([])
  const payableOrders  = ref([])
  const pendingOrders  = ref([])
  const paidOrders     = ref([])
  const loading        = ref(false)
  const error          = ref(null)
  const saving         = ref(false)
  const paying         = ref(false)

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
      const baseParams = { mechanic_id: filters.value.mechanic_id }
      const paidParams = {
        ...baseParams,
        commission_status: 'paid',
        date_from: filters.value.date_from,
        date_to:   filters.value.date_to,
      }

      const [payableRes, pendingRes, paidRes] = await Promise.all([
        commissionsApi.getOrders({ ...baseParams, commission_status: 'payable' }),
        commissionsApi.getOrders({ ...baseParams, commission_status: 'pending' }),
        commissionsApi.getOrders(paidParams),
      ])

      payableOrders.value = payableRes.data
      pendingOrders.value = pendingRes.data
      paidOrders.value    = paidRes.data
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function bulkSave(commissions) {
    saving.value = true
    try {
      await commissionsApi.bulkUpdateCommissions(commissions)
      await fetchOrders()
    } catch (e) {
      throw e
    } finally {
      saving.value = false
    }
  }

  async function togglePayable(assignmentId, makePayable) {
    const newStatus = makePayable ? 'payable' : 'pending'
    await commissionsApi.bulkUpdateCommissions([{
      id:                assignmentId,
      commission_amount: getCommissionAmount(assignmentId),
      commission_status: newStatus,
    }])
    await fetchOrders()
  }

  async function markAsPaid(ids) {
    paying.value = true
    try {
      await commissionsApi.bulkPay(ids)
      await fetchOrders()
    } catch (e) {
      throw e
    } finally {
      paying.value = false
    }
  }

  function getCommissionAmount(assignmentId) {
    const allOrders = [...payableOrders.value, ...pendingOrders.value, ...paidOrders.value]
    for (const order of allOrders) {
      const a = order.mechanics?.find(m => m.id === assignmentId)
      if (a) return parseFloat(a.commission_amount ?? 0)
    }
    return 0
  }

  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  return {
    mechanics,
    payableOrders,
    pendingOrders,
    paidOrders,
    loading,
    error,
    saving,
    paying,
    filters,
    selectedMechanic,
    fetchMechanics,
    fetchOrders,
    bulkSave,
    togglePayable,
    markAsPaid,
    setFilters,
  }
})
