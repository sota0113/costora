export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getCostItems, getDepartments, getSubscription, getCostCache } from '@/lib/storage'
import { buildInvoiceCost } from '@/lib/fetch-service-costs'
import type { ServiceCost } from '@/lib/types'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  const [items, departments, subscription, cache] = await Promise.all([
    getCostItems(userId, orgId),
    getDepartments(userId, orgId),
    getSubscription(userId, orgId),
    getCostCache(userId, orgId),
  ])

  const thisMonthSpend = items.reduce((sum, item) => {
    if (item.type === 'invoice') return sum + buildInvoiceCost(item).currentMonth
    const cached = cache?.[item.id]?.cost as ServiceCost | undefined
    return sum + (cached?.currentMonth ?? 0)
  }, 0)

  return (
    <SettingsClient
      items={items.map(({ credentials: _, ...rest }) => rest)}
      departments={departments}
      isOrgContext={!!orgId}
      subscription={subscription ?? { planId: 'free', updatedAt: '' }}
      thisMonthSpend={thisMonthSpend}
    />
  )
}
