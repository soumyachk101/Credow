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

export interface YieldCalculation {
 principal: number
 apy: number
 grossYield: number
 companyShare: number
 employeeShare: number
 periodDays: number
}

export interface YieldDistribution {
 yieldAccount: YieldAccount
 allocation: any
 newUnclaimed: number
 newYieldEligible: number
 transaction: any
}
