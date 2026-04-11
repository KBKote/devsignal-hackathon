import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { MarketingBody } from '@/components/MarketingBody'
import { getSessionUser } from '@/lib/auth/session'
import { getServerPostAuthDestination } from '@/lib/auth/post-auth-redirect-server'
import { getPublicOriginFromHeaders } from '@/lib/request-origin'

export default async function HomePage() {
  const user = await getSessionUser()
  if (user) {
    const path = await getServerPostAuthDestination(user.id)
    const origin = getPublicOriginFromHeaders(
      await headers(),
      process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000/'
    )
    redirect(`${origin}${path}`)
  }

  return <MarketingBody />
}
