<script setup>
import { ref, computed, watch } from 'vue'
import { useServiceOrdersStore, STATUS_META, STATUS_TRANSITIONS, MASTER_DELIVERED_TRANSITIONS } from '@/stores/serviceOrders'
import { useAuthStore } from '@/stores/auth'
import { serviceOrdersApi } from '@/api/serviceOrders'
import { vehiclesApi } from '@/api/vehicles'
import ServiceOrderNotes from '@/components/dashboard/ServiceOrderNotes.vue'
import AppToast from '@/components/ui/AppToast.vue'
import VehicleCatalogDisplay from '@/components/ui/VehicleCatalogDisplay.vue'
import { formatPhone } from '@/utils/phone'

const props = defineProps({
  order: { type: Object, required: true },
})

const emit = defineEmits(['close', 'saved'])

const store = useServiceOrdersStore()
const auth  = useAuthStore()
const toast = ref(null)

// ── Local status (tracks changes independently from the form) ────────────────
const localStatus = ref(props.order.status)
watch(() => props.order.status, (v) => { localStatus.value = v })

// ── Form state (no status here) ──────────────────────────────────────────────
const saving = ref(false)
const form   = ref({})

function initForm() {
  form.value = {
    service_type:        props.order.service_type,
    customer_report:     props.order.customer_report ?? '',
    diagnosis:           props.order.diagnosis ?? '',
    service_description: props.order.service_description ?? '',
    external_service_id: props.order.external_service_id ?? '',
    labor_cost:          props.order.labor_cost ?? 0,
    mechanics:           props.order.mechanics?.map((m) => m.user_id) ?? [],
    mileage:             props.order.mileage ?? 0,
    plate:               props.order.vehicle?.plate ?? '',
    color:               props.order.vehicle?.color ?? '',
  }
}

watch(() => props.order, initForm, { immediate: true })

// ── Status change modal ──────────────────────────────────────────────────────
const showStatusModal     = ref(false)
const statusPhase         = ref('pick')   // 'pick' | 'confirm'
const pendingStatus       = ref(null)
const statusChanging      = ref(false)
const statusChangeError   = ref(null)

const nextStatuses = computed(() => {
  if (localStatus.value === 'delivered' && auth.user?.rol === 'master') {
    return MASTER_DELIVERED_TRANSITIONS
  }
  return STATUS_TRANSITIONS[localStatus.value] ?? []
})

const deliveredValidationErrors = computed(() => {
  if (pendingStatus.value !== 'delivered') return []
  const errors = []
  if (!form.value.external_service_id?.trim()) errors.push('Folio Ticket')
  if (!(parseFloat(form.value.labor_cost) > 0)) errors.push('Costo del servicio')
  return errors
})

function openStatusModal() {
  pendingStatus.value     = null
  statusPhase.value       = 'pick'
  statusChangeError.value = null
  showStatusModal.value   = true
}

function closeStatusModal() {
  showStatusModal.value   = false
  pendingStatus.value     = null
  statusPhase.value       = 'pick'
  statusChangeError.value = null
}

function selectNextStatus(s) {
  pendingStatus.value = s
  statusPhase.value   = 'confirm'
}

async function executeStatusChange() {
  if (deliveredValidationErrors.value.length) {
    statusChangeError.value = `Para marcar como Entregado completa los campos: ${deliveredValidationErrors.value.join(' y ')}.`
    return
  }
  statusChanging.value    = true
  statusChangeError.value = null
  try {
    await store.updateOrder(props.order.id, { status: pendingStatus.value })
    const newStatus   = pendingStatus.value
    localStatus.value = newStatus
    closeStatusModal()
    emit('saved')
    if (['delivered', 'cancelled'].includes(newStatus)) emit('close')
  } catch (e) {
    statusChangeError.value = e.message ?? 'Error al actualizar el estado.'
  } finally {
    statusChanging.value = false
  }
}

// ── History modal ────────────────────────────────────────────────────────────
const showHistoryModal = ref(false)
const statusLogs       = ref([])
const logsLoading      = ref(false)
const logsError        = ref(null)

async function openHistoryModal() {
  showHistoryModal.value = true
  logsLoading.value      = true
  logsError.value        = null
  try {
    const res      = await serviceOrdersApi.getStatusLogs(props.order.id)
    statusLogs.value = res.data
  } catch (e) {
    logsError.value = e.message ?? 'Error al cargar el historial.'
  } finally {
    logsLoading.value = false
  }
}

function formatLogDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

// ── Computed helpers ─────────────────────────────────────────────────────────
const catalog  = computed(() => props.order.vehicle?.vehicle_catalog)
const vehicle  = computed(() => props.order.vehicle)
const customer = computed(() => props.order.vehicle?.customer)

const elapsed = computed(() => {
  const ms   = Date.now() - new Date(props.order.created_at).getTime()
  const days = Math.floor(ms / 86400000)
  const hrs  = Math.floor((ms % 86400000) / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  if (days > 0) return `${days}d ${hrs}h`
  if (hrs > 0)  return `${hrs}h ${mins}m`
  return `${mins}m`
})

const formattedDate = computed(() =>
  new Date(props.order.created_at).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  }),
)

// ── Color helpers ────────────────────────────────────────────────────────────
const COLOR_CLASSES = {
  blue:    { badge: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500',   btn: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 hover:border-blue-300' },
  amber:   { badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500',  btn: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 hover:border-amber-300' },
  emerald: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500',btn: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 hover:border-emerald-300' },
  red:     { badge: 'bg-red-100 text-red-700',         dot: 'bg-red-500',    btn: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 hover:border-red-300' },
  violet:  { badge: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500', btn: 'bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200 hover:border-violet-300' },
  teal:    { badge: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500',   btn: 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200 hover:border-teal-300' },
  gray:    { badge: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400',   btn: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 hover:border-gray-300' },
}

function statusColors(key) {
  const color = STATUS_META[key]?.color ?? 'blue'
  return COLOR_CLASSES[color] ?? COLOR_CLASSES.blue
}

// ── Mechanics ────────────────────────────────────────────────────────────────
function isMechanicSelected(id) {
  return form.value.mechanics.includes(id)
}

function toggleMechanic(id) {
  const idx = form.value.mechanics.indexOf(id)
  if (idx === -1) form.value.mechanics.push(id)
  else            form.value.mechanics.splice(idx, 1)
}

// ── Save form ────────────────────────────────────────────────────────────────
async function save() {
  saving.value = true
  try {
    await Promise.all([
      store.updateOrder(props.order.id, {
        service_type:        form.value.service_type,
        customer_report:     form.value.customer_report,
        diagnosis:           form.value.diagnosis || null,
        service_description: form.value.service_description || null,
        external_service_id: form.value.external_service_id || null,
        labor_cost:          parseFloat(form.value.labor_cost) || 0,
        mechanics:           form.value.mechanics,
        mileage:             Number(form.value.mileage) || 0,
      }),
      vehiclesApi.update(props.order.vehicle.id, {
        plate: form.value.plate || null,
        color: form.value.color || null,
      }),
    ])
    emit('saved')
    toast.value.show('Registro actualizado con éxito')
  } catch (e) {
    toast.value.show(e.response?.data?.message ?? e.message, 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">

    <!-- ── Main modal ──────────────────────────────────────────────────────── -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">

        <!-- Header (outside scroll) -->
        <div class="flex items-start gap-4 px-6 py-4 border-b border-gray-200 shrink-0">
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-bold text-gray-900">Orden #{{ order.id }}</h2>
            <div class="flex items-center gap-2 mt-1.5 flex-wrap">
              <p class="text-sm text-gray-500"><VehicleCatalogDisplay v-if="catalog" :catalog="catalog" /></p>
              <span class="text-gray-300 text-xs select-none">·</span>
              <!-- Status badge -->
              <span
                :class="[
                  'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
                  statusColors(localStatus).badge,
                ]"
              >
                <span :class="['w-1.5 h-1.5 rounded-full', statusColors(localStatus).dot]" />
                {{ STATUS_META[localStatus]?.label ?? localStatus }}
              </span>
              <!-- Change status button -->
              <button
                v-if="nextStatuses.length"
                @click="openStatusModal"
                class="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 px-2 py-1 rounded-lg hover:bg-brand-50 border border-brand-200 hover:border-brand-400 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Cambiar estado
              </button>
              <!-- History button -->
              <button
                @click="openHistoryModal"
                class="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Historial
              </button>
            </div>
            <p class="text-xs text-gray-400 mt-2">
              Registrado por <span class="font-medium text-gray-500">{{ order.creator?.name }}</span>
              el {{ formattedDate }}
              <span class="text-brand-500 font-medium">({{ elapsed }})</span>
            </p>
          </div>
          <button
            @click="emit('close')"
            class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 mt-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body: form + notes sidebar -->
        <div class="flex flex-1 overflow-hidden">

        <!-- Left: scrollable form -->
        <div class="overflow-y-auto flex-1 px-6 py-6 space-y-3">

          <!-- Vehículo y cliente -->
          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-3">Vehículo y cliente</h3>
            <div class="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span class="text-gray-500 text-xs">Vehículo</span>
                <p class="font-medium text-gray-800"><VehicleCatalogDisplay v-if="catalog" :catalog="catalog" /></p>
              </div>
              <div>
                <span class="text-gray-500 text-xs">Cliente</span>
                <p class="font-medium text-gray-800">{{ customer?.first_name }} {{ customer?.last_name }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ formatPhone(customer) }}</p>
              </div>
              <div>
                <label class="block text-gray-500 text-xs mb-1">Placa</label>
                <input
                  v-model="form.plate"
                  type="text"
                  placeholder="—"
                  class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label class="block text-gray-500 text-xs mb-1">Color</label>
                <input
                  v-model="form.color"
                  type="text"
                  placeholder="—"
                  class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label class="block text-gray-500 text-xs mb-1">Kilometraje</label>
                <div class="relative">
                  <input
                    v-model="form.mileage"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 pr-8 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none select-none">km</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Mecánicos -->
          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-3">Mecánicos asignados</h3>
            <div v-if="store.mechanics.length" class="grid grid-cols-2 gap-2">
              <label
                v-for="mechanic in store.mechanics"
                :key="mechanic.id"
                :class="[
                  'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors select-none',
                  isMechanicSelected(mechanic.id)
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-gray-300 hover:border-gray-400',
                ]"
              >
                <input
                  type="checkbox"
                  :checked="isMechanicSelected(mechanic.id)"
                  @change="toggleMechanic(mechanic.id)"
                  class="w-4 h-4 rounded text-brand-600 border-gray-300 focus:ring-brand-500"
                />
                <span class="text-sm font-medium text-gray-800">{{ mechanic.name }}</span>
              </label>
            </div>
            <p v-else class="text-sm text-gray-400 italic">No hay mecánicos registrados.</p>
          </section>

          <!-- Tipo de servicio -->
          <section>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Tipo de servicio</label>
            <select
              v-model="form.service_type"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="repair">Reparación</option>
              <option value="installation">Instalación</option>
            </select>
          </section>

          <!-- Reporte del cliente -->
          <section>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Reporte del cliente</label>
            <textarea
              v-model="form.customer_report"
              rows="3"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </section>

          <!-- Diagnóstico -->
          <section>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Diagnóstico</label>
            <textarea
              v-model="form.diagnosis"
              rows="3"
              placeholder="Sin diagnóstico aún..."
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </section>

          <!-- Descripción del servicio -->
          <section>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Descripción del servicio</label>
            <textarea
              v-model="form.service_description"
              rows="3"
              placeholder="Sin descripción aún..."
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </section>

          <!-- ID externo -->
          <section>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Folio Ticket</label>
            <input
              v-model="form.external_service_id"
              type="text"
              placeholder="Opcional"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </section>

          <!-- Costo de mano de obra -->
          <section>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Costo del servicio</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 select-none">$</span>
              <input
                v-model="form.labor_cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                class="w-full rounded-xl border border-gray-300 pl-7 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </section>

        </div>

        <!-- Right: notes sidebar -->
        <div class="w-80 shrink-0 border-l border-gray-200 flex flex-col overflow-hidden bg-gray-50/40">
          <ServiceOrderNotes :order-id="order.id" />
        </div>

        </div><!-- end body row -->

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            @click="emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cerrar
          </button>
          <button
            @click="save"
            :disabled="saving"
            class="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-xl transition-colors"
          >
            {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>

      </div>
    </div>

    <!-- ── Status change modal ──────────────────────────────────────────────── -->
    <div
      v-if="showStatusModal"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      @click.self="closeStatusModal"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">

        <!-- Phase: pick -->
        <template v-if="statusPhase === 'pick'">
          <div class="px-6 pt-6 pb-4">
            <h3 class="text-base font-semibold text-gray-900">Cambiar estado</h3>
            <p class="text-sm text-gray-500 mt-1">Selecciona el estado al que deseas mover esta orden.</p>
          </div>

          <!-- Current status -->
          <div class="mx-6 mb-4 flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <span class="text-xs text-gray-500 shrink-0">Estado actual</span>
            <span
              :class="[
                'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
                statusColors(localStatus).badge,
              ]"
            >
              <span :class="['w-1.5 h-1.5 rounded-full', statusColors(localStatus).dot]" />
              {{ STATUS_META[localStatus]?.label ?? localStatus }}
            </span>
          </div>

          <!-- Next state options -->
          <div class="px-6 flex flex-col gap-2">
            <button
              v-for="s in nextStatuses"
              :key="s"
              @click="selectNextStatus(s)"
              :class="[
                'flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-colors text-left',
                statusColors(s).btn,
              ]"
            >
              <span :class="['w-2 h-2 rounded-full shrink-0', statusColors(s).dot]" />
              <span class="text-sm font-semibold">{{ STATUS_META[s]?.label ?? s }}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 ml-auto opacity-40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div class="flex justify-end px-6 py-5">
            <button
              @click="closeStatusModal"
              class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </template>

        <!-- Phase: confirm -->
        <template v-else>
          <div class="px-6 pt-6 pb-4">
            <h3 class="text-base font-semibold text-gray-900">Confirmar cambio de estado</h3>
          </div>

          <!-- Transition display -->
          <div class="mx-6 mb-4 flex items-center justify-center gap-3 bg-gray-50 rounded-xl px-4 py-4">
            <span
              :class="[
                'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full',
                statusColors(localStatus).badge,
              ]"
            >
              <span :class="['w-1.5 h-1.5 rounded-full', statusColors(localStatus).dot]" />
              {{ STATUS_META[localStatus]?.label ?? localStatus }}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-gray-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span
              :class="[
                'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full',
                statusColors(pendingStatus).badge,
              ]"
            >
              <span :class="['w-1.5 h-1.5 rounded-full', statusColors(pendingStatus).dot]" />
              {{ STATUS_META[pendingStatus]?.label ?? pendingStatus }}
            </span>
          </div>

          <!-- Warning -->
          <div class="mx-6 mb-4 flex gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-amber-500 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p class="text-sm text-amber-800">
              <template v-if="pendingStatus === 'cancelled'">
                La orden quedará marcada como <strong>"Cancelada"</strong> y dejará de aparecer en el tablero activo.
              </template>
              <template v-else>
                ¿Confirmas el cambio de estado? Esta acción no se puede deshacer.
              </template>
            </p>
          </div>

          <!-- Delivered validation -->
          <div
            v-if="deliveredValidationErrors.length"
            class="mx-6 mb-4 flex gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p class="text-sm text-red-800">
              Para marcar como <strong>"Entregado"</strong> debes completar:
              <span v-for="(e, i) in deliveredValidationErrors" :key="e">
                <strong>{{ e }}</strong><span v-if="i < deliveredValidationErrors.length - 1"> y </span>
              </span>.
            </p>
          </div>

          <!-- Error -->
          <p v-if="statusChangeError" class="mx-6 mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            {{ statusChangeError }}
          </p>

          <!-- Actions -->
          <div class="flex justify-end gap-3 px-6 pb-6">
            <button
              @click="statusPhase = 'pick'; pendingStatus = null"
              :disabled="statusChanging"
              class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-60"
            >
              Atrás
            </button>
            <button
              @click="executeStatusChange"
              :disabled="statusChanging || deliveredValidationErrors.length > 0"
              class="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-xl transition-colors"
            >
              <svg
                v-if="statusChanging"
                class="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              {{ statusChanging ? 'Aplicando…' : 'Confirmar cambio' }}
            </button>
          </div>
        </template>

      </div>
    </div>

    <!-- ── History modal ───────────────────────────────────────────────────── -->
    <div
      v-if="showHistoryModal"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      @click.self="showHistoryModal = false"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 class="text-base font-semibold text-gray-900">Historial de cambios</h3>
            <p class="text-xs text-gray-500 mt-0.5">Orden #{{ order.id }}</p>
          </div>
          <button
            @click="showHistoryModal = false"
            class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="overflow-y-auto flex-1 px-6 py-4">

          <!-- Loading -->
          <div v-if="logsLoading" class="flex items-center justify-center py-10">
            <svg class="h-6 w-6 animate-spin text-brand-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>

          <!-- Error -->
          <p v-else-if="logsError" class="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            {{ logsError }}
          </p>

          <!-- Empty -->
          <p v-else-if="!statusLogs.length" class="text-sm text-gray-400 italic text-center py-8">
            Sin registros de cambios.
          </p>

          <!-- Timeline -->
          <ol v-else class="relative border-l border-gray-200 ml-2 space-y-0">
            <li
              v-for="(log, i) in statusLogs"
              :key="log.id"
              class="mb-6 ml-5 last:mb-0"
            >
              <!-- Dot -->
              <span
                :class="[
                  'absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white',
                  statusColors(log.status).dot,
                ]"
              />

              <!-- Content -->
              <div class="flex flex-col gap-0.5">
                <span
                  :class="[
                    'inline-flex items-center gap-1.5 self-start text-xs font-medium px-2.5 py-1 rounded-full',
                    statusColors(log.status).badge,
                  ]"
                >
                  <span :class="['w-1.5 h-1.5 rounded-full', statusColors(log.status).dot]" />
                  {{ STATUS_META[log.status]?.label ?? log.status }}
                  <span v-if="i === 0" class="text-xs opacity-60">(inicial)</span>
                </span>
                <p class="text-xs text-gray-500 mt-1">
                  {{ formatLogDate(log.created_at) }}
                </p>
                <p class="text-xs text-gray-600 font-medium">
                  {{ log.changed_by?.name ?? '—' }}
                </p>
              </div>
            </li>
          </ol>

        </div>

      </div>
    </div>

  </Teleport>

  <AppToast ref="toast" />
</template>
