import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { computeTenantKey } from '@/lib/storage'

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_STARTER_PRICE_ID
  if (!secretKey || !priceId) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  const stripe = new Stripe(secretKey)
  const user = await currentUser()
  const tenantKey = computeTenantKey(orgId, userId)
  const origin = req.nextUrl.origin

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user?.emailAddresses[0]?.emailAddress,
    subscription_data: { trial_period_days: 14 },
    client_reference_id: tenantKey,
    metadata: { tenantKey },
    success_url: `${origin}/settings?checkout=success`,
    cancel_url: `${origin}/settings?checkout=cancel`,
  })

  return NextResponse.json({ url: session.url })
}
