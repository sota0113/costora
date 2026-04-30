export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getCostItems, getDepartments } from '@/lib/storage'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  const [items, departments] = await Promise.all([
    getCostItems(userId, orgId),
    getDepartments(userId, orgId),
  ])

  const activeItems = items.filter((i) => {
    if (i.type === 'invoice') return (i.invoiceEntries?.length ?? 0) > 0
    return !!i.credentials
  })

  if (activeItems.length === 0) redirect('/settings')

  const itemMeta = activeItems.map(({ credentials: _, ...rest }) => rest)

  return (
    <DashboardClient
      itemIds={activeItems.map((i) => i.id)}
      isOrgContext={!!orgId}
      departments={departments}
      itemMeta={itemMeta}
    />
  )
}
