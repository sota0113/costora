# ADR 001: インボイス解析を FastAPI プロキシ経由で行う

**Status**: Adopted  
**Date**: 2026-05

## Context

インボイス解析の変遷:

1. **Amazon Textract** → ap-northeast-1 で利用不可
2. **Amazon Bedrock** (`claude-3-5-sonnet`) → アカウントで利用不可
3. **セルフホスト Ollama** (`llama3.1:8b`) を採用

Ollama の呼び出しを Next.js ルートから直接行う方法と、EC2 上の FastAPI サーバーを経由する方法を検討した。

## Decision

EC2 上の FastAPI サーバーに処理を委譲し、Next.js ルートはシンプルなプロキシとする。

```typescript
// /api/parse-invoice/route.ts
const res = await fetch(`${PARSE_API_URL}/parse`, {
  method: 'POST',
  headers: { 'X-Api-Key': process.env.INFERENCE_API_KEY },
  body: upstream,
})
```

## Consequences

- **ファイル処理の柔軟性**: Python の PyMuPDF・openpyxl・mammoth は Node.js より PDF/Office 文書の処理が優秀
- **関心の分離**: LLM呼び出し・スキーマ検証・リトライロジックがインフラ側に集約され、アプリ側はシンプルに保てる
- **モデル変更が容易**: Ollama → Bedrock への切り替えは FastAPI 側の変更だけで済む
- **レイテンシ**: Vercel → EC2 の追加ホップが発生するが、LLM推論時間（数秒〜数十秒）に対して無視できる
- **依存**: EC2 インスタンスの可用性に依存する。スポットインスタンスの中断時はエラーになる
