import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getDepartments, saveDepartments } from '@/lib/storage'
import type { Department } from '@/lib/types'

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

const DEPT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#14b8a6',
]

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const depts = await getDepartments(userId, orgId)
  return NextResponse.json(depts)
}

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { name: string; color?: string }
  if (!body.name?.trim()) return NextResponse.json({ error: '部門名を入力してください' }, { status: 400 })

  const depts = await getDepartments(userId, orgId)
  const color = body.color || DEPT_COLORS[depts.length % DEPT_COLORS.length]
  const newDept: Department = {
    id: randomId(),
    name: body.name.trim(),
    color,
    createdAt: new Date().toISOString(),
  }
  depts.push(newDept)
  await saveDepartments(userId, orgId, depts)
  return NextResponse.json({ id: newDept.id })
}
