export type ServiceId = 'vercel' | 'aws' | 'resend'

export type AwsKeys = {
  accessKeyId: string
  secretAccessKey: string
}

export type StoredKeys = {
  vercel?: string
  aws?: string // JSON-encoded AwsKeys, encrypted
  resend?: string
}

export type MaskedKeys = {
  vercel?: string // last 4 chars
  aws?: { accessKeyId: string } // masked access key id
  resend?: string // last 4 chars
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
