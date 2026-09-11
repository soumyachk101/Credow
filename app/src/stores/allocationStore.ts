import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type AllocationStatus = 'active' | 'suspended' | 'terminated'
export type TransactionType = 'allocate' | 'claim' | 'yield_accrue' | 'yield_distribute' | 'reclaim' | 'adjust'
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled'

// ============================================================
// ALLOCATION STORE
// ============================================================

export interface Allocation {
 id: string
 company_id: string
 team_id: string
 employee_id: string
 period_start: string
 period_end: string
 total_credits: number
 claimed_credits: number
 unclaimed_credits: number
 yield_eligible_balance: number
 status: AllocationStatus
 created_at: string
 employee?: {
 name: string
 email: string
 role: string
 }
 team?: {
 name: string
 }
}

export interface AllocationFormData {
 company_id: string
 team_id: string
 employee_id: string
 period_start: string
 period_end: string
 total_credits: number
}

export const useAllocationStore = create<{
 allocations: Allocation[]
 loading: boolean
 error: string | null

 fetchAllocations: (companyId: string) => Promise<void>
 createAllocation: (data: AllocationFormData) => Promise<Allocation>
 updateAllocation: (id: string, updates: Partial<Allocation>) => Promise<void>
 deleteAllocation: (id: string) => Promise<void>
 claimCredits: (id: string, amount: number) => Promise<void>
 getEmployeeBalance: (employeeId: string) => { total: number; claimed: number; unclaimed: number }
}>((set, get) => ({
 allocations: [],
 loading: false,
 error: null,

 fetchAllocations: async (companyId: string) => {
 set({ loading: true, error: null })
 try {
 const { data, error } = await supabase
 .from('allocations')
 .select('*, employee:employees(*), team:teams(*)')
 .eq('company_id', companyId)
 .order('created_at', { ascending: false })

 if (error) throw error
 set({ allocations: data || [], loading: false })
 } catch (error: any) {
 set({ error: error.message, loading: false })
 }
 },

 createAllocation: async (data: AllocationFormData) => {
 set({ loading: true, error: null })
 try {
 const { data: result, error } = await supabase
 .from('allocations')
 .insert([{
 ...data,
 claimed_credits: 0,
 unclaimed_credits: data.total_credits,
 yield_eligible_balance: 0,
 status: 'active',
 }])
 .select()
 .single()

 if (error) throw error
 set(state => ({
 allocations: [result, ...state.allocations],
 loading: false,
 }))
 return result
 } catch (error: any) {
 set({ error: error.message, loading: false })
 throw error
 }
 },

 updateAllocation: async (id: string, updates: Partial<Allocation>) => {
 set({ loading: true, error: null })
 try {
 const { data, error } = await supabase
 .from('allocations')
 .update(updates)
 .eq('id', id)
 .select()
 .single()

 if (error) throw error
 set(state => ({
 allocations: state.allocations.map(a => a.id === id ? data : a),
 loading: false,
 }))
 } catch (error: any) {
 set({ error: error.message, loading: false })
 throw error
 }
 },

 deleteAllocation: async (id: string) => {
 set({ loading: true, error: null })
 try {
 const { error } = await supabase
 .from('allocations')
 .delete()
 .eq('id', id)

 if (error) throw error
 set(state => ({
 allocations: state.allocations.filter(a => a.id !== id),
 loading: false,
 }))
 } catch (error: any) {
 set({ error: error.message, loading: false })
 throw error
 }
 },

 claimCredits: async (id: string, amount: number) => {
 const allocation = get().allocations.find(a => a.id === id)
 if (!allocation) throw new Error('Allocation not found')
 if (allocation.unclaimed_credits < amount) throw new Error('Insufficient unclaimed credits')

 // Create immutable transaction record
 const { error: txError } = await supabase
 .from('transactions')
 .insert([{
 allocation_id: id,
 company_id: allocation.company_id,
 team_id: allocation.team_id,
 employee_id: allocation.employee_id,
 type: 'claim',
 amount,
 from_entity: `employee:${allocation.employee_id}`,
 to_entity: 'service_provider',
 metadata: { allocation_id: id },
 }])

 if (txError) throw txError

 // Update allocation balance (idempotent via transaction rollback on failure)
 const { error: updateError } = await supabase
 .from('allocations')
 .update({
 claimed_credits: allocation.claimed_credits + amount,
 unclaimed_credits: allocation.unclaimed_credits - amount,
 })
 .eq('id', id)

 if (updateError) {
 // Rollback transaction
 await supabase.from('transactions').delete().eq('allocation_id', id)
 throw updateError
 }

 // Update local state
 set(state => ({
 allocations: state.allocations.map(a =>
 a.id === id
 ? {
 ...a,
 claimed_credits: a.claimed_credits + amount,
 unclaimed_credits: a.unclaimed_credits - amount,
 }
 : a
 ),
 }))
 },

 getEmployeeBalance: (employeeId: string) => {
 const employeeAllocations = get().allocations.filter(a => a.employee_id === employeeId)
 return {
 total: employeeAllocations.reduce((sum, a) => sum + a.total_credits, 0),
 claimed: employeeAllocations.reduce((sum, a) => sum + a.claimed_credits, 0),
 unclaimed: employeeAllocations.reduce((sum, a) => sum + a.unclaimed_credits, 0),
 }
 },
}))
