import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCostItems } from '@/lib/storage'
import { decrypt } from '@/lib/crypto'
import { parseCredentials } from '@/lib/services'
import { getMonthRange, currentYearMonth, previousYearMonth } from '@/lib/dates'
import type { AwsCredentials, MonthlyAmount } from '@/lib/types'

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

  const tagKey = req.nextUrl.searchParams.get('tagKey') ?? ''
  if (!tagKey) return NextResponse.json({ error: 'tagKey が必要です' }, { status: 400 })

  // tagValues: comma-separated; empty string means "no tag / absent"
  const rawTagValues = req.nextUrl.searchParams.get('tagValues')?.split(',') ?? []
  const nonEmptyTagValues = rawTagValues.filter(v => v !== '')
  const includeAbsent = rawTagValues.includes('') || req.nextUrl.searchParams.get('includeAbsent') === 'true'

  if (nonEmptyTagValues.length === 0 && !includeAbsent) {
    return NextResponse.json({ error: 'tagValues か includeAbsent が必要です' }, { status: 400 })
  }

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

    // Build filter: OR of tag-value filter and/or absent filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = []
    if (nonEmptyTagValues.length > 0) {
      conditions.push({ Tags: { Key: tagKey, Values: nonEmptyTagValues } })
    }
    if (includeAbsent) {
      conditions.push({ Tags: { Key: tagKey, MatchOptions: ['ABSENT'] } })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tagFilter: any = conditions.length === 1 ? conditions[0] : { Or: conditions }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taxExclusion: any = { Not: { Dimensions: { Key: 'RECORD_TYPE', Values: ['Tax'] } } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const combinedFilter: any = { And: [taxExclusion, tagFilter] }

    const response = await client.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: start, End: end },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
      Filter: combinedFilter,
    }))

    const serviceMap: Record<string, MonthlyAmount[]> = {}

    for (const period of response.ResultsByTime ?? []) {
      const month = period.TimePeriod?.Start?.slice(0, 7) ?? ''
      if (!month) continue

      for (const group of period.Groups ?? []) {
        const serviceName = group.Keys?.[0] ?? 'Unknown'
        const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? '0')
        if (amount < 0.001) continue

        if (!serviceMap[serviceName]) serviceMap[serviceName] = []
        const existing = serviceMap[serviceName].find((h) => h.month === month)
        if (existing) existing.amount += amount
        else serviceMap[serviceName].push({ month, amount })
      }
    }

    const results = Object.entries(serviceMap).map(([name, history]) => {
      history.sort((a, b) => a.month.localeCompare(b.month))
      const last6 = history.slice(-6)
      return {
        name,
        history: last6,
        currentMonth: last6.find((h) => h.month === curMonth)?.amount ?? 0,
        previousMonth: last6.find((h) => h.month === prevMonth)?.amount ?? 0,
        currency: 'USD',
      }
    })

    results.sort((a, b) => b.currentMonth - a.currentMonth)
    return NextResponse.json(results)
  } catch (e) {
    console.error('By-service cost fetch error [aws]:', e)
    const message = e instanceof Error ? e.message : 'データ取得に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
