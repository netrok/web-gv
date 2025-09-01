import { Outlet } from 'react-router-dom'
import AppLayout from '@/components/Layout/AppLayout'

export default function App() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
