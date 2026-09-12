/**
 * x402 protocol utilities — frontend helpers for parsing 402 responses,
 * validating credits, and settling payments.
 */

import type { X402PaymentRequirement, X402PaymentPayload } from '@/services/x402'

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

export interface X402ParsedResponse {
 paymentRequired: boolean
 payload?: X402PaymentPayload
 requirement?: X402PaymentRequirement
}

/**
 * Parse an HTTP response. If status is 402, extract the x402 payload
 * from both JSON body and X-Payment-Required header.
 */
export async function parseX402Response(response: Response): Promise<X402ParsedResponse> {
 if (response.status !== 402) {
 return { paymentRequired: false }
 }

 try {
 const payload: X402PaymentPayload = await response.json()
 return { paymentRequired: true, payload }
 } catch {
 // Try the header as a fallback
 const header = response.headers.get('X-Payment-Required')
 if (header) {
 return { paymentRequired: true, requirement: JSON.parse(header) as X402PaymentRequirement }
 }
 return { paymentRequired: false }
 }
}

// ---------------------------------------------------------------------------
// Credit validation
// ---------------------------------------------------------------------------

export interface CreditValidationResult {
 valid: boolean
 error?: string
}

/**
 * Validate that an allocation has sufficient credits for the requested
 * service and amount. This is enforced client-side; the backend re-checks.
 */
export function validateCredits(
 unclaimedCredits: number,
 requestedAmount: number,
 maxSpend: number
): CreditValidationResult {
 if (requestedAmount <= 0) {
 return { valid: false, error: 'Amount must be greater than 0' }
 }
 if (requestedAmount > unclaimedCredits) {
 return { valid: false, error: `Insufficient credits. Available: ${unclaimedCredits.toFixed(2)}, requested: ${requestedAmount.toFixed(2)}` }
 }
 if (requestedAmount > maxSpend) {
 return { valid: false, error: `Amount exceeds maximum spend limit: ${maxSpend.toFixed(2)}` }
 }
 return { valid: true }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatMicroUsd(amountMicro: string): string {
 const micro = BigInt(amountMicro)
 const dollars = Number(micro) / 1_000_000
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: 'USD',
 minimumFractionDigits: 2,
 maximumFractionDigits: 6,
 }).format(dollars)
}

export function formatCurrency(value: number): string {
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: 'USD',
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(value)
}
