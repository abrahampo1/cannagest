import { useState, useEffect } from 'react'
import {
  ArrowRight, ArrowLeft, Check, Database, Shield, UserCog,
  Tags, Rocket, Loader2, CheckCircle, Lock, Eye, EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const STEPS = [
  { label: 'Bienvenida', icon: Rocket },
  { label: 'Base de Datos', icon: Database },
  { label: 'Seguridad', icon: Shield },
  { label: 'Administrador', icon: UserCog },
  { label: 'Categorias', icon: Tags },
  { label: 'Completado', icon: CheckCircle },
]

interface SetupWizardPageProps {
  onComplete: () => void
}

export default function SetupWizardPage({ onComplete }: SetupWizardPageProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right'>('left')

  // Step 1 - Database
  const [dbInitialized, setDbInitialized] = useState(false)
  const [dbLoading, setDbLoading] = useState(false)
  const [dbTables, setDbTables] = useState(0)
  const [dbError, setDbError] = useState('')

  // Step 2 - Master Password
  const [encReady, setEncReady] = useState(false)
  const [encLoading, setEncLoading] = useState(false)
  const [encError, setEncError] = useState('')
  const [masterPassword, setMasterPassword] = useState('')
  const [masterPasswordConfirm, setMasterPasswordConfirm] = useState('')
  const [showMasterPassword, setShowMasterPassword] = useState(false)

  // Step 3 - Admin
  const [adminUsername, setAdminUsername] = useState('admin')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminCreated, setAdminCreated] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Step 4 - Categories
  const [categories, setCategories] = useState<{ name: string; description: string | null }[]>([])
  const [clubName, setClubName] = useState('')

  // Step 5 - Complete
  const [completing, setCompleting] = useState(false)

  // Auto-execute DB initialization when entering step 1
  useEffect(() => {
    if (currentStep === 1 && !dbInitialized && !dbLoading) {
      initDb()
    }
  }, [currentStep])

  // No auto-execute for step 2 — user sets master password manually

  // Load categories when entering step 4
  useEffect(() => {
    if (currentStep === 4 && categories.length === 0) {
      loadCategories()
    }
  }, [currentStep])

  async function initDb() {
    setDbLoading(true)
    setDbError('')
    try {
      const res = await window.api.setup.initializeDatabase()
      if (res.success) {
        setDbInitialized(true)
        setDbTables(res.data.tables)
      } else {
        setDbError(res.error || 'Error al inicializar la base de datos')
      }
    } catch (err: any) {
      setDbError(err.message)
    } finally {
      setDbLoading(false)
    }
  }

  async function handleSetMasterPassword() {
    if (!masterPassword || masterPassword.length < 8) {
      setEncError('La clave maestra debe tener al menos 8 caracteres')
      return
    }
    if (masterPassword !== masterPasswordConfirm) {
      setEncError('Las claves no coinciden')
      return
    }

    setEncLoading(true)
    setEncError('')
    try {
      const res = await window.api.setup.setMasterPassword(masterPassword, masterPasswordConfirm)
      if (res.success) {
        setEncReady(true)
      } else {
        setEncError(res.error || 'Error al establecer la clave maestra')
      }
    } catch (err: any) {
      setEncError(err.message)
    } finally {
      setEncLoading(false)
    }
  }

  async function loadCategories() {
    try {
      const res = await window.api.setup.getCategories()
      if (res.success) {
        setCategories(res.data)
      }
    } catch {
      // Categories might not exist yet if db init didn't seed
    }
  }

  function validateAdmin(): boolean {
    if (!adminUsername || adminUsername.length < 3) {
      setAdminError('El nombre de usuario debe tener al menos 3 caracteres')
      return false
    }
    if (!adminPassword || adminPassword.length < 6) {
      setAdminError('La contraseña debe tener al menos 6 caracteres')
      return false
    }
    if (adminPassword !== adminPasswordConfirm) {
      setAdminError('Las contraseñas no coinciden')
      return false
    }
    return true
  }

  async function handleCreateAdmin() {
    if (!validateAdmin()) return

    setAdminLoading(true)
    setAdminError('')
    try {
      const res = await window.api.setup.createAdmin(
        adminUsername.trim(),
        adminPassword,
        adminEmail.trim() || undefined
      )
      if (res.success) {
        setAdminCreated(true)
      } else {
        setAdminError(res.error || 'Error al crear la cuenta')
      }
    } catch (err: any) {
      setAdminError(err.message)
    } finally {
      setAdminLoading(false)
    }
  }

  async function handleComplete() {
    setCompleting(true)
    try {
      const res = await window.api.setup.complete(clubName.trim() || undefined)
      if (res.success) {
        // Small delay for visual feedback
        setTimeout(() => onComplete(), 800)
      }
    } catch {
      setCompleting(false)
    }
  }

  function canGoNext(): boolean {
    switch (currentStep) {
      case 0: return true
      case 1: return dbInitialized
      case 2: return encReady
      case 3: return adminCreated
      case 4: return true
      default: return false
    }
  }

  function goNext() {
    if (!canGoNext()) return
    setDirection('left')
    setCurrentStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  function goPrev() {
    setDirection('right')
    setCurrentStep(s => Math.max(s - 1, 0))
  }

  const animClass = direction === 'left' ? 'step-slide-left' : 'step-slide-right'

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-black font-mono text-white tracking-wider">
            <span className="text-lime-400">CANNA</span>GEST
          </h1>
          <p className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase mt-2">
            Asistente de Configuracion
          </p>
        </div>

        {/* Stepper bar */}
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const isCompleted = i < currentStep
              const isCurrent = i === currentStep
              return (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`
                        w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
                        ${isCompleted
                          ? 'bg-lime-400 text-zinc-900 step-check-enter'
                          : isCurrent
                            ? 'bg-lime-400/20 text-lime-400 ring-2 ring-lime-400'
                            : 'bg-zinc-800 text-zinc-600'
                        }
                      `}
                    >
                      {isCompleted ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
                    </div>
                    <span
                      className={`text-[8px] font-mono tracking-widest uppercase hidden sm:block ${
                        isCurrent ? 'text-lime-400' : isCompleted ? 'text-zinc-300' : 'text-zinc-600'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 mx-2 hidden sm:block">
                      <div className={`h-0.5 transition-all duration-300 ${
                        i < currentStep ? 'bg-lime-400' : 'bg-zinc-800'
                      }`} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-400" />
          <div className="p-6" key={currentStep}>
            <div className={animClass}>
              {currentStep === 0 && <StepWelcome />}
              {currentStep === 1 && (
                <StepDatabase
                  loading={dbLoading}
                  initialized={dbInitialized}
                  tables={dbTables}
                  error={dbError}
                  onRetry={initDb}
                />
              )}
              {currentStep === 2 && (
                <StepEncryption
                  loading={encLoading}
                  ready={encReady}
                  error={encError}
                  password={masterPassword}
                  setPassword={setMasterPassword}
                  passwordConfirm={masterPasswordConfirm}
                  setPasswordConfirm={setMasterPasswordConfirm}
                  showPassword={showMasterPassword}
                  setShowPassword={setShowMasterPassword}
                  onSubmit={handleSetMasterPassword}
                />
              )}
              {currentStep === 3 && (
                <StepAdmin
                  username={adminUsername} setUsername={setAdminUsername}
                  password={adminPassword} setPassword={setAdminPassword}
                  passwordConfirm={adminPasswordConfirm} setPasswordConfirm={setAdminPasswordConfirm}
                  email={adminEmail} setEmail={setAdminEmail}
                  showPassword={showPassword} setShowPassword={setShowPassword}
                  created={adminCreated}
                  loading={adminLoading}
                  error={adminError}
                  onCreate={handleCreateAdmin}
                />
              )}
              {currentStep === 4 && (
                <StepCategories
                  categories={categories}
                  clubName={clubName}
                  setClubName={setClubName}
                />
              )}
              {currentStep === 5 && (
                <StepComplete
                  adminUsername={adminUsername}
                  clubName={clubName}
                  categories={categories}
                  completing={completing}
                  onComplete={handleComplete}
                />
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        {currentStep < 5 && (
          <div className="flex justify-between">
            <Button
              variant="secondary"
              onClick={goPrev}
              disabled={currentStep === 0}
            >
              <ArrowLeft size={16} /> Anterior
            </Button>
            <Button onClick={goNext} disabled={!canGoNext()}>
              Siguiente <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Step Components
// ============================================

function StepWelcome() {
  const items = [
    { icon: Database, color: 'text-blue-400', bg: 'bg-blue-400/15', text: 'Crear la base de datos local' },
    { icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-400/15', text: 'Establecer la clave maestra de encriptacion' },
    { icon: UserCog, color: 'text-violet-400', bg: 'bg-violet-400/15', text: 'Crear tu cuenta de administrador' },
    { icon: Tags, color: 'text-amber-400', bg: 'bg-amber-400/15', text: 'Revisar las categorias por defecto' },
  ]

  return (
    <div className="text-center space-y-6">
      <div>
        <h2 className="text-lg font-black text-white tracking-tight uppercase">
          Bienvenido a CannaGest
        </h2>
        <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">
          Este asistente te guiara paso a paso para configurar tu sistema de gestion.
          Solo tomara un par de minutos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg p-3">
            <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
              <item.icon size={18} className={item.color} />
            </div>
            <span className="text-sm text-zinc-300">{item.text}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-600 font-mono">
        Pulsa "Siguiente" para comenzar
      </p>
    </div>
  )
}

function StepDatabase({
  loading, initialized, tables, error, onRetry,
}: {
  loading: boolean; initialized: boolean; tables: number; error: string; onRetry: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          Base de Datos
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Creando la base de datos SQLite local donde se almacenaran todos los datos de tu club.
        </p>
      </div>

      <div className="flex flex-col items-center py-6 gap-4">
        {loading && (
          <>
            <Loader2 size={40} className="text-lime-400 animate-spin" />
            <p className="text-sm text-zinc-400 font-mono">Inicializando base de datos...</p>
          </>
        )}
        {initialized && !loading && (
          <>
            <div className="w-14 h-14 rounded-full bg-lime-400/20 flex items-center justify-center step-check-enter">
              <CheckCircle size={28} className="text-lime-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-200">Base de datos creada correctamente</p>
              <p className="text-xs text-zinc-500 font-mono mt-1">{tables} tablas creadas</p>
            </div>
          </>
        )}
        {error && !loading && (
          <>
            <div className="bg-red-400/10 border border-red-400/30 text-red-400 px-4 py-3 rounded-lg text-sm w-full">
              {error}
            </div>
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function StepEncryption({
  loading, ready, error,
  password, setPassword, passwordConfirm, setPasswordConfirm,
  showPassword, setShowPassword, onSubmit,
}: {
  loading: boolean; ready: boolean; error: string
  password: string; setPassword: (v: string) => void
  passwordConfirm: string; setPasswordConfirm: (v: string) => void
  showPassword: boolean; setShowPassword: (v: boolean) => void
  onSubmit: () => void
}) {
  if (ready) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Encriptacion de Datos
          </h2>
        </div>
        <div className="flex flex-col items-center py-6 gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-400/20 flex items-center justify-center step-check-enter">
            <Shield size={28} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-200">Encriptacion configurada</p>
            <Badge variant="success" className="mt-2">Base de datos protegida</Badge>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          Clave Maestra
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Establece una clave maestra para encriptar toda la base de datos con AES-256-GCM.
          Deberas introducirla cada vez que abras la aplicacion.
        </p>
      </div>

      <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3 text-xs text-amber-300">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={14} className="text-amber-400 flex-shrink-0" />
          <span className="font-mono font-bold tracking-widest uppercase text-[10px]">Importante</span>
        </div>
        Si olvidas esta clave, no podras acceder a tus datos. No hay forma de recuperarla.
      </div>

      <div className="space-y-4 max-w-md">
        <div className="relative">
          <Input
            label="Clave maestra *"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimo 8 caracteres"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <Input
          label="Confirmar clave maestra *"
          type={showPassword ? 'text' : 'password'}
          value={passwordConfirm}
          onChange={e => setPasswordConfirm(e.target.value)}
          placeholder="Repite la clave maestra"
        />

        {error && (
          <div className="bg-red-400/10 border border-red-400/30 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Button onClick={onSubmit} loading={loading} className="w-full">
          <Lock size={16} /> Establecer Clave Maestra
        </Button>
      </div>
    </div>
  )
}

function StepAdmin({
  username, setUsername, password, setPassword,
  passwordConfirm, setPasswordConfirm,
  email, setEmail,
  showPassword, setShowPassword,
  created, loading, error, onCreate,
}: {
  username: string; setUsername: (v: string) => void
  password: string; setPassword: (v: string) => void
  passwordConfirm: string; setPasswordConfirm: (v: string) => void
  email: string; setEmail: (v: string) => void
  showPassword: boolean; setShowPassword: (v: boolean) => void
  created: boolean; loading: boolean; error: string; onCreate: () => void
}) {
  if (created) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
            Cuenta de Administrador
          </h2>
        </div>
        <div className="flex flex-col items-center py-6 gap-4">
          <div className="w-14 h-14 rounded-full bg-violet-400/20 flex items-center justify-center step-check-enter">
            <UserCog size={28} className="text-violet-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-200">Cuenta creada correctamente</p>
            <p className="text-xs text-zinc-500 font-mono mt-1">Usuario: {username}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
          Cuenta de Administrador
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Crea tu cuenta de administrador. Con ella podras gestionar usuarios, configuracion y todo el sistema.
        </p>
      </div>

      <div className="space-y-4 max-w-md">
        <Input
          label="Nombre de usuario *"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="admin"
          autoFocus
        />
        <div className="relative">
          <Input
            label="contraseña *"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimo 6 caracteres"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <Input
          label="Confirmar contraseña *"
          type={showPassword ? 'text' : 'password'}
          value={passwordConfirm}
          onChange={e => setPasswordConfirm(e.target.value)}
          placeholder="Repite la contraseña"
        />
        <Input
          label="Email (opcional)"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="admin@tuclub.com"
        />

        {error && (
          <div className="bg-red-400/10 border border-red-400/30 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Button onClick={onCreate} loading={loading} className="w-full">
          <UserCog size={16} /> Crear Cuenta
        </Button>
      </div>
    </div>
  )
}

function StepCategories({
  categories, clubName, setClubName,
}: {
  categories: { name: string; description: string | null }[]
  clubName: string
  setClubName: (v: string) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          Categorias y Nombre del Club
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Se han creado estas categorias por defecto para tus productos.
          Puedes modificarlas despues desde la seccion de Categorias.
        </p>
      </div>

      {categories.length > 0 && (
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase block mb-3">
            Categorias creadas
          </span>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Badge key={cat.name} variant="success">{cat.name}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-md pt-2">
        <Input
          label="Nombre de tu club (opcional)"
          value={clubName}
          onChange={e => setClubName(e.target.value)}
          placeholder="Mi Club Cannabico"
        />
        <p className="text-xs text-zinc-600 mt-1">
          Se mostrara en los informes y exportaciones.
        </p>
      </div>
    </div>
  )
}

function StepComplete({
  adminUsername, clubName, categories, completing, onComplete,
}: {
  adminUsername: string
  clubName: string
  categories: { name: string; description: string | null }[]
  completing: boolean
  onComplete: () => void
}) {
  const checks = [
    { label: 'Base de datos', detail: 'SQLite local', done: true },
    { label: 'Encriptacion', detail: 'AES-256-GCM (clave maestra)', done: true },
    { label: 'Administrador', detail: adminUsername, done: true },
    { label: 'Categorias', detail: `${categories.length} creadas`, done: true },
    { label: 'Nombre del club', detail: clubName || 'CannaGest', done: true },
  ]

  return (
    <div className="space-y-6 text-center">
      <div>
        <h2 className="text-lg font-black text-white tracking-tight uppercase">
          Todo Listo
        </h2>
        <p className="text-sm text-zinc-400 mt-2">
          Tu sistema esta configurado y listo para usar.
        </p>
      </div>

      <div className="space-y-2 max-w-sm mx-auto text-left">
        {checks.map((item, i) => (
          <div key={i} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg px-4 py-3">
            <div className="w-6 h-6 rounded-full bg-lime-400/20 flex items-center justify-center flex-shrink-0">
              <Check size={14} className="text-lime-400" strokeWidth={3} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-zinc-200">{item.label}</span>
              <span className="text-xs text-zinc-500 font-mono ml-2">{item.detail}</span>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={onComplete} loading={completing} size="lg" className="mt-4">
        <Rocket size={18} /> Iniciar CannaGest
      </Button>
    </div>
  )
}
