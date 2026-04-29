'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OrganizationSwitcher } from '@clerk/nextjs'
import { SERVICE_CATALOG, getServiceDef } from '@/lib/services'
import { ServiceIcon } from '@/components/ServiceIcon'
import type { CostItem, ServiceType } from '@/lib/types'

type ItemWithoutCreds = Omit<CostItem, 'credentials'>

type Props = {
  items: ItemWithoutCreds[]
  isOrgContext: boolean
}

export default function SettingsClient({ items: initialItems, isOrgContext }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  // Add panel state
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null)
  const [addName, setAddName] = useState('')
  const [addCreds, setAddCreds] = useState<Record<string, string>>({})

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCreds, setEditCreds] = useState<Record<string, string>>({})

  const filteredCatalog = SERVICE_CATALOG.filter((s) =>
    s.label.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  )

  function selectType(type: ServiceType) {
    const def = getServiceDef(type)!
    setSelectedType(type)
    setAddName(def.label)
    setAddCreds({})
  }

  function resetAdd() {
    setShowAdd(false)
    setSearch('')
    setSelectedType(null)
    setAddName('')
    setAddCreds({})
  }

  async function handleAdd() {
    if (!selectedType) return
    setError(null)
    setLoading('add')
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, name: addName, credentials: addCreds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '保存に失敗しました')
      setSuccess(`${addName}を追加しました`)
      resetAdd()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  function startEdit(item: ItemWithoutCreds) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditCreds({})
    setError(null)
    setSuccess(null)
  }

  async function handleEditSave(item: ItemWithoutCreds) {
    setError(null)
    setLoading(item.id)
    try {
      const body: Record<string, unknown> = {}
      if (editName.trim() && editName !== item.name) body.name = editName.trim()
      const hasCredsInput = Object.values(editCreds).some((v) => v.trim())
      if (hasCredsInput) body.credentials = editCreds

      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '更新に失敗しました')
      setSuccess(`${item.name}を更新しました`)
      setEditingId(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(item: ItemWithoutCreds) {
    if (!confirm(`「${item.name}」を削除しますか？`)) return
    setError(null)
    setLoading(item.id)
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      setSuccess(`${item.name}を削除しました`)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  const selectedDef = selectedType ? getServiceDef(selectedType) : null

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>コスト項目</h1>
          {items.length > 0 && (
            <Link href="/dashboard" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }}>
              ダッシュボードへ →
            </Link>
          )}
        </div>
        <div style={{ marginTop: 10 }}>
          <OrganizationSwitcher hidePersonal={false} afterSelectOrganizationUrl="/settings" afterSelectPersonalUrl="/settings" />
        </div>
        {isOrgContext && (
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', background: '#f0f4ff', border: '1px solid #c5d0ff', borderRadius: 6, padding: '6px 10px' }}>
            組織のコスト項目を管理しています。同じ組織のメンバーが共有します。
          </p>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--danger)' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fff8', border: '1px solid var(--success)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--success)' }}>
          {success}
        </div>
      )}

      {/* Item list */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {items.map((item) => {
            const isEditing = editingId === item.id
            const def = getServiceDef(item.type)
            return (
              <div key={item.id} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ServiceIcon service={item.type} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ width: '100%', fontSize: 14, fontWeight: 500 }}
                        autoFocus
                      />
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{def?.label ?? item.type}</div>
                  </div>
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => startEdit(item)}>
                        編集
                      </button>
                      <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} disabled={loading === item.id} onClick={() => handleDelete(item)}>
                        削除
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit form */}
                {isEditing && def && item.type !== 'invoice' && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>認証情報を更新する場合のみ入力してください</p>
                    {def.fields.map((field) => (
                      <div key={field.key}>
                        <label>{field.label}</label>
                        {field.type === 'textarea' ? (
                          <textarea
                            placeholder={field.placeholder}
                            value={editCreds[field.key] ?? ''}
                            onChange={(e) => setEditCreds((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            style={{ width: '100%', minHeight: 72, resize: 'vertical', fontFamily: 'DM Mono, monospace', fontSize: 11 }}
                          />
                        ) : (
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={editCreds[field.key] ?? ''}
                            onChange={(e) => setEditCreds((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                    {def.docsUrl && (
                      <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                        取得先:{' '}
                        <a href={def.docsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                          {def.docsUrl}
                        </a>
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" style={{ flex: 1 }} disabled={loading === item.id} onClick={() => handleEditSave(item)}>
                        {loading === item.id ? '保存中...' : '保存'}
                      </button>
                      <button className="btn btn-ghost" onClick={() => setEditingId(null)}>キャンセル</button>
                    </div>
                  </div>
                )}
                {isEditing && (item.type === 'invoice' || !def?.fields.length) && (
                  <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} disabled={loading === item.id} onClick={() => handleEditSave(item)}>
                      {loading === item.id ? '保存中...' : '名前を保存'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setEditingId(null)}>キャンセル</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add button */}
      {!showAdd && (
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowAdd(true)}>
          ＋ サービスを追加
        </button>
      )}

      {/* Add panel */}
      {showAdd && (
        <div className="card" style={{ padding: 16 }}>
          {!selectedType ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <input
                  placeholder="サービスを検索..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredCatalog.map((s) => (
                  <button
                    key={s.type}
                    onClick={() => selectType(s.type)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                      padding: '10px 12px', cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <ServiceIcon service={s.type} size={28} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.description}</div>
                    </div>
                  </button>
                ))}
                {filteredCatalog.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
                    該当するサービスが見つかりません
                  </p>
                )}
              </div>
              <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={resetAdd}>
                キャンセル
              </button>
            </>
          ) : selectedDef && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <ServiceIcon service={selectedType} size={28} />
                <span style={{ fontWeight: 600 }}>{selectedDef.label}</span>
                <button onClick={() => setSelectedType(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>
                  ← 戻る
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label>項目名</label>
                  <input
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder={selectedDef.label}
                  />
                </div>
                {selectedType !== 'invoice' && selectedDef.fields.map((field) => (
                  <div key={field.key}>
                    <label>{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        placeholder={field.placeholder}
                        value={addCreds[field.key] ?? ''}
                        onChange={(e) => setAddCreds((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        style={{ width: '100%', minHeight: 72, resize: 'vertical', fontFamily: 'DM Mono, monospace', fontSize: 11 }}
                      />
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={addCreds[field.key] ?? ''}
                        onChange={(e) => setAddCreds((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
                {selectedDef.docsUrl && (
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                    取得先:{' '}
                    <a href={selectedDef.docsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                      {selectedDef.docsUrl}
                    </a>
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={loading === 'add'} onClick={handleAdd}>
                    {loading === 'add' ? '追加中...' : '追加する'}
                  </button>
                  <button className="btn btn-ghost" onClick={resetAdd}>キャンセル</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: 20, padding: '12px 16px', background: '#fffdf0', border: '1px solid #f0e0a0', borderRadius: 8, fontSize: 12, color: '#7a6a00', lineHeight: 1.6 }}>
        🔒 認証情報は暗号化して保存されます。読み取り専用の権限を持つキーの使用を推奨します。
      </div>
    </div>
  )
}
