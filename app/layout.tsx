export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cost Lens',
  description: 'バイブコーディングサービスのコストをE2Eで可視化',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-in"
      afterSignInUrl="/settings"
      afterSignUpUrl="/settings"
    >
      <html lang="ja">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
