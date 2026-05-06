<script setup>
import { ref, watch } from 'vue'
import { vehicleCatalogsApi } from '@/api/vehicleCatalogs'
import { MOTORCYCLE_BRANDS } from '@/constants/motorcycleBrands'

const props = defineProps({
  catalog: { type: Object, default: null }, // null = create, object = edit
})

const emit = defineEmits(['saved', 'close'])

const saving = ref(false)
const error  = ref(null)

const form = ref({ brand: '', model: '', year: new Date().getFullYear(), motor_cc: null })

watch(
  () => props.catalog,
  (c) => {
    if (c) {
      form.value = { brand: c.brand, model: c.model, year: c.year, motor_cc: c.motor_cc }
    } else {
      form.value = { brand: '', model: '', year: new Date().getFullYear(), motor_cc: null }
    }
  },
  { immediate: true },
)

async function save() {
  if (!form.value.brand || !form.value.model || !form.value.year || !form.value.motor_cc) return
  saving.value = true
  error.value  = null
  try {
    let res
    if (props.catalog) {
      res = await vehicleCatalogsApi.update(props.catalog.id, form.value)
    } else {
      res = await vehicleCatalogsApi.create(form.value)
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
      class="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 class="text-base font-bold text-gray-900">
            {{ catalog ? 'Editar modelo' : 'Nuevo modelo de moto' }}
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
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Marca</label>
            <select
              v-model="form.brand"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="" disabled>Selecciona una marca…</option>
              <option v-for="brand in MOTORCYCLE_BRANDS" :key="brand" :value="brand">
                {{ brand }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Modelo</label>
            <input
              v-model="form.model"
              type="text"
              placeholder="CB500, MT-07, Ninja 400…"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Año</label>
            <input
              v-model.number="form.year"
              type="number"
              :min="1900"
              :max="2100"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Motor (cc)</label>
            <input
              v-model.number="form.motor_cc"
              type="number"
              min="1"
              max="65535"
              placeholder="125, 150, 250…"
              class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
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
            :disabled="saving || !form.brand || !form.model || !form.year || !form.motor_cc"
            class="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-xl transition-colors"
          >
            {{ saving ? 'Guardando…' : (catalog ? 'Guardar cambios' : 'Registrar modelo') }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>
