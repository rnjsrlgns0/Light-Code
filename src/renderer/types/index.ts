export interface Agent {
  id: string
  name: string
  description: string
  status: 'active' | 'paused'
  system_prompt: string
  triggers: string
  learnings: string
  created_at: string
  updated_at: string
}

export interface Detection {
  type: 'repetitive' | 'automatable' | 'improvable'
  reason: string
  suggestion: string
}

export interface LlmResponse {
  response: string
  detection: Detection | null
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  detection?: Detection | null
}

declare global {
  interface Window {
    api: {
      llm: {
        chat: (messages: Message[], userBrief: string) => Promise<LlmResponse>
        streamChat: (messages: Message[], userBrief: string, onChunk: (chunk: string) => void) => Promise<LlmResponse>
      }
      auth: {
        getConfig: () => Promise<{ provider: string | null; configured: boolean }>
        saveApiKey: (provider: string, apiKey: string) => Promise<{ success: boolean }>
        loginCli: (provider: string) => Promise<{ success: boolean; error?: string }>
      }
      agents: {
        list: () => Promise<Agent[]>
        get: (id: string) => Promise<Agent | null>
        create: (agent: Partial<Agent>) => Promise<Agent>
        update: (id: string, data: Partial<Agent>) => Promise<Agent>
        delete: (id: string) => Promise<{ success: boolean }>
        toggleStatus: (id: string) => Promise<Agent | null>
      }
      files: {
        read: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
        write: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
        list: (dirPath: string) => Promise<{ success: boolean; entries?: any[]; error?: string }>
      }
      detection: {
        onResult: (callback: (data: {
          type: string
          reason: string
          suggestion: string
          agentName: string
          agentDescription: string
          agentPrompt: string
        }) => void) => () => void
      }
      agentEngine: {
        execute: (agentId: string, userMessage: string) => Promise<{ success: boolean }>
        onExecuting: (callback: (data: { agentId: string; agentName: string }) => void) => () => void
        onResponse: (callback: (data: { agentId: string; agentName: string; response: string }) => void) => () => void
        onStream: (callback: (data: { agentId: string; agentName: string; chunk: string }) => void) => () => void
      }
      agentBuilder: {
        chat: (detection: {
          type: string
          reason: string
          suggestion: string
          agentName: string
          agentDescription: string
          agentPrompt: string
        }, messages: { role: 'user' | 'assistant'; content: string }[]) => Promise<{
          done: boolean
          message?: string
          agent?: { name: string; description: string; systemPrompt: string }
        }>
      }
      terminal: {
        create: () => Promise<{ success: boolean; pid?: number }>
        input: (data: string) => void
        resize: (cols: number, rows: number) => void
        onData: (callback: (data: string) => void) => () => void
        dispose: () => Promise<{ success: boolean }>
      }
    }
  }
}
