import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getStoredKeys } from '@/lib/storage'
import { decrypt } from '@/lib/crypto'
import { getMonthRange, currentYearMonth, previousYearMonth } from '@/lib/dates'
import type { ServiceCost, MonthlyAmount } from '@/lib/types'

async function fetchVercelBilling(token: string, start: string, end: string) {
  const res = await fetch(
    `https://api.vercel.com/v1/billing/invoices?from=${start}&until=${end}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )
  if (!res.ok) {
    // Try alternative endpoint
    const res2 = await fetch('https://api.vercel.com/v2/billing', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res2.ok) return null
    return res2.json()
  }
  return res.json()
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stored = await getStoredKeys(userId)
  if (!stored.vercel) {
    return NextResponse.json({ error: 'Vercel APIキーが設定されていません' }, { status: 400 })
  }

  const token = decrypt(stored.vercel)
  const { start, end } = getMonthRange(6)
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()

  try {
    const data = await fetchVercelBilling(token, start, end)

    // Parse response and build history
    // Vercel billing response varies by plan; handle both invoice and summary formats
    const history: MonthlyAmount[] = []
    let currentMonth = 0
    let previousMonth = 0

    if (data && Array.isArray(data.invoices)) {
      // Invoice format
      for (const inv of data.invoices) {
        const month = (inv.period?.start ?? inv.createdAt ?? '').slice(0, 7)
        const amount = (inv.total ?? inv.amount ?? 0) / 100 // assume cents
        if (month) {
          const existing = history.find((h) => h.month === month)
          if (existing) {
            existing.amount += amount
          } else {
            history.push({ month, amount })
          }
        }
      }
    } else if (data && data.period) {
      // Summary format
      const amount = (data.total ?? data.amount ?? data.currentBill ?? 0)
      history.push({ month: curMonth, amount })
    } else {
      // Fallback: try to get current usage
      const usageRes = await fetch('https://api.vercel.com/v1/integrations/log-drains', {
        headers: { Authorization: `Bearer ${token}` },
      })
      // If we can reach the API but billing data isn't available, return $0 with note
      history.push({ month: curMonth, amount: 0 })
    }

    history.sort((a, b) => a.month.localeCompare(b.month))
    const last6 = history.slice(-6)

    currentMonth = last6.find((h) => h.month === curMonth)?.amount ?? 0
    previousMonth = last6.find((h) => h.month === prevMonth)?.amount ?? 0

    const result: ServiceCost = {
      service: 'vercel',
      displayName: 'Vercel',
      currentMonth,
      previousMonth,
      history: last6,
      currency: 'USD',
      connected: true,
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error('Vercel cost fetch error:', e)
    return NextResponse.json(
      { error: 'Vercel APIからデータを取得できませんでした' },
      { status: 500 }
    )
  }
}
