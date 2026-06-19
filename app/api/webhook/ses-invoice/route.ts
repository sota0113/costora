import { NextRequest, NextResponse } from 'next/server'
import { lookupEmailAlias, getCostItemsByTenantKey, saveCostItemsByTenantKey } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 120

const PARSE_API_URL = process.env.PARSE_API_URL ?? 'http://localhost:8000'

type ParsedField = {
  productName: string
  subtotal: number | null
  expiryDate: string | null
  currency: string | null
  billingPeriodStart: string | null
  billingPeriodEnd: string | null
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (!process.env.SES_WEBHOOK_SECRET || secret !== process.env.SES_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { itemId?: string; filename?: string; fileBase64?: string }
  const { itemId, filename, fileBase64 } = body

  if (!itemId || !filename || !fileBase64) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const tenant = await lookupEmailAlias(itemId)
  if (!tenant) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const apiKey = process.env.INFERENCE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'INFERENCE_API_KEY not configured' }, { status: 500 })
  }

  const fileBuffer = Buffer.from(fileBase64, 'base64')
  const form = new FormData()
  form.append('file', new Blob([fileBuffer]), filename)

  const parseRes = await fetch(`${PARSE_API_URL}/parse`, {
    method: 'POST',
    headers: { 'X-Api-Key': apiKey },
    body: form,
    signal: AbortSignal.timeout(90_000),
  })

  if (!parseRes.ok) {
    const detail = await parseRes.text()
    return NextResponse.json({ error: `Parse failed: ${detail}` }, { status: 502 })
  }

  const { fields } = await parseRes.json() as { fields: ParsedField[] }
  if (!fields?.length) {
    return NextResponse.json({ error: 'No fields extracted' }, { status: 422 })
  }

  const field = fields[0]
  const month = field.billingPeriodStart
    ? field.billingPeriodStart.slice(0, 7)
    : new Date().toISOString().slice(0, 7)

  const items = await getCostItemsByTenantKey(tenant)
  const item = items.find(i => i.id === itemId)
  if (!item) {
    return NextResponse.json({ error: 'Item not found in tenant' }, { status: 404 })
  }

  const entries = [...(item.invoiceEntries ?? [])]
  const idx = entries.findIndex(e => e.month === month)
  const entry = { month, amount: field.subtotal ?? 0 }
  if (idx >= 0) {
    entries[idx] = entry
  } else {
    entries.push(entry)
    entries.sort((a, b) => a.month.localeCompare(b.month))
  }
  item.invoiceEntries = entries

  if (field.currency) item.currency = field.currency
  if (field.expiryDate) item.expiresAt = field.expiryDate

  await saveCostItemsByTenantKey(tenant, items)

  return NextResponse.json({ ok: true, month, amount: entry.amount })
}
