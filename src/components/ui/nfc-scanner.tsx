import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Nfc, X } from 'lucide-react'
import { Button } from './button'

interface NfcScannerProps {
  open: boolean
  onScan: (tagId: string) => void
  onClose: () => void
}

const INTER_KEY_THRESHOLD = 50 // ms between keystrokes for NFC reader
const MIN_TAG_LENGTH = 4
const TIMEOUT_MS = 30_000

export function NfcScanner({ open, onScan, onClose }: NfcScannerProps) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const timedOutRef = useRef(false)

  const resetBuffer = useCallback(() => {
    bufferRef.current = ''
    lastKeyTimeRef.current = 0
  }, [])

  useEffect(() => {
    if (!open) {
      resetBuffer()
      timedOutRef.current = false
      return
    }

    timedOutRef.current = false

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()

      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        if (bufferRef.current.length >= MIN_TAG_LENGTH) {
          onScan(bufferRef.current)
        }
        resetBuffer()
        return
      }

      // Only accumulate printable single characters
      if (e.key.length !== 1) return

      e.preventDefault()
      e.stopPropagation()

      const elapsed = now - lastKeyTimeRef.current
      if (lastKeyTimeRef.current === 0 || elapsed < INTER_KEY_THRESHOLD) {
        bufferRef.current += e.key
      } else {
        // Too slow — start new buffer
        bufferRef.current = e.key
      }
      lastKeyTimeRef.current = now
    }

    window.addEventListener('keydown', handleKeyDown, true)

    // Timeout after 30s
    timeoutRef.current = setTimeout(() => {
      timedOutRef.current = true
      onClose()
    }, TIMEOUT_MS)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [open, onScan, onClose, resetBuffer])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative flex flex-col items-center gap-8 fade-in">
        {/* NFC icon with animated waves */}
        <div className="relative flex items-center justify-center">
          {/* Wave rings */}
          <div className="absolute w-32 h-32 rounded-full border-2 border-lime-400/60 nfc-wave" />
          <div className="absolute w-32 h-32 rounded-full border-2 border-lime-400/40 nfc-wave-delay-1" />
          <div className="absolute w-32 h-32 rounded-full border-2 border-lime-400/20 nfc-wave-delay-2" />

          {/* Center icon */}
          <div className="relative w-24 h-24 rounded-full bg-lime-400 flex items-center justify-center pulse-ring shadow-xl">
            <Nfc size={40} className="text-zinc-900" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-white text-xl font-semibold">Acerca el llavero al lector...</p>
          <p className="text-white/60 text-sm mt-2">Esperando lectura NFC</p>
        </div>

        {/* Cancel button */}
        <Button
          variant="secondary"
          onClick={onClose}
          className="bg-white/10 text-white border-white/20 hover:bg-white/20"
        >
          <X size={16} /> Cancelar
        </Button>
      </div>
    </div>,
    document.body
  )
}
