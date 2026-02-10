import { BrowserWindow } from 'electron'
import { getApiKey, getAuthMode } from './auth'
import { getActiveAgents } from '../agents/engine'
import { getUserBrief } from '../agents/context'
import { autoIntervene } from './agent-engine'
import { logger } from '../logger'
import { spawn } from 'child_process'
import fs from 'fs'

let analyzing = false

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

// 터미널 출력 정리 (ANSI + CLI 장식 제거)
function cleanTerminalOutput(text: string): string {
  let cleaned = text
    // ANSI escape sequences → 공백으로 치환 (커서 이동이 공백 역할)
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, ' ')
    .replace(/\x1b\].*?\x07/g, ' ')
    .replace(/\x1b[()][AB012]/g, '')
    .replace(/\x1b\[[\?][0-9;]*[a-zA-Z]/g, '')
    // control chars
    .replace(/[\x00-\x08\x0e-\x1f]/g, '')
    .replace(/\r/g, '')
    // box-drawing / decorative Unicode
    .replace(/[─━│┃╭╮╰╯┌┐└┘├┤┬┴┼╔╗╚╝║═╠╣╦╩╬▐▌▛▜▝▀▄█▓▒░◯●◆■□▲△▶▷◀◁▼▽⬛⬜☰☱☲☳☴☵☶☷]/g, '')
    // braille pattern chars (Unicode art)
    .replace(/[\u2800-\u28FF]/g, '')
    // repeated decoration lines (3+ same char)
    .replace(/([─━═\-~*]{3,})/g, '')
    // [?2004h] [?2026l] etc. terminal mode sequences
    .replace(/\[\?[0-9;]*[a-zA-Z]/g, '')
    // 연속 공백 정리
    .replace(/ {2,}/g, ' ')

  // 빈 줄, 공백만 있는 줄 정리
  cleaned = cleaned
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.trim().length > 0)
    .join('\n')

  return cleaned
}

async function callLlmForDetection(prompt: string): Promise<string> {
  const authMode = getAuthMode()

  if (authMode === 'cli') {
    const bin = findClaudeBinary()
    if (!bin) throw new Error('claude CLI not found')

    return new Promise((resolve, reject) => {
      // stdin으로 프롬프트 전달 (긴 텍스트 안전 처리)
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

      // stdin에 프롬프트 쓰고 닫기
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
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  })
  return response.content[0]?.text || ''
}

export async function analyzeForDetection(terminalContent: string, win: BrowserWindow): Promise<void> {
  if (analyzing) return
  analyzing = true

  try {
    const brief = getUserBrief()
    const agents = getActiveAgents()
    const agentList = agents.map(a => a.name).join(', ') || '없음'

    // ANSI 제거된 깨끗한 텍스트만 사용
    const cleanContent = cleanTerminalOutput(terminalContent).trim()
    if (cleanContent.length < 50) {
      logger.debug('detection', 'Content too short after cleanup, skipping')
      return
    }

    const prompt = `당신은 유저의 작업을 관찰하는 AI 비서입니다.
아래는 유저가 터미널에서 AI와 대화하거나 작업한 내용입니다.

유저가 직접 "자동화해줘"라고 말하지 않아도, 유저가 하고 있는 작업 자체를 보고 판단하세요:
- 이 작업이 전용 AI 도우미(에이전트)를 만들어두면 더 편해질 수 있는 종류인가?
- 예: 미팅 정리, 이메일 작성, 데이터 정리, 보고서 작성, 코드 리뷰, 번역 등
- 이미 기존 에이전트가 있으면 중복 제안하지 마세요.
- ls, cd, git 같은 단순 쉘 명령은 무시하세요.

유저 정보: ${brief || '아직 없음'}
기존 에이전트: ${agentList}

터미널 내용:
---
${cleanContent.slice(-3000)}
---

이 작업에 전용 에이전트를 만들면 유용하겠다고 판단되면:
{"detected": true, "type": "automatable", "reason": "유저가 어떤 작업을 하고 있는지 한 줄 설명", "suggestion": "이런 에이전트를 만들면 다음에 더 편합니다", "agentName": "에이전트 이름", "agentDescription": "이 에이전트가 하는 일", "agentPrompt": "이 에이전트의 시스템 프롬프트 (구체적으로)"}

아직 판단하기 이르거나, 단순한 명령어 실행이면:
{"detected": false}

JSON만 출력하세요.`

    logger.info('detection', `Calling LLM (clean content: ${cleanContent.length} chars)`)
    logger.debug('detection', `Clean content sample: ${cleanContent.slice(-500)}`)
    const raw = await callLlmForDetection(prompt)
    logger.info('detection', `LLM response: ${raw.slice(0, 200)}`)

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.debug('detection', 'No JSON in response')
      return
    }

    const result = JSON.parse(jsonMatch[0])

    if (result.detected) {
      logger.info('detection', `Detection found: ${result.type} - ${result.agentName}`)
      win.webContents.send('detection:result', {
        type: result.type,
        reason: result.reason,
        suggestion: result.suggestion,
        agentName: result.agentName,
        agentDescription: result.agentDescription,
        agentPrompt: result.agentPrompt
      })
    } else {
      // detection 없으면 → 활성 에이전트 중 관련 있는 게 있는지 확인 후 자동 개입
      logger.info('detection', 'No new detection, checking active agents for auto-intervene')
      await autoIntervene(cleanContent, win)
    }
  } catch (err: any) {
    logger.error('detection', `Analysis failed: ${err.message}`)
  } finally {
    analyzing = false
  }
}
