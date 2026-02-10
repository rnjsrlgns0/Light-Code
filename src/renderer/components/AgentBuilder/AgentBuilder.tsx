import React, { useState, useEffect, useRef } from 'react'
import './AgentBuilder.css'

interface DetectionResult {
  type: string
  reason: string
  suggestion: string
  agentName: string
  agentDescription: string
  agentPrompt: string
}

interface BuilderMessage {
  role: 'user' | 'assistant'
  content: string
}

interface FinalAgent {
  name: string
  description: string
  systemPrompt: string
}

interface Props {
  detection: DetectionResult
  onComplete: (agent: FinalAgent) => void
  onCancel: () => void
}

export default function AgentBuilder({ detection, onComplete, onCancel }: Props): React.ReactElement {
  const [messages, setMessages] = useState<BuilderMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [finalAgent, setFinalAgent] = useState<FinalAgent | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Start conversation on mount
  useEffect(() => {
    startConversation()
  }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const startConversation = async (): Promise<void> => {
    setLoading(true)
    try {
      const response = await window.api.agentBuilder.chat(detection, [])
      if (response.done && response.agent) {
        setFinalAgent(response.agent)
      } else {
        setMessages([{ role: 'assistant', content: response.message }])
      }
    } catch {
      setMessages([{ role: 'assistant', content: '에이전트 빌더를 시작할 수 없습니다.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSend = async (): Promise<void> => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: BuilderMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await window.api.agentBuilder.chat(detection, newMessages)
      if (response.done && response.agent) {
        setFinalAgent(response.agent)
        setMessages([...newMessages, { role: 'assistant', content: '답변을 바탕으로 에이전트를 구성했습니다. 아래 내용을 확인해주세요.' }])
      } else {
        setMessages([...newMessages, { role: 'assistant', content: response.message }])
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: '오류가 발생했습니다.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="agent-builder">
      <div className="builder-header">
        <span className="builder-title">에이전트 빌더</span>
        <button className="builder-cancel" onClick={onCancel}>취소</button>
      </div>

      <div className="builder-context">
        <span className="builder-context-label">감지됨</span>
        <span className="builder-context-text">{detection.reason}</span>
      </div>

      <div className="builder-messages" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`builder-msg ${msg.role}`}>
            <span className="builder-msg-label">{msg.role === 'assistant' ? 'AI' : '나'}</span>
            <p className="builder-msg-text">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="builder-msg assistant">
            <span className="builder-msg-label">AI</span>
            <p className="builder-msg-text builder-typing">생각 중...</p>
          </div>
        )}
      </div>

      {finalAgent && (
        <div className="builder-preview">
          <div className="builder-preview-header">에이전트 미리보기</div>
          <div className="builder-preview-field">
            <label>이름</label>
            <span>{finalAgent.name}</span>
          </div>
          <div className="builder-preview-field">
            <label>설명</label>
            <span>{finalAgent.description}</span>
          </div>
          <div className="builder-preview-field">
            <label>시스템 프롬프트</label>
            <p className="builder-preview-prompt">{finalAgent.systemPrompt}</p>
          </div>
          <button className="builder-confirm" onClick={() => onComplete(finalAgent)}>
            이 에이전트 생성하기
          </button>
        </div>
      )}

      {!finalAgent && (
        <div className="builder-input-area">
          <input
            ref={inputRef}
            className="builder-input"
            placeholder="답변을 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button className="builder-send" onClick={handleSend} disabled={loading || !input.trim()}>
            전송
          </button>
        </div>
      )}
    </div>
  )
}
