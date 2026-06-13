# costora

AWS コスト管理アプリケーション。Next.js 15 (App Router) + Clerk 認証 + Vercel デプロイ。

## 主要な意思決定

詳細は `docs/adr/` を参照。変更時は関連ADRを確認・更新すること。

| 決定 | 結論 | ADR |
|---|---|---|
| インボイス解析 | FastAPI プロキシ経由（Python の文書処理ライブラリが優秀） | [ADR 001](docs/adr/001-fastapi-inference-proxy.md) |

## アーキテクチャ概要

```
ブラウザ
    ↓
Vercel (Next.js App Router)
    ├── Clerk             認証・マルチテナント（組織/個人）
    ├── DynamoDB          コストアイテム・部門・コストキャッシュ
    └── inference.patrae.net  インボイス解析 (FastAPI + Ollama)
```

### マルチテナント

すべてのデータは `tenantKey = orgId ? "org:${orgId}:keys" : "user:${userId}:keys"` でスコープされ、DynamoDB の PK として使用される。Clerk JWT からテナントキーを生成するため、他テナントのデータには到達できない。

### 認証情報の暗号化

APIキー等の認証情報は `lib/crypto.ts` の AES-256-GCM で暗号化してDynamoDBに保存。コスト取得時のみ復号される。`ENCRYPTION_KEY` は64桁16進数。

### コストキャッシュ

各アイテムのコストデータは23時間キャッシュ。Vercel Cron（毎日02:00 UTC）が全テナントのキャッシュを一括更新する（`/api/cron/fetch-costs`）。

## 主要ファイル

| ファイル | 役割 |
|---|---|
| `lib/types.ts` | コアドメインモデル（`CostItem`, `Department`, 按分モード） |
| `lib/storage.ts` | データ永続化（DynamoDB / ローカルJSON の抽象化） |
| `lib/fetch-service-costs.ts` | サービスごとのコスト取得ロジック |
| `lib/services.ts` | サービスカタログ・認証情報スキーマ定義 |
| `lib/crypto.ts` | AES-256-GCM 暗号化・復号 |
| `lib/i18n.tsx` | 日英 i18n（`useT()` フック） |
| `components/AppShell.tsx` | サイドバー・認証・言語切り替えを含むレイアウト |
| `app/dashboard/DashboardClient.tsx` | KPI・チャート・部門別按分の描画 |
| `app/settings/SettingsClient.tsx` | サービス追加・按分設定・部門管理 |

## 主要 API ルート

| ルート | 用途 |
|---|---|
| `GET/POST /api/items` | コストアイテム一覧・作成 |
| `PATCH/DELETE /api/items/[id]` | アイテム更新・削除 |
| `GET /api/costs/[itemId]` | コスト取得（キャッシュあり） |
| `GET /api/costs/[itemId]/grouped` | AWSタグ別コスト集計 |
| `GET/POST /api/departments` | 部門一覧・作成 |
| `POST /api/parse-invoice` | 請求書ファイル解析（FastAPIへプロキシ） |
| `GET /api/cron/fetch-costs` | 全テナントのコストキャッシュ更新（Cron用） |

## 環境変数

| 変数名 | 取得方法 |
|---|---|
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `PARSE_API_URL` | `https://inference.patrae.net` |
| `INFERENCE_API_KEY` | `terraform output -raw inference_api_key` (costora-infra) |
| `AWS_ACCESS_KEY_ID` | `terraform output access_key_id` (costora-infra) |
| `AWS_SECRET_ACCESS_KEY` | `terraform output secret_access_key` (costora-infra) |
| `AWS_REGION` | `ap-northeast-1` |
| `DYNAMODB_TABLE_NAME` | Terraform で作成したテーブル名 |
| `CRON_SECRET` | 任意のランダム文字列 |
| `NEXT_PUBLIC_CLERK_*` | Clerk ダッシュボード |

## 按分モード

`CostItem.allocMode` で指定。`tag` モードは AWS Cost Explorer の `GroupBy TAG` を利用するため、対象タグキーを AWS Billing > Cost Allocation Tags で有効化する必要がある。

| モード | 説明 |
|---|---|
| `single` | 1部門に全額 |
| `ratio` | 部門ごとに割合指定 |
| `amount` | 部門ごとに月次固定金額 |
| `tag` | AWSタグ値→部門のマッピング |
| `project` | Vercel プロジェクト→部門 |
| `team` | GitHub チーム→部門 |

## インボイス解析

```
/api/parse-invoice
    ↓ multipart/form-data + X-Api-Key ヘッダー
inference.patrae.net/parse  (FastAPI on EC2)
    ↓ テキスト抽出 (PyMuPDF / openpyxl / mammoth)
Ollama llama3.1:8b
    ↓ JSON スキーマ検証
{ fields: [{ productName, subtotal, expiryDate }] }
```

対応フォーマット: PDF, Excel (.xlsx/.xls), Word (.docx/.doc)
非対応: 画像ファイル（llama3.1:8b はテキスト専用モデル）

## インフラ管理

インフラは別リポジトリ `costora-infra` で Terraform 管理。
EC2・Route53・DynamoDB・S3・IAM はすべてそちらで定義。
