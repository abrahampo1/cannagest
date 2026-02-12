import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { useSetupStore } from '@/store/setup.store'
import { AppLayout } from '@/components/layout/app-layout'
import { ToastContainer } from '@/components/ui/toast-container'
import { PageSpinner } from '@/components/ui/spinner'
import LoginPage from '@/pages/login'
import UnlockPage from '@/pages/unlock'
import DashboardPage from '@/pages/dashboard'
import MembersPage from '@/pages/members'
import MemberNewPage from '@/pages/member-new'
import MemberDetailPage from '@/pages/member-detail'
import ProductsPage from '@/pages/products'
import ProductNewPage from '@/pages/product-new'
import ProductDetailPage from '@/pages/product-detail'
import CategoriesPage from '@/pages/categories'
import SalesPage from '@/pages/sales'
import NewSalePage from '@/pages/new-sale'
import PointsPage from '@/pages/points'
import StockPage from '@/pages/stock'
import CashRegisterPage from '@/pages/cash-register'
import ExpensesPage from '@/pages/expenses'
import UsersPage from '@/pages/users'
import CloudBackupPage from '@/pages/cloud-backup'
import SettingsPage from '@/pages/settings'
import SetupWizardPage from '@/pages/setup'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const {
    isSetupComplete, checkSetupStatus,
    isUnlocked, checkUnlockStatus,
    hasMasterPassword, checkMasterPassword,
    setUnlocked,
  } = useSetupStore()

  useEffect(() => {
    checkSetupStatus()
  }, [])

  // Once we know setup is complete, check master password and unlock status
  useEffect(() => {
    if (isSetupComplete === true) {
      checkMasterPassword()
      checkUnlockStatus()
    }
  }, [isSetupComplete])

  // Still checking setup status
  if (isSetupComplete === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <PageSpinner />
      </div>
    )
  }

  // Setup not complete - show wizard
  if (isSetupComplete === false) {
    return (
      <>
        <SetupWizardPage onComplete={() => window.location.reload()} />
        <ToastContainer />
      </>
    )
  }

  // Setup complete — check if we need to unlock
  if (hasMasterPassword === null || isUnlocked === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <PageSpinner />
      </div>
    )
  }

  // Has master password but not unlocked — show unlock page
  if (hasMasterPassword && !isUnlocked) {
    return (
      <>
        <UnlockPage onUnlocked={() => setUnlocked(true)} />
        <ToastContainer />
      </>
    )
  }

  // Normal app
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/members/new" element={<MemberNewPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/products/new" element={<ProductNewPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/new" element={<NewSalePage />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/cash-register" element={<CashRegisterPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/cloud-backup" element={<CloudBackupPage />} />
          <Route
            path="/users"
            element={<AdminRoute><UsersPage /></AdminRoute>}
          />
          <Route
            path="/settings"
            element={<AdminRoute><SettingsPage /></AdminRoute>}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAuthenticated && <ToastContainer />}
    </HashRouter>
  )
}

export default App
