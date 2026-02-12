import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { initializePrisma, closePrisma } from './database/client'
import { registerAllHandlers } from './ipc/index'
import { registerSetupHandlers } from './ipc/setup.ipc'
import { isSetupComplete, markSetupComplete, hasMasterPassword } from './utils/settings.util'
import { getDatabasePath, getEncryptedDatabasePath } from './utils/keys.util'
import { getMasterKey, clearMasterKey, encryptFile } from './utils/crypto.util'
import { createLogger } from './utils/logger.util'
import { startAutoBackup, stopAutoBackup } from './utils/auto-backup.util'

const log = createLogger('Main')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
let isQuitting = false

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'))
  }

  win.on('closed', () => {
    win = null
  })
}

async function bootstrap() {
  try {
    // Always register setup handlers first (needed for wizard and settings)
    registerSetupHandlers()

    // Backward compatibility: if DB exists but setup flag is false, mark as complete
    const dbPath = getDatabasePath()
    if (!isSetupComplete() && fs.existsSync(dbPath)) {
      log.info('Existing database detected, marking setup as complete')
      markSetupComplete()
    }

    if (isSetupComplete()) {
      if (hasMasterPassword()) {
        // Has master password — wait for unlock from renderer
        log.info('Master password configured, waiting for unlock')
      } else {
        // No master password — legacy mode, init directly
        await initializePrisma()
        log.info('Database initialized (legacy mode, no master password)')

        registerAllHandlers()
        startAutoBackup()
      }
    } else {
      log.info('Setup not complete, starting in wizard mode')
    }

    // Create window
    createWindow()
  } catch (error) {
    log.error('Failed to bootstrap application:', error)
    app.quit()
  }
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', async (event) => {
  if (isQuitting) return

  stopAutoBackup()

  const masterKey = getMasterKey()
  if (masterKey) {
    // Prevent default quit — we need to encrypt first
    event.preventDefault()
    isQuitting = true

    try {
      // Close Prisma to flush WAL
      await closePrisma()

      const dbPath = getDatabasePath()
      const encPath = getEncryptedDatabasePath()

      // Encrypt .db → .db.enc
      if (fs.existsSync(dbPath)) {
        encryptFile(dbPath, encPath, masterKey)
        log.info('Database encrypted on shutdown')

        // Delete plaintext files
        fs.unlinkSync(dbPath)
        for (const suffix of ['-wal', '-shm', '-journal']) {
          const filePath = dbPath + suffix
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
        }
      }

      clearMasterKey()
    } catch (err) {
      log.error('Error during encrypted shutdown:', err)
    }

    app.quit()
  } else {
    // No master key — normal shutdown
    await closePrisma()
    log.info('Application shutting down')
  }
})
