import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCostItems, getCostCache, saveCostCache } from '@/lib/storage'
import { fetchServiceCost, buildInvoiceCost } from '@/lib/fetch-service-costs'
import type { ServiceCost } from '@/lib/types'

type Params = { params: Promise<{ itemId: string }> }

const CACHE_MAX_AGE = 23 * 60 * 60 * 1000 // 23 hours

export async function GET(_req: NextRequest, { params }: Params) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await params
  const items = await getCostItems(userId, orgId)
  const item = items.find((i) => i.id === itemId)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Invoice items use manually entered data — no external fetch, no caching needed
  if (item.type === 'invoice') {
    return NextResponse.json(buildInvoiceCost(item))
  }

  if (!item.credentials) {
    return NextResponse.json({ error: '認証情報が設定されていません' }, { status: 400 })
  }

  // Serve from cache if fresh
  const cache = await getCostCache(userId, orgId)
  const cached = cache?.[itemId]
  if (cached && Date.now() - new Date(cached.cachedAt).getTime() < CACHE_MAX_AGE) {
    return NextResponse.json(cached.cost as ServiceCost)
  }

  // Live fetch
  try {
    const result = await fetchServiceCost(item)

    // Persist to cache (upsert this item's entry)
    const newCache = { ...(cache ?? {}), [itemId]: { cost: result, cachedAt: new Date().toISOString() } }
    await saveCostCache(userId, orgId, newCache)

    return NextResponse.json(result)
  } catch (e) {
    console.error(`Cost fetch error [${item.type}]:`, e)
    const message = e instanceof Error ? e.message : 'データ取得に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
