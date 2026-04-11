import { supabaseAdmin } from '@/lib/supabase-server'

/** Same routing rules as client `destinationFromSetup`, without a fetch round-trip. */
export async function getServerPostAuthDestination(userId: string): Promise<string> {
  const { data: cred } = await supabaseAdmin
    .from('user_api_credentials')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!cred) return '/settings'
  return '/feed'
}
