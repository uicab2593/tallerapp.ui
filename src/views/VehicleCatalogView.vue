<script setup>
import { ref, computed, onMounted } from 'vue'
import { useVehicleCatalogsStore } from '@/stores/vehicleCatalogs'
import { MOTORCYCLE_BRANDS } from '@/constants/motorcycleBrands'

const store = useVehicleCatalogsStore()

const showModal    = ref(false)
const editingItem  = ref(null)
const confirmDeleteId = ref(null)
const saving       = ref(false)
const saveError    = ref(null)
const deleteError  = ref(null)

const defaultForm = () => ({ brand: '', model: '', year: '', motor_cc: '', color: '' })
const form = ref(defaultForm())
const isEditing = computed(() => !!editingItem.value)

function openCreate() {
  editingItem.value = null
  form.value = defaultForm()
  saveError.value = null
  showModal.value = true
}

function openEdit(item) {
  editingItem.value = item
  form.value = {
    brand:    item.brand,
    model:    item.model,
    year:     String(item.year),
    motor_cc: item.motor_cc ? String(item.motor_cc) : '',
    color:    item.color ?? '',
  }
  saveError.value = null
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingItem.value = null
}

async function submitForm() {
  saving.value = true
  saveError.value = null

  const payload = {
    brand:    form.value.brand,
    model:    form.value.model,
    year:     parseInt(form.value.year),
    motor_cc: parseInt(form.value.motor_cc),
    color:    form.value.color || null,
  }

  try {
    if (isEditing.value) {
      await store.editItem(editingItem.value.id, payload)
    } else {
      await store.addItem(payload)
    }
    closeModal()
  } catch (e) {
    saveError.value = e.message ?? 'Error al guardar.'
  } finally {
    saving.value = false
  }
}

function openDelete(id) {
  confirmDeleteId.value = id
  deleteError.value = null
}

async function executeDelete() {
  try {
    await store.removeItem(confirmDeleteId.value)
    confirmDeleteId.value = null
  } catch (e) {
    deleteError.value = e.message ?? 'Error al eliminar.'
  }
}

function applyFilters() {
  store.fetchItems(1)
}

function clearFilters() {
  store.resetFilters()
  store.fetchItems(1)
}

function goToPage(page) {
  if (page < 1 || page > store.meta.last_page) return
  store.fetchItems(page)
}

const hasFilters = computed(() =>
  store.filters.brand || store.filters.model || store.filters.year || store.filters.color
)

const pageNumbers = computed(() => {
  const { current_page, last_page } = store.meta
  if (last_page <= 7) return Array.from({ length: last_page }, (_, i) => i + 1)
  const around = [current_page - 1, current_page, current_page + 1]
  const pages  = [...new Set([1, 2, ...around, last_page - 1, last_page])]
  return pages.filter(p => p >= 1 && p <= last_page).sort((a, b) => a - b)
})

const currentYear = new Date().getFullYear()

onMounted(() => store.fetchItems(1))
</script>

<template>
  <div class="flex flex-col h-full gap-5">

    <!-- Título -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Catálogo de vehículos</h1>
        <p class="text-sm text-gray-500">Gestiona las marcas, modelos y años disponibles en el sistema</p>
      </div>
      <button
        @click="openCreate"
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo modelo
      </button>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div class="flex flex-wrap items-end gap-4">

        <div class="flex flex-col gap-1 min-w-44">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Marca</label>
          <input
            type="text"
            :value="store.filters.brand"
            @input="store.setFilters({ brand: $event.target.value })"
            @keyup.enter="applyFilters"
            placeholder="Italika, Honda..."
            class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div class="flex flex-col gap-1 min-w-44">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Modelo</label>
          <input
            type="text"
            :value="store.filters.model"
            @input="store.setFilters({ model: $event.target.value })"
            @keyup.enter="applyFilters"
            placeholder="D150T, CB150..."
            class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div class="flex flex-col gap-1 w-28">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Año</label>
          <input
            type="number"
            :value="store.filters.year"
            @input="store.setFilters({ year: $event.target.value })"
            @keyup.enter="applyFilters"
            placeholder="2025"
            min="1900"
            :max="currentYear + 2"
            class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div class="flex flex-col gap-1 min-w-36">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Color</label>
          <input
            type="text"
            :value="store.filters.color"
            @input="store.setFilters({ color: $event.target.value })"
            @keyup.enter="applyFilters"
            placeholder="Rojo, Negro..."
            class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="applyFilters"
            :disabled="store.loading"
            class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Buscar
          </button>
          <button
            v-if="hasFilters"
            @click="clearFilters"
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Limpiar
          </button>
        </div>

      </div>
    </div>

    <!-- Error global -->
    <div v-if="store.error" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      {{ store.error }}
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">

      <!-- Overlay de carga (recargas) -->
      <div
        v-if="store.loading"
        class="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-xl"
      >
        <svg class="h-8 w-8 animate-spin text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>

      <div class="overflow-x-auto flex-1 relative">
        <table class="w-full text-sm text-left">
          <thead class="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th class="px-4 py-3 font-semibold">Marca</th>
              <th class="px-4 py-3 font-semibold">Modelo</th>
              <th class="px-4 py-3 font-semibold">Año</th>
              <th class="px-4 py-3 font-semibold">Motor</th>
              <th class="px-4 py-3 font-semibold">Color</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">

            <!-- Estado vacío -->
            <tr v-if="!store.loading && store.items.length === 0">
              <td colspan="6" class="py-16 text-center text-sm text-gray-400">
                No se encontraron modelos en el catálogo.
              </td>
            </tr>

            <!-- Skeleton primera carga -->
            <tr v-else-if="store.loading && store.items.length === 0" v-for="n in 8" :key="n">
              <td v-for="c in 6" :key="c" class="px-4 py-3">
                <div class="h-4 bg-gray-200 rounded animate-pulse" :style="{ width: c === 6 ? '72px' : '100%' }" />
              </td>
            </tr>

            <!-- Filas de datos -->
            <tr
              v-else
              v-for="item in store.items"
              :key="item.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-4 py-3 font-medium text-gray-800">{{ item.brand }}</td>
              <td class="px-4 py-3 text-gray-700">{{ item.model }}</td>
              <td class="px-4 py-3 text-gray-700 tabular-nums">{{ item.year }}</td>
              <td class="px-4 py-3 text-gray-500">
                <span v-if="item.motor_cc">{{ item.motor_cc }} cc</span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-4 py-3 text-gray-700">
                <span v-if="item.color">{{ item.color }}</span>
                <span v-else class="text-gray-300">—</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-1.5 justify-end shrink-0">
                  <button
                    @click="openEdit(item)"
                    class="p-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                    title="Editar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                    </svg>
                  </button>
                  <button
                    @click="openDelete(item.id)"
                    class="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    title="Eliminar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>

          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div
        v-if="store.meta.total > 0"
        class="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/60 shrink-0"
      >
        <p class="text-xs text-gray-500">
          Mostrando
          <span class="font-medium text-gray-700">
            {{ (store.meta.current_page - 1) * store.meta.per_page + 1 }}–{{ Math.min(store.meta.current_page * store.meta.per_page, store.meta.total) }}
          </span>
          de
          <span class="font-medium text-gray-700">{{ store.meta.total }}</span>
          registros
        </p>

        <div class="flex items-center gap-1">
          <button
            @click="goToPage(store.meta.current_page - 1)"
            :disabled="store.meta.current_page <= 1"
            class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Anterior
          </button>

          <template v-for="(page, i) in pageNumbers" :key="page">
            <span
              v-if="i > 0 && page - pageNumbers[i - 1] > 1"
              class="px-1 text-xs text-gray-400 select-none"
            >…</span>
            <button
              @click="goToPage(page)"
              :class="page === store.meta.current_page
                ? 'bg-brand-600 text-white font-semibold'
                : 'text-gray-600 hover:bg-gray-100'"
              class="w-8 h-8 flex items-center justify-center text-xs rounded-lg transition-colors"
            >
              {{ page }}
            </button>
          </template>

          <button
            @click="goToPage(store.meta.current_page + 1)"
            :disabled="store.meta.current_page >= store.meta.last_page"
            class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  </div>

  <!-- Modal crear / editar -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm">

        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 class="text-base font-semibold text-gray-900">
            {{ isEditing ? 'Editar modelo' : 'Nuevo modelo' }}
          </h2>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="submitForm" class="px-6 py-5 flex flex-col gap-4">

          <div v-if="saveError" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {{ saveError }}
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Marca</label>
            <select v-model="form.brand" required
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
              <option value="" disabled>Seleccionar marca...</option>
              <option v-for="brand in MOTORCYCLE_BRANDS" :key="brand" :value="brand">{{ brand }}</option>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Modelo</label>
            <input v-model="form.model" type="text" required placeholder="D150T"
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          <div class="flex gap-3">
            <div class="flex flex-col gap-1.5 flex-1">
              <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Año</label>
              <input v-model="form.year" type="number" required :min="1900" :max="currentYear + 2" placeholder="2025"
                class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>

            <div class="flex flex-col gap-1.5 flex-1">
              <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Motor (cc)</label>
              <input v-model="form.motor_cc" type="number" required min="1" max="65535" placeholder="150"
                class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Color <span class="normal-case font-normal text-gray-400">(opcional)</span></label>
            <input v-model="form.color" type="text" placeholder="Rojo, Negro, Azul..."
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          <div class="flex justify-end gap-3 pt-1">
            <button type="button" @click="closeModal"
              class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" :disabled="saving"
              class="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors disabled:opacity-60">
              <svg v-if="saving" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              {{ isEditing ? 'Guardar cambios' : 'Crear modelo' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- Confirmación eliminar -->
  <Teleport to="body">
    <div
      v-if="confirmDeleteId"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h3 class="text-base font-semibold text-gray-900">Eliminar modelo</h3>
          <p class="text-sm text-gray-500">¿Confirmas que deseas eliminar este modelo del catálogo? Esta acción no se puede deshacer.</p>
        </div>
        <div v-if="deleteError" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {{ deleteError }}
        </div>
        <div class="flex justify-end gap-3">
          <button @click="confirmDeleteId = null; deleteError = null"
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Cancelar
          </button>
          <button @click="executeDelete"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
