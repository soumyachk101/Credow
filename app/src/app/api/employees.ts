import type { Company } from './companies'
import type { Team } from './teams'

export type { Company, Team }

export interface Employee {
 id: string
 company_id: string
 team_id: string | null
 name: string
 email: string
 role: string
 wallet_address: string | null
 status: 'active' | 'suspended' | 'terminated'
 joined_at: string
 terminated_at: string | null
 created_at: string
 team?: Team
}

export interface CreateEmployeeInput {
 name: string
 email: string
 role: string
 team_id?: string
 wallet_address?: string
}

export interface UpdateEmployeeInput {
 name?: string
 role?: string
 team_id?: string
 status?: 'active' | 'suspended' | 'terminated'
 wallet_address?: string
}

export interface BulkEmployeeInput {
 name: string
 email: string
 role?: string
 team_id?: string
 wallet_address?: string
}
