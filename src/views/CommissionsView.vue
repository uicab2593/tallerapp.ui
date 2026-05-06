<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useCommissionsStore } from '@/stores/commissions'
import { STATUS_META } from '@/stores/serviceOrders'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { es } from 'date-fns/locale'
import ServiceOrderModal from '@/components/dashboard/ServiceOrderModal.vue'

const store = useCommissionsStore()

const selectedOrder = ref(null)

function openModal(order) {
  selectedOrder.value = order
}

function closeModal() {
  selectedOrder.value = null
}

function onModalSaved() {
  selectedOrder.value = null
  if (store.filters.mechanic_id) store.fetchOrders()
}

// Bridges the picker's [Date, Date] format to the store's date_from / date_to strings
const dateRange = computed({
  get() {
    const from = store.filters.date_from
    const to   = store.filters.date_to
    if (!from || !to) return null
    return [new Date(from + 'T00:00:00'), new Date(to + 'T00:00:00')]
  },
  set(range) {
    if (!range || range.length < 2) {
      store.setFilters({ date_from: '', date_to: '' })
    } else {
      const fmt = (d) => d.toISOString().split('T')[0]
      store.setFilters({ date_from: fmt(range[0]), date_to: fmt(range[1]) })
    }
    if (store.filters.mechanic_id) store.fetchOrders()
  },
})

const activeTab = ref('delivered')

// Local editable commission amounts: { [serviceOrderMechanicId]: string }
const localCommissions = ref({})

function getMechanicAssignment(order) {
  const id = Number(store.filters.mechanic_id)
  return order.mechanics?.find(m => m.user_id === id) ?? null
}

function initLocalCommissions() {
  const result = {}
  const all = [...store.deliveredOrders, ...store.pendingOrders]
  all.forEach(order => {
    const assignment = getMechanicAssignment(order)
    if (assignment) {
      result[assignment.id] = String(parseFloat(assignment.commission_amount ?? 0).toFixed(2))
    }
  })
  localCommissions.value = result
}

watch(
  [() => store.deliveredOrders, () => store.pendingOrders],
  initLocalCommissions,
  { deep: false },
)

// ── Stats ─────────────────────────────────────────────────────────────────────
const deliveredCount = computed(() => store.deliveredOrders.length)
const pendingCount   = computed(() => store.pendingOrders.length)
const totalCount     = computed(() => deliveredCount.value + pendingCount.value)

const deliveredAmount = computed(() =>
  store.deliveredOrders.reduce((sum, order) => {
    const a = getMechanicAssignment(order)
    return sum + (a ? (parseFloat(localCommissions.value[a.id] ?? 0) || 0) : 0)
  }, 0),
)

const pendingAmount = computed(() =>
  store.pendingOrders.reduce((sum, order) => {
    const a = getMechanicAssignment(order)
    return sum + (a ? (parseFloat(localCommissions.value[a.id] ?? 0) || 0) : 0)
  }, 0),
)

const totalAmount = computed(() => deliveredAmount.value + pendingAmount.value)

const hasData = computed(() => store.deliveredOrders.length > 0 || store.pendingOrders.length > 0)

// ── Actions ───────────────────────────────────────────────────────────────────
function applyFilters() {
  store.fetchOrders()
}

function calculateAll() {
  const pct = parseFloat(store.selectedMechanic?.commission_percentage ?? 0) || 0
  const all = [...store.deliveredOrders, ...store.pendingOrders]
  all.forEach(order => {
    const assignment = getMechanicAssignment(order)
    if (assignment) {
      const amount = (parseFloat(order.labor_cost) || 0) * pct / 100
      localCommissions.value[assignment.id] = amount.toFixed(2)
    }
  })
}

async function saveAll() {
  const commissions = Object.entries(localCommissions.value).map(([id, amount]) => ({
    id:                Number(id),
    commission_amount: parseFloat(amount) || 0,
  }))
  if (commissions.length === 0) return
  await store.bulkSave(commissions)
}

// ── Formatters ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function formatCost(amount) {
  return `$${parseFloat(amount || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function mechanicsNames(order) {
  return order.mechanics?.map(m => m.mechanic?.name).filter(Boolean).join(', ') || '—'
}

function serviceTypeLabel(type) {
  return type === 'installation' ? 'Instalación' : 'Reparación'
}

function statusLabel(status) {
  return STATUS_META[status]?.label ?? status
}

const STATUS_COLOR = {
  received:         'bg-blue-100 text-blue-700',
  diagnosed:        'bg-amber-100 text-amber-700',
  approved:         'bg-emerald-100 text-emerald-700',
  not_approved:     'bg-red-100 text-red-700',
  in_service:       'bg-violet-100 text-violet-700',
  service_finished: 'bg-teal-100 text-teal-700',
  delivered:        'bg-gray-100 text-gray-600',
}

onMounted(() => {
  store.fetchMechanics()
})
</script>

<template>
  <div class="flex flex-col h-full gap-5">

    <!-- Título -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Comisiones</h1>
      <p class="text-sm text-gray-500">Resumen de comisiones por mecánico</p>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div class="flex flex-wrap items-end gap-4">

        <!-- Mecánico -->
        <div class="flex flex-col gap-1 min-w-52">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Mecánico</label>
          <select
            :value="store.filters.mechanic_id"
            @change="store.setFilters({ mechanic_id: $event.target.value ? Number($event.target.value) : null }); store.fetchOrders()"
            class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">Seleccionar mecánico...</option>
            <option v-for="m in store.mechanics" :key="m.id" :value="m.id">
              {{ m.name }}
              <template v-if="m.commission_percentage > 0"> ({{ m.commission_percentage }}%)</template>
            </option>
          </select>
        </div>

        <!-- Rango de fechas -->
        <div class="flex flex-col gap-1 min-w-64">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Rango de fechas</label>
          <VueDatePicker
            v-model="dateRange"
            range
            :time-config="{ enableTimePicker: false }"
            :formats="{ input: 'd MMMM yyyy' }"
            :locale="es"
            select-text="Seleccionar"
            cancel-text="Cancelar"
            :auto-apply="true"
            placeholder="Seleccionar rango..."
            input-class-name="dp-custom-input"
          />
        </div>

        <button
          @click="applyFilters"
          :disabled="!store.filters.mechanic_id"
          class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Recargar
        </button>
      </div>
    </div>

    <!-- Stats (visible after data loads) -->
    <template v-if="hasData || store.loading">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <!-- Entregados -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Servicios entregados</p>
          <p class="text-3xl font-bold text-emerald-600">{{ formatCost(deliveredAmount) }}</p>
          <p class="text-xs text-gray-400 mt-1.5">{{ deliveredCount }} {{ deliveredCount === 1 ? 'servicio' : 'servicios' }}</p>
        </div>

        <!-- Pendientes -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Servicios pendientes</p>
          <p class="text-3xl font-bold text-amber-500">{{ formatCost(pendingAmount) }}</p>
          <p class="text-xs text-gray-400 mt-1.5">{{ pendingCount }} {{ pendingCount === 1 ? 'servicio' : 'servicios' }}</p>
        </div>

        <!-- Total general -->
        <div class="bg-brand-50 rounded-xl border border-brand-100 shadow-sm p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-3">Total general</p>
          <p class="text-3xl font-bold text-brand-700">{{ formatCost(totalAmount) }}</p>
          <p class="text-xs text-brand-400 mt-1.5">{{ totalCount }} {{ totalCount === 1 ? 'servicio' : 'servicios' }}</p>
        </div>

      </div>
    </template>

    <!-- Error -->
    <div v-if="store.error" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      {{ store.error }}
    </div>

    <!-- Content (only when mechanic selected) -->
    <template v-if="store.filters.mechanic_id">

      <!-- Action bar -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <!-- Tab buttons -->
          <div class="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
            <button
              @click="activeTab = 'delivered'"
              :class="activeTab === 'delivered'
                ? 'bg-brand-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'"
              class="px-4 py-2 text-sm font-medium transition-colors"
            >
              Entregados
              <span class="ml-1.5 text-xs font-semibold opacity-80">({{ deliveredCount }})</span>
            </button>
            <button
              @click="activeTab = 'pending'"
              :class="activeTab === 'pending'
                ? 'bg-brand-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'"
              class="px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200"
            >
              Pendientes
              <span class="ml-1.5 text-xs font-semibold opacity-80">({{ pendingCount }})</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Save feedback -->
          <span v-if="store.saveSuccess" class="text-xs font-medium text-emerald-600">
            Guardado correctamente
          </span>
          <span v-if="store.saveError" class="text-xs font-medium text-red-600">
            {{ store.saveError }}
          </span>

          <!-- Calcular -->
          <button
            @click="calculateAll"
            :disabled="!store.selectedMechanic || store.loading"
            class="px-4 py-2 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Calcular
            <template v-if="store.selectedMechanic?.commission_percentage">
              ({{ store.selectedMechanic.commission_percentage }}%)
            </template>
          </button>

          <!-- Guardar todo -->
          <button
            @click="saveAll"
            :disabled="store.saving || store.loading || !hasData"
            class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span v-if="store.saving">Guardando...</span>
            <span v-else>Guardar todo</span>
          </button>
        </div>
      </div>

      <!-- Loading spinner -->
      <div v-if="store.loading" class="flex justify-center py-16">
        <svg class="h-8 w-8 animate-spin text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>

      <!-- Tab: Entregados -->
      <div v-else-if="activeTab === 'delivered'" class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th class="px-4 py-3 font-semibold">#</th>
                <th class="px-4 py-3 font-semibold">Vehículo</th>
                <th class="px-4 py-3 font-semibold">Cliente</th>
                <th class="px-4 py-3 font-semibold">Tipo</th>
                <th class="px-4 py-3 font-semibold">Mecánicos</th>
                <th class="px-4 py-3 font-semibold">Registrado</th>
                <th class="px-4 py-3 font-semibold">Entregado</th>
                <th class="px-4 py-3 font-semibold">Costo</th>
                <th class="px-4 py-3 font-semibold">Comisión</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">

              <tr v-if="store.deliveredOrders.length === 0">
                <td colspan="10" class="py-16 text-center text-sm text-gray-400">
                  No hay servicios entregados en el período seleccionado.
                </td>
              </tr>

              <tr
                v-else
                v-for="order in store.deliveredOrders"
                :key="order.id"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-4 py-3 font-mono text-gray-500 text-xs">#{{ order.id }}</td>
                <td class="px-4 py-3 font-semibold text-gray-800">
                  {{ order.vehicle?.vehicle_catalog?.brand }}
                  {{ order.vehicle?.vehicle_catalog?.model }}
                  {{ order.vehicle?.vehicle_catalog?.year }}
                  <span class="text-gray-400 text-xs font-normal ml-1">· {{ order.vehicle?.color }}</span>
                </td>
                <td class="px-4 py-3 text-gray-600">
                  {{ order.vehicle?.customer?.first_name }} {{ order.vehicle?.customer?.last_name }}
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="order.service_type === 'installation' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  >
                    {{ serviceTypeLabel(order.service_type) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600 max-w-[160px] truncate" :title="mechanicsNames(order)">
                  {{ mechanicsNames(order) }}
                </td>
                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {{ formatDate(order.created_at) }}
                </td>
                <td class="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {{ formatDateTime(order.delivered_datetime) }}
                </td>
                <td class="px-4 py-3 text-gray-800 font-medium tabular-nums">
                  {{ formatCost(order.labor_cost) }}
                </td>
                <td class="px-4 py-3">
                  <template v-if="getMechanicAssignment(order)">
                    <div class="flex items-center gap-1">
                      <span class="text-gray-400 text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        :value="localCommissions[getMechanicAssignment(order).id]"
                        @input="localCommissions[getMechanicAssignment(order).id] = $event.target.value"
                        class="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-800 tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-brand-400"
                      />
                    </div>
                  </template>
                  <span v-else class="text-gray-300 text-xs">—</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    @click="openModal(order)"
                    class="text-xs font-medium text-brand-600 hover:text-brand-800 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Ver
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Pendientes -->
      <div v-else-if="activeTab === 'pending'" class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th class="px-4 py-3 font-semibold">#</th>
                <th class="px-4 py-3 font-semibold">Vehículo</th>
                <th class="px-4 py-3 font-semibold">Cliente</th>
                <th class="px-4 py-3 font-semibold">Tipo</th>
                <th class="px-4 py-3 font-semibold">Mecánicos</th>
                <th class="px-4 py-3 font-semibold">Registrado</th>
                <th class="px-4 py-3 font-semibold">Estado</th>
                <th class="px-4 py-3 font-semibold">Costo</th>
                <th class="px-4 py-3 font-semibold">Comisión</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">

              <tr v-if="store.pendingOrders.length === 0">
                <td colspan="10" class="py-16 text-center text-sm text-gray-400">
                  No hay servicios pendientes para este mecánico.
                </td>
              </tr>

              <tr
                v-else
                v-for="order in store.pendingOrders"
                :key="order.id"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-4 py-3 font-mono text-gray-500 text-xs">#{{ order.id }}</td>
                <td class="px-4 py-3 font-semibold text-gray-800">
                  {{ order.vehicle?.vehicle_catalog?.brand }}
                  {{ order.vehicle?.vehicle_catalog?.model }}
                  {{ order.vehicle?.vehicle_catalog?.year }}
                  <span class="text-gray-400 text-xs font-normal ml-1">· {{ order.vehicle?.color }}</span>
                </td>
                <td class="px-4 py-3 text-gray-600">
                  {{ order.vehicle?.customer?.first_name }} {{ order.vehicle?.customer?.last_name }}
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="order.service_type === 'installation' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  >
                    {{ serviceTypeLabel(order.service_type) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-600 max-w-[160px] truncate" :title="mechanicsNames(order)">
                  {{ mechanicsNames(order) }}
                </td>
                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {{ formatDate(order.created_at) }}
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  >
                    {{ statusLabel(order.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-800 font-medium tabular-nums">
                  {{ formatCost(order.labor_cost) }}
                </td>
                <td class="px-4 py-3">
                  <template v-if="getMechanicAssignment(order)">
                    <div class="flex items-center gap-1">
                      <span class="text-gray-400 text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        :value="localCommissions[getMechanicAssignment(order).id]"
                        @input="localCommissions[getMechanicAssignment(order).id] = $event.target.value"
                        class="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-800 tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-brand-400"
                      />
                    </div>
                  </template>
                  <span v-else class="text-gray-300 text-xs">—</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    @click="openModal(order)"
                    class="text-xs font-medium text-brand-600 hover:text-brand-800 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Ver
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>

    <!-- Empty state (no mechanic selected) -->
    <div
      v-else
      class="flex-1 flex flex-col items-center justify-center text-center py-24 text-gray-400"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 13v-2a4 4 0 00-3-3.87" />
      </svg>
      <p class="text-sm font-medium">Selecciona un mecánico para ver sus comisiones</p>
    </div>

  </div>

  <!-- Modal detalle/edición -->
  <ServiceOrderModal
    v-if="selectedOrder"
    :order="selectedOrder"
    @close="closeModal"
    @saved="onModalSaved"
  />

</template>

<style>
.dp-custom-input {
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: #1f2937;
  width: 100%;
}
.dp-custom-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px #818cf8;
  border-color: #818cf8;
}
.dp__theme_light {
  --dp-border-radius: 0.75rem;
  --dp-font-size: 0.875rem;
  --dp-primary-color: #4f46e5;
  --dp-primary-text-color: #ffffff;
  --dp-secondary-color: #e0e7ff;
  --dp-hover-color: #eef2ff;
  --dp-range-between-dates-background-color: #eef2ff;
  --dp-range-between-dates-text-color: #4338ca;
}
</style>
