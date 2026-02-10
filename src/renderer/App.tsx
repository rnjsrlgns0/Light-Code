import React, { useState, useRef, useCallback, useEffect } from 'react'
import Terminal from './components/Terminal/Terminal'
import AgentList from './components/AgentList/AgentList'
import Settings from './components/Settings/Settings'
import { useAgentStore } from './stores/agentStore'

interface AgentResponse {
  agentId: string
  agentName: string
  response: string
}

export default function App(): React.ReactElement {
  const agents = useAgentStore((s) => s.agents)
  const activeCount = agents.filter((a) => a.status === 'active').length

  const [leftWidth, setLeftWidth] = useState(320)
  const isDragging = useRef(false)
  const [llmStatus, setLlmStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const [showSettings, setShowSettings] = useState(false)
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null)
  const [agentWorking, setAgentWorking] = useState<string | null>(null)

  useEffect(() => {
    window.api.auth
      .getConfig()
      .then((config) => {
        setLlmStatus(config.configured ? 'connected' : 'disconnected')
      })
      .catch(() => {
        setLlmStatus('disconnected')
      })
  }, [])

  // 에이전트 실행/응답 수신
  useEffect(() => {
    const removeExec = window.api.agentEngine.onExecuting((data) => {
      setAgentWorking(data.agentName)
      setAgentResponse(null)
    })
    const removeStream = window.api.agentEngine.onStream((data) => {
      setAgentResponse((prev) => ({
        agentId: data.agentId,
        agentName: data.agentName,
        response: (prev?.response || '') + data.chunk
      }))
    })
    const removeResp = window.api.agentEngine.onResponse((data) => {
      setAgentWorking(null)
      setAgentResponse(data)
    })
    return () => { removeExec(); removeStream(); removeResp() }
  }, [])

  const handleMouseDown = useCallback(() => {
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging.current) return
      const newWidth = Math.max(180, Math.min(600, e.clientX))
      setLeftWidth(newWidth)
    }

    const handleMouseUp = (): void => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [])

  return (
    <div className="app">
      <div className="app-layout">
        <div className="panel-left" style={{ width: leftWidth }}>
          <div className="panel-header">Agents</div>
          <div className="panel-content">
            <AgentList />
          </div>
        </div>
        <div className="divider" onMouseDown={handleMouseDown} />
        <div className="panel-right">
          <div className="panel-header">
            Terminal
            {agentWorking && (
              <span className="agent-working-badge">{agentWorking} 작업 중...</span>
            )}
          </div>
          <div className="panel-content" style={{ display: 'flex', flexDirection: 'column' }}>
            {agentResponse && (
              <div className="agent-response-panel">
                <div className="agent-response-header">
                  <span className="agent-response-name">{agentResponse.agentName}</span>
                  <button className="agent-response-close" onClick={() => setAgentResponse(null)}>✕</button>
                </div>
                <pre className="agent-response-body">{agentResponse.response}</pre>
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <Terminal />
            </div>
          </div>
        </div>
      </div>
      <div className="status-bar">
        <span className="status-item">Light Code v0.1.0</span>
        <span className="status-item">
          에이전트: {activeCount}개 활성
        </span>
        <span className="status-spacer" />
        <button
          className="status-settings-btn"
          onClick={() => setShowSettings(true)}
        >
          설정
        </button>
        <span
          className={`status-item status-indicator ${llmStatus}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setShowSettings(true)}
        >
          LLM: {llmStatus === 'connected' ? '연결됨' : '미연결'}
        </span>
      </div>

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onStatusChange={(status) => setLlmStatus(status)}
        />
      )}
    </div>
  )
}
