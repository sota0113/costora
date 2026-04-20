import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getStoredKeys, saveKey, removeKey } from '@/lib/storage'
import { maskValue } from '@/lib/crypto'
import type { ServiceId } from '@/lib/types'

const VALID_SERVICES: ServiceId[] = ['vercel', 'aws', 'resend']

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stored = await getStoredKeys(userId)
  const masked: Record<string, unknown> = {}

  if (stored.vercel) masked.vercel = maskValue(stored.vercel)
  if (stored.aws) {
    try {
      const { accessKeyId } = JSON.parse(stored.aws) as { accessKeyId: string }
      masked.aws = { accessKeyId: maskValue(accessKeyId) }
    } catch {}
  }
  if (stored.resend) masked.resend = maskValue(stored.resend)

  return NextResponse.json(masked)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
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
    await saveKey(userId, 'aws', JSON.stringify({ accessKeyId, secretAccessKey }))
  } else {
    const { value } = body as { value: string }
    if (!value) return NextResponse.json({ error: 'Missing key value' }, { status: 400 })
    await saveKey(userId, service, value)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = req.nextUrl.searchParams.get('service') as ServiceId
  if (!VALID_SERVICES.includes(service)) {
    return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
  }

  await removeKey(userId, service)
  return NextResponse.json({ ok: true })
}
