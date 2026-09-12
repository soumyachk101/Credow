import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useAllocationStore } from '@/stores/allocationStore'
import { useYieldStore } from '@/stores/yieldStore'
import { usePaymentStore } from '@/stores/paymentStore'
import { motion } from 'framer-motion'
import {
 Wallet,
 PieChart,
 ArrowUpRight,
 DollarSign,
 TrendingUp,
 Users,
 Plus,
 ArrowRight,
 Zap,
 RefreshCw,
 UserCheck,
 Shield,
} from 'lucide-react'

const fmtCurrency = (value: number) =>
 new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)

function StatCard({ label, value, sub, icon: Icon, delay = 0 }: { label: string; value: string; sub?: string; icon: any; delay?: number }) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5, delay }}
 className="liquid-glass rounded-2xl p-5"
 >
 <div className="flex items-start justify-between mb-3">
 <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</span>
 <div className="p-2 rounded-xl bg-white/5">
 <Icon className="w-4 h-4 text-white/70" />
 </div>
 </div>
 <p className="text-2xl font-semibold text-white tracking-tight">{value}</p>
 {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
 </motion.div>
 )
}

function ManagementDashboard() {
  const { user, switchRole } = useAuthStore()
  const { allocations, fetchAllocations } = useAllocationStore()
  const { fetchYieldAccounts, getTotalYield } = useYieldStore()
  const [teams, setTeams] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [pool, setPool] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.company_id) return
    const companyId = user.company_id
    const load = async () => {
      setLoading(true)
      try {
        await Promise.all([fetchAllocations(companyId), fetchYieldAccounts(companyId)])
        const { data: t } = await supabase.from('teams').select('*').eq('company_id', companyId); setTeams(t || [])
        const { data: e } = await supabase.from('employees').select('*').eq('company_id', companyId); setEmployees(e || [])
        const { data: tx } = await supabase.from('transactions').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(10); setTransactions(tx || [])
        const { data: c } = await supabase.from('companies').select('credit_pool').eq('id', companyId).maybeSingle()
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
  const activeCount = allocations.filter(a => a.status === 'active').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Company Overview
          </h1>
          <p className="text-white/50 mt-1 text-sm">Real-time credit allocation, yield generation, and team metrics.</p>
        </div>
        <button
          onClick={() => {
            const firstEmp = employees[0] || { id: 'emp-demo', name: 'Alice Employee', email: 'alice@test.com' }
            switchRole('employee', firstEmp)
          }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors self-start border border-white/5"
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Switch to Employee View</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
 <StatCard label="Total Pool" value={fmtCurrency(pool)} sub="Credit budget" icon={Wallet} delay={0.05} />
 <StatCard label="Allocated" value={fmtCurrency(totalAllocated)} sub={`${activeCount} active`} icon={PieChart} delay={0.1} />
 <StatCard label="Claimed" value={fmtCurrency(totalClaimed)} icon={ArrowUpRight} delay={0.15} />
 <StatCard label="Unclaimed" value={fmtCurrency(totalUnclaimed)} icon={DollarSign} delay={0.2} />
 <StatCard label="Yield Earned" value={fmtCurrency(totalYield.generated)} sub={`${fmtCurrency(totalYield.claimed)} distributed`} icon={TrendingUp} delay={0.25} />
 </div>

 <div className="grid lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 liquid-glass rounded-2xl p-6">
 <h2 className="text-base font-medium text-white/80 mb-5">Team Breakdown</h2>
 <div className="space-y-4">
 {teams.map((team: any) => {
 const ta = allocations.filter((a: any) => a.team_id === team.id)
 const tAlloc = ta.reduce((s, a) => s + a.total_credits, 0)
 const tClaimed = ta.reduce((s, a) => s + a.claimed_credits, 0)
 const pct = tAlloc > 0 ? (tClaimed / tAlloc) * 100 : 0
 return (
 <div key={team.id} className="space-y-1.5">
 <div className="flex justify-between items-center">
 <p className="text-sm text-white/80">{team.name}</p>
 <div className="text-right">
 <p className="text-sm text-white">{fmtCurrency(tAlloc)}</p>
 <p className="text-xs text-white/40">{fmtCurrency(tAlloc - tClaimed)} remaining</p>
 </div>
 </div>
 <div className="w-full h-1.5 rounded-full bg-white/5">
 <div className="h-1.5 rounded-full bg-white/40 transition-all" style={{ width: Math.min(pct, 100) + '%' }} />
 </div>
 </div>
 )
 })}
 {teams.length === 0 && <p className="text-sm text-white/40 text-center py-6">No teams yet. Create one to get started.</p>}
 </div>
 </div>

 <div className="space-y-6">
 <div className="liquid-glass rounded-2xl p-5">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-xl bg-white/5"><Users className="w-5 h-5 text-white/70" /></div>
 <div>
 <p className="text-xs text-white/40">Active Employees</p>
 <p className="text-xl font-semibold text-white">{employees.filter((e: any) => e.status === 'active').length}</p>
 </div>
 </div>
 </div>

 <div className="liquid-glass rounded-2xl p-5">
 <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Quick Actions</h3>
 <div className="space-y-2">
 <Link to="/allocations" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/80 hover:text-white">
 <Plus className="w-4 h-4" /> New Allocation <ArrowRight className="w-3 h-3 ml-auto" />
 </Link>
 <Link to="/yield" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/80 hover:text-white">
 <TrendingUp className="w-4 h-4" /> View Yield <ArrowRight className="w-3 h-3 ml-auto" />
 </Link>
 <Link to="/teams" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/80 hover:text-white">
 <Users className="w-4 h-4" /> Manage Teams <ArrowRight className="w-3 h-3 ml-auto" />
 </Link>
 </div>
 </div>
 </div>
 </div>

 <div className="liquid-glass rounded-2xl overflow-hidden">
 <div className="p-6 border-b border-white/5">
 <h2 className="text-base font-medium text-white/80">Recent Activity</h2>
 </div>
 <div className="divide-y divide-white/5">
 {transactions.slice(0, 6).map((tx: any) => (
 <div key={tx.id} className="px-6 py-3 flex justify-between items-center">
 <div>
 <p className="text-sm text-white/80 capitalize">{tx.type.replace(/_/g, ' ')}</p>
 <p className="text-xs text-white/30">{new Date(tx.created_at).toLocaleDateString()}</p>
 </div>
 <span className="text-sm text-white/60">{fmtCurrency(tx.amount)}</span>
 </div>
 ))}
 {transactions.length === 0 && <p className="px-6 py-8 text-sm text-white/40 text-center">No recent activity</p>}
 </div>
 </div>
 </motion.div>
 )
}

function EmployeeDashboard() {
  const { user, switchRole } = useAuthStore()
  const { allocations, fetchAllocations } = useAllocationStore()
  const { paymentRecords, fetchPaymentRecords } = usePaymentStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.company_id) return
    const companyId = user.company_id

    const load = async () => {
      setLoading(true)
      await fetchAllocations(companyId)
      if (allocations.length > 0) {
        await Promise.all(allocations.map(a => fetchPaymentRecords(a.id)))
      }
      setLoading(false)
    }
    load()
  }, [user?.company_id, fetchAllocations, fetchPaymentRecords, allocations.length])

  const myAllocs = allocations.filter(a => {
    if (user?.employee_id && a.employee_id === user.employee_id) return true
    if (user?.id && a.employee_id === user.id) return true
    if (user?.email && a.employee?.email && a.employee.email.toLowerCase() === user.email.toLowerCase()) return true
    return false
  })
  const displayAllocs = myAllocs.length > 0 ? myAllocs : allocations
  const total = displayAllocs.reduce((s, a) => s + a.total_credits, 0)
  const claimed = displayAllocs.reduce((s, a) => s + a.claimed_credits, 0)
  const unclaimed = displayAllocs.reduce((s, a) => s + a.unclaimed_credits, 0)
  const myRecords = paymentRecords.filter(r => displayAllocs.some(a => a.id === r.allocation_id) || !r.allocation_id)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Employee Portal
            </span>
          </div>
          <p className="text-white/50 mt-1 text-sm">Here's your credit balance and recent activity.</p>
        </div>

        <button
          onClick={() => switchRole('company_owner')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors self-start border border-white/5"
        >
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span>Switch to Owner View</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Credits" value={fmtCurrency(total)} icon={Wallet} delay={0.05} />
        <StatCard label="Claimed" value={fmtCurrency(claimed)} icon={ArrowUpRight} delay={0.1} />
        <StatCard label="Available" value={fmtCurrency(unclaimed)} sub="Ready to claim" icon={DollarSign} delay={0.15} />
      </div>

      {unclaimed > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="liquid-glass rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-white">You have credits to claim</h3>
            <p className="text-sm text-white/50 mt-1">Use your unclaimed credits for API service consumption via x402.</p>
          </div>
          <Link to="/claims" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">
            <Zap className="w-4 h-4" /> Claim Credits
          </Link>
        </motion.div>
      )}

 <div className="liquid-glass rounded-2xl overflow-hidden">
 <div className="p-6 border-b border-white/5">
 <h2 className="text-base font-medium text-white/80">Your Allocations</h2>
 </div>
 <div className="divide-y divide-white/5">
 {myAllocs.map((a) => (
 <div key={a.id} className="px-6 py-4 flex justify-between items-center">
 <div>
 <p className="text-sm text-white/80">{fmtCurrency(a.total_credits)} allocated</p>
 <p className="text-xs text-white/40 mt-0.5">
 {a.period_start ? new Date(a.period_start).toLocaleDateString() : 'No period'}
 {a.period_end ? ` - ${new Date(a.period_end).toLocaleDateString()}` : ''}
 </p>
 </div>
 <div className="text-right">
 <p className="text-sm text-white/60">{fmtCurrency(a.unclaimed_credits)} unclaimed</p>
 <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full mt-1 ${a.status === 'active' ? 'bg-white/10 text-white/70' : 'bg-white/5 text-white/40'}`}>{a.status}</span>
 </div>
 </div>
 ))}
 {myAllocs.length === 0 && <p className="px-6 py-8 text-sm text-white/40 text-center">No allocations yet.</p>}
 </div>
 </div>

 {myRecords.length > 0 && (
 <div className="liquid-glass rounded-2xl overflow-hidden">
 <div className="p-6 border-b border-white/5">
 <h2 className="text-base font-medium text-white/80">Recent x402 Payments</h2>
 </div>
 <div className="divide-y divide-white/5">
 {myRecords.slice(0, 5).map((r) => (
 <div key={r.id} className="px-6 py-3 flex justify-between items-center">
 <div>
 <p className="text-sm text-white/80">{r.service_id}</p>
 <p className="text-xs text-white/30">{new Date(r.created_at).toLocaleDateString()}</p>
 </div>
 <div className="flex items-center gap-2">
 <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'confirmed' ? 'bg-white/10 text-white/70' : r.status === 'failed' ? 'bg-red-500/10 text-red-300' : 'bg-yellow-500/10 text-yellow-300'}`}>{r.status}</span>
 <span className="text-sm text-white/60">{fmtCurrency(r.amount)}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </motion.div>
 )
}

export default function Dashboard() {
 const { user } = useAuthStore()
 const role = user?.role
 const isManagement = role === 'company_owner' || role === 'manager' || role === 'super_admin'

 return (
 <div className="min-h-screen bg-black">
 {isManagement ? <ManagementDashboard /> : <EmployeeDashboard />}
 </div>
 )
}
