import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useAllocationStore } from '@/stores/allocationStore'
import { useYieldStore } from '@/stores/yieldStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import Navbar from '@/components/Navbar'
import { Wallet, PieChart, ArrowUpRight, DollarSign, TrendingUp, Users, Plus } from 'lucide-react'

function fmtCurrency(value: number): string {
 return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)
}

function DashboardInner() {
 const { user } = useAuthStore()
 const { allocations, fetchAllocations } = useAllocationStore()
 const { fetchYieldAccounts, getTotalYield } = useYieldStore()
 const [teams, setTeams] = useState<any[]>([])
 const [employees, setEmployees] = useState<any[]>([])
 const [transactions, setTransactions] = useState<any[]>([])
 const [pool, setPool] = useState(0)
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 if (!user?.company_id) return
 const load = async () => {
 setLoading(true)
 try {
 await Promise.all([fetchAllocations(user.company_id), fetchYieldAccounts(user.company_id)])
 const { data: t } = await supabase.from('teams').select('*').eq('company_id', user.company_id); setTeams(t || [])
 const { data: e } = await supabase.from('employees').select('*').eq('company_id', user.company_id); setEmployees(e || [])
 const { data: tx } = await supabase.from('transactions').select('*').eq('company_id', user.company_id).order('created_at', { ascending: false }).limit(10); setTransactions(tx || [])
 const { data: c } = await supabase.from('companies').select('credit_pool').eq('id', user.company_id).single()
 if (c) setPool(c.credit_pool || 0)
 } catch (err) { console.error(err) }
 finally { setLoading(false) }
 }
 load()
 }, [user?.company_id, fetchAllocations, fetchYieldAccounts])

 const totalAllocated = allocations.reduce((s, a) => s + a.total_credits, 0)
 const totalClaimed = allocations.reduce((s, a) => s + a.claimed_credits, 0)
 const totalUnclaimed = allocations.reduce((s, a) => s + a.unclaimed_credits, 0)
 const totalYield = getTotalYield(user?.company_id || '')

 const statItems = [
 { label: 'Total Pool', value: fmtCurrency(pool), Icon: Wallet, iconCls: 'text-blue-600', cardCls: 'bg-blue-50 dark:bg-blue-900/20' },
 { label: 'Allocated', value: fmtCurrency(totalAllocated), Icon: PieChart, iconCls: 'text-indigo-600', cardCls: 'bg-indigo-50 dark:bg-indigo-900/20' },
 { label: 'Claimed', value: fmtCurrency(totalClaimed), Icon: ArrowUpRight, iconCls: 'text-green-600', cardCls: 'bg-green-50 dark:bg-green-900/20' },
 { label: 'Unclaimed', value: fmtCurrency(totalUnclaimed), Icon: DollarSign, iconCls: 'text-orange-600', cardCls: 'bg-orange-50 dark:bg-orange-900/20' },
 { label: 'Yield Earned', value: fmtCurrency(totalYield.generated), Icon: TrendingUp, iconCls: 'text-purple-600', cardCls: 'bg-purple-50 dark:bg-purple-900/20' },
 ]

 if (loading) {
 return (
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
 <div className="flex items-center justify-center h-64">
 <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
 </div>
 </div>
 )
 }

 const barW = (pct: number) => { const w = Math.min(pct, 100); return w + '%' }

 return (
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 <div className="flex justify-between items-center mb-8">
 <div>
 <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
 <p className="text-gray-600 dark:text-slate-300 mt-1">Welcome back, {user?.name}</p>
 </div>
 <Link to="/allocations" className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
 <Plus className="w-4 h-4" /> New Allocation
 </Link>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
 {statItems.map((item) => {
 const ItemIcon = item.Icon
 return (
 <div key={item.label} className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700/60">
 <div className="flex items-start justify-between mb-2">
 <span className="text-sm text-gray-500 dark:text-slate-400">{item.label}</span>
 <div className={'p-1.5 rounded-lg ' + item.cardCls}><ItemIcon className={'w-4 h-4 ' + item.iconCls} /></div>
 </div>
 <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p>
 </div>
 )
 })}
 </div>

 <div className="grid lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 space-y-6">
 <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/60">
 <div className="p-6 border-b border-gray-200 dark:border-slate-700/60">
 <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Team Breakdown</h2>
 </div>
 <div className="p-6 space-y-4">
 {teams.map((team: any) => {
 const ta = allocations.filter((a: any) => a.team_id === team.id)
 const tAlloc = ta.reduce((s, a) => s + a.total_credits, 0)
 const tClaimed = ta.reduce((s, a) => s + a.claimed_credits, 0)
 const tUnclaimed = ta.reduce((s, a) => s + a.unclaimed_credits, 0)
 const pct = tAlloc > 0 ? (tClaimed / tAlloc) * 100 : 0
 const barW = Math.min(pct, 100) + '%'
 return (
 <div key={team.id} className="space-y-2">
 <div className="flex justify-between items-center">
 <div>
 <p className="text-sm font-medium text-gray-900 dark:text-white">{team.name}</p>
 <p className="text-xs text-gray-500 dark:text-slate-400">{ta.length} allocations</p>
 </div>
 <div className="text-right">
 <p className="text-sm font-medium text-gray-900 dark:text-white">{fmtCurrency(tAlloc)}</p>
 <p className="text-xs text-gray-500 dark:text-slate-400">{fmtCurrency(tUnclaimed)} unclaimed</p>
 </div>
 </div>
 <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
 <div className="bg-blue-600 h-2 rounded-full" style={{ width: barW }} />
 </div>
 </div>
 )
 })}
 {teams.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">No teams yet.</p>}
 </div>
 </div>

 <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/60">
 <div className="p-6 border-b border-gray-200 dark:border-slate-700/60">
 <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Employees</h2>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 dark:bg-slate-800/30">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Name</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Team</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Balance</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200 dark:divide-slate-700/50">
 {employees.slice(0, 10).map((emp: any) => {
 const ea = allocations.filter((a: any) => a.employee_id === emp.id)
 const bal = ea.reduce((s, a) => s + a.unclaimed_credits, 0)
 const team = teams.find((t: any) => t.id === emp.team_id)
 const badgeCls = emp.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
 return (
 <tr key={emp.id}>
 <td className="px-6 py-3"><div><p className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</p><p className="text-xs text-gray-500 dark:text-slate-400">{emp.email}</p></div></td>
 <td className="px-6 py-3 text-sm text-gray-600 dark:text-slate-300">{team?.name || '-'}</td>
 <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">{fmtCurrency(bal)}</td>
 <td className="px-6 py-3"><span className={'inline-flex px-2 py-1 text-xs font-medium rounded-full ' + badgeCls}>{emp.status}</span></td>
 </tr>
 )
 })}
 {employees.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400">No employees yet</td></tr>}
 </tbody>
 </table>
 </div>
 </div>
 </div>

 <div className="space-y-6">
 <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/60">
 <div className="p-6">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
 <div>
 <p className="text-sm text-gray-500 dark:text-slate-400">Active Employees</p>
 <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.filter((e: any) => e.status === 'active').length}</p>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700/60">
 <div className="p-6 border-b border-gray-200 dark:border-slate-700/60">
 <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
 </div>
 <div className="p-4 space-y-3">
 {transactions.slice(0, 5).map((tx: any) => (
 <div key={tx.id} className="flex justify-between items-center py-2">
 <div>
 <p className="text-sm font-medium text-gray-900 dark:text-white">{tx.type.split('_').join(' ')}</p>
 <p className="text-xs text-gray-500 dark:text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</p>
 </div>
 <span className="text-sm font-medium text-gray-900 dark:text-white">{fmtCurrency(tx.amount)}</span>
 </div>
 ))}
 {transactions.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-2">No recent activity</p>}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}

export default function Dashboard() {
 return (
 <ProtectedRoute>
 <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
 <Navbar />
 <DashboardInner />
 </div>
 </ProtectedRoute>
 )
}
