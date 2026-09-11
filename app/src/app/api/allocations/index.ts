import type { Allocation, CreateAllocationInput, ClaimRequest, ClaimResponse } from '@/app/api/allocations'

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

export async function fetchAllocations(companyId: string, filters?: {
 employee_id?: string
 team_id?: string
 status?: string
}): Promise<Allocation[]> {
 const headers = await getAuthHeaders()
 const params = new URLSearchParams()
 if (filters?.employee_id) params.set('employee_id', filters.employee_id)
 if (filters?.team_id) params.set('team_id', filters.team_id)
 if (filters?.status) params.set('status', filters.status)
 const qs = params.toString() ? `?${params}` : ''
 const res = await fetch(`${API_BASE}/api/allocations${qs}`, { headers })
 if (!res.ok) throw new Error('Failed to fetch allocations')
 const json = await res.json()
 return json.data
}

export async function fetchAllocation(id: string): Promise<Allocation> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/allocations/${id}`, { headers })
 if (!res.ok) throw new Error('Failed to fetch allocation')
 const json = await res.json()
 return json.data
}

export async function createAllocation(input: CreateAllocationInput): Promise<Allocation> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/allocations`, {
 method: 'POST',
 headers,
 body: JSON.stringify(input),
 })
 if (!res.ok) throw new Error('Failed to create allocation')
 const json = await res.json()
 return json.data
}

export async function claimCredits(input: ClaimRequest): Promise<ClaimResponse> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/allocations/${input.allocation_id}/claim`, {
 method: 'POST',
 headers,
 body: JSON.stringify({
 service_id: input.service_id,
 service_name: input.service_name,
 amount: input.amount,
 nonce: input.nonce,
 }),
 })
 if (!res.ok) throw new Error('Failed to claim credits')
 const json = await res.json()
 return json.data
}

export async function terminateAllocation(id: string): Promise<void> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/allocations/${id}`, {
 method: 'DELETE',
 headers,
 })
 if (!res.ok) throw new Error('Failed to terminate allocation')
}
