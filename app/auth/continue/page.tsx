import { AuthContinueClient } from '@/components/AuthContinueClient'

type PageProps = {
  searchParams: Promise<{ redirect?: string }>
}

export default async function AuthContinuePage({ searchParams }: PageProps) {
  const sp = await searchParams
  return <AuthContinueClient redirectParam={sp.redirect ?? null} />
}
