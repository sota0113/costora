export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getStoredKeys } from '@/lib/storage'
import { maskValue } from '@/lib/crypto'
import SettingsClient from './SettingsClient'
import type { MaskedKeys } from '@/lib/types'

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const stored = await getStoredKeys(userId)

  const maskedKeys: MaskedKeys = {}
  if (stored.vercel) maskedKeys.vercel = maskValue(stored.vercel)
  if (stored.aws) {
    try {
      const { accessKeyId } = JSON.parse(stored.aws) as { accessKeyId: string }
      maskedKeys.aws = { accessKeyId: maskValue(accessKeyId) }
    } catch {}
  }
  if (stored.resend) maskedKeys.resend = maskValue(stored.resend)

  const connectedCount = [stored.vercel, stored.aws, stored.resend].filter(Boolean).length

  return <SettingsClient maskedKeys={maskedKeys} connectedCount={connectedCount} totalServices={3} />
}
