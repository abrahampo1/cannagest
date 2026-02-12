import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-zinc-800 text-zinc-300',
  success: 'bg-lime-400/15 text-lime-400',
  warning: 'bg-amber-400/15 text-amber-400',
  danger: 'bg-red-400/15 text-red-400',
  info: 'bg-blue-400/15 text-blue-400',
}

interface BadgeProps {
  variant?: keyof typeof variants
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest uppercase',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
