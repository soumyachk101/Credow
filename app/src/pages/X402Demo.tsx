import { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { WalletButton } from '@txnlab/use-wallet-ui-react'
import { getAlgorandClient } from '../utils/algorand'
import { x402Service } from '../services/x402'
import { fundWalletWithTestUSDC, optInToUsdc, isOptedInToUsdc, ALGORAND_DISPENSER_URL, CIRCLE_FAUCET_URL } from '../services/circleFaucet'
import { fetchAccountBalance, getUsdcBalance } from '../utils/algorandBalance'
import Navbar from '../components/Navbar'
import { Wallet, Zap, CheckCircle2, XCircle, ArrowDownToLine, ExternalLink, Copy, Shield, Check } from 'lucide-react'

const X402_DEMO_URL = 'https://example.x402.goplausible.xyz'
const ALGO_FAUCET_URL = ALGORAND_DISPENSER_URL

type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed'
type FaucetStatus = 'idle' | 'loading' | 'success' | 'error'

export default function X402Demo() {
 const { activeAddress, transactionSigner } = useWallet()
 const [logs, setLogs] = useState<string[]>([])
 const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle')
 const [paymentTxHash, setPaymentTxHash] = useState('')
 const [paymentError, setPaymentError] = useState('')
 const [faucetStatus, setFaucetStatus] = useState<FaucetStatus>('idle')
 const [faucetLog, setFaucetLog] = useState('')
 const [walletBalance, setWalletBalance] = useState<{ algo: number; usdc: number } | null>(null)
 const [isOptedIn, setIsOptedIn] = useState<boolean | null>(null)
 const [optInLoading, setOptInLoading] = useState(false)

 const pushLog = (msg: string) => setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`])

 const loadBalance = async () => {
 if (!activeAddress) return
 try {
 const balance = await fetchAccountBalance(activeAddress)
 setWalletBalance({
 algo: balance.algoAvailable / 1_000_000,
 usdc: getUsdcBalance(balance),
 })
 const opted = await isOptedInToUsdc(activeAddress)
 setIsOptedIn(opted)
 } catch { /* ignore */ }
 }

 // Direct USDC ASA opt-in
 const handleOptIn = async () => {
 if (!activeAddress || !transactionSigner) {
 setFaucetStatus('error')
 setFaucetLog('Please connect your wallet first')
 return
 }
 setOptInLoading(true)
 setFaucetLog('Signing USDC ASA (10,458,941) opt-in transaction...')
 try {
 const res = await optInToUsdc(activeAddress, transactionSigner)
 if (res.success) {
 setIsOptedIn(true)
 setFaucetStatus('success')
 setFaucetLog(`USDC opt-in confirmed on-chain! Tx: ${res.txHash}`)
 await loadBalance()
 } else {
 setFaucetStatus('error')
 setFaucetLog(`Opt-in failed: ${res.error}`)
 }
 } catch (err: any) {
 setFaucetStatus('error')
 setFaucetLog(err.message)
 } finally {
 setOptInLoading(false)
 }
 }

 // ── Faucet: fund ALGO + USDC + opt-in ──────────────────────────────────────
 const handleRequestFaucet = async () => {
 if (!activeAddress || !transactionSigner) {
 setFaucetStatus('error')
 setFaucetLog('Connect wallet first')
 return
 }

 setFaucetStatus('loading')
 setFaucetLog('Starting setup & funding flow...')
 try {
 const result = await fundWalletWithTestUSDC({
 address: activeAddress,
 signer: transactionSigner,
 onStatus: (msg: string) => setFaucetLog(msg),
 usdcAmount: 10,
 })
 if (result.success) {
 setFaucetStatus('success')
 if (result.optedIn) setIsOptedIn(true)
 setFaucetLog(result.message || `Setup complete! Waiting for ledger refresh...`)
 setTimeout(loadBalance, 5000)
 } else {
 setFaucetStatus('error')
 setFaucetLog(`Notice: ${result.error}`)
 }
 } catch (err: any) {
 setFaucetStatus('error')
 setFaucetLog(err.message)
 }
 }

 // ── x402 payment flow ───────────────────────────────────────────────────────
 const handleX402Payment = async (endpoint: '/avm/weather' | '/avm/protected') => {
 if (!activeAddress || !transactionSigner) {
 setPaymentStatus('failed')
 setPaymentError('Connect Lute wallet first')
 return
 }

 setPaymentStatus('processing')
 setPaymentError('')
 setLogs([])
 setPaymentTxHash('')
 pushLog(`Starting x402 flow for ${X402_DEMO_URL}${endpoint}`)

 const result = await x402Service.fetchWithPayment({
 url: `${X402_DEMO_URL}${endpoint}`,
 activeAddress,
 signer: transactionSigner,
 getAlgodClient: () => getAlgorandClient(),
 onStatus: (msg) => pushLog(msg),
 })

 if (result.success) {
 setPaymentStatus('success')
 setPaymentTxHash(result.txHash || '')
 pushLog(`SUCCESS: ${result.confirmedRound ? `Confirmed round ${result.confirmedRound}` : 'Payment accepted'}`)
 pushLog(`Response: ${JSON.stringify(result.data).slice(0, 200)}`)
 } else {
 setPaymentStatus('failed')
 setPaymentError(result.error || 'Payment failed')
 if (result.requiresFunding) pushLog('ACTION NEEDED: Use the faucet to fund your wallet')
 if (result.requiresOptIn) pushLog('ACTION NEEDED: Opt into USDC first (use faucet)')
 pushLog(`ERROR: ${result.error}`)
 }
 }

 // ── Balance refresh ─────────────────────────────────────────────────────────
 useEffect(() => {
 loadBalance()
 const interval = setInterval(loadBalance, 30_000)
 return () => clearInterval(interval)
 }, [activeAddress])

 return (
 <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
 <Navbar />

 <div className="max-w-5xl mx-auto px-4 py-8">
 {/* Header */}
 <div className="mb-8">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
 <Shield className="w-6 h-6 text-white" />
 </div>
 <div>
 <h1 className="text-3xl font-bold text-gray-900 dark:text-white">x402 Payment Demo</h1>
 <p className="text-sm text-gray-500 dark:text-gray-400">
 GoPlausible testnet server — real 402 responses, real Algorand payments
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
 <ExternalLink className="w-3 h-3" />
 <a
 href="https://github.com/coinbase/x402"
 target="_blank"
 rel="noopener noreferrer"
 className="hover:text-blue-500 underline"
 >
 x402 Protocol Spec
 </a>
 <span className="mx-2">·</span>
 <a
 href="https://example.x402.goplausible.xyz"
 target="_blank"
 rel="noopener noreferrer"
 className="hover:text-blue-500 underline"
 >
 GoPlausible Server
 </a>
 </div>
 </div>

 {/* Wallet + Balance */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-col justify-between">
 <div>
 <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Algorand Wallet</div>
 <div className="text-sm font-mono text-gray-900 dark:text-white truncate">
 {activeAddress ? `${activeAddress.slice(0, 8)}...${activeAddress.slice(-6)}` : 'Not connected'}
 </div>
 </div>
 <div className="mt-3">
 <WalletButton size="sm" />
 </div>
 </div>

 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
 <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ALGO Balance</div>
 <div className="text-2xl font-bold text-gray-900 dark:text-white">
 {walletBalance ? `${walletBalance.algo.toFixed(4)}` : '—'}
 </div>
 <div className="text-xs text-gray-400 mt-1">Gas fees</div>
 </div>

 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
 <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">USDC Balance</div>
 <div className="text-2xl font-bold text-gray-900 dark:text-white">
 {walletBalance ? `$${walletBalance.usdc.toFixed(2)}` : '—'}
 </div>
 <div className="text-xs text-gray-400 mt-1">x402 payments</div>
 </div>
 </div>

        {/* Faucet & TestNet Setup */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-blue-600" />
            TestNet Funding & Setup (3 Steps)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Algorand TestNet requires ALGO for gas fees, opting into USDC ASA (10,458,941), and USDC for payments:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Step 1: ALGO Gas */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Step 1: ALGO Gas</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Needed to pay network fees (0.001 ALGO/tx).
                </p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">
                  Balance: {walletBalance ? `${walletBalance.algo.toFixed(3)} ALGO` : '—'}
                </p>
              </div>
              <a
                href={ALGORAND_DISPENSER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Algorand Dispenser ↗
              </a>
            </div>

            {/* Step 2: USDC Opt-In */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Step 2: USDC Opt-In</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Opt into Circle USDC ASA (10,458,941).
                </p>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Status: {isOptedIn === true ? '✅ Opted In' : isOptedIn === false ? '⚠️ Not Opted In' : 'Checking...'}
                </p>
              </div>
              <button
                onClick={handleOptIn}
                disabled={!activeAddress || isOptedIn === true || optInLoading}
                className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
              >
                {optInLoading ? 'Signing in wallet...' : isOptedIn ? 'Already Opted In' : 'Opt In with Wallet'}
              </button>
            </div>

            {/* Step 3: USDC Funding */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">Step 3: Get USDC</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Claim testnet USDC to pay for x402 endpoints.
                </p>
                <p className="text-xs font-mono text-gray-700 dark:text-gray-300">
                  Balance: {walletBalance ? `$${walletBalance.usdc.toFixed(2)} USDC` : '—'}
                </p>
              </div>
              <a
                href={CIRCLE_FAUCET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Circle USDC Faucet ↗
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleRequestFaucet}
              disabled={!activeAddress || faucetStatus === 'loading'}
              className="px-5 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors text-xs inline-flex items-center gap-2"
            >
              <ArrowDownToLine className="w-4 h-4" />
              {faucetStatus === 'loading' ? 'Running setup...' : 'Auto-Setup Flow'}
            </button>

            {activeAddress && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeAddress)
                  setFaucetLog(`Copied address to clipboard: ${activeAddress}`)
                }}
                className="px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy My Address
              </button>
            )}

            {faucetStatus === 'success' && (
              <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Setup complete
              </span>
            )}
            {faucetStatus === 'error' && (
              <span className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Notice
              </span>
            )}
          </div>

          {faucetLog && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
              {faucetLog}
            </div>
          )}
        </div>

 {/* Payment buttons */}
 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
 <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
 <Zap className="w-5 h-5 text-yellow-600" />
 Make x402 Payment
 </h2>
 <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
 These endpoints cost $0.001 USDC each. Click a button below to trigger
 the full x402 flow: 402 → parse → build txn → sign → submit → retry.
 </p>

 {!activeAddress && (
 <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
 <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
 Connect an Algorand wallet (Lute or Pera) to execute real on-chain x402 payments:
 </span>
 <WalletButton size="sm" />
 </div>
 )}

 <div className="flex flex-wrap gap-3">
 <button
 onClick={() => handleX402Payment('/avm/weather')}
 disabled={paymentStatus === 'processing' || !activeAddress}
 className="px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
 >
 <Zap className="w-4 h-4" />
 {paymentStatus === 'processing' ? 'Processing...' : 'Pay for Weather Data ($0.001)'}
 </button>

 <button
 onClick={() => handleX402Payment('/avm/protected')}
 disabled={paymentStatus === 'processing' || !activeAddress}
 className="px-5 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
 >
 <Shield className="w-4 h-4" />
 {paymentStatus === 'processing' ? 'Processing...' : 'Pay for Protected Page ($0.001)'}
 </button>
 </div>

 {/* Payment result */}
 {paymentStatus === 'success' && (
 <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
 <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
 <CheckCircle2 className="w-5 h-5" />
 <span className="font-medium">Payment Successful</span>
 </div>
 {paymentTxHash && (
 <div className="text-sm text-gray-600 dark:text-gray-300">
 Tx Hash: <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{paymentTxHash}</code>
 <button
 onClick={() => navigator.clipboard.writeText(paymentTxHash)}
 className="ml-2 text-blue-600 hover:text-blue-800"
 >
 <Copy className="w-3 h-3 inline" />
 </button>
 {' '}
 <a
 href={`https://testnet.explorer.algorand.org/tx/${paymentTxHash}`}
 target="_blank"
 rel="noopener noreferrer"
 className="text-blue-600 hover:text-blue-800 underline text-xs"
 >
 View on Explorer →
 </a>
 </div>
 )}
 </div>
 )}

 {paymentStatus === 'failed' && paymentError && (
 <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
 <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
 <XCircle className="w-5 h-5" />
 <span className="font-medium">Payment Failed</span>
 </div>
 <p className="text-sm text-red-600 dark:text-red-300 mt-1">{paymentError}</p>
 </div>
 )}
 </div>

 {/* Live log */}
 {logs.length > 0 && (
 <div className="bg-gray-900 rounded-xl shadow-sm border border-gray-700 p-4 mb-6">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-medium text-gray-400">Live Transaction Log</h3>
 <button
 onClick={() => setLogs([])}
 className="text-xs text-gray-500 hover:text-gray-300"
 >
 Clear
 </button>
 </div>
 <div className="max-h-64 overflow-y-auto space-y-1">
 {logs.map((log, i) => (
 <div key={i} className="text-xs font-mono text-gray-300 leading-relaxed">
 {log}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* How it works */}
 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
 <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">How x402 Works</h2>
 <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
 {[
 { step: '1', title: 'Request', desc: 'Browser GETs a paid endpoint' },
 { step: '2', title: '402', desc: 'Server returns 402 + x402 requirements' },
 { step: '3', title: 'Build', desc: 'Client builds USDC transfer txn on Algorand' },
 { step: '4', title: 'Sign + Submit', desc: 'Lute wallet signs, tx goes on-chain' },
 { step: '5', title: 'Retry', desc: 'Client retries with X-PAYMENT-SIGNATURE header' },
 ].map(s => (
 <div key={s.step} className="flex flex-col items-center text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
 <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mb-2">
 {s.step}
 </div>
 <div className="font-medium text-gray-900 dark:text-white">{s.title}</div>
 <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.desc}</div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 )
}
