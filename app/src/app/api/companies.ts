export interface Company {
 id: string
 name: string
 slug: string
 owner_id: string
 wallet_address: string | null
 x402_config: Record<string, any> | null
 created_at: string
}

export interface CreateCompanyInput {
 name: string
 wallet_address?: string
}

export interface UpdateCompanyInput {
 name?: string
 wallet_address?: string
 x402_config?: Record<string, any>
}
