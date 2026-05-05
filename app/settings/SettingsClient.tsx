'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SERVICE_CATALOG, getServiceDef } from '@/lib/services'
import type { CostItem, ServiceType, Department, DeptAllocation, MonthlyAmount, AllocMode, AmountAllocation, ProjectAllocation, TeamAllocation, VercelDiscovery, TagAllocation } from '@/lib/types'
import { useT, useLang } from '@/lib/i18n'

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
function RefreshIcon() {
  return <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
}

// ── CommentCell ────────────────────────────────────────────────
function CommentCell({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const t = useT()
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
        placeholder={t('comment_placeholder')}
      />
    )
  }

  return (
    <button className={`comment-display${value ? '' : ' empty'}`} onClick={() => setEditing(true)} title={t('comment_edit_title')}>
      {value || t('comment_placeholder')}
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
  const t = useT()
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<VercelDiscovery | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const canTest = !!(token?.trim() || itemId)

  const handleTest = async () => {
    setTesting(true)
    setError(null)
    setResult(null)
    setSaved(false)
    try {
      const body = token?.trim() ? { token: token.trim() } : { itemId }
      const res = await fetch('/api/test/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('toast_connect_failed'))
      const discovered = data as VercelDiscovery
      setResult(discovered)
      onDiscovery?.(discovered)

      if (itemId) {
        const patchBody: Record<string, unknown> = { vercelDiscovery: discovered }
        if (token?.trim()) patchBody.credentials = { value: token.trim() }
        await fetch(`/api/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        })
        setSaved(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('toast_connect_failed'))
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
        {testing ? t('vt_testing') : t('vt_test')}
      </button>
      {result && (
        <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 6, background: 'var(--bg-muted)', fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>{t('vt_success')}{saved ? ` · ${t('vt_saved')}` : ''}</span>
          {result.projects.length > 0 && <span style={{ color: 'var(--fg-muted)' }}>{t('vt_projects', { n: result.projects.length })}</span>}
          {result.teams.length > 0 && <span style={{ color: 'var(--fg-muted)' }}>{t('vt_teams', { n: result.teams.length })}</span>}
          {latestBilling && <span style={{ color: 'var(--fg-muted)' }}>{t('vt_billing', { amount: latestBilling.amount.toFixed(2), month: latestBilling.month })}</span>}
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

// ── NameCell ───────────────────────────────────────────────────
function NameCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => {
    if (editing && ref.current) { ref.current.focus(); ref.current.select() }
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft.trim() && draft.trim() !== value) onChange(draft.trim())
    else setDraft(value)
  }
  const cancel = () => { setDraft(value); setEditing(false) }

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
      />
    )
  }

  return (
    <div className="svc-name" onClick={() => setEditing(true)} style={{ cursor: 'text' }} title={t('name_edit_title')}>
      {value}
    </div>
  )
}

// ── ConfigForm ─────────────────────────────────────────────────
const PASS_SENTINEL = '•'.repeat(16)

function ConfigForm({
  serviceType,
  isEdit,
  onSave,
  onCancel,
  onDelete,
  itemId,
  onDiscovery,
  initialExpiresAt,
}: {
  serviceType: ServiceType
  isEdit: boolean
  onSave: (name: string, creds: Record<string, string>, expiresAt?: string) => void
  onCancel: () => void
  onDelete?: () => void
  itemId?: string
  onDiscovery?: (data: VercelDiscovery) => void
  initialExpiresAt?: string
}) {
  const t = useT()
  const { lang } = useLang()
  const def = getServiceDef(serviceType)!
  const [name, setName] = useState(def.label)
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {}
    def.fields.forEach(f => { v[f.key] = isEdit && f.type === 'password' ? PASS_SENTINEL : '' })
    return v
  })
  const [reveal, setReveal] = useState<Record<string, boolean>>({})
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt ?? '')

  const set = (k: string, v: string) => setVals(prev => ({ ...prev, [k]: v }))
  const allFilled = serviceType === 'invoice' || def.fields.every(f => vals[f.key].trim())
  const canSave = name.trim() && allFilled

  const handleSave = () => {
    if (!canSave) return
    const creds = Object.fromEntries(
      Object.entries(vals).map(([k, v]) => [k, v === PASS_SENTINEL ? '' : v])
    )
    onSave(name.trim(), creds, isEdit ? (expiresAt || undefined) : undefined)
  }

  return (
    <div className="cfg-form">
      <div className="cfg-head">
        <button className="cfg-back" onClick={onCancel} aria-label={t('cfg_back')}>
          <ChevronLeftIcon />
        </button>
        <div className="svc-mark" style={{ background: SERVICE_TINT[serviceType] ?? '#888', width: 32, height: 32, fontSize: 12 }}>
          {SERVICE_MARK[serviceType] ?? serviceType[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{def.label}</div>
          <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>{def.description[lang]}</div>
        </div>
      </div>

      <div className="cfg-body">
        <div className="cfg-field">
          <label className="cfg-label">
            {t('cfg_display_name')}<span className="cfg-req">*</span>
          </label>
          <div className="cfg-input-wrap">
            <input
              className="cfg-input"
              style={{ fontFamily: 'var(--font-sans)' }}
              placeholder={t('cfg_display_name_placeholder', { label: def.label })}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="cfg-hint">{t('cfg_display_name_hint')}</div>
        </div>

        {isEdit && (
          <div className="cfg-field">
            <label className="cfg-label">{t('cfg_expires_at')}</label>
            <div className="cfg-input-wrap">
              <input
                className="cfg-input"
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
              />
            </div>
            <div className="cfg-hint">{t('cfg_expires_at_hint')}</div>
          </div>
        )}

        {serviceType !== 'invoice' && def.fields.map(f => {
          const isSecret = f.type === 'password'
          const shown = reveal[f.key]
          const isSentinel = vals[f.key] === PASS_SENTINEL
          return (
            <div className="cfg-field" key={f.key}>
              <label className="cfg-label">
                {f.label[lang]}<span className="cfg-req">*</span>
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
                    onFocus={() => { if (isSentinel) set(f.key, '') }}
                    onBlur={() => { if (isEdit && isSecret && !vals[f.key].trim()) set(f.key, PASS_SENTINEL) }}
                    spellCheck={false}
                    autoComplete="off"
                  />
                )}
                {isSecret && (
                  <button
                    type="button"
                    className="cfg-reveal"
                    onClick={() => {
                      if (isSentinel) set(f.key, '')
                      setReveal(r => ({ ...r, [f.key]: !r[f.key] }))
                    }}
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
            token={vals['value'] === PASS_SENTINEL ? '' : vals['value']}
            itemId={isEdit ? itemId : undefined}
            onDiscovery={onDiscovery}
          />
        )}

        {serviceType === 'invoice' && (
          <div className="cfg-field">
            <label className="cfg-label">{t('cfg_invoice_memo')}</label>
            <div className="cfg-hint">{t('cfg_invoice_memo_hint')}</div>
          </div>
        )}

        {def.docsUrl && (
          <div className="cfg-docs">
            <InfoIcon />
            <span>
              {t('cfg_docs_prefix')}{' '}
              <a href={def.docsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                {def.docsUrl}
              </a>
            </span>
          </div>
        )}
      </div>

      <div className="cfg-foot">
        {isEdit && onDelete && (
          <button
            className="btn btn-ghost"
            style={{ color: 'var(--danger)', marginRight: 'auto' }}
            onClick={onDelete}
          >
            {t('cfg_delete')}
          </button>
        )}
        <button className="btn" onClick={onCancel}>{t('cfg_cancel')}</button>
        <button
          className="btn btn-primary"
          disabled={!canSave}
          onClick={handleSave}
        >
          {isEdit ? t('cfg_save_changes') : t('cfg_connect')}
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
  onConnect: (type: ServiceType, name: string, creds: Record<string, string>, invoiceEntries?: MonthlyAmount[], expiresAt?: string) => Promise<void>
}) {
  const t = useT()
  const { lang } = useLang()
  const [tab, setTab] = useState<'catalog' | 'pdf'>('catalog')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<ServiceType | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) { setTab('catalog'); setQ(''); setPicked(null) }
  }, [open])

  const catalog = SERVICE_CATALOG.filter(s => s.type !== 'invoice').filter(s =>
    s.label.toLowerCase().includes(q.toLowerCase()) ||
    s.description[lang].toLowerCase().includes(q.toLowerCase())
  )

  const catKeyFor = (s: (typeof catalog)[0]) =>
    s.type === 'aws' || s.type === 'gcp' ? 'cat_cloud' :
    s.type === 'github' || s.type === 'vercel' ? 'cat_devtools' :
    s.type === 'anthropic' || s.type === 'openai' ? 'cat_ai' :
    s.type === 'datadog' ? 'cat_monitoring' : 'cat_other'

  const grouped = catalog.reduce<Record<string, typeof catalog>>((acc, s) => {
    const key = catKeyFor(s)
    ;(acc[key] = acc[key] ?? []).push(s)
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

  const handleInvoice = async (name: string, entries?: MonthlyAmount[], expiresAt?: string) => {
    setSaving(true)
    try {
      await onConnect('invoice', name, {}, entries, expiresAt)
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
              <h2>{t('add_title')}</h2>
              <p>{t('add_subtitle')}</p>
            </div>

            <div className="so-tabs">
              <button className={`so-tab${tab === 'catalog' ? ' active' : ''}`} onClick={() => setTab('catalog')}>
                {t('add_tab_native')}
              </button>
              <button className={`so-tab${tab === 'pdf' ? ' active' : ''}`} onClick={() => setTab('pdf')}>
                {t('add_tab_custom')}
              </button>
            </div>

            {tab === 'catalog' && (
              <>
                <div className="so-search">
                  <SearchIcon />
                  <input
                    placeholder={t('add_search_placeholder')}
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="so-body">
                  {Object.entries(grouped).map(([catKey, items]) => (
                    <div key={catKey}>
                      <div className="cat-label">{t(catKey)}</div>
                      {items.map(svc => (
                        <button key={svc.type} className="cat-item" onClick={() => setPicked(svc.type)}>
                          <div className="svc-mark" style={{ background: SERVICE_TINT[svc.type] ?? '#888', width: 32, height: 32, fontSize: 12 }}>
                            {SERVICE_MARK[svc.type] ?? svc.type[0].toUpperCase()}
                          </div>
                          <div className="cat-item-info">
                            <div className="cat-item-name">{svc.label}</div>
                            <div className="cat-item-desc">{svc.description[lang]}</div>
                          </div>
                          <span className="cat-item-add">{t('add_catalog_configure')}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                  {catalog.length === 0 && (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                      {t('add_no_results', { q })}
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

function parseInvoiceCSV(text: string): MonthlyAmount[] {
  const entries: MonthlyAmount[] = []
  for (const raw of text.trim().split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const parts = line.split(/,|\t/)
    if (parts.length < 2) continue
    const month = parts[0].trim()
    const amount = parseFloat(parts[1].trim())
    if (!/^\d{4}-\d{2}$/.test(month) || isNaN(amount)) continue
    entries.push({ month, amount })
  }
  return entries.sort((a, b) => a.month.localeCompare(b.month))
}

type ExtractedField = {
  productName: string
  subtotal: number | null
  expiryDate: string | null
}

function InvoiceForm({ onSave, saving }: { onSave: (name: string, entries?: MonthlyAmount[], expiresAt?: string) => void; saving: boolean }) {
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [entries, setEntries] = useState<MonthlyAmount[] | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [extracted, setExtracted] = useState<ExtractedField | null>(null)

  const handleFile = async (file: File) => {
    if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
    setParseError(null)
    setExtracted(null)
    setEntries(null)

    const isPdf = file.name.toLowerCase().endsWith('.pdf')
    const isXlsx = /\.(xlsx?|docx?)$/i.test(file.name)

    if (isPdf || isXlsx) {
      setParsing(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/parse-invoice', { method: 'POST', body: fd })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Unknown error')
        const field: ExtractedField = json.fields?.[0] ?? { productName: '', subtotal: null, expiryDate: null }
        setExtracted(field)
        if (field.productName && !name) setName(field.productName)
        if (field.subtotal !== null) {
          const today = new Date()
          const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
          setEntries([{ month, amount: field.subtotal }])
        }
      } catch (e) {
        setParseError(e instanceof Error ? e.message : '解析に失敗しました')
      } finally {
        setParsing(false)
      }
    } else {
      const reader = new FileReader()
      reader.onload = e => {
        const parsed = parseInvoiceCSV(e.target?.result as string)
        setEntries(parsed.length ? parsed : [])
      }
      reader.readAsText(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleClear = () => {
    setEntries(null)
    setExtracted(null)
    setParseError(null)
  }

  const expiresAt = extracted?.expiryDate ?? undefined

  return (
    <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.tsv,.txt,.xls,.xlsx,.pdf,.doc,.docx"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      <div
        className={`dropzone${dragOver ? ' over' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="dz-icon"><UploadIcon /></div>
        <h4>{t('inv_title')}</h4>
        <p>{parsing ? t('inv_parsing') : t('inv_drop_hint')}</p>
        <button
          type="button"
          className="btn"
          style={{ fontSize: 12, padding: '5px 14px' }}
          onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
          disabled={parsing}
        >
          {t('inv_browse')}
        </button>
        <p style={{ marginTop: 8, marginBottom: 0, fontSize: 11, color: 'var(--fg-subtle)' }}>{t('inv_format_hint')}</p>
      </div>

      {parseError && (
        <div style={{ padding: '10px 12px', background: 'var(--danger-bg, #fee2e2)', borderRadius: 6, fontSize: 12.5, color: 'var(--danger)' }}>
          {t('inv_parse_error', { msg: parseError })}
        </div>
      )}

      {extracted !== null && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t('inv_extracted')}</span>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={handleClear}>{t('inv_clear')}</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('inv_product_name')}</span>
              <input
                className="cfg-input"
                style={{ fontSize: 12.5, padding: '3px 6px' }}
                value={extracted.productName}
                onChange={e => setExtracted(f => f ? { ...f, productName: e.target.value } : f)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('inv_subtotal')}</span>
              <input
                className="cfg-input"
                style={{ fontSize: 12.5, padding: '3px 6px', fontFamily: 'var(--font-mono)' }}
                type="number"
                step="0.01"
                value={extracted.subtotal ?? ''}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  setExtracted(f => f ? { ...f, subtotal: isNaN(v) ? null : v } : f)
                  if (!isNaN(v)) {
                    const today = new Date()
                    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
                    setEntries([{ month, amount: v }])
                  }
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, padding: '8px 12px', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{t('inv_expiry_date')}</span>
              <input
                className="cfg-input"
                style={{ fontSize: 12.5, padding: '3px 6px', fontFamily: 'var(--font-mono)' }}
                type="date"
                value={extracted.expiryDate ?? ''}
                onChange={e => setExtracted(f => f ? { ...f, expiryDate: e.target.value || null } : f)}
              />
            </div>
          </div>
        </div>
      )}

      {entries !== null && extracted === null && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t('inv_preview', { n: entries.length })}</span>
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={handleClear}>{t('inv_clear')}</button>
          </div>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {entries.map(e => (
              <div key={e.month} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8, padding: '5px 12px', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{e.month}</span>
                <span style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>${e.amount.toFixed(2)}</span>
              </div>
            ))}
            {entries.length === 0 && (
              <div style={{ padding: '12px', color: 'var(--fg-subtle)', fontSize: 12.5, textAlign: 'center' }}>
                {t('inv_format_hint')}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="cfg-field">
        <label className="cfg-label">{t('inv_entry_name')}<span className="cfg-req">*</span></label>
        <div className="cfg-input-wrap">
          <input
            className="cfg-input"
            style={{ fontFamily: 'var(--font-sans)' }}
            placeholder={t('inv_entry_placeholder')}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          className="btn btn-primary"
          disabled={!name.trim() || saving || parsing}
          onClick={() => onSave(name.trim(), entries ?? undefined, expiresAt)}
        >
          {t('inv_add')}
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
    tagGroupBy?: string,
    tagAllocations?: TagAllocation[],
  ) => Promise<void>
  onCancel: () => void
}) {
  const t = useT()
  const isInvoice = item.type === 'invoice'
  const isVercel = item.type === 'vercel'
  const [liveDiscovery, setLiveDiscovery] = useState<VercelDiscovery | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const effectiveDiscovery = liveDiscovery ?? discoveredData ?? item.vercelDiscovery ?? null

  const [entries, setEntries] = useState<MonthlyAmount[]>([])
  const [singleDeptId, setSingleDeptId] = useState<string | null>(null)
  const [allocs, setAllocs] = useState<DeptAllocation[]>([])
  const [amountAllocs, setAmountAllocs] = useState<AmountAllocation[]>([])
  const [projAllocs, setProjAllocs] = useState<ProjectAllocation[]>([])
  const [teamAllocs, setTeamAllocs] = useState<TeamAllocation[]>([])
  const [mode, setMode] = useState<AllocMode>('single')
  const [tagGroupBy, setTagGroupBy] = useState(item.tagGroupBy ?? '')
  const [tagKey, setTagKey] = useState('')
  const [tagValueAllocs, setTagValueAllocs] = useState<{ tagValue: string; deptId: string | null }[]>([])
  const [saving, setSaving] = useState(false)

  const refreshDiscovery = async () => {
    if (!item.id) return
    setRefreshing(true)
    try {
      const res = await fetch('/api/test/vercel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      })
      if (!res.ok) return
      const data: VercelDiscovery = await res.json()
      setLiveDiscovery(data)
      setProjAllocs(prev => data.projects.map(p => ({
        projectId: p.id,
        projectName: p.name,
        deptId: prev.find(pa => pa.projectId === p.id)?.deptId ?? null,
      })))
      setTeamAllocs(prev => data.teams.map(t => ({
        teamId: t.id,
        teamName: t.name,
        deptId: prev.find(ta => ta.teamId === t.id)?.deptId ?? null,
      })))
      await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vercelDiscovery: data }),
      })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const initialMode = item.allocMode ?? (item.deptId ? 'single' : (item.allocations?.length ? 'ratio' : 'single'))
    setMode(initialMode)

    const firstAllocDeptId = item.allocations?.length === 1 ? item.allocations[0].deptId : null
    setSingleDeptId(item.deptId ?? firstAllocDeptId ?? null)

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

    setTagGroupBy(item.tagGroupBy ?? '')

    const existingTagAllocs = item.tagAllocations ?? []
    setTagKey(existingTagAllocs[0]?.tagKey ?? '')
    setTagValueAllocs(existingTagAllocs.map(ta => ({ tagValue: ta.tagValue, deptId: ta.deptId })))

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

  const isAws = item.type === 'aws'

  const availableModes: { key: AllocMode; label: string }[] = [
    { key: 'single', label: t('mode_single') },
    { key: 'ratio', label: t('mode_ratio') },
    { key: 'amount', label: t('mode_amount') },
    ...(isAws ? [{ key: 'tag' as AllocMode, label: t('mode_tag') }] : []),
    ...(isVercel && (effectiveDiscovery?.projects.length ?? 0) > 0 ? [{ key: 'project' as AllocMode, label: t('mode_project') }] : []),
    ...(isVercel && (effectiveDiscovery?.teams.length ?? 0) > 0 ? [{ key: 'team' as AllocMode, label: t('mode_team') }] : []),
  ]

  const allocsToSave = (() => {
    if (mode === 'ratio') return allocs
    if (mode === 'single' && singleDeptId) return [{ deptId: singleDeptId, pct: 100 }]
    return []
  })()

  const handleSave = async () => {
    setSaving(true)
    try {
      const tagAllocsToSave: TagAllocation[] = tagValueAllocs
        .filter(ta => ta.tagValue.trim())
        .map(ta => ({ tagKey: tagKey.trim(), tagValue: ta.tagValue.trim(), deptId: ta.deptId }))
      await onSave(
        item.id,
        allocsToSave,
        isInvoice ? entries : undefined,
        mode,
        mode === 'amount' ? amountAllocs : [],
        mode === 'project' ? projAllocs : [],
        mode === 'team' ? teamAllocs : [],
        isAws ? tagGroupBy : undefined,
        mode === 'tag' ? tagAllocsToSave : [],
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cfg-form">
      <div className="so-head" style={{ paddingRight: 48 }}>
        <h2 style={{ fontSize: 15 }}>{t('ap_title', { name: item.name })}</h2>
        <p>{t('ap_subtitle')}</p>
      </div>

      <div className="cfg-body">
        {isInvoice && (
          <div className="cfg-field">
            <label className="cfg-label">{t('ap_invoice_costs')}</label>
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

        {item.type === 'aws' && (
          <div className="cfg-field">
            <label className="cfg-label">
              {t('ap_tag_group')}
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--fg-subtle)', fontWeight: 400, background: 'var(--bg-muted)', padding: '1px 6px', borderRadius: 4 }}>{t('ap_tag_group_optional')}</span>
            </label>
            <div className="cfg-input-wrap">
              <input
                className="cfg-input"
                style={{ fontFamily: 'var(--font-sans)' }}
                placeholder={t('ap_tag_group_placeholder')}
                value={tagGroupBy}
                onChange={e => setTagGroupBy(e.target.value)}
              />
            </div>
            <div className="cfg-hint">{t('ap_tag_group_hint')}</div>
          </div>
        )}

        {availableModes.length > 1 && (
          <div className="cfg-field">
            <label className="cfg-label">{t('ap_alloc_mode')}</label>
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

        {mode === 'single' && (
          <div className="cfg-field">
            <label className="cfg-label">{t('ap_single_label')}</label>
            <div className="cfg-hint" style={{ marginBottom: 8 }}>{t('ap_single_hint')}</div>
            <select
              className="cfg-input"
              style={{ fontFamily: 'var(--font-sans)' }}
              value={singleDeptId ?? ''}
              onChange={e => setSingleDeptId(e.target.value || null)}
            >
              <option value="">{t('ap_single_unalloc')}</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {departments.length === 0 && <div className="cfg-hint" style={{ marginTop: 8 }}>{t('ap_no_depts')}</div>}
          </div>
        )}

        {mode === 'ratio' && (
          <div className="cfg-field">
            <label className="cfg-label">{t('ap_ratio_label')}</label>
            <div className="cfg-hint" style={{ marginBottom: 8 }}>{t('ap_ratio_hint')}</div>
            {allocs.length === 0 && (
              <div style={{ color: 'var(--fg-subtle)', fontSize: 13, padding: '8px 0' }}>{t('ap_ratio_empty')}</div>
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
                  <span style={{ color: 'var(--fg-muted)' }}>{t('ap_ratio_total')}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: totalPct > 100 ? 'var(--danger)' : 'var(--fg)' }}>{totalPct}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(totalPct, 100)}%`, background: totalPct > 100 ? 'var(--danger)' : 'var(--accent)', borderRadius: 2, transition: 'width 0.2s' }} />
                </div>
                {(100 - totalPct) > 0 && <div style={{ marginTop: 6, color: 'var(--fg-subtle)', fontSize: 12 }}>{t('ap_ratio_unalloc', { pct: 100 - totalPct })}</div>}
                {totalPct > 100 && <div style={{ marginTop: 4, color: 'var(--danger)', fontSize: 12 }}>{t('ap_ratio_overflow')}</div>}
              </div>
            )}
            {unaddedDepts.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <select className="cfg-input" style={{ fontFamily: 'var(--font-sans)' }} value=""
                  onChange={e => { if (e.target.value) setAllocs(prev => [...prev, { deptId: e.target.value, pct: 0 }]) }}>
                  <option value="">{t('ap_add_dept')}</option>
                  {unaddedDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            {departments.length === 0 && <div className="cfg-hint" style={{ marginTop: 8 }}>{t('ap_no_depts')}</div>}
          </div>
        )}

        {mode === 'amount' && (
          <div className="cfg-field">
            <label className="cfg-label">{t('ap_amount_label')}</label>
            <div className="cfg-hint" style={{ marginBottom: 8 }}>{t('ap_amount_hint')}</div>
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
                  <option value="">{t('ap_add_dept')}</option>
                  {unaddedAmountDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            {departments.length === 0 && <div className="cfg-hint" style={{ marginTop: 8 }}>{t('ap_no_depts')}</div>}
          </div>
        )}

        {mode === 'project' && (
          <div className="cfg-field">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="cfg-label" style={{ marginBottom: 0 }}>{t('ap_project_label')}</label>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={refreshDiscovery}
                disabled={refreshing}
              >
                <RefreshIcon />{refreshing ? t('ap_refreshing') : t('ap_refresh')}
              </button>
            </div>
            <div className="cfg-hint" style={{ marginBottom: 8 }}>{t('ap_project_hint')}</div>
            {projAllocs.length === 0 ? (
              <div style={{ color: 'var(--fg-subtle)', fontSize: 13 }}>{t('ap_project_empty')}</div>
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
                      <option value="">{t('ap_unalloc_option')}</option>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="cfg-label" style={{ marginBottom: 0 }}>{t('ap_team_label')}</label>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={refreshDiscovery}
                disabled={refreshing}
              >
                <RefreshIcon />{refreshing ? t('ap_refreshing') : t('ap_refresh')}
              </button>
            </div>
            <div className="cfg-hint" style={{ marginBottom: 8 }}>{t('ap_team_hint')}</div>
            {teamAllocs.length === 0 ? (
              <div style={{ color: 'var(--fg-subtle)', fontSize: 13 }}>{t('ap_team_empty')}</div>
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
                      <option value="">{t('ap_unalloc_option')}</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'tag' && (
          <div className="cfg-field">
            <label className="cfg-label">{t('ap_tag_label')}</label>
            <div className="cfg-hint" style={{ marginBottom: 8 }}>{t('ap_tag_hint')}</div>
            <div style={{ marginBottom: 12 }}>
              <label className="cfg-label" style={{ fontSize: 11.5, marginBottom: 4 }}>{t('ap_tag_key')}</label>
              <input
                className="cfg-input"
                style={{ fontFamily: 'var(--font-sans)' }}
                placeholder={t('ap_tag_group_placeholder')}
                value={tagKey}
                onChange={e => setTagKey(e.target.value)}
              />
            </div>
            {tagValueAllocs.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', gap: '4px 8px', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)', paddingLeft: 2 }}>{t('ap_tag_value_col')}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-muted)', paddingLeft: 2 }}>{t('ap_tag_dept_col')}</span>
                  <span />
                </div>
                {tagValueAllocs.map((ta, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 28px', gap: '4px 8px', alignItems: 'center', marginBottom: 6 }}>
                    <input
                      className="cfg-input"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                      placeholder={t('ap_tag_value_placeholder')}
                      value={ta.tagValue}
                      onChange={e => setTagValueAllocs(prev => prev.map((x, i) => i === idx ? { ...x, tagValue: e.target.value } : x))}
                    />
                    <select
                      className="cfg-input"
                      style={{ fontFamily: 'var(--font-sans)', fontSize: 12 }}
                      value={ta.deptId ?? ''}
                      onChange={e => setTagValueAllocs(prev => prev.map((x, i) => i === idx ? { ...x, deptId: e.target.value || null } : x))}
                    >
                      <option value="">{t('ap_unalloc_option')}</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => setTagValueAllocs(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="btn"
              style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => setTagValueAllocs(prev => [...prev, { tagValue: '', deptId: null }])}
            >
              {t('ap_tag_add')}
            </button>
            {departments.length === 0 && <div className="cfg-hint" style={{ marginTop: 8 }}>{t('ap_no_depts')}</div>}
          </div>
        )}
      </div>

      <div className="cfg-foot">
        <button className="btn" onClick={onCancel}>{t('ap_cancel')}</button>
        <button
          className="btn btn-primary"
          disabled={saving || (mode === 'ratio' && totalPct > 100)}
          onClick={handleSave}
        >
          {t('ap_save')}
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
  onDelete,
}: {
  item: ItemWithoutCreds | null
  departments: Department[]
  defaultTab?: 'config' | 'alloc'
  onClose: () => void
  onSaveConfig: (id: string, name: string, creds: Record<string, string>, expiresAt?: string) => Promise<void>
  onSaveAlloc: (
    id: string,
    allocations: DeptAllocation[],
    invoiceEntries?: MonthlyAmount[],
    allocMode?: AllocMode,
    amountAllocations?: AmountAllocation[],
    projectAllocations?: ProjectAllocation[],
    teamAllocations?: TeamAllocation[],
    tagGroupBy?: string,
    tagAllocations?: TagAllocation[],
  ) => Promise<void>
  onDelete?: (id: string) => void
}) {
  const t = useT()
  const open = item !== null
  const isInvoice = item?.type === 'invoice'
  const [tab, setTab] = useState<'config' | 'alloc'>('config')
  const [discoveredData, setDiscoveredData] = useState<VercelDiscovery | null>(null)

  useEffect(() => {
    if (!item) return
    setTab(isInvoice ? 'alloc' : (defaultTab ?? 'config'))
    setDiscoveredData(null)
  }, [item, defaultTab, isInvoice])

  const handleSaveConfig = async (name: string, creds: Record<string, string>, expiresAt?: string) => {
    if (!item) return
    await onSaveConfig(item.id, name, creds, expiresAt)
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
                <button className={`so-tab${tab === 'config' ? ' active' : ''}`} onClick={() => setTab('config')}>{t('iso_tab_config')}</button>
                <button className={`so-tab${tab === 'alloc' ? ' active' : ''}`} onClick={() => setTab('alloc')}>{t('iso_tab_alloc')}</button>
              </div>
            )}
            {tab === 'config' && !isInvoice && (
              <ConfigForm
                serviceType={item.type}
                isEdit={true}
                itemId={item.id}
                initialExpiresAt={item.expiresAt}
                onSave={handleSaveConfig}
                onCancel={onClose}
                onDelete={onDelete ? () => onDelete(item.id) : undefined}
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
  const t = useT()
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
      if (!res.ok) throw new Error(data.error ?? t('toast_add_failed'))
      const updated = [...depts, { id: data.id, name: newName.trim(), color: newColor, createdAt: new Date().toISOString() }]
      setDepts(updated)
      onUpdate(updated)
      setNewName('')
      setNewColor(DEPT_COLORS[updated.length % DEPT_COLORS.length])
      showToast(t('toast_added', { name: newName.trim() }))
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast_add_failed'))
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
      if (!res.ok) throw new Error(t('toast_update_failed'))
      const updated = depts.map(d => d.id === id ? { ...d, name: editName.trim() } : d)
      setDepts(updated)
      onUpdate(updated)
      setEditingId(null)
      showToast(t('toast_updated'))
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast_update_failed'))
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (dept: Department) => {
    if (!confirm(t('dm_delete_confirm', { name: dept.name }))) return
    setLoading(dept.id)
    try {
      const res = await fetch(`/api/departments/${dept.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(t('toast_delete_failed'))
      const updated = depts.filter(d => d.id !== dept.id)
      setDepts(updated)
      onUpdate(updated)
      showToast(t('toast_deleted', { name: dept.name }))
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast_delete_failed'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dm_title')}</h1>
          <p className="page-subtitle">{t('dm_subtitle')}</p>
        </div>
      </div>

      {depts.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><DeptIcon /></div>
          <h3>{t('dm_empty_title')}</h3>
          <p>{t('dm_empty_desc')}</p>
        </div>
      ) : (
        <div className="svc-list" style={{ marginBottom: 24 }}>
          <div className="svc-row svc-row-head" style={{ gridTemplateColumns: '20px 1fr 80px' }}>
            <div />
            <div>{t('dm_col_name')}</div>
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
                  <button className="btn btn-ghost btn-icon" onClick={() => handleEditSave(dept.id)} disabled={loading === dept.id} title={t('dm_save')}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{t('dm_save')}</span>
                  </button>
                ) : (
                  <button className="btn btn-ghost btn-icon" onClick={() => { setEditingId(dept.id); setEditName(dept.name) }} title={t('dm_rename_title')}>
                    <EditIcon />
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => handleDelete(dept)}
                  disabled={loading === dept.id}
                  style={{ color: 'var(--danger)' }}
                  title={t('dm_delete_title')}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', background: 'var(--bg)' }}>
        <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 12 }}>{t('dm_add_title')}</div>
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
            placeholder={t('dm_name_placeholder')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          />
          <button className="btn btn-primary" disabled={!newName.trim() || loading === 'add'} onClick={handleAdd}>
            <PlusIcon /> {t('dm_add_btn')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function SettingsClient({ items: initialItems, departments: initialDepartments, isOrgContext }: Props) {
  const router = useRouter()
  const t = useT()
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

  async function handleConnect(type: ServiceType, name: string, creds: Record<string, string>, invoiceEntries?: MonthlyAmount[], expiresAt?: string) {
    setLoading('add')
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name, credentials: creds, invoiceEntries, expiresAt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('toast_add_failed'))
      showToast(t('toast_added', { name }))
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast_add_failed'))
    } finally {
      setLoading(null)
    }
  }

  async function handleEditSave(id: string, name: string, creds: Record<string, string>, expiresAt?: string) {
    setLoading(id)
    try {
      const body: Record<string, unknown> = { name }
      const hasCredsInput = Object.values(creds).some(v => v.trim())
      if (hasCredsInput) body.credentials = creds
      body.expiresAt = expiresAt ?? null
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('toast_save_failed'))
      showToast(t('toast_saved_changes'))
      router.refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast_save_failed'))
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(id: string) {
    const item = items.find(i => i.id === id)
    if (!item) return
    if (!confirm(t('confirm_delete_service', { name: item.name }))) return
    setLoading(id)
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(t('toast_delete_failed'))
      setItems(prev => prev.filter(i => i.id !== id))
      setEditItem(null)
      showToast(t('toast_deleted', { name: item.name }))
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast_delete_failed'))
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
    tagGroupBy?: string,
    tagAllocations?: TagAllocation[],
  ) {
    setLoading(id)
    try {
      const body: Record<string, unknown> = { allocations }
      if (invoiceEntries !== undefined) body.invoiceEntries = invoiceEntries
      if (allocMode !== undefined) body.allocMode = allocMode
      if (amountAllocations !== undefined) body.amountAllocations = amountAllocations
      if (projectAllocations !== undefined) body.projectAllocations = projectAllocations
      if (teamAllocations !== undefined) body.teamAllocations = teamAllocations
      if (tagGroupBy !== undefined) body.tagGroupBy = tagGroupBy
      if (tagAllocations !== undefined) body.tagAllocations = tagAllocations
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(t('toast_save_failed'))
      setItems(prev => prev.map(i => i.id === id ? {
        ...i,
        allocations,
        deptId: undefined,
        invoiceEntries: invoiceEntries ?? i.invoiceEntries,
        allocMode: allocMode ?? i.allocMode,
        amountAllocations: amountAllocations !== undefined ? (amountAllocations.length ? amountAllocations : undefined) : i.amountAllocations,
        projectAllocations: projectAllocations !== undefined ? (projectAllocations.length ? projectAllocations : undefined) : i.projectAllocations,
        teamAllocations: teamAllocations !== undefined ? (teamAllocations.length ? teamAllocations : undefined) : i.teamAllocations,
        tagGroupBy: tagGroupBy !== undefined ? (tagGroupBy.trim() || undefined) : i.tagGroupBy,
        tagAllocations: tagAllocations !== undefined ? (tagAllocations.length ? tagAllocations : undefined) : i.tagAllocations,
      } : i))
      showToast(t('toast_saved_alloc'))
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast_save_failed'))
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

  async function handleRename(id: string, name: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, name } : i))
    try {
      await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
    } catch {
      // optimistic update already applied; silently ignore
    }
  }

  return (
    <>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <h1 style={{ margin: 0, marginRight: 24 }}>{t('st_title')}</h1>
          <div className="so-tabs" style={{ border: 'none', padding: 0, gap: 0 }}>
            <button className={`so-tab${view === 'services' ? ' active' : ''}`} onClick={() => setView('services')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ServicesIcon /> {t('st_tab_services')}
            </button>
            <button className={`so-tab${view === 'departments' ? ' active' : ''}`} onClick={() => setView('departments')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <DeptIcon /> {t('st_tab_depts')}
            </button>
          </div>
        </div>
        <div className="topbar-actions">
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
            <h1 className="page-title">{t('st_svc_title')}</h1>
            <p className="page-subtitle">
              {items.length === 0
                ? t('st_svc_subtitle_empty')
                : t('st_svc_subtitle', { n: items.length })}
              {isOrgContext && ` · ${t('st_svc_shared')}`}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <PlusIcon /> {t('st_add_btn')}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><ServicesIcon /></div>
            <h3>{t('st_svc_empty_title')}</h3>
            <p>{t('st_svc_empty_desc')}</p>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <PlusIcon /> {t('st_svc_add_first')}
            </button>
          </div>
        ) : (
          <div className="svc-list">
            <div className="svc-row svc-row-head" style={{ gridTemplateColumns: '36px minmax(140px,1.6fr) 100px 110px 80px minmax(100px,1fr) 80px' }}>
              <div />
              <div>{t('st_col_service')}</div>
              <div>{t('st_col_status')}</div>
              <div>{t('st_col_dept')}</div>
              <div>{t('st_col_mode')}</div>
              <div>{t('st_col_comment')}</div>
              <div />
            </div>
            {items.map(item => {
              const tint = SERVICE_TINT[item.type] ?? '#888'
              const mark = SERVICE_MARK[item.type] ?? item.type[0].toUpperCase()
              const def = getServiceDef(item.type)
              const isInvoice = item.type === 'invoice'
              const allocSummary = (() => {
                if (item.allocMode === 'amount' && item.amountAllocations?.length) {
                  const valid = item.amountAllocations.filter(a => a.deptId)
                  if (valid.length === 1) {
                    const d = departments.find(d => d.id === valid[0].deptId)
                    return d ? { label: d.name, color: d.color } : null
                  }
                  if (valid.length > 1) return { label: t('alloc_n_depts', { n: valid.length }), color: 'var(--accent)' }
                }
                if (item.allocMode === 'project' && item.projectAllocations?.length) {
                  const valid = item.projectAllocations.filter(a => a.deptId)
                  if (valid.length === 1) {
                    const d = departments.find(d => d.id === valid[0].deptId)
                    return d ? { label: d.name, color: d.color } : { label: t('alloc_1_project'), color: 'var(--accent)' }
                  }
                  return { label: t('alloc_n_projects', { n: item.projectAllocations.length }), color: 'var(--accent)' }
                }
                if (item.allocMode === 'team' && item.teamAllocations?.length) {
                  const valid = item.teamAllocations.filter(a => a.deptId)
                  if (valid.length === 1) {
                    const d = departments.find(d => d.id === valid[0].deptId)
                    return d ? { label: d.name, color: d.color } : { label: t('alloc_1_team'), color: 'var(--accent)' }
                  }
                  return { label: t('alloc_n_teams', { n: item.teamAllocations.length }), color: 'var(--accent)' }
                }
                if (item.allocMode === 'tag' && item.tagAllocations?.length) {
                  const mapped = item.tagAllocations.filter(a => a.deptId).length
                  return mapped > 0 ? { label: t('alloc_n_assigned', { n: mapped }), color: 'var(--accent)' } : null
                }
                if (item.allocations && item.allocations.length > 0) {
                  if (item.allocations.length === 1) {
                    const d = departments.find(d => d.id === item.allocations![0].deptId)
                    return d ? { label: d.name, color: d.color } : null
                  }
                  return { label: t('alloc_n_depts', { n: item.allocations.length }), color: 'var(--accent)' }
                }
                if (item.deptId) {
                  const d = departments.find(d => d.id === item.deptId)
                  return d ? { label: d.name, color: d.color } : null
                }
                return null
              })()
              const modeLabel = (() => {
                if (item.allocMode === 'amount') return t('mode_amount')
                if (item.allocMode === 'project') return t('mode_project')
                if (item.allocMode === 'team') return t('mode_team')
                if (item.allocMode === 'tag') return t('mode_tag')
                if (item.allocMode === 'single' || item.deptId || (item.allocations?.length === 1 && item.allocations[0].pct === 100)) return t('mode_single')
                if (item.allocations && item.allocations.length > 0) return t('mode_ratio')
                if (item.amountAllocations?.length) return t('mode_amount')
                if (item.projectAllocations?.length) return t('mode_project')
                if (item.teamAllocations?.length) return t('mode_team')
                if (item.tagAllocations?.length) return t('mode_tag')
                return null
              })()
              return (
                <div key={item.id} className="svc-row" style={{ gridTemplateColumns: '36px minmax(140px,1.6fr) 100px 110px 80px minmax(100px,1fr) 80px' }}>
                  <div className="svc-mark" style={{ background: tint }}>
                    {mark}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <NameCell value={item.name} onChange={v => handleRename(item.id, v)} />
                    <div className="svc-cat">{def?.label ?? item.type}{isInvoice ? ` · ${t('st_badge_manual')}` : ` · ${t('st_badge_native')}`}</div>
                  </div>
                  <div>
                    <span className="svc-status">
                      <span className={`dot ${isInvoice ? 'imported' : 'connected'}`} />
                      {isInvoice ? t('st_status_manual') : t('st_status_connected')}
                    </span>
                  </div>
                  <div>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '3px 8px', gap: 5, maxWidth: 120 }}
                      onClick={() => { setEditDefaultTab('alloc'); setEditItem(item) }}
                      title={t('st_alloc_title')}
                    >
                      {allocSummary ? (
                        <>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: allocSummary.color, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{allocSummary.label}</span>
                        </>
                      ) : (
                        <><SplitIcon /><span style={{ color: 'var(--fg-subtle)' }}>{t('st_alloc_unset')}</span></>
                      )}
                    </button>
                  </div>
                  <div>
                    {modeLabel && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-muted)', color: 'var(--fg-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {modeLabel}
                      </span>
                    )}
                  </div>
                  <div>
                    <CommentCell value={item.comment} onChange={v => handleComment(item.id, v)} />
                  </div>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => { setEditDefaultTab(isInvoice ? 'alloc' : 'config'); setEditItem(item) }}
                      title={isInvoice ? t('st_configure') : t('st_reconfigure')}
                      disabled={loading === item.id}
                    >
                      <SettingsSmIcon />
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
              <div style={{ fontWeight: 500, fontSize: 13.5 }}>{t('st_add_cta_title')}</div>
              <div style={{ color: 'var(--fg-muted)', fontSize: 12.5, marginTop: 2 }}>{t('st_add_cta_desc')}</div>
            </div>
            <button className="btn" onClick={() => setAddOpen(true)}><PlusIcon /> {t('st_add_service')}</button>
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
        onDelete={handleDelete}
      />

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  )
}
