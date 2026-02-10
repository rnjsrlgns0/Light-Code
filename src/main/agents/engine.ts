import { getDb } from '../store/db'

interface Agent {
  id: string
  name: string
  description: string
  status: string
  system_prompt: string
  triggers: string
  learnings: string
}

interface AgentRunResult {
  agentId: string
  response: string
  success: boolean
}

export function getActiveAgents(): Agent[] {
  return getDb()
    .prepare("SELECT * FROM agents WHERE status = 'active'")
    .all() as Agent[]
}

export async function runAgent(
  agentId: string,
  userMessage: string,
  llmCall: (systemPrompt: string, messages: Array<{ role: string; content: string }>) => Promise<string>
): Promise<AgentRunResult> {
  const agent = getDb()
    .prepare('SELECT * FROM agents WHERE id = ?')
    .get(agentId) as Agent | undefined

  if (!agent) {
    return { agentId, response: '', success: false }
  }

  let learnings: string[] = []
  try {
    learnings = JSON.parse(agent.learnings || '[]')
  } catch {
    learnings = []
  }

  const systemPrompt = buildAgentPrompt(agent, learnings)

  const response = await llmCall(systemPrompt, [
    { role: 'user', content: userMessage }
  ])

  return { agentId, response, success: true }
}

function buildAgentPrompt(agent: Agent, learnings: string[]): string {
  let prompt = agent.system_prompt || `당신은 "${agent.name}" 에이전트입니다.\n${agent.description}`

  if (learnings.length > 0) {
    prompt += `\n\n이전에 학습한 내용:\n${learnings.map((l) => `- ${l}`).join('\n')}`
  }

  return prompt
}

export function addLearning(agentId: string, learning: string): void {
  const agent = getDb()
    .prepare('SELECT learnings FROM agents WHERE id = ?')
    .get(agentId) as { learnings: string } | undefined

  if (!agent) return

  let learnings: string[] = []
  try {
    learnings = JSON.parse(agent.learnings || '[]')
  } catch {
    learnings = []
  }

  learnings.push(learning)

  // Keep only the last 50 learnings
  if (learnings.length > 50) {
    learnings = learnings.slice(-50)
  }

  getDb()
    .prepare("UPDATE agents SET learnings = ?, updated_at = datetime('now') WHERE id = ?")
    .run(JSON.stringify(learnings), agentId)
}
