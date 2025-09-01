import { createBrowserRouter } from 'react-router-dom'
import App from '@/App'
import ProtectedRoute from '@/routes/ProtectedRoute'
import RequireRole from '@/routes/RequireRole'
import type { Role } from '@/types/auth'

// 👇 lazy + Suspense y tipos desde react
import { lazy, Suspense, type ReactElement } from 'react'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const EmpleadosPage = lazy(() => import('@/features/empleados/EmpleadosPage'))

const ADMIN_ROLES: Role[] = ['SuperAdmin', 'Admin', 'RRHH']

const Fallback = <div style={{ padding: 24 }}>Cargando…</div>

// ⬅️ Cambia JSX.Element → ReactElement
function wrap(el: ReactElement) {
  return <Suspense fallback={Fallback}>{el}</Suspense>
}

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
          {
            element: <RequireRole roles={ADMIN_ROLES} />,
            children: [
              // rutas admin
            ],
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
