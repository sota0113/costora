import { encrypt, decrypt } from './crypto'
import type { StoredKeys } from './types'

async function kvGet(key: string): Promise<string | null> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv')
    return kv.get<string>(key)
  }
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
  const { readFileSync, writeFileSync, mkdirSync } = await import('fs')
  const { join } = await import('path')
  const dir = join(process.cwd(), '.data')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'store.json')
  let store: Record<string, string> = {}
  try { store = JSON.parse(readFileSync(path, 'utf8')) } catch {}
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
  try { store = JSON.parse(readFileSync(path, 'utf8')) } catch {}
  delete store[key]
  writeFileSync(path, JSON.stringify(store, null, 2))
}

// org が設定されていれば組織単位、なければ個人単位で保管
function tenantKey(orgId: string | null | undefined, userId: string): string {
  return orgId ? `org:${orgId}:keys` : `user:${userId}:keys`
}

export async function getStoredKeys(
  userId: string,
  orgId?: string | null
): Promise<StoredKeys> {
  const raw = await kvGet(tenantKey(orgId, userId))
  if (!raw) return {}
  try {
    return JSON.parse(decrypt(raw)) as StoredKeys
  } catch {
    return {}
  }
}

export async function saveKey(
  userId: string,
  orgId: string | null | undefined,
  service: string,
  value: string
): Promise<void> {
  const keys = await getStoredKeys(userId, orgId)
  ;(keys as Record<string, string>)[service] = value
  await kvSet(tenantKey(orgId, userId), encrypt(JSON.stringify(keys)))
}

export async function removeKey(
  userId: string,
  orgId: string | null | undefined,
  service: string
): Promise<void> {
  const keys = await getStoredKeys(userId, orgId)
  delete (keys as Record<string, string>)[service]
  if (Object.keys(keys).length === 0) {
    await kvDel(tenantKey(orgId, userId))
  } else {
    await kvSet(tenantKey(orgId, userId), encrypt(JSON.stringify(keys)))
  }
}
