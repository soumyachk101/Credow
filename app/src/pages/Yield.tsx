import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useYieldStore } from '@/stores/yieldStore'
import { motion } from 'framer-motion'
import {
 TrendingUp,
 DollarSign,
 Wallet,
 BarChart3,
 Info,
 RefreshCw,
 Users,
 ArrowRight,
} from 'lucide-react'
import type { Allocation } from '@/lib/types'

const fmt = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)

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
 const companyId = user.company_id
 const loadData = async () => {
 setLoading(true)
 try {
 await Promise.all([fetchYieldAccounts(companyId), loadAllocations()])
 } catch (err) { console.error('Error loading yield data:', err) }
 finally { setLoading(false) }
 }
 loadData()
 }, [user?.company_id, fetchYieldAccounts])

 const loadAllocations = async () => {
 const { data } = await supabase.from('allocations').select('*').eq('company_id', user!.company_id!)
 setAllocations(data || [])
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
 } catch (err: any) { setError(err.message || 'Failed to distribute yield') }
 finally { setDistributing(false) }
 }

 const accountsWithDetails = yieldAccounts.map(ya => {
 const allocation = allocations.find(a => a.id === ya.allocation_id)
 return { ...ya, employeeName: allocation?.employee?.name || 'Unknown', employeeEmail: allocation?.employee?.email || '', teamName: allocation?.team?.name || '-' }
 })

 const chartData = accountsWithDetails.map(ya => ({ name: ya.employeeName, principal: ya.principal, yield: ya.yield_generated, companyShare: ya.company_share, employeeShare: ya.employee_share }))
 const maxValue = Math.max(...chartData.map(d => d.principal + d.yield), 1)

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
 </div>
 )
 }

 return (
 <div className="space-y-8">
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Yield Vault
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              AVM DeFi Engine
            </span>
          </div>
          <p className="text-zinc-400 mt-1 text-sm">Track and distribute automated yield from unclaimed corporate credit pools.</p>
        </div>
        <button
          onClick={handleDistributeYield}
          disabled={distributing || yieldAccounts.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] disabled:opacity-30 transition-all"
        >
          {distributing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Distributing...</> : <><TrendingUp className="w-4 h-4" /> Distribute Yield</>}
        </button>
      </motion.div>

 {success && (
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="liquid-glass rounded-2xl p-4 flex items-center gap-3 border border-green-500/20">
 <div className="p-2 rounded-full bg-green-500/10"><RefreshCw className="w-4 h-4 text-green-400" /></div>
 <p className="text-sm text-green-300">{success}</p>
 </motion.div>
 )}

 {error && (
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="liquid-glass rounded-2xl p-4 flex items-center gap-3 border border-red-500/20">
 <div className="p-2 rounded-full bg-red-500/10"><Info className="w-4 h-4 text-red-400" /></div>
 <p className="text-sm text-red-300">{error}</p>
 </motion.div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <StatCard label="Total Principal" value={fmt(yieldAccounts.reduce((sum, ya) => sum + ya.principal, 0))} icon={Wallet} />
 <StatCard label="Yield Generated" value={fmt(totalYield.generated)} icon={TrendingUp} accent />
 <StatCard label="Distributed" value={fmt(totalYield.claimed)} icon={DollarSign} />
 </div>

 {chartData.length > 0 && (
 <div className="liquid-glass rounded-2xl p-6">
 <h2 className="text-base font-medium text-white/80 mb-6 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-white/40" />Yield by Allocation</h2>
 <div className="space-y-4">
 {chartData.map((item, index) => {
 const total = item.principal + item.yield
 const principalWidth = total > 0 ? (item.principal / maxValue) * 100 : 0
 const yieldWidth = total > 0 ? (item.yield / maxValue) * 100 : 0
 return (
 <div key={index} className="space-y-1">
 <div className="flex justify-between text-sm">
 <span className="text-white/80">{item.name}</span>
 <span className="text-white/50">{fmt(total)}</span>
 </div>
 <div className="flex h-6 rounded-xl overflow-hidden bg-white/5">
 <div className="bg-white/20 transition-all" style={{ width: `${principalWidth}%` }} title={`Principal: ${fmt(item.principal)}`} />
 <div className="bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all" style={{ width: `${yieldWidth}%` }} title={`Yield: ${fmt(item.yield)}`} />
 </div>
 <div className="flex justify-between text-xs text-zinc-500 font-mono">
 <span>Principal: {fmt(item.principal)}</span>
 <span className="text-emerald-400">Yield: {fmt(item.yield)}</span>
 </div>
 </div>
 )
 })}
 </div>
 <div className="flex gap-6 mt-4">
 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white/30" /><span className="text-xs text-zinc-400">Principal</span></div>
 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /><span className="text-xs text-emerald-400 font-medium">Yield Earned</span></div>
 </div>
 </div>
 )}

 <div className="liquid-glass rounded-2xl overflow-hidden">
 <div className="p-6 border-b border-white/5">
 <h2 className="text-base font-medium text-white/80">Yield Accounts</h2>
 </div>
 {accountsWithDetails.length === 0 ? (
 <p className="px-6 py-8 text-sm text-white/30 text-center">No yield accounts yet. Create allocations with yield-eligible balances to get started.</p>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-white/5">
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Employee</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Team</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Principal</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Yield</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Company</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Employee</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">APY</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {accountsWithDetails.map(ya => (
 <tr key={ya.id} className="hover:bg-white/5 transition-colors">
 <td className="px-6 py-4">
 <div>
 <p className="text-sm text-white/90">{ya.employeeName}</p>
 <p className="text-xs text-white/30">{ya.employeeEmail}</p>
 </div>
 </td>
 <td className="px-6 py-4 text-sm text-white/60">{ya.teamName}</td>
 <td className="px-6 py-4 text-sm font-mono text-zinc-300">{fmt(ya.principal)}</td>
 <td className="px-6 py-4 text-sm font-mono font-semibold text-emerald-400">{fmt(ya.yield_generated)}</td>
 <td className="px-6 py-4 text-sm font-mono text-zinc-400">{fmt(ya.company_share)}</td>
 <td className="px-6 py-4 text-sm font-mono text-emerald-300">{fmt(ya.employee_share)}</td>
 <td className="px-6 py-4 text-sm font-mono text-emerald-400 font-semibold">{ya.apy.toFixed(2)}%</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 <div className="liquid-glass rounded-2xl p-6 border border-amber-500/10">
 <div className="flex gap-3">
 <div className="p-2 rounded-full bg-amber-500/10"><Info className="w-5 h-5 text-amber-400 flex-shrink-0" /></div>
 <div>
 <h3 className="text-sm font-medium text-amber-200">Risk Disclosure</h3>
 <p className="text-xs text-amber-300/60 mt-1 leading-relaxed">Yield is generated through Algorand DeFi protocols and is subject to market risks. APY rates are variable and past performance does not guarantee future results. Employees should not consider yield as guaranteed compensation.</p>
 </div>
 </div>
 </div>
 </div>
 )
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent?: boolean }) {
 return (
 <div className="liquid-glass rounded-2xl p-5">
 <div className="flex items-start justify-between mb-3">
 <span className="text-xs font-medium text-white/40 uppercase tracking-wider">{label}</span>
 <div className="p-2 rounded-xl bg-white/5"><Icon className="w-4 h-4 text-white/60" /></div>
 </div>
 <p className={`text-2xl font-semibold tracking-tight ${accent ? 'text-white' : 'text-white/90'}`}>{value}</p>
 </div>
 )
}
