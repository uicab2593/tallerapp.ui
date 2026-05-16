<script setup>
defineProps({
  catalog: { type: Object, required: true },
})
</script>

<template>
  <span>
    <span class="font-semibold">{{ catalog.brand }}</span>
    {{ catalog.model }}
    <span class="text-gray-400 text-xs">
      {{ catalog.motor_cc ? `${catalog.motor_cc}cc` : '?' }}
      · {{ catalog.color ?? '?' }}
      · {{ catalog.year }}
    </span>
  </span>
</template>
