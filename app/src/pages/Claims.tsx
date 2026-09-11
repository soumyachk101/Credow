import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useAllocationStore } from '@/stores/allocationStore'
import { usePaymentStore } from '@/stores/paymentStore'
import { settleX402Payment } from '@/utils/x402'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import {
 Wallet,
 Zap,
 CheckCircle2,
 XCircle,
 Clock,
 RefreshCw,
 CreditCard,
 ArrowDownToLine,
 ExternalLink,
 Copy,
 Shield,
} from 'lucide-react'
import type { Allocation, PaymentRecord } from '@/lib/types'

export default function Claims() {
 const { user } = useAuthStore()
 const { allocations, fetchAllocations, claimCredits } = useAllocationStore()
 const { createPaymentRecord, updatePaymentStatus, fetchPaymentRecords, paymentRecords } = usePaymentStore()
 const [employees, setEmployees] = useState<any[]>([])
 const [teams, setTeams] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [showClaimModal, setShowClaimModal] = useState(false)
 const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
 const [showPaymentModal, setShowPaymentModal] = useState(false)
 const [currentAllocation, setCurrentAllocation] = useState<Allocation | null>(null)

 // Claim form
 const [claimAmount, setClaimAmount] = useState('')
 const [claimService, setClaimService] = useState('')
 const [claimLoading, setClaimLoading] = useState(false)
 const [claimError, setClaimError] = useState('')
 const [claimSuccess, setClaimSuccess] = useState('')

 // x402 payment form
 const [paymentAmount, setPaymentAmount] = useState('')
 const [paymentService, setPaymentService] = useState('')
 const [paymentLoading, setPaymentLoading] = useState(false)
 const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle')
 const [paymentTxHash, setPaymentTxHash] = useState('')
 const [paymentError, setPaymentError] = useState('')
 const [retryingPaymentId, setRetryingPaymentId] = useState<string | null>(null)

 const SERVICES = [
 { id: 'data-enrichment', name: 'Data Enrichment API', cost: '$5.00/1K calls' },
 { id: 'webhook-delivery', name: 'Webhook Delivery Service', cost: '$2.50/1K calls' },
 { id: 'batch-processor', name: 'Batch Processing Engine', cost: '$10.00/job' },
 { id: 'ml-inference', name: 'ML Inference API', cost: '$0.10/call' },
 { id: 'storage-gateway', name: 'Storage Gateway', cost: '$0.05/GB' },
 ]

 useEffect(() => {
 if (!user?.company_id) return

 const loadData = async () => {
 setLoading(true)
 try {
 await fetchAllocations(user.company_id)

 const { data: employeesData } = await supabase
 .from('employees')
 .select('*')
 .eq('company_id', user.company_id)
 setEmployees(employeesData || [])

 const { data: teamsData } = await supabase
 .from('teams')
 .select('*')
 .eq('company_id', user.company_id)
 setTeams(teamsData || [])

 // Load payment records for all allocations
 if (allocations.length > 0) {
 await Promise.all(
 allocations.map(a => fetchPaymentRecords(a.id))
 )
 }
 } catch (err) {
 console.error('Error loading claims data:', err)
 } finally {
 setLoading(false)
 }
 }

 loadData()
 }, [user?.company_id, fetchAllocations, fetchPaymentRecords, allocations.length])

 const formatCurrency = (value: number) => {
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: 'USD',
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(value)
 }

 const getEmployeeBalance = (employeeId: string) => {
 const empAllocs = allocations.filter(a => a.employee_id === employeeId)
 return {
 total: empAllocs.reduce((sum, a) => sum + a.total_credits, 0),
 claimed: empAllocs.reduce((sum, a) => sum + a.claimed_credits, 0),
 unclaimed: empAllocs.reduce((sum, a) => sum + a.unclaimed_credits, 0),
 }
 }

 const handleClaimCredits = async (allocation: Allocation) => {
 setCurrentAllocation(allocation)
 setShowClaimModal(true)
 setClaimAmount('')
 setClaimService('')
 setClaimError('')
 setClaimSuccess('')
 }

 const submitClaim = async () => {
 if (!currentAllocation || !claimAmount) return

 const amount = parseFloat(claimAmount)
 if (isNaN(amount) || amount <= 0) {
 setClaimError('Please enter a valid amount')
 return
 }

 if (amount > currentAllocation.unclaimed_credits) {
 setClaimError('Insufficient unclaimed credits')
 return
 }

 setClaimLoading(true)
 setClaimError('')
 setClaimSuccess('')

 try {
 await claimCredits(currentAllocation.id, amount)

 if (claimService) {
 await createPaymentRecord({
 allocation_id: currentAllocation.id,
 service_id: claimService,
 amount,
 status: 'confirmed',
 })
 }

 setClaimSuccess(`Successfully claimed ${formatCurrency(amount)} for service consumption`)
 setClaimAmount('')

 setTimeout(() => {
 setShowClaimModal(false)
 setCurrentAllocation(null)
 }, 2000)
 } catch (err: any) {
 setClaimError(err.message || 'Failed to claim credits')
 } finally {
 setClaimLoading(false)
 }
 }

 const handleX402Payment = async () => {
 if (!currentAllocation || !paymentService || !paymentAmount) return

 const amount = parseFloat(paymentAmount)
 if (isNaN(amount) || amount <= 0) {
 setPaymentError('Please enter a valid amount')
 return
 }

 if (amount > currentAllocation.unclaimed_credits) {
 setPaymentError('Insufficient unclaimed credits')
 return
 }

 setPaymentLoading(true)
 setPaymentError('')
 setPaymentStatus('processing')

 try {
 // Step 1: Claim credits
 await claimCredits(currentAllocation.id, amount)

 // Step 2: Simulate x402 payment
 const result = await settleX402Payment(
 {
 scheme: 'exact',
 network: 'algorand',
 maxAmount: amount.toString(),
 resource: paymentService,
 description: `Payment for ${paymentService}`,
 mimeType: 'application/json',
 payTo: '',
 maxTimeoutSeconds: 300,
 },
 amount
 )

 if (!result.success) {
 throw new Error(result.error || 'Payment settlement failed')
 }

 // Step 3: Create payment record
 const paymentRecord = await createPaymentRecord({
 allocation_id: currentAllocation.id,
 service_id: paymentService,
 amount,
 x402_tx_hash: result.txHash,
 status: 'confirmed',
 })

 setPaymentStatus('success')
 setPaymentTxHash(result.txHash || '')

 await fetchAllocations(user!.company_id!)
 } catch (err: any) {
 setPaymentStatus('failed')
 setPaymentError(err.message || 'Payment failed')
 } finally {
 setPaymentLoading(false)
 }
 }

 const handleRetryPayment = async (payment: PaymentRecord) => {
 setRetryingPaymentId(payment.id)

 try {
 const result = await settleX402Payment(
 {
 scheme: 'exact',
 network: 'algorand',
 maxAmount: payment.amount.toString(),
 resource: payment.service_id,
 description: `Retry payment for ${payment.service_id}`,
 mimeType: 'application/json',
 payTo: '',
 maxTimeoutSeconds: 300,
 },
 payment.amount
 )

 if (result.success) {
 await updatePaymentStatus(payment.id, 'confirmed', result.txHash)
 }

 await fetchPaymentRecords(payment.allocation_id)
 } catch (err: any) {
 console.error('Retry failed:', err)
 } finally {
 setRetryingPaymentId(null)
 }
 }

 const getStatusIcon = (status: PaymentRecord['status']) => {
 switch (status) {
 case 'confirmed':
 return <CheckCircle2 className="w-4 h-4 text-green-500" />
 case 'pending':
 return <Clock className="w-4 h-4 text-yellow-500" />
 case 'failed':
 return <XCircle className="w-4 h-4 text-red-500" />
 default:
 return <Clock className="w-4 h-4 text-gray-400" />
 }
 }

 const allPaymentRecords = paymentRecords

 return (
 <ProtectedRoute>
 <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
 <Navbar />

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Header */}
 <div className="mb-8">
 <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
 Claims & Consumption
 </h1>
 <p className="text-gray-600 dark:text-slate-300 mt-1">
 Claim credits for API service consumption with x402 payment settlement
 </p>
 </div>

 {loading ? (
 <div className="flex items-center justify-center py-12">
 <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
 </div>
 ) : (
 <>
 {/* Employee Balance Overview */}
 <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-6 mb-8">
 <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
 <Wallet className="w-5 h-5 text-gray-400" />
 Employee Balances
 </h2>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 dark:bg-slate-800/30">
 <tr>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 Employee
 </th>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 Team
 </th>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 Total Credits</th>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 Claimed</th>
 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 Unclaimed</th>
 <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
 {employees.map(emp => {
 const balance = getEmployeeBalance(emp.id)
 const team = teams.find(t => t.id === emp.team_id)

 return (
 <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
 <td className="px-4 py-3">
 <div>
 <p className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</p>
 <p className="text-xs text-gray-500 dark:text-slate-400">{emp.email}</p>
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
 {team?.name || '-'}
 </td>
 <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
 {formatCurrency(balance.total)}
 </td>
 <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">
 {formatCurrency(balance.claimed)}
 </td>
 <td className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">
 {formatCurrency(balance.unclaimed)}
 </td>
 <td className="px-4 py-3 text-right">
 {balance.unclaimed > 0 && (
 <button
 onClick={() => {
 setSelectedEmployee(emp)
 setCurrentAllocation(allocations.find(a => a.employee_id === emp.id && a.unclaimed_credits > 0) || null)
 setShowPaymentModal(true)
 }}
 className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
 >
 <Zap className="w-3 h-3" />
 Claim
 </button>
 )}
 </td>
 </tr>
 )
 })}
 {employees.length === 0 && (
 <tr>
 <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
 No employees found
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Transaction History */}
 <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
 <div className="p-6 border-b border-gray-200 dark:border-slate-700/60">
 <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
 <CreditCard className="w-5 h-5 text-gray-400" />
 Transaction History
 </h2>
 </div>
 {allPaymentRecords.length === 0 ? (
 <div className="p-8 text-center">
 <p className="text-sm text-gray-500 dark:text-slate-400">
 No transactions yet. Claim credits to create transactions.
 </p>
 </div>
 ) : (
 <div className="divide-y divide-gray-200 dark:divide-slate-700/50">
 {allPaymentRecords.map(payment => {
 const allocation = allocations.find(a => a.id === payment.allocation_id)
 const employee = allocation ? employees.find(e => e.id === allocation.employee_id) : null
 const isFailed = payment.status === 'failed'

 return (
 <div key={payment.id} className="p-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 {getStatusIcon(payment.status)}
 <div>
 <div className="flex items-center gap-2">
 <p className="text-sm font-medium text-gray-900 dark:text-white">
 {payment.service_id}
 </p>
 {isFailed && (
 <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded">
 Failed
 </span>
 )}
 </div>
 <p className="text-xs text-gray-500 dark:text-slate-400">
 {employee?.name || 'Unknown'} &middot;{' '}
 {new Date(payment.created_at).toLocaleString()}
 {payment.consumed_at && (
 <span>&middot; consumed {new Date(payment.consumed_at).toLocaleString()}</span>
 )}
 </p>
 {payment.x402_tx_hash && (
 <div className="flex items-center gap-1 mt-1">
 <code className="text-xs text-gray-500 dark:text-slate-400 font-mono">
 {payment.x402_tx_hash.substring(0, 16)}...
 </code>
 <button
 onClick={() => navigator.clipboard.writeText(payment.x402_tx_hash || '')}
 className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
 >
 <Copy className="w-3 h-3" />
 </button>
 </div>
 )}
 </div>
 </div>
 <div className="text-right">
 <p className="text-sm font-medium text-gray-900 dark:text-white">
 {formatCurrency(payment.amount)}
 </p>
 {isFailed && (
 <button
 onClick={() => handleRetryPayment(payment)}
 disabled={retryingPaymentId === payment.id}
 className="mt-1 inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
 >
 {retryingPaymentId === payment.id ? (
 <RefreshCw className="w-3 h-3 animate-spin" />
 ) : (
 <RefreshCw className="w-3 h-3" />
 )}
 Retry
 </button>
 )}
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>
 </>
 )}

 {/* Claim Credits Modal */}
 {showClaimModal && currentAllocation && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl max-w-md w-full">
 <div className="p-6 border-b border-gray-200 dark:border-slate-700">
 <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
 <ArrowDownToLine className="w-5 h-5 text-blue-500" />
 Claim Credits for Service
 </h3>
 <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
 Available: {formatCurrency(currentAllocation.unclaimed_credits)}
 </p>
 </div>
 <div className="p-6 space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
 Amount to Claim ($)
 </label>
 <input
 type="number"
 value={claimAmount}
 onChange={e => setClaimAmount(e.target.value)}
 placeholder="0.00"
 min="0"
 max={currentAllocation.unclaimed_credits}
 step="0.01"
 className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
 Service
 </label>
 <select
 value={claimService}
 onChange={e => setClaimService(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 <option value="">Select a service</option>
 {SERVICES.map(service => (
 <option key={service.id} value={service.id}>
 {service.name} ({service.cost})
 </option>
 ))}
 </select>
 </div>

 {claimError && (
 <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
 <p className="text-sm text-red-600 dark:text-red-400">{claimError}</p>
 </div>
 )}

 {claimSuccess && (
 <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg flex items-center gap-2">
 <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
 <p className="text-sm text-green-600 dark:text-green-400">{claimSuccess}</p>
 </div>
 )}
 </div>
 <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
 <button
 onClick={() => {
 setShowClaimModal(false)
 setCurrentAllocation(null)
 }}
 className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
 >
 Cancel
 </button>
 <button
 onClick={submitClaim}
 disabled={!claimAmount || claimLoading}
 className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 {claimLoading ? 'Processing...' : 'Claim Credits'}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* x402 Payment Modal */}
 {showPaymentModal && currentAllocation && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl max-w-lg w-full">
 <div className="p-6 border-b border-gray-200 dark:border-slate-700">
 <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
 <Zap className="w-5 h-5 text-yellow-500" />
 x402 Payment Settlement
 </h3>
 <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
 Pay for API services using x402 protocol on Algorand
 </p>
 </div>
 <div className="p-6 space-y-4">
 {paymentStatus === 'idle' && (
 <>
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
 Service
 </label>
 <select
 value={paymentService}
 onChange={e => setPaymentService(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
 >
 <option value="">Select service</option>
 {SERVICES.map(service => (
 <option key={service.id} value={service.id}>
 {service.name} — {service.cost}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
 Amount ($)
 </label>
 <input
 type="number"
 value={paymentAmount}
 onChange={e => setPaymentAmount(e.target.value)}
 placeholder="0.00"
 min="0"
 max={currentAllocation.unclaimed_credits}
 step="0.01"
 className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
 <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
 <Shield className="w-4 h-4 text-blue-500" />
 <span className="font-medium">x402 Protocol</span>
 </div>
 <p className="text-xs text-gray-500 dark:text-slate-400">
 Payment will be settled on Algorand. Network: {import.meta.env.VITE_ALGOD_NETWORK || 'localnet'}
 </p>
 <p className="text-xs text-gray-500 dark:text-slate-400">
 Available credits: {formatCurrency(currentAllocation.unclaimed_credits)}
 </p>
 </div>

 {paymentError && (
 <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
 <p className="text-sm text-red-600 dark:text-red-400">{paymentError}</p>
 </div>
 )}
 </>
 )}

 {paymentStatus === 'processing' && (
 <div className="text-center py-8">
 <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
 <p className="text-sm text-gray-600 dark:text-slate-300">
 Processing x402 payment...
 </p>
 <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
 Please wait while the transaction is confirmed on Algorand
 </p>
 </div>
 )}

 {paymentStatus === 'success' && (
 <div className="text-center py-8">
 <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
 <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
 Payment Successful!
 </p>
 <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
 {formatCurrency(parseFloat(paymentAmount))} claimed and settled
 </p>
 {paymentTxHash && (
 <div className="flex items-center justify-center gap-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg p-2">
 <code className="text-xs text-gray-500 dark:text-slate-400 font-mono">
 {paymentTxHash}
 </code>
 <button
 onClick={() => navigator.clipboard.writeText(paymentTxHash)}
 className="text-gray-400 hover:text-gray-600"
 >
 <Copy className="w-3 h-3" />
 </button>
 </div>
 )}
 </div>
 )}

 {paymentStatus === 'failed' && (
 <div className="text-center py-8">
 <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
 <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
 Payment Failed
 </p>
 <p className="text-xs text-gray-500 dark:text-slate-400">
 {paymentError || 'The x402 payment could not be processed'}
 </p>
 </div>
 )}
 </div>
 <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
 {(paymentStatus === 'idle' || paymentStatus === 'failed') && (
 <button
 onClick={() => {
 setShowPaymentModal(false)
 setCurrentAllocation(null)
 setPaymentStatus('idle')
 setPaymentError('')
 setPaymentTxHash('')
 }}
 className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
 >
 Cancel
 </button>
 )}
 {paymentStatus === 'success' && (
 <button
 onClick={() => {
 setShowPaymentModal(false)
 setCurrentAllocation(null)
 setPaymentStatus('idle')
 setPaymentAmount('')
 setPaymentService('')
 setPaymentError('')
 setPaymentTxHash('')
 }}
 className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
 >
 Done
 </button>
 )}
 {paymentStatus === 'idle' && (
 <button
 onClick={handleX402Payment}
 disabled={!paymentService || !paymentAmount || paymentLoading}
 className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
 >
 <Zap className="w-4 h-4" />
 {paymentLoading ? 'Processing...' : 'Pay with x402'}
 </button>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </ProtectedRoute>
 )
}
