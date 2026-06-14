'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ServiceCost, Department, CostItem, DeptAllocation } from '@/lib/types'
import { useT, useLang } from '@/lib/i18n'

type ItemMeta = Omit<CostItem, 'credentials'>
type Props = {
  itemIds: string[]
  isOrgContext: boolean
  departments: Department[]
  itemMeta: ItemMeta[]
}

// ── Department aggregation ─────────────────────────────────────
type DeptCost = {
  deptId: string
  name: string
  color: string
  values: number[]
}

function buildDeptCosts(
  costs: ServiceCost[],
  months: string[],
  costMap: Record<string, number[]>,
  departments: Department[],
  itemMeta: ItemMeta[],
  unallocLabel: string,
): DeptCost[] {
  const deptTotals: Record<string, number[]> = {}
  const unallocTotals: number[] = months.map(() => 0)

  costs.forEach(cost => {
    // Exact match (non-grouped) or parent match (tag-grouped: itemId = parentId:tagValue)
    let meta = itemMeta.find(m => m.id === cost.itemId)
    let tagValue: string | null = null
    if (!meta) {
      meta = itemMeta.find(m => cost.itemId.startsWith(m.id + ':'))
      if (meta) tagValue = cost.itemId.slice(meta.id.length + 1)
    }

    const vals = costMap[cost.itemId] ?? months.map(() => 0)

    if (!meta) {
      vals.forEach((v, i) => { unallocTotals[i] += v })
      return
    }

    // Tag-based allocation: map tag value → department via tagAllocations
    if (tagValue !== null) {
      const tagAlloc = meta.tagAllocations?.find(a => a.tagValue === tagValue)
      if (tagAlloc?.deptId) {
        if (!deptTotals[tagAlloc.deptId]) deptTotals[tagAlloc.deptId] = months.map(() => 0)
        vals.forEach((v, i) => { deptTotals[tagAlloc.deptId!][i] += v })
      } else {
        vals.forEach((v, i) => { unallocTotals[i] += v })
      }
      return
    }

    // Ratio / single-dept / other allocation modes
    const allocs: DeptAllocation[] = meta.allocations && meta.allocations.length > 0
      ? meta.allocations
      : meta.deptId
        ? [{ deptId: meta.deptId, pct: 100 }]
        : []

    const allocatedPct = allocs.reduce((s, a) => s + a.pct, 0)
    const unallocPct = Math.max(0, 100 - allocatedPct)

    allocs.forEach(a => {
      if (!deptTotals[a.deptId]) deptTotals[a.deptId] = months.map(() => 0)
      vals.forEach((v, i) => { deptTotals[a.deptId][i] += v * (a.pct / 100) })
    })

    vals.forEach((v, i) => { unallocTotals[i] += v * (unallocPct / 100) })
  })

  const result: DeptCost[] = departments
    .filter(d => deptTotals[d.id] && deptTotals[d.id].some(v => v > 0))
    .map(d => ({ deptId: d.id, name: d.name, color: d.color, values: deptTotals[d.id] }))

  if (unallocTotals.some(v => v > 0)) {
    result.push({ deptId: '__unalloc__', name: unallocLabel, color: '#9a9a9a', values: unallocTotals })
  }

  return result
}

const SERVICE_TINT: Record<string, string> = {
  vercel: '#1a1a1a',
  aws: '#232F3E',
  gcp: '#4285F4',
  github: '#24292e',
  datadog: '#632CA6',
  anthropic: '#CC785C',
  openai: '#10A37F',
  resend: '#1a1a1a',
  invoice: '#6b7280',
}

// ── Icons ──────────────────────────────────────────────────────
function ArrowUpIcon() {
  return <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
}
function ArrowDownIcon() {
  return <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
}
function DashboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
}
function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}

// ── Helpers ────────────────────────────────────────────────────
function buildMonths(costs: ServiceCost[], maxMonths = 12): string[] {
  const set = new Set<string>()
  costs.forEach(c => c.history.forEach(h => set.add(h.month)))
  return Array.from(set).sort().slice(-maxMonths)
}

function buildCostMap(costs: ServiceCost[], months: string[]): Record<string, number[]> {
  const map: Record<string, number[]> = {}
  costs.forEach(c => {
    map[c.itemId] = months.map(m => c.history.find(h => h.month === m)?.amount ?? 0)
  })
  return map
}

// Merge tag-grouped costs (parentId:tagValue) into their parent for service view
function aggregateTagGrouped(
  costs: ServiceCost[],
  months: string[],
  costMap: Record<string, number[]>,
  itemMeta: ItemMeta[],
): { costs: ServiceCost[]; costMap: Record<string, number[]> } {
  const accum: Record<string, { cost: ServiceCost; vals: number[] }> = {}
  for (const cost of costs) {
    const sep = cost.itemId.indexOf(':')
    if (sep < 0) {
      accum[cost.itemId] = { cost, vals: costMap[cost.itemId] ?? months.map(() => 0) }
    } else {
      const parentId = cost.itemId.slice(0, sep)
      const vals = costMap[cost.itemId] ?? months.map(() => 0)
      if (accum[parentId]) {
        vals.forEach((v, i) => { accum[parentId].vals[i] += v })
      } else {
        const parentMeta = itemMeta.find(m => m.id === parentId)
        accum[parentId] = {
          cost: { ...cost, itemId: parentId, name: parentMeta?.name ?? parentId },
          vals: [...vals],
        }
      }
    }
  }
  const aggCosts = Object.values(accum).map(({ cost, vals }) => ({
    ...cost,
    currentMonth: vals[vals.length - 1] ?? 0,
    previousMonth: vals[vals.length - 2] ?? 0,
    history: months.map((m, i) => ({ month: m, amount: vals[i] ?? 0 })),
  }))
  const aggMap: Record<string, number[]> = {}
  for (const [id, { vals }] of Object.entries(accum)) aggMap[id] = vals
  return { costs: aggCosts, costMap: aggMap }
}

// ── Stacked Chart ──────────────────────────────────────────────
type ChartLayer = { id: string; name: string; tint: string; values: number[] }

function StackedChart({
  layers,
  months,
  mode,
  hovered,
  fmtCompact,
  fmtFull,
  fmtMonth,
  onLayerClick,
}: {
  layers: ChartLayer[]
  months: string[]
  mode: 'area' | 'bar'
  hovered: string | null
  fmtCompact: (n: number) => string
  fmtFull: (n: number) => string
  fmtMonth: (m: string) => string
  onLayerClick?: (layerId: string) => void
}) {
  const [tipIdx, setTipIdx] = useState<number | null>(null)

  const W = 880, H = 300
  const PAD = { l: 56, r: 16, t: 16, b: 32 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const nMonths = months.length

  const stacks = months.map((_, mi) => {
    let acc = 0
    return layers.map(layer => {
      const val = layer.values[mi] ?? 0
      const start = acc
      acc += val
      return { id: layer.id, start, end: acc, val }
    })
  })
  const totals = stacks.map(s => s[s.length - 1]?.end ?? 0)
  const maxTotal = Math.max(1, ...totals) * 1.08

  const xCenter = (i: number) => PAD.l + (innerW / nMonths) * (i + 0.5)
  const xBar = (i: number) => PAD.l + (innerW / nMonths) * i + 6
  const barW = (innerW / nMonths) - 12
  const yScale = (v: number) => PAD.t + innerH - (v / maxTotal) * innerH

  const ticks = 4
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (maxTotal / ticks) * i)

  const smooth = (pts: [number, number][]) => {
    if (pts.length < 2) return ''
    let d = `M ${pts[0][0]} ${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1]
      const [x2, y2] = pts[i]
      const cx = (x1 + x2) / 2
      d += ` C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
    }
    return d
  }

  const areaPaths = layers.map((layer, si) => {
    const top = stacks.map((stack, i) => [xCenter(i), yScale(stack[si].end)] as [number, number])
    const bot = stacks.map((stack, i) => [xCenter(i), yScale(stack[si].start)] as [number, number])
    const topD = smooth(top)
    const botD = smooth([...bot].reverse()).replace('M', 'L')
    return { id: layer.id, tint: layer.tint, d: `${topD} ${botD} Z` }
  })

  if (nMonths === 0) return null

  return (
    <div className="chart-svg-wrap" onMouseLeave={() => setTipIdx(null)}>
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {tickVals.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yScale(v)} y2={yScale(v)} stroke="#ebebeb" strokeWidth="1" />
            <text x={PAD.l - 8} y={yScale(v) + 4} fontSize="10.5" fill="#9a9a9a" textAnchor="end" fontFamily="var(--font-mono)">
              {fmtCompact(v)}
            </text>
          </g>
        ))}

        {months.map((m, i) => (
          <text key={i} x={xCenter(i)} y={H - 10} fontSize="10.5" fill="#9a9a9a" textAnchor="middle">
            {fmtMonth(m)}
          </text>
        ))}

        {mode === 'bar' && stacks.map((stack, mi) => (
          <g key={mi}>
            {stack.map((seg, si) => {
              const layer = layers[si]
              const dim = hovered && hovered !== layer.id
              return (
                <rect
                  key={layer.id}
                  x={xBar(mi)}
                  y={yScale(seg.end)}
                  width={barW}
                  height={Math.max(0, yScale(seg.start) - yScale(seg.end))}
                  fill={layer.tint}
                  opacity={dim ? 0.18 : 1}
                  style={{ transition: 'opacity 0.18s' }}
                />
              )
            })}
          </g>
        ))}

        {mode === 'area' && areaPaths.map((p, si) => {
          const layer = layers[si]
          const dim = hovered && hovered !== layer.id
          return (
            <path
              key={p.id}
              d={p.d}
              fill={layer.tint}
              opacity={dim ? 0.18 : 0.88}
              style={{ transition: 'opacity 0.18s' }}
            />
          )
        })}

        {months.map((_, mi) => (
          <rect
            key={mi}
            x={xBar(mi) - 6}
            y={PAD.t}
            width={barW + 12}
            height={innerH}
            fill="transparent"
            style={{ cursor: onLayerClick ? 'pointer' : 'crosshair' }}
            onMouseEnter={() => setTipIdx(mi)}
            onClick={onLayerClick ? (e) => {
              const svg = (e.currentTarget as SVGElement).ownerSVGElement
              if (!svg) return
              const ctm = svg.getScreenCTM()
              if (!ctm) return
              const pt = svg.createSVGPoint()
              pt.x = e.clientX; pt.y = e.clientY
              const svgY = pt.matrixTransform(ctm.inverse()).y
              const stack = stacks[mi]
              for (let si = stack.length - 1; si >= 0; si--) {
                if (svgY >= yScale(stack[si].end) && svgY <= yScale(stack[si].start)) {
                  onLayerClick(layers[si].id)
                  return
                }
              }
            } : undefined}
          />
        ))}

        {tipIdx != null && (
          <line
            x1={xCenter(tipIdx)} x2={xCenter(tipIdx)}
            y1={PAD.t} y2={PAD.t + innerH}
            stroke="#0a0a0a" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"
          />
        )}
      </svg>

      {tipIdx != null && (
        <div
          className="tooltip"
          style={{
            left: `${(xCenter(tipIdx) / W) * 100}%`,
            top: `${(yScale(totals[tipIdx]) / H) * 100}%`,
          }}
        >
          <div className="tooltip-month">{fmtMonth(months[tipIdx])} · {fmtFull(totals[tipIdx])}</div>
          {[...layers].reverse().map(layer => {
            const v = layer.values[tipIdx] ?? 0
            if (v < 0.005) return null
            return (
              <div key={layer.id} className="tt-row">
                <span className="tt-name">
                  <span className="tt-sw" style={{ background: layer.tint }} />
                  {layer.name}
                </span>
                <span>{fmtFull(v)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function DashboardClient({ itemIds, isOrgContext, departments, itemMeta }: Props) {
  const t = useT()
  const { lang } = useLang()

  const [costs, setCosts] = useState<ServiceCost[]>([])
  const [loading, setLoading] = useState(true)
  const [chartMode, setChartMode] = useState<'area' | 'bar'>('area')
  const [viewMode, setViewMode] = useState<'service' | 'dept'>('service')
  const [hovered, setHovered] = useState<string | null>(null)
  const [currency, setCurrency] = useState<'USD' | 'JPY'>('USD')
  const [jpyRate, setJpyRate] = useState(150)
  const [drilldownItemId, setDrilldownItemId] = useState<string | null>(null)

  useEffect(() => {
    const c = localStorage.getItem('dash_currency') as 'USD' | 'JPY' | null
    const r = Number(localStorage.getItem('dash_jpy_rate'))
    if (c === 'USD' || c === 'JPY') setCurrency(c)
    if (r > 0) setJpyRate(r)
  }, [])
  useEffect(() => { localStorage.setItem('dash_currency', currency) }, [currency])
  useEffect(() => { localStorage.setItem('dash_jpy_rate', String(jpyRate)) }, [jpyRate])

  const cv = (n: number) => currency === 'JPY' ? Math.round(n * jpyRate) : n
  const sym = currency === 'JPY' ? '¥' : '$'

  const fmt = (n: number): string => {
    const v = cv(n)
    if (currency === 'JPY') {
      if (v >= 100_000_000) return `${sym}${(v / 100_000_000).toFixed(1)}億`
      if (v >= 10_000) return `${sym}${(v / 10_000).toFixed(1)}万`
      return `${sym}${v.toLocaleString('ja-JP')}`
    }
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(1)}k`
    return `${sym}${v.toFixed(2)}`
  }

  const fmtC = (n: number): string => {
    const v = cv(n)
    if (currency === 'JPY') {
      if (v >= 100_000_000) return `${sym}${(v / 100_000_000).toFixed(1)}億`
      if (v >= 10_000) return `${sym}${Math.round(v / 10_000)}万`
      return `${sym}${Math.round(v).toLocaleString('ja-JP')}`
    }
    if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`
    return `${sym}${Math.round(v)}`
  }

  const fmtF = (n: number): string => {
    const v = cv(n)
    if (currency === 'JPY') return `${sym}${v.toLocaleString('ja-JP')}`
    return `${sym}${v.toFixed(2)}`
  }

  const fmtMonth = (m: string): string => {
    try {
      const month = parseInt(m.slice(5, 7), 10)
      if (lang === 'en') {
        const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return names[month - 1] ?? m
      }
      return `${month}月`
    } catch {
      return m
    }
  }

  useEffect(() => {
    async function fetchAll() {
      const results = await Promise.all(
        itemIds.map(async (id): Promise<ServiceCost[]> => {
          const meta = itemMeta.find(m => m.id === id)
          const useGrouped = meta?.allocMode === 'tag' && (meta.tagAllocations?.length ?? 0) > 0
          if (useGrouped) {
            try {
              const res = await fetch(`/api/costs/${id}/grouped`)
              const data = await res.json()
              if (!res.ok) throw new Error(data.error ?? 'Error')
              return data as ServiceCost[]
            } catch (e) {
              return [{
                itemId: id,
                name: meta.name,
                type: 'aws' as const,
                currentMonth: 0, previousMonth: 0, history: [],
                currency: 'USD', connected: true,
                error: e instanceof Error ? e.message : 'Failed to load',
              }]
            }
          }
          try {
            const res = await fetch(`/api/costs/${id}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Error')
            return [data as ServiceCost]
          } catch (e) {
            return [{
              itemId: id,
              name: meta?.name ?? id,
              type: 'vercel' as const,
              currentMonth: 0, previousMonth: 0, history: [],
              currency: 'USD', connected: true,
              error: e instanceof Error ? e.message : 'Failed to load',
            }]
          }
        })
      )
      setCosts(results.flat())
      setLoading(false)
    }
    fetchAll()
  }, [itemIds, itemMeta])

  const months = buildMonths(costs)
  const costMap = buildCostMap(costs, months)
  const { costs: svcCosts, costMap: svcCostMap } = aggregateTagGrouped(costs, months, costMap, itemMeta)

  const totalsPerMonth = months.map((_, mi) =>
    svcCosts.reduce((sum, c) => sum + (svcCostMap[c.itemId]?.[mi] ?? 0), 0)
  )
  const thisMonth = totalsPerMonth[totalsPerMonth.length - 1] ?? 0
  const lastMonth = totalsPerMonth[totalsPerMonth.length - 2] ?? 0
  const deltaPct = lastMonth >= 0.01 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0
  const ytd = totalsPerMonth.reduce((a, b) => a + b, 0)
  const avg = months.length > 0 ? ytd / months.length : 0
  const prevMonthLabel = months.length >= 2 ? fmtMonth(months[months.length - 2]) : t('db_prev_month')

  const movers = [...svcCosts]
    .map(c => {
      const vals = svcCostMap[c.itemId] ?? []
      const cur = vals[vals.length - 1] ?? 0
      const prev = vals[vals.length - 2] ?? 0
      return { ...c, cur, prev, deltaPct: prev >= 0.01 ? ((cur - prev) / prev) * 100 : 0, deltaAbs: cur - prev }
    })
    .sort((a, b) => Math.abs(b.deltaAbs) - Math.abs(a.deltaAbs))
    .slice(0, 5)

  if (loading) {
    return (
      <>
        <div className="topbar">
          <h1>{t('db_title')}</h1>
          <div className="topbar-actions">
            <Link href="/settings" className="btn">{t('db_settings')}</Link>
          </div>
        </div>
        <div className="content">
          <div className="kpi-row">
            {[0,1,2,3].map(i => (
              <div key={i} className="kpi">
                <div className="skeleton" style={{ height: 14, width: 80, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 28, width: 120 }} />
              </div>
            ))}
          </div>
          <div className="chart-card" style={{ height: 380 }}>
            <div className="skeleton" style={{ height: '100%' }} />
          </div>
        </div>
      </>
    )
  }

  if (costs.length === 0) {
    return (
      <>
        <div className="topbar">
          <h1>{t('db_title')}</h1>
        </div>
        <div className="content">
          <div className="empty">
            <div className="empty-icon"><DashboardIcon /></div>
            <h3>{t('db_empty_title')}</h3>
            <p>{t('db_empty_desc')}</p>
            <Link href="/settings" className="btn btn-primary"><PlusIcon /> {t('db_add_first')}</Link>
          </div>
        </div>
      </>
    )
  }

  const serviceLayers: ChartLayer[] = svcCosts.map(c => ({
    id: c.itemId,
    name: c.name,
    tint: SERVICE_TINT[c.type] ?? '#888',
    values: svcCostMap[c.itemId] ?? months.map(() => 0),
  }))

  const deptCosts = buildDeptCosts(costs, months, costMap, departments, itemMeta, t('db_unalloc'))
  const deptLayers: ChartLayer[] = deptCosts.map(d => ({
    id: d.deptId,
    name: d.name,
    tint: d.color,
    values: d.values,
  }))

  const drilldownCosts = drilldownItemId
    ? costs.filter(c => c.itemId === drilldownItemId || c.itemId.startsWith(drilldownItemId + ':'))
    : []
  const drilldownDeptCosts = drilldownItemId
    ? buildDeptCosts(drilldownCosts, months, costMap, departments, itemMeta, t('db_unalloc'))
    : []
  const drilldownLayers: ChartLayer[] = drilldownDeptCosts.map(d => ({
    id: d.deptId, name: d.name, tint: d.color, values: d.values,
  }))

  const activeLayers = drilldownItemId
    ? drilldownLayers
    : viewMode === 'dept' ? deptLayers : serviceLayers
  const hasDepts = departments.length > 0

  return (
    <>
      <div className="topbar">
        <h1>{t('db_title')}</h1>
        <div className="topbar-actions">
          {hasDepts && (
            <div className="seg">
              <button className={viewMode === 'service' ? 'active' : ''} onClick={() => { setViewMode('service'); setDrilldownItemId(null) }}>{t('db_view_service')}</button>
              <button className={viewMode === 'dept' ? 'active' : ''} onClick={() => { setViewMode('dept'); setDrilldownItemId(null) }}>{t('db_view_dept')}</button>
            </div>
          )}
          <Link href="/settings" className="btn">{t('db_settings')}</Link>
        </div>
      </div>

      <div className="content">
        <div className="page-header">
          <div>
            <h1 className="page-title">{t('db_title')}</h1>
            <p className="page-subtitle">
              {viewMode === 'dept'
                ? t('db_subtitle_dept', { n: deptCosts.length, months: months.length })
                : t('db_subtitle_service', { n: costs.length, months: months.length })}
              {isOrgContext && ` · ${t('db_org')}`}
            </p>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-label">{t('db_kpi_this_month')}</div>
            <div className="kpi-value">{fmt(thisMonth)}</div>
            {lastMonth > 0 && (
              <div className={`kpi-delta ${deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'flat'}`}>
                {deltaPct > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
                {Math.abs(deltaPct).toFixed(1)}% vs {prevMonthLabel}
              </div>
            )}
          </div>
          <div className="kpi">
            <div className="kpi-label">{t('db_kpi_total', { n: months.length })}</div>
            <div className="kpi-value">{fmt(ytd)}</div>
            <div className="kpi-delta flat">{t('db_kpi_services', { n: costs.length })}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">{t('db_kpi_avg')}</div>
            <div className="kpi-value">{fmt(avg)}</div>
            <div className="kpi-delta flat">{t('db_kpi_avg_sub', { n: months.length })}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">{t('db_kpi_errors')}</div>
            <div className="kpi-value">
              {costs.filter(c => c.error).length}
              <span style={{ fontSize: 14, color: 'var(--fg-muted)', marginLeft: 4 }}>/ {costs.length}</span>
            </div>
            <div className="kpi-delta flat">{t('db_kpi_errors_sub')}</div>
          </div>
        </div>

        {/* Chart */}
        {months.length > 0 && (
          <div className="chart-card">
            <div className="chart-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {drilldownItemId && (
                  <button
                    className="btn"
                    style={{ padding: '3px 10px', fontSize: 12 }}
                    onClick={() => setDrilldownItemId(null)}
                  >← {lang === 'en' ? 'Back' : '戻る'}</button>
                )}
                <div>
                  <h2 className="chart-title">
                    {drilldownItemId
                      ? svcCosts.find(c => c.itemId === drilldownItemId)?.name ?? drilldownItemId
                      : t('db_chart_title')}
                  </h2>
                  <div className="chart-sub">
                    {drilldownItemId
                      ? (lang === 'en' ? 'Dept breakdown' : '部門別内訳')
                      : viewMode === 'dept' ? t('db_chart_sub_dept') : t('db_chart_sub_service')} · {currency}
                  </div>
                </div>
              </div>
              <div className="chart-controls">
                <div className="seg">
                  <button className={currency === 'USD' ? 'active' : ''} onClick={() => setCurrency('USD')}>USD</button>
                  <button className={currency === 'JPY' ? 'active' : ''} onClick={() => setCurrency('JPY')}>JPY</button>
                </div>
                {currency === 'JPY' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                    <span>1 USD =</span>
                    <input
                      type="number"
                      value={jpyRate}
                      min={1}
                      onChange={e => setJpyRate(Math.max(1, Number(e.target.value)))}
                      style={{ width: 56, padding: '2px 6px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)', color: 'var(--fg)' }}
                    />
                    <span>円</span>
                  </div>
                )}
                <div className="seg">
                  <button className={chartMode === 'area' ? 'active' : ''} onClick={() => setChartMode('area')}>Area</button>
                  <button className={chartMode === 'bar' ? 'active' : ''} onClick={() => setChartMode('bar')}>Bar</button>
                </div>
              </div>
            </div>

            <StackedChart
              layers={activeLayers}
              months={months}
              mode={chartMode}
              hovered={hovered}
              fmtCompact={fmtC}
              fmtFull={fmtF}
              fmtMonth={fmtMonth}
              onLayerClick={!drilldownItemId && viewMode === 'service' && hasDepts ? setDrilldownItemId : undefined}
            />

            <div className="legend">
              {activeLayers.map(layer => {
                const lastVal = layer.values[layer.values.length - 1] ?? 0
                const isDrillable = !drilldownItemId && viewMode === 'service' && hasDepts
                return (
                  <div
                    key={layer.id}
                    className={`legend-item${hovered && hovered !== layer.id ? ' dim' : ''}`}
                    onMouseEnter={() => setHovered(layer.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={isDrillable ? () => setDrilldownItemId(layer.id) : undefined}
                    style={isDrillable ? { cursor: 'pointer' } : undefined}
                    title={isDrillable ? (lang === 'en' ? 'Click to see dept breakdown' : 'クリックして部門別内訳を表示') : undefined}
                  >
                    <span className="legend-swatch" style={{ background: layer.tint }} />
                    <span className="legend-name">{layer.name}</span>
                    <span className="legend-val">{fmtF(lastVal)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Two-up: Movers + Status */}
        <div className="two-up">
          <div className="panel">
            <h3>{t('db_movers')} · {months.length > 0 ? fmtMonth(months[months.length - 1]) : ''}</h3>
            {movers.length === 0 ? (
              <div style={{ color: 'var(--fg-muted)', fontSize: 13, padding: '12px 0' }}>{t('db_movers_empty')}</div>
            ) : movers.map(m => (
              <div
                key={m.itemId}
                style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto auto', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)' }}
              >
                <div
                  className="svc-mark"
                  style={{ background: SERVICE_TINT[m.type] ?? '#888', width: 26, height: 26, fontSize: 10, borderRadius: 5 }}
                >
                  {(m.name[0] ?? '?').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</div>
                  <div style={{ color: 'var(--fg-subtle)', fontSize: 11.5 }}>{m.type}</div>
                </div>
                <div className="num" style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{fmtF(m.cur)}</div>
                {m.prev >= 0.01 && (
                  <div className={`kpi-delta ${m.deltaAbs > 0 ? 'up' : 'down'}`} style={{ marginTop: 0, fontSize: 11.5 }}>
                    {m.deltaAbs > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    {Math.abs(m.deltaPct).toFixed(1)}%
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="panel">
            <h3>{t('db_status')}</h3>
            {svcCosts.map(c => {
              const meta = itemMeta.find(m => m.id === c.itemId)
              const expiryInfo = (() => {
                if (!meta?.expiresAt) return null
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const exp = new Date(meta.expiresAt)
                const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86400000)
                if (diffDays < 0) return { label: t('db_expired'), color: 'var(--danger)' }
                if (diffDays === 0) return { label: t('db_expires_today'), color: 'var(--danger)' }
                if (diffDays <= 30) return { label: t('db_expires_in', { n: diffDays }), color: '#f59e0b' }
                return { label: t('db_expires_on', { date: meta.expiresAt }), color: 'var(--fg-subtle)' }
              })()
              return (
                <div
                  key={c.itemId}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}
                >
                  <span className={`dot ${c.error ? 'error' : 'connected'}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                    {expiryInfo && (
                      <div style={{ fontSize: 11.5, color: expiryInfo.color, marginTop: 1, fontWeight: expiryInfo.color === 'var(--danger)' ? 600 : 400 }}>
                        {expiryInfo.label}
                      </div>
                    )}
                  </div>
                  {c.error ? (
                    <span style={{ fontSize: 11.5, color: 'var(--danger)', maxWidth: 160, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.error}>
                      {c.error}
                    </span>
                  ) : (
                    <span className="num" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{fmtF(c.currentMonth)}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
