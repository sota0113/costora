import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCostItems } from '@/lib/storage'
import { decrypt } from '@/lib/crypto'
import type { VercelTeam, VercelProject, MonthlyAmount } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { token?: string; itemId?: string }

  let token: string
  if (body.token?.trim()) {
    token = body.token.trim()
  } else if (body.itemId) {
    const items = await getCostItems(userId, orgId)
    const item = items.find((i) => i.id === body.itemId)
    if (!item?.credentials) return NextResponse.json({ error: 'アイテムが見つかりません' }, { status: 404 })
    token = decrypt(item.credentials)
  } else {
    return NextResponse.json({ error: 'token か itemId が必要です' }, { status: 400 })
  }

  const headers = { Authorization: `Bearer ${token}` }

  try {
    const [teamsRes, projectsRes, billingRes] = await Promise.all([
      fetch('https://api.vercel.com/v2/teams?limit=20', { headers }),
      fetch('https://api.vercel.com/v9/projects?limit=100', { headers }),
      fetch('https://api.vercel.com/v1/billing/invoices?limit=12', { headers }),
    ])

    const teams: VercelTeam[] = teamsRes.ok
      ? ((await teamsRes.json()).teams ?? []).map((t: { id: string; name: string; slug: string }) => ({
          id: t.id, name: t.name, slug: t.slug,
        }))
      : []

    const projects: VercelProject[] = projectsRes.ok
      ? ((await projectsRes.json()).projects ?? []).map((p: { id: string; name: string; teamId?: string }) => ({
          id: p.id, name: p.name, teamId: p.teamId ?? null,
        }))
      : []

    const billingHistory: MonthlyAmount[] = []
    if (billingRes.ok) {
      const billingData = await billingRes.json()
      for (const inv of billingData.invoices ?? []) {
        const month = (inv.period?.start ?? inv.createdAt ?? '').slice(0, 7)
        const amount = (inv.total ?? inv.amount ?? 0) / 100
        if (month) {
          const ex = billingHistory.find((h) => h.month === month)
          if (ex) ex.amount += amount
          else billingHistory.push({ month, amount })
        }
      }
      billingHistory.sort((a, b) => a.month.localeCompare(b.month))
    }

    return NextResponse.json({ teams, projects, billingHistory, fetchedAt: new Date().toISOString() })
  } catch (e) {
    console.error('Vercel test error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '接続テストに失敗しました' },
      { status: 500 },
    )
  }
}
