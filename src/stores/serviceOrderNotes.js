import { ref } from 'vue'
import { defineStore } from 'pinia'
import { serviceOrderNotesApi } from '@/api/serviceOrderNotes'

export const useServiceOrderNotesStore = defineStore('serviceOrderNotes', () => {
  const notes   = ref([])
  const loading = ref(false)
  const saving  = ref(false)
  const error   = ref(null)

  async function fetchNotes(orderId) {
    loading.value = true
    error.value   = null
    try {
      const { data } = await serviceOrderNotesApi.getAll(orderId)
      notes.value = data
    } catch (e) {
      error.value = e.message ?? 'Error al cargar las notas.'
    } finally {
      loading.value = false
    }
  }

  async function addNote(orderId, text) {
    saving.value = true
    try {
      const { data } = await serviceOrderNotesApi.create(orderId, text)
      notes.value.push(data)
    } finally {
      saving.value = false
    }
  }

  async function editNote(orderId, noteId, text) {
    saving.value = true
    try {
      const { data } = await serviceOrderNotesApi.update(orderId, noteId, text)
      const idx = notes.value.findIndex((n) => n.id === noteId)
      if (idx !== -1) notes.value[idx] = data
    } finally {
      saving.value = false
    }
  }

  function clear() {
    notes.value   = []
    loading.value = false
    saving.value  = false
    error.value   = null
  }

  return { notes, loading, saving, error, fetchNotes, addNote, editNote, clear }
})
