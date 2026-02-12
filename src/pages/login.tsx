import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NfcScanner } from '@/components/ui/nfc-scanner'
import { Nfc } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [nfcOpen, setNfcOpen] = useState(false)
  const [nfcLoading, setNfcLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const loginByNfc = useAuthStore(s => s.loginByNfc)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  const handleNfcScan = async (tagId: string) => {
    setNfcOpen(false)
    setError('')
    setNfcLoading(true)
    try {
      await loginByNfc(tagId)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Llavero no registrado')
    } finally {
      setNfcLoading(false)
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
          <p className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase mt-3">Gestion de Club Cannabico</p>
        </div>

        {/* Form card */}
        <div className="bg-zinc-900 rounded-xl shadow-xl p-8 border border-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-400" />
          <h2 className="text-xs font-black font-mono text-zinc-100 uppercase tracking-widest mb-6">Iniciar Sesion</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="username"
              label="Usuario"
              placeholder="admin"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              required
            />
            <Input
              id="password"
              label="contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            {error && (
              <div className="bg-red-400/10 border border-red-400/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Entrar
            </Button>
          </form>

          {/* Separator */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">o</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* NFC Login */}
          <Button
            variant="secondary"
            className="w-full"
            size="lg"
            onClick={() => setNfcOpen(true)}
            loading={nfcLoading}
          >
            <Nfc size={18} />
            Iniciar con NFC
          </Button>
        </div>
      </div>

      <NfcScanner
        open={nfcOpen}
        onClose={() => setNfcOpen(false)}
        onScan={handleNfcScan}
      />
    </div>
  )
}
