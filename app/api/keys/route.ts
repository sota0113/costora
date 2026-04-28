import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getStoredKeys, saveKey, removeKey } from '@/lib/storage'
import { maskValue } from '@/lib/crypto'
import type { ServiceId } from '@/lib/types'

const VALID_SERVICES: ServiceId[] = ['vercel', 'aws', 'resend', 'github', 'datadog', 'anthropic', 'openai', 'gcp']

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stored = await getStoredKeys(userId, orgId)
  const masked: Record<string, unknown> = {}

  if (stored.vercel) masked.vercel = maskValue(stored.vercel)
  if (stored.aws) {
    try {
      const { accessKeyId } = JSON.parse(stored.aws) as { accessKeyId: string }
      masked.aws = { accessKeyId: maskValue(accessKeyId) }
    } catch {}
  }
  if (stored.resend) masked.resend = maskValue(stored.resend)
  if (stored.github) {
    try {
      const { accountName } = JSON.parse(stored.github) as { accountName: string }
      masked.github = { accountName }
    } catch {}
  }
  if (stored.datadog) {
    try {
      const { apiKey } = JSON.parse(stored.datadog) as { apiKey: string }
      masked.datadog = { apiKey: maskValue(apiKey) }
    } catch {}
  }
  if (stored.anthropic) masked.anthropic = maskValue(stored.anthropic)
  if (stored.openai) masked.openai = maskValue(stored.openai)
  if (stored.gcp) {
    try {
      const { clientEmail } = JSON.parse(stored.gcp) as { clientEmail: string }
      masked.gcp = { clientEmail }
    } catch {}
  }

  return NextResponse.json(masked)
}

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { service } = body

  if (!VALID_SERVICES.includes(service)) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
  }

  if (service === 'aws') {
    const { accessKeyId, secretAccessKey } = body as { accessKeyId: string; secretAccessKey: string }
    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({ error: 'Missing AWS credentials' }, { status: 400 })
    }
    await saveKey(userId, orgId, 'aws', JSON.stringify({ accessKeyId, secretAccessKey }))
  } else if (service === 'github') {
    const { token, accountName, accountType } = body as {
      token: string; accountName: string; accountType: string
    }
    if (!token || !accountName) {
      return NextResponse.json({ error: 'Missing GitHub credentials' }, { status: 400 })
    }
    await saveKey(userId, orgId, 'github', JSON.stringify({
      token,
      accountName,
      accountType: accountType === 'org' ? 'org' : 'user',
    }))
  } else if (service === 'datadog') {
    const { apiKey, appKey } = body as { apiKey: string; appKey: string }
    if (!apiKey || !appKey) {
      return NextResponse.json({ error: 'Missing Datadog credentials' }, { status: 400 })
    }
    await saveKey(userId, orgId, 'datadog', JSON.stringify({ apiKey, appKey }))
  } else if (service === 'gcp') {
    const { clientEmail, privateKey, projectId, billingAccountId } = body as {
      clientEmail: string; privateKey: string; projectId: string; billingAccountId: string
    }
    if (!clientEmail || !privateKey || !projectId || !billingAccountId) {
      return NextResponse.json({ error: 'Missing GCP credentials' }, { status: 400 })
    }
    await saveKey(userId, orgId, 'gcp', JSON.stringify({ clientEmail, privateKey, projectId, billingAccountId }))
  } else {
    const { value } = body as { value: string }
    if (!value) return NextResponse.json({ error: 'Missing key value' }, { status: 400 })
    await saveKey(userId, orgId, service, value)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { userId, orgId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = req.nextUrl.searchParams.get('service') as ServiceId
  if (!VALID_SERVICES.includes(service)) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
  }

  await removeKey(userId, orgId, service)
  return NextResponse.json({ ok: true })
}
