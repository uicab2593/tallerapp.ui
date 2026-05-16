<script setup>
defineProps({
  vehicle: { type: Object, required: true },
})
</script>

<template>
  <div>
    <p class="font-semibold text-gray-900 text-sm leading-tight">
      {{ vehicle.vehicle_catalog?.brand }} {{ vehicle.vehicle_catalog?.model }}
    </p>
    <p class="text-xs text-gray-500 mt-0.5">
      {{ vehicle.vehicle_catalog?.motor_cc ? `${vehicle.vehicle_catalog.motor_cc}cc` : '?' }}
      · {{ vehicle.vehicle_catalog?.color ?? '?' }}
      · {{ vehicle.vehicle_catalog?.year }}
    </p>
    <p class="text-xs text-gray-500">
      {{ vehicle.plate ?? '?' }} - {{ vehicle.color ?? '?' }}
    </p>
  </div>
</template>
