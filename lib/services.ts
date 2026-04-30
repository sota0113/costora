import type { ServiceType } from './types'

export type CredentialField = {
  key: string
  label: string
  type: 'text' | 'password' | 'textarea'
  placeholder: string
}

export type ServiceDef = {
  type: ServiceType
  label: string
  description: string
  docsUrl: string
  fields: CredentialField[]
}

export const SERVICE_CATALOG: ServiceDef[] = [
  {
    type: 'vercel',
    label: 'Vercel',
    description: 'ホスティング・インフラ費用',
    docsUrl: 'https://vercel.com/account/tokens',
    fields: [
      { key: 'value', label: 'APIトークン', type: 'password', placeholder: 'vercel_xxxxxxxxxxxx' },
    ],
  },
  {
    type: 'aws',
    label: 'AWS',
    description: 'クラウドインフラ費用',
    docsUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials',
    fields: [
      { key: 'accessKeyId', label: 'アクセスキーID', type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
      { key: 'secretAccessKey', label: 'シークレットアクセスキー', type: 'password', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
    ],
  },
  {
    type: 'anthropic',
    label: 'Anthropic',
    description: 'AI API費用',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    fields: [
      { key: 'value', label: 'APIキー', type: 'password', placeholder: 'sk-ant-xxxxxxxxxxxx' },
    ],
  },
  {
    type: 'openai',
    label: 'OpenAI',
    description: 'AI API費用',
    docsUrl: 'https://platform.openai.com/api-keys',
    fields: [
      { key: 'value', label: 'APIキー', type: 'password', placeholder: 'sk-xxxxxxxxxxxx' },
    ],
  },
  {
    type: 'resend',
    label: 'Resend',
    description: 'メール送信費用',
    docsUrl: 'https://resend.com/api-keys',
    fields: [
      { key: 'value', label: 'APIキー', type: 'password', placeholder: 're_xxxxxxxxxxxx' },
    ],
  },
  {
    type: 'github',
    label: 'GitHub',
    description: 'Actions・Storage費用',
    docsUrl: 'https://github.com/settings/tokens',
    fields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_xxxxxxxxxxxx' },
      { key: 'accountName', label: 'アカウント名', type: 'text', placeholder: 'myorg' },
      { key: 'accountType', label: 'アカウント種別 (user / org)', type: 'text', placeholder: 'org' },
    ],
  },
  {
    type: 'datadog',
    label: 'Datadog',
    description: '監視・モニタリング費用',
    docsUrl: 'https://app.datadoghq.com/organization-settings/api-keys',
    fields: [
      { key: 'apiKey', label: 'APIキー', type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'appKey', label: 'Applicationキー', type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    ],
  },
  {
    type: 'gcp',
    label: 'Google Cloud',
    description: 'クラウドインフラ費用',
    docsUrl: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
    fields: [
      { key: 'clientEmail', label: 'サービスアカウントメール', type: 'text', placeholder: 'name@project.iam.gserviceaccount.com' },
      { key: 'privateKey', label: '秘密鍵（Private Key）', type: 'textarea', placeholder: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----' },
      { key: 'projectId', label: 'プロジェクトID', type: 'text', placeholder: 'my-project-id' },
      { key: 'billingAccountId', label: '請求アカウントID', type: 'text', placeholder: 'XXXXXX-XXXXXX-XXXXXX' },
    ],
  },
  {
    type: 'invoice',
    label: 'PDFインボイス',
    description: '請求書を手動アップロード',
    docsUrl: '',
    fields: [],
  },
]

export function getServiceDef(type: ServiceType): ServiceDef | undefined {
  return SERVICE_CATALOG.find((s) => s.type === type)
}

// single-field services store credential as a plain string
export function isSingleField(type: ServiceType): boolean {
  const def = getServiceDef(type)
  return (def?.fields.length ?? 0) === 1 && def?.fields[0].key === 'value'
}

// multi-field services store credentials as JSON string
export function buildCredentials(type: ServiceType, values: Record<string, string>): string {
  if (isSingleField(type)) return values.value ?? ''
  return JSON.stringify(values)
}

export function parseCredentials(type: ServiceType, credentials: string): Record<string, string> {
  if (isSingleField(type)) return { value: credentials }
  try {
    return JSON.parse(credentials) as Record<string, string>
  } catch {
    return {}
  }
}
