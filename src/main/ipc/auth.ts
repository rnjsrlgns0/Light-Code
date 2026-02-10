import { IpcMain, safeStorage, app } from 'electron'
import fs from 'fs'
import path from 'path'
import { logger } from '../logger'

interface StoredConfig {
  provider: 'claude' | 'openai' | null
  hasKey: boolean
  authMode?: 'api' | 'cli'
}

let currentAuthMode: 'api' | 'cli' = 'api'

export function getAuthMode(): 'api' | 'cli' {
  const config = loadConfig()
  return config.authMode || currentAuthMode
}

function getKeyFilePath(provider: string): string {
  return path.join(app.getPath('userData'), `apikey-${provider}.enc`)
}

function getConfigFilePath(): string {
  return path.join(app.getPath('userData'), 'auth-config.json')
}

function loadConfig(): StoredConfig {
  try {
    const configPath = getConfigFilePath()
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
  } catch {
    // ignore
  }
  return { provider: null, hasKey: false }
}

function saveConfig(config: StoredConfig): void {
  fs.writeFileSync(getConfigFilePath(), JSON.stringify(config), 'utf-8')
}

export function getApiKey(provider: string): string | null {
  try {
    const keyPath = getKeyFilePath(provider)
    if (!fs.existsSync(keyPath)) { logger.debug('auth', `No key file for ${provider}`); return null }
    if (!safeStorage.isEncryptionAvailable()) { logger.warn('auth', 'Encryption not available'); return null }
    const encrypted = fs.readFileSync(keyPath)
    logger.info('auth', `API key loaded for ${provider}`)
    return safeStorage.decryptString(encrypted)
  } catch (err: any) {
    logger.error('auth', `Failed to load API key for ${provider}`, err.message)
    return null
  }
}

export function registerAuthHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('auth:get-config', async () => {
    const config = loadConfig()
    const isCli = config.authMode === 'cli'
    return {
      provider: config.provider,
      configured: isCli || config.hasKey,
      authMode: config.authMode || 'api'
    }
  })

  ipcMain.handle('auth:save-api-key', async (_event, provider: string, apiKey: string) => {
    logger.info('auth', `Saving API key for ${provider}`)
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        logger.error('auth', 'Encryption not available')
        return { success: false, error: 'Encryption not available on this system' }
      }
      const encrypted = safeStorage.encryptString(apiKey)
      fs.writeFileSync(getKeyFilePath(provider), encrypted)
      saveConfig({ provider: provider as 'claude' | 'openai', hasKey: true })
      logger.info('auth', `API key saved for ${provider}`)
      return { success: true }
    } catch (err: any) {
      logger.error('auth', `Failed to save API key: ${err.message}`)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('auth:login-cli', async (_event, _provider: string) => {
    logger.info('auth', 'Setting auth mode to CLI')
    currentAuthMode = 'cli'
    saveConfig({ provider: 'claude', hasKey: false, authMode: 'cli' })
    return { success: true }
  })

  ipcMain.handle('auth:set-mode', async (_event, mode: 'api' | 'cli') => {
    logger.info('auth', `Auth mode set to: ${mode}`)
    currentAuthMode = mode
    const config = loadConfig()
    saveConfig({ ...config, authMode: mode })
    return { success: true }
  })

  ipcMain.handle('auth:get-mode', async () => {
    return getAuthMode()
  })
}
