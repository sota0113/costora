import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getStoredKeys } from '@/lib/storage'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const stored = await getStoredKeys(userId)
  const connectedServices = [
    stored.vercel ? 'vercel' : null,
    stored.aws ? 'aws' : null,
    stored.resend ? 'resend' : null,
  ].filter(Boolean) as string[]

  if (connectedServices.length === 0) {
    redirect('/settings')
  }

  return <DashboardClient connectedServices={connectedServices} />
}
