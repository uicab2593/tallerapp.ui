<script setup>
import { ref, computed } from 'vue'
import { customersApi } from '@/api/customers'
import { useServiceOrdersStore } from '@/stores/serviceOrders'
import CreateCustomerModal from './CreateCustomerModal.vue'
import CreateVehicleModal from './CreateVehicleModal.vue'

const emit = defineEmits(['close'])

const store = useServiceOrdersStore()

// ── Cliente ──────────────────────────────────────────────────────────────────
const phoneInput       = ref('')
const customerState    = ref('idle') // idle | searching | found | not_found
const customer         = ref(null)
const showCustomerModal = ref(false)
const customerModalMode = ref('create') // 'create' | 'edit'

async function searchCustomer() {
  if (!phoneInput.value.trim()) return
  customerState.value = 'searching'
  try {
    const res = await customersApi.search(phoneInput.value.trim())
    customer.value      = res.data
    customerState.value = 'found'
  } catch {
    customerState.value = 'not_found'
    customer.value      = null
  }
}

function openCreateCustomer() {
  customerModalMode.value = 'create'
  showCustomerModal.value = true
}

function openEditCustomer() {
  customerModalMode.value = 'edit'
  showCustomerModal.value = true
}

function onCustomerSaved(saved) {
  customer.value          = saved
  customerState.value     = 'found'
  showCustomerModal.value = false
  // Limpiar vehículo si el cliente cambió
  selectedVehicle.value  = null
  newVehicleData.value   = null
  vehicleMode.value      = 'idle'
}

// ── Vehículo ─────────────────────────────────────────────────────────────────
// vehicleMode: 'idle' | 'existing' | 'new'
const vehicleMode      = ref('idle')
const selectedVehicle  = ref(null)   // vehículo existente seleccionado
const newVehicleData   = ref(null)   // { vehicleCatalog, color, plate }
const showVehicleModal = ref(false)
const vehicleToEdit    = ref(null)

const customerVehicles = computed(() => customer.value?.vehicles ?? [])

function selectExistingVehicle(v) {
  selectedVehicle.value = v
  newVehicleData.value  = null
  vehicleMode.value     = 'existing'
}

function openAddVehicle(editData = null) {
  vehicleToEdit.value    = editData
  showVehicleModal.value = true
}

function onVehicleSaved(data) {
  newVehicleData.value   = data
  selectedVehicle.value  = null
  vehicleMode.value      = 'new'
  showVehicleModal.value = false
}

// ── Formulario del servicio ──────────────────────────────────────────────────
const form = ref({
  mileage:             '',
  customer_report:     '',
  service_type:        'repair',
  status:              'received',
  external_service_id: '',
})

const canSave = computed(() => {
  const hasVehicle = vehicleMode.value === 'existing' || vehicleMode.value === 'new'
  return (
    customerState.value === 'found' &&
    hasVehicle &&
    form.value.mileage !== '' &&
    Number(form.value.mileage) >= 0 &&
    form.value.customer_report.trim() !== ''
  )
})

// ── Guardar ──────────────────────────────────────────────────────────────────
const saving   = ref(false)
const saveError = ref(null)

async function save() {
  if (!canSave.value) return
  saving.value   = true
  saveError.value = null
  try {
    const payload = {
      mileage:             Number(form.value.mileage),
      customer_report:     form.value.customer_report,
      service_type:        form.value.service_type,
      status:              form.value.status,
      external_service_id: form.value.external_service_id || null,
    }

    if (vehicleMode.value === 'existing') {
      payload.vehicle_id = selectedVehicle.value.id
    } else {
      payload.customer_id        = customer.value.id
      payload.vehicle_catalog_id = newVehicleData.value.vehicleCatalog.id
      payload.color              = newVehicleData.value.color
      payload.plate              = newVehicleData.value.plate
    }

    await store.createOrder(payload)
    emit('close')
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

const STATUS_OPTIONS = [
  { value: 'received',   label: 'Recibido' },
  { value: 'diagnosed',  label: 'Diagnosticado' },
  { value: 'approved',   label: 'Aprobado' },
  { value: 'in_service', label: 'En Servicio' },
]
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

        <!-- Scrollable body -->
        <div class="overflow-y-auto flex-1 px-6 py-6 space-y-8">

          <!-- ── SECCIÓN 1: CLIENTE ─────────────────────────────────────────── -->
          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4 flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">1</span>
              Cliente
            </h3>

            <!-- Buscador -->
            <div class="flex gap-2">
              <input
                v-model="phoneInput"
                type="tel"
                placeholder="Número de teléfono (10 dígitos)"
                maxlength="10"
                @keyup.enter="searchCustomer"
                class="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button
                @click="searchCustomer"
                :disabled="customerState === 'searching' || !phoneInput.trim()"
                class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-xl transition-colors shrink-0"
              >
                {{ customerState === 'searching' ? 'Buscando…' : 'Buscar' }}
              </button>
            </div>

            <!-- Cliente encontrado -->
            <div
              v-if="customerState === 'found' && customer"
              class="mt-3 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3"
            >
              <div>
                <p class="text-sm font-semibold text-emerald-800">
                  {{ customer.first_name }} {{ customer.last_name }}
                </p>
                <p class="text-xs text-emerald-600">{{ customer.phone_number }}</p>
                <p v-if="customer.email" class="text-xs text-emerald-500">{{ customer.email }}</p>
              </div>
              <button
                @click="openEditCustomer"
                class="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline shrink-0"
              >
                Editar
              </button>
            </div>

            <!-- Cliente no encontrado -->
            <div v-if="customerState === 'not_found'" class="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <p class="text-sm text-amber-800">No se encontró ningún cliente con ese número.</p>
              <button
                @click="openCreateCustomer"
                class="shrink-0 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl px-3 py-1.5 transition-colors"
              >
                Registrar cliente
              </button>
            </div>
          </section>

          <!-- ── SECCIÓN 2: VEHÍCULO ────────────────────────────────────────── -->
          <section v-if="customerState === 'found'">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4 flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">2</span>
              Vehículo
            </h3>

            <!-- Lista de vehículos del cliente -->
            <div v-if="customerVehicles.length" class="space-y-2">
              <button
                v-for="v in customerVehicles"
                :key="v.id"
                type="button"
                @click="selectExistingVehicle(v)"
                :class="[
                  'w-full text-left flex items-center justify-between px-4 py-3 rounded-xl border transition-colors',
                  selectedVehicle?.id === v.id
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-gray-300 hover:border-gray-400 bg-white',
                ]"
              >
                <div>
                  <p class="text-sm font-semibold text-gray-800">
                    {{ v.vehicle_catalog?.brand }} {{ v.vehicle_catalog?.model }}
                    <span class="text-gray-500 font-normal">{{ v.vehicle_catalog?.year }}</span>
                  </p>
                  <p class="text-xs text-gray-500">{{ v.plate }} · {{ v.color }}</p>
                </div>
                <div
                  v-if="selectedVehicle?.id === v.id"
                  class="h-5 w-5 rounded-full bg-brand-600 flex items-center justify-center shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clip-rule="evenodd"/>
                  </svg>
                </div>
              </button>
            </div>

            <!-- Vehículo nuevo configurado -->
            <div
              v-if="vehicleMode === 'new' && newVehicleData"
              class="flex items-center justify-between bg-brand-50 border border-brand-200 rounded-xl px-4 py-3"
            >
              <div>
                <p class="text-sm font-semibold text-brand-800">
                  {{ newVehicleData.vehicleCatalog.brand }} {{ newVehicleData.vehicleCatalog.model }}
                  <span class="font-normal text-brand-500">{{ newVehicleData.vehicleCatalog.year }}</span>
                </p>
                <p class="text-xs text-brand-500">{{ newVehicleData.plate }} · {{ newVehicleData.color }}</p>
              </div>
              <button
                @click="openAddVehicle(newVehicleData)"
                class="text-xs font-medium text-brand-700 hover:text-brand-900 underline shrink-0"
              >
                Editar
              </button>
            </div>

            <!-- Botón agregar nuevo vehículo -->
            <button
              type="button"
              @click="openAddVehicle()"
              class="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-600 border border-dashed border-brand-300 rounded-xl hover:bg-brand-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar nuevo vehículo
            </button>
          </section>

          <!-- ── SECCIÓN 3: DATOS DEL SERVICIO ─────────────────────────────── -->
          <section v-if="vehicleMode !== 'idle'">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-4 flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">3</span>
              Datos del servicio
            </h3>

            <div class="space-y-5">
              <!-- Kilometraje y tipo -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Kilometraje</label>
                  <input
                    v-model="form.mileage"
                    type="number"
                    min="0"
                    placeholder="5000"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Tipo de servicio</label>
                  <select
                    v-model="form.service_type"
                    class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option value="repair">Reparación</option>
                    <option value="installation">Instalación</option>
                  </select>
                </div>
              </div>

              <!-- Estado inicial -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Estado inicial</label>
                <select
                  v-model="form.status"
                  class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                >
                  <option v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
              </div>

              <!-- Reporte del cliente -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Reporte del cliente</label>
                <textarea
                  v-model="form.customer_report"
                  rows="3"
                  placeholder="Describe lo que reporta el cliente…"
                  class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                />
              </div>

              <!-- ID Externo -->
              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                  ID externo <span class="text-gray-400 font-normal normal-case">(opcional)</span>
                </label>
                <input
                  v-model="form.external_service_id"
                  type="text"
                  placeholder="Opcional"
                  class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>
          </section>

          <!-- Error global -->
          <p v-if="saveError" class="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            {{ saveError }}
          </p>

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

  <!-- Modal cliente -->
  <CreateCustomerModal
    v-if="showCustomerModal"
    :customer="customerModalMode === 'edit' ? customer : null"
    :prefill-phone="customerModalMode === 'create' ? phoneInput : ''"
    @saved="onCustomerSaved"
    @close="showCustomerModal = false"
  />

  <!-- Modal vehículo -->
  <CreateVehicleModal
    v-if="showVehicleModal && customer"
    :customer="customer"
    :edit-data="vehicleToEdit"
    @saved="onVehicleSaved"
    @close="showVehicleModal = false"
  />
</template>
