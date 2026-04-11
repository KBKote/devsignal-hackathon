/**
 * Browser Supabase client (singleton). Prefer `createSupabaseBrowserClient` from `./supabase/client` if you need a fresh instance.
 */
import { createSupabaseBrowserClient } from './supabase/client'

export const supabase = createSupabaseBrowserClient()
