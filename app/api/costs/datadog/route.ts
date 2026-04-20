import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getStoredKeys } from '@/lib/storage'
import { decrypt } from '@/lib/crypto'
import { currentYearMonth, previousYearMonth } from '@/lib/dates'
import type { DatadogKeys, ServiceCost, MonthlyAmount } from '@/lib/types'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stored = await getStoredKeys(userId)
  if (!stored.datadog) {
    return NextResponse.json({ error: 'Datadog認証情報が設定されていません' }, { status: 400 })
  }

  let creds: DatadogKeys
  try {
    creds = JSON.parse(decrypt(stored.datadog))
  } catch {
    return NextResponse.json({ error: 'Datadog認証情報が不正です' }, { status: 400 })
  }

  const { apiKey, appKey } = creds
  const headers = {
    'DD-API-KEY': apiKey,
    'DD-APPLICATION-KEY': appKey,
  }

  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()

  try {
    // Fetch last 6 months of estimated costs
    const now = new Date()
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const startStr = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}`

    const res = await fetch(
      `https://api.datadoghq.com/api/v2/usage/estimated_cost?start_month=${startStr}&view=summary`,
      { headers }
    )

    if (!res.ok) {
      // Fallback: try v1 usage summary
      const summaryRes = await fetch(
        `https://api.datadoghq.com/api/v1/usage/summary?start_month=${startStr}`,
        { headers }
      )
      if (!summaryRes.ok) {
        const err = await summaryRes.json().catch(() => ({}))
        throw new Error(err.errors?.[0] ?? `Datadog API error: ${summaryRes.status}`)
      }
      // v1 returns usage metrics but not dollar amounts
      await summaryRes.json()
      const result: ServiceCost = {
        service: 'datadog',
        displayName: 'Datadog',
        currentMonth: 0,
        previousMonth: 0,
        history: [],
        currency: 'USD',
        connected: true,
        error: 'コスト取得にはDatadog管理者権限が必要です。アカウント設定をご確認ください。',
      }
      return NextResponse.json(result)
    }

    const data = await res.json()
    const history: MonthlyAmount[] = []

    for (const item of data.data ?? []) {
      const attrs = item.attributes ?? {}
      const month = (attrs.date ?? '').slice(0, 7)
      const amount = attrs.estimated_total_cost ?? 0
      if (month) {
        const existing = history.find((h) => h.month === month)
        if (existing) existing.amount += amount
        else history.push({ month, amount })
      }
    }

    history.sort((a, b) => a.month.localeCompare(b.month))
    const last6 = history.slice(-6)
    const currentMonth = last6.find((h) => h.month === curMonth)?.amount ?? 0
    const previousMonth = last6.find((h) => h.month === prevMonth)?.amount ?? 0

    const result: ServiceCost = {
      service: 'datadog',
      displayName: 'Datadog',
      currentMonth,
      previousMonth,
      history: last6,
      currency: 'USD',
      connected: true,
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error('Datadog cost fetch error:', e)
    const message = e instanceof Error ? e.message : 'Datadog APIからデータを取得できませんでした'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
