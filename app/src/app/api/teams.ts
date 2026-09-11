import type { Company } from './companies'

export interface Team {
 id: string
 company_id: string
 name: string
 manager_id: string | null
 budget_pool: number
 created_at: string
 company?: Company
 manager?: {
 id: string
 name: string
 email: string
 }
}

export interface CreateTeamInput {
 name: string
 manager_id?: string
 budget_pool?: number
}

export interface UpdateTeamInput {
 name?: string
 manager_id?: string
 budget_pool?: number
}
