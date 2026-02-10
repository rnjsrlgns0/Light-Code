import React, { useEffect, useState } from 'react'
import { useAgentStore } from '../../stores/agentStore'
import AgentBuilder from '../AgentBuilder/AgentBuilder'
import type { Agent } from '../../types'
import './AgentList.css'

interface DetectionResult {
  type: string
  reason: string
  suggestion: string
  agentName: string
  agentDescription: string
  agentPrompt: string
}

function AgentCard({ agent, onSelect }: { agent: Agent; onSelect: (agent: Agent) => void }): React.ReactElement {
  const { toggleAgent, deleteAgent } = useAgentStore()

  return (
    <div className="agent-card" onClick={() => onSelect(agent)}>
      <div className="agent-card-header">
        <span className="agent-name">{agent.name}</span>
        <div className="agent-actions">
          <button
            className={`toggle-btn ${agent.status === 'active' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleAgent(agent.id) }}
            title={agent.status === 'active' ? '비활성화' : '활성화'}
          >
            {agent.status === 'active' ? 'ON' : 'OFF'}
          </button>
          <button
            className="delete-btn"
            onClick={(e) => { e.stopPropagation(); deleteAgent(agent.id) }}
            title="삭제"
          >
            ✕
          </button>
        </div>
      </div>
      <p className="agent-description">{agent.description}</p>
      <span className={`agent-status ${agent.status}`}>
        {agent.status === 'active' ? '활성' : '일시정지'}
      </span>
    </div>
  )
}

function AgentDetail({ agent, onBack, onRun }: {
  agent: Agent
  onBack: () => void
  onRun: (agent: Agent) => void
}): React.ReactElement {
  const { toggleAgent, deleteAgent, updateAgent } = useAgentStore()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(agent.name)
  const [editDesc, setEditDesc] = useState(agent.description)
  const [editPrompt, setEditPrompt] = useState(agent.system_prompt)
  const [saving, setSaving] = useState(false)

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      await updateAgent(agent.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        system_prompt: editPrompt.trim()
      })
      setEditing(false)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  return (
    <div className="agent-detail">
      <div className="agent-detail-header">
        <button className="agent-detail-back" onClick={onBack}>← 목록</button>
        <div className="agent-detail-actions">
          <button
            className={`toggle-btn ${agent.status === 'active' ? 'active' : ''}`}
            onClick={() => toggleAgent(agent.id)}
          >
            {agent.status === 'active' ? 'ON' : 'OFF'}
          </button>
          <button className="delete-btn" onClick={() => { deleteAgent(agent.id); onBack() }}>삭제</button>
        </div>
      </div>

      {!editing ? (
        <>
          <div className="agent-detail-section">
            <label>이름</label>
            <p className="agent-detail-value">{agent.name}</p>
          </div>
          <div className="agent-detail-section">
            <label>설명</label>
            <p className="agent-detail-value">{agent.description}</p>
          </div>
          <div className="agent-detail-section">
            <label>시스템 프롬프트</label>
            <pre className="agent-detail-prompt">{agent.system_prompt}</pre>
          </div>
          <div className="agent-detail-section">
            <label>상태</label>
            <span className={`agent-status ${agent.status}`}>
              {agent.status === 'active' ? '활성' : '일시정지'}
            </span>
          </div>
          <div className="agent-detail-section">
            <label>생성일</label>
            <p className="agent-detail-value agent-detail-date">{new Date(agent.created_at).toLocaleString('ko-KR')}</p>
          </div>
          <div className="agent-detail-buttons">
            <button className="agent-detail-edit-btn" onClick={() => setEditing(true)}>편집</button>
            <button className="agent-detail-run-btn" onClick={() => onRun(agent)}>실행</button>
          </div>
        </>
      ) : (
        <>
          <div className="agent-detail-section">
            <label>이름</label>
            <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="agent-detail-section">
            <label>설명</label>
            <input className="form-input" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
          </div>
          <div className="agent-detail-section">
            <label>시스템 프롬프트</label>
            <textarea className="form-textarea agent-detail-prompt-edit" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={10} />
          </div>
          <div className="agent-detail-buttons">
            <button className="agent-detail-edit-btn" onClick={() => setEditing(false)}>취소</button>
            <button className="agent-detail-run-btn" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function DetectionCard({ detection, onAccept, onDismiss }: {
  detection: DetectionResult
  onAccept: () => void
  onDismiss: () => void
}): React.ReactElement {
  return (
    <div className="detection-card">
      <div className="detection-header">
        <span className="detection-badge">{detection.type}</span>
        <button className="delete-btn" onClick={onDismiss}>✕</button>
      </div>
      <p className="detection-reason">{detection.reason}</p>
      <p className="detection-suggestion">{detection.suggestion}</p>
      <div className="detection-agent-preview">
        <span className="detection-agent-name">{detection.agentName}</span>
        <p className="detection-agent-desc">{detection.agentDescription}</p>
      </div>
      <button className="detection-accept-btn" onClick={onAccept}>
        에이전트 만들기
      </button>
    </div>
  )
}

function CreateAgentForm({ onClose }: { onClose: () => void }): React.ReactElement {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [creating, setCreating] = useState(false)
  const { createAgent } = useAgentStore()

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim()) return
    setCreating(true)
    try {
      await createAgent({
        name: name.trim(),
        description: description.trim(),
        systemPrompt: systemPrompt.trim()
      })
      onClose()
    } catch {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="agent-create-form">
      <div className="form-header">
        <span>새 에이전트</span>
        <button className="delete-btn" onClick={onClose}>✕</button>
      </div>
      <input
        className="form-input"
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <input
        className="form-input"
        placeholder="설명 (역할)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <textarea
        className="form-textarea"
        placeholder="시스템 프롬프트 (선택)"
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        rows={3}
      />
      <button
        className="form-submit"
        onClick={handleSubmit}
        disabled={!name.trim() || creating}
      >
        {creating ? '생성 중...' : '생성'}
      </button>
    </div>
  )
}

export default function AgentList(): React.ReactElement {
  const { agents, loading, fetchAgents, createAgent } = useAgentStore()
  const [showForm, setShowForm] = useState(false)
  const [detections, setDetections] = useState<DetectionResult[]>([])
  const [buildingDetection, setBuildingDetection] = useState<DetectionResult | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  // 선택된 에이전트가 업데이트되면 반영
  useEffect(() => {
    if (selectedAgent) {
      const updated = agents.find(a => a.id === selectedAgent.id)
      if (updated) setSelectedAgent(updated)
      else setSelectedAgent(null)
    }
  }, [agents])

  // detection 결과 수신
  useEffect(() => {
    const remove = window.api.detection.onResult((data) => {
      setDetections((prev) => [data, ...prev])
    })
    return remove
  }, [])

  const handleStartBuild = (detection: DetectionResult): void => {
    setBuildingDetection(detection)
    setDetections((prev) => prev.filter((d) => d !== detection))
  }

  const handleBuildComplete = async (agent: { name: string; description: string; systemPrompt: string }): Promise<void> => {
    await createAgent({
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt
    })
    setBuildingDetection(null)
  }

  const handleDismissDetection = (detection: DetectionResult): void => {
    setDetections((prev) => prev.filter((d) => d !== detection))
  }

  const handleRunAgent = (agent: Agent): void => {
    const userMessage = prompt('에이전트에게 전달할 메시지를 입력하세요:')
    if (!userMessage?.trim()) return
    window.api.agentEngine.execute(agent.id, userMessage.trim())
    setSelectedAgent(null)
  }

  // 빌더 모드
  if (buildingDetection) {
    return (
      <AgentBuilder
        detection={buildingDetection}
        onComplete={handleBuildComplete}
        onCancel={() => setBuildingDetection(null)}
      />
    )
  }

  // 상세보기 모드
  if (selectedAgent) {
    return (
      <AgentDetail
        agent={selectedAgent}
        onBack={() => setSelectedAgent(null)}
        onRun={handleRunAgent}
      />
    )
  }

  return (
    <div className="agent-list">
      <div className="agent-list-toolbar">
        <button
          className="add-agent-btn"
          onClick={() => setShowForm(!showForm)}
          title="에이전트 추가"
        >
          + 추가
        </button>
      </div>

      {/* Detection 제안 알림 */}
      {detections.map((d, i) => (
        <DetectionCard
          key={`detection-${i}`}
          detection={d}
          onAccept={() => handleStartBuild(d)}
          onDismiss={() => handleDismissDetection(d)}
        />
      ))}

      {showForm && <CreateAgentForm onClose={() => setShowForm(false)} />}

      {loading && (
        <div className="agent-list-empty">
          <p>로딩 중...</p>
        </div>
      )}

      {!loading && agents.length === 0 && !showForm && detections.length === 0 && (
        <div className="agent-list-empty">
          <p>아직 에이전트가 없습니다</p>
        </div>
      )}

      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} onSelect={setSelectedAgent} />
      ))}
    </div>
  )
}
