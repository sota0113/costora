import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCostItems, saveCostItems } from '@/lib/storage'
import { encrypt } from '@/lib/crypto'
import { buildCredentials, getServiceDef } from '@/lib/services'
import type { DeptAllocation, MonthlyAmount } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as {
    name?: string
    credentials?: Record<string, string>
    comment?: string
    deptId?: string | null
    allocations?: DeptAllocation[]
    invoiceEntries?: MonthlyAmount[]
    tagGroupBy?: string | null
  }

  const items = await getCostItems(userId, orgId)
  const item = items.find((i) => i.id === id)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.name?.trim()) item.name = body.name.trim()
  if (typeof body.comment === 'string') item.comment = body.comment

  // Department assignment: either single dept or percentage split
  if ('deptId' in body) {
    if (body.deptId === null || body.deptId === '') {
      delete item.deptId
    } else if (body.deptId) {
      item.deptId = body.deptId
      delete item.allocations // clear allocations when single dept is set
    }
  }
  if ('allocations' in body) {
    if (!body.allocations || body.allocations.length === 0) {
      delete item.allocations
      delete item.deptId
    } else {
      item.allocations = body.allocations
      delete item.deptId // clear single dept when allocations are set
    }
  }

  // Invoice cost entries
  if ('invoiceEntries' in body) {
    if (!body.invoiceEntries || body.invoiceEntries.length === 0) {
      delete item.invoiceEntries
    } else {
      item.invoiceEntries = body.invoiceEntries
    }
  }

  if ('tagGroupBy' in body) {
    item.tagGroupBy = body.tagGroupBy?.trim() || undefined
  }

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
