<script setup>
import { ref, computed, onMounted } from 'vue'
import { getBranches, createBranch, updateBranch } from '@/api/branches'
import { useBranchStore } from '@/stores/branch'

const branchStore = useBranchStore()

const branches = ref([])
const loading = ref(false)
const error = ref(null)

const showModal = ref(false)
const editingBranch = ref(null)
const saving = ref(false)
const saveError = ref(null)

const confirmToggleId = ref(null)
const toggling = ref(false)

const defaultForm = () => ({ name: '', address: '', phone: '' })
const form = ref(defaultForm())
const isEditing = computed(() => !!editingBranch.value)

async function fetchBranches() {
  loading.value = true
  error.value = null
  try {
    branches.value = await getBranches()
  } catch (e) {
    error.value = e.message ?? 'Error al cargar sucursales.'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingBranch.value = null
  form.value = defaultForm()
  saveError.value = null
  showModal.value = true
}

function openEdit(branch) {
  editingBranch.value = branch
  form.value = {
    name: branch.name,
    address: branch.address ?? '',
    phone: branch.phone ?? '',
  }
  saveError.value = null
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingBranch.value = null
}

async function submitForm() {
  saving.value = true
  saveError.value = null
  const payload = {
    name: form.value.name,
    address: form.value.address || null,
    phone: form.value.phone || null,
  }
  try {
    if (isEditing.value) {
      const updated = await updateBranch(editingBranch.value.id, payload)
      const idx = branches.value.findIndex(b => b.id === updated.id)
      if (idx !== -1) branches.value[idx] = updated
      syncBranchStore(updated)
    } else {
      const created = await createBranch(payload)
      branches.value.push(created)
      branchStore.branches.push(created)
    }
    closeModal()
  } catch (e) {
    saveError.value = e.message ?? 'Error al guardar.'
  } finally {
    saving.value = false
  }
}

async function executeToggleActive() {
  const branch = branches.value.find(b => b.id === confirmToggleId.value)
  if (!branch) return
  toggling.value = true
  try {
    const updated = await updateBranch(branch.id, { is_active: !branch.is_active })
    const idx = branches.value.findIndex(b => b.id === updated.id)
    if (idx !== -1) branches.value[idx] = updated
    syncBranchStore(updated)
  } catch (e) {
    error.value = e.message ?? 'Error al cambiar estado.'
  } finally {
    toggling.value = false
    confirmToggleId.value = null
  }
}

function syncBranchStore(updated) {
  const idx = branchStore.branches.findIndex(b => b.id === updated.id)
  if (idx !== -1) branchStore.branches[idx] = { ...branchStore.branches[idx], ...updated }
}

onMounted(fetchBranches)
</script>

<template>
  <div class="flex flex-col gap-5">

    <!-- Título -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gestión de sucursales</h1>
        <p class="text-sm text-gray-500">Administra las sucursales del taller</p>
      </div>
      <button
        @click="openCreate"
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nueva sucursal
      </button>
    </div>

    <!-- Error global -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

      <!-- Skeleton -->
      <div v-if="loading && !branches.length" class="divide-y divide-gray-100">
        <div v-for="n in 4" :key="n" class="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div class="h-9 w-9 rounded-lg bg-gray-200 shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-3.5 bg-gray-200 rounded-full w-36" />
            <div class="h-3 bg-gray-100 rounded-full w-48" />
          </div>
          <div class="h-5 bg-gray-200 rounded-full w-16" />
        </div>
      </div>

      <!-- Sin sucursales -->
      <div
        v-else-if="!loading && !branches.length"
        class="flex flex-col items-center justify-center py-16 text-gray-400 gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p class="text-sm">No hay sucursales registradas</p>
      </div>

      <!-- Listado -->
      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="branch in branches"
          :key="branch.id"
          class="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <!-- Ícono -->
          <div class="h-9 w-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ branch.name }}</p>
            <p class="text-xs text-gray-500 truncate">
              <span v-if="branch.address">{{ branch.address }}</span>
              <span v-if="branch.address && branch.phone"> · </span>
              <span v-if="branch.phone">{{ branch.phone }}</span>
              <span v-if="!branch.address && !branch.phone" class="italic">Sin dirección ni teléfono</span>
            </p>
          </div>

          <!-- Estado -->
          <span
            :class="[
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              branch.is_active
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-500',
            ]"
          >
            {{ branch.is_active ? 'Activa' : 'Inactiva' }}
          </span>

          <!-- Acciones -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="openEdit(branch)"
              class="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
              title="Editar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
              </svg>
            </button>
            <button
              @click="confirmToggleId = branch.id"
              :title="branch.is_active ? 'Desactivar' : 'Activar'"
              :class="[
                'p-1.5 rounded-lg transition-colors',
                branch.is_active
                  ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                  : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50',
              ]"
            >
              <svg v-if="branch.is_active" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728A9 9 0 015.636 5.636" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal crear / editar -->
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md">

        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 class="text-base font-semibold text-gray-900">
            {{ isEditing ? 'Editar sucursal' : 'Nueva sucursal' }}
          </h2>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="submitForm" class="px-6 py-5 flex flex-col gap-4">

          <div v-if="saveError" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {{ saveError }}
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Nombre</label>
            <input v-model="form.name" type="text" required placeholder="Sucursal Centro"
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Dirección <span class="normal-case font-normal text-gray-300">(opcional)</span>
            </label>
            <input v-model="form.address" type="text" placeholder="Av. Hidalgo 123, Col. Centro"
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Teléfono <span class="normal-case font-normal text-gray-300">(opcional)</span>
            </label>
            <input v-model="form.phone" type="text" placeholder="6141234567"
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          <div class="flex justify-end gap-3 pt-1">
            <button type="button" @click="closeModal"
              class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" :disabled="saving"
              class="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors disabled:opacity-60">
              <svg v-if="saving" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              {{ isEditing ? 'Guardar cambios' : 'Crear sucursal' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- Confirmación activar/desactivar -->
  <Teleport to="body">
    <div
      v-if="confirmToggleId"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h3 class="text-base font-semibold text-gray-900">
            {{ branches.find(b => b.id === confirmToggleId)?.is_active ? 'Desactivar sucursal' : 'Activar sucursal' }}
          </h3>
          <p class="text-sm text-gray-500">
            {{
              branches.find(b => b.id === confirmToggleId)?.is_active
                ? 'La sucursal quedará inactiva y los usuarios no podrán seleccionarla. ¿Confirmas?'
                : '¿Confirmas que deseas volver a activar esta sucursal?'
            }}
          </p>
        </div>
        <div class="flex justify-end gap-3">
          <button
            @click="confirmToggleId = null"
            :disabled="toggling"
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            @click="executeToggleActive"
            :disabled="toggling"
            :class="[
              'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-60',
              branches.find(b => b.id === confirmToggleId)?.is_active
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-emerald-600 hover:bg-emerald-700',
            ]"
          >
            <svg v-if="toggling" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {{ branches.find(b => b.id === confirmToggleId)?.is_active ? 'Desactivar' : 'Activar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
