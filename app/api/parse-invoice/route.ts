import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import AnthropicBedrock from '@anthropic-ai/bedrock-sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages/messages'

export const runtime = 'nodejs'
export const maxDuration = 120

export type ParsedInvoiceField = {
  productName: string
  subtotal: number | null
  expiryDate: string | null // "YYYY-MM-DD" or null
}

const client = new AnthropicBedrock({
  awsRegion: process.env.AWS_REGION ?? 'ap-northeast-1',
  // AWS credentials resolved from env vars (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) automatically
})

const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-opus-4-7'

const SYSTEM_PROMPT = `You are an invoice data extractor. Extract the following fields from the provided invoice and return ONLY valid JSON with no additional text:
{
  "productName": "main product or service name (string, empty string if not found)",
  "subtotal": null or number (the main total/subtotal amount as a plain number without currency symbols),
  "expiryDate": null or "YYYY-MM-DD" (contract expiry, due date, or valid-until date)
}
Rules:
- productName: the primary product/service name, vendor name, or invoice title
- subtotal: prefer "合計", "小計", "請求金額", "Amount Due", "Total" values
- expiryDate: look for "有効期限", "期限", "Due Date", "Expiry", "Valid Until"
- Return ONLY the JSON object, no markdown, no explanation`

function parseBedrockResponse(text: string): ParsedInvoiceField {
  try {
    const parsed = JSON.parse(text.trim())
    return {
      productName: typeof parsed.productName === 'string' ? parsed.productName : '',
      subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : null,
      expiryDate: typeof parsed.expiryDate === 'string' && parsed.expiryDate ? parsed.expiryDate : null,
    }
  } catch {
    return { productName: '', subtotal: null, expiryDate: null }
  }
}

async function invokeWithMessages(messages: MessageParam[]): Promise<ParsedInvoiceField> {
  const res = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages,
  })
  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
  return parseBedrockResponse(text)
}

async function parsePdf(buffer: Buffer): Promise<ParsedInvoiceField> {
  const base64 = buffer.toString('base64')
  return invokeWithMessages([{
    role: 'user',
    content: [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      },
      { type: 'text', text: 'Extract the invoice fields as instructed.' },
    ],
  }])
}

async function parseXlsx(buffer: Buffer): Promise<ParsedInvoiceField> {
  const { read, utils } = await import('xlsx')
  const wb = read(buffer, { type: 'buffer' })
  const texts: string[] = []
  for (const name of wb.SheetNames) {
    texts.push(utils.sheet_to_csv(wb.Sheets[name]))
  }
  return invokeWithMessages([{
    role: 'user',
    content: [{ type: 'text', text: `Invoice contents:\n${texts.join('\n')}\n\nExtract the invoice fields as instructed.` }],
  }])
}

async function parseDocx(buffer: Buffer): Promise<ParsedInvoiceField> {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ buffer })
  return invokeWithMessages([{
    role: 'user',
    content: [{ type: 'text', text: `Invoice contents:\n${value}\n\nExtract the invoice fields as instructed.` }],
  }])
}

async function parseCsvText(buffer: Buffer): Promise<ParsedInvoiceField> {
  const text = buffer.toString('utf-8')
  return invokeWithMessages([{
    role: 'user',
    content: [{ type: 'text', text: `Invoice contents:\n${text}\n\nExtract the invoice fields as instructed.` }],
  }])
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = file.name.toLowerCase()

  try {
    let field: ParsedInvoiceField

    if (filename.endsWith('.pdf')) {
      field = await parsePdf(buffer)
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      field = await parseXlsx(buffer)
    } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      field = await parseDocx(buffer)
    } else {
      field = await parseCsvText(buffer)
    }

    return NextResponse.json({ fields: [field] })
  } catch (e) {
    const message = e instanceof Error ? e.message : '解析に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
