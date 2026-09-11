/**
 * Supabase server client for Next.js API routes
 */

import { createClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function getSupabaseServerClient() {
 const cookieStore = await cookies()
 return createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.SUPABASE_SERVICE_ROLE_KEY!,
 {
 cookies: {
 getAll() {
 return cookieStore.getAll()
 },
 setAll(cookiesToSet) {
 cookiesToSet.forEach(({ name, value, options }) =>
 cookieStore.set(name, value, options)
 )
 },
 },
 }
 )
}
