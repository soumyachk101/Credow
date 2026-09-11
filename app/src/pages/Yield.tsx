import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useYieldStore } from '@/stores/yieldStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import {
 TrendingUp,
 DollarSign,
 Wallet,
 BarChart3,
 Info,
 RefreshCw,
 CheckCircle2,
 Clock,
 AlertTriangle,
} from 'lucide-react'
import type { YieldAccount, Allocation } from '@/lib/types'

export default function Yield() {
 const { user } = useAuthStore()
 const { yieldAccounts, fetchYieldAccounts, distributeYield, getTotalYield, loading: yieldLoading } = useYieldStore()
 const [allocations, setAllocations] = useState<Allocation[]>([])
 const [loading, setLoading] = useState(true)
 const [distributing, setDistributing] = useState(false)
 const [success, setSuccess] = useState('')
 const [error, setError] = useState('')

 useEffect(() => {
 if (!user?.company_id) return

 const loadData = async () => {
 setLoading(true)
 try {
 await Promise.all([
 fetchYieldAccounts(user.company_id),
 loadAllocations(),
 ])
 } catch (err) {
 console.error('Error loading yield data:', err)
 } finally {
 setLoading(false)
 }
 }

 loadData()
 }, [user?.company_id, fetchYieldAccounts])

 const loadAllocations = async () => {
 const { data } = await supabase
 .from('allocations')
 .select('*')
 .eq('company_id', user!.company_id)
 setAllocations(data || [])
 }

 const formatCurrency = (value: number) => {
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: 'USD',
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(value)
 }

 const totalYield = getTotalYield(user?.company_id || '')

 const handleDistributeYield = async () => {
 setDistributing(true)
 setError('')
 setSuccess('')

 try {
 await distributeYield(user!.company_id!)
 setSuccess('Yield distributed successfully to all eligible allocations')

 await loadAllocations()

 setTimeout(() => setSuccess(''), 5000)
 } catch (err: any) {
 setError(err.message || 'Failed to distribute yield')
 } finally {
 setDistributing(false)
 }
 }

 const yieldAccountsWithDetails = yieldAccounts.map(ya => {
 const allocation = allocations.find(a => a.id === ya.allocation_id)
 const employee = allocation?.employee
 const team = allocation?.team
 return {
 ...ya,
 employeeName: employee?.name || 'Unknown',
 employeeEmail: employee?.email || '',
 teamName: team?.name || '-',
 totalPrincipal: ya.principal + ya.employee_share,
 }
 })

 // Aggregate for chart display
 const chartData = yieldAccountsWithDetails.map(ya => ({
 name: ya.employeeName,
 principal: ya.principal,
 yield: ya.yield_generated,
 employeeShare: ya.employee_share,
 companyShare: ya.company_share,
 }))

 const maxValue = Math.max(
 ...chartData.map(d => d.principal + d.yield),
 1
 )

 return (
 <ProtectedRoute>
 <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
 <Navbar />

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
 <div>
 <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
 Yield Management
 </h1>
 <p className="text-gray-600 dark:text-slate-300 mt-1">
 Track and distribute yield from unclaimed credit allocations
 </p>
 </div>
 <button
 onClick={handleDistributeYield}
 disabled={distributing || yieldAccounts.length === 0}
 className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 {distributing ? (
 <>
 <RefreshCw className="w-4 h-4 animate-spin" />
 Distributing...
 </>
 ) : (
 <>
 <TrendingUp className="w-4 h-4" />
 Distribute Yield
 </>
 )}
 </button>
 </div>

 {/* Alerts */}
 {success && (
 <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl flex items-center gap-3">
 <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
 <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
 </div>
 )}

 {error && (
 <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-center gap-3">
 <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
 <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
 </div>
 )}

 {/* Summary Stats */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
 <div className="bg-white dark:bg-slate-800/50 rounded-xl p-6 border border-gray-200 dark:border-slate-700/60 shadow-sm">
 <div className="flex items-start justify-between mb-2">
 <span className="text-sm text-gray-500 dark:text-slate-400">
 Total Principal
 </span>
 <Wallet className="w-4 h-4 text-blue-500" />
 </div>
 <p className="text-2xl font-bold text-gray-900 dark:text-white">
 {formatCurrency(yieldAccounts.reduce((sum, ya) => sum + ya.principal, 0))}
 </p>
 </div>

 <div className="bg-white dark:bg-slate-800/50 rounded-xl p-6 border border-gray-200 dark:border-slate-700/60 shadow-sm">
 <div className="flex items-start justify-between mb-2">
 <span className="text-sm text-gray-500 dark:text-slate-400">
 Total Yield Generated
 </span>
 <TrendingUp className="w-4 h-4 text-green-500" />
 </div>
 <p className="text-2xl font-bold text-green-600 dark:text-green-400">
 {formatCurrency(totalYield.generated)}
 </p>
 </div>

 <div className="bg-white dark:bg-slate-800/50 rounded-xl p-6 border border-gray-200 dark:border-slate-700/60 shadow-sm">
 <div className="flex items-start justify-between mb-2">
 <span className="text-sm text-gray-500 dark:text-slate-400">
 Total Distributed
 </span>
 <DollarSign className="w-4 h-4 text-purple-500" />
 </div>
 <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
 {formatCurrency(totalYield.claimed)}
 </p>
 </div>
 </div>

 {loading ? (
 <div className="flex items-center justify-center py-12">
 <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
 </div>
 ) : (
 <>
 {/* Yield Chart */}
 {chartData.length > 0 && (
 <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-6 mb-8">
 <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
 <BarChart3 className="w-5 h-5 text-gray-400" />
 Yield by Allocation
 </h2>
 <div className="space-y-4">
 {chartData.map((item, index) => {
 const total = item.principal + item.yield
 const principalWidth = total > 0 ? (item.principal / maxValue) * 100 : 0
 const yieldWidth = total > 0 ? (item.yield / maxValue) * 100 : 0

 return (
 <div key={index} className="space-y-1">
 <div className="flex justify-between text-sm">
 <span className="text-gray-700 dark:text-slate-200">{item.name}</span>
 <span className="text-gray-500 dark:text-slate-400">
 {formatCurrency(total)}
 </span>
 </div>
 <div className="flex h-6 rounded-lg overflow-hidden">
 <div
 className="bg-blue-500 transition-all"
 style={{ width: `${principalWidth}%` }}
 title={`Principal: ${formatCurrency(item.principal)}`}
 />
 <div
 className="bg-green-500 transition-all"
 style={{ width: `${yieldWidth}%` }}
 title={`Yield: ${formatCurrency(item.yield)}`}
 />
 </div>
 <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
 <span>Principal: {formatCurrency(item.principal)}</span>
 <span>Yield: {formatCurrency(item.yield)}</span>
 </div>
 </div>
 )
 })}
 </div>
 <div className="flex gap-6 mt-4">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 bg-blue-500 rounded" />
 <span className="text-xs text-gray-500 dark:text-slate-400">Principal</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 bg-green-500 rounded" />
 <span className="text-xs text-gray-500 dark:text-slate-400">Yield</span>
 </div>
 </div>
 </div>
 )}

 {/* Yield Accounts Table */}
 <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
 <div className="p-6 border-b border-gray-200 dark:border-slate-700/60">
 <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
 Yield Accounts
 </h2>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 dark:bg-slate-800/30">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 Employee
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 Team
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 Principal</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 Yield Generated</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 Company Share</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 Employee Share</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
 APY</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
 {yieldAccountsWithDetails.map(ya => (
 <tr key={ya.id}>
 <td className="px-6 py-4">
 <div>
 <p className="text-sm font-medium text-gray-900 dark:text-white">
 {ya.employeeName}
 </p>
 <p className="text-xs text-gray-500 dark:text-slate-400">
 {ya.employeeEmail}
 </p>
 </div>
 </td>
 <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
 {ya.teamName}
 </td>
 <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
 {formatCurrency(ya.principal)}
 </td>
 <td className="px-6 py-4 text-sm font-medium text-green-600 dark:text-green-400">
 {formatCurrency(ya.yield_generated)}
 </td>
 <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
 {formatCurrency(ya.company_share)}
 </td>
 <td className="px-6 py-4 text-sm text-purple-600 dark:text-purple-400">
 {formatCurrency(ya.employee_share)}
 </td>
 <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
 {ya.apy.toFixed(2)}%
 </td>
 </tr>
 ))}
 {yieldAccounts.length === 0 && (
 <tr>
 <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
 No yield accounts yet. Create allocations with yield-eligible balances to get started.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </>
 )}

 {/* Risk Disclosure */}
 <div className="mt-8 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-6">
 <div className="flex gap-3">
 <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
 <div>
 <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
 Risk Disclosure
 </h3>
 <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
 Yield is generated through Algorand DeFi protocols and is subject to market risks. APY rates are variable and
 past performance does not guarantee future results. Company share is subject to protocol-level adjustments.
 Employees should not consider yield as guaranteed compensation.
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </ProtectedRoute>
 )
}
