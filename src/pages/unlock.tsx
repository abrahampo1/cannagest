import { useState, type FormEvent } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface UnlockPageProps {
  onUnlocked: () => void
}

export default function UnlockPage({ onUnlocked }: UnlockPageProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password) return

    setError('')
    setLoading(true)
    try {
      const res = await window.api.setup.unlock(password)
      if (res.success) {
        onUnlocked()
      } else {
        setError(res.error || 'Clave maestra incorrecta')
      }
    } catch (err: any) {
      setError(err.message || 'Error al desbloquear')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black font-mono text-white tracking-wider">
            <span className="text-lime-400">CANNA</span>GEST
          </h1>
          <p className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase mt-3">
            Base de Datos Encriptada
          </p>
        </div>

        {/* Unlock card */}
        <div className="bg-zinc-900 rounded-xl shadow-xl p-8 border border-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-lime-400 to-cyan-400" />

          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-full bg-emerald-400/15 flex items-center justify-center">
              <Lock size={24} className="text-emerald-400" />
            </div>
            <h2 className="text-xs font-black font-mono text-zinc-100 uppercase tracking-widest">
              Desbloquear
            </h2>
            <p className="text-xs text-zinc-500 text-center">
              Introduce tu clave maestra para desencriptar la base de datos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                id="master-password"
                label="Clave Maestra"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="bg-red-400/10 border border-red-400/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              <Lock size={16} /> Desbloquear
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
