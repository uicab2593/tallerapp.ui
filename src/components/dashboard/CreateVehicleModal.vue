<script setup>
import { ref, watch } from 'vue'
import { vehicleCatalogsApi } from '@/api/vehicleCatalogs'
import CreateVehicleCatalogModal from './CreateVehicleCatalogModal.vue'

const props = defineProps({
  customer:  { type: Object, required: true },
  editData:  { type: Object, default: null }, // { vehicleCatalog, color, plate }
})

const emit = defineEmits(['saved', 'close'])

// ── Catálogo autocomplete ────────────────────────────────────────────────────
const searchQuery    = ref('')
const searchResults  = ref([])
const isSearching    = ref(false)
const showDropdown   = ref(false)
const selectedCatalog = ref(null)
const showCatalogModal = ref(false)
const catalogToEdit  = ref(null)

let debounceTimer = null

async function onSearchInput() {
  clearTimeout(debounceTimer)
  selectedCatalog.value = null
  if (searchQuery.value.length < 2) {
    searchResults.value = []
    showDropdown.value  = false
    return
  }
  debounceTimer = setTimeout(async () => {
    isSearching.value = true
    try {
      const res = await vehicleCatalogsApi.search(searchQuery.value)
      searchResults.value = res.data
      showDropdown.value  = true
    } finally {
      isSearching.value = false
    }
  }, 300)
}

function selectCatalog(catalog) {
  selectedCatalog.value = catalog
  searchQuery.value     = `${catalog.brand} ${catalog.model} ${catalog.year}`
  showDropdown.value    = false
  searchResults.value   = []
}

function onSearchBlur() {
  setTimeout(() => { showDropdown.value = false }, 200)
}

function openNewCatalog() {
  catalogToEdit.value  = null
  showCatalogModal.value = true
}

function openEditCatalog() {
  catalogToEdit.value  = selectedCatalog.value
  showCatalogModal.value = true
}

function onCatalogSaved(catalog) {
  showCatalogModal.value = false
  selectCatalog(catalog)
}

// ── Vehicle form ─────────────────────────────────────────────────────────────
const form = ref({ color: '', plate: '' })

watch(
  () => props.editData,
  (d) => {
    if (d) {
      selectedCatalog.value = d.vehicleCatalog
      searchQuery.value     = `${d.vehicleCatalog.brand} ${d.vehicleCatalog.model} ${d.vehicleCatalog.year}`
      form.value            = { color: d.color, plate: d.plate }
    }
  },
  { immediate: true },
)

const error = ref(null)

function save() {
  error.value = null
  if (!selectedCatalog.value) { error.value = 'Selecciona un modelo de moto.'; return }
  if (!form.value.color)       { error.value = 'Ingresa el color.'; return }
  if (!form.value.plate)       { error.value = 'Ingresa la placa.'; return }

  emit('saved', {
    vehicleCatalog: selectedCatalog.value,
    color:          form.value.color,
    plate:          form.value.plate,
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 class="text-base font-bold text-gray-900">Agregar vehículo</h2>
            <p class="text-xs text-gray-500">
              Para {{ customer.first_name }} {{ customer.last_name }}
            </p>
          </div>
          <button
            @click="emit('close')"
            class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="overflow-y-auto flex-1 px-6 py-6 space-y-6">

          <!-- Autocomplete catálogo -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
              Modelo de moto
            </label>

            <!-- Campo de búsqueda -->
            <div class="relative">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Honda CB500, Yamaha MT-07…"
                autocomplete="off"
                @input="onSearchInput"
                @blur="onSearchBlur"
                @focus="searchResults.length && (showDropdown = true)"
                class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <div v-if="isSearching" class="absolute right-3 top-2.5">
                <svg class="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>

              <!-- Dropdown -->
              <div
                v-if="showDropdown"
                class="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg overflow-hidden"
              >
                <button
                  v-for="cat in searchResults"
                  :key="cat.id"
                  type="button"
                  @mousedown.prevent="selectCatalog(cat)"
                  class="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  {{ cat.brand }} {{ cat.model }} <span class="text-gray-400">{{ cat.year }}</span>
                </button>
                <div v-if="!searchResults.length" class="px-4 py-2.5 text-sm text-gray-400">
                  Sin resultados
                </div>
                <button
                  type="button"
                  @mousedown.prevent="openNewCatalog"
                  class="w-full text-left px-4 py-2.5 text-sm text-brand-600 font-medium border-t border-gray-200 hover:bg-brand-50 transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Registrar nuevo modelo
                </button>
              </div>
            </div>

            <!-- Catálogo seleccionado -->
            <div
              v-if="selectedCatalog"
              class="mt-2 flex items-center justify-between bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5"
            >
              <div>
                <p class="text-sm font-semibold text-brand-800">
                  {{ selectedCatalog.brand }} {{ selectedCatalog.model }}
                </p>
                <p class="text-xs text-brand-500">{{ selectedCatalog.year }}</p>
              </div>
              <button
                type="button"
                @click="openEditCatalog"
                class="text-xs font-medium text-brand-600 hover:text-brand-800 underline"
              >
                Editar
              </button>
            </div>

            <!-- Botón rápido nuevo modelo (cuando no hay dropdown abierto) -->
            <button
              v-if="!showDropdown && !selectedCatalog"
              type="button"
              @click="openNewCatalog"
              class="mt-2 text-xs text-brand-600 font-medium hover:underline flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Registrar nuevo modelo
            </button>
          </div>

          <!-- Color y Placa -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Color</label>
              <input
                v-model="form.color"
                type="text"
                placeholder="Rojo, Negro…"
                class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Placa</label>
              <input
                v-model="form.plate"
                type="text"
                placeholder="ABC-123"
                class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>

          <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{{ error }}</p>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            @click="emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            @click="save"
            class="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors"
          >
            Agregar vehículo
          </button>
        </div>

      </div>
    </div>
  </Teleport>

  <!-- Modal catálogo anidado -->
  <CreateVehicleCatalogModal
    v-if="showCatalogModal"
    :catalog="catalogToEdit"
    @saved="onCatalogSaved"
    @close="showCatalogModal = false"
  />
</template>
