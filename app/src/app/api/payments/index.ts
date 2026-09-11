import type { PaymentRecord, X402PaymentRequest, X402PaymentResponse, X402RequiredResponse } from '@/app/api/payments'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function getAuthHeaders() {
 const { supabase } = await import('@/lib/supabase')
 const { data: { session } } = await supabase.auth.getSession()
 if (!session?.access_token) throw new Error('Not authenticated')
 return {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${session.access_token}`,
 }
}

export async function processPayment(input: X402PaymentRequest): Promise<X402PaymentResponse | X402RequiredResponse> {
 const headers = await getAuthHeaders()
 const body: any = {
 allocation_id: input.allocation_id,
 service_id: input.service_id,
 service_name: input.service_name,
 amount: input.amount,
 }
 if (input.payment_proof) body.payment_proof = input.payment_proof

 const res = await fetch(`${API_BASE}/api/payments`, {
 method: 'POST',
 headers,
 body: JSON.stringify(body),
 })
 const json = await res.json()
 if (res.status === 402) return json as X402RequiredResponse
 if (!res.ok) throw new Error(json.error || 'Payment failed')
 return json as X402PaymentResponse
}

export async function retryPayment(paymentId: string): Promise<X402PaymentResponse> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/payments/${paymentId}/retry`, {
 method: 'POST',
 headers,
 })
 if (!res.ok) throw new Error('Failed to retry payment')
 const json = await res.json()
 return json.data
}

export async function fetchPaymentRecords(filters?: { status?: string; employee_id?: string }): Promise<PaymentRecord[]> {
 const headers = await getAuthHeaders()
 const params = new URLSearchParams()
 if (filters?.status) params.set('status', filters.status)
 if (filters?.employee_id) params.set('employee_id', filters.employee_id)
 const qs = params.toString() ? `?${params}` : ''
 const res = await fetch(`${API_BASE}/api/payments${qs}`, { headers })
 if (!res.ok) throw new Error('Failed to fetch payments')
 const json = await res.json()
 return json.data
}
