import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface Company {
 id: string
 name: string
 slug: string
 owner_id: string
 wallet_address?: string
 x402_config?: Record<string, any>
 credit_pool?: number
 yield_enabled?: boolean
 created_at: string
}

export interface Team {
 id: string
 company_id: string
 name: string
 manager_id?: string
 budget_pool: number
 status: string
 created_at: string
 member_count?: number
}

export interface Employee {
 id: string
 company_id: string
 team_id?: string
 name: string
 email: string
 role: string
 wallet_address?: string
 status: string
 created_at: string
 team?: { name: string }
}

export const useCompanyStore = create<{
 companies: Company[]
 teams: Team[]
 employees: Employee[]
 loading: boolean
 error: string | null

 fetchCompanies: () => Promise<void>
 fetchTeams: (companyId: string) => Promise<void>
 fetchEmployees: (companyId: string) => Promise<void>
 createTeam: (data: { company_id: string; name: string; manager_id?: string; budget_pool?: number }) => Promise<Team>
 updateTeam: (id: string, updates: Partial<Team>) => Promise<void>
 deleteTeam: (id: string) => Promise<void>
 createEmployee: (data: { company_id: string; name: string; email: string; role: string; team_id?: string; wallet_address?: string }) => Promise<Employee>
 updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>
 terminateEmployee: (id: string) => Promise<void>
}>((set, get) => ({
 companies: [],
 teams: [],
 employees: [],
 loading: false,
 error: null,

 fetchCompanies: async () => {
 set({ loading: true })
 try {
 const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false })
 if (error) throw error
 set({ companies: data || [], loading: false })
 } catch (error: any) {
 set({ error: error.message, loading: false })
 }
 },

 fetchTeams: async (companyId: string) => {
 try {
 const [{ data: teamsData }, { data: empCounts }] = await Promise.all([
 supabase.from('teams').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
 supabase.from('employees').select('team_id').eq('company_id', companyId),
 ])

 const countMap = new Map<string, number>()
 ;(empCounts || []).forEach((e: any) => {
 if (e.team_id) {
 countMap.set(e.team_id, (countMap.get(e.team_id) || 0) + 1)
 }
 })

 const enriched = (teamsData || []).map((t: any) => ({
 ...t,
 member_count: countMap.get(t.id) || 0,
 }))

 set({ teams: enriched })
 } catch (error: any) {
 console.error('Failed to fetch teams:', error.message)
 }
 },

 fetchEmployees: async (companyId: string) => {
 try {
 const { data, error } = await supabase
 .from('employees')
 .select('*, team:teams(name)')
 .eq('company_id', companyId)
 .order('created_at', { ascending: false })

 if (error) throw error
 const normalized = (data || []).map((e: any) => ({
 ...e,
 status: e.status || 'active',
 }))
 set({ employees: normalized })
 } catch (error: any) {
 console.error('Failed to fetch employees:', error.message)
 }
 },

 createTeam: async (data) => {
 const { data: team, error } = await supabase.from('teams').insert([data]).select().maybeSingle()
 if (error) throw error
 set(state => ({ teams: [team, ...state.teams] }))
 return team
 },

 updateTeam: async (id, updates) => {
 const { error } = await supabase.from('teams').update(updates).eq('id', id)
 if (error) throw error
 set(state => ({
 teams: state.teams.map(t => t.id === id ? { ...t, ...updates } : t),
 }))
 },

 deleteTeam: async (id) => {
 const { error } = await supabase.from('teams').delete().eq('id', id)
 if (error) throw error
 set(state => ({ teams: state.teams.filter(t => t.id !== id) }))
 },

 createEmployee: async (data) => {
 const { data: emp, error } = await supabase.from('employees').insert([data]).select().maybeSingle()
 if (error) throw error
 const formatted = { ...emp, status: 'active' }
 set(state => ({ employees: [formatted, ...state.employees] }))
 return formatted
 },

 updateEmployee: async (id, updates) => {
 const { data, error } = await supabase.from('employees').update(updates).eq('id', id).select().maybeSingle()
 if (error) throw error
 set(state => ({
 employees: state.employees.map(e => e.id === id ? { ...e, ...data } : e),
 }))
 return data
 },

 terminateEmployee: async (id) => {
 try {
 await supabase.from('employees').delete().eq('id', id)
 } catch (_) {}
 set(state => ({
 employees: state.employees.filter(e => e.id !== id),
 }))
 },
}))
