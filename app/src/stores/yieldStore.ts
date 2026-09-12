import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface YieldAccount {
 id: string
 allocation_id: string
 company_id: string
 employee_id: string
 principal: number
 yield_generated: number
 company_share: number
 employee_share: number
 strategy: string
 apy: number
 last_calculated_at: string
 created_at: string
}

export const useYieldStore = create<{
 yieldAccounts: YieldAccount[]
 loading: boolean
 error: string | null

 fetchYieldAccounts: (companyId: string) => Promise<void>
 calculateYield: (allocationId: string) => Promise<{ gross: number; companyShare: number; employeeShare: number }>
 distributeYield: (companyId: string) => Promise<void>
 getTotalYield: (companyId: string) => { generated: number; claimed: number; pending: number }
}>((set, get) => ({
 yieldAccounts: [],
 loading: false,
 error: null,

 fetchYieldAccounts: async (companyId: string) => {
 set({ loading: true, error: null })
 try {
 const { data, error } = await supabase
 .from('yield_accounts')
 .select('*')
 .eq('company_id', companyId)
 .order('created_at', { ascending: false })

 if (error) throw error
 set({ yieldAccounts: data || [], loading: false })
 } catch (error: any) {
 set({ error: error.message, loading: false })
 }
 },

 calculateYield: async (allocationId: string) => {
 try {
 // Fetch allocation with its yield account
 const { data: allocation, error: allocError } = await supabase
 .from('allocations')
 .select('*')
 .eq('id', allocationId)
 .maybeSingle()

 if (allocError) throw allocError

 const { data: yieldAccount, error: yieldError } = await supabase
 .from('yield_accounts')
 .select('*')
 .eq('allocation_id', allocationId)
 .maybeSingle()

 if (yieldError && yieldError.code !== 'PGRST116') throw yieldError

 // If no yield account exists, return zero
 if (!yieldAccount) {
 return { gross: 0, companyShare: 0, employeeShare: 0 }
 }

 // Simple interest calculation
 const unclaimed = allocation.unclaimed_credits
 if (unclaimed < 50) return { gross: 0, companyShare: 0, employeeShare: 0 }

 const apy = yieldAccount.apy / 10000 // Convert bps to decimal
 const daysSinceLastCalc = Math.floor(
 (Date.now() - new Date(yieldAccount.last_calculated_at).getTime()) / (1000 * 60 * 60 * 24)
 )

 if (daysSinceLastCalc === 0) {
 return {
 gross: yieldAccount.yield_generated,
 companyShare: yieldAccount.company_share,
 employeeShare: yieldAccount.employee_share,
 }
 }

 // Simple interest: principal * rate * time
 const dailyRate = apy / 365
 const grossYield = unclaimed * dailyRate * daysSinceLastCalc
 const companyShare = grossYield * 0.7
 const employeeShare = grossYield * 0.3

 return {
 gross: yieldAccount.yield_generated + grossYield,
 companyShare: yieldAccount.company_share + companyShare,
 employeeShare: yieldAccount.employee_share + employeeShare,
 }
 } catch (error: any) {
 console.error('Yield calculation error:', error)
 return { gross: 0, companyShare: 0, employeeShare: 0 }
 }
 },

 distributeYield: async (companyId: string) => {
 set({ loading: true, error: null })
 try {
 const { data: yieldAccounts, error: fetchError } = await supabase
 .from('yield_accounts')
 .select('*, allocation:allocations(*)')
 .eq('company_id', companyId)

 if (fetchError) throw fetchError

 for (const ya of yieldAccounts || []) {
 const { gross, companyShare, employeeShare } = await get().calculateYield(ya.allocation_id)

 if (gross <= 0) continue

 // Record yield distribution transaction
 await supabase.from('transactions').insert([{
 allocation_id: ya.allocation_id,
 company_id: companyId,
 type: 'yield_distribute',
 amount: gross,
 from_entity: 'yield_protocol',
 to_entity: `employee:${ya.employee_id}`,
 metadata: {
 gross,
 company_share: companyShare,
 employee_share: employeeShare,
 },
 }])

 // Update yield account
 await supabase.from('yield_accounts').update({
 yield_generated: gross,
 company_share: companyShare,
 employee_share: employeeShare,
 last_calculated_at: new Date().toISOString(),
 }).eq('id', ya.id)

 // Distribute employee share to allocation
 if (employeeShare > 0) {
 try {
 await supabase.from('allocations').update({
 amount: Number(ya.allocation?.amount ?? ya.allocation?.unclaimed_credits ?? 0) + employeeShare,
 }).eq('id', ya.allocation_id)
 } catch (_) {}
 }
 }

 // Refresh local state
 await get().fetchYieldAccounts(companyId)
 } catch (error: any) {
 set({ error: error.message, loading: false })
 throw error
 }
 },

 getTotalYield: (companyId: string) => {
 const accounts = get().yieldAccounts.filter(ya => ya.company_id === companyId)
 return {
 generated: accounts.reduce((sum, ya) => sum + ya.yield_generated, 0),
 claimed: accounts.reduce((sum, ya) => sum + ya.employee_share, 0),
 pending: accounts.reduce((sum, ya) => sum + ya.yield_generated - ya.employee_share, 0),
 }
 },
}))
