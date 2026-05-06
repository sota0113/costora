import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
} from '@aws-sdk/client-bedrock-runtime'

export const runtime = 'nodejs'
export const maxDuration = 120

export type ParsedInvoiceField = {
  productName: string
  subtotal: number | null
  expiryDate: string | null // "YYYY-MM-DD" or null
}

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'ap-northeast-1' })
const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-3-5-sonnet-20241022-v2:0'

const SYSTEM_PROMPT = `You are an invoice data extractor. Extract the following fields from the provided invoice document and return ONLY valid JSON with no additional text:
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

async function invokeBedrockWithContent(content: ContentBlock[]): Promise<ParsedInvoiceField> {
  const cmd = new ConverseCommand({
    modelId: MODEL_ID,
    system: [{ text: SYSTEM_PROMPT }],
    messages: [{ role: 'user', content }],
    inferenceConfig: { maxTokens: 256, temperature: 0 },
  })

  const res = await bedrock.send(cmd)
  const text = res.output?.message?.content
    ?.filter((b): b is { text: string } => 'text' in b)
    .map((b) => b.text)
    .join('') ?? ''

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

async function parsePdf(buffer: Buffer): Promise<ParsedInvoiceField> {
  const content: ContentBlock[] = [
    {
      document: {
        format: 'pdf',
        name: 'invoice',
        source: { bytes: buffer },
      },
    } as ContentBlock,
    { text: 'Extract the invoice fields as instructed.' },
  ]
  return invokeBedrockWithContent(content)
}

async function parseXlsx(buffer: Buffer): Promise<ParsedInvoiceField> {
  const { read, utils } = await import('xlsx')
  const wb = read(buffer, { type: 'buffer' })
  const texts: string[] = []
  for (const sheetName of wb.SheetNames) {
    texts.push(utils.sheet_to_csv(wb.Sheets[sheetName]))
  }
  const content: ContentBlock[] = [{ text: `Invoice contents:\n${texts.join('\n')}\n\nExtract the invoice fields as instructed.` }]
  return invokeBedrockWithContent(content)
}

async function parseDocx(buffer: Buffer): Promise<ParsedInvoiceField> {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ buffer })
  const content: ContentBlock[] = [{ text: `Invoice contents:\n${value}\n\nExtract the invoice fields as instructed.` }]
  return invokeBedrockWithContent(content)
}

async function parseCsvText(buffer: Buffer): Promise<ParsedInvoiceField> {
  const text = buffer.toString('utf-8')
  const content: ContentBlock[] = [{ text: `Invoice contents:\n${text}\n\nExtract the invoice fields as instructed.` }]
  return invokeBedrockWithContent(content)
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
