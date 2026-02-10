"use strict";
const electron = require("electron");
const api = {
  llm: {
    chat: (messages, userBrief) => electron.ipcRenderer.invoke("llm:chat", messages, userBrief),
    streamChat: (messages, userBrief, onChunk) => {
      const channel = `llm:stream:${Date.now()}`;
      electron.ipcRenderer.on(channel, (_event, chunk) => onChunk(chunk));
      return electron.ipcRenderer.invoke("llm:stream-chat", messages, userBrief, channel);
    }
  },
  auth: {
    getConfig: () => electron.ipcRenderer.invoke("auth:get-config"),
    saveApiKey: (provider, apiKey) => electron.ipcRenderer.invoke("auth:save-api-key", provider, apiKey),
    loginCli: (provider) => electron.ipcRenderer.invoke("auth:login-cli", provider)
  },
  agents: {
    list: () => electron.ipcRenderer.invoke("agents:list"),
    get: (id) => electron.ipcRenderer.invoke("agents:get", id),
    create: (agent) => electron.ipcRenderer.invoke("agents:create", agent),
    update: (id, data) => electron.ipcRenderer.invoke("agents:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("agents:delete", id),
    toggleStatus: (id) => electron.ipcRenderer.invoke("agents:toggle-status", id)
  },
  files: {
    read: (filePath) => electron.ipcRenderer.invoke("files:read", filePath),
    write: (filePath, content) => electron.ipcRenderer.invoke("files:write", filePath, content),
    list: (dirPath) => electron.ipcRenderer.invoke("files:list", dirPath)
  },
  detection: {
    onResult: (callback) => {
      const handler = (_event, data) => callback(data);
      electron.ipcRenderer.on("detection:result", handler);
      return () => electron.ipcRenderer.removeListener("detection:result", handler);
    }
  },
  agentBuilder: {
    chat: (detection, messages) => electron.ipcRenderer.invoke("agent-builder:chat", detection, messages)
  },
  agentEngine: {
    execute: (agentId, userMessage) => electron.ipcRenderer.invoke("agent:execute", agentId, userMessage),
    onExecuting: (callback) => {
      const handler = (_event, data) => callback(data);
      electron.ipcRenderer.on("agent:executing", handler);
      return () => electron.ipcRenderer.removeListener("agent:executing", handler);
    },
    onResponse: (callback) => {
      const handler = (_event, data) => callback(data);
      electron.ipcRenderer.on("agent:response", handler);
      return () => electron.ipcRenderer.removeListener("agent:response", handler);
    },
    onStream: (callback) => {
      const handler = (_event, data) => callback(data);
      electron.ipcRenderer.on("agent:stream", handler);
      return () => electron.ipcRenderer.removeListener("agent:stream", handler);
    }
  },
  terminal: {
    create: () => electron.ipcRenderer.invoke("terminal:create"),
    input: (data) => electron.ipcRenderer.send("terminal:input", data),
    resize: (cols, rows) => electron.ipcRenderer.send("terminal:resize", cols, rows),
    onData: (callback) => {
      const handler = (_event, data) => callback(data);
      electron.ipcRenderer.on("terminal:data", handler);
      return () => electron.ipcRenderer.removeListener("terminal:data", handler);
    },
    dispose: () => electron.ipcRenderer.invoke("terminal:dispose")
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
