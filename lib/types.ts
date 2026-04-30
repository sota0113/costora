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

export type Department = {
  id: string
  name: string
  color: string
  createdAt: string
}

export type DeptAllocation = {
  deptId: string
  pct: number // 0–100
}

export type AllocMode = 'ratio' | 'amount' | 'project' | 'team'

export type AmountAllocation = {
  deptId: string
  monthlyAmount: number // fixed $ per month
}

export type ProjectAllocation = {
  projectId: string
  projectName: string
  deptId: string | null
}

export type TeamAllocation = {
  teamId: string
  teamName: string
  deptId: string | null
}

export type VercelTeam = { id: string; name: string; slug: string }
export type VercelProject = { id: string; name: string; teamId?: string | null }

export type VercelDiscovery = {
  teams: VercelTeam[]
  projects: VercelProject[]
  billingHistory?: MonthlyAmount[]
  fetchedAt?: string
}

export type CostItem = {
  id: string
  name: string
  type: ServiceType
  credentials?: string // plain string or JSON string depending on service type
  comment?: string
  deptId?: string              // 100% assigned to this department
  allocations?: DeptAllocation[] // % split across multiple departments
  allocMode?: AllocMode
  amountAllocations?: AmountAllocation[]
  projectAllocations?: ProjectAllocation[]
  teamAllocations?: TeamAllocation[]
  invoiceEntries?: MonthlyAmount[] // for invoice type: manually entered costs
  tagGroupBy?: string          // AWS: group costs by this tag key (e.g. "Department")
  vercelDiscovery?: VercelDiscovery
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
