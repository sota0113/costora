import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSubscription, saveSubscription } from '@/lib/storage'

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscription = await getSubscription(userId, orgId)
  if (!subscription) return NextResponse.json({ planId: 'free' })

  if (subscription.stripeSubscriptionId && !subscription.currentPeriodEnd) {
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      const sub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
      const ts = sub.items.data[0]?.current_period_end
      const currentPeriodEnd = ts ? new Date(ts * 1000).toISOString().slice(0, 10) : undefined
      const updated = { ...subscription, status: sub.status as import('@/lib/types').SubscriptionStatus, currentPeriodEnd, updatedAt: new Date().toISOString() }
      await saveSubscription(userId, orgId, updated)
      return NextResponse.json(updated)
    } catch {
      // Stripeエラーはサイレントに無視して既存データを返す
    }
  }

  return NextResponse.json(subscription)
}
