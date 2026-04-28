export type ServiceId = 'vercel' | 'aws' | 'resend' | 'github' | 'datadog' | 'anthropic' | 'openai' | 'gcp'

export type AwsKeys = {
  accessKeyId: string
  secretAccessKey: string
}

export type GithubKeys = {
  token: string
  accountName: string
  accountType: 'user' | 'org'
}

export type DatadogKeys = {
  apiKey: string
  appKey: string
}

export type GcpKeys = {
  clientEmail: string
  privateKey: string
  projectId: string
  billingAccountId: string
}

export type StoredKeys = {
  vercel?: string
  aws?: string // JSON-encoded AwsKeys
  resend?: string
  github?: string // JSON-encoded GithubKeys
  datadog?: string // JSON-encoded DatadogKeys
  anthropic?: string
  openai?: string
  gcp?: string // JSON-encoded GcpKeys
}

export type MaskedKeys = {
  vercel?: string
  aws?: { accessKeyId: string }
  resend?: string
  github?: { accountName: string }
  datadog?: { apiKey: string }
  anthropic?: string
  openai?: string
  gcp?: { clientEmail: string }
}

export type MonthlyAmount = {
  month: string // "2025-01"
  amount: number
}

export type ServiceCost = {
  service: ServiceId
  displayName: string
  currentMonth: number
  previousMonth: number
  history: MonthlyAmount[]
  currency: string
  connected: boolean
  error?: string
}

export type DashboardData = {
  services: ServiceCost[]
  totalCurrentMonth: number
  totalPreviousMonth: number
  history: MonthlyAmount[]
}
