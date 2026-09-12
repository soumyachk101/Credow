/**
 * Algorand account balance helpers — ALGO and ASA holdings.
 *
 * Uses the Algorand Indexer for asset lookups (no KeyManager needed).
 */

import { getAlgorandClient, getNetwork } from './algorand'

export interface AccountBalance {
 address: string
 algoBalance: number // micro-ALGO
 algoAvailable: number // micro-ALGO (excluding min balance + locked)
 assets: Array<{
 assetId: number
 unitName: string
 amount: number // raw (6 decimals for USDC)
 decimals: number
 isOptedIn: boolean
 }>
}

/**
 * Fetch ALGO and USDC balances for an address on the current network.
 */
export async function fetchAccountBalance(address: string): Promise<AccountBalance> {
  const client = getAlgorandClient()
  const algod = client.client.algod

  try {
    const info: any = await algod.accountInformation(address).do()
    const algoBalance = Number(info.amount ?? 0)
    const minBalance = Number(info.minBalance ?? info['min-balance'] ?? 0)
    const rawAssets = info.assets ?? info['assets'] ?? []
    const assets = rawAssets.map((a: any) => ({
      assetId: Number(a['asset-id'] ?? a.assetId),
      unitName: a['unit-name'] ?? '',
      amount: Number(a.amount ?? 0),
      decimals: Number(a.decimals ?? 6),
      isOptedIn: true,
    }))

    return {
      address,
      algoBalance,
      algoAvailable: Math.max(0, algoBalance - minBalance),
      assets,
    }
  } catch {
    // Fallback to Indexer
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
      const rawAssets = info.account?.assets ?? []
      const assets = rawAssets.map((a: any) => ({
        assetId: Number(a['asset-id']),
        unitName: a['unit-name'] ?? '',
        amount: Number(a.amount ?? 0),
        decimals: Number(a.decimals ?? 6),
        isOptedIn: true,
      }))

      return {
        address,
        algoBalance,
        algoAvailable: Math.max(0, algoBalance - minBalance),
        assets,
      }
    } catch {
      return { address, algoBalance: 0, algoAvailable: 0, assets: [] }
    }
  }
}

export function isOptedInUsdc(balance: AccountBalance): boolean {
  return balance.assets.some(
    a => a.assetId === 10_458_941 || a.assetId === 31_566_704 || a.unitName.toUpperCase() === 'USDC'
  )
}

export function getUsdcBalance(balance: AccountBalance): number {
  const usdc = balance.assets.find(
    a => a.assetId === 10_458_941 || a.assetId === 31_566_704 || a.unitName.toUpperCase() === 'USDC'
  )
  if (!usdc) return 0
  return usdc.amount / 10 ** usdc.decimals
}

export function hasSufficientUsdc(balance: AccountBalance, requiredUsd: number): boolean {
 return getUsdcBalance(balance) >= requiredUsd
}
