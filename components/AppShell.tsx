'use client'

import { usePathname } from 'next/navigation'
import { useUser, useOrganization } from '@clerk/nextjs'
import Link from 'next/link'

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

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useUser()
  const { organization } = useOrganization()

  if (pathname?.startsWith('/sign-in')) {
    return <>{children}</>
  }

  const firstName = user?.firstName ?? ''
  const lastName = user?.lastName ?? ''
  const initials = ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || '?'
  const orgName = organization?.name ?? (user?.primaryEmailAddress?.emailAddress?.split('@')[1] ?? 'Personal')

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div className="brand-name">Costora</div>
        </div>

        <div className="nav-section">Workspace</div>
        <Link href="/dashboard" className={`nav-item${pathname === '/dashboard' ? ' active' : ''}`}>
          <DashboardIcon /> Dashboard
        </Link>

        <div className="nav-section">Admin</div>
        <Link href="/settings" className={`nav-item${pathname === '/settings' ? ' active' : ''}`}>
          <SettingsIcon /> Settings
        </Link>

        <div className="nav-spacer" />
        <div className="nav-user">
          <div className="avatar">{initials}</div>
          <div className="avatar-info">
            <div className="avatar-name">{firstName || user?.username || 'User'}</div>
            <div className="avatar-org">{orgName}</div>
          </div>
        </div>
      </aside>

      <main className="main">
        {children}
      </main>
    </div>
  )
}
