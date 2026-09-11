import type { Team, CreateTeamInput, UpdateTeamInput } from '@/app/api/teams'

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

export async function fetchTeams(companyId: string): Promise<Team[]> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/teams?company_id=${companyId}`, { headers })
 if (!res.ok) throw new Error('Failed to fetch teams')
 const json = await res.json()
 return json.data
}

export async function fetchTeam(id: string): Promise<Team> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/teams/${id}`, { headers })
 if (!res.ok) throw new Error('Failed to fetch team')
 const json = await res.json()
 return json.data
}

export async function createTeam(companyId: string, input: CreateTeamInput): Promise<Team> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/teams`, {
 method: 'POST',
 headers,
 body: JSON.stringify({ ...input, company_id: companyId }),
 })
 if (!res.ok) throw new Error('Failed to create team')
 const json = await res.json()
 return json.data
}

export async function updateTeam(id: string, input: UpdateTeamInput): Promise<Team> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/teams/${id}`, {
 method: 'PATCH',
 headers,
 body: JSON.stringify(input),
 })
 if (!res.ok) throw new Error('Failed to update team')
 const json = await res.json()
 return json.data
}

export async function deleteTeam(id: string): Promise<void> {
 const headers = await getAuthHeaders()
 const res = await fetch(`${API_BASE}/api/teams/${id}`, {
 method: 'DELETE',
 headers,
 })
 if (!res.ok) throw new Error('Failed to delete team')
}
