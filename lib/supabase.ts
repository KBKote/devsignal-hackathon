import { createClient } from '@supabase/supabase-js'

// Public client — safe to use in browser/client components
// NEXT_PUBLIC_* vars are inlined at build time and available everywhere
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
