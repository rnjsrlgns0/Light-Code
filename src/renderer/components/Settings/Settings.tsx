import React, { useState, useEffect } from 'react'
import './Settings.css'

interface SettingsProps {
  onClose: () => void
  onStatusChange: (status: 'connected' | 'disconnected') => void
}

export default function Settings({ onClose, onStatusChange }: SettingsProps): React.ReactElement {
  const [mode, setMode] = useState<'api' | 'cli'>('api')
  const [provider, setProvider] = useState<'claude' | 'openai'>('claude')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    window.api.auth.getConfig().then((config) => {
      if (config.provider) setProvider(config.provider as 'claude' | 'openai')
    })
  }, [])

  const handleSaveApiKey = async (): Promise<void> => {
    if (!apiKey.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      // Set mode to api
      await window.api.auth.loginCli('') // reset
      const result = await window.api.auth.saveApiKey(provider, apiKey.trim())
      if (result.success) {
        setMessage({ type: 'success', text: `${provider} API key 저장 완료` })
        setApiKey('')
        onStatusChange('connected')
      } else {
        setMessage({ type: 'error', text: '저장 실패' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleCliMode = async (): Promise<void> => {
    setSaving(true)
    setMessage(null)
    try {
      const result = await window.api.auth.loginCli('claude')
      if (result.success) {
        setMessage({ type: 'success', text: 'CLI 모드 활성화 (claude 구독 사용)' })
        onStatusChange('connected')
      } else {
        setMessage({ type: 'error', text: result.error || '실패' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span>LLM 설정</span>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${mode === 'cli' ? 'active' : ''}`}
            onClick={() => setMode('cli')}
          >
            CLI 구독
          </button>
          <button
            className={`settings-tab ${mode === 'api' ? 'active' : ''}`}
            onClick={() => setMode('api')}
          >
            API Key
          </button>
        </div>

        {mode === 'cli' && (
          <div className="settings-section">
            <p className="settings-desc">
              Claude CLI 구독을 사용합니다. 터미널에서 <code>claude</code> 명령이 동작해야 합니다.
            </p>
            <button
              className="settings-btn primary"
              onClick={handleCliMode}
              disabled={saving}
            >
              {saving ? '설정 중...' : 'CLI 모드 활성화'}
            </button>
          </div>
        )}

        {mode === 'api' && (
          <div className="settings-section">
            <div className="settings-provider-select">
              <button
                className={`settings-provider ${provider === 'claude' ? 'active' : ''}`}
                onClick={() => setProvider('claude')}
              >
                Claude
              </button>
              <button
                className={`settings-provider ${provider === 'openai' ? 'active' : ''}`}
                onClick={() => setProvider('openai')}
              >
                OpenAI
              </button>
            </div>
            <input
              className="settings-input"
              type="password"
              placeholder={`${provider === 'claude' ? 'sk-ant-...' : 'sk-...'}`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
            />
            <button
              className="settings-btn primary"
              onClick={handleSaveApiKey}
              disabled={!apiKey.trim() || saving}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}

        {message && (
          <div className={`settings-message ${message.type}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
