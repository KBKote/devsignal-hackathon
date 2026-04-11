import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase-server'
import { loadUserProfileRow } from '@/lib/user-profiles-db'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [{ data: cred }, profileRow] = await Promise.all([
    supabaseAdmin.from('user_api_credentials').select('user_id').eq('user_id', user.id).maybeSingle(),
    loadUserProfileRow(user.id),
  ])

  return NextResponse.json({
    hasAnthropicKey: Boolean(cred),
    onboardingCompleted: profileRow?.onboarding_completed ?? false,
  })
}
