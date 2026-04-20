import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getStoredKeys } from '@/lib/storage'
import { decrypt } from '@/lib/crypto'
import { currentYearMonth, previousYearMonth } from '@/lib/dates'
import type { GithubKeys, ServiceCost, MonthlyAmount } from '@/lib/types'

// GitHub Actions pricing per minute
const MINUTE_COST = { UBUNTU: 0.008, MACOS: 0.08, WINDOWS: 0.016 } as const

async function ghFetch(path: string, token: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `GitHub API error: ${res.status}`)
  }
  return res.json()
}

function calcActionsCost(breakdown: Record<string, number>): number {
  return Object.entries(breakdown).reduce((sum, [os, minutes]) => {
    const rate = MINUTE_COST[os as keyof typeof MINUTE_COST] ?? 0.008
    return sum + minutes * rate
  }, 0)
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stored = await getStoredKeys(userId)
  if (!stored.github) {
    return NextResponse.json({ error: 'GitHub認証情報が設定されていません' }, { status: 400 })
  }

  let creds: GithubKeys
  try {
    creds = JSON.parse(decrypt(stored.github))
  } catch {
    return NextResponse.json({ error: 'GitHub認証情報が不正です' }, { status: 400 })
  }

  const { token, accountName, accountType } = creds
  const base = accountType === 'org' ? `/orgs/${accountName}` : `/users/${accountName}`
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()

  try {
    // Fetch all billing endpoints in parallel
    const [actions, storage, packages] = await Promise.allSettled([
      ghFetch(`${base}/settings/billing/actions`, token),
      ghFetch(`${base}/settings/billing/storage`, token),
      ghFetch(`${base}/settings/billing/packages`, token),
    ])

    let currentMonth = 0

    if (actions.status === 'fulfilled') {
      const data = actions.value
      const breakdown: Record<string, number> = data.minutes_used_breakdown ?? {}
      const paidMinutes = data.total_paid_minutes_used ?? 0
      // Use paid minutes cost if available, otherwise calculate from breakdown
      currentMonth += paidMinutes > 0
        ? calcActionsCost(breakdown)
        : 0
    }

    if (storage.status === 'fulfilled') {
      currentMonth += storage.value.estimated_paid_storage_for_month ?? 0
    }

    if (packages.status === 'fulfilled') {
      currentMonth += packages.value.total_paid_bandwidth_used ?? 0
    }

    // GitHub API doesn't provide historical monthly data — build minimal history
    const now = new Date()
    const history: MonthlyAmount[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return { month, amount: month === curMonth ? currentMonth : 0 }
    })

    const result: ServiceCost = {
      service: 'github',
      displayName: 'GitHub',
      currentMonth,
      previousMonth: history.find((h) => h.month === prevMonth)?.amount ?? 0,
      history,
      currency: 'USD',
      connected: true,
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error('GitHub cost fetch error:', e)
    const message = e instanceof Error ? e.message : 'GitHub APIからデータを取得できませんでした'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
