import { encrypt, decrypt } from './crypto'
import type { CostItem, Department, Subscription } from './types'

export function computeTenantKey(orgId: string | null | undefined, userId: string): string {
  return orgId ? `org:${orgId}:keys` : `user:${userId}:keys`
}

// ── DynamoDB helpers ──────────────────────────────────────────────────────────

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

async function dynamoDelete(tenant: string, sk: string): Promise<void> {
  const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb')
  const client = await getDynamoClient()
  await client.send(new DeleteCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME!,
    Key: { tenantKey: tenant, service: sk },
  }))
}

// ── Local FS fallback (development only) ─────────────────────────────────────

async function localGet(key: string): Promise<string | null> {
  const { readFileSync } = await import('fs')
  const { join } = await import('path')
  try {
    const store = JSON.parse(readFileSync(join(process.cwd(), '.data', 'store.json'), 'utf8'))
    return store[key] ?? null
  } catch {
    return null
  }
}

async function localSet(key: string, value: string): Promise<void> {
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

function isDynamo() {
  return !!(process.env.DYNAMODB_TABLE_NAME && process.env.AWS_REGION)
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getCostItems(
  userId: string,
  orgId?: string | null
): Promise<CostItem[]> {
  const tenant = computeTenantKey(orgId, userId)
  const raw = isDynamo()
    ? await dynamoGet(tenant, 'items')
    : await localGet(`${tenant}:items`)
  if (!raw) return []
  try { return JSON.parse(decrypt(raw)) as CostItem[] } catch { return [] }
}

export async function saveCostItems(
  userId: string,
  orgId: string | null | undefined,
  items: CostItem[]
): Promise<void> {
  const tenant = computeTenantKey(orgId, userId)
  const value = encrypt(JSON.stringify(items))
  if (isDynamo()) {
    await dynamoPut(tenant, 'items', value)
  } else {
    await localSet(`${tenant}:items`, value)
  }
}

export async function saveCostItemsByTenantKey(tenant: string, items: CostItem[]): Promise<void> {
  const value = encrypt(JSON.stringify(items))
  await dynamoPut(tenant, 'items', value)
}

export async function getDepartments(
  userId: string,
  orgId?: string | null
): Promise<Department[]> {
  const tenant = computeTenantKey(orgId, userId)
  const raw = isDynamo()
    ? await dynamoGet(tenant, 'departments')
    : await localGet(`${tenant}:departments`)
  if (!raw) return []
  try { return JSON.parse(raw) as Department[] } catch { return [] }
}

export async function saveDepartments(
  userId: string,
  orgId: string | null | undefined,
  departments: Department[]
): Promise<void> {
  const tenant = computeTenantKey(orgId, userId)
  const value = JSON.stringify(departments)
  if (isDynamo()) {
    await dynamoPut(tenant, 'departments', value)
  } else {
    await localSet(`${tenant}:departments`, value)
  }
}

// ── Email alias lookup (SES invoice forwarding) ───────────────────────────────
// DynamoDB: { tenantKey: "email_aliases", service: itemId, value: actualTenantKey }

const EMAIL_ALIASES_PK = 'email_aliases'

export async function saveEmailAlias(itemId: string, tenantKey: string): Promise<void> {
  if (!isDynamo()) return
  await dynamoPut(EMAIL_ALIASES_PK, itemId, tenantKey)
}

export async function deleteEmailAlias(itemId: string): Promise<void> {
  if (!isDynamo()) return
  await dynamoDelete(EMAIL_ALIASES_PK, itemId)
}

export async function lookupEmailAlias(itemId: string): Promise<string | null> {
  if (!isDynamo()) return null
  return dynamoGet(EMAIL_ALIASES_PK, itemId)
}

// ── Cost cache ────────────────────────────────────────────────────────────────

const COST_CACHE_SK = 'cost_cache'

type CostCacheMap = Record<string, { cost: unknown; cachedAt: string }>

async function readCacheByTenant(tenant: string): Promise<CostCacheMap | null> {
  const raw = isDynamo()
    ? await dynamoGet(tenant, COST_CACHE_SK)
    : await localGet(`${tenant}:${COST_CACHE_SK}`)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

async function writeCacheByTenant(tenant: string, cache: CostCacheMap): Promise<void> {
  const value = JSON.stringify(cache)
  if (isDynamo()) {
    await dynamoPut(tenant, COST_CACHE_SK, value)
  } else {
    await localSet(`${tenant}:${COST_CACHE_SK}`, value)
  }
}

export async function getCostCache(
  userId: string,
  orgId?: string | null
): Promise<CostCacheMap | null> {
  return readCacheByTenant(computeTenantKey(orgId, userId))
}

export async function saveCostCache(
  userId: string,
  orgId: string | null | undefined,
  cache: CostCacheMap
): Promise<void> {
  return writeCacheByTenant(computeTenantKey(orgId, userId), cache)
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

export async function getCostItemsByTenantKey(tenant: string): Promise<CostItem[]> {
  const raw = isDynamo()
    ? await dynamoGet(tenant, 'items')
    : await localGet(`${tenant}:items`)
  if (!raw) return []
  try { return JSON.parse(decrypt(raw)) as CostItem[] } catch { return [] }
}

export async function getCostCacheByTenantKey(tenant: string): Promise<CostCacheMap | null> {
  return readCacheByTenant(tenant)
}

export async function saveCostCacheByTenantKey(tenant: string, cache: CostCacheMap): Promise<void> {
  return writeCacheByTenant(tenant, cache)
}

// ── Subscription (Stripe billing) ───────────────────────────────────────────

const SUBSCRIPTION_SK = 'subscription'

async function readSubscriptionByTenant(tenant: string): Promise<Subscription | null> {
  const raw = isDynamo()
    ? await dynamoGet(tenant, SUBSCRIPTION_SK)
    : await localGet(`${tenant}:${SUBSCRIPTION_SK}`)
  if (!raw) return null
  try { return JSON.parse(raw) as Subscription } catch { return null }
}

async function writeSubscriptionByTenant(tenant: string, sub: Subscription): Promise<void> {
  const value = JSON.stringify(sub)
  if (isDynamo()) {
    await dynamoPut(tenant, SUBSCRIPTION_SK, value)
  } else {
    await localSet(`${tenant}:${SUBSCRIPTION_SK}`, value)
  }
}

export async function getSubscription(
  userId: string,
  orgId?: string | null
): Promise<Subscription | null> {
  return readSubscriptionByTenant(computeTenantKey(orgId, userId))
}

export async function saveSubscription(
  userId: string,
  orgId: string | null | undefined,
  sub: Subscription
): Promise<void> {
  return writeSubscriptionByTenant(computeTenantKey(orgId, userId), sub)
}

export async function getSubscriptionByTenantKey(tenant: string): Promise<Subscription | null> {
  return readSubscriptionByTenant(tenant)
}

export async function saveSubscriptionByTenantKey(tenant: string, sub: Subscription): Promise<void> {
  return writeSubscriptionByTenant(tenant, sub)
}

// ── Stripe customer → tenant lookup ─────────────────────────────────────────
// DynamoDB: { tenantKey: "stripe_customers", service: stripeCustomerId, value: tenantKey }

const STRIPE_CUSTOMERS_PK = 'stripe_customers'

export async function saveStripeCustomerTenant(customerId: string, tenantKey: string): Promise<void> {
  if (!isDynamo()) return
  await dynamoPut(STRIPE_CUSTOMERS_PK, customerId, tenantKey)
}

export async function lookupTenantByStripeCustomer(customerId: string): Promise<string | null> {
  if (!isDynamo()) return null
  return dynamoGet(STRIPE_CUSTOMERS_PK, customerId)
}
