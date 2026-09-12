import type { Company, CreateCompanyInput, UpdateCompanyInput } from '@/lib/types'
export type { Company, CreateCompanyInput, UpdateCompanyInput }

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

export async function fetchCompanies(): Promise<Company[]> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/companies`, { headers })
 if (!res.ok) throw new Error('Failed to fetch companies')
 const json = await res.json()
 return json.data
}

export async function fetchCompany(id: string): Promise<Company> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/companies/${id}`, { headers })
 if (!res.ok) throw new Error('Failed to fetch company')
 const json = await res.json()
 return json.data
}

export async function createCompany(input: CreateCompanyInput): Promise<Company> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/companies`, {
 method: 'POST',
 headers,
 body: JSON.stringify(input),
 })
 if (!res.ok) throw new Error('Failed to create company')
 const json = await res.json()
 return json.data
}

export async function updateCompany(id: string, input: UpdateCompanyInput): Promise<Company> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/companies/${id}`, {
 method: 'PATCH',
 headers,
 body: JSON.stringify(input),
 })
 if (!res.ok) throw new Error('Failed to update company')
 const json = await res.json()
 return json.data
}
