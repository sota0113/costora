'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MaskedKeys, ServiceId } from '@/lib/types'

type Props = {
  maskedKeys: MaskedKeys
  connectedCount: number
  totalServices: number
}

type ServiceConfig = {
  id: ServiceId
  label: string
  description: string
  keyLabel: string
  placeholder: string
  docsUrl: string
  fields: 'single' | 'aws'
}

const SERVICES: ServiceConfig[] = [
  {
    id: 'vercel',
    label: 'Vercel',
    description: 'インフラ・ホスティング費用',
    keyLabel: 'APIトークン',
    placeholder: 'vercel_xxxxxxxxxxxx',
    docsUrl: 'https://vercel.com/account/tokens',
    fields: 'single',
  },
  {
    id: 'aws',
    label: 'AWS',
    description: 'クラウドインフラ費用',
    keyLabel: 'IAMアクセスキー',
    placeholder: 'AKIAIOSFODNN7EXAMPLE',
    docsUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials',
    fields: 'aws',
  },
  {
    id: 'resend',
    label: 'Resend',
    description: 'メール送信費用',
    keyLabel: 'APIキー',
    placeholder: 're_xxxxxxxxxxxx',
    docsUrl: 'https://resend.com/api-keys',
    fields: 'single',
  },
]

export default function SettingsClient({ maskedKeys, connectedCount, totalServices }: Props) {
  const router = useRouter()
  const [expandedService, setExpandedService] = useState<ServiceId | null>(null)
  const [showKey, setShowKey] = useState<Record<ServiceId, boolean>>({} as Record<ServiceId, boolean>)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<ServiceId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isConnected = (id: ServiceId) => {
    if (id === 'vercel') return !!maskedKeys.vercel
    if (id === 'aws') return !!maskedKeys.aws
    if (id === 'resend') return !!maskedKeys.resend
    return false
  }

  const getMasked = (id: ServiceId) => {
    if (id === 'vercel') return maskedKeys.vercel ?? ''
    if (id === 'aws') return maskedKeys.aws?.accessKeyId ?? ''
    if (id === 'resend') return maskedKeys.resend ?? ''
    return ''
  }

  async function handleSave(service: ServiceConfig) {
    setError(null)
    setSuccess(null)
    setLoading(service.id)

    const body: Record<string, string> = { service: service.id }
    if (service.fields === 'aws') {
      body.accessKeyId = formValues[`${service.id}_accessKeyId`] ?? ''
      body.secretAccessKey = formValues[`${service.id}_secretAccessKey`] ?? ''
      if (!body.accessKeyId || !body.secretAccessKey) {
        setError('アクセスキーIDとシークレットキーの両方を入力してください')
        setLoading(null)
        return
      }
    } else {
      body.value = formValues[service.id] ?? ''
      if (!body.value) {
        setError('APIキーを入力してください')
        setLoading(null)
        return
      }
    }

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '保存に失敗しました')
      }
      setSuccess(`${service.label}のAPIキーを保存しました`)
      setExpandedService(null)
      setFormValues({})
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(id: ServiceId, label: string) {
    if (!confirm(`${label}のAPIキーを削除しますか？`)) return
    setError(null)
    setSuccess(null)
    setLoading(id)
    try {
      const res = await fetch(`/api/keys?service=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      setSuccess(`${label}のAPIキーを削除しました`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  const progressPct = (connectedCount / totalServices) * 100

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>APIキー設定</h1>
          {connectedCount > 0 && (
            <Link href="/dashboard" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }}>
              ダッシュボードへ →
            </Link>
          )}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          各サービスのAPIキーを登録してコストを取得します
        </p>
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>接続済みサービス</span>
          <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>
            {connectedCount} / {totalServices}
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: 'var(--border)',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: connectedCount === totalServices ? 'var(--success)' : 'var(--ink)',
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            background: '#fff5f5',
            border: '1px solid var(--danger)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: 'var(--danger)',
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            background: '#f0faf5',
            border: '1px solid var(--success)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            fontSize: 13,
            color: 'var(--success)',
          }}
        >
          {success}
        </div>
      )}

      {/* Service Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SERVICES.map((svc) => {
          const connected = isConnected(svc.id)
          const expanded = expandedService === svc.id
          const masked = getMasked(svc.id)

          return (
            <div key={svc.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Service header row */}
              <button
                onClick={() => setExpandedService(expanded ? null : svc.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: connected ? 'var(--success)' : 'var(--border)',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 15 }}>{svc.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{svc.description}</div>
                  </div>
                </div>
                <span style={{ color: 'var(--subtle)', fontSize: 18, lineHeight: 1 }}>
                  {expanded ? '−' : '+'}
                </span>
              </button>

              {/* Expanded form */}
              {expanded && (
                <div
                  style={{
                    padding: '0 20px 20px',
                    borderTop: '1px solid var(--border)',
                    paddingTop: 16,
                  }}
                >
                  {/* Current key display */}
                  {connected && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 12px',
                        background: 'var(--bg)',
                        borderRadius: 6,
                        marginBottom: 14,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontFamily: 'DM Mono, monospace',
                          color: 'var(--muted)',
                          wordBreak: 'break-all',
                        }}
                      >
                        {showKey[svc.id] ? masked : masked}
                      </span>
                      <button
                        onClick={() =>
                          setShowKey((prev) => ({ ...prev, [svc.id]: !prev[svc.id] }))
                        }
                        style={{
                          fontSize: 12,
                          color: 'var(--muted)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          flexShrink: 0,
                        }}
                      >
                        {showKey[svc.id] ? '隠す' : '表示'}
                      </button>
                    </div>
                  )}

                  {/* Input fields */}
                  {svc.fields === 'aws' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      <div>
                        <label>アクセスキーID</label>
                        <input
                          type="text"
                          placeholder="AKIAIOSFODNN7EXAMPLE"
                          value={formValues[`${svc.id}_accessKeyId`] ?? ''}
                          onChange={(e) =>
                            setFormValues((prev) => ({
                              ...prev,
                              [`${svc.id}_accessKeyId`]: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label>シークレットアクセスキー</label>
                        <input
                          type="password"
                          placeholder="wJalrXUtnFEMI/K7MDENG/..."
                          value={formValues[`${svc.id}_secretAccessKey`] ?? ''}
                          onChange={(e) =>
                            setFormValues((prev) => ({
                              ...prev,
                              [`${svc.id}_secretAccessKey`]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: 14 }}>
                      <label>{svc.keyLabel}</label>
                      <input
                        type="password"
                        placeholder={svc.placeholder}
                        value={formValues[svc.id] ?? ''}
                        onChange={(e) =>
                          setFormValues((prev) => ({ ...prev, [svc.id]: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  {/* Docs link */}
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                    キーの取得先:{' '}
                    <a
                      href={svc.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--ink)', textDecoration: 'underline' }}
                    >
                      {svc.docsUrl}
                    </a>
                  </p>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={loading === svc.id}
                      onClick={() => handleSave(svc)}
                    >
                      {loading === svc.id ? '保存中...' : connected ? '更新する' : '保存する'}
                    </button>
                    {connected && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: '10px 16px' }}
                        disabled={loading === svc.id}
                        onClick={() => handleDelete(svc.id, svc.label)}
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Security note */}
      <div
        style={{
          marginTop: 20,
          padding: '12px 16px',
          background: '#fffdf0',
          border: '1px solid #f0e0a0',
          borderRadius: 8,
          fontSize: 12,
          color: '#7a6a00',
          lineHeight: 1.6,
        }}
      >
        🔒 APIキーは暗号化して保存されます。読み取り専用の権限を持つキーの使用を推奨します。
        AWSは <code>ce:GetCostAndUsage</code> のみ付与してください。
      </div>
    </div>
  )
}
