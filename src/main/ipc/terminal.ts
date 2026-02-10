import { IpcMain, BrowserWindow } from 'electron'
import { createRequire } from 'module'
import os from 'os'
import { logger } from '../logger'
import { analyzeForDetection } from './detection'

const require2 = createRequire(import.meta.url || __filename)
const pty = require2('node-pty')

let ptyProcess: any = null
let mainWin: BrowserWindow | null = null

// ─── I/O 버퍼 (detection 분석용) ───
const IO_BUFFER_MAX = 8000 // 최대 글자수
let ioBuffer = ''
let lastActivityTime = 0
let analysisTimer: ReturnType<typeof setTimeout> | null = null
const ANALYSIS_DELAY = 5000 // 유저가 5초 멈추면 분석 트리거

function appendToBuffer(data: string): void {
  ioBuffer += data
  if (ioBuffer.length > IO_BUFFER_MAX) {
    ioBuffer = ioBuffer.slice(-IO_BUFFER_MAX)
  }
  lastActivityTime = Date.now()

  // 유저가 멈추면 분석 트리거
  if (analysisTimer) clearTimeout(analysisTimer)
  analysisTimer = setTimeout(() => {
    if (ioBuffer.trim().length > 100) {
      triggerDetection()
    }
  }, ANALYSIS_DELAY)
}

function triggerDetection(): void {
  if (!mainWin || mainWin.isDestroyed()) return
  const snapshot = ioBuffer
  ioBuffer = '' // 분석 후 리셋
  logger.info('detection', `Triggering analysis (${snapshot.length} chars)`)
  analyzeForDetection(snapshot, mainWin)
}

// 외부에서 버퍼 조회용
export function getIOBuffer(): string {
  return ioBuffer
}

export function registerTerminalHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('terminal:create', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { success: false }
    mainWin = win

    if (ptyProcess) {
      ptyProcess.kill()
      ptyProcess = null
    }

    // 버퍼 리셋
    ioBuffer = ''

    const shell = process.env.SHELL || '/bin/zsh'
    const home = os.homedir()

    ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: home,
      env: { ...process.env, TERM: 'xterm-256color' }
    })

    logger.info('terminal', `PTY created: shell=${shell}, pid=${ptyProcess.pid}`)

    ptyProcess.onData((data: string) => {
      // 터미널에 전달
      if (win && !win.isDestroyed()) {
        win.webContents.send('terminal:data', data)
      }
      // 버퍼에 축적 (출력)
      appendToBuffer(data)
    })

    ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
      logger.info('terminal', `PTY exited: code=${exitCode}`)
      ptyProcess = null
    })

    return { success: true, pid: ptyProcess.pid }
  })

  ipcMain.on('terminal:input', (_event, data: string) => {
    if (ptyProcess) {
      ptyProcess.write(data)
      // 버퍼에 축적 (입력)
      appendToBuffer(data)
    }
  })

  ipcMain.on('terminal:resize', (_event, cols: number, rows: number) => {
    if (ptyProcess) {
      ptyProcess.resize(cols, rows)
    }
  })

  ipcMain.handle('terminal:dispose', async () => {
    if (analysisTimer) clearTimeout(analysisTimer)
    if (ptyProcess) {
      ptyProcess.kill()
      ptyProcess = null
      logger.info('terminal', 'PTY disposed')
    }
    return { success: true }
  })
}
