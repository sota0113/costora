import { encrypt, decrypt } from './crypto'
import type { StoredKeys } from './types'

// Vercel KV-based storage with file-system fallback for local dev
async function kvGet(key: string): Promise<string | null> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv')
    return kv.get<string>(key)
  }
  // Local file-system fallback
  const { readFileSync } = await import('fs')
  const { join } = await import('path')
  try {
    const store = JSON.parse(readFileSync(join(process.cwd(), '.data', 'store.json'), 'utf8'))
    return store[key] ?? null
  } catch {
    return null
  }
}

async function kvSet(key: string, value: string): Promise<void> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv')
    await kv.set(key, value)
    return
  }
  // Local file-system fallback
  const { readFileSync, writeFileSync, mkdirSync } = await import('fs')
  const { join } = await import('path')
  const dir = join(process.cwd(), '.data')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'store.json')
  let store: Record<string, string> = {}
  try {
    store = JSON.parse(readFileSync(path, 'utf8'))
  } catch {}
  store[key] = value
  writeFileSync(path, JSON.stringify(store, null, 2))
}

async function kvDel(key: string): Promise<void> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv')
    await kv.del(key)
    return
  }
  const { readFileSync, writeFileSync, mkdirSync } = await import('fs')
  const { join } = await import('path')
  const dir = join(process.cwd(), '.data')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'store.json')
  let store: Record<string, string> = {}
  try {
    store = JSON.parse(readFileSync(path, 'utf8'))
  } catch {}
  delete store[key]
  writeFileSync(path, JSON.stringify(store, null, 2))
}

function userKey(userId: string): string {
  return `user:${userId}:keys`
}

export async function getStoredKeys(userId: string): Promise<StoredKeys> {
  const raw = await kvGet(userKey(userId))
  if (!raw) return {}
  try {
    return JSON.parse(decrypt(raw)) as StoredKeys
  } catch {
    return {}
  }
}

export async function saveKey(userId: string, service: string, value: string): Promise<void> {
  const keys = await getStoredKeys(userId)
  ;(keys as Record<string, string>)[service] = value
  await kvSet(userKey(userId), encrypt(JSON.stringify(keys)))
}

export async function removeKey(userId: string, service: string): Promise<void> {
  const keys = await getStoredKeys(userId)
  delete (keys as Record<string, string>)[service]
  if (Object.keys(keys).length === 0) {
    await kvDel(userKey(userId))
  } else {
    await kvSet(userKey(userId), encrypt(JSON.stringify(keys)))
  }
}
