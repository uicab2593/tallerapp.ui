<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const phone = ref('')
const password = ref('')
const error = ref(null)
const loading = ref(false)

async function handleLogin() {
  error.value = null
  loading.value = true
  try {
    await auth.login(phone.value, password.value)
    router.push({ name: 'dashboard' })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-md w-full max-w-sm p-8">

      <h1 class="text-2xl font-bold text-gray-800 mb-1">Refaccionaria Stradas</h1>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <div>
          <label for="telefono" class="block text-sm font-medium text-gray-700 mb-1.5">
            Teléfono
          </label>
          <input
            id="telefono"
            v-model="phone"
            type="tel"
            autocomplete="username"
            required
            placeholder="Ej. 04141234567"
            class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900
                   placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">
            Contraseña
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900
                   placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {{ error }}
        </div>

        <div class="pt-2">
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                   text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            {{ loading ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </div>
      </form>

    </div>
  </main>
</template>
