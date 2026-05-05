import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('../views/DashboardView.vue'),
        },
        {
          path: 'usuarios',
          name: 'users',
          component: () => import('../views/UsersView.vue'),
          meta: { requiresRoles: ['master', 'admin'] },
        },
        {
          path: 'sucursales',
          name: 'branches',
          component: () => import('../views/BranchesView.vue'),
          meta: { requiresRoles: ['master'] },
        },
        // Los módulos se agregan aquí como rutas hijas
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Rehidratar usuario tras un page refresh (token en localStorage, user en null)
  if (auth.isAuthenticated && !auth.user) {
    try {
      await auth.fetchUser()
    } catch {
      await auth.logout()
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.requiresGuest && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (to.meta.requiresRoles && !to.meta.requiresRoles.includes(auth.user?.rol)) {
    return { name: 'dashboard' }
  }
})

export default router
