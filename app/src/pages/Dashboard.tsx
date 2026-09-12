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
  UserCheck,
  Shield,
  Coins,
} from 'lucide-react'

const fmtCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value)

interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon: any
  delay?: number
  accent?: boolean
}

function StatCard({ label, value, sub, icon: Icon, delay = 0, accent = false }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`liquid-glass rounded-2xl p-5 group transition-all duration-200 border ${
        accent
          ? 'border-[#0ecb81]/30 hover:border-[#0ecb81]/60 shadow-[0_0_20px_rgba(14,203,129,0.08)]'
          : 'border-[#707a8a]/20 hover:border-[#2dbdb6]/40 hover:shadow-[0_0_20px_rgba(45,189,182,0.08)]'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold text-[#707a8a] uppercase tracking-wider font-mono">{label}</span>
        <div
          className={`p-2 rounded-xl border transition-all ${
            accent
              ? 'bg-[#0ecb81]/10 border-[#0ecb81]/25 text-[#0ecb81] group-hover:border-[#0ecb81]/50 group-hover:shadow-[0_0_12px_rgba(14,203,129,0.3)]'
              : 'bg-[#2dbdb6]/10 border-[#2dbdb6]/25 text-[#2dbdb6] group-hover:border-[#2dbdb6]/50 group-hover:shadow-[0_0_12px_rgba(45,189,182,0.3)]'
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={`text-2xl font-bold tracking-tight font-mono ${accent ? 'text-[#0ecb81]' : 'text-white'}`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-[#707a8a] mt-1 flex items-center gap-1 font-mono">
          {sub}
        </p>
      )}
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
        const { data: t } = await supabase.from('teams').select('*').eq('company_id', companyId)
        setTeams(t || [])
        const { data: e } = await supabase.from('employees').select('*').eq('company_id', companyId)
        setEmployees(e || [])
        const { data: tx } = await supabase
          .from('transactions')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(10)
        setTransactions(tx || [])
        const { data: c } = await supabase.from('companies').select('credit_pool').eq('id', companyId).maybeSingle()
        if (c) setPool(c.credit_pool || 0)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
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
        <div className="w-8 h-8 border-2 border-[#707a8a]/20 border-t-[#0ecb81] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Company Overview
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#2dbdb6]/10 text-[#2dbdb6] border border-[#2dbdb6]/25 font-mono">
              Executive View
            </span>
          </div>
          <p className="text-[#707a8a] mt-1 text-sm">Real-time credit allocation, yield generation, and team metrics.</p>
        </div>
        <button
          onClick={() => {
            const firstEmp = employees[0] || { id: 'emp-demo', name: 'Alice Employee', email: 'alice@test.com' }
            switchRole('employee', firstEmp)
          }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#2dbdb6]/10 text-white text-xs font-medium transition-all self-start border border-[#707a8a]/30 hover:border-[#2dbdb6]/40"
        >
          <UserCheck className="w-3.5 h-3.5 text-[#2dbdb6]" />
          <span>Switch to Employee View</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Pool" value={fmtCurrency(pool)} sub="Credit budget" icon={Wallet} delay={0.05} />
        <StatCard label="Allocated" value={fmtCurrency(totalAllocated)} sub={`${activeCount} active`} icon={PieChart} delay={0.1} />
        <StatCard label="Claimed" value={fmtCurrency(totalClaimed)} icon={ArrowUpRight} delay={0.15} />
        <StatCard label="Unclaimed" value={fmtCurrency(totalUnclaimed)} icon={DollarSign} delay={0.2} accent />
        <StatCard label="Yield Earned" value={fmtCurrency(totalYield.generated)} sub={`${fmtCurrency(totalYield.claimed)} distributed`} icon={TrendingUp} delay={0.25} accent />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Team Breakdown */}
        <div className="lg:col-span-2 liquid-glass rounded-2xl p-6 border border-[#707a8a]/20">
          <h2 className="text-base font-semibold text-white/90 mb-5">Team Breakdown</h2>
          <div className="space-y-4">
            {teams.map((team: any) => {
              const ta = allocations.filter((a: any) => a.team_id === team.id)
              const tAlloc = ta.reduce((s, a) => s + a.total_credits, 0)
              const tClaimed = ta.reduce((s, a) => s + a.claimed_credits, 0)
              const pct = tAlloc > 0 ? (tClaimed / tAlloc) * 100 : 0
              return (
                <div key={team.id} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-white/90">{team.name}</p>
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium text-white">{fmtCurrency(tAlloc)}</p>
                      <p className="text-xs text-[#707a8a] font-mono">{fmtCurrency(tAlloc - tClaimed)} remaining</p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#707a8a]/15 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-[#0ecb81] to-[#2dbdb6] transition-all shadow-[0_0_12px_rgba(14,203,129,0.35)]"
                      style={{ width: Math.min(pct, 100) + '%' }}
                    />
                  </div>
                </div>
              )
            })}
            {teams.length === 0 && (
              <p className="text-sm text-[#707a8a] text-center py-6">No teams yet. Create one to get started.</p>
            )}
          </div>
        </div>

        {/* Right Sidebar Columns */}
        <div className="space-y-6">
          <div className="liquid-glass rounded-2xl p-5 border border-[#707a8a]/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#2dbdb6]/10 border border-[#2dbdb6]/25 text-[#2dbdb6]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-[#707a8a] uppercase tracking-wider font-mono">Active Employees</p>
                <p className="text-xl font-bold font-mono text-[#0ecb81]">
                  {employees.filter((e: any) => e.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="liquid-glass rounded-2xl p-5 border border-[#707a8a]/20">
            <h3 className="text-xs font-semibold text-[#707a8a] uppercase tracking-wider font-mono mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                to="/allocations"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-[#2dbdb6]/10 border border-[#707a8a]/20 hover:border-[#2dbdb6]/40 transition-all text-sm text-zinc-200 hover:text-white"
              >
                <Plus className="w-4 h-4 text-[#2dbdb6]" />
                <span>New Allocation</span>
                <ArrowRight className="w-3 h-3 ml-auto text-[#707a8a]" />
              </Link>
              <Link
                to="/yield"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-[#2dbdb6]/10 border border-[#707a8a]/20 hover:border-[#2dbdb6]/40 transition-all text-sm text-zinc-200 hover:text-white"
              >
                <TrendingUp className="w-4 h-4 text-[#2dbdb6]" />
                <span>View Yield Vault</span>
                <ArrowRight className="w-3 h-3 ml-auto text-[#707a8a]" />
              </Link>
              <Link
                to="/teams"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-[#2dbdb6]/10 border border-[#707a8a]/20 hover:border-[#2dbdb6]/40 transition-all text-sm text-zinc-200 hover:text-white"
              >
                <Users className="w-4 h-4 text-[#2dbdb6]" />
                <span>Manage Teams</span>
                <ArrowRight className="w-3 h-3 ml-auto text-[#707a8a]" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="liquid-glass rounded-2xl overflow-hidden border border-[#707a8a]/20">
        <div className="p-6 border-b border-[#707a8a]/15 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white/90">Recent Activity</h2>
          <span className="text-xs font-mono text-[#707a8a]">{transactions.length} recorded</span>
        </div>
        <div className="divide-y divide-[#707a8a]/15">
          {transactions.slice(0, 6).map((tx: any) => (
            <div key={tx.id} className="px-6 py-3.5 flex justify-between items-center hover:bg-white/[0.015] transition-colors">
              <div>
                <p className="text-sm text-white/90 capitalize">{tx.type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-[#707a8a] font-mono mt-0.5">{new Date(tx.created_at).toLocaleDateString()}</p>
              </div>
              <span className="text-sm font-mono font-semibold text-[#0ecb81]">{fmtCurrency(tx.amount)}</span>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="px-6 py-8 text-sm text-[#707a8a] text-center">No recent activity</p>
          )}
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
        <div className="w-8 h-8 border-2 border-[#707a8a]/20 border-t-[#0ecb81] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#0ecb81]/10 text-[#0ecb81] border border-[#0ecb81]/25 font-mono">
              Employee Portal
            </span>
          </div>
          <p className="text-[#707a8a] mt-1 text-sm">Here is your corporate credit balance and recent activity.</p>
        </div>

        <button
          onClick={() => switchRole('company_owner')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#2dbdb6]/10 text-white text-xs font-medium transition-all self-start border border-[#707a8a]/30 hover:border-[#2dbdb6]/40"
        >
          <Shield className="w-3.5 h-3.5 text-[#2dbdb6]" />
          <span>Switch to Executive View</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Credits" value={fmtCurrency(total)} icon={Wallet} delay={0.05} />
        <StatCard label="Claimed" value={fmtCurrency(claimed)} icon={ArrowUpRight} delay={0.1} />
        <StatCard label="Available" value={fmtCurrency(unclaimed)} sub="Ready to claim" icon={DollarSign} delay={0.15} accent />
      </div>

      {/* Claim Prompt Banner */}
      {unclaimed > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="liquid-glass rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#0ecb81]/35 bg-gradient-to-r from-[#0ecb81]/12 via-[#0ecb81]/5 to-[#2dbdb6]/5 shadow-[0_0_30px_rgba(14,203,129,0.08)]"
        >
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#0ecb81]" />
              <h3 className="text-base font-semibold text-white">You have credits available to claim</h3>
            </div>
            <p className="text-xs text-[#707a8a] mt-1">
              Use your unclaimed corporate credits for instant API service settlement via Algorand x402.
            </p>
          </div>
          <Link
            to="/claims"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0ecb81] hover:bg-[#2dbdb6] text-[#04140c] text-xs font-bold transition-all shadow-[0_0_20px_rgba(14,203,129,0.35)] hover:shadow-[0_0_25px_rgba(45,189,182,0.45)] self-start sm:self-auto shrink-0"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Claim Credits Now</span>
          </Link>
        </motion.div>
      )}

      {/* Your Allocations */}
      <div className="liquid-glass rounded-2xl overflow-hidden border border-[#707a8a]/20">
        <div className="p-6 border-b border-[#707a8a]/15 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white/90">Your Allocations</h2>
          <span className="text-xs font-mono text-[#707a8a]">{myAllocs.length} assigned</span>
        </div>
        <div className="divide-y divide-[#707a8a]/15">
          {myAllocs.map((a) => (
            <div key={a.id} className="px-6 py-4 flex justify-between items-center hover:bg-white/[0.015] transition-colors">
              <div>
                <p className="text-sm font-semibold text-white">{fmtCurrency(a.total_credits)} allocated</p>
                <p className="text-xs text-[#707a8a] mt-0.5 font-mono">
                  {a.period_start ? new Date(a.period_start).toLocaleDateString() : 'No period'}
                  {a.period_end ? ` — ${new Date(a.period_end).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono text-[#0ecb81] font-bold">{fmtCurrency(a.unclaimed_credits)} unclaimed</p>
                <span
                  className={`inline-flex px-2 py-0.5 text-[10px] font-mono font-medium rounded-full mt-1 ${
                    a.status === 'active'
                      ? 'bg-[#0ecb81]/15 text-[#0ecb81] border border-[#0ecb81]/30'
                      : 'bg-[#707a8a]/15 text-[#707a8a] border border-[#707a8a]/30'
                  }`}
                >
                  {a.status}
                </span>
              </div>
            </div>
          ))}
          {myAllocs.length === 0 && (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#2dbdb6]/10 border border-[#2dbdb6]/25 flex items-center justify-center mx-auto mb-3 text-[#2dbdb6]">
                <Coins className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-white/90">No allocations assigned yet</p>
              <p className="text-xs text-[#707a8a] mt-1 max-w-sm mx-auto">
                Your manager will assign corporate credits to your employee profile for developer tool access.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent x402 Payments */}
      {myRecords.length > 0 && (
        <div className="liquid-glass rounded-2xl overflow-hidden border border-[#707a8a]/20">
          <div className="p-6 border-b border-[#707a8a]/15 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white/90">Recent x402 Payments</h2>
            <span className="text-xs font-mono text-[#707a8a]">{myRecords.length} transactions</span>
          </div>
          <div className="divide-y divide-[#707a8a]/15">
            {myRecords.slice(0, 5).map((r) => (
              <div key={r.id} className="px-6 py-3.5 flex justify-between items-center hover:bg-white/[0.015] transition-colors">
                <div>
                  <p className="text-sm font-medium text-white/90">{r.service_id}</p>
                  <p className="text-xs text-[#707a8a] font-mono mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
                      r.status === 'confirmed'
                        ? 'bg-[#0ecb81]/15 text-[#0ecb81] border border-[#0ecb81]/30'
                        : r.status === 'pending'
                        ? 'bg-[#2dbdb6]/15 text-[#2dbdb6] border border-[#2dbdb6]/30'
                        : 'bg-[#707a8a]/15 text-[#707a8a] border border-[#707a8a]/30'
                    }`}
                  >
                    {r.status}
                  </span>
                  <span className="text-sm font-mono font-bold text-[#0ecb81]">{fmtCurrency(r.amount)}</span>
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
    <div className="min-h-screen bg-transparent">
      {isManagement ? <ManagementDashboard /> : <EmployeeDashboard />}
    </div>
  )
}
