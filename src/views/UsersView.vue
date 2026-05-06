<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUsersStore } from '@/stores/users'
import { useBranchStore } from '@/stores/branch'

const store = useUsersStore()
const branchStore = useBranchStore()

const showModal = ref(false)
const editingUser = ref(null)
const confirmDeleteId = ref(null)
const saving = ref(false)
const saveError = ref(null)

const branchUser = ref(null)
const branchTogglingId = ref(null)
const branchError = ref(null)

const ROLES = [
  { value: 'master', label: 'Master' },
  { value: 'admin', label: 'Administrador' },
  { value: 'seller', label: 'Vendedor' },
  { value: 'mechanic', label: 'Mecánico' },
]

const ROL_BADGE = {
  master:   'bg-purple-100 text-purple-700',
  admin:    'bg-blue-100 text-blue-700',
  seller:   'bg-emerald-100 text-emerald-700',
  mechanic: 'bg-amber-100 text-amber-700',
}

const defaultForm = () => ({
  name: '',
  phone: '',
  email: '',
  password: '',
  rol: 'seller',
  commission_percentage: '',
})

const form = ref(defaultForm())
const isEditing = computed(() => !!editingUser.value)

function openCreate() {
  editingUser.value = null
  form.value = defaultForm()
  saveError.value = null
  showModal.value = true
}

function openEdit(user) {
  editingUser.value = user
  form.value = {
    name: user.name,
    phone: user.phone_number,
    email: user.email ?? '',
    password: '',
    rol: user.rol,
    commission_percentage: user.commission_percentage ?? '',
  }
  saveError.value = null
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingUser.value = null
}

async function submitForm() {
  saving.value = true
  saveError.value = null

  const payload = {
    name: form.value.name,
    phone: form.value.phone,
    email: form.value.email || null,
    rol: form.value.rol,
    commission_percentage: form.value.rol === 'mechanic'
      ? (parseFloat(form.value.commission_percentage) || 0)
      : 0,
  }

  if (!isEditing.value || form.value.password) {
    payload.password = form.value.password
  }

  try {
    if (isEditing.value) {
      await store.editUser(editingUser.value.id, payload)
    } else {
      await store.addUser(payload)
    }
    closeModal()
  } catch (e) {
    saveError.value = e.message ?? 'Error al guardar.'
  } finally {
    saving.value = false
  }
}

async function confirmDelete(id) {
  confirmDeleteId.value = id
}

async function executeDelete() {
  try {
    await store.removeUser(confirmDeleteId.value)
  } catch (e) {
    store.error = e.message ?? 'Error al eliminar.'
  } finally {
    confirmDeleteId.value = null
  }
}

function openBranchModal(user) {
  branchUser.value = user
  branchError.value = null
}

function closeBranchModal() {
  branchUser.value = null
  branchError.value = null
}

function userHasBranch(branchId) {
  return branchUser.value?.branch_ids?.includes(branchId)
}

async function toggleBranch(branchId) {
  if (branchTogglingId.value) return
  branchTogglingId.value = branchId
  branchError.value = null
  try {
    const assign = !userHasBranch(branchId)
    await store.toggleUserBranch(branchUser.value.id, branchId, assign)
  } catch (e) {
    branchError.value = e.message ?? 'Error al actualizar sucursales.'
  } finally {
    branchTogglingId.value = null
  }
}

onMounted(() => store.fetchUsers())
</script>

<template>
  <div class="flex flex-col gap-5">

    <!-- Título -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gestión de usuarios</h1>
        <p class="text-sm text-gray-500">Administra los accesos y roles del sistema</p>
      </div>
      <button
        @click="openCreate"
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo usuario
      </button>
    </div>

    <!-- Error global -->
    <div v-if="store.error" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      {{ store.error }}
    </div>

    <!-- Tabla -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

      <!-- Skeleton -->
      <div v-if="store.loading && !store.users.length" class="divide-y divide-gray-100">
        <div v-for="n in 5" :key="n" class="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div class="h-9 w-9 rounded-full bg-gray-200 shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-3.5 bg-gray-200 rounded-full w-40" />
            <div class="h-3 bg-gray-100 rounded-full w-28" />
          </div>
          <div class="h-5 bg-gray-200 rounded-full w-20" />
        </div>
      </div>

      <!-- Sin usuarios -->
      <div
        v-else-if="!store.loading && !store.users.length"
        class="flex flex-col items-center justify-center py-16 text-gray-400 gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 13v-2a4 4 0 00-3-3.87" />
        </svg>
        <p class="text-sm">No hay usuarios registrados</p>
      </div>

      <!-- Listado -->
      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="user in store.users"
          :key="user.id"
          class="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <!-- Avatar inicial -->
          <div class="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm shrink-0">
            {{ user.name.charAt(0).toUpperCase() }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ user.name }}</p>
            <p class="text-xs text-gray-500">
              {{ user.phone_e164 }}
              <span v-if="user.email"> · {{ user.email }}</span>
            </p>
          </div>

          <!-- % comisión -->
          <div v-if="user.rol === 'mechanic'" class="hidden sm:block text-xs text-gray-500 w-24 text-right">
            {{ user.commission_percentage }}% comisión
          </div>

          <!-- Rol -->
          <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', ROL_BADGE[user.rol]]">
            {{ ROLES.find(r => r.value === user.rol)?.label ?? user.rol }}
          </span>

          <!-- Acciones -->
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              @click="openBranchModal(user)"
              class="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
              title="Asignar sucursales"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              @click="openEdit(user)"
              class="p-1.5 rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
              title="Editar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
              </svg>
            </button>
            <button
              @click="confirmDelete(user.id)"
              class="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              title="Eliminar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M4 7h16" />
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
            {{ isEditing ? 'Editar usuario' : 'Nuevo usuario' }}
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
            <input v-model="form.name" type="text" required placeholder="Juan Pérez"
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Teléfono</label>
            <input v-model="form.phone" type="text" required placeholder="6141234567"
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Correo <span class="normal-case font-normal text-gray-300">(opcional)</span></label>
            <input v-model="form.email" type="email" placeholder="correo@ejemplo.com"
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Contraseña
              <span v-if="isEditing" class="normal-case font-normal text-gray-300">(dejar vacío para no cambiar)</span>
            </label>
            <input v-model="form.password" type="password" :required="!isEditing" placeholder="••••••"
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Rol</label>
            <select v-model="form.rol" required
              class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400">
              <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>

          <div v-if="form.rol === 'mechanic'" class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-gray-400">Comisión (%)</label>
            <input v-model="form.commission_percentage" type="number" min="0" max="100" step="0.01" placeholder="0.00"
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
              {{ isEditing ? 'Guardar cambios' : 'Crear usuario' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- Modal asignar sucursales -->
  <Teleport to="body">
    <div
      v-if="branchUser"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      @click.self="closeBranchModal"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm">

        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 class="text-base font-semibold text-gray-900">Sucursales</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ branchUser.name }}</p>
          </div>
          <button @click="closeBranchModal" class="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="px-6 py-4 flex flex-col gap-1">

          <div v-if="branchError" class="mb-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {{ branchError }}
          </div>

          <button
            v-for="branch in branchStore.branches"
            :key="branch.id"
            type="button"
            :disabled="branchTogglingId !== null"
            @click="toggleBranch(branch.id)"
            :class="[
              'flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-colors select-none text-left',
              branchTogglingId === branch.id ? 'opacity-50 cursor-wait' : 'hover:bg-gray-50',
            ]"
          >
            <span
              :class="[
                'w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-colors',
                userHasBranch(branch.id)
                  ? 'bg-brand-600 border-brand-600'
                  : 'border-gray-300 bg-white',
              ]"
            >
              <svg v-if="userHasBranch(branch.id)" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <svg v-else-if="branchTogglingId === branch.id" class="h-3 w-3 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </span>
            <span class="text-sm text-gray-800">{{ branch.name }}</span>
          </button>

          <p v-if="!branchStore.branches.length" class="text-sm text-gray-400 text-center py-4">
            No hay sucursales registradas.
          </p>
        </div>

        <div class="px-6 pb-5">
          <button
            @click="closeBranchModal"
            class="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Confirmación eliminar -->
  <Teleport to="body">
    <div
      v-if="confirmDeleteId"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h3 class="text-base font-semibold text-gray-900">Eliminar usuario</h3>
          <p class="text-sm text-gray-500">Esta acción no se puede deshacer. ¿Confirmas que deseas eliminar este usuario?</p>
        </div>
        <div class="flex justify-end gap-3">
          <button @click="confirmDeleteId = null"
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Cancelar
          </button>
          <button @click="executeDelete"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
