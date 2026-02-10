import React, { useRef, useEffect } from 'react'
import { Terminal as XTerminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import './Terminal.css'

export default function Terminal(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#6a9955',
        yellow: '#d7ba7d',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4ec9b0',
        white: '#d4d4d4'
      },
      fontSize: 14,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      convertEol: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    requestAnimationFrame(() => {
      fitAddon.fit()
    })

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Connect to PTY
    window.api.terminal.create().then(() => {
      // Send terminal size to PTY
      fitAddon.fit()
      window.api.terminal.resize(term.cols, term.rows)
    })

    // PTY output → xterm
    const removeDataListener = window.api.terminal.onData((data: string) => {
      term.write(data)
    })

    // xterm input → PTY
    term.onData((data: string) => {
      window.api.terminal.input(data)
    })

    // Resize handling
    const handleResize = (): void => {
      requestAnimationFrame(() => {
        fitAddon.fit()
        window.api.terminal.resize(term.cols, term.rows)
      })
    }
    window.addEventListener('resize', handleResize)

    // Also observe container resize
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddon.fit()
        window.api.terminal.resize(term.cols, term.rows)
      })
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      removeDataListener()
      window.api.terminal.dispose()
      term.dispose()
    }
  }, [])

  return <div ref={containerRef} className="terminal-container" />
}
