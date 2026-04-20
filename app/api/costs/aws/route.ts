import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getStoredKeys } from '@/lib/storage'
import { decrypt } from '@/lib/crypto'
import { getMonthRange, currentYearMonth, previousYearMonth } from '@/lib/dates'
import type { ServiceCost, MonthlyAmount } from '@/lib/types'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stored = await getStoredKeys(userId)
  if (!stored.aws) {
    return NextResponse.json({ error: 'AWS認証情報が設定されていません' }, { status: 400 })
  }

  let credentials: { accessKeyId: string; secretAccessKey: string }
  try {
    credentials = JSON.parse(decrypt(stored.aws))
  } catch {
    return NextResponse.json({ error: 'AWS認証情報が不正です' }, { status: 400 })
  }

  const { start, end } = getMonthRange(6)
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()

  try {
    const { CostExplorerClient, GetCostAndUsageCommand } = await import(
      '@aws-sdk/client-cost-explorer'
    )

    const client = new CostExplorerClient({
      // Cost Explorer is only available in us-east-1
      region: 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    })

    const command = new GetCostAndUsageCommand({
      TimePeriod: { Start: start, End: end },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
    })

    const response = await client.send(command)
    const history: MonthlyAmount[] = []

    for (const result of response.ResultsByTime ?? []) {
      const month = result.TimePeriod?.Start?.slice(0, 7) ?? ''
      const amount = parseFloat(result.Total?.UnblendedCost?.Amount ?? '0')
      if (month) history.push({ month, amount })
    }

    history.sort((a, b) => a.month.localeCompare(b.month))
    const last6 = history.slice(-6)
    const currentMonth = last6.find((h) => h.month === curMonth)?.amount ?? 0
    const previousMonth = last6.find((h) => h.month === prevMonth)?.amount ?? 0

    const result: ServiceCost = {
      service: 'aws',
      displayName: 'AWS',
      currentMonth,
      previousMonth,
      history: last6,
      currency: 'USD',
      connected: true,
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error('AWS cost fetch error:', e)
    const message = e instanceof Error ? e.message : 'AWS APIからデータを取得できませんでした'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
