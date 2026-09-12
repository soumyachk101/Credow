import type { PaymentRecord, X402PaymentRequest, X402PaymentResponse, X402RequiredResponse } from '@/lib/types'
export type { PaymentRecord, X402PaymentRequest, X402PaymentResponse, X402RequiredResponse }

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

/**
 * Step 1 of x402: create a payment request without proof.
 * The backend returns 402 if payment is required, or confirms if already paid.
 */
export async function createPaymentRequest(input: {
 allocation_id: string
 service_id: string
 service_name?: string
 amount: number
}): Promise<X402PaymentResponse | X402RequiredResponse> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/payments`, {
 method: 'POST',
 headers,
 body: JSON.stringify({
 allocation_id: input.allocation_id,
 service_id: input.service_id,
 service_name: input.service_name,
 amount: input.amount,
 // No payment_proof — backend will return 402
 }),
 })
 const json = await res.json()
 if (res.status === 402) return json as X402RequiredResponse
 if (!res.ok) throw new Error(json.error || 'Payment request failed')
 return json as X402PaymentResponse
}

/**
 * Step 2 of x402: submit payment proof (on-chain tx hash).
 * Backend verifies on-chain via Algorand Indexer before confirming.
 */
export async function submitPaymentProof(input: {
 allocation_id: string
 service_id: string
 service_name?: string
 amount: number
 payment_proof: {
 tx_hash: string
 sender_address: string
 network: 'algorand'
 }
}): Promise<X402PaymentResponse> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/payments`, {
 method: 'POST',
 headers,
 body: JSON.stringify({
 allocation_id: input.allocation_id,
 service_id: input.service_id,
 service_name: input.service_name,
 amount: input.amount,
 payment_proof: input.payment_proof,
 }),
 })
 const json = await res.json()
 if (!res.ok) throw new Error(json.error || 'Payment settlement failed')
 return json as X402PaymentResponse
}

/**
 * Verify an on-chain transaction without creating a payment record.
 * Used to double-check a tx hash before submitting as proof.
 */
export async function verifyTransaction(txHash: string, paymentId?: string): Promise<{
 valid: boolean
 confirmed?: boolean
 confirmedRound?: number
 error?: string
}> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/payments/verify`, {
 method: 'POST',
 headers,
 body: JSON.stringify({ tx_hash: txHash, payment_id: paymentId }),
 })
 const json = await res.json()
 return json
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
