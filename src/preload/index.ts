import { contextBridge, ipcRenderer } from 'electron'

const api = {
  llm: {
    chat: (messages: any[], userBrief: string) =>
      ipcRenderer.invoke('llm:chat', messages, userBrief),
    streamChat: (messages: any[], userBrief: string, onChunk: (chunk: string) => void) => {
      const channel = `llm:stream:${Date.now()}`
      ipcRenderer.on(channel, (_event, chunk) => onChunk(chunk))
      return ipcRenderer.invoke('llm:stream-chat', messages, userBrief, channel)
    }
  },
  auth: {
    getConfig: () => ipcRenderer.invoke('auth:get-config'),
    saveApiKey: (provider: string, apiKey: string) =>
      ipcRenderer.invoke('auth:save-api-key', provider, apiKey),
    loginCli: (provider: string) =>
      ipcRenderer.invoke('auth:login-cli', provider)
  },
  agents: {
    list: () => ipcRenderer.invoke('agents:list'),
    get: (id: string) => ipcRenderer.invoke('agents:get', id),
    create: (agent: any) => ipcRenderer.invoke('agents:create', agent),
    update: (id: string, data: any) => ipcRenderer.invoke('agents:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('agents:delete', id),
    toggleStatus: (id: string) => ipcRenderer.invoke('agents:toggle-status', id)
  },
  files: {
    read: (filePath: string) => ipcRenderer.invoke('files:read', filePath),
    write: (filePath: string, content: string) =>
      ipcRenderer.invoke('files:write', filePath, content),
    list: (dirPath: string) => ipcRenderer.invoke('files:list', dirPath)
  },
  detection: {
    onResult: (callback: (data: any) => void) => {
      const handler = (_event: any, data: any) => callback(data)
      ipcRenderer.on('detection:result', handler)
      return () => ipcRenderer.removeListener('detection:result', handler)
    }
  },
  agentBuilder: {
    chat: (detection: any, messages: any[]) =>
      ipcRenderer.invoke('agent-builder:chat', detection, messages)
  },
  agentEngine: {
    execute: (agentId: string, userMessage: string) =>
      ipcRenderer.invoke('agent:execute', agentId, userMessage),
    onExecuting: (callback: (data: { agentId: string; agentName: string }) => void) => {
      const handler = (_event: any, data: any) => callback(data)
      ipcRenderer.on('agent:executing', handler)
      return () => ipcRenderer.removeListener('agent:executing', handler)
    },
    onResponse: (callback: (data: { agentId: string; agentName: string; response: string }) => void) => {
      const handler = (_event: any, data: any) => callback(data)
      ipcRenderer.on('agent:response', handler)
      return () => ipcRenderer.removeListener('agent:response', handler)
    },
    onStream: (callback: (data: { agentId: string; agentName: string; chunk: string }) => void) => {
      const handler = (_event: any, data: any) => callback(data)
      ipcRenderer.on('agent:stream', handler)
      return () => ipcRenderer.removeListener('agent:stream', handler)
    }
  },
  terminal: {
    create: () => ipcRenderer.invoke('terminal:create'),
    input: (data: string) => ipcRenderer.send('terminal:input', data),
    resize: (cols: number, rows: number) => ipcRenderer.send('terminal:resize', cols, rows),
    onData: (callback: (data: string) => void) => {
      const handler = (_event: any, data: string) => callback(data)
      ipcRenderer.on('terminal:data', handler)
      return () => ipcRenderer.removeListener('terminal:data', handler)
    },
    dispose: () => ipcRenderer.invoke('terminal:dispose')
  }
}

contextBridge.exposeInMainWorld('api', api)
