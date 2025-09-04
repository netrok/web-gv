// src/router.tsx
import { createBrowserRouter } from 'react-router-dom'
import App from '@/App'
import ProtectedRoute from '@/routes/ProtectedRoute'
import RequireRole from '@/routes/RequireRole'
import type { Role } from '@/types/auth'
import { lazy, Suspense, type ReactElement } from 'react'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const EmpleadosPage = lazy(() => import('@/features/empleados/EmpleadosPage'))
const EmpleadoDetailPage = lazy(() => import('@/features/empleados/EmpleadoDetailPage'))
const EmpleadoCreatePage = lazy(() => import('@/features/empleados/EmpleadoCreatePage'))
const EmpleadoEditPage = lazy(() => import('@/features/empleados/EmpleadoEditPage'))

const ADMIN_ROLES: Role[] = ['SuperAdmin', 'Admin', 'RRHH']
const Fallback = <div style={{ padding: 24 }}>Cargando…</div>
const wrap = (el: ReactElement) => <Suspense fallback={Fallback}>{el}</Suspense>

function NotFound() {
  return <div style={{ padding: 24 }}>Página no encontrada</div>
}

export const router = createBrowserRouter([
  { path: '/login', element: wrap(<LoginPage />) },
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: wrap(<DashboardPage />) },

      {
        element: <ProtectedRoute />,
        children: [
          { path: 'empleados', element: wrap(<EmpleadosPage />) },

          // ⚠️ rutas específicas primero
          { path: 'empleados/nuevo', element: wrap(<EmpleadoCreatePage />) },
          { path: 'empleados/:id/editar', element: wrap(<EmpleadoEditPage />) },

          // Detalle sin comodín
          { path: 'empleados/:id', element: wrap(<EmpleadoDetailPage />) },

          {
            element: <RequireRole roles={ADMIN_ROLES} />,
            children: [
              // rutas solo-admin aquí…
            ],
          },
        ],
      },

      { path: '*', element: <NotFound /> },
    ],
  },
])
