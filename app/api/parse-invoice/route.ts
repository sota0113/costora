import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'

export const runtime = 'nodejs'
export const maxDuration = 120

export type ParsedInvoiceField = {
  productName: string
  subtotal: number | null
  expiryDate: string | null // "YYYY-MM-DD" or null
}

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'ap-northeast-1' })
const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? 'anthropic.claude-3-5-sonnet-20241022-v2:0'

const EXTRACT_PROMPT = `このインボイス・請求書から情報を抽出し、以下のJSON形式のみを返してください。余分なテキストは不要です。
{
  "fields": [
    {
      "productName": "商品名またはサービス名",
      "subtotal": 合計金額(数値またはnull),
      "expiryDate": "YYYY-MM-DD形式の有効期限・支払期限(またはnull)"
    }
  ]
}`

type BedrockContentBlock =
  | { text: string }
  | { image: { format: string; source: { bytes: Uint8Array } } }
  | { document: { format: string; name: string; source: { bytes: Uint8Array } } }

async function extractWithBedrock(contentBlocks: BedrockContentBlock[]): Promise<ParsedInvoiceField[]> {
  const response = await bedrock.send(new ConverseCommand({
    modelId: MODEL_ID,
    messages: [{
      role: 'user',
      content: [...contentBlocks, { text: EXTRACT_PROMPT }],
    }],
  }))

  const text = (response.output?.message?.content ?? [])
    .filter((b): b is { text: string } => 'text' in b)
    .map((b) => b.text)
    .join('')

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return []
  try {
    return (JSON.parse(match[0]).fields ?? []) as ParsedInvoiceField[]
  } catch {
    return []
  }
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
    let fields: ParsedInvoiceField[]

    if (filename.endsWith('.pdf')) {
      fields = await extractWithBedrock([{
        document: { format: 'pdf', name: 'invoice', source: { bytes: buffer } },
      }])
    } else if (filename.match(/\.(jpg|jpeg)$/)) {
      fields = await extractWithBedrock([{
        image: { format: 'jpeg', source: { bytes: buffer } },
      }])
    } else if (filename.endsWith('.png')) {
      fields = await extractWithBedrock([{
        image: { format: 'png', source: { bytes: buffer } },
      }])
    } else if (filename.endsWith('.webp')) {
      fields = await extractWithBedrock([{
        image: { format: 'webp', source: { bytes: buffer } },
      }])
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      const { read, utils } = await import('xlsx')
      const wb = read(buffer, { type: 'buffer' })
      const text = wb.SheetNames.map((s) => utils.sheet_to_csv(wb.Sheets[s])).join('\n')
      fields = await extractWithBedrock([{ text }])
    } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      const mammoth = await import('mammoth')
      const { value } = await mammoth.extractRawText({ buffer })
      fields = await extractWithBedrock([{ text: value }])
    } else {
      fields = await extractWithBedrock([{ text: buffer.toString('utf-8') }])
    }

    return NextResponse.json({ fields })
  } catch (e) {
    const message = e instanceof Error ? e.message : '解析に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
