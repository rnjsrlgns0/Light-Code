import { BrowserWindow } from 'electron'
import { getAuthMode, getApiKey } from './auth'
import { logger } from '../logger'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { getDb } from '../store/db'

interface AgentRow {
  id: string
  name: string
  description: string
  system_prompt: string
  status: string
  learnings: string
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

// 에이전트 전용 작업 디렉토리
function getAgentWorkDir(agentName: string): string {
  const dir = path.join(os.homedir(), 'light-code-agents', agentName)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

// 에이전트의 학습 내용을 시스템 프롬프트에 반영
function buildFullPrompt(agent: AgentRow): string {
  let prompt = agent.system_prompt

  // 학습 내용 추가
  let learnings: string[] = []
  try {
    learnings = JSON.parse(agent.learnings || '[]')
  } catch { /* ignore */ }

  if (learnings.length > 0) {
    prompt += `\n\n## 이전 학습 내용 (컨텍스트)\n`
    prompt += learnings.slice(-10).map((l, i) => `${i + 1}. ${l}`).join('\n')
  }

  // 작업 디렉토리 안내
  const workDir = getAgentWorkDir(agent.name)
  prompt += `\n\n## 도구 사용\n`
  prompt += `- 당신의 전용 작업 디렉토리: ${workDir}\n`
  prompt += `- 스크립트, 설정 파일, 출력물은 이 디렉토리에 저장하세요.\n`
  prompt += `- 필요하면 쉘 스크립트를 만들어서 반복 작업을 자동화하세요.\n`
  prompt += `- 이전에 만든 스크립트가 있으면 재활용하세요.\n`

  // 작업 디렉토리 내 기존 파일 목록 첨부
  try {
    const files = fs.readdirSync(workDir)
    if (files.length > 0) {
      prompt += `\n기존 파일 목록:\n`
      prompt += files.slice(0, 20).map(f => `- ${f}`).join('\n')
    }
  } catch { /* ignore */ }

  return prompt
}

// 에이전트 실행 (claude CLI의 tool use 활용)
export async function executeAgent(
  agentId: string,
  userMessage: string,
  win: BrowserWindow
): Promise<void> {
  const db = getDb()
  if (!db) return

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId) as AgentRow | undefined
  if (!agent) return

  const authMode = getAuthMode()
  logger.info('agent-engine', `Executing agent: ${agent.name} (mode: ${authMode})`)
  win.webContents.send('agent:executing', { agentId: agent.id, agentName: agent.name })

  try {
    const fullPrompt = buildFullPrompt(agent)
    const workDir = getAgentWorkDir(agent.name)
    let response: string

    if (authMode === 'cli') {
      const bin = findClaudeBinary()
      if (!bin) throw new Error('claude CLI not found')

      // claude CLI에 도구 사용 권한 부여
      const args = [
        '-p', '-',
        '--output-format', 'text',
        '--allowedTools', 'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
        '--append-system-prompt', fullPrompt,
        '--add-dir', workDir
      ]

      response = await new Promise((resolve, reject) => {
        const proc = spawn(bin, args, {
          env: { ...process.env },
          cwd: workDir,
          stdio: ['pipe', 'pipe', 'pipe']
        })

        let stdout = ''
        let stderr = ''

        proc.stdout.on('data', (d: Buffer) => {
          const chunk = d.toString()
          stdout += chunk
          // 스트리밍: 중간 결과를 프론트에 전송
          win.webContents.send('agent:stream', {
            agentId: agent.id,
            agentName: agent.name,
            chunk
          })
        })
        proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
        proc.on('close', (code) => {
          if (code === 0) resolve(stdout.trim())
          else reject(new Error(stderr.slice(0, 300) || `exit code ${code}`))
        })
        proc.on('error', reject)
        proc.stdin.write(userMessage)
        proc.stdin.end()
      })
    } else {
      // API mode (도구 없이 텍스트만)
      const { createRequire } = await import('module')
      const require2 = createRequire(import.meta.url || __filename)
      const Anthropic = require2('@anthropic-ai/sdk')
      const apiKey = getApiKey('claude')
      if (!apiKey) throw new Error('No API key')
      const client = new Anthropic({ apiKey })
      const resp = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: fullPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
      response = resp.content[0]?.text || ''
    }

    logger.info('agent-engine', `Agent response (${response.length} chars)`)

    // 학습 내용 자동 추출 및 저장
    await extractAndSaveLearnings(agent, userMessage, response)

    win.webContents.send('agent:response', {
      agentId: agent.id,
      agentName: agent.name,
      response
    })
  } catch (err: any) {
    logger.error('agent-engine', `Agent execution failed: ${err.message}`)
    win.webContents.send('agent:response', {
      agentId: agent.id,
      agentName: agent.name,
      response: `오류: ${err.message}`
    })
  }
}

// 실행 결과에서 학습 내용 자동 추출
async function extractAndSaveLearnings(agent: AgentRow, userMessage: string, response: string): Promise<void> {
  const db = getDb()
  if (!db) return

  // 간단한 학습: 유저가 요청한 내용 자체를 컨텍스트로 저장
  let learnings: string[] = []
  try {
    learnings = JSON.parse(agent.learnings || '[]')
  } catch { /* ignore */ }

  // 최근 요청 요약을 학습에 추가
  const summary = userMessage.slice(0, 100).replace(/\n/g, ' ')
  const timestamp = new Date().toISOString().slice(0, 16)
  learnings.push(`[${timestamp}] ${summary}`)

  // 최대 20개까지만 유지
  if (learnings.length > 20) {
    learnings = learnings.slice(-20)
  }

  db.prepare('UPDATE agents SET learnings = ?, updated_at = datetime("now") WHERE id = ?')
    .run(JSON.stringify(learnings), agent.id)

  logger.info('agent-engine', `Saved learning for ${agent.name}: ${summary}`)
}

// 활성 에이전트 중 터미널 내용과 관련 있는 에이전트 찾기
export async function matchActiveAgent(terminalContent: string): Promise<AgentRow | null> {
  const db = getDb()
  if (!db) return null

  const agents = db.prepare('SELECT * FROM agents WHERE status = ?').all('active') as AgentRow[]
  if (agents.length === 0) return null

  const authMode = getAuthMode()
  const bin = findClaudeBinary()

  // 에이전트가 1개면 바로 매칭
  if (agents.length === 1) {
    return agents[0]
  }

  // 여러 개면 LLM으로 가장 적합한 에이전트 선택
  const agentSummary = agents.map((a, i) => `${i + 1}. ${a.name}: ${a.description}`).join('\n')
  const prompt = `아래 에이전트 목록 중 유저의 현재 작업과 가장 관련 있는 에이전트 번호를 골라주세요.
관련 있는 에이전트가 없으면 0을 출력하세요. 숫자만 출력하세요.

에이전트 목록:
${agentSummary}

유저의 현재 작업:
${terminalContent.slice(-1000)}

숫자:`

  try {
    let response: string
    if (authMode === 'cli' && bin) {
      response = await new Promise((resolve, reject) => {
        const proc = spawn(bin, ['-p', '-', '--output-format', 'text'], {
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe']
        })
        let stdout = ''
        proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
        proc.on('close', (code) => {
          if (code === 0) resolve(stdout.trim())
          else reject(new Error('match failed'))
        })
        proc.on('error', reject)
        proc.stdin.write(prompt)
        proc.stdin.end()
      })
    } else {
      response = '1'
    }

    const num = parseInt(response.replace(/[^0-9]/g, ''), 10)
    if (num > 0 && num <= agents.length) {
      return agents[num - 1]
    }
    return null
  } catch {
    return agents[0]
  }
}

// 자동 개입
export async function autoIntervene(
  terminalContent: string,
  win: BrowserWindow
): Promise<boolean> {
  const agent = await matchActiveAgent(terminalContent)
  if (!agent) return false

  logger.info('agent-engine', `Auto-intervene: matched agent "${agent.name}"`)
  await executeAgent(agent.id, terminalContent.slice(-2000), win)
  return true
}
