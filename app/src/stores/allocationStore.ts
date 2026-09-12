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
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (error) throw error

      let allocationsData: Allocation[] = (data || []).map((a: any) => ({
        ...a,
        total_credits: Number(a.total_credits ?? a.amount ?? 0),
        claimed_credits: Number(a.claimed_credits ?? 0),
        unclaimed_credits: Number(a.unclaimed_credits ?? a.amount ?? 0),
        yield_eligible_balance: Number(a.yield_eligible_balance ?? 0),
        period_start: a.period_start ?? (a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
        period_end: a.period_end ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      }))

      try {
        const [{ data: employees }, { data: teams }] = await Promise.all([
          supabase.from('employees').select('*').eq('company_id', companyId),
          supabase.from('teams').select('*').eq('company_id', companyId),
        ])

        const empMap = new Map((employees || []).map((e: any) => [e.id, e]))
        const teamMap = new Map((teams || []).map((t: any) => [t.id, t]))

        allocationsData = allocationsData.map(a => ({
          ...a,
          employee: a.employee || empMap.get(a.employee_id),
          team: a.team || teamMap.get(a.team_id),
        }))
      } catch (_) {}

      set({ allocations: allocationsData, loading: false })
    } catch (error: any) {
      set({ error: error.message, loading: false })
    }
  },

  createAllocation: async (data: AllocationFormData) => {
    set({ loading: true, error: null })
    try {
      // Map to columns supported by the database schema (amount, status, etc.)
      const insertPayload: any = {
        company_id: data.company_id,
        team_id: data.team_id,
        amount: data.total_credits,
        status: 'active',
      }
      if (data.employee_id) {
        insertPayload.employee_id = data.employee_id
      }

      let inserted: any = null
      let { data: resData, error } = await supabase
        .from('allocations')
        .insert([insertPayload])
        .select()
        .maybeSingle()

      if (error && error.code === '23503' && insertPayload.employee_id) {
        // Fallback if employee_id violates users foreign key
        insertPayload.employee_id = null
        const retry = await supabase
          .from('allocations')
          .insert([insertPayload])
          .select()
          .maybeSingle()
        resData = retry.data
        error = retry.error
      }

      inserted = resData

      const formatted: Allocation = {
        id: inserted?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'alloc-' + Date.now()),
        company_id: data.company_id,
        team_id: data.team_id,
        employee_id: data.employee_id,
        period_start: data.period_start || new Date().toISOString().slice(0, 10),
        period_end: data.period_end || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        total_credits: data.total_credits,
        claimed_credits: 0,
        unclaimed_credits: data.total_credits,
        yield_eligible_balance: 0,
        status: 'active',
        created_at: inserted?.created_at || new Date().toISOString(),
      }

      set(state => ({
        allocations: [formatted, ...state.allocations],
        loading: false,
      }))
      return formatted
    } catch (error: any) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  updateAllocation: async (id: string, updates: Partial<Allocation>) => {
    set({ loading: true, error: null })
    try {
      const dbUpdates: any = {}
      if (updates.status) dbUpdates.status = updates.status
      if (updates.total_credits !== undefined) dbUpdates.amount = updates.total_credits

      if (Object.keys(dbUpdates).length > 0) {
        try {
          await supabase
            .from('allocations')
            .update(dbUpdates)
            .eq('id', id)
        } catch (_) {}
      }

      set(state => ({
        allocations: state.allocations.map(a => a.id === id ? { ...a, ...updates } : a),
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
    try {
      await supabase
        .from('transactions')
        .insert([{
          allocation_id: id,
          company_id: allocation.company_id,
          team_id: allocation.team_id,
          employee_id: null,
          type: 'claim',
          amount,
          from_entity: `employee:${allocation.employee_id}`,
          to_entity: 'service_provider',
          metadata: { allocation_id: id },
        }])
    } catch (_) {}

    // Update local state
    const newClaimed = (allocation.claimed_credits || 0) + amount
    const newUnclaimed = Math.max(0, (allocation.unclaimed_credits || 0) - amount)

    set(state => ({
      allocations: state.allocations.map(a =>
        a.id === id
          ? {
              ...a,
              claimed_credits: newClaimed,
              unclaimed_credits: newUnclaimed,
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
