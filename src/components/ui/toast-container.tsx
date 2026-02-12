import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToastStore } from '@/store/toast.store'

const icons = {
  success: <CheckCircle size={18} className="text-lime-400" />,
  error: <AlertCircle size={18} className="text-red-400" />,
  info: <Info size={18} className="text-blue-400" />,
}

const bgColors = {
  success: 'border-l-lime-400',
  error: 'border-l-red-400',
  info: 'border-l-blue-400',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast-enter bg-zinc-900 rounded-lg shadow-lg border border-zinc-800 border-l-4 ${bgColors[toast.type]} p-4 flex items-start gap-3`}
        >
          <span className="mt-0.5 shrink-0">{icons[toast.type]}</span>
          <p className="text-sm font-mono text-zinc-200 flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-zinc-500 hover:text-zinc-300"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
