import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseKey) {
 console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
 auth: {
 autoRefreshToken: true,
 persistSession: true,
 },
 realtime: {
 params: {
 eventsPerSecond: 10,
 },
 },
})
