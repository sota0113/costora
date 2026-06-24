# UXDR 002: 請求書メール転送機能の UX 設計

- **Status**: Accepted
- **Date**: 2026-06-24

## 状況

AWS SES を使った請求書メール転送機能を設計した。メールアドレスの発行単位・アイテム作成の要否・画面反映タイミング・失敗時の通知方法について、複数の選択肢を検討した。

## 決定

| 項目 | 決定 |
|---|---|
| メールアドレス発行単位 | コストアイテム単位（`invoice-{itemId}@mail.costora.net`） |
| アイテム事前作成 | 必須（アイテム作成時に自動でメールアドレスが発行される） |
| 画面反映タイミング | 手動リフレッシュ（次回ページロード時） |
| 失敗時のユーザー通知 | なし（現状） |
| 添付ファイルの処理数 | 1通のメールにつき対応拡張子の添付1件のみ処理 |

## 設計詳細

### メールアドレスの発行フロー

1. ユーザーが「請求書（invoice）」タイプのコストアイテムを作成する
2. アイテム作成 API（`POST /api/items`）が `saveEmailAlias(itemId, tenantKey)` を呼び出す
3. DynamoDB `keys` テーブルの `email_aliases` パーティションに `itemId → tenantKey` のマッピングが保存される
4. 発行されたメールアドレス `invoice-{itemId}@mail.costora.net` がアイテムに紐づく

### メール受信・処理フロー

```
送信者 → SES（mail.costora.net 受信）
       → S3（incoming/ プレフィックスに保存）
       → Lambda（s3:ObjectCreated:* トリガー）
       → Vercel Webhook（POST /api/webhook/ses-invoice）
       → DynamoDB lookupEmailAlias(itemId) でテナント特定
       → invoiceEntries に添付ファイルを追加
```

### 添付ファイルの処理条件

- 対応拡張子: `pdf`, `xlsx`, `xls`, `docx`, `doc`
- 1メールにつき対応拡張子の最初の添付1件のみ処理
- 添付なし・非対応拡張子のみのメールは無視される

## 根拠

**コストアイテム単位の採用**:
- 組織単位（1組織1アドレス）にすると、複数の請求書アイテムが混在して振り分けが困難
- アイテム単位にすることで、どのコスト項目の請求書かを自動特定できる
- SES の受信ルール側での振り分けロジックが不要になる

**アイテム事前作成の必須化**:
- `email_aliases` のルックアップに `itemId` が必要なため、アイテムが存在しない場合は Webhook が 404 を返す
- アイテム作成と同時にメールアドレスを発行することで、ユーザーへの追加操作を最小化できる

**手動リフレッシュの採用**:
- WebSocket や SSE によるリアルタイム更新は実装コストが高い
- 請求書の到着頻度は低く（月1〜数回）、即時性の要件が低い

## トレードオフ

| 制約 | 影響 | 対応策（将来） |
|---|---|---|
| アイテム事前作成が必須 | メールアドレスを先にベンダーに伝えられない | アイテム作成前のアドレス予約機能（未実装） |
| 失敗時のユーザー通知なし | メール転送失敗に気づけない | Lambda から SES で送信者に返信（将来対応） |
| リアルタイム更新なし | 請求書到着を手動確認する必要がある | WebSocket / SSE による Push 通知（将来対応） |
| 添付1件のみ | 複数添付メールの2件目以降が無視される | 全添付を処理するループ対応（将来対応） |
| Lambda 失敗時のリトライなし | S3 保存後 Lambda がタイムアウトするとデータ消失リスク | DLQ + 手動再処理フロー（将来対応） |

## 関連

- [ADR 007: SES メール転送](../../adr/007-ses-email-forwarding.md)（costora-infra）
- `app/api/items/route.ts` - アイテム作成時の `saveEmailAlias` 呼び出し
- `app/api/webhook/ses-invoice/route.ts` - Webhook 受信・処理
- `lib/storage.ts` - `saveEmailAlias` / `lookupEmailAlias` / `computeTenantKey`
