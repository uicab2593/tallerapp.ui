<script setup>
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBranchStore } from '@/stores/branch'

const auth = useAuthStore()
const branchStore = useBranchStore()
const router = useRouter()
const sidebarOpen = ref(false)
const branchMenuOpen = ref(false)
const switchingBranch = ref(false)

const allNavItems = [
  {
    label: 'Dashboard',
    to: { name: 'dashboard' },
    roles: null,
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>`,
  },
  {
    label: 'Usuarios',
    to: { name: 'users' },
    roles: ['master', 'admin'],
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 13v-2a4 4 0 00-3-3.87" />
    </svg>`,
  },
  {
    label: 'Sucursales',
    to: { name: 'branches' },
    roles: ['master'],
    icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>`,
  },
  // Los módulos se agregan aquí como nuevos objetos { label, to, roles, icon }
]

const navItems = computed(() =>
  allNavItems.filter(item => !item.roles || item.roles.includes(auth.user?.rol))
)

const canSwitchBranch = computed(() => branchStore.branches.length > 1)

async function handleSwitchBranch(branchId) {
  if (branchId === branchStore.activeBranch?.id || switchingBranch.value) return
  switchingBranch.value = true
  branchMenuOpen.value = false
  await branchStore.switchBranch(branchId)
  window.location.reload()
}

async function handleLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="flex h-screen bg-gray-100 overflow-hidden">

    <!-- Overlay móvil -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-20 bg-black/40 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-gray-900 text-white transition-transform duration-300 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <!-- Logo / Nombre de la app -->
      <div class="flex items-center gap-3 px-5 py-5 border-b border-gray-700">
        <div class="bg-indigo-600 rounded-lg p-2 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p class="font-bold text-sm leading-tight">Taller Motos</p>
          <p class="text-gray-400 text-xs">Panel de gestión</p>
        </div>
      </div>

      <!-- Navegación -->
      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          @click="sidebarOpen = false"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          exact-active-class="bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <span class="shrink-0" v-html="item.icon" />
          {{ item.label }}
        </RouterLink>
      </nav>

    </aside>

    <!-- Contenido principal -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">

      <!-- Header -->
      <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">

        <!-- Botón hamburguesa (móvil) -->
        <button
          class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          @click="sidebarOpen = !sidebarOpen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <!-- Selector de sucursal -->
        <div class="relative ml-3 lg:ml-0" v-if="branchStore.activeBranch">
          <button
            @click="branchMenuOpen = !branchMenuOpen"
            :disabled="!canSwitchBranch || switchingBranch"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-default"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="max-w-[160px] truncate">{{ branchStore.activeBranch.name }}</span>
            <svg
              v-if="canSwitchBranch"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-gray-400 shrink-0 transition-transform"
              :class="{ 'rotate-180': branchMenuOpen }"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Dropdown de sucursales -->
          <div
            v-if="branchMenuOpen && canSwitchBranch"
            class="absolute left-0 top-full mt-1 z-50 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1"
            @click.outside="branchMenuOpen = false"
          >
            <button
              v-for="branch in branchStore.branches"
              :key="branch.id"
              @click="handleSwitchBranch(branch.id)"
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
              :class="branch.id === branchStore.activeBranch?.id ? 'text-indigo-600 font-medium' : 'text-gray-700'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" :class="branch.id === branchStore.activeBranch?.id ? 'text-indigo-500' : 'text-transparent'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {{ branch.name }}
            </button>
          </div>
        </div>

        <div class="flex-1" />

        <!-- Acciones del header -->
        <div class="flex items-center gap-4">
          <div class="hidden sm:block text-right">
            <p class="text-sm font-medium text-gray-800 leading-tight">{{ auth.user?.name }}</p>
            <p class="text-xs text-gray-500 capitalize">{{ auth.user?.rol }}</p>
          </div>
          <button
            @click="handleLogout"
            class="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span class="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <!-- Vista activa -->
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>

    </div>
  </div>
</template>
