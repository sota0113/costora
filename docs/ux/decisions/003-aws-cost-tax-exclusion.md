# UXDR 003: AWS コスト集計から Tax を除外する

Status: Adopted
Date: 2026-06-29

## 状況

AWS Cost Explorer が返すコストデータには、サービスコストとは独立した `Tax`（消費税）の行項目が含まれる。Costora のダッシュボードに AWS コストを表示した際、Tax が他のサービス（EC2、S3 等）と同列にブレークダウンされ、合計金額に含まれることが判明した。

Tax をそのまま含めるか、除外するかを検討した。

## 決定

AWS の全コストクエリ（月次合計・サービス別・タグ別）において、`RECORD_TYPE = Tax` を除外フィルタとして適用し、表示金額は税抜きの純サービスコストのみとする。

```ts
Filter: {
  Not: {
    Dimensions: { Key: 'RECORD_TYPE', Values: ['Tax'] },
  },
}
```

## 根拠

コスト管理の目的は「どのサービスにいくら使っているか」の把握であり、Tax はその判断に寄与しない。

- 法人の経費管理では税抜きコストをベースに予算・前月比・部門按分を行うのが一般的
- Tax はサービスの使用量・選択とは無関係に発生するため、サービス間のコスト比較を歪める
- AWS Cost Explorer 自体も Tax を `RECORD_TYPE` で分離して管理しており、除外が想定された使い方

## トレードオフ

| 制約 | 影響 | 対応策（将来） |
|---|---|---|
| Tax の金額が画面から見えない | 実際の支払い額（税込）との差が生じる | Tax を別枠で表示するオプション（未実装） |
| Credit・Refund も将来除外が必要になる可能性 | AWS からのクレジット適用時に金額が不一致 | `RECORD_TYPE` フィルタの拡張で対応可能 |

## 関連

- `lib/fetch-service-costs.ts` - `fetchAws` 関数（月次合計）
- `app/api/costs/[itemId]/by-service/route.ts` - サービス別クエリ
- `app/api/costs/[itemId]/grouped/route.ts` - タグ別グループクエリ
