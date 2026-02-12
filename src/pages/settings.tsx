import { useState, useEffect } from 'react'
import {
  Settings, Database, Shield, UserCog, Tags, Coins,
  AlertTriangle, RotateCcw, CheckCircle, XCircle, Loader2, Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface SetupStatus {
  isComplete: boolean
  completedAt: string | null
  clubName: string
  database: { exists: boolean; path: string; tables: number }
  encryption: { keysExist: boolean; hasMasterPassword: boolean; encryptedFields: string[] }
  admin: { exists: boolean; username: string | null }
  categories: { count: number; names: string[] }
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)
  const [pointsRatio, setPointsRatio] = useState('100')
  const [ratioSaving, setRatioSaving] = useState(false)
  const [ratioSaved, setRatioSaved] = useState(false)

  useEffect(() => {
    loadStatus()
    loadPointsRatio()
  }, [])

  async function loadStatus() {
    setLoading(true)
    try {
      const res = await window.api.setup.getStatus()
      if (res.success) {
        setStatus(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function loadPointsRatio() {
    const res = await window.api.settings.getPointsRatio()
    if (res.success) setPointsRatio(String(res.data))
  }

  async function savePointsRatio() {
    const ratio = parseFloat(pointsRatio)
    if (isNaN(ratio) || ratio <= 0) return
    setRatioSaving(true)
    try {
      await window.api.settings.setPointsRatio(ratio)
      setRatioSaved(true)
      setTimeout(() => setRatioSaved(false), 2000)
    } catch {
      // ignore
    } finally {
      setRatioSaving(false)
    }
  }

  async function handleReset() {
    if (resetConfirmText !== 'RESET') return

    setResetting(true)
    try {
      const res = await window.api.setup.reset()
      if (res.success) {
        // Reload the renderer — App.tsx will detect setup incomplete and show wizard
        window.location.reload()
      }
    } catch {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="text-lime-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-400" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Settings size={20} className="text-lime-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Configuracion</h1>
            <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">
              Estado del sistema
            </p>
          </div>
        </div>
      </div>

      {status && (
        <>
          {/* System info */}
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase mb-1">
              Informacion General
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Club</span>
                <p className="text-sm font-medium text-zinc-200 mt-0.5">{status.clubName}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Configurado</span>
                <p className="text-sm font-medium text-zinc-200 mt-0.5">
                  {status.completedAt
                    ? new Date(status.completedAt).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Estado</span>
                <div className="mt-1">
                  <Badge variant={status.isComplete ? 'success' : 'danger'}>
                    {status.isComplete ? 'Operativo' : 'Incompleto'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Status grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Database */}
            <StatusCard
              icon={Database}
              iconColor="text-blue-400"
              iconBg="bg-blue-400/15"
              title="Base de Datos"
              items={[
                { label: 'Estado', badge: status.database.exists ? 'success' : 'danger', text: status.database.exists ? 'Activa' : 'No encontrada' },
                { label: 'Tablas', text: String(status.database.tables) },
                { label: 'Ruta', text: status.database.path, mono: true },
              ]}
            />

            {/* Encryption */}
            <StatusCard
              icon={Shield}
              iconColor="text-emerald-400"
              iconBg="bg-emerald-400/15"
              title="Encriptacion"
              items={[
                { label: 'Base de datos', badge: status.encryption.hasMasterPassword ? 'success' : 'danger', text: status.encryption.hasMasterPassword ? 'Encriptada (AES-256-GCM)' : 'Sin encriptar' },
                { label: 'Claves de campo', badge: status.encryption.keysExist ? 'success' : 'danger', text: status.encryption.keysExist ? 'Configuradas' : 'No encontradas' },
                { label: 'Campos protegidos', text: status.encryption.encryptedFields.join(', ') },
              ]}
            />

            {/* Admin */}
            <StatusCard
              icon={UserCog}
              iconColor="text-violet-400"
              iconBg="bg-violet-400/15"
              title="Administrador"
              items={[
                { label: 'Estado', badge: status.admin.exists ? 'success' : 'danger', text: status.admin.exists ? 'Activo' : 'No creado' },
                { label: 'Usuario', text: status.admin.username || '-' },
              ]}
            />

            {/* Categories */}
            <StatusCard
              icon={Tags}
              iconColor="text-amber-400"
              iconBg="bg-amber-400/15"
              title="Categorias"
              items={[
                { label: 'Total', text: String(status.categories.count) },
                { label: 'Nombres', text: status.categories.names.join(', ') || '-' },
              ]}
            />
          </div>

          {/* Points config */}
          <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-yellow-400/15 flex items-center justify-center">
                <Coins size={18} className="text-yellow-400" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase">
                  Sistema de Puntos
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Configura la equivalencia entre puntos y euros
                </p>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-xs">
                <Input
                  label="Puntos por euro"
                  type="number"
                  min="1"
                  step="1"
                  value={pointsRatio}
                  onChange={e => { setPointsRatio(e.target.value); setRatioSaved(false) }}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {parseFloat(pointsRatio) > 0
                    ? `${pointsRatio} puntos = 1€ · 1 punto = ${(1 / parseFloat(pointsRatio)).toFixed(4)}€`
                    : ''}
                </p>
              </div>
              <Button
                onClick={savePointsRatio}
                loading={ratioSaving}
                disabled={!pointsRatio || parseFloat(pointsRatio) <= 0}
                size="sm"
                variant={ratioSaved ? 'secondary' : 'primary'}
              >
                {ratioSaved ? <><CheckCircle size={14} /> Guardado</> : <><Save size={14} /> Guardar</>}
              </Button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-zinc-900 rounded-xl border border-red-500/30 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-400/15 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-bold tracking-widest text-red-400 uppercase">
                  Zona de Peligro
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Acciones irreversibles que afectan a todo el sistema
                </p>
              </div>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">Resetear Todo</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Elimina la base de datos, claves de encriptacion y toda la configuracion.
                  La aplicacion se reiniciara con el asistente de configuracion.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setResetModalOpen(true)}
                className="flex-shrink-0 ml-4"
              >
                <RotateCcw size={14} /> Resetear
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Reset confirmation modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70" onClick={() => !resetting && setResetModalOpen(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 rounded-xl shadow-2xl border border-red-500/30 fade-in">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-red-400 to-orange-400" />
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-400/15 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-mono text-zinc-100 uppercase tracking-widest">
                    Confirmar Reset
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Esta accion es irreversible</p>
                </div>
              </div>

              <div className="bg-red-400/5 border border-red-400/20 rounded-lg p-3 text-sm text-zinc-300 space-y-1">
                <p>Se eliminara permanentemente:</p>
                <ul className="text-xs text-zinc-400 space-y-0.5 ml-4 list-disc">
                  <li>Toda la base de datos (socios, ventas, inventario...)</li>
                  <li>Las claves de encriptacion</li>
                  <li>Toda la configuracion del sistema</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Escribe <span className="text-red-400 font-mono font-bold">RESET</span> para confirmar
                </label>
                <Input
                  value={resetConfirmText}
                  onChange={e => setResetConfirmText(e.target.value)}
                  placeholder="RESET"
                  autoFocus
                  disabled={resetting}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => { setResetModalOpen(false); setResetConfirmText('') }}
                  disabled={resetting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleReset}
                  disabled={resetConfirmText !== 'RESET'}
                  loading={resetting}
                >
                  <RotateCcw size={14} /> Resetear Todo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Helper Components
// ============================================

interface StatusItem {
  label: string
  text: string
  badge?: 'success' | 'danger'
  mono?: boolean
}

function StatusCard({
  icon: Icon, iconColor, iconBg, title, items,
}: {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  items: StatusItem[]
}) {
  return (
    <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon size={18} className={iconColor} />
        </div>
        <h3 className="text-sm font-mono font-bold tracking-widest text-zinc-300 uppercase">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i}>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">{item.label}</span>
            <div className="flex items-center gap-2 mt-0.5">
              {item.badge && (
                <Badge variant={item.badge}>
                  {item.badge === 'success' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                  {item.text}
                </Badge>
              )}
              {!item.badge && (
                <p className={`text-sm text-zinc-200 ${item.mono ? 'font-mono text-xs break-all' : ''}`}>
                  {item.text}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
