import { IpcMain } from 'electron'
import fs from 'fs'
import path from 'path'

export function registerFileHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('files:read', async (_event, filePath: string) => {
    try {
      return { success: true, content: fs.readFileSync(filePath, 'utf-8') }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('files:write', async (_event, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8')
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('files:list', async (_event, dirPath: string) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      return {
        success: true,
        entries: entries.map(e => ({
          name: e.name,
          isDirectory: e.isDirectory(),
          path: path.join(dirPath, e.name)
        }))
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
