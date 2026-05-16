<script setup>
import { computed } from 'vue'
import { STATUS_META } from '@/stores/serviceOrders'
import VehicleDisplay from '@/components/ui/VehicleDisplay.vue'

const props = defineProps({
  order: { type: Object, required: true },
})

const emit = defineEmits(['view'])

const customer = computed(() => props.order.vehicle?.customer)

const mechanicNames = computed(() =>
  props.order.mechanics?.map((m) => m.mechanic?.name).filter(Boolean) ?? [],
)

const serviceTypeLabel = computed(() =>
  props.order.service_type === 'repair' ? 'Reparación' : 'Instalación',
)

const formattedDate = computed(() =>
  new Date(props.order.created_at).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }),
)

const elapsed = computed(() => {
  const ms   = Date.now() - new Date(props.order.created_at).getTime()
  const days = Math.floor(ms / 86400000)
  const hrs  = Math.floor((ms % 86400000) / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  if (days > 0) return `${days}d ${hrs}h`
  if (hrs > 0)  return `${hrs}h ${mins}m`
  return `${mins}m`
})

const COLOR_CLASSES = {
  blue:    { badge: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500' },
  amber:   { badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
  emerald: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  red:     { badge: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  violet:  { badge: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500' },
  teal:    { badge: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500' },
  gray:    { badge: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400' },
}

const meta   = computed(() => STATUS_META[props.order.status] ?? { label: props.order.status, color: 'blue' })
const colors = computed(() => COLOR_CLASSES[meta.value.color] ?? COLOR_CLASSES.blue)
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">

    <!-- Header: vehicle + status badge -->
    <div class="flex items-start justify-between gap-2">
      <VehicleDisplay :vehicle="order.vehicle" />
      <span
        :class="['inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full shrink-0', colors.badge]"
      >
        <span :class="['w-1.5 h-1.5 rounded-full', colors.dot]" />
        {{ meta.label }}
      </span>
    </div>

    <!-- Cliente -->
    <p class="text-xs text-gray-600">
      <span class="text-gray-500">Cliente:</span>
      {{ customer?.first_name }} {{ customer?.last_name }}
    </p>

    <!-- Mecánicos -->
    <div class="flex flex-wrap gap-1">
      <template v-if="mechanicNames.length">
        <span
          v-for="name in mechanicNames"
          :key="name"
          class="inline-block text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5"
        >
          {{ name }}
        </span>
      </template>
      <span v-else class="text-xs text-gray-500 italic">Sin mecánico</span>
    </div>

    <!-- Tipo de servicio + tiempo -->
    <div class="flex items-center justify-between text-xs text-gray-500">
      <span class="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 font-medium text-gray-700">
        {{ serviceTypeLabel }}
      </span>
      <div class="text-right">
        <p class="text-gray-500">{{ formattedDate }}</p>
        <p class="font-semibold text-gray-700">{{ elapsed }}</p>
      </div>
    </div>

    <!-- Acción -->
    <button
      @click="emit('view', order)"
      class="w-full text-sm text-brand-600 hover:text-brand-800 font-medium py-2 border border-brand-300 hover:border-brand-500 rounded-lg transition-colors"
    >
      Ver detalles
    </button>
  </div>
</template>
