import { decrypt } from './crypto'
import { parseCredentials } from './services'
import { getMonthRange, currentYearMonth, previousYearMonth } from './dates'
import type { CostItem, ServiceCost, MonthlyAmount, AwsCredentials, GithubCredentials, DatadogCredentials, GcpCredentials } from './types'

// ── Vercel ──────────────────────────────────────────────────────────────────
async function fetchVercel(item: CostItem): Promise<ServiceCost> {
  const token = decrypt(item.credentials!)
  const { start, end } = getMonthRange(6)
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()

  const res = await fetch(`https://api.vercel.com/v1/billing/invoices?from=${start}&until=${end}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const history: MonthlyAmount[] = []
  if (res.ok) {
    const data = await res.json()
    if (Array.isArray(data.invoices)) {
      for (const inv of data.invoices) {
        const month = (inv.period?.start ?? inv.createdAt ?? '').slice(0, 7)
        const amount = (inv.total ?? inv.amount ?? 0) / 100
        if (month) {
          const existing = history.find((h) => h.month === month)
          if (existing) existing.amount += amount
          else history.push({ month, amount })
        }
      }
    }
  }
  if (history.length === 0) history.push({ month: curMonth, amount: 0 })
  history.sort((a, b) => a.month.localeCompare(b.month))
  const last6 = history.slice(-6)
  return {
    itemId: item.id, name: item.name, type: 'vercel',
    currentMonth: last6.find((h) => h.month === curMonth)?.amount ?? 0,
    previousMonth: last6.find((h) => h.month === prevMonth)?.amount ?? 0,
    history: last6, currency: 'USD', connected: true,
  }
}

// ── AWS ──────────────────────────────────────────────────────────────────────
async function fetchAws(item: CostItem): Promise<ServiceCost> {
  const creds = parseCredentials('aws', decrypt(item.credentials!)) as unknown as AwsCredentials
  const { start, end } = getMonthRange(6)
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()

  const { CostExplorerClient, GetCostAndUsageCommand } = await import('@aws-sdk/client-cost-explorer')
  const client = new CostExplorerClient({
    region: 'us-east-1',
    credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey },
  })
  const response = await client.send(new GetCostAndUsageCommand({
    TimePeriod: { Start: start, End: end },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
  }))
  const history: MonthlyAmount[] = (response.ResultsByTime ?? []).map((r) => ({
    month: r.TimePeriod?.Start?.slice(0, 7) ?? '',
    amount: parseFloat(r.Total?.UnblendedCost?.Amount ?? '0'),
  })).filter((h) => h.month)
  history.sort((a, b) => a.month.localeCompare(b.month))
  const last6 = history.slice(-6)
  return {
    itemId: item.id, name: item.name, type: 'aws',
    currentMonth: last6.find((h) => h.month === curMonth)?.amount ?? 0,
    previousMonth: last6.find((h) => h.month === prevMonth)?.amount ?? 0,
    history: last6, currency: 'USD', connected: true,
  }
}

// ── Anthropic ────────────────────────────────────────────────────────────────
async function fetchAnthropic(item: CostItem): Promise<ServiceCost> {
  const apiKey = decrypt(item.credentials!)
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()
  const now = new Date()

  const results = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const endD = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const endDate = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-01`
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return fetch(`https://api.anthropic.com/v1/usage?start_date=${startDate}&end_date=${endDate}`, {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      }).then((r) => r.ok ? r.json() : { total_cost: 0 })
        .then((data) => ({ month, amount: data.total_cost ?? data.cost_usd ?? 0 }))
    })
  )
  return {
    itemId: item.id, name: item.name, type: 'anthropic',
    currentMonth: results.find((h) => h.month === curMonth)?.amount ?? 0,
    previousMonth: results.find((h) => h.month === prevMonth)?.amount ?? 0,
    history: results, currency: 'USD', connected: true,
  }
}

// ── OpenAI ───────────────────────────────────────────────────────────────────
async function fetchOpenAI(item: CostItem): Promise<ServiceCost> {
  const apiKey = decrypt(item.credentials!)
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()
  const now = new Date()

  const results = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const endDate = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return fetch(`https://api.openai.com/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      }).then((r) => r.ok ? r.json() : { total_usage: 0 })
        .then((data) => ({ month, amount: (data.total_usage ?? 0) / 100 }))
    })
  )
  return {
    itemId: item.id, name: item.name, type: 'openai',
    currentMonth: results.find((h) => h.month === curMonth)?.amount ?? 0,
    previousMonth: results.find((h) => h.month === prevMonth)?.amount ?? 0,
    history: results, currency: 'USD', connected: true,
  }
}

// ── Resend ───────────────────────────────────────────────────────────────────
async function fetchResend(item: CostItem): Promise<ServiceCost> {
  const apiKey = decrypt(item.credentials!)
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()
  const FREE = 3000
  const RATE = 0.8

  const monthCounts = new Map<string, number>()
  let cursor: string | undefined
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ limit: '100' })
    if (cursor) params.set('after', cursor)
    const res = await fetch(`https://api.resend.com/emails?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) break
    const json = await res.json()
    const data: { id: string; created_at: string }[] = Array.isArray(json.data) ? json.data : []
    for (const email of data) {
      const month = email.created_at?.slice(0, 7)
      if (month) monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1)
    }
    if (data.length < 100) break
    cursor = data[data.length - 1]?.id
  }

  const now = new Date()
  const history: MonthlyAmount[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const count = monthCounts.get(month) ?? 0
    return { month, amount: count <= FREE ? 0 : ((count - FREE) / 1000) * RATE }
  })
  return {
    itemId: item.id, name: item.name, type: 'resend',
    currentMonth: history.find((h) => h.month === curMonth)?.amount ?? 0,
    previousMonth: history.find((h) => h.month === prevMonth)?.amount ?? 0,
    history, currency: 'USD', connected: true,
  }
}

// ── GitHub ───────────────────────────────────────────────────────────────────
async function fetchGitHub(item: CostItem): Promise<ServiceCost> {
  const creds = parseCredentials('github', decrypt(item.credentials!)) as unknown as GithubCredentials
  const { token, accountName, accountType } = creds
  const base = accountType === 'org' ? `/orgs/${accountName}` : `/users/${accountName}`
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()
  const RATE = { UBUNTU: 0.008, MACOS: 0.08, WINDOWS: 0.016 } as Record<string, number>

  const ghFetch = async (path: string) => {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? `GitHub API error: ${res.status}`)
    return res.json()
  }

  const [actions, storage, packages] = await Promise.allSettled([
    ghFetch(`${base}/settings/billing/actions`),
    ghFetch(`${base}/settings/billing/storage`),
    ghFetch(`${base}/settings/billing/packages`),
  ])

  let currentMonth = 0
  if (actions.status === 'fulfilled') {
    const breakdown: Record<string, number> = actions.value.minutes_used_breakdown ?? {}
    currentMonth += Object.entries(breakdown).reduce((s, [os, m]) => s + m * (RATE[os] ?? 0.008), 0)
  }
  if (storage.status === 'fulfilled') currentMonth += storage.value.estimated_paid_storage_for_month ?? 0
  if (packages.status === 'fulfilled') currentMonth += packages.value.total_paid_bandwidth_used ?? 0

  const now = new Date()
  const history: MonthlyAmount[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { month, amount: month === curMonth ? currentMonth : 0 }
  })
  return {
    itemId: item.id, name: item.name, type: 'github',
    currentMonth,
    previousMonth: history.find((h) => h.month === prevMonth)?.amount ?? 0,
    history, currency: 'USD', connected: true,
  }
}

// ── Datadog ──────────────────────────────────────────────────────────────────
async function fetchDatadog(item: CostItem): Promise<ServiceCost> {
  const creds = parseCredentials('datadog', decrypt(item.credentials!)) as unknown as DatadogCredentials
  const { apiKey, appKey } = creds
  const headers = { 'DD-API-KEY': apiKey, 'DD-APPLICATION-KEY': appKey }
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()
  const now = new Date()
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const startStr = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}`

  const res = await fetch(`https://api.datadoghq.com/api/v2/usage/estimated_cost?start_month=${startStr}&view=summary`, { headers })
  if (!res.ok) {
    return {
      itemId: item.id, name: item.name, type: 'datadog',
      currentMonth: 0, previousMonth: 0, history: [], currency: 'USD', connected: true,
      error: 'コスト取得にはDatadog管理者権限が必要です',
    }
  }
  const data = await res.json()
  const history: MonthlyAmount[] = []
  for (const d of data.data ?? []) {
    const month = (d.attributes?.date ?? '').slice(0, 7)
    const amount = d.attributes?.estimated_total_cost ?? 0
    if (month) {
      const ex = history.find((h) => h.month === month)
      if (ex) ex.amount += amount
      else history.push({ month, amount })
    }
  }
  history.sort((a, b) => a.month.localeCompare(b.month))
  const last6 = history.slice(-6)
  return {
    itemId: item.id, name: item.name, type: 'datadog',
    currentMonth: last6.find((h) => h.month === curMonth)?.amount ?? 0,
    previousMonth: last6.find((h) => h.month === prevMonth)?.amount ?? 0,
    history: last6, currency: 'USD', connected: true,
  }
}

// ── GCP ──────────────────────────────────────────────────────────────────────
async function fetchGcp(item: CostItem): Promise<ServiceCost> {
  const creds = parseCredentials('gcp', decrypt(item.credentials!)) as unknown as GcpCredentials
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()

  const { createSign } = await import('crypto')
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: creds.clientEmail,
    scope: 'https://www.googleapis.com/auth/monitoring.read https://www.googleapis.com/auth/cloud-billing.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  })).toString('base64url')
  const toSign = `${header}.${payload}`
  const sign = createSign('RSA-SHA256')
  sign.update(toSign)
  const sig = sign.sign(creds.privateKey.replace(/\\n/g, '\n'), 'base64url')

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${toSign}.${sig}` }),
  })
  if (!tokenRes.ok) throw new Error('GCP認証に失敗しました')
  const { access_token } = await tokenRes.json()

  const nowDate = new Date()
  const startTime = new Date(nowDate.getFullYear(), nowDate.getMonth() - 5, 1).toISOString().slice(0, 10)
  const mqlRes = await fetch(`https://monitoring.googleapis.com/v3/projects/${creds.projectId}/timeSeries:query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `fetch billing_account::billing.googleapis.com/billing_account_cost | within d'${startTime}', d'${nowDate.toISOString().slice(0, 10)}' | group_by [metric.month], [value: sum(value.cost)]`,
    }),
  })

  const history: MonthlyAmount[] = []
  if (mqlRes.ok) {
    const mqlData = await mqlRes.json()
    for (const series of mqlData.timeSeriesData ?? []) {
      for (const point of series.pointData ?? []) {
        const month = (point.timeInterval?.startTime ?? '').slice(0, 7)
        const amount = point.values?.[0]?.doubleValue ?? 0
        if (month) {
          const ex = history.find((h) => h.month === month)
          if (ex) ex.amount += amount
          else history.push({ month, amount })
        }
      }
    }
  }
  if (history.length === 0) {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1)
      history.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, amount: 0 })
    }
  }
  history.sort((a, b) => a.month.localeCompare(b.month))
  const last6 = history.slice(-6)
  return {
    itemId: item.id, name: item.name, type: 'gcp',
    currentMonth: last6.find((h) => h.month === curMonth)?.amount ?? 0,
    previousMonth: last6.find((h) => h.month === prevMonth)?.amount ?? 0,
    history: last6, currency: 'USD', connected: true,
  }
}

// ── Invoice ──────────────────────────────────────────────────────────────────
export function buildInvoiceCost(item: CostItem): ServiceCost {
  const curMonth = currentYearMonth()
  const prevMonth = previousYearMonth()
  const entries = item.invoiceEntries ?? []
  return {
    itemId: item.id,
    name: item.name,
    type: 'invoice',
    currentMonth: entries.find((h) => h.month === curMonth)?.amount ?? 0,
    previousMonth: entries.find((h) => h.month === prevMonth)?.amount ?? 0,
    history: [...entries].sort((a, b) => a.month.localeCompare(b.month)).slice(-6),
    currency: 'USD',
    connected: true,
  }
}

// ── Dispatcher ───────────────────────────────────────────────────────────────
export async function fetchServiceCost(item: CostItem): Promise<ServiceCost> {
  if (item.type === 'invoice') return buildInvoiceCost(item)
  if (!item.credentials) throw new Error('認証情報が設定されていません')

  switch (item.type) {
    case 'vercel':    return fetchVercel(item)
    case 'aws':       return fetchAws(item)
    case 'anthropic': return fetchAnthropic(item)
    case 'openai':    return fetchOpenAI(item)
    case 'resend':    return fetchResend(item)
    case 'github':    return fetchGitHub(item)
    case 'datadog':   return fetchDatadog(item)
    case 'gcp':       return fetchGcp(item)
    default:          throw new Error('このサービスタイプはコスト取得に対応していません')
  }
}
