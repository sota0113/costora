'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { jaJP, enUS } from '@clerk/localizations'
import { I18nProvider, useLang } from '@/lib/i18n'

function ClerkWrapper({ children }: { children: React.ReactNode }) {
  const { lang } = useLang()
  return (
    <ClerkProvider
      localization={lang === 'en' ? enUS : jaJP}
      signInUrl="/sign-in"
      signUpUrl="/sign-in"
      afterSignInUrl="/settings"
      afterSignUpUrl="/settings"
    >
      {children}
    </ClerkProvider>
  )
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ClerkWrapper>{children}</ClerkWrapper>
    </I18nProvider>
  )
}
