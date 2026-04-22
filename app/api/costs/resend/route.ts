import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getStoredKeys } from '@/lib/storage'
import { decrypt } from '@/lib/crypto'
import { currentYearMonth, previousYearMonth } from '@/lib/dates'
import type { ServiceCost, MonthlyAmount } from '@/lib/types'

// Resend pricing: free tier includes 3,000/month. Pro plan: $20/mo + $0.80/1000 above included.
// For estimation, we use: emails above 3000 → $0.80/1000
const FREE_EMAILS_PER_MONTH = 3000
const COST_PER_1000 = 0.8

function estimateCost(emailCount: number): number {
  if (emailCount <= FREE_EMAILS_PER_MONTH) return 0
  return ((emailCount - FREE_EMAILS_PER_MONTH) / 1000) * COST_PER_1000
}

type ResendEmail = {
  id: string
  created_at: string
  // other fields exist but we only need these
}

async function fetchEmailsPage(
  apiKey: string,
  after?: string
): Promise<{ data: ResendEmail[]; hasMore: boolean; nextCursor?: string }> {
  const params = new URLSearchParams({ limit: '100' })
  if (after) params.set('after', after)

  const res = await fetch(`https://api.resend.com/emails?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `Resend API error: ${res.status}`)
  }

  const json = await res.json()
  const data: ResendEmail[] = Array.isArray(json.data) ? json.data : []
  return {
    data,
    hasMore: data.length === 100,
    nextCursor: data[data.length - 1]?.id,
  }
}

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stored = await getStoredKeys(userId, orgId)
  if (!stored.resend) {
    return NextResponse.json({ error: 'Resend APIキーが設定されていません' }, { status: 400 })
  }

  const apiKey = decrypt(stored.resend)
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()

  try {
    // Fetch emails and aggregate by month (last 6 months)
    const monthCounts = new Map<string, number>()
    let cursor: string | undefined
    let pages = 0
    const MAX_PAGES = 20 // cap at 2000 emails to avoid timeout

    do {
      const { data, hasMore, nextCursor } = await fetchEmailsPage(apiKey, cursor)
      for (const email of data) {
        const month = email.created_at?.slice(0, 7)
        if (month) {
          monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1)
        }
      }
      cursor = nextCursor
      pages++
      if (!hasMore) break
    } while (pages < MAX_PAGES)

    // Build history for last 6 months
    const now = new Date()
    const history: MonthlyAmount[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const count = monthCounts.get(month) ?? 0
      history.push({ month, amount: estimateCost(count) })
    }

    const currentMonth = history.find((h) => h.month === curMonth)?.amount ?? 0
    const previousMonth = history.find((h) => h.month === prevMonth)?.amount ?? 0

    const result: ServiceCost = {
      service: 'resend',
      displayName: 'Resend',
      currentMonth,
      previousMonth,
      history,
      currency: 'USD',
      connected: true,
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error('Resend cost fetch error:', e)
    const message = e instanceof Error ? e.message : 'Resend APIからデータを取得できませんでした'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
