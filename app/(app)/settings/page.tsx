export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getCostItems, getDepartments, getSubscription } from '@/lib/storage'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  const [items, departments, subscription] = await Promise.all([
    getCostItems(userId, orgId),
    getDepartments(userId, orgId),
    getSubscription(userId, orgId),
  ])

  return (
    <SettingsClient
      items={items.map(({ credentials: _, ...rest }) => rest)}
      departments={departments}
      isOrgContext={!!orgId}
      subscription={subscription ?? { planId: 'free', updatedAt: '' }}
    />
  )
}
