import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 120

export type ParsedInvoiceField = {
  productName: string
  subtotal: number | null
  expiryDate: string | null // "YYYY-MM-DD" or null
}

const PARSE_API_URL = process.env.PARSE_API_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.INFERENCE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'INFERENCE_API_KEY is not configured' }, { status: 500 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  try {
    const upstream = new FormData()
    upstream.append('file', file)

    const res = await fetch(`${PARSE_API_URL}/parse`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: upstream,
      signal: AbortSignal.timeout(90_000),
    })

    if (!res.ok) {
      const detail = await res.text()
      return NextResponse.json({ error: detail }, { status: res.status })
    }

    return NextResponse.json(await res.json())
  } catch (e) {
    const message = e instanceof Error ? e.message : '解析に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
