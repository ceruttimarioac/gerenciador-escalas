import { appendFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function createApiLogger(moduleUrl, apiName, saveLog) {
  if (saveLog !== 'S') {
    return async () => {}
  }

  const logDirectory = dirname(fileURLToPath(moduleUrl))

  return async function log(level, event, details = {}) {
    const now = new Date()
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-')
    const logPath = resolve(logDirectory, `log_${date}.txt`)
    const entry = {
      ...details,
      timestamp: now.toISOString(),
      api: apiName,
      level,
      event
    }

    try {
      await appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8')
    } catch (error) {
      console.error(`[${apiName}] Não foi possível gravar log: ${error.message}`)
    }
  }
}