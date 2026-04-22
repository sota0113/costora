import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getStoredKeys } from '@/lib/storage'
import { decrypt } from '@/lib/crypto'
import { currentYearMonth, previousYearMonth } from '@/lib/dates'
import type { ServiceCost, MonthlyAmount } from '@/lib/types'

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stored = await getStoredKeys(userId, orgId)
  if (!stored.anthropic) {
    return NextResponse.json({ error: 'Anthropic APIキーが設定されていません' }, { status: 400 })
  }

  const apiKey = decrypt(stored.anthropic)
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()

  const now = new Date()
  const history: MonthlyAmount[] = []

  try {
    // Fetch usage for each of the last 6 months
    const fetches = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const endD = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const endDate = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-01`
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return { month, startDate, endDate }
    })

    const results = await Promise.all(
      fetches.map(async ({ month, startDate, endDate }) => {
        const res = await fetch(
          `https://api.anthropic.com/v1/usage?start_date=${startDate}&end_date=${endDate}`,
          {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
          }
        )
        if (!res.ok) return { month, amount: 0 }
        const data = await res.json()
        // Cost in USD cents → dollars
        const amount = (data.total_cost ?? data.cost_usd ?? 0)
        return { month, amount }
      })
    )

    history.push(...results)
    const currentMonth = history.find((h) => h.month === curMonth)?.amount ?? 0
    const previousMonth = history.find((h) => h.month === prevMonth)?.amount ?? 0

    const result: ServiceCost = {
      service: 'anthropic',
      displayName: 'Anthropic',
      currentMonth,
      previousMonth,
      history,
      currency: 'USD',
      connected: true,
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error('Anthropic cost fetch error:', e)
    const message = e instanceof Error ? e.message : 'Anthropic APIからデータを取得できませんでした'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
