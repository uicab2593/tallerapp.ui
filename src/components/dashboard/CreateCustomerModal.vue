<script setup>
import { ref, watch } from 'vue'
import { customersApi } from '@/api/customers'

const props = defineProps({
  customer:     { type: Object, default: null }, // null = create, object = edit
  prefillPhone: { type: String, default: '' },
})

const emit = defineEmits(['saved', 'close'])

const saving = ref(false)
const error  = ref(null)

const form = ref({ first_name: '', last_name: '', phone: '', email: '' })

watch(
  () => props.customer,
  (c) => {
    if (c) {
      form.value = {
        first_name: c.first_name,
        last_name:  c.last_name,
        phone:      c.phone_number,
        email:      c.email ?? '',
      }
    } else {
      form.value = { first_name: '', last_name: '', phone: props.prefillPhone, email: '' }
    }
  },
  { immediate: true },
)

async function save() {
  if (!form.value.first_name || !form.value.last_name || !form.value.phone) return
  saving.value = true
  error.value  = null
  try {
    let res
    if (props.customer) {
      res = await customersApi.update(props.customer.id, form.value)
    } else {
      res = await customersApi.create(form.value)
    }
    emit('saved', res.data)
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 class="text-base font-bold text-gray-900">
            {{ customer ? 'Editar cliente' : 'Nuevo cliente' }}
          </h2>
          <button
            @click="emit('close')"
            class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form -->
        <div class="px-6 py-6 space-y-5">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Nombre</label>
              <input
                v-model="form.first_name"
                type="text"
                placeholder="Juan"
                class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Apellido</label>
              <input
                v-model="form.last_name"
                type="text"
                placeholder="García"
                class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Teléfono (10 dígitos)</label>
            <input
              v-model="form.phone"
              type="tel"
              placeholder="6141234567"
              maxlength="10"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
              Correo electrónico <span class="text-gray-400 font-normal normal-case">(opcional)</span>
            </label>
            <input
              v-model="form.email"
              type="email"
              placeholder="juan@email.com"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{{ error }}</p>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            @click="emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            @click="save"
            :disabled="saving || !form.first_name || !form.last_name || !form.phone"
            class="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl transition-colors"
          >
            {{ saving ? 'Guardando…' : (customer ? 'Guardar cambios' : 'Registrar cliente') }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>
