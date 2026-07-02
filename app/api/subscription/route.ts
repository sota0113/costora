import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSubscription } from '@/lib/storage'

export async function GET() {
  const { userId, orgId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscription = await getSubscription(userId, orgId)
  return NextResponse.json(subscription ?? { planId: 'free' })
}
