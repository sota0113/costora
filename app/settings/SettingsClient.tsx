'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SERVICE_CATALOG, getServiceDef } from '@/lib/services'
import type { CostItem, ServiceType, Department, DeptAllocation, MonthlyAmount, AllocMode, AmountAllocation, ProjectAllocation, TeamAllocation, VercelDiscovery } from '@/lib/types'

type ItemWithoutCreds = Omit<CostItem, 'credentials'>
type Props = { items: ItemWithoutCreds[]; departments: Department[]; isOrgContext: boolean }

const DEPT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#14b8a6',
]

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

const SERVICE_MARK: Record<string, string> = {
  vercel: 'V',
  aws: 'A',
  gcp: 'G',
  github: 'GH',
  datadog: 'DD',
  anthropic: 'A',
  openai: 'AI',
  resend: 'R',
  invoice: '↑',
}

// ── Icons ──────────────────────────────────────────────────────
function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function CloseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function TrashIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
}
function SettingsSmIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
function ServicesIcon({ size = 15 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}
function ChevronLeftIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
}
function EyeOffIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
}
function EyeIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}
function InfoIcon() {
  return <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
}
function UploadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
}
function DeptIcon({ size = 15 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function SplitIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M3 9l9-7 9 7"/><path d="M3 15l9 7 9-7"/></svg>
}
function EditIcon() {
  return <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}

// ── CommentCell ────────────────────────────────────────────────
function CommentCell({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value || '') }, [value])
  useEffect(() => {
    if (editing && ref.current) { ref.current.focus(); ref.current.select() }
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft !== (value || '')) onChange(draft)
  }
  const cancel = () => { setDraft(value || ''); setEditing(false) }

  if (editing) {
    return (
      <input
        ref={ref}
        className="comment-input"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') cancel()
        }}
        placeholder="コメントを追加…"
      />
    )
  }

  return (
    <button className={`comment-display${value ? '' : ' empty'}`} onClick={() => setEditing(true)} title="クリックして編集">
      {value || 'コメントを追加…'}
    </button>
  )
}

// ── VercelTestButton ────────────────────────────────────────────
function VercelTestButton({
  token,
  itemId,
  onDiscovery,
}: {
  token?: string
  itemId?: string
  onDiscovery?: (data: VercelDiscovery) => void
}) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<VercelDiscovery | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canTest = !!(token?.trim() || itemId)

  const handleTest = async () => {
    setTesting(true)
    setError(null)
    setResult(null)
    try {
      const body = token?.trim() ? { token: token.trim() } : { itemId }
      const res = await fetch('/api/test/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '接続テストに失敗しました')
      setResult(data as VercelDiscovery)
      onDiscovery?.(data as VercelDiscovery)
    } catch (e) {
      setError(e instanceof Error ? e.message : '接続テストに失敗しました')
    } finally {
      setTesting(false)
    }
  }

  const latestBilling = result?.billingHistory?.at(-1)

  return (
    <div className="cfg-field">
      <button
        type="button"
        className="btn"
        style={{ alignSelf: 'flex-start' }}
        disabled={!canTest || testing}
        onClick={handleTest}
      >
        {testing ? '接続テスト中…' : '接続をテスト'}
      </button>
      {result && (
        <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'var(--bg-muted)', fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ 接続成功</span>
          {result.projects.length > 0 && <span style={{ color: 'var(--fg-muted)' }}>{result.projects.length} プロジェクト検出</span>}
          {result.teams.length > 0 && <span style={{ color: 'var(--fg-muted)' }}>{result.teams.length} チーム検出</span>}
          {latestBilling && <span style={{ color: 'var(--fg-muted)' }}>直近の請求: ${latestBilling.amount.toFixed(2)} ({latestBilling.month})</span>}
        </div>
      )}
      {error && (
        <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'color-mix(in srgb, var(--danger) 10%, transparent)', fontSize: 12.5, color: 'var(--danger)' }}>
          ✕ {error}
        </div>
      )}
    </div>
  )
}

// ── ConfigForm ─────────────────────────────────────────────────
function ConfigForm({
  serviceType,
  isEdit,
  onSave,
  onCancel,
  itemId,
  onDiscovery,
}: {
  serviceType: ServiceType
  isEdit: boolean
  onSave: (name: string, creds: Record<string, string>) => void
  onCancel: () => void
  itemId?: string
  onDiscovery?: (data: VercelDiscovery) => void
}) {
  const def = getServiceDef(serviceType)!
  const [name, setName] = useState(def.label)
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {}
    def.fields.forEach(f => { v[f.key] = '' })
    return v
  })
  const [reveal, setReveal] = useState<Record<string, boolean>>({})

  const set = (k: string, v: string) => setVals(prev => ({ ...prev, [k]: v }))
  const allFilled = serviceType === 'invoice' || def.fields.every(f => vals[f.key].trim())
  const canSave = name.trim() && allFilled

  return (
    <div className="cfg-form">
      <div className="cfg-head">
        <button className="cfg-back" onClick={onCancel} aria-label="戻る">
          <ChevronLeftIcon />
        </button>
        <div className="svc-mark" style={{ background: SERVICE_TINT[serviceType] ?? '#888', width: 32, height: 32, fontSize: 12 }}>
          {SERVICE_MARK[serviceType] ?? serviceType[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{def.label}</div>
          <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{def.description}</div>
        </div>
      </div>

      <div className="cfg-body">
        <div className="cfg-field">
          <label className="cfg-label">
            表示名<span className="cfg-req">*</span>
          </label>
          <div className="cfg-input-wrap">
            <input
              className="cfg-input"
              style={{ fontFamily: 'var(--font-sans)' }}
              placeholder={`例：${def.label} – マーケティング部`}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="cfg-hint">同じサービスを複数のアカウントで接続できます。</div>
        </div>

        {serviceType !== 'invoice' && def.fields.map(f => {
          const isSecret = f.type === 'password'
          const shown = reveal[f.key]
          return (
            <div className="cfg-field" key={f.key}>
              <label className="cfg-label">
                {f.label}<span className="cfg-req">*</span>
              </label>
              <div className="cfg-input-wrap">
                {f.type === 'textarea' ? (
                  <textarea
                    className="cfg-input cfg-textarea"
                    placeholder={f.placeholder}
                    value={vals[f.key]}
                    onChange={e => set(f.key, e.target.value)}
                    rows={4}
                    spellCheck={false}
                  />
                ) : (
                  <input
                    className="cfg-input"
                    type={isSecret && !shown ? 'password' : 'text'}
                    placeholder={f.placeholder}
                    value={vals[f.key]}
                    onChange={e => set(f.key, e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                  />
                )}
                {isSecret && (
                  <button
                    type="button"
                    className="cfg-reveal"
                    onClick={() => setReveal(r => ({ ...r, [f.key]: !r[f.key] }))}
                    aria-label={shown ? 'Hide' : 'Show'}
                  >
                    {shown ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {serviceType === 'vercel' && (
          <VercelTestButton
            token={vals['value']}
            itemId={isEdit ? itemId : undefined}
            onDiscovery={onDiscovery}
          />
        )}

        {serviceType === 'invoice' && (
          <div className="cfg-field">
            <label className="cfg-label">メモ</label>
            <div className="cfg-hint">請求書エントリに名前を付けてください（例：Acme Hosting &ndash; 2026年4月）。コストデータは後から手動で追加できます。</div>
          </div>
        )}

        {serviceType === 'aws' && (
          <div className="cfg-field">
            <label className="cfg-label">
              タグキーで集計
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 400, background: 'var(--bg-muted)', padding: '1px 6px', borderRadius: 4 }}>任意</span>
            </label>
            <div className="cfg-input-wrap">
              <input
                className="cfg-input"
                style={{ fontFamily: 'var(--font-sans)' }}
                placeholder="例：Department"
                value={vals['tagGroupBy'] ?? ''}
                onChange={e => set('tagGroupBy', e.target.value)}
              />
            </div>
            <div className="cfg-hint">
              設定すると、このタグキーの値ごとにコストを分けてダッシュボードに表示します（例：Department → Engineering / Marketing ごとに集計）。
            </div>
          </div>
        )}

        {def.docsUrl && (
          <div className="cfg-docs">
            <InfoIcon />
            <span>
              認証情報の取得先：{' '}
              <a href={def.docsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                {def.docsUrl}
              </a>
            </span>
          </div>
        )}
      </div>

      <div className="cfg-foot">
        <button className="btn" onClick={onCancel}>キャンセル</button>
        <button
          className="btn btn-primary"
          disabled={!canSave}
          onClick={() => canSave && onSave(name.trim(), vals)}
        >
          {isEdit ? '変更を保存' : '接続する'}
        </button>
      </div>
    </div>
  )
}

// ── AddSlideOver ───────────────────────────────────────────────
function AddSlideOver({
  open,
  onClose,
  onConnect,
}: {
  open: boolean
  onClose: () => void
  onConnect: (type: ServiceType, name: string, creds: Record<string, string>) => Promise<void>
}) {
  const [tab, setTab] = useState<'catalog' | 'pdf'>('catalog')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<ServiceType | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) { setTab('catalog'); setQ(''); setPicked(null) }
  }, [open])

  const catalog = SERVICE_CATALOG.filter(s => s.type !== 'invoice').filter(s =>
    s.label.toLowerCase().includes(q.toLowerCase()) ||
    s.description.toLowerCase().includes(q.toLowerCase())
  )

  const grouped = catalog.reduce<Record<string, typeof catalog>>((acc, s) => {
    const cat = s.type === 'aws' || s.type === 'gcp' ? 'Cloud' :
                s.type === 'github' || s.type === 'vercel' ? 'Dev Tools' :
                s.type === 'anthropic' || s.type === 'openai' ? 'AI' :
                s.type === 'datadog' ? 'Monitoring' : 'Other'
    ;(acc[cat] = acc[cat] ?? []).push(s)
    return acc
  }, {})

  const handleSave = async (name: string, creds: Record<string, string>) => {
    if (!picked) return
    setSaving(true)
    try {
      await onConnect(picked, name, creds)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleInvoice = async (name: string) => {
    setSaving(true)
    try {
      await onConnect('invoice', name, {})
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className={`scrim${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`slideover${open ? ' open' : ''}`}>
        <button className="so-close" onClick={onClose}><CloseIcon /></button>

        {picked ? (
          <ConfigForm
            serviceType={picked}
            isEdit={false}
            onSave={handleSave}
            onCancel={() => setPicked(null)}
          />
        ) : (
          <>
            <div className="so-head">
              <h2>サービスを追加</h2>
              <p>ネイティブ連携を選択するか、カスタム請求書エントリを追加してください。</p>
            </div>

            <div className="so-tabs">
              <button className={`so-tab${tab === 'catalog' ? ' active' : ''}`} onClick={() => setTab('catalog')}>
                ネイティブ連携
              </button>
              <button className={`so-tab${tab === 'pdf' ? ' active' : ''}`} onClick={() => setTab('pdf')}>
                カスタム / 請求書
              </button>
            </div>

            {tab === 'catalog' && (
              <>
                <div className="so-search">
                  <SearchIcon />
                  <input
                    placeholder="連携サービスを検索…"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="so-body">
                  {Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <div className="cat-label">{category}</div>
                      {items.map(svc => (
                        <button key={svc.type} className="cat-item" onClick={() => setPicked(svc.type)}>
                          <div className="svc-mark" style={{ background: SERVICE_TINT[svc.type] ?? '#888', width: 32, height: 32, fontSize: 12 }}>
                            {SERVICE_MARK[svc.type] ?? svc.type[0].toUpperCase()}
                          </div>
                          <div className="cat-item-info">
                            <div className="cat-item-name">{svc.label}</div>
                            <div className="cat-item-desc">{svc.description}</div>
                          </div>
                          <span className="cat-item-add">設定</span>
                        </button>
                      ))}
                    </div>
                  ))}
                  {catalog.length === 0 && (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                      &ldquo;{q}&rdquo; に一致する連携が見つかりません。
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === 'pdf' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <InvoiceForm onSave={handleInvoice} saving={saving} />
              </div>
            )}
          </>
        )}
      </aside>
    </>
  )
}

function InvoiceForm({ onSave, saving }: { onSave: (name: string) => void; saving: boolean }) {
  const [name, setName] = useState('')
  return (
    <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="dropzone" style={{ cursor: 'default' }}>
        <div className="dz-icon"><UploadIcon /></div>
        <h4>カスタムコスト項目を追加</h4>
        <p>ネイティブ連携に対応していないベンダーのコストを手動で管理できます。</p>
      </div>
      <div className="cfg-field">
        <label className="cfg-label">エントリ名<span className="cfg-req">*</span></label>
        <div className="cfg-input-wrap">
          <input
            className="cfg-input"
            style={{ fontFamily: 'var(--font-sans)' }}
            placeholder="例：Acme Hosting – 2026年4月"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-primary" disabled={!name.trim() || saving} onClick={() => onSave(name.trim())}>
          追加する
        </button>
      </div>
    </div>
  )
}

// ── AllocationPanel ─────────────────────────────────────────────
function AllocationPanel({
  item,
  departments,
  discoveredData,
  onSave,
  onCancel,
}: {
  item: ItemWithoutCreds
  departments: Department[]
  discoveredData: VercelDiscovery | null
  onSave: (
    id: string,
    allocations: DeptAllocation[],
    invoiceEntries?: MonthlyAmount[],
    allocMode?: AllocMode,
    amountAllocations?: AmountAllocation[],
    projectAllocations?: ProjectAllocation[],
    teamAllocations?: TeamAllocation[],
  ) => Promise<void>
  onCancel: () => void
}) {
  const isInvoice = item.type === 'invoice'
  const isVercel = item.type === 'vercel'
  const effectiveDiscovery = discoveredData ?? item.vercelDiscovery ?? null

  const [entries, setEntries] = useState<MonthlyAmount[]>([])
  const [allocs, setAllocs] = useState<DeptAllocation[]>([])
  const [amountAllocs, setAmountAllocs] = useState<AmountAllocation[]>([])
  const [projAllocs, setProjAllocs] = useState<ProjectAllocation[]>([])
  const [teamAllocs, setTeamAllocs] = useState<TeamAllocation[]>([])
  const [mode, setMode] = useState<AllocMode>('ratio')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMode(item.allocMode ?? 'ratio')

    if (item.allocations?.length) setAllocs(item.allocations.map(a => ({ ...a })))
    else if (item.deptId) setAllocs([{ deptId: item.deptId, pct: 100 }])
    else setAllocs([])

    setAmountAllocs(item.amountAllocations ? item.amountAllocations.map(a => ({ ...a })) : [])

    const epd = (discoveredData ?? item.vercelDiscovery)?.projects ?? []
    setProjAllocs(epd.map(p => ({
      projectId: p.id, projectName: p.name,
      deptId: item.projectAllocations?.find(pa => pa.projectId === p.id)?.deptId ?? null,
    })))

    const etd = (discoveredData ?? item.vercelDiscovery)?.teams ?? []
    setTeamAllocs(etd.map(t => ({
      teamId: t.id, teamName: t.name,
      deptId: item.teamAllocations?.find(ta => ta.teamId === t.id)?.deptId ?? null,
    })))

    if (isInvoice) {
      const now = new Date()
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      })
      const existing = item.invoiceEntries ?? []
      setEntries(months.map(m => ({ month: m, amount: existing.find(e => e.month === m)?.amount ?? 0 })))
    }
  }, [item, discoveredData, isInvoice])

  const totalPct = allocs.reduce((s, a) => s + (a.pct || 0), 0)
  const unaddedDepts = departments.filter(d => !allocs.find(a => a.deptId === d.id))
  const unaddedAmountDepts = departments.filter(d => !amountAllocs.find(a => a.deptId === d.id))

  const availableModes: { key: AllocMode; label: string }[] = [
    { key: 'ratio', label: '割合' },
    { key: 'amount', label: '金額' },
    ...(isVercel && (effectiveDiscovery?.projects.length ?? 0) > 0 ? [{ key: 'project' as AllocMode, label: 'プロジェクト' }] : []),
    ...(isVercel && (effectiveDiscovery?.teams.length ?? 0) > 0 ? [{ key: 'team' as AllocMode, label: 'チーム' }] : []),
  ]

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(
        item.id,
        mode === 'ratio' ? allocs : [],
        isInvoice ? entries : undefined,
        mode,
        mode === 'amount' ? amountAllocs : undefined,
        mode === 'project' ? projAllocs : undefined,
        mode === 'team' ? teamAllocs : undefined,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cfg-form">
      <div className="so-head" style={{ paddingRight: 48 }}>
        <h2 style={{ fontSize: 15 }}>按分設定 — {item.name}</h2>
        <p>コストをどの部門に按分するか設定します。</p>
      </div>

      <div className="cfg-body">
        {isInvoice && (
          <div className="cfg-field">
            <label className="cfg-label">月次コスト入力</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {entries.map(e => (
                <div key={e.month} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>{e.month}</span>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', fontSize: 13 }}>$</span>
                    <input
                      className="cfg-input"
                      style={{ paddingLeft: 22 }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={e.amount || ''}
                      placeholder="0.00"
                      onChange={ev => setEntries(prev => prev.map(x => x.month === e.month ? { ...x, amount: parseFloat(ev.target.value) || 0 } : x))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {availableModes.length > 1 && (
          <div className="cfg-field">
            <label className="cfg-label">按分方式</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {availableModes.map(m => (
                <button
                  key={m.key}
                  type="button"
                  className={`btn${mode === m.key ? ' btn-primary' : ''}`}
                  style={{ fontSize: 12, padding: '4px 12px' }}
                  onClick={() => setMode(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'ratio' && (
          <div className="cfg-field">
            <label className="cfg-label">部門配分（割合）</label>
            <div className="cfg-hint" style={{ marginBottom: 8 }}>合計が100%未満の場合、残りは「未割当」として扱われます。</div>
            {allocs.length === 0 && (
              <div style={{ color: 'var(--fg-subtle)', fontSize: 13, padding: '8px 0' }}>部門が設定されていません（全額が未割当）</div>
            )}
            {allocs.map(a => {
              const dept = departments.find(d => d.id === a.deptId)
              if (!dept) return null
              return (
                <div key={a.deptId} style={{ display: 'grid', gridTemplateColumns: '12px 1fr 72px 28px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: dept.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{dept.name}</span>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="cfg-input"
                      style={{ paddingRight: 20, textAlign: 'right' }}
                      type="number" min="0" max="100" step="1"
                      value={a.pct || ''} placeholder="0"
                      onChange={ev => setAllocs(prev => prev.map(x => x.deptId === a.deptId ? { ...x, pct: Math.min(100, Math.max(0, parseInt(ev.target.value) || 0)) } : x))}
                    />
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', fontSize: 12, pointerEvents: 'none' }}>%</span>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={() => setAllocs(prev => prev.filter(x => x.deptId !== a.deptId))} style={{ color: 'var(--danger)' }}>
                    <TrashIcon />
                  </button>
                </div>
              )
            })}
            {allocs.length > 0 && (
              <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'var(--bg-muted)', fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--fg-muted)' }}>合計</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: totalPct > 100 ? 'var(--danger)' : 'var(--fg)' }}>{totalPct}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(totalPct, 100)}%`, background: totalPct > 100 ? 'var(--danger)' : 'var(--accent)', borderRadius: 2, transition: 'width 0.2s' }} />
                </div>
                {(100 - totalPct) > 0 && <div style={{ marginTop: 6, color: 'var(--fg-subtle)', fontSize: 12 }}>未割当: {100 - totalPct}%</div>}
                {totalPct > 100 && <div style={{ marginTop: 4, color: 'var(--danger)', fontSize: 12 }}>合計が100%を超えています</div>}
              </div>
            )}
            {unaddedDepts.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <select className="cfg-input" style={{ fontFamily: 'var(--font-sans)' }} value=""
                  onChange={e => { if (e.target.value) setAllocs(prev => [...prev, { deptId: e.target.value, pct: 0 }]) }}>
                  <option value="">＋ 部門を追加…</option>
                  {unaddedDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            {departments.length === 0 && <div className="cfg-hint" style={{ marginTop: 8 }}>「部門」タブで部門を作成してから設定できます。</div>}
          </div>
        )}

        {mode === 'amount' && (
          <div className="cfg-field">
            <label className="cfg-label">部門配分（金額）</label>
            <div className="cfg-hint" style={{ marginBottom: 8 }}>部門ごとに月次の固定配分金額を設定します。</div>
            {amountAllocs.map(a => {
              const dept = departments.find(d => d.id === a.deptId)
              if (!dept) return null
              return (
                <div key={a.deptId} style={{ display: 'grid', gridTemplateColumns: '12px 1fr 100px 28px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: dept.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{dept.name}</span>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', fontSize: 13 }}>$</span>
                    <input
                      className="cfg-input"
                      style={{ paddingLeft: 22 }}
                      type="number" min="0" step="0.01"
                      value={a.monthlyAmount || ''} placeholder="0.00"
                      onChange={ev => setAmountAllocs(prev => prev.map(x => x.deptId === a.deptId ? { ...x, monthlyAmount: parseFloat(ev.target.value) || 0 } : x))}
                    />
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={() => setAmountAllocs(prev => prev.filter(x => x.deptId !== a.deptId))} style={{ color: 'var(--danger)' }}>
                    <TrashIcon />
                  </button>
                </div>
              )
            })}
            {unaddedAmountDepts.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <select className="cfg-input" style={{ fontFamily: 'var(--font-sans)' }} value=""
                  onChange={e => { if (e.target.value) setAmountAllocs(prev => [...prev, { deptId: e.target.value, monthlyAmount: 0 }]) }}>
                  <option value="">＋ 部門を追加…</option>
                  {unaddedAmountDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            {departments.length === 0 && <div className="cfg-hint" style={{ marginTop: 8 }}>「部門」タブで部門を作成してから設定できます。</div>}
          </div>
        )}

        {mode === 'project' && (
          <div className="cfg-field">
            <label className="cfg-label">プロジェクト別按分</label>
            <div className="cfg-hint" style={{ marginBottom: 8 }}>プロジェクトごとに担当部門を設定します。</div>
            {projAllocs.length === 0 ? (
              <div style={{ color: 'var(--fg-subtle)', fontSize: 13 }}>プロジェクトが見つかりません。「接続設定」タブで接続テストを実行してください。</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {projAllocs.map(pa => (
                  <div key={pa.projectId} style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pa.projectName}</span>
                    <select
                      className="cfg-input"
                      style={{ fontFamily: 'var(--font-sans)', fontSize: 12 }}
                      value={pa.deptId ?? ''}
                      onChange={e => setProjAllocs(prev => prev.map(x => x.projectId === pa.projectId ? { ...x, deptId: e.target.value || null } : x))}
                    >
                      <option value="">未割当</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'team' && (
          <div className="cfg-field">
            <label className="cfg-label">チーム別按分</label>
            <div className="cfg-hint" style={{ marginBottom: 8 }}>チームごとに担当部門を設定します。</div>
            {teamAllocs.length === 0 ? (
              <div style={{ color: 'var(--fg-subtle)', fontSize: 13 }}>チームが見つかりません。「接続設定」タブで接続テストを実行してください。</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {teamAllocs.map(ta => (
                  <div key={ta.teamId} style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>{ta.teamName}</span>
                    <select
                      className="cfg-input"
                      style={{ fontFamily: 'var(--font-sans)', fontSize: 12 }}
                      value={ta.deptId ?? ''}
                      onChange={e => setTeamAllocs(prev => prev.map(x => x.teamId === ta.teamId ? { ...x, deptId: e.target.value || null } : x))}
                    >
                      <option value="">未割当</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="cfg-foot">
        <button className="btn" onClick={onCancel}>キャンセル</button>
        <button
          className="btn btn-primary"
          disabled={saving || (mode === 'ratio' && totalPct > 100)}
          onClick={handleSave}
        >
          保存
        </button>
      </div>
    </div>
  )
}

// ── ItemSlideOver ──────────────────────────────────────────────
function ItemSlideOver({
  item,
  departments,
  defaultTab,
  onClose,
  onSaveConfig,
  onSaveAlloc,
}: {
  item: ItemWithoutCreds | null
  departments: Department[]
  defaultTab?: 'config' | 'alloc'
  onClose: () => void
  onSaveConfig: (id: string, name: string, creds: Record<string, string>) => Promise<void>
  onSaveAlloc: (
    id: string,
    allocations: DeptAllocation[],
    invoiceEntries?: MonthlyAmount[],
    allocMode?: AllocMode,
    amountAllocations?: AmountAllocation[],
    projectAllocations?: ProjectAllocation[],
    teamAllocations?: TeamAllocation[],
  ) => Promise<void>
}) {
  const open = item !== null
  const isInvoice = item?.type === 'invoice'
  const [tab, setTab] = useState<'config' | 'alloc'>('config')
  const [discoveredData, setDiscoveredData] = useState<VercelDiscovery | null>(null)

  useEffect(() => {
    if (!item) return
    setTab(isInvoice ? 'alloc' : (defaultTab ?? 'config'))
    setDiscoveredData(null)
  }, [item, defaultTab, isInvoice])

  const handleSaveConfig = async (name: string, creds: Record<string, string>) => {
    if (!item) return
    await onSaveConfig(item.id, name, creds)
    onClose()
  }

  return (
    <>
      <div className={`scrim${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`slideover${open ? ' open' : ''}`}>
        <button className="so-close" onClick={onClose}><CloseIcon /></button>
        {item && (
          <>
            {!isInvoice && (
              <div className="so-tabs" style={{ margin: '16px 22px 0', flexShrink: 0 }}>
                <button className={`so-tab${tab === 'config' ? ' active' : ''}`} onClick={() => setTab('config')}>接続設定</button>
                <button className={`so-tab${tab === 'alloc' ? ' active' : ''}`} onClick={() => setTab('alloc')}>按分設定</button>
              </div>
            )}
            {tab === 'config' && !isInvoice && (
              <ConfigForm
                serviceType={item.type}
                isEdit={true}
                itemId={item.id}
                onSave={handleSaveConfig}
                onCancel={onClose}
                onDiscovery={item.type === 'vercel' ? setDiscoveredData : undefined}
              />
            )}
            {(tab === 'alloc' || isInvoice) && (
              <AllocationPanel
                item={item}
                departments={departments}
                discoveredData={discoveredData}
                onSave={async (...args) => { await onSaveAlloc(...args); onClose() }}
                onCancel={onClose}
              />
            )}
          </>
        )}
      </aside>
    </>
  )
}

// ── DeptManager ────────────────────────────────────────────────
function DeptManager({
  departments: initialDepts,
  onUpdate,
  showToast,
}: {
  departments: Department[]
  onUpdate: (depts: Department[]) => void
  showToast: (msg: string) => void
}) {
  const [depts, setDepts] = useState(initialDepts)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(DEPT_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newName.trim()) return
    setLoading('add')
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '追加に失敗しました')
      const updated = [...depts, { id: data.id, name: newName.trim(), color: newColor, createdAt: new Date().toISOString() }]
      setDepts(updated)
      onUpdate(updated)
      setNewName('')
      setNewColor(DEPT_COLORS[updated.length % DEPT_COLORS.length])
      showToast(`${newName.trim()} を追加しました`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '追加に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  const handleEditSave = async (id: string) => {
    if (!editName.trim()) return
    setLoading(id)
    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) throw new Error('更新に失敗しました')
      const updated = depts.map(d => d.id === id ? { ...d, name: editName.trim() } : d)
      setDepts(updated)
      onUpdate(updated)
      setEditingId(null)
      showToast('更新しました')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '更新に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (dept: Department) => {
    if (!confirm(`「${dept.name}」を削除しますか？この部門に紐づく按分設定もすべて削除されます。`)) return
    setLoading(dept.id)
    try {
      const res = await fetch(`/api/departments/${dept.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      const updated = depts.filter(d => d.id !== dept.id)
      setDepts(updated)
      onUpdate(updated)
      showToast(`${dept.name} を削除しました`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '削除に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">部門</h1>
          <p className="page-subtitle">コスト按分先となる部門を管理します。</p>
        </div>
      </div>

      {depts.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><DeptIcon /></div>
          <h3>部門がありません</h3>
          <p>部門を作成すると、サービスのコストを按分して管理できます。</p>
        </div>
      ) : (
        <div className="svc-list" style={{ marginBottom: 24 }}>
          <div className="svc-row svc-row-head" style={{ gridTemplateColumns: '20px 1fr 80px' }}>
            <div />
            <div>部門名</div>
            <div />
          </div>
          {depts.map(dept => (
            <div key={dept.id} className="svc-row" style={{ gridTemplateColumns: '20px 1fr 80px' }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: dept.color, display: 'inline-block' }} />
              <div style={{ minWidth: 0 }}>
                {editingId === dept.id ? (
                  <input
                    className="comment-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleEditSave(dept.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="svc-name">{dept.name}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                {editingId === dept.id ? (
                  <button className="btn btn-ghost btn-icon" onClick={() => handleEditSave(dept.id)} disabled={loading === dept.id} title="保存">
                    <span style={{ fontSize: 11, fontWeight: 600 }}>保存</span>
                  </button>
                ) : (
                  <button className="btn btn-ghost btn-icon" onClick={() => { setEditingId(dept.id); setEditName(dept.name) }} title="名前を変更">
                    <EditIcon />
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => handleDelete(dept)}
                  disabled={loading === dept.id}
                  style={{ color: 'var(--danger)' }}
                  title="削除"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new dept */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', background: 'var(--bg)' }}>
        <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 12 }}>部門を追加</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {DEPT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                style={{
                  width: 20, height: 20, borderRadius: '50%', background: c, border: newColor === c ? '2px solid var(--fg)' : '2px solid transparent',
                  outline: newColor === c ? '2px solid white' : 'none', outlineOffset: '-3px', cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            className="cfg-input"
            style={{ fontFamily: 'var(--font-sans)', flex: 1 }}
            placeholder="部門名（例：エンジニアリング）"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          />
          <button className="btn btn-primary" disabled={!newName.trim() || loading === 'add'} onClick={handleAdd}>
            <PlusIcon /> 追加
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function SettingsClient({ items: initialItems, departments: initialDepartments, isOrgContext }: Props) {
  const router = useRouter()
  const [view, setView] = useState<'services' | 'departments'>('services')
  const [items, setItems] = useState(initialItems)
  const [departments, setDepartments] = useState(initialDepartments)
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<ItemWithoutCreds | null>(null)
  const [editDefaultTab, setEditDefaultTab] = useState<'config' | 'alloc'>('config')

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  async function handleConnect(type: ServiceType, name: string, creds: Record<string, string>) {
    setLoading('add')
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, credentials: creds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '追加に失敗しました')
      showToast(`${name} を追加しました`)
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '追加に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  async function handleEditSave(id: string, name: string, creds: Record<string, string>) {
    setLoading(id)
    try {
      const body: Record<string, unknown> = { name }
      const hasCredsInput = Object.values(creds).some(v => v.trim())
      if (hasCredsInput) body.credentials = creds
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '保存に失敗しました')
      showToast('変更を保存しました')
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(item: ItemWithoutCreds) {
    if (!confirm(`「${item.name}」を削除しますか？`)) return
    setLoading(item.id)
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      setItems(prev => prev.filter(i => i.id !== item.id))
      showToast(`${item.name} を削除しました`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '削除に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  async function handleAllocSave(
    id: string,
    allocations: DeptAllocation[],
    invoiceEntries?: MonthlyAmount[],
    allocMode?: AllocMode,
    amountAllocations?: AmountAllocation[],
    projectAllocations?: ProjectAllocation[],
    teamAllocations?: TeamAllocation[],
  ) {
    setLoading(id)
    try {
      const body: Record<string, unknown> = { allocations }
      if (invoiceEntries !== undefined) body.invoiceEntries = invoiceEntries
      if (allocMode !== undefined) body.allocMode = allocMode
      if (amountAllocations !== undefined) body.amountAllocations = amountAllocations
      if (projectAllocations !== undefined) body.projectAllocations = projectAllocations
      if (teamAllocations !== undefined) body.teamAllocations = teamAllocations
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('保存に失敗しました')
      setItems(prev => prev.map(i => i.id === id ? {
        ...i, allocations,
        invoiceEntries: invoiceEntries ?? i.invoiceEntries,
        allocMode: allocMode ?? i.allocMode,
        amountAllocations: amountAllocations ?? i.amountAllocations,
        projectAllocations: projectAllocations ?? i.projectAllocations,
        teamAllocations: teamAllocations ?? i.teamAllocations,
      } : i))
      showToast('按分設定を保存しました')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  async function handleComment(id: string, comment: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, comment } : i))
    try {
      await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      })
    } catch {
      // optimistic update already applied; silently ignore
    }
  }

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <h1 style={{ margin: 0, marginRight: 24 }}>設定</h1>
          <div className="so-tabs" style={{ border: 'none', padding: 0, gap: 0 }}>
            <button className={`so-tab${view === 'services' ? ' active' : ''}`} onClick={() => setView('services')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ServicesIcon /> 連携サービス
            </button>
            <button className={`so-tab${view === 'departments' ? ' active' : ''}`} onClick={() => setView('departments')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <DeptIcon /> 部門
            </button>
          </div>
        </div>
        <div className="topbar-actions">
          {view === 'services' && (
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <PlusIcon /> サービスを追加
            </button>
          )}
        </div>
      </div>

      <div className="content">
        {view === 'departments' && (
          <DeptManager
            departments={departments}
            onUpdate={setDepartments}
            showToast={showToast}
          />
        )}

        {view === 'services' && <>
        <div className="page-header">
          <div>
            <h1 className="page-title">連携サービス</h1>
            <p className="page-subtitle">
              {items.length === 0
                ? '連携サービスがありません。最初のサービスを追加してITコストの追跡を始めましょう。'
                : `${items.length}件の連携が接続済み`}
              {isOrgContext && ' · 組織内で共有'}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><ServicesIcon /></div>
            <h3>連携サービスがありません</h3>
            <p>AWS、Google Cloud、GitHub、Datadogなどをapi認証情報で接続するか、その他のベンダーのカスタム請求書エントリを追加してください。</p>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <PlusIcon /> 最初のサービスを追加
            </button>
          </div>
        ) : (
          <div className="svc-list">
            <div className="svc-row svc-row-head" style={{ gridTemplateColumns: '36px minmax(160px,1.6fr) 120px 130px minmax(120px,1fr) 80px' }}>
              <div />
              <div>連携サービス</div>
              <div>ステータス</div>
              <div>部門</div>
              <div>コメント</div>
              <div />
            </div>
            {items.map(item => {
              const tint = SERVICE_TINT[item.type] ?? '#888'
              const mark = SERVICE_MARK[item.type] ?? item.type[0].toUpperCase()
              const def = getServiceDef(item.type)
              const isInvoice = item.type === 'invoice'
              // Department allocation summary
              const allocSummary = (() => {
                if (item.allocations && item.allocations.length > 0) {
                  if (item.allocations.length === 1) {
                    const d = departments.find(d => d.id === item.allocations![0].deptId)
                    return d ? { label: d.name, color: d.color } : null
                  }
                  return { label: `${item.allocations.length}部門`, color: 'var(--accent)' }
                }
                if (item.deptId) {
                  const d = departments.find(d => d.id === item.deptId)
                  return d ? { label: d.name, color: d.color } : null
                }
                return null
              })()
              return (
                <div key={item.id} className="svc-row" style={{ gridTemplateColumns: '36px minmax(160px,1.6fr) 120px 130px minmax(120px,1fr) 80px' }}>
                  <div className="svc-mark" style={{ background: tint }}>
                    {mark}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="svc-name">{item.name}</div>
                    <div className="svc-cat">{def?.label ?? item.type}{isInvoice ? ' · 手動登録' : ' · ネイティブ'}</div>
                  </div>
                  <div>
                    <span className="svc-status">
                      <span className={`dot ${isInvoice ? 'imported' : 'connected'}`} />
                      {isInvoice ? '手動登録' : '接続済み'}
                    </span>
                  </div>
                  <div>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '3px 8px', gap: 5, maxWidth: 120 }}
                      onClick={() => { setEditDefaultTab('alloc'); setEditItem(item) }}
                      title="按分設定"
                    >
                      {allocSummary ? (
                        <>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: allocSummary.color, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{allocSummary.label}</span>
                        </>
                      ) : (
                        <><SplitIcon /><span style={{ color: 'var(--fg-subtle)' }}>未設定</span></>
                      )}
                    </button>
                  </div>
                  <div>
                    <CommentCell value={item.comment} onChange={v => handleComment(item.id, v)} />
                  </div>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => { setEditDefaultTab(isInvoice ? 'alloc' : 'config'); setEditItem(item) }}
                      title={isInvoice ? '設定' : '再設定'}
                      disabled={loading === item.id}
                    >
                      <SettingsSmIcon />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => handleDelete(item)}
                      title="削除"
                      disabled={loading === item.id}
                      style={{ color: 'var(--danger)' }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {items.length > 0 && (
          <div style={{ marginTop: 32, padding: '16px 18px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13.5 }}>別のアカウントやAPI非対応のベンダーを追加しますか？</div>
              <div style={{ color: 'var(--fg-muted)', fontSize: 12.5, marginTop: 2 }}>同じサービスを複数のアカウントで接続したり、カスタム請求書エントリを追加できます。</div>
            </div>
            <button className="btn" onClick={() => setAddOpen(true)}><PlusIcon /> サービスを追加</button>
          </div>
        )}
        </>}
      </div>

      <AddSlideOver
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onConnect={handleConnect}
      />

      <ItemSlideOver
        item={editItem}
        departments={departments}
        defaultTab={editDefaultTab}
        onClose={() => setEditItem(null)}
        onSaveConfig={handleEditSave}
        onSaveAlloc={handleAllocSave}
      />

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  )
}
