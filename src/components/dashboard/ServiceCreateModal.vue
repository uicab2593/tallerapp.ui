<script setup>
import { ref, computed, watch } from 'vue'
import { customersApi } from '@/api/customers'
import { vehicleCatalogsApi } from '@/api/vehicleCatalogs'
import { useServiceOrdersStore } from '@/stores/serviceOrders'
import AppToast from '@/components/ui/AppToast.vue'
import { formatPhone } from '@/utils/phone'

const emit = defineEmits(['close', 'created'])
const store = useServiceOrdersStore()

// ── 1. Búsqueda de cliente (autocomplete) ─────────────────────────
const searchInput     = ref('')
const searchInputEl   = ref(null)       // ref al elemento <input>
const customerState   = ref('idle')     // idle | found | registering
const customer        = ref(null)
const dropdownResults = ref([])
const showDropdown    = ref(false)
const isSearching     = ref(false)
const searchWasPhone  = ref(false)
const dropdownStyle   = ref({})

function updateDropdownPosition() {
  if (!searchInputEl.value) return
  const rect = searchInputEl.value.getBoundingClientRect()
  dropdownStyle.value = {
    top:   `${rect.bottom + 4}px`,
    left:  `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

let customerDebounceTimer = null

async function onSearchInput() {
  clearTimeout(customerDebounceTimer)
  const q = searchInput.value.trim()

  if (q.length < 2) {
    dropdownResults.value = []
    showDropdown.value    = false
    isSearching.value     = false
    return
  }

  searchWasPhone.value = /^\+?\d[\d\s\-]{3,}$/.test(q)
  isSearching.value    = true
  updateDropdownPosition()
  showDropdown.value   = true

  customerDebounceTimer = setTimeout(async () => {
    try {
      const res = await customersApi.autocomplete(q)
      dropdownResults.value = res.data
    } catch {
      dropdownResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 300)
}

function onSearchBlur() {
  setTimeout(() => { showDropdown.value = false }, 200)
}

function onSearchFocus() {
  if (searchInput.value.trim().length >= 2) {
    updateDropdownPosition()
    showDropdown.value = true
  }
}

function selectFromDropdown(c) {
  customer.value        = c
  customerState.value   = 'found'
  showDropdown.value    = false
  dropdownResults.value = []
  searchInput.value     = `${c.first_name} ${c.last_name}`
  editingCustomer.value = false
  resetVehicle()
}

function startRegistering() {
  customerState.value = 'registering'
  showDropdown.value  = false
  if (searchWasPhone.value) newCustForm.value.phone = searchInput.value.trim()
  resetVehicle()
}

function clearCustomer() {
  customer.value        = null
  customerState.value   = 'idle'
  searchInput.value     = ''
  dropdownResults.value = []
  newCustForm.value     = { first_name: '', last_name: '', phone: '' }
  editingCustomer.value = false
  resetVehicle()
}

// ── Toast ─────────────────────────────────────────────────────────
const toast = ref(null)

// ── 2. Edición inline del cliente encontrado ──────────────────────
const editingCustomer = ref(false)
const editCustForm    = ref({ first_name: '', last_name: '', phone: '' })
const savingCustomer  = ref(false)

function startEditCustomer() {
  editCustForm.value = {
    first_name: customer.value.first_name,
    last_name:  customer.value.last_name,
    phone:      customer.value.phone_e164,
  }
  editingCustomer.value = true
}

function cancelEditCustomer() {
  editingCustomer.value = false
}

async function saveCustomerEdit() {
  savingCustomer.value = true
  try {
    const res = await customersApi.update(customer.value.id, {
      first_name: editCustForm.value.first_name,
      last_name:  editCustForm.value.last_name,
      phone:      editCustForm.value.phone,
    })
    customer.value        = { ...res.data, vehicles: customer.value.vehicles }
    editingCustomer.value = false
  } catch (e) {
    toast.value?.show(e.response?.data?.message ?? e.message, 'error')
  } finally {
    savingCustomer.value = false
  }
}

// ── 3. Registro de nuevo cliente (no encontrado) ──────────────────
const newCustForm = ref({ first_name: '', last_name: '', phone: '' })

// ── 4. Vehículo ───────────────────────────────────────────────────
const selectedVehicle = ref(null)
const showVehicleForm = ref(true)

// vehicleMode derivado del estado real, sin ref separada
const vehicleMode = computed(() => {
  if (selectedVehicle.value)  return 'existing'
  if (catalogSelected.value)  return 'new'
  return 'idle'
})

const customerVehicles = computed(() => customer.value?.vehicles ?? [])

// Auto-expandir formulario de moto cuando no hay vehículos existentes
watch(customerState, (val) => {
  if (val === 'registering') {
    showVehicleForm.value = true
  } else if (val === 'found' && customerVehicles.value.length === 0) {
    showVehicleForm.value = true
  }
})

function selectExistingVehicle(v) {
  selectedVehicle.value = v
  showVehicleForm.value = false
  resetCatalogSearch()
}

function openVehicleForm() {
  showVehicleForm.value = true
  selectedVehicle.value = null
}

function cancelVehicleForm() {
  showVehicleForm.value = false
  resetCatalogSearch()
}

// ── Autocomplete catálogo ─────────────────────────────────────────
const catalogQuery    = ref('')
const catalogResults  = ref([])
const catalogSearching = ref(false)
const catalogDropdown = ref(false)
const catalogSelected = ref(null)

let catalogDebounceTimer = null

async function onCatalogInput() {
  clearTimeout(catalogDebounceTimer)
  catalogSelected.value = null
  if (catalogQuery.value.length < 2) {
    catalogResults.value  = []
    catalogDropdown.value = false
    return
  }
  catalogDebounceTimer = setTimeout(async () => {
    catalogSearching.value = true
    try {
      const res = await vehicleCatalogsApi.search(catalogQuery.value)
      catalogResults.value  = res.data
      catalogDropdown.value = true
    } finally {
      catalogSearching.value = false
    }
  }, 300)
}

function selectCatalog(catalog) {
  catalogSelected.value = catalog
  catalogQuery.value    = `${catalog.brand} ${catalog.model} ${catalog.year}`
  catalogDropdown.value = false
  catalogResults.value  = []
  selectedVehicle.value = null
}

function onCatalogBlur() {
  setTimeout(() => { catalogDropdown.value = false }, 200)
}

function resetCatalogSearch() {
  catalogQuery.value    = ''
  catalogResults.value  = []
  catalogDropdown.value = false
  catalogSelected.value = null
}

function resetVehicle() {
  selectedVehicle.value = null
  showVehicleForm.value = false
  resetCatalogSearch()
}

// ── 5. Datos del servicio ─────────────────────────────────────────
const serviceForm = ref({
  service_type:    'repair',
  status:          'received',
  customer_report: '',
})

const STATUS_OPTIONS = [
  { value: 'received',   label: 'Recibido' },
  { value: 'diagnosed',  label: 'Diagnosticado' },
  { value: 'approved',   label: 'Aprobado' },
  { value: 'in_service', label: 'En Servicio' },
]

// ── Visibilidad progresiva ─────────────────────────────────────────
const showVehicleSection = computed(() =>
  customerState.value === 'found' || customerState.value === 'registering'
)
const showServiceSection = computed(() => vehicleMode.value !== 'idle')

// ── canSave ───────────────────────────────────────────────────────
const canSave = computed(() => {
  const customerOk =
    customerState.value === 'found' ||
    (customerState.value === 'registering' &&
      newCustForm.value.first_name.trim() !== '' &&
      newCustForm.value.last_name.trim()  !== '' &&
      newCustForm.value.phone.trim()      !== '')
  const vehicleOk = vehicleMode.value !== 'idle'
  const reportOk  = serviceForm.value.customer_report.trim() !== ''
  return customerOk && vehicleOk && reportOk
})

// ── Guardar ───────────────────────────────────────────────────────
const saving = ref(false)

async function save() {
  if (!canSave.value || saving.value) return
  saving.value = true
  try {
    let customerId
    if (customerState.value === 'found') {
      customerId = customer.value.id
    } else { // registering
      const res  = await customersApi.create(newCustForm.value)
      customerId = res.data.id
    }

    const payload = {
      mileage:         0,
      customer_report: serviceForm.value.customer_report,
      service_type:    serviceForm.value.service_type,
      status:          serviceForm.value.status,
    }

    if (vehicleMode.value === 'existing') {
      payload.vehicle_id = selectedVehicle.value.id
    } else {
      payload.customer_id        = customerId
      payload.vehicle_catalog_id = catalogSelected.value.id
    }

    await store.createOrder(payload)
    emit('created')
  } catch (e) {
    toast.value?.show(e.response?.data?.message ?? e.message, 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 class="text-lg font-bold text-gray-900">Nuevo servicio</h2>
          <button
            @click="emit('close')"
            class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="overflow-y-auto flex-1 px-6 py-6 space-y-8">

          <!-- ── SECCIÓN 1: CLIENTE ──────────────────────────────── -->
          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4 flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">1</span>
              Cliente
            </h3>

            <!-- Input con autocomplete -->
            <div class="relative">
              <input
                ref="searchInputEl"
                v-model="searchInput"
                type="text"
                placeholder="Teléfono o nombre del cliente"
                autocomplete="off"
                :disabled="customerState === 'found' || customerState === 'registering'"
                @input="onSearchInput"
                @focus="onSearchFocus"
                @blur="onSearchBlur"
                class="w-full rounded-xl border border-gray-300 px-3 py-2 pr-8 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-50 disabled:text-gray-500"
              />
              <div v-if="isSearching" class="absolute right-3 top-2.5 pointer-events-none">
                <svg class="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            </div>

            <!-- Dropdown via Teleport para evitar el clip del overflow-y-auto del modal -->
            <Teleport to="body">
              <div
                v-if="showDropdown && !isSearching"
                class="fixed z-[200] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                :style="dropdownStyle"
              >
                <button
                  v-for="c in dropdownResults"
                  :key="c.id"
                  type="button"
                  @mousedown.prevent="selectFromDropdown(c)"
                  class="w-full text-left flex items-center justify-between px-4 py-2.5 text-sm hover:bg-brand-50 hover:text-brand-700 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div>
                    <span class="font-medium text-gray-800">{{ c.first_name }} {{ c.last_name }}</span>
                    <span class="text-gray-400 ml-2 text-xs">{{ formatPhone(c) }}</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <div v-if="!dropdownResults.length" class="px-4 py-3">
                  <p class="text-sm text-gray-400">Sin resultados.</p>
                </div>

                <button
                  type="button"
                  @mousedown.prevent="startRegistering"
                  class="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 transition-colors border-t border-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Registrar nuevo cliente
                </button>
              </div>
            </Teleport>

            <!-- Cliente seleccionado: card -->
            <template v-if="customerState === 'found'">
              <div
                v-if="!editingCustomer"
                class="mt-3 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3"
              >
                <div>
                  <p class="text-sm font-semibold text-emerald-800">{{ customer.first_name }} {{ customer.last_name }}</p>
                  <p class="text-xs text-emerald-600">{{ formatPhone(customer) }}</p>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                  <button @click="startEditCustomer" class="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline">
                    Editar
                  </button>
                  <button @click="clearCustomer" class="text-gray-400 hover:text-gray-600 transition-colors" title="Cambiar cliente">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Edición inline -->
              <div v-else class="mt-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Nombre</label>
                    <input v-model="editCustForm.first_name" type="text" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Apellido</label>
                    <input v-model="editCustForm.last_name" type="text" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Teléfono</label>
                  <input v-model="editCustForm.phone" type="tel" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div class="flex justify-end gap-2 pt-1">
                  <button @click="cancelEditCustomer" class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                  <button @click="saveCustomerEdit" :disabled="savingCustomer" class="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg transition-colors">
                    {{ savingCustomer ? 'Guardando…' : 'Guardar' }}
                  </button>
                </div>
              </div>
            </template>

            <!-- Registro de nuevo cliente -->
            <div v-if="customerState === 'registering'" class="mt-3 space-y-3">
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Nuevo cliente</p>
                <button @click="clearCustomer" class="text-xs text-gray-400 hover:text-gray-600 underline">Cancelar</button>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Nombre</label>
                  <input v-model="newCustForm.first_name" type="text" placeholder="Juan" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Apellido</label>
                  <input v-model="newCustForm.last_name" type="text" placeholder="García" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Teléfono</label>
                <input v-model="newCustForm.phone" type="tel" placeholder="6141234567 o +526141234567" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>
          </section>

          <!-- ── SECCIÓN 2: MOTO ─────────────────────────────────── -->
          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4 flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">2</span>
              Moto
            </h3>

            <!-- Motos existentes del cliente -->
            <div v-if="customerVehicles.length" class="grid grid-cols-2 gap-2">
              <button
                v-for="v in customerVehicles"
                :key="v.id"
                type="button"
                @click="selectExistingVehicle(v)"
                :class="[
                  'relative text-left px-3 py-3 rounded-xl border transition-colors',
                  selectedVehicle?.id === v.id
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-gray-300 hover:border-gray-400 bg-white',
                ]"
              >
                <p class="text-sm font-semibold text-gray-800 pr-5 leading-tight">
                  {{ v.vehicle_catalog?.brand }} {{ v.vehicle_catalog?.model }}
                  <span class="text-gray-500 font-normal">{{ v.vehicle_catalog?.year }}</span>
                </p>
                <p class="text-xs text-gray-500 mt-0.5">
                  <span v-if="v.plate">{{ v.plate }}</span>
                  <span v-if="v.plate && v.color"> · </span>
                  <span v-if="v.color">{{ v.color }}</span>
                </p>
                <div
                  v-if="selectedVehicle?.id === v.id"
                  class="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-brand-600 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clip-rule="evenodd"/>
                  </svg>
                </div>
              </button>
            </div>

            <!-- Botón agregar nueva moto (solo si hay existentes y el form está cerrado) -->
            <button
              v-if="customerVehicles.length && !showVehicleForm"
              type="button"
              @click="openVehicleForm"
              class="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-600 border border-dashed border-brand-300 rounded-xl hover:bg-brand-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar nueva moto
            </button>

            <!-- Formulario inline de nueva moto -->
            <div
              v-if="showVehicleForm"
              :class="['space-y-4', customerVehicles.length ? 'mt-3 pt-3 border-t border-gray-200' : '']"
            >
              <!-- Autocomplete catálogo -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Modelo</label>
                <div class="relative">
                  <input
                    v-model="catalogQuery"
                    type="text"
                    placeholder="Honda CB500, Yamaha MT-07…"
                    autocomplete="off"
                    @input="onCatalogInput"
                    @blur="onCatalogBlur"
                    @focus="catalogResults.length && (catalogDropdown = true)"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <div v-if="catalogSearching" class="absolute right-3 top-2.5">
                    <svg class="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  </div>
                  <div
                    v-if="catalogDropdown"
                    class="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg overflow-hidden"
                  >
                    <button
                      v-for="cat in catalogResults"
                      :key="cat.id"
                      type="button"
                      @mousedown.prevent="selectCatalog(cat)"
                      class="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                    >
                      {{ cat.brand }} {{ cat.model }}
                      <span class="text-gray-400">{{ cat.year }}</span>
                      <span v-if="cat.motor_cc" class="text-gray-400"> · {{ cat.motor_cc }}cc</span>
                    </button>
                    <div v-if="!catalogResults.length" class="px-4 py-2.5 text-sm text-gray-400">
                      Sin resultados
                    </div>
                  </div>
                </div>

                <!-- Modelo seleccionado -->
                <div
                  v-if="catalogSelected"
                  class="mt-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5"
                >
                  <p class="text-sm font-semibold text-brand-800">
                    {{ catalogSelected.brand }} {{ catalogSelected.model }}
                  </p>
                  <p class="text-xs text-brand-500">
                    {{ catalogSelected.year }}<span v-if="catalogSelected.motor_cc"> · {{ catalogSelected.motor_cc }}cc</span>
                  </p>
                </div>
              </div>

              <!-- Cancelar formulario (solo si hay motos existentes para volver a seleccionar) -->
              <div v-if="customerVehicles.length" class="flex justify-end">
                <button
                  type="button"
                  @click="cancelVehicleForm"
                  class="text-xs font-medium text-gray-500 hover:text-gray-700 underline"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>

          <!-- ── SECCIÓN 3: SERVICIO ─────────────────────────────── -->
          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4 flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">3</span>
              Servicio
            </h3>

            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Tipo</label>
                  <select
                    v-model="serviceForm.service_type"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option value="repair">Reparación</option>
                    <option value="installation">Instalación</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Estado inicial</label>
                  <select
                    v-model="serviceForm.status"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Reporte del cliente</label>
                <textarea
                  v-model="serviceForm.customer_report"
                  rows="3"
                  placeholder="Describe lo que reporta el cliente…"
                  class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
              </div>
            </div>
          </section>


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
            :disabled="!canSave || saving"
            class="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl transition-colors"
          >
            {{ saving ? 'Guardando…' : 'Crear servicio' }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>

  <AppToast ref="toast" />
</template>
