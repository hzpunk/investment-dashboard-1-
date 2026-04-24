// Centralized logging utility
// Automatically disables logs in production

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

const isDev = process.env.NODE_ENV !== 'production'
const isTest = process.env.NODE_ENV === 'test'

function createLogger(context: string): Logger {
  const prefix = `[${context}]`

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (isDev && !isTest) {
        console.debug(prefix, message, ...args)
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (isDev && !isTest) {
        console.info(prefix, message, ...args)
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (isDev) {
        console.warn(prefix, message, ...args)
      }
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(prefix, message, ...args)
    },
  }
}

export { createLogger }
export type { Logger }
