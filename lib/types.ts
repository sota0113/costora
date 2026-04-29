export type ServiceType =
  | 'vercel'
  | 'aws'
  | 'resend'
  | 'github'
  | 'datadog'
  | 'anthropic'
  | 'openai'
  | 'gcp'
  | 'invoice'

export type CostItem = {
  id: string
  name: string
  type: ServiceType
  credentials?: string // plain string or JSON string depending on service type
  createdAt: string
}

export type AwsCredentials = {
  accessKeyId: string
  secretAccessKey: string
}

export type GithubCredentials = {
  token: string
  accountName: string
  accountType: 'user' | 'org'
}

export type DatadogCredentials = {
  apiKey: string
  appKey: string
}

export type GcpCredentials = {
  clientEmail: string
  privateKey: string
  projectId: string
  billingAccountId: string
}

export type MonthlyAmount = {
  month: string // "2025-01"
  amount: number
}

export type ServiceCost = {
  itemId: string
  name: string
  type: ServiceType
  currentMonth: number
  previousMonth: number
  history: MonthlyAmount[]
  currency: string
  connected: boolean
  error?: string
}
