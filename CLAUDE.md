# costora

クラウド・SaaS・ライセンス・請求書を含む IT 総所有コスト（TCO）可視化ツール。Next.js 15 (App Router) + Clerk 認証 + Vercel デプロイ。

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
    ├── / (LP)            未ログイン向けランディングページ（Clerk 非依存・静的SSR）
    ├── Clerk             認証・マルチテナント（組織/個人）
    ├── DynamoDB          コストアイテム・部門・コストキャッシュ・emailAlias
    ├── Stripe            サブスクリプション課金
    └── inference.costora.net  インボイス解析 (FastAPI + Ollama)
```

### ルート構成

| パス | レイアウト | 認証 |
|---|---|---|
| `/` | なし（LP） | 不要。ログイン済みならクライアント側で `/dashboard` にリダイレクト |
| `/sign-in` | なし | 不要 |
| `/dashboard`, `/settings` | `app/(app)/layout.tsx`（AppShell） | Clerk ミドルウェアで保護 |

### メール転送による請求書自動取り込み

```
メール転送 → invoice-{itemId}@mail.costora.net
    ↓ SES (us-east-1) → S3 → Lambda
    ↓ POST /api/webhook/ses-invoice
Vercel → FastAPI /parse → DynamoDB invoiceEntries 更新
```

転送先アドレスは Settings 画面の各 invoice アイテムに表示される。

### マルチテナント

すべてのデータは `tenantKey = orgId ? "org:${orgId}:keys" : "user:${userId}:keys"` でスコープされ、DynamoDB の PK として使用される。Clerk JWT からテナントキーを生成するため、他テナントのデータには到達できない。

**ユーザー数管理**: ユーザーは必ず1つの Clerk Organization に属する形で利用する。ユーザー数制限はその Organization のメンバー数で制御する。

### 認証情報の暗号化

APIキー等の認証情報は `lib/crypto.ts` の AES-256-GCM で暗号化してDynamoDBに保存。コスト取得時のみ復号される。`ENCRYPTION_KEY` は64桁16進数。

### コストキャッシュ

各アイテムのコストデータは23時間キャッシュ。Vercel Cron（毎日02:00 UTC）が全テナントのキャッシュを一括更新する（`/api/cron/fetch-costs`）。

### 管理ITスペンド上限

料金プランごとの管理ITスペンド上限（$1万/$5万/$20万）は、Costoraダッシュボードの集計値（全コストアイテムの当月合計）を使って判定する。

## 主要ファイル

| ファイル | 役割 |
|---|---|
| `lib/types.ts` | コアドメインモデル（`CostItem`, `Department`, 按分モード）。主要フィールド：`credentials`（暗号化済み）, `allocMode`, `allocations`, `tagAllocations`, `invoiceEntries`, `color`（表示色 hex）, `currency`（請求書通貨）, `expiresAt`（契約終了日 YYYY-MM-DD）, `autoRenew`（自動更新フラグ） |
| `lib/storage.ts` | データ永続化（DynamoDB / ローカルJSON の抽象化）。`saveEmailAlias` / `deleteEmailAlias` / `lookupEmailAlias` も含む |
| `lib/fetch-service-costs.ts` | サービスごとのコスト取得ロジック |
| `lib/services.ts` | サービスカタログ・認証情報スキーマ定義 |
| `lib/crypto.ts` | AES-256-GCM 暗号化・復号 |
| `lib/i18n.tsx` | 日英 i18n（`useT()` フック） |
| `components/Providers.tsx` | `I18nProvider` + `ClerkProvider` をルートレイアウトに提供 |
| `components/AppShell.tsx` | サイドバー・言語切り替えを含むアプリレイアウト（`app/(app)/` 配下のみ） |
| `app/LandingPage.tsx` | LP クライアントコンポーネント（日英切り替え・Clerk 非依存） |
| `app/AuthRedirect.tsx` | LP 上でログイン済みユーザーを `/dashboard` にリダイレクト |
| `app/(app)/dashboard/DashboardClient.tsx` | KPI・チャート・部門別按分の描画 |
| `app/(app)/settings/SettingsClient.tsx` | サービス追加・按分設定・部門管理 |

## 主要 API ルート

| ルート | 用途 |
|---|---|
| `GET/POST /api/items` | コストアイテム一覧・作成 |
| `PATCH/DELETE /api/items/[id]` | アイテム更新・削除 |
| `GET /api/costs/[itemId]` | コスト取得（23時間キャッシュ） |
| `GET /api/costs/[itemId]/grouped` | AWSタグ別コスト集計 |
| `GET /api/costs/[itemId]/by-service` | AWSサービス別コスト集計 |
| `GET/POST /api/departments` | 部門一覧・作成 |
| `PATCH/DELETE /api/departments/[id]` | 部門更新・削除 |
| `POST /api/parse-invoice` | 請求書ファイル解析（FastAPIへプロキシ） |
| `POST /api/webhook/ses-invoice` | SESメール受信Webhook（メール転送による請求書取込） |
| `POST /api/test/vercel` | Vercel接続テスト（プロジェクト・チーム・請求履歴取得） |
| `GET /api/cron/fetch-costs` | 全テナントのコストキャッシュ更新（Cron用） |

## 環境変数

| 変数名 | 取得方法 |
|---|---|
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `PARSE_API_URL` | `https://inference.costora.net` |
| `INFERENCE_API_KEY` | `terraform output -raw inference_api_key` (costora-infra) |
| `SES_WEBHOOK_SECRET` | `terraform output -raw ses_webhook_secret` (costora-infra) |
| `AWS_ACCESS_KEY_ID` | `terraform output access_key_id` (costora-infra) |
| `AWS_SECRET_ACCESS_KEY` | `terraform output secret_access_key` (costora-infra) |
| `AWS_REGION` | `ap-northeast-1` |
| `DYNAMODB_TABLE_NAME` | Terraform で作成したテーブル名 |
| `CRON_SECRET` | 任意のランダム文字列 |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk ダッシュボード |
| `CLERK_SECRET_KEY` | Clerk ダッシュボード |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/settings` |
| `STRIPE_SECRET_KEY` | Stripe ダッシュボード（本番: `sk_live_...` / テスト: `sk_test_...`） |
| `STRIPE_PUBLISHABLE_KEY` | Stripe ダッシュボード（本番: `pk_live_...` / テスト: `pk_test_...`） |
| `STRIPE_WEBHOOK_SECRET` | Stripe ダッシュボード > Webhooks（`whsec_...`） |

`DYNAMODB_TABLE_NAME` が未設定の場合、`.data/store.json` をローカルストレージとして使用。

## 按分モード

`CostItem.allocMode` で指定。`tag` モードは AWS Cost Explorer の `GroupBy TAG` を利用するため、対象タグキーを AWS Billing > Cost Allocation Tags で有効化する必要がある。

| モード | 説明 | 主な設定フィールド |
|---|---|---|
| `single` | 1部門に全額 | `deptId` |
| `ratio` | 部門ごとに割合指定 | `allocations[].pct` |
| `amount` | 部門ごとに月次固定金額 | `amountAllocations[].monthlyAmount` |
| `tag` | AWSタグ値→部門マッピング | `tagAllocations[].tagValue / deptId` |
| `project` | Vercelプロジェクト→部門 | `projectAllocations[].projectId / deptId` |
| `team` | Vercelチーム→部門 | `teamAllocations[].teamId / deptId` |

## インボイス解析

```
/api/parse-invoice
    ↓ multipart/form-data + X-Api-Key ヘッダー
inference.costora.net/parse  (FastAPI on EC2)
    ↓ テキスト抽出 (PyMuPDF / openpyxl / mammoth)
Ollama llama3.1:8b
    ↓ JSON スキーマ検証
{ fields: [{ productName, subtotal, expiryDate, currency, billingPeriodStart, billingPeriodEnd, autoRenew }] }
```

対応フォーマット: PDF, Excel (.xlsx/.xls), Word (.docx/.doc)
非対応: 画像ファイル（llama3.1:8b はテキスト専用モデル）

## メール転送による請求書自動取込

請求書が添付されたメールをコストアイテム専用アドレスに転送するだけで自動取込される機能。

### アーキテクチャ

```
AWS SES（mail.costora.net でメール受信）
    ↓ S3 に raw email 保存
Lambda
    ↓ X-Webhook-Secret ヘッダー付きで POST
/api/webhook/ses-invoice（Next.js）
    ↓ emailAlias テーブルで To アドレス → テナント解決
inference.costora.net/parse（FastAPI）
    ↓
invoiceEntries に追記
```

### メールアドレス設計

- アイテムごとに専用アドレスを発行: `invoice-{itemId}@mail.costora.net`
- To アドレスからアイテムIDとテナントを自動解決（単一受信箱ではない）
- Settings 画面の按分設定パネルにアドレスを表示・コピーできる

### DynamoDB emailAlias パターン

既存の `costora-{env}` テーブル内に格納:

```
{ tenantKey: "email_aliases", service: itemId, value: actualTenantKey }
```

関連関数（`lib/storage.ts`）:
- `saveEmailAlias(itemId, tenantKey)` — アイテム作成時に登録
- `deleteEmailAlias(itemId)` — アイテム削除時に削除
- `lookupEmailAlias(itemId)` — Webhook でテナント解決

### 現在の制限（Phase 1 ロードマップ）

- 添付ファイルは先頭1件のみ処理（複数添付は未対応）
- 解析失敗時のユーザー通知なし（Resend 連携は未実装）
- SPF/DKIM 検証は SES 側で実施（アプリ内での追加検証なし）

## 収益モデル

### 料金モデルの方針

**管理ITスペンド連動の階段型固定サブスク**を採用。
「使う量に比例する」納得感を保ちつつ、固定料金で予測可能にする。

競合（Apptio・CloudZero・Finout）はすべてクラウドスペンドのみを対象とするが、
Costoraは**クラウド＋SaaS＋外注費＋ライセンスを含む全ITスペンド**を対象とし、守備範囲で差別化する。

### プラン一覧

| プラン | 月額 | 管理ITスペンド上限 | ユーザー数 | トライアル |
|---|---|---|---|---|
| **Free** | $0 | $1万/月まで | 1人（個人利用向け） | なし |
| **Starter** | $49 | $5万/月まで | 3人まで | 14日間無料 |
| **Growth** | $149 | $20万/月まで | 無制限 | 14日間無料 |
| **Scale** | 要相談 / Custom | 無制限 | 無制限 | 要相談 |

> 端数価格（Charm Pricing）を採用。$50/$150ではなく$49/$149にすることで知覚上のカテゴリを一段下げる。

### 機能別プラン対応表

| 機能 | Free | Starter | Growth | Scale |
|---|---|---|---|---|
| 14日間無料トライアル | — | ✅ | ✅ | — |
| 連携サービス数 | 3件まで | 無制限 | 無制限 | 無制限 |
| ファイルアップロード（PDF/Excel/Word） | ✅ | ✅ | ✅ | ✅ |
| 部門管理・按分（6方式） | ✅ | ✅ | ✅ | ✅ |
| メール転送による請求書自動取込 | ❌ | ✅ | ✅ | ✅ |
| コスト履歴 | 直近3ヶ月 | 無制限 | 無制限 | 無制限 |
| しきい値アラート | ❌ | ✅ | ✅ | ✅ |
| サポート | コミュニティ | メール | 優先メール | カスタム連携・SLA |

### Stripe設定

- **決済基盤**: Stripe（サンドボックス設定済み）
- **Starterプロダクト**: `prod_Uj7iZU8V4jL0sk`（$49/月、トライアル14日設定済み）
- **Growthプロダクト**: $149/月（作成・トライアル14日設定が必要）
- **支払い方式**: Prebuilt checkout form（Stripe Checkout）
- **Checkout統合**: 別issueで実装。完了までLPのCTAボタンは `/sign-in` に遷移

### Freeプランの設計思想

**フック**（価値体験）と**壁**（アップグレード動機）の両立が目的。

- 部門・按分はCostoraの差別化機能のため**Free でもフル開放**（価値を伝える前に制限しない）
- 連携3件はバイブコーダーの典型スタック（Vercel / AWS / Anthropic）でちょうど使い切れる設計
- 履歴3ヶ月は時間が自然にアップグレード動機を生む（押しつけがましくない）
- Freeは1ユーザー（個人利用向け）。組織での試用はStarterの14日間トライアルを案内する

アップグレードが起きる5つのシナリオ:

```
① 「GCPも追加したい」            → 連携3件の壁 → Starter へ
② 「毎月手動アップロードが面倒」   → 転送なしの壁 → Starter へ
③ 「去年と比べたい」（3ヶ月後）   → 履歴の壁 → Starter へ
④ 「CFOにも見せたい」            → 1ユーザーの壁 → Starter へ
⑤ 「会社が成長してITコストが増加」 → スペンド上限の壁 → Growth へ
```

### 目標MRRシミュレーション

目標：**$1,000 MRR**（Starter換算で約20社）

| フェーズ | 社数 | 内訳 | MRR |
|---|---|---|---|
| 初期（〜3ヶ月） | 5社 | Free 3 + Starter 2 | $98 |
| 成長（〜6ヶ月） | 15社 | Free 5 + Starter 8 + Growth 2 | $690 |
| 目標（〜12ヶ月） | 25社 | Free 5 + Starter 12 + Growth 5 | $1,333 |

## インフラ管理

インフラは別リポジトリ `costora-infra` で Terraform 管理。
EC2・Route53・DynamoDB・S3・IAM・SES・Lambda はすべてそちらで定義。
