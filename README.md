# Costora

ITコストを一画面で管理するコスト可観測性ツール。

AWS・Vercel・GitHub・Datadog などのクラウドサービスのコストを自動収集し、部門別に按分・可視化します。

**本番環境**: https://costora.vercel.app/

## 機能

- **マルチサービス対応** — AWS, Vercel, GCP, GitHub, Datadog, Anthropic, OpenAI, Resend
- **部門別按分** — 割合・金額・AWSタグ・Vercelプロジェクト・GitHubチームによる按分
- **請求書インポート** — PDF/Excel/Word をアップロードしてコストを自動抽出
- **マルチテナント** — Clerk 組織単位でデータを分離
- **日英対応** — UI を日本語/英語で切り替え可能

## 技術スタック

| 役割 | 技術 |
|---|---|
| フレームワーク | Next.js 15 (App Router) |
| 認証 | Clerk |
| データ永続化 | DynamoDB（本番）/ ローカルJSON（開発） |
| インフラ | Vercel + AWS |
| 請求書解析 | FastAPI + Ollama (EC2) |

## 環境変数

| 変数名 | 説明 |
|---|---|
| `ENCRYPTION_KEY` | 64桁16進数（AES-256-GCM 認証情報暗号化用） |
| `AWS_REGION` | DynamoDB リージョン（例: `ap-northeast-1`） |
| `DYNAMODB_TABLE_NAME` | DynamoDB テーブル名 |
| `CRON_SECRET` | Vercel Cron 認証トークン |
| `PARSE_API_URL` | 請求書解析APIのURL（例: `https://inference.patrae.net`） |
| `INFERENCE_API_KEY` | 請求書解析API キー |
| `NEXT_PUBLIC_CLERK_*` | Clerk ダッシュボードで取得 |

`DYNAMODB_TABLE_NAME` が未設定の場合、`.data/store.json` をローカルストレージとして使用します。

## ローカル開発

```bash
npm install
cp .env.example .env.local  # 環境変数を設定
npm run dev
```

## インフラ

EC2・Route53・DynamoDB・S3・IAM は別リポジトリ `costora-infra` で Terraform 管理。
