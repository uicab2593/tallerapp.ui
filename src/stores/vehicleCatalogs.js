import { defineStore } from 'pinia'
import { ref } from 'vue'
import { vehicleCatalogsApi } from '@/api/vehicleCatalogs'

export const useVehicleCatalogsStore = defineStore('vehicleCatalogs', () => {
  const items   = ref([])
  const meta    = ref({ current_page: 1, last_page: 1, total: 0, per_page: 15 })
  const loading = ref(false)
  const error   = ref(null)

  const filters = ref({ brand: '', model: '', year: '' })

  async function fetchItems(page = 1) {
    loading.value = true
    error.value   = null
    try {
      const params = { page, per_page: meta.value.per_page }
      if (filters.value.brand) params.brand = filters.value.brand
      if (filters.value.model) params.model = filters.value.model
      if (filters.value.year)  params.year  = filters.value.year
      const res = await vehicleCatalogsApi.list(params)
      items.value = res.data.data
      meta.value = {
        current_page: res.data.current_page,
        last_page:    res.data.last_page,
        total:        res.data.total,
        per_page:     res.data.per_page,
      }
    } catch (e) {
      error.value = e.response?.data?.message ?? 'Error al cargar el catálogo.'
    } finally {
      loading.value = false
    }
  }

  async function addItem(payload) {
    const res = await vehicleCatalogsApi.create(payload)
    await fetchItems(meta.value.current_page)
    return res.data
  }

  async function editItem(id, payload) {
    const res = await vehicleCatalogsApi.update(id, payload)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value[idx] = res.data
    return res.data
  }

  async function removeItem(id) {
    await vehicleCatalogsApi.remove(id)
    items.value = items.value.filter(i => i.id !== id)
    meta.value.total -= 1
  }

  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  function resetFilters() {
    filters.value = { brand: '', model: '', year: '' }
  }

  return { items, meta, loading, error, filters, fetchItems, addItem, editItem, removeItem, setFilters, resetFilters }
})
