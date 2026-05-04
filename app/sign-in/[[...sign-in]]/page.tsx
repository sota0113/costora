'use client'

import { SignIn } from '@clerk/nextjs'
import { useT } from '@/lib/i18n'

export default function SignInPage() {
  const t = useT()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        background: 'var(--bg)',
      }}
    >
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Costora
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: 8,
          }}
        >
          {t('signin_tagline')}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          {t('signin_subtitle')}
        </p>
      </div>

      <SignIn
        appearance={{
          layout: {
            logoPlacement: 'none',
          },
          variables: {
            colorPrimary: '#1a1a1a',
            colorBackground: '#ffffff',
            colorInputBackground: '#fafafa',
            colorInputText: '#1a1a1a',
            colorTextSecondary: '#888888',
            borderRadius: '8px',
            fontFamily: 'DM Sans, system-ui, sans-serif',
            fontSize: '15px',
          },
          elements: {
            card: {
              boxShadow: 'none',
              border: '1px solid #ececec',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '440px',
            },
            formButtonPrimary: {
              backgroundColor: '#1a1a1a',
              fontSize: '14px',
              fontWeight: '500',
            },
          },
        }}
      />
    </div>
  )
}
