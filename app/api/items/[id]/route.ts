import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCostItems, saveCostItems } from '@/lib/storage'
import { encrypt } from '@/lib/crypto'
import { buildCredentials, getServiceDef } from '@/lib/services'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { name?: string; credentials?: Record<string, string> }

  const items = await getCostItems(userId, orgId)
  const item = items.find((i) => i.id === id)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.name?.trim()) item.name = body.name.trim()

  if (body.credentials) {
    const def = getServiceDef(item.type)
    if (def && item.type !== 'invoice') {
      for (const field of def.fields) {
        if (!body.credentials[field.key]?.trim()) {
          return NextResponse.json({ error: `${field.label}を入力してください` }, { status: 400 })
        }
      }
      item.credentials = encrypt(buildCredentials(item.type, body.credentials))
    }
  }

  await saveCostItems(userId, orgId, items)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const items = await getCostItems(userId, orgId)
  const filtered = items.filter((i) => i.id !== id)
  if (filtered.length === items.length) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await saveCostItems(userId, orgId, filtered)
  return NextResponse.json({ ok: true })
}
