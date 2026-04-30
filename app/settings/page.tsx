export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getCostItems } from '@/lib/storage'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  const items = await getCostItems(userId, orgId)

  return <SettingsClient items={items.map(({ credentials: _creds, ...rest }) => rest)} isOrgContext={!!orgId} />
}
