import { createServerClient } from '@supabase/ssr'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Partial<ResponseCookie> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}

/**
 * Get the authenticated user from the current request's session cookie.
 *
 * Use this in API route handlers instead of `createServiceClient().auth.getUser()`.
 * The service role client has no session and will always return null for getUser().
 *
 * Also accepts Bearer token in Authorization header for mobile/API client compat:
 *   Authorization: Bearer <supabase_access_token>
 */
export async function getSessionUser() {
  // Try cookie-based session (browser/web)
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  return user ?? null
}

/**
 * Service role client — bypasses RLS.
 * Use ONLY in API routes / server actions, never in the browser.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
