/**
 * x402 Payment Protocol — Algorand exact scheme
 *
 * Real client that:
 * 1. Fetches a URL → detects 402 Payment Required
 * 2. Parses x402 payment requirements from the response
 * 3. Builds a USDC transfer transaction on Algorand testnet
 * 4. Signs with Lute wallet (use-wallet-react)
 * 5. Submits to Algorand, polls for confirmation
 * 6. Retries the original request with X-PAYMENT-SIGNATURE header
 *
 * Server: https://example.x402.goplausible.xyz
 * Docs: https://github.com/coinbase/x402
 */

import algosdk, { type Transaction } from 'algosdk'
import { usdToMicroUsd } from '../utils/algorandPayment'

// ── Types ────────────────────────────────────────────────────────────────────

export interface X402PaymentRequirement {
  x402Version: number
  error?: string
  resource?: { url: string; description?: string; mimeType?: string }
  accepts: PaymentOption[]
  extensions?: Record<string, any>
}

export interface X402PaymentPayload {
  x402Version: number
  scheme?: string
  network?: string
  payload?: any
  accepts?: any[]
}

export interface PaymentOption {
  scheme: string
  network: string
  amount: string
  asset: string
  payTo: string
  maxTimeoutSeconds: number
  extra?: Record<string, any>
}

export interface X402PaymentResult {
  success: boolean
  txHash?: string
  confirmedRound?: number
  data?: any
  error?: string
  requiresFunding?: boolean
  requiresOptIn?: boolean
}

// ── x402 service ─────────────────────────────────────────────────────────────

export class X402Service {
  private readonly algod: algosdk.Algodv2

  constructor(config: {
    algodServer: string
    algodPort: string | number
    algodToken: string
  }) {
    this.algod = new algosdk.Algodv2(config.algodToken, config.algodServer, Number(config.algodPort))
  }

  // -----------------------------------------------------------------------
  // Core: fetch with automatic 402 → payment → retry
  // -----------------------------------------------------------------------

  /**
   * Make an HTTP request with automatic x402 payment handling.
   *
   * If the server returns 402, this method:
   * 1. Parses the x402 requirements
   * 2. Builds a USDC transfer for Algorand
   * 3. Signs with Lute wallet via `signer` callback
   * 4. Submits to Algorand, waits for confirmation
   * 5. Retries the original request with payment proof header
   */
  async fetchWithPayment(params: {
    url: string
    options?: RequestInit
    activeAddress: string
    signer: (txns: any[], indices: number[]) => Promise<Uint8Array[]>
    onStatus?: (msg: string) => void
    getAlgodClient?: () => any
  }): Promise<X402PaymentResult> {
    try {
      if (params.onStatus) params.onStatus('Requesting resource...')
      const response = await fetch(params.url, params.options)

      if (response.status !== 402) {
        let data
        try {
          data = await response.json()
        } catch {
          data = { text: await response.text() }
        }
        return { success: true, data }
      }

      if (params.onStatus) params.onStatus('Payment required — parsing requirements...')
      const requirements = await this.parse402Response(response)

      if (!requirements) {
        return { success: false, error: 'Could not parse x402 requirements from 402 response' }
      }

      const avmReq = requirements.accepts.find(a => a.network.startsWith('algorand:'))
      if (!avmReq) {
        return {
          success: false,
          error: `No Algorand option. Networks: ${requirements.accepts.map(a => a.network).join(', ')}`,
        }
      }

      if (params.onStatus) params.onStatus(`Building ${avmReq.amount} micro-USDC payment...`)
      const paymentResult = await this.submitPayment(avmReq, params)

      if (!paymentResult.success) {
        return paymentResult
      }

      if (params.onStatus) params.onStatus('Retrying with payment proof...')
      const retryResult = await this.retryRequest(params.url, params.options, paymentResult.txHash!, avmReq, params.activeAddress)

      if (retryResult.success) {
        return {
          success: true,
          txHash: paymentResult.txHash,
          confirmedRound: paymentResult.confirmedRound,
          data: retryResult.data,
        }
      }

      return { success: false, error: retryResult.error || 'Retry failed after payment' }
    } catch (err: any) {
      return { success: false, error: err.message || 'x402 flow failed' }
    }
  }

  // -----------------------------------------------------------------------
  // Parse 402 response — handles both header and body formats
  // -----------------------------------------------------------------------

  private async parse402Response(response: Response): Promise<X402PaymentRequirement | null> {
    // Header: X-PAYMENT-REQUIRED or PAYMENT-REQUIRED (base64-encoded JSON)
    const header = response.headers.get('X-PAYMENT-REQUIRED') || response.headers.get('PAYMENT-REQUIRED')
    if (header) {
      try {
        const decoded = JSON.parse(atob(header))
        return decoded
      } catch {
        try { return JSON.parse(header) } catch { /* try body */ }
      }
    }

    // Body: HTML with data-requirements attribute (goplausible format)
    const text = await response.text()

    // Try JSON body first
    try { return JSON.parse(text) } catch { /* try HTML */ }

    // Parse data-requirements from HTML
    const match = text.match(/data-requirements="([^"]+)"/)
    if (match) {
      try {
        return JSON.parse(match[1])
      } catch {
        // HTML-escaped JSON
        try {
          const unescaped = match[1].replace(/&quot;/g, '"').replace(/\\&quot;/g, '"')
          return JSON.parse(unescaped)
        } catch { return null }
      }
    }

    return null
  }

  // -----------------------------------------------------------------------
  // Build, sign, submit, confirm payment
  // -----------------------------------------------------------------------

  private async submitPayment(req: PaymentOption, params: {
    url: string
    activeAddress: string
    signer: (txns: any[], indices: number[]) => Promise<Uint8Array[]>
    onStatus?: (msg: string) => void
  }): Promise<X402PaymentResult> {
    try {
      const algod = this.algod
      const suggested = await algod.getTransactionParams().do()

      const amountMicro = BigInt(req.amount)
      const assetId = Number(req.asset)

      // Build ASA (USDC) transfer transaction
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: params.activeAddress,
        receiver: req.payTo,
        assetIndex: assetId,
        amount: amountMicro,
        suggestedParams: suggested,
        note: new Uint8Array(Buffer.from(JSON.stringify({
          endpoint: params.url,
          network: req.network,
          x402: true,
        }))),
      })

      // Assign group ID
      algosdk.assignGroupID([txn])

      if (params.onStatus) params.onStatus('Awaiting wallet signature...')
      const signedBytes = await params.signer([txn], [0])

      if (params.onStatus) params.onStatus('Submitting to Algorand...')
      const { txid } = await algod.sendRawTransaction(signedBytes[0]!).do()

      if (params.onStatus) params.onStatus('Waiting for confirmation...')
      const confirmedRound = await this.waitForConfirmation(txid, algod)

      return { success: true, txHash: txid, confirmedRound }
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('underflow') || msg.includes('balance') || msg.includes('AssetBalance')) {
        return { success: false, error: 'Insufficient USDC balance. Use the faucet to fund your wallet.', requiresFunding: true }
      }
      if (msg.includes('opt') || msg.includes('AssetError')) {
        return { success: false, error: 'Wallet not opted into USDC. Use the faucet to opt in.', requiresOptIn: true }
      }
      return { success: false, error: msg }
    }
  }

  // -----------------------------------------------------------------------
  // Wait for on-chain confirmation
  // -----------------------------------------------------------------------

  private async waitForConfirmation(txid: string, algod: algosdk.Algodv2): Promise<number | undefined> {
    try {
      const confirmed = await algosdk.waitForConfirmation(algod, txid, 4)
      return confirmed.confirmedRound ? Number(confirmed.confirmedRound) : undefined
    } catch {
      return undefined
    }
  }

  // -----------------------------------------------------------------------
  // Retry original request with payment proof header
  // -----------------------------------------------------------------------

  private async retryRequest(
    url: string,
    options: RequestInit | undefined,
    txHash: string,
    req: PaymentOption,
    payerAddress: string = ''
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const paymentPayload = {
        x402Version: 2,
        scheme: req.scheme,
        network: req.network,
        payload: {
          address: payerAddress,
          signature: txHash,
          authorization: {
            from: payerAddress,
            to: req.payTo,
            value: req.amount,
            validBefore: Math.floor(Date.now() / 1000) + 300,
            validAfter: Math.floor(Date.now() / 1000) - 60,
            nonce: `x402-${Date.now()}`,
            assetId: Number(req.asset),
          },
        },
      }

      const payloadB64 = btoa(JSON.stringify(paymentPayload))

      const headers: Record<string, string> = {
        'X-PAYMENT-SIGNATURE': payloadB64,
      }
      if (options?.headers) {
        const existing = typeof options.headers === 'string' ? {} : { ...options.headers }
        Object.assign(headers, existing)
      }

      const response = await fetch(url, { ...options, headers })

      if (response.status === 402) {
        return { success: false, error: 'Payment not accepted' }
      }
      if (!response.ok) {
        return { success: false, error: `Server returned ${response.status}` }
      }

      let data
      try {
        data = await response.json()
      } catch {
        data = { text: await response.text() }
      }
      return { success: true, data }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const x402Service = new X402Service({
  algodServer: import.meta.env.VITE_ALGOD_SERVER ?? 'https://testnet-api.4160.nodely.dev',
  algodPort: import.meta.env.VITE_ALGOD_PORT ?? '443',
  algodToken: import.meta.env.VITE_ALGOD_TOKEN ?? 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
})
