import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCostItems } from '@/lib/storage'
import { decrypt } from '@/lib/crypto'
import { parseCredentials } from '@/lib/services'
import { getMonthRange, currentYearMonth, previousYearMonth } from '@/lib/dates'
import type { AwsCredentials, ServiceCost, MonthlyAmount } from '@/lib/types'

type Params = { params: Promise<{ itemId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await params
  const items = await getCostItems(userId, orgId)
  const item = items.find((i) => i.id === itemId)

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (item.type !== 'aws') return NextResponse.json({ error: 'AWS アイテムのみ対応しています' }, { status: 400 })
  if (!item.credentials) return NextResponse.json({ error: '認証情報が設定されていません' }, { status: 400 })

  // tagGroupBy from item setting, or overridden by ?tagKey= query param (tag-alloc mode)
  const tagGroupBy = item.tagGroupBy
    ?? req.nextUrl.searchParams.get('tagKey')
    ?? item.tagAllocations?.[0]?.tagKey
    ?? ''
  if (!tagGroupBy) return NextResponse.json({ error: 'タグキーが設定されていません（tagGroupBy）' }, { status: 400 })

  const creds = parseCredentials('aws', decrypt(item.credentials)) as unknown as AwsCredentials
  const { start, end } = getMonthRange(6)
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()

  try {
    const { CostExplorerClient, GetCostAndUsageCommand } = await import('@aws-sdk/client-cost-explorer')
    const client = new CostExplorerClient({
      region: 'us-east-1',
      credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey },
    })

    const response = await client.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: start, End: end },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'TAG', Key: tagGroupBy }],
    }))

    // Collect per-tag-value monthly amounts
    // Keys format: ["TagKey$TagValue"] — empty value means untagged
    const tagMap: Record<string, MonthlyAmount[]> = {}

    for (const period of response.ResultsByTime ?? []) {
      const month = period.TimePeriod?.Start?.slice(0, 7) ?? ''
      if (!month) continue

      for (const group of period.Groups ?? []) {
        const rawKey = group.Keys?.[0] ?? ''
        const tagValue = rawKey.includes('$') ? rawKey.split('$').slice(1).join('$') : rawKey
        const label = tagValue || 'タグなし'
        const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? '0')

        if (!tagMap[label]) tagMap[label] = []
        const existing = tagMap[label].find((h) => h.month === month)
        if (existing) existing.amount += amount
        else tagMap[label].push({ month, amount })
      }
    }

    // Build one ServiceCost per tag value
    const results: ServiceCost[] = Object.entries(tagMap).map(([tagValue, history]) => {
      history.sort((a, b) => a.month.localeCompare(b.month))
      const last6 = history.slice(-6)
      return {
        itemId: `${item.id}:${tagValue}`,
        name: `${item.name} / ${tagValue}`,
        type: 'aws',
        currentMonth: last6.find((h) => h.month === curMonth)?.amount ?? 0,
        previousMonth: last6.find((h) => h.month === prevMonth)?.amount ?? 0,
        history: last6,
        currency: 'USD',
        connected: true,
      }
    })

    // Sort by current month cost descending
    results.sort((a, b) => b.currentMonth - a.currentMonth)

    return NextResponse.json(results)
  } catch (e) {
    console.error('Grouped cost fetch error [aws]:', e)
    const message = e instanceof Error ? e.message : 'データ取得に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
