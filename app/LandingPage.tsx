'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AuthRedirect from './AuthRedirect'

type Lang = 'ja' | 'en'

const copy = {
  ja: {
    by: 'by patrae',
    open_app: 'サインイン',
    nav_contact: 'お問い合わせ',
    lang_toggle: 'EN',
    hero_eyebrow: 'IT Total Cost of Ownership',
    hero_h1_1: 'ITコスト全体を、',
    hero_h1_2: 'ひとつの画面で。',
    hero_lead:
      'クラウド・SaaS・ライセンス・請求書——散らばったITコストをひとつのダッシュボードに集約。部門別の按分から契約期限の管理まで、組織全体のTCOを可視化します。',
    cta_primary: '無料で始める',
    cta_secondary: '詳しく見る →',
    trust_1: '初回無料',
    trust_2: 'クラウド / SaaS / 請求書 対応',
    trust_3: 'マルチテナント対応',
    feat_eyebrow: 'What costora does',
    feat_title: 'ITコストの「見えない」を、なくす。',
    feat_lead:
      'クラウドの従量課金からソフトウェアライセンス、紙の請求書まで。あらゆるITコストをひとつの場所で把握・管理できます。',
    feat_1_num: '01',
    feat_1_title: 'クラウド・SaaS 連携',
    feat_1_desc:
      'AWS・Google Cloud・Vercel・GitHub・Datadog など主要サービスをAPIで接続。月次コストを自動取得し、サービス別・月次トレンドをリアルタイムで把握できます。',
    feat_1_tags: ['AWS', 'Google Cloud', 'Vercel', 'GitHub', 'Datadog'],
    feat_2_num: '02',
    feat_2_title: '部門別按分 / TCO管理',
    feat_2_desc:
      'タグ・プロジェクト・割合・金額など複数の按分方式に対応。誰がどのコストを持つかをチームで合意し、部門ごとの予算管理と総所有コストの把握を実現します。',
    feat_2_tags: ['タグ按分', 'プロジェクト別', 'コスト責任の明確化'],
    feat_3_num: '03',
    feat_3_title: 'ライセンス・請求書取込',
    feat_3_desc:
      'API連携のないベンダーやソフトウェアライセンスはPDF・Excel・Wordをアップロードするだけ。AIがコスト項目と期限を自動抽出し、手入力の手間をゼロにします。',
    feat_3_tags: ['PDF / Excel / Word', 'AI自動抽出', 'ライセンス期限管理'],
    why_eyebrow: 'Why costora',
    why_title: 'ITコストは、見えてから動ける。',
    why_lead: 'クラウドだけ、SaaSだけを管理しても全体像は見えません。すべてのITコストが揃って初めて、削れる場所が分かります。',
    why_1_title: '毎日自動更新',
    why_1_desc: '毎日 02:00 UTC に全サービスのコストを自動取得。常に最新データで意思決定できます。',
    why_2_title: 'マルチテナント',
    why_2_desc: '組織・個人どちらにも対応。テナントを完全分離し、他組織のデータには到達できません。',
    why_3_title: 'エンドツーエンド暗号化',
    why_3_desc: 'すべての認証情報・コストデータは AES-256-GCM で暗号化してDBに保存。復号はコスト取得時のみ。データが漏洩しても平文では読めません。',
    cta_section_title: 'ITコストの全体像を、今日から把握しよう。',
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
    open_app: 'Sign in',
    nav_contact: 'Contact',
    lang_toggle: 'JA',
    hero_eyebrow: 'IT Total Cost of Ownership',
    hero_h1_1: 'All your IT costs',
    hero_h1_2: 'in one place.',
    hero_lead:
      'Cloud, SaaS, licenses, invoices — aggregate every IT cost into one dashboard. Allocate by department, track contract expiry, and get a clear picture of your organization\'s total cost of ownership.',
    cta_primary: 'Get started free',
    cta_secondary: 'Learn more →',
    trust_1: 'Free to start',
    trust_2: 'Cloud / SaaS / Invoices',
    trust_3: 'Multi-tenant',
    feat_eyebrow: 'What costora does',
    feat_title: 'Make the invisible IT costs visible.',
    feat_lead:
      'From cloud usage fees to software licenses and paper invoices — manage every IT cost in one place.',
    feat_1_num: '01',
    feat_1_title: 'Cloud & SaaS integrations',
    feat_1_desc:
      'Connect AWS, Google Cloud, Vercel, GitHub, Datadog and more via API. Costs are fetched automatically and shown as real-time monthly trends by service.',
    feat_1_tags: ['AWS', 'Google Cloud', 'Vercel', 'GitHub', 'Datadog'],
    feat_2_num: '02',
    feat_2_title: 'Department allocation & TCO',
    feat_2_desc:
      'Allocate costs by tag, project, ratio, or fixed amount. Clarify ownership across teams and get a full view of total IT spend per department.',
    feat_2_tags: ['Tag allocation', 'By project', 'Cost ownership'],
    feat_3_num: '03',
    feat_3_title: 'License & invoice import',
    feat_3_desc:
      'No native integration? Upload a PDF, Excel, or Word invoice. AI extracts cost line items and expiry dates automatically — no manual entry needed.',
    feat_3_tags: ['PDF / Excel / Word', 'AI extraction', 'License expiry tracking'],
    why_eyebrow: 'Why costora',
    why_title: 'You can only cut what you can see.',
    why_lead: 'Managing cloud alone isn\'t enough. Only when all IT costs are in one place can you see where the waste is — and act on it.',
    why_1_title: 'Auto-updated daily',
    why_1_desc: 'Cost data is fetched from all services every day at 02:00 UTC. Always current.',
    why_2_title: 'Multi-tenant',
    why_2_desc: 'Supports personal and org accounts. Tenants are fully isolated — no data leaks between organizations.',
    why_3_title: 'End-to-end encryption',
    why_3_desc: 'All credentials and cost data are encrypted with AES-256-GCM before being stored. Decryption happens only at cost-fetch time — even a database breach exposes nothing readable.',
    cta_section_title: 'See your full IT cost picture — starting today.',
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
      <AuthRedirect />
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
            <a href="https://patrae.vercel.app/#contact" target="_blank" rel="noopener noreferrer" className="lp-nav-link">
              {t.nav_contact}
            </a>
            <Link href="/sign-in" className="lp-btn lp-btn-primary lp-btn-sm">
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
          <div className="lp-chip lp-chip-1">クラウド費用</div>
          <div className="lp-chip lp-chip-2">SaaS料金</div>
          <div className="lp-chip lp-chip-3">ライセンス</div>
          <div className="lp-chip lp-chip-4">請求書PDF</div>
          <div className="lp-deco-center">
            <div className="lp-deco-logo">costora<span className="lp-dot-mark">.</span></div>
            <div className="lp-deco-tagline">IT TCO visibility</div>
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
