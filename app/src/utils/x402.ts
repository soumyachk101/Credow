/**
 * x402 Payment Service
 * Handles HTTP 402 payment flow for API service consumption
 */

export interface X402PaymentRequest {
 amount: number
 currency: string
 resource: string
 description: string
 expiresAt: string
}

export interface X402PaymentPayload {
 x402Version: number
 accepts: {
 scheme: string
 network: string
 maxAmount: string
 resource: string
 description: string
 mimeType: string
 payTo: string
 maxTimeoutSeconds: number
 }[]
}

export interface X402SettlementResult {
 success: boolean
 txHash?: string
 blockNumber?: number
 error?: string
}

/**
 * Generate an x402 payment payload for a service request
 */
export function generateX402Payload(payment: X402PaymentRequest): X402PaymentPayload {
 return {
 x402Version: 1,
 accepts: [
 {
 scheme: 'exact',
 network: 'algorand',
 maxAmount: payment.amount.toString(),
 resource: payment.resource,
 description: payment.description,
 mimeType: 'application/json',
 payTo: '', // Set dynamically based on service provider
 maxTimeoutSeconds: 300,
 },
 ],
 }
}

/**
 * Parse x402 response and extract payment requirements
 */
export function parseX402Response(response: Response): { paymentRequired: boolean; payload?: X402PaymentPayload } {
 if (response.status !== 402) {
 return { paymentRequired: false }
 }

 try {
 const payload: X402PaymentPayload = await response.json()
 return { paymentRequired: true, payload }
 } catch {
 return { paymentRequired: false }
 }
}

/**
 * Simulate x402 payment settlement (demo mode)
 * In production, this would interact with the Algorand blockchain
 */
export async function settleX402Payment(
 paymentRequirements: X402PaymentPayload['accepts'][0],
 amount: number
): Promise<X402SettlementResult> {
 try {
 console.log('Initiating x402 payment:', {
 amount,
 resource: paymentRequirements.resource,
 network: paymentRequirements.network,
 })

 // Demo mode: simulate payment settlement
 await new Promise(resolve => setTimeout(resolve, 1000))

 return {
 success: true,
 txHash: `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`,
 blockNumber: Math.floor(Date.now() / 4500), // Approx Algorand block time
 }
 } catch (error) {
 console.error('x402 payment failed:', error)
 return {
 success: false,
 error: error instanceof Error ? error.message : 'Payment settlement failed',
 }
 }
}

/**
 * Validate that an allocation has sufficient credits for a payment
 */
export function validateCredits(
 unclaimedCredits: number,
 claimedCredits: number,
 requestedAmount: number,
 maxSpend: number
 ): { valid: boolean; error?: string } {
 if (requestedAmount <= 0) {
 return { valid: false, error: 'Amount must be greater than 0' }
 }

 const available = unclaimedCredits - claimedCredits
 if (available < requestedAmount) {
 return { valid: false, error: `Insufficient credits. Available: ${available}, Requested: ${requestedAmount}` }
 }

 if (requestedAmount > maxSpend) {
 return { valid: false, error: `Amount exceeds maximum spend limit: ${maxSpend}` }
 }

 return { valid: true }
}
