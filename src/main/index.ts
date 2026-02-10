import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { registerLlmHandlers } from './ipc/llm'
import { registerAgentHandlers } from './ipc/agents'
import { registerFileHandlers } from './ipc/files'
import { registerAuthHandlers } from './ipc/auth'
import { registerTerminalHandlers } from './ipc/terminal'
import { registerAgentBuilderHandlers } from './ipc/agent-builder'
import { executeAgent } from './ipc/agent-engine'
import { initDatabase } from './store/db'
import { logger } from './logger'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  logger.info('app', 'Creating main window')
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Light Code',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  logger.info('app', `Light Code starting, userData: ${app.getPath('userData')}`)
  logger.info('app', `Log file: ${logger.getLogFilePath()}`)

  initDatabase()
  logger.info('app', 'Database initialized')

  registerLlmHandlers(ipcMain)
  registerAgentHandlers(ipcMain)
  registerFileHandlers(ipcMain)
  registerAuthHandlers(ipcMain)
  registerTerminalHandlers(ipcMain)
  registerAgentBuilderHandlers(ipcMain)

  ipcMain.handle('app:get-log-path', () => logger.getLogFilePath())

  // 수동 에이전트 실행
  ipcMain.handle('agent:execute', async (event, agentId: string, userMessage: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { success: false }
    await executeAgent(agentId, userMessage, win)
    return { success: true }
  })

  logger.info('app', 'IPC handlers registered')

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  logger.info('app', 'All windows closed')
  if (process.platform !== 'darwin') app.quit()
})
