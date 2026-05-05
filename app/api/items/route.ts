import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCostItems, saveCostItems } from '@/lib/storage'
import { encrypt } from '@/lib/crypto'
import { buildCredentials, getServiceDef } from '@/lib/services'
import type { CostItem, ServiceType, MonthlyAmount } from '@/lib/types'

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await getCostItems(userId, orgId)
  // return items without credentials
  return NextResponse.json(items.map(({ credentials: _, ...rest }) => rest))
}

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { type: ServiceType; name: string; credentials: Record<string, string>; invoiceEntries?: MonthlyAmount[] }
  const { type, name, credentials } = body

  const def = getServiceDef(type)
  if (!def) return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  // tagGroupBy is non-sensitive config, stored separately from credentials
  const { tagGroupBy: rawTagGroupBy, ...credFields } = credentials ?? {}
  const tagGroupBy = rawTagGroupBy?.trim() || undefined

  // validate required credential fields
  if (type !== 'invoice') {
    for (const field of def.fields) {
      if (!credFields[field.key]?.trim()) {
        return NextResponse.json({ error: `${field.label}を入力してください` }, { status: 400 })
      }
    }
  }

  const items = await getCostItems(userId, orgId)
  const newItem: CostItem = {
    id: randomId(),
    name: name.trim(),
    type,
    credentials: type === 'invoice' ? undefined : encrypt(buildCredentials(type, credFields)),
    tagGroupBy,
    invoiceEntries: body.invoiceEntries?.length ? body.invoiceEntries : undefined,
    createdAt: new Date().toISOString(),
  }
  items.push(newItem)
  await saveCostItems(userId, orgId, items)

  return NextResponse.json({ id: newItem.id })
}
