'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useUser, OrganizationSwitcher, useClerk } from '@clerk/nextjs'
import Link from 'next/link'
import { I18nProvider, useLang, useT } from '@/lib/i18n'

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9"/>
      <rect x="14" y="3" width="7" height="5"/>
      <rect x="14" y="12" width="7" height="9"/>
      <rect x="3" y="16" width="7" height="5"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()
  const t = useT()
  const { lang, setLang } = useLang()

  if (pathname?.startsWith('/sign-in')) {
    return <>{children}</>
  }

  const firstName = user?.firstName ?? ''
  const lastName = user?.lastName ?? ''
  const initials = ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || '?'
  const displayName = firstName || user?.username || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || t('user_fallback')

  const handleSignOut = () => signOut(() => router.push('/sign-in'))

  const langBtnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--fg)' : 'var(--fg-muted)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 5px',
    borderRadius: 3,
  })

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div className="brand-name">Costora</div>
        </div>

        <div className="nav-section">{t('nav_workspace')}</div>
        <Link href="/dashboard" className={`nav-item${pathname === '/dashboard' ? ' active' : ''}`}>
          <DashboardIcon /> {t('nav_dashboard')}
        </Link>

        <div className="nav-section">{t('nav_admin')}</div>
        <Link href="/settings" className={`nav-item${pathname === '/settings' ? ' active' : ''}`}>
          <SettingsIcon /> {t('nav_settings')}
        </Link>

        <div className="nav-spacer" />

        {/* Organization switcher */}
        <div className="sidebar-org">
          <OrganizationSwitcher
            hidePersonal={false}
            afterSelectOrganizationUrl="/settings"
            afterSelectPersonalUrl="/settings"
            afterCreateOrganizationUrl="/settings"
            appearance={{
              elements: {
                rootBox: { width: '100%' },
                organizationSwitcherTrigger: {
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  fontSize: '12.5px',
                  color: 'var(--fg)',
                  justifyContent: 'flex-start',
                  gap: '8px',
                  minHeight: '34px',
                },
                organizationSwitcherTriggerIcon: { color: 'var(--fg-muted)' },
              },
            }}
          />
        </div>

        {/* Language toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '6px 12px' }}>
          <button style={langBtnStyle(lang === 'ja')} onClick={() => setLang('ja')}>JA</button>
          <span style={{ color: 'var(--border)', fontSize: 11, userSelect: 'none' }}>|</span>
          <button style={langBtnStyle(lang === 'en')} onClick={() => setLang('en')}>EN</button>
        </div>

        {/* User row + sign out */}
        <div className="nav-user">
          <div className="avatar">{initials}</div>
          <div className="avatar-info">
            <div className="avatar-name">{displayName}</div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={handleSignOut}
            title={t('nav_signout')}
            style={{ flexShrink: 0, color: 'var(--fg-muted)' }}
          >
            <LogOutIcon />
          </button>
        </div>
      </aside>

      <main className="main">
        {children}
      </main>
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppShellInner>{children}</AppShellInner>
    </I18nProvider>
  )
}
