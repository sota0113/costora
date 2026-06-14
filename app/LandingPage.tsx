'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Lang = 'ja' | 'en'

const copy = {
  ja: {
    by: 'by patrae',
    open_app: 'アプリを開く',
    lang_toggle: 'EN',
    hero_eyebrow: 'FinOps for modern teams',
    hero_h1_1: 'クラウドコストを、',
    hero_h1_2: 'ひとつの画面で。',
    hero_lead:
      'AWS・Vercel・GitHub など複数サービスのコストをリアルタイムで集約。部門別の按分まで、チーム全体の FinOps を一元管理します。',
    cta_primary: '無料で始める',
    cta_secondary: '詳しく見る →',
    trust_1: '初回無料',
    trust_2: 'AWS / Vercel / GitHub 対応',
    trust_3: 'マルチテナント対応',
    feat_eyebrow: 'What costora does',
    feat_title: 'ITコストの「見えない」を、なくす。',
    feat_lead:
      'バラバラなダッシュボードを行き来するのをやめ、ひとつの場所でコスト全体を把握・管理できます。',
    feat_1_num: '01',
    feat_1_title: 'マルチサービス可視化',
    feat_1_desc:
      'AWS、Vercel、GitHub、Datadog など主要サービスをAPIで接続。月次コストをひとつのダッシュボードに集約し、サービス別・月次トレンドをリアルタイムで把握できます。',
    feat_1_tags: ['AWS Cost Explorer', 'Vercel', 'GitHub', 'Datadog'],
    feat_2_num: '02',
    feat_2_title: '部門別按分 / FinOps',
    feat_2_desc:
      'タグ・プロジェクト・割合・金額など複数の按分方式に対応。誰がどのコストを持つかをチームで合意し、部門ごとの予算管理を実現します。',
    feat_2_tags: ['タグ按分', 'プロジェクト別', 'コスト責任の明確化'],
    feat_3_num: '03',
    feat_3_title: 'AI請求書取込',
    feat_3_desc:
      'ネイティブ連携のないベンダーはPDF・Excel・Wordをアップロードするだけ。AI がコスト項目を自動抽出し、手入力の手間をゼロにします。',
    feat_3_tags: ['PDF / Excel / Word', 'AI自動抽出', 'カスタムエントリ'],
    why_eyebrow: 'Why costora',
    why_title: 'patrae の FinOps ノウハウを、プロダクトに。',
    why_lead: 'インフラと経営の両軸を持つ patrae が、現場で培ったFinOpsの知見をそのままプロダクトに込めています。',
    why_1_title: '毎日自動更新',
    why_1_desc: 'Cron が毎日 02:00 UTC に全サービスのコストを自動取得。常に最新データを参照できます。',
    why_2_title: 'マルチテナント',
    why_2_desc: '組織・個人どちらにも対応。Clerk 認証でテナントを完全分離、他社データには到達できません。',
    why_3_title: 'セキュアな認証情報管理',
    why_3_desc: 'APIキーは AES-256-GCM で暗号化して保存。コスト取得時のみ復号される設計です。',
    cta_section_title: 'クラウドコストの管理を、今日から変えよう。',
    cta_section_desc: '無料でアカウントを作成し、最初のサービスを接続するまで5分。',
    cta_section_btn: '無料で始める',
    cta_section_link: 'patrae のサービス一覧を見る →',
    footer_service: 'サービス',
    footer_company: 'Company',
    footer_lp: 'costora について',
    footer_app: 'ダッシュボードを開く',
    footer_patrae: 'patrae について',
    footer_blog: 'ブログ',
    footer_contact: 'お問い合わせ',
    footer_copy: '© 2026 patrae Inc.',
    footer_made: 'Made with care in Tokyo',
  },
  en: {
    by: 'by patrae',
    open_app: 'Open App',
    lang_toggle: 'JA',
    hero_eyebrow: 'FinOps for modern teams',
    hero_h1_1: 'All your cloud costs',
    hero_h1_2: 'in one place.',
    hero_lead:
      'Aggregate costs from AWS, Vercel, GitHub and more in real time. Allocate by department, team, or tag — and bring FinOps to your whole team.',
    cta_primary: 'Get started free',
    cta_secondary: 'Learn more →',
    trust_1: 'Free to start',
    trust_2: 'AWS / Vercel / GitHub',
    trust_3: 'Multi-tenant',
    feat_eyebrow: 'What costora does',
    feat_title: 'Make cloud costs visible — and manageable.',
    feat_lead:
      'Stop jumping between dashboards. See all your IT costs in one place and manage them as a team.',
    feat_1_num: '01',
    feat_1_title: 'Multi-service visibility',
    feat_1_desc:
      'Connect AWS, Vercel, GitHub, Datadog and more via API. Aggregate monthly costs into a single dashboard with real-time trends by service.',
    feat_1_tags: ['AWS Cost Explorer', 'Vercel', 'GitHub', 'Datadog'],
    feat_2_num: '02',
    feat_2_title: 'Department allocation / FinOps',
    feat_2_desc:
      'Allocate costs by tag, project, ratio, or fixed amount. Clarify who owns what, and give each team real budget visibility.',
    feat_2_tags: ['Tag allocation', 'By project', 'Cost ownership'],
    feat_3_num: '03',
    feat_3_title: 'AI invoice import',
    feat_3_desc:
      'For vendors without a native integration, just upload a PDF, Excel, or Word file. AI extracts cost line items automatically — no manual entry needed.',
    feat_3_tags: ['PDF / Excel / Word', 'AI extraction', 'Custom entries'],
    why_eyebrow: 'Why costora',
    why_title: "patrae's FinOps expertise, built into a product.",
    why_lead: 'Built by patrae — engineers with deep infrastructure and business experience — costora encodes real-world FinOps knowledge.',
    why_1_title: 'Auto-updated daily',
    why_1_desc: 'A cron job fetches cost data from all services every day at 02:00 UTC. Always current.',
    why_2_title: 'Multi-tenant',
    why_2_desc: 'Supports both personal and org accounts. Clerk authentication fully isolates tenants — no data leaks.',
    why_3_title: 'Secure credential storage',
    why_3_desc: 'API keys are encrypted with AES-256-GCM and only decrypted at cost-fetch time.',
    cta_section_title: 'Start managing your cloud costs today.',
    cta_section_desc: 'Create a free account and connect your first service in under 5 minutes.',
    cta_section_btn: 'Get started free',
    cta_section_link: 'See all patrae services →',
    footer_service: 'Service',
    footer_company: 'Company',
    footer_lp: 'About costora',
    footer_app: 'Open dashboard',
    footer_patrae: 'About patrae',
    footer_blog: 'Blog',
    footer_contact: 'Contact',
    footer_copy: '© 2026 patrae Inc.',
    footer_made: 'Made with care in Tokyo',
  },
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('ja')

  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null
    if (stored === 'en' || stored === 'ja') setLang(stored)
  }, [])

  const toggleLang = () => {
    const next: Lang = lang === 'ja' ? 'en' : 'ja'
    setLang(next)
    localStorage.setItem('lang', next)
  }

  const t = copy[lang]

  return (
    <div className="lp-root">
      {/* ── Header ── */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <Link className="lp-logo" href="/">
            costora<span className="lp-logo-dot" aria-hidden="true">.</span>
            <span className="lp-by">{t.by}</span>
          </Link>
          <nav className="lp-nav">
            <button className="lp-lang-btn" onClick={toggleLang} aria-label="Toggle language">
              {t.lang_toggle}
            </button>
            <Link href="/sign-in" className="lp-btn lp-btn-ghost lp-btn-sm">
              {t.open_app}
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-wrap">
          <div className="lp-hero-eyebrow">{t.hero_eyebrow}</div>
          <h1 className="lp-hero-h1">
            {t.hero_h1_1}<br />
            <span className="lp-mark">{t.hero_h1_2}</span>
          </h1>
          <p className="lp-hero-lead">{t.hero_lead}</p>
          <div className="lp-cta-row">
            <Link href="/sign-in" className="lp-btn lp-btn-primary">
              {t.cta_primary}
              <span className="lp-dot-inline" aria-hidden="true">.</span>
            </Link>
            <a href="#features" className="lp-btn lp-btn-ghost">{t.cta_secondary}</a>
          </div>
          <div className="lp-trust">
            <span>{t.trust_1}</span>
            <span className="lp-trust-sep">·</span>
            <span>{t.trust_2}</span>
            <span className="lp-trust-sep">·</span>
            <span>{t.trust_3}</span>
          </div>
        </div>

        {/* decorative chips */}
        <div className="lp-hero-deco" aria-hidden="true">
          <div className="lp-orbit" />
          <div className="lp-orbit lp-orbit-inner" />
          <div className="lp-chip lp-chip-1">AWS</div>
          <div className="lp-chip lp-chip-2">Vercel</div>
          <div className="lp-chip lp-chip-3">FinOps</div>
          <div className="lp-chip lp-chip-4">部門別</div>
          <div className="lp-deco-center">
            <div className="lp-deco-logo">costora<span className="lp-dot-mark">.</span></div>
            <div className="lp-deco-tagline">cost visibility</div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-section" id="features">
        <div className="lp-wrap">
          <div className="lp-section-eyebrow">{t.feat_eyebrow}</div>
          <h2 className="lp-section-title">{t.feat_title}</h2>
          <p className="lp-section-lead">{t.feat_lead}</p>
          <div className="lp-sol-grid">
            {[
              { num: t.feat_1_num, title: t.feat_1_title, desc: t.feat_1_desc, tags: t.feat_1_tags },
              { num: t.feat_2_num, title: t.feat_2_title, desc: t.feat_2_desc, tags: t.feat_2_tags },
              { num: t.feat_3_num, title: t.feat_3_title, desc: t.feat_3_desc, tags: t.feat_3_tags },
            ].map((f) => (
              <div className="lp-sol-card" key={f.num}>
                <div className="lp-sol-num">{f.num}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <div className="lp-tag-row">
                  {f.tags.map((tag) => (
                    <span className="lp-tag" key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-wrap">
          <div className="lp-section-eyebrow">{t.why_eyebrow}</div>
          <h2 className="lp-section-title">{t.why_title}</h2>
          <p className="lp-section-lead">{t.why_lead}</p>
          <div className="lp-str-grid">
            {[
              { title: t.why_1_title, desc: t.why_1_desc },
              { title: t.why_2_title, desc: t.why_2_desc },
              { title: t.why_3_title, desc: t.why_3_desc },
            ].map((w) => (
              <div className="lp-str-item" key={w.title}>
                <div className="lp-str-marker" aria-hidden="true" />
                <h3>{w.title}</h3>
                <p>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta-section" id="contact">
        <div className="lp-wrap">
          <div className="lp-cta-card">
            <h2>
              {t.cta_section_title.split('、').map((part, i, arr) =>
                i < arr.length - 1
                  ? <span key={i}>{part}、</span>
                  : <span key={i}><span className="lp-mark">{part}</span></span>
              )}
            </h2>
            <p>{t.cta_section_desc}</p>
            <div className="lp-cta-row" style={{ justifyContent: 'center', marginBottom: 0 }}>
              <Link href="/sign-in" className="lp-btn lp-btn-primary">
                {t.cta_section_btn}
                <span className="lp-dot-inline" aria-hidden="true">.</span>
              </Link>
              <a href="https://patrae.vercel.app/#solution" className="lp-btn lp-btn-ghost" target="_blank" rel="noopener noreferrer">
                {t.cta_section_link}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-f-logo">
            <Link className="lp-logo" href="/">
              costora<span className="lp-logo-dot">.</span>
            </Link>
            <div className="lp-f-tagline">by patrae · FinOps for modern teams</div>
          </div>
          <div className="lp-f-cols">
            <div className="lp-f-col">
              <h5>{t.footer_service}</h5>
              <a href="#features">{t.footer_lp}</a>
              <Link href="/sign-in">{t.footer_app}</Link>
            </div>
            <div className="lp-f-col">
              <h5>{t.footer_company}</h5>
              <a href="https://patrae.vercel.app/" target="_blank" rel="noopener noreferrer">{t.footer_patrae}</a>
              <a href="https://patrae.vercel.app/blog" target="_blank" rel="noopener noreferrer">{t.footer_blog}</a>
              <a href="https://patrae.vercel.app/#contact" target="_blank" rel="noopener noreferrer">{t.footer_contact}</a>
            </div>
          </div>
        </div>
        <div className="lp-legal">
          <span>{t.footer_copy}</span>
          <span>{t.footer_made}</span>
        </div>
      </footer>
    </div>
  )
}
