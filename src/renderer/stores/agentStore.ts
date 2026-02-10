import { create } from 'zustand'
import type { Agent } from '../types'

interface CreateAgentInput {
  name: string
  description: string
  systemPrompt?: string
  triggers?: string[]
}

interface AgentStore {
  agents: Agent[]
  loading: boolean
  fetchAgents: () => Promise<void>
  createAgent: (input: CreateAgentInput) => Promise<Agent>
  updateAgent: (id: string, data: Partial<Agent>) => Promise<void>
  toggleAgent: (id: string) => Promise<void>
  deleteAgent: (id: string) => Promise<void>
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  loading: false,

  createAgent: async (input: CreateAgentInput) => {
    const agent = await window.api.agents.create({
      name: input.name,
      description: input.description,
      system_prompt: input.systemPrompt || '',
      triggers: input.triggers || []
    } as any)
    set({ agents: [agent, ...get().agents] })
    return agent
  },

  updateAgent: async (id: string, data: Partial<Agent>) => {
    const agent = await window.api.agents.update(id, data)
    if (agent) {
      set({ agents: get().agents.map((a) => (a.id === id ? agent : a)) })
    }
  },

  fetchAgents: async () => {
    set({ loading: true })
    try {
      const agents = await window.api.agents.list()
      set({ agents })
    } catch {
      set({ agents: [] })
    } finally {
      set({ loading: false })
    }
  },

  toggleAgent: async (id: string) => {
    const result = await window.api.agents.toggleStatus(id)
    if (result) {
      set({ agents: get().agents.map((a) => (a.id === id ? result : a)) })
    }
  },

  deleteAgent: async (id: string) => {
    const result = await window.api.agents.delete(id)
    if (result.success) {
      set({ agents: get().agents.filter((a) => a.id !== id) })
    }
  }
}))
