import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getStoredKeys } from '@/lib/storage'
import { currentYearMonth, previousYearMonth } from '@/lib/dates'
import type { ServiceCost, MonthlyAmount } from '@/lib/types'

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stored = await getStoredKeys(userId, orgId)
  if (!stored.openai) {
    return NextResponse.json({ error: 'OpenAI APIキーが設定されていません' }, { status: 400 })
  }

  const apiKey = stored.openai
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()
  const now = new Date()

  try {
    // Fetch last 6 months of billing usage
    const fetches = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const endDate = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return { month, startDate, endDate }
    })

    const results = await Promise.all(
      fetches.map(async ({ month, startDate, endDate }) => {
        const res = await fetch(
          `https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        )
        if (!res.ok) return { month, amount: 0 }
        const data = await res.json()
        // total_usage is in cents
        const amount = (data.total_usage ?? 0) / 100
        return { month, amount }
      })
    )

    const history: MonthlyAmount[] = results
    const currentMonth = history.find((h) => h.month === curMonth)?.amount ?? 0
    const previousMonth = history.find((h) => h.month === prevMonth)?.amount ?? 0

    const result: ServiceCost = {
      service: 'openai',
      displayName: 'OpenAI',
      currentMonth,
      previousMonth,
      history,
      currency: 'USD',
      connected: true,
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error('OpenAI cost fetch error:', e)
    const message = e instanceof Error ? e.message : 'OpenAI APIからデータを取得できませんでした'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
