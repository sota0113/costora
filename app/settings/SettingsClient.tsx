'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OrganizationSwitcher } from '@clerk/nextjs'
import type { MaskedKeys, ServiceId } from '@/lib/types'
import { ServiceIcon } from '@/components/ServiceIcon'

type Props = {
  maskedKeys: MaskedKeys
  connectedCount: number
  totalServices: number
  isOrgContext: boolean
}

type FieldType = 'single' | 'aws' | 'github' | 'datadog' | 'gcp'

type ServiceConfig = {
  id: ServiceId
  label: string
  description: string
  docsUrl: string
  fields: FieldType
}

const SERVICES: ServiceConfig[] = [
  {
    id: 'vercel',
    label: 'Vercel',
    description: 'ホスティング・インフラ費用',
    docsUrl: 'https://vercel.com/account/tokens',
    fields: 'single',
  },
  {
    id: 'aws',
    label: 'AWS',
    description: 'クラウドインフラ費用',
    docsUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials',
    fields: 'aws',
  },
  {
    id: 'resend',
    label: 'Resend',
    description: 'メール送信費用',
    docsUrl: 'https://resend.com/api-keys',
    fields: 'single',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'AI API費用',
    docsUrl: 'https://platform.openai.com/api-keys',
    fields: 'single',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'AI API費用',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    fields: 'single',
  },
  {
    id: 'github',
    label: 'GitHub',
    description: 'Actions・Storage費用',
    docsUrl: 'https://github.com/settings/tokens',
    fields: 'github',
  },
  {
    id: 'datadog',
    label: 'Datadog',
    description: '監視・モニタリング費用',
    docsUrl: 'https://app.datadoghq.com/organization-settings/api-keys',
    fields: 'datadog',
  },
  {
    id: 'gcp',
    label: 'Google Cloud',
    description: 'クラウドインフラ費用',
    docsUrl: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
    fields: 'gcp',
  },
]

const PLACEHOLDERS: Record<string, string> = {
  vercel: 'vercel_xxxxxxxxxxxx',
  resend: 're_xxxxxxxxxxxx',
  openai: 'sk-xxxxxxxxxxxx',
  anthropic: 'sk-ant-xxxxxxxxxxxx',
}

export default function SettingsClient({ maskedKeys, connectedCount, totalServices, isOrgContext }: Props) {
  const router = useRouter()
  const [expandedService, setExpandedService] = useState<ServiceId | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<ServiceId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isConnected = (id: ServiceId) => {
    return !!(maskedKeys as Record<string, unknown>)[id]
  }

  const getMaskedLabel = (id: ServiceId): string => {
    if (id === 'aws') return (maskedKeys.aws?.accessKeyId ?? '')
    if (id === 'github') return maskedKeys.github?.accountName ? `@${maskedKeys.github.accountName}` : ''
    if (id === 'datadog') return maskedKeys.datadog?.apiKey ?? ''
    if (id === 'gcp') return maskedKeys.gcp?.clientEmail ?? ''
    return (maskedKeys as Record<string, string>)[id] ?? ''
  }

  function setField(key: string, value: string) {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(svc: ServiceConfig) {
    setError(null)
    setSuccess(null)
    setLoading(svc.id)

    const body: Record<string, string> = { service: svc.id }

    if (svc.fields === 'aws') {
      body.accessKeyId = formValues[`${svc.id}_accessKeyId`] ?? ''
      body.secretAccessKey = formValues[`${svc.id}_secretAccessKey`] ?? ''
      if (!body.accessKeyId || !body.secretAccessKey) {
        setError('アクセスキーIDとシークレットキーを両方入力してください')
        setLoading(null)
        return
      }
    } else if (svc.fields === 'github') {
      body.token = formValues[`${svc.id}_token`] ?? ''
      body.accountName = formValues[`${svc.id}_accountName`] ?? ''
      body.accountType = formValues[`${svc.id}_accountType`] || 'user'
      if (!body.token || !body.accountName) {
        setError('トークンとアカウント名を入力してください')
        setLoading(null)
        return
      }
    } else if (svc.fields === 'datadog') {
      body.apiKey = formValues[`${svc.id}_apiKey`] ?? ''
      body.appKey = formValues[`${svc.id}_appKey`] ?? ''
      if (!body.apiKey || !body.appKey) {
        setError('APIキーとApplicationキーを両方入力してください')
        setLoading(null)
        return
      }
    } else if (svc.fields === 'gcp') {
      body.clientEmail = formValues[`${svc.id}_clientEmail`] ?? ''
      body.privateKey = formValues[`${svc.id}_privateKey`] ?? ''
      body.projectId = formValues[`${svc.id}_projectId`] ?? ''
      body.billingAccountId = formValues[`${svc.id}_billingAccountId`] ?? ''
      if (!body.clientEmail || !body.privateKey || !body.projectId || !body.billingAccountId) {
        setError('すべての項目を入力してください')
        setLoading(null)
        return
      }
    } else {
      body.value = formValues[svc.id] ?? ''
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
      setSuccess(`${svc.label}のAPIキーを保存しました`)
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
        <div style={{ marginTop: 12 }}>
          <OrganizationSwitcher
            hidePersonal={false}
            afterSelectOrganizationUrl="/settings"
            afterSelectPersonalUrl="/settings"
          />
        </div>
        {isOrgContext && (
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', background: '#f0f4ff', border: '1px solid #c5d0ff', borderRadius: 6, padding: '6px 10px' }}>
            組織のAPIキーを管理しています。同じ組織のメンバーが共有します。
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>接続済みサービス</span>
          <span style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>
            {connectedCount} / {totalServices}
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
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
        <div style={{ background: '#fff5f5', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0faf5', border: '1px solid var(--success)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--success)' }}>
          {success}
        </div>
      )}

      {/* Service Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SERVICES.map((svc) => {
          const connected = isConnected(svc.id)
          const expanded = expandedService === svc.id
          const maskedLabel = getMaskedLabel(svc.id)

          return (
            <div key={svc.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedService(expanded ? null : svc.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <ServiceIcon service={svc.id} size={32} />
                    {connected && (
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: 'var(--success)', border: '1.5px solid var(--surface)' }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 15 }}>{svc.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                      {connected && maskedLabel ? maskedLabel : svc.description}
                    </div>
                  </div>
                </div>
                <span style={{ color: 'var(--subtle)', fontSize: 18, lineHeight: 1 }}>{expanded ? '−' : '+'}</span>
              </button>

              {expanded && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  {/* Fields */}
                  {svc.fields === 'single' && (
                    <div style={{ marginBottom: 14 }}>
                      <label>APIキー</label>
                      <input
                        type="password"
                        placeholder={PLACEHOLDERS[svc.id] ?? ''}
                        value={formValues[svc.id] ?? ''}
                        onChange={(e) => setField(svc.id, e.target.value)}
                      />
                    </div>
                  )}

                  {svc.fields === 'aws' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      <div>
                        <label>アクセスキーID</label>
                        <input type="text" placeholder="AKIAIOSFODNN7EXAMPLE" value={formValues[`${svc.id}_accessKeyId`] ?? ''} onChange={(e) => setField(`${svc.id}_accessKeyId`, e.target.value)} />
                      </div>
                      <div>
                        <label>シークレットアクセスキー</label>
                        <input type="password" placeholder="wJalrXUtnFEMI/K7MDENG/..." value={formValues[`${svc.id}_secretAccessKey`] ?? ''} onChange={(e) => setField(`${svc.id}_secretAccessKey`, e.target.value)} />
                      </div>
                    </div>
                  )}

                  {svc.fields === 'github' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      <div>
                        <label>Personal Access Token</label>
                        <input type="password" placeholder="ghp_xxxxxxxxxxxx" value={formValues[`${svc.id}_token`] ?? ''} onChange={(e) => setField(`${svc.id}_token`, e.target.value)} />
                      </div>
                      <div>
                        <label>アカウント名（ユーザー名 or Organization名）</label>
                        <input type="text" placeholder="myorg" value={formValues[`${svc.id}_accountName`] ?? ''} onChange={(e) => setField(`${svc.id}_accountName`, e.target.value)} />
                      </div>
                      <div>
                        <label>アカウント種別</label>
                        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                          {(['user', 'org'] as const).map((t) => (
                            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', color: 'var(--ink)', marginBottom: 0 }}>
                              <input
                                type="radio"
                                name={`${svc.id}_accountType`}
                                value={t}
                                checked={(formValues[`${svc.id}_accountType`] || 'user') === t}
                                onChange={() => setField(`${svc.id}_accountType`, t)}
                              />
                              {t === 'user' ? '個人' : 'Organization'}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {svc.fields === 'datadog' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      <div>
                        <label>APIキー</label>
                        <input type="password" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={formValues[`${svc.id}_apiKey`] ?? ''} onChange={(e) => setField(`${svc.id}_apiKey`, e.target.value)} />
                      </div>
                      <div>
                        <label>Applicationキー</label>
                        <input type="password" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={formValues[`${svc.id}_appKey`] ?? ''} onChange={(e) => setField(`${svc.id}_appKey`, e.target.value)} />
                      </div>
                    </div>
                  )}

                  {svc.fields === 'gcp' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      <div>
                        <label>サービスアカウントメール</label>
                        <input type="text" placeholder="name@project.iam.gserviceaccount.com" value={formValues[`${svc.id}_clientEmail`] ?? ''} onChange={(e) => setField(`${svc.id}_clientEmail`, e.target.value)} />
                      </div>
                      <div>
                        <label>秘密鍵（Private Key）</label>
                        <textarea
                          placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                          value={formValues[`${svc.id}_privateKey`] ?? ''}
                          onChange={(e) => setField(`${svc.id}_privateKey`, e.target.value)}
                          style={{ width: '100%', minHeight: 80, resize: 'vertical', fontFamily: 'DM Mono, monospace', fontSize: 11 }}
                        />
                      </div>
                      <div>
                        <label>プロジェクトID</label>
                        <input type="text" placeholder="my-project-id" value={formValues[`${svc.id}_projectId`] ?? ''} onChange={(e) => setField(`${svc.id}_projectId`, e.target.value)} />
                      </div>
                      <div>
                        <label>請求アカウントID</label>
                        <input type="text" placeholder="XXXXXX-XXXXXX-XXXXXX" value={formValues[`${svc.id}_billingAccountId`] ?? ''} onChange={(e) => setField(`${svc.id}_billingAccountId`, e.target.value)} />
                      </div>
                    </div>
                  )}

                  {/* Docs link */}
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                    キーの取得先:{' '}
                    <a href={svc.docsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                      {svc.docsUrl}
                    </a>
                  </p>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} disabled={loading === svc.id} onClick={() => handleSave(svc)}>
                      {loading === svc.id ? '保存中...' : connected ? '更新する' : '保存する'}
                    </button>
                    {connected && (
                      <button className="btn btn-danger" style={{ padding: '10px 16px' }} disabled={loading === svc.id} onClick={() => handleDelete(svc.id, svc.label)}>
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
      <div style={{ marginTop: 20, padding: '12px 16px', background: '#fffdf0', border: '1px solid #f0e0a0', borderRadius: 8, fontSize: 12, color: '#7a6a00', lineHeight: 1.6 }}>
        🔒 APIキーは暗号化して保存されます。読み取り専用の権限を持つキーの使用を推奨します。
        AWSは <code>ce:GetCostAndUsage</code>、GitHubは <code>read:org</code> のみ付与してください。
      </div>
    </div>
  )
}
