<script setup>
import { ref, computed, onMounted } from 'vue'
import { useServicesStore } from '@/stores/services'
import { STATUS_META } from '@/stores/serviceOrders'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { es } from 'date-fns/locale'
import ServiceOrderModal from '@/components/dashboard/ServiceOrderModal.vue'

const store = useServicesStore()
const selectedOrder = ref(null)

function openModal(order) {
  selectedOrder.value = order
}

function closeModal() {
  selectedOrder.value = null
}

function onModalSaved() {
  selectedOrder.value = null
  store.fetchOrders(store.meta.current_page)
}

// Bridges the picker's [Date, Date] format to store's date_from / date_to strings
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
  },
})

function applyFilters() {
  store.fetchOrders(1)
}

function clearFilters() {
  store.resetFilters()
  store.fetchOrders(1)
}

function goToPage(page) {
  if (page < 1 || page > store.meta.last_page) return
  store.fetchOrders(page)
}

// ── Formatters ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatCost(amount) {
  return `$${parseFloat(amount || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
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
  cancelled:        'bg-red-100 text-red-600',
}

const hasFilters = computed(() =>
  store.filters.date_from ||
  store.filters.date_to ||
  store.filters.status ||
  store.filters.customer_name ||
  store.filters.customer_phone ||
  store.filters.plate,
)

const pageNumbers = computed(() => {
  const { current_page, last_page } = store.meta
  if (last_page <= 7) return Array.from({ length: last_page }, (_, i) => i + 1)
  const around = [current_page - 1, current_page, current_page + 1]
  const pages  = [...new Set([1, 2, ...around, last_page - 1, last_page])]
  return pages.filter((p) => p >= 1 && p <= last_page).sort((a, b) => a - b)
})

onMounted(() => {
  store.fetchOrders(1)
})
</script>

<template>
  <div class="flex flex-col h-full gap-5">

    <!-- Título -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Servicios</h1>
      <p class="text-sm text-gray-500">Listado general de órdenes de servicio de la sucursal activa</p>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div class="flex flex-wrap items-end gap-4">

        <!-- Rango de fechas -->
        <div class="flex flex-col gap-1 min-w-64">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Fecha de registro</label>
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

        <!-- Estado -->
        <div class="flex flex-col gap-1 min-w-44">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Estado</label>
          <select
            :value="store.filters.status"
            @change="store.setFilters({ status: $event.target.value })"
            class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value="">Todos los estados</option>
            <option v-for="[key, meta] in Object.entries(STATUS_META)" :key="key" :value="key">
              {{ meta.label }}
            </option>
          </select>
        </div>

        <!-- Cliente -->
        <div class="flex flex-col gap-1 min-w-44">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Cliente</label>
          <input
            type="text"
            :value="store.filters.customer_name"
            @input="store.setFilters({ customer_name: $event.target.value })"
            @keyup.enter="applyFilters"
            placeholder="Nombre del cliente..."
            class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <!-- Teléfono -->
        <div class="flex flex-col gap-1 min-w-36">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Teléfono</label>
          <input
            type="text"
            :value="store.filters.customer_phone"
            @input="store.setFilters({ customer_phone: $event.target.value })"
            @keyup.enter="applyFilters"
            placeholder="Teléfono..."
            class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <!-- Placa -->
        <div class="flex flex-col gap-1 min-w-32">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Placa</label>
          <input
            type="text"
            :value="store.filters.plate"
            @input="store.setFilters({ plate: $event.target.value })"
            @keyup.enter="applyFilters"
            placeholder="Placa..."
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

    <!-- Error -->
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
              <th class="px-4 py-3 font-semibold">#</th>
              <th class="px-4 py-3 font-semibold">Cliente</th>
              <th class="px-4 py-3 font-semibold">Vehículo</th>
              <th class="px-4 py-3 font-semibold">Placa</th>
              <th class="px-4 py-3 font-semibold">Tipo</th>
              <th class="px-4 py-3 font-semibold">Estado</th>
              <th class="px-4 py-3 font-semibold">Costo</th>
              <th class="px-4 py-3 font-semibold">Registrado</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">

            <!-- Estado vacío -->
            <tr v-if="!store.loading && store.orders.length === 0">
              <td colspan="9" class="py-16 text-center text-sm text-gray-400">
                No se encontraron órdenes de servicio.
              </td>
            </tr>

            <!-- Skeleton primera carga -->
            <tr v-else-if="store.loading && store.orders.length === 0" v-for="n in 8" :key="n">
              <td v-for="c in 9" :key="c" class="px-4 py-3">
                <div class="h-4 bg-gray-200 rounded animate-pulse" :style="{ width: c === 9 ? '60px' : '100%' }" />
              </td>
            </tr>

            <!-- Filas de datos -->
            <tr
              v-else
              v-for="order in store.orders"
              :key="order.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-4 py-3 font-mono text-gray-500 text-xs whitespace-nowrap">#{{ order.id }}</td>

              <td class="px-4 py-3 font-medium text-gray-800">
                {{ order.vehicle?.customer?.first_name }} {{ order.vehicle?.customer?.last_name }}
                <div class="text-xs text-gray-400 font-normal">{{ order.vehicle?.customer?.phone_number }}</div>
              </td>

              <td class="px-4 py-3 text-gray-700">
                {{ order.vehicle?.vehicle_catalog?.brand }}
                {{ order.vehicle?.vehicle_catalog?.model }}
                {{ order.vehicle?.vehicle_catalog?.year }}
                <span v-if="order.vehicle?.vehicle_catalog?.motor_cc" class="text-gray-400 text-xs ml-0.5">{{ order.vehicle.vehicle_catalog.motor_cc }}cc</span>
                <span class="text-gray-400 text-xs ml-1">· {{ order.vehicle?.color }}</span>
              </td>

              <td class="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                {{ order.vehicle?.plate || '—' }}
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
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                >
                  {{ statusLabel(order.status) }}
                </span>
              </td>

              <td class="px-4 py-3 text-gray-800 font-medium tabular-nums whitespace-nowrap">
                {{ formatCost(order.labor_cost) }}
              </td>

              <td class="px-4 py-3 text-gray-500 whitespace-nowrap">
                {{ formatDate(order.created_at) }}
              </td>

              <td class="px-4 py-3 text-right">
                <button
                  @click="openModal(order)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg transition-colors whitespace-nowrap"
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
        v-if="store.meta.total > 0"
        class="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/60 shrink-0"
      >
        <!-- Contador -->
        <p class="text-xs text-gray-500">
          Mostrando
          <span class="font-medium text-gray-700">
            {{ (store.meta.current_page - 1) * store.meta.per_page + 1 }}–{{ Math.min(store.meta.current_page * store.meta.per_page, store.meta.total) }}
          </span>
          de
          <span class="font-medium text-gray-700">{{ store.meta.total }}</span>
          registros
        </p>

        <!-- Controles -->
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

  <!-- Modal detalle -->
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
