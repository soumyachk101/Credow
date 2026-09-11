export type TransactionType = 'allocate' | 'claim' | 'yield_accrue' | 'yield_distribute' | 'reclaim' | 'yield_payout' | 'adjust'

export interface Transaction {
 id: string
 allocation_id: string
 company_id: string
 team_id: string | null
 employee_id: string
 type: TransactionType
 amount: number
 from_entity: string
 to_entity: string
 tx_hash: string | null
 metadata: Record<string, any> | null
 created_at: string
}

export interface TransactionSummary {
 [key: string]: number
 total_transactions: number
}
