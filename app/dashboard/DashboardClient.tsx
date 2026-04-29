'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ServiceCost, MonthlyAmount } from '@/lib/types'
import { ServiceIcon } from '@/components/ServiceIcon'

type Props = {
  itemIds: string[]
  isOrgContext: boolean
}

function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const pct = ((current - previous) / previous) * 100
  const up = pct > 0
  return (
    <span style={{ fontSize: 13, fontWeight: 500, color: up ? 'var(--danger)' : 'var(--success)', fontFamily: 'DM Mono, monospace' }}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function BarChart({ history }: { history: MonthlyAmount[] }) {
  const max = Math.max(...history.map((h) => h.amount), 0.01)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, padding: '0 4px' }}>
      {history.map((item, i) => {
        const isLatest = i === history.length - 1
        const heightPct = (item.amount / max) * 100
        const label = item.month.slice(5) + '月'
        return (
          <div key={item.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', height: `${Math.max(heightPct, 4)}%`, background: isLatest ? 'var(--ink)' : 'var(--border)', borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease' }} />
            <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function ServiceCard({ cost }: { cost: ServiceCost }) {
  const [expanded, setExpanded] = useState(false)
  const change = cost.previousMonth > 0 ? ((cost.currentMonth - cost.previousMonth) / cost.previousMonth) * 100 : null

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded((p) => !p)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ServiceIcon service={cost.type} size={28} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 500 }}>{cost.name}</span>
              {cost.error && (
                <span style={{ fontSize: 11, background: '#fff5f5', color: 'var(--danger)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--danger)' }}>
                  エラー
                </span>
              )}
            </div>
            {change !== null && (
              <div style={{ marginTop: 2 }}>
                <ChangeIndicator current={cost.currentMonth} previous={cost.previousMonth} />
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500, fontSize: 16 }}>{formatUSD(cost.currentMonth)}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>今月</div>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px' }}>
          {cost.error ? (
            <p style={{ fontSize: 13, color: 'var(--danger)' }}>{cost.error}</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13, color: 'var(--muted)' }}>
                <span>先月: {formatUSD(cost.previousMonth)}</span>
                {change !== null && (
                  <span style={{ color: change > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {change > 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                )}
              </div>
              {cost.history.length > 0 && <BarChart history={cost.history} />}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function DashboardClient({ itemIds, isOrgContext }: Props) {
  const [costs, setCosts] = useState<ServiceCost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      const results = await Promise.all(
        itemIds.map(async (id) => {
          try {
            const res = await fetch(`/api/costs/${id}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'エラーが発生しました')
            return data as ServiceCost
          } catch (e) {
            return {
              itemId: id,
              name: id,
              type: 'vercel',
              currentMonth: 0,
              previousMonth: 0,
              history: [],
              currency: 'USD',
              connected: true,
              error: e instanceof Error ? e.message : 'データ取得に失敗しました',
            } as ServiceCost
          }
        })
      )
      setCosts(results)
      setLoading(false)
    }
    fetchAll()
  }, [itemIds])

  const totalCurrent = costs.reduce((sum, c) => sum + c.currentMonth, 0)
  const totalPrevious = costs.reduce((sum, c) => sum + c.previousMonth, 0)

  const mergedHistory = (() => {
    const map = new Map<string, number>()
    costs.forEach((c) => c.history.forEach((h) => map.set(h.month, (map.get(h.month) ?? 0) + h.amount)))
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, amount]) => ({ month, amount }))
  })()

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Costora</h1>
          {isOrgContext && (
            <span style={{ fontSize: 11, color: '#5566cc', background: '#f0f4ff', border: '1px solid #c5d0ff', borderRadius: 4, padding: '2px 7px', marginTop: 4, display: 'inline-block' }}>
              組織
            </span>
          )}
        </div>
        <Link href="/settings" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }}>設定</Link>
      </div>

      {/* Total */}
      <div className="card" style={{ marginBottom: 16, textAlign: 'center', padding: '28px 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>今月の合計コスト</p>
        {loading ? (
          <div style={{ height: 52, background: 'var(--border)', borderRadius: 8, margin: '0 auto', width: 160, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ) : (
          <>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 44, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.1 }}>
              {formatUSD(totalCurrent)}
            </div>
            <div style={{ marginTop: 10 }}>
              <ChangeIndicator current={totalCurrent} previous={totalPrevious} />
              {totalPrevious > 0 && (
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>先月比（{formatUSD(totalPrevious)}）</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Trend */}
      {!loading && mergedHistory.length > 1 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>過去6ヶ月のトレンド</p>
          <BarChart history={mergedHistory} />
        </div>
      )}

      {/* Breakdown */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>サービス別内訳</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading
            ? itemIds.map((id) => (
                <div key={id} style={{ height: 72, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', opacity: 0.6 }} />
              ))
            : costs.map((cost) => <ServiceCard key={cost.itemId} cost={cost} />)}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}
