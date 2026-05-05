import { NextRequest, NextResponse } from 'next/server'
import {
  getAllTenantKeys,
  getCostItemsByTenantKey,
  getCostCacheByTenantKey,
  saveCostCacheByTenantKey,
} from '@/lib/storage'
import { fetchServiceCost } from '@/lib/fetch-service-costs'
import type { ServiceCost } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenants = await getAllTenantKeys()
  let totalItems = 0
  let totalErrors = 0
  const cachedAt = new Date().toISOString()

  await Promise.allSettled(
    tenants.map(async (tenant) => {
      try {
        const items = await getCostItemsByTenantKey(tenant)
        const existingCache = (await getCostCacheByTenantKey(tenant)) ?? {}
        const newCache: Record<string, { cost: ServiceCost; cachedAt: string }> = {
          ...(existingCache as Record<string, { cost: ServiceCost; cachedAt: string }>),
        }

        await Promise.allSettled(
          items.map(async (item) => {
            totalItems++
            try {
              const cost = await fetchServiceCost(item)
              newCache[item.id] = { cost, cachedAt }
            } catch (e) {
              totalErrors++
              // Keep existing cached entry rather than overwriting with an error
              if (!newCache[item.id]) {
                newCache[item.id] = {
                  cost: {
                    itemId: item.id, name: item.name, type: item.type,
                    currentMonth: 0, previousMonth: 0, history: [],
                    currency: 'USD', connected: false,
                    error: e instanceof Error ? e.message : 'データ取得に失敗しました',
                  },
                  cachedAt,
                }
              }
            }
          })
        )

        await saveCostCacheByTenantKey(tenant, newCache)
      } catch (e) {
        console.error(`Cron: failed to process tenant ${tenant}:`, e)
        totalErrors++
      }
    })
  )

  return NextResponse.json({
    ok: true,
    tenants: tenants.length,
    totalItems,
    totalErrors,
    timestamp: cachedAt,
  })
}
