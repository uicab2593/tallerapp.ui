<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios'

const status = ref(null)
const loading = ref(false)
const error = ref(null)

async function fetchStatus() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/status')
    status.value = data
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchStatus)
</script>

<template>
  <div class="max-w-md space-y-4">
    <h1 class="text-2xl font-bold text-gray-800">Inicio</h1>

    <!-- Estado de la API -->
    <div class="bg-white rounded-2xl shadow-sm p-6">
      <p class="text-gray-500 text-sm mb-4">
        Estado de la API en
        <code class="bg-gray-100 px-1 rounded">GET /api/v1/status</code>
      </p>

      <div v-if="loading" class="flex items-center gap-2 text-gray-500">
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Consultando API...
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
        <p class="font-semibold">Error</p>
        <p class="text-sm mt-1">{{ error }}</p>
      </div>

      <div v-else-if="status" class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
          <span class="font-medium text-green-700">{{ status.status }}</span>
        </div>
        <p class="text-gray-700">{{ status.message }}</p>
        <div class="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
          <p><span class="font-medium">Versión:</span> {{ status.version }}</p>
          <p><span class="font-medium">Timestamp:</span> {{ status.timestamp }}</p>
        </div>
      </div>

      <button
        @click="fetchStatus"
        :disabled="loading"
        class="mt-4 w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50
               text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Actualizar
      </button>
    </div>
  </div>
</template>
