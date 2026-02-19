import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { ToastContainer } from '@/components/ui/toast-container'
import { useTouchBarSync } from '@/hooks/useTouchBarSync'

export function AppLayout() {
  useTouchBarSync()

  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar />
      <main className="ml-60 p-6">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  )
}
