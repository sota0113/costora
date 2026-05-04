import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getDepartments, saveDepartments, getCostItems, saveCostItems } from '@/lib/storage'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { name?: string; color?: string }

  const depts = await getDepartments(userId, orgId)
  const dept = depts.find((d) => d.id === id)
  if (!dept) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.name?.trim()) dept.name = body.name.trim()
  if (body.color) dept.color = body.color

  await saveDepartments(userId, orgId, depts)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const depts = await getDepartments(userId, orgId)
  const filtered = depts.filter((d) => d.id !== id)
  if (filtered.length === depts.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await saveDepartments(userId, orgId, filtered)

  // Remove this dept from all items' deptId and allocations
  const items = await getCostItems(userId, orgId)
  const updated = items.map((item) => {
    const next = { ...item }
    if (next.deptId === id) delete next.deptId
    if (next.allocations) {
      next.allocations = next.allocations.filter((a) => a.deptId !== id)
      if (next.allocations.length === 0) delete next.allocations
    }
    return next
  })
  await saveCostItems(userId, orgId, updated)

  return NextResponse.json({ ok: true })
}
