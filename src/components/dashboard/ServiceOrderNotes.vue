<script setup>
import { ref, computed, nextTick, watch, onUnmounted } from 'vue'
import { useServiceOrderNotesStore } from '@/stores/serviceOrderNotes'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  orderId: { type: Number, required: true },
})

const notesStore = useServiceOrderNotesStore()
const authStore  = useAuthStore()

watch(() => props.orderId, (id) => notesStore.fetchNotes(id), { immediate: true })
onUnmounted(() => notesStore.clear())

// ── Add note ─────────────────────────────────────────────────────────────────
const newNoteText = ref('')
const addError    = ref(null)
const listRef     = ref(null)

async function submitNote() {
  const text = newNoteText.value.trim()
  if (!text || notesStore.saving) return
  addError.value = null
  try {
    await notesStore.addNote(props.orderId, text)
    newNoteText.value = ''
    await nextTick()
    if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
  } catch (e) {
    addError.value = e.response?.data?.message ?? 'Error al guardar la nota.'
  }
}

function onNewNoteKeydown(e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitNote()
}

// ── Edit note ─────────────────────────────────────────────────────────────────
const editingId = ref(null)
const editText  = ref('')
const editError = ref(null)

function startEdit(note) {
  editingId.value = note.id
  editText.value  = note.note
  editError.value = null
}

function cancelEdit() {
  editingId.value = null
  editText.value  = ''
  editError.value = null
}

async function saveEdit(note) {
  const text = editText.value.trim()
  if (!text || notesStore.saving) return
  editError.value = null
  try {
    await notesStore.editNote(props.orderId, note.id, text)
    editingId.value = null
    editText.value  = ''
  } catch (e) {
    editError.value = e.response?.data?.message ?? 'Error al editar la nota.'
  }
}

// ── Can-edit logic ────────────────────────────────────────────────────────────
function canEdit(note) {
  if (!authStore.user) return false
  if (note.user_id !== authStore.user.id) return false
  const last = notesStore.notes[notesStore.notes.length - 1]
  if (!last || last.id !== note.id) return false
  const today    = new Date()
  const noteDate = new Date(note.created_at)
  return noteDate.toDateString() === today.toDateString()
}

// ── Date formatting ───────────────────────────────────────────────────────────
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatDate(dateStr) {
  const d     = new Date(dateStr)
  const day   = d.getDate()
  const month = MONTHS[d.getMonth()]
  const year  = d.getFullYear()
  const hrs   = d.getHours()
  const mins  = d.getMinutes().toString().padStart(2, '0')
  const period = hrs >= 12 ? 'pm' : 'am'
  const h     = (hrs % 12 || 12).toString().padStart(2, '0')
  return `${day} ${month} ${year} ${h}:${mins} ${period}`
}

function relativeTime(dateStr) {
  const d      = new Date(dateStr)
  const now    = new Date()
  if (d.toDateString() !== now.toDateString()) return null
  const diffMs   = now - d
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1)  return 'hace un momento'
  if (diffMins < 60) return `hace ${diffMins} min`
  const diffHrs = Math.floor(diffMs / 3600000)
  return `hace ${diffHrs}h ${diffMins % 60}m`
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- Header -->
    <div class="px-4 py-3 border-b border-gray-200 shrink-0">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-600">
        Notas
        <span v-if="notesStore.notes.length" class="ml-1 font-normal text-gray-400 normal-case tracking-normal">
          ({{ notesStore.notes.length }})
        </span>
      </h3>
    </div>

    <!-- Notes list -->
    <div ref="listRef" class="flex-1 overflow-y-auto px-4 py-3 space-y-3">

      <!-- Loading -->
      <div v-if="notesStore.loading" class="flex items-center justify-center py-10">
        <svg class="h-5 w-5 animate-spin text-brand-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>

      <!-- Fetch error -->
      <p v-else-if="notesStore.error" class="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">
        {{ notesStore.error }}
      </p>

      <!-- Empty -->
      <p v-else-if="!notesStore.notes.length" class="text-xs text-gray-400 italic text-center pt-8">
        Sin notas aún.
      </p>

      <!-- Note cards -->
      <template v-else>
        <div
          v-for="note in notesStore.notes"
          :key="note.id"
          class="bg-white rounded-xl border border-gray-200 px-3 py-3 text-sm"
        >
          <!-- Author row -->
          <div class="flex items-start justify-between gap-2">
            <span class="text-xs font-semibold text-gray-800 leading-tight">{{ note.user?.name }}</span>
            <button
              v-if="canEdit(note) && editingId !== note.id"
              @click="startEdit(note)"
              class="shrink-0 text-xs text-brand-500 hover:text-brand-700 font-medium leading-tight transition-colors"
            >
              Editar
            </button>
          </div>

          <!-- Date -->
          <p class="text-xs text-gray-400 mt-0.5 leading-tight">
            {{ formatDate(note.created_at) }}
            <span v-if="relativeTime(note.created_at)" class="text-brand-500">
              ({{ relativeTime(note.created_at) }})
            </span>
          </p>

          <!-- Edit mode -->
          <template v-if="editingId === note.id">
            <textarea
              v-model="editText"
              rows="4"
              class="mt-2 w-full rounded-lg border border-brand-300 px-2.5 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
            <p v-if="editError" class="mt-1 text-xs text-red-600">{{ editError }}</p>
            <div class="flex items-center justify-end gap-2 mt-2">
              <button
                @click="cancelEdit"
                class="text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                @click="saveEdit(note)"
                :disabled="!editText.trim() || notesStore.saving"
                class="text-xs text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                {{ notesStore.saving ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
          </template>

          <!-- View mode -->
          <template v-else>
            <p class="text-sm text-gray-700 mt-2 whitespace-pre-wrap break-words leading-relaxed">{{ note.note }}</p>
            <p v-if="note.edited_at" class="text-xs text-gray-400 mt-1.5 italic">
              Editado el {{ formatDate(note.edited_at) }}
            </p>
          </template>

        </div>
      </template>

    </div>

    <!-- Add note form -->
    <div class="px-4 py-3 border-t border-gray-200 shrink-0 bg-white">
      <textarea
        v-model="newNoteText"
        @keydown="onNewNoteKeydown"
        rows="3"
        placeholder="Escribe una nota… (Ctrl+Enter para guardar)"
        class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
      />
      <p v-if="addError" class="mt-1 text-xs text-red-600">{{ addError }}</p>
      <div class="flex justify-end mt-2">
        <button
          @click="submitNote"
          :disabled="!newNoteText.trim() || notesStore.saving"
          class="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition-colors"
        >
          <svg v-if="notesStore.saving" class="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {{ notesStore.saving ? 'Guardando…' : 'Agregar nota' }}
        </button>
      </div>
    </div>

  </div>
</template>
