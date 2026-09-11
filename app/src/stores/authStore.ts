import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { UserRole, Company, Team, Employee } from '@/lib/types'

export interface AuthUser {
 id: string
 email: string
 name: string
 role: UserRole
 company_id?: string
 team_id?: string
}

export const useAuthStore = create<{
 user: AuthUser | null
 loading: boolean
 error: string | null

 login: (email: string, password: string) => Promise<void>
 loginWithGoogle: () => Promise<void>
 logout: () => Promise<void>
 signup: (email: string, password: string, name: string, role: UserRole) => Promise<void>
 updateProfile: (updates: Partial<AuthUser>) => Promise<void>
 fetchUserProfile: (userId: string) => Promise<void>
}>((set, get) => ({
 user: null,
 loading: false,
 error: null,

 login: async (email: string, password: string) => {
 set({ loading: true, error: null })
 try {
 const { data, error } = await supabase.auth.signInWithPassword({
 email,
 password,
 })

 if (error) throw error

 if (data.user) {
 await get().fetchUserProfile(data.user.id)
 }
 } catch (error: any) {
 set({ error: error.message, loading: false })
 throw error
 }
 },

 loginWithGoogle: async () => {
 set({ loading: true, error: null })
 try {
 const { data, error } = await supabase.auth.signInWithOAuth({
 provider: 'google',
 options: {
 redirectTo: `${window.location.origin}/auth/callback`,
 },
 })

 if (error) throw error
 } catch (error: any) {
 set({ error: error.message, loading: false })
 throw error
 }
 },

 logout: async () => {
 try {
 await supabase.auth.signOut()
 set({ user: null })
 } catch (error: any) {
 console.error('Logout error:', error)
 }
 },

 signup: async (email: string, password: string, name: string, role: UserRole) => {
 set({ loading: true, error: null })
 try {
 const { data, error } = await supabase.auth.signUp({
 email,
 password,
 options: {
 data: {
 name,
 role,
 },
 },
 })

 if (error) throw error

 if (data.user) {
 await get().fetchUserProfile(data.user.id)
 }
 } catch (error: any) {
 set({ error: error.message, loading: false })
 throw error
 }
 },

 updateProfile: async (updates: Partial<AuthUser>) => {
 const user = get().user
 if (!user) throw new Error('Not authenticated')

 set({ loading: true, error: null })
 try {
 const { error } = await supabase
 .from('profiles')
 .update(updates)
 .eq('id', user.id)

 if (error) throw error

 set(state => ({
 user: state.user ? { ...state.user, ...updates } : null,
 loading: false,
 }))
 } catch (error: any) {
 set({ error: error.message, loading: false })
 throw error
 }
 },

 fetchUserProfile: async (userId: string) => {
 try {
 const { data, error } = await supabase
 .from('profiles')
 .select('*')
 .eq('id', userId)
 .single()

 if (error) throw error

 if (data) {
 set({
 user: {
 id: data.id,
 email: data.email,
 name: data.name,
 role: data.role,
 company_id: data.company_id,
 team_id: data.team_id,
 },
 loading: false,
 })
 }
 } catch (error: any) {
 set({ error: error.message, loading: false })
 }
 },
}))
