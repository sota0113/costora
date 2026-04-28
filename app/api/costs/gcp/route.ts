import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getStoredKeys } from '@/lib/storage'
import { currentYearMonth, previousYearMonth } from '@/lib/dates'
import type { GcpKeys, ServiceCost, MonthlyAmount } from '@/lib/types'

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const { createSign } = await import('crypto')
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/monitoring.read https://www.googleapis.com/auth/cloud-billing.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url')

  const toSign = `${header}.${payload}`
  const sign = createSign('RSA-SHA256')
  sign.update(toSign)
  const signature = sign.sign(privateKey.replace(/\\n/g, '\n'), 'base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${toSign}.${signature}`,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error_description ?? 'GCP認証に失敗しました')
  }
  const data = await res.json()
  return data.access_token as string
}

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stored = await getStoredKeys(userId, orgId)
  if (!stored.gcp) {
    return NextResponse.json({ error: 'Google Cloud認証情報が設定されていません' }, { status: 400 })
  }

  let creds: GcpKeys
  try {
    creds = JSON.parse(stored.gcp)
  } catch {
    return NextResponse.json({ error: 'Google Cloud認証情報が不正です' }, { status: 400 })
  }

  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()

  try {
    const accessToken = await getAccessToken(creds.clientEmail, creds.privateKey)

    // Cloud Monitoring MQL でbilling_account_costを月次取得
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const startTime = sixMonthsAgo.toISOString()

    const mqlRes = await fetch(
      `https://monitoring.googleapis.com/v3/projects/${creds.projectId}/timeSeries:query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `fetch billing_account::billing.googleapis.com/billing_account_cost | within d'${startTime.slice(0, 10)}', d'${now.toISOString().slice(0, 10)}' | group_by [metric.month], [value: sum(value.cost)]`,
        }),
      }
    )

    const history: MonthlyAmount[] = []

    if (mqlRes.ok) {
      const mqlData = await mqlRes.json()
      for (const series of mqlData.timeSeriesData ?? []) {
        for (const point of series.pointData ?? []) {
          const month = (point.timeInterval?.startTime ?? '').slice(0, 7)
          const amount = point.values?.[0]?.doubleValue ?? 0
          if (month) {
            const existing = history.find((h) => h.month === month)
            if (existing) existing.amount += amount
            else history.push({ month, amount })
          }
        }
      }
    }

    // データが取れなかった場合は0埋め
    if (history.length === 0) {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        history.push({ month, amount: 0 })
      }
    }

    history.sort((a, b) => a.month.localeCompare(b.month))
    const last6 = history.slice(-6)
    const currentMonth = last6.find((h) => h.month === curMonth)?.amount ?? 0
    const previousMonth = last6.find((h) => h.month === prevMonth)?.amount ?? 0

    const result: ServiceCost = {
      service: 'gcp',
      displayName: 'Google Cloud',
      currentMonth,
      previousMonth,
      history: last6,
      currency: 'USD',
      connected: true,
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error('GCP cost fetch error:', e)
    const message = e instanceof Error ? e.message : 'Google Cloud APIからデータを取得できませんでした'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
