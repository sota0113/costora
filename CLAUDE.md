# costora

AWS コスト管理アプリケーション。Next.js (App Router) + Clerk 認証 + Vercel デプロイ。

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
    ├── Clerk         認証
    ├── DynamoDB      APIキー管理
    ├── S3            請求書ファイル保存 (costora-invoice)
    └── inference.patrae.net  インボイス解析 (FastAPI + Ollama)
```

## 主要APIルート

| ルート | 用途 |
|---|---|
| `POST /api/parse-invoice` | ファイルをFastAPIに転送しインボイス解析 |
| `GET/POST /api/keys` | APIキー管理（DynamoDB） |
| `GET/POST /api/costs` | コストデータ管理 |

## 環境変数（Vercel）

| 変数名 | 取得方法 |
|---|---|
| `PARSE_API_URL` | `https://inference.patrae.net` |
| `INFERENCE_API_KEY` | `terraform output -raw inference_api_key` (costora-infra) |
| `AWS_ACCESS_KEY_ID` | `terraform output access_key_id` (costora-infra) |
| `AWS_SECRET_ACCESS_KEY` | `terraform output secret_access_key` (costora-infra) |
| `AWS_REGION` | `ap-northeast-1` |
| `NEXT_PUBLIC_CLERK_*` | Clerk ダッシュボードで取得 |

## インボイス解析の仕組み

```
/api/parse-invoice
    ↓ multipart/form-data + X-Api-Key ヘッダー
inference.patrae.net/parse  (FastAPI on EC2)
    ↓ テキスト抽出 (PyMuPDF / openpyxl / mammoth)
Ollama llama3.1:8b
    ↓ JSON スキーマ検証
{ fields: [{ productName, subtotal, expiryDate }] }
```

**対応フォーマット**: PDF, Excel (.xlsx/.xls), Word (.docx/.doc), テキスト  
**非対応**: 画像ファイル（jpg/png/webp）— llama3.1:8b はテキスト専用モデルのため

## インフラ管理

インフラは別リポジトリ `costora-infra` で Terraform 管理。  
EC2・Route53・DynamoDB・S3・IAM はすべてそちらで定義。
