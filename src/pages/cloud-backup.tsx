import { useEffect, useState } from 'react'
import { Cloud, Upload, Download, Trash2, LogOut, RefreshCw, Shield, Clock, Loader2 } from 'lucide-react'
import { useCloudStore } from '@/store/cloud.store'
import { useToast } from '@/store/toast.store'
import { cn } from '@/lib/utils'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CloudLoginForm() {
  const { cloudLogin, cloudRegister, actionLoading, error } = useCloudStore()
  const toast = useToast()
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isRegister) {
        await cloudRegister(name, email, password, passwordConfirmation)
        toast.success('Cuenta creada correctamente')
      } else {
        await cloudLogin(email, password)
        toast.success('Sesión cloud iniciada')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-lime-400/10 flex items-center justify-center mx-auto mb-4">
          <Cloud size={32} className="text-lime-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Cloud Backup</h2>
        <p className="text-sm text-zinc-500 mt-1">
          {isRegister ? 'Crea una cuenta para empezar' : 'Inicia sesión en tu cuenta cloud'}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-400/10 border border-red-400/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white focus:border-lime-400 focus:ring-1 focus:ring-lime-400 focus:outline-none"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white focus:border-lime-400 focus:ring-1 focus:ring-lime-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white focus:border-lime-400 focus:ring-1 focus:ring-lime-400 focus:outline-none"
          />
        </div>
        {isRegister && (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Confirmar contraseña</label>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-white focus:border-lime-400 focus:ring-1 focus:ring-lime-400 focus:outline-none"
            />
          </div>
        )}
        <button
          type="submit"
          disabled={actionLoading}
          className="w-full rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-lime-300 disabled:opacity-50 transition-colors"
        >
          {actionLoading ? 'Procesando...' : isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-500">
        {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
        <button onClick={() => setIsRegister(!isRegister)} className="text-lime-400 hover:text-lime-300">
          {isRegister ? 'Iniciar sesión' : 'Regístrate'}
        </button>
      </p>
    </div>
  )
}

export default function CloudBackupPage() {
  const {
    status, backups, maxBackups, loading, actionLoading, error,
    fetchStatus, fetchBackups, cloudLogout, createAndUpload, downloadAndRestore, deleteBackup, setAutoBackup, setBackupOnCashClose
  } = useCloudStore()
  const toast = useToast()

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    if (status?.loggedIn && status?.subscriptionActive) {
      fetchBackups()
    }
  }, [status?.loggedIn, status?.subscriptionActive])

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-lime-400" />
      </div>
    )
  }

  if (!status?.loggedIn) {
    return (
      <div className="py-8">
        <CloudLoginForm />
      </div>
    )
  }

  const handleCreate = async () => {
    try {
      await createAndUpload(`Backup manual ${new Date().toLocaleString('es-ES')}`)
      toast.success('Backup creado y subido correctamente')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const handleRestore = async (backupId: number) => {
    if (!confirm('¿Estás seguro de que deseas restaurar este backup? Se reemplazará la base de datos actual.')) return
    try {
      await downloadAndRestore(backupId)
      toast.success('Backup restaurado correctamente. La aplicación puede necesitar reiniciarse.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const handleDelete = async (backupId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este backup?')) return
    try {
      await deleteBackup(backupId)
      toast.success('Backup eliminado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-mono">Cloud Backup</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestiona tus copias de seguridad en la nube</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-400">{status.email}</span>
          <button
            onClick={cloudLogout}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            <LogOut size={14} />
            Cerrar sesión cloud
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-400/10 border border-red-400/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Subscription status */}
      {!status.subscriptionActive && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={20} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Suscripción necesaria</h2>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Necesitas una suscripción activa (5€/mes) para usar el servicio de Cloud Backup.
            Puedes gestionar tu suscripción desde el panel web.
          </p>
          <a
            href="https://cannagest-cloud.test/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-lime-300 transition-colors"
          >
            Ir al panel web
          </a>
        </div>
      )}

      {status.subscriptionActive && (
        <>
          {/* Actions bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreate}
              disabled={actionLoading || backups.length >= maxBackups}
              className="flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-lime-300 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {actionLoading ? 'Creando...' : 'Crear Backup'}
            </button>
            <button
              onClick={() => { fetchBackups(); fetchStatus() }}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
              Actualizar
            </button>
            <span className="text-sm text-zinc-500 ml-auto">
              {backups.length}/{maxBackups} backups
            </span>
          </div>

          {/* Backups table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {backups.length === 0 ? (
              <div className="text-center py-16">
                <Cloud size={40} className="mx-auto text-zinc-600 mb-4" />
                <p className="text-sm text-zinc-500">No tienes backups en la nube todavía.</p>
                <p className="text-sm text-zinc-600 mt-1">Crea tu primer backup con el botón de arriba.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">Tamaño</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">Notas</th>
                    <th className="px-4 py-3 text-right text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-white font-mono">{backup.original_name}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{formatBytes(backup.size)}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{formatDate(backup.backup_date || backup.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-zinc-500 max-w-[200px] truncate">{backup.notes || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRestore(backup.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-lime-400 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                            title="Restaurar"
                          >
                            <Download size={12} />
                            Restaurar
                          </button>
                          <button
                            onClick={() => handleDelete(backup.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-red-400 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Auto-backup config */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock size={20} className="text-lime-400" />
              <h2 className="text-lg font-semibold text-white">Auto-backup</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              Configura la frecuencia de backups automáticos.
            </p>
            <div className="flex gap-3">
              {(['off', 'daily', 'weekly'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAutoBackup(mode)}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    status.autoBackup === mode
                      ? 'bg-lime-400 border-lime-400 text-zinc-900'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                  )}
                >
                  {mode === 'off' ? 'Desactivado' : mode === 'daily' ? 'Diario' : 'Semanal'}
                </button>
              ))}
            </div>
            {status.lastAutoBackup && (
              <p className="text-xs text-zinc-500 mt-3">
                Último auto-backup: {formatDate(status.lastAutoBackup)}
              </p>
            )}

            {/* Backup al cerrar caja */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-white">Backup al cerrar caja</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Crea un backup automáticamente al cerrar la caja registradora</p>
                </div>
                <button
                  onClick={() => setBackupOnCashClose(!status.backupOnCashClose)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    status.backupOnCashClose ? 'bg-lime-400' : 'bg-zinc-700'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      status.backupOnCashClose ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </label>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
