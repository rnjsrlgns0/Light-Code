import { IpcMain, BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { getApiKey, getAuthMode } from './auth'
import { getActiveAgents } from '../agents/engine'
import { getUserBrief, updateBrief, shouldUpdateBrief } from '../agents/context'
import { logger } from '../logger'

interface Detection {
  type: 'repetitive' | 'automatable' | 'improvable'
  reason: string
  suggestion: string
}

interface LlmResponse {
  response: string
  detection: Detection | null
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

let turnCount = 0

function buildSystemPrompt(userBrief: string, agents: { name: string; description: string }[]): string {
  return `당신은 유저의 AI 작업 도우미입니다.

유저 정보:
${userBrief || '아직 유저 정보가 없습니다.'}

현재 활성 에이전트:
${agents.map((a) => `- ${a.name}: ${a.description}`).join('\n') || '없음'}

모든 응답을 아래 JSON 형식으로 반환하세요:
{
  "response": "유저에게 보여줄 응답",
  "detection": null 또는 {
    "type": "repetitive | automatable | improvable",
    "reason": "왜 자동화가 가능한지",
    "suggestion": "유저에게 제안할 내용"
  }
}`
}

function parseResponse(raw: string): LlmResponse {
  try {
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim()
    const parsed = JSON.parse(jsonStr)
    return {
      response: parsed.response || raw,
      detection: parsed.detection || null
    }
  } catch {
    return { response: raw, detection: null }
  }
}

// ─── CLI Mode ───

function findClaudeBinary(): string | null {
  const paths = [
    '/usr/local/bin/claude',
    '/usr/bin/claude',
    `${process.env.HOME}/.local/bin/claude`,
    `${process.env.HOME}/.npm-global/bin/claude`
  ]
  const fs = require('fs')
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }
  return null
}

async function callClaudeCli(
  systemPrompt: string,
  messages: Message[]
): Promise<string> {
  const bin = findClaudeBinary()
  if (!bin) throw new Error('claude CLI를 찾을 수 없습니다. claude CLI를 설치해주세요.')

  const lastMessage = messages[messages.length - 1]?.content || ''

  return new Promise((resolve, reject) => {
    const args = [
      '-p', lastMessage,
      '--append-system-prompt', systemPrompt,
      '--output-format', 'text'
    ]

    logger.info('llm-cli', `Spawning: ${bin} ${args.join(' ').slice(0, 100)}...`)

    const proc = spawn(bin, args, {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString() })
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

    proc.on('close', (code) => {
      if (code === 0) {
        logger.info('llm-cli', `CLI response received (${stdout.length} chars)`)
        resolve(stdout.trim())
      } else {
        logger.error('llm-cli', `CLI exited with code ${code}`, stderr)
        reject(new Error(`claude CLI 오류 (code ${code}): ${stderr.slice(0, 200)}`))
      }
    })

    proc.on('error', (err) => {
      logger.error('llm-cli', `CLI spawn failed: ${err.message}`)
      reject(err)
    })
  })
}

async function streamClaudeCli(
  systemPrompt: string,
  messages: Message[],
  onChunk: (chunk: string) => void
): Promise<string> {
  const bin = findClaudeBinary()
  if (!bin) throw new Error('claude CLI를 찾을 수 없습니다.')

  const lastMessage = messages[messages.length - 1]?.content || ''

  return new Promise((resolve, reject) => {
    const args = [
      '-p', lastMessage,
      '--append-system-prompt', systemPrompt,
      '--output-format', 'stream-json'
    ]

    logger.info('llm-cli', `Streaming CLI: ${bin}`)

    const proc = spawn(bin, args, {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let fullText = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const event = JSON.parse(line)
          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text
            onChunk(event.delta.text)
          } else if (event.type === 'result' && event.result) {
            fullText = event.result
          }
        } catch {
          // Non-JSON line, accumulate as text
          fullText += line
          onChunk(line)
        }
      }
    })

    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

    proc.on('close', (code) => {
      if (code === 0) {
        logger.info('llm-cli', `CLI stream complete (${fullText.length} chars)`)
        resolve(fullText.trim())
      } else {
        logger.error('llm-cli', `CLI stream error (code ${code})`, stderr)
        reject(new Error(`claude CLI 오류: ${stderr.slice(0, 200)}`))
      }
    })

    proc.on('error', reject)
  })
}

// ─── API Mode ───

async function callClaude(apiKey: string, systemPrompt: string, messages: Message[]): Promise<string> {
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content }))
  })
  const block = response.content[0]
  return block.type === 'text' ? block.text : ''
}

async function callOpenAI(apiKey: string, systemPrompt: string, messages: Message[]): Promise<string> {
  const client = new OpenAI({ apiKey })
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    ]
  })
  return response.choices[0]?.message?.content || ''
}

async function streamClaude(apiKey: string, systemPrompt: string, messages: Message[], onChunk: (chunk: string) => void): Promise<string> {
  const client = new Anthropic({ apiKey })
  let fullText = ''
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content }))
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text
      onChunk(event.delta.text)
    }
  }
  return fullText
}

async function streamOpenAI(apiKey: string, systemPrompt: string, messages: Message[], onChunk: (chunk: string) => void): Promise<string> {
  const client = new OpenAI({ apiKey })
  let fullText = ''
  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    ]
  })
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || ''
    if (text) { fullText += text; onChunk(text) }
  }
  return fullText
}

// ─── Provider Resolution ───

type ProviderInfo =
  | { mode: 'api'; provider: string; apiKey: string }
  | { mode: 'cli'; provider: 'claude' }
  | null

function getProviderInfo(): ProviderInfo {
  const authMode = getAuthMode()

  if (authMode === 'cli') {
    if (findClaudeBinary()) {
      return { mode: 'cli', provider: 'claude' }
    }
    return null
  }

  // API mode
  const claudeKey = getApiKey('claude')
  if (claudeKey) return { mode: 'api', provider: 'claude', apiKey: claudeKey }
  const openaiKey = getApiKey('openai')
  if (openaiKey) return { mode: 'api', provider: 'openai', apiKey: openaiKey }
  return null
}

// ─── IPC Handlers ───

export function registerLlmHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('llm:chat', async (_event, messages: Message[], _userBrief: string): Promise<LlmResponse> => {
    const lastMsg = messages[messages.length - 1]
    logger.info('llm', `Chat request (turn ${turnCount + 1})`, { messageCount: messages.length, lastMessage: lastMsg?.content?.slice(0, 100) })

    const provider = getProviderInfo()
    if (!provider) {
      logger.warn('llm', 'No LLM provider configured')
      return { response: 'LLM이 설정되지 않았습니다. API key를 입력하거나 claude CLI를 설치해주세요.', detection: null }
    }

    const agents = getActiveAgents()
    const brief = getUserBrief()
    const systemPrompt = buildSystemPrompt(brief, agents)
    logger.debug('llm', `Mode: ${provider.mode}, provider: ${provider.provider}, agents: ${agents.length}`)

    let raw: string
    try {
      if (provider.mode === 'cli') {
        raw = await callClaudeCli(systemPrompt, messages)
      } else if (provider.provider === 'claude') {
        raw = await callClaude(provider.apiKey, systemPrompt, messages)
      } else {
        raw = await callOpenAI(provider.apiKey, systemPrompt, messages)
      }
      logger.info('llm', `Response received (${raw.length} chars)`)
    } catch (err: any) {
      logger.error('llm', `LLM call failed: ${err.message}`, err.stack)
      return { response: `오류 발생: ${err.message}`, detection: null }
    }

    turnCount++
    if (shouldUpdateBrief(turnCount)) {
      logger.info('llm', `Triggering brief update at turn ${turnCount}`)
      const recentMessages = messages.slice(-10)
      const callLlm = async (msgs: Message[]) => {
        if (provider.mode === 'cli') {
          return callClaudeCli('당신은 유저 프로필 요약 도우미입니다.', msgs)
        } else if (provider.provider === 'claude') {
          return callClaude((provider as any).apiKey, '당신은 유저 프로필 요약 도우미입니다.', msgs)
        } else {
          return callOpenAI((provider as any).apiKey, '당신은 유저 프로필 요약 도우미입니다.', msgs)
        }
      }
      updateBrief(recentMessages, callLlm).catch((err) => { logger.error('llm', 'Brief update failed', err.message) })
    }

    const result = parseResponse(raw)
    logger.info('llm', `Parsed response`, { hasDetection: !!result.detection, detectionType: result.detection?.type })
    return result
  })

  ipcMain.handle('llm:stream-chat', async (event, messages: Message[], _userBrief: string, channel: string): Promise<LlmResponse> => {
    const lastMsg = messages[messages.length - 1]
    logger.info('llm', `Stream chat request (turn ${turnCount + 1})`, { messageCount: messages.length, lastMessage: lastMsg?.content?.slice(0, 100) })

    const provider = getProviderInfo()
    if (!provider) {
      logger.warn('llm', 'No LLM provider configured (stream)')
      return { response: 'LLM이 설정되지 않았습니다.', detection: null }
    }

    const agents = getActiveAgents()
    const brief = getUserBrief()
    const systemPrompt = buildSystemPrompt(brief, agents)

    const win = BrowserWindow.fromWebContents(event.sender)
    let chunkCount = 0
    const onChunk = (chunk: string): void => {
      chunkCount++
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, chunk)
      }
    }

    let raw: string
    try {
      if (provider.mode === 'cli') {
        raw = await streamClaudeCli(systemPrompt, messages, onChunk)
      } else if (provider.provider === 'claude') {
        raw = await streamClaude(provider.apiKey, systemPrompt, messages, onChunk)
      } else {
        raw = await streamOpenAI(provider.apiKey, systemPrompt, messages, onChunk)
      }
      logger.info('llm', `Stream complete (${chunkCount} chunks, ${raw.length} chars)`)
    } catch (err: any) {
      logger.error('llm', `Stream failed: ${err.message}`, err.stack)
      return { response: `오류 발생: ${err.message}`, detection: null }
    }

    turnCount++
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, '[DONE]')
    }

    const result = parseResponse(raw)
    logger.info('llm', `Stream parsed`, { hasDetection: !!result.detection, detectionType: result.detection?.type })
    return result
  })
}
