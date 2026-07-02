import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import Stripe from 'stripe'
import { getSubscription } from '@/lib/storage'

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  const subscription = await getSubscription(userId, orgId)
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
  }

  const stripe = new Stripe(secretKey)
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${req.nextUrl.origin}/settings`,
  })

  return NextResponse.json({ url: session.url })
}
