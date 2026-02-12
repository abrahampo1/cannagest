type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

const CURRENT_LEVEL: LogLevel = process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO'

export function createLogger(context: string): Logger {
  const prefix = `[${context}]`
  const shouldLog = (level: LogLevel) => LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL]

  return {
    debug: (...args) => { if (shouldLog('DEBUG')) console.log(prefix, ...args) },
    info: (...args) => { if (shouldLog('INFO')) console.log(prefix, ...args) },
    warn: (...args) => { if (shouldLog('WARN')) console.warn(prefix, ...args) },
    error: (...args) => { if (shouldLog('ERROR')) console.error(prefix, ...args) },
  }
}
