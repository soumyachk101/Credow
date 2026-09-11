import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useAllocationStore } from '@/stores/allocationStore'
import { usePaymentStore } from '@/stores/paymentStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { Plus, Search, Play, Pause, X, CheckCircle2, XCircle } from 'lucide-react'

const fmtCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
const statusBadge = (status: string) => {
 if (status === 'active') return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
 if (status === 'suspended') return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
 return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
}

export default function Allocations() {
 const { user } = useAuthStore()
 const { allocations, fetchAllocations, createAllocation, updateAllocation, claimCredits } = useAllocationStore()
 const { createPaymentRecord } = usePaymentStore()
 const [teams, setTeams] = useState<any[]>([])
 const [employees, setEmployees] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [showModal, setShowModal] = useState(false)
 const [showClaimModal, setShowClaimModal] = useState(false)
 const [selectedAllocation, setSelectedAllocation] = useState<any>(null)
 const [filterTeam, setFilterTeam] = useState('')
 const [filterStatus, setFilterStatus] = useState('')
 const [searchQuery, setSearchQuery] = useState('')
 const [formData, setFormData] = useState({ team_id: '', employee_id: '', period_start: '', period_end: '', total_credits: '' })
 const [claimAmount, setClaimAmount] = useState('')
 const [claimService, setClaimService] = useState('')
 const [claimLoading, setClaimLoading] = useState(false)
 const [claimError, setClaimError] = useState('')
 const [claimSuccess, setClaimSuccess] = useState('')

 useEffect(() => {
 if (!user?.company_id) return
 const loadData = async () => {
 setLoading(true)
 try {
 await Promise.all([fetchAllocations(user.company_id)])
 const { data: t } = await supabase.from('teams').select('*').eq('company_id', user.company_id)
 setTeams(t || [])
 const { data: e } = await supabase.from('employees').select('*').eq('company_id', user.company_id)
 setEmployees(e || [])
 } catch (err) { console.error(err) }
 finally { setLoading(false) }
 }
 loadData()
 }, [user?.company_id, fetchAllocations])

 const handleCreateAllocation = async () => {
 if (!formData.team_id || !formData.employee_id || !formData.total_credits) return
 const amount = parseFloat(formData.total_credits)
 if (isNaN(amount) || amount <= 0) return
 try {
 await createAllocation({
 company_id: user!.company_id!,
 team_id: formData.team_id,
 employee_id: formData.employee_id,
 period_start: formData.period_start || new Date().toISOString().split('T')[0],
 period_end: formData.period_end || '',
 total_credits: amount,
 })
 setShowModal(false)
 setFormData({ team_id: '', employee_id: '', period_start: '', period_end: '', total_credits: '' })
 } catch (err) { console.error(err) }
 }

 const handleStatusChange = async (allocation: any, status: string) => {
 try { await updateAllocation(allocation.id, { status }) } catch (err) { console.error(err) }
 }

 const handleClaim = async () => {
 if (!selectedAllocation || !claimAmount) return
 const amount = parseFloat(claimAmount)
 if (isNaN(amount) || amount <= 0) { setClaimError('Please enter a valid amount'); return }
 if (amount > selectedAllocation.unclaimed_credits) { setClaimError('Insufficient unclaimed credits'); return }
 setClaimLoading(true)
 setClaimError('')
 setClaimSuccess('')
 try {
 await claimCredits(selectedAllocation.id, amount)
 if (claimService) {
 await createPaymentRecord({ allocation_id: selectedAllocation.id, service_id: claimService, amount, status: 'confirmed' })
 }
 setClaimSuccess('Successfully claimed ' + fmtCurrency(amount) + ' in credits')
 setClaimAmount('')
 setTimeout(() => { setShowClaimModal(false); setSelectedAllocation(null); setClaimSuccess(''); setClaimError('') }, 2000)
 } catch (err: any) { setClaimError(err.message || 'Failed to claim credits') }
 finally { setClaimLoading(false) }
 }

 const filteredAllocations = allocations.filter((a: any) => {
 if (filterTeam && a.team_id !== filterTeam) return false
 if (filterStatus && a.status !== filterStatus) return false
 if (searchQuery) {
 const emp = employees.find((e: any) => e.id === a.employee_id)
 const team = teams.find((t: any) => t.id === a.team_id)
 const s = ((emp?.name || '') + ' ' + (emp?.email || '') + ' ' + (team?.name || '')).toLowerCase()
 if (!s.includes(searchQuery.toLowerCase())) return false
 }
 return true
 })

 return (
 <ProtectedRoute>
 <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
 <Navbar />
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
 <div>
 <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Credit Allocations</h1>
 <p className="text-gray-600 dark:text-slate-300 mt-1">Manage credit allocations across teams and employees</p>
 </div>
 <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
 <Plus className="w-4 h-4" /> New Allocation
 </button>
 </div>

 <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/60 shadow-sm p-4 mb-6">
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or email..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 <div className="flex gap-2">
 <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
 <option value="">All Teams</option>
 {teams.map((team: any) => <option key={team.id} value={team.id}>{team.name}</option>)}
 </select>
 <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
 <option value="">All Statuses</option>
 <option value="active">Active</option>
 <option value="suspended">Suspended</option>
 <option value="terminated">Terminated</option>
 </select>
 </div>
 </div>
 </div>

 <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
 {loading ? (
 <div className="flex items-center justify-center py-12">
 <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 dark:bg-slate-800/30">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Employee</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Team</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Total</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Claimed</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Unclaimed</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Status</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Period</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
 {filteredAllocations.map((allocation: any) => {
 const employee = employees.find((e: any) => e.id === allocation.employee_id)
 const team = teams.find((t: any) => t.id === allocation.team_id)
 const claimPct = allocation.total_credits > 0 ? (allocation.claimed_credits / allocation.total_credits) * 100 : 0
 return (
 <tr key={allocation.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
 <td className="px-6 py-4">
 <div>
 <p className="text-sm font-medium text-gray-900 dark:text-white">{employee?.name || 'Unknown'}</p>
 <p className="text-xs text-gray-500 dark:text-slate-400">{employee?.email}</p>
 </div>
 </td>
 <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{team?.name || '-'}</td>
 <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{fmtCurrency(allocation.total_credits)}</td>
 <td className="px-6 py-4">
 <span className="text-sm text-gray-900 dark:text-white">{fmtCurrency(allocation.claimed_credits)}</span>
 <div className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mt-1">
 <div className="bg-green-500 h-1.5 rounded-full" style={{ width: Math.min(claimPct, 100) + '%' }} />
 </div>
 </td>
 <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{fmtCurrency(allocation.unclaimed_credits)}</td>
 <td className="px-6 py-4">
 <span className={'inline-flex px-2 py-1 text-xs font-medium rounded-full ' + statusBadge(allocation.status)}>{allocation.status}</span>
 </td>
 <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
 {allocation.period_start ? new Date(allocation.period_start).toLocaleDateString() : '-'}
 {allocation.period_end ? ' - ' + new Date(allocation.period_end).toLocaleDateString() : ''}
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center justify-end gap-2">
 {allocation.unclaimed_credits > 0 && allocation.status === 'active' && (
 <button onClick={() => { setSelectedAllocation(allocation); setShowClaimModal(true) }} className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="Claim credits"><Play className="w-4 h-4" /></button>
 )}
 {allocation.status === 'active' ? (
 <button onClick={() => handleStatusChange(allocation, 'suspended')} className="p-1 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded" title="Suspend"><Pause className="w-4 h-4" /></button>
 ) : (
 <button onClick={() => handleStatusChange(allocation, 'active')} className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded" title="Activate"><CheckCircle2 className="w-4 h-4" /></button>
 )}
 <button onClick={() => handleStatusChange(allocation, 'terminated')} className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Terminate"><X className="w-4 h-4" /></button>
 </div>
 </td>
 </tr>
 )
 })}
 {filteredAllocations.length === 0 && (
 <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400">No allocations found. Create your first allocation.</td></tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>

 {showModal && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl max-w-md w-full">
 <div className="p-6 border-b border-gray-200 dark:border-slate-700">
 <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Allocation</h3>
 </div>
 <div className="p-6 space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Team</label>
 <select value={formData.team_id} onChange={e => setFormData(prev => ({ ...prev, team_id: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
 <option value="">Select team</option>
 {teams.map((team: any) => <option key={team.id} value={team.id}>{team.name}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Employee</label>
 <select value={formData.employee_id} onChange={e => setFormData(prev => ({ ...prev, employee_id: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
 <option value="">Select employee</option>
 {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>)}
 </select>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Start Date</label>
 <input type="date" value={formData.period_start} onChange={e => setFormData(prev => ({ ...prev, period_start: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">End Date</label>
 <input type="date" value={formData.period_end} onChange={e => setFormData(prev => ({ ...prev, period_end: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Credit Amount ($)</label>
 <input type="number" value={formData.total_credits} onChange={e => setFormData(prev => ({ ...prev, total_credits: e.target.value }))} placeholder="0.00" min="0" step="0.01" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 </div>
 <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
 <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white">Cancel</button>
 <button onClick={handleCreateAllocation} disabled={!formData.team_id || !formData.employee_id || !formData.total_credits} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Create Allocation</button>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>

 {showClaimModal && selectedAllocation && (
 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl max-w-md w-full">
 <div className="p-6 border-b border-gray-200 dark:border-slate-700">
 <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Claim Credits</h3>
 <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Available: {fmtCurrency(selectedAllocation.unclaimed_credits)}</p>
 </div>
 <div className="p-6 space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Amount to Claim ($)</label>
 <input type="number" value={claimAmount} onChange={e => setClaimAmount(e.target.value)} placeholder="0.00" min="0" max={selectedAllocation.unclaimed_credits} step="0.01" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Service</label>
 <select value={claimService} onChange={e => setClaimService(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
 <option value="">Select service</option>
 <option value="api-service-1">API Service - Data Enrichment</option>
 <option value="api-service-2">API Service - Webhook Delivery</option>
 <option value="api-service-3">API Service - Batch Processing</option>
 <option value="custom">Custom Service</option>
 </select>
 </div>
 {claimError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg"><p className="text-sm text-red-600 dark:text-red-400">{claimError}</p></div>}
 {claimSuccess && <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" /><p className="text-sm text-green-600 dark:text-green-400">{claimSuccess}</p></div>}
 </div>
 <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
 <button onClick={() => { setShowClaimModal(false); setSelectedAllocation(null); setClaimAmount(''); setClaimService(''); setClaimError(''); setClaimSuccess('') }} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white">Cancel</button>
 <button onClick={handleClaim} disabled={!claimAmount || claimLoading} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{claimLoading ? 'Processing...' : 'Claim Credits'}</button>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </ProtectedRoute>
 )
}
