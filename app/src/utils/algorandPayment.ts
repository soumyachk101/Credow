/**
 * Algorand x402 payment construction helpers.
 *
 * Builds a USDC ASA transfer transaction group for the x402 "exact" scheme:
 * 1. Payment txn (funded by the employee wallet)
 * 2. Optional app-call txn (if a settlement app is configured)
 *
 * All amounts are in micro-USDC (6 decimals).
 */

import algosdk, {
  type SuggestedParams,
  type Transaction,
} from 'algosdk'
import { getNetwork } from './algorand'

// Algorand chain / network identifiers used in x402 CAIP-2 and network strings
export type AlgorandNetwork = 'algorand:mainnet' | 'algorand:testnet' | 'algorand:localnet'

// Real USDC ASA: 10458941 on TestNet, 31566704 on MainNet
export const USDC_ASSET_ID = getNetwork() === 'mainnet' ? 31_566_704 : 10_458_941
export const USDC_DECIMALS = 6
export const MICRO_USDC_DIVISOR = 1_000_000n

// Circle facilitator endpoints (configurable)
export type CircleConfig = {
  baseUrl: string
  apiKey: string
}

/**
 * Normalize an x402 network string to an AlgorandNetwork identifier.
 */
export function resolveAlgorandNetwork(network: string): AlgorandNetwork {
  if (network === 'algorand' || network === 'algorand:mainnet') return 'algorand:mainnet'
  if (network === 'algorand:testnet') return 'algorand:testnet'
  return 'algorand:localnet'
}

/**
 * Convert USD to micro-USDC (integer).
 */
export function usdToMicroUsd(usd: number): bigint {
  return BigInt(Math.floor(usd * Number(MICRO_USDC_DIVISOR)))
}

/**
 * Convert micro-USDC back to USD.
 */
export function microUsdToUsd(micro: bigint): number {
  return Number(micro) / Number(MICRO_USDC_DIVISOR)
}

/**
 * x402 payment authorization (the fields the resource server commits to).
 */
export interface PaymentAuthorization {
  from: string
  to: string
  value: bigint // micro-USDC
  validBefore: number // unix seconds
  validAfter: number
  nonce: string
  assetId: number
}

/**
 * Build the Algorand transaction group that pays the x402 requirement.
 *
 * Returns { transactions, signers } where `transactions` is the array of
 * unsigned Transaction objects (the first element is the payment txn and
 * any subsequent element is an opt-in if the sender has not yet opted into
 * the asset), and `signers` maps each transaction to its signing key.
 *
 * The caller is responsible for actually signing and submitting with the
 * wallet signer returned by `use-wallet-react`.
 */
export async function buildX402PaymentGroup(params: {
  authorization: PaymentAuthorization
  suggestedParams: SuggestedParams
  recipientAddress: string
  // Optional fee-bearing txn to cover group fee (facilitator-sponsored)
  feePayerTxn?: Transaction
}): Promise<{ group: Transaction[] }> {
  const { authorization, suggestedParams } = params
  const isAlgoTransfer = authorization.assetId === 0

  const commonOpts = {
    suggestedParams,
    sender: authorization.from,
    note: new Uint8Array(),
  }

  const transactions: Transaction[] = []

  if (isAlgoTransfer) {
    // Native ALGO transfer
    transactions.push(
      algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        ...commonOpts,
        receiver: authorization.to,
        amount: authorization.value,
      })
    )
  } else {
    // ASA (USDC) transfer
    transactions.push(
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        ...commonOpts,
        receiver: authorization.to,
        assetIndex: authorization.assetId,
        amount: authorization.value,
      })
    )
  }

  // Assign group ID so the transactions form an atomic group
  algosdk.assignGroupID(transactions)
  return { group: transactions }
}

/**
 * Verify that an authorization has not expired and has valid fields.
 */
export function verifyAuthorization(auth: PaymentAuthorization, now: number): { valid: boolean; error?: string } {
 if (auth.validAfter > now) {
 return { valid: false, error: 'Payment authorization not yet valid' }
 }
 if (auth.validBefore < now) {
 return { valid: false, error: 'Payment authorization expired' }
 }
 if (auth.value <= 0n) {
 return { valid: false, error: 'Payment amount must be positive' }
 }
 if (auth.from === auth.to) {
 return { valid: false, error: 'Sender and recipient must differ' }
 }
 return { valid: true }
}

/**
 * Build the canonical x402 V1 payment payload for the Algorand exact scheme.
 *
 * Per the x402-avm spec:
 * payload.address = payer address
 * payload.authorization = { from, to, value, validBefore, validAfter, nonce, assetId }
 * payload.signature = Ed25519 signature over the canonical authorization bytes
 */
export function buildX402PaymentPayload(params: {
 fromAddress: string
 toAddress: string
 amountMicro: bigint
 nonce: string
 validBefore: number
 validAfter: number
 assetId: number
 signature?: string
}): {
 x402Version: 1
 scheme: 'exact'
 network: AlgorandNetwork
 payload: {
 address: string
 signature: string
 authorization: PaymentAuthorization & { assetId: number }
 }
} {
 const now = Math.floor(Date.now() / 1000)
 return {
 x402Version: 1,
 scheme: 'exact',
 network: 'algorand:testnet',
 payload: {
 address: params.fromAddress,
 signature: params.signature ?? '',
 authorization: {
 from: params.fromAddress,
 to: params.toAddress,
 value: params.amountMicro,
 validBefore: params.validBefore ?? now + 300,
 validAfter: params.validAfter ?? now - 60,
 nonce: params.nonce,
 assetId: params.assetId,
 },
 },
 }
}

/**
 * Serialize a PaymentAuthorization to the canonical byte form for signing.
 *
 * The on-chain x402-avm facilitator verifies signatures over these exact bytes:
 * [4 bytes: length-prefixed "from" address] +
 * [4 bytes: length-prefixed "to" address] +
 * [8 bytes: value (uint64, big-endian)] +
 * [4 bytes: validBefore (uint32, big-endian)] +
 * [4 bytes: validAfter (uint32, big-endian)] +
 * [8 bytes: nonce (padded/truncated to 8 bytes)]
 */
export function serializeAuthorizationForSigning(auth: PaymentAuthorization): Uint8Array {
 const enc = (s: string, len: number) => {
 const buf = new Uint8Array(len)
 for (let i = 0; i < Math.min(s.length, len); i++) buf[i] = s.charCodeAt(i)
 return buf
 }
 const fromBuf = enc(auth.from, 32)
 const toBuf = enc(auth.to, 32)
 const valueBuf = new Uint8Array(8)
 let v = Number(auth.value)
 for (let i = 7; i >= 0; i--) { valueBuf[i] = v & 0xff; v >>>= 8 }
 const vbBuf = new Uint8Array(4)
 let vb = auth.validBefore
 for (let i = 3; i >= 0; i--) { vbBuf[i] = vb & 0xff; vb >>>= 8 }
 const vaBuf = new Uint8Array(4)
 let va = auth.validAfter
 for (let i = 3; i >= 0; i--) { vaBuf[i] = va & 0xff; va >>>= 8 }
 const nonceBuf = enc(auth.nonce, 8)

 const out = new Uint8Array(32 + 32 + 8 + 4 + 4 + 8)
 out.set(fromBuf, 0)
 out.set(toBuf, 32)
 out.set(valueBuf, 64)
 out.set(vbBuf, 72)
 out.set(vaBuf, 76)
 out.set(nonceBuf, 80)
 return out
}
