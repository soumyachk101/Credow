import type { Employee, Team } from './employees'

export interface Allocation {
 id: string
 company_id: string
 team_id: string | null
 employee_id: string
 period_start: string
 period_end: string
 total_credits: number
 claimed_credits: number
 unclaimed_credits: number
 yield_eligible_balance: number
 status: 'active' | 'expired' | 'terminated'
 created_at: string
 employee?: Employee
 team?: Team
}

export interface CreateAllocationInput {
 employee_id: string
 team_id?: string
 total_credits: number
 period_start?: string
 period_end?: string
}

export interface ClaimRequest {
 allocation_id: string
 service_id: string
 service_name?: string
 amount: number
 nonce?: string
}

export interface ClaimResponse {
 allocation: Allocation
 transaction: any
 payment: any
}
