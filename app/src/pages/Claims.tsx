import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useAllocationStore } from '@/stores/allocationStore'
import { usePaymentStore } from '@/stores/paymentStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
 Wallet,
 Zap,
 ArrowDownToLine,
 Shield,
 Copy,
 RefreshCw,
 CheckCircle2,
 XCircle,
 Clock,
 ArrowRight,
 ChevronDown,
} from 'lucide-react'
import { useWallet } from '@txnlab/use-wallet-react'
import { WalletButton } from '@txnlab/use-wallet-ui-react'
import type { PaymentRecord } from '@/lib/types'
import {
 createPaymentRequest,
 submitPaymentProof,
 verifyTransaction,
 fetchPaymentRecords as apiFetchPaymentRecords,
} from '@/app/api/payments/index'
import { x402Service } from '@/services/x402'
import { fundWalletForX402 } from '@/services/circleFaucet'
import { validateCredits, formatCurrency } from '@/utils/x402'
import { fetchAccountBalance, getUsdcBalance, isOptedInUsdc } from '@/utils/algorandBalance'
import { getAlgorandClient, getNetwork } from '@/utils/algorand'
import { USDC_ASSET_ID } from '@/utils/algorandPayment'
import algosdk from 'algosdk'

const fmtCurrency = formatCurrency

const SERVICES = [
 { id: 'data-enrichment', name: 'Data Enrichment API', cost: 5.00 },
 { id: 'webhook-delivery', name: 'Webhook Delivery Service', cost: 2.50 },
 { id: 'batch-processor', name: 'Batch Processing Engine', cost: 10.00 },
 { id: 'ml-inference', name: 'ML Inference API', cost: 0.10 },
 { id: 'storage-gateway', name: 'Storage Gateway', cost: 0.05 },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
 return <h2 className="text-base font-medium text-white/80 mb-4">{children}</h2>
}

export default function Claims() {
 const { user } = useAuthStore()
 const { allocations, fetchAllocations, claimCredits } = useAllocationStore()
 const { createPaymentRecord, updatePaymentStatus, fetchPaymentRecords, paymentRecords } = usePaymentStore()
 const { transactionSigner, activeAddress } = useWallet()

 const [employees, setEmployees] = useState<any[]>([])
 const [teams, setTeams] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [showPaymentModal, setShowPaymentModal] = useState(false)
 const [currentAllocation, setCurrentAllocation] = useState<any>(null)

 // x402 form state
 const [paymentService, setPaymentService] = useState('')
 const [paymentAmount, setPaymentAmount] = useState('')
 const [paymentLoading, setPaymentLoading] = useState(false)
 const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle')
 const [paymentTxHash, setPaymentTxHash] = useState('')
 const [paymentError, setPaymentError] = useState('')
 const [retryingPaymentId, setRetryingPaymentId] = useState<string | null>(null)
 const [log, setLog] = useState<string[]>([])
 const [walletBalance, setWalletBalance] = useState<{ algo: number; usdc: number; isOptedIn: boolean } | null>(null)
 const [balanceLoading, setBalanceLoading] = useState(false)
 const [faucetLoading, setFaucetLoading] = useState(false)
 const [faucetStatus, setFaucetStatus] = useState('')

 const isEmployee = user?.role === 'employee'
 const [viewMode, setViewMode] = useState<'employee' | 'management'>(isEmployee ? 'employee' : 'management')

 useEffect(() => {
   setViewMode(isEmployee ? 'employee' : 'management')
 }, [isEmployee])

 const myAllocs = allocations.filter(a => {
   if (user?.employee_id && a.employee_id === user.employee_id) return true
   if (user?.id && a.employee_id === user.id) return true
   if (user?.email && a.employee?.email && a.employee.email.toLowerCase() === user.email.toLowerCase()) return true
   return false
 })
 const displayAllocs = myAllocs.length > 0 ? myAllocs : allocations
 const myRecords = paymentRecords.filter(r => displayAllocs.some(a => a.id === r.allocation_id) || !r.allocation_id)

 const pushLog = (msg: string) => setLog(l => [...l, `[${new Date().toLocaleTimeString()}] ${msg}`])

 useEffect(() => {
 if (!user?.company_id) return
 const companyId = user.company_id
 const loadData = async () => {
 setLoading(true)
 try {
 await fetchAllocations(companyId)
 const { data: empData } = await supabase.from('employees').select('*').eq('company_id', companyId); setEmployees(empData || [])
 const { data: teamData } = await supabase.from('teams').select('*').eq('company_id', companyId); setTeams(teamData || [])
 if (allocations.length > 0) {
 await Promise.all(allocations.map(a => fetchPaymentRecords(a.id)))
 }
 } catch (err) { console.error('Error loading claims data:', err) }
 finally { setLoading(false) }
 }
 loadData()
 }, [user?.company_id, fetchAllocations, fetchPaymentRecords, allocations.length])

 const loadBalance = async () => {
   if (!activeAddress) return
   setBalanceLoading(true)
   try {
     const balance = await fetchAccountBalance(activeAddress)
     setWalletBalance({
       algo: balance.algoAvailable / 1_000_000,
       usdc: getUsdcBalance(balance),
       isOptedIn: isOptedInUsdc(balance),
     })
   } catch { /* silent */ }
   finally { setBalanceLoading(false) }
 }

 useEffect(() => {
   loadBalance()
   const interval = setInterval(loadBalance, 30000)
   return () => clearInterval(interval)
 }, [activeAddress])

 const handleRequestFaucet = async () => {
   if (!activeAddress || !transactionSigner) { setFaucetStatus('Connect wallet first'); return }
   setFaucetLoading(true)
   setFaucetStatus('')
   try {
     const result = await fundWalletForX402({ address: activeAddress, signer: transactionSigner, onStatus: setFaucetStatus, usdcAmount: 10 })
     if (result.success && result.txHash) {
       setFaucetStatus(`USDC received on-chain! Tx: ${result.txHash.slice(0, 16)}...`)
     } else if (result.optedIn) {
       setFaucetStatus(`Wallet opted into USDC (ASA ${USDC_ASSET_ID}) on-chain! Note: Circle deprecated Algorand faucet. Swap testnet ALGO on Tinyman TestNet or transfer from a funded account.`)
     } else {
       setFaucetStatus(result.error || 'Setup incomplete')
     }
     await loadBalance()
   } finally { setFaucetLoading(false) }
 }

 const openPaymentModal = (allocation: any) => {
 setCurrentAllocation(allocation)
 setPaymentService('')
 setPaymentAmount('')
 setPaymentStatus('idle')
 setPaymentError('')
 setPaymentTxHash('')
 setLog([])
 setShowPaymentModal(true)
 }

  const handleX402Payment = async () => {
    if (!currentAllocation || !paymentService || !paymentAmount) return

    if (!activeAddress || !transactionSigner) {
      setPaymentError('Wallet not connected. Connect your Lute or Pera wallet to execute real on-chain x402 payments. Simulation is disabled.')
      return
    }

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) { setPaymentError('Please enter a valid amount'); return }
    if (amount > (currentAllocation.unclaimed_credits ?? currentAllocation.amount ?? 0)) {
      setPaymentError('Insufficient unclaimed credits')
      return
    }

    setPaymentLoading(true)
    setPaymentError('')
    setPaymentStatus('processing')
    setLog([])

    try {
      pushLog(`Initiating on-chain x402 payment: $${amount.toFixed(2)} USDC...`)

      // Step 1: Request payment from backend if running
      let paymentId = `pay-${Date.now()}`
      try {
        pushLog('Requesting payment from backend...')
        const x402Response = await createPaymentRequest({ allocation_id: currentAllocation.id, service_id: paymentService, amount })
        if ((x402Response as any)?.data?.payment_id) {
          paymentId = (x402Response as any).data.payment_id
        }
      } catch (_) {
        pushLog('Direct on-chain x402 settlement mode')
      }

      // Step 2: Build real USDC ASA transfer transaction
      const algod = getAlgorandClient().client.algod
      const suggested = await algod.getTransactionParams().do()
      const amountMicro = Math.floor(amount * 1_000_000)
      pushLog(`Building USDC transfer (ASA ${USDC_ASSET_ID}): ${amountMicro} micro-USDC`)

      const X402_TESTNET_PAY_TO = 'MPY54CLPH2OKEGC6S5N2LDAFDNO5BVNV532NBZ5VD6GOND3STPNXZYXOFE'
      const isValidAlgo = (a: string) => typeof a === 'string' && a.length === 58 && /^[A-Z2-7]{58}$/.test(a)
      const recipient = (currentAllocation.company_wallet && isValidAlgo(currentAllocation.company_wallet))
        ? currentAllocation.company_wallet
        : (currentAllocation.company?.wallet_address && isValidAlgo(currentAllocation.company.wallet_address))
          ? currentAllocation.company.wallet_address
          : X402_TESTNET_PAY_TO

      pushLog(`Recipient: ${recipient.slice(0, 8)}...${recipient.slice(-6)}`)

      const paymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: recipient,
        assetIndex: USDC_ASSET_ID,
        amount: amountMicro,
        suggestedParams: suggested,
        note: new Uint8Array(Buffer.from(JSON.stringify({
          nonce: paymentId,
          allocation_id: currentAllocation.id,
          service_id: paymentService,
          x402: true,
        }))),
      })
      algosdk.assignGroupID([paymentTxn])

      // Step 3: Real wallet signature
      pushLog('Awaiting signature in connected wallet...')
      const signedBytes = await transactionSigner([paymentTxn], [0])
      pushLog('Transaction successfully signed by wallet')

      // Step 4: Submit to Algorand
      pushLog('Submitting transaction to Algorand TestNet...')
      const res = await algod.sendRawTransaction(signedBytes[0]!).do()
      const txid = res.txid
      pushLog(`Submitted to chain! Tx ID: ${txid}`)

      // Step 5: Wait for real confirmation on ledger
      pushLog('Waiting for on-chain block confirmation...')
      const ptx = await algosdk.waitForConfirmation(algod, txid, 4)
      if (ptx.confirmedRound) {
        pushLog(`Confirmed on-chain in round ${ptx.confirmedRound}`)
      }

      // Step 6: Deduct / Claim credits only after confirmation
      pushLog(`Deducting ${formatCurrency(amount)} credits...`)
      await claimCredits(currentAllocation.id, amount)

      // Step 7: Verify & submit proof to backend if available
      try {
        await verifyTransaction(txid, paymentId)
        await submitPaymentProof({
          allocation_id: currentAllocation.id,
          service_id: paymentService,
          amount,
          payment_proof: { tx_hash: txid, sender_address: activeAddress, network: 'algorand' },
        })
      } catch (_) {}

      // Step 8: Save confirmed record to Supabase
      await createPaymentRecord({
        allocation_id: currentAllocation.id,
        service_id: paymentService,
        amount,
        x402_tx_hash: txid,
        status: 'confirmed',
        consumed_at: new Date().toISOString(),
      })

      setPaymentStatus('success')
      setPaymentTxHash(txid)
      pushLog('Real on-chain x402 settlement complete!')

      if (user?.company_id) {
        await fetchAllocations(user.company_id)
      }
    } catch (err: any) {
      setPaymentStatus('failed')
      setPaymentError(err.message || 'On-chain payment failed')
      pushLog(`ERROR: ${err.message}`)
      console.error('x402 payment error:', err)
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleRetryPayment = async (payment: PaymentRecord) => {
    if (!activeAddress || !transactionSigner) {
      pushLog('Connect wallet to retry payment on-chain')
      return
    }

    setRetryingPaymentId(payment.id)
    pushLog(`Retrying payment ${payment.id} on-chain...`)
    try {
      const algod = getAlgorandClient().client.algod
      const suggested = await algod.getTransactionParams().do()
      const amountMicro = Math.floor(payment.amount * 1_000_000)
      const allocation = allocations.find(a => a.id === payment.allocation_id)
      if (!allocation) throw new Error('Missing allocation')

      const X402_TESTNET_PAY_TO = 'MPY54CLPH2OKEGC6S5N2LDAFDNO5BVNV532NBZ5VD6GOND3STPNXZYXOFE'
      const isValidAlgo = (a: string) => typeof a === 'string' && a.length === 58 && /^[A-Z2-7]{58}$/.test(a)
      const allocAny = allocation as any
      const recipient = (allocAny.company_wallet && isValidAlgo(allocAny.company_wallet))
        ? allocAny.company_wallet
        : (allocAny.company?.wallet_address && isValidAlgo(allocAny.company.wallet_address))
          ? allocAny.company.wallet_address
          : X402_TESTNET_PAY_TO

      const paymentTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: recipient,
        assetIndex: USDC_ASSET_ID,
        amount: amountMicro,
        suggestedParams: suggested,
        note: new Uint8Array(Buffer.from(JSON.stringify({
          nonce: `retry:${payment.id}:${Date.now()}`,
          allocation_id: payment.allocation_id,
          service_id: payment.service_id,
          x402: true,
          retry: true,
        }))),
      })
      algosdk.assignGroupID([paymentTxn])

      pushLog('Awaiting wallet signature for retry...')
      const signedBytes = await transactionSigner([paymentTxn], [0])
      pushLog('Retry transaction signed')
      const { txid } = await algod.sendRawTransaction(signedBytes[0]!).do()
      pushLog(`Retry submitted: ${txid}`)

      let confirmedRound: number | null = null
      try {
        const ptx = await algosdk.waitForConfirmation(algod, txid, 4)
        if (ptx.confirmedRound) confirmedRound = Number(ptx.confirmedRound)
      } catch {}

      if (confirmedRound) {
        pushLog(`Retry confirmed in round ${confirmedRound}`)
        await updatePaymentStatus(payment.id, 'confirmed', txid)
      } else {
        await updatePaymentStatus(payment.id, 'pending', txid)
      }
    } catch (err: any) {
      pushLog(`Retry failed: ${err.message}`)
    } finally {
      setRetryingPaymentId(null)
      if (payment.allocation_id) await fetchPaymentRecords(payment.allocation_id)
    }
  }

 const getStatusIcon = (status: PaymentRecord['status']) => {
 switch (status) {
 case 'confirmed': return <CheckCircle2 className="w-4 h-4 text-green-400" />
 case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />
 case 'failed': return <XCircle className="w-4 h-4 text-red-400" />
 default: return <Clock className="w-4 h-4 text-white/30" />
 }
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
 </div>
 )
 }

 return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Claims & x402 Payments
          </h1>
          <p className="text-white/40 mt-1 text-sm">
            Claim credits for service consumption and settle payments on Algorand via the x402 protocol
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-full self-start">
          <button
            onClick={() => setViewMode('employee')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              viewMode === 'employee' ? 'bg-white text-black font-semibold' : 'text-white/60 hover:text-white'
            }`}
          >
            Employee Claims
          </button>
          <button
            onClick={() => setViewMode('management')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              viewMode === 'management' ? 'bg-white text-black font-semibold' : 'text-white/60 hover:text-white'
            }`}
          >
            Management View
          </button>
        </div>
      </div>

      {!activeAddress && (
        <div className="liquid-glass rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-200">Connect Wallet Required for Real On-Chain x402 Payments</p>
              <p className="text-xs text-emerald-400/70 mt-1">
                Real Algorand TestNet transactions (USDC ASA {USDC_ASSET_ID.toLocaleString()}). Zero simulations. Connect your Pera, Lute, or Defly wallet to proceed.
              </p>
            </div>
          </div>
          <WalletButton size="sm" />
        </div>
      )}


      {viewMode === 'employee' ? (
        <EmployeeView allocations={displayAllocs} records={myRecords} onPay={openPaymentModal} teams={teams} />
      ) : (
        <ManagementView
          allocations={allocations}
          employees={employees}
          teams={teams}
          records={paymentRecords}
          onPay={openPaymentModal}
          walletBalance={walletBalance}
          getStatusIcon={getStatusIcon}
          onRetry={handleRetryPayment}
          retryingId={retryingPaymentId}
        />
      )}

 <AnimatePresence>
 {showPaymentModal && currentAllocation && (
 <PaymentModal
 allocation={currentAllocation}
 service={paymentService}
 amount={paymentAmount}
 status={paymentStatus}
 txHash={paymentTxHash}
 error={paymentError}
 loading={paymentLoading}
 log={log}
 walletBalance={walletBalance}
 faucetLoading={faucetLoading}
 faucetStatus={faucetStatus}
 onServiceChange={setPaymentService}
 onAmountChange={setPaymentAmount}
 onPay={handleX402Payment}
 onClose={() => setShowPaymentModal(false)}
 onFaucet={handleRequestFaucet}
 onRefreshBalance={loadBalance}
 balanceLoading={balanceLoading}
 activeAddress={activeAddress}
 />
 )}
 </AnimatePresence>
 </div>
 )
}

function EmployeeView({ allocations, records, onPay, teams }: any) {
 return (
 <div className="space-y-6">
 <div className="liquid-glass rounded-2xl overflow-hidden">
 <div className="p-6 border-b border-white/5">
 <SectionTitle>Your Credit Balances</SectionTitle>
 </div>
 {allocations.length === 0 ? (
 <p className="px-6 py-8 text-sm text-white/40 text-center">No allocations found</p>
 ) : (
 <div className="divide-y divide-white/5">
 {allocations.map((a: any) => {
 const team = teams.find((t: any) => t.id === a.team_id)
 return (
 <div key={a.id} className="px-6 py-4 flex justify-between items-center">
 <div>
 <p className="text-sm text-white/80">{fmtCurrency(a.total_credits)} allocated</p>
 <p className="text-xs text-white/30 mt-0.5">{team?.name || 'No team'} · {a.period_start ? new Date(a.period_start).toLocaleDateString() : ''}</p>
 </div>
 <div className="flex items-center gap-4">
 <div className="text-right">
 <p className="text-sm text-white/70">{fmtCurrency(a.claimed_credits)} claimed</p>
 <p className="text-xs text-white/40">{fmtCurrency(a.unclaimed_credits)} unclaimed</p>
 </div>
 {a.unclaimed_credits > 0 && (
 <button onClick={() => onPay(a)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-xs font-medium hover:bg-white/90 transition-colors">
 <Zap className="w-3.5 h-3.5" /> Pay
 </button>
 )}
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>

 {records.length > 0 && (
 <div className="liquid-glass rounded-2xl overflow-hidden">
 <div className="p-6 border-b border-white/5">
 <SectionTitle>Transaction History</SectionTitle>
 </div>
 <div className="divide-y divide-white/5">
 {records.slice(0, 10).map((r: PaymentRecord) => (
 <div key={r.id} className="px-6 py-3 flex justify-between items-center">
 <div>
 <p className="text-sm text-white/80">{r.service_id}</p>
 <p className="text-xs text-white/30">{new Date(r.created_at).toLocaleDateString()}</p>
 </div>
 <div className="flex items-center gap-2">
 <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${r.status === 'confirmed' ? 'bg-white/10 text-white/70' : r.status === 'failed' ? 'bg-red-500/10 text-red-300' : 'bg-yellow-500/10 text-yellow-300'}`}>{r.status}</span>
 <span className="text-sm text-white/60">{fmtCurrency(r.amount)}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )
}

function ManagementView({ allocations, employees, teams, records, onPay, walletBalance, getStatusIcon, onRetry, retryingId }: any) {
 return (
 <div className="space-y-6">
 <div className="liquid-glass rounded-2xl overflow-hidden">
 <div className="p-6 border-b border-white/5">
 <SectionTitle>Employee Balances</SectionTitle>
 </div>
 {employees.length === 0 ? (
 <p className="px-6 py-8 text-sm text-white/40 text-center">No employees found</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-white/5">
 <th className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase">Employee</th>
 <th className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase">Team</th>
 <th className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase">Total</th>
 <th className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase">Claimed</th>
 <th className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase">Unclaimed</th>
 <th className="px-4 py-3 text-right text-xs font-medium text-white/30 uppercase">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {employees.map((emp: any) => {
 const empAllocs = allocations.filter((a: any) => a.employee_id === emp.id)
 const total = empAllocs.reduce((s: number, a: any) => s + a.total_credits, 0)
 const claimed = empAllocs.reduce((s: number, a: any) => s + a.claimed_credits, 0)
 const unclaimed = empAllocs.reduce((s: number, a: any) => s + a.unclaimed_credits, 0)
 const team = teams.find((t: any) => t.id === emp.team_id)
 const firstAlloc = empAllocs.find((a: any) => a.unclaimed_credits > 0)
 return (
 <tr key={emp.id} className="hover:bg-white/5 transition-colors">
 <td className="px-4 py-3">
 <div>
 <p className="text-sm text-white/90">{emp.name}</p>
 <p className="text-xs text-white/30">{emp.email}</p>
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-white/60">{team?.name || '-'}</td>
 <td className="px-4 py-3 text-sm text-white/90">{fmtCurrency(total)}</td>
 <td className="px-4 py-3 text-sm text-white/60">{fmtCurrency(claimed)}</td>
 <td className="px-4 py-3 text-sm text-white/80">{fmtCurrency(unclaimed)}</td>
 <td className="px-4 py-3 text-right">
 {unclaimed > 0 && firstAlloc && (
 <button onClick={() => onPay(firstAlloc)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-black text-xs font-medium hover:bg-white/90 transition-colors">
 <Zap className="w-3.5 h-3.5" /> Pay
 </button>
 )}
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>

 <div className="liquid-glass rounded-2xl overflow-hidden">
 <div className="p-6 border-b border-white/5">
 <SectionTitle>Transaction History</SectionTitle>
 </div>
 {records.length === 0 ? (
 <p className="px-6 py-8 text-sm text-white/40 text-center">No transactions yet. Use x402 to pay for API services.</p>
 ) : (
 <div className="divide-y divide-white/5">
 {records.map((payment: PaymentRecord) => {
 const allocation = allocations.find((a: any) => a.id === payment.allocation_id)
 const employee = allocation ? employees.find((e: any) => e.id === allocation.employee_id) : null
 const isFailed = payment.status === 'failed'
 return (
 <div key={payment.id} className="px-6 py-3 flex items-center justify-between">
 <div className="flex items-center gap-3">
 {getStatusIcon(payment.status)}
 <div>
 <div className="flex items-center gap-2">
 <p className="text-sm text-white/80">{payment.service_id}</p>
 {isFailed && <span className="inline-flex px-2 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-300 rounded">Failed</span>}
 </div>
 <p className="text-xs text-white/30">{employee?.name || 'Unknown'} · {new Date(payment.created_at).toLocaleString()}</p>
 {payment.x402_tx_hash && (
 <div className="flex items-center gap-1 mt-1">
 <code className="text-xs text-white/30 font-mono">{payment.x402_tx_hash.substring(0, 16)}...</code>
 <button onClick={() => navigator.clipboard.writeText(payment.x402_tx_hash || '')} className="text-white/30 hover:text-white/60"><Copy className="w-3 h-3" /></button>
 </div>
 )}
 </div>
 </div>
 <div className="text-right">
 <p className="text-sm text-white/80">{fmtCurrency(payment.amount)}</p>
 {isFailed && (
 <button onClick={() => onRetry(payment)} disabled={retryingId === payment.id} className="mt-1 inline-flex items-center gap-1 px-2 py-1 text-xs text-white/60 hover:text-white disabled:opacity-50">
 <RefreshCw className={`w-3 h-3 ${retryingId === payment.id ? 'animate-spin' : ''}`} /> Retry
 </button>
 )}
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>
 </div>
 )
}

function PaymentModal({ allocation, service, amount, status, txHash, error, loading, log, walletBalance, faucetLoading, faucetStatus, onServiceChange, onAmountChange, onPay, onClose, onFaucet, onRefreshBalance, balanceLoading, activeAddress }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="liquid-glass rounded-2xl max-w-lg w-full">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            x402 Payment Settlement
          </h3>
          <p className="text-xs text-white/40 mt-1">Pay for API services using x402 on Algorand (USDC ASA transfer)</p>
        </div>
        <div className="p-6 space-y-4">        {status === 'idle' && (
          <>
            {!activeAddress && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-amber-300">Wallet connection required</p>
                  <p className="text-[11px] text-amber-400/70 mt-0.5">Real on-chain settlement requires an active Algorand wallet.</p>
                </div>
                <WalletButton size="sm" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Service</label>
              <select value={service} onChange={e => onServiceChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-white text-sm focus:outline-none focus:border-white/20">
                <option value="" className="bg-slate-900">Select service</option>
                {SERVICES.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.name} — ${s.cost}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Amount ($)</label>
              <input type="number" value={amount} onChange={e => onAmountChange(e.target.value)} placeholder="0.00" min="0" max={allocation?.unclaimed_credits} step="0.01" className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20" />
            </div>
            <div className="liquid-glass rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Shield className="w-4 h-4 text-white/40" />
                <span className="font-medium">x402 Protocol — Algorand exact scheme</span>
              </div>
              <p className="text-xs text-white/30">Network: {getNetwork()} (Real On-Chain)</p>
              <p className="text-xs text-white/30">Asset: USDC (ASA {USDC_ASSET_ID.toLocaleString()})</p>
              <p className="text-xs text-white/30">Available: {formatCurrency(allocation?.unclaimed_credits || 0)}</p>
              {activeAddress && walletBalance && (
                <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">ALGO Gas:</span>
                    <span className="text-white/80 font-mono">{walletBalance.algo.toFixed(4)} ALGO</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">USDC Holding:</span>
                    <span className="text-white/80 font-mono">${walletBalance.usdc.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">USDC Opt-In Status:</span>
                    <span className={`font-semibold inline-flex items-center gap-1 ${walletBalance.isOptedIn ? "text-emerald-400" : "text-amber-400"}`}>
                      {walletBalance.isOptedIn ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Opted In</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Not Opted In</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <a
                      href={`https://testnet.explorer.algorand.org/address/${activeAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-1"
                    >
                      Inspect Account on Explorer ↗
                    </a>
                    <button
                      onClick={onRefreshBalance}
                      disabled={balanceLoading}
                      className="text-[11px] text-white/40 hover:text-white/80 inline-flex items-center gap-1 disabled:opacity-50"
                      title="Refresh live balance from Algorand node"
                    >
                      <RefreshCw className={`w-3 h-3 ${balanceLoading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                  </div>
                </div>
              )}
            </div>
            {activeAddress && (!walletBalance || walletBalance.usdc < parseFloat(amount || '0')) && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-amber-300">Insufficient USDC for payment</p>
                  <span className="text-[11px] font-mono text-amber-300/80">
                    Need: {formatCurrency(parseFloat(amount || '0'))} | Have: {formatCurrency(walletBalance?.usdc || 0)}
                  </span>
                </div>
                <p className="text-[11px] text-amber-400/80">
                  Real on-chain x402 settlement requires TestNet USDC (ASA {USDC_ASSET_ID.toLocaleString()}).
                  {!walletBalance?.isOptedIn && " Your wallet must first opt into ASA 10,458,941."}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {!walletBalance?.isOptedIn && (
                    <button
                      onClick={onFaucet}
                      disabled={faucetLoading}
                      className="px-3 py-1.5 bg-amber-500/20 text-amber-200 text-xs font-medium rounded-lg hover:bg-amber-500/30 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                    >
                      {faucetLoading ? 'Signing Opt-in...' : 'Step 1: Opt-in to USDC ASA'}
                    </button>
                  )}
                  <a
                    href="https://lora.algokit.io/testnet/fund"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-500/20 text-blue-200 text-xs font-medium rounded-lg hover:bg-blue-500/30 transition-colors inline-flex items-center gap-1"
                  >
                    Get ALGO Gas (Dispenser) ↗
                  </a>
                  <a
                    href="https://testnet.tinyman.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-purple-500/20 text-purple-200 text-xs font-medium rounded-lg hover:bg-purple-500/30 transition-colors inline-flex items-center gap-1"
                  >
                    Swap ALGO for USDC (Tinyman) ↗
                  </a>
                  <a
                    href={`https://testnet.explorer.algorand.org/address/${activeAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white/10 text-white/80 text-xs font-medium rounded-lg hover:bg-white/20 transition-colors inline-flex items-center gap-1"
                  >
                    View on Explorer ↗
                  </a>
                </div>
                {faucetStatus && <p className="text-xs text-amber-400/80 mt-1 font-mono">{faucetStatus}</p>}
              </div>
            )}
            {error && <div className="p-3 bg-red-500/10 border border-red-500/10 rounded-xl"><p className="text-sm text-red-300">{error}</p></div>}
          </>
        )}

        {status === 'processing' && (
          <div className="text-center py-6">
            <RefreshCw className="w-12 h-12 text-white/60 animate-spin mx-auto mb-4" />
            <p className="text-sm text-white/70">Processing real on-chain x402 payment on Algorand...</p>
            <p className="text-xs text-white/40 mt-1">Please confirm and sign the transaction in your connected wallet</p>
            {log.length > 0 && (
              <div className="mt-4 text-left liquid-glass rounded-xl p-3 max-h-40 overflow-y-auto">
                {log.map((entry: string, i: number) => (
                  <p key={i} className="text-xs text-white/60 font-mono">{entry}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-sm font-medium text-white mb-1">On-Chain Payment Successful!</p>
            <p className="text-xs text-white/40 mb-4">{formatCurrency(parseFloat(amount))} settled via Algorand x402</p>
            {txHash && (
              <div className="flex flex-col items-center gap-2 bg-white/5 rounded-xl p-3">
                <div className="flex items-center justify-center gap-2 w-full">
                  <code className="text-xs text-white/60 font-mono break-all">{txHash}</code>
                  <button onClick={() => navigator.clipboard.writeText(txHash)} className="text-white/40 hover:text-white/80"><Copy className="w-3.5 h-3.5" /></button>
                </div>
                <a
                  href={`https://testnet.explorer.algorand.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-1 mt-1"
                >
                  View on Algorand Explorer →
                </a>
              </div>
            )}
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-sm font-medium text-white mb-1">On-Chain Payment Failed</p>
            <p className="text-xs text-white/40">{error || 'The x402 on-chain payment could not be processed'}</p>
            {log.length > 0 && (
              <div className="mt-4 text-left bg-white/5 rounded-xl p-3 max-h-40 overflow-y-auto">
                {log.map((entry: string, i: number) => (
                  <p key={i} className="text-xs text-red-300 font-mono">{entry}</p>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
        <div className="p-6 border-t border-white/5 flex justify-end gap-3">
          {(status === 'idle' || status === 'failed') && (
            <button onClick={onClose} className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
          )}
          {status === 'success' && (
            <button onClick={onClose} className="px-5 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">Done</button>
          )}
          {status === 'idle' && (
            <button
              onClick={onPay}
              disabled={!service || !amount || loading || !activeAddress}
              className="px-5 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-30 transition-colors inline-flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> {loading ? 'Submitting On-Chain...' : !activeAddress ? 'Connect Wallet First' : 'Pay with x402 (On-Chain)'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
