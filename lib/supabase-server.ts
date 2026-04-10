import { createClient } from '@supabase/supabase-js'

// Admin client — server-only, bypasses RLS
// SUPABASE_SERVICE_ROLE_KEY is never exposed to the browser
// Import this ONLY from API routes and server-side lib files
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
