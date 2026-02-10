import fs from 'fs'
import path from 'path'
import { app } from 'electron'

let logPath: string
let logStream: fs.WriteStream

function getLogPath(): string {
  if (!logPath) {
    const logDir = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
    const date = new Date().toISOString().slice(0, 10)
    logPath = path.join(logDir, `light-code-${date}.log`)
  }
  return logPath
}

function getStream(): fs.WriteStream {
  if (!logStream) {
    logStream = fs.createWriteStream(getLogPath(), { flags: 'a' })
  }
  return logStream
}

function formatMessage(level: string, module: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString()
  let line = `[${timestamp}] [${level}] [${module}] ${message}`
  if (data !== undefined) {
    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      line += `\n  DATA: ${serialized}`
    } catch {
      line += `\n  DATA: [unserializable]`
    }
  }
  return line
}

function write(level: string, module: string, message: string, data?: any): void {
  const line = formatMessage(level, module, message, data)
  console.log(line)
  try {
    getStream().write(line + '\n')
  } catch {
    // ignore write errors
  }
}

export const logger = {
  info: (module: string, message: string, data?: any) => write('INFO', module, message, data),
  warn: (module: string, message: string, data?: any) => write('WARN', module, message, data),
  error: (module: string, message: string, data?: any) => write('ERROR', module, message, data),
  debug: (module: string, message: string, data?: any) => write('DEBUG', module, message, data),
  getLogFilePath: () => getLogPath()
}
