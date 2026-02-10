import { IpcMain } from 'electron'
import { getAuthMode, getApiKey } from './auth'
import { logger } from '../logger'
import { spawn } from 'child_process'
import fs from 'fs'

interface DetectionContext {
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

function findClaudeBinary(): string | null {
  const paths = [
    '/usr/local/bin/claude',
    '/usr/bin/claude',
    `${process.env.HOME}/.local/bin/claude`,
    `${process.env.HOME}/.npm-global/bin/claude`
  ]
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function buildPrompt(detection: DetectionContext, conversation: BuilderMessage[]): string {
  const system = `당신은 AI 에이전트를 정밀하게 설계하는 빌더입니다.

유저의 작업 패턴을 분석한 결과, 아래와 같은 에이전트가 유용할 것으로 판단되었습니다:
- 감지된 작업: ${detection.reason}
- 제안: ${detection.suggestion}
- 초안 이름: ${detection.agentName}
- 초안 설명: ${detection.agentDescription}

이 초안을 기반으로, 유저에게 구체적인 질문을 해서 에이전트를 정밀하게 만들어야 합니다.

규칙:
1. 한 번에 질문 1개만. 짧고 구체적으로.
2. 3~5개 질문 후 충분한 정보가 모이면 최종 에이전트를 생성하세요.
3. 질문할 때는 자연스러운 한국어로 대화하세요.
4. 최종 에이전트를 생성할 때는 반드시 아래 JSON 형식으로만 출력하세요:

\`\`\`json
{"done": true, "agent": {"name": "에이전트-이름", "description": "에이전트 설명", "systemPrompt": "상세한 시스템 프롬프트"}}
\`\`\`

systemPrompt는 에이전트가 실제로 동작할 때 사용할 지시사항입니다. 유저의 답변을 반영하여 최대한 구체적이고 실용적으로 작성하세요.`

  let fullPrompt = system + '\n\n'

  if (conversation.length === 0) {
    fullPrompt += '유저에게 첫 번째 질문을 하세요. 이 에이전트를 어떻게 쓸 건지 파악하기 위한 가장 중요한 질문부터 시작하세요.'
  } else {
    fullPrompt += '대화 기록:\n'
    for (const msg of conversation) {
      fullPrompt += msg.role === 'user' ? `유저: ${msg.content}\n` : `빌더: ${msg.content}\n`
    }
    fullPrompt += '\n다음 질문을 하거나, 충분한 정보가 모였으면 최종 에이전트 JSON을 출력하세요.'
  }

  return fullPrompt
}

async function callLlm(prompt: string): Promise<string> {
  const authMode = getAuthMode()

  if (authMode === 'cli') {
    const bin = findClaudeBinary()
    if (!bin) throw new Error('claude CLI not found')

    return new Promise((resolve, reject) => {
      const proc = spawn(bin, ['-p', '-', '--output-format', 'text'], {
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      })
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
      proc.on('close', (code) => {
        if (code === 0) resolve(stdout.trim())
        else reject(new Error(stderr.slice(0, 200)))
      })
      proc.on('error', reject)
      proc.stdin.write(prompt)
      proc.stdin.end()
    })
  }

  // API mode
  const { createRequire } = await import('module')
  const require2 = createRequire(import.meta.url || __filename)
  const Anthropic = require2('@anthropic-ai/sdk')
  const apiKey = getApiKey('claude')
  if (!apiKey) throw new Error('No API key')
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  })
  return response.content[0]?.text || ''
}

export function registerAgentBuilderHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('agent-builder:chat', async (_event, detection: DetectionContext, conversation: BuilderMessage[]) => {
    try {
      const prompt = buildPrompt(detection, conversation)
      logger.info('agent-builder', `Chat turn ${conversation.length}, sending to LLM`)

      const raw = await callLlm(prompt)
      logger.info('agent-builder', `Response: ${raw.slice(0, 200)}`)

      // Check if response contains final agent JSON
      const jsonMatch = raw.match(/\{[\s\S]*"done"\s*:\s*true[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const result = JSON.parse(jsonMatch[0])
          if (result.done && result.agent) {
            logger.info('agent-builder', `Final agent generated: ${result.agent.name}`)
            return { done: true, agent: result.agent }
          }
        } catch {
          // JSON parse failed, treat as regular message
        }
      }

      // Strip any markdown code blocks from the message
      const cleanMessage = raw
        .replace(/```json[\s\S]*?```/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .trim()

      return { done: false, message: cleanMessage || raw.trim() }
    } catch (err: any) {
      logger.error('agent-builder', `Chat failed: ${err.message}`)
      return { done: false, message: '오류가 발생했습니다. 다시 시도해주세요.' }
    }
  })
}
