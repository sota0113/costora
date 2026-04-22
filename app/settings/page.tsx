export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getStoredKeys } from '@/lib/storage'
import { maskValue } from '@/lib/crypto'
import SettingsClient from './SettingsClient'
import type { MaskedKeys } from '@/lib/types'

export default async function SettingsPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  const stored = await getStoredKeys(userId, orgId)

  const maskedKeys: MaskedKeys = {}
  if (stored.vercel) maskedKeys.vercel = maskValue(stored.vercel)
  if (stored.aws) {
    try {
      const { accessKeyId } = JSON.parse(stored.aws) as { accessKeyId: string }
      maskedKeys.aws = { accessKeyId: maskValue(accessKeyId) }
    } catch {}
  }
  if (stored.resend) maskedKeys.resend = maskValue(stored.resend)
  if (stored.github) {
    try {
      const { accountName } = JSON.parse(stored.github) as { accountName: string }
      maskedKeys.github = { accountName }
    } catch {}
  }
  if (stored.datadog) {
    try {
      const { apiKey } = JSON.parse(stored.datadog) as { apiKey: string }
      maskedKeys.datadog = { apiKey: maskValue(apiKey) }
    } catch {}
  }
  if (stored.anthropic) maskedKeys.anthropic = maskValue(stored.anthropic)
  if (stored.openai) maskedKeys.openai = maskValue(stored.openai)

  const connectedCount = [
    stored.vercel, stored.aws, stored.resend,
    stored.github, stored.datadog, stored.anthropic, stored.openai,
  ].filter(Boolean).length

  return (
    <SettingsClient
      maskedKeys={maskedKeys}
      connectedCount={connectedCount}
      totalServices={7}
      isOrgContext={!!orgId}
    />
  )
}
