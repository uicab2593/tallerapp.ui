<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCustomersStore } from '@/stores/customers'
import CustomerDetailModal from '@/components/customers/CustomerDetailModal.vue'
import { formatPhone } from '@/utils/phone'

const store           = useCustomersStore()
const selectedCustomer = ref(null)

function openModal(customer) {
  selectedCustomer.value = customer
}

function closeModal() {
  selectedCustomer.value = null
}

function onModalSaved() {
  store.fetchCustomers(store.meta.current_page)
}

function applyFilters() {
  store.fetchCustomers(1)
}

function clearFilters() {
  store.resetFilters()
  store.fetchCustomers(1)
}

function goToPage(page) {
  if (page < 1 || page > store.meta.last_page) return
  store.fetchCustomers(page)
}

const hasFilters = computed(() =>
  store.filters.name ||
  store.filters.phone ||
  store.filters.email ||
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
  store.fetchCustomers(1)
})
</script>

<template>
  <div class="flex flex-col h-full gap-5">

    <!-- Título -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Clientes</h1>
      <p class="text-sm text-gray-500">Listado general de clientes registrados en el sistema</p>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div class="flex flex-wrap items-end gap-4">

        <!-- Nombre -->
        <div class="flex flex-col gap-1 min-w-44">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Nombre</label>
          <input
            type="text"
            :value="store.filters.name"
            @input="store.setFilters({ name: $event.target.value })"
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
            :value="store.filters.phone"
            @input="store.setFilters({ phone: $event.target.value })"
            @keyup.enter="applyFilters"
            placeholder="Teléfono..."
            class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <!-- Email -->
        <div class="flex flex-col gap-1 min-w-44">
          <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Email</label>
          <input
            type="text"
            :value="store.filters.email"
            @input="store.setFilters({ email: $event.target.value })"
            @keyup.enter="applyFilters"
            placeholder="Correo electrónico..."
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
              <th class="px-4 py-3 font-semibold">Nombre</th>
              <th class="px-4 py-3 font-semibold">Teléfono</th>
              <th class="px-4 py-3 font-semibold">Email</th>
              <th class="px-4 py-3 font-semibold">Vehículos</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">

            <!-- Estado vacío -->
            <tr v-if="!store.loading && store.customers.length === 0">
              <td colspan="6" class="py-16 text-center text-sm text-gray-400">
                No se encontraron clientes.
              </td>
            </tr>

            <!-- Skeleton primera carga -->
            <tr v-else-if="store.loading && store.customers.length === 0" v-for="n in 8" :key="n">
              <td v-for="c in 6" :key="c" class="px-4 py-3">
                <div class="h-4 bg-gray-200 rounded animate-pulse" :style="{ width: c === 6 ? '60px' : '100%' }" />
              </td>
            </tr>

            <!-- Filas de datos -->
            <tr
              v-else
              v-for="customer in store.customers"
              :key="customer.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-4 py-3 font-mono text-gray-500 text-xs whitespace-nowrap">#{{ customer.id }}</td>

              <td class="px-4 py-3 font-medium text-gray-800">
                {{ customer.first_name }} {{ customer.last_name }}
              </td>

              <td class="px-4 py-3 text-gray-600 tabular-nums whitespace-nowrap">
                {{ formatPhone(customer) }}
              </td>

              <td class="px-4 py-3 text-gray-600">
                {{ customer.email || '—' }}
              </td>

              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  {{ customer.vehicles_count }}
                </span>
              </td>

              <td class="px-4 py-3 text-right">
                <button
                  @click="openModal(customer)"
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

  <!-- Modal detalle -->
  <CustomerDetailModal
    v-if="selectedCustomer"
    :customer="selectedCustomer"
    @close="closeModal"
    @saved="onModalSaved"
  />

</template>
