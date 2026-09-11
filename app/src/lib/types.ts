export type UserRole = 'super_admin' | 'company_owner' | 'manager' | 'employee'

export type AllocationStatus = 'active' | 'suspended' | 'terminated'
export type TransactionType = 'allocate' | 'claim' | 'yield_accrue' | 'yield_distribute' | 'reclaim' | 'adjust'
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled'

export interface Company {
 id: string
 name: string
 slug: string
 owner_id: string
 wallet_address: string | null
 x402_config: Record<string, any> | null
 credit_pool: number
 yield_enabled: boolean
 created_at: string
 updated_at: string
}

export interface Team {
 id: string
 company_id: string
 name: string
 manager_id: string | null
 budget_pool: number
 created_at: string
}

export interface Employee {
 id: string
 company_id: string
 team_id: string | null
 user_id: string | null
 name: string
 email: string
 role: string
 wallet_address: string | null
 status: AllocationStatus
 joined_at: string
 terminated_at: string | null
}

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
 status: AllocationStatus
 created_at: string
 employee?: Employee
 team?: Team
}

export interface YieldAccount {
 id: string
 allocation_id: string
 company_id: string
 employee_id: string
 principal: number
 yield_generated: number
 company_share: number
 employee_share: number
 strategy: string
 apy: number
 last_calculated_at: string
 created_at: string
}

export interface Transaction {
 id: string
 allocation_id: string | null
 company_id: string
 team_id: string | null
 employee_id: string | null
 type: TransactionType
 amount: number
 from_entity: string
 to_entity: string
 tx_hash: string | null
 metadata: Record<string, any> | null
 created_at: string
}

export interface PaymentRecord {
 id: string
 allocation_id: string
 service_id: string
 amount: number
 x402_tx_hash: string | null
 status: PaymentStatus
 consumed_at: string | null
 created_at: string
}

export interface DashboardStats {
 totalCredits: number
 totalClaimed: number
 totalUnclaimed: number
 totalYield: number
 activeAllocations: number
 totalEmployees: number
}

export interface AllocationFormData {
 company_id: string
 team_id: string
 employee_id: string
 period_start: string
 period_end: string
 total_credits: number
}

export interface CSVImportResult {
 success: number
 failed: number
 errors: Array<{ row: number; error: string }>
}
