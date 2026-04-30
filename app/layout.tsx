export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { jaJP } from '@clerk/localizations'
import { Inter, JetBrains_Mono } from 'next/font/google'
import AppShell from '@/components/AppShell'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
})

const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jb-mono',
})

export const metadata: Metadata = {
  title: 'Costora',
  description: 'IT cost visualization',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={jaJP}
      signInUrl="/sign-in"
      signUpUrl="/sign-in"
      afterSignInUrl="/settings"
      afterSignUpUrl="/settings"
    >
      <html lang="en" className={`${inter.variable} ${jbMono.variable}`}>
        <body>
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ClerkProvider>
  )
}
