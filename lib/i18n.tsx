'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Lang = 'ja' | 'en'

// ── Dictionary ─────────────────────────────────────────────────
const dict: Record<Lang, Record<string, string>> = {
  ja: {
    // AppShell
    nav_workspace: 'ワークスペース',
    nav_dashboard: 'ダッシュボード',
    nav_admin: '管理',
    nav_settings: '設定',
    nav_signout: 'サインアウト',
    user_fallback: 'ユーザー',

    // Sign-in
    signin_tagline: 'コストをひとつの画面で',
    signin_subtitle: 'メールに届くリンクをクリックするだけ',

    // Dashboard
    db_title: 'ダッシュボード',
    db_settings: '設定',
    db_kpi_this_month: '今月の合計',
    db_kpi_avg: '月平均',
    db_kpi_avg_sub: '直近{n}ヶ月',
    db_kpi_errors: 'エラー',
    db_kpi_errors_sub: 'サービスのエラー',
    db_kpi_services: '{n}サービス',
    db_chart_title: '月次ITコスト',
    db_chart_sub_service: 'サービス別積み上げ',
    db_chart_sub_dept: '部門別積み上げ',
    db_view_service: 'サービス別',
    db_view_dept: '部門別',
    db_subtitle_service: '{n}件のサービスの合計ITコスト · {months}ヶ月トレンド',
    db_subtitle_dept: '{n}部門の按分コスト · {months}ヶ月トレンド',
    db_org: '組織',
    db_movers: '変動が大きいサービス',
    db_movers_empty: 'コストデータがまだありません。',
    db_status: 'サービスの状態',
    db_empty_title: 'まだ表示できるデータがありません',
    db_empty_desc: '月次コストのトレンドを見るには、少なくとも1つのサービスを接続してください。',
    db_add_first: '最初のサービスを追加',
    db_unalloc: '未割当',
    db_prev_month: 'prev',

    // Settings – topbar
    st_title: '設定',
    st_tab_services: '連携サービス',
    st_tab_depts: '部門',
    st_add_service: 'サービスを追加',
    st_add_btn: '追加',

    // Settings – services list
    st_svc_title: '連携サービス',
    st_svc_subtitle_empty: '連携サービスがありません。最初のサービスを追加してITコストの追跡を始めましょう。',
    st_svc_subtitle: '{n}件の連携が接続済み',
    st_svc_shared: '組織内で共有',
    st_svc_empty_title: '連携サービスがありません',
    st_svc_empty_desc: 'AWS、Google Cloud、GitHub、Datadogなどをapi認証情報で接続するか、その他のベンダーのカスタム請求書エントリを追加してください。',
    st_svc_add_first: '最初のサービスを追加',
    st_col_service: '連携サービス',
    st_col_status: 'ステータス',
    st_col_dept: '部門',
    st_col_mode: '按分方式',
    st_col_comment: 'コメント',
    st_status_connected: '接続済み',
    st_status_manual: '手動登録',
    st_badge_manual: '手動登録',
    st_badge_native: 'ネイティブ',
    st_alloc_unset: '未設定',
    st_alloc_title: '按分設定',
    st_reconfigure: '再設定',
    st_configure: '設定',
    st_add_cta_title: '別のアカウントやAPI非対応のベンダーを追加しますか？',
    st_add_cta_desc: '同じサービスを複数のアカウントで接続したり、カスタム請求書エントリを追加できます。',

    // Alloc mode labels
    mode_single: '単一部門',
    mode_ratio: '割合',
    mode_amount: '金額',
    mode_tag: 'タグ',
    mode_project: 'プロジェクト',
    mode_team: 'チーム',

    // Alloc summary (table cell)
    alloc_n_depts: '{n}部門',
    alloc_n_projects: '{n}プロジェクト',
    alloc_n_teams: '{n}チーム',
    alloc_n_assigned: '{n}件割当',
    alloc_1_project: '1プロジェクト',
    alloc_1_team: '1チーム',

    // Comment cell
    comment_placeholder: 'コメントを追加…',
    comment_edit_title: 'クリックして編集',

    // Name cell
    name_edit_title: 'クリックして名前を変更',

    // Expiry
    cfg_expires_at: '契約終了日',
    cfg_auto_renew: '自動更新',
    cfg_expires_at_hint: '（任意）契約の終了日を設定します。自動更新の場合はチェックを入れてください。',
    db_expired: '期限切れ',
    db_expires_today: '本日期限',
    db_expires_in: 'あと{n}日',
    db_expires_on: '{date}まで',

    // ConfigForm
    cfg_back: '戻る',
    cfg_display_name: '表示名',
    cfg_display_name_placeholder: '例：{label} – マーケティング部',
    cfg_display_name_hint: '同じサービスを複数のアカウントで接続できます。',
    cfg_docs_prefix: '認証情報の取得先：',
    cfg_delete: '削除',
    cfg_cancel: 'キャンセル',
    cfg_save_changes: '変更を保存',
    cfg_connect: '接続する',
    cfg_invoice_memo: 'メモ',
    cfg_invoice_memo_hint: '請求書エントリに名前を付けてください（例：Acme Hosting – 2026年4月）。コストデータは後から手動で追加できます。',

    // Vercel test button
    vt_testing: '接続テスト中…',
    vt_test: '接続をテスト',
    vt_success: '✓ 接続成功',
    vt_saved: '保存済み',
    vt_projects: '{n} プロジェクト検出',
    vt_teams: '{n} チーム検出',
    vt_billing: '直近の請求: ${amount} ({month})',

    // AddSlideOver
    add_title: 'サービスを追加',
    add_subtitle: 'ネイティブ連携を選択するか、カスタム請求書エントリを追加してください。',
    add_tab_native: 'ネイティブ連携',
    add_tab_custom: 'カスタム / 請求書',
    add_search_placeholder: '連携サービスを検索…',
    add_catalog_configure: '設定',
    add_no_results: '"{q}" に一致する連携が見つかりません。',
    cat_cloud: 'クラウド',
    cat_devtools: '開発ツール',
    cat_ai: 'AI',
    cat_monitoring: 'モニタリング',
    cat_other: 'その他',

    // InvoiceForm
    inv_title: 'カスタムコスト項目を追加',
    inv_desc: 'ネイティブ連携に対応していないベンダーのコストを手動で管理できます。',
    inv_entry_name: 'エントリ名',
    inv_entry_placeholder: '例：Acme Hosting – 2026年4月',
    inv_add: '追加する',
    inv_browse: 'ファイルを選択',
    inv_drop_hint: 'ファイルをドロップ、またはクリックして選択',
    inv_format_hint: '形式：YYYY-MM,金額（例：2025-01,1200）',
    inv_preview: 'プレビュー（{n}件）',
    inv_clear: 'クリア',
    inv_parsing: '解析中...',
    inv_parse_error: '解析エラー：{msg}',
    inv_extracted: '解析結果（編集可能）',
    inv_product_name: 'プロダクト名',
    inv_subtotal: '小計',
    inv_currency: '通貨',
    inv_billing_period: '請求期間',
    inv_billing_month: '計上月',
    inv_expiry_date: '契約終了日',
    inv_auto_renew: '自動更新',
    inv_manual_entry: '手動入力',

    // AllocationPanel
    ap_title: '按分設定 — {name}',
    ap_subtitle: 'コストをどの部門に按分するか設定します。',
    ap_invoice_costs: '月次コスト入力',
    ap_tag_group: 'タグキーで集計',
    ap_tag_group_optional: '任意',
    ap_tag_group_placeholder: '例：Department',
    ap_tag_group_hint: '設定すると、このタグキーの値ごとにコストを分けてダッシュボードに表示します（例：Department → Engineering / Marketing ごとに集計）。',
    ap_alloc_mode: '按分方式',
    ap_single_label: '担当部門',
    ap_single_hint: 'コスト全額を担当する部門を選択します。',
    ap_single_unalloc: '未割当（全額未配分）',
    ap_no_depts: '「部門」タブで部門を作成してから設定できます。',
    ap_ratio_label: '部門配分（割合）',
    ap_ratio_hint: '合計が100%未満の場合、残りは「未割当」として扱われます。',
    ap_ratio_empty: '部門が設定されていません（全額が未割当）',
    ap_ratio_total: '合計',
    ap_ratio_unalloc: '未割当: {pct}%',
    ap_ratio_overflow: '合計が100%を超えています',
    ap_add_dept: '＋ 部門を追加…',
    ap_amount_label: '部門配分（金額）',
    ap_amount_hint: '部門ごとに月次の固定配分金額を設定します。',
    ap_project_label: 'プロジェクト別按分',
    ap_project_hint: 'プロジェクトごとに担当部門を設定します。',
    ap_project_empty: 'プロジェクトが見つかりません。「接続設定」タブで接続テストを実行してください。',
    ap_team_label: 'チーム別按分',
    ap_team_hint: 'チームごとに担当部門を設定します。',
    ap_team_empty: 'チームが見つかりません。「接続設定」タブで接続テストを実行してください。',
    ap_refresh: '更新',
    ap_refreshing: '更新中…',
    ap_tag_label: 'タグ別按分',
    ap_tag_hint: 'AWSタグのキーと値を指定して、担当部門にマップします。',
    ap_tag_key: 'タグキー',
    ap_tag_value_col: 'タグ値',
    ap_tag_dept_col: '部門',
    ap_tag_value_placeholder: '例：Engineering',
    ap_tag_add: '＋ タグ値を追加',
    ap_unalloc_option: '未割当',
    ap_save: '保存',
    ap_cancel: 'キャンセル',

    // ItemSlideOver tabs
    iso_tab_config: '接続設定',
    iso_tab_alloc: '按分設定',

    // DeptManager
    dm_title: '部門',
    dm_subtitle: 'コスト按分先となる部門を管理します。',
    dm_empty_title: '部門がありません',
    dm_empty_desc: '部門を作成すると、サービスのコストを按分して管理できます。',
    dm_col_name: '部門名',
    dm_save: '保存',
    dm_rename_title: '名前を変更',
    dm_delete_title: '削除',
    dm_delete_confirm: '「{name}」を削除しますか？この部門に紐づく按分設定もすべて削除されます。',
    dm_add_title: '部門を追加',
    dm_name_placeholder: '部門名（例：エンジニアリング）',
    dm_add_btn: '追加',

    // Confirm dialogs
    confirm_delete_service: '「{name}」を削除しますか？',

    // Toast / error messages
    toast_added: '{name} を追加しました',
    toast_deleted: '{name} を削除しました',
    toast_updated: '更新しました',
    toast_saved_changes: '変更を保存しました',
    toast_saved_alloc: '按分設定を保存しました',
    toast_add_failed: '追加に失敗しました',
    toast_update_failed: '更新に失敗しました',
    toast_delete_failed: '削除に失敗しました',
    toast_save_failed: '保存に失敗しました',
    toast_connect_failed: '接続テストに失敗しました',
  },

  en: {
    // AppShell
    nav_workspace: 'Workspace',
    nav_dashboard: 'Dashboard',
    nav_admin: 'Admin',
    nav_settings: 'Settings',
    nav_signout: 'Sign out',
    user_fallback: 'User',

    // Sign-in
    signin_tagline: 'All your IT costs in one place',
    signin_subtitle: 'Just click the link in your email',

    // Dashboard
    db_title: 'Dashboard',
    db_settings: 'Settings',
    db_kpi_this_month: 'This Month',
    db_kpi_avg: 'Monthly Avg',
    db_kpi_avg_sub: 'Last {n} months',
    db_kpi_errors: 'Errors',
    db_kpi_errors_sub: 'service errors',
    db_kpi_services: '{n} services',
    db_chart_title: 'Monthly IT Cost',
    db_chart_sub_service: 'Stacked by service',
    db_chart_sub_dept: 'Stacked by department',
    db_view_service: 'By Service',
    db_view_dept: 'By Dept',
    db_subtitle_service: '{n} services · {months}mo trend',
    db_subtitle_dept: '{n} dept breakdown · {months}mo trend',
    db_org: 'Org',
    db_movers: 'Top Movers',
    db_movers_empty: 'No cost data yet.',
    db_status: 'Service Status',
    db_empty_title: 'No data to display yet',
    db_empty_desc: 'Connect at least one service to see monthly cost trends.',
    db_add_first: 'Add your first service',
    db_unalloc: 'Unallocated',
    db_prev_month: 'prev',

    // Settings – topbar
    st_title: 'Settings',
    st_tab_services: 'Integrations',
    st_tab_depts: 'Departments',
    st_add_service: 'Add Service',
    st_add_btn: 'Add',

    // Settings – services list
    st_svc_title: 'Integrations',
    st_svc_subtitle_empty: 'No integrations yet. Add your first service to start tracking IT costs.',
    st_svc_subtitle: '{n} integration(s) connected',
    st_svc_shared: 'Shared across org',
    st_svc_empty_title: 'No integrations',
    st_svc_empty_desc: 'Connect AWS, Google Cloud, GitHub, Datadog and more with API credentials, or add custom invoice entries for other vendors.',
    st_svc_add_first: 'Add your first service',
    st_col_service: 'Integration',
    st_col_status: 'Status',
    st_col_dept: 'Department',
    st_col_mode: 'Alloc Mode',
    st_col_comment: 'Comment',
    st_status_connected: 'Connected',
    st_status_manual: 'Manual',
    st_badge_manual: 'Manual',
    st_badge_native: 'Native',
    st_alloc_unset: 'Not set',
    st_alloc_title: 'Allocation',
    st_reconfigure: 'Reconfigure',
    st_configure: 'Configure',
    st_add_cta_title: 'Add another account or unsupported vendor?',
    st_add_cta_desc: 'Connect the same service under multiple accounts, or add custom invoice entries.',

    // Alloc mode labels
    mode_single: 'Single Dept',
    mode_ratio: 'Ratio',
    mode_amount: 'Amount',
    mode_tag: 'Tag',
    mode_project: 'Project',
    mode_team: 'Team',

    // Alloc summary (table cell)
    alloc_n_depts: '{n} depts',
    alloc_n_projects: '{n} projects',
    alloc_n_teams: '{n} teams',
    alloc_n_assigned: '{n} assigned',
    alloc_1_project: '1 project',
    alloc_1_team: '1 team',

    // Comment cell
    comment_placeholder: 'Add a comment…',
    comment_edit_title: 'Click to edit',

    // Name cell
    name_edit_title: 'Click to rename',

    // Expiry
    cfg_expires_at: 'Contract End Date',
    cfg_auto_renew: 'Auto-renewal',
    cfg_expires_at_hint: '(Optional) Set the contract end date. Check "Auto-renewal" if the contract renews automatically.',
    db_expired: 'Expired',
    db_expires_today: 'Expires today',
    db_expires_in: '{n} days left',
    db_expires_on: 'Until {date}',

    // ConfigForm
    cfg_back: 'Back',
    cfg_display_name: 'Display Name',
    cfg_display_name_placeholder: 'e.g. {label} – Marketing',
    cfg_display_name_hint: 'You can connect the same service under multiple accounts.',
    cfg_docs_prefix: 'Find your credentials at:',
    cfg_delete: 'Delete',
    cfg_cancel: 'Cancel',
    cfg_save_changes: 'Save Changes',
    cfg_connect: 'Connect',
    cfg_invoice_memo: 'Note',
    cfg_invoice_memo_hint: 'Give this entry a name (e.g. Acme Hosting – April 2026). You can add cost data manually later.',

    // Vercel test button
    vt_testing: 'Testing…',
    vt_test: 'Test Connection',
    vt_success: '✓ Connected',
    vt_saved: 'saved',
    vt_projects: '{n} projects found',
    vt_teams: '{n} teams found',
    vt_billing: 'Latest billing: ${amount} ({month})',

    // AddSlideOver
    add_title: 'Add Service',
    add_subtitle: 'Choose a native integration or add a custom invoice entry.',
    add_tab_native: 'Native Integrations',
    add_tab_custom: 'Custom / Invoice',
    add_search_placeholder: 'Search integrations…',
    add_catalog_configure: 'Set up',
    add_no_results: 'No integrations match "{q}".',
    cat_cloud: 'Cloud',
    cat_devtools: 'Dev Tools',
    cat_ai: 'AI',
    cat_monitoring: 'Monitoring',
    cat_other: 'Other',

    // InvoiceForm
    inv_title: 'Add Custom Cost Entry',
    inv_desc: 'Manually manage costs for vendors without a native integration.',
    inv_entry_name: 'Entry Name',
    inv_entry_placeholder: 'e.g. Acme Hosting – April 2026',
    inv_add: 'Add',
    inv_browse: 'Browse',
    inv_drop_hint: 'Drop a file or click to browse',
    inv_format_hint: 'Format: YYYY-MM,amount (e.g. 2025-01,1200)',
    inv_preview: 'Preview ({n} rows)',
    inv_clear: 'Clear',
    inv_parsing: 'Parsing...',
    inv_parse_error: 'Parse error: {msg}',
    inv_extracted: 'Extracted fields (editable)',
    inv_product_name: 'Product name',
    inv_subtotal: 'Subtotal',
    inv_currency: 'Currency',
    inv_billing_period: 'Billing period',
    inv_billing_month: 'Month',
    inv_expiry_date: 'Contract End Date',
    inv_auto_renew: 'Auto-renewal',
    inv_manual_entry: 'Enter manually',

    // AllocationPanel
    ap_title: 'Allocation — {name}',
    ap_subtitle: 'Configure how this cost is allocated to departments.',
    ap_invoice_costs: 'Monthly Cost Entry',
    ap_tag_group: 'Group by Tag Key',
    ap_tag_group_optional: 'Optional',
    ap_tag_group_placeholder: 'e.g. Department',
    ap_tag_group_hint: 'When set, costs are broken down by each value of this tag key in the dashboard (e.g. Department → Engineering / Marketing).',
    ap_alloc_mode: 'Allocation Mode',
    ap_single_label: 'Responsible Department',
    ap_single_hint: 'Select the department that owns this entire cost.',
    ap_single_unalloc: 'Unallocated (entire cost unassigned)',
    ap_no_depts: 'Create departments under the "Departments" tab first.',
    ap_ratio_label: 'Dept Allocation (Ratio)',
    ap_ratio_hint: 'Any remainder below 100% is treated as unallocated.',
    ap_ratio_empty: 'No departments set (entire cost unallocated)',
    ap_ratio_total: 'Total',
    ap_ratio_unalloc: 'Unallocated: {pct}%',
    ap_ratio_overflow: 'Total exceeds 100%',
    ap_add_dept: '+ Add department…',
    ap_amount_label: 'Dept Allocation (Amount)',
    ap_amount_hint: 'Set a fixed monthly amount per department.',
    ap_project_label: 'Allocate by Project',
    ap_project_hint: 'Assign each project to a department.',
    ap_project_empty: 'No projects found. Run a connection test under the "Connection" tab.',
    ap_team_label: 'Allocate by Team',
    ap_team_hint: 'Assign each team to a department.',
    ap_team_empty: 'No teams found. Run a connection test under the "Connection" tab.',
    ap_refresh: 'Refresh',
    ap_refreshing: 'Refreshing…',
    ap_tag_label: 'Allocate by Tag',
    ap_tag_hint: 'Specify AWS tag key/value pairs and map them to departments.',
    ap_tag_key: 'Tag Key',
    ap_tag_value_col: 'Tag Value',
    ap_tag_dept_col: 'Department',
    ap_tag_value_placeholder: 'e.g. Engineering',
    ap_tag_add: '+ Add Tag Value',
    ap_unalloc_option: 'Unallocated',
    ap_save: 'Save',
    ap_cancel: 'Cancel',

    // ItemSlideOver tabs
    iso_tab_config: 'Connection',
    iso_tab_alloc: 'Allocation',

    // DeptManager
    dm_title: 'Departments',
    dm_subtitle: 'Manage departments for cost allocation.',
    dm_empty_title: 'No departments',
    dm_empty_desc: 'Create departments to allocate service costs across your org.',
    dm_col_name: 'Department Name',
    dm_save: 'Save',
    dm_rename_title: 'Rename',
    dm_delete_title: 'Delete',
    dm_delete_confirm: 'Delete "{name}"? All allocation settings linked to this department will also be removed.',
    dm_add_title: 'Add Department',
    dm_name_placeholder: 'Department name (e.g. Engineering)',
    dm_add_btn: 'Add',

    // Confirm dialogs
    confirm_delete_service: 'Delete "{name}"?',

    // Toast / error messages
    toast_added: 'Added {name}',
    toast_deleted: 'Deleted {name}',
    toast_updated: 'Updated',
    toast_saved_changes: 'Changes saved',
    toast_saved_alloc: 'Allocation settings saved',
    toast_add_failed: 'Failed to add',
    toast_update_failed: 'Failed to update',
    toast_delete_failed: 'Failed to delete',
    toast_save_failed: 'Failed to save',
    toast_connect_failed: 'Connection test failed',
  },
}

// ── Context ────────────────────────────────────────────────────
const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'ja',
  setLang: () => {},
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ja')

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null
    if (stored === 'en' || stored === 'ja') setLangState(stored)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  return (
    <I18nContext.Provider value={{ lang, setLang }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useLang() {
  return useContext(I18nContext)
}

export function useT() {
  const { lang } = useContext(I18nContext)
  return (key: string, params?: Record<string, string | number>): string => {
    let str = dict[lang]?.[key] ?? dict.ja[key] ?? key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      })
    }
    return str
  }
}
