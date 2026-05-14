<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useCommissionsStore } from '@/stores/commissions'
import { STATUS_META } from '@/stores/serviceOrders'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { es } from 'date-fns/locale'
import ServiceOrderModal from '@/components/dashboard/ServiceOrderModal.vue'
import AppToast from '@/components/ui/AppToast.vue'

const store = useCommissionsStore()
const toast = ref(null)

// ── Modal ─────────────────────────────────────────────────────────────────────
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

// ── Date range (solo tab Pagadas) ─────────────────────────────────────────────
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
      const fmt = (d) => d.toLocaleDateString('en-CA')
      store.setFilters({ date_from: fmt(range[0]), date_to: fmt(range[1]) })
    }
    if (store.filters.mechanic_id) store.fetchOrders()
  },
})

// ── Tabs ──────────────────────────────────────────────────────────────────────
const activeTab = ref('payable')

// ── Local editable commission amounts ─────────────────────────────────────────
// { [serviceOrderMechanicId]: string }
const localCommissions = ref({})

function getMechanicAssignment(order) {
  const id = Number(store.filters.mechanic_id)
  return order.mechanics?.find(m => m.user_id === id) ?? null
}

function initLocalCommissions() {
  const result = {}
  const all = [...store.payableOrders, ...store.pendingOrders, ...store.paidOrders]
  all.forEach(order => {
    const assignment = getMechanicAssignment(order)
    if (assignment) {
      result[assignment.id] = String(parseFloat(assignment.commission_amount ?? 0).toFixed(2))
    }
  })
  localCommissions.value = result
}

watch(
  [() => store.payableOrders, () => store.pendingOrders, () => store.paidOrders],
  initLocalCommissions,
  { deep: false },
)

// ── Selección para pago ───────────────────────────────────────────────────────
const selectedForPay = ref(new Set())

function toggleSelectForPay(assignmentId) {
  const next = new Set(selectedForPay.value)
  if (next.has(assignmentId)) {
    next.delete(assignmentId)
  } else {
    next.add(assignmentId)
  }
  selectedForPay.value = next
}

function selectAllPayable() {
  const next = new Set(selectedForPay.value)
  store.payableOrders.forEach(order => {
    const a = getMechanicAssignment(order)
    if (a) next.add(a.id)
  })
  selectedForPay.value = next
}

function clearSelection() {
  selectedForPay.value = new Set()
}

watch(activeTab, () => {
  selectedForPay.value = new Set()
})

watch(() => store.payableOrders, () => {
  const validIds = new Set(
    store.payableOrders.map(o => getMechanicAssignment(o)?.id).filter(Boolean)
  )
  const next = new Set([...selectedForPay.value].filter(id => validIds.has(id)))
  selectedForPay.value = next
}, { deep: false })

const selectedCount = computed(() => selectedForPay.value.size)

const selectedPayAmount = computed(() =>
  [...selectedForPay.value].reduce((sum, id) => {
    return sum + (parseFloat(localCommissions.value[id] ?? 0) || 0)
  }, 0)
)

const payableAssignmentIds = computed(() =>
  store.payableOrders.map(o => getMechanicAssignment(o)?.id).filter(Boolean)
)

const allPayableSelected = computed(() =>
  payableAssignmentIds.value.length > 0 &&
  payableAssignmentIds.value.every(id => selectedForPay.value.has(id))
)

const somePayableSelected = computed(() =>
  selectedCount.value > 0 && !allPayableSelected.value
)

function toggleSelectAll() {
  if (allPayableSelected.value) {
    clearSelection()
  } else {
    selectAllPayable()
  }
}

// ── Modal de confirmación de pago ─────────────────────────────────────────────
const showPayConfirm = ref(false)

function openPayConfirm() {
  if (selectedCount.value === 0) return
  showPayConfirm.value = true
}

async function confirmPay() {
  showPayConfirm.value = false
  const ids = [...selectedForPay.value]
  try {
    const commissions = ids.map(id => ({
      id,
      commission_amount: parseFloat(localCommissions.value[id]) || 0,
    }))
    await store.bulkSave(commissions)
    await store.markAsPaid(ids)
    selectedForPay.value = new Set()
    toast.value?.show('Comisiones guardadas y registradas como pagadas', 'success')
  } catch (e) {
    toast.value?.show(e.message, 'error')
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
const payableAmount = computed(() =>
  store.payableOrders.reduce((sum, order) => {
    const a = getMechanicAssignment(order)
    return sum + (a ? (parseFloat(localCommissions.value[a.id] ?? 0) || 0) : 0)
  }, 0)
)

const pendingAmount = computed(() =>
  store.pendingOrders.reduce((sum, order) => {
    const a = getMechanicAssignment(order)
    return sum + (a ? (parseFloat(localCommissions.value[a.id] ?? 0) || 0) : 0)
  }, 0)
)

const paidAmount = computed(() =>
  store.paidOrders.reduce((sum, order) => {
    const a = getMechanicAssignment(order)
    return sum + (a ? (parseFloat(a.commission_amount ?? 0) || 0) : 0)
  }, 0)
)

const hasData = computed(() =>
  store.payableOrders.length > 0 ||
  store.pendingOrders.length > 0 ||
  store.paidOrders.length > 0
)

// ── Acciones ──────────────────────────────────────────────────────────────────
function calculateAll() {
  const pct = parseFloat(store.selectedMechanic?.commission_percentage ?? 0) || 0
  const editable = [...store.payableOrders, ...store.pendingOrders]
  editable.forEach(order => {
    const assignment = getMechanicAssignment(order)
    if (assignment) {
      const amount = (parseFloat(order.labor_cost) || 0) * pct / 100
      localCommissions.value[assignment.id] = amount.toFixed(2)
    }
  })
}

async function saveAll() {
  const editable = [...store.payableOrders, ...store.pendingOrders]
  const commissions = editable
    .map(order => {
      const a = getMechanicAssignment(order)
      if (!a) return null
      return {
        id:                a.id,
        commission_amount: parseFloat(localCommissions.value[a.id]) || 0,
      }
    })
    .filter(Boolean)

  if (commissions.length === 0) return
  try {
    await store.bulkSave(commissions)
    toast.value?.show('Comisiones guardadas', 'success')
  } catch (e) {
    toast.value?.show(e.message, 'error')
  }
}

// ── Confirmación de cambio de estado ─────────────────────────────────────────
const pendingToggle = ref(null) // { order, makePayable }

function togglePayable(order, makePayable) {
  pendingToggle.value = { order, makePayable }
}

async function confirmToggle() {
  const { order, makePayable } = pendingToggle.value
  pendingToggle.value = null
  const a = getMechanicAssignment(order)
  if (!a) return
  try {
    await store.togglePayable(a.id, makePayable)
    toast.value?.show(
      makePayable ? 'Servicio movido a Pagables' : 'Servicio movido a Pendientes',
      'success',
    )
  } catch (e) {
    toast.value?.show(e.message, 'error')
  }
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

    <!-- Filtros + Stats en la misma fila -->
    <div class="flex items-stretch gap-4">

      <!-- Filtros (izquierda, ancho fijo según contenido) -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 shrink-0">
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

          <!-- Rango de fechas: siempre visible, solo activo en tab Pagadas -->
          <div class="flex flex-col gap-1 min-w-56" :class="activeTab !== 'paid' ? 'opacity-40 pointer-events-none' : ''">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Período de pago
            </label>
            <VueDatePicker
              v-model="dateRange"
              range
              :time-config="{ enableTimePicker: false }"
              :formats="{ input: 'd MMM yyyy' }"
              :locale="es"
              select-text="Seleccionar"
              cancel-text="Cancelar"
              :auto-apply="true"
              placeholder="Seleccionar rango..."
              input-class-name="dp-custom-input"
              :disabled="activeTab !== 'paid'"
            />
          </div>

          <button
            @click="store.fetchOrders()"
            :disabled="!store.filters.mechanic_id || activeTab !== 'paid'"
            class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Aplicar
          </button>

        </div>
      </div>

      <!-- Stats (derecha, ocupan el espacio restante) -->
      <div v-if="hasData || store.loading" class="flex-1 grid grid-cols-3 gap-4">

        <div class="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col justify-center">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Por pagar</p>
          <p class="text-2xl font-bold text-emerald-600 tabular-nums">{{ formatCost(payableAmount) }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ store.payableOrders.length }} {{ store.payableOrders.length === 1 ? 'servicio' : 'servicios' }}</p>
        </div>

        <div class="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col justify-center">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Pendientes</p>
          <p class="text-2xl font-bold text-amber-500 tabular-nums">{{ formatCost(pendingAmount) }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ store.pendingOrders.length }} {{ store.pendingOrders.length === 1 ? 'servicio' : 'servicios' }}</p>
        </div>

        <div class="bg-brand-50 rounded-xl border border-brand-100 shadow-sm px-4 py-3 flex flex-col justify-center">
          <p class="text-xs font-semibold uppercase tracking-wider text-brand-400 mb-1.5">Pagado en período</p>
          <p class="text-2xl font-bold text-brand-700 tabular-nums">{{ formatCost(paidAmount) }}</p>
          <p class="text-xs text-brand-400 mt-1">{{ store.paidOrders.length }} {{ store.paidOrders.length === 1 ? 'servicio' : 'servicios' }}</p>
        </div>

      </div>

    </div>

    <!-- Error -->
    <div v-if="store.error" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      {{ store.error }}
    </div>

    <!-- Contenido principal -->
    <template v-if="store.filters.mechanic_id">

      <!-- Action bar -->
      <div class="flex items-center justify-between gap-3 flex-wrap">

        <!-- Tabs -->
        <div class="flex rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
          <button
            @click="activeTab = 'pending'"
            :class="activeTab === 'pending' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
            class="px-4 py-2 text-sm font-medium transition-colors"
          >
            Pendientes
            <span class="ml-1.5 text-xs font-semibold opacity-80">({{ store.pendingOrders.length }})</span>
          </button>
          <button
            @click="activeTab = 'payable'"
            :class="activeTab === 'payable' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
            class="px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200"
          >
            Pagables
            <span class="ml-1.5 text-xs font-semibold opacity-80">({{ store.payableOrders.length }})</span>
          </button>
          <button
            @click="activeTab = 'paid'"
            :class="activeTab === 'paid' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
            class="px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200"
          >
            Pagadas
            <span class="ml-1.5 text-xs font-semibold opacity-80">({{ store.paidOrders.length }})</span>
          </button>
        </div>

        <!-- Acciones -->
        <div class="flex items-center gap-2">
          <template v-if="activeTab !== 'paid'">
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

            <button
              @click="saveAll"
              :disabled="store.saving || store.loading || !hasData"
              class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span v-if="store.saving">Guardando...</span>
              <span v-else>Guardar montos</span>
            </button>
          </template>

          <!-- Botón Registrar pago (solo tab Pagables) -->
          <template v-if="activeTab === 'payable'">
            <button
              @click="openPayConfirm"
              :disabled="selectedCount === 0 || store.paying"
              class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span v-if="store.paying">Guardando...</span>
              <span v-else>Guardar montos y pagar ({{ selectedCount }})</span>
            </button>
          </template>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.loading" class="flex justify-center py-16">
        <svg class="h-8 w-8 animate-spin text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>

      <!-- ── Tab: Pagables ──────────────────────────────────────────────────── -->
      <div v-else-if="activeTab === 'payable'" class="flex flex-col gap-3 flex-1 min-h-0">

        <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          <div class="overflow-x-auto overflow-y-auto flex-1">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th class="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      :checked="allPayableSelected"
                      :indeterminate="somePayableSelected"
                      @change="toggleSelectAll"
                      class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400 cursor-pointer"
                    />
                  </th>
                  <th class="px-4 py-3 font-semibold">#</th>
                  <th class="px-4 py-3 font-semibold">Vehículo</th>
                  <th class="px-4 py-3 font-semibold">Cliente</th>
                  <th class="px-4 py-3 font-semibold">Tipo</th>
                  <th class="px-4 py-3 font-semibold">Estado</th>
                  <th class="px-4 py-3 font-semibold">Entregado</th>
                  <th class="px-4 py-3 font-semibold">Costo</th>
                  <th class="px-4 py-3 font-semibold">Comisión</th>
                  <th class="px-4 py-3" />
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">

                <tr v-if="store.payableOrders.length === 0">
                  <td colspan="10" class="py-16 text-center text-sm text-gray-400">
                    No hay servicios pagables para este mecánico.
                  </td>
                </tr>

                <tr
                  v-else
                  v-for="order in store.payableOrders"
                  :key="order.id"
                  class="hover:bg-gray-50 transition-colors"
                  :class="{ 'bg-emerald-50/40': selectedForPay.has(getMechanicAssignment(order)?.id) }"
                >
                  <td class="px-4 py-3">
                    <template v-if="getMechanicAssignment(order)">
                      <input
                        type="checkbox"
                        :checked="selectedForPay.has(getMechanicAssignment(order).id)"
                        @change="toggleSelectForPay(getMechanicAssignment(order).id)"
                        class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400 cursor-pointer"
                      />
                    </template>
                  </td>
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
                  <td class="px-4 py-3">
                    <span
                      :class="STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    >
                      {{ statusLabel(order.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {{ order.status === 'delivered' ? formatDateTime(order.delivered_datetime) : '—' }}
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
                    <div class="flex items-center justify-end gap-1.5">
                      <!-- Mover a Pendientes -->
                      <button
                        @click="togglePayable(order, false)"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        Mover a Pendientes
                      </button>
                      <!-- Ver detalle -->
                      <button
                        @click="openModal(order)"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver
                      </button>
                    </div>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── Tab: Pendientes ────────────────────────────────────────────────── -->
      <div v-else-if="activeTab === 'pending'" class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div class="overflow-x-auto overflow-y-auto flex-1">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th class="px-4 py-3 font-semibold">#</th>
                <th class="px-4 py-3 font-semibold">Vehículo</th>
                <th class="px-4 py-3 font-semibold">Cliente</th>
                <th class="px-4 py-3 font-semibold">Tipo</th>
                <th class="px-4 py-3 font-semibold">Estado</th>
                <th class="px-4 py-3 font-semibold">Registrado</th>
                <th class="px-4 py-3 font-semibold">Costo</th>
                <th class="px-4 py-3 font-semibold">Comisión</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">

              <tr v-if="store.pendingOrders.length === 0">
                <td colspan="9" class="py-16 text-center text-sm text-gray-400">
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
                <td class="px-4 py-3">
                  <span
                    :class="STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  >
                    {{ statusLabel(order.status) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {{ formatDate(order.created_at) }}
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
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- Mover a Pagables -->
                    <button
                      @click="togglePayable(order, true)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                      Mover a Pagables
                    </button>
                    <!-- Ver detalle -->
                    <button
                      @click="openModal(order)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver
                    </button>
                  </div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Tab: Pagadas ───────────────────────────────────────────────────── -->
      <div v-else-if="activeTab === 'paid'" class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div class="overflow-x-auto overflow-y-auto flex-1">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th class="px-4 py-3 font-semibold">#</th>
                <th class="px-4 py-3 font-semibold">Vehículo</th>
                <th class="px-4 py-3 font-semibold">Cliente</th>
                <th class="px-4 py-3 font-semibold">Tipo</th>
                <th class="px-4 py-3 font-semibold">Estado</th>
                <th class="px-4 py-3 font-semibold">Costo</th>
                <th class="px-4 py-3 font-semibold">Comisión</th>
                <th class="px-4 py-3 font-semibold">Fecha de pago</th>
                <th class="px-4 py-3 font-semibold">Registrado por</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">

              <tr v-if="store.paidOrders.length === 0">
                <td colspan="10" class="py-16 text-center text-sm text-gray-400">
                  No hay comisiones pagadas en el período seleccionado.
                </td>
              </tr>

              <tr
                v-else
                v-for="order in store.paidOrders"
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
                <td class="px-4 py-3 font-semibold tabular-nums text-emerald-700">
                  <template v-if="getMechanicAssignment(order)">
                    {{ formatCost(getMechanicAssignment(order).commission_amount) }}
                  </template>
                  <span v-else class="text-gray-300">—</span>
                </td>
                <td class="px-4 py-3 text-gray-700 whitespace-nowrap">
                  {{ getMechanicAssignment(order)?.paid_at ? formatDateTime(getMechanicAssignment(order).paid_at) : '—' }}
                </td>
                <td class="px-4 py-3 text-gray-600">
                  {{ getMechanicAssignment(order)?.paid_by_user?.name ?? '—' }}
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    @click="openModal(order)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver
                  </button>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </template>

    <!-- Empty state -->
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

  <!-- Modal de confirmación de cambio de estado -->
  <Teleport to="body">
    <div
      v-if="pendingToggle"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="pendingToggle = null"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 class="text-lg font-bold text-gray-900 mb-1">
          {{ pendingToggle.makePayable ? 'Mover a Pagables' : 'Mover a Pendientes' }}
        </h2>
        <p class="text-sm text-gray-500 mb-5">
          ¿Confirmas que deseas mover este servicio a
          <span class="font-semibold text-gray-800">{{ pendingToggle.makePayable ? 'Pagables' : 'Pendientes' }}</span>?
        </p>
        <div class="flex gap-3 justify-end">
          <button
            @click="pendingToggle = null"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            @click="confirmToggle"
            :class="pendingToggle.makePayable
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-amber-500 hover:bg-amber-600'"
            class="px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors"
          >
            Sí, mover
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal de confirmación de pago -->
  <Teleport to="body">
    <div
      v-if="showPayConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="showPayConfirm = false"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 class="text-lg font-bold text-gray-900 mb-1">Guardar montos y registrar pago</h2>
        <p class="text-sm text-gray-500 mb-5">
          Se guardarán los montos y se registrarán como pagadas
          <span class="font-semibold text-gray-800">{{ selectedCount }} {{ selectedCount === 1 ? 'comisión' : 'comisiones' }}</span>
          por un total de <span class="font-semibold text-emerald-700">{{ formatCost(selectedPayAmount) }}</span>.
          Esta acción no se puede deshacer.
        </p>
        <div class="flex gap-3 justify-end">
          <button
            @click="showPayConfirm = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            @click="confirmPay"
            class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
          >
            Sí, registrar pago
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal detalle/edición de OS -->
  <ServiceOrderModal
    v-if="selectedOrder"
    :order="selectedOrder"
    @close="closeModal"
    @saved="onModalSaved"
  />

  <AppToast ref="toast" />

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
