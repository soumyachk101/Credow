import type { Transaction, TransactionSummary, TransactionType } from '@/app/api/transactions'

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

export async function fetchTransactions(filters?: {
 type?: TransactionType
 allocation_id?: string
 employee_id?: string
}): Promise<Transaction[]> {
 const headers = await getAuthHeaders()
 const params = new URLSearchParams()
 if (filters?.type) params.set('type', filters.type)
 if (filters?.allocation_id) params.set('allocation_id', filters.allocation_id)
 if (filters?.employee_id) params.set('employee_id', filters.employee_id)
 const qs = params.toString() ? `?${params}` : ''
 const res = await fetch(`${API_BASE}/api/transactions${qs}`, { headers })
 if (!res.ok) throw new Error('Failed to fetch transactions')
 const json = await res.json()
 return json.data
}

export async function fetchTransactionSummary(): Promise<TransactionSummary> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/transactions/summary`, { headers })
 if (!res.ok) throw new Error('Failed to fetch summary')
 const json = await res.json()
 return json.summary
}
