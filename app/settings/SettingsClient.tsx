'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SERVICE_CATALOG, getServiceDef } from '@/lib/services'
import type { CostItem, ServiceType } from '@/lib/types'

type ItemWithoutCreds = Omit<CostItem, 'credentials'>
type Props = { items: ItemWithoutCreds[]; isOrgContext: boolean }

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
function ServicesIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
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

// ── ConfigForm ─────────────────────────────────────────────────
function ConfigForm({
  serviceType,
  isEdit,
  onSave,
  onCancel,
}: {
  serviceType: ServiceType
  isEdit: boolean
  onSave: (name: string, creds: Record<string, string>) => void
  onCancel: () => void
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

        {serviceType === 'invoice' && (
          <div className="cfg-field">
            <label className="cfg-label">メモ</label>
            <div className="cfg-hint">請求書エントリに名前を付けてください（例：Acme Hosting &ndash; 2026年4月）。コストデータは後から手動で追加できます。</div>
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

// ── EditSlideOver ──────────────────────────────────────────────
function EditSlideOver({
  item,
  onClose,
  onSave,
}: {
  item: ItemWithoutCreds | null
  onClose: () => void
  onSave: (id: string, name: string, creds: Record<string, string>) => Promise<void>
}) {
  const open = item !== null

  useEffect(() => {
    if (!open) return
  }, [open])

  const handleSave = async (name: string, creds: Record<string, string>) => {
    if (!item) return
    await onSave(item.id, name, creds)
    onClose()
  }

  return (
    <>
      <div className={`scrim${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`slideover${open ? ' open' : ''}`}>
        <button className="so-close" onClick={onClose}><CloseIcon /></button>
        {item && (
          <ConfigForm
            serviceType={item.type}
            isEdit={true}
            onSave={handleSave}
            onCancel={onClose}
          />
        )}
      </aside>
    </>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function SettingsClient({ items: initialItems, isOrgContext }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<ItemWithoutCreds | null>(null)

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
        <h1>設定 · 連携サービス</h1>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <PlusIcon /> サービスを追加
          </button>
        </div>
      </div>

      <div className="content">
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
            <div className="svc-row svc-row-head">
              <div />
              <div>連携サービス</div>
              <div>ステータス</div>
              <div>コメント</div>
              <div />
            </div>
            {items.map(item => {
              const tint = SERVICE_TINT[item.type] ?? '#888'
              const mark = SERVICE_MARK[item.type] ?? item.type[0].toUpperCase()
              const def = getServiceDef(item.type)
              const isInvoice = item.type === 'invoice'
              return (
                <div key={item.id} className="svc-row">
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
                    <CommentCell value={item.comment} onChange={v => handleComment(item.id, v)} />
                  </div>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    {!isInvoice && (
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => setEditItem(item)}
                        title="再設定"
                        disabled={loading === item.id}
                      >
                        <SettingsSmIcon />
                      </button>
                    )}
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
      </div>

      <AddSlideOver
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onConnect={handleConnect}
      />

      <EditSlideOver
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={handleEditSave}
      />

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  )
}
