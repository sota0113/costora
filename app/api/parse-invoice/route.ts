import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  TextractClient,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
  DetectDocumentTextCommand,
  type Block,
} from '@aws-sdk/client-textract'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

export const runtime = 'nodejs'
export const maxDuration = 120

export type ParsedInvoiceField = {
  productName: string
  subtotal: number | null
  expiryDate: string | null // "YYYY-MM-DD" or null
}

const textract = new TextractClient({ region: process.env.AWS_REGION ?? 'ap-northeast-1' })
const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-northeast-1' })

const BUCKET = process.env.INVOICE_S3_BUCKET ?? ''

async function waitForJob(jobId: string): Promise<Block[]> {
  const blocks: Block[] = []
  let nextToken: string | undefined
  for (let i = 0; i < 60; i++) {
    const res = await textract.send(
      new GetDocumentAnalysisCommand({ JobId: jobId, NextToken: nextToken })
    )
    const status = res.JobStatus
    if (status === 'FAILED') throw new Error('Textract job failed')
    if (status === 'SUCCEEDED') {
      blocks.push(...(res.Blocks ?? []))
      nextToken = res.NextToken
      if (!nextToken) return blocks
      // continue fetching pages
      i = 0
    } else {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  throw new Error('Textract job timed out')
}

function extractTextFromBlocks(blocks: Block[]): string {
  return blocks
    .filter((b) => b.BlockType === 'LINE')
    .map((b) => b.Text ?? '')
    .join('\n')
}

// Best-effort field extraction from raw text
function parseFields(text: string): ParsedInvoiceField[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const results: ParsedInvoiceField[] = []

  // Patterns
  const amountPattern = /[\$¥￥,]?\s*(\d{1,3}(?:[,，]\d{3})*(?:\.\d{1,2})?)/
  const datePattern = /(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/

  const subtotalKeywords = ['subtotal', '小計', '合計', 'total', 'amount due', 'お支払金額', '請求金額']
  const expiryKeywords = ['expir', 'due date', 'valid until', '有効期限', '期限', '満了']

  let foundSubtotal: number | null = null
  let foundExpiry: string | null = null
  let productName = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()

    // Subtotal / total
    if (subtotalKeywords.some((k) => lower.includes(k)) && foundSubtotal === null) {
      const m = (line + ' ' + (lines[i + 1] ?? '')).match(amountPattern)
      if (m) {
        foundSubtotal = parseFloat(m[1].replace(/[,，]/g, ''))
      }
    }

    // Expiry date
    if (expiryKeywords.some((k) => lower.includes(k)) && !foundExpiry) {
      const m = (line + ' ' + (lines[i + 1] ?? '')).match(datePattern)
      if (m) {
        const yyyy = m[1]
        const mm = m[2].padStart(2, '0')
        const dd = m[3].padStart(2, '0')
        foundExpiry = `${yyyy}-${mm}-${dd}`
      }
    }

    // Product name heuristic: first non-trivial line that isn't a number or keyword
    if (!productName && line.length > 2 && !/^\d+$/.test(line) && !lower.includes('invoice') && !lower.includes('請求書')) {
      productName = line
    }
  }

  results.push({ productName, subtotal: foundSubtotal, expiryDate: foundExpiry })
  return results
}

async function parsePdfMultiPage(buffer: Buffer, filename: string): Promise<ParsedInvoiceField[]> {
  if (!BUCKET) throw new Error('INVOICE_S3_BUCKET env var is not set')
  const key = `tmp/${Date.now()}-${filename}`

  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: 'application/pdf' })
  )

  let jobId: string
  try {
    const start = await textract.send(
      new StartDocumentAnalysisCommand({
        DocumentLocation: { S3Object: { Bucket: BUCKET, Name: key } },
        FeatureTypes: ['TABLES', 'FORMS'],
      })
    )
    jobId = start.JobId!
  } catch (e) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    throw e
  }

  let blocks: Block[]
  try {
    blocks = await waitForJob(jobId)
  } finally {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
  }

  const text = extractTextFromBlocks(blocks)
  return parseFields(text)
}

async function parsePdfSinglePage(buffer: Buffer): Promise<ParsedInvoiceField[]> {
  const res = await textract.send(
    new DetectDocumentTextCommand({ Document: { Bytes: buffer } })
  )
  const text = extractTextFromBlocks(res.Blocks ?? [])
  return parseFields(text)
}

async function parseXlsx(buffer: Buffer): Promise<ParsedInvoiceField[]> {
  const { read, utils } = await import('xlsx')
  const wb = read(buffer, { type: 'buffer' })
  const texts: string[] = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    texts.push(utils.sheet_to_csv(ws))
  }
  return parseFields(texts.join('\n'))
}

async function parseDocx(buffer: Buffer): Promise<ParsedInvoiceField[]> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return parseFields(result.value)
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
      // Try multi-page async (requires S3 bucket) — fall back to single-page sync
      if (BUCKET) {
        fields = await parsePdfMultiPage(buffer, file.name)
      } else {
        fields = await parsePdfSinglePage(buffer)
      }
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      fields = await parseXlsx(buffer)
    } else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
      fields = await parseDocx(buffer)
    } else {
      // CSV / plain text
      const text = buffer.toString('utf-8')
      fields = parseFields(text)
    }

    return NextResponse.json({ fields })
  } catch (e) {
    const message = e instanceof Error ? e.message : '解析に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
