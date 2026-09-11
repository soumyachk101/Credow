import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { PaymentRecord, PaymentStatus } from '@/lib/types'

export const usePaymentStore = create<{
 paymentRecords: PaymentRecord[]
 loading: boolean
 error: string | null

 fetchPaymentRecords: (allocationId: string) => Promise<void>
 createPaymentRecord: (record: Omit<PaymentRecord, 'id' | 'created_at'>) => Promise<PaymentRecord>
 updatePaymentStatus: (id: string, status: PaymentStatus, txHash?: string) => Promise<void>
 getTotalSpent: (allocationId: string) => number
}>((set, get) => ({
 paymentRecords: [],
 loading: false,
 error: null,

 fetchPaymentRecords: async (allocationId: string) => {
 set({ loading: true, error: null })
 try {
 const { data, error } = await supabase
 .from('payment_records')
 .select('*')
 .eq('allocation_id', allocationId)
 .order('created_at', { ascending: false })

 if (error) throw error
 set({ paymentRecords: data || [], loading: false })
 } catch (error: any) {
 set({ error: error.message, loading: false })
 }
 },

 createPaymentRecord: async (record) => {
 set({ loading: true, error: null })
 try {
 const { data, error } = await supabase
 .from('payment_records')
 .insert([{ ...record, status: 'pending' }])
 .select()
 .single()

 if (error) throw error
 set(state => ({
 paymentRecords: [data, ...state.paymentRecords],
 loading: false,
 }))
 return data
 } catch (error: any) {
 set({ error: error.message, loading: false })
 throw error
 }
 },

 updatePaymentStatus: async (id: string, status: PaymentStatus, txHash?: string) => {
 try {
 const updates: any = { status }
 if (txHash) updates.x402_tx_hash = txHash
 if (status === 'confirmed') updates.consumed_at = new Date().toISOString()

 const { error } = await supabase
 .from('payment_records')
 .update(updates)
 .eq('id', id)

 if (error) throw error

 set(state => ({
 paymentRecords: state.paymentRecords.map(r =>
 r.id === id ? { ...r, ...updates } : r
 ),
 }))
 } catch (error: any) {
 set({ error: error.message })
 throw error
 }
 },

 getTotalSpent: (allocationId: string) => {
 return get().paymentRecords
 .filter(r => r.allocation_id === allocationId && r.status === 'confirmed')
 .reduce((sum, r) => sum + r.amount, 0)
 },
}))
