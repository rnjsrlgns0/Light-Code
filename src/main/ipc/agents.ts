import { IpcMain } from 'electron'
import { getDb } from '../store/db'
import { v4 as uuid } from 'uuid'
import { logger } from '../logger'

export function registerAgentHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('agents:list', async () => {
    const agents = getDb().prepare('SELECT * FROM agents ORDER BY created_at DESC').all()
    logger.debug('agents', `Listed ${agents.length} agents`)
    return agents
  })

  ipcMain.handle('agents:get', async (_event, id: string) => {
    logger.debug('agents', `Get agent: ${id}`)
    return getDb().prepare('SELECT * FROM agents WHERE id = ?').get(id)
  })

  ipcMain.handle('agents:create', async (_event, agent: any) => {
    const db = getDb()
    const id = uuid()
    logger.info('agents', `Creating agent: ${agent.name}`, { id, description: agent.description })
    db.prepare(
      'INSERT INTO agents (id, name, description, system_prompt, triggers) VALUES (?, ?, ?, ?, ?)'
    ).run(id, agent.name, agent.description || '', agent.system_prompt || '', typeof agent.triggers === 'string' ? agent.triggers : JSON.stringify(agent.triggers || []))
    return db.prepare('SELECT * FROM agents WHERE id = ?').get(id)
  })

  ipcMain.handle('agents:update', async (_event, id: string, data: any) => {
    const db = getDb()
    const fields: string[] = []
    const values: any[] = []
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name) }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
    if (data.system_prompt !== undefined) { fields.push('system_prompt = ?'); values.push(data.system_prompt) }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status) }
    if (data.triggers !== undefined) { fields.push('triggers = ?'); values.push(typeof data.triggers === 'string' ? data.triggers : JSON.stringify(data.triggers)) }
    if (data.learnings !== undefined) { fields.push('learnings = ?'); values.push(typeof data.learnings === 'string' ? data.learnings : JSON.stringify(data.learnings)) }
    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')")
      values.push(id)
      db.prepare(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
    return db.prepare('SELECT * FROM agents WHERE id = ?').get(id)
  })

  ipcMain.handle('agents:delete', async (_event, id: string) => {
    logger.info('agents', `Deleting agent: ${id}`)
    getDb().prepare('DELETE FROM agents WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('agents:toggle-status', async (_event, id: string) => {
    const db = getDb()
    const agent = db.prepare('SELECT status FROM agents WHERE id = ?').get(id) as any
    if (!agent) return null
    const newStatus = agent.status === 'active' ? 'paused' : 'active'
    logger.info('agents', `Toggle agent ${id}: ${agent.status} → ${newStatus}`)
    db.prepare("UPDATE agents SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, id)
    return db.prepare('SELECT * FROM agents WHERE id = ?').get(id)
  })
}
