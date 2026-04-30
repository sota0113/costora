export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getCostItems } from '@/lib/storage'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const { userId, orgId } = await auth()
  if (!userId) redirect('/sign-in')

  const items = await getCostItems(userId, orgId)
  const activeItems = items.filter((i) => i.type !== 'invoice' && i.credentials)

  if (activeItems.length === 0) redirect('/settings')

  return <DashboardClient itemIds={activeItems.map((i) => i.id)} isOrgContext={!!orgId} />
}
