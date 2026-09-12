import type { YieldAccount, YieldCalculation, YieldDistribution } from '@/lib/types'
export type { YieldAccount, YieldCalculation, YieldDistribution }

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

export async function fetchYieldAccounts(companyId: string): Promise<YieldAccount[]> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/yield?company_id=${companyId}`, { headers })
 if (!res.ok) throw new Error('Failed to fetch yield accounts')
 const json = await res.json()
 return json.data
}

export async function fetchYieldAccount(id: string): Promise<YieldAccount> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/yield/${id}`, { headers })
 if (!res.ok) throw new Error('Failed to fetch yield account')
 const json = await res.json()
 return json.data
}

export async function calculateYield(allocationId: string): Promise<YieldCalculation> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/yield/calculate`, {
 method: 'POST',
 headers,
 body: JSON.stringify({ allocation_id: allocationId }),
 })
 if (!res.ok) throw new Error('Failed to calculate yield')
 const json = await res.json()
 return json.data
}

export async function distributeYield(allocationId: string): Promise<YieldDistribution> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/yield/distribute`, {
 method: 'POST',
 headers,
 body: JSON.stringify({ allocation_id: allocationId }),
 })
 if (!res.ok) throw new Error('Failed to distribute yield')
 const json = await res.json()
 return json.data
}
