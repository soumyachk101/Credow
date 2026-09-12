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

// ── Curated Human Pastel Tones (Anti-AI Feel) ──────────────────────────────────
// Mint:       #7ee0ac (Soft calm sage mint)
// Periwinkle: #a5b4fc (Soft calm lavender periwinkle)
// Peach:      #fed7aa (Warm apricot peach)
// Slate:      #94a3b8 (Soft neutral pearl slate)

interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon: any
  delay?: number
  tone?: 'mint' | 'periwinkle' | 'peach' | 'slate'
}

function StatCard({ label, value, sub, icon: Icon, delay = 0, tone = 'periwinkle' }: StatCardProps) {
  const toneClasses = {
    mint: {
      card: 'border-white/[0.08] hover:border-[#7ee0ac]/35',
      icon: 'bg-[#7ee0ac]/10 border-[#7ee0ac]/20 text-[#7ee0ac]',
      val: 'text-[#7ee0ac]',
      dot: 'bg-[#7ee0ac]',
    },
    periwinkle: {
      card: 'border-white/[0.08] hover:border-[#a5b4fc]/35',
      icon: 'bg-[#a5b4fc]/10 border-[#a5b4fc]/20 text-[#a5b4fc]',
      val: 'text-white',
      dot: 'bg-[#a5b4fc]',
    },
    peach: {
      card: 'border-white/[0.08] hover:border-[#fed7aa]/35',
      icon: 'bg-[#fed7aa]/10 border-[#fed7aa]/20 text-[#fed7aa]',
      val: 'text-white',
      dot: 'bg-[#fed7aa]',
    },
    slate: {
      card: 'border-white/[0.07] hover:border-white/[0.15]',
      icon: 'bg-white/[0.04] border-white/10 text-[#94a3b8]',
      val: 'text-white/90',
      dot: 'bg-[#94a3b8]',
    },
  }[tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`liquid-glass rounded-2xl p-5 group transition-all duration-200 border bg-white/[0.015] ${toneClasses.card}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider font-mono">{label}</span>
        <div className={`p-2 rounded-xl border transition-all ${toneClasses.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={`text-2xl font-semibold tracking-tight font-mono ${toneClasses.val}`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-[#94a3b8]/80 mt-1.5 flex items-center gap-1.5 font-mono">
          <span className={`w-1.5 h-1.5 rounded-full ${toneClasses.dot}`} />
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
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#7ee0ac] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Company Overview
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#a5b4fc]/10 text-[#a5b4fc] border border-[#a5b4fc]/20 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a5b4fc]" />
              Executive View
            </span>
          </div>
          <p className="text-[#94a3b8] mt-1 text-sm">Real-time corporate credit governance, treasury yield, and team analytics.</p>
        </div>
        <button
          onClick={() => {
            const firstEmp = employees[0] || { id: 'emp-demo', name: 'Alice Employee', email: 'alice@test.com' }
            switchRole('employee', firstEmp)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] hover:bg-[#a5b4fc]/10 text-white/90 hover:text-white text-xs font-medium transition-all self-start border border-white/10 hover:border-[#a5b4fc]/30 shadow-sm"
        >
          <UserCheck className="w-3.5 h-3.5 text-[#a5b4fc]" />
          <span>Switch to Employee View</span>
        </button>
      </div>

      {/* Stat Cards with Human Pastel Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Pool" value={fmtCurrency(pool)} sub="Treasury balance" icon={Wallet} delay={0.04} tone="peach" />
        <StatCard label="Allocated" value={fmtCurrency(totalAllocated)} sub={`${activeCount} active lines`} icon={PieChart} delay={0.08} tone="periwinkle" />
        <StatCard label="Claimed" value={fmtCurrency(totalClaimed)} icon={ArrowUpRight} delay={0.12} tone="slate" />
        <StatCard label="Unclaimed" value={fmtCurrency(totalUnclaimed)} sub="Ready to settle" icon={DollarSign} delay={0.16} tone="mint" />
        <StatCard label="Yield Earned" value={fmtCurrency(totalYield.generated)} sub={`${fmtCurrency(totalYield.claimed)} paid`} icon={TrendingUp} delay={0.2} tone="mint" />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Team Breakdown */}
        <div className="lg:col-span-2 liquid-glass rounded-2xl p-6 border border-white/[0.08] bg-white/[0.015]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-[#a5b4fc]/10 text-[#a5b4fc] border border-[#a5b4fc]/20">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-medium text-white">Team Allocation Breakdown</h2>
                <p className="text-xs text-[#94a3b8]">Spend vs budget ratio per active organizational unit</p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#94a3b8] px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/10">
              {teams.length} teams
            </span>
          </div>

          <div className="space-y-3.5">
            {teams.map((team: any) => {
              const ta = allocations.filter((a: any) => a.team_id === team.id)
              const tAlloc = ta.reduce((s, a) => s + a.total_credits, 0)
              const tClaimed = ta.reduce((s, a) => s + a.claimed_credits, 0)
              const pct = tAlloc > 0 ? (tClaimed / tAlloc) * 100 : 0
              return (
                <div key={team.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-[#a5b4fc]/25 transition-all space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#a5b4fc]" />
                      <p className="text-sm font-medium text-white/90">{team.name}</p>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#a5b4fc]/10 text-[#a5b4fc] border border-[#a5b4fc]/20 font-medium">
                        {pct.toFixed(0)}% Claimed
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-medium text-white">{fmtCurrency(tAlloc)}</p>
                      <p className="text-xs text-[#94a3b8] font-mono">{fmtCurrency(tAlloc - tClaimed)} remaining</p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7ee0ac] to-[#a5b4fc] transition-all"
                      style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {teams.length === 0 && (
              <div className="py-8 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto text-[#94a3b8]">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-sm text-[#94a3b8]">No teams yet. Create one in Teams Management to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Columns */}
        <div className="space-y-6">
          <div className="liquid-glass rounded-2xl p-5 border border-white/[0.08] hover:border-[#a5b4fc]/30 transition-all bg-white/[0.015]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#a5b4fc]/10 border border-[#a5b4fc]/20 text-[#a5b4fc]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-[#94a3b8] uppercase tracking-wider font-mono">Active Personnel</p>
                  <p className="text-2xl font-semibold font-mono text-[#7ee0ac]">
                    {employees.filter((e: any) => e.status === 'active').length}
                  </p>
                </div>
              </div>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7ee0ac] opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7ee0ac]" />
              </span>
            </div>
          </div>

          <div className="liquid-glass rounded-2xl p-5 border border-white/[0.08] bg-white/[0.015]">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-[#a5b4fc]" />
              <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider font-mono">
                Quick Actions
              </h3>
            </div>
            <div className="space-y-2">
              <Link
                to="/allocations"
                className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.02] hover:bg-[#a5b4fc]/10 border border-white/[0.06] hover:border-[#a5b4fc]/30 transition-all text-sm text-white/80 hover:text-white"
              >
                <div className="p-1.5 rounded-lg bg-[#a5b4fc]/10 text-[#a5b4fc] group-hover:bg-[#a5b4fc]/20 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>New Allocation</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-[#94a3b8] group-hover:text-[#a5b4fc] group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link
                to="/yield"
                className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.02] hover:bg-[#7ee0ac]/10 border border-white/[0.06] hover:border-[#7ee0ac]/30 transition-all text-sm text-white/80 hover:text-white"
              >
                <div className="p-1.5 rounded-lg bg-[#7ee0ac]/10 text-[#7ee0ac] group-hover:bg-[#7ee0ac]/20 transition-colors">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <span>View Yield Vault</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-[#94a3b8] group-hover:text-[#7ee0ac] group-hover:translate-x-0.5 transition-all" />
              </Link>
              <Link
                to="/teams"
                className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.02] hover:bg-[#a5b4fc]/10 border border-white/[0.06] hover:border-[#a5b4fc]/30 transition-all text-sm text-white/80 hover:text-white"
              >
                <div className="p-1.5 rounded-lg bg-[#a5b4fc]/10 text-[#a5b4fc] group-hover:bg-[#a5b4fc]/20 transition-colors">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span>Manage Teams</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-[#94a3b8] group-hover:text-[#a5b4fc] group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="liquid-glass rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.015]">
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-[#a5b4fc]/10 text-[#a5b4fc] border border-[#a5b4fc]/20">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white">Recent Ledger Activity</h2>
              <p className="text-xs text-[#94a3b8]">Verified on-chain transactions and allocation adjustments</p>
            </div>
          </div>
          <span className="text-xs font-mono text-[#94a3b8] px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/10">
            {transactions.length} recorded
          </span>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {transactions.slice(0, 6).map((tx: any) => (
            <div key={tx.id} className="px-6 py-3.5 flex justify-between items-center hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#7ee0ac]" />
                <div>
                  <p className="text-sm text-white/90 capitalize font-medium">{tx.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-[#94a3b8] font-mono mt-0.5">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <span className="text-sm font-mono font-medium text-[#7ee0ac]">{fmtCurrency(tx.amount)}</span>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="px-6 py-10 text-center space-y-2">
              <Coins className="w-8 h-8 text-[#94a3b8]/40 mx-auto" />
              <p className="text-sm text-[#94a3b8]">No ledger transactions recorded yet</p>
            </div>
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
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#7ee0ac] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#7ee0ac]/10 text-[#7ee0ac] border border-[#7ee0ac]/20 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7ee0ac]" />
              Employee Portal
            </span>
          </div>
          <p className="text-[#94a3b8] mt-1 text-sm">Your assigned corporate developer credits and real-time x402 settlement activity.</p>
        </div>

        <button
          onClick={() => switchRole('company_owner')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] hover:bg-[#a5b4fc]/10 text-white/90 hover:text-white text-xs font-medium transition-all self-start border border-white/10 hover:border-[#a5b4fc]/30 shadow-sm"
        >
          <Shield className="w-3.5 h-3.5 text-[#a5b4fc]" />
          <span>Switch to Executive View</span>
        </button>
      </div>

      {/* Stat Cards with Pastel Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Credits" value={fmtCurrency(total)} sub="Assigned budget" icon={Wallet} delay={0.04} tone="periwinkle" />
        <StatCard label="Claimed" value={fmtCurrency(claimed)} sub="Settled services" icon={ArrowUpRight} delay={0.08} tone="slate" />
        <StatCard label="Available" value={fmtCurrency(unclaimed)} sub="Ready to claim" icon={DollarSign} delay={0.12} tone="mint" />
      </div>

      {/* Claim Prompt Banner */}
      {unclaimed > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="liquid-glass rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#7ee0ac]/25 bg-gradient-to-r from-[#7ee0ac]/10 via-[#a5b4fc]/5 to-[#fed7aa]/10"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-[#7ee0ac]/15 text-[#7ee0ac] border border-[#7ee0ac]/30">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">You have corporate credits ready to claim</h3>
            </div>
            <p className="text-xs text-[#94a3b8] mt-2 max-w-xl">
              Use your unclaimed corporate credits for instant API micro-settlements and dev tooling via Algorand x402 protocol.
            </p>
          </div>
          <Link
            to="/claims"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#7ee0ac] hover:bg-[#95e8bb] text-[#0c2419] text-xs font-semibold transition-all self-start sm:self-auto shrink-0 shadow-sm"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Claim Credits Now</span>
          </Link>
        </motion.div>
      )}

      {/* Your Allocations */}
      <div className="liquid-glass rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.015]">
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-[#a5b4fc]/10 text-[#a5b4fc] border border-[#a5b4fc]/20">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white">Your Assigned Allocations</h2>
              <p className="text-xs text-[#94a3b8]">Corporate budget lines granted by your organization</p>
            </div>
          </div>
          <span className="text-xs font-mono text-[#94a3b8] px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/10">
            {myAllocs.length} assigned
          </span>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {myAllocs.map((a) => (
            <div key={a.id} className="px-6 py-4 flex justify-between items-center hover:bg-white/[0.02] transition-colors">
              <div>
                <p className="text-sm font-medium text-white">{fmtCurrency(a.total_credits)} allocated</p>
                <p className="text-xs text-[#94a3b8] mt-0.5 font-mono">
                  {a.period_start ? new Date(a.period_start).toLocaleDateString() : 'No period'}
                  {a.period_end ? ` — ${new Date(a.period_end).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono text-[#7ee0ac] font-medium">{fmtCurrency(a.unclaimed_credits)} unclaimed</p>
                <span
                  className={`inline-flex px-2.5 py-0.5 text-[10px] font-mono font-medium rounded-full mt-1 ${
                    a.status === 'active'
                      ? 'bg-[#7ee0ac]/10 text-[#7ee0ac] border border-[#7ee0ac]/20'
                      : 'bg-white/[0.04] text-[#94a3b8] border border-white/10'
                  }`}
                >
                  {a.status}
                </span>
              </div>
            </div>
          ))}
          {myAllocs.length === 0 && (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#a5b4fc]/10 border border-[#a5b4fc]/20 flex items-center justify-center mx-auto mb-3 text-[#a5b4fc]">
                <Coins className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-white/90">No allocations assigned yet</p>
              <p className="text-xs text-[#94a3b8] mt-1 max-w-sm mx-auto">
                Your manager will assign corporate credits to your employee profile for developer tool access.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent x402 Payments */}
      {myRecords.length > 0 && (
        <div className="liquid-glass rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.015]">
          <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-[#7ee0ac]/10 text-[#7ee0ac] border border-[#7ee0ac]/20">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-medium text-white">Recent x402 Settlements</h2>
                <p className="text-xs text-[#94a3b8]">Cryptographic micro-payments settled on Algorand</p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#94a3b8] px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-white/10">
              {myRecords.length} transactions
            </span>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {myRecords.slice(0, 5).map((r) => (
              <div key={r.id} className="px-6 py-3.5 flex justify-between items-center hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="text-sm font-medium text-white/90">{r.service_id}</p>
                  <p className="text-xs text-[#94a3b8] font-mono mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
                      r.status === 'confirmed'
                        ? 'bg-[#7ee0ac]/10 text-[#7ee0ac] border border-[#7ee0ac]/20'
                        : r.status === 'pending'
                        ? 'bg-[#a5b4fc]/10 text-[#a5b4fc] border border-[#a5b4fc]/20'
                        : 'bg-white/[0.04] text-[#94a3b8] border border-white/10'
                    }`}
                  >
                    {r.status}
                  </span>
                  <span className="text-sm font-mono font-medium text-[#7ee0ac]">{fmtCurrency(r.amount)}</span>
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
    <div className="min-h-screen bg-transparent relative">
      {/* Gentle ambient pastel background diffusions — subtle & organic (Anti-AI) */}
      <div className="absolute -top-12 left-1/4 w-96 h-96 bg-[#a5b4fc]/[0.025] rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-24 right-10 w-96 h-96 bg-[#7ee0ac]/[0.025] rounded-full blur-3xl pointer-events-none -z-10" />
      {isManagement ? <ManagementDashboard /> : <EmployeeDashboard />}
    </div>
  )
}
