import { encrypt, decrypt } from './crypto'
import type { CostItem, Department } from './types'

function isDynamo() {
  return !!(process.env.DYNAMODB_TABLE_NAME && process.env.AWS_REGION)
}

function tenantKey(orgId: string | null | undefined, userId: string): string {
  return orgId ? `org:${orgId}:keys` : `user:${userId}:keys`
}

async function getDynamoClient() {
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
  const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb')
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }))
}

async function dynamoGet(tenant: string, sk: string): Promise<string | null> {
  const { GetCommand } = await import('@aws-sdk/lib-dynamodb')
  const client = await getDynamoClient()
  const res = await client.send(new GetCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME!,
    Key: { tenantKey: tenant, service: sk },
  }))
  return (res.Item?.value as string) ?? null
}

async function dynamoPut(tenant: string, sk: string, value: string): Promise<void> {
  const { PutCommand } = await import('@aws-sdk/lib-dynamodb')
  const client = await getDynamoClient()
  await client.send(new PutCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME!,
    Item: { tenantKey: tenant, service: sk, value },
  }))
}

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

export async function getCostItems(
  userId: string,
  orgId?: string | null
): Promise<CostItem[]> {
  const tenant = tenantKey(orgId, userId)
  let raw: string | null
  if (isDynamo()) {
    raw = await dynamoGet(tenant, 'items')
  } else {
    raw = await kvGet(`${tenant}:items`)
  }
  if (!raw) return []
  try {
    return JSON.parse(decrypt(raw)) as CostItem[]
  } catch {
    return []
  }
}

export async function saveCostItems(
  userId: string,
  orgId: string | null | undefined,
  items: CostItem[]
): Promise<void> {
  const tenant = tenantKey(orgId, userId)
  const value = encrypt(JSON.stringify(items))
  if (isDynamo()) {
    await dynamoPut(tenant, 'items', value)
  } else {
    await kvSet(`${tenant}:items`, value)
  }
}

export async function getDepartments(
  userId: string,
  orgId?: string | null
): Promise<Department[]> {
  const tenant = tenantKey(orgId, userId)
  let raw: string | null
  if (isDynamo()) {
    raw = await dynamoGet(tenant, 'departments')
  } else {
    raw = await kvGet(`${tenant}:departments`)
  }
  if (!raw) return []
  try {
    return JSON.parse(raw) as Department[]
  } catch {
    return []
  }
}

export async function saveDepartments(
  userId: string,
  orgId: string | null | undefined,
  departments: Department[]
): Promise<void> {
  const tenant = tenantKey(orgId, userId)
  const value = JSON.stringify(departments)
  if (isDynamo()) {
    await dynamoPut(tenant, 'departments', value)
  } else {
    await kvSet(`${tenant}:departments`, value)
  }
}

// ── Cost cache ────────────────────────────────────────────────────────────────

const COST_CACHE_SK = 'cost_cache'

type CostCacheMap = Record<string, { cost: unknown; cachedAt: string }>

async function readCacheByTenant(tenant: string): Promise<CostCacheMap | null> {
  let raw: string | null
  if (isDynamo()) {
    raw = await dynamoGet(tenant, COST_CACHE_SK)
  } else {
    raw = await kvGet(`${tenant}:${COST_CACHE_SK}`)
  }
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

async function writeCacheByTenant(tenant: string, cache: CostCacheMap): Promise<void> {
  const value = JSON.stringify(cache)
  if (isDynamo()) {
    await dynamoPut(tenant, COST_CACHE_SK, value)
  } else {
    await kvSet(`${tenant}:${COST_CACHE_SK}`, value)
  }
}

export async function getCostCache(
  userId: string,
  orgId?: string | null
): Promise<CostCacheMap | null> {
  return readCacheByTenant(tenantKey(orgId, userId))
}

export async function saveCostCache(
  userId: string,
  orgId: string | null | undefined,
  cache: CostCacheMap
): Promise<void> {
  return writeCacheByTenant(tenantKey(orgId, userId), cache)
}

// ── Cron helpers ──────────────────────────────────────────────────────────────

export async function getAllTenantKeys(): Promise<string[]> {
  if (isDynamo()) {
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb')
    const client = await getDynamoClient()
    const result = await client.send(new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME!,
      FilterExpression: '#svc = :items',
      ExpressionAttributeNames: { '#svc': 'service' },
      ExpressionAttributeValues: { ':items': 'items' },
      ProjectionExpression: 'tenantKey',
    }))
    return (result.Items ?? []).map(i => i.tenantKey as string)
  }
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv')
    const keys = await kv.keys('*:keys:items')
    return keys.map(k => k.slice(0, -':items'.length))
  }
  const { readFileSync } = await import('fs')
  const { join } = await import('path')
  try {
    const store = JSON.parse(readFileSync(join(process.cwd(), '.data', 'store.json'), 'utf8'))
    return Object.keys(store)
      .filter(k => k.endsWith(':items'))
      .map(k => k.slice(0, -':items'.length))
  } catch {
    return []
  }
}

export async function getCostItemsByTenantKey(tenant: string): Promise<import('./types').CostItem[]> {
  let raw: string | null
  if (isDynamo()) {
    raw = await dynamoGet(tenant, 'items')
  } else {
    raw = await kvGet(`${tenant}:items`)
  }
  if (!raw) return []
  try {
    return JSON.parse(decrypt(raw)) as import('./types').CostItem[]
  } catch {
    return []
  }
}

export async function getCostCacheByTenantKey(tenant: string): Promise<CostCacheMap | null> {
  return readCacheByTenant(tenant)
}

export async function saveCostCacheByTenantKey(tenant: string, cache: CostCacheMap): Promise<void> {
  return writeCacheByTenant(tenant, cache)
}
