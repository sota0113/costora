import type { ServiceType } from './types'

export type CredentialField = {
  key: string
  label: { ja: string; en: string }
  type: 'text' | 'password' | 'textarea'
  placeholder: string
}

export type ServiceDef = {
  type: ServiceType
  label: string
  description: { ja: string; en: string }
  docsUrl: string
  fields: CredentialField[]
}

export const SERVICE_CATALOG: ServiceDef[] = [
  {
    type: 'vercel',
    label: 'Vercel',
    description: { ja: 'ホスティング・インフラ費用', en: 'Hosting & infrastructure costs' },
    docsUrl: 'https://vercel.com/account/tokens',
    fields: [
      { key: 'value', label: { ja: 'APIトークン', en: 'API Token' }, type: 'password', placeholder: 'vercel_xxxxxxxxxxxx' },
    ],
  },
  {
    type: 'aws',
    label: 'AWS',
    description: { ja: 'クラウドインフラ費用', en: 'Cloud infrastructure costs' },
    docsUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials',
    fields: [
      { key: 'accessKeyId', label: { ja: 'アクセスキーID', en: 'Access Key ID' }, type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
      { key: 'secretAccessKey', label: { ja: 'シークレットアクセスキー', en: 'Secret Access Key' }, type: 'password', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
    ],
  },
  {
    type: 'anthropic',
    label: 'Anthropic',
    description: { ja: 'AI API費用', en: 'AI API costs' },
    docsUrl: 'https://console.anthropic.com/settings/keys',
    fields: [
      { key: 'value', label: { ja: 'APIキー', en: 'API Key' }, type: 'password', placeholder: 'sk-ant-xxxxxxxxxxxx' },
    ],
  },
  {
    type: 'openai',
    label: 'OpenAI',
    description: { ja: 'AI API費用', en: 'AI API costs' },
    docsUrl: 'https://platform.openai.com/api-keys',
    fields: [
      { key: 'value', label: { ja: 'APIキー', en: 'API Key' }, type: 'password', placeholder: 'sk-xxxxxxxxxxxx' },
    ],
  },
  {
    type: 'resend',
    label: 'Resend',
    description: { ja: 'メール送信費用', en: 'Email delivery costs' },
    docsUrl: 'https://resend.com/api-keys',
    fields: [
      { key: 'value', label: { ja: 'APIキー', en: 'API Key' }, type: 'password', placeholder: 're_xxxxxxxxxxxx' },
    ],
  },
  {
    type: 'github',
    label: 'GitHub',
    description: { ja: 'Actions・Storage費用', en: 'Actions & Storage costs' },
    docsUrl: 'https://github.com/settings/tokens',
    fields: [
      { key: 'token', label: { ja: 'Personal Access Token', en: 'Personal Access Token' }, type: 'password', placeholder: 'ghp_xxxxxxxxxxxx' },
      { key: 'accountName', label: { ja: 'アカウント名', en: 'Account Name' }, type: 'text', placeholder: 'myorg' },
      { key: 'accountType', label: { ja: 'アカウント種別 (user / org)', en: 'Account Type (user / org)' }, type: 'text', placeholder: 'org' },
    ],
  },
  {
    type: 'datadog',
    label: 'Datadog',
    description: { ja: '監視・モニタリング費用', en: 'Monitoring costs' },
    docsUrl: 'https://app.datadoghq.com/organization-settings/api-keys',
    fields: [
      { key: 'apiKey', label: { ja: 'APIキー', en: 'API Key' }, type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'appKey', label: { ja: 'Applicationキー', en: 'Application Key' }, type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    ],
  },
  {
    type: 'gcp',
    label: 'Google Cloud',
    description: { ja: 'クラウドインフラ費用', en: 'Cloud infrastructure costs' },
    docsUrl: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
    fields: [
      { key: 'clientEmail', label: { ja: 'サービスアカウントメール', en: 'Service Account Email' }, type: 'text', placeholder: 'name@project.iam.gserviceaccount.com' },
      { key: 'privateKey', label: { ja: '秘密鍵（Private Key）', en: 'Private Key' }, type: 'textarea', placeholder: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----' },
      { key: 'projectId', label: { ja: 'プロジェクトID', en: 'Project ID' }, type: 'text', placeholder: 'my-project-id' },
      { key: 'billingAccountId', label: { ja: '請求アカウントID', en: 'Billing Account ID' }, type: 'text', placeholder: 'XXXXXX-XXXXXX-XXXXXX' },
    ],
  },
  {
    type: 'invoice',
    label: 'PDFインボイス',
    description: { ja: '請求書を手動アップロード', en: 'Manually managed billing' },
    docsUrl: '',
    fields: [],
  },
]

export function getServiceDef(type: ServiceType): ServiceDef | undefined {
  return SERVICE_CATALOG.find((s) => s.type === type)
}

export function isSingleField(type: ServiceType): boolean {
  const def = getServiceDef(type)
  return (def?.fields.length ?? 0) === 1 && def?.fields[0].key === 'value'
}

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
