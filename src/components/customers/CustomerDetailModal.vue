<script setup>
import { ref, watch } from 'vue'
import { customersApi } from '@/api/customers'
import { vehiclesApi } from '@/api/vehicles'
import { formatPhone } from '@/utils/phone'
import AppToast from '@/components/ui/AppToast.vue'

const props = defineProps({
  customer: { type: Object, required: true },
})

const emit = defineEmits(['close', 'saved'])

// ── Vehículos ─────────────────────────────────────────────────────────────────
const vehicles        = ref([])
const loadingVehicles = ref(false)

async function loadVehicles(id) {
  loadingVehicles.value = true
  try {
    const res = await customersApi.vehicles(id)
    vehicles.value = res.data
  } finally {
    loadingVehicles.value = false
  }
}

watch(() => props.customer?.id, (id) => { if (id) loadVehicles(id) }, { immediate: true })

// ── Edición de datos del cliente ──────────────────────────────────────────────
const editingCustomer = ref(false)
const customerForm    = ref({})
const savingCustomer  = ref(false)
const toast           = ref(null)

function startEditCustomer() {
  customerForm.value = {
    first_name: props.customer.first_name,
    last_name:  props.customer.last_name,
    phone:      props.customer.phone_e164,
    email:      props.customer.email ?? '',
  }
  editingCustomer.value = true
}

function cancelEditCustomer() {
  editingCustomer.value = false
}

async function saveCustomer() {
  savingCustomer.value = true
  try {
    await customersApi.update(props.customer.id, customerForm.value)
    emit('saved')
    editingCustomer.value = false
  } catch (e) {
    toast.value?.show(e.message, 'error')
  } finally {
    savingCustomer.value = false
  }
}

// ── Edición de vehículos ──────────────────────────────────────────────────────
const editingVehicleId = ref(null)
const vehicleForm      = ref({})
const savingVehicle    = ref(false)
const vehicleError     = ref(null)

function startEditVehicle(v) {
  vehicleForm.value      = { color: v.color, plate: v.plate ?? '' }
  vehicleError.value     = null
  editingVehicleId.value = v.id
}

function cancelEditVehicle() {
  editingVehicleId.value = null
  vehicleError.value     = null
}

async function saveVehicle(vehicleId) {
  savingVehicle.value = true
  vehicleError.value  = null
  try {
    const res = await vehiclesApi.update(vehicleId, vehicleForm.value)
    const idx = vehicles.value.findIndex((v) => v.id === vehicleId)
    if (idx !== -1) vehicles.value[idx] = { ...vehicles.value[idx], ...res.data }
    editingVehicleId.value = null
    emit('saved')
  } catch (e) {
    vehicleError.value = e.response?.data?.message ?? 'Error al guardar el vehículo'
  } finally {
    savingVehicle.value = false
  }
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

      <!-- Header -->
      <div class="flex items-start justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">
            {{ customer.first_name }} {{ customer.last_name }}
          </h2>
          <p class="text-xs text-gray-400 mt-0.5">Cliente #{{ customer.id }}</p>
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
      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        <!-- Datos de contacto -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400">Datos de contacto</h3>
            <button
              v-if="!editingCustomer"
              @click="startEditCustomer"
              class="p-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
              title="Editar datos del cliente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>

          <!-- Modo lectura -->
          <dl v-if="!editingCustomer" class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt class="text-gray-400 text-xs mb-0.5">Nombre</dt>
              <dd class="font-medium text-gray-800">{{ customer.first_name }} {{ customer.last_name }}</dd>
            </div>
            <div>
              <dt class="text-gray-400 text-xs mb-0.5">Teléfono</dt>
              <dd class="font-medium text-gray-800">{{ formatPhone(customer) }}</dd>
            </div>
            <div class="col-span-2">
              <dt class="text-gray-400 text-xs mb-0.5">Email</dt>
              <dd class="font-medium text-gray-800 break-all">{{ customer.email || '—' }}</dd>
            </div>
          </dl>

          <!-- Modo edición -->
          <form v-else @submit.prevent="saveCustomer" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Nombre</label>
                <input
                  v-model="customerForm.first_name"
                  required
                  class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Apellido</label>
                <input
                  v-model="customerForm.last_name"
                  required
                  class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Teléfono</label>
                <input
                  v-model="customerForm.phone"
                  required
                  class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label class="text-xs text-gray-500 mb-1 block">Email</label>
                <input
                  v-model="customerForm.email"
                  type="email"
                  class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="submit"
                :disabled="savingCustomer"
                class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors disabled:opacity-40"
              >
                {{ savingCustomer ? 'Guardando…' : 'Guardar' }}
              </button>
              <button
                type="button"
                @click="cancelEditCustomer"
                :disabled="savingCustomer"
                class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>

        <!-- Vehículos -->
        <div>
          <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Vehículos registrados
            <span v-if="!loadingVehicles" class="ml-1 text-gray-300 font-normal">({{ vehicles.length }})</span>
          </h3>

          <!-- Cargando -->
          <div v-if="loadingVehicles" class="space-y-2">
            <div v-for="n in 2" :key="n" class="h-16 bg-gray-100 rounded-xl animate-pulse" />
          </div>

          <!-- Sin vehículos -->
          <p v-else-if="vehicles.length === 0" class="text-sm text-gray-400">
            Este cliente no tiene vehículos registrados.
          </p>

          <!-- Lista -->
          <ul v-else class="space-y-2">
            <li
              v-for="v in vehicles"
              :key="v.id"
              class="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden"
            >
              <!-- Fila normal -->
              <div v-if="editingVehicleId !== v.id" class="flex items-center gap-3 px-4 py-3">
                <div class="shrink-0 w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">
                    {{ v.vehicle_catalog?.brand }} {{ v.vehicle_catalog?.model }} {{ v.vehicle_catalog?.year }}
                    <span v-if="v.vehicle_catalog?.motor_cc" class="text-gray-400 text-xs font-normal ml-0.5">{{ v.vehicle_catalog.motor_cc }}cc</span>
                  </p>
                  <p class="text-xs text-gray-400 truncate">
                    {{ v.color }}
                    <span v-if="v.plate" class="ml-1">· <span class="font-mono">{{ v.plate }}</span></span>
                  </p>
                </div>
                <button
                  @click="startEditVehicle(v)"
                  class="shrink-0 p-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                  title="Editar vehículo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>

              <!-- Formulario inline de edición -->
              <div v-else class="px-4 py-3">
                <p class="text-xs font-medium text-gray-500 mb-2 truncate">
                  {{ v.vehicle_catalog?.brand }} {{ v.vehicle_catalog?.model }} {{ v.vehicle_catalog?.year }}
                </p>
                <div class="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label class="text-xs text-gray-400 mb-1 block">Color</label>
                    <input
                      v-model="vehicleForm.color"
                      required
                      class="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-gray-400 mb-1 block">Placa</label>
                    <input
                      v-model="vehicleForm.plate"
                      class="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <p v-if="vehicleError" class="text-xs text-red-600 mb-2">{{ vehicleError }}</p>
                <div class="flex items-center gap-2">
                  <button
                    @click="saveVehicle(v.id)"
                    :disabled="savingVehicle"
                    class="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-40"
                  >
                    {{ savingVehicle ? 'Guardando…' : 'Guardar' }}
                  </button>
                  <button
                    @click="cancelEditVehicle"
                    :disabled="savingVehicle"
                    class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>

      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-100 flex justify-end">
        <button
          @click="emit('close')"
          class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
        >
          Cerrar
        </button>
      </div>

    </div>
  </div>

  <AppToast ref="toast" />
</template>
