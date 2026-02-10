import { getDb } from '../store/db'

interface UserContext {
  id: string
  brief: string
  preferences: string
  patterns: string
  updated_at: string
}

export function getUserBrief(): string {
  const row = getDb()
    .prepare('SELECT brief FROM user_context WHERE id = ?')
    .get('default') as UserContext | undefined
  return row?.brief || ''
}

export async function updateBrief(
  recentMessages: Array<{ role: string; content: string }>,
  llmCall: (messages: Array<{ role: string; content: string }>) => Promise<string>
): Promise<string> {
  const currentBrief = getUserBrief()

  const conversationSummary = recentMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')

  const prompt = `아래는 유저와의 최근 대화 내용입니다. 기존 유저 브리프를 업데이트해주세요.
유저의 작업 스타일, 선호도, 자주 하는 작업 등을 간결하게 요약합니다.
새로운 정보만 추가하고, 기존 정보와 충돌하면 최신 정보로 교체하세요.

기존 브리프:
${currentBrief || '(없음)'}

최근 대화:
${conversationSummary}

업데이트된 브리프만 출력하세요 (다른 설명 없이):`

  const updatedBrief = await llmCall([{ role: 'user', content: prompt }])

  getDb()
    .prepare("UPDATE user_context SET brief = ?, updated_at = datetime('now') WHERE id = ?")
    .run(updatedBrief.trim(), 'default')

  return updatedBrief.trim()
}

export function shouldUpdateBrief(turnCount: number): boolean {
  return turnCount > 0 && turnCount % 10 === 0
}
