export interface PaymentRecord {
 id: string
 allocation_id: string
 company_id: string
 employee_id: string
 service_id: string
 service_name: string
 amount: number
 x402_tx_hash: string | null
 status: 'pending' | 'confirmed' | 'failed' | 'cancelled'
 error_message: string | null
 consumed_at: string | null
 created_at: string
}

export interface X402PaymentRequest {
 allocation_id: string
 service_id: string
 service_name?: string
 amount: number
 payment_proof?: {
 tx_hash: string
 signature: string
 network: 'algorand' | 'ethereum' | 'solana'
 }
}

export interface X402PaymentResponse {
 data: PaymentRecord & {
 idempotent?: boolean
 payment_id?: string
 }
}

export interface X402RequiredResponse {
 error: string
 data: {
 payment_id: string
 allocation_id: string
 service_id: string
 service_name: string
 amount: number
 currency: string
 x402_version: string
 nonce: string
 expires_at: string
 payment_methods: string[]
 }
}
