import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/lib/types'

export interface AuthUser {
 id: string
 email: string
 name: string
 role: UserRole
 company_id?: string
 team_id?: string
 employee_id?: string
}

interface AuthState {
 user: AuthUser | null
 loading: boolean
 error: string | null
 _hydrated: boolean

 login: (email: string, password: string) => Promise<void>
 loginWithGoogle: () => Promise<void>
 logout: () => Promise<void>
 signup: (email: string, password: string, name: string, role: UserRole) => Promise<void>
 updateProfile: (updates: Partial<AuthUser>) => Promise<void>
 fetchUserProfile: (userId: string) => Promise<void>
 fetchTeams: (companyId: string) => Promise<void>
 fetchEmployees: (companyId: string) => Promise<void>
 ensureUser: (name?: string, email?: string) => Promise<AuthUser>
 switchRole: (role: UserRole, employee?: { id: string; name: string; email: string; team_id?: string | null }) => void
}

export const useAuthStore = create<AuthState>()(
 persist(
 (set, get) => ({
 user: null,
 loading: false,
 error: null,
 _hydrated: false,

 login: async (email: string, password: string) => {
 set({ loading: true, error: null })
 try {
 const { data, error } = await supabase.auth.signInWithPassword({
 email,
 password,
 })

 if (error) throw error

 if (data.user) {
 set({
 user: {
 id: data.user.id,
 email: data.user.email || email,
 name: data.user.user_metadata?.name || 'User',
 role: (data.user.user_metadata?.role as UserRole) || 'company_owner',
 },
 })
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
 } catch (error: any) {
 console.error('Logout error:', error)
 }
 set({ user: null })
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
 set({
 user: {
 id: data.user.id,
 email: data.user.email || email,
 name: name,
 role: role,
 },
 })
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
 try {
 await supabase
 .from('profiles')
 .update(updates)
 .eq('id', user.id)
 } catch (_) {}

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
 .maybeSingle()

 if (!error && data) {
 set(state => ({
 user: {
 id: data.id,
 email: data.email || state.user?.email || '',
 name: data.name || state.user?.name || 'User',
 role: data.role || state.user?.role || 'company_owner',
 company_id: data.company_id || state.user?.company_id,
 team_id: data.team_id || state.user?.team_id,
 },
 loading: false,
 }))
 } else {
 set({ loading: false })
 }
 } catch (error: any) {
 set({ error: error.message, loading: false })
 }
 },

 fetchTeams: async (_companyId: string) => {},
 fetchEmployees: async (_companyId: string) => {},

 ensureUser: async (name?: string, email?: string): Promise<AuthUser> => {
 const existing = get().user
 if (existing && existing.id) return existing

 // Check active session in Supabase Auth
 try {
 const { data: { session } } = await supabase.auth.getSession()
 if (session?.user) {
 const u: AuthUser = {
 id: session.user.id,
 email: session.user.email || email || 'admin@credow.io',
 name: name || session.user.user_metadata?.name || 'Admin',
 role: 'company_owner',
 }
 set({ user: u, loading: false })
 return u
 }
 } catch (_) {}

 // Try signing up or logging in with Supabase
 const userEmail = email || `admin-${Date.now().toString(36)}@credow.io`
 const userPassword = 'Password123!'
 try {
 const { data, error } = await supabase.auth.signUp({
 email: userEmail,
 password: userPassword,
 options: {
 data: {
 name: name || 'Admin',
 role: 'company_owner',
 },
 },
 })
 if (!error && data.user) {
 const u: AuthUser = {
 id: data.user.id,
 email: data.user.email || userEmail,
 name: name || 'Admin',
 role: 'company_owner',
 }
 set({ user: u, loading: false })
 return u
 }
 } catch (_) {}

 // Fallback user with valid UUID
 const fallbackId = (typeof crypto !== 'undefined' && crypto.randomUUID)
 ? crypto.randomUUID()
 : '00000000-0000-0000-0000-000000000001'
 const u: AuthUser = {
 id: fallbackId,
 email: userEmail,
 name: name || 'Admin',
 role: 'company_owner',
 }
 set({ user: u, loading: false })
 return u
 },

 switchRole: (role: UserRole, employee?: { id: string; name: string; email: string; team_id?: string | null }) => {
 set(state => {
 if (!state.user) return state
 if (role === 'employee' && employee) {
 return {
 user: {
 ...state.user,
 role: 'employee',
 name: employee.name,
 email: employee.email,
 employee_id: employee.id,
 team_id: (employee.team_id || state.user.team_id) || undefined,
 },
 }
 }
 return {
 user: {
 ...state.user,
 role,
 name: role === 'company_owner' ? (state.user.name.includes('Employee') ? 'Company Owner' : state.user.name) : state.user.name,
 employee_id: undefined,
 },
 }
 })
 },
 }),
 {
 name: 'creditflow-auth',
 partialize: state => ({ user: state.user, _hydrated: true }),
 onRehydrateStorage: () => (state) => {
 if (state) {
 state._hydrated = true
 }
 },
 }
 )
)
