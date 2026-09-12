/**
 * Circle USDC Testnet Faucet
 *
 * Uses Circle's official developer-controlled wallet testnet faucet
 * to fund Lute wallet addresses with test USDC for x402 payments.
 *
 * Also funds ALGO gas from public testnet faucets and handles
 * USDC opt-in for fresh wallets.
 *
 * Docs: https://developers.circle.com/wallets/reference/post_v1_businessAccount_testnet_addresses_address_usdc_faucet
 */

import algosdk from 'algosdk'

import { USDC_ASSET_ID } from '../utils/algorandPayment'

export const ALGORAND_DISPENSER_URL = 'https://lora.algokit.io/testnet/fund'
export const CIRCLE_FAUCET_URL = 'https://faucet.circle.com'

const CIRCLE_FAUCET_BASE = 'https://api.circle.com/v1/businessAccount/testnet'

// Public Algorand testnet faucets that dispense ALGO for gas fees
const ALGO_FAUCETS = [
 'https://testnet-faucet.matlabs.io',
 'https://testnet-api.4160.nodely.dev',
]

export interface FaucetResult {
 success: boolean
 txHash?: string
 amount?: number
 error?: string
}

export interface FaucetStatus {
 success: boolean
 data?: {
 id: string
 status: 'pending' | 'running' | 'complete' | 'failed'
 amount: { amount: string; currency: string }
 transaction: { hash: string }
 address: string
 createdAt: string
 updatedAt: string
 }
 error?: string
}

/**
 * Request ALGO from a public testnet faucet.
 * Tries multiple faucets sequentially.
 */
async function requestAlgoFromFaucet(address: string, amountMicro: number = 10_000_000): Promise<FaucetResult> {
 for (const faucet of ALGO_FAUCETS) {
 try {
 const response = await fetch(faucet, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ address, amount: amountMicro }),
 })

 if (response.ok) {
 const data = await response.json().catch(() => ({}))
 return {
 success: true,
 amount: amountMicro / 1_000_000,
 txHash: data.txid ?? data.txHash ?? data.transaction?.hash,
 }
 }
 } catch {
 // try next faucet
 }
 }
 return { success: false, error: 'All ALGO faucets failed. Try again later or fund manually.' }
}

/**
 * Request USDC from Circle's testnet faucet.
 *
 * Requires VITE_CIRCLE_API_KEY set in environment.
 * The address must be on Algorand testnet and opted into USDC (ASA 31566704).
 */
export async function requestCircleFaucet(
 address: string,
 amount: number = 10
): Promise<FaucetResult> {
 const apiKey = import.meta.env.VITE_CIRCLE_API_KEY

 if (!apiKey) {
 return { success: false, error: 'Circle API key not configured (VITE_CIRCLE_API_KEY)' }
 }

 if (!address || address.length < 50) {
 return { success: false, error: 'Invalid Algorand address' }
 }

 try {
 const response = await fetch(
 `${CIRCLE_FAUCET_BASE}/addresses/${encodeURIComponent(address)}/usdc/faucet`,
 {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${apiKey}`,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 amount: { amount: String(amount), currency: 'USD' },
 destinationAddress: address,
 chain: 'ALGO',
 token: 'USDC',
 }),
 }
 )

 if (!response.ok) {
 const errText = await response.text()
 console.error('Circle faucet error:', response.status, errText)
 return {
 success: false,
 error: `Faucet request failed (${response.status}): ${errText.slice(0, 200)}`,
 }
 }

 const data = await response.json()
 return {
 success: true,
 amount: data.data?.amount?.amount ? parseFloat(data.data.amount.amount) : amount,
 txHash: data.data?.transaction?.hash,
 }
 } catch (err: any) {
 console.error('Circle faucet exception:', err)
 return { success: false, error: err.message || 'Network error' }
 }
}

/**
 * Check the status of a previously submitted Circle faucet request.
 */
export async function checkCircleFaucetStatus(
 address: string,
 faucetId: string
): Promise<FaucetStatus> {
 const apiKey = import.meta.env.VITE_CIRCLE_API_KEY

 if (!apiKey) {
 return { success: false, error: 'Circle API key not configured' }
 }

 try {
 const response = await fetch(
 `${CIRCLE_FAUCET_BASE}/faucetRequests?address=${encodeURIComponent(address)}&id=${encodeURIComponent(faucetId)}`,
 {
 headers: { 'Authorization': `Bearer ${apiKey}` },
 }
 )

 if (!response.ok) {
 const errText = await response.text()
 return { success: false, error: errText.slice(0, 200) }
 }

 const data = await response.json()
 return { success: true, data }
 } catch (err: any) {
 return { success: false, error: err.message }
 }
}

/**
 * Lightweight ALGO balance check.
 */
async function fetchAccountBalanceForGas(address: string): Promise<{ algoAvailable: number }> {
 try {
 const { Indexer } = await import('algosdk')
 const indexer = new Indexer(
 import.meta.env.VITE_INDEXER_TOKEN ?? '',
 import.meta.env.VITE_INDEXER_SERVER ?? 'https://testnet-idx.4160.nodely.dev',
 Number(import.meta.env.VITE_INDEXER_PORT ?? 443)
 )

 const info = await indexer.lookupAccountByID(address).do()
 const algoBalance = Number(info.account?.amount ?? 0)
 const minBalance = Number((info.account as any)?.minBalance ?? (info.account as any)?.['min-balance'] ?? 0)
 return { algoAvailable: Math.max(0, algoBalance - minBalance) }
 } catch {
 return { algoAvailable: 0 }
 }
}

/**
 * Check if an address is opted into USDC (ASA 10,458,941).
 */
export async function isOptedInToUsdc(address: string): Promise<boolean> {
  if (!address) return false
  try {
    const algodClient = new algosdk.Algodv2(
      import.meta.env.VITE_ALGOD_TOKEN ?? '',
      import.meta.env.VITE_ALGOD_SERVER ?? 'https://testnet-api.4160.nodely.dev',
      Number(import.meta.env.VITE_ALGOD_PORT ?? 443)
    )
    const info = await algodClient.accountInformation(address).do()
    const assets = (info.assets ?? info['assets'] ?? []) as any[]
    return assets.some((a: any) => Number(a['asset-id'] ?? a.assetId) === USDC_ASSET_ID)
  } catch {
    try {
      const { Indexer } = await import('algosdk')
      const indexer = new Indexer(
        import.meta.env.VITE_INDEXER_TOKEN ?? '',
        import.meta.env.VITE_INDEXER_SERVER ?? 'https://testnet-idx.4160.nodely.dev',
        Number(import.meta.env.VITE_INDEXER_PORT ?? 443)
      )
      const info = await indexer.lookupAccountByID(address).do()
      const assets = info.account?.assets ?? []
      return assets.some((a: any) => Number(a['asset-id']) === USDC_ASSET_ID)
    } catch {
      return false
    }
  }
}

/**
 * Opt into USDC (ASA 10,458,941) by sending a zero-amount asset transfer to self.
 * This is the standard Algorand opt-in pattern.
 * Requires the wallet's transactionSigner to sign and submit.
 */
export async function optInToUsdc(
  address: string,
  signer?: (txns: any[], indices: number[]) => Promise<Uint8Array[]>
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!signer) {
    return { success: false, error: 'Signer required for opt-in. Please connect your wallet.' }
  }
  try {
    const algodClient = new algosdk.Algodv2(
      import.meta.env.VITE_ALGOD_TOKEN ?? '',
      import.meta.env.VITE_ALGOD_SERVER ?? 'https://testnet-api.4160.nodely.dev',
      Number(import.meta.env.VITE_ALGOD_PORT ?? 443)
    )

    // Check if account has enough ALGO for minimum balance (0.1 ALGO MBR + 0.001 fee)
    try {
      const acctInfo = await algodClient.accountInformation(address).do()
      const algoBalance = Number(acctInfo.amount ?? 0)
      if (algoBalance < 101_000) {
        return {
          success: false,
          error: 'Your wallet has less than 0.101 ALGO. Opting into an ASA requires 0.101 ALGO for minimum balance and fee. Get free ALGO from the Algorand Dispenser first.',
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('404') || e?.status === 404) {
        return {
          success: false,
          error: 'Account not yet funded on Algorand TestNet. Get free ALGO from the Algorand Dispenser (https://lora.algokit.io/testnet/fund) first.',
        }
      }
    }

    const suggested = await algodClient.getTransactionParams().do()

    const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: address, // send to self = opt-in
      assetIndex: USDC_ASSET_ID,
      amount: 0,
      suggestedParams: suggested,
    })

    algosdk.assignGroupID([optInTxn])

    const signedBytes = await signer([optInTxn], [0])
    const { txid } = await algodClient.sendRawTransaction(signedBytes[0]!).do()

    // Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txid, 4)
    return { success: true, txHash: txid }
  } catch (err: any) {
    console.error('USDC opt-in error:', err)
    return { success: false, error: err.message || 'Opt-in failed' }
  }
}

/**
 * Lightweight ALGO balance check — just enough to know if we need gas funding.
 */
async function fetchAlgoBalance(address: string): Promise<{ algoAvailable: number }> {
  try {
    const algodClient = new algosdk.Algodv2(
      import.meta.env.VITE_ALGOD_TOKEN ?? '',
      import.meta.env.VITE_ALGOD_SERVER ?? 'https://testnet-api.4160.nodely.dev',
      Number(import.meta.env.VITE_ALGOD_PORT ?? 443)
    )
    const info = await algodClient.accountInformation(address).do()
    const algoBalance = Number(info.amount ?? 0)
    const minBalance = Number((info as any).minBalance ?? (info as any)['min-balance'] ?? 0)
    return { algoAvailable: Math.max(0, algoBalance - minBalance) }
  } catch {
    return { algoAvailable: 0 }
  }
}

/**
 * Full testnet funding flow:
 * 1. Check/fund ALGO gas
 * 2. Opt into USDC if not already opted in
 * 3. Request USDC from Circle faucet or provide direct faucet link
 */
export async function fundWalletForX402(params: {
  address: string
  signer?: (txns: any[], indices: number[]) => Promise<Uint8Array[]>
  onStatus?: (msg: string) => void
  usdcAmount?: number
}): Promise<FaucetResult & { optedIn?: boolean; message?: string }> {
  const { address, signer, onStatus, usdcAmount = 10 } = params

  // Step 1: Ensure the wallet has ALGO for gas
  if (onStatus) onStatus('Checking ALGO balance for gas...')

  const balance = await fetchAlgoBalance(address)
  const algoAvailable = balance.algoAvailable / 1_000_000

  if (algoAvailable < 0.01) {
    if (onStatus) onStatus('Insufficient ALGO. Please get free ALGO from the Algorand Dispenser.')
    return {
      success: false,
      error: 'Wallet needs ALGO for gas fees. Claim 10 free ALGO from the Algorand Dispenser: https://lora.algokit.io/testnet/fund',
      optedIn: false,
    }
  }

  if (onStatus) onStatus(`ALGO balance OK: ${algoAvailable.toFixed(4)} ALGO`)

  // Step 2: Check USDC opt-in status
  if (onStatus) onStatus('Checking USDC (ASA 10,458,941) opt-in status...')

  let optedIn = false
  try {
    optedIn = await isOptedInToUsdc(address)

    if (!optedIn) {
      if (signer) {
        if (onStatus) onStatus('Wallet not opted into USDC — please approve the opt-in transaction in your wallet...')
        const optInResult = await optInToUsdc(address, signer)
        if (optInResult.success) {
          optedIn = true
          if (onStatus) onStatus(`USDC opt-in confirmed on-chain (tx: ${optInResult.txHash?.slice(0, 16)}...)`)
        } else {
          return {
            success: false,
            error: optInResult.error,
            optedIn: false,
          }
        }
      } else {
        return {
          success: false,
          error: 'Please connect your wallet to sign the USDC opt-in transaction.',
          optedIn: false,
        }
      }
    } else {
      if (onStatus) onStatus('Wallet is already opted into USDC (ASA 10,458,941)')
    }
  } catch (err: any) {
    if (onStatus) onStatus(`Opt-in check notice: ${err.message}`)
  }

  // Step 3: Try Circle faucet API or provide direct faucet link
  if (onStatus) onStatus('Requesting USDC testnet funds...')
  const result = await requestCircleFaucet(address, usdcAmount)

  if (result.success) {
    if (onStatus) onStatus(`USDC faucet request submitted: ${result.amount ?? usdcAmount} USDC sent!`)
    return { ...result, optedIn }
  }

  // If automated Circle API returns 404/error, inform user honestly
  if (optedIn) {
    if (onStatus) onStatus('Wallet opted into USDC ASA! (Circle deprecated Algorand faucet; acquire USDC via TestNet DEX or peer transfer)')
    return {
      success: false,
      amount: 0,
      optedIn: true,
      error: 'Circle has deprecated USDC faucet on Algorand. Your wallet is opted into ASA 10,458,941, but USDC must be obtained via TestNet DEX (e.g. Tinyman/Pact) or transferred from a funded account.',
      message: 'Wallet opted into USDC ASA (10,458,941) on-chain. Circle no longer distributes Algorand USDC.',
    }
  }

  return { ...result, optedIn }
}

export async function fundWalletWithTestUSDC(
  addressOrParams: string | { address: string; signer?: (txns: any[], indices: number[]) => Promise<Uint8Array[]>; onStatus?: (msg: string) => void; usdcAmount?: number },
  amountOrSigner?: number | any,
  onStatus?: (msg: string) => void
): Promise<FaucetResult & { optedIn?: boolean; message?: string }> {
  if (typeof addressOrParams === 'string') {
    return fundWalletForX402({
      address: addressOrParams,
      usdcAmount: typeof amountOrSigner === 'number' ? amountOrSigner : 10,
      onStatus,
    })
  }
  return fundWalletForX402(addressOrParams)
}
