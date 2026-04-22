export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getStoredKeys } from '@/lib/storage'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  const stored = await getStoredKeys(userId, orgId)
  const connectedServices = [
    stored.vercel ? 'vercel' : null,
    stored.aws ? 'aws' : null,
    stored.resend ? 'resend' : null,
    stored.github ? 'github' : null,
    stored.datadog ? 'datadog' : null,
    stored.anthropic ? 'anthropic' : null,
    stored.openai ? 'openai' : null,
  ].filter(Boolean) as string[]

  if (connectedServices.length === 0) {
    redirect('/settings')
  }

  return <DashboardClient connectedServices={connectedServices} isOrgContext={!!orgId} />
}
