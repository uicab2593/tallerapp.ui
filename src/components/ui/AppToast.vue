<script setup>
import { ref } from 'vue'

const visible = ref(false)
const message = ref('')
const type    = ref('success')

let timer = null

const TYPES = {
  success: {
    wrapper: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    icon:    'text-emerald-500',
    path:    'M5 13l4 4L19 7',
  },
  error: {
    wrapper: 'bg-red-50 border-red-200 text-red-800',
    icon:    'text-red-500',
    path:    'M6 18L18 6M6 6l12 12',
  },
  warning: {
    wrapper: 'bg-amber-50 border-amber-200 text-amber-800',
    icon:    'text-amber-500',
    path:    'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  },
}

function show(msg, t = 'success') {
  message.value = msg
  type.value    = t
  visible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { visible.value = false }, 3500)
}

function dismiss() {
  clearTimeout(timer)
  visible.value = false
}

defineExpose({ show })
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="visible"
        :class="[
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3',
          'min-w-64 max-w-sm px-4 py-3 rounded-xl border shadow-lg',
          TYPES[type].wrapper,
        ]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          :class="['h-5 w-5 shrink-0', TYPES[type].icon]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" :d="TYPES[type].path" />
        </svg>
        <p class="text-sm font-medium flex-1">{{ message }}</p>
        <button
          @click="dismiss"
          class="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
