import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  saveStripeCustomerTenant,
  lookupTenantByStripeCustomer,
  saveSubscriptionByTenantKey,
} from '@/lib/storage'
import type { SubscriptionStatus } from '@/lib/types'

export const runtime = 'nodejs'

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'trialing': return 'trialing'
    case 'active': return 'active'
    case 'past_due': return 'past_due'
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired': return 'canceled'
    default: return 'incomplete'
  }
}

function periodEndOf(subscription: Stripe.Subscription): string | undefined {
  const ts = subscription.items.data[0]?.current_period_end
  return ts ? new Date(ts * 1000).toISOString().slice(0, 10) : undefined
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!secret || !stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  const rawBody = await req.text()
  const stripe = new Stripe(stripeSecretKey)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? '', secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const tenantKey = session.metadata?.tenantKey ?? session.client_reference_id
      const customerId = session.customer as string | null
      const subscriptionId = session.subscription as string | null
      if (!tenantKey || !customerId || !subscriptionId) break

      const [subscription] = await Promise.all([
        stripe.subscriptions.retrieve(subscriptionId),
        saveStripeCustomerTenant(customerId, tenantKey),
      ])
      await saveSubscriptionByTenantKey(tenantKey, {
        planId: 'starter',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        status: mapStatus(subscription.status),
        currentPeriodEnd: periodEndOf(subscription),
        updatedAt: new Date().toISOString(),
      })
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      // Skip if already canceled — deleted event may have already downgraded the plan
      if (subscription.status === 'canceled') break

      const customerId = subscription.customer as string
      const tenantKey = await lookupTenantByStripeCustomer(customerId)
      if (!tenantKey) break

      // TODO: look up stored planId when Growth/Scale plans are added
      await saveSubscriptionByTenantKey(tenantKey, {
        planId: 'starter',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status: mapStatus(subscription.status),
        currentPeriodEnd: periodEndOf(subscription),
        updatedAt: new Date().toISOString(),
      })
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const tenantKey = await lookupTenantByStripeCustomer(customerId)
      if (!tenantKey) break

      await saveSubscriptionByTenantKey(tenantKey, {
        planId: 'free',
        stripeCustomerId: customerId,
        status: 'canceled',
        updatedAt: new Date().toISOString(),
      })
      break
    }
  }

  return NextResponse.json({ ok: true })
}
