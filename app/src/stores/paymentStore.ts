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
      let createdRecord: PaymentRecord | null = null
      try {
        const { data, error } = await supabase
          .from('payment_records')
          .insert([{ ...record, status: 'pending' }])
          .select()
          .single()

        if (!error && data) {
          createdRecord = data
        }
      } catch (_) {}

      if (!createdRecord) {
        createdRecord = {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'rec-' + Date.now(),
          ...record,
          status: 'pending',
          created_at: new Date().toISOString(),
        } as PaymentRecord
      }

      set(state => ({
        paymentRecords: [createdRecord!, ...state.paymentRecords],
        loading: false,
      }))
      return createdRecord
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

      try {
        await supabase
          .from('payment_records')
          .update(updates)
          .eq('id', id)
      } catch (_) {}

      set(state => ({
        paymentRecords: state.paymentRecords.map(r =>
          r.id === id ? { ...r, ...updates } : r
        ),
      }))
    } catch (error: any) {
      set({ error: error.message })
    }
  },

 getTotalSpent: (allocationId: string) => {
 return get().paymentRecords
 .filter(r => r.allocation_id === allocationId && r.status === 'confirmed')
 .reduce((sum, r) => sum + r.amount, 0)
 },
}))
