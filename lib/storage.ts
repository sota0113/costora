import { encrypt, decrypt } from './crypto'
import type { StoredKeys } from './types'

function isDynamo() {
  return !!(process.env.DYNAMODB_TABLE_NAME && process.env.AWS_REGION)
}

// org:{orgId}:keys  or  user:{userId}:keys
function tenantKey(orgId: string | null | undefined, userId: string): string {
  return orgId ? `org:${orgId}:keys` : `user:${userId}:keys`
}

async function getDynamoClient() {
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
  const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb')
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }))
}

async function dynamoGetKeys(tenant: string): Promise<StoredKeys> {
  const { GetCommand } = await import('@aws-sdk/lib-dynamodb')
  const client = await getDynamoClient()
  const res = await client.send(new GetCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME!,
    Key: { tenantKey: tenant, service: 'keys' },
  }))
  if (!res.Item?.value) return {}
  try {
    return JSON.parse(decrypt(res.Item.value as string)) as StoredKeys
  } catch {
    return {}
  }
}

async function dynamoPutKeys(tenant: string, keys: StoredKeys): Promise<void> {
  const { PutCommand } = await import('@aws-sdk/lib-dynamodb')
  const client = await getDynamoClient()
  await client.send(new PutCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME!,
    Item: { tenantKey: tenant, service: 'keys', value: encrypt(JSON.stringify(keys)) },
  }))
}

async function dynamoDeleteKeys(tenant: string): Promise<void> {
  const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb')
  const client = await getDynamoClient()
  await client.send(new DeleteCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME!,
    Key: { tenantKey: tenant, service: 'keys' },
  }))
}

// KV fallback (Vercel KV or local file)
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

export async function getStoredKeys(
  userId: string,
  orgId?: string | null
): Promise<StoredKeys> {
  const tenant = tenantKey(orgId, userId)
  if (isDynamo()) return dynamoGetKeys(tenant)
  const raw = await kvGet(tenant)
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
  const tenant = tenantKey(orgId, userId)
  if (isDynamo()) {
    const keys = await dynamoGetKeys(tenant)
    ;(keys as Record<string, string>)[service] = value
    await dynamoPutKeys(tenant, keys)
    return
  }
  const keys = await getStoredKeys(userId, orgId)
  ;(keys as Record<string, string>)[service] = value
  await kvSet(tenant, encrypt(JSON.stringify(keys)))
}

export async function removeKey(
  userId: string,
  orgId: string | null | undefined,
  service: string
): Promise<void> {
  const tenant = tenantKey(orgId, userId)
  if (isDynamo()) {
    const keys = await dynamoGetKeys(tenant)
    delete (keys as Record<string, string>)[service]
    if (Object.keys(keys).length === 0) {
      await dynamoDeleteKeys(tenant)
    } else {
      await dynamoPutKeys(tenant, keys)
    }
    return
  }
  const keys = await getStoredKeys(userId, orgId)
  delete (keys as Record<string, string>)[service]
  if (Object.keys(keys).length === 0) {
    await kvDel(tenant)
  } else {
    await kvSet(tenant, encrypt(JSON.stringify(keys)))
  }
}
