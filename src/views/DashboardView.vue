<script setup>
import { ref, computed, onMounted } from 'vue'
import { useServiceOrdersStore, STATUS_META } from '@/stores/serviceOrders'
import ServiceOrderCard from '@/components/dashboard/ServiceOrderCard.vue'
import ServiceOrderModal from '@/components/dashboard/ServiceOrderModal.vue'
import CreateServiceModal from '@/components/dashboard/ServiceCreateModal.vue'
import AppToast from '@/components/ui/AppToast.vue'
import VehicleDisplay from '@/components/ui/VehicleDisplay.vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { es } from 'date-fns/locale'

const store = useServiceOrdersStore()
const selectedOrder   = ref(null)
const showCreateModal  = ref(false)
const toast            = ref(null)
const activeTab        = ref('active')
const modalHadChanges  = ref(false)

// ── Tab helpers ──────────────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'delivered') store.fetchDelivered(1)
}

// ── Modal ────────────────────────────────────────────────────────────────────
function openModal(order) {
  modalHadChanges.value = false
  selectedOrder.value   = order
}

function onModalSaved() {
  modalHadChanges.value = true
}

function onServiceCreated() {
  showCreateModal.value = false
  toast.value.show('Servicio registrado con éxito')
}

function closeModal() {
  const shouldRefresh = activeTab.value === 'delivered' && modalHadChanges.value
  selectedOrder.value  = null
  modalHadChanges.value = false
  if (shouldRefresh) store.fetchDelivered(store.deliveredMeta.current_page)
}

// ── Tab 1: Kanban ────────────────────────────────────────────────────────────
const COLOR_HEADER = {
  blue:    'bg-blue-500',
  amber:   'bg-amber-500',
  emerald: 'bg-emerald-500',
  violet:  'bg-violet-500',
  teal:    'bg-teal-500',
  gray:    'bg-gray-400',
}

// Opciones del filtro de estado para el kanban (sin delivered ni cancelled)
const kanbanStatusOptions = computed(() =>
  Object.entries(STATUS_META).filter(([key]) => !['delivered', 'cancelled'].includes(key)),
)

function applyFilters() {
  store.fetchOrders()
}

function resetFilters() {
  store.setFilters({ date_from: '', date_to: '', status: '' })
  store.fetchOrders()
}

// ── Tab 2: Entregados ────────────────────────────────────────────────────────
function applyDeliveredFilters() {
  store.fetchDelivered(1)
}

function resetDeliveredFilters() {
  store.setDeliveredFilters({ date_from: '', date_to: '', customer_name: '', customer_phone: '', plate: '' })
  store.fetchDelivered(1)
}

function goToPage(page) {
  if (page < 1 || page > store.deliveredMeta.last_page) return
  store.fetchDelivered(page)
}

const pageNumbers = computed(() => {
  const { current_page, last_page } = store.deliveredMeta
  if (last_page <= 7) return Array.from({ length: last_page }, (_, i) => i + 1)
  const around = [current_page - 1, current_page, current_page + 1]
  const pages  = [...new Set([1, 2, ...around, last_page - 1, last_page])]
  return pages.filter((p) => p >= 1 && p <= last_page).sort((a, b) => a - b)
})

function formatDate(dateStr) {
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
  return order.mechanics?.map((m) => m.mechanic?.name).filter(Boolean).join(', ') || '—'
}

function serviceTypeLabel(type) {
  return type === 'installation' ? 'Instalación' : 'Reparación'
}

// ── Date range pickers ───────────────────────────────────────────────────────
const fmt = (d) => d.toLocaleDateString('en-CA')

const kanbanDateRange = computed({
  get() {
    const { date_from, date_to } = store.filters
    if (!date_from && !date_to) return null
    return [
      date_from ? new Date(date_from + 'T00:00:00') : null,
      date_to   ? new Date(date_to   + 'T00:00:00') : null,
    ]
  },
  set(range) {
    if (!range || range.length < 2) {
      store.setFilters({ date_from: '', date_to: '' })
    } else {
      store.setFilters({ date_from: fmt(range[0]), date_to: fmt(range[1]) })
    }
  },
})

const deliveredDateRange = computed({
  get() {
    const { date_from, date_to } = store.deliveredFilters
    if (!date_from && !date_to) return null
    return [
      date_from ? new Date(date_from + 'T00:00:00') : null,
      date_to   ? new Date(date_to   + 'T00:00:00') : null,
    ]
  },
  set(range) {
    if (!range || range.length < 2) {
      store.setDeliveredFilters({ date_from: '', date_to: '' })
    } else {
      store.setDeliveredFilters({ date_from: fmt(range[0]), date_to: fmt(range[1]) })
    }
  },
})

// ── Init ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([store.fetchOrders(), store.fetchMechanics()])
})
</script>

<template>
  <div class="flex flex-col h-full gap-5">

    <!-- Título + acciones -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p class="text-sm text-gray-500">
          {{ activeTab === 'active' ? 'Servicios activos en tiempo real' : 'Histórico de servicios entregados' }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="activeTab === 'active'"
          @click="store.fetchOrders()"
          :disabled="store.loading"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" :class="{ 'animate-spin': store.loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
        <button
          @click="showCreateModal = true"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo servicio
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-gray-200">
      <button
        @click="switchTab('active')"
        :class="activeTab === 'active'
          ? 'border-b-2 border-brand-600 text-brand-600 font-semibold'
          : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'"
        class="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
      >
        Activos
        <span :class="activeTab === 'active' ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'"
              class="px-2 py-0.5 text-xs rounded-full font-medium">
          {{ store.orders.length }}
        </span>
      </button>
      <button
        @click="switchTab('delivered')"
        :class="activeTab === 'delivered'
          ? 'border-b-2 border-brand-600 text-brand-600 font-semibold'
          : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'"
        class="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
      >
        Entregados
        <span v-if="store.deliveredMeta.total > 0"
              :class="activeTab === 'delivered' ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500'"
              class="px-2 py-0.5 text-xs rounded-full font-medium">
          {{ store.deliveredMeta.total }}
        </span>
      </button>
    </div>

    <!-- ── Tab 1: Kanban ────────────────────────────────────────────────────── -->
    <template v-if="activeTab === 'active'">

      <!-- Filtros -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div class="flex flex-wrap items-end gap-4">
          <div class="flex flex-col gap-1 min-w-64">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Rango de fechas</label>
            <VueDatePicker
              v-model="kanbanDateRange"
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
          <div class="flex flex-col gap-1 min-w-44">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Estado</label>
            <select
              :value="store.filters.status"
              @change="store.setFilters({ status: $event.target.value })"
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">Todos los estados</option>
              <option v-for="[key, meta] in kanbanStatusOptions" :key="key" :value="key">
                {{ meta.label }}
              </option>
            </select>
          </div>
          <div class="flex gap-2">
            <button @click="applyFilters" class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors">
              Filtrar
            </button>
            <button @click="resetFilters" class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="store.error" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        {{ store.error }}
      </div>

      <!-- Kanban -->
      <div v-if="!store.loading || store.orders.length" class="relative flex-1 flex flex-col min-h-0">
        <div
          v-if="store.loading && store.orders.length"
          class="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-xl backdrop-blur-sm"
        >
          <div class="flex flex-col items-center gap-3">
            <svg class="h-8 w-8 animate-spin text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p class="text-sm font-medium text-brand-700">Buscando…</p>
          </div>
        </div>

        <div class="flex gap-4 overflow-x-auto flex-1 pb-2">
          <div
            v-for="status in store.visibleStatuses"
            :key="status"
            class="flex-shrink-0 w-72 flex flex-col gap-3"
          >
            <div class="flex items-center gap-2 px-1">
              <span :class="['w-2.5 h-2.5 rounded-full shrink-0', COLOR_HEADER[STATUS_META[status]?.color]]" />
              <h2 class="font-semibold text-gray-700 text-sm">{{ STATUS_META[status]?.label }}</h2>
              <span class="ml-auto text-xs font-medium bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                {{ store.ordersByStatus[status]?.length ?? 0 }}
              </span>
            </div>
            <div class="flex flex-col gap-3 flex-1">
              <ServiceOrderCard
                v-for="order in store.ordersByStatus[status]"
                :key="order.id"
                :order="order"
                @view="openModal"
              />
              <div
                v-if="!store.ordersByStatus[status]?.length"
                class="flex-1 flex items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-xl"
              >
                <p class="text-sm text-gray-400">Sin órdenes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Skeleton primera carga -->
      <div v-else class="flex gap-4 overflow-x-auto flex-1 pb-2">
        <div v-for="n in 5" :key="n" class="flex-shrink-0 w-72 flex flex-col gap-3">
          <div class="h-5 bg-gray-200 rounded-full w-32 animate-pulse" />
          <div v-for="k in 2" :key="k" class="bg-white rounded-xl border border-gray-100 p-4 h-40 animate-pulse" />
        </div>
      </div>

    </template>

    <!-- ── Tab 2: Entregados ─────────────────────────────────────────────────── -->
    <template v-else>

      <!-- Filtros -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div class="flex flex-wrap items-end gap-4">
          <div class="flex flex-col gap-1 min-w-64">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Fecha de entrega</label>
            <VueDatePicker
              v-model="deliveredDateRange"
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
          <div class="flex flex-col gap-1 min-w-44">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Cliente</label>
            <input
              type="text"
              placeholder="Nombre del cliente"
              :value="store.deliveredFilters.customer_name"
              @input="store.setDeliveredFilters({ customer_name: $event.target.value })"
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div class="flex flex-col gap-1 min-w-36">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Teléfono</label>
            <input
              type="text"
              placeholder="Número"
              :value="store.deliveredFilters.customer_phone"
              @input="store.setDeliveredFilters({ customer_phone: $event.target.value })"
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div class="flex flex-col gap-1 min-w-32">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Placa</label>
            <input
              type="text"
              placeholder="ABC-1234"
              :value="store.deliveredFilters.plate"
              @input="store.setDeliveredFilters({ plate: $event.target.value })"
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div class="flex gap-2">
            <button @click="applyDeliveredFilters" class="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors">
              Filtrar
            </button>
            <button @click="resetDeliveredFilters" class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="store.deliveredError" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        {{ store.deliveredError }}
      </div>

      <!-- Tabla -->
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">

        <!-- Overlay de carga -->
        <div
          v-if="store.deliveredLoading"
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
                <th class="px-4 py-3 font-semibold">#</th>
                <th class="px-4 py-3 font-semibold">Cliente</th>
                <th class="px-4 py-3 font-semibold">Vehículo</th>
                <th class="px-4 py-3 font-semibold">Tipo</th>
                <th class="px-4 py-3 font-semibold">Costo</th>
                <th class="px-4 py-3 font-semibold">Mecánicos</th>
                <th class="px-4 py-3 font-semibold">Entregado</th>
                <th class="px-4 py-3 font-semibold">Registrado</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">

              <!-- Estado vacío (carga inicial) -->
              <tr v-if="!store.deliveredLoading && store.deliveredOrders.length === 0">
                <td colspan="9" class="py-16 text-center text-sm text-gray-400">
                  No hay servicios entregados en el período seleccionado.
                </td>
              </tr>

              <!-- Skeleton primera carga -->
              <tr v-else-if="store.deliveredLoading && store.deliveredOrders.length === 0" v-for="n in 8" :key="n">
                <td v-for="c in 9" :key="c" class="px-4 py-3">
                  <div class="h-4 bg-gray-200 rounded animate-pulse" :style="{ width: c === 8 ? '60px' : '100%' }" />
                </td>
              </tr>

              <!-- Filas de datos -->
              <tr
                v-else
                v-for="order in store.deliveredOrders"
                :key="order.id"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-4 py-3 font-mono text-gray-500 text-xs">#{{ order.id }}</td>
                <td class="px-4 py-3 font-medium text-gray-800">
                  {{ order.vehicle?.customer?.first_name }} {{ order.vehicle?.customer?.last_name }}
                </td>
                <td class="px-4 py-3">
                  <VehicleDisplay v-if="order.vehicle" :vehicle="order.vehicle" />
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="order.service_type === 'installation'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-blue-100 text-blue-700'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  >
                    {{ serviceTypeLabel(order.service_type) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-800 font-medium tabular-nums">
                  {{ formatCost(order.labor_cost) }}
                </td>
                <td class="px-4 py-3 text-gray-600 max-w-[200px] truncate" :title="mechanicsNames(order)">
                  {{ mechanicsNames(order) }}
                </td>
                <td class="px-4 py-3 text-gray-800 whitespace-nowrap font-medium">
                  {{ formatDateTime(order.delivered_datetime) }}
                </td>
                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {{ formatDate(order.created_at) }}
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

        <!-- Paginación -->
        <div
          v-if="store.deliveredMeta.total > 0"
          class="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/60 shrink-0"
        >
          <!-- Contador -->
          <p class="text-xs text-gray-500">
            Mostrando
            <span class="font-medium text-gray-700">
              {{ (store.deliveredMeta.current_page - 1) * store.deliveredMeta.per_page + 1 }}–{{ Math.min(store.deliveredMeta.current_page * store.deliveredMeta.per_page, store.deliveredMeta.total) }}
            </span>
            de
            <span class="font-medium text-gray-700">{{ store.deliveredMeta.total }}</span>
            registros
          </p>

          <!-- Controles -->
          <div class="flex items-center gap-1">
            <!-- Anterior -->
            <button
              @click="goToPage(store.deliveredMeta.current_page - 1)"
              :disabled="store.deliveredMeta.current_page <= 1"
              class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Anterior
            </button>

            <!-- Números de página -->
            <template v-for="(page, i) in pageNumbers" :key="page">
              <span
                v-if="i > 0 && page - pageNumbers[i - 1] > 1"
                class="px-1 text-xs text-gray-400 select-none"
              >…</span>
              <button
                @click="goToPage(page)"
                :class="page === store.deliveredMeta.current_page
                  ? 'bg-brand-600 text-white font-semibold'
                  : 'text-gray-600 hover:bg-gray-100'"
                class="w-8 h-8 flex items-center justify-center text-xs rounded-lg transition-colors"
              >
                {{ page }}
              </button>
            </template>

            <!-- Siguiente -->
            <button
              @click="goToPage(store.deliveredMeta.current_page + 1)"
              :disabled="store.deliveredMeta.current_page >= store.deliveredMeta.last_page"
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
    </template>

  </div>

  <!-- Modal detalle/edición -->
  <ServiceOrderModal
    v-if="selectedOrder"
    :order="selectedOrder"
    @close="closeModal"
    @saved="onModalSaved"
  />

  <!-- Modal nuevo servicio -->
  <CreateServiceModal
    v-if="showCreateModal"
    @close="showCreateModal = false"
    @created="onServiceCreated"
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
