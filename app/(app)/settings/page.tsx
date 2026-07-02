export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getCostItems, getDepartments, getSubscription, saveSubscription, getCostCache } from '@/lib/storage'
import { buildInvoiceCost } from '@/lib/fetch-service-costs'
import type { ServiceCost, SubscriptionStatus } from '@/lib/types'
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

  if (subscription?.stripeSubscriptionId && !subscription.currentPeriodEnd) {
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      const sub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
      const ts = sub.items.data[0]?.current_period_end
      const currentPeriodEnd = ts ? new Date(ts * 1000).toISOString().slice(0, 10) : undefined
      const enriched = { ...subscription, status: sub.status as SubscriptionStatus, currentPeriodEnd, updatedAt: new Date().toISOString() }
      await saveSubscription(userId, orgId, enriched)
      Object.assign(subscription, enriched)
    } catch (e) {
      console.error('Stripe subscription backfill failed:', e)
    }
  }

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
